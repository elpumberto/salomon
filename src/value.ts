import { createHash } from 'node:crypto';
import type { Answer, Judged } from './judge.ts';

/**
 * From what Jev said of the pieces of a book to what the book is worth, twice over: its literary
 * merit and how good a read it is, each from 0 to 1, and a profile that says what kind of reading
 * it is and judges nothing. It is all arithmetic on answers already got: another way of weighing
 * them costs nothing, and the rules here have a hash like the questions have theirs.
 *
 * Four things shape it. Writing that impresses is only counted where the wording is not strained
 * nor the emotion merely asserted, since ornament passes for craft when asked about alone. A
 * criterion counts only in the pieces where it applies: physical detail where there is narration,
 * not in a page of talk. Merit is the mean of the pieces and, with it, the mean of the best tenth,
 * since a book is more than the absence of faults. And how far the prose is from a reader of today
 * counts against the read, which it multiplies, and not against the merit.
 */

export const rules = {
	merit: {
		/** How much each part of a piece's merit weighs. */
		parts: { craft: 0.3, writing: 0.3, wording: 0.25, substance: 0.15 },
		/** Faults, each from 0 to 1; `readymade` comes the other way round, from 1 for none. */
		faults: ['overwritten', 'explains', 'steers', 'strings', 'melodrama', 'padding'],
		/** What is counted only through the gate. */
		gated: ['prose', 'voice', 'fine'],
		/** What each option is worth; null is an option that says the question does not apply. */
		phrasing: { apt: 1, exact: 0.8, plain: 0.4, readymade: 0.1, strained: 0 },
		figures: { true: 1, familiar: 0.4, forced: 0, none: null },
		emotion: { earned: 1, absent: 0.2, asserted: 0, slight: null },
		/** Of the book's merit, how much is the best tenth of its pieces and how much their mean. */
		peaks: 0.4
	},
	read: {
		/** What holds a reader, and how much each thing weighs. */
		weights: { open: 0.3, friction: 0.2, stakes: 0.15, happens: 0.15, feeling: 0.15, tight: 0.05 },
		/**
		 * What holds a reader only reaches them through prose they can get through: it is multiplied
		 * by how fluent the reading is, which never takes away more than this leaves.
		 */
		fluency: ['effort', 'archaic', 'unclear', 'overwritten'],
		floor: 0.4,
		/** What is added for a passage that is funny throughout. */
		funny: 0.1,
		/** How many times over the opening tenth of the book counts. */
		opening: 2,
		/** A piece under this share of the book's own mean is a slack one: the longest run of them is told, not scored. */
		slack: 0.67
	}
} as const;

export const rulesHash = `sha256:${createHash('sha256').update(JSON.stringify(rules)).digest('hex').slice(0, 12)}`;

type Answers = Record<string, Answer>;

/** A score or a noul from 0 to 1; null when it was not asked or is a choice. */
function unit(answer: Answer | undefined): number | null {
	if (!answer || 'choice' in answer) return null;
	return 'noul' in answer ? answer.noul : answer.score / answer.of;
}

/** How likely Jev held any of these options of a choice to be. */
function chance(answer: Answer | undefined, ...labels: string[]): number {
	if (!answer || !('choice' in answer)) return 0;
	return labels.reduce((sum, label) => sum + (answer.probabilities[label] ?? 0), 0);
}

/** A value and how much it counts: a weight of 0 is a criterion that does not apply here. */
interface Part {
	value: number;
	weight: number;
}

const none: Part = { value: 0, weight: 0 };

function mean(parts: Part[]): Part {
	const weight = parts.reduce((sum, part) => sum + part.weight, 0);
	if (weight === 0) return none;
	return { value: parts.reduce((sum, part) => sum + part.value * part.weight, 0) / weight, weight };
}

const plain = (values: (number | null)[]): Part =>
	mean(values.flatMap((value) => (value === null ? [] : [{ value, weight: 1 }])));

/** What a choice is worth: its options by how likely each was held, leaving out those that say it does not apply. */
function worth(answer: Answer | undefined, values: Record<string, number | null>): Part {
	if (!answer || !('choice' in answer)) return none;
	return mean(
		Object.entries(values).flatMap(([label, value]) =>
			value === null ? [] : [{ value, weight: answer.probabilities[label] ?? 0 }]
		)
	);
}

export function meritOf(answers: Answers): number | null {
	const { parts, faults, gated, phrasing, figures, emotion } = rules.merit;
	const readymade = unit(answers.readymade);
	const craft = plain([
		...faults.map((id) => unit(answers[id])),
		readymade === null ? null : 1 - readymade
	]);
	const gate =
		(1 - chance(answers.phrasing, 'strained', 'readymade')) *
		(1 - chance(answers.emotion, 'asserted'));
	const writing = plain(gated.map((id) => unit(answers[id])));
	const wording = mean([
		{ ...worth(answers.phrasing, phrasing), weight: worth(answers.phrasing, phrasing).weight * 2 },
		worth(answers.figures, figures),
		worth(answers.emotion, emotion)
	]);
	// Physical detail is looked for where there is narration, not in a page of talk.
	const narration = 1 - (unit(answers.talk) ?? 0);
	const substance = mean([
		{ value: unit(answers.insight) ?? 0, weight: unit(answers.insight) === null ? 0 : 1 },
		{ value: unit(answers.specific) ?? 0, weight: unit(answers.specific) === null ? 0 : narration }
	]);

	const whole = mean([
		{ value: 1 - craft.value, weight: craft.weight ? parts.craft : 0 },
		{ value: writing.value * gate, weight: writing.weight ? parts.writing : 0 },
		{ value: wording.value, weight: wording.weight ? parts.wording : 0 },
		{ value: substance.value, weight: substance.weight ? parts.substance : 0 }
	]);
	return whole.weight ? whole.value : null;
}

export function readOf(answers: Answers): number | null {
	const { weights, fluency, floor, funny } = rules.read;
	const not = (value: number | null) => (value === null ? null : 1 - value);
	const values: Record<keyof typeof weights, number | null> = {
		open: unit(answers.open),
		friction: unit(answers.friction),
		stakes: unit(answers.stakes),
		happens: unit(answers.happens),
		feeling: unit(answers.feeling),
		tight: not(unit(answers.padding))
	};
	const holds = mean(
		Object.entries(weights).map(([id, weight]) => {
			const value = values[id as keyof typeof weights];
			return value === null ? none : { value, weight };
		})
	);
	if (!holds.weight) return null;
	const fluent = plain(fluency.map((id) => not(unit(answers[id]))));
	const through = fluent.weight ? floor + (1 - floor) * fluent.value : 1;
	return Math.min(1, holds.value * through + funny * (unit(answers.funny) ?? 0));
}

export interface Valuation {
	rules: string;
	pieces: number;
	merit: { value: number; mean: number; bestTenth: number };
	read: { value: number; mean: number; opening: number; longestSlackRun: number };
	/** What kind of reading it is: means from 0 to 1, and how the pieces fell among the options of each choice. */
	profile: {
		means: Record<string, number>;
		doorway: Record<string, number>;
		phrasing: Record<string, number>;
	};
	/** Piece by piece, in the order of the book: its pulse. */
	pulse: { merit: number; read: number }[];
}

const round = (value: number) => Number(value.toFixed(3));
const average = (values: number[]) =>
	values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

/** The pieces of a book in its order, as Jev judged them with the `passage` questions. */
export function value(judged: Pick<Judged, 'answers'>[]): Valuation {
	const pulse = judged.flatMap(({ answers }) => {
		const merit = meritOf(answers);
		const read = readOf(answers);
		return merit === null || read === null ? [] : [{ merit, read, answers }];
	});
	const merits = pulse.map((piece) => piece.merit);
	const best = [...merits].sort((one, other) => other - one);
	const bestTenth = average(best.slice(0, Math.max(1, Math.round(best.length / 10))));
	const opening = Math.max(1, Math.round(pulse.length / 10));
	const reads = pulse.map((piece) => piece.read);
	const weighted =
		reads.reduce((sum, read, at) => sum + read * (at < opening ? rules.read.opening : 1), 0) /
		(reads.length + opening * (rules.read.opening - 1) || 1);
	let run = 0;
	let longest = 0;
	for (const read of reads) {
		run = read < rules.read.slack * average(reads) ? run + 1 : 0;
		longest = Math.max(longest, run);
	}

	const share = (id: string) => {
		const counts: Record<string, number> = {};
		for (const { answers } of pulse) {
			const answer = answers[id];
			if (answer && 'choice' in answer) counts[answer.choice] = (counts[answer.choice] ?? 0) + 1;
		}
		return Object.fromEntries(
			Object.entries(counts).map(([label, count]) => [label, round(count / pulse.length)])
		);
	};
	const described = ['talk', 'place', 'feeling', 'stakes', 'happens', 'funny', 'effort', 'archaic'];

	return {
		rules: rulesHash,
		pieces: pulse.length,
		merit: {
			value: round((1 - rules.merit.peaks) * average(merits) + rules.merit.peaks * bestTenth),
			mean: round(average(merits)),
			bestTenth: round(bestTenth)
		},
		read: {
			value: round(weighted),
			mean: round(average(reads)),
			opening: round(average(reads.slice(0, opening))),
			longestSlackRun: longest
		},
		profile: {
			means: Object.fromEntries(
				described.map((id) => [
					id,
					round(average(pulse.flatMap(({ answers }) => unit(answers[id]) ?? [])))
				])
			),
			doorway: share('doorway'),
			phrasing: share('phrasing')
		},
		pulse: pulse.map(({ merit, read }) => ({ merit: round(merit), read: round(read) }))
	};
}
