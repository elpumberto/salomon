# How to read a valuation

A valuation is two numbers from 0 to 1 and a few things that judge nothing. Neither number is a quantity in the book. Each is a guess at how a kind of reader would judge it, made from twelve passages by a model that was never told what book it was reading: merit, how those formed by the tradition of criticism would; a good read, how most readers would take to it. How they are got is in [from a file to a valuation](pipeline.md), and why this way in [other ways of asking](other-ways.md).

## Merit says on which floor a book is

| Floor                | Merit         | Who is there                                                                                                                                |
| -------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Written by the yard  | under 0.62    | The half-dime novel, the penny dreadful, the newspaper serial, the syndicate's book for boys; _Irene Iddesleigh_, 0.19, alone at the bottom |
| The competent seller | 0.63 to 0.72  | _The Sheik_, _Tarzan of the Apes_, _Three Weeks_, _El cocinero de su majestad_                                                              |
| Well written         | 0.74 and over | From _The Mysterious Affair at Styles_ and _The Rosary_, 0.74, to _Mrs. Dalloway_ and _Cien años de soledad_, 0.86                          |

That much was checked: in twenty-eight pairs of books of a same genre and of known standing, the better came out higher in every one, and ten of those pairs were of books the questions had never seen.

What a difference means:

- **0.01 is nothing.** Twelve other passages of the same book would give as much.
- **0.02 to 0.05 within a floor is an order and not a distance.** It comes out the same with other passages and other sizes of passage, and within a genre it was the right way round every time; it does not say that a book at 0.79 is a greater book than one at 0.77. _La Regenta_ stands level with _The War of the Worlds_.
- **Across genres, only the floor.** That _Treasure Island_ comes out over _Dracula_ says nothing anyone could check.
- **A great novel is not told from a good one.** Critics hold that no list of criteria does it: criteria decide between Chekhov and a seller, not between Chekhov and Turgenev. What sets the great serious novels apart was seen only in [the whole book](whole-book.md), in how many of their chapters both sides have a claim on the reader.

## The lowest and the highest passage say how even it is

The well written books keep within a tenth or so from their worst passage to their best; those written by the yard span wider, since what guards against ornament bites some of their passages and not others. _Ulysses_ runs from 0.33 to 0.90, the highest passage of all the books judged and a lowest among those of the bottom floor, and its merit of 0.63 is the mean of a book that is several: it is marked down where Jev cannot follow it, and not for being difficult, since _Mrs. Dalloway_ stands at the top. A wide span is a fact about the book and a warning about its mean.

## A good read is the weaker number

All the books judged fall between 0.59 and 0.79. It tells the ends apart, _Ulysses_ from _Treasure Island_, and says of a book whether it reads better than it is worth, as _Tarzan of the Apes_ and _Amanecer_ do, or is worth more than it reads, as _Mrs. Dalloway_ and _La Regenta_. It leans to action: the comedy of manners and the novel in letters come out in the middle. And it could not be much more: of what readers say of a book on a site of ratings, some three hundredths are owed to the book and thirty to who the reader is.

## What judges nothing

- **Whom it is written for**: children, the widest public to pass the time, readers in general, or those who read for the writing. It is the old quarrel about ratings in one line, and no mark: _Irene Iddesleigh_ is written for those who read for the writing and is what a teacher would show as what not to do. It leans with age, prose of a formal cast being taken for prose with literary aims: it is to be read among books of a same time.
- **What it reads like**: a first draft, a text gone over until it was clean, or one in which every word has been weighed.
- **To learn from, and what not to do**: how likely a teacher of writing would be to take a passage to class as the one or as the other.

## What can mislead

- **The copy judged is what is judged.** A translation is its translator's prose, and a careless edition is a careless text: a copy of _Amanecer_ with a fifth of its questions missing their opening mark was held a first draft, which says nothing sure of the novel.
- **The model may know the book.** It is given no title nor author, and a famous page may be known by heart all the same. Books nobody has written about are the fairer test, and none has been judged yet.
- **The latest written stand highest.** The two books at the top are also the two latest written of the well written, which may be their worth or the taste of a model of our day.
- **Books in different languages** come out on the same scale, _Don Quijote_ with _Pride and Prejudice_, and whether that scale is one has not been tried.

## The books judged so far

`npm run value` prints them from the records. Merit, a good read, and whom Jev held the book written for:

| Book                                    | Merit | Read | Written for                           |
| --------------------------------------- | ----- | ---- | ------------------------------------- |
| _Cien años de soledad_                  | 0.86  | 0.79 | for the writing                       |
| _Mrs. Dalloway_                         | 0.86  | 0.73 | for the writing                       |
| _The Age of Innocence_                  | 0.83  | 0.74 | for the writing                       |
| _The Turn of the Screw_                 | 0.83  | 0.77 | for the writing                       |
| _Treasure Island_                       | 0.81  | 0.78 | children, readers in general          |
| _The Wind in the Willows_               | 0.80  | 0.75 | children                              |
| _Don Quijote_                           | 0.80  | 0.70 | for the writing                       |
| _Pride and Prejudice_                   | 0.80  | 0.70 | for the writing                       |
| _The Virginian_                         | 0.80  | 0.74 | for the writing                       |
| _La Regenta_                            | 0.79  | 0.72 | for the writing                       |
| _The War of the Worlds_                 | 0.79  | 0.76 | for the writing, readers in general   |
| _La barraca_                            | 0.77  | 0.76 | for the writing                       |
| _Dracula_                               | 0.76  | 0.73 | for the writing, readers in general   |
| _Riders of the Purple Sage_             | 0.76  | 0.78 | for the writing, the widest public    |
| _King Solomon's Mines_                  | 0.75  | 0.75 | the widest public                     |
| _The Lost World_                        | 0.75  | 0.75 | the widest public, readers in general |
| _The Moonstone_                         | 0.75  | 0.72 | for the writing                       |
| _The Wonderful Wizard of Oz_            | 0.75  | 0.74 | children                              |
| _The Mysterious Affair at Styles_       | 0.74  | 0.73 | the widest public                     |
| _The Rosary_                            | 0.74  | 0.73 | for the writing                       |
| _El cocinero de su majestad_            | 0.70  | 0.73 | for the writing, the widest public    |
| _Tarzan of the Apes_                    | 0.69  | 0.78 | the widest public                     |
| _The Sheik_                             | 0.68  | 0.75 | the widest public                     |
| _Three Weeks_                           | 0.67  | 0.75 | for the writing                       |
| _Ulysses_                               | 0.63  | 0.59 | for the writing                       |
| _Edison's Conquest of Mars_             | 0.58  | 0.70 | the widest public                     |
| _The Mystery of a Hansom Cab_           | 0.58  | 0.68 | the widest public                     |
| _Tom Swift and His Motor-Cycle_         | 0.54  | 0.71 | children                              |
| _Varney the Vampire_                    | 0.50  | 0.71 | the widest public                     |
| _Amanecer_, in the copy judged          | 0.48  | 0.76 | the widest public                     |
| _Deadwood Dick, the Prince of the Road_ | 0.41  | 0.68 | the widest public                     |
| _Irene Iddesleigh_                      | 0.19  | 0.62 | for the writing, the widest public    |
