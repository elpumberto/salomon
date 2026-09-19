import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chosen } from '../panel.ts';
import { rulesHash, sets } from '../questions.ts';
import type { JevRecord } from '../records.ts';
import { value } from '../value.ts';

/**
 * What the books judged so far are worth by the rules of `src/value.ts`, from the records of what
 * Jev said of them: the last run of the `passage` questions on each book, and the last one of its
 * pieces against the panel where there is one. It asks Jev nothing. With the slug of a book, that
 * book in full, its profile too.
 */

const root = join(import.meta.dirname, '../../records/books');
const [only] = process.argv.slice(2);
const half = (one: number, other?: number) => (other === undefined ? one : (one + other) / 2);

const rows: string[][] = [];
for (const slug of await readdir(root)) {
	if (only && slug !== only) continue;
	const records: JevRecord[] = await Promise.all(
		(await readdir(join(root, slug)))
			.filter((file) => file.includes('.jev.'))
			.sort()
			.map(async (file) => JSON.parse(await readFile(join(root, slug, file), 'utf8')))
	);
	const whole = (set: string) =>
		records.findLast((one) => one.by.questions === set && !one.remarks?.startsWith('Tuning'));
	const pieces = whole('passage');
	if (!pieces) continue;
	const { pulse, ...valued } = value(pieces.found);
	const panel = records.findLast(
		(one) => one.by.questions === 'sideBySide' && one.by.rules === rulesHash(sets.sideBySide)
	);
	const over = panel ? chosen(panel.found) : {};
	rows.push([
		slug,
		String(valued.pieces),
		half(valued.merit.value, over.better).toFixed(2),
		half(valued.read.value, over.enjoy).toFixed(2),
		`${valued.merit.mean.toFixed(2)} · ${valued.merit.bestTenth.toFixed(2)}`,
		over.better?.toFixed(2) ?? '—',
		`${valued.read.mean.toFixed(2)} · ${valued.read.opening.toFixed(2)}`,
		over.enjoy?.toFixed(2) ?? '—',
		String(valued.read.longestSlackRun)
	]);
	if (only) console.dir({ ...valued, overThePanel: over }, { depth: 4 });
}

const head = [
	'',
	'pieces',
	'MERIT',
	'READ',
	'merit: mean · best tenth',
	'over the panel',
	'read: mean · opening',
	'over the panel',
	'slack run'
];
rows.sort((one, other) => Number(other[2]) - Number(one[2]));
for (const row of [head, ...rows]) {
	console.log(
		row.map((cell, at) => cell.padEnd(at === 0 ? 24 : at === 4 || at === 6 ? 27 : 16)).join('')
	);
}
