import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { words } from '../book.ts';
import type { Book } from '../book.ts';
import { tokens, tokensPerCall, usd } from '../estimate.ts';
import { readBook } from '../read/index.ts';

/**
 * Reads each book given, writes it normalized to `books/normalized/` and prints what is in it.
 * `--sections` lists every section instead of the longest few.
 */

const out = join(import.meta.dirname, '../../books/normalized');
const count = new Intl.NumberFormat('en-US');

function describe(book: Book, everySection: boolean): string {
	const sizes = book.sections.map((section, index) => {
		const text = section.paragraphs.join(' ');
		return { index, title: section.title, words: words(text), characters: text.length };
	});
	const total = (key: 'words' | 'characters') => sizes.reduce((sum, size) => sum + size[key], 0);
	const paragraphs = book.sections.reduce((sum, section) => sum + section.paragraphs.length, 0);
	const bookTokens = tokens(total('characters'));

	const shown = everySection ? sizes : [...sizes].sort((a, b) => b.words - a.words).slice(0, 5);
	const rows = shown.map(
		({ index, title, words, characters }) =>
			`  ${String(index + 1).padStart(4)}  ${count.format(words).padStart(8)}  ${count.format(tokens(characters)).padStart(8)}  ${title ?? '(untitled)'}`
	);
	const tooLong = sizes.filter((size) => tokens(size.characters) > tokensPerCall).length;

	return [
		`${book.title ?? '(no title)'} · ${book.author ?? '(no author)'} · ${book.language ?? '??'} · ${book.source.file}`,
		`  ${count.format(sizes.length)} sections, ${count.format(paragraphs)} paragraphs, ${count.format(total('words'))} words, ${count.format(total('characters'))} characters`,
		`  about ${count.format(bookTokens)} tokens: $${usd(bookTokens).toFixed(4)} to send it all once, in no fewer than ${Math.ceil(bookTokens / tokensPerCall)} calls`,
		`  sections too long for one call: ${tooLong}`,
		'',
		`  ${everySection ? 'every section' : 'the longest sections'}`,
		`  ${'#'.padStart(4)}  ${'words'.padStart(8)}  ${'~tokens'.padStart(8)}  title`,
		...rows
	].join('\n');
}

const args = process.argv.slice(2);
const everySection = args.includes('--sections');
const paths = args.filter((arg) => !arg.startsWith('--'));
if (paths.length === 0) {
	console.error('usage: npm run normalize -- [--sections] <book.epub | book.txt>...');
	process.exit(1);
}

await mkdir(out, { recursive: true });
for (const path of paths) {
	const book = await readBook(path);
	const file = `${book.source.file}.json`;
	await writeFile(join(out, file), JSON.stringify(book, null, '\t'));
	console.log(`${describe(book, everySection)}\n\n  written to books/normalized/${file}\n`);
}
