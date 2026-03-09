---
title: Team Page
---

# Team Page

Greg ships Svelte team-page components.
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

::: code-group labels=[svelte, output]

```svelte
<script>
  import TeamMembers from '$components/TeamMembers.svelte';
</script>

<TeamMembers
  size="medium"
  members={[
    {
      avatar: 'https://avatars.githubusercontent.com/u/583231?s=96',
      name: 'Monalisa Octocat',
      title: 'Lead Developer',
      links: [{ icon: 'github', link: 'https://github.com/octocat' }],
    },
    {
      avatar: 'https://avatars.githubusercontent.com/u/480938?s=96',
      name: 'Hubot',
      title: 'Automation Bot',
      links: [{ icon: 'github', link: 'https://github.com/hubot' }],
    },
  ]}
/>
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

::: code-group labels=[svelte, output]

```svelte
<script>
  import TeamMembers from '$components/TeamMembers.svelte';
</script>

<h3>Our Team</h3>
<p>The people behind Greg.</p>

<h4>Core Team</h4>
<TeamMembers
  size="medium"
  members={[
    {
      avatar: 'https://avatars.githubusercontent.com/u/10137?s=96',
      name: 'Jane Doe',
      title: 'Creator',
      org: 'Acme Corp',
      orgLink: 'https://acme.com',
      desc: 'Open source enthusiast.',
      links: [
        { icon: 'github', link: 'https://github.com/janedoe' },
        { icon: 'twitter', link: 'https://twitter.com/janedoe' },
      ],
      sponsor: 'https://github.com/sponsors/janedoe',
    },
    {
      avatar: 'https://avatars.githubusercontent.com/u/583231?s=96',
      name: 'Monalisa Octocat',
      title: 'Lead Developer',
      links: [{ icon: 'github', link: 'https://github.com/octocat' }],
    },
  ]}
/>
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
