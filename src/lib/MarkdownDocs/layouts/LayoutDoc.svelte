<script lang="ts">
    import type { Snippet } from "svelte";
    let { children }: { children?: Snippet } = $props();
</script>

<!-- Default doc layout – transparent pass-through wrapper.
     Receives all frontmatter fields as props (passed by mdsvex). -->
{@render children?.()}
