<script lang="ts">
	import TreeView from "./TreeView.svelte";
	import ChevronRight from "@lucide/svelte/icons/chevron-right";
	import { handleSectionClick } from "./navigationUtils";

	import type { TreeViewItem } from "./treeViewTypes";

	interface DocsNavigationProps {
		menu: TreeViewItem[];
		active: string;
		srcDir?: string;
		ariaLabel?: string;
		navigate: (path: string) => void;
	}
	let {
		menu,
		active = "",
		srcDir = "./",
		ariaLabel = "Menu",
		navigate,
	}: DocsNavigationProps = $props();

	// Items to render: root index page excluded; leaves and sections kept in their sorted order
	let items = $derived(menu.filter((item: any) => item.link !== srcDir));

	let collapsed = $state(new Set<string>());

	function toggleSection(key: string) {
		const next = new Set(collapsed);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		collapsed = next;
	}
</script>

<nav aria-label={ariaLabel}>
	{#each items as item}
		{@const isSection = item.children && item.children.length > 0}
		{@const key = item.link ?? item.label}
		{@const isCollapsed = collapsed.has(key)}
		{#if isSection}
			<div class="nav-section">
				<div
					class="nav-section-title"
					class:active={active === item.link}
					class:collapsed={isCollapsed}
					role="button"
					tabindex="0"
					onclick={() =>
						handleSectionClick(item, key, toggleSection, navigate)}
					onkeydown={(e) =>
						(e.key === "Enter" || e.key === " ") &&
						handleSectionClick(item, key, toggleSection, navigate)}
					aria-expanded={!isCollapsed}
				>
					<span
						class="nav-section-label"
						class:active={active === item.link}
					>
						{item.label}{#if item.badge}<span
								class="nav-badge {item.badge?.type ?? 'tip'}"
								>{item.badge?.text}</span
							>{/if}
					</span>
					<span class="nav-section-chevron"><ChevronRight /></span>
				</div>
				{#if !isCollapsed}
					<TreeView tree={item.children} {active} {navigate} />
				{/if}
			</div>
		{:else}
			<div class="nav-leaf">
				<TreeView tree={[item]} {active} {navigate} />
			</div>
		{/if}
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

	.nav-leaf {
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
			.nav-section-label {
				color: var(--greg-color);
			}
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
