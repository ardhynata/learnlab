// Tabular data for the real-data labs: parse a bundled CSV, split it reproducibly, and
// preprocess it the way a pipeline would (fit on the training rows, apply to the others).
// Pure functions, tested in tabular.test.js.
import { rng, shuffle } from './rng.js';

// Parses simple CSV (comma separated, double quotes allowed, header row). A column whose
// every non-empty value is a number becomes numeric; empty cells and "NA" become null.
export function parseCsv(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim() !== '');
  const cells = line => {
    const out = []; let cur = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') quoted = false; else cur += ch; }
      else if (ch === '"') quoted = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map(s => s.trim());
  };
  const columns = cells(lines[0]);
  const raw = lines.slice(1).map(cells);
  const missing = v => v === '' || v === 'NA' || v === 'NaN';
  const numeric = columns.map((_, j) => raw.every(r => missing(r[j] ?? '') || Number.isFinite(Number(r[j]))));
  const rows = raw.map(r => Object.fromEntries(columns.map((c, j) => {
    const v = r[j] ?? '';
    return [c, missing(v) ? null : numeric[j] ? Number(v) : v];
  })));
  return { columns, numeric: Object.fromEntries(columns.map((c, j) => [c, numeric[j]])), rows };
}

// Reproducible split of n rows into train/validation/test index lists, fractions summing to 1
// (validation may be 0). Optionally stratified: each class keeps about the same share per part.
export function splitIndices(n, { train = 0.6, validation = 0.2 } = {}, seed = 1, labels = null) {
  const random = rng(seed);
  const parts = { train: [], validation: [], test: [] };
  const groups = labels ? [...new Set(labels)].map(l => labels.flatMap((x, i) => (x === l ? [i] : []))) : [Array.from({ length: n }, (_, i) => i)];
  for (const g of groups) {
    const s = shuffle(g, random);
    const nt = Math.round(s.length * train), nv = Math.round(s.length * validation);
    parts.train.push(...s.slice(0, nt));
    parts.validation.push(...s.slice(nt, nt + nv));
    parts.test.push(...s.slice(nt + nv));
  }
  return parts;
}

const present = values => values.filter(v => v !== null && v !== undefined && Number.isFinite(v));

// Fits an imputer on `values` (the training column) and returns a function filling gaps with the mean.
export function fitMeanImputer(values) {
  const v = present(values);
  const mean = v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  return { mean, apply: xs => xs.map(x => (x === null || x === undefined || !Number.isFinite(x) ? mean : x)) };
}

// Fits a standardizer on `values` (population standard deviation, as in sims/ml/scale.js).
export function fitStandardizer(values) {
  const v = present(values);
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length) || 1;
  return { mean, sd, apply: xs => xs.map(x => (x - mean) / sd) };
}

// Fits a min-max scaler to [0, 1] on `values`.
export function fitMinMaxScaler(values) {
  const v = present(values);
  const lo = Math.min(...v), hi = Math.max(...v);
  return { lo, hi, apply: xs => xs.map(x => (hi === lo ? 0 : (x - lo) / (hi - lo))) };
}

// One-hot encoding with categories learned from `values`; an unseen category becomes all zeros.
export function fitOneHot(values) {
  const categories = [...new Set(values.filter(v => v !== null && v !== undefined))].sort();
  return { categories, apply: xs => xs.map(x => categories.map(c => (x === c ? 1 : 0))) };
}

// Share of each label, e.g. { A: 0.5, B: 0.5 }.
export function classShares(labels) {
  const counts = {};
  for (const l of labels) counts[l] = (counts[l] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v / labels.length]));
}
