import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tokenize, STOP_WORDS, buildVocab, bagOfWords, idf, tfidf, logSumExp,
  fitNaiveBayes, predictLogProba, predictProba, predict, topWords, explain, evaluate,
} from './naivebayes.js';
import { rng } from './rng.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const sum = xs => xs.reduce((s, v) => s + v, 0);

// The hand-worked example used throughout. Vocabulary (alphabetical): cash, free, meeting, report.
//   d1 spam: "free free cash"      d2 spam: "free meeting"      d3 ham: "meeting report meeting"
// Class totals: spam cash 1, free 3, meeting 1, report 0 (N = 5); ham cash 0, free 0, meeting 2,
// report 1 (N = 3). Priors 2/3 and 1/3. With alpha 1 and V = 4:
//   spam: cash 2/9, free 4/9, meeting 2/9, report 1/9      ham: cash 1/7, free 1/7, meeting 3/7, report 2/7
const DOCS = ['free free cash', 'free meeting', 'meeting report meeting'];
const LABELS = ['spam', 'spam', 'ham'];

test('tokenize: lowercases and splits on every run of non-letters', () => {
  assert.deepEqual(tokenize('Free CASH!!! Win 100 prizes, now-now.'), ['free', 'cash', 'win', 'prizes', 'now', 'now']);
  assert.deepEqual(tokenize("Don't stop"), ['don', 't', 'stop']);
  assert.deepEqual(tokenize('  \n\t '), []);
  assert.deepEqual(tokenize(''), []);
  assert.deepEqual(tokenize(null), []);
  assert.deepEqual(tokenize('Café di Jakarta'), ['café', 'di', 'jakarta']);
});

test('tokenize: stop-word options are English, Indonesian, both, or a custom list', () => {
  const text = 'The cat and the dog dan kucing yang lucu';
  assert.deepEqual(tokenize(text, { stopWords: 'en' }), ['cat', 'dog', 'dan', 'kucing', 'yang', 'lucu']);
  assert.deepEqual(tokenize(text, { stopWords: 'id' }), ['the', 'cat', 'and', 'the', 'dog', 'kucing', 'lucu']);
  assert.deepEqual(tokenize(text, { stopWords: 'both' }), ['cat', 'dog', 'kucing', 'lucu']);
  assert.deepEqual(tokenize(text, { stopWords: ['Cat', 'dog'] }), ['the', 'and', 'the', 'dan', 'kucing', 'yang', 'lucu']);
  assert.deepEqual(tokenize("Don't stop", { stopWords: 'en' }), ['stop']);
  assert.ok(STOP_WORDS.en.includes('the') && STOP_WORDS.id.includes('yang'));
  assert.throws(() => tokenize('x', { stopWords: 'fr' }), /stopWords/);
});

test('buildVocab: sorted words, document frequency, minDf', () => {
  const docs = [['b', 'a', 'a'], ['b', 'c'], ['b']];
  const v = buildVocab(docs);
  assert.deepEqual(v.words, ['a', 'b', 'c']);
  assert.deepEqual(v.df, [1, 3, 1]); // "a" twice in one document still counts once
  assert.equal(v.nDocs, 3);
  assert.equal(v.index.get('c'), 2);
  const v2 = buildVocab(docs, { minDf: 2 });
  assert.deepEqual(v2.words, ['b']);
  assert.deepEqual(v2.df, [3]);
});

test('bagOfWords: counts in vocabulary order, ignores unknown words', () => {
  const v = buildVocab([['cash', 'free', 'meeting', 'report']]);
  assert.deepEqual(bagOfWords(['free', 'free', 'cash', 'zebra'], v), [1, 2, 0, 0]);
  assert.deepEqual(bagOfWords(['free', 'free', 'cash'], v.words), [1, 2, 0, 0]);
  assert.deepEqual(bagOfWords([], v), [0, 0, 0, 0]);
});

test('idf and tfidf: three tiny documents, worked by hand', () => {
  // columns a, b, c; rows d1 = [2,1,0], d2 = [1,0,1], d3 = [1,0,0]; n = 3, df = [3, 1, 1]
  const M = [[2, 1, 0], [1, 0, 1], [1, 0, 0]];
  const w = idf(M);
  // idf_a = ln(4/4) + 1 = 1;  idf_b = idf_c = ln(4/2) + 1 = 1 + ln 2 = 1.693147
  close(w[0], 1);
  close(w[1], 1 + Math.log(2));
  close(w[2], 1 + Math.log(2));

  // Without normalisation: count * idf.
  const raw = tfidf(M, { norm: 'none' });
  close(raw[0][0], 2); close(raw[0][1], 1.693147, 1e-6); close(raw[0][2], 0);
  close(raw[1][0], 1); close(raw[1][1], 0); close(raw[1][2], 1.693147, 1e-6);
  close(raw[2][0], 1);

  // d1 length = sqrt(4 + 1.693147^2) = 2.620448 -> [0.763228, 0.646129, 0]
  // d2 length = sqrt(1 + 1.693147^2) = 1.966505 -> [0.508542, 0, 0.861037]
  // d3 length = 1                                -> [1, 0, 0]
  const l2 = tfidf(M);
  [[0.763228, 0.646129, 0], [0.508542, 0, 0.861037], [1, 0, 0]].forEach((row, i) =>
    row.forEach((v, j) => close(l2[i][j], v, 1e-6)));
  l2.forEach(row => close(Math.sqrt(sum(row.map(v => v * v))), 1));

  // A word in every document keeps weight 1 (not 0), a rarer word weighs more.
  assert.ok(w[1] > w[0]);
});

test('tfidf: all-zero rows stay zero, a given idf is used, bad norm throws', () => {
  const M = [[1, 0], [0, 0]];
  assert.deepEqual(tfidf(M)[1], [0, 0]);
  const out = tfidf([[1, 1]], { idf: [1, 3], norm: 'none' });
  assert.deepEqual(out, [[1, 3]]);
  assert.throws(() => tfidf(M, { norm: 'l1' }), /norm/);
  assert.deepEqual(tfidf([]), []);
});

test('logSumExp: stable for very negative and mixed values', () => {
  close(logSumExp([Math.log(2), Math.log(3)]), Math.log(5));
  close(logSumExp([-5000, -5000]), -5000 + Math.log(2));
  assert.equal(logSumExp([]), -Infinity);
  assert.equal(logSumExp([-Infinity, -Infinity]), -Infinity);
  close(logSumExp([-Infinity, 0]), 0);
});

test('fitNaiveBayes: counts, priors and smoothed likelihoods match the hand computation', () => {
  const m = fitNaiveBayes(DOCS, LABELS, { alpha: 1 });
  assert.deepEqual(m.classes, ['spam', 'ham']);
  assert.deepEqual(m.vocab.words, ['cash', 'free', 'meeting', 'report']);
  assert.deepEqual(m.classDocs, [2, 1]);
  assert.deepEqual(m.wordMass, [[1, 3, 1, 0], [0, 0, 2, 1]]);
  assert.deepEqual(m.classMass, [5, 3]);
  close(Math.exp(m.logPrior[0]), 2 / 3);
  close(Math.exp(m.logPrior[1]), 1 / 3);
  [2 / 9, 4 / 9, 2 / 9, 1 / 9].forEach((p, j) => close(Math.exp(m.logLik[0][j]), p));
  [1 / 7, 1 / 7, 3 / 7, 2 / 7].forEach((p, j) => close(Math.exp(m.logLik[1][j]), p));
  // each class's likelihoods form a distribution over the vocabulary
  m.logLik.forEach(row => close(sum(row.map(Math.exp)), 1));
});

test('predictProba: one posterior worked by hand', () => {
  // "free free meeting": spam = 2/3 * (4/9)^2 * 2/9 = 64/2187; ham = 1/3 * (1/7)^2 * 3/7 = 1/343
  const m = fitNaiveBayes(DOCS, LABELS);
  const spam = 64 / 2187, ham = 1 / 343;
  const p = predictProba(m, 'free free meeting');
  close(p[0], spam / (spam + ham)); // 0.909400
  close(p[0], 0.9094, 1e-4);
  close(p[1], ham / (spam + ham));
  close(sum(p), 1);
  assert.equal(predict(m, 'free free meeting'), 'spam');
  // token arrays are accepted as documents too
  close(predictProba(m, ['free', 'free', 'meeting'])[0], p[0]);
  // log probabilities exponentiate to the same thing
  predictLogProba(m, 'free free meeting').forEach((lp, i) => close(Math.exp(lp), p[i]));
});

test('unseen words: alpha 0 rules a class out, alpha 1 only makes it less likely', () => {
  // "report" never occurs in spam, "cash" and "free" never occur in ham.
  const sharp = fitNaiveBayes(DOCS, LABELS, { alpha: 0 });
  const smooth = fitNaiveBayes(DOCS, LABELS, { alpha: 1 });

  assert.equal(sharp.logLik[0][3], -Infinity);
  assert.equal(sharp.logLik[1][1], -Infinity);
  assert.ok(Number.isFinite(smooth.logLik[0][3]));

  // "report meeting": without smoothing spam is impossible, however good its other evidence.
  let p = predictProba(sharp, 'report meeting');
  assert.equal(p[0], 0);
  assert.equal(p[1], 1);
  // with alpha 1: spam = 2/3 * 1/9 * 2/9 = 4/243, ham = 1/3 * 2/7 * 3/7 = 6/147
  const s = 4 / 243, h = 6 / 147;
  p = predictProba(smooth, 'report meeting');
  close(p[0], s / (s + h)); // 0.2874
  assert.ok(p[0] > 0.28 && p[0] < 0.29);

  // "free report": each class has a word it never saw, so alpha 0 has no evidence at all: uniform.
  p = predictProba(sharp, 'free report');
  assert.deepEqual(p, [0.5, 0.5]);
  assert.ok(predictProba(smooth, 'free report').every(v => v > 0));

  // A word outside the vocabulary is ignored in both cases (it is not a zero count).
  close(predictProba(smooth, 'free free meeting zebra')[0], predictProba(smooth, 'free free meeting')[0]);
  assert.deepEqual(predictProba(sharp, 'report meeting zebra'), predictProba(sharp, 'report meeting'));
  // An empty document gets the priors.
  const prior = predictProba(smooth, '');
  close(prior[0], 2 / 3); close(prior[1], 1 / 3);
});

test('alpha controls how fast an observed word dominates (Lidstone)', () => {
  const small = fitNaiveBayes(DOCS, LABELS, { alpha: 0.1 });
  const big = fitNaiveBayes(DOCS, LABELS, { alpha: 10 });
  // bigger alpha pulls the likelihoods toward uniform (1/V), so the posterior moves toward the prior
  assert.ok(predictProba(small, 'free free')[0] > predictProba(big, 'free free')[0]);
  // alpha 10: spam likelihood of free = 13/(5+40) = 13/45
  close(Math.exp(big.logLik[0][1]), 13 / 45);
});

test('predictProba stays finite and sums to 1 for a very long document', () => {
  const m = fitNaiveBayes(DOCS, LABELS);
  const long = Array(4000).fill('free').join(' ') + ' ' + Array(3000).fill('report').join(' ');
  const joint0 = m.logPrior[0] + 4000 * m.logLik[0][1] + 3000 * m.logLik[0][3];
  assert.ok(joint0 < -1000, 'the unnormalised log joint is far below what exp can hold');
  const p = predictProba(m, long);
  assert.ok(p.every(Number.isFinite));
  close(sum(p), 1);
  assert.ok(predictLogProba(m, long).every(v => v <= 0));
});

test('topWords: highest log-odds against the other class, by hand', () => {
  const m = fitNaiveBayes(DOCS, LABELS);
  // spam vs ham: free ln((4/9)/(1/7)) = ln(28/9) = 1.1349, cash ln(14/9) = 0.4418,
  // meeting ln((2/9)/(3/7)) = ln(14/27) = -0.6567, report ln((1/9)/(2/7)) = ln(7/18) = -0.9445
  const spam = topWords(m, 'spam', 4);
  assert.deepEqual(spam.map(t => t.word), ['free', 'cash', 'meeting', 'report']);
  close(spam[0].logOdds, Math.log(28 / 9));
  close(spam[1].logOdds, Math.log(14 / 9));
  close(spam[2].logOdds, Math.log(14 / 27));
  close(spam[3].logOdds, Math.log(7 / 18));
  assert.deepEqual(spam.map(t => t.weight), [3, 1, 1, 0]);

  const ham = topWords(m, 'ham', 2);
  assert.deepEqual(ham.map(t => t.word), ['report', 'meeting']);
  close(ham[0].logOdds, Math.log(18 / 7));
  close(ham[1].logOdds, Math.log(27 / 14));
  assert.equal(topWords(m, 'ham').length, 4);
  assert.throws(() => topWords(m, 'nope', 3), /unknown class/);
});

test('topWords: with three classes the others are pooled', () => {
  const docs = ['a a b', 'b c', 'c c d'];
  const m = fitNaiveBayes(docs, ['x', 'y', 'z'], { alpha: 1 });
  // class x: a 2, b 1, c 0, d 0 (N 3); others pooled: a 0, b 1, c 3, d 1 (N 5); V = 4
  const top = topWords(m, 'x', 4);
  const pooled = (w, own, other) => Math.log(((own + 1) / (3 + 4)) / ((other + 1) / (5 + 4)));
  assert.deepEqual(top.map(t => t.word), ['a', 'b', 'd', 'c']);
  close(top[0].logOdds, pooled('a', 2, 0));
  close(top[1].logOdds, pooled('b', 1, 1));
  close(top[2].logOdds, pooled('d', 0, 1));
  close(top[3].logOdds, pooled('c', 0, 3));
});

test('explain: contributions add up to the log-odds of the prediction', () => {
  const m = fitNaiveBayes(DOCS, LABELS);
  const e = explain(m, 'free free meeting zebra');
  assert.equal(e.predicted, 'spam');
  assert.equal(e.rival, 'ham');
  close(e.prior, Math.log(2));
  assert.deepEqual(e.contributions.map(c => c.word), ['free', 'meeting']);
  close(e.contributions[0].contribution, 2 * Math.log(28 / 9)); // two occurrences of "free"
  close(e.contributions[1].contribution, Math.log(14 / 27)); // "meeting" argues for ham
  assert.ok(e.contributions[0].contribution > 0 && e.contributions[1].contribution < 0);
  assert.deepEqual(e.ignored, ['zebra']);
  // logOdds = ln(joint spam / joint ham) = ln(64/2187 * 343) = ln(21952/2187)
  close(e.logOdds, Math.log(21952 / 2187));
  const p = predictLogProba(m, 'free free meeting');
  close(e.logOdds, p[0] - p[1]);
  close(e.proba[0], 0.9094, 1e-4);
  assert.equal(explain(m, 'free free meeting', { k: 1 }).contributions.length, 1);
});

test('explain: names the runner-up as the rival with three classes, and explains a ham call', () => {
  const m = fitNaiveBayes(DOCS, LABELS);
  const e = explain(m, 'meeting report meeting');
  assert.equal(e.predicted, 'ham');
  assert.equal(e.rival, 'spam');
  close(e.prior, -Math.log(2));
  e.contributions.forEach(c => assert.ok(c.contribution > 0));
  const lp = predictLogProba(m, 'meeting report meeting');
  close(e.logOdds, lp[1] - lp[0]);

  const m3 = fitNaiveBayes(['a a b', 'b c', 'c c d'], ['x', 'y', 'z']);
  const e3 = explain(m3, 'c c');
  const lp3 = predictLogProba(m3, 'c c');
  const order = [0, 1, 2].sort((i, j) => lp3[j] - lp3[i]);
  assert.equal(e3.predicted, m3.classes[order[0]]);
  assert.equal(e3.rival, m3.classes[order[1]]);
  close(e3.logOdds, lp3[order[0]] - lp3[order[1]]);
});

test('explain with alpha 0 reports infinite evidence instead of NaN', () => {
  const m = fitNaiveBayes(DOCS, LABELS, { alpha: 0 });
  const e = explain(m, 'report meeting');
  assert.equal(e.predicted, 'ham');
  assert.equal(e.contributions[0].word, 'report');
  assert.equal(e.contributions[0].contribution, Infinity);
  assert.equal(e.logOdds, Infinity);
});

test('evaluate: accuracy and confusion matrix', () => {
  const m = fitNaiveBayes(DOCS, LABELS);
  const train = evaluate(m, DOCS, LABELS);
  assert.equal(train.accuracy, 1);
  assert.deepEqual(train.confusion, [[2, 0], [0, 1]]);
  assert.deepEqual(train.classes, ['spam', 'ham']);
  assert.deepEqual(train.mistakes, []);

  // "report report" is ham; calling it spam is the mistake we plant. Rows are the truth.
  const test2 = evaluate(m, ['free cash', 'report report', 'meeting meeting meeting'], ['spam', 'spam', 'ham']);
  assert.deepEqual(test2.predictions, ['spam', 'ham', 'ham']);
  assert.deepEqual(test2.confusion, [[1, 1], [0, 1]]);
  assert.deepEqual(test2.mistakes, [1]);
  assert.equal(test2.correct, 2);
  close(test2.accuracy, 2 / 3);
  assert.equal(sum(test2.confusion.flat()), test2.n);
  assert.throws(() => evaluate(m, ['x'], ['unknown']), /never saw/);
  assert.throws(() => evaluate(m, ['x', 'y'], ['spam']), /length/);
  assert.equal(evaluate(m, [], []).accuracy, 0);
});

test('tfidf features: weights are built from the training idf and the model reproduces them', () => {
  const docs = ['free free cash', 'free meeting', 'meeting report meeting'];
  const m = fitNaiveBayes(docs, LABELS, { features: 'tfidf', norm: 'none', alpha: 1 });
  // columns cash, free, meeting, report: df = [1, 2, 2, 1], n = 3
  const w = m.idf;
  close(w[0], Math.log(4 / 2) + 1);
  close(w[1], Math.log(4 / 3) + 1);
  close(w[2], Math.log(4 / 3) + 1);
  close(w[3], Math.log(4 / 2) + 1);
  // spam mass: cash 1*w0, free 3*w1, meeting 1*w2, report 0
  close(m.wordMass[0][0], w[0]); close(m.wordMass[0][1], 3 * w[1]); close(m.wordMass[0][2], w[2]);
  close(m.classMass[0], w[0] + 3 * w[1] + w[2]);
  const denom = m.classMass[0] + 4;
  close(Math.exp(m.logLik[0][1]), (3 * w[1] + 1) / denom);
  // the posterior of "free" uses the weight x = 1 * idf_free
  const x1 = w[1];
  const joint = c => m.logPrior[c] + x1 * m.logLik[c][1];
  const lse = Math.log(Math.exp(joint(0)) + Math.exp(joint(1)));
  close(predictLogProba(m, 'free')[0], joint(0) - lse);
  assert.equal(predict(m, 'free cash'), 'spam');
  assert.equal(predict(m, 'report meeting'), 'ham');
});

test('tfidf features with l2 normalisation: documents are unit length, so doc length stops mattering', () => {
  const m = fitNaiveBayes(DOCS, LABELS, { features: 'tfidf' }); // norm defaults to "l2"
  // the same words repeated 50 times give the same weights after normalisation
  close(predictProba(m, 'free meeting')[0], predictProba(m, Array(50).fill('free meeting').join(' '))[0]);
  // while raw counts lean ever harder on the evidence
  const c = fitNaiveBayes(DOCS, LABELS);
  assert.ok(predictProba(c, Array(50).fill('free meeting').join(' '))[0] > predictProba(c, 'free meeting')[0]);
  // the stored weights are the l2-normalised rows: "meeting report meeting" is the only ham row
  const w = m.idf, raw = [0, 0, 2 * w[2], w[3]];
  const len = Math.sqrt(sum(raw.map(v => v * v)));
  close(m.wordMass[1][2], raw[2] / len);
  close(m.wordMass[1][3], raw[3] / len);
});

test('options: minDf prunes rare words, stopWords apply in fit and predict, bad input throws', () => {
  const docs = ['the free cash', 'the free meeting', 'the meeting report'];
  const pruned = fitNaiveBayes(docs, LABELS, { minDf: 2, stopWords: 'en' });
  assert.deepEqual(pruned.vocab.words, ['free', 'meeting']);
  // "the" is a stop word, "cash" fell below minDf: both are ignored at prediction time
  assert.deepEqual(explain(pruned, 'the free cash').ignored, ['cash']);
  assert.throws(() => fitNaiveBayes(DOCS, ['a', 'a', 'a']), /two classes/);
  assert.throws(() => fitNaiveBayes(DOCS, ['a', 'b']), /length/);
  assert.throws(() => fitNaiveBayes(DOCS, LABELS, { alpha: -1 }), /alpha/);
  assert.throws(() => fitNaiveBayes(DOCS, LABELS, { features: 'bm25' }), /features/);
  assert.throws(() => fitNaiveBayes(DOCS, LABELS, { stopWords: 'xx' }), /stopWords/);
  assert.throws(() => fitNaiveBayes(['', ''], ['a', 'b']), /empty/);
});

// A small seeded two-topic corpus: each class has favourite words, and both share filler.
function corpus(n, seed) {
  const next = rng(seed);
  const topics = {
    sport: ['goal', 'team', 'match', 'coach', 'score', 'league'],
    tech: ['code', 'server', 'data', 'network', 'chip', 'cloud'],
  };
  const filler = ['today', 'new', 'report', 'people', 'year', 'again'];
  const docs = [], labels = [];
  for (let i = 0; i < n; i++) {
    const label = i % 2 ? 'tech' : 'sport';
    const words = [];
    for (let k = 0; k < 8; k++) {
      const pool = next() < 0.6 ? topics[label] : filler;
      words.push(pool[Math.floor(next() * pool.length)]);
    }
    docs.push(words.join(' '));
    labels.push(label);
  }
  return { docs, labels };
}

test('end to end on a seeded corpus: deterministic, accurate, and the top words are the topic words', () => {
  const train = corpus(120, 5), held = corpus(60, 99);
  const m1 = fitNaiveBayes(train.docs, train.labels);
  const m2 = fitNaiveBayes(train.docs, train.labels);
  assert.deepEqual(m1.logLik, m2.logLik);
  assert.deepEqual(predictProba(m1, held.docs[0]), predictProba(m2, held.docs[0]));
  for (const features of ['counts', 'tfidf']) {
    const m = fitNaiveBayes(train.docs, train.labels, { features });
    const r = evaluate(m, held.docs, held.labels);
    assert.ok(r.accuracy > 0.9, `${features} accuracy ${r.accuracy}`);
    const top = topWords(m, 'tech', 6).map(t => t.word).sort();
    assert.deepEqual(top, ['chip', 'cloud', 'code', 'data', 'network', 'server']);
    assert.ok(topWords(m, 'sport', 6).every(t => t.logOdds > 0));
  }
});

test('Indonesian text works the same way', () => {
  const docs = ['harga saham naik hari ini', 'saham dan bursa turun', 'tim sepak bola menang', 'pertandingan bola seru dan gol'];
  const labels = ['ekonomi', 'ekonomi', 'olahraga', 'olahraga'];
  const m = fitNaiveBayes(docs, labels, { stopWords: 'id' });
  assert.equal(predict(m, 'saham naik'), 'ekonomi');
  assert.equal(predict(m, 'bola menang'), 'olahraga');
  assert.ok(!m.vocab.words.includes('dan') && !m.vocab.words.includes('ini'));
});
