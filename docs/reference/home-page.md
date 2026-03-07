---
title: Home Page
---

# Home Page - Hero & Features

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

## Hero

The `<Hero>` component renders a large introductory section with a name, tagline,
optional image and call-to-action buttons.

::: code-group labels=[markdown, output]

<<< @/snippets/reference/home-hero-example.md

<!--@include: @/snippets/reference/home-hero-example.md-->

:::

### Direct component usage (`.svelte`)

::: code-group labels=[markdown, output]

```svelte
<script>
  import Hero from '$components/Hero.svelte';
</script>

<<< @/snippets/reference/home-hero-example.md
```

<!--@include: @/snippets/reference/home-hero-example.md-->

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
  | string                              // same image for both themes
  | { src: string; alt?: string }
  | { dark: string; light: string; alt?: string };

interface Props {
  name?: string;       // product name - displayed with accent colour
  text?: string;       // main tagline (h1)
  tagline?: string;    // sub-tagline
  image?: ThemeImage;  // optional hero image (right side)
  actions?: HeroAction[];
}
```

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

<!--@include: @/snippets/reference/home-features-example.md-->

:::

### Direct component usage (`.svelte`)

::: code-group labels=[markdown, output]

```svelte
<script>
  import Features from '$components/Features.svelte';
</script>

<<< @/snippets/reference/home-features-example.md
```

<!--@include: @/snippets/reference/home-features-example.md-->

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
