import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFragment } from 'parse5';
import { render } from '../src/index.js';
import { elements, find, checkBlock } from './lib.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'cases');
let pass = 0, fail = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const errs = [];
  if (c.id + '.json' !== f) errs.push(`id ${c.id} does not match file name`);
  (c.chunks ?? [c]).forEach((s, i) => {
    const els = elements(parseFragment(render(s.markdown)));
    for (const b of s.blocks) {
      const label = `${c.chunks ? `chunk ${i} ` : ''}${b.type} "${b.match.slice(0, 20)}"`;
      const e = find(els, b);
      if (!e) { errs.push(`${label}: element not found`); continue; }
      errs.push(...checkBlock(e, b, label));
    }
  });
  if (errs.length) { fail++; console.log(`FAIL ${f}`); errs.forEach((x) => console.log('  ' + x)); } else { pass++; console.log(`ok   ${f}`); }
}
console.log(`\n${pass} passed, ${fail} failed, ${pass + fail} cases`);
process.exit(fail ? 1 : 0);
