---
title: MarkdownDocs Component
order: 1
---

# `<MarkdownDocs>` Component

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

| Value | Effect |
| ----- | ------ |
| `false` | Outline panel is hidden |
| `2` | Only `h2` headings |
| `[2, 3]` | `h2` and `h3` headings *(default)* |
| `'deep'` | `h2` through `h6` |
| `{ level: [2,4], label: 'Contents' }` | Custom range and panel label |

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
import { vitePluginSearchIndex } from './src/lib/MarkdownDocs/vitePluginSearchIndex.js';

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

| Option | Description |
| ------ | ----------- |
| `docsDir` | Folder name relative to the project root that contains `.md` files |
| `rootPath` | URL prefix — must match the `rootPath` prop |


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
