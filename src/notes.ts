import type { Book } from './book.ts';
import type { Usage } from './openrouter.ts';

/**
 * Reading notes. Jev never sees a whole book, only what fits in a call, so a language model reads
 * the book ahead of it, a section at a time and in order, carrying what a reader would remember.
 * The model takes notes and judges nothing: what it writes down is what happens, to whom, and
 * which of the story's questions open and close. Judging is left to Jev, which can then be told
 * what a reader knows on reaching a chapter, and be shown the whole book as its notes.
 */

export const system = `You take reading notes on a book, one section at a time, for someone who will later study how the book is built. You are a note-taker, not a critic.

You are given, as JSON: what a reader knows so far (\`so_far\`), the people met so far (\`cast\`), the story's open threads (\`threads\`), and the next section of the book (\`section\`). Write the notes for that section.

- Use only what the text of the section says, read in the light of \`so_far\`. If you recognise the book, use nothing you remember of it: no later events, no reputation, no reading of it from outside the text.
- Record, do not judge. Say what happens, never how well it is written or how good it is. No praise, no blame, no words of quality.
- Write in English, whatever the language of the book. Keep names as the book spells them.
- \`kind\`: "story" if the section belongs to the work itself, including a preface, a letter or a note that is part of the fiction. "apparatus" if it stands around the work: a table of contents, a publisher's or editor's note, a dedication, a licence, a preface by someone else.
- \`summary\`: what happens in the section, in order, in the present tense, in 120 words at most. For "apparatus", one sentence saying what the section is.
- \`characters\`: those who take an active part in this section. \`change\` is one sentence on what is different for them by its end: what they learn, decide, gain or lose, how they now stand with the others. "No change." when nothing is.
- \`cast\`: only the people who are new in this section, and those whose \`who\` no longer holds after it. \`who\` says who they are in the story, in 15 words at most.
- \`threads\`: the questions a reader is left holding: a goal pursued, a mystery, a promise, a danger, something unsettled between two people. List only the threads this section touches. When one is already in \`threads\`, reuse its \`id\`; give a new one a short id in kebab-case. \`what\` names the question in a few words. \`status\`: "opened" if it starts here, "advanced" if it moves, "closed" if it is settled here. \`note\`: one sentence on what this section does to it.
- \`so_far\`: what a reader knows on finishing this section: the story up to here, rewritten whole, in 250 words at most, keeping what will matter to follow the rest. For "apparatus", return \`so_far\` as it came.`;

const text = { type: 'string' };
const list = (properties: Record<string, unknown>) => ({
	type: 'array',
	items: {
		type: 'object',
		properties,
		required: Object.keys(properties),
		additionalProperties: false
	}
});

export const schema = {
	name: 'section_notes',
	schema: {
		type: 'object',
		properties: {
			kind: { type: 'string', enum: ['story', 'apparatus'] },
			summary: text,
			characters: list({ name: text, change: text }),
			cast: list({ name: text, who: text }),
			threads: list({
				id: text,
				what: text,
				status: { type: 'string', enum: ['opened', 'advanced', 'closed'] },
				note: text
			}),
			so_far: text
		},
		required: ['kind', 'summary', 'characters', 'cast', 'threads', 'so_far'],
		additionalProperties: false
	}
};

/** What the model is handed for a section. */
export interface Handed {
	so_far: string;
	cast: { name: string; who: string }[];
	threads: { id: string; what: string }[];
	section: { title: string | null; text: string };
}

/** What the model hands back. */
export interface Taken {
	kind: 'story' | 'apparatus';
	summary: string;
	characters: { name: string; change: string }[];
	cast: { name: string; who: string }[];
	threads: { id: string; what: string; status: 'opened' | 'advanced' | 'closed'; note: string }[];
	so_far: string;
}

export interface SectionNotes {
	/** The section's place in the book, from 0. */
	index: number;
	title: string | null;
	kind: Taken['kind'];
	summary: string;
	characters: Taken['characters'];
	threads: { id: string; status: 'opened' | 'advanced' | 'closed'; note: string }[];
	/** What a reader knows on finishing the section: what the next one is read in the light of. */
	soFar: string;
	usage: Usage;
	/** How long the model took over it, and who ran the model. */
	seconds?: number;
	provider?: string | null;
}

export interface Notes {
	book: Pick<Book, 'title' | 'author' | 'language' | 'source'>;
	/** The model that took them. */
	model: string;
	/** When the first section was handed over. */
	startedAt?: string;
	sections: SectionNotes[];
	cast: { name: string; who: string; firstSeen: number }[];
	/** Every thread of the story, with the sections that opened and closed it. */
	threads: { id: string; what: string; opened: number; closed: number | null }[];
}

export type Ask = (
	handed: Handed
) => Promise<{ value: Taken; usage: Usage; provider?: string | null }>;

export interface Taking {
	ask: Ask;
	model: string;
	/** The sections to read, by their place from 0, both included. */
	from: number;
	to: number;
	/** Notes already taken, to go on from where they end. */
	sofar?: Notes;
	/** No section is started once this much is spent. */
	maxUsd: number;
	/** After every section, with the notes as they stand: the moment to save them. */
	onSection?: (notes: Notes, last: SectionNotes) => void | Promise<void>;
}

/** What says how the notes are taken: a change in either makes them other notes. */
export const rules = { system, schema };

export function spent(notes: Notes): number {
	return notes.sections.reduce((sum, section) => sum + section.usage.usd, 0);
}

/** Reads the book's sections in order. Returns short of `to` when the money runs out. */
export async function takeNotes(book: Book, taking: Taking): Promise<Notes> {
	const { title, author, language, source } = book;
	const notes: Notes = taking.sofar ?? {
		book: { title, author, language, source },
		model: taking.model,
		startedAt: new Date().toISOString(),
		sections: [],
		cast: [],
		threads: []
	};

	const next = (notes.sections.at(-1)?.index ?? taking.from - 1) + 1;
	for (let index = next; index <= taking.to; index++) {
		const section = book.sections[index];
		if (!section || spent(notes) >= taking.maxUsd) break;

		const soFar = notes.sections.at(-1)?.soFar ?? '';
		const began = performance.now();
		const { value, usage, provider } = await taking.ask({
			so_far: soFar,
			cast: notes.cast.map(({ name, who }) => ({ name, who })),
			threads: notes.threads
				.filter((thread) => thread.closed === null)
				.map(({ id, what }) => ({ id, what })),
			section: { title: section.title, text: section.paragraphs.join('\n\n') }
		});

		const story = value.kind === 'story';
		if (story) keep(notes, value, index);
		const taken: SectionNotes = {
			index,
			title: section.title,
			kind: value.kind,
			summary: value.summary,
			characters: story ? value.characters : [],
			threads: story ? value.threads.map(({ id, status, note }) => ({ id, status, note })) : [],
			// What stands around the work tells the reader nothing of the story.
			soFar: story ? value.so_far : soFar,
			usage,
			seconds: Math.round((performance.now() - began) / 100) / 10,
			provider
		};
		notes.sections.push(taken);
		await taking.onSection?.(notes, taken);
	}
	return notes;
}

/** Brings the cast and the threads up to date with a section's notes. */
function keep(notes: Notes, value: Taken, index: number): void {
	for (const { name, who } of value.cast) {
		const known = notes.cast.find((person) => person.name === name);
		if (known) known.who = who;
		else notes.cast.push({ name, who, firstSeen: index });
	}
	for (const { id, what, status } of value.threads) {
		let thread = notes.threads.find((known) => known.id === id);
		// A thread the model says it advances or closes, and that was never opened, opens here.
		if (!thread) {
			thread = { id, what, opened: index, closed: null };
			notes.threads.push(thread);
		}
		if (status === 'closed') thread.closed = index;
		// One that was closed and moves again is open again.
		else thread.closed = null;
	}
}
