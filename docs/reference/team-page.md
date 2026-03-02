# Team Page

Greg ships Svelte ports of the VitePress team-page components.
There are two ways to display team members: embedded in a doc page, or as a
dedicated full-page layout.

---

## Show team members inside a page

Use `<TeamMembers>` anywhere in a Markdown page:

```md
<script>
const members = [
  {
    avatar: 'https://github.com/octocat.png',
    name: 'Monalisa Octocat',
    title: 'Lead Developer',
    links: [
      { icon: 'github', link: 'https://github.com/octocat' },
    ],
  },
];
</script>

## Our Team

<TeamMembers {members} />
```

### `<TeamMembers>` props

```ts
interface Props {
  members: TeamMemberData[];
  size?: 'small' | 'medium';   // default: 'medium'
}
```

`small` is better for inline use inside regular doc pages; `medium` suits a
dedicated team page.

---

## Create a full team page

Create a `.md` file (e.g. `docs/team.md`) and use the layout components:

```md
<script>
const coreMembers = [
  {
    avatar: 'https://github.com/janedoe.png',
    name: 'Jane Doe',
    title: 'Creator',
    org: 'Acme Corp',
    orgLink: 'https://acme.com',
    desc: 'Open source enthusiast.',
    links: [
      { icon: 'github',   link: 'https://github.com/janedoe' },
      { icon: 'twitter',  link: 'https://twitter.com/janedoe' },
    ],
    sponsor: 'https://github.com/sponsors/janedoe',
  },
];

const contributors = [ /* … */ ];
</script>

<TeamPage>
  <TeamPageTitle>
    {#snippet title()}Our Team{/snippet}
    {#snippet lead()}The people behind Greg.{/snippet}
  </TeamPageTitle>

  <TeamPageSection>
    {#snippet title()}Core Team{/snippet}
    {#snippet lead()}Active maintainers.{/snippet}
    {#snippet members()}
      <TeamMembers size="medium" members={coreMembers} />
    {/snippet}
  </TeamPageSection>

  <TeamPageSection>
    {#snippet title()}Contributors{/snippet}
    {#snippet members()}
      <TeamMembers size="small" members={contributors} />
    {/snippet}
  </TeamPageSection>
</TeamPage>
```

---

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
snippets.

### `<TeamPageSection>`

A section within a `<TeamPage>`. Accepts `title`, `lead` and `members` snippets.

---

## Social icons

The `icon` property of a `SocialLinkItem` can be:

- A **string** name of a built-in icon. Supported values: `github`, `twitter`,
  `x`, `linkedin`, `discord`, `facebook`, `instagram`, `mastodon`, `npm`,
  `slack`, `youtube`.
- An **object** `{ svg: string }` with custom SVG markup.

```md
links: [
  { icon: 'github',  link: 'https://github.com/…' },
  { icon: { svg: '<svg …>…</svg>' }, link: 'https://…' },
]
```
