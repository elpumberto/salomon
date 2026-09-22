import { choice } from '@typesafe-ai/sdk';
import { tokens, usd } from '../../../src/estimate.ts';
import { measure } from '../../../src/judge.ts';
import type { Passage } from '../../../src/judge.ts';
import { jevRecordsOf } from '../../../src/records.ts';
import { truth } from '../../../src/truth.ts';
import { judgedPassages } from './judged.ts';
import { runBook } from './run.ts';

/**
 * Comparing instead of scoring: two passages of two books side by side, and which is the better
 * written, which a teacher would take, which most readers would enjoy. A scale of absolute
 * questions has a ceiling, and the well written books crowd under it; a comparison has none. Every
 * pair of the thirty-two books, two pairs of their judged passages each, both ways round to undo
 * Jev's leaning to the first: 496 × 2 × 2 calls. What each book wins is turned into a strength
 * (`compare-board.ts`) and set against the standing by the yardstick of `src/truth.ts`.
 *
 * Said before any was asked, 2026-09-22: the comparison earns its place if its order agrees with
 * the standing at least as well as merit does, 0.61, and better among the twenty books of the top
 * floor, where merit stands at 0.50; and if Ulysses, third by standing and twenty-fourth by
 * merit, comes into the top ten. Agreement under 0.55 says a comparison sees no more than the
 * scale did.
 *
 *   node experiments/books/jev/compare.ts [--go]
 *
 * Shows the cost and sends nothing without `--go`. A run that breaks goes on from where it was:
 * what was asked is in the records, under the book of the first passage, the other named in
 * `variant`.
 */

const go = process.argv.includes('--go');
const pair = '`first` and `second` are passages of two novels, of some 3,000 words each. ';
const either = { first: 'The passage in `first`', second: 'The passage in `second`' };
export const questions = {
	better: choice(`${pair}Which of the two is the better written?`, either),
	lesson: choice(
		`${pair}Which of the two would a teacher of writing rather give to a class as an example to learn from?`,
		either
	),
	enjoy: choice(`${pair}Which of the two would most readers enjoy reading more?`, either)
};
export const set = 'compare';
export const remarks =
	'Variant: compare. Passages of two books side by side, both ways round: which is better written, which a teacher would take, which readers would enjoy.';

const known = await truth();
const judged = await judgedPassages();
const slugs = Object.keys(judged).sort();

// The same pairs of passages every time, so that a run can go on from where it broke.
let seed = 20260922;
const random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = (count: number) => Math.floor(random() * count);

interface Match {
	one: string;
	other: string;
	at: number;
	from: number;
}
const matches: Match[] = [];
for (let a = 0; a < slugs.length; a++) {
	for (let b = a + 1; b < slugs.length; b++) {
		const [one, other] = [slugs[a]!, slugs[b]!];
		for (let round = 0; round < 2; round++) {
			matches.push({
				one,
				other,
				at: pick(judged[one]!.passages.length),
				from: pick(judged[other]!.passages.length)
			});
		}
	}
}

/** Which book stands first in the state, and against which passage of which other. */
const variant = (other: string, from: number, side: 'first' | 'second') =>
	`${side}, against passage ${from + 1} of ${other}`;

// What was asked already, by the book that stood first and the variant.
const done = new Map<string, Set<string>>();
for (const slug of slugs) {
	const mine = new Set<string>();
	for (const record of await jevRecordsOf(slug)) {
		if (record.by.questions !== set) continue;
		for (const one of record.found) if (one.variant) mine.add(`${one.section}:${one.variant}`);
	}
	done.set(slug, mine);
}

// Each call is kept under the book whose passage is `first`: the calls of a book, gathered.
const calls = new Map<string, Passage[]>();
let size = 0;
for (const { one, other, at, from } of matches) {
	for (const [first, second, mineAt, theirsAt] of [
		[one, other, at, from],
		[other, one, from, at]
	] as const) {
		const mine = judged[first]!.passages[mineAt]!;
		const theirs = judged[second]!.passages[theirsAt]!;
		const tag = variant(second, theirsAt, 'first');
		if (done.get(first)?.has(`${mine.section}:${tag}`)) continue;
		const state = { first: mine.state.chapter ?? '', second: theirs.state.chapter ?? '' };
		size += tokens(JSON.stringify(state).length);
		calls.set(first, [
			...(calls.get(first) ?? []),
			{
				section: mine.section,
				...(mine.piece ? { piece: mine.piece } : {}),
				variant: tag,
				state,
				measured: measure([state.first], true)
			}
		]);
	}
}
const count = [...calls.values()].reduce((sum, list) => sum + list.length, 0);
console.log(
	`${slugs.length} books, ${matches.length} matches, ${count} calls still to make of ${matches.length * 2}, some ${size.toLocaleString('en-US')} tokens: about $${usd(size).toFixed(2)}`
);
if (!go) {
	console.log('Nothing was sent to Jev. With --go, it is.');
	process.exit(0);
}

for (const slug of slugs) {
	const mine = calls.get(slug);
	if (!mine?.length) continue;
	const { path, book } = judged[slug]!;
	await runBook(path, book, () => mine, { set, questions }, remarks);
}
