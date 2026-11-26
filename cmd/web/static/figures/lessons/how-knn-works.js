// Figures for the lesson "How k-NN decides". They draw real penguins from the bundled penguins.csv
// (Adelie and Chinstrap with both bill measurements, one Adelie held out as the new penguin), and every
// vote, distance and region is computed here with the course's own k-NN math (sims/ml/knn.js), so the
// figures agree with the lesson text and with the k-NN lab.
import { svg, dot, ring, diamond, text, line, box, k, tr, fmt } from '../kit.js';
import { classify, neighbors } from '../../sims/ml/knn.js';

// 150 Adelie and 68 Chinstrap: bill length (mm) and bill depth (mm), as "length depth" pairs.
const parse = s => s.split(',').map(p => p.split(' ').map(Number));
const ADELIE = parse('39.1 18.7,39.5 17.4,40.3 18,36.7 19.3,39.3 20.6,38.9 17.8,39.2 19.6,34.1 18.1,42 20.2,37.8 17.1,37.8 17.3,41.1 17.6,38.6 21.2,34.6 21.1,36.6 17.8,38.7 19,42.5 20.7,34.4 18.4,46 21.5,37.8 18.3,37.7 18.7,35.9 19.2,38.2 18.1,38.8 17.2,35.3 18.9,40.6 18.6,40.5 17.9,37.9 18.6,40.5 18.9,39.5 16.7,37.2 18.1,39.5 17.8,40.9 18.9,36.4 17,39.2 21.1,38.8 20,42.2 18.5,37.6 19.3,39.8 19.1,36.5 18,40.8 18.4,36 18.5,44.1 19.7,37 16.9,39.6 18.8,41.1 19,37.5 18.9,36 17.9,42.3 21.2,39.6 17.7,40.1 18.9,35 17.9,42 19.5,34.5 18.1,41.4 18.6,39 17.5,40.6 18.8,36.5 16.6,37.6 19.1,35.7 16.9,41.3 21.1,37.6 17,41.1 18.2,36.4 17.1,41.6 18,35.5 16.2,41.1 19.1,35.9 16.6,41.8 19.4,33.5 19,39.7 18.4,39.6 17.2,45.8 18.9,35.5 17.5,42.8 18.5,40.9 16.8,37.2 19.4,36.2 16.1,42.1 19.1,34.6 17.2,42.9 17.6,36.7 18.8,35.1 19.4,37.3 17.8,41.3 20.3,36.3 19.5,36.9 18.6,38.3 19.2,38.9 18.8,35.7 18,41.1 18.1,34 17.1,39.6 18.1,36.2 17.3,40.8 18.9,38.1 18.6,40.3 18.5,33.1 16.1,43.2 18.5,35 17.9,41 20,37.7 16,37.8 20,37.9 18.6,39.7 18.9,38.6 17.2,38.2 20,38.1 17,43.2 19,38.1 16.5,45.6 20.3,39.7 17.7,42.2 19.5,39.6 20.7,42.7 18.3,38.6 17,37.3 20.5,35.7 17,41.1 18.6,36.2 17.2,37.7 19.8,40.2 17,41.4 18.5,35.2 15.9,40.6 19,38.8 17.6,41.5 18.3,39 17.1,38.5 17.9,43.1 19.2,36.8 18.5,37.5 18.5,38.1 17.6,41.1 17.5,35.6 17.5,40.2 20.1,37 16.5,39.7 17.9,40.2 17.1,40.6 17.2,32.1 15.5,40.7 17,37.3 16.8,39 18.7,39.2 18.6,36.6 18.4,36 17.8,37.8 18.1,36 17.1,41.5 18.5');
const CHINSTRAP = parse('46.5 17.9,50 19.5,51.3 19.2,45.4 18.7,52.7 19.8,45.2 17.8,46.1 18.2,51.3 18.2,46 18.9,51.3 19.9,46.6 17.8,51.7 20.3,47 17.3,52 18.1,45.9 17.1,50.5 19.6,50.3 20,58 17.8,46.4 18.6,49.2 18.2,42.4 17.3,48.5 17.5,43.2 16.6,50.6 19.4,46.7 17.9,52 19,50.5 18.4,49.5 19,46.4 17.8,52.8 20,40.9 16.6,54.2 20.8,42.5 16.7,51 18.8,49.7 18.6,47.5 16.8,47.6 18.3,52 20.7,46.9 16.6,53.5 19.9,49 19.5,46.2 17.5,50.9 19.1,45.5 17,50.9 17.9,50.8 18.5,50.1 17.9,49 19.6,51.5 18.7,49.8 17.3,48.1 16.4,51.4 19,45.7 17.3,50.7 19.7,42.5 17.3,52.2 18.8,45.2 16.6,49.3 19.9,50.2 18.8,45.6 19.4,51.9 19.5,46.8 16.5,45.7 17,55.8 19.8,43.5 18.1,49.6 18.2,50.8 19,50.2 18.7');
const STORED = [...ADELIE.map(f => ({ features: f, label: 'Adelie' })), ...CHINSTRAP.map(f => ({ features: f, label: 'Chinstrap' }))];
// The new penguin: a real Adelie, held out of STORED, treated as if its species were unknown.
const QUERY = { features: [44.1, 18.0], label: 'Adelie' };
const COLOR = { Adelie: 0, Chinstrap: 1 };
const name = label => (label === 'Adelie' ? 'Adelie' : 'Chinstrap');
const one = v => fmt(v, { digits: 1 });
const two = v => fmt(v, { digits: 2 });

// ---- Figure 1: the stored penguins, and the neighbors of the new one (zoomed in, equal scale). ----
function penguinNeighbors() {
  const near = neighbors(STORED, QUERY, 9);
  // Left: all stored penguins. x is bill length 31..60 mm, y is bill depth 15..22 mm.
  const ox = 44, oy = 48, W = 262, H = 190;
  const X = v => ox + (v - 31) / 29 * W, Y = v => oy + H - (v - 15) / 7 * H;
  const dots = STORED.map(p => dot(X(p.features[0]), Y(p.features[1]), k(COLOR[p.label]), 2.6)).join('');
  const half = 2.2;                                   // zoom window: query +/- 2.2 mm on both axes
  const zoomBox = `<rect x="${X(QUERY.features[0] - half)}" y="${Y(QUERY.features[1] + half)}" width="${X(QUERY.features[0] + half) - X(QUERY.features[0] - half)}" height="${Y(QUERY.features[1] - half) - Y(QUERY.features[1] + half)}" fill="none" stroke="var(--ink)" stroke-width="1.6"/>`;
  const ticksL = [35, 45, 55].map(t => `${text(X(t), oy + H + 16, fmt(t), { size: 12 })}`).join('');
  const ticksD = [16, 18, 20, 22].map(t => text(ox - 7, Y(t) + 4, fmt(t), { anchor: 'end', size: 12 })).join('');
  const left = `${box(ox, oy, W, H)}${dots}${zoomBox}${diamond(X(QUERY.features[0]), Y(QUERY.features[1]), 'var(--surface)', 7)}${ticksL}${ticksD}
${text(ox + W / 2, oy + H + 34, tr('Bill length (mm)', 'Panjang paruh (mm)'), { size: 12 })}
${text(ox - 30, oy - 8, tr('Bill depth (mm)', 'Kedalaman paruh (mm)'), { anchor: 'start', size: 12 })}
${text(ox, 16, tr('All stored penguins', 'Semua penguin tersimpan'), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 })}`;

  // Right: the zoom, the same number of pixels per mm on both axes, so a ring is a true distance.
  const rx = 372, ry = 48, S = 256, u = S / (2 * half);
  const x0 = QUERY.features[0] - half, y1 = QUERY.features[1] + half;
  const RX = v => rx + (v - x0) * u, RY = v => ry + (y1 - v) * u;
  const qx = RX(QUERY.features[0]), qy = RY(QUERY.features[1]);
  const inside = STORED.filter(p => Math.abs(p.features[0] - QUERY.features[0]) < half && Math.abs(p.features[1] - QUERY.features[1]) < half);
  const rankOf = new Map(near.slice(0, 7).map((n, r) => [n.i, r + 1]));
  const rings = [1, 3, 5].map(kk => {
    const r = near[kk - 1].d * u;
    const ly = kk === 3 ? qy + r + 4 : qy - r - 5;     // k = 3 sits on the bottom of its ring, the others above theirs
    return `<circle cx="${qx}" cy="${qy}" r="${r}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 4"/>${text(qx, ly, `k = ${fmt(kk)}`, { size: 12, fill: 'var(--ink)', weight: 700 }).replace('<text ', '<text stroke="var(--surface)" stroke-width="4" paint-order="stroke" ')}`;
  }).join('');
  const members = inside.map(p => {
    const idx = STORED.indexOf(p), r = rankOf.get(idx), x = RX(p.features[0]), y = RY(p.features[1]);
    if (!r) return dot(x, y, k(COLOR[p.label]), 3.4);
    const left = r >= 6;                                // ranks 6 and 7 crowd rank 2, so label them on the left
    return `${ring(x, y, k(COLOR[p.label]), 6.5)}${text(left ? x - 10 : x + 10, y + 4, fmt(r), { anchor: left ? 'end' : 'start', size: 13, fill: 'var(--ink)', weight: 700 })}`;
  }).join('');
  const right = `${box(rx, ry, S, S)}${rings}${members}${diamond(qx, qy, 'var(--surface)', 9)}
${text(rx, 16, tr('Zoom: the 7 nearest, numbered', 'Zoom: 7 neighbor terdekat, bernomor'), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 })}
${text(rx + S / 2, ry + S + 16, tr('Equal scale on both axes', 'Skala sama di kedua sumbu'), { size: 12 })}`;

  const lg = (x, c, label) => `${dot(x, 312, k(c), 6)}${text(x + 11, 316, label, { anchor: 'start', size: 12, fill: 'var(--ink)' })}`;
  const legend = `${lg(44, 0, 'Adelie')}${lg(120, 1, 'Chinstrap')}${diamond(44, 334, 'var(--surface)', 7)}${text(56, 338, tr('new penguin (species hidden)', 'penguin baru (spesies disembunyikan)'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}`;
  return svg(660, 348, `${left}${right}${legend}`);
}

// ---- Figure 2: the vote for k = 1 .. 7 on the same penguin. ----
function voteByK() {
  const near = neighbors(STORED, QUERY, 7);
  const top = 50, rowH = 34, c0 = 78, step = 29;
  const head = `${text(c0 - 8, 26, tr('Neighbors, closest first', 'Neighbor, dari yang terdekat'), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 })}
${text(330, 26, tr('Votes', 'Voting'), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 })}
${text(530, 26, tr('Answer', 'Jawaban'), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 })}`;
  const rows = [1, 2, 3, 4, 5, 6, 7].map(kk => {
    const y = top + (kk - 1) * rowH, res = classify(STORED, QUERY, kk), c = COLOR[res.label];
    const dots = near.slice(0, kk).map((n, r) => dot(c0 + r * step + 8, y + 10, k(COLOR[STORED[n.i].label]), 9) + text(c0 + r * step + 8, y + 14.5, fmt(r + 1), { size: 11, fill: '#fff', weight: 700 })).join('');
    const tally = `Adelie ${fmt(res.votes.Adelie ?? 0)} : Chinstrap ${fmt(res.votes.Chinstrap ?? 0)}`;
    return `${kk % 2 === 0 ? `<rect x="2" y="${y - 6}" width="656" height="${rowH - 2}" rx="6" fill="var(--surface-2)"/>` : ''}
${text(18, y + 15, `k = ${fmt(kk)}`, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 14 })}${dots}
${text(330, y + 15, tally, { anchor: 'start', fill: 'var(--ink)', size: 13 })}
${text(530, y + 15, name(res.label), { anchor: 'start', fill: k(c), weight: 700, size: 14 })}${res.tied ? text(612, y + 15, tr('tie', 'seri'), { anchor: 'start', size: 12 }) : ''}`;
  }).join('');
  return svg(660, 292, `${head}${rows}`);
}

// ---- Figure 3: the answer at every position (decision regions), for k = 1 and k = 9. ----
function decisionMap() {
  const x0 = 31, x1 = 60, y0 = 15, y1 = 22, nx = 58, ny = 28;
  const tint = c => `color-mix(in srgb, var(--k${c}) 30%, var(--surface))`;
  const panel = (ox, kk) => {
    const W = 286, H = 150, oy = 34;
    const X = v => ox + (v - x0) / (x1 - x0) * W, Y = v => oy + H - (v - y0) / (y1 - y0) * H;
    let regions = '';
    for (let j = 0; j < ny; j++) {
      const cy = y0 + (j + 0.5) * (y1 - y0) / ny;
      let runStart = 0, runLabel = null;
      for (let i = 0; i <= nx; i++) {
        const label = i < nx ? classify(STORED, { features: [x0 + (i + 0.5) * (x1 - x0) / nx, cy] }, kk).label : null;
        if (label !== runLabel) {
          if (runLabel !== null) regions += `<rect x="${X(x0 + runStart * (x1 - x0) / nx)}" y="${Y(y0 + (j + 1) * (y1 - y0) / ny)}" width="${X(x0 + i * (x1 - x0) / nx) - X(x0 + runStart * (x1 - x0) / nx) + 0.4}" height="${H / ny + 0.4}" fill="${tint(COLOR[runLabel])}"/>`;
          runStart = i; runLabel = label;
        }
      }
    }
    const pts = STORED.map(p => dot(X(p.features[0]), Y(p.features[1]), k(COLOR[p.label]), 2.1)).join('');
    const ans = classify(STORED, QUERY, kk).label;
    return `${text(ox, 20, `k = ${fmt(kk)} ` + (kk === 1 ? tr('(jagged, follows every point)', '(bergerigi, mengikuti tiap titik)') : tr('(smoother)', '(lebih mulus)')), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 })}
<rect x="${ox}" y="${oy}" width="${W}" height="${H}" rx="6" fill="var(--surface)"/>${regions}${pts}<rect x="${ox}" y="${oy}" width="${W}" height="${H}" rx="6" fill="none" stroke="var(--line)" stroke-width="1.6"/>
${diamond(X(QUERY.features[0]), Y(QUERY.features[1]), tint(COLOR[ans]), 7)}
${[35, 45, 55].map(t => text(X(t), oy + H + 15, fmt(t), { size: 11 })).join('')}
${text(ox + W / 2, oy + H + 30, tr('Bill length (mm)', 'Panjang paruh (mm)'), { size: 12 })}`;
  };
  const lg = (x, c, label) => `<rect x="${x}" y="262" width="16" height="12" rx="3" fill="${tint(c)}" stroke="${k(c)}"/>${text(x + 22, 273, label, { anchor: 'start', size: 12, fill: 'var(--ink)' })}`;
  return svg(660, 284, `${panel(4, 1)}${panel(334, 9)}
${lg(4, 0, tr('answer would be Adelie', 'jawabannya Adelie'))}${lg(190, 1, tr('answer would be Chinstrap', 'jawabannya Chinstrap'))}
${diamond(425, 268, 'var(--surface)', 6)}${text(437, 273, tr('the new penguin', 'penguin baru'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}`);
}

export const figures = { 'penguin-neighbors': penguinNeighbors, 'vote-by-k': voteByK, 'decision-map': decisionMap };
