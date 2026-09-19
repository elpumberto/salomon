import type { Answer } from '../../../src/judge.ts';
import { jevRecordsOf } from '../../../src/records.ts';
import type { JevRecord } from '../../../src/records.ts';
import { gated, plain, read, rules } from '../../../src/value.ts';
import { meritOf, value } from './passage-value.ts';
import { all, board, ladders } from './scoreboard.ts';
import type { Scores } from './scoreboard.ts';

/**
 * Every variant tried, by the one yardstick, from the records and asking nothing. And under each,
 * the questions that on their own put most pairs of books in order: which carry the signal.
 */

const variants = new Map<string, Record<string, JevRecord>>();
for (const slug of all) {
	for (const record of await jevRecordsOf(slug)) {
		const name = record.remarks?.match(/^Variant: ([^.]+)\./)?.[1];
		if (name) variants.set(name, { ...variants.get(name), [slug]: record });
	}
}

const mean = (values: number[]) => values.reduce((sum, one) => sum + one, 0) / (values.length || 1);
/** What an answer comes to from 0 to 1; a choice, by what each of its options is worth. */
function unit(answer: Answer | undefined, worth?: Record<string, number>): number | null {
	if (!answer) return null;
	if ('noul' in answer) return answer.noul;
	if ('score' in answer) return answer.score / answer.of;
	if (!worth) return null;
	return Object.entries(worth).reduce(
		(sum, [label, value]) => sum + value * (answer.probabilities[label] ?? 0),
		0
	);
}

// What the options of a choice are worth when a question is tried alone; `audience` is in no valuation.
const worth: Record<string, Record<string, number>> = {
	...rules.worth,
	audience: { children: 0.3, wide: 0, general: 0.5, literary: 1 }
};

let seed = 7;
const random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

console.log(
	`${'variant'.padEnd(34)}pairs in order  drawn again    passage beats passage  at 12,000 words a book  mean margin  parted  tokens a book   the questions that alone order most pairs`
);
const sized = (name: string) => Number(name.match(/at (\d+) words/)?.[1] ?? 0);
// The behavioural questions are valued two ways, and each has its row.
type Row = [string, Record<string, JevRecord>, ((answers: Record<string, Answer>) => number)?];
const rows = [...variants]
	.filter(([name]) => /^(gut|passage) /.test(name))
	.sort(
		([one], [other]) =>
			(one.localeCompare(other.slice(0, 3)) && one.slice(0, 3).localeCompare(other.slice(0, 3))) ||
			sized(one) - sized(other)
	)
	.flatMap(([name, books]): Row[] =>
		name.startsWith('gut')
			? [
					[name, books, plain],
					[`${name}, gated`, books, gated]
				]
			: [[name, books]]
	);
for (const [name, books, way] of rows) {
	const scores: Scores = {};
	const ids = Object.keys(Object.values(books)[0]?.by.asked ?? {});
	const alone: Record<string, Scores> = Object.fromEntries(ids.map((id) => [id, {}]));
	for (const [slug, record] of Object.entries(books)) {
		const of = (id: string) =>
			mean(record.found.flatMap((one) => unit(one.answers[id], worth[id]) ?? []));
		if (way) {
			scores[slug] = {
				merit: mean(record.found.map((one) => way(one.answers))),
				read: mean(record.found.map((one) => read(one.answers)))
			};
		} else {
			const valued = value(record.found);
			scores[slug] = { merit: valued.merit.value, read: valued.read.mean };
		}
		for (const id of ids) (alone[id] ??= {})[slug] = { merit: of(id) };
	}
	const { pairs, inOrder, margin, parted } = board(scores);
	// The same with the twelve passages of each book drawn again, 500 times: what is owed to the draw.
	const piece = way ?? ((answers: Record<string, Answer>) => meritOf(answers) ?? 0);
	const draws = Array.from({ length: 500 }, () => {
		const drawn: Scores = {};
		for (const [slug, record] of Object.entries(books)) {
			const values = record.found.map((one) => piece(one.answers));
			drawn[slug] = {
				merit: mean(values.map(() => values[Math.floor(random() * values.length)] ?? 0))
			};
		}
		return board(drawn).inOrder;
	}).sort((one, other) => one - other);
	// How often one passage of the higher book of a pair comes out over one passage of the lower: it
	// does not hang on the scale of the scores, and tells ways apart that order all the pairs alike.
	const beats: number[] = [];
	for (const ladder of ladders) {
		for (let high = 0; high < ladder.length; high++) {
			for (let low = high + 1; low < ladder.length; low++) {
				const [ones, others] = [ladder[high], ladder[low]].map((slug) =>
					(books[slug ?? '']?.found ?? []).map((one) => piece(one.answers))
				);
				if (!ones?.length || !others?.length) continue;
				const wins = ones.flatMap((one) =>
					others.map((other) => (one > other ? 1 : one === other ? 0.5 : 0))
				);
				beats.push(mean(wins));
			}
		}
	}
	// The same reading for all: as many passages as come to 12,000 words a book, drawn 500 times.
	const size = Number(name.match(/at (\d+) words/)?.[1] ?? 1000);
	const count = Math.min(12, Math.max(1, Math.round(12_000 / size)));
	const sameReading = Array.from({ length: 500 }, () => {
		const drawn: Scores = {};
		for (const [slug, record] of Object.entries(books)) {
			const values = record.found.map((one) => piece(one.answers));
			drawn[slug] = {
				merit: mean(
					Array.from({ length: count }, () => values[Math.floor(random() * values.length)] ?? 0)
				)
			};
		}
		return board(drawn).inOrder;
	});
	const tokens = mean(Object.values(books).map((record) => record.took.tokensIn));
	// A fault orders the books the other way round: it is counted by the pairs it puts in order either way.
	const single = ids
		.filter((id) => Object.values(alone[id] ?? {}).some((one) => one.merit > 0))
		.map((id) => {
			const straight = board(alone[id] ?? {}).inOrder;
			return [id, Math.max(straight, pairs - straight), straight < pairs - straight] as const;
		})
		.sort((one, other) => other[1] - one[1])
		.slice(0, 7)
		.map(([id, count, fault]) => `${fault ? '−' : ''}${id} ${count}`)
		.join(', ');
	console.log(
		`${name.padEnd(34)}${`${inOrder} of ${pairs}`.padEnd(16)}${`${mean(draws).toFixed(1)} (${draws[24]}–${draws[474]})`.padEnd(15)}${mean(beats).toFixed(3).padEnd(23)}${`${mean(sameReading).toFixed(1)} with ${count}`.padEnd(24)}${String(margin).padEnd(13)}${`${parted} of 7`.padEnd(8)}${Math.round(tokens).toLocaleString('en-US').padEnd(16)}${single}`
	);
}
