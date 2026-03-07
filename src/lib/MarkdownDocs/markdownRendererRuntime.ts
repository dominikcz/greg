import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

import { rehypeTocPlaceholder } from "./rehypeToc.js";
import { remarkContainers, rehypeContainers } from "./remarkContainers.js";
import rehypeCodeGroup from "./rehypeCodeGroup.js";
import rehypeCodeTitle from "./rehypeCodeTitle.js";
import { remarkCodeMeta } from "./remarkCodeMeta.js";
import { remarkCustomAnchors } from "./remarkCustomAnchors.js";
import { remarkInlineAttrs } from "./remarkInlineAttrs.js";
import { remarkImportsBrowser } from "./remarkImportsBrowser.js";

import Badge from "../components/Badge.svelte";
import Button from "../components/Button.svelte";
import Image from "../components/Image.svelte";
import Link from "../components/Link.svelte";
import CodeGroup from "../components/CodeGroup.svelte";
import Hero from "../components/Hero.svelte";
import Features from "../components/Features.svelte";
import TeamMembers from "../components/TeamMembers.svelte";

export type PluginEntry = {
    name: string;
    plugin: any;
    options?: Record<string, any>;
};

export type PropsBuilder = (el: HTMLElement) => Record<string, any>;

export type ComponentHydrationEntry = {
    component: any;
    buildProps: PropsBuilder;
    selector?: string;
};

export type RenderHandlerContext = {
    mermaidThemeConfig: Record<string, unknown>;
};

export type RenderHandler = {
    name: string;
    run: (
        root: HTMLElement,
        context: RenderHandlerContext,
    ) => void | Promise<void>;
};

const HEADER_AUTOLINK_OPTIONS = {
    behavior: "prepend",
    properties: {
        class: "header-anchor",
        ariaHidden: "true",
        tabIndex: -1,
    },
    content: { type: "text", value: "#" },
};

export function buildPropsFromAttributes(
    el: HTMLElement,
): Record<string, string> {
    const props: Record<string, string> = {};
    for (const attr of Array.from(el.attributes)) {
        props[attr.name] = attr.value;
    }
    // If Badge / Button has text children but no text prop, pass textContent.
    if (!props.text && el.textContent?.trim()) {
        props.text = el.textContent.trim();
    }
    return props;
}

export function parseCodeGroupProps(el: HTMLElement) {
    const tabsRaw = el.getAttribute("data-codegroup-tabs") ?? "[]";
    let tabs: string[] = [];
    try {
        const parsed = JSON.parse(tabsRaw);
        if (Array.isArray(parsed)) {
            tabs = parsed.map((value) => String(value));
        }
    } catch {
        tabs = [];
    }

    const blocks = Array.from(el.querySelectorAll(":scope > .rcg-block")).map(
        (block) => (block as HTMLElement).innerHTML,
    );

    if (!tabs.length) {
        tabs = blocks.map((_value, index) => `Tab ${index + 1}`);
    }

    const initialActive = Number(el.getAttribute("data-codegroup-active") ?? "0");

    return {
        tabs,
        blocks,
        initialActive: Number.isFinite(initialActive) ? initialActive : 0,
    };
}

function parseJsonAttribute<T>(
    el: HTMLElement,
    attribute: string,
    fallback: T,
): T {
    const raw = el.getAttribute(attribute);
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

function parseHeroProps(el: HTMLElement) {
    const props = buildPropsFromAttributes(el);
    const {
        ["data-hydrate"]: _dataHydrate,
        ["data-hero-image"]: _heroImage,
        ["data-hero-actions"]: _heroActions,
        ...plainProps
    } = props;
    const image = parseJsonAttribute(el, "data-hero-image", undefined);
    const actions = parseJsonAttribute(el, "data-hero-actions", [] as any[]);
    return {
        ...plainProps,
        ...(image ? { image } : {}),
        actions,
    };
}

function parseFeaturesProps(el: HTMLElement) {
    const features = parseJsonAttribute(el, "data-features", [] as any[]);
    return { features };
}

function parseTeamMembersProps(el: HTMLElement) {
    const props = buildPropsFromAttributes(el);
    const {
        ["data-hydrate"]: _dataHydrate,
        ["data-members"]: _members,
        ...plainProps
    } = props;
    const members = parseJsonAttribute(el, "data-members", [] as any[]);
    return {
        ...plainProps,
        members,
    };
}

export const COMPONENT_REGISTRY: Record<string, ComponentHydrationEntry> = {
    badge: {
        component: Badge,
        buildProps: buildPropsFromAttributes,
    },
    button: {
        component: Button,
        buildProps: buildPropsFromAttributes,
    },
    image: {
        component: Image,
        buildProps: buildPropsFromAttributes,
    },
    link: {
        component: Link,
        buildProps: buildPropsFromAttributes,
    },
    codegroup: {
        component: CodeGroup,
        buildProps: parseCodeGroupProps,
    },
    hero: {
        component: Hero,
        buildProps: parseHeroProps,
        selector: "hero, [data-hydrate=hero]",
    },
    features: {
        component: Features,
        buildProps: parseFeaturesProps,
        selector: "features, [data-hydrate=features]",
    },
    teammembers: {
        component: TeamMembers,
        buildProps: parseTeamMembersProps,
        selector: "teammembers, [data-hydrate=teammembers]",
    },
};

export function getRuntimeRenderHandlers(deps: {
    hydrateComponents: (root: HTMLElement) => void;
    initMermaid: (
        root: HTMLElement,
        themeConfig: Record<string, unknown>,
    ) => void | Promise<void>;
}): RenderHandler[] {
    return [
        {
            name: "hydrate-components",
            run: (root) => deps.hydrateComponents(root),
        },
        {
            name: "init-mermaid",
            run: (root, context) =>
                deps.initMermaid(root, context.mermaidThemeConfig),
        },
    ];
}

export function getThemeChangeRenderHandlers(deps: {
    rerenderMermaid: (
        root: HTMLElement,
        themeConfig: Record<string, unknown>,
    ) => void | Promise<void>;
}): RenderHandler[] {
    return [
        {
            name: "rerender-mermaid",
            run: (root, context) =>
                deps.rerenderMermaid(root, context.mermaidThemeConfig),
        },
    ];
}

export async function runRenderHandlers(
    root: HTMLElement,
    handlers: RenderHandler[],
    context: RenderHandlerContext,
) {
    for (const handler of handlers) {
        try {
            await handler.run(root, context);
        } catch {
            // Individual handler failures should not block other handlers.
            continue;
        }
    }
}

export function getRemarkPluginEntries(
    currentBaseUrl: string,
    currentDocsPrefix: string,
): PluginEntry[] {
    return [
        { name: "remark-parse", plugin: remarkParse },
        { name: "remark-gfm", plugin: remarkGfm },
        { name: "remark-inline-attrs", plugin: remarkInlineAttrs },
        {
            name: "remark-imports-browser",
            plugin: remarkImportsBrowser,
            options: {
                baseUrl: currentBaseUrl,
                docsPrefix: currentDocsPrefix,
            },
        },
        { name: "remark-code-meta", plugin: remarkCodeMeta },
        { name: "remark-containers", plugin: remarkContainers },
        {
            name: "remark-custom-anchors",
            plugin: remarkCustomAnchors,
        },
        {
            name: "remark-rehype",
            plugin: remarkRehype,
            options: { allowDangerousHtml: true },
        },
    ];
}

export function getRehypePluginEntries(deps: {
    rehypeStepsWrapper: any;
    rehypeMermaid: any;
    rehypeShiki: any;
}): PluginEntry[] {
    return [
        { name: "rehype-slug", plugin: rehypeSlug },
        {
            name: "rehype-autolink-headings",
            plugin: rehypeAutolinkHeadings,
            options: HEADER_AUTOLINK_OPTIONS,
        },
        { name: "rehype-steps-wrapper", plugin: deps.rehypeStepsWrapper },
        { name: "rehype-mermaid", plugin: deps.rehypeMermaid },
        { name: "rehype-shiki", plugin: deps.rehypeShiki },
        { name: "rehype-containers", plugin: rehypeContainers },
        { name: "rehype-code-group", plugin: rehypeCodeGroup },
        { name: "rehype-code-title", plugin: rehypeCodeTitle },
        { name: "rehype-toc-placeholder", plugin: rehypeTocPlaceholder },
        {
            name: "rehype-stringify",
            plugin: rehypeStringify,
            options: { allowDangerousHtml: true },
        },
    ];
}

export function applyPluginEntries(processor: any, entries: PluginEntry[]) {
    for (const entry of entries) {
        if (entry.options) {
            processor.use(entry.plugin, entry.options);
            continue;
        }
        processor.use(entry.plugin);
    }
    return processor;
}
