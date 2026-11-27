import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFragment } from 'parse5';
import { render } from '../src/index.js';
import { firstStrong } from '../src/bidi.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'cases');
const TAGS = {
  heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], paragraph: ['p'], list: ['ul', 'ol'],
  'list-item': ['li'], table: ['table'], 'table-cell': ['td', 'th'],
  blockquote: ['blockquote'], 'code-block': ['pre'], 'code-span': ['code'],
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

// Text that dir="auto" looks at: the HTML spec skips every descendant element that has its own dir.
const autoText = (n) => (n.childNodes ?? []).map((c) => {
  if (c.nodeName === '#text') return c.value;
  return c.tagName && attr(c, 'dir') ? '' : autoText(c);
}).join('');

// Text for the first-strong sanity check: all text except code, which is always ltr.
const textNoCode = (n) => (n.childNodes ?? []).map((c) => {
  if (c.nodeName === '#text') return c.value;
  return ['pre', 'code'].includes(c.tagName) ? '' : textNoCode(c);
}).join('');

// Direction a browser uses for this element, following the spec.
function effective(n) {
  const d = attr(n, 'dir');
  if (d === 'rtl' || d === 'ltr') return d;
  if (d === 'auto') { const f = firstStrong(autoText(n)); return f === 'none' ? 'ltr' : f; }
  const a = ancestors(n).find((p) => attr(p, 'dir'));
  return a ? effective(a) : 'ltr';
}

function find(els, b) {
  const c = els.filter((e) => TAGS[b.type].includes(e.tagName) && text(e).includes(b.match)
    && (b.type !== 'code-span' || !ancestors(e).some((p) => p.tagName === 'pre')));
  if (!c.length) return null;
  return ['list', 'table', 'blockquote'].includes(b.type) ? c[0] : c.reduce((a, e) => (text(e).length < text(a).length ? e : a));
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
      const isCode = b.type.startsWith('code'); // code is always ltr, not first-strong
      if (isCode && (b.expected_dir !== 'ltr' || b.expected_attr !== 'ltr')) errs.push(`${label}: code must have expected_dir ltr and expected_attr ltr`);
      if (b.type === 'code-block') {
        const inner = e.childNodes.find((n) => n.tagName === 'code');
        if (!inner) errs.push(`${label}: no inner code element`);
        else if (attr(inner, 'dir') !== 'ltr') errs.push(`${label}: inner code dir expected ltr, got ${attr(inner, 'dir') ?? 'none'}`);
      }
      if (!isCode && b.expected_dir !== firstStrong(textNoCode(e))) errs.push(`${label}: expected_dir ${b.expected_dir} disagrees with first-strong ${firstStrong(textNoCode(e))}`);
    }
  });
  if (errs.length) { fail++; console.log(`FAIL ${f}`); errs.forEach((x) => console.log('  ' + x)); } else { pass++; console.log(`ok   ${f}`); }
}
console.log(`\n${pass} passed, ${fail} failed, ${pass + fail} cases`);
process.exit(fail ? 1 : 0);
