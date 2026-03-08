---
title: Steps
---

# Steps

Komponent `Steps` renderuje numerowaną, wizualnie połączoną listę procedur.
Świetnie sprawdza się w instrukcjach instalacji, tutorialach i wszelkich workflow krok po kroku.
Jest inspirowany komponentem Starlight `<Steps>`.

## Użycie

`Steps` obsługuje dwa sposoby użycia:

- użycie taga Markdown na stronach docs (`<Steps>...</Steps>`)
- użycie bezpośrednie komponentu w plikach `.svelte`

### Użycie taga Markdown

Owiń standardową numerowaną listę Markdown w `<Steps>`. Import nie jest potrzebny.

````md
<Steps>

1. **Zainstaluj zależności**
   Uruchom `npm install` w katalogu projektu.

2. **Uruchom serwer deweloperski**
   ```bash
   npm run dev
   ```

3. **Otwórz aplikację**
   Przejdź do `http://localhost:5173` w przeglądarce.

</Steps>

**Output:**
````

**Result:**

<Steps>

1. **Zainstaluj zależności**
   Uruchom `npm install` w katalogu projektu.

2. **Uruchom serwer deweloperski**
   Uruchom `npm run dev` w terminalu.

3. **Otwórz aplikację**
   Przejdź do `http://localhost:5173` w przeglądarce.

</Steps>

### Bezpośrednie użycie komponentu (`.svelte`)

```svelte
<script>
   import Steps from '$components/Steps.svelte';
</script>

<Steps>
   <ol>
      <li><strong>Zainstaluj zależności</strong>Uruchom <code>npm install</code>.</li>
      <li><strong>Uruchom dev server</strong>Uruchom <code>npm run dev</code>.</li>
      <li><strong>Otwórz aplikację</strong>Przejdź do <code>http://localhost:5173</code>.</li>
   </ol>
</Steps>
```

**Output:**

Taki sam interfejs numerowanych kroków jak w przykładzie Markdown.

## Tytuły kroków

Pierwszy pogrubiony fragment (`**...**`) w każdym elemencie listy jest automatycznie stylowany jako tytuł kroku.

````md
<Steps>

1. **Sklonuj repozytorium**
   `git clone https://github.com/your-org/your-repo.git`

2. **Skonfiguruj zmienne środowiskowe**
   Skopiuj `.env.example` do `.env` i uzupełnij wymagane wartości.

3. **Uruchom testy**
   ```bash
   npm test
   ```

</Steps>
````

<Steps>

1. **Sklonuj repozytorium**
   `git clone https://github.com/your-org/your-repo.git`

2. **Skonfiguruj zmienne środowiskowe**
   Skopiuj `.env.example` do `.env` i uzupełnij wymagane wartości.

3. **Uruchom testy**
   Uruchom `npm test`, aby zweryfikować konfigurację.

</Steps>

## Bogata zawartość kroków

Każdy krok może zawierać dowolną treść blokową Markdown: akapity, bloki kodu, kontenery, obrazy i listy zagnieżdżone.

````md
<Steps>

1. **Zainstaluj CLI**

   ::: tip Wymagany Node.js 18+
   Sprawdź wersję poleceniem `node --version`.
   :::

   ```bash
   npm install -g my-cli
   ```

2. **Zainicjalizuj projekt**

   ```bash
   my-cli init my-project
   cd my-project
   ```

3. **Wdróż**

   - Sprawdź `my-cli.config.js`
   - Uruchom `my-cli deploy`

</Steps>
````

<Steps>

1. **Zainstaluj CLI**

   ::: tip Wymagany Node.js 18+
   Sprawdź wersję poleceniem `node --version`.
   :::

   ```bash
   npm install -g my-cli
   ```

2. **Zainicjalizuj projekt**

   ```bash
   my-cli init my-project
   cd my-project
   ```

3. **Wdróż**

   - Sprawdź `my-cli.config.js`
   - Uruchom `my-cli deploy`

</Steps>

## Właściwości

```ts
interface Props {
  /** Treść kroków - powinna być numerowaną listą Markdown. */
  children?: Snippet;
}
```

## Zmienne CSS

Komponent dziedziczy kolory akcentu i obramowań Greg.

| Zmienna                    | Zastosowanie                                             | Domyślna wartość                                                                            |
| -------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `--greg-accent`            | Obramowanie i kolor numeru w kółku                       | `#646cff` (lub wartość motywu `--greg-accent`)                                               |
| `--greg-steps-guide-color` | Linia łącząca kroki                                      | `color-mix(in srgb, var(--greg-accent, #646cff) 42%, var(--greg-border-color, #e5e5ea))`   |
| `--greg-steps-guide-gap`   | Odstęp między punktem kroku a linią                      | `0.375rem`                                                                                   |
| `--greg-border-color`      | Fallback koloru linii                                    | `#e5e5ea` (lub wartość motywu `--greg-border-color`)                                         |
| `--greg-color`             | Kolor tytułu kroku                                       | `inherit` (lub wartość motywu `--greg-color`)                                                |

```css
/* Przykład: turkusowy akcent dla Steps */
.greg-steps {
  --greg-accent: #0d9488;
   --greg-steps-guide-color: #14b8a6;
   --greg-steps-guide-gap: 0.375rem;
}
```
