import { parse } from 'node:path';
import { parseArgs } from 'node:util';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import type { Question } from '@typesafe-ai/sdk';
import { tokens, usd } from '../estimate.ts';
import { across, judgeAll, name, pieces, together, whole } from '../judge.ts';
import { key } from '../keys.ts';
import { rulesHash, sets } from '../questions.ts';
import { readBook } from '../read/index.ts';
import { against, chosen, listed, panel, sample } from '../panel.ts';
import { identify, jevRecord, keep } from '../records.ts';
import { percent, table } from '../show.ts';
import { value } from '../value.ts';

/**
 * Asks Jev a set of questions about some sections of a book, a call a passage, and records what it
 * said under `records/`. It sends nothing unless told to with `--go`: without it, it shows the
 * questions as they would be asked, the passages, and about what it would cost. Sections are
 * numbered as `npm run normalize -- --sections` lists them, and given as `4,9,16-18`; left out,
 * they are those `gutenberg.json` says are the story of the book. A section
 * is a passage; `--pieces 1000` cuts each in pieces of about as many words, and `--together`
 * sends each range of sections as one text; `--across` cuts the pieces over the sections as one
 * text, for a book whose sections are a few lines each. `--panel 12` takes as many pieces, evenly spread, and
 * sets each side by side with each passage of the panel of anchors, both ways round.
 */

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		sections: { type: 'string' },
		questions: { type: 'string', default: 'reading' },
		pieces: { type: 'string' },
		together: { type: 'boolean', default: false },
		across: { type: 'boolean', default: false },
		panel: { type: 'string' },
		go: { type: 'boolean', default: false },
		remarks: { type: 'string' }
	}
});
const [path] = positionals;
const set = (values.panel ? 'sideBySide' : values.questions) as keyof typeof sets;
// A book of the list says which of its sections are the story: those are judged when none are named.
const wanted =
	values.sections ?? (await listed()).find(({ slug }) => slug === parse(path ?? '').name)?.story;
if (!path || !wanted || !(set in sets)) {
	console.error(
		`usage: npm run judge -- <book.epub | book.txt> [--sections 4,9,16-18] [--questions ${Object.keys(sets).join('|')}] [--pieces words] [--together] [--across] [--panel pieces] [--go] [--remarks text]`
	);
	process.exit(1);
}

const questions = sets[set];
const rules = rulesHash(questions);
const book = await readBook(path);
const cut = (values.across ? all : each)(wanted);

function ranges(list: string): number[][] {
	return list.split(',').map((part) => {
		const [from, to = from] = part.split('-').map(Number);
		if (!from || !to || to < from) throw new Error(`Not a section nor a range of them: ${part}`);
		return Array.from({ length: to - from + 1 }, (_, step) => from - 1 + step);
	});
}

function all(list: string) {
	return across(book, ranges(list).flat(), Number(values.pieces ?? 1000));
}

function each(list: string) {
	return ranges(list).flatMap((indexes) => {
		const [from = 0] = indexes;
		if (values.together) return [together(book, from, indexes.at(-1) ?? from)];
		return indexes.flatMap((index) =>
			values.pieces || values.panel
				? pieces(book, index, Number(values.pieces ?? 1000))
				: [whole(book, index)]
		);
	});
}

const passages = values.panel ? against(sample(cut, Number(values.panel)), await panel()) : cut;

const text = (value: Question['instructions']) =>
	typeof value === 'string' ? value : JSON.stringify(value);

console.log(
	`${book.title} · questions "${set}" (${rules}), ${Object.keys(questions).length} of them\n`
);
for (const [id, question] of Object.entries<Question>(questions)) {
	console.log(`  ${id.padEnd(12)} ${text(question.instructions)}`);
	if (question.type === 'score') {
		question.criteria.forEach((level, at) => console.log(`${' '.repeat(17)}${at}  ${text(level)}`));
	}
}

/** What a call takes besides the text: by those made, about half as much again as the questions written out. */
const tokensAround = Math.round(1.5 * tokens(JSON.stringify(questions).length));
let guess = 0;
console.log('\nPassages');
for (const passage of passages) {
	const size = tokens(JSON.stringify(passage.state).length);
	const { spoken, wordsPerSentence } = passage.measured;
	guess += size + tokensAround;
	if (passages.length > 30) continue;
	console.log(
		`  ${name(passage).padEnd(12)} ${(book.sections[passage.section - 1]?.title ?? '(untitled)').slice(0, 44).padEnd(44)} ~${String(size).padStart(6)} tokens · ${percent(spoken).padStart(3)} spoken · ${wordsPerSentence} words a sentence`
	);
}
console.log(
	`\n  ${passages.length} calls, some ${guess.toLocaleString('en-US')} tokens: about $${usd(guess).toFixed(4)}`
);

if (!values.go) {
	console.log('\nNothing was sent to Jev. With --go, it is.');
	process.exit(0);
}

const client = new TypeSafeClient({ apiKey: key('TYPESAFE_API_KEY') });
const at = new Date().toISOString();
const { judged, broke } = await judgeAll(
	passages,
	questions,
	(request) => client.systemOne(request),
	(one) => process.stdout.write(`\r  asked about ${name(one)}      `)
);

if (passages.length <= 12) {
	console.log(
		'\n\nA score is where the passage falls among the levels, then how sure Jev is of it.\n'
	);
	console.log(table(judged, Object.keys(questions)));
} else if (values.panel) {
	console.log('\n\nHow often its pieces were chosen over the panel:', chosen(judged));
} else if (set === 'passage') {
	const { pulse, ...valued } = value(judged);
	console.log('\n');
	console.dir(valued, { depth: 4 });
}

if (judged.length > 0) {
	const record = jevRecord(
		await identify(path, book),
		at,
		{ questions: set, rules, asked: questions },
		judged
	);
	const remarks = [
		values.remarks,
		broke ? `Stopped before the end: ${broke.message.slice(0, 300)}` : ''
	]
		.filter(Boolean)
		.join(' ');
	const kept = await keep({ ...record, ...(remarks ? { remarks } : {}) });
	console.log(
		`\n${record.took.calls} calls, ${record.took.tokensIn.toLocaleString('en-US')} tokens in, $${record.took.usd.toFixed(4)} at list price, ${record.took.seconds} s\n${kept}`
	);
}
if (broke) {
	console.error(`\nIt stopped: ${broke.message}`);
	process.exit(1);
}
