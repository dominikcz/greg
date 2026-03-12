const K1 = 1.5;
const B = 0.75;

function tokenize(text) {
	return text
		.toLowerCase()
		.replace(/[^\w\s]/g, ' ')
		.split(/\s+/)
		.filter(t => t.length > 1);
}

export class MemoryStore {
	constructor() {
		this.chunks = [];
		this.invertedIndex = new Map();
		this.avgLen = 0;
	}

	async index(chunks) {
		this.invertedIndex = new Map();
		this.chunks = chunks.map((chunk, i) => {
			const tokens = tokenize(
				`${chunk.pageTitle} ${chunk.pageTitle} ${chunk.sectionHeading} ${chunk.sectionHeading} ${chunk.content}`,
			);
			const terms = new Map();
			for (const t of tokens) {
				terms.set(t, (terms.get(t) ?? 0) + 1);
			}
			for (const t of terms.keys()) {
				if (!this.invertedIndex.has(t)) {
					this.invertedIndex.set(t, new Set());
				}
				this.invertedIndex.get(t).add(i);
			}
			return { ...chunk, _terms: terms, _len: tokens.length };
		});

		const totalLen = this.chunks.reduce((s, c) => s + c._len, 0);
		this.avgLen = this.chunks.length > 0 ? totalLen / this.chunks.length : 1;
	}

	async search(query, limit = 8) {
		if (this.chunks.length === 0) return [];

		const queryTerms = tokenize(query);
		if (queryTerms.length === 0) return [];

		const N = this.chunks.length;
		const scores = new Float64Array(N);

		for (const term of queryTerms) {
			const docs = this.invertedIndex.get(term);
			if (!docs) continue;

			const df = docs.size;
			const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

			for (const i of docs) {
				const chunk = this.chunks[i];
				const tf = chunk._terms.get(term) ?? 0;
				const len = chunk._len;
				const tfBm25 = (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (len / this.avgLen)));
				scores[i] += idf * tfBm25;
			}
		}

		let maxScore = 0;
		for (let i = 0; i < N; i++) {
			if (scores[i] > maxScore) maxScore = scores[i];
		}
		if (maxScore === 0) return [];

		const results = [];
		for (let i = 0; i < N; i++) {
			if (scores[i] > 0) {
				const { _terms: _t, _len: _l, ...chunk } = this.chunks[i];
				results.push({ ...chunk, score: scores[i] / maxScore });
			}
		}

		results.sort((a, b) => b.score - a.score);
		return results.slice(0, limit);
	}

	size() {
		return this.chunks.length;
	}
}
