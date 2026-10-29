# Eksport do PDF w Gregu (`greg pdf`) — dokument projektowy

Status: **MVP zaimplementowane** (etap 1 + część etapu 2, patrz §18) · Wersja dokumentu: 2 · Dotyczy: Greg ≥ 0.10

## 1. Kontekst i cel

Greg generuje dziś wyłącznie serwis interaktywny (SPA). Użytkownicy, którzy potrzebują dokumentu do druku
(instrukcje użytkownika, dokumentacja wdrożeniowa, materiały szkoleniowe), muszą utrzymywać osobny proces:
scalać pliki Markdown zewnętrznymi skryptami, drukować z przeglądarki i ręcznie pilnować spisu treści.

Cel: **jedno źródło Markdown → serwis i PDF**, z przyjaznym sposobem określania, *co* trafia do PDF,
*w jakiej kolejności* i *jak wygląda strona* — przy zachowaniu wydajności na bardzo obszernych materiałach.

### 1.1 Cele

- G1. Polecenie `greg pdf` produkujące jeden lub wiele dokumentów PDF z jednego projektu.
- G2. Deklaratywny wybór i kolejność treści (menu boczne, jawna lista, wzorce plików) + wykluczenia na poziomie
  strony (frontmatter) i fragmentu (kontenery/atrybuty).
- G3. Szablon dokumentu: okładka, spis treści z numerami stron, numeracja rozdziałów, nagłówki/stopki,
  łamanie stron, własny CSS i własne komponenty Svelte.
- G4. Wierność treści: ten sam pipeline Markdown co serwis (Shiki, Mermaid, kontenery, komponenty Svelte,
  include/snippety, matematyka).
- G5. Działające linki wewnętrzne, zakładki (outline) i tagged PDF.
- G6. Podgląd na żywo w `greg dev` (HMR) — bez generowania pliku.
- G7. Wydajność: liniowa, przewidywalna, z cache; brak pobierania przeglądarki, jeśli jest systemowy Chrome/Edge.

### 1.2 Poza zakresem (na teraz)

- Pełne API pluginów firm trzecich (projektujemy tylko furtki — patrz §12).
- Silniki inne niż Chromium (abstrakcja przewidziana, implementacja później).
- Eksport do EPUB/DOCX.
- Przypisy dolne (footnotes) w stylu książkowym — Chromium ich nie wspiera natywnie.

## 2. Stan obecny Grega (istotne fakty)

| Obszar | Stan | Konsekwencja dla PDF |
|---|---|---|
| Renderowanie Markdown | W przeglądarce (`MarkdownRenderer.svelte`, `unified` + lista `PluginEntry` w `markdownRendererRuntime.ts`) | PDF musi powstać w przeglądarce albo trzeba by izomorficzny renderer. Wybieramy przeglądarkę. |
| `build:static` | Kopiuje `index.html` pod każdą trasę (`scripts/generate-static.js`) | Brak gotowego HTML per strona — nie ma czego „crawlować”, co jest zaletą (nie kusi). |
| Źródła `.md` | Serwowane surowo przez `vitePluginCopyDocs`, pobierane `fetch()` | Trasa druku może pobierać strony tym samym mechanizmem. |
| Frontmatter | `virtual:greg-frontmatter` (`vitePluginFrontmatter.js`) | Flagi `pdf:` dostępne bez dodatkowego parsowania. |
| Pluginy | Brak systemu pluginów; pluginy Vite i lista remark/rehype na sztywno | Moduł wbudowany + furtki (§12). |
| Kontenery | `info/tip/warning/danger/details` (`remarkContainers.js`) | Dodajemy `web-only` / `pdf-only`. |
| Atrybuty inline | `remarkInlineAttrs.js` (`{.klasa}`) | Klasa `.no-pdf` / `.pdf-only` bez nowej składni. |
| `build:markdown` | Rozwija include/snippety | Można wykorzystać do raportu/diagnostyki, nie jest wymagane. |

## 3. Przegląd istniejących rozwiązań (skrót)

| Narzędzie | Silnik | Podejście | Wniosek dla Grega |
|---|---|---|---|
| vitepress-export-pdf, vuepress export-pdf v1/v2 | Puppeteer | crawl zbudowanego serwisu, druk per strona, scalanie | ✗ linki między stronami giną przy scalaniu, czas liniowy × narzut uruchomienia strony |
| mr-pdf, docs-to-pdf (Docusaurus) | Puppeteer | chodzenie po linkach „dalej”, selektory CSS | ✗ kruche wobec zmian motywu |
| docusaurus-prince-pdf | Prince | konkatenacja HTML → Prince | ✓ jakość Paged Media, ✗ licencja komercyjna |
| mkdocs-with-pdf / mkdocs-to-pdf | WeasyPrint | składanie z nawigacji w jeden dokument | ✓ wzorzec modelowy, ✗ brak JS (Mermaid, komponenty) |
| mkdocs-print-site-plugin, mdBook `print.html` | ręczny druk | jedna długa strona | ✓ prostota, ✗ brak automatyzacji i numerów stron w TOC |
| mkdocs-exporter | Playwright | równoległe karty, scalanie | ✓ wydajność, ✗ scalanie psuje linki |
| Antora PDF extension | asciidoctor-pdf | składanie z modelu nawigacji (Assembler) | ✓ najlepszy wzorzec zarządzania treścią |
| Paged.js / Vivliostyle | polyfill / silnik Paged Media | jeden dokument | Paged.js dławi się setkami stron; Vivliostyle solidny — kandydat na drugi silnik |

**Wzorce do skopiowania:** składanie z modelu (nie z DOM), kolejność z nawigacji lub manifestu, flagi `pdf: false`
we frontmatterze, zakładki z nagłówków, CSS Paged Media zamiast szablonów nagłówków w JS, konfiguracja w pliku i CI.

**Antywzorce:** selektory DOM motywu, druk per strona + scalanie jako domyślna ścieżka, zależność od silników
płatnych, „drukuj z przeglądarki” jako jedyna ścieżka, brak przepisywania linków.

## 4. Decyzje (ADR w skrócie)

| # | Decyzja | Uzasadnienie | Odrzucone alternatywy |
|---|---|---|---|
| D1 | **Moduł wbudowany** `greg pdf` | Wyszukiwarka i AI też są wbudowane; API pluginów dla jednej funkcji to przerost | Plugin zewnętrzny; najpierw API pluginów |
| D2 | **Składanie z modelu** (konfiguracja + frontmatter + sidebar) w **jeden dokument HTML** | Linki wewnętrzne, jeden layout, brak scalania | Crawl + merge |
| D3 | Silnik **Chromium przez `playwright-core`** z **systemowym Edge/Chrome** (`channel`) | Te same możliwości co serwis (JS, Mermaid, Svelte); brak pobierania przeglądarki | Puppeteer, pełny Playwright, WeasyPrint, Prince, Paged.js |
| D4 | **Natywne CSS Paged Media Chromium ≥ 131** (pola marginesu, `counter(page/pages)`), braki uzupełniamy sami | Szybkie, bez polyfilla | Paged.js (wydajność) |
| D5 | **Dwa przebiegi** dla numerów stron w TOC | Chromium nie ma `target-counter()` | Paged.js, ręczne numery |
| D6 | **Podgląd jako trasa SPA** `/__pdf/<book>` | Ten sam renderer, HMR za darmo | Osobny bundle |
| D7 | `playwright-core` jako **opcjonalna** peer dependency | Serwis nie płaci za funkcję PDF | Zależność twarda |

## 5. Model treści — co trafia do PDF

### 5.1 Pojęcia

- **Book** — jeden dokument PDF. Projekt może mieć wiele booków (np. `instrukcja`, `serwis`).
- **Wpis treści** (`PdfContentItem`) — element listy `content` booka, rozwijany do uporządkowanej listy stron.
- **Strona** — plik `.md` z `srcDir`; w PDF staje się *rozdziałem* (lub podrozdziałem, zależnie od zagnieżdżenia).
- **Część** (`part`) — grupująca pozycja bez pliku (np. „Dodatki”), generuje stronę tytułową części i poziom w TOC.

### 5.2 Konfiguracja (`greg.config.*`)

```ts
export type PdfConfig = {
    /** Domyślne ustawienia dziedziczone przez wszystkie booki. */
    defaults?: Partial<PdfBookConfig>;
    books: Record<string, PdfBookConfig>;
};

export type PdfBookConfig = {
    title: string;
    subtitle?: string;
    author?: string;
    /** Wersja dokumentu; domyślnie GregConfig.version. */
    version?: string;
    /** Locale (klucz z `locales`); domyślnie root. Ustala język, etykiety, sidebar. */
    locale?: string;
    /** Ścieżka wyjściowa; domyślnie `<outDir>/pdf/<bookId>.pdf`. */
    output?: string;
    /** Co i w jakiej kolejności. Domyślnie 'sidebar'. */
    content?: 'sidebar' | PdfContentItem[];
    cover?: false | string;          // .md lub .svelte (ścieżka względna do projektu)
    backCover?: false | string;
    toc?: false | { title?: string; depth?: 1 | 2 | 3 | 4; pageNumbers?: boolean };
    numbering?: false | { depth?: 1 | 2 | 3; format?: '1.1' | '1.1.' };
    /** Przesunięcie poziomów nagłówków stron; 'auto' = wg głębokości w sidebarze/części. Domyślnie 'auto'. */
    headingShift?: number | 'auto';
    /** Każdy rozdział od nowej strony (domyślnie true); 'right' = od strony nieparzystej. */
    chapterBreak?: boolean | 'right';
    page?: PdfPageConfig;
    /** Dodatkowy CSS (jeden lub wiele plików), ładowany po motywie druku. */
    css?: string | string[];
    /** Wymuszony motyw kolorów; domyślnie 'light'. */
    colorScheme?: 'light' | 'dark';
    /** Zachowanie wobec linków do stron spoza booka. */
    externalPageLinks?: 'site-url' | 'text' | 'error';
    /** Bazowy URL serwisu dla externalPageLinks: 'site-url'. */
    siteUrl?: string;
    /** Metadane PDF. */
    meta?: { keywords?: string[]; subject?: string };
};

export type PdfContentItem =
    | string                                                  // trasa lub plik: '/guide/routing', 'guide/routing.md'
    | { page: string; title?: string; level?: number }        // strona z nadpisaniem tytułu/poziomu
    | { sidebar: true | string;                                // całe drzewo sidebaru lub grupa (tekst albo ścieżka 'A > B')
        groups?: 'parts' | 'flatten';                          // grupy bez linku: strony tytułowe części albo pominięcie
        exclude?: string | string[] }                          // maski plików do pominięcia
    | { glob: string | string[]; exclude?: string | string[]; sort?: 'natural' | 'sidebar' | 'title' | 'order' }
    | { part: string; items: PdfContentItem[]; intro?: string };  // część z własną stroną tytułową

// content: 'sidebar' jest skrótem dla [{ sidebar: true }].

export type PdfPageConfig = {
    size?: 'A4' | 'A5' | 'Letter' | 'Legal' | { width: string; height: string };
    orientation?: 'portrait' | 'landscape';
    margin?: string;                       // składnia CSS, np. '20mm 18mm 22mm'
    mirrorMargins?: boolean;               // druk dwustronny (marginesy :left/:right)
    header?: PdfMarginSlots | false;
    footer?: PdfMarginSlots | false;
    /** Strony bez nagłówka/stopki: okładka, TOC, strony tytułowe części. */
    plainPages?: ('cover' | 'toc' | 'part')[];
};

/** Wartości to szablony z tokenami: {title} {subtitle} {version} {chapter} {chapterNumber} {page} {pages} {date}. */
export type PdfMarginSlots = { left?: string; center?: string; right?: string };
```

Przykład (KDS, stan docelowy — §15):

```ts
pdf: {
    books: {
        instrukcja: {
            title: 'Instrukcja użytkownika',
            subtitle: 'KDS – Kitchen Display System',
            version: '0.0.10',
            content: [{ sidebar: true, groups: 'flatten', exclude: ['how-to/**', 'diagnostyka/**'] }],
            cover: './pdf/cover.md',
            toc: { depth: 3, pageNumbers: true },
            numbering: { depth: 3 },                   // numery generowane — nie ma ich w plikach
            page: {
                size: 'A4', margin: '20mm 18mm',
                header: { left: '{subtitle}', right: '{chapter}' },
                footer: { center: '{page} / {pages}' },
            },
            css: './pdf/print.css',
        },
    },
},
```

### 5.3 Frontmatter strony

```yaml
pdf: false                 # strona nie trafia do żadnego PDF
# lub
pdf:
  include: false           # jw.
  books: [instrukcja]      # tylko do wskazanych booków
  title: Krótszy tytuł     # tytuł w PDF/TOC
  numbered: false          # strona bez numeru rozdziału (np. historia wersji, dodatki)
  break: before | after | avoid | none
  landscape: true          # strona (rozdział) w orientacji poziomej
```

### 5.4 Fragmenty treści

```md
::: web-only
Kliknij **Pobierz** w prawym górnym rogu.
:::

::: pdf-only
Aktualną wersję dokumentu znajdziesz na https://…
:::

![Zrzut ekranu](./x.png){.no-pdf}
Tekst tylko do druku {.pdf-only}
```

- `web-only` / `pdf-only` — nowe typy w `remarkContainers` (bez etykiety, bez obramowania). Kontener działa na
  poziomie **AST** w zależności od `env.target`, więc treść niepasująca do celu **nie jest renderowana**
  (nie tylko ukrywana CSS-em) — liczy się dla wydajności i dla wyszukiwarki (indeks pomija `pdf-only`).
- `{.no-pdf}` / `{.pdf-only}` — tańsza ścieżka przez CSS (klasa celu na `<html>` w trasie druku).
- Opcjonalnie `::: pdf-only instrukcja` — ograniczenie do booka.
- Komponent `<PageBreak />` (oraz kontener `::: page-break`) — wymuszenie łamania.

### 5.5 Algorytm rozwiązywania treści

1. Rozwiń `content` w kolejności: `sidebar` → drzewo sidebaru (§5.7); `glob` → pliki wg `sort` (§5.6);
   `part` → węzeł części + rekurencja; napis/`page` → pojedyncza strona.
2. Normalizuj każdy wpis do `{ mdPath, route, title, level, partPath }`.
3. Odfiltruj strony z `pdf: false` / `pdf.include: false` / `pdf.books` bez tego booka.
4. Deduplikuj (pierwsze wystąpienie wygrywa, ostrzeżenie dla kolejnych).
5. Błąd, gdy wpis wskazuje nieistniejącą stronę; ostrzeżenie, gdy `glob` nic nie dopasował.
6. Wynik: **manifest booka** (JSON) — wspólny dla podglądu, CLI i raportu.

Manifest powstaje w Node (wirtualny moduł `virtual:greg-pdf`, §7), więc logika jest jedna i testowalna
jednostkowo; przeglądarka dostaje gotową listę.

### 5.6 Semantyka `glob`

- Maski w składni picomatch (`*`, `**`, `?`, `[0-9]`, `{a,b}`), **względem `srcDir`**, dopasowywane do plików `.md`.
  Wiele masek = suma; `exclude` = maski odejmowane.
- Kolejność (`sort`): domyślnie `natural` — sortowanie naturalne ścieżek (`2-…` przed `10-…`), więc pliki
  z prefiksem numerycznym układają się jak w dokumencie. `sidebar` — kolejność z sidebaru (pliki spoza sidebaru
  na końcu, naturalnie), `title` — po tytule, `order` — po polu `order` z frontmattera.
- Poziom: wszystkie dopasowane strony są rozdziałami na tym samym poziomie (zagnieżdżenie katalogów nie tworzy
  poziomów — do tego służy `part` albo `sidebar`).
- Pliki z prefiksem `__` są ukryte w serwisie (konwencja Grega), ale **mogą być dołączone jawnie** — maską lub
  wpisem `page`. To naturalne miejsce na strony tylko do PDF (np. `__pdf/prawa-autorskie.md`), bez frontmattera.
- Pusta maska → ostrzeżenie `PDF_EMPTY_GLOB`; strona dopasowana też przez wcześniejszy wpis → pomijana (dedup).

### 5.7 Semantyka `sidebar`

`{ sidebar: true }` (oraz skrót `content: 'sidebar'`) oznacza: *PDF ma tę samą treść i kolejność co menu boczne
serwisu*. Kroki:

1. Bierzemy **rozwiązany** sidebar locale booka — dokładnie ten, który widzi użytkownik serwisu: tablica z konfiguracji
   (w tym wygenerowana funkcją, jak w KDS) albo `'auto'` z drzewa katalogów; wpisy `auto` są rozwijane.
2. Przechodzimy drzewo w głąb, w kolejności menu:
   - pozycja z `link` do strony w `srcDir` → rozdział; **poziom = głębokość w drzewie**
     (wpływa na TOC, numerację i zakładki; nagłówki w treści przesuwane są względem tego poziomu);
   - grupa bez `link` → wg `groups`: `'parts'` (domyślnie) tworzy stronę tytułową części z tekstem grupy,
     `'flatten'` pomija grupę i podnosi jej dzieci;
   - linki zewnętrzne, kotwice (`/strona#x`) i duplikaty → pomijane (z informacją w `--list`).
3. Stosujemy wykluczenia: `exclude` wpisu, potem frontmatter (`pdf: false`).

`{ sidebar: 'Praktyka i FAQ' }` lub `{ sidebar: 'Pomoc > How to' }` bierze tylko wskazaną gałąź. Pozwala to łączyć
strategie, np. `[ { sidebar: 'Wprowadzenie' }, { glob: '__pdf/*.md' }, { sidebar: 'Praktyka i FAQ' } ]`.

Kiedy którą wybrać: `sidebar` — gdy PDF ma być „serwisem na papierze” i nie chcemy utrzymywać drugiej listy;
`glob` — gdy kolejność wynika z nazw plików (jak w KDS); jawna lista/`part` — gdy PDF ma inną strukturę niż serwis.

## 6. Przyjazne zarządzanie treścią

1. **`greg pdf --list [book]`** — drukuje drzewo rozwiązanego manifestu (poziomy, tytuły, ścieżki,
   powód wykluczenia), np.:

   ```text
   instrukcja (14 stron, 2 wykluczone)
   ├─ 1. Wprowadzenie                         02-1-wprowadzenie.md
   ├─ 2. Rodzaje stanowisk i ekranów          03-2-rodzaje-stanowisk-i-ekranow.md
   │  …
   └─ ✗ Diagnostyka                           diagnostyka/index.md  (frontmatter pdf: false)
   ```

2. **Panel podglądu** `/__pdf/<book>` w `greg dev`: lewa kolumna — manifest (kliknięcie przewija do rozdziału,
   ikonka „wykluczone” z powodem), prawa — strony w układzie druku (A4, marginesy, nagłówki/stopki).
   Przełączniki: siatka stron, pokaż elementy `web-only`, pokaż przepełnienia.
3. **Raport** po `greg pdf`: liczba stron, czas faz, linki do stron spoza booka, brakujące kotwice,
   obrazy > N MB, przepełnienia poziome (szerokie tabele/kod).
4. **Zero-config**: bez sekcji `pdf` w konfiguracji `greg pdf` tworzy jeden book z `mainTitle` i `content: 'sidebar'`.

## 7. Architektura

```text
greg.config ──► vitePluginPdf (Node) ──► virtual:greg-pdf (manifest booków)
                                   │
                    greg dev / preview ──► trasa SPA /__pdf/:book ──► PrintBook.svelte
                                                                       ├─ Cover / Toc / Part
                                                                       ├─ PrintChapter × N (MarkdownRenderer, env.target='pdf')
                                                                       └─ window.__GREG_PDF__ (gotowość, mapa kotwic)
greg pdf (CLI) ──► uruchamia preview (programowo, Vite API) ──► playwright-core (channel: msedge|chrome)
                                                              ├─ przebieg 1: page.pdf → odczyt stron nagłówków
                                                              ├─ wstrzyknięcie numerów do TOC
                                                              └─ przebieg 2: page.pdf → plik + raport
```

### 7.1 Nowe pliki (propozycja)

| Plik | Rola |
|---|---|
| `src/lib/pdf/vitePluginPdf.js` | Wirtualny moduł manifestu, HMR |
| `src/lib/pdf/resolveBook.js` | Algorytm §5.5 (czysty, testowalny) |
| `src/lib/pdf/PrintBook.svelte` | Kompozycja dokumentu w trasie druku |
| `src/lib/pdf/PrintChapter.svelte` | Opakowanie `MarkdownRenderer` z prefiksami kotwic i przepisywaniem linków |
| `src/lib/pdf/Cover.svelte`, `Toc.svelte`, `PartTitle.svelte` | Domyślne elementy szablonu (nadpisywalne) |
| `src/lib/pdf/print.scss` | Motyw druku (zmienne CSS, `@page`, łamanie, tabele, kod) |
| `src/lib/pdf/pageCss.js` | Generowanie CSS `@page` z `PdfPageConfig` (pola marginesu, strony nazwane) |
| `src/lib/pdf/cli.js` | Komenda `greg pdf` (orkiestracja, przebiegi, raport) |
| `src/lib/pdf/pdfInspect.js` | Odczyt numerów stron kotwic z PDF przebiegu 1 |
| `src/lib/pdf/numbering.js` | Numeracja z manifestu, generowanie TOC, wykrywanie `PDF_MANUAL_*` (współdzielone z serwisem) |
| `src/lib/pdf/compare.js` | `--compare`: ekstrakcja, normalizacja, dopasowanie sekcji, raport |
| `types/index.d.ts` | Typy §5.2 |

### 7.2 Trasa druku

- Router rozpoznaje prefiks `/__pdf/` i renderuje `PrintBook` **zamiast** layoutu serwisu (bez sidebaru, nagłówka,
  wyszukiwarki, AI) — minimalny DOM.
- `PrintChapter` pobiera `.md` jak dziś `MarkdownDocs` i renderuje go **jednym współdzielonym procesorem**
  `unified` (procesor jest dziś budowany per strona — dla booka budujemy raz na `docsPrefix`, wraz z jednorazowo
  zainicjowanym highlighterem Shiki).
- Rozdziały są renderowane w **małej puli** (np. 4 równolegle), a wynik każdego trafia do DOM od razu —
  przeglądarka nie trzyma całego HTML w pamięci dwa razy.
- Po wyrenderowaniu wszystkiego i zakończeniu `RenderHandler`ów (Mermaid, komponenty) oraz `document.fonts.ready`
  i załadowaniu obrazów ustawiane jest `window.__GREG_PDF__ = { ready: true, anchors, warnings }`.

### 7.3 Kotwice i linki

- Każdy rozdział dostaje identyfikator `c-<slug-trasy>`; nagłówki i kotwice wewnątrz — prefiks `c-<slug>--`.
  Rozwiązuje to kolizje `id` między stronami (np. wiele `#wprowadzenie`).
- Przepisywanie `href` (rehype, `env.target='pdf'`):
  - `/trasa` lub `./plik.md` w booku → `#c-<slug>`; `/trasa#x` → `#c-<slug>--x`;
  - `#x` (w obrębie strony) → `#c-<bieżący>--x`;
  - strona spoza booka → wg `externalPageLinks` (`site-url`: `siteUrl + trasa`, `text`: zwykły tekst, `error`: błąd);
  - zewnętrzne URL bez zmian; opcjonalnie dopisanie adresu po linku przez CSS `a[href^=http]::after`.
- Brakująca kotwica → ostrzeżenie w raporcie (podgląd podświetla link).

### 7.4 Szablon strony

Generowany przez `pageCss.js`, np.:

```css
@page { size: A4; margin: 20mm 18mm;
  @top-left      { content: "KDS – instrukcja użytkownika"; }
  @bottom-center { content: counter(page) " / " counter(pages); } }
@page plain { @top-left { content: none; } @bottom-center { content: none; } }
.pdf-cover, .pdf-toc, .pdf-part { page: plain; }
```

- **Tytuł rozdziału w nagłówku (`{chapter}`)**: Chromium nie wspiera `string-set`/`string()`. Rozwiązanie:
  **strony nazwane per rozdział** — `pageCss.js` generuje `@page ch-7 { @top-right { content: "7. Zamykanie zamówienia" } }`
  i `#c-…{ page: ch-7 }`. Dla bardzo wielu rozdziałów CSS rośnie liniowo (kilkaset reguł — akceptowalne).
  *Do potwierdzenia w spike'u S1: strony nazwane (`page:`) w połączeniu z polami marginesu.*
- **Numeracja rozdziałów**: numery są **liczone z manifestu** (kolejność i poziomy z `content`) i wstawiane jako
  prawdziwy tekst (`<span class="heading-number">2.3</span>`) przez plugin rehype — nie przez CSS counters,
  bo zakładki PDF (outline/tagged) i token `{chapter}` biorą tekst z DOM, a pseudo-elementy CSS do nich nie trafiają.
  Ten sam numer trafia do TOC, zakładek, nagłówka strony i (opcjonalnie) do serwisu — patrz §7.7.
- **Motyw**: `print.scss` oparty na zmiennych (`--pdf-font-body`, `--pdf-font-mono`, `--pdf-accent`,
  `--pdf-base-size`…). Kolejność warstw: motyw serwisu (typografia treści) → motyw druku → `css` booka.
- **Nadpisywanie elementów**: `cover`/`backCover` jako `.md` (z frontmatterem i tokenami) lub `.svelte`
  (props: `book`, `manifest`, `meta`). Analogicznie opcjonalne `toc: { component }` w przyszłości.
- **Elementy interaktywne** w druku: `CodeGroup` → wszystkie zakładki jedna pod drugą z tytułem;
  `details` → rozwinięte; podgląd obrazów → zwykły obraz; Mermaid → SVG w motywie jasnym; przyciski „kopiuj” ukryte.
  Realizowane w `print.scss` + atrybutach `data-print-*` ustawianych przez komponenty, gdy `env.target='pdf'`.

### 7.5 Spis treści z numerami stron (dwa przebiegi)

1. Przebieg 1: `Toc.svelte` renderuje pozycje z **zarezerwowanym miejscem** na numer (stała szerokość),
   więc długość TOC nie zależy od numerów.
2. `page.pdf({ tagged: true, outline: true })` → bufor w pamięci.
3. `pdfInspect.js` czyta PDF (`pdfjs-dist` w Node, tylko struktura — bez renderowania) i mapuje kotwice na numery
   stron: preferowana ścieżka — *named destinations* tworzone przez Chromium dla celów linków wewnętrznych;
   zapasowa — outline (zakładki) z nagłówków.
4. Numery są wstrzykiwane przez `page.evaluate()`; przebieg 2 generuje plik końcowy.
5. Weryfikacja: jeśli liczba stron między przebiegami się zmieniła → ostrzeżenie (i maks. 1 dodatkowy przebieg).

Koszt: drugi `page.pdf()` bez ponownego renderowania Markdown/Mermaid (DOM jest gotowy) — zwykle ułamek czasu
pierwszego przebiegu. Przy `toc.pageNumbers: false` przebieg jest jeden.
*Spike S2: niezawodność named destinations w PDF z Chromium (`tagged`); alternatywnie wyznaczanie stron z pozycji
nagłówków w layoucie druku przez `page.evaluate` po emulacji mediów `print`.*

### 7.6 Wymagania przeglądarki

- `playwright-core` (opcjonalna peer dependency). `chromium.launch({ channel: 'msedge' | 'chrome' })`;
  kolejność prób konfigurowalna (`GREG_PDF_BROWSER`, `--browser`), fallback na `executablePath`.
- Wymagany Chromium ≥ 131 (pola marginesu `@page`). Starsza wersja → czytelny błąd z instrukcją.
- `outline: true` w Playwright działa **tylko** razem z `tagged: true` — zawsze ustawiamy obie.
- Brak `playwright-core` → komunikat: `npm i -D playwright-core`.

### 7.7 Spis treści i numeracja generowane z treści

Docelowo fragmenty **nie zawierają** ani numerów rozdziałów w tytułach, ani ręcznego spisu treści, ani numerów
w nazwach plików. Wszystko to wynika ze struktury:

- **Kolejność** — z `content` (zalecane: `sidebar`, czyli jedna kolejność dla serwisu i PDF; alternatywnie jawna
  lista w booku albo `order` we frontmatterze). Nazwy plików mogą być opisowe (`wprowadzenie.md`,
  `zamykanie-zamowienia.md`) — zmiana kolejności to zmiana jednej linii konfiguracji, bez zmiany nazw i linków.
- **Spis treści** — budowany z nagłówków wszystkich stron manifestu (do `toc.depth`), po nadaniu numerów
  i prefiksów kotwic. Pozycje są linkami; numery stron w etapie 2 (§7.5).
- **Numeracja** (`numbering: { depth: 3 }`) — numer rozdziału = pozycja strony w manifeście (z uwzględnieniem
  części), podrozdziały = kolejne `##`/`###` wewnątrz strony (po `headingShift`). Strony mogą się wyłączyć
  z numeracji (`pdf: { numbered: false }` — np. „Historia wersji”, „Najczęstsze pytania” jako dodatek).
- **Numeracja w serwisie** (`numbering` na poziomie `GregConfig`, opcjonalnie) — ten sam algorytm na kolejności
  sidebaru, więc „rozdział 7” w serwisie i w PDF to ten sam rozdział. Domyślnie wyłączona w serwisie.
- Zabezpieczenie migracji: ostrzeżenie `PDF_MANUAL_NUMBER`, gdy nagłówek zaczyna się od numeru (`/^\d+(\.\d+)*\.?\s/`)
  przy włączonej numeracji — wskazuje fragmenty do oczyszczenia. Ostrzeżenie `PDF_MANUAL_TOC`, gdy strona zawiera
  listę linków do kotwic wyglądającą na ręczny spis treści.

### 7.8 Porównanie z wzorcem (`--compare`)

Narzędzie do monitorowania różnic podczas migracji (i później — regresji między wydaniami):

```text
greg pdf instrukcja --compare ./KDS-INSTRUKCJA-UZYTKOWNIKA.pdf
```

1. Ekstrakcja tekstu z obu PDF (`pdfjs-dist`), z pominięciem stron okładki/TOC (wykrywanych lub wskazanych
   `--compare-skip 1-3`) i powtarzalnych nagłówków/stopek (linie występujące na > 50% stron).
2. Normalizacja: białe znaki, dzielenie wyrazów, typograficzne cudzysłowy/myślniki, **numery w nagłówkach**
   (żeby przeniesienie numeracji z treści do generatora nie dawało fałszywych różnic).
3. Dopasowanie po nagłówkach → porównanie per sekcja (diff akapitów).
4. Raport `dist/pdf/<book>.compare.md`: liczba stron (wzorzec/wynik), lista sekcji brakujących/nadmiarowych/
   przeniesionych, różnice tekstu per sekcja, liczba obrazów per sekcja. Kod wyjścia 0 — to narzędzie
   informacyjne (z `--strict` różnice treści są błędem).

Porównanie **wizualne** (raster stron i różnice pikseli) celowo nie jest częścią MVP — układ ma się zmienić
(ma być lepszy), więc liczy się treść i struktura; ocena wizualna — ręcznie, na podglądzie.

## 8. CLI

```text
greg pdf [book…]            Buduje wskazane booki (domyślnie wszystkie)
  --list                    Wypisuje rozwiązany manifest i kończy
  --out <dir>               Katalog wyjściowy (nadpisuje output booków)
  --browser <msedge|chrome|path>
  --no-build                Używa istniejącego <outDir> (szybka iteracja nad CSS po buildzie)
  --dev                     Drukuje z serwera dev (bez buildu) — najszybsza pętla lokalna
  --open                    Otwiera wynikowy PDF
  --strict                  Ostrzeżenia (zepsute linki, brakujące strony) kończą się błędem — dla CI
  --compare <plik.pdf>      Porównuje treść z wzorcem i zapisuje raport różnic (§7.8)
  --concurrency <n>         Liczba równoległych booków (domyślnie min(2, CPU/2))
```

`greg build` nie generuje PDF automatycznie; opcja `pdf.buildWithSite: true` dla CI, które chce jednego kroku.

## 9. Wydajność

| Ryzyko | Środek |
|---|---|
| Koszt renderowania Markdown (Shiki) | Jeden procesor i jeden highlighter na book; leniwe ładowanie języków jak dziś |
| Mermaid | Cache SVG po hashu źródła diagramu (`.greg/cache/pdf/mermaid/`) |
| Powtarzalne budowanie | Hash manifestu + treści stron + CSS + konfiguracji → pominięcie booka, jeśli PDF aktualny |
| Pamięć przy bardzo dużych bookach | Render rozdziałów strumieniowo do DOM; brak trzymania całego HTML w JS |
| Czas startu przeglądarki | Jedna instancja przeglądarki dla wszystkich booków, osobne konteksty |
| Bardzo duże dokumenty (tysiące stron) | Etap 3: tryb `volumes` — podział na tomy (wg `part`) generowane równolegle, każdy z własnym TOC; linki między tomami jako URL-e; **bez** scalania plików PDF w domyślnej ścieżce |

Cel wydajnościowy MVP (do zmierzenia na `fakeDocsGenerator`): 500 stron Markdown → PDF < 60 s na typowym laptopie,
pamięć przeglądarki < 2 GB. Pomiary faz w raporcie (`resolve`, `render`, `pass1`, `inspect`, `pass2`).

## 10. Obsługa błędów i diagnostyka

- Każde ostrzeżenie ma kod (`PDF_LINK_OUTSIDE_BOOK`, `PDF_MISSING_ANCHOR`, `PDF_MISSING_PAGE`, `PDF_EMPTY_GLOB`,
  `PDF_DUPLICATE_PAGE`, `PDF_OVERFLOW`, `PDF_BROWSER_TOO_OLD`) i lokalizację (plik, linia, jeśli znana).
- Timeout gotowości (domyślnie 120 s, konfigurowalny) z listą rozdziałów, które nie skończyły renderowania.
- Błędy JS z konsoli strony druku są przekazywane do wyjścia CLI.

## 11. Wersjonowanie i lokalizacje

- `book.locale` wybiera locale: sidebar, etykiety (`Spis treści`, `Strona`), `lang` dokumentu PDF.
- Przy buildzie wielowersyjnym (`versioning`) `greg pdf` działa per wersja (`--version <v>`); domyślnie bieżąca.
  Ścieżka wyjściowa może zawierać token `{version}`.
- Wbudowane teksty PDF dołączamy do istniejących tekstów locale (`localeUtils.ts`).

## 12. Furtki pod przyszłe API pluginów

Zamiast pełnego API — trzy stabilne punkty, z których PDF korzysta pierwszy:

1. **`markdown.remarkPlugins` / `markdown.rehypePlugins`** w konfiguracji — dołączane do list `PluginEntry`
   (z pozycją `before`/`after` nazwanego wpisu). Funkcje pluginów ładowane przez wirtualny moduł importów,
   bo konfiguracja trafia do przeglądarki jako dane (`vitePluginGregConfig`).
2. **`env.target`** (`'web' | 'pdf' | 'search'`) przekazywany do wszystkich pluginów remark/rehype
   (przez `file.data.greg.target`) — m.in. `web-only`/`pdf-only`, przepisywanie linków, indeks wyszukiwania.
3. **Rejestr tras specjalnych** (`/__pdf/…` jako pierwsza) i **rejestr komend CLI** w `bin/greg.js`
   (mapa `command → moduł`), zamiast rosnącego `switch`.

Gdy pojawi się drugi konsument tych punktów, można je opakować w `plugins: [ … ]` z hookami
`config`, `markdown`, `routes`, `cli`, bez przepisywania modułu PDF.

## 13. Testy

- **Jednostkowe (vitest)**: `resolveBook` (sidebar, section, glob, part, wykluczenia, duplikaty, błędy),
  `pageCss` (tokeny, strony nazwane), przepisywanie linków (tabela przypadków), kontenery `web-only`/`pdf-only`
  dla obu celów.
- **Integracyjne**: fixture docs w `__tests__/fixtures` → `greg pdf` → `pdfjs-dist`: liczba stron, outline,
  obecność tekstu `pdf-only`, brak tekstu `web-only`, poprawne cele linków wewnętrznych, numery w TOC = strony nagłówków.
  Uruchamiane tylko, gdy dostępny jest Chromium (`skipIf`).
- **Wydajnościowe**: `fakedocs` (500 / 2000 stron) — czas i pamięć; regresja > 20% jako ostrzeżenie.
- **Pilot**: dokumentacja KDS (`grill/kds/doc`) generowana z fragmentów `docs/` — kryteria §15.4, raport `--compare`.

## 14. Plan wdrożenia

| Etap | Zakres | Kryterium ukończenia |
|---|---|---|
| S | Spike'i: S1 strony nazwane + pola marginesu; S2 odczyt stron kotwic z PDF; S3 czas/pamięć dla 500 stron | Notatka z wynikami, decyzja o ewentualnych zmianach §7.4/§7.5 |
| 1 (MVP) | Typy + `resolveBook` + `vitePluginPdf`, trasa `/__pdf`, `web-only`/`pdf-only`/`.no-pdf`, okładka, **generowany TOC (bez numerów stron)**, **generowana numeracja** + ostrzeżenia `PDF_MANUAL_*`, nagłówki/stopki (bez `{chapter}`), linki wewnętrzne, outline, `greg pdf` + `--list` + **`--compare`** | KDS: kryteria §15.4 dla etapu 1 |
| 2 | Numery stron w TOC, `{chapter}`, numeracja w serwisie (opcjonalna), raport ostrzeżeń, `--strict`, cache Mermaid, panel podglądu z manifestem | Testy integracyjne zielone; KDS spełnia wszystkie kryteria §15.4; raport bez fałszywych alarmów na docs Grega |
| 3 | `volumes`, cache inkrementalny, `pdf.buildWithSite`, przycisk „Pobierz PDF” w serwisie, wersjonowanie, ewentualnie silnik Vivliostyle | Cel wydajnościowy dla 2000 stron |
| 4 | Furtki §12 jako publiczne API (`markdown.*Plugins`), dokumentacja w `docs/guide/pdf.md` (+ `pl/`) | Dokumentacja i przykład w README |

## 15. Pilot MVP: instrukcja KDS z fragmentów

**Zasada:** źródłem są wyłącznie fragmenty w `kds/doc/docs/`. `KDS-INSTRUKCJA-UZYTKOWNIKA.md` **nie** jest
wejściem i docelowo znika (wraz z `md-parts.mjs`, `map.json`, `00-poczatek.md` i ręcznym drukiem).
Obecny `KDS-INSTRUKCJA-UZYTKOWNIKA.pdf` jest **wzorcem treści** — monitorujemy różnice (`--compare`, §7.8)
i iteracyjnie dostosowujemy konfigurację i fragmenty. Wygląd ma być lepszy, więc nie jest porównywany automatycznie.

### 15.1 Stan wyjściowy fragmentów

| Fragment | Zawartość | Docelowo |
|---|---|---|
| `index.md` | Strona główna serwisu (`layout: home`) | Tylko serwis (`pdf: false`) |
| `00-poczatek.md` | Okładka i prawa autorskie (inline HTML, wysokości w px) + **ręczny spis treści** | **Usunięty.** Okładka i prawa autorskie → `pdf/cover.md` (tokeny `{version}`, `{date}`); spis treści generowany |
| `01-kds-instrukcja-uzytkownika.md` | `# KDS - instrukcja użytkownika`, `<style>` z regułami łamania, „Historia wersji” | „Historia wersji” jako strona bez numeru (`numbered: false`); `<style>` → `pdf/print.css` / motyw druku |
| `02-1-wprowadzenie.md` … `14-13-najczestsze-pytania.md` | `## 1. Wprowadzenie` … `## 13. …`, podrozdziały `###` | Opisowe nazwy plików, tytuły **bez numerów**, każda strona zaczyna się od `#` |
| `how-to/`, `diagnostyka/` | Pomoc tylko w serwisie | Tylko serwis (`exclude` lub `pdf: false`) |
| `../screeny/` | Zrzuty ekranu (ścieżki `screeny/…`) | Bez zmian |
| `greg.config.ts` | Sidebar z `map.json`, grupy przypisane po **tytułach z numerami** | Sidebar jawny, po ścieżkach plików — wspólna kolejność dla serwisu i PDF |

Wzorzec numeracji w obecnym PDF: numerowane są tylko rozdziały (`##` → „1.”–„13.”), podrozdziały nie.
Odpowiada to `numbering: { depth: 1, format: '1.' }`; głębszą numerację można włączyć później jedną opcją.

### 15.2 Ścieżka migracji (iteracje z monitorowaniem różnic)

Każdy krok kończy się `greg pdf instrukcja --compare ../KDS-INSTRUKCJA-UZYTKOWNIKA.pdf` i przeglądem raportu.
Wzorzec PDF kopiujemy raz do `pdf/reference/` (nie zmienia się w trakcie migracji).

| Krok | Zmiany | Oczekiwany raport `--compare` |
|---|---|---|
| 0. Linia bazowa | Book z `glob: '[0-9][0-9]-*.md'`, `exclude: '00-*'`, `numbering: false`, `cover: './pdf/cover.md'` (przeniesiona okładka) | Różnice tylko: brak ręcznego TOC (pomijany), okładka; treść rozdziałów 1:1 |
| 1. Numeracja generowana | Usunięcie numerów z tytułów `##` we fragmentach (skrypt), `numbering: { depth: 1 }`, „Historia wersji” `numbered: false`; aktualizacja `GROUPS` w `greg.config.ts` (tytuły bez numerów) | Bez zmian treści (numery są normalizowane); `PDF_MANUAL_NUMBER` = 0 |
| 2. Jednolite poziomy | Każdy fragment zaczyna się od `#` (tytuł strony), podrozdziały `##`; `headingShift: 'auto'` | Bez zmian treści; struktura TOC/zakładek jak we wzorcu |
| 3. Kolejność z sidebaru | Opisowe nazwy plików (`wprowadzenie.md`, …), sidebar jawny po ścieżkach w `greg.config.ts`, `content: [{ sidebar: true, groups: 'flatten', exclude: … }]`; poprawa linków między fragmentami (skrypt) | Bez zmian treści; 0 ostrzeżeń o linkach |
| 4. Sprzątanie | Usunięcie `00-poczatek.md`, `map.json`, `KDS-INSTRUKCJA-UZYTKOWNIKA.md`, `md-parts.mjs` z procesu; `<style>` z `01` do `pdf/print.css`; `npm run pdf` w `package.json` | Bez zmian treści |
| 5. Wygląd | Dopracowanie `pdf/print.css` i okładki (typografia, odstępy, tabele, obrazy z podpisami) | Bez zmian treści; ocena wizualna na podglądzie `/__pdf/instrukcja` |

Kroki 1–3 zmieniają też serwis (tytuły bez numerów, nowe adresy stron). Jeśli numery w serwisie są pożądane,
włączamy `numbering` w `GregConfig` (§7.7) — ta sama numeracja co w PDF.

### 15.3 Konfiguracja docelowa (po kroku 4)

```ts
pdf: {
    books: {
        instrukcja: {
            title: 'Instrukcja użytkownika',
            subtitle: 'KDS – Kitchen Display System',
            version: '0.0.10',
            output: 'dist/pdf/KDS-instrukcja-uzytkownika.pdf',
            content: [{ sidebar: true, groups: 'flatten', exclude: ['how-to/**', 'diagnostyka/**'] }],
            cover: './pdf/cover.md',            // okładka + prawa autorskie
            toc: { title: 'Spis treści', depth: 2, pageNumbers: true },
            numbering: { depth: 1, format: '1.' },
            headingShift: 'auto',
            page: {
                size: 'A4', margin: '20mm 18mm 18mm',
                header: { left: '{subtitle}', right: '{chapter}' },
                footer: { left: 'akt. {date}', right: '{page} / {pages}' },
                plainPages: ['cover', 'toc'],
            },
            css: './pdf/print.css',
        },
    },
},
```

### 15.4 Kryteria akceptacji pilota

| # | Kryterium | Etap |
|---|---|---|
| 1 | `greg pdf instrukcja` generuje PDF wyłącznie z fragmentów `docs/` + `pdf/` | 1 |
| 2 | Raport `--compare`: **0 różnic treści** w sekcjach (po normalizacji numerów i białych znaków) | 1 |
| 3 | Liczba obrazów w każdej sekcji zgodna ze wzorcem | 1 |
| 4 | Spis treści i numeracja **generowane**; brak numerów i ręcznego TOC we fragmentach (`PDF_MANUAL_*` = 0) | 1 (TOC bez numerów stron), 2 (z numerami stron) |
| 5 | Linki między rozdziałami i zakładki PDF działają | 1 |
| 6 | Wygląd co najmniej jak we wzorcu: nagłówek z tytułem rozdziału, stopka z numerem strony, rozdziały od nowej strony, brak osieroconych nagłówków i rozdzielonych obrazów z podpisami | 2 (ocena ręczna) |
| 7 | Czas generowania w raporcie; cel < 15 s dla ~57 stron | 1 |

## 16. Otwarte pytania

1. Czy trasa `/__pdf/<book>` ma być dostępna w produkcji jako „wersja do druku”? Propozycja: tylko dev/CLI,
   chyba że `pdf.publishPreview: true`.
2. Czy wspierać druk dwustronny (`mirrorMargins`, `chapterBreak: 'right'`) już w MVP?
3. Tokeny szablonu (`{chapter}`) vs. funkcje (`(ctx) => string`) — funkcje nie przejdą do przeglądarki bez
   serializacji; propozycja: tylko tokeny + własny CSS dla przypadków zaawansowanych.
4. ~~Czy `numbering` ma wpływać również na serwis?~~ Rozstrzygnięte: ten sam algorytm, w serwisie opcjonalnie (§7.7).
5. Domyślna przeglądarka na Linux CI: `chrome` czy fallback `npx playwright install chromium`?

## 18. Stan implementacji (MVP) i odstępstwa od projektu

### 18.1 Co działa

| Obszar | Implementacja |
|---|---|
| Manifest (§5) | `src/lib/pdf/resolveBook.js` — `sidebar` (całość/gałąź, `groups`, `exclude`), `glob` (+`sort`), `page`, `part`, frontmatter `pdf`, dedup, ostrzeżenia; `--list` |
| Kontenery (§5.4) | `web-only`, `pdf-only [book…]`, `page-break` w `remarkContainers.js` (filtr na AST wg `target`); klasy `.no-pdf` / `.pdf-only` |
| Trasa druku (§7.2) | `/__pdf/<book>` w `MarkdownDocs.svelte` → leniwie ładowany `PrintBook.svelte` (osobny chunk, serwis go nie ładuje); pasek stanu z ostrzeżeniami |
| Obróbka rozdziałów | `rehypePdfChapter.js` (prefiksy `id`, ścieżki względne także w surowym HTML, usunięcie permalinków) + `printDom.js` (poziomy, numeracja, linki, spis treści) |
| Szablon (§7.4) | `pageCss.js` — `@page`, pola marginesu z tokenami, strony nazwane dla `{chapter}`, strony `greg-plain` / `greg-cover`; `print.scss` |
| Spis treści z numerami stron (§7.5) | dwa przebiegi w CLI; numery z named destinations (pdf.js) |
| CLI (§8) | `greg pdf [book…] --list --dev --no-build --out --browser --compare --compare-skip --strict --open --timeout` |
| Porównanie (§7.8) | `compare.js` — ekstrakcja geometryczna, strefy marginesów, normalizacja, sekcje wg nagłówków (od końca), Myers + różnica zbiorów słów, status *layout only* |
| Typy, dokumentacja | `types/index.d.ts` (`PdfConfig`…), `docs/guide/pdf.md` + `docs/pl/guide/pdf.md` |
| Testy | `src/lib/pdf/__tests__` (manifest, glob, kontenery, CSS stron, przepisywanie URL, porównanie) |

### 18.2 Odstępstwa od projektu

1. **Brak `vitePluginPdf`.** Projekty użytkowników same wpinają pluginy w `vite.config`, więc nowy plugin wymagałby
   zmian u wszystkich. Dane potrzebne do manifestu już są w przeglądarce (`virtual:greg-config`,
   `virtual:greg-frontmatter`, menu z `MarkdownDocs`), a CLI liczy je w Node tymi samymi funkcjami
   (`collectFrontmatters` wydzielone z `vitePluginFrontmatter.js`, `docsUtils.js`). Jedna czysta funkcja
   `resolveBook` dla obu stron.
2. **Ścieżki `cover` i `css` są względne do `srcDir`** (np. `docs/__pdf/`), bo tylko katalog dokumentacji jest
   serwowany w dev i kopiowany do builda. Katalogi `__…` są ukryte w serwisie.
3. **`{chapter}` i numery stron w spisie treści weszły do MVP** — spike'i S1/S2 potwierdziły podejście.
4. **`chapterBreak: 'all'`** (nowa wartość) i **`dateFormat`** (format `{date}`).
5. **Furtki §12** zrealizowane częściowo: `MarkdownRenderer` przyjmuje `target`, `bookId`, `extraRehypePlugins`,
   `onrendered`; `getRemarkPluginEntries` / `getRehypePluginEntries` przyjmują opcje celu i dodatkowe wpisy.
   Publiczne `markdown.*Plugins` w konfiguracji — etap 4.

### 18.3 Ustalenia techniczne (Chromium / pdf.js)

- **Named destinations** powstają tylko dla elementów będących celem linków — spis treści linkuje każdy nagłówek,
  więc wszystkie pozycje są rozwiązywalne (`doc.getDestination(id)`; `getDestinations()` zwraca pusty obiekt).
- **Nazwy nie-ASCII** (slugi z polskimi znakami) nie są poprawnie dekodowane przez pdf.js → spis treści linkuje
  do kotwic `greg-toc-N` wstawianych na początku nagłówków.
- **Błąd Chromium:** nagłówek zaczynający się dokładnie w miejscu wymuszonego łamania jest dzielony na pusty fragment
  na poprzedniej stronie — destynacja wskazuje stronę za wcześnie, a tytuł zakładki jest zdublowany. Obejście:
  `padding-top: 1px` na sekcjach (`print.scss`).
- **`outline: true` wymaga `tagged: true`** w Playwright.
- **Wydajność:** highlighter Shiki był tworzony w każdej instancji `MarkdownRenderer` (30 instancji dla 30 stron);
  przeniesiony do `<script module>` → renderowanie dokumentacji Grega 4,0 s → 1,9 s.

### 18.4 Pilot KDS — krok 0 (§15.2)

Konfiguracja: `glob` po prefiksach, `numbering: false`, `headingShift: 0`, okładka i prawa autorskie przeniesione
z `00-poczatek.md` do `docs/__pdf/cover.md` (tokeny `{version}`, `{date}`), `{chapter}` w nagłówku.

| Miara | Wynik |
|---|---|
| Czas `greg pdf` (build + druk, 2 przebiegi) | ~8 s; tryb `--dev` ~10 s |
| Strony (wzorzec → wynik) | 57 → 67 (większe marginesy i odstępy, rozdziały od nowej strony) |
| Spis treści | 71/71 pozycji z numerami stron, zakładki zgodne |
| Obrazy | 59 → 59 |
| `--compare` | 75 sekcji: 59 identycznych, 7 *layout only* (tabele), 9 ze zmianami treści |

Wszystkie 9 różnic treści to zdania obecne w aktualnych fragmentach (i w `KDS-INSTRUKCJA-UZYTKOWNIKA.md`), których
nie ma we wzorcowym PDF — **wzorzec jest starszy niż źródła**. Przed krokiem 1 warto wygenerować nowy wzorzec
z kroku 0 (`dist/pdf/…`) i porównywać kolejne kroki z nim.

## 17. Źródła

- vitepress-export-pdf — https://github.com/condorheroblog/vitepress-export-pdf
- docs-to-pdf — https://github.com/jean-humann/docs-to-pdf
- docusaurus-prince-pdf — https://github.com/signcl/docusaurus-prince-pdf
- mkdocs-to-pdf — https://github.com/domWalters/mkdocs-to-pdf
- mkdocs-print-site-plugin — https://github.com/timvink/mkdocs-print-site-plugin
- mkdocs-exporter — https://github.com/adrienbrignon/mkdocs-exporter
- Antora PDF extension — https://docs.antora.org/pdf-extension/latest/
- Chrome: pola marginesu `@page` (Chrome 131) — https://developer.chrome.com/blog/css-page-margins/
- Playwright `page.pdf()` (`outline` wymaga `tagged`) — https://playwright.dev/docs/api/class-page#page-pdf
