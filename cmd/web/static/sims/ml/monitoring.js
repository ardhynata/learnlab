// Monitoring and replay helpers for the "ML deployment and monitoring" module. Pure functions, seeded and
// reproducible, tested in monitoring.test.js. Builds on shift.js (psi, psiFromCounts, psiVerdict),
// logistic.js and tree.js (the model versions), calibration.js (auc, brier, plattScale) and rng.js.
//
// The idea: a model is shipped, then an INFERENCE STREAM arrives day by day. Something may go wrong on a
// known day. A replay steps through the stream, computes what a monitoring dashboard could compute that
// day, raises alerts, and lets the learner pick a remedy whose cost and benefit are then scored.
//
// API
//   The world. 4 numeric features (FEATURES = spend, tenure, tickets, logins), each ~ N(0, 1) (sd 1), and
//   a binary label drawn with P(1 | x) = sigmoid(w . x) (WORLD_WEIGHTS = [2, -1.5, 1, 0.8], no bias, so
//   the clean positive share is exactly 0.5). A model that learns w is right about 83% of the time.
//
//   makeStream({ days = 60, perDay = 200, seed = 1, events = [], labelDelay = 7, refDays = 14 })
//       -> { days, perDay, seed, labelDelay, featureNames, weights, events, rows, reference }
//       rows: days * perDay rows in day order (day d holds rows d*perDay .. (d+1)*perDay - 1), each
//         { id, day, i, t, x, xTrue, label, p, arrival }
//           x        the features the MODEL sees (what the serving pipeline computed)
//           xTrue    the features before any serving bug (what the world produced)
//           label    the true label; p = sigmoid(w . xTrue) for the labelling rule w in force that day (the
//                    generating rule: under a label event the class mix is forced, so p is NOT the
//                    posterior at the new prevalence)
//           t        timestamp in days (day + (i + 0.5) / perDay)
//           arrival  the day the label becomes known: day + the delay in force that day. A label is
//                    visible to a monitor on day d only when arrival <= d.
//       reference: a CLEAN pre-launch dataset of refDays * perDay rows (no events, labels all known):
//         { rows, train (first 70%), holdout (last 30%) }. Models are fitted on train; monitors compare
//         against it. The stream's own rows never feed a model unless a remedy retrains on them.
//       Every row has its own seeded random stream, so streams that differ in events share the rows the
//       events do not touch: a covariate / concept / skew event keeps every other column identical.
//       events: a list of { kind, day, ... }; day is the first day the event is in force:
//         { kind: "covariate", day, feature = 0, shift = 1.5, ramp = 0 }
//              the feature's mean moves by `shift` standard deviations. P(label | x) is untouched, so the
//              labels move only because x moved.
//         { kind: "skew", day, feature = 0, mode = "scale" | "default", factor = 100, value = 0 }
//              a TRAINING-SERVING SKEW bug shipped by a release: from `day` the pipeline serves
//              x * factor (a unit change, "scale") or the constant `value` (a missing feature filled with
//              a default, "default"). Only x changes; xTrue, label and p stay as they were.
//         { kind: "label", day, prevalence = 0.12, ramp = 0 }
//              LABEL SHIFT: the positive share moves from 0.5 to `prevalence`. Each class keeps its own
//              feature distribution (class first, then the features are redrawn until they fit it).
//         { kind: "concept", day, angle = PI / 2, ramp = 0 }
//              CONCEPT SHIFT: the labelling rule rotates: (w0, w1) turns by `angle`. Inputs keep exactly
//              their distribution; only the rule changes.
//         { kind: "delay", day, delay }   from `day` on, labels arrive `delay` days late (default stream
//              delay: labelDelay).
//       ramp = 0 means abrupt; ramp = R spreads covariate / label / concept over R days (day 0 of the
//       event is 1/R of the way). feature may be an index or a name from FEATURES.
//   SCENARIOS                       named event lists at day 25: clean, covariate, unit (scale bug),
//                                   default (default-fill bug), label, concept.
//   scenarioStream(name, opts)      makeStream with SCENARIOS[name] (opts as makeStream, events override).
//
//   Models. A model is { name, kind, score(x) -> probability of class 1, ... }; it is called on the
//   served features row.x.
//   makeModels(stream, { v2Day } = {}) -> { v1, v2, v1cal, baseline }
//       v1: logistic regression fitted on stream.reference.train. v2: a candidate release, by default a
//       depth-3 decision tree fitted on the same rows (an alternative architecture, weaker than v1 here;
//       its score is the leaf share with a +0.5 smoothing). With v2Day, v2 is instead v1 RETRAINED: a
//       logistic model refitted on the reference plus the stream labels that had arrived by that day.
//       v1cal: v1 recalibrated (Platt on the logit) on the reference holdout. baseline: the accuracy,
//       auc and mean score of v1 on the holdout.
//   recalibrate(model, rows)        Platt-scale a model on labelled rows -> a new model (name + "+cal").
//   retrainLogistic(rows, opts?)    a fresh logistic model fitted on labelled rows (served features).
//
//   Replay.
//   replay({ stream, model, monitors, policy })
//       -> { daily, series, baseline, monitors, policy, alerts, summary }
//       Steps day 0, 1, ... and records for each day d (daily[d], and the same numbers by column in
//       series):
//         psi: { feature: value }     PSI of each served feature against the reference (reference is the
//                                     base; window rows of the last `window` days). After a rollback
//                                     remedy the pipeline serves the fixed features, so PSI recovers.
//         psiMax, psiMaxFeature       the largest one and its name
//         scoreDrift                  PSI of the model's scores against its scores on the holdout
//         meanScore                   mean predicted probability of the day
//         positiveRate                the true positive share of the day (the simulator knows it)
//         accuracyTrue, aucTrue       same-day truth, which a real team does NOT have yet
//         accuracyDelayed, aucDelayed, nLabels
//                                     computed ONLY from labels that have arrived: rows with
//                                     arrival in (d - window, d], scored with the predictions made
//                                     when they were served; null while fewer than minLabels arrived
//         alerts                      names of the rules in alert today; remedied: serving kind or null
//       monitors (every part optional; set one to false to switch it off):
//         psi:      { threshold: 0.25, bins: 10, window: 1 }   alert when psiMax > threshold
//         score:    { threshold: 0.25, bins: 10, window: 1 }   alert when scoreDrift > threshold
//         accuracy: { drop: 0.08, window: 7, minLabels: 100 }  alert when accuracyDelayed < baseline
//                                                              accuracy - drop
//       policy: { consecutive: 2, remedy: null }. A rule is in alert on day d when it breached on that
//         day and the consecutive - 1 days before. policy.remedy = { kind, wait = 0, previous } makes the
//         engine act by itself: it applies applyRemedy's serving from day firstAlert + 1 + wait.
//       alerts: [{ day, rule, value, threshold, feature? }], one per alert day and rule.
//       summary: { firstAlert: { psi, score, accuracy, any } (day or null), firstEventDay, detectionDelay,
//                  falseAlarmDays (alert days before the first event; every alert day on a clean stream),
//                  alertDays (days with any alert), remedyDay }.
//   evaluateAlerts({ daily, baseline, monitors, policy }) -> { rules: { psi: {days, first}, ... }, alerts,
//       first, alertDays }   the alert rules alone, on a daily series.
//   DEFAULT_MONITORS, DEFAULT_POLICY                the defaults above.
//   falseAlarms({ days = 60, perDay = 200, seeds = [1..10], monitors, policy, labelDelay })
//       -> { perSeed: [{ seed, alertDays, firstAlert }], alertDays, rate, seedsWithAlarm }
//       Replays CLEAN streams (v1) and counts alert days. At the default thresholds it is 0 for the
//       default perDay (200): single-day PSI noise grows as perDay shrinks (10 bins, a day of rows against
//       the reference), so for a small perDay widen monitors.psi.window or raise the threshold.
//   delayedMetrics({ rows, scores, day, window = 7, threshold = 0.5, minLabels = 1 })
//       -> { n, accuracy, auc }  from rows with arrival in (day - window, day] only (scores[i] is the
//       prediction made for rows[i]); accuracy and auc are null when n < minLabels (auc also when one
//       class is missing).
//   psiAlert(expectedCounts, actualCounts, threshold = 0.25) -> { psi, verdict, alert }  one PSI check on
//       two histograms (alert when psi > threshold).
//
//   Remedies.
//   REMEDIES = ["none", "rollback", "recalibrate", "retrain"]
//   REMEDY_COSTS = { none: { fixed: 0, latency: 0 }, rollback: { fixed: 1, latency: 0 },
//                    recalibrate: { fixed: 2, latency: 0 }, retrain: { fixed: 10, latency: 3 } }
//       fixed: cost units of doing it; latency: days before it is live (the old serving carries on).
//   applyRemedy({ stream, fromDay, kind, model, previous, horizon, window = 10, minLabels = 60, latency })
//       -> { kind, fromDay, effectiveDay, from, to, feasible, labelsUsed, metric, before, gain, cost }
//       Acts on day fromDay and scores the rest of the stream (days fromDay .. fromDay + horizon - 1,
//       default to the end) on the TRUE labels:
//         rollback     reverts the release: serving skew bugs vanish (x = xTrue) and, when `previous` is
//                      given, the previous model comes back. Instant. Helps only skew bugs.
//         recalibrate  Platt-scales the model on the labels that have ARRIVED by fromDay (the most recent
//                      `window` days of them). Cheap and instant. Helps label shift and a miscalibrated
//                      score; it cannot change a ranking, so it does not help concept shift or skew.
//         retrain      refits a logistic model on the same arrived labels. Needs them: with fewer than
//                      minLabels (or one class only) it is infeasible and the old model carries on.
//                      Helps concept shift (once labels from the new regime have arrived); costs fixed 10
//                      and 3 days of latency.
//         none         does nothing (the baseline).
//       metric / before: { accuracy, auc, brier, errors, rows } with and without the remedy over the same
//       days. gain = metric.accuracy - before.accuracy. cost: { fixed, latencyDays }.
//   decisionCost(outcome, { fixed, errorCost = 0.05 } = {}) -> { kind, fixed, errors, errorCost, total }
//       total = fixed + errorCost * errors: the remedy's price plus the wrong predictions that follow.
//   compareRemedies({ stream, fromDay, model, previous, kinds = REMEDIES, costs, ...applyRemedy options })
//       -> { fromDay, options: [{ kind, outcome, cost }] sorted by total cost, best, byKind }
//   scoreChoice(comparison, choice) -> { choice, best, chosenTotal, bestTotal, regret, rank, isBest }
//       how the learner's choice compares with the cheapest option (regret = chosenTotal - bestTotal).
import { rng, gauss } from './rng.js';
import { psi, psiFromCounts, psiVerdict } from './shift.js';
import { fitLogistic, predictProba, sigmoid } from './logistic.js';
import { fitTree, decisionPath } from './tree.js';
import { auc as rocAuc, plattScale } from './calibration.js';

export const FEATURES = ['spend', 'tenure', 'tickets', 'logins'];
export const WORLD_WEIGHTS = [2, -1.5, 1, 0.8];
export const REMEDIES = ['none', 'rollback', 'recalibrate', 'retrain'];
export const REMEDY_COSTS = {
  none: { fixed: 0, latency: 0 },
  rollback: { fixed: 1, latency: 0 },
  recalibrate: { fixed: 2, latency: 0 },
  retrain: { fixed: 10, latency: 3 },
};
export const DEFAULT_MONITORS = {
  psi: { threshold: 0.25, bins: 10, window: 1 },
  score: { threshold: 0.25, bins: 10, window: 1 },
  accuracy: { drop: 0.08, window: 7, minLabels: 100 },
};
export const DEFAULT_POLICY = { consecutive: 2, remedy: null };
export const SCENARIOS = {
  clean: [],
  covariate: [{ kind: 'covariate', day: 25, feature: 'spend', shift: 1.5 }],
  unit: [{ kind: 'skew', day: 25, feature: 'spend', mode: 'scale', factor: 100 }],
  default: [{ kind: 'skew', day: 25, feature: 'spend', mode: 'default', value: 0 }],
  label: [{ kind: 'label', day: 25, prevalence: 0.12 }],
  concept: [{ kind: 'concept', day: 25, angle: Math.PI / 2 }],
};

const EVENT_KINDS = ['covariate', 'skew', 'label', 'concept', 'delay'];
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

// ---- The stream --------------------------------------------------------------------------------

function hash32(...parts) {
  let h = 0x9e3779b9;
  for (const p of parts) {
    h = Math.imul(h ^ (p | 0), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

function featureIndex(f, where) {
  const i = typeof f === 'string' ? FEATURES.indexOf(f) : f;
  if (!Number.isInteger(i) || i < 0 || i >= FEATURES.length) throw new RangeError(`${where}: unknown feature ${JSON.stringify(f)} (use an index 0..${FEATURES.length - 1} or one of ${FEATURES.join(', ')})`);
  return i;
}

function normalizeEvent(ev, k) {
  const where = `events[${k}]`;
  if (!ev || !EVENT_KINDS.includes(ev.kind)) throw new RangeError(`${where}: kind must be one of ${EVENT_KINDS.join(', ')}`);
  if (!Number.isInteger(ev.day) || ev.day < 0) throw new RangeError(`${where}: day must be a whole number >= 0`);
  const ramp = ev.ramp === undefined ? 0 : ev.ramp;
  if (!Number.isInteger(ramp) || ramp < 0) throw new RangeError(`${where}: ramp must be a whole number >= 0`);
  switch (ev.kind) {
    case 'covariate':
      return { kind: 'covariate', day: ev.day, feature: featureIndex(ev.feature ?? 0, where), shift: ev.shift ?? 1.5, ramp };
    case 'skew': {
      const mode = ev.mode ?? 'scale';
      if (mode !== 'scale' && mode !== 'default') throw new RangeError(`${where}: mode must be "scale" or "default"`);
      return { kind: 'skew', day: ev.day, feature: featureIndex(ev.feature ?? 0, where), mode, factor: ev.factor ?? 100, value: ev.value ?? 0 };
    }
    case 'label': {
      const prevalence = ev.prevalence ?? 0.12;
      if (!(prevalence > 0 && prevalence < 1)) throw new RangeError(`${where}: prevalence must be in (0, 1)`);
      return { kind: 'label', day: ev.day, prevalence, ramp };
    }
    case 'concept':
      return { kind: 'concept', day: ev.day, angle: ev.angle ?? Math.PI / 2, ramp };
    default: {
      if (!Number.isInteger(ev.delay) || ev.delay < 0) throw new RangeError(`${where}: delay must be a whole number >= 0`);
      return { kind: 'delay', day: ev.day, delay: ev.delay };
    }
  }
}

const magnitude = (ev, day) => (day < ev.day ? 0 : ev.ramp > 0 ? Math.min(1, (day - ev.day + 1) / ev.ramp) : 1);

// Everything the world does on one day, from the event list.
function worldAt(day, events, labelDelay) {
  const offsets = FEATURES.map(() => 0);
  let weights = WORLD_WEIGHTS.slice(), prevalence = null, delay = labelDelay;
  const skews = [];
  for (const ev of events) {
    const m = magnitude(ev, day);
    if (m === 0) continue;
    if (ev.kind === 'covariate') offsets[ev.feature] += ev.shift * m;
    else if (ev.kind === 'concept') {
      const a = ev.angle * m, c = Math.cos(a), s = Math.sin(a);
      weights = [weights[0] * c - weights[1] * s, weights[0] * s + weights[1] * c, weights[2], weights[3]];
    } else if (ev.kind === 'label') prevalence = 0.5 + m * (ev.prevalence - 0.5);
    else if (ev.kind === 'delay') delay = ev.delay;
    else skews.push(ev);
  }
  return { offsets, weights, prevalence, delay, skews };
}

function serve(xTrue, skews) {
  const x = xTrue.slice();
  for (const e of skews) x[e.feature] = e.mode === 'scale' ? xTrue[e.feature] * e.factor : e.value;
  return x;
}

// One row. Its random stream depends only on (key, day, i), never on the events, so rows an event does
// not touch are identical across streams. Label shift draws the class first and redraws the features
// until they fit it (the first draw is the clean row, so a row whose class does not change is unchanged).
function makeRow(key, day, i, perDay, id, world, arrivalDay) {
  const r = rng(hash32(key, day, i));
  r(); r();
  const u0 = r();
  const target = world.prevalence === null ? null : (u0 < world.prevalence ? 1 : 0);
  let xTrue, p, label;
  for (let attempt = 0; attempt < 80; attempt++) {
    xTrue = FEATURES.map((_, j) => gauss(r) + world.offsets[j]);
    p = sigmoid(dot(world.weights, xTrue));
    label = r() < p ? 1 : 0;
    if (target === null || label === target) break;
  }
  return { id, day, i, t: day + (i + 0.5) / perDay, x: serve(xTrue, world.skews), xTrue, label, p, arrival: arrivalDay === null ? day : day + world.delay };
}

export function makeStream({ days = 60, perDay = 200, seed = 1, events = [], labelDelay = 7, refDays = 14 } = {}) {
  if (!Number.isInteger(days) || days < 1) throw new RangeError('makeStream: days must be a whole number >= 1');
  if (!Number.isInteger(perDay) || perDay < 10) throw new RangeError('makeStream: perDay must be a whole number >= 10');
  if (!Number.isInteger(labelDelay) || labelDelay < 0) throw new RangeError('makeStream: labelDelay must be a whole number >= 0');
  if (!Number.isInteger(refDays) || refDays < 2) throw new RangeError('makeStream: refDays must be a whole number >= 2');
  const evs = events.map(normalizeEvent).sort((a, b) => a.day - b.day);
  const rows = [];
  for (let d = 0; d < days; d++) {
    const world = worldAt(d, evs, labelDelay);
    for (let i = 0; i < perDay; i++) rows.push(makeRow(seed, d, i, perDay, d * perDay + i, world, d));
  }
  const clean = worldAt(0, [], labelDelay);
  const refRows = [];
  for (let d = 0; d < refDays; d++) {
    for (let i = 0; i < perDay; i++) refRows.push(makeRow(hash32(seed, 0x51ed270b), -1 - d, i, perDay, -1 - (d * perDay + i), { ...clean, delay: 0 }, null));
  }
  const cut = Math.floor(refRows.length * 0.7);
  return {
    days, perDay, seed, labelDelay, featureNames: FEATURES.slice(), weights: WORLD_WEIGHTS.slice(), events: evs, rows,
    reference: { rows: refRows, train: refRows.slice(0, cut), holdout: refRows.slice(cut) },
  };
}

export function scenarioStream(name, opts = {}) {
  if (!Object.hasOwn(SCENARIOS, name)) throw new RangeError(`scenarioStream: unknown scenario "${name}" (use ${Object.keys(SCENARIOS).join(', ')})`);
  return makeStream({ events: SCENARIOS[name], ...opts });
}

const dayRows = (stream, d) => stream.rows.slice(d * stream.perDay, (d + 1) * stream.perDay);

// ---- Models ------------------------------------------------------------------------------------

function logisticModel(fit, name) {
  return { name, kind: 'logistic', fit, score: x => predictProba(fit, [x])[0] };
}

function treeModel(tree, name) {
  const k = tree.classes.indexOf(1);
  return {
    name, kind: 'tree', tree,
    score: x => {
      const leaf = decisionPath(tree, x).at(-1);
      return ((k < 0 ? 0 : leaf.counts[k]) + 0.5) / (leaf.n + 1);
    },
  };
}

export function retrainLogistic(rows, { name = 'retrained', lr = 0.3, iters = 400 } = {}) {
  return logisticModel(fitLogistic(rows.map(r => r.x), rows.map(r => r.label), { lr, iters }), name);
}

const bothClasses = rows => { const s = rows.reduce((a, r) => a + r.label, 0); return s > 0 && s < rows.length; };

export function recalibrate(model, rows) {
  if (!bothClasses(rows)) throw new RangeError('recalibrate: the rows need both classes');
  const platt = plattScale(rows.map(r => model.score(r.x)), rows.map(r => r.label), { logit: true });
  return { name: `${model.name}+cal`, kind: 'recalibrated', base: model, platt: { a: platt.a, b: platt.b }, score: x => platt.predict(model.score(x)) };
}

function holdoutMetrics(model, rows) {
  const s = rows.map(r => model.score(r.x));
  return {
    accuracy: mean(rows.map((r, i) => ((s[i] >= 0.5 ? 1 : 0) === r.label ? 1 : 0))),
    auc: bothClasses(rows) ? rocAuc(s, rows.map(r => r.label)) : null,
    meanScore: mean(s),
  };
}

export function makeModels(stream, { v2Day } = {}) {
  const { train, holdout } = stream.reference;
  const v1 = retrainLogistic(train, { name: 'v1' });
  const labels = train.map(r => r.label);
  const v2 = v2Day === undefined
    ? treeModel(fitTree(train.map(r => r.x), labels, { maxDepth: 3, minLeaf: 10 }), 'v2')
    : retrainLogistic([...train, ...recentLabeled(stream, v2Day, 14)], { name: 'v2' });
  const v1cal = { ...recalibrate(v1, holdout), name: 'v1-recalibrated' };
  return { v1, v2, v1cal, baseline: holdoutMetrics(v1, holdout) };
}

// ---- Delayed metrics and alerts ----------------------------------------------------------------

export function delayedMetrics({ rows, scores, day, window = 7, threshold = 0.5, minLabels = 1 }) {
  const idx = [];
  rows.forEach((r, i) => { if (r.arrival <= day && r.arrival > day - window) idx.push(i); });
  const n = idx.length;
  if (n < minLabels || n === 0) return { n, accuracy: null, auc: null };
  const y = idx.map(i => rows[i].label), s = idx.map(i => scores[i]);
  const accuracy = mean(idx.map((_, k) => ((s[k] >= threshold ? 1 : 0) === y[k] ? 1 : 0)));
  return { n, accuracy, auc: bothClasses(idx.map(i => rows[i])) ? rocAuc(s, y) : null };
}

export function psiAlert(expected, actual, threshold = 0.25) {
  const value = psiFromCounts(expected, actual);
  return { psi: value, verdict: psiVerdict(value), alert: value > threshold };
}

const merged = (defaults, given) => {
  const out = {};
  for (const k of Object.keys(defaults)) {
    if (given && given[k] === false) out[k] = false;
    else out[k] = typeof defaults[k] === 'object' && defaults[k] !== null ? { ...defaults[k], ...(given?.[k] ?? {}) } : (given?.[k] ?? defaults[k]);
  }
  return out;
};

export function evaluateAlerts({ daily, baseline, monitors, policy }) {
  const mon = merged(DEFAULT_MONITORS, monitors), pol = merged(DEFAULT_POLICY, policy);
  const rules = {};
  const alerts = [];
  const breach = {
    psi: d => (d.psiMax > mon.psi.threshold ? { value: d.psiMax, threshold: mon.psi.threshold, feature: d.psiMaxFeature } : null),
    score: d => (d.scoreDrift > mon.score.threshold ? { value: d.scoreDrift, threshold: mon.score.threshold } : null),
    accuracy: d => (d.accuracyDelayed !== null && d.accuracyDelayed < baseline.accuracy - mon.accuracy.drop
      ? { value: d.accuracyDelayed, threshold: baseline.accuracy - mon.accuracy.drop } : null),
  };
  for (const rule of Object.keys(breach)) {
    if (mon[rule] === false) continue;
    const alertDays = [];
    let streak = 0;
    for (const d of daily) {
      const b = breach[rule](d);
      streak = b ? streak + 1 : 0;
      if (b && streak >= pol.consecutive) { alertDays.push(d.day); alerts.push({ day: d.day, rule, ...b }); }
    }
    rules[rule] = { days: alertDays, first: alertDays.length ? alertDays[0] : null };
  }
  alerts.sort((a, b) => a.day - b.day);
  const allDays = [...new Set(alerts.map(a => a.day))];
  return { rules, alerts, first: allDays.length ? allDays[0] : null, alertDays: allDays };
}

// ---- Remedies and serving ----------------------------------------------------------------------

// The most recent `window` days of labels that had arrived by `fromDay`.
function recentLabeled(stream, fromDay, window) {
  const known = stream.rows.filter(r => r.arrival <= fromDay);
  if (!known.length) return [];
  const last = Math.max(...known.map(r => r.day));
  return known.filter(r => r.day > last - window);
}

function buildServing({ stream, model, previous, kind, fromDay, window = 10, minLabels = 60, latency }) {
  if (!REMEDIES.includes(kind)) throw new RangeError(`unknown remedy "${kind}" (use ${REMEDIES.join(', ')})`);
  const lat = latency ?? REMEDY_COSTS[kind].latency;
  let after = model, undoSkew = false, feasible = true, labelsUsed = 0;
  if (kind === 'rollback') { undoSkew = true; after = previous ?? model; }
  if (kind === 'recalibrate' || kind === 'retrain') {
    const rows = recentLabeled(stream, fromDay, window);
    labelsUsed = rows.length;
    if (rows.length < minLabels || !bothClasses(rows)) feasible = false;
    else after = kind === 'retrain' ? retrainLogistic(rows, { name: `${model.name}-retrained` }) : recalibrate(model, rows);
  }
  const effectiveDay = fromDay + lat;
  const features = row => (undoSkew && row.day >= effectiveDay ? row.xTrue : row.x);   // what the pipeline serves once the remedy is live
  const score = row => (row.day >= effectiveDay ? after.score(features(row)) : model.score(row.x));
  return { kind, fromDay, effectiveDay, feasible, labelsUsed, features, score, model: after };
}

function scoreOutcome(stream, serving, from, to) {
  const rows = stream.rows.slice(from * stream.perDay, to * stream.perDay);
  const s = rows.map(serving);
  const y = rows.map(r => r.label);
  const errors = s.reduce((e, v, i) => e + ((v >= 0.5 ? 1 : 0) === y[i] ? 0 : 1), 0);
  return {
    accuracy: rows.length ? 1 - errors / rows.length : null,
    auc: bothClasses(rows) ? rocAuc(s, y) : null,
    brier: mean(s.map((v, i) => (v - y[i]) ** 2)),
    errors, rows: rows.length,
  };
}

export function applyRemedy({ stream, fromDay, kind, model, previous, horizon, window, minLabels, latency }) {
  if (!Number.isInteger(fromDay) || fromDay < 0 || fromDay >= stream.days) throw new RangeError('applyRemedy: fromDay must be a day inside the stream');
  const base = model ?? makeModels(stream).v1;
  const to = Math.min(stream.days, fromDay + (horizon ?? stream.days));
  const serving = buildServing({ stream, model: base, previous, kind, fromDay, window, minLabels, latency });
  const metric = scoreOutcome(stream, serving.score, fromDay, to);
  const before = scoreOutcome(stream, row => base.score(row.x), fromDay, to);
  return {
    kind, fromDay, effectiveDay: serving.effectiveDay, from: fromDay, to, feasible: serving.feasible, labelsUsed: serving.labelsUsed,
    metric, before, gain: metric.accuracy - before.accuracy,
    cost: { fixed: REMEDY_COSTS[kind].fixed, latencyDays: latency ?? REMEDY_COSTS[kind].latency },
  };
}

export function decisionCost(outcome, { fixed, errorCost = 0.05 } = {}) {
  const f = fixed ?? outcome.cost.fixed;
  return { kind: outcome.kind, fixed: f, errors: outcome.metric.errors, errorCost, total: f + errorCost * outcome.metric.errors };
}

export function compareRemedies({ stream, fromDay, model, previous, kinds = REMEDIES, costs = {}, ...opts }) {
  const base = model ?? makeModels(stream).v1;
  const options = kinds.map(kind => {
    const outcome = applyRemedy({ stream, fromDay, kind, model: base, previous, ...opts });
    return { kind, outcome, cost: decisionCost(outcome, { fixed: costs.fixed?.[kind], errorCost: costs.errorCost }) };
  }).sort((a, b) => a.cost.total - b.cost.total);
  return { fromDay, options, best: options[0].kind, byKind: Object.fromEntries(options.map(o => [o.kind, o])) };
}

export function scoreChoice(comparison, choice) {
  const chosen = comparison.byKind[choice];
  if (!chosen) throw new RangeError(`scoreChoice: "${choice}" was not one of the compared remedies`);
  const best = comparison.options[0];
  return {
    choice, best: best.kind, chosenTotal: chosen.cost.total, bestTotal: best.cost.total,
    regret: chosen.cost.total - best.cost.total, rank: comparison.options.indexOf(chosen) + 1, isBest: chosen.kind === best.kind,
  };
}

// ---- Replay ------------------------------------------------------------------------------------

export function replay({ stream, model, monitors, policy } = {}) {
  if (!stream || !model) throw new RangeError('replay: needs a stream and a model');
  const mon = merged(DEFAULT_MONITORS, monitors), pol = merged(DEFAULT_POLICY, policy);
  const { holdout, rows: refRows } = stream.reference;
  const baseline = holdoutMetrics(model, holdout);
  const refScores = holdout.map(r => model.score(r.x));
  const refCols = FEATURES.map((_, j) => refRows.map(r => r.x[j]));
  const names = stream.featureNames;
  const scores = new Array(stream.rows.length);
  const daily = [];
  const winOf = w => Math.max(1, (typeof w === 'number' ? w : 1));
  const pw = mon.psi ? winOf(mon.psi.window) : 1, sw = mon.score ? winOf(mon.score.window) : 1;
  let serving = null, remedyDay = null, firstAny = null;
  const evalNow = () => evaluateAlerts({ daily, baseline, monitors, policy });

  for (let d = 0; d < stream.days; d++) {
    if (pol.remedy && serving === null && firstAny !== null && d >= firstAny + 1 + (pol.remedy.wait ?? 0)) {
      serving = buildServing({ stream, model, previous: pol.remedy.previous, kind: pol.remedy.kind, fromDay: d, window: pol.remedy.window, minLabels: pol.remedy.minLabels, latency: pol.remedy.latency });
      remedyDay = d;
    }
    const lo = d * stream.perDay, rows = stream.rows.slice(lo, lo + stream.perDay);
    rows.forEach((r, k) => { scores[lo + k] = serving ? serving.score(r) : model.score(r.x); });
    const today = scores.slice(lo, lo + stream.perDay);
    const from = (w) => Math.max(0, d - w + 1) * stream.perDay;
    const winRows = stream.rows.slice(from(pw), lo + stream.perDay);
    const winX = winRows.map(r => (serving ? serving.features(r) : r.x));
    const psiNow = {};
    names.forEach((f, j) => { psiNow[f] = psi(refCols[j], winX.map(x => x[j]), mon.psi ? mon.psi.bins : 10); });
    const psiMaxFeature = names.reduce((a, b) => (psiNow[b] > psiNow[a] ? b : a));
    const scoreDrift = psi(refScores, scores.slice(from(sw), lo + stream.perDay), mon.score ? mon.score.bins : 10);
    const acc = mon.accuracy || DEFAULT_MONITORS.accuracy;
    const delayed = delayedMetrics({ rows: stream.rows.slice(0, lo + stream.perDay), scores, day: d, window: acc.window, minLabels: acc.minLabels });
    const y = rows.map(r => r.label);
    daily.push({
      day: d, n: rows.length, psi: psiNow, psiMax: psiNow[psiMaxFeature], psiMaxFeature, scoreDrift,
      meanScore: mean(today), positiveRate: mean(y),
      accuracyTrue: mean(today.map((s, k) => ((s >= 0.5 ? 1 : 0) === y[k] ? 1 : 0))),
      aucTrue: bothClasses(rows) ? rocAuc(today, y) : null,
      accuracyDelayed: delayed.accuracy, aucDelayed: delayed.auc, nLabels: delayed.n,
      alerts: [], remedied: serving ? serving.kind : null,
    });
    if (pol.remedy && serving === null && firstAny === null) firstAny = evalNow().first;
  }

  const result = evaluateAlerts({ daily, baseline, monitors, policy });
  for (const a of result.alerts) daily[a.day].alerts.push(a.rule);
  const series = {};
  for (const key of Object.keys(daily[0])) if (key !== 'psi' && key !== 'alerts') series[key] = daily.map(d => d[key]);
  series.psi = Object.fromEntries(names.map(f => [f, daily.map(d => d.psi[f])]));
  const changeDays = stream.events.filter(e => e.kind !== 'delay').map(e => e.day);
  const firstEventDay = changeDays.length ? Math.min(...changeDays) : null;
  const first = Object.fromEntries(Object.keys(result.rules).map(k => [k, result.rules[k].first]));
  return {
    daily, series, baseline, monitors: mon, policy: pol, alerts: result.alerts,
    summary: {
      firstAlert: { psi: first.psi ?? null, score: first.score ?? null, accuracy: first.accuracy ?? null, any: result.first },
      firstEventDay,
      detectionDelay: result.first !== null && firstEventDay !== null && result.first >= firstEventDay ? result.first - firstEventDay : null,
      falseAlarmDays: result.alertDays.filter(day => firstEventDay === null || day < firstEventDay),
      alertDays: result.alertDays, remedyDay,
    },
  };
}

export function falseAlarms({ days = 60, perDay = 200, seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], monitors, policy, labelDelay = 7 } = {}) {
  const perSeed = seeds.map(seed => {
    const stream = makeStream({ days, perDay, seed, labelDelay });
    const r = replay({ stream, model: makeModels(stream).v1, monitors, policy });
    return { seed, alertDays: r.summary.alertDays.length, firstAlert: r.summary.firstAlert.any };
  });
  const alertDays = perSeed.reduce((s, p) => s + p.alertDays, 0);
  return { perSeed, alertDays, rate: alertDays / (seeds.length * days), seedsWithAlarm: perSeed.filter(p => p.alertDays > 0).length };
}
