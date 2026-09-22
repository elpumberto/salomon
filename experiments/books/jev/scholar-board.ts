import { rulesHash, sets } from '../../../src/questions.ts';
import { isValuation, jevRecordsOf, recorded } from '../../../src/records.ts';
import { agreement, band, facet, truth } from '../../../src/truth.ts';
import { unit, value, way } from '../../../src/value.ts';

/**
 * What the scholar's questions of `scholar.ts` came to, from the records and asking nothing: the
 * scholar's score alone and question by question, and blended by degree into the critic's region
 * of `regions.ts`; each against the standing, over every book and within the top floor.
 */

const known = await truth();
const asked = rulesHash(sets[way.questions]);
const mean = (values: number[]) => values.reduce((sum, one) => sum + one, 0) / (values.length || 1);
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const ids = ['essay', 'course', 'second', 'convention', 'doing', 'imitate', 'risk', 'century'];

interface Book {
	merit: number;
	scholar: Record<string, number>;
	mu: number;
}
const books: Record<string, Book> = {};
for (const slug of await recorded()) {
	if (!known[slug]) continue;
	const records = await jevRecordsOf(slug);
	const valued = records.findLast((one) => one.by.rules === asked && isValuation(one));
	const scholar = records.findLast((one) => one.by.questions === 'scholar');
	const critics = records.findLast((one) => one.by.questions === 'critics');
	if (!valued || !scholar || !critics) continue;
	const school = (id: string) => mean(critics.found.map((one) => unit(one.answers, id)));
	const parting =
		mean([school('formalist'), school('moralist')]) - mean([school('publisher'), school('reader')]);
	books[slug] = {
		merit: value(valued.found).merit.value,
		scholar: Object.fromEntries(
			ids.map((id) => [id, mean(scholar.found.map((one) => unit(one.answers, id)))])
		),
		mu: clamp(parting / 0.2)
	};
}
const slugs = Object.keys(books);
const standing = Object.fromEntries(slugs.map((slug) => [slug, known[slug]!.standing]));
const readers = Object.fromEntries(slugs.map((slug) => [slug, facet(known[slug]!, 'readers')]));
const merit = Object.fromEntries(slugs.map((slug) => [slug, books[slug]!.merit]));
const scholar = Object.fromEntries(
	slugs.map((slug) => [slug, mean(ids.map((id) => books[slug]!.scholar[id]!))])
);
const blended = Object.fromEntries(
	slugs.map((slug) => {
		const { mu } = books[slug]!;
		return [slug, mu * scholar[slug]! + (1 - mu) * merit[slug]!];
	})
);
const half = Object.fromEntries(
	slugs.map((slug) => [slug, 0.5 * scholar[slug]! + 0.5 * merit[slug]!])
);

const two = (one: number) => one.toFixed(2);
const rank = (scores: Record<string, number>) => {
	const order = [...slugs].sort((a, b) => scores[b]! - scores[a]!);
	return (slug: string) => String(order.indexOf(slug) + 1).padStart(2);
};
const [rs, rm, rsc, rb] = [rank(standing), rank(merit), rank(scholar), rank(blended)];
console.log(`${slugs.length} books\n`);
console.log(
	`${''.padEnd(34)}stand  merit  ${ids.map((id) => id.slice(0, 6).padEnd(7)).join('')}scholar  μ     blended   rank: stand merit scholar blended`
);
for (const slug of [...slugs].sort((a, b) => scholar[b]! - scholar[a]!)) {
	const b = books[slug]!;
	console.log(
		`${slug.padEnd(34)}${two(standing[slug]!)}   ${two(b.merit)}   ${ids.map((id) => two(b.scholar[id]!).padEnd(7)).join('')}${two(scholar[slug]!)}     ${two(b.mu)}  ${two(blended[slug]!)}        ${rs(slug)}    ${rm(slug)}    ${rsc(slug)}      ${rb(slug)}`
	);
}

const top = slugs.filter((slug) => merit[slug]! >= 0.735);
const tell = (name: string, scores: Record<string, number>, against = standing) => {
	const { tau, low, high } = band(scores, against);
	const within = agreement(
		Object.fromEntries(top.map((slug) => [slug, scores[slug]])),
		against
	).tau;
	const order = [...slugs].sort((a, b) => scores[b]! - scores[a]!);
	console.log(
		`  ${name.padEnd(26)} ${tau.toFixed(3)}  [${low.toFixed(2)}, ${high.toFixed(2)}]   top floor ${within.toFixed(3)}   Ulysses ${String(order.indexOf('ulysses') + 1).padStart(2)}.  Quijote ${String(order.indexOf('don-quijote') + 1).padStart(2)}.  Dracula ${String(order.indexOf('dracula') + 1).padStart(2)}.`
	);
};
console.log('\nAgreement with standing (band; within the top floor by merit):');
tell('merit', merit);
tell('scholar alone', scholar);
tell('blended by region', blended);
tell('half and half', half);
console.log("Each of the scholar's questions alone:");
for (const id of ids)
	tell(id, Object.fromEntries(slugs.map((slug) => [slug, books[slug]!.scholar[id]!])));
console.log('With the canon of reading (BCE):');
tell('merit', merit, readers);
tell('scholar alone', scholar, readers);
tell('blended by region', blended, readers);
