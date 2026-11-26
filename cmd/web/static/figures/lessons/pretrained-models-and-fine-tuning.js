// Figures for the lesson "Pretrained models and fine-tuning": [[figure:pretrained-models-and-fine-tuning/name|Caption]].
//
// Where the numbers come from.
//   - pretraining-tasks: the six toy messages of the lesson's table. Next token after "is": late 3 of 5, wrong 2 of 5
//     (messages 1, 3, 5 and 2, 4). Masked "[MASK] is late": order 2 of 3, parcel 1 of 3 (messages 1, 5 and 3).
//   - frozen-or-fine-tuned: an EXAMPLE, not a measurement. An encoder of about 100 million weights returns 768 numbers
//     per message and there are 3 classes, so the head has 768 x 3 + 3 = 2,307 numbers.
//   - few-labels: RESULTS is a simulation, reproducible from the repo's own modules, on the synthetic customer messages
//     of sims/ml/textdata.js (makeCorpus: billing, delivery, technical problem; defaults for ambiguity and typos).
//       Pretraining pool: 600 unlabelled English messages (200 per class, seed 101); the Indonesian pool is the same
//       generator in Indonesian (136 words). Code: every word with at least 2 occurrences (155 words); co-occurrence counts
//       within 3 places on either side; positive pointwise mutual information ln(count x total / (row x column)), negatives
//       set to 0; the 8 largest eigenvectors (eigenSymmetric of sims/ml/pca.js) scaled by sqrt(eigenvalue) are the word code.
//       Message code = mean of its word codes (words outside the code skipped), length-normalised. Head = nearest class
//       mean by cosine, from the labelled messages' codes. Baseline = fitNaiveBayes (counts, alpha 1) of sims/ml/naivebayes.js.
//       Labelled draw r (r = 0..99) = the first n messages per class of makeCorpus({ docsPerClass: 60, seed: 500 + r }).
//       Test = makeCorpus({ docsPerClass: 100, seed: 9999 }), 300 English messages, then every message whose token set has
//       Jaccard overlap >= 0.8 with a pool message (97 of 300) or with a message of that draw is removed (about 195 to 203
//       left). Each value is the mean test accuracy over the 100 draws. Spread at n = 3 (standard deviation, divisor n):
//       naive Bayes 5.1, frozen code 5.6, Indonesian code 7.5 points.
import { svg, dot, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';

const RESULTS = {
  n: [1, 2, 3, 5, 10, 20, 40],
  nb: [0.5044, 0.5864, 0.6486, 0.734, 0.8168, 0.876, 0.8981],
  same: [0.6082, 0.7104, 0.7466, 0.7852, 0.8087, 0.8231, 0.8259],
  other: [0.4386, 0.469, 0.4841, 0.5051, 0.5283, 0.5509, 0.5576],
};

// ---- Figure 1: two pretext tasks on the toy messages. ----
function pretrainingTasks() {
  const W = 640, H = 262;
  const tokenBox = (x, y, w, label, hidden) => `${box(x, y, w, 34, hidden ? soft(3) : 'var(--surface)', hidden ? k(3) : 'var(--line)')}${text(x + w / 2, y + 22, label, { fill: hidden ? k(3) : 'var(--ink)', weight: 700, size: 14 })}`;
  const bar = (x, y, label, p, frac, c) => `${text(x, y + 14, label, { anchor: 'start', fill: 'var(--ink)', size: 14, weight: 600 })}
<rect x="${x + 70}" y="${y}" width="${Math.round(p * 150)}" height="20" rx="4" fill="${c}"/>
${text(x + 70 + Math.round(p * 150) + 8, y + 15, `${fmt(p, { digits: 2 })}  (${frac})`, { anchor: 'start', fill: 'var(--ink)', size: 13 })}`;
  const panel = (ox, title, sub, tokens, bars) => `${box(ox, 10, 300, 240)}
${text(ox + 150, 38, title, { fill: 'var(--ink)', weight: 700, size: 15 })}
${text(ox + 150, 58, sub, { size: 12 })}
${tokens}
${text(ox + 20, 146, tr('The counting model says', 'Model penghitung menjawab'), { anchor: 'start', size: 12 })}
${bars}`;

  const left = panel(10, tr('Next token', 'Token berikutnya'), tr('read the words so far', 'baca kata sampai sekarang'),
    `${tokenBox(26, 78, 52, 'my')}${tokenBox(84, 78, 74, 'order')}${tokenBox(164, 78, 44, 'is')}${tokenBox(214, 78, 62, '?', true)}`,
    `${bar(26, 170, 'late', 0.6, `${fmt(3)} / ${fmt(5)}`, k(0))}${bar(26, 204, 'wrong', 0.4, `${fmt(2)} / ${fmt(5)}`, k(2))}`);
  const right = panel(330, tr('Masked word', 'Kata tersamar'), tr('use the words on both sides', 'pakai kata di kedua sisi'),
    `${tokenBox(354, 78, 94, '[MASK]', true)}${tokenBox(454, 78, 44, 'is')}${tokenBox(504, 78, 62, 'late')}`,
    `${bar(346, 170, 'order', 2 / 3, `${fmt(2)} / ${fmt(3)}`, k(0))}${bar(346, 204, 'parcel', 1 / 3, `${fmt(1)} / ${fmt(3)}`, k(2))}`);
  return svg(W, H, `${left}${right}`);
}

// ---- Figure 2: frozen or fine-tuned (an example, not a measurement). ----
function frozenOrFineTuned() {
  const W = 640, H = 270;
  const node = (x, y, w, title, sub, fill, stroke) => `${box(x, y, w, 62, fill, stroke)}${text(x + w / 2, y + 26, title, { fill: 'var(--ink)', weight: 700, size: 14 })}${text(x + w / 2, y + 47, sub, { size: 12 })}`;
  const row = (y, label, encSub, encFill, encStroke, trains, c) => `${text(10, y + 20, label, { anchor: 'start', fill: c, weight: 700, size: 15 })}
${node(10, y + 30, 170, tr('Pretrained encoder', 'Encoder pretrained'), encSub, encFill, encStroke)}
${line(184, y + 61, 232, y + 61, { c: 'var(--muted)', w: 2, arrow: true })}
${text(208, y + 52, fmt(768), { size: 12, fill: 'var(--ink)', weight: 600 })}
${node(236, y + 30, 130, tr('Head', 'Head'), tr('3 classes', '3 kelas'), soft(1), k(1))}
${text(384, y + 56, trains[0], { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 14 })}
${text(384, y + 76, trains[1], { anchor: 'start', size: 12 })}`;
  const head = fmt(768 * 3 + 3);
  return svg(W, H, `${text(10, 22, tr('Example: an encoder of about 100 million weights, 768 numbers out, 3 classes', 'Contoh: encoder dengan sekitar 100 juta weight, 768 angka keluar, 3 kelas'), { anchor: 'start', fill: 'var(--ink)', weight: 600, size: 13 })}
${row(34, tr('Frozen', 'Frozen'), tr('weights locked', 'weight dikunci'), 'var(--surface)', 'var(--line)', [`${tr('Fits', 'Melatih')} ${head} ${tr('numbers', 'angka')}`, tr('only the head learns', 'hanya head yang belajar')], 'var(--ink)')}
${row(158, tr('Fine-tuned', 'Fine-tuned'), tr('weights can move', 'weight dapat bergeser'), soft(1), k(1), [`${tr('Fits about 100 million', 'Melatih sekitar 100 juta')} + ${head}`, tr('the encoder learns too', 'encoder ikut belajar')], 'var(--ink)')}`);
}

// ---- Figure 3: test accuracy against the number of labelled messages per class. ----
function fewLabels() {
  const W = 640, H = 330;
  const x0 = 70, x1 = 610, yTop = 52, yBot = 262, lo = 0.3, hi = 0.95;
  const X = i => x0 + (i / (RESULTS.n.length - 1)) * (x1 - x0);
  const Y = v => yBot - ((v - lo) / (hi - lo)) * (yBot - yTop);
  const series = [
    { key: 'nb', c: k(0), name: tr('Naive Bayes', 'Naive Bayes'), w: 3, dash: '' },
    { key: 'same', c: k(1), name: tr('Frozen code, same domain', 'Frozen code, domain sama'), w: 3, dash: '' },
    { key: 'other', c: k(3), name: tr('Frozen code, other language', 'Frozen code, bahasa lain'), w: 3, dash: '6 4' },
  ];
  const grid = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map(v => `${line(x0, Y(v), x1, Y(v), { c: 'var(--line)', w: 1 })}${text(x0 - 8, Y(v) + 4, pct(v, 0), { anchor: 'end', size: 12 })}`).join('');
  const ticks = RESULTS.n.map((n, i) => text(X(i), yBot + 20, fmt(n), { size: 12, fill: 'var(--ink)' })).join('');
  const guess = `${line(x0, Y(1 / 3), x1, Y(1 / 3), { c: 'var(--muted)', w: 1.4, dash: '3 4' })}${text(x1, Y(1 / 3) - 6, tr('guessing', 'menebak'), { anchor: 'end', size: 12 })}`;
  const paths = series.map(s => {
    const pts = RESULTS[s.key].map((v, i) => `${i ? 'L' : 'M'}${X(i)} ${Y(v)}`).join('');
    return `<path d="${pts}" fill="none" stroke="${s.c}" stroke-width="${s.w}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} stroke-linejoin="round"/>${RESULTS[s.key].map((v, i) => dot(X(i), Y(v), s.c, 4.5)).join('')}`;
  }).join('');
  // Value labels at 3, 10 and 40 labelled messages per class: the higher series above its point, the lower one below.
  const label = (key, i, above, c) => text(X(i), Y(RESULTS[key][i]) + (above ? -11 : 21), pct(RESULTS[key][i]), { size: 12, fill: c, weight: 700 });
  const labels = [
    label('same', 2, true, k(1)), label('nb', 2, false, k(0)), label('other', 2, false, k(3)),
    label('nb', 4, true, k(0)), label('same', 4, false, k(1)),
    label('nb', 6, true, k(0)), label('same', 6, false, k(1)), label('other', 6, false, k(3)),
  ].join('');
  const legend = series.map((s, i) => {
    const lx = [14, 144, 384][i];
    return `${line(lx, 18, lx + 26, 18, { c: s.c, w: 3, dash: s.dash })}${text(lx + 34, 23, s.name, { anchor: 'start', fill: 'var(--ink)', size: 12, weight: 600 })}`;
  }).join('');
  return svg(W, H, `${legend}${grid}${guess}${paths}${labels}${ticks}
${text((x0 + x1) / 2, yBot + 46, tr('Labeled messages per class', 'Pesan berlabel per kelas'), { size: 13, fill: 'var(--ink)' })}
${text(14, 44, tr('Test accuracy', 'Akurasi uji'), { anchor: 'start', size: 12 })}`);
}

export const figures = {
  'pretraining-tasks': pretrainingTasks,
  'frozen-or-fine-tuned': frozenOrFineTuned,
  'few-labels': fewLabels,
};
