# What only the whole book shows

A piece of a thousand words says how a book is written and nothing of how it is built, how it ends or what becomes of its people. Two ways of asking Jev about the whole were tried on the twenty books of [the calibration and its check](calibration.md), both resting on the [reading notes](pipeline.md) that a language model takes of each book: 1,830 calls and $2.80 of `gemini-3.1-flash-lite` for the twenty, a quarter of an hour with the books read side by side, the two in Spanish noted in English like the rest.

- **The outline.** A summary of each chapter in order, the questions the story raises and where each is settled, and the people with what changes for each, as one text with neither title nor author, and ten questions about it: the `book` set of [src/questions.ts](../../src/questions.ts). A call a book. A book of hundreds of chapters goes in brief, the first sentence of each summary.
- **The chapter in its place.** Each chapter whole, with what the reader knows on reaching it beside it, and five questions about what it does to the people of the story: the `inContext` set. A call a chapter; a chapter that does not fit in a call is left out, which is one episode of _Ulysses_.

Both together took 925 calls to Jev and $0.23.

| Book                              | One whole | A storyline to spare | What brings the end about | Beyond its people | Chapters asked | Both sides have a claim | Someone torn |
| --------------------------------- | --------- | -------------------- | ------------------------- | ----------------- | -------------- | ----------------------- | ------------ |
| _Pride and Prejudice_             | 0.88      | 0.69                 | what the story prepared   | 0.66              | 61             | 0.13                    | 0.65         |
| _The Sheik_                       | 0.95      | 0.68                 | what the story prepared   | 0.41              | 10             | 0.20                    | 0.94         |
| _Irene Iddesleigh_                | 0.92      | 0.65                 | the central character     | 0.45              | 19             | 0.16                    | 0.65         |
| _Treasure Island_                 | 0.94      | 0.60                 | what the story prepared   | 0.61              | 34             | 0.00                    | 0.56         |
| _King Solomon's Mines_            | 0.95      | 0.62                 | what the story prepared   | 0.63              | 20             | 0.05                    | 0.67         |
| _Tarzan of the Apes_              | 0.88      | 0.69                 | what the story prepared   | 0.63              | 28             | 0.04                    | 0.78         |
| _The Turn of the Screw_           | 0.92      | 0.45                 | the central character     | 0.74              | 25             | 0.36                    | 0.88         |
| _Dracula_                         | 0.92      | 0.66                 | what the story prepared   | 0.69              | 27             | 0.04                    | 0.86         |
| _Varney the Vampire_              | 0.50      | 0.82                 | the central character     | 0.77              | 232            | 0.04                    | 0.67         |
| _The Moonstone_                   | 0.81      | 0.76                 | what the story prepared   | 0.82              | 66             | 0.24                    | 0.62         |
| _The Mysterious Affair at Styles_ | 0.94      | 0.72                 | what the story prepared   | 0.34              | 13             | 0.00                    | 0.75         |
| _The Mystery of a Hansom Cab_     | 0.91      | 0.69                 | what the story prepared   | 0.41              | 35             | 0.17                    | 0.63         |
| _The War of the Worlds_           | 0.80      | 0.77                 | what it had not prepared  | 0.98              | 27             | 0.00                    | 0.59         |
| _The Lost World_                  | 0.90      | 0.69                 | what the story prepared   | 0.82              | 17             | 0.06                    | 0.71         |
| _Edison's Conquest of Mars_       | 0.92      | 0.73                 | what the story prepared   | 0.91              | 21             | 0.00                    | 0.42         |
| _La Regenta_                      | 0.83      | 0.79                 | what the story prepared   | 0.88              | 30             | 0.70                    | 0.96         |
| _La barraca_                      | 0.85      | 0.75                 | what the story prepared   | 0.94              | 10             | 0.00                    | 0.77         |
| _El cocinero de su majestad_      | 0.80      | 0.72                 | what the story prepared   | 0.84              | 86             | 0.24                    | 0.79         |
| _Don Quijote_                     | 0.64      | 0.89                 | what the story prepared   | 0.89              | 126            | 0.42                    | 0.58         |
| _Ulysses_                         | 0.69      | 0.76                 | the central character     | 0.86              | 17             | 0.29                    | 0.83         |

The first four columns are of the outline: how far the chapters are parts of one whole, from 0 to 1; how likely Jev held it that a storyline could be taken out; what resolves the story; how far its concerns go beyond the people in it. The last two are of the chapters in their place: in what share of them both sides of the main conflict have a real claim on the reader's sympathy, and how much someone in them is torn between two things, from 0 to 1.

## What it tells

**How a book is built, and not how well.** The three books that are no single action come out as such: _Varney the Vampire_, written by the sheet with its threads coming and going, 0.50; _Don Quijote_, 0.64; _Ulysses_, 0.69; every other between 0.80 and 0.95. A penny dreadful and Cervantes fall on the same side, since the outline cannot tell what is loose for want of care from what is episodic by design. _Irene Iddesleigh_ is as well built as _Pride and Prejudice_: its story is an ordinary melodrama, what is wrong with it is the writing, and a summary has none of it.

**How it ends.** _The War of the Worlds_ is the one book whose end comes from what the story had not prepared, which is the best known of such endings: the invaders die of the bacteria. The detective of _The Mysterious Affair at Styles_ ends as he began and is seen differently; so is don Quijote.

**What did not tell books apart.** Whether what the story raises is settled and whether the pressure rises came out at the top for every book, as did whether several of its people want something of their own. A published novel does these things, and a summary by a language model tidies what is left. Whether a character surprises and still convinces, the old test of a character with a life of their own, and whether a chapter shows a new side of someone or settles what was pending, move little from book to book and not with their standing.

**In whose favour the book is.** In most novels, in nearly every chapter, one side is in the right: _Treasure Island_, _The War of the Worlds_ and _La barraca_ have no chapter where it is otherwise. The books where both sides have a claim in a good share of the chapters are _La Regenta_, 0.70, _Don Quijote_, 0.42, _The Turn of the Screw_, 0.36, _Ulysses_, 0.29, and after them _The Moonstone_ and _El cocinero de su majestad_, 0.24. It is what sets _La Regenta_ apart from _La barraca_, which the pieces alone had the wrong way round. It is no measure of merit by itself: within a ladder it does not fall rung by rung, the tale of adventure and the scientific romance have none of it whatever their worth, and _Pride and Prejudice_ has little. Being torn tells less: _The Sheik_ is as torn as _La Regenta_, since melodrama lives on it.

## What it is for

The profile of a book: whether it is one action or a string of episodes, what brings its end about, how far it looks beyond its people, and whether it takes sides. None of it goes into the merit as it stands, which was set on ten books and checked on ten others without it; the share of chapters where both sides have a claim is the one thing found here that bears on what the pieces cannot see, the distance from a good novel to a great one, and it was found on books already known. It waits for books that are not.
