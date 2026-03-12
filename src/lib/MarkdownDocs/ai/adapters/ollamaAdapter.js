export class OllamaAdapter {
	constructor(options = {}) {
		this.name = 'ollama';
		this.baseUrl = (options.baseUrl ?? 'http://localhost:11434').replace(/\/$/, '');
		this.model = options.model ?? 'llama3.2';
		this.embeddingModel = options.embeddingModel !== undefined
			? (options.embeddingModel ?? null)
			: 'nomic-embed-text';
		this.timeout = options.timeout ?? 60000;
	}

	async chat(messages, options) {
		const body = JSON.stringify({
			model: options?.model ?? this.model,
			messages,
			stream: false,
			options: {
				temperature: options?.temperature ?? 0.3,
				...(options?.maxTokens ? { num_predict: options.maxTokens } : {}),
			},
		});

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.timeout);
		let response;
		try {
			response = await fetch(`${this.baseUrl}/api/chat`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body,
				signal: controller.signal,
			});
		} finally {
			clearTimeout(timer);
		}

		if (!response.ok) {
			const text = await response.text().catch(() => '');
			throw new Error(`Ollama chat error ${response.status}: ${text}`);
		}

		const data = await response.json();
		if (data.error) throw new Error(`Ollama error: ${data.error}`);
		return data.message?.content ?? '';
	}

	async embed(texts) {
		if (!this.embeddingModel) {
			throw new Error('OllamaAdapter: embeddingModel is disabled (null). Set embeddingModel to use embeddings.');
		}

		const results = [];
		for (const text of texts) {
			const response = await fetch(`${this.baseUrl}/api/embed`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ model: this.embeddingModel, input: text }),
			});
			if (!response.ok) {
				const err = await response.text().catch(() => '');
				throw new Error(`Ollama embed error ${response.status}: ${err}`);
			}
			const data = await response.json();
			results.push(data.embeddings?.[0] ?? []);
		}
		return results;
	}

	async isAvailable() {
		try {
			const controller = new AbortController();
			setTimeout(() => controller.abort(), 3000);
			const response = await fetch(`${this.baseUrl}/api/tags`, {
				signal: controller.signal,
			});
			return response.ok;
		} catch {
			return false;
		}
	}
}
