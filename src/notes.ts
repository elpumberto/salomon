import { createHash } from 'node:crypto';
import { words } from './book.ts';
import type { Book } from './book.ts';
import type { Usage } from './openrouter.ts';

/**
 * Reading notes. Jev never sees a whole book, only what fits in a call, so a language model reads
 * the book ahead of it, a section at a time and in order, carrying what a reader would remember.
 * The model takes notes and judges nothing: what it writes down is what happens, to whom, and
 * which of the story's questions open and close. Judging is left to Jev, which can then be told
 * what a reader knows on reaching a chapter, and be shown the whole book as its notes.
 *
 * Each thing the model is asked is one narrow job with a call of its own. Asked to do them all at
 * once, it took the notes of the section well and let the rest go: what the reader knows so far
 * grew past any limit and then shrank to the last chapter, and threads stayed open that the book
 * had long settled.
 */

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
const shape = (name: string, properties: Record<string, unknown>) => ({
	name,
	schema: {
		type: 'object',
		properties,
		required: Object.keys(properties),
		additionalProperties: false
	}
});

const common = `- Record, do not judge. Say what happens, never how well it is written or how good it is. No praise, no blame, no words of quality.
- Write in English, whatever the language of the book. Keep names as the book spells them.`;

const aThread = `A thread is a question the story raises and leaves the reader waiting to see answered: a goal pursued, a mystery, a promise, a danger, something unsettled between two people. The premise of the book is not one, nor that its narrator has a tale to tell.`;

/** The notes of one section. */
const section = {
	system: `You take reading notes on a book, one section at a time, for someone who will later study how the book is built. You are a note-taker, not a critic.

You are given, as JSON: what a reader knows so far (\`so_far\`), the people met so far (\`cast\`), the threads of the story that are open (\`threads\`), and the next section of the book (\`section\`). Write the notes for that section.

- Use only what the text of the section says, read in the light of \`so_far\`. If you recognise the book, use nothing you remember of it: no later events, no reputation, no reading of it from outside the text.
${common}
- \`kind\`: "story" if the section belongs to the work itself, including a preface, a letter or a note that is part of the fiction. "apparatus" if it stands around the work: a table of contents, a publisher's or editor's note, a dedication, a licence, a preface by someone else.
- \`summary\`: what happens in the section, in order, in the present tense, in 120 words at most. For "apparatus", one sentence saying what the section is.
- \`characters\`: those who take an active part in this section, each by the \`name\` they have in \`cast\` if they are there. \`change\` is one sentence on what is different for them by its end: what they learn, decide, gain or lose, how they now stand with the others. "No change." when nothing is.
- \`cast\`: only the people who are new in this section, and those whose \`who\` no longer holds after it. Whoever is in \`cast\` already keeps the \`name\` they have there, whatever else the story comes to call them: another name of theirs goes in their \`who\`. \`who\` says who they are in the story and how they stand to the others, in 15 words at most; not what becomes of them.
- \`threads\`: ${aThread} First go through every thread in \`threads\`, one by one: if this section answers its question, or leaves it without object, list it as "closed", even when nobody in the text says so; if the section moves it without settling it, as "advanced". Then add the threads that start in this section, as "opened", each with a new short id in kebab-case. Leave out the threads the section does not touch. \`what\` names the question in a few words. \`note\`: one sentence on what this section does to it.`,
	schema: shape('section_notes', {
		kind: { type: 'string', enum: ['story', 'apparatus'] },
		summary: text,
		characters: list({ name: text, change: text }),
		cast: list({ name: text, who: text }),
		threads: list({
			id: text,
			what: text,
			status: { type: 'string', enum: ['opened', 'advanced', 'closed'] },
			note: text
		})
	})
};

/** What the reader knows so far, brought up to date after a section. */
const soFar = {
	system: `You keep the synopsis of a book as it is read: what a reader knows on reaching each section. You are given, as JSON, the synopsis up to the previous section (\`so_far\`) and what happens in the section just read (\`section\`). Rewrite the synopsis so that it covers the story from its beginning to the end of this section.

- 250 words at most. To make room, tell what is older in less detail, and never drop it: whoever reads the synopsis must still know how the story began and how it got here.
- Keep what matters to follow the rest: who people are to each other, what they are after, what stands in their way, what has been settled.
- Use only what \`so_far\` and \`section\` say. Present tense.
- When a \`problem\` comes with them, it says what was wrong with your last attempt, and \`draft\`, if there is one, is that attempt: mend it.
${common}`,
	schema: shape('so_far', { so_far: text }),
	tooLong:
		'Your draft has {words} words. Cut it to 250 at most: tell what is older in less detail, and drop nothing that matters to follow the rest.',
	dropped:
		'Your last synopsis let go of most of the story so far. It must still tell it from its beginning, in 250 words at most.'
};

/** A last look, with the whole book in view, at the threads left open as it was read. */
const review = {
	system: `You are given, as JSON, the outline of a whole book, section by section (\`outline\`), and the threads of its story that were left open as it was read (\`threads\`), each with the number of the section it opened in. ${aThread} Going by the outline alone, say of each thread what became of it. Give a verdict for every thread, by its \`id\`.

- \`verdict\`: "settled" if the book answers the question or leaves it without object. "open" if the book ends with it unanswered. "not_a_thread" if it never was such a question.
- \`section\`: for "settled", the number of the section that settles it. Otherwise 0.
- \`note\`: one sentence on how it is settled, or on what is left unanswered.
${common}`,
	schema: shape('threads_review', {
		threads: list({
			id: text,
			verdict: { type: 'string', enum: ['settled', 'open', 'not_a_thread'] },
			section: { type: 'integer' },
			note: text
		})
	})
};

/** What says how the notes are taken: a change in any of it makes them other notes. */
export const rules = { section, soFar, review };
export const rulesHash = `sha256:${createHash('sha256').update(JSON.stringify(rules)).digest('hex').slice(0, 12)}`;

/** The synopsis is asked for in 250 words and may run a little over; past this it is asked for again. */
const soFarWords = 300;
/** Shorter than this, a synopsis of a story well under way has let go of it. */
const soFarFloor = 120;

interface Taken {
	kind: 'story' | 'apparatus';
	summary: string;
	characters: { name: string; change: string }[];
	cast: { name: string; who: string }[];
	threads: { id: string; what: string; status: 'opened' | 'advanced' | 'closed'; note: string }[];
}

interface Reviewed {
	threads: {
		id: string;
		verdict: 'settled' | 'open' | 'not_a_thread';
		section: number;
		note: string;
	}[];
}

/** What a call took. */
export interface Took {
	usage: Usage;
	seconds: number;
	calls: number;
	/** Who ran the model: OpenRouter sends it to one provider or another. */
	providers: string[];
}

export interface SectionNotes extends Took {
	/** The section's place in the book, from 0. */
	index: number;
	title: string | null;
	kind: Taken['kind'];
	summary: string;
	characters: Taken['characters'];
	/** Who is new in this section, and whose description it changes: the cast as it stood at any point is these, in order. */
	cast: Taken['cast'];
	threads: { id: string; status: 'opened' | 'advanced' | 'closed'; note: string }[];
	/** What a reader knows on finishing the section: what the next one is read in the light of. */
	soFar: string;
}

export interface Thread {
	id: string;
	what: string;
	/** The sections that opened and closed it, by their place from 0. */
	opened: number;
	closed: number | null;
	/** What the last look at the whole book said of a thread that was still open. */
	review?: { verdict: Reviewed['threads'][number]['verdict']; note: string };
}

export interface Notes {
	book: Pick<Book, 'title' | 'author' | 'language' | 'source'>;
	/** The model that took them, and the rules it took them under. */
	model: string;
	rules: string;
	/** When the first section was handed over. */
	startedAt: string;
	sections: SectionNotes[];
	cast: { name: string; who: string; firstSeen: number }[];
	threads: Thread[];
	/** Set once the threads left open have been looked at again. */
	review?: Took;
}

/** One question to the model: its instructions, the shape of its answer and what it is handed. */
export interface Call {
	system: string;
	schema: { name: string; schema: Record<string, unknown> };
	user: unknown;
}

export type Ask = (
	call: Call
) => Promise<{ value: unknown; usage: Usage; provider?: string | null }>;

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

const none: Usage = { tokensIn: 0, tokensOut: 0, tokensThinking: 0, usd: 0 };

/** Asks, and keeps count of what the asking takes. */
function counting(ask: Ask) {
	let usage = none;
	const providers = new Set<string>();
	let calls = 0;
	const began = performance.now();

	return {
		async ask<T>(call: Call, holds: (value: T) => boolean): Promise<T> {
			const answer = await ask(call);
			calls++;
			usage = {
				tokensIn: usage.tokensIn + answer.usage.tokensIn,
				tokensOut: usage.tokensOut + answer.usage.tokensOut,
				tokensThinking: usage.tokensThinking + answer.usage.tokensThinking,
				usd: usage.usd + answer.usage.usd
			};
			if (answer.provider) providers.add(answer.provider);
			if (!holds(answer.value as T)) {
				throw new Error(`The model answered ${call.schema.name} in another shape than asked`);
			}
			return answer.value as T;
		},
		took: (): Took => ({
			usage,
			seconds: Math.round((performance.now() - began) / 100) / 10,
			calls,
			providers: [...providers]
		})
	};
}

/** Everything the notes have taken so far, the last look at the threads included. */
export function took(notes: Notes): Took {
	const all = [...notes.sections, ...(notes.review ? [notes.review] : [])];
	return {
		usage: all.reduce(
			(sum, { usage }) => ({
				tokensIn: sum.tokensIn + usage.tokensIn,
				tokensOut: sum.tokensOut + usage.tokensOut,
				tokensThinking: sum.tokensThinking + usage.tokensThinking,
				usd: sum.usd + usage.usd
			}),
			none
		),
		seconds: Math.round(all.reduce((sum, { seconds }) => sum + seconds, 0)),
		calls: all.reduce((sum, { calls }) => sum + calls, 0),
		providers: [...new Set(all.flatMap(({ providers }) => providers))]
	};
}

/** The threads that are still waiting for an answer. */
export function open(notes: Notes): Thread[] {
	return notes.threads.filter(
		(thread) => thread.closed === null && thread.review?.verdict !== 'not_a_thread'
	);
}

/** The cast as a reader knows it on reaching a section: nothing of what that section or a later one tells. */
export function castBefore(notes: Notes, index: number): { name: string; who: string }[] {
	const cast = new Map<string, string>();
	for (const taken of notes.sections) {
		if (taken.index >= index) break;
		for (const { name, who } of taken.cast) cast.set(name, who);
	}
	return [...cast].map(([name, who]) => ({ name, who }));
}

/** Reads the book's sections in order. Returns short of `to` when the money runs out. */
export async function takeNotes(book: Book, taking: Taking): Promise<Notes> {
	const { title, author, language, source } = book;
	const notes: Notes = taking.sofar ?? {
		book: { title, author, language, source },
		model: taking.model,
		rules: rulesHash,
		startedAt: new Date().toISOString(),
		sections: [],
		cast: [],
		threads: []
	};

	const next = (notes.sections.at(-1)?.index ?? taking.from - 1) + 1;
	for (let index = next; index <= taking.to; index++) {
		const read = book.sections[index];
		if (!read || took(notes).usage.usd >= taking.maxUsd) break;

		const before = notes.sections.at(-1)?.soFar ?? '';
		const model = counting(taking.ask);
		const value = await model.ask<Taken>(
			{
				...section,
				user: {
					so_far: before,
					cast: notes.cast.map(({ name, who }) => ({ name, who })),
					threads: open(notes).map(({ id, what }) => ({ id, what })),
					section: { title: read.title, text: read.paragraphs.join('\n\n') }
				}
			},
			(answer) =>
				(answer?.kind === 'story' || answer?.kind === 'apparatus') &&
				typeof answer.summary === 'string' &&
				[answer.characters, answer.cast, answer.threads].every(Array.isArray)
		);

		// What stands around the work tells the reader nothing of the story.
		const story = value.kind === 'story';
		if (story) keep(notes, value, index);
		const taken: SectionNotes = {
			index,
			title: read.title,
			kind: value.kind,
			summary: value.summary,
			characters: story ? value.characters : [],
			cast: story ? value.cast : [],
			threads: story ? value.threads.map(({ id, status, note }) => ({ id, status, note })) : [],
			soFar: story ? await known(model, before, read.title, value.summary) : before,
			...model.took()
		};
		notes.sections.push(taken);
		await taking.onSection?.(notes, taken);
	}
	return notes;
}

/**
 * What the reader knows after a section. The model is held to the length: a synopsis that runs
 * long, or that lets go of most of what it held, is asked for again, saying what was wrong.
 */
async function known(
	model: ReturnType<typeof counting>,
	before: string,
	title: string | null,
	summary: string
): Promise<string> {
	// What the synopsis held before, as far as one of the right length can hold it: measured against
	// one that had run long, a synopsis of the right length would pass for one that let go.
	const held = Math.min(words(before), soFarWords);
	let shortest = '';
	let mend: { draft?: string; problem: string } | undefined;

	for (let attempt = 0; attempt < 3; attempt++) {
		const { so_far: answered } = await model.ask<{ so_far: string }>(
			{ ...soFar, user: { so_far: before, section: { title, summary }, ...mend } },
			(value) => typeof value?.so_far === 'string' && value.so_far.trim() !== ''
		);
		const answer = answered.trim();
		const length = words(answer);
		const dropped = held >= soFarFloor && length < held / 2;
		if (length <= soFarWords && !dropped) return answer;

		if (dropped) mend = { problem: soFar.dropped };
		else {
			// Cutting a draft down is easier than writing a shorter one anew.
			if (!shortest || length < words(shortest)) shortest = answer;
			mend = { draft: answer, problem: soFar.tooLong.replace('{words}', String(length)) };
		}
	}
	// Better a long synopsis, or the one from before and the section, than none.
	return shortest || `${before} ${summary}`.trim();
}

/** Brings the cast and the threads up to date with a section's notes. */
function keep(notes: Notes, value: Taken, index: number): void {
	for (const { name, who } of value.cast) {
		const person = notes.cast.find((one) => one.name === name);
		if (person) person.who = who;
		else notes.cast.push({ name, who, firstSeen: index });
	}
	for (const { id, what, status } of value.threads) {
		let thread = notes.threads.find((one) => one.id === id);
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

/**
 * Once the book is read, the threads still open are looked at again with the whole of it in view,
 * as its outline: a thread settled without anybody saying so is easy to miss from inside a chapter.
 * What a book leaves unanswered should be the book's doing, not the note-taker's.
 */
export async function reviewThreads(notes: Notes, ask: Ask): Promise<Notes> {
	const pending = notes.threads.filter((thread) => thread.closed === null);
	if (notes.review || pending.length === 0) return notes;

	const model = counting(ask);
	const { threads } = await model.ask<Reviewed>(
		{
			...review,
			user: {
				outline: notes.sections
					.filter((taken) => taken.kind === 'story')
					.map(({ index, title, summary }) => ({ section: index + 1, title, summary })),
				threads: pending.map(({ id, what, opened }) => ({ id, what, opened_in: opened + 1 }))
			}
		},
		(value) => Array.isArray(value?.threads)
	);

	const last = notes.sections.at(-1)?.index ?? 0;
	for (const { id, verdict, section: where, note } of threads) {
		const thread = pending.find((one) => one.id === id);
		if (!thread) continue;
		thread.review = { verdict, note };
		if (verdict === 'settled') {
			// A section that is not there, or comes before the thread opens, is the model's slip.
			thread.closed = where - 1 >= thread.opened && where - 1 <= last ? where - 1 : last;
		}
	}
	notes.review = model.took();
	return notes;
}
