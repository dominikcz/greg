---
title: Wzory matematyczne
order: 6
---

# Wzory matematyczne

Renderowanie matematyki przez MathJax SVG trzeba włączyć w `svelte.config.js`:

```js
const gregConfig = {
  markdown: {
    math: true,
  },
};
```

Output:

```js
const gregConfig = {
  markdown: {
    math: true,
  },
};
```

## Wzory inline

```md
Wzór kwadratowy: $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$.
```

Output:

Wymaga `math: true`.

Wzór kwadratowy: $x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$.

## Wzory blokowe

```md
$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$
```

Output:

Wymaga `math: true`.

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$
