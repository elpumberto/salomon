import { collector, tidy } from '../book.ts';
import type { Read } from '../book.ts';
import { unwrap } from './gutenberg.ts';

/**
 * Plain text says nothing about its own structure, so it is guessed: a blank line ends a paragraph,
 * and a short paragraph that reads like a chapter's heading opens a section.
 */

/** Words that open a heading whatever follows them. */
const opens = /^(chapter|cap[ií]tulo|chapitre|capitolo|kapitel)\b/i;
/** Words that ordinary sentences start with too: a heading only with a number after them. */
const opensNumbered =
	/^(book|part|parte|libro|volume|volumen|tomo|act|acto|canto)\s+(\d+|[ivxlcdm]+)\b/i;
/** Headings of one word. */
const alone =
	/^(prologue|pr[oó]logo|epilogue|ep[ií]logo|preface|prefacio|introduction|introducci[oó]n|foreword|afterword)\.?$/i;

function isHeading(block: string, line: string): boolean {
	if (line.length > 300 || block.split('\n').length > 4) return false;
	return opens.test(line) || opensNumbered.test(line) || alone.test(line);
}

export function readTxt(bytes: Uint8Array): Read {
	const text = new TextDecoder().decode(bytes).replace(/\r\n?/g, '\n');
	const gutenberg = unwrap(text);
	const into = collector();

	for (const block of (gutenberg?.body ?? text).split(/\n[ \t]*\n/)) {
		const line = tidy(block);
		if (isHeading(block.trim(), line)) into.open(line);
		else into.add(line);
	}

	return {
		title: gutenberg?.title ?? null,
		author: gutenberg?.author ?? null,
		language: gutenberg?.language ?? null,
		sections: into.done()
	};
}
