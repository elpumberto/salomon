import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { choice } from '@typesafe-ai/sdk';
import { words } from '../../../src/book.ts';
import { across, measure } from '../../../src/judge.ts';
import type { Passage } from '../../../src/judge.ts';
import { key } from '../../../src/keys.ts';
import { listed } from '../../../src/library.ts';
import { createOpenRouter, defaultModel } from '../../../src/openrouter.ts';
import { sample } from '../../../src/panel.ts';
import { readBook } from '../../../src/read/index.ts';
import { books, run } from './run.ts';
import { all } from './scoreboard.ts';

/**
 * What the writing adds to what is told: six passages of each book, each set beside a plain and
 * competent retelling of itself by a language model, in its own language and at its length, and
 * Jev asked both ways round which of the two is the better. What is told is the same on both
 * sides, so genre, subject and age weigh the same on both: what is left is the writing. The
 * retellings stay under `books/`, out of git.
 */

const pair = '`first` and `second` are two passages of novels that tell the same events. ';
const either = { first: 'The passage in `first`', second: 'The passage in `second`' };
const questions = {
	better: choice(`${pair}Which of the two is the better written?`, either),
	enjoy: choice(`${pair}Which of the two would most readers enjoy reading more?`, either),
	lesson: choice(
		`${pair}Which of the two would a teacher of writing rather give to a class as an example to learn from?`,
		either
	)
};

const openRouter = createOpenRouter(key('OPENROUTER_API_KEY'));
const dir = join(books, 'rewrites');
await mkdir(dir, { recursive: true });

async function retold(slug: string, at: number, text: string): Promise<string> {
	const file = join(dir, `${slug}.duel.${at}.json`);
	if (existsSync(file)) return JSON.parse(await readFile(file, 'utf8')).text;
	const { value } = await openRouter.askJson<{ text: string }>({
		model: defaultModel,
		system:
			'You retell a passage of a novel in plain, correct, present-day prose, in the same language as the passage. Every event, in the same order, with the same people; where they speak, they speak, in your words. No ornament, no figures of speech, no comment of yours. As long as the passage: do not shorten it. Separate paragraphs with a blank line.',
		user: text,
		schema: {
			name: 'retelling',
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
	await writeFile(file, JSON.stringify({ by: defaultModel, ...value }));
	return value.text;
}

for (const { slug, story = '' } of (await listed()).filter((one) => all.includes(one.slug))) {
	const indexes = story.split(',').flatMap((part) => {
		const [from = 1, to = from] = part.split('-').map(Number);
		return Array.from({ length: to - from + 1 }, (_, step) => from - 1 + step);
	});
	// A book is set against its retellings once.
	const before = await readdir(join(books, '../records/books', slug)).catch(() => []);
	const asked = await Promise.all(
		before
			.filter((one) => one.includes('.jev.'))
			.map(async (one) =>
				JSON.parse(await readFile(join(books, '../records/books', slug, one), 'utf8'))
			)
	);
	if (asked.some((record) => record.by.questions === 'duel')) continue;
	const book = await readBook(join(books, `${slug}.epub`));
	const originals = sample(across(book, indexes, 1000), 6);
	// The model that retells turns some passages down, for the violence in them: those are left out.
	const retellings = await Promise.all(
		originals.map((one, at) => retold(slug, at, one.state.chapter ?? '').catch(() => null))
	);
	const passages: Passage[] = originals.flatMap((one, at) => {
		const [mine, other] = [one.state.chapter ?? '', retellings[at]];
		if (!other) return [];
		const ratio = (words(other) / words(mine)).toFixed(2);
		return (['first', 'second'] as const).map((side) => ({
			section: one.section,
			...(one.piece ? { piece: one.piece } : {}),
			variant: `${side}, against its own plain retelling by ${defaultModel}, ${ratio} of its length`,
			state: side === 'first' ? { first: mine, second: other } : { first: other, second: mine },
			measured: measure([mine], true)
		}));
	});
	await run(
		`${slug}.epub`,
		() => passages,
		{ set: 'duel', questions },
		'Variant: duel. Six passages of about 1,000 words, each against a plain retelling of itself, both ways round.'
	);
}
