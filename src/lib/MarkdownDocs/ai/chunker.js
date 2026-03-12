/**
 * Convert a flat search index (SearchEntry[]) into DocChunks for RAG.
 */
export function buildChunks(index, options = {}) {
	const maxSize = options.maxChunkSize ?? 1800;
	const overlap = Math.min(options.overlap ?? 120, Math.floor(maxSize / 4));
	const chunks = [];

	for (const entry of index) {
		for (const section of entry.sections) {
			const content = section.content.trim();

			if (!content) {
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

function splitText(text, maxSize, overlap) {
	const chunks = [];
	const sentences = text.split(/(?<=[.!?])\s+/);
	let current = '';

	for (const sentence of sentences) {
		if (sentence.length > maxSize) {
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
