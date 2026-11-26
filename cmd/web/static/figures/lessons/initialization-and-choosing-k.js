// Figures for the lesson "Starting positions and choosing k". All of them use the same six points on a
// line (0, 1, 10, 11, 20, 21) as the worked examples, and every number drawn is computed here, so the
// figures agree with the text: the final groups and inertia of two starts, the k-means++ weights for
// the second centroid, and the best inertia for each k.
import { svg, dot, ring, diamond, text, line, box, k, tr, fmt } from '../kit.js';

const POINTS = [0, 1, 10, 11, 20, 21];
const sq = v => v * v;

// Plain k-means on the line from the given starting centroids: assign, update, repeat until stable.
function kmeans1d(points, start) {
  let cent = [...start], assign = null;
  for (let pass = 0; pass < 50; pass++) {
    const next = points.map(x => cent.reduce((best, c, i) => (Math.abs(x - c) < Math.abs(x - cent[best]) ? i : best), 0));
    if (assign && next.every((a, i) => a === assign[i])) break;
    assign = next;
    cent = cent.map((c, i) => {
      const own = points.filter((_, j) => assign[j] === i);
      return own.length ? own.reduce((s, x) => s + x, 0) / own.length : c;
    });
  }
  return { assign, cent, inertia: points.reduce((s, x, j) => s + sq(x - cent[assign[j]]), 0) };
}

// Best inertia for k groups. On a line the best groups are runs of neighbors, so try every split.
function bestInertia(points, nK) {
  const sorted = [...points].sort((a, b) => a - b);
  const cost = (a, b) => {
    const g = sorted.slice(a, b), m = g.reduce((s, x) => s + x, 0) / g.length;
    return g.reduce((s, x) => s + sq(x - m), 0);
  };
  const go = (from, left) => {
    if (left === 1) return cost(from, sorted.length);
    let best = Infinity;
    for (let to = from + 1; to <= sorted.length - left + 1; to++) best = Math.min(best, cost(from, to) + go(to, left - 1));
    return best;
  };
  return go(0, nK);
}

const ink = { fill: 'var(--ink)', weight: 700 };
const pctText = v => `${fmt(v * 100, { digits: v < 0.01 ? 2 : 1 })}%`;

// ---- Figure 1: the same data and k from two starting positions. ----
function twoStarts() {
  const starts = [[0, 10, 20], [0, 1, 10]];
  const left = 56, width = 528, X = v => left + v * (width / 21);
  const rows = starts.map((start, r) => {
    const res = kmeans1d(POINTS, start), t = 8 + r * 138, base = t + 72;
    const title = `${tr('Start', 'Awal')} ${r + 1}: ${tr('centroids at', 'centroid di')} ${start.map(v => fmt(v)).join(', ')}`;
    const stats = `${tr('inertia', 'inertia')} ${fmt(res.inertia, { digits: res.inertia % 1 ? 1 : 0 })}`;
    return `${box(8, t, 624, 128, 'var(--surface)', 'var(--line)')}
${text(22, t + 22, title, { anchor: 'start', ...ink, size: 14 })}${text(618, t + 22, stats, { anchor: 'end', fill: r ? k(1) : k(2), weight: 700, size: 14 })}
${line(left - 14, base, left + width + 14, base, { c: 'var(--line)', w: 2 })}
${start.map(v => ring(X(v), base - 26, 'var(--muted)', 7)).join('')}
${POINTS.map((x, j) => dot(X(x), base, k(res.assign[j]), 7)).join('')}
${res.cent.map((c, i) => diamond(X(c), base + 26, k(i), 8)).join('')}
${POINTS.map(x => text(X(x), base + 50, fmt(x), { size: 12 })).join('')}`;
  }).join('');
  const ly = 298;
  const legend = `${ring(30, ly, 'var(--muted)', 6)}${text(44, ly + 4, tr('starting centroid', 'centroid awal'), { anchor: 'start', fill: 'var(--ink)', size: 12 })}
${diamond(190, ly, 'var(--surface)', 7)}${text(204, ly + 4, tr('final centroid', 'centroid akhir'), { anchor: 'start', fill: 'var(--ink)', size: 12 })}
${dot(330, ly, k(0), 6)}${text(342, ly + 4, tr('point, colored by its final group', 'titik, berwarna sesuai kelompok akhir'), { anchor: 'start', fill: 'var(--ink)', size: 12 })}`;
  return svg(640, 316, `${rows}${legend}`);
}

// ---- Figure 2: the chance each point becomes the second centroid when the first is at 0. ----
function plusplusWeights() {
  const cand = POINTS.filter(x => x !== 0);
  const w = cand.map(x => sq(x - 0)), total = w.reduce((s, v) => s + v, 0);
  const blind = 1 / cand.length, ppp = w.map(v => v / total);
  const ox = 70, oy = 36, W = 540, H = 190, top = 0.5, Y = v => oy + H - (v / top) * H;
  const slot = W / cand.length, bw = 44;
  const grid = [0, 0.1, 0.2, 0.3, 0.4, 0.5].map(v => `${line(ox, Y(v), ox + W, Y(v), { c: 'var(--line)', w: 1 })}${text(ox - 8, Y(v) + 4, `${fmt(v * 100)}%`, { anchor: 'end', size: 12 })}`).join('');
  const bars = cand.map((x, i) => {
    const cx = ox + slot * (i + 0.5);
    const b1 = `<rect x="${cx - bw - 2}" y="${Y(blind)}" width="${bw}" height="${Y(0) - Y(blind)}" rx="3" fill="var(--line)" stroke="var(--muted)" stroke-width="1.2"/>`;
    const b2 = `<rect x="${cx + 2}" y="${Y(ppp[i])}" width="${bw}" height="${Math.max(1.5, Y(0) - Y(ppp[i]))}" rx="3" fill="${k(1)}"/>`;
    return `${b1}${b2}
${text(cx - bw / 2 - 2, Y(blind) - 6, pctText(blind), { size: 11, fill: 'var(--ink)' })}${text(cx + bw / 2 + 2, Y(ppp[i]) - 6, pctText(ppp[i]), { size: 11, ...ink })}
${text(cx, oy + H + 20, `x = ${fmt(x)}`, { size: 13, fill: 'var(--ink)' })}`;
  }).join('');
  const lg = `<rect x="${ox}" y="8" width="14" height="14" rx="3" fill="var(--line)" stroke="var(--muted)" stroke-width="1.2"/>${text(ox + 22, 20, tr('blind random pick', 'pilihan acak biasa'), { anchor: 'start', fill: 'var(--ink)', size: 12 })}
<rect x="${ox + 190}" y="8" width="14" height="14" rx="3" fill="${k(1)}"/>${text(ox + 212, 20, tr('k-means++ (weight = squared distance to 0)', 'k-means++ (bobot = jarak kuadrat ke 0)'), { anchor: 'start', fill: 'var(--ink)', size: 12 })}`;
  return svg(640, 280, `${grid}${bars}${lg}${text(ox + W / 2, 266, tr('candidate for the second centroid', 'calon centroid kedua'), { size: 12 })}`);
}

// ---- Figure 3: best inertia for k = 1 to 6 on the six points, with the elbow marked. ----
function elbow() {
  const ks = [1, 2, 3, 4, 5, 6], vals = ks.map(n => bestInertia(POINTS, n));
  const ox = 70, oy = 30, W = 530, H = 190, top = 420;
  const X = n => ox + (n - 1) * (W / 5), Y = v => oy + H - (v / top) * H;
  const grid = [0, 100, 200, 300, 400].map(v => `${line(ox - 14, Y(v), ox + W + 14, Y(v), { c: 'var(--line)', w: 1 })}${text(ox - 20, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('');
  const path = ks.map((n, i) => `${i ? 'L' : 'M'}${X(n)} ${Y(vals[i])}`).join('');
  const curve = `<path d="${path}" stroke="${k(0)}" stroke-width="3" fill="none" stroke-linejoin="round"/>`;
  const marks = ks.map((n, i) => {
    const dx = [14, 12, 14, 0, 0, 0][i], dy = -12;
    const label = text(X(n) + dx, Y(vals[i]) + dy, fmt(vals[i], { digits: vals[i] % 1 ? 1 : 0 }), { size: 12, fill: 'var(--ink)', weight: 700, anchor: i < 3 ? 'start' : 'middle' });
    return `${n === 3 ? ring(X(n), Y(vals[i]), k(1), 9) : dot(X(n), Y(vals[i]), k(0), 5.5)}${label}${text(X(n), oy + H + 24, fmt(n), { size: 13, fill: 'var(--ink)' })}`;
  }).join('');
  const note = `${text(X(4) + 10, Y(200), tr('elbow at k = 3:', 'elbow di k = 3:'), { ...ink, size: 14 })}${text(X(4) + 10, Y(200) + 20, tr('after it the line is almost flat', 'sesudahnya garis hampir datar'), { size: 12, fill: 'var(--ink)' })}
${line(X(3) + 20, Y(200) + 30, X(3) + 4, Y(vals[2]) - 34, { c: 'var(--muted)', w: 1.6, arrow: true })}`;
  return svg(640, 290, `${grid}${curve}${marks}${note}${text(ox + W / 2, 276, tr('k, the number of groups', 'k, jumlah kelompok'), { size: 12 })}${text(16, 14, tr('best inertia', 'inertia terbaik'), { anchor: 'start', size: 12 })}`);
}

export const figures = { 'two-starts': twoStarts, 'plusplus-weights': plusplusWeights, 'elbow': elbow };
