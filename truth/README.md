# What is known of the books from outside

A valuation is checked against something, and until now that was twenty-eight pairs of books of a same genre, of which the better had to come out higher. All twenty-eight do, which is a floor and not a measure: two ways of valuing that both keep the pairs cannot be told apart by them. This folder holds a graded truth instead, for the thirty-two books judged: how far the institutions of literature hold each, and what readers say of it, from public sources named before any was read, each kept with its URL and the day it was read.

    npm run truth

sets the truth beside what Salomón made of each book and says how far the two orders agree.

## Standing

Nine slots, each 0 or 1, chosen so that a book in English or in Spanish, of any century, can score on each. Standing is their plain mean.

| Slot | 1 when                                                                                                                                                                                                                                 |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A    | Named in the appendix list of Harold Bloom's _The Western Canon_ (1994)                                                                                                                                                                |
| B    | In _1001 Books You Must Read Before You Die_ (Boxall), any edition                                                                                                                                                                     |
| C    | In the Guardian's _1000 novels everyone must read_ (2009), Le Monde's _100 Books of the Century_ (1999), the Modern Library _100 Best Novels_ board list (1998), or El Mundo's _100 mejores novelas en castellano del siglo XX_ (2001) |
| D    | In the BBC's _100 Novels That Shaped Our World_ (2019), _100 Stories That Shaped the World_ (2018), or the top 100 of _The Big Read_ (2003)                                                                                            |
| E    | In print in a classics series: Penguin Classics or Modern Classics, Oxford World's Classics, Everyman's Library, Library of America, Cátedra Letras Hispánicas, Biblioteca Clásica de la RAE, Castalia, or Austral                     |
| F    | An edition with a critical apparatus exists: Norton Critical Editions, Broadview, Cátedra, Biblioteca Clásica de la RAE, or Castalia                                                                                                   |
| G    | Encyclopaedia Britannica has a full article on the work itself, not a stub nor only the author's                                                                                                                                       |
| H    | Assigned in at least 100 syllabi of the Open Syllabus index (October 2025); the count is kept                                                                                                                                          |
| I    | A Wikipedia article on the work in at least 30 languages, by Wikidata; the count is kept                                                                                                                                               |

A slot counts only when the work itself is named: Bloom's "Short Novels and Tales" of James is not _The Turn of the Screw_, and the BBC's "The Twilight Saga" is not _Breaking Dawn_. Kept as facts and not as slots: whether the book was first a penny dreadful, a dime novel or a syndicate's book, and whether reference works hold it up by name as among the worst novels written, which only _Irene Iddesleigh_ is.

## Enjoyment

Goodreads' average rating and number of ratings of the work over all its editions; LibraryThing's average and members where reachable; Project Gutenberg's downloads in the last thirty days, as popularity among its readers rather than enjoyment. What readers say of a book is mostly the reader's and little the book's; it is the truth for "would people enjoy it" all the same, there being no other.

## What it leans to

- **English.** Seven of the nine slots are English institutions. _La Regenta_, which Bloom and _1001 Books_ both name, stands at 0.44 for want of a Guardian list, a full Britannica article and English syllabi; _La barraca_ at 0.22. Over the books in English alone the agreement with merit hardly changes, so the lean costs the measure little, but a Spanish book's standing is to be read with it in mind.
- **Age.** The slots are those of books that have had time: _Breaking Dawn_ is at 0.11 by youth, not by verdict.
- **School.** Goodreads marks down what is assigned: _The Turn of the Screw_ at 3.38 is the lowest of the classics.
- **Its day.** The lists are of the last thirty years; the standing is what the institutions hold now.

## The files

`books.json` names the thirty-two. `lists.json` (slots A–D), `editions.json` (E–G and the facts), `readers.json` (Goodreads, LibraryThing, syllabi) and `wikidata.json` (languages, Gutenberg downloads) are the sources as gathered on 2026-09-22, each value with the URL it was read from and a note of what was checked; a source that could not be reached says so and counts as 0. [src/truth.ts](../src/truth.ts) makes the degrees from them by the rules above and measures the agreement of two orders by Kendall's tau-b, with the 5th and 95th of the books drawn again as its band.

## What it says of the valuation

On 2026-09-22, over the thirty-two books: merit agrees with standing at 0.61 (band 0.46–0.73), four pairs in five the same way round; within the twenty books of the top floor alone, 0.50, and among the twelve below it 0.14: the order of the pulp among itself says little. The read agrees with what readers say at 0.15 (band −0.08 to 0.38), which is no better than chance, and merit predicts the Goodreads rating better than the read does, 0.46. Salomón tells prose written by the yard from the rest and keeps twenty books between 0.74 and 0.86 where the institutions spread them from 0.22 to 1.00; _Ulysses_, third by standing and twenty-fourth by merit, is the largest single miss.
