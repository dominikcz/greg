/**
 * searchIndexBuilder.js
 *
 * Shared index-building logic used by both:
 *   - vitePluginSearchIndex  (emits search-index.json as a build asset / dev middleware)
 *   - vitePluginSearchServer (serves /api/search in dev + preview)
 *   - searchServer.js        (standalone production search server)
 *
 * The built index is cached per (docsDir, rootPath) pair so that when both
 * plugins are active they share a single build pass.
 * Call `invalidateSearchIndexCache()` to clear the cache (e.g. on file change).
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

// ── Per-process cache ─────────────────────────────────────────────────────────
/** @type {Map<string, Promise<SearchEntry[]>>} */
const _cache = new Map();

/**
 * @typedef {{ heading: string; anchor: string; content: string }} SearchSection
 * @typedef {{ id: string; title: string; sections: SearchSection[] }} SearchEntry
 */

// ── File helpers ──────────────────────────────────────────────────────────────

/**
 * Recursively collect all *.md files, skipping partials that start with `_`.
 * @param {string} dir
 * @param {string[]} [fileList]
 * @returns {string[]}
 */
export function walkDir(dir, fileList = []) {
	if (!existsSync(dir)) return fileList;
	for (const file of readdirSync(dir)) {
		const filePath = join(dir, file);
		if (statSync(filePath).isDirectory()) {
			walkDir(filePath, fileList);
		} else if (file.endsWith('.md') && !file.startsWith('_')) {
			fileList.push(filePath);
		}
	}
	return fileList;
}

/**
 * Strip markdown syntax → plain, searchable text.
 * @param {string} text
 * @returns {string}
 */
export function cleanMarkdown(text) {
	return text
		.replace(/^---[\s\S]*?---\n?/, '')             // YAML frontmatter
		.replace(/```[\s\S]*?```/g, '')                // fenced code blocks
		.replace(/~~~[\s\S]*?~~~/g, '')
		.replace(/`([^`]+)`/g, '$1')                   // inline code — keep value
		.replace(/!\[.*?\]\(.*?\)/g, '')               // images
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')       // links — keep text
		.replace(/\[([^\]]+)\]\[.*?\]/g, '$1')
		.replace(/\*\*\*([^*]+)\*\*\*/g, '$1')         // bold-italic
		.replace(/\*\*([^*]+)\*\*/g, '$1')             // bold
		.replace(/\*([^*]+)\*/g, '$1')                 // italic
		.replace(/___([^_]+)___/g, '$1')
		.replace(/__([^_]+)__/g, '$1')
		.replace(/_([^_]+)_/g, '$1')
		.replace(/<[^>]+>/g, ' ')                      // HTML tags
		.replace(/^[-*_]{3,}\s*$/gm, '')               // horizontal rules
		.replace(/^>\s*/gm, '')                        // blockquotes
		.replace(/\|[-:]+\|[-|: ]*/g, '\n')            // table separators
		.replace(/\|/g, ' ')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

/**
 * Split a markdown document into sections delimited by headings.
 * @param {string} markdown
 * @returns {SearchSection[]}
 */
export function extractSections(markdown) {
	const lines = markdown.split('\n');
	const sections = [];
	let currentHeading = '';
	let currentAnchor = '';
	let currentLines = [];

	const flush = () => {
		const content = cleanMarkdown(currentLines.join('\n')).trim();
		if (content || currentHeading) {
			sections.push({ heading: currentHeading, anchor: currentAnchor, content });
		}
	};

	for (const line of lines) {
		const m = line.match(/^(#{1,6})\s+(.+)/);
		if (m) {
			flush();
			currentHeading = m[2].replace(/\s*\{[#.][^}]*\}\s*$/, '').trim();
			currentAnchor = currentHeading
				.toLowerCase()
				.replace(/[^\w\s-]/g, '')
				.replace(/\s+/g, '-')
				.replace(/^-+|-+$/g, '');
			currentLines = [];
		} else {
			currentLines.push(line);
		}
	}
	flush();

	return sections.filter(s => s.content || s.heading);
}

// ── Index builder (cached) ────────────────────────────────────────────────────

/**
 * Build the full search index from all docs in `docsDir`.
 * Results are cached per (docsDir+rootPath) so both Vite plugins share one pass.
 *
 * @param {string} docsDir  Absolute path to the docs directory.
 * @param {string} rootPath SPA route prefix, e.g. '/docs'.
 * @returns {Promise<SearchEntry[]>}
 */
export function buildSearchIndex(docsDir, rootPath) {
	const key = `${docsDir}::${rootPath}`;
	if (_cache.has(key)) return /** @type {Promise<SearchEntry[]>} */ (_cache.get(key));

	const promise = (async () => {
		const files = walkDir(docsDir);
		const index = [];

		for (const filePath of files) {
			let content;
			try { content = readFileSync(filePath, 'utf-8'); } catch { continue; }

			const relPath = relative(docsDir, filePath)
				.replace(/\\/g, '/')
				.replace(/\.md$/, '');

			let routePath;
			if (relPath === 'index') {
				routePath = rootPath;
			} else if (relPath.endsWith('/index')) {
				routePath = rootPath + '/' + relPath.slice(0, -6);
			} else {
				routePath = rootPath + '/' + relPath;
			}

			const sections = extractSections(content);
			const title =
				sections[0]?.heading ||
				relPath.split('/').pop()
					.replace(/-/g, ' ')
					.replace(/\b\w/g, c => c.toUpperCase());

			index.push({
				id: routePath,
				title,
				sections: sections.map(({ heading, anchor, content }) => ({ heading, anchor, content })),
			});
		}

		return index;
	})();

	_cache.set(key, promise);
	return promise;
}

/** Clear the build cache. Call when markdown files change. */
export function invalidateSearchIndexCache() {
	_cache.clear();
}

// ── Fuse.js result → SearchResult  ───────────────────────────────────────────
// These helpers run on the server side (inside the Vite plugin / standalone server).

/**
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * @param {string} text
 * @param {[number,number][]} indices
 * @returns {string}
 */
function highlightText(text, indices) {
	if (!indices?.length) return escapeHtml(text);
	let html = '';
	let last = 0;
	for (const [s, e] of indices) {
		if (s >= text.length) break;
		if (s > last) html += escapeHtml(text.slice(last, s));
		html += `<mark>${escapeHtml(text.slice(s, e + 1))}</mark>`;
		last = e + 1;
	}
	html += escapeHtml(text.slice(last));
	return html;
}

/**
 * @param {string} text
 * @param {[number,number][]} indices
 * @param {number} [contextLen]
 * @returns {string}
 */
function getExcerptHtml(text, indices, contextLen = 150) {
	if (!text) return '';
	if (!indices?.length) {
		return escapeHtml(text.slice(0, contextLen)) + (text.length > contextLen ? '…' : '');
	}
	const firstMatchStart = indices[0][0];
	const from = Math.max(0, firstMatchStart - 50);
	const to = Math.min(text.length, from + contextLen);
	const sliced = text.slice(from, to);
	const adjusted = indices
		.map(([s, e]) => [s - from, e - from])
		.filter(([s, e]) => e >= 0 && s < sliced.length)
		.map(([s, e]) => [Math.max(0, s), Math.min(sliced.length - 1, e)]);

	const prefix = from > 0 ? '…' : '';
	const suffix = to < text.length ? '…' : '';
	let html = prefix;
	let last = 0;
	for (const [s, e] of adjusted) {
		if (s > last) html += escapeHtml(sliced.slice(last, s));
		html += `<mark>${escapeHtml(sliced.slice(s, e + 1))}</mark>`;
		last = e + 1;
	}
	html += escapeHtml(sliced.slice(last)) + suffix;
	return html;
}

/**
 * Convert a raw Fuse.js result object into a client-ready SearchResult.
 * @param {any} fuseResult
 * @returns {{ id: string; title: string; titleHtml: string; sectionTitle: string; sectionAnchor: string; excerptHtml: string; score: number }}
 */
export function buildFuseResult(fuseResult) {
	const { item, matches = [], score = 1 } = fuseResult;

	const sorted = [...matches].sort(
		(a, b) =>
			b.indices.reduce((s, [x, y]) => s + (y - x), 0) -
			a.indices.reduce((s, [x, y]) => s + (y - x), 0),
	);

	const titleMatch = sorted.find(m => m.key === 'title');
	const sectionContent = sorted.find(m => m.key === 'sections.content');
	const sectionHeading = sorted.find(m => m.key === 'sections.heading');

	let excerptHtml = '', sectionTitle = '', sectionAnchor = '';

	if (sectionContent) {
		const sec = item.sections[sectionContent.refIndex];
		sectionTitle = sec?.heading ?? '';
		sectionAnchor = sec?.anchor ?? '';
		excerptHtml = getExcerptHtml(sectionContent.value, sectionContent.indices);
	} else if (sectionHeading) {
		const sec = item.sections[sectionHeading.refIndex];
		sectionTitle = sec?.heading ?? '';
		sectionAnchor = sec?.anchor ?? '';
		excerptHtml = escapeHtml((sec?.content ?? '').slice(0, 150));
	} else {
		excerptHtml = escapeHtml((item.sections[0]?.content ?? '').slice(0, 150));
	}

	const titleHtml = titleMatch
		? highlightText(item.title, titleMatch.indices)
		: escapeHtml(item.title);

	return { id: item.id, title: item.title, titleHtml, sectionTitle, sectionAnchor, excerptHtml, score };
}
