// Figures for the lesson "Validation lab": [[figure:validation-lab/name|Caption]].
//
// Where the numbers come from. Every generated-data number is computed here with the lab's own math
// (sims/ml/validation.js and sims/ml/validationlab.js) on the lab's default table: 40 people with 8 records
// each, person quirk strength 2, k = 5, 5 folds, seed 1, so each figure agrees with what the lab shows after
// Reset. The optimism gap is the difference of the two means as they are printed (one decimal), like the lab.
//  - PENGUINS: figures are drawn synchronously and cannot fetch the csv, so the real-data runs are constants.
//    They are the lab's own: penguinTable(table, target), compareSplits with standardize, k = 5, 5 folds,
//    seed 1. SEX is the 333 penguins with four measurements and a recorded sex, SPECIES the 342 with
//    measurements. Random folds are in fold order; the islands (leave-one-island-out) are Biscoe, Dream and
//    Torgersen in the order the lab lists them.
import { svg, dot, text, line, box, k, tr, fmt } from '../kit.js';
import { makeEntityData, entityXY, crossValidate } from '../../sims/ml/validation.js';
import { compareSplits, searchCompare, knnPredictor } from '../../sims/ml/validationlab.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const DEFAULTS = { people: 40, recordsEach: 8, folds: 5, k: 5, seed: 1, quirk: 2 };

const RANDOM = 1, GROUPED = 0;   // the lab's lane colors: random k-fold k(1), grouped k(0)

// One generated table and its comparison, as the lab builds them.
function generated(quirk = DEFAULTS.quirk) {
  const rows = makeEntityData({ people: DEFAULTS.people, recordsEach: DEFAULTS.recordsEach, signal: 1, personEffect: quirk, seed: DEFAULTS.seed });
  const { X, y, groups } = entityXY(rows);
  const cmp = compareSplits({ X, y, groups, times: rows.map(r => r.time), folds: DEFAULTS.folds, seed: DEFAULTS.seed, model: { k: DEFAULTS.k }, temporal: false });
  return { X, y, groups, cmp };
}

const round1 = m => Number(new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, useGrouping: false }).format(m * 100));
const shownGap = (a, b) => (round1(a) - round1(b)) / 100;   // in accuracy, as the lab prints it
const points = v => fmt(v * 100, { digits: 1 });
const signed = v => (Math.abs(v) < 0.0005 ? fmt(0, { digits: 1 }) : (v > 0 ? '' : '−') + fmt(Math.abs(v) * 100, { digits: 1 }));
const meanOf = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const sdOf = xs => Math.sqrt(xs.reduce((a, b) => a + (b - meanOf(xs)) ** 2, 0) / (xs.length - 1));

// ---- a strip chart like the lab's -------------------------------------------------------------------
// lanes: [{ name, scores, color, tags? }]; the first two lanes get the optimism-gap bracket.
// Returns the SVG body for a block that starts at (0, top) and is 640 wide; `height` says how tall it is.
function strips({ top, lanes, baseline, lo, hi, ticks, gap, title, laneH = 74 }) {
  const L = 14, R = 626, W = R - L;
  const X = v => L + ((v - lo) / (hi - lo)) * W;
  const gapH = gap ? 44 : 0;
  const plotTop = top + (title ? 26 : 0);
  const laneTop = i => plotTop + i * laneH;
  const plotBottom = plotTop + lanes.length * laneH + gapH;
  let out = '';
  if (title) out += text(L, top + 16, title, { anchor: 'start', size: 14, ...INK });
  out += `<rect x="${L}" y="${plotTop}" width="${W}" height="${plotBottom - plotTop}" fill="var(--surface)" stroke="var(--line)" stroke-width="1.4" rx="6"/>`;
  out += ticks.map(t => `${line(X(t), plotTop, X(t), plotBottom, { c: 'var(--line)', w: 1 })}${text(X(t), plotBottom + 16, `${fmt(t * 100, { digits: 0 })}%`, { size: 12 })}`).join('');
  out += line(X(baseline), plotTop, X(baseline), plotBottom, { c: 'var(--muted)', w: 1.8, dash: '6 5' });
  lanes.forEach((ln, i) => {
    const y0 = laneTop(i) + (gap && i >= 2 ? gapH : 0);
    if (i > 0) out += line(L, y0, R, y0, { c: 'var(--line)', w: 1 });
    const mean = meanOf(ln.scores), sd = sdOf(ln.scores);
    out += text(L + 10, y0 + 21, ln.name, { anchor: 'start', size: 13, weight: 700, fill: 'var(--ink)' });
    out += text(R - 10, y0 + 21, tr(`mean ${points(mean)}% ± ${points(sd)}`, `rata-rata ${points(mean)}% ± ${points(sd)}`), { anchor: 'end', size: 12, weight: 500, fill: 'var(--ink)' });
    const cy = y0 + laneH - 20;
    out += line(X(mean), y0 + 30, X(mean), y0 + laneH - 6, { c: 'var(--ink)', w: 3.5 });
    const seen = new Map();   // equal scores are stacked, so none hides another
    ln.scores.forEach((s, j) => {
      const key = Math.round(s * 1000), level = seen.get(key) ?? 0;
      seen.set(key, level + 1);
      const y = cy - level * 9;
      out += `<circle cx="${X(s)}" cy="${y}" r="6" fill="${ln.color}" stroke="var(--surface)" stroke-width="1.6"/>`;
      if (ln.tags) out += text(Math.min(R - 30, X(s)), y - 11, ln.tags[j], { size: 11, fill: 'var(--ink)' }).replace('<text ', '<text stroke="var(--surface)" stroke-width="3" paint-order="stroke" ');
    });
  });
  if (gap) {
    const a = meanOf(lanes[0].scores), b = meanOf(lanes[1].scores);
    const yTop = laneTop(1) + laneH, y = yTop + 14;
    const xa = X(a), xb = X(b), dir = Math.sign(xb - xa) || 1;
    out += `<path d="M${xa} ${yTop}L${xa} ${y + 5}M${xb} ${yTop}L${xb} ${y + 5}M${xa} ${y}L${xb} ${y}" stroke="var(--ink)" stroke-width="1.6" fill="none"/>`;
    out += `<path d="M${xb} ${y}l${-dir * 7} -4v8z" fill="var(--ink)"/>`;
    const label = tr(`Optimism gap: ${signed(shownGap(a, b))} points`, `Selisih optimisme: ${signed(shownGap(a, b))} poin`);
    out += text(Math.min(R - 90, Math.max(L + 90, (xa + xb) / 2)), y + 24, label, { size: 13, ...INK });
  }
  out += text((L + R) / 2, plotBottom + 34, tr('Accuracy on the held-out fold', 'Akurasi pada fold yang ditahan'), { size: 12 });
  return { body: out, bottom: plotBottom + 40 };
}

// The legend line under a block of strips: the mean bar and the baseline.
function legendLine(y, label) {
  return `${line(44, y - 4, 44, y + 5, { c: 'var(--ink)', w: 3.5 })}${text(54, y + 4, tr('Mean of the folds', 'Rata-rata semua fold'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${line(214, y, 242, y, { c: 'var(--muted)', w: 1.8, dash: '6 5' })}${text(250, y + 4, label, { anchor: 'start', size: 12, fill: 'var(--ink)' })}`;
}

// ---- Figure 1: the default screen of the lab: random against grouped folds -------------------------
function defaultStrips() {
  const { cmp } = generated();
  const lanes = [
    { name: tr('Random k-fold', 'k-fold acak'), scores: cmp.random.scores, color: k(RANDOM) },
    { name: tr('Grouped k-fold (by person)', 'Grouped k-fold (per orang)'), scores: cmp.grouped.scores, color: k(GROUPED) },
  ];
  const s = strips({ top: 4, lanes, baseline: cmp.baseline, lo: 0.5, hi: 0.9, ticks: [0.5, 0.6, 0.7, 0.8, 0.9], gap: true });
  return svg(640, s.bottom + 26, `${s.body}${legendLine(s.bottom + 12, tr(`Always guess the majority label (${points(cmp.baseline)}%)`, `Selalu menebak label mayoritas (${points(cmp.baseline)}%)`))}`);
}

// ---- Figure 2: the quirk strength against the two means --------------------------------------------
function quirkSweep() {
  const strengths = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];
  const runs = strengths.map(q => ({ q, cmp: generated(q).cmp }));
  const baseline = runs[0].cmp.baseline;
  const gx = 64, gw = 456, gy = 24, gh = 214, lo = 0.55, hi = 0.85;
  const X = q => gx + (q / 4) * gw, Y = v => gy + gh - ((v - lo) / (hi - lo)) * gh;
  const path = (key, color, o = {}) => `<path d="M${runs.map(r => `${X(r.q)} ${Y(r.cmp[key].mean)}`).join('L')}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" ${o.dash ? 'stroke-dasharray="7 5"' : ''}/>`;
  const dots = key => runs.filter(r => Number.isInteger(r.q)).map(r => dot(X(r.q), Y(r.cmp[key].mean), key === 'random' ? k(RANDOM) : k(GROUPED), 5)).join('');
  const yTicks = [0.6, 0.7, 0.8].map(v => `${line(gx, Y(v), gx + gw, Y(v), { c: 'var(--line)', w: 1 })}${text(gx - 8, Y(v) + 4, `${fmt(v * 100, { digits: 0 })}%`, { anchor: 'end', size: 12 })}`).join('');
  const xTicks = [0, 1, 2, 3, 4].map(q => `${line(X(q), gy + gh, X(q), gy + gh + 5, { c: 'var(--muted)', w: 1.5 })}${text(X(q), gy + gh + 20, fmt(q), { size: 12 })}`).join('');
  const last = runs[runs.length - 1].cmp;
  const gapRow = [0, 1, 2, 3, 4].map(q => {
    const c = runs.find(r => r.q === q).cmp;
    return text(X(q), gy + gh + 80, signed(shownGap(c.random.mean, c.grouped.mean)), { size: 13, ...INK });
  }).join('');
  const body = `${box(gx, gy, gw, gh, 'var(--surface)', 'var(--line)')}${yTicks}
${line(X(DEFAULTS.quirk), gy, X(DEFAULTS.quirk), gy + gh, { c: 'var(--muted)', w: 1.4, dash: '3 4' })}
${text(X(DEFAULTS.quirk) + 6, gy + 15, tr('lab default', 'bawaan lab'), { anchor: 'start', size: 11 })}
${line(gx, Y(baseline), gx + gw, Y(baseline), { c: 'var(--muted)', w: 1.8, dash: '6 5' })}
${path('random', k(RANDOM))}${path('grouped', k(GROUPED))}${dots('random')}${dots('grouped')}
${xTicks}
${text(gx + gw / 2, gy + gh + 40, tr('Person quirk strength', 'Kekuatan ciri khas tiap orang'), { size: 13, fill: 'var(--ink)' })}
${text(gx + gw / 2, gy + gh + 62, tr('Optimism gap (points)', 'Selisih optimisme (poin)'), { size: 12, fill: 'var(--ink)' })}${gapRow}
${text(gx + gw + 10, Y(last.random.mean) + 4, tr('Random k-fold', 'k-fold acak'), { anchor: 'start', size: 12, weight: 700, fill: k(RANDOM) })}
${text(gx + gw + 10, Y(last.grouped.mean) + 10, tr('Grouped k-fold', 'Grouped k-fold'), { anchor: 'start', size: 12, weight: 700, fill: k(GROUPED) })}
${text(gx + gw + 10, Y(baseline) - 6, tr('Guess majority', 'Tebak mayoritas'), { anchor: 'start', size: 12, fill: 'var(--muted)' })}
${text(gx + gw + 10, Y(baseline) + 8, `(${points(baseline)}%)`, { anchor: 'start', size: 12, fill: 'var(--muted)' })}`;
  return svg(640, 330, body);
}

// ---- Figure 3: which settings each search tried, with the same budget ------------------------------
function searchPoints() {
  const { X, y, cmp } = generated();
  const evaluate = config => crossValidate({ X, y, fitPredict: knnPredictor({ k: config.k, weight: config.weight }), folds: cmp.grouped.folds }).mean;
  const res = searchCompare({ evaluate, budget: 16, seed: 1, kRange: { min: 1, max: 31 }, weightRange: { min: 0.25, max: 8 } });
  const kinds = r => new Set(r.results.map(x => x.config.k)).size;
  const weights = r => new Set(r.results.map(x => x.config.weight.toPrecision(6))).size;
  const panel = (x0, title, color, r, dashed) => {
    const w = 270, h = 214, top = 66;
    const PX = v => x0 + 34 + 9 + ((v - 1) / 30) * (w - 50 - 18);
    const PY = v => top + h - 9 - ((Math.log(v) - Math.log(0.25)) / (Math.log(8) - Math.log(0.25))) * (h - 18);
    const grid = [1, 11, 21, 31].map(v => `${line(PX(v), top, PX(v), top + h, { c: 'var(--line)', w: 1 })}${text(PX(v), top + h + 17, fmt(v), { size: 12 })}`).join('')
      + [0.25, 0.5, 1, 2, 4, 8].map(v => `${line(x0 + 34, PY(v), x0 + w - 16, PY(v), { c: 'var(--line)', w: 1 })}${text(x0 + 28, PY(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('');
    const pts = r.results.map(p => (dashed
      ? `<rect x="${PX(p.config.k) - 5}" y="${PY(p.config.weight) - 5}" width="10" height="10" rx="2" fill="${color}"/>`
      : dot(PX(p.config.k), PY(p.config.weight), color, 5.5))).join('');
    const b = r.best.config;
    const star = `<circle cx="${PX(b.k)}" cy="${PY(b.weight)}" r="11" fill="none" stroke="var(--ink)" stroke-width="2.4"/>`;
    return `${text(x0 + 34 + (w - 50) / 2, 22, title, { size: 14, ...INK })}
${text(x0 + 34 + (w - 50) / 2, 40, tr(`${fmt(kinds(r))} values of k, ${fmt(weights(r))} of the weight`, `${fmt(kinds(r))} nilai k, ${fmt(weights(r))} nilai bobot`), { size: 12, fill: 'var(--ink)' })}
${text(x0 + 34 + (w - 50) / 2, 57, tr(`Best ${points(r.best.score)}% (k = ${fmt(b.k)}, weight ${fmt(b.weight, { digits: 2 })})`, `Terbaik ${points(r.best.score)}% (k = ${fmt(b.k)}, bobot ${fmt(b.weight, { digits: 2 })})`), { size: 12, fill: 'var(--ink)' })}
${box(x0 + 34, top, w - 50, h, 'none', 'var(--line)')}${grid}${pts}${star}
${text(x0 + 34 + (w - 50) / 2, top + h + 36, tr('Neighbors (k)', 'Neighbor (k)'), { size: 12, fill: 'var(--ink)' })}`;
  };
  const body = `${panel(0, tr('Grid search', 'Grid search'), k(GROUPED), res.grid, true)}
${panel(320, tr('Random search', 'Random search'), k(RANDOM), res.random, false)}
${text(320, 338, tr('Vertical axis: the weight of the first feature, on a log scale. Circle: the best setting found.', 'Sumbu vertikal: bobot feature pertama, dalam skala log. Lingkaran: pengaturan terbaik yang ditemukan.'), { size: 12, fill: 'var(--ink)' })}`;
  return svg(640, 350, body);
}

// ---- Figure 4: the same two splits on the real penguins --------------------------------------------
const PENGUINS = {
  sex: {
    random: [0.9104477611940298, 0.9104477611940298, 0.835820895522388, 0.8939393939393939, 0.9545454545454546],
    islands: [0.6932515337423313, 0.7317073170731707, 0.9361702127659575], baseline: 168 / 333,
    lo: 0.6, hi: 1, ticks: [0.6, 0.7, 0.8, 0.9, 1],
  },
  species: {
    random: [1, 1, 0.9705882352941176, 0.9852941176470589, 1],
    islands: [0.2634730538922156, 0.45161290322580644, 0.9803921568627451], baseline: 151 / 342,
    lo: 0.2, hi: 1, ticks: [0.2, 0.4, 0.6, 0.8, 1],
  },
};
const ISLANDS = ['Biscoe', 'Dream', 'Torgersen'];

function penguinSplits() {
  const block = (top, key, title) => {
    const d = PENGUINS[key];
    return strips({
      top, title, baseline: d.baseline, lo: d.lo, hi: d.hi, ticks: d.ticks, gap: true, laneH: 70,
      lanes: [
        { name: tr('Random k-fold', 'k-fold acak'), scores: d.random, color: k(RANDOM) },
        { name: tr('Leave-one-island-out', 'Leave-one-island-out'), scores: d.islands, color: k(GROUPED), tags: ISLANDS },
      ],
    });
  };
  const a = block(2, 'sex', tr('Predict sex (333 penguins)', 'Prediksi jenis kelamin (333 penguin)'));
  const b = block(a.bottom + 4, 'species', tr('Predict species (342 penguins)', 'Prediksi spesies (342 penguin)'));
  return svg(640, b.bottom + 30, `${a.body}${b.body}${legendLine(b.bottom + 14, tr(`Always guess the majority label (${points(PENGUINS.sex.baseline)}% for sex, ${points(PENGUINS.species.baseline)}% for species)`, `Selalu menebak label mayoritas (${points(PENGUINS.sex.baseline)}% untuk jenis kelamin, ${points(PENGUINS.species.baseline)}% untuk spesies)`))}`);
}

export const figures = {
  'default-strips': defaultStrips,
  'quirk-sweep': quirkSweep,
  'search-points': searchPoints,
  'penguin-splits': penguinSplits,
};
