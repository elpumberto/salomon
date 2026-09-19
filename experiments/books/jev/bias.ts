import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { choice } from '@typesafe-ai/sdk';
import type { Book } from '../../../src/book.ts';
import { measure, pieces, whole } from '../../../src/judge.ts';
import type { Passage } from '../../../src/judge.ts';
import { readBook } from '../../../src/read/index.ts';
import { rewritten } from './rewrites.ts';
import { books, run } from './run.ts';
import { taste } from './taste.ts';

/**
 * What moves Jev's answers besides the text. First, what it is told about the text: the same
 * chapter with a true or a false name on it, and with the praise or the scorn of critics. Then,
 * two passages side by side and the question of which is the better written, asked both ways
 * round: an answer that follows the place and not the passage is no answer.
 */

const said = {
	praised: 'From a novel that critics count among the best written in the language.',
	scorned: 'From a novel that critics have called the worst written in the language.'
};

/** The same passage bare, then with each thing said of it beside it, under `about`. */
const told = (passage: Passage, labels: Record<string, string>): Passage[] => [
	passage,
	...Object.entries(labels).map(([variant, about]) => ({
		...passage,
		variant,
		state: { about, ...passage.state }
	}))
];

const remarks =
	'Experiment 5: the same passages with something said of them beside the text, true or false, to see how far what Jev is told moves what it says.';
const asked = { set: 'taste', questions: taste };

await run(
	'pride-and-prejudice.epub',
	(book) =>
		told(whole(book, 1), {
			...said,
			'named truly': 'From Pride and Prejudice, by Jane Austen.',
			'named falsely': 'From Irene Iddesleigh, by Amanda McKittrick Ros.'
		}),
	asked,
	remarks
);
await run(
	'irene-iddesleigh.epub',
	(book) =>
		told(whole(book, 5), {
			...said,
			'named truly': 'From Irene Iddesleigh, by Amanda McKittrick Ros.',
			'named falsely': 'From Pride and Prejudice, by Jane Austen.'
		}),
	asked,
	remarks
);

const better = {
	better: choice(
		'`first` and `second` are two passages of novels. Which of the two is the better written?',
		{ first: 'The passage in `first`', second: 'The passage in `second`' }
	),
	danger: choice(
		'`first` and `second` are two passages of novels. In which of the two are the characters in more physical danger?',
		{ first: 'The passage in `first`', second: 'The passage in `second`' }
	)
};

const load = async (file: string) => readBook(join(books, file));
const [mines, pride, irene] = await Promise.all(
	['king-solomons-mines.epub', 'pride-and-prejudice.epub', 'irene-iddesleigh.epub'].map(load)
);
const rewrite = async (slug: string, way: string) =>
	JSON.parse(await readFile(rewritten(slug, way), 'utf8')).text as string;
const text = (book: Book | undefined, index: number) =>
	book ? (whole(book, index).state.chapter ?? '') : '';
const desert = (mines && pieces(mines, 8, 1000)[3]?.state.chapter) ?? '';

const pairs: [string, string, string][] = [
	['Austen I / Ros IV', text(pride, 1), text(irene, 5)],
	['Austen I / Austen I flat', text(pride, 1), await rewrite('pride-and-prejudice.2', 'flat')],
	['Austen I / Austen I purple', text(pride, 1), await rewrite('pride-and-prejudice.2', 'purple')],
	['Haggard V 4/5 / flat', desert, await rewrite('king-solomons-mines.9.4', 'flat')],
	['Haggard V 4/5 / purple', desert, await rewrite('king-solomons-mines.9.4', 'purple')],
	['Austen I / Haggard I', text(pride, 1), text(mines, 4)],
	['Haggard XIV / Austen XXXIV', text(mines, 17), text(pride, 34)]
];

await run(
	'king-solomons-mines.epub',
	() =>
		pairs.flatMap(([variant, one, other], at) =>
			[
				[variant, one, other],
				[`${variant}, the other way round`, other, one]
			].map(([label = '', first = '', second = '']) => ({
				section: at + 1,
				variant: label,
				state: { first, second },
				measured: measure([first, second], true)
			}))
		),
	{ set: 'side by side', questions: better },
	'Experiment 6: two passages side by side and which is the better written, asked both ways round. Here a section is the number of the pair, not of a section of the book: the pairs are of passages of three books and of rewrites of them.'
);
