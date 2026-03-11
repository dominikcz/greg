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
			`[${i + 1}] Page: "${c.pageTitle}"${heading}\n` +
			`    Link: ${link}\n` +
			`    ${c.content}`
		);
	}).join('\n\n');

	return `${character.systemPrompt}

STRICT RULES — follow these without exception:
- Base your answer EXCLUSIVELY on the DOCUMENTATION CONTEXT provided below.
- If the context does not contain enough information to fully answer, say so clearly instead of guessing.
- ALWAYS include at least one inline markdown link citation: [Section Title](link)
- Do NOT invent, hallucinate, or add information absent from the context.
- Respond in the same language the user used in their question.
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
