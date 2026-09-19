# Records

What Salomón has run, and what came of it. Every run that costs money or gives scores leaves a record here, so that a number can be traced to the day it was got, the text it was got from and the rules it was got under, and set beside a later one.

    records/<kind of work>/<work>/<when>.<step>.json
    records/books/king-solomons-mines/20260919T081102Z.notes.json

`<when>` is the moment the run started, in UTC. A record stands on its own: it needs no other file to be read.

| Field      | What it says                                                                                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`     | The step of the pipeline that was run. `notes` is the taking of reading notes                                                                                                                                  |
| `at`       | When the run started                                                                                                                                                                                           |
| `book`     | Title, author and language; the file it was read from, by name and SHA-256, which tells one edition from another; the text once normalized, by SHA-256, sections and words                                     |
| `sections` | Which of its sections were read, numbered as `npm run normalize -- --sections` lists them                                                                                                                      |
| `by`       | Who did it and under which rules: the model and the providers that ran it, the hash of its instructions and of the shape of its answer, the commit of the code and whether there were changes in no commit yet |
| `took`     | Calls, tokens, dollars and seconds. A null is something that was not measured                                                                                                                                  |
| `found`    | What came of it, in numbers                                                                                                                                                                                    |
| `remarks`  | What whoever reads the record later should know about it                                                                                                                                                       |

The record of a judgment by Jev carries in full the questions as they were asked, the answers, and the weights of each valuation: they are the rules a score was got under.

A record never carries a word of the book, nor of the notes taken of it. Those stay under `books/`, which git ignores, whoever holds the rights to the book; a record tells them by their hash, which is enough to know whether two runs read the same thing.

A record is not rewritten. A run that a later one makes void stays, and says so in its remarks.
