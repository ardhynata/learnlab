// Reliability and responsible-ML helpers for the "Reliability and responsible ML" module.
// Pure functions on generated data: seeded, deterministic, tested in reliability.test.js.
//
// Conventions. A "dataset" is the object makeApplicants returns:
//   { rows, X, y, yTrue, group, groups, features, seed }
//     X[i]      the model's input row [skill, experience, postcode]; a missing cell is NaN
//     y[i]      the OBSERVED 0/1 outcome (1 = positive: "repaid", "hired"); what every metric is scored against
//     yTrue[i]  the outcome before label noise (what a perfect record would say)
//     group[i]  the subgroup name of row i (NEVER part of X)
//     groups    the group names in a fixed order; features the column names of X
// A "model" is anything groupReport can score: a plain object from fitApplicantModel, or any object with a
// proba(data) -> probabilities method (tests and labs use this to plug in a stub). A case is flagged
// positive when its score >= threshold (the same rule as sims/ml/metrics.js and calibration.js).
//
// API
//   Data
//     makeApplicants({ n = 600, seed = 1, groups, groupShift = {}, labelNoiseByGroup = {},
//                      missingByGroup = {}, proxyStrength = 1.5 })        -> dataset
//       Default groups A (50%, base rate 0.55, clean features), B (30%, 0.40, noisier) and C (20%, 0.30,
//       noisiest). `groups` is an array of names (default profiles are matched by name) or of
//       { name, share, baseRate, noise } objects. Group sizes are exact (largest-remainder rounding of the
//       shares) and rows are shuffled. Features: skill and experience carry the outcome (class gap 2 and
//       1.6, spread = the group's `noise`), postcode is a PROXY: its mean moves with the group index
//       (strength `proxyStrength`) and it carries no signal of its own, yet it predicts the outcome
//       through the groups' different base rates. The group is never a column of X.
//       groupShift: { [group]: { baseRateDelta = 0, noiseScale = 1, featureShift = 0 } } moves one group's
//       population (base rate, feature spread, skill and experience mean). labelNoiseByGroup: { [group]: p }
//       flips the observed label with chance p. missingByGroup: { [group]: p } blanks each skill and
//       experience cell with chance p. The same number of random draws is made whatever the options, so
//       two calls with the same seed differ only through the options (a clean before/after comparison).
//     FEATURES, DEFAULT_GROUPS, PERTURBATIONS     the column names, the default profiles, the five kinds below
//     fitApplicantModel(data, { useGroup = false, drop = [], lr = 0.3, iters = 400, l2 = 0, threshold = 0.5 })
//                                  -> { kind, columns, featureNames, means, useGroup, groups, logistic,
//                                       coefficients, threshold }
//       Logistic regression (sims/ml/logistic.js) on the kept feature columns; missing cells are filled with
//       the training column mean (stored on the model). `drop` takes names or indices (drop the proxy with
//       drop: ['postcode']). useGroup:true adds one-hot group columns (off by default: the model is not
//       given the group).
//     applicantProba(model, data) -> probability of class 1 per row (reads data.X, and data.group when
//       model.useGroup)
//     proxyAudit(data)             -> [{ feature, etaSquared }] share of each feature's variance explained by
//       the group (0 to 1; NaN cells ignored), largest first. A feature near 1 can stand in for the group.
//
//   Robustness
//     perturb(X, { kind, strength = 0.5, seed = 1, columns })            -> new rows, X untouched
//       kind "noise":      adds gaussian noise of sd strength * (column sd) to every cell
//            "missing":    blanks each cell (NaN) with chance strength; a model fills it with a training mean
//            "outlier":    replaces each cell with chance strength by (column mean +- 8 column sd)
//            "unitChange": multiplies the columns (default [0], the first) by 10^strength: a unit mix-up
//            "shift":      adds strength * (column sd) to every cell (a population drift)
//       strength 0 returns an unchanged copy. NaN cells stay NaN. Deterministic for a seed.
//     robustnessReport(model, data, { kind, strength, seed, threshold })
//                                  -> { kind, strength, before, after, accuracyDrop: { overall, byGroup },
//                                       flipRate: { overall, byGroup }, worstGroup }
//       before/after are groupReport results; drop = before - after (negative = it helped); flipRate = share
//       of cases whose flagged / not-flagged decision changed; worstGroup = the group with the largest drop.
//       Which group suffers most depends on the damage. Noise, missing cells and outliers destroy information,
//       and the CLEAN group has the most to lose, so its accuracy drops most in absolute terms (the noisy
//       group was near its majority-class floor already). A unit mix-up on skill hurts the NOISIEST group most.
//     robustnessSweep(model, data, { kind, strengths, seed, threshold })
//                                  -> [{ strength, accuracy, byGroup }]
//
//   Subgroup metrics (reuse metrics.js confusion counts and calibration.js expectedCalibrationError)
//     groupReport(model, data, threshold = model.threshold ?? 0.5, { bins = 10 })
//                                  -> { threshold, overall, groups, byGroup, gaps }
//       threshold may be a number or { [group]: t } (a missing group uses the default 0.5 or model.threshold).
//       overall and each groups[i] hold { group, size, positives, baseRate, tp, fp, tn, fn, accuracy, tpr, fpr,
//       precision, selectionRate, calibrationError, threshold }. A ratio with an empty denominator (no
//       positives, nothing selected) is null, never a misleading 0. gaps (max minus min over the groups that
//       have a value; null when fewer than two do): equalOpportunity (TPR), demographicParity (selection
//       rate), fpr, accuracy.
//     scoredGroupReport(scores, labels, groups, threshold, opts)   the same report from raw arrays
//
//   Per-group thresholds
//     groupThresholds(model, data, { goal = "equalOpportunity", threshold = 0.5 })
//                                  -> { goal, target, thresholds }
//       goal "equalOpportunity": each group gets the cut whose TPR is closest to the overall TPR at the base
//       threshold; goal "demographicParity": closest selection rate to the overall one. Candidates are the
//       group's distinct scores and Infinity; ties go to the cut nearest the base threshold.
//     groupThresholdTrade(model, data, { goal, threshold, evalData = data })
//                                  -> { goal, thresholds, before, after, accuracyCost, gapChange }
//       Tunes the cuts on `data`, reports both group reports on evalData. accuracyCost = overall accuracy
//       before minus after (positive = it costs accuracy); gapChange = after minus before for each gap.
//
//   Fairness under shift
//     fairnessUnderShift(model, { n = 1200, seed = 101, groups, groupShift, labelNoiseByGroup,
//                                 missingByGroup, proxyStrength, threshold })
//                                  -> { baseline, shifted, gapChange }
//       Builds one test set without and one with groupShift (same seed), scores both with the SAME model and
//       returns the two group reports and shifted gap minus baseline gap.
//
//   Human review
//     reviewBand({ scores, labels, low, high })
//                                  -> { n, low, high, automated, reviewed, coverage, workload,
//                                       accuracyAutomated, accuracyWithReviewer, accuracyNoReview }
//       A case with low <= score <= high goes to a person; below low is decided "no" and above high "yes"
//       by the machine. low > high is an empty band (nothing is reviewed).
//       coverage = automated share; workload = reviewed share (reviewed is the count);
//       accuracyAutomated = accuracy on the automated part (null when nothing is automated);
//       accuracyWithReviewer = overall accuracy if the reviewer is always right; accuracyNoReview = overall
//       accuracy of the plain 0.5 cut with no reviewer.
//     bandForShare(scores, share, center = 0.5) -> { low, high } the band holding the `share` of cases
//       nearest the center (ties may add a few more)
//     reviewCurve({ scores, labels, shares }) -> [{ share, low, high, coverage, workload, accuracyAutomated,
//       accuracyWithReviewer }] one band per reviewer capacity
//
//   Privacy
//     kAnonymityReport(rows, quasiIdentifiers, k = 5)
//                                  -> { n, k, minGroupSize, groupCount, rowsBelowK, shareBelowK, groups }
//       Rows sharing the same values of the quasi-identifier fields form a group; minGroupSize is the data's
//       own k. groups = [{ key, size }] smallest first. shareBelowK is the share of ROWS in groups smaller
//       than k.
//     generalise(rows, field, binSize) -> new rows with one field coarsened: a number becomes a bin label
//       ("30-39" for integers, "0.5..<1" otherwise), a string keeps its first binSize characters plus "*"
//       ("10115" -> "101**" for binSize 3). Other fields are untouched.
//     addLaplaceNoise(value, epsilon, sensitivity = 1, seed = 1)
//                                  -> value + Laplace(0, sensitivity / epsilon) noise; smaller epsilon = more
//                                     privacy = more noise. One seeded draw; same arguments, same answer.
//     noisyRateCurve({ successes, total, epsilons, trials = 400, seed = 1 })
//                                  -> [{ epsilon, scale, meanAbsError, meanNoisyRate }]
//       Releases `successes` (sensitivity 1) with Laplace noise `trials` times and reports the mean absolute
//       error of the released RATE successes / total: the accuracy-versus-privacy trade-off.
//
//   Documentation
//     MODEL_CARD_SECTIONS          the sections in order: [{ key, title }]
//     modelCard(fields)            -> plain text. Fields are filled by key (see MODEL_CARD_SECTIONS); a string,
//       an array (bullets), an object (key: value lines) or a groupReport result (a table) all render; a
//       section left empty prints "(not filled in)" and is named in a closing "Missing:" line.
//     modelCardMissing(fields)     -> keys of the sections with no content
import { rng, gauss, shuffle } from './rng.js';
import { fitLogistic, predictProba } from './logistic.js';
import { confusion } from './metrics.js';
import { expectedCalibrationError } from './calibration.js';

export const FEATURES = ['skill', 'experience', 'postcode'];
export const PERTURBATIONS = ['noise', 'missing', 'outlier', 'unitChange', 'shift'];
export const DEFAULT_GROUPS = [
  { name: 'A', share: 0.5, baseRate: 0.55, noise: 0.8 },
  { name: 'B', share: 0.3, baseRate: 0.4, noise: 1.2 },
  { name: 'C', share: 0.2, baseRate: 0.3, noise: 1.8 },
];

const SKILL_GAP = 1; // class means sit at +-SKILL_GAP on skill, +-EXP_GAP on experience
const EXP_GAP = 0.8;
const PROXY_NOISE = 0.7;
const MISSING_COLUMNS = 2; // only skill and experience can go missing

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// ---- data ------------------------------------------------------------------------------------

function resolveGroups(groups) {
  if (groups === undefined) return DEFAULT_GROUPS.map(g => ({ ...g }));
  if (!Array.isArray(groups) || groups.length < 2) throw new RangeError('groups must be an array of at least 2 groups');
  const out = groups.map((g, i) => {
    const base = DEFAULT_GROUPS.find(d => d.name === (typeof g === 'string' ? g : g.name)) || DEFAULT_GROUPS[i % DEFAULT_GROUPS.length];
    const spec = typeof g === 'string' ? { ...base, name: g } : { ...base, ...g };
    if (!(spec.share > 0) || !(spec.noise > 0) || !(spec.baseRate > 0 && spec.baseRate < 1)) {
      throw new RangeError(`group ${spec.name}: share and noise must be positive and baseRate in (0, 1)`);
    }
    return spec;
  });
  if (new Set(out.map(g => g.name)).size !== out.length) throw new RangeError('group names must be distinct');
  return out;
}

// Exact group sizes that add up to n (largest-remainder rounding).
function groupSizes(specs, n) {
  const total = specs.reduce((a, g) => a + g.share, 0);
  const raw = specs.map(g => (g.share / total) * n);
  const sizes = raw.map(Math.floor);
  let left = n - sizes.reduce((a, b) => a + b, 0);
  raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac || a.i - b.i)
    .forEach(({ i }) => { if (left > 0) { sizes[i]++; left--; } });
  return sizes;
}

export function makeApplicants({
  n = 600, seed = 1, groups, groupShift = {}, labelNoiseByGroup = {}, missingByGroup = {}, proxyStrength = 1.5,
} = {}) {
  if (!Number.isInteger(n) || n < 1) throw new RangeError('n must be a positive integer');
  const specs = resolveGroups(groups);
  if (n < specs.length) throw new RangeError(`n = ${n} is fewer than the ${specs.length} groups`);
  for (const [name, map] of [['groupShift', groupShift], ['labelNoiseByGroup', labelNoiseByGroup], ['missingByGroup', missingByGroup]]) {
    for (const g of Object.keys(map || {})) if (!specs.some(s => s.name === g)) throw new RangeError(`${name}: unknown group ${g}`);
  }
  for (const [name, map] of [['labelNoiseByGroup', labelNoiseByGroup], ['missingByGroup', missingByGroup]]) {
    for (const p of Object.values(map || {})) if (!(p >= 0 && p <= 1)) throw new RangeError(`${name}: probabilities must be in [0, 1]`);
  }
  const random = rng(seed * 7919 + 13);
  const sizes = groupSizes(specs, n);
  const mid = (specs.length - 1) / 2;
  const rows = [];
  specs.forEach((g, gi) => {
    const sh = { baseRateDelta: 0, noiseScale: 1, featureShift: 0, ...(groupShift[g.name] || {}) };
    const baseRate = clamp(g.baseRate + sh.baseRateDelta, 0.02, 0.98);
    const noise = g.noise * sh.noiseScale;
    const flip = (labelNoiseByGroup || {})[g.name] || 0, miss = (missingByGroup || {})[g.name] || 0;
    for (let k = 0; k < sizes[gi]; k++) {
      // Fixed draw order and count per row, whatever the options.
      const uy = random(), g1 = gauss(random), g2 = gauss(random), g3 = gauss(random), uf = random();
      const um = [random(), random()];
      const label = uy < baseRate ? 1 : 0;
      const s = label ? 1 : -1;
      const features = [
        s * SKILL_GAP + sh.featureShift + noise * g1,
        s * EXP_GAP + sh.featureShift + noise * g2,
        proxyStrength * (gi - mid) + PROXY_NOISE * g3,
      ];
      const missing = features.map((_, j) => j < MISSING_COLUMNS && um[j] < miss);
      missing.forEach((m, j) => { if (m) features[j] = NaN; });
      rows.push({ group: g.name, features, missing, yTrue: label, label: uf < flip ? 1 - label : label });
    }
  });
  const shuffled = shuffle(rows, random).map((r, i) => ({ id: i, ...r }));
  return {
    rows: shuffled,
    X: shuffled.map(r => r.features),
    y: shuffled.map(r => r.label),
    yTrue: shuffled.map(r => r.yTrue),
    group: shuffled.map(r => r.group),
    groups: specs.map(g => g.name),
    features: FEATURES.slice(),
    seed,
  };
}

// ---- model -----------------------------------------------------------------------------------

function columnIndex(drop) {
  return (drop || []).map(d => {
    const j = typeof d === 'string' ? FEATURES.indexOf(d) : d;
    if (!Number.isInteger(j) || j < 0 || j >= FEATURES.length) throw new RangeError(`drop: unknown feature ${d}`);
    return j;
  });
}

function nanMean(X, j) {
  let s = 0, c = 0;
  for (const r of X) if (!Number.isNaN(r[j])) { s += r[j]; c++; }
  return c ? s / c : 0;
}

function design(model, X, group) {
  return X.map((r, i) => {
    const row = model.columns.map((j, c) => (Number.isNaN(r[j]) ? model.means[c] : r[j]));
    if (model.useGroup) for (const g of model.groups) row.push(group[i] === g ? 1 : 0);
    return row;
  });
}

export function fitApplicantModel(data, { useGroup = false, drop = [], lr = 0.3, iters = 400, l2 = 0, threshold = 0.5 } = {}) {
  const dropped = new Set(columnIndex(drop));
  const columns = FEATURES.map((_, j) => j).filter(j => !dropped.has(j));
  if (!columns.length && !useGroup) throw new RangeError('fitApplicantModel: nothing left to fit on');
  const model = {
    kind: 'applicant-logistic', columns, featureNames: columns.map(j => FEATURES[j]),
    means: columns.map(j => nanMean(data.X, j)), useGroup, groups: data.groups.slice(), threshold,
  };
  model.logistic = fitLogistic(design(model, data.X, data.group), data.y, { lr, iters, l2 });
  const names = model.featureNames.concat(useGroup ? model.groups.map(g => `group ${g}`) : []);
  model.coefficients = Object.fromEntries(names.map((nm, i) => [nm, model.logistic.weights[i]]));
  return model;
}

export function applicantProba(model, data) {
  return predictProba(model.logistic, design(model, data.X, data.group));
}

function modelProba(model, data) {
  if (typeof model.proba === 'function') return model.proba(data);
  if (model.kind === 'applicant-logistic') return applicantProba(model, data);
  throw new TypeError('model needs a proba(data) method or to come from fitApplicantModel');
}

export function proxyAudit(data) {
  return data.features.map((feature, j) => {
    const vals = data.X.map((r, i) => ({ v: r[j], g: data.group[i] })).filter(o => !Number.isNaN(o.v));
    const m = mean(vals.map(o => o.v));
    const by = new Map();
    for (const o of vals) { const e = by.get(o.g) || { s: 0, c: 0 }; e.s += o.v; e.c++; by.set(o.g, e); }
    let between = 0, total = 0;
    for (const e of by.values()) between += e.c * (e.s / e.c - m) ** 2;
    for (const o of vals) total += (o.v - m) ** 2;
    return { feature, etaSquared: total ? between / total : 0 };
  }).sort((a, b) => b.etaSquared - a.etaSquared);
}

// ---- perturbations ---------------------------------------------------------------------------

function columnSd(X, j) {
  const m = nanMean(X, j);
  let s = 0, c = 0;
  for (const r of X) if (!Number.isNaN(r[j])) { s += (r[j] - m) ** 2; c++; }
  return c ? Math.sqrt(s / c) : 0;
}

export function perturb(X, { kind, strength = 0.5, seed = 1, columns } = {}) {
  if (!PERTURBATIONS.includes(kind)) throw new RangeError(`perturb: kind must be one of ${PERTURBATIONS.join(', ')}`);
  if (!Number.isFinite(strength) || ((kind === 'noise' || kind === 'missing' || kind === 'outlier') && strength < 0)) {
    throw new RangeError('perturb: strength must be a finite number (not negative for noise, missing, outlier)');
  }
  if ((kind === 'missing' || kind === 'outlier') && strength > 1) throw new RangeError(`perturb: ${kind} strength is a share in [0, 1]`);
  if (!Array.isArray(X) || X.length === 0) return [];
  const width = X[0].length;
  const cols = new Set(columns || (kind === 'unitChange' ? [0] : Array.from({ length: width }, (_, j) => j)));
  const mu = Array.from({ length: width }, (_, j) => nanMean(X, j));
  const sd = Array.from({ length: width }, (_, j) => columnSd(X, j));
  const random = rng(seed * 104729 + 7);
  return X.map(r => r.map((v, j) => {
    // Draw for every cell so the stream does not depend on which columns are touched.
    let draw;
    if (kind === 'noise') draw = gauss(random);
    else if (kind === 'missing') draw = random();
    else if (kind === 'outlier') draw = [random(), random()];
    if (!cols.has(j) || Number.isNaN(v)) return v;
    switch (kind) {
      case 'noise': return v + strength * sd[j] * draw;
      case 'missing': return draw < strength ? NaN : v;
      case 'outlier': return draw[0] < strength ? mu[j] + (draw[1] < 0.5 ? -8 : 8) * sd[j] : v;
      case 'unitChange': return v * 10 ** strength;
      default: return v + strength * sd[j]; // shift
    }
  }));
}

export function robustnessReport(model, data, { kind, strength = 0.5, seed = 1, threshold } = {}) {
  const before = groupReport(model, data, threshold);
  const perturbed = { ...data, X: perturb(data.X, { kind, strength, seed }) };
  const after = groupReport(model, perturbed, threshold);
  const byGroup = {};
  for (const g of before.groups) byGroup[g.group] = g.accuracy - after.byGroup[g.group].accuracy;
  const worst = Object.keys(byGroup).reduce((a, b) => (byGroup[b] > byGroup[a] ? b : a));
  // Prediction instability: the share of cases whose flagged/not-flagged decision changed.
  const s0 = modelProba(model, data), s1 = modelProba(model, perturbed);
  const cut = i => (typeof before.threshold === 'number' ? before.threshold : before.threshold[data.group[i]]);
  const flips = {}, counts = {};
  let flipped = 0;
  s0.forEach((v, i) => {
    const g = data.group[i], f = (v >= cut(i)) !== (s1[i] >= cut(i)) ? 1 : 0;
    flips[g] = (flips[g] || 0) + f; counts[g] = (counts[g] || 0) + 1; flipped += f;
  });
  const flipByGroup = Object.fromEntries(Object.keys(counts).map(g => [g, flips[g] / counts[g]]));
  return {
    kind, strength, before, after, accuracyDrop: { overall: before.overall.accuracy - after.overall.accuracy, byGroup },
    flipRate: { overall: flipped / s0.length, byGroup: flipByGroup }, worstGroup: worst,
  };
}

export function robustnessSweep(model, data, { kind, strengths = [0, 0.25, 0.5, 1], seed = 1, threshold } = {}) {
  return strengths.map(strength => {
    const r = groupReport(model, { ...data, X: perturb(data.X, { kind, strength, seed }) }, threshold);
    return { strength, accuracy: r.overall.accuracy, byGroup: Object.fromEntries(r.groups.map(g => [g.group, g.accuracy])) };
  });
}

// ---- subgroup metrics ------------------------------------------------------------------------

const ratio = (a, b) => (b ? a / b : null);

function metricsFor(label, scores, labels, threshold, bins) {
  const c = confusion(labels, scores.map(s => s >= threshold));
  const size = scores.length;
  const positives = c.tp + c.fn;
  return {
    group: label, size, positives, baseRate: ratio(positives, size), ...c,
    accuracy: ratio(c.tp + c.tn, size), tpr: ratio(c.tp, c.tp + c.fn), fpr: ratio(c.fp, c.fp + c.tn),
    precision: ratio(c.tp, c.tp + c.fp), selectionRate: ratio(c.tp + c.fp, size),
    calibrationError: size ? expectedCalibrationError(scores, labels, bins) : null, threshold,
  };
}

function spread(rows, key) {
  const v = rows.map(r => r[key]).filter(x => x !== null);
  return v.length >= 2 ? Math.max(...v) - Math.min(...v) : null;
}

export function scoredGroupReport(scores, labels, groups, threshold = 0.5, { bins = 10 } = {}) {
  if (scores.length !== labels.length || scores.length !== groups.length) throw new RangeError('scores, labels and groups must have the same length');
  const names = [...new Set(groups)];
  const cut = g => (typeof threshold === 'number' ? threshold : (threshold && threshold[g] !== undefined ? threshold[g] : 0.5));
  const yy = labels.map(Number);
  const per = names.map(g => {
    const idx = groups.map((x, i) => (x === g ? i : -1)).filter(i => i >= 0);
    return metricsFor(g, idx.map(i => scores[i]), idx.map(i => yy[i]), cut(g), bins);
  });
  // Overall accuracy etc. use each row's own group cut.
  const flagged = scores.map((s, i) => s >= cut(groups[i]));
  const c = confusion(yy, flagged);
  const size = scores.length, positives = c.tp + c.fn;
  const overall = {
    group: 'all', size, positives, baseRate: ratio(positives, size), ...c,
    accuracy: ratio(c.tp + c.tn, size), tpr: ratio(c.tp, c.tp + c.fn), fpr: ratio(c.fp, c.fp + c.tn),
    precision: ratio(c.tp, c.tp + c.fp), selectionRate: ratio(c.tp + c.fp, size),
    calibrationError: size ? expectedCalibrationError(scores, yy, bins) : null,
    threshold: typeof threshold === 'number' ? threshold : null,
  };
  return {
    threshold, overall, groups: per, byGroup: Object.fromEntries(per.map(g => [g.group, g])),
    gaps: {
      equalOpportunity: spread(per, 'tpr'), demographicParity: spread(per, 'selectionRate'),
      fpr: spread(per, 'fpr'), accuracy: spread(per, 'accuracy'),
    },
  };
}

export function groupReport(model, data, threshold, opts = {}) {
  const dflt = model.threshold ?? 0.5;
  let t = threshold === undefined ? dflt : threshold;
  if (typeof t === 'object' && t !== null) t = Object.fromEntries([...new Set(data.group)].map(g => [g, t[g] !== undefined ? t[g] : dflt]));
  const scores = modelProba(model, data);
  const labels = data.y;
  const groups = data.group;
  const report = scoredGroupReport(scores, labels, groups, t, opts);
  // Keep the dataset's group order, not first-appearance order.
  if (data.groups) {
    const order = data.groups.filter(g => report.byGroup[g]);
    report.groups = order.map(g => report.byGroup[g]);
  }
  return report;
}

// ---- per-group thresholds --------------------------------------------------------------------

export function groupThresholds(model, data, { goal = 'equalOpportunity', threshold = 0.5 } = {}) {
  if (goal !== 'equalOpportunity' && goal !== 'demographicParity') throw new RangeError('goal must be "equalOpportunity" or "demographicParity"');
  const scores = modelProba(model, data);
  const key = goal === 'equalOpportunity' ? 'tpr' : 'selectionRate';
  const target = scoredGroupReport(scores, data.y, data.group, threshold).overall[key];
  const thresholds = {};
  for (const g of data.groups || [...new Set(data.group)]) {
    const idx = data.group.map((x, i) => (x === g ? i : -1)).filter(i => i >= 0);
    const s = idx.map(i => scores[i]), l = idx.map(i => data.y[i]);
    const candidates = [...new Set(s)].concat(Infinity);
    let best = null;
    for (const t of candidates) {
      const rate = metricsFor(g, s, l, t, 10)[key];
      if (rate === null || target === null) continue;
      const err = Math.abs(rate - target), dist = Math.abs(t - threshold);
      if (!best || err < best.err - 1e-12 || (Math.abs(err - best.err) <= 1e-12 && dist < best.dist)) best = { t, err, dist };
    }
    thresholds[g] = best ? best.t : threshold;
  }
  return { goal, target, thresholds };
}

export function groupThresholdTrade(model, data, { goal = 'equalOpportunity', threshold = 0.5, evalData = data } = {}) {
  const tuned = groupThresholds(model, data, { goal, threshold });
  const before = groupReport(model, evalData, threshold);
  const after = groupReport(model, evalData, tuned.thresholds);
  const gapChange = {};
  for (const k of Object.keys(before.gaps)) gapChange[k] = before.gaps[k] === null || after.gaps[k] === null ? null : after.gaps[k] - before.gaps[k];
  return { goal, thresholds: tuned.thresholds, target: tuned.target, before, after, accuracyCost: before.overall.accuracy - after.overall.accuracy, gapChange };
}

// ---- fairness under shift --------------------------------------------------------------------

export function fairnessUnderShift(model, {
  n = 1200, seed = 101, groups, groupShift = {}, labelNoiseByGroup = {}, missingByGroup = {}, proxyStrength, threshold,
} = {}) {
  const base = { n, seed, groups, labelNoiseByGroup, missingByGroup, ...(proxyStrength === undefined ? {} : { proxyStrength }) };
  const baseline = groupReport(model, makeApplicants(base), threshold);
  const shifted = groupReport(model, makeApplicants({ ...base, groupShift }), threshold);
  const gapChange = {};
  for (const k of Object.keys(baseline.gaps)) gapChange[k] = baseline.gaps[k] === null || shifted.gaps[k] === null ? null : shifted.gaps[k] - baseline.gaps[k];
  return { baseline, shifted, gapChange };
}

// ---- human review ----------------------------------------------------------------------------

export function reviewBand({ scores, labels, low, high } = {}) {
  if (!Array.isArray(scores) || !Array.isArray(labels) || scores.length !== labels.length || scores.length === 0) {
    throw new RangeError('reviewBand: scores and labels must be equal-length, non-empty arrays');
  }
  if (typeof low !== 'number' || typeof high !== 'number' || Number.isNaN(low) || Number.isNaN(high)) throw new RangeError('reviewBand: low and high must be numbers');
  const n = scores.length;
  let automated = 0, correctAuto = 0, correctPlain = 0;
  scores.forEach((s, i) => {
    const y = Number(labels[i]);
    if ((s >= 0.5 ? 1 : 0) === y) correctPlain++;
    if (s >= low && s <= high) return;
    automated++;
    if ((s > high ? 1 : 0) === y) correctAuto++;
  });
  const reviewed = n - automated;
  return {
    n, low, high, automated, reviewed, coverage: automated / n, workload: reviewed / n,
    accuracyAutomated: automated ? correctAuto / automated : null,
    accuracyWithReviewer: (correctAuto + reviewed) / n,
    accuracyNoReview: correctPlain / n,
  };
}

export function bandForShare(scores, share, center = 0.5) {
  if (!(share >= 0 && share <= 1)) throw new RangeError('bandForShare: share must be in [0, 1]');
  const k = Math.floor(share * scores.length);
  if (k === 0) return { low: center, high: center - 1e-9 }; // an empty band (low > high): nothing reaches a reviewer
  const dist = scores.map(s => Math.abs(s - center)).sort((a, b) => a - b);
  const cutoff = dist[k - 1];
  const inside = scores.filter(s => Math.abs(s - center) <= cutoff);
  return { low: Math.min(...inside), high: Math.max(...inside) };
}

export function reviewCurve({ scores, labels, shares = [0, 0.1, 0.2, 0.3, 0.5] } = {}) {
  return shares.map(share => {
    const { low, high } = bandForShare(scores, share);
    const r = reviewBand({ scores, labels, low, high });
    return { share, low, high, coverage: r.coverage, workload: r.workload, accuracyAutomated: r.accuracyAutomated, accuracyWithReviewer: r.accuracyWithReviewer };
  });
}

// ---- privacy ---------------------------------------------------------------------------------

export function kAnonymityReport(rows, quasiIdentifiers, k = 5) {
  if (!Array.isArray(rows) || rows.length === 0) throw new RangeError('kAnonymityReport: need at least one row');
  if (!Array.isArray(quasiIdentifiers) || quasiIdentifiers.length === 0) throw new RangeError('kAnonymityReport: name at least one quasi-identifier');
  const counts = new Map();
  for (const r of rows) {
    const key = quasiIdentifiers.map(f => String(r[f])).join(' | ');
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const groups = [...counts].map(([key, size]) => ({ key, size })).sort((a, b) => a.size - b.size || (a.key < b.key ? -1 : 1));
  const rowsBelowK = groups.filter(g => g.size < k).reduce((a, g) => a + g.size, 0);
  return { n: rows.length, k, minGroupSize: groups[0].size, groupCount: groups.length, rowsBelowK, shareBelowK: rowsBelowK / rows.length, groups };
}

function binLabel(v, binSize) {
  const lo = Math.floor(v / binSize) * binSize;
  if (Number.isInteger(v) && Number.isInteger(binSize)) return `${lo}-${lo + binSize - 1}`;
  return `${+lo.toFixed(10)}..<${+(lo + binSize).toFixed(10)}`;
}

export function generalise(rows, field, binSize) {
  if (!(binSize > 0)) throw new RangeError('generalise: binSize must be positive');
  return rows.map(r => {
    const v = r[field];
    if (typeof v === 'number') return { ...r, [field]: binLabel(v, binSize) };
    if (typeof v === 'string') {
      if (!Number.isInteger(binSize)) throw new RangeError('generalise: for a string field binSize is a whole number of characters');
      return { ...r, [field]: v.slice(0, binSize) + (v.length > binSize ? '*' : '') };
    }
    return { ...r };
  });
}

function laplaceUnit(seed) {
  let h = Math.imul((seed | 0) ^ 0x9e3779b9, 2654435761) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  const random = rng(h);
  random(); random();
  const v = random() - 0.5; // [-0.5, 0.5)
  return -Math.sign(v || 1) * Math.log(Math.max(1e-12, 1 - 2 * Math.abs(v)));
}

export function addLaplaceNoise(value, epsilon, sensitivity = 1, seed = 1) {
  if (!(epsilon > 0) || !Number.isFinite(epsilon)) throw new RangeError('addLaplaceNoise: epsilon must be positive');
  if (!(sensitivity > 0)) throw new RangeError('addLaplaceNoise: sensitivity must be positive');
  return value + (sensitivity / epsilon) * laplaceUnit(seed);
}

export function noisyRateCurve({ successes, total, epsilons = [0.01, 0.05, 0.1, 0.5, 1], trials = 400, seed = 1 } = {}) {
  if (!(total > 0) || !(successes >= 0 && successes <= total)) throw new RangeError('noisyRateCurve: need 0 <= successes <= total and total > 0');
  const rate = successes / total;
  return epsilons.map((epsilon, e) => {
    let abs = 0, sum = 0;
    for (let t = 0; t < trials; t++) {
      const released = addLaplaceNoise(successes, epsilon, 1, seed * 100003 + e * 1009 + t) / total;
      abs += Math.abs(released - rate); sum += released;
    }
    return { epsilon, scale: 1 / epsilon, meanAbsError: abs / trials, meanNoisyRate: sum / trials };
  });
}

// ---- model card ------------------------------------------------------------------------------

export const MODEL_CARD_SECTIONS = [
  { key: 'purpose', title: 'Intended use' },
  { key: 'outOfScope', title: 'Out of scope (do not use for)' },
  { key: 'trainingData', title: 'Training data' },
  { key: 'evaluationData', title: 'Evaluation data' },
  { key: 'metrics', title: 'Overall performance' },
  { key: 'groupMetrics', title: 'Performance by subgroup' },
  { key: 'robustness', title: 'Robustness checks' },
  { key: 'fairness', title: 'Fairness' },
  { key: 'privacy', title: 'Privacy' },
  { key: 'humanReview', title: 'Human review' },
  { key: 'limitations', title: 'Known limitations' },
  { key: 'monitoring', title: 'Monitoring and rollback' },
];

const fmt = v => (v === null || v === undefined ? 'n/a' : typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(3)) : String(v));

function present(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.some(present);
  if (typeof v === 'object') return v.groups ? v.groups.length > 0 : Object.keys(v).length > 0;
  return true;
}

function renderValue(v) {
  if (typeof v === 'string') return [v.trim()];
  if (Array.isArray(v)) return v.filter(present).map(x => `- ${typeof x === 'string' ? x.trim() : fmt(x)}`);
  if (v && Array.isArray(v.groups)) {
    const lines = ['group | size | accuracy | TPR | FPR | selection rate | calibration error'];
    for (const g of v.groups) lines.push([g.group, g.size, fmt(g.accuracy), fmt(g.tpr), fmt(g.fpr), fmt(g.selectionRate), fmt(g.calibrationError)].join(' | '));
    if (v.gaps) lines.push(`gaps: equal opportunity ${fmt(v.gaps.equalOpportunity)}, demographic parity ${fmt(v.gaps.demographicParity)}, FPR ${fmt(v.gaps.fpr)}`);
    return lines;
  }
  if (v && typeof v === 'object') return Object.entries(v).map(([k, x]) => `${k}: ${fmt(x)}`);
  return [fmt(v)];
}

export function modelCardMissing(fields = {}) {
  return MODEL_CARD_SECTIONS.filter(s => !present(fields[s.key])).map(s => s.key);
}

export function modelCard(fields = {}) {
  const lines = [];
  const title = present(fields.name) ? String(fields.name).trim() : '(unnamed model)';
  lines.push(`MODEL CARD: ${title}${present(fields.version) ? ` (version ${String(fields.version).trim()})` : ''}`);
  const meta = [['owner', fields.owner], ['date', fields.date], ['contact', fields.contact]].filter(([, v]) => present(v));
  for (const [k, v] of meta) lines.push(`${k}: ${String(v).trim()}`);
  for (const s of MODEL_CARD_SECTIONS) {
    lines.push('', s.title.toUpperCase(), '-'.repeat(s.title.length));
    lines.push(...(present(fields[s.key]) ? renderValue(fields[s.key]) : ['(not filled in)']));
  }
  const missing = modelCardMissing(fields);
  lines.push('', missing.length ? `Missing: ${missing.join(', ')}` : 'Missing: nothing');
  return lines.join('\n');
}
