<script lang="ts">
	import TreeViewItem from './TreeViewItem.svelte';
	import type { TreeViewItem as TreeViewItemType } from './treeViewTypes';

	interface TreeViewProps {
		tree: TreeViewItemType[];
		active: string;
		class?: string;
		navigate: (path: string) => void;
	}
	let { tree, active = '', class: className = '', navigate }: TreeViewProps = $props();
</script>

<div class="tree-view {className}">
	{#each tree as item(item.link || item.label)}
		<TreeViewItem {item} depth={0} {active} {navigate} />
	{/each}
</div>

<style>
	.tree-view{
		display: flex;
		flex-flow: column nowrap;
		gap: 0.4rem;
	}
</style>