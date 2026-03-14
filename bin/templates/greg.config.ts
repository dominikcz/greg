import type { GregConfig } from '@dominikcz/greg'

export default {
    base: '/',
    outDir: 'dist',
    srcDir: '{{DOCS_DIR}}',
    mainTitle: '{{TITLE}}',
    // useDynamicPageTitle: true,
    sidebar: 'auto',
    // search: {
    //     provider: 'local',
    //     // fuzzy: { threshold: 0.35, minMatchCharLength: 2 },
    // },
} satisfies GregConfig
