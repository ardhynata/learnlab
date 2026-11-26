// Figures for the lesson "Margins and support vectors". Every number in the lesson text and in these
// figures comes from the same eight toy points below (computed here, checked by hand in the lesson):
// the maximum-margin street is found as the shortest segment between the two classes' convex hulls,
// so the picture and the hand calculation cannot drift apart.
import { svg, dot, text, line, k, tr, fmt } from '../kit.js';

const ink = { weight: 700, fill: 'var(--ink)' };

const A = [[1, 1], [2, 1], [1, 2], [2, 2]];
const B = [[4, 4], [5, 4], [5, 5], [4, 6]];
const MAX = 7;

// Convex hull (monotone chain), counter-clockwise.
function hull(points) {
  const P = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const build = pts => {
    const h = [];
    for (const p of pts) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
      h.push(p);
    }
    h.pop();
    return h;
  };
  return build(P).concat(build(P.slice().reverse()));
}

// Closest point on segment ab to p, and the distance.
function toSegment(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  const q = [a[0] + t * dx, a[1] + t * dy];
  return { d: Math.hypot(p[0] - q[0], p[1] - q[1]), q };
}

// The maximum-margin street for two separable point sets. The widest street has the shortest segment
// between the two convex hulls as its width, and its boundary is the perpendicular bisector of that
// segment. Then w = 2 d / |d|^2 for d = q - p, so that w.x + b is -1 at p and +1 at q.
function street(neg, pos) {
  const hn = hull(neg), hp = hull(pos);
  let best = { d: Infinity };
  const consider = (p, other, flip) => {
    other.forEach((a, i) => {
      const r = toSegment(p, a, other[(i + 1) % other.length]);
      if (r.d < best.d) best = { d: r.d, p: flip ? r.q : p, q: flip ? p : r.q };
    });
  };
  hn.forEach(p => consider(p, hp, false));
  hp.forEach(q => consider(q, hn, true));
  const { p, q } = best;
  const dx = q[0] - p[0], dy = q[1] - p[1], n2 = dx * dx + dy * dy;
  const w = [2 * dx / n2, 2 * dy / n2];
  const b = -1 - (w[0] * p[0] + w[1] * p[1]);
  const onMargin = pt => Math.abs(Math.abs(w[0] * pt[0] + w[1] * pt[1] + b) - 1) < 1e-9;
  return { w, b, width: best.d, p, q, support: [...neg, ...pos].filter(onMargin) };
}

// Width of the street around ANY separating line w.x + b = 0: twice the distance to its nearest point.
function lineWidth(w, b, neg, pos) {
  const n = Math.hypot(w[0], w[1]);
  const all = [...neg.map(p => [p, -1]), ...pos.map(p => [p, 1])];
  return 2 * Math.min(...all.map(([p, s]) => s * (w[0] * p[0] + w[1] * p[1] + b) / n));
}

let clipCount = 0;
// One square plot of the 0..7 grid. Returns coordinate maps and a clip id for lines.
function frame(ox, oy, size) {
  const X = x => ox + x / MAX * size, Y = y => oy + size - y / MAX * size;
  const id = `margin-clip-${++clipCount}`;
  const clip = `<clipPath id="${id}"><rect x="${ox}" y="${oy}" width="${size}" height="${size}"/></clipPath>`;
  const grid = [0, 1, 2, 3, 4, 5, 6, 7].map(v => `${line(X(v), oy, X(v), oy + size, { w: 0.6 })}${line(ox, Y(v), ox + size, Y(v), { w: 0.6 })}`).join('');
  const box = `<rect x="${ox}" y="${oy}" width="${size}" height="${size}" rx="2" fill="none" stroke="var(--line)" stroke-width="1.6"/>`;
  return { X, Y, id, defs: clip, base: `${grid}${box}` };
}

// The line w.x + b = c, drawn far past the plot and clipped to it.
function wline(f, w, b, c, o = {}) {
  const n2 = w[0] * w[0] + w[1] * w[1];
  const x0 = [w[0] * (c - b) / n2, w[1] * (c - b) / n2], dir = [-w[1], w[0]];
  const a = [x0[0] - 30 * dir[0], x0[1] - 30 * dir[1]], e = [x0[0] + 30 * dir[0], x0[1] + 30 * dir[1]];
  return `<g clip-path="url(#${f.id})">${line(f.X(a[0]), f.Y(a[1]), f.X(e[0]), f.Y(e[1]), o)}</g>`;
}

// The shaded street between w.x + b = -1 and w.x + b = +1.
function strip(f, w, b) {
  const n2 = w[0] * w[0] + w[1] * w[1], dir = [-w[1], w[0]];
  const at = (c, t) => [w[0] * (c - b) / n2 + t * dir[0], w[1] * (c - b) / n2 + t * dir[1]];
  const pts = [at(-1, -30), at(-1, 30), at(1, 30), at(1, -30)].map(([x, y]) => `${f.X(x)},${f.Y(y)}`).join(' ');
  return `<g clip-path="url(#${f.id})"><polygon points="${pts}" fill="var(--accent-soft)" stroke="none"/></g>`;
}

const points = (f, neg, pos, r = 5.5) => `${neg.map(p => dot(f.X(p[0]), f.Y(p[1]), k(0), r)).join('')}${pos.map(p => dot(f.X(p[0]), f.Y(p[1]), k(1), r)).join('')}`;
const circled = (f, support) => support.map(p => `<circle cx="${f.X(p[0])}" cy="${f.Y(p[1])}" r="10.5" fill="none" stroke="var(--ink)" stroke-width="2"/>`).join('');
const ghost = (f, p) => `<circle cx="${f.X(p[0])}" cy="${f.Y(p[1])}" r="5.5" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="3 3"/>`;

// 1. Many separating lines, then the one with the widest street.
function manyLines() {
  const size = 250, oy = 50;
  const L = frame(18, oy, size), R = frame(352, oy, size);
  const lines = [
    { w: [1, 0], b: -3 },
    { w: [0, 1], b: -3 },
    { w: [1, 0.3], b: -3.6 },
  ].map(l => ({ ...l, width: lineWidth(l.w, l.b, A, B) }));
  const s = street(A, B);
  const left = `${L.defs}${L.base}${lines.map(l => wline(L, l.w, l.b, 0, { c: 'var(--muted)', w: 2 })).join('')}${points(L, A, B)}`;
  const right = `${R.defs}${R.base}${strip(R, s.w, s.b)}${wline(R, s.w, s.b, -1, { c: 'var(--accent)', w: 1.6, dash: '5 4' })}${wline(R, s.w, s.b, 1, { c: 'var(--accent)', w: 1.6, dash: '5 4' })}${wline(R, s.w, s.b, 0, { c: 'var(--accent)', w: 2.6 })}${points(R, A, B)}${circled(R, s.support)}`;
  const widths = lines.map(l => fmt(l.width, { max: 2 })).join(', ');
  return svg(640, 368, `${text(18 + size / 2, 20, tr('Many lines separate the classes', 'Banyak garis memisahkan kedua kelas'), { ...ink, size: 13 })}${text(18 + size / 2, 38, tr('thin lines: three of the many', 'garis tipis: tiga dari sekian banyak'), { size: 12 })}
${text(352 + size / 2, 20, tr('The widest street', 'Jalan terlebar'), { ...ink, size: 13 })}${text(352 + size / 2, 38, tr(`width ${fmt(s.width, { digits: 2 })}, ringed points touch it`, `lebar ${fmt(s.width, { digits: 2 })}, titik berlingkar menyentuhnya`), { size: 12 })}
${left}${right}
${text(18 + size / 2, oy + size + 24, tr(`street widths: ${widths}`, `lebar jalan: ${widths}`), { size: 12 })}${text(352 + size / 2, oy + size + 24, tr('no other line has a wider street', 'tidak ada garis lain dengan jalan lebih lebar'), { size: 12 })}
${dot(260, 350, k(0), 5)}${text(270, 354, tr('class A', 'kelas A'), { anchor: 'start', size: 12 })}${dot(350, 350, k(1), 5)}${text(360, 354, tr('class B', 'kelas B'), { anchor: 'start', size: 12 })}`);
}

// A label that runs along a w.x + b = c line (these lines fall at 45 degrees on screen), with a halo.
const along = (f, x, y, t) => `<text x="${f.X(x)}" y="${f.Y(y)}" text-anchor="middle" font-size="11.5" font-weight="600" fill="var(--ink)" stroke="var(--surface)" stroke-width="4" paint-order="stroke" transform="rotate(45 ${f.X(x)} ${f.Y(y)})">${t}</text>`;

// 2. The hand-computed example: support vectors (2, 2) and (4, 4), w = (0.5, 0.5), b = -3.
function worked() {
  const size = 300, ox = 26, oy = 30;
  const f = frame(ox, oy, size);
  const s = street(A, B);
  const [px, py] = [f.X(s.p[0]), f.Y(s.p[1])], [qx, qy] = [f.X(s.q[0]), f.Y(s.q[1])];
  const norm = Math.hypot(s.w[0], s.w[1]);
  const label = (x, y, t, o = {}) => text(x, y, t, { anchor: 'start', size: 12, ...o });
  const rx = 358;
  return svg(640, 350, `${f.defs}${f.base}${strip(f, s.w, s.b)}
${wline(f, s.w, s.b, -1, { c: 'var(--accent)', w: 1.6, dash: '5 4' })}${wline(f, s.w, s.b, 1, { c: 'var(--accent)', w: 1.6, dash: '5 4' })}${wline(f, s.w, s.b, 0, { c: 'var(--accent)', w: 2.6 })}
${line(px, py, qx, qy, { c: 'var(--ink)', w: 1.6 })}${points(f, A, B)}${circled(f, s.support)}
${label(px + 2, py + 26, '(2, 2)', { anchor: 'middle', ...ink })}${label(qx + 4, qy - 16, '(4, 4)', { anchor: 'middle', ...ink })}
${along(f, 0.9, 3.1, 'w·x + b = −1')}${along(f, 2.5, 3.5, 'w·x + b = 0')}${along(f, 2.35, 5.65, 'w·x + b = +1')}
${label(rx, 60, tr('Two support vectors, by hand', 'Dua support vector, manual'), { ...ink, size: 14 })}
${label(rx, 88, tr('The closest pair stops the street,', 'Pasangan terdekat menahan jalan,'))}
${label(rx, 105, tr('so w points along (1, 1): w = (a, a).', 'jadi w searah (1, 1): w = (a, a).'))}
${label(rx, 124, tr('At (2, 2):  4a + b = −1', 'Di (2, 2):  4a + b = −1'))}
${label(rx, 146, tr('At (4, 4):  8a + b = +1', 'Di (4, 4):  8a + b = +1'))}
${label(rx, 172, tr(`So a = ${fmt(s.w[0])}, b = ${fmt(s.b)}.`, `Maka a = ${fmt(s.w[0])}, b = ${fmt(s.b)}.`), ink)}
${label(rx, 196, tr(`|w| = √(${fmt(s.w[0] ** 2)} + ${fmt(s.w[1] ** 2)}) = ${fmt(norm, { digits: 4 })}`, `|w| = √(${fmt(s.w[0] ** 2)} + ${fmt(s.w[1] ** 2)}) = ${fmt(norm, { digits: 4 })}`))}
${label(rx, 222, tr(`Width = 2 / ${fmt(norm, { digits: 4 })} = ${fmt(s.width, { digits: 2 })}`, `Lebar = 2 / ${fmt(norm, { digits: 4 })} = ${fmt(s.width, { digits: 2 })}`), { ...ink, size: 13.5 })}
${label(rx, 252, tr('Check: the distance from (2, 2) to', 'Cek: jarak dari (2, 2) ke'))}
${label(rx, 268, tr(`(4, 4) is √(2² + 2²) = ${fmt(Math.hypot(2, 2), { digits: 2 })}.`, `(4, 4) adalah √(2² + 2²) = ${fmt(Math.hypot(2, 2), { digits: 2 })}.`))}
${label(rx, 304, tr('Solid line: boundary. Dashed: margin edges.', 'Garis penuh: boundary. Putus-putus: tepi jalan.'), { size: 11.5 })}
${label(rx, 322, tr('Ringed points: the support vectors.', 'Titik berlingkar: support vector.'), { size: 11.5 })}`);
}

// 3. What moves the street: far points do not, a support vector does.
function removing() {
  const size = 188, oy = 68;
  const cases = [
    {
      title: tr('Remove (1, 1) and (5, 5)', 'Hapus (1, 1) dan (5, 5)'),
      neg: A.filter(p => !(p[0] === 1 && p[1] === 1)), pos: B.filter(p => !(p[0] === 5 && p[1] === 5)),
      ghosts: [[1, 1], [5, 5]],
    },
    {
      title: tr('Remove (4, 4)', 'Hapus (4, 4)'),
      neg: A, pos: B.filter(p => !(p[0] === 4 && p[1] === 4)),
      ghosts: [[4, 4]],
    },
    {
      title: tr('Add (3, 4)', 'Tambah (3, 4)'),
      neg: A, pos: [...B, [3, 4]], ghosts: [],
    },
  ];
  const body = cases.map((c, i) => {
    const ox = 14 + i * 208, f = frame(ox, oy, size), s = street(c.neg, c.pos);
    return `${f.defs}${text(ox + size / 2, 18, c.title, { ...ink, size: 12.5 })}${text(ox + size / 2, 36, tr(`street width ${fmt(s.width, { digits: 2 })}`, `lebar jalan ${fmt(s.width, { digits: 2 })}`), { size: 12.5, fill: 'var(--accent)', weight: 700 })}
${f.base}${strip(f, s.w, s.b)}${wline(f, s.w, s.b, -1, { c: 'var(--accent)', w: 1.4, dash: '5 4' })}${wline(f, s.w, s.b, 1, { c: 'var(--accent)', w: 1.4, dash: '5 4' })}${wline(f, s.w, s.b, 0, { c: 'var(--accent)', w: 2.4 })}
${c.ghosts.map(p => ghost(f, p)).join('')}${points(f, c.neg, c.pos, 4.8)}${circled(f, s.support).replaceAll('r="10.5"', 'r="9.5"')}`;
  }).join('');
  return svg(640, 296, `${body}${text(320, 284, tr('dashed rings: removed points; ringed points: support vectors', 'cincin putus-putus: titik yang dihapus; titik berlingkar: support vector'), { size: 12 })}`);
}

export const figures = { 'many-lines': manyLines, 'worked-street': worked, 'removing-points': removing };
