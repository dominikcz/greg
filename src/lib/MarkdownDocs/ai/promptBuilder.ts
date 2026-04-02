import type { AiCharacter, ChatMessage, RetrievedChunk } from './types.js';

/**
 * Build the system prompt by combining the character's persona with
 * numbered documentation context blocks. Each block includes the source
 * link so the LLM can cite it inline.
 */
export function buildSystemPrompt(
	character: AiCharacter,
	chunks: RetrievedChunk[],
	baseUrl = '',
): string {
	const context = chunks.map((c, i) => {
		const anchor = c.sectionAnchor ? `#${c.sectionAnchor}` : '';
		const link = `${baseUrl}${c.pageId}${anchor}`;
		const heading = c.sectionHeading ? ` › ${c.sectionHeading}` : '';
		return (
			`SOURCE ${i + 1}: [${c.pageTitle}${heading}](${link})\n` +
			c.content
		);
	}).join('\n\n');

	return `${character.systemPrompt}

STRICT RULES — follow these without exception:
- LANGUAGE: You MUST respond in the exact same language as the user's question. Polish question = Polish answer. English question = English answer. This rule overrides everything else including your persona.
- Base your answer EXCLUSIVELY on the DOCUMENTATION CONTEXT provided below.
- If the context does not contain enough information to fully answer, say so clearly. Do NOT include any source links in that case.
- When you cite information, use the exact markdown links from the context: [Title](link). Do NOT invent, fabricate, or modify any URLs.
- Do NOT invent, hallucinate, or add information absent from the context.
- Format your response in markdown.

DOCUMENTATION CONTEXT:
${context}`;
}

/**
 * Build the full messages array for an LLM call.
 */
export function buildMessages(
	character: AiCharacter,
	chunks: RetrievedChunk[],
	userQuery: string,
	conversationHistory: ChatMessage[] = [],
	baseUrl = '',
): ChatMessage[] {
	return [
		{ role: 'system', content: buildSystemPrompt(character, chunks, baseUrl) },
		...conversationHistory,
		{ role: 'user', content: userQuery },
	];
}
