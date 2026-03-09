---
title: Versioning
order: 4
---

## Overview

Greg supports multi-version documentation builds with two source strategies:

- `branches` (default): reads docs from Git branches/refs
- `folders`: reads docs from local version directories

Run the build with:

```sh
greg build:versions
```

Output:

- built sites in `dist/versions/<version>`
- manifest in `dist/versions/versions.json`

## Configuration

```js
/** @type {import('@dominikcz/greg').GregConfig} */
export default {
  rootPath: '/docs',
  versioning: {
    strategy: 'branches',
    default: 'latest',
    pathPrefix: '/versions',
    aliases: {
      latest: '2.1',
      stable: '2.0'
    },
    branches: [
      { version: '2.1', branch: 'main', title: '2.1' },
      { version: '2.0', branch: 'release/2.0', title: '2.0' }
    ]
  }
}
```

Folder strategy:

```js
versioning: {
  strategy: 'folders',
  default: 'latest',
  folders: [
    { version: '2.1', dir: './docs', title: '2.1' },
    { version: '2.0', dir: './versions/2.0/docs', title: '2.0' }
  ]
}
```

## UI Components

Greg renders two visual versioning components automatically when a valid manifest is available:

- version switcher in the header
- outdated-version notice when the current version differs from the default

You can customize labels/messages with `versioning.ui`:

```js
versioning: {
  // ...
  ui: {
    versionMenuLabel: 'Version',
    manifestUnavailableText: 'Version selector unavailable',
    outdatedVersionMessage: 'You are viewing an older version ({current}). Recommended: {default}.',
    outdatedVersionActionLabel: 'Go to latest'
  }
}
```

Supported placeholders in `outdatedVersionMessage`:

- `{current}`
- `{default}`

## Fallback Behavior

If `versions.json` cannot be loaded:

- Greg hides the selector
- Greg shows `manifestUnavailableText` in the header

This keeps docs usable even if a deployment serves only a single version.

## Manifest Shape

```json
{
  "default": "latest",
  "versions": [
    { "version": "2.1", "title": "2.1", "path": "/versions/2.1/" },
    { "version": "2.0", "title": "2.0", "path": "/versions/2.0/" }
  ],
  "aliases": {
    "latest": "2.1",
    "stable": "2.0"
  }
}
```

`aliases` is a map (`alias -> version`), so alias targets are always unambiguous.
