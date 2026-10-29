---
title: PDF Export
order: 7
---

# PDF Export

Greg can print your docs to PDF from the **same Markdown** that powers the site.
You describe one or more *books* in `greg.config` — what goes in, in which order,
and what the pages look like — and run:

```sh
npx greg pdf
```

Every book is rendered by the site's own Markdown pipeline (Shiki, Mermaid,
containers, Svelte components, includes), assembled into one document and
printed by headless Chromium. The table of contents, chapter numbers, running
headers, page numbers and PDF bookmarks are generated — you never maintain them
by hand.

## Requirements

- A Chromium-based browser **≥ 131**: the system **Edge** or **Chrome** is used,
  nothing is downloaded.
- Two optional packages, installed only in projects that print PDFs:

```sh
npm i -D playwright-core pdfjs-dist
```

`playwright-core` drives the browser, `pdfjs-dist` reads the first print to put
page numbers into the table of contents (and powers `--compare`).

## Zero configuration

Without a `pdf` section, `greg pdf` prints one book (`default`) with the content
and order of the sidebar, a table of contents and page numbers in the footer.
The result lands in `dist/pdf/default.pdf`.

## Defining books

```js
// greg.config.js
export default {
    pdf: {
        books: {
            manual: {
                title: 'User manual',
                subtitle: 'Acme Cloud',
                version: '2.1',
                output: 'dist/pdf/manual.pdf',
                content: [{ sidebar: true, groups: 'flatten', exclude: 'internal/**' }],
                cover: '__pdf/cover.md',
                toc: { title: 'Contents', depth: 2 },
                numbering: { depth: 2 },
                page: {
                    size: 'A4',
                    margin: '20mm 18mm',
                    header: { left: '{subtitle}', right: '{chapter}' },
                    footer: { left: 'rev. {date}', right: '{page} / {pages}' },
                },
                css: '__pdf/print.css',
            },
        },
    },
};
```

`pdf.defaults` holds settings shared by all books. Paths of `cover` and `css`
are relative to the docs folder (`srcDir`); folders starting with `__` are hidden
from the site but available to the PDF, which makes `docs/__pdf/` a good home
for print-only files.

### What goes in: `content`

`content` is `'sidebar'` (default) or a list of entries, expanded in order:

| Entry | Meaning |
|---|---|
| `'/guide/routing'`, `'guide/routing.md'` | one page (route or file relative to the docs folder) |
| `{ page: '/guide', title: 'Intro', level: 2 }` | one page with a different TOC title or level |
| `{ sidebar: true }` | the whole sidebar — same pages, same order as the site |
| `{ sidebar: 'Reference > Components' }` | one branch of the sidebar (labels joined by `>`) |
| `{ glob: 'guide/*.md', exclude: 'guide/draft-*', sort: 'natural' }` | files matching a mask |
| `{ part: 'Appendix', items: [ … ] }` | a part with its own title page |

**Sidebar entries** follow the site navigation: a page's depth in the sidebar is
its level in the book (TOC, numbering, bookmarks). Sidebar groups without a link
become part title pages (`groups: 'parts'`, default) or disappear and keep their
children (`groups: 'flatten'`). External links and pages with `layout: home` are
skipped.

**Glob entries** use `*`, `**`, `?`, `[0-9]` and `{a,b}` relative to the docs
folder. `sort` is `natural` (default: `2-…` before `10-…`), `sidebar`, `title` or
`order` (frontmatter). Matched pages are chapters on the same level.

A page listed twice is kept once (with a warning). A page excluded by one entry's
`exclude` can still be added by a later entry.

### Per page: frontmatter

```yaml
---
pdf: false              # never in a PDF
---
```

```yaml
---
pdf:
  books: [manual]       # only in these books
  title: Short title    # title in the PDF table of contents
  numbered: false       # no chapter number (e.g. revision history)
---
```

### Inside a page: containers

Content for one output only is marked with containers. Content that does not
belong to the current output is removed before rendering, not just hidden.

```md
::: web-only
Click **Download** in the top right corner.
:::

::: pdf-only
The latest version of this manual is available at https://example.com/docs.
:::

::: pdf-only manual
Shown only in the book `manual`.
:::

::: page-break
:::
```

For a single element, the `{.no-pdf}` / `{.pdf-only}` classes from
[inline attributes](./markdown/inline-attributes) work too (they are hidden by CSS).

### Structure: TOC, numbering, levels

| Option | Default | Meaning |
|---|---|---|
| `toc` | `{ depth: 2, pageNumbers: true }` | generated table of contents; `false` to disable |
| `numbering` | site `numbering` | `{ depth: 2, format: '1.' \| '1.1' }` — see [Numbering](#numbering-and-cross-references) |
| `headingShift` | `'auto'` | `'auto'` aligns the first heading of each page with its level in the book; a number shifts all headings |
| `chapterBreak` | `true` | level-1 chapters start on a new page; `'all'` for every page, `false` for none |

Numbers are generated, so headings in Markdown stay unnumbered. If numbering is
on and a heading already starts with a number, `greg pdf` warns
(`PDF_MANUAL_NUMBER`); a page that looks like a hand-written table of contents
is reported as `PDF_MANUAL_TOC`.

### Page template

`page.size` (`A3`, `A4`, `A5`, `B5`, `Letter`, `Legal` or `{ width, height }`),
`page.orientation`, `page.margin` (CSS syntax) and the `header` / `footer` slots
(`left`, `center`, `right`). Slots are text templates with tokens:

| Token | Value |
|---|---|
| `{title}` `{subtitle}` `{author}` `{version}` | book settings |
| `{date}` | `date` from the book, or today formatted with `dateFormat` (`YYYY-MM-DD`) |
| `{chapter}` | title of the current level-1 chapter (with its number) |
| `{page}` `{pages}` | page number and page count |

Cover, TOC and part pages have no header and footer (`page.plainPages`, default
`['cover', 'toc', 'part']`). The cover page has no margins, so the cover can use
the whole sheet; its content is padded with the page margins.

### Cover

`cover` points to a Markdown file. Tokens (`{title}`, `{version}`, `{date}`, …)
are replaced before rendering and raw HTML is allowed, so a designed cover is a
few `<div>`s. Use `::: page-break` for additional cover pages (e.g. copyright).

### Styling

The `css` file(s) are loaded after Greg's print theme. The theme is driven by
variables (`--pdf-font-family`, `--pdf-heading-font-family`, `--pdf-font-size`,
`--pdf-line-height`, `--pdf-color`, `--pdf-heading-color`, `--pdf-accent`,
`--pdf-rule`, `--pdf-code-background`, `--pdf-table-font-size`,
`--pdf-table-header-background`, `--pdf-image-max-height`, `--pdf-margin-box-font`).
Useful hooks:

```css
:root {
    --pdf-font-size: 10pt;
    --pdf-line-height: 1.45;
    --pdf-accent: #0b5cad;
    --pdf-margin-box-font: 8pt "Segoe UI", sans-serif;
}

.pdf-chapter h2 { color: var(--pdf-accent); }
.pdf-toc-l1 { font-weight: 700; }
```

Interactive elements are adapted for paper: `details` are expanded, header
permalinks and buttons are hidden, images are never split.

## Numbering and cross references

Chapter numbers are generated — for the site and for PDF books — so Markdown
headings and file names stay free of numbers and reordering chapters is a
one-line change in the sidebar.

```js
// greg.config.js
export default {
    numbering: { depth: 1 },   // or true; format: '1.' (default) | '1.1'; sidebar: false
};
```

- A page's number follows the **sidebar order**; pages nested under a page get
  `3.1`, `3.2`…; sidebar groups without a page are not numbered.
- Headings inside a page continue its number (`5.`, `5.1.`, `5.1.1.`) up to `depth`.
- The site shows the numbers in headings, the sidebar, prev/next links,
  breadcrumbs and the browser title; PDF books use them in headings, the table of
  contents, running headers and bookmarks. Books follow the site numbering unless
  they set their own `numbering`.
- `numbered: false` in the frontmatter leaves a page without a number (e.g. a
  revision history or help pages); `pdf: { numbered: false }` does it only in PDF.

To refer to a chapter by number, write a link **with empty text**:

```md
Backups are described in chapter [](/guide/backups).
```

The link renders as the target page's number (`chapter 5`) — or its title when
the page is not numbered — and stays correct when chapters move. In PDF it becomes
a link inside the document.

## Preview

With `npm run dev` running, open **`/__pdf`** for the list of books, or
**`/__pdf/<book>`** (e.g. `/__pdf/manual`) for one book: rendered as one document, with a toolbar showing the status and all
warnings. Changes in Markdown or config reload it. Use the browser's print
preview (`Ctrl+P`) to see real pages.

## CLI

```text
greg pdf [book…] [options]

  --list               print the resolved content of each book and exit
  --dev                print from a dev server (no production build)
  --no-build           use the existing build output
  --out <dir>          output directory
  --browser <name>     msedge | chrome | chromium | path to the executable
  --compare <file.pdf> compare the text content with a reference PDF
  --strict             exit with an error when any warning is reported
  --open               open the generated PDF
  --timeout <seconds>  max time to wait for the print route (default 180)
```

`greg pdf --list` shows what will be printed and why pages were left out:

```text
manual (14 pages, 2 excluded)
• Introduction  [guide/index.md]
  • Getting Started  [guide/getting-started.md]
  ✗ /internal/notes.md  (exclude)
```

The report after printing lists page counts, timings and warnings, e.g. links to
pages outside the book (`PDF_LINK_OUTSIDE_BOOK` — set `siteUrl` to keep them as
web links), missing anchors and images.

### Comparing with a reference

When you move an existing document to Greg, `--compare` checks that the content
did not change while the layout did:

```sh
npx greg pdf manual --compare old-manual.pdf
```

The report (`<output>.compare.md`) splits both documents at the book's headings
and compares the words of every section, ignoring layout, typography, running
headers, repeated table headers and heading numbers. Sections are reported as
*identical*, *layout only* (same words, different order — typically tables) or
*changed*, with the words that exist only in one of the files.

## Links

Links between pages of the book become links inside the PDF; `#anchor` links
that point to a heading of another page are resolved too. Links to pages that
are not in the book become web links when `siteUrl` is set
(`externalPageLinks: 'site-url'`), plain text (`'text'`), or fail the build
(`'error'`).
