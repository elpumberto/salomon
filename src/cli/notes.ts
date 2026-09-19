import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { tokens } from '../estimate.ts';
import { key } from '../keys.ts';
import { open, reviewThreads, rulesHash, takeNotes, took } from '../notes.ts';
import type { Ask, Notes } from '../notes.ts';
import { createOpenRouter, defaultModel, OpenRouterError, price } from '../openrouter.ts';
import { readBook } from '../read/index.ts';
import { identify, keep, notesRecord } from '../records.ts';

/**
 * Takes the reading notes of a book and keeps them in `books/notes/`, one file per book and model.
 * It spends nothing unless told to with `--go`: without it, it says what it would do and what that
 * would cost. Sections are numbered as `npm run normalize -- --sections` lists them. A run that
 * stops, for the money or for a fault, goes on from where it was when it is run again. Once a book
 * is read to the end of what was asked, the threads left open are looked at again and the run is
 * recorded under `records/`; `--remarks` leaves a word in the record for whoever reads it later.
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
		remarks: { type: 'string' }
	}
});
const [path] = positionals;
if (!path) {
	console.error(
		'usage: npm run notes -- <book.epub | book.txt> [--from n] [--to n] [--model id] [--max-usd n] [--go] [--redo] [--show] [--remarks text]'
	);
	process.exit(1);
}

/** The notes as something to read: the book section by section, then who is in it and its threads. */
function show(notes: Notes): void {
	const number = (index: number) => `§${index + 1}`;
	for (const { index, title, kind, summary, characters, threads, soFar } of notes.sections) {
		console.log(
			`\n${number(index)}  ${title ?? '(untitled)'}${kind === 'story' ? '' : '  [apparatus]'}`
		);
		console.log(`    ${summary}`);
		for (const { name, change } of characters) {
			if (!/^no change/i.test(change)) console.log(`      · ${name}: ${change}`);
		}
		for (const { id, status, note } of threads) console.log(`      ${status} ${id}: ${note}`);
		console.log(`      so far, in ${soFar.split(' ').length} words: ${soFar}`);
	}

	console.log('\nCAST');
	for (const { name, who, firstSeen } of notes.cast) {
		console.log(`  ${number(firstSeen).padEnd(4)} ${name}: ${who}`);
	}

	console.log('\nTHREADS');
	for (const { id, what, opened, closed, review } of notes.threads) {
		const span = `${number(opened)}–${closed === null ? 'open' : number(closed)}`;
		console.log(`  ${span.padEnd(9)} ${id}: ${what}`);
		if (review) console.log(`            on review, ${review.verdict}: ${review.note}`);
	}
}

// What the model takes for thinking and for its answers over a section, and what goes with each
// section besides its text: the instructions, the shapes of the answers and what is known so far.
const tokensOutPerSection = 2_200;
const tokensAroundEachSection = 2_600;

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

if (values.show) {
	if (!kept) throw new Error(`No notes of ${book.source.file} taken by ${model} yet`);
	show(kept);
	process.exit(0);
}
if (kept && kept.rules !== rulesHash) {
	throw new Error(
		`The notes kept were taken under other rules (${kept.rules ?? 'older ones'}, now ${rulesHash}): --redo takes them again`
	);
}

const done = kept?.sections.length ?? 0;
const pending = book.sections.slice((kept?.sections.at(-1)?.index ?? from - 1) + 1, to + 1);
const tokensIn =
	pending.reduce((sum, section) => sum + tokens(section.paragraphs.join(' ').length), 0) +
	pending.length * tokensAroundEachSection;
const tokensOut = pending.length * tokensOutPerSection;
const cost = await price(model);

console.log(`${book.title ?? '(no title)'} · ${book.source.file}`);
console.log(
	`  sections ${from + 1} to ${to + 1} of ${book.sections.length}${done ? `, ${done} of them already taken` : ''}: ${pending.length} to read with ${model}, two calls each and one at the end`
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
// Read to the end and looked at again: there is a record of it already, and records are not rewritten.
if (
	kept &&
	pending.length === 0 &&
	(kept.review || kept.threads.every((thread) => thread.closed !== null))
) {
	console.log('\n  These notes are whole: --show prints them, --redo takes them again.');
	process.exit(0);
}

const openRouter = createOpenRouter(key('OPENROUTER_API_KEY'));
// A model that thinks may think long. An answer cut short, or that is not the JSON asked for, is
// one provider's bad turn, and another try often lands elsewhere: what it cost is counted all the same.
const ask: Ask = async ({ system, schema, user }) => {
	const wasted = { tokensIn: 0, tokensOut: 0, tokensThinking: 0, usd: 0 };
	for (let attempt = 1; ; attempt++) {
		try {
			const answer = await openRouter.askJson({
				model,
				system,
				schema,
				user: JSON.stringify(user),
				maxTokens: 24_000
			});
			const usage = { ...answer.usage };
			for (const key of Object.keys(wasted) as (keyof typeof wasted)[]) usage[key] += wasted[key];
			return { ...answer, usage };
		} catch (error) {
			if (!(error instanceof OpenRouterError) || error.status !== 200 || attempt === 3) throw error;
			for (const key of Object.keys(wasted) as (keyof typeof wasted)[]) {
				wasted[key] += error.usage?.[key] ?? 0;
			}
		}
	}
};
const save = (notes: Notes) => writeFile(file, JSON.stringify(notes, null, '\t'));
await mkdir(join(file, '..'), { recursive: true });
console.log();

const notes = await takeNotes(book, {
	ask,
	model,
	from,
	to,
	sofar: kept,
	maxUsd,
	async onSection(all, { index, kind, title, usage, seconds, calls, providers, soFar }) {
		await save(all);
		console.log(
			`  ${String(index + 1).padStart(4)}  ${kind.padEnd(9)}  ${calls} calls  ${count.format(usage.tokensIn).padStart(7)} in  ${count.format(usage.tokensOut).padStart(6)} out  $${usage.usd.toFixed(5)}  ${seconds.toFixed(0).padStart(3)} s  so far ${String(soFar.split(' ').length).padStart(3)} words  ${providers.join('+')}  ${title ?? '(untitled)'}`
		);
	}
});

const last = notes.sections.at(-1)?.index ?? from - 1;
if (last < to) {
	console.log(`\n  Stopped at $${maxUsd} before section ${last + 2}: run it again to go on.`);
	console.log(`  kept in books/notes/${file.split('/').at(-1)}`);
	process.exit(0);
}

const leftOpen = open(notes).length;
await reviewThreads(notes, ask);
await save(notes);
if (notes.review) {
	console.log(
		`\n  ${leftOpen} threads were left open; looked at again with the whole book in view, ${open(notes).length} are`
	);
}

const all = took(notes);
console.log(
	`\n  ${notes.sections.length} sections, ${notes.cast.length} people, ${notes.threads.length} threads: ${all.calls} calls, $${all.usage.usd.toFixed(5)}, ${all.seconds} s`
);
console.log(`  kept in books/notes/${file.split('/').at(-1)}`);

const made = notesRecord(await identify(path, book), notes);
if (values.remarks) made.remarks = values.remarks;
console.log(`  recorded in ${await keep(made)}`);
