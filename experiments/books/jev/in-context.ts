import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gathered } from '../../../src/book.ts';
import { tokens } from '../../../src/estimate.ts';
import { whole } from '../../../src/judge.ts';
import type { Notes } from '../../../src/notes.ts';
import { sets } from '../../../src/questions.ts';
import { books, run } from './run.ts';

/**
 * Every chapter of the story of each book that has reading notes, with what the reader knows on
 * reaching it beside it, and the questions about its people. A call a chapter.
 */

const dir = join(books, 'notes');
for (const file of (await readdir(dir)).filter((one) => one.includes('gemini-3.1-flash-lite'))) {
	const notes: Notes = JSON.parse(await readFile(join(dir, file), 'utf8'));
	const story = notes.sections.filter((section) => section.kind === 'story');
	// A chapter is asked once: what was asked before is in the records of the book.
	const slug = notes.book.source.file.replace(/\.[^.]+$/, '');
	const before = await readdir(join(books, '../records/books', slug)).catch(() => []);
	const asked = await Promise.all(
		before
			.filter((one) => one.includes('.jev.'))
			.map(async (one) =>
				JSON.parse(await readFile(join(books, '../records/books', slug, one), 'utf8'))
			)
	);
	const done = new Set<number>(
		asked
			.filter((record) => record.by.questions === 'inContext')
			.flatMap((record) => record.found.map((one: { section: number }) => one.section))
	);
	const pending = story.filter((section) => !done.has(section.index + 1));
	if (pending.length === 0) continue;
	await run(
		notes.book.source.file,
		(read) => {
			const book = notes.gathered ? gathered(read, notes.gathered) : read;
			// A chapter that does not fit in a call is left out: there is one of 38,000 words in Ulysses.
			const fits = pending.filter(
				(section) => tokens(JSON.stringify(whole(book, section.index).state).length) < 27_000
			);
			return fits.map((section) => ({
				...whole(book, section.index),
				variant: 'with the story so far',
				state: {
					'the story so far':
						story[story.indexOf(section) - 1]?.soFar ?? 'Nothing yet: this is the first chapter.',
					...whole(book, section.index).state
				}
			}));
		},
		{ set: 'inContext', questions: sets.inContext },
		`What each chapter does to the people of the story, asked with what the reader knows so far beside it, from the reading notes of ${notes.model}.`
	);
}
