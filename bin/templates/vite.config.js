import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import {
    vitePluginGregConfig,
    vitePluginSearchIndex,
    vitePluginSearchServer,
    vitePluginFrontmatter,
    vitePluginCopyDocs,
} from '@dominikcz/greg/plugins'

export default defineConfig({
    plugins: [
        svelte(),
        vitePluginGregConfig(),
        vitePluginSearchIndex({ docsDir: '{{DOCS_DIR}}', rootPath: '{{ROOT_PATH}}' }),
        vitePluginSearchServer({ docsDir: '{{DOCS_DIR}}', rootPath: '{{ROOT_PATH}}' }),
        vitePluginFrontmatter({ docsDir: '{{DOCS_DIR}}' }),
        vitePluginCopyDocs({ docsDir: '{{DOCS_DIR}}' }),
    ],
})
