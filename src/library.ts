import { readFile } from 'node:fs/promises';
import { join, parse } from 'node:path';

/**
 * The books of `gutenberg.json`: in the public domain, downloaded by `npm run fetch`, and free to
 * be named, hashed and sent anywhere. Any other book is somebody's: it is read from wherever its
 * owner has it, the providers that may store what they are sent are kept away from it, and what
 * is recorded of it says nothing of the file it came from.
 */

export interface Listed {
	slug: string;
	title: string;
	/** A book to judge, or one a passage is taken from to set others against. */
	use?: 'judged' | 'anchor';
	/** The sections that are the story, as `4-24` or `8-59,65-138`. */
	story?: string;
}

const list = join(import.meta.dirname, '../gutenberg.json');

export const listed = async (): Promise<Listed[]> => JSON.parse(await readFile(list, 'utf8'));

/** Whether a file is one of the books of the list, which are named after their slug. */
export async function isListed(path: string): Promise<boolean> {
	const { name } = parse(path);
	return (await listed()).some(({ slug }) => slug === name);
}
