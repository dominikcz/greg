---
title: Team Page
---

# Team Page

Greg ships Svelte ports of the VitePress team-page components.
There are two ways to display team members: embedded in a doc page, or as a
dedicated full-page layout.

## Authoring styles

Team components are available in both authoring contexts:

- Markdown docs pages (`.md`) via component tags
- Direct `.svelte` usage via imported components

## Show team members inside a page

Use `<TeamMembers>` anywhere in a Markdown page:

::: code-group labels=[markdown, output]

<<< @/snippets/reference/team-members-example.md

<!--@include: @/snippets/reference/team-members-example.md-->

:::

### Direct component usage (`.svelte`)

::: code-group labels=[markdown, output]

```svelte
<script>
  import TeamMembers from '$components/TeamMembers.svelte';
</script>

<<< @/snippets/reference/team-members-medium-example.md
```

<!--@include: @/snippets/reference/team-members-medium-example.md-->

:::

### `<TeamMembers>` props

```ts
interface Props {
  members: TeamMemberData[];
  size?: 'small' | 'medium';   // default: 'medium'
}
```

`small` is better for inline use inside regular doc pages; `medium` suits a
dedicated team page.

## Create a full team page

Create a `.md` file (e.g. `docs/team.md`) and use the layout components:

::: code-group labels=[markdown, output]

<<< @/snippets/reference/team-full-example.md

<!--@include: @/snippets/reference/team-full-example.md-->

:::

### Direct component usage (`.svelte`)

::: code-group labels=[markdown, output]

```svelte
<script>
  import TeamPage from '$components/TeamPage.svelte';
  import TeamPageTitle from '$components/TeamPageTitle.svelte';
  import TeamPageSection from '$components/TeamPageSection.svelte';
  import TeamMembers from '$components/TeamMembers.svelte';
</script>

<<< @/snippets/reference/team-full-example.md
```

<!--@include: @/snippets/reference/team-full-example.md-->

:::

## Component reference

### `<TeamMember>` props

```ts
interface TeamMemberData {
  avatar: string;         // image URL
  name: string;
  title?: string;
  org?: string;
  orgLink?: string;
  desc?: string;          // HTML allowed
  links?: SocialLinkItem[];
  sponsor?: string;       // sponsor page URL
  actionText?: string;    // button label, default 'Sponsor'
}

interface Props {
  member: TeamMemberData;
  size?: 'small' | 'medium';
}
```

### `<TeamMembers>` props

```ts
interface Props {
  members: TeamMemberData[];
  size?: 'small' | 'medium';
}
```

### `<TeamPage>`

Wrapper that provides correct vertical spacing between sections. Accepts only
`children` (Svelte snippet).

### `<TeamPageTitle>`

Section title block at the top of a `<TeamPage>`. Accepts `title` and `lead`
props or their snippet variants.

### `<TeamPageSection>`

A section within a `<TeamPage>`. Accepts `title` / `lead` props and children.

## Social icons

The `icon` property of a `SocialLinkItem` can be:

- A **string** name of a built-in icon. Supported values: `github`, `twitter`,
  `x`, `linkedin`, `discord`, `facebook`, `instagram`, `mastodon`, `npm`,
  `slack`, `youtube`.
- An **object** `{ svg: string }` with custom SVG markup.

```md
links: [
  { icon: 'github',  link: 'https://github.com/...' },
  { icon: { svg: '<svg ...>...</svg>' }, link: 'https://...' },
]
```
