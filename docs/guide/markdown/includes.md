---
title: Including external files
order: 5
---

# Including external files

## Code snippets - `<<<`

Import an external source file as a code block:

```md
<<< @/snippets/example.js
```

The `@` alias resolves to the project root. The language is detected from the
file extension.

### Region

Import only a named region of the file (marked with `#region name` / `#endregion`):

```md
<<< @/snippets/example.js#setup
```

### Range

Import specific line numbers:

```md
<<< @/snippets/example.js{5-10}
```

### Title override

```md
<<< @/snippets/example.js [my-example.js]
```

## Markdown include - `<!--@include:-->`

Include another Markdown file inline:

```md
<!--@include: /guide/__shared-warning.md-->
```

File `__shared-warning.md` looks like this:

<<< /guide/__shared-warning.md

Output:

<!--@include: /guide/__shared-warning.md-->

The included file is processed by the full Markdown pipeline. Partial files
(name starts with `__`) are excluded from routing.

The `/` prefix resolves to the `docs/` directory root:

```md
<!--@include: /__partials/note.md-->
```

Output:

<!--@include: /__partials/note.md-->
