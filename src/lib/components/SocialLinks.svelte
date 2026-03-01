<script lang="ts">
    import SocialLink from './SocialLink.svelte';

    type SocialLinkIcon = string | { svg: string };

    type SocialLinkItem = {
        icon: SocialLinkIcon;
        link: string;
        ariaLabel?: string;
    };

    type Props = {
        links: SocialLinkItem[];
        me?: boolean;
    };

    let { links, me = true }: Props = $props();
</script>

<div class="SocialLinks">
    {#each links as { link, icon, ariaLabel } (link)}
        <SocialLink {icon} {link} {ariaLabel} {me} />
    {/each}
</div>

<style>
    .SocialLinks {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
    }
</style>
