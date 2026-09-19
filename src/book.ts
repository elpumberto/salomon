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

/**
 * A book whose sections are a few lines each, under the headlines of a newspaper, with those
 * gathered into sections of some length, so that it can be read a section at a time like any
 * other. A section that is long enough stands as it is. A run of short ones is cut into sections
 * of at least as many words, what is left at its end going with the one before; the titles of
 * those gathered stay in the text, since they are part of what the book says.
 */
export function gathered(book: Book, atLeast: number): Book {
	const size = (section: Section) => words(section.paragraphs.join(' '));
	const sections: Section[] = [];
	let run: Section[] = [];
	const flush = () => {
		const made: Section[] = [];
		let open: Section | null = null;
		for (const section of run) {
			if (!open) {
				open = { title: section.title, paragraphs: [...section.paragraphs] };
			} else {
				open.paragraphs.push(...(section.title ? [section.title] : []), ...section.paragraphs);
			}
			if (size(open) >= atLeast) {
				made.push(open);
				open = null;
			}
		}
		const last = made.at(-1);
		if (open && last) {
			last.paragraphs.push(...(open.title ? [open.title] : []), ...open.paragraphs);
		} else if (open) made.push(open);
		sections.push(...made);
		run = [];
	};
	for (const section of book.sections) {
		if (size(section) >= atLeast) {
			flush();
			sections.push(section);
		} else run.push(section);
	}
	flush();
	return { ...book, sections };
}
