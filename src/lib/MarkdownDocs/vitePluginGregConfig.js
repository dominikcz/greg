/**
 * vitePluginGregConfig
 *
 * Reads the project-root `greg.config.js` file and exposes its default export
 * as the `virtual:greg-config` virtual module.
 *
 * When the file is absent the module resolves to `export default {}`.
 *
 * Supported config keys (all optional):
 *   rootPath     string           – docs root URL prefix, e.g. '/docs'
 *   version      string           – version badge text
 *   mainTitle    string           – site title shown in the header
 *   outline      OutlineOption    – global outline setting (VitePress-compatible)
 *   mermaidTheme string           – default mermaid theme key
 *   carbonAds    { code, placement } | null
 *   breadcrumb   boolean          – show breadcrumb above content
 *   backToTop    boolean          – show Back To Top button
 *   lastModified boolean          – show last-modified date below content
 *   sidebar      'auto' | SidebarItem[]
 *
 * HMR: changing greg.config.js triggers a full page reload.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const VIRTUAL_ID = 'virtual:greg-config';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

export function vitePluginGregConfig() {
    let root = process.cwd();
    let configPath = path.join(root, 'greg.config.js');

    return {
        name: 'greg:config',

        configResolved(config) {
            root = config.root;
            configPath = path.join(root, 'greg.config.js');
        },

        resolveId(id) {
            if (id === VIRTUAL_ID) return RESOLVED_ID;
        },

        async load(id) {
            if (id !== RESOLVED_ID) return;
            if (!fs.existsSync(configPath)) return `export default {};`;
            try {
                // Append timestamp to bust Node's ESM module cache on each HMR reload.
                const fileUrl = pathToFileURL(configPath).href + '?t=' + Date.now();
                const mod = await import(fileUrl);
                const config = mod.default ?? {};
                return `export default ${JSON.stringify(config)};`;
            } catch (e) {
                console.warn('[greg] Failed to load greg.config.js:', e.message);
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
