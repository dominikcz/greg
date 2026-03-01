<script lang="ts">
    import { onMount } from 'svelte';

    type Props = {
        code: string;
        placement: string;
        /** Current SPA route — when it changes, Carbon Ads is refreshed. */
        active?: string;
    };

    let { code, placement, active }: Props = $props();

    let container: HTMLDivElement;
    let initialized = false;

    onMount(() => {
        if (!initialized) {
            initialized = true;
            const s = document.createElement('script');
            s.id = '_carbonads_js';
            s.src = `//cdn.carbonads.com/carbon.js?serve=${code}&placement=${placement}`;
            s.async = true;
            container.appendChild(s);
        }
    });

    $effect(() => {
        // Track `active` so the effect re-runs on page navigation.
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        active;
        if (initialized) {
            (window as any)._carbonads?.refresh();
        }
    });
</script>

<div class="CarbonAds" bind:this={container}></div>

<style>
    .CarbonAds {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 24px;
        border-radius: 12px;
        min-height: 256px;
        text-align: center;
        line-height: 18px;
        font-size: 12px;
        font-weight: 500;
        background-color: var(--greg-carbon-ads-bg-color, var(--greg-menu-background));
    }

    .CarbonAds :global(img) {
        margin: 0 auto;
        border-radius: 6px;
    }

    .CarbonAds :global(.carbon-text) {
        display: block;
        margin: 0 auto;
        padding-top: 12px;
        color: var(--greg-carbon-ads-text-color, var(--greg-color));
        transition: color 0.25s;
    }

    .CarbonAds :global(.carbon-text:hover) {
        color: var(--greg-carbon-ads-hover-text-color, var(--greg-accent));
    }

    .CarbonAds :global(.carbon-poweredby) {
        display: block;
        padding-top: 6px;
        font-size: 11px;
        font-weight: 500;
        color: var(--greg-carbon-ads-poweredby-color, var(--greg-menu-section-color));
        text-transform: uppercase;
        transition: color 0.25s;
    }

    .CarbonAds :global(.carbon-poweredby:hover) {
        color: var(--greg-carbon-ads-hover-poweredby-color, var(--greg-accent));
    }

    /* Carbon injects multiple wrappers — show only the first */
    .CarbonAds :global(> div) {
        display: none;
    }

    .CarbonAds :global(> div:first-of-type) {
        display: block;
    }
</style>
