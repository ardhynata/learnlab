// Feature ablation lab maths: a candidate-feature table (generated or the penguins), a leak-aware
// evaluator that scores any subset of features two ways (5-fold cross-validation with its fold-to-fold
// spread, and one fixed train/test split), and the verdict words that compare the two. Pure functions,
// seeded and reproducible; tested in ablationlab.test.js. The chart, the tables and the text are in
// labs/ablation-lab.js. Building blocks: ml/featureeng.js (encoders, ablate) and ml/validation.js (folds).
//
// API
//   FEATURE_ORDER_GENERATED          the keys of the generated table, in the order "Add the next feature" uses.
//   makeCandidateData({ rows = 400, categories = 200, seed = 1 })
//       The generated table: { n, y, numeric: { key: number[] }, category: { region: string[] }, order, kinds }.
//       y is 0/1. kinds[key] is 'signal' (x1, x2: real information), 'interaction-part' (u, v: useless alone),
//       'interaction' (u_v = u * v: carries what u and v only carry together), 'noise' (z1..z3: nothing)
//       or 'category' (region: a high-cardinality text column, about three rows per value, with a weak
//       real effect hidden behind it). Every key is in `order`.
//   penguinCandidates(table)         the same shape from the parsed penguins CSV: predicts whether a penguin
//       is male. Features: bill_length, bill_depth, flipper_length, body_mass (raw), bill_ratio
//       (length / depth), flipper_sq (flipper length squared), island (share of penguins on that island: a
//       frequency encoding that uses no label), year (a number that means nothing for sex) and bill_code
//       (bill length as a CATEGORY, every distinct value its own label: the high-cardinality column).
//       Rows missing any of the numbers or the sex (NA) are dropped; { total, dropped } says how many.
//   holdoutSplit(n, testShare = 0.3, seed = 1) -> { train, test }: the one fixed split, index lists.
//   makeEvaluator(table, { encoding = 'outOfFold', k = 5, splitSeed = 1, foldSeed = 1, smoothing = 0 })
//       -> { cv(names), split(names), baseline } where names are feature keys (any order; the evaluator
//       sorts them into table.order so a set always scores the same).
//         cv(names)    -> { mean, sd, scores } over kFold(n, k, foldSeed): accuracy of a logistic model.
//         split(names) -> { score }: accuracy on the single split from holdoutSplit.
//         no names     -> the majority-class guess (the score every feature has to beat).
//       encoding is how a category feature (region, bill_code) becomes a number:
//         'outOfFold'  inside each training fold, a row is encoded from the other folds only and a test row
//                      from the training rows (honest).
//         'naive'      ONCE, with every row's own label counted, before any split (the leak).
//   forwardSteps(order, evaluator, splitEvaluator)   the score after each feature is added, in the order given:
//       [{ feature, features, cv: { mean, sd }, split, cvGain, splitGain, verdict }], plus `baseline`.
//   gainVerdict(cvGain, cvSd, splitGain) -> 'real' | 'worse' | 'splitOnly' | 'flat'
//   ablationRows(names, evaluator) -> { full, rows: [{ feature, without, drop, verdict }] } with verdict
//       'earns' (removing it costs more than the fold spread), 'hurts' (removing it helps by more than the
//       spread) or 'noise'.
//   scoreAxis(values) -> { lo, hi }: a vertical accuracy axis around `values`, edges on multiples of 5 points,
//       at least 10 points tall, inside 0..1.
//   leakCheck(table, names, category, opts) -> { without, outOfFold, naive }: cv scores of the features
//       without the category, with it encoded out of fold and with it encoded naively.
import { kFold, crossValidate, accuracy } from './validation.js';
import { fitLogistic, predict as logisticPredict } from './logistic.js';
import { targetEncode, targetEncodeOutOfFold, frequencyEncode } from './featureeng.js';
import { rng, gauss, shuffle } from './rng.js';

export const FEATURE_ORDER_GENERATED = ['x1', 'z1', 'x2', 'u', 'v', 'u_v', 'z2', 'z3', 'region'];

const FIT = { lr: 0.3, iters: 150 };
const sigmoid = z => 1 / (1 + Math.exp(-z));

export function makeCandidateData({ rows = 400, categories = 200, seed = 1 } = {}) {
  const random = rng(seed);
  const effect = Array.from({ length: categories }, () => gauss(random));
  const numeric = { x1: [], x2: [], u: [], v: [], u_v: [], z1: [], z2: [], z3: [] };
  const region = [];
  const y = [];
  for (let r = 0; r < rows; r++) {
    const x1 = gauss(random), x2 = gauss(random), u = gauss(random), v = gauss(random);
    const c = Math.floor(random() * categories);
    const logit = 1.3 * x1 + 0.7 * x2 + 1.8 * Math.sign(u * v) + 0.5 * effect[c];
    y.push(random() < sigmoid(logit) ? 1 : 0);
    numeric.x1.push(x1); numeric.x2.push(x2); numeric.u.push(u); numeric.v.push(v); numeric.u_v.push(u * v);
    numeric.z1.push(gauss(random)); numeric.z2.push(gauss(random)); numeric.z3.push(gauss(random));
    region.push('r' + String(c + 1).padStart(3, '0'));
  }
  return {
    n: rows, y, numeric, category: { region }, order: FEATURE_ORDER_GENERATED.slice(),
    kinds: { x1: 'signal', x2: 'signal', u: 'interaction-part', v: 'interaction-part', u_v: 'interaction', z1: 'noise', z2: 'noise', z3: 'noise', region: 'category' },
    total: rows, dropped: 0,
  };
}

const isNumber = v => typeof v === 'number' && Number.isFinite(v);
export const PENGUIN_ORDER = ['bill_depth', 'island', 'flipper_length', 'year', 'bill_length', 'bill_ratio', 'flipper_sq', 'body_mass', 'bill_code'];

export function penguinCandidates(table) {
  const need = ['bill_length_mm', 'bill_depth_mm', 'flipper_length_mm', 'body_mass_g', 'year'];
  const rows = table.rows.filter(r => need.every(f => isNumber(r[f])) && typeof r.sex === 'string' && typeof r.island === 'string');
  const islands = rows.map(r => r.island);
  const numeric = {
    bill_length: rows.map(r => r.bill_length_mm),
    bill_depth: rows.map(r => r.bill_depth_mm),
    flipper_length: rows.map(r => r.flipper_length_mm),
    body_mass: rows.map(r => r.body_mass_g),
    bill_ratio: rows.map(r => r.bill_length_mm / r.bill_depth_mm),
    flipper_sq: rows.map(r => r.flipper_length_mm ** 2),
    island: frequencyEncode(islands),
    year: rows.map(r => r.year),
  };
  return {
    n: rows.length, y: rows.map(r => (r.sex === 'male' ? 1 : 0)), numeric,
    category: { bill_code: rows.map(r => 'b' + r.bill_length_mm) },
    order: PENGUIN_ORDER.slice(),
    kinds: { bill_length: 'raw', bill_depth: 'raw', flipper_length: 'raw', body_mass: 'raw', bill_ratio: 'engineered', flipper_sq: 'engineered', island: 'encoded', year: 'noise', bill_code: 'category' },
    total: table.rows.length, dropped: table.rows.length - rows.length,
  };
}

export function holdoutSplit(n, testShare = 0.3, seed = 1) {
  const order = shuffle(Array.from({ length: n }, (_, i) => i), rng(seed));
  const cut = Math.max(1, Math.min(n - 1, Math.round(n * testShare)));
  return { test: order.slice(0, cut).sort((a, b) => a - b), train: order.slice(cut).sort((a, b) => a - b) };
}

function majorityGuess(_trainX, trainY, testX) {
  const counts = new Map();
  for (const l of trainY) counts.set(l, (counts.get(l) || 0) + 1);
  let best = trainY[0];
  for (const [l, c] of counts) if (c > counts.get(best)) best = l;
  return testX.map(() => best);
}

export function makeEvaluator(table, { encoding = 'outOfFold', k = 5, splitSeed = 1, foldSeed = 1, smoothing = 0 } = {}) {
  if (!['outOfFold', 'naive'].includes(encoding)) throw new RangeError(`unknown encoding "${encoding}"`);
  const { n, y } = table;
  // Category columns: naive turns them into numbers now, from every label; out-of-fold keeps the text.
  const columns = { ...table.numeric };
  const textual = new Set();
  for (const [name, values] of Object.entries(table.category)) {
    if (encoding === 'naive') columns[name] = targetEncode(values, y, values, { smoothing });
    else { columns[name] = values; textual.add(name); }
  }
  const folds = kFold(n, k, foldSeed);
  const split = holdoutSplit(n, 0.3, splitSeed);
  const lr = (trainX, trainY, testX) => logisticPredict(fitLogistic(trainX, trainY, FIT), testX);
  const canon = names => table.order.filter(f => names.includes(f));
  const cache = new Map();

  const predictor = names => {
    if (!names.length) return majorityGuess;
    const text = names.map(nm => textual.has(nm));
    if (!text.some(Boolean)) return lr;
    return (trainX, trainY, testX) => {
      let tr = trainX, te = testX;
      names.forEach((_, j) => {
        if (!text[j]) return;
        const cats = trainX.map(r => r[j]);
        const inner = kFold(cats.length, Math.min(k, cats.length), foldSeed);
        const trainEnc = targetEncodeOutOfFold(cats, trainY, inner, { smoothing });
        const testEnc = targetEncode(cats, trainY, testX.map(r => r[j]), { smoothing });
        tr = tr.map((r, i) => r.map((c, jj) => (jj === j ? trainEnc[i] : c)));
        te = te.map((r, i) => r.map((c, jj) => (jj === j ? testEnc[i] : c)));
      });
      return lr(tr, trainY, te);
    };
  };

  const run = (names, which) => {
    const sorted = canon(names);
    const key = `${which}:${sorted.join('|')}`;
    if (cache.has(key)) return cache.get(key);
    const X = Array.from({ length: n }, (_, r) => sorted.map(nm => columns[nm][r]));
    const out = crossValidate({ X, y, fitPredict: predictor(sorted), folds: which === 'cv' ? folds : [split], metric: accuracy });
    const res = which === 'cv' ? { mean: out.mean, sd: out.sd, scores: out.scores } : { score: out.scores[0] };
    cache.set(key, res);
    return res;
  };
  return {
    cv: names => run(names, 'cv'),
    split: names => run(names, 'split'),
    baseline: () => ({ cv: run([], 'cv'), split: run([], 'split') }),
    table, encoding, k, splitIndices: split,
  };
}

// 'real': the cross-validated gain is bigger than the fold-to-fold spread. 'worse': the cross-validated
// score fell by more than the spread. 'splitOnly': inside the noise across folds, but the single split
// showed a gain of a point or more (the kind of improvement that does not survive). Otherwise 'flat'.
export function gainVerdict(cvGain, cvSd, splitGain) {
  if (cvGain > cvSd) return 'real';
  if (cvGain < -cvSd) return 'worse';
  if (splitGain >= 0.01) return 'splitOnly';
  return 'flat';
}

export function forwardSteps(order, evaluator) {
  const base = evaluator.baseline();
  const steps = [];
  let prevCv = base.cv.mean, prevSplit = base.split.score;
  order.forEach((feature, i) => {
    const features = order.slice(0, i + 1);
    const cv = evaluator.cv(features), split = evaluator.split(features).score;
    const cvGain = cv.mean - prevCv, splitGain = split - prevSplit;
    steps.push({ feature, features, cv: { mean: cv.mean, sd: cv.sd }, split, cvGain, splitGain, verdict: gainVerdict(cvGain, cv.sd, splitGain) });
    prevCv = cv.mean; prevSplit = split;
  });
  return { baseline: { cv: { mean: base.cv.mean, sd: base.cv.sd }, split: base.split.score }, steps };
}

export function ablationRows(names, evaluator) {
  const full = evaluator.cv(names);
  const rows = names.map(feature => {
    const without = evaluator.cv(names.filter(f => f !== feature));
    const drop = full.mean - without.mean;
    return { feature, without: { mean: without.mean, sd: without.sd }, drop, verdict: drop > full.sd ? 'earns' : drop < -full.sd ? 'hurts' : 'noise' };
  });
  return { full: { mean: full.mean, sd: full.sd }, rows };
}

export function leakCheck(table, names, category, opts = {}) {
  const without = names.filter(f => f !== category);
  const withCat = [...without, category];
  const oof = makeEvaluator(table, { ...opts, encoding: 'outOfFold' });
  const naive = makeEvaluator(table, { ...opts, encoding: 'naive' });
  const pick = r => ({ mean: r.mean, sd: r.sd });
  return { without: pick(oof.cv(without)), outOfFold: pick(oof.cv(withCat)), naive: pick(naive.cv(withCat)) };
}

export function scoreAxis(values) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return { lo: 0, hi: 1 };
  let lo = Math.max(0, Math.floor((Math.min(...finite) - 0.03) * 20 + 1e-9) / 20);
  let hi = Math.min(1, Math.ceil((Math.max(...finite) + 0.03) * 20 - 1e-9) / 20);
  if (hi - lo < 0.1) { hi = Math.min(1, lo + 0.1); lo = Math.max(0, hi - 0.1); }
  return { lo: Number(lo.toFixed(4)), hi: Number(hi.toFixed(4)) };
}
