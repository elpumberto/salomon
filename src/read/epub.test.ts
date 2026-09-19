import assert from 'node:assert/strict';
import { test } from 'node:test';
import { strToU8, zipSync } from 'fflate';
import { readEpub } from './epub.ts';

/** An EPUB made on the spot: its documents in reading order, plus whatever else goes in the zip. */
function epub(documents: Record<string, string>, extra: Record<string, string> = {}): Uint8Array {
	const names = Object.keys(documents);
	const manifest = names.map(
		(name, index) => `<item id="d${index}" href="${name}" media-type="application/xhtml+xml"/>`
	);
	if (extra['OEBPS/nav.xhtml']) {
		manifest.push(
			'<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>'
		);
	}
	if (extra['OEBPS/toc.ncx']) {
		manifest.push('<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>');
	}
	const files: Record<string, string> = {
		mimetype: 'application/epub+zip',
		'META-INF/container.xml':
			'<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>',
		'OEBPS/content.opf': `<package xmlns:dc="http://purl.org/dc/elements/1.1/">
			<metadata>
				<dc:title>A Made-up Book</dc:title>
				<dc:creator>Nobody Inparticular</dc:creator>
				<dc:language>en-GB</dc:language>
			</metadata>
			<manifest>${manifest.join('')}</manifest>
			<spine>${names.map((_, index) => `<itemref idref="d${index}"/>`).join('')}</spine>
		</package>`,
		...extra
	};
	for (const [name, body] of Object.entries(documents)) {
		files[`OEBPS/${name}`] = `<html><head><title>no</title></head><body>${body}</body></html>`;
	}
	return zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])));
}

const nav = (entries: [href: string, label: string][]) => ({
	'OEBPS/nav.xhtml': `<html><body><nav epub:type="toc"><ol>${entries
		.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`)
		.join('')}</ol></nav></body></html>`
});

test('sections follow the table of contents, not the documents', () => {
	const book = readEpub(
		epub(
			{
				'a.xhtml':
					'<div id="one"><h2>I</h2><p>First of one.</p></div>' +
					'<h2><a id="two"/>II</h2><p>First of\n two.</p>',
				// The second chapter runs on into another document.
				'b.xhtml': '<p>Second of two.</p>',
				'c.xhtml': '<h2>III</h2><p>First&nbsp;of three.<br/>Still the same one.</p>'
			},
			nav([
				['a.xhtml#one', 'Chapter One'],
				['a.xhtml#two', 'Chapter Two'],
				['c.xhtml', 'Chapter Three']
			])
		)
	);

	assert.equal(book.title, 'A Made-up Book');
	assert.equal(book.author, 'Nobody Inparticular');
	assert.equal(book.language, 'en');
	assert.deepEqual(book.sections, [
		{ title: 'Chapter One', paragraphs: ['First of one.'] },
		{ title: 'Chapter Two', paragraphs: ['First of two.', 'Second of two.'] },
		{ title: 'Chapter Three', paragraphs: ['First of three. Still the same one.'] }
	]);
});

test('with no table of contents, headings open the sections', () => {
	const book = readEpub(
		epub({
			'a.xhtml': '<p>Before any heading.</p><h1>Part One</h1><h2>The  First</h2><p>Text.</p>'
		})
	);

	assert.deepEqual(book.sections, [
		{ title: null, paragraphs: ['Before any heading.'] },
		// The part's title had nothing under it.
		{ title: 'The First', paragraphs: ['Text.'] }
	]);
});

test('the older table of contents is read when it is the only one', () => {
	const book = readEpub(
		epub(
			{ 'a.xhtml': '<p id="x">One.</p><p id="y">Two.</p>' },
			{
				'OEBPS/toc.ncx': `<ncx><navMap>
					<navPoint><navLabel><text>X</text></navLabel><content src="a.xhtml#x"/>
						<navPoint><navLabel><text>Y</text></navLabel><content src="a.xhtml#y"/></navPoint>
					</navPoint>
				</navMap></ncx>`
			}
		)
	);

	assert.deepEqual(book.sections, [
		{ title: 'X', paragraphs: ['One.'] },
		{ title: 'Y', paragraphs: ['Two.'] }
	]);
});

test('what is not the text of the book is left out', () => {
	const book = readEpub(
		epub({
			'a.xhtml':
				'<header class="pg-boilerplate pgheader"><p>A licence.</p></header>' +
				'<h2>Contents</h2><p><a href="#c1">To the chapter</a></p>' +
				'<h2 id="c1">Chapter</h2>' +
				'<p>Prose with a <a href="#n">note</a> in it.</p>' +
				'<div class="fig"><img alt="Not this"/><p class="caption">Nor this.</p></div>' +
				'<script>nor("this")</script>'
		})
	);

	assert.deepEqual(book.sections, [{ title: 'Chapter', paragraphs: ['Prose with a note in it.'] }]);
});

test('an encrypted book says so', () => {
	const book = epub(
		{ 'a.xhtml': '<p>Noise.</p>' },
		{
			'META-INF/encryption.xml':
				'<encryption><EncryptedData><CipherData><CipherReference URI="OEBPS/a.xhtml"/></CipherData></EncryptedData></encryption>'
		}
	);

	assert.throws(() => readEpub(book), /encrypted/);
});
