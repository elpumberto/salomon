import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import type { Book, Format, Read } from '../book.ts';
import { readEpub } from './epub.ts';
import { readTxt } from './txt.ts';

const readers: Record<Format, (bytes: Uint8Array) => Read> = { epub: readEpub, txt: readTxt };

/** Reads a book from an `.epub` or a `.txt`. */
export async function readBook(path: string): Promise<Book> {
	const format = extname(path).slice(1).toLowerCase();
	if (format !== 'epub' && format !== 'txt') {
		throw new Error(`${basename(path)}: only .epub and .txt are read`);
	}
	const read = readers[format](await readFile(path));
	return { ...read, source: { file: basename(path), format } };
}
