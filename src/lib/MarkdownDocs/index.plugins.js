/**
 * Greg — Vite plugin entry point.
 *
 * Import these in your vite.config.js to wire up Greg's build-time plugins:
 *
 *   import {
 *     vitePluginGregConfig,
 *     vitePluginSearchIndex,
 *     vitePluginSearchServer,
 *     vitePluginFrontmatter,
 *     vitePluginCopyDocs,
 *   } from '@dominikcz/greg/plugins';
 */
export { vitePluginGregConfig } from './vitePluginGregConfig.js';
export { vitePluginSearchIndex } from './vitePluginSearchIndex.js';
export { vitePluginSearchServer } from './vitePluginSearchServer.js';
export { vitePluginFrontmatter } from './vitePluginFrontmatter.js';
export { vitePluginCopyDocs } from './vitePluginCopyDocs.js';
