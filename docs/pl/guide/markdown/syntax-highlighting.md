---
title: Podświetlanie składni
order: 4
---

## Podświetlanie składni

Bloki kodu są podświetlane w buildzie przez [Shiki](https://shiki.style) z motywami `github-light` (jasny) i `github-dark` (ciemny):

<<< /__partials/markdown/examples/basic.md

Output:

<!--@include: /__partials/markdown/examples/basic.md-->

Obsługiwane języki obejmują m.in. `javascript`, `typescript`, `bash`, `json`, `html`, `css`, `yaml`, `markdown`, `svelte`, `txt`.

## Funkcje podświetlania kodu

Greg obsługuje dyrektywy podświetlania kodu zarówno w renderingu build-time,
jak i runtime.

| Funkcja                              | Obsługiwane |
| ------------------------------------ | ----------- |
| Fenced language (` ```ts `)          | ✅           |
| Tytuł w meta (` ```ts [file.ts] `)   | ✅           |
| Grupy kodu (`::: code-group`)        | ✅           |
| Podświetlenie linii (` ```ts{2,4} `) | ✅           |
| Focus linii (`// [!code focus]`)     | ✅           |
| Markery diff (`// [!code ++]`, `--`) | ✅           |

Język + tytuł:

<<< /__partials/markdown/examples/language-title.md

Output:

<!--@include: /__partials/markdown/examples/language-title.md-->

Podświetlenie linii:

<<< /__partials/markdown/examples/line-highlighting.md

Output:

<!--@include: /__partials/markdown/examples/line-highlighting.md-->

Numery linii:

<<< /__partials/markdown/examples/line-numbers.md

Output:

<!--@include: /__partials/markdown/examples/line-numbers.md-->

Diff:

<<< /__partials/markdown/examples/diff.md

Output:

<!--@include: /__partials/markdown/examples/diff.md-->

Focus:

<<< /__partials/markdown/examples/focus.md

Output:

<!--@include: /__partials/markdown/examples/focus.md-->

Zobacz też [Niezgodności](/incompatibilities) dla różnic platformowych.
