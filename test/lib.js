// Shared helpers for the fixture runner (run.js) and the volume tests (big.js).
import { firstStrong } from '../src/bidi.js';

export { firstStrong };

export const TAGS = {
  heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], paragraph: ['p'], list: ['ul', 'ol'],
  'list-item': ['li'], table: ['table'], 'table-cell': ['td', 'th'],
  blockquote: ['blockquote'], 'code-block': ['pre'], 'code-span': ['code'],
};

/** All elements of a parse5 fragment, in document order, with `.up` set to the parent element. */
export function elements(node, parent = null, out = []) {
  for (const c of node.childNodes ?? []) {
    if (c.tagName) { c.up = parent; out.push(c); elements(c, c, out); }
  }
  return out;
}
export const text = (n) => (n.childNodes ?? []).map((c) => (c.nodeName === '#text' ? c.value : text(c))).join('');
export const attr = (n, k) => n.attrs.find((a) => a.name === k)?.value;
export const ancestors = (n) => { const r = []; for (let p = n.up; p; p = p.up) r.push(p); return r; };

// Text that dir="auto" looks at: the HTML spec skips every descendant element that has its own dir.
export const autoText = (n) => (n.childNodes ?? []).map((c) => {
  if (c.nodeName === '#text') return c.value;
  return c.tagName && attr(c, 'dir') ? '' : autoText(c);
}).join('');

// Text for the first-strong sanity check: all text except code, which is always ltr.
export const textNoCode = (n) => (n.childNodes ?? []).map((c) => {
  if (c.nodeName === '#text') return c.value;
  return ['pre', 'code'].includes(c.tagName) ? '' : textNoCode(c);
}).join('');

// A list item's own text: no code, no nested lists (mirrors the adapter's containerDir).
export const ownText = (n) => (n.childNodes ?? []).map((c) => {
  if (c.nodeName === '#text') return c.value;
  return ['ul', 'ol', 'pre', 'code'].includes(c.tagName) ? '' : ownText(c);
}).join('');

const hasNestedList = (n) => (n.childNodes ?? []).some((c) => ['ul', 'ol'].includes(c.tagName) || hasNestedList(c));

/**
 * Direction an li must have by the rule: its own text decides; with no strong character of its own
 * and a nested list inside, it takes the enclosing list's direction; otherwise none.
 */
export function expectedItemDir(li) {
  const own = firstStrong(ownText(li));
  if (own !== 'none') return own;
  if (hasNestedList(li) && li.up && ['ul', 'ol'].includes(li.up.tagName)) return firstStrong(textNoCode(li.up));
  return 'none';
}

// Direction a browser uses for this element, following the spec.
export function effective(n) {
  const d = attr(n, 'dir');
  if (d === 'rtl' || d === 'ltr') return d;
  if (d === 'auto') { const f = firstStrong(autoText(n)); return f === 'none' ? 'ltr' : f; }
  const a = ancestors(n).find((p) => attr(p, 'dir'));
  return a ? effective(a) : 'ltr';
}

/** Finds the element for a fixture block by type and a text substring. */
export function find(els, b) {
  const c = els.filter((e) => TAGS[b.type].includes(e.tagName) && text(e).includes(b.match)
    && (b.type !== 'code-span' || !ancestors(e).some((p) => p.tagName === 'pre')));
  if (!c.length) return null;
  const smallest = () => c.reduce((a, e) => (text(e).length < text(a).length ? e : a));
  if (b.pick === 'outermost') return c[0]; // first in document order contains the others
  if (b.pick === 'innermost') return smallest();
  return ['list', 'table', 'blockquote'].includes(b.type) ? c[0] : smallest();
}

/** Checks one block's element against expected_dir / expected_attr. Returns a list of error strings. */
export function checkBlock(e, b, label) {
  const errs = [];
  if (attr(e, 'dir') !== b.expected_attr) errs.push(`${label}: dir attr expected ${b.expected_attr}, got ${attr(e, 'dir') ?? 'none'}`);
  if (b.expected_dir !== 'none' && effective(e) !== b.expected_dir) errs.push(`${label}: direction expected ${b.expected_dir}, got ${effective(e)}`);
  const isCode = b.type.startsWith('code'); // code is always ltr, not first-strong
  if (isCode && (b.expected_dir !== 'ltr' || b.expected_attr !== 'ltr')) errs.push(`${label}: code must have expected_dir ltr and expected_attr ltr`);
  if (b.type === 'code-block') {
    const inner = e.childNodes.find((n) => n.tagName === 'code');
    if (!inner) errs.push(`${label}: no inner code element`);
    else if (attr(inner, 'dir') !== 'ltr') errs.push(`${label}: inner code dir expected ltr, got ${attr(inner, 'dir') ?? 'none'}`);
  }
  if (b.type === 'list-item') {
    const want = expectedItemDir(e);
    if (b.expected_dir !== want) errs.push(`${label}: expected_dir ${b.expected_dir} disagrees with the list-item rule (${want})`);
  } else if (!isCode && b.expected_dir !== firstStrong(textNoCode(e))) errs.push(`${label}: expected_dir ${b.expected_dir} disagrees with first-strong ${firstStrong(textNoCode(e))}`);
  return errs;
}
