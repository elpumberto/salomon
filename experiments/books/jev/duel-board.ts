import { jevRecordsOf } from '../../../src/records.ts';
import { alone, board, ladders } from './scoreboard.ts';
import type { Scores } from './scoreboard.ts';

/**
 * How often each book's passages came out over their own plain retelling, from the records and
 * asking nothing: by question, with how long the retellings were, and by the one yardstick.
 */

const mean = (values: number[]) => values.reduce((sum, one) => sum + one, 0) / (values.length || 1);
const ids = ['better', 'enjoy', 'lesson'];
const scores: Record<string, Scores> = Object.fromEntries(ids.map((id) => [id, {}]));

console.log(`${''.padEnd(34)}better  enjoy   lesson  retelling's length`);
for (const ladder of [...ladders, alone]) {
	for (const slug of ladder) {
		const records = await jevRecordsOf(slug);
		const duel = records.findLast((record) => record.by.questions === 'duel');
		if (!duel) continue;
		const won = (id: string) =>
			mean(
				duel.found.map((one) => {
					const side = one.variant?.startsWith('first') ? 'first' : 'second';
					const answer = one.answers[id];
					return answer && 'choice' in answer ? (answer.probabilities[side] ?? 0) : 0;
				})
			);
		const length = mean(
			duel.found.map((one) => Number(one.variant?.match(/([\d.]+) of its length/)?.[1] ?? 1))
		);
		for (const id of ids) (scores[id] ??= {})[slug] = { merit: won(id) };
		console.log(
			`${slug.padEnd(34)}${ids.map((id) => won(id).toFixed(2).padEnd(8)).join('')}${length.toFixed(2)}`
		);
	}
	console.log();
}
for (const id of ids) {
	const { inOrder, pairs, margin } = board(scores[id] ?? {});
	console.log(`${id.padEnd(8)} ${inOrder} of ${pairs} pairs in order, mean margin ${margin}`);
}
