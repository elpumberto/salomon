import { score } from '@typesafe-ai/sdk';
import { tokens, usd } from '../../../src/estimate.ts';
import { jevRecordsOf } from '../../../src/records.ts';
import { judgedPassages } from './judged.ts';
import { runBook } from './run.ts';

/**
 * Four schools of criticism on the same passage, and how far they agree. The bet, said before any
 * was asked, 2026-09-22: what sets the great books apart is not a high mark on one criterion but
 * satisfying schools that seldom agree, and the competent seller pleases one and not another. So
 * each of the judged passages is put once to Jev with four questions, one in the voice of each
 * school, on one scale of three levels; `critics-board.ts` makes of them the mean of each school,
 * the lowest of the four, which is the passage no school turns down, and the spread among them,
 * and sets each against the graded truth. It earns its place if the lowest of the four agrees
 * with the standing above 0.61, and above 0.50 within the top floor.
 *
 *   node experiments/books/jev/critics.ts [--go]
 */

const go = process.argv.includes('--go');
const passage = '`chapter` is a passage of a novel of some 3,000 words. ';
const levels = (who: string) =>
	[
		`To ${who}, this passage is of no literary interest`,
		`To ${who}, this passage is competent work and no more`,
		`To ${who}, this passage is of real distinction`
	] as const;
export const questions = {
	formalist: score(
		`${passage}Read it as a critic of form would: one who weighs the shape of the sentences, the handling of point of view and time, the pattern of the whole, and cares nothing for the moral or the message. What is it to such a critic?`,
		levels('a critic of form')
	),
	moralist: score(
		`${passage}Read it as a critic of the moral tradition would: one who asks whether it tells the truth about how people live and what they owe each other, and whether it enlarges the reader's sympathy, and cares little for technique for its own sake. What is it to such a critic?`,
		levels('a critic of the moral tradition')
	),
	publisher: score(
		`${passage}Read it as an editor at a commercial publisher would: one who asks whether it will hold readers and sell, and whether the writing does its job without getting in the way. What is it to such an editor?`,
		levels('a commercial editor')
	),
	reader: score(
		`${passage}Read it as an ordinary reader would: one who reads for pleasure, wants to be taken in and carried along, and has no theory of literature. What is it to such a reader?`,
		levels('an ordinary reader')
	)
};
export const set = 'critics';
export const remarks =
	'Variant: critics. The judged passages, each put to four schools of criticism at once: what the passage is to a critic of form, to one of the moral tradition, to a commercial editor and to an ordinary reader.';

const judged = await judgedPassages();
let size = 0;
const todo: string[] = [];
for (const [slug, { passages }] of Object.entries(judged)) {
	const before = (await jevRecordsOf(slug)).some((one) => one.by.questions === set);
	if (before) continue;
	todo.push(slug);
	for (const one of passages) size += tokens(JSON.stringify(one.state).length);
}
console.log(
	`${todo.length} books of ${Object.keys(judged).length} still to ask, ${todo.reduce((sum, slug) => sum + judged[slug]!.passages.length, 0)} calls, some ${size.toLocaleString('en-US')} tokens: about $${usd(size).toFixed(3)}`
);
if (!go) {
	console.log('Nothing was sent to Jev. With --go, it is.');
	process.exit(0);
}
for (const slug of todo) {
	const { path, book, passages } = judged[slug]!;
	await runBook(
		path,
		book,
		() => passages.map((one) => ({ ...one, variant: 'critics' })),
		{ set, questions },
		remarks
	);
}
