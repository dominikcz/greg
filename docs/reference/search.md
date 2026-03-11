---
title: Search
---

Greg includes a built-in full-text search powered by [Fuse.js](https://fusejs.io/).
No external service or API key is required.


## Search modes

Search mode is configured in `greg.config.js`:

```js
search: {
  provider: 'server', // 'server' | 'local' | 'none'
  // serverUrl: '/api/search'
}
```

- `server`: Browser calls `GET /api/search?q=...` and receives ready-ranked results. Recommended for large doc sets (best default).
- `local`: Browser downloads `/search-index.json` and runs Fuse.js locally. Recommended for small doc sets.
- `none`: Built-in search UI (button + modal + shortcuts) is disabled. Recommended for sites without built-in search.


## How indexing works

At **build time**, `vitePluginSearchIndex` walks every `.md` file in the docs
folder, strips Markdown syntax, splits each page into sections (by heading) and
emits a `/search-index.json` file into the Vite output.

At **run time**:

- in `local` mode, the modal fetches `/search-index.json` and searches in-browser,
- in `server` mode, the modal queries your configured `serverUrl` endpoint.


## Required Vite plugins

Use both plugins in `vite.config.js`:

```js
import { vitePluginSearchIndex, vitePluginSearchServer } from '@dominikcz/greg/plugins';

export default defineConfig({
  plugins: [
    svelte(),
    vitePluginSearchIndex({ docsDir: 'docs', srcDir: '/docs' }),
    vitePluginSearchServer({ docsDir: 'docs', srcDir: '/docs' }),
  ],
});
```

`vitePluginSearchServer` exposes `/api/search` automatically in both `dev` and
`preview`.


## Production server-side search

Build your site first:

```bash
npm run build
```

Then start the standalone search server:

```bash
greg search-server --index dist/search-index.json --port 3100
```

Set `serverUrl` to that endpoint, for example:

```js
search: {
  provider: 'server',
  serverUrl: 'http://localhost:3100/api/search'
}
```

In production, you will usually place the search server behind a reverse proxy
so your frontend can keep using `/api/search`.


## Custom search engine

If you want Algolia, Meilisearch, Typesense, or your own backend:

- set `provider: 'none'` in `greg.config.js`,
- pass `searchProvider` prop to `<MarkdownDocs>`.

With `searchProvider` provided, Greg enables the Search button/modal again and
routes queries through your function.

`searchProvider` signature:

```ts
(query: string, limit?: number) => Promise<SearchResult[]>
```

Expected `SearchResult` shape:

```ts
type SearchResult = {
  id: string;
  title: string;
  titleHtml: string;
  sectionTitle: string;
  sectionTitleHtml?: string; // optional but recommended for consistent heading highlights
  sectionAnchor: string;
  excerptHtml: string;
  score: number;
}
```

`sectionTitleHtml` is now used by the built-in modal to render heading highlights.
If missing, Greg falls back to escaped `sectionTitle` (without match-aware markup).


## Opening search

| Method                                     | Action      |
| ------------------------------------------ | ----------- |
| Click the **Searchâ€¦** button in the header | Opens modal |
| `Ctrl + K`                                 | Opens modal |
| `Cmd + K` (macOS)                          | Opens modal |


## Keyboard navigation inside the modal

| Key       | Action                        |
| --------- | ----------------------------- |
| `â†‘` / `â†“` | Select previous / next result |
| `Enter`   | Navigate to selected result   |
| `Esc`     | Close modal                   |


## Search ranking

Results are scored by Fuse.js using weighted fields:

| Field             | Weight |
| ----------------- | ------ |
| Page title        | 3Ă—     |
| Section heading   | 2Ă—     |
| Section body text | 1Ă—     |

A fuzzy threshold of `0.4` is used â€” tighter than the default, so only genuine
matches surface. `ignoreLocation: true` means the match can appear anywhere in
the text, not just at the start.


## Excluding pages from the index

Files whose names start with `__` (double underscore) are automatically excluded
from both routing and the search index.


## Limitations

- In `local` mode, large indices can significantly increase initial payload size
  and memory usage in the browser.
- In `server` mode, your search endpoint must be reachable from the client
  (`serverUrl` must be correct for your environment).
- Code block content is stripped from the index (not searchable).
