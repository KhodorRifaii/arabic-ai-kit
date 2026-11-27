# Bidi fixtures

Test cases for Arabic/English direction (`dir`) in rendered Markdown. Each case is one JSON file in `cases/`, one scenario per file. No plugin code yet: these only describe what a correct renderer should output.

## Format

Top level of a case file:

- `id`: the file name without `.json`.
- `description`: what the case checks.
- `partial`: `true` when the input is cut mid-stream, `false` otherwise.
- `markdown`: the input. Streaming cases with several steps use `chunks` instead: a list of `{ "markdown", "blocks" }` objects, each `markdown` being the text so far.
- `blocks`: the blocks to check. Each block has:
  - `type`: `heading`, `paragraph`, `list`, `list-item`, `blockquote`, `table`, `table-cell`, `code-block` or `code-span`.
  - `match`: a substring of that block's text (an empty string matches the first block of that type that has no text).
  - `expected_dir`: `rtl`, `ltr` or `none`.
  - `expected_attr`: `auto`, `rtl` or `ltr`.
  - `note`: optional explanation.

### expected_dir

The first character with a Unicode strong bidi class decides: strong R/AL (Arabic, Hebrew and similar) gives `rtl`, strong L (Latin, Cyrillic and similar) gives `ltr`. Digits, punctuation and spaces are skipped, but strong right-to-left characters that are not letters (for example the Arabic question mark U+061F, the Arabic semicolon U+061B, the Arabic full stop U+06D4 and the rial sign U+FDFC) count as `rtl`. A block with no strong character is `none`: the case makes no direction assertion, and the check skips it when comparing direction with reference output. Code is `ltr` by rule (the runner requires `expected_dir` and `expected_attr` to be `ltr` for every code block and code span), even when its first strong character is Arabic (cases 40 and 42); the first-strong check in the test runner skips code blocks and code spans.

### expected_attr

What the adapter must emit as the `dir` attribute on that element: `auto` (browser decides) or a fixed `rtl`/`ltr`. Paragraphs, headings and table cells use `auto`; lists (`ul`, `ol`), list items (`li`), blockquotes and tables use a fixed `rtl` or `ltr` equal to `expected_dir` (the browser's `auto` skips descendants with their own `dir`, so an `auto` container, or an `li` whose text sits in a `p` in a loose list, would compute ltr), or `auto` when `expected_dir` is `none`; `pre` and `code` use `ltr` (for a code block, both the `pre` and its inner `code` element must carry `dir="ltr"`); a `none` block uses `auto`. Checked for every block, including `none` blocks, independently of `expected_dir`.

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
| `09a-stream-hi` | Cumulative prefixes `Hi`, `Hi مرحبا`: both ltr. |
| `09b-stream-numbered-list` | Cumulative prefixes `1.` (none), `1. مرحبا` (rtl). |
| `10-hebrew` | Hebrew heading and paragraph are rtl (second RTL script). |
| `11-cyrillic` | Cyrillic heading and paragraph are ltr (second LTR script). |
| `12-neutral-only` | Heading and paragraph with only digits and punctuation: `none`, attr `auto`. |
| `13-long-arabic-multi-paragraph` | Three Arabic paragraphs: all rtl. |
| `14-long-english-multi-paragraph` | Three English paragraphs: all ltr. |
| `15-alternating-paragraphs` | Paragraphs alternate Arabic and English; each takes its own direction. |
| `16-nested-list-arabic-english-children` | Nested list, Arabic outer item with English and Arabic children. |
| `17-nested-list-english-arabic-children` | Nested list, English outer item with Arabic and English children. |
| `18-ordered-list-arabic` | Ordered Arabic list: digits are neutral, list and items rtl. |
| `19-ordered-list-mixed-items` | Ordered list with alternating item languages; list follows its first item. |
| `20-blockquote-arabic` | Arabic blockquote and its paragraph are rtl. |
| `21-blockquote-english` | English blockquote and its paragraph are ltr. |
| `22-blockquote-arabic-inside-english-text` | Arabic blockquote between English paragraphs. |
| `23-headings-h1-h6-arabic` | Arabic headings h1 to h6: all rtl. |
| `24-headings-h1-h6-english` | English headings h1 to h6: all ltr. |
| `25-headings-mixed-levels` | Headings alternate language across levels, including digit-first headings. |
| `26-table-english-first-header` | Table with an English first header: table ltr, Arabic cells rtl, number cells none. |
| `27-table-numbers-only-cells` | Table with a numeric column: number cells are none. |
| `28-numbers-inside-arabic` | Numbers inside an Arabic sentence stay rtl. |
| `29-date-before-arabic` | ISO date before Arabic is rtl; date after English is ltr. |
| `30-number-before-english` | Number before English is ltr. |
| `31-arabic-indic-digits` | Arabic-Indic digits are neutral: before Arabic rtl, before English ltr. |
| `32-emoji-before-arabic` | Emoji before Arabic: rtl. |
| `33-emoji-before-english` | Emoji before English: ltr. |
| `34-emoji-only` | Emoji only: none. |
| `35-url-inside-arabic` | URL inside an Arabic sentence: rtl. |
| `36-url-before-arabic` | URL at the start, Arabic after: ltr. |
| `37-email-inside-arabic` | Email inside an Arabic sentence: rtl. |
| `38-email-before-arabic` | Email at the start, Arabic after: ltr. |
| `39-inline-code-in-arabic-list` | Inline code in Arabic list items: items rtl, code ltr. |
| `40-inline-code-in-english-list` | Inline code in English list items; code with Arabic content stays ltr. |
| `41-code-block-in-english-text` | Code block between English paragraphs: ltr. |
| `42-code-block-arabic-comment` | Code block with an Arabic comment: ltr by the code rule. |
| `43-code-block-no-language` | Code block without a language in Arabic text: ltr. |
| `44-persian` | Persian heading and paragraph: rtl. |
| `45-urdu` | Urdu heading and paragraph: rtl. |
| `46-persian-with-english` | Persian with English words, and English with a Persian word. |
| `47-punctuation-only` | Punctuation-only paragraph: none. |
| `48-digits-only` | Digits-only heading and paragraph: none. |
| `49-neutral-list` | List with only digits and punctuation: none. |
| `50-stream-arabic-then-english-words` | Stream: Arabic then English words appended, stays rtl. |
| `51-stream-english-then-arabic-sentence` | Stream: English then an Arabic sentence appended, stays ltr. |
| `52-stream-heading` | Stream of a heading: none, then rtl. |
| `53-stream-nested-list` | Stream of a nested list: English outer, Arabic child. |
| `54-stream-table` | Stream of a table: paragraph, then table, then cells. |
| `55-stream-code-fence-then-arabic` | Stream: code fence opened, closed, then an Arabic paragraph. |
| `56-stream-digits-then-arabic` | Stream: digits (none), then Arabic arrives (rtl). |
| `57-stream-blockquote` | Stream of a blockquote: none, then rtl. |
| `58-stream-url-then-arabic` | Stream: URL then Arabic, ltr at every step. |
| `59-stream-emoji-then-arabic` | Stream: emoji (none), then Arabic (rtl). |
| `60-strong-rtl-symbol-first` | Rial sign (U+FDFC) first: a strong RTL symbol that is not a letter, so rtl. |
| `61-arabic-question-mark-first` | Arabic question mark (U+061F) first, English after: rtl. |
| `62-chat-reply-arabic-steps-and-error` | Realistic Arabic chat reply: steps with commands, error in a code block, English last line. |
| `63-arabic-question-about-code` | Arabic question with inline code. |
| `64-arabic-explanation-then-code-block` | Arabic explanation, JavaScript block with an Arabic string, Arabic note. |
| `65-numbered-steps-arabic-english-commands` | Numbered Arabic steps with English commands in code. |
| `66-numbered-steps-english-arabic-notes` | Numbered English steps with Arabic notes. |
| `67-numbered-steps-command-first` | Steps starting with inline code then Arabic: code is ignored, so rtl. |
| `68-bullets-mixed-language-english-first` | Bullet list alternating languages, English first. |
| `69-bullets-mixed-language-arabic-first` | Bullet list alternating languages, Arabic first. |
| `70-table-digit-first-header` | Table with a digit first header: rtl from the first Arabic header, digit cells none. |
| `71-table-code-cells` | Table with code cells: code-only cell is none. |
| `72-blockquote-arabic-english-attribution` | Arabic blockquote with an English attribution paragraph. |
| `73-blockquote-english-arabic-attribution` | English blockquote with an Arabic attribution paragraph. |
| `74-emoji-check-then-arabic` | Check-mark emoji then Arabic: rtl. |
| `75-warning-emoji-then-english` | Warning emoji then English: ltr. |
| `76-quotes-and-brackets-at-start` | Quotation marks and brackets at the start are neutral. |
| `77-ellipsis-then-arabic` | Ellipsis at the start is neutral. |
| `78-arabic-with-bold-and-italic` | Arabic with bold and italic runs: rtl. |
| `79-english-with-bold-arabic-first-word` | Bold English word first, Arabic after: ltr. |
| `80-arabic-link-text-in-arabic` | Arabic link text at the start: rtl. |
| `81-arabic-link-text-in-english-sentence` | Arabic link text inside an English sentence: ltr. |
| `82-list-with-bold-and-links-arabic` | Arabic list items with bold labels and links. |
| `83-headings-with-inline-code` | Headings with inline code: code is ignored for the direction. |
| `84-loose-ordered-list-with-code-block` | Loose Arabic ordered list with a code block. |
| `85-english-list-with-arabic-code-comment` | English list item with an inline code span holding Arabic. |
| `86-stream-numbered-steps` | Stream: Arabic numbered steps with a command, then an English item. |
| `87-stream-bold-start` | Stream: bold marker typed before Arabic. |
| `88-stream-arabic-link` | Stream: Arabic link being typed. |
| `89-stream-table-mixed-headers` | Stream: table with an English first header. |
| `90-stream-blockquote-attribution` | Stream: Arabic blockquote gets an English attribution. |
| `91-stream-mixed-list-items` | Stream: bullet list gets Arabic and English items. |
| `92-stream-heading-with-code` | Stream: heading gets inline code, then Arabic. |
| `93-stream-arabic-then-code-fence` | Stream: Arabic paragraph then a code fence. |
| `94-stream-ordered-item-starting-with-code` | Stream: ordered item starting with code flips to rtl. |

## Notes

- Each case is a small, realistic Lebanese or Modern Arabic sentence with English tech words (AI, RAG, pgvector, Render).
- The reference packages markdown-it-bidi and rehype-github-dir set `dir="auto"` on h1, p, ul, ol, table and cells, but not on `li`, `pre` or `code`, and markdown-it-bidi leaves the first `th` without `dir`. The kit must add those.
- `expected_dir` was checked against the Unicode first-strong rule (Python `unicodedata`) and against the reference output with the `dir` attribute resolved the way a browser does. Differences are the cases above that name the kit's job.
