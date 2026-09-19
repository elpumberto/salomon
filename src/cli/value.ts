import { rulesHash, sets } from '../questions.ts';
import { isValuation, jevRecordsOf, recorded } from '../records.ts';
import { value, way } from '../value.ts';

/**
 * What the books judged so far are worth by the rules of `src/value.ts`, from the records of what
 * Jev said of them and asking it nothing: of each book, the last time it was judged the way books
 * are valued with the questions as they now stand. With the slug of a book, that book in full,
 * its profile and its pulse too.
 */

const [only] = process.argv.slice(2);
const asked = rulesHash(sets[way.questions]);
const two = (one: number) => one.toFixed(2);
/** The option Jev held likeliest over the passages, and how likely. */
const leading = (shares: Record<string, number>) => {
	const [label = '—', share = 0] = Object.entries(shares).sort(([, a], [, b]) => b - a)[0] ?? [];
	return `${label} ${two(share)}`;
};

const rows: string[][] = [];
for (const slug of await recorded()) {
	if (only && slug !== only) continue;
	const judged = (await jevRecordsOf(slug)).findLast(
		(one) => one.by.rules === asked && isValuation(one)
	);
	if (!judged) continue;
	const valued = value(judged.found);
	const { merit, read, profile } = valued;
	rows.push([
		slug,
		two(merit.value),
		two(read.value),
		two(merit.plain),
		`${two(merit.lowest)}–${two(merit.highest)}`,
		two(profile.toLearnFrom),
		two(profile.whatNotToDo),
		leading(profile.readsLike),
		leading(profile.writtenFor)
	]);
	if (only) console.dir(valued, { depth: 4 });
}

const head = [
	'',
	'MERIT',
	'READ',
	'merit, plain',
	'its passages',
	'to learn from',
	'what not to do',
	'reads like',
	'written for'
];
rows.sort((one, other) => Number(other[1]) - Number(one[1]));
for (const row of [head, ...rows]) {
	console.log(row.map((cell, at) => cell.padEnd(at === 0 ? 34 : 16)).join(''));
}
