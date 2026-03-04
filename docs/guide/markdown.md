---
title: Markdown Extensions
order: 2
---

# Markdown Extensions

Greg extends standard Markdown with a rich set of features, mostly compatible with
[VitePress](https://vitepress.dev/guide/markdown) syntax.


## Header anchors

Every heading automatically receives a slug-based `id` so it can be linked to:

```md
## My Section
```

Renders as `<h2 id="my-section">`.

### Custom anchors

Override the auto-generated slug with a `{#custom-id}` suffix:

```md
## My Section {#custom-anchor}
```

This lets you link to `#custom-anchor` even if the heading text changes.


## Links

### Internal links

Internal links use SPA navigation — the page is updated without a full reload:

```md
[Getting Started](./getting-started)
[API reference](/docs/reference/api)
[Back to top](#)
```

`.md` and `.html` extensions are stripped automatically.

### Fragment links (same page)

```md
[See the examples below](#examples)
```

Clicking a same-page `#anchor` link scrolls smoothly without a history push.

### External links

External links open via the browser's default navigation. No special markup is
required.


## Tables

GitHub-flavoured Markdown tables are supported:

```md
| Name    | Type   | Default |
| ------- | ------ | ------- |
| rootPath | string | `/docs` |
| version  | string | `''`  |
```

**Output**

| Name     | Type   | Default |
| -------- | ------ | ------- |
| rootPath | string | `/docs` |
| version  | string | `''`    |


## Table of contents — `[[toc]]`

Insert an inline table of contents at any point in a page:

```md
[[toc]]
```

**Output**

[[toc]]

By default h2 and h3 headings are included. The right-side **Outline** panel is
a persistent alternative — see `outline` prop in the
[`<MarkdownDocs>` reference](/docs/reference/markdowndocs).


## Custom containers

### Default types

```md
::: info
Informational note.
:::

::: tip
Helpful tip.
:::

::: warning
Watch out for this.
:::

::: danger
Dangerous operation!
:::
```

**Output**

::: info
Informational note.
:::

::: tip
Helpful tip.
:::

::: warning
Watch out for this.
:::

::: danger
Dangerous operation!
:::

### Custom title

```md
::: warning Be careful!
Custom title replaces the default label.
:::
```

**Output**

::: warning Be careful!
Custom title replaces the default label.
:::

### Details (collapsible)

```md
::: details Click to expand
Hidden content revealed on click.
:::
```

**Output**

::: details Click to expand
Hidden content revealed on click.
:::

### GitHub-style alerts

The `> [!TYPE]` blockquote syntax is also supported:

```md
> [!NOTE]
> Useful information.

> [!TIP]
> Pro tip.

> [!IMPORTANT]
> Key point.

> [!WARNING]
> Be careful.

> [!CAUTION]
> Dangerous action.
```

**Output**

> [!NOTE]
> Useful information.

> [!TIP]
> Pro tip.

> [!IMPORTANT]
> Key point.

> [!WARNING]
> Be careful.

> [!CAUTION]
> Dangerous action.


## Code blocks

### Syntax highlighting

Code blocks are highlighted at build time by [Shiki](https://shiki.style) using
the `github-dark` theme:

````md
```javascript
const greeting = 'Hello, Greg!';
console.log(greeting);
```
````

**Output**

```javascript
const greeting = 'Hello, Greg!';
console.log(greeting);
```

Supported languages: `javascript`, `typescript`, `bash`, `json`, `html`, `css`,
`yaml`, `markdown`, `svelte`, `txt`. Additional languages can be added in
`svelte.config.js`.

Language aliases are resolved automatically:

| Alias | Resolved |
| ----- | -------- |
| `js`  | `javascript` |
| `ts`  | `typescript` |
| `sh`, `shell`, `zsh` | `bash` |
| `yml` | `yaml` |
| `md`  | `markdown` |

### Code block title

Add a `[Title]` annotation in the language line:

````md
```js [example.js]
export const answer = 42;
```
````

**Output**

```js [example.js]
export const answer = 42;
```

The title is displayed above the code block.


## Code groups

Group multiple code blocks into a tabbed interface:

````md
::: code-group

```sh [npm]
npm install
```

```sh [pnpm]
pnpm install
```

```sh [yarn]
yarn install
```

:::
````

**Output**

::: code-group

```sh [npm]
npm install
```

```sh [pnpm]
pnpm install
```

```sh [yarn]
yarn install
```

:::

Tab labels are inferred from code block titles (`[label]`), or from the language
name when no title is set.

Explicit label override:

````md
::: code-group labels=[Option A, Option B]

```js
// option A
```

```ts
// option B
```

:::
````

**Output**

::: code-group labels=[Option A, Option B]

```js
// option A
```

```ts
// option B
```

:::


## Including external files

### Code snippets — `<<<`

Import an external source file as a code block:

```md
<<< @/snippets/example.js
```

The `@` alias resolves to the project root. The language is detected from the
file extension.

**Region** — import only a named region of the file (marked with `#region name` /
`#endregion` comments):

```md
<<< @/snippets/example.js#setup
```

**Range** — import specific line numbers:

```md
<<< @/snippets/example.js{5-10}
```

**Title override:**

```md
<<< @/snippets/example.js [my-example.js]
```

### File include — `<!--@include:-->`

Include another Markdown file inline:

```md
<!--@include: ./__shared-warning.md-->
```

File `__shared-warning.md` looks like this:

<<< /guide/__shared-warning.md

Output:

<!--@include: ./__shared-warning.md-->


The included file is processed by the full Markdown pipeline. Partial files
(name starts with `__`) are excluded from routing.

The `/` prefix resolves to the `docs/` directory root:

```md
<!--@include: /__partials/note.md-->
```

Output:

<!--@include: /__partials/note.md-->


## Math equations

Math rendering via MathJax SVG must be enabled in `svelte.config.js`:

```js
// svelte.config.js  ─  Greg config block
const gregConfig = {
  markdown: {
    math: true,   // enable $…$ / $$…$$ rendering
  },
};
```

**Inline math:**

```md
The quadratic formula is $x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$.
```

**Output** *(requires `math: true` in `svelte.config.js`)*

The quadratic formula is $x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$.

**Display math:**

```md
$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$
```

**Output** *(requires `math: true` in `svelte.config.js`)*

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$


## Inline attributes on links and images

Attach HTML attributes to links and images with a `{…}` block immediately after
the closing `)`:

```md
[Open in new tab](https://example.com){target="_blank" rel="noopener"}

[styled link](./routing){class="my-link"}
```

**Output**

[Open in new tab](https://example.com){target="_blank" rel="noopener"}

[styled link](./routing){class="my-link"}


## Svelte components

Built-in components (`Badge`, `Button`, `Image`, `Link`) can be used directly in
`.md` files without any import statement:

```md
### Stability <Badge type="tip" text="stable" />

The API is considered stable as of v1.0.

<Badge type="warning">experimental</Badge>
```

**Output**

**Stability** <Badge type="tip" text="stable" />

The API is considered stable as of v1.0.

<Badge type="warning">experimental</Badge>

::: info .svx files
In `.svx` files you can also write arbitrary Svelte markup with full reactivity
(`$state`, event handlers, etc.). In runtime `.md` files only the registered
built-in components are hydrated.
:::

## Mermaid diagrams

Greg supports all kinds of Mermaid diagrams.

<<< @/snippets/mermaid-sequence.md

Output:

<!--@include: @/snippets/mermaid-sequence.md-->
