<script lang="ts">
    import Feature from "./Feature.svelte";

    type FeatureIcon =
        | string
        | {
              src: string;
              alt?: string;
              width?: number | string;
              height?: number | string;
              wrap?: boolean;
          }
        | { dark: string; light: string; alt?: string };

    type FeatureItem = {
        icon?: FeatureIcon;
        title: string;
        details?: string | string[];
        link?: string;
        linkText?: string;
        rel?: string;
        target?: string;
    };

    type Props = {
        features: FeatureItem[];
    };

    let { features }: Props = $props();

    let grid = $derived.by(() => {
        const n = features?.length ?? 0;
        if (!n) return "";
        if (n === 2) return "grid-2";
        if (n === 3) return "grid-3";
        if (n % 3 === 0) return "grid-6";
        if (n > 3) return "grid-4";
        return "";
    });
</script>

{#if features?.length}
    <div class="Features">
        <div class="container">
            <div class="items">
                {#each features as feature (feature.title)}
                    <div class="item {grid}">
                        <Feature
                            icon={feature.icon}
                            title={feature.title}
                            details={feature.details}
                            link={feature.link}
                            linkText={feature.linkText}
                            rel={feature.rel}
                            target={feature.target}
                        />
                    </div>
                {/each}
            </div>
        </div>
    </div>
{/if}

<style>
    .Features {
        position: relative;
        padding: 0 24px;
    }

    @media (min-width: 640px) {
        .Features {
            padding: 0 48px;
        }
    }

    @media (min-width: 960px) {
        .Features {
            padding: 0 64px;
        }
    }

    .container {
        margin: 0 auto;
        max-width: 1152px;
    }

    .items {
        display: flex;
        flex-wrap: wrap;
        margin: -8px;
    }

    .item {
        padding: 8px;
        width: 100%;
    }

    @media (min-width: 640px) {
        .item.grid-2,
        .item.grid-4,
        .item.grid-6 {
            width: calc(100% / 2);
        }
    }

    @media (min-width: 768px) {
        .item.grid-2,
        .item.grid-4 {
            width: calc(100% / 2);
        }

        .item.grid-3,
        .item.grid-6 {
            width: calc(100% / 3);
        }
    }

    @media (min-width: 960px) {
        .item.grid-4 {
            width: calc(100% / 4);
        }
    }
</style>
