<script>
	import { getPortalsContext } from "./context";
	const ctx = getPortalsContext();

	const { name } = $props();
</script>

{@render ctx.get(name)?.()}
