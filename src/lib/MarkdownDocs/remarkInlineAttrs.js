/**
 * remarkInlineAttrs
 *
 * Lightweight replacement for remark-attr that does NOT use the legacy
 * remark v2 tokenizer API (which breaks code-fence parsing).
 *
 * Supported syntax (inline, on the same line):
 *   [link text](url){key="value" key2="val2"}
 *   ![alt](src){width=200}
 *
 * The `{…}` block must:
 *   - Immediately follow a link/image (no space between `)` and `{`)
 *   - Be the last thing on the line (or followed only by whitespace)
 *
 * The parsed attributes are set on `node.data.hProperties` so rehype picks
 * them up correctly.
 *
 * Note: heading `{#id}` syntax is handled by remarkCustomAnchors — this
 * plugin intentionally ignores heading nodes.
 */
import { visit } from 'unist-util-visit';

/** Parse `{key="value" key2=val2 .class #id}` into a plain object. */
function parseAttrs(raw) {
	const attrs = {};
	// key="value"  or  key='value'  or  key=bareword
	const KV_RE = /([\w-]+)="([^"]*)"|([\w-]+)='([^']*)'|([\w-]+)=([\S]+)|(\.[\w-]+)|(#[\w-]+)/g;
	let m;
	while ((m = KV_RE.exec(raw)) !== null) {
		if (m[1]) {
			attrs[m[1]] = m[2]; // key="value"
		} else if (m[3]) {
			attrs[m[3]] = m[4]; // key='value'
		} else if (m[5]) {
			attrs[m[5]] = m[6]; // key=bareword
		} else if (m[7]) {
			// .class  → append to className
			const cls = m[7].slice(1);
			attrs.class = attrs.class ? `${attrs.class} ${cls}` : cls;
		} else if (m[8]) {
			// #id
			attrs.id = m[8].slice(1);
		}
	}
	return attrs;
}

/**
 * In the mdast, after micromark parses `[text](url){attrs}`, the `{attrs}`
 * part ends up as a `text` node immediately following the `link` node inside
 * the same `paragraph.children` array.
 *
 * This transform:
 *   1. Finds link/image nodes followed by a text node starting with `{…}`.
 *   2. Parses the attribute block.
 *   3. Merges the attributes into `node.data.hProperties`.
 *   4. Removes the `{…}` text from the following node (or removes the node
 *      if it becomes empty).
 */
export function remarkInlineAttrs() {
	return (tree) => {
		visit(tree, 'paragraph', (node) => {
			const children = node.children;
			if (!Array.isArray(children)) return;

			for (let i = 0; i < children.length; i++) {
				const child = children[i];
				if (child.type !== 'link' && child.type !== 'image') continue;

				const next = children[i + 1];
				if (!next || next.type !== 'text') continue;

				// The attr block must start immediately (no leading space)
				const attrMatch = next.value.match(/^\{([^}]*)\}/);
				if (!attrMatch) continue;

				const attrs = parseAttrs(attrMatch[1]);
				if (Object.keys(attrs).length === 0) continue;

				// Apply attributes to the link/image node
				child.data = child.data ?? {};
				child.data.hProperties = child.data.hProperties ?? {};
				Object.assign(child.data.hProperties, attrs);

				// Remove the matched `{…}` prefix from the next text node
				const remainder = next.value.slice(attrMatch[0].length);
				if (remainder === '') {
					children.splice(i + 1, 1);
				} else {
					next.value = remainder;
				}
			}
		});
	};
}
