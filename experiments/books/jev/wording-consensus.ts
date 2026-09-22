import { tokens, usd } from '../../../src/estimate.ts';
import { jevRecordsOf } from '../../../src/records.ts';
import { judgedPassages } from './judged.ts';
import { runBook } from './run.ts';
import { wordings } from './wordings.ts';

/**
 * The valuation's questions in three other wordings (`wordings.ts`), asked of every judged
 * passage as it is, beside the wording in use, which the records already hold. Said before any
 * was asked, 2026-09-22: the merit of a book under each wording is set against the standing; the
 * consensus, the mean of the four, is expected to agree with it as well as the wording in use
 * does, 0.62, or better, and to carry beside each book how far the wordings part, which is the
 * error of the wording that no valuation had. Where they part most is expected to be the middle
 * of the scales, not their ends. Three calls a passage: some $0.20.
 *
 *   node experiments/books/jev/wording-consensus.ts [--go]
 */

const go = process.argv.includes('--go');
const judged = await judgedPassages();
let size = 0;
let calls = 0;
const todo: { slug: string; name: string }[] = [];
for (const [slug, { passages }] of Object.entries(judged)) {
	const asked = await jevRecordsOf(slug);
	for (const name of Object.keys(wordings)) {
		if (asked.some((one) => one.by.questions === `gut-${name}`)) continue;
		todo.push({ slug, name });
		calls += passages.length;
		for (const one of passages) size += tokens(JSON.stringify(one.state).length);
	}
}
console.log(
	`${todo.length} runs of ${Object.keys(judged).length * Object.keys(wordings).length}, ${calls} calls, some ${size.toLocaleString('en-US')} tokens: about $${usd(size).toFixed(3)}`
);
if (!go) {
	console.log('Nothing was sent to Jev. With --go, it is.');
	process.exit(0);
}
for (const { slug, name } of todo) {
	const { path, book, passages } = judged[slug]!;
	await runBook(
		path,
		book,
		() => passages.map((one) => ({ ...one, variant: `wording ${name}` })),
		{ set: `gut-${name}`, questions: wordings[name]! },
		`Variant: wording ${name}. The behavioural questions of the valuation in other words, of the judged passages as they are.`
	);
}
