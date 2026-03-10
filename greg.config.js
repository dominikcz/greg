/**
 * Greg configuration file.
 *
 * All keys are optional — props passed directly to <MarkdownDocs> take
 * precedence over values defined here.
 *
 * @type {import('./src/vite-env').GregConfig}
 */
export default {
    /** VitePress-compatible base public path. */
    base: '/',
    /** VitePress-compatible build output directory. */
    outDir: 'dist',
    /** URL prefix of the docs folder. */
    rootPath: '/docs',

    // ── Locales (VitePress-compatible) ─────────────────────────────────────
    /**
     * Optional VitePress-style locale map.
     * Keys are locale paths ('/', '/pl/', ...), resolved under `rootPath`.
     *
     * Example for rootPath '/docs':
     * - '/'    -> '/docs'
     * - '/pl/' -> '/docs/pl'
     */
    locales: {
        '/': {
            lang: 'en-US',
            label: 'English',
            title: 'Greg',
            themeConfig: {
                nav: [
                    { text: 'Guide', link: '/guide' },
                    { text: 'Reference', link: '/reference' },
                    {
                        text: 'More',
                        items: [
                            { text: 'VitePress incompatibilities', link: '/incompatibilities' },
                            {
                                text: 'Links',
                                items: [
                                    { text: 'GitHub', link: 'https://github.com/dominikcz/greg' },
                                    {
                                        text: 'Packages',
                                        items: [
                                            { text: 'npm', link: 'https://npmjs.com/package/@dominikcz/greg' },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
                sidebar: [
                    { text: 'Guide', auto: '/guide' },
                    { text: 'Reference', auto: '/reference' },
                    { text: 'GitHub', link: 'https://github.com/dominikcz/greg', target: '_blank' },
                    { text: 'VitePress incompatibilities', link: '/incompatibilities' },
                ],
                outline: [2, 3],
                lastUpdatedText: 'Last updated:',
                langMenuLabel: 'Change language',
                sidebarMenuLabel: 'Menu',
                skipToContentLabel: 'Skip to content',
                returnToTopLabel: 'Back to top',
                darkModeSwitchLabel: 'Appearance',
                lightModeSwitchTitle: 'Switch to light theme',
                darkModeSwitchTitle: 'Switch to dark theme',
                search: {
                    locales: {
                        '/': {
                            button: {
                                buttonText: 'Search...',
                                buttonAriaLabel: 'Search',
                            },
                            modal: {
                                searchBox: {
                                    placeholder: 'Search docs...',
                                },
                                loadingScreen: {
                                    loadingText: 'Loading index...',
                                },
                                errorScreen: {
                                    titleText: 'Failed to load search index.',
                                },
                                noResultsText: 'No results for',
                                startScreen: {
                                    noRecentSearchesText: 'Start typing to search across all documentation.',
                                },
                                footer: {
                                    navigateText: 'navigate',
                                    selectText: 'open',
                                    closeText: 'close',
                                },
                            },
                        },
                    },
                },
                docFooter: { prev: 'Previous page', next: 'Next page' },
                lastUpdated: {
                    text: 'Last updated:',
                    formatOptions: { dateStyle: 'long', timeStyle: 'short' },
                },
            },
        },
        '/pl/': {
            lang: 'pl-PL',
            label: 'Polski',
            title: 'Greg',
            themeConfig: {
                nav: [
                    { text: 'Przewodnik', link: '/guide' },
                    { text: 'Referencje', link: '/reference' },
                    {
                        text: 'Więcej',
                        items: [
                            { text: 'Niezgodności z VitePress', link: '/incompatibilities' },
                            {
                                text: 'Linki',
                                items: [
                                    { text: 'GitHub', link: 'https://github.com/dominikcz/greg' },
                                    {
                                        text: 'Pakiety',
                                        items: [
                                            { text: 'npm', link: 'https://npmjs.com/package/@dominikcz/greg' },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
                sidebar: [
                    { text: 'Przewodnik', auto: '/guide' },
                    { text: 'Referencje', auto: '/reference' },
                    { text: 'GitHub', link: 'https://github.com/dominikcz/greg', target: '_blank' },
                    { text: 'Niezgodności z VitePress', link: '/incompatibilities' },
                ],
                outline: { level: [2, 3], label: 'Na tej stronie' },
                lastUpdatedText: 'Ostatnia aktualizacja:',
                langMenuLabel: 'Zmień język',
                sidebarMenuLabel: 'Menu',
                skipToContentLabel: 'Przejdź do treści',
                returnToTopLabel: 'Wróć do góry',
                darkModeSwitchLabel: 'Wygląd',
                lightModeSwitchTitle: 'Przełącz na jasny motyw',
                darkModeSwitchTitle: 'Przełącz na ciemny motyw',
                search: {
                    locales: {
                        '/pl/': {
                            button: {
                                buttonText: 'Szukaj...',
                                buttonAriaLabel: 'Wyszukiwarka',
                            },
                            modal: {
                                searchBox: {
                                    placeholder: 'Szukaj w dokumentacji...',
                                },
                                loadingScreen: {
                                    loadingText: 'Wczytywanie indeksu...',
                                },
                                errorScreen: {
                                    titleText: 'Nie udało się wczytać indeksu wyszukiwania.',
                                },
                                noResultsText: 'Brak wyników dla',
                                startScreen: {
                                    noRecentSearchesText: 'Zacznij pisać, aby przeszukać całą dokumentację.',
                                },
                                footer: {
                                    navigateText: 'nawiguj',
                                    selectText: 'otwórz',
                                    closeText: 'zamknij',
                                },
                            },
                        },
                    },
                },
                docFooter: { prev: 'Poprzednia strona', next: 'Następna strona' },
                lastUpdated: {
                    text: 'Ostatnia aktualizacja:',
                    formatOptions: { dateStyle: 'long', timeStyle: 'short' },
                },
            },
        },
    },

    /** Version badge shown in the header (empty string = hidden). */
    // version: '1.0.0',

    /**
     * Multi-version docs build config (used by `greg build`).
     * Default strategy is 'branches' for better rebuild performance.
     */
    versioning: {
        strategy: 'branches',
        default: 'latest',
        aliases: {
            latest: '1',
            stable: '0.9',
        },
        ui: {
            versionMenuLabel: 'Version',
            manifestUnavailableText: 'Version selector unavailable',
            showManifestUnavailableStatus: false,
            outdatedVersionMessage: 'You are viewing an older version ({current}). Recommended: {default}.',
            outdatedVersionActionLabel: 'Go to latest',
        },
        locales: {
            '/pl/': {
                ui: {
                    versionMenuLabel: 'Wersja',
                    manifestUnavailableText: 'Przelacznik wersji niedostepny',
                    outdatedVersionMessage: 'Czytasz starsza wersje ({current}). Zalecana wersja to {default}.',
                    outdatedVersionActionLabel: 'Przejdz do najnowszej',
                },
            },
        },
        branches: [
            { version: '1', branch: 'main', title: 'current' },
            { version: '0.9', branch: 'v0.9', title: '0.9' },
        ],
    },

    /** Site title shown in the header. */
    mainTitle: 'Greg',

    // ── Outline panel ─────────────────────────────────────────────────────
    /**
     * VitePress-compatible outline setting.
     *   false        – disable outline
     *   2            – h2 only
     *   [2, 3]       – h2 and h3 (default)
     *   'deep'       – h2–h6
     *   { level: [2,3], label: 'On this page' }
     */
    outline: [2, 3],

    // ── Sidebar ────────────────────────────────────────────────────────────
    /**
     * 'auto' – generate sidebar from the docs/ folder structure (default).
     *
     * Or supply a manual tree, optionally mixing fixed entries with
     * auto-generated sub-sections (use `auto` to reference a sub-path):
     *
     *   sidebar: [
     *     { text: 'Guide',     auto: '/guide' },
     *     { text: 'Reference', auto: '/reference' },
     *     // target defaults to '_self' (same tab)
     *     { text: 'GitHub', link: 'https://github.com/…' },
     *     // optional target/rel for external links
     *     { text: 'GitHub (new tab)', link: 'https://github.com/…', target: '_blank', rel: 'noopener noreferrer' },
     *   ],
     */
    sidebar: [
        { text: 'Guide', auto: '/guide' },
        { text: 'Reference', auto: '/reference' },
        { text: 'GitHub', link: 'https://github.com/dominikcz/greg', target: '_blank' },
        { text: 'Vitepress incompatibilities', link: '/incompatibilities' },
    ],

    // ── Top navigation ─────────────────────────────────────────────────────
    /**
     * VitePress-compatible top nav bar.
     * Internal links are handled by the SPA router.
     * In nav dropdowns, external links default to `target: '_blank'` unless you set `target` explicitly.
     *
     *   nav: [
    *     { text: 'Guide',     link: '/guide' },
    *     { text: 'Reference', link: '/reference' },
     *     {
     *       text: 'More',
     *       items: [
    *         { text: 'Changelog', link: '/changelog' },
     *         // grouped section inside the dropdown:
     *         {
     *           text: 'Resources',
     *           items: [
     *             { text: 'GitHub', link: 'https://github.com/…', target: '_self' },
     *             { text: 'npm',    link: 'https://npmjs.com/…', target: '_blank' },
     *           ],
     *         },
     *       ],
     *     },
     *   ],
     */
    nav: [
        { text: 'Guide', link: '/guide' },
        { text: 'Reference', link: '/reference' },
        {
            text: 'More',
            items: [
                { text: 'VitePress incompatibilities', link: '/incompatibilities' },
                {
                    text: 'Links',
                    items: [
                        { text: 'GitHub', link: 'https://github.com/dominikcz/greg' },
                        {
                            text: 'Packages',
                            items: [
                                { text: 'npm', link: 'https://npmjs.com/package/@dominikcz/greg' },
                            ],
                        },
                    ],
                },
            ],
        },
    ],

    // ── Doc page chrome ────────────────────────────────────────────────────
    /** Show breadcrumb navigation above content (doc layout only). */
    breadcrumb: true,

    /** Show a "Back to top" button when the user scrolls down. */
    backToTop: true,

    /** Show the file's last-modified date below content (doc layout only).
     *   true                        – default format: medium date, browser locale
     *   { text: 'Updated:',
     *     locale: 'pl-PL',
     *     formatOptions: { dateStyle: 'long', timeStyle: 'short' } }
     */
    lastModified: {
        text: 'Zaktualizowano:',
        formatOptions: { dateStyle: 'long', timeStyle: 'short' },
    },

    // ── Mermaid diagrams ───────────────────────────────────────────────────
    /**
     * Active diagram theme key.
     * Built-in: 'material' (light, default) | 'material-dark'.
     * Dark variant is selected automatically when the app switches to dark mode.
     */
    mermaidTheme: 'material',

    // ── Carbon Ads ────────────────────────────────────────────────────────
    // carbonAds: { code: 'CWYD42JI', placement: 'vitepressdev' },

    // ── Search ─────────────────────────────────────────────────────────────
    /**
     * Search mode:
     * - 'server' (default): query /api/search (best for large docs)
     * - 'local': download search-index.json and search in browser
     * - 'none': disable built-in search UI
     *
     * serverUrl sets the endpoint used in 'server' mode.
     * Dev/preview exposes '/api/search' automatically via vitePluginSearchServer.
     * Production example:
     *   greg search-server --index dist/search-index.json --port 3100
     *
     * fuzzy lets you tune matching strictness:
     * - threshold: 0..1, lower = stricter, fewer fuzzy matches
     * - minMatchCharLength: minimum contiguous match length
     * - ignoreLocation: true = match can be anywhere in text,
     *   false = prefer matches closer to start of title/section/content
     */
    search: {
        provider: 'server',
        // Use '/api/search' when your reverse proxy forwards this path
        // to greg search-server (recommended for production).
        // Use full URL only when the search server is on a different origin:
        // serverUrl: 'http://127.0.0.1:3100/api/search',
        // serverUrl: '/api/search',
        serverUrl: 'http://localhost:3100/api/search',

        // Suggested strict preset for docs-heavy projects.
        fuzzy: {
            // Lower value = fewer loose matches by short fragments.
            threshold: 0.18,
            // Require at least 4 contiguous characters for a match.
            minMatchCharLength: 4,
            // true: useful for long docs where terms are often mid-paragraph.
            ignoreLocation: true
        }

    },
};
