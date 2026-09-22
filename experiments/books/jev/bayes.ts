import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Answer } from '../../../src/judge.ts';
import { rulesHash, sets } from '../../../src/questions.ts';
import { isValuation, jevRecordsOf, recorded } from '../../../src/records.ts';
import { agreement, band, truth } from '../../../src/truth.ts';
import { value, way } from '../../../src/value.ts';

/**
 * A book as a Bayes net instead of a mean: a hidden variable per book, how far the institutions
 * hold it, cut from the standing in four; under it, every answer Jev gave to every passage as
 * evidence, with the whole distribution over the levels kept as it came. The tables that say what
 * the answers of a book at each level look like are learned from the other books, and the book
 * in hand is never among them. Two shapes: flat, with the answers hanging from the book; and with
 * a hidden quality per passage between, so that a book may be a mixture of good and poor passages.
 * The verdict is a distribution over the four levels, ordered by its expected level, and set
 * against the standing by the one yardstick of `src/truth.ts`. Asks nothing.
 *
 *   node experiments/books/jev/bayes.ts [temper]
 *
 * `temper`, 1 by default, scales the evidence of each passage: the fourteen answers are not
 * fourteen independent witnesses, and less than 1 says by how much less.
 */

const temper = Number(process.argv[2] ?? 1);
const asked = rulesHash(sets[way.questions]);
const known = await truth();

/** The four levels of the hidden variable, from the standing. */
const level = (standing: number) =>
	standing === 0 ? 0 : standing < 0.5 ? 1 : standing < 1 ? 2 : 3;
const LEVELS = 4;
const QUALITIES = 3;

/** An answer as a distribution over its levels, in a fixed order per question. */
function spread(id: string, answer: Answer): [string[], number[]] {
	if ('noul' in answer)
		return [
			['no', 'yes'],
			[1 - answer.noul, answer.noul]
		];
	if ('score' in answer)
		return [answer.probabilities.map((_, at) => String(at)), answer.probabilities];
	const labels = Object.keys(answer.probabilities).sort();
	return [labels, labels.map((label) => answer.probabilities[label] ?? 0)];
}

type Passage = Record<string, number[]>; // question → distribution over its levels
const books: Record<string, Passage[]> = {};
const labelsOf: Record<string, string[]> = {};
const merit: Record<string, number> = {};
for (const slug of await recorded()) {
	const judged = (await jevRecordsOf(slug)).findLast(
		(one) => one.by.rules === asked && isValuation(one)
	);
	if (!judged || !known[slug]) continue;
	merit[slug] = value(judged.found).merit.value;
	books[slug] = judged.found.map(({ answers }) =>
		Object.fromEntries(
			Object.entries(answers).map(([id, answer]) => {
				const [labels, p] = spread(id, answer);
				labelsOf[id] = labels;
				return [id, p];
			})
		)
	);
}
const slugs = Object.keys(books);
const questions = Object.keys(labelsOf);
const standing = Object.fromEntries(slugs.map((slug) => [slug, known[slug]!.standing]));

type Tables = Record<string, number[][]>; // question → [state][level] probability
const log = Math.log;

/** The tables as Jev gave them of a described book at each level (`bayes-tables.ts`), if asked. */
const fromKnowledge: Tables | null = await readFile(
	join(import.meta.dirname, 'bayes-tables.json'),
	'utf8'
)
	.then((text) => {
		const { found } = JSON.parse(text) as { found: Record<string, Record<string, Answer>> };
		const tables: Tables = {};
		for (const id of questions) {
			tables[id] = ['none', 'some', 'much', 'canon'].map((name) => {
				// As the SDK gives it: a score's probabilities keyed by level, which `judge.ts` lists in order.
				const raw = found[name]![id]! as Answer & { probabilities?: unknown };
				const answer: Answer =
					'score' in raw && !Array.isArray(raw.probabilities)
						? {
								...raw,
								probabilities: Object.entries(raw.probabilities as Record<string, number>)
									.sort(([a], [b]) => Number(a) - Number(b))
									.map(([, p]) => p)
							}
						: raw;
				const [labels, p] = spread(id, answer);
				const row = labelsOf[id]!.map((label) => p[labels.indexOf(label)] ?? 0);
				// No level is impossible: a floor of 0.02, then the row sums to one again.
				const floored = row.map((one) => Math.max(one, 0.02));
				const total = floored.reduce((sum, one) => sum + one, 0);
				return floored.map((one) => one / total);
			});
		}
		return tables;
	})
	.catch((error) => {
		console.error(`no tables from knowledge: ${error}`);
		return null;
	});

/** Tables from soft counts: each answer adds its distribution to the row of its state. */
function learn(
	rows: { state: number[]; passage: Passage }[],
	states: number,
	alpha = 1,
	prior?: { tables: Tables; strength: number }
): Tables {
	const tables: Tables = {};
	for (const id of questions) {
		const width = labelsOf[id]!.length;
		const counts = Array.from({ length: states }, (_, s) =>
			Array.from({ length: width }, (_, at) =>
				prior ? alpha + prior.strength * (prior.tables[id]![s]![at] ?? 0) : alpha
			)
		);
		for (const { state, passage } of rows) {
			const p = passage[id];
			if (!p) continue;
			for (let s = 0; s < states; s++) {
				const weight = state[s] ?? 0;
				if (!weight) continue;
				p.forEach((mass, at) => (counts[s]![at]! += weight * mass));
			}
		}
		tables[id] = counts.map((row) => {
			const total = row.reduce((sum, one) => sum + one, 0);
			return row.map((one) => one / total);
		});
	}
	return tables;
}

/** Log-likelihood of a passage's answers under each state, the distributions as soft evidence. */
function evidence(passage: Passage, tables: Tables, states: number): number[] {
	const out = Array<number>(states).fill(0);
	for (const id of questions) {
		const p = passage[id];
		const table = tables[id];
		if (!p || !table) continue;
		for (let s = 0; s < states; s++) {
			out[s]! += p.reduce((sum, mass, at) => sum + mass * log(table[s]![at]!), 0);
		}
	}
	return out.map((one) => one * temper);
}

const normalise = (logs: number[]) => {
	const top = Math.max(...logs);
	const weights = logs.map((one) => Math.exp(one - top));
	const total = weights.reduce((sum, one) => sum + one, 0);
	return weights.map((one) => one / total);
};
const expected = (posterior: number[]) => posterior.reduce((sum, p, at) => sum + p * at, 0);

/** Flat: the answers of every passage hang from the book's level. */
function flat(held: string): number[] {
	const rows = slugs
		.filter((slug) => slug !== held)
		.flatMap((slug) =>
			books[slug]!.map((passage) => ({
				state: Array.from({ length: LEVELS }, (_, s) => (s === level(standing[slug]!) ? 1 : 0)),
				passage
			}))
		);
	const tables = learn(rows, LEVELS);
	const logs = Array<number>(LEVELS).fill(0);
	for (const passage of books[held]!)
		evidence(passage, tables, LEVELS).forEach((e, s) => (logs[s]! += e));
	return normalise(logs);
}

/**
 * With a hidden quality per passage: P(quality | level) and P(answers | quality) learned by
 * expectation-maximisation over the other books, from a start where quality follows the level.
 */
function layered(held: string, rounds = 20): number[] {
	const training = slugs.filter((slug) => slug !== held);
	// P(quality | level): start with quality rising with level.
	let mixing = Array.from({ length: LEVELS }, (_, l) =>
		Array.from(
			{ length: QUALITIES },
			(_, q) => 1 + 2 * (1 - Math.abs(q / (QUALITIES - 1) - l / (LEVELS - 1)))
		)
	).map((row) => row.map((one) => one / row.reduce((sum, x) => sum + x, 0)));
	let tables = learn(
		training.flatMap((slug) =>
			books[slug]!.map((passage) => ({ state: mixing[level(standing[slug]!)]!, passage }))
		),
		QUALITIES
	);
	for (let round = 0; round < rounds; round++) {
		// E: the posterior quality of each training passage given its book's level.
		const rows = training.flatMap((slug) => {
			const l = level(standing[slug]!);
			return books[slug]!.map((passage) => {
				const logs = evidence(passage, tables, QUALITIES).map((e, q) => e + log(mixing[l]![q]!));
				return { level: l, state: normalise(logs), passage };
			});
		});
		// M: tables from the soft assignments, mixing from their mean per level.
		tables = learn(rows, QUALITIES);
		mixing = Array.from({ length: LEVELS }, (_, l) => {
			const mine = rows.filter((row) => row.level === l);
			const sums = Array.from(
				{ length: QUALITIES },
				(_, q) => 1 + mine.reduce((sum, row) => sum + row.state[q]!, 0)
			);
			const total = sums.reduce((sum, one) => sum + one, 0);
			return sums.map((one) => one / total);
		});
	}
	// The held-out book: sum over each passage's quality, product over passages.
	const logs = Array.from({ length: LEVELS }, (_, l) =>
		books[held]!.reduce((sum, passage) => {
			const e = evidence(passage, tables, QUALITIES);
			const top = Math.max(...e);
			return (
				sum + top + log(e.reduce((acc, one, q) => acc + Math.exp(one - top) * mixing[l]![q]!, 0))
			);
		}, 0)
	);
	return normalise(logs);
}

/** From Jev's knowledge alone: no book is learned from. */
function knowledge(held: string): number[] {
	const logs = Array<number>(LEVELS).fill(0);
	for (const passage of books[held]!)
		evidence(passage, fromKnowledge!, LEVELS).forEach((e, s) => (logs[s]! += e));
	return normalise(logs);
}

/** Jev's tables as the prior, worth as many passages as `strength`, and the other books on top. */
function both(held: string, strength = 24): number[] {
	const rows = slugs
		.filter((slug) => slug !== held)
		.flatMap((slug) =>
			books[slug]!.map((passage) => ({
				state: Array.from({ length: LEVELS }, (_, s) => (s === level(standing[slug]!) ? 1 : 0)),
				passage
			}))
		);
	const tables = learn(rows, LEVELS, 0.01, { tables: fromKnowledge!, strength });
	const logs = Array<number>(LEVELS).fill(0);
	for (const passage of books[held]!)
		evidence(passage, tables, LEVELS).forEach((e, s) => (logs[s]! += e));
	return normalise(logs);
}

const two = (one: number) => one.toFixed(2);
const flatScore: Record<string, number> = {};
const layeredScore: Record<string, number> = {};
const knowledgeScore: Record<string, number> = {};
const bothScore: Record<string, number> = {};
const shown: string[] = [];
for (const slug of slugs) {
	const f = flat(slug);
	const l = layered(slug);
	flatScore[slug] = expected(f);
	layeredScore[slug] = expected(l);
	const k = fromKnowledge ? knowledge(slug) : [];
	const b = fromKnowledge ? both(slug) : [];
	if (fromKnowledge) {
		knowledgeScore[slug] = expected(k);
		bothScore[slug] = expected(b);
	}
	shown.push(
		`${slug.padEnd(34)}${two(standing[slug]!)}   ${two(merit[slug]!)}    ${f.map(two).join(' ')}  ${two(expected(f))}    ${l.map(two).join(' ')}  ${two(expected(l))}    ${k.map(two).join(' ')}  ${k.length ? two(expected(k)) : ''}    ${b.map(two).join(' ')}  ${b.length ? two(expected(b)) : ''}`
	);
}
console.log(
	`temper ${temper}; the book in hand is never among those the tables are learned from\n`
);
console.log(
	`${''.padEnd(34)}stand  merit   flat: none some much canon  E     layered: none some much canon  E     knowledge: none some much canon  E     both: none some much canon  E`
);
for (const line of shown.sort((a, b) => Number(b.slice(34, 38)) - Number(a.slice(34, 38))))
	console.log(line);

const tell = (name: string, scores: Record<string, number>) => {
	const { tau, low, high } = band(scores, standing);
	const top = Object.fromEntries(Object.entries(scores).filter(([slug]) => merit[slug]! >= 0.735));
	const within = agreement(top, standing).tau;
	console.log(
		`  ${name.padEnd(24)} ${tau.toFixed(3)}  [${low.toFixed(2)}, ${high.toFixed(2)}]   within the top floor ${within.toFixed(3)}`
	);
};
console.log(
	'\nAgreement with standing (tau-b; band; and among the twenty books of the top floor by merit):'
);
tell('merit (the mean)', merit);
tell('flat net', flatScore);
tell('layered net', layeredScore);
if (fromKnowledge) {
	tell("knowledge net (Jev's tables)", knowledgeScore);
	tell('knowledge + data', bothScore);
}
