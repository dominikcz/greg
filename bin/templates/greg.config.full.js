/**
 * @type {import('@dominikcz/greg').GregConfig}
 */
export default {
    base: '/',
    outDir: 'dist',
    srcDir: '{{DOCS_DIR}}',
    docsBase: '',
    mainTitle: '{{TITLE}}',
    useDynamicPageTitle: true,
    sidebar: 'auto',
    outline: [2, 3],
    nav: [
        { text: 'Guide', link: '/guide' },
        { text: 'Reference', link: '/reference' },
    ],
    search: {
        provider: 'local',
        fuzzy: {
            threshold: 0.35,
            minMatchCharLength: 2,
        },
    },
    // versioning: {
    //     strategy: 'branches',
    //     default: 'latest',
    //     aliases: { latest: '1.0' },
    //     branches: [
    //         { version: '1.0', branch: 'main', title: '1.0' },
    //     ],
    // },
}
