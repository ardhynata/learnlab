import test from 'node:test';
import assert from 'node:assert/strict';
import {
  wordTokenize, charTokenize, END_OF_WORD, learnBpe, encodeWord, encode, decode,
  makeVocabulary, toIds, fromIds, positionalEncoding, positionalMatrix, addPositions,
  TOY_EMBEDDINGS, embed, softmax, selfAttention, makeHead, multiHead,
  generateUnlabelledCorpus, trainWordVectors, vectorOf, cosine, nearestWords, sentenceVector,
  macroF1, labelledSubset, compareTextModels, DEFAULT_SIZES,
} from './attention.js';
import { makeCorpus } from './textdata.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b} (tol ${tol})`);
const closeArr = (a, b, tol = 1e-9) => { assert.equal(a.length, b.length); a.forEach((v, i) => close(v, b[i], tol)); };
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;

// Word vectors are trained once (about 0.2 s) and shared by the tests below.
const CORPUS = generateUnlabelledCorpus();
const VECTORS = trainWordVectors(CORPUS.docs);

test('tokenizers: words are lowercase letter runs, characters are every character', () => {
  assert.deepEqual(wordTokenize("Hi, I can't log in! 2 times"), ['hi', 'i', "can't", 'log', 'in', 'times']);
  assert.deepEqual(wordTokenize(''), []);
  assert.deepEqual(wordTokenize(null), []);
  assert.deepEqual(charTokenize('a b'), ['a', ' ', 'b']);
  assert.deepEqual(charTokenize('café'), ['c', 'a', 'f', 'é']);
});

test('learnBpe: hand-traced merges on "low lower lowest"', () => {
  // Start: [l o w </w>] [l o w e r </w>] [l o w e s t </w>].
  // Round 1: (l,o) and (o,w) both occur 3 times; (l,o) is seen first -> "lo".
  // Round 2: (lo,w) occurs 3 times -> "low".
  // Round 3: (low,e) occurs 2 times (lower, lowest) -> "lowe".
  // Round 4: every pair left occurs once; the first one seen is (low,</w>) -> "low</w>".
  const bpe = learnBpe('low lower lowest', 4);
  assert.deepEqual(bpe.merges, [['l', 'o'], ['lo', 'w'], ['low', 'e'], ['low', END_OF_WORD]]);
  assert.deepEqual(encodeWord('low', bpe), ['low</w>']);
  assert.deepEqual(encodeWord('lower', bpe), ['lowe', 'r', '</w>']);
  assert.deepEqual(encodeWord('lowest', bpe), ['lowe', 's', 't', '</w>']);
  assert.deepEqual(encode('Low lowest', bpe), ['low</w>', 'lowe', 's', 't', '</w>']);
  assert.equal(decode(encode('low lower lowest', bpe)), 'low lower lowest');
  assert.ok(bpe.vocab.includes('lowe') && bpe.vocab.includes('r') && bpe.vocab.includes(END_OF_WORD));
  assert.equal(bpe.wordCounts.get('low'), 1);
});

test('learnBpe: counts words by frequency, stops early, zero merges is plain characters', () => {
  // "ab" occurs three times and "ba" once: (a,b) is the most frequent pair at once.
  const bpe = learnBpe(['ab ab', 'ab ba'], 1);
  assert.deepEqual(bpe.merges, [['a', 'b']]);
  assert.deepEqual(encodeWord('ab', bpe), ['ab', '</w>']);
  assert.deepEqual(encodeWord('ba', bpe), ['b', 'a', '</w>']);
  // A single one-letter word has the single pair (a,</w>); a second merge has nothing to do.
  assert.deepEqual(learnBpe('a', 5).merges, [['a', '</w>']]);
  assert.deepEqual(learnBpe('low', 0).merges, []);
  assert.deepEqual(encodeWord('low', learnBpe('low', 0)), ['l', 'o', 'w', '</w>']);
  // An unseen word still encodes, by falling back to characters.
  assert.deepEqual(encodeWord('xyz', learnBpe('low lower', 3)), ['x', 'y', 'z', '</w>']);
  assert.throws(() => learnBpe('low', -1), RangeError);
  assert.throws(() => learnBpe('low', 1.5), RangeError);
});

test('learnBpe: on the text-lab corpus, merges build whole frequent words and decode is lossless', () => {
  const docs = makeCorpus({ docsPerClass: 30, seed: 3 }).docs;
  const bpe = learnBpe(docs, 150);
  assert.equal(bpe.merges.length, 150);
  const sample = docs[0];
  assert.equal(decode(encode(sample, bpe)), wordTokenize(sample).join(' '));
  // A frequent word ends up as fewer symbols than characters.
  assert.ok(encodeWord('the', bpe).length < 4);
  const again = learnBpe(docs, 150);
  assert.deepEqual(again.merges, bpe.merges);
});

test('makeVocabulary: specials first, then most frequent, minCount filters, unknown maps to <unk>', () => {
  const v = makeVocabulary([['b', 'a', 'b'], ['c', 'b', 'a']], { minCount: 1 });
  assert.deepEqual(v.tokens, ['<pad>', '<unk>', 'b', 'a', 'c']);
  assert.equal(v.size, 5);
  assert.equal(v.index.get('b'), 2);
  assert.equal(v.counts.get('b'), 3);
  assert.deepEqual(toIds(v, ['a', 'zzz', 'b']), [3, 1, 2]);
  assert.deepEqual(fromIds(v, [2, 3, 1]), ['b', 'a', '<unk>']);
  const rare = makeVocabulary(['x', 'y', 'x', 'z'], { minCount: 2 });
  assert.deepEqual(rare.tokens, ['<pad>', '<unk>', 'x']);
  const bare = makeVocabulary(['x'], { specials: [] });
  assert.deepEqual(toIds(bare, ['x', 'q']), [0, -1]);
});

test('positionalEncoding: position 0 is [0,1,0,1], position 1 is sin/cos of 1 and 0.01 (dim 4)', () => {
  assert.deepEqual(positionalEncoding(0, 4), [0, 1, 0, 1]);
  assert.deepEqual(positionalEncoding(0, 6), [0, 1, 0, 1, 0, 1]);
  // freq for pair i is 1 / 10000^(2i/4): 1 for i = 0, 0.01 for i = 1.
  closeArr(positionalEncoding(1, 4), [Math.sin(1), Math.cos(1), Math.sin(0.01), Math.cos(0.01)], 1e-12);
  closeArr(positionalEncoding(1, 4), [0.8414710, 0.5403023, 0.0099998, 0.9999500], 1e-7);
  closeArr(positionalEncoding(2, 2), [Math.sin(2), Math.cos(2)], 1e-12);
  assert.equal(positionalEncoding(3, 5).length, 5);
  assert.throws(() => positionalEncoding(0, 0), RangeError);
});

test('positionalMatrix and addPositions: one row per position, the code is added', () => {
  const M = positionalMatrix(3, 4);
  assert.equal(M.length, 3);
  assert.deepEqual(M[0], [0, 1, 0, 1]);
  assert.deepEqual(M[2], positionalEncoding(2, 4));
  // Two identical tokens look different once positions are added: that is the point.
  const X = addPositions([[1, 1, 1, 1], [1, 1, 1, 1]]);
  assert.deepEqual(X[0], [1, 2, 1, 2]);
  assert.notDeepEqual(X[0], X[1]);
  closeArr(X[1], [1 + Math.sin(1), 1 + Math.cos(1), 1 + Math.sin(0.01), 1 + Math.cos(0.01)], 1e-12);
});

test('embed: looks tokens up in the hand-built table, copies rows, handles unknown tokens', () => {
  const rows = embed(['the', 'cat', 'sat'], TOY_EMBEDDINGS);
  assert.deepEqual(rows, [[0.1, 0.1], [0.9, 0.1], [0.3, 0.5]]);
  rows[0][0] = 99; // a copy: the table is not changed
  assert.deepEqual(TOY_EMBEDDINGS.the, [0.1, 0.1]);
  assert.ok(Object.isFrozen(TOY_EMBEDDINGS));
  // Not in the table: the table's unk row.
  assert.deepEqual(embed(['quantum'], TOY_EMBEDDINGS), [[0, 0]]);
  const noUnk = { a: [1, 2, 3] };
  assert.deepEqual(embed(['a', 'b'], noUnk), [[1, 2, 3], [0, 0, 0]]);
  assert.throws(() => embed(['b'], noUnk, { unknown: 'throw' }), /not in the table/);
  // The toy geometry: animals are close to each other, far from places.
  assert.ok(cosine(TOY_EMBEDDINGS.cat, TOY_EMBEDDINGS.dog) > cosine(TOY_EMBEDDINGS.cat, TOY_EMBEDDINGS.house));
});

test('softmax: sums to 1, is stable for huge values, sends -Infinity to 0', () => {
  closeArr(softmax([0, 0]), [0.5, 0.5]);
  closeArr(softmax([1, 2, 3]), [0.09003057317038046, 0.24472847105479764, 0.6652409557748219]);
  closeArr(softmax([1000, 1000]), [0.5, 0.5]);
  closeArr(softmax([-Infinity, 0]), [0, 1]);
  close(softmax([5, -3, 2, 0]).reduce((s, v) => s + v, 0), 1);
  assert.deepEqual(softmax([-Infinity, -Infinity]), [0, 0]);
});

// Three tokens with 2-D vectors and identity projections: x1 = (1,0), x2 = (0,1), x3 = (1,1).
// Raw dot products QK^T = [[1,0,1],[0,1,1],[1,1,2]]; dk = 2 so every score is divided by sqrt(2).
// Row 1: scores (0.7071, 0, 0.7071); e^0.7071 = 2.0281, e^0 = 1 -> weights (2.0281, 1, 2.0281) / 5.0562.
// Row 3: scores (0.7071, 0.7071, 1.4142); e^1.4142 = 4.1133 -> (2.0281, 2.0281, 4.1133) / 8.1695.
const THREE = [[1, 0], [0, 1], [1, 1]];

test('selfAttention: three-token example, exact weights to 3 decimals', () => {
  const r = selfAttention({ tokens: THREE });
  assert.equal(r.dk, 2);
  assert.equal(r.causal, false);
  assert.deepEqual(r.rawScores, [[1, 0, 1], [0, 1, 1], [1, 1, 2]]);
  closeArr(r.scores[0], [0.7071, 0, 0.7071], 1e-4);
  closeArr(r.scores[2], [0.7071, 0.7071, 1.4142], 1e-4);
  closeArr(r.weights[0], [0.401, 0.198, 0.401], 5e-4);
  closeArr(r.weights[1], [0.198, 0.401, 0.401], 5e-4);
  closeArr(r.weights[2], [0.248, 0.248, 0.503], 5e-4);
  // outputs = weights . V, with V = X: row 1 = 0.401*(1,0) + 0.198*(0,1) + 0.401*(1,1) = (0.802, 0.599).
  closeArr(r.outputs[0], [0.802, 0.599], 1e-3);
  closeArr(r.outputs[1], [0.599, 0.802], 1e-3);
  closeArr(r.outputs[2], [0.752, 0.752], 1e-3);
});

test('selfAttention: every weight row sums to 1, for any projections and with or without the mask', () => {
  const head = makeHead(2, 3, 5);
  for (const causal of [false, true]) {
    const r = selfAttention({ tokens: [[1, 0.5], [-1, 2], [0.3, 0.3], [2, -1]], ...head, causal });
    assert.equal(r.weights.length, 4);
    for (const row of r.weights) { close(row.reduce((s, v) => s + v, 0), 1); assert.ok(row.every(v => v >= 0)); }
    assert.equal(r.outputs[0].length, 3);
  }
});

test('selfAttention: Wq, Wk and Wv are applied (dk = 1 scales by 1, Wv changes the outputs)', () => {
  // Wq = Wk = first coordinate only, so Q = K = (1, 0, 1) and the score is q_i * k_j with no scaling (sqrt(1) = 1).
  const Wq = [[1], [0]];
  const r = selfAttention({ tokens: THREE, Wq, Wk: Wq });
  assert.equal(r.dk, 1);
  assert.deepEqual(r.Q, [[1], [0], [1]]);
  assert.deepEqual(r.scores, [[1, 0, 1], [0, 0, 0], [1, 0, 1]]);
  // Row 1: e^1 = 2.7183 against 1 -> 2.7183 / 6.4366 = 0.4223 and 1 / 6.4366 = 0.1554. Row 2: all equal.
  closeArr(r.weights[0], [0.4223, 0.1554, 0.4223], 1e-4);
  closeArr(r.weights[1], [1 / 3, 1 / 3, 1 / 3]);
  // Doubling the first coordinate of V doubles the first coordinate of every output and leaves the second.
  const plain = selfAttention({ tokens: THREE });
  const wide = selfAttention({ tokens: THREE, Wv: [[2, 0], [0, 1]] });
  plain.outputs.forEach((o, i) => closeArr(wide.outputs[i], [2 * o[0], o[1]]));
  assert.throws(() => selfAttention({ tokens: THREE, Wq: [[1], [0], [0]] }), /rows/);
  assert.throws(() => selfAttention({ tokens: [] }), /non-empty/);
});

test('selfAttention: scaling by sqrt(dk) flattens the weights when dk grows', () => {
  // The same raw dot products spread over more dimensions: dividing by sqrt(dk) keeps them in range.
  const wide = Array.from({ length: 3 }, (_, i) => Array.from({ length: 16 }, (_, j) => ((i + j) % 3) - 1));
  const r = selfAttention({ tokens: wide });
  assert.equal(r.dk, 16);
  r.scores.forEach((row, i) => row.forEach((s, j) => close(s, r.rawScores[i][j] / 4)));
});

test('selfAttention: the causal mask zeroes every future weight and keeps the past', () => {
  const r = selfAttention({ tokens: THREE, causal: true });
  assert.equal(r.causal, true);
  assert.deepEqual(r.weights[0], [1, 0, 0]);
  closeArr(r.weights[1], [0.330, 0.670, 0], 5e-4); // softmax of (0, 0.7071)
  closeArr(r.weights[2], [0.248, 0.248, 0.503], 5e-4); // the last token still sees everyone
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) { assert.equal(r.weights[i][j], 0); assert.equal(r.scores[i][j], -Infinity); }
  // The raw dot products are not touched by the mask.
  assert.deepEqual(r.rawScores, [[1, 0, 1], [0, 1, 1], [1, 1, 2]]);
  // Token 1 can only copy itself.
  assert.deepEqual(r.outputs[0], [1, 0]);
  // A token's output does not change when later tokens are added: that is what "causal" buys.
  const longer = selfAttention({ tokens: [...THREE, [5, -2]], causal: true });
  closeArr(longer.outputs[1], r.outputs[1]);
});

test('selfAttention: string tokens are looked up in the embedding table', () => {
  const r = selfAttention({ tokens: ['the', 'cat', 'sat'] });
  assert.deepEqual(r.Q, embed(['the', 'cat', 'sat'], TOY_EMBEDDINGS));
  // cat and dog attend more to each other than to "mat".
  const s = selfAttention({ tokens: ['cat', 'dog', 'mat'] });
  assert.ok(s.weights[0][1] > s.weights[0][2]);
  const custom = selfAttention({ tokens: ['a', 'b'], embeddings: { a: [1, 0], b: [0, 1] } });
  assert.deepEqual(custom.rawScores, [[1, 0], [0, 1]]);
});

test('multiHead: repeated heads, concatenated outputs, optional output projection, causal passes through', () => {
  const heads = [makeHead(2, 2, 1), makeHead(2, 2, 2), makeHead(2, 2, 3)];
  const m = multiHead({ tokens: THREE, heads });
  assert.equal(m.heads.length, 3);
  assert.equal(m.concat.length, 3);
  assert.equal(m.concat[0].length, 6);
  assert.deepEqual(m.outputs, m.concat);
  heads.forEach((h, i) => assert.deepEqual(m.heads[i], selfAttention({ tokens: THREE, ...h })));
  // Different heads attend differently.
  assert.notDeepEqual(m.heads[0].weights, m.heads[1].weights);
  // concat[i] is the outputs of head 0, then head 1, then head 2.
  assert.deepEqual(m.concat[1], [...m.heads[0].outputs[1], ...m.heads[1].outputs[1], ...m.heads[2].outputs[1]]);
  // Wo mixes the 6 numbers down to 2.
  const Wo = [[1, 0], [0, 1], [1, 0], [0, 1], [1, 0], [0, 1]];
  const mixed = multiHead({ tokens: THREE, heads, Wo });
  assert.equal(mixed.outputs[0].length, 2);
  const c = m.concat[0];
  closeArr(mixed.outputs[0], [c[0] + c[2] + c[4], c[1] + c[3] + c[5]]);
  const masked = multiHead({ tokens: THREE, heads, causal: true });
  masked.heads.forEach(h => assert.deepEqual(h.weights[0], [1, 0, 0]));
  assert.throws(() => multiHead({ tokens: THREE, heads: [] }), /non-empty/);
});

test('makeHead: shapes, determinism, seeds differ, weights stay small', () => {
  const h = makeHead(4, 3, 7);
  assert.deepEqual([h.Wq.length, h.Wq[0].length, h.Wv.length, h.Wk[0].length], [4, 3, 4, 3]);
  assert.deepEqual(makeHead(4, 3, 7), h);
  assert.notDeepEqual(makeHead(4, 3, 8), h);
  assert.ok([...h.Wq.flat(), ...h.Wk.flat(), ...h.Wv.flat()].every(v => Math.abs(v) <= 0.5));
});

test('generateUnlabelledCorpus: generated, deterministic, unlabelled, a different seed from the labelled sets', () => {
  assert.equal(CORPUS.generated, true);
  assert.match(CORPUS.note, /Generated/);
  assert.equal(CORPUS.docs.length, 900);
  assert.equal(CORPUS.labels, undefined);
  assert.deepEqual(generateUnlabelledCorpus().docs, CORPUS.docs);
  assert.notDeepEqual(generateUnlabelledCorpus({ seed: 5 }).docs, CORPUS.docs);
  assert.equal(generateUnlabelledCorpus({ docs: 100 }).docs.length, 100);
  assert.ok(CORPUS.docs.every(d => typeof d === 'string' && d.length > 5));
  const id = generateUnlabelledCorpus({ docs: 30, language: 'id' });
  assert.equal(id.language, 'id');
  assert.equal(id.docs.length, 30);
});

test('trainWordVectors: deterministic, alphabetical words, no vector for stop words or rare typos', () => {
  const again = trainWordVectors(CORPUS.docs);
  assert.deepEqual(again.vectors, VECTORS.vectors);
  assert.equal(VECTORS.dim, 8);
  assert.equal(VECTORS.vectors[0].length, 8);
  assert.deepEqual(VECTORS.words, [...VECTORS.words].sort());
  assert.equal(vectorOf(VECTORS, 'the'), null); // a stop word
  assert.equal(vectorOf(VECTORS, 'refund').length, 8);
  assert.equal(vectorOf(VECTORS, 'zzzzz'), null);
  // minCount drops rare words; a bigger minCount means a smaller vocabulary.
  assert.ok(trainWordVectors(CORPUS.docs, { minCount: 40 }).words.length < VECTORS.words.length);
  // stopWords: false keeps function words.
  assert.ok(vectorOf(trainWordVectors(CORPUS.docs, { stopWords: false }), 'the'));
  assert.equal(trainWordVectors(CORPUS.docs, { dim: 4 }).dim, 4);
  assert.throws(() => trainWordVectors(['hello'], { minCount: 5 }), /fewer than two/);
});

test('trainWordVectors: a tiny hand-built corpus puts co-occurring words together', () => {
  // Two topics that never share a message. Window 40 = the whole message.
  const docs = [];
  for (let i = 0; i < 20; i++) { docs.push('apple banana cherry'); docs.push('hammer nail saw'); }
  const v = trainWordVectors(docs, { dim: 2, window: 40, minCount: 1, stopWords: false });
  assert.ok(cosine(vectorOf(v, 'apple'), vectorOf(v, 'banana')) > 0.99);
  assert.ok(cosine(vectorOf(v, 'hammer'), vectorOf(v, 'nail')) > 0.99);
  assert.ok(cosine(vectorOf(v, 'apple'), vectorOf(v, 'nail')) < 0.2);
});

test('pretrained vectors: same-topic words are closer than cross-topic words (cosine, margin)', () => {
  const topics = {
    billing: ['refund', 'invoice', 'subscription', 'receipt', 'payment'],
    delivery: ['courier', 'parcel', 'warehouse', 'shipment', 'driver'],
    technical: ['password', 'crashes', 'screen', 'server', 'error'],
  };
  const names = Object.keys(topics);
  const within = [], cross = [];
  for (const a of names) for (const b of names) {
    for (const x of topics[a]) for (const y of topics[b]) {
      if (x === y) continue;
      assert.ok(vectorOf(VECTORS, x) && vectorOf(VECTORS, y), `${x} and ${y} need vectors`);
      (a === b ? within : cross).push(cosine(vectorOf(VECTORS, x), vectorOf(VECTORS, y)));
    }
  }
  assert.ok(mean(within) - mean(cross) > 0.35, `within ${mean(within)} cross ${mean(cross)}`);
  assert.ok(mean(within) > 0.45);
  // Word by word: each probe word is closer to its own topic's words than to the other topics' words.
  for (const a of names) for (const x of topics[a]) {
    const own = topics[a].filter(y => y !== x).map(y => cosine(vectorOf(VECTORS, x), vectorOf(VECTORS, y)));
    const other = names.filter(b => b !== a).flatMap(b => topics[b]).map(y => cosine(vectorOf(VECTORS, x), vectorOf(VECTORS, y)));
    assert.ok(mean(own) > mean(other) + 0.2, `${x}: own ${mean(own)} other ${mean(other)}`);
  }
});

test('nearestWords and cosine: nearest neighbours of "courier" are delivery words; edge cases', () => {
  const delivery = new Set(['driver', 'package', 'parcel', 'delivery', 'address', 'shipment', 'warehouse', 'left', 'tracking', 'number', 'item', 'order', 'shipping', 'delay', 'arrived']);
  const near = nearestWords(VECTORS, 'courier', 3);
  assert.equal(near.length, 3);
  assert.ok(near[0].similarity >= near[1].similarity && near[1].similarity >= near[2].similarity);
  assert.ok(near.every(n => n.word !== 'courier'));
  assert.ok(near.filter(n => delivery.has(n.word)).length >= 2, JSON.stringify(near));
  assert.deepEqual(nearestWords(VECTORS, 'notaword'), []);
  close(cosine([1, 0], [1, 0]), 1);
  close(cosine([1, 0], [0, 1]), 0);
  close(cosine([1, 0], [-2, 0]), -1);
  assert.equal(cosine([0, 0], [1, 1]), 0);
});

test('sentenceVector: the average of the known word vectors, zeros when none is known', () => {
  const table = new Map([['a', [1, 2]], ['b', [3, 6]]]);
  assert.deepEqual(sentenceVector(['a', 'b'], table), [2, 4]);
  assert.deepEqual(sentenceVector(['a', 'b', 'unknown'], table), [2, 4]); // unknown words are skipped, not counted
  assert.deepEqual(sentenceVector('A, b!', table), [2, 4]); // a string is tokenized first
  assert.deepEqual(sentenceVector(['q'], table), [0, 0]);
  const v = sentenceVector(['refund', 'invoice'], VECTORS);
  closeArr(v, vectorOf(VECTORS, 'refund').map((x, i) => (x + vectorOf(VECTORS, 'invoice')[i]) / 2));
  assert.deepEqual(sentenceVector([], VECTORS), new Array(VECTORS.dim).fill(0));
  // A billing sentence is closer to a billing word than to a delivery word.
  const s = sentenceVector('I was charged twice for my subscription', VECTORS);
  assert.ok(cosine(s, vectorOf(VECTORS, 'refund')) > cosine(s, vectorOf(VECTORS, 'courier')));
});

test('macroF1: hand-computed on a 3-class example, and accuracy-independent of class size', () => {
  // actual a a a b b c ; predicted a a b b c c.
  // a: tp2 fp0 fn1 -> 4/5 = 0.8 ; b: tp1 fp1 fn1 -> 2/4 = 0.5 ; c: tp1 fp1 fn0 -> 2/3.
  close(macroF1(['a', 'a', 'a', 'b', 'b', 'c'], ['a', 'a', 'b', 'b', 'c', 'c'], ['a', 'b', 'c']), (0.8 + 0.5 + 2 / 3) / 3);
  close(macroF1(['a', 'b'], ['a', 'b']), 1);
  // Always predicting the majority class: high accuracy, low macro F1.
  const actual = [...Array(18).fill('x'), 'y', 'z'];
  const predicted = Array(20).fill('x');
  close(macroF1(actual, predicted, ['x', 'y', 'z']), (2 * 18 / (2 * 18 + 2) + 0 + 0) / 3);
  assert.throws(() => macroF1(['a'], ['a', 'b']), /differ/);
});

test('labelledSubset: balanced across classes, deterministic, seeds differ, capped', () => {
  const labels = ['a', 'b', 'c', 'a', 'b', 'c', 'a', 'b', 'c', 'a', 'b', 'c'];
  const pick = labelledSubset(labels, 6, 1);
  assert.equal(pick.length, 6);
  assert.equal(new Set(pick).size, 6);
  for (const c of ['a', 'b', 'c']) assert.equal(pick.filter(i => labels[i] === c).length, 2);
  assert.deepEqual(labelledSubset(labels, 6, 1), pick);
  assert.notDeepEqual(labelledSubset(labels, 6, 2), pick);
  assert.equal(labelledSubset(labels, 4, 1).length, 4);
  assert.equal(labelledSubset(labels, 99, 1).length, 12);
  const four = labelledSubset(labels, 4, 1).map(i => labels[i]);
  assert.deepEqual(four, ['a', 'b', 'c', 'a']); // classes take turns, in order of first appearance
});

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SIZES = [6, 15, 45, 150, 360];
const BY_SEED = SEEDS.map(seed => compareTextModels({ seed, vectors: VECTORS, nLabelled: SIZES }));
const at = (n, model, metric = 'accuracy') => BY_SEED.map(r => r.results.find(x => x.nLabelled === n)[model][metric]);

test('compareTextModels: shape, labelled sizes, scores in [0, 1], deterministic', () => {
  const r = BY_SEED[0];
  assert.deepEqual(r.classes, ['billing', 'delivery', 'technical problem']);
  assert.deepEqual(r.results.map(x => x.nLabelled), SIZES);
  assert.equal(r.nUnlabelled, 900);
  assert.equal(r.dim, 8);
  assert.equal(r.vocabSize, VECTORS.words.length);
  for (const x of r.results) for (const m of ['naiveBayes', 'frozen', 'fineTuned']) {
    assert.ok(x[m].accuracy >= 0 && x[m].accuracy <= 1);
    assert.ok(x[m].macroF1 >= 0 && x[m].macroF1 <= 1);
  }
  assert.deepEqual(compareTextModels({ seed: 1, vectors: VECTORS, nLabelled: SIZES }), r);
  assert.deepEqual(DEFAULT_SIZES, [6, 15, 45, 150, 360]);
  // A single number works and returns one result.
  assert.equal(compareTextModels({ seed: 1, vectors: VECTORS, nLabelled: 9 }).results.length, 1);
});

test('compareTextModels: with few labels the frozen pretrained vectors beat bag-of-words Naive Bayes', () => {
  for (const n of [6, 15]) {
    const gap = mean(at(n, 'frozen')) - mean(at(n, 'naiveBayes'));
    assert.ok(gap > 0.05, `n=${n}: mean accuracy gap ${gap}`);
    const gapF1 = mean(at(n, 'frozen', 'macroF1')) - mean(at(n, 'naiveBayes', 'macroF1'));
    assert.ok(gapF1 > 0.05, `n=${n}: mean macro F1 gap ${gapF1}`);
    const wins = at(n, 'frozen').filter((a, i) => a > at(n, 'naiveBayes')[i]).length;
    assert.ok(wins >= 8, `n=${n}: frozen won ${wins} of ${SEEDS.length} seeds`);
  }
});

test('compareTextModels: with many labels the gap closes (Naive Bayes catches up)', () => {
  const gap = n => mean(at(n, 'frozen')) - mean(at(n, 'naiveBayes'));
  assert.ok(Math.abs(gap(360)) < 0.03, `gap at 360 labels ${gap(360)}`);
  assert.ok(Math.abs(gap(360)) < gap(15) / 2);
  assert.ok(gap(150) < gap(15) / 2);
  // Both climb with more labels.
  assert.ok(mean(at(360, 'naiveBayes')) > mean(at(6, 'naiveBayes')) + 0.2);
  assert.ok(mean(at(360, 'frozen')) > mean(at(6, 'frozen')) + 0.15);
});

test('compareTextModels: a few fine-tuning steps help once there are enough labelled messages', () => {
  for (const n of [45, 150, 360]) {
    assert.ok(mean(at(n, 'fineTuned')) >= mean(at(n, 'frozen')) - 0.003, `n=${n}`);
  }
  assert.ok(mean(at(150, 'fineTuned')) - mean(at(150, 'frozen')) > 0.01);
  // With zero steps the fine-tuned model IS the frozen one.
  const none = compareTextModels({ seed: 1, vectors: VECTORS, nLabelled: [15], tuneSteps: 0 }).results[0];
  assert.deepEqual(none.fineTuned, none.frozen);
});

test('compareTextModels: never changes the pretrained table, and accepts custom data', () => {
  const before = JSON.stringify(VECTORS.vectors);
  compareTextModels({ seed: 3, vectors: VECTORS, nLabelled: [15, 45] });
  assert.equal(JSON.stringify(VECTORS.vectors), before);
  const train = makeCorpus({ docsPerClass: 20, seed: 8 });
  const test_ = makeCorpus({ docsPerClass: 10, seed: 9 });
  const r = compareTextModels({ train, test: test_, unlabelled: CORPUS.docs.slice(0, 450), nLabelled: 9, seed: 2 });
  assert.equal(r.nUnlabelled, 450);
  assert.equal(r.results[0].nLabelled, 9);
  assert.ok(r.results[0].frozen.accuracy > 0.4);
});
