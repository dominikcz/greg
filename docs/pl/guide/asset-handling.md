---
title: Obsługa zasobów
order: 5
---

# Obsługa zasobów

Greg korzysta z Vite, więc obowiązują standardowe reguły obsługi assetów z Vite.

## Odwołania do obrazów

### Z Markdown

Ścieżki relatywne są liczone od położenia pliku `.md`:

```md
![diagram](./images/diagram.png)
```

Domyślnie obrazy w Markdown są renderowane jako miniatury. Kliknij obraz,
aby otworzyć podgląd w pełnym rozmiarze.

Gdy podgląd jest włączony, pod miniaturą pojawia się podpis:
- najpierw z `title`,
- a jeśli `title` brak, z tekstu `alt`.

Możesz globalnie wyłączyć to zachowanie w `greg.config.js`:

```js
export default {
  markdownImagePreview: false,
}
```

Ścieżki absolutne są liczone od katalogu `public/`:

```md
![logo](/logo.svg)
```

### Z katalogu `public/`

Pliki w `public/` są serwowane bez przetwarzania:

```
public/
  logo.svg         ->  /logo.svg
  favicon.ico      ->  /favicon.ico
```

## Statyczne zasoby przetwarzane przez Vite

Zasoby importowane przez URL relatywne są przetwarzane przez Vite (hash, optymalizacje itd.). W `.svelte` używaj zwykłego `import`:

```svelte
<script>
  import logo from '../assets/logo.svg';
</script>

<img src={logo} alt="Logo" />
```

## Atrybuty inline

Składnia [inline attributes](/guide/markdown/inline-attributes) pozwala dodać `width`, `height` lub klasy bezpośrednio w Markdown:

```md
![diagram](./schema.png){width=640 height=480}

![icon](/icons/info.svg){class="inline-icon" width=24}
```

## Komponent `<Image>`

`<Image>` renderuje `<picture>` z wariantami `light` i `dark`.

```md
<Image
  src="/logo-light.svg"
  dark="/logo-dark.svg"
  alt="Greg logo"
/>
```

| Właściwość | Typ               | Opis                                  |
| -------- | ----------------- | ------------------------------------- |
| `src`    | `string`          | Domyślny URL obrazu (lub dla light)   |
| `dark`   | `string?`         | URL obrazu dla ciemnego motywu        |
| `alt`    | `string?`         | Tekst alternatywny                    |
| `width`  | `number|string?`  | Szerokość                             |
| `height` | `number|string?`  | Wysokość                              |
