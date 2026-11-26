// Pure logic behind the Reliability lab (sims/labs/reliability-lab.js), on top of sims/ml/reliability.js.
// No DOM, no language: the lab draws and words things; this file computes. Tested in reliabilitylab.test.js.
//
// API
//   Data
//     generatedSets(seed, { n = 600, nTest = 900 }) -> { kind: "generated", train, validation, test, groups }
//       Three seeded makeApplicants samples (train, validation, test) with the default groups A, B and C.
//     penguinSets(table, seed) -> { kind: "penguins", train, validation, test, groups, total, kept, dropped, counts }
//       The bundled penguins table (parseCsv output). The task is "is this penguin male?" from bill length,
//       flipper length and body mass (in this column order: a unit change hits the bill length first), the
//       subgroup is the species and the model never sees it. A row with any of those four values or the sex missing
//       (NA) is dropped: `total` rows, `kept` used, `dropped` left out. Rows are split 50/50 (stratified by species
//       and sex) into train and test; `validation` IS the train set (tuning per-group thresholds uses it).
//     fitModel(sets)  -> logistic model on sets.train (fitApplicantModel, the group is NOT a feature)
//   Stress
//     STRESS_KINDS, STRESS_RANGE            the five kinds, and the real amount at slider strength 1
//     stressAmount(kind, strength01)        -> the amount passed to perturb (strength01 is clamped to [0, 1])
//     evaluate(sets, model, { kind, strength, threshold, perGroup, goal, seed })
//                      -> { thresholds, amount, before, after, scoresBefore, scoresAfter, perturbed, drop, worstGroup }
//       before / after are groupReport results on the clean and on the stressed test rows, with the SAME cuts
//       (a number, or one cut per group when perGroup is true, tuned on sets.validation for `goal`).
//       drop = accuracy before minus after: { overall, byGroup }. worstGroup = the group with the largest drop.
//     gapRows(before, after) -> [{ key, before, after, change }] for equalOpportunity, demographicParity and fpr
//       (change = after minus before; any of the three is null when a gap is undefined)
//     differs(report, tolerance = 0.05) -> { differs, maxGap, gaps: { accuracy, tpr, fpr } } the answer to
//       "do the error rates differ between groups?" on one groupReport
//   Charts
//     calibrationByGroup(scores, labels, group, names, { bins = 8, minCount = 8 })
//                      -> [{ group, count, ece, points: [{ x, y, count }] }] one reliability curve per group
//                         (bins with fewer than minCount rows are left out)
//     scoreHistogram(scores, { bins = 20, low, high }) -> [{ lo, hi, count, zone }] zone is "no", "review" or "yes"
//       by the bin's midpoint against the review band (low > high is an empty band)
//   Privacy
//     makeDirectory(n, seed) -> [{ age, postcode, sex, job }] made-up personal fields (age 18 to 79, a postcode
//       "10100" to "10159", sex F or M, one of six jobs). They have nothing to do with the model's inputs.
//     privacyView(directory, { fields, ageBin = 1, digits = 5, k = 5 }) -> kAnonymityReport of the rows after the age is
//       binned (ageBin 1 leaves it alone) and the postcode is cut to `digits` characters; null when no field is chosen
//     noisyCounts(counts, epsilon, seed) -> [{ trueCount, released, scale, error }] a Laplace-noised copy of each count
//       (sensitivity 1); scale = 1 / epsilon is the typical size of the noise; error = released minus true
//   Documentation
//     cardText({ title, sections: [{ title, lines }], notFilled, missingLabel }) -> the plain-text model card
import {
  makeApplicants, fitApplicantModel, applicantProba, perturb, groupReport, groupThresholds,
  kAnonymityReport, generalise, addLaplaceNoise,
} from './reliability.js';
import { reliability, expectedCalibrationError } from './calibration.js';
import { rng } from './rng.js';
import { splitIndices } from './tabular.js';

export const STRESS_KINDS = ['noise', 'missing', 'outlier', 'unitChange', 'shift'];
// What a slider strength of 1 means: noise in column standard deviations, a share of cells for missing and outliers,
// powers of ten for a unit change (x100), a drift in column standard deviations.
export const STRESS_RANGE = { noise: 2, missing: 1, outlier: 0.3, unitChange: 2, shift: 2 };
export const PENGUIN_GROUPS = ['Adelie', 'Chinstrap', 'Gentoo'];
export const PENGUIN_COLUMNS = ['bill_length_mm', 'flipper_length_mm', 'body_mass_g'];
export const DIRECTORY_FIELDS = ['age', 'postcode', 'sex', 'job'];

export const stressAmount = (kind, strength01) => {
  if (!(kind in STRESS_RANGE)) throw new RangeError(`unknown stress kind ${kind}`);
  return STRESS_RANGE[kind] * Math.min(1, Math.max(0, Number(strength01) || 0));
};

// ---- data -------------------------------------------------------------------------------------

export function generatedSets(seed = 1, { n = 600, nTest = 900 } = {}) {
  return {
    kind: 'generated',
    train: makeApplicants({ n, seed }),
    validation: makeApplicants({ n, seed: seed + 500 }),
    test: makeApplicants({ n: nTest, seed: seed + 1000 }),
    groups: ['A', 'B', 'C'],
  };
}

function subset(rows, idx, seed) {
  const pick = idx.map(i => rows[i]);
  const X = pick.map(r => PENGUIN_COLUMNS.map(c => r[c]));
  const y = pick.map(r => (r.sex === 'male' ? 1 : 0));
  return {
    rows: pick.map((r, i) => ({ id: i, group: r.species, features: X[i], label: y[i] })),
    X, y, yTrue: y.slice(), group: pick.map(r => r.species), groups: PENGUIN_GROUPS.slice(), features: PENGUIN_COLUMNS.slice(), seed,
  };
}

export function penguinSets(table, seed = 1) {
  const all = table.rows;
  const kept = all.filter(r => PENGUIN_GROUPS.includes(r.species) && (r.sex === 'male' || r.sex === 'female') && PENGUIN_COLUMNS.every(c => Number.isFinite(r[c])));
  const strata = kept.map(r => `${r.species}|${r.sex}`);
  const parts = splitIndices(kept.length, { train: 0.5, validation: 0 }, seed, strata);
  const train = subset(kept, parts.train, seed), test = subset(kept, parts.test, seed);
  const counts = Object.fromEntries(PENGUIN_GROUPS.map(g => [g, kept.filter(r => r.species === g).length]));
  return { kind: 'penguins', train, validation: train, test, groups: PENGUIN_GROUPS.slice(), total: all.length, kept: kept.length, dropped: all.length - kept.length, counts };
}

export const fitModel = sets => fitApplicantModel(sets.train);

// ---- stress -----------------------------------------------------------------------------------

export function evaluate(sets, model, { kind = 'noise', strength = 0.4, threshold = 0.5, perGroup = false, goal = 'equalOpportunity', seed = 7 } = {}) {
  const thresholds = perGroup ? groupThresholds(model, sets.validation, { goal, threshold }).thresholds : threshold;
  const amount = stressAmount(kind, strength);
  const test = sets.test;
  const perturbed = { ...test, X: perturb(test.X, { kind, strength: amount, seed }) };
  const before = groupReport(model, test, thresholds);
  const after = groupReport(model, perturbed, thresholds);
  const byGroup = {};
  for (const g of before.groups) byGroup[g.group] = g.accuracy - after.byGroup[g.group].accuracy;
  const names = Object.keys(byGroup);
  const worstGroup = names.reduce((a, b) => (byGroup[b] > byGroup[a] ? b : a));
  return {
    thresholds, amount, before, after, perturbed,
    scoresBefore: applicantProba(model, test), scoresAfter: applicantProba(model, perturbed),
    drop: { overall: before.overall.accuracy - after.overall.accuracy, byGroup }, worstGroup,
  };
}

export const GAP_KEYS = ['equalOpportunity', 'demographicParity', 'fpr'];

export function gapRows(before, after) {
  return GAP_KEYS.map(key => {
    const b = before.gaps[key], a = after.gaps[key];
    return { key, before: b, after: a, change: b === null || a === null ? null : a - b };
  });
}

export function differs(report, tolerance = 0.05) {
  const gaps = { accuracy: report.gaps.accuracy, tpr: report.gaps.equalOpportunity, fpr: report.gaps.fpr };
  const maxGap = Math.max(...Object.values(gaps).filter(v => v !== null), 0);
  return { differs: maxGap >= tolerance, maxGap, gaps };
}

// ---- charts -----------------------------------------------------------------------------------

export function calibrationByGroup(scores, labels, group, names, { bins = 8, minCount = 8 } = {}) {
  return names.map(g => {
    const idx = group.map((x, i) => (x === g ? i : -1)).filter(i => i >= 0);
    const s = idx.map(i => scores[i]), l = idx.map(i => labels[i]);
    const points = reliability(s, l, bins).filter(b => b.count >= minCount && b.meanScore !== null).map(b => ({ x: b.meanScore, y: b.observedRate, count: b.count }));
    return { group: g, count: idx.length, ece: idx.length ? expectedCalibrationError(s, l, bins) : null, points };
  });
}

export function scoreHistogram(scores, { bins = 20, low = 1, high = 0 } = {}) {
  const empty = low > high; // an empty band: the machine decides everything, with the plain 0.5 cut
  const out = Array.from({ length: bins }, (_, i) => {
    const lo = i / bins, hi = (i + 1) / bins, mid = (lo + hi) / 2;
    const zone = empty ? (mid < 0.5 ? 'no' : 'yes') : mid < low ? 'no' : mid > high ? 'yes' : 'review';
    return { lo, hi, count: 0, zone };
  });
  for (const s of scores) out[Math.min(bins - 1, Math.max(0, Math.floor(s * bins)))].count++;
  return out;
}

// ---- privacy ----------------------------------------------------------------------------------

export function makeDirectory(n, seed = 1) {
  const random = rng(seed * 31 + 5);
  const jobs = ['clerk', 'driver', 'nurse', 'teacher', 'cook', 'engineer'];
  return Array.from({ length: n }, () => ({
    age: 18 + Math.floor(random() * 62),
    postcode: `101${String(Math.floor(random() * 60)).padStart(2, '0')}`,
    sex: random() < 0.5 ? 'F' : 'M',
    job: jobs[Math.floor(random() * jobs.length)],
  }));
}

export function privacyView(directory, { fields = ['age', 'postcode', 'sex'], ageBin = 1, digits = 5, k = 5 } = {}) {
  if (!fields.length) return null;
  let rows = directory;
  if (ageBin > 1) rows = generalise(rows, 'age', ageBin);
  if (digits < 5) rows = generalise(rows, 'postcode', digits);
  return kAnonymityReport(rows, fields, k);
}

export function noisyCounts(counts, epsilon, seed = 1) {
  return counts.map((trueCount, i) => {
    const released = addLaplaceNoise(trueCount, epsilon, 1, seed * 977 + i * 31 + 1);
    return { trueCount, released, scale: 1 / epsilon, error: released - trueCount };
  });
}

// ---- documentation ----------------------------------------------------------------------------

export function cardText({ title, sections, notFilled = '(not filled in)', missingLabel = 'Missing' }) {
  const lines = [`${title}`];
  const missing = [];
  for (const s of sections) {
    const body = (s.lines || []).map(l => String(l).trim()).filter(Boolean);
    lines.push('', s.title.toUpperCase(), '-'.repeat(s.title.length));
    if (body.length) lines.push(...body); else { lines.push(notFilled); missing.push(s.title); }
  }
  lines.push('', `${missingLabel}: ${missing.length ? missing.join(', ') : '-'}`);
  return lines.join('\n');
}
