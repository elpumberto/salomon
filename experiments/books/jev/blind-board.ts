import { rulesHash, sets } from '../../../src/questions.ts';
import { isValuation, jevRecordsOf, recorded } from '../../../src/records.ts';
import { agreement, band, facet, truth } from '../../../src/truth.ts';
import { unit, value, way } from '../../../src/value.ts';

/**
 * The valuation of the text alone, its names changed by `disguise.ts --all`, beside the valuation
 * as it is: what each book comes to, how far the fame Jev holds it in fell, what that took from
 * its merit, and how far each order agrees with the standing. Asks nothing.
 */

const known = await truth();
const asked = rulesHash(sets[way.questions]);
const mean = (values: number[]) => values.reduce((sum, one) => sum + one, 0) / (values.length || 1);
const two = (one: number | null | undefined) =>
	one == null ? '  — ' : (one >= 0 ? ' ' : '') + one.toFixed(2);

interface Book {
	merit: number;
	blind: number;
	read: number;
	blindRead: number;
	famous: number;
	famousBlind: number;
	lowest: number;
	highest: number;
}
const books: Record<string, Book> = {};
for (const slug of await recorded()) {
	if (!known[slug]) continue;
	const records = await jevRecordsOf(slug);
	const valued = records.findLast((one) => one.by.rules === asked && isValuation(one));
	const disguised = records.findLast((one) => one.by.questions === 'gut-disguised');
	const knew = records.findLast((one) => one.by.questions === 'recognise-jev');
	const knows = records.findLast((one) => one.by.questions === 'recognise-jev-disguised');
	if (!valued || !disguised) continue;
	const before = value(valued.found);
	const after = value(disguised.found);
	books[slug] = {
		merit: before.merit.value,
		blind: after.merit.value,
		read: before.read.value,
		blindRead: after.read.value,
		famous: knew ? mean(knew.found.map((one) => unit(one.answers, 'famous'))) : NaN,
		famousBlind: knows ? mean(knows.found.map((one) => unit(one.answers, 'famous'))) : NaN,
		lowest: after.merit.lowest,
		highest: after.merit.highest
	};
}
const slugs = Object.keys(books);
const standing = Object.fromEntries(slugs.map((slug) => [slug, known[slug]!.standing]));
const readers = Object.fromEntries(slugs.map((slug) => [slug, facet(known[slug]!, 'readers')]));
const goodreads = Object.fromEntries(
	slugs.map((slug) => [slug, known[slug]!.enjoyment.goodreads?.rating ?? null])
);
const pick = (key: keyof Book) =>
	Object.fromEntries(slugs.map((slug) => [slug, books[slug]![key]]));

const rank = (scores: Record<string, number>) => {
	const order = [...slugs].sort((a, b) => scores[b]! - scores[a]!);
	return (slug: string) => String(order.indexOf(slug) + 1).padStart(2);
};
const [rs, rm, rb] = [rank(standing), rank(pick('merit')), rank(pick('blind'))];
console.log(`${slugs.length} books valued as they are and with their names changed\n`);
console.log(
	`${''.padEnd(34)}stand  famous → blind   merit → blind   Δ      passages   read → blind   rank: stand merit blind`
);
for (const slug of [...slugs].sort((a, b) => books[b]!.blind - books[a]!.blind)) {
	const b = books[slug]!;
	console.log(
		`${slug.padEnd(34)}${two(standing[slug]!)}  ${two(b.famous)} → ${two(b.famousBlind)}     ${two(b.merit)} → ${two(b.blind)}  ${two(b.blind - b.merit)}   ${two(b.lowest)}–${b.highest.toFixed(2)}   ${two(b.read)} → ${two(b.blindRead)}       ${rs(slug)}    ${rm(slug)}    ${rb(slug)}`
	);
}

const floors: [string, (b: Book) => boolean][] = [
	['well written (merit ≥ 0.74)', (b) => b.merit >= 0.735],
	['competent (0.62–0.74)', (b) => b.merit >= 0.62 && b.merit < 0.735],
	['written by the yard (< 0.62)', (b) => b.merit < 0.62]
];
console.log('\nWhat the disguise took, by floor of the valuation as it is:');
for (const [name, on] of floors) {
	const mine = slugs.filter((slug) => on(books[slug]!));
	console.log(
		`  ${name.padEnd(32)} ${mine.length} books: famous ${two(mean(mine.map((s) => books[s]!.famous)))} → ${two(mean(mine.map((s) => books[s]!.famousBlind)))}, merit ${two(mean(mine.map((s) => books[s]!.merit)))} → ${two(mean(mine.map((s) => books[s]!.blind)))}`
	);
}

const top = slugs.filter((slug) => books[slug]!.merit >= 0.735);
const tell = (
	name: string,
	scores: Record<string, number>,
	against: Record<string, number | null> = standing
) => {
	const { tau, low, high } = band(scores, against);
	const within = agreement(
		Object.fromEntries(top.map((slug) => [slug, scores[slug]])),
		against
	).tau;
	console.log(
		`  ${name.padEnd(30)} ${tau.toFixed(3)}  [${low.toFixed(2)}, ${high.toFixed(2)}]   top floor ${within.toFixed(3)}`
	);
};
console.log('\nAgreement with standing:');
tell('merit, as it is', pick('merit'));
tell('merit, names changed', pick('blind'));
tell('fame Jev holds, as it is', pick('famous'));
tell('fame Jev holds, names changed', pick('famousBlind'));
console.log('With the canon of reading (BCE):');
tell('merit, as it is', pick('merit'), readers);
tell('merit, names changed', pick('blind'), readers);
console.log('With what readers say (Goodreads rating):');
tell('read, as it is', pick('read'), goodreads);
tell('read, names changed', pick('blindRead'), goodreads);
console.log(
	`\nThe two merits agree with each other at ${agreement(pick('merit'), pick('blind')).tau.toFixed(3)}; the pairs of the ladders that change order are told by scoreboard.ts.`
);
