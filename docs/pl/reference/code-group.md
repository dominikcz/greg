---
title: Code Group
---

# Code Group

`Code Group` pozwala pokazać kilka powiązanych snippetów jako zakładki.

Użyj go, gdy chcesz w jednym miejscu pokazać równoważne komendy dla różnych narzędzi albo języków.

## Użycie

Dostępne są dwa style:

- dyrektywa Markdown (`::: code-group ... :::`)
- składnia komponentu (`<CodeGroup ... />`)

### Dyrektywa Markdown

Utwórz kontener `::: code-group` i dodaj po jednym bloku kodu na każdą zakładkę.

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

### Komponent `.svelte`

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

Ten sam interfejs zakładek jak w przykładzie Markdown powyżej.

## Etykiety z bloków kodu

Gdy `labels=[...]` nie jest podane, etykiety są wyciągane z języka lub tytułu bloku.

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

## Klawiatura

- `Left` / `Right`: przejście między zakładkami
- `Home` / `End`: pierwsza/ostatnia zakładka
- `Enter` lub `Space`: aktywacja zakładki
