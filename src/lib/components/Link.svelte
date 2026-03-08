<script lang="ts">
    import type { Snippet } from "svelte";
    import { ExternalLink } from "@lucide/svelte";

    type Props = {
        tag?: string;
        href?: string;
        noIcon?: boolean;
        target?: string;
        rel?: string;
        class?: string;
        children?: Snippet;
    };

    let {
        tag,
        href,
        noIcon = false,
        target,
        rel,
        class: cls = "",
        children,
    }: Props = $props();

    const EXTERNAL_RE = /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i;

    let resolvedTag = $derived(tag ?? (href ? "a" : "span"));
    let isExternal = $derived(
        (!!href && EXTERNAL_RE.test(href)) || target === "_blank",
    );
    let resolvedTarget = $derived(
        target ?? (isExternal ? "_blank" : undefined),
    );
    let resolvedRel = $derived(rel ?? (isExternal ? "noreferrer" : undefined));
    let classes = $derived(
        [
            "Link",
            href ? "link" : "",
            isExternal && !noIcon ? "external-link-icon" : "",
            noIcon ? "no-icon" : "",
            cls,
        ]
            .filter(Boolean)
            .join(" "),
    );
</script>

{#if resolvedTag === "a"}
    <a class={classes} href={href} target={resolvedTarget} rel={resolvedRel}>
        {#if children}
            {@render children()}
        {/if}
        {#if isExternal && !noIcon}
            <span class="external-icon" aria-hidden="true">
                <ExternalLink size={11} strokeWidth={2} />
            </span>
        {/if}
    </a>
{:else}
    <svelte:element this={resolvedTag} class={classes}>
        {#if children}
            {@render children()}
        {/if}
    </svelte:element>
{/if}

<style>
    .Link {
        color: inherit;
        text-decoration: none;
    }

    .Link.link {
        color: var(--greg-accent);
        text-underline-offset: 2px;
        transition:
            color 0.25s,
            opacity 0.25s;
    }

    .Link.link:hover {
        color: color-mix(in srgb, var(--greg-accent) 80%, white);
    }

    .external-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-left: 3px;
        vertical-align: middle;
        line-height: 1;
    }

    .external-icon :global(svg) {
        stroke: currentColor;
    }

    .Link.no-icon .external-icon {
        display: none;
    }

    :global(.greg[data-external-link-icon="false"]) .Link.external-link-icon .external-icon {
        display: none;
    }
</style>
