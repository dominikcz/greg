---
title: Home Page
order: 6
---

# Home Page — Hero & Features

Greg does not use frontmatter-based layouts. Instead, the `<Hero>` and
`<Features>` components are used directly inside Markdown pages to compose a
landing / home page.

---

## Hero

The `<Hero>` component renders a large introductory section with a name, tagline,
optional image and call-to-action buttons.

### Basic usage

```md
<Hero
  name="My Project"
  text="The fastest way to document things."
  tagline="Write once, ship everywhere."
  image={{ src: '/logo.svg', alt: 'My Project logo' }}
  actions={[
    { theme: 'brand', text: 'Get Started', link: '/docs/guide/getting-started' },
    { theme: 'alt',   text: 'GitHub',      link: 'https://github.com/…' },
  ]}
/>
```

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
  name?: string;       // product name — displayed with accent colour
  text?: string;       // main tagline (h1)
  tagline?: string;    // sub-tagline
  image?: ThemeImage;  // optional hero image (right side)
  actions?: HeroAction[];
}
```

### Snippet slots

For advanced customisation, `Hero` exposes several Svelte snippet slots:

| Snippet | Position |
| ------- | -------- |
| `heroBefore` | Before the name/text block |
| `heroInfo` | Replaces the entire name + tagline |
| `heroInfoAfter` | After tagline, before action buttons |
| `heroImage` | Replaces the default image |
| `heroActionsAfter` | After the action buttons |

---

## Features

The `<Features>` component renders a responsive grid of feature cards below the
Hero section.

### Basic usage

```md
<Features features={[
  { icon: '🚀', title: 'Fast', details: 'Highlights code at build time with Shiki.' },
  { icon: '🔍', title: 'Searchable', details: 'Full-text fuzzy search included.' },
  { icon: '🌗', title: 'Themed', details: 'Dark and light modes out of the box.' },
]} />
```

### Icon types

Icons can be emoji strings, image URLs, or dark/light image pairs:

```md
<Features features={[
  { icon: '🛠️',     title: '…', details: '…' },
  { icon: { src: '/icons/rocket.svg' },              title: '…', details: '…' },
  { icon: { dark: '/icons/d.svg', light: '/icons/l.svg' }, title: '…', details: '…' },
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

| Count | Layout |
| ----- | ------ |
| 2 | 2-column |
| 3 | 3-column |
| 4 or 5 | 2 + 3 mixed |
| Multiple of 3 | 3-column |
| Other | 4-column with wrapping |

---

## Full home page example

```md
<script>
  // Optional — all components are auto-imported
</script>

<Hero
  name="Greg"
  text="Svelte-powered documentation engine"
  tagline="Write Markdown, get beautiful docs."
  actions={[
    { theme: 'brand', text: 'Get Started', link: '/docs/guide/getting-started' },
    { theme: 'alt',   text: 'GitHub',      link: 'https://github.com/your-org/greg' },
  ]}
/>

<Features features={[
  { icon: '📝', title: 'Markdown-first', details: 'Rich extensions, zero config.' },
  { icon: '⚡', title: 'Vite-powered',   details: 'Instant HMR and fast builds.' },
  { icon: '🔷', title: 'Svelte 5',       details: 'Runes-based, no overhead.' },
]} />
```
