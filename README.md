# Salomón

An experiment in analysing long content, whole books to begin with, using [Jev](https://docs.typesafe.ai) and models like it: ones that answer closed questions with probabilities instead of writing text.

It is an experiment, not a product.

## Books

No book goes in the repo, nor anything made from one: `books/` is ignored whole. The ones the experiment starts from are Project Gutenberg's, listed in `gutenberg.json`, and

    npm install
    npm run fetch

brings each of them to `books/` as EPUB and as plain text. Any other `.epub` or `.txt` can be read from wherever it is; an EPUB under DRM cannot.

## Normalizing

    npm run normalize -- books/king-solomons-mines.epub

reads a book and writes it to `books/normalized/` as JSON: title, author, language and the book's sections, each with its title and its paragraphs as plain text. It prints what is in the book and a rough estimate of what sending it to Jev would take; `--sections` lists every section.

In an EPUB the sections are the ones its table of contents points at, or its headings when it has none. In plain text they are guessed from the lines that read like a chapter's heading. Project Gutenberg's licence comes off both.

## Working on it

Node 22.18 or later, which runs the TypeScript as it is. `npm test` runs the tests, `npm run check` the types, `npm run lint` Prettier.
