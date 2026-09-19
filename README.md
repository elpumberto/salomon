# Salomón

An experiment in analysing long content, whole books to begin with, using [Jev](https://docs.typesafe.ai) and models like it: ones that answer closed questions with probabilities instead of writing text.

It is an experiment, not a product. How a book gets from a file to a valuation, who does what on the way and what it costs is in [docs/books/pipeline.md](docs/books/pipeline.md). The repo is also the register of what was run: when, on which text, under which rules and with what result, under [records/](records/README.md).

## Books

No book goes in the repo, nor anything made from one: `books/` is ignored whole. The ones the experiment starts from are Project Gutenberg's, listed in `gutenberg.json`, and

    npm install
    npm run fetch

brings each of them to `books/` as EPUB and as plain text. Any other `.epub` or `.txt` can be read from wherever it is; an EPUB under DRM cannot.

## Normalizing

    npm run normalize -- books/king-solomons-mines.epub

reads a book and writes it to `books/normalized/` as JSON: title, author, language and the book's sections, each with its title and its paragraphs as plain text. It prints what is in the book and a rough estimate of what sending it to Jev would take; `--sections` lists every section.

In an EPUB the sections are the ones its table of contents points at, or its headings when it has none. In plain text they are guessed from the lines that read like a chapter's heading. Project Gutenberg's licence comes off both.

## Reading notes

Jev takes in some 32,000 tokens a call, so it never sees a whole book: a chapter at most. What it cannot see, a language model reads ahead of it and writes down, a section at a time and in order, carrying what a reader would remember:

    npm run notes -- books/king-solomons-mines.epub --from 4

says what taking the notes would cost and asks nothing; with `--go` it takes them, stopping at `--max-usd` (0.25 unless told). `--from` and `--to` are section numbers as `normalize --sections` lists them, and `--model` is any model of OpenRouter's that can answer in a given JSON shape. The notes go to `books/notes/`, a file per book and model, saved after every section: a run that stops goes on from there when run again, and `--redo` starts over. `--show` prints them to be read. A run that gets to the end leaves its record under `records/`.

For each section the model says whether it belongs to the work or stands around it, what happens in it, what changes for each character, and which of the story's open questions it opens, moves or closes. A second call rewrites what a reader knows so far, which is what the next section is read in the light of, and is asked again if that runs long or lets go of the story. Once the book is read, a last call looks again, with the whole of it in view, at the threads that were left open. The code keeps the cast and the ledger of threads. The model takes notes and judges nothing: it is told to go by the text alone and to leave out what it remembers of the book and what it thinks of it. Judging is Jev's.

## Keys

Two services are paid for, each with a key of yours: [Jev](https://console.typesafe.ai/keys), and [OpenRouter](https://openrouter.ai/settings/keys) for the language models that read a book ahead of it. Copy `.env.example` to `.env` and put them there; git ignores `.env`. OpenRouter lets a key be given a credit limit, which is worth doing.

    npm run test:apis

checks both against the real services: that a made-up key is turned down, that yours is taken, and that each answers a sentence the way the code expects. It prints what that took, which is a few millionths of a dollar.

`npm install` sets a git hook that refuses a commit carrying a key: the value of any in `.env` wherever it turns up, what looks like one, `.env` itself, or a value in `.env.example`.

## Working on it

Node 22.18 or later, which runs the TypeScript as it is. `npm test` runs the tests, none of which touches the network; `npm run check` the types, `npm run lint` Prettier.
