import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { rulesHash, sets } from '../../../src/questions.ts';
import type { JevRecord } from '../../../src/records.ts';

/**
 * Sets the tuning runs of a set of questions side by side: a row a question, a column a group of
 * passages, each cell the mean of the group. Scores are brought to 0–1; of a choice, the options
 * picked are counted.
 */

// Of the wording the set has now: a run with another wording is another thing.
const set = 'passage';
const rules = rulesHash(sets[set]);
const root = join(import.meta.dirname, '../../../records/books');
const groups = new Map<string, JevRecord['found']>();
for (const book of await readdir(root)) {
	for (const file of await readdir(join(root, book))) {
		if (!file.includes('.jev.')) continue;
		const record: JevRecord = JSON.parse(await readFile(join(root, book, file), 'utf8'));
		if (record.by.rules !== rules || !record.remarks?.startsWith('Tuning')) continue;
		for (const one of record.found) {
			const way = one.variant?.split(',')[0];
			const name = way ? `${way}` : record.found.length === 1 ? 'original' : book.slice(0, 9);
			groups.set(name, [...(groups.get(name) ?? []), one]);
		}
	}
}

const order = [
	'treasure-',
	'king-solo',
	'tarzan-of',
	'pride-and',
	'irene-idd',
	'original',
	'flat',
	'purple'
];
const names = order.filter((name) => groups.has(name));
const ids = Object.keys(groups.get(names[0] ?? '')?.[0]?.answers ?? {});
console.log(''.padEnd(13) + names.map((name) => name.padEnd(11)).join(''));
for (const id of ids) {
	const cells = names.map((name) => {
		const answers = (groups.get(name) ?? []).map((one) => one.answers[id]);
		const first = answers[0];
		if (first && 'choice' in first) {
			const picked = new Map<string, number>();
			for (const one of answers) {
				if (one && 'choice' in one) picked.set(one.choice, (picked.get(one.choice) ?? 0) + 1);
			}
			return [...picked].map(([label, count]) => `${label.slice(0, 5)}${count}`).join(' ');
		}
		const values = answers.map((one) =>
			!one ? 0 : 'noul' in one ? one.noul : 'score' in one ? one.score / one.of : 0
		);
		return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2);
	});
	console.log(id.padEnd(13) + cells.map((cell) => cell.padEnd(11)).join(''));
}
