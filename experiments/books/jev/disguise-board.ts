import { rulesHash, sets } from '../../../src/questions.ts';
import { isValuation, jevRecordsOf } from '../../../src/records.ts';
import { gated, read, unit, way } from '../../../src/value.ts';

/**
 * What the disguise of `disguise.ts` did to Jev's answers, from the records and asking nothing:
 * passage by passage, whether Jev still knows the novel, and how merit, the read and the scholar's
 * questions moved from the passage as it is to the passage with its names changed. Then, over the
 * passages where the disguise worked, the mean of each move: the premium of fame, if there is one.
 */

const chosen = [
	'pride-and-prejudice',
	'dracula',
	'the-prisoner-of-zenda',
	'the-sheik',
	'deadwood-dick',
	'irene-iddesleigh'
];
const asked = rulesHash(sets[way.questions]);
const mean = (values: number[]) => values.reduce((sum, one) => sum + one, 0) / (values.length || 1);
const ids = ['essay', 'course', 'second', 'convention', 'doing', 'imitate', 'risk', 'century'];
const two = (one: number | null | undefined) =>
	one == null ? '  — ' : (one >= 0 ? ' ' : '') + one.toFixed(2);

interface Move {
	knewBefore: number;
	knowsAfter: number;
	famousBefore: number;
	famousAfter: number;
	merit: [number, number];
	read: [number, number];
	scholar: [number, number] | null;
	century: [number, number] | null;
}
const all: Move[] = [];
console.log(
	`${''.padEnd(34)}knows: before after   famous: before after   merit: before after   read: before after   century: before after`
);
for (const slug of chosen) {
	const records = await jevRecordsOf(slug);
	const valued = records.findLast((one) => one.by.rules === asked && isValuation(one));
	const by = (set: string) => records.findLast((one) => one.by.questions === set);
	const [knew, knows, gut, scholar, scholarAfter] = [
		by('recognise-jev'),
		by('recognise-jev-disguised'),
		by('gut-disguised'),
		by('scholar'),
		by('scholar-disguised')
	];
	if (!valued || !knew || !knows || !gut) {
		console.log(`${slug.padEnd(34)}not yet`);
		continue;
	}
	const right = knew.found[0]?.variant?.match(/right (\w)/)?.[1] ?? 'a';
	const at = (record: typeof valued, key: string) =>
		record.found.find((one) => `${one.section}/${one.piece?.at ?? 0}` === key);
	const moves: Move[] = [];
	for (const one of valued.found) {
		const key = `${one.section}/${one.piece?.at ?? 0}`;
		const [k0, k1, g1, s0, s1] = [
			at(knew, key),
			at(knows, key),
			at(gut, key),
			scholar && at(scholar, key),
			scholarAfter && at(scholarAfter, key)
		];
		if (!k0 || !k1 || !g1) continue;
		const probability = (record: typeof one) =>
			record.answers.which && 'choice' in record.answers.which
				? (record.answers.which.probabilities[right] ?? 0)
				: 0;
		const famous = (record: typeof one) => unit(record.answers, 'famous');
		moves.push({
			knewBefore: probability(k0),
			knowsAfter: probability(k1),
			famousBefore: famous(k0),
			famousAfter: famous(k1),
			merit: [gated(one.answers), gated(g1.answers)],
			read: [read(one.answers), read(g1.answers)],
			scholar:
				s0 && s1
					? [
							mean(ids.map((id) => unit(s0.answers, id))),
							mean(ids.map((id) => unit(s1.answers, id)))
						]
					: null,
			century: s0 && s1 ? [unit(s0.answers, 'century'), unit(s1.answers, 'century')] : null
		});
	}
	all.push(...moves);
	const avg = (get: (m: Move) => number) => mean(moves.map(get));
	console.log(
		`${slug.padEnd(34)}${two(avg((m) => m.knewBefore))} ${two(avg((m) => m.knowsAfter))}          ${two(avg((m) => m.famousBefore))} ${two(avg((m) => m.famousAfter))}          ${two(avg((m) => m.merit[0]))} ${two(avg((m) => m.merit[1]))}         ${two(avg((m) => m.read[0]))} ${two(avg((m) => m.read[1]))}        ${two(moves[0]?.century ? avg((m) => m.century![0]) : null)} ${two(moves[0]?.century ? avg((m) => m.century![1]) : null)}   (${moves.filter((m) => m.knowsAfter < 0.5).length} of ${moves.length} disguised)`
	);
}

const worked = all.filter((m) => m.knowsAfter < 0.5);
const failed = all.filter((m) => m.knowsAfter >= 0.5);
const shift = (list: Move[], get: (m: Move) => [number, number] | null) => {
	const pairs = list.map(get).filter((p): p is [number, number] => p !== null);
	return pairs.length ? `${two(mean(pairs.map(([a, b]) => b - a)))} over ${pairs.length}` : '—';
};
console.log(
	`\nPassages: ${all.length}; the disguise worked (Jev under 0.5 on the right novel) on ${worked.length}, failed on ${failed.length}.`
);
console.log('Mean move from the passage as it is to the passage disguised:');
for (const [name, list] of [
	['where it worked', worked],
	['where it failed', failed]
] as const) {
	console.log(`  ${name}:`);
	console.log(`    famous   ${shift(list, (m) => [m.famousBefore, m.famousAfter])}`);
	console.log(`    merit    ${shift(list, (m) => m.merit)}`);
	console.log(`    read     ${shift(list, (m) => m.read)}`);
	console.log(`    scholar  ${shift(list, (m) => m.scholar)}`);
	console.log(`    century  ${shift(list, (m) => m.century)}`);
}
