---
title: Badge
---

# Badge

Komponent `Badge` dodaje etykietę statusu inline do nagłówków lub zwykłej treści.

## Użycie

`Badge` obsługuje dwa style:

- użycie inline w Markdown (`<Badge ... />`)
- użycie bezpośrednie komponentu w `.svelte`

### Markdown

`Badge` jest dostępny bez importu:

```md
### Tytuł <Badge type="info" text="domyślne" />
### Tytuł <Badge type="tip" text="stabilne" />
### Tytuł <Badge type="warning" text="beta" />
### Tytuł <Badge type="danger" text="przestarzałe" />
```

**Output:**

### Tytuł <Badge type="info" text="domyślne" />
### Tytuł <Badge type="tip" text="stabilne" />
### Tytuł <Badge type="warning" text="beta" />
### Tytuł <Badge type="danger" text="przestarzałe" />

### `.svelte`

```svelte
<script>
  import Badge from '$components/Badge.svelte';
</script>

<h3>
  Tytuł <Badge type="tip" text="stabilne" />
</h3>
```

**Output:**

Równoważna etykieta statusu inline renderowana obok tekstu nagłówka.

## Własna treść children

Przekaż treść jako children zamiast używać właściwości `text`:

```md
### Tytuł <Badge type="info">własna treść</Badge>
```

### Tytuł <Badge type="info">własna treść</Badge>

## Właściwości

```ts
interface Props {
  /** Tekst etykiety. Ignorowany, gdy przekazano children. */
  text?: string;

  /** Wariant koloru badge. Domyślnie 'tip'. */
  type?: 'info' | 'tip' | 'warning' | 'danger';

  /** Svelte snippet - nadpisuje `text`. */
  children?: Snippet;
}
```

## Zmienne CSS

Możesz nadpisać kolory badge przez zmienne Greg:

```css
:root {
  --greg-info-border: transparent;
  --greg-info-text:   var(--greg-accent);
  --greg-info-bg:     rgba(100, 108, 255, 0.08);

  --greg-tip-border:  transparent;
  --greg-tip-text:    #2d9e68;
  --greg-tip-bg:      rgba(66, 184, 131, 0.08);

  --greg-warning-border: transparent;
  --greg-warning-text:   #7d4e00;
  --greg-warning-bg:     rgba(201, 126, 10, 0.08);

  --greg-danger-border: transparent;
  --greg-danger-text:   #c81d1d;
  --greg-danger-bg:     rgba(224, 82, 82, 0.08);
}
```
