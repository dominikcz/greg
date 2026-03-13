<script lang="ts">
    type Props = {
        src?: string;
        alt?: string;
        title?: string;
        width?: number | string;
        height?: number | string;
    };

    let { src = "", alt = "", title = "", width, height }: Props = $props();

    let isOpen = $state(false);
    let zoom = $state(1);
    let isDragging = $state(false);
    let dragStartX = $state(0);
    let dragStartY = $state(0);
    let dragStartScrollLeft = $state(0);
    let dragStartScrollTop = $state(0);
    let viewportEl = $state<HTMLDivElement | null>(null);

    const MIN_ZOOM = 1;
    const MAX_ZOOM = 6;
    const ZOOM_STEP = 0.25;

    const caption = $derived((String(title || "").trim() || String(alt || "").trim()));
    const zoomLabel = $derived(`${Math.round(zoom * 100)}%`);
    const isPannable = $derived(zoom > 1);

    const previewImageStyle = $derived.by(() => {
        if (zoom <= 1) return undefined;
        return `width: ${Math.round(zoom * 100)}%; max-width: none; max-height: none;`;
    });

    function clampZoom(value: number) {
        return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
    }

    function setZoom(value: number) {
        zoom = clampZoom(value);
    }

    function zoomIn() {
        setZoom(zoom + ZOOM_STEP);
    }

    function zoomOut() {
        setZoom(zoom - ZOOM_STEP);
    }

    function resetZoom() {
        setZoom(1);
        isDragging = false;
    }

    function beginPan(event: MouseEvent) {
        if (!isPannable || !viewportEl) return;
        isDragging = true;
        dragStartX = event.clientX;
        dragStartY = event.clientY;
        dragStartScrollLeft = viewportEl.scrollLeft;
        dragStartScrollTop = viewportEl.scrollTop;
        event.preventDefault();
    }

    function continuePan(event: MouseEvent) {
        if (!isDragging || !viewportEl) return;
        const deltaX = event.clientX - dragStartX;
        const deltaY = event.clientY - dragStartY;
        viewportEl.scrollLeft = dragStartScrollLeft - deltaX;
        viewportEl.scrollTop = dragStartScrollTop - deltaY;
        event.preventDefault();
    }

    function endPan() {
        isDragging = false;
    }

    function openPreview() {
        if (!src) return;
        isOpen = true;
        resetZoom();
    }

    function closePreview() {
        isOpen = false;
        resetZoom();
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Escape" && isOpen) {
            closePreview();
        }
    }

    function handleWheel(event: WheelEvent) {
        if (!isOpen) return;
        event.preventDefault();
        if (event.deltaY < 0) {
            zoomIn();
            return;
        }
        zoomOut();
    }

    $effect(() => {
        if (typeof window === "undefined" || !isOpen) return;
        window.addEventListener("keydown", handleKeydown);
        return () => {
            window.removeEventListener("keydown", handleKeydown);
        };
    });

    $effect(() => {
        if (typeof window === "undefined" || !isDragging) return;
        window.addEventListener("mousemove", continuePan);
        window.addEventListener("mouseup", endPan);
        return () => {
            window.removeEventListener("mousemove", continuePan);
            window.removeEventListener("mouseup", endPan);
        };
    });
</script>

{#if src}
    <figure class="markdown-image-figure">
        <button
            type="button"
            class="markdown-image-thumb"
            onclick={openPreview}
            aria-label={caption ? `Open image preview: ${caption}` : "Open image preview"}
        >
            <img src={src} alt={alt} title={title || undefined} width={width} height={height} />
        </button>
        {#if caption}
            <figcaption class="markdown-image-caption">{caption}</figcaption>
        {/if}
    </figure>
{/if}

{#if isOpen}
    <div class="markdown-image-preview" role="dialog" aria-modal="true" aria-label="Image preview">
        <button
            type="button"
            class="markdown-image-preview__backdrop"
            aria-label="Close image preview"
            onclick={closePreview}
        ></button>
        <div class="markdown-image-preview__content">
            <div class="markdown-image-preview__toolbar" role="group" aria-label="Image zoom controls">
                <button
                    type="button"
                    class="markdown-image-preview__zoom-btn"
                    aria-label="Zoom out"
                    onclick={zoomOut}
                    disabled={zoom <= MIN_ZOOM}
                >
                    −
                </button>
                <button
                    type="button"
                    class="markdown-image-preview__zoom-btn markdown-image-preview__zoom-label"
                    aria-label="Reset zoom"
                    onclick={resetZoom}
                >
                    {zoomLabel}
                </button>
                <button
                    type="button"
                    class="markdown-image-preview__zoom-btn"
                    aria-label="Zoom in"
                    onclick={zoomIn}
                    disabled={zoom >= MAX_ZOOM}
                >
                    +
                </button>
            </div>
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="markdown-image-preview__viewport"
                class:is-pannable={isPannable}
                class:is-dragging={isDragging}
                bind:this={viewportEl}
                onwheel={handleWheel}
                onmousedown={beginPan}
            >
                <img
                    src={src}
                    alt={alt || caption || "Preview image"}
                    class="markdown-image-preview__image"
                    style={previewImageStyle}
                />
            </div>
            <button
                type="button"
                class="markdown-image-preview__close"
                aria-label="Close image preview"
                onclick={closePreview}
            >
                ×
            </button>
            {#if caption}
                <p class="markdown-image-preview__caption">{caption}</p>
            {/if}
        </div>
    </div>
{/if}

<style>
    .markdown-image-figure {
        margin: 1rem 0;
        max-width: 100%;
    }

    .markdown-image-thumb {
        display: block;
        padding: 0;
        border: 0;
        background: transparent;
        cursor: zoom-in;
        max-width: 100%;
    }

    .markdown-image-thumb img {
        display: block;
        max-width: 100%;
        max-height: 220px;
        width: auto;
        border-radius: 8px;
        border: 1px solid var(--greg-border-color);
        transition: transform 0.14s ease, box-shadow 0.14s ease;
    }

    .markdown-image-thumb:hover img {
        transform: translateY(-1px);
        box-shadow: 0 8px 18px color-mix(in srgb, var(--greg-color) 16%, transparent);
    }

    .markdown-image-caption {
        margin-top: 0.45rem;
        font-size: 0.9rem;
        color: var(--fgColor-muted);
    }

    .markdown-image-preview {
        position: fixed;
        inset: 0;
        z-index: 1200;
        display: grid;
        place-items: center;
        padding: 1.25rem;
    }

    .markdown-image-preview__backdrop {
        position: absolute;
        inset: 0;
        border: none;
        background: color-mix(in srgb, #000 74%, transparent);
        cursor: zoom-out;
    }

    .markdown-image-preview__content {
        position: relative;
        max-width: min(92vw, 1500px);
        max-height: 92vh;
        z-index: 1;
        display: grid;
        gap: 0.5rem;
    }

    .markdown-image-preview__toolbar {
        display: inline-flex;
        gap: 0.4rem;
        justify-self: center;
    }

    .markdown-image-preview__zoom-btn {
        border: 1px solid rgb(255 255 255 / 0.4);
        border-radius: 999px;
        background: rgb(0 0 0 / 0.6);
        color: #fff;
        min-width: 2rem;
        height: 2rem;
        cursor: pointer;
        font-size: 0.95rem;
    }

    .markdown-image-preview__zoom-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }

    .markdown-image-preview__zoom-label {
        padding: 0 0.7rem;
        width: auto;
        min-width: 4.25rem;
    }

    .markdown-image-preview__viewport {
        overflow: auto;
        max-width: min(92vw, 1500px);
        max-height: 84vh;
        padding: 0.15rem;
        cursor: default;
    }

    .markdown-image-preview__viewport.is-pannable {
        cursor: grab;
    }

    .markdown-image-preview__viewport.is-dragging {
        cursor: grabbing;
        user-select: none;
    }

    .markdown-image-preview__image {
        display: block;
        margin: 0 auto;
        max-width: 100%;
        max-height: 82vh;
        border-radius: 0.625rem;
        box-shadow: 0 18px 40px rgb(0 0 0 / 0.45);
    }

    .markdown-image-preview__close {
        position: absolute;
        top: -0.75rem;
        right: -0.75rem;
        width: 2rem;
        height: 2rem;
        border: 1px solid rgb(255 255 255 / 0.4);
        border-radius: 999px;
        background: rgb(0 0 0 / 0.6);
        color: #fff;
        line-height: 1;
        cursor: pointer;
    }

    .markdown-image-preview__caption {
        margin-top: 0.65rem;
        margin-bottom: 0;
        color: #fff;
        text-align: center;
        text-shadow: 0 1px 2px rgb(0 0 0 / 0.7);
    }
</style>