/**
 * vitePluginFrontmatter
 *
 * Scans all markdown files under `docsDir` at build/dev time, extracts their
 * YAML frontmatter and exposes the result as a virtual module:
 *
 *   import frontmatters from 'virtual:greg-frontmatter';
 *   // → Record<string, { title?: string; order?: number; layout?: string; ... }>
 *   // keys are Vite-style absolute paths, e.g. '/docs/guide/index.md'
 *
 * HMR: when a .md file changes its virtual module is invalidated so the dev
 * server reloads navigation/layout info without a full page reload.
 */

import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'node:fs/promises';

const VIRTUAL_ID = 'virtual:greg-frontmatter';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

// ---------------------------------------------------------------------------
// Minimal YAML scalar parser – handles the subset used in VitePress frontmatter
// ---------------------------------------------------------------------------
function parseYamlScalar(raw) {
    const s = raw.trim();
    if (!s) return undefined;
    // quoted strings
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        return s.slice(1, -1);
    }
    // booleans
    if (s === 'true') return true;
    if (s === 'false') return false;
    // numbers
    const n = Number(s);
    if (!Number.isNaN(n) && s !== '') return n;
    return s;
}

/**
 * Parse the YAML frontmatter block (`--- ... ---`) of a markdown file.
 * Returns a plain object with scalar key/value pairs.
 */
function parseFrontmatter(content) {
    const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return {};
    const block = m[1];
    const result = {};
    for (const line of block.split(/\r?\n/)) {
        const colon = line.indexOf(':');
        if (colon === -1 || line.trimStart().startsWith('#')) continue;
        const key = line.slice(0, colon).trim();
        const value = parseYamlScalar(line.slice(colon + 1));
        if (key) result[key] = value;
    }
    return result;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------
export function vitePluginFrontmatter({ docsDir = 'docs' } = {}) {
    let root = process.cwd();

    /** Collect all .md paths and return the virtual module source. */
    function buildModule() {
        const absDocsDir = path.resolve(root, docsDir);
        const entries = {};

        // Walk the directory synchronously (fast, happens only on cold start / hmr)
        function walk(dir) {
            let items;
            try { items = fs.readdirSync(dir, { withFileTypes: true }); }
            catch { return; }
            for (const item of items) {
                const full = path.join(dir, item.name);
                if (item.isDirectory()) {
                    walk(full);
                } else if (item.isFile() && item.name.endsWith('.md') && !item.name.startsWith('__')) {
                    const rel = path.relative(root, full).replace(/\\/g, '/');
                    const viteKey = '/' + rel; // e.g. /docs/guide/index.md
                    try {
                        const content = fs.readFileSync(full, 'utf8');
                        entries[viteKey] = parseFrontmatter(content);
                    } catch { /* skip unreadable files */ }
                }
            }
        }

        walk(absDocsDir);
        return `export default ${JSON.stringify(entries)};`;
    }

    return {
        name: 'greg:frontmatter',

        configResolved(config) {
            root = config.root;
        },

        resolveId(id) {
            if (id === VIRTUAL_ID) return RESOLVED_ID;
        },

        load(id) {
            if (id === RESOLVED_ID) return buildModule();
        },

        handleHotUpdate({ file, server }) {
            if (file.endsWith('.md')) {
                const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
                if (mod) {
                    server.moduleGraph.invalidateModule(mod);
                    server.hot.send({ type: 'full-reload' });
                }
            }
        },
    };
}
