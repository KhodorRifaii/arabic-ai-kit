import MarkdownIt from 'markdown-it';
import { firstStrong } from './bidi.js';

// Elements that get dir="auto": the browser picks the direction from the first strong
// character of each one.
const AUTO = new Set(['paragraph_open', 'heading_open', 'th_open', 'td_open']);

// Containers need a fixed direction. dir="auto" skips every descendant that has its own dir,
// and every p, td and th does (and every li in a list), so an auto container, or a list item
// whose text sits in a paragraph (loose list), would always fall back to ltr.
const CONTAINERS = new Set([
  'bullet_list_open', 'ordered_list_open', 'blockquote_open', 'table_open', 'list_item_open',
]);
const LIST_OPEN = new Set(['bullet_list_open', 'ordered_list_open']);

const esc = (s) => MarkdownIt().utils.escapeHtml(s);

// First strong direction in the container's text (first item, first cell, first paragraph).
// For a list item, only the item's own text counts (nested lists get their own direction).
// Code is skipped because it is always ltr and does not decide the direction.
function containerDir(tokens, start) {
  const open = tokens[start];
  for (let i = start + 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === open.type.replace('_open', '_close') && t.level === open.level) break;
    if (open.type === 'list_item_open' && LIST_OPEN.has(t.type)) {
      while (!(tokens[i].type === t.type.replace('_open', '_close') && tokens[i].level === t.level)) i++;
      continue;
    }
    if (t.type !== 'inline') continue;
    for (const c of t.children) {
      if (c.type === 'text') {
        const d = firstStrong(c.content);
        if (d !== 'none') return d;
      }
    }
  }
  return 'auto';
}

function bidiPlugin(md) {
  md.core.ruler.push('bidi_dir', (state) => {
    state.tokens.forEach((t, i) => {
      if (AUTO.has(t.type)) t.attrSet('dir', 'auto');
      else if (CONTAINERS.has(t.type)) t.attrSet('dir', containerDir(state.tokens, i));
    });
  });

  // Code is always left to right, whatever surrounds it.
  const fence = (tokens, i) => {
    const t = tokens[i];
    const lang = t.type === 'fence' ? t.info.trim().split(/\s+/)[0] : '';
    const cls = lang ? ` class="language-${esc(lang)}"` : '';
    return `<pre dir="ltr"><code dir="ltr"${cls}>${esc(t.content)}</code></pre>\n`;
  };
  md.renderer.rules.fence = fence;
  md.renderer.rules.code_block = fence;
  md.renderer.rules.code_inline = (tokens, i) =>
    `<code dir="ltr">${esc(tokens[i].content)}</code>`;
}

const md = new MarkdownIt().use(bidiPlugin);

/** Render Markdown to HTML with dir attributes on every block. */
export function render(markdown) {
  return md.render(markdown);
}
