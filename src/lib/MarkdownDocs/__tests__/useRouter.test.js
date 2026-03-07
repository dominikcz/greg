import { describe, it, expect } from 'vitest';
import { buildNavigationUrl, isSameNavigationTarget } from '../useRouter.svelte.ts';

describe('useRouter helpers', () => {
	it('builds URL with normalized path and optional hash', () => {
		expect(buildNavigationUrl('/docs/guide/', 'intro')).toBe('/docs/guide#intro');
		expect(buildNavigationUrl('/docs/guide', '#intro')).toBe('/docs/guide#intro');
		expect(buildNavigationUrl('/docs/guide/', '')).toBe('/docs/guide');
	});

	it('treats same path with different hash as a different navigation target', () => {
		expect(isSameNavigationTarget('/docs/guide', '', '/docs/guide', 'intro')).toBe(false);
		expect(isSameNavigationTarget('/docs/guide', '#overview', '/docs/guide', 'intro')).toBe(false);
		expect(isSameNavigationTarget('/docs/guide', '#intro', '/docs/guide', 'intro')).toBe(true);
	});
});
