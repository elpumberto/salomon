import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * What is known of the books judged, from outside Salomón: how far the institutions of literature
 * hold each, and what readers say of it. It is the truth a valuation is set against, by how far
 * its order agrees with each, and it is graded, not a list of pairs: `truth/README.md` says where
 * it comes from and what it leans to. The sources are kept as gathered, under `truth/`, and the
 * degrees are made from them here, by rules written before any source was read.
 */

const root = join(import.meta.dirname, '..', 'truth');

/** The nine slots of standing, each 0 or 1: `truth/README.md` says what each is. */
export const slots = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as const;
export type Slot = (typeof slots)[number];

/** A source's answer for a slot: found, not found, or not reachable. */
type Answer = 0 | 1 | 'unchecked';

export interface Truth {
	title: string;
	year: number;
	language: string;
	/** The mean of the nine slots, from 0 to 1. */
	standing: number;
	slots: Record<Slot, 0 | 1>;
	/** Slots whose source could not be reached, and count as 0. */
	unchecked: Slot[];
	counts: { syllabi: number | null; languages: number | null; gutenberg30d: number | null };
	facts: { pulpOrigin: boolean | null; heldWorst: boolean | null };
	enjoyment: {
		goodreads: { rating: number; count: number } | null;
		librarything: { rating: number; members: number } | null;
	};
}

const at = (answer: Answer | undefined): [0 | 1, boolean] => [
	answer === 1 ? 1 : 0,
	answer === 'unchecked' || answer === undefined
];

async function json<T>(name: string): Promise<T> {
	return JSON.parse(await readFile(join(root, name), 'utf8')) as T;
}

/** The truth of every book, made from the sources as they were gathered. */
export async function truth(): Promise<Record<string, Truth>> {
	const books =
		await json<{ slug: string; title: string; year: number; language: string }[]>('books.json');
	const lists = (await json<{ books: Record<string, Record<string, Answer>> }>('lists.json')).books;
	const editions = (
		await json<{
			books: Record<string, Record<string, Answer> & { pulp_origin?: 0 | 1; held_worst?: 0 | 1 }>;
		}>('editions.json')
	).books;
	const readers = (
		await json<{
			books: Record<
				string,
				{
					goodreads?: { rating: number; count: number } | 'unchecked';
					librarything?: { rating: number; members: number } | 'unchecked';
					syllabi?: { count: number } | 'unchecked';
					note?: string;
				}
			>;
		}>('readers.json')
	).books;
	const wiki = (
		await json<{
			books: Record<string, { languages: number | null; gutenberg_downloads_30d?: number | null }>;
		}>('wikidata.json')
	).books;

	const all: Record<string, Truth> = {};
	for (const { slug, title, year, language } of books) {
		const [list, edition, reader, page] = [
			lists[slug] ?? {},
			editions[slug] ?? {},
			readers[slug] ?? {},
			wiki[slug] ?? { languages: null }
		];
		const unchecked: Slot[] = [];
		const got = {} as Record<Slot, 0 | 1>;
		for (const slot of ['A', 'B', 'C', 'D'] as const) {
			const [value, missing] = at(list[slot]);
			got[slot] = value;
			if (missing) unchecked.push(slot);
		}
		for (const slot of ['E', 'F', 'G'] as const) {
			const [value, missing] = at(edition[slot]);
			got[slot] = value;
			if (missing) unchecked.push(slot);
		}
		// Absent from an index that reaches down to three syllabi is under three, not unknown.
		const syllabi =
			typeof reader.syllabi === 'object'
				? reader.syllabi.count
				: reader.note?.includes('Not in the Open Syllabus')
					? 0
					: null;
		got.H = (syllabi ?? 0) >= 100 ? 1 : 0;
		if (syllabi === null) unchecked.push('H');
		got.I = (page.languages ?? 0) >= 30 ? 1 : 0;
		if (page.languages === null) unchecked.push('I');
		const goodreads = typeof reader.goodreads === 'object' ? reader.goodreads : null;
		const librarything = typeof reader.librarything === 'object' ? reader.librarything : null;
		all[slug] = {
			title,
			year,
			language,
			standing: Number((slots.reduce((sum, slot) => sum + got[slot], 0) / slots.length).toFixed(3)),
			slots: got,
			unchecked,
			counts: {
				syllabi,
				languages: page.languages,
				gutenberg30d: page.gutenberg_downloads_30d ?? null
			},
			facts: {
				pulpOrigin: edition.pulp_origin === undefined ? null : edition.pulp_origin === 1,
				heldWorst: edition.held_worst === undefined ? null : edition.held_worst === 1
			},
			enjoyment: {
				goodreads: goodreads ? { rating: goodreads.rating, count: goodreads.count } : null,
				librarything: librarything
					? { rating: librarything.rating, members: librarything.members }
					: null
			}
		};
	}
	return all;
}

type Scores = Record<string, number | null | undefined>;

/**
 * How far two orders of the same books agree, from -1 to 1: of every pair of books that both
 * order, the share in the same order less the share in the opposite one, ties given for by the
 * tau-b of Kendall. 0.6 is four pairs of five the same way round.
 */
export function agreement(one: Scores, other: Scores): { tau: number; books: number } {
	const keys = Object.keys(one).filter(
		(key) => one[key] != null && other[key] != null && !Number.isNaN(one[key])
	);
	let same = 0;
	let opposite = 0;
	let tiedInOne = 0;
	let tiedInOther = 0;
	for (let a = 0; a < keys.length; a++) {
		for (let b = a + 1; b < keys.length; b++) {
			const x = Math.sign((one[keys[a]!] ?? 0) - (one[keys[b]!] ?? 0));
			const y = Math.sign((other[keys[a]!] ?? 0) - (other[keys[b]!] ?? 0));
			if (x === 0 && y === 0) continue;
			if (x === 0) tiedInOne++;
			else if (y === 0) tiedInOther++;
			else if (x === y) same++;
			else opposite++;
		}
	}
	const under = Math.sqrt((same + opposite + tiedInOne) * (same + opposite + tiedInOther));
	return { tau: under ? (same - opposite) / under : NaN, books: keys.length };
}

/**
 * The agreement, and how far it would move with other books like these: the books are drawn
 * again with replacement so many times, and the 5th and 95th of what comes out are the band. The
 * draws are the same every time, so that a table can be made again.
 */
export function band(
	one: Scores,
	other: Scores,
	draws = 2000
): { tau: number; low: number; high: number; books: number } {
	const { tau, books } = agreement(one, other);
	const keys = Object.keys(one).filter((key) => one[key] != null && other[key] != null);
	let seed = 20260922;
	const random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
	const taus: number[] = [];
	for (let draw = 0; draw < draws; draw++) {
		const drawnOne: Scores = {};
		const drawnOther: Scores = {};
		keys.forEach((_, at) => {
			const key = keys[Math.floor(random() * keys.length)]!;
			drawnOne[`${key}#${at}`] = one[key];
			drawnOther[`${key}#${at}`] = other[key];
		});
		taus.push(agreement(drawnOne, drawnOther).tau);
	}
	taus.sort((a, b) => a - b);
	return {
		tau,
		low: taus[Math.floor(0.05 * draws)] ?? NaN,
		high: taus[Math.floor(0.95 * draws)] ?? NaN,
		books
	};
}
