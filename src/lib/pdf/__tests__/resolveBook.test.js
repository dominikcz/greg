import { describe, expect, it } from 'vitest';
import {
    globToRegExp,
    resolveBook,
    getBookConfig,
    listBookIds,
    formatManifest,
} from '../resolveBook.js';

const fm = (extra = {}) => ({ _mtime: '2026-01-01T00:00:00.000Z', ...extra });

const docsFrontmatters = {
    '/index.md': fm({ layout: 'home' }),
    '/00-front-matter.md': fm(),
    '/01-preface.md': fm(),
    '/02-1-introduction.md': fm(),
    '/10-9-states.md': fm(),
    '/11-10-configuration.md': fm(),
    '/3-intro.md': fm(),
    '/how-to/index.md': fm(),
    '/how-to/change-location.md': fm(),
    '/troubleshooting/index.md': fm({ pdf: false }),
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
        ['[0-9][0-9]-*.md', '02-1-introduction.md', true],
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
        const book = { id: 'manual', content: [{ glob: '*.md', exclude: '00-*' }] };
        const manifest = resolveBook({ book, frontmatters: docsFrontmatters });
        expect(pages(manifest)).toEqual([
            '01-preface.md',
            '02-1-introduction.md',
            '3-intro.md',
            '10-9-states.md',
            '11-10-configuration.md',
            'index.md',
        ]);
        expect(manifest.entries.every((e) => e.level === 1)).toBe(true);
    });

    it('includes hidden __ folders only when matched explicitly', () => {
        const book = { id: 'manual', content: [{ glob: '__pdf/*.md' }] };
        expect(pages(resolveBook({ book, frontmatters: docsFrontmatters }))).toEqual(['__pdf/cover.md']);
    });

    it('warns when a glob matches nothing', () => {
        const book = { id: 'manual', content: [{ glob: 'nope/*.md' }] };
        const manifest = resolveBook({ book, frontmatters: docsFrontmatters });
        expect(manifest.warnings.map((w) => w.code)).toEqual(['PDF_EMPTY_GLOB']);
    });

    it('excludes pages with pdf: false', () => {
        const book = { id: 'manual', content: [{ glob: 'troubleshooting/*.md' }] };
        const manifest = resolveBook({ book, frontmatters: docsFrontmatters });
        expect(pages(manifest)).toEqual([]);
        expect(manifest.excluded).toEqual([{ mdKey: '/troubleshooting/index.md', reason: 'frontmatter pdf: false' }]);
    });
});

describe('resolveBook — explicit entries and parts', () => {
    it('resolves routes, files, levels and parts', () => {
        const book = {
            id: 'manual',
            content: [
                '/02-1-introduction',
                { page: '10-9-states.md', title: 'States' },
                { part: 'Help', items: ['/how-to', 'how-to/change-location.md'] },
                '/missing',
            ],
        };
        const manifest = resolveBook({ book, frontmatters: docsFrontmatters });
        expect(manifest.entries.map((e) => [e.kind, e.relPath ?? e.title, e.level])).toEqual([
            ['page', '02-1-introduction.md', 1],
            ['page', '10-9-states.md', 1],
            ['part', 'Help', 1],
            ['page', 'how-to/index.md', 2],
            ['page', 'how-to/change-location.md', 2],
        ]);
        expect(manifest.entries[1].title).toBe('States');
        expect(manifest.warnings.map((w) => w.code)).toEqual(['PDF_MISSING_PAGE']);
    });

    it('dedupes repeated pages with a warning', () => {
        const book = { id: 'manual', content: ['/02-1-introduction', { glob: '02-*.md' }] };
        const manifest = resolveBook({ book, frontmatters: docsFrontmatters });
        expect(pages(manifest)).toEqual(['02-1-introduction.md']);
        expect(manifest.warnings.map((w) => w.code)).toEqual(['PDF_DUPLICATE_PAGE']);
    });

    it('honours pdf.books and pdf.numbered', () => {
        const frontmatters = {
            '/a.md': fm({ pdf: { books: ['other'] } }),
            '/b.md': fm({ pdf: { numbered: false, title: 'Revision history' } }),
        };
        const manifest = resolveBook({ book: { id: 'manual', content: [{ glob: '*.md' }] }, frontmatters });
        expect(pages(manifest)).toEqual(['b.md']);
        expect(manifest.entries[0]).toMatchObject({ numbered: false, title: 'Revision history' });
        expect(manifest.excluded[0].reason).toContain('pdf.books');
    });
});

describe('resolveBook — sidebar', () => {
    const menu = [
        { label: 'Home', link: '/', type: 'md', children: [] },
        {
            label: 'Introduction', link: '', type: 'folder', children: [
                { label: 'Preface', link: '/01-preface', type: 'md', children: [] },
                { label: 'Getting started', link: '/02-1-introduction', type: 'md', children: [] },
            ],
        },
        {
            label: 'Help', link: '', type: 'folder', children: [
                {
                    label: 'How to', link: '/how-to', type: 'md', children: [
                        { label: 'Change location', link: '/how-to/change-location', type: 'md', children: [] },
                    ],
                },
                { label: 'Troubleshooting', link: '/troubleshooting', type: 'md', children: [] },
            ],
        },
        { label: 'GitHub', link: 'https://github.com', type: 'md', children: [] },
    ];

    it('maps groups to parts and depth to levels; skips home and external links', () => {
        const manifest = resolveBook({ book: { id: 'manual', content: 'sidebar' }, frontmatters: docsFrontmatters, menu });
        expect(manifest.entries.map((e) => [e.kind, e.relPath ?? e.title, e.level])).toEqual([
            ['part', 'Introduction', 1],
            ['page', '01-preface.md', 2],
            ['page', '02-1-introduction.md', 2],
            ['part', 'Help', 1],
            ['page', 'how-to/index.md', 2],
            ['page', 'how-to/change-location.md', 3],
        ]);
        expect(manifest.excluded).toEqual([
            { mdKey: '/index.md', reason: 'layout: home' },
            { mdKey: '/troubleshooting/index.md', reason: 'frontmatter pdf: false' },
        ]);
        expect(manifest.warnings).toEqual([]);
        expect(manifest.entries[1].title).toBe('Preface');
    });

    it('flattens groups and applies exclude masks', () => {
        const manifest = resolveBook({
            book: { id: 'manual', content: [{ sidebar: true, groups: 'flatten', exclude: ['how-to/**'] }] },
            frontmatters: docsFrontmatters,
            menu,
        });
        expect(manifest.entries.map((e) => [e.relPath, e.level])).toEqual([
            ['01-preface.md', 1],
            ['02-1-introduction.md', 1],
        ]);
    });

    it('allows a page excluded by one entry to be included by a later one', () => {
        const manifest = resolveBook({
            book: { id: 'manual', content: [{ sidebar: true, groups: 'flatten', exclude: 'how-to/**' }, '/how-to'] },
            frontmatters: docsFrontmatters,
            menu,
        });
        expect(pages(manifest)).toContain('how-to/index.md');
        expect(manifest.excluded.some((e) => e.mdKey === '/how-to/index.md')).toBe(false);
    });

    it('selects a branch by label path', () => {
        const manifest = resolveBook({
            book: { id: 'manual', content: [{ sidebar: 'Help > How to' }] },
            frontmatters: docsFrontmatters,
            menu,
        });
        expect(manifest.entries.map((e) => [e.relPath, e.level])).toEqual([
            ['how-to/index.md', 1],
            ['how-to/change-location.md', 2],
        ]);
    });

    it('sorts a glob in sidebar order', () => {
        const manifest = resolveBook({
            book: { id: 'manual', content: [{ glob: ['0[12]-*.md', 'how-to/*.md'], sort: 'sidebar' }] },
            frontmatters: docsFrontmatters,
            menu,
        });
        expect(pages(manifest)).toEqual([
            '01-preface.md',
            '02-1-introduction.md',
            'how-to/index.md',
            'how-to/change-location.md',
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
        const manifest = resolveBook({ book: { id: 'manual', content: [{ glob: '0[12]-*.md' }, '/missing'] }, frontmatters: docsFrontmatters });
        const text = formatManifest('manual', manifest);
        expect(text).toContain('manual (2 pages, 0 excluded)');
        expect(text).toContain('• 01-preface.md');
        expect(text).toContain('PDF_MISSING_PAGE');
        const numbered = formatManifest('manual', manifest, new Map([['/02-1-introduction.md', [1]]]));
        expect(numbered).toContain('• 1. 02-1-introduction.md');
    });

    it('inherits the site numbering unless the book sets its own', () => {
        expect(getBookConfig({ books: { a: {} } }, 'a', { numbering: { depth: 2 } }).numbering).toEqual({ depth: 2 });
        expect(getBookConfig({ books: { a: { numbering: false } } }, 'a', { numbering: true }).numbering).toBe(false);
        expect(getBookConfig({ books: { a: {} } }, 'a', {}).numbering).toBe(false);
    });

    it('ignores pdf flags in site mode, but honours numbered: false', () => {
        const frontmatters = {
            '/a.md': fm({ pdf: false }),
            '/b.md': fm({ pdf: { numbered: false } }),
            '/c.md': fm({ numbered: false }),
        };
        const book = { id: '__site', content: [{ glob: '*.md' }] };
        const site = resolveBook({ book, frontmatters, target: 'site' });
        expect(site.entries.map((e) => [e.relPath, e.numbered])).toEqual([['a.md', true], ['b.md', true], ['c.md', false]]);
        const pdf = resolveBook({ book, frontmatters });
        expect(pdf.entries.map((e) => [e.relPath, e.numbered])).toEqual([['b.md', false], ['c.md', false]]);
    });
});
