import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import { tokens, usd } from '../../../src/estimate.ts';
import { key } from '../../../src/keys.ts';
import { rulesHash, sets } from '../../../src/questions.ts';
import { code } from '../../../src/records.ts';

/**
 * The tables of the Bayes net from Jev's own knowledge, with no book shown to it: the fourteen
 * behavioural questions asked not of a passage but of what is known of the novel a passage is
 * from, at each of the four levels of standing that `bayes.ts` cuts. What comes back is, for each
 * level, what the answers of a passage of such a book would look like: a row of the table each.
 * Four calls; it shows the cost and sends nothing without `--go`. Kept in `bayes-tables.json`
 * beside this file, with what it took.
 */

const go = process.argv.includes('--go');
const questions = sets.gut;
const rules = rulesHash(questions);

const of = 'A passage of some 3,000 words of a novel. Of the novel this is known: ';
export const levels = {
	none: `${of}no institution of literature takes notice of it. It is in no canon list and no reading list, no classics series keeps it in print, no critical edition of it exists, encyclopaedias have no article on it, it is assigned in no university course, and Wikipedia has it in one language or in none.`,
	some: `${of}a few institutions of literature take notice of it. It is in print in a classics series, or on a reading list, or has an article in a handful of Wikipedias; it is in no critics' canon, encyclopaedias have no article of its own on it, and few university courses assign it.`,
	much: `${of}most institutions of literature hold it. It is in the canon lists and on the reading lists, in print in classics series and in a critical edition, an encyclopaedia has an article of its own on it, hundreds of university courses assign it, and Wikipedia has it in dozens of languages.`,
	canon: `${of}every institution of literature holds it, by every measure. The critics' canon names it and every reading list carries it, every classics series keeps it in print and critical editions exist, encyclopaedias have an article of its own on it, thousands of university courses assign it, and Wikipedia has it in seventy languages or more.`
};

const size = Object.values(levels).reduce((sum, state) => sum + tokens(state.length), 0);
console.log(
	`${Object.keys(levels).length} calls, some ${size} tokens of state: about $${usd(size).toFixed(5)}`
);
if (!go) {
	console.log('Nothing was sent to Jev. With --go, it is.');
	process.exit(0);
}

const client = new TypeSafeClient({ apiKey: key('TYPESAFE_API_KEY') });
const started = new Date();
const found: Record<string, unknown> = {};
let tokensIn = 0;
let model = '';
for (const [level, chapter] of Object.entries(levels)) {
	const { answers, usage, model: who } = await client.systemOne({ state: { chapter }, questions });
	found[level] = answers;
	tokensIn += usage.input_tokens;
	model = who;
	console.log(`  ${level}: asked`);
}
const record = {
	kind: 'jev',
	at: started.toISOString(),
	by: { model, questions: 'gut', rules, asked: questions, code: code() },
	took: {
		calls: Object.keys(levels).length,
		tokensIn,
		usd: usd(tokensIn),
		seconds: (Date.now() - started.getTime()) / 1000
	},
	states: levels,
	found,
	remarks:
		'The tables of the Bayes net of bayes.ts from what Jev knows: the gut questions asked of a description of a novel at each of four levels of standing, with no passage shown.'
};
await writeFile(
	join(import.meta.dirname, 'bayes-tables.json'),
	JSON.stringify(record, null, '\t') + '\n'
);
console.log(`\n${tokensIn} tokens in, $${usd(tokensIn).toFixed(5)}; kept in bayes-tables.json`);
