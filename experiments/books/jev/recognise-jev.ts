import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { choice, noul } from '@typesafe-ai/sdk';
import { tokens, usd } from '../../../src/estimate.ts';
import { jevRecordsOf } from '../../../src/records.ts';
import { judgedPassages } from './judged.ts';
import { runBook } from './run.ts';

/**
 * Whether Jev itself knows the passages: `recognise.ts` asked a language model, which names the
 * book for nearly every passage; but it is Jev that judges, and Jev answers closed questions
 * alone, so its knowing is asked as one. Each judged passage is shown with four novels named,
 * title and author, the one it is from and three others of the same language from the books
 * judged, in an order that changes with the passage; how much of the probability Jev puts on
 * the right one is how far it knows the passage, a quarter being nothing. Beside it, whether it
 * holds the passage to be from a well-known novel. Kept under each book as set `recognise-jev`.
 *
 *   node experiments/books/jev/recognise-jev.ts [--go]
 */

const go = process.argv.includes('--go');
export const set = 'recognise-jev';
const named = JSON.parse(
	await readFile(join(import.meta.dirname, '../../../truth/books.json'), 'utf8')
) as { slug: string; title: string; author: string; language: string }[];
const label = (slug: string) => {
	const one = named.find((b) => b.slug === slug)!;
	return `${one.title.replace(/ \(.*\)$/, '')}, by ${one.author.replace(/ \(.*\)$/, '')}`;
};

let seed = 20260922;
const random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

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
	const mine = named.find((b) => b.slug === slug)!;
	const others = named.filter((b) => b.slug !== slug && b.language === mine.language);
	// The same four in the same order for every passage of a book, so that a book is one record;
	// which key is right changes from book to book, so that Jev's leaning to the first is spread.
	const order = [
		slug,
		...[...others]
			.sort(() => random() - 0.5)
			.slice(0, 3)
			.map((b) => b.slug)
	].sort(() => random() - 0.5);
	const keys = ['a', 'b', 'c', 'd'] as const;
	const right = keys[order.indexOf(slug)]!;
	const questions = {
		which: choice(
			'`chapter` is a passage of a novel. Which of these novels is it from?',
			Object.fromEntries(order.map((one, i) => [keys[i]!, label(one)]))
		),
		famous: noul('`chapter` is a passage of a novel. Is it a passage of a well-known novel?')
	};
	await runBook(
		path,
		book,
		() => passages.map((one) => ({ ...one, variant: `${set}, right ${right}` })),
		{ set, questions },
		'Whether Jev knows the passage: four novels named, the right one under the key the variant says, and whether it is well known.'
	);
}
