/** A book, read and cleaned: what every later step works from, whatever file it came in. */
export interface Book {
	title: string | null;
	author: string | null;
	/** A language code such as `en` or `es`, when the file says. */
	language: string | null;
	/** The file it was read from: its name, never its path. */
	source: { file: string; format: Format };
	sections: Section[];
}

export type Format = 'epub' | 'txt';

/** What a reader gets out of a file: the book, short of where it came from. */
export type Read = Omit<Book, 'source'>;

/** A stretch of the book that its table of contents or its headings set apart: a chapter, a preface. */
export interface Section {
	/** Null for what comes before the first heading, and for a book that has none. */
	title: string | null;
	/** Plain text, one string per paragraph, with no line breaks inside. */
	paragraphs: string[];
}

/** Text on one line: soft hyphens out, any run of whitespace down to one space. */
export function tidy(text: string): string {
	return text.replace(/­/g, '').replace(/\s+/g, ' ').trim();
}

/** Gathers a book's sections while its text is read in order. */
export function collector() {
	const sections: Section[] = [];
	let current: Section = { title: null, paragraphs: [] };

	return {
		/** From here on, paragraphs belong to a new section. */
		open(title: string | null): void {
			sections.push(current);
			current = { title: (title && tidy(title)) || null, paragraphs: [] };
		},
		add(paragraph: string): void {
			const text = tidy(paragraph);
			if (text) current.paragraphs.push(text);
		},
		/** A heading with nothing under it, such as a part's title right before a chapter's, is dropped. */
		done(): Section[] {
			return [...sections, current].filter((section) => section.paragraphs.length > 0);
		}
	};
}

export type Collector = ReturnType<typeof collector>;

export function words(text: string): number {
	return text ? text.split(' ').length : 0;
}
