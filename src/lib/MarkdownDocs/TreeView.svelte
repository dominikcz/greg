<script lang="ts">
	import TreeViewItem from './TreeViewItem.svelte';

	interface TreeViewProps {
		tree: [TreeViewItem];
		active: string;
		class: string;
	}
	let { tree, active = '', class: className = '' }: TreeViewProps = $props();
</script>

<div class="tree-view {className}">
	{#each tree as item(item.link || item.label)}
		<TreeViewItem {item} depth={0} {active} />
	{/each}
</div>

<style>
	.tree-view{
		display: flex;
		flex-flow: column nowrap;
		gap: 0.4rem;
	}
</style>