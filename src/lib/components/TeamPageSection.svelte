<script lang="ts">
    import type { Snippet } from "svelte";

    type Props = {
        title?: string;
        lead?: string;
        titleSnippet?: Snippet;
        leadSnippet?: Snippet;
        children?: Snippet;
    };

    let { title, lead, titleSnippet, leadSnippet, children }: Props = $props();

    let hasTitle = $derived(!!(titleSnippet || title));
    let hasLead = $derived(!!(leadSnippet || lead));
</script>

<section class="TeamPageSection">
    {#if hasTitle}
        <div class="title">
            <div class="title-line"></div>
            <h2 class="title-text">
                {#if titleSnippet}
                    {@render titleSnippet()}
                {:else}
                    {title}
                {/if}
            </h2>
        </div>
    {/if}
    {#if hasLead}
        <p class="lead">
            {#if leadSnippet}
                {@render leadSnippet()}
            {:else}
                {lead}
            {/if}
        </p>
    {/if}
    {#if children}
        <div class="members">
            {@render children()}
        </div>
    {/if}
</section>

<style>
    .TeamPageSection {
        padding: 0 32px;
    }

    @media (min-width: 768px) {
        .TeamPageSection {
            padding: 0 48px;
        }
    }

    @media (min-width: 960px) {
        .TeamPageSection {
            padding: 0 64px;
        }
    }

    .title {
        position: relative;
        margin: 0 auto;
        max-width: 1152px;
        text-align: center;
        color: var(--greg-menu-section-color);
    }

    .title-line {
        position: absolute;
        top: 16px;
        left: 0;
        width: 100%;
        height: 1px;
        background-color: var(--greg-border-color);
    }

    .title-text {
        position: relative;
        display: inline-block;
        padding: 0 24px;
        letter-spacing: 0;
        line-height: 32px;
        font-size: 20px;
        font-weight: 500;
        background-color: var(--greg-background);
        margin: 0;
        border: none;
    }

    .lead {
        margin: 0 auto;
        max-width: 480px;
        padding-top: 12px;
        text-align: center;
        line-height: 24px;
        font-size: 16px;
        font-weight: 500;
        color: var(--greg-menu-section-color);
    }

    .members {
        padding-top: 40px;
    }
</style>
