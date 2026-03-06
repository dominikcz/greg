---
title: Steps
order: 11
---

# Steps

The `Steps` component renders a numbered, visually connected procedure list —
ideal for installation guides, tutorials, and any sequential workflow.
It is inspired by the Starlight `<Steps>` component.

## Usage

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

| Variable | Used for |
| -------- | -------- |
| `--greg-accent` | Number circle border and number colour |
| `--greg-steps-guide-color` | Connector line between steps |
| `--greg-border-color` | Fallback connector colour (when guide variable is not set) |
| `--greg-color` | Step title text colour |

```css
/* Example: teal accent for steps */
.greg-steps {
  --greg-accent: #0d9488;
   --greg-steps-guide-color: #14b8a6;
}
```
