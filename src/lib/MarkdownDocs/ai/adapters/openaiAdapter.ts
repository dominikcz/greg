import type { AiProvider } from '../aiProvider.js';
import type { AiProviderOptions, ChatMessage } from '../types.js';

export type OpenAiAdapterOptions = {
	/**
	 * API key.
	 * If omitted, read from the GREG_OPENAI_API_KEY environment variable.
	 * Never store the key in greg.config.js — use the env variable.
	 */
	apiKey?: string;
	/** Chat model to use. Default: gpt-4o-mini */
	model?: string;
	/** Embedding model. Default: text-embedding-3-small */
	embeddingModel?: string;
	/**
	 * API base URL — supports OpenAI-compatible endpoints
	 * (Groq, Together AI, local llama.cpp server, Mistral API, …).
	 * Default: https://api.openai.com/v1
	 */
	baseUrl?: string;
	/** Request timeout in milliseconds. Default: 60_000 */
	timeout?: number;
};

/**
 * Adapter for OpenAI and OpenAI-compatible REST APIs.
 *
 * Set the API key via the GREG_OPENAI_API_KEY environment variable
 * or pass it explicitly via options.apiKey.
 */
export class OpenAiAdapter implements AiProvider {
	readonly name = 'openai';
	private readonly baseUrl: string;
	private readonly model: string;
	private readonly embeddingModel: string;
	private readonly timeout: number;
	private readonly apiKey: string;

	constructor(options: OpenAiAdapterOptions = {}) {
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
		this.timeout = options.timeout ?? 60_000;
	}

	private get headers(): Record<string, string> {
		return {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${this.apiKey}`,
		};
	}

	async chat(messages: ChatMessage[], options?: AiProviderOptions): Promise<string> {
		const body = JSON.stringify({
			model: options?.model ?? this.model,
			messages,
			temperature: options?.temperature ?? 0.3,
			...(options?.maxTokens ? { max_tokens: options.maxTokens } : {}),
		});

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.timeout);
		let response: Response;
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

		const data = await response.json() as {
			choices?: Array<{ message?: { content?: string } }>;
			error?: { message?: string };
		};

		if (data.error) throw new Error(`OpenAI error: ${data.error.message}`);
		return data.choices?.[0]?.message?.content ?? '';
	}

	async embed(texts: string[]): Promise<number[][]> {
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

		const data = await response.json() as {
			data?: Array<{ embedding: number[]; index: number }>;
			error?: { message?: string };
		};

		if (data.error) throw new Error(`OpenAI embed error: ${data.error.message}`);
		// Sort by index to guarantee input order is preserved
		const sorted = (data.data ?? []).sort((a, b) => a.index - b.index);
		return sorted.map(d => d.embedding);
	}

	async isAvailable(): Promise<boolean> {
		try {
			const controller = new AbortController();
			setTimeout(() => controller.abort(), 5_000);
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
