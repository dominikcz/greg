<script lang="ts">
/**
 * MarkdownRenderer
 *
 * Renders a raw Markdown string to HTML in the browser using the same
 * remark/rehype pipeline as the build-time mdsvex setup (minus Svelte-specific
 * and filesystem-specific plugins).
 *
 * Syntax highlighting is provided by highlight.js (client-side, tree-shakeable).
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { visit } from 'unist-util-visit';

import { remarkContainers, rehypeContainers } from './remarkContainers.js';
import rehypeCodeGroup from './rehypeCodeGroup.js';
import rehypeCodeTitle from './rehypeCodeTitle.js';
import { remarkCodeMeta } from './remarkCodeMeta.js';
import { remarkCustomAnchors } from './remarkCustomAnchors.js';
import { remarkInlineAttrs } from './remarkInlineAttrs.js';

import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

// ── Props ────────────────────────────────────────────────────────────────────

type Props = { markdown: string };
let { markdown }: Props = $props();

// ── Rehype plugin: highlight.js code blocks ──────────────────────────────────

function rehypeHighlightJS() {
    return (tree: any) => {
        visit(tree, 'element', (node: any, _index: any, parent: any) => {
            if (node.tagName !== 'code') return;
            // Only highlight fenced code blocks (parent is <pre>)
            if (parent?.tagName !== 'pre') return;

            const raw = node.children
                ?.filter((c: any) => c.type === 'text')
                .map((c: any) => c.value)
                .join('') ?? '';

            // Read language from class="language-xxx"
            const cls: string = (node.properties?.className ?? []).find((c: string) => c.startsWith('language-')) ?? '';
            const lang = cls.replace('language-', '');

            // Attach data-code-lang for rehypeCodeTitle / code group
            if (lang) node.properties['data-code-lang'] = lang;

            let highlighted: string;
            try {
                highlighted = lang && hljs.getLanguage(lang)
                    ? hljs.highlight(raw, { language: lang, ignoreIllegals: true }).value
                    : hljs.highlightAuto(raw).value;
            } catch {
                return; // leave as-is on failure
            }

            node.properties.className = [...(node.properties.className ?? []), 'hljs'];
            node.children = [{ type: 'raw', value: highlighted }];
        });
    };
}

// ── Rehype plugin: strip [[toc]] placeholders ─────────────────────────────────
// The sidebar Outline component scans DOM headings, so inline TOC is not needed.

function rehypeStripToc() {
    return (tree: any) => {
        visit(tree, 'element', (node: any, index: number | undefined, parent: any) => {
            if (node.tagName !== 'p') return;
            const text = node.children
                ?.filter((c: any) => c.type === 'text')
                .map((c: any) => c.value)
                .join('') ?? '';
            if (/^\[\[toc\]\]$/i.test(text.trim()) && parent && index != null) {
                parent.children.splice(index, 1);
                return index;
            }
        });
    };
}

// ── Processor ────────────────────────────────────────────────────────────────

const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkInlineAttrs)
    .use(remarkCodeMeta)
    .use(remarkContainers)
    .use(remarkCustomAnchors)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
    .use(rehypeHighlightJS)
    .use(rehypeContainers)
    .use(rehypeCodeGroup)
    .use(rehypeCodeTitle)
    .use(rehypeStripToc)
    .use(rehypeStringify, { allowDangerousHtml: true });

// ── Reactive rendering ────────────────────────────────────────────────────────

let html = $state('');

/** Strip YAML frontmatter block before rendering. */
function stripFrontmatter(src: string): string {
    return src.replace(/^---[\r\n][\s\S]*?[\r\n]---[\r\n]?/, '');
}

$effect(() => {
    if (!markdown) { html = ''; return; }
    processor.process(stripFrontmatter(markdown)).then(vfile => {
        html = String(vfile);
    });
});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="markdown-renderer markdown-body">
    {@html html}
</div>
