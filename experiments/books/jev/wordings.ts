import { choice, noul, score } from '@typesafe-ai/sdk';
import type { Questions } from '@typesafe-ai/sdk';

/**
 * Three other wordings of the fourteen behavioural questions of the valuation (`gut` in
 * `src/questions.ts`): the same things asked in other words, the levels and options in the same
 * order and each still standing alone. Rewording a level was found to move an answer a whole
 * level in the middle of a scale; so the same passages are asked in every wording, and what the
 * wordings agree on is the answer, and how far they part is its error.
 */

const piece = '`chapter` is a passage of a novel. ';

export const wordings: Record<string, Questions> = {
	second: {
		underline: score(`${piece}Is there anything in it a reader would want to keep?`, [
			'Nothing in this passage would make a reader reach for a pencil',
			'Something said in this passage might make a reader note it down',
			'The way something is said in this passage would make a reader note it down',
			'A reader would copy out several sentences of this passage for the way they are written'
		]),
		draft: choice(`${piece}How much work has gone into the writing?`, {
			first: 'Written quickly and left as it came',
			worked: 'Revised until it was tidy',
			finished: 'Every word chosen with care'
		}),
		editor: choice(`${piece}If a good editor had it on the desk, what would they do?`, {
			cut: 'Strike out most of it',
			trim: 'Tighten it in places',
			leave: 'Pass it as it stands'
		}),
		memory: choice(`${piece}What of it would stay with a reader a week later?`, {
			nothing: 'None of it',
			events: 'The things that happen in it',
			feeling: 'The feeling it left',
			image: 'A picture or a line from it'
		}),
		slush: choice(
			`${piece}If the novel it belongs to reached a publisher today without a name attached, what would happen to it?`,
			{
				rejected: 'Declined after the first page',
				read: 'Read through with interest and then declined',
				wanted: 'Accepted'
			}
		),
		anyone: score(`${piece}How particular is the hand that wrote it?`, [
			'Any person who writes could have produced this passage',
			'A capable professional could have produced this passage',
			'Only a writer with a voice of their own could have produced this passage'
		]),
		lesson: noul(
			`${piece}Would someone who teaches writing show it to students as something to learn from?`
		),
		warning: noul(
			`${piece}Would someone who teaches writing show it to students as something to avoid?`
		),
		again: noul(
			`${piece}Once the book was finished, would a reader turn back to this passage to read it once more?`
		),
		aloud: noul(`${piece}Would it be enjoyable to read out loud?`),
		skip: score(`${piece}How would a reader move through it?`, [
			'A reader would take in every word of this passage',
			'A reader would pass quickly over some paragraphs of this passage',
			'A reader would jump ahead to where something happens'
		]),
		lost: score(`${piece}How deep does it draw a reader in?`, [
			'A reader would remain conscious of reading words on a page',
			'A reader would follow this passage with interest',
			'A reader would lose track of where they are while reading this passage'
		]),
		stop: noul(
			`${piece}At the end of it, would a reader sooner keep reading than put the book down for the day?`
		),
		audience: choice(`${piece}Who is it meant for?`, {
			children: 'Children',
			wide: 'The broadest public, for entertainment',
			general: 'Readers at large',
			literary: 'Readers who come for the prose'
		})
	},
	third: {
		underline: score(`${piece}What in it deserves to be marked?`, [
			'There is nothing in this passage worth marking',
			'There is a thought in this passage worth marking',
			'There is a sentence in this passage worth marking for its wording',
			'There are several sentences in this passage worth copying out for their wording'
		]),
		draft: choice(`${piece}What stage of writing does it seem to be at?`, {
			first: 'A rough first version, never revised',
			worked: 'A version polished until it reads cleanly',
			finished: 'A version in which each word has been considered'
		}),
		editor: choice(`${piece}What does it need from an editor?`, {
			cut: 'Most of it removed',
			trim: 'Small cuts here and there',
			leave: 'Nothing: it can stand as it is'
		}),
		memory: choice(`${piece}Seven days on, what would remain of it in the mind?`, {
			nothing: 'Nothing at all',
			events: 'What took place',
			feeling: 'The mood it left behind',
			image: 'An image or a phrase'
		}),
		slush: choice(
			`${piece}Submitted anonymously to a publishing house now, what would the fate of its novel be?`,
			{
				rejected: 'Rejected within a page',
				read: 'Read with interest but rejected',
				wanted: 'Taken on'
			}
		),
		anyone: score(`${piece}Who could have written it?`, [
			'Anybody who puts pen to paper could have written this passage',
			'A competent working writer could have written this passage',
			'Nobody but a writer with a manner all their own could have written this passage'
		]),
		lesson: noul(`${piece}Would a writing teacher use it in class as a model?`),
		warning: noul(`${piece}Would a writing teacher use it in class as a warning?`),
		again: noul(
			`${piece}Would a reader who had reached the end of the novel go back and read this passage a second time?`
		),
		aloud: noul(`${piece}Would reading it aloud be a pleasure?`),
		skip: score(`${piece}What would a reader do with it?`, [
			'A reader would read this passage word for word',
			'A reader would skim parts of this passage',
			'A reader would skip forward from this passage to the next event'
		]),
		lost: score(`${piece}How absorbing is it?`, [
			'A reader would not forget they are reading',
			'A reader would be interested and keep going',
			'A reader would be so absorbed as to forget their surroundings'
		]),
		stop: noul(
			`${piece}Having finished it, would a reader want to go on rather than stop for the night?`
		),
		audience: choice(`${piece}Which readers is it for?`, {
			children: 'Young readers',
			wide: 'Everyone, as a pastime',
			general: 'The general reader',
			literary: 'Those who read for the sake of the writing'
		})
	},
	fourth: {
		underline: score(`${piece}How much of it would a reader underline?`, [
			'A reader would underline nothing here',
			'A reader might underline one sentence here for its meaning',
			'A reader would underline one sentence here for its phrasing',
			'A reader would underline sentence after sentence here for the phrasing'
		]),
		draft: choice(`${piece}Which best describes the state of the prose?`, {
			first: 'Dashed off and not looked at again',
			worked: 'Gone over until clean',
			finished: 'Weighed word by word'
		}),
		editor: choice(`${piece}How would a skilled editor treat it?`, {
			cut: 'Cut it down to a fraction',
			trim: 'Prune it lightly',
			leave: 'Leave it untouched'
		}),
		memory: choice(`${piece}A week afterwards, what would a reader recall of it?`, {
			nothing: 'Nothing whatever',
			events: 'The events',
			feeling: 'The feeling',
			image: 'A picture or a turn of phrase'
		}),
		slush: choice(
			`${piece}Sent unsigned to a publisher this year, what would become of the book it comes from?`,
			{
				rejected: 'Turned away after a page',
				read: 'Read with interest, then turned away',
				wanted: 'Signed'
			}
		),
		anyone: score(`${piece}How distinctive is the writing?`, [
			'This passage could be the work of anyone at all who writes',
			'This passage could be the work of any competent professional',
			'This passage could only be the work of a writer with an unmistakable manner'
		]),
		lesson: noul(`${piece}Would a teacher of writing hold it up as an example to follow?`),
		warning: noul(
			`${piece}Would a teacher of writing hold it up as an example of what goes wrong?`
		),
		again: noul(`${piece}Would a reader, the book done, return to this passage?`),
		aloud: noul(`${piece}Would it give pleasure spoken aloud?`),
		skip: score(`${piece}How closely would it be read?`, [
			'Every word of this passage would be read',
			'Some paragraphs of this passage would be skimmed',
			'This passage would be skipped in search of the next thing that happens'
		]),
		lost: score(`${piece}How far would a reader be carried?`, [
			'A reader would keep noticing the words on the page',
			'A reader would follow along with interest',
			'A reader would forget where they were sitting'
		]),
		stop: noul(`${piece}At its close, would a reader choose to carry on rather than stop?`),
		audience: choice(`${piece}For whom is it written?`, {
			children: 'The young',
			wide: 'The mass public, for diversion',
			general: 'Ordinary readers',
			literary: 'Readers who read for style'
		})
	}
};
