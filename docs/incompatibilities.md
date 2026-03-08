---
title: VitePress Incompatibilities
order: 999
---

# VitePress Incompatibilities

Greg is strongly inspired by [VitePress](https://vitepress.dev){target="_blank"} and reuses most
Markdown conventions. This page lists **only differences and gaps**. If a feature
is not mentioned here, behavior should be considered equivalent.


## Configuration model

VitePress uses `.vitepress/config.js`.

Greg uses **`greg.config.js`** (or `.ts`) at project root for engine-level
settings (title, version, sidebar, outline, breadcrumb, back-to-top,
last-modified, search provider), while Markdown pipeline settings stay in
`svelte.config.js`.

```js
export default {
  rootPath: '/docs',
  mainTitle: 'My Docs',
  outline: [2, 3],
  sidebar: 'auto',
  breadcrumb: true,
  backToTop: true,
  lastModified: true,
}
```


## Top navigation

Greg supports a VitePress-compatible top nav bar with **dropdown menus and unlimited nesting depth**. The header contains site title, version badge, nav links, theme toggle, and search.

Top nav is configured in `greg.config.js`:

```js
nav: [
  { text: 'Guide',     link: '/docs/guide' },
  { text: 'Reference', link: '/docs/reference' },
  {
    text: 'More',
    items: [
      // flat links
      { text: 'Changelog', link: '/docs/changelog' },
      // grouped section (VitePress-compatible)
      {
        text: 'Resources',
        items: [
          { text: 'GitHub', link: 'https://github.com/...' },
          // deeper nesting — Greg only, VitePress stops here
          {
            text: 'Packages',
            items: [
              { text: 'npm', link: 'https://npmjs.com/...' },
            ],
          },
        ],
      },
    ],
  },
]
```

Internal links are handled by the SPA router (no full-page reload). Dropdowns close when
clicking outside. Groups are rendered as section headers with visual indentation.
External URLs in top nav open in a new tab automatically unless `target` is set explicitly.

**Greg advantage:** VitePress supports at most 2 levels inside a dropdown (group header +
links). Greg uses a recursive `flatItems()` algorithm and renders arbitrary nesting depth,
with each additional level indented to preserve visual hierarchy.


## Large-docs focus (Greg advantage)

Greg is optimized for very large documentation sets (thousands of files):

- Frontmatter is pre-collected into `virtual:greg-frontmatter` at build time.
- Routing and sidebar trees are built from that map, with no runtime fs scans.
- Sidebar ordering/labels/badges are controlled directly by `order`, `title`,
  and `badge` in frontmatter.
- Section headers can point to folder `index.md`, while still supporting
  auto-generated deep trees.


## Summary

| Capability                                               | VitePress                   | Greg                                    |
| -------------------------------------------------------- | --------------------------- | --------------------------------------- |
| Runtime composables (`useData`, `useRouter`, `withBase`) | ✅                           | ❌                                       |
| Data loaders (`*.data.js` / `*.data.ts`)                 | ✅                           | ❌                                       |
| Built-in i18n                                            | ✅                           | ❌                                       |
| Built-in sitemap generation                              | ✅                           | ❌                                       |
| Built-in "Edit this page" links                          | ✅                           | ❌                                       |
| Versioned docs support                                   | ✅                           | ❌                                       |
| Full theme extension API                                 | ✅                           | ❌ (customize via CSS vars/source edits) |
| SSG output by default                                    | ✅                           | ❌ (SPA)                                 |
| MPA mode                                                 | ✅ (experimental)            | ❌                                       |
| Vue syntax/components in Markdown                        | ✅                           | ❌                                       |
| Svelte syntax/components in Markdown                     | ❌                           | ✅                                       |
| Zero-config docs tree sidebar from folders               | ⚠️ (typically config-driven) | ✅                                       |
| Mixed manual + auto sidebar sections (`auto`)            | ⚠️                           | ✅                                       |
| Resizable sidebar splitter                               | ❌                           | ✅                                       |
| Sidebar badges from frontmatter (`badge`)                | ❌                           | ✅                                       |
| Inline attribute syntax on links/images                  | ❌                           | ✅                                       |


## SPA vs SSG

VitePress generates static HTML per page (SSG).
Greg currently ships as an SPA.

Implications for Greg deployments:

- Configure your server to rewrite all routes to `index.html`
  (see [Deploying](/guide/deploying)).
- Crawlers that do not execute JavaScript will not see full page content.
- Page-specific `<meta>` tags are not generated as static HTML per route.
