// Pure helpers for the shift lab (sims/labs/shift-lab.js): the real-data table (penguins with one
// island held out), the readings of the setups and of the shift detectors, the plot range and the
// true boundary curve. The generators, validation setups and detectors are in shift.js; this file
// only prepares data for them and turns their numbers into verdicts. Tested in shiftlab.test.js.
//
//   penguinShiftData(table, island) -> { train, test, shift: 'real', positiveRate, kept, total, dropped, island, mean, sd }
//       Predicts sex (male = 1) from bill length and body mass. Rows with a missing value (NA) in
//       either feature or in sex are dropped first (`dropped` counts them). The test set is every
//       row of `island`; the train set is every other row, sorted by year (`time` is the position in
//       that order) with the island and year as its `group`. Both features are standardised with the
//       train mean and sd, so a k-NN distance weighs them equally; `raw` keeps the measurements.
//   PENGUIN_ISLANDS                      ['Biscoe', 'Dream', 'Torgersen']
//   TOLERANCE                            0.05: an estimate within 5 points of the actual score "anticipated" it.
//   judgeSetups(rows, tolerance)         -> rows plus { status: 'anticipated' | 'optimistic' | 'pessimistic' }
//   warningSetups(rows)                  -> the setups that anticipated the score, closest first.
//   detectorReading({ psis, auc, drop }) -> 'inputs-moved' | 'quiet-dropped' | 'quiet'
//   aucVerdict(auc)                      -> 'alike' | 'some' | 'clear'
//   plotRange(rows, pad)                 -> { minX, minY, span } square range covering every row's features (span a multiple of 5, whole corner)
//   featurePsi(data)                     -> [psi of feature 1, psi of feature 2] with PSI_BINS (5) bins
//   boundaryCurve(angle, range, steps)   -> [{ x, y }] the noise-free boundary rotated by `angle`, inside `range`
import { psi, psiVerdict } from './shift.js';

export const PENGUIN_ISLANDS = ['Biscoe', 'Dream', 'Torgersen'];
export const TOLERANCE = 0.05;
export const PENGUIN_FEATURES = ['bill_length_mm', 'body_mass_g'];

const BOUNDARY = { amplitude: 1, frequency: 1.2 };    // x1 = amplitude * sin(frequency * x0) in shift.js

const present = v => typeof v === 'number' && Number.isFinite(v);

export function penguinShiftData(table, island = 'Biscoe') {
  if (!PENGUIN_ISLANDS.includes(island)) throw new RangeError(`island must be one of ${PENGUIN_ISLANDS.join(', ')}`);
  const [fa, fb] = PENGUIN_FEATURES;
  const usable = table.rows.filter(r => present(r[fa]) && present(r[fb]) && (r.sex === 'male' || r.sex === 'female'));
  const trainRows = usable.filter(r => r.island !== island);
  const testRows = usable.filter(r => r.island === island);
  if (!trainRows.length || !testRows.length) throw new RangeError('the table has no rows for the train or the test side');
  const mean = [fa, fb].map(f => trainRows.reduce((s, r) => s + r[f], 0) / trainRows.length);
  const sd = [fa, fb].map((f, j) => Math.sqrt(trainRows.reduce((s, r) => s + (r[f] - mean[j]) ** 2, 0) / trainRows.length) || 1);
  const make = r => {
    const raw = [r[fa], r[fb]];
    return { features: raw.map((v, j) => (v - mean[j]) / sd[j]), raw, label: r.sex === 'male' ? 1 : 0, group: `${r.island}-${r.year}`, time: r.year };
  };
  const train = trainRows.map(make).sort((a, b) => a.time - b.time).map((r, i) => ({ ...r, time: i }));
  const test = testRows.map(make).map((r, i) => ({ ...r, time: i }));
  const share = rows => rows.reduce((s, r) => s + r.label, 0) / rows.length;
  return {
    train, test, shift: 'real', severity: null, island, mean, sd,
    positiveRate: { train: share(train), test: share(test) },
    kept: usable.length, total: table.rows.length, dropped: table.rows.length - usable.length,
  };
}

// compareSetups rows -> each with how the estimate relates to the score it is compared with.
export function judgeSetups(rows, tolerance = TOLERANCE) {
  return rows.map(r => ({
    ...r,
    status: Math.abs(r.gap) <= tolerance ? 'anticipated' : r.gap > 0 ? 'optimistic' : 'pessimistic',
  }));
}

// The setups that anticipated the score, the closest first; empty when none did.
export function warningSetups(rows, tolerance = TOLERANCE) {
  return rows.filter(r => Math.abs(r.gap) <= tolerance).sort((a, b) => Math.abs(a.gap) - Math.abs(b.gap)).map(r => r.setup);
}

export function aucVerdict(auc) {
  return auc < 0.6 ? 'alike' : auc < 0.75 ? 'some' : 'clear';
}

// What the detectors, read together with the accuracy drop, say. `psis` are the per-feature PSI values,
// `auc` the domain classifier's AUC and `drop` how far the actual score fell below the random k-fold
// estimate (in accuracy, positive = fell).
//   'inputs-moved'   a PSI is above 0.25 (large) or the AUC is 0.75 or more: the inputs differ.
//   'quiet-dropped'  the inputs look alike but the score fell by more than the tolerance: the rule changed.
//   'quiet'          the inputs look alike and the score did not fall much.
export function detectorReading({ psis, auc, drop }, tolerance = TOLERANCE) {
  const moved = psis.some(v => psiVerdict(v) === 'large') || aucVerdict(auc) === 'clear';
  if (moved) return 'inputs-moved';
  return drop > tolerance ? 'quiet-dropped' : 'quiet';
}

// A square range that covers every row's two features, padded. The span is a multiple of 5 and the corner a whole
// number, so the plot's five grid steps fall on whole numbers and the tick labels stay short.
export function plotRange(rows, pad = 0.4) {
  const xs = rows.map(r => r.features[0]), ys = rows.map(r => r.features[1]);
  const lo = [Math.min(...xs) - pad, Math.min(...ys) - pad], hi = [Math.max(...xs) + pad, Math.max(...ys) + pad];
  let span = Math.ceil(Math.max(hi[0] - lo[0], hi[1] - lo[1]) / 5) * 5;
  const corner = (a, b) => Math.floor((a + b) / 2 - span / 2);
  for (;;) {
    const minX = corner(lo[0], hi[0]), minY = corner(lo[1], hi[1]);
    if (minX + span >= hi[0] && minY + span >= hi[1]) return { minX, minY, span };
    span += 5;
  }
}

// Points along the noise-free boundary of shift.js, rotated by `angle` radians, kept inside the range.
// Returned as separate runs so a line is never drawn across the gap where the curve leaves the range.
export function boundaryCurve(angle, range, steps = 240) {
  const c = Math.cos(angle), s = Math.sin(angle);
  const reach = Math.hypot(range.minX, range.minY, range.minX + range.span, range.minY + range.span) + 2;
  const runs = [];
  let run = [];
  for (let i = 0; i <= steps; i++) {
    const u = -reach + (2 * reach * i) / steps;
    const v = BOUNDARY.amplitude * Math.sin(BOUNDARY.frequency * u);
    const p = { x: c * u - s * v, y: s * u + c * v };
    const inside = p.x >= range.minX && p.x <= range.minX + range.span && p.y >= range.minY && p.y <= range.minY + range.span;
    if (inside) run.push(p);
    else if (run.length) { runs.push(run); run = []; }
  }
  if (run.length) runs.push(run);
  return runs;
}

// The model's predicted class on a grid over the range, row by row from the top (y high) to the bottom, for painting regions.
export function regionGrid(fitPredict, trainX, trainY, range, cells = 28) {
  const points = [];
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      points.push([range.minX + ((c + 0.5) / cells) * range.span, range.minY + range.span - ((r + 0.5) / cells) * range.span]);
    }
  }
  const labels = fitPredict(trainX, trainY, points);
  return { cells, labels };
}

// PSI of each of the two features, the train rows as the reference. Five equal-frequency bins, not ten: with a few
// hundred rows ten bins hold about 20 rows each and chance alone pushes PSI towards 0.1 even without a shift.
export const PSI_BINS = 5;
export function featurePsi(data, bins = PSI_BINS) {
  return [0, 1].map(j => psi(data.train.map(r => r.features[j]), data.test.map(r => r.features[j]), bins));
}
