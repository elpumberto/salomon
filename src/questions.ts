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
 * What is asked of a passage of about a thousand words, in three layers: what kind of reading it
 * is, which says nothing of how good; faults a reader can point at; and what those who know hold
 * that good writing has. Each is taken from a published rubric, a scale of reading research or a
 * catalogue of the craft, and worded so that ornament, the age of the prose or the genre do not
 * pass for merit or for the lack of it: where they come from is in `docs/books/`.
 */
const passage = {
	// What kind of reading it is.
	happens: score(`${piece}How much has changed by the end of it?`, [
		'At the end of the passage everything stands exactly as it did at the start',
		'At the end a small thing stands differently from the start',
		"At the end a character's situation, knowledge or relationship is clearly different from the start",
		"At the end a character's situation is transformed and cannot go back to what it was"
	]),
	talk: score(
		`${piece}How much of it is conversation between the characters, and how much narration?`,
		[
			'All or nearly all narration: no conversation, or a line or two',
			'Mostly narration, with a few short exchanges between the characters',
			'About as much conversation as narration',
			'Mostly conversation, with some narration between the exchanges',
			'All or nearly all conversation'
		]
	),
	place: score(`${piece}How well can the reader picture where it happens?`, [
		'Nothing in the passage says where this happens: voices talk in an empty room',
		'The place is named or hinted at and cannot be pictured',
		'The place can be pictured clearly from what the text gives',
		'The place can be pictured vividly, with what it sounds, smells and feels like'
	]),
	feeling: score(`${piece}How much of what a character feels reaches the reader?`, [
		"No character's feeling can be made out from the passage",
		"A character's feeling can be made out, and it is a mild one",
		"A character's feeling is plain, and it is a strong one",
		"A character's strong feeling is conveyed so closely that the reader is placed inside it"
	]),
	stakes: score(`${piece}What is at risk for the central character in it?`, [
		'Nothing is at risk for the central character',
		"The central character's comfort or convenience is at risk",
		'Something the central character cares about deeply is at risk',
		"The central character's life, love or future is at risk"
	]),
	funny: score(`${piece}How much of it is meant to be funny?`, [
		'None of it: it is told in earnest throughout',
		'It is told in earnest, with a light touch of wit or comedy here and there',
		'Wit, comedy or irony run through the whole passage'
	]),
	effort: score(`${piece}How much effort does its language ask of the reader?`, [
		'The language is explicit, literal and straightforward: nothing in it asks for effort',
		'The language is largely explicit, with an occasional figurative or unfamiliar turn',
		'The language is fairly complex: figurative or ironic in places, with sentences that must be held in mind',
		'The language is dense and complex: abstract, ironic or figurative throughout'
	]),
	archaic: noul(
		`${piece}Is its vocabulary or spelling archaic or otherwise unfamiliar to a present-day reader?`
	),
	doorway: choice(`${piece}What is the main pull of it for a reader?`, {
		story: 'Wanting to know what happens next',
		people: 'The people in it',
		place: 'The place and its atmosphere',
		writing: 'The writing itself'
	}),

	// Faults a reader can point at.
	readymade: score(`${piece}How much of its wording is ready-made?`, [
		'Almost every paragraph holds a phrase or comparison that readers have met many times in print',
		'Several phrases or comparisons in the passage are ones readers have met many times in print',
		"One or two ready-made phrases turn up, and the rest is the writer's own wording",
		'No ready-made phrase or comparison can be found in the passage'
	]),
	overwritten: score(`${piece}Is its wording more elaborate than what it tells calls for?`, [
		'The wording is never more elaborate than what it describes calls for',
		'In one or two places the wording is more elaborate than what is being told calls for',
		'Through much of the passage the wording is more elaborate than what is being told calls for: fancy words where short clear ones would do, image piled on image for one thing',
		'The passage is sprawling sentences, abstract words and heaps of adjectives, adverbs and metaphors that convey little information'
	]),
	padding: score(`${piece}How much of it could be removed without the reader losing anything?`, [
		'Nothing could be removed from the passage without the reader losing something',
		'A few sentences could be removed without the reader losing anything',
		'Whole paragraphs could be removed without the reader losing anything',
		'Most of the passage could be removed without the reader losing anything'
	]),
	unclear: noul(
		`${piece}Is there any moment in it where it is unclear who is acting or speaking, or what physically happened?`
	),
	explains: score(`${piece}How much does the narrator explain what is already clear?`, [
		'The narrator never explains what an action or a line meant: they are left to speak for themselves',
		'Once or twice the narrator adds what an action or a line meant when it was already clear from it',
		'The narrator keeps explaining what actions and lines meant when it was already clear from them'
	]),
	steers: score(`${piece}How much does the telling instruct the reader how to react?`, [
		'Events and people are presented, and the reaction is left to the reader',
		'Now and then an event or a person is labelled for the reader as horrible, touching, noble or the like',
		'The reader is told throughout how to feel about what happens: events and people come labelled as horrible, touching, noble or the like'
	]),
	melodrama: noul(
		`${piece}Does a character's emotional reaction in it go well beyond what the situation, as shown, would explain?`
	),
	informs: noul(
		`${piece}Does a character tell another something the listener obviously already knows?`
	),
	strings: score(
		`${piece}How much is what happens and what is said arranged for the reader's benefit?`,
		[
			'What is done and said follows from the characters and their situation',
			"At moments things are arranged for the reader's benefit: a character says what the listener must already know, or an event comes just when the plot needs it",
			'Throughout, people speak and act to inform the reader or to move the plot along, and not as people in their situation would'
		]
	),

	// What good writing is held to have.
	specific: score(`${piece}How particular are its physical details?`, [
		'There are no physical details, or only ones that could belong to any scene of this kind',
		'The physical details are the ones a reader would expect a scene of this kind to have',
		'The physical details belong to this particular place, moment and people and would not fit another scene',
		'The physical details belong to this place and moment, and some are of the kind only someone who had really watched would notice'
	]),
	phrasing: choice(`${piece}What is its wording mostly like?`, {
		readymade: 'Ready-made expressions',
		plain: 'Plain and unremarkable',
		exact: 'Plain but exact',
		apt: 'Often unexpected and apt',
		strained: 'Unexpected but strained'
	}),
	figures: choice(`${piece}What are its comparisons and metaphors mostly like?`, {
		none: 'There are none, or hardly any',
		familiar: 'Familiar ones, that readers have met before',
		true: 'New ones, that make the thing clearer or truer',
		forced: 'New ones, that are decorative, forced or do not hold up when examined'
	}),
	emotion: choice(`${piece}What is its emotional weight?`, {
		slight: 'Slight, and the passage does not seek more',
		earned: 'Sought, and earned by what the passage has shown',
		asserted: 'Sought, but asserted through emotive words or stock situations',
		absent: 'Absent, where the events call for it'
	}),
	insight: score(`${piece}What does it show about how people are?`, [
		'The passage shows nothing in particular about how people behave, think or feel',
		'The passage shows truths about people that everyone already knows',
		'The passage shows a recognisable truth about people, seen with unusual precision',
		'The passage shows something true about people that a reader would not have put into words before'
	]),
	voice: score(`${piece}How much of its own has the voice that tells it?`, [
		'The narrating voice is anonymous and could be exchanged with that of many books',
		'The narrating voice is competent and conventional',
		'The narrating voice is recognisable in its habits',
		'The narrating voice is unmistakable, with its own way of seeing'
	]),
	wants: noul(`${piece}Is it clear what its main character wants at this moment?`),
	friction: noul(
		`${piece}Is there friction between characters in it, or a conflict inside a character?`
	),
	open: noul(
		`${piece}At the end of it, is there a specific question that the text has raised and not yet answered?`
	),
	prose: score(`${piece}How good is its prose, sentence by sentence?`, [
		'The prose only conveys information: no sentence has force or shape of its own',
		'The prose is competent: correct and clear, with nothing a reader would stop over',
		'The prose is controlled and precise: each sentence says exactly what it means to say',
		'The prose is striking: it holds sentences a reader would go back to and reread for their own sake'
	]),
	// The whole judgment in one question, to set beside what the others add up to.
	fine: noul(`${piece}Is it finely written, the work of a writer in full command of the craft?`)
} satisfies Questions;

const pair = '`first` and `second` are two passages of novels. ';
const either = { first: 'The passage in `first`', second: 'The passage in `second`' };

/** Two passages side by side: asked both ways round, since the place of a passage weighs a little. */
const sideBySide = {
	better: choice(`${pair}Which of the two is the better written?`, either),
	pull: choice(`${pair}Which of the two would make a reader more eager to read on?`, either)
} satisfies Questions;

export const sets = { reading, passage, sideBySide } satisfies Record<string, Questions>;

export type SetName = keyof typeof sets;

/** Tells one wording of a set from another: a score is only to be set beside those got with the same. */
export function rulesHash(questions: Questions): string {
	return `sha256:${createHash('sha256').update(JSON.stringify(questions)).digest('hex').slice(0, 12)}`;
}
