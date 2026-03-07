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
    /* Hide dark variant in light mode */
    @media (prefers-color-scheme: light) {
        :global(.Image.dark) {
            display: none;
        }
    }

    /* Hide light variant in dark mode */
    @media (prefers-color-scheme: dark) {
        :global(.Image.light) {
            display: none;
        }
    }

    /* Respect explicit .dark/.light class on <html> (for JS theme switcher) */
    :global(html:not(.dark) .Image.dark) {
        display: none;
    }

    :global(html.dark .Image.light) {
        display: none;
    }
</style>
