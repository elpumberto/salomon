import assert from 'node:assert/strict';
import { test } from 'node:test';
import { key } from './keys.ts';
import { createOpenRouter, defaultModel, OpenRouterError } from './openrouter.ts';

/**
 * Against the real OpenRouter, with the key in `.env`. The first two calls ask no model anything
 * and are free; the third is a sentence to a cheap model: well under a thousandth of a dollar.
 */

test('OpenRouter turns a made-up key down', async () => {
	await assert.rejects(
		createOpenRouter('not-a-key').keyInfo(),
		(error: unknown) => error instanceof OpenRouterError && error.status === 401
	);
});

test('OpenRouter takes the key', async (t) => {
	const info = await createOpenRouter(key('OPENROUTER_API_KEY')).keyInfo();

	const limit =
		info.limitUsd === null
			? 'no limit on the key'
			: `$${info.remainingUsd?.toFixed(4)} left of a $${info.limitUsd} limit`;
	t.diagnostic(`$${info.usedUsd.toFixed(4)} spent so far, ${limit}`);
});

test('a cheap model answers in the JSON it is asked for, and says what it cost', async (t) => {
	const model = process.env.OPENROUTER_MODEL || defaultModel;

	const { value, usage, ...answer } = await createOpenRouter(key('OPENROUTER_API_KEY')).askJson<{
		animal: string;
		asleep: boolean;
	}>({
		model,
		system: 'Answer about the text you are given, from the text alone.',
		user: 'The cat slept on the warm windowsill all afternoon.',
		schema: {
			name: 'scene',
			schema: {
				type: 'object',
				properties: {
					animal: { type: 'string', description: 'The animal in the text, in one word' },
					asleep: { type: 'boolean', description: 'Whether it is asleep' }
				},
				required: ['animal', 'asleep'],
				additionalProperties: false
			}
		}
	});

	assert.match(value.animal, /cat/i);
	assert.equal(value.asleep, true);
	assert.ok(usage.tokensIn > 0);
	t.diagnostic(
		`${answer.model}: ${usage.tokensIn} tokens in, ${usage.tokensOut} out, $${usage.usd.toFixed(7)}`
	);
});
