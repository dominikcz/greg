<script lang="ts">
    import { onMount } from "svelte";

    type SocialLinkIcon = string | { svg: string };

    type Props = {
        icon: SocialLinkIcon;
        link: string;
        ariaLabel?: string;
        me?: boolean;
    };

    let { icon, link, ariaLabel, me = true }: Props = $props();

    let el: HTMLAnchorElement | undefined = $state();

    // If the CSS mask for a named icon isn't loaded, fall back to Iconify API
    onMount(() => {
        const span = el?.children[0];
        if (
            span instanceof HTMLElement &&
            span.className.startsWith("social-icon-") &&
            (getComputedStyle(span).maskImage ||
                (getComputedStyle(span) as any).webkitMaskImage) === "none"
        ) {
            const name = span.className.replace("social-icon-", "");
            span.style.setProperty(
                "--icon",
                `url('https://api.iconify.design/simple-icons/${name}.svg')`,
            );
        }
    });

    let svgHtml = $derived.by(() => {
        if (typeof icon === "object") return icon.svg;
        return `<span class="social-icon-${icon}"></span>`;
    });

    let label = $derived(ariaLabel ?? (typeof icon === "string" ? icon : ""));
    let relAttr = $derived(me ? "me noopener" : "noopener");
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
<a
    bind:this={el}
    class="SocialLink no-icon"
    href={link}
    aria-label={label}
    target="_blank"
    rel={relAttr}>{@html svgHtml}</a
>

<style>
    .SocialLink {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 36px;
        height: 36px;
        color: var(--greg-menu-section-color);
        transition: color 0.5s;
        text-decoration: none;
    }

    .SocialLink:hover {
        color: var(--greg-color);
        transition: color 0.25s;
    }

    .SocialLink :global(svg),
    .SocialLink :global([class^="social-icon-"]) {
        width: 20px;
        height: 20px;
        fill: currentColor;
    }

    /* Named icon support via CSS mask (same mechanism as VitePress vpi-social-*) */
    .SocialLink :global([class^="social-icon-"]) {
        display: inline-block;
        background: currentColor;
        mask: var(--icon) center / contain no-repeat;
        -webkit-mask: var(--icon) center / contain no-repeat;
    }
</style>
