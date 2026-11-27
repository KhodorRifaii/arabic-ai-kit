# bidi-markdown-kit (local draft, not published)

Markdown to HTML with correct `dir` attributes for mixed Arabic and English text.

## Use

```js
import { render } from './src/index.js';
render('اسمي Khodor\n\n- item\n');
```

`render(markdown)` returns HTML where:

- `p`, `h1`-`h6`, `ul`, `ol`, `li`, `blockquote`, `table`, `th`, `td` get `dir="auto"` (the browser picks the direction from the first strong character).
- `pre` and `code` (block and inline) get `dir="ltr"`, so code never flips inside Arabic text.

It is a small markdown-it plugin (`src/index.js`, one dependency: `markdown-it`).

## Test

```
npm install
npm test
```

`test/run.js` renders every case in `fixtures/cases`, checks each block's `dir` attribute against `expected_attr`, the resolved direction against `expected_dir` (skipped for `none`), and that `expected_dir` agrees with the first-strong rule. The schema is in `fixtures/README.md`. The dev dependency `parse5` is used only by the tests.
