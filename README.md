# Greg

Svelte 5 + Vite-powered documentation engine. Write Markdown, get a beautiful documentation site — hot-reloaded in milliseconds.

Inspired by [VitePress](https://vitepress.dev){target="_blank"}, built on Svelte 5.

## Quick start

```sh
npx @dominikcz/greg init
```

The interactive wizard will ask for docs path, site title, TypeScript preference, and the type of initial documentation (empty, sample, or generated fake docs). It can also install all required dependencies for you.

At the end you only need:

```sh
npm run dev
```

## Manual installation

```sh
npm install --save-dev @dominikcz/greg @sveltejs/vite-plugin-svelte svelte vite
```

**`vite.config.js`**
```js
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import {
    vitePluginGregConfig,
    vitePluginSearchIndex,
    vitePluginSearchServer,
    vitePluginFrontmatter,
    vitePluginCopyDocs,
} from '@dominikcz/greg/plugins'

export default defineConfig({
    plugins: [
        svelte(),
        vitePluginGregConfig(),
        vitePluginSearchIndex({ docsDir: 'docs', rootPath: '/docs' }),
        vitePluginSearchServer({ docsDir: 'docs', rootPath: '/docs' }),
        vitePluginFrontmatter({ docsDir: 'docs' }),
        vitePluginCopyDocs({ docsDir: 'docs' }),
    ],
})
```

**`svelte.config.js`** (must be `.js` — not `.ts`)
```js
export { default } from '@dominikcz/greg/svelte.config'
```

**`greg.config.js`** (or `.ts`)
```js
/** @type {import('@dominikcz/greg').GregConfig} */
export default {
    rootPath: '/docs',
    mainTitle: 'My Docs',
    sidebar: [
        { text: 'Guide', auto: '/guide' },
        { text: 'GitHub', link: 'https://github.com/dominikcz/greg' }, // default: _self
        { text: 'GitHub (new tab)', link: 'https://github.com/dominikcz/greg', target: '_blank' },
    ],
}
```

**`src/App.svelte`**
```svelte
<script>
    import MarkdownDocs from '@dominikcz/greg'
</script>

<MarkdownDocs />
```

## CLI

| Command              | Description                     |
| -------------------- | ------------------------------- |
| `greg init`          | Interactive project scaffolding |
| `greg dev`           | Start Vite dev server           |
| `greg build`         | Production build                |
| `greg preview`       | Preview production build        |
| `greg search-server` | Standalone search API server    |

## TypeScript

Greg ships types at `@dominikcz/greg`. `greg.config.ts` is supported — it is transpiled via esbuild at build time.

```ts
import type { GregConfig } from '@dominikcz/greg'

export default {
    rootPath: '/docs',
    mainTitle: 'My Docs',
} satisfies GregConfig
```

> **Note:** `svelte.config` must remain a `.js` file — `@sveltejs/vite-plugin-svelte` loads it directly via Node ESM without a TypeScript transform.

## Links

- [Documentation](https://github.com/dominikcz/greg)
- [GitHub](https://github.com/dominikcz/greg)
- [npm](https://www.npmjs.com/package/@dominikcz/greg)

---

## TODO

### 0.9

- [ ] AI search integration
- [ ] i18n support
- [ ] multiple versions support

### 1.0

- [ ] edit mode
- [ ] comments
- [ ] code cleanup
