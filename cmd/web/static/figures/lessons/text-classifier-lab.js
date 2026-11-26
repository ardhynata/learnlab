// Figures for the "Text classifier lab" lesson. They run the lab's own math (sims/ml/textlab.js on the English
// messages of sims/ml/textdata.js, corpus seed 7, 80 messages per class, the lab's default split) so that every
// number agrees with the lesson text and with the lab. The corpus is always the English one, whatever the page
// language, because the lesson text quotes the English numbers; the corpus words are data and are not translated.
import { svg, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';
import { makeCorpus } from '../../sims/ml/textdata.js';
import { predictProba } from '../../sims/ml/naivebayes.js';
import { splitCorpus, trainModel, pairContributions } from '../../sims/ml/textlab.js';

const ink = { fill: 'var(--ink)' };
const SPLITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

let cache = null;
function lab() {
  if (cache) return cache;
  const corpus = makeCorpus({ language: 'en', docsPerClass: 80, seed: 7 });
  const classes = corpus.classes;
  const run = ({ alpha = 1, features = 'counts', stop = false, size = 60, seed = 1 } = {}) => {
    const split = splitCorpus(corpus.labels, { classes, seed, trainSize: size });
    const r = trainModel(corpus.docs, corpus.labels, split, { alpha, features, stopWords: stop ? 'en' : false }, classes);
    return { split, ...r, testDocs: split.test.map(i => corpus.docs[i]), testLabels: split.test.map(i => corpus.labels[i]) };
  };
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
  const over = (opts, pick) => mean(SPLITS.map(seed => pick(run({ ...opts, seed }))));
  cache = { corpus, classes, run, over };
  return cache;
}

// The class names stay in English in both languages, as in the lab, the lesson text and the quizzes.
const className = c => c;

// Plain chart frame: left axis in percent, light grid, one dashed line for the chance level.
function frame({ W, H, left, right, top, bottom, lo = 30, hi = 100 }) {
  const Y = v => top + (1 - (v - lo) / (hi - lo)) * (H - top - bottom);
  const ticks = [40, 60, 80, 100].map(v => `${line(left, Y(v), W - right, Y(v), { c: 'var(--line)', w: 1 })}${text(left - 8, Y(v) + 4, `${fmt(v)}%`, { anchor: 'end', size: 12 })}`).join('');
  const chance = `${line(left, Y(100 / 3), W - right, Y(100 / 3), { c: 'var(--muted)', w: 1.4, dash: '5 4' })}`
    + text(W - right, Y(100 / 3) - 6, tr(`guessing a class: ${pct(1 / 3)}`, `menebak kelas: ${pct(1 / 3)}`), { anchor: 'end', size: 12 });
  const axes = `${line(left, top, left, H - bottom, { c: 'var(--muted)', w: 1.6 })}${line(left, H - bottom, W - right, H - bottom, { c: 'var(--muted)', w: 1.6 })}`;
  return { Y, parts: `${ticks}${chance}${axes}` };
}

// ---- Figure 1: where each control acts on the way from a message to an answer. ----
function controlsMap() {
  const bw = 124, bh = 62, gap = 22, x0 = 6, y0 = 14;
  const steps = [
    [tr('Message', 'Pesan'), tr('the text', 'teksnya'), 3],
    [tr('Words kept', 'Kata dipakai'), tr('the bag of words', 'bag of words'), 3],
    [tr('Weights', 'Bobot'), tr('count or TF-IDF', 'jumlah atau TF-IDF'), 3],
    [tr('Word clues', 'Petunjuk kata'), tr('P(word | class)', 'P(kata | kelas)'), 0],
    [tr('Answer', 'Jawaban'), tr('class + probability', 'kelas + probabilitas'), 5],
  ];
  const bx = i => x0 + i * (bw + gap);
  const boxes = steps.map(([title, sub, c], i) => `${box(bx(i), y0, bw, bh, soft(c), k(c))}
${text(bx(i) + bw / 2, y0 + 27, title, { size: 14.5, weight: 700, ...ink })}
${text(bx(i) + bw / 2, y0 + 46, sub, { size: 11.5 })}`).join('');
  const arrows = [0, 1, 2, 3].map(i => line(bx(i) + bw + 4, y0 + bh / 2, bx(i + 1) - 4, y0 + bh / 2, { c: 'var(--muted)', w: 2, arrow: true })).join('');
  const pill = (cx, y, label, c) => {
    const w = Math.max(96, label.length * 7.6 + 24);
    return `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="26" rx="13" fill="var(--surface)" stroke="${k(c)}" stroke-width="2"/>
${text(cx, y + 17.5, label, { size: 12.5, weight: 700, ...ink })}`;
  };
  const mid = i => bx(i) + bw + gap / 2;
  const rowA = y0 + bh + 40;
  const links = [0, 1, 2].map(i => line(mid(i), y0 + bh / 2 + 6, mid(i), rowA, { c: 'var(--muted)', w: 1.4, dash: '3 3' })).join('');
  const rowB = rowA + 58;
  const cx4 = bx(3) + bw / 2;
  const links2 = line(cx4, y0 + bh + 4, cx4, rowB - 4, { c: 'var(--muted)', w: 1.4, dash: '3 3' });
  return svg(720, 236, `${boxes}${arrows}${links}
${pill(mid(0), rowA, tr('Remove stop words', 'Hapus stop words'), 3)}
${pill(mid(1), rowA, tr('Word weights', 'Bobot kata'), 3)}
${pill(mid(2), rowA, tr('Smoothing alpha', 'Smoothing alpha'), 0)}
${links2}
${pill(cx4 - 100, rowB, tr('Training size', 'Ukuran training set'), 0)}
${pill(cx4 + 100, rowB, tr('Seed (random split)', 'Seed (pembagian acak)'), 0)}
${text(10, 226, tr('The clues are learned from the training messages only. The test messages only check the answer.', 'Petunjuk dipelajari dari pesan training saja. Pesan test hanya untuk memeriksa jawaban.'), { anchor: 'start', size: 12.5 })}`);
}

// ---- Figure 2: test accuracy against smoothing alpha, at two training sizes. ----
function smoothingCurve() {
  const { over } = lab();
  const alphas = [0, 0.05, 0.1, 0.25, 0.5, 1, 1.5, 2];
  const W = 680, H = 316, left = 58, right = 26, top = 24, bottom = 62;
  const { Y, parts } = frame({ W, H, left, right, top, bottom });
  const X = i => left + 30 + (i / (alphas.length - 1)) * (W - left - right - 200);
  const series = [[60, k(0)], [12, k(3)]].map(([size, c]) => ({ size, c, vals: alphas.map(a => over({ alpha: a, size }, r => r.test.accuracy) * 100) }));
  const paths = series.map(({ c, vals }) => `<path d="${vals.map((v, i) => `${i ? 'L' : 'M'}${X(i)} ${Y(v)}`).join('')}" fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round"/>`
    + vals.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="4.5" fill="${c}"/>`).join('')).join('');
  const label = ({ size, c, vals }, dy) => text(X(alphas.length - 1) + 14, Y(vals[vals.length - 1]) + dy, tr(`${fmt(size)} training messages`, `${fmt(size)} pesan training`), { anchor: 'start', size: 12.5, weight: 700, fill: c });
  const marks = series.map(({ vals }, s) => [0, 5].map(i => text(X(i) + (i === 0 ? 22 : 0), Y(vals[i]) + (s === 0 && i !== 0 ? -12 : 22), pct(vals[i] / 100), { size: 12.5, weight: 700, ...ink })).join('')).join('');
  const xt = alphas.map((a, i) => `${line(X(i), H - bottom, X(i), H - bottom + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(i), H - bottom + 20, fmt(a), { size: 12 })}`).join('');
  return svg(W, H, `${parts}${paths}${marks}${xt}
${label(series[0], -4)}${label(series[1], 16)}
${text((left + W - right - 120) / 2 + 20, H - 22, tr('Smoothing alpha (the steps are not drawn to scale)', 'Smoothing alpha (jarak antar nilai tidak sesuai skala)'), { size: 12.5 })}
${text(left, 14, tr('Test accuracy, average of 10 random splits', 'Accuracy test, rata-rata dari 10 pembagian acak'), { anchor: 'start', size: 12.5, weight: 700, ...ink })}`);
}

// ---- Figure 3: training and test accuracy against the number of training messages. ----
function sizeCurve() {
  const { over } = lab();
  const sizes = Array.from({ length: 30 }, (_, i) => 6 * (i + 1));
  const W = 680, H = 316, left = 58, right = 100, top = 24, bottom = 62;
  const { Y, parts } = frame({ W, H, left, right, top, bottom, hi: 104 });
  const X = n => left + 16 + ((n - 6) / (180 - 6)) * (W - left - right - 32);
  const test = sizes.map(n => over({ size: n }, r => r.test.accuracy) * 100);
  const train = sizes.map(n => over({ size: n }, r => r.train.accuracy) * 100);
  const poly = vals => vals.map((v, i) => `${i ? 'L' : 'M'}${X(sizes[i])} ${Y(v)}`).join('');
  const gap = `<path d="${poly(train)}${[...sizes].reverse().map((n, j) => `L${X(n)} ${Y(test[sizes.length - 1 - j])}`).join('')}Z" fill="${soft(0)}" opacity="0.9"/>`;
  const xt = [6, 60, 120, 180].map(n => `${line(X(n), H - bottom, X(n), H - bottom + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(n), H - bottom + 20, fmt(n), { size: 12 })}`).join('');
  const last = sizes.length - 1;
  return svg(W, H, `${parts}${gap}
<path d="${poly(train)}" fill="none" stroke="var(--ink)" stroke-width="2.6" stroke-dasharray="7 4" stroke-linejoin="round"/>
<path d="${poly(test)}" fill="none" stroke="${k(0)}" stroke-width="3.2" stroke-linejoin="round"/>
${xt}
${text(X(180) + 10, Y(train[last]) - 10, tr('training', 'training'), { anchor: 'start', size: 12.5, weight: 700, ...ink })}
${text(X(180) + 10, Y(test[last]) + 18, tr('test', 'test'), { anchor: 'start', size: 12.5, weight: 700, fill: k(0) })}
${text(X(12), Y(93.5), tr(`${pct(train[0] / 100, 0)} on its own messages`, `${pct(train[0] / 100, 0)} pada pesannya sendiri`), { anchor: 'start', size: 12.5, ...ink })}
${text(X(6) + 8, Y(test[0]) + 20, tr(`${pct(test[0] / 100, 0)} on new ones`, `${pct(test[0] / 100, 0)} pada pesan baru`), { anchor: 'start', size: 12.5, weight: 700, fill: k(0) })}
${text(X(180) - 6, Y(60) - 2, tr(`gap at 180: ${fmt(train[last] - test[last], { digits: 1 })} points`, `selisih di 180: ${fmt(train[last] - test[last], { digits: 1 })} poin`), { anchor: 'end', size: 12.5 })}
${text((left + W - right) / 2 + 10, H - 22, tr('Training size (messages)', 'Ukuran training set (pesan)'), { size: 12.5 })}
${text(left, 14, tr('Accuracy, average of 10 random splits', 'Accuracy, rata-rata dari 10 pembagian acak'), { anchor: 'start', size: 12.5, weight: 700, ...ink })}`);
}

// ---- Figure 4: one wrong test message, word by word (the one the lab opens with). ----
function oneMistake() {
  const { classes, run } = lab();
  const s = run();
  const wrong = s.test.mistakes.map(i => {
    const p = predictProba(s.model, s.testDocs[i]);
    const j = p.reduce((b, x, n) => (x > p[b] ? n : b), 0);
    return { i, p: p[j], guess: s.model.classes[j] };
  }).sort((a, b) => (b.p - a.p) || (a.i - b.i))[0];
  const doc = s.testDocs[wrong.i], truth = s.testLabels[wrong.i], guess = wrong.guess;
  const why = pairContributions(s.model, doc, guess, truth);
  const tf = run({ features: 'tfidf' });
  const tfWhy = pairContributions(tf.model, doc, guess, truth);
  const tfP = predictProba(tf.model, doc)[tf.model.classes.indexOf(guess)];
  const cGuess = classes.indexOf(guess), cTruth = classes.indexOf(truth);
  const shown = why.items.slice(0, 8);
  const rest = why.items.slice(8);
  const rows = [...shown.map(it => ({ word: it.word, v: it.contribution })), { word: tr(`${fmt(rest.length)} other words`, `${fmt(rest.length)} kata lain`), v: rest.reduce((a, it) => a + it.contribution, 0), other: true }];
  const W = 700, zero = 380, u = 40, top = 100, rowH = 25;
  const bars = rows.map((r, i) => {
    const y = top + i * rowH, len = Math.abs(r.v) * u, right = r.v >= 0, c = right ? k(cGuess) : k(cTruth);
    const x = right ? zero : zero - len;
    return `${text(150, y + 15, r.word, { anchor: 'end', size: 13, weight: r.other ? 500 : 600, fill: r.other ? 'var(--muted)' : 'var(--ink)' })}
<rect x="${x}" y="${y + 3}" width="${len}" height="17" rx="3" fill="${c}" opacity="${r.other ? 0.55 : 1}"/>
${text(right ? zero + len + 6 : zero - len - 6, y + 16, `${r.v > 0 ? '+' : '−'}${fmt(Math.abs(r.v), { digits: 2 })}`, { anchor: right ? 'start' : 'end', size: 12.5, weight: 700, ...ink })}`;
  }).join('');
  const yEnd = top + rows.length * rowH;
  const pGuess = predictProba(s.model, doc)[s.model.classes.indexOf(guess)];
  const head = (a, b) => `${text(10, 24, a, { anchor: 'start', size: 12.5, weight: 700, ...ink })}${text(10, 43, b, { anchor: 'start', size: 12, fill: 'var(--muted)' })}`;
  const cut = (str, n) => (str.length > n ? `${str.slice(0, n - 1).trimEnd()}…` : str);
  const half = Math.ceil(doc.length / 2), sp = doc.indexOf(' ', half), l1 = sp > 0 ? doc.slice(0, sp) : doc, l2 = sp > 0 ? doc.slice(sp + 1) : '';
  return svg(W, yEnd + 86, `
${head(tr(`Test message. True class: ${className(truth)}. The model says: ${className(guess)} (${pct(pGuess)}).`, `Pesan test. Kelas sebenarnya: ${className(truth)}. Model menjawab: ${className(guess)} (${pct(pGuess)}).`), cut(l1, 98))}
${text(10, 60, cut(l2, 98), { anchor: 'start', size: 12, fill: 'var(--muted)' })}
${text(zero - 14, top - 14, tr(`toward ${className(truth)} (true class)`, `ke arah ${className(truth)} (kelas sebenarnya)`), { anchor: 'end', size: 12.5, weight: 700, fill: k(cTruth) })}
${text(zero + 14, top - 14, tr(`toward ${className(guess)} (model's choice)`, `ke arah ${className(guess)} (pilihan model)`), { anchor: 'start', size: 12.5, weight: 700, fill: k(cGuess) })}
${line(zero, top - 4, zero, yEnd + 2, { c: 'var(--muted)', w: 1.6 })}
${bars}
${line(10, yEnd + 10, W - 10, yEnd + 10, { c: 'var(--line)', w: 1 })}
${text(10, yEnd + 32, tr(`Sum of all pushes (word counts): ${why.total > 0 ? '+' : '−'}${fmt(Math.abs(why.total), { digits: 2 })} toward ${className(guess)}`, `Jumlah semua dorongan (jumlah kata): ${why.total > 0 ? '+' : '−'}${fmt(Math.abs(why.total), { digits: 2 })} ke arah ${className(guess)}`), { anchor: 'start', size: 13.5, weight: 700, ...ink })}
${text(10, yEnd + 56, tr(`The same message with TF-IDF weights: sum +${fmt(tfWhy.total, { digits: 2 })}, so ${className(guess)} gets ${pct(tfP)} instead of ${pct(pGuess)}.`, `Pesan yang sama dengan bobot TF-IDF: jumlah +${fmt(tfWhy.total, { digits: 2 })}, sehingga ${className(guess)} mendapat ${pct(tfP)} dan bukan ${pct(pGuess)}.`), { anchor: 'start', size: 12.5 })}`);
}

export const figures = {
  'controls-map': controlsMap,
  'smoothing-curve': smoothingCurve,
  'size-curve': sizeCurve,
  'one-mistake': oneMistake,
};
