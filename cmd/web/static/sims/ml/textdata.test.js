import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeCorpus, LANGUAGES, CLASS_KEYS, classNames, className, classWords, exampleWords,
  overlapWords, tokenize,
} from './textdata.js';

// A plain multinomial Naive Bayes (add-one smoothing) used only to check the corpus is learnable
// but not trivial. Trains on one corpus, scores on another.
function nbAccuracy(train, held) {
  const counts = {}, totals = {}, docsOf = {};
  const vocab = new Set();
  for (const c of train.classes) { counts[c] = new Map(); totals[c] = 0; docsOf[c] = 0; }
  train.docs.forEach((d, i) => {
    const c = train.labels[i];
    docsOf[c]++;
    for (const w of tokenize(d)) {
      counts[c].set(w, (counts[c].get(w) || 0) + 1);
      totals[c]++;
      vocab.add(w);
    }
  });
  let ok = 0;
  held.docs.forEach((d, i) => {
    let best = null, bestScore = -Infinity;
    for (const c of train.classes) {
      let s = Math.log(docsOf[c] / train.docs.length);
      for (const w of tokenize(d)) s += Math.log(((counts[c].get(w) || 0) + 1) / (totals[c] + vocab.size));
      if (s > bestScore) { bestScore = s; best = c; }
    }
    if (best === held.labels[i]) ok++;
  });
  return ok / held.docs.length;
}

test('makeCorpus is deterministic per seed and differs between seeds', () => {
  for (const language of LANGUAGES) {
    assert.deepEqual(makeCorpus({ language, docsPerClass: 30, seed: 5 }), makeCorpus({ language, docsPerClass: 30, seed: 5 }));
    assert.notDeepEqual(makeCorpus({ language, docsPerClass: 30, seed: 5 }).docs, makeCorpus({ language, docsPerClass: 30, seed: 6 }).docs);
  }
  // The default call works and is the same as spelling the defaults out.
  assert.deepEqual(makeCorpus(), makeCorpus({ language: 'en', docsPerClass: 60, seed: 1 }));
});

test('classes are balanced and the corpus is shuffled', () => {
  for (const language of LANGUAGES) {
    for (const n of [1, 7, 40]) {
      const c = makeCorpus({ language, docsPerClass: n, seed: 2 });
      assert.equal(c.docs.length, 3 * n);
      assert.equal(c.labels.length, 3 * n);
      for (const name of c.classes) assert.equal(c.labels.filter(l => l === name).length, n);
    }
    const c = makeCorpus({ language, docsPerClass: 40, seed: 2 });
    const firstBlock = c.labels.slice(0, 40);
    assert.ok(new Set(firstBlock).size > 1, 'classes are not in blocks');
  }
});

test('both languages produce the same structure', () => {
  const en = makeCorpus({ language: 'en', docsPerClass: 25, seed: 3 });
  const id = makeCorpus({ language: 'id', docsPerClass: 25, seed: 3 });
  assert.deepEqual(Object.keys(en).sort(), Object.keys(id).sort());
  assert.deepEqual(en.keys, id.keys);
  assert.deepEqual(en.keys, CLASS_KEYS);
  assert.equal(en.classes.length, 3);
  assert.equal(id.classes.length, 3);
  assert.deepEqual(en.classes, ['billing', 'delivery', 'technical problem']);
  assert.deepEqual(id.classes, ['tagihan', 'pengiriman', 'masalah teknis']);
  assert.equal(en.docs.length, id.docs.length);
  for (const c of [en, id]) {
    for (const key of ['docs', 'labels', 'ambiguous', 'typo']) assert.equal(c[key].length, 75);
    assert.ok(c.docs.every(d => typeof d === 'string' && d.length > 10));
    assert.ok(c.labels.every(l => c.classes.includes(l)));
    // Per-class share of ambiguous messages is the same in both languages (exact, not random).
    for (const name of c.classes) {
      assert.equal(c.labels.filter((l, i) => l === name && c.ambiguous[i]).length, Math.round(0.14 * 25));
    }
  }
  assert.notDeepEqual(en.docs, id.docs);
});

test('the two languages use their own words', () => {
  const en = tokenize(makeCorpus({ language: 'en', docsPerClass: 30 }).docs.join(' '));
  const id = tokenize(makeCorpus({ language: 'id', docsPerClass: 30 }).docs.join(' '));
  assert.ok(en.includes('refund') && en.includes('package') && en.includes('password'));
  assert.ok(id.includes('saya') && id.includes('paket') && id.includes('tagihan'));
  assert.ok(!en.includes('saya') && !id.includes('the'));
  // Indonesian follows the glossary register: none of the casual forms it replaces.
  for (const casual of ['gimana', 'nggak', 'gak', 'enggak', 'bikin', 'udah', 'aja', 'banget', 'cuma', 'kenapa']) {
    assert.ok(!id.includes(casual), casual);
  }
});

test('ambiguous messages exist and mix the words of two classes', () => {
  for (const language of LANGUAGES) {
    const c = makeCorpus({ language, docsPerClass: 80, seed: 4 });
    const flagged = c.docs.filter((_, i) => c.ambiguous[i]);
    assert.ok(flagged.length >= 3 * 8, `${flagged.length} ambiguous`);
    assert.ok(flagged.length < c.docs.length / 4, 'ambiguous messages are the exception');
    // A flagged message holds a word that no bank of its own class has... in at least most cases.
    let mixed = 0;
    c.docs.forEach((d, i) => {
      if (!c.ambiguous[i]) return;
      const own = new Set(classWords(language, c.labels[i]).flatMap(tokenize));
      const foreign = CLASS_KEYS.filter(k => className(language, k) !== c.labels[i])
        .flatMap(k => classWords(language, k).flatMap(tokenize)).filter(w => !own.has(w));
      if (tokenize(d).some(w => foreign.includes(w))) mixed++;
    });
    assert.ok(mixed >= flagged.length * 0.9, `${mixed} of ${flagged.length} hold a foreign class word`);
    // Turning ambiguity off removes them all; the counts are exact.
    assert.ok(makeCorpus({ language, docsPerClass: 30, ambiguity: 0 }).ambiguous.every(a => !a));
    assert.equal(makeCorpus({ language, docsPerClass: 30, ambiguity: 1 }).ambiguous.filter(Boolean).length, 90);
  }
});

test('typos exist, and flagged messages hold a word the clean messages never use', () => {
  for (const language of LANGUAGES) {
    const c = makeCorpus({ language, docsPerClass: 120, seed: 9 });
    const clean = new Set(c.docs.filter((_, i) => !c.typo[i]).flatMap(tokenize));
    const flagged = c.docs.filter((_, i) => c.typo[i]);
    assert.ok(flagged.length >= 15, `${flagged.length} typos`);
    const unseen = flagged.filter(d => tokenize(d).some(w => !clean.has(w)));
    assert.ok(unseen.length >= flagged.length * 0.7, `${unseen.length} of ${flagged.length}`);
    assert.ok(makeCorpus({ language, docsPerClass: 30, typos: 0 }).typo.every(t => !t));
  }
});

test('the words of one class bank are not all in another', () => {
  for (const language of LANGUAGES) {
    for (const a of CLASS_KEYS) {
      for (const b of CLASS_KEYS) {
        if (a === b) continue;
        const inB = new Set(classWords(language, b));
        const onlyA = classWords(language, a).filter(w => !inB.has(w));
        assert.ok(onlyA.length >= 6, `${language}: ${a} has only ${onlyA.length} words not in ${b}`);
      }
      const bank = classWords(language, a);
      assert.equal(new Set(bank).size, bank.length, 'no repeated word in a bank');
    }
    // The overlap is controlled: it exists, and it is a small part of every bank.
    const overlap = new Set(overlapWords(language));
    assert.ok(overlap.size >= 3);
    for (const k of CLASS_KEYS) {
      const bank = classWords(language, k);
      assert.ok(bank.filter(w => overlap.has(w)).length <= bank.length / 3);
    }
  }
});

test('every bank word really appears in the messages of its class', () => {
  for (const language of LANGUAGES) {
    const c = makeCorpus({ language, docsPerClass: 300, seed: 11, typos: 0 });
    for (const k of CLASS_KEYS) {
      const text = c.docs.filter((_, i) => c.labels[i] === className(language, k)).join(' ').toLowerCase();
      for (const w of classWords(language, k)) assert.ok(text.includes(w), `${language} ${k}: "${w}" never appears`);
    }
  }
});

test('class names and example words come back in the right language', () => {
  assert.deepEqual(classNames('en'), ['billing', 'delivery', 'technical problem']);
  assert.deepEqual(classNames('id'), ['tagihan', 'pengiriman', 'masalah teknis']);
  assert.equal(className('id', 'technical'), 'masalah teknis');
  assert.equal(className('id', 'masalah teknis'), 'masalah teknis'); // a name is accepted too
  assert.equal(className('en', 'delivery'), 'delivery');
  assert.deepEqual(classWords('id', 'delivery'), classWords('id', 'pengiriman'));
  assert.ok(classWords('id', 'technical').includes('login')); // glossary keeps the English term
  const ex = exampleWords('id', 'billing', 4);
  assert.equal(ex.length, 4);
  const shared = new Set(overlapWords('id'));
  assert.ok(ex.every(w => !shared.has(w)), 'distinctive words come first');
  assert.ok(ex.every(w => classWords('id', 'billing').includes(w)));
  assert.equal(exampleWords('en', 'technical').length, 5);
  assert.equal(exampleWords('en', 'technical', 100).length, classWords('en', 'technical').length);
  // classWords hands out a copy.
  classWords('en', 'billing').pop();
  assert.equal(classWords('en', 'billing').length, 14);
  assert.throws(() => classNames('fr'), RangeError);
  assert.throws(() => className('en', 'refunds'), RangeError);
  assert.throws(() => makeCorpus({ language: 'fr' }), RangeError);
  assert.throws(() => makeCorpus({ docsPerClass: 0 }), RangeError);
  assert.throws(() => makeCorpus({ docsPerClass: 2.5 }), RangeError);
  assert.throws(() => makeCorpus({ ambiguity: 1.5 }), RangeError);
});

test('tokenize lowercases and keeps letters', () => {
  assert.deepEqual(tokenize('Hi, I was charged TWICE!'), ['hi', 'i', 'was', 'charged', 'twice']);
  assert.deepEqual(tokenize(''), []);
});

test('a Naive Bayes classifier scores roughly 85 to 95 percent, not 100', () => {
  for (const language of LANGUAGES) {
    const scores = [];
    for (let seed = 1; seed <= 6; seed++) {
      const train = makeCorpus({ language, docsPerClass: 100, seed });
      const held = makeCorpus({ language, docsPerClass: 100, seed: seed + 100 });
      scores.push(nbAccuracy(train, held));
    }
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    assert.ok(mean >= 0.85 && mean <= 0.96, `${language}: mean accuracy ${mean.toFixed(3)} (${scores.map(s => s.toFixed(2)).join(' ')})`);
    assert.ok(scores.every(s => s >= 0.8 && s < 1), `${language}: ${scores.join(' ')}`);
  }
});

test('with no ambiguity and no typos the classes are nearly separable', () => {
  for (const language of LANGUAGES) {
    const train = makeCorpus({ language, docsPerClass: 100, seed: 1, ambiguity: 0, typos: 0 });
    const held = makeCorpus({ language, docsPerClass: 100, seed: 2, ambiguity: 0, typos: 0 });
    assert.ok(nbAccuracy(train, held) > 0.95);
  }
});
