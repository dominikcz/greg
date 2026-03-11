/**
 * vitePluginGregConfig
 *
 * Reads the project-root `greg.config.js` file and exposes its default export
 * as the `virtual:greg-config` virtual module.
 *
 * When the file is absent the module resolves to `export default {}`.
 *
 * Supported config keys (all optional):
 *   srcDir       string           â€“ physical docs source directory, relative to project root (default: 'docs')
 *   srcExclude   string[]         â€“ glob patterns to exclude from docs source (VitePress-compatible, default: [])
 *   docsBase     string           â€“ URL prefix for the docs section, e.g. 'docs' â†’ URLs like /docs/guide (default: 'docs')
 *   srcDir     string           â€“ @deprecated, use docsBase instead
 *   version      string           â€“ version badge text
 *   mainTitle    string           â€“ site title shown in the header
 *   outline      OutlineOption    â€“ global outline setting (VitePress-compatible)
 *   mermaidTheme string           â€“ default mermaid theme key
 *   carbonAds    { code, placement } | null
 *   breadcrumb   boolean          â€“ show breadcrumb above content
 *   backToTop    boolean          â€“ show Back To Top button
 *   lastModified boolean          â€“ show last-modified date below content
 *   locales      Record<string, LocaleConfig> â€“ VitePress-style locale map
 *   sidebar      'auto' | SidebarItem[]
 *
 * HMR: changing greg.config.js triggers a full page reload.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Absolute path to greg's own components directory (inside the package). */
const GREG_COMPONENTS_DIR = path.resolve(__dirname, '../components');

const VIRTUAL_ID = 'virtual:greg-config';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

/** Prefer greg.config.ts over greg.config.js when both exist. */
function findConfigPath(root) {
    const ts = path.join(root, 'greg.config.ts');
    const js = path.join(root, 'greg.config.js');
    return fs.existsSync(ts) ? ts : js;
}

/** Load a TypeScript config file via esbuild (always available as a Vite dep). */
async function loadTsConfig(configPath) {
    const { transform } = await import('esbuild');
    const source = fs.readFileSync(configPath, 'utf-8');
    const { code } = await transform(source, { format: 'esm', loader: 'ts', target: 'node18' });
    const dataUrl = 'data:text/javascript,' + encodeURIComponent(code);
    const mod = await import(dataUrl);
    return mod.default ?? {};
}

export function vitePluginGregConfig() {
    let root = process.cwd();
    let configPath = findConfigPath(root);

    return {
        name: 'greg:config',

        config() {
            return {
                resolve: {
                    alias: {
                        '$components': GREG_COMPONENTS_DIR,
                    },
                },
                optimizeDeps: {
                    exclude: ['@dominikcz/greg'],
                    include: [
                        '@dominikcz/greg > unified',
                        '@dominikcz/greg > remark-parse',
                        '@dominikcz/greg > remark-gfm',
                        '@dominikcz/greg > remark-rehype',
                        '@dominikcz/greg > rehype-stringify',
                        '@dominikcz/greg > rehype-slug',
                        '@dominikcz/greg > rehype-autolink-headings',
                        '@dominikcz/greg > unist-util-visit',
                        '@dominikcz/greg > shiki',
                        '@dominikcz/greg > fuse.js',
                        '@dominikcz/greg > mermaid',
                    ],
                },
            };
        },

        configResolved(config) {
            root = config.root;
            configPath = findConfigPath(root);
        },

        resolveId(id) {
            if (id === VIRTUAL_ID) return RESOLVED_ID;
        },

        async load(id) {
            if (id !== RESOLVED_ID) return;
            if (!fs.existsSync(configPath)) return `export default {};`;
            try {
                let config;
                if (configPath.endsWith('.ts')) {
                    config = await loadTsConfig(configPath);
                } else {
                    // Append timestamp to bust Node's ESM module cache on each HMR reload.
                    const fileUrl = pathToFileURL(configPath).href + '?t=' + Date.now();
                    const mod = await import(fileUrl);
                    config = mod.default ?? {};
                }
                return `export default ${JSON.stringify(config)};`;
            } catch (e) {
                console.warn('[greg] Failed to load config:', e.message);
                return `export default {};`;
            }
        },

        handleHotUpdate({ file, server }) {
            if (file === configPath) {
                const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
                if (mod) {
                    server.moduleGraph.invalidateModule(mod);
                    server.hot.send({ type: 'full-reload' });
                }
            }
        },
    };
}
