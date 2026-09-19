import { posix } from 'node:path';
import { isTag, isText } from 'domhandler';
import type { AnyNode, Element } from 'domhandler';
import { findAll, findOne, getAttributeValue, textContent } from 'domutils';
import { unzipSync } from 'fflate';
import { parseDocument } from 'htmlparser2';
import { collector, tidy } from '../book.ts';
import type { Collector, Read, Section } from '../book.ts';
import { boilerplateClass } from './gutenberg.ts';

/**
 * An EPUB is a zip of XHTML documents, with a package file that lists them and gives their reading
 * order. The documents are not the book's chapters: a publisher may cut one chapter in two or put
 * twenty in one. What says where a chapter starts is the table of contents, which points at
 * places inside the documents; when a book has none worth the name, its headings do.
 */

/** A place the table of contents points at. */
interface Mark {
	path: string;
	/** The id of an element in the document; empty for the document's start. */
	fragment: string;
	label: string;
}

const xml = { xmlMode: true };
/** XHTML, read as HTML for its named entities, with `<a id="x"/>` still closing itself. */
const html = { recognizeSelfClosing: true };

const headings = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
/** Elements whose text is a paragraph of its own rather than part of the one around it. */
const blocks = new Set(
	'address article aside blockquote body center dd div dl dt figcaption figure footer header hr li main ol p pre section table td th tr ul'.split(
		' '
	)
);
const skipped = new Set(['head', 'script', 'style', 'nav', 'svg', 'math', 'img', 'figcaption']);
/** Classes of what is not the book's text: Gutenberg's licence, and a picture's caption by its usual name. */
const skippedClasses = [boilerplateClass, 'caption'];
const binary = /\.(jpe?g|png|gif|webp|svg|ttf|otf|woff2?|mp3|mp4|m4a)$/i;

/** A tag's name without its namespace prefix: `dc:title` is `title`. */
const local = (name: string) => name.slice(name.indexOf(':') + 1);
const named = (name: string) => (element: Element) => local(element.name) === name;

function resolve(from: string, href: string): string {
	let decoded = href;
	try {
		decoded = decodeURIComponent(href);
	} catch {
		// Left as it came.
	}
	return posix.join(posix.dirname(from), decoded);
}

export function readEpub(bytes: Uint8Array): Read {
	const files = unzipSync(bytes, { filter: (file) => !binary.test(file.name) });

	const has = (path: string) => files[path] !== undefined;
	function read(path: string): string {
		const file = files[path];
		if (!file) throw new Error(`The EPUB has no ${path}`);
		return new TextDecoder().decode(file);
	}

	const container = parseDocument(read('META-INF/container.xml'), xml);
	const packagePath = findOne(named('rootfile'), container.children)?.attribs['full-path'];
	if (!packagePath) throw new Error('The EPUB does not say where its package file is');
	const pack = parseDocument(read(packagePath), xml);

	const items = new Map<string, { path: string; type: string; properties: string }>();
	for (const item of findAll(named('item'), pack.children)) {
		const { id, href } = item.attribs;
		if (!id || !href) continue;
		items.set(id, {
			path: resolve(packagePath, href),
			type: item.attribs['media-type'] ?? '',
			properties: item.attribs.properties ?? ''
		});
	}

	const spineElement = findOne(named('spine'), pack.children);
	const spine = findAll(named('itemref'), spineElement?.children ?? [])
		// Out of the reading order: a note that pops up, a picture on a page of its own.
		.filter((ref) => ref.attribs.linear !== 'no')
		.flatMap((ref) => items.get(ref.attribs.idref ?? '')?.path ?? []);

	// A book under DRM has its documents encrypted. Embedded fonts alone are often scrambled too,
	// and those are no obstacle.
	if (has('META-INF/encryption.xml')) {
		const encryption = parseDocument(read('META-INF/encryption.xml'), xml);
		const encrypted = new Set(
			findAll(named('CipherReference'), encryption.children).map((ref) =>
				resolve('', ref.attribs.URI ?? '')
			)
		);
		if (spine.some((path) => encrypted.has(path))) {
			throw new Error('The EPUB is encrypted (DRM): its text cannot be read');
		}
	}

	function marksFromNav(path: string): Mark[] {
		const navs = findAll(named('nav'), parseDocument(read(path), html).children);
		const toc =
			navs.find((nav) => /\btoc\b/.test(getAttributeValue(nav, 'epub:type') ?? '')) ?? navs[0];
		return findAll((element) => element.name === 'a', toc?.children ?? []).flatMap((a) =>
			a.attribs.href ? mark(path, a.attribs.href, textContent(a)) : []
		);
	}

	/** The table of contents of EPUB 2, which EPUB 3 books often carry as well. */
	function marksFromNcx(path: string): Mark[] {
		return findAll(named('navPoint'), parseDocument(read(path), xml).children).flatMap((point) => {
			const src = findOne(named('content'), point.children)?.attribs.src;
			const label = findOne(named('text'), point.children);
			return src ? mark(path, src, label ? textContent(label) : '') : [];
		});
	}

	function mark(from: string, href: string, label: string): Mark {
		const [file = '', fragment = ''] = href.split('#');
		return { path: file ? resolve(from, file) : from, fragment, label: tidy(label) };
	}

	const all = [...items.values()];
	const nav = all.find((item) => /\bnav\b/.test(item.properties));
	const ncx = all.find((item) => item.type === 'application/x-dtbncx+xml');
	let marks = nav && has(nav.path) ? marksFromNav(nav.path) : [];
	if (marks.length === 0 && ncx && has(ncx.path)) marks = marksFromNcx(ncx.path);

	const marksIn = new Map<string, Map<string, string>>();
	for (const { path, fragment, label } of marks) {
		const inFile = marksIn.get(path) ?? new Map<string, string>();
		if (!inFile.has(fragment)) inFile.set(fragment, label);
		marksIn.set(path, inFile);
	}

	function sections(by: 'contents' | 'headings'): Section[] {
		const into = collector();
		for (const path of spine) {
			const marked = by === 'contents' ? (marksIn.get(path) ?? new Map<string, string>()) : null;
			const top = marked?.get('');
			if (top !== undefined) into.open(top);
			const document = parseDocument(read(path), html);
			pour(findOne(named('body'), document.children) ?? document, marked, into);
		}
		return into.done();
	}

	const byContents = sections('contents');
	const metadata = findOne(named('metadata'), pack.children);
	const field = (name: string) => {
		const element = findOne(named(name), metadata?.children ?? []);
		return (element && tidy(textContent(element))) || null;
	};

	return {
		title: field('title'),
		author: field('creator'),
		language: field('language')?.split('-')[0]?.toLowerCase() ?? null,
		sections: byContents.length > 1 ? byContents : sections('headings')
	};
}

/**
 * Pours a document's text into the collector, a paragraph per block. Sections open where the
 * table of contents points, given as `marked`, or at each heading when there is none to go by.
 * A heading's own words are the section's title at most, never a paragraph.
 */
function pour(root: AnyNode, marked: Map<string, string> | null, into: Collector): void {
	let buffer = '';
	/** Whether the buffer holds more than the words of links. */
	let prose = false;
	let insideLinks = 0;
	// A paragraph that is all link is the book's way around itself, not its text: an entry of a
	// contents page, a way back from a picture.
	const flush = () => {
		if (prose) into.add(buffer);
		buffer = '';
		prose = false;
	};

	function walk(node: AnyNode): void {
		if (isText(node)) {
			buffer += node.data;
			if (insideLinks === 0 && node.data.trim()) prose = true;
			return;
		}
		if (!isTag(node)) {
			if ('children' in node) node.children.forEach(walk);
			return;
		}
		const name = node.name.toLowerCase();
		const classes = node.attribs.class?.split(/\s+/) ?? [];
		if (skipped.has(name) || skippedClasses.some((skip) => classes.includes(skip))) return;
		if (name === 'br') {
			buffer += ' ';
			return;
		}

		const heading = headings.has(name);
		const block = heading || blocks.has(name);
		if (block) flush();
		// The mark may sit on an anchor in the middle of a paragraph: all of it goes to the new section.
		const label = node.attribs.id ? marked?.get(node.attribs.id) : undefined;
		if (label !== undefined) into.open(label);

		const link = name === 'a' && node.attribs.href !== undefined;
		if (link) insideLinks++;
		node.children.forEach(walk);
		if (link) insideLinks--;

		if (heading) {
			if (!marked) into.open(buffer);
			buffer = '';
			prose = false;
		} else if (block) flush();
	}

	walk(root);
	flush();
}
