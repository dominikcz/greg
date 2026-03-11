---
title: Carbon Ads
---

# Carbon Ads

Greg wspiera [Carbon Ads](https://www.carbonads.net/) natywnie. Po konfiguracji reklama pojawia siÄ™ na dole prawego panelu Outline.

## Konfiguracja

PrzekaĹĽ `carbonAds` do `<MarkdownDocs>`:

```svelte
<MarkdownDocs
  srcDir="/docs"
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
- przy kaĹĽdej nawigacji SPA wywoĹ‚ywane jest `_carbonads.refresh()`,
- gdy `carbonAds` nie jest ustawione, nic nie jest wstrzykiwane.

## Stylowanie

Reklama renderuje siÄ™ w kontenerze `.CarbonAds`. WyglÄ…d moĹĽesz zmieniÄ‡ przez:

```css
:root {
  --greg-carbon-ads-bg-color: #f0f0f4;
}
```
