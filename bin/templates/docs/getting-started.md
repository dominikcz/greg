# Getting started

Welcome to **{{TITLE}}**!

## Why Greg?

Greg is optimized for large documentation projects: preprocessed metadata,
predictable routing/sidebar generation, and search that scales to bigger docs.
It keeps configuration predictable, while some runtime API and platform
features intentionally differ.

## Writing docs

Add Markdown files to this folder. Greg will automatically build a sidebar and routes from the file structure.

```bash
{{DOCS_DIR}}/
  index.md          ← home page
  getting-started.md
  guide/
    installation.md
    configuration.md
  reference/
    api.md
```

## Front matter

Every page can use YAML front matter:

```yaml
---
title: My Page
order: 1
---
```

## Math, diagrams and more

Greg supports:

- **Mermaid** diagrams
- **LaTeX** math via MathJax
- **Custom containers** (`::: tip`, `::: warning`, `::: danger`)
- **Code groups** and syntax highlighting via Shiki

Visit the [Greg documentation](https://github.com/dominikcz/greg) to learn more.
