import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { JevRecord } from '../../../src/records.ts';
import { gated, plain, rulesHash, unit, valued } from './gut-value.ts';
import { board } from './scoreboard.ts';
import type { Scores } from './scoreboard.ts';
import { alone, ladders, parting, remarks } from './third.ts';

/** What the check came to, from the records and asking nothing: book by book, by the one yardstick, and the test of ornament. */

const root = join(import.meta.dirname, '../../../records/books');
const found: Record<string, JevRecord> = {};
// Of a passage told again more than once, the record with most of its tellings.
const retold = new Map<string, JevRecord>();
for (const slug of [...ladders.flat(), ...alone]) {
	const files = await readdir(join(root, slug)).catch(() => []);
	for (const file of files.filter((one) => one.includes('.jev.'))) {
		const record: JevRecord = JSON.parse(await readFile(join(root, slug, file), 'utf8'));
		if (record.remarks?.startsWith(remarks)) found[slug] = record;
		if (
			record.remarks?.includes('the test of ornament') &&
			record.found.length >= (retold.get(slug)?.found.length ?? 0)
		) {
			retold.set(slug, record);
		}
	}
}

const mean = (values: number[]) => values.reduce((sum, one) => sum + one, 0) / (values.length || 1);
const two = (value: number) => value.toFixed(2);
console.log(`valuation ${rulesHash}\n`);
console.log(
	`${'book'.padEnd(32)}plain  gated  read   lowest–highest  lesson warning  draft: first worked finished  for: children wide general literary`
);
const scores: Record<'plain' | 'gated', Scores> = { plain: {}, gated: {} };
for (const ladder of [...ladders, alone]) {
	for (const slug of ladder) {
		const record = found[slug];
		if (!record) continue;
		const book = valued(record.found);
		scores.plain[slug] = { merit: book.plain, read: book.read };
		scores.gated[slug] = { merit: book.gated, read: book.read };
		const of = (id: string) => mean(record.found.map((one) => unit(one.answers, id)));
		const shares = (id: string, labels: string[]) =>
			labels
				.map((label) =>
					two(
						mean(
							record.found.map((one) => {
								const answer = one.answers[id];
								return answer && 'choice' in answer ? (answer.probabilities[label] ?? 0) : 0;
							})
						)
					)
				)
				.join('  ');
		console.log(
			`${slug.padEnd(32)}${two(book.plain)}   ${two(book.gated)}   ${two(book.read)}   ${two(book.from)}–${two(book.to)}       ${two(of('lesson'))}   ${two(of('warning'))}            ${shares('draft', ['first', 'worked', 'finished'])}           ${shares('audience', ['children', 'wide', 'general', 'literary'])}`
		);
	}
	console.log();
}

for (const way of ['plain', 'gated'] as const) {
	const { pairs, inOrder, margin, parted, ofParting } = board(scores[way], { ladders, parting });
	console.log(
		`${way}: ${inOrder} of ${pairs} pairs in order, mean margin ${margin}, parted ${parted} of ${ofParting}`
	);
}

if (retold.size)
	console.log(
		`\n${'told again'.padEnd(32)}as it is       dull           overdone     (plain, gated)`
	);
for (const [slug, record] of retold) {
	console.log(
		`${slug.padEnd(32)}${record.found.map((one) => `${two(plain(one.answers))}, ${two(gated(one.answers))}`.padEnd(15)).join('')}`
	);
}
