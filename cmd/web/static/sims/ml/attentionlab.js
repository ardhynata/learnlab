// Pure logic for the Attention lab (sims/labs/attention-lab.js), on top of sims/ml/attention.js.
// Part 1, trace attention: a bundled sentence or free text is split into tokens (words, characters or byte-pair
// merges), each token gets a small hand-built vector (plus the optional sinusoidal position code), and four named
// attention heads turn that into a weight matrix. Part 2, compare models: the three text models of
// attention.compareTextModels, but with the PREDICTIONS kept, so the lab can list the misclassified messages.
// Pure and deterministic. Tested in attentionlab.test.js.
//
// GENERATED DATA. The vocabulary below (about 25 words per language) and every vector in it are written by hand for
// this course; nothing is downloaded and nothing is trained. The four heads are SET BY HAND to show four typical
// patterns; a real model learns its heads from data. A token that is not a whole word in the vocabulary
// (a character, a piece of a word, an unknown word) has no hand-built meaning: a piece gets a made-up vector
// (a hash of its spelling) and an unknown word gets the "unknown" vector, and the lab says so.
//
// API
//   LAB_LANGUAGES                    ['en', 'id'].
//   TOKENIZERS                       ['words', 'chars', 'bpe'].
//   MAX_TOKENS = 24, MAX_TEXT = 80   a longer text is cut (tokens, then characters), so the matrix stays readable.
//   BPE_MERGES_MAX                   merges needed to turn every bundled word into one symbol (all words whole).
//   sentences(language)              -> [{ key, text }] the bundled sentences. The first is the default.
//   vocabularyWords(language)        -> string[] the words that have a hand-built vector.
//   wordVector(language, word)       -> number[12] | null    hand-built vector of a known word.
//   pieceVector(symbol)              -> number[12]           made-up, deterministic vector for any symbol.
//   HEADS                            [{ key, dk, dv }] the four heads: meaning, nearby, action, untrained.
//   traceAttention({ text, language, tokenizer, merges, positions, causal, head })
//       -> { tokens, n, cut, unknown, head, heads, weights, scores, outputs, X, dModel }
//       tokens: [{ text, display, id, kind }] kind 'word' | 'unknown' | 'piece'. weights is n x n (row = the
//       token that looks, column = the token looked at), each row sums to 1; with causal, entries above the
//       diagonal are exactly 0. heads: the weights of all four heads (for tests and the mix summary).
//   topMix(weights, tokens, row, k)  -> [{ index, token, weight }] the k largest weights of a row, biggest first.
//   comparePredictions({ language, seed, sizes, vectors })
//       -> { classes, sizes, test: { docs, labels }, rows: [{ nLabelled, naiveBayes, frozen, fineTuned }] }
//       each model entry is { accuracy, macroF1, predicted }.  Identical, number for number, to
//       attention.compareTextModels for the same language, seed, sizes and vectors (a test pins it).
//   trainTaskVectors(language)       -> the word vectors learned from the generated unlabelled corpus of that language.
//   misclassified(test, predicted)   -> [{ index, doc, truth, guess }] the wrong test messages, in test order.
//   winnerOf(accuracyA, accuracyB, margin = 0.03) -> 'a' | 'b' | 'tie'.

import { rng } from './rng.js';
import { makeCorpus } from './textdata.js';
import { fitNaiveBayes, predict as nbPredict } from './naivebayes.js';
import { fitLogistic, rawCoefficients, decisionScores } from './logistic.js';
import {
  wordTokenize, charTokenize, learnBpe, encodeWord, END_OF_WORD, makeVocabulary, toIds,
  addPositions, selfAttention, makeHead,
  generateUnlabelledCorpus, trainWordVectors, vectorOf, sentenceVector, labelledSubset, macroF1, softmax,
} from './attention.js';

export const LAB_LANGUAGES = ['en', 'id'];
export const TOKENIZERS = ['words', 'chars', 'bpe'];
export const MAX_TOKENS = 24;
export const MAX_TEXT = 80;

// ---------------------------------------------------------------------------------------------
// Vocabulary: one concept, one hand-built vector [animal, thing, action], and the word for it in each language.
// The lab vector has 12 numbers. The meaning sits in slots 6, 8 and 10 (the slow-moving sine slots of the position code,
// so adding a position barely disturbs it); every other slot is 0 for a word, which leaves the fast position slots 0 to 3 to
// the position code alone.
const CONCEPTS = [
  ['cat', 'kucing', [2.0, 0.0, 0.1]], ['dog', 'anjing', [1.9, 0.1, 0.1]], ['mouse', 'tikus', [1.6, 0.2, 0.1]],
  ['bird', 'burung', [1.7, 0.1, 0.3]], ['sat', 'duduk', [0.1, 0.2, 1.8]], ['ran', 'berlari', [0.1, 0.1, 2.0]],
  ['chased', 'mengejar', [0.1, 0.1, 2.0]], ['ate', 'makan', [0.1, 0.2, 1.9]], ['slept', 'tidur', [0.1, 0.0, 1.7]],
  ['mat', 'tikar', [0.0, 1.9, 0.0]], ['house', 'rumah', [0.0, 2.0, 0.0]], ['car', 'mobil', [0.1, 1.9, 0.1]],
  ['tree', 'pohon', [0.1, 1.8, 0.0]], ['fish', 'ikan', [0.4, 1.5, 0.0]],
  ['the', 'itu', [0.3, 0.3, 0.3]], ['a', 'sebuah', [0.3, 0.3, 0.3]], ['on', 'di', [0.2, 0.4, 0.2]],
  ['near', 'dekat', [0.2, 0.4, 0.2]], ['to', 'ke', [0.2, 0.4, 0.3]], ['and', 'dan', [0.2, 0.2, 0.2]],
];
const UNKNOWN = [0.25, 0.25, 0.25];
const MEANING = [6, 8, 10];
const DIM = 12;
const lab8 = m => { const v = new Array(DIM).fill(0); MEANING.forEach((slot, k) => { v[slot] = m[k]; }); return v; };
const TABLES = { en: new Map(), id: new Map() };
for (const [en, id, m] of CONCEPTS) { TABLES.en.set(en, lab8(m)); TABLES.id.set(id, lab8(m)); }

const SENTENCES = {
  en: ['the cat sat on the mat', 'the dog chased the cat', 'the bird sat on the tree', 'the cat ate the fish near the house', 'a dog ran to the car'],
  id: ['kucing duduk di tikar dan kucing tidur', 'anjing itu mengejar kucing', 'burung duduk di pohon', 'kucing makan ikan dekat rumah', 'anjing berlari ke mobil'],
};
const langOf = language => (language === 'id' ? 'id' : 'en');

export const sentences = language => SENTENCES[langOf(language)].map((text, i) => ({ key: `s${i}`, text }));
export const vocabularyWords = language => [...TABLES[langOf(language)].keys()];
export const wordVector = (language, word) => TABLES[langOf(language)].get(word)?.slice() ?? null;
const unknownVector = () => lab8(UNKNOWN);

// FNV-1a over the spelling seeds the generator: the same symbol always gets the same made-up vector.
export function pieceVector(symbol) {
  let h = 2166136261;
  for (const ch of String(symbol)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const random = rng(h || 1);
  return lab8([random() * 1.6, random() * 1.6, random() * 1.6]);
}

// ---------------------------------------------------------------------------------------------
// Tokenizers over the bundled text. The byte-pair merges are learnt from the bundled sentences of the language.
const bundledText = language => SENTENCES[langOf(language)].join(' ');
const bpeCache = new Map();
function fullBpe(language) {
  const key = langOf(language);
  if (!bpeCache.has(key)) bpeCache.set(key, learnBpe(bundledText(key), 400));
  return bpeCache.get(key);
}
export const bpeFor = (language, merges) => {
  const all = fullBpe(language);
  return { ...all, merges: all.merges.slice(0, Math.max(0, merges)) };
};

// Merges needed until every bundled word is one symbol.
const bpeMax = new Map();
export function bpeMergesMax(language) {
  const key = langOf(language);
  if (!bpeMax.has(key)) {
    const all = fullBpe(key);
    const words = [...new Set(wordTokenize(bundledText(key)))];
    let max = all.merges.length;
    for (let m = 0; m <= all.merges.length; m++) {
      const b = { merges: all.merges.slice(0, m) };
      if (words.every(w => encodeWord(w, b).length === 1)) { max = m; break; }
    }
    bpeMax.set(key, max);
  }
  return bpeMax.get(key);
}

const vocabCache = new Map();
function idVocabulary(language, tokenizer, merges) {
  const key = `${langOf(language)}|${tokenizer}|${tokenizer === 'bpe' ? merges : 0}`;
  if (!vocabCache.has(key)) {
    const text = bundledText(language);
    let tokens;
    if (tokenizer === 'chars') tokens = charTokenize(text);
    else if (tokenizer === 'bpe') { const b = bpeFor(language, merges); tokens = wordTokenize(text).flatMap(w => encodeWord(w, b)); } else tokens = wordTokenize(text);
    vocabCache.set(key, makeVocabulary(tokens));
  }
  return vocabCache.get(key);
}

const showSymbol = s => (s === ' ' ? '␣' : s.split(END_OF_WORD).join('·'));

// Splits the text into token records { text, kind, vec }.
function splitText(text, language, tokenizer, merges) {
  const table = TABLES[langOf(language)];
  if (tokenizer === 'chars') return charTokenize(text).map(c => ({ text: c, kind: 'piece', vec: pieceVector(c) }));
  if (tokenizer === 'bpe') {
    const b = bpeFor(language, merges);
    return wordTokenize(text).flatMap(w => {
      const symbols = encodeWord(w, b);
      if (symbols.length === 1) {
        // A whole word: it has its hand-built vector (or the unknown one).
        const known = table.has(w);
        return [{ text: symbols[0], kind: known ? 'word' : 'unknown', vec: known ? table.get(w).slice() : unknownVector() }];
      }
      return symbols.map(s => ({ text: s, kind: 'piece', vec: pieceVector(s) }));
    });
  }
  return wordTokenize(text).map(w => (table.has(w)
    ? { text: w, kind: 'word', vec: table.get(w).slice() }
    : { text: w, kind: 'unknown', vec: unknownVector() }));
}

// ---------------------------------------------------------------------------------------------
// The four heads, set by hand. Rows are the 12 slots of the token vector, columns the head's own width.
const select = (rows, gain, width = rows.length) => Array.from({ length: DIM }, (_, r) => {
  const at = rows.indexOf(r);
  return Array.from({ length: width }, (_, c) => (at === c ? gain : 0));
});
const column = weights => weights.map(w => [w]);

export const HEADS = [
  { key: 'meaning', dk: 3, dv: 3 },    // looks at tokens with a similar meaning (the dot product of the meaning slots)
  { key: 'nearby', dk: 2, dv: 3 },     // looks at tokens that are close by, using ONLY the position code
  { key: 'action', dk: 1, dv: 3 },     // names and things look for the action word
  { key: 'untrained', dk: 2, dv: 2 },  // random weights: what a head looks like before any training
];

// Random weights, scaled up so the pattern is visible: what a head looks like before any training.
function randomHead() {
  const h = makeHead(DIM, 2, 7), up = m => m.map(row => row.map(v => v * 2));
  return { Wq: up(h.Wq), Wk: up(h.Wk), Wv: h.Wv };
}

let headCache = null;
export function handHeads() {
  if (headCache) return headCache;
  const value = select(MEANING, 1);
  const only = (slots, weight) => column(Array.from({ length: DIM }, (_, r) => (slots.includes(r) ? weight : 0)));
  headCache = [
    { Wq: select(MEANING, 1), Wk: select(MEANING, 1), Wv: value },
    { Wq: select([2, 3], 3), Wk: select([2, 3], 3), Wv: value },
    { Wq: only([6, 8], 0.5), Wk: only([10], 1), Wv: value },
    randomHead(),
  ];
  return headCache;
}

// text -> tokens -> vectors (+ position) -> attention of all four heads.
export function traceAttention({ text = '', language = 'en', tokenizer = 'words', merges = 0, positions = true, causal = false, head = 'meaning' } = {}) {
  const clean = String(text ?? '').slice(0, MAX_TEXT);
  let parts = splitText(clean, language, tokenizer, merges);
  const cut = parts.length > MAX_TOKENS || String(text ?? '').length > MAX_TEXT;
  parts = parts.slice(0, MAX_TOKENS);
  const vocab = idVocabulary(language, tokenizer, merges);
  const ids = toIds(vocab, parts.map(p => p.text));
  const tokens = parts.map((p, i) => ({ text: p.text, display: showSymbol(p.text), id: ids[i], kind: p.kind }));
  if (!tokens.length) return { tokens, n: 0, cut, unknown: 0, head, heads: [], weights: [], scores: [], outputs: [], X: [], dModel: DIM };
  let X = parts.map(p => p.vec);
  if (positions) X = addPositions(X);
  const results = handHeads().map(h => selfAttention({ tokens: X, Wq: h.Wq, Wk: h.Wk, Wv: h.Wv, causal }));
  const at = Math.max(0, HEADS.findIndex(h => h.key === head));
  return {
    tokens, n: tokens.length, cut, unknown: tokens.filter(t => t.kind === 'unknown').length, head: HEADS[at].key,
    heads: results.map(r => r.weights), weights: results[at].weights, scores: results[at].scores, outputs: results[at].outputs,
    X, dModel: DIM,
  };
}

export function topMix(weights, tokens, row, k = 3) {
  const list = weights[row].map((weight, index) => ({ index, token: tokens[index], weight }));
  return list.filter(x => x.weight > 0).sort((a, b) => (b.weight - a.weight) || (a.index - b.index)).slice(0, k);
}

// ---------------------------------------------------------------------------------------------
// Part 2: the three text models, with predictions kept.

export function trainTaskVectors(language = 'en') {
  const lang = langOf(language);
  const docs = generateUnlabelledCorpus({ language: lang }).docs;
  return trainWordVectors(docs, { stopWords: lang });
}

const argmaxOf = values => values.reduce((best, v, i) => (v > values[best] ? i : best), 0);
const dotv = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

function fitOneVsRest(X, labels, classes) {
  const models = classes.map(c => fitLogistic(X, labels.map(l => (l === c ? 1 : 0)), { lr: 0.3, iters: 300, l2: 0.01, standardize: true }));
  return {
    models,
    predict: rows => {
      const per = models.map(m => decisionScores(m, rows));
      return rows.map((_, i) => classes[argmaxOf(per.map(s => s[i]))]);
    },
  };
}

// Same steps as attention.js: a softmax head started from the one-vs-rest model, then full-batch gradient steps that also
// move a COPY of the word vectors the labelled messages use.
function fineTune(base, labelledTokens, labelled, classes, vectors, { steps, rate }) {
  const dim = vectors.dim;
  const table = new Map();
  for (const t of labelledTokens) for (const w of t) if (!table.has(w) && vectorOf(vectors, w)) table.set(w, vectorOf(vectors, w).slice());
  const lookup = w => table.get(w) ?? vectorOf(vectors, w);
  const coefs = base.models.map(rawCoefficients);
  const W = coefs.map(c => c.weights.slice());
  const b = coefs.map(c => c.bias);
  const target = labelled.map(l => classes.indexOf(l));
  const embedDoc = tokens => {
    const sum = new Array(dim).fill(0);
    let n = 0;
    for (const w of tokens) { const v = lookup(w); if (!v) continue; for (let j = 0; j < dim; j++) sum[j] += v[j]; n++; }
    return { x: n ? sum.map(s => s / n) : sum, n };
  };
  for (let s = 0; s < steps; s++) {
    const gW = W.map(() => new Array(dim).fill(0));
    const gb = new Array(classes.length).fill(0);
    const gTable = new Map();
    labelledTokens.forEach((tokens, i) => {
      const { x, n } = embedDoc(tokens);
      if (!n) return;
      const p = softmax(W.map((w, k) => dotv(w, x) + b[k]));
      const gx = new Array(dim).fill(0);
      p.forEach((pk, k) => {
        const err = (pk - (target[i] === k ? 1 : 0)) / labelledTokens.length;
        gb[k] += err;
        for (let j = 0; j < dim; j++) { gW[k][j] += err * x[j]; gx[j] += err * W[k][j]; }
      });
      for (const w of tokens) {
        if (!table.has(w)) continue;
        const g = gTable.get(w) ?? new Array(dim).fill(0);
        for (let j = 0; j < dim; j++) g[j] += gx[j] / n;
        gTable.set(w, g);
      }
    });
    W.forEach((w, k) => { for (let j = 0; j < dim; j++) w[j] -= rate * gW[k][j]; b[k] -= rate * gb[k]; });
    for (const [w, g] of gTable) { const v = table.get(w); for (let j = 0; j < dim; j++) v[j] -= rate * g[j]; }
  }
  return docTokens => docTokens.map(tokens => {
    const { x } = embedDoc(tokens);
    return classes[argmaxOf(W.map((w, k) => dotv(w, x) + b[k]))];
  });
}

const accuracyOf = (actual, predicted) => (actual.length ? actual.filter((a, i) => a === predicted[i]).length / actual.length : 0);
const scored = (actual, predicted, classes) => ({ accuracy: accuracyOf(actual, predicted), macroF1: macroF1(actual, predicted, classes), predicted });

export const SIZES = [3, 5, 8, 12, 20, 30, 45, 75, 120, 200, 360];

// One size of the comparison (the same models and settings as attention.compareTextModels), keeping the predictions.
export function scoreSize({ train, test, vectors, n, seed = 1, tuneSteps = 12, tuneRate = 1 }) {
  const classes = [...new Set(train.labels)].sort();
  const testTokens = test.docs.map(wordTokenize);
  const testX = testTokens.map(t => sentenceVector(t, vectors));
  const pick = labelledSubset(train.labels, n, seed);
  const docs = pick.map(i => train.docs[i]);
  const labels = pick.map(i => train.labels[i]);
  const tokens = docs.map(wordTokenize);
  const nb = fitNaiveBayes(docs, labels);
  const nbPred = test.docs.map(d => nbPredict(nb, d));
  const present = classes.filter(c => labels.includes(c));
  const X = tokens.map(t => sentenceVector(t, vectors));
  const ovr = fitOneVsRest(X, labels, present);
  const frozenPred = ovr.predict(testX);
  const tunedPred = fineTune(ovr, tokens, labels, present, vectors, { steps: tuneSteps, rate: tuneRate })(testTokens);
  return {
    nLabelled: pick.length,
    naiveBayes: scored(test.labels, nbPred, classes),
    frozen: scored(test.labels, frozenPred, classes),
    fineTuned: scored(test.labels, tunedPred, classes),
  };
}

export const taskCorpora = (language = 'en', seed = 1) => ({
  train: makeCorpus({ language: langOf(language), docsPerClass: 120, seed: 31 + seed }),
  test: makeCorpus({ language: langOf(language), docsPerClass: 60, seed: 4242 }),
});

export function comparePredictions({ language = 'en', seed = 1, sizes = SIZES, vectors } = {}) {
  const { train, test } = taskCorpora(language, seed);
  const vec = vectors ?? trainTaskVectors(language);
  const list = Array.isArray(sizes) ? sizes : [sizes];
  return {
    classes: [...new Set(train.labels)].sort(),
    sizes: list,
    test: { docs: test.docs, labels: test.labels },
    rows: list.map(n => scoreSize({ train, test, vectors: vec, n, seed })),
  };
}

export const misclassified = (test, predicted) => test.docs
  .map((doc, index) => ({ index, doc, truth: test.labels[index], guess: predicted[index] }))
  .filter(r => r.truth !== r.guess);

export function winnerOf(a, b, margin = 0.03) {
  if (Math.abs(a - b) <= margin + 1e-12) return 'tie';
  return a > b ? 'a' : 'b';
}
