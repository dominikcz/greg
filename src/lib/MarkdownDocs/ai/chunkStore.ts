import type { DocChunk, RetrievedChunk } from './types.js';

/**
 * Backend interface for storing and searching documentation chunks.
 *
 * Implement this interface to plug in a different storage strategy:
 *   - MemoryStore     — in-memory BM25 (default, zero deps)
 *   - Custom          — Qdrant, Chroma, SQLite+vec, Pinecone, …
 */
export interface ChunkStore {
	/**
	 * (Re-)build the store from a list of DocChunks.
	 * Replaces all previously indexed content.
	 */
	index(chunks: DocChunk[]): Promise<void>;

	/**
	 * Search for the most relevant chunks matching `query`.
	 * Returns at most `limit` results ordered by descending relevance.
	 */
	search(query: string, limit?: number): Promise<RetrievedChunk[]>;

	/** Total number of indexed chunks. */
	size(): number;
}
