import { readFile } from 'node:fs/promises';
import { noul, score } from '@typesafe-ai/sdk';
import type { Book } from '../../../src/book.ts';
import { measure, pieces, whole } from '../../../src/judge.ts';
import type { Passage } from '../../../src/judge.ts';
import { rewritten } from './rewrites.ts';
import { run } from './run.ts';

/**
 * Whether Jev can tell good writing from bad. The questions are of taste, each about one thing a
 * reader can point at. They are put to three kinds of text: passages told worse on purpose, which
 * hold what happens still; a novel known for being badly written; and chapters of two that last.
 */

const about = '`chapter` is a passage of a novel. ';

export const taste = {
	fresh: score(`${about}How much of its wording is the writer's own, and how much stock phrases?`, [
		'Stock phrases and clichés throughout: the wording any writer would reach for first',
		'Plain, serviceable wording, with a stock phrase here and there',
		"Precise wording, with now and then an image or a turn of phrase that is the writer's own",
		'Striking wording throughout: images and turns of phrase that a reader remembers'
	]),
	clear: score(`${about}How easy is it to follow, sentence by sentence?`, [
		'Hard to follow: sentences so tangled or so ornate that they have to be read twice',
		'Mostly clear, with some sentences that have to be read twice',
		'Clear throughout: every sentence says what it means at first reading'
	]),
	overdone: score(`${about}How much does the writing overdo it?`, [
		'Restrained: no more words, ornament or emotion than what is told needs',
		'Now and then more adjectives, ornament or emotion than what is told needs',
		'Overwrought throughout: piled-up adjectives, exclamations, grand words for small things'
	]),
	shown: score(`${about}How does the reader learn what the characters feel?`, [
		'The narrator names the feelings outright: he was angry, she felt sad',
		'The narrator mostly names the feelings, and sometimes they show in what a character does or says',
		'The feelings mostly show in what the characters do, say and notice, and are sometimes named',
		'The feelings show in what the characters do, say and notice, and are left for the reader to name'
	]),
	people: score(`${about}How much are its characters like real people?`, [
		'Figures of a single trait: the hero, the villain, the beauty, the fool',
		'Recognisable types, with a personal touch here and there',
		"People with motives of their own, who want things that get in each other's way",
		'People with contradictions, who surprise the reader and still ring true'
	]),
	insight: score(`${about}How much does it tell the reader about how people are?`, [
		'Nothing beyond the events of the story',
		'A commonplace remark or two about people or life',
		'Observations on how people think and behave that ring true',
		'It shows something about people in a way the reader had not seen it put before'
	]),
	pull: score(`${about}How much does it make the reader want to go on reading?`, [
		'Nothing is at issue, and the reader has no reason to go on',
		'The reader is mildly curious about what comes next',
		'The reader wants to know how what is at issue turns out',
		'The reader has to know what happens next, and it is hard to stop reading'
	]),
	drag: score(`${about}How much of it could be cut without loss?`, [
		'Nothing: every part of it moves the story on or gives the reader something',
		'A part here and there goes on longer than it needs',
		'Long stretches repeat what is known or dwell on what does not matter'
	]),
	fun: noul(`${about}Would most readers of today enjoy reading it?`),
	fine: noul(`${about}Is it finely written, the work of a writer in full command of the craft?`),
	// What happens, to see that it holds still between a passage and its rewrites.
	danger: score(`${about}How much physical danger are the characters in?`, [
		'None: nobody is at risk of being hurt',
		'Hardship or a threat: hunger, thirst, exhaustion, or someone who says they will harm them',
		'Some of the characters are close to dying',
		'The characters fight for their lives, and people are killed'
	])
};

/** A passage and, after it, the same told worse in each way. */
async function withRewrites(book: Book, passage: Passage, slug: string): Promise<Passage[]> {
	const quotationMarks = book.sections.some((one) => one.paragraphs.some((p) => p.includes('“')));
	const worse = await Promise.all(
		['flat', 'purple'].map(async (way) => {
			const { text, by } = JSON.parse(await readFile(rewritten(slug, way), 'utf8'));
			return {
				...passage,
				variant: `${way}, by ${by}`,
				state: { chapter: text as string },
				measured: measure((text as string).split(/\n{2,}/), quotationMarks)
			};
		})
	);
	return [passage, ...worse];
}

const remarks =
	'Experiment 4: questions of taste, put to passages told worse on purpose by a language model, to a novel known for bad writing and to chapters of two that last.';

if (import.meta.main) {
	const asked = { set: 'taste', questions: taste };
	const held: Record<string, Passage[]> = {};
	await run(
		'king-solomons-mines.epub',
		(book) => {
			const fourth = pieces(book, 8, 1000)[3];
			if (!fourth) throw new Error('No such piece');
			return [fourth, whole(book, 4), whole(book, 17), whole(book, 20)];
		},
		asked,
		remarks
	);
	for (const [file, slug, passage] of [
		[
			'king-solomons-mines.epub',
			'king-solomons-mines.9.4',
			(book: Book) => pieces(book, 8, 1000)[3]
		],
		['pride-and-prejudice.epub', 'pride-and-prejudice.2', (book: Book) => whole(book, 1)]
	] as const) {
		const { readBook } = await import('../../../src/read/index.ts');
		const { books } = await import('./run.ts');
		const { join } = await import('node:path');
		const book = await readBook(join(books, file));
		const original = passage(book);
		if (original) held[file] = (await withRewrites(book, original, slug)).slice(1);
	}
	await run(
		'king-solomons-mines.epub',
		() => held['king-solomons-mines.epub'] ?? [],
		asked,
		remarks
	);
	await run(
		'pride-and-prejudice.epub',
		(book) => [
			whole(book, 1),
			...(held['pride-and-prejudice.epub'] ?? []),
			whole(book, 34),
			whole(book, 35)
		],
		asked,
		remarks
	);
	await run(
		'irene-iddesleigh.epub',
		(book) => [2, 5, 6, 9].map((index) => whole(book, index)),
		asked,
		remarks
	);
}
