// Figures for the "DBSCAN and density" lesson. They run the lab's own engine (sims/dbscan-engine.js) on the
// lab's own default points (seed 520, 80 points), so every cluster and noise count drawn here is the number the
// lab shows with the same settings. labPoints() below is a copy of the point generator inside sims/dbscan.js
// (that file only exports mount), so if the lab's generator ever changes, copy it here again.
import { svg, dot, ring, text, line, box, k, soft, tr, fmt } from '../kit.js';
import { startDbscan, advanceDbscan, pointType } from '../../sims/dbscan-engine.js';

const CORNERS = [{ x: .7, y: 1.05 }, { x: 9.25, y: .8 }, { x: .6, y: 8.8 }, { x: 9.35, y: 9.15 }];

function labPoints(name, count, seed = 520) {
  let state = seed;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32; };
  const outlierCount = name === 'moons' ? 0 : Math.floor(count / 20);
  const signalCount = count - outlierCount;
  const firstGroup = name === 'clusters' ? Math.ceil(signalCount * .57) : Math.ceil(signalCount / 2);
  const sample = Array.from({ length: signalCount }, (_, index) => {
    const second = index >= firstGroup;
    const groupIndex = second ? index - firstGroup : index;
    const groupSize = second ? signalCount - firstGroup : firstGroup;
    const fraction = (groupIndex + .12 * (random() - .5)) / groupSize;
    if (name === 'rings') {
      const angle = 2 * Math.PI * (fraction + (second ? .4 / groupSize : 0));
      const r = (second ? 3.8 : 1.7) + .18 * (random() - .5);
      return { x: 5 + r * Math.cos(angle), y: 5 + r * Math.sin(angle) };
    }
    if (name === 'moons') {
      const angle = Math.PI * fraction;
      const r = 2.35 + .3 * (random() - .5);
      return { x: (second ? 6.2 : 3.85) + r * Math.cos(angle), y: (second ? 5.6 : 4.4) + (second ? -1 : 1) * r * Math.sin(angle) };
    }
    const r = (second ? 2.2 : .95) * Math.sqrt((groupIndex + 1) / groupSize);
    const angle = groupIndex * 2.39996 + .2 * random();
    return { x: (second ? 6.9 : 2.5) + r * Math.cos(angle), y: (second ? 4.65 : 6.25) + r * Math.sin(angle) };
  });
  for (let i = 0; i < outlierCount; i++) {
    const corner = CORNERS[i % CORNERS.length];
    sample.push({ x: corner.x + .55 * (random() - .5), y: corner.y + .55 * (random() - .5) });
  }
  for (let i = sample.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [sample[i], sample[j]] = [sample[j], sample[i]];
  }
  return sample;
}

// Runs DBSCAN to the end, like pressing Run at the Instant speed.
function cluster(pts, eps, minPts) {
  const model = startDbscan(pts, eps, minPts);
  while (model.status !== 'done') advanceDbscan(model);
  const types = pts.map((_, i) => pointType(model, i));
  return { model, types, clusters: model.clusterCount, noise: types.filter(t => t === 'noise').length };
}

const clusterWord = n => tr(`${fmt(n)} ${n === 1 ? 'cluster' : 'clusters'}`, `${fmt(n)} cluster`);
const xmark = (x, y, s, c = 'var(--muted)', w = 2) => `<path d="M${x - s} ${y - s}l${2 * s} ${2 * s}M${x - s} ${y + s}l${2 * s}-${2 * s}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const hollow = (x, y, c, r, w = 2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--surface)" stroke="${c}" stroke-width="${w}"/>`;

// A square plot of the 0..10 lab space with the points drawn the way the lab draws them:
// filled = core, hollow = border, cross = noise, colour = cluster.
function scatter(ox, oy, S, pts, run, o = {}) {
  const v0 = o.view ?? { x: 0, y: 0, span: 10 }, u = S / v0.span, r = o.r ?? 3.2;
  const X = v => ox + (v - v0.x) * u, Y = v => oy + S - (v - v0.y) * u;
  const inView = p => p.x >= v0.x && p.x <= v0.x + v0.span && p.y >= v0.y && p.y <= v0.y + v0.span;
  const marks = pts.map((p, i) => {
    if (!inView(p)) return '';
    const t = run.types[i], c = t === 'noise' ? 'var(--muted)' : k((run.model.labels[i] - 1) % 7);
    if (t === 'noise') return xmark(X(p.x), Y(p.y), r * .85, c, o.w ?? 1.8);
    return t === 'border' ? hollow(X(p.x), Y(p.y), c, r, o.w ?? 1.8) : dot(X(p.x), Y(p.y), c, r);
  }).join('');
  return { X, Y, u, body: `${box(ox, oy, S, S)}${marks}` };
}

// ---- Figure 1: core, border and noise on the lab's Uneven density data at epsilon 0.8, MinPts 4. ----
function kinds() {
  const eps = 0.8, minPts = 4, pts = labPoints('clusters', 80), run = cluster(pts, eps, minPts), nb = run.model.neighborhoods;
  // A border point that sits in the neighborhood of a core point, and a noise point that is not alone at a corner.
  const b = run.types.findIndex((t, i) => t === 'border' && nb[i].some(j => run.types[j] === 'core'));
  const c = nb[b].find(j => run.types[j] === 'core');
  const view = { x: 3.6, y: 1.9, span: 6.4 };
  const n = run.types.findIndex((t, i) => t === 'noise' && pts[i].x > view.x + .3 && pts[i].x < view.x + view.span - .3 && pts[i].y > view.y + .3 && pts[i].y < view.y + view.span - .3);
  const S = 300, ox = 12, oy = 12;
  const p = scatter(ox, oy, S, pts, run, { r: 5, w: 2.2, view });
  const hue = i => k((run.model.labels[i] - 1) % 7);
  const circle = (i, col) => `<circle cx="${p.X(pts[i].x)}" cy="${p.Y(pts[i].y)}" r="${eps * p.u}" fill="${col}" fill-opacity="0.12" stroke="${col}" stroke-width="1.8" stroke-dasharray="5 4"/>`;
  const tag = (i, letter, dx, dy) => text(p.X(pts[i].x) + dx, p.Y(pts[i].y) + dy, letter, { fill: 'var(--ink)', weight: 700, size: 15 });
  const rows = [
    ['A', tr('Core', 'Core'), tr(`${fmt(nb[c].length)} points inside ε, itself included. That is at least MinPts (${fmt(minPts)}).`, `${fmt(nb[c].length)} titik di dalam ε, termasuk dirinya. Itu sudah mencapai MinPts (${fmt(minPts)}).`), d => dot(d[0], d[1], k(1), 6.5)],
    ['B', tr('Border', 'Border'), tr(`Only ${fmt(nb[b].length)} inside ε, fewer than ${fmt(minPts)}. But it sits inside A's circle, so A pulls it into the cluster.`, `Hanya ${fmt(nb[b].length)} di dalam ε, kurang dari ${fmt(minPts)}. Namun ia berada di dalam lingkaran A, sehingga A menariknya ke cluster.`), d => hollow(d[0], d[1], k(1), 6.5)],
    ['C', tr('Noise', 'Noise'), tr(`${fmt(nb[n].length)} inside ε, and no core point reaches it. It joins nothing.`, `${fmt(nb[n].length)} di dalam ε, dan tidak ada core point yang menjangkaunya. Ia tidak masuk cluster mana pun.`), d => xmark(d[0], d[1], 5.5, 'var(--muted)', 2.4)],
  ];
  // The explanation text wraps by hand: one string per line, at about 36 characters.
  const wrap = (s, max = 38) => s.split(' ').reduce((ls, w) => { const last = ls[ls.length - 1]; if (last && (last + ' ' + w).length <= max) ls[ls.length - 1] = last + ' ' + w; else ls.push(w); return ls; }, []);
  const col = 346;
  const side = rows.map(([letter, name, why, mark], i) => {
    const y = 40 + i * 98, lines = wrap(why);
    return `${mark([col + 10, y - 5])}${text(col + 28, y, `${letter}  ${name}`, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 15 })}
${lines.map((l, j) => text(col, y + 22 + j * 17, l, { anchor: 'start', size: 13, fill: 'var(--ink)' })).join('')}`;
  }).join('');
  const note = text(ox, 334, tr(`Uneven density, zoomed on the loose group. ε = ${fmt(eps)}, MinPts = ${fmt(minPts)}.`, `Density tidak merata, grup renggang diperbesar. ε = ${fmt(eps)}, MinPts = ${fmt(minPts)}.`), { anchor: 'start', size: 12 });
  return svg(640, 346, `${p.body}${circle(c, k(2))}${circle(b, k(3))}
${dot(p.X(pts[c].x), p.Y(pts[c].y), hue(c), 5.5)}${hollow(p.X(pts[b].x), p.Y(pts[b].y), hue(b), 5.5, 2.4)}${xmark(p.X(pts[n].x), p.Y(pts[n].y), 4.5, 'var(--muted)', 2.4)}
${tag(c, 'A', -22, 4)}${tag(b, 'B', 10, -10)}${tag(n, 'C', -22, 5)}${side}${note}`);
}

// ---- Figure 2: the hand-worked example on a number line. ----
function handExample() {
  const xs = [1.0, 1.5, 2.0, 2.4, 3.2, 5.0, 9.0, 9.2], eps = 1, minPts = 3;
  const run = cluster(xs.map(x => ({ x, y: 0 })), eps, minPts), nb = run.model.neighborhoods;
  const X = v => 100 + v * 60, y0 = 96;
  const ink = { fill: 'var(--ink)' };
  // 9.0 and 9.2 are 12 px apart, so their labels step sideways.
  const dx = xs.map(x => x === 9.0 ? -13 : x === 9.2 ? 13 : 0);
  const marks = xs.map((x, i) => {
    const t = run.types[i];
    return t === 'noise' ? xmark(X(x), y0, 6, 'var(--muted)', 2.6) : t === 'border' ? hollow(X(x), y0, k(0), 7, 2.6) : dot(X(x), y0, k(0), 7);
  }).join('');
  const labels = xs.map((x, i) => `${text(X(x) + dx[i], y0 - 16, fmt(x, { digits: 1 }), { size: 12, ...ink })}${text(X(x) + dx[i], y0 + 36, fmt(nb[i].length), { size: 15, weight: 700, fill: nb[i].length >= minPts ? k(0) : 'var(--muted)' })}`).join('');
  // The epsilon window around 2.4, drawn as a bracket above the line.
  const c = 2.4, lo = X(c - eps), hi = X(c + eps), by = 40;
  const bracket = `${line(lo, by, hi, by, { c: k(2), w: 2.4 })}${line(lo, by - 6, lo, by + 6, { c: k(2), w: 2.4 })}${line(hi, by - 6, hi, by + 6, { c: k(2), w: 2.4 })}${line(X(c), by, X(c), y0 - 28, { c: k(2), w: 1.4, dash: '3 3' })}
${text(hi + 10, by + 4, tr(`ε = ${fmt(eps)} around ${fmt(c, { digits: 1 })}: ${fmt(nb[xs.indexOf(c)].length)} points`, `ε = ${fmt(eps)} di sekitar ${fmt(c, { digits: 1 })}: ${fmt(nb[xs.indexOf(c)].length)} titik`), { anchor: 'start', size: 12, fill: k(2), weight: 700 })}`;
  const rowLabels = `${text(8, y0 - 12, tr('Value', 'Nilai'), { anchor: 'start', size: 12, weight: 700, ...ink })}${text(8, y0 + 36, tr('Within ε', 'Dalam ε'), { anchor: 'start', size: 12, weight: 700, ...ink })}`;
  const cl = `${line(X(1.0) - 6, y0 + 56, X(3.2) + 6, y0 + 56, { c: k(0), w: 3 })}${text((X(1.0) + X(3.2)) / 2, y0 + 76, tr('one cluster', 'satu cluster'), { size: 13, weight: 700, fill: k(0) })}
${text(X(5.0), y0 + 76, tr('noise', 'noise'), { size: 13, weight: 700 })}${text((X(9.0) + X(9.2)) / 2, y0 + 76, tr('noise', 'noise'), { size: 13, weight: 700 })}`;
  const ly = y0 + 112, lx = [150, 270, 390];
  const legend = `${dot(lx[0], ly, k(0), 6)}${text(lx[0] + 14, ly + 4, tr('core (3 or more within ε)', 'core (3 atau lebih dalam ε)'), { anchor: 'start', size: 12, ...ink })}`
    + `${hollow(lx[1] + 90, ly, k(0), 6, 2.4)}${text(lx[1] + 104, ly + 4, tr('border', 'border'), { anchor: 'start', size: 12, ...ink })}`
    + `${xmark(lx[2] + 40, ly, 5, 'var(--muted)', 2.4)}${text(lx[2] + 54, ly + 4, tr('noise', 'noise'), { anchor: 'start', size: 12, ...ink })}`;
  return svg(700, 232, `${line(X(0), y0, X(10), y0, { c: 'var(--line)', w: 2 })}${rowLabels}${bracket}${marks}${labels}${cl}${legend}`);
}

// ---- Figure 3: Rings and outliers at four radii, MinPts 4. ----
function radiusSweep() {
  const pts = labPoints('rings', 80), S = 148, gap = 16, top = 30;
  const cases = [
    [0.3, tr('all noise', 'semua noise')],
    [1.0, tr('inner ring only', 'hanya ring dalam')],
    [1.35, tr('two rings', 'dua ring')],
    [2.5, tr('rings merged', 'ring menyatu')],
  ];
  const body = cases.map(([eps, verdict], i) => {
    const ox = i * (S + gap), run = cluster(pts, eps, 4), p = scatter(ox, top, S, pts, run, { r: 2.9, w: 1.6 });
    const good = run.clusters === 2;
    return `${text(ox + S / 2, 18, `ε = ${fmt(eps)}`, { fill: 'var(--ink)', weight: 700, size: 14 })}
${p.body}
${text(ox + S / 2, top + S + 22, `${clusterWord(run.clusters)}, ${tr(`${fmt(run.noise)} noise`, `${fmt(run.noise)} noise`)}`, { fill: 'var(--ink)', weight: 700, size: 12 })}
${text(ox + S / 2, top + S + 41, verdict, { size: 12, weight: good ? 700 : 500, fill: good ? k(2) : 'var(--muted)' })}`;
  }).join('');
  return svg(640, 240, body);
}

// ---- Figure 4: Uneven density. Three radii on 80 points, then the radii that find two clusters. ----
function unevenDensity() {
  const pts = labPoints('clusters', 80), S = 168, gapx = 65, top = 28;
  const cases = [
    [0.5, tr('loose group is noise', 'grup renggang jadi noise')],
    [1.35, tr('two clusters', 'dua cluster')],
    [1.7, tr('groups merge', 'kedua grup menyatu')],
  ];
  const panels = cases.map(([eps, verdict], i) => {
    const ox = i * (S + gapx) + 2, run = cluster(pts, eps, 4), p = scatter(ox, top, S, pts, run, { r: 2.9, w: 1.6 });
    const good = run.clusters === 2;
    return `${text(ox + S / 2, 18, `ε = ${fmt(eps)}`, { fill: 'var(--ink)', weight: 700, size: 14 })}${p.body}
${text(ox + S / 2, top + S + 20, `${clusterWord(run.clusters)}, ${fmt(run.noise)} noise`, { fill: 'var(--ink)', weight: 700, size: 12 })}
${text(ox + S / 2, top + S + 38, verdict, { size: 12, weight: good ? 700 : 500, fill: good ? k(2) : 'var(--muted)' })}`;
  }).join('');
  // Strips: for each number of points, the cluster count at every radius from 0.2 to 2.6 in steps of 0.05.
  const x0 = 96, x1 = 628, e0 = 0.2, e1 = 2.6, step = 0.05, sy = top + S + 112, bh = 20;
  const EX = e => x0 + (e - e0) / (e1 - e0) * (x1 - x0);
  const shade = n => n === 0 ? 'var(--line)' : n === 1 ? k(1) : n === 2 ? k(2) : k(3);
  const strip = (count, y) => {
    const data = labPoints('clusters', count);
    const segs = [];
    for (let e = e0; e <= e1 - step / 2; e += step) segs.push(`<rect x="${EX(e)}" y="${y}" width="${EX(e + step) - EX(e) + 0.4}" height="${bh}" fill="${shade(cluster(data, e, 4).clusters)}"/>`);
    return `${text(x0 - 10, y + 14, tr(`${fmt(count)} points`, `${fmt(count)} titik`), { anchor: 'end', size: 12, weight: 700, fill: 'var(--ink)' })}${segs.join('')}`;
  };
  const axis = [0.5, 1, 1.5, 2, 2.5].map(e => `${line(EX(e), sy + 2 * bh + 14, EX(e), sy + 2 * bh + 20, { c: 'var(--muted)', w: 1.4 })}${text(EX(e), sy + 2 * bh + 34, fmt(e, { digits: 1 }), { size: 12 })}`).join('');
  const key = [[shade(0), tr('0 clusters', '0 cluster')], [shade(1), tr('1 cluster', '1 cluster')], [shade(2), tr('2 clusters', '2 cluster')], [shade(3), tr('3 or more', '3 atau lebih')]]
    .map(([c, label], i) => `<rect x="${x0 + i * 128}" y="${sy - 34}" width="14" height="14" rx="3" fill="${c}"/>${text(x0 + i * 128 + 20, sy - 22, label, { anchor: 'start', size: 12, fill: 'var(--ink)' })}`).join('');
  const strips = `${text(x0, sy - 46, tr('Clusters found at each ε (MinPts 4)', 'Cluster yang ditemukan pada tiap ε (MinPts 4)'), { anchor: 'start', size: 13, weight: 700, fill: 'var(--ink)' })}${key}${strip(80, sy)}${strip(30, sy + bh + 6)}
${axis}${text((x0 + x1) / 2, sy + 2 * bh + 52, 'ε', { size: 13, fill: 'var(--ink)' })}`;
  return svg(640, 410, `${panels}${strips}`);
}

export const figures = {
  kinds,
  'hand-example': handExample,
  'radius-sweep': radiusSweep,
  'uneven-density': unevenDensity,
};
