/**
 * pageCss — builds the CSS Paged Media rules for a PDF book.
 *
 * Header/footer slots are templates with tokens:
 *   {title} {subtitle} {author} {version} {date} {chapter} {page} {pages}
 * `{page}` / `{pages}` become CSS counters; the other tokens are literal text.
 *
 * Chromium (≥ 131) supports @page margin boxes but not `string-set`, so the
 * running chapter title (`{chapter}`) is implemented with one named page per
 * chapter (`page: greg-ch-N`), each with its own margin-box content.
 */

const SLOT_BOXES = {
    header: { left: '@top-left', center: '@top-center', right: '@top-right' },
    footer: { left: '@bottom-left', center: '@bottom-center', right: '@bottom-right' },
};

const PAGE_SIZES = {
    A3: ['297mm', '420mm'],
    A4: ['210mm', '297mm'],
    A5: ['148mm', '210mm'],
    B5: ['176mm', '250mm'],
    Letter: ['8.5in', '11in'],
    Legal: ['8.5in', '14in'],
};

export const PLAIN_PAGE = 'greg-plain';
export const COVER_PAGE = 'greg-cover';

/** Escape a value for use inside a CSS string literal. */
export function cssString(value) {
    return `"${String(value)
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\r?\n/g, '\\A ')}"`;
}

/** Format today's date (or a fixed value) with YYYY / MM / DD placeholders (default YYYY-MM-DD). */
export function formatBookDate(value, now = new Date(), format = 'YYYY-MM-DD') {
    if (value) return String(value);
    const pad = (n) => String(n).padStart(2, '0');
    return String(format || 'YYYY-MM-DD')
        .replace(/YYYY/g, String(now.getFullYear()))
        .replace(/MM/g, pad(now.getMonth() + 1))
        .replace(/DD/g, pad(now.getDate()));
}

/** Token values shared by margin boxes and the cover template. */
export function bookTokens(book, now) {
    return {
        title: book.title ?? '',
        subtitle: book.subtitle ?? '',
        author: book.author ?? '',
        version: book.version ?? '',
        date: formatBookDate(book.date, now, book.dateFormat),
    };
}

/** Replace `{token}` occurrences in plain text (unknown tokens are kept). */
export function replaceTokens(text, tokens) {
    return String(text).replace(/\{(\w+)\}/g, (match, name) =>
        Object.prototype.hasOwnProperty.call(tokens, name) ? String(tokens[name]) : match,
    );
}

/** Convert a slot template to a CSS `content` value. */
export function slotToCssContent(template, tokens) {
    const parts = [];
    let text = '';
    const flush = () => {
        if (text) parts.push(cssString(text));
        text = '';
    };
    const re = /\{(\w+)\}/g;
    let last = 0;
    let match;
    const source = String(template ?? '');
    while ((match = re.exec(source))) {
        text += source.slice(last, match.index);
        last = re.lastIndex;
        const name = match[1];
        if (name === 'page' || name === 'pages') {
            flush();
            parts.push(`counter(${name})`);
        } else if (Object.prototype.hasOwnProperty.call(tokens, name)) {
            text += String(tokens[name] ?? '');
        } else {
            text += match[0];
        }
    }
    text += source.slice(last);
    flush();
    return parts.length ? parts.join(' ') : '""';
}

/** True when any header/footer slot uses the given token. */
export function slotsUseToken(page, token) {
    const needle = `{${token}}`;
    return ['header', 'footer'].some((slot) =>
        Object.values(page?.[slot] || {}).some((value) => String(value ?? '').includes(needle)),
    );
}

function marginBoxes(page, tokens, { mirrored = false, explicit = false } = {}) {
    const rules = [];
    for (const slot of ['header', 'footer']) {
        const values = page?.[slot] || {};
        for (const [position, box] of Object.entries(SLOT_BOXES[slot])) {
            // Left-hand pages of a duplex book swap the outer and inner slots.
            const source = mirrored ? ({ left: 'right', right: 'left' }[position] ?? position) : position;
            const template = values[source];
            if (template == null || template === '') {
                if (explicit && source !== position) rules.push(`    ${box} { content: none; }`);
                continue;
            }
            rules.push(`    ${box} { content: ${slotToCssContent(template, tokens)}; }`);
        }
    }
    return rules;
}

/** Expand a CSS margin shorthand to [top, right, bottom, left]. */
export function expandMargin(margin) {
    const parts = String(margin ?? '').trim().split(/\s+/).filter(Boolean);
    const [t, r = t, b = t, l = r] = parts.length ? parts : ['0'];
    return [t, r, b, l];
}

function emptyMarginBoxes() {
    return Object.values(SLOT_BOXES)
        .flatMap((boxes) => Object.values(boxes))
        .map((box) => `    ${box} { content: none; }`);
}

/** Page width/height as CSS lengths (for covers that fill the sheet). */
export function pageDimensions(page = {}) {
    const size = page.size ?? 'A4';
    let [width, height] = typeof size === 'object'
        ? [size.width, size.height]
        : (PAGE_SIZES[size] ?? PAGE_SIZES.A4);
    if (page.orientation === 'landscape') [width, height] = [height, width];
    return { width, height };
}

/**
 * @param {Record<string, any>} book  resolved book config
 * @param {Array<{ pageName: string, chapter: string, landscape?: boolean }>} [chapterPages]
 *        named pages: one per chapter for `{chapter}`, and/or landscape pages
 * @param {Date} [now]
 */
export function buildPageCss(book, chapterPages = [], now) {
    const page = book.page ?? {};
    const tokens = { ...bookTokens(book, now), chapter: '' };
    const { width, height } = pageDimensions(page);
    const margin = page.margin ?? '20mm 18mm';
    const mirror = Boolean(page.mirrorMargins);
    const lines = [];

    const pageRule = (selector, body) => {
        if (!body.length) return;
        lines.push(`@page${selector ? ` ${selector}` : ''} {`);
        lines.push(...body);
        lines.push(`}`);
    };

    pageRule('', [`    size: ${width} ${height};`, `    margin: ${margin};`, ...marginBoxes(page, tokens)]);
    if (mirror) {
        const [t, r, b, l] = expandMargin(margin);
        pageRule(':left', [`    margin: ${t} ${l} ${b} ${r};`, ...marginBoxes(page, tokens, { mirrored: true, explicit: true })]);
    }

    for (const { pageName, chapter, landscape } of chapterPages) {
        const chapterTokens = { ...tokens, chapter: chapter ?? '' };
        pageRule(pageName, [
            ...(landscape ? [`    size: ${height} ${width};`] : []),
            ...marginBoxes(page, chapterTokens),
        ]);
        if (mirror) pageRule(`${pageName}:left`, marginBoxes(page, chapterTokens, { mirrored: true, explicit: true }));
    }

    pageRule(PLAIN_PAGE, emptyMarginBoxes());
    pageRule(COVER_PAGE, [`    margin: 0;`, ...emptyMarginBoxes()]);

    lines.push(`:root {`);
    lines.push(`    --pdf-page-width: ${width};`);
    lines.push(`    --pdf-page-height: ${height};`);
    lines.push(`    --pdf-page-margin: ${margin};`);
    lines.push(`}`);
    return lines.join('\n');
}
