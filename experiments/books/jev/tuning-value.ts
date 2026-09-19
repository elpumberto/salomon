import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { JevRecord } from '../../../src/records.ts';
import { meritOf, readOf } from '../../../src/value.ts';

/** What the rules of valuation make of the tuning pieces, group by group: it costs nothing. */

const root = join(import.meta.dirname, '../../../records/books');
const groups = new Map<string, { merit: number; read: number }[]>();
for (const book of await readdir(root)) {
	for (const file of await readdir(join(root, book))) {
		if (!file.includes('.jev.')) continue;
		const record: JevRecord = JSON.parse(await readFile(join(root, book, file), 'utf8'));
		// The second round of tuning: the questions dropped after it are not among those weighed.
		if (record.by.questions !== 'passage' || record.at < '2026-09-19T13:12') continue;
		for (const one of record.found) {
			const way = one.variant?.split(',')[0];
			const name = way ?? (record.found.length === 1 ? 'desert piece' : book);
			const merit = meritOf(one.answers);
			const read = readOf(one.answers);
			if (merit !== null && read !== null) {
				groups.set(name, [...(groups.get(name) ?? []), { merit, read }]);
			}
		}
	}
}
const show = (values: number[]) =>
	`${(values.reduce((sum, one) => sum + one, 0) / values.length).toFixed(2)}  (${values.map((one) => one.toFixed(2)).join(' ')})`;
console.log(`${''.padEnd(22)}${'merit'.padEnd(34)}read`);
for (const [name, pieces] of [...groups].sort(
	([, one], [, other]) =>
		other.reduce((sum, piece) => sum + piece.merit, 0) / other.length -
		one.reduce((sum, piece) => sum + piece.merit, 0) / one.length
)) {
	console.log(
		name.padEnd(22) +
			show(pieces.map((piece) => piece.merit)).padEnd(34) +
			show(pieces.map((piece) => piece.read))
	);
}
