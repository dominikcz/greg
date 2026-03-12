import { afterEach, describe, expect, it, vi } from 'vitest';
import { SqliteStore } from '../ai/stores/sqliteStore';

/** Helper: build a small set of doc chunks for testing. */
function sampleChunks() {
	return [
		{
			pageId: '/docs/guide/routing',
			pageTitle: 'Routing',
			sectionHeading: 'Dynamic Routes',
			sectionAnchor: 'dynamic-routes',
			content: 'Greg supports dynamic routes using square bracket syntax in file names.',
		},
		{
			pageId: '/docs/guide/deploying',
			pageTitle: 'Deploying',
			sectionHeading: 'Static hosting',
			sectionAnchor: 'static-hosting',
			content: 'You can deploy greg docs to any static hosting provider like Netlify or Vercel.',
		},
		{
			pageId: '/docs/guide/localization',
			pageTitle: 'Localization',
			sectionHeading: 'Adding a language',
			sectionAnchor: 'adding-a-language',
			content: 'To add a new language, create a folder under docs with the locale code.',
		},
		{
			pageId: '/docs/reference/search',
			pageTitle: 'Search',
			sectionHeading: 'Server search',
			sectionAnchor: 'server-search',
			content: 'Server-side search uses BM25 ranking for fast full-text retrieval.',
		},
		{
			pageId: '/pl/docs/guide/routing',
			pageTitle: 'Routing',
			sectionHeading: 'Dynamiczne trasy',
			sectionAnchor: 'dynamiczne-trasy',
			content: 'Greg obsługuje dynamiczne trasy za pomocą składni nawiasów kwadratowych.',
		},
	];
}

describe('SqliteStore', () => {
	/** @type {SqliteStore | null} */
	let store = null;

	afterEach(() => {
		if (store) {
			store.close();
			store = null;
		}
	});

	it('indexes chunks and reports correct size', async () => {
		store = new SqliteStore({ dbPath: ':memory:' });
		const chunks = sampleChunks();
		await store.index(chunks);
		expect(store.size()).toBe(chunks.length);
	});

	it('returns empty array when searching empty store', async () => {
		store = new SqliteStore({ dbPath: ':memory:' });
		const results = await store.search('routing');
		expect(results).toEqual([]);
	});

	it('finds relevant chunks via BM25 full-text search', async () => {
		store = new SqliteStore({ dbPath: ':memory:' });
		await store.index(sampleChunks());

		const results = await store.search('dynamic routes');
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].pageId).toBe('/docs/guide/routing');
		expect(results[0].score).toBeGreaterThan(0);
		expect(results[0].score).toBeLessThanOrEqual(1);
	});

	it('returns results with all DocChunk fields', async () => {
		store = new SqliteStore({ dbPath: ':memory:' });
		await store.index(sampleChunks());

		const results = await store.search('deploy');
		expect(results.length).toBeGreaterThan(0);
		const first = results[0];
		expect(first).toHaveProperty('pageId');
		expect(first).toHaveProperty('pageTitle');
		expect(first).toHaveProperty('sectionHeading');
		expect(first).toHaveProperty('sectionAnchor');
		expect(first).toHaveProperty('content');
		expect(first).toHaveProperty('score');
	});

	it('respects the limit parameter', async () => {
		store = new SqliteStore({ dbPath: ':memory:' });
		await store.index(sampleChunks());

		const results = await store.search('docs', 2);
		expect(results.length).toBeLessThanOrEqual(2);
	});

	it('returns scores normalized to 0–1 with top result at 1', async () => {
		store = new SqliteStore({ dbPath: ':memory:' });
		await store.index(sampleChunks());

		const results = await store.search('static hosting deploy');
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].score).toBe(1);
		for (const r of results) {
			expect(r.score).toBeGreaterThan(0);
			expect(r.score).toBeLessThanOrEqual(1);
		}
	});

	it('returns empty for queries with no matching terms', async () => {
		store = new SqliteStore({ dbPath: ':memory:' });
		await store.index(sampleChunks());

		const results = await store.search('xyznonexistent');
		expect(results).toEqual([]);
	});

	it('re-indexes correctly (replaces old data)', async () => {
		store = new SqliteStore({ dbPath: ':memory:' });
		await store.index(sampleChunks());
		expect(store.size()).toBe(5);

		// Re-index with fewer chunks
		await store.index([sampleChunks()[0]]);
		expect(store.size()).toBe(1);

		const results = await store.search('deploy');
		expect(results).toEqual([]);
	});

	it('handles queries with special characters gracefully', async () => {
		store = new SqliteStore({ dbPath: ':memory:' });
		await store.index(sampleChunks());

		// Should not throw — special chars are escaped
		const results = await store.search('"routing" OR "deploy"');
		expect(Array.isArray(results)).toBe(true);
	});

	it('searches across title, heading, and content', async () => {
		store = new SqliteStore({ dbPath: ':memory:' });
		await store.index(sampleChunks());

		// "Localization" appears only in pageTitle
		const byTitle = await store.search('Localization');
		expect(byTitle.length).toBeGreaterThan(0);
		expect(byTitle[0].pageId).toBe('/docs/guide/localization');

		// "BM25" appears only in content
		const byContent = await store.search('BM25');
		expect(byContent.length).toBeGreaterThan(0);
		expect(byContent[0].pageId).toBe('/docs/reference/search');
	});

	it('works with non-ASCII content (Polish)', async () => {
		store = new SqliteStore({ dbPath: ':memory:' });
		await store.index(sampleChunks());

		const results = await store.search('dynamiczne trasy');
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].pageId).toBe('/pl/docs/guide/routing');
	});
});

describe('SqliteStore hybrid search (with mock embeddings)', () => {
	/** @type {SqliteStore | null} */
	let store = null;

	afterEach(() => {
		if (store) {
			store.close();
			store = null;
		}
	});

	it('falls back to BM25-only when provider has no embed()', async () => {
		const mockProvider = {
			name: 'mock',
			chat: vi.fn(),
			isAvailable: vi.fn().mockResolvedValue(true),
			// No embed method
		};

		store = new SqliteStore({
			dbPath: ':memory:',
			provider: mockProvider,
			embeddingDimensions: 0, // No vector search
		});

		await store.index(sampleChunks());
		const results = await store.search('routing');
		expect(results.length).toBeGreaterThan(0);
		// Both EN and PL routing pages match — just verify it finds something relevant
		expect(results.some(r => r.pageId.includes('routing'))).toBe(true);
	});
});
