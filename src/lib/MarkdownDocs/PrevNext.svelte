<script lang="ts">
    import { withBase } from "./common";
    type NavItem = { label: string; link: string } | null;

    type Props = {
        prev: NavItem;
        next: NavItem;
        navigate: (path: string) => void;
        prevLabel?: string;
        nextLabel?: string;
        navLabel?: string;
    };
    let {
        prev,
        next,
        navigate,
        prevLabel = "Previous",
        nextLabel = "Next",
        navLabel = "Previous and next pages",
    }: Props = $props();
</script>

{#if prev || next}
    <nav class="prev-next" aria-label={navLabel}>
        <div class="side">
            {#if prev}
                <a
                    href={withBase(prev.link)}
                    class="link"
                    onclick={(e) => {
                        e.preventDefault();
                        navigate(prev.link);
                    }}
                >
                    <span class="label">← {prevLabel}</span>
                    <span class="title">{prev.label}</span>
                </a>
            {/if}
        </div>
        <div class="side right">
            {#if next}
                <a
                    href={withBase(next.link)}
                    class="link"
                    onclick={(e) => {
                        e.preventDefault();
                        navigate(next.link);
                    }}
                >
                    <span class="label">{nextLabel} →</span>
                    <span class="title">{next.label}</span>
                </a>
            {/if}
        </div>
    </nav>
{/if}

<style lang="scss">
    .prev-next {
        display: flex;
        gap: 1rem;
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid var(--greg-border-color);
    }

    .side {
        flex: 1;
        min-width: 0;

        &.right {
            display: flex;
            justify-content: flex-end;
        }
    }

    .link {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        padding: 0.75rem 1rem;
        border: 1px solid var(--greg-border-color);
        border-radius: 8px;
        text-decoration: none;
        max-width: 18rem;
        transition: border-color 0.15s;

        &:hover {
            border-color: var(--greg-accent);

            .title {
                color: var(--greg-accent);
            }
        }

        .side.right & {
            text-align: right;
        }
    }

    .label {
        font-size: 0.75rem;
        color: var(--greg-menu-section-color);
        font-weight: 500;
    }

    .title {
        font-size: 0.9rem;
        color: var(--greg-color);
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>
