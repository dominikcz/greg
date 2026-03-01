import fs from 'node:fs/promises';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';

const SNIPPET_RE = /^<<<\s+(.+)$/;
const INCLUDE_RE = /^<!--\s*@include:\s*([^\s]+)\s*-->$/;
const TITLE_RE = /\s+\[([^\]]+)\]\s*$/;
const BRACES_RE = /\{([^}]*)\}\s*$/;
const REGION_RE = /^(.*?)#([^#{]+)$/;

const extToLang = {
	'.js': 'js',
	'.mjs': 'js',
	'.cjs': 'js',
	'.ts': 'ts',
	'.tsx': 'tsx',
	'.jsx': 'jsx',
	'.json': 'json',
	'.css': 'css',
	'.scss': 'scss',
	'.html': 'html',
	'.md': 'md',
	'.sh': 'sh',
	'.bash': 'bash',
	'.yml': 'yaml',
	'.yaml': 'yaml',
};

function escapeRegExp(value) {
	return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Path resolution (3 rules + guard) ──────────────────────────────

/**
 * Derive the directory of the current .md file from VFile metadata.
 *
 * Handles three forms that mdsvex / vite-plugin-svelte may provide:
 *   1. Filesystem absolute   C:\…\docs\md\file.md   /home/…/docs/md/file.md
 *   2. Virtual absolute      /docs/md/file.md  (with docsDir prefix)
 *                            /md/file.md       (without docsDir prefix)
 *   3. Relative              md/file.md        (resolved via file.cwd)
 *
 * Falls back to <sourceRoot>/<docsDir> when no path info is available.
 */
function getCurrentDir(file, sourceRoot, docsDir) {
	const docsRoot = path.resolve(sourceRoot, docsDir);
	const raw =
		file?.path ||
		(Array.isArray(file?.history) && file.history.length > 0
			? file.history[file.history.length - 1]
			: null);
	if (!raw) return docsRoot;

	const normalized = path.normalize(raw);

	// Real filesystem absolute (starts inside sourceRoot or has a drive letter)
	if (
		path.isAbsolute(normalized) &&
		(normalized.startsWith(sourceRoot) || /^[a-zA-Z]:/.test(normalized))
	) {
		return path.dirname(normalized);
	}

	// Virtual absolute  /docs/… or /markdown/…
	if (raw.startsWith('/')) {
		const stripped = raw.replace(/^\/+/, '');
		const firstSeg = stripped.split(/[\\/]/)[0];
		const base = firstSeg === docsDir ? sourceRoot : docsRoot;
		return path.dirname(path.join(base, stripped));
	}

	// Relative — resolve against file.cwd or sourceRoot
	return path.dirname(path.resolve(file?.cwd || sourceRoot, raw));
}

/**
 * Expand the `$docs` alias in a path string.
 * `$docs/foo` → `<docsDir>/foo`,  `$docs` alone → `<docsDir>`
 */
function expandDocsAlias(specPath, docsDir) {
	if (specPath === '$docs') return docsDir;
	if (specPath.startsWith('$docs/')) return docsDir + specPath.slice(5);
	return specPath;
}

/**
 * Resolve an import specifier to an absolute file path.
 *
 *   @/path  or  @path   →  <sourceRoot>/path
 *   $docs/path           →  <sourceRoot>/<docsDir>/path
 *   /path               →  <docsRoot>/path
 *   ./path  ../path     →  <currentDir>/path
 */
function resolveImportPath(specPath, currentDir, sourceRoot, docsDir) {
	const expanded = expandDocsAlias(specPath, docsDir);
	if (expanded !== specPath) return path.resolve(sourceRoot, expanded);
	if (specPath === '@') return sourceRoot;
	if (specPath.startsWith('@/')) return path.resolve(sourceRoot, specPath.slice(2));
	if (specPath.startsWith('@')) return path.resolve(sourceRoot, specPath.slice(1));
	if (specPath.startsWith('/')) return path.resolve(sourceRoot, docsDir, specPath.slice(1));
	return path.resolve(currentDir, specPath);
}

/** Throw if resolvedPath escapes the source root. */
function assertInsideRoot(resolvedPath, sourceRoot) {
	const rel = path.relative(sourceRoot, resolvedPath);
	if (rel.startsWith('..') || path.isAbsolute(rel)) {
		throw new Error(`Import path "${resolvedPath}" escapes the source root "${sourceRoot}"`);
	}
}

function parseTitle(value) {
	const match = value.match(TITLE_RE);
	if (!match) return { text: value.trim(), title: '' };
	return { text: value.slice(0, match.index).trim(), title: match[1].trim() };
}

function parseBraces(value) {
	const match = value.match(BRACES_RE);
	if (!match) return { text: value.trim(), braces: '' };
	return { text: value.slice(0, match.index).trim(), braces: match[1].trim() };
}

function parseRegion(value) {
	const match = value.match(REGION_RE);
	if (!match) return { filePart: value.trim(), regionOrAnchor: '' };
	return { filePart: match[1].trim(), regionOrAnchor: match[2].trim() };
}

function parseRange(value) {
	const text = String(value ?? '').trim();
	if (!text) return null;
	if (/^\d+$/.test(text)) {
		const n = Number(text);
		return { start: n, end: n };
	}
	const match = text.match(/^(\d*)\s*,\s*(\d*)$/);
	if (!match) return null;
	const start = match[1] ? Number(match[1]) : null;
	const end = match[2] ? Number(match[2]) : null;
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

function slugifyHeading(value) {
	return value
		.toLowerCase()
		.replace(/<[^>]+>/g, '')
		.replace(/[^\w\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-');
}

function getHeadingId(rawHeadingText) {
	const customIdMatch = rawHeadingText.match(/\s*\{#([^}]+)\}\s*$/);
	if (customIdMatch?.[1]) return customIdMatch[1].trim().toLowerCase();
	return slugifyHeading(rawHeadingText.replace(/\s*\{#([^}]+)\}\s*$/, ''));
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

function inferLang(filePath, langOverride) {
	if (langOverride) return langOverride;
	const ext = path.extname(filePath).toLowerCase();
	return extToLang[ext] ?? ext.replace(/^\./, '') ?? '';
}

/** Reconstruct raw text from an inline mdast node (text, linkReference, image, etc.) */
function inlineNodeText(node) {
	if (!node) return '';
	if (node.type === 'text' || node.type === 'inlineCode') return node.value ?? '';
	if (node.type === 'linkReference') {
		const label = node.label ?? node.identifier ?? '';
		return `[${label}]`;
	}
	if (node.type === 'link') return node.children?.map(inlineNodeText).join('') ?? '';
	if (node.children) return node.children.map(inlineNodeText).join('');
	return '';
}

async function readText(filePath) {
	try {
		return await fs.readFile(filePath, 'utf8');
	} catch (err) {
		if (err.code === 'ENOENT') return null;
		throw err;
	}
}

function parseSnippetSpec(raw) {
	const withTitle = parseTitle(raw);
	const withBraces = parseBraces(withTitle.text);
	const withRegion = parseRegion(withBraces.text);

	let rangePart = '';
	let langOverride = '';
	let metaTail = '';

	if (withBraces.braces) {
		const tokens = withBraces.braces.split(/\s+/).filter(Boolean);
		if (tokens.length > 0 && /^(\d+|\d*\s*,\s*\d*)$/.test(tokens[0])) {
			rangePart = tokens.shift() ?? '';
		}
		if (tokens.length > 0 && !tokens[0].includes(':')) {
			langOverride = tokens.shift() ?? '';
		}
		metaTail = tokens.join(' ').trim();
	}

	return {
		title: withTitle.title,
		filePart: withRegion.filePart,
		regionOrAnchor: withRegion.regionOrAnchor,
		rangePart,
		langOverride,
		metaTail,
	};
}

function buildCodeMeta(title, metaTail) {
	const parts = [];
	if (metaTail) parts.push(metaTail);
	if (title) parts.push(`[${title}]`);
	return parts.join(' ').trim() || null;
}

async function buildSnippetNode(rawSpec, currentDir, sourceRoot, docsDir) {
	const parsed = parseSnippetSpec(rawSpec);
	const absolutePath = resolveImportPath(parsed.filePart, currentDir, sourceRoot, docsDir);
	assertInsideRoot(absolutePath, sourceRoot);
	let content = await readText(absolutePath);

	if (content === null) {
		return {
			type: 'code',
			lang: 'text',
			meta: '',
			value: `[remarkImports] File not found: ${absolutePath}`,
		};
	}

	if (parsed.regionOrAnchor) {
		content = selectRegion(content, parsed.regionOrAnchor);
	}
	if (parsed.rangePart) {
		content = selectLines(content, parsed.rangePart);
	}

	const lang = inferLang(absolutePath, parsed.langOverride);
	const meta = buildCodeMeta(parsed.title, parsed.metaTail);
	return {
		type: 'code',
		lang: lang || null,
		meta,
		value: content,
	};
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

async function buildIncludeNodes(rawSpec, currentDir, sourceRoot, docsDir) {
	const parsed = parseIncludeSpec(rawSpec);
	const absolutePath = resolveImportPath(parsed.filePart, currentDir, sourceRoot, docsDir);
	assertInsideRoot(absolutePath, sourceRoot);
	let content = await readText(absolutePath);

	if (content === null) {
		return { nodes: [{ type: 'paragraph', children: [{ type: 'text', value: `[remarkImports] File not found: ${absolutePath}` }] }], includeDir: currentDir };
	}

	if (parsed.regionOrAnchor) {
		const byRegion = selectRegion(content, parsed.regionOrAnchor);
		content = byRegion === content ? selectMarkdownSectionByAnchor(content, parsed.regionOrAnchor) : byRegion;
	}

	if (parsed.rangePart) {
		content = selectLines(content, parsed.rangePart);
	}

	const tree = unified().use(remarkParse).parse(content);
	return { nodes: tree.children ?? [], includeDir: path.dirname(absolutePath) };
}

function markNodesBaseDir(nodes, baseDir) {
	if (!Array.isArray(nodes)) return;
	for (const node of nodes) {
		node.data = node.data ?? {};
		node.data.__includeDir = baseDir;
		if (Array.isArray(node.children)) {
			markNodesBaseDir(node.children, baseDir);
		}
	}
}

const EXTERNAL_URL_RE = /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i;

/**
 * Normalize a link URL to match VitePress routing conventions:
 *  - Strip .md extension   (e.g. ./routing.md  →  ./routing)
 *  - Strip .html extension (e.g. ./routing.html →  ./routing)
 *  - Collapse /index suffix (e.g. ./guide/index →  ./guide)
 * Only applied to internal (non-external) links, not to images.
 */
function normalizeInternalLinkUrl(url) {
	if (EXTERNAL_URL_RE.test(url)) return url;
	// Separate the hash fragment, if any
	const hashIdx = url.indexOf('#');
	const pathPart = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
	const hashPart = hashIdx >= 0 ? url.slice(hashIdx) : '';

	let normalized = pathPart
		.replace(/\.(md|html)$/i, '')  // strip .md / .html
		.replace(/\/index$/, '');      // /foo/index → /foo

	return (normalized || '.') + hashPart;
}

/** Expand `$docs` alias in link/image URLs (remark AST), and normalize internal link URLs. */
function expandAliasInUrls(node, docsDir) {
	if ((node.type === 'link' || node.type === 'image') && typeof node.url === 'string') {
		const expanded = expandDocsAlias(node.url, docsDir);
		if (expanded !== node.url) node.url = expanded;
	}
	// Normalize internal link URLs to VitePress routing conventions (links only, not images).
	// Skip normalization when the link has an explicit target attribute (e.g. {target="_self"}),
	// which signals a non-VitePress page where the .html extension must be preserved.
	if (node.type === 'link' && typeof node.url === 'string') {
		const hasExplicitTarget = node.data?.hProperties?.target;
		if (!hasExplicitTarget) {
			node.url = normalizeInternalLinkUrl(node.url);
		}
	}
}

async function transformChildren(children, currentDir, sourceRoot, docsDir, depth) {
	if (!Array.isArray(children) || depth > 20) return;

	for (let i = 0; i < children.length; i++) {
		const node = children[i];
		const nodeDir = node?.data?.__includeDir || currentDir;

		// Expand $docs alias in links and images
		expandAliasInUrls(node, docsDir);

		if (node?.type === 'paragraph' && Array.isArray(node.children)) {
			// Reconstruct the raw line by joining all inline node values.
			// This handles cases where remark-parse splits the line into multiple
			// inline nodes, e.g. `[title]` becoming a linkReference child.
			const line = node.children.map(inlineNodeText).join('').trim();
			const snippetMatch = line.match(SNIPPET_RE);
			if (snippetMatch?.[1]) {
				const snippetNode = await buildSnippetNode(snippetMatch[1].trim(), nodeDir, sourceRoot, docsDir);
				children.splice(i, 1, snippetNode);
				continue;
			}
		}

		if (node?.type === 'html') {
			const line = String(node.value ?? '').trim();
			const includeMatch = line.match(INCLUDE_RE);
			if (includeMatch?.[1]) {
				const included = await buildIncludeNodes(includeMatch[1].trim(), nodeDir, sourceRoot, docsDir);
				markNodesBaseDir(included.nodes, included.includeDir);
				children.splice(i, 1, ...included.nodes);
				i -= 1;
				continue;
			}
		}

		if (Array.isArray(node?.children)) {
			await transformChildren(node.children, nodeDir, sourceRoot, docsDir, depth + 1);
		}
	}
}

export function remarkImports(options = {}) {
	const sourceRoot = path.resolve(options.sourceRoot ?? options.rootDir ?? process.cwd());
	const docsDir = String(options.docsDir ?? 'docs').replace(/^\/+|\/+$/g, '') || 'docs';

	return async (tree, file) => {
		const currentDir = getCurrentDir(file, sourceRoot, docsDir);
		await transformChildren(tree.children, currentDir, sourceRoot, docsDir, 0);
	};
}

export default remarkImports;
