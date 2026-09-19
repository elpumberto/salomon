import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { whole } from '../../../src/judge.ts';
import type { Notes } from '../../../src/notes.ts';
import { sets } from '../../../src/questions.ts';
import { books, run } from './run.ts';
import { taste } from './taste.ts';

/**
 * Whether it helps Jev to know what came before. The same chapters bare and with what the reader
 * knows so far beside them, as the reading notes have it for the chapter before.
 */

const notes: Notes = JSON.parse(
	await readFile(
		join(books, 'notes/king-solomons-mines.epub.google_gemini-3.1-flash-lite.by-price.json'),
		'utf8'
	)
);
const soFar = (index: number) =>
	notes.sections.find((section) => section.index === index - 1)?.soFar ?? '';

await run(
	'king-solomons-mines.epub',
	(book) =>
		[8, 17, 20].flatMap((index) => {
			const bare = whole(book, index);
			return [
				bare,
				{
					...bare,
					variant: 'with the story so far',
					state: { 'the story before this chapter': soFar(index), ...bare.state }
				}
			];
		}),
	{ set: 'reading and taste', questions: { ...sets.reading, ...taste } },
	'Experiment 8: chapters bare and with what the reader knows so far beside them, from the reading notes taken by gemini-3.1-flash-lite.'
);
