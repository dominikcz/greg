/**
 * remarkImportsBrowser
 *
 * Browser-compatible port of remarkImports.js.
 * Uses fetch() instead of node:fs for all file reads.
 * Uses URL-based path resolution instead of node:path.
 *
 * Supports exactly the same syntax as remarkImports:
 *   <<< ./snippet.js              — inline code snippet
 *   <!-- @include: ./other.md --> — inline markdown
 *   `@/` alias, regions, line ranges, etc.
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';

// ── Regex patterns (same as remarkImports) ────────────────────────────────────

const SNIPPET_RE = /^<<<\s+(.+)$/;
const INCLUDE_RE = /^<!--\s*@include:\s*([^\s]+)\s*-->$/;
const TITLE_RE = /\s+\[([^\]]+)\]\s*$/;
const BRACES_RE = /\{([^}]*)\}\s*$/;
const REGION_RE = /^(.*?)#([^#{]+)$/;
const EXTERNAL_URL_RE = /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i;

const extToLang = {
    '.js': 'js', '.mjs': 'js', '.cjs': 'js',
    '.ts': 'ts', '.tsx': 'tsx', '.jsx': 'jsx',
    '.json': 'json', '.css': 'css', '.scss': 'scss',
    '.html': 'html', '.md': 'md', '.sh': 'sh',
    '.bash': 'bash', '.yml': 'yaml', '.yaml': 'yaml',
};

const PARSE_BASE_ORIGIN =
    typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://example.invalid';

// ── URL / path utilities ──────────────────────────────────────────────────────

/** Browser-safe extname: '/foo/bar.js' → '.js' */
function extname(urlPath) {
    const filename = (urlPath ?? '').split('/').pop() ?? '';
    const dotIdx = filename.lastIndexOf('.');
    return dotIdx > 0 ? filename.slice(dotIdx).toLowerCase() : '';
}

/**
 * Resolve a remarkImports specifier to an absolute URL path.
 *
 *   `@/path` or `@path`  → /path  (site root)
 *   /path               → docsPrefix/path  (relative to docsDir root)
 *   ./path  ../path     → resolved relative to currentDirUrl
 */
function resolveImportUrl(specifier, currentDirUrl, docsPrefix) {
    const cleanPrefix = docsPrefix.replace(/\/+$/, '');

    if (specifier === '@') return '/';
    if (specifier.startsWith('@/')) return '/' + specifier.slice(2);
    if (specifier.startsWith('@')) return '/' + specifier.slice(1);

    // /absolute → inside docsPrefix
    if (specifier.startsWith('/')) {
        if (specifier === cleanPrefix || specifier.startsWith(cleanPrefix + '/')) return specifier;
        return cleanPrefix + specifier;
    }

    // relative (./foo, ../bar, plain name)
    // Append trailing slash to currentDirUrl to ensure correct resolution
    const base = currentDirUrl.endsWith('/') ? currentDirUrl : currentDirUrl + '/';
    try {
        return new URL(specifier, PARSE_BASE_ORIGIN + base).pathname;
    } catch {
        return cleanPrefix + '/' + specifier;
    }
}

function inferLang(urlPath, langOverride) {
    if (langOverride) return langOverride;
    const ext = extname(urlPath);
    return extToLang[ext] ?? ext.replace(/^\./, '') ?? '';
}

/** Normalize internal doc links: strip .md/.html, collapse /index */
function normalizeInternalLinkUrl(url) {
    if (EXTERNAL_URL_RE.test(url)) return url;
    const hashIdx = url.indexOf('#');
    const pathPart = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
    const hashPart = hashIdx >= 0 ? url.slice(hashIdx) : '';
    const normalized = pathPart
        .replace(/\.(md|html)$/i, '')
        .replace(/\/index$/, '');
    return (normalized || '.') + hashPart;
}

function expandAliasInUrls(node, currentDirUrl, docsPrefix) {
    if (node.type === 'link' && typeof node.url === 'string') {
        if (node.url.startsWith('#')) return;
        if (!node.data?.hProperties?.target) {
            const resolved = resolveImportUrl(node.url, currentDirUrl, docsPrefix);
            node.url = normalizeInternalLinkUrl(resolved);
        }
    }
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchText(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.text();
    } catch {
        return null;
    }
}

// ── Spec parsers (identical logic to remarkImports) ───────────────────────────

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    if (/^\d+$/.test(text)) { const n = Number(text); return { start: n, end: n }; }
    const match = text.match(/^(\d*)\s*,\s*(\d*)$/);
    if (!match) return null;
    return { start: match[1] ? Number(match[1]) : null, end: match[2] ? Number(match[2]) : null };
}

function selectLines(content, rangeText) {
    const range = parseRange(rangeText);
    if (!range) return content;
    const lines = content.split(/\r?\n/);
    const start = range.start ?? 1;
    const end = range.end ?? lines.length;
    return lines.slice(Math.max(1, start) - 1, Math.max(start, Math.min(end, lines.length))).join('\n');
}

function selectRegion(content, regionName) {
    if (!regionName) return content;
    const lines = content.split(/\r?\n/);
    const re = escapeRegExp(regionName);
    const startRe = new RegExp(`#region\\s+${re}\\s*$`, 'i');
    const endRe = new RegExp(`#endregion\\s+${re}\\s*$`, 'i');
    let start = -1, end = -1;
    for (let i = 0; i < lines.length; i++) {
        if (start === -1 && startRe.test(lines[i])) { start = i; continue; }
        if (start !== -1 && endRe.test(lines[i])) { end = i; break; }
    }
    if (start === -1 || end === -1 || end <= start) return content;
    return lines.slice(start + 1, end).join('\n');
}

function slugifyHeading(v) {
    return v.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
}

function getHeadingId(raw) {
    const m = raw.match(/\s*\{#([^}]+)\}\s*$/);
    if (m?.[1]) return m[1].trim().toLowerCase();
    return slugifyHeading(raw.replace(/\s*\{#([^}]+)\}\s*$/, ''));
}

function selectMarkdownSectionByAnchor(content, anchor) {
    if (!anchor) return content;
    const lines = content.split(/\r?\n/);
    const headingRe = /^(#{1,6})\s+(.+)$/;
    const wanted = anchor.toLowerCase();
    let startIndex = -1, startDepth = 0;
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(headingRe);
        if (!m) continue;
        if (getHeadingId(m[2]) === wanted) { startIndex = i; startDepth = m[1].length; break; }
    }
    if (startIndex === -1) return content;
    let endIndex = lines.length;
    for (let i = startIndex + 1; i < lines.length; i++) {
        const m = lines[i].match(headingRe);
        if (m && m[1].length <= startDepth) { endIndex = i; break; }
    }
    return lines.slice(startIndex, endIndex).join('\n');
}

function parseSnippetSpec(raw) {
    const withTitle = parseTitle(raw);
    const withBraces = parseBraces(withTitle.text);
    const withRegion = parseRegion(withBraces.text);
    let rangePart = '', langOverride = '', metaTail = '';
    if (withBraces.braces) {
        const tokens = withBraces.braces.split(/\s+/).filter(Boolean);
        if (tokens.length > 0 && /^(\d+|\d*\s*,\s*\d*)$/.test(tokens[0])) rangePart = tokens.shift() ?? '';
        if (tokens.length > 0 && !tokens[0].includes(':')) langOverride = tokens.shift() ?? '';
        metaTail = tokens.join(' ').trim();
    }
    return { title: withTitle.title, filePart: withRegion.filePart, regionOrAnchor: withRegion.regionOrAnchor, rangePart, langOverride, metaTail };
}

function buildCodeMeta(title, metaTail) {
    const parts = [];
    if (metaTail) parts.push(metaTail);
    if (title) parts.push(`[${title}]`);
    return parts.join(' ').trim() || null;
}

function inlineNodeText(node) {
    if (!node) return '';
    if (node.type === 'text' || node.type === 'inlineCode') return node.value ?? '';
    if (node.type === 'linkReference') return `[${node.label ?? node.identifier ?? ''}]`;
    if (node.type === 'link') return node.children?.map(inlineNodeText).join('') ?? '';
    if (node.children) return node.children.map(inlineNodeText).join('');
    return '';
}

// ── Async tree transformers ───────────────────────────────────────────────────

async function buildSnippetNode(rawSpec, currentDirUrl, docsPrefix) {
    const parsed = parseSnippetSpec(rawSpec);
    const url = resolveImportUrl(parsed.filePart, currentDirUrl, docsPrefix);
    let content = await fetchText(url);
    if (content === null) {
        return { type: 'code', lang: 'text', meta: '', value: `[remarkImports] File not found: ${url}` };
    }
    if (parsed.regionOrAnchor) content = selectRegion(content, parsed.regionOrAnchor);
    if (parsed.rangePart) content = selectLines(content, parsed.rangePart);
    const lang = inferLang(url, parsed.langOverride);
    return { type: 'code', lang: lang || null, meta: buildCodeMeta(parsed.title, parsed.metaTail), value: content };
}

async function buildIncludeNodes(rawSpec, currentDirUrl, docsPrefix) {
    const withBraces = parseBraces(rawSpec);
    const withRegion = parseRegion(withBraces.text);
    const url = resolveImportUrl(withRegion.filePart, currentDirUrl, docsPrefix);
    let content = await fetchText(url);
    if (content === null) {
        return {
            nodes: [{ type: 'paragraph', children: [{ type: 'text', value: `[remarkImports] File not found: ${url}` }] }],
            includeDirUrl: currentDirUrl,
        };
    }
    if (withRegion.regionOrAnchor) {
        const byRegion = selectRegion(content, withRegion.regionOrAnchor);
        content = byRegion === content ? selectMarkdownSectionByAnchor(content, withRegion.regionOrAnchor) : byRegion;
    }
    if (withBraces.braces) content = selectLines(content, withBraces.braces);
    // Strip frontmatter from included files
    content = content.replace(/^---[\r\n][\s\S]*?[\r\n]---[\r\n]?/, '');
    const tree = unified().use(remarkParse).parse(content);
    const includeDirUrl = url.substring(0, url.lastIndexOf('/') + 1);
    return { nodes: tree.children ?? [], includeDirUrl };
}

function markNodesBaseDir(nodes, dirUrl) {
    for (const node of nodes) {
        node.data = node.data ?? {};
        node.data.__includeDirUrl = dirUrl;
        if (Array.isArray(node.children)) markNodesBaseDir(node.children, dirUrl);
    }
}

async function transformChildren(children, currentDirUrl, docsPrefix, depth) {
    if (!Array.isArray(children) || depth > 20) return;
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        const nodeDir = node?.data?.__includeDirUrl || currentDirUrl;
        expandAliasInUrls(node, nodeDir, docsPrefix);

        if (node?.type === 'paragraph' && Array.isArray(node.children)) {
            const line = node.children.map(inlineNodeText).join('').trim();
            const m = line.match(SNIPPET_RE);
            if (m?.[1]) {
                const snippetNode = await buildSnippetNode(m[1].trim(), nodeDir, docsPrefix);
                children.splice(i, 1, snippetNode);
                continue;
            }
        }

        if (node?.type === 'html') {
            const line = String(node.value ?? '').trim();
            const m = line.match(INCLUDE_RE);
            if (m?.[1]) {
                const included = await buildIncludeNodes(m[1].trim(), nodeDir, docsPrefix);
                markNodesBaseDir(included.nodes, included.includeDirUrl);
                children.splice(i, 1, ...included.nodes);
                i -= 1;
                continue;
            }
        }

        if (Array.isArray(node?.children)) {
            await transformChildren(node.children, nodeDir, docsPrefix, depth + 1);
        }
    }
}

// ── Plugin export ─────────────────────────────────────────────────────────────

/**
 * @param {{ baseUrl?: string, docsPrefix?: string }} options
 *   baseUrl    - the URL path of the current markdown file, e.g. '/docs/guide/getting-started.md'
 *   docsPrefix - the docs root prefix, e.g. '/docs' (default: '/docs')
 */
export function remarkImportsBrowser(options = {}) {
    const docsPrefix = (options.docsPrefix ?? '/docs').replace(/\/+$/, '');
    const baseUrl = options.baseUrl ?? docsPrefix + '/index.md';
    const currentDirUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);

    return async (tree) => {
        await transformChildren(tree.children, currentDirUrl, docsPrefix, 0);
    };
}

export default remarkImportsBrowser;
