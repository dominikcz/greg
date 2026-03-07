<script lang="ts">
    import type { Snippet } from "svelte";
    import Hero from "$components/Hero.svelte";
    import Features from "$components/Features.svelte";

    type HeroAction = {
        theme?: "brand" | "alt";
        text: string;
        link: string;
        target?: string;
        rel?: string;
    };
    type FeatureItem = {
        icon?: string;
        title: string;
        details?: string;
        link?: string;
        linkText?: string;
    };

    type Props = {
        hero?: {
            name?: string;
            text?: string;
            tagline?: string;
            image?: unknown;
            actions?: HeroAction[];
        };
        features?: FeatureItem[];
        children?: Snippet;
        [key: string]: unknown;
    };

    let { hero, features, children }: Props = $props();
</script>

<div class="home-layout">
    {#if hero}
        <Hero
            name={hero.name}
            text={hero.text}
            tagline={hero.tagline}
            image={hero.image as any}
            actions={hero.actions}
        />
    {/if}
    {#if features?.length}
        <Features {features} />
    {/if}
    {@render children?.()}
</div>

<style>
    .home-layout {
        width: 100%;
    }
</style>
