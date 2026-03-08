---
title: Kontenery niestandardowe
order: 3
---

# Kontenery niestandardowe

## Domyślne typy

```md
::: info
Informacyjna notatka.
:::

::: tip
Przydatna wskazówka.
:::

::: warning
Uwaga na to.
:::

::: danger
Niebezpieczna operacja!
:::
```

Output:

::: info
Informacyjna notatka.
:::

::: tip
Przydatna wskazówka.
:::

::: warning
Uwaga na to.
:::

::: danger
Niebezpieczna operacja!
:::

## Własny tytuł

```md
::: warning Uważaj!
Własny tytuł zastępuje domyślną etykietę.
:::
```

Output:

::: warning Uważaj!
Własny tytuł zastępuje domyślną etykietę.
:::

## Details (zwijane)

```md
::: details Kliknij, aby rozwinąć
Ukryta treść.
:::
```

Output:

::: details Kliknij, aby rozwinąć
Ukryta treść.
:::

## Alerty w stylu GitHub

Obsługiwane są również bloki `> [!TYPE]`:

```md
> [!NOTE]
> Przydatna informacja.

> [!TIP]
> Wskazówka.

> [!IMPORTANT]
> Kluczowa kwestia.

> [!WARNING]
> Zachowaj ostrożność.

> [!CAUTION]
> Ryzykowna akcja.
```

Output:

> [!NOTE]
> Przydatna informacja.

> [!TIP]
> Wskazówka.

> [!IMPORTANT]
> Kluczowa kwestia.

> [!WARNING]
> Zachowaj ostrożność.

> [!CAUTION]
> Ryzykowna akcja.
