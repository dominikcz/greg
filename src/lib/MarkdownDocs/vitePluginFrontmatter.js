/**
 * vitePluginFrontmatter
 *
 * Scans all markdown files under `docsDir` at build/dev time, extracts their
 * YAML frontmatter using js-yaml and exposes the result as a virtual module:
 *
 *   import frontmatters from 'virtual:greg-frontmatter';
 *   // → Record<string, { title?, order?, layout?, hero?, features?, ... }>
 *   // keys are route-prefixed paths, e.g. '/docs/guide/index.md'
 *
 * HMR: when a .md file changes its virtual module is invalidated so the dev
 * server reloads navigation/layout info without a full page reload.
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const VIRTUAL_ID = 'virtual:greg-frontmatter';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

/** Extract the YAML block between the first pair of `---` lines. */
function parseFrontmatter(content) {
    const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return {};
    try {
        const parsed = yaml.load(m[1]);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed
            : {};
    } catch {
        return {};
    }
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------
export function vitePluginFrontmatter({ docsDir = 'docs', srcDir = '/docs' } = {}) {
    let root = process.cwd();

    function normalizeSrcDir(value) {
        const cleaned = String(value ?? '').replace(/^\/+|\/+$/g, '');
        return cleaned ? `/${cleaned}` : '/';
    }

    /** Collect all .md paths and return the virtual module source. */
    function buildModule() {
        const absDirs = (Array.isArray(docsDir) ? docsDir : [docsDir]).map(d => path.resolve(root, d));
        const normalizedSrcDir = normalizeSrcDir(srcDir);
        const entries = {};

        function walk(dir, baseDir) {
            let items;
            try { items = fs.readdirSync(dir, { withFileTypes: true }); }
            catch { return; }
            for (const item of items) {
                const full = path.join(dir, item.name);
                if (item.isDirectory()) {
                    walk(full, baseDir);
                } else if (item.isFile() && item.name.endsWith('.md') && !item.name.startsWith('__')) {
                    const rel = path.relative(baseDir, full).replace(/\\/g, '/');
                    const viteKey = normalizedSrcDir === '/'
                        ? `/${rel}`
                        : `${normalizedSrcDir}/${rel}`; // e.g. /docs/guide/index.md
                    try {
                        const content = fs.readFileSync(full, 'utf8');
                        const stat = fs.statSync(full);
                        entries[viteKey] = {
                            ...parseFrontmatter(content),
                            _mtime: stat.mtime.toISOString(),
                        };
                    } catch { /* skip unreadable files */ }
                }
            }
        }

        for (const absDocsDir of absDirs) {
            walk(absDocsDir, absDocsDir);
        }
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
