import { isValuation, jevRecordsOf, recorded } from '../../../src/records.ts';
import { rulesHash } from '../../../src/questions.ts';
import { chosen } from './panel.ts';
import { passage, sideBySide } from './passage-questions.ts';
import { value } from './passage-value.ts';

/**
 * What the twenty books of `docs/books/calibration.md` came to by the first valuation, from the
 * records and asking nothing: each book judged whole in pieces with the `passage` questions, and
 * its pieces against the panel where there is one. With the slug of a book, that book in full.
 */

const [only] = process.argv.slice(2);
const half = (one: number, other?: number) => (other === undefined ? one : (one + other) / 2);

const rows: string[][] = [];
for (const slug of await recorded()) {
	if (only && slug !== only) continue;
	const records = await jevRecordsOf(slug);
	const pieces = records.findLast((one) => one.by.rules === rulesHash(passage) && isValuation(one));
	if (!pieces) continue;
	const { pulse, ...valued } = value(pieces.found);
	const panel = records.findLast((one) => one.by.rules === rulesHash(sideBySide));
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
