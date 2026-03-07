<script lang="ts">
    import type { Snippet } from "svelte";

    type Props = {
        title?: string;
        lead?: string;
        titleSnippet?: Snippet;
        leadSnippet?: Snippet;
    };

    let { title, lead, titleSnippet, leadSnippet }: Props = $props();
</script>

<div class="TeamPageTitle">
    {#if titleSnippet || title}
        <h1 class="title">
            {#if titleSnippet}
                {@render titleSnippet()}
            {:else}
                {title}
            {/if}
        </h1>
    {/if}
    {#if leadSnippet || lead}
        <p class="lead">
            {#if leadSnippet}
                {@render leadSnippet()}
            {:else}
                {lead}
            {/if}
        </p>
    {/if}
</div>

<style>
    .TeamPageTitle {
        padding: 48px 32px;
        text-align: center;
    }

    @media (min-width: 768px) {
        .TeamPageTitle {
            padding: 64px 48px 48px;
        }
    }

    @media (min-width: 960px) {
        .TeamPageTitle {
            padding: 80px 64px 48px;
        }
    }

    .title {
        letter-spacing: 0;
        line-height: 44px;
        font-size: 36px;
        font-weight: 500;
        margin: 0;
        border: none;
        padding: 0;
    }

    @media (min-width: 768px) {
        .title {
            letter-spacing: -0.5px;
            line-height: 56px;
            font-size: 48px;
        }
    }

    .lead {
        margin: 0 auto;
        max-width: 512px;
        padding-top: 12px;
        line-height: 24px;
        font-size: 16px;
        font-weight: 500;
        color: var(--greg-menu-section-color);
    }

    @media (min-width: 768px) {
        .lead {
            max-width: 592px;
            letter-spacing: 0.15px;
            line-height: 28px;
            font-size: 20px;
        }
    }
</style>
