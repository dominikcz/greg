---
title: Steps
---

# Steps

The `Steps` component renders a numbered, visually connected procedure list —
ideal for installation guides, tutorials, and any sequential workflow.
It is inspired by the Starlight `<Steps>` component.

## Usage

`Steps` supports two authoring styles:

- Markdown tag usage in docs pages (`<Steps>...</Steps>`)
- Direct component usage in `.svelte` files

### Markdown tag usage

Wrap a standard Markdown ordered list with `<Steps>`. No import is needed —
the component is available automatically on every docs page.

````md
<Steps>

1. **Install dependencies**
   Run `npm install` in the project root.

2. **Start the dev server**
   ```bash
   npm run dev
   ```

3. **Open the app**
   Navigate to `http://localhost:5173` in your browser.

</Steps>

**Output:**
````

**Result:**

<Steps>

1. **Install dependencies**
   Run `npm install` in the project root.

2. **Start the dev server**
   Run `npm run dev` in your terminal.

3. **Open the app**
   Navigate to `http://localhost:5173` in your browser.

</Steps>

### Direct component usage (`.svelte`)

```svelte
<script>
   import Steps from '$components/Steps.svelte';
</script>

<Steps>
   <ol>
      <li><strong>Install dependencies</strong>Run <code>npm install</code>.</li>
      <li><strong>Start dev server</strong>Run <code>npm run dev</code>.</li>
      <li><strong>Open app</strong>Visit <code>http://localhost:5173</code>.</li>
   </ol>
</Steps>
```

**Output:**

Equivalent numbered steps UI as in Markdown usage.

## Step titles

The first **bold** text (`**…**`) in each list item is automatically styled
as a step title — slightly larger and heavier than the body text below it.

````md
<Steps>

1. **Clone the repository**
   `git clone https://github.com/your-org/your-repo.git`

2. **Configure environment variables**
   Copy `.env.example` to `.env` and fill in the required values.

3. **Run the tests**
   ```bash
   npm test
   ```

</Steps>
````

<Steps>

1. **Clone the repository**
   `git clone https://github.com/your-org/your-repo.git`

2. **Configure environment variables**
   Copy `.env.example` to `.env` and fill in the required values.

3. **Run the tests**
   Run `npm test` to verify everything is set up correctly.

</Steps>

## Rich step content

Each step can contain any block-level Markdown content — paragraphs, code
fences, custom containers, images, and nested lists.

````md
<Steps>

1. **Install the CLI**

   ::: tip Requires Node.js 18+
   Check your version with `node --version` before proceeding.
   :::

   ```bash
   npm install -g my-cli
   ```

2. **Initialise a project**

   ```bash
   my-cli init my-project
   cd my-project
   ```

3. **Deploy**

   - Review `my-cli.config.js`
   - Run `my-cli deploy`

</Steps>
````

<Steps>

1. **Install the CLI**

   ::: tip Requires Node.js 18+
   Check your version with `node --version` before proceeding.
   :::

   ```bash
   npm install -g my-cli
   ```

2. **Initialise a project**

   ```bash
   my-cli init my-project
   cd my-project
   ```

3. **Deploy**

   - Review `my-cli.config.js`
   - Run `my-cli deploy`

</Steps>

## Props

```ts
interface Props {
  /** Step content — should be a Markdown ordered list. */
  children?: Snippet;
}
```

## CSS variables

The component inherits Greg's accent and border colours automatically.
Override them globally or per page with CSS:

| Variable                   | Used for                                                 | Default value                                                                            |
| -------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `--greg-accent`            | Number circle border and number colour                   | `#646cff` (or theme `--greg-accent` value)                                               |
| `--greg-steps-guide-color` | Connector line between steps                             | `color-mix(in srgb, var(--greg-accent, #646cff) 42%, var(--greg-border-color, #e5e5ea))` |
| `--greg-steps-guide-gap`   | Gap between each point and connector line                | `0.375rem`                                                                               |
| `--greg-border-color`      | Fallback connector colour (used by guide-color fallback) | `#e5e5ea` (or theme `--greg-border-color` value)                                         |
| `--greg-color`             | Step title text colour                                   | `inherit` (or theme `--greg-color` value)                                                |

```css
/* Example: teal accent for steps */
.greg-steps {
  --greg-accent: #0d9488;
   --greg-steps-guide-color: #14b8a6;
   --greg-steps-guide-gap: 0.375rem;
}
```
