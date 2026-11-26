// Shared drawing helpers for lesson figures (SVG strings). A course's figures
// live in figures/<course>.js and import these. Original header: diagrams for lesson text, as SVG strings. They are drawn with CSS variables
// (--k0.. cluster colors, --ink, --muted, --line, --surface), so they follow
// the light and dark themes without redrawing. A lesson places one with
// [[figure:name|Caption]]; the name must be a key of `figures`.

// Each figure gets its own arrow-marker id, since ids are document-wide.
let figureCount = 0;
export const svg = (w, h, body) => {
  const id = `arr${++figureCount}`;
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" class="fig-svg" focusable="false"><defs>
<marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1l9 4-9 4z" fill="var(--muted)"/></marker></defs>${body.replaceAll('url(#arr)', `url(#${id})`)}</svg>`;
};

export const dot = (x, y, c, r = 6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
export const ring = (x, y, c, r = 6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--surface)" stroke="${c}" stroke-width="2.5"/>`;
export const cross = (x, y, c = 'var(--muted)') => `<path d="M${x - 5} ${y - 5}l10 10M${x - 5} ${y + 5}l10-10" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`;
export const diamond = (x, y, c, r = 9) => `<path d="M${x} ${y - r}l${r} ${r}-${r} ${r}-${r}-${r}z" fill="${c}" stroke="var(--ink)" stroke-width="2"/>`;
export const text = (x, y, t, o = {}) => `<text x="${x}" y="${y}" text-anchor="${o.anchor ?? 'middle'}" font-size="${o.size ?? 13}" font-weight="${o.weight ?? 500}" fill="${o.fill ?? 'var(--muted)'}">${t}</text>`;
export const line = (x1, y1, x2, y2, o = {}) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${o.c ?? 'var(--line)'}" stroke-width="${o.w ?? 2}" ${o.dash ? `stroke-dasharray="${o.dash}"` : ''} ${o.arrow ? 'marker-end="url(#arr)"' : ''} stroke-linecap="round" fill="none"/>`;
export const box = (x, y, w, h, fill = 'var(--surface)', stroke = 'var(--line)') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="1.6"/>`;
export const k = i => `var(--k${i})`;
// A light tint of a cluster color for filled boxes (the tint follows the theme).
export const soft = i => `color-mix(in srgb, var(--k${i}) 16%, var(--surface))`;

// Language helpers for figure text: tr('Straight line', 'Garis lurus'), fmt(3.5). Figures are built when
// they are drawn, so the current language applies.
export { tr, fmt, pct } from '../i18n.js';
