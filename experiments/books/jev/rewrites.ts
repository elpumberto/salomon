import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pieces, whole } from '../../../src/judge.ts';
import { key } from '../../../src/keys.ts';
import { createOpenRouter, defaultModel } from '../../../src/openrouter.ts';
import { readBook } from '../../../src/read/index.ts';
import { books } from './run.ts';

/**
 * The same passage, told worse on purpose: a language model rewrites it keeping what happens and
 * spoiling how it is told, one way dull and one way overdone. With what happens held still, what
 * moves in Jev's answers is owed to the writing. The rewrites stay under `books/`, out of git.
 */

const ways = {
	flat: 'badly written in a dull way: flat, generic wording; stock phrases and clichés wherever one fits; feelings named outright instead of shown; no image a reader would remember; sentences all of the same shape. Keep it grammatical',
	purple:
		'badly written in an overdone way: adjectives and adverbs piled up, grand words for small things, strained metaphors, alliteration, exclamations, and sentences so ornate that they are hard to follow'
};

export const rewritten = (slug: string, way: string) =>
	join(books, 'rewrites', `${slug}.${way}.json`);

const openRouter = createOpenRouter(key('OPENROUTER_API_KEY'));
const originals = [
	{
		slug: 'king-solomons-mines.9.4',
		passage: pieces(await readBook(join(books, 'king-solomons-mines.epub')), 8, 1000)[3]
	},
	{
		slug: 'pride-and-prejudice.2',
		passage: whole(await readBook(join(books, 'pride-and-prejudice.epub')), 1)
	}
];

await mkdir(join(books, 'rewrites'), { recursive: true });
for (const { slug, passage } of originals) {
	for (const [way, how] of Object.entries(ways)) {
		if (!passage?.state.chapter || existsSync(rewritten(slug, way))) continue;
		const { value, usage } = await openRouter.askJson<{ text: string }>({
			model: defaultModel,
			system: `You rewrite a passage of a novel. The rewrite tells exactly the same events, in the same order, with the same characters, says what they say where they speak, and is about as long; but it is ${how}. Separate paragraphs with a blank line.`,
			user: passage.state.chapter,
			schema: {
				name: 'rewrite',
				schema: {
					type: 'object',
					properties: { text: { type: 'string' } },
					required: ['text'],
					additionalProperties: false
				}
			},
			maxTokens: 8_000,
			routing: { sort: 'price' }
		});
		await writeFile(rewritten(slug, way), JSON.stringify({ way, by: defaultModel, ...value }));
		console.log(`${slug} ${way}: ${value.text.split(' ').length} words, $${usage.usd.toFixed(4)}`);
	}
}
