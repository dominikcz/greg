---
title: Dołączanie zewnętrznych plików
order: 5
---

# Dołączanie zewnętrznych plików

## Snippety kodu - `<<<`

Zaimportuj zewnętrzny plik jako blok kodu:

```md
<<< @/snippets/example.js
```

Output:

<<< @/snippets/example.js

Alias `@` wskazuje root projektu. Język jest wykrywany po rozszerzeniu.

### Region

Zaimportuj tylko region (`#region name` / `#endregion`):

```md
<<< @/snippets/example.js#setup
```

Output:

<<< @/snippets/example.js#setup

### Zakres linii

```md
<<< @/snippets/example.js{5-10}
```

Output:

<<< @/snippets/example.js{5-10}

### Nadpisanie tytułu

```md
<<< @/snippets/example.js [my-example.js]
```

Output:

<<< @/snippets/example.js [my-example.js]

## Include Markdown - `<!--@include:-->`

Wstaw inny plik Markdown inline:

```md
<!--@include: /guide/__shared-warning.md-->
```

Plik `__shared-warning.md`:

<<< /guide/__shared-warning.md

Output:

<!--@include: /guide/__shared-warning.md-->

Dołączony plik przechodzi przez pełny pipeline Markdown.

Prefiks `/` jest liczony od katalogu `docs/`:

```md
<!--@include: /__partials/note.md-->
```

Output:

<!--@include: /__partials/note.md-->
