import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, parse } from 'node:path';
import type { Questions } from '@typesafe-ai/sdk';
import { words } from './book.ts';
import type { Book } from './book.ts';
import { usd } from './estimate.ts';
import type { Judged } from './judge.ts';
import { isListed } from './library.ts';
import { open, took } from './notes.ts';
import type { Notes, Took } from './notes.ts';

/**
 * The repo is also the register of what was run: every run that costs money or gives scores
 * leaves a record under `records/`, which goes in git. A record says what was run on what, when,
 * under which rules, what it took and what came of it. It stands on its own, and it never carries
 * a word of the book nor of the notes taken of it: those stay under `books/`, and a record tells
 * them by their hash.
 */

const root = join(import.meta.dirname, '..');

const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');

/** Which book, and which exact text of it. */
export interface BookIdentity {
	title: string | null;
	author: string | null;
	language: string | null;
	/**
	 * The file it was read from: its hash tells one edition from another. Of a book that is not of
	 * the list only the format is kept, since the name and the hash of somebody's file tell where
	 * it came from and add nothing: the hash of the text is enough to know two runs read the same.
	 */
	source: { file?: string; format: string; sha256?: string };
	/** The text once normalized. A hash that changes with the same source is the reader that changed. */
	text: { sha256: string; sections: number; words: number };
}

export async function identify(path: string, book: Book): Promise<BookIdentity> {
	const { title, author, language, source, sections } = book;
	return {
		title,
		author,
		language,
		source: (await isListed(path))
			? { ...source, sha256: sha256(await readFile(path)) }
			: { format: source.format },
		text: {
			sha256: sha256(JSON.stringify(sections)),
			sections: sections.length,
			words: sections.reduce((sum, section) => sum + words(section.paragraphs.join(' ')), 0)
		}
	};
}

/** The code a run was made with. `dirty` is for changes that were in no commit yet. */
export function code(): { commit: string | null; dirty: boolean } {
	const git = (...args: string[]) =>
		execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
	try {
		return {
			commit: git('rev-parse', '--short', 'HEAD').trim(),
			dirty: git('status', '--porcelain') !== ''
		};
	} catch {
		return { commit: null, dirty: false };
	}
}

export interface NotesRecord {
	kind: 'notes';
	/** When the run started. */
	at: string | null;
	book: BookIdentity;
	/** The sections read, numbered from 1 as `normalize --sections` lists them. */
	sections: { from: number; to: number };
	by: {
		model: string;
		through: 'OpenRouter';
		/** What OpenRouter was told about which providers to let in, when it was told anything. */
		routing?: Notes['routing'];
		/**
		 * What each provider did: its calls, how many of its answers were not kept, and what it was
		 * paid. In the first records, only the sections it had a hand in.
		 */
		providers: Record<string, number | { calls: number; notKept: number; usd: number }>;
		/** The instructions and the shape of the answer, by their hash: they are in the code. */
		rules: string;
		code: ReturnType<typeof code>;
	};
	took: {
		calls: number;
		tokensIn: number;
		tokensOut: number;
		tokensThinking: number;
		usd: number;
		/** Null when it was not measured. */
		seconds: number | null;
	};
	/** What came of it, in numbers. The notes themselves are told by their hash. */
	found: {
		story: number;
		apparatus: number;
		people: number;
		threads: number;
		/** Those a last look at the whole book found settled after all, when there was one. */
		threadsSettledOnReview?: number;
		threadsLeftOpen: number;
		/** What the reader knows so far, section by section: how many times within its length, and its longest. */
		synopsis?: { withinLength: number; of: number; longestWords: number };
		notes: { sha256: string };
	};
	/** A run that did not get to the end: the section it stopped at, and why. */
	failed?: { section: number; why: string };
	/** What someone reading the record later should know about it. */
	remarks?: string;
}

/** The section a run broke at, what was spent on it, and why it broke. */
export interface Lost {
	index: number;
	took: Took;
	why: string;
}

export function notesRecord(book: BookIdentity, notes: Notes, lost?: Lost): NotesRecord {
	const done = took(notes);
	const log = [...(done.log ?? []), ...(lost?.took.log ?? [])];
	const calls = done.calls + (lost?.took.calls ?? 0);
	const seconds = Math.round(done.seconds + (lost?.took.seconds ?? 0));
	const usage = { ...done.usage };
	for (const key of Object.keys(usage) as (keyof typeof usage)[]) {
		usage[key] += lost?.took.usage[key] ?? 0;
	}
	const providers: Record<string, { calls: number; notKept: number; usd: number }> = {};
	for (const { provider, outcome, usd } of log) {
		const one = (providers[provider ?? 'unknown'] ??= { calls: 0, notKept: 0, usd: 0 });
		one.calls++;
		if (outcome !== 'kept') one.notKept++;
		one.usd = Number((one.usd + usd).toFixed(6));
	}
	const story = notes.sections.filter((section) => section.kind === 'story');
	const lengths = story.map((section) => words(section.soFar));

	return {
		kind: 'notes',
		at: notes.startedAt,
		book,
		sections: {
			from: (notes.sections[0]?.index ?? lost?.index ?? 0) + 1,
			to: (notes.sections.at(-1)?.index ?? lost?.index ?? 0) + 1
		},
		by: {
			model: notes.model,
			through: 'OpenRouter',
			...(notes.routing ? { routing: notes.routing } : {}),
			providers,
			rules: notes.rules,
			code: code()
		},
		took: { calls, ...usage, usd: Number(usage.usd.toFixed(6)), seconds },
		found: {
			story: story.length,
			apparatus: notes.sections.length - story.length,
			people: notes.cast.length,
			threads: notes.threads.length,
			threadsSettledOnReview: notes.threads.filter((thread) => thread.review?.verdict === 'settled')
				.length,
			threadsLeftOpen: open(notes).length,
			synopsis: {
				withinLength: lengths.filter((length) => length <= 300).length,
				of: lengths.length,
				longestWords: Math.max(0, ...lengths)
			},
			notes: { sha256: sha256(JSON.stringify(notes)) }
		},
		// Never the text of a book: what a provider answers may quote what it was sent.
		...(lost ? { failed: { section: lost.index + 1, why: lost.why.slice(0, 300) } } : {})
	};
}

/** What Jev said of some sections of a book, and what it was asked. */
export interface JevRecord {
	kind: 'jev';
	/** When the run started. */
	at: string;
	book: BookIdentity;
	/** The sections judged, whole or in part, numbered from 1 as `normalize --sections` lists them. */
	sections: number[];
	by: {
		/** The model as Jev named it in its answers. */
		model: string;
		/** The set of questions by its name, by the hash of its wording, and in full as it was asked. */
		questions: string;
		rules: string;
		asked: Questions;
		code: ReturnType<typeof code>;
	};
	/** Jev says the tokens and not the money: the dollars are the tokens at its list price. */
	took: { calls: number; tokensIn: number; usd: number; seconds: number };
	/**
	 * Passage by passage: which part of the book it was, what code measured of it, the hash of what
	 * was sent, and Jev's answers by the name of the question.
	 */
	found: Omit<Judged, 'model'>[];
	remarks?: string;
}

export function jevRecord(
	book: BookIdentity,
	at: string,
	asked: { questions: string; rules: string; asked: Questions },
	judged: Judged[]
): JevRecord {
	const tokensIn = judged.reduce((sum, one) => sum + one.tokensIn, 0);
	return {
		kind: 'jev',
		at,
		book,
		sections: [
			...new Set(
				judged.flatMap(({ section, through = section }) =>
					Array.from({ length: through - section + 1 }, (_, step) => section + step)
				)
			)
		].sort((one, other) => one - other),
		by: {
			model: [...new Set(judged.map((one) => one.model))].join(', '),
			...asked,
			code: code()
		},
		took: {
			calls: judged.length,
			tokensIn,
			usd: Number(usd(tokensIn).toFixed(6)),
			seconds: Math.round(judged.reduce((sum, one) => sum + one.seconds, 0))
		},
		found: judged.map(({ model, ...rest }) => rest)
	};
}

/**
 * Writes a record where it belongs and returns its path from the root of the repo. Its name says
 * when the run started and who ran it: runs set off together start in the same second. The record
 * of a run may be written again as the run goes on; the record of another run is never written over.
 */
export async function keep(record: NotesRecord | JevRecord, base = root): Promise<string> {
	const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
	const stamp = (record.at ?? new Date().toISOString()).replace(/[-:]|\.\d+/g, '');
	const { source, title } = record.book;
	const folder = join(
		'records',
		'books',
		slug(source.file ? parse(source.file).name : (title ?? 'untitled'))
	);
	const run = (one: NotesRecord | JevRecord) =>
		JSON.stringify([
			one.at,
			one.by.model,
			one.kind === 'jev' ? one.by.rules : (one.by.routing ?? null)
		]);

	await mkdir(join(base, folder), { recursive: true });
	for (let copy = 1; ; copy++) {
		const name = `${stamp}.${record.kind}.${slug(record.by.model)}${copy > 1 ? `.${copy}` : ''}.json`;
		const there: NotesRecord | JevRecord | undefined = await readFile(
			join(base, folder, name),
			'utf8'
		).then(JSON.parse, () => undefined);
		if (there && run(there) !== run(record)) continue;
		await writeFile(join(base, folder, name), `${JSON.stringify(record, null, '\t')}\n`);
		return join(folder, name);
	}
}
