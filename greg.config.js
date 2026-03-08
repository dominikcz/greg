/**
 * Greg configuration file.
 *
 * All keys are optional — props passed directly to <MarkdownDocs> take
 * precedence over values defined here.
 *
 * @type {import('./src/vite-env').GregConfig}
 */
export default {
    /** URL prefix of the docs folder. */
    rootPath: '/docs',

    /** Version badge shown in the header (empty string = hidden). */
    // version: '1.0.0',

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
     *     { text: 'Guide',     link: '/docs/guide' },
     *     { text: 'Reference', link: '/docs/reference' },
     *     {
     *       text: 'More',
     *       items: [
     *         { text: 'Changelog', link: '/docs/changelog' },
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
        { text: 'Guide', link: '/docs/guide' },
        { text: 'Reference', link: '/docs/reference' },
        {
            text: 'More',
            items: [
                { text: 'VitePress incompatibilities', link: '/docs/incompatibilities' },
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
     */
    search: {
        provider: 'server',
        // Use '/api/search' when your reverse proxy forwards this path
        // to greg search-server (recommended for production).
        // Use full URL only when the search server is on a different origin:
        // serverUrl: 'http://127.0.0.1:3100/api/search',
        serverUrl: '/api/search',
    },
};
