---
title: Routing
order: 3
---

# Routing

## Routing oparty o pliki

Greg używa routingu opartego o pliki. Każdy `.md` w `docs/` staje się stroną pod odpowiadającą ścieżką URL:

```
docs/index.md                 ->  /
docs/guide/getting-started.md ->  /guide/getting-started
docs/reference/api.md         ->  /reference/api
```

Plik `index.md` mapuje się na URL katalogu nadrzędnego:

```
docs/guide/index.md  ->  /guide
```

## Pliki partial

Każdy plik zaczynający się od `__` jest traktowany jako partial: nie trafia do routingu ani sidebaru, ale można go dołączać dyrektywą `<!--@include:-->`.

```
docs/guide/__shared-warning.md  <-  nie jest stroną, tylko plikiem do wstawiania
```

## Nawigacja sidebar

Sidebar jest generowany automatycznie ze struktury katalogów i plików.

Zasady:
- katalogi stają się zwijanymi sekcjami,
- pliki stają się linkami,
- nazwy są automatycznie kapitalizowane,
- `index.md` podpina się do węzła katalogu,
- główny `docs/index.md` jest ukryty w sidebarze.

### Targety linków sidebaru

Dla ręcznych wpisów w `greg.config.js` link respektuje `target`:

- domyślnie `_self`
- `target: '_blank'` otwiera nową kartę

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

### Kolejność

Elementy sortują się według `order` z frontmatter. Mniejsze wartości są wyżej.

Elementy bez `order` trafiają za elementy posortowane. Przy tym samym `order`
najpierw są katalogi, potem strony, a następnie sortowanie alfabetyczne po etykiecie.

```yaml
---
title: Getting Started
order: 1
---
```

Dla katalogów wykorzystywane jest `order` z ich `index.md`.

```yaml
# docs/guide/index.md
---
title: Guide
order: 2
---
```

## Nawigacja SPA

Greg to SPA, więc przejścia między stronami nie przeładowują całej strony.

```md
[Getting Started](./getting-started)
[API Reference](/reference/api)
[Go to anchor](#section-heading)
[Other page + anchor](./other#some-section)
```

Rozszerzenia `.md` i `.html` są automatycznie usuwane.

```md
[link](./page.md)    ->  /.../page
[link](./page.html)  ->  /.../page
```

Linki zewnętrzne (`http://`, `https://`, `//` itd.) są otwierane normalnie
przez przeglądarkę.

Jeśli link Markdown (albo HTML anchor) ma jawny `target`, Greg go respektuje.

## `srcDir`

Prop `srcDir` w `<MarkdownDocs>` ustawia prefiks URL dokumentacji. Domyślnie to `/`.

```svelte
<MarkdownDocs srcDir="/documentation" version="2.0.0" />
```

Wtyczki Vite powinny używać zgodnego `srcDir` (prefiks URL).

```js
// vite.config.js
vitePluginSearchIndex({ docsDir: 'docs', srcDir: '/documentation' })
```

## Zachowanie 404

Gdy URL nie pasuje do żadnego pliku Markdown, renderowany jest fallback z `children`:

```svelte
<MarkdownDocs srcDir="/" version="1.0.0">
  {#snippet children()}
    <p>Wybierz temat z sidebaru.</p>
  {/snippet}
</MarkdownDocs>
```
