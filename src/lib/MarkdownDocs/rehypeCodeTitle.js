import { visit } from 'unist-util-visit';

/**
 * Rehype plugin that wraps fenced code blocks that have a `data-code-title`
 * attribute in a container div and prepends a title bar, similar to how
 * code groups display their tab labels.
 *
 * Code blocks processed by the Shiki highlighter become `raw` nodes in the
 * hast tree (mdsvex wraps them in {@html `…`}).  The title is carried as an
 * HTML attribute inside the raw string, e.g.:
 *   <pre data-code-title="filename.js" data-code-lang="js">…</pre>
 *
 * Output:
 *   <div class="code-block-with-title">
 *     <div class="code-block-title">filename.js</div>
 *     {raw node}
 *   </div>
 *
 * Code blocks that already live inside a code-group tab panel (.rcg-block)
 * are intentionally skipped – their title is already shown as the tab label.
 */

const TITLE_ATTR_RE = /data-code-title=["']([^"']+)["']/i;

function normalizeClassNameList(value) {
	if (Array.isArray(value)) return value;
	if (typeof value === 'string') return value.split(/\s+/).filter(Boolean);
	return [];
}

function getTitleFromElement(node) {
	if (!node || node.type !== 'element') return '';
	const own = node.properties?.['data-code-title'] ?? node.properties?.dataCodeTitle;
	if (typeof own === 'string' && own.trim()) return own.trim();

	if (node.tagName === 'pre') {
		for (const child of node.children ?? []) {
			if (child?.type !== 'element' || child.tagName !== 'code') continue;
			const nested = child.properties?.['data-code-title'] ?? child.properties?.dataCodeTitle;
			if (typeof nested === 'string' && nested.trim()) return nested.trim();
		}
	}

	return '';
}

function wrapWithTitle(title, node) {
	const titleNode = {
		type: 'element',
		tagName: 'div',
		properties: { className: ['code-block-title'] },
		children: [{ type: 'text', value: title }],
	};

	return {
		type: 'element',
		tagName: 'div',
		properties: { className: ['code-block-with-title'] },
		children: [titleNode, node],
	};
}

export default function rehypeCodeTitle() {
	return (tree) => {
		visit(tree, 'element', (node, index, parent) => {
			if (!parent || typeof index !== 'number') return;
			if (node.tagName !== 'pre') return;

			// Skip blocks inside code-group tab panels
			const parentClasses = normalizeClassNameList(parent.properties?.className);
			if (parentClasses.includes('rcg-block')) return;

			const title = getTitleFromElement(node);
			if (!title) return;

			parent.children[index] = wrapWithTitle(title, node);
		});

		visit(tree, 'raw', (node, index, parent) => {
			if (!parent || typeof index !== 'number') return;

			// Skip blocks inside code-group tab panels
			const parentClasses = normalizeClassNameList(parent.properties?.className);
			if (parentClasses.includes('rcg-block')) return;

			const raw = String(node.value ?? '');
			const titleMatch = raw.match(TITLE_ATTR_RE);
			if (!titleMatch) return;

			const title = titleMatch[1].trim();
			if (!title) return;

			parent.children[index] = wrapWithTitle(title, node);
		});
	};
}
