import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import {
    buildRefTargets,
    computePageNumbers,
    createRefResolver,
    formatNumber,
    hasManualNumber,
    headingNumbers,
    normalizeNumbering,
    rehypeNumbering,
    routeKey,
} from '../numbering.js';

const page = (mdKey, level = 1, extra = {}) => ({ kind: 'page', mdKey, route: mdKey.replace(/\.md$/, '').replace(/\/index$/, '') || '/', level, numbered: true, title: mdKey, ...extra });

describe('numbering', () => {
    it('normalises options', () => {
        expect(normalizeNumbering(false)).toBeNull();
        expect(normalizeNumbering(true)).toEqual({ depth: 1, format: '1.', sidebar: true });
        expect(normalizeNumbering({ depth: 3, format: '1.1', sidebar: false })).toEqual({ depth: 3, format: '1.1', sidebar: false });
        expect(formatNumber([5, 2])).toBe('5.2.');
        expect(formatNumber([5, 2], '1.1')).toBe('5.2');
    });

    it('numbers pages from the structure, relative to the shallowest level', () => {
        const entries = [
            { kind: 'part', title: 'Intro', level: 1 },
            page('/a.md', 2),
            page('/b.md', 2),
            page('/b/x.md', 3),
            page('/b/y.md', 3),
            page('/hist.md', 2, { numbered: false }),
            { kind: 'part', title: 'More', level: 1 },
            page('/c.md', 2),
        ];
        const numbers = computePageNumbers(entries);
        expect(Object.fromEntries(numbers)).toEqual({
            '/a.md': [1], '/b.md': [2], '/b/x.md': [2, 1], '/b/y.md': [2, 2], '/c.md': [3],
        });
        expect(computePageNumbers(entries, 1).has('/b/x.md')).toBe(false);
    });

    it('numbers headings inside a page', () => {
        expect(headingNumbers([5], [1, 2, 3, 2, 3, 3], 3)).toEqual([[5], [5, 1], [5, 1, 1], [5, 2], [5, 2, 1], [5, 2, 2]]);
        expect(headingNumbers([5], [1, 2, 3], 2)).toEqual([[5], [5, 1], null]);
        expect(headingNumbers([5], [2, 1], 3)).toEqual([[5], null]);
        expect(headingNumbers(undefined, [1, 2], 3)).toEqual([null, null]);
        expect(headingNumbers([5], [1, 3], 3)).toEqual([[5], [5, 0, 1]]);
    });

    it('detects hand-written numbers', () => {
        expect(hasManualNumber('5. Main screen')).toBe(true);
        expect(hasManualNumber('2.3 Tabela')).toBe(true);
        expect(hasManualNumber('Release 3 notes')).toBe(false);
    });

    it('resolves cross references to page numbers or titles', () => {
        const entries = [page('/docs/a.md'), page('/docs/guide/b.md'), page('/docs/hist.md', 1, { numbered: false, title: 'History' })];
        const targets = buildRefTargets(entries, computePageNumbers(entries));
        const resolve = createRefResolver({ fileUrl: '/base/docs/guide/x.md', base: '/base/', targets });
        expect(resolve('/docs/a')).toBe('1');
        expect(resolve('/base/docs/guide/b#sec')).toBe('2');
        expect(resolve('./b.md')).toBe('2');
        expect(resolve('../hist')).toBe('History');
        expect(resolve('/nope')).toBeNull();
        expect(resolve('https://x.y')).toBeNull();
        expect(routeKey('/a/index.md#x')).toBe('/a');
    });
});

describe('rehypeNumbering', () => {
    async function render(md, options) {
        return String(await unified()
            .use(remarkParse)
            .use(remarkRehype)
            .use(rehypeNumbering, options)
            .use(rehypeStringify)
            .process(md));
    }

    it('adds heading numbers and fills empty links', async () => {
        const html = await render('# Screen\n\n## Card\n\n### Details\n\nSee chapter [](/b) and [text](/b).', {
            pageNumber: [5],
            numbering: { depth: 2, format: '1.' },
            resolveRef: (href) => (href === '/b' ? '8' : null),
        });
        expect(html).toContain('<h1><span class="heading-number">5.</span> Screen</h1>');
        expect(html).toContain('<h2><span class="heading-number">5.1.</span> Card</h2>');
        expect(html).toContain('<h3>Details</h3>');
        expect(html).toContain('<a href="/b" class="xref">8</a> and <a href="/b">text</a>');
    });

    it('leaves headings alone without numbering', async () => {
        const html = await render('# Screen', { pageNumber: [5], numbering: null });
        expect(html).toBe('<h1>Screen</h1>');
    });
});
