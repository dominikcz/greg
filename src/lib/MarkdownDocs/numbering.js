/**
 * numbering — chapter/section numbers shared by the site and PDF books.
 *
 * One rule for both outputs, so "chapter 5" means the same thing everywhere:
 *  - a page's number comes from its position in the page sequence (sidebar or
 *    book manifest): top-level pages are 1, 2, 3…, pages nested under a page
 *    get 3.1, 3.2…; parts (groups without a page) are not numbered;
 *  - headings inside a page continue the page number: the first heading is the
 *    page title (gets the page number), deeper headings get 5.1, 5.1.1…;
 *  - `depth` limits how many components a number may have.
 */

/** Normalise the `numbering` option (`true`, `false`, `{ depth, format }`). */
export function normalizeNumbering(value) {
    if (!value) return null;
    const options = value === true ? {} : value;
    const depth = Math.min(6, Math.max(1, Number(options.depth) || 1));
    return { depth, format: options.format === '1.1' ? '1.1' : '1.', sidebar: options.sidebar !== false };
}

/** Format number components: [5, 2] → '5.2.' (format '1.') or '5.2' (format '1.1'). */
export function formatNumber(parts, format = '1.') {
    if (!parts?.length) return '';
    return parts.join('.') + (format === '1.1' ? '' : '.');
}

/** Plain reference form used in running text ("chapter 5", "section 5.2"). */
export function referenceNumber(parts) {
    return parts?.length ? parts.join('.') : '';
}

/**
 * Structural page numbers from an ordered list of manifest entries
 * (`{ kind: 'page' | 'part', mdKey, level, numbered }`).
 * Levels are taken relative to the shallowest numbered page, so pages grouped
 * under unnumbered parts still start at 1.
 * @returns {Map<string, number[]>} mdKey → number components
 */
export function computePageNumbers(entries, depth = 6) {
    const pages = (entries ?? []).filter((e) => e.kind === 'page' && e.numbered !== false);
    const numbers = new Map();
    if (!pages.length) return numbers;
    const base = Math.min(...pages.map((e) => e.level ?? 1));
    const counters = [];
    for (const entry of pages) {
        const rel = Math.max(0, (entry.level ?? 1) - base);
        if (rel >= depth) continue;
        for (let i = 0; i < rel; i++) counters[i] ??= 0;
        counters[rel] = (counters[rel] ?? 0) + 1;
        counters.length = rel + 1;
        numbers.set(entry.mdKey, counters.slice());
    }
    return numbers;
}

/**
 * Numbers for the headings of one page.
 * @param {number[] | undefined} pageNumber  number of the page (from computePageNumbers)
 * @param {number[]} levels                  heading levels in document order (1–6)
 * @param {number} depth                     max number of components
 * @returns {(number[] | null)[]}            per heading; null = no number
 */
export function headingNumbers(pageNumber, levels, depth) {
    if (!pageNumber?.length || !levels.length) return levels.map(() => null);
    const first = levels[0];
    const counters = [];
    return levels.map((level, index) => {
        if (index === 0) return pageNumber.length <= depth ? pageNumber.slice() : null;
        const rel = level - first;
        if (rel < 1) return null;
        for (let i = 0; i < rel - 1; i++) counters[i] ??= 0;
        counters[rel - 1] = (counters[rel - 1] ?? 0) + 1;
        counters.length = rel;
        const parts = [...pageNumber, ...counters.map((n) => n ?? 0)];
        return parts.length <= depth ? parts : null;
    });
}

/** Route lookup key: no extension, no `/index`, no trailing slash, decoded. */
export function routeKey(path) {
    let value = String(path ?? '').split('#')[0].split('?')[0];
    try { value = decodeURI(value); } catch { /* keep */ }
    value = value.replace(/\.(md|html)$/i, '').replace(/\/index$/i, '').replace(/\/+$/, '');
    return value || '/';
}

const MANUAL_NUMBER_RE = /^\s*\d+(?:\.\d+)*\.?\s+(?=\S)/;

/** True when a heading text already starts with a hand-written number. */
export function hasManualNumber(text) {
    return MANUAL_NUMBER_RE.test(String(text ?? ''));
}

const EXTERNAL_RE = /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i;

/**
 * Build `resolveRef` for rehypeNumbering: maps a link (absolute or relative to
 * the page's markdown file) to the reference text of the target page — its
 * number, or its title when the page is not numbered.
 * @param {{ fileUrl: string, base?: string, targets: Map<string, { number?: number[] | null, title?: string }> }} options
 */
export function createRefResolver({ fileUrl, base = '/', targets }) {
    const cleanBase = base && base !== '/' ? base.replace(/\/+$/, '') : '';
    const stripBase = (path) =>
        cleanBase && (path === cleanBase || path.startsWith(cleanBase + '/')) ? path.slice(cleanBase.length) || '/' : path;
    return (href) => {
        if (!href || EXTERNAL_RE.test(href) || href.startsWith('#')) return null;
        let path = href.split('#')[0];
        if (!path.startsWith('/')) {
            try {
                const dir = String(fileUrl || '/').replace(/[^/]*$/, '');
                path = new URL(path, `http://greg.local${dir.startsWith('/') ? dir : `/${dir}`}`).pathname;
            } catch {
                return null;
            }
        }
        const target = targets.get(routeKey(stripBase(path))) ?? targets.get(routeKey(path));
        if (!target) return null;
        return target.number?.length ? referenceNumber(target.number) : (target.title || null);
    };
}

/** Reference targets (route → number/title) from manifest entries and page numbers. */
export function buildRefTargets(entries, pageNumbers) {
    const targets = new Map();
    for (const entry of entries ?? []) {
        if (entry.kind !== 'page') continue;
        targets.set(routeKey(entry.route), { number: pageNumbers?.get(entry.mdKey) ?? null, title: entry.title });
    }
    return targets;
}

/**
 * Rehype plugin: numbers the headings of one rendered page and fills empty
 * cross-reference links (`[](/page)`) with the number (or title) of the target.
 *
 * @param {{ pageNumber?: number[], numbering?: { depth: number, format: string } | null,
 *           resolveRef?: (href: string) => string | null }} options
 */
export function rehypeNumbering(options = {}) {
    const { pageNumber, numbering, resolveRef } = options;
    return (tree) => {
        const headings = [];
        const refs = [];
        (function walk(node) {
            if (node.type === 'element') {
                if (/^h[1-6]$/.test(node.tagName)) headings.push(node);
                if (node.tagName === 'a' && isEmptyLink(node)) refs.push(node);
            }
            for (const child of node.children ?? []) walk(child);
        })(tree);

        if (numbering && pageNumber?.length) {
            const numbers = headingNumbers(pageNumber, headings.map((h) => Number(h.tagName[1])), numbering.depth);
            headings.forEach((heading, index) => {
                const parts = numbers[index];
                if (!parts) return;
                const span = {
                    type: 'element',
                    tagName: 'span',
                    properties: { className: ['heading-number'] },
                    children: [{ type: 'text', value: formatNumber(parts, numbering.format) }],
                };
                // Keep the permalink anchor (if any) first.
                const at = heading.children?.[0]?.properties?.className?.includes?.('header-anchor')
                    || String(heading.children?.[0]?.properties?.class ?? '').includes('header-anchor') ? 1 : 0;
                heading.children.splice(at, 0, span, { type: 'text', value: ' ' });
            });
        }

        if (resolveRef) {
            for (const link of refs) {
                const text = resolveRef(String(link.properties?.href ?? ''));
                if (!text) continue;
                link.children = [{ type: 'text', value: text }];
                const cls = link.properties.className;
                link.properties.className = [...(Array.isArray(cls) ? cls : cls ? [cls] : []), 'xref'];
            }
        }
    };
}

function isEmptyLink(node) {
    const href = node.properties?.href;
    if (typeof href !== 'string' || !href || href.startsWith('#')) return false;
    const hasContent = (n) => n.type === 'element' || (n.type === 'text' && n.value.trim()) || n.type === 'raw';
    return !(node.children ?? []).some(hasContent);
}
