/**
 * OpenRouter puts one key and one API in front of most language models, so which of them is
 * asked is a name to change. Here is only what Salomón needs of it.
 */

const api = 'https://openrouter.ai/api/v1';

/** Cheap, with room for a whole book, and able to answer in a given JSON shape. */
export const defaultModel = 'deepseek/deepseek-v4-flash';

/** A refusal from OpenRouter or from the model behind it. Never carries the key. */
export class OpenRouterError extends Error {
	readonly status: number;

	constructor(status: number, message: string) {
		super(`OpenRouter ${status}: ${message}`);
		this.status = status;
	}
}

export interface KeyInfo {
	/** Spent with this key so far. */
	usedUsd: number;
	/** The most this key may spend, if it was given a limit. */
	limitUsd: number | null;
	remainingUsd: number | null;
	freeTier: boolean;
}

export interface Ask {
	model: string;
	system?: string;
	user: string;
	/** The shape of the answer, as a JSON Schema with a name for it. */
	schema: { name: string; schema: Record<string, unknown> };
	maxTokens?: number;
}

export interface Answer<T> {
	value: T;
	/** The model that answered, as OpenRouter names it. */
	model: string;
	usage: { tokensIn: number; tokensOut: number; usd: number };
}

interface Body {
	error?: { message?: string; code?: number };
	data?: Record<string, unknown>;
	model?: string;
	choices?: { message?: { content?: string | null }; finish_reason?: string }[];
	usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
}

/** `fetch` is for the tests, which bring their own. */
export function createOpenRouter(apiKey: string, fetcher: typeof fetch = fetch) {
	async function call(path: string, body?: unknown): Promise<Body> {
		const response = await fetcher(`${api}${path}`, {
			method: body === undefined ? 'GET' : 'POST',
			headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body)
		});
		const answer = (await response.json().catch(() => null)) as Body | null;
		// A model that fails behind OpenRouter may come back as a 200 with the error inside.
		if (!response.ok || !answer || answer.error) {
			throw new OpenRouterError(
				answer?.error?.code ?? response.status,
				answer?.error?.message ?? response.statusText
			);
		}
		return answer;
	}

	return {
		/** Asks nothing of any model: the cheapest call that needs a good key. */
		async keyInfo(): Promise<KeyInfo> {
			const { data = {} } = await call('/key');
			const amount = (value: unknown) => (typeof value === 'number' ? value : null);
			return {
				usedUsd: amount(data.usage) ?? 0,
				limitUsd: amount(data.limit),
				remainingUsd: amount(data.limit_remaining),
				freeTier: data.is_free_tier === true
			};
		},

		/** One question, answered as JSON of the given shape, by a provider that can hold to it. */
		async askJson<T>({ model, system, user, schema, maxTokens = 2000 }: Ask): Promise<Answer<T>> {
			const answer = await call('/chat/completions', {
				model,
				messages: [
					...(system ? [{ role: 'system', content: system }] : []),
					{ role: 'user', content: user }
				],
				response_format: { type: 'json_schema', json_schema: { ...schema, strict: true } },
				provider: { require_parameters: true },
				max_tokens: maxTokens
			});

			const choice = answer.choices?.[0];
			let value: T;
			try {
				value = JSON.parse(choice?.message?.content ?? '') as T;
			} catch {
				throw new OpenRouterError(
					200,
					`${model} did not answer in JSON (it stopped for: ${choice?.finish_reason ?? 'no reason given'})`
				);
			}
			return {
				value,
				model: answer.model ?? model,
				usage: {
					tokensIn: answer.usage?.prompt_tokens ?? 0,
					tokensOut: answer.usage?.completion_tokens ?? 0,
					usd: answer.usage?.cost ?? 0
				}
			};
		}
	};
}
