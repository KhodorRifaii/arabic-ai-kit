import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFragment } from 'parse5';
import { render } from '../src/index.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'cases');
const TAGS = {
  heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], paragraph: ['p'], list: ['ul', 'ol'],
  'list-item': ['li'], table: ['table'], 'table-cell': ['td', 'th'],
  'code-block': ['pre'], 'code-span': ['code'],
};
const RTL = /[֐-ࣿיִ-﷿ﹰ-﻿]/u;

// First strong character: Arabic/Hebrew ranges are rtl, any other letter is ltr.
const firstStrong = (t) => {
  for (const ch of t) {
    if (RTL.test(ch)) return 'rtl';
    if (/\p{L}/u.test(ch)) return 'ltr';
  }
  return 'none';
};

function elements(node, parent = null, out = []) {
  for (const c of node.childNodes ?? []) {
    if (c.tagName) { c.up = parent; out.push(c); elements(c, c, out); }
  }
  return out;
}
const text = (n) => (n.childNodes ?? []).map((c) => (c.nodeName === '#text' ? c.value : text(c))).join('');
const attr = (n, k) => n.attrs.find((a) => a.name === k)?.value;
const ancestors = (n) => { const r = []; for (let p = n.up; p; p = p.up) r.push(p); return r; };

// Direction a browser would use for this element.
function effective(n) {
  const d = attr(n, 'dir');
  if (d === 'rtl' || d === 'ltr') return d;
  if (d === 'auto') { const f = firstStrong(text(n)); return f === 'none' ? 'ltr' : f; }
  const a = ancestors(n).find((p) => attr(p, 'dir'));
  return a ? effective(a) : 'ltr';
}

function find(els, b) {
  const c = els.filter((e) => TAGS[b.type].includes(e.tagName) && text(e).includes(b.match)
    && (b.type !== 'code-span' || !ancestors(e).some((p) => p.tagName === 'pre')));
  if (!c.length) return null;
  return ['list', 'table'].includes(b.type) ? c[0] : c.reduce((a, e) => (text(e).length < text(a).length ? e : a));
}

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
      if (attr(e, 'dir') !== b.expected_attr) errs.push(`${label}: dir attr expected ${b.expected_attr}, got ${attr(e, 'dir') ?? 'none'}`);
      if (b.expected_dir !== 'none' && effective(e) !== b.expected_dir) errs.push(`${label}: direction expected ${b.expected_dir}, got ${effective(e)}`);
      if (b.expected_dir !== firstStrong(text(e))) errs.push(`${label}: expected_dir ${b.expected_dir} disagrees with first-strong ${firstStrong(text(e))}`);
    }
  });
  if (errs.length) { fail++; console.log(`FAIL ${f}`); errs.forEach((x) => console.log('  ' + x)); } else { pass++; console.log(`ok   ${f}`); }
}
console.log(`\n${pass} passed, ${fail} failed, ${pass + fail} cases`);
process.exit(fail ? 1 : 0);
