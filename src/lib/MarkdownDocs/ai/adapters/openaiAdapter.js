export class OpenAiAdapter {
	constructor(options = {}) {
		this.name = 'openai';
		const key = options.apiKey ?? process.env.GREG_OPENAI_API_KEY ?? '';
		if (!key) {
			throw new Error(
				'OpenAiAdapter: no API key provided. ' +
				'Set GREG_OPENAI_API_KEY env variable or pass apiKey in options.',
			);
		}
		this.apiKey = key;
		this.baseUrl = (options.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
		this.model = options.model ?? 'gpt-4o-mini';
		this.embeddingModel = options.embeddingModel ?? 'text-embedding-3-small';
		this.timeout = options.timeout ?? 60000;
	}

	get headers() {
		return {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${this.apiKey}`,
		};
	}

	async chat(messages, options) {
		const body = JSON.stringify({
			model: options?.model ?? this.model,
			messages,
			temperature: options?.temperature ?? 0.3,
			...(options?.maxTokens ? { max_tokens: options.maxTokens } : {}),
		});

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.timeout);
		let response;
		try {
			response = await fetch(`${this.baseUrl}/chat/completions`, {
				method: 'POST',
				headers: this.headers,
				body,
				signal: controller.signal,
			});
		} finally {
			clearTimeout(timer);
		}

		if (!response.ok) {
			const text = await response.text().catch(() => '');
			throw new Error(`OpenAI chat error ${response.status}: ${text}`);
		}

		const data = await response.json();
		if (data.error) throw new Error(`OpenAI error: ${data.error.message}`);
		return data.choices?.[0]?.message?.content ?? '';
	}

	async embed(texts) {
		const response = await fetch(`${this.baseUrl}/embeddings`, {
			method: 'POST',
			headers: this.headers,
			body: JSON.stringify({
				model: this.embeddingModel,
				input: texts,
				encoding_format: 'float',
			}),
		});

		if (!response.ok) {
			const err = await response.text().catch(() => '');
			throw new Error(`OpenAI embed error ${response.status}: ${err}`);
		}

		const data = await response.json();
		if (data.error) throw new Error(`OpenAI embed error: ${data.error.message}`);
		const sorted = (data.data ?? []).sort((a, b) => a.index - b.index);
		return sorted.map(d => d.embedding);
	}

	async isAvailable() {
		try {
			const controller = new AbortController();
			setTimeout(() => controller.abort(), 5000);
			const response = await fetch(`${this.baseUrl}/models`, {
				headers: this.headers,
				signal: controller.signal,
			});
			return response.ok;
		} catch {
			return false;
		}
	}
}
