import { choice, noul, score } from '@typesafe-ai/sdk';
import type { Questions } from '@typesafe-ai/sdk';
import { across } from '../../../src/judge.ts';
import { listed } from '../../../src/library.ts';
import { sample } from '../../../src/panel.ts';
import { sets } from '../../../src/questions.ts';
import { run } from './run.ts';
import { all } from './scoreboard.ts';

/**
 * Other ways of judging the same twenty books, to be set against the one in use by one yardstick:
 * twelve passages a book, evenly spread over its story and cut across its sections, of a size
 * given in words, asked one set of questions. `node variants.ts passage 3000`, `node variants.ts
 * gut 1000`. Twelve passages order the ladders as the whole book does, which is what makes trying
 * many ways cheap.
 */

const piece = '`chapter` is a passage of a novel. ';

/**
 * Not a rubric: what a reader, an editor or a teacher would do with the passage. Whether asking
 * about behaviour tells more than asking about qualities is what is being tried.
 */
export const gut = {
	underline: score(`${piece}What would a reader mark in it to keep?`, [
		'A reader would mark nothing in this passage',
		'A reader might mark a sentence of this passage for what it says',
		'A reader would mark a sentence of this passage for how it is said',
		'A reader would copy out more than one sentence of this passage, for how they are said'
	]),
	draft: choice(`${piece}What does it read like?`, {
		first: 'A first draft, written fast and not gone over',
		worked: 'A text gone over until it was clean',
		finished: 'A text in which every word has been weighed'
	}),
	editor: choice(`${piece}What would a good editor do with it?`, {
		cut: 'Cut most of it',
		trim: 'Trim it here and there',
		leave: 'Leave it as it is'
	}),
	memory: choice(`${piece}A week after reading it, what would a reader remember of it?`, {
		nothing: 'Nothing',
		events: 'What happened in it',
		feeling: 'How it made them feel',
		image: 'An image or a phrase from it'
	}),
	slush: choice(
		`${piece}Sent to a publisher today with no name on it, what would become of the book it is from?`,
		{
			rejected: 'It would be turned down within a page',
			read: 'It would be read with interest and turned down',
			wanted: 'It would be taken on'
		}
	),
	anyone: score(`${piece}Who could have written it?`, [
		'Anyone who writes could have written this passage',
		'A competent professional could have written this passage',
		'Only a writer with a manner of their own could have written this passage'
	]),
	lesson: noul(
		`${piece}Would a teacher of writing give it to a class as an example to learn from?`
	),
	warning: noul(
		`${piece}Would a teacher of writing give it to a class as an example of what not to do?`
	),
	again: noul(
		`${piece}Would a reader who has finished the book come back to read this passage again?`
	),
	aloud: noul(`${piece}Would it be a pleasure to read aloud?`),
	skip: score(`${piece}How would a reader go through it?`, [
		'A reader would read every word of this passage',
		'A reader would skim some paragraphs of this passage',
		'A reader would skip ahead to where something happens'
	]),
	lost: score(`${piece}How far would it take a reader in?`, [
		'A reader would stay aware of reading words on a page',
		'A reader would follow this passage with interest',
		'A reader would forget where they are while reading this passage'
	]),
	stop: noul(
		`${piece}Reaching the end of it, would a reader rather go on reading than stop for the day?`
	),
	audience: choice(`${piece}Whom is it written for?`, {
		children: 'Children',
		wide: 'The widest public, to pass the time',
		general: 'Readers in general',
		literary: 'Readers who read for the writing'
	})
} satisfies Questions;

// Only when run, not when the questions are taken from here by another experiment.
if (import.meta.main) {
	const [which = 'passage', size = '1000'] = process.argv.slice(2);
	const questions: Questions = which === 'gut' ? gut : sets.passage;
	const books = (await listed()).filter(({ slug }) => all.includes(slug));

	for (const { slug, story = '' } of books) {
		const indexes = story.split(',').flatMap((part) => {
			const [from = 1, to = from] = part.split('-').map(Number);
			return Array.from({ length: to - from + 1 }, (_, step) => from - 1 + step);
		});
		await run(
			`${slug}.epub`,
			(book) => sample(across(book, indexes, Number(size)), 12),
			{ set: which, questions },
			`Variant: ${which} at ${size} words. Twelve passages spread over the story, cut across its sections.`
		);
	}
}
