import { buildMessages } from './promptBuilder.js';
import { extractSources } from './docLinker.js';

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
		const sources = extractSources(chunks);

		return { answer, sources, character: character.id };
	}

	getCharacters() {
		return this.characters;
	}
}
