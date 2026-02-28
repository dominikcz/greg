import { getContext, setContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

const key = Symbol('portals-context')

export function getPortalsContext() {
  return getContext(key)
}

export function setPortalsContext(ctx = new SvelteMap()) {
	setContext(key, ctx)
}
