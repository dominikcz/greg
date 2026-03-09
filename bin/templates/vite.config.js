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
const rootPath = process.env.GREG_ROOT_PATH || '{{ROOT_PATH}}'

export default defineConfig({
    plugins: [
        svelte(),
        vitePluginGregConfig(),
        vitePluginSearchIndex({ docsDir, rootPath }),
        vitePluginSearchServer({ docsDir, rootPath }),
        vitePluginFrontmatter({ docsDir, rootPath }),
        vitePluginCopyDocs({ docsDir, rootPath }),
    ],
})
