/**
 * vitePluginGregConfig
 *
 * Reads the project-root `greg.config.js` file and exposes its default export
 * as the `virtual:greg-config` virtual module.
 *
 * When the file is absent the module resolves to `export default {}`.
 *
 * Supported config keys (all optional):
 *   srcDir       string           – physical docs source directory, relative to project root (default: 'docs')
 *   srcExclude   string[]         – glob patterns to exclude from docs source (VitePress-compatible, default: [])
 *   docsBase     string           – URL prefix for the docs section, e.g. 'docs' → URLs like /docs/guide (default: 'docs')
 *   version      string           – version badge text
 *   mainTitle    string           – site title shown in the header
 *   outline      OutlineOption    – global outline setting (VitePress-compatible)
 *   mermaidTheme string           – default mermaid theme key
 *   carbonAds    { code, placement } | null
 *   breadcrumb   boolean          – show breadcrumb above content
 *   backToTop    boolean          – show Back To Top button
 *   lastModified boolean          – show last-modified date below content
 *   locales      Record<string, LocaleConfig> – VitePress-style locale map
 *   sidebar      'auto' | SidebarItem[]
 *
 * HMR: changing greg.config.* triggers a full page reload.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGregConfig, resolveMainGregConfigPath } from './loadGregConfig.js';
import {
    DEFAULT_OUTPUT_BASE_DIR,
    DEFAULT_SITE_BASE,
    normalizeBasePath,
} from './versioningDefaults.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Absolute path to greg's own components directory (inside the package). */
const GREG_COMPONENTS_DIR = path.resolve(__dirname, '../components');

const VIRTUAL_ID = 'virtual:greg-config';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

export function vitePluginGregConfig() {
    let root = process.cwd();
    let mainConfigPath = resolveMainGregConfigPath(root);

    function isWatchedConfig(file) {
        return file === mainConfigPath;
    }

    return {
        name: 'greg:config',

        async config() {
            const viteConfig = {
                resolve: {
                    alias: {
                        '$components': GREG_COMPONENTS_DIR,
                    },
                },
                optimizeDeps: {
                    exclude: ['@dominikcz/greg'],
                    include: [
                        '@dominikcz/greg > unified',
                        '@dominikcz/greg > extend',
                        'extend',
                        '@dominikcz/greg > debug',
                        'debug',
                        '@dominikcz/greg > remark-parse',
                        '@dominikcz/greg > remark-gfm',
                        '@dominikcz/greg > remark-rehype',
                        '@dominikcz/greg > rehype-stringify',
                        '@dominikcz/greg > rehype-slug',
                        '@dominikcz/greg > rehype-autolink-headings',
                        '@dominikcz/greg > unist-util-visit',
                        '@dominikcz/greg > fuse.js',
                        '@dominikcz/greg > mermaid',
                    ],
                },
            };

            try {
                const resolved = await loadGregConfig(root);
                const hasBase = Object.prototype.hasOwnProperty.call(resolved, 'base');
                const hasOutDir = Object.prototype.hasOwnProperty.call(resolved, 'outDir');
                if (hasBase) {
                    viteConfig.base = normalizeBasePath(resolved.base, DEFAULT_SITE_BASE);
                }
                const outDirOverride = process.env.GREG_OUT_DIR;
                if (outDirOverride) {
                    viteConfig.build = { outDir: outDirOverride };
                } else if (hasOutDir) {
                    const outDir = String(resolved.outDir || DEFAULT_OUTPUT_BASE_DIR).trim() || DEFAULT_OUTPUT_BASE_DIR;
                    viteConfig.build = { outDir };
                }
            } catch {
                // Ignore config parse issues here; runtime virtual module load will report details.
            }

            return viteConfig;
        },

        configResolved(config) {
            root = config.root;
            mainConfigPath = resolveMainGregConfigPath(root);
        },

        resolveId(id) {
            if (id === VIRTUAL_ID) return RESOLVED_ID;
        },

        async load(id) {
            if (id !== RESOLVED_ID) return;
            if (!mainConfigPath) return `export default {};`;
            try {
                const config = await loadGregConfig(root);
                return `export default ${JSON.stringify(config)};`;
            } catch (e) {
                console.warn('[greg] Failed to load config:', e.message);
                return `export default {};`;
            }
        },

        handleHotUpdate({ file, server }) {
            mainConfigPath = resolveMainGregConfigPath(root);
            if (isWatchedConfig(file)) {
                const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
                if (mod) {
                    server.moduleGraph.invalidateModule(mod);
                    server.hot.send({ type: 'full-reload' });
                }
            }
        },
    };
}
