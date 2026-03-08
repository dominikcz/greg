<script module lang="ts">
	// based on https://svelte.dev/playground/82b00644720a4ca2bdb89c6a653ec987
	// retain module scoped expansion state for each tree node
	const _expansionState = new Map<string, boolean>();
</script>

<script lang="ts">
	import Self from "./TreeViewItem.svelte";
	import type { TreeViewItem } from "./treeViewTypes";
	import { ChevronRight } from "@lucide/svelte";

	interface TreeViewItemProps {
		item: TreeViewItem;
		active: string;
		depth: number;
		navigate: (path: string) => void;
	}
	let {
		item,
		active = "",
		depth = 0,
		navigate,
	}: TreeViewItemProps = $props();

	const EXTERNAL_RE = /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i;

	// Inicjalizacja stanu rozwinięcia
	let expanded = $state(false);
	// Automatycznie rozwiń jeśli aktywna ścieżka jest w tej gałęzi
	let shouldExpand = $derived(
		active.startsWith(item.link) && item.link !== active,
	);
	$effect(() => {
		if (shouldExpand && !expanded) expanded = true;
	});

	function toggle() {
		_expansionState.set(item.link, !expanded);
		expanded = !expanded;
	}

	function shouldHandleWithRouter() {
		if (!item.link) return false;
		if (EXTERNAL_RE.test(item.link)) return false;
		if (item.target && item.target !== "_self") return false;
		return true;
	}

	function handleClick(e: MouseEvent) {
		if (item.target === "_blank") {
			e.preventDefault();
			window.open(item.link, "_blank", "noopener,noreferrer");
			return;
		}

		if (!shouldHandleWithRouter()) return;
		e.preventDefault();
		navigate(item.link);
	}

	function handleToggleClick(e: MouseEvent) {
		if (item.target === "_blank") {
			e.preventDefault();
			window.open(item.link, "_blank", "noopener,noreferrer");
			return;
		}

		if (!shouldHandleWithRouter()) return;
		e.preventDefault();
		toggle();
		navigate(item.link);
	}
</script>

<li>
	{#if item.children.length}
		<a
			href={item.link}
			target={item.target}
			rel={item.rel}
			onclick={handleToggleClick}
			class="arrow"
			class:active={active == item.link}
		>
			<span class="chevron" class:expanded>
				<ChevronRight />
			</span>
			{#if item.status}<span class={item.status}
				></span>{/if}{item.label}{#if item.badge}<span
					class="nav-badge {item.badge.type ?? 'tip'}"
					>{item.badge.text}</span
				>{/if}
		</a>
		{#if expanded}
			<ul>
				{#each item.children as child}
					<Self item={child} depth={depth + 1} {active} {navigate} />
				{/each}
			</ul>
		{/if}
	{:else}
		<a
			href={item.link}
			target={item.target}
			rel={item.rel}
			class="no-arrow"
			class:active={active == item.link}
			onclick={handleClick}
			>{#if item.status}<span class={item.status}
				></span>{/if}{item.label}{#if item.badge}<span
					class="nav-badge {item.badge.type ?? 'tip'}"
					>{item.badge.text}</span
				>{/if}</a
		>
	{/if}
</li>

<style lang="scss">
	li {
		line-height: 1.5rem;
		margin: 0.1rem 0;
	}

	ul {
		list-style: none;
		padding-inline-start: 0.85rem;
		margin: 0.1rem 0 0 0.6rem;
		border-left: 1px solid var(--greg-border-color);
	}

	.no-arrow {
		padding-left: 1.1rem;
	}

	.arrow {
		cursor: pointer;
		display: flex;

		.chevron {
			display: flex;
			align-items: center;
			transition: transform 0.2s ease;
			transform: rotate(0deg);
			flex-shrink: 0;

			&.expanded {
				transform: rotate(90deg);
			}
		}
	}

	a {
		padding: 0.3rem 0.5rem;
		display: block;
		text-decoration: none;
		color: var(--greg-menu-color);
		border-radius: 5px;
		font-size: 0.875rem;
		line-height: 1.5rem;

		span {
			vertical-align: bottom;
		}

		&:hover {
			background-color: var(--greg-menu-hover-background);
			color: var(--greg-color);
		}

		&.active {
			background-color: var(--greg-accent-light);
			color: var(--greg-accent);
			font-weight: 600;

			.arrow {
				color: var(--greg-accent);
			}

			&:hover {
				background-color: var(--greg-accent-light);
			}
		}
	}

	.nav-badge {
		display: inline-block;
		margin-left: 0.4rem;
		padding: 0 7px;
		border-radius: 10px;
		font-size: 11px;
		font-weight: 500;
		line-height: 18px;
		vertical-align: middle;
		white-space: nowrap;
		border: 1px solid transparent;

		&.tip {
			background-color: var(--greg-tip-bg);
			border-color: var(--greg-tip-border);
			color: var(--greg-tip-text);
		}
		&.info {
			background-color: var(--greg-info-bg);
			border-color: var(--greg-info-border);
			color: var(--greg-info-text);
		}
		&.warning {
			background-color: var(--greg-warning-bg);
			border-color: var(--greg-warning-border);
			color: var(--greg-warning-text);
		}
		&.danger {
			background-color: var(--greg-danger-bg);
			border-color: var(--greg-danger-border);
			color: var(--greg-danger-text);
		}
	}
</style>
