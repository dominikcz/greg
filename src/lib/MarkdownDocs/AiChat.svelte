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
        clearChatLabel?: string;
        sendLabel?: string;
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
        clearChatLabel = "Clear chat",
        sendLabel = "Send",
    }: Props = $props();

    // ── Config ─────────────────────────────────────────────────────────────────

    const aiCfg = (gregConfig as any)?.search?.ai ?? {};
    const aiUrl: string = aiCfg.serverUrl ?? "/api/ai";

    // ── State ──────────────────────────────────────────────────────────────────

    const STORAGE_KEY = 'greg-ai-chat-history';
    const MAX_STORED_MESSAGES = 100;
    const CHARACTER_KEY = 'greg-ai-character';

    function loadStoredCharacter(): string {
        try {
            return localStorage.getItem(CHARACTER_KEY) ?? '';
        } catch { return ''; }
    }

    function saveCharacter(id: string) {
        try { localStorage.setItem(CHARACTER_KEY, id); } catch { /* ignore */ }
    }

    function loadStoredMessages(): ChatMessage[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as ChatMessage[];
                if (Array.isArray(parsed)) return parsed;
            }
        } catch { /* ignore */ }
        return [];
    }

    function saveMessages(msgs: ChatMessage[]) {
        try {
            // Never persist error messages or excess entries
            const toSave = msgs
                .filter(m => !m.error)
                .slice(-MAX_STORED_MESSAGES);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        } catch { /* storage unavailable */ }
    }

    let characters = $state<AiCharacter[]>([]);
    let selectedCharacter = $state<string>(loadStoredCharacter() || (aiCfg.defaultCharacter ?? "professional"));
    let query = $state("");
    const _storedMessages = loadStoredMessages();
    let messages = $state<ChatMessage[]>(_storedMessages);
    let isLoading = $state(false);
    let inputEl = $state<HTMLTextAreaElement | undefined>(undefined);
    let messagesEl = $state<HTMLDivElement | undefined>(undefined);
    let counter = _storedMessages.length > 0 ? Math.max(..._storedMessages.map(m => m.id)) : 0;

    // ── Query history (arrow-key navigation) ───────────────────────────────────

    const QUERY_HISTORY_KEY = 'greg-ai-query-history';
    const MAX_QUERY_HISTORY = 50;

    function loadQueryHistory(): string[] {
        try {
            const raw = localStorage.getItem(QUERY_HISTORY_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed as string[];
            }
        } catch { /* ignore */ }
        return [];
    }

    function saveQueryHistory(history: string[]) {
        try { localStorage.setItem(QUERY_HISTORY_KEY, JSON.stringify(history)); } catch { /* ignore */ }
    }

    let queryHistory: string[] = loadQueryHistory();
    let historyIdx = -1;  // -1 = editing fresh draft
    let historyDraft = ''; // text saved on entering history navigation

    // ── Icon helpers ─────────────────────────────────────────────────────────────

    /** Returns true when the icon string looks like an image URL / path. */
    function isImageIcon(icon: string): boolean {
        return (
            /^(?:https?:\/\/|\/|\.\/|data:image\/)/.test(icon) ||
            /\.(?:png|jpe?g|gif|webp|svg|avif)$/i.test(icon)
        );
    }

    // ── Load available characters on mount ─────────────────────────────────────

    onMount(async () => {
        // Focus the textarea immediately so arrow-key history works on open
        inputEl?.focus();
        try {
            const res = await fetch(withBase(`${aiUrl}/characters`));
            if (res.ok) {
                const data = await res.json();
                characters = data.characters ?? [];
                // Restore saved character if it exists, else fall back to defaultCharacter or first
                const savedChar = loadStoredCharacter();
                const preferred = savedChar || aiCfg.defaultCharacter;
                if (characters.length > 0) {
                    if (preferred && characters.find(c => c.id === preferred)) {
                        selectedCharacter = preferred;
                    } else {
                        selectedCharacter = characters[0].id;
                    }
                }
            }
        } catch {
            // Characters list unavailable — the selector will be hidden
        }
    });

    // Persist messages to localStorage whenever they change
    $effect(() => {
        saveMessages(messages);
    });

    // Persist selected character whenever it changes
    $effect(() => {
        saveCharacter(selectedCharacter);
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

        // Save to history (avoid consecutive duplicates)
        if (q !== queryHistory[queryHistory.length - 1]) {
            queryHistory = [...queryHistory, q].slice(-MAX_QUERY_HISTORY);
            saveQueryHistory(queryHistory);
        }
        historyIdx = -1;
        historyDraft = '';

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
            return;
        }
        if (e.key === "Escape") {
            onClose();
            return;
        }

        // Arrow-key history navigation
        if ((e.key === "ArrowUp" || e.key === "ArrowDown") && queryHistory.length > 0) {
            const ta = inputEl;
            const atTopLine = !ta || ta.selectionStart === 0 ||
                !ta.value.slice(0, ta.selectionStart).includes('\n');
            const atBottomLine = !ta || ta.selectionEnd === ta.value.length ||
                !ta.value.slice(ta.selectionEnd).includes('\n');

            if (e.key === "ArrowUp" && (atTopLine || historyIdx >= 0)) {
                e.preventDefault();
                if (historyIdx === -1) {
                    historyDraft = query;
                    historyIdx = 0;
                } else if (historyIdx < queryHistory.length - 1) {
                    historyIdx++;
                }
                query = queryHistory[queryHistory.length - 1 - historyIdx];
                requestAnimationFrame(() => {
                    if (inputEl) inputEl.setSelectionRange(0, inputEl.value.length);
                });
                return;
            }

            if (e.key === "ArrowDown" && historyIdx >= 0 && atBottomLine) {
                e.preventDefault();
                if (historyIdx === 0) {
                    historyIdx = -1;
                    query = historyDraft;
                } else {
                    historyIdx--;
                    query = queryHistory[queryHistory.length - 1 - historyIdx];
                }
                requestAnimationFrame(() => {
                    if (inputEl) inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
                });
                return;
            }
        }
    }

    function clearHistory() {
        messages = [];
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
        requestAnimationFrame(() => inputEl?.focus());
    }

    function navigateTo(source: AiSource) {
        onNavigate(source.pageId, source.sectionAnchor || undefined);
        onClose();
    }

    function currentCharacter(): AiCharacter | undefined {
        return characters.find(c => c.id === selectedCharacter);
    }

    function characterById(id?: string): AiCharacter | undefined {
        return characters.find(c => c.id === id);
    }

    // ── Markdown answer renderer ────────────────────────────────────────────────

    function escHtml(s: string): string {
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /** Sanitize a URL from LLM output: allow relative paths and http(s), normalize //. */
    function sanitizeUrl(url: string): string {
        const trimmed = url.trim();
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        if (/^\//.test(trimmed)) return trimmed.replace(/\/\/+/g, '/');
        if (/^#/.test(trimmed)) return trimmed;
        return '#';
    }

    /** Apply inline markdown (bold, italic, code) and links to an already-HTML-escaped string. */
    function processInlineEscaped(escaped: string): string {
        // Bold **text** or __text__
        let r = escaped
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.+?)__/g, '<strong>$1</strong>');
        // Italic *text* (not ** boundary)
        r = r.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
        // Inline code `code`
        r = r.replace(/`([^`\n]+)`/g, '<code>$1</code>');
        return r;
    }

    /** Process a line of text: handle links first (before escaping) then escape+inline. */
    function renderLine(line: string): string {
        let result = '';
        let pos = 0;
        // Match markdown links: [text](url)
        const linkRe = /\[([^\]\n]+)\]\(([^)\n]+)\)/g;
        let m: RegExpExecArray | null;

        while ((m = linkRe.exec(line)) !== null) {
            // Process the plain text segment before this link
            result += processInlineEscaped(escHtml(line.slice(pos, m.index)));

            const linkText = m[1];
            const url = sanitizeUrl(m[2]);
            const isExternal = /^https?:\/\//i.test(url);
            result += `<a href="${escHtml(url)}"${
                isExternal
                    ? ' target="_blank" rel="noopener noreferrer"'
                    : ' data-nav="1"'
            }>${escHtml(linkText)}</a>`;
            pos = m.index + m[0].length;
        }
        result += processInlineEscaped(escHtml(line.slice(pos)));
        return result;
    }

    /**
     * Convert LLM markdown answer to safe HTML.
     * Handles: paragraphs, **bold**, *italic*, `code`, [links](url).
     * Lists and headings are rendered as paragraphs with basic formatting.
     */
    function renderAnswer(text: string): string {
        // Split on blank lines into paragraph blocks
        const blocks = text.split(/\n{2,}/);
        return blocks.map(block => {
            const lines = block.split('\n');
            const rendered = lines.map(line => renderLine(line)).join('<br>');
            return `<p>${rendered}</p>`;
        }).join('');
    }

    /** Handle clicks on internal navigation links inside `.ai-answer`. */
    function handleAnswerClick(e: MouseEvent) {
        const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-nav]');
        if (!anchor) return;
        e.preventDefault();
        const href = anchor.getAttribute('href') ?? '';
        if (!href) return;
        const hashIdx = href.indexOf('#');
        const path = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
        const section = hashIdx >= 0 ? href.slice(hashIdx + 1) : undefined;
        onNavigate(path, section || undefined);
        onClose();
    }
</script>

<div class="ai-chat">
{#snippet iconDisplay(ic: string, cls: string)}
    {#if isImageIcon(ic)}
        <img class="{cls} icon-img" src={ic} alt="" aria-hidden="true" />
    {:else}
        <span class={cls} aria-hidden="true">{ic}</span>
    {/if}
{/snippet}

    <!-- ── Header: character selector + clear button ──────────────────── -->
    {#if characters.length > 1 || messages.length > 0}
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
                    {@render iconDisplay(char.icon, 'char-icon')}
                    <span class="char-name">{char.name}</span>
                </button>
            {/each}
            {#if messages.length > 0}
                <button class="ai-clear-btn" type="button" onclick={clearHistory} title={clearChatLabel}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                    {clearChatLabel}
                </button>
            {/if}
        </div>
    {/if}

    <!-- ── Message area ─────────────────────────────────────────────────── -->
    <div class="ai-messages" bind:this={messagesEl} aria-live="polite" aria-label={aiLabel}>
        {#if messages.length === 0}
            <div class="ai-start-hint">
                {#if currentCharacter()}
                    {@render iconDisplay(currentCharacter()!.icon, 'ai-start-icon')}
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
                    {#if msg.role === "assistant"}
                        {@const msgChar = characterById(msg.character)}
                        {#if msgChar}
                            {@render iconDisplay(msgChar.icon, 'ai-msg-icon')}
                        {/if}
                    {/if}

                    <div class="ai-message-body">
                        {#if msg.role === "user"}
                            <p class="ai-user-text">{msg.content}</p>
                        {:else}
                            <!-- Render answer with markdown links as clickable elements -->
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                            <div
                                class="ai-answer"
                                onclick={handleAnswerClick}
                                role="article"
                            >{@html renderAnswer(msg.content)}</div>

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
                        {@render iconDisplay(currentCharacter()!.icon, 'ai-msg-icon')}
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
            title={sendLabel}
            aria-label={sendLabel}
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

    /* ── Clear button (inside character bar) ────────────────────── */

    .ai-clear-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        background: none;
        border: none;
        color: var(--greg-menu-section-color);
        font-size: 0.7rem;
        font-family: inherit;
        cursor: pointer;
        padding: 0.15rem 0.3rem;
        border-radius: 4px;
        opacity: 0.6;
        transition: opacity 0.15s, color 0.15s;
        margin-left: auto;
        flex-shrink: 0;

        svg {
            width: 11px;
            height: 11px;
        }

        &:hover {
            opacity: 1;
            color: var(--greg-danger-text, #e53e3e);
        }
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
        font-size: 2rem;
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
        font-size: 3.2rem;
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
        font-size: 3rem;
        line-height: 1;
        padding-top: 0.1rem;
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
        word-break: break-word;
        background: var(--greg-menu-hover-background);
        padding: 0.65rem 0.9rem;
        border-radius: 2px 12px 12px 12px;

        :global(p) {
            margin: 0 0 0.45em;
            &:last-child { margin-bottom: 0; }
        }

        :global(strong) { font-weight: 700; }
        :global(em) { font-style: italic; }

        :global(code) {
            font-family: var(--vp-font-family-mono, 'Fira Code', 'Cascadia Code', monospace);
            font-size: 0.82em;
            background: var(--greg-code-block-bg, rgba(0, 0, 0, 0.06));
            padding: 0.1em 0.3em;
            border-radius: 3px;
        }

        :global(a[data-nav]) {
            color: var(--greg-accent);
            text-decoration: underline;
            cursor: pointer;
            &:hover { opacity: 0.8; }
        }

        :global(a[target='_blank']) {
            color: var(--greg-accent);
            text-decoration: underline;
        }
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
        align-self: stretch;
        min-height: 36px;
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

    /* ── Image icons ──────────────────────────────────────────── */

    .icon-img {
        width: 1em;
        height: 1em;
        object-fit: cover;
        border-radius: 50%;
        display: block;
    }
</style>
