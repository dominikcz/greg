/**
 * Remark + Rehype plugins for VitePress-style containers and GitHub-flavored alerts.
 *
 * Architecture: two-phase, no inner sub-pipeline needed.
 *
 * 1. remarkContainers (remark plugin)
 *    - Pass 0: converts GitHub-flavored alert blockquotes (`> [!NOTE]`) into
 *      containerBlock nodes.
 *    - Pass 1 & 2: converts `:::` fenced containers into containerBlock nodes.
 *    Inner content stays as real mdast so the normal pipeline processes it
 *    (rehype-shiki, rehype-slug, etc.)
 *
 * 2. rehypeContainers (rehype plugin)
 *    Visits `container-block` hast elements and emits the final
 *    <div class="custom-block …">…</div> or <details>…</details> HTML.
 *
 * ::: container shapes produced by remark:
 *
 * A) Single paragraph (no blank lines — remark collapses to one node):
 *    paragraph { text: "::: info\nContent\n:::" }
 *
 * B) Multi-node span (blank lines or block elements inside):
 *    paragraph { text: "::: info Title" }
 *    ... block nodes ...
 *    paragraph { text: ":::" }
 *
 * Does NOT require remark-directive or any sub-pipeline.
 */

import { visit } from 'unist-util-visit';

// ─── Constants ────────────────────────────────────────────────────────────────

const defaultLabels = {
	infoLabel: 'INFO',
	tipLabel: 'TIP',
	warningLabel: 'WARNING',
	dangerLabel: 'DANGER',
	detailsLabel: 'Details',
};

const knownTypes = ['info', 'tip', 'warning', 'danger', 'details'];

const OPEN_LINE_RE = /^:::[ \t]+(\w+)(?:[ \t]+(.+?))?[ \t]*$/;
const CLOSE_LINE_RE = /^:::[ \t]*$/;

/** Maps GitHub alert type names to VitePress container types. */
const githubAlertTypeMap = {
	note: 'info',
	tip: 'tip',
	important: 'warning',
	warning: 'warning',
	caution: 'danger',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDefaultLabel(type, labels) {
	return (
		{
			info: labels.infoLabel,
			tip: labels.tipLabel,
			warning: labels.warningLabel,
			danger: labels.dangerLabel,
			details: labels.detailsLabel,
		}[type] ?? type.toUpperCase()
	);
}

/** Creates a containerBlock mdast node carrying type/title + inner mdast children. */
function containerBlockNode(type, rawTitle, children) {
	return {
		type: 'containerBlock',
		rawTitle,
		data: {
			hName: 'div',
			hProperties: {
				className: ['container-block'],
				'data-type': type,
				'data-title': rawTitle,
			},
		},
		children,
	};
}

/** Recursively extracts plain text from an mdast node. */
function nodeToText(node) {
	if (node.type === 'text' || node.type === 'inlineCode') return node.value ?? '';
	if (node.children) return node.children.map(nodeToText).join('');
	return '';
}

/**
 * Tries to parse a GitHub-flavored alert blockquote node.
 *
 * remark parses `[!NOTE]` as a `linkReference` (unresolved link), not plain
 * text, so we handle both:
 *   - `text`          node with value `[!NOTE]…`
 *   - `linkReference` node whose text content is `!NOTE`
 *
 * Returns `{ mappedType, title, innerNodes }` or `null`.
 */
function parseGithubAlert(node) {
	if (node?.type !== 'blockquote' || !node.children?.length) return null;

	const firstPara = node.children[0];
	if (firstPara?.type !== 'paragraph') return null;

	const paraChildren = firstPara.children ?? [];
	const first = paraChildren[0];
	if (!first) return null;

	let alertKey, remainderChildren;

	if (first.type === 'text') {
		// "[!NOTE] some text" collapsed into a text node
		const m = first.value.match(/^\[!([a-zA-Z]+)\]\s*/);
		if (!m) return null;
		alertKey = m[1].toLowerCase();
		const rest = first.value.slice(m[0].length);
		remainderChildren = rest
			? [{ ...first, value: rest }, ...paraChildren.slice(1)]
			: paraChildren.slice(1);
	} else if (first.type === 'linkReference') {
		// remark's normal parse: `[!NOTE]` → linkReference{ label: "!NOTE" }
		const m = nodeToText(first).match(/^!([a-zA-Z]+)$/);
		if (!m) return null;
		alertKey = m[1].toLowerCase();
		// Trim leading soft-break / newline between `[!TYPE]` and content
		let rest = paraChildren.slice(1);
		if (rest[0]?.type === 'break' || rest[0]?.type === 'softbreak') {
			rest = rest.slice(1);
		} else if (rest[0]?.type === 'text' && rest[0].value.startsWith('\n')) {
			const trimmed = rest[0].value.slice(1);
			rest = trimmed ? [{ ...rest[0], value: trimmed }, ...rest.slice(1)] : rest.slice(1);
		}
		remainderChildren = rest;
	} else {
		return null;
	}

	const mappedType = githubAlertTypeMap[alertKey];
	if (!mappedType) return null;

	const innerNodes = [
		...(remainderChildren.length ? [{ type: 'paragraph', children: remainderChildren }] : []),
		...node.children.slice(1),
	];

	return { mappedType, title: alertKey.toUpperCase(), innerNodes };
}

// ─── Remark plugin ────────────────────────────────────────────────────────────

export function remarkContainers(userOptions = {}) {
	return (tree) => {
		const children = tree.children;

		// Pass 0 — GitHub-flavored alerts: `> [!NOTE]`
		for (let i = 0; i < children.length; i++) {
			const parsed = parseGithubAlert(children[i]);
			if (!parsed) continue;
			children.splice(i, 1, containerBlockNode(parsed.mappedType, parsed.title, parsed.innerNodes));
		}

		// Apply ::: container syntax recursively (root + list items + blockquotes)
		applyContainerSyntaxRecursive(tree);
	};
}

/**
 * Walk the mdast bottom-up and apply Pass 1 + Pass 2 container syntax to
 * every block-level children array — including those nested inside list items
 * and blockquotes.
 */
function applyContainerSyntaxRecursive(node) {
	if (!node.children) return;

	// Recurse into nested block containers first (bottom-up).
	// Important: list items live under a `list` node, so recurse through any
	// node that has children instead of whitelisting only a few node types.
	for (const child of node.children) {
		if (Array.isArray(child.children)) {
			applyContainerSyntaxRecursive(child);
		}
	}

	// Then process this level's children array
	applyContainerPasses(node.children);
}

/**
 * Apply Pass 1 (single-paragraph :::) and Pass 2 (multi-node :::) to a
 * specific `children` array in-place.  Extracted from the original inline
 * implementation so it can be reused recursively.
 */
function applyContainerPasses(children) {
	// Pass 1 — single-paragraph ::: containers (no blank lines inside)
	for (let i = 0; i < children.length; i++) {
		const node = children[i];
		if (node.type !== 'paragraph') continue;

		const firstChild = node.children?.[0];
		if (firstChild?.type !== 'text') continue;

		const firstLine = firstChild.value.split('\n')[0].trim();
		const openMatch = firstLine.match(OPEN_LINE_RE);
		if (!openMatch) continue;

		const lastChild = node.children[node.children.length - 1];
		if (lastChild?.type !== 'text') continue;

		const lastLine = lastChild.value.split('\n').at(-1).trim();
		if (!CLOSE_LINE_RE.test(lastLine)) continue;

		const type = openMatch[1].toLowerCase();
		if (!knownTypes.includes(type)) continue;

		// Strip the opening and closing ::: lines; collect the inline nodes in between.
		const innerChildren = [];
		for (let ci = 0; ci < node.children.length; ci++) {
			const c = node.children[ci];
			const isFirst = ci === 0;
			const isLast = ci === node.children.length - 1;

			if (isFirst && isLast) {
				const afterOpen = c.value.slice(c.value.indexOf('\n') + 1);
				const content = afterOpen.slice(0, afterOpen.lastIndexOf('\n'));
				if (content.trim()) innerChildren.push({ ...c, value: content });
			} else if (isFirst) {
				const afterOpen = c.value.slice(c.value.indexOf('\n') + 1);
				if (afterOpen) innerChildren.push({ ...c, value: afterOpen });
			} else if (isLast) {
				const beforeClose = c.value.slice(0, c.value.lastIndexOf('\n'));
				if (beforeClose) innerChildren.push({ ...c, value: beforeClose });
			} else {
				innerChildren.push(c);
			}
		}

		const innerNodes = innerChildren.length
			? [{ type: 'paragraph', children: innerChildren }]
			: [];

		children.splice(i, 1, containerBlockNode(type, openMatch[2] ?? '', innerNodes));
	}

	// Pass 2 — multi-node ::: containers (blank lines or block elements inside)
	const spans = [];
	const stack = [];
	for (let i = 0; i < children.length; i++) {
		const node = children[i];
		if (node.type !== 'paragraph') continue;
		const text = nodeToText(node).trim();
		if (text.includes('\n')) continue; // already handled in Pass 1

		const openMatch = text.match(OPEN_LINE_RE);
		if (openMatch) {
			stack.push({ openIdx: i, type: openMatch[1], title: openMatch[2] ?? '' });
			continue;
		}
		if (CLOSE_LINE_RE.test(text) && stack.length > 0) {
			const frame = stack.pop();
			if (stack.length === 0) spans.push({ ...frame, closeIdx: i });
		}
	}
	for (const { openIdx, closeIdx, type, title: rawTitle } of spans.reverse()) {
		const lcType = type.toLowerCase();
		if (!knownTypes.includes(lcType)) continue;
		const innerNodes = children.slice(openIdx + 1, closeIdx);
		children.splice(openIdx, closeIdx - openIdx + 1, containerBlockNode(lcType, rawTitle, innerNodes));
	}
}

// ─── Rehype plugin ────────────────────────────────────────────────────────────
// Runs after rehype-shiki, rehype-slug, etc. have processed the inner content.
// Replaces <div class="container-block"> with the final custom-block markup.

export function rehypeContainers(userOptions = {}) {
	const labels = { ...defaultLabels, ...userOptions };

	return (tree) => {
		visit(tree, 'element', (node, index, parent) => {
			if (node.tagName !== 'div' || !node.properties?.className?.includes('container-block')) return;

			const type = node.properties['data-type'];
			const rawTitle = node.properties['data-title'] ?? '';

			const isOpen = /\{open\}/i.test(rawTitle);
			const title = rawTitle.replace(/\s*\{open\}\s*$/i, '').trim() || getDefaultLabel(type, labels);

			if (type === 'details') {
				parent.children.splice(index, 1, {
					type: 'element',
					tagName: 'details',
					properties: {
						className: ['custom-block', 'details'],
						...(isOpen ? { open: true } : {}),
					},
					children: [
						{
							type: 'element',
							tagName: 'summary',
							properties: { className: ['custom-block-title'] },
							children: [{ type: 'text', value: title }],
						},
						...node.children,
					],
				});
			} else {
				parent.children.splice(index, 1, {
					type: 'element',
					tagName: 'div',
					properties: { className: ['custom-block', type] },
					children: [
						{
							type: 'element',
							tagName: 'p',
							properties: { className: ['custom-block-title'] },
							children: [{ type: 'text', value: title }],
						},
						...node.children,
					],
				});
			}
		});
	};
}
