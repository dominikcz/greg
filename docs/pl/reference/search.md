---
title: Wyszukiwanie
---

Greg zawiera wbudowane wyszukiwanie pełnotekstowe oparte na [Fuse.js](https://fusejs.io/).
Nie wymaga zewnętrznej usługi ani klucza API.

## Tryby wyszukiwania

Tryb wyszukiwania konfigurujesz w `greg.config.js`:

```js
search: {
  provider: 'server', // 'server' | 'local' | 'none'
  // serverUrl: '/api/search'
}
```

- `server`: Przeglądarka pyta `GET /api/search?q=...` i otrzymuje gotowe wyniki. Polecane dla dużych zestawów dokumentacji (domyślnie najlepszy wybór).
- `local`: Przeglądarka pobiera `/search-index.json` i uruchamia Fuse.js lokalnie. Polecane dla małych zestawów dokumentacji.
- `none`: Wbudowane UI wyszukiwania (przycisk + modal + skróty) jest wyłączone. Polecane dla stron bez wbudowanego search.

## Jak działa indeksowanie

W czasie **builda** `vitePluginSearchIndex` przechodzi po wszystkich plikach `.md`
w folderze docs, usuwa składnię Markdown, dzieli strony na sekcje (po nagłówkach)
i zapisuje `/search-index.json` do katalogu wyjściowego Vite.

W czasie **działania**:

- w trybie `local` modal pobiera `/search-index.json` i szuka po stronie przeglądarki,
- w trybie `server` modal odpytuje endpoint ustawiony w `serverUrl`.

## Wymagane pluginy Vite

Użyj obu pluginów w `vite.config.js`:

```js
import { vitePluginSearchIndex, vitePluginSearchServer } from '@dominikcz/greg/plugins';

export default defineConfig({
  plugins: [
    svelte(),
    vitePluginSearchIndex({ docsDir: 'docs', srcDir: '/' }),
    vitePluginSearchServer({ docsDir: 'docs', srcDir: '/' }),
  ],
});
```

`vitePluginSearchServer` automatycznie wystawia `/api/search` zarówno w `dev`,
jak i w `preview`.

## Serwer wyszukiwania w produkcji

Najpierw zbuduj stronę:

```bash
npm run build
```

Następnie uruchom osobny serwer wyszukiwania:

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

### Strojenie serwera dla dużych indeksów

Dla bardzo dużych zestawów dokumentacji możesz stroić standalone `greg search-server`
bezpośrednio z `greg.config.js`:

```js
search: {
  provider: 'server',
  serverUrl: 'http://localhost:3100/api/search',
  server: {
    preloadShards: true,
    maxLoadedShards: 32,
    shardCandidates: 6,
  }
}
```

- `preloadShards` (domyślnie: `true`) preloaduje indeksy shardów przy starcie, aby zmniejszyć opóźnienia zapytań.
- `maxLoadedShards` ogranicza liczbę indeksów Fuse shardów trzymanych w pamięci.
- `shardCandidates` określa, ile najbardziej prawdopodobnych shardów jest przeszukiwanych najpierw.

Kolejność rozwiązywania konfiguracji:

1. Flagi CLI (`greg search-server --...`)
2. Zmienne środowiskowe (`GREG_SEARCH_*`)
3. `greg.config.js > search.server`
4. Wbudowane wartości domyślne

Obsługiwane runtime overrides:

- `--preload-shards` / `GREG_SEARCH_PRELOAD_SHARDS`
- `--max-loaded-shards` / `GREG_SEARCH_MAX_LOADED_SHARDS`
- `--shard-candidates` / `GREG_SEARCH_SHARD_CANDIDATES`

Build wypisuje też rozmiary wygenerowanych assetów wyszukiwania (pełny indeks + shardy).

Generowanie shardów podczas builda możesz kontrolować przez `GREG_SEARCH_SHARDS`:

- `GREG_SEARCH_SHARDS=32` (domyślnie) generuje 32 pliki shardów.
- `GREG_SEARCH_SHARDS=64` zwiększa liczbę shardów.
- `GREG_SEARCH_SHARDS=0` (lub `false` / `off` / `no`) wyłącza generowanie shardów i zostawia tylko `search-index.json`.

Przy bardzo dużych dokumentacjach może być też potrzebny większy heap Node.js podczas builda:

```bash
NODE_OPTIONS=--max-old-space-size=8192 npm run build
```

W Windows PowerShell:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run build
```

W produkcji zwykle wystawisz ten serwer za reverse proxy, żeby frontend nadal
korzystał z `/api/search`.

## Własny silnik wyszukiwania

Jeśli chcesz użyć Algolii, Meilisearch, Typesense albo własnego backendu:

- ustaw `provider: 'none'` w `greg.config.js`,
- przekaz prop `searchProvider` do `<MarkdownDocs>`.

Po przekazaniu `searchProvider` Greg ponownie włączy przycisk i modal
wyszukiwania, a zapytania będą przechodzić przez Twoją funkcję.

Sygnatura `searchProvider`:

```ts
(query: string, limit?: number) => Promise<SearchResult[]>
```

Oczekiwany kształt `SearchResult`:

```ts
type SearchResult = {
  id: string;
  title: string;
  titleHtml: string;
  sectionTitle: string;
  sectionTitleHtml?: string; // opcjonalne, ale zalecane dla spójnego podświetlania nagłówków
  sectionAnchor: string;
  excerptHtml: string;
  score: number;
}
```

`sectionTitleHtml` jest teraz używane przez wbudowany modal do renderowania
podświetleń nagłówków. Jeśli go brakuje, Greg użyje bezpiecznego `sectionTitle`
bez semantycznych znaczników dopasowania.

## Otwieranie wyszukiwarki

| Metoda                                        | Akcja         |
| --------------------------------------------- | ------------- |
| Kliknięcie przycisku **Szukaj...** w headerze | Otwiera modal |
| `Ctrl + K`                                    | Otwiera modal |
| `Cmd + K` (macOS)                             | Otwiera modal |

## Nawigacja klawiaturą w modalu

| Klawisz   | Akcja                              |
| --------- | ---------------------------------- |
| `↑` / `↓` | Wybierz poprzedni / następny wynik |
| `Enter`   | Przejdź do zaznaczonego wyniku     |
| `Esc`     | Zamknij modal                      |

## Ranking wyników

Wyniki są oceniane przez Fuse.js na podstawie wag dla pól:

| Pole            | Waga |
| --------------- | ---- |
| Tytuł strony    | 3x   |
| Nagłówek sekcji | 2x   |
| Treść sekcji    | 1x   |

Używany jest fuzzy threshold `0.4` (ciaśniejszy niż domyślny), dzięki czemu do
wyników trafiają głównie rzeczywiste dopasowania. `ignoreLocation: true`
oznacza, że dopasowanie może wystąpić w dowolnym miejscu tekstu, nie tylko na
początku.

## Wykluczanie stron z indeksu

Pliki, których nazwa zaczyna się od `__` (podwójne podkreślenie), są automatycznie
pomijane zarówno w routingu, jak i w indeksie wyszukiwania.

## Ograniczenia

- W trybie `local` duże indeksy mogą znacząco zwiększyć rozmiar payloadu i zużycie pamięci w przeglądarce.
- W trybie `server` endpoint wyszukiwania musi być osiągalny z klienta (`serverUrl` musi być poprawny dla danego środowiska).
- Zawartość bloków kodu jest usuwana z indeksu (nie jest przeszukiwalna).

## Baza wiedzy AI

Funkcja AI dodaje zakładkę **Zapytaj AI** do modalu wyszukiwania. Wykorzystuje
pipeline RAG (retrieval-augmented generation): dokumenty są porcjowane i
wektoryzowane podczas builda, a pasujące fragmenty są dołączane jako kontekst
do każdego zapytania do modelu językowego.

Włącz w `greg.config.js`:

```js
search: {
  ai: {
    enabled: true,
    provider: 'ollama', // lub 'openai'
    ollama: { model: 'gpt-oss' },
  }
}
```

Wymagany plugin Vite (`vitePluginAiServer`) oraz konfiguracja serwera AI w
produkcji opisane są w [Przewodniku po rozpoczęciu pracy](/docs/pl/guide/getting-started).

### Przechowywanie danych AI w runtime

W `dev`/`preview` (`vitePluginAiServer`) Greg używa pamięciowego store'a wektorowego
(`MemoryStore`). Chunks są przebudowywane przy starcie oraz po zmianach plików Markdown,
więc zindeksowane dane AI nie są utrwalane między restartami procesu.

W produkcji preferuj standalone `greg ai-server`, który może używać trwałego
store'a opartego o SQLite (`search.ai.store = 'sqlite'`).

### Postaci AI (persony)

Greg zawiera pięć wbudowanych person, które użytkownik może wybrać w interfejsie czatu:

| ID             | Nazwa        | Ikona | Opis                                        |
| -------------- | ------------ | ----- | ------------------------------------------- |
| `professional` | Professional | 👔     | Precyzyjne, formalne, techniczne odpowiedzi |
| `friendly`     | Friendly     | 😊     | Ciepłe, przystępne wyjaśnienia              |
| `pirate`       | Pirate       | 🏴‍☠️    | Arr! Wiedza na falach kodu!                 |
| `sensei`       | Sensei       | 🥋     | Cierpliwy nauczyciel, krok po kroku         |
| `concise`      | Concise      | ✂️     | Maksimum treści, minimum słów               |

#### Ograniczenie dostępnych postaci

Przekaż tablicę ID, aby pokazać tylko wybrane persony:

```js
ai: {
  characters: ['professional', 'friendly', 'concise'],
}
```

Pusta tablica (lub brak klucza) oznacza, że dostępne są wszystkie pięć postaci.

#### Ustawienie domyślnej postaci

```js
ai: {
  defaultCharacter: 'friendly',
}
```

Jeśli nie podano, domyślnie wybrana jest `'professional'`.

#### Definiowanie własnych postaci

Dodaj własne persony przez `customCharacters`.
Własny wpis z tym samym `id` co wbudowana postać **nadpisuje** wbudowaną.

```js
import { aiCharacters } from '@dominikcz/greg/plugins';

ai: {
  // Możesz sprawdzić wbudowane ID przez wyeksportowaną tablicę aiCharacters.
  // console.log(aiCharacters.map(c => c.id));

  customCharacters: [
    {
      id: 'mybot',
      name: 'Mój Bot',
      icon: '🤖',
      description: 'Asystent dostosowany do tego projektu',
      systemPrompt: 'Jesteś pomocnym asystentem specjalizującym się w tym projekcie. Zawsze odpowiadaj w języku pytania użytkownika.',
    },
  ],
  // Opcjonalnie ogranicz do własnej postaci i jednej wbudowanej:
  characters: ['professional', 'mybot'],
}
```

`customCharacters` jest scalane z listą wbudowaną przed zastosowaniem filtra `characters`.
Eksport `aiCharacters` służy głównie do podglądu — możesz sprawdzić ID wbudowanych
person lub programowo rozszerzyć ich system prompty.

Typ `AiCharacterConfig` (z `@dominikcz/greg/types`):

```ts
type AiCharacterConfig = {
  id: string;
  name: string;
  icon: string;
  description?: string;
  systemPrompt: string;
};
```
