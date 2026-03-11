---
title: Strona główna
renderer: mdsvex
---

Greg nie używa layoutów opartych wyłącznie o frontmatter. Do budowy strony głównej używa się bezpośrednio komponentów `<Hero>` i `<Features>`.

Dla tych komponentów nie ma skrótu w stylu `::: ...`; używaj tagów komponentów.

## Sposoby użycia

`Hero` i `Features` działają:

- na stronach `.md` przez tagi komponentów,
- w `.svelte` przez jawny import.

## Hero

`<Hero>` renderuje duży blok intro: nazwę, tagline, opcjonalny obraz i przyciski akcji.

::: code-group labels=[markdown, output]

<<< @/snippets/reference/home-hero-example.md

<Hero
  name="My Project"
  text="The fastest way to document things."
  tagline="Write once, ship everywhere."
  image={{
    light: { src: '/greg-logo-light.svg', alt: 'My Project logo' },
    dark: { src: '/greg-logo-dark.svg', alt: 'My Project logo' },
  }}
  actions={[
    { theme: 'brand', text: 'Get Started', link: '/guide/getting-started' },
    { theme: 'alt', text: 'GitHub', link: 'https://github.com/dominikcz/greg' },
  ]}
/>

:::

### Bezpośrednie użycie komponentu Hero (`.svelte`)

W plikach `.svelte` zaimportuj komponent jawnie:

::: code-group labels=[svelte, output]

```svelte
<script>
  import Hero from '$components/Hero.svelte';
</script>

<Hero
  name="My Project"
  text="The fastest way to document things."
  tagline="Write once, ship everywhere."
  image={{
    light: { src: '/greg-logo-light.svg', alt: 'My Project logo' },
    dark: { src: '/greg-logo-dark.svg', alt: 'My Project logo' },
  }}
  actions={[
    { theme: 'brand', text: 'Get Started', link: '/guide/getting-started' },
    { theme: 'alt', text: 'GitHub', link: 'https://github.com/dominikcz/greg' },
  ]}
/>
```

<Hero
  name="My Project"
  text="The fastest way to document things."
  tagline="Write once, ship everywhere."
  image={{
    light: { src: '/greg-logo-light.svg', alt: 'My Project logo' },
    dark: { src: '/greg-logo-dark.svg', alt: 'My Project logo' },
  }}
  actions={[
    { theme: 'brand', text: 'Get Started', link: '/guide/getting-started' },
    { theme: 'alt', text: 'GitHub', link: 'https://github.com/dominikcz/greg' },
  ]}
/>

:::

### Właściwości

```ts
interface HeroAction {
  theme?: 'brand' | 'alt';
  text: string;
  link: string;
  target?: string;
  rel?: string;
}

type ThemeImage =
  | string
  | { src: string; alt?: string; width?: number | string; height?: number | string }
  | {
      light: string | { src: string; alt?: string; width?: number | string; height?: number | string };
      dark: string | { src: string; alt?: string; width?: number | string; height?: number | string };
      alt?: string;
    };

interface Props {
  name?: string;
  text?: string;
  tagline?: string;
  image?: ThemeImage;
  actions?: HeroAction[];
}
```

### Miejsca na fragmenty

| Fragment           | Pozycja                              |
| ------------------ | ------------------------------------ |
| `heroBefore`       | Przed blokiem name/text              |
| `heroInfo`         | Zastępuje cały blok name + tagline   |
| `heroInfoAfter`    | Po tagline, przed przyciskami        |
| `heroImage`        | Zastępuje domyślny obraz             |
| `heroActionsAfter` | Po przyciskach akcji                 |

## Features

`<Features>` renderuje responsywną siatkę kart funkcji pod sekcją Hero.

::: code-group labels=[markdown, output]

<<< @/snippets/reference/home-features-example.md

<Features
  features={[
    { icon: 'docs', title: 'Markdown-first', details: 'Rich extensions, zero config.' },
    { icon: 'vite', title: 'Vite-powered', details: 'Instant HMR and fast builds.' },
    { icon: 'svelte', title: 'Svelte 5', details: 'Runes-based, no overhead.' },
  ]}
/>

:::

### Bezpośrednie użycie komponentu Features (`.svelte`)

::: code-group labels=[svelte, output]

```svelte
<script>
  import Features from '$components/Features.svelte';
</script>

<Features
  features={[
    { icon: 'docs', title: 'Markdown-first', details: 'Rich extensions, zero config.' },
    { icon: 'vite', title: 'Vite-powered', details: 'Instant HMR and fast builds.' },
    { icon: 'svelte', title: 'Svelte 5', details: 'Runes-based, no overhead.' },
  ]}
/>
```

<Features
  features={[
    { icon: 'docs', title: 'Markdown-first', details: 'Rich extensions, zero config.' },
    { icon: 'vite', title: 'Vite-powered', details: 'Instant HMR and fast builds.' },
    { icon: 'svelte', title: 'Svelte 5', details: 'Runes-based, no overhead.' },
  ]}
/>

:::

### Typy ikon

Ikony mogą być emoji, URL-em obrazka albo parą dark/light:

```md
<Features features={[
  { icon: 'tool', title: 'Tooling', details: 'Fast setup.' },
  { icon: { src: '/icons/rocket.svg' }, title: 'Launch', details: 'Ready to go.' },
  { icon: { dark: '/icons/d.svg', light: '/icons/l.svg' }, title: 'Theme-aware', details: 'Matches color mode.' },
]} />
```

### Właściwości `Feature`

```ts
interface Feature {
  icon?: string | { src: string; alt?: string; width?: number; height?: number }
              | { dark: string; light: string; alt?: string };
  title: string;
  details?: string;
  link?: string;
  linkText?: string;
  rel?: string;
  target?: string;
}
```

### Układ siatki

| Liczba kart    | Układ                     |
| -------------- | ------------------------- |
| 2              | 2 kolumny                 |
| 3              | 3 kolumny                 |
| 4 lub 5        | mieszany 2 + 3            |
| Wielokrotność 3| 3 kolumny                 |
| Inne           | 4 kolumny z zawijaniem    |

## Pełny przykład

::: code-group labels=[markdown, output]

<<< @/snippets/reference/home-full-example.md

<!--@include: @/snippets/reference/home-full-example.md-->

:::
