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
 * needed for `<<< @”‹/snippets/file.js` style snippet includes.
 */

import fs from 'node:fs';
import path from 'node:path';

function trimSlashes(value) {
    return String(value || '').replace(/^\/+|\/+$/g, '');
}

export function vitePluginCopyDocs({ docsDir = 'docs', srcDir = '/docs', staticDirs = ['snippets'] } = {}) {
    let root = process.cwd();
    let outDir = 'dist';
    let viteBase = '/';

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

    function toPosix(value) {
        return String(value).replace(/\\/g, '/');
    }

    function resolveRootPrefix() {
        const cleaned = trimSlashes(srcDir);
        return cleaned ? '/' + cleaned : '';
    }

    return {
        name: 'greg:copy-docs',

        configResolved(config) {
            root = config.root;
            outDir = path.resolve(config.root, config.build.outDir);
            viteBase = config.base ?? '/';
        },

        /**
         * In dev mode: serve .md files and staticDirs files as plain text.
         * Vite doesn't auto-serve project files outside public/ as raw assets.
         */
        configureServer(server) {
            const rootPrefix = resolveRootPrefix();
            server.middlewares.use((req, res, next) => {
                const originalUrl = req.url ?? '';
                const [urlPath, query = ''] = originalUrl.split('?');
                const rawUrl = urlPath ?? '';

                // Let Vite handle module requests like `/docs/file.md?import`.
                if (query) {
                    next();
                    return;
                }

                // Strip the Vite base prefix (e.g. /greg/) from the URL.
                // configureServer middleware runs before Vite's own base-stripping
                // middleware, so req.url still contains the full base prefix.
                const base = viteBase === '/' ? '' : viteBase.replace(/\/$/, '');
                const url = (base && rawUrl.startsWith(base))
                    ? '/' + rawUrl.slice(base.length).replace(/^\/+/, '')
                    : rawUrl;

                // Docs markdown files
                const isDocsMarkdown = rootPrefix
                    ? (url === rootPrefix || url.startsWith(rootPrefix + '/')) && url.endsWith('.md')
                    : url.startsWith('/') && url.endsWith('.md');
                if (isDocsMarkdown) {
                    const rel = url.slice(rootPrefix.length).replace(/^\//, '');
                    for (const dir of (Array.isArray(docsDir) ? docsDir : [docsDir])) {
                        const filePath = path.resolve(root, dir, rel);
                        if (fs.existsSync(filePath)) {
                            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                            res.end(fs.readFileSync(filePath, 'utf8'));
                            return;
                        }
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
            const rootPrefix = trimSlashes(resolveRootPrefix());

            // Copy markdown docs from all source dirs
            for (const dir of (Array.isArray(docsDir) ? docsDir : [docsDir])) {
                const docsRoot = path.resolve(root, dir);
                for (const srcFile of walkMd(docsRoot)) {
                    const rel = toPosix(path.relative(docsRoot, srcFile));
                    const destFile = path.join(outDir, rootPrefix, rel);
                    fs.mkdirSync(path.dirname(destFile), { recursive: true });
                    fs.copyFileSync(srcFile, destFile);
                    count++;
                }
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
