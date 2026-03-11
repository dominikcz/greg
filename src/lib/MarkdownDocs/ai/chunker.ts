import type { DocChunk } from './types.js';

// Mirror of the SearchEntry type from searchIndexBuilder.js
// (kept local to avoid creating a circular dependency)
type SearchSection = {
	heading: string;
	anchor: string;
	content: string;
};

type SearchEntry = {
	id: string;
	title: string;
	sections: SearchSection[];
};

export type ChunkerOptions = {
	/**
	 * Approximate maximum characters per chunk.
	 * ~4 chars ≈ 1 token, so 1800 chars ≈ 450 tokens (safe for most models).
	 * Default: 1800
	 */
	maxChunkSize?: number;
	/**
	 * Character overlap between consecutive chunks from the same section.
	 * Helps avoid losing context at chunk boundaries.
	 * Default: 120
	 */
	overlap?: number;
};

/**
 * Convert a flat search index (SearchEntry[]) into DocChunks for RAG.
 *
 * Strategy:
 * - Each section of a page maps to at least one chunk.
 * - Sections whose content fits within `maxChunkSize` become a single chunk.
 * - Larger sections are split into overlapping sub-chunks at sentence boundaries.
 * - Heading-only sections (no body content) still produce a chunk so the LLM
 *   can reference that section's existence.
 */
export function buildChunks(
	index: SearchEntry[],
	options: ChunkerOptions = {},
): DocChunk[] {
	const maxSize = options.maxChunkSize ?? 1800;
	const overlap = Math.min(options.overlap ?? 120, Math.floor(maxSize / 4));
	const chunks: DocChunk[] = [];

	for (const entry of index) {
		for (const section of entry.sections) {
			const content = section.content.trim();

			if (!content) {
				// Heading-only entry — useful so AI knows the section exists
				if (section.heading) {
					chunks.push({
						pageId: entry.id,
						pageTitle: entry.title,
						sectionHeading: section.heading,
						sectionAnchor: section.anchor,
						content: section.heading,
					});
				}
				continue;
			}

			if (content.length <= maxSize) {
				chunks.push({
					pageId: entry.id,
					pageTitle: entry.title,
					sectionHeading: section.heading,
					sectionAnchor: section.anchor,
					content,
				});
				continue;
			}

			// Content too long — split into overlapping sub-chunks
			const subChunks = splitText(content, maxSize, overlap);
			for (let i = 0; i < subChunks.length; i++) {
				chunks.push({
					pageId: entry.id,
					pageTitle: entry.title,
					sectionHeading: subChunks.length > 1
						? `${section.heading} (${i + 1}/${subChunks.length})`
						: section.heading,
					sectionAnchor: section.anchor,
					content: subChunks[i],
				});
			}
		}
	}

	return chunks;
}

/**
 * Split text into overlapping chunks, preferring sentence boundaries.
 * Falls back to character-level splitting when no sentence boundary is found.
 */
function splitText(text: string, maxSize: number, overlap: number): string[] {
	const chunks: string[] = [];
	// Split on sentence-ending punctuation followed by whitespace
	const sentences = text.split(/(?<=[.!?])\s+/);
	let current = '';

	for (const sentence of sentences) {
		if (sentence.length > maxSize) {
			// Single sentence exceeds maxSize — hard split it
			if (current) {
				chunks.push(current.trim());
				current = '';
			}
			for (let i = 0; i < sentence.length; i += maxSize - overlap) {
				chunks.push(sentence.slice(i, i + maxSize));
			}
			continue;
		}

		if (current.length + sentence.length + 1 > maxSize && current.length > 0) {
			chunks.push(current.trim());
			// Carry the tail of current chunk forward for overlap
			current = current.slice(Math.max(0, current.length - overlap)) + ' ' + sentence;
		} else {
			current = current ? current + ' ' + sentence : sentence;
		}
	}

	if (current.trim()) {
		chunks.push(current.trim());
	}

	return chunks.length > 0 ? chunks : [text.slice(0, maxSize)];
}
