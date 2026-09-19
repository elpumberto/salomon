import { readFile } from 'node:fs/promises';
import { measure, pieces } from '../../../src/judge.ts';
import type { Passage } from '../../../src/judge.ts';
import { passage } from './passage-questions.ts';
import { rewritten } from './rewrites.ts';
import { run, spread } from './run.ts';

/**
 * The `passage` questions tried on pieces, before any book is judged whole with them: four pieces
 * of each book of the ladder of adventures, from its opening to its end, and beside them the
 * passages whose standing is known from the experiments before, a piece told dull and overdone, a
 * novel known for bad writing and one that lasts. What is looked at is each question: whether it
 * tells pieces apart, whether the faults show where they are and not where they are not.
 */

const asked = { set: 'passage', questions: passage };
const remarks =
	'Tuning of the passage questions on pieces of about 1,000 words: the ladder of adventures and passages of known standing. No valuation of any book.';

await run('treasure-island.epub', spread([2, 12, 23, 35]), asked, remarks);
await run('king-solomons-mines.epub', spread([5, 11, 17, 24]), asked, remarks);
await run('tarzan-of-the-apes.epub', spread([1, 9, 18, 28]), asked, remarks);
await run(
	'king-solomons-mines.epub',
	(book) => {
		const original = pieces(book, 8, 1000)[3];
		if (!original) throw new Error('No such piece');
		return [original];
	},
	asked,
	remarks
);
for (const way of ['flat', 'purple']) {
	const { text, by } = JSON.parse(
		await readFile(rewritten('king-solomons-mines.9.4', way), 'utf8')
	);
	await run(
		'king-solomons-mines.epub',
		(book) => {
			const original = pieces(book, 8, 1000)[3];
			if (!original) throw new Error('No such piece');
			return [
				{
					...original,
					variant: `${way}, by ${by}`,
					state: { chapter: text as string },
					measured: measure((text as string).split(/\n{2,}/), true)
				}
			];
		},
		asked,
		remarks
	);
}
await run('irene-iddesleigh.epub', spread([3, 8, 14, 21]), asked, remarks);
await run('pride-and-prejudice.epub', spread([2, 20, 35, 62]), asked, remarks);
