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
 *
 * Example — run after `greg build`:
 *   greg search-server --index dist/search-index.json --port 3100
 *
 * Then point greg.config.js → search.serverUrl to http://localhost:3100/api/search
 * (or configure a reverse proxy so /api/search hits this server).
 */

import { createServer } from 'node:http';
import { readFileSync }  from 'node:fs';
import { resolve }       from 'node:path';
import { buildFuseResult } from './searchIndexBuilder.js';
import Fuse from 'fuse.js';

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

const args  = parseArgs(process.argv.slice(2));
const port  = parseInt(args.port  ?? process.env.GREG_SEARCH_PORT  ?? '3100', 10);
const host  = String(args.host    ?? process.env.GREG_SEARCH_HOST  ?? 'localhost');
const url   = String(args.url     ?? process.env.GREG_SEARCH_URL   ?? '/api/search');
const index = resolve(String(args.index ?? process.env.GREG_SEARCH_INDEX ?? 'dist/search-index.json'));

// ── Load index ────────────────────────────────────────────────────────────────
console.log(`[greg-search] Loading index: ${index}`);

let data;
try {
	data = JSON.parse(readFileSync(index, 'utf-8'));
} catch (/** @type {any} */ e) {
	console.error(`[greg-search] Failed to load index: ${e.message}`);
	process.exit(1);
}

const fuse = new Fuse(data, {
	includeScore: true,
	includeMatches: true,
	threshold: 0.4,
	ignoreLocation: true,
	minMatchCharLength: 2,
	keys: [
		{ name: 'title',            weight: 3 },
		{ name: 'sections.heading', weight: 2 },
		{ name: 'sections.content', weight: 1 },
	],
});

console.log(`[greg-search] Indexed ${data.length} document(s).`);

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = createServer((req, res) => {
	const rawUrl   = req.url ?? '';
	const qIdx     = rawUrl.indexOf('?');
	const pathname = qIdx >= 0 ? rawUrl.slice(0, qIdx) : rawUrl;

	// CORS preflight
	if (req.method === 'OPTIONS') {
		res.writeHead(204, {
			'Access-Control-Allow-Origin':  '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		});
		res.end();
		return;
	}

	if (pathname !== url || req.method !== 'GET') {
		res.writeHead(404);
		res.end();
		return;
	}

	const params  = new URLSearchParams(qIdx >= 0 ? rawUrl.slice(qIdx + 1) : '');
	const q       = (params.get('q') ?? '').trim();
	const limit   = Math.min(Math.max(parseInt(params.get('limit') ?? '10', 10) || 10, 1), 50);

	const results = q ? fuse.search(q, { limit }).map(buildFuseResult) : [];
	const body    = JSON.stringify({ query: q, results });

	res.writeHead(200, {
		'Content-Type':                'application/json; charset=utf-8',
		'Cache-Control':               'no-cache',
		'Access-Control-Allow-Origin': '*',
		'Content-Length':              Buffer.byteLength(body),
	});
	res.end(body);
});

server.listen(port, host, () => {
	console.log(`[greg-search] Listening on http://${host}:${port}${url}`);
});
