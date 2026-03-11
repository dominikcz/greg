---
title: Komponent MarkdownDocs
---

`MarkdownDocs` to komponent najwyĹĽszego poziomu, ktĂłry spina caĹ‚y silnik dokumentacji: routing, sidebar, panel outline, wyszukiwarkÄ™, tryb jasny/ciemny i Carbon Ads.

Zamontuj go w `src/App.svelte`:

```svelte
<script>
    import MarkdownDocs from '@dominikcz/greg'
</script>

<MarkdownDocs srcDir="/docs" version="1.0.0" />
```

## WĹ‚aĹ›ciwoĹ›ci

### `locales` (przez `greg.config.js`)

- **Typ:** `Record<string, LocaleConfig>`
- **Miejsce:** `greg.config.js` (to nie jest bezpoĹ›rednia wĹ‚aĹ›ciwoĹ›Ä‡ komponentu)

Lokalizacja jest wspierana przez `greg.config.js`:

- klucze locale jak `'/'`, `'/pl/'`
- lokalne `lang`, `title`
- opcjonalne `label` (etykieta w przeĹ‚Ä…czniku jÄ™zyka)
- lokalny `themeConfig`, m.in.: `nav`, `sidebar`, `outline`, `lastUpdatedText`, etykiety UI, `docFooter`, `siteTitle`, `logo`, `socialLinks`, `editLink`, `footer`, `aside`, `lastUpdated`

Zachowanie przeĹ‚Ä…cznika jÄ™zyka:

- pojawia siÄ™ w nagĹ‚Ăłwku, gdy sÄ… co najmniej 2 locale,
- dla `i18nRouting: true` (domyĹ›lnie) zachowuje wzglÄ™dnÄ… stronÄ™,
- dla `i18nRouting: false` przeĹ‚Ä…cza na root locale,
- jeĹ›li odpowiednia strona nie istnieje, robi fallback do root locale.

ĹšcieĹĽki locale sÄ… rozwiÄ…zywane wzglÄ™dem `srcDir`:

- `srcDir = '/docs'`
- `'/'` mapuje siÄ™ na `'/docs'`
- `'/pl/'` mapuje siÄ™ na `'/docs/pl'`

```js
export default {
  srcDir: '/docs',
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
        langMenuLabel: 'ZmieĹ„ jÄ™zyk',
        sidebarMenuLabel: 'Menu',
        skipToContentLabel: 'PrzejdĹş do treĹ›ci',
        returnToTopLabel: 'WrĂłÄ‡ na gĂłrÄ™',
        darkModeSwitchLabel: 'WyglÄ…d',
        lightModeSwitchTitle: 'PrzeĹ‚Ä…cz na jasny motyw',
        darkModeSwitchTitle: 'PrzeĹ‚Ä…cz na ciemny motyw',
        docFooter: { prev: 'Poprzednia', next: 'Nastepna' },
      },
    },
  },
}
```

### `srcDir`

- **Typ:** `string`
- **DomyĹ›lnie:** `"/docs"`

Prefiks URL mapowany na katalog `docs/`. Musi zgadzaÄ‡ siÄ™ z `srcDir` przekazanym do `vitePluginSearchIndex`.

```svelte
<MarkdownDocs srcDir="/documentation" version="1.0.0" />
```

### `version`

- **Typ:** `string`
- **DomyĹ›lnie:** `""`

Wersja pokazywana jako badge obok tytuĹ‚u.

```svelte
<MarkdownDocs srcDir="/docs" version={__VERSION__} />
```

### `mainTitle`

- **Typ:** `string`
- **DomyĹ›lnie:** `"Greg"`

Nazwa projektu w lewym gĂłrnym rogu nagĹ‚Ăłwka.

```svelte
<MarkdownDocs srcDir="/docs" version="1.0.0" mainTitle="My Project" />
```

### `outline`

- **Typ:** `false | number | [number, number] | 'deep' | { level?: ..., label?: string }`
- **DomyĹ›lnie:** `[2, 3]`

Steruje prawym panelem **Outline**.

| WartoĹ›Ä‡                             | Efekt                              |
| ----------------------------------- | ---------------------------------- |
| `false`                             | panel outline jest ukryty          |
| `2`                                 | tylko nagĹ‚Ăłwki `h2`                |
| `[2, 3]`                            | `h2` i `h3` *(domyĹ›lnie)*          |
| `'deep'`                            | od `h2` do `h6`                    |
| `{ level: [2,4], label: 'Spis' }`   | wĹ‚asny zakres i etykieta panelu    |

```svelte
<MarkdownDocs srcDir="/docs" version="1.0.0" outline="deep" />
```

### `carbonAds`

- **Typ:** `{ code: string; placement: string } | undefined`
- **DomyĹ›lnie:** `undefined`

Renderuje blok [Carbon Ads](./carbon-ads) w panelu outline.

```svelte
<MarkdownDocs
  srcDir="/docs"
  version="1.0.0"
  carbonAds={{ code: 'CWYD42JW', placement: 'myprojectdev' }}
/>
```

### `children`

- **Typ:** `Snippet | undefined`

Renderowane, gdy aktywna Ĺ›cieĹĽka nie pasuje do ĹĽadnego pliku Markdown.

```svelte
<MarkdownDocs srcDir="/docs" version="1.0.0">
  {#snippet children()}
    <p>Wybierz stronÄ™ z sidebaru, aby zaczÄ…Ä‡.</p>
  {/snippet}
</MarkdownDocs>
```

## Konfiguracja Vite

`vitePluginSearchIndex` musi byÄ‡ dodany do `vite.config.js`, ĹĽeby zbudowaÄ‡ indeks wyszukiwania:

```js
import { vitePluginSearchIndex } from '@dominikcz/greg/plugins';

export default defineConfig({
  plugins: [
    svelte(),
    vitePluginSearchIndex({ docsDir: 'docs', srcDir: '/docs' }),
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
| `docsDir`  | Katalog z plikami `.md` wzglÄ™dem root projektu              |
| `srcDir` | Prefiks URL; musi zgadzaÄ‡ siÄ™ z `srcDir` komponentu       |

## `svelte.config.js`

Pipeline Markdown konfigurujesz w `svelte.config.js`:

```js
const gregConfig = {
  markdown: {
    math: false,
  },
};
```

## Model rozszerzeĹ„ runtime

`MarkdownRenderer.svelte` deleguje punkty rozszerzeĹ„ do `src/lib/MarkdownDocs/markdownRendererRuntime.ts`.

### 1) Rejestr hydracji komponentĂłw

`COMPONENT_REGISTRY` mapuje nazwÄ™ taga na:

- komponent Svelte,
- funkcjÄ™ `buildProps(el)`.

To jest uĹĽywane np. dla tagĂłw `badge`, `button`, `image`, `link`, `codegroup`.

### 2) Rejestry pluginĂłw Markdown

Pipeline jest skĹ‚adany z dwĂłch uporzÄ…dkowanych rejestrĂłw:

- `getRemarkPluginEntries(baseUrl, docsPrefix)`
- `getRehypePluginEntries()`

ObejmujÄ… m.in.:

- kontenery niestandardowe (`remarkContainers` + `rehypeContainers`)
- bloki kodu (`rehypeShiki`, `rehypeCodeTitle`, `rehypeCodeGroup`)
- preprocessing Mermaid (`rehypeMermaid`)
- normalizacja Steps (`rehypeStepsWrapper`)
- nagĹ‚Ăłwki/TOC (`rehypeSlug`, `rehypeAutolinkHeadings`, `rehypeTocPlaceholder`)

### 3) Handlery renderowania (post-HTML)

Po renderze HTML uruchamiane sÄ… handlery z list:

- `RUNTIME_RENDER_HANDLERS`
- `THEME_CHANGE_RENDER_HANDLERS`

Obecne handlery obejmujÄ… hydracjÄ™ komponentĂłw i inicjalizacjÄ™/odĹ›wieĹĽanie Mermaid.

## Gdzie rozszerzaÄ‡

- uĹĽyj **component registry** dla interaktywnych widgetĂłw renderowanych z tagĂłw,
- uĹĽyj **rehype/remark registries** dla transformacji statycznego HTML,
- uĹĽyj **render handlers** dla logiki dziaĹ‚ajÄ…cej w przeglÄ…darce na ĹĽywym DOM
  (np. silniki diagramĂłw).
