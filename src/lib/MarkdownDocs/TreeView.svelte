<script lang="ts">
	import TreeViewItem from "./TreeViewItem.svelte";
	import type { TreeViewItem as TreeViewItemType } from "./treeViewTypes";

	interface TreeViewProps {
		tree: TreeViewItemType[];
		active: string;
		class?: string;
		navigate: (path: string) => void;
	}
	let {
		tree,
		active = "",
		class: className = "",
		navigate,
	}: TreeViewProps = $props();
</script>

<ul class="tree-view {className}">
	{#each tree as item (item.link || item.label)}
		<TreeViewItem {item} depth={0} {active} {navigate} />
	{/each}
</ul>

<style>
	.tree-view {
		margin: 0;
		list-style: none;
		padding-inline-start: 0;
		user-select: none;
	}
</style>
