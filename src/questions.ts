import { createHash } from 'node:crypto';
import { choice, noul, score } from '@typesafe-ai/sdk';
import type { Questions } from '@typesafe-ai/sdk';

/**
 * What Jev is asked about a chapter, in sets with a name. Jev reads a question to the letter and
 * weighs each level of a scale on its own, without seeing its number nor the levels beside it: so
 * a level says what a chapter at that level is like, in words that stand alone, and a question
 * asks about one thing. The chapter is in the state under `chapter`.
 */

const about = '`chapter` is a chapter of a novel. ';

/**
 * Whether Jev reads a chapter as a person would. Nothing here is a matter of taste: anyone who has
 * read the chapter can say where it falls, and two of the answers can be measured by code.
 */
const reading = {
	happens: score(`${about}How much happens in it?`, [
		'Nothing happens: the narrator explains, reflects or describes, and no event takes place',
		'Little happens: the characters talk, travel or wait, and they end the chapter much as they began it',
		'An event takes place that changes the situation of the characters',
		'One event follows another, and the situation of the characters changes more than once'
	]),
	danger: score(`${about}How much physical danger are the characters in?`, [
		'None: nobody is at risk of being hurt',
		'Hardship or a threat: hunger, thirst, exhaustion, or someone who says they will harm them',
		'Some of the characters are close to dying',
		'The characters fight for their lives, and people are killed'
	]),
	stakes: score(`${about}What do the characters stand to gain or lose in what happens in it?`, [
		'Nothing that matters to them',
		'Something they care about but could do without: comfort, a sum of money, their pride',
		'Something that changes the course of a life: a marriage, a fortune, a position, a friendship',
		'Their lives, or the lives of people close to them'
	]),
	talk: score(
		`${about}How much of it is conversation between the characters, and how much narration?`,
		[
			'All or nearly all narration: no conversation, or a line or two',
			'Mostly narration, with a few short exchanges between the characters',
			'About as much conversation as narration',
			'Mostly conversation, with some narration between the exchanges',
			'All or nearly all conversation'
		]
	),
	scenery: score(
		`${about}How much of it describes places, landscape, weather, buildings or objects?`,
		[
			'Places and things are named but not described',
			'Places or things are described in a few sentences here and there',
			'Places or things are described at length in several passages',
			'Most of the chapter describes places or things'
		]
	),
	feelings: score(`${about}How much does it tell of what the characters feel and think?`, [
		'Only what the characters do and say is told, not what they feel or think',
		'A feeling or a thought is mentioned now and then, in a few words',
		'What a character feels or thinks is told at length in some passages',
		'Most of the chapter tells what a character feels or thinks'
	]),
	humour: score(`${about}How funny or ironic is the telling?`, [
		'Told in earnest from beginning to end, with no jokes and no irony',
		'Mostly in earnest, with a joke or an ironic remark here and there',
		'Funny or ironic through much of the chapter'
	]),
	words: score(`${about}How hard are its words for a reader of today?`, [
		'Plain everyday words throughout',
		'Mostly plain words, with some that are old-fashioned or uncommon',
		'Many old-fashioned, learned or uncommon words'
	]),
	sentences: score(`${about}How long are its sentences?`, [
		'Short sentences, most of them of a single clause',
		'Sentences of ordinary length, some short and some long',
		'Long sentences of many clauses, one inside another'
	]),
	firstPerson: noul(
		`${about}Is it told in the first person, by a narrator who takes part in what happens?`
	),
	hook: noul(
		`${about}Does it end with something left unresolved that makes the reader want to know what comes next?`
	)
} satisfies Questions;

const piece = '`chapter` is a passage of a novel. ';

/**
 * What a book is valued by. Not a rubric: what a reader, an editor or a teacher would do with a
 * passage of some 3,000 words. Asked about what people do, Jev orders books of known standing
 * better than asked about the qualities of the writing, with half the questions:
 * `docs/books/other-ways.md`. Two of them are in no valuation and go to the profile: what would
 * become of it at a publisher's, and whom it is written for.
 */
const gut = {
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

const whole =
	'`chapters` is the outline of a novel, a summary of each of its chapters in order; `threads` lists the questions its story raises and where each is settled; `people` lists its characters and what changes for each. ';

/**
 * What only the whole book shows, asked of an outline made from the reading notes: how it is
 * built, how it ends, what becomes of its people. The outline is a language model's and tells what
 * happens, not how it is told: nothing here is about the writing.
 */
const book = {
	unity: score(`${whole}How much are the chapters parts of one whole?`, [
		'The chapters are episodes that could come in another order, or be left out, without the rest changing',
		'The chapters follow one another in time, and several lead to nothing later',
		'Most chapters follow from what came before and prepare what comes after',
		'Every chapter follows from what came before and prepares what comes after: the whole is one action'
	]),
	cause: choice(`${whole}Why do the main events of the story happen, mostly?`, {
		people: 'Because of what the characters decide and do',
		events: 'Because of earlier events of the story',
		chance: 'Because of outside events or coincidence',
		none: 'With no evident connection between them'
	}),
	settled: score(`${whole}What becomes of the questions the story raises?`, [
		'Most of what the story raises is dropped and never settled',
		'Some of what the story raises is settled, and several things are dropped',
		'Nearly all that the story raises is settled by the end, or pointedly left open'
	]),
	ending: choice(`${whole}What brings about the resolution at the end?`, {
		own: "The central character's own action",
		prepared: "Another character's action, or an event, that the story had prepared",
		unprepared: 'An outside event or a stroke of luck that the story had not prepared',
		none: 'Nothing is resolved'
	}),
	change: choice(`${whole}What has become of the central character by the end?`, {
		same: 'They are as they were at the start, and nothing new is revealed of them',
		seen: 'They are as they were at the start, but the reader sees them differently',
		steps: 'They have changed, by steps that the chapters show',
		abrupt: 'They have changed all at once, with no steps leading to it'
	}),
	rising: score(`${whole}How does the pressure on the central characters move across the book?`, [
		'The pressure on the central characters is much the same from beginning to end',
		'The pressure on the central characters rises and falls with no direction',
		'The pressure on the central characters rises, with rests, to a height near the end'
	]),
	wants: score(`${whole}How many of its people want something of their own?`, [
		'One character wants something, and the rest are there to help or to hinder',
		'Two sides want opposite things, and everyone belongs to one of them',
		"Several characters each want something of their own, and their wants get in each other's way"
	]),
	beyond: score(`${whole}How far do its concerns go beyond the people in it?`, [
		'The story concerns only the events and the people in it',
		'The story touches in passing on something that matters beyond the people in it',
		'Something that matters beyond the people in it is at the centre of the story'
	]),
	spare: noul(
		`${whole}Is there a storyline in it that could be taken out without the main story losing anything?`
	),
	turn: noul(
		`${whole}Does the story take a turn that the chapters before it did not lead one to expect, and that still follows from them?`
	)
} satisfies Questions;

const known =
	'`chapter` is a chapter of a novel, and `the story so far` tells what a reader knows on reaching it. ';

/**
 * What a chapter does to the people of the story, which takes knowing them: asked of a chapter
 * with what the reader knows so far beside it, from the reading notes. Whether someone can
 * surprise and still convince is the old test of a character with a life of their own.
 */
const inContext = {
	acts: choice(`${known}What does its main character do in it?`, {
		expected: 'What the story so far would lead one to expect of them',
		fitting:
			'Something the story so far did not lead one to expect, and which fits what is known of them',
		unfitting:
			'Something the story so far did not lead one to expect, and which does not fit what is known of them',
		nothing: 'Nothing of note'
	}),
	reveals: score(`${known}What does it show of its people?`, [
		'The chapter shows its people as the story so far had shown them',
		'The chapter adds a trait or a detail to someone the reader already knew',
		'The chapter shows a side of someone that the story so far had not shown, and that changes how the reader sees them'
	]),
	torn: score(`${known}Is anyone in it in two minds?`, [
		'Nobody in the chapter is in two minds about anything',
		'A character hesitates a moment before doing what they do',
		'A character is torn between two things they want or believe, and the chapter dwells on it'
	]),
	sides: choice(`${known}Whose side is the reader on in its main conflict?`, {
		none: 'There is no conflict between people in the chapter',
		one: 'One side is in the right and the other in the wrong',
		both: "Both sides have a real claim on the reader's sympathy"
	}),
	pays: score(`${known}What does it do with what the story so far had left pending?`, [
		'The chapter touches nothing that the story so far had left pending',
		'The chapter moves forward something that the story so far had left pending',
		'The chapter settles something that the story so far had left pending'
	])
} satisfies Questions;

export const sets = {
	gut,
	reading,
	book,
	inContext
} satisfies Record<string, Questions>;

export type SetName = keyof typeof sets;

/** Tells one wording of a set from another: a score is only to be set beside those got with the same. */
export function rulesHash(questions: Questions): string {
	return `sha256:${createHash('sha256').update(JSON.stringify(questions)).digest('hex').slice(0, 12)}`;
}
