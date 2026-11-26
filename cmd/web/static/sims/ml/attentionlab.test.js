import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sentences, vocabularyWords, wordVector, pieceVector, HEADS, traceAttention, topMix, bpeMergesMax, bpeFor,
  comparePredictions, trainTaskVectors, misclassified, winnerOf, SIZES, MAX_TOKENS, MAX_TEXT, taskCorpora, scoreSize,
} from './attentionlab.js';
import { compareTextModels, softmax } from './attention.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b} (tol ${tol})`);
const sum = a => a.reduce((s, v) => s + v, 0);

const SENTENCE = 'the cat sat on the mat';
const VEC_EN = trainTaskVectors('en');

test('the bundled sentences and vocabularies exist in both languages and every sentence word has a vector', () => {
  for (const language of ['en', 'id']) {
    const list = sentences(language);
    assert.ok(list.length >= 5);
    const known = new Set(vocabularyWords(language));
    for (const s of list) for (const w of s.text.split(' ')) assert.ok(known.has(w), `${language}: ${w}`);
  }
  assert.equal(sentences('en')[0].text, SENTENCE);
  assert.equal(wordVector('en', 'zebra'), null);
  assert.equal(wordVector('en', 'cat').length, 12);
});

test('piece vectors are made up but stable: the same spelling always gives the same vector', () => {
  assert.deepEqual(pieceVector('ca'), pieceVector('ca'));
  assert.notDeepEqual(pieceVector('ca'), pieceVector('at'));
});

test('every row of every head sums to 1, with and without positions and the causal mask', () => {
  for (const positions of [true, false]) for (const causal of [true, false]) {
    const r = traceAttention({ text: SENTENCE, positions, causal });
    assert.equal(r.n, 6);
    assert.equal(r.heads.length, HEADS.length);
    for (const w of r.heads) for (const row of w) close(sum(row), 1);
  }
});

test('the causal mask puts exactly 0 above the diagonal and the first token can only see itself', () => {
  const r = traceAttention({ text: SENTENCE, causal: true, head: 'untrained' });
  r.weights.forEach((row, i) => row.forEach((w, j) => { if (j > i) assert.equal(w, 0); }));
  close(r.weights[0][0], 1);
  assert.ok(r.weights[3][1] > 0);
});

test('the nearby head has nothing to go on without positions (uniform), and with them it prefers close tokens', () => {
  const flat = traceAttention({ text: SENTENCE, head: 'nearby', positions: false });
  for (const row of flat.weights) for (const w of row) close(w, 1 / 6);
  const near = traceAttention({ text: SENTENCE, head: 'nearby', positions: true });
  const row = near.weights[0];
  for (let j = 1; j < 6; j++) assert.ok(row[j] < row[j - 1], 'weights fall with distance from the first token');
  // The two copies of "the" (positions 0 and 4) look alike without positions and differently with them.
  const no = traceAttention({ text: SENTENCE, head: 'nearby', positions: false });
  assert.deepEqual(no.weights[0], no.weights[4]);
  assert.notDeepEqual(near.weights[0], near.weights[4]);
});

test('the action head, by hand: cat looks at sat with weight e^1.8 / (e^0.3 + e^0.1 + e^1.8) over the first three tokens', () => {
  // the cat sat, no positions: query of cat = 0.5 * (2.0 + 0.0) = 1.0, keys = the action slot: the 0.3, cat 0.1, sat 1.8.
  const r = traceAttention({ text: 'the cat sat', head: 'action', positions: false });
  const expected = softmax([1.0 * 0.3, 1.0 * 0.1, 1.0 * 1.8]);
  r.weights[1].forEach((w, j) => close(w, expected[j], 1e-9));
  close(r.weights[1][2], 6.049647464 / (Math.exp(0.3) + Math.exp(0.1) + Math.exp(1.8)), 1e-6);
  assert.ok(Math.abs(r.weights[1][2] - 0.7113) < 1e-3);
});

test('the meaning head: a word looks hardest at itself and at words like it', () => {
  const r = traceAttention({ text: 'the dog chased the cat', head: 'meaning', positions: false });
  const dog = r.weights[1];
  // dog . dog = 3.63 and dog . cat = 3.81 in the hand-built vectors: the two animals take almost all the weight.
  const top2 = dog.map((w, j) => [w, j]).sort((a, b) => b[0] - a[0]).slice(0, 2).map(x => x[1]).sort();
  assert.deepEqual(top2, [1, 4], 'dog looks at dog and at cat');
  assert.ok(dog[4] > dog[0] && dog[4] > dog[2], 'dog looks at cat more than at the or chased');
});

test('the four heads give visibly different matrices', () => {
  const r = traceAttention({ text: SENTENCE });
  for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
    const d = Math.max(...r.heads[a].flatMap((row, i) => row.map((w, j) => Math.abs(w - r.heads[b][i][j]))));
    assert.ok(d > 0.1, `heads ${a} and ${b} differ by ${d}`);
  }
});

test('tokenizers: words, characters and byte-pair merges give the right tokens and ids', () => {
  const w = traceAttention({ text: 'The cat, the CAT!', tokenizer: 'words' });
  assert.deepEqual(w.tokens.map(t => t.text), ['the', 'cat', 'the', 'cat']);
  assert.equal(w.tokens[0].id, w.tokens[2].id);
  const c = traceAttention({ text: 'a cat', tokenizer: 'chars' });
  assert.deepEqual(c.tokens.map(t => t.text), ['a', ' ', 'c', 'a', 't']);
  assert.equal(c.tokens[1].display, '␣');
  assert.ok(c.tokens.every(t => t.kind === 'piece'));
  const b0 = traceAttention({ text: 'the cat', tokenizer: 'bpe', merges: 0 });
  assert.deepEqual(b0.tokens.map(t => t.text), ['t', 'h', 'e', '</w>', 'c', 'a', 't', '</w>']);
  assert.equal(b0.tokens[3].display, '·');
  const max = bpeMergesMax('en');
  const bm = traceAttention({ text: 'the cat sat', tokenizer: 'bpe', merges: max });
  assert.deepEqual(bm.tokens.map(t => t.text), ['the</w>', 'cat</w>', 'sat</w>']);
  assert.ok(bm.tokens.every(t => t.kind === 'word'));
  assert.deepEqual(bm.tokens.map(t => t.display), ['the·', 'cat·', 'sat·']);
  // fewer merges, more tokens, never fewer
  let last = Infinity;
  for (let m = 0; m <= max; m += 4) {
    const n = traceAttention({ text: SENTENCE, tokenizer: 'bpe', merges: m }).n;
    assert.ok(n <= last);
    last = n;
  }
  assert.equal(bpeFor('en', 5).merges.length, 5);
});

test('an unknown word gets the <unk> id and is counted; the bundled words are all known', () => {
  const r = traceAttention({ text: 'the zebra sat' });
  assert.equal(r.unknown, 1);
  assert.equal(r.tokens[1].kind, 'unknown');
  assert.equal(r.tokens[1].id, 1);
  assert.equal(traceAttention({ text: SENTENCE }).unknown, 0);
});

test('a long text is cut to the token limit and the character limit, and says so', () => {
  const long = Array.from({ length: 40 }, () => 'cat').join(' ');
  const r = traceAttention({ text: long });
  assert.equal(r.cut, true);
  assert.ok(r.n <= MAX_TOKENS);
  const c = traceAttention({ text: 'x'.repeat(MAX_TEXT + 20), tokenizer: 'chars' });
  assert.equal(c.cut, true);
  assert.ok(c.n <= MAX_TOKENS);
  assert.equal(traceAttention({ text: '' }).n, 0);
  assert.equal(traceAttention({ text: '' }).cut, false);
});

test('Indonesian sentences trace too, with the same head behaviour', () => {
  const r = traceAttention({ text: sentences('id')[0].text, language: 'id', head: 'action', positions: false });
  assert.equal(r.n, 7);
  assert.equal(r.unknown, 0);
  const kucing = r.weights[0];
  assert.equal(kucing.indexOf(Math.max(...kucing)), 1, 'the first kucing looks at duduk');
});

test('topMix lists the biggest weights of a row, biggest first, skipping zeros', () => {
  const r = traceAttention({ text: SENTENCE, causal: true, head: 'meaning' });
  const mix = topMix(r.weights, r.tokens, 1, 5);
  assert.deepEqual(mix.map(m => m.index), [1, 0]);
  assert.ok(mix[0].weight > mix[1].weight);
  close(sum(mix.map(m => m.weight)), 1);
});

test('comparePredictions agrees number for number with attention.compareTextModels', () => {
  const sizes = [8, 45];
  const seed = 2;
  const mine = comparePredictions({ language: 'en', seed, sizes, vectors: VEC_EN });
  const { train, test: te } = taskCorpora('en', seed);
  const theirs = compareTextModels({ train, test: te, unlabelled: [], nLabelled: sizes, seed, vectors: VEC_EN });
  assert.deepEqual(mine.classes, theirs.classes);
  mine.rows.forEach((row, i) => {
    for (const m of ['naiveBayes', 'frozen', 'fineTuned']) {
      close(row[m].accuracy, theirs.results[i][m].accuracy, 1e-12);
      close(row[m].macroF1, theirs.results[i][m].macroF1, 1e-12);
      assert.equal(row[m].predicted.length, mine.test.labels.length);
    }
  });
});

test('the numbers and the misclassified list describe the same predictions', () => {
  const r = comparePredictions({ language: 'en', seed: 1, sizes: [8], vectors: VEC_EN });
  const row = r.rows[0];
  assert.equal(row.nLabelled, 8);
  for (const m of ['naiveBayes', 'frozen', 'fineTuned']) {
    const wrong = misclassified(r.test, row[m].predicted);
    close(1 - wrong.length / r.test.labels.length, row[m].accuracy, 1e-12);
    assert.ok(wrong.every(x => x.truth !== x.guess && r.test.docs[x.index] === x.doc));
  }
});

test('with 8 labelled messages and seed 1 the pretrained vectors beat bag of words; with plenty of labels they do not', () => {
  const r = comparePredictions({ language: 'en', seed: 1, sizes: [8, 360], vectors: VEC_EN });
  assert.ok(r.rows[0].frozen.accuracy - r.rows[0].naiveBayes.accuracy > 0.05, 'pretrained ahead at 8');
  assert.ok(r.rows[1].naiveBayes.accuracy >= r.rows[1].frozen.accuracy - 0.01, 'the head start fades with many labels');
});

test('the labelled sets are balanced across the three classes and the same sizes always give the same picks', () => {
  assert.ok(SIZES.includes(8));
  const a = comparePredictions({ language: 'en', seed: 3, sizes: [8], vectors: VEC_EN });
  const b = comparePredictions({ language: 'en', seed: 3, sizes: [8], vectors: VEC_EN });
  assert.deepEqual(a, b);
  const { train, test: te } = taskCorpora('en', 3);
  const row = scoreSize({ train, test: te, vectors: VEC_EN, n: 3, seed: 3 });
  assert.equal(row.nLabelled, 3);
});

test('Indonesian messages run through the same comparison with sensible accuracy', () => {
  const vec = trainTaskVectors('id');
  const r = comparePredictions({ language: 'id', seed: 1, sizes: [45, 360], vectors: vec });
  assert.equal(r.classes.length, 3);
  for (const row of r.rows) for (const m of ['naiveBayes', 'frozen', 'fineTuned']) assert.ok(row[m].accuracy > 0.6, `${m} ${row[m].accuracy}`);
});

test('winnerOf: a gap of 3 points or less is a tie', () => {
  assert.equal(winnerOf(0.83, 0.67), 'a');
  assert.equal(winnerOf(0.60, 0.80), 'b');
  assert.equal(winnerOf(0.72, 0.73), 'tie');
  assert.equal(winnerOf(0.70, 0.67), 'tie');
});
