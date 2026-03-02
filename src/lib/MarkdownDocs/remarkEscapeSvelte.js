/**
 * remarkEscapeSvelte
 *
 * Escapes `{` and `}` in plain Markdown *text* nodes so Svelte's compiler
 * doesn't treat them as template expressions.
 *
 * Only TEXT nodes are touched. Raw HTML nodes (including Svelte component
 * elements like `<Hero items={data} />`) are intentionally left unmodified so
 * that Svelte prop-binding expressions `{…}` remain valid after compilation.
 *
 * Code nodes (inline code and fenced code blocks) are untouched — mdsvex
 * wraps those in `{@html …}` itself.
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
		// Only escape { } inside plain Markdown text nodes.
		// HTML nodes are passed through unchanged so that Svelte component
		// attributes like actions={[…]} compile correctly.
		visit(tree, 'text', (node) => {
			node.value = escapeText(node.value);
		});
	};
}
