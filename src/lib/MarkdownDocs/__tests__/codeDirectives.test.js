import { describe, it, expect } from 'vitest';
import { parseCodeDirectives, decorateHighlightedCodeHtml } from '../codeDirectives.js';
import { normalizeCodeFenceInfo } from '../codeFenceInfo.js';

describe('codeDirectives', () => {
	it('parses meta line ranges and strips inline code markers', () => {
		const parsed = parseCodeDirectives('const a = 1; // [!code ++]\nconst token = a;', '{2} [demo.ts]');
		expect(parsed.cleanedCode).toContain('const a = 1;');
		expect(parsed.cleanedCode).not.toContain('[!code');
		expect(parsed.lineInfo[0].diffAdd).toBe(true);
		expect(parsed.lineInfo[1].highlight).toBe(true);
	});

	it('decorates line wrappers with classes', () => {
		const directives = parseCodeDirectives('const oldValue = 1; // [!code --]\nconst token = oldValue; // [!code focus]', '{1}');
		const html = '<pre><code><span class="line">const oldValue = 1;</span>\n<span class="line">const token = oldValue;</span></code></pre>';
		const out = decorateHighlightedCodeHtml(html, directives);

		expect(out).toContain('line highlighted diff remove');
		expect(out).toContain('line focused');
		expect(out).toContain('has-focused-lines');
	});

	it('does not strip markers inside markdown source fences', () => {
		const parsed = parseCodeDirectives('const oldValue = 1; // [!code --]\n', '', 'md');
		expect(parsed.cleanedCode).toContain('[!code --]');
		expect(parsed.cleanedCode.endsWith('\n')).toBe(false);
		expect(parsed.lineInfo).toEqual([]);
	});

	it('supports line numbers metadata with custom start index', () => {
		const parsed = parseCodeDirectives('const a = 1;\nconst b = 2;', 'line-numbers=10', 'ts');
		expect(parsed.lineNumbers).toEqual({ enabled: true, start: 10 });

		const html = '<pre><code><span class="line">const a = 1;</span>\n<span class="line">const b = 2;</span></code></pre>';
		const out = decorateHighlightedCodeHtml(html, parsed);
		expect(out).toContain('data-line-numbers="true"');
		expect(out).toContain('data-line="10"');
		expect(out).toContain('data-line="11"');
	});

	it('enables line numbers with default start when no index is provided', () => {
		const parsed = parseCodeDirectives('const a = 1;', 'line-numbers', 'ts');
		expect(parsed.lineNumbers).toEqual({ enabled: true, start: 1 });
	});

	it('normalizes vitepress-style lang/meta forms', () => {
		expect(normalizeCodeFenceInfo('ts{2}', '')).toEqual({ lang: 'ts', meta: '{2}' });
		expect(normalizeCodeFenceInfo('ts:line-numbers=10', '{1}')).toEqual({
			lang: 'ts',
			meta: '{1} line-numbers=10',
		});
	});
});
