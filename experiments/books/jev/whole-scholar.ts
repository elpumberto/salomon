import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { noul, score } from '@typesafe-ai/sdk';
import type { Notes } from '../../../src/notes.ts';
import { outline } from '../../../src/outline.ts';
import { books, run } from './run.ts';

/**
 * The scholar's questions of `scholar.ts`, those of what will become of the book, put not to a
 * passage but to the outline of the whole book made from the reading notes, as `whole.ts` puts
 * the questions of the whole book. Said before any was asked, 2026-09-22: what the outline holds
 * that a passage does not is the shape and the matter of the whole, where what Don Quijote or
 * Dracula founded would show if it shows anywhere; so the outline's answers are set against the
 * standing on the books that have an outline, beside merit and the scholar's mean of the
 * passages on the same books. One call a book; less than a cent. The same caution as for the
 * passages holds: an outline of a famous book is as recognisable as its pages.
 *
 *   node experiments/books/jev/whole-scholar.ts [--go]
 */

const go = process.argv.includes('--go');
const whole =
	'`chapters` is the outline of a novel, a summary of each of its chapters in order; `threads` lists the questions its story raises and where each is settled; `people` lists its characters and what changes for each. ';
export const questions = {
	essay: score(`${whole}How much would a critic find to say about this novel?`, [
		'A critic would find nothing to say about this novel',
		'A critic would give this novel a paragraph in a survey of its kind',
		'A critic would find an essay in this novel',
		'A critic would find more in this novel than an essay could hold'
	]),
	course: score(`${whole}What would become of it in a university course on the novel?`, [
		'This novel would not be assigned',
		'This novel would be read as an example of its genre',
		'This novel would be read for how it is made',
		'This novel would be read as a turn in what the novel can do'
	]),
	imitate: noul(`${whole}Would later writers imitate the way it is made?`),
	century: noul(`${whole}Would it still be read a century from now?`),
	founded: noul(
		`${whole}Did it start something: a kind of novel, a figure, a way of telling that others took up?`
	)
};
export const set = 'whole-scholar';

const dir = join(books, 'notes');
const todo: { file: string; notes: Notes }[] = [];
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
	if (asked.some((record) => record.by.questions === set)) continue;
	todo.push({ file, notes });
}
console.log(`${todo.length} books with notes to ask, one call each`);
if (!go) {
	console.log('Nothing was sent to Jev. With --go, it is.');
	process.exit(0);
}
for (const { notes } of todo) {
	const full = outline(notes);
	const long = JSON.stringify(full).split(' ').length > 17_000;
	const state = long ? outline(notes, { brief: true }) : full;
	const words = JSON.stringify(state).split(' ').length;
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
		{ set, questions },
		"The scholar's questions, of what will become of the book, put to the outline made from the reading notes."
	);
}
