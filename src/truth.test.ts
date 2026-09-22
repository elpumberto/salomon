import assert from 'node:assert/strict';
import { test } from 'node:test';
import { agreement, band, facet, truth } from './truth.ts';

test('two orders the same way round agree in full, the other way round in full the other way', () => {
	const one = { a: 3, b: 2, c: 1 };
	assert.equal(agreement(one, { a: 30, b: 20, c: 10 }).tau, 1);
	assert.equal(agreement(one, { a: 1, b: 2, c: 3 }).tau, -1);
});

test('a tie on one side is neither for nor against, and counts in the scale', () => {
	// Of three pairs, one is tied in `other`: 2 pairs the same way of sqrt(3 * 2).
	const { tau } = agreement({ a: 3, b: 2, c: 1 }, { a: 2, b: 2, c: 1 });
	assert.equal(Number(tau.toFixed(4)), Number((2 / Math.sqrt(6)).toFixed(4)));
});

test('a book missing on either side is left out', () => {
	const { tau, books } = agreement({ a: 3, b: 2, c: 1, d: 0 }, { a: 1, b: 2, c: 3, d: null });
	assert.equal(books, 3);
	assert.equal(tau, -1);
});

test('the band holds the agreement and is the same every time', () => {
	const one = { a: 5, b: 4, c: 3, d: 2, e: 1, f: 0 };
	const other = { a: 5, b: 3, c: 4, d: 2, e: 0, f: 1 };
	const first = band(one, other, 200);
	const second = band(one, other, 200);
	assert.deepEqual(first, second);
	assert.ok(first.low <= first.tau && first.tau <= first.high);
});

test('the truth has every book with nine slots and a standing that is their mean', async () => {
	const known = await truth();
	assert.equal(Object.keys(known).length, 32);
	for (const one of Object.values(known)) {
		const values: number[] = Object.values(one.slots);
		assert.equal(values.length, 9);
		assert.equal(one.standing, Number((values.reduce((a, b) => a + b, 0) / 9).toFixed(3)));
	}
	assert.equal(known['don-quijote']?.standing, 1);
	assert.equal(facet(known['the-age-of-innocence']!, 'reach'), 0.333);
	assert.equal(known['irene-iddesleigh']?.facts.heldWorst, true);
	assert.equal(known['el-cocinero-de-su-majestad']?.counts.syllabi, 0);
});
