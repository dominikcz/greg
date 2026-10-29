import { describe, expect, it } from 'vitest';
import {
    bodyLines,
    diffTokens,
    findRunningLines,
    locateHeadings,
    normalizeText,
    parsePageList,
} from '../compare.js';
import { buildPageCss, slotToCssContent, replaceTokens, slotsUseToken } from '../pageCss.js';
import { resolveRelativeUrl, rewriteRawHtml } from '../rehypePdfChapter.js';
import { normalizeRoute } from '../printDom.js';

const apply = (a, hunks) => hunks.filter((h) => h.type !== 'insert').flatMap((h) => h.tokens);
const result = (hunks) => hunks.filter((h) => h.type !== 'delete').flatMap((h) => h.tokens);

describe('compare helpers', () => {
    it('normalises typography symmetrically', () => {
        expect(normalizeText('„Zamknij”\u00a0—  OK…')).toBe('"zamknij" - ok...');
        expect(normalizeText('( kds_ff ) i #1038 , dalej .')).toBe('(kds_ff) i #1038, dalej.');
    });

    it('drops text in the page margin zones and repeated table headers', () => {
        const pages = [
            [{ text: 'Header', edge: true }, { text: 'Body', edge: false }, { text: 'Sytuacja Co widzi', edge: false }, { text: 'Wiersz 1', edge: false }, { text: '1 / 3', edge: true }],
            [{ text: 'Sytuacja Co widzi', edge: false }, { text: 'Wiersz 2', edge: false }],
        ];
        expect(bodyLines(pages).map((l) => l.text)).toEqual(['body', 'sytuacja co widzi', 'wiersz 1', 'wiersz 2']);
    });

    it('parses page lists', () => {
        expect([...parsePageList('1-3, 5')]).toEqual([1, 2, 3, 5]);
        expect(parsePageList('').size).toBe(0);
    });

    it('detects running headers and footers, but not numbered body lines', () => {
        const pages = Array.from({ length: 6 }, (_, i) => [
            'KDS – instrukcja', `Akapit ${'a'.repeat(i + 1)}`, `Krok ${i}`, 'Stała treść', `Opis ${'b'.repeat(i + 1)}`, `${i + 1} / 6`,
        ]);
        const running = findRunningLines(pages);
        expect(running.has('kds - instrukcja')).toBe(true);
        expect(running.has('#/#')).toBe(true);
        expect(running.has('krok #')).toBe(false);
        const lines = bodyLines(pages).map((l) => l.text);
        expect(lines.slice(0, 4)).toEqual(['akapit a', 'krok 0', 'stała treść', 'opis b']);
        expect(lines).toHaveLength(24);
    });

    it('locates headings after a table of contents, including wrapped ones', () => {
        const lines = [
            'spis treści', 'wprowadzenie', 'ekran główny i bardzo długi tytuł',
            'wprowadzenie', 'tekst o ekranie',
            'ekran główny i bardzo', 'długi tytuł', 'treść',
        ].map((text, i) => ({ text, page: i }));
        const positions = locateHeadings(lines, [
            { text: '1. Wprowadzenie' },
            { text: 'Ekran główny i bardzo długi tytuł' },
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
        const tokens = { title: 'Manual "KDS"', chapter: '' };
        expect(slotToCssContent('{page} / {pages}', tokens)).toBe('counter(page) " / " counter(pages)');
        expect(slotToCssContent('{title}', tokens)).toBe('"Manual \\"KDS\\""');
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
});

describe('chapter rewriting', () => {
    it('resolves relative URLs against the markdown file', () => {
        expect(resolveRelativeUrl('screeny/a.png', '/kds/02-intro.md')).toBe('/kds/screeny/a.png');
        expect(resolveRelativeUrl('../img/a.png', '/docs/guide/x.md')).toBe('/docs/img/a.png');
        expect(resolveRelativeUrl('/abs.png', '/docs/x.md')).toBe('/abs.png');
        expect(resolveRelativeUrl('#x', '/docs/x.md')).toBe('#x');
        expect(resolveRelativeUrl('https://a.b/c', '/docs/x.md')).toBe('https://a.b/c');
    });

    it('rewrites raw HTML ids and URLs', () => {
        const html = '<img src="screeny/logo.png" alt="x"><a id="top" href="other.md#a">x</a>';
        expect(rewriteRawHtml(html, { prefix: 'c-x--', fileUrl: '/docs/p.md' }))
            .toBe('<img src="/docs/screeny/logo.png" alt="x"><a id="c-x--top" href="/docs/other.md#a">x</a>');
    });

    it('normalises routes for lookup', () => {
        expect(normalizeRoute('/base/guide/index.md#x', '/base/')).toBe('/guide');
        expect(normalizeRoute('/02-1-wprowadzenie/', '/')).toBe('/02-1-wprowadzenie');
        expect(normalizeRoute('/%C5%BC.md', '/')).toBe('/ż');
    });
});
