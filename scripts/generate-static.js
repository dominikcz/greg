/**
 * scripts/generate-static.js
 *
 * Post-build step: copies dist/index.html to dist/{route}/index.html for every
 * known docs route, so the site works on static hosts without rewrite rules.
 *
 * Usage: node scripts/generate-static.js
 * (Called automatically via the "postbuild" npm script.)
 */

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
    const out = { docsDir: 'docs', srcDir: '/docs', distDir: 'dist' };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--docsDir' && argv[i + 1]) out.docsDir = argv[++i];
        if (a === '--srcDir' && argv[i + 1]) out.srcDir = argv[++i];
        if (a === '--distDir' && argv[i + 1]) out.distDir = argv[++i];
    }
    return out;
}

const { docsDir, srcDir, distDir } = parseArgs(process.argv.slice(2));
const DIST = path.resolve(distDir);
const DOCS = path.resolve(docsDir);
const ROOT_PATH = srcDir;

// ── Collect routes from the docs/ folder ────────────────────────────────────

function collectRoutes(dir, base) {
    const routes = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('__')) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            routes.push(...collectRoutes(full, `${base}/${entry.name}`));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            if (entry.name === 'index.md') {
                // /docs/guide/index.md  →  /docs/guide
                routes.push(base);
            } else {
                // /docs/guide/routing.md  →  /docs/guide/routing
                routes.push(`${base}/${entry.name.replace(/\.md$/, '')}`);
            }
        }
    }
    return routes;
}

const routes = [...new Set([
    ROOT_PATH,                          // /docs  (root index)
    ...collectRoutes(DOCS, ROOT_PATH),
])];

// ── Copy index.html to each route ───────────────────────────────────────────

const src = path.join(DIST, 'index.html');
if (!fs.existsSync(src)) {
    console.error('dist/index.html not found – run npm run build first.');
    process.exit(1);
}

let count = 0;
for (const route of routes) {
    const outDir = path.join(DIST, route);
    const outFile = path.join(outDir, 'index.html');

    // Skip if it's the actual dist root (already exists as dist/index.html)
    if (path.resolve(outDir) === DIST) continue;

    fs.mkdirSync(outDir, { recursive: true });
    fs.copyFileSync(src, outFile);
    count++;
    console.log(`  ✓  ${route}/index.html`);
}

console.log(`\nStatic export: ${count} routes written to dist/`);
