// Figures for the lesson "Monitoring lab": [[figure:monitoring-lab/name|Caption]].
// Every number comes from the lab's own maths (sims/ml/monitoringlab.js) at its default stream (seed 1, 60 days, 200 predictions a day,
// the event on day 25, shown days 1..60), read at the days the lesson names:
//   - skew run: input and score monitors alert on day 26, the first label of day 25 arrives on day 32, the accuracy monitor alerts on day 36;
//   - cost of the four options on the skew run when decided on day 26 and on day 36 (fixed cost + 0.05 per wrong prediction afterwards);
//   - label shift: the model's mean score against the positives seen, on the labels that had arrived by days 28, 40 and 60;
//   - first alert days and the cheapest option on the day of the first alert, for the five scenarios.
import { svg, text, line, box, k, soft, diamond, tr, fmt, pct } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const EVENT_DAY = 25;
const OPT_COL = [1, 0, 3, 2];   // colour of roll back, recalibrate, retrain, keep watching, the same in the two figures that show them

// ---- Figure 1: the monitors race --------------------------------------------------------------------------
function alertRace() {
  const X0 = 196, X1 = 624, DAYS = 60, TOP = 62, STEP = 52;
  const x = d => X0 + ((d - 1) / (DAYS - 1)) * (X1 - X0);
  const lanes = [
    { c: 1, day: 26, label: tr(['Input drift (PSI)', 'spend PSI above 0.25'], ['Drift input (PSI)', 'PSI spend di atas 0,25']), note: tr(`day ${fmt(26)}`, `hari ${fmt(26)}`) },
    { c: 4, day: 26, label: tr(['Score drift (PSI)', 'scores PSI above 0.25'], ['Drift skor (PSI)', 'PSI skor di atas 0,25']), note: tr(`day ${fmt(26)}`, `hari ${fmt(26)}`) },
    { c: 3, day: 32, label: tr(['Labels of day 25', 'arrive 7 days later'], ['Label hari ke-25', 'tiba 7 hari kemudian']), note: tr(`day ${fmt(32)}`, `hari ${fmt(32)}`), mark: true },
    { c: 0, day: 36, label: tr(['Accuracy (delayed labels)', 'below 76.2% twice in a row'], ['Akurasi (label terlambat)', 'di bawah 76,2% dua hari berturut']), note: tr(`day ${fmt(36)}`, `hari ${fmt(36)}`) },
  ];
  const AY = TOP + lanes.length * STEP + 24;
  const rows = lanes.map((ln, i) => {
    const y = TOP + i * STEP;
    const head = `${text(186, y + 3, ln.label[0], { anchor: 'end', size: 13, ...INK })}${text(186, y + 19, ln.label[1], { anchor: 'end', size: 12 })}`;
    const bar = ln.mark
      ? `${diamond(x(ln.day), y + 4, k(ln.c), 9)}`
      : `<rect x="${x(EVENT_DAY)}" y="${y - 4}" width="${x(ln.day) - x(EVENT_DAY)}" height="16" rx="4" fill="${soft(ln.c)}" stroke="${k(ln.c)}" stroke-width="1.8"/>
<circle cx="${x(ln.day)}" cy="${y + 4}" r="6" fill="${k(ln.c)}" stroke="var(--ink)" stroke-width="1.6"/>`;
    return `${head}${bar}${text(x(ln.day) + 14, y + 8, ln.note, { anchor: 'start', size: 13, ...INK })}`;
  }).join('');
  const gapY = TOP + (lanes.length - 1) * STEP + 34;
  const ticks = [1, 10, 20, 30, 40, 50, 60].map(d => `${line(x(d), AY, x(d), AY + 6, { c: 'var(--muted)', w: 1.6 })}${text(x(d), AY + 22, fmt(d), { size: 12 })}`).join('');
  return svg(640, AY + 56, `
${line(x(EVENT_DAY), 38, x(EVENT_DAY), AY, { c: 'var(--ink)', w: 1.6, dash: '4 3' })}
${text(x(EVENT_DAY), 26, tr(`release on day ${fmt(EVENT_DAY)}: spend served x ${fmt(100)}`, `rilis pada hari ${fmt(EVENT_DAY)}: spend dikirim x ${fmt(100)}`), { size: 13, ...INK })}
${rows}
${line(x(26), gapY, x(36), gapY, { c: 'var(--muted)', w: 2, arrow: true })}
${text(x(26) + 2, gapY + 20, tr(`${fmt(10)} days after the input alert`, `${fmt(10)} hari setelah alert input`), { anchor: 'start', size: 12, ...INK })}
${line(X0, AY, X1, AY, { c: 'var(--muted)', w: 1.6 })}${ticks}
${text(X1, AY + 44, tr('day', 'hari'), { anchor: 'end', size: 12 })}`);
}

// ---- Figure 2: the same bug decided on two days ------------------------------------------------------------
// Total cost of each option, read from the Decision table on day 26 and on day 36 of the default skew run.
const COSTS = [
  { day: 26, v: [85.7, 104.4, 112.4, 102.5] },
  { day: 36, v: [61.3, 75.3, 58.2, 73.2] },
];
function costByDay() {
  const W = 640, BASE = 232, TOPY = 44, MAX = 120;
  const y = v => BASE - (v / MAX) * (BASE - TOPY);
  const names = [tr('Roll back', 'Rollback'), tr('Recalibrate', 'Kalibrasi ulang'), tr('Retrain', 'Latih ulang'), tr('Keep watching', 'Terus pantau')];
  const cols = OPT_COL;
  const GX = [70, 360], GW = 270;
  const grid = [0, 40, 80, 120].map(v => `${line(GX[0] - 14, y(v), GX[1] + GW, y(v), { c: 'var(--line)', w: 1 })}${text(GX[0] - 22, y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('');
  const groups = COSTS.map((g, gi) => {
    const best = g.v.indexOf(Math.min(...g.v));
    const bars = g.v.map((v, i) => {
      const w = 50;
      const x = GX[gi] + i * 64;
      const top = y(v);
      return `<rect x="${x}" y="${top}" width="${w}" height="${BASE - top}" rx="4" fill="${soft(cols[i])}" stroke="${k(cols[i])}" stroke-width="${i === best ? 3.2 : 1.8}"/>
${text(x + w / 2, top - 7, fmt(v, { digits: 1 }), { size: 12, ...INK })}
${i === best ? text(x + w / 2, top - 22, tr('cheapest', 'termurah'), { size: 12, weight: 700, fill: k(cols[i]) }) : ''}`;
    }).join('');
    return `${bars}${text(GX[gi] + 126, BASE + 22, tr(`decided on day ${fmt(g.day)}`, `diputuskan pada hari ${fmt(g.day)}`), { size: 13, ...INK })}`;
  }).join('');
  const legend = names.map((n, i) => `<rect x="${12 + i * 158}" y="278" width="14" height="14" rx="3" fill="${soft(cols[i])}" stroke="${k(cols[i])}" stroke-width="1.8"/>${text(32 + i * 158, 290, n, { anchor: 'start', size: 12, fill: 'var(--ink)' })}`).join('');
  return svg(W, 304, `${grid}${line(GX[0] - 14, BASE, GX[1] + GW, BASE, { c: 'var(--muted)', w: 1.6 })}${groups}
${text(GX[0] - 14, 18, tr('Total cost, in units', 'Total biaya, dalam unit'), { anchor: 'start', size: 13, ...INK })}
${legend}`);
}

// ---- Figure 3: label shift, scores against what happened ---------------------------------------------------
const SHIFT = [
  { day: 28, score: 0.496, seen: 0.510 },
  { day: 40, score: 0.378, seen: 0.254 },
  { day: 60, score: 0.303, seen: 0.130 },
];
function labelShift() {
  const BASE = 214, TOPY = 40, MAX = 0.6, X0 = 70;
  const y = v => BASE - (v / MAX) * (BASE - TOPY);
  const grid = [0, 0.2, 0.4, 0.6].map(v => `${line(X0 - 10, y(v), 624, y(v), { c: 'var(--line)', w: 1 })}${text(X0 - 18, y(v) + 4, pct(v, 0), { anchor: 'end', size: 12 })}`).join('');
  const groups = SHIFT.map((g, i) => {
    const gx = X0 + 20 + i * 188;
    const bar = (dx, v, c) => `<rect x="${gx + dx}" y="${y(v)}" width="62" height="${BASE - y(v)}" rx="4" fill="${soft(c)}" stroke="${k(c)}" stroke-width="1.8"/>${text(gx + dx + 31, y(v) - 7, pct(v, 0), { size: 12, ...INK })}`;
    return `${bar(0, g.score, 0)}${bar(72, g.seen, 3)}${text(gx + 67, BASE + 22, tr(`day ${fmt(g.day)}`, `hari ${fmt(g.day)}`), { size: 13, ...INK })}`;
  }).join('');
  const legend = `<rect x="${X0 - 10}" y="248" width="14" height="14" rx="3" fill="${soft(0)}" stroke="${k(0)}" stroke-width="1.8"/>${text(X0 + 10, 260, tr('mean score the model gave', 'skor rata-rata dari model'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
<rect x="${X0 + 220}" y="248" width="14" height="14" rx="3" fill="${soft(3)}" stroke="${k(3)}" stroke-width="1.8"/>${text(X0 + 240, 260, tr('positives actually seen', 'positif yang benar-benar muncul'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}`;
  return svg(640, 272, `${grid}${line(X0 - 10, BASE, 624, BASE, { c: 'var(--muted)', w: 1.6 })}${groups}
${text(X0 - 10, 18, tr('Labelled rows from the last 21 days that had arrived', 'Baris berlabel dari 21 hari terakhir yang sudah tiba'), { anchor: 'start', size: 13, ...INK })}
${legend}`);
}

// ---- Figure 4: five scenarios, which monitor fires and what is cheapest then -----------------------------------
// first alert day (null = none in the run) of the three monitors, and the option with the lowest total cost when decided on the
// day of the first alert of any monitor.
const SCENARIOS = [
  { name: tr('Covariate drift', 'Covariate drift'), a: [26, 26, null], fix: 3, first: 26 },
  { name: tr('Training-serving skew bug', 'Bug training-serving skew'), a: [26, 26, 36], fix: 0, first: 26 },
  { name: tr('Label shift', 'Label shift'), a: [28, 26, null], fix: 3, first: 26 },
  { name: tr('Concept shift', 'Concept shift'), a: [null, null, 34], fix: 2, first: 34 },
  { name: tr('Delayed labels with drift', 'Label terlambat dengan drift'), a: [26, 26, 47], fix: 3, first: 26 },
];
function scenarioMap() {
  const names = [tr('Roll back', 'Rollback'), tr('Recalibrate', 'Kalibrasi ulang'), tr('Retrain', 'Latih ulang'), tr('Keep watching', 'Terus pantau')];
  const heads = [tr(['Input', 'drift'], ['Drift', 'input']), tr(['Score', 'drift'], ['Drift', 'skor']), tr(['Accuracy', 'monitor'], ['Monitor', 'akurasi']), tr(['Cheapest on the', 'first alert day'], ['Termurah pada hari', 'alert pertama'])];
  const LX = 8, CX = [214, 288, 362], CW = 66, FX = 440, FW = 192, TOP = 52, RH = 42;
  const hd = [0, 1, 2].map(i => `${text(CX[i] + CW / 2, 20, heads[i][0], { size: 12, ...INK })}${text(CX[i] + CW / 2, 36, heads[i][1], { size: 12, ...INK })}`).join('')
    + `${text(FX + FW / 2, 20, heads[3][0], { size: 12, ...INK })}${text(FX + FW / 2, 36, heads[3][1], { size: 12, ...INK })}`;
  const rows = SCENARIOS.map((s, r) => {
    const y = TOP + r * RH;
    const cells = s.a.map((d, i) => d == null
      ? `${box(CX[i], y, CW, 32, 'var(--surface)', 'var(--line)')}${text(CX[i] + CW / 2, y + 21, tr('never', 'tidak ada'), { size: 12 })}`
      : `${box(CX[i], y, CW, 32, soft(i === 2 ? 0 : i === 0 ? 1 : 4), i === 2 ? k(0) : i === 0 ? k(1) : k(4))}${text(CX[i] + CW / 2, y + 21, tr(`day ${fmt(d)}`, `hari ${fmt(d)}`), { size: 12, ...INK })}`).join('');
    return `${text(LX, y + 21, s.name, { anchor: 'start', size: 12, fill: 'var(--ink)' })}${cells}
${box(FX, y, FW, 32, soft(OPT_COL[s.fix]), k(OPT_COL[s.fix]))}${text(FX + FW / 2, y + 21, `${names[s.fix]}, ${tr(`day ${fmt(s.first)}`, `hari ${fmt(s.first)}`)}`, { size: 12, ...INK })}`;
  }).join('');
  return svg(640, TOP + SCENARIOS.length * RH + 6, `${hd}${rows}`);
}

export const figures = {
  'alert-race': alertRace,
  'cost-by-day': costByDay,
  'label-shift': labelShift,
  'scenario-map': scenarioMap,
};
