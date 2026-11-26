// Invented island birds for the "Data, features and labels" lab: four numeric
// features, three species, and a score for how well a pair of features
// separates the species. Everything here is pure and seeded.
import { rng, gauss, shuffle } from './rng.js';
import { standardize } from './scale.js';
import { looAccuracy } from './knn.js';

// The four features. `lo` and `hi` are the fixed axis range the lab draws, so axes
// do not jump when a new sample is drawn; `step` is the rounding of a stored value.
export const FEATURES = [
  { name: 'Bill length', unit: 'mm', lo: 30, hi: 55, step: 0.1, decimals: 1 },
  { name: 'Bill depth', unit: 'mm', lo: 12, hi: 22, step: 0.1, decimals: 1 },
  { name: 'Flipper length', unit: 'mm', lo: 165, hi: 240, step: 1, decimals: 0 },
  { name: 'Body mass', unit: 'kg', lo: 2, hi: 7, step: 0.01, decimals: 2 },
];

// Three invented species. `mean` and `sd` are per feature, in the order of FEATURES.
// Bill length sets Skerry apart from the other two, and bill depth sets Cobble apart,
// so that pair separates all three. Flipper length and body mass only lean towards
// Cobble, and they lean together, so that pair leaves Skerry and Brine mixed.
export const SPECIES = [
  { name: 'Skerry', mean: [38.8, 18.6, 191, 3.75], sd: [2.6, 1.0, 6.5, 0.4] },
  { name: 'Brine', mean: [48.7, 18.4, 196, 3.8], sd: [3.0, 1.0, 6.5, 0.4] },
  { name: 'Cobble', mean: [47.5, 14.4, 208, 4.5], sd: [2.8, 1.0, 6.5, 0.4] },
];

const roundTo = (v, step) => Math.round(v / step) * step;
const tidy = (v, f) => Number(roundTo(v, f.step).toFixed(f.decimals));

// How strongly flipper length and body mass move together inside one species:
// both lean on a shared "size" draw, so their scatter leans like real bodies do.
const SIZE_SHARE = 0.8;

// `perSpecies` birds of each species, shuffled, numbered from 1 in the shuffled
// order (so the number tells you nothing about the species).
// Each bird is { id, features: [bill length, bill depth, flipper, mass], label: 0|1|2 }.
export function makeBirds(seed = 7, perSpecies = 40) {
  const r = rng(seed);
  for (let i = 0; i < 4; i++) r(); // the first draws of this small generator are too regular
  const birds = [];
  SPECIES.forEach((s, label) => {
    for (let i = 0; i < perSpecies; i++) {
      const size = gauss(r);
      const z = [gauss(r), gauss(r), SIZE_SHARE * size + Math.sqrt(1 - SIZE_SHARE ** 2) * gauss(r), SIZE_SHARE * size + Math.sqrt(1 - SIZE_SHARE ** 2) * gauss(r)];
      birds.push({ features: FEATURES.map((f, j) => tidy(s.mean[j] + s.sd[j] * z[j], f)), label });
    }
  });
  return shuffle(birds, r).map((b, i) => ({ id: i + 1, ...b }));
}

// Leave-one-out k-NN accuracy, in [0, 1], using only the listed feature columns
// after standardizing each one (so millimetres and grams count alike).
export function separability(birds, columns, k = 5) {
  const rows = standardize(birds.map(b => columns.map(c => b.features[c])));
  const points = rows.map((features, i) => ({ features, label: String(birds[i].label) }));  // knn.js votes by string key
  return looAccuracy(points, k);
}

// Every pair of different features, scored and sorted best first (ties: pair order).
export function rankPairs(birds, k = 5) {
  const out = [];
  for (let a = 0; a < FEATURES.length; a++) for (let b = a + 1; b < FEATURES.length; b++) out.push({ a, b, score: separability(birds, [a, b], k) });
  return out.map((p, i) => ({ ...p, i })).sort((p, q) => q.score - p.score || p.i - q.i).map(({ i, ...p }) => p);
}

// Position of a feature value on its axis, 0 at `lo` and 10 at `hi` (the lab's plot square).
export const axisPosition = (value, feature) => (value - FEATURES[feature].lo) / (FEATURES[feature].hi - FEATURES[feature].lo) * 10;

// "45.1 mm", "5.08 kg".
export const formatValue = (value, feature) => `${value.toFixed(FEATURES[feature].decimals)} ${FEATURES[feature].unit}`;
