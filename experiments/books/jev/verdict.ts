import type { Answer } from '../../../src/judge.ts';
import { rulesHash, sets } from '../../../src/questions.ts';
import { isValuation, jevRecordsOf, recorded } from '../../../src/records.ts';
import { agreement, band, truth } from '../../../src/truth.ts';
import { unit, value, way } from '../../../src/value.ts';

/**
 * The whole book in the verdict. What only the whole book shows, how it is built and whose side it
 * takes, was asked of an outline and of each chapter with the story so far (`whole.ts`,
 * `in-context.ts`) and never put in the merit, since it was found on books already known. Here it
 * is set against the graded truth, on the twenty books that have it, as a first measure: each
 * answer alone, and a verdict that adds to merit what the whole book says.
 *
 * Said before any number was looked at, 2026-09-22. Two named variables: *build*, how far the
 * chapters are one action that ends as it was prepared (unity, settled, ending, rising, cause, and
 * no storyline to spare); *breadth*, how far the book takes in more than one side (both sides
 * with a claim, several wants, beyond its people, someone torn, a central character changed by
 * steps). The verdict is merit plus a tenth of each, counted only as far as the merit stands above
 * the floor of prose written by the yard: verdict = merit + 0.1 · (build + breadth) · gate, with
 * gate rising from 0 at merit 0.62 to 1 at 0.80. Nothing here rescues prose written by the yard.
 * It earns a check on the other twelve books if, on these twenty, it agrees with the standing
 * better than merit does, and better within the top floor; a gain under 0.03 is nothing.
 */

const known = await truth();
const asked = rulesHash(sets[way.questions]);

/** What each option of the whole-book choices is worth. */
const worth: Record<string, Record<string, number>> = {
	cause: { people: 1, events: 0.7, chance: 0.2, none: 0 },
	ending: { own: 1, prepared: 0.8, unprepared: 0.2, none: 0 },
	change: { steps: 1, seen: 0.8, same: 0.3, abrupt: 0.2 },
	acts: { fitting: 1, expected: 0.5, unfitting: 0.2, nothing: 0 },
	sides: { both: 1, one: 0.4, none: 0 }
};
function of(answers: Record<string, Answer>, id: string): number | null {
	const answer = answers[id];
	if (!answer) return null;
	if ('choice' in answer) {
		const table = worth[id];
		if (!table) return null;
		return Object.entries(table).reduce(
			(sum, [label, w]) => sum + w * (answer.probabilities[label] ?? 0),
			0
		);
	}
	return unit(answers, id);
}
const mean = (values: number[]) => values.reduce((sum, one) => sum + one, 0) / (values.length || 1);

interface Book {
	merit: number;
	whole: Record<string, number>; // the outline's answers, and the chapters' averaged
}
const books: Record<string, Book> = {};
for (const slug of await recorded()) {
	if (!known[slug]) continue;
	const records = await jevRecordsOf(slug);
	const valued = records.findLast((one) => one.by.rules === asked && isValuation(one));
	const outline = records.findLast((one) => one.by.questions === 'book');
	const chapters = records.findLast((one) => one.by.questions === 'inContext');
	if (!valued || !outline || !chapters || chapters.found.length < 5) continue;
	const whole: Record<string, number> = {};
	const answers = outline.found[0]?.answers ?? {};
	for (const id of Object.keys(sets.book)) {
		const v = of(answers, id);
		if (v !== null) whole[id] = v;
	}
	for (const id of Object.keys(sets.inContext)) {
		const all = chapters.found
			.map((one) => of(one.answers, id))
			.filter((v): v is number => v !== null);
		if (all.length) whole[id] = mean(all);
	}
	// The share of chapters in which both sides have a claim, as whole-book.md told it.
	whole.bothSides = mean(
		chapters.found.map((one) =>
			one.answers.sides && 'choice' in one.answers.sides
				? (one.answers.sides.probabilities.both ?? 0)
				: 0
		)
	);
	books[slug] = { merit: value(valued.found).merit.value, whole };
}
const slugs = Object.keys(books);
const standing = Object.fromEntries(slugs.map((slug) => [slug, known[slug]!.standing]));
const merit = Object.fromEntries(slugs.map((slug) => [slug, books[slug]!.merit]));

const build = (w: Record<string, number>) =>
	mean([
		w.unity ?? 0,
		w.settled ?? 0,
		w.ending ?? 0,
		w.rising ?? 0,
		w.cause ?? 0,
		1 - (w.spare ?? 0)
	]);
const breadth = (w: Record<string, number>) =>
	mean([w.bothSides ?? 0, w.wants ?? 0, w.beyond ?? 0, w.torn ?? 0, w.change ?? 0]);
const gate = (m: number) => Math.min(1, Math.max(0, (m - 0.62) / (0.8 - 0.62)));
const verdict = Object.fromEntries(
	slugs.map((slug) => {
		const { merit: m, whole } = books[slug]!;
		return [slug, m + 0.1 * (build(whole) + breadth(whole)) * gate(m)];
	})
);

const top = slugs.filter((slug) => merit[slug]! >= 0.735);
const tell = (name: string, scores: Record<string, number>) => {
	const { tau, low, high, books: n } = band(scores, standing);
	const within = agreement(
		Object.fromEntries(top.map((slug) => [slug, scores[slug]])),
		standing
	).tau;
	console.log(
		`  ${name.padEnd(22)} ${tau.toFixed(3)}  [${low.toFixed(2)}, ${high.toFixed(2)}]   top floor ${within.toFixed(3)}   (${n} books)`
	);
};

console.log(`${slugs.length} books with the whole-book answers\n`);
console.log(
	`${''.padEnd(34)}stand  merit  build  breadth  both   verdict   rank: stand merit verdict`
);
const rank = (scores: Record<string, number>) => {
	const order = [...slugs].sort((a, b) => scores[b]! - scores[a]!);
	return (slug: string) => String(order.indexOf(slug) + 1).padStart(2);
};
const [rs, rm, rv] = [rank(standing), rank(merit), rank(verdict)];
for (const slug of [...slugs].sort((a, b) => verdict[b]! - verdict[a]!)) {
	const w = books[slug]!.whole;
	console.log(
		`${slug.padEnd(34)}${standing[slug]!.toFixed(2)}   ${merit[slug]!.toFixed(2)}   ${build(w).toFixed(2)}   ${breadth(w).toFixed(2)}     ${(w.bothSides ?? 0).toFixed(2)}   ${verdict[slug]!.toFixed(3)}       ${rs(slug)}    ${rm(slug)}    ${rv(slug)}`
	);
}
console.log('\nAgreement with standing on these books:');
tell('merit', merit);
tell('verdict', verdict);
tell('build alone', Object.fromEntries(slugs.map((s) => [s, build(books[s]!.whole)])));
tell('breadth alone', Object.fromEntries(slugs.map((s) => [s, breadth(books[s]!.whole)])));
console.log('\nEach whole-book answer alone:');
for (const id of [...Object.keys(sets.book), ...Object.keys(sets.inContext), 'bothSides']) {
	const scores = Object.fromEntries(slugs.map((s) => [s, books[s]!.whole[id] ?? null]));
	const { tau, books: n } = agreement(scores, standing);
	console.log(`  ${id.padEnd(12)} ${tau.toFixed(3)}  (${n})`);
}
