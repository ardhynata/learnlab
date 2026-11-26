// Figures for "Measuring a classifier": the score histogram split by a threshold, how recall, precision
// and accuracy move as the threshold slides, and the ROC curve of the lab's default sample.
import { svg, dot, text, line, k, tr, fmt } from '../kit.js';
import { makeScores, fastRoc } from '../../sims/ml/classifierscores.js';
import { atThreshold, auc } from '../../sims/ml/metrics.js';

// Cell colors match the lab: TP teal, FP gold, TN blue, FN purple.
const TP = 2, FP = 3, TN = 4, FN = 5;
// The threshold the hills figure marks (a schematic, not the lab sample).
const THRESHOLD = 1.5;
const tint = i => `color-mix(in srgb, var(--k${i}) 22%, var(--surface))`;

// The lab's default sample: 2,000 cases, 5 percent positive, separation 2, first seed.
// Data only, no words, so it is safe to compute once.
let sample = null;
function labSample() {
  if (!sample) {
    const d = makeScores({ n: 2000, prevalence: 0.05, separation: 2, seed: 1 });
    sample = { ...d, roc: fastRoc(d.scores, d.actual) };
    sample.auc = auc(sample.roc);
  }
  return sample;
}

// Two score distributions and one threshold: the four regions, each in its own matrix color.
// Each hill is drawn as a share of its own class, so both are the same height.
function scoreRegions() {
  const base = 235, peak = 150;
  const X = s => 50 + (s + 3) / 8 * 560, Y = v => base - peak * v;
  const pdf = (s, mu) => Math.exp(-0.5 * (s - mu) ** 2);
  const curve = (mu, from, to) => {
    const pts = [];
    for (let s = from; s <= to + 1e-9; s += 0.05) pts.push(`${X(s).toFixed(1)} ${Y(pdf(s, mu)).toFixed(1)}`);
    return pts;
  };
  const area = (mu, from, to, i, opacity) => `<path d="M${X(from).toFixed(1)} ${base} L${curve(mu, from, to).join(' L')} L${X(to).toFixed(1)} ${base}Z" fill="var(--k${i})" fill-opacity="${opacity}"/>`;
  const outline = (mu, i) => `<path d="M${curve(mu, -3, 5).join(' L')}" fill="none" stroke="var(--k${i})" stroke-width="2.6"/>`;
  const halo = (x, y, abbr) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="18" font-weight="800" fill="var(--ink)" stroke="var(--surface)" stroke-width="4" paint-order="stroke">${abbr}</text>`;
  const callout = (x, y, abbr, tx, ty) => `${line(tx, ty, x, y, { c: 'var(--ink)', w: 1.4 })}${dot(tx, ty, 'var(--ink)', 3.6)}${halo(x, y - 6, abbr)}`;
  const swatch = (x, i, label) => `<rect x="${x}" y="306" width="22" height="16" rx="4" fill="${tint(i)}" stroke="${k(i)}" stroke-width="2"/>${text(x + 30, 319, label, { anchor: 'start', size: 14 })}`;
  return svg(660, 334, `
${area(0, -3, THRESHOLD, TN, 0.5)}${area(2, THRESHOLD, 5, TP, 0.5)}${area(0, THRESHOLD, 5, FP, 0.9)}${area(2, -3, THRESHOLD, FN, 0.9)}
${outline(0, 0)}${outline(2, 1)}
${line(X(-3), base, X(5), base, { c: 'var(--muted)', w: 1.8 })}
${[-2, -1, 0, 1, 2, 3, 4].map(s => text(X(s), base + 18, fmt(s), { size: 13 })).join('')}${text(X(1), base + 40, tr('score', 'skor'), { size: 14 })}
${line(X(THRESHOLD), 40, X(THRESHOLD), base, { c: 'var(--ink)', w: 2.6, dash: '7 5' })}${text(X(THRESHOLD), 34, tr('threshold', 'threshold'), { size: 14, weight: 700, fill: 'var(--ink)' })}
${text(X(THRESHOLD) - 12, 64, tr('says no', 'prediksi tidak'), { anchor: 'end', size: 14, weight: 700, fill: 'var(--ink)' })}${text(X(THRESHOLD) + 12, 64, tr('says yes', 'prediksi ya'), { anchor: 'start', size: 14, weight: 700, fill: 'var(--ink)' })}
${halo(X(-0.7), 170, 'TN')}${halo(X(2.6), 150, 'TP')}
${callout(X(-2.3), 205, 'FN', X(0.9), 224)}
${callout(X(3.8), 195, 'FP', X(1.8), 225)}
${line(60, 290, 90, 290, { c: k(0), w: 4 })}${text(98, 294, tr('actually no (negative hill)', 'aslinya tidak (kelas negatif)'), { anchor: 'start', size: 14 })}${line(330, 290, 360, 290, { c: k(1), w: 4 })}${text(368, 294, tr('actually yes (positive hill)', 'aslinya ya (kelas positif)'), { anchor: 'start', size: 14 })}
${swatch(40, TP, tr('TP caught', 'TP terdeteksi'))}${swatch(195, FN, tr('FN missed', 'FN terlewat'))}${swatch(345, FP, tr('FP false alarm', 'FP alarm palsu'))}${swatch(510, TN, tr('TN left alone', 'TN diabaikan'))}`);
}

// Recall, precision and accuracy against the threshold for the lab's default sample, with the accuracy of
// "always answer no" as a dashed line. Accuracy barely clears it while recall falls steadily.
function thresholdSweep() {
  const { scores, actual } = labSample();
  const L = 66, T = 18, W = 570, H = 250, LO = -1, HI = 4;
  const X = t => L + (t - LO) / (HI - LO) * W, Y = v => T + (1 - v) * H;
  const rows = [];
  for (let i = 0; i <= 50; i++) {
    const t = LO + i * 0.1, r = atThreshold(scores, actual, t);
    rows.push({ t, recall: r.recall, precision: r.tp + r.fp ? r.precision : 1, accuracy: r.accuracy, base: (r.tn + r.fp) / (r.tp + r.fn + r.tn + r.fp) });
  }
  const path = key => rows.map(r => `${X(r.t).toFixed(1)} ${Y(r[key]).toFixed(1)}`).join(' L');
  const base = rows[0].base;
  const grid = [0, 25, 50, 75, 100].map(v => `${line(L, Y(v / 100), L + W, Y(v / 100), { w: 1 })}${text(L - 8, Y(v / 100) + 4, `${fmt(v)}%`, { anchor: 'end', size: 13 })}`).join('');
  const ticks = [-1, 0, 1, 2, 3, 4].map(t => text(X(t), T + H + 18, fmt(t), { size: 13 })).join('');
  const marker = (t, label, anchor) => `${line(X(t), T, X(t), T + H, { c: 'var(--ink)', w: 1.6, dash: '5 5' })}${text(X(t) + (anchor === 'end' ? -6 : 6), T + H - 8, label, { anchor, size: 13, weight: 700, fill: 'var(--ink)' })}`;
  const key = (x, i, label, dash) => `${line(x, 338, x + 28, 338, { c: i === null ? 'var(--muted)' : k(i), w: i === null ? 2.2 : 4, dash })}${text(x + 36, 342, label, { anchor: 'start', size: 14 })}`;
  return svg(660, 358, `
${grid}${ticks}
${marker(1, tr(`threshold ${fmt(1, { digits: 1 })}`, `threshold ${fmt(1, { digits: 1 })}`), 'end')}${marker(2.5, tr(`lab default ${fmt(2.5, { digits: 1 })}`, `bawaan lab ${fmt(2.5, { digits: 1 })}`), 'end')}
${line(L, Y(base), L + W, Y(base), { c: 'var(--muted)', w: 2.2, dash: '7 5' })}
<path d="M${path('accuracy')}" fill="none" stroke="var(--k0)" stroke-width="3.2"/>
<path d="M${path('precision')}" fill="none" stroke="var(--k3)" stroke-width="3.2"/>
<path d="M${path('recall')}" fill="none" stroke="var(--k1)" stroke-width="3.2"/>
${text(L + W / 2, T + H + 40, tr('threshold (a score at or above it is answered yes)', 'threshold (skor di atas atau sama dengan nilai ini dijawab ya)'), { size: 14 })}
${key(40, 1, 'recall')}${key(150, 3, 'precision')}${key(285, 0, 'accuracy')}${key(410, null, tr(`always say no: ${fmt(base * 100, { digits: 1 })}%`, `selalu jawab tidak: ${fmt(base * 100, { digits: 1 })}%`), '7 5')}`);
}

// The ROC curve of the lab's default sample, with four thresholds marked and the chance diagonal.
function rocCurve() {
  const { scores, actual, roc, auc: area } = labSample();
  const L = 70, T = 24, S = 300;
  const X = f => L + f * S, Y = t => T + (1 - t) * S;
  const path = roc.map(p => `${X(p.fpr).toFixed(1)} ${Y(p.tpr).toFixed(1)}`);
  const grid = [0, 0.25, 0.5, 0.75, 1].map(v => `${line(X(v), Y(0), X(v), Y(1), { w: 1 })}${line(X(0), Y(v), X(1), Y(v), { w: 1 })}${text(X(v), Y(0) + 17, fmt(v), { size: 13 })}${text(X(0) - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 13 })}`).join('');
  const marks = [2.5, 2, 1, 0.5].map(t => {
    const r = atThreshold(scores, actual, t), x = X(r.fpr), y = Y(r.recall);
    const label = tr(`threshold ${fmt(t, { digits: 1 })}`, `threshold ${fmt(t, { digits: 1 })}`);
    const dy = t === 1 ? 26 : t === 0.5 ? 22 : 5;
    return `${dot(x, y, 'var(--k1)', 7)}<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="var(--ink)" stroke-width="2"/>
<text x="${x + 14}" y="${y + dy}" font-size="14" font-weight="700" fill="var(--ink)" stroke="var(--surface)" stroke-width="4" paint-order="stroke">${label}</text>`;
  }).join('');
  return svg(660, 400, `
${grid}
<path d="M${path.join(' L')} L${X(1)} ${Y(0)}Z" fill="var(--k0)" fill-opacity="0.12"/>
${line(X(0), Y(0), X(1), Y(1), { c: 'var(--muted)', w: 2.2, dash: '7 5' })}
<path d="M${path.join(' L')}" fill="none" stroke="var(--k0)" stroke-width="3.4"/>
${marks}
${text(X(0.5), Y(0) + 40, tr('false-positive rate: share of real negatives flagged yes', 'false positive rate: porsi negatif asli yang dijawab ya'), { size: 14 })}
<g transform="translate(16 ${T + S / 2}) rotate(-90)">${text(0, 0, tr('true-positive rate (recall)', 'true positive rate (recall)'), { size: 14 })}</g>
<g transform="translate(${X(0.7)} ${Y(0.7)}) rotate(-45)">${text(0, 24, tr(`coin flip: AUC ${fmt(0.5)}`, `tebak acak: AUC ${fmt(0.5)}`), { size: 14, weight: 700 })}</g>
${text(X(0), T - 8, tr('top-left corner = perfect', 'sudut kiri atas = sempurna'), { anchor: 'start', size: 14, weight: 700, fill: 'var(--ink)' })}
${text(410, 120, tr('Reading the curve', 'Cara membaca kurva'), { anchor: 'start', size: 15, weight: 700, fill: 'var(--ink)' })}
${text(410, 148, tr('Sliding the threshold down moves', 'Menggeser threshold ke bawah'), { anchor: 'start' })}${text(410, 166, tr('the dot up and to the right.', 'membuat titik naik ke kanan atas.'), { anchor: 'start' })}
${text(410, 198, tr('Closer to the top-left corner', 'Makin dekat ke sudut kiri atas'), { anchor: 'start' })}${text(410, 216, tr('means better scores.', 'berarti skornya makin bagus.'), { anchor: 'start' })}
${text(410, 248, tr(`Shaded area = AUC ${fmt(area, { digits: 3 })}`, `Arsiran = AUC ${fmt(area, { digits: 3 })}`), { anchor: 'start', weight: 700, fill: 'var(--ink)' })}${text(410, 266, tr('for the lab\'s default sample.', 'untuk sampel bawaan lab.'), { anchor: 'start' })}`);
}

export const figures = {
  'score-regions': scoreRegions,
  'threshold-sweep': thresholdSweep,
  'roc-curve': rocCurve,
};
