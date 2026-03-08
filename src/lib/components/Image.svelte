<script lang="ts">
    /**
     * ThemeableImage — same shape as VitePress:
     *   - string                            → simple src
     *   - { src: string; alt?: string }     → simple src + alt
     *   - { dark: Image; light: Image; alt?: string }  → theme-aware pair
     */
    type SimpleImage =
        | string
        | {
              src: string;
              alt?: string;
              width?: number | string;
              height?: number | string;
          };
    type ThemeImage = { dark: SimpleImage; light: SimpleImage; alt?: string };
    type GregImage = SimpleImage | ThemeImage;

    type Props = {
        image: GregImage;
        alt?: string;
        class?: string;
        width?: number | string;
        height?: number | string;
    };

    let { image, alt, class: cls = "", width, height }: Props = $props();

    function isThemePair(img: GregImage): img is ThemeImage {
        return typeof img === "object" && "dark" in img && "light" in img;
    }

    function getSrc(img: SimpleImage): string {
        return typeof img === "string" ? img : img.src;
    }

    function getAlt(img: SimpleImage, fallbackAlt?: string): string {
        if (typeof img === "string") return fallbackAlt ?? "";
        return img.alt ?? fallbackAlt ?? "";
    }

    function getWidth(
        img: SimpleImage,
        fallback?: number | string,
    ): number | string | undefined {
        if (typeof img === "object" && img.width) return img.width;
        return fallback;
    }

    function getHeight(
        img: SimpleImage,
        fallback?: number | string,
    ): number | string | undefined {
        if (typeof img === "object" && img.height) return img.height;
        return fallback;
    }
</script>

{#if image}
    {#if isThemePair(image)}
        <img
            class="Image dark {cls}"
            src={getSrc(image.dark)}
            alt={getAlt(image.dark, image.alt ?? alt)}
            width={getWidth(image.dark, width)}
            height={getHeight(image.dark, height)}
        />
        <img
            class="Image light {cls}"
            src={getSrc(image.light)}
            alt={getAlt(image.light, image.alt ?? alt)}
            width={getWidth(image.light, width)}
            height={getHeight(image.light, height)}
        />
    {:else}
        <img
            class="Image {cls}"
            src={getSrc(image)}
            alt={getAlt(image, alt)}
            width={getWidth(image, width)}
            height={getHeight(image, height)}
        />
    {/if}
{/if}

<style>
    /* Default: light variant visible, dark variant hidden. */
    :global(.Image.dark) {
        display: none;
    }

    /* Greg runtime theme switcher is authoritative. */
    :global(.greg[data-theme="light"] .Image.dark) {
        display: none;
    }

    :global(.greg[data-theme="light"] .Image.light) {
        display: initial;
    }

    :global(.greg[data-theme="dark"] .Image.light) {
        display: none;
    }

    :global(.greg[data-theme="dark"] .Image.dark) {
        display: initial;
    }

    /* Fallback outside Greg container. */
    @media (prefers-color-scheme: dark) {
        :global(:not(.greg) .Image.light) {
            display: none;
        }

        :global(:not(.greg) .Image.dark) {
            display: initial;
        }
    }

    /* Legacy explicit .dark class on <html>. */
    :global(html.dark .Image.light) {
        display: none;
    }

    :global(html.dark .Image.dark) {
        display: initial;
    }
</style>
