import MarkdownIt from 'markdown-it';

// Block tokens that get dir="auto": the browser picks the direction from the
// first strong character of each element.
const AUTO = new Set([
  'paragraph_open', 'heading_open', 'bullet_list_open', 'ordered_list_open',
  'list_item_open', 'blockquote_open', 'table_open', 'th_open', 'td_open',
]);

const esc = (s) => MarkdownIt().utils.escapeHtml(s);

function bidiPlugin(md) {
  md.core.ruler.push('bidi_dir', (state) => {
    for (const t of state.tokens) if (AUTO.has(t.type)) t.attrSet('dir', 'auto');
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
