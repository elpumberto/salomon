import { noul, score } from '@typesafe-ai/sdk';
import { whole } from '../../../src/judge.ts';
import { run } from './run.ts';

/**
 * How much a number owes to the words of its question. The same things as in the `reading` set,
 * asked otherwise: in other words, on a longer scale, as a yes or no, and with numbers for levels,
 * which is what Jev's documentation says not to do.
 */

const about = '`chapter` is a chapter of a novel. ';

const questions = {
	// The same four levels of `danger`, in other words.
	danger_reworded: score(`${about}How much are the bodies and lives of the characters at risk?`, [
		'Everyone is safe throughout the chapter',
		'The characters suffer from want or weariness, or are threatened with violence that does not come',
		'A character nearly dies',
		'There is fighting, and characters die in it'
	]),
	danger_numbers: score(
		`${about}Rate the physical danger the characters are in, from 0 for none to 3 for deadly.`,
		['0', '1', '2', '3']
	),
	// The same five levels of `talk`, in other words.
	talk_reworded: score(`${about}How much of the chapter is dialogue?`, [
		'The narrator tells everything, and the characters hardly speak',
		'The narrator tells most of it, and the characters exchange a few words now and then',
		'The chapter is divided evenly between what the narrator tells and what the characters say to each other',
		'The characters speaking to each other take up most of the chapter, and the narrator fills the gaps',
		'The chapter is characters speaking to each other, and the narrator hardly says a word'
	]),
	talk_yes: noul(`${about}Is more than half of it conversation between the characters?`),
	// `happens` tops out in a novel of adventures: two more levels above.
	happens_longer: score(`${about}How much happens in it?`, [
		'Nothing happens: the narrator explains, reflects or describes, and no event takes place',
		'The characters talk, travel or wait, and they end the chapter much as they began it',
		'One thing happens that changes the situation of the characters a little',
		'One thing happens that changes the situation of the characters for good',
		'Several things happen, each of which changes the situation of the characters',
		'So much happens that the whole story is turned around: the characters end the chapter in another world from the one they began it in'
	]),
	humour_reworded: score(`${about}How much does it try to make the reader smile?`, [
		'It does not try: the chapter is serious throughout',
		'It is serious, but a witty or comic remark comes up once or twice',
		'Wit, comedy or irony run through the whole chapter'
	]),
	hook_reworded: noul(
		`${about}When it ends, is the reader left in suspense about what will happen to the characters?`
	)
};

const remarks =
	'Experiment 3: the questions of the reading set asked otherwise, to see how much a number owes to the words of its question.';

await run(
	'king-solomons-mines.epub',
	(book) => [4, 6, 9, 16, 18, 21].map((section) => whole(book, section - 1)),
	{ set: 'wording', questions },
	remarks
);
await run(
	'pride-and-prejudice.epub',
	(book) => [2, 35, 36].map((section) => whole(book, section - 1)),
	{ set: 'wording', questions },
	remarks
);
