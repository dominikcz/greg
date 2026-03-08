---
title: MarkdownDocs Component
---

`MarkdownDocs` is the top-level component that wires together the entire
documentation engine: routing, sidebar navigation, the outline panel, search,
dark/light mode and Carbon Ads.

Mount it in `src/App.svelte`:

```svelte
<script>
    import MarkdownDocs from '@dominikcz/greg'
</script>

<MarkdownDocs rootPath="/docs" version="1.0.0" />
```


## Props

### `locales` (via `greg.config.js`)

- **Type:** `Record<string, LocaleConfig>`
- **Location:** `greg.config.js` (not a direct `<MarkdownDocs>` prop)

Localization is supported through `greg.config.js`:

- locale keys like `'/'`, `'/pl/'`
- locale-specific `lang`, `title`
- optional locale `label` used in header language switcher
- locale-specific `themeConfig` keys:
  `nav`, `sidebar`, `outline`, `lastUpdatedText`, `langMenuLabel`,
  `sidebarMenuLabel`, `skipToContentLabel`, `returnToTopLabel`,
  `darkModeSwitchLabel`, `lightModeSwitchTitle`, `darkModeSwitchTitle`,
  `docFooter`, `siteTitle`, `logo`, `socialLinks`, `editLink`, `footer`, `aside`, `lastUpdated`

Language switcher behavior:

- appears in the header when two or more locales are defined
- with `i18nRouting: true` (default), preserves current relative page across locales
- with `i18nRouting: false`, switches directly to locale root
- falls back to target locale root when the mapped page does not exist

Locale paths are resolved under `rootPath`:

- if `rootPath = '/docs'`
- locale `'/'` maps to `'/docs'`
- locale `'/pl/'` maps to `'/docs/pl'`

```js
export default {
  rootPath: '/docs',
  i18nRouting: true,
  locales: {
    '/': {
      lang: 'en-US',
      title: 'Docs',
      themeConfig: {
        nav: [{ text: 'Guide', link: '/docs/guide' }],
        sidebar: [{ text: 'Guide', auto: '/guide' }],
        outline: [2, 3],
        lastUpdatedText: 'Last updated:',
        langMenuLabel: 'Change language',
        sidebarMenuLabel: 'Menu',
        skipToContentLabel: 'Skip to content',
        returnToTopLabel: 'Return to top',
        darkModeSwitchLabel: 'Appearance',
        lightModeSwitchTitle: 'Switch to light theme',
        darkModeSwitchTitle: 'Switch to dark theme',
        docFooter: { prev: 'Previous', next: 'Next' },
      },
    },
    '/pl/': {
      lang: 'pl-PL',
      label: 'Polski',
      title: 'Dokumentacja',
      themeConfig: {
        nav: [{ text: 'Przewodnik', link: '/docs/pl/guide' }],
        sidebar: [{ text: 'Przewodnik', auto: '/pl/guide' }],
        outline: { level: [2, 3], label: 'Na tej stronie' },
        lastUpdatedText: 'Zaktualizowano:',
        langMenuLabel: 'Zmien jezyk',
        sidebarMenuLabel: 'Menu',
        skipToContentLabel: 'Przejdz do tresci',
        returnToTopLabel: 'Wroc na gore',
        darkModeSwitchLabel: 'Wyglad',
        lightModeSwitchTitle: 'Przelacz na jasny motyw',
        darkModeSwitchTitle: 'Przelacz na ciemny motyw',
        docFooter: { prev: 'Poprzednia', next: 'Nastepna' },
      },
    },
  },
}
```

### `rootPath`

- **Type:** `string`
- **Default:** `"/docs"`

URL prefix that maps to the `docs/` folder. Must match the `rootPath` value
passed to `vitePluginSearchIndex` in `vite.config.js`.

```svelte
<MarkdownDocs rootPath="/documentation" version="1.0.0" />
```

### `version`

- **Type:** `string`
- **Default:** `""`

Version string displayed as a badge next to the site title in the header.
Pass the package version via Vite's `define`:

```svelte
<!-- Assuming __VERSION__ is defined in vite.config.js -->
<MarkdownDocs rootPath="/docs" version={__VERSION__} />
```

### `mainTitle`

- **Type:** `string`
- **Default:** `"Greg"`

Name of the project shown in the top-left header.

```svelte
<MarkdownDocs rootPath="/docs" version="1.0.0" mainTitle="My Project" />
```

### `outline`

- **Type:** `false | number | [number, number] | 'deep' | { level?: …, label?: string }`
- **Default:** `[2, 3]`

Controls the right-side **Outline** (on-this-page) panel.

| Value                                 | Effect                             |
| ------------------------------------- | ---------------------------------- |
| `false`                               | Outline panel is hidden            |
| `2`                                   | Only `h2` headings                 |
| `[2, 3]`                              | `h2` and `h3` headings *(default)* |
| `'deep'`                              | `h2` through `h6`                  |
| `{ level: [2,4], label: 'Contents' }` | Custom range and panel label       |

```svelte
<MarkdownDocs rootPath="/docs" version="1.0.0" outline="deep" />
```

### `carbonAds`

- **Type:** `{ code: string; placement: string } | undefined`
- **Default:** `undefined`

Displays a [Carbon Ads](https://www.carbonads.net/) block in the outline sidebar.
See the [Carbon Ads reference](/reference/carbon-ads) for details.

```svelte
<MarkdownDocs
  rootPath="/docs"
  version="1.0.0"
  carbonAds={{ code: 'CWYD42JW', placement: 'myprojectdev' }}
/>
```

### `children`

- **Type:** `Snippet | undefined`

Rendered when the active path does not match any Markdown file (i.e., when a
folder URL has no `index.md`). Useful for a custom landing splash or a
"choose a topic" prompt.

```svelte
<MarkdownDocs rootPath="/docs" version="1.0.0">
  {#snippet children()}
    <p>👈 Select a page from the sidebar to get started.</p>
  {/snippet}
</MarkdownDocs>
```


## Vite configuration

`vitePluginSearchIndex` must be added to `vite.config.js` to build the
full-text search index:

```js
// vite.config.js
import { vitePluginSearchIndex } from '@dominikcz/greg/plugins';

export default defineConfig({
  plugins: [
    svelte(),
    vitePluginSearchIndex({ docsDir: 'docs', rootPath: '/docs' }),
  ],
  resolve: {
    alias: {
      '$components': resolve('./src/lib/components'),
    },
  },
});
```

| Option     | Description                                                        |
| ---------- | ------------------------------------------------------------------ |
| `docsDir`  | Folder name relative to the project root that contains `.md` files |
| `rootPath` | URL prefix — must match the `rootPath` prop                        |


## svelte.config.js

The markdown pipeline is configured in `svelte.config.js`. The `gregConfig`
object at the top of the file exposes user-facing options:

```js
const gregConfig = {
  markdown: {
    math: false,   // set to true to enable $…$ / $$…$$ rendering via MathJax
  },
};
```

## Runtime extension model

`MarkdownRenderer.svelte` now delegates registry-style extension points to
`src/lib/MarkdownDocs/markdownRendererRuntime.ts` instead of keeping hardcoded
branches inline. This keeps runtime rendering predictable and makes new
features easier to add.

### 1) Component hydration registry

`COMPONENT_REGISTRY` maps a tag name to:

- a Svelte `component`
- a `buildProps(el)` function

This is used for custom component tags like `badge`, `button`, `image`,
`link`, and `codegroup`.

### 2) Markdown plugin registries

The markdown pipeline is assembled from two ordered registries:

- `getRemarkPluginEntries(baseUrl, docsPrefix)`
- `getRehypePluginEntries()`

These cover, among others:

- custom containers (`remarkContainers` + `rehypeContainers`)
- code blocks (`rehypeShiki`, `rehypeCodeTitle`, `rehypeCodeGroup`)
- Mermaid preprocessing (`rehypeMermaid`)
- Steps normalization (`rehypeStepsWrapper`)
- headings/TOC (`rehypeSlug`, `rehypeAutolinkHeadings`, `rehypeTocPlaceholder`)

### 3) Render handlers (post-HTML stage)

After HTML is rendered, handlers are executed from ordered lists:

- `RUNTIME_RENDER_HANDLERS` (full render pass)
- `THEME_CHANGE_RENDER_HANDLERS` (theme-only pass)

Current handlers include component hydration and Mermaid initialization/re-render.

## What to extend where

- Use **component registry** for interactive widgets rendered from custom tags.
- Use **rehype/remark registries** for static HTML transforms.
- Use **render handlers** for browser-only work that needs live DOM access
  (for example diagram engines).
