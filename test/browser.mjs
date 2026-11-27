// Real-browser check (dev only, not part of `npm test`).
// Renders every fixture block in Chromium and compares the computed `direction` with
// expected_dir (skipped for "none"). Needs Playwright in node_modules; it is not a dependency
// of this project, so install it yourself if you want to run this:  npm i -D playwright
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../src/index.js';

const casesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'cases');

/** One job per chunk (or per case): the rendered HTML and the blocks to check. */
export function buildJobs() {
  const jobs = [];
  for (const f of fs.readdirSync(casesDir).filter((x) => x.endsWith('.json')).sort()) {
    const c = JSON.parse(fs.readFileSync(path.join(casesDir, f), 'utf8'));
    (c.chunks ?? [c]).forEach((s, i) => jobs.push({ file: f, step: i, html: render(s.markdown), blocks: s.blocks }));
  }
  return jobs;
}

/** Runs inside the page: returns a list of failures for the given jobs. */
export function pageCheck(jobs) {
  const TAGS = {
    heading: ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'], paragraph: ['P'], list: ['UL', 'OL'], 'list-item': ['LI'],
    table: ['TABLE'], 'table-cell': ['TD', 'TH'], blockquote: ['BLOCKQUOTE'], 'code-block': ['PRE'], 'code-span': ['CODE'],
  };
  const out = [];
  const box = document.createElement('div');
  document.body.appendChild(box);
  for (const j of jobs) {
    box.innerHTML = j.html;
    for (const b of j.blocks) {
      let c = [...box.querySelectorAll('*')].filter((e) => TAGS[b.type].includes(e.tagName)
        && e.textContent.includes(b.match) && (b.type !== 'code-span' || !e.closest('pre')));
      const smallest = () => c.reduce((a, x) => (!a || x.textContent.length < a.textContent.length ? x : a), null);
      const e = b.pick === 'outermost' ? c[0] : b.pick === 'innermost' ? smallest()
        : ['list', 'table', 'blockquote'].includes(b.type) ? c[0] : smallest();
      const label = `${j.file}[${j.step}] ${b.type} "${b.match.slice(0, 20)}"`;
      if (!e) { out.push(`${label}: element not found`); continue; }
      const got = getComputedStyle(e).direction;
      if (b.expected_dir !== 'none' && got !== b.expected_dir) out.push(`${label}: expected ${b.expected_dir}, browser computed ${got}`);
    }
  }
  return out;
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.error('Playwright is not installed in node_modules, so the browser check cannot run here.');
    process.exit(2);
  }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<!doctype html><meta charset="utf-8"><body></body>');
  const jobs = buildJobs();
  const failures = await page.evaluate(pageCheck, jobs);
  await browser.close();
  const blocks = jobs.reduce((n, j) => n + j.blocks.length, 0);
  failures.forEach((x) => console.log('FAIL ' + x));
  console.log(`\n${blocks - failures.length} of ${blocks} blocks match in Chromium, ${failures.length} failed`);
  process.exit(failures.length ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
