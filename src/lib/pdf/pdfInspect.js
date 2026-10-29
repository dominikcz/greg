/**
 * pdfInspect — reads Chromium-generated PDFs with pdf.js (Node, no rendering).
 * Used for TOC page numbers (pass 1) and for `greg pdf --compare`.
 */

let pdfjsPromise = null;

export async function loadPdfjs() {
    pdfjsPromise ??= import('pdfjs-dist/legacy/build/pdf.mjs').catch((error) => {
        pdfjsPromise = null;
        const err = new Error(
            'pdfjs-dist is required for TOC page numbers and --compare. Install it with: npm i -D pdfjs-dist',
        );
        err.cause = error;
        throw err;
    });
    return pdfjsPromise;
}

export async function openPdf(data) {
    const pdfjs = await loadPdfjs();
    const bytes = new Uint8Array(data);
    const task = pdfjs.getDocument({ data: bytes, verbosity: 0, isEvalSupported: false });
    const doc = await task.promise;
    tasks.set(doc, task);
    return doc;
}

const tasks = new WeakMap();

export async function closePdf(doc) {
    const task = tasks.get(doc);
    tasks.delete(doc);
    await task?.destroy();
}

/** Number of pages of a PDF buffer. */
export async function countPages(data) {
    const doc = await openPdf(data);
    const count = doc.numPages;
    await closePdf(doc);
    return count;
}

/**
 * Map anchor ids to 1-based page numbers. Chromium writes a named destination
 * for every element that is the target of an internal link, so the TOC links
 * make all listed headings resolvable.
 */
export async function anchorPageNumbers(doc, ids) {
    const pages = {};
    for (const id of ids) {
        try {
            const dest = await doc.getDestination(id);
            if (Array.isArray(dest) && dest[0]) pages[id] = (await doc.getPageIndex(dest[0])) + 1;
        } catch {
            // Missing destination: leave the TOC entry without a number.
        }
    }
    return pages;
}

const MM = 72 / 25.4;

/**
 * Extract text lines per page, rebuilt from item geometry: items are grouped by
 * baseline (tolerance relative to the font size, so inline badges stay on their
 * line), ordered by x, and separated by a space where there is a visible gap.
 * Text inside the top/bottom `edgeMm` zone (running headers/footers) is flagged.
 * @returns {Promise<Array<Array<{ text: string, edge: boolean }>>>}
 */
export async function extractPageLines(doc, { edgeMm = 14 } = {}) {
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const [, y0, , y1] = page.view;
        const edge = edgeMm * MM;
        const content = await page.getTextContent();
        const items = content.items
            .filter((item) => typeof item.str === 'string' && item.str.length && item.transform)
            .map((item) => ({
                str: item.str,
                x: item.transform[4],
                y: item.transform[5],
                w: item.width ?? 0,
                h: Math.abs(item.transform[3]) || item.height || 10,
            }))
            .sort((a, b) => b.y - a.y || a.x - b.x);
        const lines = [];
        for (const item of items) {
            const line = lines.find((l) => Math.abs(l.y - item.y) <= Math.max(2, Math.min(l.h, item.h) * 0.5));
            if (line) {
                line.items.push(item);
                line.h = Math.max(line.h, item.h);
            } else {
                lines.push({ y: item.y, h: item.h, items: [item] });
            }
        }
        lines.sort((a, b) => b.y - a.y);
        pages.push(lines.map((line) => {
            line.items.sort((a, b) => a.x - b.x);
            let text = '';
            let end = null;
            for (const item of line.items) {
                const gap = end == null ? 0 : item.x - end;
                if (text && gap > item.h * 0.15 && !/\s$/.test(text) && !/^\s/.test(item.str)) text += ' ';
                text += item.str;
                end = item.x + item.w;
            }
            return {
                text: text.replace(/\s+/g, ' ').trim(),
                edge: line.y > y1 - edge || line.y < y0 + edge,
            };
        }).filter((line) => line.text));
        page.cleanup();
    }
    return pages;
}

/** Flattened outline (bookmarks) with 1-based page numbers. */
export async function readOutline(doc) {
    const out = [];
    async function walk(items, level) {
        for (const item of items ?? []) {
            let page = null;
            try {
                const dest = typeof item.dest === 'string' ? await doc.getDestination(item.dest) : item.dest;
                if (Array.isArray(dest) && dest[0]) page = (await doc.getPageIndex(dest[0])) + 1;
            } catch { /* ignore */ }
            out.push({ title: String(item.title ?? '').trim(), level, page });
            await walk(item.items, level + 1);
        }
    }
    await walk(await doc.getOutline(), 1);
    return out;
}
