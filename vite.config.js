import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import pkg from './package.json' with { type: 'json' };
import { vitePluginSearchIndex } from './src/lib/MarkdownDocs/vitePluginSearchIndex.js';
import { vitePluginFrontmatter } from './src/lib/MarkdownDocs/vitePluginFrontmatter.js';
import { vitePluginCopyDocs } from './src/lib/MarkdownDocs/vitePluginCopyDocs.js';
import { vitePluginGregConfig } from './src/lib/MarkdownDocs/vitePluginGregConfig.js';
import { vitePluginSearchServer } from './src/lib/MarkdownDocs/vitePluginSearchServer.js';
import {
  DEFAULT_OUTPUT_BASE_DIR,
  DEFAULT_SITE_BASE,
  normalizeBasePath,
} from './src/lib/MarkdownDocs/versioningDefaults.js';

console.log('Version:', pkg.version);

const docsDir = process.env.GREG_DOCS_DIR || 'docs';
const rootPath = process.env.GREG_ROOT_PATH || '/docs';

function resolveGregConfigPath() {
  const tsPath = resolve('./greg.config.ts');
  const jsPath = resolve('./greg.config.js');
  if (fs.existsSync(tsPath)) return tsPath;
  if (fs.existsSync(jsPath)) return jsPath;
  return null;
}

async function loadTsConfig(configPath) {
  const { transform } = await import('esbuild');
  const source = fs.readFileSync(configPath, 'utf8');
  const { code } = await transform(source, {
    format: 'esm',
    loader: 'ts',
    target: 'node18',
  });
  const dataUrl = 'data:text/javascript,' + encodeURIComponent(code);
  const mod = await import(dataUrl);
  return mod.default ?? {};
}

async function loadGregConfig() {
  const configPath = resolveGregConfigPath();
  if (!configPath) return {};
  if (configPath.endsWith('.ts')) return loadTsConfig(configPath);
  const fileUrl = pathToFileURL(configPath).href + '?t=' + Date.now();
  const mod = await import(fileUrl);
  return mod.default ?? {};
}

const gregConfig = await loadGregConfig();
const base = normalizeBasePath(gregConfig.base, DEFAULT_SITE_BASE);
const outDir = String(gregConfig.outDir || DEFAULT_OUTPUT_BASE_DIR).trim() || DEFAULT_OUTPUT_BASE_DIR;
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
    vitePluginSearchIndex({ docsDir, rootPath }),
    vitePluginSearchServer({
      docsDir,
      rootPath,
      fuzzy: searchConfig.fuzzy,
    }),
    vitePluginFrontmatter({ docsDir, rootPath }),
    vitePluginCopyDocs({ docsDir, rootPath }),
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



