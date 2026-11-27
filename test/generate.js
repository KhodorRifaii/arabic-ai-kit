// Deterministic generator of large Markdown documents with known expectations.
// Everything is built in memory from a fixed seed; nothing is written to disk.
// Every checked block ends with a unique 6-digit marker so the test can find it fast.

export function rng(seed) {
  let a = seed >>> 0; // mulberry32
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = {
  rtl: {
    ar: ['مرحبا', 'الملفات', 'نص', 'تجربة', 'المشروع', 'البيانات', 'الخادم', 'سريع', 'بسيط', 'التحقق', 'النتيجة', 'الذكاء', 'الاصطناعي'],
    fa: ['سلام', 'دنیا', 'من', 'هوش', 'مصنوعی', 'کار', 'پروژه', 'سرور'],
    he: ['שלום', 'עולם', 'אני', 'מפתח', 'פרויקט', 'בדיקה'],
  },
  ltr: {
    en: ['Hello', 'project', 'server', 'fast', 'simple', 'check', 'result', 'data', 'files', 'model'],
    ru: ['Привет', 'мир', 'проект', 'сервер', 'быстро', 'данные'],
  },
};
const NEUTRAL_ONLY = ['12 / 34', '?! ... ,,', '🙂🎉 56', '(78)', '3.14 %', '2026 / 11 / 27'];
const PREFIXES = ['', '', '', '2026 ', '🙂 ', '(', '«', '... ', '`cmd` '];
const ENGLISH_INSIDE = ['AI', 'RAG', 'pgvector', 'Render', 'LangChain', 'API'];

export function generateDocument(seed, blockCount) {
  const rand = rng(seed);
  const pick = (a) => a[Math.floor(rand() * a.length)];
  let marker = 100000;
  const next = () => String(++marker);
  const blocks = []; // { md, checks: [{type, match, expected_dir, expected_attr}] }
  let prevKind = '';

  const attrFor = (type, dir) => {
    if (type === 'code-block') return 'ltr';
    if (['list', 'list-item', 'blockquote', 'table'].includes(type)) return dir === 'none' ? 'auto' : dir;
    return 'auto';
  };
  const check = (type, match, dir) => ({ type, match, expected_dir: dir, expected_attr: attrFor(type, dir) });

  // One line of text in a chosen language (or neutral only), with its direction.
  function line(opts = {}) {
    const m = next();
    if (rand() < (opts.noneRate ?? 0.06)) return { md: `${pick(NEUTRAL_ONLY)} ${m}`, dir: 'none', m };
    const group = pick(['rtl', 'rtl', 'ltr', 'ltr', 'rtl']);
    const lang = pick(Object.keys(WORDS[group]));
    const words = [];
    const n = 3 + Math.floor(rand() * 7);
    for (let i = 0; i < n; i++) words.push(pick(WORDS[group][lang]));
    if (group === 'rtl') { // inline extras after the first word, so the first strong character stays the same
      for (let i = 1; i < words.length; i++) {
        const r = rand();
        if (r < 0.12) words[i] = pick(ENGLISH_INSIDE);
        else if (r < 0.2) words[i] = `\`${pick(ENGLISH_INSIDE).toLowerCase()}()\``;
        else if (r < 0.26) words[i] = `**${words[i]}**`;
        else if (r < 0.32) words[i] = `*${words[i]}*`;
        else if (r < 0.37) words[i] = `[${words[i]}](https://example.com/${i})`;
        else if (r < 0.43) words[i] = String(Math.floor(rand() * 5000));
      }
    }
    let first = words[0];
    if (rand() < 0.1) first = `**${first}**`;
    const prefix = opts.noPrefix ? '' : pick(PREFIXES);
    return { md: `${prefix}${first} ${words.slice(1).join(' ')} ${m}`, dir: group, m };
  }

  const firstNonNone = (dirs) => dirs.find((d) => d !== 'none') ?? 'none';

  const gens = {
    paragraph() {
      const l = line();
      return { md: l.md, checks: [check('paragraph', l.m, l.dir)] };
    },
    heading() {
      const l = line();
      return { md: `${'#'.repeat(1 + Math.floor(rand() * 6))} ${l.md}`, checks: [check('heading', l.m, l.dir)] };
    },
    list(ordered) {
      const count = 2 + Math.floor(rand() * 5);
      const loose = rand() < 0.25;
      const items = [], checks = [], dirs = [];
      const bullet = ordered ? '1. ' : '- ';
      const indent = ' '.repeat(bullet.length);
      for (let i = 0; i < count; i++) {
        const l = line();
        let md = bullet + l.md;
        const innerChecks = [];
        if (l.dir !== 'none' && rand() < 0.2) { // a nested list under an item that has strong text
          const sub = [];
          const k = 1 + Math.floor(rand() * 2);
          const subDirs = [];
          for (let j = 0; j < k; j++) {
            const s = line();
            sub.push(`${indent}- ${s.md}`);
            subDirs.push(s.dir);
            innerChecks.push(check('list-item', s.m, s.dir));
          }
          md += (loose ? '\n\n' : '\n') + sub.join(loose ? '\n\n' : '\n');
          innerChecks.push(check('list', sub.length ? innerChecks[0].match : '', firstNonNone(subDirs)));
        }
        items.push(md);
        dirs.push(l.dir);
        checks.push(check('list-item', l.m, l.dir), ...innerChecks);
      }
      checks.unshift(check('list', checks[0].match, firstNonNone(dirs)));
      return { md: items.join(loose ? '\n\n' : '\n'), checks };
    },
    table() {
      const cols = 2 + Math.floor(rand() * 3), rows = 1 + Math.floor(rand() * 4);
      const cell = () => { const l = line({ noPrefix: true, noneRate: 0.12 }); return { ...l, md: l.md.replace(/\|/g, '/') }; };
      const header = Array.from({ length: cols }, cell);
      const body = Array.from({ length: rows }, () => Array.from({ length: cols }, cell));
      const md = [header, null, ...body].map((r) => (r ? `| ${r.map((c) => c.md).join(' | ')} |` : `|${'---|'.repeat(cols)}`)).join('\n');
      const all = [...header, ...body.flat()];
      const checks = [check('table', header[0].m, firstNonNone(all.map((c) => c.dir)))];
      all.forEach((c) => checks.push(check('table-cell', c.m, c.dir)));
      return { md, checks };
    },
    quote() {
      const count = 1 + Math.floor(rand() * 3);
      const ls = Array.from({ length: count }, () => line());
      return {
        md: ls.map((l) => `> ${l.md}`).join('\n>\n'),
        checks: [check('blockquote', ls[0].m, firstNonNone(ls.map((l) => l.dir))), ...ls.map((l) => check('paragraph', l.m, l.dir))],
      };
    },
    code() {
      const m = next();
      const lang = pick(['', 'js', 'python', 'bash']);
      const body = pick(['echo hello', '# مرحبا بالعالم', "print('x')", 'const اسم = 1;']);
      return { md: '```' + lang + '\n' + body + '\n# ' + m + '\n```', checks: [check('code-block', m, 'ltr')] };
    },
  };

  const plan = [['paragraph', 30], ['heading', 10], ['ul', 14], ['ol', 8], ['table', 10], ['quote', 10], ['code', 8]];
  const total = plan.reduce((s, [, w]) => s + w, 0);
  while (blocks.length < blockCount) {
    let r = rand() * total, kind = 'paragraph';
    for (const [k, w] of plan) { if (r < w) { kind = k; break; } r -= w; }
    // Adjacent lists or quotes of the same kind would merge into one block: use a paragraph instead.
    if (['ul', 'ol', 'quote'].includes(kind) && kind === prevKind) kind = 'paragraph';
    blocks.push(kind === 'ul' ? gens.list(false) : kind === 'ol' ? gens.list(true) : gens[kind]());
    prevKind = kind;
  }
  return {
    markdown: blocks.map((b) => b.md).join('\n\n') + '\n',
    checks: blocks.flatMap((b) => b.checks),
    blockCount: blocks.length,
  };
}
