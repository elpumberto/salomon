import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { JevRecord } from '../../../src/records.ts';

/**
 * What the chapters of each book do to its people, from the records of the `inContext` questions
 * and asking nothing: in how many chapters both sides of the conflict have a claim on the reader,
 * how torn its people are, and the rest. Books are set in their ladders, top rung first.
 */

const ladders = [
	['pride-and-prejudice', 'the-sheik', 'irene-iddesleigh'],
	['treasure-island', 'king-solomons-mines', 'tarzan-of-the-apes'],
	['the-turn-of-the-screw', 'dracula', 'varney-the-vampire'],
	['the-moonstone', 'the-mysterious-affair-at-styles', 'the-mystery-of-a-hansom-cab'],
	['the-war-of-the-worlds', 'the-lost-world', 'edisons-conquest-of-mars'],
	['la-regenta', 'la-barraca', 'el-cocinero-de-su-majestad'],
	['don-quijote'],
	['ulysses']
];
const root = join(import.meta.dirname, '../../../records/books');
console.log(
	`${''.padEnd(34)}chapters  both sides  one side  torn   fitting  unfitting  reveals  pays`
);
for (const ladder of ladders) {
	let shown = 0;
	for (const slug of ladder) {
		const files = (await readdir(join(root, slug)).catch(() => [])).filter((one) =>
			one.includes('.jev.')
		);
		const records: JevRecord[] = await Promise.all(
			files.map(async (one) => JSON.parse(await readFile(join(root, slug, one), 'utf8')))
		);
		const found = records
			.filter((record) => record.by.questions === 'inContext')
			.flatMap((record) => record.found);
		if (found.length === 0) continue;
		shown++;
		const share = (id: string, label: string) =>
			found.filter((one) => {
				const answer = one.answers[id];
				return answer && 'choice' in answer && answer.choice === label;
			}).length / found.length;
		const mean = (id: string) =>
			found.reduce((sum, one) => {
				const answer = one.answers[id];
				return sum + (answer && 'score' in answer ? answer.score / answer.of : 0);
			}, 0) / found.length;
		console.log(
			slug.padEnd(34) +
				[
					String(found.length).padEnd(10),
					share('sides', 'both').toFixed(2).padEnd(12),
					share('sides', 'one').toFixed(2).padEnd(10),
					mean('torn').toFixed(2).padEnd(7),
					share('acts', 'fitting').toFixed(2).padEnd(9),
					share('acts', 'unfitting').toFixed(2).padEnd(11),
					mean('reveals').toFixed(2).padEnd(9),
					mean('pays').toFixed(2)
				].join('')
		);
	}
	if (shown) console.log();
}
