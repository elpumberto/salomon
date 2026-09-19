import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { NotesRecord } from '../records.ts';

/**
 * Sets the records of the notes of a book side by side, a column a run, oldest first: what was run,
 * what it took and what came of it. With no book given, it says which books have records. `--markdown`
 * prints them as a table for the docs instead, a row a run, each with a link to its record.
 */

const root = join(import.meta.dirname, '../../records/books');
const args = process.argv.slice(2);
const markdown = args.includes('--markdown');
const [slug] = args.filter((arg) => !arg.startsWith('--'));

if (!slug) {
	for (const book of await readdir(root)) {
		console.log(`${book}  (${(await readdir(join(root, book))).length} records)`);
	}
	process.exit(0);
}

// Only the records of notes: a record says its step in its name, after when it was run.
const files = (await readdir(join(root, slug)))
	.filter((file) => /^[^.]+\.notes\..*\.json$/.test(file))
	.sort();
const records: NotesRecord[] = await Promise.all(
	files.map(async (file) => JSON.parse(await readFile(join(root, slug, file), 'utf8')))
);

const count = new Intl.NumberFormat('en-US');
const time = (seconds: number | null) =>
	seconds === null ? 'not measured' : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
const routing = ({ by }: NotesRecord) =>
	by.routing
		? [
				by.routing.sort && `${by.routing.sort} first`,
				by.routing.only && `only ${by.routing.only.join(', ')}`,
				by.routing.ignore && `without ${by.routing.ignore.join(', ')}`
			]
				.filter(Boolean)
				.join('; ')
		: "OpenRouter's own";

const rows: [string, (record: NotesRecord) => string][] = [
	['when', (r) => (r.at ?? '').slice(0, 16).replace('T', ' ')],
	['model', (r) => r.by.model.split('/').at(-1) ?? ''],
	['providers', routing],
	['rules', (r) => r.by.rules.replace('sha256:', '')],
	['calls', (r) => count.format(r.took.calls)],
	['tokens in', (r) => count.format(r.took.tokensIn)],
	['tokens out', (r) => count.format(r.took.tokensOut)],
	['  of them thinking', (r) => `${Math.round((100 * r.took.tokensThinking) / r.took.tokensOut)}%`],
	['cost', (r) => `$${r.took.usd.toFixed(4)}`],
	['time', (r) => time(r.took.seconds)],
	['people', (r) => String(r.found.people)],
	['threads', (r) => String(r.found.threads)],
	['  settled on review', (r) => String(r.found.threadsSettledOnReview ?? '—')],
	['  left open', (r) => String(r.found.threadsLeftOpen)],
	[
		'synopsis within length',
		(r) => (r.found.synopsis ? `${r.found.synopsis.withinLength} of ${r.found.synopsis.of}` : '—')
	],
	['  its longest, in words', (r) => String(r.found.synopsis?.longestWords ?? '—')],
	[
		'answers not kept',
		(r) => {
			const all = Object.values(r.by.providers).filter((one) => typeof one !== 'number');
			return all.length
				? `${all.reduce((sum, one) => sum + one.notKept, 0)} of ${all.reduce((sum, one) => sum + one.calls, 0)}`
				: '—';
		}
	]
];

if (markdown) {
	// From `docs/books/`, which is where the table goes. Fewer columns than on a screen, and one
	// more: whether the run got to the end of the book, and what stopped it if it did not.
	const left = (r: NotesRecord) =>
		r.found.threadsSettledOnReview
			? `${r.found.threadsLeftOpen} (${r.found.threadsSettledOnReview} settled on review)`
			: String(r.found.threadsLeftOpen);
	const pick = (name: string) => rows.find(([row]) => row.trim() === name)?.[1] ?? (() => '');
	const columns: [string, (r: NotesRecord) => string][] = [
		['Model', (r) => `\`${pick('model')(r)}\``],
		['Providers', pick('providers')],
		['Rules', (r) => `\`${pick('rules')(r)}\``],
		['Read', (r) => (r.failed ? `broke at §${r.failed.section}` : 'to the end')],
		['Calls', pick('calls')],
		['Not kept', pick('answers not kept')],
		['Thinking', pick('of them thinking')],
		['Cost', pick('cost')],
		['Time', pick('time')],
		['People', pick('people')],
		['Threads', pick('threads')],
		['Left open', left],
		['Synopsis within length', pick('synopsis within length')],
		['Longest', pick('its longest, in words')],
		['When', pick('when')]
	];
	console.log(`| ${[...columns.map(([name]) => name), ''].join(' | ')} |`);
	console.log(`| ${[...columns, ''].map(() => '---').join(' | ')} |`);
	records.forEach((record, index) => {
		const link = `[record](../../records/books/${slug}/${files[index]})`;
		console.log(`| ${[...columns.map(([, value]) => value(record)), link].join(' | ')} |`);
	});
	process.exit(0);
}

const cells = rows.map(([name, value]) => [name, ...records.map(value)]);
const widths = cells[0]?.map((_, column) =>
	Math.max(...cells.map((row) => row[column]?.length ?? 0))
);
console.log(`${records[0]?.book.title} · ${records.length} records\n`);
for (const row of cells) {
	console.log(row.map((cell, column) => cell.padEnd((widths?.[column] ?? 0) + 3)).join(''));
}

console.log('\nBy provider, in the records that say: calls, answers not kept, what it was paid');
for (const record of records) {
	const all = Object.entries(record.by.providers).filter(([, one]) => typeof one !== 'number');
	if (all.length === 0) continue;
	console.log(`\n  ${(record.at ?? '').slice(0, 16).replace('T', ' ')}  ${record.by.model}`);
	for (const [name, one] of all) {
		if (typeof one === 'number') continue;
		console.log(
			`    ${name.padEnd(16)} ${String(one.calls).padStart(3)} calls  ${String(one.notKept).padStart(2)} not kept  $${one.usd.toFixed(5)}`
		);
	}
}
