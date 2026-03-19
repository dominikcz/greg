import fs from 'node:fs';
import { dirname, resolve } from 'node:path';
import { once } from 'node:events';
import { buildSearchIndex, invalidateSearchIndexCache } from './searchIndexBuilder.js';

async function writeChunk(target, chunk) {
	if (target.write(chunk)) return;
	await once(target, 'drain');
}


async function streamIndexJson(target, index) {
	await writeChunk(target, '[');
	for (let i = 0; i < index.length; i++) {
		if (i > 0) await writeChunk(target, ',');
		await writeChunk(target, JSON.stringify(index[i]));
	}
	await writeChunk(target, ']');
}

async function writeIndexToFile(filePath, index) {
	await fs.promises.mkdir(dirname(filePath), { recursive: true });
	const stream = fs.createWriteStream(filePath, { encoding: 'utf8' });
	try {
		await streamIndexJson(stream, index);
	} finally {
		stream.end();
	}
	await once(stream, 'finish');
}

async function writeIndexToResponse(res, index) {
	await streamIndexJson(res, index);
	res.end();
}

function resolveOutputDir(config) {
	return resolve(config.root, config.build.outDir);
}

function resolveShardCount() {
	const DEFAULT_SHARDS = 32;
	const raw = process.env.GREG_SEARCH_SHARDS;
	if (raw == null || String(raw).trim() === '') return DEFAULT_SHARDS;
	const normalized = String(raw).trim().toLowerCase();
	if (['0', 'false', 'off', 'no'].includes(normalized)) return 0;
	const parsed = Number.parseInt(String(raw), 10);
	if (!Number.isFinite(parsed) || parsed < 2 || parsed > 512) return DEFAULT_SHARDS;
	return parsed;
}

function hashRouteId(id) {
	let hash = 5381;
	const text = String(id || '');
	for (let i = 0; i < text.length; i++) {
		hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
	}
	return hash >>> 0;
}

function padShardNumber(value, width = 3) {
	return String(value).padStart(width, '0');
}

function formatBytes(bytes) {
	const value = Number(bytes) || 0;
	if (value < 1024) return `${value} B`;
	const units = ['KB', 'MB', 'GB', 'TB'];
	let current = value / 1024;
	let index = 0;
	while (current >= 1024 && index < units.length - 1) {
		current /= 1024;
		index += 1;
	}
	return `${current.toFixed(2)} ${units[index]}`;
}

function tokenizeHintText(value) {
	return String(value || '')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
		.split(/[\s-]+/)
		.map((part) => part.trim())
		.filter((part) => part.length >= 3);
}

function buildShardHints(docs, maxTerms = 1200) {
	const terms = new Set();
	for (const doc of docs) {
		for (const token of tokenizeHintText(doc?.title)) {
			terms.add(token);
			if (terms.size >= maxTerms) return Array.from(terms);
		}
		for (const section of (doc?.sections || [])) {
			for (const token of tokenizeHintText(section?.heading)) {
				terms.add(token);
				if (terms.size >= maxTerms) return Array.from(terms);
			}
		}
	}
	return Array.from(terms);
}

async function writeShardedIndex(outDir, index, logger) {
	const shardCount = resolveShardCount();
	if (shardCount < 2) {
		if (logger?.info) {
			logger.info('[vite-plugin-search-index] Skipping sharded index generation (GREG_SEARCH_SHARDS disabled).');
		}
		return;
	}
	const shardDir = resolve(outDir, 'search-index');
	const shardBuckets = Array.from({ length: shardCount }, () => []);

	for (const entry of index) {
		const bucket = hashRouteId(entry?.id) % shardCount;
		shardBuckets[bucket].push(entry);
	}

	const files = [];
	let writtenDocs = 0;
	let totalBytes = 0;
	for (let i = 0; i < shardBuckets.length; i++) {
		const docs = shardBuckets[i];
		const key = padShardNumber(i);
		const file = `shard-${key}.json`;
		const absFile = resolve(shardDir, file);
		await writeIndexToFile(absFile, docs);
		const size = fs.statSync(absFile).size;
		const hints = buildShardHints(docs);
		files.push({ key, file, docs: docs.length, size, hints });
		writtenDocs += docs.length;
		totalBytes += size;
	}

	const manifest = {
		format: 'greg-search-shards-v1',
		createdAt: new Date().toISOString(),
		shardCount,
		totalDocs: writtenDocs,
		totalBytes,
		files,
	};

	await fs.promises.mkdir(shardDir, { recursive: true });
	await fs.promises.writeFile(
		resolve(shardDir, 'manifest.json'),
		JSON.stringify(manifest, null, 2),
		'utf8',
	);

	if (logger?.info) {
		logger.info(
			`[vite-plugin-search-index] Wrote sharded search index (${shardCount} shards, ${formatBytes(totalBytes)}).`,
		);
	}
}

/**
 * Vite plugin: serves /search-index.json in dev and emits it as a build asset.
 *
 * The build is shared with vitePluginSearchServer via the module-level cache
 * in searchIndexBuilder.js — both plugins pay the I/O cost only once.
 *
 * @param {object} options
 * @param {string} [options.docsDir='docs']   - directory (relative to project root)
 * @param {string} [options.srcDir='/docs'] - SPA route prefix
 */
export function vitePluginSearchIndex({ docsDir = 'docs', srcDir = '/docs' } = {}) {
	let resolvedDocsDirs;
	let resolvedOutDir;

	return {
		name: 'vite-plugin-search-index',

		configResolved(config) {
			const dirs = Array.isArray(docsDir) ? docsDir : [docsDir];
			resolvedDocsDirs = dirs.map(d => resolve(config.root, d));
			resolvedOutDir = resolveOutputDir(config);
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
					const index = await buildSearchIndex(resolvedDocsDirs, srcDir);
					res.writeHead(200, {
						'Content-Type': 'application/json; charset=utf-8',
						'Cache-Control': 'no-cache',
					});
					await writeIndexToResponse(res, index);
				} catch (err) {
					next(err);
				}
			});
		},

		// Production build: write full search-index.json directly to outDir.
		// Streaming avoids creating one giant JSON string in memory.
		async closeBundle() {
			const index = await buildSearchIndex(resolvedDocsDirs, srcDir);
			const outFile = resolve(resolvedOutDir, 'search-index.json');
			await writeIndexToFile(outFile, index);
			const fullSize = fs.statSync(outFile).size;
			this.info(`[vite-plugin-search-index] Wrote search-index.json (${formatBytes(fullSize)}).`);
			await writeShardedIndex(resolvedOutDir, index, this);
		},
	};
}
