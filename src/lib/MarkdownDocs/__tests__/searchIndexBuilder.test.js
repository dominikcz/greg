import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildSearchIndex, invalidateSearchIndexCache } from '../searchIndexBuilder.js';

describe('buildSearchIndex', () => {
	const tempDirs = [];

	afterEach(() => {
		invalidateSearchIndexCache();
		for (const dir of tempDirs.splice(0)) {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it('indexes text from markdown includes located in __partials', async () => {
		const rootDir = mkdtempSync(join(tmpdir(), 'greg-search-index-'));
		tempDirs.push(rootDir);

		const docsDir = join(rootDir, 'docs');
		mkdirSync(join(docsDir, '__partials'), { recursive: true });

		writeFileSync(
			join(docsDir, 'index.md'),
			[
				'# Home',
				'',
				'Intro section.',
				'',
				'<!--@include: /__partials/note.md-->',
				'',
				'Outro section.',
			].join('\n'),
			'utf8',
		);
		writeFileSync(
			join(docsDir, '__partials', 'note.md'),
			'Searchable phrase from included partial.',
			'utf8',
		);

		const index = await buildSearchIndex(docsDir, '/docs');
		const homeDoc = index.find(entry => entry.id === '/docs');

		expect(homeDoc).toBeTruthy();
		expect(homeDoc.sections.some(section => section.content.includes('Searchable phrase from included partial.'))).toBe(true);
	});

	it('indexes text from markdown includes loaded via @/ alias', async () => {
		const rootDir = mkdtempSync(join(tmpdir(), 'greg-search-index-'));
		tempDirs.push(rootDir);

		const docsDir = join(rootDir, 'docs');
		mkdirSync(docsDir, { recursive: true });
		mkdirSync(join(rootDir, 'snippets'), { recursive: true });

		writeFileSync(
			join(docsDir, 'index.md'),
			[
				'# Home',
				'',
				'Intro section.',
				'',
				'<!--@include: @/snippets/shared.md-->',
			].join('\n'),
			'utf8',
		);
		writeFileSync(
			join(rootDir, 'snippets', 'shared.md'),
			'Alias include searchable sentence.',
			'utf8',
		);

		const index = await buildSearchIndex(docsDir, '/docs');
		const homeDoc = index.find(entry => entry.id === '/docs');

		expect(homeDoc).toBeTruthy();
		expect(homeDoc.sections.some(section => section.content.includes('Alias include searchable sentence.'))).toBe(true);
	});

	it('merges index from multiple docs directories', async () => {
		const rootDir = mkdtempSync(join(tmpdir(), 'greg-search-index-multi-'));
		tempDirs.push(rootDir);

		const docsDir1 = join(rootDir, 'docs');
		const docsDir2 = join(rootDir, 'extra-docs');
		mkdirSync(docsDir1, { recursive: true });
		mkdirSync(docsDir2, { recursive: true });

		writeFileSync(join(docsDir1, 'guide.md'), '# Guide\n\nContent from first dir.', 'utf8');
		writeFileSync(join(docsDir2, 'api.md'), '# API\n\nContent from second dir.', 'utf8');

		const index = await buildSearchIndex([docsDir1, docsDir2], '/docs');

		expect(index.length).toBe(2);
		expect(index.find(e => e.id === '/docs/guide')).toBeTruthy();
		expect(index.find(e => e.id === '/docs/api')).toBeTruthy();
	});

	it('returns same result as single-dir call when given single-element array', async () => {
		const rootDir = mkdtempSync(join(tmpdir(), 'greg-search-index-single-'));
		tempDirs.push(rootDir);

		const docsDir = join(rootDir, 'docs');
		mkdirSync(docsDir, { recursive: true });
		writeFileSync(join(docsDir, 'page.md'), '# Page\n\nSome content.', 'utf8');

		const [stringResult, arrayResult] = await Promise.all([
			buildSearchIndex(docsDir, '/docs'),
			(invalidateSearchIndexCache(), buildSearchIndex([docsDir], '/docs')),
		]);

		expect(arrayResult.length).toBe(stringResult.length);
		expect(arrayResult[0].id).toBe(stringResult[0].id);
	});
});
