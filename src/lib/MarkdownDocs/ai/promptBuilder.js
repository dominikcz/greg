export function buildSystemPrompt(character, chunks, baseUrl = '') {
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

export function buildMessages(character, chunks, userQuery, conversationHistory = [], baseUrl = '') {
	return [
		{ role: 'system', content: buildSystemPrompt(character, chunks, baseUrl) },
		...conversationHistory,
		{ role: 'user', content: userQuery },
	];
}
