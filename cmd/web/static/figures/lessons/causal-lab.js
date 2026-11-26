// Figures for the lesson "Causal lab" ([[figure:causal-lab/name|Caption]]). They show what the causal lab shows at its
// start state (DEFAULTS in sims/ml/causallab.js: 400 people, seed 7, confounding 1.5, true effect 2). Figures 1, 2 and 4
// are computed here at draw time from the same math the lab uses, so they cannot drift from it; figure 3 uses the
// averages of 200 repeated studies, which are too slow to recompute on every render, so those are written down below
// (taken from runStudy and summarizeRepeats for studies 0 to 199 of the lab's repeat run, to two decimals).
import { svg, text, line, k, tr, fmt, pct } from '../kit.js';
import { DEFAULTS, computeStudy, dataParams, scramble, powerCurve, peekingCurve } from '../../sims/ml/causallab.js';
import { makeCausalData, randomize, covariateBalance } from '../../sims/ml/causal.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const MUTED = { fill: 'var(--muted)' };
const tint = i => `color-mix(in srgb, var(--k${i}) 22%, var(--surface))`;
const node = (x, y, w, h, i, label) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${tint(i)}" stroke="${k(i)}" stroke-width="2.4"/>${text(x + w / 2, y + h / 2 + 5, label, { size: 14, ...INK })}`;
const d2 = v => fmt(v, { digits: 2 });
const minus = s => String(s).replace(/-/g, '−');
const signed = v => (Math.abs(v) < 0.005 ? d2(0) : (v > 0 ? '+' : '−') + d2(Math.abs(v)));
const num = v => minus(d2(v));

// Figure 1: the same people, two ways of deciding who is treated, and how unlike the two groups are on z.
function twoWorlds() {
  const data = makeCausalData(dataParams(DEFAULTS));
  const rct = randomize(data, scramble(1));
  const gapObs = Math.abs(covariateBalance(data).smd), gapRct = Math.abs(covariateBalance(rct).smd);
  const A = { c: 'var(--muted)', arrow: true };
  const panel = (x0, title, source, sourceTint, gap, note) => `${text(x0 + 150, 22, title, { size: 15, ...INK })}
${node(x0 + 80, 40, 140, 38, sourceTint, source)}
${node(x0 + 8, 140, 124, 38, 2, tr('Treated or not', 'Treated?'))}
${node(x0 + 176, 140, 120, 38, 1, tr('Outcome y', 'Outcome y'))}
${line(x0 + 120, 82, x0 + 76, 136, A)}
${line(x0 + 180, 82, x0 + 236, 136, A)}
${line(x0 + 136, 159, x0 + 172, 159, { c: 'var(--ink)', dash: '6 4', arrow: true })}
${text(x0 + 154, 150, '?', { size: 16, ...INK })}
${text(x0 + 150, 208, tr(`Gap in z between the groups: ${d2(gap)} sd`, `Selisih z antarkelompok: ${d2(gap)} sd`), { size: 13, ...INK })}
${text(x0 + 150, 226, note, { size: 12.5, ...MUTED })}`;
  // The left panel has two arrows out of z; the right panel has an arrow from the coin into the treatment only, and z
  // still points at the outcome (z is a part of the people, not of how they were assigned).
  const left = panel(0, tr('Observed study', 'Studi observasional'), tr('z (confounder)', 'z (confounder)'), 3, gapObs,
    tr('z pushes people into treatment and raises y', 'z mendorong orang ke treatment dan menaikkan y'));
  const right = `${text(490, 22, tr('Randomized experiment', 'Eksperimen acak'), { size: 15, ...INK })}
${node(340, 40, 120, 38, 4, tr('Coin flip', 'Lempar koin'))}
${node(520, 40, 120, 38, 3, 'z')}
${node(348, 140, 124, 38, 2, tr('Treated or not', 'Treated?'))}
${node(516, 140, 120, 38, 1, tr('Outcome y', 'Outcome y'))}
${line(400, 82, 410, 136, A)}
${line(580, 82, 576, 136, A)}
${line(476, 159, 512, 159, { c: 'var(--ink)', dash: '6 4', arrow: true })}
${text(494, 150, '?', { size: 16, ...INK })}
${text(490, 208, tr(`Gap in z between the groups: ${d2(gapRct)} sd`, `Selisih z antarkelompok: ${d2(gapRct)} sd`), { size: 13, ...INK })}
${text(490, 226, tr('only the coin decides who is treated', 'hanya koin yang menentukan siapa yang treated'), { size: 12.5, ...MUTED })}`;
  return svg(680, 246, `${left}${line(340, 12, 340, 238, { c: 'var(--line)', dash: '5 5', w: 1.5 })}${right}`);
}

// A row chart: one point (and a whisker) per row on a shared horizontal axis, with the true effect as a dashed line.
function rowChart({ rows, lo, hi, ticks, truth, width = 680, labelW = 190, top = 40, rowH = 36, axisTitle, truthLabel, footer, noteX }) {
  // noteX: when given, the numbers of every row sit in one column there and the plot ends before it.
  const x0 = labelW, x1 = noteX ? noteX - 16 : width - 24, X = v => x0 + (v - lo) / (hi - lo) * (x1 - x0);
  const h = top + rows.length * rowH + 60;
  const grid = ticks.map(t => `${line(X(t), top - 6, X(t), top + rows.length * rowH, { c: 'var(--line)', w: 1.2 })}${text(X(t), top + rows.length * rowH + 18, minus(fmt(t)), { size: 12 })}`).join('');
  const truthLine = `${line(X(truth), top - 14, X(truth), top + rows.length * rowH, { c: 'var(--ink)', dash: '6 4', w: 2 })}${text(X(truth), top - 20, truthLabel, { size: 12.5, ...INK })}`;
  const body = rows.map((r, i) => {
    const cy = top + (i + 0.5) * rowH;
    const label = `${text(10, cy + 4, r.label, { anchor: 'start', size: r.sub ? 12.5 : 13.5, weight: r.sub ? 500 : 700, fill: r.sub ? 'var(--muted)' : 'var(--ink)' })}`;
    const whisker = `${line(X(r.from), cy, X(r.to), cy, { c: r.color, w: 3 })}${line(X(r.from), cy - 6, X(r.from), cy + 6, { c: r.color, w: 3 })}${line(X(r.to), cy - 6, X(r.to), cy + 6, { c: r.color, w: 3 })}`;
    const mark = `<circle cx="${X(r.mid)}" cy="${cy}" r="6" fill="${r.color}" stroke="var(--ink)" stroke-width="1.5"/>`;
    const note = !r.note ? '' : noteX ? text(noteX, cy + 4, r.note, { anchor: 'start', size: 12.5, ...INK }) : text(Math.min(X(r.to) + 10, x1 - 4), cy + 4, r.note, { anchor: X(r.to) + 10 > x1 - 100 ? 'end' : 'start', size: 12.5, ...INK });
    return `${label}${whisker}${mark}${note}`;
  }).join('');
  return svg(width, h, `${grid}${truthLine}${body}${text((x0 + x1) / 2, h - 20, axisTitle, { size: 13, ...INK })}${footer ? text((x0 + x1) / 2, h - 4, footer, { size: 12 }) : ''}`);
}

// Figure 2: the lab's table at its start state, as intervals against the true effect.
function defaultEstimates() {
  const s = computeStudy(DEFAULTS, 1);
  const name = {
    naive: tr('Naive difference', 'Selisih naif'),
    stratified: tr('Stratified (5 groups of z)', 'Stratifikasi (5 kelompok z)'),
    regression: tr('Regression adjustment', 'Penyesuaian regresi'),
    ipw: tr('Inverse propensity (IPW)', 'Inverse propensity (IPW)'),
    randomized: tr('Randomized experiment', 'Eksperimen acak'),
  };
  const rows = ['naive', 'stratified', 'regression', 'ipw', 'randomized'].map(id => {
    const r = s.rows.find(x => x.id === id);
    return { label: name[id], from: r.ci[0], to: r.ci[1], mid: r.estimate, color: r.covers ? k(2) : k(1), note: `${num(r.estimate)}${r.covers ? '' : tr('  (misses)', '  (meleset)')}` };
  });
  return rowChart({
    rows, lo: 0, hi: 6, ticks: [0, 1, 2, 3, 4, 5, 6], truth: s.ate, labelW: 196,
    truthLabel: tr(`True effect ${d2(s.ate)}`, `Efek sebenarnya ${d2(s.ate)}`),
    axisTitle: tr('Estimated effect with its 95% interval', 'Efek yang diestimasi dengan interval 95%'),
    footer: tr('Start state of the lab: 400 people, first randomized experiment.', 'Keadaan awal lab: 400 orang, eksperimen acak pertama.'),
  });
}

// Figure 3: 200 repeated studies, mean and one standard deviation of the estimates (two decimals, from the lab's repeat run).
const REPEATED = {
  400: { naive: [4.15, 0.20], regression: [2.00, 0.12], randomized: [1.96, 0.21] },
  1600: { naive: [4.14, 0.10], regression: [2.00, 0.06], randomized: [2.00, 0.11] },
};
function biasVsNoise() {
  const name = { naive: tr('Naive', 'Naif'), regression: tr('Regression', 'Regresi'), randomized: tr('Randomized', 'Acak') };   // the short names of the lab's repeat chart
  const rows = [];
  for (const id of ['naive', 'regression', 'randomized']) {
    for (const n of [400, 1600]) {
      const [mean, sd] = REPEATED[n][id];
      rows.push({
        label: tr(`${name[id]} · ${fmt(n)} people`, `${name[id]} · ${fmt(n)} orang`), from: mean - sd, to: mean + sd, mid: mean,
        color: Math.abs(mean - 2) > 0.5 ? k(1) : k(2),
        note: tr(`bias ${signed(mean - 2)} · spread ${d2(sd)}`, `bias ${signed(mean - 2)} · sebaran ${d2(sd)}`),
      });
    }
  }
  return rowChart({
    rows, lo: 1.5, hi: 4.7, ticks: [2, 3, 4], truth: 2, labelW: 200, noteX: 520, rowH: 32,
    truthLabel: tr(`True effect ${d2(2)}`, `Efek sebenarnya ${d2(2)}`),
    axisTitle: tr('Average estimate over 200 studies, ± one spread', 'Rata-rata estimasi dari 200 studi, ± satu sebaran'),
    footer: tr('Four times the people shrinks the spread, not the bias.', 'Empat kali lebih banyak orang mengecilkan sebaran, bukan bias.'),
  });
}

// Figure 4: the lab's two design panels. Left: power against people per group (effect 0.5, spread 1 and 2).
// Right: false positives when there is no real effect and you peek (50 people per group, alpha 0.05, 1,200 simulated trials).
function powerAndPeeking() {
  const W = 680, H = 290, base = 238, top = 44;
  const left = (() => {
    const x0 = 56, x1 = 316, X = n => x0 + (n / 300) * (x1 - x0), Y = p => base - p * (base - top);
    const curve = (sd, color) => {
      const c = powerCurve({ effect: 0.5, sd, alpha: 0.05, n: 50 });
      const pts = c.xs.map((n, i) => [n, c.ys[i]]).filter(([n]) => n <= 300).map(([n, p]) => `${X(n).toFixed(1)},${Y(p).toFixed(1)}`).join(' ');
      return { c, path: `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>` };
    };
    const a = curve(1, k(2)), b = curve(2, k(1));
    const dotAt = (n, p, color) => `<circle cx="${X(n)}" cy="${Y(p)}" r="6" fill="${color}" stroke="var(--ink)" stroke-width="1.5"/>`;
    const grid = [0, 0.25, 0.5, 0.75, 1].map(p => `${line(x0, Y(p), x1, Y(p), { c: p === 0 ? 'var(--muted)' : 'var(--line)', w: 1.2 })}${text(x0 - 6, Y(p) + 4, pct(p, 0), { anchor: 'end', size: 11.5 })}`).join('')
      + [0, 100, 200, 300].map(n => `${text(X(n), base + 16, fmt(n), { size: 11.5 })}`).join('');
    const target = `${line(x0, Y(0.8), x1, Y(0.8), { c: 'var(--ink)', dash: '5 4', w: 1.5 })}${text(214, Y(0.8) - 6, tr('80% power', 'power 80%'), { size: 12, ...INK })}`;
    return `${text((x0 + x1) / 2, 20, tr('Power against people per group', 'Power menurut orang per kelompok'), { size: 14, ...INK })}
${grid}${target}${a.path}${b.path}${dotAt(50, a.c.power, k(2))}${dotAt(50, b.c.power, k(1))}
${dotAt(a.c.nFor80, 0.8, k(2))}${dotAt(b.c.nFor80, 0.8, k(1))}
${text(X(50) + 10, Y(a.c.power) + 18, pct(a.c.power), { anchor: 'start', size: 12.5, ...INK })}
${text(X(50) + 10, Y(b.c.power) + 18, pct(b.c.power), { anchor: 'start', size: 12.5, ...INK })}
${text(X(a.c.nFor80) + 2, Y(0.8) + 22, `${fmt(a.c.nFor80)}`, { anchor: 'start', size: 12.5, ...INK })}
${text(X(b.c.nFor80) + 8, Y(0.8) + 22, `${fmt(b.c.nFor80)}`, { anchor: 'start', size: 12.5, ...INK })}
${text(x0 + 96, Y(0.97), tr('spread 1', 'sebaran 1'), { anchor: 'start', size: 12.5, fill: k(2) })}
${text(x1 - 6, Y(0.38), tr('spread 2', 'sebaran 2'), { anchor: 'end', size: 12.5, fill: k(1) })}
${text((x0 + x1) / 2, H - 6, tr(`People per group (effect ${fmt(0.5)})`, `Orang per kelompok (efek ${fmt(0.5)})`), { size: 12.5, ...INK })}`;
  })();
  const right = (() => {
    const pk = peekingCurve({ n: 50, alpha: 0.05, maxLooks: 10, runs: 1200, seed: 11 });
    const x0 = 392, x1 = 656, maxY = 0.25, X = l => x0 + ((l - 1) / 9) * (x1 - x0), Y = p => base - (p / maxY) * (base - top);
    const path = (ys, color) => `<polyline points="${pk.looks.map((l, i) => `${X(l).toFixed(1)},${Y(ys[i]).toFixed(1)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>`;
    const grid = [0, 0.05, 0.1, 0.15, 0.2, 0.25].map(p => `${line(x0, Y(p), x1, Y(p), { c: p === 0 ? 'var(--muted)' : 'var(--line)', w: 1.2 })}${text(x0 - 6, Y(p) + 4, pct(p, 0), { anchor: 'end', size: 11.5 })}`).join('')
      + [1, 2, 5, 10].map(l => text(X(l), base + 16, fmt(l), { size: 11.5 })).join('');
    const target = `${line(x0, Y(0.05), x1, Y(0.05), { c: 'var(--ink)', dash: '5 4', w: 1.5 })}`;
    const at = l => ({ p: pk.peek[l - 1], b: pk.bonferroni[l - 1] });
    const m5 = at(5), m10 = at(10);
    const dotAt = (l, p, color) => `<circle cx="${X(l)}" cy="${Y(p)}" r="5.5" fill="${color}" stroke="var(--ink)" stroke-width="1.5"/>`;
    return `${text((x0 + x1) / 2, 20, tr('False positives when you peek', 'False positive saat kamu mengintip'), { size: 14, ...INK })}
${grid}${target}${path(pk.peek, k(1))}${path(pk.bonferroni, k(2))}${dotAt(5, m5.p, k(1))}${dotAt(10, m10.p, k(1))}${dotAt(5, m5.b, k(2))}
${text(X(5) - 6, Y(m5.p) - 10, pct(m5.p), { anchor: 'end', size: 12.5, ...INK })}
${text(X(10) - 4, Y(m10.p) - 10, pct(m10.p), { anchor: 'end', size: 12.5, ...INK })}
${text(X(5), Y(m5.b) + 20, pct(m5.b), { size: 12.5, ...INK })}
${text(x1, Y(0.05) - 6, tr('target 5%', 'target 5%'), { anchor: 'end', size: 12, ...INK })}
${text(X(7.5), Y(0.115), tr('Peeking', 'Mengintip'), { size: 12.5, fill: k(1) })}
${text(X(8), Y(pk.bonferroni[7]) + 17, tr('Corrected', 'Dikoreksi'), { size: 12.5, fill: k(2) })}
${text((x0 + x1) / 2, H - 6, tr('Number of looks (50 per group)', 'Jumlah pengecekan (50 per kelompok)'), { size: 12, ...INK })}`;
  })();
  return svg(W, H, `${left}${line(340, 12, 340, H - 12, { c: 'var(--line)', dash: '5 5', w: 1.5 })}${right}`);
}

export const figures = { 'two-worlds': twoWorlds, 'default-estimates': defaultEstimates, 'bias-vs-noise': biasVsNoise, 'power-and-peeking': powerAndPeeking };
