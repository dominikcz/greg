<script lang="ts">
    import type { Snippet } from 'svelte';

    type Props = {
        tag?: string;
        size?: 'medium' | 'big';
        theme?: 'brand' | 'alt' | 'sponsor';
        text?: string;
        href?: string;
        target?: string;
        rel?: string;
        onclick?: (e: MouseEvent) => void;
        children?: Snippet;
    };

    let {
        tag,
        size = 'medium',
        theme = 'brand',
        text,
        href,
        target,
        rel,
        onclick,
        children,
    }: Props = $props();

    const EXTERNAL_RE = /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i;

    let resolvedTag = $derived(tag ?? (href ? 'a' : 'button'));
    let isExternal = $derived(!!href && EXTERNAL_RE.test(href));
    let resolvedTarget = $derived(target ?? (isExternal ? '_blank' : undefined));
    let resolvedRel = $derived(rel ?? (isExternal ? 'noreferrer' : undefined));
    let resolvedRole = $derived(
        resolvedTag === 'a' || resolvedTag === 'button' ? undefined : 'button'
    );
</script>

<svelte:element
    this={resolvedTag}
    class="Button {size} {theme}"
    {href}
    target={resolvedTarget}
    rel={resolvedRel}
    role={resolvedRole}
    {onclick}
>
    {#if children}
        {@render children()}
    {:else}
        {text}
    {/if}
</svelte:element>

<style>
    .Button {
        display: inline-block;
        border: 1px solid transparent;
        text-align: center;
        font-weight: 600;
        white-space: nowrap;
        cursor: pointer;
        text-decoration: none;
        transition: color 0.25s, border-color 0.25s, background-color 0.25s;
    }

    .Button:active {
        transition: color 0.1s, border-color 0.1s, background-color 0.1s;
    }

    .Button.medium {
        border-radius: 20px;
        padding: 0 20px;
        line-height: 38px;
        font-size: 14px;
    }

    .Button.big {
        border-radius: 24px;
        padding: 0 24px;
        line-height: 46px;
        font-size: 16px;
    }

    /* brand */
    .Button.brand {
        border-color: var(--greg-accent);
        color: var(--greg-menu-active-color);
        background-color: var(--greg-accent);
    }

    .Button.brand:hover {
        border-color: color-mix(in srgb, var(--greg-accent) 80%, white);
        background-color: color-mix(in srgb, var(--greg-accent) 80%, white);
    }

    .Button.brand:active {
        border-color: color-mix(in srgb, var(--greg-accent) 90%, black);
        background-color: color-mix(in srgb, var(--greg-accent) 90%, black);
    }

    /* alt */
    .Button.alt {
        border-color: var(--greg-border-color);
        color: var(--greg-color);
        background-color: var(--greg-menu-background);
    }

    .Button.alt:hover {
        border-color: var(--greg-accent);
        color: var(--greg-accent);
    }

    .Button.alt:active {
        background-color: var(--greg-accent-light);
    }

    /* sponsor */
    .Button.sponsor {
        border-color: var(--greg-sponsor-color);
        color: var(--greg-sponsor-color);
        background-color: transparent;
    }

    .Button.sponsor:hover {
        border-color: var(--greg-sponsor-color);
        color: var(--greg-sponsor-color);
        background-color: var(--greg-sponsor-bg);
    }
</style>
