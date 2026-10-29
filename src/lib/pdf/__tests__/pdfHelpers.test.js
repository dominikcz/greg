import { describe, expect, it } from 'vitest';
import {
    bodyLines,
    diffTokens,
    findRunningLines,
    locateHeadings,
    normalizeText,
    parsePageList,
} from '../compare.js';
import { buildPageCss, expandMargin, slotToCssContent, replaceTokens, slotsUseToken } from '../pageCss.js';
import { flattenCodeGroups, resolveRelativeUrl, rewriteRawHtml } from '../rehypePdfChapter.js';
import { normalizeRoute } from '../printDom.js';

const apply = (a, hunks) => hunks.filter((h) => h.type !== 'insert').flatMap((h) => h.tokens);
const result = (hunks) => hunks.filter((h) => h.type !== 'delete').flatMap((h) => h.tokens);

describe('compare helpers', () => {
    it('normalises typography symmetrically', () => {
        expect(normalizeText('„Zamknij”\u00a0—  OK…')).toBe('"zamknij" - ok...');
        expect(normalizeText('( item_42 ) and #1038 , next .')).toBe('(item_42) and #1038, next.');
    });

    it('drops text in the page margin zones and repeated table headers', () => {
        const pages = [
            [{ text: 'Header', edge: true }, { text: 'Body', edge: false }, { text: 'Case Result', edge: false }, { text: 'Row 1', edge: false }, { text: '1 / 3', edge: true }],
            [{ text: 'Case Result', edge: false }, { text: 'Row 2', edge: false }],
        ];
        expect(bodyLines(pages).map((l) => l.text)).toEqual(['body', 'case result', 'row 1', 'row 2']);
        const newTable = [
            [{ text: 'Question Answer', edge: false }, { text: 'A', edge: false }],
            [{ text: 'Settings', edge: false }, { text: 'Question Answer', edge: false }, { text: 'B', edge: false }],
        ];
        expect(bodyLines(newTable).map((l) => l.text)).toEqual(['question answer', 'a', 'settings', 'question answer', 'b']);
    });

    it('parses page lists', () => {
        expect([...parsePageList('1-3, 5')]).toEqual([1, 2, 3, 5]);
        expect(parsePageList('').size).toBe(0);
    });

    it('detects running headers and footers, but not numbered body lines', () => {
        const pages = Array.from({ length: 6 }, (_, i) => [
            'User manual – Product', `Paragraph ${'a'.repeat(i + 1)}`, `Step ${i}`, 'Fixed text', `Notes ${'b'.repeat(i + 1)}`, `${i + 1} / 6`,
        ]);
        const running = findRunningLines(pages);
        expect(running.has('user manual - product')).toBe(true);
        expect(running.has('#/#')).toBe(true);
        expect(running.has('step #')).toBe(false);
        const lines = bodyLines(pages).map((l) => l.text);
        expect(lines.slice(0, 4)).toEqual(['paragraph a', 'step 0', 'fixed text', 'notes b']);
        expect(lines).toHaveLength(24);
    });

    it('locates headings after a table of contents, including wrapped ones', () => {
        const lines = [
            'contents', 'introduction', 'main screen with a very long title',
            'introduction', 'text about the screen',
            'main screen with a', 'very long title', 'body',
        ].map((text, i) => ({ text, page: i }));
        const positions = locateHeadings(lines, [
            { text: '1. Introduction' },
            { text: 'Main screen with a very long title' },
        ]);
        expect(positions).toEqual([3, 5]);
    });

    it('diffs tokens with Myers', () => {
        const a = 'a b c d e f'.split(' ');
        const b = 'a x c d f g'.split(' ');
        const hunks = diffTokens(a, b);
        expect(apply(a, hunks)).toEqual(a);
        expect(result(hunks)).toEqual(b);
        expect(hunks.filter((h) => h.type === 'delete').flatMap((h) => h.tokens)).toEqual(['b', 'e']);
        expect(hunks.filter((h) => h.type === 'insert').flatMap((h) => h.tokens)).toEqual(['x', 'g']);
        expect(diffTokens([], [])).toEqual([]);
        expect(diffTokens('a b'.split(' '), 'c d'.split(' '), 1)).toBeNull();
    });
});

describe('page css', () => {
    it('turns slot templates into CSS content', () => {
        const tokens = { title: 'Manual "X"', chapter: '' };
        expect(slotToCssContent('{page} / {pages}', tokens)).toBe('counter(page) " / " counter(pages)');
        expect(slotToCssContent('{title}', tokens)).toBe('"Manual \\"X\\""');
        expect(slotToCssContent('Page {page} {unknown}', tokens)).toBe('"Page " counter(page) " {unknown}"');
        expect(replaceTokens('{title} v{version} {x}', { title: 'A', version: '1' })).toBe('A v1 {x}');
    });

    it('builds named pages for running chapter titles', () => {
        const book = { title: 'T', page: { size: 'A5', orientation: 'landscape', header: { right: '{chapter}' }, footer: { center: '{page}' } } };
        expect(slotsUseToken(book.page, 'chapter')).toBe(true);
        const css = buildPageCss(book, [{ pageName: 'greg-ch-1', chapter: '1. Intro' }]);
        expect(css).toContain('size: 210mm 148mm;');
        expect(css).toContain('@page greg-ch-1 {');
        expect(css).toContain('@top-right { content: "1. Intro"; }');
        expect(css).toContain('@bottom-center { content: counter(page); }');
        expect(css).toContain('@page greg-cover {');
    });

    it('mirrors margins and slots on left-hand pages and rotates landscape pages', () => {
        const book = {
            title: 'T',
            page: { size: 'A4', margin: '20mm 15mm 18mm 25mm', mirrorMargins: true, header: { left: '{title}', right: '{chapter}' } },
        };
        expect(expandMargin('1mm')).toEqual(['1mm', '1mm', '1mm', '1mm']);
        expect(expandMargin('1mm 2mm 3mm')).toEqual(['1mm', '2mm', '3mm', '2mm']);
        const css = buildPageCss(book, [
            { pageName: 'greg-ch-1', chapter: 'Intro' },
            { pageName: 'greg-ch-1-landscape', chapter: 'Intro', landscape: true },
        ]);
        expect(css).toContain('@page :left {\n    margin: 20mm 25mm 18mm 15mm;');
        expect(css).toContain('@page greg-ch-1:left {\n    @top-left { content: "Intro"; }\n    @top-right { content: "T"; }');
        expect(css).toContain('@page greg-ch-1-landscape {\n    size: 297mm 210mm;');
    });
});

describe('chapter rewriting', () => {
    it('flattens code groups into labelled blocks', () => {
        const tree = {
            type: 'root',
            children: [{
                type: 'element',
                tagName: 'codegroup',
                properties: { 'data-codegroup-tabs': '["npm","pnpm"]' },
                children: [
                    { type: 'element', tagName: 'div', properties: {}, children: [{ type: 'text', value: 'A' }] },
                    { type: 'element', tagName: 'div', properties: { hidden: true }, children: [{ type: 'text', value: 'B' }] },
                ],
            }],
        };
        flattenCodeGroups(tree);
        const group = tree.children[0];
        expect(group.tagName).toBe('div');
        expect(group.properties.className).toEqual(['pdf-code-group']);
        expect(group.children.map((item) => [item.children[0].children[0].value, item.children[1].value])).toEqual([['npm', 'A'], ['pnpm', 'B']]);
    });

    it('resolves relative URLs against the markdown file', () => {
        expect(resolveRelativeUrl('images/a.png', '/manual/02-intro.md')).toBe('/manual/images/a.png');
        expect(resolveRelativeUrl('../img/a.png', '/docs/guide/x.md')).toBe('/docs/img/a.png');
        expect(resolveRelativeUrl('/abs.png', '/docs/x.md')).toBe('/abs.png');
        expect(resolveRelativeUrl('#x', '/docs/x.md')).toBe('#x');
        expect(resolveRelativeUrl('https://a.b/c', '/docs/x.md')).toBe('https://a.b/c');
    });

    it('rewrites raw HTML ids and URLs', () => {
        const html = '<img src="images/logo.png" alt="x"><a id="top" href="other.md#a">x</a>';
        expect(rewriteRawHtml(html, { prefix: 'c-x--', fileUrl: '/docs/p.md' }))
            .toBe('<img src="/docs/images/logo.png" alt="x"><a id="c-x--top" href="/docs/other.md#a">x</a>');
    });

    it('normalises routes for lookup', () => {
        expect(normalizeRoute('/base/guide/index.md#x', '/base/')).toBe('/guide');
        expect(normalizeRoute('/02-1-introduction/', '/')).toBe('/02-1-introduction');
        expect(normalizeRoute('/%C5%BC.md', '/')).toBe('/ż');
    });
});
