// Class imbalance, for the imbalance lab: data with an exact share of positives, a majority-class
// baseline, a logistic model (plain, class-weighted, or with a moved threshold) and the scores of both
// on a held-out set drawn with the SAME share of positives. Pure and deterministic: the same seed always
// gives the same data and the same numbers. Tested in imbalance.test.js.
//
// STABLE API (the lab imports these; change them only by adding):
//
//   positiveCount(n, fraction)             -> how many of n rows are positive: round(n * fraction), kept in 1..n-1
//                                             so both classes always appear.
//   generatedData({ n, fraction, seed })
//                                          -> { X, y }: n rows of two features in 0..10, exactly positiveCount(n, fraction)
//                                             of them positive (y = 1). Positives and negatives come from two separate
//                                             seeded streams, so raising the fraction adds positives and keeps the
//                                             negatives it already had (up to the ones it must drop to keep n rows).
//   majorityClass(labels)                  -> 0 or 1, whichever class is more common; a tie goes to 0.
//   scorePredictions(yTrue, yPred)         -> { tp, fp, tn, fn, accuracy, precision, recall, f1, undefined }
//                                             (undefined.precision is true when nothing was predicted positive).
//   classWeight(labels)                    -> how many times a positive row should count so both classes weigh the
//                                             same: round(negatives / positives), at least 1.
//   repeatPositives(X, y, times)           -> { X, y } with every positive row repeated `times` times in all. That is
//                                             the same loss as giving each positive the weight `times`, so the
//                                             logistic fit in logistic.js needs no new option.
//   fitModel(train, { weighted })          -> a logistic model fitted on train.X / train.y (class weights when weighted)
//   evaluate(train, test, { weighted, threshold, model })
//                                          -> { baseline: {predicts, ...scores}, model: {...scores}, majority,
//                                             model: fitted model, weight, test: {n, positives, fraction}, probabilities }
//   penguinTable(table)                    -> { X, y, total, dropped }: bill length and bill depth (mm), Chinstrap = 1,
//                                             rows with a missing value (NA) dropped and counted.
//   subsampleToFraction(data, fraction, seed)
//                                          -> { X, y, kept, ... }: a subset of `data` with about `fraction` positives.
//                                             Below the data's own share, every negative stays and positives are
//                                             subsampled; above it, every positive stays and negatives are subsampled.
//   stratifiedSplit(y, trainShare, seed)   -> { train: [indices], test: [indices] }, each class split in the same ratio.
//   takeRows(data, indices)                -> { X, y } of those rows.
//   rescaleLine(line, view)                -> the same line in plot units (0..10), given view = { xLo, xHi, yLo, yHi }
//   lineInSquare(w0, w1, b, size)          -> [[x, y], [x, y]]: where w0*x + w1*y + b = 0 crosses the 0..size square, or null
//   verdictKind(baselineAccuracy)          -> 'trap' (accuracy 90% or more without finding a positive), 'decent'
//                                             (75% or more) or 'fair'
//   trendKey(fraction, accuracyChange, recallChange)
//                                          -> the answer to the lab's predict-first question: 'up-down', 'up-same',
//                                             'up-up' or 'same-same', comparing a rarer share with the balanced 50%
//   halfPlanePolygon(w0, w1, b, size)      -> the polygon (corners in plot units) of the part of the 0..size square
//                                             where w0*x + w1*y + b >= 0; [] when that part is empty.
import { rng, gauss, shuffle } from './rng.js';
import { fitLogistic, predictProba, decisionScores, precisionRecallF1 } from './logistic.js';

export const clampPlot = v => Math.max(0.2, Math.min(9.8, v));

export function positiveCount(n, fraction) {
  return Math.max(1, Math.min(n - 1, Math.round(n * fraction)));
}

// Two overlapping blobs: negatives around (3.6, 4.2), positives around (6.4, 5.8), spread 1.3 in each
// direction. The distance between the centres is about 2.2 spreads: a good but not perfect model.
const NEG_CENTRE = [3.6, 4.2], POS_CENTRE = [6.4, 5.8], SPREAD = 1.3;

export function generatedData({ n, fraction, seed = 1 }) {
  const pos = positiveCount(n, fraction);
  const neg = n - pos;
  const randomPos = rng(seed * 2 + 1);
  const randomNeg = rng(seed * 2 + 2);
  const draw = (random, c) => [clampPlot(c[0] + SPREAD * gauss(random)), clampPlot(c[1] + SPREAD * gauss(random))];
  const X = [], y = [];
  for (let i = 0; i < neg; i++) { X.push(draw(randomNeg, NEG_CENTRE)); y.push(0); }
  for (let i = 0; i < pos; i++) { X.push(draw(randomPos, POS_CENTRE)); y.push(1); }
  return { X, y };
}

export function majorityClass(labels) {
  let ones = 0;
  for (const v of labels) if (Number(v) === 1) ones++;
  return ones > labels.length - ones ? 1 : 0;
}

export function scorePredictions(yTrue, yPred) {
  if (yTrue.length !== yPred.length) throw new Error(`imbalance: ${yTrue.length} labels but ${yPred.length} predictions`);
  const c = { tp: 0, fp: 0, tn: 0, fn: 0 };
  yTrue.forEach((t, i) => {
    if (t && yPred[i]) c.tp++; else if (!t && yPred[i]) c.fp++; else if (!t) c.tn++; else c.fn++;
  });
  const n = yTrue.length;
  return { ...c, accuracy: n ? (c.tp + c.tn) / n : 0, ...precisionRecallF1(c) };
}

export function classWeight(labels) {
  let pos = 0;
  for (const v of labels) if (Number(v) === 1) pos++;
  const neg = labels.length - pos;
  return pos ? Math.max(1, Math.round(neg / pos)) : 1;
}

export function repeatPositives(X, y, times) {
  const outX = [], outY = [];
  X.forEach((row, i) => {
    const reps = y[i] ? Math.max(1, times) : 1;
    for (let k = 0; k < reps; k++) { outX.push(row); outY.push(y[i]); }
  });
  return { X: outX, y: outY };
}

const FIT = { lr: 0.5, iters: 800 };

export function fitModel(train, { weighted = false } = {}) {
  const rows = weighted ? repeatPositives(train.X, train.y, classWeight(train.y)) : train;
  return fitLogistic(rows.X, rows.y, FIT);
}

export function evaluate(train, test, { weighted = false, threshold = 0.5, model = null } = {}) {
  const fitted = model ?? fitModel(train, { weighted });
  const probabilities = predictProba(fitted, test.X);
  const majority = majorityClass(train.y);
  const baseline = { predicts: majority, ...scorePredictions(test.y, test.y.map(() => majority)) };
  const modelScores = scorePredictions(test.y, probabilities.map(p => (p >= threshold ? 1 : 0)));
  const positives = test.y.reduce((a, v) => a + (v ? 1 : 0), 0);
  return {
    baseline, model: modelScores, fitted, probabilities, majority,
    weight: weighted ? classWeight(train.y) : 1,
    test: { n: test.y.length, positives, fraction: test.y.length ? positives / test.y.length : 0 },
  };
}

// The decision line of a 2-feature model at `threshold`. A row is called positive when its probability
// reaches the threshold, that is when its log-odds s(x) reach logit(threshold). s is a straight function
// of the two raw features (the standardizing is inside the model), so s(x) = s0 + a*x0 + c*x1 and the
// rows called positive are those with a*x0 + c*x1 + (s0 - logit(threshold)) >= 0. Returns { w0, w1, b }
// for halfPlanePolygon, in the features' own units.
export function decisionLine(model, threshold) {
  const s0 = decisionScores(model, [[0, 0]])[0];
  const w0 = decisionScores(model, [[1, 0]])[0] - s0, w1 = decisionScores(model, [[0, 1]])[0] - s0;
  return { w0, w1, b: s0 - Math.log(threshold / (1 - threshold)) };
}

export function halfPlanePolygon(w0, w1, b, size = 10) {
  const corners = [[0, 0], [size, 0], [size, size], [0, size]];
  const value = p => w0 * p[0] + w1 * p[1] + b;
  const out = [];
  // A corner that sits exactly on the line is also the crossing point of its edge: keep it once.
  const add = pt => { if (!out.some(o => Math.hypot(o[0] - pt[0], o[1] - pt[1]) < 1e-9)) out.push(pt); };
  for (let i = 0; i < corners.length; i++) {
    const p = corners[i], q = corners[(i + 1) % corners.length];
    const vp = value(p), vq = value(q);
    if (vp >= 0) add(p);
    if ((vp >= 0) !== (vq >= 0)) {
      const t = vp / (vp - vq);
      add([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return out;
}

export function rescaleLine({ w0, w1, b }, { xLo, xHi, yLo, yHi }) {
  return { w0: w0 * (xHi - xLo) / 10, w1: w1 * (yHi - yLo) / 10, b: b + w0 * xLo + w1 * yLo };
}

export function lineInSquare(w0, w1, b, size = 10) {
  const pts = [];
  const add = (x, y) => { if (!pts.some(p => Math.hypot(p[0] - x, p[1] - y) < 1e-9)) pts.push([x, y]); };
  const eps = 1e-9;
  if (Math.abs(w1) > eps) for (const x of [0, size]) { const y = -(w0 * x + b) / w1; if (y >= -eps && y <= size + eps) add(x, Math.min(size, Math.max(0, y))); }
  if (Math.abs(w0) > eps) for (const y of [0, size]) { const x = -(w1 * y + b) / w0; if (x >= -eps && x <= size + eps) add(Math.min(size, Math.max(0, x)), y); }
  return pts.length >= 2 ? [pts[0], pts[1]] : null;
}

export function verdictKind(baselineAccuracy) {
  return baselineAccuracy >= 0.9 ? 'trap' : baselineAccuracy >= 0.75 ? 'decent' : 'fair';
}

// Near 50% the classes are balanced, so there is nothing to compare yet. Below that the baseline's
// accuracy always rises (it is 1 minus the share of positives), so only recall decides: a drop of 5 points
// or more is 'down', a rise of 5 points or more is 'up'.
export function trendKey(fraction, accuracyChange, recallChange) {
  if (fraction >= 0.45 || accuracyChange < 0.03) return 'same-same';
  return `up-${recallChange <= -0.05 ? 'down' : recallChange >= 0.05 ? 'up' : 'same'}`;
}

// ---- real data: penguins, Chinstrap against the rest ---------------------------------------------

export function penguinTable(table) {
  const X = [], y = [];
  for (const r of table.rows) {
    const a = r.bill_length_mm, b = r.bill_depth_mm;
    if (typeof a === 'number' && typeof b === 'number' && Number.isFinite(a) && Number.isFinite(b)) {
      X.push([a, b]); y.push(r.species === 'Chinstrap' ? 1 : 0);
    }
  }
  return { X, y, total: table.rows.length, dropped: table.rows.length - X.length };
}

export function takeRows(data, indices) {
  return { X: indices.map(i => data.X[i]), y: indices.map(i => data.y[i]) };
}

// A subset with about `fraction` positives (never fewer than 2 positives, so each side of a split can
// have one). The order of the subset follows a seeded shuffle, so a new fraction keeps most of the rows
// it had before.
export function subsampleToFraction(data, fraction, seed = 1) {
  const random = rng(seed);
  const posIdx = shuffle(data.y.flatMap((v, i) => (v ? [i] : [])), random);
  const negIdx = shuffle(data.y.flatMap((v, i) => (v ? [] : [i])), random);
  const share = posIdx.length / data.y.length;
  let p = posIdx.length, q = negIdx.length;
  if (fraction <= share) p = Math.min(posIdx.length, Math.max(2, Math.round(fraction * negIdx.length / (1 - fraction))));
  else q = Math.min(negIdx.length, Math.max(2, Math.round(posIdx.length * (1 - fraction) / fraction)));
  const indices = [...negIdx.slice(0, q), ...posIdx.slice(0, p)];
  return { ...takeRows(data, indices), positives: p, negatives: q };
}

export function stratifiedSplit(y, trainShare = 0.5, seed = 1) {
  const random = rng(seed);
  const train = [], test = [];
  for (const label of [0, 1]) {
    const idx = shuffle(y.flatMap((v, i) => (Number(v) === label ? [i] : [])), random);
    // At least one row of each class on each side when the class has two or more rows.
    const cut = idx.length < 2 ? idx.length : Math.min(idx.length - 1, Math.max(1, Math.round(idx.length * trainShare)));
    train.push(...idx.slice(0, cut)); test.push(...idx.slice(cut));
  }
  return { train, test };
}
