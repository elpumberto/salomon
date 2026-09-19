import { name } from './judge.ts';
import type { Answer, Judged } from './judge.ts';

/** What Jev said, as a table for a terminal: a row a question, a column a passage. */

export const percent = (share: number | null) =>
	share === null ? '—' : `${Math.round(share * 100)}%`;

/** A score is where the passage falls among the levels, then how sure Jev is of it. */
export function cell(answer: Answer | undefined): string {
	if (!answer) return '—';
	if ('noul' in answer) return `${answer.noul.toFixed(2)} yes`;
	if ('choice' in answer) return `${answer.choice} ·${answer.confidence.toFixed(2)}`;
	return `${answer.score.toFixed(2)}/${answer.of} ·${answer.confidence.toFixed(2)}`;
}

export function table(judged: Judged[], ids: string[]): string {
	const rows = [
		['', ...judged.map(name)],
		...ids.map((id) => [id, ...judged.map((one) => cell(one.answers[id]))]),
		['measured: words', ...judged.map((one) => one.measured.words.toLocaleString('en-US'))],
		['measured: spoken', ...judged.map((one) => percent(one.measured.spoken))],
		['measured: words a sentence', ...judged.map((one) => String(one.measured.wordsPerSentence))],
		['tokens in', ...judged.map((one) => one.tokensIn.toLocaleString('en-US'))]
	];
	const width = Math.max(14, ...judged.map((one) => name(one).length + 2));
	return rows
		.map((row) => row.map((one, column) => one.padEnd(column ? width : 28)).join(''))
		.join('\n');
}
