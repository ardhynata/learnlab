// Figures for the lesson "Subgroup metrics and fairness": [[figure:subgroup-metrics-and-fairness/name|Caption]].
// Real data: a one-line rule on the 333 penguins with body mass and sex recorded (Gentoo if mass >= 4700 g).
// Generated data: a made-up flag tool in two colonies, A (base rate 0.40) and B (base rate 0.20).
// Cell colors match the other classification figures: TP teal, FP gold, TN blue, FN purple.
import { svg, text, line, k, soft, tr, fmt, pct } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const tint = i => `color-mix(in srgb, var(--k${i}) 22%, var(--surface))`;
const TP = 2, FP = 3, TN = 4, FN = 5;

// Penguin rule, counts checked against penguins.csv (rows with body mass and sex).
const ALL = { n: 333, ok: 303, found: 93, pos: 119 };
const FEMALE = { n: 165, ok: 139, found: 32, pos: 58 };
const MALE = { n: 168, ok: 164, found: 61, pos: 61 };

// Figure 1: accuracy and recall of the same rule, overall and per sex.
function groupGap() {
  const groups = [
    { name: tr('All', 'Semua'), g: ALL, c: 4 },
    { name: tr('Female', 'Betina'), g: FEMALE, c: 5 },
    { name: tr('Male', 'Jantan'), g: MALE, c: 2 },
  ];
  const panels = [
    { x0: 50, title: tr('Accuracy', 'Accuracy'), value: g => g.ok / g.n },
    { x0: 370, title: tr('Gentoo found (recall)', 'Gentoo terdeteksi (recall)'), value: g => g.found / g.pos },
  ];
  const TOP = 64, BOT = 248, H = BOT - TOP, W = 250, bw = 58;
  const Y = v => BOT - v * H;
  const body = panels.map(p => {
    const grid = [0, 0.5, 1].map(v => `${line(p.x0, Y(v), p.x0 + W, Y(v), { w: 1 })}${text(p.x0 - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('');
    const bars = groups.map((gr, i) => {
      const cx = p.x0 + 20 + bw / 2 + i * ((W - 40 - bw) / 2);
      const v = p.value(gr.g);
      return `<rect x="${cx - bw / 2}" y="${Y(v)}" width="${bw}" height="${Math.max(v * H, 1.5)}" rx="4" fill="${k(gr.c)}" stroke="var(--ink)" stroke-width="1.2"/>
${text(cx, Y(v) - 7, fmt(v, { digits: 2 }), { size: 14, ...INK })}${text(cx, BOT + 20, gr.name, { size: 13, ...INK })}${text(cx, BOT + 38, `n = ${fmt(gr.g.n)}`, { size: 12 })}`;
    }).join('');
    return `${text(p.x0 + W / 2, 36, p.title, { size: 16, ...INK })}${grid}${bars}`;
  }).join('');
  return svg(660, 330, `${body}
${text(330, 322, tr('Rule: a penguin of 4700 g or more is called a Gentoo.', 'Aturan: penguin dengan massa 4700 g atau lebih disebut Gentoo.'), { size: 13 })}`);
}

// Figure 2: the error rate in narrower and narrower slices, with errors out of penguins.
function errorSlices() {
  const rows = [
    { label: tr('All penguins', 'Semua penguin'), e: 30, n: 333, c: 4 },
    { label: tr('Island Biscoe', 'Pulau Biscoe'), e: 28, n: 163, c: 3 },
    { label: tr('Biscoe, females', 'Biscoe, betina'), e: 26, n: 80, c: 3 },
    { label: tr('Gentoo females', 'Gentoo betina'), e: 26, n: 58, c: 5 },
    { label: tr('All other penguins', 'Semua penguin lainnya'), e: 4, n: 275, c: 4 },
  ];
  const L = 200, MAXW = 280, MAX = 0.5, rowH = 48, T = 36, bh = 26;
  const X = v => L + v / MAX * MAXW;
  const grid = [0, 0.25, 0.5].map(v => `${line(X(v), T - 6, X(v), T + rows.length * rowH - 10, { w: 1 })}${text(X(v), T - 14, pct(v, 0), { size: 12 })}`).join('');
  const bars = rows.map((r, i) => {
    const y = T + i * rowH, rate = r.e / r.n;
    return `${text(L - 12, y + bh / 2 + 5, r.label, { anchor: 'end', size: 14, ...INK })}
<rect x="${L}" y="${y}" width="${Math.max(rate / MAX * MAXW, 1.5)}" height="${bh}" rx="4" fill="${k(r.c)}" stroke="var(--ink)" stroke-width="1.2"/>
${text(X(rate) + 8, y + bh / 2 + 5, `${fmt(r.e)} / ${fmt(r.n)} = ${pct(rate)}`, { anchor: 'start', size: 13, ...INK })}`;
  }).join('');
  return svg(660, 300, `${grid}${bars}
${text(330, 288, tr('Error rate of the rule, with errors out of penguins in each slice.', 'Tingkat galat aturan, dengan jumlah galat dari penguin di setiap slice.'), { size: 13 })}`);
}

// Figure 3: the two colony tables and the three criteria.
function twoGroups() {
  const colonies = [
    { name: tr('Colony A', 'Koloni A'), base: 0.4, x: 110, c: { tp: 32, fn: 8, fp: 6, tn: 54 } },
    { name: tr('Colony B', 'Koloni B'), base: 0.2, x: 410, c: { tp: 16, fn: 4, fp: 8, tn: 72 } },
  ];
  const CW = 96, CH = 50, GAP = 4, Y1 = 62;
  const cell = (x, y, i, abbr, n) => `<rect x="${x}" y="${y}" width="${CW}" height="${CH}" rx="10" fill="${tint(i)}" stroke="${k(i)}" stroke-width="2.2"/>
${text(x + CW / 2, y + 22, abbr, { size: 12, ...INK })}${text(x + CW / 2, y + 42, fmt(n), { size: 20, weight: 800, fill: 'var(--ink)' })}`;
  const tables = colonies.map(col => {
    const { tp, fn, fp, tn } = col.c, x = col.x;
    return `${text(x + CW + GAP / 2, 22, `${col.name} (${tr('base rate', 'base rate')} ${fmt(col.base, { digits: 2 })})`, { size: 15, ...INK })}
${text(x + CW / 2, 52, tr('flagged', 'ber-flag'), { size: 12 })}${text(x + CW + GAP + CW / 2, 52, tr('not flagged', 'tanpa flag'), { size: 12 })}
${text(x - 8, Y1 + CH / 2 + 4, tr('has it', 'mengidap'), { anchor: 'end', size: 12 })}${text(x - 8, Y1 + CH + GAP + CH / 2 + 4, tr('does not', 'tidak'), { anchor: 'end', size: 12 })}
${cell(x, Y1, TP, 'TP', tp)}${cell(x + CW + GAP, Y1, FN, 'FN', fn)}${cell(x, Y1 + CH + GAP, FP, 'FP', fp)}${cell(x + CW + GAP, Y1 + CH + GAP, TN, 'TN', tn)}`;
  }).join('');
  const a = colonies[0].c, b = colonies[1].c;
  const metrics = [
    { label: tr('Flag rate (demographic parity)', 'Flag rate (demographic parity)'), a: (a.tp + a.fp) / 100, b: (b.tp + b.fp) / 100 },
    { label: tr('Recall (equal opportunity)', 'Recall (equal opportunity)'), a: a.tp / (a.tp + a.fn), b: b.tp / (b.tp + b.fn) },
    { label: tr('Precision (calibration)', 'Precision (calibration)'), a: a.tp / (a.tp + a.fp), b: b.tp / (b.tp + b.fp) },
  ];
  const MY = 236;
  const rows = metrics.map((m, i) => {
    const y = MY + i * 34, same = Math.abs(m.a - m.b) < 1e-9;
    return `<rect x="30" y="${y - 20}" width="600" height="28" rx="8" fill="${soft(same ? TP : FP)}"/>
${text(44, y, m.label, { anchor: 'start', size: 14, ...INK })}
${text(380, y, fmt(m.a, { digits: 2 }), { size: 15, ...INK })}${text(470, y, fmt(m.b, { digits: 2 }), { size: 15, ...INK })}
${text(570, y, same ? tr('equal', 'sama') : tr('differ', 'berbeda'), { size: 14, ...INK })}`;
  }).join('');
  return svg(660, 324, `${tables}
${text(380, 202, tr('Colony A', 'Koloni A'), { size: 13 })}${text(470, 202, tr('Colony B', 'Koloni B'), { size: 13 })}
${rows}`);
}

// Figure 4: precision of one tool (recall 0.80, false-positive rate 0.10) as the base rate changes.
function precisionBaseRate() {
  const L = 80, T = 30, W = 500, H = 220, MAXP = 0.6, R = 0.8, F = 0.1;
  const X = p => L + p / MAXP * W, Y = v => T + (1 - v) * H;
  const prec = p => R * p / (R * p + F * (1 - p));
  let d = '';
  for (let i = 0; i <= 60; i++) { const p = 0.005 + i / 60 * (MAXP - 0.005); d += `${i ? 'L' : 'M'}${X(p).toFixed(1)} ${Y(prec(p)).toFixed(1)}`; }
  const grid = [0, 0.5, 1].map(v => `${line(L, Y(v), L + W, Y(v), { w: 1 })}${text(L - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('');
  const ticks = [0, 0.2, 0.4, 0.6].map(p => `${text(X(p), T + H + 20, fmt(p, { digits: 1 }), { size: 12 })}`).join('');
  const mark = (p, name, c, dy) => `${line(X(p), Y(prec(p)), X(p), T + H, { dash: '4 4', w: 1.4, c: 'var(--muted)' })}
<circle cx="${X(p)}" cy="${Y(prec(p))}" r="7" fill="${k(c)}" stroke="var(--ink)" stroke-width="2"/>
${text(X(p) + 12, Y(prec(p)) + dy, `${name}: ${fmt(prec(p), { digits: 2 })}`, { anchor: 'start', size: 14, ...INK })}`;
  return svg(660, 320, `${grid}${ticks}
<path d="${d}" fill="none" stroke="var(--ink)" stroke-width="2.6" stroke-linecap="round"/>
${mark(0.2, tr('Colony B', 'Koloni B'), FP, 26)}${mark(0.4, tr('Colony A', 'Koloni A'), TP, 28)}
${text(L + W / 2, T + H + 44, tr('Base rate of the group', 'Base rate kelompok'), { size: 13, ...INK })}
${text(L - 8, T - 12, tr('Precision', 'Precision'), { anchor: 'end', size: 13, ...INK })}
${text(L + W / 2, 312, tr(`The tool is the same everywhere: recall ${fmt(R, { digits: 2 })} and false-positive rate ${fmt(F, { digits: 2 })}.`, `Alatnya sama di mana-mana: recall ${fmt(R, { digits: 2 })} dan false-positive rate ${fmt(F, { digits: 2 })}.`), { size: 13 })}`);
}

export const figures = {
  'group-gap': groupGap,
  'error-slices': errorSlices,
  'two-groups': twoGroups,
  'precision-base-rate': precisionBaseRate,
};
