---
title: Custom containers
order: 3
---

# Custom containers

## Default types

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

Output:

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

## Custom title

```md
::: warning Be careful!
Custom title replaces the default label.
:::
```

Output:

::: warning Be careful!
Custom title replaces the default label.
:::

## Details (collapsible)

```md
::: details Click to expand
Hidden content revealed on click.
:::
```

Output:

::: details Click to expand
Hidden content revealed on click.
:::

## GitHub-style alerts

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

Output:

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
