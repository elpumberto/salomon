import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readTxt } from './txt.ts';

const read = (text: string) => readTxt(new TextEncoder().encode(text));

test('blank lines end paragraphs and chapter headings open sections', () => {
	const book = read(
		[
			'A Made-up Book',
			'',
			'CHAPTER I.',
			'',
			'A paragraph that was',
			'wrapped by hand.',
			'',
			'Part of me wanted a heading here.',
			'',
			'',
			'Capítulo segundo. Que trata de un título',
			'que ocupa dos líneas',
			'',
			'Texto.'
		].join('\r\n')
	);

	assert.equal(book.title, null);
	assert.deepEqual(book.sections, [
		{ title: null, paragraphs: ['A Made-up Book'] },
		{
			title: 'CHAPTER I.',
			paragraphs: ['A paragraph that was wrapped by hand.', 'Part of me wanted a heading here.']
		},
		{
			title: 'Capítulo segundo. Que trata de un título que ocupa dos líneas',
			paragraphs: ['Texto.']
		}
	]);
});

test("Project Gutenberg's wrapping comes off", () => {
	const book = read(
		[
			'The Project Gutenberg eBook of A Made-up Book',
			'',
			'Title: A Made-up Book',
			'',
			'Author: Nobody Inparticular',
			'',
			'Language: Spanish',
			'',
			'*** START OF THE PROJECT GUTENBERG EBOOK A MADE-UP BOOK ***',
			'',
			'[Illustration:',
			'',
			'   _A caption._',
			']',
			'',
			'The text, with _emphasis_ in it.',
			'',
			'*** END OF THE PROJECT GUTENBERG EBOOK A MADE-UP BOOK ***',
			'',
			'A licence.'
		].join('\n')
	);

	assert.deepEqual(book, {
		title: 'A Made-up Book',
		author: 'Nobody Inparticular',
		language: 'es',
		sections: [{ title: null, paragraphs: ['The text, with emphasis in it.'] }]
	});
});
