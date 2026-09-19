import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, parse } from 'node:path';
import { words } from './book.ts';
import type { Book } from './book.ts';
import { rules } from './notes.ts';
import type { Notes } from './notes.ts';

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
	/** The file it was read from. The hash tells one edition from another. */
	source: { file: string; format: string; sha256: string };
	/** The text once normalized. A hash that changes with the same source is the reader that changed. */
	text: { sha256: string; sections: number; words: number };
}

export async function identify(path: string, book: Book): Promise<BookIdentity> {
	const { title, author, language, source, sections } = book;
	return {
		title,
		author,
		language,
		source: { ...source, sha256: sha256(await readFile(path)) },
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
		/** How many sections each provider ran, when known. */
		providers: Record<string, number>;
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
		threadsLeftOpen: number;
		notes: { sha256: string };
	};
	/** What someone reading the record later should know about it. */
	remarks?: string;
}

export function notesRecord(book: BookIdentity, notes: Notes): NotesRecord {
	const sum = (pick: (section: Notes['sections'][number]) => number) =>
		notes.sections.reduce((total, section) => total + pick(section), 0);
	const timed = notes.sections.every((section) => section.seconds !== undefined);
	const providers: Record<string, number> = {};
	for (const { provider } of notes.sections) {
		if (provider) providers[provider] = (providers[provider] ?? 0) + 1;
	}

	return {
		kind: 'notes',
		at: notes.startedAt ?? null,
		book,
		sections: {
			from: (notes.sections[0]?.index ?? 0) + 1,
			to: (notes.sections.at(-1)?.index ?? 0) + 1
		},
		by: {
			model: notes.model,
			through: 'OpenRouter',
			providers,
			rules: `sha256:${sha256(JSON.stringify(rules)).slice(0, 12)}`,
			code: code()
		},
		took: {
			calls: notes.sections.length,
			tokensIn: sum((section) => section.usage.tokensIn),
			tokensOut: sum((section) => section.usage.tokensOut),
			tokensThinking: sum((section) => section.usage.tokensThinking),
			usd: Number(sum((section) => section.usage.usd).toFixed(6)),
			seconds: timed ? Math.round(sum((section) => section.seconds ?? 0)) : null
		},
		found: {
			story: notes.sections.filter((section) => section.kind === 'story').length,
			apparatus: notes.sections.filter((section) => section.kind === 'apparatus').length,
			people: notes.cast.length,
			threads: notes.threads.length,
			threadsLeftOpen: notes.threads.filter((thread) => thread.closed === null).length,
			notes: { sha256: sha256(JSON.stringify(notes)) }
		}
	};
}

/** Writes a record where it belongs and returns its path from the root of the repo. */
export async function keep(record: NotesRecord): Promise<string> {
	const slug = parse(record.book.source.file)
		.name.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-');
	const stamp = (record.at ?? new Date().toISOString()).replace(/[-:]|\.\d+/g, '');
	const path = join('records', 'books', slug, `${stamp}.${record.kind}.json`);
	await mkdir(join(root, path, '..'), { recursive: true });
	await writeFile(join(root, path), `${JSON.stringify(record, null, '\t')}\n`);
	return path;
}
