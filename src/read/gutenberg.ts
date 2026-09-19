/**
 * What is Project Gutenberg's own in the files it serves, and not the book's: its licence around
 * the text, and the marks its plain text uses for what plain text cannot show.
 */

/** In an EPUB, the licence comes in elements of this class. */
export const boilerplateClass = 'pg-boilerplate';

const start = /^\*\*\* ?START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*$/m;
const end = /^\*\*\* ?END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*$/m;

/** The header names the language in English. */
const languages: Record<string, string> = {
	english: 'en',
	spanish: 'es',
	french: 'fr',
	german: 'de',
	italian: 'it',
	portuguese: 'pt',
	catalan: 'ca'
};

export interface Unwrapped {
	body: string;
	title: string | null;
	author: string | null;
	language: string | null;
}

/** The book inside one of Gutenberg's plain texts, or null if the text is not one of them. */
export function unwrap(text: string): Unwrapped | null {
	const from = start.exec(text);
	if (!from) return null;
	const header = text.slice(0, from.index);
	const rest = text.slice(from.index + from[0].length);
	const to = end.exec(rest);

	const field = (name: string) =>
		new RegExp(`^${name}: *(.+)$`, 'm').exec(header)?.[1]?.trim() || null;
	const language = field('Language')?.toLowerCase();

	const body = (to ? rest.slice(0, to.index) : rest)
		// Where the printed book had a picture, with its caption if it had one.
		.replace(/\[Illustration[^\]]*\]/g, '')
		// Italics.
		.replace(/_([^_]{1,200})_/g, '$1');

	return {
		body,
		title: field('Title'),
		author: field('Author'),
		language: language ? (languages[language] ?? language) : null
	};
}
