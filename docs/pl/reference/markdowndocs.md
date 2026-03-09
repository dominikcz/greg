---
title: Komponent MarkdownDocs
---

`MarkdownDocs` to komponent najwyższego poziomu, który spina cały silnik dokumentacji: routing, sidebar, panel outline, wyszukiwarkę, tryb jasny/ciemny i Carbon Ads.

Zamontuj go w `src/App.svelte`:

```svelte
<script>
    import MarkdownDocs from '@dominikcz/greg'
</script>

<MarkdownDocs rootPath="/docs" version="1.0.0" />
```

## Właściwości

### `locales` (przez `greg.config.js`)

- **Typ:** `Record<string, LocaleConfig>`
- **Miejsce:** `greg.config.js` (to nie jest bezpośrednia właściwość komponentu)

Lokalizacja jest wspierana przez `greg.config.js`:

- klucze locale jak `'/'`, `'/pl/'`
- lokalne `lang`, `title`
- opcjonalne `label` (etykieta w przełączniku języka)
- lokalny `themeConfig`, m.in.: `nav`, `sidebar`, `outline`, `lastUpdatedText`, etykiety UI, `docFooter`, `siteTitle`, `logo`, `socialLinks`, `editLink`, `footer`, `aside`, `lastUpdated`

Zachowanie przełącznika języka:

- pojawia się w nagłówku, gdy są co najmniej 2 locale,
- dla `i18nRouting: true` (domyślnie) zachowuje względną stronę,
- dla `i18nRouting: false` przełącza na root locale,
- jeśli odpowiednia strona nie istnieje, robi fallback do root locale.

Ścieżki locale są rozwiązywane względem `rootPath`:

- `rootPath = '/docs'`
- `'/'` mapuje się na `'/docs'`
- `'/pl/'` mapuje się na `'/docs/pl'`

```js
export default {
  rootPath: '/docs',
  i18nRouting: true,
  locales: {
    '/': {
      lang: 'en-US',
      title: 'Docs',
      themeConfig: {
        nav: [{ text: 'Guide', link: '/docs/guide' }],
        sidebar: [{ text: 'Guide', auto: '/guide' }],
        outline: [2, 3],
        lastUpdatedText: 'Last updated:',
        langMenuLabel: 'Change language',
        sidebarMenuLabel: 'Menu',
        skipToContentLabel: 'Skip to content',
        returnToTopLabel: 'Return to top',
        darkModeSwitchLabel: 'Appearance',
        lightModeSwitchTitle: 'Switch to light theme',
        darkModeSwitchTitle: 'Switch to dark theme',
        docFooter: { prev: 'Previous', next: 'Next' },
      },
    },
    '/pl/': {
      lang: 'pl-PL',
      label: 'Polski',
      title: 'Dokumentacja',
      themeConfig: {
        nav: [{ text: 'Przewodnik', link: '/docs/pl/guide' }],
        sidebar: [{ text: 'Przewodnik', auto: '/guide' }],
        outline: { level: [2, 3], label: 'Na tej stronie' },
        lastUpdatedText: 'Zaktualizowano:',
        langMenuLabel: 'Zmień język',
        sidebarMenuLabel: 'Menu',
        skipToContentLabel: 'Przejdź do treści',
        returnToTopLabel: 'Wróć na górę',
        darkModeSwitchLabel: 'Wygląd',
        lightModeSwitchTitle: 'Przełącz na jasny motyw',
        darkModeSwitchTitle: 'Przełącz na ciemny motyw',
        docFooter: { prev: 'Poprzednia', next: 'Nastepna' },
      },
    },
  },
}
```

### `rootPath`

- **Typ:** `string`
- **Domyślnie:** `"/docs"`

Prefiks URL mapowany na katalog `docs/`. Musi zgadzać się z `rootPath` przekazanym do `vitePluginSearchIndex`.

```svelte
<MarkdownDocs rootPath="/documentation" version="1.0.0" />
```

### `version`

- **Typ:** `string`
- **Domyślnie:** `""`

Wersja pokazywana jako badge obok tytułu.

```svelte
<MarkdownDocs rootPath="/docs" version={__VERSION__} />
```

### `mainTitle`

- **Typ:** `string`
- **Domyślnie:** `"Greg"`

Nazwa projektu w lewym górnym rogu nagłówka.

```svelte
<MarkdownDocs rootPath="/docs" version="1.0.0" mainTitle="My Project" />
```

### `outline`

- **Typ:** `false | number | [number, number] | 'deep' | { level?: ..., label?: string }`
- **Domyślnie:** `[2, 3]`

Steruje prawym panelem **Outline**.

| Wartość                             | Efekt                              |
| ----------------------------------- | ---------------------------------- |
| `false`                             | panel outline jest ukryty          |
| `2`                                 | tylko nagłówki `h2`                |
| `[2, 3]`                            | `h2` i `h3` *(domyślnie)*          |
| `'deep'`                            | od `h2` do `h6`                    |
| `{ level: [2,4], label: 'Spis' }`   | własny zakres i etykieta panelu    |

```svelte
<MarkdownDocs rootPath="/docs" version="1.0.0" outline="deep" />
```

### `carbonAds`

- **Typ:** `{ code: string; placement: string } | undefined`
- **Domyślnie:** `undefined`

Renderuje blok [Carbon Ads](./carbon-ads) w panelu outline.

```svelte
<MarkdownDocs
  rootPath="/docs"
  version="1.0.0"
  carbonAds={{ code: 'CWYD42JW', placement: 'myprojectdev' }}
/>
```

### `children`

- **Typ:** `Snippet | undefined`

Renderowane, gdy aktywna ścieżka nie pasuje do żadnego pliku Markdown.

```svelte
<MarkdownDocs rootPath="/docs" version="1.0.0">
  {#snippet children()}
    <p>Wybierz stronę z sidebaru, aby zacząć.</p>
  {/snippet}
</MarkdownDocs>
```

## Konfiguracja Vite

`vitePluginSearchIndex` musi być dodany do `vite.config.js`, żeby zbudować indeks wyszukiwania:

```js
import { vitePluginSearchIndex } from '@dominikcz/greg/plugins';

export default defineConfig({
  plugins: [
    svelte(),
    vitePluginSearchIndex({ docsDir: 'docs', rootPath: '/docs' }),
  ],
  resolve: {
    alias: {
      '$components': resolve('./src/lib/components'),
    },
  },
});
```

| Opcja      | Opis                                                        |
| ---------- | ----------------------------------------------------------- |
| `docsDir`  | Katalog z plikami `.md` względem root projektu              |
| `rootPath` | Prefiks URL; musi zgadzać się z `rootPath` komponentu       |

## `svelte.config.js`

Pipeline Markdown konfigurujesz w `svelte.config.js`:

```js
const gregConfig = {
  markdown: {
    math: false,
  },
};
```

## Model rozszerzeń runtime

`MarkdownRenderer.svelte` deleguje punkty rozszerzeń do `src/lib/MarkdownDocs/markdownRendererRuntime.ts`.

### 1) Rejestr hydracji komponentów

`COMPONENT_REGISTRY` mapuje nazwę taga na:

- komponent Svelte,
- funkcję `buildProps(el)`.

To jest używane np. dla tagów `badge`, `button`, `image`, `link`, `codegroup`.

### 2) Rejestry pluginów Markdown

Pipeline jest składany z dwóch uporządkowanych rejestrów:

- `getRemarkPluginEntries(baseUrl, docsPrefix)`
- `getRehypePluginEntries()`

Obejmują m.in.:

- kontenery niestandardowe (`remarkContainers` + `rehypeContainers`)
- bloki kodu (`rehypeShiki`, `rehypeCodeTitle`, `rehypeCodeGroup`)
- preprocessing Mermaid (`rehypeMermaid`)
- normalizacja Steps (`rehypeStepsWrapper`)
- nagłówki/TOC (`rehypeSlug`, `rehypeAutolinkHeadings`, `rehypeTocPlaceholder`)

### 3) Handlery renderowania (post-HTML)

Po renderze HTML uruchamiane są handlery z list:

- `RUNTIME_RENDER_HANDLERS`
- `THEME_CHANGE_RENDER_HANDLERS`

Obecne handlery obejmują hydrację komponentów i inicjalizację/odświeżanie Mermaid.

## Gdzie rozszerzać

- użyj **component registry** dla interaktywnych widgetów renderowanych z tagów,
- użyj **rehype/remark registries** dla transformacji statycznego HTML,
- użyj **render handlers** dla logiki działającej w przeglądarce na żywym DOM
  (np. silniki diagramów).
