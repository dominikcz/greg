---
title: Lokalizacja
order: 3
---

## Lokalizacja

Greg obsĹ‚uguje konfiguracjÄ™ locale przez `locales` w
`greg.config.js`. KaĹĽdy jÄ™zyk moĹĽe mieÄ‡ wĹ‚asne etykiety, nawigacjÄ™, sidebar
i przetĹ‚umaczone teksty UI w `themeConfig`.

## Podstawowa mapa locale

```js
export default {
  srcDir: '/docs',
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

Dla `srcDir: '/docs'` mapowanie URL locale wyglÄ…da tak:

- `'/'` -> `/docs`
- `'/pl/'` -> `/docs/pl`

## Foldery locale i trasy

PrzyjÄ™ta konwencja to trzymanie tĹ‚umaczeĹ„ w folderze prefiksowanym locale,
na przykĹ‚ad:

```text
docs/
  guide/getting-started.md
  pl/guide/getting-started.md
```

To daje:

- EN: `/docs/guide/getting-started`
- PL: `/docs/pl/guide/getting-started`

W przetĹ‚umaczonych stronach uĹĽywaj linkĂłw wewnÄ™trznych dla danego locale,
ĹĽeby uniknÄ…Ä‡ przypadkowych Ĺ›cieĹĽek `/pl/pl/...`.

## Osobny katalog dla kaĹĽdego locale

MoĹĽesz teĹĽ trzymaÄ‡ kaĹĽdy jÄ™zyk w osobnym katalogu najwyĹĽszego poziomu.

```js
export default {
  srcDir: '/docs',
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

Rekomendowana struktura treĹ›ci:

```text
docs/
  en/
    guide/
    reference/
  pl/
    guide/
    reference/
```

W efekcie dostajesz adresy `/docs/en/...` i `/docs/pl/...` z caĹ‚kowicie
rozdzielonymi drzewami treĹ›ci dla kaĹĽdego jÄ™zyka.

### DomyĹ›lne lÄ…dowanie na locale

Gdy uĹĽywasz wyĹ‚Ä…cznie namespacowanych locale (np. `'/en/'` i `'/pl/'`, bez
locale `'/'`), Greg automatycznie przekierowuje:

- `/` -> root pierwszego locale (np. `/docs/en`)
- `/docs` (lub TwĂłj `srcDir`) -> root pierwszego locale

To oznacza, ĹĽe kolejnoĹ›Ä‡ wpisĂłw w `locales` wyznacza domyĹ›lny jÄ™zyk.

Mechanizm krok po kroku:

1. Greg sprawdza, czy istnieje locale `'/'`.
2. JeĹ›li istnieje, redirect nie jest wykonywany.
3. JeĹ›li nie istnieje i uĹĽytkownik wejdzie na `/` albo bazowy root docs,
   Greg nawiguje do roota pierwszego wpisu z `locales`.

PrzykĹ‚ad:

```js
locales: {
  '/en/': { label: 'English' },
  '/pl/': { label: 'Polski' },
}
```

W tym ukĹ‚adzie domyĹ›lnym jÄ™zykiem lÄ…dowania bÄ™dzie English, bo `'/en/'` jest
pierwsze.

## Co trafia do `themeConfig`

KaĹĽdy locale moĹĽe tĹ‚umaczyÄ‡ standardowe elementy UI dokumentacji:

- `nav`, `sidebar`, `outline`
- `docFooter.prev`, `docFooter.next`
- etykiety jÄ™zyka i dostÄ™pnoĹ›ci (`langMenuLabel`, `skipToContentLabel`, ...)
- etykiety wyszukiwania przez `themeConfig.search.locales`

PrzykĹ‚ad:

```js
themeConfig: {
  langMenuLabel: 'ZmieĹ„ jÄ™zyk',
  returnToTopLabel: 'WrĂłÄ‡ do gĂłry',
  docFooter: { prev: 'Poprzednia strona', next: 'NastÄ™pna strona' },
  search: {
    locales: {
      '/pl/': {
        button: { buttonText: 'Szukaj...', buttonAriaLabel: 'Wyszukiwarka' },
        modal: {
          searchBox: { placeholder: 'Szukaj w dokumentacji...' },
          noResultsText: 'Brak wynikĂłw dla',
          loadingScreen: { loadingText: 'Wczytywanie indeksu...' },
          errorScreen: { titleText: 'Nie udaĹ‚o siÄ™ wczytaÄ‡ indeksu wyszukiwania.' },
          footer: { navigateText: 'nawiguj', selectText: 'otwĂłrz', closeText: 'zamknij' },
        },
      },
    },
  },
}
```

## Wyszukiwanie a lokalizacja

Zachowanie wyszukiwania konfigurujesz globalnie w top-level `search`, a teksty
UI wyszukiwarki zostajÄ… per-locale w `themeConfig.search.locales`.

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

DziÄ™ki temu masz jednÄ… konfiguracjÄ™ backendu search i tĹ‚umaczenia osobno dla
kaĹĽdego jÄ™zyka.

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
2. OdtwĂłrz te same Ĺ›cieĹĽki w `docs/pl/...`.
3. PrzetĹ‚umacz treĹ›Ä‡ stron.
4. PrzetĹ‚umacz nawigacjÄ™ i etykiety w `themeConfig` locale.
5. Zbuduj projekt i zweryfikuj trasy oraz search dla obu jÄ™zykĂłw.
