# Greg

Svelte 5 + Vite-powered documentation engine. Write Markdown, get a beautiful documentation site — hot-reloaded in milliseconds.

Inspired by [VitePress](https://vitepress.dev){target="_blank"}, built on Svelte 5.

## Quick start

```sh
npx @dominikcz/greg init
```

For unattended/default setup (no prompts):

```sh
npx @dominikcz/greg init --defaults
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

If your `package.json` does not already define module type, set:

```json
{
    "type": "module"
}
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
        vitePluginFrontmatter({ docsDir: 'docs', rootPath: '/docs' }),
        vitePluginCopyDocs({ docsDir: 'docs', rootPath: '/docs' }),
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

## Localization (VitePress-compatible)

Greg supports VitePress-style `locales` in `greg.config.js`.

- Locale keys use paths like `'/'`, `'/pl/'`, `'/de/'`
- They are resolved under `rootPath`
- Supported per locale: `lang`, `title`, `label`
- Supported per locale `themeConfig` keys:
    `nav`, `sidebar`, `outline`, `lastUpdatedText`, `langMenuLabel`,
    `sidebarMenuLabel`, `skipToContentLabel`, `returnToTopLabel`,
    `darkModeSwitchLabel`, `lightModeSwitchTitle`, `darkModeSwitchTitle`,
    `docFooter`, `siteTitle`, `logo`, `socialLinks`, `editLink`, `footer`, `aside`, `lastUpdated`
- Header automatically shows a language switcher when at least two locales are configured
- `i18nRouting: true` (default) keeps the same relative page when possible
- `i18nRouting: false` switches directly to locale root

```js
/** @type {import('@dominikcz/greg').GregConfig} */
export default {
    rootPath: '/docs',
    i18nRouting: true,
    locales: {
        '/': {
            lang: 'en-US',
            title: 'My Docs',
            themeConfig: {
                nav: [
                    { text: 'Guide', link: '/docs/guide' },
                    { text: 'Reference', link: '/docs/reference' },
                ],
                sidebar: [
                    { text: 'Guide', auto: '/guide' },
                    { text: 'Reference', auto: '/reference' },
                ],
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
            title: 'Moje Dokumenty',
            themeConfig: {
                nav: [
                    { text: 'Przewodnik', link: '/docs/pl/guide' },
                    { text: 'Referencja', link: '/docs/pl/reference' },
                ],
                sidebar: [
                    { text: 'Przewodnik', auto: '/pl/guide' },
                    { text: 'Referencja', auto: '/pl/reference' },
                ],
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

## CLI

| Command               | Description                      |
| --------------------- | -------------------------------- |
| `greg init`           | Interactive project scaffolding  |
| `greg dev`            | Start Vite dev server            |
| `greg build`          | Production build                 |
| `greg build:static`   | Production build + static export |
| `greg build:markdown` | Export resolved markdown         |
| `greg build:versions` | Build all configured versions    |
| `greg preview`        | Preview production build         |
| `greg search-server`  | Standalone search API server     |

## Multi-version Docs

Greg supports two version-source strategies via `greg.config.*`:

- `branches` (default): reads docs from configured git branches/refs and caches snapshots/builds per commit SHA
- `folders`: reads docs directly from version folders in the working tree

Source mapping (`branch`/`dir` to a version id) is defined in config entries under
`versioning.branches` or `versioning.folders`. Strategy is selected via
`versioning.strategy` (or overridden by `--strategy`).

Run:

```sh
greg build:versions
```

Branch-based example (default strategy):

```js
/** @type {import('@dominikcz/greg').GregConfig} */
export default {
    rootPath: '/docs',
    versioning: {
        strategy: 'branches',
        default: 'latest',
        aliases: {
            latest: '2.1',
            stable: '2.0',
        },
        branches: [
            { version: '2.1', branch: 'main', title: '2.1' },
            { version: '2.0', branch: 'release/2.0', title: '2.0' },
        ],
    },
}
```

Folder-based example:

```js
/** @type {import('@dominikcz/greg').GregConfig} */
export default {
    rootPath: '/docs',
    versioning: {
        strategy: 'folders',
        default: 'latest',
        aliases: {
            latest: '2.1',
            stable: '2.0',
        },
        folders: [
            { version: '2.1', dir: './docs', title: '2.1' },
            { version: '2.0', dir: './versions/2.0/docs', title: '2.0' },
        ],
    },
}
```

Output is generated to `dist/versions/<version>` and a manifest is written to `dist/versions/versions.json`.

Example manifest:

```json
{
    "default": "latest",
    "versions": [
        { "version": "2.1", "title": "2.1", "path": "/versions/2.1/" },
        { "version": "2.0", "title": "2.0", "path": "/versions/2.0/" }
    ],
    "aliases": {
        "latest": "2.1",
        "stable": "2.0"
    }
}
```

## Resolved Markdown Export

Generate a fully expanded markdown snapshot (all `<!--@include: ...-->` and `<<< ...` resolved)
for AI knowledge-base ingestion or server-side indexing pipelines.

```sh
greg build:markdown
```

Output is written to `dist/resolved-markdown` and mirrors the `docs/` structure.

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
- [ ] multiple versions support

### 1.0

- [ ] edit mode
- [ ] comments
- [ ] code cleanup
