<script lang="ts">
    import { onMount } from "svelte";
    import gregConfig from "virtual:greg-config";
    import { withBase } from "./common";

    // ── Types ──────────────────────────────────────────────────────────────────

    type AiCharacter = {
        id: string;
        name: string;
        icon: string;
        description: string;
        systemPrompt: string;
    };

    type AiSource = {
        pageId: string;
        pageTitle: string;
        sectionHeading: string;
        sectionAnchor: string;
    };

    type AiResponse = {
        answer: string;
        sources: AiSource[];
        character: string;
    };

    type ChatMessage = {
        id: number;
        role: "user" | "assistant";
        content: string;
        sources?: AiSource[];
        character?: string;
        error?: boolean;
    };

    // ── Props ──────────────────────────────────────────────────────────────────

    type Props = {
        onNavigate: (path: string, anchor?: string) => void;
        onClose: () => void;
        localeSrcDir?: string;
        placeholder?: string;
        loadingText?: string;
        errorText?: string;
        startText?: string;
        sourcesLabel?: string;
        aiLabel?: string;
    };

    let {
        onNavigate,
        onClose,
        localeSrcDir = "/docs",
        placeholder = "Ask a question about the docs…",
        loadingText = "Thinking…",
        errorText = "Something went wrong. Please try again.",
        startText = "Ask me anything about this documentation. My answers are based exclusively on the docs.",
        sourcesLabel = "Sources",
        aiLabel = "Ask AI",
    }: Props = $props();

    // ── Config ─────────────────────────────────────────────────────────────────

    const aiCfg = (gregConfig as any)?.search?.ai ?? {};
    const aiUrl: string = aiCfg.serverUrl ?? "/api/ai";

    // ── State ──────────────────────────────────────────────────────────────────

    let characters = $state<AiCharacter[]>([]);
    let selectedCharacter = $state<string>(aiCfg.defaultCharacter ?? "professional");
    let query = $state("");
    let messages = $state<ChatMessage[]>([]);
    let isLoading = $state(false);
    let inputEl = $state<HTMLTextAreaElement | undefined>(undefined);
    let messagesEl = $state<HTMLDivElement | undefined>(undefined);
    let counter = 0;

    // ── Load available characters on mount ─────────────────────────────────────

    onMount(async () => {
        try {
            const res = await fetch(withBase(`${aiUrl}/characters`));
            if (res.ok) {
                const data = await res.json();
                characters = data.characters ?? [];
                // Keep selectedCharacter if it exists in the list; otherwise use first
                if (
                    characters.length > 0 &&
                    !characters.find(c => c.id === selectedCharacter)
                ) {
                    selectedCharacter = characters[0].id;
                }
            }
        } catch {
            // Characters list unavailable — the selector will be hidden
        }
        // Focus the textarea once characters are loaded
        inputEl?.focus();
    });

    // Scroll to bottom whenever a new message appears
    $effect(() => {
        if (messages.length > 0) {
            void messages[messages.length - 1]; // track reactively
            requestAnimationFrame(() => {
                if (messagesEl) {
                    messagesEl.scrollTop = messagesEl.scrollHeight;
                }
            });
        }
    });

    // ── Submit ─────────────────────────────────────────────────────────────────

    async function submit() {
        const q = query.trim();
        if (!q || isLoading) return;

        query = "";
        messages = [...messages, { id: ++counter, role: "user", content: q }];
        isLoading = true;
        const assistantId = ++counter;

        try {
            const res = await fetch(withBase(`${aiUrl}/ask`), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: q,
                    character: selectedCharacter,
                    locale: localeSrcDir,
                }),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data: AiResponse = await res.json();
            messages = [
                ...messages,
                {
                    id: assistantId,
                    role: "assistant",
                    content: data.answer,
                    sources: data.sources,
                    character: data.character,
                },
            ];
        } catch (err) {
            console.error("[AI Chat]", err);
            messages = [
                ...messages,
                {
                    id: assistantId,
                    role: "assistant",
                    content: errorText,
                    error: true,
                },
            ];
        } finally {
            isLoading = false;
            requestAnimationFrame(() => inputEl?.focus());
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
        }
        if (e.key === "Escape") {
            onClose();
        }
    }

    function navigateTo(source: AiSource) {
        onNavigate(source.pageId, source.sectionAnchor || undefined);
        onClose();
    }

    function currentCharacter(): AiCharacter | undefined {
        return characters.find(c => c.id === selectedCharacter);
    }
</script>

<div class="ai-chat">
    <!-- ── Character selector ──────────────────────────────────────────── -->
    {#if characters.length > 1}
        <div class="ai-character-bar" role="group" aria-label="AI character">
            {#each characters as char}
                <button
                    class="ai-character-btn"
                    class:active={selectedCharacter === char.id}
                    onclick={() => (selectedCharacter = char.id)}
                    title={char.description}
                    aria-pressed={selectedCharacter === char.id}
                    type="button"
                >
                    <span class="char-icon" aria-hidden="true">{char.icon}</span>
                    <span class="char-name">{char.name}</span>
                </button>
            {/each}
        </div>
    {/if}

    <!-- ── Message area ─────────────────────────────────────────────────── -->
    <div class="ai-messages" bind:this={messagesEl} aria-live="polite" aria-label={aiLabel}>
        {#if messages.length === 0}
            <div class="ai-start-hint">
                {#if currentCharacter()}
                    <span class="ai-start-icon" aria-hidden="true"
                        >{currentCharacter()!.icon}</span
                    >
                {/if}
                <p>{startText}</p>
            </div>
        {:else}
            {#each messages as msg (msg.id)}
                <div
                    class="ai-message"
                    class:user={msg.role === "user"}
                    class:assistant={msg.role === "assistant"}
                    class:error={msg.error}
                    role={msg.role === "assistant" ? "article" : undefined}
                >
                    {#if msg.role === "assistant" && currentCharacter()}
                        <span class="ai-msg-icon" aria-hidden="true"
                            >{currentCharacter()!.icon}</span
                        >
                    {/if}

                    <div class="ai-message-body">
                        {#if msg.role === "user"}
                            <p class="ai-user-text">{msg.content}</p>
                        {:else}
                            <!-- Answer rendered as pre-formatted markdown text.
                                 Full markdown rendering would require mdsvex runtime
                                 which is only available at build time. The LLM is
                                 instructed to keep answers readable as plain text too. -->
                            <div class="ai-answer">{msg.content}</div>

                            {#if msg.sources && msg.sources.length > 0}
                                <div class="ai-sources">
                                    <span class="ai-sources-label"
                                        >{sourcesLabel}:</span
                                    >
                                    <ul class="ai-sources-list">
                                        {#each msg.sources as src}
                                            <li>
                                                <!-- svelte-ignore a11y_interactive_supports_focus -->
                                                <button
                                                    class="ai-source-btn"
                                                    onclick={() => navigateTo(src)}
                                                    type="button"
                                                    title={src.pageId +
                                                        (src.sectionAnchor
                                                            ? "#" +
                                                              src.sectionAnchor
                                                            : "")}
                                                >
                                                    <svg
                                                        class="ai-source-icon"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        stroke-width="2"
                                                        aria-hidden="true"
                                                    >
                                                        <path
                                                            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                                                        />
                                                        <polyline
                                                            points="14 2 14 8 20 8"
                                                        />
                                                    </svg>
                                                    <span class="ai-source-title"
                                                        >{src.pageTitle}</span
                                                    >
                                                    {#if src.sectionHeading}
                                                        <span
                                                            class="ai-source-section"
                                                            > › {src.sectionHeading}</span
                                                        >
                                                    {/if}
                                                </button>
                                            </li>
                                        {/each}
                                    </ul>
                                </div>
                            {/if}
                        {/if}
                    </div>
                </div>
            {/each}

            {#if isLoading}
                <div class="ai-message assistant">
                    {#if currentCharacter()}
                        <span class="ai-msg-icon" aria-hidden="true"
                            >{currentCharacter()!.icon}</span
                        >
                    {/if}
                    <div class="ai-loading">
                        <span class="ai-spinner" aria-hidden="true"></span>
                        {loadingText}
                    </div>
                </div>
            {/if}
        {/if}
    </div>

    <!-- ── Input area ───────────────────────────────────────────────────── -->
    <div class="ai-input-area">
        <textarea
            bind:this={inputEl}
            bind:value={query}
            onkeydown={handleKeydown}
            rows={2}
            class="ai-textarea"
            {placeholder}
            disabled={isLoading}
            autocomplete="off"
            spellcheck="false"
            aria-label={placeholder}
        ></textarea>
        <button
            class="ai-send-btn"
            onclick={submit}
            disabled={!query.trim() || isLoading}
            type="button"
            aria-label="Send"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
            >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
        </button>
    </div>
</div>

<style lang="scss">
    .ai-chat {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow: hidden;
    }

    /* ── Character selector ──────────────────────────────────── */

    .ai-character-bar {
        display: flex;
        gap: 0.3rem;
        padding: 0.5rem 0.75rem;
        border-bottom: 1px solid var(--greg-border-color);
        overflow-x: auto;
        flex-shrink: 0;
        scrollbar-width: none;

        &::-webkit-scrollbar {
            display: none;
        }
    }

    .ai-character-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.25rem 0.6rem;
        border-radius: 999px;
        border: 1px solid var(--greg-border-color);
        background: transparent;
        color: var(--greg-menu-section-color);
        cursor: pointer;
        font-size: 0.72rem;
        font-family: inherit;
        white-space: nowrap;
        transition:
            border-color 0.15s,
            color 0.15s,
            background 0.15s;

        &:hover {
            border-color: var(--greg-accent);
            color: var(--greg-accent);
        }

        &.active {
            background: var(--greg-accent);
            border-color: var(--greg-accent);
            color: #fff;
        }
    }

    .char-icon {
        font-size: 0.85rem;
        line-height: 1;
    }

    .char-name {
        font-weight: 500;
    }

    /* ── Message area ─────────────────────────────────────────── */

    .ai-messages {
        flex: 1;
        overflow-y: auto;
        padding: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
        min-height: 120px;
    }

    .ai-start-hint {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;
        gap: 0.5rem;
        color: var(--greg-menu-section-color);
        font-size: 0.8rem;
        text-align: center;
        padding: 2rem 1.5rem;

        p {
            margin: 0;
            line-height: 1.5;
        }
    }

    .ai-start-icon {
        font-size: 2.2rem;
        line-height: 1;
    }

    .ai-message {
        display: flex;
        align-items: flex-start;
        gap: 0.4rem;

        &.user {
            flex-direction: row-reverse;
        }

        &.assistant {
            flex-direction: row;
        }
    }

    .ai-msg-icon {
        font-size: 1.1rem;
        line-height: 1;
        padding-top: 0.15rem;
        flex-shrink: 0;
    }

    .ai-message-body {
        max-width: 90%;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .ai-user-text {
        background: var(--greg-accent);
        color: #fff;
        padding: 0.5rem 0.85rem;
        border-radius: 12px 12px 2px 12px;
        font-size: 0.875rem;
        line-height: 1.5;
        margin: 0;
        word-break: break-word;
    }

    .ai-answer {
        font-size: 0.875rem;
        line-height: 1.65;
        color: var(--greg-color);
        white-space: pre-wrap;
        word-break: break-word;
        background: var(--greg-menu-hover-background);
        padding: 0.65rem 0.9rem;
        border-radius: 2px 12px 12px 12px;
        border-left: 3px solid var(--greg-accent);
    }

    .error .ai-answer {
        color: var(--greg-danger-text, #e53e3e);
        border-left-color: var(--greg-danger-text, #e53e3e);
    }

    /* ── Sources ──────────────────────────────────────────────── */

    .ai-sources {
        font-size: 0.72rem;
    }

    .ai-sources-label {
        color: var(--greg-menu-section-color);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    .ai-sources-list {
        list-style: none;
        margin: 0.3rem 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
    }

    .ai-source-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        color: var(--greg-accent);
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        font-size: 0.72rem;
        font-family: inherit;
        text-align: left;

        &:hover {
            text-decoration: underline;
        }
    }

    .ai-source-icon {
        width: 11px;
        height: 11px;
        flex-shrink: 0;
    }

    .ai-source-title {
        font-weight: 600;
    }

    .ai-source-section {
        color: var(--greg-menu-section-color);
    }

    /* ── Loading state ────────────────────────────────────────── */

    .ai-loading {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--greg-menu-section-color);
        font-size: 0.8rem;
        padding: 0.4rem 0;
    }

    .ai-spinner {
        display: inline-block;
        width: 1em;
        height: 1em;
        border: 2px solid var(--greg-border-color);
        border-top-color: var(--greg-accent);
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
        flex-shrink: 0;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    /* ── Input area ───────────────────────────────────────────── */

    .ai-input-area {
        display: flex;
        align-items: flex-end;
        gap: 0.5rem;
        padding: 0.625rem 0.75rem;
        border-top: 1px solid var(--greg-border-color);
        flex-shrink: 0;
    }

    .ai-textarea {
        flex: 1;
        background: var(--greg-menu-hover-background);
        border: 1px solid var(--greg-border-color);
        border-radius: 8px;
        padding: 0.5rem 0.7rem;
        color: var(--greg-color);
        font-size: 0.875rem;
        font-family: inherit;
        line-height: 1.5;
        resize: none;
        outline: none;
        transition: border-color 0.15s;
        min-width: 0;

        &::placeholder {
            color: var(--greg-menu-section-color);
        }

        &:focus {
            border-color: var(--greg-accent);
        }

        &:disabled {
            opacity: 0.6;
        }
    }

    .ai-send-btn {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: none;
        background: var(--greg-accent);
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: opacity 0.15s;

        svg {
            width: 14px;
            height: 14px;
        }

        &:disabled {
            opacity: 0.35;
            cursor: default;
        }

        &:not(:disabled):hover {
            opacity: 0.82;
        }
    }
</style>
