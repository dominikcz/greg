<script module lang="ts">
	// based on https://svelte.dev/playground/82b00644720a4ca2bdb89c6a653ec987
	// retain module scoped expansion state for each tree node
	const _expansionState = new Map<string, boolean>();
</script>

<script lang="ts">
	import Self from './TreeViewItem.svelte';
	import type { TreeViewItem } from './treeViewTypes';

	interface TreeViewItemProps {
		item: TreeViewItem;
		active: string;
		depth: number;
		navigate: (path: string) => void;
	}
	let { item, active = '', depth = 0, navigate }: TreeViewItemProps = $props();

	// Inicjalizacja stanu rozwinięcia
	let expanded = $state(false);
	// Automatycznie rozwiń jeśli aktywna ścieżka jest w tej gałęzi
	let shouldExpand = $derived(active.startsWith(item.link) && item.link !== active);
	$effect(() => {
		if (shouldExpand && !expanded) expanded = true;
	});
	let arrowDown = $derived(expanded);

	function toggle() {
		_expansionState.set(item.link, !expanded);
		expanded = !expanded;
	}

	function handleClick(e: MouseEvent) {
		e.preventDefault();
		navigate(item.link);
	}

	function handleToggleClick(e: MouseEvent) {
		e.preventDefault();
		toggle();
		navigate(item.link);
	}
</script>

<ul>
	<li>
		{#if item.children.length}
			<a href={item.link} onclick={handleToggleClick} class:active={active == item.link}>
				<span class="arrow" class:arrowDown>&#x25b6</span>
				{#if item.status}<span class={item.status}></span>{/if}{item.label}
			</a>
			{#if expanded}
				{#each item.children as child}
					<Self item={child} depth={depth + 1} {active} {navigate} />
				{/each}
			{/if}
		{:else}
			<a href={item.link} class="no-arrow" class:active={active == item.link} onclick={handleClick}
				>{#if item.status}<span class={item.status}></span>{/if}{item.label}</a
			>
		{/if}
	</li>
</ul>

<style lang="scss">
	ul {
		margin: 0;
		list-style: none;
		user-select: none;
		padding-inline-start: 0;
		:global(ul) {
			padding-inline-start: 0.85rem;
			margin-top: 0.1rem;
			border-left: 1px solid var(--catalog-border-color);
			margin-left: 0.6rem;
		}
		li {
			line-height: 1.5rem;
		}
	}

	.no-arrow {
		padding-left: 1.1rem;
	}

	.arrow {
		cursor: pointer;
		display: inline-block;
		vertical-align: baseline;
		font-size: 70%;
		transition: transform 180ms ease;
		color: var(--catalog-menu-section-color);
	}

	.arrowDown {
		transform: rotate(90deg);
	}

	a {
		padding: 0.3rem 0.5rem;
		display: block;
		text-decoration: none;
		color: var(--catalog-menu-color);
		border-radius: 5px;
		font-size: 0.875rem;
		line-height: 1.5rem;

		span {
			vertical-align: bottom;
		}

		&:hover {
			background-color: var(--catalog-menu-hover-background);
			color: var(--catalog-color);
		}

		&.active {
			background-color: var(--catalog-accent-light);
			color: var(--catalog-accent);
			font-weight: 600;

			.arrow {
				color: var(--catalog-accent);
			}

			&:hover {
				background-color: var(--catalog-accent-light);
			}
		}
	}
</style>
