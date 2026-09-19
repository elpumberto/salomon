# Records

What Salomón has run, and what came of it. Every run that costs money or gives scores leaves a record here, so that a number can be traced to the day it was got, the text it was got from and the rules it was got under, and set beside a later one.

    records/<kind of work>/<work>/<when>.<step>.<who>.json
    records/books/king-solomons-mines/20260919T094603Z.notes.google-gemini-3.1-flash-lite.json

`<when>` is the moment the run started, in UTC, and `<who>` the model that was run: runs set off together start in the same second. A record stands on its own: it needs no other file to be read.

    npm run records -- king-solomons-mines

sets the records of a book side by side.

| Field      | What it says                                                                                                                                                                                                                                                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`     | The step of the pipeline that was run. `notes` is the taking of reading notes; `jev`, questions put to Jev about passages of the book                                                                                                                                                                                            |
| `at`       | When the run started                                                                                                                                                                                                                                                                                                             |
| `book`     | Title, author and language; the file it was read from, by name and SHA-256, which tells one edition from another; the text once normalized, by SHA-256, sections and words                                                                                                                                                       |
| `sections` | Which of its sections were read, numbered as `npm run normalize -- --sections` lists them                                                                                                                                                                                                                                        |
| `by`       | Who did it and under which rules: the model; what OpenRouter was told about which of its providers to let in, if anything; what each provider did, in calls, answers not kept and dollars; the hash of the instructions and of the shape of the answers; the commit of the code, and whether there were changes in no commit yet |
| `took`     | Calls, tokens, dollars and seconds. A null is something that was not measured                                                                                                                                                                                                                                                    |
| `found`    | What came of it, in numbers                                                                                                                                                                                                                                                                                                      |
| `failed`   | For a run that did not get to the end: the section it broke at, and why. What it had taken by then is in `took` like any other                                                                                                                                                                                                   |
| `remarks`  | What whoever reads the record later should know about it                                                                                                                                                                                                                                                                         |

A record of kind `jev` carries in `by` the questions in full as they were asked, which are the rules an answer was got under, and in `found`, passage by passage, which part of the book it was, what code measured of it, the hash of what was sent, and the answers as numbers. A passage is a section, a piece of one, or several in a row; `variant` says what was done to the text or put beside it, when anything was. Jev says the tokens it took and not the money: `took.usd` is the tokens at its list price. `purpose` says what the run was for: `valuation` is a book judged the way books are valued, which is what `npm run value` reads, and `experiment` a trial of something, told in its remarks. Records older than the field say it in their remarks alone, and `isValuation` in [src/records.ts](../src/records.ts) knows which of them were valuations.

Of a book that is not one of `gutenberg.json`, which is somebody's, `book.source` keeps the format alone: the name and the hash of the file would tell where it came from, and the hash of the text is enough to tell whether two runs read the same.

A record never carries a word of the book, nor of the notes taken of it. Those stay under `books/`, which git ignores, whoever holds the rights to the book; a record tells them by their hash, which is enough to know whether two runs read the same thing.

A record is not rewritten. A run that a later one makes void stays, and says so in its remarks.
