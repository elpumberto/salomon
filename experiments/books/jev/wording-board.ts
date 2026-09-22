import { rulesHash, sets } from '../../../src/questions.ts';
import { isValuation, jevRecordsOf, recorded } from '../../../src/records.ts';
import { agreement, band, truth } from '../../../src/truth.ts';
import { gated, rules, unit, value, way } from '../../../src/value.ts';
import { wordings } from './wordings.ts';

/**
 * What the other wordings of `wording-consensus.ts` came to, from the records and asking nothing:
 * each book's merit under each wording and under the consensus of the four, with how far the
 * wordings part on it; how far each agrees with the standing; and, question by question, how
 * far the wordings part on a passage and whether they part most in the middle of the scale.
 */

const known = await truth();
const asked = rulesHash(sets[way.questions]);
const names = ['gut', ...Object.keys(wordings)];
const mean = (values: number[]) => values.reduce((sum, one) => sum + one, 0) / (values.length || 1);
const sd = (values: number[]) => {
	const m = mean(values);
	return Math.sqrt(mean(values.map((one) => (one - m) ** 2)));
};
const two = (one: number) => one.toFixed(2);

interface Book {
	merit: Record<string, number>; // by wording
	passages: Record<string, number>[]; // per passage, merit by wording
	answers: Record<string, Record<string, number>>[]; // per passage, unit by question by wording
}
const books: Record<string, Book> = {};
for (const slug of await recorded()) {
	if (!known[slug]) continue;
	const records = await jevRecordsOf(slug);
	const got: Record<string, (typeof records)[number]> = {};
	const valued = records.findLast((one) => one.by.rules === asked && isValuation(one));
	if (valued) got.gut = valued;
	for (const name of Object.keys(wordings)) {
		const one = records.findLast((r) => r.by.questions === `gut-${name}`);
		if (one) got[name] = one;
	}
	if (Object.keys(got).length < names.length) continue;
	const passages = got.gut!.found.map((one) => {
		const key = `${one.section}/${one.piece?.at ?? 0}`;
		const merit: Record<string, number> = {};
		const answers: Record<string, Record<string, number>> = {};
		for (const name of names) {
			const same = got[name]!.found.find((r) => `${r.section}/${r.piece?.at ?? 0}` === key);
			if (!same) continue;
			merit[name] = gated(same.answers);
			for (const id of Object.keys(same.answers)) {
				(answers[id] ??= {})[name] = unit(same.answers, id);
			}
		}
		return { merit, answers };
	});
	books[slug] = {
		merit: Object.fromEntries(names.map((name) => [name, value(got[name]!.found).merit.value])),
		passages: passages.map((p) => p.merit),
		answers: passages.map((p) => p.answers)
	};
}
const slugs = Object.keys(books);
const standing = Object.fromEntries(slugs.map((slug) => [slug, known[slug]!.standing]));
const by = (name: string) =>
	Object.fromEntries(slugs.map((slug) => [slug, books[slug]!.merit[name]!]));
const consensus = Object.fromEntries(
	slugs.map((slug) => [slug, mean(names.map((name) => books[slug]!.merit[name]!))])
);
const width = Object.fromEntries(
	slugs.map((slug) => {
		const values = names.map((name) => books[slug]!.merit[name]!);
		return [slug, Math.max(...values) - Math.min(...values)];
	})
);

console.log(`${slugs.length} books in ${names.length} wordings\n`);
console.log(
	`${''.padEnd(34)}stand   ${names.map((n) => n.padEnd(7)).join('')}consensus  width   passages parting > 0.10`
);
for (const slug of [...slugs].sort((a, b) => consensus[b]! - consensus[a]!)) {
	const b = books[slug]!;
	const parting = b.passages.filter((p) => {
		const v = Object.values(p);
		return Math.max(...v) - Math.min(...v) > 0.1;
	}).length;
	console.log(
		`${slug.padEnd(34)}${two(standing[slug]!)}    ${names.map((n) => two(b.merit[n]!).padEnd(7)).join('')}${two(consensus[slug]!)}       ${two(width[slug]!)}    ${parting}/${b.passages.length}`
	);
}

const top = slugs.filter((slug) => books[slug]!.merit.gut! >= 0.735);
const tell = (name: string, scores: Record<string, number>) => {
	const { tau, low, high } = band(scores, standing);
	const within = agreement(
		Object.fromEntries(top.map((slug) => [slug, scores[slug]])),
		standing
	).tau;
	console.log(
		`  ${name.padEnd(12)} ${tau.toFixed(3)}  [${low.toFixed(2)}, ${high.toFixed(2)}]   top floor ${within.toFixed(3)}`
	);
};
console.log('\nAgreement with standing:');
for (const name of names) tell(name, by(name));
tell('consensus', consensus);
console.log(
	`\nWidth between wordings, over books: mean ${two(mean(Object.values(width)))}, largest ${two(Math.max(...Object.values(width)))}`
);
console.log(
	`Agreement of the wordings with each other: ${names.flatMap((a, i) => names.slice(i + 1).map((b) => `${a}–${b} ${agreement(by(a), by(b)).tau.toFixed(2)}`)).join(', ')}`
);

console.log(
	'\nBy question: the spread of an answer over the wordings (sd, mean over passages), all passages and those the wording in use put in the middle third of the scale:'
);
const ids = Object.keys(sets.gut);
for (const id of ids) {
	const all: number[] = [];
	const middle: number[] = [];
	for (const slug of slugs) {
		for (const p of books[slug]!.answers) {
			const a = p[id];
			if (!a || Object.keys(a).length < names.length) continue;
			const spread = sd(names.map((n) => a[n]!));
			all.push(spread);
			const inUse = a.gut!;
			if (inUse > 1 / 3 && inUse < 2 / 3) middle.push(spread);
		}
	}
	console.log(
		`  ${id.padEnd(10)} all ${two(mean(all))}   middle ${middle.length ? two(mean(middle)) : ' — '}  (${middle.length} of ${all.length} in the middle)${(rules.merit as readonly string[]).includes(id) || id === 'warning' ? '' : '   (not in merit)'}`
	);
}
