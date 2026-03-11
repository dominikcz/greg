---
title: Wdrażanie
order: 6
---

# Wdrażanie

Greg buduje aplikację SPA. Serwer WWW musi zwracać `index.html` dla każdej trasy, która nie odpowiada fizycznemu plikowi.

## Build

```sh
npm run build
```

Wynik trafia do `dist/`:

```
dist/
  index.html
  assets/
  search-index.json
  <pliki z public/>
```

## Generowanie statycznych tras

Jeśli hosting nie wspiera fallbacku SPA, możesz wygenerować kopie `index.html` dla każdej trasy:

```sh
greg build:static
```

Polecenie uruchamia `vite build`, a następnie kopiuje `dist/index.html` do
`dist/<route>/index.html` dla każdej znanej strony. Dzięki temu działa to nawet
na prostym hostingu statycznym bez reguł przepisywania.

## Eksport Markdown

Aby wyeksportować rozwinięte pliki Markdown (z includami i snippetami):

```sh
greg build:markdown
```

Domyślnie wynik trafia do `dist/resolved-markdown/`.
Możesz użyć `--docsDir` lub `--outDir`, aby zmienić ścieżki.

## Fallback SPA - konfiguracja serwera

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

### Netlify

`public/_redirects`:

```
/* /index.html 200
```

Lub konfiguracja w `netlify.toml`:

```toml
[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200
```

### Vercel

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## GitHub Pages

GitHub Pages natywnie nie wspiera fallbacku SPA. Typowy workaround:

1. Skopiuj `dist/index.html` do `dist/404.html` po buildzie.
2. Dodaj skrypt przekierowujący w `404.html`, który odtwarza oryginalny URL.

Alternatywnie użyj GitHub Actions i workflow dla deployu SPA.

## Base path

Jeśli docs są serwowane z subścieżki (np. `https://example.com/my-project/`),
ustaw `base` w `vite.config.js`:

```js
export default defineConfig({
  base: '/my-project/',
  // ...
});
```

Zaktualizuj też `srcDir` w `greg.config.js`:

```js
export default {
  srcDir: '/my-project/docs',
  // ...
}
```

I `srcDir` w pluginach Vite (`vite.config.js`):

```js
vitePluginSearchIndex({ docsDir: 'docs', srcDir: '/my-project/docs' }),
vitePluginSearchServer({ docsDir: 'docs', srcDir: '/my-project/docs' }),
```
