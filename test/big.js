// Volume tests: large generated documents, long streams and a timing report.
// Run with `npm run test:big`. Everything is generated in memory from fixed seeds.
import { parseFragment } from 'parse5';
import { render } from '../src/index.js';
import { generateDocument } from './generate.js';
import { elements, text, attr, effective, firstStrong, textNoCode, autoText, checkBlock, TAGS } from './lib.js';

let failures = 0;
const fail = (msg) => { failures++; if (failures <= 40) console.log('  FAIL ' + msg); };

// ---- 1. Large generated documents -------------------------------------------------------
const MARKER = /\b\d{6}\b/g;
const SIZES = [[1, 500], [2, 1000], [3, 2000]]; // [seed, top-level blocks]
let largest = null;

for (const [seed, n] of SIZES) {
  const doc = generateDocument(seed, n);
  const html = render(doc.markdown);
  const els = elements(parseFragment(html));
  // Index elements by the markers they contain (text is computed once per element).
  const index = new Map();
  for (const e of els) {
    const t = text(e);
    e.len = t.length;
    for (const m of t.match(MARKER) ?? []) (index.get(m) ?? index.set(m, []).get(m)).push(e);
  }
  const before = failures;
  const mix = {};
  for (const b of doc.checks) mix[`${b.type}:${b.expected_dir}`] = (mix[`${b.type}:${b.expected_dir}`] ?? 0) + 1;
  if (seed === 3) console.log('  expectation mix (seed 3): ' + Object.entries(mix).sort().map(([k, v]) => `${k}=${v}`).join(' '));
  for (const b of doc.checks) {
    const c = (index.get(b.match) ?? []).filter((e) => TAGS[b.type].includes(e.tagName));
    if (!c.length) { fail(`seed ${seed} ${b.type} ${b.match}: element not found`); continue; }
    const e = c.reduce((a, x) => (x.len < a.len ? x : a));
    for (const err of checkBlock(e, b, `seed ${seed} ${b.type} ${b.match}`)) fail(err);
  }
  const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0);
  console.log(`${failures === before ? 'ok  ' : 'FAIL'} document seed ${seed}: ${doc.blockCount} blocks, ${doc.checks.length} checks, ${kb(doc.markdown)} KB markdown, ${kb(html)} KB html, ${els.length} elements`);
  largest = { doc, html };
}

// ---- 2. Long streams ---------------------------------------------------------------------
// One long message revealed every 20 characters. At every prefix:
//  a) the first paragraph's direction equals the first-strong rule on the prefix text, and
//  b) every block in the output has a dir attribute that agrees with its own text (rule-based).
const MESSAGES = {
  'arabic first': 'مرحبا! إليك شرحا طويلا عن بناء المساعدات الذكية باستخدام RAG و pgvector.\n\n'
    + '1. ثبّت الحزم باستخدام `npm install`\n2. شغّل الخادم: `npm run dev`\n3. Then open the browser\n\n'
    + '| الاسم | Role | الخبرة |\n|---|---|---|\n| عمر | Engineer | 3 |\n| Sara | مهندسة | 5 |\n\n'
    + '> العلم نور والجهل ظلام.\n>\n> — Einstein\n\n'
    + '```js\nconsole.log("مرحبا");\n```\n\n'
    + '- Apples\n- تفاح\n- Bananas\n  - موز صغير\n\n'
    + 'وفي النهاية نكتب **ملخصا** قصيرا مع [رابط](https://example.com) و *إضافة*.\n',
  'english first': 'Here is a long answer about building assistants with مرحبا and Arabic text.\n\n'
    + '- First item with `code`\n- عنصر عربي\n- Third item\n\n'
    + '## نظرة عامة\n\n'
    + '| Name | الاسم |\n|---|---|\n| Omar | عمر |\n\n'
    + '> Knowledge is power.\n>\n> — أينشتاين\n\n'
    + '1. `npm install` ثم انتظر\n2. Run the tests\n\n'
    + 'Done! شكرا لك.\n',
  'neutral first': '2026 ... 🙂 12 / 34 ?! وبعدها يبدأ النص العربي الطويل مع English words في المنتصف.\n\n'
    + '- 123\n- (456)\n- ثم عنصر عربي\n\n'
    + '```\nls -la\n```\n\n'
    + '12 - 34\n\n'
    + 'Finally English at the end.\n',
};

// Long messages: the first paragraph, then the body repeated until the message is several KB.
const REPEATS = 12;
for (const [k, v] of Object.entries(MESSAGES)) {
  const [head, ...rest] = v.split('\n\n');
  MESSAGES[k] = [head, ...Array.from({ length: REPEATS }, () => rest.join('\n\n'))].join('\n\n');
}

const STEP = 20;

// Own text of a list item: text outside nested lists and code (what the adapter uses).
function ownText(n) {
  return (n.childNodes ?? []).map((c) => {
    if (c.nodeName === '#text') return c.value;
    return ['ul', 'ol', 'pre', 'code'].includes(c.tagName) ? '' : ownText(c);
  }).join('');
}

function checkPrefix(name, prefix, len) {
  const els = elements(parseFragment(render(prefix)));
  const label = `stream "${name}" prefix ${len}`;
  const first = els.find((e) => e.tagName === 'p');
  const firstLine = prefix.split('\n\n')[0];
  if (first && els.indexOf(first) === 0) {
    const want = firstStrong(firstLine);
    const got = effective(first);
    if (want !== 'none' && got !== want) fail(`${label}: first paragraph expected ${want}, got ${got}`);
  }
  for (const e of els) {
    const d = attr(e, 'dir');
    const t = e.tagName;
    if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th'].includes(t)) {
      if (d !== 'auto') fail(`${label}: <${t}> dir expected auto, got ${d ?? 'none'}`);
    } else if (['ul', 'ol', 'blockquote', 'table'].includes(t)) {
      const s = firstStrong(textNoCode(e));
      if (d !== (s === 'none' ? 'auto' : s)) fail(`${label}: <${t}> dir expected ${s === 'none' ? 'auto' : s}, got ${d ?? 'none'}`);
    } else if (t === 'li') {
      const s = firstStrong(ownText(e));
      if (d !== (s === 'none' ? 'auto' : s)) fail(`${label}: <li> dir expected ${s === 'none' ? 'auto' : s}, got ${d ?? 'none'}`);
    } else if (t === 'pre') {
      const inner = e.childNodes.find((n) => n.tagName === 'code');
      if (d !== 'ltr' || attr(inner, 'dir') !== 'ltr') fail(`${label}: <pre>/<code> dir expected ltr`);
    }
  }
  return els.length;
}

for (const [name, msg] of Object.entries(MESSAGES)) {
  const before = failures;
  let prefixes = 0;
  for (let len = STEP; len < msg.length + STEP; len += STEP) {
    checkPrefix(name, msg.slice(0, Math.min(len, msg.length)), len);
    prefixes++;
  }
  console.log(`${failures === before ? 'ok  ' : 'FAIL'} stream "${name}": ${msg.length} chars, ${prefixes} prefixes (every ${STEP} chars)`);
}

// ---- 3. Timing (reported, never a failure) ----------------------------------------------
const { doc, html } = largest;
render(doc.markdown); // warm-up
const times = [];
for (let i = 0; i < 5; i++) { const t0 = performance.now(); render(doc.markdown); times.push(performance.now() - t0); }
times.sort((a, b) => a - b);
const median = times[2];
const mb = Buffer.byteLength(doc.markdown) / 1048576;
console.log(`\ntiming: render of the largest document (${doc.blockCount} blocks, ${(mb * 1024).toFixed(0)} KB markdown, ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB html): median ${median.toFixed(1)} ms of 5 runs (min ${times[0].toFixed(1)}, max ${times[4].toFixed(1)}), ${(mb / (median / 1000)).toFixed(1)} MB/s`);

console.log(failures ? `\n${failures} failures` : '\nall volume checks passed');
process.exit(failures ? 1 : 0);
