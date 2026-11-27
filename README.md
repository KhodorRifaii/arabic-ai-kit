# bidi-markdown-kit (local draft, not published)

Markdown to HTML with correct `dir` attributes for mixed Arabic and English text.

## Use

```js
import { render } from './src/index.js';
render('اسمي Omar\n\n- item\n');
```

`render(markdown)` returns HTML where:

- `p`, `h1`-`h6`, `th`, `td` get `dir="auto"` (the browser picks the direction from the first strong character).
- `ul`, `ol`, `li`, `blockquote` and `table` get a fixed `dir="rtl"` or `dir="ltr"` from the first strong character of their first text (for an `li`, its own text, including the paragraph inside a loose item; `auto` when there is none). `dir="auto"` would not work on them: it skips descendants that have their own `dir`, and every `li`, `p`, `td` and `th` does, so the container would always fall back to ltr. The same happens to an `li` in a loose list, whose text sits inside a `p`.
- `pre` and `code` (block and inline) get `dir="ltr"`, so code never flips inside Arabic text.

It is a small markdown-it plugin (`src/index.js`, one dependency: `markdown-it`).

## Test

```
npm install
npm test
```

`test/run.js` renders every case in `fixtures/cases`, checks each block's `dir` attribute against `expected_attr`, the resolved direction (computed as the HTML spec does: `auto` ignores descendants that have their own `dir`) against `expected_dir` (skipped for `none`), and that `expected_dir` agrees with the first-strong rule. The schema is in `fixtures/README.md`. The dev dependency `parse5` is used only by the tests.

`test/browser.mjs` is an optional real-browser check: it renders every block in Chromium and compares the computed `direction` with `expected_dir`. It needs Playwright (`npm i -D playwright`), which is not a dependency of this project; without it the script says so and exits with code 2. It is not part of `npm test`.

`npm run test:big` runs the volume tests (`test/big.js`, not part of `npm test`): three generated documents of 500, 1000 and 2000 blocks (Arabic, Persian, Hebrew, English and Russian text with lists, nested lists, tables, quotes, code, inline code, bold, links, emoji and neutral-only blocks), long messages streamed in 20-character prefixes, and a timing report for the largest document. The documents are built in memory by `test/generate.js` from fixed seeds, so nothing is written to disk and every run is identical. Each generated block carries a unique marker and a known `expected_dir` and `expected_attr`, checked with the same rules as `npm test`. Timing is printed, never a failure.
