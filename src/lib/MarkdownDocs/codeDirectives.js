function parseLineRanges(meta) {
    const text = String(meta ?? '').replace(/\[[^\]]*\]/g, '');
    const match = text.match(/\{([^}]+)\}/);
    if (!match?.[1]) return new Set();

    const out = new Set();
    const parts = match[1].split(',').map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
        if (/^\d+$/.test(part)) {
            out.add(Number(part));
            continue;
        }
        const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
        if (!range) continue;
        const start = Number(range[1]);
        const end = Number(range[2]);
        const lo = Math.min(start, end);
        const hi = Math.max(start, end);
        for (let i = lo; i <= hi; i++) out.add(i);
    }
    return out;
}

function parseLineNumbers(meta) {
    const text = String(meta ?? '');
    if (/\bno-line-numbers\b/i.test(text)) return { enabled: false, start: 1 };
    const match = text.match(/\bline-numbers(?:=(\d+))?\b/i);
    if (!match) return { enabled: false, start: 1 };
    const start = match[1] ? Math.max(1, Number(match[1])) : 1;
    return { enabled: true, start };
}

function parseMarkerToken(token, info) {
    const t = token.trim().toLowerCase();
    if (t === '++') info.diffAdd = true;
    else if (t === '--') info.diffRemove = true;
    else if (t === 'warning') info.diffWarning = true;
    else if (t === 'error') info.diffError = true;
    else if (t === 'focus') info.focus = true;
    else if (t === 'highlight') info.highlight = true;
}

export function parseCodeDirectives(code, meta = '', lang = '') {
    const normalizedCode = String(code ?? '').replace(/\r?\n$/, '');
    const normalizedLang = String(lang ?? '').trim().toLowerCase();
    const isMarkdownSource = normalizedLang === 'md' || normalizedLang === 'markdown';
    if (isMarkdownSource) {
        return {
            cleanedCode: normalizedCode,
            lineInfo: [],
            lineNumbers: { enabled: false, start: 1 },
        };
    }

    const highlightedLines = parseLineRanges(meta);
    const lineNumbers = parseLineNumbers(meta);
    const lines = normalizedCode.split(/\r?\n/);
    const lineInfo = [];

    const markerRe = /\[!code\s+([^\]]+)\]/gi;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const info = {
            highlight: highlightedLines.has(i + 1),
            focus: false,
            diffAdd: false,
            diffRemove: false,
            diffWarning: false,
            diffError: false,
        };

        markerRe.lastIndex = 0;
        for (const match of line.matchAll(markerRe)) {
            parseMarkerToken(match[1] ?? '', info);
        }

        // Remove trailing marker comments and any stray marker tokens.
        line = line.replace(/\s*(?:\/\/|#|<!--)?\s*\[!code\s+[^\]]+\]\s*(?:-->)?\s*$/gi, '');
        line = line.replace(/\s*\[!code\s+[^\]]+\]\s*/gi, '');

        lines[i] = line;
        lineInfo.push(info);
    }

    return {
        cleanedCode: lines.join('\n'),
        lineInfo,
        lineNumbers,
    };
}

function addClassesToLineWrapper(lineHtml, classes) {
    const classText = classes.join(' ');
    if (!classText) return lineHtml;

    if (/^<span class="[^"]*line[^"]*">/.test(lineHtml)) {
        return lineHtml.replace(/^<span class="([^"]*)">/, (_m, cls) => {
            const next = `${cls} ${classText}`.trim().replace(/\s+/g, ' ');
            return `<span class="${next}">`;
        });
    }

    return `<span class="line ${classText}">${lineHtml}</span>`;
}

function decorateLineSpanFragment(fragment, classes, dataLine) {
    return fragment.replace(/<span class="([^"]*\bline\b[^"]*)">([\s\S]*?)<\/span>/, (_m, cls, inner) => {
        const merged = `${cls} ${classes.join(' ')}`.trim().replace(/\s+/g, ' ');
        const dataLineAttr = Number.isFinite(dataLine) ? ` data-line="${dataLine}"` : '';
        return `<span class="${merged}"${dataLineAttr}>${inner}</span>`;
    });
}

function addClassToPre(html, cls) {
    if (!cls) return html;
    if (/<pre\b[^>]*class="[^"]*"/i.test(html)) {
        return html.replace(/<pre\b([^>]*?)class="([^"]*)"([^>]*)>/i, (_m, preA, preCls, preB) => {
            const merged = `${preCls} ${cls}`.trim().replace(/\s+/g, ' ');
            return `<pre${preA}class="${merged}"${preB}>`;
        });
    }
    return html.replace(/<pre\b/i, `<pre class="${cls}"`);
}

function addAttrsToCode(html, attrs) {
    const entries = Object.entries(attrs).filter(([, v]) => v != null && v !== '');
    if (!entries.length) return html;

    const attrsText = entries.map(([k, v]) => `${k}="${String(v)}"`).join(' ');
    if (/<code\b[^>]*>/i.test(html)) {
        return html.replace(/<code\b([^>]*)>/i, (_m, codeAttrs) => `<code${codeAttrs} ${attrsText}>`);
    }
    return html;
}

export function decorateHighlightedCodeHtml(highlightedHtml, directives) {
    const lines = String(highlightedHtml ?? '').split('\n');
    let hasFocused = false;
    let hasDiff = false;
    const lineNumbersEnabled = Boolean(directives.lineNumbers?.enabled);
    const lineNumberStart = Number.isFinite(directives.lineNumbers?.start)
        ? directives.lineNumbers.start
        : 1;

    for (let i = 0; i < lines.length; i++) {
        const info = directives.lineInfo[i] ?? {
            highlight: false,
            focus: false,
            diffAdd: false,
            diffRemove: false,
            diffWarning: false,
            diffError: false,
        };

        if (/<span class="[^"]*\bline\b[^"]*">/.test(lines[i])) {
            const classes = [];
            if (info.highlight) classes.push('highlighted');
            if (info.focus) {
                classes.push('focused');
                hasFocused = true;
            }
            if (info.diffAdd) classes.push('diff', 'add');
            if (info.diffRemove) classes.push('diff', 'remove');
            if (info.diffWarning) classes.push('diff', 'warning');
            if (info.diffError) classes.push('diff', 'error');
            if (info.diffAdd || info.diffRemove || info.diffWarning || info.diffError) hasDiff = true;

            const dataLine = lineNumbersEnabled ? lineNumberStart + i : undefined;
            lines[i] = decorateLineSpanFragment(lines[i], classes, dataLine);
        } else if (directives.lineInfo.length && info.highlight) {
            lines[i] = addClassesToLineWrapper(lines[i], ['highlighted']);
        }
    }

    let html = lines.join('\n');
    if (hasFocused) html = addClassToPre(html, 'has-focused-lines');
    if (hasDiff) html = addClassToPre(html, 'has-diff');

    if (lineNumbersEnabled) {
        const totalLines = lines.filter((l) => /<span class="[^"]*\bline\b[^"]*">/.test(l)).length;
        const maxLineNumber = Math.max(lineNumberStart + totalLines - 1, lineNumberStart);
        const maxDigits = String(maxLineNumber).length;
        html = addAttrsToCode(html, {
            'data-line-numbers': 'true',
            'data-line-numbers-max-digits': maxDigits,
        });
    }

    return html;
}
