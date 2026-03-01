<script lang="ts">
    import Link from './Link.svelte';
    import SocialLinks from './SocialLinks.svelte';

    type SocialLinkIcon = string | { svg: string };
    type SocialLinkItem = { icon: SocialLinkIcon; link: string; ariaLabel?: string };

    type TeamMember = {
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
        size?: 'small' | 'medium';
        member: TeamMember;
    };

    let { size = 'medium', member }: Props = $props();
</script>

<article class="TeamMember {size}">
    <div class="profile">
        <figure class="avatar">
            <img class="avatar-img" src={member.avatar} alt={member.name} />
        </figure>
        <div class="data">
            <h1 class="name">{member.name}</h1>
            {#if member.title || member.org}
                <p class="affiliation">
                    {#if member.title}
                        <span class="title">{member.title}</span>
                    {/if}
                    {#if member.title && member.org}
                        <span class="at"> @ </span>
                    {/if}
                    {#if member.org}
                        <Link
                            class="org {member.orgLink ? 'link' : ''}"
                            href={member.orgLink}
                            noIcon
                        >
                            {member.org}
                        </Link>
                    {/if}
                </p>
            {/if}
            {#if member.desc}
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                <p class="desc">{@html member.desc}</p>
            {/if}
            {#if member.links?.length}
                <div class="links">
                    <SocialLinks links={member.links} me={false} />
                </div>
            {/if}
        </div>
    </div>

    {#if member.sponsor}
        <div class="sp">
            <Link class="sp-link link" href={member.sponsor} noIcon>
                <svg class="sp-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12,22.2c-0.3,0-0.5-0.1-0.7-0.3l-8.8-8.8c-2.5-2.5-2.5-6.7,0-9.2c2.5-2.5,6.7-2.5,9.2,0L12,4.3l0.4-0.4c0,0,0,0,0,0C13.6,2.7,15.2,2,16.9,2c0,0,0,0,0,0c1.7,0,3.4,0.7,4.6,1.9l0,0c1.2,1.2,1.9,2.9,1.9,4.6c0,1.7-0.7,3.4-1.9,4.6l-8.8,8.8C12.5,22.1,12.3,22.2,12,22.2z"/>
                </svg>
                {member.actionText ?? 'Sponsor'}
            </Link>
        </div>
    {/if}
</article>

<style>
    .TeamMember {
        display: flex;
        flex-direction: column;
        gap: 2px;
        border-radius: 12px;
        width: 100%;
        height: 100%;
        overflow: hidden;
    }

    /* Small */
    .TeamMember.small .profile {
        padding: 32px;
    }

    .TeamMember.small .data {
        padding-top: 20px;
    }

    .TeamMember.small .avatar {
        width: 64px;
        height: 64px;
    }

    .TeamMember.small .name {
        line-height: 24px;
        font-size: 16px;
    }

    .TeamMember.small .affiliation {
        padding-top: 4px;
        line-height: 20px;
        font-size: 14px;
    }

    .TeamMember.small .desc {
        padding-top: 12px;
        line-height: 20px;
        font-size: 14px;
    }

    .TeamMember.small .links {
        margin: 0 -16px -20px;
        padding: 10px 0 0;
    }

    /* Medium */
    .TeamMember.medium .profile {
        padding: 48px 32px;
    }

    .TeamMember.medium .data {
        padding-top: 24px;
        text-align: center;
    }

    .TeamMember.medium .avatar {
        width: 96px;
        height: 96px;
    }

    .TeamMember.medium .name {
        letter-spacing: 0.15px;
        line-height: 28px;
        font-size: 20px;
    }

    .TeamMember.medium .affiliation {
        padding-top: 4px;
        font-size: 16px;
    }

    .TeamMember.medium .desc {
        padding-top: 16px;
        max-width: 288px;
        font-size: 16px;
    }

    .TeamMember.medium .links {
        margin: 0 -16px -12px;
        padding: 16px 12px 0;
    }

    .profile {
        flex-grow: 1;
        background-color: var(--greg-menu-background);
    }

    .data {
        text-align: center;
    }

    .avatar {
        position: relative;
        flex-shrink: 0;
        margin: 0 auto;
        border-radius: 50%;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }

    .avatar-img {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        border-radius: 50%;
        object-fit: cover;
        width: 100%;
        height: 100%;
    }

    .name {
        margin: 0;
        font-weight: 600;
        border: none;
        padding: 0;
    }

    .affiliation {
        margin: 0;
        font-weight: 500;
        color: var(--greg-menu-section-color);
    }

    :global(.org.link) {
        color: var(--greg-menu-section-color);
        transition: color 0.25s;
        text-decoration: none;
    }

    :global(.org.link:hover) {
        color: var(--greg-accent);
    }

    .desc {
        margin: 0 auto;
    }

    .desc :global(a) {
        font-weight: 500;
        color: var(--greg-accent);
        text-decoration-style: dotted;
        transition: color 0.25s;
    }

    .links {
        display: flex;
        justify-content: center;
        height: 56px;
    }

    :global(.sp-link) {
        display: flex;
        justify-content: center;
        align-items: center;
        text-align: center;
        padding: 16px;
        font-size: 14px;
        font-weight: 500;
        color: var(--greg-sponsor-color);
        background-color: var(--greg-menu-background);
        transition: color 0.25s, background-color 0.25s;
        text-decoration: none;
    }

    :global(.sp-link:hover),
    :global(.sp-link:focus) {
        outline: none;
        color: var(--greg-menu-active-color);
        background-color: var(--greg-sponsor-color);
    }

    .sp-icon {
        margin-right: 8px;
        width: 16px;
        height: 16px;
        fill: currentColor;
        flex-shrink: 0;
    }
</style>
