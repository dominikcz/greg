# VitePress Incompatibilities

Greg is heavily inspired by [VitePress](https://vitepress.dev) and re-uses most of
its Markdown syntax conventions. This page lists every place where the two
diverge so you can migrate smoothly or avoid surprises when referencing VitePress
documentation alongside Greg.

---

## Frontmatter layouts

**VitePress** controls page layout with frontmatter:

```yaml
---
layout: home   # home | doc | page
---
```

**Greg** does **not** support frontmatter layouts. Content is always rendered
as a Markdown page. To build a home page, place `<Hero>` and `<Features>`
components directly in `docs/index.md`. To build a full-page layout (e.g. a
team page) use the `<TeamPage>` family of components.

> See: [Home Page reference](/docs/reference/home-page),
> [Team Page reference](/docs/reference/team-page)

---

## Frontmatter config (title, description, lang, …)

**VitePress** reads many frontmatter keys that affect the rendered page:

```yaml
---
title: My Page
description: An introduction.
lang: en-US
outline: deep
prev: false
next: ./other-page
---
```

**Greg** ignores all frontmatter keys (mdsvex parses them but Greg does not act
on them). Exceptions:

- `outline` is **not** read per-page from frontmatter — set it globally on the
  `<MarkdownDocs>` component.
- Custom frontmatter data can still be extracted manually inside Svelte code
  using mdsvex's `metadata` export, but Greg's engine has no built-in support.

---

## Config file (`.vitepress/config.js`)

**VitePress** uses a dedicated `.vitepress/config.js` file to configure the site
title, nav, sidebar, social links, etc.

**Greg** has no equivalent unified config file. Configuration is split between:

| Concern | File |
| ------- | ---- |
| Markdown pipeline (plugins, math, shiki theme) | `svelte.config.js` |
| Vite plugins, aliases, search index options | `vite.config.js` |
| Engine props (title, version, outline, Carbon Ads) | `src/App.svelte` |

---

## CLI

**VitePress** ships a `vitepress` CLI binary (`vitepress dev`, `vitepress build`).

**Greg** uses the standard Vite CLI:

| Action | Command |
| ------ | ------- |
| Dev server | `npm run dev` (→ `vite`) |
| Build | `npm run build` (→ `vite build`) |
| Preview | `npm run preview` (→ `vite preview`) |

---

## Nav bar & sidebar config

**VitePress** lets you define the nav bar and sidebar declaratively in the config:

```js
export default {
  themeConfig: {
    nav: [ … ],
    sidebar: { … },
  },
}
```

**Greg** generates **both** the nav and the sidebar automatically from the file
structure inside `docs/`. There is currently no way to override labels,
reorder items beyond alphabetical sorting (use numeric prefixes as a workaround),
or mark items as external in the config.

---

## `useData()` / `withBase()` runtime API

**VitePress** exposes a runtime composable API (`useData`, `useRouter`,
`withBase`, etc.) usable inside Vue SFCs and `.md` files.

**Greg** has no equivalent public runtime API for Markdown pages. The internal
router state is not exposed to page components.

---

## Data loaders (`.data.js` / `.data.ts`)

**VitePress** supports build-time data loading via `*.data.js` files:

```js
// posts.data.js
export default { load() { return fetch('…').then(r => r.json()) } }
```

**Greg** has **no equivalent**. To load data at build time, use a standard Vite
virtual module or pre-generate JSON files and import them in `<script>` blocks.

---

## Emoji shortcodes (`:tada:`)

**VitePress** ships with `markdown-it-emoji` support:

```md
:tada: :100:
```

**Greg** does **not** support emoji shortcodes. Use Unicode emoji directly:

```md
🎉 💯
```

---

## Last Updated / Edit Link / Prev–Next links

**VitePress** can display "Last Updated" timestamps (from git), "Edit this page"
links, and automatic previous/next pagination between pages.

**Greg** does **not** support any of these features automatically. You can add
them manually using `<script>` blocks in individual pages if needed.

---

## Internationalization (i18n)

**VitePress** has built-in i18n with locale-based directory structure and a
language switcher in the nav.

**Greg** has **no i18n support**.

---

## Sitemap generation

**VitePress** can emit a `sitemap.xml` during build.

**Greg** does **not** generate a sitemap. Use a post-build script (e.g.
[`vite-plugin-sitemap`](https://github.com/…)) if needed.

---

## Static Site Generation (SSG) vs SPA

**VitePress** performs full **static site generation (SSG)** — each page is
pre-rendered to a static `.html` file. This means excellent SEO and crawlability
out of the box.

**Greg** produces a **single-page application (SPA)**. Every URL serves the same
`index.html`; content is loaded client-side. Consequences:

- You must configure your web server to rewrite all paths to `index.html`
  (see [Deploying](/docs/guide/deploying)).
- Search engine crawlers that do not execute JavaScript will not see page content.
- `<meta>` tags are not per-page — they are static in `index.html`.

---

## MPA mode

**VitePress** offers an experimental Multi-Page App mode.

**Greg** is SPA-only; no MPA mode exists.

---

## Custom themes / layouts

**VitePress** supports full theme replacement via `.vitepress/theme/index.js`.

**Greg** does not expose a theme extension API. Appearance is customised via
[CSS variables](/docs/reference/theme) and by editing the Svelte source files
directly.

---

## Vue-specific syntax in Markdown

**VitePress** supports Vue template syntax (`:prop`, `v-for`, `<script setup>`,
etc.) in `.md` files.

**Greg** uses **Svelte** template syntax instead (`{#each}`, `{#if}`,
`bind:`, runes, etc.). Vue-specific constructs are not valid.

> See: [Using Svelte in Markdown](/docs/guide/using-svelte)

---

## Summary table

| Feature | VitePress | Greg |
| ------- | --------- | ---- |
| `layout: home` frontmatter | ✅ | ❌ (use `<Hero>` + `<Features>`) |
| `layout: page` frontmatter | ✅ | ❌ |
| Per-page frontmatter config | ✅ | ❌ |
| `.vitepress/config.js` | ✅ | ❌ (split across files) |
| Declarative nav / sidebar | ✅ | ❌ (auto-generated) |
| `useData()` runtime API | ✅ | ❌ |
| Data loaders (`.data.js`) | ✅ | ❌ |
| Emoji shortcodes | ✅ | ❌ |
| Last Updated / Edit Link | ✅ | ❌ |
| Prev / Next links | ✅ | ❌ |
| i18n | ✅ | ❌ |
| Sitemap generation | ✅ | ❌ |
| SSG (static HTML per page) | ✅ | ❌ (SPA only) |
| MPA mode | ✅ (experimental) | ❌ |
| Custom theme API | ✅ | ❌ (CSS vars only) |
| Vue components in Markdown | ✅ | ❌ (Svelte only) |
| Header anchors | ✅ | ✅ |
| Custom anchors `{#id}` | ✅ | ✅ |
| Custom containers `:::` | ✅ | ✅ |
| GitHub alerts `> [!NOTE]` | ✅ | ✅ |
| Code groups | ✅ | ✅ |
| Code titles `[title]` | ✅ | ✅ |
| Code snippet import `<<<` | ✅ | ✅ |
| File include `@include:` | ✅ | ✅ |
| Math (`$…$` / `$$…$$`) | ✅ | ✅ |
| `[[toc]]` inline TOC | ✅ | ✅ |
| Inline attrs on links/images | ❌ | ✅ |
| Built-in search | ✅ | ✅ |
| Dark / light mode | ✅ | ✅ |
| Outline panel | ✅ | ✅ |
| Carbon Ads | ✅ | ✅ |
| Badge component | ✅ | ✅ |
| Hero / Features components | ✅ | ✅ |
| Team page components | ✅ | ✅ |
| Social links | ✅ | ✅ |
| Resizable sidebar | ❌ | ✅ |
