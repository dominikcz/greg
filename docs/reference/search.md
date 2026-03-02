# Search

Greg includes a built-in full-text search powered by [Fuse.js](https://fusejs.io/).
No external service or API key is required.

---

## How it works

At **build time**, `vitePluginSearchIndex` walks every `.md` file in the docs
folder, strips Markdown syntax, splits each page into sections (by heading) and
emits a `/search-index.json` file into the Vite output.

At **run time**, the search modal fetches that JSON once, initialises a Fuse.js
instance and performs fuzzy matching entirely in the browser.

---

## Opening search

| Method | Action |
| ------ | ------ |
| Click the **Search…** button in the header | Opens modal |
| `Ctrl + K` | Opens modal |
| `Cmd + K` (macOS) | Opens modal |

---

## Keyboard navigation inside the modal

| Key | Action |
| --- | ------ |
| `↑` / `↓` | Select previous / next result |
| `Enter` | Navigate to selected result |
| `Esc` | Close modal |

---

## Enabling search

Add `vitePluginSearchIndex` to your Vite configuration:

```js
// vite.config.js
import { vitePluginSearchIndex } from './src/lib/MarkdownDocs/vitePluginSearchIndex.js';

export default defineConfig({
  plugins: [
    svelte(),
    vitePluginSearchIndex({
      docsDir:  'docs',      // folder containing .md files (relative to project root)
      rootPath: '/docs',     // URL prefix — must match MarkdownDocs rootPath prop
    }),
  ],
});
```

---

## Search ranking

Results are scored by Fuse.js using weighted fields:

| Field | Weight |
| ----- | ------ |
| Page title | 3× |
| Section heading | 2× |
| Section body text | 1× |

A fuzzy threshold of `0.4` is used — tighter than the default, so only genuine
matches surface. `ignoreLocation: true` means the match can appear anywhere in
the text, not just at the start.

---

## Excluding pages from the index

Files whose names start with `__` (double underscore) are automatically excluded
from both routing and the search index.

---

## Limitations

- The search index is built once at `npm run build`. In dev mode the index is
  also generated on server start but is **not** live-updated when `.md` files
  change — restart the dev server to refresh it.
- Code block content is stripped from the index (not searchable).
