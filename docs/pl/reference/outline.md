---
title: Outline
---

# Outline (Na tej stronie)

Panel **Outline** jest widoczny po prawej stronie stron dokumentacji. Pokazuje listÄ™ nagĹ‚ĂłwkĂłw dla bieĹĽÄ…cej strony i pozwala szybko skakaÄ‡ miÄ™dzy sekcjami.

## Konfiguracja

```svelte
<!-- h2 + h3 (domyĹ›lnie) -->
<MarkdownDocs srcDir="/docs" version="1.0.0" outline={[2, 3]} />

<!-- wszystkie nagĹ‚Ăłwki -->
<MarkdownDocs srcDir="/docs" version="1.0.0" outline="deep" />

<!-- tylko h2 -->
<MarkdownDocs srcDir="/docs" version="1.0.0" outline={2} />

<!-- wyĹ‚Ä…cz -->
<MarkdownDocs srcDir="/docs" version="1.0.0" outline={false} />

<!-- wĹ‚asna etykieta + zakres -->
<MarkdownDocs srcDir="/docs" version="1.0.0" outline={{ level: [2, 4], label: 'Spis treĹ›ci' }} />
```

### Dozwolone wartoĹ›ci

| WartoĹ›Ä‡            | Efekt |
| ------------------ | ----- |
| `false`            | ukrywa panel Outline |
| `number`           | tylko dany poziom nagĹ‚Ăłwka |
| `[min, max]`       | zakres poziomĂłw |
| `'deep'`           | to samo co `[2, 6]` |
| `{ level, label }` | obiekt z poziomem i etykietÄ… |

## Scrollspy

Aktywny link Outline aktualizuje siÄ™ podczas scrollowania. NagĹ‚Ăłwek jest aktywny, gdy znajdzie siÄ™ w odlegĹ‚oĹ›ci ok. 72 px od gĂłrnej krawÄ™dzi treĹ›ci.

## Inline `[[toc]]`

MoĹĽesz teĹĽ dodaÄ‡ statyczny TOC wewnÄ…trz treĹ›ci:

```md
## Spis treĹ›ci

[[toc]]
```

DomyĹ›lnie obejmuje `h2` i `h3`.

## Zmienne CSS

| Zmienna                | DomyĹ›lna (light) | Opis |
| ---------------------- | ---------------- | ---- |
| `--greg-toc-background`| `transparent`    | tĹ‚o panelu |
| `--greg-toc-color`     | `#3d3d3d`        | kolor etykiety sekcji |
| `--greg-toc-link-color`| `#4a4a6a`        | kolor linkĂłw |
| `--greg-toc-link-hover`| `#646cff`        | hover/active |
