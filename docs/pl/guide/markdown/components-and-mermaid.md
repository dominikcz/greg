---
title: Komponenty Svelte i Mermaid
order: 8
---

# Komponenty Svelte i Mermaid

## Komponenty Svelte

Wbudowanych komponentów (`Badge`, `Button`, `Image`, `Link`) możesz używać bez importów bezpośrednio w `.md`:

```md
### Stabilność <Badge type="tip" text="stabilne" />

API uznajemy za stabilne od v1.0.

<Badge type="warning">eksperymentalne</Badge>
```

Output:

**Stabilność** <Badge type="tip" text="stabilne" />

API uznajemy za stabilne od v1.0.

<Badge type="warning">eksperymentalne</Badge>

::: info .svx files
W `.svx` możesz używać dowolnego markupu Svelte z pełną reaktywnością.
W runtime `.md` hydratują się tylko zarejestrowane komponenty wbudowane.
:::

## Diagramy Mermaid

Greg wspiera diagramy Mermaid.

<<< @/snippets/mermaid-sequence.md

Output:

<!--@include: @/snippets/mermaid-sequence.md-->
