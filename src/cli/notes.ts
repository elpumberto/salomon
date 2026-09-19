import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { tokens } from '../estimate.ts';
import { key } from '../keys.ts';
import { schema, spent, system, takeNotes } from '../notes.ts';
import type { Notes, Taken } from '../notes.ts';
import { createOpenRouter, defaultModel, price } from '../openrouter.ts';
import { readBook } from '../read/index.ts';
import { identify, keep, notesRecord } from '../records.ts';

/**
 * Takes the reading notes of a book and keeps them in `books/notes/`, one file per book and model.
 * It spends nothing unless told to with `--go`: without it, it says what it would do and what that
 * would cost. Sections are numbered as `npm run normalize -- --sections` lists them. A run that
 * stops, for the money or for a fault, goes on from where it was when it is run again. Once a book
 * is read to the end of what was asked, the run is recorded under `records/`; `--record` does that
 * for notes already taken, and `--remarks` leaves a word in the record for whoever reads it later.
 */

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		from: { type: 'string' },
		to: { type: 'string' },
		model: { type: 'string' },
		'max-usd': { type: 'string', default: '0.25' },
		go: { type: 'boolean', default: false },
		redo: { type: 'boolean', default: false },
		show: { type: 'boolean', default: false },
		record: { type: 'boolean', default: false },
		remarks: { type: 'string' }
	}
});

/** The notes as something to read: the book section by section, then who is in it and its threads. */
function show(notes: Notes): void {
	const number = (index: number) => `§${index + 1}`;
	for (const { index, title, kind, summary, characters, threads } of notes.sections) {
		console.log(
			`\n${number(index)}  ${title ?? '(untitled)'}${kind === 'story' ? '' : '  [apparatus]'}`
		);
		console.log(`    ${summary}`);
		for (const { name, change } of characters) {
			if (!/^no change/i.test(change)) console.log(`      · ${name}: ${change}`);
		}
		for (const { id, status, note } of threads) console.log(`      ${status} ${id}: ${note}`);
	}

	console.log('\nCAST');
	for (const { name, who, firstSeen } of notes.cast) {
		console.log(`  ${number(firstSeen).padEnd(4)} ${name}: ${who}`);
	}

	console.log('\nTHREADS');
	for (const { id, what, opened, closed } of notes.threads) {
		const span = `${number(opened)}–${closed === null ? 'open' : number(closed)}`;
		console.log(`  ${span.padEnd(9)} ${id}: ${what}`);
	}
}
const [path] = positionals;
if (!path) {
	console.error(
		'usage: npm run notes -- <book.epub | book.txt> [--from n] [--to n] [--model id] [--max-usd n] [--go] [--redo] [--show] [--record] [--remarks text]'
	);
	process.exit(1);
}

// What the model takes for thinking and for the notes of a section, and what goes with each
// section besides its text: the instructions, the shape of the answer and what is known so far.
const tokensOutPerCall = 1_500;
const tokensAroundEachSection = 1_600;

const book = await readBook(path);
const from = Number(values.from ?? 1) - 1;
const to = Math.min(Number(values.to ?? book.sections.length), book.sections.length) - 1;
const model = values.model ?? process.env.OPENROUTER_MODEL ?? defaultModel;
const maxUsd = Number(values['max-usd']);
const count = new Intl.NumberFormat('en-US');

const file = join(
	import.meta.dirname,
	'../../books/notes',
	`${book.source.file}.${model.replaceAll('/', '_')}.json`
);
const kept: Notes | undefined = values.redo
	? undefined
	: await readFile(file, 'utf8').then(JSON.parse, () => undefined);
const done = kept?.sections.length ?? 0;

async function record(notes: Notes): Promise<void> {
	const made = notesRecord(await identify(path as string, book), notes);
	if (values.remarks) made.remarks = values.remarks;
	console.log(`  recorded in ${await keep(made)}`);
}

if (values.show || values.record) {
	if (!kept) throw new Error(`No notes of ${book.source.file} taken by ${model} yet`);
	if (values.show) show(kept);
	else await record(kept);
	process.exit(0);
}

const pending = book.sections.slice((kept?.sections.at(-1)?.index ?? from - 1) + 1, to + 1);
const tokensIn =
	pending.reduce((sum, section) => sum + tokens(section.paragraphs.join(' ').length), 0) +
	pending.length * tokensAroundEachSection;
const tokensOut = pending.length * tokensOutPerCall;
const cost = await price(model);

console.log(`${book.title ?? '(no title)'} · ${book.source.file}`);
console.log(
	`  sections ${from + 1} to ${to + 1} of ${book.sections.length}${done ? `, ${done} of them already taken` : ''}: ${pending.length} calls to ${model}`
);
console.log(
	cost
		? `  about ${count.format(tokensIn)} tokens in and ${count.format(tokensOut)} out: $${((tokensIn * cost.usdPerMillionIn + tokensOut * cost.usdPerMillionOut) / 1e6).toFixed(4)}, at $${cost.usdPerMillionIn.toFixed(2)} and $${cost.usdPerMillionOut.toFixed(2)} a million`
		: `  about ${count.format(tokensIn)} tokens in and ${count.format(tokensOut)} out; OpenRouter lists no price for ${model}`
);

if (!values.go) {
	console.log(`\n  Nothing was asked. With --go it takes the notes, and stops at $${maxUsd}.`);
	process.exit(0);
}

function checked(value: Taken): Taken {
	const lists = [value?.characters, value?.cast, value?.threads];
	if (
		(value?.kind !== 'story' && value?.kind !== 'apparatus') ||
		typeof value.summary !== 'string' ||
		typeof value.so_far !== 'string' ||
		!lists.every(Array.isArray)
	) {
		throw new Error(`${model} answered in another shape than the one it was asked for`);
	}
	return value;
}

const openRouter = createOpenRouter(key('OPENROUTER_API_KEY'));
await mkdir(join(file, '..'), { recursive: true });
console.log();

const notes = await takeNotes(book, {
	model,
	from,
	to,
	sofar: kept,
	maxUsd,
	async ask(handed) {
		const { value, usage } = await openRouter.askJson<Taken>({
			model,
			system,
			user: JSON.stringify(handed),
			schema,
			maxTokens: 8_000
		});
		return { value: checked(value), usage };
	},
	async onSection(all, { index, kind, title, usage }) {
		await writeFile(file, JSON.stringify(all, null, '\t'));
		console.log(
			`  ${String(index + 1).padStart(4)}  ${kind.padEnd(9)}  ${count.format(usage.tokensIn).padStart(7)} in  ${count.format(usage.tokensOut).padStart(6)} out (${count.format(usage.tokensThinking)} thinking)  $${usage.usd.toFixed(5)}  total $${spent(all).toFixed(5)}  ${title ?? '(untitled)'}`
		);
	}
});

const last = notes.sections.at(-1)?.index ?? from - 1;
console.log(
	`\n  ${notes.sections.length} sections, ${notes.cast.length} people, ${notes.threads.length} threads (${notes.threads.filter((thread) => thread.closed === null).length} still open): $${spent(notes).toFixed(5)}`
);
console.log(`  kept in books/notes/${file.split('/').at(-1)}`);
if (last < to) {
	console.log(`  Stopped at $${maxUsd} before section ${last + 2}: run it again to go on.`);
} else await record(notes);
