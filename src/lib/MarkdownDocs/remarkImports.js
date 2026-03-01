import fs from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
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

const MARKDOWN_EXTENSIONS = new Set(['.md', '.svx']);

function escapeRegExp(value) {
	return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toPosix(value) {
	return String(value ?? '').replace(/\\/g, '/');
}

function isWindowsAbsolute(value) {
	return /^[a-zA-Z]:[\\/]/.test(value);
}

function normalizeDocsDir(value) {
	const normalized = toPosix(String(value ?? 'docs')).replace(/^\/+|\/+$/g, '');
	return normalized || 'docs';
}

function pickPreferredPath(candidates) {
	const values = candidates.filter(Boolean);
	for (const candidate of values) {
		if (existsSync(candidate)) return candidate;
	}
	return values[0] ?? null;
}

function toAbsoluteFilePath(candidate, sourceRoot, docsDir) {
	const raw = String(candidate ?? '').trim();
	if (!raw) return null;

	if (raw.startsWith('file://')) {
		try {
			const url = new URL(raw);
			return path.normalize(decodeURIComponent(url.pathname));
		} catch {
			return null;
		}
	}

	if (isWindowsAbsolute(raw)) {
		return path.normalize(raw);
	}

	const posix = toPosix(raw);
	if (posix.startsWith('/')) {
		const relative = posix.replace(/^\/+/, '');
		const fromRoot = path.resolve(sourceRoot, `.${posix}`);
		const fromDocsDir = relative.startsWith(`${docsDir}/`) ? null : path.resolve(sourceRoot, docsDir, relative);
		return pickPreferredPath([fromDocsDir, fromRoot]);
	}

	if (posix.includes('/')) {
		const fromRoot = path.resolve(sourceRoot, posix);
		const fromDocsDir = posix.startsWith(`${docsDir}/`) ? null : path.resolve(sourceRoot, docsDir, posix);
		return pickPreferredPath([fromRoot, fromDocsDir]);
	}

	return null;
}

function isLikelyDocsRoute(absolutePath, sourceRoot, docsDir) {
	const relative = toPosix(path.relative(sourceRoot, absolutePath));
	if (!relative || relative.startsWith('..')) return false;
	return relative === docsDir || relative.startsWith(`${docsDir}/`);
}

function getDocsRoot(sourceRoot, docsDir) {
	return path.resolve(sourceRoot, docsDir);
}

function isPathInside(childPath, parentPath) {
	const relative = path.relative(parentPath, childPath);
	return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function findMarkdownFileByBaseName(docsRoot, baseName) {
	if (!existsSync(docsRoot)) return null;

	const wantedNames = new Set();
	if (baseName.endsWith('.md') || baseName.endsWith('.svx')) {
		wantedNames.add(baseName);
	} else {
		wantedNames.add(`${baseName}.md`);
		wantedNames.add(`${baseName}.svx`);
	}

	const matches = [];
	const stack = [docsRoot];

	while (stack.length && matches.length < 2) {
		const current = stack.pop();
		if (!current) continue;

		for (const entry of readdirSync(current, { withFileTypes: true })) {
			const absolute = path.join(current, entry.name);
			if (entry.isDirectory()) {
				stack.push(absolute);
				continue;
			}
			if (entry.isFile() && wantedNames.has(entry.name)) {
				matches.push(absolute);
				if (matches.length >= 2) break;
			}
		}
	}

	return matches.length === 1 ? matches[0] : null;
}

function findFileByRelativeTail(docsRoot, specPath) {
	if (!existsSync(docsRoot)) return null;

	const raw = toPosix(String(specPath ?? '').trim());
	if (!raw) return null;
	const tail = raw.replace(/^\.\//, '').replace(/^\/+/, '');
	if (!tail) return null;

	const matches = [];
	const stack = [docsRoot];

	while (stack.length && matches.length < 2) {
		const current = stack.pop();
		if (!current) continue;

		for (const entry of readdirSync(current, { withFileTypes: true })) {
			const absolute = path.join(current, entry.name);
			if (entry.isDirectory()) {
				stack.push(absolute);
				continue;
			}
			if (!entry.isFile()) continue;

			const relative = toPosix(path.relative(docsRoot, absolute));
			if (relative === tail || relative.endsWith(`/${tail}`)) {
				matches.push(absolute);
				if (matches.length >= 2) break;
			}
		}
	}

	return matches.length === 1 ? matches[0] : null;
}

function getMarkdownNameCandidates(file) {
	const names = [];
	const data = file?.data ?? {};

	if (typeof file?.basename === 'string') names.push(file.basename);
	if (typeof file?.stem === 'string' && file.stem) names.push(file.stem);
	if (typeof data.basename === 'string') names.push(data.basename);
	if (typeof data.stem === 'string' && data.stem) names.push(data.stem);

	return names
		.map((value) => String(value).trim())
		.filter(Boolean)
		.map((value) => value.split(/[?#]/, 1)[0]);
}

function getSourceDirFromVFile(file, sourceRoot, docsDir) {
	const candidates = [];

	if (file?.path) candidates.push(file.path);
	if (Array.isArray(file?.history)) candidates.push(...file.history);

	const data = file?.data ?? {};
	if (data.path) candidates.push(data.path);
	if (data.filePath) candidates.push(data.filePath);
	if (data.filepath) candidates.push(data.filepath);
	if (data.filename) candidates.push(data.filename);

	for (const candidate of candidates) {
		const absolute = toAbsoluteFilePath(candidate, sourceRoot, docsDir);
		if (!absolute) continue;

		if (isLikelyDocsRoute(absolute, sourceRoot, docsDir)) {
			const docsRoot = getDocsRoot(sourceRoot, docsDir);
			if (path.normalize(absolute) === path.normalize(docsRoot)) {
				return docsRoot;
			}
			return path.dirname(absolute);
		}

		const ext = path.extname(absolute).toLowerCase();
		if (MARKDOWN_EXTENSIONS.has(ext)) {
			return path.dirname(absolute);
		}
	}

	const docsRoot = getDocsRoot(sourceRoot, docsDir);
	for (const name of getMarkdownNameCandidates(file)) {
		const found = findMarkdownFileByBaseName(docsRoot, name);
		if (!found) continue;
		const dir = path.dirname(found);
		if (isPathInside(dir, docsRoot) || path.normalize(dir) === path.normalize(docsRoot)) {
			return dir;
		}
	}

	return sourceRoot;
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

async function readText(filePath) {
	return fs.readFile(filePath, 'utf8');
}

function resolvePath(specPath, currentDir, sourceRoot) {
	if (specPath === '@') {
		return sourceRoot;
	}
	if (specPath.startsWith('@/')) {
		return path.resolve(sourceRoot, specPath.slice(2));
	}
	if (specPath.startsWith('@')) {
		return path.resolve(sourceRoot, specPath.slice(1));
	}
	if (path.isAbsolute(specPath)) {
		return specPath;
	}
	return path.resolve(currentDir, specPath);
}

function resolvePathWithFallback(specPath, currentDir, sourceRoot, docsDir) {
	const resolved = resolvePath(specPath, currentDir, sourceRoot);
	if (specPath.startsWith('@') || path.isAbsolute(specPath)) {
		return resolved;
	}

	if (existsSync(resolved)) {
		return resolved;
	}

	const docsRoot = getDocsRoot(sourceRoot, docsDir);
	const fallback = findFileByRelativeTail(docsRoot, specPath);
	return fallback ?? resolved;
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
	const absolutePath = resolvePathWithFallback(parsed.filePart, currentDir, sourceRoot, docsDir);
	let content = await readText(absolutePath);

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
	const absolutePath = resolvePathWithFallback(parsed.filePart, currentDir, sourceRoot, docsDir);
	let content = await readText(absolutePath);

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

async function transformChildren(children, currentDir, sourceRoot, docsDir, depth) {
	if (!Array.isArray(children) || depth > 20) return;

	for (let i = 0; i < children.length; i++) {
		const node = children[i];
		const nodeDir = node?.data?.__includeDir || currentDir;

		if (
			node?.type === 'paragraph' &&
			Array.isArray(node.children) &&
			node.children.length === 1 &&
			node.children[0]?.type === 'text'
		) {
			const line = String(node.children[0].value ?? '').trim();
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
	const docsDir = normalizeDocsDir(options.docsDir ?? 'docs');

	return async (tree, file) => {
		const currentDir = getSourceDirFromVFile(file, sourceRoot, docsDir);
		await transformChildren(tree.children, currentDir, sourceRoot, docsDir, 0);
	};
}

export default remarkImports;
