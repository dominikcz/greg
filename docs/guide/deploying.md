---
title: Deploying
order: 6
---

# Deploying

Greg outputs a **single-page application (SPA)**. All URLs are handled
client-side, so the web server must serve `index.html` for every route that
does not match a static file.


## Build

```sh
npm run build
```

The output is placed in `dist/`. It contains:

```
dist/
  index.html
  assets/          ← JS, CSS, fonts (content-hashed)
  search-index.json
  <any public/ files>
```


## Static route generation

If your hosting does not support SPA fallback rules, you can pre-generate
`index.html` copies for every docs route:

```sh
greg build:static
```

This runs `vite build` followed by a post-processing step that copies
`dist/index.html` to `dist/<route>/index.html` for every known page.
The result works on any static file server without rewrite configuration.


## Markdown export

To export resolved Markdown files (with all includes and snippets expanded):

```sh
greg build:markdown
```

The output lands in `dist/resolved-markdown/` by default.
Pass `--docsDir` or `--outDir` to customise paths.


## SPA fallback — server configuration

Configure your server to return `index.html` for all `404` responses.

### Nginx

```nginx
server {
  root /var/www/my-docs/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### Apache (`.htaccess`)

```apache [httpd.conf]
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### Caddy

```caddyfile
my-docs.example.com {
  root * /var/www/my-docs/dist
  file_server
  try_files {path} /index.html
}
```


## Netlify

Add a `public/_redirects` file:

```
/* /index.html 200
```

Or use `netlify.toml`:

```toml
[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200
```


## Vercel

Add a `vercel.json` at the project root:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```


## GitHub Pages

GitHub Pages does not natively support SPA fallback. The common workaround is:

1. Copy `dist/index.html` → `dist/404.html` after the build.
2. Add a redirect script in `404.html` to restore the original URL and reload.

Alternatively, use [GitHub Actions + a custom workflow](https://vitejs.dev/guide/static-deploy#github-pages) with the approach above.


## Base path

If your docs are served from a sub-path (e.g. `https://example.com/my-project/`),
set `base` in `vite.config.js`:

```js
export default defineConfig({
  base: '/my-project/',
  // …
});
```

Also update `rootPath` in `greg.config.js`:

```js
export default {
  rootPath: '/my-project/docs',
  // …
}
```

And the `rootPath` in the Vite plugins (`vite.config.js`):

```js
vitePluginSearchIndex({ docsDir: 'docs', rootPath: '/my-project/docs' }),
vitePluginSearchServer({ docsDir: 'docs', rootPath: '/my-project/docs' }),
```
