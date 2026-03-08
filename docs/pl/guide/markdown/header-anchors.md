---
title: Kotwice nagłówków
order: 1
---

# Kotwice nagłówków

Każdy nagłówek automatycznie otrzymuje `id` oparte na slugu:

```md
## Moja sekcja
```

Output:

## Moja sekcja

W wygenerowanym HTML zobaczysz np. `<h2 id="moja-sekcja">`.

## Własne kotwice

Możesz nadpisać automatyczny slug sufiksem `{#custom-id}`:

```md
## Moja sekcja {#custom-anchor}
```

To pozwala linkować do `#custom-anchor` nawet gdy tekst nagłówka się zmieni.

Output:

## Moja sekcja {#custom-anchor}

[Przejdź do własnej kotwicy](#custom-anchor)
