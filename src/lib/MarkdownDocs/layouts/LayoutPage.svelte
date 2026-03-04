<script lang="ts">
    import type { Snippet } from 'svelte';
    let { children }: { children?: Snippet } = $props();
</script>

<!-- Page layout – full-width without sidebar, markdown-body styling retained.
     The parent MarkdownDocs component reads `layout: page` from frontmatter
     to hide the sidebar/outline. -->
{@render children?.()}
