/**
 * vitePluginCopyDocs
 *
 * Copies docs/** files (and optional extra static dirs) to the build output
 * directory as-is, so they can be fetched at runtime by the browser without
 * being compiled by mdsvex/rollup.
 *
 * This is the key enabler of the "runtime markdown" architecture: Vite only
 * compiles the app shell, and page content is fetched on demand.
 *
 * The `staticDirs` option (default: ['snippets']) lists additional project-root
 * directories whose files should also be served/copied verbatim.  This is
 * needed for snippet include syntax that references files from static dirs.
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

    function isTraversableDirectory(entry, fullPath) {
        if (entry.isDirectory()) return true;
        if (!entry.isSymbolicLink()) return false;
        try {
            return fs.statSync(fullPath).isDirectory();
        } catch {
            return false;
        }
    }

    function* walkAll(dir) {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (isTraversableDirectory(entry, full)) {
                yield* walkAll(full);
            } else if (entry.isFile()) {
                yield full;
            }
        }
    }

    function toPosix(value) {
        return String(value).replace(/\\/g, '/');
    }

    function getContentType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        switch (ext) {
        case '.md': return 'text/plain; charset=utf-8';
        case '.txt': return 'text/plain; charset=utf-8';
        case '.json': return 'application/json; charset=utf-8';
        case '.js': return 'text/javascript; charset=utf-8';
        case '.css': return 'text/css; charset=utf-8';
        case '.svg': return 'image/svg+xml';
        case '.png': return 'image/png';
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.webp': return 'image/webp';
        case '.gif': return 'image/gif';
        case '.pdf': return 'application/pdf';
        default: return 'application/octet-stream';
        }
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
         * In dev mode: serve docs files and staticDirs files.
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

                // Docs files (markdown + local assets like images/pdf)
                const isDocsPath = rootPrefix
                    ? (url === rootPrefix || url.startsWith(rootPrefix + '/'))
                    : url.startsWith('/');
                if (isDocsPath) {
                    let rel;
                    try { rel = decodeURIComponent(url.slice(rootPrefix.length).replace(/^\//, '')); }
                    catch { next(); return; }
                    for (const dir of (Array.isArray(docsDir) ? docsDir : [docsDir])) {
                        const filePath = path.resolve(root, dir, rel);
                        if (!filePath.startsWith(path.resolve(root, dir) + path.sep)) continue;
                        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                            res.setHeader('Content-Type', getContentType(filePath));
                            res.end(fs.readFileSync(filePath));
                            return;
                        }
                    }
                }

                // Extra static dirs (snippets etc.)
                for (const dir of staticDirs) {
                    if (url.startsWith('/' + dir + '/') || url === '/' + dir) {
                        let rel;
                        try { rel = decodeURIComponent(url.slice(1)); }
                        catch { next(); return; }
                        const filePath = path.resolve(root, rel);
                        if (!filePath.startsWith(path.resolve(root, dir) + path.sep)) continue;
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

        /** After bundle is written, copy docs files and staticDirs verbatim. */
        writeBundle() {
            let count = 0;
            const rootPrefix = trimSlashes(resolveRootPrefix());

            // Copy docs files from all source dirs
            for (const dir of (Array.isArray(docsDir) ? docsDir : [docsDir])) {
                const docsRoot = path.resolve(root, dir);
                for (const srcFile of walkAll(docsRoot)) {
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
