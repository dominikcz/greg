<script lang="ts">
    import type { Snippet } from 'svelte';

    type Props = {
        children?: Snippet;
    };

    let { children }: Props = $props();
</script>

<div class="TeamPage">
    {#if children}
        {@render children()}
    {/if}
</div>

<style>
    .TeamPage {
        margin: 96px 0;
    }

    @media (min-width: 768px) {
        .TeamPage {
            margin: 128px 0;
        }
    }

    /* Spacing between sections within a TeamPage */
    .TeamPage :global(.TeamPageTitle + .TeamPageSection),
    .TeamPage :global(.TeamPageSection + .TeamPageSection),
    .TeamPage :global(.TeamMembers + .TeamPageSection) {
        margin-top: 64px;
    }

    @media (min-width: 768px) {
        .TeamPage :global(.TeamPageTitle + .TeamPageSection) {
            margin-top: 16px;
        }

        .TeamPage :global(.TeamPageSection + .TeamPageSection),
        .TeamPage :global(.TeamMembers + .TeamPageSection) {
            margin-top: 96px;
        }
    }

    .TeamPage :global(.TeamMembers + .TeamMembers) {
        margin-top: 24px;
    }

    .TeamPage :global(.TeamMembers) {
        padding: 0 24px;
    }

    @media (min-width: 768px) {
        .TeamPage :global(.TeamMembers) {
            padding: 0 48px;
        }
    }

    @media (min-width: 960px) {
        .TeamPage :global(.TeamMembers) {
            padding: 0 64px;
        }
    }
</style>
