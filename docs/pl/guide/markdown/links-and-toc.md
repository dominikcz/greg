---
title: Linki i TOC
order: 2
---

# Linki i TOC

## Linki wewnętrzne

Linki wewnętrzne działają w trybie SPA bez pełnego przeładowania strony:

```md
[Pierwsze kroki](../getting-started)
[Referencja API](/reference/api)
[Do góry](#)
```

Output:

[Pierwsze kroki](../getting-started)
[Referencja API](/reference/api)
[Do góry](#)

Rozszerzenia `.md` i `.html` są automatycznie usuwane.

## Linki do fragmentów

```md
[Zobacz przykłady](#przyklady)
```

Output:

[Zobacz przykłady](#przyklady)

Kliknięcie kotwicy na tej samej stronie przewija płynnie bez dopisywania historii.

## Linki zewnętrzne

```md
[Strona projektu](https://example.com)
```

Output:

[Strona projektu](https://example.com)

## Spis treści - `[[toc]]`

Wstaw inline TOC w dowolnym miejscu strony:

```md
[[toc]]
```

Output:

[[toc]]

Domyślnie zawiera nagłówki `h2` i `h3`. Alternatywnie możesz używać stałego panelu Outline po prawej stronie.

## Lista flex - `[[ ... ]]`

Użyj `[[ ... ]]`, aby wyrenderować wiele bloków markdown w jednym poziomym,
zawijanym rzędzie. Każda niepusta linia wewnątrz bloku to osobny element flex.

```md
[[
![img A](/some/path/img-a.webp)
![img B](/some/path/img-b.webp)
![img C](/some/path/img-c.webp)
]]
```

Elementy rozdzielaj enterami (nowymi liniami). Składnia z klamrami (`{...}`)
oraz jednolinijkowa składnia z samymi przecinkami (np. `[[One, Two]]`) nie są wspierane.
