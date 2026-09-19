import { whole } from '../../../src/judge.ts';
import { run } from './run.ts';
import { taste } from './taste.ts';

/** The questions of taste, in English as they are, put to a book in Spanish of four centuries ago. */

await run(
	'don-quijote.epub',
	(book) => [4, 8, 11, 15].map((section) => whole(book, section - 1)),
	{ set: 'taste', questions: taste },
	'Experiment 7: a book in Spanish, with the questions in English as for the others.'
);
