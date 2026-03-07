<script lang="ts">
    import TeamMember from "./TeamMember.svelte";

    type SocialLinkIcon = string | { svg: string };
    type SocialLinkItem = {
        icon: SocialLinkIcon;
        link: string;
        ariaLabel?: string;
    };

    type TeamMemberData = {
        avatar: string;
        name: string;
        title?: string;
        org?: string;
        orgLink?: string;
        desc?: string;
        links?: SocialLinkItem[];
        sponsor?: string;
        actionText?: string;
    };

    type Props = {
        size?: "small" | "medium";
        members: TeamMemberData[];
    };

    let { size = "medium", members }: Props = $props();

    let classes = $derived([size, `count-${members.length}`].join(" "));
</script>

<div class="TeamMembers {classes}">
    <div class="container">
        {#each members as member (member.name)}
            <div class="item">
                <TeamMember {size} {member} />
            </div>
        {/each}
    </div>
</div>

<style>
    .TeamMembers.small .container {
        grid-template-columns: repeat(auto-fit, minmax(224px, 1fr));
    }

    .TeamMembers.small.count-1 .container {
        max-width: 276px;
    }
    .TeamMembers.small.count-2 .container {
        max-width: calc(276px * 2 + 24px);
    }
    .TeamMembers.small.count-3 .container {
        max-width: calc(276px * 3 + 24px * 2);
    }

    .TeamMembers.medium .container {
        grid-template-columns: repeat(auto-fit, minmax(256px, 1fr));
    }

    @media (min-width: 375px) {
        .TeamMembers.medium .container {
            grid-template-columns: repeat(auto-fit, minmax(288px, 1fr));
        }
    }

    .TeamMembers.medium.count-1 .container {
        max-width: 368px;
    }
    .TeamMembers.medium.count-2 .container {
        max-width: calc(368px * 2 + 24px);
    }

    .container {
        display: grid;
        gap: 24px;
        margin: 0 auto;
        max-width: 1152px;
    }
</style>
