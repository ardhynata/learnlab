// Figures for the lesson "High-cardinality categories and target encoding":
// [[figure:high-cardinality-and-target-encoding/name|Caption]].
//
// The numbers come from a made-up customer table (zip code, bought yes or no), simulated once in
// node with a seeded generator and written down here, because a figure is drawn synchronously:
//   - LONG_TAIL: 2,000 customers over 500 possible zip codes, drawn with weights 1 / rank^0.8
//     (a few busy zip codes, many rare ones). 412 zip codes appear; the counts below group them by
//     the number of customers each has (1, 2, 3, 4-5, 6-10, 11-20, 21 or more).
//   - LEAK: average accuracy over 200 simulated tables of a one-question rule (predict 1 when the
//     encoded value is above the cutoff that is best on the training rows), 100 zip codes drawn
//     uniformly. Coin-flip labels: 300 training and 300 fresh customers. Real effect: each zip code
//     buys with its own rate between 0.15 and 0.85, 1,000 training and 1,000 fresh customers.
//     "Out of fold" is 5-fold encoding of the training rows, with smoothing m = 10; the fresh rows
//     are encoded with a table built from all training rows. Naive smoothing with m = 10 gives the
//     same numbers as naive without smoothing in these tables, so one bar stands for both.
//   - The smoothing curve is the formula in the lesson, drawn live.
import { svg, text, line, box, k, soft, tr, fmt } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };

const LONG_TAIL = [[1, 1, 112], [2, 2, 86], [3, 3, 73], [4, 5, 65], [6, 10, 47], [11, 20, 15], [21, null, 14]];
const LEAK = {
  noise: { naive: [71.7, 50.0], oof: [53.8, 49.9] },
  signal: { naive: [71.0, 64.5], oof: [64.6, 64.2] },
};

// Figure 1: how many zip codes have 1, 2, 3, ... customers (the long tail).
function longTail() {
  const x0 = 70, y0 = 250, w = 66, gap = 14, hmax = 125, top = 106;
  const total = LONG_TAIL.reduce((s, r) => s + r[2], 0);
  let body = text(340, 24, tr(`${fmt(total)} zip codes, grouped by how many customers each has`, `${fmt(total)} kode pos, dikelompokkan menurut jumlah pelanggan masing-masing`), { ...INK, size: 14 });
  body += text(340, 44, tr('A table of 2,000 customers. One-hot encoding would write one column for every zip code.', 'Tabel 2.000 pelanggan. One-hot encoding akan menulis satu kolom untuk setiap kode pos.'), { size: 12 });
  body += line(x0 - 10, y0, x0 + LONG_TAIL.length * (w + gap) - gap + 10, y0, { c: 'var(--muted)', w: 1.6 });
  LONG_TAIL.forEach(([lo, hi, n], i) => {
    const x = x0 + i * (w + gap), h = n / 112 * hmax, few = i < 3;
    const label = hi === null ? `${fmt(lo)}+` : hi === lo ? fmt(lo) : `${fmt(lo)}–${fmt(hi)}`;
    body += `<rect x="${x}" y="${(y0 - h).toFixed(1)}" width="${w}" height="${h.toFixed(1)}" rx="4" fill="${few ? k(1) : k(0)}" fill-opacity="${few ? 0.9 : 0.55}" stroke="var(--ink)" stroke-width="1.4"/>`;
    body += text(x + w / 2, y0 - h - 7, fmt(n), { size: 13, weight: 700, fill: 'var(--ink)' });
    body += text(x + w / 2, y0 + 20, label, { size: 13, fill: 'var(--ink)' });
  });
  const xe = x0 + 3 * (w + gap) - gap;
  const few = LONG_TAIL.slice(0, 3).reduce((s, r) => s + r[2], 0);
  body += line(x0, top - 22, xe, top - 22, { c: 'var(--ink)', w: 2 });
  body += line(x0, top - 28, x0, top - 16, { c: 'var(--ink)', w: 2 }) + line(xe, top - 28, xe, top - 16, { c: 'var(--ink)', w: 2 });
  body += text(x0, top - 34, tr(`${fmt(few)} zip codes have 3 customers or fewer`, `${fmt(few)} kode pos punya paling banyak 3 pelanggan`), { anchor: 'start', size: 13, weight: 700, fill: 'var(--ink)' });
  body += text(340, y0 + 48, tr('customers in the zip code', 'pelanggan di kode pos'), { size: 12 });
  return svg(680, 290, body);
}

// Figure 2: smoothed encoding against n for a zip code where every customer bought.
function smoothing() {
  const px = 80, py = 40, pw = 540, ph = 230;
  const X = n => px + n / 30 * pw;
  const Y = v => py + (1.05 - v) / (1.05 - 0.3) * ph;
  const g = 0.4;
  const enc = (n, m) => (n * 1 + m * g) / (n + m);
  let body = text(340, 22, tr('Smoothed encoding of a zip code where every customer bought', 'Encoding yang dihaluskan untuk kode pos yang semua pelanggannya membeli'), { ...INK, size: 14 });
  [0.4, 0.6, 0.8, 1.0].forEach(v => {
    body += `${line(px, Y(v), px + pw, Y(v), { c: 'var(--line)', w: 1.2 })}${text(px - 10, Y(v) + 4, fmt(v, { digits: 1 }), { anchor: 'end', size: 12, fill: 'var(--ink)' })}`;
  });
  [0, 5, 10, 15, 20, 25, 30].forEach(n => {
    body += `${line(X(n), py + ph, X(n), py + ph + 6, { c: 'var(--muted)', w: 1.4 })}${text(X(n), py + ph + 22, fmt(n), { size: 12, fill: 'var(--ink)' })}`;
  });
  body += line(px, py + ph, px + pw, py + ph, { c: 'var(--muted)', w: 1.6 });
  body += line(px, Y(1.0), px + pw, Y(1.0), { c: 'var(--muted)', w: 1.8, dash: '5 4' });
  body += text(px + pw, Y(1.0) - 7, tr(`the zip code's own mean ${fmt(1, { digits: 2 })}`, `rata-rata kode pos itu sendiri ${fmt(1, { digits: 2 })}`), { anchor: 'end', size: 12 });
  body += line(px, Y(g), px + pw, Y(g), { c: 'var(--muted)', w: 1.8, dash: '5 4' });
  body += text(px + pw, Y(g) + 17, tr(`overall mean ${fmt(g, { digits: 2 })}`, `rata-rata keseluruhan ${fmt(g, { digits: 2 })}`), { anchor: 'end', size: 12 });
  const curve = (m, c) => {
    let d = '';
    for (let n = 0; n <= 30; n += 0.5) d += `${n === 0 ? 'M' : 'L'}${X(n).toFixed(1)} ${Y(enc(n, m)).toFixed(1)}`;
    return `<path d="${d}" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  };
  body += curve(4, k(0)) + curve(10, k(2));
  body += text(X(24), Y(enc(24, 4)) - 10, 'm = 4', { anchor: 'middle', size: 13, weight: 700, fill: k(0) });
  body += text(X(24), Y(enc(24, 10)) + 20, 'm = 10', { anchor: 'middle', size: 13, weight: 700, fill: k(2) });
  [[1, 'D', 1.04], [3, 'C', 0.9]].forEach(([n, z, ly]) => {
    const v = enc(n, 4);
    body += line(X(n), Y(v), X(n), Y(ly) + 4, { c: 'var(--ink)', w: 1.2, dash: '3 3' });
    body += `<circle cx="${X(n).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="6" fill="${k(0)}" stroke="var(--ink)" stroke-width="2"/>`;
    body += text(X(n) + 6, Y(ly), tr(`zip ${z}: n = ${fmt(n)}, ${fmt(v, { digits: 2 })}`, `kode pos ${z}: n = ${fmt(n)}, ${fmt(v, { digits: 2 })}`), { anchor: 'start', size: 12, weight: 700, fill: 'var(--ink)' });
  });
  body += text(340, py + ph + 46, tr('number of customers in the zip code (n)', 'jumlah pelanggan di kode pos (n)'), { size: 12 });
  return svg(680, 336, body);
}

// Figure 3: training score against fresh-row score, for naive and out-of-fold encoding.
function leak() {
  const panels = [
    [tr('Coin-flip labels (chance is 50%)', 'Label lemparan koin (tingkat tebakan acak 50%)'), LEAK.noise, 8, true],
    [tr('Zip codes have a real effect', 'Kode pos punya pengaruh nyata'), LEAK.signal, 346, false],
  ];
  let body = '';
  const base = 250, hmax = 170, bw = 62;
  panels.forEach(([title, d, px, showHalf]) => {
    body += box(px, 40, 326, 262);
    body += text(px + 163, 62, title, { ...INK, size: 14 });
    const Y = v => base - v / 80 * hmax;
    body += line(px + 12, base, px + 314, base, { c: 'var(--muted)', w: 1.6 });
    [['naive', tr('Naive', 'Naif')], ['oof', tr('Out of fold', 'Out-of-fold')]].forEach(([key, label], gi) => {
      const gx = px + 28 + gi * 150;
      [[0, k(1), d[key][0]], [1, k(0), d[key][1]]].forEach(([bi, color, v]) => {
        const x = gx + bi * (bw + 4);
        body += `<rect x="${x}" y="${Y(v).toFixed(1)}" width="${bw}" height="${(base - Y(v)).toFixed(1)}" rx="4" fill="${color}" fill-opacity="0.85" stroke="var(--ink)" stroke-width="1.4"/>`;
        body += text(x + bw / 2, Y(v) - 6, `${fmt(v, { digits: 1 })}%`, { size: 12, weight: 700, fill: 'var(--ink)' });
      });
      body += text(gx + bw + 2, base + 20, label, { size: 13, weight: 700, fill: 'var(--ink)' });
    });
  });
  body += `<rect x="${8}" y="12" width="14" height="14" rx="3" fill="${k(1)}" fill-opacity="0.85" stroke="var(--ink)" stroke-width="1.2"/>${text(28, 24, tr('training rows', 'baris training'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}`;
  body += `<rect x="${160}" y="12" width="14" height="14" rx="3" fill="${k(0)}" fill-opacity="0.85" stroke="var(--ink)" stroke-width="1.2"/>${text(180, 24, tr('fresh rows', 'baris baru'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}`;
  body += text(340, 322, tr('Average accuracy over 200 simulated tables. A big gap between the two bars is the leak.', 'Rata-rata akurasi dari 200 tabel simulasi. Selisih besar antara kedua batang adalah leak.'), { size: 12 });
  return svg(680, 336, body);
}

// Figure 4: the five rounds of out-of-fold encoding, then the test rows.
function outOfFold() {
  const x0 = 100, cw = 78, gap = 4, y0 = 64, rh = 36;
  let body = text(340, 22, tr('Out-of-fold encoding: each fold is encoded from the other four', 'Encoding out-of-fold: setiap fold di-encode dari empat fold lainnya'), { ...INK, size: 14 });
  for (let f = 0; f < 5; f++) body += text(x0 + f * (cw + gap) + cw / 2, y0 - 12, `${tr('Fold', 'Fold')} ${fmt(f + 1)}`, { size: 12, weight: 700, fill: 'var(--ink)' });
  for (let r = 0; r < 5; r++) {
    const y = y0 + r * rh;
    body += text(16, y + 21, `${tr('Round', 'Ronde')} ${fmt(r + 1)}`, { anchor: 'start', size: 13, fill: 'var(--ink)' });
    for (let f = 0; f < 5; f++) {
      const held = f === r, x = x0 + f * (cw + gap);
      body += `<rect x="${x}" y="${y}" width="${cw}" height="${rh - 6}" rx="6" fill="${held ? k(1) : soft(0)}" stroke="${held ? 'var(--ink)' : k(0)}" stroke-width="${held ? 2.2 : 1.4}"/>
${text(x + cw / 2, y + 20, held ? tr('encode', 'encode') : tr('table', 'tabel'), { size: 12, weight: held ? 700 : 500, fill: held ? 'var(--surface)' : 'var(--ink)' })}`;
    }
  }
  const yt = y0 + 5 * rh + 14;
  body += line(16, yt - 10, 660, yt - 10, { c: 'var(--line)', w: 1.6 });
  body += text(16, yt + 21, tr('Test', 'Test'), { anchor: 'start', size: 13, fill: 'var(--ink)' });
  for (let f = 0; f < 5; f++) {
    const x = x0 + f * (cw + gap);
    body += `<rect x="${x}" y="${yt}" width="${cw}" height="${rh - 6}" rx="6" fill="${soft(0)}" stroke="${k(0)}" stroke-width="1.4"/>${text(x + cw / 2, yt + 20, tr('table', 'tabel'), { size: 12, fill: 'var(--ink)' })}`;
  }
  body += text(340, yt + 2 * rh - 4, tr('Rounds 1 to 5: the dark fold is encoded with a table built from the four light folds.', 'Ronde 1 sampai 5: fold gelap di-encode dengan tabel dari empat fold terang.'), { size: 12, fill: 'var(--ink)' });
  body += text(340, yt + 2 * rh + 16, tr('Test rows get one table built from all the training folds.', 'Baris test memakai satu tabel dari semua fold training.'), { size: 12, fill: 'var(--ink)' });
  return svg(680, yt + 2 * rh + 34, body);
}

export const figures = { 'long-tail': longTail, 'smoothing': smoothing, 'leak': leak, 'out-of-fold': outOfFold };
