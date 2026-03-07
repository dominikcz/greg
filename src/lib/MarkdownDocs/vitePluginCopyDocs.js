/**
 * vitePluginCopyDocs
 *
 * Copies docs/**\/*.md (and optional extra static dirs) to the build output
 * directory as-is, so they can be fetched at runtime by the browser without
 * being compiled by mdsvex/rollup.
 *
 * This is the key enabler of the "runtime markdown" architecture: Vite only
 * compiles the app shell, and page content is fetched on demand.
 *
 * The `staticDirs` option (default: ['snippets']) lists additional project-root
 * directories whose files should also be served/copied verbatim.  This is
 * needed for `<<< @​/snippets/file.js` style snippet includes.
 */

import fs from 'node:fs';
import path from 'node:path';

export function vitePluginCopyDocs({ docsDir = 'docs', staticDirs = ['snippets'] } = {}) {
    let root = process.cwd();
    let outDir = 'dist';

    function* walkAll(dir) {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                yield* walkAll(full);
            } else if (entry.isFile()) {
                yield full;
            }
        }
    }

    function* walkMd(dir) {
        for (const full of walkAll(dir)) {
            if (full.endsWith('.md')) yield full;
        }
    }

    return {
        name: 'greg:copy-docs',

        configResolved(config) {
            root = config.root;
            outDir = path.resolve(config.root, config.build.outDir);
        },

        /**
         * In dev mode: serve .md files and staticDirs files as plain text.
         * Vite doesn't auto-serve project files outside public/ as raw assets.
         */
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const url = req.url?.split('?')[0] ?? '';

                // Docs markdown files
                if (url.startsWith('/' + docsDir + '/') && url.endsWith('.md')) {
                    const filePath = path.resolve(root, url.slice(1));
                    if (fs.existsSync(filePath)) {
                        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                        res.end(fs.readFileSync(filePath, 'utf8'));
                        return;
                    }
                }

                // Extra static dirs (snippets etc.)
                for (const dir of staticDirs) {
                    if (url.startsWith('/' + dir + '/') || url === '/' + dir) {
                        const filePath = path.resolve(root, url.slice(1));
                        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                            res.end(fs.readFileSync(filePath, 'utf8'));
                            return;
                        }
                    }
                }

                next();
            });
        },

        /** After bundle is written, copy .md files and staticDirs verbatim. */
        writeBundle() {
            let count = 0;

            // Copy markdown docs
            const docsRoot = path.resolve(root, docsDir);
            for (const srcFile of walkMd(docsRoot)) {
                const rel = path.relative(root, srcFile);
                const destFile = path.join(outDir, rel);
                fs.mkdirSync(path.dirname(destFile), { recursive: true });
                fs.copyFileSync(srcFile, destFile);
                count++;
            }

            // Copy extra static dirs
            for (const dir of staticDirs) {
                const dirRoot = path.resolve(root, dir);
                for (const srcFile of walkAll(dirRoot)) {
                    const rel = path.relative(root, srcFile);
                    const destFile = path.join(outDir, rel);
                    fs.mkdirSync(path.dirname(destFile), { recursive: true });
                    fs.copyFileSync(srcFile, destFile);
                    count++;
                }
            }

            console.log(`\x1b[32m✓\x1b[0m greg:copy-docs – ${count} files copied to ${path.relative(root, outDir)}/`);
        },
    };
}
