# Getting started

Welcome to **{{TITLE}}**. This sample shows how to organize pages and use Greg's Markdown features.

## Start the site

```sh
npm run dev
```

Open the local URL printed by Vite. Changes to Markdown files appear as you save them.

## Add a page

Create a Markdown file under `{{DOCS_DIR}}`. Its path becomes its URL and sidebar entry:

```text
{{DOCS_DIR}}/
  index.md
  getting-started.md
  guide/
    quick-reference.md
```

For example, `guide/quick-reference.md` is available at `/guide/quick-reference`.
Use `index.md` inside a folder to create that folder's landing page.

## Set page title and order

```md
---
title: Installation
order: 1
---

# Installation

Page content goes here.
```

`order` controls the page's position in the automatically generated sidebar.

## Configure the site

The generated `greg.config.{{EXT}}` has sensible defaults. For example, set a custom sidebar or enable search options there:

```js
export default {
  srcDir: '{{DOCS_DIR}}',
  mainTitle: '{{TITLE}}',
  sidebar: 'auto',
}
```

See the [quick reference](./guide/quick-reference) for Markdown features and practical examples.
