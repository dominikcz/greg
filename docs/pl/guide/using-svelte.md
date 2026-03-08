---
title: Svelte w Markdown
order: 4
---

# Svelte w Markdown

Greg przetwarza każdy `.md` przez [mdsvex](https://mdsvex.pngwn.io/), więc możesz mieszać Markdown z komponentami Svelte, reaktywnością i logiką szablonów.

## Komponenty auto-importowane

Wbudowane komponenty Greg są dostępne na każdej stronie bez `<script>`:

```md
### Status <Badge type="tip" text="stabilne" />

<Features features={[
  { title: 'Szybko', details: 'Shiki podświetla kod podczas builda.' },
  { title: 'Wyszukiwalne', details: 'Fuse.js jest wbudowany.' },
]} />
```

Dostępne komponenty:

`Badge`, `Button`, `Image`, `Link`, `Feature`, `Features`, `Hero`, `SocialLink`, `SocialLinks`, `Steps`, `TeamMember`, `TeamMembers`, `TeamPage`, `TeamPageTitle`, `TeamPageSection`.

## Własny blok `<script>`

```md
<script>
  import { onMount } from 'svelte';
  let now = $state(new Date().toLocaleTimeString());
  onMount(() => setInterval(() => now = new Date().toLocaleTimeString(), 1000));
</script>

Aktualny czas: **{now}**
```

> **Uwaga:** mdsvex nie wspiera `<script module>`. Używaj zwykłego `<script>`.

## Składnia szablonów

```md
{#each items as item}
- {item.name}
{/each}

{#if showNote}
> [!NOTE]
> Ta notatka jest warunkowa.
{/if}
```

## Escapowanie `{` i `}`

Gdy klamry nie są składnią Svelte, escapuj je encjami HTML:

```md
Przekaż obiekt opcji jak `&#123; key: value &#125;`.
```

W kodzie (fenced i inline) klamry są escapowane automatycznie przez `remarkEscapeSvelte`.

## Ograniczenia

- brak wsparcia dla `<script module>` w `.md`,
- `<style>` w `.md` jest przetwarzane przez Svelte i dotyczy całej strony,
- HMR działa dla zmian treści, ale dodanie/usunięcie pliku zwykle wymaga restartu serwera.
