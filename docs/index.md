<Hero
  name="Greg"
  text="Svelte-powered documentation engine"
  tagline="Write Markdown, get beautiful documentation — hot-reloaded in milliseconds."
  actions={[
    { theme: 'brand', text: 'Getting Started', link: '/docs/guide/getting-started' },
    { theme: 'alt', text: 'Markdown Reference', link: '/docs/guide/markdown' },
  ]}
/>

<Features features={[
  { icon: '📝', title: 'Markdown-first', details: 'Write docs in plain Markdown, enhanced with custom containers, code groups, math and more.' },
  { icon: '⚡', title: 'Vite-powered', details: 'Instant server start, lightning-fast HMR, and full access to the Vite plug-in ecosystem.' },
  { icon: '🔷', title: 'Built with Svelte 5', details: 'Use Svelte components directly inside Markdown pages. Runes-based reactivity throughout.' },
  { icon: '🔍', title: 'Built-in search', details: 'Full-text fuzzy search powered by Fuse.js — no external service required.' },
  { icon: '🌗', title: 'Dark / light mode', details: 'Automatic theme detection with manual override, persisted in localStorage.' },
  { icon: '🧭', title: 'Auto navigation', details: 'Sidebar and routing are generated automatically from the docs folder structure.' },
]} />
