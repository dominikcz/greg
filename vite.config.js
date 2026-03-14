import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path';
import pkg from './package.json' with { type: 'json' };
import { vitePluginSearchIndex } from './src/lib/MarkdownDocs/vitePluginSearchIndex.js';
import { vitePluginFrontmatter } from './src/lib/MarkdownDocs/vitePluginFrontmatter.js';
import { vitePluginCopyDocs } from './src/lib/MarkdownDocs/vitePluginCopyDocs.js';
import { vitePluginGregConfig } from './src/lib/MarkdownDocs/vitePluginGregConfig.js';
import { vitePluginSearchServer } from './src/lib/MarkdownDocs/vitePluginSearchServer.js';
import { vitePluginAiServer } from './src/lib/MarkdownDocs/vitePluginAiServer.js';
import { loadGregConfig } from './src/lib/MarkdownDocs/loadGregConfig.js';
import {
  DEFAULT_OUTPUT_BASE_DIR,
  DEFAULT_SITE_BASE,
  normalizeBasePath,
} from './src/lib/MarkdownDocs/versioningDefaults.js';

console.log('Version:', pkg.version);

const gregConfig = await loadGregConfig();
const base = normalizeBasePath(gregConfig.base, DEFAULT_SITE_BASE);
const outDir = process.env.GREG_OUT_DIR || String(gregConfig.outDir || DEFAULT_OUTPUT_BASE_DIR).trim() || DEFAULT_OUTPUT_BASE_DIR;
const srcDir = process.env.GREG_DOCS_DIR ?? gregConfig.srcDir ?? 'docs';
const docsBaseValue = process.env.GREG_DOCS_BASE !== undefined
  ? process.env.GREG_DOCS_BASE
  : (Object.prototype.hasOwnProperty.call(gregConfig, 'docsBase')
      ? gregConfig.docsBase
  : '');
const docsBase = '/' + String(docsBaseValue ?? '').replace(/^\/+|\/+$/g, '');
const searchConfig = gregConfig.search ?? {};

// https://vite.dev/config/
export default defineConfig({
  base,
  build: {
    outDir,
  },
  resolve: {
    alias: {
      '$components': resolve('./src/lib/components'),
    },
  },
  plugins: [
    svelte(),
    vitePluginGregConfig(),
    vitePluginSearchIndex({ docsDir: srcDir, srcDir: docsBase }),
    vitePluginSearchServer({
      docsDir: srcDir,
      srcDir: docsBase,
      fuzzy: searchConfig.fuzzy,
    }),
    vitePluginFrontmatter({ docsDir: srcDir, srcDir: docsBase }),
    vitePluginCopyDocs({ docsDir: srcDir, srcDir: docsBase }),
    vitePluginAiServer({ docsDir: srcDir, srcDir: docsBase, ai: searchConfig.ai }),
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



