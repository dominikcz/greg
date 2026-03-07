---
title: Code blocks and groups
order: 4
---

# Code blocks and groups

## Syntax highlighting

Code blocks are highlighted at build time by [Shiki](https://shiki.style) using
the `github-dark` theme:

````md
```javascript
const greeting = 'Hello, Greg!';
console.log(greeting);
```
````

Output:

```javascript
const greeting = 'Hello, Greg!';
console.log(greeting);
```

Supported languages include `javascript`, `typescript`, `bash`, `json`, `html`,
`css`, `yaml`, `markdown`, `svelte`, `txt`.

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
