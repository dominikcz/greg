/**
 * vitePluginAiServer
 *
 * Vite plugin that exposes an AI question-answering REST API in both
 * dev (`configureServer`) and preview (`configurePreviewServer`) modes:
 *
 *   POST /api/ai/ask          — ask a question, receive an AI answer + sources
 *   GET  /api/ai/characters   — list available personas
 *
 * Only active when `search.ai.enabled = true` in greg.config.js.
 * For production deployments use the standalone `aiServer.js` instead
 * (invoked via `greg ai-server`).
 *
 * @param {object} options
 * @param {string} [options.docsDir='docs']      Docs directory relative to project root
 * @param {string} [options.srcDir='/docs']      SPA route prefix
 * @param {string} [options.aiUrl='/api/ai']     URL path prefix for AI endpoints
 * @param {object} [options.ai={}]               Contents of greg.config.js → search.ai
 */

import path from 'node:path';
import { buildSearchIndex, invalidateSearchIndexCache } from './searchIndexBuilder.js';
import { buildChunks } from './ai/chunker.js';
import { MemoryStore } from './ai/stores/memoryStore.js';
import { resolveCharacters } from './ai/characters.js';
import { RagPipeline } from './ai/ragPipeline.js';
import { loadGregConfig } from './loadGregConfig.js';

/** @typedef {import('../../../types/index.js').AiConfig} AiConfig */

export function vitePluginAiServer({
	docsDir = 'docs',
	srcDir = '/docs',
	aiUrl = '/api/ai',
	ai = /** @type {AiConfig} */ ({}),
} = {}) {
	const hasExplicitAiConfig = ai && typeof ai === 'object' && Object.keys(ai).length > 0;
	/** @type {AiConfig} */
	let resolvedAi = hasExplicitAiConfig ? ai : /** @type {AiConfig} */ ({});

	let resolvedDocsDir;
	let viteBase = '/';

	/** @type {RagPipeline | null} */
	let pipelineCache = null;
	/** @type {Promise<RagPipeline> | null} */
	let buildPromise = null;

	async function buildPipeline() {
		const provider = await createProvider(resolvedAi);
		const index = await buildSearchIndex(resolvedDocsDir, srcDir);
		const chunks = buildChunks(index, resolvedAi?.chunking ?? {});
		const store = new MemoryStore();
		await store.index(chunks);

		const characters = resolveCharacters(
			resolvedAi?.characters,
			resolvedAi?.customCharacters ?? [],
		);

		return new RagPipeline(provider, store, characters);
	}

	async function loadPipeline() {
		if (pipelineCache) return pipelineCache;
		if (!buildPromise) {
			buildPromise = buildPipeline()
				.then(p => { pipelineCache = p; return p; })
				.catch(err => { buildPromise = null; throw err; });
		}
		return buildPromise;
	}

	function invalidate() {
		pipelineCache = null;
		buildPromise = null;
		invalidateSearchIndexCache();
	}

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

	function middleware() {
		return async (req, res, next) => {
			if (!resolvedAi?.enabled) {
				next();
				return;
			}

			const urlStr = req.url ?? '';
			const qIdx = urlStr.indexOf('?');
			const rawPathname = qIdx >= 0 ? urlStr.slice(0, qIdx) : urlStr;
			const base = viteBase === '/' ? '' : viteBase.replace(/\/$/, '');
			const pathname = (base && rawPathname.startsWith(base))
				? '/' + rawPathname.slice(base.length).replace(/^\/+/, '')
				: rawPathname;

			// GET /api/ai/characters
			if (pathname === `${aiUrl}/characters` && req.method === 'GET') {
				try {
					const pipeline = await loadPipeline();
					const body = JSON.stringify({ characters: pipeline.getCharacters() });
					res.writeHead(200, {
						'Content-Type': 'application/json; charset=utf-8',
						'Cache-Control': 'no-cache',
					});
					res.end(body);
				} catch (err) {
					console.error('[greg:ai-server] characters error:', err.message);
					res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
					res.end(JSON.stringify({ error: err.message }));
				}
				return;
			}

			// POST /api/ai/ask
			if (pathname === `${aiUrl}/ask` && req.method === 'POST') {
				try {
					const body = await readBody(req);
					const query = String(body.query ?? body.q ?? '').trim();
					if (!query) {
						res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
						res.end(JSON.stringify({ error: 'query is required' }));
						return;
					}

					const characterId = String(body.character ?? resolvedAi?.defaultCharacter ?? 'professional');
					const locale = String(body.locale ?? '');

					const pipeline = await loadPipeline();
					const result = await pipeline.ask(query, characterId, locale);

					const responseBody = JSON.stringify(result);
					res.writeHead(200, {
						'Content-Type': 'application/json; charset=utf-8',
						'Cache-Control': 'no-cache',
						'Content-Length': Buffer.byteLength(responseBody),
					});
					res.end(responseBody);
				} catch (err) {
					console.error('[greg:ai-server] ask error:', err.message);
					res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
					res.end(JSON.stringify({ error: 'AI query failed', detail: err.message }));
				}
				return;
			}

			next();
		};
	}

	return {
		name: 'greg:ai-server',

		async configResolved(config) {
			const dirs = Array.isArray(docsDir) ? docsDir : [docsDir];
			resolvedDocsDir = dirs.map(d => path.resolve(config.root, d));
			viteBase = config.base ?? '/';

			if (!hasExplicitAiConfig) {
				try {
					const gregConfig = await loadGregConfig();
					resolvedAi = gregConfig?.search?.ai ?? {};
				} catch {
					resolvedAi = {};
				}
			}
		},

		configureServer(server) {
			server.middlewares.use(middleware());
			server.watcher.on('change', f => { if (f.endsWith('.md')) invalidate(); });
			server.watcher.on('add', f => { if (f.endsWith('.md')) invalidate(); });
			server.watcher.on('unlink', f => { if (f.endsWith('.md')) invalidate(); });
		},

		configurePreviewServer(server) {
			server.middlewares.use(middleware());
		},
	};
}

/**
 * Create the appropriate AiProvider from the `search.ai` config object.
 * @param {object} aiConfig
 */
async function createProvider(aiConfig) {
	const providerType = aiConfig?.provider ?? 'ollama';

	if (providerType === 'ollama') {
		const { OllamaAdapter } = await import('./ai/adapters/ollamaAdapter.js');
		return new OllamaAdapter(aiConfig?.ollama ?? {});
	}

	if (providerType === 'openai') {
		const { OpenAiAdapter } = await import('./ai/adapters/openaiAdapter.js');
		return new OpenAiAdapter(aiConfig?.openai ?? {});
	}

	if (providerType === 'custom' && typeof aiConfig?.customProvider === 'function') {
		const { CustomAdapter } = await import('./ai/adapters/customAdapter.js');
		return new CustomAdapter(aiConfig.customProvider);
	}

	throw new Error(
		`[greg:ai] Unknown provider: "${providerType}". ` +
		`Supported values: "ollama", "openai", "custom".`,
	);
}
