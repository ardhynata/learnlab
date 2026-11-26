// Figures for the Nearest neighbors course.
import { svg, dot, ring, cross, diamond, text, line, box, k, soft, tr, fmt } from './kit.js';

// The k-NN vote from the worked example: k = 3 versus k = 5.
function knnVote() {
  const q = [210, 135], U = 30;
  const at = (dx, dy) => [q[0] + dx * U, q[1] - dy * U];
  const pts = [[at(-1, 0), 0], [at(1, 1), 1], [at(0, -2), 0], [at(3, 0), 1], [at(0, 4), 1]];
  return svg(600, 270, `
<circle cx="${q[0]}" cy="${q[1]}" r="125" fill="none" stroke="${k(1)}" stroke-width="2" stroke-dasharray="6 5"/>
<circle cx="${q[0]}" cy="${q[1]}" r="66" fill="var(--accent-soft)" stroke="${k(0)}" stroke-width="2" stroke-dasharray="6 5"/>
${pts.map(([p, c]) => line(q[0], q[1], p[0], p[1], { c: 'var(--line)', w: 1.5 }) + dot(p[0], p[1], k(c), 8)).join('')}${diamond(q[0], q[1], 'var(--surface)', 11)}
${dot(430, 70, k(0), 7)}${text(446, 75, tr('class A', 'kelas A'), { anchor: 'start' })}${dot(430, 100, k(1), 7)}${text(446, 105, tr('class B', 'kelas B'), { anchor: 'start' })}
${text(430, 150, 'k = 3: A, B, A', { anchor: 'start', weight: 700, fill: k(0) })}${text(430, 170, tr('2 votes A, 1 vote B: A', '2 vote A, 1 vote B: A'), { anchor: 'start' })}
${text(430, 205, 'k = 5: A, B, A, B, B', { anchor: 'start', weight: 700, fill: k(1) })}${text(430, 225, tr('2 votes A, 3 votes B: B', '2 vote A, 3 vote B: B'), { anchor: 'start' })}`);
}

// Decision boundary for small and large k.
function boundaryK() {
  const A = [[30, 60], [55, 90], [40, 120], [70, 50], [85, 110], [60, 150], [100, 85]];
  const B = [[170, 60], [150, 100], [185, 130], [130, 140], [165, 160], [190, 90], [145, 45]];
  const noiseB = [[75, 100]], noiseA = [];
  const dots = (ox) => `${A.map(([x, y]) => dot(ox + x, y + 20, k(0), 5)).join('')}${B.map(([x, y]) => dot(ox + x, y + 20, k(1), 5)).join('')}${noiseB.map(([x, y]) => dot(ox + x, y + 20, k(1), 5)).join('')}${noiseA.map(([x, y]) => dot(ox + x, y + 20, k(0), 5)).join('')}`;
  return svg(640, 230, `
${box(0, 30, 300, 170)}${box(340, 30, 300, 170)}${text(150, 20, tr('k = 1: jagged, follows noise', 'k = 1: bergerigi, ikut terpengaruh noise'), { weight: 700, fill: 'var(--ink)' })}${text(490, 20, tr('k = 15: smooth, simpler', 'k = 15: mulus, lebih sederhana'), { weight: 700, fill: 'var(--ink)' })}
${dots(30)}${dots(370)}
<path d="M135 32 L132 90 L98 108 L96 124 L130 132 L134 160 L150 176 L158 198" fill="none" stroke="var(--ink)" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M480 32 C 470 90, 505 130, 490 198" fill="none" stroke="var(--ink)" stroke-width="2.6"/>`);
}

// Training and validation error against k.
function biasVariance() {
  const X = n => 70 + n * 70, Y = e => 200 - e * 1.4;
  return svg(600, 250, `
${line(60, 210, 570, 210, { c: 'var(--muted)', w: 1.6, arrow: true })}${line(60, 210, 60, 20, { c: 'var(--muted)', w: 1.6, arrow: true })}
<path d="M${X(0)} ${Y(0)} C ${X(2)} ${Y(8)}, ${X(4)} ${Y(22)}, ${X(6.5)} ${Y(38)}" fill="none" stroke="${k(0)}" stroke-width="3.2"/>
<path d="M${X(0)} ${Y(55)} C ${X(1.2)} ${Y(30)}, ${X(2)} ${Y(22)}, ${X(3)} ${Y(21)} S ${X(5)} ${Y(30)}, ${X(6.5)} ${Y(48)}" fill="none" stroke="${k(1)}" stroke-width="3.2"/>
${line(X(3), 30, X(3), 210, { dash: '4 5', c: 'var(--muted)', w: 1.5 })}${text(X(3), 24, tr('best k', 'k terbaik'), { weight: 700, fill: 'var(--ink)' })}
${text(X(0.15), 232, tr('small k', 'k kecil'), { anchor: 'start' })}${text(X(6.5), 232, tr('large k', 'k besar'), { anchor: 'end' })}${text(10, 16, tr('error', 'error'), { anchor: 'start' })}
${text(X(0.2), 56, tr('overfits: high variance', 'overfitting: variance tinggi'), { anchor: 'start', fill: k(1) })}${text(X(6.5), 90, tr('underfits: high bias', 'underfitting: bias tinggi'), { anchor: 'end', fill: k(1) })}
${text(X(4.6), 190, tr('training error', 'training error'), { anchor: 'start', fill: k(0), weight: 700 })}${text(X(4.3), 128, tr('validation error', 'validation error'), { anchor: 'start', fill: k(1), weight: 700 })}`);
}

// Five-fold cross-validation.
function cvFolds() {
  const rows = [0, 1, 2, 3, 4].map(r => `${[0, 1, 2, 3, 4].map(c => `<rect x="${20 + c * 72}" y="${22 + r * 34}" width="66" height="26" rx="6" fill="${c === r ? k(1) : 'var(--surface-2)'}" stroke="${c === r ? k(1) : 'var(--line)'}"/>${text(53 + c * 72, 40 + r * 34, c === r ? tr('validate', 'validasi') : tr('train', 'training'), { size: 12, fill: c === r ? '#fff' : 'var(--muted)', weight: c === r ? 700 : 500 })}`).join('')}${text(392, 40 + r * 34, `${tr('score', 'skor')} ${fmt(r + 1)}`, { anchor: 'start', size: 12 })}`).join('');
  return svg(560, 205, `${text(185, 14, tr('five folds of the data', 'data dibagi 5 fold'), { size: 12 })}${rows}${text(470, 125, tr('→ average', '→ rata-rata'), { anchor: 'start', weight: 700, fill: 'var(--ink)', size: 13 })}`);
}

export const figures = {
  'knn-vote': knnVote, 'boundary-k': boundaryK,
  'bias-variance': biasVariance, 'cv-folds': cvFolds,
};
