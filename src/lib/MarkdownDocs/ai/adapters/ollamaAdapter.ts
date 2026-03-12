import type { AiProvider } from '../aiProvider.js';
import type { AiProviderOptions, ChatMessage } from '../types.js';

export type OllamaAdapterOptions = {
	/** Base URL of the Ollama service. Default: http://localhost:11434 */
	baseUrl?: string;
	/** Chat model to use. Default: llama3.2 */
	model?: string;
	/**
	 * Embedding model to use for dense retrieval.
	 * Set to null to disable embeddings (BM25-only mode).
	 * Default: nomic-embed-text
	 */
	embeddingModel?: string | null;
	/** Request timeout in milliseconds. Default: 60_000 */
	timeout?: number;
};

/**
 * Adapter for Ollama — a local LLM runtime.
 * https://ollama.com
 *
 * Requires Ollama to be running locally. Pull a model before use:
 *   ollama pull llama3.2
 *   ollama pull nomic-embed-text   (for semantic search)
 */
export class OllamaAdapter implements AiProvider {
	readonly name = 'ollama';
	private readonly baseUrl: string;
	private readonly model: string;
	private readonly embeddingModel: string | null;
	private readonly timeout: number;

	constructor(options: OllamaAdapterOptions = {}) {
		this.baseUrl = (options.baseUrl ?? 'http://localhost:11434').replace(/\/$/, '');
		this.model = options.model ?? 'llama3.2';
		this.embeddingModel = options.embeddingModel !== undefined
			? (options.embeddingModel ?? null)
			: 'nomic-embed-text';
		this.timeout = options.timeout ?? 60_000;
	}

	async chat(messages: ChatMessage[], options?: AiProviderOptions): Promise<string> {
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
		let response: Response;
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

		const data = await response.json() as {
			message?: { content?: string };
			error?: string;
		};

		if (data.error) throw new Error(`Ollama error: ${data.error}`);
		return data.message?.content ?? '';
	}

	async embed(texts: string[]): Promise<number[][]> {
		if (!this.embeddingModel) {
			throw new Error('OllamaAdapter: embeddingModel is disabled (null). Set embeddingModel to use embeddings.');
		}

		const results: number[][] = [];
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
			const data = await response.json() as { embeddings?: number[][] };
			results.push(data.embeddings?.[0] ?? []);
		}
		return results;
	}

	async isAvailable(): Promise<boolean> {
		try {
			const controller = new AbortController();
			setTimeout(() => controller.abort(), 3_000);
			const response = await fetch(`${this.baseUrl}/api/tags`, {
				signal: controller.signal,
			});
			return response.ok;
		} catch {
			return false;
		}
	}
}
