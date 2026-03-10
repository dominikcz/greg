---
title: Versioning
order: 4
---

## Overview

Greg supports multi-version documentation builds with two source strategies:

- `branches` (default): reads docs from Git branches/refs
- `folders`: reads docs from local version directories

Both strategies produce the same final artifact (`<outDir>/__versions/<version>` + `versions.json`).
After build, Greg also syncs the default version to `dist/` so the root output can be hosted directly.
The difference is where source docs come from and how reproducible each build is.

`branches` is commit-oriented: each version is tied to a Git ref and resolved to a SHA.
This is usually best for released docs because output can be reproduced from repository history and branch build cache can speed up repeated runs.

`folders` is workspace-oriented: each version is read from local directories in your current working tree.
This is usually best when you keep multiple docs trees side-by-side, want quick local iteration, or do not want to depend on Git refs.

### Strategy Philosophy, Pros and Cons

`branches`:

- Pros:
  - reproducible from Git history (ref -> commit SHA)
  - good fit for release workflow (`main`, `release/*`, tags)
  - cache re-use when the same SHA was already built
- Cons:
  - requires valid refs and docs content available in those refs
  - more moving parts (snapshot + branch cache)

`folders`:

- Pros:
  - simple mental model: build exactly what exists in directories now
  - very convenient for local development and migration periods
  - no Git ref resolution required
- Cons:
  - output depends on current workspace state (less reproducible by default)
  - no commit-based cache reuse per version

Recommended choice:

- choose `branches` when docs versions should follow repository history and release refs
- choose `folders` when docs versions are maintained as separate directory trees in one checkout

## Rules

1. Configure versioning in `greg.config.js` (or `greg.config.ts`) under `versioning`.
2. Pick one strategy in `versioning.strategy`.
3. Define version-to-source mapping:
   - `branches[]`: `version` + `branch`
   - `folders[]`: `version` + `dir`
4. Set `default` and optional `aliases` for selector behavior.

## Branch Mode Guide

Use branch mode when each docs version should be built from a Git branch/ref.

Set:

1. `strategy: "branches"`
2. `branches[]` entries with `version`, `branch`, optional `docsDir`, `title`
3. `default` and optional `aliases`

Example:

```js [greg.config.js]
export default {
  versioning: {
    strategy: "branches",
    default: "latest",
    aliases: {
      latest: "2.1",
      stable: "2.0"
    },
    branches: [
      { version: "2.1", branch: "main", title: "2.1" },
      { version: "2.0", branch: "release/2.0", title: "2.0" }
    ]
  }
};
```

How versioning works in this mode:

1. For every `branches[]` entry, Greg resolves `branch` to a commit SHA.
2. Greg creates or reuses a cached docs snapshot for that SHA under `.greg/version-cache/sources/...`.
3. Greg builds the site for that snapshot (or reuses cached build output for the same SHA).
4. Greg copies final output to `<outDir>/__versions/<version>`.
5. After all versions are processed, Greg writes one manifest file to `<outDir>/__versions/versions.json`.
6. Greg syncs the default version output to `dist/`.

Important: Greg does not checkout branches in your working tree. It reads files directly from Git objects.

## Folder Mode Guide

Use folder mode when each docs version should come from a directory in your working tree.

Set:

1. `strategy: "folders"`
2. `folders[]` entries with `version`, `dir`, optional `rootPath`, `title`
3. `default` and optional `aliases`

Example:

```js [greg.config.js]
export default {
  versioning: {
    strategy: "folders",
    default: "latest",
    aliases: {
      latest: "2.1",
      stable: "2.0"
    },
    folders: [
      { version: "2.1", dir: "./docs", title: "2.1" },
      { version: "2.0", dir: "./versions/2.0/docs", title: "2.0" }
    ]
  }
};
```

How versioning works in this mode:

1. For every `folders[]` entry, Greg resolves `dir` to an absolute path.
2. Greg runs a full Vite build using that directory as docs source.
3. The temporary build output is copied to `<outDir>/__versions/<version>`.
4. After all versions are processed, Greg writes `<outDir>/__versions/versions.json`.
5. Greg syncs the default version output to `dist/`.

Important: in folder mode, each configured version is rebuilt from current local files on each run.

## Commands

Run commands only after config is in place.

Recommended entry point:

```sh
greg build
```

If `versioning` is configured, `greg build` automatically runs multi-version build.
This prevents accidental replacement of versioned output by a single build.

VitePress-compatible defaults in this flow:

- top-level `greg.config.* > outDir` controls where versions are emitted (`<outDir>/__versions`)
- top-level `greg.config.* > base` is used to derive default manifest URL prefix

Force single-version Vite build (even with versioning configured):

```sh
greg build --single
```

Output:

- built sites in `<outDir>/__versions/<version>` (default `dist/__versions/<version>`)
- manifest in `<outDir>/__versions/versions.json`
- default version copied to `dist/` for direct hosting

What exactly happens when Greg runs multi-version build (`greg build` with versioning):

1. Greg loads `greg.config.js` or `greg.config.ts` and validates `versioning` schema.
2. Greg selects strategy (`versioning.strategy`, default `branches`).
3. Greg prepares working directories: output root (default `<outDir>/__versions`, where `outDir` defaults to `dist`), temporary work root (`.greg/version-build`), and branch cache root (`.greg/version-cache`).
4. Greg builds each configured version according to strategy.
5. Greg validates uniqueness of version IDs and validates aliases (`alias -> version`).
6. Greg resolves default version (configured `default` or first built version).
7. Greg writes `versions.json` manifest and reports output paths.
8. Greg copies the default version build to hosting root (`dist/` by default).

What this command changes on disk:

- writes/updates files in `<outDir>/__versions`
- writes/updates files in `dist` (default version sync)
- writes/updates internal working data under `.greg/`
- does not modify your source docs files
- does not switch your checked out Git branch

Optional maintenance flags:

- `--clean-cache`: removes `.greg/version-cache` before building
- `--clean-versions`: removes the versioned output directory before building
- `--rebuild-all`: rebuilds every configured version and skips branch build cache reuse for this run

## UI Components

Greg renders two visual versioning components automatically when a valid manifest is available:

- version switcher in the header
- outdated-version notice when the current version differs from the default

You can customize labels/messages with `versioning.ui`:

```js [greg.config.js]
export default {
  versioning: {
    ui: {
      versionMenuLabel: "Version",
      manifestUnavailableText: "Version selector unavailable",
      showManifestUnavailableStatus: false,
      outdatedVersionMessage: "You are viewing an older version ({current}). Recommended: {default}.",
      outdatedVersionActionLabel: "Go to latest"
    }
  }
};
```

Supported placeholders in `outdatedVersionMessage`:

- `{current}`
- `{default}`

### Locale-specific versioning UI

If your site uses locale routes, you can override versioning UI text per locale via `versioning.locales`:

```js [greg.config.js]
export default {
  versioning: {
    locales: {
      "/": {
        ui: {
          versionMenuLabel: "Version"
        }
      },
      "/pl/": {
        ui: {
          versionMenuLabel: "Wersja",
          outdatedVersionActionLabel: "Przejdz do najnowszej"
        }
      }
    }
  }
};
```

Text resolution priority:

1. `versioning.locales[active-locale].ui`
2. `versioning.ui`
3. built-in defaults

`showManifestUnavailableStatus` is global-only and must be configured in `versioning.ui`.

## Fallback Behavior

If `versions.json` cannot be loaded:

- Greg hides the selector
- Greg shows `manifestUnavailableText` in the header only when `showManifestUnavailableStatus` is not `false`

This keeps docs usable even if a deployment serves only a single version.

## Manifest Shape

```json
{
  "default": "latest",
  "versions": [
    { "version": "2.1", "title": "2.1", "path": "/__versions/2.1/" },
    { "version": "2.0", "title": "2.0", "path": "/__versions/2.0/" }
  ],
  "aliases": {
    "latest": "2.1",
    "stable": "2.0"
  }
}
```

`aliases` is a map (`alias -> version`), so alias targets are always unambiguous.



