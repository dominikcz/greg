/**
 * remarkMathToHtml
 *
 * Scans remark text nodes for $...$ (inline) and $$...$$ (display) patterns
 * and renders them server-side with MathJax (SVG output).
 *
 * NOTE: remark-math's micromark extension is NOT active during mdsvex's parse
 * step (user plugins are added as AST transforms, not parser extensions).
 * Therefore all math stays as plain text nodes, and this plugin handles them
 * entirely through text-node scanning.
 *
 * After inserting block-level <div> nodes into paragraph children the plugin
 * also splits those paragraphs so no <div> ends up inside a <p>.
 */
import { visit } from 'unist-util-visit';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { mathjax } from 'mathjax-full/js/mathjax.js';

function createMathJax() {
	const adaptor = liteAdaptor();
	RegisterHTMLHandler(adaptor);
	const input = new TeX({ packages: AllPackages });
	const output = new SVG({ fontCache: 'none' });
	const doc = mathjax.document('', { InputJax: input, OutputJax: output });
	return { adaptor, doc };
}

// Matches $$...$$  OR  $...$  (non-greedy; $$ takes priority via alternation order).
// Group 1 = display math content, Group 2 = inline math content.
const MATH_RE = /\$\$([\s\S]*?)\$\$|\$(?!\$)((?:[^$\\]|\\[\s\S])*?)\$/g;

export function remarkMathToHtml() {
	const { adaptor, doc } = createMathJax();

	function renderMath(latex, display) {
		try {
			const liteEl = doc.convert(latex, { display });
			return adaptor.outerHTML(liteEl);
		} catch {
			return `<span class="math-error">[MathJax error]</span>`;
		}
	}

	function wrapNode(svg, display) {
		const tag = display ? 'div' : 'span';
		const cls = display ? 'math math-display' : 'math math-inline';
		return { type: 'html', value: `<${tag} class="${cls}">${svg}</${tag}>` };
	}

	/**
	 * Split a text node's value into parts according to MATH_RE.
	 * Returns null if no math was found.
	 */
	function splitTextNode(value) {
		const parts = [];
		let last = 0;
		MATH_RE.lastIndex = 0;
		let match;
		while ((match = MATH_RE.exec(value)) !== null) {
			if (match.index > last) {
				parts.push({ type: 'text', value: value.slice(last, match.index) });
			}
			const display = match[1] !== undefined;
			const latex = display ? match[1] : match[2];
			parts.push(wrapNode(renderMath(latex, display), display));
			last = match.index + match[0].length;
		}
		if (parts.length === 0) return null;
		if (last < value.length) {
			parts.push({ type: 'text', value: value.slice(last) });
		}
		return parts;
	}

	return (tree) => {
		// ── Pass 1: also convert any math/inlineMath nodes if remark-math DID fire ──
		const mathNodes = [];
		visit(tree, 'math', (node, index, parent) => {
			if (!parent || index == null) return;
			mathNodes.push({ node, index, parent, display: true });
		});
		visit(tree, 'inlineMath', (node, index, parent) => {
			if (!parent || index == null) return;
			mathNodes.push({ node, index, parent, display: false });
		});
		for (const { node, index, parent, display } of mathNodes) {
			parent.children[index] = wrapNode(renderMath(node.value, display), display);
		}

		// ── Pass 2: scan ALL text nodes for $...$ and $$...$$ ────────────────────
		const textNodes = [];
		visit(tree, 'text', (node, index, parent) => {
			if (!parent || index == null) return;
			if (node.value.includes('$')) textNodes.push({ node, index, parent });
		});

		// Reverse so splicing doesn't shift earlier indices.
		for (const { node, index, parent } of textNodes.reverse()) {
			const parts = splitTextNode(node.value);
			if (parts) parent.children.splice(index, 1, ...parts);
		}

		// ── Pass 3: lift block <div> nodes out of <p> to avoid invalid nesting ───
		const paragraphs = [];
		visit(tree, 'paragraph', (node, index, parent) => {
			if (!parent || index == null) return;
			if (node.children.some(c => c.type === 'html' && c.value.startsWith('<div'))) {
				paragraphs.push({ node, index, parent });
			}
		});

		for (const { node, index, parent } of paragraphs.reverse()) {
			const replacement = [];
			let buf = [];

			const flush = () => {
				const kept = buf.filter(c => !(c.type === 'text' && !c.value.trim()));
				if (kept.length) replacement.push({ type: 'paragraph', children: kept });
				buf = [];
			};

			for (const child of node.children) {
				if (child.type === 'html' && child.value.startsWith('<div')) {
					flush();
					replacement.push(child);
				} else {
					buf.push(child);
				}
			}
			flush();
			parent.children.splice(index, 1, ...replacement);
		}
	};
}

export default remarkMathToHtml;
