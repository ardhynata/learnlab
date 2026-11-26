// Pure helpers for the text lab (sims/labs/text-lab.js): a stratified seeded split of a message corpus,
// training and scoring one Naive Bayes model, the word-by-word comparison of two classes for one message,
// and the zero-probability check that the "smoothing 0" question needs. No DOM, no language: the lab turns
// the results into text. Tested in textlab.test.js.
//
// API
//   splitCorpus(labels, { classes, seed, testShare = 0.25, trainSize })
//        -> { train, test, maxTrain, nTest }   indices into the corpus.
//      Stratified by class and seeded. Every class gives round(testShare * its size) messages (at least 1)
//      to the FIXED test set; the rest is the training pool. The training set is the first trainSize
//      messages of the pool taken round-robin over the classes, so it always contains every class (when
//      trainSize >= number of classes), the first class comes first (so the model's class order is the
//      corpus class order), and a larger trainSize only ADDS messages: the smaller training set is a prefix
//      of the larger one. trainSize is clamped to [classes.length, maxTrain]. test is shuffled.
//   trainModel(docs, labels, split, { alpha, features, stopWords })
//        -> { model, test, train, trainAccuracy }
//      Fits fitNaiveBayes on split.train (stopWords: false | 'en' | 'id') and scores the held-out test set
//      (test = evaluate() with its confusion matrix re-indexed to the corpus class order) and the training set.
//   orderConfusion(modelClasses, confusion, classes) -> confusion with rows and columns in `classes` order.
//   rankedTopWords(model, className, k) -> topWords() with the words of infinite log-odds (alpha 0: a word seen in
//      this class and in no other) ordered by how often they occur, instead of alphabetically.
//   pairContributions(model, text, a, b)
//        -> { a, b, prior, items, ignored, removed, total, empty }
//      Why the model leans to class a rather than class b for this text (class names). Per distinct word of the
//      text that is in the vocabulary, contribution = x * (ln P(w|a) - ln P(w|b)) with x the count (or the
//      tf-idf weight the model uses); it may be +Infinity or -Infinity when smoothing is 0 and a class never saw
//      the word. items = [{ word, count, value, contribution, side }] side 'a' (pushes toward a), 'b' (toward b)
//      or 'neutral' (|contribution| < NEUTRAL), strongest first, ties alphabetical. ignored = distinct words that
//      are not in the vocabulary; removed = distinct stop words the model dropped; prior = ln P(a) - ln P(b);
//      total = prior + sum of contributions (NaN when +Infinity and -Infinity meet); empty = the text has no word
//      the model knows.
//   ruledOut(model, text) -> [{ cls, words }]: the classes whose probability for this text is exactly 0 because the
//      text holds a word that class never saw (only possible with alpha 0); words = those words.
//   findRuledOut(model, texts) -> { index, rule } for the first text where some, but not all, classes are
//      ruled out, else the first where all are, else null.

import { rng, shuffle } from './rng.js';
import {
  tokenize, bagOfWords, tfidf, fitNaiveBayes, evaluate, topWords, predictProba,
} from './naivebayes.js';

export const NEUTRAL = 0.05;

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function splitCorpus(labels, { classes, seed = 1, testShare = 0.25, trainSize } = {}) {
  const cls = classes ?? [...new Set(labels)];
  const random = rng(seed * 104729 + 17);
  const lists = cls.map(c => shuffle(labels.map((l, i) => (l === c ? i : -1)).filter(i => i >= 0), random));
  const cut = lists.map(l => Math.min(l.length - 1, Math.max(1, Math.round(testShare * l.length))));
  const test = shuffle(lists.flatMap((l, c) => l.slice(0, cut[c])), random);
  const pools = lists.map((l, c) => l.slice(cut[c]));
  const order = [];
  const longest = Math.max(0, ...pools.map(p => p.length));
  for (let r = 0; r < longest; r++) for (const p of pools) if (r < p.length) order.push(p[r]);
  const maxTrain = order.length;
  const want = trainSize == null ? maxTrain : trainSize;
  const size = Math.max(Math.min(cls.length, maxTrain), Math.min(maxTrain, Math.round(want)));
  return { train: order.slice(0, size), test, maxTrain, nTest: test.length };
}

export function orderConfusion(modelClasses, confusion, classes) {
  const at = classes.map(c => modelClasses.indexOf(c));
  return classes.map((_, i) => classes.map((__, j) => (at[i] < 0 || at[j] < 0 ? 0 : confusion[at[i]][at[j]])));
}

export function trainModel(docs, labels, split, { alpha = 1, features = 'counts', stopWords = false } = {}, classes) {
  const pick = idx => ({ docs: idx.map(i => docs[i]), labels: idx.map(i => labels[i]) });
  const tr = pick(split.train), te = pick(split.test);
  const model = fitNaiveBayes(tr.docs, tr.labels, { alpha, features, stopWords });
  const test = evaluate(model, te.docs, te.labels);
  const all = classes ?? model.classes;
  test.confusion = orderConfusion(model.classes, test.confusion, all);
  test.classes = all.slice();
  const train = evaluate(model, tr.docs, tr.labels);
  return { model, test, train, trainAccuracy: train.accuracy };
}

export function rankedTopWords(model, className, k = 10) {
  const all = topWords(model, className, Infinity);
  const infinite = all.filter(r => r.logOdds === Infinity)
    .sort((x, y) => (y.weight - x.weight) || cmp(x.word, y.word));
  const rest = all.filter(r => r.logOdds !== Infinity);
  return [...infinite, ...rest].slice(0, k);
}

// The model's own feature vector for some tokens: counts, or tf-idf with the training idf.
function vectorOf(model, tokens) {
  const counts = bagOfWords(tokens, model.vocab);
  return model.features === 'tfidf' ? tfidf([counts], { norm: model.norm, idf: model.idf })[0] : counts;
}

const keptTokens = (model, text) => tokenize(text, { stopWords: model.stopWords });

export function pairContributions(model, text, a, b) {
  const ia = model.classes.indexOf(a), ib = model.classes.indexOf(b);
  if (ia < 0 || ib < 0) throw new Error(`pairContributions: unknown class ${ia < 0 ? a : b}`);
  const tokens = keptTokens(model, text);
  const x = vectorOf(model, tokens);
  const counts = bagOfWords(tokens, model.vocab);
  const items = [];
  x.forEach((value, j) => {
    if (value === 0) return;
    const la = model.logLik[ia][j], lb = model.logLik[ib][j];
    const contribution = value * (la === lb ? 0 : la - lb);
    const side = Math.abs(contribution) < NEUTRAL ? 'neutral' : contribution > 0 ? 'a' : 'b';
    items.push({ word: model.vocab.words[j], count: counts[j], value, contribution, side });
  });
  items.sort((p, q) => {
    const mp = Math.abs(p.contribution), mq = Math.abs(q.contribution);
    return mp === mq ? cmp(p.word, q.word) : mq - mp;
  });
  const known = model.vocab.index;
  const ignored = [...new Set(tokens.filter(t => !known.has(t)))].sort(cmp);
  const kept = new Set(tokens);
  const removed = [...new Set(tokenize(text).filter(t => !kept.has(t)))].sort(cmp);
  const prior = model.logPrior[ia] - model.logPrior[ib];
  const total = items.reduce((s, it) => s + it.contribution, prior);
  return { a, b, prior, items, ignored, removed, total, empty: items.length === 0 };
}

export function ruledOut(model, text) {
  const tokens = keptTokens(model, text);
  const counts = bagOfWords(tokens, model.vocab);
  const out = [];
  model.classes.forEach((cls, c) => {
    const words = [];
    counts.forEach((n, j) => { if (n > 0 && model.logLik[c][j] === -Infinity) words.push(model.vocab.words[j]); });
    if (words.length) out.push({ cls, words });
  });
  return out;
}

export function findRuledOut(model, texts) {
  let allCase = null;
  for (let i = 0; i < texts.length; i++) {
    const rule = ruledOut(model, texts[i]);
    if (!rule.length) continue;
    if (rule.length < model.classes.length) return { index: i, rule };
    if (!allCase) allCase = { index: i, rule };
  }
  return allCase;
}

// Re-exported so a caller can score a text without importing two modules.
export { predictProba };
