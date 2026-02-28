<script>
    import MarkdownDocs from "./lib/MarkdownDocs/MarkdownDocs.svelte";

	const rootPath = '/docs';
	const modules = import.meta.glob(['/docs/**/*.md']);
</script>

<MarkdownDocs {rootPath} {modules} version="0.1.0" />