import type { Questions } from '@typesafe-ai/sdk';
import { across, ranges, sample } from '../../../src/judge.ts';
import { listed } from '../../../src/library.ts';
import { sets } from '../../../src/questions.ts';
import { passage } from './passage-questions.ts';
import { run } from './run.ts';
import { all } from './scoreboard.ts';

/**
 * Other ways of judging the same twenty books, to be set against the one in use by one yardstick:
 * twelve passages a book, evenly spread over its story and cut across its sections, of a size
 * given in words, asked one set of questions. `node variants.ts passage 3000`, `node variants.ts
 * gut 1000`. Twelve passages order the ladders as the whole book does, which is what makes trying
 * many ways cheap.
 */

const [which = 'passage', size = '1000'] = process.argv.slice(2);
const questions: Questions = which === 'gut' ? sets.gut : passage;
const books = (await listed()).filter(({ slug }) => all.includes(slug));

for (const { slug, story = '' } of books) {
	await run(
		`${slug}.epub`,
		(book) => sample(across(book, ranges(story).flat(), Number(size)), 12),
		{ set: which, questions },
		`Variant: ${which} at ${size} words. Twelve passages spread over the story, cut across its sections.`
	);
}
