/**
 * printDom — whole-book DOM post-processing for the print route.
 *
 * Runs once every chapter is rendered. It needs cross-chapter knowledge, which is
 * why it is not a rehype plugin: heading levels and numbers depend on the book
 * structure, and `#anchor` links may target headings from other chapters.
 */
import { chapterIdPrefix } from './rehypePdfChapter.js';

const EXTERNAL_RE = /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i;
const HEADINGS = 'h1, h2, h3, h4, h5, h6';
const MANUAL_NUMBER_RE = /^\s*\d+(?:\.\d+)*\.?\s+\S/;

function headingLevel(el) {
    return Number(el.tagName.slice(1));
}

/** Replace a heading element with another level, preserving attributes and children. */
function retagHeading(el, level) {
    const clamped = Math.min(6, Math.max(1, level));
    if (clamped === headingLevel(el)) return el;
    const next = el.ownerDocument.createElement(`h${clamped}`);
    for (const attr of Array.from(el.attributes)) next.setAttribute(attr.name, attr.value);
    while (el.firstChild) next.appendChild(el.firstChild);
    el.replaceWith(next);
    return next;
}

function safeDecode(value) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

/** Heading text without the generated number. */
export function headingText(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('.pdf-heading-number').forEach((n) => n.remove());
    return clone.textContent.replace(/\s+/g, ' ').trim();
}

/**
 * @typedef {{ el: HTMLElement, chapterId: string, entry: any }} ChapterRef
 * @typedef {{ code: string, message: string }} PrintWarning
 */

/** Shift heading levels: 'auto' aligns the first heading of a page with its manifest level. */
export function applyHeadingShift(chapters, shift) {
    for (const { el, entry } of chapters) {
        const headings = Array.from(el.querySelectorAll(HEADINGS));
        if (!headings.length) continue;
        const delta = shift === 'auto' || shift == null
            ? (entry.level ?? 1) - headingLevel(headings[0])
            : Number(shift) || 0;
        if (!delta) continue;
        for (const heading of headings) retagHeading(heading, headingLevel(heading) + delta);
    }
}

/** Number headings from the book structure (numbers are real text, so they reach the PDF outline). */
export function applyNumbering(chapters, numbering, warnings) {
    if (!numbering) {
        return;
    }
    const depth = Math.min(6, Math.max(1, Number(numbering.depth) || 1));
    const trailingDot = numbering.format !== '1.1';
    const numberedHeadings = chapters
        .filter(({ entry }) => entry.numbered !== false)
        .flatMap(({ el }) => Array.from(el.querySelectorAll(HEADINGS)));
    if (!numberedHeadings.length) return;
    const baseLevel = Math.min(...numberedHeadings.map(headingLevel));
    const counters = [];
    for (const { el, entry } of chapters) {
        if (entry.numbered === false) continue;
        for (const heading of el.querySelectorAll(HEADINGS)) {
            const rel = headingLevel(heading) - baseLevel;
            if (rel < 0 || rel >= depth) continue;
            counters[rel] = (counters[rel] ?? 0) + 1;
            counters.length = rel + 1;
            const number = counters.map((n) => n ?? 0).join('.') + (trailingDot ? '.' : '');
            if (MANUAL_NUMBER_RE.test(heading.textContent ?? '')) {
                warnings.push({
                    code: 'PDF_MANUAL_NUMBER',
                    message: `Heading "${headingText(heading)}" in ${entry.relPath} already starts with a number.`,
                });
            }
            const span = heading.ownerDocument.createElement('span');
            span.className = 'pdf-heading-number';
            span.textContent = number;
            heading.insertBefore(heading.ownerDocument.createTextNode(' '), heading.firstChild);
            heading.insertBefore(span, heading.firstChild);
        }
    }
}

function stripBase(path, base) {
    const cleanBase = base && base !== '/' ? base.replace(/\/+$/, '') : '';
    if (cleanBase && (path === cleanBase || path.startsWith(cleanBase + '/'))) return path.slice(cleanBase.length) || '/';
    return path;
}

/** Normalise a site path for route lookup: no base, no extension, no /index, no trailing slash. */
export function normalizeRoute(path, base = '/') {
    let value = stripBase(safeDecode(String(path || '/').split('#')[0].split('?')[0]), base);
    value = value.replace(/\.(md|html)$/i, '').replace(/\/index$/i, '').replace(/\/+$/, '');
    return value || '/';
}

/**
 * Rewrite links for the PDF:
 *   #x            → anchor in the same chapter, else the unique matching anchor in the book
 *   /page[#x]     → chapter inside the book, else site URL / plain text (externalPageLinks)
 */
export function rewriteLinks(root, chapters, { routes, base, book, warnings }) {
    const ids = new Set(Array.from(root.querySelectorAll('[id]')).map((el) => el.id));
    const bySuffix = new Map();
    for (const id of ids) {
        const at = id.indexOf('--');
        if (at === -1) continue;
        const suffix = id.slice(at + 2);
        if (!bySuffix.has(suffix)) bySuffix.set(suffix, []);
        bySuffix.get(suffix).push(id);
    }
    const siteUrl = book.siteUrl ? String(book.siteUrl).replace(/\/+$/, '') : '';
    const mode = book.externalPageLinks ?? 'site-url';

    const findAnchor = (prefix, anchor) => {
        const local = `${prefix}${anchor}`;
        if (ids.has(local)) return local;
        const matches = bySuffix.get(anchor) ?? [];
        return matches[0] ?? null;
    };

    const unwrap = (a) => {
        const span = a.ownerDocument.createElement('span');
        span.className = 'pdf-unlinked';
        while (a.firstChild) span.appendChild(a.firstChild);
        a.replaceWith(span);
    };

    const scopes = [
        ...chapters.map((c) => ({ el: c.el, prefix: chapterIdPrefix(c.chapterId), relPath: c.entry.relPath })),
    ];
    for (const { el, prefix, relPath } of scopes) {
        for (const a of Array.from(el.querySelectorAll('a[href]'))) {
            const href = a.getAttribute('href') ?? '';
            if (!href || EXTERNAL_RE.test(href)) continue;
            if (href.startsWith('#')) {
                const anchor = safeDecode(href.slice(1));
                if (!anchor) continue;
                const target = findAnchor(prefix, anchor);
                if (target) {
                    a.setAttribute('href', `#${target}`);
                } else {
                    warnings.push({ code: 'PDF_MISSING_ANCHOR', message: `${relPath}: link ${href} has no target in the book.` });
                    unwrap(a);
                }
                continue;
            }
            if (!href.startsWith('/')) continue;
            const [pathPart, hashPart = ''] = href.split('#');
            const route = normalizeRoute(pathPart, base);
            const chapterId = routes.get(route);
            if (chapterId) {
                const anchor = safeDecode(hashPart);
                const target = anchor ? findAnchor(chapterIdPrefix(chapterId), anchor) : chapterId;
                if (anchor && !target) {
                    warnings.push({ code: 'PDF_MISSING_ANCHOR', message: `${relPath}: link ${href} has no target in the book.` });
                }
                a.setAttribute('href', `#${target ?? chapterId}`);
                continue;
            }
            if (/\.[a-z0-9]+$/i.test(pathPart) && !/\.(md|html)$/i.test(pathPart)) {
                // Asset link (download, image, …): point to the published site when known.
                if (siteUrl) a.setAttribute('href', `${siteUrl}${stripBase(pathPart, base)}`);
                continue;
            }
            if (mode === 'site-url' && siteUrl) {
                a.setAttribute('href', `${siteUrl}${route === '/' ? '/' : route}${hashPart ? `#${hashPart}` : ''}`);
                continue;
            }
            warnings.push({
                code: mode === 'error' ? 'PDF_LINK_OUTSIDE_BOOK_ERROR' : 'PDF_LINK_OUTSIDE_BOOK',
                message: `${relPath}: link ${href} points to a page outside the book${mode === 'site-url' ? ' (set siteUrl to keep it as a web link)' : ''}.`,
            });
            unwrap(a);
        }
    }
}

/** Collect TOC entries (headings of chapters and parts) in document order. */
export function collectTocEntries(root, depth) {
    const max = Math.min(6, Math.max(1, Number(depth) || 2));
    const entries = [];
    for (const heading of root.querySelectorAll('.pdf-part, .pdf-chapter')) {
        const headings = heading.matches('.pdf-part')
            ? Array.from(heading.querySelectorAll(HEADINGS)).slice(0, 1)
            : Array.from(heading.querySelectorAll(HEADINGS));
        for (const h of headings) {
            if (!h.id || h.closest('.pdf-no-toc')) continue;
            const level = headingLevel(h);
            if (level > max) continue;
            const number = h.querySelector('.pdf-heading-number')?.textContent ?? '';
            entries.push({ id: h.id, level, number, text: headingText(h), part: heading.matches('.pdf-part') });
        }
    }
    return entries;
}

/**
 * Render TOC entries into `container` (a flat list; indentation comes from CSS by level).
 * Each heading gets an ASCII anchor (`greg-toc-N`) as the link target: Chromium
 * stores link targets as PDF named destinations, and non-ASCII names (slugs with
 * diacritics) are not reliably decoded by PDF readers.
 */
export function renderToc(container, entries, title) {
    const doc = container.ownerDocument;
    container.textContent = '';
    if (title) {
        const h = doc.createElement('h1');
        h.className = 'pdf-toc-title';
        h.id = 'greg-pdf-toc';
        h.textContent = title;
        container.appendChild(h);
    }
    const list = doc.createElement('ol');
    list.className = 'pdf-toc-list';
    entries.forEach((entry, index) => {
        const anchorId = `greg-toc-${index + 1}`;
        const heading = doc.getElementById(entry.id);
        if (heading) {
            const anchor = doc.createElement('span');
            anchor.id = anchorId;
            anchor.className = 'pdf-toc-anchor';
            heading.insertBefore(anchor, heading.firstChild);
        }
        const li = doc.createElement('li');
        li.className = `pdf-toc-item pdf-toc-l${entry.level}${entry.part ? ' pdf-toc-part' : ''}`;
        const a = doc.createElement('a');
        a.href = `#${heading ? anchorId : entry.id}`;
        if (entry.number) {
            const num = doc.createElement('span');
            num.className = 'pdf-toc-number';
            num.textContent = entry.number;
            a.appendChild(num);
        }
        const text = doc.createElement('span');
        text.className = 'pdf-toc-text';
        text.textContent = entry.text;
        a.appendChild(text);
        const page = doc.createElement('span');
        page.className = 'pdf-toc-page';
        page.dataset.target = heading ? anchorId : entry.id;
        a.appendChild(page);
        li.appendChild(a);
        list.appendChild(li);
    });
    container.appendChild(list);
}

/** Fill TOC page numbers ({ [anchorId]: pageNumber }). */
export function applyTocPageNumbers(root, pageNumbers) {
    let filled = 0;
    for (const span of root.querySelectorAll('.pdf-toc-page[data-target]')) {
        const page = pageNumbers?.[span.dataset.target];
        span.textContent = page != null ? String(page) : '';
        if (page != null) filled++;
    }
    return filled;
}

/** Detect pages that look like a hand-written table of contents (a list of in-page links only). */
export function detectManualToc(chapters, warnings) {
    for (const { el, entry } of chapters) {
        for (const list of el.querySelectorAll('ul, ol')) {
            if (list.parentElement?.closest('ul, ol')) continue;
            const items = list.querySelectorAll('li');
            if (items.length < 5) continue;
            const anchors = list.querySelectorAll('a[href^="#"]');
            if (anchors.length >= items.length * 0.8) {
                warnings.push({ code: 'PDF_MANUAL_TOC', message: `${entry.relPath} contains a list that looks like a hand-written table of contents.` });
                break;
            }
        }
    }
}

/** Wait until every image has loaded (or failed), with a per-image timeout. */
export async function waitForImages(root, timeoutMs = 15000) {
    const images = Array.from(root.querySelectorAll('img'));
    await Promise.all(images.map((img) => {
        img.loading = 'eager';
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
            const done = () => {
                clearTimeout(timer);
                resolve();
            };
            const timer = setTimeout(done, timeoutMs);
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
        });
    }));
    return images.filter((img) => !img.naturalWidth).map((img) => img.getAttribute('src') ?? '');
}
