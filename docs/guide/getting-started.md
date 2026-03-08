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

Greg is intentionally inspired by [VitePress](https://vitepress.dev){target="_blank" rel="noopener noreferrer"}, reusing most
of its Markdown syntax and several UI conventions, but built entirely on Svelte 5
instead of Vue.


## Prerequisites

| Requirement | Version |
| ----------- | ------- |
| Node.js     | ≥ 18    |
| Svelte      | 5.x     |
| Vite        | 7.x     |


## Quick start

The fastest way to start a new project is the interactive `init` command:

```sh
npx @dominikcz/greg init
```

The wizard will ask for:
- **Docs path** — where your Markdown files will live (default: `./docs`)
- **Site title** and **description**
- **TypeScript** — whether to use `.ts` for config files
- **Package.json scripts** — automatically adds `dev`, `build`, `preview`
- **Documentation contents** — empty starter, sample template, or generated fake docs
- **Install dependencies** — optionally runs `npm install` immediately

At the end you only need:

```sh
npm run dev
```


## Manual installation

If you prefer to wire things up yourself:

```sh
npm install --save-dev @dominikcz/greg @sveltejs/vite-plugin-svelte svelte vite
```


## Project structure

```
.
├─ docs/                  ← your Markdown pages live here
│  ├─ index.md            ← home page
│  ├─ guide/
│  └─ reference/
├─ src/
│  ├─ App.svelte          ← mounts <MarkdownDocs>
│  └─ main.js
├─ svelte.config.js       ← mdsvex options (must be .js)
├─ vite.config.js         ← Vite config + Greg plugins
├─ greg.config.js         ← site title, sidebar, outline …
└─ package.json
```

The `docs/` directory is the **content root**. Every `.md` file inside it (except
files whose name starts with `__`) becomes a page accessible via its path.


## Mounting the engine

`src/App.svelte` simply mounts `<MarkdownDocs>` — no props required when using `greg.config`:

```svelte
<script>
    import MarkdownDocs from '@dominikcz/greg'
</script>

<MarkdownDocs />
```

See the [`<MarkdownDocs>` reference](/reference/markdowndocs) for a full list
of available props.


## Development server

```sh
npm run dev
# or: greg dev
```

The site is served at `http://localhost:5173` by default. Changes to `.md` files
are hot-reloaded instantly.


## Production build

```sh
npm run build
# or: greg build
```

Outputs a fully static SPA in `dist/` that can be served by any CDN or web server.
See [Deploying](./deploying) for hosting-specific guides.
