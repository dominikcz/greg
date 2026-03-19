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
    vitePluginSearchIndex({ docsDir: 'docs', srcDir: '/' }),
    vitePluginSearchServer({ docsDir: 'docs', srcDir: '/' }),
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

### Server tuning for large indices

For very large documentation sets, tune standalone `greg search-server` directly
from `greg.config.js`:

```js
search: {
  provider: 'server',
  serverUrl: 'http://localhost:3100/api/search',
  server: {
    preloadShards: true,
    maxLoadedShards: 32,
    shardCandidates: 6,
  }
}
```

- `preloadShards` (default: `true`) preloads shard indexes at startup to reduce query latency.
- `maxLoadedShards` limits how many shard Fuse indexes stay in memory.
- `shardCandidates` controls how many likely shards are searched first per query.

Resolution order is:

1. CLI flags (`greg search-server --...`)
2. Environment variables (`GREG_SEARCH_*`)
3. `greg.config.js > search.server`
4. Built-in defaults

Supported runtime overrides:

- `--preload-shards` / `GREG_SEARCH_PRELOAD_SHARDS`
- `--max-loaded-shards` / `GREG_SEARCH_MAX_LOADED_SHARDS`
- `--shard-candidates` / `GREG_SEARCH_SHARD_CANDIDATES`

Build output now includes size logs for the generated search assets (full index + shards).

You can tune shard generation at build time with `GREG_SEARCH_SHARDS`:

- `GREG_SEARCH_SHARDS=32` (default) generates 32 shard files.
- `GREG_SEARCH_SHARDS=64` increases shard count.
- `GREG_SEARCH_SHARDS=0` (or `false` / `off` / `no`) disables shard generation and keeps only `search-index.json`.

For very large documentation sets, you may also need a higher Node.js heap limit during build:

```bash
NODE_OPTIONS=--max-old-space-size=8192 npm run build
```

On Windows PowerShell:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run build
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
| Click the **Search…** button in the header | Opens modal |
| `Ctrl + K`                                 | Opens modal |
| `Cmd + K` (macOS)                          | Opens modal |


## Keyboard navigation inside the modal

| Key       | Action                        |
| --------- | ----------------------------- |
| `↑` / `↓` | Select previous / next result |
| `Enter`   | Navigate to selected result   |
| `Esc`     | Close modal                   |


## Search ranking

Results are scored by Fuse.js using weighted fields:

| Field             | Weight |
| ----------------- | ------ |
| Page title        | 3×     |
| Section heading   | 2×     |
| Section body text | 1×     |

A fuzzy threshold of `0.4` is used — tighter than the default, so only genuine
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


## AI knowledge base

The AI feature adds an **Ask AI** tab to the search modal. It uses a retrieval-augmented
generation (RAG) pipeline: your docs are chunked and embedded at build time, then the
top matching chunks are injected as context into each LLM call.

Enable it in `greg.config.js`:

```js
search: {
  ai: {
    enabled: true,
    provider: 'ollama', // or 'openai'
    ollama: { model: 'gpt-oss' },
  }
}
```

See the [Getting started guide](/docs/guide/getting-started) for the required Vite plugin
(`vitePluginAiServer`) and the production AI server setup.

### AI runtime storage

In dev/preview (`vitePluginAiServer`), Greg uses an in-memory vector store
(`MemoryStore`). Chunks are rebuilt on startup and whenever Markdown files change,
so indexed AI data is not persisted across process restarts.

For production, prefer the standalone `greg ai-server`, which can use a persistent
SQLite-backed store (`search.ai.store = 'sqlite'`).


### AI characters (personas)

Greg ships five built-in personas that users can pick in the chat UI:

| ID             | Name         | Icon | Description                        |
| -------------- | ------------ | ---- | ---------------------------------- |
| `professional` | Professional | 👔    | Precise, formal, technical answers |
| `friendly`     | Friendly     | 😊    | Warm, approachable explanations    |
| `pirate`       | Pirate       | 🏴‍☠️   | Arr! Knowledge on the high seas!   |
| `sensei`       | Sensei       | 🥋    | Patient teacher, step-by-step      |
| `concise`      | Concise      | ✂️    | Maximum density, minimum words     |

#### Limiting which characters are available

Pass an array of IDs to show only a subset:

```js
ai: {
  characters: ['professional', 'friendly', 'concise'],
}
```

An empty array (or omitting the key) makes all five characters available.

#### Setting the default character

```js
ai: {
  defaultCharacter: 'friendly',
}
```

If omitted, `'professional'` is selected by default.

#### Defining custom characters

Add your own personas via `customCharacters`.
A custom entry with the same `id` as a built-in will **override** the built-in.

```js
import { aiCharacters } from '@dominikcz/greg/plugins';

ai: {
  // You can reference built-in character IDs via the exported aiCharacters array.
  // console.log(aiCharacters.map(c => c.id));

  customCharacters: [
    {
      id: 'mybot',
      name: 'My Bot',
      icon: '🤖',
      description: 'Tailored assistant for this project',
      systemPrompt: 'You are a helpful assistant specialized in this project. Always respond in the same language as the user\'s question.',
    },
  ],
  // Optionally restrict to only your custom character plus one built-in:
  characters: ['professional', 'mybot'],
}
```

`customCharacters` is merged with the built-in list before the `characters` filter is applied.
The `aiCharacters` export is provided for reference — you can inspect built-in IDs or
re-use/extend built-in system prompts programmatically.

`AiCharacterConfig` type (from `@dominikcz/greg/types`):

```ts
type AiCharacterConfig = {
  id: string;
  name: string;
  icon: string;
  description?: string;
  systemPrompt: string;
};
```
