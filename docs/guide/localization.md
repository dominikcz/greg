---
title: Localization
order: 3
---

## Localization

Greg supports locale configuration via `locales` in
`greg.config.js`. Each locale can define its own labels, navigation, sidebar,
and translated UI text in `themeConfig`.

## Basic locale map

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

For `srcDir: '/docs'`, locale URL mapping is:

- `'/'` -> `/docs`
- `'/pl/'` -> `/docs/pl`

## Locale folders and routes

By convention, translated files live in a locale-prefixed folder, for example:

```text
docs/
  guide/getting-started.md
  pl/guide/getting-started.md
```

That gives:

- EN: `/docs/guide/getting-started`
- PL: `/docs/pl/guide/getting-started`

Use locale-specific internal links in translated pages to avoid accidental
`/pl/pl/...` paths.

## Separate directory for each locale

You can also place each locale in its own top-level docs directory.

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

Recommended content structure:

```text
docs/
  en/
    guide/
    reference/
  pl/
    guide/
    reference/
```

That gives URLs such as `/docs/en/...` and `/docs/pl/...`, with fully
separated content trees per locale.

### Default locale landing behavior

When you use only namespaced locales (for example `'/en/'` and `'/pl/'`, with
no `'/'` locale), Greg automatically redirects:

- `/` -> first configured locale root (for example `/docs/en`)
- `/docs` (or your configured `srcDir`) -> first configured locale root

The first entry order in `locales` is therefore treated as the default locale.

How it works:

1. Greg checks whether a root locale `'/'` exists.
2. If it exists, no redirect is applied.
3. If it does not exist, and user opens `/` or base docs root, Greg navigates
   to `locales` first entry root.

Example:

```js
locales: {
  '/en/': { label: 'English' },
  '/pl/': { label: 'Polski' },
}
```

In this setup the default landing locale is English, because `'/en/'` is first.

## What goes into `themeConfig`

Each locale can translate standard docs chrome and navigation text:

- `nav`, `sidebar`, `outline`
- `docFooter.prev`, `docFooter.next`
- language and accessibility labels (`langMenuLabel`, `skipToContentLabel`, ...)
- search UI labels via `themeConfig.search.locales`

Example:

```js
themeConfig: {
  langMenuLabel: 'Zmien jezyk',
  returnToTopLabel: 'Wroc do gory',
  docFooter: { prev: 'Poprzednia strona', next: 'Nastepna strona' },
  search: {
    locales: {
      '/pl/': {
        button: { buttonText: 'Szukaj...', buttonAriaLabel: 'Wyszukiwarka' },
        modal: {
          searchBox: { placeholder: 'Szukaj w dokumentacji...' },
          noResultsText: 'Brak wynikow dla',
          loadingScreen: { loadingText: 'Wczytywanie indeksu...' },
          errorScreen: { titleText: 'Nie udalo sie wczytac indeksu wyszukiwania.' },
          footer: { navigateText: 'nawiguj', selectText: 'otworz', closeText: 'zamknij' },
        },
      },
    },
  },
}
```

## Search configuration in localized docs

Search behavior is configured in top-level `search`, while locale-specific UI
texts stay in each locale `themeConfig.search.locales`.

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

This keeps one global search backend configuration and per-locale UI copy.

## Versioning localization

Versioning UI text (version switcher and outdated notice) is configured in
`versioning.ui`, and can be overridden per locale using `versioning.locales`.

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

Resolution order:

1. `versioning.locales[active-locale].ui`
2. `versioning.ui`
3. built-in defaults

If `versions.json` is unavailable, Greg shows the locale-resolved
`manifestUnavailableText` in the header.

## Recommended workflow

1. Start from English docs structure.
2. Mirror file paths in `docs/pl/...`.
3. Translate page content.
4. Translate navigation and labels in locale `themeConfig`.
5. Build and verify routes/search for both locales.
