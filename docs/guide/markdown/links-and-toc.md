---
title: Links and TOC
order: 2
---

# Links and TOC

## Internal links

Internal links use SPA navigation and update the page without a full reload:

```md
[Getting Started](../getting-started)
[API reference](/reference/api)
[Back to top](#)
```

`.md` and `.html` extensions are stripped automatically.

## Fragment links (same page)

```md
[See the examples below](#examples)
```

Clicking a same-page `#anchor` link scrolls smoothly without a history push.

## External links

External links open via the browser's default navigation.

## Table of contents - `[[toc]]`

Insert an inline table of contents at any point in a page:

```md
[[toc]]
```

Output:

[[toc]]

By default h2 and h3 headings are included. The right-side **Outline** panel is
a persistent alternative. See `outline` prop in the
[`<MarkdownDocs>` reference](/reference/markdowndocs).
