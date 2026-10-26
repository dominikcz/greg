---
title: Quick reference
order: 1
---

# Greg quick reference

## Page metadata and URLs

Files under `{{DOCS_DIR}}/` become routes automatically. Front matter sets page metadata:

```md
---
title: Installation
order: 1
---

# Installation
```

For example, `guide/installation.md` is available at `/guide/installation`.
An `index.md` inside a folder is that folder's landing page.

## Helpful notes

```md
::: tip
Use a tip for a short recommendation.
:::

::: warning Before you continue
Call out a prerequisite or a possible pitfall.
:::
```

::: tip
Use a tip for a short recommendation.
:::

::: warning Before you continue
Call out a prerequisite or a possible pitfall.
:::

## Tabbed code examples

````md
::: code-group

```sh [npm]
npm install
```

```sh [pnpm]
pnpm install
```

:::
````

::: code-group

```sh [npm]
npm install
```

```sh [pnpm]
pnpm install
```

:::

## Include a shared snippet

Place reusable content in a file such as `snippets/example.js`, then include it in a page:

```md
<<< @/snippets/example.js
```

## Built-in components

Built-in components such as `Badge`, `Button`, `Image`, and `Link` can be used directly in Markdown:

```md
### API status <Badge type="tip" text="stable" />
```

### API status <Badge type="tip" text="stable" />

## Links

Use relative links between nearby pages and absolute links from the docs root:

```md
[Getting started](../getting-started)
[This section](#links)
```

Explore the [full Greg documentation](https://dominikcz.github.io/greg/) for configuration and more examples.
