// Reproducible toy datasets. 2-D sets live in the 0..10 square the labs draw.
import { rng, gauss } from './rng.js';

const clamp = v => Math.max(0, Math.min(10, v));
const pt = (x, y, label) => ({ x: clamp(x), y: clamp(y), label });

// k round blobs; labels are blob numbers.
export function blobs(seed, { n = 60, k = 3, spread = 0.9, centers } = {}) {
  const r = rng(seed);
  const cs = centers ?? Array.from({ length: k }, (_, i) => [2.2 + (i % 3) * 3 + r() * 0.8, 2.5 + (i % 2) * 4.2 + r() * 0.8]);
  return Array.from({ length: n }, (_, i) => { const c = cs[i % cs.length]; return pt(c[0] + gauss(r) * spread, c[1] + gauss(r) * spread, i % cs.length); });
}

export function moons(seed, { n = 80, noise = 0.25 } = {}) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const second = i % 2, a = Math.PI * r();
    const x = second ? 6.2 + 2.3 * Math.cos(a) : 3.8 + 2.3 * Math.cos(a);
    const y = second ? 5.6 - 2.3 * Math.sin(a) : 4.4 + 2.3 * Math.sin(a);
    return pt(x + gauss(r) * noise, y + gauss(r) * noise, second);
  });
}

export function rings(seed, { n = 80, noise = 0.2 } = {}) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const outer = i % 2, a = 2 * Math.PI * r(), radius = (outer ? 3.8 : 1.7) + gauss(r) * noise;
    return pt(5 + radius * Math.cos(a), 5 + radius * Math.sin(a), outer);
  });
}

export function checker(seed, { n = 80 } = {}) {
  const r = rng(seed);
  return Array.from({ length: n }, () => { const x = r() * 10, y = r() * 10; return pt(x, y, (Math.floor(x / 5) + Math.floor(y / 5)) % 2); });
}

// y = slope * x + intercept + noise, x in 0..10.
export function linear(seed, { n = 30, slope = 0.7, intercept = 1.5, noise = 0.8 } = {}) {
  const r = rng(seed);
  return Array.from({ length: n }, () => { const x = r() * 10; return { x, y: slope * x + intercept + gauss(r) * noise }; });
}

// A smooth curve plus noise on x in 0..10, for overfitting demos.
export function curve1d(seed, { n = 24, noise = 0.35, fn = x => 3 + 2 * Math.sin(x / 1.6) } = {}) {
  const r = rng(seed);
  return Array.from({ length: n }, () => { const x = r() * 10; return { x, y: fn(x) + gauss(r) * noise }; });
}

// Rows of d features; the first two features carry the structure, the rest are noise.
export function highDim(seed, { n = 100, d = 5, clusters = 2 } = {}) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const c = i % clusters;
    return Array.from({ length: d }, (_, j) => (j < 2 ? (c ? 2 : -2) * (j ? -1 : 1) + gauss(r) : gauss(r)));
  });
}
