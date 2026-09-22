import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { measure } from '../../../src/judge.ts';
import type { Passage } from '../../../src/judge.ts';
import { key } from '../../../src/keys.ts';
import { createOpenRouter, defaultModel } from '../../../src/openrouter.ts';
import { sets } from '../../../src/questions.ts';
import { jevRecordsOf } from '../../../src/records.ts';
import { judgedPassages } from './judged.ts';
import { books, runBook } from './run.ts';

/** The set of `recognise-jev.ts`, whose four novels differ by book: taken from each book's record. */
const recognised = 'recognise-jev';

/**
 * The same text with the names changed: whether what Jev makes of a passage is the passage or
 * the book it knows it to be. `recognise-jev.ts` found Jev names the novel of every judged
 * passage and that its sense of which are well known orders the books as the standing does
 * better than its judgment of the writing. Fame may inflate the judgment, or the famous may be
 * the better written; a correlation cannot tell. So the judged passages of six books, two of the
 * canon, two sellers of their day and two of the bottom floor, are told again by a language model
 * with every proper name changed for another of the same kind and time, and nothing else
 * touched, and put to Jev as before: which novel it is from and whether it is well known, the
 * behavioural questions of the valuation, and the scholar's.
 *
 * Said before any was asked, 2026-09-22. The disguise has worked on a passage when Jev's
 * probability on the right novel falls under 0.5; a book on which it worked for fewer than half
 * its passages says nothing. On the passages where it worked: if merit moves by less than 0.03
 * on average, fame did not inflate the judgment of the writing and no discount is owed; if it
 * falls by more, the fall is the premium of fame, and the way to judge is with the names changed.
 * The scholar's question of a century from now is expected to fall more than merit does.
 *
 *   node experiments/books/jev/disguise.ts [--all] [--go]
 *
 * Added after the six, 2026-09-22: with `--all`, every judged book, so that a valuation of the
 * text alone, its names changed, can be set against the standing beside the valuation as it is.
 * Expected: the famous fall by hundredths and the bottom floor not at all, and the agreement with
 * the standing comes out under merit's 0.62, since part of that agreement was fame; the lower
 * number is the honest one.
 */

const go = process.argv.includes('--go');
/** The six tried first; with `--all`, every book judged. */
export const chosen = process.argv.includes('--all')
	? Object.keys(await judgedPassages())
	: [
			'pride-and-prejudice',
			'dracula',
			'the-prisoner-of-zenda',
			'the-sheik',
			'deadwood-dick',
			'irene-iddesleigh'
		];
export const tag = `names changed by ${defaultModel}`;

const openRouter = createOpenRouter(key('OPENROUTER_API_KEY'));
const dir = join(books, 'rewrites');
await mkdir(dir, { recursive: true });

async function disguised(
	slug: string,
	at: number,
	text: string,
	language: string
): Promise<string> {
	const file = join(dir, `${slug}.disguise.${at}.json`);
	if (existsSync(file)) return JSON.parse(await readFile(file, 'utf8')).text;
	const { value } = await openRouter.askJson<{ text: string }>({
		model: defaultModel,
		system: `You are given a passage of a novel in ${language === 'es' ? 'Spanish' : 'English'}. Return the same passage with every proper name changed: people, places, houses, ships, streets, titles of nobility with a name in them, and any name that could identify the book, each replaced by an invented name of the same kind, language and period, used consistently throughout. Change nothing else: not a word of the rest, not the punctuation, not the paragraphs. Separate paragraphs with a blank line.`,
		user: text,
		schema: {
			name: 'disguised',
			schema: {
				type: 'object',
				properties: { text: { type: 'string' } },
				required: ['text'],
				additionalProperties: false
			}
		},
		maxTokens: 12_000,
		routing: { sort: 'price' }
	});
	await writeFile(file, JSON.stringify({ by: defaultModel, text: value.text }));
	return value.text;
}

const judged = await judgedPassages();
type Asked = Parameters<typeof runBook>[3]['questions'];
// The scholar's questions as they were asked, from any book's record of them.
const trials = (asked: Asked, scholarly: Asked) => [
	{ set: `${recognised}-disguised`, questions: asked },
	{ set: 'gut-disguised', questions: sets.gut },
	{ set: 'scholar-disguised', questions: scholarly }
];
console.log(
	`${chosen.length} books, ${chosen.reduce((sum, slug) => sum + (judged[slug]?.passages.length ?? 0), 0)} passages to disguise, then 3 sets of questions each: some $0.10 for six books, $0.60 for all.`
);
if (!go) {
	console.log('Nothing was sent. With --go, it is.');
	process.exit(0);
}

for (const slug of chosen) {
	const { path, book, passages } = judged[slug]!;
	const before = await jevRecordsOf(slug);
	const told: Passage[] = [];
	for (const [at, one] of passages.entries()) {
		// The model that rewrites turns some passages down, for the violence in them: those are left out.
		const text = await disguised(slug, at, one.state.chapter ?? '', book.language ?? 'en').catch(
			() => null
		);
		if (text === null) continue;
		told.push({ ...one, variant: tag, state: { chapter: text }, measured: measure([text], true) });
	}
	console.log(`${slug}: ${told.length} of ${passages.length} passages disguised`);
	// The four novels and the right key are those `recognise-jev.ts` used for this book.
	const known = before.findLast((one) => one.by.questions === recognised);
	if (!known) throw new Error(`${slug}: not asked by recognise-jev.ts yet`);
	const right = known.found[0]?.variant?.match(/right (\w)/)?.[1];
	const scholarly = before.findLast((one) => one.by.questions === 'scholar')?.by.asked;
	if (!scholarly) throw new Error(`${slug}: not asked by scholar.ts yet`);
	for (const { set, questions } of trials(known.by.asked, scholarly)) {
		if (before.some((one) => one.by.questions === set)) continue;
		await runBook(
			path,
			book,
			() =>
				told.map((one) => ({
					...one,
					variant: set.startsWith(recognised) ? `${tag}, right ${right}` : tag
				})),
			{ set, questions },
			`Variant: disguise. The judged passages with every proper name changed by ${defaultModel} and nothing else, asked ${set}.`
		);
	}
}
