---
title: VitePress Incompatibilities
order: 999
---

Greg is strongly inspired by [VitePress](https://vitepress.dev){target="_blank"} and reuses most
Markdown conventions. This page lists **only differences and gaps**. If a feature
is not mentioned here, behavior should be considered equivalent.

## Compatibility status

Greg is **compatible with VitePress at configuration level** for the supported docs/theme options
(including locale config).

Current incompatibilities are mostly about **runtime API** and **platform features**, not config.


## Why Greg is different

Greg is optimized for **very large documentation projects** and fast SPA runtime navigation.
Its architecture is built around preprocessed metadata (`virtual:greg-frontmatter`),
predictable routing/sidebar generation, and search modes designed for large content sets.

Because of that focus, not every VitePress API/platform feature is mirrored 1:1.
These differences are intentional trade-offs, not config-level gaps.

For architecture and design assumptions, see:

- [MarkdownDocs Component](/reference/markdowndocs)
- [Search](/reference/search)


## Summary

| Area | Status |
| --- | --- |
| Config compatibility | ✅ VitePress-like config supported in `greg.config.js` |
| Runtime API parity | ❌ No full VitePress API parity (`useData`, `useRouter`, `withBase`, `*.data.*`) |
| Platform features | ⚠️ Separate track (for example: sitemap, SSG adapters, build/deploy capabilities) |
| Rendering model | Greg is SPA-first, VitePress is SSG-first |
| Top navigation | ✅ Config-compatible; Greg supports deeper dropdown nesting |
| Markdown component model | Different by design: Greg supports Svelte in Markdown, VitePress supports Vue |


## Deployment note

Because Greg is SPA-first, configure your server to rewrite routes to `index.html`
(see [Deploying](/guide/deploying)).
