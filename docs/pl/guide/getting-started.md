---
title: Pierwsze kroki
order: 1
---

## Czym jest Greg?

Greg to silnik dokumentacji oparty o Svelte 5 i Vite. Piszesz treść w plikach Markdown, wrzucasz je do `docs/`, a Greg buduje szybki serwis dokumentacji SPA z sidebarem, wyszukiwaniem i trybem jasnym/ciemnym.

Projekt jest inspirowany [VitePress](https://vitepress.dev){target="_blank" rel="noopener noreferrer"}, ale działa na Svelte 5 zamiast Vue.

## Dlaczego Greg?

Greg jest dostrojony do dużych zbiorów dokumentacji: metadane są preprocesowane, nawigacja jest przewidywalna, a wyszukiwarka skaluje się do wielu stron.

Ten kierunek daje wysoką zgodność konfiguracyjną z VitePress, ale część API
runtime i funkcji platformowych jest celowo inna.

## Wymagania

| Wymaganie | Wersja |
| --------- | ------ |
| Node.js   | >= 18  |
| Svelte    | 5.x    |
| Vite      | 7.x    |

## Szybki start

```sh
npx @dominikcz/greg init
```

Kreator zapyta o:

- ścieżkę dokumentacji (domyślnie `./docs`)
- tytuł i opis strony
- użycie TypeScript
- skrypty `package.json`
- zawartość startową dokumentacji
- instalację zależności

Na końcu wystarczy:

```sh
npm run dev
```

## Ręczna instalacja

```sh
npm install --save-dev @dominikcz/greg @sveltejs/vite-plugin-svelte svelte vite
```

## Struktura projektu

```text
.
├─ docs/
│  ├─ index.md
│  ├─ guide/
│  └─ reference/
├─ src/
│  ├─ App.svelte
│  └─ main.js
├─ svelte.config.js       ← opcje mdsvex (musi być .js)
├─ vite.config.js         ← konfiguracja Vite + pluginy Greg
├─ greg.config.js         ← tytuł strony, sidebar, outline ...
└─ package.json
```

Katalog `docs/` to root treści. Każdy `.md` (poza plikami zaczynającymi się od
`__`) staje się stroną dostępną pod odpowiadającą ścieżką.

## Montowanie silnika

```svelte
<script>
    import MarkdownDocs from '@dominikcz/greg'
</script>

<MarkdownDocs />
```

Pełna lista propsów: [`<MarkdownDocs>`](/reference/markdowndocs).

## Serwer developerski

```sh
npm run dev
# albo: greg dev
```

Domyślnie strona działa pod `http://localhost:5173`.
Zmiany w plikach `.md` są odświeżane przez HMR.

## Build produkcyjny

```sh
npm run build
# albo: greg build
```

Wynik trafia do `dist/`. Szczegóły hostingu: [Wdrażanie](./deploying).
