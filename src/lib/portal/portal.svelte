<script>
	import { getPortalsContext } from './context'
	
	const { target, children } = $props()

	const ctx = getPortalsContext()

	$effect(() => {
		ctx.set(target, children)
		return () => {
			ctx.delete(target)
		}
	})
</script>
