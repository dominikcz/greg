---
title: Getting Started
order: 1
---

## What is Greg?

Greg is a **documentation engine built on Svelte 5 and Vite**. You write your
content in plain Markdown files, Greg turns them into a fast, polished
single-page site — complete with responsive sidebar navigation, full-text
search, dark/light mode, code syntax highlighting, and a rich set of Markdown
extensions.

Greg is inspired by [VitePress](https://vitepress.dev){target="_blank" rel="noopener noreferrer"} and reuses most of its Markdown
syntax and configuration conventions, but runs on Svelte 5 instead of Vue.
If you have used VitePress before, you will feel right at home.

## Prerequisites

Before you start, make sure the following are installed:

| Tool    | Required version | How to check         |
| ------- | ---------------- | -------------------- |
| Node.js | ≥ 18             | `node --version`     |
| npm     | comes with Node  | `npm --version`      |

You do **not** need to install Svelte or Vite separately — the `init` wizard
or the manual install step handles those for you.

---

## Option A — New project from scratch

This is the recommended path if you are starting fresh with no existing
codebase.

### 1. Create an empty folder and open it

```sh
mkdir my-docs
cd my-docs
```

### 2. Run the interactive initializer

```sh
npx @dominikcz/greg init
```

The wizard asks a handful of questions:

| Question | What it does |
| -------- | ------------ |
| **Docs directory** | Where your Markdown files will live. Default: `docs` |
| **Site title** | Shown in the browser tab and the site header |
| **Description** | Used in the HTML `<meta>` tag |
| **TypeScript** | Creates `.ts` config files instead of `.js` |
| **Config mode** | Choose **minimal** (default) or **full** `greg.config` template |
| **Add npm scripts** | Adds `greg`, `dev`, `build` and `preview` to `package.json` |
| **Starter content** | _Empty_ — bare minimum; _Sample_ — example pages; _Generated_ — large fake docs set |
| **Install now** | Runs `npm install` (or your package manager) right away |

When it finishes, you will see a summary of created files.
The scaffold also includes a default `.gitignore` and copies baseline assets into `public/`.

### 3. Start the development server

```sh
npm run dev
```

Open `http://localhost:5173` in your browser — your docs site is running.
Every time you save a `.md` file the page updates instantly without a full
reload.

### 4. Write your first page

Edit or create any `.md` file inside the `docs/` folder:

```md
<!-- docs/guide/my-first-page.md -->
---
title: My First Page
---

# Hello, Greg!

This is my first docs page.
```

Save the file — it immediately appears in the sidebar and becomes accessible
at `/guide/my-first-page`.

---

## Option B — Add Greg to an existing project

Use this path if you already have a Vite project (for example a Svelte app)
and want to add a docs section to it.

### 1. Install the packages

```sh
npm install --save-dev @dominikcz/greg @sveltejs/vite-plugin-svelte svelte vite
```

### 2. Create the config files

**`greg.config.js`** — site-level settings:

```js
export default {
    srcDir: 'docs',     // folder where your .md files live
    docsBase: '',       // URL prefix — '' means docs are at the root URL
    mainTitle: 'My Docs',
    sidebar: 'auto',    // auto-generate sidebar from folder structure
}
```

`srcDir` can also be an array if your markdown sources are split across folders:

```js
export default {
  srcDir: ['docs', 'api-docs', 'handbook'],
  docsBase: '',
}
```

In that case, Greg scans all listed folders for `.md` files.

**`svelte.config.js`** — re-export Greg's bundled Svelte config (includes
mdsvex for Markdown processing):

```js
export { default } from '@dominikcz/greg/svelte.config'
```

**`vite.config.js`** — register the Greg Vite plugins:

```js
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import {
    vitePluginGregConfig,
    vitePluginSearchIndex,
    vitePluginSearchServer,
    vitePluginFrontmatter,
    vitePluginCopyDocs,
} from '@dominikcz/greg/plugins'

const docsDir = ['docs', 'api-docs', 'handbook']
const docsBase = ''

export default defineConfig({
    plugins: [
        svelte(),
        vitePluginGregConfig(),
        vitePluginSearchIndex({ docsDir, srcDir: docsBase }),
        vitePluginSearchServer({ docsDir, srcDir: docsBase }),
        vitePluginFrontmatter({ docsDir, srcDir: docsBase }),
        vitePluginCopyDocs({ docsDir, srcDir: docsBase }),
    ],
})
```

  `docsDir` in Greg Vite plugins accepts either a string (single folder) or a string array (multiple folders).

**`index.html`** — minimal HTML entry point:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Docs</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

**`src/main.js`** — Vite entry point:

```js
import App from './App.svelte'
import { mount } from 'svelte'

const app = mount(App, { target: document.getElementById('app') })
export default app
```

**`src/App.svelte`** — mount the docs engine:

```svelte
<script>
    import MarkdownDocs from '@dominikcz/greg'
</script>

<MarkdownDocs />
```

### 3. Create your first Markdown page

```sh
mkdir docs
```

```md
<!-- docs/index.md -->
---
title: Home
---

# Welcome

This is the home page of my documentation.
```

### 4. Add scripts to `package.json`

```json
{
  "scripts": {
    "dev":     "greg dev",
    "build":   "greg build",
    "preview": "greg preview"
  }
}
```

Then run:

```sh
npm run dev
```

---

## Project structure explained

After setup your project will look like this:

```text
.
├─ docs/                  ← all your Markdown content lives here
│  ├─ index.md            ← home page (shown at the root URL)
│  ├─ guide/
│  │  ├─ index.md         ← section landing page
│  │  └─ getting-started.md
│  └─ reference/
├─ src/
│  ├─ App.svelte          ← mounts <MarkdownDocs> (rarely needs editing)
│  └─ main.js             ← Vite entry point
├─ svelte.config.js       ← Svelte + mdsvex options (must be plain .js)
├─ vite.config.js         ← Vite config with Greg plugins
├─ greg.config.js         ← title, sidebar, nav, locales, search …
└─ package.json
```

Key rules:
- Every `.md` file in `docs/` becomes a page. The URL matches its file path.
- Files and folders whose name starts with `__` (double underscore) are
  **not** turned into pages — use this for partials and shared snippets.
- `index.md` in any folder is accessible at the folder URL (e.g.
  `docs/guide/index.md` → `/guide`).

## The `greg.config.js` file

This is the main configuration file. The most commonly used options:

```js
export default {
    srcDir: 'docs',        // path to your Markdown files
    docsBase: '',          // URL prefix for all docs pages
    mainTitle: 'My Docs',  // site title shown in header
    sidebar: 'auto',       // 'auto' builds sidebar from folder structure

    // Manual sidebar (optional):
    // sidebar: [
    //   { text: 'Guide', auto: '/guide' },
    //   { text: 'Reference', auto: '/reference' },
    // ],

    // Top navigation bar (optional):
    // nav: [
    //   { text: 'Guide', link: '/guide' },
    //   { text: 'Reference', link: '/reference' },
    // ],

    outline: [2, 3],       // show h2 and h3 in the on-page outline
}
```

See the [`<MarkdownDocs>` reference](/reference/markdowndocs) for a complete
list of all configuration options.

## Development server

```sh
npm run dev
# equivalent: greg dev
```

- Serves at `http://localhost:5173` by default
- Markdown file saves trigger instant hot-reload — no full page refresh
- The search index is rebuilt automatically in the background

## Production build

```sh
npm run build
# equivalent: greg build
```

Outputs a fully static SPA in `dist/`. The build:
- Pre-renders all page metadata and the search index
- Bundles and optimises all CSS and JavaScript
- Copies your Markdown files so they can be served statically

The resulting `dist/` folder can be deployed to any static hosting service.
See [Deploying](./deploying) for step-by-step hosting guides.

## Next steps

Now that your site is running, explore these topics:

- **[Markdown extensions](./markdown)** — tables, code groups, callouts, math,
  diagrams and more
- **[Routing](./routing)** — how URLs are resolved from file paths
- **[Localization](./localization)** — multi-language docs with automatic UI
  translations
- **[Search](../reference/search)** — configure full-text search
- **[Deploying](./deploying)** — publish to GitHub Pages, Netlify, Vercel, etc.
