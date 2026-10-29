---
title: Eksport do PDF
order: 7
---

# Eksport do PDF

Greg drukuje dokumentację do PDF z **tego samego Markdowna**, z którego powstaje
serwis. W `greg.config` opisujesz jeden lub więcej *dokumentów* (books) — co do
nich trafia, w jakiej kolejności i jak wyglądają strony — i uruchamiasz:

```sh
npx greg pdf
```

Każdy dokument jest renderowany pipeline'em serwisu (Shiki, Mermaid, kontenery,
komponenty Svelte, include), składany w jedną całość i drukowany przez Chromium.
Spis treści, numeracja rozdziałów, nagłówki i stopki, numery stron oraz zakładki
PDF są generowane — nie utrzymujesz ich ręcznie.

## Wymagania

- Przeglądarka oparta na Chromium **≥ 131**: używany jest systemowy **Edge** lub
  **Chrome**, nic nie jest pobierane.
- Dwa opcjonalne pakiety, instalowane tylko w projektach, które drukują PDF:

```sh
npm i -D playwright-core pdfjs-dist
```

## Bez konfiguracji

Bez sekcji `pdf` polecenie `greg pdf` drukuje jeden dokument (`default`) o treści
i kolejności menu bocznego, ze spisem treści i numerami stron w stopce. Wynik
trafia do `dist/pdf/default.pdf`.

## Definiowanie dokumentów

```js
// greg.config.js
export default {
    pdf: {
        books: {
            podrecznik: {
                title: 'Podręcznik użytkownika',
                subtitle: 'Acme Cloud',
                version: '2.1',
                dateFormat: 'YYYY.MM.DD',
                output: 'dist/pdf/podrecznik.pdf',
                content: [{ sidebar: true, groups: 'flatten', exclude: 'wewnetrzne/**' }],
                cover: '__pdf/cover.md',
                toc: { title: 'Spis treści', depth: 2 },
                numbering: { depth: 1 },
                page: {
                    size: 'A4',
                    margin: '20mm 18mm',
                    header: { left: '{subtitle}', right: '{chapter}' },
                    footer: { left: 'akt. {date}', right: '{page} / {pages}' },
                },
                css: '__pdf/print.css',
            },
        },
    },
};
```

`pdf.defaults` zawiera ustawienia wspólne dla wszystkich dokumentów. Ścieżki
`cover` i `css` są względne do katalogu dokumentacji (`srcDir`); katalogi
zaczynające się od `__` są ukryte w serwisie, ale dostępne dla PDF — `docs/__pdf/`
to dobre miejsce na pliki tylko do druku.

### Co trafia do dokumentu: `content`

`content` to `'sidebar'` (domyślnie) albo lista wpisów rozwijanych po kolei:

| Wpis | Znaczenie |
|---|---|
| `'/guide/routing'`, `'guide/routing.md'` | jedna strona (trasa albo plik względem katalogu dokumentacji) |
| `{ page: '/guide', title: 'Wstęp', level: 2 }` | strona z innym tytułem w spisie treści lub innym poziomem |
| `{ sidebar: true }` | całe menu boczne — te same strony i kolejność co w serwisie |
| `{ sidebar: 'Pomoc > How to' }` | jedna gałąź menu (etykiety połączone `>`) |
| `{ glob: '[0-9][0-9]-*.md', exclude: '00-*', sort: 'natural' }` | pliki pasujące do maski |
| `{ part: 'Dodatki', items: [ … ] }` | część z własną stroną tytułową |

**Wpisy `sidebar`** odwzorowują nawigację serwisu: głębokość strony w menu to jej
poziom w dokumencie (spis treści, numeracja, zakładki). Grupy menu bez linku stają
się stronami tytułowymi części (`groups: 'parts'`, domyślnie) albo znikają,
zostawiając swoje strony (`groups: 'flatten'`). Linki zewnętrzne i strony
z `layout: home` są pomijane.

**Wpisy `glob`** obsługują `*`, `**`, `?`, `[0-9]` i `{a,b}` względem katalogu
dokumentacji. `sort`: `natural` (domyślnie: `2-…` przed `10-…`), `sidebar`,
`title` albo `order` (frontmatter). Dopasowane strony są rozdziałami na jednym
poziomie.

Strona podana dwa razy trafia do dokumentu raz (z ostrzeżeniem). Strona wykluczona
przez `exclude` jednego wpisu może zostać dodana przez kolejny.

### Na poziomie strony: frontmatter

```yaml
---
pdf: false              # nigdy w PDF
---
```

```yaml
---
pdf:
  books: [podrecznik]   # tylko w tych dokumentach
  title: Krótki tytuł   # tytuł w spisie treści PDF
  numbered: false       # bez numeru rozdziału (np. historia wersji)
  break: before         # łamanie strony: before | after | avoid | none (nadpisuje chapterBreak)
  landscape: true       # ta strona na arkuszach poziomych
---
```

### Wewnątrz strony: kontenery

Treść przeznaczoną dla jednego wyjścia oznaczasz kontenerami. Treść, która nie
pasuje do bieżącego wyjścia, jest usuwana przed renderowaniem, a nie tylko ukrywana.

```md
::: web-only
Kliknij **Pobierz** w prawym górnym rogu.
:::

::: pdf-only
Aktualna wersja instrukcji jest dostępna na https://example.com/docs.
:::

::: pdf-only podrecznik
Tylko w dokumencie `podrecznik`.
:::

::: page-break
:::
```

Dla pojedynczego elementu działają też klasy `{.no-pdf}` / `{.pdf-only}`
z [atrybutów inline](./markdown/inline-attributes) (ukrywane przez CSS).

### Struktura: spis treści, numeracja, poziomy

| Opcja | Domyślnie | Znaczenie |
|---|---|---|
| `toc` | `{ depth: 2, pageNumbers: true }` | generowany spis treści; `false` wyłącza |
| `numbering` | `numbering` serwisu | `{ depth: 2, format: '1.' \| '1.1' }` — patrz [Numeracja](#numeracja-i-odwołania) |
| `headingShift` | `'auto'` | `'auto'` wyrównuje pierwszy nagłówek strony do jej poziomu w dokumencie; liczba przesuwa wszystkie nagłówki |
| `chapterBreak` | `true` | rozdziały 1. poziomu od nowej strony; `'right'` — od prawej strony (druk dwustronny), `'all'` — każda strona, `false` — żadna |

Numery są generowane, więc nagłówki w Markdownie zostają bez numerów. Gdy
numeracja jest włączona, a nagłówek zaczyna się od numeru, `greg pdf` zgłasza
`PDF_MANUAL_NUMBER`; strona wyglądająca na ręczny spis treści — `PDF_MANUAL_TOC`.

### Szablon strony

`page.size` (`A3`, `A4`, `A5`, `B5`, `Letter`, `Legal` albo `{ width, height }`),
`page.orientation`, `page.margin` (składnia CSS) oraz pola `header` / `footer`
(`left`, `center`, `right`). Przy `page.mirrorMargins: true` (druk dwustronny) strony
lewe zamieniają marginesy lewy/prawy oraz pola lewe/prawe, więc margines wewnętrzny
i zewnętrzne pole nagłówka zostają na miejscu. Pola to szablony tekstu z tokenami:

| Token | Wartość |
|---|---|
| `{title}` `{subtitle}` `{author}` `{version}` | ustawienia dokumentu |
| `{date}` | `date` z dokumentu albo dzisiejsza data w formacie `dateFormat` (`YYYY-MM-DD`) |
| `{chapter}` | tytuł bieżącego rozdziału 1. poziomu (z numerem) |
| `{page}` `{pages}` | numer strony i liczba stron |

Okładka, spis treści i strony części nie mają nagłówka ani stopki
(`page.plainPages`, domyślnie `['cover', 'toc', 'part']`). Strona okładki nie ma
marginesów, więc okładka może zająć cały arkusz; jej treść dostaje marginesy strony
jako wcięcie.

### Okładka

`cover` wskazuje plik Markdown. Tokeny (`{title}`, `{version}`, `{date}`, …) są
podstawiane przed renderowaniem, a surowy HTML jest dozwolony, więc zaprojektowana
okładka to kilka `<div>`. Kolejne strony okładki (np. prawa autorskie) oddziel
`::: page-break`. `backCover` działa tak samo dla ostatniej strony (stron) dokumentu.

### Wygląd

Pliki `css` są ładowane po motywie druku Grega. Motyw sterowany jest zmiennymi
(`--pdf-font-family`, `--pdf-heading-font-family`, `--pdf-font-size`,
`--pdf-line-height`, `--pdf-color`, `--pdf-heading-color`, `--pdf-accent`,
`--pdf-rule`, `--pdf-code-background`, `--pdf-table-font-size`,
`--pdf-table-header-background`, `--pdf-image-max-height`, `--pdf-margin-box-font`).
Przydatne punkty zaczepienia:

```css
:root {
    --pdf-font-size: 10pt;
    --pdf-line-height: 1.45;
    --pdf-accent: #0b5cad;
    --pdf-margin-box-font: 8pt "Segoe UI", sans-serif;
}

.pdf-chapter h2 { color: var(--pdf-accent); }
.pdf-toc-l1 { font-weight: 700; }
```

Elementy interaktywne są dostosowane do papieru: `details` są rozwinięte, każda zakładka
grupy kodu jest drukowana z etykietą, odnośniki przy nagłówkach i przyciski są ukryte,
kod się zawija zamiast przewijać, obrazy nigdy nie są dzielone między strony. Tabele,
kod lub obrazy szersze niż kolumna tekstu są zgłaszane jako `PDF_OVERFLOW`.

## Numeracja i odwołania

Numery rozdziałów są generowane — w serwisie i w dokumentach PDF — więc nagłówki
i nazwy plików w Markdownie nie zawierają numerów, a zmiana kolejności rozdziałów
to jedna linia w konfiguracji menu.

```js
// greg.config.js
export default {
    numbering: { depth: 1 },   // albo true; format: '1.' (domyślnie) | '1.1'; sidebar: false
};
```

- Numer strony wynika z **kolejności menu bocznego**; strony zagnieżdżone pod stroną
  dostają `3.1`, `3.2`…; grupy menu bez własnej strony nie mają numeru.
- Nagłówki wewnątrz strony kontynuują jej numer (`5.`, `5.1.`, `5.1.1.`) do głębokości `depth`.
- Serwis pokazuje numery w nagłówkach, menu, linkach poprzednia/następna,
  okruszkach i tytule karty; dokumenty PDF — w nagłówkach, spisie treści, nagłówkach
  stron i zakładkach. Dokument PDF dziedziczy numerację serwisu, chyba że ustawi własne `numbering`.
- `numbered: false` we frontmatterze zostawia stronę bez numeru (np. historia wersji,
  strony pomocy); `pdf: { numbered: false }` — tylko w PDF.

Żeby odwołać się do rozdziału przez numer, napisz link **z pustym tekstem**:

```md
Kopie zapasowe opisano w rozdziale [](/guide/kopie-zapasowe).
```

Link pokazuje numer strony docelowej („w rozdziale 5”) — albo jej tytuł, gdy strona
nie ma numeru — i pozostaje poprawny po zmianie kolejności rozdziałów. W PDF staje się
linkiem wewnątrz dokumentu.

## Podgląd

Przy uruchomionym `npm run dev` otwórz **`/__pdf`**, aby zobaczyć listę dokumentów,
albo **`/__pdf/<dokument>`** (np. `/__pdf/podrecznik`): dokument wyrenderowany w całości, z paskiem stanu i listą
ostrzeżeń. **Zawartość** otwiera panel z rozwiązaną listą rozdziałów (z numerami;
kliknięcie przewija do rozdziału) i stronami pominiętymi, z powodem. Zmiany w Markdownie
i konfiguracji przeładowują podgląd. Prawdziwy podział na strony pokaże podgląd wydruku
przeglądarki (`Ctrl+P`).

## CLI

```text
greg pdf [dokument…] [opcje]

  --list               wypisz rozwiązaną treść każdego dokumentu i zakończ
  --dev                drukuj z serwera deweloperskiego (bez builda)
  --no-build           użyj istniejącego wyniku builda
  --out <katalog>      katalog wyjściowy
  --browser <nazwa>    msedge | chrome | chromium | ścieżka do programu
  --compare <plik.pdf> porównaj treść z wzorcowym PDF
  --strict             zakończ błędem, gdy pojawi się jakiekolwiek ostrzeżenie
  --open               otwórz wygenerowany PDF
  --timeout <sekundy>  maksymalny czas oczekiwania na trasę druku (domyślnie 180)
```

`greg pdf --list` pokazuje, co zostanie wydrukowane i dlaczego strony pominięto.
Raport po wydruku zawiera liczbę stron, czasy i ostrzeżenia, np. linki do stron
spoza dokumentu (`PDF_LINK_OUTSIDE_BOOK` — ustaw `siteUrl`, by zostały linkami
do serwisu), brakujące kotwice i obrazy.

### Inne wersje językowe

Dokument jest drukowany z głównej wersji językowej, chyba że ustawi `locale` (klucz z
`locales`, np. `'/pl/'`): wtedy używa menu, stron i języka tej wersji, a podgląd jest
pod jej prefiksem (`/pl/__pdf/<dokument>`).

### Porównanie ze wzorcem

Przy przenoszeniu istniejącego dokumentu do Grega `--compare` sprawdza, że zmienił
się układ, a nie treść:

```sh
npx greg pdf podrecznik --compare stary-podrecznik.pdf
```

Raport (`<wynik>.compare.md`) dzieli oba dokumenty według nagłówków i porównuje
słowa każdej sekcji, ignorując układ, typografię, nagłówki i stopki stron,
powtórzone nagłówki tabel oraz numery rozdziałów. Sekcje są oznaczane jako
*identical*, *layout only* (te same słowa w innej kolejności — zwykle tabele) albo
*changed*, z listą słów występujących tylko w jednym z plików.

## Linki

Linki między stronami dokumentu stają się linkami wewnątrz PDF; linki `#kotwica`
wskazujące nagłówek innej strony też są rozwiązywane. Linki do stron spoza
dokumentu stają się linkami do serwisu, gdy ustawiono `siteUrl`
(`externalPageLinks: 'site-url'`), zwykłym tekstem (`'text'`) albo błędem (`'error'`).
