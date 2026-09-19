import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Book } from './book.ts';
import { takeNotes } from './notes.ts';
import type { Handed, Taken } from './notes.ts';

const book: Book = {
	title: 'A Made-up Book',
	author: null,
	language: 'en',
	source: { file: 'made-up.epub', format: 'epub' },
	sections: [
		{ title: 'Contents', paragraphs: ['I. II.'] },
		{ title: 'I', paragraphs: ['Ana finds a map.', 'She hides it.'] },
		{ title: 'II', paragraphs: ['Ana follows the map.'] },
		{ title: 'III', paragraphs: ['Ana finds the well.'] }
	]
};

const usage = { tokensIn: 100, tokensOut: 50, tokensThinking: 0, usd: 0.01 };
const nothing = { characters: [], cast: [], threads: [] };

/** A model that answers from a script, a section at a time, and keeps what it was handed. */
function scripted(answers: Taken[]) {
	const handed: Handed[] = [];
	const ask = async (given: Handed) => {
		handed.push(structuredClone(given));
		const value = answers[handed.length - 1];
		assert.ok(value, 'the model was asked more than the script foresaw');
		return { value, usage };
	};
	return { handed, ask };
}

const script: Taken[] = [
	{
		...nothing,
		kind: 'apparatus',
		summary: 'A table of contents.',
		so_far: 'made up by the model'
	},
	{
		kind: 'story',
		summary: 'Ana finds a map and hides it.',
		characters: [{ name: 'Ana', change: 'She now has a map.' }],
		cast: [{ name: 'Ana', who: 'A girl who finds a map.' }],
		threads: [{ id: 'the-map', what: 'Where does the map lead?', status: 'opened', note: '…' }],
		so_far: 'Ana has found a map.'
	},
	{
		kind: 'story',
		summary: 'Ana follows the map.',
		characters: [{ name: 'Ana', change: 'No change.' }],
		cast: [{ name: 'Ana', who: 'A girl following a map.' }],
		threads: [
			{ id: 'the-map', what: 'Where does it lead?', status: 'closed', note: '…' },
			{ id: 'the-well', what: 'What is in the well?', status: 'advanced', note: '…' }
		],
		so_far: 'Ana has followed the map to a well.'
	}
];

test('each section is read in the light of the ones before', async () => {
	const { handed, ask } = scripted(script);

	const notes = await takeNotes(book, { ask, model: 'some/model', from: 0, to: 2, maxUsd: 1 });

	assert.deepEqual(handed[0], {
		so_far: '',
		cast: [],
		threads: [],
		section: { title: 'Contents', text: 'I. II.' }
	});
	// What stands around the work leaves the reader knowing what they knew.
	assert.equal(handed[1]?.so_far, '');
	assert.equal(handed[1]?.section.text, 'Ana finds a map.\n\nShe hides it.');
	assert.deepEqual(handed[2], {
		so_far: 'Ana has found a map.',
		cast: [{ name: 'Ana', who: 'A girl who finds a map.' }],
		threads: [{ id: 'the-map', what: 'Where does the map lead?' }],
		section: { title: 'II', text: 'Ana follows the map.' }
	});

	assert.deepEqual(
		notes.sections.map(({ index, kind, soFar }) => ({ index, kind, soFar })),
		[
			{ index: 0, kind: 'apparatus', soFar: '' },
			{ index: 1, kind: 'story', soFar: 'Ana has found a map.' },
			{ index: 2, kind: 'story', soFar: 'Ana has followed the map to a well.' }
		]
	);
	assert.deepEqual(notes.cast, [{ name: 'Ana', who: 'A girl following a map.', firstSeen: 1 }]);
	assert.deepEqual(notes.threads, [
		{ id: 'the-map', what: 'Where does the map lead?', opened: 1, closed: 2 },
		// Never said to open, so it opens where it first shows.
		{ id: 'the-well', what: 'What is in the well?', opened: 2, closed: null }
	]);
});

test('it stops when the money runs out, and goes on from there when run again', async () => {
	const first = scripted(script);
	const saved: number[] = [];

	const notes = await takeNotes(book, {
		ask: first.ask,
		model: 'some/model',
		from: 1,
		to: 3,
		maxUsd: 0.02,
		onSection: (all) => void saved.push(all.sections.length)
	});

	assert.deepEqual(
		notes.sections.map((section) => section.index),
		[1, 2]
	);
	assert.deepEqual(saved, [1, 2]);

	const second = scripted([
		{ ...nothing, kind: 'story', summary: 'The well.', so_far: 'The end.' }
	]);
	const whole = await takeNotes(book, {
		ask: second.ask,
		model: 'some/model',
		from: 1,
		to: 3,
		sofar: notes,
		maxUsd: 1
	});

	assert.equal(second.handed.length, 1);
	assert.equal(second.handed[0]?.section.title, 'III');
	assert.equal(whole.sections.length, 3);
});
