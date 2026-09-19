import { rulesHash } from '../../../src/questions.ts';
import { isValuation, jevRecordsOf } from '../../../src/records.ts';
import { passage } from './passage-questions.ts';
import { meritOf, readOf } from './passage-value.ts';
import { all, board } from './scoreboard.ts';
import type { Scores } from './scoreboard.ts';

/**
 * How sure the score of a book is, from the records and asking nothing: its pieces are drawn again
 * and again with replacement, a thousand times, and the score worked out each time. Then the same
 * with only so many pieces a book, to see how few would do.
 */

const pieces: Record<string, { merit: number; read: number }[]> = {};
for (const slug of all) {
	const records = await jevRecordsOf(slug);
	const whole = records.findLast((one) => one.by.rules === rulesHash(passage) && isValuation(one));
	pieces[slug] = (whole?.found ?? []).flatMap(({ answers }) => {
		const [merit, read] = [meritOf(answers), readOf(answers)];
		return merit === null || read === null ? [] : [{ merit, read }];
	});
}

const mean = (values: number[]) => values.reduce((sum, one) => sum + one, 0) / values.length;
const bestTenth = (values: number[]) =>
	mean([...values].sort((a, b) => b - a).slice(0, Math.max(1, Math.round(values.length / 10))));
const merit = (values: number[]) => 0.6 * mean(values) + 0.4 * bestTenth(values);
// A generator of numbers that gives the same ones every time, so that the table can be made again.
let seed = 20260919;
const random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const draw = <T>(from: T[], count: number) =>
	Array.from({ length: count }, () => from[Math.floor(random() * from.length)] as T);

function again(count?: number) {
	const runs = Array.from({ length: 1000 }, () => {
		const scores: Scores = {};
		for (const slug of all) {
			const drawn = draw(pieces[slug] ?? [], count ?? pieces[slug]?.length ?? 0);
			scores[slug] = {
				merit: merit(drawn.map((one) => one.merit)),
				read: mean(drawn.map((one) => one.read))
			};
		}
		return scores;
	});
	return runs;
}

const full = again();
console.log('book'.padEnd(34) + 'pieces  merit   ± (95%)   read    ± (95%)');
for (const slug of all) {
	const spread = (key: 'merit' | 'read') => {
		const values = full.map((run) => run[slug]?.[key] ?? 0).sort((a, b) => a - b);
		return [mean(values), ((values[974] ?? 0) - (values[24] ?? 0)) / 2];
	};
	const [m, me] = spread('merit');
	const [r, re] = spread('read');
	console.log(
		`${slug.padEnd(34)}${String(pieces[slug]?.length).padEnd(8)}${m?.toFixed(3)}   ${me?.toFixed(3)}     ${r?.toFixed(3)}   ${re?.toFixed(3)}`
	);
}
console.log('\npieces a book   pairs in order of 18: mean, and the worst 5% of draws');
for (const count of [6, 12, 25, 50, undefined]) {
	const orders = again(count)
		.map((run) => board(run).inOrder)
		.sort((a, b) => a - b);
	console.log(
		`${String(count ?? 'all').padEnd(16)}${mean(orders).toFixed(1).padEnd(8)}${orders[49]}`
	);
}
