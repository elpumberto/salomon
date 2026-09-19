import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Downloads the books listed in `gutenberg.json` into `books/`, as EPUB and as plain text. */

interface Listed {
	id: number;
	slug: string;
}

const root = join(import.meta.dirname, '../..');
const dir = join(root, 'books');

/** The two forms Project Gutenberg serves a book in that Salomón reads. */
const forms = [
	{ extension: 'epub', path: (id: number) => `${id}.epub3.images` },
	{ extension: 'txt', path: (id: number) => `${id}.txt.utf-8` }
];

const listed = JSON.parse(await readFile(join(root, 'gutenberg.json'), 'utf8')) as Listed[];
await mkdir(dir, { recursive: true });

for (const { id, slug } of listed) {
	for (const { extension, path } of forms) {
		const file = join(dir, `${slug}.${extension}`);
		if (existsSync(file)) {
			console.log(`have  books/${slug}.${extension}`);
			continue;
		}
		const response = await fetch(`https://www.gutenberg.org/ebooks/${path(id)}`);
		if (!response.ok) throw new Error(`${slug}.${extension}: HTTP ${response.status}`);
		const bytes = new Uint8Array(await response.arrayBuffer());
		await writeFile(file, bytes);
		console.log(`got   books/${slug}.${extension}  ${(bytes.length / 1024).toFixed(0)} KB`);
	}
}
