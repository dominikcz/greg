/**
 * vitePluginCopyDocs
 *
 * Copies docs/**\/*.md to the build output directory as-is, so they can be
 * fetched at runtime by the browser without being compiled by mdsvex/rollup.
 *
 * This is the key enabler of the "runtime markdown" architecture: Vite only
 * compiles the app shell, and page content is fetched on demand.
 */

import fs from 'node:fs';
import path from 'node:path';

export function vitePluginCopyDocs({ docsDir = 'docs' } = {}) {
    let root = process.cwd();
    let outDir = 'dist';

    function* walkMd(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                yield* walkMd(full);
            } else if (entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('__')) {
                yield full;
            }
        }
    }

    return {
        name: 'greg:copy-docs',

        configResolved(config) {
            root   = config.root;
            outDir = path.resolve(config.root, config.build.outDir);
        },

        /**
         * In dev mode: serve .md files as plain text directly from the filesystem.
         * Vite doesn't auto-serve project files outside public/ as raw assets.
         */
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const url = req.url?.split('?')[0] ?? '';
                if (url.startsWith('/' + docsDir + '/') && url.endsWith('.md')) {
                    const filePath = path.resolve(root, url.slice(1));
                    if (fs.existsSync(filePath)) {
                        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                        res.end(fs.readFileSync(filePath, 'utf8'));
                        return;
                    }
                }
                next();
            });
        },

        /** After bundle is written, copy .md files verbatim. */
        writeBundle() {
            const docsRoot = path.resolve(root, docsDir);
            if (!fs.existsSync(docsRoot)) return;

            let count = 0;
            for (const srcFile of walkMd(docsRoot)) {
                const rel     = path.relative(root, srcFile);          // e.g. docs/guide/routing.md
                const destFile = path.join(outDir, rel);
                fs.mkdirSync(path.dirname(destFile), { recursive: true });
                fs.copyFileSync(srcFile, destFile);
                count++;
            }
            console.log(`\x1b[32m✓\x1b[0m greg:copy-docs – ${count} markdown files copied to ${path.relative(root, outDir)}/`);
        },
    };
}
