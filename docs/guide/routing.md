# Routing

## File-based routing

Greg uses **file-based routing**. Every `.md` file inside the `docs/` folder
becomes a page at the corresponding URL path:

```
docs/index.md                 →  /docs
docs/guide/getting-started.md →  /docs/guide/getting-started
docs/reference/api.md         →  /docs/reference/api
```

`index.md` files map to the parent folder URL:

```
docs/guide/index.md  →  /docs/guide
```

---

## Partial files

Any file whose name starts with `__` (double underscore) is treated as a
**partial** — it is excluded from routing and the sidebar, but can be
included in other pages with the `<!--@include:-->` directive.

```
docs/guide/__shared-warning.md  ←  not a page, only includable
```

---

## Sidebar navigation

The sidebar is **generated automatically** from the folder / file structure.
No manual configuration is required.

Rules:
- Folders become collapsible section headers.
- Files become leaf links.
- Names are capitalised automatically (`getting-started` → `Getting-started`).
- `index.md` files are attached to their parent folder node.
- The root `index.md` (`docs/index.md`) is hidden from the sidebar.

### Ordering

Items within each level are sorted **alphabetically**. To control the order,
prefix file/folder names with numbers:

```
docs/
  01-introduction.md
  02-guide/
    01-getting-started.md
    02-routing.md
```

---

## SPA navigation

Greg is a **single-page application** — navigating between pages never triggers
a full page reload. Internal links are intercepted and handled by the built-in
router:

```md
[Getting Started](./getting-started)           <!-- relative -->
[API Reference](/docs/reference/api)           <!-- absolute -->
[Go to anchor](#section-heading)               <!-- same-page anchor -->
[Other page + anchor](./other#some-section)    <!-- cross-page anchor -->
```

Both `.md` and `.html` extensions in links are stripped automatically:

```md
[link](./page.md)    →  navigates to /docs/…/page
[link](./page.html)  →  navigates to /docs/…/page
```

External links (starting with `http://`, `https://`, `//`, etc.) open normally
in the browser.

---

## `rootPath` prop

The `rootPath` prop of `<MarkdownDocs>` tells the engine where the docs live.
Its default is `/docs`. If your docs are served from a different base path,
pass the new value:

```svelte
<MarkdownDocs rootPath="/documentation" version="2.0.0" />
```

The Vite `vitePluginSearchIndex` plug-in must use the same `docsDir`:

```js
// vite.config.js
vitePluginSearchIndex({ docsDir: 'documentation', rootPath: '/documentation' })
```

---

## 404 behaviour

When a URL matches no Markdown file, the engine displays the folder label as
a heading and renders any `children` snippet passed to `<MarkdownDocs>`:

```svelte
<MarkdownDocs rootPath="/docs" version="1.0.0">
  {#snippet children()}
    <p>Select a topic from the sidebar.</p>
  {/snippet}
</MarkdownDocs>
```
