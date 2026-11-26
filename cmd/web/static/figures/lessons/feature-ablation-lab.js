// Figures for the lesson "Feature ablation lab": [[figure:feature-ablation-lab/name|Caption]].
// Every number is computed here with the Ablation lab's own math (sims/ml/ablationlab.js) on the table the lab
// opens with: the generated data, seed 5, single split seed 2, fold seed 1. So the figures agree with the lesson
// text and with the lab. The computation is run once, when the first figure is drawn.
import { svg, dot, ring, diamond, text, line, box, k, soft, tr, fmt } from '../kit.js';
import { FEATURE_ORDER_GENERATED, makeCandidateData, makeEvaluator, forwardSteps, ablationRows, leakCheck } from '../../sims/ml/ablationlab.js';

const SEED = 5, SPLIT = 2, FOLD = 1;
const EIGHT = FEATURE_ORDER_GENERATED.filter(f => f !== 'region');
const label = f => (f === 'u_v' ? 'u × v' : f);
const signed = v => (Math.abs(v) < 0.0005 ? fmt(0, { digits: 1 }) : (v > 0 ? '+' : '−') + fmt(Math.abs(v) * 100, { digits: 1 }));
const pts = v => fmt(v * 100, { digits: 1 });

let cache = null;
function data() {
  if (cache) return cache;
  const table = makeCandidateData({ seed: SEED });
  const ev = makeEvaluator(table, { foldSeed: FOLD, splitSeed: SPLIT });
  const steps = forwardSteps(FEATURE_ORDER_GENERATED, ev);
  // z1 on x1 alone, on five different single splits
  const splits = [2, 3, 4, 5, 6].map(s => {
    const e = makeEvaluator(table, { foldSeed: FOLD, splitSeed: s });
    return e.split(['x1', 'z1']).score - e.split(['x1']).score;
  });
  const z1 = steps.steps[1];
  cache = {
    steps, splits, z1,
    ablation: ablationRows(EIGHT, ev),
    leak: leakCheck(table, FEATURE_ORDER_GENERATED, 'region', { foldSeed: FOLD, splitSeed: SPLIT }),
  };
  return cache;
}

// ---- Figure 1: one noise column, five single splits, one cross-validation ----
function fiveSplits() {
  const d = data();
  const lo = -5, hi = 6, x0 = 190, x1 = 610;
  const X = v => x0 + ((v * 100 - lo) / (hi - lo)) * (x1 - x0);
  const top = 46, bottom = 200;
  const sd = d.z1.cv.sd;
  let body = text(320, 20, tr('Gain of the noise column z1 over x1 alone (percentage points)', 'Peningkatan akibat kolom noise z1 dibanding x1 saja (poin persentase)'), { fill: 'var(--ink)', weight: 700, size: 14 });
  body += `<rect x="${X(-sd)}" y="${top - 8}" width="${X(sd) - X(-sd)}" height="${bottom - top + 16}" fill="${soft(1)}" stroke="none"/>`;
  [-4, -2, 0, 2, 4, 6].forEach(v => {
    body += line(X(v / 100), top - 8, X(v / 100), bottom + 8, { c: v === 0 ? 'var(--muted)' : 'var(--line)', w: v === 0 ? 1.6 : 1 });
    body += text(X(v / 100), bottom + 26, v > 0 ? `+${fmt(v)}` : v < 0 ? `−${fmt(-v)}` : fmt(0), { size: 12, fill: 'var(--ink)' });
  });
  body += text(x0 - 12, top + 22, tr('Five single splits', 'Lima single split'), { anchor: 'end', fill: 'var(--ink)', size: 13, weight: 600 });
  body += text(x0 - 12, top + 40, tr('(120 test rows each)', '(masing-masing 120 baris uji)'), { anchor: 'end', size: 11 });
  d.splits.forEach((g, i) => {
    const y = top + 14 + i * 0;
    const jitter = (i % 2 ? 18 : 0) + (i === 4 ? 8 : 0);
    body += dot(X(g), y + jitter + 6, k(1), 7);
    body += text(X(g), y + jitter - 6, signed(g), { size: 12, fill: 'var(--ink)', weight: 700 });
  });
  const yc = bottom - 30;
  body += text(x0 - 12, yc - 2, tr('5-fold cross-validation', 'Cross-validation 5 fold'), { anchor: 'end', fill: 'var(--ink)', size: 13, weight: 600 });
  body += ring(X(d.z1.cvGain), yc, k(0), 8);
  body += text(X(d.z1.cvGain), yc - 14, signed(d.z1.cvGain), { size: 12, fill: 'var(--ink)', weight: 700 });
  body += text(X(0), bottom + 46, tr(`Shaded: ± ${pts(sd)}, the spread of the folds. A gain inside it does not count.`, `Area berwarna: ± ${pts(sd)}, sebaran antar fold. Peningkatan di dalamnya tidak dihitung.`), { size: 12, fill: 'var(--ink)' });
  return svg(640, 270, body);
}

// ---- Figure 2: the nine features added in order, with verdicts ----
const VERDICT = {
  real: { c: 2, a: () => tr('holds', 'bertahan'), b: () => '' },
  splitOnly: { c: 1, a: () => tr('split', 'hanya'), b: () => tr('only', 'split') },
  flat: { c: null, a: () => tr('no real', 'datar'), b: () => tr('change', '') },
  worse: { c: 3, a: () => tr('worse', 'lebih'), b: () => tr('', 'buruk') },
};
function forwardFigure() {
  const d = data(), st = d.steps;
  const cols = [{ name: tr('none', 'kosong'), cv: st.baseline.cv, split: st.baseline.split }]
    .concat(st.steps.map(s => ({ name: label(s.feature), cv: s.cv, split: s.split, verdict: s.verdict })));
  const lo = 0.45, hi = 0.9, px = 62, pw = 568, py = 36, ph = 190, slot = pw / cols.length;
  const Y = v => py + ph - ((v - lo) / (hi - lo)) * ph;
  const X = i => px + slot * (i + 0.5);
  let body = text(320, 18, tr('Cross-validated accuracy and single-split accuracy as features are added', 'Akurasi cross-validation dan akurasi single split saat feature ditambahkan'), { fill: 'var(--ink)', weight: 700, size: 14 });
  body += box(px, py, pw, ph, 'var(--surface)', 'var(--line)');
  [0.5, 0.6, 0.7, 0.8, 0.9].forEach(v => {
    body += line(px, Y(v), px + pw, Y(v), { c: 'var(--line)', w: 1 }) + text(px - 8, Y(v) + 4, `${fmt(v * 100, { digits: 0 })}%`, { anchor: 'end', size: 12, fill: 'var(--ink)' });
  });
  body += line(px, Y(st.baseline.cv.mean), px + pw, Y(st.baseline.cv.mean), { c: 'var(--muted)', w: 1.6, dash: '6 5' });
  cols.forEach((c, i) => {
    const x = X(i) - 6;
    body += line(x, Y(c.cv.mean + c.cv.sd), x, Y(c.cv.mean - c.cv.sd), { c: 'var(--ink)', w: 2 });
    body += line(x - 4, Y(c.cv.mean + c.cv.sd), x + 4, Y(c.cv.mean + c.cv.sd), { c: 'var(--ink)', w: 2 });
    body += line(x - 4, Y(c.cv.mean - c.cv.sd), x + 4, Y(c.cv.mean - c.cv.sd), { c: 'var(--ink)', w: 2 });
    body += dot(x, Y(c.cv.mean), k(0), 5);
    body += diamond(X(i) + 8, Y(c.split), k(1), 6);
    body += text(X(i), py + ph + 18, c.name, { size: 12, fill: 'var(--ink)', weight: i === 0 ? 500 : 600 });
    if (c.verdict) {
      const v = VERDICT[c.verdict], col = v.c === null ? 'var(--muted)' : k(v.c);
      body += `<rect x="${X(i) - slot / 2 + 3}" y="${py + ph + 28}" width="${slot - 6}" height="32" rx="6" fill="none" stroke="${col}" stroke-width="2"/>`;
      body += text(X(i), py + ph + 42, v.a(), { size: 9.5, fill: 'var(--ink)', weight: 700 });
      body += text(X(i), py + ph + 55, v.b(), { size: 9.5, fill: 'var(--ink)', weight: 700 });
    }
  });
  const ly = 306;
  body += dot(px + 8, ly, k(0), 5) + text(px + 20, ly + 4, tr('Cross-validated mean ± 1 SD', 'Rata-rata cross-validation ± 1 SD'), { anchor: 'start', size: 12, fill: 'var(--ink)' });
  body += diamond(px + 250, ly, k(1), 6) + text(px + 262, ly + 4, tr('Single split', 'Single split'), { anchor: 'start', size: 12, fill: 'var(--ink)' });
  body += line(px + 350, ly, px + 378, ly, { c: 'var(--muted)', w: 1.6, dash: '6 5' }) + text(px + 386, ly + 4, tr('Guess the majority', 'Tebak mayoritas'), { anchor: 'start', size: 12, fill: 'var(--ink)' });
  return svg(640, 324, body);
}

// ---- Figure 3: what removing each feature costs ----
function ablationFigure() {
  const d = data(), a = d.ablation;
  const rows = a.rows.slice().sort((p, q) => q.drop - p.drop);
  const lo = -0.055, hi = 0.11, px = 100, pw = 520, py = 44, rowH = 26;
  const X = v => px + ((v - lo) / (hi - lo)) * pw;
  const ph = rows.length * rowH + 10;
  let body = text(320, 20, tr(`Score lost when one feature is removed (full model: ${pts(a.full.mean)}% ± ${pts(a.full.sd)})`, `Skor yang hilang saat satu feature dibuang (model penuh: ${pts(a.full.mean)}% ± ${pts(a.full.sd)})`), { fill: 'var(--ink)', weight: 700, size: 14 });
  body += `<rect x="${X(-a.full.sd)}" y="${py - 6}" width="${X(a.full.sd) - X(-a.full.sd)}" height="${ph + 6}" fill="${soft(1)}"/>`;
  [-4, -2, 0, 2, 4, 6, 8, 10].forEach(v => {
    body += line(X(v / 100), py - 6, X(v / 100), py + ph, { c: v === 0 ? 'var(--muted)' : 'var(--line)', w: v === 0 ? 1.6 : 1 });
    body += text(X(v / 100), py + ph + 18, v > 0 ? `+${fmt(v)}` : v < 0 ? `−${fmt(-v)}` : fmt(0), { size: 12, fill: 'var(--ink)' });
  });
  rows.forEach((r, i) => {
    const y = py + 6 + i * rowH, earns = r.verdict === 'earns', xa = X(0), xb = X(r.drop);
    body += text(px - 10, y + 14, label(r.feature), { anchor: 'end', size: 13, fill: 'var(--ink)', weight: earns ? 700 : 500 });
    body += `<rect x="${Math.min(xa, xb)}" y="${y + 2}" width="${Math.max(2, Math.abs(xb - xa))}" height="16" rx="3" fill="${earns ? k(2) : k(0)}" fill-opacity="${earns ? 0.9 : 0.45}" stroke="var(--ink)" stroke-width="1.2"/>`;
    body += text(r.drop >= 0 ? xb + 8 : xa + 8, y + 15, signed(r.drop), { anchor: 'start', size: 12, fill: 'var(--ink)', weight: earns ? 700 : 500 });
  });
  body += text(320, py + ph + 40, tr(`Shaded: ± ${pts(a.full.sd)}, the spread of the folds (percentage points).`, `Area berwarna: ± ${pts(a.full.sd)}, sebaran antar fold (poin persentase).`), { size: 12, fill: 'var(--ink)' });
  body += text(320, py + ph + 58, tr('Only the two bars that leave it earn their place.', 'Hanya dua batang yang keluar darinya yang layak dipertahankan.'), { size: 12, fill: 'var(--ink)' });
  return svg(640, py + ph + 70, body);
}

// ---- Figure 4: the category feature, three ways ----
function leakFigure() {
  const d = data(), l = d.leak;
  const lanes = [
    [tr('Left out', 'Dibuang'), l.without, 2],
    [tr('Out-of-fold (honest)', 'Out-of-fold (jujur)'), l.outOfFold, 0],
    [tr('Naive (leaks)', 'Naive (leakage)'), l.naive, 1],
  ];
  const lo = 0.7, hi = 0.95, px = 170, pw = 440, py = 40, rowH = 50;
  const X = v => px + ((v - lo) / (hi - lo)) * pw;
  const ph = lanes.length * rowH;
  let body = text(320, 20, tr('Cross-validated accuracy of the eight features plus region', 'Akurasi cross-validation delapan feature ditambah region'), { fill: 'var(--ink)', weight: 700, size: 14 });
  body += box(px, py, pw, ph, 'var(--surface)', 'var(--line)');
  [0.7, 0.75, 0.8, 0.85, 0.9, 0.95].forEach(v => {
    body += line(X(v), py, X(v), py + ph, { c: 'var(--line)', w: 1 }) + text(X(v), py + ph + 18, `${fmt(v * 100, { digits: 0 })}%`, { size: 12, fill: 'var(--ink)' });
  });
  lanes.forEach(([name, r, c], i) => {
    const y = py + rowH * i + rowH / 2;
    body += text(px - 12, y + 4, name, { anchor: 'end', size: 13, fill: 'var(--ink)', weight: 600 });
    body += line(X(r.mean - r.sd), y, X(r.mean + r.sd), y, { c: 'var(--ink)', w: 2 });
    body += line(X(r.mean - r.sd), y - 6, X(r.mean - r.sd), y + 6, { c: 'var(--ink)', w: 2 }) + line(X(r.mean + r.sd), y - 6, X(r.mean + r.sd), y + 6, { c: 'var(--ink)', w: 2 });
    body += dot(X(r.mean), y, k(c), 8);
    body += text(X(r.mean), y - 14, `${pts(r.mean)}% ± ${pts(r.sd)}`, { size: 12, fill: 'var(--ink)', weight: 700 });
  });
  const yb = py + ph + 40, xa = X(l.outOfFold.mean), xb = X(l.naive.mean);
  body += line(xa, yb - 6, xa, yb + 6, { c: 'var(--ink)', w: 2 }) + line(xb, yb - 6, xb, yb + 6, { c: 'var(--ink)', w: 2 }) + line(xa, yb, xb, yb, { c: 'var(--ink)', w: 2 });
  body += text((xa + xb) / 2, yb + 20, tr(`${pts(l.naive.mean - l.outOfFold.mean)} points that are each row's own label`, `${pts(l.naive.mean - l.outOfFold.mean)} poin yang berasal dari label baris itu sendiri`), { size: 13, fill: 'var(--ink)', weight: 700 });
  return svg(640, yb + 34, body);
}

export const figures = {
  'five-splits': fiveSplits,
  'forward-steps': forwardFigure,
  'ablation-drops': ablationFigure,
  leak: leakFigure,
};
