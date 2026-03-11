---
title: Wyszukiwanie
---

Greg zawiera wbudowane wyszukiwanie peĹ‚notekstowe oparte na [Fuse.js](https://fusejs.io/).
Nie wymaga zewnÄ™trznej usĹ‚ugi ani klucza API.

## Tryby wyszukiwania

Tryb wyszukiwania konfigurujesz w `greg.config.js`:

```js
search: {
  provider: 'server', // 'server' | 'local' | 'none'
  // serverUrl: '/api/search'
}
```

- `server`: PrzeglÄ…darka pyta `GET /api/search?q=...` i otrzymuje gotowe wyniki. Polecane dla duĹĽych zestawĂłw dokumentacji (domyĹ›lnie najlepszy wybĂłr).
- `local`: PrzeglÄ…darka pobiera `/search-index.json` i uruchamia Fuse.js lokalnie. Polecane dla maĹ‚ych zestawĂłw dokumentacji.
- `none`: Wbudowane UI wyszukiwania (przycisk + modal + skrĂłty) jest wyĹ‚Ä…czone. Polecane dla stron bez wbudowanego search.

`server` to zwykle najlepszy domyĹ›lny wybĂłr dla wiÄ™kszych zbiorĂłw dokumentacji.

## Jak dziaĹ‚a indeksowanie

W czasie **builda** `vitePluginSearchIndex` przechodzi po wszystkich plikach `.md`
w folderze docs, usuwa skĹ‚adniÄ™ Markdown, dzieli strony na sekcje (po nagĹ‚Ăłwkach)
i zapisuje `/search-index.json` do katalogu wyjĹ›ciowego Vite.

W czasie **dziaĹ‚ania**:

- w trybie `local` modal pobiera `/search-index.json` i szuka po stronie przeglÄ…darki,
- w trybie `server` modal odpytuje endpoint ustawiony w `serverUrl`.

## Wymagane pluginy Vite

UĹĽyj obu pluginĂłw w `vite.config.js`:

```js
import { vitePluginSearchIndex, vitePluginSearchServer } from '@dominikcz/greg/plugins';

export default defineConfig({
  plugins: [
    svelte(),
    vitePluginSearchIndex({ docsDir: 'docs', srcDir: '/docs' }),
    vitePluginSearchServer({ docsDir: 'docs', srcDir: '/docs' }),
  ],
});
```

`vitePluginSearchServer` automatycznie wystawia `/api/search` zarĂłwno w `dev`,
jak i w `preview`.

## Serwer wyszukiwania w produkcji

Najpierw zbuduj stronÄ™:

```bash
npm run build
```

NastÄ™pnie uruchom osobny serwer wyszukiwania:

```bash
greg search-server --index dist/search-index.json --port 3100
```

Ustaw `serverUrl` na ten endpoint, np.:

```js
search: {
  provider: 'server',
  serverUrl: 'http://localhost:3100/api/search'
}
```

W produkcji zwykle wystawisz ten serwer za reverse proxy, ĹĽeby frontend nadal
korzystaĹ‚ z `/api/search`.

## WĹ‚asny silnik wyszukiwania

JeĹ›li chcesz uĹĽyÄ‡ Algolii, Meilisearch, Typesense albo wĹ‚asnego backendu:

- ustaw `provider: 'none'` w `greg.config.js`,
- przekaz prop `searchProvider` do `<MarkdownDocs>`.

Po przekazaniu `searchProvider` Greg ponownie wĹ‚Ä…czy przycisk i modal
wyszukiwania, a zapytania bÄ™dÄ… przechodziÄ‡ przez TwojÄ… funkcjÄ™.

Sygnatura `searchProvider`:

```ts
(query: string, limit?: number) => Promise<SearchResult[]>
```

Oczekiwany ksztaĹ‚t `SearchResult`:

```ts
type SearchResult = {
  id: string;
  title: string;
  titleHtml: string;
  sectionTitle: string;
  sectionTitleHtml?: string; // opcjonalne, ale zalecane dla spĂłjnego podĹ›wietlania nagĹ‚ĂłwkĂłw
  sectionAnchor: string;
  excerptHtml: string;
  score: number;
}
```

`sectionTitleHtml` jest teraz uĹĽywane przez wbudowany modal do renderowania
podĹ›wietleĹ„ nagĹ‚ĂłwkĂłw. JeĹ›li go brakuje, Greg uĹĽyje bezpiecznego `sectionTitle`
bez semantycznych znacznikĂłw dopasowania.

## Otwieranie wyszukiwarki

| Metoda                                        | Akcja         |
| --------------------------------------------- | ------------- |
| KlikniÄ™cie przycisku **Szukaj...** w headerze | Otwiera modal |
| `Ctrl + K`                                    | Otwiera modal |
| `Cmd + K` (macOS)                             | Otwiera modal |

## Nawigacja klawiaturÄ… w modalu

| Klawisz   | Akcja                               |
| --------- | ----------------------------------- |
| `â†‘` / `â†“` | Wybierz poprzedni / nastÄ™pny wynik  |
| `Enter`   | PrzejdĹş do zaznaczonego wyniku      |
| `Esc`     | Zamknij modal                       |

## Ranking wynikĂłw

Wyniki sÄ… oceniane przez Fuse.js na podstawie wag dla pĂłl:

| Pole             | Waga |
| ---------------- | ---- |
| TytuĹ‚ strony     | 3x   |
| NagĹ‚Ăłwek sekcji  | 2x   |
| TreĹ›Ä‡ sekcji     | 1x   |

UĹĽywany jest fuzzy threshold `0.4` (ciaĹ›niejszy niĹĽ domyĹ›lny), dziÄ™ki czemu do
wynikĂłw trafiajÄ… gĹ‚Ăłwnie rzeczywiste dopasowania. `ignoreLocation: true`
oznacza, ĹĽe dopasowanie moĹĽe wystÄ…piÄ‡ w dowolnym miejscu tekstu, nie tylko na
poczÄ…tku.

## Wykluczanie stron z indeksu

Pliki, ktĂłrych nazwa zaczyna siÄ™ od `__` (podwĂłjne podkreĹ›lenie), sÄ… automatycznie
pomijane zarĂłwno w routingu, jak i w indeksie wyszukiwania.

## Ograniczenia

- W trybie `local` duĹĽe indeksy mogÄ… znaczÄ…co zwiÄ™kszyÄ‡ rozmiar payloadu i zuĹĽycie pamiÄ™ci w przeglÄ…darce.
- W trybie `server` endpoint wyszukiwania musi byÄ‡ osiÄ…galny z klienta (`serverUrl` musi byÄ‡ poprawny dla danego Ĺ›rodowiska).
- ZawartoĹ›Ä‡ blokĂłw kodu jest usuwana z indeksu (nie jest przeszukiwalna).
