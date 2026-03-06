import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path';
import pkg from './package.json' with { type: 'json' };
import { vitePluginSearchIndex } from './src/lib/MarkdownDocs/vitePluginSearchIndex.js';
import { vitePluginFrontmatter } from './src/lib/MarkdownDocs/vitePluginFrontmatter.js';
import { vitePluginCopyDocs } from './src/lib/MarkdownDocs/vitePluginCopyDocs.js';
import { vitePluginGregConfig } from './src/lib/MarkdownDocs/vitePluginGregConfig.js';
import { vitePluginSearchServer } from './src/lib/MarkdownDocs/vitePluginSearchServer.js';

console.log('Version:', pkg.version);

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '$components': resolve('./src/lib/components'),
    },
  },
  plugins: [
    svelte(),
    vitePluginGregConfig(),
    vitePluginSearchIndex({ docsDir: 'docs', rootPath: '/docs' }),
    vitePluginSearchServer({ docsDir: 'docs', rootPath: '/docs' }),
    vitePluginFrontmatter({ docsDir: 'docs' }),
    vitePluginCopyDocs({ docsDir: 'docs' }),
  ],
  define: {
    __NAME__: `"${pkg.name}"`,
    __VERSION__: `"${pkg.version}"`,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    testTimeout: 30000,
  },
})



