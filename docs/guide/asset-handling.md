---
title: Asset Handling
order: 5
---

# Asset Handling

Greg uses Vite for asset processing, so all standard Vite rules apply.


## Referencing images

### From Markdown

Relative paths are resolved from the location of the `.md` file:

```md
![diagram](./images/diagram.png)
```

Absolute paths are resolved from the project root's `public/` directory:

```md
![logo](/logo.svg)
```

### From the `public/` folder

Files placed in `public/` are served as-is and are accessible at the root (`/`):

```
public/
  logo.svg         →  /logo.svg
  favicon.ico      →  /favicon.ico
```

They are **not** processed by Vite — no hashing, no transformation.


## Static assets with Vite processing

Assets imported via relative URLs are processed by Vite (content-hash in filename,
tree-shaking, etc.). Inside `.svelte` files use a standard `import`:

```svelte
<script>
  import logo from '../assets/logo.svg';
</script>

<img src={logo} alt="Logo" />
```

In Markdown the recommended approach is to place permanent assets in `public/`
and reference them with absolute paths.


## Inline attributes for sizing

Use the [inline attributes](/guide/markdown/inline-attributes)
syntax to add `width`, `height` or CSS classes directly in Markdown:

```md
![diagram](./schema.png){width=640 height=480}

![icon](/icons/info.svg){class="inline-icon" width=24}
```


## The `<Image>` component

The `<Image>` component renders a `<picture>` element with separate `dark` and
`light` variants, matching the current theme:

```md
<Image
  src="/logo-light.svg"
  dark="/logo-dark.svg"
  alt="Greg logo"
/>
```

| Prop | Type | Description |
| ---- | ---- | ----------- |
| `src` | `string` | Default (or light-theme) image URL |
| `dark` | `string?` | Dark-theme image URL |
| `alt` | `string?` | Alt text |
| `width` | `number\|string?` | Element width |
| `height` | `number\|string?` | Element height |
