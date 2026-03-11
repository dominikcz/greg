---
title: Carbon Ads
---

# Carbon Ads

Greg supports [Carbon Ads](https://www.carbonads.net/) natively. When configured,
an ad unit is displayed at the bottom of the right-side Outline panel.


## Configuration

Pass the `carbonAds` prop to `<MarkdownDocs>`:

```svelte
<MarkdownDocs
  srcDir="/"
  version="1.0.0"
  carbonAds={{ code: 'CWYD42JW', placement: 'myprojectdev' }}
/>
```

| Option      | Type     | Description                    |
| ----------- | -------- | ------------------------------ |
| `code`      | `string` | Your Carbon Ads `serve` code   |
| `placement` | `string` | Your Carbon Ads placement name |


## Behaviour

- The Carbon Ads script is injected once on `onMount`.
- On every SPA navigation, `_carbonads.refresh()` is called automatically so the
  ad unit updates for the new page context.
- If `carbonAds` is not provided (the default), no script is injected and the
  Outline panel right edge is not shown.


## Styling

Carbon Ads renders inside a `.CarbonAds` container. Override the appearance with:

```css
:root {
  --greg-carbon-ads-bg-color: #f0f0f4;   /* falls back to --greg-menu-background */
}
```
