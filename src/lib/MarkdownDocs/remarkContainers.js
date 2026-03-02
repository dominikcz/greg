/**
 * Remark + Rehype plugins for VitePress-style ::: containers.
 *
 * Architecture: two-phase, no inner sub-pipeline needed.
 *
 * 1. remarkContainers (remark plugin)
 *    Finds ::: syntax and wraps inner mdast nodes in a custom
 *    `containerBlock` node. Inner content stays as real mdast nodes
 *    so the normal pipeline processes them (rehype-shiki, rehype-slug, etc.)
 *
 * 2. rehypeContainers (rehype plugin)
 *    Visits `container-block` hast elements and emits the final
 *    <div class="custom-block …">…</div> or <details>…</details> HTML.
 *
 * Handles two AST shapes produced by remark:
 *
 * A) Single paragraph (content has no blank lines — remark collapses to one node):
 *    paragraph { text: "::: info\nContent\n:::" }
 *
 * B) Multi-node span (content has blank lines or block elements like code fences):
 *    paragraph { text: "::: info Title" }
 *    ... block content nodes ...
 *    paragraph { text: ":::" }
 *
 * Does NOT require remark-directive or any sub-pipeline.
 */

import { visit } from 'unist-util-visit';

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
const githubAlertTypeMap = {
	note: 'info',
	tip: 'tip',
	important: 'warning',
	warning: 'warning',
	caution: 'danger',
};

function getDefaultLabel(type, labels) {
	return {
		info: labels.infoLabel,
		tip: labels.tipLabel,
		warning: labels.warningLabel,
		danger: labels.dangerLabel,
		details: labels.detailsLabel,
	}[type] ?? type.toUpperCase();
}

/** Creates a custom mdast node that carries container type/title + inner mdast children. */
function containerBlockNode(type, rawTitle, children) {
	return {
		type: 'containerBlock',
		containerType: type,
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

function nodeToText(node) {
	if (node.type === 'text' || node.type === 'inlineCode') return node.value ?? '';
	if (node.children) return node.children.map(nodeToText).join('');
	return '';
}

/**
 * Extracts the [!TYPE] label from the first child of a paragraph.
 *
 * remark may parse `[!NOTE]` either as:
 *   - a plain `text` node with value `[!NOTE]`  (rare)
 *   - a `linkReference` node with child text `!NOTE` (common — remark treats it
 *     as an unresolved link reference)
 *
 * Returns { alertKey, remainderChildren } or null.
 */
function extractAlertLabel(paragraphNode) {
	const children = paragraphNode?.children;
	if (!Array.isArray(children) || children.length === 0) return null;

	const first = children[0];

	// Case A: plain text "[!NOTE]…"
	if (first.type === 'text') {
		const m = first.value.match(/^\[!([a-zA-Z]+)\]\s*/);
		if (!m) return null;
		const alertKey = m[1].toLowerCase();
		// Remainder is the rest of the text in the same node + any siblings
		const restText = first.value.slice(m[0].length);
		const remainderChildren = restText
			? [{ ...first, value: restText }, ...children.slice(1)]
			: children.slice(1);
		return { alertKey, remainderChildren };
	}

	// Case B: linkReference "[!NOTE]" (remark's normal parse result)
	if (first.type === 'linkReference') {
		const innerText = nodeToText(first); // e.g. "!NOTE"
		const lm = innerText.match(/^!([a-zA-Z]+)$/);
		if (!lm) return null;
		const alertKey = lm[1].toLowerCase();
		// Skip/trim soft-break immediately after the label if present
		let rest = children.slice(1);
		if (rest[0]?.type === 'break' || rest[0]?.type === 'softbreak') {
			rest = rest.slice(1);
		} else if (rest[0]?.type === 'text' && rest[0].value.startsWith('\n')) {
			const trimmed = rest[0].value.slice(1);
			rest = trimmed ? [{ ...rest[0], value: trimmed }, ...rest.slice(1)] : rest.slice(1);
		}
		return { alertKey, remainderChildren: rest };
	}

	return null;
}

function parseGithubAlertFromBlockquote(node) {
	if (node?.type !== 'blockquote' || !Array.isArray(node.children) || node.children.length === 0) {
		return null;
	}

	const firstPara = node.children[0];
	if (!firstPara || firstPara.type !== 'paragraph') return null;

	const extracted = extractAlertLabel(firstPara);
	if (!extracted) return null;

	const { alertKey, remainderChildren } = extracted;
	const mappedType = githubAlertTypeMap[alertKey];
	if (!mappedType) return null;

	const title = alertKey.toUpperCase();

	// Build inner mdast nodes:
	// - if there is inline content on the same line as [!TYPE], wrap it in a paragraph
	// - keep any subsequent block children from the blockquote
	const subsequentBlocks = node.children.slice(1);
	const innerNodes = [];

	if (remainderChildren.length > 0) {
		innerNodes.push({ type: 'paragraph', children: remainderChildren });
	}
	innerNodes.push(...subsequentBlocks);

	return { mappedType, title, innerNodes };
}

// ─── Remark plugin ────────────────────────────────────────────────────────────

export function remarkContainers(userOptions = {}) {
	return (tree) => {
		const children = tree.children;

		// Pass 0: GitHub-flavored alerts (blockquote form)
		for (let i = 0; i < children.length; i++) {
			const parsed = parseGithubAlertFromBlockquote(children[i]);
			if (!parsed) continue;

			children.splice(
				i,
				1,
				containerBlockNode(parsed.mappedType, parsed.title, parsed.innerNodes)
			);
		}

		// Pass 1: single-paragraph containers (no blank lines — remark collapses to one paragraph)
		for (let i = 0; i < children.length; i++) {
			const node = children[i];
			if (node.type !== 'paragraph') continue;

			const firstChild = node.children?.[0];
			if (!firstChild || firstChild.type !== 'text') continue;
			const firstLine = firstChild.value.split('\n')[0].trim();
			const openMatch = firstLine.match(OPEN_LINE_RE);
			if (!openMatch) continue;

			const lastChild = node.children[node.children.length - 1];
			if (!lastChild || lastChild.type !== 'text') continue;
			const lastLine = lastChild.value.split('\n').at(-1).trim();
			if (!CLOSE_LINE_RE.test(lastLine)) continue;

			const type = openMatch[1].toLowerCase();
			if (!knownTypes.includes(type)) continue;

			// Strip open/close lines, keep remaining inline nodes as mdast children
			const innerChildren = [];
			for (let ci = 0; ci < node.children.length; ci++) {
				const c = node.children[ci];
				const isFirst = ci === 0;
				const isLast = ci === node.children.length - 1;

				if (isFirst && isLast) {
					const afterFirst = c.value.slice(c.value.indexOf('\n') + 1);
					const beforeLast = afterFirst.slice(0, afterFirst.lastIndexOf('\n'));
					if (beforeLast.trim()) innerChildren.push({ ...c, value: beforeLast });
				} else if (isFirst) {
					const afterFirst = c.value.slice(c.value.indexOf('\n') + 1);
					if (afterFirst) innerChildren.push({ ...c, value: afterFirst });
				} else if (isLast) {
					const beforeLast = c.value.slice(0, c.value.lastIndexOf('\n'));
					if (beforeLast) innerChildren.push({ ...c, value: beforeLast });
				} else {
					innerChildren.push(c);
				}
			}

			// Wrap inline children in a paragraph so remarkRehype processes them normally
			const innerNodes = innerChildren.length
				? [{ type: 'paragraph', children: innerChildren }]
				: [];

			children.splice(i, 1, containerBlockNode(type, openMatch[2] || '', innerNodes));
		}

		// Pass 2: multi-node spans (open para + block content + close para)
		const spans = [];
		const stack = [];
		for (let i = 0; i < children.length; i++) {
			const node = children[i];
			if (node.type !== 'paragraph') continue;
			const text = nodeToText(node).trim();
			if (text.includes('\n')) continue; // handled in Pass 1
			const openMatch = text.match(OPEN_LINE_RE);
			if (openMatch) {
				stack.push({ openIdx: i, type: openMatch[1], title: openMatch[2] || '' });
				continue;
			}
			if (CLOSE_LINE_RE.test(text) && stack.length > 0) {
				const frame = stack.pop();
				if (stack.length === 0) spans.push({ ...frame, closeIdx: i });
			}
		}
		for (const span of spans.reverse()) {
			const { openIdx, closeIdx, type, title: rawTitle } = span;
			const lcType = type.toLowerCase();
			if (!knownTypes.includes(lcType)) continue;
			const innerNodes = children.slice(openIdx + 1, closeIdx);
			children.splice(openIdx, closeIdx - openIdx + 1, containerBlockNode(lcType, rawTitle, innerNodes));
		}
	};
}

// ─── Rehype plugin ────────────────────────────────────────────────────────────
// Runs after all other rehype plugins (shiki, slug, etc.) have processed children.
// Replaces the intermediate <div class="container-block"> with the final markup.

export function rehypeContainers(userOptions = {}) {
	const labels = { ...defaultLabels, ...userOptions };

	return (tree) => {
		visit(tree, 'element', (node, index, parent) => {
			if (
				node.tagName !== 'div' ||
				!node.properties?.className?.includes('container-block')
			) return;

			const type = node.properties['data-type'];
			const rawTitle = node.properties['data-title'] ?? '';

			const isOpen = /\{open\}/i.test(rawTitle);
			let title = rawTitle.replace(/\s*\{open\}\s*$/i, '').trim();
			if (!title) title = getDefaultLabel(type, labels);

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
