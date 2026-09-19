import { rulesHash } from '../../../src/questions.ts';
import { isValuation, jevRecordsOf, recorded } from '../../../src/records.ts';
import { passage } from './passage-questions.ts';
import { value } from './passage-value.ts';

/**
 * How the pulse of each book judged so far moves along it, from the records and asking nothing:
 * merit and read by thirds of the book, and its last tenth against the rest. Whether a book sags
 * in the middle or ends on a height is a thing of the whole that the pieces already tell.
 */

const mean = (values: number[]) => values.reduce((sum, one) => sum + one, 0) / (values.length || 1);
const rows: string[][] = [];
for (const slug of await recorded()) {
	const records = await jevRecordsOf(slug);
	const whole = records.findLast((one) => one.by.rules === rulesHash(passage) && isValuation(one));
	if (!whole) continue;
	const { pulse } = value(whole.found);
	const third = Math.floor(pulse.length / 3);
	const tenth = Math.max(1, Math.round(pulse.length / 10));
	const parts = (key: 'merit' | 'read') => {
		const values = pulse.map((piece) => piece[key]);
		return [
			mean(values.slice(0, third)),
			mean(values.slice(third, 2 * third)),
			mean(values.slice(2 * third)),
			mean(values.slice(-tenth)) - mean(values.slice(0, -tenth))
		];
	};
	const show = (values: number[]) =>
		values.map((one, at) => (at === 3 ? (one >= 0 ? '+' : '') + one.toFixed(2) : one.toFixed(2)));
	rows.push([slug.slice(0, 26), ...show(parts('merit')), ...show(parts('read'))]);
}
console.log(
	`${''.padEnd(28)}${'merit by thirds'.padEnd(21)}${'its end'.padEnd(9)}${'read by thirds'.padEnd(21)}its end`
);
for (const row of rows) {
	console.log(row.map((cell, at) => cell.padEnd(at === 0 ? 28 : at === 4 ? 9 : 7)).join(''));
}
