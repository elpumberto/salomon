# Who takes the notes

Which language model reads a book ahead of Jev was settled by trying them on the same book: _King Solomon's Mines_, 21 sections and 82,000 words, read to the end by each. All but the first run go by the same rules, which are the instructions to the model and the shape of its answers; what changes from one run to the next is the model, and which of its providers OpenRouter may send it to. Every run is a record under [`records/`](../../records/README.md), and this table is made from them:

    npm run records -- king-solomons-mines --markdown

<!-- records:king-solomons-mines -->

| Model                   | Providers                           | Rules          | Read         | Calls | Not kept | Thinking | Cost    | Time        | People | Threads | Left open               | Synopsis within length | Longest | When             |                                                                                                            |
| ----------------------- | ----------------------------------- | -------------- | ------------ | ----- | -------- | -------- | ------- | ----------- | ------ | ------- | ----------------------- | ---------------------- | ------- | ---------------- | ---------------------------------------------------------------------------------------------------------- |
| `deepseek-v4-flash`     | OpenRouter's own                    | `c558d82ce81e` | to the end   | 21    | —        | 30%      | $0.0086 | 13 min 32 s | 22     | 16      | 8                       | —                      | —       | 2026-09-19 08:11 | [record](../../records/books/king-solomons-mines/20260919T081102Z.notes.deepseek-deepseek-v4-flash.json)   |
| `deepseek-v4-flash`     | OpenRouter's own                    | `7035f9a10552` | to the end   | 62    | —        | 61%      | $0.0288 | 25 min 2 s  | 19     | 14      | 0                       | —                      | —       | 2026-09-19 09:11 | [record](../../records/books/king-solomons-mines/20260919T091102Z.notes.deepseek-deepseek-v4-flash.json)   |
| `deepseek-v4-flash`     | price first; without open-inference | `7035f9a10552` | to the end   | 53    | 12 of 53 | 72%      | $0.0167 | 33 min 43 s | 22     | 16      | 0                       | 20 of 21               | 346     | 2026-09-19 09:43 | [record](../../records/books/king-solomons-mines/20260919T094327Z.notes.deepseek-deepseek-v4-flash.json)   |
| `deepseek-v4.1-flash`   | price first                         | `7035f9a10552` | to the end   | 72    | 39 of 72 | 29%      | $0.0640 | 71 min 30 s | 22     | 54      | 0 (2 settled on review) | 11 of 21               | 414     | 2026-09-19 09:43 | [record](../../records/books/king-solomons-mines/20260919T094330Z.notes.deepseek-deepseek-v4.1-flash.json) |
| `gemini-3.1-flash-lite` | price first                         | `7035f9a10552` | to the end   | 41    | 0 of 41  | 0%       | $0.0606 | 1 min 25 s  | 19     | 10      | 0                       | 20 of 20               | 184     | 2026-09-19 09:46 | [record](../../records/books/king-solomons-mines/20260919T094603Z.notes.google-gemini-3.1-flash-lite.json) |
| `gemma-4-31b-it`        | price first                         | `7035f9a10552` | to the end   | 42    | 0 of 42  | 0%       | $0.0340 | 9 min 51 s  | 23     | 8       | 0                       | 21 of 21               | 207     | 2026-09-19 09:46 | [record](../../records/books/king-solomons-mines/20260919T094603Z.notes.google-gemma-4-31b-it.json)        |
| `ministral-8b-2512`     | price first                         | `7035f9a10552` | to the end   | 48    | 6 of 48  | 0%       | $0.0256 | 5 min 43 s  | 19     | 52      | 1 (3 settled on review) | 20 of 20               | 294     | 2026-09-19 09:46 | [record](../../records/books/king-solomons-mines/20260919T094603Z.notes.mistralai-ministral-8b-2512.json)  |
| `gpt-5.4-nano`          | price first                         | `7035f9a10552` | broke at §19 | 59    | 43 of 59 | 0%       | $0.0750 | 6 min 32 s  | 17     | 23      | 6                       | 1 of 14                | 458     | 2026-09-19 09:46 | [record](../../records/books/king-solomons-mines/20260919T094603Z.notes.openai-gpt-5.4-nano.json)          |
| `glm-5.3-flash`         | price first                         | `7035f9a10552` | broke at §7  | 9     | 2 of 9   | 87%      | $0.0215 | 21 min 42 s | 13     | 8       | 7                       | 3 of 3                 | 267     | 2026-09-19 09:46 | [record](../../records/books/king-solomons-mines/20260919T094603Z.notes.z-ai-glm-5.3-flash.json)           |
| `qwen3.5-flash-02-23`   | price first                         | `7035f9a10552` | broke at §5  | 4     | 3 of 4   | 0%       | $0.0024 | 0 min 36 s  | 0      | 0       | 0                       | 0 of 0                 | 0       | 2026-09-19 09:50 | [record](../../records/books/king-solomons-mines/20260919T095002Z.notes.qwen-qwen3.5-flash-02-23.json)     |
| `mistral-small-2603`    | price first                         | `7035f9a10552` | broke at §5  | 1     | 0 of 1   | 0%       | $0.0005 | 1 min 12 s  | 0      | 0       | 0                       | 0 of 0                 | 0       | 2026-09-19 09:56 | [record](../../records/books/king-solomons-mines/20260919T095622Z.notes.mistralai-mistral-small-2603.json) |

<!-- /records -->

- **Rules** is the hash of the instructions. The first row is the only one under older rules, which asked for everything in one call a section; all the others ask for one thing a call.
- **Not kept** counts the answers that had to be asked for again: a synopsis that ran long or let go of the story, JSON cut short or of another shape than asked. They are paid for like the rest.
- **Left open** is the threads of the story still open at the end of the book. This book settles nearly all it raises, so a high number is the note-taker's doing, not the book's.
- **Synopsis within length** is how many times what the reader knows so far, asked for in 250 words, came in under 300.

## What each run showed

- **DeepSeek V4 Flash, older rules.** The cheapest run and the one whose notes were of no use: see [the pipeline](pipeline.md#what-it-costs-and-how-long-it-takes).
- **DeepSeek V4 Flash, left to OpenRouter.** Good notes of each section and a sound ledger of threads, but the synopsis ran to 586 words. OpenRouter spread the calls over 11 providers at up to five times the price of the cheapest, and one of them, OpenInference, had a hand in every section where the synopsis ran long.
- **DeepSeek V4 Flash, cheapest provider first, without OpenInference.** The same model and rules with nothing changed but who runs it: 42% cheaper, the synopsis within its length in 20 sections of 21, and its end-of-book synopsis still tells the story from its beginning. Nearly all of it ran on one provider. It is also the slowest run of all, because the model thinks: 72% of what it wrote was thinking.
- **DeepSeek V4.1 Flash.** The model after it, and worse at this: nearly four times the price and twice the time of V4, more than half of its answers sent back, the synopsis over its length in 10 sections of 21, and 54 threads.
- **Gemini 3.1 Flash-Lite.** The whole book in 85 seconds, with no answer sent back and the synopsis never over 184 words. Its ledger is the cleanest: ten threads, each a question a reader would ask, closed about where the book answers it. It took the narrator's introduction, which is part of the fiction, for something around the work.
- **Gemma 4 31B.** No answer sent back either, at half the price of Gemini and seven times its time. Its threads are the weak point: eight of them, several a label for a subject ("the details of the expedition") rather than a question.
- **Ministral 8B.** Fast and cheap, and too small for the job: 52 threads, because everything looks like one to it, and, in the chapter that was compared, events told out of order.
- **GPT-5.4 nano.** OpenAI's content filter refused chapter XV, the aftermath of a battle in a novel of 1885, every time it was asked. A model that will not read violence cannot read books. It also ignored the length of the synopsis in 13 sections of 14.
- **GLM 5.3 Flash.** Thought for 24,000 tokens without getting to an answer, three times over, on the third chapter. One section of it cost more than half of a whole book with DeepSeek.
- **Qwen 3.5 Flash.** Served by one provider, which takes the shape asked for as leave to answer in any JSON; the model answered with the shape of what it was sent. These rules cannot be run with it as it is served.
- **Mistral Small.** Never got into the first chapter: OpenRouter's shared allowance with Mistral, its one provider, was used up that day.

## What the table does not show

The notes of one chapter, set side by side, are faithful and neutral in all five models that read the book to the end: none adds to the text, none judges it. What tells them apart is what they keep track of across the book, and the ledger of threads most of all, since what a book leaves unanswered is read off it.

Calls are not all that is paid for. By OpenRouter's count the experiment cost $0.46, and the records add up to $0.34. Part of the rest is the runs that broke before a run that breaks left a record. The other part cannot be seen from this side: a call that is cut off for taking too long is billed for what the model had written by then. It happens to the models that think, on providers that are slow, and it makes their real cost higher than their records say.

## The choice

**Gemini 3.1 Flash-Lite**, with the cheapest provider first.

It is not the cheapest: a book of this size is 6 cents with it and under 2 with DeepSeek. It is the one that does the job as asked every time, and the difference in money is small beside what that is worth:

- Its ledger of threads is the best of the lot, and that is the part of the notes Jev's view of the whole book leans on.
- No answer had to be asked for again, so its cost is what the estimate says, and none of it is hidden in calls cut off.
- It does not think before it answers. A book takes a minute and a half instead of half an hour, which is the difference between ten minutes and three and a half hours for a book the size of the _Quijote_, and between trying a change of rules now and trying it tomorrow.

DeepSeek V4 Flash, held to its cheapest provider, is the one to fall back on: under a third of the price, notes as good, and a wait over twenty times longer.

Two things this does not settle. One book in English is not every book: the _Quijote_ will say how each reads the Spanish of 1605. And every model here knows this novel; how they take notes on a book they have never seen is yet to be tried.
