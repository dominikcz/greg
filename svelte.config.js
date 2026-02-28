import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { mdsvex } from 'mdsvex'


/** @type {import("@sveltejs/vite-plugin-svelte").SvelteConfig} */
export default {
  extensions: ['.svelte', '.svx', '.md'],
  // Consult https://svelte.dev/docs#compile-time-svelte-preprocess
  // for more information about preprocessors
  preprocess: mdsvex({ extensions: ['.svx', '.md'] }),
}
