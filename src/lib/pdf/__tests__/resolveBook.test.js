import { describe, expect, it } from 'vitest';
import {
    globToRegExp,
    resolveBook,
    getBookConfig,
    listBookIds,
    formatManifest,
} from '../resolveBook.js';

const fm = (extra = {}) => ({ _mtime: '2026-01-01T00:00:00.000Z', ...extra });

const kdsFrontmatters = {
    '/index.md': fm({ layout: 'home' }),
    '/00-poczatek.md': fm(),
    '/01-kds-instrukcja-uzytkownika.md': fm(),
    '/02-1-wprowadzenie.md': fm(),
    '/10-9-stany-aplikacji.md': fm(),
    '/11-10-konfiguracja-stanowiska.md': fm(),
    '/3-intro.md': fm(),
    '/how-to/index.md': fm(),
    '/how-to/zmiana-miejsca.md': fm(),
    '/diagnostyka/index.md': fm({ pdf: false }),
    '/__pdf/cover.md': fm(),
};

const pages = (manifest) => manifest.entries.filter((e) => e.kind === 'page').map((e) => e.relPath);

describe('globToRegExp', () => {
    it.each([
        ['*.md', 'a.md', true],
        ['*.md', 'dir/a.md', false],
        ['**/*.md', 'a.md', true],
        ['**/*.md', 'a/b/c.md', true],
        ['how-to/**', 'how-to/x/y.md', true],
        ['how-to/**', 'how-to.md', false],
        ['[0-9][0-9]-*.md', '02-1-wprowadzenie.md', true],
        ['[0-9][0-9]-*.md', '3-intro.md', false],
        ['[!0]*.md', '02-x.md', false],
        ['[!0]*.md', '12-x.md', true],
        ['{a,b}.md', 'b.md', true],
        ['{a,b}.md', 'c.md', false],
        ['?.md', 'a.md', true],
        ['./guide/*.md', 'guide/x.md', true],
        ['a.b.md', 'aXb.md', false],
    ])('%s ~ %s → %s', (glob, path, expected) => {
        expect(globToRegExp(glob).test(path)).toBe(expected);
    });
});

describe('resolveBook — glob', () => {
    it('sorts naturally, honours exclude and frontmatter flags', () => {
        const book = { id: 'kds', content: [{ glob: '*.md', exclude: '00-*' }] };
        const manifest = resolveBook({ book, frontmatters: kdsFrontmatters });
        expect(pages(manifest)).toEqual([
            '01-kds-instrukcja-uzytkownika.md',
            '02-1-wprowadzenie.md',
            '3-intro.md',
            '10-9-stany-aplikacji.md',
            '11-10-konfiguracja-stanowiska.md',
            'index.md',
        ]);
        expect(manifest.entries.every((e) => e.level === 1)).toBe(true);
    });

    it('includes hidden __ folders only when matched explicitly', () => {
        const book = { id: 'kds', content: [{ glob: '__pdf/*.md' }] };
        expect(pages(resolveBook({ book, frontmatters: kdsFrontmatters }))).toEqual(['__pdf/cover.md']);
    });

    it('warns when a glob matches nothing', () => {
        const book = { id: 'kds', content: [{ glob: 'nope/*.md' }] };
        const manifest = resolveBook({ book, frontmatters: kdsFrontmatters });
        expect(manifest.warnings.map((w) => w.code)).toEqual(['PDF_EMPTY_GLOB']);
    });

    it('excludes pages with pdf: false', () => {
        const book = { id: 'kds', content: [{ glob: 'diagnostyka/*.md' }] };
        const manifest = resolveBook({ book, frontmatters: kdsFrontmatters });
        expect(pages(manifest)).toEqual([]);
        expect(manifest.excluded).toEqual([{ mdKey: '/diagnostyka/index.md', reason: 'frontmatter pdf: false' }]);
    });
});

describe('resolveBook — explicit entries and parts', () => {
    it('resolves routes, files, levels and parts', () => {
        const book = {
            id: 'kds',
            content: [
                '/02-1-wprowadzenie',
                { page: '10-9-stany-aplikacji.md', title: 'Stany' },
                { part: 'Pomoc', items: ['/how-to', 'how-to/zmiana-miejsca.md'] },
                '/missing',
            ],
        };
        const manifest = resolveBook({ book, frontmatters: kdsFrontmatters });
        expect(manifest.entries.map((e) => [e.kind, e.relPath ?? e.title, e.level])).toEqual([
            ['page', '02-1-wprowadzenie.md', 1],
            ['page', '10-9-stany-aplikacji.md', 1],
            ['part', 'Pomoc', 1],
            ['page', 'how-to/index.md', 2],
            ['page', 'how-to/zmiana-miejsca.md', 2],
        ]);
        expect(manifest.entries[1].title).toBe('Stany');
        expect(manifest.warnings.map((w) => w.code)).toEqual(['PDF_MISSING_PAGE']);
    });

    it('dedupes repeated pages with a warning', () => {
        const book = { id: 'kds', content: ['/02-1-wprowadzenie', { glob: '02-*.md' }] };
        const manifest = resolveBook({ book, frontmatters: kdsFrontmatters });
        expect(pages(manifest)).toEqual(['02-1-wprowadzenie.md']);
        expect(manifest.warnings.map((w) => w.code)).toEqual(['PDF_DUPLICATE_PAGE']);
    });

    it('honours pdf.books and pdf.numbered', () => {
        const frontmatters = {
            '/a.md': fm({ pdf: { books: ['other'] } }),
            '/b.md': fm({ pdf: { numbered: false, title: 'Historia' } }),
        };
        const manifest = resolveBook({ book: { id: 'kds', content: [{ glob: '*.md' }] }, frontmatters });
        expect(pages(manifest)).toEqual(['b.md']);
        expect(manifest.entries[0]).toMatchObject({ numbered: false, title: 'Historia' });
        expect(manifest.excluded[0].reason).toContain('pdf.books');
    });
});

describe('resolveBook — sidebar', () => {
    const menu = [
        { label: 'Home', link: '/', type: 'md', children: [] },
        {
            label: 'Wprowadzenie', link: '', type: 'folder', children: [
                { label: 'KDS', link: '/01-kds-instrukcja-uzytkownika', type: 'md', children: [] },
                { label: '1. Wprowadzenie', link: '/02-1-wprowadzenie', type: 'md', children: [] },
            ],
        },
        {
            label: 'Pomoc', link: '', type: 'folder', children: [
                {
                    label: 'How to', link: '/how-to', type: 'md', children: [
                        { label: 'Zmiana miejsca', link: '/how-to/zmiana-miejsca', type: 'md', children: [] },
                    ],
                },
                { label: 'Diagnostyka', link: '/diagnostyka', type: 'md', children: [] },
            ],
        },
        { label: 'GitHub', link: 'https://github.com', type: 'md', children: [] },
    ];

    it('maps groups to parts and depth to levels; skips home and external links', () => {
        const manifest = resolveBook({ book: { id: 'kds', content: 'sidebar' }, frontmatters: kdsFrontmatters, menu });
        expect(manifest.entries.map((e) => [e.kind, e.relPath ?? e.title, e.level])).toEqual([
            ['part', 'Wprowadzenie', 1],
            ['page', '01-kds-instrukcja-uzytkownika.md', 2],
            ['page', '02-1-wprowadzenie.md', 2],
            ['part', 'Pomoc', 1],
            ['page', 'how-to/index.md', 2],
            ['page', 'how-to/zmiana-miejsca.md', 3],
        ]);
        expect(manifest.excluded).toEqual([
            { mdKey: '/index.md', reason: 'layout: home' },
            { mdKey: '/diagnostyka/index.md', reason: 'frontmatter pdf: false' },
        ]);
        expect(manifest.warnings).toEqual([]);
        expect(manifest.entries[1].title).toBe('KDS');
    });

    it('flattens groups and applies exclude masks', () => {
        const manifest = resolveBook({
            book: { id: 'kds', content: [{ sidebar: true, groups: 'flatten', exclude: ['how-to/**'] }] },
            frontmatters: kdsFrontmatters,
            menu,
        });
        expect(manifest.entries.map((e) => [e.relPath, e.level])).toEqual([
            ['01-kds-instrukcja-uzytkownika.md', 1],
            ['02-1-wprowadzenie.md', 1],
        ]);
    });

    it('allows a page excluded by one entry to be included by a later one', () => {
        const manifest = resolveBook({
            book: { id: 'kds', content: [{ sidebar: true, groups: 'flatten', exclude: 'how-to/**' }, '/how-to'] },
            frontmatters: kdsFrontmatters,
            menu,
        });
        expect(pages(manifest)).toContain('how-to/index.md');
        expect(manifest.excluded.some((e) => e.mdKey === '/how-to/index.md')).toBe(false);
    });

    it('selects a branch by label path', () => {
        const manifest = resolveBook({
            book: { id: 'kds', content: [{ sidebar: 'Pomoc > How to' }] },
            frontmatters: kdsFrontmatters,
            menu,
        });
        expect(manifest.entries.map((e) => [e.relPath, e.level])).toEqual([
            ['how-to/index.md', 1],
            ['how-to/zmiana-miejsca.md', 2],
        ]);
    });

    it('sorts a glob in sidebar order', () => {
        const manifest = resolveBook({
            book: { id: 'kds', content: [{ glob: ['0[12]-*.md', 'how-to/*.md'], sort: 'sidebar' }] },
            frontmatters: kdsFrontmatters,
            menu,
        });
        expect(pages(manifest)).toEqual([
            '01-kds-instrukcja-uzytkownika.md',
            '02-1-wprowadzenie.md',
            'how-to/index.md',
            'how-to/zmiana-miejsca.md',
        ]);
    });
});

describe('resolveBook — srcDir prefix', () => {
    it('resolves routes under a docs prefix and ignores files outside it', () => {
        const frontmatters = {
            '/docs/guide/index.md': fm(),
            '/docs/guide/routing.md': fm(),
            '/other/x.md': fm(),
        };
        const manifest = resolveBook({
            book: { id: 'g', content: ['/guide', 'guide/routing.md', { glob: '**/*.md' }] },
            frontmatters,
            srcDir: '/docs',
        });
        expect(pages(manifest)).toEqual(['guide/index.md', 'guide/routing.md']);
        expect(manifest.entries[0].route).toBe('/docs/guide');
    });
});

describe('book config helpers', () => {
    it('provides an implicit default book', () => {
        expect(listBookIds(undefined)).toEqual(['default']);
        const book = getBookConfig(undefined, 'default', { mainTitle: 'Docs', version: '1.0' });
        expect(book).toMatchObject({ id: 'default', title: 'Docs', version: '1.0', content: 'sidebar' });
        expect(getBookConfig(undefined, 'x')).toBeNull();
    });

    it('merges defaults with book settings', () => {
        const pdf = {
            defaults: { page: { size: 'A4', margin: '20mm' }, toc: { depth: 3 } },
            books: { a: { title: 'A', page: { margin: '10mm' } }, b: { toc: false } },
        };
        expect(listBookIds(pdf)).toEqual(['a', 'b']);
        expect(getBookConfig(pdf, 'a')).toMatchObject({ page: { size: 'A4', margin: '10mm' }, toc: { depth: 3, pageNumbers: true } });
        expect(getBookConfig(pdf, 'b').toc).toBe(false);
    });

    it('formats a manifest tree', () => {
        const manifest = resolveBook({ book: { id: 'kds', content: [{ glob: '0[12]-*.md' }, '/missing'] }, frontmatters: kdsFrontmatters });
        const text = formatManifest('kds', manifest);
        expect(text).toContain('kds (2 pages, 0 excluded)');
        expect(text).toContain('• 01-kds-instrukcja-uzytkownika.md');
        expect(text).toContain('PDF_MISSING_PAGE');
    });
});
