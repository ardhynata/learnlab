// Figures for "Class imbalance": a waffle of 10,000 payments, baseline against model, precision as the
// positive rate grows, and what resampling and class weights do to a toy set.
import { svg, dot, text, line, box, k, soft, tr, fmt } from '../kit.js';

const HONEST = 0, FRAUD = 1;
const ink = { fill: 'var(--ink)' };
const pc = v => `${fmt(v * 100)}%`;

// 100 squares of 100 payments each: one square is fraud.
function rareClass() {
  const size = 22, gap = 4, x0 = 30, y0 = 24;
  let cells = '';
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const fraud = r === 3 && c === 6;
      cells += `<rect x="${x0 + c * (size + gap)}" y="${y0 + r * (size + gap)}" width="${size}" height="${size}" rx="4" fill="${fraud ? k(FRAUD) : soft(HONEST)}" stroke="${fraud ? 'var(--ink)' : k(HONEST)}" stroke-width="${fraud ? 2.6 : 1.2}"/>`;
    }
  }
  const x = 350;
  return svg(660, 300, `
${cells}
${text(x, 56, tr(`${fmt(10000)} payments`, `${fmt(10000)} pembayaran`), { anchor: 'start', size: 18, weight: 700, ...ink })}
${box(x, 76, 22, 22, soft(HONEST), k(HONEST))}${text(x + 34, 93, tr(`${fmt(9900)} honest (${pc(0.99)})`, `${fmt(9900)} sah (${pc(0.99)})`), { anchor: 'start', size: 15 })}
${box(x, 110, 22, 22, k(FRAUD), 'var(--ink)')}${text(x + 34, 127, tr(`${fmt(100)} fraud (${pc(0.01)})`, `${fmt(100)} penipuan (${pc(0.01)})`), { anchor: 'start', size: 15 })}
${line(x, 160, 630, 160, { w: 1.4 })}
${text(x, 190, tr('A model that always says "honest":', 'Model yang selalu menjawab "sah":'), { anchor: 'start', size: 15, weight: 700, ...ink })}
${text(x, 216, tr(`accuracy ${pc(0.99)}`, `accuracy ${pc(0.99)}`), { anchor: 'start', size: 15 })}
${text(x, 238, tr('frauds found: none', 'penipuan yang ditemukan: nol'), { anchor: 'start', size: 15 })}
${text(x, 275, tr('1 square = 100 payments', '1 kotak = 100 pembayaran'), { anchor: 'start', size: 13 })}`);
}

// Four metrics for the always-honest baseline and for the trained model (TP 60, FN 40, FP 140, TN 9,760).
function baselineVsModel() {
  const L = 60, B = 250, H = 200, group = 140, bw = 46;
  const data = [
    [tr('Accuracy', 'Accuracy'), 0.99, 0.982],
    [tr('Precision', 'Precision'), null, 0.3],
    [tr('Recall', 'Recall'), 0, 0.6],
    [tr('F1', 'F1'), 0, 0.4],
  ];
  const Y = v => B - v * H;
  const grid = [0, 0.25, 0.5, 0.75, 1].map(v => `${line(L, Y(v), L + 4 * group, Y(v), { w: 1 })}${text(L - 8, Y(v) + 4, pc(v), { anchor: 'end', size: 12 })}`).join('');
  const bars = data.map(([name, a, b], i) => {
    const gx = L + i * group + group / 2;
    const bar = (x, v, c) => v == null
      ? text(x + bw / 2, B - 8, tr('n/a', 'n/a'), { size: 13, weight: 700 })
      : `<rect x="${x}" y="${Y(v)}" width="${bw}" height="${Math.max(v * H, 1.5)}" rx="4" fill="${k(c)}" stroke="var(--ink)" stroke-width="1.2"/>${text(x + bw / 2, Y(v) - 6, pc(v), { size: 13, weight: 700, ...ink })}`;
    return `${bar(gx - bw - 4, a, 0)}${bar(gx + 4, b, 1)}${text(gx, B + 20, name, { size: 14, weight: 700, ...ink })}`;
  }).join('');
  return svg(660, 330, `
${grid}${bars}
${box(70, 6, 16, 14, k(0), 'var(--ink)').replace('rx="10"', 'rx="3"')}${text(92, 18, tr('always says "honest"', 'selalu menjawab "sah"'), { anchor: 'start', size: 13 })}
${box(300, 6, 16, 14, k(1), 'var(--ink)').replace('rx="10"', 'rx="3"')}${text(322, 18, tr('trained model', 'model terlatih'), { anchor: 'start', size: 13 })}
${text(330, 306, tr('n/a: the baseline never says "fraud", so precision has no value.', 'n/a: baseline tidak pernah menjawab "penipuan", sehingga precision tidak punya nilai.'), { size: 13 })}`);
}

// Precision of one model (recall 0.60, 140 false alarms among 9,900 honest cases) as the positive rate rises.
function precisionVsRate() {
  const L = 80, T = 50, W = 530, H = 230, maxRate = 0.5, r = 0.6, f = 140 / 9900;
  const X = p => L + p / maxRate * W, Y = v => T + (1 - v) * H;
  const prec = p => r * p / (r * p + f * (1 - p));
  const pts = [];
  for (let p = 0.0005; p <= maxRate + 1e-9; p += 0.0025) pts.push(`${X(p).toFixed(1)} ${Y(prec(p)).toFixed(1)}`);
  const grid = [0, 0.25, 0.5, 0.75, 1].map(v => `${line(L, Y(v), L + W, Y(v), { w: 1 })}${text(L - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('')
    + [0, 0.1, 0.2, 0.3, 0.4, 0.5].map(p => `${text(X(p), T + H + 18, pc(p), { size: 12 })}`).join('');
  const marks = [[0.01, 'start', 14, 22], [0.1, 'start', 12, 26], [0.5, 'end', -4, 28]].map(([p, anchor, dx, dy]) => {
    const v = prec(p), shown = p === 0.5 ? 0.977 : p === 0.1 ? 0.825 : 0.3;
    return `${dot(X(p), Y(v), k(FRAUD), 7)}<circle cx="${X(p)}" cy="${Y(v)}" r="7" fill="none" stroke="var(--ink)" stroke-width="2"/>${text(X(p) + dx, Y(v) + dy, `${tr('positive rate', 'positive rate')} ${pc(p)}: ${tr('precision', 'precision')} ${fmt(shown, { digits: p === 0.01 ? 2 : 3 })}`, { anchor, size: 13, weight: 700, ...ink })}`;
  }).join('');
  return svg(660, 330, `
${grid}
${line(L, T, L, T + H, { c: 'var(--muted)', w: 1.8 })}${line(L, T + H, L + W, T + H, { c: 'var(--muted)', w: 1.8 })}
<path d="M${pts.join(' L')}" fill="none" stroke="${k(HONEST)}" stroke-width="3.4"/>
${marks}
${text(L + W / 2, T + H + 42, tr('share of cases that are fraud (positive rate)', 'porsi kasus yang penipuan (positive rate)'), { size: 14 })}
<g transform="translate(16 ${T + H / 2}) rotate(-90)">${text(0, 0, tr('precision', 'precision'), { size: 14 })}</g>
${text(L + W / 2, 22, tr('same model: recall 0.6 and 140 false alarms every time', 'model yang sama: recall 0,6 dan 140 alarm palsu setiap kali'), { size: 13 })}`);
}

// A toy set of 20 payments (18 honest, 2 fraud) and what each remedy does to it.
function remedies() {
  const x0 = 34, step = 13, r = 5, rows = 4, rowH = 82;
  const row = (i, title, note, body) => {
    const y = 14 + i * rowH;
    return `${text(20, y + 14, title, { anchor: 'start', size: 14, weight: 700, ...ink })}${body(y + 38)}${text(20, y + 66, note, { anchor: 'start', size: 13 })}`;
  };
  const dots = (n, c, from, y) => Array.from({ length: n }, (_, j) => dot(x0 + (from + j) * step, y, k(c), r)).join('');
  return svg(660, 346, `
${row(0, tr('Original: 18 honest, 2 fraud', 'Asli: 18 sah, 2 penipuan'), tr('Fraud is 2 of 20 cases.', 'Penipuan hanya 2 dari 20 kasus.'), y => dots(18, HONEST, 0, y) + dots(2, FRAUD, 19, y))}
${row(1, tr('Oversample: each fraud case appears 9 times', 'Oversample: tiap kasus penipuan muncul 9 kali'), tr('18 honest, 18 fraud. More cases to train on, but the fraud ones are copies.', '18 sah, 18 penipuan. Data latih lebih banyak, tetapi kasus penipuannya salinan.'), y => dots(18, HONEST, 0, y) + dots(18, FRAUD, 19, y))}
${row(2, tr('Undersample: keep only 2 honest cases', 'Undersample: hanya sisakan 2 kasus sah'), tr('2 honest, 2 fraud. Balanced, but 16 honest cases are thrown away.', '2 sah, 2 penipuan. Seimbang, tetapi 16 kasus sah dibuang.'), y => dots(2, HONEST, 0, y) + dots(2, FRAUD, 3, y))}
${row(3, tr('Class weights: same data, each fraud case counts 9 times', 'Class weight: data sama, tiap kasus penipuan dihitung 9 kali'), tr('Honest 18 x 1 = 18 in total. Fraud 2 x 9 = 18 in total.', 'Jujur 18 x 1 = 18 total. Penipuan 2 x 9 = 18 total.'), y => dots(18, HONEST, 0, y) + dot(x0 + 18 * step + 24, y, k(FRAUD), 15) + dot(x0 + 18 * step + 60, y, k(FRAUD), 15))}`);
}

export const figures = {
  'rare-class': rareClass,
  'baseline-vs-model': baselineVsModel,
  'precision-vs-rate': precisionVsRate,
  remedies,
};
