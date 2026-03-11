import type { ChatMessage, AiProviderOptions } from './types.js';

/**
 * Adapter interface for LLM providers.
 *
 * Implement this interface to add support for a new LLM backend (local or cloud).
 * See: OllamaAdapter, OpenAiAdapter, CustomAdapter for reference implementations.
 */
export interface AiProvider {
	/** Human-readable provider name (used in log output). */
	readonly name: string;

	/**
	 * Send a conversation and return the assistant's reply as a plain string.
	 * The implementor is responsible for all network / inference calls.
	 */
	chat(messages: ChatMessage[], options?: AiProviderOptions): Promise<string>;

	/**
	 * Generate dense embeddings for an array of text strings.
	 * Returns null-equivalent (empty arrays) or throws if unsupported.
	 * Optional — used only by vector-capable stores.
	 */
	embed?(texts: string[]): Promise<number[][]>;

	/**
	 * Quick availability probe — should resolve without throwing.
	 * Returns false if the provider/service is unreachable.
	 */
	isAvailable(): Promise<boolean>;
}
