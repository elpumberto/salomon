import { createHash } from 'node:crypto';
import type { Answer, Judged } from './judge.ts';

/**
 * From what Jev said of the passages of a book to what the book is worth, twice over: its literary
 * merit and how good a read it is, each from 0 to 1, and a profile that judges nothing. It is all
 * arithmetic on answers already got to the `gut` questions: another way of weighing them costs
 * nothing, and the rules here have a hash like the questions have theirs.
 *
 * Merit is the mean of nine answers. Six of them are taken in by ornament, a passage overdone on
 * purpose scoring as high on them as the passage it was made from; the two of the teacher are not.
 * So those six count for less the surer a teacher would be to give the passage to a class as what
 * not to do, in full up to half sure and for nothing when certain: which takes nothing from prose
 * that is abundant and well written. The mean without that is told beside it. How the way was
 * come by, and the books it was checked on, is in `docs/books/other-ways.md`.
 */

/** How a book is judged to be valued: passages of so many words, so many of them, spread over its story. */
export const way = { questions: 'gut', words: 3000, passages: 12 } as const;

export const rules = {
	/** What each option of a choice is worth. */
	worth: {
		draft: { first: 0, worked: 0.6, finished: 1 },
		editor: { cut: 0, trim: 0.5, leave: 1 },
		memory: { nothing: 0, events: 0.4, feeling: 0.8, image: 1 },
		slush: { rejected: 0, read: 0.5, wanted: 1 }
	},
	/** Merit is the mean of these and of `warning` the other way round. */
	merit: ['underline', 'draft', 'editor', 'memory', 'anyone', 'lesson', 'again', 'aloud'],
	/** Those that a passage overdone on purpose scores as high on as the passage it was made from. */
	takenIn: ['underline', 'draft', 'anyone', 'aloud', 'memory', 'again'],
	/** They count in full up to this much `warning`, and for nothing at 1. */
	warningFrom: 0.5,
	/** The read is the mean of these and of `skip` the other way round. */
	read: ['lost', 'stop']
} as const;

export const rulesHash = `sha256:${createHash('sha256').update(JSON.stringify(rules)).digest('hex').slice(0, 12)}`;

type Answers = Record<string, Answer>;

const mean = (values: number[]) => values.reduce((sum, one) => sum + one, 0) / (values.length || 1);

/** What an answer comes to from 0 to 1; a choice, by what each of its options is worth. */
export function unit(answers: Answers, id: string): number {
	const answer = answers[id];
	if (!answer) return 0;
	if ('noul' in answer) return answer.noul;
	if ('score' in answer) return answer.score / answer.of;
	const worth: Record<string, number> = rules.worth[id as keyof typeof rules.worth] ?? {};
	return Object.entries(worth).reduce(
		(sum, [label, value]) => sum + value * (answer.probabilities[label] ?? 0),
		0
	);
}

/** The merit of a passage with every answer counted in full. */
export const plain = (answers: Answers): number =>
	mean([...rules.merit.map((id) => unit(answers, id)), 1 - unit(answers, 'warning')]);

/** The merit of a passage: the same, less what ornament would take in. */
export function gated(answers: Answers): number {
	const warning = unit(answers, 'warning');
	const gate = 1 - Math.max(0, warning - rules.warningFrom) / (1 - rules.warningFrom);
	const takenIn: readonly string[] = rules.takenIn;
	return mean([
		...rules.merit.map((id) => unit(answers, id) * (takenIn.includes(id) ? gate : 1)),
		1 - warning
	]);
}

export const read = (answers: Answers): number =>
	mean([...rules.read.map((id) => unit(answers, id)), 1 - unit(answers, 'skip')]);

export interface Valuation {
	rules: string;
	passages: number;
	/** `lowest` and `highest` are of its passages, which says how even the book is. */
	merit: { value: number; plain: number; lowest: number; highest: number };
	read: { value: number };
	/** What judges nothing: how likely Jev held each option, over the passages, and the teacher's two answers. */
	profile: {
		writtenFor: Record<string, number>;
		readsLike: Record<string, number>;
		toLearnFrom: number;
		whatNotToDo: number;
	};
	/** Passage by passage, in the order of the book. */
	pulse: { merit: number; read: number }[];
}

const round = (value: number) => Number(value.toFixed(4));

/** The passages of a book in its order, as Jev judged them with the `gut` questions. */
export function value(judged: Pick<Judged, 'answers'>[]): Valuation {
	const merits = judged.map(({ answers }) => gated(answers));
	const shares = (id: string) => {
		const held: Record<string, number[]> = {};
		for (const { answers } of judged) {
			const answer = answers[id];
			if (!answer || !('choice' in answer)) continue;
			for (const [label, probability] of Object.entries(answer.probabilities)) {
				(held[label] ??= []).push(probability);
			}
		}
		return Object.fromEntries(
			Object.entries(held).map(([label, all]) => [label, round(mean(all))])
		);
	};
	const over = (id: string) => round(mean(judged.map(({ answers }) => unit(answers, id))));
	return {
		rules: rulesHash,
		passages: judged.length,
		merit: {
			value: round(mean(merits)),
			plain: round(mean(judged.map(({ answers }) => plain(answers)))),
			lowest: round(Math.min(...merits)),
			highest: round(Math.max(...merits))
		},
		read: { value: round(mean(judged.map(({ answers }) => read(answers)))) },
		profile: {
			writtenFor: shares('audience'),
			readsLike: shares('draft'),
			toLearnFrom: over('lesson'),
			whatNotToDo: over('warning')
		},
		pulse: judged.map(({ answers }) => ({
			merit: round(gated(answers)),
			read: round(read(answers))
		}))
	};
}
