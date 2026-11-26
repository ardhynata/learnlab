// Figures for the lesson "Collaborative filtering and matrix factorization":
// [[figure:collaborative-filtering-and-matrix-factorization/name|Caption]].
//
// Where the numbers come from. Every figure is drawn synchronously, so the data it needs is written down here.
//   - USERS, FILMS, RATINGS: the five users and five films of the lesson's toy matrix. The ratings are invented for
//     teaching (1 to 5 stars, null = not rated). Every similarity and prediction in the figures is computed from
//     this matrix when the figure is drawn, with the same formulas the lesson uses by hand.
//   - FACTORS_USER, FACTORS_FILM: the two-factor vectors a 200-sweep alternating-least-squares run found on RATINGS
//     (regularization 0.1, a seeded random start), rounded to one decimal. The lesson computes with the rounded values.
//   - The sparsity figure: a 30 users by 50 films grid with 30 filled cells chosen with a fixed pseudo-random sequence, and the
//     expected overlap n * p * p of two users who each interacted with a share p of n = 1,000 items, assuming each
//     picks items independently at random (real tastes cluster on popular items, so real overlap is uneven).
import { svg, dot, ring, text, line, box, k, tr, fmt, pct } from '../kit.js';

const USERS = ['Ana', 'Budi', 'Dewi', 'Citra', 'Eko'];
const FILMS = ['Orbit', 'Comet', 'Rocket', 'Harbor', 'Garden'];
const RATINGS = [
  [5, 4, null, 1, 2],
  [5, 5, 5, 2, null],
  [4, null, 4, 2, 1],
  [1, 2, 2, 5, 4],
  [2, 1, 2, 4, 5],
];
const FACTORS_USER = [[2.1, 0.5], [2.2, 0.8], [1.7, 0.5], [0.2, 2.1], [0.2, 2.1]];
const FACTORS_FILM = [[2.1, 0.5], [1.9, 0.5], [2.0, 0.8], [0.2, 2.1], [0.2, 2.1]];

const sum = a => a.reduce((s, v) => s + v, 0);
const dotp = (a, b) => a[0] * b[0] + a[1] * b[1];
// Similarity of two vectors over the positions where both have a rating (cosine on the co-rated cells).
function cosineCo(a, b) {
  let d = 0, x = 0, y = 0;
  for (let i = 0; i < a.length; i++) if (a[i] != null && b[i] != null) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; }
  return d / Math.sqrt(x * y);
}

// ---- Figure 1: the user-item matrix as a heat map. ----
function ratingMatrix() {
  const x0 = 104, y0 = 60, cw = 62, ch = 44;
  const heat = r => `color-mix(in srgb, var(--k1) ${Math.round(12 + (r - 1) / 4 * 78)}%, var(--surface))`;
  let cells = '';
  RATINGS.forEach((row, i) => row.forEach((r, j) => {
    const x = x0 + j * cw, y = y0 + i * ch;
    if (r == null) {
      const target = i === 0 && j === 2;
      cells += `<rect x="${x + 2}" y="${y + 2}" width="${cw - 4}" height="${ch - 4}" rx="6" fill="var(--surface)" stroke="${target ? k(3) : 'var(--muted)'}" stroke-width="${target ? 3 : 1.4}" stroke-dasharray="${target ? '' : '4 3'}"/>
${text(x + cw / 2, y + ch / 2 + 6, '?', { fill: target ? k(3) : 'var(--muted)', weight: 700, size: 18 })}`;
    } else {
      cells += `<rect x="${x + 2}" y="${y + 2}" width="${cw - 4}" height="${ch - 4}" rx="6" fill="${heat(r)}"/>
${text(x + cw / 2, y + ch / 2 + 6, fmt(r), { fill: 'var(--ink)', weight: 700, size: 17 })}`;
    }
  }));
  const heads = FILMS.map((f, j) => text(x0 + j * cw + cw / 2, y0 - 10, f, { fill: 'var(--ink)', weight: 700, size: 13 })).join('');
  const rows = USERS.map((u, i) => text(x0 - 10, y0 + i * ch + ch / 2 + 5, u, { anchor: 'end', fill: 'var(--ink)', weight: 700, size: 14 })).join('');
  const lx = 452;
  const legend = [1, 2, 3, 4, 5].map((r, i) => `<rect x="${lx + i * 34}" y="96" width="30" height="26" rx="5" fill="${heat(r)}"/>${text(lx + i * 34 + 15, 114, fmt(r), { fill: 'var(--ink)', weight: 700, size: 13 })}`).join('');
  const tx = x0 + 2 * cw + cw / 2;
  return svg(640, 340, `${text(x0 + 2.5 * cw, 24, tr('Films', 'Film'), { fill: 'var(--muted)', weight: 600, size: 13 })}
${text(48, y0 - 10, tr('Users', 'Pengguna'), { fill: 'var(--muted)', weight: 600, size: 13 })}
${heads}${rows}${cells}
${text(lx, 80, tr('Rating (stars)', 'Rating (bintang)'), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 14 })}
${legend}
<rect x="${lx}" y="146" width="30" height="26" rx="5" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.4" stroke-dasharray="4 3"/>
${text(lx + 42, 164, tr('not rated', 'belum dinilai'), { anchor: 'start', fill: 'var(--ink)', size: 13 })}
<rect x="${lx}" y="186" width="30" height="26" rx="5" fill="var(--surface)" stroke="${k(3)}" stroke-width="3"/>
${text(lx + 42, 204, tr('to predict', 'diprediksi'), { anchor: 'start', fill: k(3), weight: 700, size: 13 })}
${line(tx, y0 + 5 * ch + 30, tx, y0 + 5 * ch + 6, { c: k(3), w: 2, arrow: true })}
${text(tx, y0 + 5 * ch + 46, tr("Ana's rating of Rocket", 'Rating Ana untuk Rocket'), { fill: k(3), weight: 700, size: 13 })}`);
}

// ---- Figure 2: user-user neighbours and the prediction. ----
function userNeighbours() {
  const others = [1, 2, 3, 4].map(b => ({ name: USERS[b], s: cosineCo(RATINGS[0], RATINGS[b]), r: RATINGS[b][2] })).sort((a, b) => b.s - a.s);
  const near = others.slice(0, 2);
  const kPred = sum(near.map(o => o.s * o.r)) / sum(near.map(o => o.s));
  const allPred = sum(others.map(o => o.s * o.r)) / sum(others.map(o => o.s));
  const col = RATINGS.map(r => r[2]).filter(v => v != null);
  const popPred = sum(col) / col.length;
  const bx = 100, bw = 250, y0 = 62, rh = 36;
  const bars = others.map((o, i) => {
    const y = y0 + i * rh, used = i < 2;
    return `${text(bx - 10, y + 18, o.name, { anchor: 'end', fill: 'var(--ink)', weight: 700, size: 14 })}
<rect x="${bx}" y="${y + 4}" width="${o.s * bw}" height="22" rx="5" fill="${used ? k(1) : 'var(--line)'}"/>
${text(bx + o.s * bw - 8, y + 20, fmt(o.s, { digits: 2 }), { anchor: 'end', fill: used ? 'var(--surface)' : 'var(--ink)', weight: 700, size: 13 })}
${text(bx + bw + 24, y + 20, `${tr('rated Rocket', 'menilai Rocket')}: ${fmt(o.r)}`, { anchor: 'start', fill: used ? 'var(--ink)' : 'var(--muted)', weight: used ? 700 : 500, size: 13 })}`;
  }).join('');
  const nx = 90, nw = 460, ny = 262;
  const X = v => nx + (v - 1) / 4 * nw;
  const mark = (v, c, label, above) => `${line(X(v), ny - 9, X(v), ny + 9, { c, w: 3 })}${text(X(v), above ? ny - 18 : ny + 28, `${label} ${fmt(v, { digits: 2 })}`, { fill: c, weight: 700, size: 13 })}`;
  return svg(640, 316, `${text(320, 22, tr("How similar is each user to Ana? (cosine on the films both rated)", 'Seberapa mirip setiap pengguna dengan Ana? (cosine pada film yang dinilai keduanya)'), { fill: 'var(--ink)', weight: 700, size: 13 })}
${text(bx, 48, tr('The two nearest are highlighted', 'Dua yang terdekat disorot'), { anchor: 'start', size: 12 })}
${bars}
${text(320, 224, tr("Predicted rating of Rocket for Ana", 'Prediksi rating Rocket untuk Ana'), { fill: 'var(--ink)', weight: 700, size: 13 })}
${line(nx, ny, nx + nw, ny, { c: 'var(--line)', w: 3 })}
${[1, 2, 3, 4, 5].map(v => `${line(X(v), ny - 4, X(v), ny + 4, { c: 'var(--muted)', w: 1.5 })}${text(X(v), ny + 50, fmt(v), { size: 12 })}`).join('')}
${mark(popPred, 'var(--muted)', tr('popularity', 'popularitas'), false)}
${mark(allPred, k(3), tr('all four users', 'keempat pengguna'), true)}
${mark(kPred, k(1), tr('two nearest', 'dua terdekat'), false)}`);
}

// ---- Figure 3: users and films in a two-factor space, and one user's row of dot products. ----
function twoFactors() {
  const ox = 44, oy = 268, S = 200, max = 2.5;
  const X = v => ox + v / max * S, Y = v => oy - v / max * S;
  const userDots = FACTORS_USER.map(v => dot(X(v[0]), Y(v[1]), k(0), 5)).join('');
  const filmRings = FACTORS_FILM.map(v => ring(X(v[0]), Y(v[1]), k(2), 8)).join('');
  const lang = tr('en', 'id');
  const names = { en: { users: 'Users', films: 'Films' }, id: { users: 'Pengguna', films: 'Film' } }[lang];
  const group = (cx, cy, us, fs, anchor) => `${text(cx, cy, `${names.users}: ${us.join(', ')}`, { anchor, fill: k(0), weight: 700, size: 12 })}${text(cx, cy + 16, `${names.films}: ${fs.join(', ')}`, { anchor, fill: k(2), weight: 700, size: 12 })}`;
  const left = `${box(8, 28, 304, 288)}
${line(ox, oy, ox + S + 8, oy, { c: 'var(--muted)', w: 1.4, arrow: true })}${line(ox, oy, ox, oy - S - 8, { c: 'var(--muted)', w: 1.4, arrow: true })}
${text(ox + S, oy + 18, tr('factor 1', 'faktor 1'), { anchor: 'end', size: 12 })}${text(ox + 8, oy - S - 4, tr('factor 2', 'faktor 2'), { anchor: 'start', size: 12 })}
${filmRings}${userDots}
${group(X(1.45), Y(1.3), [USERS[0], USERS[1], USERS[2]], [FILMS[0], FILMS[1], FILMS[2]], 'middle')}
${group(X(1.0), Y(2.25), [USERS[3], USERS[4]], [FILMS[3], FILMS[4]], 'start')}
${dot(24, 46, k(0), 5)}${text(36, 50, tr('user', 'pengguna'), { anchor: 'start', size: 12 })}${ring(124, 46, k(2), 7)}${text(136, 50, tr('film', 'film'), { anchor: 'start', size: 12 })}`;
  const rx = 344, bw = 150, y0 = 82, rh = 38;
  const ana = FACTORS_USER[0];
  const rows = FILMS.map((f, j) => {
    const p = dotp(ana, FACTORS_FILM[j]), y = y0 + j * rh, actual = RATINGS[0][j];
    const target = actual == null;
    const bar = `<rect x="${rx + 62}" y="${y + 4}" width="${p / 5 * bw}" height="22" rx="5" fill="${target ? k(3) : k(1)}"/>`;
    const tick = actual == null ? '' : `${line(rx + 62 + actual / 5 * bw, y, rx + 62 + actual / 5 * bw, y + 30, { c: 'var(--ink)', w: 2.4 })}`;
    return `${text(rx + 52, y + 20, f, { anchor: 'end', fill: 'var(--ink)', weight: 700, size: 14 })}${bar}${tick}${text(rx + 62 + bw + 10, y + 20, `${fmt(p, { digits: 2 })}${actual == null ? '' : `  (${fmt(actual)})`}`, { anchor: 'start', fill: target ? k(3) : 'var(--ink)', weight: 700, size: 13 })}`;
  }).join('');
  const right = `${text(rx + 138, 24, tr('Ana: predicted rating = dot product', 'Ana: rating prediksi = hasil kali titik'), { fill: 'var(--ink)', weight: 700, size: 13 })}
${text(rx + 138, 44, `(${fmt(ana[0], { digits: 1 })}${tr(', ', '; ')}${fmt(ana[1], { digits: 1 })}) ${tr('with each film vector', 'dengan setiap vektor film')}`, { fill: 'var(--muted)', size: 12 })}
${rows}
${line(rx + 62, y0 + 5 * rh + 2, rx + 62 + bw, y0 + 5 * rh + 2, { c: 'var(--line)', w: 1.5 })}
${text(rx + 62, y0 + 5 * rh + 20, fmt(0), { size: 12 })}${text(rx + 62 + bw, y0 + 5 * rh + 20, fmt(5), { size: 12 })}
<rect x="${rx + 40}" y="${y0 + 5 * rh + 34}" width="3" height="14" fill="var(--ink)"/>${text(rx + 50, y0 + 5 * rh + 46, tr("Ana's own rating (bar = prediction)", 'rating asli Ana (batang = prediksi)'), { anchor: 'start', size: 12 })}`;
  return svg(640, 330, `${left}${right}`);
}

// ---- Figure 4: sparsity. ----
function sparsity() {
  const cols = 50, rows = 30, cell = 6.2, gx = 14, gy = 52;
  let seed = 12345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const idx = Array.from({ length: cols * rows }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const filled = idx.slice(0, 30);
  const squares = filled.map(i => `<rect x="${gx + (i % cols) * cell}" y="${gy + Math.floor(i / cols) * cell}" width="${cell}" height="${cell}" fill="${k(1)}"/>`).join('');
  const gw = cols * cell, gh = rows * cell;
  const left = `${text(gx + gw / 2, 24, tr('A service: 30 users by 50 films', 'Sebuah layanan: 30 pengguna dan 50 film'), { fill: 'var(--ink)', weight: 700, size: 13 })}
${box(gx - 4, gy - 4, gw + 8, gh + 8)}${squares}
${text(gx + gw / 2, gy + gh + 28, `${fmt(30)} ${tr('of', 'dari')} ${fmt(1500)} ${tr('cells filled', 'sel terisi')} (${pct(0.02)})`, { fill: k(1), weight: 700, size: 13 })}
${text(gx + gw / 2, gy + gh + 48, tr('Every other cell is unknown, not zero.', 'Semua sel lain tidak diketahui, bukan nol.'), { size: 12 })}`;
  const cases = [{ p: 0.1, n: 1000 }, { p: 0.02, n: 1000 }, { p: 0.01, n: 1000 }];
  const rx = 372, base = 250, top = 70, bw = 54;
  const vmax = cases[0].n * cases[0].p * cases[0].p;
  const bars = cases.map((c, i) => {
    const v = c.n * c.p * c.p, x = rx + 24 + i * 78, h = Math.max(v / vmax * (base - top), 2);
    return `<rect x="${x}" y="${base - h}" width="${bw}" height="${h}" rx="4" fill="${i === 0 ? k(2) : k(3)}"/>
${text(x + bw / 2, base - h - 8, fmt(v, { digits: v >= 1 ? 0 : 1 }), { fill: 'var(--ink)', weight: 700, size: 14 })}
${text(x + bw / 2, base + 20, pct(c.p), { fill: 'var(--ink)', weight: 600, size: 14 })}`;
  }).join('');
  const right = `${text(rx + 128, 24, tr('Films two users both rated', 'Film yang dinilai oleh dua pengguna'), { fill: 'var(--ink)', weight: 700, size: 13 })}
${text(rx + 128, 42, tr('on average, out of 1,000 films', 'rata-rata, dari 1.000 film'), { fill: 'var(--ink)', weight: 700, size: 13 })}
${line(rx + 8, base, rx + 252, base, { c: 'var(--line)', w: 1.5 })}${bars}
${text(rx + 130, base + 42, tr('Share of films each user rated', 'Bagian film yang dinilai setiap pengguna'), { size: 12 })}`;
  return svg(640, 316, `${left}${right}`);
}

export const figures = {
  'rating-matrix': ratingMatrix,
  'user-neighbours': userNeighbours,
  'two-factors': twoFactors,
  'sparsity': sparsity,
};
