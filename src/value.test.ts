import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Answer } from './judge.ts';
import { gated, plain, read, rulesHash, value } from './value.ts';

const score = (at: number, of: number): Answer => ({
	score: at,
	of,
	confidence: 1,
	probabilities: []
});
const picked = (choice: string): Answer => ({
	choice,
	confidence: 1,
	probabilities: { [choice]: 1 }
});

/** A passage that every answer holds at its best but for how sure the teacher is that it is what not to do. */
const passage = (warning: number, lesson = 1): Record<string, Answer> => ({
	underline: score(3, 3),
	draft: picked('finished'),
	editor: picked('leave'),
	memory: picked('image'),
	anyone: score(2, 2),
	lesson: { noul: lesson },
	again: { noul: 1 },
	aloud: { noul: 1 },
	warning: { noul: warning },
	lost: score(2, 2),
	stop: { noul: 1 },
	skip: score(0, 2),
	audience: picked('literary')
});

test('merit is the mean of nine answers, the teacher’s warning the other way round', () => {
	assert.equal(plain(passage(0)), 1);
	assert.equal(plain(passage(1)), 8 / 9);
	assert.equal(plain({ ...passage(0), draft: picked('worked') }), (8 + 0.6) / 9);
});

test('up to half sure that it is what not to do, nothing is taken from a passage', () => {
	assert.equal(gated(passage(0.2)), plain(passage(0.2)));
	assert.equal(gated(passage(0.5)), plain(passage(0.5)));
});

test('past that, what ornament takes in counts for less, and for nothing when certain', () => {
	const overdone = passage(1, 0.3);
	// Of the nine, the editor and the example to learn from are left, and the warning counts for nothing.
	assert.ok(Math.abs(gated(overdone) - (1 + 0.3) / 9) < 1e-9);
	assert.ok(plain(overdone) > 0.8);
	assert.ok(gated(passage(0.75)) < plain(passage(0.75)));
	assert.ok(gated(passage(0.75)) > gated(passage(1)));
});

test('the read is whether a reader is taken in and goes on, and does not skip', () => {
	assert.equal(read(passage(0)), 1);
	assert.equal(read({ ...passage(0), skip: score(2, 2) }), 2 / 3);
});

test('a book is the mean of its passages, with how far apart they are and what judges nothing', () => {
	const valued = value([{ answers: passage(0) }, { answers: passage(1, 0.3) }]);
	assert.equal(valued.passages, 2);
	assert.equal(valued.merit.highest, 1);
	assert.equal(valued.merit.lowest, Number(((1 + 0.3) / 9).toFixed(4)));
	assert.ok(valued.merit.value < valued.merit.plain);
	assert.deepEqual(valued.profile.writtenFor, { literary: 1 });
	assert.equal(valued.profile.whatNotToDo, 0.5);
	assert.equal(valued.pulse.length, 2);
});

test('the rules are those the books were checked with: changing them is another valuation', () => {
	assert.equal(rulesHash, 'sha256:f3e3051dc2bd');
});
