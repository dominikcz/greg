---
title: Niezgodności z VitePress
order: 999
---

Greg jest mocno inspirowany [VitePress](https://vitepress.dev){target="_blank"} i wykorzystuje większość tych samych konwencji Markdown. Ta strona pokazuje tylko różnice i luki.

## Status zgodności

Greg jest zgodny z VitePress na poziomie konfiguracji dla obsługiwanych opcji docs/theme (w tym lokalizacji).

Główne różnice dotyczą API runtime i funkcji platformowych, nie samej konfiguracji.

## Dlaczego Greg jest inny

Greg został zoptymalizowany pod bardzo duże zbiory dokumentacji oraz szybki runtime SPA. Architektura opiera się na preprocessingu metadanych (`virtual:greg-frontmatter`), przewidywalnym generowaniu routingu/sidebaru i trybach wyszukiwania dla dużej liczby stron.

Dlatego nie wszystkie funkcje VitePress są odwzorowane 1:1. To celowe kompromisy.

Więcej:

- [Komponent MarkdownDocs](/reference/markdowndocs)
- [Wyszukiwanie](/reference/search)

## Podsumowanie

| Obszar | Status |
| --- | --- |
| Zgodność konfiguracji | ✅ Konfiguracja w stylu VitePress w `greg.config.js` |
| Zgodność API runtime | ❌ Brak pełnej zgodności (`useData`, `useRouter`, `withBase`, `*.data.*`) |
| Funkcje platformowe | ⚠️ Osobna ścieżka rozwoju (np. sitemap, adaptery SSG, możliwości deploy) |
| Model renderowania | Greg: SPA-first, VitePress: SSG-first |
| Górna nawigacja | ✅ Zgodna konfiguracyjnie; Greg wspiera głębsze zagnieżdżenie menu |
| Model komponentów Markdown | Różny z założenia: Greg używa Svelte, VitePress używa Vue |

## Uwaga dot. deployu

Ponieważ Greg jest SPA-first, serwer powinien przepisywać trasy do `index.html` (zobacz [Deploying](/guide/deploying)).
