---
title: Team Page
---

# Team Page

Greg dostarcza komponenty Svelte do tworzenia strony zespołu.

## Sposoby użycia

Komponenty zespołu działają:

- w stronach `.md` przez tagi komponentów,
- w `.svelte` przez import.

## Lista członków zespołu na stronie

Użyj `<TeamMembers>` w dowolnej stronie Markdown:

::: code-group labels=[markdown, output]

<<< @/snippets/reference/team-members-example.md

<!--@include: @/snippets/reference/team-members-example.md-->

:::

### Bezpośrednie użycie komponentu (`.svelte`)

::: code-group labels=[svelte, output]

```svelte
<script>
  import TeamMembers from '$components/TeamMembers.svelte';
</script>

<TeamMembers
  size="medium"
  members={[
    {
      avatar: 'https://github.com/octocat.png',
      name: 'Monalisa Octocat',
      title: 'Lead Developer',
      links: [{ icon: 'github', link: 'https://github.com/octocat' }],
    },
    {
      avatar: 'https://github.com/hubot.png',
      name: 'Hubot',
      title: 'Automation Bot',
      links: [{ icon: 'github', link: 'https://github.com/hubot' }],
    },
  ]}
/>
```

<!--@include: @/snippets/reference/team-members-medium-example.md-->

:::

### Właściwości `<TeamMembers>`

```ts
interface Props {
  members: TeamMemberData[];
  size?: 'small' | 'medium';   // domyślnie: 'medium'
}
```

`small` lepiej sprawdza się przy osadzeniu listy w zwykłej stronie dokumentacji,
natomiast `medium` pasuje do dedykowanej strony zespołu.

## Pełna strona zespołu

Stwórz plik np. `docs/team.md` i użyj komponentów layoutu:

::: code-group labels=[markdown, output]

<<< @/snippets/reference/team-full-example.md

<!--@include: @/snippets/reference/team-full-example.md-->

:::

### Bezpośrednie użycie komponentu (`.svelte`)

::: code-group labels=[svelte, output]

```svelte
<script>
  import TeamMembers from '$components/TeamMembers.svelte';
</script>

<h3>Nasz zespół</h3>
<p>Ludzie stojący za Gregiem.</p>

<h4>Zespół core</h4>
<TeamMembers
  size="medium"
  members={[
    {
      avatar: 'https://github.com/janedoe.png',
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
      avatar: 'https://github.com/octocat.png',
      name: 'Monalisa Octocat',
      title: 'Lead Developer',
      links: [{ icon: 'github', link: 'https://github.com/octocat' }],
    },
  ]}
/>
```

<!--@include: @/snippets/reference/team-full-example.md-->

:::

## Referencja komponentów

### `<TeamMember>`

```ts
interface TeamMemberData {
  avatar: string;         // URL avatara
  name: string;
  title?: string;
  org?: string;
  orgLink?: string;
  desc?: string;          // HTML dozwolone
  links?: SocialLinkItem[];
  sponsor?: string;       // URL strony sponsora
  actionText?: string;    // etykieta przycisku, domyślnie 'Sponsor'
}

interface Props {
  member: TeamMemberData;
  size?: 'small' | 'medium';
}
```

### `<TeamMembers>`

```ts
interface Props {
  members: TeamMemberData[];
  size?: 'small' | 'medium';
}
```

### `<TeamPage>`

Kontener zachowujący poprawne odstępy pionowe między sekcjami.
Przyjmuje wyłącznie `children` (fragment Svelte).

### `<TeamPageTitle>`

Blok tytułowy strony zespołu (`title`, `lead` lub warianty fragmentów).

### `<TeamPageSection>`

Sekcja w obrębie `<TeamPage>`.
Przyjmuje właściwości `title` / `lead` oraz `children`.

## Ikony społecznościowe

`icon` w `SocialLinkItem` może być:

- stringiem wbudowanej ikony (`github`, `twitter`, `x`, `linkedin`, `discord`, `facebook`, `instagram`, `mastodon`, `npm`, `slack`, `youtube`),
- obiektem `{ svg: string }` z własnym SVG.

```md
links: [
  { icon: 'github', link: 'https://github.com/...' },
  { icon: { svg: '<svg ...>...</svg>' }, link: 'https://...' },
]
```