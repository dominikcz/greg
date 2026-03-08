---
title: Home Page
renderer: mdsvex
---

Greg does not use frontmatter-based layouts. Instead, the `<Hero>` and
`<Features>` components are used directly inside Markdown pages to compose a
landing / home page.

For these components there is no dedicated directive/container shorthand
(like `::: ...`). Use component tags directly (`<Hero ... />`,
`<Features ... />`).

## Authoring styles

`Hero` and `Features` are available in both authoring contexts:

- Markdown docs pages (`.md`) via component tags
- Direct `.svelte` usage via imported components

In Markdown pages, Greg auto-registers these components, so no import is needed.
In plain `.svelte` files, you still need explicit imports.

## Hero

The `<Hero>` component renders a large introductory section with a name, tagline,
optional image and call-to-action buttons.

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
    { theme: 'brand', text: 'Get Started', link: '/docs/guide/getting-started' },
    { theme: 'alt', text: 'GitHub', link: 'https://github.com/your-org/your-repo' },
  ]}
/>

:::

### Direct component usage for Hero (`.svelte`)

In `.svelte` files, import the component explicitly:

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
    { theme: 'brand', text: 'Get Started', link: '/docs/guide/getting-started' },
    { theme: 'alt', text: 'GitHub', link: 'https://github.com/your-org/your-repo' },
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
    { theme: 'brand', text: 'Get Started', link: '/docs/guide/getting-started' },
    { theme: 'alt', text: 'GitHub', link: 'https://github.com/your-org/your-repo' },
  ]}
/>

:::

### Props

```ts
interface HeroAction {
  theme?: 'brand' | 'alt';   // default: 'brand'
  text: string;
  link: string;
  target?: string;
  rel?: string;
}

type ThemeImage =
  | string // same image for both themes
  | { src: string; alt?: string; width?: number | string; height?: number | string }
  | {
      light: string | { src: string; alt?: string; width?: number | string; height?: number | string };
      dark: string | { src: string; alt?: string; width?: number | string; height?: number | string };
      alt?: string;
    };

interface Props {
  name?: string;       // product name - displayed with accent colour
  text?: string;       // main tagline (h1)
  tagline?: string;    // sub-tagline
  image?: ThemeImage;  // optional hero image (right side)
  actions?: HeroAction[];
}
```

If you use a manual theme toggle, prefer the `light`/`dark` image pair form.
A single image with only `@media (prefers-color-scheme)` follows system theme,
not necessarily the in-app toggle state.

### Snippet slots

For advanced customisation, `Hero` exposes several Svelte snippet slots:

| Snippet            | Position                             |
| ------------------ | ------------------------------------ |
| `heroBefore`       | Before the name/text block           |
| `heroInfo`         | Replaces the entire name + tagline   |
| `heroInfoAfter`    | After tagline, before action buttons |
| `heroImage`        | Replaces the default image           |
| `heroActionsAfter` | After the action buttons             |

## Features

The `<Features>` component renders a responsive grid of feature cards below the
Hero section.

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

### Direct component usage (`.svelte`)

In `.svelte` files, import the component explicitly:

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

### Icon types

Icons can be emoji strings, image URLs, or dark/light image pairs:

```md
<Features features={[
  { icon: 'tool', title: 'Tooling', details: 'Fast setup.' },
  { icon: { src: '/icons/rocket.svg' }, title: 'Launch', details: 'Ready to go.' },
  { icon: { dark: '/icons/d.svg', light: '/icons/l.svg' }, title: 'Theme-aware', details: 'Matches color mode.' },
]} />
```

### Feature props

```ts
interface Feature {
  icon?: string | { src: string; alt?: string; width?: number; height?: number }
              | { dark: string; light: string; alt?: string };
  title: string;
  details?: string;
  link?: string;       // makes the whole card clickable
  linkText?: string;   // "Learn more" style label
  rel?: string;
  target?: string;
}
```

### Grid layout

The grid automatically adapts based on the number of features:

| Count         | Layout                 |
| ------------- | ---------------------- |
| 2             | 2-column               |
| 3             | 3-column               |
| 4 or 5        | 2 + 3 mixed            |
| Multiple of 3 | 3-column               |
| Other         | 4-column with wrapping |

## Full home page example

::: code-group labels=[markdown, output]

<<< @/snippets/reference/home-full-example.md

<!--@include: @/snippets/reference/home-full-example.md-->

:::
