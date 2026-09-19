import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { choice } from '@typesafe-ai/sdk';
import { measure, pieces } from '../../../src/judge.ts';
import type { Passage } from '../../../src/judge.ts';
import { readBook } from '../../../src/read/index.ts';
import { rewritten } from './rewrites.ts';
import { books, run, spread } from './run.ts';

/**
 * Every passage against every other, side by side and both ways round, which is where Jev is
 * steadiest: four pieces of each book of the ladder of adventures, and a piece of the middle one
 * as it is, told dull and told overdone. How often a passage is chosen places it among the rest,
 * and what is looked for is whether the books come out in the order of the ladder more sharply
 * than when each passage is scored alone.
 */

const pair = '`first` and `second` are two passages of novels. ';
const options = { first: 'The passage in `first`', second: 'The passage in `second`' };
const questions = {
	better: choice(`${pair}Which of the two is the better written?`, options),
	plainer: choice(
		`${pair}Which of the two keeps further from flowery wording and show-off vocabulary?`,
		options
	),
	people: choice(`${pair}Which of the two shows more insight into its characters?`, options),
	world: choice(`${pair}Which of the two builds its place and atmosphere better?`, options),
	pull: choice(`${pair}Which of the two would make a reader more eager to read on?`, options)
};

const load = async (file: string, sections: number[], label: string) =>
	spread(sections)(await readBook(join(books, file))).map((one, at) => ({
		label: `${label}${at + 1}`,
		text: one.state.chapter ?? ''
	}));
const mines = await readBook(join(books, 'king-solomons-mines.epub'));
const rewrite = async (way: string) =>
	JSON.parse(await readFile(rewritten('king-solomons-mines.9.4', way), 'utf8')).text as string;
const items = [
	...(await load('treasure-island.epub', [2, 12, 23, 35], 'island')),
	...(await load('king-solomons-mines.epub', [5, 11, 17, 24], 'mines')),
	...(await load('tarzan-of-the-apes.epub', [1, 9, 18, 28], 'tarzan')),
	{ label: 'desert', text: pieces(mines, 8, 1000)[3]?.state.chapter ?? '' },
	{ label: 'desert-flat', text: await rewrite('flat') },
	{ label: 'desert-purple', text: await rewrite('purple') }
];

const passages: Passage[] = [];
items.forEach((one, at) =>
	items.slice(at + 1).forEach((other) => {
		for (const [first, second] of [
			[one, other],
			[other, one]
		] as const) {
			passages.push({
				section: passages.length + 1,
				variant: `${first.label} / ${second.label}`,
				state: { first: first.text, second: second.text },
				measured: measure([first.text, second.text], true)
			});
		}
	})
);

const judged = await run(
	'king-solomons-mines.epub',
	() => passages,
	{ set: 'side by side, all against all', questions },
	'Tuning: every passage against every other, both ways round. Here a section is the number of the pair, and `variant` names the two passages: pieces of Treasure Island, King Solomon’s Mines and Tarzan of the Apes, and a piece of the second as it is and rewritten dull and overdone by gemini-3.1-flash-lite.'
);

// How often each passage was chosen, as the probability Jev gave it, over all it was set against.
const chosen = new Map<string, Record<string, number[]>>();
for (const { variant = '', answers } of judged) {
	const [first = '', second = ''] = variant.split(' / ');
	for (const [id, answer] of Object.entries(answers)) {
		if (!('choice' in answer)) continue;
		for (const [label, side] of [
			[first, 'first'],
			[second, 'second']
		] as const) {
			const mine = chosen.get(label) ?? {};
			(mine[id] ??= []).push(answer.probabilities[side] ?? 0);
			chosen.set(label, mine);
		}
	}
}
const mean = (values: number[] = []) => values.reduce((sum, one) => sum + one, 0) / values.length;
const ids = Object.keys(questions);
console.log(`\n${''.padEnd(16)}${ids.map((id) => id.padEnd(9)).join('')}`);
for (const [label, mine] of [...chosen].sort(
	([, one], [, other]) => mean(other.better) - mean(one.better)
)) {
	console.log(label.padEnd(16) + ids.map((id) => mean(mine[id]).toFixed(2).padEnd(9)).join(''));
}
// Whether the way round mattered: the same pair, how far the two answers were from agreeing.
const swing = ids.map((id) => {
	const gaps: number[] = [];
	for (let at = 0; at < judged.length; at += 2) {
		const one = judged[at]?.answers[id];
		const other = judged[at + 1]?.answers[id];
		if (one && other && 'choice' in one && 'choice' in other) {
			gaps.push(Math.abs((one.probabilities.first ?? 0) - (other.probabilities.second ?? 0)));
		}
	}
	return `${id} ${mean(gaps).toFixed(2)}`;
});
console.log(`\nmean gap between the two ways round: ${swing.join(' · ')}`);
