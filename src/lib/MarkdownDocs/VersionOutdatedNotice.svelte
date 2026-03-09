<script lang="ts">
    type Props = {
        currentTitle: string;
        defaultTitle: string;
        message?: string;
        actionLabel?: string;
        onGoToDefault: () => void;
    };

    let {
        currentTitle,
        defaultTitle,
        message = "",
        actionLabel = "Go to latest",
        onGoToDefault,
    }: Props = $props();

    const resolvedMessage = $derived(
        String(message || "").trim() ||
            `You are viewing an older documentation version (${currentTitle}). ${defaultTitle} is currently recommended.`,
    );
</script>

<div class="version-notice" role="status" aria-live="polite">
    <p>{resolvedMessage}</p>
    <button type="button" onclick={onGoToDefault}>{actionLabel}</button>
</div>

<style lang="scss">
    .version-notice {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.55rem 1.25rem;
        border-bottom: 1px solid color-mix(in srgb, var(--greg-accent) 25%, var(--greg-border-color));
        background: color-mix(in srgb, var(--greg-accent-light) 55%, var(--greg-header-background));
        color: var(--greg-color);
        flex-shrink: 0;

        p {
            margin: 0;
            font-size: 0.86rem;
            line-height: 1.35;
        }

        button {
            border: 1px solid color-mix(in srgb, var(--greg-accent) 45%, var(--greg-border-color));
            background: var(--greg-header-background);
            color: var(--greg-accent);
            font: inherit;
            font-size: 0.8rem;
            font-weight: 600;
            border-radius: 6px;
            padding: 0.25rem 0.55rem;
            cursor: pointer;

            &:hover {
                border-color: var(--greg-accent);
                background: var(--greg-accent-light);
            }
        }
    }

    @media (max-width: 800px) {
        .version-notice {
            flex-direction: column;
            align-items: flex-start;
            padding: 0.55rem 0.75rem;
        }
    }
</style>
