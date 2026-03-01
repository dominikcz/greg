<script lang="ts">
	import TreeView from "./TreeView.svelte";
	import { ChevronRight } from '@lucide/svelte';

	import type { TreeViewItem } from './treeViewTypes';

	interface DocsNavigationProps {
		menu: TreeViewItem[];
		active: string;
		rootPath?: string;
		navigate: (path: string) => void;
	}
	let { menu, active = '', rootPath = './', navigate }: DocsNavigationProps = $props();

	// Top-level items with children become section headers; leaf items render directly
	// Exclude the root index page (e.g. /docs) from the nav
	let sections = $derived(menu.filter((item: any) => item.children && item.children.length > 0));
	let topLeaves = $derived(menu.filter((item: any) => (!item.children || item.children.length === 0) && item.link !== rootPath));

	let collapsed = $state(new Set<string>());

	function toggleSection(key: string) {
		const next = new Set(collapsed);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		collapsed = next;
	}
</script>

<nav>
	{#if topLeaves.length > 0}
		<TreeView tree={topLeaves} {active} {navigate} />
	{/if}
	{#each sections as section}
		{@const key = section.link ?? section.label}
		{@const isCollapsed = collapsed.has(key)}
		<div class="nav-section">
			<div
				class="nav-section-title"
				class:active={active === section.link}
				class:collapsed={isCollapsed}
				role="button"
				tabindex="0"
				onclick={() => toggleSection(key)}
				onkeydown={(e) => e.key === 'Enter' && toggleSection(key)}
				aria-expanded={!isCollapsed}
			>
				<a
					href={section.link}
					class="nav-section-label"
					class:active={active === section.link}
					onclick={(e) => { e.preventDefault(); navigate(section.link); }}
				>{section.label}</a>
				<span class="nav-section-chevron"><ChevronRight /></span>
			</div>
			{#if !isCollapsed}
				<TreeView tree={section.children} {active} {navigate} />
			{/if}
		</div>
	{/each}
</nav>

<style lang="scss">
	nav {
		user-select: none;
		display: flex;
		flex-flow: column nowrap;
		gap: 0.25rem;
	}

	.nav-section {
		display: flex;
		flex-flow: column nowrap;
		gap: 0.1rem;
		margin-top: 0.75rem;

		&:first-child {
			margin-top: 0;
		}
	}

	.nav-section-title {
		display: flex;
		align-items: center;
		border-radius: 5px;
		cursor: pointer;

		&:hover {
			background-color: var(--greg-menu-hover-background);
			.nav-section-label { color: var(--greg-color); }
		}
	}

	.nav-section-label {
		flex: 1;
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--greg-menu-section-color);
		padding: 0.25rem 0 0.25rem 0.5rem;
		display: block;
		text-decoration: none;

		&.active {
			color: var(--greg-accent);
		}
	}

	.nav-section-chevron {
		padding: 0.25rem 0.5rem;
		color: var(--greg-menu-section-color);
		display: flex;
		align-items: center;
		transition: transform 0.2s ease;
		transform: rotate(90deg);
		pointer-events: none;

		.nav-section-title.collapsed & {
			transform: rotate(0deg);
		}
	}
</style>
