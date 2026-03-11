---
title: Routing
order: 3
---

# Routing

## Routing oparty o pliki

Greg uĹĽywa routingu opartego o pliki. KaĹĽdy `.md` w `docs/` staje siÄ™ stronÄ… pod odpowiadajÄ…cÄ… Ĺ›cieĹĽkÄ… URL:

```
docs/index.md                 ->  /docs
docs/guide/getting-started.md ->  /docs/guide/getting-started
docs/reference/api.md         ->  /docs/reference/api
```

Plik `index.md` mapuje siÄ™ na URL katalogu nadrzÄ™dnego:

```
docs/guide/index.md  ->  /docs/guide
```

## Pliki partial

KaĹĽdy plik zaczynajÄ…cy siÄ™ od `__` jest traktowany jako partial: nie trafia do routingu ani sidebaru, ale moĹĽna go doĹ‚Ä…czaÄ‡ dyrektywÄ… `<!--@include:-->`.

```
docs/guide/__shared-warning.md  <-  nie jest stronÄ…, tylko plikiem do wstawiania
```

## Nawigacja sidebar

Sidebar jest generowany automatycznie ze struktury katalogĂłw i plikĂłw.

Zasady:
- katalogi stajÄ… siÄ™ zwijanymi sekcjami,
- pliki stajÄ… siÄ™ linkami,
- nazwy sÄ… automatycznie kapitalizowane,
- `index.md` podpina siÄ™ do wÄ™zĹ‚a katalogu,
- gĹ‚Ăłwny `docs/index.md` jest ukryty w sidebarze.

### Targety linkĂłw sidebaru

Dla rÄ™cznych wpisĂłw w `greg.config.js` link respektuje `target`:

- domyĹ›lnie `_self`
- `target: '_blank'` otwiera nowÄ… kartÄ™

```js
sidebar: [
  { text: 'Guide', auto: '/guide' },
  { text: 'GitHub', link: 'https://github.com/dominikcz/greg' },
  {
    text: 'GitHub (new tab)',
    link: 'https://github.com/dominikcz/greg',
    target: '_blank',
    rel: 'noopener noreferrer',
  },
]
```

### KolejnoĹ›Ä‡

Elementy sortujÄ… siÄ™ wedĹ‚ug `order` z frontmatter. Mniejsze wartoĹ›ci sÄ… wyĹĽej.

Elementy bez `order` trafiajÄ… za elementy posortowane. Przy tym samym `order`
najpierw sÄ… katalogi, potem strony, a nastÄ™pnie sortowanie alfabetyczne po etykiecie.

```yaml
---
title: Getting Started
order: 1
---
```

Dla katalogĂłw wykorzystywane jest `order` z ich `index.md`.

```yaml
# docs/guide/index.md
---
title: Guide
order: 2
---
```

## Nawigacja SPA

Greg to SPA, wiÄ™c przejĹ›cia miÄ™dzy stronami nie przeĹ‚adowujÄ… caĹ‚ej strony.

```md
[Getting Started](./getting-started)
[API Reference](/reference/api)
[Go to anchor](#section-heading)
[Other page + anchor](./other#some-section)
```

Rozszerzenia `.md` i `.html` sÄ… automatycznie usuwane.

```md
[link](./page.md)    ->  /docs/.../page
[link](./page.html)  ->  /docs/.../page
```

Linki zewnÄ™trzne (`http://`, `https://`, `//` itd.) sÄ… otwierane normalnie
przez przeglÄ…darkÄ™.

JeĹ›li link Markdown (albo HTML anchor) ma jawny `target`, Greg go respektuje.

## `srcDir`

Prop `srcDir` w `<MarkdownDocs>` wskazuje gdzie ĹĽyjÄ… dokumenty. DomyĹ›lnie to `/docs`.

```svelte
<MarkdownDocs srcDir="/documentation" version="2.0.0" />
```

Wtyczki Vite powinny uĹĽywaÄ‡ tego samego `srcDir`.

```js
// vite.config.js
vitePluginSearchIndex({ docsDir: 'documentation', srcDir: '/documentation' })
```

## Zachowanie 404

Gdy URL nie pasuje do ĹĽadnego pliku Markdown, renderowany jest fallback z `children`:

```svelte
<MarkdownDocs srcDir="/docs" version="1.0.0">
  {#snippet children()}
    <p>Wybierz temat z sidebaru.</p>
  {/snippet}
</MarkdownDocs>
```
