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
	/** What was paid for an answer that was of no use, when there was one. */
	readonly usage?: Usage;

	constructor(status: number, message: string, usage?: Usage) {
		super(`OpenRouter ${status}: ${message}`);
		this.status = status;
		this.usage = usage;
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
	/** Who ran it: OpenRouter sends the same model to one provider or another, and they differ. */
	provider: string | null;
	usage: Usage;
}

export interface Usage {
	tokensIn: number;
	/** All that the model wrote, its thinking included: it is paid for like the rest. */
	tokensOut: number;
	/** The part of `tokensOut` spent thinking before the answer, by the models that do. */
	tokensThinking: number;
	usd: number;
}

/** What a model costs, in dollars per million tokens. */
export interface Price {
	usdPerMillionIn: number;
	usdPerMillionOut: number;
}

interface Body {
	error?: { message?: string; code?: number };
	data?: Record<string, unknown>;
	model?: string;
	provider?: string;
	choices?: { message?: { content?: string | null }; finish_reason?: string }[];
	usage?: {
		prompt_tokens?: number;
		completion_tokens?: number;
		cost?: number;
		completion_tokens_details?: { reasoning_tokens?: number } | null;
	};
}

/** Too many calls, or a fault on their side: worth another try. */
const passing = (status: number) => status === 408 || status === 429 || status >= 500;
const tries = 3;

/** The catalogue is public: a price takes no key and costs nothing. */
export async function price(model: string, fetcher: typeof fetch = fetch): Promise<Price | null> {
	const response = await fetcher(`${api}/models`);
	if (!response.ok) return null;
	const { data } = (await response.json()) as {
		data: { id: string; pricing: { prompt: string; completion: string } }[];
	};
	const found = data.find(({ id }) => id === model);
	return found
		? {
				usdPerMillionIn: Number(found.pricing.prompt) * 1_000_000,
				usdPerMillionOut: Number(found.pricing.completion) * 1_000_000
			}
		: null;
}

export interface Options {
	/** For the tests, which bring their own. */
	fetch?: typeof fetch;
	/** How long a call may take. A provider that hangs would otherwise be waited for without end. */
	timeoutMs?: number;
	/** The first wait before another try; each one after it is twice as long. */
	backoffMs?: number;
}

export function createOpenRouter(apiKey: string, options: Options = {}) {
	const { fetch: fetcher = fetch, timeoutMs = 180_000, backoffMs = 1_000 } = options;

	async function once(path: string, body?: unknown): Promise<Body> {
		const response = await fetcher(`${api}${path}`, {
			method: body === undefined ? 'GET' : 'POST',
			headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body),
			signal: AbortSignal.timeout(timeoutMs)
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

	async function call(path: string, body?: unknown): Promise<Body> {
		for (let attempt = 1; ; attempt++) {
			try {
				return await once(path, body);
			} catch (error) {
				// What `fetch` itself throws is a network that drops, or a call that ran out of time.
				const worthIt = error instanceof OpenRouterError ? passing(error.status) : true;
				if (!worthIt || attempt === tries) throw error;
				await new Promise((resolve) => setTimeout(resolve, backoffMs * 2 ** (attempt - 1)));
			}
		}
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
			const usage: Usage = {
				tokensIn: answer.usage?.prompt_tokens ?? 0,
				tokensOut: answer.usage?.completion_tokens ?? 0,
				tokensThinking: answer.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
				usd: answer.usage?.cost ?? 0
			};
			let value: T;
			try {
				value = JSON.parse(choice?.message?.content ?? '') as T;
			} catch {
				throw new OpenRouterError(
					200,
					`${model} did not answer in JSON (it stopped for: ${choice?.finish_reason ?? 'no reason given'})`,
					usage
				);
			}
			return { value, model: answer.model ?? model, provider: answer.provider ?? null, usage };
		}
	};
}
