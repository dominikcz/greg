---
title: Routing
order: 3
---

# Routing

## Routing oparty o pliki

Greg używa routingu opartego o pliki. Każdy `.md` w `docs/` staje się stroną pod odpowiadającą ścieżką URL:

```
docs/index.md                 ->  /docs
docs/guide/getting-started.md ->  /docs/guide/getting-started
docs/reference/api.md         ->  /docs/reference/api
```

Plik `index.md` mapuje się na URL katalogu nadrzędnego:

```
docs/guide/index.md  ->  /docs/guide
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
[link](./page.md)    ->  /docs/.../page
[link](./page.html)  ->  /docs/.../page
```

Linki zewnętrzne (`http://`, `https://`, `//` itd.) są otwierane normalnie
przez przeglądarkę.

Jeśli link Markdown (albo HTML anchor) ma jawny `target`, Greg go respektuje.

## `rootPath`

Prop `rootPath` w `<MarkdownDocs>` wskazuje gdzie żyją dokumenty. Domyślnie to `/docs`.

```svelte
<MarkdownDocs rootPath="/documentation" version="2.0.0" />
```

Wtyczki Vite powinny używać tego samego `rootPath`.

```js
// vite.config.js
vitePluginSearchIndex({ docsDir: 'documentation', rootPath: '/documentation' })
```

## Zachowanie 404

Gdy URL nie pasuje do żadnego pliku Markdown, renderowany jest fallback z `children`:

```svelte
<MarkdownDocs rootPath="/docs" version="1.0.0">
  {#snippet children()}
    <p>Wybierz temat z sidebaru.</p>
  {/snippet}
</MarkdownDocs>
```
