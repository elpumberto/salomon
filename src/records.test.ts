import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { Book } from './book.ts';
import { identify, isValuation, jevRecord, jevRecordsOf, keep, recorded } from './records.ts';
import type { JevRecord, NotesRecord } from './records.ts';

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

test("of somebody's book the record keeps the text's hash, and nothing of the file", async () => {
	const base = await mkdtemp(join(tmpdir(), 'salomon-records-'));
	const book = (file: string): Book => ({
		title: 'A Book of Today',
		author: 'Someone Living',
		language: 'en',
		source: { file, format: 'epub' },
		sections: [{ title: 'I', paragraphs: ['It begins.'] }]
	});
	const mine = join(base, 'Someone Living - A Book of Today (from my reader).epub');
	const listed = join(base, 'king-solomons-mines.epub');
	await writeFile(mine, 'not really an epub');
	await writeFile(listed, 'not really an epub');

	const private_ = await identify(
		mine,
		book('Someone Living - A Book of Today (from my reader).epub')
	);
	const public_ = await identify(listed, book('king-solomons-mines.epub'));

	assert.deepEqual(private_.source, { format: 'epub' });
	assert.equal(private_.text.sha256, public_.text.sha256);
	assert.equal(public_.source.file, 'king-solomons-mines.epub');
	assert.ok(public_.source.sha256);
	const kept = await keep({ ...record('some/model', 0.01), book: private_ }, base);
	assert.ok(kept.startsWith('records/books/a-book-of-today/'), kept);
	assert.ok(!(await readFile(join(base, kept), 'utf8')).includes('from my reader'));
});

test('a record says what the run was for, and an older one is told by its remarks', async () => {
	const identity = record('any', 0).book;
	const made = (purpose?: JevRecord['purpose']) =>
		jevRecord(
			identity,
			'2026-01-02T03:04:05.678Z',
			{ questions: 'gut', rules: 'sha256:ee', asked: {} },
			[],
			purpose
		);
	assert.equal(made().purpose, 'experiment');
	assert.ok(isValuation(made('valuation')));
	assert.ok(!isValuation(made()));

	const { purpose, ...older } = made();
	assert.ok(isValuation({ ...older, remarks: 'Variant: gut at 3000 words. Twelve passages.' }));
	assert.ok(isValuation({ ...older, remarks: 'Check: the book in pieces of about 1,000 words.' }));
	assert.ok(!isValuation({ ...older, remarks: 'Variant: gut at 1000 words. Twelve passages.' }));
	assert.ok(!isValuation({ ...older, remarks: 'Tuning of the passage questions.' }));
	assert.ok(!isValuation(older));

	const base = await mkdtemp(join(tmpdir(), 'salomon-records-'));
	await keep(record('some/model', 0.01), base);
	await keep(made('valuation'), base);
	assert.deepEqual(await recorded(base), ['a-made-up-book']);
	assert.deepEqual(
		(await jevRecordsOf('a-made-up-book', base)).map((one) => one.purpose),
		['valuation']
	);
});
