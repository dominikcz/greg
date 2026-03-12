import type { AiSource, RetrievedChunk } from './types.js';

/**
 * Extract unique source citations from a list of retrieved chunks.
 *
 * Returns distinct (pageId, sectionAnchor) pairs — up to `limit` sources —
 * ordered by chunk relevance score (highest first).
 * These are rendered as the "Sources" list below the AI answer in the UI.
 */
export function extractSources(chunks: RetrievedChunk[], limit = 6): AiSource[] {
	const seen = new Set<string>();
	const sources: AiSource[] = [];

	for (const chunk of chunks) {
		const key = `${chunk.pageId}#${chunk.sectionAnchor}`;
		if (seen.has(key)) continue;
		seen.add(key);

		sources.push({
			pageId: chunk.pageId,
			pageTitle: chunk.pageTitle,
			sectionHeading: chunk.sectionHeading,
			sectionAnchor: chunk.sectionAnchor,
		});

		if (sources.length >= limit) break;
	}

	return sources;
}

/** Build a complete URL for a source (page path + optional anchor). */
export function buildSourceUrl(source: AiSource, baseUrl = ''): string {
	const anchor = source.sectionAnchor ? `#${source.sectionAnchor}` : '';
	return `${baseUrl}${source.pageId}${anchor}`;
}
