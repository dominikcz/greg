<script lang="ts">
    type BreadcrumbItem = { label: string; link: string };

    type Props = {
        items: BreadcrumbItem[];
        navigate: (path: string) => void;
        /** Root path excluded from display (e.g. '/docs'). */
        rootPath: string;
    };
    let { items, navigate, rootPath }: Props = $props();

    // Skip the docs-root node and only render when there are at least two levels.
    const display = $derived(items.filter(i => i.link !== rootPath));
</script>

{#if display.length > 1}
<nav class="breadcrumb" aria-label="Breadcrumb">
    {#each display as item, i}
        {#if i > 0}<span class="sep" aria-hidden="true">/</span>{/if}
        {#if i < display.length - 1}
            <a
                href={item.link}
                class="crumb"
                onclick={(e) => { e.preventDefault(); navigate(item.link); }}
            >{item.label}</a>
        {:else}
            <span class="crumb current" aria-current="page">{item.label}</span>
        {/if}
    {/each}
</nav>
{/if}

<style lang="scss">
.breadcrumb {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.25rem;
    font-size: 0.8rem;
    color: var(--greg-menu-section-color);
    margin-bottom: 0.75rem;
}

.sep {
    opacity: 0.45;
}

.crumb {
    color: var(--greg-menu-section-color);
    text-decoration: none;

    &:hover {
        color: var(--greg-accent);
        text-decoration: underline;
    }

    &.current {
        color: var(--greg-color);
        font-weight: 500;
    }
}
</style>
