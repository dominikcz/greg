import { describe, it, expect, vi } from 'vitest';
import {
	getRuntimeRenderHandlers,
	getThemeChangeRenderHandlers,
	runRenderHandlers,
} from '../markdownRendererRuntime';

describe('markdownRendererRuntime registries', () => {
	it('builds runtime handlers in stable order', () => {
		const handlers = getRuntimeRenderHandlers({
			hydrateComponents: vi.fn(),
			initMermaid: vi.fn(),
		});

		expect(handlers.map((h) => h.name)).toEqual([
			'hydrate-components',
			'init-mermaid',
		]);
	});

	it('builds theme-change handlers in stable order', () => {
		const handlers = getThemeChangeRenderHandlers({
			rerenderMermaid: vi.fn(),
		});

		expect(handlers.map((h) => h.name)).toEqual(['rerender-mermaid']);
	});
});

describe('runRenderHandlers', () => {
	it('runs handlers in sequence and keeps going after an error', async () => {
		const calls = [];
		const root = /** @type {HTMLElement} */ ({});
		const context = { mermaidThemeConfig: { theme: 'material' } };

		const handlers = [
			{
				name: 'first',
				run: vi.fn(async (_root, _ctx) => {
					calls.push('first');
				}),
			},
			{
				name: 'broken',
				run: vi.fn(async () => {
					calls.push('broken');
					throw new Error('boom');
				}),
			},
			{
				name: 'last',
				run: vi.fn(async () => {
					calls.push('last');
				}),
			},
		];

		await runRenderHandlers(root, handlers, context);

		expect(calls).toEqual(['first', 'broken', 'last']);
		expect(handlers[0].run).toHaveBeenCalledWith(root, context);
		expect(handlers[1].run).toHaveBeenCalledWith(root, context);
		expect(handlers[2].run).toHaveBeenCalledWith(root, context);
	});
});
