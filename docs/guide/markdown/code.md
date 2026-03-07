---
title: Code blocks and groups
order: 5
---

# Code blocks and groups

For syntax highlighting, line focus/diff markers and VitePress-style
compatibility notes, see [Syntax highlighting](./syntax-highlighting).

## Code block title

Add a `[Title]` annotation in the language line:

````md
```js [example.js]
export const answer = 42;
```
````

Output:

```js [example.js]
export const answer = 42;
```

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

Output:

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

Output:

::: code-group labels=[Option A, Option B]

```js
// option A
```

```ts
// option B
```

:::
