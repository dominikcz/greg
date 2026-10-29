/**
 * compare — content comparison of a generated PDF with a reference PDF
 * (`greg pdf --compare reference.pdf`).
 *
 * Layout is expected to differ, so only text is compared:
 *  1. text lines per page (pdf.js), repeated headers/footers removed;
 *  2. symmetric normalisation (whitespace, quotes, dashes, leading numbers);
 *  3. both documents are split into sections at the book's headings, searched
 *     from the end so the occurrences inside a table of contents are skipped;
 *  4. word-level diff per section (Myers).
 */
import fs from 'node:fs';
import path from 'node:path';
import { closePdf, extractPageLines, openPdf } from './pdfInspect.js';

const LEADING_NUMBER_RE = /^\d+(?:\.\d+)*\.?\s+(?=\S)/;

/** Normalise text so typography and numbering never produce differences. */
export function normalizeText(text) {
    return String(text)
        .normalize('NFKC')
        .replace(/\u00ad/g, '')
        .replace(/[\u00a0\u2007\u202f]/g, ' ')
        .replace(/[„”“"«»]/g, '"')
        .replace(/[‚’‘`´]/g, "'")
        .replace(/[‐‑‒–—―−]/g, '-')
        .replace(/…/g, '...')
        .replace(/\s+/g, ' ')
        // Text runs split by font changes (inline code, bold) yield spurious spaces.
        .replace(/\s+([,.;:!?)\]}])/g, '$1')
        .replace(/([(\[{])\s+/g, '$1')
        .replace(/\s*\/\s*/g, '/')
        .trim()
        .toLowerCase();
}

const lineText = (line) => (typeof line === 'string' ? line : line.text);
const isEdge = (line) => typeof line === 'object' && line.edge === true;

function normalizeLine(line) {
    return normalizeText(line).replace(LEADING_NUMBER_RE, '');
}

const EDGE_LINES = 2;

function edgeIndexes(count) {
    const out = new Set();
    for (let i = 0; i < Math.min(EDGE_LINES, count); i++) {
        out.add(i);
        out.add(count - 1 - i);
    }
    return out;
}

const runningKey = (line) => normalizeText(lineText(line)).replace(/\d+/g, '#');

/** Lines repeated at the top/bottom of many pages (running headers/footers; digits ignored). */
export function findRunningLines(pages, ratio = 0.4) {
    if (pages.length < 3) return new Set();
    const counts = new Map();
    for (const lines of pages) {
        const seen = new Set([...edgeIndexes(lines.length)].map((i) => runningKey(lines[i])));
        for (const key of seen) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const threshold = Math.max(3, Math.ceil(pages.length * ratio));
    return new Set([...counts].filter(([, n]) => n >= threshold).map(([key]) => key));
}

/** Parse a page list such as "1-3,5" into a Set of 1-based page numbers. */
export function parsePageList(spec) {
    const out = new Set();
    for (const part of String(spec ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
        const [a, b] = part.split('-').map(Number);
        if (!Number.isFinite(a)) continue;
        for (let n = a; n <= (Number.isFinite(b) ? b : a); n++) out.add(n);
    }
    return out;
}

/** Body lines of a document: margin-zone text, running lines, repeated table headers and skipped pages removed. */
export function bodyLines(pages, skip = new Set()) {
    const contentPages = pages.map((lines) => lines.filter((line) => !isEdge(line)));
    const running = findRunningLines(contentPages);
    const lines = [];
    let previousPage = new Set();
    contentPages.forEach((pageLines, index) => {
        if (skip.has(index + 1)) return;
        const edges = edgeIndexes(pageLines.length);
        const current = new Set();
        pageLines.forEach((line, i) => {
            if (edges.has(i) && running.has(runningKey(line))) return;
            const normalized = normalizeLine(lineText(line));
            if (!normalized) return;
            current.add(normalized);
            // Table header rows repeated at the top of a continuation page.
            if (i < 3 && previousPage.has(normalized)) return;
            lines.push({ text: normalized, page: index + 1 });
        });
        previousPage = current;
    });
    return lines;
}

/**
 * Locate headings in the line stream. A heading must occupy whole line(s)
 * (it may wrap). Searching backwards from the end picks the occurrence in the
 * content, not the one in a table of contents.
 */
export function locateHeadings(lines, headings) {
    const positions = new Array(headings.length).fill(-1);
    let limit = lines.length;
    for (let h = headings.length - 1; h >= 0; h--) {
        const target = normalizeLine(headings[h].text);
        if (!target) continue;
        for (let i = limit - 1; i >= 0; i--) {
            if (!target.startsWith(lines[i].text)) continue;
            // Join following lines until the heading is complete (wrapped headings).
            let joined = lines[i].text;
            let j = i;
            while (joined.length < target.length && j + 1 < limit) {
                j++;
                joined = `${joined} ${lines[j].text}`;
            }
            if (joined === target) {
                positions[h] = i;
                limit = i;
                break;
            }
        }
    }
    return positions;
}

function splitSections(lines, headings, positions) {
    const located = headings
        .map((heading, index) => ({ heading, index, at: positions[index] }))
        .filter((s) => s.at >= 0);
    const sections = new Map();
    const preludeEnd = located.length ? located[0].at : lines.length;
    for (let k = 0; k < located.length; k++) {
        const start = located[k].at;
        const end = k + 1 < located.length ? located[k + 1].at : lines.length;
        const body = lines.slice(start, end);
        sections.set(located[k].index, {
            words: normalizeText(body.map((l) => l.text).join(' ')).split(' ').filter(Boolean),
            page: lines[start]?.page ?? null,
        });
    }
    return { sections, preludeWords: lines.slice(0, preludeEnd).map((l) => l.text).join(' ').split(' ').filter(Boolean).length };
}

/**
 * Myers O(ND) diff on token arrays. Returns edit hunks
 * `{ type: 'equal' | 'delete' | 'insert', tokens }`, or null when the edit
 * distance exceeds `maxEdits` (sections are then reported as rewritten).
 */
export function diffTokens(a, b, maxEdits = 1500) {
    const n = a.length;
    const m = b.length;
    const max = Math.min(n + m, maxEdits);
    const offset = max + 1;
    let v = new Int32Array(2 * max + 3);
    const trace = [];
    let found = false;
    outer: for (let d = 0; d <= max; d++) {
        trace.push(v.slice());
        for (let k = -d; k <= d; k += 2) {
            let x = (k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]))
                ? v[offset + k + 1]
                : v[offset + k - 1] + 1;
            let y = x - k;
            while (x < n && y < m && a[x] === b[y]) { x++; y++; }
            v[offset + k] = x;
            if (x >= n && y >= m) { found = true; break outer; }
        }
    }
    if (!found) return null;

    const ops = [];
    let x = n;
    let y = m;
    for (let d = trace.length - 1; d >= 0; d--) {
        const vd = trace[d];
        const k = x - y;
        const prevK = (k === -d || (k !== d && vd[offset + k - 1] < vd[offset + k + 1])) ? k + 1 : k - 1;
        const prevX = vd[offset + prevK];
        const prevY = prevX - prevK;
        while (x > prevX && y > prevY) { ops.push(['equal', a[x - 1]]); x--; y--; }
        if (d > 0) {
            if (x === prevX) ops.push(['insert', b[y - 1]]);
            else ops.push(['delete', a[x - 1]]);
        }
        x = prevX;
        y = prevY;
    }
    ops.reverse();
    const hunks = [];
    for (const [type, token] of ops) {
        const last = hunks[hunks.length - 1];
        if (last && last.type === type) last.tokens.push(token);
        else hunks.push({ type, tokens: [token] });
    }
    return hunks;
}

function changeSnippets(hunks, context = 6) {
    const snippets = [];
    for (let i = 0; i < hunks.length; i++) {
        const hunk = hunks[i];
        if (hunk.type === 'equal') continue;
        const before = hunks[i - 1]?.type === 'equal' ? hunks[i - 1].tokens.slice(-context).join(' ') : '';
        let removed = '';
        let added = '';
        let j = i;
        for (; j < hunks.length && hunks[j].type !== 'equal'; j++) {
            if (hunks[j].type === 'delete') removed += (removed ? ' ' : '') + hunks[j].tokens.join(' ');
            else added += (added ? ' ' : '') + hunks[j].tokens.join(' ');
        }
        const after = hunks[j]?.type === 'equal' ? hunks[j].tokens.slice(0, context).join(' ') : '';
        snippets.push({ before, removed, added, after });
        i = j - 1;
    }
    return snippets;
}

/** Words present in `a` but not in `b` (multiset difference, order ignored). */
export function wordDelta(a, b) {
    const counts = new Map();
    for (const w of b) counts.set(w, (counts.get(w) ?? 0) + 1);
    const out = [];
    for (const w of a) {
        const n = counts.get(w) ?? 0;
        if (n > 0) counts.set(w, n - 1);
        else out.push(w);
    }
    return out;
}

async function readDocument(file, skip) {
    const doc = await openPdf(fs.readFileSync(file));
    try {
        const pages = await extractPageLines(doc);
        let images = 0;
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const paintOps = new Set([
            pdfjs.OPS.paintImageXObject,
            pdfjs.OPS.paintInlineImageXObject,
            pdfjs.OPS.paintImageXObjectRepeat,
        ]);
        for (let i = 1; i <= doc.numPages; i++) {
            if (skip.has(i)) continue;
            const page = await doc.getPage(i);
            const ops = await page.getOperatorList();
            images += ops.fnArray.filter((fn) => paintOps.has(fn)).length;
            page.cleanup();
        }
        return { pages, images, numPages: doc.numPages };
    } finally {
        await closePdf(doc);
    }
}

const mdEscape = (text) => String(text).replace(/([|*_~`\\[\]])/g, '\\$1');

/**
 * @param {object} args
 * @param {string} args.reference   reference PDF
 * @param {string} args.candidate   generated PDF
 * @param {Array<{ text: string, level: number, number?: string }>} args.headings  book headings (document order)
 * @param {string} [args.skip]      reference pages to ignore, e.g. "1-3"
 * @param {string} [args.reportPath]
 */
export async function comparePdfs({ reference, candidate, headings, skip, reportPath }) {
    const refSkip = parsePageList(skip);
    const [ref, out] = await Promise.all([readDocument(reference, refSkip), readDocument(candidate, new Set())]);
    const list = (headings ?? []).filter((h) => normalizeLine(h.text));
    const refLines = bodyLines(ref.pages, refSkip);
    const outLines = bodyLines(out.pages);
    const refSplit = splitSections(refLines, list, locateHeadings(refLines, list));
    const outSplit = splitSections(outLines, list, locateHeadings(outLines, list));

    const rows = [];
    let differences = 0;
    for (let i = 0; i < list.length; i++) {
        const heading = list[i];
        const r = refSplit.sections.get(i);
        const o = outSplit.sections.get(i);
        const label = `${'  '.repeat(Math.max(0, heading.level - 1))}${heading.number ? `${heading.number} ` : ''}${heading.text}`;
        if (!r || !o) {
            differences++;
            rows.push({ label, status: !r ? 'missing in reference' : 'missing in output', refPage: r?.page, outPage: o?.page, snippets: [] });
            continue;
        }
        const hunks = diffTokens(r.words, o.words);
        const onlyRef = wordDelta(r.words, o.words);
        const onlyOut = wordDelta(o.words, r.words);
        if (!hunks) {
            differences++;
            rows.push({ label, status: 'rewritten', refPage: r.page, outPage: o.page, removed: onlyRef.length, added: onlyOut.length, onlyRef, onlyOut, snippets: [] });
            continue;
        }
        const changed = hunks.some((h) => h.type !== 'equal');
        if (changed && !onlyRef.length && !onlyOut.length) {
            // Same words in a different order: table cells / wrapped columns, not content.
            rows.push({ label, status: 'layout only', refPage: r.page, outPage: o.page, snippets: [] });
            continue;
        }
        if (changed) differences++;
        rows.push({
            label,
            status: changed ? 'changed' : 'same',
            refPage: r.page,
            outPage: o.page,
            removed: onlyRef.length,
            added: onlyOut.length,
            onlyRef,
            onlyOut,
            snippets: changed ? changeSnippets(hunks) : [],
        });
    }

    const counts = rows.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] ?? 0) + 1 }), {});
    const lines = [];
    lines.push(`# PDF comparison`);
    lines.push('');
    lines.push(`- Reference: \`${path.basename(reference)}\`${refSkip.size ? ` (skipped pages: ${skip})` : ''}`);
    lines.push(`- Output: \`${path.basename(candidate)}\``);
    lines.push(`- Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('| | Reference | Output |');
    lines.push('|---|---:|---:|');
    lines.push(`| Pages | ${ref.numPages} | ${out.numPages} |`);
    lines.push(`| Images | ${ref.images} | ${out.images} |`);
    lines.push(`| Words before the first heading (cover, TOC) | ${refSplit.preludeWords} | ${outSplit.preludeWords} |`);
    lines.push(`| Words in sections | ${[...refSplit.sections.values()].reduce((s, x) => s + x.words.length, 0)} | ${[...outSplit.sections.values()].reduce((s, x) => s + x.words.length, 0)} |`);
    lines.push('');
    lines.push(`Sections: ${rows.length} — ${Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
    lines.push('');
    lines.push('| Section | Status | Page (ref → out) | Words only in ref / only in output |');
    lines.push('|---|---|---|---|');
    for (const row of rows) {
        const words = row.removed || row.added ? `−${row.removed ?? 0} / +${row.added ?? 0}` : '';
        lines.push(`| ${mdEscape(row.label).replace(/^ +/, (s) => '&nbsp;'.repeat(s.length * 2))} | ${row.status} | ${row.refPage ?? '–'} → ${row.outPage ?? '–'} | ${words} |`);
    }
    const changed = rows.filter((row) => row.status === 'changed' || row.status === 'rewritten');
    if (changed.length) {
        lines.push('');
        lines.push('## Differences');
        lines.push('');
        lines.push('Words are compared after normalisation (case, typography, leading numbers). ' +
            '"Only in" lists ignore word order; the excerpts below show where the text differs.');
        for (const row of changed) {
            lines.push('');
            lines.push(`### ${row.label.trim()}`);
            if (row.onlyRef?.length) lines.push(`- Only in reference: ~~${mdEscape(row.onlyRef.join(' '))}~~`);
            if (row.onlyOut?.length) lines.push(`- Only in output: **${mdEscape(row.onlyOut.join(' '))}**`);
            if (!row.snippets.length) continue;
            lines.push('');
            lines.push('<details><summary>Excerpts</summary>');
            lines.push('');
            for (const s of row.snippets.slice(0, 15)) {
                const parts = [];
                if (s.before) parts.push(`…${mdEscape(s.before)}`);
                if (s.removed) parts.push(`~~${mdEscape(s.removed)}~~`);
                if (s.added) parts.push(`**${mdEscape(s.added)}**`);
                if (s.after) parts.push(`${mdEscape(s.after)}…`);
                lines.push(`- ${parts.join(' ')}`);
            }
            if (row.snippets.length > 15) lines.push(`- … ${row.snippets.length - 15} more`);
            lines.push('');
            lines.push('</details>');
        }
    }
    if (reportPath) fs.writeFileSync(reportPath, lines.join('\n') + '\n', 'utf8');

    return {
        differences,
        rows,
        text: `${rows.length} sections: ${counts.same ?? 0} identical, ${counts['layout only'] ?? 0} layout only, ${differences} with content differences; pages ${ref.numPages} → ${out.numPages}, images ${ref.images} → ${out.images}`,
    };
}
