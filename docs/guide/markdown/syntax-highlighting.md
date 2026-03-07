---
title: Syntax highlighting
order: 4
---

## Syntax highlighting

Code blocks are highlighted at build time by [Shiki](https://shiki.style) using
the `github-dark` theme:

<<< /__partials/markdown/examples/basic.md

Output:

<!--@include: /__partials/markdown/examples/basic.md-->

Supported languages include `javascript`, `typescript`, `bash`, `json`, `html`,
`css`, `yaml`, `markdown`, `svelte`, `txt`.

## VitePress-style code highlighting features

Greg supports VitePress-style code highlighting directives in both build-time
Shiki output and runtime rendering.

| Feature | VitePress | Greg |
| ------- | --------- | ---- |
| Language fence (` ```ts `) | ✅ | ✅ |
| Title in meta (` ```ts [file.ts] `) | ✅ | ✅ |
| Code groups (`::: code-group`) | ✅ | ✅ |
| Highlight lines (` ```ts{2,4} `) | ✅ | ✅ |
| Focused lines (`// [!code focus]`) | ✅ | ✅ |
| Diff markers (`// [!code ++]`, `--`) | ✅ | ✅ |

Language + title (supported):

<<< /__partials/markdown/examples/language-title.md

Output:

<!--@include: /__partials/markdown/examples/language-title.md-->

Line highlighting:

<<< /__partials/markdown/examples/line-highlighting.md

Output:

<!--@include: /__partials/markdown/examples/line-highlighting.md-->

Line numbers:

<<< /__partials/markdown/examples/line-numbers.md

Output:

<!--@include: /__partials/markdown/examples/line-numbers.md-->

Diff markers:

<<< /__partials/markdown/examples/diff.md

Output:

<!--@include: /__partials/markdown/examples/diff.md-->

Focused lines:

<<< /__partials/markdown/examples/focus.md

Output:

<!--@include: /__partials/markdown/examples/focus.md-->

See [VitePress incompatibilities](/incompatibilities) for areas outside code
highlighting.
