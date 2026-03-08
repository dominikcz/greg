import { mdsvex, escapeSvelte } from 'mdsvex'
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { createHighlighter } from 'shiki';
import { rehypeTocPlaceholder } from './src/lib/MarkdownDocs/rehypeToc.js';
import { remarkContainers, rehypeContainers } from './src/lib/MarkdownDocs/remarkContainers.js';
import rehypeCodeGroup from './src/lib/MarkdownDocs/rehypeCodeGroup.js';
import rehypeCodeTitle from './src/lib/MarkdownDocs/rehypeCodeTitle.js';
import { remarkCodeMeta } from './src/lib/MarkdownDocs/remarkCodeMeta.js';
import { remarkImports } from './src/lib/MarkdownDocs/remarkImports.js';
import { remarkGlobalComponents } from './src/lib/MarkdownDocs/remarkGlobalComponents.js';
import { remarkCustomAnchors } from './src/lib/MarkdownDocs/remarkCustomAnchors.js';
import { remarkInlineAttrs } from './src/lib/MarkdownDocs/remarkInlineAttrs.js';
import { remarkEscapeSvelte } from './src/lib/MarkdownDocs/remarkEscapeSvelte.js';
import { remarkMathToHtml } from './src/lib/MarkdownDocs/remarkMathToHtml.js';
import { parseCodeDirectives, decorateHighlightedCodeHtml } from './src/lib/MarkdownDocs/codeDirectives.js';
import { normalizeCodeFenceInfo } from './src/lib/MarkdownDocs/codeFenceInfo.js';

// ── Greg config ────────────────────────────────────────────────────────────────
// Mirrors the VitePress convention:  export default { markdown: { math: true } }
const gregConfig = {
	markdown: {
		/** Enable $…$ / $$…$$ math rendering via MathJax SVG. Default: false. */
		math: false,
	},
};
// ───────────────────────────────────────────────────────────────────────────────

const shikiThemes = {
	light: 'github-light',
	dark: 'github-dark',
};
const shikiDefaultLang = 'txt';
const markdownSourceRoot = process.cwd();
const markdownDocsDir = 'docs';
const shikiLangAliases = {
	js: 'javascript',
	ts: 'typescript',
	sh: 'bash',
	shell: 'bash',
	zsh: 'bash',
	yml: 'yaml',
	md: 'markdown',
};

function parseFenceInfo(lang, metastring) {
	const normalized = normalizeCodeFenceInfo(lang ?? '', metastring ?? '');
	const normalizedLang = normalized.lang || shikiDefaultLang;
	const meta = normalized.meta;
	const titleMatch = meta.match(/\[([^\]]+)\]/);
	const title = titleMatch?.[1]?.trim() ?? '';

	return { lang: normalizedLang, title, meta };
}

function encodeAttribute(value) {
	return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function injectCodeMetadata(html, lang, title) {
	const langAttr = ` data-code-lang="${encodeAttribute(lang)}"`;
	const titleAttr = title ? ` data-code-title="${encodeAttribute(title)}"` : '';
	return html.replace('<pre', `<pre${langAttr}${titleAttr}`);
}

const highlighter = await createHighlighter({
	themes: [shikiThemes.light, shikiThemes.dark],
	langs: [
		'javascript',
		'typescript',
		'bash',
		'json',
		'html',
		'css',
		'yaml',
		'markdown',
		'svelte',
		'txt',
	],
});

/** @type {import('mdsvex').MdsvexOptions} */
const mdsvexOptions = {
	highlight: {
		highlighter: (code, lang = shikiDefaultLang, metastring = '') => {
			const { lang: rawLang, title, meta } = parseFenceInfo(lang, metastring);
			const directives = parseCodeDirectives(code, meta, rawLang);
			const mappedLang = shikiLangAliases[rawLang] ?? rawLang;
			const loadedLangs = highlighter.getLoadedLanguages();
			const safeLang = loadedLangs.includes(mappedLang) ? mappedLang
				: loadedLangs.includes(rawLang) ? rawLang
					: shikiDefaultLang;
			let shikiHtml = highlighter.codeToHtml(directives.cleanedCode, {
				lang: safeLang,
				themes: shikiThemes,
				defaultColor: false,
			});
			shikiHtml = decorateHighlightedCodeHtml(shikiHtml, directives);
			const html = escapeSvelte(
				injectCodeMetadata(shikiHtml, mappedLang, title)
			);
			return `{@html \`${html}\` }`;
		},
	},
	remarkPlugins: [
		remarkInlineAttrs,
		remarkGlobalComponents,
		remarkCodeMeta,
		remarkContainers,
		[remarkImports, { sourceRoot: markdownSourceRoot, docsDir: markdownDocsDir }],
		remarkCustomAnchors,
		...(gregConfig.markdown.math ? [remarkMathToHtml] : []),
		remarkEscapeSvelte,
	],
	rehypePlugins: [
		rehypeSlug,
		[
			rehypeAutolinkHeadings,
			{
				behavior: 'prepend',
				properties: {
					class: 'header-anchor',
					ariaHidden: 'true',
					tabIndex: -1,
				},
				content: { type: 'text', value: '#' },
			},
		],
		rehypeContainers,
		[rehypeCodeGroup, { output: 'static-tabs' }],
		rehypeCodeTitle,
		rehypeTocPlaceholder,
	],
}
/** @type {import("@sveltejs/vite-plugin-svelte").SvelteConfig} */
export default {
	extensions: ['.svelte', '.svx', '.md'],
	preprocess: mdsvex({ extensions: ['.svx', '.md'], ...mdsvexOptions }),
	compilerOptions: {
		// Use injected CSS so that component styles are included in JS output.
		// This avoids virtual CSS module loading failures when the package
		// is consumed from node_modules (vite-plugin-svelte race condition).
		css: 'injected',
	},
};

