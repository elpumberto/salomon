import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { key } from '../../../src/keys.ts';
import { isListed } from '../../../src/library.ts';
import { createOpenRouter, defaultModel } from '../../../src/openrouter.ts';
import { code, identify } from '../../../src/records.ts';
import { judgedPassages } from './judged.ts';

/**
 * Whether the passages are known by heart. A judge that reads blind may still know a famous page,
 * and the questions that order the books best, whether the passage would still be read in a
 * century, are the ones a model could answer by knowing the book rather than by reading it. So a
 * language model is shown each judged passage alone and asked what book it is from, if it knows:
 * title, author, and how sure. How often it is right is what "known" is, passage by passage and
 * book by book, and what Jev's answers do on the passages nobody recognises is then a fair test.
 * A record a book under `records/`, kind `recognise`; somebody's books go only to providers that
 * keep nothing.
 *
 *   node experiments/books/jev/recognise.ts [--go]
 */

const go = process.argv.includes('--go');
const judged = await judgedPassages();
const calls = Object.values(judged).reduce((sum, { passages }) => sum + passages.length, 0);
console.log(`${calls} passages of ${Object.keys(judged).length} books to ${defaultModel}`);
if (!go) {
	console.log("Nothing is sent without --go. At the model's price it is a few cents.");
	process.exit(0);
}

const openRouter = createOpenRouter(key('OPENROUTER_API_KEY'));
const root = join(import.meta.dirname, '../../../records/books');
for (const [slug, { path, book, passages }] of Object.entries(judged)) {
	const somebodys = !(await isListed(path));
	const at = new Date();
	const found = [];
	let usd = 0;
	let tokensIn = 0;
	let provider: string | null = null;
	for (const one of passages) {
		const text = one.state.chapter ?? '';
		const {
			value,
			usage,
			provider: who
		} = await openRouter.askJson<{
			title: string | null;
			author: string | null;
			confidence: number;
		}>({
			model: defaultModel,
			system:
				'You are shown a passage of a novel. If you recognise the novel, give its title and author; if you do not, give null for both. Say how sure you are, from 0 to 1. Answer from your own knowledge of books; do not reason about the style.',
			user: text,
			schema: {
				name: 'recognised',
				schema: {
					type: 'object',
					properties: {
						title: { type: ['string', 'null'] },
						author: { type: ['string', 'null'] },
						confidence: { type: 'number' }
					},
					required: ['title', 'author', 'confidence'],
					additionalProperties: false
				}
			},
			maxTokens: 200,
			routing: { sort: 'price', ...(somebodys ? { data_collection: 'deny' as const } : {}) }
		});
		usd += usage.usd;
		tokensIn += usage.tokensIn;
		provider = who;
		found.push({
			section: one.section,
			...(one.piece ? { piece: one.piece } : {}),
			sha256: createHash('sha256').update(JSON.stringify(one.state)).digest('hex'),
			title: value.title,
			author: value.author,
			confidence: value.confidence
		});
	}
	const record = {
		kind: 'recognise',
		at: at.toISOString(),
		book: await identify(path, book),
		by: { model: defaultModel, provider, code: code() },
		took: { calls: passages.length, tokensIn, usd, seconds: (Date.now() - at.getTime()) / 1000 },
		found,
		remarks:
			'Whether the judged passages are known by heart: the model is shown each alone and asked what book it is from.'
	};
	const folder = join(root, slug);
	await mkdir(folder, { recursive: true });
	const file = join(
		folder,
		`${at.toISOString().replace(/[-:]|\.\d+/g, '')}.recognise.${defaultModel.replace('/', '-')}.json`
	);
	await writeFile(file, JSON.stringify(record, null, '\t') + '\n');
	const known = found.filter((one) => one.title).length;
	console.log(`${slug.padEnd(34)} named ${known}/${found.length}  $${usd.toFixed(4)}`);
}
