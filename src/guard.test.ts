import assert from 'node:assert/strict';
import { test } from 'node:test';
import { leaks } from './guard.ts';

// Put together here, so that this file holds nothing that looks like a key.
const openRouterKey = ['sk', 'or', 'v1', 'a1b2c3d4'.repeat(8)].join('-');
const jevKey = 'jev' + '0123456789'.repeat(3);
const env = { TYPESAFE_API_KEY: jevKey, OPENROUTER_MODEL: 'some/model-with-a-long-name' };

/** A staged diff that adds the given lines to a file. */
const adding = (file: string, ...lines: string[]) =>
	[
		`diff --git a/${file} b/${file}`,
		`--- a/${file}`,
		`+++ b/${file}`,
		`@@ -0,0 +1,${lines.length} @@`,
		...lines.map((line) => `+${line}`)
	].join('\n');

test('the value of a key in .env is found wherever it goes, and is not repeated', () => {
	const found = leaks(adding('src/notes.ts', `const client = create('${jevKey}');`), env);

	assert.deepEqual(found, [{ file: 'src/notes.ts', what: 'the value of TYPESAFE_API_KEY' }]);
	assert.ok(!JSON.stringify(found).includes(jevKey));
});

test('a key is known by its shape when .env does not have it', () => {
	const found = leaks(adding('README.md', `try it with ${openRouterKey}`), {});

	assert.deepEqual(found, [{ file: 'README.md', what: 'what looks like an OpenRouter key' }]);
});

test('.env.example keeps its keys empty, and .env stays out', () => {
	assert.deepEqual(leaks(adding('.env.example', 'TYPESAFE_API_KEY=anything'), {}), [
		{ file: '.env.example', what: 'a value for TYPESAFE_API_KEY, which belongs in .env' }
	]);
	assert.deepEqual(leaks(adding('.env', 'NOTHING=here'), {}), [
		{ file: '.env', what: 'the file the keys are kept in' }
	]);
});

test('what is no key goes through', () => {
	const harmless = [
		adding('.env.example', 'TYPESAFE_API_KEY=', '# OPENROUTER_MODEL=some/model'),
		// A setting from .env is no secret, and neither is a key that went away.
		adding('src/openrouter.ts', "const model = 'some/model-with-a-long-name';"),
		`diff --git a/old.ts b/old.ts\n--- a/old.ts\n+++ b/old.ts\n@@ -1 +0,0 @@\n-create('${jevKey}')`
	].join('\n');

	assert.deepEqual(leaks(harmless, env), []);
});
