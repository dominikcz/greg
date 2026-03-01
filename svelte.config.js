import { mdsvex, escapeSvelte } from 'mdsvex'
import { createHighlighter } from 'shiki';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { rehypeTocPlaceholder } from './src/lib/MarkdownDocs/rehypeToc.js';

const theme = 'github-dark';
const highlighter = await createHighlighter({
	themes: [theme],
	langs: ['javascript', 'typescript']
});

/** @type {import('mdsvex').MdsvexOptions} */
const mdsvexOptions = {
	highlight: {
		highlighter: async (code, lang = 'text') => {
			const html = escapeSvelte(highlighter.codeToHtml(code, { lang, theme }));
			return `{@html \`${html}\` }`;
		}
	},
	rehypePlugins: [
		rehypeSlug,
		[rehypeAutolinkHeadings, { behavior: 'wrap' }],
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


