// Figures for the "k-NN lab" lesson. Every count and distance is computed here with the lab's own math
// (sims/datasets.js and sims/ml/knnscale.js) on the lab's starting data: the shared point set
// (SHARED_SEED, 48 points), the fixed 40 test points, Euclidean distance. They agree with the lab's readout.
// The penguin numbers in the lesson text are not drawn from the bundled table here (figures are
// synchronous and cannot load it); the one penguin figure uses a hand-checked gap of 9 mm and 100 g.
import { svg, dot, ring, diamond, text, line, box, k, tr, fmt } from '../kit.js';
import { makeDataset, SHARED_SEED } from '../../sims/datasets.js';
import { nearestScaled, classifyScaled, testAccuracy, scaleFor, generatedTest } from '../../sims/ml/knnscale.js';

const ink = { fill: 'var(--ink)', weight: 700 };
const CLASSES = ['A', 'B'];
const classColor = label => k(label === 'A' ? 0 : 1);

// Test points right (of 40) for one dataset and one setting, as the lab's readout counts them.
const right = (name, kk, axis, stretch) => testAccuracy(makeDataset(name, SHARED_SEED, 48), generatedTest(name), kk, 'euclidean', scaleFor(axis, stretch)).correct;

// A small line chart on a count axis: columns across, one polyline per series with a marker at every column.
function chart({ ox, oy, w, h, xs, yLo, yHi, yTicks, xTicks, series, xTitle, yTitle }) {
  const X = i => ox + (xs.length === 1 ? 0 : i / (xs.length - 1) * w), Y = v => oy + h - (v - yLo) / (yHi - yLo) * h;
  const grid = yTicks.map(t => `${line(ox, Y(t), ox + w, Y(t), { c: 'var(--line)', w: 1 })}${text(ox - 8, Y(t) + 4, fmt(t), { anchor: 'end', size: 12 })}`).join('');
  const ticks = xTicks.map(t => `${text(X(xs.indexOf(t)), oy + h + 18, fmt(t), { size: 12 })}`).join('');
  const lines = series.map(s => {
    const path = s.values.map((v, i) => `${i ? 'L' : 'M'}${X(i)} ${Y(v)}`).join('');
    const marks = s.values.map((v, i) => (s.hollow ? ring(X(i), Y(v), s.color, 4.2) : dot(X(i), Y(v), s.color, 4.2))).join('');
    return `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="2" ${s.dash ? 'stroke-dasharray="6 4"' : ''}/>${marks}`;
  }).join('');
  return { X, Y, body: `${grid}${line(ox, oy + h, ox + w, oy + h, { c: 'var(--muted)', w: 1.6 })}${line(ox, oy, ox, oy + h, { c: 'var(--muted)', w: 1.6 })}${ticks}${lines}
${text(ox + w / 2, oy + h + 38, xTitle, { size: 12 })}
<text transform="translate(${ox - 36} ${oy + h / 2}) rotate(-90)" text-anchor="middle" font-size="12" font-weight="500" fill="var(--muted)">${yTitle}</text>` };
}

// ---- Figure 1: the lab's score at every k, on each generated dataset. ----
function accuracyByK() {
  const ks = Array.from({ length: 15 }, (_, i) => i + 1);
  const sets = [
    ['clusters', tr('Overlapping clusters', 'Cluster tumpang tindih'), 0, false],
    ['rings', tr('Concentric rings', 'Cincin konsentris'), 1, true],
    ['checker', tr('Checkerboard', 'Papan catur'), 2, false],
  ].map(([name, label, c, hollow]) => ({ name, label, color: k(c), hollow, values: ks.map(kk => right(name, kk, 'x', 1)) }));
  const ox = 56, oy = 34, w = 380, h = 200;
  const c = chart({ ox, oy, w, h, xs: ks, yLo: 20, yHi: 40, yTicks: [20, 25, 30, 35, 40], xTicks: [1, 3, 5, 7, 9, 11, 13, 15], series: sets, xTitle: tr('Neighbors (k)', 'Neighbor (k)'), yTitle: tr('Test points right (of 40)', 'Test point benar (dari 40)') });
  // End-of-line labels, nudged apart when two lines finish close together.
  const ends = sets.map(s => ({ s, y: c.Y(s.values[14]) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 19) ends[i].y = ends[i - 1].y + 19;
  const labels = ends.map(e => text(ox + w + 14, e.y + 4, `${e.s.label} (${fmt(e.s.values[14])})`, { anchor: 'start', size: 13, fill: e.s.color, weight: 700 })).join('');
  const start = `${line(c.X(2), oy, c.X(2), oy + h, { c: 'var(--muted)', w: 1.4, dash: '4 4' })}${text(c.X(2) + 6, oy + h - 8, tr('the lab starts at k = 3', 'lab dimulai di k = 3'), { anchor: 'start', size: 12 })}`;
  return svg(660, 292, `${c.body}${start}${labels}${text(ox, 16, tr('Test points classified correctly, as the lab reports them', 'Test point yang diklasifikasikan dengan benar, seperti di lab'), { anchor: 'start', ...ink, size: 13 })}`);
}

// ---- Figure 2: the same query, the same points, with and without a horizontal stretch. ----
function stretchNeighbors() {
  const pts = makeDataset('clusters', SHARED_SEED, 48), q = { x: 5, y: 5 }, half = 1.25;
  const S = 262, u = S / (2 * half), top = 44;
  const panel = (ox, sx, title, note) => {
    const near = nearestScaled(pts, q, 3, 'euclidean', { x: sx, y: 1 });
    const vote = classifyScaled(pts, q, 3, 'euclidean', { x: sx, y: 1 }, CLASSES);
    const cx = ox + S / 2, cy = top + S / 2, rankOf = new Map(near.map((n, r) => [n.i, r + 1]));
    const X = p => cx + (p.x - q.x) * sx * u, Y = p => cy - (p.y - q.y) * u;
    const inside = pts.map((p, i) => ({ p, i })).filter(({ p }) => Math.abs((p.x - q.x) * sx) <= half - 0.05 && Math.abs(p.y - q.y) <= half - 0.05);
    const band = sx === 1 ? `<rect x="${cx - 0.25 * u * 1.25}" y="${top + 3}" width="${0.5 * u * 1.25}" height="${S - 6}" fill="var(--accent-soft)" stroke="none"/>` : '';
    const dots = inside.map(({ p, i }) => {
      const r = rankOf.get(i);
      if (!r) return dot(X(p), Y(p), classColor(p.label), 4.6);
      const off = r === 2 && sx === 1 ? [10, 14] : r === 3 && sx === 1 ? [10, 4] : [10, 4];
      return `${ring(X(p), Y(p), classColor(p.label), 7)}${text(X(p) + off[0], Y(p) + off[1], fmt(r), { anchor: 'start', size: 13, ...ink })}`;
    }).join('');
    const reach = near[2].d * u;
    const ringLine = `<circle cx="${cx}" cy="${cy}" r="${reach}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    const list = near.map((n, r) => `${fmt(r + 1)}: ${pts[n.i].label}, ${fmt(n.d, { digits: 2 })}`).join('   ');
    const verdict = tr(`${vote.label} wins, ${fmt(vote.votes[vote.label])} to ${fmt(3 - vote.votes[vote.label])}`, `${vote.label} menang, ${fmt(vote.votes[vote.label])} banding ${fmt(3 - vote.votes[vote.label])}`);
    return `${box(ox, top, S, S)}${band}${ringLine}${dots}${diamond(cx, cy, classColor(vote.label), 9)}
${text(ox, 20, title, { anchor: 'start', ...ink, size: 14 })}${text(ox, 36, note, { anchor: 'start', size: 12 })}
${text(ox + S / 2, top + S + 20, `${tr('Neighbors', 'Neighbor')} ${list}`, { size: 12, fill: 'var(--ink)' })}
${text(ox + S / 2, top + S + 40, verdict, { size: 14, ...ink, fill: classColor(vote.label) })}`;
  };
  const body = panel(14, 1, tr('No stretch', 'Tanpa peregangan'), tr('true units; shaded: what stays on the right', 'satuan asli; berarsir: yang tersisa di kanan'))
    + panel(346, 5, tr('Horizontal feature ×5', 'Feature horizontal ×5'), tr('distances after the stretch', 'jarak setelah peregangan'));
  return svg(640, 380, `${body}${line(298, top + S / 2, 336, top + S / 2, { c: 'var(--muted)', w: 2, arrow: true })}`);
}

// ---- Figure 3: the score against the stretch, horizontal and vertical, on two datasets. ----
function accuracyByStretch() {
  const stretches = Array.from({ length: 10 }, (_, i) => i + 1);
  const mk = (name, ox, title) => {
    const series = [
      { values: stretches.map(s => right(name, 3, 'x', s)), color: k(2), label: tr('horizontal', 'horizontal') },
      { values: stretches.map(s => right(name, 3, 'y', s)), color: k(4), dash: true, hollow: true, label: tr('vertical', 'vertikal') },
    ];
    const c = chart({ ox, oy: 54, w: 230, h: 190, xs: stretches, yLo: 28, yHi: 40, yTicks: [28, 32, 36, 40], xTicks: [1, 5, 10], series, xTitle: tr('Stretch (×)', 'Peregangan (×)'), yTitle: tr('Test points right (of 40)', 'Test point benar (dari 40)') });
    const names = `${dot(ox + 4, 38, k(2), 4.2)}${text(ox + 14, 42, tr('horizontal', 'horizontal'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}${ring(ox + 100, 38, k(4), 4.2)}${text(ox + 110, 42, tr('vertical', 'vertikal'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}`;
    return `${c.body}${names}${text(ox - 36, 22, title, { anchor: 'start', ...ink, size: 14 })}`;
  };
  return svg(640, 316, `${mk('clusters', 66, tr('Overlapping clusters, k = 3', 'Cluster tumpang tindih, k = 3'))}${mk('rings', 372, tr('Concentric rings, k = 3', 'Cincin konsentris, k = 3'))}`);
}

// ---- Figure 4: a flipper gap of 9 mm beside a body-mass gap of 100 g, as the stretch grows. ----
function gapBars() {
  const flipper = 9, mass = 100, stretches = [1, 2, 5, 10];
  const ox = 120, W = 400, scale = W / 110, top = 56, row = 48;
  const rows = stretches.map((s, i) => {
    const y = top + i * row, f = flipper * s, dist = Math.hypot(f, mass);
    return `${text(ox - 14, y + 20, `×${fmt(s)}`, { anchor: 'end', ...ink, size: 15 })}
<rect x="${ox}" y="${y}" width="${f * scale}" height="14" rx="3" fill="${k(0)}"/>${text(ox + f * scale + 8, y + 12, `${fmt(f)}`, { anchor: 'start', size: 13, fill: 'var(--ink)' })}
<rect x="${ox}" y="${y + 18}" width="${mass * scale}" height="14" rx="3" fill="${k(1)}"/>${text(ox + mass * scale + 8, y + 30, `${fmt(mass)}`, { anchor: 'start', size: 13, fill: 'var(--ink)' })}
${text(ox + W + 78, y + 20, `${tr('distance', 'jarak')} ${fmt(dist, { digits: 1 })}`, { anchor: 'start', size: 13, fill: 'var(--ink)' })}`;
  }).join('');
  const legend = `${dot(ox + 2, 28, k(0), 6)}${text(ox + 14, 32, tr('flipper-length gap, after the stretch (mm)', 'selisih panjang sirip, setelah peregangan (mm)'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}`
    + `${dot(ox + 2, 46, k(1), 6)}${text(ox + 14, 50, tr('body-mass gap (g)', 'selisih massa tubuh (g)'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}`;
  return svg(660, top + 4 * row + 6, `${legend}${rows}`);
}

export const figures = {
  'accuracy-by-k': accuracyByK,
  'stretch-neighbors': stretchNeighbors,
  'accuracy-by-stretch': accuracyByStretch,
  'gap-bars': gapBars,
};
