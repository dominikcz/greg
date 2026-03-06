<script lang="ts">
    import type { Snippet } from 'svelte';
    let { children }: { children?: Snippet } = $props();
</script>

<!--
    Steps — an ordered procedural steps list, inspired by Starlight.

    Usage in Markdown:
        <Steps>
        1. **Install dependencies**
           Run `npm install` in your project folder.
        2. **Start the dev server**
           Run `npm run dev`.
        3. **Open the app**
           Navigate to `http://localhost:5173`.
        </Steps>
-->
<div class="greg-steps">
    {@render children?.()}
</div>

<style>
    /* ── wrapper ─────────────────────────────────────────────────────────── */
    .greg-steps {
        margin: 1.75rem 0;
    }

    /* ── ordered list ────────────────────────────────────────────────────── */
    .greg-steps :global(ol) {
        list-style: none;
        counter-reset: greg-steps-counter;
        padding-inline-start: 0;
        margin: 0;
    }

    /* ── individual step ─────────────────────────────────────────────────── */
    .greg-steps :global(ol > li) {
        counter-increment: greg-steps-counter;
        position: relative;
        padding-inline-start: 3.25rem;
        padding-bottom: 1.75rem;
        min-height: 2.75rem;
    }

    /* remove bottom padding from the last step */
    .greg-steps :global(ol > li:last-child) {
        padding-bottom: 0;
    }

    /* ── number circle ───────────────────────────────────────────────────── */
    .greg-steps :global(ol > li::before) {
        content: counter(greg-steps-counter);
        position: absolute;
        inset-inline-start: 0;
        top: 0;
        width: 2.125rem;
        height: 2.125rem;
        border-radius: 50%;
        background-color: var(--greg-accent, #646cff);
        color: #fff;
        font-size: 0.875rem;
        font-weight: 700;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        /* flex doesn't work on ::before — use grid instead */
        display: grid;
        place-items: center;
        flex-shrink: 0;
        z-index: 1;
    }

    /* ── vertical connector line ─────────────────────────────────────────── */
    .greg-steps :global(ol > li:not(:last-child)::after) {
        content: '';
        position: absolute;
        inset-inline-start: 1.0625rem; /* center of 2.125rem circle */
        top: 2.5rem;
        bottom: 0.375rem;
        width: 2px;
        background-color: var(--greg-border-color, #e5e5ea);
    }

    /* ── step title — the first <strong> or <p> inside the li ───────────── */
    .greg-steps :global(ol > li > p:first-child) {
        margin-top: 0.3125rem; /* optical alignment with the circle */
    }

    .greg-steps :global(ol > li > p:first-child > strong:first-child),
    .greg-steps :global(ol > li > h3:first-child),
    .greg-steps :global(ol > li > h4:first-child) {
        display: block;
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 0.375rem;
        color: var(--greg-color, inherit);
    }

    /* ── suppress top margin on the first paragraph when it IS the title ── */
    .greg-steps :global(ol > li > p + p) {
        margin-top: 0.5rem;
    }

    /* ── code blocks inside steps need correct overflow ─────────────────── */
    .greg-steps :global(ol > li pre) {
        margin-top: 0.75rem;
    }
</style>
