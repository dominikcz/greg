#!/usr/bin/env node
/**
 * Greg standalone AI server — for production deployments.
 *
 * Reads a pre-built search-index.json, builds the RAG pipeline, then serves:
 *   POST /api/ai/ask          — ask a question, receive answer + source links
 *   GET  /api/ai/characters   — list available AI personas
 *
 * Usage:
 *   node src/lib/MarkdownDocs/aiServer.js [options]
 *   greg ai-server                                  (via CLI)
 *
 * Options (CLI flags or environment variables):
 *   --index       PATH    Path to search-index.json  (GREG_AI_INDEX,       default: dist/search-index.json)
 *   --port        NUMBER  HTTP port                  (GREG_AI_PORT,        default: 3200)
 *   --host        ADDR    Bind address               (GREG_AI_HOST,        default: localhost)
 *   --url         PATH    API base URL path          (GREG_AI_URL,         default: /api/ai)
 *   --provider    NAME    LLM provider               (GREG_AI_PROVIDER,    default: ollama)
 *   --model       NAME    LLM model name             (GREG_AI_MODEL)
 *   --ollama-url  URL     Ollama base URL            (GREG_AI_OLLAMA_URL,  default: http://localhost:11434)
 *   --cors-origin VALUE   CORS allowed origin        (GREG_AI_CORS_ORIGIN, default: *)
 *   --cors-methods VALUE  CORS allowed methods       (GREG_AI_CORS_METHODS,  default: GET, POST, OPTIONS)
 *   --cors-headers VALUE  CORS allowed headers       (GREG_AI_CORS_HEADERS,  default: Content-Type)
 *   --cors-max-age VALUE  CORS preflight cache secs  (GREG_AI_CORS_MAX_AGE,  default: 86400)
 *
 * Example — run after `greg build`:
 *   greg ai-server --index dist/search-index.json --provider ollama --model llama3.2
 *
 * Then set search.ai.serverUrl in greg.config.js → 'http://localhost:3200/api/ai'
 * (or configure a reverse proxy).
 */

import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildChunks } from './ai/chunker.js';
import { MemoryStore } from './ai/stores/memoryStore.js';
import { resolveCharacters } from './ai/characters.js';
import { RagPipeline } from './ai/ragPipeline.js';

const startupT0 = process.hrtime.bigint();

function msSince(t0) {
	return Number(process.hrtime.bigint() - t0) / 1e6;
}

function fmtMs(ms) {
	return `${ms.toFixed(1)}ms`;
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

// ── Config loading (same pattern as searchServer.js) ─────────────────────────

function resolveGregConfigPath() {
	const tsPath = resolve('greg.config.ts');
	const jsPath = resolve('greg.config.js');
	if (existsSync(tsPath)) return tsPath;
	if (existsSync(jsPath)) return jsPath;
	return null;
}

async function loadTsConfig(configPath) {
	const { transform } = await import('esbuild');
	const source = readFileSync(configPath, 'utf8');
	const { code } = await transform(source, { format: 'esm', loader: 'ts', target: 'node18' });
	const dataUrl = 'data:text/javascript,' + encodeURIComponent(code);
	const mod = await import(dataUrl);
	return mod.default ?? {};
}

async function loadGregConfig() {
	const configPath = resolveGregConfigPath();
	if (!configPath) return {};
	if (configPath.endsWith('.ts')) return loadTsConfig(configPath);
	const fileUrl = pathToFileURL(configPath).href + '?t=' + Date.now();
	const mod = await import(fileUrl);
	return mod.default ?? {};
}

// ── Resolve configuration ─────────────────────────────────────────────────────

const cliArgs = parseArgs(process.argv.slice(2));
const gregConfig = await loadGregConfig();
const aiConfig = gregConfig?.search?.ai ?? {};

const port = parseInt(cliArgs.port ?? process.env.GREG_AI_PORT ?? '3200', 10);
const host = String(cliArgs.host ?? process.env.GREG_AI_HOST ?? 'localhost');
const url = String(cliArgs.url ?? process.env.GREG_AI_URL ?? '/api/ai');
const index = resolve(String(cliArgs.index ?? process.env.GREG_AI_INDEX ?? 'dist/search-index.json'));
const providerType = String(cliArgs.provider ?? process.env.GREG_AI_PROVIDER ?? aiConfig?.provider ?? 'ollama');
const corsOrigin = String(cliArgs['cors-origin'] ?? process.env.GREG_AI_CORS_ORIGIN ?? '*');
const corsMethods = String(cliArgs['cors-methods'] ?? process.env.GREG_AI_CORS_METHODS ?? 'GET, POST, OPTIONS');
const corsHeaders = String(cliArgs['cors-headers'] ?? process.env.GREG_AI_CORS_HEADERS ?? 'Content-Type');
const corsMaxAge = String(cliArgs['cors-max-age'] ?? process.env.GREG_AI_CORS_MAX_AGE ?? '86400');

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

// ── Build provider ────────────────────────────────────────────────────────────

async function createProvider() {
	if (providerType === 'ollama') {
		const { OllamaAdapter } = await import('./ai/adapters/ollamaAdapter.js');
		const ollamaUrl = String(
			cliArgs['ollama-url'] ??
			process.env.GREG_AI_OLLAMA_URL ??
			aiConfig?.ollama?.baseUrl ??
			'http://localhost:11434',
		);
		const model = String(
			cliArgs.model ??
			process.env.GREG_AI_MODEL ??
			aiConfig?.ollama?.model ??
			'llama3.2',
		);
		return new OllamaAdapter({ baseUrl: ollamaUrl, model, ...(aiConfig?.ollama ?? {}) });
	}

	if (providerType === 'openai') {
		const { OpenAiAdapter } = await import('./ai/adapters/openaiAdapter.js');
		const model = String(
			cliArgs.model ??
			process.env.GREG_AI_MODEL ??
			aiConfig?.openai?.model ??
			'gpt-4o-mini',
		);
		return new OpenAiAdapter({ model, ...(aiConfig?.openai ?? {}) });
	}

	throw new Error(`[greg-ai] Unknown provider: "${providerType}". Supported: "ollama", "openai".`);
}

// ── Load search index ─────────────────────────────────────────────────────────

console.log(`[greg-ai] Loading index: ${index}`);

if (!existsSync(index)) {
	console.error(`[greg-ai] Index file not found: ${index}`);
	console.error('[greg-ai] Run "greg build" first to generate dist/search-index.json.');
	process.exit(1);
}

const loadT0 = process.hrtime.bigint();
let indexData;
try {
	indexData = JSON.parse(readFileSync(index, 'utf-8'));
} catch (err) {
	console.error(`[greg-ai] Failed to parse index: ${err.message}`);
	process.exit(1);
}
const loadMs = msSince(loadT0);

// ── Build RAG pipeline ────────────────────────────────────────────────────────

const chunkT0 = process.hrtime.bigint();
const chunks = buildChunks(indexData, aiConfig?.chunking ?? {});
const chunkMs = msSince(chunkT0);

const storeT0 = process.hrtime.bigint();
const store = new MemoryStore();
await store.index(chunks);
const storeMs = msSince(storeT0);

const characters = resolveCharacters(
	aiConfig?.characters,
	aiConfig?.customCharacters ?? [],
);

const provider = await createProvider();
const pipeline = new RagPipeline(provider, store, characters);

// ── HTTP server helpers ───────────────────────────────────────────────────────

function readBody(req) {
	return new Promise((resolve, reject) => {
		let body = '';
		req.on('data', chunk => { body += chunk; });
		req.on('end', () => {
			try { resolve(JSON.parse(body || '{}')); }
			catch { resolve({}); }
		});
		req.on('error', reject);
	});
}

// ── HTTP server ───────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
	const rawUrl = req.url ?? '';
	const qIdx = rawUrl.indexOf('?');
	const pathname = qIdx >= 0 ? rawUrl.slice(0, qIdx) : rawUrl;

	// CORS preflight
	if (req.method === 'OPTIONS') {
		res.writeHead(204, { ...getCorsHeaders(req) });
		res.end();
		return;
	}

	// GET /api/ai/characters
	if (pathname === `${url}/characters` && req.method === 'GET') {
		const body = JSON.stringify({ characters: pipeline.getCharacters() });
		res.writeHead(200, {
			'Content-Type': 'application/json; charset=utf-8',
			'Content-Length': Buffer.byteLength(body),
			...getCorsHeaders(req),
		});
		res.end(body);
		return;
	}

	// POST /api/ai/ask
	if (pathname === `${url}/ask` && req.method === 'POST') {
		let requestBody;
		try {
			requestBody = await readBody(req);
		} catch {
			res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(req) });
			res.end(JSON.stringify({ error: 'Invalid JSON body' }));
			return;
		}

		const query = String(requestBody.query ?? requestBody.q ?? '').trim();
		if (!query) {
			res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(req) });
			res.end(JSON.stringify({ error: 'query is required' }));
			return;
		}

		const characterId = String(requestBody.character ?? aiConfig?.defaultCharacter ?? 'professional');
		const locale = String(requestBody.locale ?? '');

		try {
			const result = await pipeline.ask(query, characterId, locale);
			const body = JSON.stringify(result);
			res.writeHead(200, {
				'Content-Type': 'application/json; charset=utf-8',
				'Cache-Control': 'no-cache',
				'Content-Length': Buffer.byteLength(body),
				...getCorsHeaders(req),
			});
			res.end(body);
		} catch (err) {
			console.error('[greg-ai] Query failed:', err.message);
			res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8', ...getCorsHeaders(req) });
			res.end(JSON.stringify({ error: 'AI query failed', detail: err.message }));
		}
		return;
	}

	res.writeHead(404, { ...getCorsHeaders(req) });
	res.end();
});

server.listen(port, host, () => {
	const startupMs = msSince(startupT0);
	console.log(`[greg-ai] Listening on http://${host}:${port}${url}`);
	console.log(
		`[greg-ai] Startup: load=${fmtMs(loadMs)}, chunk=${fmtMs(chunkMs)}, ` +
		`bm25-index=${fmtMs(storeMs)}, total=${fmtMs(startupMs)}`,
	);
	console.log(
		`[greg-ai] Docs: ${indexData.length} pages | Chunks: ${store.size()} | Provider: ${providerType}`,
	);
	console.log(`[greg-ai] Characters: ${characters.map(c => `${c.icon} ${c.id}`).join(', ')}`);
	console.log(
		`[greg-ai] CORS: origin=${corsOrigin}, methods="${corsMethods}", ` +
		`headers="${corsHeaders}", max-age=${corsMaxAge}`,
	);
	console.log(`[greg-ai] Endpoints:`);
	console.log(`[greg-ai]   POST http://${host}:${port}${url}/ask`);
	console.log(`[greg-ai]   GET  http://${host}:${port}${url}/characters`);
});
