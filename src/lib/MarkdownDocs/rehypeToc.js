import { visit, SKIP } from 'unist-util-visit';

/**
 * Default options — compatible with @mdit-vue/plugin-toc
 * @see https://github.com/mdit-vue/mdit-vue/tree/main/packages/plugin-toc
 *
 * @typedef {Object} TocOptions
 * @property {RegExp}    pattern        - Placeholder pattern. Default: /^\[\[toc\]\]$/i
 * @property {number[]}  level          - Heading levels to include. Default: [2, 3]
 * @property {string}    containerTag   - Container element tag. Default: 'nav'
 * @property {string}    containerClass - Container element class. Default: 'table-of-contents'
 * @property {'ul'|'ol'} listTag        - List element tag. Default: 'ul'
 * @property {string}    listClass      - List element class. Default: ''
 * @property {string}    itemClass      - List item class. Default: ''
 * @property {string}    linkTag        - Link tag. Default: 'a'
 * @property {string}    linkClass      - Link class. Default: ''
 * @property {Function}  format         - Optional heading text formatter. Default: undefined
 */

const defaults = {
	pattern: /^\[\[toc\]\]$/i,
	level: [2, 3],
	containerTag: 'nav',
	containerClass: 'table-of-contents',
	listTag: 'ul',
	listClass: '',
	itemClass: '',
	linkTag: 'a',
	linkClass: '',
	format: undefined,
};

/**
 * Rehype plugin: replaces [[TOC]] paragraph with a nested TOC tree,
 * compatible with @mdit-vue/plugin-toc HTML output and options.
 *
 * @param {Partial<typeof defaults>} userOptions
 */
export function rehypeTocPlaceholder(userOptions = {}) {
	const options = { ...defaults, ...userOptions };

	return (tree) => {
		// Collect headings matching the requested levels
		const headings = [];
		visit(tree, 'element', (node) => {
			const level = parseInt(node.tagName.slice(1), 10);
			if (
				node.tagName.match(/^h[1-6]$/) &&
				options.level.includes(level) &&
				node.properties?.id
			) {
				const text = options.format
					? options.format(collectText(node))
					: collectText(node);
				headings.push({ id: node.properties.id, text, level });
			}
		});

		if (!headings.length) return;

		// Find [[TOC]] paragraph and replace it
		visit(tree, 'element', (node, index, parent) => {
			if (node.tagName !== 'p' || !parent || index == null) return;
			const raw = collectText(node).trim();
			if (!options.pattern.test(raw)) return;

			const nested = buildNestedTree(headings);
			const listNode = renderList(nested, options);

			const containerProps = options.containerClass
				? { className: options.containerClass.split(' ').filter(Boolean) }
				: {};

			parent.children.splice(index, 1, {
				type: 'element',
				tagName: options.containerTag,
				properties: containerProps,
				children: [listNode],
			});
		});
	};
}

/** Collect all text content from a node, skipping header-anchor elements */
function collectText(node) {
	let text = '';
	visit(node, (n) => {
		if (n.type === 'element' && (n.properties?.class === 'header-anchor' || n.properties?.className?.includes?.('header-anchor'))) return SKIP;
		if (n.type === 'text') text += n.value;
	});
	return text;
}

/**
 * Build a nested tree from a flat headings list,
 * matching mdit-vue's resolveHeadersFromTokens behavior.
 */
function buildNestedTree(headings) {
	const root = [];
	const stack = [];

	for (const h of headings) {
		const node = { ...h, children: [] };

		while (stack.length > 0 && stack[stack.length - 1].level >= h.level) {
			stack.pop();
		}

		if (stack.length === 0) {
			root.push(node);
		} else {
			stack[stack.length - 1].children.push(node);
		}

		stack.push(node);
	}

	return root;
}

/**
 * Recursively render nested heading tree to hast nodes.
 * Output matches mdit-vue's createRenderHeaders structure:
 *   <ul>
 *     <li><a href="#id">text</a><ul>...</ul></li>
 *   </ul>
 */
function renderList(nodes, options) {
	const listProps = options.listClass
		? { className: options.listClass.split(' ').filter(Boolean) }
		: {};

	const items = nodes.map((node) => {
		const linkProps = { href: `#${node.id}` };
		if (options.linkClass) {
			linkProps.className = options.linkClass.split(' ').filter(Boolean);
		}

		const liChildren = [
			{
				type: 'element',
				tagName: options.linkTag,
				properties: linkProps,
				children: [{ type: 'text', value: node.text }],
			},
		];

		if (node.children.length > 0) {
			liChildren.push(renderList(node.children, options));
		}

		const itemProps = options.itemClass
			? { className: options.itemClass.split(' ').filter(Boolean) }
			: {};

		return {
			type: 'element',
			tagName: 'li',
			properties: itemProps,
			children: liChildren,
		};
	});

	return {
		type: 'element',
		tagName: options.listTag,
		properties: listProps,
		children: items,
	};
}
