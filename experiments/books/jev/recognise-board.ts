import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { rulesHash, sets } from '../../../src/questions.ts';
import { isValuation, jevRecordsOf, recorded, recordsOf } from '../../../src/records.ts';
import type { JevRecord } from '../../../src/records.ts';
import { agreement, band, truth } from '../../../src/truth.ts';
import { gated, unit, way } from '../../../src/value.ts';

/**
 * What the recognition of `recognise.ts` says of the judges: how much of each book the model
 * knows by heart, and whether the questions that order the books still order them on the
 * passages nobody recognised. Merit, the scholar's mean and the question of a century from now
 * are each taken over a book's unrecognised passages alone, and set against the standing, beside
 * the same over every passage. Asks nothing.
 */

const known = await truth();
const authors: Record<string, string> = Object.fromEntries(
	(
		JSON.parse(await readFile(join(import.meta.dirname, '../../../truth/books.json'), 'utf8')) as {
			slug: string;
			author: string;
		}[]
	).map((b) => [b.slug, b.author])
);
const asked = rulesHash(sets[way.questions]);
const mean = (values: number[]) => values.reduce((sum, one) => sum + one, 0) / (values.length || 1);
const norm = (text: string | null | undefined) =>
	(text ?? '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/[^a-z0-9 ]/g, ' ')
		.split(/\s+/)
		.filter((word) => word.length > 3);

interface Passage {
	sha256: string;
	recognised: boolean;
	merit: number;
	scholar: number | null;
	century: number | null;
}
const books: Record<string, Passage[]> = {};
for (const slug of await recorded()) {
	if (!known[slug]) continue;
	const all = await recordsOf(slug);
	const jev = all.filter((one): one is JevRecord => one.kind === 'jev');
	const valued = jev.findLast((one) => one.by.rules === asked && isValuation(one));
	const scholar = jev.findLast((one) => one.by.questions === 'scholar');
	const seen = all.findLast((one) => (one as { kind: string }).kind === 'recognise') as
		{ found: { sha256: string; title: string | null; author: string | null }[] } | undefined;
	if (!valued || !seen) continue;
	const { title } = known[slug]!;
	const author = authors[slug];
	const words = new Set([...norm(title), ...norm(author)]);
	const named = new Map(
		seen.found.map((one) => [
			one.sha256,
			[...norm(one.title), ...norm(one.author)].some((word) => words.has(word))
		])
	);
	const ids = ['essay', 'course', 'second', 'convention', 'doing', 'imitate', 'risk', 'century'];
	books[slug] = valued.found.map((one) => {
		const same = scholar?.found.find((other) => other.sha256 === one.sha256);
		return {
			sha256: one.sha256,
			recognised: named.get(one.sha256) ?? false,
			merit: gated(one.answers),
			scholar: same ? mean(ids.map((id) => unit(same.answers, id))) : null,
			century: same ? unit(same.answers, 'century') : null
		};
	});
}
const slugs = Object.keys(books);
const standing = Object.fromEntries(slugs.map((slug) => [slug, known[slug]!.standing]));

const over = (pick: (p: Passage) => boolean, get: (p: Passage) => number | null) =>
	Object.fromEntries(
		slugs.map((slug) => {
			const values = books[slug]!.filter(pick)
				.map(get)
				.filter((v): v is number => v !== null);
			return [slug, values.length ? mean(values) : null];
		})
	);
const every = () => true;
const unknown = (p: Passage) => !p.recognised;

console.log(`${slugs.length} books\n`);
console.log(`${''.padEnd(34)}standing  recognised   merit all / unknown   century all / unknown`);
const m = over(every, (p) => p.merit);
const mu = over(unknown, (p) => p.merit);
const c = over(every, (p) => p.century);
const cu = over(unknown, (p) => p.century);
for (const slug of [...slugs].sort((a, b) => standing[b]! - standing[a]!)) {
	const share = mean(books[slug]!.map((p) => (p.recognised ? 1 : 0)));
	const f = (v: number | null | undefined) => (v == null ? '  — ' : v.toFixed(2));
	console.log(
		`${slug.padEnd(34)}${standing[slug]!.toFixed(2)}      ${share.toFixed(2)}         ${f(m[slug])} / ${f(mu[slug])}          ${f(c[slug])} / ${f(cu[slug])}`
	);
}

const tell = (name: string, scores: Record<string, number | null>) => {
	const { tau, low, high, books: n } = band(scores, standing);
	console.log(
		`  ${name.padEnd(36)} ${tau.toFixed(3)}  [${low.toFixed(2)}, ${high.toFixed(2)}]  over ${n} books`
	);
};
const unrecognised = slugs.filter((slug) => books[slug]!.some(unknown)).length;
console.log(
	`\nRecognised: ${mean(slugs.flatMap((slug) => books[slug]!.map((p) => (p.recognised ? 1 : 0)))).toFixed(2)} of the passages; ${unrecognised} books have a passage nobody recognised.`
);
console.log('Agreement with standing, over every passage and over the unrecognised alone:');
tell('merit, every passage', m);
tell('merit, unrecognised passages', mu);
tell(
	'scholar, every passage',
	over(every, (p) => p.scholar)
);
tell(
	'scholar, unrecognised passages',
	over(unknown, (p) => p.scholar)
);
tell('a century from now, every passage', c);
tell('a century from now, unrecognised', cu);
const share = Object.fromEntries(
	slugs.map((slug) => [slug, mean(books[slug]!.map((p) => (p.recognised ? 1 : 0)))])
);
console.log(
	`\nHow far recognition itself orders the books as the standing does: ${agreement(share, standing).tau.toFixed(3)}`
);
