// Figures for the "Cluster methods lab" lesson. Figures 1 and 2 are computed with the lab's own code
// (sims/ml/clusterdata.js and clustercompare.js, 150 points, seed 7, the lab's defaults for each dataset),
// so every number agrees with the lab and with the lesson text. Figure 3 uses penguin numbers that were
// computed once with the same code (see PENGUIN_SAMPLES), because a figure cannot load the CSV.
import { svg, dot, cross, text, line, box, k, tr, fmt } from '../kit.js';
import { makeClusterData, describeDataset, CLUSTER_COUNT, DEFAULT_SEED, DEFAULT_N } from '../../sims/ml/clusterdata.js';
import { runComparison, defaultParams, METHODS } from '../../sims/ml/clustercompare.js';

// Data only is memoised; every string is built when the figure is drawn, so it follows the language.
const memo = {};
function lab(key, over = {}) {
  const id = `${key}|${JSON.stringify(over)}`;
  if (!memo[id]) {
    const { points, truth } = makeClusterData(key, { n: DEFAULT_N, seed: DEFAULT_SEED });
    const params = { ...defaultParams('generated', CLUSTER_COUNT[key], key), ...over };
    memo[id] = { points, result: runComparison(points, truth, params, { seed: DEFAULT_SEED }) };
  }
  return memo[id];
}
const num = v => fmt(v, { digits: 2 });
const methodName = key => ({ kmeans: tr('k-means', 'k-means'), dbscan: 'DBSCAN', hier: tr('Hierarchical (Ward)', 'Hierarchical (Ward)') }[key]);

// Splits a label into two balanced lines at a space (a row label in a narrow column).
function twoLines(label) {
  const words = label.split(' ');
  if (words.length < 2) return [label];
  let best = 1, gap = Infinity;
  for (let i = 1; i < words.length; i++) {
    const d = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
    if (d < gap) { gap = d; best = i; }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

// ---- Figure 1: three shapes, three methods, with the two scores. ----
const PANEL = 150;
function panelDots(points, labels, ox, oy) {
  const pad = 6, u = (PANEL - 2 * pad) / 10;
  const X = v => ox + pad + v * u, Y = v => oy + PANEL - pad - v * u;
  return points.map((p, i) => (labels[i] < 0
    ? cross(X(p[0]), Y(p[1]), 'var(--muted)').replace('stroke-width="2.4"', 'stroke-width="1.4"')
    : dot(X(p[0]), Y(p[1]), k(labels[i] % 7), 2.6))).join('');
}
function summary(res) {
  const c = res.clusters === 1 ? tr('1 cluster', '1 cluster') : tr(`${fmt(res.clusters)} clusters`, `${fmt(res.clusters)} cluster`);
  return res.noise ? tr(`${c}, ${fmt(res.noise)} noise`, `${c}, ${fmt(res.noise)} noise`) : c;
}
function shapesGrid() {
  const rows = ['blobs', 'rings', 'density'];
  const left = 104, gap = 24, rowH = 208, top = 30;
  let body = METHODS.map((m, j) => text(left + j * (PANEL + gap) + PANEL / 2, 16, methodName(m), { fill: 'var(--ink)', weight: 700, size: 13 })).join('');
  rows.forEach((key, i) => {
    const { points, result } = lab(key);
    const oy = top + i * rowH;
    twoLines(describeDataset(key).name).forEach((ln, n) => { body += text(0, oy + 62 + n * 17, ln, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 }); });
    METHODS.forEach((m, j) => {
      const ox = left + j * (PANEL + gap), res = result[m];
      body += `${box(ox, oy, PANEL, PANEL, 'var(--surface)', 'var(--line)')}${panelDots(points, res.labels, ox, oy)}
${text(ox + PANEL / 2, oy + PANEL + 15, summary(res), { size: 12, fill: 'var(--ink)' })}
${text(ox + PANEL / 2, oy + PANEL + 30, `${tr('Silhouette', 'Silhouette')} ${Number.isFinite(res.silhouette) ? num(res.silhouette) : '–'}`, { size: 12, fill: 'var(--ink)', weight: 700 })}
${text(ox + PANEL / 2, oy + PANEL + 45, `${tr('Match', 'Kecocokan')} ${num(res.ari)}`, { size: 12, fill: 'var(--ink)', weight: 700 })}`;
    });
  });
  const ny = top + rows.length * rowH + 14;
  const note = tr(`Lab defaults, ${fmt(DEFAULT_N)} points. Colors are clusters, grey crosses are DBSCAN noise. Match is the adjusted Rand against the true groups.`,
    `Pengaturan awal lab, ${fmt(DEFAULT_N)} titik. Warna adalah cluster, tanda silang abu-abu adalah noise DBSCAN. Kecocokan adalah adjusted Rand terhadap kelompok sebenarnya.`);
  const [a, b] = twoLines(note);
  return svg(640, ny + 30, `${body}${text(320, ny + 8, a, { size: 12 })}${text(320, ny + 24, b, { size: 12 })}`);
}

// ---- Figure 2: on two rings the silhouette ranks the methods backwards, and a wrong DBSCAN scores highest. ----
function scoreVsMatch() {
  const base = lab('rings').result, tiny = lab('rings', { eps: 0.3 }).result.dbscan;
  const groups = [
    [methodName('kmeans'), 'k = 2', base.kmeans],
    ['DBSCAN', `eps ${num(1.1)}`, base.dbscan],
    [methodName('hier'), 'k = 2', base.hier],
    ['DBSCAN', `eps ${num(0.3)}`, tiny],
  ];
  const left = 60, right = 632, top = 62, bottom = 196, bw = 46, span = (right - left) / groups.length;
  const Y = v => bottom - v * (bottom - top);
  const grid = [0, 0.5, 1].map(t => `${line(left, Y(t), right, Y(t), { c: 'var(--line)', w: 1.2 })}${text(left - 8, Y(t) + 4, num(t), { anchor: 'end', size: 12 })}`).join('');
  const bar = (x, v, col) => {
    const h = Math.max(0, Y(0) - Y(v));
    return `<rect x="${x}" y="${Y(Math.max(v, 0))}" width="${bw}" height="${Math.max(h, 1.5)}" rx="3" fill="${k(col)}"/>${text(x + bw / 2, Y(Math.max(v, 0)) - 6, num(v), { fill: 'var(--ink)', size: 13, weight: 700 })}`;
  };
  const bars = groups.map(([name, setting, res], i) => {
    const cx = left + span * (i + 0.5), x0 = cx - bw - 4;
    return `${bar(x0, res.silhouette, 0)}${bar(x0 + bw + 8, res.ari, 1)}${text(cx, bottom + 18, name, { fill: 'var(--ink)', weight: 700, size: 13 })}${text(cx, bottom + 34, setting, { size: 12, fill: 'var(--ink)' })}`;
  }).join('');
  const lx = left;
  const legend = `${box(lx, 8, 14, 14, k(0), k(0))}${text(lx + 22, 20, tr('Silhouette score', 'Skor silhouette'), { anchor: 'start', fill: 'var(--ink)', size: 12.5 })}
${box(lx + 190, 8, 14, 14, k(1), k(1))}${text(lx + 212, 20, tr('Match with the true rings (adjusted Rand)', 'Kecocokan dengan cincin sebenarnya (adjusted Rand)'), { anchor: 'start', fill: 'var(--ink)', size: 12.5 })}`;
  const note = tr(`At eps ${num(0.3)}, ${fmt(tiny.noise)} of ${fmt(DEFAULT_N)} points are noise, so the silhouette scores only the other ${fmt(DEFAULT_N - tiny.noise)}.`,
    `Pada eps ${num(0.3)}, ${fmt(tiny.noise)} dari ${fmt(DEFAULT_N)} titik adalah noise, jadi silhouette hanya menilai ${fmt(DEFAULT_N - tiny.noise)} titik sisanya.`);
  return svg(640, 258, `${legend}${grid}${line(left, bottom, right, bottom, { c: 'var(--muted)', w: 1.6 })}${bars}${text(320, 250, note, { size: 12.5, fill: 'var(--ink)' })}`);
}

// ---- Figure 3: penguins, three methods on four samples: silhouette against match. ----
// Computed with the lab's own code (runComparison, defaults for penguins: k = 3, eps 0.5, minPts 5, Ward),
// bill length against flipper length, 150 of the 342 penguins; sample 1 is seed 7 and each New sample adds 1.
// Each entry is [silhouette, match with the species] for k-means, DBSCAN and hierarchical.
const PENGUIN_SAMPLES = [
  { kmeans: [0.498, 0.813], dbscan: [0.358, 0.521], hier: [0.5, 0.798] },
  { kmeans: [0.537, 0.96], dbscan: [0.437, 0.408], hier: [0.449, 0.659] },
  { kmeans: [0.54, 0.881], dbscan: [0.422, 0.357], hier: [0.51, 0.779] },
  { kmeans: [0.541, 0.755], dbscan: [0.592, 0.518], hier: [0.53, 0.723] },
];
function penguinSamples() {
  const left = 64, right = 620, top = 62, bottom = 232, xLo = 0.3, xHi = 0.7;
  const X = v => left + (v - xLo) / (xHi - xLo) * (right - left), Y = v => bottom - v * (bottom - top);
  const colour = { kmeans: 0, dbscan: 1, hier: 2 };
  const grid = [0, 0.25, 0.5, 0.75, 1].map(t => `${line(left, Y(t), right, Y(t), { c: 'var(--line)', w: 1.2 })}${text(left - 8, Y(t) + 4, num(t), { anchor: 'end', size: 12 })}`).join('');
  const ticks = [0.3, 0.4, 0.5, 0.6, 0.7].map(t => text(X(t), bottom + 17, num(t), { size: 12 })).join('');
  let dots = '';
  PENGUIN_SAMPLES.forEach((s, i) => METHODS.forEach(m => {
    const [sil, match] = s[m];
    dots += `${dot(X(sil), Y(match), k(colour[m]), 6.5)}`;
    if (i === 3 && m === 'dbscan') dots += `<circle cx="${X(sil)}" cy="${Y(match)}" r="11" fill="none" stroke="var(--ink)" stroke-width="1.8"/>`;
  }));
  const hi = PENGUIN_SAMPLES[3].dbscan, km = PENGUIN_SAMPLES[3].kmeans;
  const callout = `${text(right, Y(0.38), tr('DBSCAN, 4th sample', 'DBSCAN, sampel ke-4'), { anchor: 'end', fill: 'var(--ink)', size: 12, weight: 700 })}
${text(right, Y(0.38) + 15, tr(`silhouette ${num(hi[0])} (highest), match ${num(hi[1])}`, `silhouette ${num(hi[0])} (tertinggi), kecocokan ${num(hi[1])}`), { anchor: 'end', fill: 'var(--ink)', size: 12 })}
${line(X(hi[0]), Y(hi[1]) + 13, X(hi[0]), Y(0.38) - 16, { c: 'var(--muted)', w: 1.2 })}
${text(right, Y(0.97), tr('k-means, 4th sample', 'k-means, sampel ke-4'), { anchor: 'end', fill: 'var(--ink)', size: 12, weight: 700 })}
${text(right, Y(0.97) + 15, tr(`silhouette ${num(km[0])}, match ${num(km[1])}`, `silhouette ${num(km[0])}, kecocokan ${num(km[1])}`), { anchor: 'end', fill: 'var(--ink)', size: 12 })}`;
  const legend = METHODS.map((m, i) => `${dot(left + 7 + i * 150, 12, k(colour[m]), 6.5)}${text(left + 20 + i * 150, 16, methodName(m), { anchor: 'start', fill: 'var(--ink)', size: 12.5 })}`).join('');
  const yTitle = text(left - 8, 46, tr('Match with the species', 'Kecocokan dengan spesies'), { anchor: 'start', fill: 'var(--ink)', size: 12, weight: 700 });
  const xTitle = text((left + right) / 2, bottom + 36, tr('Silhouette score (further right looks better)', 'Skor silhouette (makin ke kanan tampak makin baik)'), { fill: 'var(--ink)', size: 12.5, weight: 700 });
  return svg(640, 280, `${legend}${yTitle}${grid}${line(left, bottom, right, bottom, { c: 'var(--muted)', w: 1.6 })}${ticks}${dots}${callout}${xTitle}`);
}

export const figures = {
  'shapes-grid': shapesGrid,
  'score-vs-match': scoreVsMatch,
  'penguin-samples': penguinSamples,
};
