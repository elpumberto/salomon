import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Book } from './book.ts';
import { castBefore, open, reviewThreads, takeNotes, took } from './notes.ts';
import type { Ask, Call } from './notes.ts';

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

/** A model that answers each kind of question from a script, in order, and keeps what it was asked. */
function scripted(answers: Record<string, unknown[]>) {
	const asked: Call[] = [];
	const ask: Ask = async (call) => {
		asked.push(structuredClone(call));
		const value = answers[call.schema.name]?.shift();
		assert.ok(value, `the script has no more answers for ${call.schema.name}`);
		return { value, usage, provider: 'SomeCloud' };
	};
	const handed = (name: string) =>
		asked.filter((call) => call.schema.name === name).map((call) => call.user as any);
	return { ask, handed };
}

const sections = [
	{ ...nothing, kind: 'apparatus', summary: 'A table of contents.' },
	{
		kind: 'story',
		summary: 'Ana finds a map and hides it.',
		characters: [{ name: 'Ana', change: 'She now has a map.' }],
		cast: [{ name: 'Ana', who: 'A girl who finds a map.' }],
		threads: [{ id: 'the-map', what: 'Where does the map lead?', status: 'opened', note: '…' }]
	},
	{
		kind: 'story',
		summary: 'Ana follows the map.',
		characters: [{ name: 'Ana', change: 'No change.' }],
		cast: [{ name: 'Ana', who: 'A girl following a map.' }],
		threads: [
			{ id: 'the-map', what: 'Where does it lead?', status: 'closed', note: '…' },
			{ id: 'the-well', what: 'What is in the well?', status: 'advanced', note: '…' }
		]
	}
];

test('each section is read in the light of the ones before', async () => {
	const { ask, handed } = scripted({
		section_notes: [...sections],
		so_far: [{ so_far: 'Ana has found a map.' }, { so_far: 'Ana has followed the map to a well.' }]
	});

	const notes = await takeNotes(book, { ask, model: 'some/model', from: 0, to: 2, maxUsd: 1 });

	const [contents, first, second] = handed('section_notes');
	assert.deepEqual(contents, {
		so_far: '',
		cast: [],
		threads: [],
		section: { title: 'Contents', text: 'I. II.' }
	});
	// What stands around the work leaves the reader knowing what they knew, and asks for no synopsis.
	assert.equal(first.so_far, '');
	assert.equal(first.section.text, 'Ana finds a map.\n\nShe hides it.');
	assert.deepEqual(second, {
		so_far: 'Ana has found a map.',
		cast: [{ name: 'Ana', who: 'A girl who finds a map.' }],
		threads: [{ id: 'the-map', what: 'Where does the map lead?' }],
		section: { title: 'II', text: 'Ana follows the map.' }
	});
	// The synopsis is made from the one before and what the section's notes say happens.
	assert.deepEqual(handed('so_far')[1], {
		so_far: 'Ana has found a map.',
		section: { title: 'II', summary: 'Ana follows the map.' }
	});

	assert.deepEqual(
		notes.sections.map(({ index, kind, soFar, calls }) => ({ index, kind, soFar, calls })),
		[
			{ index: 0, kind: 'apparatus', soFar: '', calls: 1 },
			{ index: 1, kind: 'story', soFar: 'Ana has found a map.', calls: 2 },
			{ index: 2, kind: 'story', soFar: 'Ana has followed the map to a well.', calls: 2 }
		]
	);
	assert.deepEqual(notes.cast, [{ name: 'Ana', who: 'A girl following a map.', firstSeen: 1 }]);
	// On reaching the second chapter a reader knows Ana as the first left her.
	assert.deepEqual(castBefore(notes, 2), [{ name: 'Ana', who: 'A girl who finds a map.' }]);
	assert.deepEqual(notes.threads, [
		{ id: 'the-map', what: 'Where does the map lead?', opened: 1, closed: 2 },
		// Never said to open, so it opens where it first shows.
		{ id: 'the-well', what: 'What is in the well?', opened: 2, closed: null }
	]);
	assert.deepEqual(took(notes), {
		usage: { tokensIn: 500, tokensOut: 250, tokensThinking: 0, usd: 0.05 },
		seconds: 0,
		calls: 5,
		providers: ['SomeCloud']
	});
});

test('a synopsis that runs long, or lets the story go, is asked for again', async () => {
	const long = Array(400).fill('word').join(' ');
	const held = Array(200).fill('held').join(' ');
	const { ask, handed } = scripted({
		section_notes: [sections[1], sections[2]],
		so_far: [
			{ so_far: long },
			{ so_far: held },
			{ so_far: 'Only the last chapter.' },
			{ so_far: held }
		]
	});

	const notes = await takeNotes(book, { ask, model: 'some/model', from: 1, to: 2, maxUsd: 1 });

	assert.deepEqual(
		notes.sections.map(({ soFar, calls }) => ({ soFar, calls })),
		[
			{ soFar: held, calls: 3 },
			{ soFar: held, calls: 3 }
		]
	);
	// What ran long goes back as a draft to cut down.
	assert.match(handed('so_far')[1].problem, /has 400 words/);
	assert.equal(handed('so_far')[1].draft, long);
	assert.match(handed('so_far')[3].problem, /let go of most of the story/);
	assert.equal(handed('so_far')[3].draft, undefined);
});

test('a synopsis that had run long is brought back to its length, not taken for one that let go', async () => {
	const overgrown = Array(520).fill('long').join(' ');
	const right = Array(240).fill('right').join(' ');
	const first = scripted({
		section_notes: [sections[1]],
		so_far: [{ so_far: overgrown }, { so_far: overgrown }, { so_far: overgrown }]
	});
	const notes = await takeNotes(book, {
		ask: first.ask,
		model: 'some/model',
		from: 1,
		to: 1,
		maxUsd: 1
	});
	assert.equal(notes.sections[0]?.soFar, overgrown);

	const second = scripted({ section_notes: [sections[2]], so_far: [{ so_far: right }] });
	await takeNotes(book, {
		ask: second.ask,
		model: 'some/model',
		from: 1,
		to: 2,
		sofar: notes,
		maxUsd: 1
	});

	assert.deepEqual(
		notes.sections.map(({ soFar, calls }) => ({ words: soFar.split(' ').length, calls })),
		[
			{ words: 520, calls: 4 },
			{ words: 240, calls: 2 }
		]
	);
});

test('it stops when the money runs out, and goes on from there when run again', async () => {
	const first = scripted({
		section_notes: [...sections],
		so_far: [{ so_far: 'One.' }, { so_far: 'Two.' }]
	});
	const saved: number[] = [];

	// A cent a call: the contents take one and the first chapter two.
	const notes = await takeNotes(book, {
		ask: first.ask,
		model: 'some/model',
		from: 0,
		to: 3,
		maxUsd: 0.03,
		onSection: (all) => void saved.push(all.sections.length)
	});

	assert.deepEqual(saved, [1, 2]);

	const second = scripted({
		section_notes: [sections[2], { ...nothing, kind: 'story', summary: 'The well.' }],
		so_far: [{ so_far: 'Three.' }, { so_far: 'The end.' }]
	});
	const whole = await takeNotes(book, {
		ask: second.ask,
		model: 'some/model',
		from: 0,
		to: 3,
		sofar: notes,
		maxUsd: 1
	});

	assert.deepEqual(
		second.handed('section_notes').map((user) => user.section.title),
		['II', 'III']
	);
	assert.equal(whole.sections.length, 4);
});

test('the threads left open are looked at again with the whole book in view', async () => {
	const reading = scripted({
		section_notes: [
			{
				...sections[1],
				threads: [
					{ id: 'the-map', what: 'Where does the map lead?', status: 'opened', note: '…' },
					{ id: 'a-tale', what: 'Ana will tell a tale.', status: 'opened', note: '…' },
					{ id: 'the-well', what: 'What is in the well?', status: 'opened', note: '…' }
				]
			},
			{ ...nothing, kind: 'story', summary: 'Ana follows the map to a well.' }
		],
		so_far: [{ so_far: 'One.' }, { so_far: 'Two.' }]
	});
	const notes = await takeNotes(book, {
		ask: reading.ask,
		model: 'some/model',
		from: 1,
		to: 2,
		maxUsd: 1
	});
	assert.equal(open(notes).length, 3);

	const { ask, handed } = scripted({
		threads_review: [
			{
				threads: [
					{ id: 'the-map', verdict: 'settled', section: 3, note: 'It leads to a well.' },
					{ id: 'a-tale', verdict: 'not_a_thread', section: 0, note: 'The premise.' },
					{ id: 'the-well', verdict: 'open', section: 0, note: 'Never said.' }
				]
			}
		]
	});
	await reviewThreads(notes, ask);

	assert.deepEqual(handed('threads_review')[0].outline, [
		{ section: 2, title: 'I', summary: 'Ana finds a map and hides it.' },
		{ section: 3, title: 'II', summary: 'Ana follows the map to a well.' }
	]);
	assert.deepEqual(
		notes.threads.map(({ id, closed }) => ({ id, closed })),
		[
			{ id: 'the-map', closed: 2 },
			{ id: 'a-tale', closed: null },
			{ id: 'the-well', closed: null }
		]
	);
	// What the book leaves unanswered is the one question that was one.
	assert.deepEqual(
		open(notes).map((thread) => thread.id),
		['the-well']
	);
	assert.equal(took(notes).calls, 5);

	// Once is enough: a second look asks nothing.
	await reviewThreads(notes, scripted({}).ask);
});
