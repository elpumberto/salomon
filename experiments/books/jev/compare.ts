import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { choice } from '@typesafe-ai/sdk';
import { createHash } from 'node:crypto';
import { tokens, usd } from '../../../src/estimate.ts';
import { across, measure, ranges, sample } from '../../../src/judge.ts';
import type { Passage } from '../../../src/judge.ts';
import { rulesHash, sets } from '../../../src/questions.ts';
import { words } from '../../../src/book.ts';
import type { Book } from '../../../src/book.ts';
import { readBook } from '../../../src/read/index.ts';
import { identify, isValuation, jevRecordsOf, recorded } from '../../../src/records.ts';
import { listed } from '../../../src/library.ts';
import { truth } from '../../../src/truth.ts';
import { value, way } from '../../../src/value.ts';
import { books, runBook } from './run.ts';

/**
 * Comparing instead of scoring: two passages of two books side by side, and which is the better
 * written, which a teacher would take, which most readers would enjoy. A scale of absolute
 * questions has a ceiling, and the well written books crowd under it; a comparison has none. Every
 * pair of the thirty-two books, two pairs of their judged passages each, both ways round to undo
 * Jev's leaning to the first: 496 × 2 × 2 calls. What each book wins is turned into a strength
 * (`compare-board.ts`) and set against the standing by the yardstick of `src/truth.ts`.
 *
 * Said before any was asked, 2026-09-22: the comparison earns its place if its order agrees with
 * the standing at least as well as merit does, 0.61, and better among the twenty books of the top
 * floor, where merit stands at 0.50; and if Ulysses, third by standing and twenty-fourth by
 * merit, comes into the top ten. Agreement under 0.55 says a comparison sees no more than the
 * scale did.
 *
 *   node experiments/books/jev/compare.ts [--go]
 *
 * Shows the cost and sends nothing without `--go`. A run that breaks goes on from where it was:
 * what was asked is in the records, under the book of the first passage, the other named in
 * `variant`.
 */

const go = process.argv.includes('--go');
const pair = '`first` and `second` are passages of two novels, of some 3,000 words each. ';
const either = { first: 'The passage in `first`', second: 'The passage in `second`' };
export const questions = {
	better: choice(`${pair}Which of the two is the better written?`, either),
	lesson: choice(
		`${pair}Which of the two would a teacher of writing rather give to a class as an example to learn from?`,
		either
	),
	enjoy: choice(`${pair}Which of the two would most readers enjoy reading more?`, either)
};
export const set = 'compare';
export const remarks =
	'Variant: compare. Passages of two books side by side, both ways round: which is better written, which a teacher would take, which readers would enjoy.';

const asked = rulesHash(sets[way.questions]);
const known = await truth();

/** Each book's judged passages, cut again as they were and checked by hash against the record. */
const judged: Record<string, { path: string; book: Book; passages: Passage[] }> = {};
// A book of the list from its file; somebody's, from its normalized copy, which is the same text.
const loaded = new Map<string, { path: string; book: Book }>();
for (const file of (await readdir(books)).filter((one) => one.endsWith('.epub'))) {
	const path = join(books, file);
	const book = await readBook(path);
	loaded.set((await identify(path, book)).text.sha256, { path, book });
}
const normalized = join(books, 'normalized');
for (const file of (await readdir(normalized)).filter((one) => one.endsWith('.json'))) {
	const path = join(normalized, file);
	const book = JSON.parse(await readFile(path, 'utf8')) as Book;
	const hash = (await identify(path, book)).text.sha256;
	if (!loaded.has(hash)) loaded.set(hash, { path, book });
}
for (const slug of await recorded()) {
	const record = (await jevRecordsOf(slug)).findLast(
		(one) => one.by.rules === asked && isValuation(one)
	);
	if (!record || !known[slug]) continue;
	const found = loaded.get(record.book.text.sha256);
	if (!found) throw new Error(`${slug}: no book under books/ has the text that was judged`);
	const { path, book } = found;
	// The story is the sections the book was judged with, which the record does not name: the
	// range of the passages, or one that leaves out a section or two (a part's title page), whichever
	// cuts again every passage the record holds by hash.
	const wanted = new Set(record.found.map((one) => one.sha256));
	const hash = (one: Passage) =>
		createHash('sha256').update(JSON.stringify(one.state)).digest('hex');
	const [low, high] = [Math.min(...record.sections), Math.max(...record.sections)];
	let passages: Passage[] = [];
	// Only a short section, a part's title page, could have been left out of the story.
	const short = book.sections
		.map((one, at) => (words(one.paragraphs.join(' ')) < 500 ? at + 1 : 0))
		.filter(Boolean);
	const skips = [
		[0, 0],
		...short.map((one) => [one, 0]),
		...short.flatMap((one) => short.filter((two) => two > one).map((two) => [one, two]))
	];
	// A book of the list says which sections are its story; somebody's has to be searched for.
	const told = (await listed()).find((one) => one.slug === slug)?.story;
	const stories: number[][] = told
		? [ranges(told).flat()]
		: [low, low - 1].flatMap((from) =>
				[high, high + 1].flatMap((to) =>
					skips.map(([skip, skip2]) =>
						Array.from({ length: to - from + 1 }, (_, at) => from - 1 + at).filter(
							(at) => at >= 0 && at < book.sections.length && at + 1 !== skip && at + 1 !== skip2
						)
					)
				)
			);
	for (const story of stories) {
		if (!story.length) continue;
		const cut = sample(across(book, story, way.words), way.passages);
		const found = cut.filter((one) => wanted.has(hash(one)));
		if (found.length === record.found.length) {
			passages = found;
			break;
		}
	}
	if (passages.length !== record.found.length) {
		throw new Error(`${slug}: the passages judged could not be cut again from the book`);
	}
	judged[slug] = { path, book, passages };
}
const slugs = Object.keys(judged).sort();

// The same pairs of passages every time, so that a run can go on from where it broke.
let seed = 20260922;
const random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = (count: number) => Math.floor(random() * count);

interface Match {
	one: string;
	other: string;
	at: number;
	from: number;
}
const matches: Match[] = [];
for (let a = 0; a < slugs.length; a++) {
	for (let b = a + 1; b < slugs.length; b++) {
		const [one, other] = [slugs[a]!, slugs[b]!];
		for (let round = 0; round < 2; round++) {
			matches.push({
				one,
				other,
				at: pick(judged[one]!.passages.length),
				from: pick(judged[other]!.passages.length)
			});
		}
	}
}

/** Which book stands first in the state, and against which passage of which other. */
const variant = (other: string, from: number, side: 'first' | 'second') =>
	`${side}, against passage ${from + 1} of ${other}`;

// What was asked already, by the book that stood first and the variant.
const done = new Map<string, Set<string>>();
for (const slug of slugs) {
	const mine = new Set<string>();
	for (const record of await jevRecordsOf(slug)) {
		if (record.by.questions !== set) continue;
		for (const one of record.found) if (one.variant) mine.add(`${one.section}:${one.variant}`);
	}
	done.set(slug, mine);
}

// Each call is kept under the book whose passage is `first`: the calls of a book, gathered.
const calls = new Map<string, Passage[]>();
let size = 0;
for (const { one, other, at, from } of matches) {
	for (const [first, second, mineAt, theirsAt] of [
		[one, other, at, from],
		[other, one, from, at]
	] as const) {
		const mine = judged[first]!.passages[mineAt]!;
		const theirs = judged[second]!.passages[theirsAt]!;
		const tag = variant(second, theirsAt, 'first');
		if (done.get(first)?.has(`${mine.section}:${tag}`)) continue;
		const state = { first: mine.state.chapter ?? '', second: theirs.state.chapter ?? '' };
		size += tokens(JSON.stringify(state).length);
		calls.set(first, [
			...(calls.get(first) ?? []),
			{
				section: mine.section,
				...(mine.piece ? { piece: mine.piece } : {}),
				variant: tag,
				state,
				measured: measure([state.first], true)
			}
		]);
	}
}
const count = [...calls.values()].reduce((sum, list) => sum + list.length, 0);
console.log(
	`${slugs.length} books, ${matches.length} matches, ${count} calls still to make of ${matches.length * 2}, some ${size.toLocaleString('en-US')} tokens: about $${usd(size).toFixed(2)}`
);
if (!go) {
	console.log('Nothing was sent to Jev. With --go, it is.');
	process.exit(0);
}

for (const slug of slugs) {
	const mine = calls.get(slug);
	if (!mine?.length) continue;
	const { path, book } = judged[slug]!;
	await runBook(path, book, () => mine, { set, questions }, remarks);
}
