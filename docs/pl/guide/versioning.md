---
title: Wersjonowanie
order: 4
---

## Przeglad

Greg obsluguje build wielu wersji dokumentacji w dwoch strategiach zrodel:

- `branches` (domyslnie): czyta dokumentacje z branchy/refow Git
- `folders`: czyta dokumentacje z lokalnych katalogow wersji

Obie strategie daja ten sam koncowy efekt (`<outDir>/__versions/<version>` + `versions.json`).
Po buildzie Greg synchronizuje tez wersje domyslna do `dist/`, dzieki czemu root output nadaje sie bezposrednio do hostowania.
Roznia sie tym, skad Greg pobiera zrodla i jak latwo odtworzyc build 1:1.

`branches` jest podejsciem opartym o commity: kazda wersja jest mapowana na ref Git, a potem na SHA.
To najczesciej najlepszy wybor dla wersji wydaniowych, bo wynik mozna odtworzyc z historii repozytorium, a cache branchy przyspiesza kolejne uruchomienia.

`folders` jest podejsciem opartym o aktualny workspace: kazda wersja czytana jest z katalogu w drzewie roboczym.
To dobre podejscie, gdy utrzymujesz wiele drzew docs obok siebie i chcesz szybciej iterowac lokalnie bez pracy na refach Git.

### Filozofia strategii, plusy i minusy

`branches`:

- Plusy:
  - powtarzalnosc builda przez ref -> commit SHA
  - dobre dopasowanie do workflow wydaniowego (`main`, `release/*`, tagi)
  - reuse cache przy ponownym buildzie tego samego SHA
- Minusy:
  - wymaga poprawnych refow i zawartosci docs w tych refach
  - wiecej elementow po drodze (snapshot + cache)

`folders`:

- Plusy:
  - prosty model: builduje dokladnie to, co jest teraz w katalogach
  - bardzo wygodne do lokalnego developmentu i migracji
  - brak zaleznosci od rozwiazywania refow Git
- Minusy:
  - wynik zalezy od biezacego stanu workspace (mniejsza powtarzalnosc)
  - brak cache opartego o SHA commitow

Kiedy co wybrac:

- wybierz `branches`, gdy wersje docs maja byc zwiazane z historia repo i refami wydaniowymi
- wybierz `folders`, gdy wersje docs utrzymujesz jako osobne katalogi w jednym checkout

## Zasady

1. Konfiguracje wersjonowania wpisujesz w `greg.config.js` (lub `greg.config.ts`) pod kluczem `versioning`.
2. Wybierasz jeden tryb przez `versioning.strategy`.
3. Definiujesz mapowanie wersji na zrodlo:
   - `branches[]`: `version` + `branch`
   - `folders[]`: `version` + `dir`
4. Ustawiasz `default` oraz opcjonalnie `aliases`.

## Poradnik: tryb `branches`

Uzyj tego trybu, gdy kazda wersja dokumentacji ma byc budowana z brancha/refa Git.

Ustaw:

1. `strategy: "branches"`
2. `branches[]` z polami `version`, `branch`, opcjonalnie `docsDir`, `title`
3. `default` i opcjonalnie `aliases`

Przyklad:

```js [greg.config.js]
export default {
  versioning: {
    strategy: "branches",
    default: "latest",
    aliases: {
      latest: "2.1",
      stable: "2.0"
    },
    branches: [
      { version: "2.1", branch: "main", title: "2.1" },
      { version: "2.0", branch: "release/2.0", title: "2.0" }
    ]
  }
};
```

Jak dziala wersjonowanie w tym trybie:

1. Dla kazdego wpisu `branches[]` Greg rozwiazuje `branch` do commit SHA.
2. Greg tworzy albo reuse'uje snapshot docs dla tego SHA w `.greg/version-cache/sources/...`.
3. Greg uruchamia build dla snapshotu (albo reuse'uje gotowy cache builda tego samego SHA).
4. Greg kopiuje finalny output do `<outDir>/__versions/<version>`.
5. Po zbudowaniu wszystkich wersji Greg zapisuje `<outDir>/__versions/versions.json`.
6. Greg synchronizuje output wersji domyslnej do `dist/`.

Wazne: Greg nie przelacza branchy w Twoim working tree. Czyta pliki bezposrednio z obiektow Git.

## Poradnik: tryb `folders`

Uzyj tego trybu, gdy kazda wersja dokumentacji ma pochodzic z katalogu w drzewie roboczym.

Ustaw:

1. `strategy: "folders"`
2. `folders[]` z polami `version`, `dir`, opcjonalnie `srcDir`, `title`
3. `default` i opcjonalnie `aliases`

Przyklad:

```js [greg.config.js]
export default {
  versioning: {
    strategy: "folders",
    default: "latest",
    aliases: {
      latest: "2.1",
      stable: "2.0"
    },
    folders: [
      { version: "2.1", dir: "./docs", title: "2.1" },
      { version: "2.0", dir: "./versions/2.0/docs", title: "2.0" }
    ]
  }
};
```

Jak dziala wersjonowanie w tym trybie:

1. Dla kazdego wpisu `folders[]` Greg rozwiazuje `dir` do sciezki absolutnej.
2. Greg uruchamia pelny build Vite z tym katalogiem jako zrodlem docs.
3. Tymczasowy output builda jest kopiowany do `<outDir>/__versions/<version>`.
4. Po przetworzeniu wszystkich wersji Greg zapisuje `<outDir>/__versions/versions.json`.
5. Greg synchronizuje output wersji domyslnej do `dist/`.

Wazne: w trybie `folders` kazda skonfigurowana wersja budowana jest od nowa z biezacych plikow lokalnych.

## Komendy

Polecenia uruchamiaj dopiero po skonfigurowaniu `versioning`.

Zalecane polecenie:

```sh
greg build
```

Jesli `versioning` jest skonfigurowane, `greg build` automatycznie uruchamia build wielu wersji.
To zabezpiecza przed przypadkowym nadpisaniem wersji przez pojedynczy build.

Domyslki zgodne z VitePress w tym przeplywie:

- top-level `greg.config.* > outDir` steruje katalogiem wyjscia wersji (`<outDir>/__versions`)
- top-level `greg.config.* > base` sluzy do wyliczenia domyslnego prefixu URL manifestu

Wymuszenie pojedynczego builda Vite (nawet przy skonfigurowanym versioning):

```sh
greg build --single
```

Wynik:

- zbudowane strony w `<outDir>/__versions/<version>` (domyslnie `dist/__versions/<version>`)
- manifest w `<outDir>/__versions/versions.json`
- wersja domyslna skopiowana do `dist/` pod bezposredni hosting

Co dokladnie dzieje sie, gdy Greg uruchamia build wielu wersji (`greg build` z versioning):

1. Greg laduje `greg.config.js` lub `greg.config.ts` i waliduje schemat `versioning`.
2. Greg wybiera strategie (`versioning.strategy`, domyslnie `branches`).
3. Greg przygotowuje katalogi robocze: katalog wyjsciowy (domyslnie `<outDir>/__versions`, gdzie `outDir` domyslnie to `dist`), katalog tymczasowy (`.greg/version-build`) oraz katalog cache branchy (`.greg/version-cache`).
4. Greg buduje kazda skonfigurowana wersje zgodnie ze strategia.
5. Greg sprawdza unikalnosc `version` i poprawna mape aliasow (`alias -> version`).
6. Greg ustala `default` (wartosc z configu albo pierwsza zbudowana wersja).
7. Greg zapisuje manifest `versions.json` i wypisuje sciezki wynikowe.
8. Greg kopiuje build wersji domyslnej do root hostingu (`dist/` domyslnie).

Co to polecenie zmienia na dysku:

- zapisuje/aktualizuje pliki w `<outDir>/__versions`
- zapisuje/aktualizuje pliki w `dist` (synchronizacja wersji domyslnej)
- zapisuje/aktualizuje dane robocze w `.greg/`
- nie modyfikuje zrodlowych plikow dokumentacji
- nie przelacza aktualnie checkoutowanego brancha Git

Opcjonalne flagi porzadkowe:

- `--clean-cache`: usuwa `.greg/version-cache` przed buildem
- `--clean-versions`: usuwa katalog wyjscia wersji przed buildem
- `--rebuild-all`: przebudowuje wszystkie skonfigurowane wersje i pomija uzycie cache buildow branchy w tym uruchomieniu

Dlugosc prefiksu SHA w cache buildow branchy:

- domyslnie: `7`
- konfiguracja: `versioning.cacheShaLength`
- override przez env: `GREG_CACHE_SHA_LENGTH`
- poprawny zakres: `7..40`
- format klucza cache: `<shortSha>-<workspaceBuildFingerprint>`
- ten sufiks zapobiega uzyciu nieaktualnego cache, gdy zmienily sie lokalne wejscia builda/config, ale SHA commita zostalo takie samo

Przyklad: jesli branch `main` nadal wskazuje ten sam commit, ale lokalnie zmienisz wejscia builda (np. `vite.config.js` albo pluginy budowania Markdown), Greg zapisze wynik w innym katalogu cache, bo zmieni sie workspace fingerprint.

## Komponenty UI

Gdy manifest jest dostepny, Greg renderuje automatycznie dwa elementy:

- przelacznik wersji w headerze
- baner starszej wersji, gdy aktualna wersja rozni sie od domyslnej

Teksty mozesz konfigurowac przez `versioning.ui`:

```js [greg.config.js]
export default {
  versioning: {
    ui: {
      versionMenuLabel: "Wersja",
      manifestUnavailableText: "Przelacznik wersji niedostepny",
      showManifestUnavailableStatus: false,
      outdatedVersionMessage: "Czytasz starsza wersje ({current}). Zalecana: {default}.",
      outdatedVersionActionLabel: "Przejdz do najnowszej"
    }
  }
};
```

Obslugiwane placeholdery w `outdatedVersionMessage`:

- `{current}`
- `{default}`

### Lokalizacja tekstow wersjonowania

Jesli strona korzysta z tras locale, mozesz nadpisac teksty wersjonowania per jezyk przez `versioning.locales`:

```js [greg.config.js]
export default {
  versioning: {
    locales: {
      "/": {
        ui: {
          versionMenuLabel: "Version"
        }
      },
      "/pl/": {
        ui: {
          versionMenuLabel: "Wersja",
          outdatedVersionActionLabel: "Przejdz do najnowszej"
        }
      }
    }
  }
};
```

Priorytet rozwiazywania tekstow:

1. `versioning.locales[active-locale].ui`
2. `versioning.ui`
3. wartosci domyslne wbudowane w Greg

`showManifestUnavailableStatus` jest opcja globalna i nalezy ustawic ja tylko w `versioning.ui`.

## Fallback

Jesli `versions.json` nie da sie wczytac:

- Greg ukrywa przelacznik wersji
- Greg pokazuje `manifestUnavailableText` w headerze tylko wtedy, gdy `showManifestUnavailableStatus` nie jest ustawione na `false`

Dzieki temu dokumentacja nadal dziala poprawnie nawet przy pojedynczej wersji.

## Ksztalt manifestu

```json
{
  "default": "latest",
  "versions": [
    { "version": "2.1", "title": "2.1", "path": "/__versions/2.1/" },
    { "version": "2.0", "title": "2.0", "path": "/__versions/2.0/" }
  ],
  "aliases": {
    "latest": "2.1",
    "stable": "2.0"
  }
}
```

`aliases` to mapa (`alias -> version`), wiec cele aliasow sa jednoznaczne.




