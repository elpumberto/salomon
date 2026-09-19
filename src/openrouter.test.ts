import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOpenRouter, OpenRouterError } from './openrouter.ts';

/** A `fetch` that answers the same thing to everything and keeps what it was asked. */
function fake(status: number, body: unknown) {
	const asked: { url: string; init: RequestInit }[] = [];
	const fetcher = (async (url: string, init: RequestInit) => {
		asked.push({ url, init });
		return new Response(JSON.stringify(body), { status });
	}) as typeof fetch;
	return { asked, fetcher };
}

test('an answer comes back parsed, with what it cost', async () => {
	const { asked, fetcher } = fake(200, {
		model: 'some/model-0731',
		choices: [{ message: { content: '{"asleep":true}' }, finish_reason: 'stop' }],
		usage: { prompt_tokens: 40, completion_tokens: 6, cost: 0.0000031 }
	});

	const answer = await createOpenRouter('a-key', fetcher).askJson<{ asleep: boolean }>({
		model: 'some/model',
		system: 'Answer about the text.',
		user: 'The cat slept.',
		schema: { name: 'scene', schema: { type: 'object' } }
	});

	assert.deepEqual(answer, {
		value: { asleep: true },
		model: 'some/model-0731',
		usage: { tokensIn: 40, tokensOut: 6, usd: 0.0000031 }
	});
	assert.equal(asked[0]?.url, 'https://openrouter.ai/api/v1/chat/completions');
	assert.equal(new Headers(asked[0]?.init.headers).get('authorization'), 'Bearer a-key');
	const sent = JSON.parse(asked[0]?.init.body as string);
	assert.deepEqual(sent.response_format.json_schema, {
		name: 'scene',
		schema: { type: 'object' },
		strict: true
	});
	assert.deepEqual(
		sent.messages.map((message: { role: string }) => message.role),
		['system', 'user']
	);
});

test('a refusal says why, and an answer cut short is not taken for JSON', async () => {
	const refused = createOpenRouter(
		'a-key',
		fake(401, { error: { message: 'User not found.', code: 401 } }).fetcher
	);
	await assert.rejects(refused.keyInfo(), (error: unknown) => {
		assert.ok(error instanceof OpenRouterError);
		assert.equal(error.status, 401);
		assert.match(error.message, /User not found/);
		assert.doesNotMatch(error.message, /a-key/);
		return true;
	});

	const cut = createOpenRouter(
		'a-key',
		fake(200, { choices: [{ message: { content: '{"asl' }, finish_reason: 'length' }] }).fetcher
	);
	await assert.rejects(
		cut.askJson({ model: 'some/model', user: '…', schema: { name: 'scene', schema: {} } }),
		/did not answer in JSON \(it stopped for: length\)/
	);
});

test('what a key has spent and may spend', async () => {
	const { fetcher } = fake(200, {
		data: { label: 'masked', usage: 1.25, limit: 5, limit_remaining: 3.75, is_free_tier: false }
	});

	assert.deepEqual(await createOpenRouter('a-key', fetcher).keyInfo(), {
		usedUsd: 1.25,
		limitUsd: 5,
		remainingUsd: 3.75,
		freeTier: false
	});
});
