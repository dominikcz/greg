// Fixture project for the `greg pdf` end-to-end test (cli.e2e.test.js).
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { vitePluginGregConfig } from '../../../../MarkdownDocs/vitePluginGregConfig.js';
import { vitePluginFrontmatter } from '../../../../MarkdownDocs/vitePluginFrontmatter.js';
import { vitePluginCopyDocs } from '../../../../MarkdownDocs/vitePluginCopyDocs.js';

export default defineConfig({
    logLevel: 'warn',
    plugins: [
        svelte({ compilerOptions: { css: 'injected' } }),
        vitePluginGregConfig(),
        vitePluginFrontmatter({ docsDir: 'docs', srcDir: '' }),
        vitePluginCopyDocs({ docsDir: 'docs', srcDir: '' }),
    ],
});
