import { mdsvex, escapeSvelte } from 'mdsvex'
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { createHighlighter } from 'shiki';
import { rehypeTocPlaceholder } from './src/lib/MarkdownDocs/rehypeToc.js';
import { remarkContainers, rehypeContainers } from './src/lib/MarkdownDocs/remarkContainers.js';
import rehypeCodeGroup from './src/lib/MarkdownDocs/rehypeCodeGroup.js';
import { remarkCodeMeta } from './src/lib/MarkdownDocs/remarkCodeMeta.js';
import { remarkImports } from './src/lib/MarkdownDocs/remarkImports.js';

import { remarkGlobalComponents } from './src/lib/MarkdownDocs/remarkGlobalComponents.js';
import { remarkEscapeSvelte } from './src/lib/MarkdownDocs/remarkEscapeSvelte.js';
import { remarkCustomAnchors } from './src/lib/MarkdownDocs/remarkCustomAnchors.js';
import remarkAttr from 'remark-attr';
import { remarkMathToHtml } from './src/lib/MarkdownDocs/remarkMathToHtml.js';

// ── Greg config ────────────────────────────────────────────────────────────────
// Mirrors the VitePress convention:  export default { markdown: { math: true } }
const gregConfig = {
	markdown: {
		/** Enable $…$ / $$…$$ math rendering via MathJax SVG. Default: false. */
		math: false,
	},
};
// ───────────────────────────────────────────────────────────────────────────────

const shikiTheme = 'github-dark';
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
	const normalizedLang = String(lang ?? '').trim().toLowerCase() || shikiDefaultLang;
	const meta = String(metastring ?? '').trim();
	const titleMatch = meta.match(/\[([^\]]+)\]/);
	const title = titleMatch?.[1]?.trim() ?? '';

	return { lang: normalizedLang, title };
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
	themes: [shikiTheme],
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
			const parsed = parseFenceInfo(lang, metastring);
			const normalizedLang = parsed.lang;
			const mappedLang = shikiLangAliases[normalizedLang] ?? normalizedLang;
			const safeLang = highlighter.getLoadedLanguages().includes(normalizedLang) ? normalizedLang : shikiDefaultLang;
			const html = escapeSvelte(
				injectCodeMetadata(highlighter.codeToHtml(code, {
					lang: highlighter.getLoadedLanguages().includes(mappedLang) ? mappedLang : safeLang,
					theme: shikiTheme,
				}), mappedLang, parsed.title)
			);

			return `{@html \`${html}\` }`;
		},
	},
	remarkPlugins: [
		remarkAttr,
		[remarkImports, { sourceRoot: markdownSourceRoot, docsDir: markdownDocsDir }],
		remarkGlobalComponents,
		remarkCodeMeta,
		remarkContainers,
		remarkCustomAnchors,
		...(gregConfig.markdown.math ? [remarkMathToHtml] : []),
		// remarkEscapeSvelte,
	],
	rehypePlugins: [
		rehypeSlug,
		[rehypeAutolinkHeadings, { behavior: 'wrap' }],
		rehypeContainers,
		rehypeCodeGroup,
		rehypeTocPlaceholder,
	],
}
/** @type {import("@sveltejs/vite-plugin-svelte").SvelteConfig} */
export default {
  extensions: ['.svelte', '.svx', '.md'],
  // Consult https://svelte.dev/docs#compile-time-svelte-preprocess
  // for more information about preprocessors
  preprocess: mdsvex({ extensions: ['.svx', '.md'], ...mdsvexOptions }),
}


