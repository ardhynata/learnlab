// Language helpers for the "NLP and transformers" module: tokenizers, a tiny byte-pair-merge learner,
// a vocabulary, positional encoding, a hand-built embedding table, single-head and multi-head
// self-attention, a "pretrained" word-vector model that needs NO download, and a harness that
// compares a bag-of-words baseline with frozen and fine-tuned pretrained vectors.
// Pure and deterministic: the same inputs and seed always give the same numbers. No Math.random; every
// draw comes from rng.js. Tested in attention.test.js.
//
// GENERATED DATA. The "unlabelled corpus" the word vectors learn from is NOT real text and not a web
// crawl. It is generated here, by generateUnlabelledCorpus(), from the same word banks and templates as
// the text-lab messages in textdata.js (three topics: billing, delivery, technical problem), with the
// labels thrown away. The topics are consistent, so words of one topic co-occur and the vectors have
// structure. Real pretrained models learn from billions of real words; this one learns from a few
// thousand generated ones and only shows the IDEA. Because the labelled and unlabelled messages come
// from the same generator (different draws, different seeds), the transfer here is easier than it would
// be with real text; the lesson must say so.
//
// STABLE API (the NLP lab and lessons import this; change it only by adding):
//
// 1. Tokenizers, byte-pair merges and the vocabulary
//   wordTokenize(text)                  -> string[]  lowercase words (letters and apostrophes), in order.
//   charTokenize(text)                  -> string[]  every character of the text (spaces included), in order.
//   END_OF_WORD = '</w>'                the marker that is appended to the last symbol of every word in BPE.
//   learnBpe(corpus, merges)            -> { merges, vocab, wordCounts }
//       corpus: a string or an array of strings. Words are split into characters plus END_OF_WORD, so
//       "low" is [l, o, w, </w>]. Each round counts every adjacent pair of symbols over the corpus (a word
//       counts as many times as it occurs) and merges the most frequent pair into one new symbol. A tie
//       goes to the pair seen first (first word first, left to right). It stops early when no pair is left.
//       merges is the list of merged pairs in order, [['l','o'], ['lo','w'], ...]; vocab the symbols that
//       exist at the end (all characters, END_OF_WORD and every merged symbol), sorted; wordCounts a Map
//       word -> count.
//   encodeWord(word, bpe)               -> string[]  the symbols of one word: characters plus END_OF_WORD,
//       then the learnt merges applied in the order they were learnt. An unseen word still encodes (it
//       falls back to characters), which is why BPE has no unknown words.
//   encode(text, bpe)                   -> string[]  encodeWord of every word of the text, joined.
//   decode(symbols)                     -> string    the words back, separated by single spaces.
//   makeVocabulary(tokens, { minCount = 1, specials = ['<pad>', '<unk>'] })
//                                       -> { tokens, size, index, counts }
//       tokens: a flat array of tokens (or an array of arrays). The specials come first (ids 0 and 1),
//       then every token seen at least minCount times, most frequent first, ties alphabetical. index is a
//       Map token -> id; counts is a Map token -> count (specials 0).
//   toIds(vocab, tokens)                -> number[]  the id of each token; an unknown token gets the id of
//                                          '<unk>' (or -1 when the vocabulary has no '<unk>').
//   fromIds(vocab, ids)                 -> string[]  the tokens back.
//
// 2. Positions and embeddings
//   positionalEncoding(pos, dim)        -> number[dim]   the sinusoidal code of Vaswani et al.:
//       PE[2i] = sin(pos / 10000^(2i/dim)), PE[2i+1] = cos(pos / 10000^(2i/dim)). Position 0 is
//       [0, 1, 0, 1, ...]. An odd dim leaves the last slot as a sine.
//   positionalMatrix(n, dim)            -> number[n][dim]  positions 0 .. n-1.
//   addPositions(X)                     -> X + positional code, row by row (a new matrix).
//   TOY_EMBEDDINGS                      a hand-built table { word: [x, y] } with 2-D vectors: x is roughly
//       "how animal-like", y "how place-or-thing-like", so cat, dog and mouse sit together. Words:
//       cat, dog, mouse, bird, sat, ran, on, the, mat, house, car, tree, unk.
//   embed(tokens, table, { unknown = 'zero' })
//                                       -> number[n][d]  one row per token, copied from the table. A token
//       missing from the table gets the table's 'unk' row when it has one, otherwise a row of zeros
//       (unknown: 'zero') or an error (unknown: 'throw').
//
// 3. Attention
//   softmax(values)                     -> numbers that sum to 1 (stable: subtracts the max; -Infinity -> 0).
//   selfAttention({ tokens, Wq, Wk, Wv, causal = false, embeddings })
//                                       -> { Q, K, V, rawScores, scores, weights, outputs, dk, causal }
//       tokens: n rows of d numbers (or n strings when `embeddings` is a table, see embed). Wq and Wk are
//       d x dk, Wv is d x dv, matrices as arrays of rows. A missing W is the identity (so dk = dv = d).
//         Q = X Wq, K = X Wk, V = X Wv                 (one row per token)
//         rawScores[i][j] = Q[i] . K[j]
//         scores[i][j]    = rawScores[i][j] / sqrt(dk)  (the SCALED score matrix)
//         weights[i]      = softmax(scores[i])          (each row sums to 1)
//         outputs[i]      = sum_j weights[i][j] V[j]
//       causal: true hides the future. scores[i][j] becomes -Infinity for j > i (rawScores stays as it
//       is), so weights[i][j] is exactly 0 there and row i is a softmax over positions 0 .. i only.
//   makeHead(dModel, dHead, seed)       -> { Wq, Wk, Wv }  seeded small random weights for one head
//       (uniform in [-s, s], s = 1/sqrt(dModel)); names the three matrices of a head.
//   multiHead({ tokens, heads, Wo, causal = false, embeddings })
//                                       -> { heads, concat, outputs }
//       heads: an array of { Wq, Wk, Wv }, one per head ("head 0", "head 1", ...). Each head is a
//       selfAttention over the same tokens; heads[h] is its full result. concat[i] joins the outputs of
//       all heads for token i. Wo (optional, (nHeads * dv) x dOut) mixes the concatenation; without Wo,
//       outputs equals concat.
//
// 4. A "pretrained" representation with no downloads
//   generateUnlabelledCorpus({ docs = 900, seed = 2024, language = 'en' })
//                                       -> { docs, generated: true, note, language }
//       The generated, unlabelled messages described above (a different seed from the labelled sets).
//   trainWordVectors(docs, { dim = 8, window = 40, minCount = 3, stopWords = 'en' })
//                                       -> { words, index, vectors, dim, counts, window, minCount }
//       Word vectors learned from unlabelled text, deterministically:
//         1. count co-occurrence: every pair of words within `window` positions of each other in a
//            message adds 1 / distance to both C[a][b] and C[b][a] (C is symmetric). The messages are
//            short, so the default window of 40 means "the same message", which is what ties a word to
//            its TOPIC; a window of 2 to 4 ties it to its grammar neighbours instead. Function words
//            (the short stop-word list of naivebayes.js; stopWords: false keeps them, or pass your own
//            array) are dropped first, because they sit next to everything and carry no topic;
//         2. PPMI[a][b] = max(0, ln( C[a][b] * total / (rowSum[a] * rowSum[b]) )), the positive
//            pointwise mutual information (how much more often than chance a and b meet);
//         3. a small SVD: PPMI is symmetric, so its SVD is its eigen-decomposition (eigenSym of
//            linalg.js). The vector of word a is the row of the top `dim` eigenvectors scaled by
//            sqrt(|eigenvalue|), the best dim-number summary of the PPMI table.
//       Words seen fewer than minCount times (typos, mostly) and stop words get no vector, and
//       sentenceVector skips them. words is alphabetical.
//   vectorOf(model, word)               -> number[dim] | null
//   cosine(a, b)                        -> number in [-1, 1] (0 when either vector is all zeros).
//   nearestWords(model, word, k = 5)    -> [{ word, similarity }] the k words closest by cosine, best first.
//   sentenceVector(words, vectors)      -> number[dim]  the average of the vectors of the words that have
//       one (words: an array of tokens or a string; vectors: a trainWordVectors result or a Map word ->
//       vector). A sentence with no known word gives the zero vector.
//
// 5. The comparison harness
//   macroF1(actual, predicted, classes) -> number  mean over classes of 2tp / (2tp + fp + fn) (0 for a
//       class with no tp, fp or fn counts as 0), so a rare class matters as much as a common one.
//   labelledSubset(labels, n, seed)     -> number[]  n indices into `labels`, balanced across classes
//       (classes take turns, in order of first appearance) and shuffled per class by the seed. n is capped
//       at labels.length. The same n and seed always pick the same indices.
//   compareTextModels({ train, test, unlabelled, nLabelled, seed = 1, vectors, dim = 8, window = 40,
//                       tuneSteps = 12, tuneRate = 1 })
//                                       -> { classes, nUnlabelled, vocabSize, dim, seed, results }
//       classes: the class names, alphabetical.
//       train, test: { docs, labels } (docs are strings). Defaults: makeCorpus({ docsPerClass: 120,
//       seed: 31 + seed }) and makeCorpus({ docsPerClass: 60, seed: 4242 }). unlabelled: an array of
//       strings (default generateUnlabelledCorpus().docs). nLabelled: a number or an array of numbers,
//       the sizes of the labelled set (default [6, 15, 45, 150, 360]); labelled sets are
//       labelledSubset(train.labels, n, seed), each size drawn on its own.
//       Every size is scored on the same test set with three models that see the same labelled messages:
//         naiveBayes  (a) bag-of-words multinomial Naive Bayes (naivebayes.js, the intermediate baseline)
//         frozen      (b) average of the pretrained word vectors + one-vs-rest logistic regression
//                         (logistic.js, one model per class, the class with the highest score wins);
//                         the vectors are never changed
//         fineTuned   (c) the same, then `tuneSteps` full-batch gradient steps of a softmax head on the
//                         labelled messages that also move the word vectors the messages use (a copy;
//                         the pretrained table is untouched). Vectors of words that no labelled message
//                         uses do not move, which is the honest limit of a few labels.
//       Each of the three is { accuracy, macroF1 }. results is one entry per size:
//       { nLabelled, naiveBayes, frozen, fineTuned }. The vectors are trained once per call (or taken
//       from `vectors`, a trainWordVectors result).

import { rng, shuffle } from './rng.js';
import { eigenSym } from './linalg.js';
import { makeCorpus } from './textdata.js';
import { fitNaiveBayes, predict as nbPredict, STOP_WORDS } from './naivebayes.js';
import { fitLogistic, rawCoefficients, decisionScores } from './logistic.js';

// ---------------------------------------------------------------------------------------------
// 1. Tokenizers, byte-pair merges, vocabulary

export const wordTokenize = text => (String(text ?? '').toLowerCase().match(/[\p{L}']+/gu) || []);
export const charTokenize = text => Array.from(String(text ?? ''));

export const END_OF_WORD = '</w>';

const wordsOf = corpus => (Array.isArray(corpus) ? corpus : [corpus]).flatMap(wordTokenize);
const spell = word => (word ? [...Array.from(word), END_OF_WORD] : []);

// Merge every adjacent (a, b) in `symbols` into 'ab'.
function applyMerge(symbols, a, b) {
  const out = [];
  for (let i = 0; i < symbols.length; i++) {
    if (i < symbols.length - 1 && symbols[i] === a && symbols[i + 1] === b) { out.push(a + b); i++; } else out.push(symbols[i]);
  }
  return out;
}

export function learnBpe(corpus, merges) {
  if (!Number.isInteger(merges) || merges < 0) throw new RangeError('learnBpe: merges must be a whole number, 0 or more');
  const wordCounts = new Map();
  for (const w of wordsOf(corpus)) wordCounts.set(w, (wordCounts.get(w) ?? 0) + 1);
  let split = [...wordCounts].map(([w, c]) => ({ symbols: spell(w), count: c }));
  const learnt = [];
  for (let m = 0; m < merges; m++) {
    const pairCounts = new Map(); // insertion order = first seen, which breaks ties
    for (const { symbols, count } of split) {
      for (let i = 0; i < symbols.length - 1; i++) {
        const key = `${symbols[i]}\u0000${symbols[i + 1]}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + count);
      }
    }
    let best = null, bestCount = 0;
    for (const [key, c] of pairCounts) if (c > bestCount) { best = key; bestCount = c; }
    if (best === null) break;
    const [a, b] = best.split('\u0000');
    learnt.push([a, b]);
    split = split.map(({ symbols, count }) => ({ symbols: applyMerge(symbols, a, b), count }));
  }
  const chars = [...wordCounts.keys()].flatMap(w => Array.from(w));
  const vocab = [...new Set([...chars, END_OF_WORD, ...learnt.map(([x, y]) => x + y)])].sort();
  return { merges: learnt, vocab, wordCounts };
}

export function encodeWord(word, bpe) {
  let symbols = spell(String(word).toLowerCase());
  for (const [a, b] of bpe.merges) symbols = applyMerge(symbols, a, b);
  return symbols;
}

export const encode = (text, bpe) => wordTokenize(text).flatMap(w => encodeWord(w, bpe));

export function decode(symbols) {
  const words = [];
  let current = '';
  for (const s of symbols) {
    if (s.endsWith(END_OF_WORD)) { words.push(current + s.slice(0, -END_OF_WORD.length)); current = ''; } else current += s;
  }
  if (current) words.push(current);
  return words.join(' ');
}

export function makeVocabulary(tokens, { minCount = 1, specials = ['<pad>', '<unk>'] } = {}) {
  const flat = tokens.length && Array.isArray(tokens[0]) ? tokens.flat() : tokens;
  const counts = new Map();
  for (const t of flat) counts.set(t, (counts.get(t) ?? 0) + 1);
  const kept = [...counts].filter(([t, c]) => c >= minCount && !specials.includes(t))
    .sort((x, y) => (y[1] - x[1]) || (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0)).map(([t]) => t);
  const list = [...specials, ...kept];
  const index = new Map(list.map((t, i) => [t, i]));
  const allCounts = new Map(list.map(t => [t, counts.get(t) ?? 0]));
  for (const s of specials) allCounts.set(s, 0);
  return { tokens: list, size: list.length, index, counts: allCounts };
}

export function toIds(vocab, tokens) {
  const unk = vocab.index.has('<unk>') ? vocab.index.get('<unk>') : -1;
  return tokens.map(t => (vocab.index.has(t) ? vocab.index.get(t) : unk));
}

export const fromIds = (vocab, ids) => ids.map(i => vocab.tokens[i]);

// ---------------------------------------------------------------------------------------------
// 2. Positions and embeddings

export function positionalEncoding(pos, dim) {
  if (!Number.isInteger(dim) || dim < 1) throw new RangeError('positionalEncoding: dim must be a positive whole number');
  const out = new Array(dim);
  for (let k = 0; k < dim; k++) {
    const i = Math.floor(k / 2);
    const angle = pos / 10000 ** ((2 * i) / dim);
    out[k] = k % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
  }
  return out;
}

export const positionalMatrix = (n, dim) => Array.from({ length: n }, (_, p) => positionalEncoding(p, dim));

export function addPositions(X) {
  return X.map((row, p) => {
    const pe = positionalEncoding(p, row.length);
    return row.map((v, k) => v + pe[k]);
  });
}

export const TOY_EMBEDDINGS = Object.freeze({
  cat: [0.9, 0.1], dog: [0.8, 0.2], mouse: [0.7, 0.1], bird: [0.8, 0.0],
  sat: [0.3, 0.5], ran: [0.4, 0.3], on: [0.0, 0.4], the: [0.1, 0.1],
  mat: [0.1, 0.9], house: [0.0, 1.0], car: [0.1, 0.8], tree: [0.2, 0.9],
  unk: [0.0, 0.0],
});

export function embed(tokens, table, { unknown = 'zero' } = {}) {
  const d = Object.values(table)[0].length;
  return tokens.map(t => {
    if (Object.prototype.hasOwnProperty.call(table, t)) return table[t].slice();
    if (Object.prototype.hasOwnProperty.call(table, 'unk')) return table.unk.slice();
    if (unknown === 'throw') throw new Error(`embed: "${t}" is not in the table`);
    return new Array(d).fill(0);
  });
}

// ---------------------------------------------------------------------------------------------
// 3. Attention

export function softmax(values) {
  const max = Math.max(...values);
  if (max === -Infinity) return values.map(() => 0);
  const e = values.map(v => Math.exp(v - max));
  const sum = e.reduce((s, v) => s + v, 0);
  return e.map(v => v / sum);
}

const identity = n => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
const matMul = (A, B) => A.map(row => B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0)));
const dotv = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

export function selfAttention({ tokens, Wq, Wk, Wv, causal = false, embeddings } = {}) {
  if (!Array.isArray(tokens) || tokens.length === 0) throw new Error('selfAttention: tokens must be a non-empty array');
  const X = typeof tokens[0] === 'string' ? embed(tokens, embeddings ?? TOY_EMBEDDINGS) : tokens;
  const d = X[0].length;
  const q = Wq ?? identity(d), k = Wk ?? identity(d), v = Wv ?? identity(d);
  if (q.length !== d || k.length !== d || v.length !== d) throw new Error(`selfAttention: Wq, Wk and Wv need ${d} rows (the token size)`);
  if (q[0].length !== k[0].length) throw new Error('selfAttention: Wq and Wk must have the same number of columns');
  const dk = q[0].length;
  const Q = matMul(X, q), K = matMul(X, k), V = matMul(X, v);
  const rawScores = Q.map(qi => K.map(kj => dotv(qi, kj)));
  const scale = Math.sqrt(dk);
  const scores = rawScores.map((row, i) => row.map((s, j) => (causal && j > i ? -Infinity : s / scale)));
  const weights = scores.map(softmax);
  const outputs = weights.map(w => V[0].map((_, c) => w.reduce((s, wj, j) => s + wj * V[j][c], 0)));
  return { Q, K, V, rawScores, scores, weights, outputs, dk, causal };
}

export function makeHead(dModel, dHead, seed = 1) {
  const random = rng(seed);
  const s = 1 / Math.sqrt(dModel);
  const mat = () => Array.from({ length: dModel }, () => Array.from({ length: dHead }, () => (random() * 2 - 1) * s));
  return { Wq: mat(), Wk: mat(), Wv: mat() };
}

export function multiHead({ tokens, heads, Wo, causal = false, embeddings } = {}) {
  if (!Array.isArray(heads) || heads.length === 0) throw new Error('multiHead: heads must be a non-empty array');
  const X = typeof tokens[0] === 'string' ? embed(tokens, embeddings ?? TOY_EMBEDDINGS) : tokens;
  const results = heads.map(h => selfAttention({ tokens: X, Wq: h.Wq, Wk: h.Wk, Wv: h.Wv, causal }));
  const concat = X.map((_, i) => results.flatMap(r => r.outputs[i]));
  return { heads: results, concat, outputs: Wo ? matMul(concat, Wo) : concat };
}

// ---------------------------------------------------------------------------------------------
// 4. A "pretrained" representation with no downloads

export function generateUnlabelledCorpus({ docs = 900, seed = 2024, language = 'en' } = {}) {
  const perClass = Math.max(1, Math.ceil(docs / 3));
  const corpus = makeCorpus({ language, docsPerClass: perClass, seed, ambiguity: 0.1, typos: 0.03 });
  return {
    docs: corpus.docs.slice(0, docs),
    generated: true,
    note: 'Generated by the course (word banks and templates), labels thrown away. Not real text.',
    language,
  };
}

const cmpStr = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function trainWordVectors(docs, { dim = 8, window = 40, minCount = 3, stopWords = 'en' } = {}) {
  const stops = new Set(stopWords ? (Array.isArray(stopWords) ? stopWords : STOP_WORDS[stopWords] ?? []) : []);
  const lists = docs.map(d => wordTokenize(d).filter(w => !stops.has(w)));
  const counts = new Map();
  for (const t of lists) for (const w of t) counts.set(w, (counts.get(w) ?? 0) + 1);
  const words = [...counts].filter(([, c]) => c >= minCount).map(([w]) => w).sort(cmpStr);
  const V = words.length;
  if (V < 2) throw new Error('trainWordVectors: fewer than two words reach minCount');
  const index = new Map(words.map((w, i) => [w, i]));
  const C = Array.from({ length: V }, () => new Array(V).fill(0));
  for (const t of lists) {
    const ids = t.map(w => (index.has(w) ? index.get(w) : -1));
    for (let i = 0; i < ids.length; i++) {
      if (ids[i] < 0) continue;
      for (let j = i + 1; j <= Math.min(ids.length - 1, i + window); j++) {
        if (ids[j] < 0) continue;
        const w = 1 / (j - i);
        C[ids[i]][ids[j]] += w;
        C[ids[j]][ids[i]] += w;
      }
    }
  }
  const rowSum = C.map(r => r.reduce((s, v) => s + v, 0));
  const total = rowSum.reduce((s, v) => s + v, 0);
  const P = C.map((r, a) => r.map((c, b) => (c > 0 ? Math.max(0, Math.log((c * total) / (rowSum[a] * rowSum[b]))) : 0)));
  const eig = eigenSym(P);
  const order = eig.values.map((v, i) => i).sort((x, y) => Math.abs(eig.values[y]) - Math.abs(eig.values[x]));
  const k = Math.min(dim, V);
  const top = order.slice(0, k);
  const vectors = words.map((_, a) => top.map(c => eig.vectors[c][a] * Math.sqrt(Math.abs(eig.values[c]))));
  return { words, index, vectors, dim: k, counts: new Map(words.map(w => [w, counts.get(w)])), window, minCount };
}

export function vectorOf(model, word) {
  const i = model.index.get(word);
  return i === undefined ? null : model.vectors[i];
}

export function cosine(a, b) {
  const na = Math.sqrt(dotv(a, a)), nb = Math.sqrt(dotv(b, b));
  return na === 0 || nb === 0 ? 0 : dotv(a, b) / (na * nb);
}

export function nearestWords(model, word, k = 5) {
  const v = vectorOf(model, word);
  if (!v) return [];
  return model.words.filter(w => w !== word)
    .map(w => ({ word: w, similarity: cosine(v, vectorOf(model, w)) }))
    .sort((x, y) => (y.similarity - x.similarity) || cmpStr(x.word, y.word)).slice(0, k);
}

const lookupIn = vectors => (vectors instanceof Map ? w => vectors.get(w) ?? null : w => vectorOf(vectors, w));

export function sentenceVector(words, vectors) {
  const tokens = typeof words === 'string' ? wordTokenize(words) : words;
  const get = lookupIn(vectors);
  const dim = vectors instanceof Map ? [...vectors.values()][0].length : vectors.dim;
  const sum = new Array(dim).fill(0);
  let n = 0;
  for (const w of tokens) {
    const v = get(w);
    if (!v) continue;
    for (let j = 0; j < dim; j++) sum[j] += v[j];
    n++;
  }
  return n ? sum.map(s => s / n) : sum;
}

// ---------------------------------------------------------------------------------------------
// 5. The comparison harness

export function macroF1(actual, predicted, classes) {
  if (actual.length !== predicted.length) throw new Error('macroF1: actual and predicted differ in length');
  const names = classes ?? [...new Set(actual)];
  let sum = 0;
  for (const c of names) {
    let tp = 0, fp = 0, fn = 0;
    actual.forEach((a, i) => {
      const p = predicted[i];
      if (a === c && p === c) tp++; else if (a !== c && p === c) fp++; else if (a === c && p !== c) fn++;
    });
    sum += tp + fp + fn === 0 ? 0 : (2 * tp) / (2 * tp + fp + fn);
  }
  return sum / names.length;
}

const accuracyOf = (actual, predicted) => (actual.length ? actual.filter((a, i) => a === predicted[i]).length / actual.length : 0);
const score = (actual, predicted, classes) => ({ accuracy: accuracyOf(actual, predicted), macroF1: macroF1(actual, predicted, classes) });

export function labelledSubset(labels, n, seed = 1) {
  const random = rng(seed * 2654435 + 17);
  const classes = [...new Set(labels)];
  const pools = classes.map(c => shuffle(labels.map((l, i) => (l === c ? i : -1)).filter(i => i >= 0), random));
  const out = [];
  const target = Math.min(n, labels.length);
  for (let round = 0; out.length < target; round++) {
    for (const pool of pools) if (round < pool.length && out.length < target) out.push(pool[round]);
  }
  return out;
}

const argmaxOf = values => values.reduce((best, v, i) => (v > values[best] ? i : best), 0);

// (b) one-vs-rest logistic regression on averaged vectors.
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

// (c) softmax head started from (b), then gradient steps on the head AND on a copy of the word vectors.
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

export const DEFAULT_SIZES = [6, 15, 45, 150, 360];

export function compareTextModels({
  train, test, unlabelled, nLabelled = DEFAULT_SIZES, seed = 1, vectors, dim = 8, window = 40,
  tuneSteps = 12, tuneRate = 1,
} = {}) {
  const tr = train ?? makeCorpus({ docsPerClass: 120, seed: 31 + seed });
  const te = test ?? makeCorpus({ docsPerClass: 60, seed: 4242 });
  const pool = unlabelled ? (Array.isArray(unlabelled) ? unlabelled : unlabelled.docs) : generateUnlabelledCorpus().docs;
  const vec = vectors ?? trainWordVectors(pool, { dim, window });
  const classes = [...new Set(tr.labels)].sort();
  const sizes = Array.isArray(nLabelled) ? nLabelled : [nLabelled];
  const testTokens = te.docs.map(wordTokenize);
  const testX = testTokens.map(t => sentenceVector(t, vec));

  const results = sizes.map(n => {
    const pick = labelledSubset(tr.labels, n, seed);
    const docs = pick.map(i => tr.docs[i]);
    const labels = pick.map(i => tr.labels[i]);
    const tokens = docs.map(wordTokenize);

    // (a) bag-of-words Naive Bayes
    const nb = fitNaiveBayes(docs, labels);
    const nbPred = te.docs.map(d => nbPredict(nb, d));

    // (b) frozen vectors + logistic regression (needs at least two classes among the labelled messages)
    const present = classes.filter(c => labels.includes(c));
    const X = tokens.map(t => sentenceVector(t, vec));
    const ovr = fitOneVsRest(X, labels, present);
    const frozenPred = ovr.predict(testX);

    // (c) the same, then a few gradient steps that also move the vectors
    const tunedPred = fineTune(ovr, tokens, labels, present, vec, { steps: tuneSteps, rate: tuneRate })(testTokens);

    return {
      nLabelled: pick.length,
      naiveBayes: score(te.labels, nbPred, classes),
      frozen: score(te.labels, frozenPred, classes),
      fineTuned: score(te.labels, tunedPred, classes),
    };
  });
  return { classes, nUnlabelled: pool.length, vocabSize: vec.words.length, dim: vec.dim, seed, results };
}
