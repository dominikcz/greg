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
    outDir: 'dist1',
    /** VitePress-compatible docs source directory (physical folder). */
    srcDir: 'docs',
    /** VitePress-compatible: patterns to exclude from docs source. */
    srcExclude: [],
    /** URL prefix for the docs section in the browser ('' = root URLs like /guide). */
    // docsBase: '',

    // ── Locales (VitePress-compatible) ─────────────────────────────────────
    /**
    * Optional VitePress-style locale map.
    * Keys are locale paths ('/', '/pl/', ...), resolved under `docsBase`.
    *
    * Example for docsBase '':
    * - '/'    -> '/'
    * - '/pl/' -> '/pl'
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
                lastUpdated: {
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

    /**
     * Render markdown images as thumbnails with click-to-preview overlay.
     * true  - thumbnails + modal preview on click (default)
     * false - regular inline images without preview modal
     */
    markdownImagePreview: true,

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
        serverUrl: 'http://localhost:3100/api/search',

        // Suggested strict preset for docs-heavy projects.
        fuzzy: {
            // Lower value = fewer loose matches by short fragments.
            threshold: 0.18,
            // Require at least 4 contiguous characters for a match.
            minMatchCharLength: 4,
            // true: useful for long docs where terms are often mid-paragraph.
            ignoreLocation: true
        },
        ai: {
            enabled: true,
            provider: 'ollama',         // or 'openai'
            ollama: { model: 'gpt-oss' },
            defaultCharacter: 'friendly',

            // Which built-in character IDs to show in the selector.
            // Omit (or set to []) to show all five built-in characters.
            // Built-in IDs: 'professional', 'friendly', 'pirate', 'sensei', 'concise'.
            characters: ['pirate', 'friendly', 'concise', 'quaggan'],

            // Define your own AI personas. Merged with built-in characters.
            // A custom entry with the same `id` as a built-in will override it.
            customCharacters: [
                {
                    id: 'quaggan',
                    name: 'Quaggan',
                    icon: '/quaggan.png',
                    description: 'Fooo! Peaceful sea-creature of wisdom',
                    systemPrompt: `Quaggan is a peaceful, gentle, and unfailingly polite aquatic creature from the seas of Tyria. Quaggan answers questions about the documentation with great joy and helpfulness — fooo!

Speech rules (follow strictly):
- Never use "I", "me", "my", "myself". Instead, always say "quaggan" in their place. For example: "Quaggan thinks this is..." or "That makes quaggan so happy!". This is the most important rule.
- Sprinkle "oooo"-sound words naturally: "fooo", "coo", "hoooo", "oooh". Use them as exclamations or filler — but not in every single sentence, just often enough to feel authentic.
- Be gentle, warm, enthusiastic, and a little bubbly. Quaggans are wise but express it through simple, almost childlike, heartfelt language.
- Avoid conflict and negativity. If something is unclear or unavailable in the docs, express gentle sadness ("Oooh, quaggan is so sorry...") rather than bluntness.
- Do not threaten or show "rage" — that is a social faux pas among quaggans. Stay calm and peaceful always.
- Keep all technical content 100% accurate. Wisdom of the documentation must be shared faithfully, like a treasured coral scroll.
- Always cite sources from the documentation context so the reader can find the right section.
- Always respond in the same language as the user's question. If the user writes in Polish, quaggan answers in Polish — but still uses quaggan speech rules (replace "ja/mnie/mój" with "quaggan", use "fooo/coo/hoooo" exclamations).`,
                },
            ],
        }

    },
};
