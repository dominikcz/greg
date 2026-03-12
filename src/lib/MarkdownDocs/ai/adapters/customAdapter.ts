import type { AiProvider } from '../aiProvider.js';
import type { AiProviderOptions, ChatMessage } from '../types.js';

/**
 * A user-provided async function that implements the LLM call.
 * Mirrors the `search.provider: "custom"` pattern from the search system.
 */
export type CustomProviderFn = (
	messages: ChatMessage[],
	options?: AiProviderOptions,
) => Promise<string>;

/**
 * Thin wrapper that turns any async function into an AiProvider.
 *
 * Usage in greg.config.js:
 *   search: {
 *     ai: {
 *       enabled: true,
 *       provider: 'custom',
 *       customProvider: async (messages, opts) => {
 *         // call your own LLM backend
 *         return "answer text";
 *       }
 *     }
 *   }
 */
export class CustomAdapter implements AiProvider {
	readonly name = 'custom';
	private readonly fn: CustomProviderFn;

	constructor(fn: CustomProviderFn) {
		this.fn = fn;
	}

	chat(messages: ChatMessage[], options?: AiProviderOptions): Promise<string> {
		return this.fn(messages, options);
	}

	async isAvailable(): Promise<boolean> {
		return true;
	}
}
