import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AuthenticationError, noul, score, TypeSafeClient } from '@typesafe-ai/sdk';
import { usd } from './estimate.ts';
import { key } from './keys.ts';

/**
 * Against the real Jev, with the key in `.env`. The first two calls ask it nothing and are free;
 * the third is a sentence and two questions: some sixty tokens, a few millionths of a dollar.
 */

test('Jev turns a made-up key down', async () => {
	const client = new TypeSafeClient({ apiKey: 'not-a-key' });

	await assert.rejects(client.models.list(), AuthenticationError);
});

test('Jev takes the key', async (t) => {
	const models = await new TypeSafeClient({ apiKey: key('TYPESAFE_API_KEY') }).models.list();

	assert.ok(models.length > 0);
	t.diagnostic(`models: ${models.map((model) => model.name).join(', ')}`);
});

test('Jev answers what it is asked, and says what it took', async (t) => {
	const client = new TypeSafeClient({ apiKey: key('TYPESAFE_API_KEY') });

	const { answers, usage, model } = await client.systemOne({
		state: 'The cat slept on the warm windowsill all afternoon.',
		questions: {
			animal: noul('Is an animal mentioned?'),
			pace: score('How much is going on in the scene?', [
				'Nothing happens: stillness, rest, waiting',
				'Something happens, at an ordinary pace',
				'A lot happens at once: action, danger, haste'
			])
		}
	});

	// A noul is the probability of a yes; a score, where the text falls among the levels, from 0.
	assert.ok(answers.animal.noul > 0.5, `an animal, with ${answers.animal.noul}`);
	assert.ok(answers.pace.score < 1, `a still scene, at ${answers.pace.score}`);
	assert.ok(usage.input_tokens > 0);
	t.diagnostic(`${model}: ${usage.input_tokens} tokens in, $${usd(usage.input_tokens).toFixed(7)}`);
});
