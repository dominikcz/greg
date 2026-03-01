<script lang="ts">
    import type { Snippet } from 'svelte';

    type Props = {
        tag?: string;
        href?: string;
        noIcon?: boolean;
        target?: string;
        rel?: string;
        class?: string;
        children?: Snippet;
    };

    let { tag, href, noIcon = false, target, rel, class: cls = '', children }: Props = $props();

    const EXTERNAL_RE = /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i;

    let resolvedTag = $derived(tag ?? (href ? 'a' : 'span'));
    let isExternal = $derived(
        (!!href && EXTERNAL_RE.test(href)) || target === '_blank',
    );
    let resolvedTarget = $derived(target ?? (isExternal ? '_blank' : undefined));
    let resolvedRel = $derived(rel ?? (isExternal ? 'noreferrer' : undefined));
    let classes = $derived(
        ['Link', href ? 'link' : '', isExternal && !noIcon ? 'external-link-icon' : '', noIcon ? 'no-icon' : '', cls]
            .filter(Boolean)
            .join(' '),
    );
</script>

<svelte:element
    this={resolvedTag}
    class={classes}
    {href}
    target={resolvedTarget}
    rel={resolvedRel}
>
    {#if children}
        {@render children()}
    {/if}
</svelte:element>

<style>
    .Link {
        color: inherit;
        text-decoration: none;
    }

    .Link.link {
        color: var(--greg-accent);
        text-underline-offset: 2px;
        transition: color 0.25s, opacity 0.25s;
    }

    .Link.link:hover {
        color: color-mix(in srgb, var(--greg-accent) 80%, white);
    }

    .Link.external-link-icon:after {
        content: '';
        display: inline-block;
        width: 11px;
        height: 11px;
        margin-left: 3px;
        vertical-align: middle;
        background: currentColor;
        mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'/%3E%3C/svg%3E") center/contain no-repeat;
        -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'/%3E%3C/svg%3E") center/contain no-repeat;
    }

    .Link.no-icon:after {
        display: none;
    }
</style>
