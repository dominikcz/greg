/**
 * scripts/render-markdown.js
 *
 * Build a "human-readable" markdown export by resolving Greg include/snippet
 * directives for every docs page.
 *
 * Supported directives:
 *   - <<< ./snippet.js{1,20 js} [Optional title]
 *   - <!-- @include: ./other.md -->
 *
 * Usage:
 *   node scripts/render-markdown.js
 *   node scripts/render-markdown.js --docsDir docs --outDir dist/resolved-markdown
 */

import fs from 'node:fs/promises';
import path from 'node:path';

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

function parseArgs(argv) {
    const out = {
        docsDir: 'docs',
        outDir: 'dist/resolved-markdown',
    };

    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--docsDir' && argv[i + 1]) out.docsDir = argv[++i];
        if (a === '--outDir' && argv[i + 1]) out.outDir = argv[++i];
    }
    return out;
}

function normalizeSlashes(value) {
    return String(value).replace(/\\/g, '/');
}

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
    if (/^\d+$/.test(text)) {
        const n = Number(text);
        return { start: n, end: n };
    }
    const dashMatch = text.match(/^(\d+)\s*-\s*(\d+)$/);
    if (dashMatch) {
        return { start: Number(dashMatch[1]), end: Number(dashMatch[2]) };
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

function stripFrontmatter(content) {
    return String(content).replace(/^---[\r\n][\s\S]*?[\r\n]---[\r\n]?/, '');
}

function inferLang(filePath, langOverride) {
    if (langOverride) return langOverride;
    const ext = path.extname(filePath).toLowerCase();
    return extToLang[ext] ?? ext.replace(/^\./, '') ?? 'text';
}

function resolveImportPath(specPath, currentDir, sourceRoot, docsDir) {
    if (specPath === '@') return sourceRoot;
    if (specPath.startsWith('@/')) return path.resolve(sourceRoot, specPath.slice(2));
    if (specPath.startsWith('@')) return path.resolve(sourceRoot, specPath.slice(1));
    if (specPath.startsWith('/')) return path.resolve(sourceRoot, docsDir, specPath.slice(1));
    return path.resolve(currentDir, specPath);
}

function assertInsideRoot(resolvedPath, sourceRoot) {
    const rel = path.relative(sourceRoot, resolvedPath);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
        throw new Error(`Import path "${resolvedPath}" escapes source root "${sourceRoot}"`);
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
        if (tokens.length > 0 && /^(\d+|\d*\s*,\s*\d*|\d+\s*-\s*\d+)$/.test(tokens[0])) {
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
    return parts.join(' ').trim();
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

function toFence(lang, meta, code) {
    const header = [lang || 'text', meta || ''].filter(Boolean).join(' ').trim();
    return `\`\`\`${header}\n${code}\n\`\`\``;
}

async function readText(filePath) {
    try {
        return await fs.readFile(filePath, 'utf8');
    } catch (err) {
        if (err?.code === 'ENOENT') return null;
        throw err;
    }
}

async function resolveSnippet(rawSpec, currentDir, context) {
    const parsed = parseSnippetSpec(rawSpec);
    const abs = resolveImportPath(parsed.filePart, currentDir, context.sourceRoot, context.docsDirRel);
    assertInsideRoot(abs, context.sourceRoot);

    let content = await readText(abs);
    if (content == null) {
        return toFence('text', '', `[render-markdown] File not found: ${normalizeSlashes(abs)}`);
    }

    if (parsed.regionOrAnchor) content = selectRegion(content, parsed.regionOrAnchor);
    if (parsed.rangePart) content = selectLines(content, parsed.rangePart);

    const meta = buildCodeMeta(parsed.title, parsed.metaTail);
    return toFence(inferLang(abs, parsed.langOverride), meta, content);
}

async function resolveInclude(rawSpec, currentDir, context, stack) {
    const parsed = parseIncludeSpec(rawSpec);
    const abs = resolveImportPath(parsed.filePart, currentDir, context.sourceRoot, context.docsDirRel);
    assertInsideRoot(abs, context.sourceRoot);

    if (stack.includes(abs)) {
        return `\n> [render-markdown] Circular include skipped: ${normalizeSlashes(abs)}\n`;
    }

    let content = await readText(abs);
    if (content == null) {
        return `\n> [render-markdown] Include file not found: ${normalizeSlashes(abs)}\n`;
    }

    if (parsed.regionOrAnchor) {
        const byRegion = selectRegion(content, parsed.regionOrAnchor);
        content = byRegion === content ? selectMarkdownSectionByAnchor(content, parsed.regionOrAnchor) : byRegion;
    }
    if (parsed.rangePart) content = selectLines(content, parsed.rangePart);

    const ext = path.extname(abs).toLowerCase();
    if (ext === '.md') {
        content = stripFrontmatter(content);
        return resolveMarkdownContent(content, path.dirname(abs), context, [...stack, abs]);
    }

    return content;
}

async function resolveMarkdownContent(content, currentDir, context, stack) {
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

        const snippetMatch = trimmed.match(SNIPPET_RE);
        if (snippetMatch?.[1]) {
            out.push(await resolveSnippet(snippetMatch[1].trim(), currentDir, context));
            continue;
        }

        const includeMatch = trimmed.match(INCLUDE_RE);
        if (includeMatch?.[1]) {
            out.push(await resolveInclude(includeMatch[1].trim(), currentDir, context, stack));
            continue;
        }

        out.push(line);
    }

    return out.join('\n');
}

async function walkMarkdownFiles(dir, root = dir, acc = []) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name.startsWith('__')) continue;
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await walkMarkdownFiles(abs, root, acc);
            continue;
        }
        if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
        acc.push({ abs, rel: normalizeSlashes(path.relative(root, abs)) });
    }
    return acc;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const sourceRoot = process.cwd();
    const docsDirRel = String(args.docsDir || 'docs').replace(/^\/+|\/+$/g, '') || 'docs';
    const docsDirAbs = path.resolve(sourceRoot, docsDirRel);
    const outDirAbs = path.resolve(sourceRoot, args.outDir);

    const files = await walkMarkdownFiles(docsDirAbs);
    await fs.mkdir(outDirAbs, { recursive: true });

    const context = { sourceRoot, docsDirRel };
    let written = 0;

    for (const file of files) {
        const src = await fs.readFile(file.abs, 'utf8');
        const resolved = await resolveMarkdownContent(src, path.dirname(file.abs), context, [file.abs]);

        const outPath = path.join(outDirAbs, file.rel);
        await fs.mkdir(path.dirname(outPath), { recursive: true });
        await fs.writeFile(outPath, resolved, 'utf8');
        written++;
    }

    const summaryPath = path.join(outDirAbs, '_summary.json');
    await fs.writeFile(
        summaryPath,
        JSON.stringify(
            {
                generatedAt: new Date().toISOString(),
                docsDir: normalizeSlashes(path.relative(sourceRoot, docsDirAbs)),
                outDir: normalizeSlashes(path.relative(sourceRoot, outDirAbs)),
                pages: written,
            },
            null,
            2,
        ) + '\n',
        'utf8',
    );

    console.log(`Resolved markdown export complete: ${written} files -> ${normalizeSlashes(path.relative(sourceRoot, outDirAbs))}`);
}

main().catch((err) => {
    console.error('[render-markdown] Failed:', err);
    process.exit(1);
});
