---
title: Carbon Ads
---

# Carbon Ads

Greg wspiera [Carbon Ads](https://www.carbonads.net/) natywnie. Po konfiguracji reklama pojawia się na dole prawego panelu Outline.

## Konfiguracja

Przekaż `carbonAds` do `<MarkdownDocs>`:

```svelte
<MarkdownDocs
  srcDir="/"
  version="1.0.0"
  carbonAds={{ code: 'CWYD42JW', placement: 'myprojectdev' }}
/>
```

| Opcja       | Typ      | Opis                             |
| ----------- | -------- | -------------------------------- |
| `code`      | `string` | Kod `serve` z Carbon Ads         |
| `placement` | `string` | Nazwa placementu Carbon Ads      |

## Zachowanie

- skrypt Carbon Ads jest dodawany raz w `onMount`,
- przy każdej nawigacji SPA wywoływane jest `_carbonads.refresh()`,
- gdy `carbonAds` nie jest ustawione, nic nie jest wstrzykiwane.

## Stylowanie

Reklama renderuje się w kontenerze `.CarbonAds`. Wygląd możesz zmienić przez:

```css
:root {
  --greg-carbon-ads-bg-color: #f0f0f4;
}
```
