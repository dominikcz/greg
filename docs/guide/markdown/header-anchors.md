---
title: Header anchors
order: 1
---

# Header anchors

Every heading automatically receives a slug-based `id` so it can be linked to:

```md
## My Section
```

Renders as `<h2 id="my-section">`.

## Custom anchors

Override the auto-generated slug with a `{#custom-id}` suffix:

```md
## My Section {#custom-anchor}
```

This lets you link to `#custom-anchor` even if the heading text changes.
