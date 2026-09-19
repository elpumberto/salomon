import { createHash } from 'node:crypto';
import type { Answer, Judged } from '../../../src/judge.ts';

/**
 * What the behavioural questions come to, for a passage and for a book: its merit two ways, and
 * how it reads. `plain` is the mean of nine answers, as it was said before any was asked. `gated`
 * is the same but for the answers that ornament takes in, which count for less the surer a teacher
 * would be to give the passage to a class as what not to do: it was arrived at after seeing the
 * twenty books, and stands or falls by books it has not seen.
 */

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

export const plain = (answers: Answers): number =>
	mean([...rules.merit.map((id) => unit(answers, id)), 1 - unit(answers, 'warning')]);

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

/** A book by the passages judged of it: each valuation is the mean of its passages. */
export function valued(found: Pick<Judged, 'answers'>[]) {
	const of = (way: (answers: Answers) => number) => found.map(({ answers }) => way(answers));
	const [plainly, gatedly, reads] = [of(plain), of(gated), of(read)];
	return {
		plain: mean(plainly),
		gated: mean(gatedly),
		read: mean(reads),
		/** The lowest and the highest passage, by the plain mean: how even the book is. */
		from: Math.min(...plainly),
		to: Math.max(...plainly),
		passages: { plain: plainly, gated: gatedly, read: reads }
	};
}
