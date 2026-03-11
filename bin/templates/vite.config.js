import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import {
    vitePluginGregConfig,
    vitePluginSearchIndex,
    vitePluginSearchServer,
    vitePluginFrontmatter,
    vitePluginCopyDocs,
} from '@dominikcz/greg/plugins'

const docsDir = process.env.GREG_DOCS_DIR || '{{DOCS_DIR}}'
const docsBase = process.env.GREG_DOCS_BASE || '{{ROOT_PATH}}'

export default defineConfig({
    plugins: [
        svelte(),
        vitePluginGregConfig(),
        vitePluginSearchIndex({ docsDir, srcDir: docsBase }),
        vitePluginSearchServer({ docsDir, srcDir: docsBase }),
        vitePluginFrontmatter({ docsDir, srcDir: docsBase }),
        vitePluginCopyDocs({ docsDir, srcDir: docsBase }),
    ],
})
