/**
 * resolveBook — turns a PDF book definition into an ordered manifest of pages.
 *
 * Pure and environment-agnostic: used by the print route in the browser and by
 * the `greg pdf` CLI in Node. Inputs are the same data the site already has:
 * the frontmatter map (keys = markdown URL paths, e.g. '/guide/index.md'), the
 * resolved sidebar tree (`prepareMenu` / `parseSidebarConfig` output) and the
 * docs root prefix of the active locale (`srcDir`, e.g. '/' or '/docs').
 */

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export const PDF_ROUTE_PREFIX = '/__pdf/';
export const DEFAULT_BOOK_ID = 'default';

const EXTERNAL_RE = /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i;

/** Convert a glob (`*`, `**`, `?`, `[...]`, `{a,b}`) to an anchored, case-insensitive RegExp. */
export function globToRegExp(glob) {
    const src = String(glob).trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '');
    let re = '';
    let braceDepth = 0;
    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (ch === '*') {
            if (src[i + 1] === '*') {
                const atSegmentStart = i === 0 || src[i - 1] === '/';
                i++;
                if (atSegmentStart && src[i + 1] === '/') {
                    i++;
                    re += '(?:.*/)?';
                } else if (atSegmentStart && i + 1 === src.length) {
                    re += '.*';
                } else {
                    re += '[^/]*';
                }
            } else {
                re += '[^/]*';
            }
        } else if (ch === '?') {
            re += '[^/]';
        } else if (ch === '[') {
            const end = src.indexOf(']', i + 1);
            if (end === -1) {
                re += '\\[';
            } else {
                let cls = src.slice(i + 1, end).replace(/\\/g, '\\\\');
                if (cls.startsWith('!')) cls = '^' + cls.slice(1);
                re += `[${cls}]`;
                i = end;
            }
        } else if (ch === '{') {
            braceDepth++;
            re += '(?:';
        } else if (ch === '}' && braceDepth > 0) {
            braceDepth--;
            re += ')';
        } else if (ch === ',' && braceDepth > 0) {
            re += '|';
        } else {
            re += ch.replace(/[.+^$()|\\]/g, '\\$&');
        }
    }
    return new RegExp(`^${re}$`, 'i');
}

function toArray(value) {
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
}

function normalizeSrcDir(srcDir) {
    const cleaned = String(srcDir ?? '/').trim().replace(/\\/g, '/').replace(/\/+$/, '');
    return cleaned ? (cleaned.startsWith('/') ? cleaned : `/${cleaned}`) : '/';
}

function joinPath(a, b) {
    return `${a.replace(/\/+$/, '')}/${String(b).replace(/^\/+/, '')}`.replace(/\/+/g, '/');
}

/** Path of a markdown key relative to srcDir, e.g. '/docs/guide/a.md' → 'guide/a.md'. */
export function relativeMdPath(mdKey, srcDir) {
    const root = normalizeSrcDir(srcDir);
    if (root === '/') return mdKey.replace(/^\/+/, '');
    return mdKey.startsWith(root + '/') ? mdKey.slice(root.length + 1) : mdKey.replace(/^\/+/, '');
}

/** Site route of a markdown key, e.g. '/guide/index.md' → '/guide', '/a.md' → '/a'. */
export function routeForMdKey(mdKey) {
    const route = mdKey.replace(/\.md$/i, '').replace(/\/index$/i, '');
    return route || '/';
}

/** Normalised `pdf` frontmatter field of a page. */
export function readPdfFrontmatter(fm) {
    const raw = fm?.pdf;
    if (raw === false) return { include: false };
    if (raw && typeof raw === 'object') return raw;
    return {};
}

/** Configured book ids; a single implicit `default` book when `pdf.books` is absent (zero-config). */
export function listBookIds(pdfConfig) {
    const ids = Object.keys(pdfConfig?.books ?? {});
    return ids.length ? ids : [DEFAULT_BOOK_ID];
}

function normalizeRoot(value) {
    const cleaned = String(value ?? '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
    return cleaned ? `/${cleaned}` : '/';
}

/**
 * Docs root (frontmatter key prefix) of the locale a book is printed from.
 * `book.locale` is a key of `locales` ('/', '/pl/'); locales live under `docsBase`.
 */
export function bookSrcDir(book, siteConfig = {}) {
    const docsBase = Object.prototype.hasOwnProperty.call(siteConfig, 'docsBase') ? siteConfig.docsBase : '';
    const locale = book?.locale && book.locale !== '/' ? book.locale : '';
    return normalizeRoot(`${docsBase ?? ''}/${locale}`);
}

/** Site path of a book's print route (without the site base), e.g. '/pl/__pdf/manual'. */
export function bookRoutePath(bookId, book, siteConfig = {}) {
    const prefix = book?.locale && book.locale !== '/' ? bookSrcDir(book, siteConfig) : '';
    return `${prefix === '/' ? '' : prefix}${PDF_ROUTE_PREFIX}${encodeURIComponent(bookId)}`;
}

/**
 * Merge `pdf.defaults` into a book and apply built-in defaults.
 * @param {Record<string, any> | undefined} pdfConfig  `gregConfig.pdf`
 * @param {string} bookId
 * @param {Record<string, any>} [siteConfig]  full greg config (mainTitle / version fallbacks)
 */
export function getBookConfig(pdfConfig, bookId, siteConfig = {}) {
    const books = pdfConfig?.books ?? {};
    const hasBooks = Object.keys(books).length > 0;
    const raw = books[bookId] ?? (!hasBooks && bookId === DEFAULT_BOOK_ID ? {} : null);
    if (!raw) return null;
    const defaults = pdfConfig?.defaults ?? {};
    const toc = raw.toc === false || (raw.toc === undefined && defaults.toc === false)
        ? false
        : { title: '', depth: 2, pageNumbers: true, ...(defaults.toc || {}), ...(raw.toc || {}) };
    const page = { ...(defaults.page ?? {}), ...(raw.page ?? {}) };
    if (page.header === undefined && page.footer === undefined) {
        page.footer = { center: '{page} / {pages}' };
    }
    return {
        content: 'sidebar',
        cover: false,
        headingShift: 'auto',
        chapterBreak: true,
        externalPageLinks: 'site-url',
        ...defaults,
        ...raw,
        id: bookId,
        title: raw.title ?? defaults.title ?? siteConfig.mainTitle ?? bookId,
        version: raw.version ?? defaults.version ?? siteConfig.version ?? '',
        // Books follow the site numbering unless they set their own.
        numbering: raw.numbering ?? defaults.numbering ?? siteConfig.numbering ?? false,
        toc,
        page,
    };
}

/**
 * @typedef {{ kind: 'page', mdKey: string, route: string, relPath: string, title: string, level: number, numbered: boolean, frontmatter: Record<string, any> }} ManifestPage
 * @typedef {{ kind: 'part', title: string, level: number, intro?: string }} ManifestPart
 * @typedef {{ code: string, message: string }} ManifestWarning
 */

/**
 * @param {object} args
 * @param {Record<string, any>} args.book            book config (see getBookConfig)
 * @param {Record<string, Record<string, any>>} args.frontmatters
 * @param {Array<any>} [args.menu]                   resolved sidebar tree
 * @param {string} [args.srcDir]                     docs root prefix of the locale
 * @param {'pdf' | 'site'} [args.target]             'site' ignores the `pdf` frontmatter flags (site numbering)
 * @returns {{ entries: Array<ManifestPage|ManifestPart>, excluded: Array<{ mdKey: string, reason: string }>, warnings: ManifestWarning[] }}
 */
export function resolveBook({ book, frontmatters, menu = [], srcDir = '/', target = 'pdf' }) {
    const forSite = target === 'site';
    const root = normalizeSrcDir(srcDir);
    const bookId = book?.id;
    const allKeys = Object.keys(frontmatters ?? {}).filter((key) => {
        if (!key.toLowerCase().endsWith('.md')) return false;
        return root === '/' || key.startsWith(root + '/');
    });
    const keySet = new Set(allKeys);

    /** @type {Array<ManifestPage|ManifestPart>} */
    const entries = [];
    const excluded = [];
    const warnings = [];
    const seen = new Set();

    function resolveLinkToKey(link) {
        if (!link || typeof link !== 'string' || EXTERNAL_RE.test(link)) return null;
        let path = link.split('#')[0].split('?')[0].trim();
        if (!path) return null;
        try { path = decodeURI(path); } catch { /* keep as-is */ }
        path = path.replace(/\\/g, '/');
        const candidates = [];
        const add = (p) => {
            const clean = p.replace(/\/+/g, '/');
            if (clean.toLowerCase().endsWith('.md')) {
                candidates.push(clean);
            } else {
                const trimmed = clean.replace(/\/+$/, '');
                candidates.push(`${trimmed}.md`, `${trimmed}/index.md`);
            }
        };
        if (!path.startsWith('/')) {
            add(joinPath(root, path.replace(/^\.\//, '')));
        } else {
            add(path);
            if (root !== '/' && !path.startsWith(root + '/') && path !== root) add(joinPath(root, path));
        }
        return candidates.find((c) => keySet.has(c)) ?? null;
    }

    const sidebarOrder = new Map();
    const sidebarLabels = new Map();
    (function indexMenu(items) {
        for (const item of items ?? []) {
            const key = resolveLinkToKey(item.link);
            if (key && !sidebarOrder.has(key)) {
                sidebarOrder.set(key, sidebarOrder.size);
                sidebarLabels.set(key, item.label);
            }
            indexMenu(item.children);
        }
    })(menu);

    function exclusionReason(mdKey) {
        if (forSite) return null;
        const pdf = readPdfFrontmatter(frontmatters[mdKey]);
        if (pdf.include === false) return 'frontmatter pdf: false';
        if (Array.isArray(pdf.books) && bookId && !pdf.books.includes(bookId)) {
            return `frontmatter pdf.books: ${pdf.books.join(', ')}`;
        }
        return null;
    }

    function matchesAny(mdKey, masks) {
        if (!masks?.length) return false;
        const rel = relativeMdPath(mdKey, root);
        return masks.some((re) => re.test(rel));
    }

    function addPage(mdKey, level, opts = {}) {
        if (seen.has(mdKey)) {
            if (!excluded.some((e) => e.mdKey === mdKey)) {
                warnings.push({ code: 'PDF_DUPLICATE_PAGE', message: `${relativeMdPath(mdKey, root)} is listed more than once; keeping the first occurrence.` });
            }
            return;
        }
        if (matchesAny(mdKey, opts.exclude)) {
            // Excluded by this entry only — a later entry may still include the page.
            if (!excluded.some((e) => e.mdKey === mdKey)) excluded.push({ mdKey, reason: 'exclude' });
            return;
        }
        seen.add(mdKey);
        const reason = exclusionReason(mdKey);
        if (reason) {
            excluded.push({ mdKey, reason });
            return;
        }
        const maskExcluded = excluded.findIndex((e) => e.mdKey === mdKey && e.reason === 'exclude');
        if (maskExcluded !== -1) excluded.splice(maskExcluded, 1);
        const fm = frontmatters[mdKey] ?? {};
        const pdf = readPdfFrontmatter(fm);
        entries.push({
            kind: 'page',
            mdKey,
            route: routeForMdKey(mdKey),
            relPath: relativeMdPath(mdKey, root),
            title: String(opts.title ?? pdf.title ?? fm.title ?? sidebarLabels.get(mdKey) ?? ''),
            level: opts.level ?? level,
            numbered: fm.numbered !== false && (forSite || pdf.numbered !== false),
            frontmatter: fm,
        });
    }

    function pushPart(title, level, walk, extra = {}) {
        const index = entries.length;
        entries.push({ kind: 'part', title, level, ...extra });
        walk();
        const empty = !entries.slice(index + 1).some((e) => e.kind === 'page');
        if (empty) entries.splice(index);
        return !empty;
    }

    function walkSidebar(items, level, opts) {
        for (const item of items ?? []) {
            const key = resolveLinkToKey(item.link);
            const children = item.children ?? [];
            if (item.link && !key && !children.length) {
                if (!EXTERNAL_RE.test(item.link)) {
                    warnings.push({ code: 'PDF_MISSING_PAGE', message: `Sidebar link ${item.link} does not point to a markdown page.` });
                }
                continue;
            }
            if (key) {
                if (frontmatters[key]?.layout === 'home') {
                    if (!seen.has(key)) excluded.push({ mdKey: key, reason: 'layout: home' });
                    seen.add(key);
                } else {
                    addPage(key, level, opts);
                }
                walkSidebar(children, level + 1, opts);
            } else if (children.length) {
                if (opts.groups === 'flatten') {
                    walkSidebar(children, level, opts);
                } else {
                    pushPart(String(item.label ?? ''), level, () => walkSidebar(children, level + 1, opts));
                }
            }
        }
    }

    function findSidebarBranch(items, path) {
        const [head, ...rest] = path;
        const node = (items ?? []).find((item) => String(item.label ?? '').trim() === head);
        if (!node) return null;
        return rest.length ? findSidebarBranch(node.children, rest) : node;
    }

    function sortKeys(keys, mode) {
        const sorted = [...keys];
        if (mode === 'sidebar') {
            sorted.sort((a, b) => {
                const ia = sidebarOrder.has(a) ? sidebarOrder.get(a) : Infinity;
                const ib = sidebarOrder.has(b) ? sidebarOrder.get(b) : Infinity;
                return ia !== ib ? ia - ib : collator.compare(a, b);
            });
        } else if (mode === 'title') {
            sorted.sort((a, b) => collator.compare(
                String(frontmatters[a]?.title ?? a),
                String(frontmatters[b]?.title ?? b),
            ));
        } else if (mode === 'order') {
            sorted.sort((a, b) => {
                const oa = Number(frontmatters[a]?.order);
                const ob = Number(frontmatters[b]?.order);
                const va = Number.isFinite(oa) ? oa : Infinity;
                const vb = Number.isFinite(ob) ? ob : Infinity;
                return va !== vb ? va - vb : collator.compare(a, b);
            });
        } else {
            sorted.sort((a, b) => collator.compare(a, b));
        }
        return sorted;
    }

    function walkItems(items, level) {
        for (const item of toArray(items)) {
            if (typeof item === 'string' || (item && typeof item === 'object' && 'page' in item)) {
                const link = typeof item === 'string' ? item : item.page;
                const key = resolveLinkToKey(link);
                if (!key) {
                    warnings.push({ code: 'PDF_MISSING_PAGE', message: `Content entry "${link}" does not point to a markdown page.` });
                    continue;
                }
                addPage(key, level, typeof item === 'string' ? {} : { title: item.title, level: item.level });
            } else if (item && typeof item === 'object' && 'sidebar' in item) {
                const opts = { groups: item.groups ?? 'parts', exclude: toArray(item.exclude).map(globToRegExp) };
                if (item.sidebar === true) {
                    walkSidebar(menu, level, opts);
                    continue;
                }
                const path = String(item.sidebar).split('>').map((s) => s.trim()).filter(Boolean);
                const branch = findSidebarBranch(menu, path);
                if (!branch) {
                    warnings.push({ code: 'PDF_MISSING_PAGE', message: `Sidebar branch "${item.sidebar}" not found.` });
                    continue;
                }
                const key = resolveLinkToKey(branch.link);
                if (key) {
                    addPage(key, level, opts);
                    walkSidebar(branch.children, level + 1, opts);
                } else {
                    walkSidebar(branch.children, level, opts);
                }
            } else if (item && typeof item === 'object' && 'glob' in item) {
                const masks = toArray(item.glob).map(globToRegExp);
                const exclude = toArray(item.exclude).map(globToRegExp);
                const matched = allKeys.filter((key) => {
                    const rel = relativeMdPath(key, root);
                    return masks.some((re) => re.test(rel)) && !exclude.some((re) => re.test(rel));
                });
                if (!matched.length) {
                    warnings.push({ code: 'PDF_EMPTY_GLOB', message: `Glob ${toArray(item.glob).join(', ')} matched no pages.` });
                    continue;
                }
                for (const key of sortKeys(matched, item.sort ?? 'natural')) addPage(key, level);
            } else if (item && typeof item === 'object' && 'part' in item) {
                const ok = pushPart(String(item.part), level, () => walkItems(item.items, level + 1),
                    item.intro ? { intro: String(item.intro) } : {});
                if (!ok) warnings.push({ code: 'PDF_EMPTY_PART', message: `Part "${item.part}" has no pages.` });
            }
        }
    }

    const content = book?.content ?? 'sidebar';
    walkItems(content === 'sidebar' ? [{ sidebar: true }] : content, 1);

    return { entries, excluded, warnings };
}

/** Plain-text tree of a manifest (used by `greg pdf --list`). */
export function formatManifest(bookId, manifest, pageNumbers) {
    const pages = manifest.entries.filter((e) => e.kind === 'page');
    const lines = [`${bookId} (${pages.length} pages, ${manifest.excluded.length} excluded)`];
    for (const entry of manifest.entries) {
        const indent = '  '.repeat(Math.max(0, entry.level - 1));
        if (entry.kind === 'part') {
            lines.push(`${indent}▸ ${entry.title}`);
        } else {
            const title = entry.title || entry.relPath;
            const number = pageNumbers?.get(entry.mdKey);
            const prefix = number ? `${number.join('.')}. ` : '';
            lines.push(`${indent}• ${prefix}${title}${entry.numbered ? '' : ' (unnumbered)'}  [${entry.relPath}]`);
        }
    }
    for (const ex of manifest.excluded) lines.push(`  ✗ ${ex.mdKey}  (${ex.reason})`);
    for (const w of manifest.warnings) lines.push(`  ! ${w.code}: ${w.message}`);
    return lines.join('\n');
}
