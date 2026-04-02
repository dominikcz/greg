import { buildMessages } from './promptBuilder.js';
import { extractSources } from './docLinker.js';

/**
 * Return the set of pageIds that were actually cited in the answer.
 * Handles both inline markdown links [text](url) and numeric references [N]
 * mapped back to the chunks array.
 */
function extractCitedPageIds(answer, baseUrl, chunks) {
	const cited = new Set();

	// 1. Inline markdown links: [text](url)
	const linkRe = /\]\(([^)\s]+)\)/g;
	let m;
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
		const idx = parseInt(m[1], 10) - 1; // prompt uses 1-based SOURCE N
		if (idx >= 0 && idx < chunks.length) {
			const pageId = chunks[idx].pageId.replace(/^\/\/+/, '/');
			cited.add(pageId);
		}
	}

	return cited;
}

export class RagPipeline {
	constructor(provider, store, characters) {
		this.provider = provider;
		this.store = store;
		this.characters = characters;
	}

	getCharacter(characterId) {
		if (characterId) {
			const found = this.characters.find(c => c.id === characterId);
			if (found) return found;
		}
		return this.characters[0];
	}

	async ask(query, characterId, locale, options = {}) {
		const topK = options.topK ?? 8;
		const character = this.getCharacter(characterId);
		const baseUrl = options.baseUrl ?? '';

		let chunks = await this.store.search(query, topK * 2);

		if (locale && locale !== '/') {
			const prefix = locale.endsWith('/') ? locale : locale + '/';
			const localeChunks = chunks.filter(
				c => c.pageId === locale || c.pageId.startsWith(prefix),
			);
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

		const messages = buildMessages(character, chunks, query, [], baseUrl);
		const answer = await this.provider.chat(messages, options.llm);

		// Show only sources whose pageId was actually cited inline by the LLM.
		const citedPageIds = extractCitedPageIds(answer, baseUrl, chunks);
		const citedChunks = chunks.filter(c => {
			const normalised = c.pageId.replace(/^\/\/+/, '/');
			return citedPageIds.has(normalised);
		});
		const sources = extractSources(citedChunks);

		return { answer, sources, character: character.id };
	}

	getCharacters() {
		return this.characters;
	}
}
