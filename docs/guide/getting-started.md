---
title: Getting Started
order: 1
---

# Getting Started

## What is Greg?

Greg is a **Svelte 5 + Vite-powered documentation engine**. You write content in
plain Markdown files, drop them in the `docs/` folder, and Greg turns them into a
fast, beautiful single-page documentation site — complete with sidebar navigation,
full-text search, dark/light mode and a rich set of Markdown extensions.

Greg is intentionally inspired by [VitePress](https://vitepress.dev), reusing most
of its Markdown syntax and several UI components, but built entirely on Svelte 5
instead of Vue.

---

## Prerequisites

| Requirement | Version |
| ----------- | ------- |
| Node.js     | ≥ 18    |
| Svelte      | 5.x     |
| Vite        | 7.x     |

---

## Installation

Clone or scaffold a new project from the Greg template, then install dependencies:

```sh
git clone https://github.com/your-org/greg my-docs
cd my-docs
npm install
```

---

## Project structure

```
.
├─ docs/                  ← your Markdown pages live here
│  ├─ index.md            ← root /docs page
│  ├─ guide/
│  │  └─ getting-started.md
│  └─ reference/
│     └─ api.md
├─ src/
│  ├─ App.svelte          ← mounts <MarkdownDocs>
│  ├─ main.js
│  └─ lib/
│     ├─ components/      ← Badge, Hero, Features, TeamPage …
│     └─ MarkdownDocs/    ← engine internals
├─ svelte.config.js       ← mdsvex options + remark/rehype plug-ins
├─ vite.config.js         ← Vite config + search-index plug-in
└─ package.json
```

The `docs/` directory is the **content root**. Every `.md` file inside it (except
files whose name starts with `__`) becomes a page accessible via its path.

---

## Development server

```sh
npm run dev
```

The site is served at `http://localhost:5173` by default. Changes to `.md` files
are hot-reloaded instantly.

---

## Production build

```sh
npm run build
```

The output in `dist/` is a fully static SPA that can be served by any CDN or web
server. See [Deploying](./deploying) for hosting-specific guides.

---

## Mounting the engine

The entry point `src/App.svelte` mounts the `<MarkdownDocs>` component:

```svelte
<script>
  import MarkdownDocs from './lib/MarkdownDocs/MarkdownDocs.svelte';
</script>

<MarkdownDocs rootPath="/docs" version="1.0.0" />
```

See the [`<MarkdownDocs>` reference](/docs/reference/markdowndocs) for a full list
of available props.
