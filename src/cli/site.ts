import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { listed } from '../library.ts';
import { rulesHash, sets } from '../questions.ts';
import { isValuation, jevRecordsOf, recorded } from '../records.ts';
import { rules, rulesHash as valuation, unit, value, way } from '../value.ts';

/**
 * Writes `site/data.json`, which is all the site knows: every book judged the way books are
 * valued, as the records have it, with its valuation and, passage by passage, what each answer
 * came to, so that the page can weigh them another way without asking anything of anybody. What
 * a record cannot say of a book, how its title is best written or that the copy judged was a poor
 * one, is in `site/books.json`.
 */

interface About {
	title?: string;
	author?: string;
	caveat?: { en: string; es: string };
}

const site = join(import.meta.dirname, '../../site');
const about: Record<string, About> = JSON.parse(await readFile(join(site, 'books.json'), 'utf8'));
const list = Object.fromEntries((await listed()).map((one) => [one.slug, one]));
const asked = rulesHash(sets[way.questions]);
const ids = [...rules.merit, 'warning', ...rules.read, 'skip'];

const mean = (values: number[]) => values.reduce((sum, one) => sum + one, 0) / (values.length || 1);
const round = (one: number) => Number(one.toFixed(3));

const books = [];
for (const slug of await recorded()) {
	const records = await jevRecordsOf(slug);
	const judged = records.findLast((one) => one.by.rules === asked && isValuation(one));
	if (!judged) continue;
	const { pulse, ...valued } = value(judged.found);
	// What the judge knows of the book, and what the valuation is without it: `docs/books/against-the-canon.md`.
	const knowing = records.findLast((one) => one.by.questions === 'recognise-jev');
	const disguised = records.findLast((one) => one.by.questions === 'gut-disguised');
	const wordings = ['second', 'third', 'fourth']
		.map((name) => records.findLast((one) => one.by.questions === `gut-${name}`))
		.filter((one) => one !== undefined);
	const merits = [valued.merit.value, ...wordings.map((one) => value(one.found).merit.value)];
	const known = {
		...(knowing
			? { famous: round(mean(knowing.found.map(({ answers }) => unit(answers, 'famous')))) }
			: {}),
		...(disguised ? { namesChanged: round(value(disguised.found).merit.value) } : {}),
		...(wordings.length ? { wordings: round(Math.max(...merits) - Math.min(...merits)) } : {})
	};
	books.push({
		slug,
		title: about[slug]?.title ?? list[slug]?.title ?? judged.book.title,
		author:
			about[slug]?.author ?? (list[slug] as { author?: string })?.author ?? judged.book.author,
		language: judged.book.language,
		...(about[slug]?.caveat ? { caveat: about[slug].caveat } : {}),
		judged: judged.at.slice(0, 10),
		...valued,
		...(Object.keys(known).length ? { known } : {}),
		// What each answer came to, from 0 to 1, in the order of `answers`.
		passages: judged.found.map(({ answers }) =>
			ids.map((id) => Number(unit(answers, id).toFixed(3)))
		)
	});
}
books.sort((one, other) => other.merit.value - one.merit.value);

const data = { way, questions: asked, valuation, rules, answers: ids, books };
await writeFile(join(site, 'data.json'), `${JSON.stringify(data)}\n`);
console.log(`${books.length} books · site/data.json`);
