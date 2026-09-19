import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Notes } from '../../../src/notes.ts';
import { outline } from '../../../src/outline.ts';
import { sets } from '../../../src/questions.ts';
import { books, run } from './run.ts';

/**
 * The questions of the whole book, put to the outline made from the reading notes of each book
 * that has notes taken by the model of the project, to the end. One call a book.
 */

const dir = join(books, 'notes');
for (const file of (await readdir(dir)).filter((one) => one.includes('gemini-3.1-flash-lite'))) {
	const notes: Notes = JSON.parse(await readFile(join(dir, file), 'utf8'));
	const slug = notes.book.source.file.replace(/\.[^.]+$/, '');
	const before = await readdir(join(books, '../records/books', slug)).catch(() => []);
	const asked = await Promise.all(
		before
			.filter((one) => one.includes('.jev.'))
			.map(async (one) =>
				JSON.parse(await readFile(join(books, '../records/books', slug, one), 'utf8'))
			)
	);
	// A book is asked once.
	if (asked.some((record) => record.by.questions === 'book')) continue;
	const full = outline(notes);
	// What fits in a call: some 17,000 words of outline.
	const long = JSON.stringify(full).split(' ').length > 17_000;
	const state = long ? outline(notes, { brief: true }) : full;
	const words = JSON.stringify(state).split(' ').length;
	console.log(
		`\n${notes.book.title}: ${state.chapters.length} chapters, ${state.threads.length} threads, ${state.people.length} people, ${words} words of outline`
	);
	await run(
		notes.book.source.file,
		() => [
			{
				section: (notes.sections[0]?.index ?? 0) + 1,
				through: (notes.sections.at(-1)?.index ?? 0) + 1,
				variant: `the outline from the notes of ${notes.model}${long ? ', in brief' : ''}`,
				state: Object.fromEntries(
					Object.entries(state).map(([field, lines]) => [field, lines.join('\n')])
				),
				measured: { words, spoken: null, wordsPerSentence: 0 }
			}
		],
		{ set: 'book', questions: sets.book },
		'The questions of the whole book, put to an outline made from the reading notes.'
	);
}
