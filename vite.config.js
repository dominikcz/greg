import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import pkg from './package.json' with { type: 'json' };

console.log('Version:', pkg.version);

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  define: {
    __NAME__: `"${pkg.name}"`,
    __VERSION__: `"${pkg.version}"`,
  },
})



