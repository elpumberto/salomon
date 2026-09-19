import type { Notes } from './notes.ts';

/**
 * The whole of a book as Jev can take it in: an outline made from the reading notes. A summary of
 * each chapter of the story in order, the questions the story raised and where each was settled,
 * and the people in it with what changed for each. It names the characters and neither the book
 * nor its author. A book of hundreds of chapters does not fit in a call so: `brief` keeps the first
 * sentence of each summary, and of its people those to whom most happens, with the first and the
 * last of what changes for them.
 */
export function outline(
	notes: Notes,
	{ brief = false } = {}
): { chapters: string[]; threads: string[]; people: string[] } {
	const story = notes.sections.filter((section) => section.kind === 'story');
	// Chapters are numbered as the outline has them, not as the file does.
	const chapter = new Map(story.map((section, at) => [section.index, at + 1]));
	const place = (index: number | null) =>
		index === null ? null : (chapter.get(index) ?? story.filter((one) => one.index < index).length);

	return {
		chapters: story.map(
			(section, at) =>
				`${at + 1}. ${brief ? (section.summary.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? section.summary) : section.summary}`
		),
		threads: notes.threads
			.filter((thread) => thread.review?.verdict !== 'not_a_thread')
			.map((thread) => {
				const settled =
					thread.closed !== null
						? `settled in chapter ${place(thread.closed)}`
						: thread.review?.verdict === 'settled'
							? 'settled by the end'
							: 'never settled';
				return `${thread.what} Raised in chapter ${place(thread.opened)}, ${settled}.`;
			}),
		people: notes.cast.flatMap(({ name, who }) => {
			const changes = story.flatMap((section, at) =>
				section.characters
					.filter((one) => one.name === name && one.change)
					.map((one) => `in chapter ${at + 1}, ${one.change}`)
			);
			// Those for whom something changes at least twice: the rest are the background.
			if (changes.length < (brief ? 6 : 2)) return [];
			const told = brief ? [...changes.slice(0, 2), ...changes.slice(-2)] : changes;
			return [`${name}, ${who}: ${told.join('; ')}`];
		})
	};
}
