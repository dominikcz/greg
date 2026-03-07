import { join } from 'node:path';
import { buildSearchIndex, invalidateSearchIndexCache } from './searchIndexBuilder.js';

/**
 * Vite plugin: serves /search-index.json in dev and emits it as a build asset.
 *
 * The build is shared with vitePluginSearchServer via the module-level cache
 * in searchIndexBuilder.js — both plugins pay the I/O cost only once.
 *
 * @param {object} options
 * @param {string} [options.docsDir='docs']   - directory (relative to project root)
 * @param {string} [options.rootPath='/docs'] - SPA route prefix
 */
export function vitePluginSearchIndex({ docsDir = 'docs', rootPath = '/docs' } = {}) {
	let resolvedDocsDir;

	return {
		name: 'vite-plugin-search-index',

		configResolved(config) {
			resolvedDocsDir = join(config.root, docsDir);
		},

		// Dev-server: answer GET /search-index.json with the cached index
		configureServer(server) {
			// Invalidate cache when any markdown file changes
			server.watcher.on('change', f => { if (f.endsWith('.md')) invalidateSearchIndexCache(); });
			server.watcher.on('add', f => { if (f.endsWith('.md')) invalidateSearchIndexCache(); });
			server.watcher.on('unlink', f => { if (f.endsWith('.md')) invalidateSearchIndexCache(); });

			server.middlewares.use(async (req, res, next) => {
				if (req.url !== '/search-index.json' || req.method !== 'GET') return next();
				try {
					const index = await buildSearchIndex(resolvedDocsDir, rootPath);
					res.writeHead(200, {
						'Content-Type': 'application/json; charset=utf-8',
						'Cache-Control': 'no-cache',
					});
					res.end(JSON.stringify(index));
				} catch (err) {
					next(err);
				}
			});
		},

		// Production build: emit search-index.json as a static asset
		async generateBundle() {
			const index = await buildSearchIndex(resolvedDocsDir, rootPath);
			this.emitFile({
				type: 'asset',
				fileName: 'search-index.json',
				source: JSON.stringify(index),
			});
		},
	};
}
