import { rulesHash, sets } from '../questions.ts';
import { isValuation, jevRecordsOf, recorded } from '../records.ts';
import { agreement, band, slots, truth } from '../truth.ts';
import { value, way } from '../value.ts';

/**
 * What is known of the books from outside, beside what Salomón made of them, and how far the two
 * orders agree: merit against standing, the read against what readers say. Asks nothing; reads
 * `truth/` and the records.
 */

const known = await truth();
const asked = rulesHash(sets[way.questions]);
const two = (one: number | null | undefined) => (one == null ? '—' : one.toFixed(2));

const merit: Record<string, number> = {};
const plain: Record<string, number> = {};
const read: Record<string, number> = {};
for (const slug of await recorded()) {
	const judged = (await jevRecordsOf(slug)).findLast(
		(one) => one.by.rules === asked && isValuation(one)
	);
	if (!judged || !known[slug]) continue;
	const valued = value(judged.found);
	merit[slug] = valued.merit.value;
	plain[slug] = valued.merit.plain;
	read[slug] = valued.read.value;
}

const standing = Object.fromEntries(
	Object.entries(known).map(([slug, one]) => [slug, one.standing])
);
const goodreads = Object.fromEntries(
	Object.entries(known).map(([slug, one]) => [slug, one.enjoyment.goodreads?.rating ?? null])
);

const head = [
	'',
	'STANDING',
	slots.join(''),
	'languages',
	'syllabi',
	'GOODREADS',
	'ratings',
	'merit',
	'read'
];
const rows = Object.entries(known)
	.sort(
		([a, one], [b, other]) => other.standing - one.standing || (merit[b] ?? 0) - (merit[a] ?? 0)
	)
	.map(([slug, one]) => [
		slug,
		two(one.standing),
		slots.map((slot) => one.slots[slot]).join(''),
		String(one.counts.languages ?? '—'),
		String(one.counts.syllabi ?? '—'),
		two(one.enjoyment.goodreads?.rating),
		String(one.enjoyment.goodreads?.count ?? '—'),
		two(merit[slug]),
		two(read[slug]),
		one.unchecked.length ? `unchecked ${one.unchecked.join('')}` : ''
	]);
for (const row of [head, ...rows]) {
	console.log(row.map((cell, at) => cell.padEnd(at === 0 ? 34 : at === 2 ? 12 : 11)).join(''));
}

const tell = (name: string, one: Record<string, number>, other: Record<string, number | null>) => {
	const { tau, low, high, books } = band(one, other);
	console.log(
		`  ${name.padEnd(28)} ${tau.toFixed(3)}  [${low.toFixed(2)}, ${high.toFixed(2)}]  over ${books} books`
	);
};
console.log('\nAgreement of orders (tau-b of Kendall; 5th–95th of the books drawn again):');
console.log('with standing');
tell('merit', merit, standing);
tell('merit, plain', plain, standing);
tell('read', read, standing);
console.log('with what readers say (Goodreads rating)');
tell('read', read, goodreads);
tell('merit', merit, goodreads);
console.log(
	`standing and Goodreads rating with each other: ${agreement(standing, goodreads).tau.toFixed(3)}`
);
