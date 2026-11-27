---
name: arabic-ai-kit
description: Make mixed Arabic and English text display in the right direction. Use when rendering chat or LLM output that mixes Arabic (or Hebrew, Persian, Urdu) with English, when converting Markdown to HTML with correct dir attributes, when lists, tables, blockquotes or code flip direction wrongly, or when streaming chat text that changes direction as it grows.
---

# arabic-ai-kit

Markdown to HTML with the right `dir` attribute on every block, for text that mixes right-to-left scripts (Arabic, Hebrew, Persian, Urdu) with left-to-right text (English, Cyrillic and so on).

## When to use it

- A chat UI or web page shows LLM answers that mix Arabic and English, and bullets, numbers, tables or quotes land on the wrong side.
- Code, commands or URLs inside Arabic text get reordered or flipped.
- Text is streamed token by token and the direction must be right at every step, including the first few characters.
- You need test cases for any renderer's bidi handling (the fixtures are plain JSON and work with any renderer).

Not covered: terminal output (no terminal adapter yet) and anything that is not HTML.

## The rule

The first character with a strong bidi class decides the direction of a block: Arabic and Hebrew letters (and strong RTL symbols such as the Arabic question mark) give `rtl`, other letters give `ltr`. Digits, punctuation, spaces and emoji are skipped. A block with no strong character has no direction of its own, so it gets `dir="auto"`.

## How to call it

The adapter is a small markdown-it plugin. One runtime dependency: `markdown-it`.

```js
import { render } from './src/index.js';

const html = render('اسمي Omar\n\n- عنصر أول\n- item two\n');
```

What `render(markdown)` emits:

- `p`, `h1` to `h6`, `th`, `td`: `dir="auto"`.
- `ul`, `ol`, `li`, `blockquote`, `table`: a fixed `dir="rtl"` or `dir="ltr"` taken from the first strong character of their own first text, or `auto` when there is none. A fixed value is needed because `dir="auto"` ignores any descendant that has its own `dir`, so an `auto` container whose children all have `dir` would always compute ltr.
- A list item with no strong text of its own that only holds a nested list takes the enclosing list's direction.
- `pre` and `code` (blocks and inline): `dir="ltr"`, always, even inside Arabic text.

For streaming, call `render` on the full text so far at every step. Rendering is fast (about 100 ms for a 2 MB document), and the direction recomputes as new characters arrive.

## How to test

```
npm install
npm test            # fixtures: 103 cases, about 0.1 s
npm run test:big    # generated documents up to 10,000 blocks, long streams, timing
```

`npm test` renders every case in `fixtures/cases` and checks the `dir` attribute and the direction a browser would compute. `npm run test:big` builds large documents in memory from fixed seeds (nothing is written to disk), streams long messages in prefixes, and prints the render time. Time is reported, never a failure.

Optional real-browser check: `test/browser.mjs` renders every fixture block in Chromium and compares the computed direction. It needs Playwright, which is not a dependency (`npm i -D playwright`). Without it the script says so and exits with code 2.

## Fixture schema

Each file in `fixtures/cases` is one scenario with `id` (the file name), `description`, `partial` (true when the text is cut mid-stream), and either `markdown` or `chunks` (a list of `{ markdown, blocks }`, each markdown being the text so far). Every entry in `blocks` has `type` (heading, paragraph, list, list-item, blockquote, table, table-cell, code-block or code-span), `match` (a substring of the block's text), `expected_dir` (`rtl`, `ltr` or `none`, where `none` means no strong character and no direction assertion), and `expected_attr` (the `dir` value the adapter must emit: `auto`, `rtl` or `ltr`). Optional `pick` (`outermost` or `innermost`) chooses between nested blocks with the same text, and `note` explains the case. `fixtures/README.md` has the full schema and the table of all cases.

## Known limits

- No terminal adapter. Terminals handle bidi differently and are out of scope here.
- The browser check is optional and not part of `npm test`.
- Direction detection follows the first-strong rule only. It does not implement the full Unicode bidi algorithm, so unusual mixes (for example an embedded RTL run inside an LTR block) are left to the browser.
- Markdown flavor is whatever markdown-it supports by default (CommonMark plus tables). Raw HTML in the input is not rewritten.
