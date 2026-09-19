# Other ways of asking

The questions and rules of [the calibration](calibration.md) were one way of judging among many: one set of questions, one size of piece, one way of weighing the answers. Twenty books judged are a bench to try any other way on, for cents and by one yardstick. What comes out best on them was chosen on them, and is owed a check on books that had no part in the choosing: it is at the end.

## The yardstick

`experiments/books/jev/scoreboard.ts` takes what each book came to, by whatever way, and says in how many of the eighteen pairs of books of a same ladder the higher rung came out higher, by how much a rung stands over the next, and in how many of the seven books named beforehand merit and read part the way expected; the parting is told by rank among the books, so that it does not hang on the scale of a score.

Two ways that order all the pairs alike are told apart by two finer counts: how often one passage of the higher book of a pair comes out over one passage of the lower, and the pairs in order when every book is read the same amount, 12,000 words, whatever the size of its passages. The passages of each book are drawn again 500 times, which says what is owed to the draw.

How much of a book must be read was settled first (`error-bars.ts`). The merit of a book judged whole has a sampling error of about ±0.01: a difference of 0.02 between two books is no accident of the pieces. Twelve passages spread evenly over the story order the ladders as the whole book does, 16.9 pairs of 18 on average against 17. So a way of judging is tried on the twenty books for a few cents: `node experiments/books/jev/variants.ts <questions> <words>` judges twelve passages a book, cut across its sections at the size given, and `variants-board.ts` sets every way tried side by side.

## What was tried

**The size of the passage.** The `passage` questions at 300, 1,000, 3,000 and 8,000 words.

**Behaviour instead of qualities.** Fourteen questions that name no quality of the writing and ask what a reader, an editor or a teacher would do with the passage (the `gut` set of [src/questions.ts](../../src/questions.ts)): what a reader would mark in it to keep; whether it reads like a first draft, a text gone over or one with every word weighed; what a good editor would do with it; what of it is remembered a week later; what would become of it at a publisher's today; who could have written it; whether a teacher of writing would give it to a class as an example to learn from, and as one of what not to do; whether a reader would come back to it, enjoy reading it aloud, skim it, forget where they are, go on rather than stop for the day; and whom it is written for. How they would be weighed was said before any was asked: merit is the plain mean of nine answers and the read that of three ([src/value.ts](../../src/value.ts)); the publisher and the public it is written for are in neither. They were asked at seven sizes, from 1,000 to 6,000 words.

**A duel.** Six passages a book, each against its own plain retelling by a language model, both ways round: which is better written, which would most readers enjoy more, which would a teacher take to class (`duel.ts`).

Some 3,000 calls to Jev and $0.69 in all.

## What came out

| Way                          | Pairs in order | Drawn again  | Passage over passage | At 12,000 words a book | Margin | Parted | Tokens a book |
| ---------------------------- | -------------- | ------------ | -------------------- | ---------------------- | ------ | ------ | ------------- |
| `passage` at 300 words       | 16 of 18       | 16.1 (16–17) | 0.829                | 16.1                   | 0.095  | 6 of 7 | 40,000        |
| `passage` at 1,000           | 17             | 16.3 (15–17) | 0.886                | 16.3                   | 0.115  | 7      | 52,000        |
| `passage` at 3,000           | 17             | 17.0 (17–17) | 0.927                | 16.9                   | 0.123  | 7      | 84,000        |
| `passage` at 8,000           | 17             | 16.6 (16–17) | 0.925                | 16.6                   | 0.127  | 7      | 137,000       |
| Behavioural at 1,000         | 18             | 17.4 (16–18) | 0.902                | 17.5                   | 0.086  | 6      | 32,000        |
| Behavioural at 1,500         | 17             | 17.3 (17–18) | 0.909                | 17.3                   | 0.086  | 6      | 40,000        |
| Behavioural at 2,000         | 18             | 17.5 (17–18) | 0.937                | 17.5                   | 0.092  | 6      | 48,000        |
| Behavioural at 2,500         | 18             | 17.7 (17–18) | 0.943                | 17.6                   | 0.090  | 6      | 57,000        |
| Behavioural at 3,000         | 18             | 17.8 (17–18) | 0.952                | 17.6                   | 0.094  | 7      | 65,000        |
| Behavioural at 4,000         | 18             | 17.6 (17–18) | 0.954                | 17.5                   | 0.092  | 6      | 80,000        |
| Behavioural at 6,000         | 17             | 17.2 (17–18) | 0.947                | 17.2                   | 0.093  | 6      | 105,000       |
| Behavioural at 3,000, gated¹ | 18             | 17.8 (17–18) | 0.952                | 17.6                   | 0.126  | 7      | 65,000        |

¹ See [ornament](#ornament).

- **Size.** Too little text is the one clear mistake: at 300 words a passage of the better book comes out over one of the worse 0.83 of the time, at 3,000 words 0.93 to 0.95. From 2,500 to 4,000 words nothing moves but by chance. With the same 12,000 words read of every book the size hardly matters; but the questions are paid once a call, so that larger passages read the same text for less.
- **Behaviour.** Half the questions, a quarter fewer tokens, and the one pair the calibration had the wrong way round comes right: _La Regenta_ 0.79 over _La barraca_ 0.77. _Don Quijote_ stands among the best, 0.80, with no allowance made for its age, which the `passage` rules needed. The score of a book moves by 0.01 from one size of passage to another between 2,000 and 4,000 words.
- **One question does as much as nine.** `draft` and `again` alone put the eighteen pairs in order; so had `prose` and `fine` among the `passage` questions. Many questions add steadiness and a profile, not a better order.
- **The duel is a floor.** Nearly every book beats its plain retelling, 0.93 to 1.00 of the time, so that the books are not ranked by it: 14 pairs in order of 18 by which is better written, 15 by which a teacher would take. It finds the book whose writing adds nothing: _Irene Iddesleigh_ is held the better written 0.54 of the time and the more enjoyable 0.32. The retellings came out at 45 to 77 hundredths of the length asked for, some passages were refused by the model that retells, and one of _Ulysses_ ran to twenty times its length, which voids that book's duel.

The twenty books by the behavioural questions at 3,000 words, twelve passages each; the lowest and the highest passage are told by the gated merit:

| Book                              | Merit | Gated | Lowest and highest passage | Read | To learn from | What not to do | For those who read for the writing | For the widest public |
| --------------------------------- | ----- | ----- | -------------------------- | ---- | ------------- | -------------- | ---------------------------------- | --------------------- |
| _Pride and Prejudice_             | 0.80  | 0.80  | 0.76–0.85                  | 0.70 | 0.82          | 0.12           | 0.77                               | 0.06                  |
| _The Sheik_                       | 0.68  | 0.68  | 0.64–0.75                  | 0.75 | 0.57          | 0.37           | 0.30                               | 0.50                  |
| _Irene Iddesleigh_                | 0.46  | 0.19  | 0.15–0.25                  | 0.62 | 0.14          | 0.85           | 0.41                               | 0.35                  |
| _Treasure Island_                 | 0.81  | 0.81  | 0.78–0.83                  | 0.78 | 0.83          | 0.12           | 0.14                               | 0.13                  |
| _King Solomon's Mines_            | 0.75  | 0.75  | 0.65–0.82                  | 0.75 | 0.68          | 0.22           | 0.07                               | 0.54                  |
| _Tarzan of the Apes_              | 0.69  | 0.69  | 0.65–0.73                  | 0.78 | 0.60          | 0.29           | 0.03                               | 0.67                  |
| _The Turn of the Screw_           | 0.83  | 0.83  | 0.79–0.85                  | 0.77 | 0.80          | 0.21           | 0.98                               | 0.00                  |
| _Dracula_                         | 0.76  | 0.76  | 0.71–0.81                  | 0.73 | 0.72          | 0.24           | 0.45                               | 0.25                  |
| _Varney the Vampire_              | 0.58  | 0.50  | 0.30–0.64                  | 0.71 | 0.34          | 0.59           | 0.14                               | 0.63                  |
| _The Moonstone_                   | 0.75  | 0.75  | 0.70–0.79                  | 0.72 | 0.72          | 0.27           | 0.51                               | 0.20                  |
| _The Mysterious Affair at Styles_ | 0.74  | 0.74  | 0.71–0.77                  | 0.73 | 0.72          | 0.19           | 0.09                               | 0.55                  |
| _The Mystery of a Hansom Cab_     | 0.59  | 0.58  | 0.52–0.64                  | 0.68 | 0.42          | 0.48           | 0.08                               | 0.68                  |
| _The War of the Worlds_           | 0.79  | 0.79  | 0.76–0.82                  | 0.76 | 0.82          | 0.16           | 0.41                               | 0.21                  |
| _The Lost World_                  | 0.75  | 0.75  | 0.71–0.79                  | 0.75 | 0.71          | 0.23           | 0.16                               | 0.44                  |
| _Edison's Conquest of Mars_       | 0.61  | 0.59  | 0.42–0.70                  | 0.70 | 0.41          | 0.48           | 0.03                               | 0.63                  |
| _La Regenta_                      | 0.79  | 0.79  | 0.73–0.82                  | 0.72 | 0.75          | 0.25           | 0.98                               | 0.00                  |
| _La barraca_                      | 0.77  | 0.77  | 0.75–0.79                  | 0.76 | 0.75          | 0.22           | 0.92                               | 0.01                  |
| _El cocinero de su majestad_      | 0.70  | 0.70  | 0.64–0.75                  | 0.73 | 0.56          | 0.34           | 0.46                               | 0.32                  |
| _Don Quijote_                     | 0.80  | 0.80  | 0.77–0.86                  | 0.70 | 0.77          | 0.16           | 0.63                               | 0.17                  |
| _Ulysses_                         | 0.71  | 0.63  | 0.33–0.90                  | 0.59 | 0.49          | 0.47           | 0.97                               | 0.01                  |

What it is good for and what it is not:

- **Three floors, and little within the top one.** Prose written by the yard, 0.46 to 0.61; the competent seller, 0.68 to 0.71; the well written, 0.74 to 0.83. Within the last the order of each ladder is right and the distances are of a hundredth or two: _The Moonstone_ over _The Mysterious Affair at Styles_ by 0.01, _La Regenta_ level with _The War of the Worlds_. It says on which floor a book is; it does not tell a great novel from a good one, any more than the `passage` rules did.
- **_Ulysses_ is still marked down**, 0.71, with _Tarzan of the Apes_. But its passages run from 0.33 to 0.90, the highest of all twenty books and among the lowest, where no other book of the upper floors spans two tenths: what the book is like is seen, and the mean is unkind to it.
- **The read is still the weaker valuation**, all twenty books between 0.59 and 0.78.
- **Whom it is written for is no mark, and says most.** Readers who read for the writing: _The Turn of the Screw_, _La Regenta_, _Ulysses_, _La barraca_, _Pride and Prejudice_. The widest public, to pass the time: _The Mystery of a Hansom Cab_, _Tarzan of the Apes_, _Varney the Vampire_, _Edison's Conquest of Mars_. _Irene Iddesleigh_ is written for those who read for the writing as much as for anyone, 0.41, and is what a teacher would show as what not to do, 0.85: it means to be literature and is not.

## Ornament

A passage rewritten overdone on purpose was the undoing of the first questions tried, and the `passage` rules count fine writing only where the wording is not strained. Of the behavioural questions, most are taken in. What a reader would mark to keep gives _Irene Iddesleigh_ 0.84. A passage of _King Solomon's Mines_ comes to 0.70 as it is and 0.62 told overdone; _Irene Iddesleigh_ to 0.46, where the `passage` rules had it at 0.13. The two questions of the teacher are not taken in: that overdone passage is an example of what not to do at 0.76, where the passage as it is was at 0.29, and one to learn from at 0.36, down from 0.60.

Merit by the teacher alone, the example to learn from where it is not one of what not to do, sinks ornament, 0.05 to 0.09 for the overdone passages and 0.02 for _Irene Iddesleigh_; and it loses two pairs of the eighteen, _La barraca_ over _La Regenta_ and _The Mysterious Affair at Styles_ over _The Moonstone_, with _Ulysses_ at 0.30, under _The Sheik_. What a teacher takes to class is clear and well behaved prose, which is the taste the questions are to be kept from.

Between the two, `gated`: the plain mean, but the six answers that ornament takes in count for less the surer the teacher is that the passage is what not to do, in full up to 0.5 and for nothing at 1. It leaves every book of the upper floors where it was, keeps the eighteen pairs with a wider margin, 0.126, and takes _Irene Iddesleigh_ to 0.19 and the overdone passages to 0.24 and 0.36, against 0.89 and 0.70 as they are. It costs _Ulysses_ eight hundredths, 0.63. It was arrived at after seeing the twenty books and on two rewritten passages: it stands or falls by the check.

## The check

Twelve books that had no part in any of the above, with no author of the twenty nor of the panel among them, judged with nothing changed: the behavioural questions of wording `387e135f4f84`, twelve passages of 3,000 words spread over the story, the valuation `f3e3051dc2bd` with its two merits. `node experiments/books/jev/third.ts` judges them and `third-board.ts` says what came out. What is expected was written, and committed, before any was judged.

| Ladder                      | Top                                                  | Middle                                            | Bottom                                                                                   |
| --------------------------- | ---------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| For children                | _The Wind in the Willows_, Kenneth Grahame, 1908     | _The Wonderful Wizard of Oz_, L. Frank Baum, 1900 | _Tom Swift and His Motor-Cycle_, 1910, written to an outline by a syndicate's hired pens |
| The West                    | _The Virginian_, Owen Wister, 1902                   | _Riders of the Purple Sage_, Zane Grey, 1912      | _Deadwood Dick, the Prince of the Road_, Edward L. Wheeler, 1877, a half-dime novel      |
| Society and love, 1900–1920 | _The Age of Innocence_, Edith Wharton, 1920          | _The Rosary_, Florence L. Barclay, 1909           | _Three Weeks_, Elinor Glyn, 1907                                                         |
| Of our day, in Spanish      | _Cien años de soledad_, Gabriel García Márquez, 1967 | _Amanecer_, Stephenie Meyer, 2008, in translation |                                                                                          |
| Alone, for its difficulty   | _Mrs. Dalloway_, Virginia Woolf, 1925                |                                                   |                                                                                          |

The two of our day are somebody's books, read from where their owner has them: [what is kept of such a book](../../records/README.md) says nothing of the file. They are the first books judged that were written after 1925, and one is a translation: what is judged of it is the translator's Spanish.

| Book                            | Merit                                                                       | Read                       | Written for                     |
| ------------------------------- | --------------------------------------------------------------------------- | -------------------------- | ------------------------------- |
| _The Wind in the Willows_       | Top floor, 0.74 and over                                                    | Middle to high             | Children, and for the writing   |
| _The Wonderful Wizard of Oz_    | Middle floor: plain prose that serves the tale                              | High                       | Children                        |
| _Tom Swift and His Motor-Cycle_ | Bottom floor, under 0.65                                                    | Above its merit            | Children or the widest public   |
| _The Virginian_                 | Top floor                                                                   | High                       | Readers in general              |
| _Riders of the Purple Sage_     | Middle floor; lower gated than plain, for its landscapes                    | Above its merit            | The widest public               |
| _Deadwood Dick_                 | Lowest of those in English                                                  | Middle                     | The widest public               |
| _The Age of Innocence_          | Highest of those in English, or next to it                                  | Below its merit            | For the writing                 |
| _The Rosary_                    | Middle floor                                                                | Middle                     | The widest public               |
| _Three Weeks_                   | Bottom floor, and well lower gated than plain                               | Middle                     | The widest public               |
| _Mrs. Dalloway_                 | Top floor is where it belongs; the risk is that it comes out with _Ulysses_ | Lowest of those in English | For the writing, 0.9 and over   |
| _Cien años de soledad_          | Top floor, 0.76 and over, gated as plain                                    | Middle to high             | For the writing                 |
| _Amanecer_                      | Middle floor, 0.60 to 0.72: clean prose gone over, not weighed              | Above its merit            | The widest public, 0.5 and over |

The valuation in use is `gated`; `plain` is told beside it. What would count against it:

- A ladder out of order: ten pairs, three to each ladder of three and the pair of our day. The least sure is _The Rosary_ over _Three Weeks_, two sellers of their day of which the second was the laughing stock; every other is as sure as those of the twenty.
- `gated` putting fewer pairs in order than `plain`, or taking more than 0.02 from _Cien años de soledad_, _Mrs. Dalloway_, _The Age of Innocence_ or _The Wind in the Willows_: it would be taking abundance for ornament.
- The two valuations not parting as named: _Mrs. Dalloway_ and _The Age of Innocence_ worth more than they read; _Tom Swift and His Motor-Cycle_, _Riders of the Purple Sage_ and _Amanecer_ reading better than they are worth; by rank among the twelve.
- The test of ornament failing. The middle passage of the upper two rungs of the three ladders in English and of _Mrs. Dalloway_, seven passages, is told again dull and overdone by a language model (`node third.ts rewrites`). Under `gated` the overdone passage is to come out under the passage as it is in all seven and on the bottom floor, under 0.5, in six; the dull one under the passage as it is in all seven.
- _Mrs. Dalloway_ under 0.74 says that the mark against _Ulysses_ is a rule and not an accident of that book: prose that leaves the plainly told story is marked down. It would not undo the rest, and would have to be said wherever a merit is shown.

## What the check showed

Judged on 2026-09-19 with nothing changed: 170 calls to Jev and $0.04, the test of ornament among them, and some $0.10 to the model that tells the passages again.

| Book                            | Merit | Plain | Lowest and highest passage | Read | To learn from | What not to do | Written for             |
| ------------------------------- | ----- | ----- | -------------------------- | ---- | ------------- | -------------- | ----------------------- |
| _The Wind in the Willows_       | 0.80  | 0.80  | 0.77–0.88                  | 0.75 | 0.77          | 0.15           | Children, 0.99          |
| _The Wonderful Wizard of Oz_    | 0.75  | 0.75  | 0.73–0.79                  | 0.74 | 0.75          | 0.11           | Children, 1.00          |
| _Tom Swift and His Motor-Cycle_ | 0.54  | 0.55  | 0.45–0.60                  | 0.71 | 0.40          | 0.33           | Children, 0.96          |
| _The Virginian_                 | 0.80  | 0.80  | 0.76–0.86                  | 0.74 | 0.78          | 0.17           | For the writing, 0.71   |
| _Riders of the Purple Sage_     | 0.76  | 0.76  | 0.74–0.81                  | 0.78 | 0.72          | 0.22           | For the writing, 0.48   |
| _Deadwood Dick_                 | 0.41  | 0.54  | 0.26–0.54                  | 0.68 | 0.27          | 0.66           | The widest public, 0.80 |
| _The Age of Innocence_          | 0.83  | 0.83  | 0.79–0.86                  | 0.74 | 0.84          | 0.14           | For the writing, 0.99   |
| _The Rosary_                    | 0.74  | 0.74  | 0.70–0.79                  | 0.73 | 0.63          | 0.34           | For the writing, 0.54   |
| _Three Weeks_                   | 0.67  | 0.71  | 0.56–0.74                  | 0.75 | 0.51          | 0.49           | For the writing, 0.60   |
| _Cien años de soledad_          | 0.86  | 0.86  | 0.81–0.90                  | 0.79 | 0.86          | 0.11           | For the writing, 0.98   |
| _Amanecer_                      | 0.48  | 0.54  | 0.30–0.62                  | 0.76 | 0.37          | 0.57           | The widest public, 0.67 |
| _Mrs. Dalloway_                 | 0.86  | 0.86  | 0.83–0.89                  | 0.73 | 0.86          | 0.15           | For the writing, 1.00   |

The middle passage of seven of them as it is, told dull and told overdone, by each merit:

| Passage of                   | As it is, gated | Dull | Overdone | Overdone, plain |
| ---------------------------- | --------------- | ---- | -------- | --------------- |
| _The Wind in the Willows_    | 0.78            | 0.38 | 0.24     | 0.58            |
| _The Wonderful Wizard of Oz_ | 0.74            | 0.51 | 0.20     | 0.51            |
| _The Virginian_              | 0.76            | 0.56 | 0.21     | 0.56            |
| _Riders of the Purple Sage_  | 0.74            | 0.50 | 0.23     | 0.57            |
| _The Age of Innocence_       | 0.85            | 0.25 | 0.25     | 0.62            |
| _The Rosary_                 | 0.77            | 0.58 | 0.31     | 0.63            |
| _Mrs. Dalloway_              | 0.85            | 0.35 | 0.17     | 0.55            |

What held:

- **Every ladder is in order**, ten pairs of ten, by either merit; gated, a rung stands 0.17 over the next. The least sure pair held too, _The Rosary_ over _Three Weeks_ by 0.07.
- **`gated` takes nothing from abundance and everything from ornament.** Not a hundredth from _Cien años de soledad_, _Mrs. Dalloway_, _The Age of Innocence_ nor _The Wind in the Willows_. The seven passages told overdone come to 0.17 to 0.31, all on the bottom floor and under the passage as it is; by the plain mean they would stand at 0.51 to 0.63, with the sellers. The dull ones come out under the passage as it is in all seven. It is the merit to use.
- **The mark against _Ulysses_ is no rule.** _Mrs. Dalloway_ stands at the top of all thirty-two books with _Cien años de soledad_, 0.86, and is even throughout, 0.83 to 0.89. Prose that leaves the plainly told story is not marked down for it; what is marked down in _Ulysses_ are the episodes Jev cannot follow.
- **The bottom is the bottom**: the half-dime novel 0.41, the syndicate's book for boys 0.54, and between them _Amanecer_, 0.48.
- Merit and read part as named in four of five: _Mrs. Dalloway_ and _The Age of Innocence_ are worth more than they read, _Riders of the Purple Sage_ and _Amanecer_ read better than they are worth, _Amanecer_ from next to last in merit to third as a read.

What did not:

- **The floors were guessed a step low or high for five books**, with no ladder out of order for it. _The Wonderful Wizard of Oz_, _Riders of the Purple Sage_ and _The Rosary_ were expected on the middle floor and stand at the foot of the top one, 0.74 to 0.76; _Three Weeks_ was expected at the bottom and is in the middle; _Amanecer_ was expected in the middle and is at the bottom.
- **_Tom Swift and His Motor-Cycle_ does not read better than it is worth**: third from last in merit, next to last as a read. The read is squeezed as ever, the twelve between 0.68 and 0.79, _Cien años de soledad_ the best of them.
- **Whom a book is written for leans with age.** Two sellers of 1907 and 1909 are held to be for those who read for the writing, 0.60 and 0.54, as _Irene Iddesleigh_ half was: prose of a formal cast is taken for prose with literary aims. It holds among books of a same time, the three for children and the two of our day.
- **The tellings again are not of a length with the passage.** The dull ones came out at a quarter to a half of it and the overdone at a quarter as long again and more; one overdone telling, that of _Mrs. Dalloway_, is a stub of 224 words. Three overdone tellings failed on the first run and were made on a second try, with the rest untouched.

**_Amanecer_, as it was read.** Jev holds it a first draft, written fast and not gone over, 0.50, more than any other book of the thirty-two; _Irene Iddesleigh_ comes next, 0.30. The Spanish of the copy judged is careless: of 1,979 questions 384 lack their opening mark, over a hundred common words lack their accent, and a chapter is headed _N0 HAY PALABRAS_ with a nought. What was judged is that text, as the [expectations](#the-check) said of any translation; it says nothing sure of the novel in English nor of its published translation.

So the behavioural questions at 3,000 words, valued `gated`, order books within a genre in all ten pairs they had not seen, as in the eighteen they were chosen on; tell what is written by the yard from the competent and from the well written; are not taken in by ornament; and do not mark difficulty down as such. Within the top floor they now spread, 0.74 to 0.86, in an order no reader would quarrel much with, which is not yet telling a great novel from a good one: the two that stand highest are also the two latest written of the well written, which may be their worth or the taste of a model of our day, and books of our day from the middle floor would tell which. The read says which of the two a book is more of, and little else.
