---
title: Math equations
order: 6
---

# Math equations

Math rendering via MathJax SVG must be enabled in `svelte.config.js`:

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

## Inline math

```md
The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$.
```

Output:

Requires `math: true`.

The quadratic formula is $x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$.

## Display math

```md
$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$
```

Output:

Requires `math: true`.

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$
