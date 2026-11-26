// Figures for the lesson "Tuning k". Every number on screen is computed here with the same k-NN
// code the lab uses (sims/ml/knn.js), on one small sample made for this lesson, so the figures and
// the worked examples in the text agree. The sample: two classes, each made of two blobs placed
// on the diagonals of the square (A bottom-left and top-right, B top-left and bottom-right),
// 20 points per blob in the training set (80 points) and 50 per blob in the validation set (200).
import { svg, dot, ring, text, line, box, k, tr, fmt, pct } from '../kit.js';
import { rng, gauss } from '../../sims/ml/rng.js';
import { classify } from '../../sims/ml/knn.js';

const ink = { weight: 700, fill: 'var(--ink)' };
const BLOBS = [[2.5, 2.5, 'A'], [7.5, 7.5, 'A'], [2.5, 7.5, 'B'], [7.5, 2.5, 'B']];
const clamp10 = v => Math.max(0, Math.min(10, v));

// perBlob points around each blob centre, noise sd 1.6, fixed seed.
function sample(seed, perBlob) {
  const random = rng(seed), out = [];
  for (let i = 0; i < perBlob; i++) {
    for (const [cx, cy, label] of BLOBS) out.push({ features: [clamp10(cx + 1.6 * gauss(random)), clamp10(cy + 1.6 * gauss(random))], label });
  }
  return out;
}
const hits = (train, test, nK) => test.filter(p => classify(train, p, nK).label === p.label).length;

let cached;
// Built once, on first use: the two data sets and the scores for k = 1, 3, ..., 41.
function study() {
  if (cached) return cached;
  const train = sample(3, 20), valid = sample(1003, 50);
  const ks = Array.from({ length: 21 }, (_, i) => 2 * i + 1);
  const curve = ks.map(nK => ({ k: nK, trainHits: hits(train, train, nK), validHits: hits(train, valid, nK) }));
  cached = { train, valid, ks, curve };
  return cached;
}
// Five-fold cross-validation on the 80 training points: point i is in fold i mod 5.
function folds(nK) {
  const { train } = study();
  return [0, 1, 2, 3, 4].map(g => ({
    fold: g,
    size: train.filter((_, i) => i % 5 === g).length,
    right: hits(train.filter((_, i) => i % 5 !== g), train.filter((_, i) => i % 5 === g), nK),
  }));
}

const tint = i => `color-mix(in srgb, ${k(i)} 26%, var(--surface))`;

// The decision regions of one k on the training points, drawn as a grid of tinted cells.
function boundaries() {
  const { train, curve } = study();
  const size = 196, top = 50, cells = 40, cell = size / cells, ks = [1, 13, 41];
  const notes = [
    [tr('too small', 'terlalu kecil'), tr('jagged: chases noise', 'bergerigi, ikut noise')],
    [tr('about right', 'sudah pas'), tr('smooth: follows the pattern', 'mulus, mengikuti pola')],
    [tr('too large', 'terlalu besar'), tr('blurred: loses the pattern', 'kabur, pola hilang')],
  ];
  const panel = (nK, p) => {
    const ox = 10 + p * 212, X = x => ox + x / 10 * size, Y = y => top + size - y / 10 * size;
    let body = '';
    for (let r = 0; r < cells; r++) {
      let c = 0;
      while (c < cells) {
        const label = classify(train, { features: [(c + 0.5) / cells * 10, (r + 0.5) / cells * 10] }, nK).label;
        let end = c + 1;
        while (end < cells && classify(train, { features: [(end + 0.5) / cells * 10, (r + 0.5) / cells * 10] }, nK).label === label) end++;
        body += `<rect x="${(ox + c * cell).toFixed(1)}" y="${(top + size - (r + 1) * cell).toFixed(1)}" width="${((end - c) * cell + 0.4).toFixed(1)}" height="${(cell + 0.4).toFixed(1)}" fill="${tint(label === 'A' ? 0 : 1)}"/>`;
        c = end;
      }
    }
    const row = curve.find(e => e.k === nK);
    return `<g>${text(ox + size / 2, 16, `k = ${fmt(nK)} (${notes[p][0]})`, { ...ink, size: 15 })}
${text(ox + size / 2, 34, notes[p][1], { size: 12 })}
${body}<rect x="${ox}" y="${top}" width="${size}" height="${size}" rx="2" fill="none" stroke="var(--line)" stroke-width="1.6"/>
${train.map(q => (q.label === 'A' ? dot(X(q.features[0]), Y(q.features[1]), k(0), 3.6) : ring(X(q.features[0]), Y(q.features[1]), k(1), 3))).join('')}
${text(ox + size / 2, top + size + 20, tr(`validation: ${fmt(row.validHits)} of ${fmt(200)} right`, `validasi: ${fmt(row.validHits)} dari ${fmt(200)} benar`), { ...ink, size: 12.5 })}
${text(ox + size / 2, top + size + 38, tr(`${pct(row.validHits / 200)} accuracy`, `accuracy ${pct(row.validHits / 200)}`), { size: 12.5 })}</g>`;
  };
  return svg(640, 316, `${ks.map(panel).join('')}
${dot(204, 302, k(0), 4.2)}${text(214, 306, tr('class A', 'kelas A'), { anchor: 'start', size: 12 })}${ring(300, 302, k(1), 3.8)}${text(310, 306, tr('class B', 'kelas B'), { anchor: 'start', size: 12 })}${text(380, 306, tr('shading: the answer k-NN gives at that spot', 'warna latar: jawaban k-NN di titik itu'), { anchor: 'start', size: 12 })}`);
}

// Training and validation accuracy for every odd k from 1 to 41.
function validationCurve() {
  const { curve } = study();
  const left = 66, right = 620, top = 60, bottom = 250, lo = 0.55, hi = 1;
  const X = nK => left + (nK - 1) / 40 * (right - left - 10) + 4, Y = a => bottom - (a - lo) / (hi - lo) * (bottom - top);
  const valid = curve.map(e => ({ k: e.k, a: e.validHits / 200 })), train = curve.map(e => ({ k: e.k, a: e.trainHits / 80 }));
  const best = valid.reduce((b, e) => (e.a > b.a ? e : b), valid[0]);
  const bestKs = valid.filter(e => e.a === best.a).map(e => fmt(e.k)).join(', ');
  const se = Math.sqrt(best.a * (1 - best.a) / 200);
  const flat = valid.filter(e => e.a >= best.a - se).map(e => e.k);
  const flatLo = Math.min(...flat), flatHi = Math.max(...flat);
  const path = pts => `<path d="${pts.map((e, i) => `${i ? 'L' : 'M'}${X(e.k).toFixed(1)} ${Y(e.a).toFixed(1)}`).join('')}" fill="none" stroke-linejoin="round" stroke-linecap="round"`;
  const yTicks = [0.6, 0.7, 0.8, 0.9, 1].map(v => `${line(left, Y(v), right, Y(v), { c: 'var(--line)', w: 1 })}${text(left - 8, Y(v) + 4, fmt(v, { digits: 1 }), { anchor: 'end', size: 12 })}`).join('');
  const xTicks = [1, 9, 13, 21, 31, 41].map(v => text(X(v), bottom + 17, fmt(v), { size: 12, fill: v === best.k ? 'var(--ink)' : 'var(--muted)', weight: v === best.k ? 700 : 500 })).join('');
  const t1 = valid[0], p1 = train[0];
  return svg(640, 334, `
${box(X(flatLo) - 6, top - 6, X(flatHi) - X(flatLo) + 12, bottom - top + 12, 'var(--accent-soft)', 'none')}
${yTicks}
${line(left, bottom, right, bottom, { c: 'var(--muted)', w: 1.6 })}${line(left, bottom, left, top - 12, { c: 'var(--muted)', w: 1.6 })}
<text transform="translate(16 ${(top + bottom) / 2}) rotate(-90)" text-anchor="middle" font-size="13" font-weight="500" fill="var(--muted)">${tr('accuracy', 'accuracy')}</text>
${line(X(best.k), top - 12, X(best.k), bottom, { c: 'var(--muted)', w: 1.5, dash: '4 5' })}
${path(train)} stroke="${k(0)}" stroke-width="3"/>${path(valid)} stroke="${k(1)}" stroke-width="3"/>
${train.map(e => dot(X(e.k), Y(e.a), k(0), 3.4)).join('')}${valid.map(e => dot(X(e.k), Y(e.a), k(1), 3.4)).join('')}
${xTicks}
${text((left + right) / 2, bottom + 36, tr('k (number of neighbors)', 'k (jumlah neighbor)'), { size: 13 })}
${text(left + 4, bottom + 56, tr('← too small: overfits', '← terlalu kecil: overfitting'), { anchor: 'start', size: 12.5, fill: k(3), weight: 700 })}
${text(right, bottom + 56, tr('too large: oversmooths →', 'terlalu besar: terlalu mulus →'), { anchor: 'end', size: 12.5, fill: k(3), weight: 700 })}
${text(X(best.k) + 8, top - 22, tr(`best: ${pct(best.a)} at k = ${bestKs}`, `terbaik: ${pct(best.a)} pada k = ${bestKs}`), { anchor: 'start', size: 12.5, ...ink })}
${text(X(best.k) + 10, bottom - 30, tr(`flat part: k = ${fmt(flatLo)} to ${fmt(flatHi)}`, `bagian datar: k = ${fmt(flatLo)} sampai ${fmt(flatHi)}`), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${text(X(best.k) + 10, bottom - 13, tr('scores within noise of the best', 'skor masih dalam rentang noise'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${text(X(1) + 12, Y(p1.a) - 2, tr(`k = 1: training ${pct(p1.a, 0)}`, `k = 1: training ${pct(p1.a, 0)}`), { anchor: 'start', size: 12.5, fill: k(0), weight: 700 })}
${text(X(1) + 12, Y(t1.a) + 22, tr(`validation ${pct(t1.a)}`, `validasi ${pct(t1.a)}`), { anchor: 'start', size: 12.5, fill: k(1), weight: 700 })}
${dot(190, 18, k(0), 4.2)}${text(200, 22, tr('training accuracy', 'training accuracy'), { anchor: 'start', size: 12 })}${dot(330, 18, k(1), 4.2)}${text(340, 22, tr('validation accuracy', 'validation accuracy'), { anchor: 'start', size: 12 })}`);
}

// Five-fold cross-validation of one k on the 80 training points: each fold is held out once.
function foldsFigure() {
  const nK = 13, rows = folds(nK);
  const left = 78, bw = 78, gap = 6, bh = 30, top = 52, step = 38;
  const total = rows.reduce((s, r) => s + r.right, 0), n = rows.reduce((s, r) => s + r.size, 0);
  const blocks = rows.map((r, g) => {
    const y = top + g * step;
    const cells = [0, 1, 2, 3, 4].map(c => {
      const held = c === g, x = left + c * (bw + gap);
      return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="6" fill="${held ? tint(1) : 'var(--surface)'}" stroke="${held ? k(1) : 'var(--line)'}" stroke-width="${held ? 2.2 : 1.4}"/>${text(x + bw / 2, y + 19.5, held ? tr('validate', 'validasi') : tr('train', 'training'), { size: 12.5, fill: held ? 'var(--ink)' : 'var(--muted)', weight: held ? 700 : 500 })}`;
    }).join('');
    return `${text(left - 10, y + 19.5, tr(`Round ${fmt(g + 1)}`, `Putaran ${fmt(g + 1)}`), { anchor: 'end', size: 12.5 })}${cells}${text(left + 5 * (bw + gap) + 8, y + 19.5, tr(`${fmt(r.right)} of ${fmt(r.size)} right`, `${fmt(r.right)} dari ${fmt(r.size)} benar`), { anchor: 'start', size: 12.5, ...ink })}`;
  }).join('');
  const heads = [0, 1, 2, 3, 4].map(c => text(left + c * (bw + gap) + bw / 2, top - 10, tr(`fold ${fmt(c + 1)}`, `fold ${fmt(c + 1)}`), { size: 12.5, ...ink })).join('');
  const yMean = top + 5 * step + 14;
  return svg(640, yMean + 36, `
${text(320, 18, tr(`Each round scores k = ${fmt(nK)} on the fold that is held out (${fmt(rows[0].size)} points per fold)`, `Setiap putaran menilai k = ${fmt(nK)} pada fold yang ditahan (${fmt(rows[0].size)} titik per fold)`), { size: 13 })}
${heads}${blocks}
${line(left, yMean - 12, left + 5 * (bw + gap) - gap, yMean - 12, { c: 'var(--muted)', w: 1.4, dash: '4 5' })}
${text(left, yMean + 12, tr(`Add up: ${fmt(total)} of ${fmt(n)} right, so the cross-validation accuracy is ${pct(total / n, 2)}`, `Jumlahkan: ${fmt(total)} dari ${fmt(n)} benar, jadi accuracy cross-validation-nya ${pct(total / n, 2)}`), { anchor: 'start', size: 13.5, ...ink })}`);
}

export const figures = { boundaries, 'validation-curve': validationCurve, 'cv-folds': foldsFigure };
