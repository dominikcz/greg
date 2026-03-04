import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path';
import pkg from './package.json' with { type: 'json' };
import { vitePluginSearchIndex } from './src/lib/MarkdownDocs/vitePluginSearchIndex.js';
import { vitePluginFrontmatter } from './src/lib/MarkdownDocs/vitePluginFrontmatter.js';

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
    vitePluginSearchIndex({ docsDir: 'docs', rootPath: '/docs' }),
    vitePluginFrontmatter({ docsDir: 'docs' }),
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



