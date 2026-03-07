---
title: Badge
---

# Badge

The `Badge` component adds an inline status label to headings or any inline content.

## Usage

`Badge` supports two authoring styles:

- Markdown inline usage (`<Badge ... />`) in docs pages
- Direct component usage in `.svelte` files

### Markdown inline usage

`Badge` is available in every Markdown page without an import:

```md
### Title <Badge type="info" text="default" />
### Title <Badge type="tip" text="stable" />
### Title <Badge type="warning" text="beta" />
### Title <Badge type="danger" text="deprecated" />
```

**Output:**

### Title <Badge type="info" text="default" />
### Title <Badge type="tip" text="stable" />
### Title <Badge type="warning" text="beta" />
### Title <Badge type="danger" text="deprecated" />

### Direct component usage (`.svelte`)

```svelte
<script>
  import Badge from '$components/Badge.svelte';
</script>

<h3>
  Title <Badge type="tip" text="stable" />
</h3>
```

**Output:**

Equivalent inline status badge rendered next to heading text.


## Custom children

Pass content as children instead of using the `text` prop:

```md
### Title <Badge type="info">custom content</Badge>
```

### Title <Badge type="info">custom content</Badge>


## Props

```ts
interface Props {
  /** Text to display. Ignored when children are provided. */
  text?: string;

  /** Badge colour variant. Defaults to 'tip'. */
  type?: 'info' | 'tip' | 'warning' | 'danger';

  /** Svelte snippet — overrides `text`. */
  children?: Snippet;
}
```


## CSS variables

Customise badge colours by overriding Greg's CSS variables:

```css
:root {
  --greg-info-border: transparent;
  --greg-info-text:   var(--greg-accent);
  --greg-info-bg:     rgba(100, 108, 255, 0.08);

  --greg-tip-border:  transparent;
  --greg-tip-text:    #2d9e68;
  --greg-tip-bg:      rgba(66, 184, 131, 0.08);

  --greg-warning-border: transparent;
  --greg-warning-text:   #7d4e00;
  --greg-warning-bg:     rgba(201, 126, 10, 0.08);

  --greg-danger-border: transparent;
  --greg-danger-text:   #c81d1d;
  --greg-danger-bg:     rgba(224, 82, 82, 0.08);
}
```
