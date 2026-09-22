import { isValuation, jevRecordsOf, recorded } from '../../../src/records.ts';
import { rulesHash, sets } from '../../../src/questions.ts';
import { agreement, band, truth } from '../../../src/truth.ts';
import { value, way } from '../../../src/value.ts';

/**
 * What the comparisons of `compare.ts` came to, from the records and asking nothing. Each call
 * says how likely the first passage is the better of the two; the two orders of a match are
 * averaged, which undoes the leaning to the first. From every match a strength per book, the
 * kind chess ratings are: the strengths that make what was seen likeliest (Bradley–Terry, fitted
 * by the usual alternating steps), on which every book stands as far above another as it beats
 * it. Then the yardstick: how far the order of strengths agrees with the standing, over all the
 * books and within the twenty of the top floor, beside merit; and where each book moved.
 */

/** The set the comparisons were asked as, in `compare.ts`. */
const set = 'compare';

const known = await truth();
const asked = rulesHash(sets[way.questions]);
const merit: Record<string, number> = {};
/** Of each match: the two books, and how likely the first is the better, by each question. */
const matches: { one: string; other: string; wins: Record<string, number> }[] = [];
const questions = ['better', 'lesson', 'enjoy'];

for (const slug of await recorded()) {
	if (!known[slug]) continue;
	const records = await jevRecordsOf(slug);
	const valued = records.findLast((one) => one.by.rules === asked && isValuation(one));
	if (valued) merit[slug] = value(valued.found).merit.value;
	for (const record of records) {
		if (record.by.questions !== set) continue;
		for (const one of record.found) {
			const other = one.variant?.match(/of (\S+)$/)?.[1];
			if (!other) continue;
			const wins: Record<string, number> = {};
			for (const id of questions) {
				const answer = one.answers[id];
				if (answer && 'choice' in answer) wins[id] = answer.probabilities.first ?? 0;
			}
			matches.push({ one: slug, other, wins });
		}
	}
}
const slugs = Object.keys(known).filter((slug) => merit[slug] !== undefined);
const standing = Object.fromEntries(slugs.map((slug) => [slug, known[slug]!.standing]));

/** Bradley–Terry strengths from soft wins: how likely each book is the better of a pair. */
function strengths(id: string): Record<string, number> {
	const won: Record<string, number> = Object.fromEntries(slugs.map((slug) => [slug, 0]));
	const played: Record<string, Record<string, number>> = {};
	for (const { one, other, wins } of matches) {
		const p = wins[id];
		if (p === undefined || !won.hasOwnProperty(one) || !won.hasOwnProperty(other)) continue;
		won[one]! += p;
		won[other]! += 1 - p;
		(played[one] ??= {})[other] = (played[one]![other] ?? 0) + 1;
		(played[other] ??= {})[one] = (played[other]![one] ?? 0) + 1;
	}
	let strength: Record<string, number> = Object.fromEntries(slugs.map((slug) => [slug, 1]));
	for (let step = 0; step < 200; step++) {
		const next: Record<string, number> = {};
		for (const slug of slugs) {
			const under = Object.entries(played[slug] ?? {}).reduce(
				(sum, [other, games]) => sum + games / (strength[slug]! + strength[other]!),
				0
			);
			// A book that won nothing at all stays at the floor rather than at nothing.
			next[slug] = under ? Math.max(won[slug]!, 0.01) / under : strength[slug]!;
		}
		const mean = Math.exp(
			slugs.reduce((sum, slug) => sum + Math.log(next[slug]!), 0) / slugs.length
		);
		strength = Object.fromEntries(slugs.map((slug) => [slug, next[slug]! / mean]));
	}
	return Object.fromEntries(slugs.map((slug) => [slug, Math.log(strength[slug]!)]));
}

const calls = matches.length;
console.log(
	`${calls} calls of ${slugs.length * (slugs.length - 1) * 2} over ${slugs.length} books\n`
);
const scales = Object.fromEntries(questions.map((id) => [id, strengths(id)]));
const two = (one: number) => (one >= 0 ? ' ' : '') + one.toFixed(2);
const rank = (scores: Record<string, number>) => {
	const order = Object.keys(scores).sort((a, b) => scores[b]! - scores[a]!);
	return (slug: string) => order.indexOf(slug) + 1;
};
const byStanding = rank(standing);
const byMerit = rank(merit);
const byBetter = rank(scales.better!);
console.log(
	`${''.padEnd(34)}standing  merit   better written  a teacher's  enjoyed   rank: standing merit better`
);
for (const slug of [...slugs].sort((a, b) => scales.better![b]! - scales.better![a]!)) {
	console.log(
		`${slug.padEnd(34)}${standing[slug]!.toFixed(2)}      ${merit[slug]!.toFixed(2)}    ${two(scales.better![slug]!)}          ${two(scales.lesson![slug]!)}       ${two(scales.enjoy![slug]!)}          ${String(byStanding(slug)).padStart(2)}      ${String(byMerit(slug)).padStart(2)}    ${String(byBetter(slug)).padStart(2)}`
	);
}

const top = slugs.filter((slug) => merit[slug]! >= 0.735);
const tell = (
	name: string,
	scores: Record<string, number>,
	against: Record<string, number | null>
) => {
	const { tau, low, high } = band(scores, against);
	const within = agreement(
		Object.fromEntries(top.map((slug) => [slug, scores[slug]])),
		against
	).tau;
	console.log(
		`  ${name.padEnd(20)} ${tau.toFixed(3)}  [${low.toFixed(2)}, ${high.toFixed(2)}]   within the top floor ${within.toFixed(3)}`
	);
};
const goodreads = Object.fromEntries(
	slugs.map((slug) => [slug, known[slug]!.enjoyment.goodreads?.rating ?? null])
);
console.log(
	'\nAgreement with standing (tau-b; band; within the twenty books of the top floor by merit):'
);
tell('merit (the mean)', merit, standing);
for (const id of questions) tell(id, scales[id]!, standing);
console.log('Agreement with what readers say (Goodreads rating):');
tell('enjoy', scales.enjoy!, goodreads);
tell('better', scales.better!, goodreads);
tell('merit (the mean)', merit, goodreads);
