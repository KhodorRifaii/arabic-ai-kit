# Bidi fixtures

Test cases for Arabic/English direction (`dir`) in rendered Markdown. Each case is one JSON file in `cases/`, one scenario per file. No plugin code yet: these only describe what a correct renderer should output.

## Format

Top level of a case file:

- `id`: the file name without `.json`.
- `description`: what the case checks.
- `partial`: `true` when the input is cut mid-stream, `false` otherwise.
- `markdown`: the input. Streaming cases with several steps use `chunks` instead: a list of `{ "markdown", "blocks" }` objects, each `markdown` being the text so far. `09-stream-prefixes` also tags each chunk with `stream` (`a` or `b`) because it holds two separate streams.
- `blocks`: the blocks to check. Each block has:
  - `type`: `heading`, `paragraph`, `list`, `list-item`, `table`, `table-cell`, `code-block` or `code-span`.
  - `match`: a substring of that block's text (an empty string matches the first block of that type that has no text).
  - `expected_dir`: `rtl`, `ltr` or `none`.
  - `expected_attr`: `auto`, `rtl` or `ltr`.
  - `note`: optional explanation.

### expected_dir

The first character with a Unicode strong bidi class decides: strong R/AL (Arabic, Hebrew and similar) gives `rtl`, strong L (Latin, Cyrillic and similar) gives `ltr`. Digits, punctuation and spaces are skipped. A block with no strong character is `none`: the case makes no direction assertion, and the check skips it when comparing direction with reference output. Code is `ltr`.

### expected_attr

What the adapter must emit as the `dir` attribute on that element: `auto` (browser decides) or a fixed `rtl`/`ltr`. Prose, lists, list items, tables and cells use `auto`; `pre` and `code` use `ltr`; a `none` block uses `auto`. Checked for every block, including `none` blocks, independently of `expected_dir`.

## Cases

| File | What it checks |
|---|---|
| `01-pure-arabic` | An Arabic heading and paragraph are both rtl. |
| `02-pure-english` | An English heading and paragraph are both ltr. |
| `03-arabic-paragraph-inline-english` | An Arabic paragraph with English tech words stays rtl (first strong is Arabic). |
| `04-english-paragraph-inline-arabic` | An English paragraph with an Arabic word stays ltr. |
| `05-arabic-list-english-words` | Arabic list: items starting with Arabic are rtl, the item starting with English is ltr. The kit must set `dir` on `li`. |
| `06-table` | A GFM table: the table is rtl (first header Arabic); each header and cell follows its own first strong character. |
| `07-code-span-and-block-in-arabic` | Arabic prose around a fenced code block and an inline code span: prose is rtl, code is ltr. The kit must set ltr on `pre` and `code`. |
| `08a-partial-arabic-word` | Stream cut inside an Arabic word: paragraph is already rtl. |
| `08b-unclosed-code-fence` | Stream cut inside an unclosed code fence: still code, ltr. |
| `08c-partial-list-item` | Stream cut while a list item is typed: list and item are rtl. |
| `09-stream-prefixes` | Cumulative prefixes of two messages: `Hi`, `Hi مرحبا` (stay ltr), `1.` (none), `1. مرحبا` (rtl). |
| `10-hebrew` | Hebrew heading and paragraph are rtl (second RTL script). |
| `11-cyrillic` | Cyrillic heading and paragraph are ltr (second LTR script). |
| `12-neutral-only` | Heading and paragraph with only digits and punctuation: `none`, attr `auto`. |

## Notes

- Each case is a small, realistic Lebanese or Modern Arabic sentence with English tech words (AI, RAG, pgvector, Render).
- The reference packages in `~/Documents/Agents/Ali/bidi-test` (markdown-it-bidi, rehype-github-dir) set `dir="auto"` on h1, p, ul, ol, table and cells, but not on `li`, `pre` or `code`, and markdown-it-bidi leaves the first `th` without `dir`. The kit must add those.
- `expected_dir` was checked against the Unicode first-strong rule (Python `unicodedata`) and against the reference output with the `dir` attribute resolved the way a browser does. Differences are the cases above that name the kit's job.
