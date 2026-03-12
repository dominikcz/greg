/**
 * vitePluginSearchServer
 *
 * Vite plugin that exposes a GET /api/search?q=&limit= search endpoint
 * in both dev (`configureServer`) and preview (`configurePreviewServer`) modes.
 *
 * The search index is built on first request and cached in memory via the
 * shared `buildSearchIndex` from searchIndexBuilder.js.
 * Both this plugin and vitePluginSearchIndex share the same cache, so the
 * docs are only scanned once per process start (or after a file change).
 *
 * For production deployments, use the standalone `searchServer.js` instead
 * (invoked via `greg search-server`).
 *
 * @param {object} options
 * @param {string} [options.docsDir='docs']        - docs directory (relative to project root)
 * @param {string} [options.srcDir='/docs']      - SPA route prefix
 * @param {string} [options.searchUrl='/api/search'] - URL path for the search endpoint
 */

import path from 'node:path';
import Fuse from 'fuse.js';
import { buildSearchIndex, buildFuseResult, invalidateSearchIndexCache } from './searchIndexBuilder.js';

const FUSE_OPTIONS = {
	includeScore: true,
	includeMatches: true,
	threshold: 0.4,
	ignoreLocation: true,
	minMatchCharLength: 2,
	keys: [
		{ name: 'title', weight: 3 },
		{ name: 'sections.heading', weight: 2 },
		{ name: 'sections.content', weight: 1 },
	],
};

export function vitePluginSearchServer({
	docsDir = 'docs',
	srcDir = '/docs',
	searchUrl = '/api/search',
	fuzzy = {},
} = {}) {
	let resolvedDocsDir;
	let viteBase = '/';
	const fuzzyConfig = /** @type {{ threshold?: number; minMatchCharLength?: number; ignoreLocation?: boolean }} */ (fuzzy);
	const threshold = Number.isFinite(Number(fuzzyConfig.threshold))
		? Number(fuzzyConfig.threshold)
		: 0.35;
	const minMatchCharLength = Number.isFinite(Number(fuzzyConfig.minMatchCharLength))
		? Math.max(1, Number(fuzzyConfig.minMatchCharLength))
		: 3;
	const ignoreLocation = fuzzyConfig.ignoreLocation !== false;
	const fuseOptions = {
		includeScore: true,
		includeMatches: true,
		threshold,
		ignoreLocation,
		minMatchCharLength,
		keys: FUSE_OPTIONS.keys,
	};

	// Fuse instance, lazily built and cached between requests.
	// Cleared whenever a .md file changes.
	/** @type {Fuse<any> | null} */
	let fuseCache = null;
	/** @type {Promise<Fuse<any>> | null} */
	let buildPromise = null;

	async function loadFuse() {
		if (fuseCache) return fuseCache;
		if (!buildPromise) {
			buildPromise = buildSearchIndex(resolvedDocsDir, srcDir).then(index => {
				fuseCache = new Fuse(index, fuseOptions);
				return fuseCache;
			}).catch(err => {
				buildPromise = null; // allow retry
				throw err;
			});
		}
		return buildPromise;
	}

	function invalidate() {
		fuseCache = null;
		buildPromise = null;
		invalidateSearchIndexCache();
	}

	function normalizePath(value) {
		const raw = String(value ?? '').trim();
		if (!raw || raw === '/') return '/';
		return '/' + raw.replace(/^\/+|\/+$/g, '');
	}

	function isPathInLocale(id, localeRoot, baseRoot, localeRoots) {
		const currentRoot = normalizePath(localeRoot);
		const normalizedBase = normalizePath(baseRoot);
		const normalizedId = normalizePath(id);
		const roots = (localeRoots ?? []).map(normalizePath);

		const inCurrentRoot = currentRoot === '/'
			? normalizedId.startsWith('/')
			: (normalizedId === currentRoot || normalizedId.startsWith(currentRoot + '/'));

		if (!inCurrentRoot) {
			return false;
		}

		if (currentRoot === normalizedBase) {
			const otherRoots = roots.filter((rp) => rp !== currentRoot);
			if (otherRoots.some((rp) => normalizedId === rp || normalizedId.startsWith(rp + '/'))) {
				return false;
			}
		}

		return true;
	}

	/** Connect-compatible middleware factory */
	function middleware() {
		return async (req, res, next) => {
			const urlStr = req.url ?? '';
			const qIdx = urlStr.indexOf('?');
			const rawPathname = qIdx >= 0 ? urlStr.slice(0, qIdx) : urlStr;
			// Strip the Vite base prefix — configureServer runs before Vite's
			// own base-stripping middleware, so req.url still has the full prefix.
			const base = viteBase === '/' ? '' : viteBase.replace(/\/$/, '');
			const pathname = (base && rawPathname.startsWith(base))
				? '/' + rawPathname.slice(base.length).replace(/^\/+/, '')
				: rawPathname;
			if (pathname !== searchUrl || req.method !== 'GET') return next();

			const params = new URLSearchParams(qIdx >= 0 ? urlStr.slice(qIdx + 1) : '');
			const q = (params.get('q') ?? '').trim();
			// Cap limit to protect server from expensive searches
			const limit = Math.min(Math.max(parseInt(params.get('limit') ?? '10', 10) || 10, 1), 50);
			const localeRoot = params.get('localeRoot');
			const baseRoot = params.get('baseRoot');
			const localeRoots = (params.get('localeRoots') ?? '')
				.split(',')
				.map(v => v.trim())
				.filter(Boolean);

			try {
				const fuse = await loadFuse();
				let results = q ? fuse.search(q, { limit }).map(buildFuseResult) : [];
				if (localeRoot && baseRoot) {
					results = results.filter((result) =>
						isPathInLocale(result.id, localeRoot, baseRoot, localeRoots),
					);
				}
				const body = JSON.stringify({ query: q, results });
				res.writeHead(200, {
					'Content-Type': 'application/json; charset=utf-8',
					'Cache-Control': 'no-cache',
					'Content-Length': Buffer.byteLength(body),
				});
				res.end(body);
			} catch (err) {
				console.error('[greg:search-server]', err.message);
				const body = JSON.stringify({ query: q, results: [] });
				res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
				res.end(body);
			}
		};
	}

	return {
		name: 'greg:search-server',

		configResolved(config) {
			const dirs = Array.isArray(docsDir) ? docsDir : [docsDir];
			resolvedDocsDir = dirs.map(d => path.resolve(config.root, d));
			viteBase = config.base ?? '/';
		},

		configureServer(server) {
			server.middlewares.use(middleware());
			// Invalidate Fuse cache on any markdown file change so search stays fresh
			server.watcher.on('change', f => { if (f.endsWith('.md')) invalidate(); });
			server.watcher.on('add', f => { if (f.endsWith('.md')) invalidate(); });
			server.watcher.on('unlink', f => { if (f.endsWith('.md')) invalidate(); });
		},

		configurePreviewServer(server) {
			server.middlewares.use(middleware());
		},
	};
}
