/**
 * Normalize fenced code info so VitePress-style forms are supported:
 * - ```ts{2}
 * - ```ts:line-numbers=10 {1}
 * - ```ts line-numbers=10 {1}
 */
export function normalizeCodeFenceInfo(rawLang = '', rawMeta = '') {
    const langToken = String(rawLang ?? '').trim();
    const baseMeta = String(rawMeta ?? '').trim();

    if (!langToken) {
        return { lang: '', meta: baseMeta };
    }

    const m = langToken.match(/^([^:{\s]+)([\s\S]*)$/);
    if (!m) return { lang: langToken, meta: baseMeta };

    const lang = m[1].trim().toLowerCase();
    const suffix = m[2] ?? '';

    const metaParts = [];
    if (baseMeta) metaParts.push(baseMeta);

    for (const token of suffix.matchAll(/:([^\s{}]+)/g)) {
        if (token[1]) metaParts.push(token[1].trim());
    }
    for (const block of suffix.matchAll(/\{[^}]+\}/g)) {
        metaParts.push(block[0]);
    }

    const seen = new Set();
    const mergedMeta = metaParts
        .map((p) => p.trim())
        .filter(Boolean)
        .filter((p) => {
            const key = p.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .join(' ')
        .trim();

    return { lang, meta: mergedMeta };
}
