// Fixture project for the `greg pdf` end-to-end test (cli.e2e.test.js).
export default {
    base: '/',
    outDir: 'dist',
    srcDir: 'docs',
    docsBase: '',
    mainTitle: 'Fixture Docs',
    search: { provider: 'none' },
    numbering: { depth: 2 },
    locales: {
        '/': {
            lang: 'en-US',
            label: 'English',
            themeConfig: {
                sidebar: [
                    {
                        text: 'Guide',
                        items: [
                            { text: 'Introduction', link: '/guide/intro' },
                            { text: 'Setup', link: '/guide/setup' },
                            { text: 'Wide tables', link: '/guide/wide' },
                        ],
                    },
                    { text: 'Revision history', link: '/history' },
                    { text: 'Site only', link: '/site-only' },
                ],
            },
        },
        '/pl/': {
            lang: 'pl-PL',
            label: 'Polski',
            themeConfig: {
                sidebar: [{ text: 'Wstęp', link: '/pl/guide/intro' }],
            },
        },
    },
    pdf: {
        books: {
            manual: {
                title: 'Fixture Manual',
                subtitle: 'Acme Cloud',
                version: '2.1',
                date: '2026-01-31',
                content: [{ sidebar: true, groups: 'flatten' }],
                cover: '__pdf/cover.md',
                backCover: '__pdf/back.md',
                toc: { title: 'Contents', depth: 2 },
                page: {
                    size: 'A4',
                    margin: '20mm 15mm 18mm 25mm',
                    mirrorMargins: true,
                    header: { left: '{subtitle}', right: '{chapter}' },
                    footer: { left: '{version}', right: '{page} / {pages}' },
                },
            },
            podrecznik: {
                title: 'Podręcznik',
                locale: '/pl/',
                content: 'sidebar',
            },
        },
    },
};
