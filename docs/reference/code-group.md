---
title: Code Group
---

# Code Group

`Code Group` lets you present multiple related code snippets as tabs.
Use it when you want to show equivalent commands for different tools
or languages in one compact block.

## Usage

`Code Group` supports two authoring styles:

- Markdown directive syntax (`::: code-group ... :::`)
- Component-tag syntax (`<CodeGroup ... />`)

### Markdown directive syntax

Write a `::: code-group` container and include one code block per tab.

````md
::: code-group labels=[npm, pnpm, yarn]

```bash
npm i @dominikcz/greg
```

```bash
pnpm add @dominikcz/greg
```

```bash
yarn add @dominikcz/greg
```

:::
````

**Output:**

::: code-group labels=[npm, pnpm, yarn]

```bash
npm i @dominikcz/greg
```

```bash
pnpm add @dominikcz/greg
```

```bash
yarn add @dominikcz/greg
```

:::

### Component-tag syntax

When writing `.svelte` pages/components directly, you can render tabs with
the `CodeGroup` component.

```svelte
<script>
  import CodeGroup from '$components/CodeGroup.svelte';

  const tabs = ['npm', 'pnpm'];
  const blocks = [
    `<pre class="shiki"><code>npm i @dominikcz/greg</code></pre>`,
    `<pre class="shiki"><code>pnpm add @dominikcz/greg</code></pre>`,
  ];
</script>

<CodeGroup {tabs} {blocks} initialActive={0} />
```

**Output:**

Equivalent tabbed UI as in the Markdown directive example above.

## Labels inferred from code blocks

When `labels=[...]` is omitted, labels are inferred from each block's language
or code title.

````md
::: code-group

```js [config.js]
export default {
  docsDir: 'docs',
};
```

```ts [config.ts]
export default {
  docsDir: 'docs',
} as const;
```

:::
````

**Output:**

::: code-group

```js [config.js]
export default {
  docsDir: 'docs',
};
```

```ts [config.ts]
export default {
  docsDir: 'docs',
} as const;
```

:::

## Keyboard interaction

- `Left` / `Right`: move between tabs
- `Home` / `End`: jump to first/last tab
- `Enter` or `Space`: activate focused tab
