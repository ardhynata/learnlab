// Helpers for the Level 3 (advanced) capstone workbench: ship a batch scoring model on repeated entities,
// evaluate it honestly, plan its monitoring, and investigate the one failure that happens after launch.
// Pure functions, no DOM, no clock; every random choice comes from a seed, so the same call always gives
// the same answer. Tested in capstone3.test.js. Builds on capstone2.js (splitters, fitters, auc,
// averagePrecision, costThreshold), shift.js (psi), calibration.js (plattScale) and monitoring.js
// (evaluateAlerts, REMEDIES, REMEDY_COSTS); the world here is its own (rare positives, repeated entities).
//
// THE SYSTEM
//   makeCapstoneSystem({ seed = 1, days = 90, entities = 60, perDay = 80, failure, labelDelay = 7,
//                        positiveRate = 0.06, costs, capacity }) -> system
//     A batch scorer: every day `perDay` cases arrive, each from one of the entities (a customer, an
//     account) and each carries 5 numbers (FEATURES = amount, velocity, merchantRisk, accountAge,
//     deviceId). The first four are N(0, 1)-ish and carry the signal; deviceId is a per-entity fingerprint
//     with no signal across entities (like capstone2's quirk: it lets a flexible model recognise an entity,
//     which a random split rewards and a grouped split does not). The positive outcome (fraud, default,
//     churn: your pick) is RARE: about `positiveRate` of cases (default 6%). An entity also has its own
//     risk level, so its past cases tell something about its next one.
//       Timeline. Days 0 .. launchDay - 1 (launchDay = round(0.4 * days)) are HISTORY: fully labelled, the
//       data a team builds and validates on. From launchDay the model is DEPLOYED and scores a new batch
//       every day. 40% of the entities are NEW: they first appear after launch (history never saw them).
//       A label becomes known `labelDelay` days after the case (a chargeback, a repayment); history rows
//       are all known.
//       ONE hidden failure begins on `truth.day` (launchDay + 20% to 40% of the deployed days, drawn from
//       the seed) and stays on to the end. Its kind is drawn from the seed too (or forced with
//       failure = one of FAILURE_KINDS), so the investigation has one right diagnosis:
//         skew       a TRAINING-SERVING SKEW bug in one feature: from the day the pipeline serves
//                    that feature x 100 (a unit change) or a constant 0 (a missing value filled with a
//                    default); the feature is one of the 4 signal features, drawn from the seed. The
//                    world did not change; only what the model sees.
//         covariate  COVARIATE DRIFT: one signal feature's mean moves up by 1.5 standard deviations. The
//                    rule P(positive | inputs) is untouched.
//         label      LABEL SHIFT: the positive share triples (0.06 -> 0.18); each class keeps its own
//                    inputs, so the inputs barely move.
//         concept    CONCEPT SHIFT: the rule changes (the weights rotate a quarter turn, so the old rule
//                    is no better than a coin flip); the inputs keep exactly their distribution.
//     system = { seed, days, entities, perDay, launchDay, labelDelay, positiveRate, costs, capacity,
//                featureNames, weights, rows, history, stream, truth, base, entityTable }
//       rows       all cases in day order; row = { id, day, i, t, entity, isNew, x, xTrue, label, p, arrival }
//                  x = the features the model sees (what the serving pipeline computed); xTrue = the
//                  features before any serving bug; p = the TRUE probability of a positive for the case under the
//                  rule in force that day (under label shift the odds are scaled to the new prior); arrival = the
//                  day the label is known (history: the day itself). t = day + (i + 0.5) / perDay.
//       history    the rows with day < launchDay.   stream  the rows with day >= launchDay.
//       truth      THE ANSWER KEY { kind, day, feature (name, skew and covariate), mode ('scale' | 'default',
//                  skew), ... }. A lab must not show it before the learner commits to a diagnosis.
//       costs      the unit cost table { miss: 100, falseAlarm: 5, review: 5 }: a missed positive costs
//                  `miss`; flagging a case costs `review` (someone looks at it) and, when it was a false
//                  alarm, `falseAlarm` on top. capacity: the cases that can be reviewed per day (default
//                  round(0.3 * perDay)).
//     Rows an event does not touch are identical across systems with the same seed and different failure.
//     Throws RangeError for days < 40, perDay < 20, entities < 10, an unknown failure, labelDelay < 0, a
//     positiveRate outside (0, 0.5) or a bad cost table.
//   FEATURES, SIGNAL_FEATURES (the first 4), FAILURE_KINDS = ['skew', 'covariate', 'label', 'concept'],
//   DEFAULT_COSTS, WEIGHTS.
//
// THE SPLIT (development stage; all on system.history)
//   chooseSplit(system, kind, { testFraction = 0.25, model = 'forest', seed, fitOpts }) -> {
//       kind, train, test           sorted row indices into system.history, never overlapping, covering it
//       sharedEntities              entities on both sides (0 for 'grouped')
//       trainsOnFuture              true when some train row is later than some test row (false for
//                                   'temporal')
//       estimate                    the model's AUC on the test side of this split
//       realised                    the AUC of the SAME model (fitted on this train side) on the cases of
//                                   NEW entities on the clean deployed days (launchDay .. truth.day - 1):
//                                   what happens on entities the model has never met (all the clean
//                                   deployed cases when no new entity has both classes yet)
//       realisedAll                 the same on every clean deployed case (old and new entities)
//       optimism                    estimate - realised: how much this split flatters the model
//       model, testFraction }
//     kind is 'random' | 'grouped' | 'temporal' (capstone2.js splitters on the entity and time). On the
//     flexible forest a random split over-states the AUC (it has seen the same entity, deviceId and all)
//     by clearly more than a grouped one does (about 0.16 against 0.03 on average over seeds 1 to 6; one
//     seed is noisy, the rare positives of a quarter of the history are few). A temporal split removes the
//     future but not the entity overlap, so it flatters the forest about as much as a random one. The
//     forest has 30 trees here (FOREST) to keep it quick; pass fitOpts to change it.
//   trainCandidates(system, split, { seed, capacity, costs }) -> { split, labels, candidates, byName, best }
//       Fits the three candidates on split.train: 'baseline' (the prior, AUC 0.5), 'logistic' and 'forest'
//       (capstone2.fit), scores split.test. candidate = { name, model, probas, auc, averagePrecision,
//       operational } with operational = operationalMetric(...) at the system's cost table and a review
//       capacity in proportion to the test size. best = the name with the lowest expected cost.
//   deployedModel(system, name = 'logistic') -> the model fitted on ALL history (cached per system); the
//       one the monitoring plan and the investigation watch. model.predictProba(rows of x) -> probabilities.
//
// THE OPERATIONAL METRIC
//   reviewThreshold(costs) = (review + falseAlarm) / (miss + falseAlarm). Flagging a case with probability p
//       of being positive costs review + (1 - p) * falseAlarm; leaving it costs p * miss; flag when
//       p >= the ratio. (Same as capstone2.costThreshold(review + falseAlarm, miss - review).) Above 1
//       (a review dearer than a miss) nothing is ever flagged.
//   operationalMetric(probas, labels, costs = DEFAULT_COSTS, capacity = Infinity) -> {
//       threshold, capacity, n, positives,
//       wouldFlag         cases at or above the threshold
//       flagged           cases actually flagged: the highest-scored `capacity` of them
//       capacityBinding   wouldFlag > capacity
//       flaggedIdx        their indices, highest score first (ties by index)
//       tp, fp, fn, tn, precision, recall
//       totalCost         flagged * review + fp * falseAlarm + fn * miss
//       expectedCost      totalCost / n
//       costFlagNone      positives * miss,  savings = costFlagNone - totalCost }
//
// REPRODUCIBILITY
//   runExperiment(seed, settings) -> { system, split, probas, labels, metrics, splitHash }
//       settings = { system: { days, entities, perDay, failure, labelDelay, positiveRate },
//       splitKind = 'grouped', model = 'forest', testFraction = 0.25, costs, capacity, fitOpts }. Builds the
//       system, splits the history, fits `model`, scores the test side. metrics = { auc, averagePrecision,
//       expectedCost, totalCost, flagged, precision, recall, threshold }.
//   repro(seed, settings, split, metrics) -> the record { version, seed, settings, split: { kind, nTrain,
//       nTest, hash }, metrics } to file with a result (a deep copy, JSON-safe).
//   checkReproducible(run, overrides = {}) -> { reproducible, splitSame, mismatches: [{ field, recorded,
//       rerun }], rerun: { metrics, splitHash } }
//       Re-runs run.seed with { ...run.settings, ...overrides } and compares the split fingerprint and every
//       metric (to 1e-9). The same seed and settings reproduce; a changed setting (model, split, costs,
//       the data) does not.
//
// THE MONITORING PLAN
//   evaluatePlan({ system, plan, model, investigationCost = 50 }) -> {
//       firstAlert           first alert day on or after truth.day (null: never caught)
//       firstAlertAny        first alert day at all
//       detectionDelay       firstAlert - truth.day (null if never)
//       falseAlarmDays       alert days before truth.day (the clean period launchDay .. truth.day - 1)
//       alerts               [{ day, rule, value, threshold, feature? }], rule: 'psi' | 'score' | 'delayed' | 'prevalence'
//       byRule               { psi: first day or null, score, delayed, prevalence }  (only the monitors in the plan)
//       costUntilDetection   what the failure cost before the first true alert (to the end when never
//                            caught): over truth.day .. the day before it, the sum of each day's REGRET
//                            minus the clean mean regret (a day better than clean counts 0). Regret = the expected cost of the served
//                            decisions minus that of the best decisions (flag by the true probability p, the
//                            same capacity): label noise cancels, so it is smooth and never negative on
//                            average
//       alarmCost            falseAlarmDays * investigationCost
//       totalCost            costUntilDetection + alarmCost   (lower is better)
//       cleanDayCost         the mean clean-period regret per day (see costUntilDetection), daily }
//     plan = { monitors, consecutive = 2 }, monitors = (a monitor that is absent is off)
//       psi:     { threshold: 0.25, window: 7, bins: 10, features: SIGNAL_FEATURES }  PSI of the served
//                features of the last `window` days against history; alert when the largest > threshold
//       score:   { threshold: 0.25, window: 7, bins: 10 }  PSI of the model's scores against history
//       delayed: { drop: 0.1, window: 14, minPositives: 15 }  AUC of the labels that have ARRIVED in the
//                last `window` days, scored with the predictions made at the time; alert when it falls more
//                than `drop` below the history AUC (monitoring.evaluateAlerts' accuracy rule, on AUC)
//       prevalence: { ratio: 1.5, window: 14, minLabels: 200 }  the positive share among the labels that
//                arrived in the last `window` days; alert when it is more than `ratio` times (or less than
//                1 / ratio of) the history share
//     A rule is in alert on a day when it breached on that day and the consecutive - 1 days before. The
//     monitors see only what a team would see that day (labels only once they have arrived).
//   SENSIBLE_PLAN, DELAYED_ONLY_PLAN   two reference plans.
//
// THE INVESTIGATION
//   investigate(system, hypothesis, { asOf, window = 10, model = 'logistic', unit = 50, remedy = true }) -> {
//       hypothesis, confirmed, reasons, evidence, remedy }   (remedy: false skips the remedy costing, which
//       is most of the time of a call, and returns remedy: null)
//     hypothesis = { kind: one of FAILURE_KINDS, feature? } (feature: a name, for skew and covariate; the
//       feature with the largest PSI when omitted). asOf: the day of the investigation (default truth.day +
//       labelDelay + window, so the labels of the new regime have arrived; clamped to the last day).
//     evidence = the numbers a team would pull after an alert, on the last `window` days:
//       featureTable   [{ feature, psi, verdict, mismatch, identifier }] PSI of each served feature against
//                      history, and `mismatch`: the share of rows whose served value differs from the same
//                      feature recomputed offline from the raw inputs (the standard skew check)
//       scoreDrift     PSI of the model's scores
//       delayed        { n, positives, auc, baselineAuc, drop, accuracy, recall, prevalence, meanScore,
//                      prevalenceRatio } from the labels that arrived in the window (ratio > 1: more
//                      positives than the model predicted); accuracy and recall at the cost threshold.
//                      The rules and the delayed monitor use AUC, not accuracy: with 6% positives a model
//                      that flags nothing is 94% accurate, so accuracy says nothing about this task.
//       slices         { cohort: [{ name: 'established' | 'new', share, meanScore, prevalence }],
//                        feature: { feature, bins: [{ lo, hi, share, referenceShare }] } }
//       suspect        the feature with the largest PSI, asOf, window
//     SUPPORTED asOf: from truth.day + labelDelay + window (the default) onward, on systems of the default
//     size or similar (days >= 50, perDay >= 40). Earlier, the labels that have arrived are still from the
//     old regime and a hypothesis that needs labels (label, concept) may stay unconfirmed; the rules are
//     built so that no WRONG hypothesis is confirmed at any asOf from truth.day + 1 (the skew and covariate
//     rules need no labels).
//     The rules (a hypothesis is CONFIRMED when its rule holds):
//       skew(f)       the served f differs from f recomputed offline on > 50% of rows
//       covariate(f)  f is a signal feature whose PSI > 0.25 and whose served values match the offline
//                     ones (< 5% mismatch): the input really moved
//       label         no signal feature moved (all PSI < 0.25), no skew, the delayed AUC is within 0.1 of
//                     the baseline, and the observed positive share is > 1.4 x the model's mean score
//       concept       no signal feature moved, no skew, and the delayed AUC fell by more than 0.15 (a drop
//                     between 0.10 and 0.15 confirms neither label nor concept: collect more labels)
//     remedy = { options: [{ kind, feasible, fixed, latencyDays, operational, total }] sorted by total,
//       best, bestTotal, forHypothesis: { kind, total, regret } }: the remedies of monitoring.js
//       (none / rollback / recalibrate / retrain) applied at asOf and costed on the rest of the stream:
//       fixed = REMEDY_COSTS fixed x unit, operational = the expected cost (true p, the review capacity per
//       day) of the days from asOf to the end, total = fixed + operational. forHypothesis = the remedy that
//       goes with the hypothesis (skew -> rollback, label -> recalibrate, concept -> retrain, covariate ->
//       none: the model is still right about the new inputs) and its regret against the best. CAUTION: a
//       correct diagnosis does not guarantee regret 0. The cheapest option is whatever the numbers say:
//       on seeds 1 to 6, rollback wins 5 of 6 skew systems (retrain can also repair a unit change), retrain
//       wins 5 of 6 concept systems, recalibrate 5 of 6 label systems, and for covariate drift the best is
//       none, recalibrate or retrain depending on the seed (the model is mostly still valid, but it was
//       also built on older entities). Regret after a right diagnosis is small (hundreds); after a wrong
//       one it is thousands.
//   remedyFor(kind)  the remedy that goes with a hypothesis kind.

import { rng, gauss } from './rng.js';
import { psi, psiVerdict } from './shift.js';
import { plattScale } from './calibration.js';
import { evaluateAlerts, REMEDIES, REMEDY_COSTS } from './monitoring.js';
import { fit, auc, averagePrecision, randomSplit, groupedSplit, temporalSplit } from './capstone2.js';

export const FEATURES = ['amount', 'velocity', 'merchantRisk', 'accountAge', 'deviceId'];
export const SIGNAL_FEATURES = FEATURES.slice(0, 4);
export const FAILURE_KINDS = ['skew', 'covariate', 'label', 'concept'];
export const WEIGHTS = [1.0, 0.8, 1.1, -0.7];
export const DEFAULT_COSTS = { miss: 100, falseAlarm: 5, review: 5 };

const ENTITY_OFFSET_SD = 3;   // how different entities are in risk
const ENTITY_MEAN_SD = 0.5;     // how different entities are in their typical inputs
const WITHIN_SD = Math.sqrt(1 - ENTITY_MEAN_SD ** 2);
const NEW_SHARE = 0.4;          // share of the entities that only appear after launch
const FOREST = { trees: 30 };   // forest options (the other fitters ignore them): fewer trees than capstone2's 60, to keep the labs quick
const SKEW_FACTOR = 100;
const COVARIATE_SHIFT = 1.5;
const LABEL_MULT = 3;
const sigmoid = z => 1 / (1 + Math.exp(-z));
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

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

const checkCosts = costs => {
  const ok = c => Number.isFinite(c) && c >= 0;
  if (!costs || !ok(costs.miss) || !ok(costs.falseAlarm) || !ok(costs.review) || costs.miss + costs.falseAlarm === 0) {
    throw new RangeError('costs must be { miss, falseAlarm, review }, finite and not negative (miss + falseAlarm > 0)');
  }
  return { miss: costs.miss, falseAlarm: costs.falseAlarm, review: costs.review };
};

// ---------------------------------------------------------------- the system

// The log-odds intercept that gives the average positive share `rate` over the established entities.
function calibrateBase(offsets, rate, seed) {
  const random = rng(hash32(seed, 0xca11b));
  const draws = Array.from({ length: 1500 }, () => {
    const e = Math.floor(random() * offsets.length);
    return offsets[e] + WEIGHTS.reduce((s, w) => s + w * WITHIN_SD * gauss(random), 0);
  });
  let lo = -30, hi = 30;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (mean(draws.map(z => sigmoid(mid + z))) < rate) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function makeTruth(seed, kind, launchDay, days, rate) {
  const r = rng(hash32(seed, 0xfa11));
  r(); r();
  const deploy = days - launchDay;
  const day = launchDay + Math.floor(deploy * (0.2 + 0.2 * r()));
  const feature = SIGNAL_FEATURES[Math.floor(r() * SIGNAL_FEATURES.length)];
  const mode = r() < 0.5 ? 'scale' : 'default';
  const truth = { kind, day };
  if (kind === 'skew') Object.assign(truth, { feature, mode, factor: SKEW_FACTOR, value: 0 });
  if (kind === 'covariate') Object.assign(truth, { feature, shift: COVARIATE_SHIFT });
  if (kind === 'label') Object.assign(truth, { prevalence: Math.min(0.9, rate * LABEL_MULT) });
  if (kind === 'concept') Object.assign(truth, { angle: Math.PI / 2 });
  return truth;
}

const rotated = (w, angle) => {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [w[0] * c - w[1] * s, w[0] * s + w[1] * c, w[2] * c - w[3] * s, w[2] * s + w[3] * c];
};

export function makeCapstoneSystem({
  seed = 1, days = 90, entities = 60, perDay = 80, failure, labelDelay = 7, positiveRate = 0.06, costs, capacity,
} = {}) {
  if (!Number.isInteger(days) || days < 40) throw new RangeError('makeCapstoneSystem: days must be a whole number >= 40');
  if (!Number.isInteger(perDay) || perDay < 20) throw new RangeError('makeCapstoneSystem: perDay must be a whole number >= 20');
  if (!Number.isInteger(entities) || entities < 10) throw new RangeError('makeCapstoneSystem: entities must be a whole number >= 10');
  if (!Number.isInteger(labelDelay) || labelDelay < 0) throw new RangeError('makeCapstoneSystem: labelDelay must be a whole number >= 0');
  if (!(positiveRate > 0 && positiveRate < 0.5)) throw new RangeError('makeCapstoneSystem: positiveRate must be in (0, 0.5)');
  if (failure !== undefined && !FAILURE_KINDS.includes(failure)) throw new RangeError(`makeCapstoneSystem: failure must be one of ${FAILURE_KINDS.join(', ')}`);
  const costTable = checkCosts(costs ?? DEFAULT_COSTS);
  const cap = capacity ?? Math.round(0.3 * perDay);
  if (!(cap >= 0)) throw new RangeError('makeCapstoneSystem: capacity must be >= 0');

  const launchDay = Math.round(0.4 * days);
  const kind = failure ?? FAILURE_KINDS[hash32(seed, 0x4b1d) % FAILURE_KINDS.length];
  const truth = makeTruth(seed, kind, launchDay, days, positiveRate);

  // Entities: the established ones exist from day 0, the new ones appear after launch.
  const er = rng(hash32(seed, 0xe771));
  const established = Math.max(2, Math.round(entities * (1 - NEW_SHARE)));
  const entityTable = Array.from({ length: entities }, (_, id) => {
    er(); er();
    const isNew = id >= established;
    return {
      id, isNew,
      offset: ENTITY_OFFSET_SD * gauss(er),
      mean: SIGNAL_FEATURES.map(() => ENTITY_MEAN_SD * gauss(er)),
      quirk: 10 * er(),
      entryDay: isNew ? launchDay + Math.floor(er() * 0.25 * (days - launchDay)) : 0,
    };
  });
  const base = calibrateBase(entityTable.slice(0, established).map(e => e.offset), positiveRate, seed);
  const activeAt = d => entityTable.filter(e => e.entryDay <= d);
  const featureIdx = truth.feature ? FEATURES.indexOf(truth.feature) : -1;

  const worldAt = day => {
    const on = day >= truth.day;
    const w = { weights: WEIGHTS, offsets: [0, 0, 0, 0], prevalence: null, skew: null, priorLogit: 0 };
    if (!on) return w;
    if (truth.kind === 'covariate') w.offsets[featureIdx] = truth.shift;
    if (truth.kind === 'concept') w.weights = rotated(WEIGHTS, truth.angle);
    if (truth.kind === 'label') {
      w.prevalence = truth.prevalence;
      w.priorLogit = Math.log(truth.prevalence / (1 - truth.prevalence)) - Math.log(positiveRate / (1 - positiveRate));
    }
    if (truth.kind === 'skew') w.skew = truth;
    return w;
  };

  const rows = [];
  for (let day = 0; day < days; day++) {
    const world = worldAt(day), active = activeAt(day);
    for (let i = 0; i < perDay; i++) {
      const r = rng(hash32(seed, day, i));
      r(); r(); r();
      const target = world.prevalence === null ? null : (r() < world.prevalence ? 1 : 0);
      let entity, xTrue, p, label;
      for (let attempt = 0; attempt < 400; attempt++) {
        entity = active[Math.floor(r() * active.length)];
        xTrue = SIGNAL_FEATURES.map((_, j) => entity.mean[j] + WITHIN_SD * gauss(r) + world.offsets[j]);
        const logit = base + entity.offset + world.weights.reduce((s, w, j) => s + w * xTrue[j], 0);
        p = sigmoid(logit + world.priorLogit);
        label = r() < sigmoid(logit) ? 1 : 0;
        if (target === null || label === target) break;
      }
      const quirk = entity.quirk + 0.02 * gauss(r);
      const all = [...xTrue, quirk];
      const x = all.slice();
      if (world.skew) x[featureIdx] = world.skew.mode === 'scale' ? all[featureIdx] * world.skew.factor : world.skew.value;
      rows.push({
        id: day * perDay + i, day, i, t: day + (i + 0.5) / perDay, entity: entity.id, isNew: entity.isNew,
        x, xTrue: all, label, p, arrival: day < launchDay ? day : day + labelDelay,
      });
    }
  }
  const history = rows.filter(r => r.day < launchDay);
  const stream = rows.filter(r => r.day >= launchDay);
  return {
    seed, days, entities, perDay, launchDay, labelDelay, positiveRate, costs: costTable, capacity: cap,
    featureNames: FEATURES.slice(), weights: WEIGHTS.slice(), rows, history, stream, truth, base, entityTable,
  };
}

// ---------------------------------------------------------------- operational metric

export function reviewThreshold(costs = DEFAULT_COSTS) {
  const c = checkCosts(costs);
  return (c.review + c.falseAlarm) / (c.miss + c.falseAlarm);
}

export function operationalMetric(probas, labels, costs = DEFAULT_COSTS, capacity = Infinity) {
  if (probas.length !== labels.length) throw new RangeError('operationalMetric: probas and labels need the same length');
  if (!(capacity >= 0)) throw new RangeError('operationalMetric: capacity must be >= 0');
  const c = checkCosts(costs);
  const threshold = reviewThreshold(c);
  const n = labels.length;
  const order = probas.map((_, i) => i).filter(i => probas[i] >= threshold)
    .sort((a, b) => probas[b] - probas[a] || a - b);
  const flaggedIdx = order.slice(0, Math.floor(capacity));
  const isFlagged = new Set(flaggedIdx);
  let tp = 0, fp = 0, fn = 0, tn = 0, positives = 0;
  labels.forEach((l, i) => {
    if (l === 1) positives++;
    if (isFlagged.has(i)) { if (l === 1) tp++; else fp++; } else if (l === 1) fn++; else tn++;
  });
  const totalCost = flaggedIdx.length * c.review + fp * c.falseAlarm + fn * c.miss;
  return {
    threshold, capacity, n, positives, wouldFlag: order.length, flagged: flaggedIdx.length,
    capacityBinding: order.length > capacity, flaggedIdx, tp, fp, fn, tn,
    precision: flaggedIdx.length ? tp / flaggedIdx.length : 0, recall: positives ? tp / positives : 0,
    totalCost, expectedCost: n ? totalCost / n : 0, costFlagNone: positives * c.miss, savings: positives * c.miss - totalCost,
  };
}

// ---------------------------------------------------------------- split and candidates

const xy = rows => ({ X: rows.map(r => r.x), y: rows.map(r => r.label) });
const splitRows = rows => rows.map(r => ({ customer: r.entity, t: r.t }));
const SPLITTERS = { random: randomSplit, grouped: groupedSplit, temporal: temporalSplit };

const cleanDeployed = system => system.stream.filter(r => r.day < system.truth.day);

export function chooseSplit(system, kind, { testFraction = 0.25, model = 'forest', seed, fitOpts = {} } = {}) {
  if (!Object.hasOwn(SPLITTERS, kind)) throw new RangeError(`chooseSplit: unknown split "${kind}" (use random, grouped, temporal)`);
  const s = seed ?? system.seed;
  const hist = system.history;
  const { train, test } = SPLITTERS[kind](splitRows(hist), { testFraction, seed: s });
  const trainRows = train.map(i => hist[i]), testRows = test.map(i => hist[i]);
  const trainEntities = new Set(trainRows.map(r => r.entity));
  const sharedEntities = new Set(testRows.filter(r => trainEntities.has(r.entity)).map(r => r.entity)).size;
  const trainsOnFuture = Math.max(...trainRows.map(r => r.t)) > Math.min(...testRows.map(r => r.t));
  const tr = xy(trainRows);
  const fitted = fit(model, tr.X, tr.y, { seed: s, ...FOREST, ...fitOpts });
  const te = xy(testRows);
  const estimate = auc(fitted.predictProba(te.X), te.y);
  const cleanRows = cleanDeployed(system);
  const all = xy(cleanRows), fresh = xy(cleanRows.filter(r => r.isNew));
  const realisedAll = auc(fitted.predictProba(all.X), all.y);
  const freshAuc = fresh.y.length ? auc(fitted.predictProba(fresh.X), fresh.y) : NaN;
  const realised = Number.isNaN(freshAuc) ? realisedAll : freshAuc;
  return { kind, train, test, sharedEntities, trainsOnFuture, estimate, realised, realisedAll, optimism: estimate - realised, model, testFraction };
}

export function trainCandidates(system, split, { seed, capacity, costs } = {}) {
  const s = seed ?? system.seed;
  const table = costs ?? system.costs;
  const hist = system.history;
  const tr = xy(split.train.map(i => hist[i])), te = xy(split.test.map(i => hist[i]));
  const cap = capacity ?? Math.round((system.capacity * te.y.length) / system.perDay);
  const candidates = ['baseline', 'logistic', 'forest'].map(name => {
    const model = fit(name, tr.X, tr.y, { seed: s, ...FOREST });
    const probas = model.predictProba(te.X);
    return {
      name, model, probas, auc: auc(probas, te.y), averagePrecision: averagePrecision(probas, te.y),
      operational: operationalMetric(probas, te.y, table, cap),
    };
  });
  const best = candidates.reduce((a, b) => (b.operational.expectedCost < a.operational.expectedCost ? b : a)).name;
  return { split, labels: te.y, candidates, byName: Object.fromEntries(candidates.map(c => [c.name, c])), best };
}

const deployedCache = new WeakMap();

export function deployedModel(system, name = 'logistic') {
  if (!deployedCache.has(system)) deployedCache.set(system, new Map());
  const cache = deployedCache.get(system);
  if (!cache.has(name)) {
    const { X, y } = xy(system.history);
    cache.set(name, fit(name, X, y, { seed: system.seed, ...FOREST }));
  }
  return cache.get(name);
}

// ---------------------------------------------------------------- reproducibility

const DEFAULT_SETTINGS = { system: {}, splitKind: 'grouped', model: 'forest', testFraction: 0.25, costs: DEFAULT_COSTS, capacity: undefined, fitOpts: {} };

function fingerprint(split) {
  let h = hash32(split.train.length, split.test.length);
  for (const i of split.train) h = hash32(h, i);
  h = hash32(h, 0x7e57);
  for (const i of split.test) h = hash32(h, i);
  return h.toString(16).padStart(8, '0');
}

export function runExperiment(seed, settings = {}) {
  const st = { ...DEFAULT_SETTINGS, ...settings };
  const system = makeCapstoneSystem({ ...st.system, seed, costs: st.costs });
  const { train, test } = SPLITTERS[st.splitKind] ? SPLITTERS[st.splitKind](splitRows(system.history), { testFraction: st.testFraction, seed }) : (() => { throw new RangeError(`runExperiment: unknown split "${st.splitKind}"`); })();
  const tr = xy(train.map(i => system.history[i])), te = xy(test.map(i => system.history[i]));
  const fitted = fit(st.model, tr.X, tr.y, { seed, ...FOREST, ...(st.fitOpts ?? {}) });
  const probas = fitted.predictProba(te.X);
  const cap = st.capacity === 'Infinity' ? Infinity : (st.capacity ?? Math.round((system.capacity * te.y.length) / system.perDay));
  const op = operationalMetric(probas, te.y, st.costs, cap);
  const split = { kind: st.splitKind, train, test };
  return {
    system, split, probas, labels: te.y, splitHash: fingerprint(split),
    metrics: {
      auc: auc(probas, te.y), averagePrecision: averagePrecision(probas, te.y), expectedCost: op.expectedCost,
      totalCost: op.totalCost, flagged: op.flagged, precision: op.precision, recall: op.recall, threshold: op.threshold,
    },
  };
}

export function repro(seed, settings, split, metrics) {
  // JSON has no Infinity (a capacity of Infinity) and no NaN (an AUC with one class missing): the first is kept
  // as the string 'Infinity', the second comes back as null and checkReproducible reads null as NaN.
  return JSON.parse(JSON.stringify({
    version: 1, seed, settings,
    split: { kind: split.kind, nTrain: split.train.length, nTest: split.test.length, hash: fingerprint(split) },
    metrics,
  }, (key, v) => (v === Infinity ? 'Infinity' : v)));
}

export function checkReproducible(run, overrides = {}) {
  const settings = { ...run.settings, ...overrides };
  const out = runExperiment(run.seed, settings);
  const mismatches = [];
  if (out.splitHash !== run.split.hash) mismatches.push({ field: 'split', recorded: run.split.hash, rerun: out.splitHash });
  for (const key of Object.keys(run.metrics)) {
    const a = run.metrics[key], b = out.metrics[key];
    const nan = v => v === null || (typeof v === 'number' && Number.isNaN(v));
    const same = (nan(a) && nan(b)) || (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= 1e-9) || a === b;
    if (!same) mismatches.push({ field: key, recorded: a, rerun: b });
  }
  return { reproducible: mismatches.length === 0, splitSame: out.splitHash === run.split.hash, mismatches, rerun: { metrics: out.metrics, splitHash: out.splitHash } };
}

// ---------------------------------------------------------------- the deployed series

const cacheOf = new WeakMap();
function served(system, modelName) {
  if (!cacheOf.has(system)) cacheOf.set(system, new Map());
  const c = cacheOf.get(system);
  if (!c.has(modelName)) {
    const model = deployedModel(system, modelName);
    const scores = model.predictProba(system.rows.map(r => r.x));       // what was predicted when served
    const histScores = scores.slice(0, system.history.length);
    const ref = FEATURES.map((_, j) => system.history.map(r => r.x[j]));
    c.set(modelName, { model, scores, histScores, ref, baselineAuc: auc(histScores, system.history.map(r => r.label)) });
  }
  return c.get(modelName);
}

const dayRows = (system, d) => system.rows.slice(d * system.perDay, (d + 1) * system.perDay);

// Expected cost of a set of decisions, using the TRUE probabilities p of the cases (no label noise): a flagged
// case costs review + (1 - p) * falseAlarm, an unflagged one p * miss.
function expectedCost(flaggedIdx, p, costs) {
  const flagged = new Set(flaggedIdx);
  let total = 0;
  p.forEach((v, i) => { total += flagged.has(i) ? costs.review + (1 - v) * costs.falseAlarm : v * costs.miss; });
  return total;
}

// What serving `scores` costs on one day, and what the best possible decisions (the oracle that knows p)
// would have cost: regret = served - oracle >= 0.
function dayOutcome(system, scores, rows) {
  const p = rows.map(r => r.p), y = rows.map(r => r.label);
  const mine = expectedCost(operationalMetric(scores, y, system.costs, system.capacity).flaggedIdx, p, system.costs);
  const best = expectedCost(operationalMetric(p, y, system.costs, system.capacity).flaggedIdx, p, system.costs);
  return { cost: mine, oracle: best, regret: mine - best };
}

function dayRegrets(system, sv) {
  const out = [];
  for (let d = system.launchDay; d < system.days; d++) out.push(dayOutcome(system, sv.scores.slice(d * system.perDay, (d + 1) * system.perDay), dayRows(system, d)).regret);
  return out;
}

export const SENSIBLE_PLAN = {
  monitors: {
    psi: { threshold: 0.25, window: 7 }, score: { threshold: 0.25, window: 7 },
    delayed: { drop: 0.1, window: 14 }, prevalence: { ratio: 1.5, window: 14 },
  },
  consecutive: 2,
};
export const DELAYED_ONLY_PLAN = { monitors: { delayed: { drop: 0.1, window: 14 } }, consecutive: 2 };

const rowsBetween = (system, from, to) => system.rows.slice(from * system.perDay, (to + 1) * system.perDay);

export function evaluatePlan({ system, plan, model = 'logistic', investigationCost = 50 } = {}) {
  if (!system || !plan) throw new RangeError('evaluatePlan: needs a system and a plan');
  const mon = plan.monitors ?? {};
  const consecutive = plan.consecutive ?? 2;
  const sv = served(system, model);
  const psiCfg = mon.psi ? { threshold: 0.25, window: 7, bins: 10, features: SIGNAL_FEATURES, ...mon.psi } : null;
  const scoreCfg = mon.score ? { threshold: 0.25, window: 7, bins: 10, ...mon.score } : null;
  const delCfg = mon.delayed ? { drop: 0.1, window: 14, minPositives: 15, ...mon.delayed } : null;
  const prevCfg = mon.prevalence ? { ratio: 1.5, window: 14, minLabels: 200, ...mon.prevalence } : null;
  if (psiCfg) for (const f of psiCfg.features) if (!FEATURES.includes(f)) throw new RangeError(`evaluatePlan: unknown feature "${f}"`);

  const daily = [];
  for (let d = system.launchDay; d < system.days; d++) {
    const row = { day: d, psiMax: 0, psiMaxFeature: null, scoreDrift: 0, accuracyDelayed: null };
    if (psiCfg) {
      const lo = Math.max(system.launchDay, d - psiCfg.window + 1);
      const win = rowsBetween(system, lo, d).slice(0, (d - lo + 1) * system.perDay);
      let best = -1;
      for (const f of psiCfg.features) {
        const j = FEATURES.indexOf(f);
        const v = psi(sv.ref[j], win.map(r => r.x[j]), psiCfg.bins);
        if (v > best) { best = v; row.psiMaxFeature = f; }
      }
      row.psiMax = best;
    }
    if (scoreCfg) {
      const lo = Math.max(system.launchDay, d - scoreCfg.window + 1);
      row.scoreDrift = psi(sv.histScores, sv.scores.slice(lo * system.perDay, (d + 1) * system.perDay), scoreCfg.bins);
    }
    if (delCfg) {
      const idx = [];
      for (let k = system.launchDay * system.perDay; k < (d + 1) * system.perDay; k++) {
        const a = system.rows[k].arrival;
        if (a <= d && a > d - delCfg.window) idx.push(k);
      }
      const y = idx.map(k => system.rows[k].label);
      const pos = y.reduce((a, b) => a + b, 0);
      if (pos >= delCfg.minPositives && pos < y.length) row.accuracyDelayed = auc(idx.map(k => sv.scores[k]), y);
    }
    if (prevCfg) {
      let n = 0, pos = 0;
      for (let k = system.launchDay * system.perDay; k < (d + 1) * system.perDay; k++) {
        const a = system.rows[k].arrival;
        if (a <= d && a > d - prevCfg.window) { n++; pos += system.rows[k].label; }
      }
      row.prevalence = n >= prevCfg.minLabels ? pos / n : null;
    }
    daily.push(row);
  }
  const ev = evaluateAlerts({
    daily, baseline: { accuracy: sv.baselineAuc },
    monitors: { psi: psiCfg ? { threshold: psiCfg.threshold } : false, score: scoreCfg ? { threshold: scoreCfg.threshold } : false, accuracy: delCfg ? { drop: delCfg.drop } : false },
    policy: { consecutive },
  });
  const rename = r => (r === 'accuracy' ? 'delayed' : r);
  const alerts = ev.alerts.map(a => ({ ...a, rule: rename(a.rule) }));
  const byRule = {};
  for (const [r, v] of Object.entries(ev.rules)) byRule[rename(r)] = v.first;
  if (prevCfg) {
    const histShare = mean(system.history.map(r => r.label));
    let streak = 0;
    const days = [];
    for (const row of daily) {
      const breach = row.prevalence !== null && (row.prevalence > prevCfg.ratio * histShare || row.prevalence < histShare / prevCfg.ratio);
      streak = breach ? streak + 1 : 0;
      if (breach && streak >= consecutive) {
        days.push(row.day);
        alerts.push({ day: row.day, rule: 'prevalence', value: row.prevalence, threshold: histShare * prevCfg.ratio });
      }
    }
    byRule.prevalence = days.length ? days[0] : null;
    alerts.sort((a, b) => a.day - b.day);
  }
  const alertDays = [...new Set(alerts.map(a => a.day))];
  const failDay = system.truth.day;
  const trueDays = alertDays.filter(d => d >= failDay);
  const firstAlert = trueDays.length ? trueDays[0] : null;
  const falseAlarmDays = alertDays.filter(d => d < failDay).length;

  const costs = dayRegrets(system, sv);                    // index 0 = launchDay
  const cleanDayCost = mean(costs.slice(0, failDay - system.launchDay));
  const end = firstAlert ?? system.days;
  let costUntilDetection = 0;
  for (let d = failDay; d < end; d++) costUntilDetection += Math.max(0, costs[d - system.launchDay] - cleanDayCost);
  const alarmCost = falseAlarmDays * investigationCost;
  return {
    firstAlert, firstAlertAny: alertDays.length ? alertDays[0] : null, detectionDelay: firstAlert === null ? null : firstAlert - failDay, falseAlarmDays, alerts, byRule,
    costUntilDetection, alarmCost, totalCost: costUntilDetection + alarmCost, cleanDayCost, daily,
  };
}

// ---------------------------------------------------------------- the investigation

export function remedyFor(kind) {
  return { skew: 'rollback', label: 'recalibrate', concept: 'retrain', covariate: 'none' }[kind] ?? 'none';
}

const bothClasses = ys => { const s = ys.reduce((a, b) => a + b, 0); return s > 0 && s < ys.length; };

// The rows whose labels had arrived by `fromDay`, most recent `window` days of them.
function recentLabelled(system, fromDay, window) {
  const known = system.stream.filter(r => r.arrival <= fromDay);
  if (!known.length) return [];
  const last = Math.max(...known.map(r => r.day));
  return known.filter(r => r.day > last - window);
}

function remedyOptions(system, sv, fromDay, { window, unit, minLabels = 60 }) {
  const labelled = recentLabelled(system, fromDay, window);
  const ys = labelled.map(r => r.label);
  const feasible = labelled.length >= minLabels && bothClasses(ys) && ys.reduce((a, b) => a + b, 0) >= 10;
  const fitted = { none: sv.model };
  if (feasible) {
    const scoresOld = sv.model.predictProba(labelled.map(r => r.x));
    const platt = plattScale(scoresOld, ys, { logit: true });
    fitted.recalibrate = { predictProba: rows => sv.model.predictProba(rows).map(p => platt.predict(p)) };
    const { X, y } = xy(labelled);
    fitted.retrain = fit('logistic', X, y, { seed: system.seed });
  }
  const options = REMEDIES.map(kind => {
    const cost = REMEDY_COSTS[kind];
    const isFeasible = kind === 'none' || kind === 'rollback' || feasible;
    const live = fromDay + cost.latency;
    let total = 0;
    for (let d = fromDay; d < system.days; d++) {
      const rows = dayRows(system, d);
      let scores;
      if (d < live || kind === 'none' || !isFeasible) scores = sv.scores.slice(d * system.perDay, (d + 1) * system.perDay);
      else if (kind === 'rollback') scores = sv.model.predictProba(rows.map(r => r.xTrue));
      else scores = fitted[kind].predictProba(rows.map(r => r.x));
      total += dayOutcome(system, scores, rows).cost;
    }
    const fixed = cost.fixed * unit;
    return { kind, feasible: isFeasible, fixed, latencyDays: cost.latency, operational: total, total: fixed + total };
  }).sort((a, b) => a.total - b.total || REMEDIES.indexOf(a.kind) - REMEDIES.indexOf(b.kind));
  return options;
}

export function investigate(system, hypothesis, { asOf, window = 10, model = 'logistic', unit = 50, remedy = true } = {}) {
  if (!hypothesis || !FAILURE_KINDS.includes(hypothesis.kind)) throw new RangeError(`investigate: hypothesis.kind must be one of ${FAILURE_KINDS.join(', ')}`);
  if (hypothesis.feature !== undefined && !FEATURES.includes(hypothesis.feature)) throw new RangeError(`investigate: unknown feature "${hypothesis.feature}"`);
  const day = Math.min(system.days - 1, Math.max(system.launchDay, asOf ?? system.truth.day + system.labelDelay + window));
  const sv = served(system, model);
  const recent = rowsBetween(system, Math.max(system.launchDay, day - window + 1), day);
  const recentIdx = [];
  for (let k = Math.max(system.launchDay, day - window + 1) * system.perDay; k < (day + 1) * system.perDay; k++) recentIdx.push(k);

  const featureTable = FEATURES.map((f, j) => {
    const v = psi(sv.ref[j], recent.map(r => r.x[j]), 10);
    const off = recent.filter(r => Math.abs(r.x[j] - r.xTrue[j]) > 1e-9 * (1 + Math.abs(r.xTrue[j]))).length / recent.length;
    return { feature: f, psi: v, verdict: psiVerdict(v), mismatch: off, identifier: f === 'deviceId' };
  });
  const suspectRow = featureTable.filter(r => !r.identifier).reduce((a, b) => (b.psi > a.psi ? b : a));
  const scoreDrift = psi(sv.histScores, recentIdx.map(k => sv.scores[k]), 10);

  const arrived = [];
  for (let k = system.launchDay * system.perDay; k < (day + 1) * system.perDay; k++) {
    const a = system.rows[k].arrival;
    if (a <= day && a > day - window) arrived.push(k);
  }
  const ys = arrived.map(k => system.rows[k].label), ss = arrived.map(k => sv.scores[k]);
  const positives = ys.reduce((a, b) => a + b, 0);
  const dAuc = bothClasses(ys) ? auc(ss, ys) : null;
  const prevalence = ys.length ? positives / ys.length : null;
  const meanScore = mean(ss);
  const thr = reviewThreshold(system.costs);
  const hits = ys.filter((y, k) => (ss[k] >= thr ? 1 : 0) === y).length;
  const caught = ys.filter((y, k) => y === 1 && ss[k] >= thr).length;
  const delayed = {
    n: ys.length, positives, auc: dAuc, baselineAuc: sv.baselineAuc, drop: dAuc === null ? null : sv.baselineAuc - dAuc,
    accuracy: ys.length ? hits / ys.length : null, recall: positives ? caught / positives : null,
    prevalence, meanScore, prevalenceRatio: ys.length && meanScore > 0 ? prevalence / meanScore : null,
  };

  const cohort = ['established', 'new'].map(name => {
    const isNew = name === 'new';
    const idx = recentIdx.filter(k => system.rows[k].isNew === isNew);
    const lab = arrived.filter(k => system.rows[k].isNew === isNew);
    return {
      name, share: idx.length / recentIdx.length, meanScore: mean(idx.map(k => sv.scores[k])),
      prevalence: lab.length ? mean(lab.map(k => system.rows[k].label)) : null,
    };
  });
  const focus = hypothesis.feature ?? suspectRow.feature;
  const fj = FEATURES.indexOf(focus);
  const sortedRef = sv.ref[fj].slice().sort((a, b) => a - b);
  const edges = [1 / 3, 2 / 3].map(q => sortedRef[Math.floor(q * (sortedRef.length - 1))]);
  const binOf = v => (v <= edges[0] ? 0 : v <= edges[1] ? 1 : 2);
  const share = vals => { const c = [0, 0, 0]; vals.forEach(v => c[binOf(v)]++); return c.map(n => n / vals.length); };
  const rs = share(sv.ref[fj]), ws = share(recent.map(r => r.x[fj]));
  const bins = [0, 1, 2].map(b => ({ lo: b === 0 ? null : edges[b - 1], hi: b === 2 ? null : edges[b], share: ws[b], referenceShare: rs[b] }));

  const evidence = { featureTable, scoreDrift, delayed, slices: { cohort, feature: { feature: focus, bins } }, suspect: suspectRow.feature, asOf: day, window };

  const row = featureTable.find(r => r.feature === focus);
  const anySkew = featureTable.some(r => r.mismatch > 0.5 && !r.identifier);
  const signalMoved = featureTable.some(r => !r.identifier && r.psi >= 0.25);
  const reasons = [];
  let confirmed = false;
  const pct = v => `${(100 * v).toFixed(0)}%`;
  if (hypothesis.kind === 'skew') {
    confirmed = row.mismatch > 0.5 && !row.identifier;
    reasons.push(`${focus}: served value differs from the offline recomputation on ${pct(row.mismatch)} of rows (skew needs more than 50%)`);
  } else if (hypothesis.kind === 'covariate') {
    confirmed = !row.identifier && row.psi > 0.25 && row.mismatch < 0.05;
    reasons.push(`${focus}: PSI ${row.psi.toFixed(2)} (needs more than 0.25)${row.identifier ? ', but it is an identifier: new entities always move it' : ''}`);
    reasons.push(`${focus}: served value differs from the offline recomputation on ${pct(row.mismatch)} of rows (a real shift needs under 5%)`);
  } else if (hypothesis.kind === 'label') {
    const ok = !signalMoved && !anySkew && delayed.drop !== null && delayed.drop <= 0.1 && delayed.prevalenceRatio !== null && delayed.prevalenceRatio > 1.4;
    confirmed = ok;
    reasons.push(signalMoved ? 'a signal feature moved (PSI >= 0.25): label shift alone would leave the inputs alone' : 'no signal feature moved (all PSI < 0.25)');
    if (anySkew) reasons.push('a feature is served differently from its offline value: that is skew, not label shift');
    reasons.push(delayed.drop === null ? 'not enough labels yet to measure the delayed AUC' : `delayed AUC ${delayed.auc.toFixed(2)} vs baseline ${delayed.baselineAuc.toFixed(2)} (ranking holds when the drop is at most 0.10)`);
    if (delayed.prevalenceRatio !== null) reasons.push(`observed positive share is ${delayed.prevalenceRatio.toFixed(1)} x the mean predicted score (label shift needs more than 1.4)`);
  } else {
    confirmed = !signalMoved && !anySkew && delayed.drop !== null && delayed.drop > 0.15;
    reasons.push(signalMoved ? 'a signal feature moved (PSI >= 0.25): concept shift leaves the inputs alone' : 'no signal feature moved (all PSI < 0.25)');
    if (anySkew) reasons.push('a feature is served differently from its offline value: that is skew, not concept shift');
    reasons.push(delayed.drop === null ? 'not enough labels yet to measure the delayed AUC' : `delayed AUC ${delayed.auc.toFixed(2)} vs baseline ${delayed.baselineAuc.toFixed(2)} (concept shift needs a drop of more than 0.15)`);
  }

  const out = {
    hypothesis: { kind: hypothesis.kind, feature: ['skew', 'covariate'].includes(hypothesis.kind) ? focus : hypothesis.feature },
    confirmed, reasons, evidence, remedy: null,
  };
  if (remedy) {
    const options = remedyOptions(system, sv, day, { window, unit });
    const best = options[0];
    const asked = options.find(o => o.kind === remedyFor(hypothesis.kind));
    out.remedy = { options, best: best.kind, bestTotal: best.total, forHypothesis: { kind: asked.kind, total: asked.total, regret: asked.total - best.total } };
  }
  return out;
}
