# Against the canon

The valuation in use was checked against twenty-eight pairs of books of a same genre, of which the better had to come out higher, and all twenty-eight did. That is a floor and not a measure: two ways of valuing that both keep the pairs cannot be told apart by them, and nothing can be called more accurate for keeping them. So a graded truth was gathered for every book judged, what was tried against it is set out here in the order it was tried, and what came of it changes what a valuation is to be taken for. All of it on 2026-09-22: 6,132 calls to Jev, $1.62 at list price, and $0.48 to the model that reads for it.

## A truth with degrees

For each of the thirty-two books judged, and then six more of the panel that had no part in any choosing, two things from outside Salomón: how far the institutions of literature hold the book, and what readers say of it. The first is nine slots, each 0 or 1, from public sources named before any was read: the critic's canon, the reading canon, a newspaper's list, a broadcaster's, a classics series in print, a critical edition, an encyclopaedia's article on the work, a hundred syllabi, thirty Wikipedias. Standing is their mean; seven books have every slot and ten have none. The second is the Goodreads rating over every edition. What each is, where it was read and what it leans to, English, age, school, is in [truth/](../../truth/README.md), and

    npm run truth

sets the valuation beside it. Two orders of the same books are compared by how many pairs they put the same way round less how many the other, from −1 to 1 (Kendall's tau-b), with the 5th and 95th of the books drawn again as its band; 0.6 is four pairs of five the same way.

By that measure, on 2026-09-22 and over thirty-eight books:

| The valuation in use, against                                    | Agreement                | Within the twenty-three of the top floor |
| ---------------------------------------------------------------- | ------------------------ | ---------------------------------------- |
| Standing                                                         | 0.62 (0.49–0.74)         | 0.54                                     |
| What the public is told to read (the reading canon)              | 0.67                     | 0.56                                     |
| What critics hold (canon, critical edition, syllabi)             | 0.59                     | 0.48                                     |
| How far the book reaches (broadcaster, encyclopaedia, languages) | 0.52                     | 0.42                                     |
| **The read, against the Goodreads rating**                       | **0.15 (−0.06 to 0.35)** | −0.24                                    |

Merit tells prose written by the yard from the rest and keeps twenty books between 0.74 and 0.86 where the institutions spread them from 0.22 to 1.00. _Ulysses_, of the canon by every slot, stands twenty-ninth of thirty-eight. The read agrees with what readers say no better than chance, and merit predicts the rating better than the read does, 0.46. The three facets of standing agree with each other at 0.70 to 0.87: the nine sources measure one thing.

## What was tried

Each way was said, with what it would have to show, before it was run; the header of each script holds it. Every one is scored by the one measure, beside merit, over the same books.

| Way                                                                                                                                           | Script                                                    | Calls | Agreement with standing; within the top floor      | What came of it                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Another aggregation of the same answers: power means, ordered weighted means, the median over passages                                        | `scratch`                                                 | none  | 0.59–0.60                                          | The nine answers are two blocks, craft and voice; any averaging orders alike; only the gate matters. The median lifts _Ulysses_ to the top floor and nothing else moves                                   |
| A Bayes net: the answers as evidence of a hidden level per book, tables learned from the other books or given by Jev of a book described      | `bayes.ts`, `bayes-tables.ts`                             | 4     | 0.52–0.61; 0.20–0.43                               | Learned from thirty-one books, worse than the mean; from Jev's knowledge, equal to it and with its misses                                                                                                 |
| Comparing instead of scoring: every pair of books, two pairs of passages, both ways round, a strength from the wins                           | `compare.ts`, `compare-board.ts`                          | 1,984 | 0.50; 0.31                                         | The scale opens wide and no ceiling remains, and it drops _Don Quijote_, _Dracula_ and _Ulysses_: it sees the craft of the sentence, not what makes the canon                                             |
| The whole book in the verdict: unity, ending, breadth from the outline, added to merit above the floor                                        | `verdict.ts`                                              | none  | 0.66 against merit's 0.69 on the same twenty       | No signal: every answer of the outline flat, _Irene Iddesleigh_ as well built as _Treasure Island_                                                                                                        |
| Four schools of criticism on each passage, and how far they agree                                                                             | `critics.ts`, `critics-board.ts`                          | 454   | 0.53–0.60; 0.31–0.48                               | The schools agree with each other at 0.72–0.80: one critic in four coats. _Ulysses_ alone divides them, form 0.90, the ordinary reader 0.42                                                               |
| One judge for each kind of book, blended by the degree the schools part on it                                                                 | `regions.ts`                                              | none  | 0.61–0.65; 0.31–0.43                               | _Ulysses_ from twenty-fifth to fourth without touching the bottom floor, and the rest of the top floor loses its order: the judge inside the region gives nine tenths to every well written book          |
| A judge for the critic's book: what a scholar would do with the passage, how it is made, what it dares, whether it would be read in a century | `scholar.ts`, `scholar-board.ts`                          | 454   | 0.72 on thirty-two, **0.67** on thirty-eight; 0.51 | The gain halves on the six books it had not seen. Of its eight questions, invention, risk and convention are noise; what orders is what will become of the book: a century from now, 0.74                 |
| The same of the outline of the whole book                                                                                                     | `whole-scholar.ts`                                        | 20    | 0.77; 0.54, and a century from now 0.85            | The highest of all, and the most open to what follows                                                                                                                                                     |
| The questions in three other wordings, of every passage                                                                                       | `wording-consensus.ts`, `wordings.ts`, `wording-board.ts` | 1,362 | 0.56–0.63; the consensus 0.62                      | The wordings agree with each other at 0.84–0.93 and part by 0.05 a book, 0.15 at most; the consensus orders as the wording in use does. `lesson` and `underline` part most, in the middle of their scales |

Nothing that recombines or re-asks the fourteen answers gets past the mean, and the one thing that did, the questions of what will become of the book, is the kind of question a model may answer by knowing the book. So that was measured.

## Whether the judge knows the book

Jev is given the text alone, with no title nor author, and [what Jev can tell of a chapter](jev-experiments.md) found that a name or a critic's line beside the text moves its answers. Whether it needs them was not known. Two probes:

- **A language model shown each judged passage alone and asked what book it is from** (`recognise.ts`, 454 calls, $0.48): it names the book for 96 of 100 passages, and for every passage of every book of any standing; only seven books of the bottom floor have a passage it does not place.
- **Jev shown each passage with four novels named, the right one among them, and asked which, and whether the novel is well known** (`recognise-jev.ts`, 454 calls): it puts 0.99 on the right novel on average, one passage of 454 under 0.5. Whether it holds the novel well known orders the books as the standing does at **0.68**, better than merit's 0.62; and the scholar's question of a century from now agrees with it at 0.83. With fame taken out of both, merit agrees with standing at 0.28, the scholar at 0.38.

Fame may inflate the judgment, or the famous may be the better written; a correlation cannot tell. So the judged passages were told again with every proper name changed for another of the same kind and time and nothing else touched, first of six books and then of all thirty-eight (`disguise.ts`, `disguise-board.ts`, `blind-board.ts`; the tellings again by `gemini-3.1-flash-lite`, kept out of git with the rest of the books; 1,332 calls to Jev). The texts keep their length to a hundredth and their sentences their shape. Jev still names the novel, since with three others of another genre beside it the plot is enough; but how well known it holds the passage falls, from 0.91 to 0.70 over the top floor, from 0.95 to 0.45 for _The Prisoner of Zenda_, from 0.93 to 0.15 for _Amanecer_. What the valuation does then:

| With every proper name changed          | Well written, 23 books | Competent, 7 | Written by the yard, 8 |
| --------------------------------------- | ---------------------- | ------------ | ---------------------- |
| Merit as it is → with the names changed | 0.79 → 0.74            | 0.67 → 0.62  | 0.49 → 0.46            |

| Agreement with standing       | As it is         | Names changed                                            |
| ----------------------------- | ---------------- | -------------------------------------------------------- |
| Merit                         | 0.62 (0.49–0.74) | **0.47** (0.29–0.62)                                     |
| Merit, within the top floor   | 0.54             | 0.22                                                     |
| Merit, with the reading canon | 0.67             | 0.54                                                     |
| The pairs of the ladders      | 28 of 28         | 26 of 28, the two lost at 0.00 and 0.02                  |
| A century from now            | 0.74             | falls by 0.20–0.27 on the famous, by nothing on the rest |
| The read                      | 0.15             | 0.14                                                     |

The famous fall by five hundredths, _Dracula_, _Pride and Prejudice_ and _Tarzan of the Apes_ by nine, _Ulysses_, whose names are its text, by fifteen; the bottom floor by three, which, having no fame to lose, is what the disguise itself costs. The premium of fame in a merit is then some two to six hundredths on the top floor, and the agreement with the canon that is owed to the judgment of the page and not to knowing the book is 0.47. The two merits agree with each other at 0.83.

## What holds and what does not

- **The floors hold, and by reading.** Prose written by the yard is told from the rest with the names changed as without; 26 of 28 pairs hold, and the two that fall were a hundredth apart. The test of ornament had shown the same: a famous passage told again overdone falls from 0.78 to 0.24, which no reputation explains; and _Amanecer_, which Jev holds famous at 0.93, stands at 0.48 for its careless text.
- **The order within the top floor does not.** Among the well written, what ordered the books as the canon does was mostly how well known Jev held them; with the names changed, 0.22 remains. [How to read a valuation](reading-a-valuation.md) said a great novel is not told from a good one; it is now known why.
- **The read says nothing that readers say.** No way tried, the read as it is, the read with the names changed, a school of ordinary readers, or which of two passages most readers would enjoy, agrees with the Goodreads rating above 0.16.
- **"With no title nor author" is not blind.** The judge names the book from the page, and its judgment of a famous page carries the fame. What the canon holds of _Don Quijote_, _Dracula_ or _Ulysses_ is in part what they founded, which is in no passage; a judge of the page cannot see it, and a judge that sees it is remembering. A book nobody knows is judged by its page alone, and will stand some hundredths under a known book written as well: the bias of the valuation is against the unknown book, which is the one it was made for.
- **The wording is a small error, now known.** Four wordings part by 0.05 a book; the sampling of passages, by 0.01.

What a valuation carries from here, beside merit: how well known Jev holds the book, from 0 to 1; the merit with the names changed, whose distance from the merit as it is is what the fame of that book is worth to the judge; and how far the wordings part on it. The read is a profile and not a valuation.

## What was learned about the ways of asking

Nothing that recombines the same answers, however cleverly, moves the agreement with the canon: the mean, the median, a power mean, a Bayes net, a judge per kind of book all land within a few hundredths of each other. What moves it is what the judge is given and what it is asked: another kind of question (what will become of the book) moved it up, and was fame; taking the names out moved it down, and was honest. The truth with degrees is what made any of this measurable, and the disguise is what made the number defensible. Two things remain open. There is no set of books both held by the institutions and unknown to the models, so the judgment of the page against the canon cannot be checked clean of memory on any book the canon has; and the canon holds what a book began as well as how it is written, which no reading of a passage can give.
