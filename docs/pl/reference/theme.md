---
title: Motyw i stylowanie
---

Greg dostarcza dopracowany system projektowy oparty o dwa motywy: jasny i ciemny.
Całość konfigurujesz przez zmienne CSS.

## Tryb jasny/ciemny

Przy pierwszym uruchomieniu wykrywana jest preferencja systemowa (`prefers-color-scheme`). Po ręcznym przełączeniu zapis trafia do `localStorage`:

- `greg-theme-source = "manual"`
- `greg-theme = "light" | "dark"`

Gdy tryb systemowy jest aktywny, te klucze są usuwane.

Przełącznik jasny/ciemny jest zawsze widoczny w prawym górnym rogu nagłówka.

## Favicon i logo zależne od motywu

Greg potrafi przełączać favicon i logo po stanie aplikacji (`data-theme`), a nie tylko po ustawieniu systemowym.

Przykład plików:

- `/favicon-light.svg`
- `/favicon-dark.svg`

Dlaczego dwa pliki: pojedynczy `favicon.svg` oparty wyłącznie o
`@media (prefers-color-scheme: dark)` reaguje na motyw systemowy i nie zawsze
odzwierciedla ręczne przełączenie motywu w aplikacji.

## Zmienne CSS

Wszystkie właściwości wizualne kontrolujesz zmiennymi CSS na `:root` (light) i `[data-theme="dark"]` (dark).

### Layout i kolory

| Zmienna                    | Domyślna (light) | Opis                          |
| -------------------------- | ---------------- | ----------------------------- |
| `--greg-background`        | `#ffffff`        | Tło strony                    |
| `--greg-main-background`   | `#ffffff`        | Tło obszaru treści            |
| `--greg-menu-background`   | `#f8f8f8`        | Tło sidebaru                  |
| `--greg-header-background` | `#ffffff`        | Tło nagłówka                  |
| `--greg-color`             | `#1a1a2e`        | Główny kolor tekstu           |
| `--greg-border-color`      | `#e5e5ea`        | Kolor linii i obramowań       |
| `--greg-accent`            | `#646cff`        | Kolor akcentu                 |
| `--greg-accent-light`      | `#ececf5`        | Miękki akcent (np. hover)     |
| `--greg-header-height`     | `3.5rem`         | Wysokość górnego nagłówka     |

### Nawigacja

| Zmienna                         | Domyślna (light) | Opis                       |
| ------------------------------- | ---------------- | -------------------------- |
| `--greg-menu-color`             | `#3d3d3d`        | Kolor tekstu sidebaru      |
| `--greg-menu-section-color`     | `#7a7a8c`        | Kolor nagłówków sekcji     |
| `--greg-menu-active-background` | `#646cff`        | Tło aktywnego linku        |
| `--greg-menu-active-color`      | `#ffffff`        | Tekst aktywnego linku      |
| `--greg-menu-hover-background`  | `#ececf5`        | Tło linku przy najechaniu  |

### Splitter sidebaru

| Zmienna                                     | Domyślna (light) | Opis                                 |
| ------------------------------------------- | ---------------- | ------------------------------------ |
| `--greg-splitter-handler-background`        | `#e5e5ea`        | Tło uchwytu splittera                |
| `--greg-splitter-handler-color`             | `#7a7a8c`        | Kolor ikony uchwytu                  |
| `--greg-splitter-active-border`             | `#646cff`        | Kolor obramowania splittera (hover)  |
| `--greg-splitter-active-handler-background` | `#646cff`        | Tło uchwytu na hover                 |
| `--greg-splitter-active-handler-color`      | `#f8f8f8`        | Kolor ikony uchwytu na hover         |

### Bloki kodu

| Zmienna                    | Domyślna (light) | Opis                       |
| -------------------------- | ---------------- | -------------------------- |
| `--greg-code-background`   | `#f0f0f4`        | Tło kodu inline            |
| `--greg-code-color`        | `#1a1a2e`        | Kolor tekstu kodu inline   |
| `--greg-code-inline-color` | `#e4004a`        | Kolor wyróżnienia inline   |

### Kolory statusów

| Zmienna                                                             | Opis                     |
| ------------------------------------------------------------------- | ------------------------ |
| `--greg-info-border`, `--greg-info-text`, `--greg-info-bg`          | Kontener / badge info    |
| `--greg-tip-border`, `--greg-tip-text`, `--greg-tip-bg`             | Kontener / badge tip     |
| `--greg-warning-border`, `--greg-warning-text`, `--greg-warning-bg` | Kontener / badge warning |
| `--greg-danger-border`, `--greg-danger-text`, `--greg-danger-bg`    | Kontener / badge danger  |

### Outline / TOC

| Zmienna                | Opis                          |
| ---------------------- | ----------------------------- |
| `--greg-toc-background` | Tło panelu outline           |
| `--greg-toc-color`      | Kolor etykiety sekcji        |
| `--greg-toc-link-color` | Kolor linków                 |
| `--greg-toc-link-hover` | Kolor hover/active linku     |

## Zmiana akcentu

```css
:root {
  --greg-accent:       #ff6f61;
  --greg-accent-light: rgba(255, 111, 97, 0.12);
  --greg-menu-active-background: #ff6f61;
}
```

## Zmienny rozmiar sidebaru

Lewy panel nawigacji można skalować przez przeciąganie splittera między
sidebarem i obszarem treści.

Uchwyt splittera używa wyśrodkowanej ikony `EllipsisVertical` z
`@lucide/svelte`, aby było jasne, że element jest przeciągalny.

Styl hovera splittera kontrolują dedykowane zmienne `--greg-splitter-*`, więc
możesz stylować go niezależnie od globalnego koloru akcentu.

## Motyw podświetlania kodu

Podświetlanie realizuje Shiki. Domyślnie:

- `github-light` dla jasnego motywu
- `github-dark` dla ciemnego motywu

Zmiana w `svelte.config.js`:

```js
const shikiThemes = {
  light: 'github-light',
  dark: 'github-dark',
};
```

Lista motywów: [shiki.style/themes](https://shiki.style/themes).
