import { join, resolve } from 'node:path';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import type { Questions } from '@typesafe-ai/sdk';
import type { Book } from '../../../src/book.ts';
import { judgeAll, name, pieces } from '../../../src/judge.ts';
import type { Judged, Passage } from '../../../src/judge.ts';
import { key } from '../../../src/keys.ts';
import { rulesHash } from '../../../src/questions.ts';
import { readBook } from '../../../src/read/index.ts';
import { identify, jevRecord, keep } from '../../../src/records.ts';
import { table } from '../../../src/show.ts';

/**
 * What the experiments share: a book is read, the passages made of it are put to Jev with a set of
 * questions, what it said is shown and a record of it kept. An experiment spends what it spends
 * when it is run: they are a few thousandths of a dollar each.
 */

export const books = join(import.meta.dirname, '../../../books');

export async function run(
	file: string,
	passages: (book: Book) => Passage[],
	asked: { set: string; questions: Questions },
	remarks: string
): Promise<Judged[]> {
	// A book of the list by its file name; somebody's, by where its owner has it.
	const path = resolve(books, file);
	const book = await readBook(path);
	const client = new TypeSafeClient({ apiKey: key('TYPESAFE_API_KEY') });
	const at = new Date().toISOString();

	const { judged, broke } = await judgeAll(passages(book), asked.questions, (request) =>
		client.systemOne(request)
	);
	console.log(`\n${book.title} · ${asked.set}\n`);
	console.log(table(judged, Object.keys(asked.questions)));
	if (judged.length > 0) {
		const record = jevRecord(
			await identify(path, book),
			at,
			{ questions: asked.set, rules: rulesHash(asked.questions), asked: asked.questions },
			judged
		);
		const kept = await keep({
			...record,
			remarks: [remarks, broke ? `Stopped before the end: ${broke.message.slice(0, 300)}` : '']
				.filter(Boolean)
				.join(' ')
		});
		console.log(
			`\n${record.took.calls} calls, ${record.took.tokensIn.toLocaleString('en-US')} tokens in, $${record.took.usd.toFixed(4)}, ${record.took.seconds} s · ${kept}`
		);
	}
	if (broke) throw broke;
	return judged;
}

/** Of four sections, a piece of about 1,000 words each: the first of the first, the middle ones of the two between, the last of the last. */
export const spread =
	(sections: number[]) =>
	(book: Book): Passage[] => {
		const [first, second, third, last] = sections.map((section) => pieces(book, section - 1, 1000));
		const middle = (cut?: Passage[]) => cut?.[Math.floor(cut.length / 2)];
		return [first?.[0], middle(second), middle(third), last?.at(-1)].filter(
			(one): one is Passage => one !== undefined
		);
	};

export { name };
