/**
 * One yardstick for any way of judging the books: given what each book came to in merit and as a
 * read, how many of the eighteen pairs of books of a same ladder are in order and by how much,
 * and in how many of the seven books named beforehand the two valuations part the way expected.
 * The parting is told by ranks among the books, so that it does not hang on the scale of a score.
 */

export const ladders = [
	['pride-and-prejudice', 'the-sheik', 'irene-iddesleigh'],
	['treasure-island', 'king-solomons-mines', 'tarzan-of-the-apes'],
	['the-turn-of-the-screw', 'dracula', 'varney-the-vampire'],
	['the-moonstone', 'the-mysterious-affair-at-styles', 'the-mystery-of-a-hansom-cab'],
	['the-war-of-the-worlds', 'the-lost-world', 'edisons-conquest-of-mars'],
	['la-regenta', 'la-barraca', 'el-cocinero-de-su-majestad']
];
export const alone = ['don-quijote', 'ulysses'];
export const all = [...ladders.flat(), ...alone];

/** Worth more than it reads, or reads better than it is worth. */
const parting: Record<string, 'merit' | 'read'> = {
	'the-turn-of-the-screw': 'merit',
	'la-regenta': 'merit',
	ulysses: 'merit',
	'tarzan-of-the-apes': 'read',
	'the-sheik': 'read',
	'the-mysterious-affair-at-styles': 'read',
	'the-lost-world': 'read'
};

export type Scores = Record<string, { merit: number; read?: number }>;

export function board(scores: Scores, of = { ladders, parting }) {
	const { ladders, parting } = of;
	let pairs = 0;
	let inOrder = 0;
	const margins: number[] = [];
	for (const ladder of ladders) {
		for (let high = 0; high < ladder.length; high++) {
			for (let low = high + 1; low < ladder.length; low++) {
				const [one, other] = [scores[ladder[high] ?? ''], scores[ladder[low] ?? '']];
				if (!one || !other) continue;
				pairs++;
				if (one.merit > other.merit) inOrder++;
				if (low === high + 1) margins.push(one.merit - other.merit);
			}
		}
	}
	const rank = (key: 'merit' | 'read') => {
		const sorted = Object.entries(scores)
			.filter(([, one]) => one[key] !== undefined)
			.sort(([, one], [, other]) => (other[key] ?? 0) - (one[key] ?? 0))
			.map(([slug]) => slug);
		return (slug: string) => sorted.indexOf(slug);
	};
	const [byMerit, byRead] = [rank('merit'), rank('read')];
	const parted = Object.entries(parting).filter(([slug, more]) => {
		if (scores[slug]?.read === undefined) return false;
		return more === 'merit' ? byMerit(slug) < byRead(slug) : byRead(slug) < byMerit(slug);
	}).length;
	const spread = margins.length ? margins.reduce((sum, one) => sum + one, 0) / margins.length : 0;
	return {
		pairs,
		inOrder,
		margin: Number(spread.toFixed(3)),
		parted,
		ofParting: Object.keys(parting).length
	};
}
