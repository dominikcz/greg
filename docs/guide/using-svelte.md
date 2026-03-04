---
title: Using Svelte in Markdown
order: 4
---

# Using Svelte in Markdown

Greg processes every `.md` file through [mdsvex](https://mdsvex.pngwn.io/), a
Markdown preprocessor for Svelte. This means you can mix regular Markdown with
Svelte components, reactive state and template logic anywhere in your pages.


## Auto-imported components

All Greg UI components are automatically available in every Markdown page — no
`<script>` block needed:

```md
### Status <Badge type="tip" text="stable" />

<Features features={[
  { title: 'Fast', details: 'Shiki highlights at build time.' },
  { title: 'Searchable', details: 'Fuse.js fuzzy search included.' },
]} />
```

The following components are always in scope:

`Badge`, `Button`, `Image`, `Link`, `Feature`, `Features`, `Hero`,
`SocialLink`, `SocialLinks`, `TeamMember`, `TeamMembers`,
`TeamPage`, `TeamPageTitle`, `TeamPageSection`


## Adding a `<script>` block

You can add your own `<script>` block to a page:

```md
<script>
  import { onMount } from 'svelte';
  let now = $state(new Date().toLocaleTimeString());
  onMount(() => setInterval(() => now = new Date().toLocaleTimeString(), 1000));
</script>

Current time: **{now}**
```

> **Note:** mdsvex does not support `<script module>`. Use a plain `<script>`.
> The `setup` attribute from Vue/VitePress syntax is stripped automatically if
> present, so copy-pasting VitePress examples still works.


## Template syntax

Standard Svelte template syntax works inside Markdown:

```md
{#each items as item}
- {item.name}
{/each}

{#if showNote}
> [!NOTE]
> This note is conditional.
{/if}
```


## Escaping `{` and `}`

Bare `{…}` expressions in regular Markdown text that are **not** part of Svelte
syntax may cause parse errors. Escape them with HTML entities:

```md
Pass an options object like `&#123; key: value &#125;`.
```

Inside fenced code blocks and backtick inline code, `{` and `}` are escaped
automatically by the `remarkEscapeSvelte` plugin — no action required.


## Limitations

- `<script module>` is not supported inside `.md` files.
- `<style>` blocks inside `.md` files are processed by Svelte but are scoped to
  the component — they affect the whole page body.
- Hot-module replacement works for Markdown content, but adding or removing a
  file requires a server restart (Vite re-globs the module list).
