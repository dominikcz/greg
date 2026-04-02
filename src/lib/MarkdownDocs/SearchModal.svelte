<script lang="ts">
    import { onMount, tick } from "svelte";
    import Fuse from "fuse.js";
    import gregConfig from "virtual:greg-config";
    import { withBase } from "./common";
    import AiChat from "./AiChat.svelte";

    // ── Types ──────────────────────────────────────────────────────────────────

    type SearchSection = {
        heading: string;
        anchor: string;
        content: string;
    };

    type SearchEntry = {
        id: string;
        title: string;
        sections: SearchSection[];
    };

    type SearchResult = {
        id: string;
        title: string;
        titleHtml: string;
        sectionTitle: string;
        sectionTitleHtml?: string;
        sectionAnchor: string;
        excerptHtml: string;
        score: number;
    };

    /**
     * Custom search provider function.
     * `(query, limit?) => Promise<SearchResult[]>`
     * When provided, takes priority over greg.config.js ”ş search.provider.
     */
    export type SearchProviderFn = (
        query: string,
        limit?: number,
    ) => Promise<SearchResult[]>;

    type Props = {
        open: boolean;
        onClose: () => void;
        onNavigate: (path: string, anchor?: string) => void;
        localeSrcDir?: string;
        allLocaleSrcDirs?: string[];
        baseSrcDir?: string;
        searchProvider?: SearchProviderFn;
        searchModalLabel?: string;
        searchPlaceholder?: string;
        searchLoadingText?: string;
        searchErrorText?: string;
        searchSearchingText?: string;
        searchNoResultsText?: string;
        searchStartText?: string;
        searchResultsAriaLabel?: string;
        searchNavigateText?: string;
        searchSelectText?: string;
        searchCloseText?: string;
        aiTabLabel?: string;
        aiPlaceholder?: string;
        aiLoadingText?: string;
        aiErrorText?: string;
        aiStartText?: string;
        aiSourcesLabel?: string;
        aiClearChatLabel?: string;
        aiSendLabel?: string;
    };

    let {
        open = $bindable(false),
        onClose,
        onNavigate,
        localeSrcDir = "/docs",
        allLocaleSrcDirs = [],
        baseSrcDir = "/docs",
        searchProvider,
        searchModalLabel = "Search",
        searchPlaceholder = "Search docs...",
        searchLoadingText = "Loading index...",
        searchErrorText = "Failed to load search index.",
        searchSearchingText = "Searching...",
        searchNoResultsText = "No results for",
        searchStartText = "Start typing to search across all documentation.",
        searchResultsAriaLabel = "Search results",
        searchNavigateText = "navigate",
        searchSelectText = "open",
        searchCloseText = "close",
        aiTabLabel = "Ask AI",
        aiPlaceholder = "Ask a question about the docs\u2026",
        aiLoadingText = "Thinking\u2026",
        aiErrorText = "Something went wrong. Please try again.",
        aiStartText = "Ask me anything about this documentation. My answers are based exclusively on the docs.",
        aiSourcesLabel = "Sources",
        aiClearChatLabel = "Clear chat",
        aiSendLabel = "Send",
    }: Props = $props();

    function normalizePath(path: string): string {
        const value = String(path || "").trim();
        if (!value || value === "/") return "/";
        return "/" + value.replace(/^\/+|\/+$/g, "");
    }

    function isPathInActiveLocale(path: string): boolean {
        const id = normalizePath(path);
        const currentRoot = normalizePath(localeSrcDir);
        const baseRoot = normalizePath(baseSrcDir);
        const roots = (allLocaleSrcDirs ?? []).map(normalizePath);

        const inCurrentRoot = currentRoot === "/"
            ? id.startsWith("/")
            : (id === currentRoot || id.startsWith(currentRoot + "/"));

        if (!inCurrentRoot) {
            return false;
        }

        // Root locale should not include localized subtrees.
        if (currentRoot === baseRoot) {
            const otherRoots = roots.filter((rp) => rp !== currentRoot);
            if (
                otherRoots.some(
                    (rp) => id === rp || id.startsWith(rp + "/"),
                )
            ) {
                return false;
            }
        }

        return true;
    }

    // ── Config ─────────────────────────────────────────────────────────────────

    const cfgSearch = (gregConfig as any)?.search ?? {};
    /** Effective mode. Reactive so the prop can change at runtime. */
    const mode = $derived<"local" | "server" | "custom" | "none">(
        searchProvider ? "custom" : (cfgSearch.provider ?? "server"),
    );
    /** Whether the AI assistant is enabled in config. */
    const aiEnabled = $derived(!!(cfgSearch?.ai?.enabled));
    /** Which tab is active in the modal: search or AI chat. */
    let tabMode = $state<"search" | "ai">("search");
    /** Exposed handle from AiChat — gives access to clear() and hasMessages. */
    let aiChatHandle = $state<{ clear: () => void; hasMessages: boolean } | undefined>(undefined);
    /** Whether the AI chat panel is expanded to full screen. */
    let aiExpanded = $state(false);
    const serverUrl: string = cfgSearch.serverUrl ?? "/api/search";
    const fuzzyCfg = cfgSearch.fuzzy ?? {};
    const localThreshold: number = Number.isFinite(Number(fuzzyCfg.threshold))
        ? Number(fuzzyCfg.threshold)
        : 0.35;
    const localMinMatchCharLength: number = Number.isFinite(
        Number(fuzzyCfg.minMatchCharLength),
    )
        ? Math.max(1, Number(fuzzyCfg.minMatchCharLength))
        : 3;
    const localIgnoreLocation: boolean = fuzzyCfg.ignoreLocation !== false;

    // ── State ──────────────────────────────────────────────────────────────────

    // ── Recent searches (localStorage) ───────────────────────────────────

    const RECENT_KEY = 'greg-search-recent';
    const MAX_RECENT = 8;

    function loadRecentSearches(): string[] {
        try {
            const raw = localStorage.getItem(RECENT_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed as string[];
            }
        } catch { /* ignore */ }
        return [];
    }

    function saveRecentSearches(list: string[]) {
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* ignore */ }
    }

    let recentSearches = $state<string[]>(loadRecentSearches());

    function addRecentSearch(phrase: string) {
        const trimmed = phrase.trim();
        if (!trimmed) return;
        const filtered = recentSearches.filter(r => r !== trimmed);
        recentSearches = [trimmed, ...filtered].slice(0, MAX_RECENT);
        saveRecentSearches(recentSearches);
    }

    function removeRecentSearch(phrase: string) {
        recentSearches = recentSearches.filter(r => r !== phrase);
        saveRecentSearches(recentSearches);
    }

    function clearRecentSearches() {
        recentSearches = [];
        try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
    }

    let query = $state("");
    let results = $state<SearchResult[]>([]);
    let selectedIndex = $state(-1);
    let inputEl = $state<HTMLInputElement | undefined>(undefined);
    let listEl = $state<HTMLUListElement | undefined>(undefined);
    /** True when selection was last moved by keyboard — suppresses mouseenter updates. */
    let usingKeyboard = false;

    /** True while a server / custom request is in flight. */
    let isSearching = $state(false);
    /** True when the last server/custom search ended with a network/HTTP error. */
    let searchFailed = $state(false);
    /** For local mode: true once the full JSON index has been downloaded. */
    let indexReady = $state(false);
    let indexError = $state(false);

    let fuse: Fuse<SearchEntry> | null = null;

    // ── Local mode: pre-load index into browser ─────────────────────────────

    onMount(async () => {
        if (mode !== "local") {
            indexReady = true; // server / custom: ready immediately
            return;
        }
        try {
            const res = await fetch(withBase("/search-index.json"));
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: SearchEntry[] = await res.json();
            fuse = new Fuse(data, {
                includeScore: true,
                includeMatches: true,
                threshold: localThreshold,
                ignoreLocation: localIgnoreLocation,
                minMatchCharLength: localMinMatchCharLength,
                keys: [
                    { name: "title", weight: 3 },
                    { name: "sections.heading", weight: 2 },
                    { name: "sections.content", weight: 1 },
                ],
            });
            indexReady = true;
        } catch (e) {
            console.error("[Search] Failed to load index:", e);
            indexError = true;
        }
    });

    // Focus input whenever modal opens; reset when it closes
    $effect(() => {
        if (open) {
            tick().then(() => inputEl?.focus());
            selectedIndex = -1;
        } else {
            query = "";
            results = [];
            tabMode = "search";
        }
    });

    // Scroll selected item into view
    $effect(() => {
        tick().then(() => {
            const item = listEl?.children[selectedIndex] as
                | HTMLElement
                | undefined;
            item?.scrollIntoView({ block: "nearest" });
        });
    });

    // ── Debounced search ───────────────────────────────────────────────────────

    let searchTimer: ReturnType<typeof setTimeout>;
    let abortCtrl: AbortController | null = null;
    let searchGeneration = 0;

    function handleInput() {
        clearTimeout(searchTimer);
        const q = query.trim();
        searchGeneration += 1;
        selectedIndex = -1;
        if (!q) {
            abortCtrl?.abort();
            isSearching = false;
            searchFailed = false;
            results = [];
            return;
        }
        if (mode !== "local") isSearching = true;
        const generation = searchGeneration;
        searchTimer = setTimeout(() => void runSearch(generation), 200);
    }

    async function runSearch(generation = searchGeneration) {
        if (generation !== searchGeneration) return;
        const q = query.trim();
        if (!q) {
            results = [];
            searchFailed = false;
            isSearching = false;
            return;
        }

        const displayLimit = 10;
        const fetchLimit = 50;

        if (mode === "local") {
            if (!fuse) return;
            const localResults = fuse
                .search(q, { limit: fetchLimit })
                .filter((res) => isPathInActiveLocale(res.item.id))
                .slice(0, displayLimit)
                .map(buildLocalResult);
            if (generation !== searchGeneration) return;
            results = localResults;
            selectedIndex = -1;
            return;
        }

        // server / custom — cancel previous in-flight request
        abortCtrl?.abort();
        abortCtrl = new AbortController();
        isSearching = true;
        searchFailed = false;
        try {
            let raw: SearchResult[];
            if (mode === "custom" && searchProvider) {
                raw = await searchProvider(q, fetchLimit);
            } else {
                const localeRoot = normalizePath(localeSrcDir);
                const baseRoot = normalizePath(baseSrcDir);
                const localeRoots = (allLocaleSrcDirs ?? [])
                    .map(normalizePath)
                    .join(",");
                const url =
                    `${withBase(serverUrl)}?q=${encodeURIComponent(q)}`+
                    `&limit=${fetchLimit}` +
                    `&localeRoot=${encodeURIComponent(localeRoot)}` +
                    `&baseRoot=${encodeURIComponent(baseRoot)}` +
                    `&localeRoots=${encodeURIComponent(localeRoots)}`;
                const res = await fetch(url, { signal: abortCtrl.signal });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                raw = data.results ?? [];
            }
            if (generation !== searchGeneration) return;
            results = raw.slice(0, displayLimit);
            selectedIndex = -1;
        } catch (e: any) {
            if (e?.name === "AbortError") return; // superseded by newer query — ignore
            if (generation !== searchGeneration) return;
            console.error("[Search]", e);
            searchFailed = true;
            results = [];
        } finally {
            if (generation === searchGeneration) {
                isSearching = false;
            }
        }
    }

    // ── Local mode helpers: Fuse.js result → SearchResult ─────────────────────

    function escapeHtml(str: string): string {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    /**
     * Build highlighted HTML from a string and fuse.js index pairs.
     */
    function highlightText(text: string, indices: [number, number][]): string {
        if (!indices?.length) return escapeHtml(text);
        let html = "";
        let last = 0;
        for (const [s, e] of indices) {
            if (s >= text.length) break;
            if (s > last) html += escapeHtml(text.slice(last, s));
            html += `<mark>${escapeHtml(text.slice(s, e + 1))}</mark>`;
            last = e + 1;
        }
        html += escapeHtml(text.slice(last));
        return html;
    }

    /**
     * Extract a ~contextLen char excerpt centred on the first match,
     * with matched spans wrapped in <mark>.
     */
    function getExcerptHtml(
        text: string,
        indices: [number, number][],
        contextLen = 150,
    ): string {
        if (!text) return "";

        if (!indices?.length) {
            return (
                escapeHtml(text.slice(0, contextLen)) +
                (text.length > contextLen ? "…" : "")
            );
        }

        const firstMatchStart = indices[0][0];
        const from = Math.max(0, firstMatchStart - 50);
        const to = Math.min(text.length, from + contextLen);
        const sliced = text.slice(from, to);

        // Adjust indices to the sliced window
        const adjusted: [number, number][] = indices
            .map(([s, e]) => [s - from, e - from] as [number, number])
            .filter(([s, e]) => e >= 0 && s < sliced.length)
            .map(
                ([s, e]) =>
                    [Math.max(0, s), Math.min(sliced.length - 1, e)] as [
                        number,
                        number,
                    ],
            );

        const prefix = from > 0 ? "…" : "";
        const suffix = to < text.length ? "…" : "";

        let html = prefix;
        let last = 0;
        for (const [s, e] of adjusted) {
            if (s > last) html += escapeHtml(sliced.slice(last, s));
            html += `<mark>${escapeHtml(sliced.slice(s, e + 1))}</mark>`;
            last = e + 1;
        }
        html += escapeHtml(sliced.slice(last)) + suffix;
        return html;
    }

    function buildLocalResult(fuseResult: any): SearchResult {
        const { item, matches = [], score = 1 } = fuseResult;

        // Sort matches by total matched span length (longest = most relevant)
        const sorted: any[] = [...(matches ?? [])].sort(
            (a, b) =>
                b.indices.reduce(
                    (s: number, [x, y]: number[]) => s + (y - x),
                    0,
                ) -
                a.indices.reduce(
                    (s: number, [x, y]: number[]) => s + (y - x),
                    0,
                ),
        );

        const titleMatch = sorted.find((m) => m.key === "title");
        const sectionContent = sorted.find((m) => m.key === "sections.content");
        const sectionHeading = sorted.find((m) => m.key === "sections.heading");

        let excerptHtml = "";
        let sectionTitle = "";
        let sectionAnchor = "";

        if (sectionContent) {
            const sec = item.sections[sectionContent.refIndex];
            sectionTitle = sec?.heading ?? "";
            sectionAnchor = sec?.anchor ?? "";
            excerptHtml = getExcerptHtml(
                sectionContent.value,
                sectionContent.indices,
            );
        } else if (sectionHeading) {
            const sec = item.sections[sectionHeading.refIndex];
            sectionTitle = sec?.heading ?? "";
            sectionAnchor = sec?.anchor ?? "";
            excerptHtml = escapeHtml((sec?.content ?? "").slice(0, 150));
        } else {
            // Fallback: beginning of first section
            excerptHtml = escapeHtml(
                (item.sections[0]?.content ?? "").slice(0, 150),
            );
        }

        const titleHtml = titleMatch
            ? highlightText(item.title, titleMatch.indices)
            : escapeHtml(item.title);
        const sectionTitleHtml = sectionHeading
            ? highlightText(sectionTitle, sectionHeading.indices)
            : escapeHtml(sectionTitle);

        return {
            id: item.id,
            title: item.title,
            titleHtml,
            sectionTitle,
            sectionTitleHtml,
            sectionAnchor,
            excerptHtml,
            score,
        };
    }

    // ── Keyboard navigation ────────────────────────────────────────────────────

    function handleKeydown(e: KeyboardEvent) {
        e.stopPropagation();
        // When query is empty, navigate/activate recent searches
        const inRecent = !query.trim() && recentSearches.length > 0;
        const listSize = inRecent ? recentSearches.length : results.length;
        switch (e.key) {
            case "Escape":
                onClose();
                break;
            case "ArrowDown":
                e.preventDefault();
                usingKeyboard = true;
                selectedIndex = Math.min(selectedIndex + 1, listSize - 1);
                break;
            case "ArrowUp":
                e.preventDefault();
                usingKeyboard = true;
                selectedIndex = Math.max(selectedIndex - 1, 0);
                break;
            case "Enter":
                if (inRecent && recentSearches[selectedIndex]) {
                    query = recentSearches[selectedIndex];
                    void runSearch();
                } else if (results.length > 0) {
                    goTo(results[selectedIndex]);
                }
                break;
        }
    }

    function goTo(result: SearchResult) {
        const phrase = query.trim();
        if (phrase) {
            addRecentSearch(phrase);
            try {
                sessionStorage.setItem(
                    "greg-search-highlight",
                    JSON.stringify({
                        query: phrase,
                        path: result.id,
                        timestamp: Date.now(),
                    }),
                );
            } catch {
                // Ignore storage errors and continue navigation.
            }
        }
        onNavigate(result.id, result.sectionAnchor || undefined);
        window.setTimeout(() => {
            window.dispatchEvent(
                new CustomEvent("greg-search-highlight-request"),
            );
        }, 0);
        onClose();
    }

    function handleBackdropClick(e: MouseEvent) {
        if (e.target === e.currentTarget) onClose();
    }
</script>

{#if open}
    <div
        class="search-backdrop"
        class:ai-expanded={aiExpanded}
        onclick={handleBackdropClick}
        onkeydown={handleKeydown}
        role="dialog"
        aria-modal="true"
        aria-label={searchModalLabel}
        tabindex="-1"
    >
        <div class="search-modal" class:ai-mode={aiEnabled && tabMode === "ai"} class:ai-expanded={aiExpanded}>

            <!-- ── Tab switcher (only when AI is enabled) ── -->
            {#if aiEnabled}
                <div class="modal-tabs">
                    <button
                        class="modal-tab"
                        class:active={tabMode === "search"}
                        onclick={() => { tabMode = "search"; tick().then(() => inputEl?.focus()); }}
                        type="button"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" class="modal-tab-icon">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        {searchModalLabel}
                    </button>
                    <button
                        class="modal-tab"
                        class:active={tabMode === "ai"}
                        onclick={() => (tabMode = "ai")}
                        type="button"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" class="modal-tab-icon">
                            <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
                        </svg>
                        {aiTabLabel}
                    </button>
                    <div class="modal-tabs-end">
                        {#if tabMode === "ai"}
                            <button class="ai-expand-btn" type="button" onclick={() => (aiExpanded = !aiExpanded)} title={aiExpanded ? 'Minimize' : 'Expand'} aria-label={aiExpanded ? 'Minimize chat' : 'Expand chat'}>
                                {#if aiExpanded}
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                        <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
                                    </svg>
                                {:else}
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                        <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                                    </svg>
                                {/if}
                            </button>
                        {/if}
                        {#if tabMode === "ai" && aiChatHandle?.hasMessages}
                            <button class="ai-clear-btn" type="button" onclick={() => aiChatHandle?.clear()} title={aiClearChatLabel}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                    <path d="M10 11v6M14 11v6"/>
                                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                </svg>
                                {aiClearChatLabel}
                            </button>
                        {/if}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <kbd
                            class="search-esc-hint"
                            onclick={onClose}
                            role="button"
                            tabindex="-1">Esc</kbd
                        >
                    </div>
                </div>
            {/if}

            {#if !aiEnabled || tabMode === "search"}
                <!-- ── Search tab (existing) ── -->

                <!-- Input row -->
                <div class="search-field">
                    <svg
                        class="search-icon"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <circle cx="11" cy="11" r="8" /><line
                            x1="21"
                            y1="21"
                            x2="16.65"
                            y2="16.65"
                        />
                    </svg>
                    <input
                        bind:this={inputEl}
                        bind:value={query}
                        oninput={handleInput}
                        onkeydown={handleKeydown}
                        type="search"
                        class="search-field-input"
                        placeholder={searchPlaceholder}
                        autocomplete="off"
                        spellcheck="false"
                    />
                    {#if !aiEnabled}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <kbd
                            class="search-esc-hint"
                            onclick={onClose}
                            role="button"
                            tabindex="-1">Esc</kbd
                        >
                    {/if}
                </div>

                <!-- Body -->
                {#if mode === "local" && !indexReady && !indexError}
                <div class="search-status">{searchLoadingText}</div>
            {:else if mode === "local" && indexError}
                <div class="search-status search-error">
                    {searchErrorText}
                </div>
            {:else if isSearching}
                <div class="search-status">
                    <span class="search-spinner" aria-hidden="true"></span>
                    {searchSearchingText}
                </div>
            {:else if searchFailed && query.trim()}
                <div class="search-status search-error">
                    {searchErrorText}
                </div>
            {:else if query.trim() && results.length === 0}
                <div class="search-status">
                    {searchNoResultsText} <strong>"{query}"</strong>
                </div>
            {:else if results.length > 0}
                <ul
                    bind:this={listEl}
                    class="search-results"
                    role="listbox"
                    aria-label={searchResultsAriaLabel}
                    onpointermove={(e) => { if (e.movementX || e.movementY) usingKeyboard = false; }}
                >
                    {#each results as result, i}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <li
                            class="search-result-item"
                            class:selected={i === selectedIndex}
                            role="option"
                            aria-selected={i === selectedIndex}
                            onclick={() => goTo(result)}
                            onmouseenter={() => { if (!usingKeyboard) selectedIndex = i; }}
                        >
                            <div class="result-header">
                                <svg
                                    class="result-page-icon"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path
                                        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                                    />
                                    <polyline points="14 2 14 8 20 8" />
                                </svg>
                                <span class="result-title"
                                    >{@html result.titleHtml}</span
                                >
                                {#if result.sectionTitle}
                                    <svg
                                        class="result-chevron"
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2.5"
                                    >
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                    <span class="result-section"
                                        >{@html result.sectionTitleHtml ??
                                            escapeHtml(result.sectionTitle)}</span
                                    >
                                {/if}
                            </div>
                            {#if result.excerptHtml}
                                <p class="result-excerpt">
                                    {@html result.excerptHtml}
                                </p>
                            {/if}
                        </li>
                    {/each}
                </ul>
                <div class="search-footer">
                    <span><kbd>↑</kbd><kbd>↓</kbd> {searchNavigateText}</span>
                    <span><kbd>↵</kbd> {searchSelectText}</span>
                    <span><kbd>Esc</kbd> {searchCloseText}</span>
                </div>
            {:else if !query.trim()}
                {#if recentSearches.length > 0}
                    <div class="search-recent">
                        <div class="search-recent-header">
                            <span class="search-recent-label">Recent searches</span>
                            <button class="search-recent-clear" type="button" onclick={clearRecentSearches}>Clear all</button>
                        </div>
                        <ul class="search-results" role="listbox" aria-label="Recent searches" onpointermove={(e) => { if (e.movementX || e.movementY) usingKeyboard = false; }}>
                            {#each recentSearches as phrase, i}
                                <!-- svelte-ignore a11y_click_events_have_key_events -->
                                <li
                                    class="search-result-item search-recent-item"
                                    class:selected={i === selectedIndex}
                                    role="option"
                                    aria-selected={i === selectedIndex}
                                    onclick={() => { query = phrase; void runSearch(); }}
                                    onmouseenter={() => { if (!usingKeyboard) selectedIndex = i; }}
                                >
                                    <div class="result-header">
                                        <svg class="search-recent-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                            <circle cx="12" cy="12" r="10"/>
                                            <polyline points="12 6 12 12 16 14"/>
                                        </svg>
                                        <span class="result-title">{phrase}</span>
                                    </div>
                                    <button
                                        class="search-recent-remove"
                                        type="button"
                                        aria-label="Remove from history"
                                        onclick={(e) => { e.stopPropagation(); removeRecentSearch(phrase); }}
                                    >×</button>
                                </li>
                            {/each}
                        </ul>
                    </div>
                {:else}
                    <div class="search-status search-hint">
                        {searchStartText}
                    </div>
                {/if}
            {/if}

            {:else}
                <!-- ── AI Chat tab ── -->
                <AiChat
                    {onNavigate}
                    {onClose}
                    localeSrcDir={localeSrcDir}
                    placeholder={aiPlaceholder}
                    loadingText={aiLoadingText}
                    errorText={aiErrorText}
                    startText={aiStartText}
                    sourcesLabel={aiSourcesLabel}
                    clearChatLabel={aiClearChatLabel}
                    sendLabel={aiSendLabel}
                    bind:chatHandle={aiChatHandle}
                />
            {/if}

        </div>
    </div>
{/if}

<style lang="scss">
    .search-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        background: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(3px);
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 5rem;
        animation: fade-in 0.12s ease;
    }

    @keyframes fade-in {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    .search-modal {
        background: var(--greg-menu-background);
        border: 1px solid var(--greg-border-color);
        border-radius: 12px;
        width: 100%;
        max-width: 700px;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.35);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        max-height: calc(100vh - 8rem);
        animation: slide-in 0.15s ease;

        &.ai-mode {
            max-height: calc(100vh - 5rem);
            min-height: min(540px, calc(100vh - 5rem));
        }

        &.ai-expanded {
            max-width: 100%;
            width: 100%;
            height: calc(100vh - 2rem);
            max-height: calc(100vh - 2rem);
            border-radius: 10px;
        }
    }

    .search-backdrop.ai-expanded {
        padding-top: 0;
        align-items: center;
        padding: 1rem;
    }

    /* ── Mode tabs ─────────────────────────────────────────────── */
    .modal-tabs {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.5rem 0.75rem;
        border-bottom: 1px solid var(--greg-border-color);
        background: var(--greg-header-background);
        flex-shrink: 0;
    }

    .modal-tab {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.3rem 0.75rem;
        border-radius: 6px;
        border: 1px solid transparent;
        background: transparent;
        color: var(--greg-menu-section-color);
        cursor: pointer;
        font-size: 0.8rem;
        font-family: inherit;
        font-weight: 500;
        white-space: nowrap;
        transition: all 0.15s;

        &:hover {
            color: var(--greg-color);
            background: var(--greg-menu-hover-background);
        }

        &.active {
            color: var(--greg-accent);
            background: color-mix(in srgb, var(--greg-accent) 10%, transparent);
            border-color: color-mix(in srgb, var(--greg-accent) 30%, transparent);
        }
    }

    .modal-tab-icon {
        width: 13px;
        height: 13px;
        flex-shrink: 0;
    }

    /* ── Right-side group (clear + Esc) ────────────────────── */

    .modal-tabs-end {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        margin-left: auto;
        flex-shrink: 0;
    }

    /* ── Clear chat button (in modal-tabs) ──────────────────── */

    .ai-expand-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        color: var(--greg-menu-section-color);
        cursor: pointer;
        padding: 0.2rem 0.3rem;
        border-radius: 4px;
        opacity: 0.6;
        transition: opacity 0.15s, color 0.15s;
        flex-shrink: 0;

        svg {
            width: 13px;
            height: 13px;
        }

        &:hover {
            opacity: 1;
            color: var(--greg-color);
        }
    }

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

    @keyframes slide-in {
        from {
            transform: translateY(-12px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    /* ── Input row ─────────────────────────────────────────────── */
    .search-field {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.875rem 1rem;
        border-bottom: 1px solid var(--greg-border-color);
        background: var(--greg-header-background);
        flex-shrink: 0;
    }

    .search-icon {
        width: 18px;
        height: 18px;
        color: var(--greg-menu-section-color);
        flex-shrink: 0;
    }

    .search-field-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--greg-color);
        font-size: 1rem;
        appearance: none;
        min-width: 0;

        &::-webkit-search-cancel-button {
            display: none;
        }
        &::placeholder {
            color: var(--greg-menu-section-color);
        }
    }

    .search-esc-hint {
        cursor: pointer;
        font-size: 0.7rem;
        padding: 0.2rem 0.45rem;
        border: 1px solid var(--greg-border-color);
        border-radius: 4px;
        color: var(--greg-menu-section-color);
        background: var(--greg-menu-background);
        flex-shrink: 0;
        user-select: none;

        &:hover {
            border-color: var(--greg-accent);
            color: var(--greg-accent);
        }
    }

    /* ── Status / empty states ─────────────────────────────────── */
    .search-status {
        padding: 2.5rem 1.25rem;
        text-align: center;
        color: var(--greg-menu-section-color);
        font-size: 0.875rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;

        &.search-error {
            color: var(--greg-danger-text);
        }
        &.search-hint {
            font-size: 0.8rem;
        }

        strong {
            color: var(--greg-color);
        }
    }

    .search-spinner {
        display: inline-block;
        width: 1em;
        height: 1em;
        border: 2px solid var(--greg-border-color);
        border-top-color: var(--greg-accent);
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    /* ── Results list ──────────────────────────────────────────── */
    .search-results {
        list-style: none;
        margin: 0;
        padding: 0.5rem;
        overflow-y: auto;
        flex: 1;
    }

    .search-result-item {
        padding: 0.7rem 0.875rem;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.1s;

        & + & {
            margin-top: 2px;
        }

        &.selected {
            background: var(--greg-menu-hover-background);
        }
    }

    .result-header {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        flex-wrap: wrap;
        margin-bottom: 0.25rem;
    }

    .result-page-icon {
        width: 13px;
        height: 13px;
        color: var(--greg-accent);
        flex-shrink: 0;
    }

    .result-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--greg-color);
        line-height: 1.3;

        :global(mark) {
            background: var(--greg-accent);
            color: var(--greg-menu-active-color);
            border-radius: 2px;
            padding: 0 2px;
        }
    }

    .result-chevron {
        width: 11px;
        height: 11px;
        color: var(--greg-menu-section-color);
        flex-shrink: 0;
    }

    .result-section {
        font-size: 0.78rem;
        color: var(--greg-menu-section-color);
        font-weight: 500;
    }

    .result-excerpt {
        margin: 0;
        font-size: 0.78rem;
        color: var(--greg-menu-section-color);
        line-height: 1.55;
        padding-left: 1.25rem; /* align under title */
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;

        :global(mark) {
            background: var(--greg-accent-light);
            color: var(--greg-accent);
            border-radius: 2px;
            padding: 0 1px;
            font-weight: 600;
        }
    }

    /* ── Footer keyboard hints ─────────────────────────────────── */
    .search-footer {
        display: flex;
        gap: 1.25rem;
        padding: 0.55rem 1rem;
        border-top: 1px solid var(--greg-border-color);
        font-size: 0.7rem;
        color: var(--greg-menu-section-color);
        background: var(--greg-header-background);
        flex-shrink: 0;

        span {
            display: flex;
            align-items: center;
            gap: 0.2rem;
        }

        kbd {
            background: var(--greg-menu-background);
            border: 1px solid var(--greg-border-color);
            border-radius: 3px;
            padding: 0.1rem 0.3rem;
            font-size: 0.68rem;
            font-family: inherit;
            line-height: 1.4;
        }
    }

    /* ── Recent searches ───────────────────────────────────────── */

    .search-recent {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
    }

    .search-recent-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.5rem 1rem 0.25rem;
        flex-shrink: 0;
    }

    .search-recent-label {
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--greg-menu-section-color);
    }

    .search-recent-clear {
        background: none;
        border: none;
        font-size: 0.7rem;
        font-family: inherit;
        color: var(--greg-menu-section-color);
        cursor: pointer;
        padding: 0.1rem 0.3rem;
        border-radius: 3px;
        opacity: 0.7;
        transition: opacity 0.15s, color 0.15s;

        &:hover {
            opacity: 1;
            color: var(--greg-danger-text, #e53e3e);
        }
    }

    .search-recent-item {
        position: relative;
        padding-right: 2rem;
    }

    .search-recent-icon {
        width: 13px;
        height: 13px;
        color: var(--greg-menu-section-color);
        flex-shrink: 0;
    }

    .search-recent-remove {
        position: absolute;
        right: 0.6rem;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        font-size: 1rem;
        line-height: 1;
        color: var(--greg-menu-section-color);
        cursor: pointer;
        padding: 0.2rem 0.3rem;
        border-radius: 3px;
        opacity: 0;
        transition: opacity 0.15s, color 0.15s;

        .search-recent-item:hover &,
        .search-recent-item.selected & {
            opacity: 0.6;
        }

        &:hover {
            opacity: 1 !important;
            color: var(--greg-danger-text, #e53e3e);
        }
    }
</style>
