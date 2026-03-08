<script lang="ts">
    import { ArrowUp } from "@lucide/svelte";

    type Props = {
        /** The scrollable element to watch and scroll to top. */
        target: HTMLElement | undefined;
        /** Accessible label for the button. */
        label?: string;
    };
    let { target, label = "Back to top" }: Props = $props();

    let visible = $state(false);

    $effect(() => {
        const el = target;
        if (!el) return;
        const handler = () => {
            visible = el.scrollTop > 300;
        };
        el.addEventListener("scroll", handler, { passive: true });
        return () => el.removeEventListener("scroll", handler);
    });

    function scrollToTop() {
        target?.scrollTo({ top: 0, behavior: "smooth" });
    }
</script>

{#if visible}
    <button
        class="back-to-top"
        onclick={scrollToTop}
        type="button"
        aria-label={label}
    >
        <ArrowUp size={18} strokeWidth={2.25} aria-hidden="true" />
    </button>
{/if}

<style lang="scss">
    .back-to-top {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        background: var(--greg-accent);
        color: #fff;
        border: none;
        cursor: pointer;
        font-size: 1.25rem;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        transition:
            opacity 0.2s,
            transform 0.2s;
        z-index: 100;

        &:hover {
            opacity: 0.85;
            transform: translateY(-2px);
        }
    }
</style>
