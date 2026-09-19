import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { noul, score } from '@typesafe-ai/sdk';
import { gathered } from './book.ts';
import type { Book } from './book.ts';
import { across, judge, measure, name, pieces, together, whole } from './judge.ts';
import type { AskJev } from './judge.ts';
import { rulesHash } from './questions.ts';
import { jevRecord, keep } from './records.ts';

const book: Book = {
	title: 'A Made-up Book',
	author: null,
	language: 'en',
	source: { file: 'A Made-up Book.epub', format: 'epub' },
	sections: [
		{ title: 'I', paragraphs: ['Ana found a map. She hid it.', '“Whose is it?” said Luis.'] },
		{ title: 'II', paragraphs: ['x'.repeat(200_000)] }
	]
};

const questions = {
	pace: score('How much happens?', ['Nothing', 'Something', 'A lot']),
	map: noul('Is there a map?')
};

/** A Jev that says the same of whatever it is sent, and keeps what that was. */
function scripted() {
	const asked: Parameters<AskJev>[0][] = [];
	const ask: AskJev = async (request) => {
		asked.push(request);
		return {
			model: 'jev-0.0.0',
			usage: { input_tokens: 120, output_tokens: 9 },
			answers: {
				pace: {
					type: 'score',
					score: 1.123456,
					confidence: 0.61,
					legend: { 0: 'Nothing', 1: 'Something', 2: 'A lot' },
					probabilities: { 2: 0.2, 0: 0.1, 1: 0.7 }
				},
				map: { type: 'noul', noul: 0.98765 }
			}
		};
	};
	return { ask, asked };
}

test('Jev is sent the chapter under its name, and its answers are kept as numbers alone', async () => {
	const { ask, asked } = scripted();

	const judged = await judge(whole(book, 0), questions, ask);

	assert.deepEqual(asked[0]?.state, {
		chapter: 'I\n\nAna found a map. She hid it.\n\n“Whose is it?” said Luis.'
	});
	assert.equal(asked[0]?.questions, questions);
	assert.deepEqual(judged.answers, {
		pace: { score: 1.1235, of: 2, confidence: 0.61, probabilities: [0.1, 0.7, 0.2] },
		map: { noul: 0.9877 }
	});
	assert.equal(judged.section, 1);
	assert.equal(judged.tokensIn, 120);
});

test('what code can measure of a chapter goes beside what Jev says of it', () => {
	const [first] = book.sections;
	assert.ok(first);

	assert.deepEqual(measure(first.paragraphs, true), {
		words: 12,
		spoken: 0.26,
		wordsPerSentence: 4
	});
	// A book with no quotation marks of that kind says nothing of how much of it is spoken.
	assert.equal(measure(first.paragraphs, false).spoken, null);
});

test('a section is cut in pieces where a paragraph ends, and sections in a row go as one text', () => {
	const long: Book = {
		...book,
		sections: [
			{ title: 'I', paragraphs: ['one two three', 'four five six', 'seven eight nine', 'ten'] },
			{ title: 'II', paragraphs: ['eleven'] }
		]
	};

	const cut = pieces(long, 0, 5);

	assert.deepEqual(
		cut.map((one) => one.state.chapter),
		['one two three\n\nfour five six', 'seven eight nine\n\nten']
	);
	assert.deepEqual(cut.map(name), ['§1 1/2', '§1 2/2']);
	const both = together(long, 0, 1);
	assert.equal(name(both), '§1–2');
	assert.ok(both.state.chapter?.endsWith('ten\n\nII\n\neleven'));
});

test('sections of a few lines each are cut as one text', () => {
	const paper: Book = {
		...book,
		sections: ['one two', 'three four', 'five six', 'seven eight'].map((text, at) => ({
			title: `HEADLINE ${at}`,
			paragraphs: [text]
		}))
	};

	const cut = across(paper, [0, 1, 2, 3], 4);

	assert.deepEqual(
		cut.map((one) => one.state.chapter),
		['one two\n\nthree four', 'five six\n\nseven eight']
	);
	assert.deepEqual(cut.map(name), ['§1 1/2', '§3 2/2']);
});

test('sections of a few lines are gathered into ones of some length, their titles kept in the text', () => {
	const section = (title: string, text: string) => ({ title, paragraphs: [text] });
	const paper: Book = {
		...book,
		sections: [
			section('ONE', 'a b c'),
			section('TWO', 'd e'),
			section('THREE', 'f'),
			section('A LONG ONE', 'g h i j k l'),
			section('FOUR', 'm')
		]
	};

	const { sections } = gathered(paper, 5);

	assert.deepEqual(sections, [
		{ title: 'ONE', paragraphs: ['a b c', 'TWO', 'd e', 'THREE', 'f'] },
		section('A LONG ONE', 'g h i j k l'),
		section('FOUR', 'm')
	]);
});

test('a section that does not fit in a call is not sent', async () => {
	const { ask, asked } = scripted();

	await assert.rejects(judge(whole(book, 1), questions, ask), /more than fits in one call/);
	assert.equal(asked.length, 0);
});

test('the record of a judgment says what was asked in full, and nothing of the book', async () => {
	const { ask } = scripted();
	const base = await mkdtemp(join(tmpdir(), 'salomon-records-'));
	const identity = {
		title: book.title,
		author: null,
		language: 'en',
		source: { ...book.source, sha256: 'aa' },
		text: { sha256: 'bb', sections: 2, words: 12 }
	};

	const record = jevRecord(
		identity,
		'2026-01-02T03:04:05.678Z',
		{ questions: 'made-up', rules: rulesHash(questions), asked: questions },
		[await judge(whole(book, 0), questions, ask)]
	);
	const path = await keep(record, base);

	assert.equal(path, 'records/books/a-made-up-book/20260102T030405Z.jev.jev-0.0.0.json');
	const written = await readFile(join(base, path), 'utf8');
	assert.deepEqual(JSON.parse(written).by.asked, JSON.parse(JSON.stringify(questions)));
	assert.deepEqual(JSON.parse(written).took, {
		calls: 1,
		tokensIn: 120,
		usd: 0.000005,
		seconds: 0
	});
	assert.ok(!written.includes('Ana'));
});
