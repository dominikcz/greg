<script lang="ts">
	import TreeView from "./TreeView.svelte";

	import type { TreeViewItem } from './treeViewTypes';

	interface DocsNavigationProps {
		menu: TreeViewItem[];
		active: string;
		rootPath?: string;
		navigate: (path: string) => void;
	}
	let { menu, active = '', rootPath = './', navigate }: DocsNavigationProps = $props();

	// Top-level items with children become section headers; leaf items render directly
	let sections = $derived(menu.filter((item: any) => item.children && item.children.length > 0));
	let topLeaves = $derived(menu.filter((item: any) => !item.children || item.children.length === 0));
</script>

<nav>
	{#if topLeaves.length > 0}
		<TreeView tree={topLeaves} {active} {navigate} />
	{/if}
	{#each sections as section}
		<div class="nav-section">
			<a
				href={section.link}
				class="nav-section-title"
				class:active={active === section.link}
				onclick={(e) => { e.preventDefault(); navigate(section.link); }}
			>{section.label}</a>
			<TreeView tree={section.children} {active} {navigate} />
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
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--catalog-menu-section-color);
		padding: 0.25rem 0.5rem;
		display: block;
		text-decoration: none;
		border-radius: 5px;

		&:hover {
			color: var(--catalog-color);
			background-color: var(--catalog-menu-hover-background);
		}

		&.active {
			color: var(--catalog-accent);
		}
	}
</style>
