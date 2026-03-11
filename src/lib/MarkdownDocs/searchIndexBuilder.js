/**
 * searchIndexBuilder.js
 *
 * Shared index-building logic used by both:
 *   - vitePluginSearchIndex  (emits search-index.json as a build asset / dev middleware)
 *   - vitePluginSearchServer (serves /api/search in dev + preview)
 *   - searchServer.js        (standalone production search server)
 *
 * The built index is cached per (docsDir, srcDir) pair so that when both
 * plugins are active they share a single build pass.
 * Call `invalidateSearchIndexCache()` to clear the cache (e.g. on file change).
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

// â”€â”€ Per-process cache â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/** @type {Map<string, Promise<SearchEntry[]>>} */
const _cache = new Map();
const INCLUDE_RE = /^<!--\s*@include:\s*([^\s]+)\s*-->$/;
const BRACES_RE = /\{([^}]*)\}\s*$/;
const REGION_RE = /^(.*?)#([^#{]+)$/;

/**
 * @typedef {{ heading: string; anchor: string; content: string }} SearchSection
 * @typedef {{ id: string; title: string; sections: SearchSection[] }} SearchEntry
 */

// â”€â”€ File helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Recursively collect all *.md files, skipping partial files/folders that start with `__`.
 * @param {string} dir
 * @param {string[]} [fileList]
 * @returns {string[]}
 */
export function walkDir(dir, fileList = []) {
	if (!existsSync(dir)) return fileList;
	for (const file of readdirSync(dir)) {
		if (file.startsWith('__')) continue;
		const filePath = join(dir, file);
		if (statSync(filePath).isDirectory()) {
			walkDir(filePath, fileList);
		} else if (file.endsWith('.md') && !file.startsWith('__')) {
			fileList.push(filePath);
		}
	}
	return fileList;
}

/**
 * Strip markdown syntax â†’ plain, searchable text.
 * @param {string} text
 * @returns {string}
 */
export function cleanMarkdown(text) {
	return text
		.replace(/^---[\s\S]*?---\n?/, '')             // YAML frontmatter
		.replace(/```[\s\S]*?```/g, '')                // fenced code blocks
		.replace(/~~~[\s\S]*?~~~/g, '')
		.replace(/`([^`]+)`/g, '$1')                   // inline code â€” keep value
		.replace(/!\[.*?\]\(.*?\)/g, '')               // images
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')       // links â€” keep text
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

function parseBraces(value) {
	const match = String(value).match(BRACES_RE);
	if (!match) return { text: String(value).trim(), braces: '' };
	return { text: String(value).slice(0, match.index).trim(), braces: match[1].trim() };
}

function parseRegion(value) {
	const match = String(value).match(REGION_RE);
	if (!match) return { filePart: String(value).trim(), regionOrAnchor: '' };
	return { filePart: match[1].trim(), regionOrAnchor: match[2].trim() };
}

function parseRange(value) {
	const text = String(value ?? '').trim();
	if (!text) return null;
	if (/^\d+$/.test(text)) {
		const n = Number(text);
		return { start: n, end: n };
	}
	const dashMatch = text.match(/^(\d+)\s*-\s*(\d+)$/);
	if (dashMatch) {
		return { start: Number(dashMatch[1]), end: Number(dashMatch[2]) };
	}
	const commaMatch = text.match(/^(\d*)\s*,\s*(\d*)$/);
	if (!commaMatch) return null;
	const start = commaMatch[1] ? Number(commaMatch[1]) : null;
	const end = commaMatch[2] ? Number(commaMatch[2]) : null;
	return { start, end };
}

function selectLines(content, rangeText) {
	const range = parseRange(rangeText);
	if (!range) return content;
	const lines = content.split(/\r?\n/);
	const start = range.start ?? 1;
	const end = range.end ?? lines.length;
	const from = Math.max(1, start);
	const to = Math.max(from, Math.min(end, lines.length));
	return lines.slice(from - 1, to).join('\n');
}

function escapeRegExp(value) {
	return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function selectRegion(content, regionName) {
	if (!regionName) return content;
	const lines = content.split(/\r?\n/);
	const escapedName = escapeRegExp(regionName);
	const startRe = new RegExp(`#region\\s+${escapedName}\\s*$`, 'i');
	const endRe = new RegExp(`#endregion\\s+${escapedName}\\s*$`, 'i');

	let start = -1;
	let end = -1;
	for (let i = 0; i < lines.length; i++) {
		if (start === -1 && startRe.test(lines[i])) {
			start = i;
			continue;
		}
		if (start !== -1 && endRe.test(lines[i])) {
			end = i;
			break;
		}
	}

	if (start === -1 || end === -1 || end <= start) return content;
	return lines.slice(start + 1, end).join('\n');
}

function getHeadingId(rawHeadingText) {
	const customIdMatch = rawHeadingText.match(/\s*\{#([^}]+)\}\s*$/);
	if (customIdMatch?.[1]) return customIdMatch[1].trim().toLowerCase();
	return rawHeadingText
		.replace(/\s*\{#([^}]+)\}\s*$/, '')
		.toLowerCase()
		.replace(/<[^>]+>/g, '')
		.replace(/[^\w\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-');
}

function selectMarkdownSectionByAnchor(content, anchor) {
	if (!anchor) return content;
	const lines = content.split(/\r?\n/);
	const headingRe = /^(#{1,6})\s+(.+)$/;
	const wanted = anchor.toLowerCase();

	let startIndex = -1;
	let startDepth = 0;
	for (let i = 0; i < lines.length; i++) {
		const match = lines[i].match(headingRe);
		if (!match) continue;
		const depth = match[1].length;
		const id = getHeadingId(match[2]);
		if (id === wanted) {
			startIndex = i;
			startDepth = depth;
			break;
		}
	}

	if (startIndex === -1) return content;

	let endIndex = lines.length;
	for (let i = startIndex + 1; i < lines.length; i++) {
		const match = lines[i].match(headingRe);
		if (!match) continue;
		const depth = match[1].length;
		if (depth <= startDepth) {
			endIndex = i;
			break;
		}
	}

	return lines.slice(startIndex, endIndex).join('\n');
}

function stripFrontmatter(content) {
	return String(content).replace(/^---[\r\n][\s\S]*?[\r\n]---[\r\n]?/, '');
}

function resolveImportPath(specPath, currentDir, sourceRoot, docsDir) {
	if (specPath === '@') return sourceRoot;
	if (specPath.startsWith('@/')) return resolve(sourceRoot, specPath.slice(2));
	if (specPath.startsWith('@')) return resolve(sourceRoot, specPath.slice(1));
	if (specPath.startsWith('/')) return resolve(docsDir, specPath.slice(1));
	return resolve(currentDir, specPath);
}

function parseIncludeSpec(raw) {
	const withBraces = parseBraces(raw);
	const withRegion = parseRegion(withBraces.text);
	return {
		filePart: withRegion.filePart,
		regionOrAnchor: withRegion.regionOrAnchor,
		rangePart: withBraces.braces,
	};
}

function resolveIncludeContent(rawSpec, currentDir, docsDir, sourceRoot, stack) {
	const parsed = parseIncludeSpec(rawSpec);
	const includePath = resolveImportPath(parsed.filePart, currentDir, sourceRoot, docsDir);

	if (stack.includes(includePath) || !existsSync(includePath)) return '';

	let content = readFileSync(includePath, 'utf-8');
	if (parsed.regionOrAnchor) {
		const byRegion = selectRegion(content, parsed.regionOrAnchor);
		content = byRegion === content
			? selectMarkdownSectionByAnchor(content, parsed.regionOrAnchor)
			: byRegion;
	}
	if (parsed.rangePart) content = selectLines(content, parsed.rangePart);

	if (includePath.endsWith('.md')) {
		content = stripFrontmatter(content);
		content = resolveMarkdownIncludes(content, dirname(includePath), docsDir, sourceRoot, [...stack, includePath]);
	}

	return content;
}

function resolveMarkdownIncludes(content, currentDir, docsDir, sourceRoot, stack) {
	const lines = String(content).split(/\r?\n/);
	const out = [];
	let activeFence = null;

	for (const line of lines) {
		const trimmed = line.trim();

		const fenceMatch = trimmed.match(/^(```+|~~~+)/);
		if (fenceMatch) {
			const fence = fenceMatch[1][0];
			if (!activeFence) {
				activeFence = fence;
			} else if (activeFence === fence) {
				activeFence = null;
			}
			out.push(line);
			continue;
		}

		if (activeFence) {
			out.push(line);
			continue;
		}

		const includeMatch = trimmed.match(INCLUDE_RE);
		if (includeMatch?.[1]) {
			out.push(resolveIncludeContent(includeMatch[1].trim(), currentDir, docsDir, sourceRoot, stack));
			continue;
		}

		out.push(line);
	}

	return out.join('\n');
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

// â”€â”€ Index builder (cached) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Build the full search index from all docs in `docsDir`.
 * Results are cached per (docsDir+srcDir) so both Vite plugins share one pass.
 *
 * @param {string} docsDir  Absolute path to the docs directory.
 * @param {string} srcDir SPA route prefix, e.g. '/docs'.
 * @returns {Promise<SearchEntry[]>}
 */
export function buildSearchIndex(docsDir, srcDir) {
	const key = `${docsDir}::${srcDir}`;
	if (_cache.has(key)) return /** @type {Promise<SearchEntry[]>} */ (_cache.get(key));

	const promise = (async () => {
		const files = walkDir(docsDir);
		const index = [];
		const sourceRoot = resolve(docsDir, '..');

		for (const filePath of files) {
			let content;
			try { content = readFileSync(filePath, 'utf-8'); } catch { continue; }
			content = resolveMarkdownIncludes(content, dirname(filePath), docsDir, sourceRoot, [filePath]);

			const relPath = relative(docsDir, filePath)
				.replace(/\\/g, '/')
				.replace(/\.md$/, '');

			let routePath;
			if (relPath === 'index') {
				routePath = srcDir;
			} else if (relPath.endsWith('/index')) {
				routePath = srcDir + '/' + relPath.slice(0, -6);
			} else {
				routePath = srcDir + '/' + relPath;
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

// â”€â”€ Fuse.js result â†’ SearchResult  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
		return escapeHtml(text.slice(0, contextLen)) + (text.length > contextLen ? 'â€¦' : '');
	}
	const firstMatchStart = indices[0][0];
	const from = Math.max(0, firstMatchStart - 50);
	const to = Math.min(text.length, from + contextLen);
	const sliced = text.slice(from, to);
	const adjusted = indices
		.map(([s, e]) => [s - from, e - from])
		.filter(([s, e]) => e >= 0 && s < sliced.length)
		.map(([s, e]) => [Math.max(0, s), Math.min(sliced.length - 1, e)]);

	const prefix = from > 0 ? 'â€¦' : '';
	const suffix = to < text.length ? 'â€¦' : '';
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
 * @returns {{ id: string; title: string; titleHtml: string; sectionTitle: string; sectionTitleHtml: string; sectionAnchor: string; excerptHtml: string; score: number }}
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

	let excerptHtml = '', sectionTitle = '', sectionTitleHtml = '', sectionAnchor = '';

	if (sectionHeading) {
		const sec = item.sections[sectionHeading.refIndex];
		sectionTitle = sec?.heading ?? '';
		sectionTitleHtml = highlightText(sectionTitle, sectionHeading.indices);
		sectionAnchor = sec?.anchor ?? '';
		// Heading match is usually the most relevant intent signal.
		excerptHtml = escapeHtml((sec?.content ?? '').slice(0, 150));
	} else if (sectionContent) {
		const sec = item.sections[sectionContent.refIndex];
		sectionTitle = sec?.heading ?? '';
		sectionTitleHtml = escapeHtml(sectionTitle);
		sectionAnchor = sec?.anchor ?? '';
		excerptHtml = getExcerptHtml(sectionContent.value, sectionContent.indices);
	} else {
		sectionTitleHtml = escapeHtml(sectionTitle);
		excerptHtml = escapeHtml((item.sections[0]?.content ?? '').slice(0, 150));
	}

	if (!sectionTitleHtml) sectionTitleHtml = escapeHtml(sectionTitle);

	const titleHtml = titleMatch
		? highlightText(item.title, titleMatch.indices)
		: escapeHtml(item.title);

	return { id: item.id, title: item.title, titleHtml, sectionTitle, sectionTitleHtml, sectionAnchor, excerptHtml, score };
}
