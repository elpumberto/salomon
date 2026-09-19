import { join } from 'node:path';
import { words } from './book.ts';
import type { Book } from './book.ts';
import { measure, pieces } from './judge.ts';
import type { Judged, Passage } from './judge.ts';
import { listed } from './library.ts';
import { readBook } from './read/index.ts';

/**
 * A panel of passages of known standing that pieces of a book are set against, side by side,
 * which is where Jev is steadiest. The panel is a piece each of the books that `gutenberg.json`
 * lists as anchors, which are never judged themselves. The piece is picked by a rule that does not
 * look at how good it is: of the chapters of some length in the middle of the book, the middle
 * one; of its pieces, the one nearest to a third of it being speech.
 */

const root = join(import.meta.dirname, '..');

export function anchorOf(book: Book): string {
	const long = book.sections
		.map((section, index) => ({ index, size: words(section.paragraphs.join(' ')) }))
		.filter(({ index, size }) => {
			const place = index / book.sections.length;
			return size >= 1_500 && place >= 0.3 && place <= 0.7;
		});
	const chapter = long[Math.floor(long.length / 2)];
	if (!chapter) throw new Error(`${book.title} has no chapter to take an anchor from`);
	const [best] = pieces(book, chapter.index, 1000).sort(
		(one, other) =>
			Math.abs((one.measured.spoken ?? 0) - 0.35) - Math.abs((other.measured.spoken ?? 0) - 0.35)
	);
	return best?.state.chapter ?? '';
}

export async function panel(): Promise<{ slug: string; text: string }[]> {
	const anchors = (await listed()).filter((book) => book.use === 'anchor');
	return Promise.all(
		anchors.map(async ({ slug }) => ({
			slug,
			text: anchorOf(await readBook(join(root, 'books', `${slug}.epub`)))
		}))
	);
}

/** As many pieces of the story as asked for, evenly spread from its first to its last. */
export function sample(all: Passage[], count: number): Passage[] {
	if (all.length <= count) return all;
	return Array.from(
		{ length: count },
		(_, at) => all[Math.round((at * (all.length - 1)) / (count - 1))]
	).filter((one): one is Passage => one !== undefined);
}

/** Each piece against each anchor, both ways round: `variant` says which anchor and where the piece sat. */
export function against(sampled: Passage[], anchors: { slug: string; text: string }[]): Passage[] {
	return sampled.flatMap((piece) =>
		anchors.flatMap(({ slug, text }) =>
			(['first', 'second'] as const).map((side) => {
				const mine = piece.state.chapter ?? '';
				const state =
					side === 'first' ? { first: mine, second: text } : { first: text, second: mine };
				return {
					section: piece.section,
					...(piece.piece ? { piece: piece.piece } : {}),
					variant: `${side}, against ${slug}`,
					state,
					measured: measure([mine], true)
				};
			})
		)
	);
}

/** How often the book's pieces were chosen over the panel, as the probability Jev gave them, by question. */
export function chosen(judged: Pick<Judged, 'variant' | 'answers'>[]): Record<string, number> {
	const totals: Record<string, number[]> = {};
	for (const { variant = '', answers } of judged) {
		const side = variant.startsWith('first') ? 'first' : 'second';
		for (const [id, answer] of Object.entries(answers)) {
			if ('choice' in answer) (totals[id] ??= []).push(answer.probabilities[side] ?? 0);
		}
	}
	return Object.fromEntries(
		Object.entries(totals).map(([id, values]) => [
			id,
			Number((values.reduce((sum, one) => sum + one, 0) / values.length).toFixed(3))
		])
	);
}
