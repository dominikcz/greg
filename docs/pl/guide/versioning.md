---
title: Wersjonowanie
order: 4
---

## Przeglad

Greg obsluguje build wielu wersji dokumentacji w dwoch strategiach zrodel:

- `branches` (domyslnie): czyta dokumentacje z branchy/refow Git
- `folders`: czyta dokumentacje z lokalnych katalogow wersji

Uruchom build:

```sh
greg build:versions
```

Wynik:

- zbudowane strony w `dist/versions/<version>`
- manifest w `dist/versions/versions.json`

## Konfiguracja

```js
/** @type {import('@dominikcz/greg').GregConfig} */
export default {
  rootPath: '/docs',
  versioning: {
    strategy: 'branches',
    default: 'latest',
    pathPrefix: '/versions',
    aliases: {
      latest: '2.1',
      stable: '2.0'
    },
    branches: [
      { version: '2.1', branch: 'main', title: '2.1' },
      { version: '2.0', branch: 'release/2.0', title: '2.0' }
    ]
  }
}
```

Strategia folderowa:

```js
versioning: {
  strategy: 'folders',
  default: 'latest',
  folders: [
    { version: '2.1', dir: './docs', title: '2.1' },
    { version: '2.0', dir: './versions/2.0/docs', title: '2.0' }
  ]
}
```

## Komponenty UI

Gdy manifest jest dostepny, Greg renderuje automatycznie dwa elementy:

- przelacznik wersji w headerze
- baner starszej wersji, gdy aktualna wersja rozni sie od domyslnej

Teksty mozesz konfigurowac przez `versioning.ui`:

```js
versioning: {
  // ...
  ui: {
    versionMenuLabel: 'Wersja',
    manifestUnavailableText: 'Przelacznik wersji niedostepny',
    outdatedVersionMessage: 'Czytasz starsza wersje ({current}). Zalecana: {default}.',
    outdatedVersionActionLabel: 'Przejdz do najnowszej'
  }
}
```

Obslugiwane placeholdery w `outdatedVersionMessage`:

- `{current}`
- `{default}`

## Fallback

Jesli `versions.json` nie da sie wczytac:

- Greg ukrywa przelacznik wersji
- Greg pokazuje `manifestUnavailableText` w headerze

Dzieki temu dokumentacja nadal dziala poprawnie nawet przy pojedynczej wersji.

## Ksztalt manifestu

```json
{
  "default": "latest",
  "versions": [
    { "version": "2.1", "title": "2.1", "path": "/versions/2.1/" },
    { "version": "2.0", "title": "2.0", "path": "/versions/2.0/" }
  ],
  "aliases": {
    "latest": "2.1",
    "stable": "2.0"
  }
}
```

`aliases` to mapa (`alias -> version`), wiec cele aliasow sa jednoznaczne.
