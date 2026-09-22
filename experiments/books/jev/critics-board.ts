import { rulesHash, sets } from '../../../src/questions.ts';
import { isValuation, jevRecordsOf, recorded } from '../../../src/records.ts';
import { agreement, band, facet, truth } from '../../../src/truth.ts';
import { unit, value, way } from '../../../src/value.ts';

/**
 * What the four schools of `critics.ts` made of the books, from the records and asking nothing:
 * each school's mean over the passages, the lowest of the four, the highest, and the spread among
 * them; and how far each orders the books as the standing does, beside merit.
 */

const set = 'critics';
const schools = ['formalist', 'moralist', 'publisher', 'reader'] as const;
const known = await truth();
const asked = rulesHash(sets[way.questions]);
const mean = (values: number[]) => values.reduce((sum, one) => sum + one, 0) / (values.length || 1);

const merit: Record<string, number> = {};
const by: Record<(typeof schools)[number], Record<string, number>> = {
	formalist: {},
	moralist: {},
	publisher: {},
	reader: {}
};
for (const slug of await recorded()) {
	if (!known[slug]) continue;
	const records = await jevRecordsOf(slug);
	const valued = records.findLast((one) => one.by.rules === asked && isValuation(one));
	const critics = records.findLast((one) => one.by.questions === set);
	if (!valued || !critics) continue;
	merit[slug] = value(valued.found).merit.value;
	for (const school of schools) {
		by[school][slug] = mean(critics.found.map((one) => unit(one.answers, school)));
	}
}
const slugs = Object.keys(merit);
const standing = Object.fromEntries(slugs.map((slug) => [slug, known[slug]!.standing]));
const readers = Object.fromEntries(slugs.map((slug) => [slug, facet(known[slug]!, 'readers')]));
const lowest = Object.fromEntries(
	slugs.map((slug) => [slug, Math.min(...schools.map((school) => by[school][slug]!))])
);
const highest = Object.fromEntries(
	slugs.map((slug) => [slug, Math.max(...schools.map((school) => by[school][slug]!))])
);
const all = Object.fromEntries(
	slugs.map((slug) => [slug, mean(schools.map((school) => by[school][slug]!))])
);
const spread = Object.fromEntries(slugs.map((slug) => [slug, highest[slug]! - lowest[slug]!]));
/** The two critics against the two of the trade: where they part, the book is one kind or the other. */
const parting = Object.fromEntries(
	slugs.map((slug) => [
		slug,
		mean([by.formalist[slug]!, by.moralist[slug]!]) - mean([by.publisher[slug]!, by.reader[slug]!])
	])
);

const two = (one: number) => one.toFixed(2);
console.log(`${slugs.length} books\n`);
console.log(
	`${''.padEnd(34)}stand  merit  form  moral  publ  reader  lowest  spread  critics−trade`
);
for (const slug of [...slugs].sort((a, b) => lowest[b]! - lowest[a]!)) {
	console.log(
		`${slug.padEnd(34)}${two(standing[slug]!)}   ${two(merit[slug]!)}   ${two(by.formalist[slug]!)}  ${two(by.moralist[slug]!)}   ${two(by.publisher[slug]!)}  ${two(by.reader[slug]!)}    ${two(lowest[slug]!)}    ${two(spread[slug]!)}    ${(parting[slug]! >= 0 ? ' ' : '') + two(parting[slug]!)}`
	);
}

const top = slugs.filter((slug) => merit[slug]! >= 0.735);
const tell = (name: string, scores: Record<string, number>, against = standing) => {
	const { tau, low, high } = band(scores, against);
	const within = agreement(
		Object.fromEntries(top.map((slug) => [slug, scores[slug]])),
		against
	).tau;
	console.log(
		`  ${name.padEnd(18)} ${tau.toFixed(3)}  [${low.toFixed(2)}, ${high.toFixed(2)}]   top floor ${within.toFixed(3)}`
	);
};
console.log('\nAgreement with standing (and within the top floor by merit):');
tell('merit', merit);
for (const school of schools) tell(school, by[school]);
tell('lowest of four', lowest);
tell('highest of four', highest);
tell('mean of four', all);
tell('critics − trade', parting);
console.log('With the canon of reading (BCE):');
tell('merit', merit, readers);
tell('lowest of four', lowest, readers);
console.log(
	`\nHow far the schools agree with each other (tau): form–moral ${agreement(by.formalist, by.moralist).tau.toFixed(2)}, form–publisher ${agreement(by.formalist, by.publisher).tau.toFixed(2)}, form–reader ${agreement(by.formalist, by.reader).tau.toFixed(2)}, publisher–reader ${agreement(by.publisher, by.reader).tau.toFixed(2)}`
);
