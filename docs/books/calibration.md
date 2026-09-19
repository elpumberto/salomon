# The books the questions are set on

What Jev is asked about a book, and how its answers become a valuation, is set on ten books whose standing is known, and then checked on ten others that had no part in the setting.

## Ladders within a genre

Genre alone explains much of how literary readers take a novel to be, so a valuation that put Austen above a tale of adventures would show nothing: it might be telling genres apart. The books are therefore chosen in ladders, three rungs of known standing within one genre, and what is expected is an order within each ladder. All are read in the language they were written in, since a translation is its translator's prose; all are Project Gutenberg's, listed in [`gutenberg.json`](../../gutenberg.json) with the sections that are the story.

| Ladder              | Top                                 | Middle                        | Bottom                                                            |
| ------------------- | ----------------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| Society and romance | _Pride and Prejudice_, 1813         | _The Sheik_, E. M. Hull, 1919 | _Irene Iddesleigh_, Amanda McKittrick Ros, 1897                   |
| Adventure           | _Treasure Island_, 1883             | _King Solomon's Mines_, 1885  | _Tarzan of the Apes_, 1912                                        |
| Gothic              | _The Turn of the Screw_, 1898       | _Dracula_, 1897               | _Varney the Vampire_, 1845–47, a penny dreadful sold by the sheet |
| In Spanish          | _Don Quijote_, 1605 and 1615, alone |                               |                                                                   |

## What is expected

Written before any of them was judged as a book.

| Book                    | Words   | Literary merit                                        | A good read                                                         |
| ----------------------- | ------- | ----------------------------------------------------- | ------------------------------------------------------------------- |
| _Pride and Prejudice_   | 122,000 | High                                                  | High: still read for pleasure two centuries on                      |
| _The Sheik_             | 88,000  | Low: melodrama, derided by critics from the first day | Above its merit: a sensation of its day, written to be devoured     |
| _Irene Iddesleigh_      | 33,000  | Lowest of the ten                                     | Lowest of the ten                                                   |
| _Treasure Island_       | 68,000  | High                                                  | High                                                                |
| _King Solomon's Mines_  | 82,000  | Middle: a craftsman's prose                           | High                                                                |
| _Tarzan of the Apes_    | 85,000  | Low to middle: pulp, vigorous and careless            | High, and well above its merit                                      |
| _The Turn of the Screw_ | 42,000  | High, and for the very density of its prose           | Well below its merit: slow, ambiguous, demanding                    |
| _Dracula_               | 160,000 | Middle to high                                        | High                                                                |
| _Varney the Vampire_    | 652,000 | Low: padded, repetitive, written against the clock    | Low to middle                                                       |
| _Don Quijote_           | 373,000 | High                                                  | Middle for a reader of today: long, and four centuries away from us |

Merit falls from left to right in every ladder. A good read does not: the three tales of adventure are all expected high, and the two valuations are expected to part most in _The Turn of the Screw_, merit over read, and in _Tarzan of the Apes_ and _The Sheik_, read over merit. If they do not part there, they are one valuation under two names. _Don Quijote_ is there to see whether Spanish, and prose of another age, are judged by the same rule; it is not to be ranked against the rest.

As an outside reference, which is no truth: the average rating and the number of ratings on Goodreads, where the reader explains far more of a rating than the book does.

| Book                    | Goodreads average | Ratings | Seen on    |
| ----------------------- | ----------------- | ------- | ---------- |
| _Pride and Prejudice_   |                   |         |            |
| _The Sheik_             | 3.27              | 1,846   | 2026-09-19 |
| _Irene Iddesleigh_      |                   |         |            |
| _Treasure Island_       |                   |         |            |
| _King Solomon's Mines_  |                   |         |            |
| _Tarzan of the Apes_    |                   |         |            |
| _The Turn of the Screw_ |                   |         |            |
| _Dracula_               |                   |         |            |
| _Varney the Vampire_    |                   |         |            |
| _Don Quijote_           |                   |         |            |

## What came out

Judged on 2026-09-19 with `jev-1.13.0`, the `passage` questions of wording `a4f986b67c3f` and the rules of valuation `c57d649ea5aa`: 2,138 calls, 7.7 million tokens, $0.32. Every book whole in pieces of about 1,000 words, but for _Varney the Vampire_, one chapter in eight, and _Don Quijote_, one in five; then twelve pieces of each set against the panel of anchors, both ways round, but for _Don Quijote_, since a passage in Spanish beside one in English compares nothing cleanly. Merit and read are each the mean of what the pieces came to alone and how often they were chosen over the panel.

| Book                    | Pieces | Merit | A good read | Merit alone: mean, best tenth | Better written than the panel | Read alone | Rather read on than the panel |
| ----------------------- | ------ | ----- | ----------- | ----------------------------- | ----------------------------- | ---------- | ----------------------------- |
| _The Turn of the Screw_ | 40     | 0.76  | 0.65        | 0.69, 0.76                    | 0.80                          | 0.56       | 0.75                          |
| _Treasure Island_       | 68     | 0.72  | 0.74        | 0.70, 0.76                    | 0.71                          | 0.62       | 0.86                          |
| _Pride and Prejudice_   | 121    | 0.70  | 0.48        | 0.68, 0.76                    | 0.69                          | 0.59       | 0.38                          |
| _King Solomon's Mines_  | 83     | 0.57  | 0.65        | 0.65, 0.71                    | 0.47                          | 0.56       | 0.75                          |
| _The Sheik_             | 86     | 0.57  | 0.72        | 0.56, 0.66                    | 0.54                          | 0.62       | 0.81                          |
| _Dracula_               | 163    | 0.56  | 0.62        | 0.62, 0.71                    | 0.46                          | 0.56       | 0.68                          |
| _Tarzan of the Apes_    | 87     | 0.49  | 0.75        | 0.55, 0.65                    | 0.40                          | 0.62       | 0.89                          |
| _Varney the Vampire_    | 85     | 0.31  | 0.58        | 0.40, 0.54                    | 0.17                          | 0.56       | 0.59                          |
| _Irene Iddesleigh_      | 34     | 0.13  | 0.39        | 0.20, 0.26                    | 0.04                          | 0.46       | 0.33                          |
| _Don Quijote_, alone    | 75     |       |             | 0.57, 0.69                    |                               | 0.50       |                               |

What held:

- Merit falls along all three ladders, each rung below the one before.
- The two valuations part where they were expected to: _The Turn of the Screw_ is worth more than it reads, 0.76 to 0.65, and _Tarzan of the Apes_ and _The Sheik_ read better than they are worth, 0.75 to 0.49 and 0.72 to 0.57.
- _Irene Iddesleigh_ is last in both. Every one of its 34 pieces was taken for strained in its wording and asserted in its emotion, as was no piece of Stevenson's or of James's.

What did not:

- _Pride and Prejudice_ was expected to read well and comes out next to last. Alone its pieces read like those of the adventures; it is against the panel that it loses, 0.38, and there every tale of adventure, of terror or of passion wins, 0.68 to 0.89. Which of two passages makes a reader more eager to read on is a question that suspense answers, and a comedy of manners holds its reader otherwise.
- Alone, the read tells little apart: eight of the ten books fall between 0.56 and 0.62. It is the weaker of the two valuations, as those who measured both found before.
- _Don Quijote_ alone is worth what _The Sheik_ is, which it is not. Its prose, its voice and its command of the craft come out as high as Stevenson's; it loses where prose four centuries old is taken for ready-made, 0.23 of 1, and its emotion for asserted in a quarter of its pieces. The age of a text still reaches its merit through those questions.
- What the main pull of a piece is, the story, the people, the place or the writing, came out as the story nineteen times in twenty in every book: it tells nothing, and the profile needs another way.

## What was changed for it

Four things, agreed after seeing the ten and before choosing the books that check them. None was tuned until the numbers fitted: what still does not fit is said below.

- The panel is asked which of two passages most readers would enjoy reading more, not which makes a reader more eager to read on, which only suspense answers.
- A piece holds its reader by its story, what is pending, at stake and happening, or by its people, their friction, their feelings and what is funny in them, whichever it does best.
- Ready-made wording and asserted emotion weigh the less the more archaic Jev finds a piece: what was new in its day reads as ready-made now, and feeling was once stated where it is now shown.
- What the main pull of a piece is was dropped from the profile, which is made of what describes and does tell books apart: how much talk, place, feeling and humour there is, what is at stake, and how far the language is from a reader of today.

With the rules of valuation `42d05b82bc8b` and the panel asked again, 1,296 calls and $0.17 more, the same pieces come to:

| Book                    | Merit | A good read | Merit alone: mean, best tenth | Better written than the panel | Read alone | More enjoyed than the panel |
| ----------------------- | ----- | ----------- | ----------------------------- | ----------------------------- | ---------- | --------------------------- |
| _The Turn of the Screw_ | 0.77  | 0.41        | 0.71, 0.77                    | 0.80                          | 0.51       | 0.31                        |
| _Treasure Island_       | 0.73  | 0.72        | 0.74, 0.79                    | 0.70                          | 0.57       | 0.88                        |
| _Pride and Prejudice_   | 0.71  | 0.51        | 0.71, 0.78                    | 0.69                          | 0.56       | 0.45                        |
| _King Solomon's Mines_  | 0.58  | 0.60        | 0.68, 0.73                    | 0.47                          | 0.51       | 0.69                        |
| _The Sheik_             | 0.58  | 0.55        | 0.58, 0.68                    | 0.54                          | 0.56       | 0.55                        |
| _Dracula_               | 0.57  | 0.47        | 0.64, 0.73                    | 0.46                          | 0.51       | 0.43                        |
| _Tarzan of the Apes_    | 0.50  | 0.72        | 0.57, 0.67                    | 0.40                          | 0.56       | 0.86                        |
| _Varney the Vampire_    | 0.33  | 0.41        | 0.44, 0.58                    | 0.17                          | 0.51       | 0.31                        |
| _Irene Iddesleigh_      | 0.14  | 0.25        | 0.21, 0.27                    | 0.04                          | 0.43       | 0.07                        |
| _Don Quijote_, alone    |       |             | 0.65, 0.73                    |                               | 0.50       |                             |

- The three ladders hold in merit, alone and against the panel. Asked again, which passage is the better written came out the same for every book to within 0.01: set against a panel, Jev says the same twice.
- _The Turn of the Screw_ now parts as it was expected to, 0.77 to 0.41, and _Tarzan of the Apes_ still does, 0.50 to 0.72. _The Sheik_ no longer reads better than it is worth: it reads as it is worth.
- _Don Quijote_ alone stands with _Dracula_ and _King Solomon's Mines_, above _The Sheik_ and _Tarzan of the Apes_; below where it belongs, and no longer among the books it does not belong with.
- _Pride and Prejudice_ and _Dracula_ were expected to read well and come out in the middle. Asked what most readers would enjoy more, Jev takes the tale of adventure over the comedy of manners and over the novel in letters and diaries. The read leans to action, and that is a limit of it to be said wherever it is shown.

## The rule of the game

1. The questions are tuned on passages of one ladder, not on whole books.
2. They are frozen, which the hash of their wording in every record tells, and the ten books are judged whole in pieces of the same size, since a chapter is 1,700 words in one book and 11,000 in another and Jev does not score a chapter as it scores its pieces. Of the two longest books a sample of chapters is judged.
3. What comes out is set beside what was expected, and the questions and the weights are changed as it takes.
4. They are frozen again. Ten other books are chosen by the same scheme in other genres, and what is expected of them is written down and committed before any is judged. They are judged with nothing changed. If something is changed after seeing them, they have become books the questions were set on, and the check needs ten more.

## The ten that check it

Chosen by the same scheme in other genres, with no author of the first ten nor of the panel among them. What is expected was written, and committed, before any was judged.

| Ladder                    | Top                                        | Middle                                                   | Bottom                                                                                                            |
| ------------------------- | ------------------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Detection                 | _The Moonstone_, Wilkie Collins, 1868      | _The Mysterious Affair at Styles_, Agatha Christie, 1920 | _The Mystery of a Hansom Cab_, Fergus Hume, 1886, a runaway seller of its day                                     |
| Scientific romance        | _The War of the Worlds_, H. G. Wells, 1898 | _The Lost World_, Arthur Conan Doyle, 1912               | _Edison's Conquest of Mars_, Garrett P. Serviss, 1898, a newspaper serial                                         |
| In Spanish                | _La Regenta_, Leopoldo Alas, 1884–85       | _La barraca_, Vicente Blasco Ibáñez, 1898                | _El cocinero de su majestad_, Manuel Fernández y González, 1857, a folletín by one who dictated them by the dozen |
| Alone, for its difficulty | _Ulysses_, James Joyce, 1922               |                                                          |                                                                                                                   |

| Book                              | Literary merit                                           | A good read                                                     |
| --------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| _The Moonstone_                   | High                                                     | Middle to high: long, told by many voices at a Victorian pace   |
| _The Mysterious Affair at Styles_ | Middle: plain prose that serves the puzzle               | High, and above its merit                                       |
| _The Mystery of a Hansom Cab_     | Low: melodrama in stock phrases                          | Middle                                                          |
| _The War of the Worlds_           | High                                                     | High                                                            |
| _The Lost World_                  | Middle                                                   | High, and above its merit                                       |
| _Edison's Conquest of Mars_       | Lowest of those in English                               | Low to middle                                                   |
| _La Regenta_                      | Highest of the three in Spanish                          | Below its merit: slow and dense                                 |
| _La barraca_                      | Middle to high                                           | Middle to high                                                  |
| _El cocinero de su majestad_      | Lowest of the three in Spanish                           | Middle: all talk and incident                                   |
| _Ulysses_                         | High; and a risk, told here beforehand, that it does not | Lowest of those in English but perhaps for the newspaper serial |

What would count against the questions and the rules: a ladder out of order in merit; _The Mysterious Affair at Styles_ or _The Lost World_ not reading better than they are worth; _La Regenta_ or _Ulysses_ not being worth more than they read. The risk with _Ulysses_ is that prose which breaks the conventions on purpose be taken for strained or unclear, and lose the merit that the gate takes from ornament: if it does, the rules have the taste of the realist novel, which those who studied the matter warned of. The three in Spanish are judged alone, as _Don Quijote_ was, and compared among themselves. Two books come in sections of a few lines under the headlines of a newspaper, _Edison's Conquest of Mars_ throughout and _Ulysses_ in one episode: their pieces are cut across the sections, of the same size as the rest. Nothing else differs from how the first ten were judged: the `passage` questions of wording `a4f986b67c3f`, the panel asked with `ad82418b829f`, the rules of valuation `42d05b82bc8b`.
