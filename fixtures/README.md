# Bidi fixtures

Test cases for Arabic/English direction (`dir`) in rendered Markdown. Each case is one JSON file in `cases/`. No plugin code yet: these only describe what a correct renderer should output.

## Format

- `markdown`: the input. Streaming cases use `chunks` instead (each chunk is the text so far).
- `blocks`: for each block to check, `match` (a substring of that block's text), `type`, and `expected_dir` (`rtl` or `ltr`).
- `expected_dir` follows the first-strong-character rule (the same rule as `dir="auto"` in the reference `markdown-it-bidi`): the block takes the direction of its first Arabic or Latin letter. Code is always `ltr`.
- `note`: optional explanation.

## Cases

| File | What it checks |
|---|---|
| `01-pure-arabic` | An Arabic heading and paragraph are both rtl. |
| `02-pure-english` | An English heading and paragraph are both ltr. |
| `03-arabic-paragraph-inline-english` | An Arabic paragraph with English tech words stays rtl (first strong is Arabic). |
| `04-english-paragraph-inline-arabic` | An English paragraph with an Arabic word stays ltr. |
| `05-arabic-list-english-words` | Arabic list items with English words: rtl when the item starts with Arabic, ltr when it starts with English. |
| `06-table` | A GFM table with Arabic and English headers and cells; each cell follows its own first strong character. |
| `07-code-span-and-block-in-arabic` | Arabic prose around a fenced code block and an inline code span: prose is rtl, code is ltr. |
| `08-partial-streaming-chunk` | Three partial chunks (a cut word, an unclosed code fence, a list item being typed) must already have the right direction. |

## Notes

- Each case is a small, realistic Lebanese or Modern Arabic sentence with English tech words (AI, RAG, pgvector, Render).
- The format follows the reference packages in `~/Documents/Agents/Ali/bidi-test`, which set `dir="auto"` on block elements.
- The expected values are hand-written from the first-strong rule, not measured from a renderer. Check them against a real renderer before trusting a pass.
