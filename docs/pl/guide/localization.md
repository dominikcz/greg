---
title: Lokalizacja
order: 3
---

## Lokalizacja

Greg obsługuje konfigurację locale przez `locales` w
`greg.config.js`. Każdy język może mieć własne etykiety, nawigację, sidebar
i przetłumaczone teksty UI w `themeConfig`.

## Podstawowa mapa locale

```js
export default {
  rootPath: '/docs',
  locales: {
    '/': {
      lang: 'en-US',
      label: 'English',
      title: 'Greg',
      themeConfig: {
        nav: [{ text: 'Guide', link: '/docs/guide' }],
        sidebar: [{ text: 'Guide', auto: '/guide' }],
      },
    },
    '/pl/': {
      lang: 'pl-PL',
      label: 'Polski',
      title: 'Greg',
      themeConfig: {
        nav: [{ text: 'Przewodnik', link: '/docs/pl/guide' }],
        sidebar: [{ text: 'Przewodnik', auto: '/guide' }],
      },
    },
  },
};
```

Dla `rootPath: '/docs'` mapowanie URL locale wygląda tak:

- `'/'` -> `/docs`
- `'/pl/'` -> `/docs/pl`

## Foldery locale i trasy

Przyjęta konwencja to trzymanie tłumaczeń w folderze prefiksowanym locale,
na przykład:

```text
docs/
  guide/getting-started.md
  pl/guide/getting-started.md
```

To daje:

- EN: `/docs/guide/getting-started`
- PL: `/docs/pl/guide/getting-started`

W przetłumaczonych stronach używaj linków wewnętrznych dla danego locale,
żeby uniknąć przypadkowych ścieżek `/pl/pl/...`.

## Osobny katalog dla każdego locale

Możesz też trzymać każdy język w osobnym katalogu najwyższego poziomu.

```js
export default {
  rootPath: '/docs',
  locales: {
    '/en/': {
      lang: 'en-US',
      label: 'English',
      themeConfig: {
        nav: [{ text: 'Guide', link: '/docs/en/guide' }],
      },
    },
    '/pl/': {
      lang: 'pl-PL',
      label: 'Polski',
      themeConfig: {
        nav: [{ text: 'Przewodnik', link: '/docs/pl/guide' }],
      },
    },
  },
};
```

Rekomendowana struktura treści:

```text
docs/
  en/
    guide/
    reference/
  pl/
    guide/
    reference/
```

W efekcie dostajesz adresy `/docs/en/...` i `/docs/pl/...` z całkowicie
rozdzielonymi drzewami treści dla każdego języka.

### Domyślne lądowanie na locale

Gdy używasz wyłącznie namespacowanych locale (np. `'/en/'` i `'/pl/'`, bez
locale `'/'`), Greg automatycznie przekierowuje:

- `/` -> root pierwszego locale (np. `/docs/en`)
- `/docs` (lub Twój `rootPath`) -> root pierwszego locale

To oznacza, że kolejność wpisów w `locales` wyznacza domyślny język.

Mechanizm krok po kroku:

1. Greg sprawdza, czy istnieje locale `'/'`.
2. Jeśli istnieje, redirect nie jest wykonywany.
3. Jeśli nie istnieje i użytkownik wejdzie na `/` albo bazowy root docs,
   Greg nawiguje do roota pierwszego wpisu z `locales`.

Przykład:

```js
locales: {
  '/en/': { label: 'English' },
  '/pl/': { label: 'Polski' },
}
```

W tym układzie domyślnym językiem lądowania będzie English, bo `'/en/'` jest
pierwsze.

## Co trafia do `themeConfig`

Każdy locale może tłumaczyć standardowe elementy UI dokumentacji:

- `nav`, `sidebar`, `outline`
- `docFooter.prev`, `docFooter.next`
- etykiety języka i dostępności (`langMenuLabel`, `skipToContentLabel`, ...)
- etykiety wyszukiwania przez `themeConfig.search.locales`

Przykład:

```js
themeConfig: {
  langMenuLabel: 'Zmień język',
  returnToTopLabel: 'Wróć do góry',
  docFooter: { prev: 'Poprzednia strona', next: 'Następna strona' },
  search: {
    locales: {
      '/pl/': {
        button: { buttonText: 'Szukaj...', buttonAriaLabel: 'Wyszukiwarka' },
        modal: {
          searchBox: { placeholder: 'Szukaj w dokumentacji...' },
          noResultsText: 'Brak wyników dla',
          loadingScreen: { loadingText: 'Wczytywanie indeksu...' },
          errorScreen: { titleText: 'Nie udało się wczytać indeksu wyszukiwania.' },
          footer: { navigateText: 'nawiguj', selectText: 'otwórz', closeText: 'zamknij' },
        },
      },
    },
  },
}
```

## Wyszukiwanie a lokalizacja

Zachowanie wyszukiwania konfigurujesz globalnie w top-level `search`, a teksty
UI wyszukiwarki zostają per-locale w `themeConfig.search.locales`.

```js
export default {
  search: {
    provider: 'server',
    serverUrl: '/api/search',
  },
  locales: {
    '/pl/': {
      themeConfig: {
        search: {
          locales: {
            '/pl/': {
              button: { buttonText: 'Szukaj...' },
              modal: { searchBox: { placeholder: 'Szukaj w dokumentacji...' } },
            },
          },
        },
      },
    },
  },
};
```

Dzięki temu masz jedną konfigurację backendu search i tłumaczenia osobno dla
każdego języka.

## Lokalizacja wersjonowania

Teksty UI wersjonowania (przelacznik wersji i baner starszej wersji)
konfigurujesz globalnie w `versioning.ui`, a per-locale nadpisujesz przez
`versioning.locales`.

```js
versioning: {
  ui: {
    versionMenuLabel: 'Version',
    outdatedVersionActionLabel: 'Go to latest'
  },
  locales: {
    '/pl/': {
      ui: {
        versionMenuLabel: 'Wersja',
        outdatedVersionActionLabel: 'Przejdz do najnowszej'
      }
    }
  }
}
```

Priorytet rozwiazywania tekstow:

1. `versioning.locales[active-locale].ui`
2. `versioning.ui`
3. wartosci domyslne wbudowane w Greg

Jesli `versions.json` nie jest dostepny, Greg pokazuje w headerze lokalizowany
`manifestUnavailableText`.

## Rekomendowany workflow

1. Zacznij od struktury stron EN.
2. Odtwórz te same ścieżki w `docs/pl/...`.
3. Przetłumacz treść stron.
4. Przetłumacz nawigację i etykiety w `themeConfig` locale.
5. Zbuduj projekt i zweryfikuj trasy oraz search dla obu języków.
