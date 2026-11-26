import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCorpus } from './textdata.js';
import { fitNaiveBayes, explain, predictProba, topWords } from './naivebayes.js';
import {
  splitCorpus, trainModel, orderConfusion, rankedTopWords, pairContributions, ruledOut, findRuledOut, NEUTRAL,
} from './textlab.js';

const corpus = makeCorpus({ language: 'en', docsPerClass: 40, seed: 7 });
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('splitCorpus: stratified, disjoint, fixed test set, nested training sets', () => {
  const opts = { classes: corpus.classes, seed: 3, testShare: 0.25 };
  const small = splitCorpus(corpus.labels, { ...opts, trainSize: 12 });
  const big = splitCorpus(corpus.labels, { ...opts, trainSize: 60 });
  assert.equal(small.nTest, 30, 'a quarter of 40 per class, three classes');
  assert.equal(small.maxTrain, 90);
  assert.deepEqual(small.test, big.test, 'the test set does not change with the training size');
  assert.deepEqual(big.train.slice(0, 12), small.train, 'a smaller training set is a prefix of a larger one');
  assert.equal(new Set([...big.train, ...big.test]).size, big.train.length + big.test.length, 'no message in both sets');
  for (const sp of [small, big]) {
    const count = idx => corpus.classes.map(c => idx.filter(i => corpus.labels[i] === c).length);
    assert.deepEqual(count(sp.test), [10, 10, 10]);
  }
  assert.deepEqual(corpus.classes.map(c => small.train.filter(i => corpus.labels[i] === c).length), [4, 4, 4]);
  assert.equal(corpus.labels[small.train[0]], corpus.classes[0], 'the first class comes first');
});

test('splitCorpus: same seed same split, another seed another one; sizes are clamped', () => {
  const o = { classes: corpus.classes, trainSize: 30 };
  assert.deepEqual(splitCorpus(corpus.labels, { ...o, seed: 5 }), splitCorpus(corpus.labels, { ...o, seed: 5 }));
  assert.notDeepEqual(splitCorpus(corpus.labels, { ...o, seed: 5 }).test, splitCorpus(corpus.labels, { ...o, seed: 6 }).test);
  assert.equal(splitCorpus(corpus.labels, { ...o, seed: 1, trainSize: 1 }).train.length, 3, 'at least one per class');
  assert.equal(splitCorpus(corpus.labels, { ...o, seed: 1, trainSize: 10000 }).train.length, 90);
  assert.equal(splitCorpus(corpus.labels, { ...o, seed: 1, trainSize: undefined }).train.length, 90);
});

test('every training size can be fitted and scored, even the smallest', () => {
  for (const size of [3, 6, 9, 90]) {
    const sp = splitCorpus(corpus.labels, { classes: corpus.classes, seed: 2, trainSize: size });
    const r = trainModel(corpus.docs, corpus.labels, sp, { alpha: 0 }, corpus.classes);
    assert.deepEqual(r.model.classes, corpus.classes, 'model class order is the corpus class order');
    assert.equal(r.test.n, 30);
  }
});

test('orderConfusion re-indexes rows and columns', () => {
  const m = [[5, 1, 0], [2, 7, 3], [0, 4, 9]];            // classes in model order b, c, a
  const out = orderConfusion(['b', 'c', 'a'], m, ['a', 'b', 'c']);
  assert.deepEqual(out, [[9, 0, 4], [0, 5, 1], [3, 2, 7]]);
});

// Three tiny documents, worked by hand (see the comments).
const tiny = fitNaiveBayes(['cat dog', 'cat cat', 'fish dog'], ['x', 'x', 'y'], { alpha: 1 });
// x: cat 3, dog 1, fish 0, mass 4 -> P = 4/7, 2/7, 1/7.   y: cat 0, dog 1, fish 1, mass 2 -> P = 1/5, 2/5, 2/5.

test('pairContributions matches a hand computation', () => {
  const r = pairContributions(tiny, 'cat cat fish', 'x', 'y');
  close(r.prior, Math.log(2));
  const cat = r.items.find(i => i.word === 'cat'), fish = r.items.find(i => i.word === 'fish');
  assert.equal(cat.count, 2);
  close(cat.contribution, 2 * Math.log(20 / 7));
  close(fish.contribution, Math.log(5 / 14));
  assert.equal(cat.side, 'a');
  assert.equal(fish.side, 'b');
  assert.deepEqual(r.items.map(i => i.word), ['cat', 'fish'], 'strongest first');
  close(r.total, Math.log(2) + 2 * Math.log(20 / 7) + Math.log(5 / 14));
  // the total is the log-odds of the probabilities the model itself reports
  const p = predictProba(tiny, 'cat cat fish');
  close(r.total, Math.log(p[0] / p[1]));
});

test('pairContributions agrees with explain() for the predicted class and the runner-up, counts and tf-idf', () => {
  for (const features of ['counts', 'tfidf']) {
    const sp = splitCorpus(corpus.labels, { classes: corpus.classes, seed: 1, trainSize: 60 });
    const { model } = trainModel(corpus.docs, corpus.labels, sp, { alpha: 1, features }, corpus.classes);
    for (const i of sp.test.slice(0, 8)) {
      const e = explain(model, corpus.docs[i]);
      const r = pairContributions(model, corpus.docs[i], e.predicted, e.rival);
      close(r.prior, e.prior);
      const mine = new Map(r.items.map(it => [it.word, it.contribution]));
      assert.equal(mine.size, e.contributions.length);
      for (const c of e.contributions) close(mine.get(c.word), c.contribution);
      close(r.total, e.logOdds, 1e-9);
    }
  }
});

test('words outside the vocabulary are ignored, stop words are reported as removed', () => {
  const m = fitNaiveBayes(['the cat sat', 'the dog sat', 'a fish swims'], ['x', 'x', 'y'], { stopWords: 'en' });
  const r = pairContributions(m, 'The cat and a zebra', 'x', 'y');
  assert.deepEqual(r.ignored, ['zebra']);
  assert.deepEqual(r.removed, ['a', 'and', 'the']);
  assert.deepEqual(r.items.map(i => i.word), ['cat']);
  assert.equal(pairContributions(m, 'zebra', 'x', 'y').empty, true);
});

test('smoothing 0: a word a class never saw has contribution +/-Infinity and rules the class out', () => {
  const m = fitNaiveBayes(['cat dog', 'cat cat', 'fish dog'], ['x', 'x', 'y'], { alpha: 0 });
  const r = pairContributions(m, 'cat fish', 'x', 'y');
  const fish = r.items.find(i => i.word === 'fish'), cat = r.items.find(i => i.word === 'cat');
  assert.equal(fish.contribution, -Infinity);
  assert.equal(cat.contribution, Infinity);
  assert.ok(Number.isNaN(r.total), 'Infinity and -Infinity meet');
  assert.deepEqual(r.items.map(i => i.word).sort(), ['cat', 'fish']);
  assert.deepEqual(ruledOut(m, 'cat fish'), [{ cls: 'x', words: ['fish'] }, { cls: 'y', words: ['cat'] }]);
  assert.deepEqual(ruledOut(m, 'fish dog'), [{ cls: 'x', words: ['fish'] }]);
  assert.deepEqual(ruledOut(m, 'dog'), []);
  assert.deepEqual(predictProba(m, 'fish dog'), [0, 1]);
  assert.deepEqual(findRuledOut(m, ['dog', 'cat fish', 'fish dog']), { index: 2, rule: [{ cls: 'x', words: ['fish'] }] }, 'prefers a text where some but not all classes are ruled out');
  assert.deepEqual(findRuledOut(m, ['dog', 'cat fish']).index, 1, 'falls back to a text that rules out every class');
  assert.equal(findRuledOut(m, ['dog', 'dog dog']), null);
  // with smoothing 1 nothing is ruled out
  assert.deepEqual(ruledOut(tiny, 'cat fish'), []);
});

test('a word seen equally in both classes is neutral', () => {
  const m = fitNaiveBayes(['go home', 'go away'], ['x', 'y'], { alpha: 1 });
  const r = pairContributions(m, 'go', 'x', 'y');
  assert.equal(r.items[0].side, 'neutral');
  assert.ok(Math.abs(r.items[0].contribution) < NEUTRAL);
});

test('rankedTopWords puts infinite log-odds words by frequency, otherwise equals topWords', () => {
  const m0 = fitNaiveBayes(['cat cat cat dog', 'cat bird', 'fish dog'], ['x', 'x', 'y'], { alpha: 0 });
  const top = rankedTopWords(m0, 'x', 3);
  assert.deepEqual(top.map(t => t.word), ['cat', 'bird', 'dog']);
  assert.equal(top[0].logOdds, Infinity);
  assert.equal(top[0].weight, 4);
  const m1 = fitNaiveBayes(['cat cat cat dog', 'cat bird', 'fish dog'], ['x', 'x', 'y'], { alpha: 1 });
  assert.deepEqual(rankedTopWords(m1, 'y', 3), topWords(m1, 'y', 3));
});
