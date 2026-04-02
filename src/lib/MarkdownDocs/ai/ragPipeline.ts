import type { AiProvider } from './aiProvider.js';
import type { ChunkStore } from './chunkStore.js';
import type { AiCharacter, AiProviderOptions, AiResponse, RetrievedChunk } from './types.js';
import { buildMessages } from './promptBuilder.js';
import { extractSources } from './docLinker.js';

/**
 * Parse all markdown link URLs from the LLM answer and return the set of
 * pageIds (URL without anchor and without baseUrl prefix) that were cited.
 */
function extractCitedPageIds(answer: string, baseUrl: string, chunks: RetrievedChunk[]): Set<string> {
	const cited = new Set<string>();

	// 1. Inline markdown links: [text](url)
	const linkRe = /\]\(([^)\s]+)\)/g;
	let m: RegExpExecArray | null;
	while ((m = linkRe.exec(answer)) !== null) {
		let url = m[1].split('#')[0].trim();
		if (!url) continue;
		if (baseUrl && url.startsWith(baseUrl)) url = url.slice(baseUrl.length);
		url = url.replace(/^\/\/+/, '/');
		if (url) cited.add(url);
	}

	// 2. Numeric references [N] — map back to chunk pageId
	const numRe = /\[(\d+)\]/g;
	while ((m = numRe.exec(answer)) !== null) {
		const idx = parseInt(m[1], 10) - 1;
		if (idx >= 0 && idx < chunks.length) {
			const pageId = chunks[idx].pageId.replace(/^\/\/+/, '/');
			cited.add(pageId);
		}
	}

	return cited;
}

export type RagOptions = {
	/** Number of chunks to retrieve from the store. Default: 8 */
	topK?: number;
	/** LLM generation parameters */
	llm?: AiProviderOptions;
	/**
	 * Base URL prepended to doc links in the system prompt context.
	 * Useful for absolute links when the AI server runs on a different origin.
	 * Default: '' (relative links)
	 */
	baseUrl?: string;
};

/**
 * Retrieval-Augmented Generation pipeline.
 *
 * Orchestrates the full ask() flow:
 *   1. Retrieve relevant chunks from the store (BM25 or embedding search)
 *   2. Optionally filter by locale
 *   3. Build system prompt with character persona + retrieved context
 *   4. Call the LLM provider
 *   5. Extract source citations
 *   6. Return AiResponse
 */
export class RagPipeline {
	private readonly characters: AiCharacter[];

	constructor(
		private readonly provider: AiProvider,
		private readonly store: ChunkStore,
		characters: AiCharacter[],
	) {
		this.characters = characters;
	}

	/** Find a character by id, or fall back to the first available. */
	private getCharacter(characterId?: string): AiCharacter {
		if (characterId) {
			const found = this.characters.find(c => c.id === characterId);
			if (found) return found;
		}
		return this.characters[0];
	}

	/**
	 * Run a RAG query and return the AI response.
	 *
	 * @param query       User's question (plain text)
	 * @param characterId Persona to use (falls back to first character if unknown)
	 * @param locale      Locale path prefix for results filtering (e.g. '/pl/')
	 * @param options     Retrieval and LLM tuning
	 */
	async ask(
		query: string,
		characterId?: string,
		locale?: string,
		options: RagOptions = {},
	): Promise<AiResponse> {
		const topK = options.topK ?? 8;
		const character = this.getCharacter(characterId);
		const baseUrl = options.baseUrl ?? '';

		// 1. Retrieve — fetch more than topK to have room to filter
		let chunks = await this.store.search(query, topK * 2);

		// 2. Locale filtering — prefer locale-matching chunks
		if (locale && locale !== '/') {
			const prefix = locale.endsWith('/') ? locale : locale + '/';
			const localeChunks = chunks.filter(
				c => c.pageId === locale || c.pageId.startsWith(prefix),
			);
			// Only apply locale filter when it yields results
			if (localeChunks.length > 0) chunks = localeChunks;
		}

		chunks = chunks.slice(0, topK);

		if (chunks.length === 0) {
			return {
				answer: 'I could not find any relevant documentation to answer your question. Try rephrasing or look through the documentation directly.',
				sources: [],
				character: character.id,
			};
		}

		// 3. Build prompt and call LLM
		const messages = buildMessages(character, chunks, query, [], baseUrl);
		const answer = await this.provider.chat(messages, options.llm);

		// 4. Collect only sources whose link was actually cited in the answer.
		//    This is deterministic and doesn't rely on LLM marker compliance.
		const citedPageIds = extractCitedPageIds(answer, baseUrl, chunks);
		const citedChunks = chunks.filter(c => {
			const normalised = c.pageId.replace(/^\/\/+/, '/');
			return citedPageIds.has(normalised);
		});
		const sources = extractSources(citedChunks);

		return { answer, sources, character: character.id };
	}

	/** Return the list of available characters (used by the /characters endpoint). */
	getCharacters(): AiCharacter[] {
		return this.characters;
	}
}
