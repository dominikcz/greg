/**
 * Shared types for Greg AI knowledge base (RAG).
 */

/** A chunk of documentation content extracted from the search index. */
export type DocChunk = {
	/** Route path of the page, e.g. "/docs/guide/routing" */
	pageId: string;
	/** Page title */
	pageTitle: string;
	/** Section heading text (h2/h3) */
	sectionHeading: string;
	/** Section anchor ID used for URL linking */
	sectionAnchor: string;
	/** Plain-text content (~500 tokens max per chunk) */
	content: string;
	/** Optional: pre-computed embedding vector */
	embedding?: number[];
};

/** A retrieved chunk with a relevance score (0–1, higher = more relevant). */
export type RetrievedChunk = DocChunk & {
	score: number;
};

/** A source citation included in an AI response. */
export type AiSource = {
	pageId: string;
	pageTitle: string;
	sectionHeading: string;
	sectionAnchor: string;
};

/** Full response from the AI endpoint. */
export type AiResponse = {
	/** Answer in markdown format */
	answer: string;
	/** Source citations used to generate the answer */
	sources: AiSource[];
	/** Character ID that was used */
	character: string;
};

/** A chat message used in LLM API calls. */
export type ChatMessage = {
	role: 'system' | 'user' | 'assistant';
	content: string;
};

/** A predefined AI persona/character. */
export type AiCharacter = {
	id: string;
	/** Display name shown in the UI */
	name: string;
	/** Emoji or short icon string */
	icon: string;
	/** One-line description shown in character selector */
	description?: string;
	/** System prompt defining the response style */
	systemPrompt: string;
};

/** Options for LLM generation (passed to an AiProvider.chat() call). */
export type AiProviderOptions = {
	/** Override the model for this request */
	model?: string;
	/** Sampling temperature (0 = deterministic, 1 = creative) */
	temperature?: number;
	/** Maximum tokens to generate */
	maxTokens?: number;
};
