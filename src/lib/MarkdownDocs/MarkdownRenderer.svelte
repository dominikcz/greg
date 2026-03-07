<script lang="ts">
/**
 * MarkdownRenderer
 *
 * Renders a raw Markdown string to HTML in the browser using the same
 * remark/rehype pipeline as the build-time mdsvex setup (minus Svelte-specific
 * and filesystem-specific plugins).
 *
 * Syntax highlighting is provided by highlight.js (client-side, tree-shakeable).
 * Svelte components (Badge, Button, Image, Link) are hydrated after render.
 * Mermaid diagrams are rendered via mermaid.js after render.
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { visit } from 'unist-util-visit';
import { mount, unmount, untrack } from 'svelte';

import { rehypeTocPlaceholder } from './rehypeToc.js';
import { remarkContainers, rehypeContainers } from './remarkContainers.js';
import rehypeCodeGroup from './rehypeCodeGroup.js';
import rehypeCodeTitle from './rehypeCodeTitle.js';
import { remarkCodeMeta } from './remarkCodeMeta.js';
import { remarkCustomAnchors } from './remarkCustomAnchors.js';
import { remarkInlineAttrs } from './remarkInlineAttrs.js';
import { remarkImportsBrowser } from './remarkImportsBrowser.js';

import { MERMAID_THEMES, DEFAULT_MERMAID_THEME, getColorSchemeTheme } from './mermaidThemes.js';
import Badge  from '../components/Badge.svelte';
import Button from '../components/Button.svelte';
import Image  from '../components/Image.svelte';
import Link   from '../components/Link.svelte';

import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

// ── Component registry ──────────────────────────────────────────────────────
// Maps lowercase HTML tag name → Svelte component.
// When markdown contains e.g. <Badge type="tip" text="NEW" />, the browser
// lowercases it to <badge>; after render we mount the real Svelte component.

const COMPONENT_REGISTRY: Record<string, any> = {
    badge:  Badge,
    button: Button,
    image:  Image,
    link:   Link,
};

let mountedInstances: ReturnType<typeof mount>[] = [];

function hydrateComponents(root: HTMLElement) {
    for (const c of mountedInstances) unmount(c);
    mountedInstances = [];
    for (const [tagName, Component] of Object.entries(COMPONENT_REGISTRY)) {
        for (const el of Array.from(root.querySelectorAll(tagName)) as HTMLElement[]) {
            // Keep code-group tabs as native <button> elements. If we hydrate
            // them into the generic Button component they look like CTA buttons
            // instead of tabs and lose rcg-tab styling.
            if (tagName === 'button' && el.closest('.rehype-code-group')) continue;

            const props: Record<string, string> = {};
            for (const attr of Array.from(el.attributes)) {
                props[attr.name] = attr.value;
            }
            // If Badge / Button has text children but no text prop, pass textContent
            if (!props.text && el.textContent?.trim()) {
                props.text = el.textContent.trim();
            }
            const wrapper = document.createElement('span');
            el.replaceWith(wrapper);
            mountedInstances.push(mount(Component, { target: wrapper, props }));
        }
    }
}

async function initMermaid(root: HTMLElement, themeConfig: Record<string, unknown> = {}) {
    const blocks = Array.from(root.querySelectorAll('pre.mermaid')) as HTMLElement[];
    if (!blocks.length) return;
    // Save the original source text so we can restore it for re-renders.
    for (const b of blocks) {
        if (!b.dataset.mermaidSrc) b.dataset.mermaidSrc = b.textContent ?? '';
    }
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({ startOnLoad: false, ...themeConfig });
    await mermaid.run({ nodes: blocks });
}

/**
 * Re-renders mermaid diagrams in `root` with a new theme config.
 * Restores original source text from `data-mermaid-src` before calling
 * mermaid.run(), because mermaid replaces the element's innerHTML with SVG.
 */
async function rerenderMermaid(root: HTMLElement, themeConfig: Record<string, unknown> = {}) {
    const blocks = Array.from(root.querySelectorAll('pre.mermaid[data-mermaid-src]')) as HTMLElement[];
    if (!blocks.length) return;
    for (const b of blocks) {
        b.removeAttribute('data-processed');
        b.textContent = b.dataset.mermaidSrc ?? '';
    }
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({ startOnLoad: false, ...themeConfig });
    await mermaid.run({ nodes: blocks });
}

// ── Props ────────────────────────────────────────────────────────────────────

type Props = {
    markdown: string;
    /** URL path of the current .md file, e.g. '/docs/guide/getting-started.md'. Used to resolve relative imports. */
    baseUrl?: string;
    /** Docs URL prefix, e.g. '/docs'. */
    docsPrefix?: string;
    /**
     * Key of the active Mermaid theme. Must be present in `mermaidThemes`.
     * Defaults to `'material'`.
     */
    mermaidTheme?: string;
    /**
     * Additional (or override) Mermaid theme configs keyed by theme name.
     * Merged on top of the built-in `MERMAID_THEMES` object.
     */
    mermaidThemes?: Record<string, Record<string, unknown>>;
    /**
     * Current colour scheme of the host application.
     * When `'dark'`, automatically selects `mermaidTheme + '-dark'` if available.
     */
    colorTheme?: 'light' | 'dark';
};
let {
    markdown,
    baseUrl = '/docs/index.md',
    docsPrefix = '/docs',
    mermaidTheme = DEFAULT_MERMAID_THEME,
    mermaidThemes: extraThemes = {},
    colorTheme,
}: Props = $props();

/** Combined theme map: built-ins overridden/extended by user-supplied themes. */
const allMermaidThemes = $derived({ ...MERMAID_THEMES, ...extraThemes });

/**
 * Effective theme key: switches to `<base>-dark` variant when colorTheme is dark
 * and such a variant exists in allMermaidThemes.
 */
const effectiveMermaidTheme = $derived(
    getColorSchemeTheme(mermaidTheme, colorTheme, allMermaidThemes),
);

/** Resolved MermaidConfig for the currently active theme. */
const activeMermaidThemeConfig = $derived(
    (allMermaidThemes[effectiveMermaidTheme] ?? allMermaidThemes[DEFAULT_MERMAID_THEME] ?? {}) as Record<string, unknown>,
);

// ── Rehype plugin: mermaid code blocks ───────────────────────────────────────
// Transforms <pre><code class="language-mermaid"> into <pre class="mermaid">
// so that mermaid.run() can pick it up after render.

function rehypeMermaid() {
    return (tree: any) => {
        visit(tree, 'element', (node: any, index: any, parent: any) => {
            if (node.tagName !== 'pre' || !parent || index == null) return;
            const code = node.children?.[0];
            if (!code || code.tagName !== 'code') return;
            const cls: string[] = code.properties?.className ?? [];
            if (!cls.includes('language-mermaid')) return;
            const text = (code.children ?? [])
                .filter((c: any) => c.type === 'text')
                .map((c: any) => c.value)
                .join('');
            parent.children[index] = {
                type: 'element',
                tagName: 'pre',
                properties: { className: ['mermaid'] },
                children: [{ type: 'text', value: text }],
            };
        });
    };
}

// ── Rehype plugin: normalize <Steps> wrapper in runtime HTML ───────────────
// In browser rendering, unknown component tags are serialized as lowercase
// HTML tags (e.g. <Steps> -> <steps>). Convert them to a regular block wrapper
// with a stable class so CSS can style them exactly like Starlight steps.
function rehypeStepsWrapper() {
    return (tree: any) => {
        visit(tree, 'element', (node: any) => {
            if (node.tagName !== 'steps') return;
            node.tagName = 'div';
            const existing = Array.isArray(node.properties?.className)
                ? node.properties.className
                : [];
            node.properties = {
                ...(node.properties ?? {}),
                className: existing.includes('greg-steps') ? existing : [...existing, 'greg-steps'],
            };
        });

        // With allowDangerousHtml and without rehype-raw, custom HTML tags may
        // remain as `raw` nodes. Normalize those too so styling still applies.
        visit(tree, 'raw', (node: any) => {
            if (typeof node.value !== 'string') return;
            node.value = node.value
                .replace(/<\s*steps\b[^>]*>/gi, '<div class="greg-steps">')
                .replace(/<\s*\/\s*steps\s*>/gi, '</div>');
        });
    };
}

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

// ── Processor ────────────────────────────────────────────────────────────────
// Rebuilt whenever baseUrl changes (each page navigation) so remarkImportsBrowser
// gets the correct relative-path context.

function buildProcessor(currentBaseUrl: string, currentDocsPrefix: string) {
    return unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkInlineAttrs)
        .use(remarkImportsBrowser, { baseUrl: currentBaseUrl, docsPrefix: currentDocsPrefix })
        .use(remarkCodeMeta)
        .use(remarkContainers)
        .use(remarkCustomAnchors)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeSlug)
        .use(rehypeAutolinkHeadings, {
            behavior: 'prepend',
            properties: { class: 'header-anchor', ariaHidden: 'true', tabIndex: -1 },
            content: { type: 'text', value: '#' },
        })
        .use(rehypeStepsWrapper)
        .use(rehypeMermaid)
        .use(rehypeHighlightJS)
        .use(rehypeContainers)
        .use(rehypeCodeGroup)
        .use(rehypeCodeTitle)
        .use(rehypeTocPlaceholder)
        .use(rehypeStringify, { allowDangerousHtml: true });
}

// ── Reactive rendering ────────────────────────────────────────────────────────

let html = $state('');
let containerEl: HTMLElement | undefined;

/** Strip YAML frontmatter block before rendering. */
function stripFrontmatter(src: string): string {
    return src.replace(/^---[\r\n][\s\S]*?[\r\n]---[\r\n]?/, '');
}

$effect(() => {
    if (!markdown) { html = ''; return; }
    const processor = buildProcessor(baseUrl, docsPrefix);
    processor.process(stripFrontmatter(markdown)).then(vfile => {
        html = String(vfile);
    });
});

// Effect 1: fires when rendered HTML changes (new markdown/page navigation).
// Uses untrack() for the theme config so theme changes do NOT re-trigger this
// effect — they are handled exclusively by Effect 2 below.
$effect(() => {
    const _ = html;
    if (!_ || !containerEl) return;
    hydrateComponents(containerEl);
    initMermaid(containerEl, untrack(() => activeMermaidThemeConfig));
});

// Effect 2: fires when the effective mermaid theme changes (light ↔ dark toggle).
// Re-renders existing SVGs so that themeVariables (background, darkMode, …)
// are updated. This is a no-op on initial load because initMermaid has not yet
// set data-mermaid-src on any element.
$effect(() => {
    const config = activeMermaidThemeConfig;
    if (!containerEl) return;
    rerenderMermaid(containerEl, config);
});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="markdown-renderer markdown-body" bind:this={containerEl}>
    {@html html}
</div>
