---
title: Svelte components and Mermaid
order: 8
---

# Svelte components and Mermaid

## Svelte components

Built-in components (`Badge`, `Button`, `Image`, `Link`) can be used directly in
`.md` files without any import statement:

```md
### Stability <Badge type="tip" text="stable" />

The API is considered stable as of v1.0.

<Badge type="warning">experimental</Badge>
```

Output:

**Stability** <Badge type="tip" text="stable" />

The API is considered stable as of v1.0.

<Badge type="warning">experimental</Badge>

::: info .svx files
In `.svx` files you can also write arbitrary Svelte markup with full reactivity
(`$state`, event handlers, etc.). In runtime `.md` files only the registered
built-in components are hydrated.
:::

## Mermaid diagrams

Greg supports Mermaid diagrams.

<<< @/snippets/mermaid-sequence.md

Output:

<!--@include: @/snippets/mermaid-sequence.md-->
