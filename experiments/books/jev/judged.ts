import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { words } from '../../../src/book.ts';
import type { Book } from '../../../src/book.ts';
import { across, ranges, sample } from '../../../src/judge.ts';
import type { Passage } from '../../../src/judge.ts';
import { listed } from '../../../src/library.ts';
import { rulesHash, sets } from '../../../src/questions.ts';
import { readBook } from '../../../src/read/index.ts';
import { identify, isValuation, jevRecordsOf, recorded } from '../../../src/records.ts';
import { truth } from '../../../src/truth.ts';
import { way } from '../../../src/value.ts';
import { books } from './run.ts';

/**
 * The passages each book was valued on, cut again from the book as they were and checked by hash
 * against the record, for an experiment that puts the same passages to Jev another way. A book
 * of the list is read from its file; somebody's, from its normalized copy, which is the same text.
 */
export async function judgedPassages(): Promise<
	Record<string, { path: string; book: Book; passages: Passage[] }>
> {
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
	return judged;
}
