import { rulesHash, sets } from '../../../src/questions.ts';
import { isValuation, jevRecordsOf, recorded } from '../../../src/records.ts';
import { agreement, band, truth } from '../../../src/truth.ts';
import { unit, value, way } from '../../../src/value.ts';

/**
 * Not one judge for every book but one for each kind: the books fall in regions, a book belongs
 * to each by a degree, and each region has its own way of scoring; the score is the blend by the
 * degrees (a Takagi–Sugeno system of two rules). The regions come from the four schools of
 * `critics.ts`: how far the critics of form and of the moral tradition stand above the editor and
 * the ordinary reader is what a "critic's book" is, and Ulysses divides them as no other. Said
 * before any number was looked at, 2026-09-22:
 *
 *   μ = clamp((critics − trade) / 0.2, 0, 1), critics the mean of form and moral, trade of
 *       publisher and reader, both over the passages;
 *   score = μ · formalist + (1 − μ) · merit.
 *
 * Beside it, the same with the other cut that was already in the profile, whom the book is
 * written for ("for those who read for the writing"), and a few neighbours to see how brittle it
 * is. It earns its place by the yardstick of `src/truth.ts`: above 0.61 with the standing and
 * above 0.50 within the top floor. Asks nothing.
 */

const known = await truth();
const asked = rulesHash(sets[way.questions]);
const mean = (values: number[]) => values.reduce((sum, one) => sum + one, 0) / (values.length || 1);
const clamp = (x: number) => Math.min(1, Math.max(0, x));

interface Book {
	merit: number;
	literary: number;
	formalist: number;
	moralist: number;
	publisher: number;
	reader: number;
}
const books: Record<string, Book> = {};
for (const slug of await recorded()) {
	if (!known[slug]) continue;
	const records = await jevRecordsOf(slug);
	const valued = records.findLast((one) => one.by.rules === asked && isValuation(one));
	const critics = records.findLast((one) => one.by.questions === 'critics');
	if (!valued || !critics) continue;
	const { merit, profile } = value(valued.found);
	const school = (id: string) => mean(critics.found.map((one) => unit(one.answers, id)));
	books[slug] = {
		merit: merit.value,
		literary: profile.writtenFor.literary ?? 0,
		formalist: school('formalist'),
		moralist: school('moralist'),
		publisher: school('publisher'),
		reader: school('reader')
	};
}
const slugs = Object.keys(books);
const standing = Object.fromEntries(slugs.map((slug) => [slug, known[slug]!.standing]));
const merit = Object.fromEntries(slugs.map((slug) => [slug, books[slug]!.merit]));
const parting = (b: Book) => mean([b.formalist, b.moralist]) - mean([b.publisher, b.reader]);

const blend = (
	degree: (b: Book) => number,
	inside: (b: Book) => number,
	outside: (b: Book) => number = (b) => b.merit
) =>
	Object.fromEntries(
		slugs.map((slug) => {
			const b = books[slug]!;
			const mu = degree(b);
			return [slug, mu * inside(b) + (1 - mu) * outside(b)];
		})
	);

const ways: Record<string, Record<string, number>> = {
	'merit alone': merit,
	'said first: μ by critics−trade / 0.2, formalist inside': blend(
		(b) => clamp(parting(b) / 0.2),
		(b) => b.formalist
	),
	'μ by critics−trade / 0.3': blend(
		(b) => clamp(parting(b) / 0.3),
		(b) => b.formalist
	),
	'μ by critics−trade / 0.1': blend(
		(b) => clamp(parting(b) / 0.1),
		(b) => b.formalist
	),
	'hard: critics−trade ≥ 0.1 → formalist': blend(
		(b) => (parting(b) >= 0.1 ? 1 : 0),
		(b) => b.formalist
	),
	'μ by written for the writing': blend(
		(b) => b.literary,
		(b) => b.formalist
	),
	'μ by written for the writing, moralist inside': blend(
		(b) => b.literary,
		(b) => b.moralist
	),
	'μ by critics−trade / 0.2, highest school inside': blend(
		(b) => clamp(parting(b) / 0.2),
		(b) => Math.max(b.formalist, b.moralist, b.publisher, b.reader)
	),
	'μ by critics−trade / 0.2, formalist inside, publisher outside': blend(
		(b) => clamp(parting(b) / 0.2),
		(b) => b.formalist,
		(b) => b.publisher
	)
};

const top = slugs.filter((slug) => merit[slug]! >= 0.735);
console.log(`${slugs.length} books\n`);
console.log(
	'Agreement with standing (tau-b; band; within the top floor by merit); where Ulysses lands:'
);
for (const [name, scores] of Object.entries(ways)) {
	const { tau, low, high } = band(scores, standing);
	const within = agreement(
		Object.fromEntries(top.map((slug) => [slug, scores[slug]])),
		standing
	).tau;
	const order = [...slugs].sort((a, b) => scores[b]! - scores[a]!);
	console.log(
		`  ${name.padEnd(62)} ${tau.toFixed(3)}  [${low.toFixed(2)}, ${high.toFixed(2)}]   top floor ${within.toFixed(3)}   Ulysses ${String(order.indexOf('ulysses') + 1).padStart(2)}.`
	);
}

console.log('\nThe degree of each book in the region of the critics, and where it moves:');
const first = ways['said first: μ by critics−trade / 0.2, formalist inside']!;
const rank = (scores: Record<string, number>) => {
	const order = [...slugs].sort((a, b) => scores[b]! - scores[a]!);
	return (slug: string) => String(order.indexOf(slug) + 1).padStart(2);
};
const [rs, rm, rf] = [rank(standing), rank(merit), rank(first)];
for (const slug of [...slugs].sort((a, b) => parting(books[b]!) - parting(books[a]!))) {
	const b = books[slug]!;
	console.log(
		`  ${slug.padEnd(34)} μ ${clamp(parting(b) / 0.2).toFixed(2)}   formalist ${b.formalist.toFixed(2)}  merit ${b.merit.toFixed(2)}  → ${first[slug]!.toFixed(3)}   rank: standing ${rs(slug)}  merit ${rm(slug)}  blended ${rf(slug)}`
	);
}
