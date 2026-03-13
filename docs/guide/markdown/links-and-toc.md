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

Output:

[Getting Started](../getting-started)
[API reference](/reference/api)
[Back to top](#)

`.md` and `.html` extensions are stripped automatically.

## Fragment links (same page)

```md
[See the examples below](#examples)
```

Output:

[See the examples below](#examples)

Clicking a same-page `#anchor` link scrolls smoothly without a history push.

## External links

External links open via the browser's default navigation.

```md
[Project website](https://example.com)
```

Output:

[Project website](https://example.com)

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

## Flex row list - `[[ ... ]]`

Use `[[ ... ]]` to render multiple markdown blocks in a horizontal wrapping row.
Each non-empty line inside the block becomes one flex item.

```md
[[
![Freezer A](/know-how/gastro-orlen/mroznia/freezer-a.webp)
![Freezer B](/know-how/gastro-orlen/mroznia/freezer-b.webp)
![Freezer C](/know-how/gastro-orlen/mroznia/freezer-c.webp)
]]
```

Use line breaks (Enter) to separate items. Brace syntax (`{...}`) and one-line
comma-only syntax (for example `[[One, Two]]`) are not supported.
