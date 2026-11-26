// Dataset-shift helpers for the "Advanced evaluation and shift" module. Pure functions, seeded and
// reproducible, tested in shift.test.js. Builds on validation.js (the fold builders and
// crossValidate), knn.js / logistic.js (the models) and calibration.js (auc).
//
// API
//   makeShiftData({ n, seed, shift, severity, noise, drift, groupSpread, nTest })
//       -> { train, test, shift, severity, positiveRate: { train, test } }
//       Two-class, 2-D labelled rows. A row is { features: [x0, x1], label: 0|1, group, time }.
//       The world: x ~ N(0, I); label = 1 when the wavy boundary x1 > A sin(B x0) holds, then
//       flipped with probability `noise` (default 0.08). The boundary is curved on purpose: a
//       model must learn it from the region the training rows cover, so a test set that moves out
//       of that region hurts. Rows also belong to groups (sites or people) that sit a little off
//       centre (`groupSpread`, default 0.3), and carry a `time` (their position in the table).
//       The train set has n rows (default 200, group ids 0..); the test set has nTest rows (default
//       n) from NEW groups. `shift` says which ONE thing differs in the test set:
//         "none"       test ~ same world as train.
//         "covariate"  the inputs move: x0 is shifted right by 3 * severity. The labelling rule
//                      P(label | x) is untouched.
//         "label"      the class balance changes: the positive share goes from 0.5 to
//                      0.5 - 0.4 * severity. Each class keeps its own input distribution
//                      (rows are drawn class first, then rejected until they fit the class).
//         "concept"    the decision boundary rotates by 90 degrees * severity around the origin.
//                      The inputs keep exactly their distribution; only the rule changes.
//       severity is in [0, 1] (default 1). The train set never depends on `shift` (same seed, same
//       train rows) unless `drift` is set. drift in [0, 1] (default 0) lets the training log
//       already contain that fraction of the shift, growing smoothly with `time`: the last
//       training rows have moved drift * severity of the way. That is what lets a temporal split
//       see a shift coming. Test rows are drawn from their own seeded stream, and for "none",
//       "covariate" and "concept" they use the same draws, so the three test sets differ only by
//       the one change above (covariate = the "none" inputs + the offset; concept = the same
//       inputs and flips, rotated boundary).
//   shiftXY(rows) -> { X, y, groups, time }          the arrays the fold builders and models take.
//   cleanLabel(features, angle = 0)                  the noise-free rule, for tests and drawing:
//                                                    1 when the boundary, rotated by `angle`
//                                                    radians, puts the point on the positive side.
//   SHIFT_KINDS                                      ["none", "covariate", "label", "concept"].
//
//   Models. `model` below is "knn" (default, k = 5), "logistic", a config { type: "knn", k } or
//   { type: "logistic", l2, lr, iters }, or your own fitPredict(trainX, trainY, testX) -> labels.
//   modelFitPredict(model, config = {}) -> a fitPredict; `config` (a grid point) overrides k, l2,
//       lr and iters of the model config.
//
//   estimatePerformance({ data, setup, model, seed, folds, grid })
//       -> { setup, estimate, sd, scores, spread, folds? | chosen? }
//       What the training data alone says the model will score (accuracy). It only ever reads the
//       labelled train rows; the setups that look at the target (shifted-holdout) read the test
//       INPUTS only, never the test labels. setup:
//         "random"          k-fold over the rows (folds, default 5).
//         "grouped"         group k-fold: a group is never in train and test (folds, default 5).
//         "temporal"        expanding window over the time order (folds, default 4); the first
//                           block is only ever training data.
//         "shifted-holdout" ONE split: the 30% of train rows nearest (standardised, nearest
//                           neighbour) to the test inputs are held out, the rest fit. sd is the
//                           binomial standard error of that one accuracy (spread: "standard-error").
//         "nested"          nestedCv over `grid` (default { k: [1, 3, 5, 7, 9, 11, 15, 21] } for
//                           knn, { l2: [0, 0.01, 0.1, 1, 10] } for logistic); estimate is the
//                           mean outer score, `chosen` the setting picked per outer fold.
//       For the fold setups sd is the sample sd of the fold scores (spread: "folds").
//       scores has one entry per fold (one for shifted-holdout).
//   actualPerformance({ data, model, grid, seed }) -> accuracy of a model fitted on ALL train rows
//       and scored on the test rows. With `grid`, the settings are first chosen by 5-fold CV on the
//       train rows (gridSearch, ties keep the first), which is the procedure "nested" estimates;
//       the result then also carries { chosen }. Returns a number without grid, an object with.
//   compareSetups({ data, model, seed, setups, grid, tolerance })
//       -> { actual, actualTuned, rows: [{ setup, estimate, sd, gap, anticipated }] }
//       One call for the lab: every setup's estimate against the real score on the test rows.
//       gap = estimate - actual (positive = the setup was too optimistic); anticipated is true when
//       |gap| <= tolerance (default 0.05). The nested row is compared with actualTuned. setups
//       defaults to all five.
//   SETUPS                                           the five setup names, in the order above.
//
//   nestedCv({ X, y, grid, outerFolds, innerFolds, seed, model, fitPredictFor })
//       -> { outerScores, chosen, innerBest, nested: { mean, sd }, nonNested: { mean, sd, config },
//            optimism }
//       Nested cross-validation. For each of outerFolds (default 5) shuffled folds, a grid search
//       with innerFolds (default 4) inner folds runs on that fold's TRAINING rows only; the best
//       setting is refitted on them and scored on the outer test fold the search never saw.
//       outerScores: those scores; chosen: the setting per outer fold; innerBest: the winning inner
//       score per fold (what a search would have reported). nonNested is the usual shortcut: grid
//       search with outerFolds-fold CV on ALL rows and report the best mean score. optimism =
//       nonNested.mean - nested.mean: how much the shortcut flatters the tuned model (positive on
//       average; one dataset can give a negative value by chance). grid is { name: [values] } as in
//       validation.js gridSearch. The model comes from `model` + the grid point, or from
//       fitPredictFor(config) -> fitPredict.
//
//   Shift detectors (a and b are arrays of numbers: the old and the new values of one feature).
//   psi(a, b, bins = 10)       Population Stability Index of b against the reference a:
//                              sum over bins of (q - p) ln(q / p), p and q the shares of a and of b
//                              in the bin. `bins` is a number (equal-frequency bins cut at the
//                              quantiles of a) or an array of inner edges (a value on an edge
//                              falls in the bin to its right). A share of 0 is floored at 1e-4 so
//                              the logarithm stays finite. 0 = identical; common reading:
//                              < 0.1 stable, 0.1-0.25 moderate, > 0.25 large (psiVerdict).
//   psiFromCounts(expected, actual)  the same sum from two histograms (counts per bin, same bins).
//   psiTable(a, b, bins)       -> { psi, rows: [{ lo, hi, expected, actual, p, q, contribution }] }
//                              for drawing the bins; lo/hi are null at the open ends.
//   psiVerdict(value)          -> "stable" | "moderate" | "large".
//   ksStat(a, b)               two-sample Kolmogorov-Smirnov statistic: the largest gap between the
//                              two empirical cumulative distributions, in [0, 1]; ties are handled
//                              by comparing the CDFs after each distinct value.
//   domainClassifierAuc(trainX, testX, seed = 1)
//                              a logistic regression is asked to tell train rows (0) from test rows
//                              (1) using only the features; the AUC comes from 5-fold out-of-fold
//                              probabilities. About 0.5 = the inputs cannot be told apart;
//                              near 1 = they can. It sees the inputs only, so it detects covariate
//                              (and, a little, label) shift and is blind to concept shift.

import { rng, gauss } from './rng.js';
import { mean, stdDev } from './stats.js';
import { columnStats, standardize } from './scale.js';
import { fitLogistic, predict as logisticPredict, predictProba } from './logistic.js';
import { auc } from './calibration.js';
import {
  kFold, stratifiedKFold, groupKFold, timeSplit, crossValidate, knnFitPredict, accuracy, gridSearch,
} from './validation.js';

export const SHIFT_KINDS = ['none', 'covariate', 'label', 'concept'];
export const SETUPS = ['random', 'grouped', 'temporal', 'shifted-holdout', 'nested'];

const AMPLITUDE = 1, FREQUENCY = 1.2;          // the boundary x1 = AMPLITUDE * sin(FREQUENCY * x0)
const COVARIATE_OFFSET = 3;                    // x0 shift at severity 1
const LABEL_DROP = 0.4;                        // positive share falls by this much at severity 1
const MAX_ANGLE = Math.PI / 2;                 // boundary rotation at severity 1
const PSI_FLOOR = 1e-4;

const range = n => Array.from({ length: n }, (_, i) => i);

// An independent seeded stream per (seed, salt): the LCG in rng.js is too correlated across nearby
// seeds, so the pair is mixed first.
function stream(seed, salt) {
  let h = (Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(salt | 0, 0xc2b2ae35)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  h = (h ^ (h >>> 15)) >>> 0;
  const random = rng(h);
  for (let i = 0; i < 4; i++) random();
  return random;
}

export function cleanLabel(features, angle = 0) {
  const [x0, x1] = features;
  const c = Math.cos(angle), s = Math.sin(angle);
  const u = c * x0 + s * x1, v = -s * x0 + c * x1;   // the point rotated by -angle
  return v > AMPLITUDE * Math.sin(FREQUENCY * u) ? 1 : 0;
}

function checkShiftArgs(shift, severity, drift) {
  if (!SHIFT_KINDS.includes(shift)) throw new RangeError(`shift must be one of ${SHIFT_KINDS.join(', ')}`);
  if (!(severity >= 0 && severity <= 1)) throw new RangeError('severity must be between 0 and 1');
  if (!(drift >= 0 && drift <= 1)) throw new RangeError('drift must be between 0 and 1');
}

// One world: the offset of the inputs, the boundary angle and the positive share.
function worldFor(shift, severity) {
  return {
    offset: shift === 'covariate' ? COVARIATE_OFFSET * severity : 0,
    angle: shift === 'concept' ? MAX_ANGLE * severity : 0,
    positive: shift === 'label' ? 0.5 - LABEL_DROP * severity : 0.5,
  };
}

const BASE = { offset: 0, angle: 0, positive: 0.5 };

// Generates `count` rows. worldAt(i) gives the world for row i. Group g's centre is fixed per group.
function makeRows({ count, random, worldAt, noise, groupSpread, firstGroup, groups }) {
  const centres = Array.from({ length: groups }, () => [groupSpread * gauss(random), groupSpread * gauss(random)]);
  const rows = [];
  for (let i = 0; i < count; i++) {
    const world = worldAt(i);
    const group = i % groups;
    const centre = centres[group];
    let features, label;
    if (Math.abs(world.positive - 0.5) < 1e-12) {
      features = [centre[0] + world.offset + gauss(random), centre[1] + gauss(random)];
      const flip = random() < noise;
      label = cleanLabel(features, world.angle) ^ (flip ? 1 : 0);
    } else {
      // Class first, then the inputs of that class: rejection until the noisy label matches.
      const want = random() < world.positive ? 1 : 0;
      for (let tries = 0; ; tries++) {
        features = [centre[0] + world.offset + gauss(random), centre[1] + gauss(random)];
        const flip = random() < noise;
        label = cleanLabel(features, world.angle) ^ (flip ? 1 : 0);
        if (label === want || tries > 1000) break;
      }
    }
    rows.push({ features, label, group: firstGroup + group, time: i });
  }
  return rows;
}

export function makeShiftData({
  n = 200, seed = 1, shift = 'none', severity = 1, noise = 0.08, drift = 0, groupSpread = 0.3, nTest = n,
} = {}) {
  checkShiftArgs(shift, severity, drift);
  if (!Number.isInteger(n) || n < 10) throw new RangeError('n must be an integer of at least 10');
  if (!Number.isInteger(nTest) || nTest < 10) throw new RangeError('nTest must be an integer of at least 10');
  const target = worldFor(shift, severity);
  const groups = count => Math.max(5, Math.round(count / 8));
  const trainGroups = groups(n);
  const train = makeRows({
    count: n, random: stream(seed, 1), noise, groupSpread, firstGroup: 0, groups: trainGroups,
    worldAt: i => {
      const t = n > 1 ? i / (n - 1) : 0, f = drift * t;
      return {
        offset: BASE.offset + (target.offset - BASE.offset) * f,
        angle: BASE.angle + (target.angle - BASE.angle) * f,
        positive: BASE.positive + (target.positive - BASE.positive) * f,
      };
    },
  });
  const test = makeRows({
    count: nTest, random: stream(seed, 2), noise, groupSpread, firstGroup: trainGroups, groups: groups(nTest),
    worldAt: () => target,
  });
  const share = rows => rows.reduce((a, r) => a + r.label, 0) / rows.length;
  return { train, test, shift, severity, positiveRate: { train: share(train), test: share(test) } };
}

export const shiftXY = rows => ({
  X: rows.map(r => r.features), y: rows.map(r => r.label), groups: rows.map(r => r.group), time: rows.map(r => r.time),
});

// ---- Models ----------------------------------------------------------------------------------

export function modelFitPredict(model = 'knn', config = {}) {
  if (typeof model === 'function') return model;
  const spec = typeof model === 'string' ? { type: model } : { ...model };
  for (const key of ['k', 'l2', 'lr', 'iters']) if (config[key] !== undefined) spec[key] = config[key];
  if (spec.type === 'knn') return knnFitPredict(spec.k ?? 5);
  if (spec.type === 'logistic') {
    const { l2 = 0, lr = 0.1, iters = 300 } = spec;
    return (trainX, trainY, testX) => logisticPredict(fitLogistic(trainX, trainY, { l2, lr, iters }), testX);
  }
  throw new RangeError(`unknown model "${spec.type}"; use "knn", "logistic" or a fitPredict function`);
}

const modelType = model => (typeof model === 'string' ? model : model && model.type) || 'knn';

function defaultGrid(model) {
  return modelType(model) === 'logistic' ? { l2: [0, 0.01, 0.1, 1, 10] } : { k: [1, 3, 5, 7, 9, 11, 15, 21] };
}

// ---- Nested cross-validation -----------------------------------------------------------------

export function nestedCv({
  X, y, grid, outerFolds = 5, innerFolds = 4, seed = 1, model = 'knn', fitPredictFor,
}) {
  if (X.length !== y.length) throw new RangeError('X and y must have the same length');
  const space = grid ?? defaultGrid(model);
  const make = fitPredictFor ?? (config => modelFitPredict(model, config));
  const sub = (rows, idx) => idx.map(i => rows[i]);
  const outer = kFold(X.length, outerFolds, seed);
  const outerScores = [], chosen = [], innerBest = [];
  outer.forEach(({ train, test }, f) => {
    const trainX = sub(X, train), trainY = sub(y, train);
    const inner = kFold(train.length, innerFolds, seed + 1000 + f);
    const search = gridSearch(space, config =>
      crossValidate({ X: trainX, y: trainY, fitPredict: make(config), folds: inner }).mean);
    const pred = make(search.best.config)(trainX, trainY, sub(X, test));
    outerScores.push(accuracy(sub(y, test), pred));
    chosen.push(search.best.config);
    innerBest.push(search.best.score);
  });
  // The shortcut: tune and report on the same folds.
  const all = kFold(X.length, outerFolds, seed);
  const shortcut = gridSearch(space, config => crossValidate({ X, y, fitPredict: make(config), folds: all }).mean);
  const sd = xs => (xs.length > 1 ? stdDev(xs, { sample: true }) : 0);
  const best = crossValidate({ X, y, fitPredict: make(shortcut.best.config), folds: all });
  return {
    outerScores, chosen, innerBest,
    nested: { mean: mean(outerScores), sd: sd(outerScores) },
    nonNested: { mean: shortcut.best.score, sd: best.sd, config: shortcut.best.config },
    optimism: shortcut.best.score - mean(outerScores),
  };
}

// ---- Validation setups -----------------------------------------------------------------------

// Train rows nearest to the target inputs first (standardised by the train columns).
function nearestToTarget(trainX, targetX) {
  const stats = columnStats(trainX);
  const a = standardize(trainX, stats), b = standardize(targetX, stats);
  const d = a.map(p => Math.min(...b.map(q => Math.hypot(...p.map((v, j) => v - q[j])))));
  return range(trainX.length).sort((i, j) => d[j] - d[i] === 0 ? i - j : d[i] - d[j]);
}

const HOLDOUT = 0.3;

export function estimatePerformance({ data, setup = 'random', model = 'knn', seed = 1, folds, grid }) {
  const { X, y, groups } = shiftXY(data.train);
  const n = X.length;
  const fitPredict = modelFitPredict(model);
  const finish = (cv, extra = {}) => ({
    setup, estimate: cv.mean, sd: cv.sd, scores: cv.scores, spread: 'folds', ...extra,
  });
  if (setup === 'random') {
    return finish(crossValidate({ X, y, fitPredict, folds: kFold(n, folds ?? 5, seed) }), { folds: folds ?? 5 });
  }
  if (setup === 'grouped') {
    return finish(crossValidate({ X, y, fitPredict, folds: groupKFold(groups, folds ?? 5, seed) }), { folds: folds ?? 5 });
  }
  if (setup === 'temporal') {
    return finish(crossValidate({ X, y, fitPredict, folds: timeSplit(n, folds ?? 4) }), { folds: folds ?? 4 });
  }
  if (setup === 'shifted-holdout') {
    const order = nearestToTarget(X, data.test.map(r => r.features));
    const m = Math.max(1, Math.round(n * HOLDOUT));
    const holdout = order.slice(0, m).sort((i, j) => i - j), held = new Set(holdout);
    const train = range(n).filter(i => !held.has(i));
    const cv = crossValidate({ X, y, fitPredict, folds: [{ train, test: holdout }] });
    const p = cv.mean;
    return {
      setup, estimate: p, sd: Math.sqrt((p * (1 - p)) / m), scores: cv.scores, spread: 'standard-error', folds: 1,
    };
  }
  if (setup === 'nested') {
    const r = nestedCv({ X, y, grid: grid ?? defaultGrid(model), outerFolds: folds ?? 5, seed, model });
    return {
      setup, estimate: r.nested.mean, sd: r.nested.sd, scores: r.outerScores, spread: 'folds',
      folds: folds ?? 5, chosen: r.chosen,
    };
  }
  throw new RangeError(`setup must be one of ${SETUPS.join(', ')}`);
}

export function actualPerformance({ data, model = 'knn', grid, seed = 1 }) {
  const train = shiftXY(data.train), test = shiftXY(data.test);
  let config = {};
  let chosen;
  if (grid) {
    const folds = kFold(train.X.length, 5, seed);
    chosen = gridSearch(grid, c => crossValidate({
      X: train.X, y: train.y, fitPredict: modelFitPredict(model, c), folds,
    }).mean).best.config;
    config = chosen;
  }
  const pred = modelFitPredict(model, config)(train.X, train.y, test.X);
  const score = accuracy(test.y, pred);
  return grid ? { accuracy: score, chosen } : score;
}

export function compareSetups({ data, model = 'knn', seed = 1, setups = SETUPS, grid, tolerance = 0.05 }) {
  const actual = actualPerformance({ data, model, seed });
  const tuned = setups.includes('nested') ? actualPerformance({ data, model, seed, grid: grid ?? defaultGrid(model) }) : null;
  const rows = setups.map(setup => {
    const est = estimatePerformance({ data, setup, model, seed, grid });
    const target = setup === 'nested' ? tuned.accuracy : actual;
    const gap = est.estimate - target;
    return { setup, estimate: est.estimate, sd: est.sd, gap, anticipated: Math.abs(gap) <= tolerance };
  });
  return { actual, actualTuned: tuned ? tuned.accuracy : null, rows };
}

// ---- Shift detectors -------------------------------------------------------------------------

function quantileEdges(a, bins) {
  const s = a.slice().sort((x, y) => x - y);
  const edges = [];
  for (let i = 1; i < bins; i++) {
    const pos = (i * (s.length - 1)) / bins, lo = Math.floor(pos);
    edges.push(s[lo] + (pos - lo) * ((s[Math.min(lo + 1, s.length - 1)]) - s[lo]));
  }
  return [...new Set(edges)];   // repeated quantiles (ties) would make empty bins
}

const binOf = (v, edges) => {
  let b = 0;
  while (b < edges.length && v >= edges[b]) b++;
  return b;
};

function histogram(values, edges) {
  const counts = new Array(edges.length + 1).fill(0);
  for (const v of values) counts[binOf(v, edges)]++;
  return counts;
}

export function psiFromCounts(expected, actual) {
  if (expected.length !== actual.length) throw new RangeError('the two histograms need the same number of bins');
  const sumE = expected.reduce((s, v) => s + v, 0), sumA = actual.reduce((s, v) => s + v, 0);
  if (!sumE || !sumA) throw new RangeError('a histogram has no rows');
  let total = 0;
  expected.forEach((e, i) => {
    const p = Math.max(e / sumE, PSI_FLOOR), q = Math.max(actual[i] / sumA, PSI_FLOOR);
    total += (q - p) * Math.log(q / p);
  });
  return total;
}

export function psiTable(a, b, bins = 10) {
  if (!a.length || !b.length) throw new RangeError('psi needs values in both samples');
  const edges = Array.isArray(bins) ? bins.slice().sort((x, y) => x - y) : quantileEdges(a, bins);
  const expected = histogram(a, edges), actual = histogram(b, edges);
  const sumE = a.length, sumA = b.length;
  const rows = expected.map((e, i) => {
    const p = Math.max(e / sumE, PSI_FLOOR), q = Math.max(actual[i] / sumA, PSI_FLOOR);
    return {
      lo: i === 0 ? null : edges[i - 1], hi: i === edges.length ? null : edges[i],
      expected: e, actual: actual[i], p, q, contribution: (q - p) * Math.log(q / p),
    };
  });
  return { psi: rows.reduce((s, r) => s + r.contribution, 0), rows };
}

export const psi = (a, b, bins = 10) => psiTable(a, b, bins).psi;

export function psiVerdict(value) {
  return value < 0.1 ? 'stable' : value < 0.25 ? 'moderate' : 'large';
}

export function ksStat(a, b) {
  if (!a.length || !b.length) throw new RangeError('ksStat needs values in both samples');
  const sa = a.slice().sort((x, y) => x - y), sb = b.slice().sort((x, y) => x - y);
  let i = 0, j = 0, d = 0;
  while (i < sa.length || j < sb.length) {
    const v = Math.min(i < sa.length ? sa[i] : Infinity, j < sb.length ? sb[j] : Infinity);
    while (i < sa.length && sa[i] === v) i++;
    while (j < sb.length && sb[j] === v) j++;
    d = Math.max(d, Math.abs(i / sa.length - j / sb.length));
  }
  return d;
}

export function domainClassifierAuc(trainX, testX, seed = 1) {
  if (!trainX.length || !testX.length) throw new RangeError('domainClassifierAuc needs rows in both sets');
  const X = [...trainX, ...testX];
  const y = [...trainX.map(() => 0), ...testX.map(() => 1)];
  const out = new Array(X.length).fill(0.5);
  for (const { train, test } of stratifiedKFold(y, 5, seed)) {
    const model = fitLogistic(train.map(i => X[i]), train.map(i => y[i]), { iters: 300 });
    predictProba(model, test.map(i => X[i])).forEach((p, k) => { out[test[k]] = p; });
  }
  return auc(out, y);
}
