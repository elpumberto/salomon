import { noul, score } from '@typesafe-ai/sdk';
import { tokens, usd } from '../../../src/estimate.ts';
import { jevRecordsOf } from '../../../src/records.ts';
import { judgedPassages } from './judged.ts';
import { runBook } from './run.ts';

/**
 * A judge for the critic's book. `regions.ts` found that a book can be scored by one judge for
 * its kind and blended by degree, and that it puts Ulysses where the canon has it; but the judge
 * it had inside the region, a school of criticism asked of the same passages, gives nine tenths
 * to every well written book and orders nothing among them. So here is a judge with room among
 * the good: what a scholar of the novel would do with the passage, asked as behaviour, about what
 * the passage questions never touch, how it is made, what it dares, what a serious reader does
 * with it. Said before any was asked, 2026-09-22: the scholar's score is the plain mean of the
 * eight; it is tried alone on every book and blended by the degree of `regions.ts` inside the
 * critic's region; it earns its place by the yardstick of `src/truth.ts`, above 0.61 with the
 * standing and above 0.50 within the top floor, with Ulysses in the first ten and neither Don
 * Quijote nor Dracula lower than merit has them.
 *
 *   node experiments/books/jev/scholar.ts [--go]
 */

const go = process.argv.includes('--go');
const passage = '`chapter` is a passage of a novel of some 3,000 words. ';
export const questions = {
	essay: score(`${passage}How much would a critic find to say about this passage?`, [
		'A critic would find nothing to say about this passage',
		'A critic would give this passage a paragraph in a survey of its kind',
		'A critic would find an essay in this passage',
		'A critic would find more in this passage than an essay could hold'
	]),
	course: score(`${passage}What would become of it in a university course on the novel?`, [
		'This passage would not be assigned',
		'This passage would be read as an example of its genre',
		'This passage would be read for how it is made',
		'This passage would be read as a turn in what the novel can do'
	]),
	second: noul(`${passage}Would a second reading show things that a first reading missed?`),
	convention: score(`${passage}How does it stand to the usual ways of telling a novel?`, [
		'It follows the usual ways of telling',
		'It bends one of the usual ways a little',
		'It does something with form, voice or time that most novels do not',
		'It is unlike any usual way of telling'
	]),
	doing: score(`${passage}How many things does it do at once?`, [
		'It does one thing',
		'It tells its story and does one thing more',
		'It does several things at once: story, character, idea, form',
		'It does more things at once than a reader can hold'
	]),
	imitate: noul(`${passage}Would later writers imitate the way it is done?`),
	risk: score(`${passage}How much does the writing risk?`, [
		'It risks nothing',
		'It risks a little',
		'It takes a risk that could have failed',
		'It risks everything'
	]),
	century: noul(`${passage}Would it still be read a century from now?`)
};
export const set = 'scholar';
export const remarks =
	"Variant: scholar. The judged passages put to a judge for the critic's book: what a scholar of the novel would do with the passage, how it is made, what it dares, what a second reading gives.";

const judged = await judgedPassages();
let size = 0;
const todo: string[] = [];
for (const [slug, { passages }] of Object.entries(judged)) {
	if ((await jevRecordsOf(slug)).some((one) => one.by.questions === set)) continue;
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
		() => passages.map((one) => ({ ...one, variant: set })),
		{ set, questions },
		remarks
	);
}
