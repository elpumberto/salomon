import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Answer } from './judge.ts';
import { meritOf, readOf, value } from './value.ts';

const score = (at: number, of = 3): Answer => ({ score: at, of, confidence: 1, probabilities: [] });
const picked = (choice: string, others: Record<string, number> = {}): Answer => {
	const rest = Object.values(others).reduce((sum, one) => sum + one, 0);
	return { choice, confidence: 1, probabilities: { [choice]: 1 - rest, ...others } };
};

/** A piece well written and well told, by every question. */
const good: Record<string, Answer> = {
	overwritten: score(0),
	explains: score(0, 2),
	steers: score(0, 2),
	strings: score(0, 2),
	melodrama: { noul: 0 },
	padding: score(0),
	readymade: score(3),
	prose: score(3),
	voice: score(3),
	fine: { noul: 1 },
	phrasing: picked('apt'),
	figures: picked('true'),
	emotion: picked('earned'),
	insight: score(3),
	specific: score(3),
	talk: score(0, 4),
	open: { noul: 1 },
	friction: { noul: 1 },
	stakes: score(3),
	happens: score(3),
	feeling: score(3),
	effort: score(0),
	archaic: { noul: 0 },
	unclear: { noul: 0 },
	funny: score(0, 2)
};

test('a piece with no faults and every virtue is worth all, both ways', () => {
	assert.equal(meritOf(good), 1);
	assert.equal(readOf(good), 1);
});

test('writing that impresses counts for nothing where the wording is strained', () => {
	const purple = { ...good, phrasing: picked('strained'), overwritten: score(3) };

	const merit = meritOf(purple) ?? 1;

	// Prose, voice and "finely written" still say 1: the gate is what takes them out.
	assert.ok(merit < 0.6, `the purple piece came to ${merit}`);
	assert.ok(merit < (meritOf({ ...good, overwritten: score(3) }) ?? 0));
});

test('physical detail is not missed in a page of talk', () => {
	const talk = { ...good, talk: score(4, 4), specific: score(0) };
	const narration = { ...good, talk: score(0, 4), specific: score(0) };

	assert.equal(meritOf(talk), 1);
	assert.ok((meritOf(narration) ?? 1) < 1);
});

test('an option that says a question does not apply takes it out of the count', () => {
	assert.equal(meritOf({ ...good, figures: picked('none'), emotion: picked('slight') }), 1);
});

test('prose far from a reader of today counts against the read and not against the merit', () => {
	const old = { ...good, archaic: { noul: 1 }, effort: score(3) };

	assert.equal(meritOf(old), 1);
	assert.ok((readOf(old) ?? 1) < 1);
});

test('the merit of a book is its mean and its best tenth; its read counts the opening twice', () => {
	const dull = { ...good, prose: score(0), voice: score(0), fine: { noul: 0 }, open: { noul: 0 } };
	const pieces = [good, ...Array.from({ length: 9 }, () => dull)].map((answers) => ({ answers }));

	const valued = value(pieces);

	assert.equal(valued.pieces, 10);
	assert.equal(valued.merit.bestTenth, 1);
	assert.ok(valued.merit.value > valued.merit.mean);
	assert.ok(valued.read.value > valued.read.mean, 'the good piece is the opening');
	assert.equal(valued.pulse.length, 10);
	assert.deepEqual(valued.profile.phrasing, { apt: 1 });
});

test('the longest run of slack pieces is told', () => {
	const slack = {
		...good,
		open: { noul: 0 },
		friction: { noul: 0 },
		stakes: score(0),
		happens: score(0),
		feeling: score(0),
		effort: score(3)
	};
	const pieces = [good, slack, slack, slack, good, slack].map((answers) => ({ answers }));

	assert.equal(value(pieces).read.longestSlackRun, 3);
});
