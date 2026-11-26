// Multinomial naive Bayes for text, for the "Naive Bayes and text classification" module.
// Pure functions, deterministic (no randomness anywhere), tested in naivebayes.test.js.
//
// API
//   tokenize(text, { stopWords })        lowercase the text and split it on every run of non-letters
//                                        (Unicode letters are kept, so "Jakarta" and "café" work;
//                                        digits, punctuation and apostrophes are separators, so
//                                        "don't" becomes "don", "t"). Returns the tokens in order.
//                                        stopWords: false (default, keep everything) | "en" |
//                                        "id" | "both" | your own array of lowercase words. The
//                                        built-in lists are short on purpose (about 60 English and
//                                        60 Indonesian function words) and are exported as
//                                        STOP_WORDS = { en, id }.
//
//   buildVocab(docs, { minDf })          docs: arrays of tokens. Keeps the words that occur in at
//                                        least minDf different documents (default 1; the document
//                                        frequency df, not the total count). Returns
//                                        { words, df, nDocs, index }: words sorted alphabetically
//                                        (so the column order is reproducible), df[j] aligned with
//                                        words, nDocs the number of documents, and index a Map
//                                        from word to column.
//   bagOfWords(tokens, vocab)            the count vector for one document, length = vocab size;
//                                        tokens that are not in the vocabulary are ignored.
//                                        vocab may be a buildVocab result or a plain array of words.
//
//   idf(matrix)                          one weight per column of a count matrix (rows = documents):
//                                           idf_j = ln((1 + n) / (1 + df_j)) + 1
//                                        n = number of rows, df_j = rows where column j is above 0.
//                                        The "+1" inside the fraction is smoothing, as if one extra
//                                        document contained every word, so no idf is infinite or
//                                        zero-division; the final "+1" keeps a word that is in every
//                                        document at weight 1 instead of 0. This is the smoothed
//                                        form scikit-learn uses.
//   tfidf(matrix, { norm, idf })         TF-IDF of a count matrix:
//                                           w_ij = count_ij * idf_j,  then each row is divided by its
//                                           Euclidean length when norm is "l2" (default), so every
//                                           non-empty document has length 1; norm: "none" skips that.
//                                        An all-zero row stays all zero. Pass idf (from idf() of the
//                                        training matrix) to weigh new documents with the training
//                                        idf instead of their own.
//
//   fitNaiveBayes(docs, labels, { alpha, features, norm, minDf, stopWords })
//                                        Multinomial naive Bayes. docs: strings (tokenised with
//                                        stopWords) or arrays of tokens; labels: one class per doc,
//                                        at least two classes, classes ordered by first appearance.
//                                        alpha: Lidstone smoothing, default 1 (Laplace); 0 means no
//                                        smoothing. features: "counts" (default) or "tfidf", where
//                                        the word "counts" in the formulas below become tf-idf
//                                        weights (fractional counts work fine). For class c:
//                                           prior        P(c)    = docs in c / all docs
//                                           likelihood   P(w|c)  = (N_cw + alpha) / (N_c + alpha * V)
//                                        N_cw = total feature weight of word w over the documents of
//                                        c, N_c = sum of N_cw over all words, V = vocabulary size.
//                                        The model is a plain object: { classes, vocab, alpha,
//                                        features, norm, idf, stopWords, nDocs, classDocs,
//                                        logPrior, wordMass, classMass, logLik } where logPrior[c],
//                                        wordMass[c][j] (= N_cw), classMass[c] (= N_c) and
//                                        logLik[c][j] (= ln P(w_j|c)) are indexed like classes.
//   predictLogProba(model, doc)          ln P(c | doc) for every class, normalised stably:
//                                           joint_c = ln P(c) + sum_j x_j * ln P(w_j|c)
//                                           log P(c|doc) = joint_c - logSumExp(joint)
//                                        (the max is subtracted first, so a long document whose
//                                        joint is -5000 does not underflow to 0/0). Words outside
//                                        the vocabulary are ignored. If every class has joint
//                                        -Infinity (only possible with alpha 0: each class has a
//                                        word of the document it never saw) the model has no
//                                        evidence either way and the result is uniform.
//   predictProba(model, doc)             the same as probabilities, array aligned with
//                                        model.classes, summing to 1.
//   predict(model, doc)                  the most probable class; a tie goes to the class that
//                                        appeared first in the training labels.
//   topWords(model, className, k)        the k vocabulary words with the highest log-odds for the
//                                        class against all the others pooled together:
//                                           ln P(w|c) - ln P(w|not c),
//                                        P(w|not c) = (sum over other classes of N_c'w + alpha) /
//                                                     (sum of their N_c' + alpha * V).
//                                        Returns [{ word, logOdds, weight }] with weight = N_cw,
//                                        best first, ties alphabetical (k default 10).
//   explain(model, doc, { k })           why the model chose what it chose. predicted = the
//                                        winning class, rival = the runner-up. The log-odds of
//                                        predicted against rival splits exactly into
//                                           logOdds = prior + sum over words of contribution,
//                                           prior        = ln P(pred) - ln P(rival)
//                                           contribution = x_j * (ln P(w_j|pred) - ln P(w_j|rival))
//                                        where x_j is the word's count in the document (or its
//                                        tf-idf weight). Positive pushes toward predicted, negative
//                                        toward the rival. Returns { predicted, rival, proba,
//                                        prior, logOdds, contributions, ignored } with
//                                        contributions = [{ word, value, contribution }] for the
//                                        words present in the model's vocabulary, largest absolute
//                                        contribution first (k keeps the first k; default all) and
//                                        ignored = the distinct tokens outside the vocabulary.
//                                        With alpha 0 a contribution can be +/-Infinity.
//   evaluate(model, docs, labels)        { accuracy, n, correct, classes, confusion, predictions,
//                                        mistakes }: confusion[i][j] = documents whose true class is
//                                        classes[i] and predicted class classes[j]; mistakes =
//                                        indices of the wrong documents. Labels the model never saw
//                                        throw.
//   logSumExp(values)                    ln(sum(exp(values))), stable; -Infinity for an empty
//                                        array or when every value is -Infinity.

const EN = ('a an and are as at be been but by for from had has have he her his i if in into is it its '
  + 'me my no not of on or our she so that the their them then there they this to was we were what '
  + 'when which who will with you your don s t').split(' ');

const ID = ('ada adalah akan anda apa atau bagi bahwa banyak dalam dan dari dengan di dia ini itu ia juga '
  + 'kami kamu karena ke kita lagi lebih masih mereka oleh pada saat saya sebagai sedang sudah tidak '
  + 'tetapi untuk yang ya akan dapat harus hanya jika kalau mau nya pun sangat telah').split(' ');

export const STOP_WORDS = { en: EN, id: ID };

function stopSet(stopWords) {
  if (!stopWords) return null;
  if (Array.isArray(stopWords)) return new Set(stopWords.map(w => String(w).toLowerCase()));
  if (stopWords === 'en') return new Set(EN);
  if (stopWords === 'id') return new Set(ID);
  if (stopWords === 'both') return new Set([...EN, ...ID]);
  throw new Error(`tokenize: stopWords must be false, "en", "id", "both" or an array, got ${stopWords}`);
}

export function tokenize(text, { stopWords = false } = {}) {
  const stops = stopSet(stopWords);
  const tokens = String(text ?? '').toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  return stops ? tokens.filter(t => !stops.has(t)) : tokens;
}

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function buildVocab(docs, { minDf = 1 } = {}) {
  const dfOf = new Map();
  for (const tokens of docs) for (const w of new Set(tokens)) dfOf.set(w, (dfOf.get(w) ?? 0) + 1);
  const words = [...dfOf.keys()].filter(w => dfOf.get(w) >= minDf).sort(cmp);
  return {
    words,
    df: words.map(w => dfOf.get(w)),
    nDocs: docs.length,
    index: new Map(words.map((w, i) => [w, i])),
  };
}

function indexOf(vocab) {
  if (Array.isArray(vocab)) return new Map(vocab.map((w, i) => [w, i]));
  return vocab.index instanceof Map ? vocab.index : new Map(vocab.words.map((w, i) => [w, i]));
}
const wordsOf = vocab => (Array.isArray(vocab) ? vocab : vocab.words);

export function bagOfWords(tokens, vocab) {
  const index = indexOf(vocab);
  const row = new Array(wordsOf(vocab).length).fill(0);
  for (const t of tokens) {
    const j = index.get(t);
    if (j !== undefined) row[j] += 1;
  }
  return row;
}

export function idf(matrix) {
  const n = matrix.length;
  const cols = n ? matrix[0].length : 0;
  const df = new Array(cols).fill(0);
  for (const row of matrix) for (let j = 0; j < cols; j++) if (row[j] > 0) df[j] += 1;
  return df.map(d => Math.log((1 + n) / (1 + d)) + 1);
}

function weigh(row, idfVec, norm) {
  const w = row.map((c, j) => c * idfVec[j]);
  if (norm === 'l2') {
    const len = Math.sqrt(w.reduce((s, v) => s + v * v, 0));
    if (len > 0) return w.map(v => v / len);
  }
  return w;
}

function checkNorm(norm) {
  if (norm !== 'l2' && norm !== 'none') throw new Error(`norm must be "l2" or "none", got ${norm}`);
}

export function tfidf(matrix, { norm = 'l2', idf: idfVec } = {}) {
  checkNorm(norm);
  const weights = idfVec ?? idf(matrix);
  return matrix.map(row => weigh(row, weights, norm));
}

export function logSumExp(values) {
  let max = -Infinity;
  for (const v of values) if (v > max) max = v;
  if (max === -Infinity) return -Infinity;
  let sum = 0;
  for (const v of values) sum += Math.exp(v - max);
  return max + Math.log(sum);
}

const toTokens = (doc, stopWords) => (Array.isArray(doc) ? doc : tokenize(doc, { stopWords }));

export function fitNaiveBayes(docs, labels, {
  alpha = 1, features = 'counts', norm = 'l2', minDf = 1, stopWords = false,
} = {}) {
  if (docs.length !== labels.length) throw new Error('fitNaiveBayes: docs and labels differ in length');
  if (!(alpha >= 0)) throw new Error(`fitNaiveBayes: alpha must be 0 or more, got ${alpha}`);
  if (features !== 'counts' && features !== 'tfidf') {
    throw new Error(`fitNaiveBayes: features must be "counts" or "tfidf", got ${features}`);
  }
  checkNorm(norm);
  stopSet(stopWords); // fail early on a bad stop-word option

  const classes = [...new Set(labels)];
  if (classes.length < 2) throw new Error('fitNaiveBayes: need documents from at least two classes');

  const tokenLists = docs.map(d => toTokens(d, stopWords));
  const vocab = buildVocab(tokenLists, { minDf });
  const V = vocab.words.length;
  if (V === 0) throw new Error('fitNaiveBayes: the vocabulary is empty');

  const counts = tokenLists.map(t => bagOfWords(t, vocab));
  const idfVec = features === 'tfidf' ? idf(counts) : null;
  const X = features === 'tfidf' ? tfidf(counts, { norm, idf: idfVec }) : counts;

  const classDocs = classes.map(() => 0);
  const wordMass = classes.map(() => new Array(V).fill(0));
  labels.forEach((label, i) => {
    const c = classes.indexOf(label);
    classDocs[c] += 1;
    for (let j = 0; j < V; j++) wordMass[c][j] += X[i][j];
  });
  const classMass = wordMass.map(row => row.reduce((s, v) => s + v, 0));
  const logLik = wordMass.map((row, c) => {
    const denom = classMass[c] + alpha * V;
    return row.map(m => (denom > 0 ? Math.log((m + alpha) / denom) : -Infinity));
  });

  return {
    classes, vocab, alpha, features, norm, idf: idfVec, stopWords, nDocs: docs.length,
    classDocs,
    logPrior: classDocs.map(n => Math.log(n / docs.length)),
    wordMass, classMass, logLik,
  };
}

// The feature vector of one document under the model's own tokenizer, vocabulary and weighting.
function featuresOf(model, doc) {
  const counts = bagOfWords(toTokens(doc, model.stopWords), model.vocab);
  return model.features === 'tfidf' ? weigh(counts, model.idf, model.norm) : counts;
}

function jointLog(model, x) {
  return model.classes.map((_, c) => {
    let s = model.logPrior[c];
    for (let j = 0; j < x.length; j++) if (x[j] !== 0) s += x[j] * model.logLik[c][j];
    return s;
  });
}

function normalise(joint) {
  const lse = logSumExp(joint);
  if (lse === -Infinity) return joint.map(() => -Math.log(joint.length));
  return joint.map(v => v - lse);
}

export function predictLogProba(model, doc) {
  return normalise(jointLog(model, featuresOf(model, doc)));
}

export function predictProba(model, doc) {
  return predictLogProba(model, doc).map(Math.exp);
}

function argmax(values) {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i;
  return best;
}

export function predict(model, doc) {
  return model.classes[argmax(predictLogProba(model, doc))];
}

// Highest first; Infinity ties and equal values fall back to alphabetical order.
const byScoreThenWord = (a, b) => (a.score === b.score ? cmp(a.word, b.word) : b.score - a.score);

export function topWords(model, className, k = 10) {
  const c = model.classes.indexOf(className);
  if (c < 0) throw new Error(`topWords: unknown class ${className}`);
  const V = model.vocab.words.length;
  const others = model.classes.map((_, i) => i).filter(i => i !== c);
  const otherTotal = others.reduce((s, i) => s + model.classMass[i], 0);
  const otherDenom = otherTotal + model.alpha * V;
  const rows = model.vocab.words.map((word, j) => {
    const otherMass = others.reduce((s, i) => s + model.wordMass[i][j], 0);
    const inClass = model.logLik[c][j];
    const outClass = otherDenom > 0 ? Math.log((otherMass + model.alpha) / otherDenom) : -Infinity;
    const logOdds = inClass === outClass ? 0 : inClass - outClass;
    return { word, logOdds, weight: model.wordMass[c][j], score: logOdds };
  });
  return rows.sort(byScoreThenWord).slice(0, k).map(({ word, logOdds, weight }) => ({ word, logOdds, weight }));
}

export function explain(model, doc, { k = Infinity } = {}) {
  const x = featuresOf(model, doc);
  const logProba = normalise(jointLog(model, x));
  const order = logProba.map((_, i) => i).sort((a, b) => (logProba[b] - logProba[a]) || (a - b));
  const [p, r] = order;
  const prior = model.logPrior[p] - model.logPrior[r];
  const contributions = [];
  x.forEach((value, j) => {
    if (value === 0) return;
    const diff = model.logLik[p][j] === model.logLik[r][j] ? 0 : model.logLik[p][j] - model.logLik[r][j];
    contributions.push({ word: model.vocab.words[j], value, contribution: value * diff });
  });
  contributions.sort((a, b) => {
    const ma = Math.abs(a.contribution), mb = Math.abs(b.contribution);
    return ma === mb ? cmp(a.word, b.word) : mb - ma;
  });
  const index = indexOf(model.vocab);
  const ignored = [...new Set(toTokens(doc, model.stopWords).filter(t => !index.has(t)))].sort(cmp);
  return {
    predicted: model.classes[p],
    rival: model.classes[r],
    proba: logProba.map(Math.exp),
    prior,
    logOdds: prior + contributions.reduce((s, c) => s + c.contribution, 0),
    contributions: contributions.slice(0, k),
    ignored,
  };
}

export function evaluate(model, docs, labels) {
  if (docs.length !== labels.length) throw new Error('evaluate: docs and labels differ in length');
  const K = model.classes.length;
  const confusion = Array.from({ length: K }, () => new Array(K).fill(0));
  const predictions = [];
  const mistakes = [];
  let correct = 0;
  docs.forEach((doc, i) => {
    const truth = model.classes.indexOf(labels[i]);
    if (truth < 0) throw new Error(`evaluate: the model never saw the class ${labels[i]}`);
    const guess = argmax(predictLogProba(model, doc));
    predictions.push(model.classes[guess]);
    confusion[truth][guess] += 1;
    if (truth === guess) correct += 1; else mistakes.push(i);
  });
  return {
    accuracy: docs.length ? correct / docs.length : 0,
    n: docs.length, correct, classes: model.classes.slice(), confusion, predictions, mistakes,
  };
}
