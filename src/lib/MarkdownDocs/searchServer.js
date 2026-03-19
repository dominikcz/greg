#!/usr/bin/env node
/**
 * Greg standalone search server — for production deployments.
 *
 * Reads a pre-built search-index.json, loads it into Fuse.js, then serves
 * GET /api/search?q=<query>&limit=<n> as a lightweight HTTP endpoint.
 *
 * Usage:
 *   node src/lib/MarkdownDocs/searchServer.js [options]
 *   greg search-server                            (via CLI)
 *
 * Options (CLI flags or environment variables):
 *   --index  PATH          Path to search-index.json  (GREG_SEARCH_INDEX, default: dist/search-index.json)
 *   --port   NUMBER        HTTP port                  (GREG_SEARCH_PORT,  default: 3100)
 *   --host   HOSTNAME      Bind address               (GREG_SEARCH_HOST,  default: localhost)
 *   --url    PATH          Search endpoint URL path   (GREG_SEARCH_URL,   default: /api/search)
 *   --cors-origin VALUE    Access-Control-Allow-Origin (GREG_SEARCH_CORS_ORIGIN, default: *)
 *                          Use 'request' to mirror request Origin header.
 *   --cors-methods VALUE   Access-Control-Allow-Methods (GREG_SEARCH_CORS_METHODS, default: GET, OPTIONS)
 *   --cors-headers VALUE   Access-Control-Allow-Headers (GREG_SEARCH_CORS_HEADERS, default: Content-Type)
 *   --cors-max-age VALUE   Access-Control-Max-Age       (GREG_SEARCH_CORS_MAX_AGE, default: 86400)
 *
 * Example — run after `greg build`:
 *   greg search-server --index dist/search-index.json --port 3100
 *
 * Then point greg.config.js → search.serverUrl to http://localhost:3100/api/search
 * (or configure a reverse proxy so /api/search hits this server).
 */

import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { statSync } from 'node:fs';
import { buildFuseResult } from './searchIndexBuilder.js';
import { loadGregConfig } from './loadGregConfig.js';
import Fuse from 'fuse.js';

const startupT0 = process.hrtime.bigint();

function msSince(t0) {
	return Number(process.hrtime.bigint() - t0) / 1e6;
}

function fmtMs(ms) {
	return `${ms.toFixed(1)}ms`;
}

function parseBoolean(value, fallback = false) {
	if (value == null) return fallback;
	const normalized = String(value).trim().toLowerCase();
	if (!normalized) return fallback;
	if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
	if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
	return fallback;
}

function tokenizeQuery(value) {
	return String(value || '')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
		.split(/[\s-]+/)
		.map((part) => part.trim())
		.filter((part) => part.length >= 3);
}

// ── CLI argument parser ───────────────────────────────────────────────────────
function parseArgs(argv) {
	const args = {};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a.startsWith('--') && i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
			args[a.slice(2)] = argv[i + 1];
			i++;
		} else if (a.startsWith('--')) {
			args[a.slice(2)] = true;
		}
	}
	return args;
}

const args = parseArgs(process.argv.slice(2));
const gregConfig = await loadGregConfig();
const configuredFuzzy = gregConfig?.search?.fuzzy ?? {};
const configuredServer = gregConfig?.search?.server ?? {};
const port = parseInt(args.port ?? process.env.GREG_SEARCH_PORT ?? '3100', 10);
const host = String(args.host ?? process.env.GREG_SEARCH_HOST ?? 'localhost');
const url = String(args.url ?? process.env.GREG_SEARCH_URL ?? '/api/search');
const index = resolve(String(args.index ?? process.env.GREG_SEARCH_INDEX ?? 'dist/search-index.json'));
const shardsManifest = resolve(
	String(
		args['shards-manifest']
		?? process.env.GREG_SEARCH_SHARDS_MANIFEST
		?? resolve(dirname(index), 'search-index', 'manifest.json'),
	),
);
const corsOrigin = String(args['cors-origin'] ?? process.env.GREG_SEARCH_CORS_ORIGIN ?? '*');
const corsMethods = String(args['cors-methods'] ?? process.env.GREG_SEARCH_CORS_METHODS ?? 'GET, OPTIONS');
const corsHeaders = String(args['cors-headers'] ?? process.env.GREG_SEARCH_CORS_HEADERS ?? 'Content-Type');
const corsMaxAge = String(args['cors-max-age'] ?? process.env.GREG_SEARCH_CORS_MAX_AGE ?? '86400');
const thresholdRaw =
	args.threshold ?? process.env.GREG_SEARCH_THRESHOLD ?? configuredFuzzy.threshold;
const threshold = Number.isFinite(Number(thresholdRaw))
	? Number(thresholdRaw)
	: 0.35;
const minMatchRaw =
	args['min-match-chars'] ??
	process.env.GREG_SEARCH_MIN_MATCH_CHARS ??
	configuredFuzzy.minMatchCharLength;
const minMatchCharLength = Number.isFinite(Number(minMatchRaw))
	? Math.max(1, Number(minMatchRaw))
	: 3;
const ignoreLocationRaw =
	args['ignore-location'] ??
	process.env.GREG_SEARCH_IGNORE_LOCATION ??
	configuredFuzzy.ignoreLocation;
const ignoreLocation =
	String(ignoreLocationRaw ?? 'true').toLowerCase() !== 'false';
const preloadShards = parseBoolean(
	args['preload-shards'] ?? process.env.GREG_SEARCH_PRELOAD_SHARDS ?? configuredServer.preloadShards,
	true,
);
const maxLoadedShardsRaw = args['max-loaded-shards'] ?? process.env.GREG_SEARCH_MAX_LOADED_SHARDS ?? configuredServer.maxLoadedShards;
const configuredMaxLoadedShards = (() => {
	if (maxLoadedShardsRaw == null || String(maxLoadedShardsRaw).trim() === '') return null;
	const parsed = Number.parseInt(String(maxLoadedShardsRaw), 10);
	if (!Number.isFinite(parsed) || parsed < 1 || parsed > 512) return null;
	return parsed;
})();
const shardCandidatesRaw = args['shard-candidates'] ?? process.env.GREG_SEARCH_SHARD_CANDIDATES ?? configuredServer.shardCandidates;
const shardCandidates = (() => {
	const fallback = 6;
	if (shardCandidatesRaw == null || String(shardCandidatesRaw).trim() === '') return fallback;
	const parsed = Number.parseInt(String(shardCandidatesRaw), 10);
	if (!Number.isFinite(parsed) || parsed < 1 || parsed > 512) return fallback;
	return parsed;
})();

function getCorsHeaders(req) {
	const reflectedOrigin = req.headers.origin ? String(req.headers.origin) : '*';
	const allowOrigin = corsOrigin === 'request' ? reflectedOrigin : corsOrigin;
	return {
		'Access-Control-Allow-Origin': allowOrigin,
		'Access-Control-Allow-Methods': corsMethods,
		'Access-Control-Allow-Headers': corsHeaders,
		'Access-Control-Max-Age': corsMaxAge,
		...(corsOrigin === 'request' ? { 'Vary': 'Origin' } : {}),
	};
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

// ── Load index ────────────────────────────────────────────────────────────────
console.log(`[greg-search] Loading index: ${index}`);

let data = [];
let fuse = null;
let sectionCount = 0;
let loadParseMs = 0;
let fuseBuildMs = 0;
let indexMtimeMs = -1;
let shardedMode = false;
let shardManifest = null;
let shardManifestDir = '';
let shardLoadMs = 0;
let shardBuildMs = 0;
let loadedShardCount = 0;
let cacheTick = 0;
let shardPreloadMs = 0;
let maxLoadedShards = configuredMaxLoadedShards ?? 8;
/** @type {Map<string, { fuse: Fuse<any>; lastUsedAt: number }>} */
const shardCache = new Map();

function buildFuse(searchData) {
	return new Fuse(searchData, {
		includeScore: true,
		includeMatches: true,
		threshold,
		ignoreLocation,
		minMatchCharLength,
		keys: [
			{ name: 'title', weight: 3 },
			{ name: 'sections.heading', weight: 2 },
			{ name: 'sections.content', weight: 1 },
		],
	});
}

function loadShardManifest() {
	if (!existsSync(shardsManifest)) return false;
	let parsed;
	try {
		parsed = JSON.parse(readFileSync(shardsManifest, 'utf-8'));
	} catch (/** @type {any} */ e) {
		console.warn(`[greg-search] Failed to parse shards manifest (${shardsManifest}): ${e.message}`);
		return false;
	}
	if (!parsed || parsed.format !== 'greg-search-shards-v1' || !Array.isArray(parsed.files)) {
		return false;
	}
	shardManifest = parsed;
	shardManifestDir = dirname(shardsManifest);
	shardedMode = true;
	return true;
}

function markShardUsage(key) {
	const cached = shardCache.get(key);
	if (!cached) return;
	cached.lastUsedAt = ++cacheTick;
}

function evictShardsIfNeeded() {
	while (shardCache.size > maxLoadedShards) {
		let oldestKey = null;
		let oldestTick = Number.POSITIVE_INFINITY;
		for (const [key, value] of shardCache.entries()) {
			if (value.lastUsedAt < oldestTick) {
				oldestTick = value.lastUsedAt;
				oldestKey = key;
			}
		}
		if (!oldestKey) break;
		shardCache.delete(oldestKey);
	}
}

function getShardFuse(entry) {
	const cached = shardCache.get(entry.key);
	if (cached) {
		markShardUsage(entry.key);
		return cached.fuse;
	}

	const filePath = resolve(shardManifestDir, entry.file);
	const loadT0 = process.hrtime.bigint();
	const shardData = JSON.parse(readFileSync(filePath, 'utf-8'));
	shardLoadMs += msSince(loadT0);

	const buildT0 = process.hrtime.bigint();
	const shardFuse = buildFuse(shardData);
	shardBuildMs += msSince(buildT0);

	shardCache.set(entry.key, {
		fuse: shardFuse,
		lastUsedAt: ++cacheTick,
	});
	loadedShardCount += 1;
	evictShardsIfNeeded();
	return shardFuse;
}

function searchAcrossShards(query, limit) {
	if (!query || !shardManifest?.files?.length) return [];
	const terms = tokenizeQuery(query);
	const entries = shardManifest.files;
	const scores = entries.map((entry) => {
		const hintSet = new Set(Array.isArray(entry.hints) ? entry.hints : []);
		let score = 0;
		for (const term of terms) {
			if (hintSet.has(term)) score += 1;
		}
		return { entry, score };
	});

	const hasHintMatch = scores.some((item) => item.score > 0);
	const prioritizedEntries = hasHintMatch
		? scores
			.sort((a, b) => b.score - a.score)
			.slice(0, Math.min(shardCandidates, entries.length))
			.map((item) => item.entry)
		: entries;

	const merged = [];
	const searched = new Set();
	for (const entry of prioritizedEntries) {
		searched.add(entry.key);
		const shardFuse = getShardFuse(entry);
		const shardResults = shardFuse.search(query, { limit });
		if (shardResults.length) merged.push(...shardResults);
	}

	if (hasHintMatch && merged.length === 0) {
		for (const entry of entries) {
			if (searched.has(entry.key)) continue;
			const shardFuse = getShardFuse(entry);
			const shardResults = shardFuse.search(query, { limit });
			if (shardResults.length) merged.push(...shardResults);
		}
	}
	merged.sort((a, b) => (a.score ?? 1) - (b.score ?? 1));
	return merged.slice(0, limit).map(buildFuseResult);
}

function preloadAllShards() {
	if (!shardedMode || !shardManifest?.files?.length) return;
	const t0 = process.hrtime.bigint();
	for (const entry of shardManifest.files) {
		getShardFuse(entry);
	}
	shardPreloadMs = msSince(t0);
}

function loadIndex(force = false) {
	let stats;
	try {
		stats = statSync(index);
	} catch (/** @type {any} */ e) {
		console.error(`[greg-search] Failed to stat index: ${e.message}`);
		process.exit(1);
	}

	if (!force && stats.mtimeMs === indexMtimeMs && fuse) return false;

	const loadParseT0 = process.hrtime.bigint();
	let nextData;
	try {
		nextData = JSON.parse(readFileSync(index, 'utf-8'));
	} catch (/** @type {any} */ e) {
		console.error(`[greg-search] Failed to load index: ${e.message}`);
		process.exit(1);
	}
	loadParseMs = msSince(loadParseT0);

	const fuseBuildT0 = process.hrtime.bigint();
	fuse = buildFuse(nextData);
	fuseBuildMs = msSince(fuseBuildT0);

	data = nextData;
	indexMtimeMs = stats.mtimeMs;
	sectionCount = data.reduce((sum, doc) => sum + (doc.sections?.length ?? 0), 0);

	console.log(`[greg-search] Indexed ${data.length} document(s).`);
	return true;
}

if (loadShardManifest()) {
	const manifest = shardManifest;
	console.log(`[greg-search] Sharded mode enabled (${manifest.files.length} shards).`);
	maxLoadedShards = configuredMaxLoadedShards ?? manifest.files.length;
	if (preloadShards) {
		preloadAllShards();
	}
} else {
	loadIndex(true);
}

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = createServer((req, res) => {
	const rawUrl = req.url ?? '';
	const qIdx = rawUrl.indexOf('?');
	const pathname = qIdx >= 0 ? rawUrl.slice(0, qIdx) : rawUrl;

	// CORS preflight
	if (req.method === 'OPTIONS') {
		res.writeHead(204, {
			...getCorsHeaders(req),
		});
		res.end();
		return;
	}

	if (pathname !== url || req.method !== 'GET') {
		res.writeHead(404, {
			...getCorsHeaders(req),
		});
		res.end();
		return;
	}

	const params = new URLSearchParams(qIdx >= 0 ? rawUrl.slice(qIdx + 1) : '');
	const q = (params.get('q') ?? '').trim();
	const limit = Math.min(Math.max(parseInt(params.get('limit') ?? '10', 10) || 10, 1), 50);
	const localeRoot = params.get('localeRoot');
	const baseRoot = params.get('baseRoot');
	const localeRoots = (params.get('localeRoots') ?? '')
		.split(',')
		.map(v => v.trim())
		.filter(Boolean);

	let results = [];
	if (q) {
		if (shardedMode) {
			results = searchAcrossShards(q, limit);
		} else {
			loadIndex(false);
			results = fuse.search(q, { limit }).map(buildFuseResult);
		}
	}
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
		...getCorsHeaders(req),
	});
	res.end(body);
});

server.listen(port, host, () => {
	console.log(`[greg-search] Listening on http://${host}:${port}${url}`);
	const startupMs = msSince(startupT0);
	if (shardedMode) {
		console.log(
			`[greg-search] Startup summary: mode=sharded, total=${fmtMs(startupMs)}, ` +
			`docs=${shardManifest.totalDocs ?? 'unknown'}, shards=${shardManifest.files.length}, ` +
			`max-loaded-shards=${maxLoadedShards}, preload=${preloadShards}, shard-candidates=${shardCandidates}`,
		);
		console.log(
			`[greg-search] Runtime shard stats: loaded=${loadedShardCount}, ` +
			`cache-size=${shardCache.size}, preload=${fmtMs(shardPreloadMs)}, ` +
			`load+parse=${fmtMs(shardLoadMs)}, fuse-index=${fmtMs(shardBuildMs)}`,
		);
	} else {
		console.log(
			`[greg-search] Startup summary: load+parse=${fmtMs(loadParseMs)}, ` +
			`fuse-index=${fmtMs(fuseBuildMs)}, total=${fmtMs(startupMs)}, ` +
			`docs=${data.length}, sections=${sectionCount}`,
		);
	}
	console.log(
		`[greg-search] CORS: origin=${corsOrigin}, methods="${corsMethods}", ` +
		`headers="${corsHeaders}", max-age=${corsMaxAge}`,
	);
	console.log(
		`[greg-search] Fuzzy: threshold=${threshold}, min-match-chars=${minMatchCharLength}, ` +
		`ignore-location=${ignoreLocation}`,
	);
});
