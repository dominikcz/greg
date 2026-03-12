export function extractSources(chunks, limit = 6) {
	const seen = new Set();
	const sources = [];

	for (const chunk of chunks) {
		const key = `${chunk.pageId}#${chunk.sectionAnchor}`;
		if (seen.has(key)) continue;
		seen.add(key);

		sources.push({
			pageId: chunk.pageId,
			pageTitle: chunk.pageTitle,
			sectionHeading: chunk.sectionHeading,
			sectionAnchor: chunk.sectionAnchor,
		});

		if (sources.length >= limit) break;
	}

	return sources;
}

export function buildSourceUrl(source, baseUrl = '') {
	const anchor = source.sectionAnchor ? `#${source.sectionAnchor}` : '';
	return `${baseUrl}${source.pageId}${anchor}`;
}
