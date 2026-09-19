import { createHash } from 'node:crypto';
import type { EntryType, Questions, SystemOneResult } from '@typesafe-ai/sdk';
import { words } from './book.ts';
import type { Book, Section } from './book.ts';
import { tokens, tokensPerCall } from './estimate.ts';

/**
 * Jev judges a passage: one call, the passage as the state and a set of questions about it. A
 * passage is a section of a book, a piece of one, or several in a row. What comes back is kept as
 * numbers alone, beside what code can measure of the same passage, so that where an answer can be
 * checked it is.
 */

/** Jev, or something that answers like it. */
export type AskJev = (request: {
	state: EntryType;
	questions: Questions;
}) => Promise<SystemOneResult<Questions>>;

/** A score is a place among the levels, from 0 to `of`; a noul, the probability of a yes. */
export type Answer =
	| { score: number; of: number; confidence: number; probabilities: number[] }
	| { noul: number }
	| { choice: string; confidence: number; probabilities: Record<string, number> };

/** What code can tell of a passage without reading it. */
export interface Measured {
	words: number;
	/** How much of the text is inside quotation marks, from 0 to 1. Null in a book that has none. */
	spoken: number | null;
	wordsPerSentence: number;
}

/** Which part of a book a passage is. Sections are numbered from 1, as `normalize --sections` lists them. */
export interface Where {
	section: number;
	/** The last section, for several in a row. */
	through?: number;
	/** Which piece of the section, for one cut in pieces. */
	piece?: { at: number; of: number };
	/** What was done to the text or put beside it, when anything was. */
	variant?: string;
}

export interface Passage extends Where {
	/** What Jev is sent: a text under `chapter` as a rule, and whatever goes with it under other names. */
	state: { [field: string]: string };
	measured: Measured;
}

export interface Judged extends Where {
	measured: Measured;
	/** Of the state as it was sent: two runs with the same one judged the same text. */
	sha256: string;
	model: string;
	tokensIn: number;
	seconds: number;
	answers: Record<string, Answer>;
}

/** Room left in a call for the questions and for what the guess of the tokens may be short by. */
const tokensToSpare = 3_000;

const round = (value: number, places = 4) => Number(value.toFixed(places));

/** The chapter as a reader meets it: its title, then its paragraphs. */
export function chapter(section: Section): string {
	return [section.title, ...section.paragraphs].filter(Boolean).join('\n\n');
}

export function measure(paragraphs: string[], quotationMarks: boolean): Measured {
	const text = paragraphs.join(' ');
	let spoken = 0;
	for (const [quote] of text.matchAll(/“[^”]*”/g)) spoken += quote.length;
	// A sentence ends where what follows starts with a capital: “Whose is it?” said Luis, is one.
	const sentences = text.split(/[.!?]+[”’")\]]*\s+(?=[“‘"(¿¡]?\p{Lu})/u).filter(Boolean).length;

	return {
		words: words(text),
		spoken: quotationMarks ? round(spoken / Math.max(1, text.length), 2) : null,
		wordsPerSentence: round(words(text) / Math.max(1, sentences), 1)
	};
}

const quotationMarks = (book: Book) =>
	book.sections.some(({ paragraphs }) => paragraphs.some((one) => one.includes('“')));

function section(book: Book, index: number): Section {
	const found = book.sections[index];
	if (!found) throw new Error(`The book has no section ${index + 1}`);
	return found;
}

/** A section whole. */
export function whole(book: Book, index: number): Passage {
	const one = section(book, index);
	return {
		section: index + 1,
		state: { chapter: chapter(one) },
		measured: measure(one.paragraphs, quotationMarks(book))
	};
}

/** Several sections in a row, as one text. */
export function together(book: Book, from: number, to: number): Passage {
	const all = Array.from({ length: to - from + 1 }, (_, step) => section(book, from + step));
	return {
		section: from + 1,
		through: to + 1,
		state: { chapter: all.map(chapter).join('\n\n') },
		measured: measure(
			all.flatMap((one) => one.paragraphs),
			quotationMarks(book)
		)
	};
}

/** A section cut where a paragraph ends, in pieces of about as many words, none of them a stub. */
export function pieces(book: Book, index: number, about: number): Passage[] {
	const one = section(book, index);
	const total = words(one.paragraphs.join(' '));
	const count = Math.max(1, Math.round(total / about));
	const cut: string[][] = [[]];
	let sofar = 0;
	for (const paragraph of one.paragraphs) {
		if (cut.length < count && sofar >= (total * cut.length) / count) cut.push([]);
		cut.at(-1)?.push(paragraph);
		sofar += words(paragraph);
	}
	return cut.map((paragraphs, at) => ({
		section: index + 1,
		piece: { at: at + 1, of: cut.length },
		state: { chapter: paragraphs.join('\n\n') },
		measured: measure(paragraphs, quotationMarks(book))
	}));
}

/**
 * Sections in a row cut as one text, where a paragraph ends, in pieces of about as many words: for
 * a book whose sections are a few lines each, under the headlines of a newspaper. A piece is of
 * the section it starts in.
 */
export function across(book: Book, indexes: number[], about: number): Passage[] {
	const paragraphs = indexes.flatMap((index) =>
		section(book, index).paragraphs.map((text) => ({ index, text }))
	);
	const total = words(paragraphs.map(({ text }) => text).join(' '));
	const count = Math.max(1, Math.round(total / about));
	const cut: (typeof paragraphs)[] = [[]];
	let sofar = 0;
	for (const paragraph of paragraphs) {
		if (cut.length < count && sofar >= (total * cut.length) / count) cut.push([]);
		cut.at(-1)?.push(paragraph);
		sofar += words(paragraph.text);
	}
	return cut.map((piece, at) => ({
		section: (piece[0]?.index ?? 0) + 1,
		piece: { at: at + 1, of: cut.length },
		state: { chapter: piece.map(({ text }) => text).join('\n\n') },
		measured: measure(
			piece.map(({ text }) => text),
			quotationMarks(book)
		)
	}));
}

/** As many passages as asked for, evenly spread from the first to the last. */
export function sample(all: Passage[], count: number): Passage[] {
	if (all.length <= count) return all;
	return Array.from(
		{ length: count },
		(_, at) => all[Math.round((at * (all.length - 1)) / (count - 1))]
	).filter((one): one is Passage => one !== undefined);
}

/** Sections given as `4,9,16-18`, numbered from 1: each range as the indexes of its sections. */
export function ranges(list: string): number[][] {
	return list.split(',').map((part) => {
		const [from, to = from] = part.split('-').map(Number);
		if (!from || !to || to < from) throw new Error(`Not a section nor a range of them: ${part}`);
		return Array.from({ length: to - from + 1 }, (_, step) => from - 1 + step);
	});
}

function kept(answer: SystemOneResult<Questions>['answers'][string]): Answer {
	if (answer.type === 'noul') return { noul: round(answer.noul) };
	if (answer.type === 'choice') {
		const { choice, confidence, probabilities } = answer;
		return { choice, confidence: round(confidence), probabilities: { ...probabilities } };
	}
	const probabilities = Object.entries(answer.probabilities)
		.sort(([one], [other]) => Number(one) - Number(other))
		.map(([, probability]) => round(probability));
	return {
		score: round(answer.score),
		of: probabilities.length - 1,
		confidence: round(answer.confidence),
		probabilities
	};
}

export async function judge(
	{ state, ...passage }: Passage,
	questions: Questions,
	ask: AskJev
): Promise<Judged> {
	const size = tokens(JSON.stringify(state).length);
	if (size > tokensPerCall - tokensToSpare) {
		throw new Error(
			`Section ${passage.section} is some ${size} tokens: more than fits in one call`
		);
	}

	const started = Date.now();
	const { answers, usage, model } = await ask({ state, questions });

	return {
		...passage,
		sha256: createHash('sha256').update(JSON.stringify(state)).digest('hex'),
		model,
		tokensIn: usage.input_tokens,
		seconds: round((Date.now() - started) / 1000, 1),
		answers: Object.fromEntries(Object.entries(answers).map(([id, answer]) => [id, kept(answer)]))
	};
}

/** One passage after another. What broke it, if anything did, comes back beside what was judged by then. */
export async function judgeAll(
	passages: Passage[],
	questions: Questions,
	ask: AskJev,
	each?: (judged: Judged) => void
): Promise<{ judged: Judged[]; broke?: Error }> {
	const judged: Judged[] = [];
	for (const passage of passages) {
		try {
			const one = await judge(passage, questions, ask);
			judged.push(one);
			each?.(one);
		} catch (error) {
			return { judged, broke: error instanceof Error ? error : new Error(String(error)) };
		}
	}
	return { judged };
}

/** A passage by its place in the book: §18, §16–18, §18 2/7, and what was done to it. */
export function name({ section, through, piece, variant }: Where): string {
	return [
		`§${section}${through ? `–${through}` : ''}`,
		piece ? `${piece.at}/${piece.of}` : '',
		variant ?? ''
	]
		.filter(Boolean)
		.join(' ');
}
