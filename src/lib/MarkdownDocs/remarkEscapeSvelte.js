/**
 * remarkEscapeSvelte
 *
 * Escapes `{` and `}` in Markdown text/html nodes so Svelte's compiler doesn't
 * treat them as template expressions. Code nodes (inline code and code blocks)
 * are left untouched — mdsvex wraps those in `{@html}` itself.
 */
import { visit } from 'unist-util-visit';

/** Characters that need escaping in raw Svelte template text */
const ESCAPE_RE = /[{}]/g;
const ESCAPE_MAP = { '{': '&#123;', '}': '&#125;' };

function escapeText(str) {
	return str.replace(ESCAPE_RE, (ch) => ESCAPE_MAP[ch]);
}

export function remarkEscapeSvelte() {
	return (tree) => {
		// Escape { } inside markdown text nodes
		visit(tree, 'text', (node) => {
			node.value = escapeText(node.value);
		});

		// Escape { } inside raw HTML nodes that are NOT <script> or <style>
		// (mdsvex injects <script> blocks which must stay unescaped)
		visit(tree, 'html', (node) => {
			const v = node.value.trimStart();
			if (
				v.startsWith('<script') ||
				v.startsWith('</script') ||
				v.startsWith('<style') ||
				v.startsWith('</style')
			) {
				return;
			}
			node.value = escapeText(node.value);
		});
	};
}
