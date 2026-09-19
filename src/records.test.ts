import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { keep } from './records.ts';
import type { NotesRecord } from './records.ts';

const record = (
	model: string,
	usd: number,
	routing?: NotesRecord['by']['routing']
): NotesRecord => ({
	kind: 'notes',
	at: '2026-01-02T03:04:05.678Z',
	book: {
		title: 'A Made-up Book',
		author: null,
		language: 'en',
		source: { file: 'A Made-up Book.epub', format: 'epub', sha256: 'aa' },
		text: { sha256: 'bb', sections: 1, words: 1 }
	},
	sections: { from: 1, to: 1 },
	by: {
		model,
		through: 'OpenRouter',
		...(routing ? { routing } : {}),
		providers: {},
		rules: 'sha256:cc',
		code: { commit: null, dirty: false }
	},
	took: { calls: 1, tokensIn: 1, tokensOut: 1, tokensThinking: 0, usd, seconds: 1 },
	found: {
		story: 1,
		apparatus: 0,
		people: 0,
		threads: 0,
		threadsLeftOpen: 0,
		notes: { sha256: 'dd' }
	}
});

test('runs set off in the same second keep a record each, and a run keeps one', async () => {
	const base = await mkdtemp(join(tmpdir(), 'salomon-records-'));

	const first = await keep(record('some/model-1.5', 0.01), base);
	const other = await keep(record('other/model', 0.02), base);
	// The same model in the same second, sent to other providers, is another run.
	const routed = await keep(record('some/model-1.5', 0.03, { sort: 'price' }), base);
	// The same run, written again as it goes on.
	const again = await keep(record('some/model-1.5', 0.04), base);

	assert.equal(first, 'records/books/a-made-up-book/20260102T030405Z.notes.some-model-1.5.json');
	assert.equal(other, 'records/books/a-made-up-book/20260102T030405Z.notes.other-model.json');
	assert.equal(routed, 'records/books/a-made-up-book/20260102T030405Z.notes.some-model-1.5.2.json');
	assert.equal(again, first);
	assert.equal((await readdir(join(base, 'records/books/a-made-up-book'))).length, 3);
	assert.equal(JSON.parse(await readFile(join(base, first), 'utf8')).took.usd, 0.04);
});
