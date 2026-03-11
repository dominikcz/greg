<script lang="ts">
    import { onMount, tick } from "svelte";
    import Fuse from "fuse.js";
    import gregConfig from "virtual:greg-config";
    import { withBase } from "./common";

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

    let query = $state("");
    let results = $state<SearchResult[]>([]);
    let selectedIndex = $state(0);
    let inputEl = $state<HTMLInputElement | undefined>(undefined);
    let listEl = $state<HTMLUListElement | undefined>(undefined);

    /** True while a server / custom request is in flight. */
    let isSearching = $state(false);
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
            selectedIndex = 0;
        } else {
            query = "";
            results = [];
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
        if (!q) {
            abortCtrl?.abort();
            isSearching = false;
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
            selectedIndex = 0;
            return;
        }

        // server / custom — cancel previous in-flight request
        abortCtrl?.abort();
        abortCtrl = new AbortController();
        isSearching = true;
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
            selectedIndex = 0;
        } catch (e: any) {
            if (e?.name === "AbortError") return; // superseded by newer query — ignore
            if (generation !== searchGeneration) return;
            console.error("[Search]", e);
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
        switch (e.key) {
            case "Escape":
                onClose();
                break;
            case "ArrowDown":
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
                break;
            case "ArrowUp":
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                break;
            case "Enter":
                if (results.length > 0) goTo(results[selectedIndex]);
                break;
        }
    }

    function goTo(result: SearchResult) {
        const phrase = query.trim();
        if (phrase) {
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
        onclick={handleBackdropClick}
        onkeydown={handleKeydown}
        role="dialog"
        aria-modal="true"
        aria-label={searchModalLabel}
        tabindex="-1"
    >
        <div class="search-modal">
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
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <kbd
                    class="search-esc-hint"
                    onclick={onClose}
                    role="button"
                    tabindex="-1">Esc</kbd
                >
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
                >
                    {#each results as result, i}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <li
                            class="search-result-item"
                            class:selected={i === selectedIndex}
                            role="option"
                            aria-selected={i === selectedIndex}
                            onclick={() => goTo(result)}
                            onmouseenter={() => (selectedIndex = i)}
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
                                        >”ş {@html result.sectionTitleHtml ??
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
                <div class="search-status search-hint">
                    {searchStartText}
                </div>
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
        max-width: 660px;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.35);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        max-height: calc(100vh - 8rem);
        animation: slide-in 0.15s ease;
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
</style>
