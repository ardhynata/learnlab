// Pure helpers for the PCA lab (sims/labs/pca-lab.js), on top of ml/pca.js. A table X is an array of n
// rows of d numbers; an axis is a unit vector of length d. Tested in pcalab.test.js.
//
//   generatedCloud(kind, d, seed, n)   a seeded 2-D or 3-D cloud: kind 'strong' | 'noisy' | 'round'
//   wideTable(kind, seed, n, d)        a seeded d-column table driven by two hidden factors
//   axisFromAngles(azimuth, tilt)      unit vector from degrees (2-D: tilt 0 and length 2)
//   anglesFromAxis(u)                  { azimuth in [0, 180), tilt in [-90, 90] } in degrees
//   axisReport(X, u)                   variance along u, the information lost, and their shares
//   sweepAxis(X, tilt, step)           the report for every azimuth 0..180 (for a chart)
//   perpendicularAxis(u, prefer)       a unit vector at right angles to u, as close to `prefer` as possible
//   projectOnAxis(X, u)                each row's foot point on the line through the mean along u
//   componentCurves(model)             explained %, cumulative %, and information lost by components kept
//   squareRange(X, cols)               a symmetric square plot range that holds two columns of X
//   penguinMeasurements(table)         the four penguin measurements, NA rows dropped (and counted)
import { rng, gauss } from './rng.js';
import { covariance, fitPca, project } from './pca.js';

export const CLOUD_KINDS = ['strong', 'noisy', 'round'];
export const PENGUIN_COLUMNS = ['bill_length_mm', 'bill_depth_mm', 'flipper_length_mm', 'body_mass_g'];
const DEG = Math.PI / 180;

// Orthonormal basis of the cloud's own axes: the long direction u, a second v, and in 3-D a third w.
function basis(d, azimuth, tilt) {
  const a = azimuth * DEG, t = tilt * DEG;
  if (d === 2) return [[Math.cos(a), Math.sin(a)], [-Math.sin(a), Math.cos(a)]];
  const u = [Math.cos(t) * Math.cos(a), Math.cos(t) * Math.sin(a), Math.sin(t)];
  const v = [-Math.sin(a), Math.cos(a), 0];
  const w = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  return [u, v, w];
}

// Rescale a centred table so its covariance is exactly sd squared times the identity (no direction wins).
function whiten(X, sd) {
  const model = fitPca(X);
  const scores = project(model, X);
  return scores.map(row => row.map((s, i) => (model.eigenvalues[i] > 1e-12 ? s / Math.sqrt(model.eigenvalues[i]) : 0) * sd));
}

function centre(X) {
  const d = X[0].length, mean = new Array(d).fill(0);
  for (const row of X) for (let j = 0; j < d; j++) mean[j] += row[j] / X.length;
  return X.map(row => row.map((v, j) => v - mean[j]));
}

// A reproducible cloud centred on the origin. 'strong': one long direction (the clear first component);
// 'noisy': the same direction but the spread across it is nearly as big; 'round': no direction wins at all.
// d is 2 or 3. The long direction sits at 35 degrees (and, in 3-D, tilts 25 degrees upward).
export function generatedCloud(kind, d, seed, n = 120) {
  if (d !== 2 && d !== 3) throw new Error(`generatedCloud: d must be 2 or 3, got ${d}`);
  if (!CLOUD_KINDS.includes(kind)) throw new Error(`generatedCloud: unknown kind ${kind}`);
  const random = rng(seed);
  const sds = {
    2: { strong: [2.0, 0.55], noisy: [1.5, 1.1], round: [1.5, 1.5] },
    3: { strong: [2.0, 0.9, 0.45], noisy: [1.6, 1.2, 0.9], round: [1.5, 1.5, 1.5] },
  }[d][kind];
  const axes = basis(d, 35, 25);
  const X = Array.from({ length: n }, () => {
    const row = new Array(d).fill(0);
    for (let c = 0; c < d; c++) {
      const s = sds[c] * gauss(random);
      for (let j = 0; j < d; j++) row[j] += s * axes[c][j];
    }
    return row;
  });
  const out = centre(X);
  return kind === 'round' ? whiten(out, sds[0]) : out;
}

// A d-column table with two hidden factors: columns 0..d/2-1 follow the first, the rest the second, plus
// noise ('strong' little, 'noisy' a lot). 'round' is independent columns of equal spread (a flat scree).
export function wideTable(kind, seed, n = 150, d = 8) {
  if (!CLOUD_KINDS.includes(kind)) throw new Error(`wideTable: unknown kind ${kind}`);
  const random = rng(seed + 1000);
  const half = Math.floor(d / 2);
  const weight = j => [1.0, 0.9, 0.8, 0.7][(j % half) % 4] ?? 0.8;
  const noise = kind === 'noisy' ? 0.9 : 0.35;
  const X = Array.from({ length: n }, () => {
    const f = [gauss(random), gauss(random)];
    return Array.from({ length: d }, (_, j) => {
      if (kind === 'round') return gauss(random);
      const own = j < half ? 0 : 1;
      return weight(j) * f[own] + 0.15 * f[1 - own] + noise * gauss(random);
    });
  });
  const out = centre(X);
  return kind === 'round' ? whiten(out, 1) : out;
}

// Unit vector from an azimuth (degrees, turning from the x axis toward y) and a tilt (degrees up from the
// x-y plane). With d = 2 only the azimuth counts and the vector has two entries.
export function axisFromAngles(azimuth, tilt = 0, d = 3) {
  const a = azimuth * DEG, t = tilt * DEG;
  return d === 2 ? [Math.cos(a), Math.sin(a)] : [Math.cos(t) * Math.cos(a), Math.cos(t) * Math.sin(a), Math.sin(t)];
}

// The line an axis spans has no direction, so the azimuth is reported in [0, 180) and the tilt in [-90, 90].
export function anglesFromAxis(u) {
  let [x, y, z = 0] = u;
  if (y < 0 || (y === 0 && x < 0)) { x = -x; y = -y; z = -z; }
  const norm = Math.hypot(x, y, z) || 1;
  let azimuth = Math.atan2(y, x) / DEG;
  if (azimuth < 0) azimuth += 180;
  if (azimuth >= 180 - 1e-9) azimuth = 0;
  return { azimuth, tilt: Math.asin(Math.max(-1, Math.min(1, z / norm))) / DEG };
}

const normalise = u => { const n = Math.hypot(...u) || 1; return u.map(v => v / n); };

function reportFromCov(C, u) {
  const v = normalise(u), d = v.length;
  let total = 0, along = 0;
  for (let i = 0; i < d; i++) {
    total += C[i][i];
    for (let j = 0; j < d; j++) along += v[i] * C[i][j] * v[j];
  }
  along = Math.min(along, total);
  const lost = Math.max(total - along, 0);
  return { total, along, lost, keptRatio: total > 0 ? along / total : 0, lostRatio: total > 0 ? lost / total : 0 };
}

// The variance of the data along u, and the information lost by squashing every row onto the line through
// the mean along u: the mean squared distance from a row to its foot point. In any dimension the two add
// up to the total variance (the sum of the column variances).
export function axisReport(X, u) {
  return reportFromCov(covariance(X), u);
}

// axisReport for every azimuth from 0 to 180 degrees (inclusive) at a fixed tilt; d is the table width.
export function sweepAxis(X, tilt = 0, step = 2) {
  const C = covariance(X), d = X[0].length;
  const angles = [], kept = [], lost = [];
  for (let a = 0; a <= 180 + 1e-9; a += step) {
    const r = reportFromCov(C, axisFromAngles(a, tilt, d));
    angles.push(a); kept.push(r.along); lost.push(r.lost);
  }
  return { angles, kept, lost };
}

// A unit vector at right angles to u: `prefer` with its u-part removed, then scaled to length 1. Pass the second
// principal component and, from the best axis, you get exactly that component. A `prefer` that points along u
// (or is missing) falls back to the first coordinate direction that is not parallel to u.
export function perpendicularAxis(u, prefer = null) {
  const v = normalise(u), d = v.length;
  const candidates = [prefer, ...Array.from({ length: d }, (_, i) => v.map((_, j) => (i === j ? 1 : 0)))];
  for (const c of candidates) {
    if (!c) continue;
    const k = c.reduce((s, x, j) => s + x * v[j], 0);
    const p = c.map((x, j) => x - k * v[j]);
    if (Math.hypot(...p) > 1e-6 * (Math.hypot(...c) || 1) && Math.hypot(...p) > 1e-9) return normalise(p);
  }
  throw new Error('perpendicularAxis: no direction at right angles to the axis');
}

// For each row: its position t along the axis (a signed distance from the mean) and its foot point.
export function projectOnAxis(X, u) {
  const v = normalise(u), d = v.length, n = X.length;
  const mean = new Array(d).fill(0);
  for (const row of X) for (let j = 0; j < d; j++) mean[j] += row[j] / n;
  const t = X.map(row => row.reduce((s, x, j) => s + (x - mean[j]) * v[j], 0));
  return { mean, t, feet: X.map((_, i) => mean.map((m, j) => m + t[i] * v[j])) };
}

// From a fitted model: percent of the variance explained by each component, the running total, and the
// information lost (percent of the total variance) when the first k components are kept, k = 0..d.
export function componentCurves(model) {
  const total = model.eigenvalues.reduce((s, v) => s + v, 0);
  const explained = model.explainedRatio.map(r => r * 100);
  const cumulative = [];
  explained.reduce((s, v, i) => { cumulative[i] = s + v; return cumulative[i]; }, 0);
  const lostByK = [];
  for (let k = 0; k <= model.d; k++) {
    lostByK.push(total > 0 ? model.eigenvalues.slice(k).reduce((s, v) => s + v, 0) / total * 100 : 0);
  }
  return { explained, cumulative, lostByK };
}

// A square plot range { minX, minY, span } (the kit's plot shape) that holds columns i and j of X with a little
// margin. The range starts at a whole number and the span is a multiple of five whole steps, so the kit's six
// grid lines (span / 5 apart) land on whole numbers. Roughly centred on the origin, where PCA data sits.
export function squareRange(X, i = 0, j = 1) {
  let big = 0;
  for (const row of X) big = Math.max(big, Math.abs(row[i]), Math.abs(row[j]));
  const step = big > 20 ? Math.pow(10, Math.floor(Math.log10(big))) : 1;
  const low = Math.max(step === 1 ? 5 : step, Math.ceil((big * 1.05) / step) * step);
  const span = Math.ceil((2 * low) / (5 * step)) * 5 * step;
  return { minX: -low, minY: -low, span };
}

// The four penguin measurements as rows. A penguin missing any of them (the file writes NA) is left out;
// `dropped` says how many, so the lab can tell the learner. Species is kept for colouring only.
export function penguinMeasurements(table) {
  const X = [], species = [];
  for (const row of table.rows) {
    const values = PENGUIN_COLUMNS.map(c => row[c]);
    if (values.every(v => typeof v === 'number' && Number.isFinite(v))) { X.push(values); species.push(row.species); }
  }
  return { X, species, total: table.rows.length, dropped: table.rows.length - X.length };
}
