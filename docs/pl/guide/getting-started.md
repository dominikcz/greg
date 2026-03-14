---
title: Pierwsze kroki
order: 1
---

## Czym jest Greg?

Greg to **silnik dokumentacji oparty na Svelte 5 i Vite**. Piszesz treść
w zwykłych plikach Markdown, a Greg zamienia je w szybki, dopracowany serwis
SPA — z nawigacją w sidebarze, wyszukiwaniem pełnotekstowym, trybem
jasnym/ciemnym, podświetlaniem składni kodu i bogatym zestawem rozszerzeń
Markdown.

Greg jest zainspirowany [VitePress](https://vitepress.dev){target="_blank" rel="noopener noreferrer"} i korzysta z większości jego składni
Markdown oraz konwencji konfiguracyjnych, ale działa na Svelte 5 zamiast Vue.
Jeśli znasz VitePress, poczujesz się jak w domu.

## Wymagania

Zanim zaczniesz, upewnij się, że masz zainstalowane:

| Narzędzie | Wymagana wersja | Jak sprawdzić     |
| --------- | --------------- | ----------------- |
| Node.js   | ≥ 18            | `node --version`  |
| npm       | dołączony do Node | `npm --version` |

Svelte ani Vite **nie trzeba** instalować osobno — zajmuje się tym kreator
`init` albo ręczny krok instalacyjny.

---

## Opcja A — Nowy projekt od zera

To zalecana ścieżka, gdy zaczynasz bez żadnego istniejącego kodu.

### 1. Utwórz pusty folder i wejdź do niego

```sh
mkdir moje-docs
cd moje-docs
```

### 2. Uruchom interaktywny inicjalizator

```sh
npx @dominikcz/greg init
```

Kreator zada kilka pytań:

| Pytanie | Co robi |
| ------- | ------- |
| **Katalog dokumentacji** | Gdzie będą Twoje pliki Markdown. Domyślnie: `docs` |
| **Tytuł strony** | Wyświetlany w zakładce przeglądarki i nagłówku serwisu |
| **Opis** | Trafia do tagu HTML `<meta>` |
| **TypeScript** | Tworzy pliki konfiguracyjne `.ts` zamiast `.js` |
| **Tryb konfiguracji** | Wybór szablonu **minimalnego** (domyślnie) albo **pełnego** `greg.config` |
| **Skrypty npm** | Dodaje `greg`, `dev`, `build` i `preview` do `package.json` |
| **Treść startowa** | _Pusta_ — minimum; _Przykładowa_ — gotowe strony; _Generowana_ — duży zestaw fałszywej dokumentacji |
| **Zainstaluj teraz** | Uruchamia `npm install` (lub Twój package manager) od razu |

Po zakończeniu zobaczysz podsumowanie utworzonych plików.
Dodatkowo scaffold zawiera domyślny `.gitignore` i kopiuje podstawowe assety do `public/`.

### 3. Uruchom serwer developerski

```sh
npm run dev
```

Otwórz `http://localhost:5173` w przeglądarce — Twoja dokumentacja działa.
Za każdym razem, gdy zapiszesz plik `.md`, strona odświeży się natychmiast
bez przeładowania.

### 4. Napisz swoją pierwszą stronę

Edytuj lub utwórz dowolny plik `.md` w folderze `docs/`:

```md
<!-- docs/guide/moja-pierwsza-strona.md -->
---
title: Moja pierwsza strona
---

# Witaj w Greg!

To jest moja pierwsza strona dokumentacji.
```

Po zapisaniu strona pojawi się w sidebarze i będzie dostępna pod adresem
`/guide/moja-pierwsza-strona`.

---

## Opcja B — Dodaj Greg do istniejącego projektu

Użyj tej ścieżki, gdy masz już projekt Vite (np. aplikację Svelte) i chcesz
dodać do niego sekcję dokumentacji.

### 1. Zainstaluj pakiety

```sh
npm install --save-dev @dominikcz/greg @sveltejs/vite-plugin-svelte svelte vite
```

### 2. Utwórz pliki konfiguracyjne

**`greg.config.js`** — ustawienia serwisu:

```js
export default {
    srcDir: 'docs',     // folder z plikami .md
    docsBase: '',       // prefiks URL — '' oznacza, że docs są pod głównym URL
    mainTitle: 'Moje Docs',
    sidebar: 'auto',    // automatyczny sidebar na podstawie struktury folderów
}
```

`srcDir` może też być tablicą, jeśli źródła Markdown są podzielone na kilka folderów:

```js
export default {
  srcDir: ['docs', 'api-docs', 'handbook'],
  docsBase: '',
}
```

W takim wariancie Greg skanuje wszystkie wskazane katalogi i zbiera z nich pliki `.md`.

**`svelte.config.js`** — re-eksportuj wbudowaną konfigurację Svelte z Greg
(zawiera mdsvex do przetwarzania Markdown):

```js
export { default } from '@dominikcz/greg/svelte.config'
```

**`vite.config.js`** — zarejestruj pluginy Vite Greg:

```js
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import {
    vitePluginGregConfig,
    vitePluginSearchIndex,
    vitePluginSearchServer,
    vitePluginFrontmatter,
    vitePluginCopyDocs,
} from '@dominikcz/greg/plugins'

const docsDir = ['docs', 'api-docs', 'handbook']
const docsBase = ''

export default defineConfig({
    plugins: [
        svelte(),
        vitePluginGregConfig(),
        vitePluginSearchIndex({ docsDir, srcDir: docsBase }),
        vitePluginSearchServer({ docsDir, srcDir: docsBase }),
        vitePluginFrontmatter({ docsDir, srcDir: docsBase }),
        vitePluginCopyDocs({ docsDir, srcDir: docsBase }),
    ],
})
```

  `docsDir` w pluginach Vite Greg przyjmuje `string` (jeden folder) albo `string[]` (wiele folderów).

**`index.html`** — minimalny punkt wejścia HTML:

```html
<!doctype html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Moje Docs</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

**`src/main.js`** — punkt wejścia Vite:

```js
import App from './App.svelte'
import { mount } from 'svelte'

const app = mount(App, { target: document.getElementById('app') })
export default app
```

**`src/App.svelte`** — montuje silnik dokumentacji:

```svelte
<script>
    import MarkdownDocs from '@dominikcz/greg'
</script>

<MarkdownDocs />
```

### 3. Utwórz pierwszą stronę Markdown

```sh
mkdir docs
```

```md
<!-- docs/index.md -->
---
title: Strona główna
---

# Witaj

To jest strona główna mojej dokumentacji.
```

### 4. Dodaj skrypty do `package.json`

```json
{
  "scripts": {
    "dev":     "greg dev",
    "build":   "greg build",
    "preview": "greg preview"
  }
}
```

Następnie uruchom:

```sh
npm run dev
```

---

## Struktura projektu — omówienie

Po konfiguracji Twój projekt będzie wyglądał mniej więcej tak:

```text
.
├─ docs/                  ← cała treść Markdown jest tutaj
│  ├─ index.md            ← strona główna (dostępna pod głównym URL)
│  ├─ guide/
│  │  ├─ index.md         ← strona startowa sekcji
│  │  └─ pierwsze-kroki.md
│  └─ reference/
├─ src/
│  ├─ App.svelte          ← montuje <MarkdownDocs> (rzadko wymaga edycji)
│  └─ main.js             ← punkt wejścia Vite
├─ svelte.config.js       ← opcje Svelte + mdsvex (musi być zwykłym .js)
├─ vite.config.js         ← Vite z pluginami Greg
├─ greg.config.js         ← tytuł, sidebar, nav, locale, wyszukiwanie …
└─ package.json
```

Najważniejsze zasady:
- Każdy plik `.md` w `docs/` staje się stroną. URL odpowiada ścieżce pliku.
- Pliki i foldery, których nazwa zaczyna się od `__` (podwójny podkreślnik),
  **nie** są zamieniane na strony — używaj ich do fragmentów i wspólnych
  fragmentów kodu.
- `index.md` w dowolnym folderze jest dostępny pod URL tego folderu (np.
  `docs/guide/index.md` → `/guide`).

## Plik `greg.config.js`

To główny plik konfiguracyjny. Najczęściej używane opcje:

```js
export default {
    srcDir: 'docs',           // ścieżka do plików Markdown
    docsBase: '',             // prefiks URL dla wszystkich stron docs
    mainTitle: 'Moje Docs',   // tytuł serwisu w nagłówku
    sidebar: 'auto',          // 'auto' buduje sidebar ze struktury folderów

    // Ręczny sidebar (opcjonalnie):
    // sidebar: [
    //   { text: 'Przewodnik', auto: '/guide' },
    //   { text: 'Referencje', auto: '/reference' },
    // ],

    // Pasek nawigacji górnej (opcjonalnie):
    // nav: [
    //   { text: 'Przewodnik', link: '/guide' },
    //   { text: 'Referencje', link: '/reference' },
    // ],

    outline: [2, 3],          // pokazuj h2 i h3 w konspekcie strony
}
```

Pełna lista opcji: [`<MarkdownDocs>` reference](/reference/markdowndocs).

## Serwer developerski

```sh
npm run dev
# odpowiednik: greg dev
```

- Działa domyślnie pod `http://localhost:5173`
- Zapis pliku Markdown wyzwala natychmiastowy HMR — bez pełnego przeładowania
- Indeks wyszukiwania jest aktualizowany automatycznie w tle

## Build produkcyjny

```sh
npm run build
# odpowiednik: greg build
```

Wynik trafia do folderu `dist/`. Build:
- Preprocessuje wszystkie metadane stron i indeks wyszukiwania
- Bundluje i optymalizuje CSS oraz JavaScript
- Kopiuje pliki Markdown, by można je było serwować statycznie

Folder `dist/` można wdrożyć na dowolnym hostingu statycznym.
Szczegółowe instrukcje: [Wdrażanie](./deploying).

## Kolejne kroki

Teraz, gdy Twój serwis działa, sprawdź kolejne tematy:

- **[Rozszerzenia Markdown](./markdown)** — tabele, grupy kodu, callouts,
  matematyka, diagramy i więcej
- **[Routing](./routing)** — jak URL-e są wyprowadzane ze ścieżek plików
- **[Lokalizacja](./localization)** — dokumentacja wielojęzyczna z automatycznymi
  tłumaczeniami UI
- **[Wyszukiwanie](../reference/search)** — konfiguracja wyszukiwania pełnotekstowego
- **[Wdrażanie](./deploying)** — publikacja na GitHub Pages, Netlify, Vercel itd.
