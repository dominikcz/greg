<script lang="ts">
    import type { Snippet } from 'svelte';

    type Props = {
        text?: string;
        type?: 'info' | 'tip' | 'warning' | 'danger';
        children?: Snippet;
    };

    let { text, type = 'tip', children }: Props = $props();
</script>

<span class="badge {type}">
    {#if children}
        {@render children()}
    {:else}
        {text}
    {/if}
</span>

<style>
    .badge {
        display: inline-block;
        margin-left: 2px;
        border: 1px solid transparent;
        border-radius: 12px;
        padding: 0 10px;
        line-height: 22px;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        transform: translateY(-2px);
        vertical-align: middle;
    }

    .badge.info {
        border-color: var(--greg-info-border);
        color:        var(--greg-info-text);
        background-color: var(--greg-info-bg);
    }

    .badge.tip {
        border-color: var(--greg-tip-border);
        color:        var(--greg-tip-text);
        background-color: var(--greg-tip-bg);
    }

    .badge.warning {
        border-color: var(--greg-warning-border);
        color:        var(--greg-warning-text);
        background-color: var(--greg-warning-bg);
    }

    .badge.danger {
        border-color: var(--greg-danger-border);
        color:        var(--greg-danger-text);
        background-color: var(--greg-danger-bg);
    }
</style>
