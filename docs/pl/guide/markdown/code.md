---
title: Bloki kodu i grupy
order: 5
---

# Bloki kodu i grupy

Szczegóły dot. podświetlania oraz markerów focus/diff znajdziesz w [Podświetlanie składni](./syntax-highlighting).

## Tytuł bloku kodu

Dodaj adnotację `[Title]` w linii języka:

````md
```js [example.js]
export const answer = 42;
```
````

Output:

```js [example.js]
export const answer = 42;
```

## Grupy kodu

Połącz wiele bloków w zakładki:

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

Nadpisanie etykiet:

````md
::: code-group labels=[Opcja A, Opcja B]

```js
// opcja A
```

```ts
// opcja B
```

:::
````

Output:

::: code-group labels=[Opcja A, Opcja B]

```js
// opcja A
```

```ts
// opcja B
```

:::
