// The maths behind the Monitoring lab (sims/labs/monitoring-lab.js). Pure functions, seeded, tested in
// monitoringlab.test.js. The stream, the models, the replay, the alert rules and the remedies come from
// monitoring.js; this file only adds what the lab needs on top of them:
//
//   scenarioEvents(scenario, severity, day)   the event list of one scenario (clean, covariate, skew, label,
//                                             concept, delayed) at a severity in 0..1 and the first day in force.
//   monitorsFor(settings)                     the monitors object for the lab's threshold / window controls.
//   buildRun(settings, { models })            stream + models + replay + the alerts of those settings.
//   alertsOf(run, settings)                   the alerts again for another threshold / drop (no new replay).
//   remedyWorld({ run, kind, fromDay })       the stream AS SERVED after a remedy: the served features and the
//                                             scoring model switch on the remedy's effective day. Replaying it
//                                             gives every chart the "after your choice" version of the world.
//   decide({ run, kind, fromDay, settings })  compareRemedies over the four options, scoreChoice for the pick
//                                             and the replay of the world after the pick.
//   featureView / sliceView / calibrationView  the three investigation views, read at one day from what a team
//                                             could know that day (served features; only labels that arrived).
//
// Days are zero-based here (day 0 is the first day of the stream); the lab shows day + 1.
import {
  FEATURES, SCENARIOS, REMEDIES, DEFAULT_MONITORS, DEFAULT_POLICY,
  makeStream, makeModels, replay, evaluateAlerts, compareRemedies, scoreChoice, recalibrate, retrainLogistic,
} from './monitoring.js';
import { psiTable } from './shift.js';
import { reliability } from './calibration.js';

export const SCENARIO_KEYS = ['clean', 'covariate', 'skew', 'label', 'concept', 'delayed'];
export const DAYS = 60;
export const PER_DAY = 200;
export const LABEL_DELAY = 7;          // days a label normally takes to arrive
export const DELAYED_LABEL_DELAY = 21; // ... in the "delayed labels with drift" scenario, from the event day on
export const ERROR_COST = 0.05;        // cost units of one wrong prediction (monitoring.js decisionCost default)
export const DEFAULTS = {
  scenario: 'skew', severity: 0.5, eventDay: 24, seed: 1,
  psiThreshold: DEFAULT_MONITORS.psi.threshold, inputWindow: DEFAULT_MONITORS.psi.window,
  accWindow: DEFAULT_MONITORS.accuracy.window, accDrop: DEFAULT_MONITORS.accuracy.drop,
};
export const MIN_EVENT_DAY = 9, MAX_EVENT_DAY = 44;

const isScenario = s => SCENARIO_KEYS.includes(s);

// How strong each event is at a severity in 0..1 (0 = nothing happens, 0.5 = the monitoring.js default).
export function eventStrength(scenario, severity) {
  const s = Math.min(1, Math.max(0, severity));
  return {
    shift: 3 * s,                         // covariate: spend moves by this many standard deviations
    factor: Math.round(10 ** (4 * s)),    // skew: spend is served multiplied by this (a unit change)
    prevalence: 0.5 * 0.24 ** (2 * s),    // label shift: the positive share (0.5 -> 0.12 at severity 0.5)
    angle: Math.PI * s,                   // concept shift: the labelling rule turns by this angle
    delay: scenario === 'delayed' ? DELAYED_LABEL_DELAY : LABEL_DELAY,
  };
}

export function scenarioEvents(scenario, severity = DEFAULTS.severity, day = DEFAULTS.eventDay) {
  if (!isScenario(scenario)) throw new RangeError(`scenarioEvents: unknown scenario "${scenario}" (use ${SCENARIO_KEYS.join(', ')})`);
  if (!Number.isInteger(day) || day < 0 || day >= DAYS) throw new RangeError('scenarioEvents: day must be a day inside the stream');
  const e = eventStrength(scenario, severity);
  switch (scenario) {
    case 'covariate': return [{ kind: 'covariate', day, feature: 'spend', shift: e.shift }];
    case 'skew': return [{ kind: 'skew', day, feature: 'spend', mode: 'scale', factor: e.factor }];
    case 'label': return [{ kind: 'label', day, prevalence: e.prevalence }];
    case 'concept': return [{ kind: 'concept', day, angle: e.angle }];
    case 'delayed': return [
      { kind: 'covariate', day, feature: 'spend', shift: e.shift },
      { kind: 'concept', day, angle: e.angle },
      { kind: 'delay', day, delay: e.delay },
    ];
    default: return [];
  }
}

export function monitorsFor(s = DEFAULTS) {
  return {
    psi: { ...DEFAULT_MONITORS.psi, threshold: s.psiThreshold, window: s.inputWindow },
    score: { ...DEFAULT_MONITORS.score, threshold: s.psiThreshold, window: s.inputWindow },
    accuracy: { ...DEFAULT_MONITORS.accuracy, drop: s.accDrop, window: s.accWindow },
  };
}

// ---- the run ---------------------------------------------------------------------------------------------------

// The models depend on the seed only (the reference data carries no events), so a caller may keep them.
export function modelsFor(seed = DEFAULTS.seed) {
  return makeModels(makeStream({ days: DAYS, perDay: PER_DAY, seed, labelDelay: LABEL_DELAY }));
}

export function buildRun(settings = DEFAULTS, { models } = {}) {
  const s = { ...DEFAULTS, ...settings };
  const stream = makeStream({ days: DAYS, perDay: PER_DAY, seed: s.seed, labelDelay: LABEL_DELAY, events: scenarioEvents(s.scenario, s.severity, s.eventDay) });
  const m = models ?? makeModels(stream);
  const monitors = monitorsFor(s);
  const result = replay({ stream, model: m.v1, monitors, policy: DEFAULT_POLICY });
  return { settings: s, stream, models: m, model: m.v1, previous: m.v2, result, daily: result.daily, baseline: result.baseline, alerts: result.alerts, summary: result.summary };
}

// The alert rules again for new thresholds (the daily series does not change with a threshold or a drop; it does
// with a window, which needs buildRun). Returns what evaluateAlerts returns plus the first day of each rule.
export function alertsOf(run, settings) {
  const monitors = monitorsFor({ ...run.settings, ...settings });
  const r = evaluateAlerts({ daily: run.daily, baseline: run.baseline, monitors, policy: DEFAULT_POLICY });
  const first = { psi: r.rules.psi?.first ?? null, score: r.rules.score?.first ?? null, accuracy: r.rules.accuracy?.first ?? null, any: r.first };
  return { ...r, first };
}

// What a monitor reading looked like when each rule first fired, and how many alert days each has had up to `day`.
export function alertLog(alerts, day) {
  const out = {};
  for (const rule of ['psi', 'score', 'accuracy']) {
    const mine = alerts.alerts.filter(a => a.rule === rule && a.day <= day);
    out[rule] = { first: mine[0] ?? null, days: mine.length };
  }
  return out;
}

// ---- remedies ----------------------------------------------------------------------------------------------------

// The most recent `window` days of labels that had ARRIVED by fromDay (the same rule applyRemedy uses).
function recentLabelled(stream, fromDay, window) {
  const known = stream.rows.filter(r => r.arrival <= fromDay);
  if (!known.length) return [];
  const last = Math.max(...known.map(r => r.day));
  return known.filter(r => r.day > last - window);
}

const bothClasses = rows => { const s = rows.reduce((a, r) => a + r.label, 0); return s > 0 && s < rows.length; };

const LATENCY = { none: 0, rollback: 0, recalibrate: 0, retrain: 3 };

// The world after `kind` is applied on `fromDay`, in the shape replay() takes: a stream whose rows carry the
// features the pipeline serves, and a model that scores a row with the right version for its day. A rollback
// serves the true features again (the release bug is gone) and the previous version; recalibrate and retrain
// switch to a model fitted on the labels that had arrived (retrain after its 3 days of latency). With too few
// labels the remedy is infeasible and nothing changes.
export function remedyWorld({ run, kind, fromDay, window = 10, minLabels = 60 }) {
  if (!REMEDIES.includes(kind)) throw new RangeError(`remedyWorld: unknown remedy "${kind}"`);
  const { stream, model, previous } = run;
  const effectiveDay = fromDay + LATENCY[kind];
  let after = model, undoSkew = false, feasible = true, labelsUsed = 0;
  if (kind === 'rollback') { undoSkew = true; after = previous ?? model; }
  if (kind === 'recalibrate' || kind === 'retrain') {
    const rows = recentLabelled(stream, fromDay, window);
    labelsUsed = rows.length;
    if (rows.length < minLabels || !bothClasses(rows)) feasible = false;
    else after = kind === 'retrain' ? retrainLogistic(rows, { name: `${model.name}-retrained` }) : recalibrate(model, rows);
  }
  const live = new Map();                  // served feature array -> true when the new version scores it
  const rows = stream.rows.map(r => {
    const x = undoSkew && r.day >= effectiveDay ? r.xTrue : r.x;
    if (r.day >= effectiveDay) live.set(x, true);
    return x === r.x ? r : { ...r, x };
  });
  const composite = { ...model, name: `${model.name}>${after.name}`, score: x => (live.has(x) ? after.score(x) : model.score(x)) };
  return { kind, fromDay, effectiveDay, feasible, labelsUsed, after, stream: { ...stream, rows }, model: composite };
}

// A run of the world after a remedy: the same shape as buildRun's result, so the lab draws it the same way.
export function runWithRemedy(run, kind, fromDay, settings = run.settings) {
  const world = remedyWorld({ run, kind, fromDay });
  const monitors = monitorsFor({ ...run.settings, ...settings });
  const result = replay({ stream: world.stream, model: world.model, monitors, policy: DEFAULT_POLICY });
  return { ...run, stream: world.stream, model: world.model, result, daily: result.daily, baseline: result.baseline, alerts: result.alerts, summary: result.summary, remedy: world };
}

// The four options compared from `fromDay`, the learner's pick scored against the cheapest, and the world after the pick.
export function decide({ run, kind, fromDay, settings = run.settings }) {
  const comparison = compareRemedies({ stream: run.stream, fromDay, model: run.model, previous: run.previous, kinds: REMEDIES });
  const choice = scoreChoice(comparison, kind);
  const after = runWithRemedy(run, kind, fromDay, settings);
  return { kind, fromDay, comparison, choice, after, feasible: after.remedy.feasible, labelsUsed: after.remedy.labelsUsed, effectiveDay: after.remedy.effectiveDay };
}

// ---- investigation -----------------------------------------------------------------------------------------------

const featureIndex = f => (typeof f === 'number' ? f : FEATURES.indexOf(f));
const referenceColumn = (run, j) => run.stream.reference.rows.map(r => r.x[j]);

// The rows served in the last `window` days up to `day`.
export function recentRows(run, day, window = 7) {
  const per = run.stream.perDay;
  return run.stream.rows.slice(Math.max(0, day - window + 1) * per, (day + 1) * per);
}

// Rows of the last `span` days whose label has already arrived (what a team could use to check the model).
export function labelledRows(run, day, span = 21) {
  const per = run.stream.perDay;
  return run.stream.rows.slice(Math.max(0, day - span + 1) * per, (day + 1) * per).filter(r => r.arrival <= day);
}

// Train versus recent, one feature: the reference deciles and the share of recent rows in each.
export function featureView(run, day, { feature = 0, window = 7 } = {}) {
  const j = featureIndex(feature);
  const recent = recentRows(run, day, window).map(r => r.x[j]);
  const t = psiTable(referenceColumn(run, j), recent, 10);
  return {
    feature: FEATURES[j], window, n: recent.length, psi: t.psi,
    bins: t.rows.map(r => ({ lo: r.lo, hi: r.hi, reference: r.p, recent: r.q })),
    recentMean: recent.reduce((a, v) => a + v, 0) / recent.length,
    referenceMean: referenceColumn(run, j).reduce((a, v) => a + v, 0) / run.stream.reference.rows.length,
  };
}

const terciles = values => {
  const s = values.slice().sort((a, b) => a - b);
  return [s[Math.floor(s.length / 3)], s[Math.floor((2 * s.length) / 3)]];
};
const sliceOf = (v, cuts) => (v < cuts[0] ? 0 : v < cuts[1] ? 1 : 2);

// Slice by one feature (its lower, middle and upper third in the reference data): how many rows fall in each slice,
// and the accuracy of the model there on the labels that have arrived, against the same slice of the reference holdout.
export function sliceView(run, day, { feature = 0, span = 21 } = {}) {
  const j = featureIndex(feature);
  const cuts = terciles(referenceColumn(run, j));
  const hold = run.stream.reference.holdout;
  const lab = labelledRows(run, day, span);
  const recentAll = recentRows(run, day, 7);
  const acc = (rows, model) => {
    const out = [0, 1, 2].map(() => ({ n: 0, right: 0 }));
    for (const r of rows) {
      const k = sliceOf(r.x[j], cuts), a = out[k];
      a.n++; a.right += (model.score(r.x) >= 0.5 ? 1 : 0) === r.label ? 1 : 0;
    }
    return out;
  };
  const refAcc = acc(hold, run.models.v1), nowAcc = acc(lab, run.model);
  const share = rows => { const c = [0, 0, 0]; rows.forEach(r => { c[sliceOf(r.x[j], cuts)]++; }); return c.map(v => (rows.length ? v / rows.length : 0)); };
  const refShare = share(run.stream.reference.rows), nowShare = share(recentAll);
  return {
    feature: FEATURES[j], cuts, labelled: lab.length,
    slices: [0, 1, 2].map(k => ({
      slice: ['low', 'middle', 'high'][k],
      referenceShare: refShare[k], recentShare: nowShare[k],
      referenceAccuracy: refAcc[k].n ? refAcc[k].right / refAcc[k].n : null,
      recentAccuracy: nowAcc[k].n ? nowAcc[k].right / nowAcc[k].n : null,
      labelled: nowAcc[k].n,
    })),
  };
}

// Score calibration: five score bands, the share of positives actually seen in each (labels that arrived), for the
// reference holdout and for the recent rows, and the two averages.
export function calibrationView(run, day, { span = 21, bins = 5 } = {}) {
  const hold = run.stream.reference.holdout;
  const lab = labelledRows(run, day, span);
  const mean = xs => (xs.length ? xs.reduce((a, v) => a + v, 0) / xs.length : null);
  const hs = hold.map(r => run.models.v1.score(r.x)), hy = hold.map(r => r.label);
  const ns = lab.map(r => run.model.score(r.x)), ny = lab.map(r => r.label);
  const ref = reliability(hs, hy, bins), now = ns.length ? reliability(ns, ny, bins) : null;
  return {
    bins: ref.map((b, k) => ({
      lo: b.lo, hi: b.hi,
      reference: b.observedRate, referenceCount: b.count,
      recent: now ? now[k].observedRate : null, recentCount: now ? now[k].count : 0,
    })),
    labelled: lab.length,
    referenceMeanScore: mean(hs), referencePositiveRate: mean(hy),
    recentMeanScore: mean(ns), recentPositiveRate: mean(ny),
  };
}

export { FEATURES, REMEDIES, SCENARIOS };
