<script lang="ts">
    import Image from './Image.svelte';
    import Link from './Link.svelte';

    type FeatureIcon =
        | string
        | { src: string; alt?: string; width?: number | string; height?: number | string; wrap?: boolean }
        | { dark: string; light: string; alt?: string; wrap?: boolean };

    type Props = {
        icon?: FeatureIcon;
        title: string;
        details?: string | string[];
        link?: string;
        linkText?: string;
        rel?: string;
        target?: string;
    };

    let { icon, title, details, link, linkText, rel, target }: Props = $props();

    function isImageIcon(
        i: FeatureIcon,
    ): i is { src: string; alt?: string; width?: number | string; height?: number | string; wrap?: boolean } {
        return typeof i === 'object' && ('src' in i || 'dark' in i);
    }

    function shouldWrap(i: FeatureIcon): boolean {
        if (typeof i === 'object' && 'wrap' in i) return !!(i as any).wrap;
        return false;
    }

    // Resolved per render — avoid TS cast inside templates
    let iconImg      = $derived(isImageIcon(icon!) ? (icon as any) : null);
    let iconAlt      = $derived(iconImg?.alt ?? '');
    let iconWidth    = $derived(iconImg?.width  ?? 48);
    let iconHeight   = $derived(iconImg?.height ?? 48);
    let iconWrapped  = $derived(iconImg && shouldWrap(icon!));
</script>

<Link class="Feature" href={link} {rel} {target} noIcon tag={link ? 'a' : 'div'}>
    <article class="box">
        {#if icon}
            {#if iconWrapped}
                <div class="icon">
                    <Image image={iconImg} alt={iconAlt} height={iconHeight} width={iconWidth} />
                </div>
            {:else if iconImg}
                <Image image={iconImg} alt={iconAlt} height={iconHeight} width={iconWidth} />
            {:else if typeof icon === 'string'}
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                <div class="icon">{@html icon}</div>
            {/if}
        {/if}

        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        <h2 class="title">{@html title}</h2>

        {#if Array.isArray(details)}
            <ul class="details">
                {#each details as item}
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                    <li>{@html item}</li>
                {/each}
            </ul>
        {:else if details}
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            <p class="details">{@html details}</p>
        {/if}

        {#if linkText}
            <div class="link-text">
                <p class="link-text-value">
                    {linkText}
                    <svg class="link-text-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M19.9,12.4c0.1-0.2,0.1-0.5,0-0.8c-0.1-0.1-0.1-0.2-0.2-0.3l-7-7c-0.4-0.4-1-0.4-1.4,0s-0.4,1,0,1.4l5.3,5.3H5c-0.6,0-1,0.4-1,1s0.4,1,1,1h11.6l-5.3,5.3c-0.4,0.4-0.4,1,0,1.4c0.2,0.2,0.5,0.3,0.7,0.3s0.5-0.1,0.7-0.3l7-7C19.8,12.6,19.9,12.5,19.9,12.4z"/>
                    </svg>
                </p>
            </div>
        {/if}
    </article>
</Link>

<style>
    :global(.Feature) {
        display: block;
        border: 1px solid var(--greg-border-color);
        border-radius: 12px;
        height: 100%;
        background-color: var(--greg-menu-background);
        transition: border-color 0.25s, background-color 0.25s;
        text-decoration: none;
        color: inherit;
    }

    :global(.Feature.link:hover) {
        border-color: var(--greg-accent);
    }

    .box {
        display: flex;
        flex-direction: column;
        padding: 24px;
        height: 100%;
    }

    .icon {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 20px;
        border-radius: 6px;
        background-color: var(--greg-background);
        width: 48px;
        height: 48px;
        font-size: 24px;
        transition: background-color 0.25s;
    }

    .title {
        line-height: 24px;
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 0;
        border: none;
        padding: 0;
    }

    .details {
        flex-grow: 1;
        padding-top: 8px;
        line-height: 24px;
        font-size: 14px;
        font-weight: 500;
        color: var(--greg-menu-section-color);
        margin: 0;
    }

    ul.details {
        list-style-type: disc;
        padding-left: 14px;
    }

    .link-text {
        padding-top: 8px;
    }

    .link-text-value {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;
        font-weight: 500;
        color: var(--greg-accent);
        margin: 0;
    }

    .link-text-icon {
        width: 14px;
        height: 14px;
        fill: currentColor;
        flex-shrink: 0;
    }

    :global(.box > .Image) {
        margin-bottom: 20px;
        width: 48px;
        height: 48px;
        object-fit: contain;
    }
</style>
