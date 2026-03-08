---
title: Outline
---

# Outline (Na tej stronie)

Panel **Outline** jest widoczny po prawej stronie stron dokumentacji. Pokazuje listę nagłówków dla bieżącej strony i pozwala szybko skakać między sekcjami.

## Konfiguracja

```svelte
<!-- h2 + h3 (domyślnie) -->
<MarkdownDocs rootPath="/docs" version="1.0.0" outline={[2, 3]} />

<!-- wszystkie nagłówki -->
<MarkdownDocs rootPath="/docs" version="1.0.0" outline="deep" />

<!-- tylko h2 -->
<MarkdownDocs rootPath="/docs" version="1.0.0" outline={2} />

<!-- wyłącz -->
<MarkdownDocs rootPath="/docs" version="1.0.0" outline={false} />

<!-- własna etykieta + zakres -->
<MarkdownDocs rootPath="/docs" version="1.0.0" outline={{ level: [2, 4], label: 'Spis treści' }} />
```

### Dozwolone wartości

| Wartość            | Efekt |
| ------------------ | ----- |
| `false`            | ukrywa panel Outline |
| `number`           | tylko dany poziom nagłówka |
| `[min, max]`       | zakres poziomów |
| `'deep'`           | to samo co `[2, 6]` |
| `{ level, label }` | obiekt z poziomem i etykietą |

## Scrollspy

Aktywny link Outline aktualizuje się podczas scrollowania. Nagłówek jest aktywny, gdy znajdzie się w odległości ok. 72 px od górnej krawędzi treści.

## Inline `[[toc]]`

Możesz też dodać statyczny TOC wewnątrz treści:

```md
## Spis treści

[[toc]]
```

Domyślnie obejmuje `h2` i `h3`.

## Zmienne CSS

| Zmienna                | Domyślna (light) | Opis |
| ---------------------- | ---------------- | ---- |
| `--greg-toc-background`| `transparent`    | tło panelu |
| `--greg-toc-color`     | `#3d3d3d`        | kolor etykiety sekcji |
| `--greg-toc-link-color`| `#4a4a6a`        | kolor linków |
| `--greg-toc-link-hover`| `#646cff`        | hover/active |
