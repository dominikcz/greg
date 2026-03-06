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
    /* ── design tokens ───────────────────────────────────────────────────── */
    .greg-steps {
        --_size:   1.75rem;  /* bullet circle diameter   */
        --_margin: 0.375rem; /* gap above/below connector */
        --_bullet-bg: var(--greg-accent, #646cff);
        --_bullet-fg: #fff;
        --_guide: var(--greg-steps-guide-color, color-mix(in srgb, var(--greg-accent, #646cff) 42%, var(--greg-border-color, #e5e5ea)));
        margin-block: 1.75rem;
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
        list-style: none;
        padding-inline-start: calc(var(--_size) + 1rem);
        /* HACK: keeps any margin-bottom inside the li's padding box to avoid
           gaps in the connector line (same as Starlight) */
        padding-bottom: 1px;
        min-height: calc(var(--_size) + var(--_margin));
    }

    .greg-steps :global(ol > li::marker) {
        content: '';
    }

    .greg-steps :global(ol > li + li) {
        margin-top: 0;
    }

    /* ── number badge (::before) ─────────────────────────────────────────── */
    .greg-steps :global(ol > li::before) {
        content: counter(greg-steps-counter);
        position: absolute;
        top: 0;
        inset-inline-start: 0;
        width:  var(--_size);
        height: var(--_size);
        /* line-height centres the number without flexbox (pseudo-element safe) */
        line-height: var(--_size);
        font-size: 0.8rem;
        font-weight: 600;
        text-align: center;
        /* solid filled circle — clearly distinct from the page background */
        color: var(--_bullet-fg);
        background-color: var(--_bullet-bg);
        border-radius: 99rem;
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--_bullet-bg) 82%, black);
    }

    /* ── vertical connector line (::after) ──────────────────────────────── */
    .greg-steps :global(ol > li::after) {
        content: '';
        position: absolute;
        top:    calc(var(--_size) + var(--_margin));
        /* compensate li padding-bottom:1px so top and bottom gaps are equal */
        bottom: max(0px, calc(var(--_margin) - 1px));
        inset-inline-start: calc((var(--_size) - 2px) / 2);
        width: 2px;
        background-color: var(--_guide);
    }

    .greg-steps :global(ol > li:last-child::after) {
        display: none;
    }

    /* ── first-child vertical alignment with circle centre ──────────────── */
    /*
     * Shifts the first block element down so its text baseline aligns with
     * the vertical centre of the bullet circle (the same technique Starlight
     * uses with `lh` units, falling back to an approximation).
     */
    .greg-steps :global(ol > li > :first-child) {
        --lh: calc(1em * 1.75); /* approximation: font-size × body line-height */
        --shift-y: calc(0.5 * (var(--_size) - var(--lh)));
        margin-top: 0;
        transform: translateY(var(--shift-y));
        margin-bottom: var(--shift-y);
    }

    /* Use the precise lh unit where supported */
    @supports (--prop: 1lh) {
        .greg-steps :global(ol > li > :first-child) {
            --lh: 1lh;
        }
    }

    /* Headings have a tighter own line-height */
    .greg-steps :global(ol > li > :first-child:where(h1, h2, h3, h4, h5, h6)) {
        --lh: calc(1em * 1.3);
    }

    /* ── step title (first bold in a paragraph) ──────────────────────────── */
    .greg-steps :global(ol > li > p:first-child > strong:first-child) {
        display: block;
        font-weight: 600;
        color: var(--greg-color, inherit);
    }
</style>
