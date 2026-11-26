// Pure helpers for the mini-batch lab: the regression data (generated, or the penguins with their missing
// values dropped), both axes standardised; the view of the loss plot; and how the lab reads the three runs
// (full batch, mini-batch, SGD) that sgdcompare.js computes. No DOM, no Math.random.
import { rng, gauss } from './rng.js';
import { fitStandardizer } from './tabular.js';
import { lossAt, leastSquares } from './sgdcompare.js';

export const GENERATED_N = 80;

// Both columns to zero mean and unit spread (population standard deviation), as a list of { x, y }.
// `stats` carries the mean and spread of each column, so a learner-facing number can be turned back into units.
export function standardisePoints(raw) {
  const fx = fitStandardizer(raw.map(p => p.x)), fy = fitStandardizer(raw.map(p => p.y));
  return { data: raw.map(p => ({ x: (p.x - fx.mean) / fx.sd, y: (p.y - fy.mean) / fy.sd })), stats: { x: { mean: fx.mean, sd: fx.sd }, y: { mean: fy.mean, sd: fy.sd } } };
}

// A seeded cloud with an upward trend (correlation about 0.7 before standardising), standardised.
export function generatedData(seed, n = GENERATED_N) {
  const random = rng(seed);
  const raw = Array.from({ length: n }, () => { const x = gauss(random); return { x, y: 0.7 * x + 0.7 * gauss(random) }; });
  return standardisePoints(raw).data;
}

// Flipper length (mm) -> body mass (g) from the parsed penguins table. A row missing either number (the CSV
// writes NA, parsed as null) is dropped; `dropped` says how many so the UI can tell the learner.
export function penguinData(table) {
  const raw = [];
  for (const row of table.rows) {
    const f = row.flipper_length_mm, m = row.body_mass_g;
    if (typeof f === 'number' && typeof m === 'number' && Number.isFinite(f) && Number.isFinite(m)) raw.push({ x: f, y: m });
  }
  return { ...standardisePoints(raw), total: table.rows.length, dropped: table.rows.length - raw.length };
}

// The window of the loss plot: both axes cover the same span, so a round bowl looks round. The start of
// every path sits inside it, away from the lowest point.
export const VIEW = { slope: [-2, 3], intercept: [-2, 3] };
export const START = { slope: -1, intercept: 2 };
export const toPlot = (w, view = VIEW) => ({
  x: (w.slope - view.slope[0]) / (view.slope[1] - view.slope[0]) * 10,
  y: (w.intercept - view.intercept[0]) / (view.intercept[1] - view.intercept[0]) * 10,
});
export const fromPlot = (p, view = VIEW) => ({
  slope: view.slope[0] + p.x / 10 * (view.slope[1] - view.slope[0]),
  intercept: view.intercept[0] + p.y / 10 * (view.intercept[1] - view.intercept[0]),
});
// The loss as a function of a point of the 0..10 plot square (what contours() in gd.js wants).
export const lossOnPlot = (data, view = VIEW) => (x, y) => lossAt(data, fromPlot({ x, y }, view));

// Length of a path, and the share of that walk that did not make progress: (length - straight distance from
// the first point to the last) / length. A straight walk is 0; a walk that zigzags or returns is close to 1.
export function pathLength(path) {
  let s = 0;
  for (let i = 1; i < path.length; i++) s += Math.hypot(path[i].slope - path[i - 1].slope, path[i].intercept - path[i - 1].intercept);
  return s;
}
export function wobble(path) {
  const len = pathLength(path);
  if (!Number.isFinite(len)) return 1; // a walk that left the number line was all wandering
  if (!(len > 0)) return 0;
  const a = path[0], b = path.at(-1);
  return Math.max(0, (len - Math.hypot(b.slope - a.slope, b.intercept - a.intercept)) / len);
}

// The first step at which the loss on all the data is within `share` of the starting excess over the lowest
// possible loss, as a number of epochs (steps / stepsPerEpoch). null when it never gets there.
export function epochsToLow(lossPerStep, stepsPerEpoch, floor, share = 0.05) {
  const target = floor + share * (lossPerStep[0] - floor);
  const i = lossPerStep.findIndex((l, k) => k > 0 && l <= target); // NaN never passes
  return i < 0 ? null : i / stepsPerEpoch;
}

// What the lab says about three runs of one problem: each optimiser's steps, final loss, wobble and epochs to a
// low loss, the noisiest and the fastest, and the key the Quick Quiz judges. `runs` is { full, mini, sgd } from
// run() in sgdcompare.js; `epoch` shows only the first `epoch` epochs of each run (all of them when omitted).
export const NAMES = ['full', 'mini', 'sgd'];
// A run has blown up once its loss is not a number or has passed this many times the loss it started with.
export const BLOWUP = 10;
export const blownUp = (lossPerStep) => lossPerStep.some(l => !(l <= BLOWUP * lossPerStep[0]));
export const NOISY_FLOOR = 0.05; // under this wobble, none of the three is "noisy"
export function readRuns(runs, data, epoch = null) {
  const floor = lossAt(data, leastSquares(data));
  const out = {};
  for (const name of NAMES) {
    const r = runs[name], upTo = epoch == null ? r.stepsTaken : Math.min(r.stepsTaken, Math.round(epoch * r.stepsPerEpoch));
    out[name] = {
      steps: upTo, stepsPerEpoch: r.stepsPerEpoch, loss: r.lossPerStep[upTo], diverged: blownUp(r.lossPerStep.slice(0, upTo + 1)),
      wobble: wobble(r.path.slice(0, upTo + 1)),
      epochsToLow: epochsToLow(r.lossPerStep.slice(0, upTo + 1), r.stepsPerEpoch, floor),
    };
  }
  return { floor, ...out, ...verdictOf(out) };
}
// The noisiest and the fastest of the three (ties go to the first in NAMES order that is listed below: SGD, mini, full),
// and the Quick Quiz key "<noisiest>-<fastest>", "same" when none is noisy.
export function verdictOf(read) {
  const order = ['sgd', 'mini', 'full'];
  const noisiest = order.reduce((a, b) => (read[b].wobble > read[a].wobble + 1e-9 ? b : a));
  const reached = order.filter(n => read[n].epochsToLow != null && !read[n].diverged);
  const fastest = reached.length ? reached.reduce((a, b) => (read[b].epochsToLow < read[a].epochsToLow - 1e-9 ? b : a)) : null;
  const same = read[noisiest].wobble < NOISY_FLOOR;
  return { noisiest, fastest, key: same ? 'same' : `${noisiest}-${fastest ?? 'none'}` };
}
