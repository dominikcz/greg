/**
 * rehypePdfChapter — prepares one rendered page for inclusion in a PDF book.
 *
 * - prefixes every `id` (and `<a name>`) with the chapter prefix, so headings
 *   from different pages never collide (`#intro` → `#c-guide-routing--intro`);
 * - removes header permalink anchors (`#` before headings);
 * - resolves relative `src` / `href` against the markdown file URL, because the
 *   print route lives at a different URL than the page itself;
 * - applies the same to raw HTML embedded in Markdown.
 *
 * Fragment-only links (`#x`) are left alone: they are resolved later, when the
 * whole book is in the DOM and anchors from other chapters are known.
 */
import { visit, SKIP } from 'unist-util-visit';

const EXTERNAL_RE = /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i;

function classList(node) {
    const value = node.properties?.className ?? node.properties?.class;
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string') return value.split(/\s+/);
    return [];
}

/** Resolve a relative URL against the directory of `fileUrl` (a site path). */
export function resolveRelativeUrl(value, fileUrl) {
    const url = String(value ?? '').trim();
    if (!url || url.startsWith('#') || url.startsWith('/') || EXTERNAL_RE.test(url)) return url;
    try {
        const dir = String(fileUrl || '/').replace(/[^/]*$/, '');
        const resolved = new URL(url, `http://greg.local${dir.startsWith('/') ? dir : `/${dir}`}`);
        return `${resolved.pathname}${resolved.search}${resolved.hash}`;
    } catch {
        return url;
    }
}

export function chapterIdPrefix(chapterId) {
    return `${chapterId}--`;
}

export function rewriteRawHtml(html, { prefix, fileUrl }) {
    return String(html)
        .replace(/(\s(?:id|name)\s*=\s*)(["'])([^"']+)\2/gi, (m, attr, quote, value) =>
            `${attr}${quote}${prefix}${value}${quote}`)
        .replace(/(\s(?:src|href|poster)\s*=\s*)(["'])([^"']*)\2/gi, (m, attr, quote, value) =>
            `${attr}${quote}${resolveRelativeUrl(value, fileUrl)}${quote}`);
}

/**
 * @param {{ chapterId: string, fileUrl: string }} options
 */
export function rehypePdfChapter(options) {
    const prefix = chapterIdPrefix(options.chapterId);
    const fileUrl = options.fileUrl;
    return (tree) => {
        visit(tree, (node, index, parent) => {
            if (node.type === 'raw' && typeof node.value === 'string') {
                node.value = rewriteRawHtml(node.value, { prefix, fileUrl });
                return;
            }
            if (node.type !== 'element') return;
            if (node.tagName === 'a' && classList(node).includes('header-anchor') && parent && index != null) {
                parent.children.splice(index, 1);
                return [SKIP, index];
            }
            const props = node.properties ?? (node.properties = {});
            if (props.id != null && props.id !== '') props.id = `${prefix}${props.id}`;
            if (node.tagName === 'a' && props.name) props.name = `${prefix}${props.name}`;
            for (const attr of ['src', 'href', 'poster']) {
                if (typeof props[attr] === 'string') props[attr] = resolveRelativeUrl(props[attr], fileUrl);
            }
        });
    };
}
