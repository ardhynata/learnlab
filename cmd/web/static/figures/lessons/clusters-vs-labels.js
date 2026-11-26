// Figures for the lesson "Clusters versus labels". Every number comes from the same math the lab
// "k-means, then reveal the labels" uses (sims/ml/kmeansreveal.js on the shared course dataset, seed 1,
// k-means++), so the figures agree with the lesson text and with the lab. The penguin figure embeds the
// 342 penguins that have both a bill length and a flipper length (data/penguins.csv, in file order:
// 151 Adelie, 123 Gentoo, 68 Chinstrap) as "bill,flipper" pairs, because figures are drawn synchronously.
import { svg, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';
import { makeDataset, SHARED_SEED } from '../../sims/datasets.js';
import { runKMeans, compareWithClasses } from '../../sims/ml/kmeansreveal.js';

const INK = { fill: 'var(--ink)', weight: 700 };
// Class colours follow the lab: the outline of class j is colour CLASS_COLORS[j]; clusters are filled k(0), k(1), ...
const CLASS_COLORS = [3, 6, 4];
const num = v => fmt(v, { digits: 2 });
const circle = (x, y, r, fill, stroke, sw = 2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}/>`;
const diamondAt = (x, y, c, r = 7) => `<path d="M${x} ${y - r}l${r} ${r}-${r} ${r}-${r}-${r}z" fill="${c}" stroke="var(--ink)" stroke-width="1.8"/>`;

function sharedRun(name, kk) {
  const pts = makeDataset(name, SHARED_SEED, 48);
  const run = runKMeans(pts, { k: kk, init: 'kmeans++', seed: 1 });
  const last = run.steps[run.steps.length - 1];
  return { pts, run, last, cmp: compareWithClasses(last.labels, pts.map(p => p.label)) };
}
const classIndex = label => (label === 'A' ? 0 : 1);

// ---- Figure 1: the same 48 points three ways: labels known, labels hidden, clusters with the labels revealed. ----
function hideAndReveal() {
  const { pts, last } = sharedRun('clusters', 2);
  const S = 192, top = 52, u = S / 10;
  const panels = [
    { ox: 8, title: tr('1. Labels known', '1. Label diketahui'), sub: [tr('k-NN learns from the', 'k-NN belajar dari'), tr('class of every point.', 'kelas tiap titik.')] },
    { ox: 224, title: tr('2. Labels hidden', '2. Label disembunyikan'), sub: [tr('k-means sees only', 'k-means hanya melihat'), tr('where the points are.', 'posisi titiknya.')] },
    { ox: 440, title: tr('3. Run, then reveal', '3. Jalankan, lalu ungkap'), sub: [tr('Fill is the cluster, outline', 'Isi = cluster, garis tepi'), tr('is the true class.', '= kelas sebenarnya.')] },
  ];
  const body = panels.map((p, i) => {
    const X = v => p.ox + v * u, Y = v => top + S - v * u;
    const dots = pts.map((pt, j) => {
      const x = X(pt.x), y = Y(pt.y), c = CLASS_COLORS[classIndex(pt.label)];
      if (i === 0) return circle(x, y, 5, `var(--k${c})`);
      if (i === 1) return circle(x, y, 5, 'var(--muted)');
      return circle(x, y, 5, `var(--k${last.labels[j]})`, `var(--k${c})`, 2.2);
    }).join('');
    const cents = i === 2 ? last.centroids.map((c, j) => diamondAt(X(c[0]), Y(c[1]), k(j), 8)).join('') : '';
    return `${text(p.ox + S / 2, 24, p.title, { ...INK, size: 14 })}${box(p.ox, top, S, S)}${dots}${cents}
${text(p.ox + S / 2, top + S + 22, p.sub[0], { size: 12 })}${text(p.ox + S / 2, top + S + 38, p.sub[1], { size: 12 })}`;
  }).join('');
  const ly = 322;
  const legend = `${circle(150, ly - 4, 5, k(CLASS_COLORS[0]))}${text(162, ly, tr('Class A', 'Kelas A'), { anchor: 'start', size: 12 })}
${circle(240, ly - 4, 5, k(CLASS_COLORS[1]))}${text(252, ly, tr('Class B', 'Kelas B'), { anchor: 'start', size: 12 })}
${circle(330, ly - 4, 5, k(0))}${circle(344, ly - 4, 5, k(1))}${text(356, ly, tr('Cluster 1 and 2', 'Cluster 1 dan 2'), { anchor: 'start', size: 12 })}
${diamondAt(474, ly - 4, k(0), 6)}${text(486, ly, 'Centroid', { anchor: 'start', size: 12 })}`;
  return svg(640, 334, `${body}${legend}`);
}

// ---- Figure 2: reading the crosstab and computing purity from it. ----
function crosstab() {
  const { cmp } = sharedRun('clusters', 2);
  const t = cmp.table, n = t.n;
  const x0 = 10, y0 = 30, rh = 40, cw = [112, 70, 70, 56];
  const colX = [x0]; cw.forEach((w, i) => colX.push(colX[i] + w));
  const head = [tr('Cluster', 'Cluster'), tr('Class A', 'Kelas A'), tr('Class B', 'Kelas B'), 'Total'];
  const rowsOut = [];
  const cell = (r, c, content, o = {}) => `${o.fill ? `<rect x="${colX[c]}" y="${y0 + r * rh}" width="${cw[c]}" height="${rh}" fill="${o.fill}"/>` : ''}${text(c === 0 ? colX[c] + 10 : colX[c] + cw[c] / 2, y0 + r * rh + 25, content, { anchor: c === 0 ? 'start' : 'middle', fill: 'var(--ink)', weight: o.bold ? 700 : 500, size: 14 })}`;
  head.forEach((h, c) => rowsOut.push(cell(0, c, h, { bold: true })));
  let majority = 0;
  t.rows.forEach((cl, i) => {
    const top = Math.max(...t.counts[i]);
    majority += top;
    rowsOut.push(cell(i + 1, 0, tr(`Cluster ${cl + 1}`, `Cluster ${cl + 1}`), { bold: true }));
    t.counts[i].forEach((v, j) => rowsOut.push(cell(i + 1, j + 1, fmt(v), { bold: v === top, fill: v === top ? soft(2) : null })));
    rowsOut.push(cell(i + 1, 3, fmt(t.rowTotals[i])));
  });
  const tr3 = t.rows.length + 1;
  rowsOut.push(cell(tr3, 0, 'Total', { bold: true }));
  t.colTotals.forEach((v, j) => rowsOut.push(cell(tr3, j + 1, fmt(v))));
  rowsOut.push(cell(tr3, 3, fmt(n), { bold: true }));
  const lines = [0, 1, 2, 3, 4].map(r => line(x0, y0 + r * rh, colX[4], y0 + r * rh, { c: 'var(--line)', w: 1.4 })).join('');
  const hx = 330;
  const calc = `${text(hx, 52, tr('Largest cell of each row:', 'Sel terbesar tiap baris:'), { anchor: 'start', size: 13 })}
${text(hx, 76, `${fmt(Math.max(...t.counts[0]))} + ${fmt(Math.max(...t.counts[1]))} = ${fmt(majority)} ${tr('points', 'titik')}`, { anchor: 'start', ...INK, size: 15 })}
${text(hx, 112, tr('Purity = that sum / all points', 'Purity = jumlah itu / semua titik'), { anchor: 'start', size: 13 })}
${text(hx, 136, `${fmt(majority)} / ${fmt(n)} = ${pct(cmp.purity)}`, { anchor: 'start', ...INK, size: 15 })}
${text(hx, 172, tr('The numbers 1 and 2 are only names:', 'Angka 1 dan 2 hanya nama:'), { anchor: 'start', size: 13 })}
${text(hx, 190, tr('Cluster 1 here is mostly class B.', 'Cluster 1 di sini kebanyakan kelas B.'), { anchor: 'start', size: 13 })}`;
  return svg(640, 214, `${lines}${rowsOut.join('')}${calc}`);
}

// ---- Figure 3: purity and the adjusted Rand index as k grows, on two datasets. ----
function purityVsAri() {
  const W = 240, H = 160, top = 56;
  const series = name => {
    const out = [];
    for (let kk = 1; kk <= 8; kk++) { const { cmp } = sharedRun(name, kk); out.push({ k: kk, purity: cmp.purity, ari: cmp.ari }); }
    return out;
  };
  const panels = [
    { ox: 50, title: tr('Overlapping clusters', 'Cluster tumpang tindih'), data: series('clusters'), marks: [2, 8] },
    { ox: 360, title: tr('Checkerboard', 'Papan catur'), data: series('checker'), marks: [2, 4] },
  ];
  const body = panels.map(p => {
    const X = kk => p.ox + (kk - 1) / 7 * W, Y = v => top + H - Math.max(0, v) * H;
    const grid = [0, 0.5, 1].map(v => `${line(p.ox, Y(v), p.ox + W, Y(v), { c: 'var(--line)', w: 1.2 })}${text(p.ox - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 11 })}`).join('');
    const xt = p.data.map(d => text(X(d.k), top + H + 17, fmt(d.k), { size: 11 })).join('');
    const path = key => p.data.map((d, i) => `${i ? 'L' : 'M'}${X(d.k)} ${Y(d[key])}`).join('');
    const dots = (key, c) => p.data.map(d => circle(X(d.k), Y(d[key]), 3.6, c)).join('');
    const mk = p.marks.map(kk => {
      const d = p.data[kk - 1];
      return `${text(X(kk), Y(d.purity) - 9, pct(d.purity, 0), { fill: k(0), weight: 700, size: 12 })}${text(X(kk), Y(d.ari) - 9, num(d.ari), { fill: k(1), weight: 700, size: 12 })}`;
    }).join('');
    return `${text(p.ox + W / 2, 28, p.title, { ...INK, size: 14 })}${grid}${xt}
<path d="${path('purity')}" fill="none" stroke="${k(0)}" stroke-width="2.6" stroke-linejoin="round"/><path d="${path('ari')}" fill="none" stroke="${k(1)}" stroke-width="2.6" stroke-linejoin="round"/>
${dots('purity', k(0))}${dots('ari', k(1))}${mk}${text(p.ox + W / 2, top + H + 36, tr('Number of clusters k', 'Jumlah cluster k'), { size: 12 })}`;
  }).join('');
  const ly = 292;
  const legend = `${line(150, ly - 4, 176, ly - 4, { c: k(0), w: 3 })}${text(184, ly, 'Purity', { anchor: 'start', size: 12 })}
${line(290, ly - 4, 316, ly - 4, { c: k(1), w: 3 })}${text(324, ly, 'Adjusted Rand index', { anchor: 'start', size: 12 })}`;
  return svg(640, 306, `${body}${legend}`);
}

// ---- Figure 4: the penguins, with and without standardizing, k = 3. ----
const PENGUINS = '39.1,181 39.5,186 40.3,195 36.7,193 39.3,190 38.9,181 39.2,195 34.1,193 42,190 37.8,186 37.8,180 41.1,182 38.6,191 34.6,198 36.6,185 38.7,195 42.5,197 34.4,184 46,194 37.8,174 37.7,180 35.9,189 38.2,185 38.8,180 35.3,187 40.6,183 40.5,187 37.9,172 40.5,180 39.5,178 37.2,178 39.5,188 40.9,184 36.4,195 39.2,196 38.8,190 42.2,180 37.6,181 39.8,184 36.5,182 40.8,195 36,186 44.1,196 37,185 39.6,190 41.1,182 37.5,179 36,190 42.3,191 39.6,186 40.1,188 35,190 42,200 34.5,187 41.4,191 39,186 40.6,193 36.5,181 37.6,194 35.7,185 41.3,195 37.6,185 41.1,192 36.4,184 41.6,192 35.5,195 41.1,188 35.9,190 41.8,198 33.5,190 39.7,190 39.6,196 45.8,197 35.5,190 42.8,195 40.9,191 37.2,184 36.2,187 42.1,195 34.6,189 42.9,196 36.7,187 35.1,193 37.3,191 41.3,194 36.3,190 36.9,189 38.3,189 38.9,190 35.7,202 41.1,205 34,185 39.6,186 36.2,187 40.8,208 38.1,190 40.3,196 33.1,178 43.2,192 35,192 41,203 37.7,183 37.8,190 37.9,193 39.7,184 38.6,199 38.2,190 38.1,181 43.2,197 38.1,198 45.6,191 39.7,193 42.2,197 39.6,191 42.7,196 38.6,188 37.3,199 35.7,189 41.1,189 36.2,187 37.7,198 40.2,176 41.4,202 35.2,186 40.6,199 38.8,191 41.5,195 39,191 44.1,210 38.5,190 43.1,197 36.8,193 37.5,199 38.1,187 41.1,190 35.6,191 40.2,200 37,185 39.7,193 40.2,193 40.6,187 32.1,188 40.7,190 37.3,192 39,185 39.2,190 36.6,184 36,195 37.8,193 36,187 41.5,201 46.1,211 50,230 48.7,210 50,218 47.6,215 46.5,210 45.4,211 46.7,219 43.3,209 46.8,215 40.9,214 49,216 45.5,214 48.4,213 45.8,210 49.3,217 42,210 49.2,221 46.2,209 48.7,222 50.2,218 45.1,215 46.5,213 46.3,215 42.9,215 46.1,215 44.5,216 47.8,215 48.2,210 50,220 47.3,222 42.8,209 45.1,207 59.6,230 49.1,220 48.4,220 42.6,213 44.4,219 44,208 48.7,208 42.7,208 49.6,225 45.3,210 49.6,216 50.5,222 43.6,217 45.5,210 50.5,225 44.9,213 45.2,215 46.6,210 48.5,220 45.1,210 50.1,225 46.5,217 45,220 43.8,208 45.5,220 43.2,208 50.4,224 45.3,208 46.2,221 45.7,214 54.3,231 45.8,219 49.8,230 46.2,214 49.5,229 43.5,220 50.7,223 47.7,216 46.4,221 48.2,221 46.5,217 46.4,216 48.6,230 47.5,209 51.1,220 45.2,215 45.2,223 49.1,212 52.5,221 47.4,212 50,224 44.9,212 50.8,228 43.4,218 51.3,218 47.5,212 52.1,230 47.5,218 52.2,228 45.5,212 49.5,224 44.5,214 50.8,226 49.4,216 46.9,222 48.4,203 51.1,225 48.5,219 55.9,228 47.2,215 49.1,228 47.3,216 46.8,215 41.7,210 53.4,219 43.3,208 48.1,209 50.5,216 49.8,229 43.5,213 51.5,230 46.2,217 55.1,230 44.5,217 48.8,222 47.2,214 46.8,215 50.4,222 45.2,212 49.9,213 46.5,192 50,196 51.3,193 45.4,188 52.7,197 45.2,198 46.1,178 51.3,197 46,195 51.3,198 46.6,193 51.7,194 47,185 52,201 45.9,190 50.5,201 50.3,197 58,181 46.4,190 49.2,195 42.4,181 48.5,191 43.2,187 50.6,193 46.7,195 52,197 50.5,200 49.5,200 46.4,191 52.8,205 40.9,187 54.2,201 42.5,187 51,203 49.7,195 47.5,199 47.6,195 52,210 46.9,192 53.5,205 49,210 46.2,187 50.9,196 45.5,196 50.9,196 50.8,201 50.1,190 49,212 51.5,187 49.8,198 48.1,199 51.4,201 45.7,193 50.7,203 42.5,187 52.2,197 45.2,191 49.3,203 50.2,202 45.6,194 51.9,206 46.8,189 45.7,195 55.8,207 43.5,202 49.6,193 50.8,210 50.2,198'.split(' ').map((pair, i) => {
  const [x, y] = pair.split(',').map(Number);
  return { x, y, label: i < 151 ? 'Adelie' : i < 274 ? 'Gentoo' : 'Chinstrap' };
});
const SPECIES = ['Adelie', 'Chinstrap', 'Gentoo'];

function penguins() {
  const S = 270, H = 190, top = 62;
  const xLo = 30, xHi = 60, yLo = 170, yHi = 235;
  const panels = [
    { ox: 40, std: true, title: tr('Standardized first', 'Distandardisasi dulu') },
    { ox: 350, std: false, title: tr('Not standardized', 'Tanpa standardisasi') },
  ];
  const body = panels.map(p => {
    const run = runKMeans(PENGUINS, { k: 3, init: 'kmeans++', seed: 1, standardize: p.std });
    const last = run.steps[run.steps.length - 1];
    const cmp = compareWithClasses(last.labels, PENGUINS.map(q => q.label));
    const X = v => p.ox + (v - xLo) / (xHi - xLo) * S, Y = v => top + H - (v - yLo) / (yHi - yLo) * H;
    const xt = [30, 40, 50, 60].map(v => `${line(X(v), top, X(v), top + H, { c: 'var(--line)', w: 1 })}${text(X(v), top + H + 16, fmt(v), { size: 11 })}`).join('');
    const yt = [170, 190, 210, 230].map(v => `${line(p.ox, Y(v), p.ox + S, Y(v), { c: 'var(--line)', w: 1 })}${text(p.ox - 6, Y(v) + 4, fmt(v), { anchor: 'end', size: 11 })}`).join('');
    const dots = PENGUINS.map((q, i) => circle(X(q.x), Y(q.y), 3.7, `var(--k${last.labels[i]})`, `var(--k${CLASS_COLORS[SPECIES.indexOf(q.label)]})`, 1.7)).join('');
    const cents = last.centroids.map((c, j) => diamondAt(X(c[0]), Y(c[1]), k(j), 7)).join('');
    return `${text(p.ox + S / 2, 24, p.title, { ...INK, size: 14 })}${text(p.ox + S / 2, 42, tr(`purity ${pct(cmp.purity)}, adjusted Rand index ${num(cmp.ari)}`, `purity ${pct(cmp.purity)}, adjusted Rand index ${num(cmp.ari)}`), { size: 12, fill: 'var(--ink)' })}
${text(p.ox, top - 5, tr('Flipper length (mm)', 'Panjang sirip (mm)'), { anchor: 'start', size: 11 })}
${box(p.ox, top, S, H)}${xt}${yt}${dots}${cents}
${text(p.ox + S / 2, top + H + 34, tr('Bill length (mm)', 'Panjang paruh (mm)'), { size: 12 })}`;
  }).join('');
  const ly = 308;
  const legend = [['Adelie', 3], ['Chinstrap', 6], ['Gentoo', 4]].map(([name, c], i) => `${circle(78 + i * 112, ly - 4, 5, 'var(--surface)', k(c), 2.4)}${text(90 + i * 112, ly, name, { anchor: 'start', size: 12 })}`).join('')
    + text(420, ly, tr('outline = species, fill = cluster', 'garis tepi = spesies, isi = cluster'), { anchor: 'start', size: 12 });
  return svg(640, 322, `${body}${legend}`);
}

export const figures = {
  'hide-and-reveal': hideAndReveal,
  crosstab,
  'purity-vs-ari': purityVsAri,
  penguins,
};
