<script lang="ts">
    import type { Snippet } from 'svelte';
    import Button from './Button.svelte';
    import Image from './Image.svelte';

    type ThemeImage =
        | string
        | { src: string; alt?: string }
        | { dark: string; light: string; alt?: string };

    type HeroAction = {
        theme?: 'brand' | 'alt';
        text: string;
        link: string;
        target?: string;
        rel?: string;
    };

    type Props = {
        name?: string;
        text?: string;
        tagline?: string;
        image?: ThemeImage;
        actions?: HeroAction[];
        /** Snippet placed before the heading block */
        heroBefore?: Snippet;
        /** Snippet replacing heading+tagline entirely */
        heroInfo?: Snippet;
        /** Snippet placed after tagline, before actions */
        heroInfoAfter?: Snippet;
        /** Snippet replacing the image */
        heroImage?: Snippet;
        /** Snippet placed after action buttons */
        heroActionsAfter?: Snippet;
    };

    let {
        name,
        text,
        tagline,
        image,
        actions,
        heroBefore,
        heroInfo,
        heroInfoAfter,
        heroImage,
        heroActionsAfter,
    }: Props = $props();

    let hasImage = $derived(!!image || !!heroImage);
</script>

<div class="Hero" class:has-image={hasImage}>
    <div class="container">
        <div class="main">
            {#if heroBefore}
                {@render heroBefore()}
            {/if}

            {#if heroInfo}
                {@render heroInfo()}
            {:else}
                <h1 class="heading">
                    {#if name}
                        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                        <span class="name clip">{@html name}</span>
                    {/if}
                    {#if text}
                        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                        <span class="text">{@html text}</span>
                    {/if}
                </h1>
                {#if tagline}
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                    <p class="tagline">{@html tagline}</p>
                {/if}
            {/if}

            {#if heroInfoAfter}
                {@render heroInfoAfter()}
            {/if}

            {#if actions?.length}
                <div class="actions">
                    {#each actions as action (action.link)}
                        <div class="action">
                            <Button
                                tag="a"
                                size="medium"
                                theme={action.theme ?? 'brand'}
                                text={action.text}
                                href={action.link}
                                target={action.target}
                                rel={action.rel}
                            />
                        </div>
                    {/each}
                </div>
            {/if}

            {#if heroActionsAfter}
                {@render heroActionsAfter()}
            {/if}
        </div>

        {#if hasImage}
            <div class="image">
                <div class="image-container">
                    <div class="image-bg"></div>
                    {#if heroImage}
                        {@render heroImage()}
                    {:else if image}
                        <Image class="image-src" {image} />
                    {/if}
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .Hero {
        padding: 48px 24px;
    }

    @media (min-width: 640px) {
        .Hero {
            padding: 80px 48px 64px;
        }
    }

    @media (min-width: 960px) {
        .Hero {
            padding: 80px 64px 64px;
        }
    }

    .container {
        display: flex;
        flex-direction: column;
        margin: 0 auto;
        max-width: 1152px;
    }

    @media (min-width: 960px) {
        .container {
            flex-direction: row;
        }
    }

    .main {
        position: relative;
        z-index: 10;
        order: 2;
        flex-grow: 1;
        flex-shrink: 0;
    }

    .has-image .container {
        text-align: center;
    }

    @media (min-width: 960px) {
        .has-image .container {
            text-align: left;
        }

        .main {
            order: 1;
            width: calc((100% / 3) * 2);
        }

        .has-image .main {
            max-width: 592px;
        }
    }

    .heading {
        display: flex;
        flex-direction: column;
        margin: 0;
        border: none;
        padding: 0;
    }

    .name,
    .text {
        width: fit-content;
        max-width: 392px;
        letter-spacing: -0.4px;
        line-height: 40px;
        font-size: 32px;
        font-weight: 700;
        white-space: pre-wrap;
    }

    .has-image .name,
    .has-image .text {
        margin: 0 auto;
    }

    .name {
        background: var(--greg-accent);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    .text {
        color: var(--greg-color);
    }

    @media (min-width: 640px) {
        .name,
        .text {
            max-width: 576px;
            line-height: 56px;
            font-size: 48px;
        }
    }

    @media (min-width: 960px) {
        .name,
        .text {
            line-height: 64px;
            font-size: 56px;
        }

        .has-image .name,
        .has-image .text {
            margin: 0;
        }
    }

    .tagline {
        padding-top: 8px;
        max-width: 392px;
        line-height: 28px;
        font-size: 18px;
        font-weight: 500;
        white-space: pre-wrap;
        color: var(--greg-menu-section-color);
        margin: 0;
    }

    .has-image .tagline {
        margin: 0 auto;
    }

    @media (min-width: 640px) {
        .tagline {
            padding-top: 12px;
            max-width: 576px;
            line-height: 32px;
            font-size: 20px;
        }
    }

    @media (min-width: 960px) {
        .tagline {
            line-height: 36px;
            font-size: 24px;
        }

        .has-image .tagline {
            margin: 0;
        }
    }

    .actions {
        display: flex;
        flex-wrap: wrap;
        margin: -6px;
        padding-top: 24px;
    }

    .has-image .actions {
        justify-content: center;
    }

    @media (min-width: 640px) {
        .actions {
            padding-top: 32px;
        }
    }

    @media (min-width: 960px) {
        .has-image .actions {
            justify-content: flex-start;
        }
    }

    .action {
        flex-shrink: 0;
        padding: 6px;
    }

    /* Image */
    .image {
        order: 1;
        margin: -48px -24px -48px;
    }

    @media (min-width: 640px) {
        .image {
            margin: -80px -24px -48px;
        }
    }

    @media (min-width: 960px) {
        .image {
            flex-grow: 1;
            order: 2;
            margin: 0;
            min-height: 100%;
        }
    }

    .image-container {
        position: relative;
        margin: 0 auto;
        width: 320px;
        height: 320px;
    }

    @media (min-width: 640px) {
        .image-container {
            width: 392px;
            height: 392px;
        }
    }

    @media (min-width: 960px) {
        .image-container {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 100%;
            transform: translate(-32px, -32px);
        }
    }

    .image-bg {
        position: absolute;
        top: 50%;
        left: 50%;
        border-radius: 50%;
        width: 192px;
        height: 192px;
        background: radial-gradient(circle, var(--greg-accent-light), transparent 70%);
        filter: blur(48px);
        transform: translate(-50%, -50%);
    }

    @media (min-width: 640px) {
        .image-bg {
            width: 256px;
            height: 256px;
        }
    }

    @media (min-width: 960px) {
        .image-bg {
            width: 320px;
            height: 320px;
        }
    }

    :global(.image-src) {
        position: absolute;
        top: 50%;
        left: 50%;
        max-width: 192px;
        max-height: 192px;
        width: 100%;
        height: 100%;
        object-fit: contain;
        transform: translate(-50%, -50%);
    }

    @media (min-width: 640px) {
        :global(.image-src) {
            max-width: 256px;
            max-height: 256px;
        }
    }

    @media (min-width: 960px) {
        :global(.image-src) {
            max-width: 320px;
            max-height: 320px;
        }
    }
</style>
