// Renders the markdown subset lesson bodies use into DOM nodes:
//   ## / ### headings, - and 1. lists, > callouts, | tables |, ``` code fences,
//   paragraphs, **bold**, *italic* and `code`.
// Callouts may start with "Key idea:", "Watch out:", "Worked example:" or
// "Try it:" (or their Indonesian equivalents, see CALLOUTS) to pick a style; the label keeps its colon. A paragraph that is one italic sentence becomes a
// section lead. Containers, closed by a line of ":::":
//   ::: intro            the lesson overview card
//   ::: deeper Title     a collapsed "Go deeper" section
//   ::: remember         the takeaways box
// and [[figure:name|Caption]] places a diagram from figures.js.
// Text only ever goes through textContent; figures come from our own registry
// by name, so lesson content cannot inject markup. The registry is passed in
// (renderMarkdown(source, figures)): the app loads figures/common.js plus the
// course's own figures/<course>.js.

// Callout labels as authors write them, English and Indonesian, mapped to a style.
import { tr } from './i18n.js';

const CALLOUTS = {
  'key idea': 'key', 'watch out': 'warn', 'worked example': 'example', 'try it': 'try', note: 'key',
  'gagasan kunci': 'key', 'poin penting': 'key', intinya: 'key', awas: 'warn', 'hati-hati': 'warn', perhatian: 'warn', peringatan: 'warn', 'contoh kasus': 'example', 'contoh hitungan': 'example', 'coba sendiri': 'try', catatan: 'key',
};

function inline(parent, text) {
  for (const part of text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/)) {
    if (!part) continue;
    let node;
    if (part.startsWith('**')) { node = document.createElement('strong'); node.textContent = part.slice(2, -2); }
    else if (part.startsWith('*')) { node = document.createElement('em'); node.textContent = part.slice(1, -1); }
    else if (part.startsWith('`')) { node = document.createElement('code'); node.textContent = part.slice(1, -1); }
    else node = document.createTextNode(part);
    parent.append(node);
  }
}

const cells = row => row.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

// A coordinate pair such as "(1, 2)" must not break across two lines inside a table cell.
const PAIR = /^\(\s*-?[\d.,]+\s*,\s*-?[\d.,]+\s*\)$/;
export const keepPairTogether = text => (PAIR.test(text) ? text.replace(/,\s*/, ',\u00a0') : text);

// The alternative text of a diagram: the words drawn in it, in reading order, without repeats. Taken from the
// drawing itself, so it adds to the visible caption instead of saying the caption twice.
export function figureAlt(texts, max = 600) {
  const out = [];
  let size = 0;
  for (const raw of texts) {
    const t = String(raw).replace(/\s+/g, ' ').trim();
    if (!t || out.includes(t)) continue;
    if (size + t.length > max) break;
    out.push(t);
    size += t.length + 2;
  }
  return out.join('; ');
}

// A box that scrolls sideways when its content is wider than it is. While it does scroll it is
// reachable by keyboard (focusable, with a role and a name), says so with an edge shade on the side that
// has more (the shell's data-more), and keeps the left and right arrow keys for itself instead of
// turning the lesson's section.
function scrollRegion(shell, scroller, label) {
  const update = () => {
    const room = scroller.scrollWidth - scroller.clientWidth;
    const scrolls = room > 1;
    shell.toggleAttribute('data-scrolls', scrolls);
    shell.dataset.more = !scrolls ? '' : scroller.scrollLeft <= 1 ? 'right' : scroller.scrollLeft >= room - 1 ? 'left' : 'both';
    if (scrolls) {
      scroller.tabIndex = 0;
      scroller.setAttribute('role', 'region');
      scroller.setAttribute('aria-label', label);
    } else {
      scroller.removeAttribute('tabindex');
      scroller.removeAttribute('role');
      scroller.removeAttribute('aria-label');
    }
  };
  scroller.addEventListener('scroll', update, { passive: true });
  scroller.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.stopPropagation(); });
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(update);
    ro.observe(scroller);
    if (scroller.firstElementChild) ro.observe(scroller.firstElementChild);
  }
}

function table(lines) {
  const shell = document.createElement('div');
  shell.className = 'scroll-shell';
  const wrap = document.createElement('div');
  wrap.className = 'table-scroll';
  const t = document.createElement('table');
  const head = cells(lines[0]);
  const thead = t.createTHead().insertRow();
  head.forEach(h => { const th = document.createElement('th'); th.scope = 'col'; inline(th, h); thead.append(th); });
  const body = t.createTBody();
  for (const line of lines.slice(2)) {
    const row = body.insertRow();
    cells(line).forEach(c => { const td = row.insertCell(); inline(td, keepPairTogether(c)); });
  }
  wrap.append(t);
  shell.append(wrap);
  scrollRegion(shell, wrap, tr('Table, scrolls sideways', 'Tabel, bisa digeser ke samping'));
  return shell;
}

function figure(figures, name, caption) {
  const make = figures[name];
  if (!make) return null;
  const fig = document.createElement('figure');
  fig.className = 'figure';
  const holder = document.createElement('div');
  holder.className = 'figure-art';
  holder.innerHTML = make(); // trusted markup from figures.js, selected by name only
  const svg = holder.querySelector('svg');
  if (svg) {
    // The label is what the drawing says; the caption below it is read once, as the figure's caption.
    const alt = figureAlt([...svg.querySelectorAll('text')].map(n => n.textContent));
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', alt || caption);
    // On a phone the drawing keeps (about) its own size and scrolls, so its text stays readable.
    const width = Number(svg.viewBox?.baseVal?.width);
    if (width > 0) svg.style.setProperty('--fig-w', String(width));
  }
  const cap = document.createElement('figcaption');
  inline(cap, caption);
  const shell = document.createElement('div');
  shell.className = 'scroll-shell';
  shell.append(holder);
  const hint = document.createElement('p');
  hint.className = 'fig-hint';
  hint.setAttribute('aria-hidden', 'true');
  hint.textContent = tr('Swipe sideways to see the whole figure', 'Geser ke samping untuk melihat seluruh gambar');
  scrollRegion(shell, holder, tr('Figure, scrolls sideways', 'Gambar, bisa digeser ke samping'));
  fig.append(shell, hint, cap);
  return fig;
}

function container(kind, title, source, figures) {
  if (kind === 'deeper') {
    const d = document.createElement('details');
    d.className = 'deeper'; // collapsed by default
    const sum = document.createElement('summary');
    const tag = document.createElement('span');
    tag.className = 'deeper-tag';
    tag.textContent = tr('Go deeper', 'Lebih dalam');
    const label = document.createElement('span');
    label.textContent = title || tr('More detail', 'Detail tambahan');
    sum.append(tag, label);
    const body = document.createElement('div');
    body.className = 'deeper-body';
    body.append(renderMarkdown(source, figures));
    d.append(sum, body);
    return d;
  }
  const aside = document.createElement('aside');
  aside.className = kind === 'intro' ? 'intro-card' : 'remember';
  if (kind === 'intro') {
    // Not a heading: it comes before the lesson's first section heading, so it would skip a level.
    const title = tr('In this lesson', 'Di pelajaran ini');
    const label = document.createElement('p');
    label.className = 'card-title';
    label.setAttribute('aria-hidden', 'true');
    label.textContent = title;
    aside.setAttribute('aria-label', title);
    aside.append(label, renderMarkdown(source, figures));
    return aside;
  }
  const h = document.createElement('h3');
  h.textContent = tr('Remember', 'Ingat');
  aside.append(h, renderMarkdown(source, figures));
  return aside;
}

const isBlockStart = l => /^(#{2,3} |- |> |\d+\. |\||```|::: |\[\[figure:)/.test(l);

export function renderMarkdown(source, figures = {}) {
  const frag = document.createDocumentFragment();
  const lines = String(source).replace(/\r/g, '').split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const fig = /^\[\[figure:([a-z0-9-]+(?:\/[a-z0-9-]+)?)\|(.*)\]\]$/.exec(line.trim());
    if (fig) {
      const node = figure(figures, fig[1], fig[2]);
      if (node) frag.append(node);
      i++;
      continue;
    }
    const box = /^::: (intro|deeper|remember)\s*(.*)$/.exec(line);
    if (box) {
      const inner = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ':::') inner.push(lines[i++]);
      i++;
      frag.append(container(box[1], box[2], inner.join('\n'), figures));
      continue;
    }
    if (line.startsWith('```')) {
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      i++;
      const pre = document.createElement('pre');
      const c = document.createElement('code');
      c.textContent = code.join('\n');
      pre.append(c);
      frag.append(pre);
    } else if (/^#{2,3} /.test(line)) {
      const level = line.startsWith('### ') ? 'h3' : 'h2';
      const h = document.createElement(level);
      inline(h, line.replace(/^#{2,3} /, ''));
      frag.append(h);
      i++;
    } else if (line.startsWith('- ')) {
      const ul = document.createElement('ul');
      while (i < lines.length && lines[i].startsWith('- ')) { const li = document.createElement('li'); inline(li, lines[i++].slice(2)); ul.append(li); }
      frag.append(ul);
    } else if (/^\d+\. /.test(line)) {
      const ol = document.createElement('ol');
      while (i < lines.length && /^\d+\. /.test(lines[i])) { const li = document.createElement('li'); inline(li, lines[i++].replace(/^\d+\. /, '')); ol.append(li); }
      frag.append(ol);
    } else if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      if (rows.length >= 2) frag.append(table(rows));
    } else if (line.startsWith('> ')) {
      const text = [];
      while (i < lines.length && lines[i].startsWith('> ')) text.push(lines[i++].slice(2));
      const joined = text.join(' ');
      const m = /^([A-Za-z][A-Za-z -]*):\s*(.*)$/.exec(joined);
      const kind = m && CALLOUTS[m[1].toLowerCase()];
      const aside = document.createElement('aside');
      aside.className = `callout ${kind ?? 'key'}`;
      if (kind) {
        const label = document.createElement('strong');
        label.className = 'callout-label';
        label.textContent = `${m[1]}:`;
        aside.append(label, ' ');
        inline(aside, m[2]);
      } else inline(aside, joined);
      frag.append(aside);
    } else {
      const text = [];
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) text.push(lines[i++]);
      const p = document.createElement('p');
      const joined = text.join(' ');
      if (/^\*[^*]+\*$/.test(joined)) p.className = 'lead';
      inline(p, joined);
      frag.append(p);
    }
  }
  return frag;
}
