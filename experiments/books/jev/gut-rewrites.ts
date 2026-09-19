import { readFile } from 'node:fs/promises';
import type { Book } from '../../../src/book.ts';
import { measure, pieces, whole } from '../../../src/judge.ts';
import type { Passage } from '../../../src/judge.ts';
import { rewritten } from './rewrites.ts';
import { run } from './run.ts';
import { sets } from '../../../src/questions.ts';

/** The behavioural questions put to a passage as it is, told dull and told overdone: whether ornament takes them in. */

const withRewrites = async (original: Passage, slug: string): Promise<Passage[]> => [
	original,
	...(await Promise.all(
		['flat', 'purple'].map(async (way) => {
			const { text, by } = JSON.parse(await readFile(rewritten(slug, way), 'utf8'));
			return {
				...original,
				variant: `${way}, by ${by}`,
				state: { chapter: text as string },
				measured: measure((text as string).split(/\n{2,}/), true)
			};
		})
	))
];
const remarks = 'The behavioural questions put to a passage as it is, told dull and told overdone.';
const cases: [string, string, (book: Book) => Passage | undefined][] = [
	['king-solomons-mines.epub', 'king-solomons-mines.9.4', (book) => pieces(book, 8, 1000)[3]],
	['pride-and-prejudice.epub', 'pride-and-prejudice.2', (book) => whole(book, 1)]
];
for (const [file, slug, pick] of cases) {
	let original: Passage | undefined;
	await run(
		file,
		(book) => {
			original = pick(book);
			return [];
		},
		{ set: 'gut', questions: sets.gut },
		remarks
	).catch(() => undefined);
	if (!original) continue;
	const all = await withRewrites(original, slug);
	await run(file, () => all, { set: 'gut', questions: sets.gut }, remarks);
}
