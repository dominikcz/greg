# Outline (On This Page)

The **Outline** panel is shown in the right column of every doc page. It displays
a scrollspy-aware list of headings for the current page and lets the reader jump
to any section.

---

## Configuring the outline

Pass the `outline` prop to `<MarkdownDocs>`:

```svelte
<!-- Show h2 and h3 (default) -->
<MarkdownDocs rootPath="/docs" version="1.0.0" outline={[2, 3]} />

<!-- Show all headings -->
<MarkdownDocs rootPath="/docs" version="1.0.0" outline="deep" />

<!-- Show only h2 -->
<MarkdownDocs rootPath="/docs" version="1.0.0" outline={2} />

<!-- Disable -->
<MarkdownDocs rootPath="/docs" version="1.0.0" outline={false} />

<!-- Custom label + range -->
<MarkdownDocs
  rootPath="/docs"
  version="1.0.0"
  outline={{ level: [2, 4], label: 'Contents' }}
/>
```

### Accepted values

| Value | Effect |
| ----- | ------ |
| `false` | Outline panel is hidden |
| `number` | Only that heading level (e.g. `2` → h2 only) |
| `[min, max]` | Range of heading levels, e.g. `[2, 3]` |
| `'deep'` | Same as `[2, 6]` |
| `{ level, label }` | Object form — `level` follows the rules above; `label` overrides "On this page" |

---

## Scrollspy behaviour

The active link in the outline is updated as the user scrolls. A heading is
considered "active" when it reaches within 72 px of the top of the content pane.

The outline is built by scanning the live DOM with a `MutationObserver`, so it
correctly reflects the final rendered content including async-loaded pages.

---

## Inline `[[toc]]`

You can also insert a static **inline** table of contents at any point inside a
page with the `[[toc]]` placeholder:

```md
## Contents

[[toc]]
```

By default it includes h2 and h3. This is independent of the right-side Outline
panel — both can be used together.

---

## CSS variables

| Variable | Default (light) | Description |
| -------- | --------------- | ----------- |
| `--greg-toc-background` | `transparent` | Panel background |
| `--greg-toc-color` | `#3d3d3d` | Section label colour |
| `--greg-toc-link-color` | `#4a4a6a` | Link colour |
| `--greg-toc-link-hover` | `#646cff` | Link hover / active colour |
