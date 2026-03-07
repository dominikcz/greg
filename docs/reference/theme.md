---
title: Theme & Styling
order: 5
---

# Theme & Styling

Greg ships a carefully crafted two-tone design system — a clean purple-accent
**light** theme and a warm ember **dark** theme. Both are configured entirely via
CSS custom properties.


## Dark / light mode

The user's OS preference (`prefers-color-scheme`) is detected on first load. The
choice is persisted in `localStorage` under the key `greg-theme`.

A light/dark toggle is always visible in the top-right header.


## CSS variables

All visual properties are controlled through CSS custom properties defined on
`:root` (light) and `[data-theme="dark"]` (dark). Override them in your own
`src/app.css` or inside a `<style>` block to customise the appearance.

### Layout & colours

| Variable                   | Light default | Description                     |
| -------------------------- | ------------- | ------------------------------- |
| `--greg-background`        | `#ffffff`     | Page background                 |
| `--greg-main-background`   | `#ffffff`     | Content area background         |
| `--greg-menu-background`   | `#f8f8f8`     | Sidebar background              |
| `--greg-header-background` | `#ffffff`     | Top header background           |
| `--greg-color`             | `#1a1a2e`     | Primary text colour             |
| `--greg-border-color`      | `#e5e5ea`     | Divider and border colour       |
| `--greg-accent`            | `#646cff`     | Primary brand / accent colour   |
| `--greg-accent-light`      | `#ececf5`     | Soft accent (hover backgrounds) |
| `--greg-header-height`     | `3.5rem`      | Top header height               |

### Navigation

| Variable                        | Light default | Description            |
| ------------------------------- | ------------- | ---------------------- |
| `--greg-menu-color`             | `#3d3d3d`     | Sidebar text colour    |
| `--greg-menu-section-color`     | `#7a7a8c`     | Section header colour  |
| `--greg-menu-active-background` | `#646cff`     | Active link background |
| `--greg-menu-active-color`      | `#ffffff`     | Active link text       |
| `--greg-menu-hover-background`  | `#ececf5`     | Hover background       |

### Code blocks

| Variable                   | Light default | Description               |
| -------------------------- | ------------- | ------------------------- |
| `--greg-code-background`   | `#f0f0f4`     | Inline code background    |
| `--greg-code-color`        | `#1a1a2e`     | Inline code text colour   |
| `--greg-code-inline-color` | `#e4004a`     | Inline code inline colour |

### Status colours (containers & badges)

| Variable                                                            | Description            |
| ------------------------------------------------------------------- | ---------------------- |
| `--greg-info-border`, `--greg-info-text`, `--greg-info-bg`          | Info container / badge |
| `--greg-tip-border`, `--greg-tip-text`, `--greg-tip-bg`             | Tip container / badge  |
| `--greg-warning-border`, `--greg-warning-text`, `--greg-warning-bg` | Warning                |
| `--greg-danger-border`, `--greg-danger-text`, `--greg-danger-bg`    | Danger                 |

### Outline / TOC

| Variable                | Description                |
| ----------------------- | -------------------------- |
| `--greg-toc-background` | Outline panel background   |
| `--greg-toc-color`      | Section label colour       |
| `--greg-toc-link-color` | Link colour                |
| `--greg-toc-link-hover` | Hover / active link colour |


## Customising the accent colour

```css
/* src/app.css */
:root {
  --greg-accent:       #ff6f61;
  --greg-accent-light: rgba(255, 111, 97, 0.12);
  --greg-menu-active-background: #ff6f61;
}
```


## Resizable sidebar

The left navigation panel is **drag-to-resize**. A vertical splitter between the
sidebar and content area accepts mouse drag events to set the sidebar width. The
splitter snaps to the accent colour on hover.


## Code highlighting theme

Code blocks are highlighted by Shiki. Greg uses dual themes by default:
`github-light` for light mode and `github-dark` for dark mode.

To change themes, edit `svelte.config.js`:

```js
// svelte.config.js
const shikiThemes = {
  light: 'github-light',
  dark: 'github-dark',
};
```

Supported Shiki themes: see [shiki.style/themes](https://shiki.style/themes).
