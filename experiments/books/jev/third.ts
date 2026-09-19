import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { across, measure, ranges, sample } from '../../../src/judge.ts';
import type { Passage } from '../../../src/judge.ts';
import { listed } from '../../../src/library.ts';
import { sets } from '../../../src/questions.ts';
import { readBook } from '../../../src/read/index.ts';
import type { Book } from '../../../src/book.ts';
import { rewrite, ways } from './rewrites.ts';
import { books, run } from './run.ts';

/**
 * The check of the behavioural questions, on books that had no part in choosing them: twelve
 * passages of 3,000 words spread over the story, the questions and their valuation as they stood.
 * `node third.ts` judges the ten of the list. `node third.ts <book> <story>` judges one that is
 * somebody's, given where it is and which of its sections are its story, as `3-22`. `node third.ts
 * rewrites` is the test of ornament: the middle passage of seven of them as it is, told dull and
 * told overdone.
 */

export const ladders = [
	['the-wind-in-the-willows', 'the-wonderful-wizard-of-oz', 'tom-swift-and-his-motor-cycle'],
	['the-virginian', 'riders-of-the-purple-sage', 'deadwood-dick'],
	['the-age-of-innocence', 'the-rosary', 'three-weeks'],
	['cien-anos-de-soledad', 'amanecer']
];
export const alone = ['mrs-dalloway'];
/** Worth more than it reads, or reads better than it is worth. */
export const parting: Record<string, 'merit' | 'read'> = {
	'mrs-dalloway': 'merit',
	'the-age-of-innocence': 'merit',
	'tom-swift-and-his-motor-cycle': 'read',
	'riders-of-the-purple-sage': 'read',
	amanecer: 'read'
};
/** Those whose middle passage is told again badly: the upper two rungs of each ladder of the list, and the one alone. */
const retold = [...ladders.slice(0, 3).flatMap((ladder) => ladder.slice(0, 2)), ...alone];

export const size = 3000;
export const remarks =
	'The check of the behavioural questions: at 3,000 words, twelve passages spread over the story, with nothing changed.';

const passages = (story: string) => (book: Book) =>
	sample(across(book, ranges(story).flat(), size), 12);

if (import.meta.main) {
	const [what, story, ...more] = process.argv.slice(2);
	const list = (await listed()).filter(({ slug }) => [...ladders.flat(), ...alone].includes(slug));

	if (what === 'rewrites') {
		await mkdir(join(books, 'rewrites'), { recursive: true });
		// `node third.ts rewrites <slug> ...` goes over those books alone: a rewrite that failed is tried again.
		const asked = [story, ...more].filter((one): one is string => Boolean(one));
		const which = asked.length ? asked : retold;
		for (const { slug, story = '' } of list.filter(({ slug }) => which.includes(slug))) {
			const original = passages(story)(await readBook(join(books, `${slug}.epub`)))[5];
			if (!original?.state.chapter) continue;
			const told: Passage[] = [original];
			for (const way of Object.keys(ways) as (keyof typeof ways)[]) {
				const file = join(books, 'rewrites', `${slug}.third.${way}.json`);
				if (!existsSync(file)) {
					// The model that rewrites now and then answers what is no JSON: another try often lands.
					let made: Awaited<ReturnType<typeof rewrite>> | undefined;
					for (let attempt = 1; !made && attempt <= 3; attempt++) {
						made = await rewrite(original.state.chapter, way).catch(() => undefined);
					}
					if (!made) continue;
					const { usd, ...kept } = made;
					await writeFile(file, JSON.stringify(kept));
					console.log(`${slug} ${way}: ${kept.text.split(' ').length} words, $${usd.toFixed(4)}`);
				}
				const { text, by } = JSON.parse(await readFile(file, 'utf8'));
				told.push({
					...original,
					variant: `${way}, by ${by}`,
					state: { chapter: text as string },
					measured: measure((text as string).split(/\n{2,}/), true)
				});
			}
			await run(
				`${slug}.epub`,
				() => told,
				{ set: 'gut', questions: sets.gut },
				'The check of the behavioural questions, the test of ornament: the middle passage as it is, told dull and told overdone.'
			);
		}
	} else if (what && story) {
		await run(what, passages(story), { set: 'gut', questions: sets.gut }, remarks);
	} else {
		for (const { slug, story = '' } of list) {
			await run(`${slug}.epub`, passages(story), { set: 'gut', questions: sets.gut }, remarks);
		}
	}
}
