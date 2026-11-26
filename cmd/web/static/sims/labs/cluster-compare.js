// Cluster comparison lab, built on the kit: k-means, DBSCAN and hierarchical clustering run on the SAME points,
// side by side, with each method's cluster count, noise count and silhouette score, a dendrogram with its cut line,
// and a summary of which method matched the true groups best (adjusted Rand). Generated shapes come from
// ml/clusterdata.js, "Penguins (real)" from the bundled table (rows with a missing value are left out and the lab
// says so). The math is in ml/clustermethods.js and ml/clustercompare.js; this file only draws and wires.
import { createLab, createPlot, dataModeSpec, loadDataset, predictBox, clusterColor, theme, formatTick, tr, fmt } from '../kit/index.js';
import { makeClusterData, describeDataset, CLUSTER_KEYS, CLUSTER_COUNT, DEFAULT_SEED, DEFAULT_N } from '../ml/clusterdata.js';
import { dendrogramLayout } from '../ml/clustermethods.js';
import {
  PENGUIN_MEASURES, penguinCloud, penguinPoints, sampleOrder, fromPlotUnits, defaultParams, runComparison, hierarchy,
  bestMatch, silhouetteVerdict, separated, cutHeight, METHODS,
} from '../ml/clustercompare.js';

const START_DATASET = 'rings';
const MAX_K = 8;
const MAX_POINTS = 350;

// Names are built when used so they follow the language.
const methodName = key => ({ kmeans: tr('k-means', 'k-means'), dbscan: tr('DBSCAN', 'DBSCAN'), hier: tr('hierarchical clustering', 'hierarchical clustering') }[key]);
const linkageName = key => ({
  single: tr('single', 'single'), average: tr('average', 'average'), ward: tr('Ward', 'Ward'),
}[key]);
const measureName = key => ({
  bill_length_mm: tr('Bill length (mm)', 'Panjang paruh (mm)'), bill_depth_mm: tr('Bill depth (mm)', 'Kedalaman paruh (mm)'),
  flipper_length_mm: tr('Flipper length (mm)', 'Panjang sirip (mm)'), body_mass_g: tr('Body mass (g)', 'Massa tubuh (g)'),
}[key]);

const num = v => (Number.isFinite(v) ? fmt(v, { digits: 2 }) : '–');
const joinNames = keys => {
  const names = keys.map(methodName);
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')}${tr(' and ', ' dan ')}${names[names.length - 1]}`;
};
const sizesOf = labels => {
  const counts = new Map();
  for (const l of labels) if (l >= 0) counts.set(l, (counts.get(l) ?? 0) + 1);
  return [...counts.values()].sort((a, b) => b - a);
};

const STYLE = `
.cc-wrap{container-type:inline-size}
.cc-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:22px}
.cc-panel{min-width:0}
.cc-panel h3{margin:0 0 2px}
.cc-panel .cc-sub{margin:0 0 6px}
.cc-grid canvas{width:100%;height:min(100cqw,420px)}
.cc-grid canvas.cc-dendro{height:150px;margin-top:8px}
.cc-stats{margin:8px 0 0;display:grid;grid-template-columns:1fr auto;gap:3px 12px;font-size:13px}
.cc-stats dt{color:var(--muted)}
.cc-stats dd{margin:0;font-weight:700;text-align:right;font-variant-numeric:tabular-nums}
.cc-nosil{margin:4px 0 0;font-size:12px}
@container (min-width:760px){
  .cc-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
  .cc-grid canvas{height:calc((100cqw - 32px) / 3)}
  .cc-grid canvas.cc-dendro{height:150px}
}`;

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Compare clustering methods', 'Bandingkan metode clustering'),
    hint: tr('Three methods cluster the same points. Change a setting and watch how each one splits the data. Grey crosses are DBSCAN noise.', 'Tiga metode mengelompokkan titik yang sama. Ubah satu pengaturan dan lihat bagaimana tiap metode membagi data. Tanda silang abu-abu adalah noise DBSCAN.'),
    status: true, legend: true,
    canvasLabel: tr('Scatterplot of the k-means clusters', 'Scatterplot cluster hasil k-means'),
  });

  // Five legend entries wrap to several rows on a phone, more than the kit's 72px cap: show them all.
  const legendHost = lab.ref('legend');
  if (legendHost) legendHost.style.maxHeight = 'none';

  // ---- the three panels, side by side on a wide card and stacked on a phone ---------------------------------------
  const host = lab.canvas.parentElement;
  const wrap = document.createElement('div');
  wrap.className = 'cc-wrap';
  const style = document.createElement('style');
  style.textContent = STYLE;
  const grid = document.createElement('div');
  grid.className = 'cc-grid';
  wrap.append(style, grid);

  function makePanel(title, canvas) {
    const section = document.createElement('section');
    section.className = 'cc-panel';
    const h = document.createElement('h3'); h.className = 'lab-h'; h.textContent = title;
    const sub = document.createElement('p'); sub.className = 'hint cc-sub';
    const holder = document.createElement('div'); holder.append(canvas);
    const stats = document.createElement('dl'); stats.className = 'cc-stats';
    const note = document.createElement('p'); note.className = 'hint cc-nosil'; note.hidden = true;
    section.append(h, sub, holder, stats, note);
    grid.append(section);
    return { section, sub, stats, holder, note };
  }
  const newCanvas = (label, cls = '') => {
    const c = document.createElement('canvas');
    c.setAttribute('role', 'img'); c.setAttribute('aria-label', label);
    if (cls) c.className = cls;
    return c;
  };
  const kmCanvas = lab.canvas;
  kmCanvas.setAttribute('role', 'img'); kmCanvas.removeAttribute('tabindex');
  const dbCanvas = newCanvas(tr('Scatterplot of the DBSCAN clusters and noise', 'Scatterplot cluster dan noise hasil DBSCAN'));
  const hierCanvas = newCanvas(tr('Scatterplot of the hierarchical clusters', 'Scatterplot cluster hasil hierarchical clustering'));
  const dendroCanvas = newCanvas(tr('Dendrogram of the hierarchical clustering with the cut line', 'Dendrogram hierarchical clustering beserta garis potongnya'), 'cc-dendro');
  const panels = {
    kmeans: makePanel(methodName('kmeans'), kmCanvas),
    dbscan: makePanel(methodName('dbscan'), dbCanvas),
    hier: makePanel(tr('Hierarchical clustering', 'Hierarchical clustering'), hierCanvas),
  };
  const dendroHolder = document.createElement('div');
  dendroHolder.append(dendroCanvas);
  panels.hier.stats.before(dendroHolder);
  host.replaceChildren(wrap);
  const plots = { kmeans: createPlot(kmCanvas, { xLabel: '', yLabel: '' }), dbscan: createPlot(dbCanvas, { xLabel: '', yLabel: '' }), hier: createPlot(hierCanvas, { xLabel: '', yLabel: '' }) };
  const dendroObserver = new ResizeObserver(() => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; draw(); }); });
  let frame = 0;
  for (const c of [dbCanvas, hierCanvas, dendroCanvas]) dendroObserver.observe(c);
  lab.cleanup(() => { dendroObserver.disconnect(); cancelAnimationFrame(frame); });

  // ---- state and controls -----------------------------------------------------------------------------------------
  let mode = 'generated', seed = DEFAULT_SEED, table = null, loadFailed = false, loading = false, loadToken = 0, destroyed = false;
  let order = null, orderKey = '', result = null, data = null, mergeCache = { key: '', merges: null };
  let lastX = 'bill_length_mm', lastY = 'flipper_length_mm';
  const start = defaultParams('generated', CLUSTER_COUNT[START_DATASET], START_DATASET);

  const controls = lab.panel([
    dataModeSpec({ label: tr('Data source', 'Sumber data'), real: [['penguins', tr('Penguins (real)', 'Penguin (data nyata)')]] }),
    { name: 'dataset', type: 'select', label: tr('Generated dataset', 'Dataset buatan'), value: START_DATASET, options: CLUSTER_KEYS.map(key => [key, describeDataset(key).name]) },
    { name: 'xm', type: 'select', label: tr('Measurement on the x axis', 'Pengukuran di sumbu x'), value: lastX, options: PENGUIN_MEASURES.map(m => [m, measureName(m)]) },
    { name: 'ym', type: 'select', label: tr('Measurement on the y axis', 'Pengukuran di sumbu y'), value: lastY, options: PENGUIN_MEASURES.map(m => [m, measureName(m)]) },
    { name: 'n', type: 'range', label: tr('Number of points', 'Jumlah titik'), min: 40, max: MAX_POINTS, step: 10, value: DEFAULT_N },
    { name: 'newSample', type: 'button', label: tr('New sample', 'Sampel baru'), onClick: () => { seed += 1; settle(); } },
    { name: 'k', type: 'range', label: tr('k-means: number of clusters (k)', 'k-means: jumlah cluster (k)'), min: 1, max: MAX_K, step: 1, value: start.k },
    { name: 'eps', type: 'range', label: tr('DBSCAN: radius (eps)', 'DBSCAN: radius (eps)'), min: 0.1, max: 2, step: 0.05, value: start.eps, format: v => fmt(v, { digits: 2 }) },
    { name: 'minPts', type: 'range', label: tr('DBSCAN: minimum points (minPts)', 'DBSCAN: jumlah titik minimum (minPts)'), min: 2, max: 15, step: 1, value: start.minPts },
    {
      name: 'linkage', type: 'select', label: tr('Hierarchical: linkage', 'Hierarchical: linkage'), value: start.linkage,
      options: [['single', tr('Single (nearest pair)', 'Single (pasangan terdekat)')], ['average', tr('Average (mean of all pairs)', 'Average (rata-rata semua pasangan)')], ['ward', tr('Ward (smallest variance increase)', 'Ward (kenaikan varians terkecil)')]],
    },
    { name: 'hk', type: 'range', label: tr('Hierarchical: number of clusters (k)', 'Hierarchical: jumlah cluster (k)'), min: 1, max: MAX_K, step: 1, value: start.hk },
    { name: 'truth', type: 'toggle', label: tr('Show the true groups (outline)', 'Tampilkan kelompok sebenarnya (garis tepi)'), value: false },
    { type: 'note', text: tr('Every method gets the same points. Where a method agrees with the true groups, the same group has the same colour in all three panels.', 'Setiap metode memakai titik yang sama. Jika sebuah metode sesuai dengan kelompok sebenarnya, kelompok itu berwarna sama di ketiga panel.') },
  ], (name) => {
    if (name === 'data') { setMode(controls.get('data')); return; }
    if (name === 'dataset') {
      const ds = controls.get('dataset'), k = CLUSTER_COUNT[ds];
      controls.set('k', k); controls.set('hk', k); controls.set('eps', defaultParams('generated', k, ds).eps);
      resetBoxes();
    }
    if (name === 'xm' || name === 'ym') {
      // The two axes must differ: picking the other axis's measurement swaps them.
      if (controls.get('xm') === controls.get('ym')) controls.set(name === 'xm' ? 'ym' : 'xm', name === 'xm' ? lastX : lastY);
      lastX = controls.get('xm'); lastY = controls.get('ym');
    }
    settle();
  });
  const dataNote = document.createElement('p');
  dataNote.className = 'hint';
  dataNote.setAttribute('role', 'status');
  controls.el.querySelectorAll('select')[3].closest('label').after(dataNote);   // after the last data selector (the y measurement)
  const sync = () => {
    controls.show('dataset', mode === 'generated');
    controls.show('xm', mode === 'penguins' && !loadFailed);
    controls.show('ym', mode === 'penguins' && !loadFailed);
  };
  sync();

  const boxRings = predictBox(lab.ref('below'), {
    name: 'predict-rings',
    hint: tr('Pick "Two rings" as the generated dataset, then check again.', 'Pilih "Dua cincin" sebagai dataset buatan, lalu periksa lagi.'),
    question: tr('On two rings, which of the three methods will separate them?', 'Pada dua cincin, metode mana dari ketiganya yang akan memisahkannya?'),
    choices: [
      ['kmeans', tr('k-means', 'k-means')],
      ['dbscan', tr('DBSCAN', 'DBSCAN')],
      ['hier', tr('Hierarchical clustering', 'Hierarchical clustering')],
      ['several', tr('More than one of them', 'Lebih dari satu metode')],
      ['none', tr('None of them', 'Tidak satu pun')],
    ],
  });
  const silHint = () => tr('Pick "Two rings" and make sure one method separates them, then check again.', 'Pilih "Dua cincin" dan pastikan satu metode berhasil memisahkannya, lalu periksa lagi.');
  const boxSil = predictBox(lab.ref('below'), {
    name: 'predict-silhouette',
    hint: silHint(),
    question: tr('On two rings, does the method that separates them best also get the highest silhouette score?', 'Pada dua cincin, apakah metode yang paling baik memisahkannya juga mendapat skor silhouette tertinggi?'),
    choices: [
      ['yes', tr('Yes, the best method scores highest', 'Ya, metode terbaik skornya tertinggi')],
      ['no', tr('No, a method that cuts the rings wrongly scores higher', 'Tidak, metode yang memotong cincin dengan salah skornya lebih tinggi')],
      ['equal', tr('All three score about the same', 'Ketiganya skornya hampir sama')],
    ],
  });
  lab.cleanup(() => { boxRings.destroy(); boxSil.destroy(); });
  for (const box of [boxRings, boxSil]) { box.onPick(revealPredictions); box.onCheck(revealPredictions); }
  function resetBoxes() { boxRings.reset(); boxSil.reset(); }

  // ---- data ---------------------------------------------------------------------------------------------------------

  // The points the three methods share, their true groups, and how to label the axes.
  function getData() {
    const n = controls.get('n');
    if (mode === 'penguins' && table) {
      const xk = controls.get('xm'), yk = controls.get('ym');
      const cloud = penguinCloud(table, xk, yk);
      const key = `${seed}|${cloud.x.length}`;
      if (orderKey !== key) { order = sampleOrder(cloud.x.length, seed); orderKey = key; }
      const { points, truth } = penguinPoints(cloud, order, n);
      return { id: `penguins|${xk}|${yk}|${seed}|${n}`, points, truth, cloud, view: { penguins: true, xk, yk, e: cloud.extent } };
    }
    const dataset = controls.get('dataset');
    const made = makeClusterData(dataset, { n, seed });
    return { id: `${dataset}|${seed}|${n}`, points: made.points, truth: made.truth, cloud: null, view: { penguins: false } };
  }

  function compute() {
    data = getData();
    const p = controls.values();
    const key = `${data.id}|${p.linkage}`;
    if (mergeCache.key !== key) mergeCache = { key, merges: hierarchy(data.points, p.linkage) };
    result = runComparison(data.points, data.truth, { k: p.k, hk: p.hk, eps: p.eps, minPts: p.minPts, linkage: p.linkage }, { seed, merges: mergeCache.merges });
  }

  async function setMode(next) {
    const token = ++loadToken;
    loadFailed = false;
    resetBoxes();
    if (next === 'generated') { mode = 'generated'; loading = false; applyDefaults(); sync(); settle(); return; }
    loading = true; mode = next; sync(); drawStatusOnly();
    try {
      const t = await loadDataset(next);
      if (destroyed || token !== loadToken) return;
      table = t; loading = false;
      applyDefaults();
    } catch {
      if (destroyed || token !== loadToken) return;
      loading = false; loadFailed = true; mode = 'generated';
      controls.set('data', 'generated');
      applyDefaults();
    }
    sync();
    settle();
  }

  // A data source starts with the true number of groups and an eps that suits its scale.
  function applyDefaults() {
    const penguins = mode === 'penguins';
    const ds = controls.get('dataset');
    const d = defaultParams(penguins ? 'penguins' : 'generated', penguins ? 3 : CLUSTER_COUNT[ds], ds);
    controls.set('k', d.k); controls.set('hk', d.hk); controls.set('eps', d.eps); controls.set('minPts', d.minPts);
  }

  // ---- predictions ----------------------------------------------------------------------------------------------------

  function onRings() { return mode === 'generated' && controls.get('dataset') === 'rings' && result; }

  function revealPredictions() {
    if (!onRings()) return;
    const scores = METHODS.map(key => `${methodName(key)} ${num(result[key].ari)}`).join(', ');
    if (boxRings.chosen() != null) {
      const sep = separated(result);
      const actual = sep.length === 0 ? 'none' : sep.length > 1 ? 'several' : sep[0];
      const who = sep.length ? tr(`Separated the rings: ${joinNames(sep)}.`, `Yang memisahkan cincin: ${joinNames(sep)}.`) : tr('No method separated the rings with these settings.', 'Dengan pengaturan ini tidak ada metode yang memisahkan cincin.');
      boxRings.reveal(actual, `${who} ${tr(`Adjusted Rand against the true rings (1 means identical groups): ${scores}. Change eps or the linkage and watch the scores move.`, `Adjusted Rand terhadap cincin sebenarnya (1 berarti kelompoknya identik): ${scores}. Ubah eps atau linkage dan lihat skornya berubah.`)}`);
    }
    if (boxSil.chosen() != null) {
      const best = bestMatch(result), v = silhouetteVerdict(result);
      if (best.none || !v.topKey) {
        // Nobody separates the rings now: an answer shown earlier no longer describes the lab, so swap it for the same hint
        // the box gives on "Check answer" (a box not answered yet stays quiet until the learner checks).
        if (boxSil.answered) {
          const fb = boxSil.root.querySelector('.predict-feedback');
          if (fb) { fb.textContent = silHint(); fb.className = 'predict-feedback none'; }
        }
        return;
      }
      const actual = v.spread < 0.05 ? 'equal' : v.misleads ? 'no' : 'yes';
      const sil = METHODS.map(key => `${methodName(key)} ${num(result[key].silhouette)}`).join(', ');
      boxSil.reveal(actual, tr(`Silhouette scores: ${sil}. Best match to the true rings: ${joinNames(best.keys)}. Silhouette rewards compact, round clusters, so it can prefer a wrong cut that is round.`, `Skor silhouette: ${sil}. Paling cocok dengan cincin sebenarnya: ${joinNames(best.keys)}. Silhouette menyukai cluster yang padat dan bulat, jadi ia bisa memilih potongan yang salah asalkan bulat.`));
    }
  }

  // ---- drawing ---------------------------------------------------------------------------------------------------------

  // The kit labels each axis 0..10; penguin measurements are in other units, so those labels are erased (the margins
  // are transparent) and drawn again from the data range.
  function axes(plot, g, view) {
    if (!view.penguins) { plot.setLabels(tr('Feature 1', 'Feature 1'), tr('Feature 2', 'Feature 2')); return; }
    const ctx = plot.ctx, e = view.e;
    ctx.clearRect(0, 0, g.px(0) - 2, g.height);
    ctx.clearRect(0, g.py(0) + 2, g.width, g.height);
    ctx.save();
    ctx.fillStyle = g.t.muted; ctx.font = '11px system-ui, sans-serif';
    for (let i = 0; i <= 5; i++) {
      ctx.textAlign = 'center'; ctx.fillText(formatTick(Number(fromPlotUnits(i * 2, e.xLo, e.xHi).toPrecision(3))), g.px(i * 2), g.py(0) + 16);
      ctx.textAlign = 'right'; ctx.fillText(formatTick(Number(fromPlotUnits(i * 2, e.yLo, e.yHi).toPrecision(3))), g.px(0) - 7, g.py(i * 2) + 4);
    }
    // Both titles go under the plot ("x: ..." and "y: ..."): the margin left of a narrow panel is too thin for a rotated title.
    ctx.textAlign = 'center';
    const room = g.height - g.py(0) >= 48;
    if (room) {
      ctx.fillText(`x: ${measureName(view.xk)}`, g.px(5), g.py(0) + 31);
      ctx.fillText(`y: ${measureName(view.yk)}`, g.px(5), g.py(0) + 44);
    } else ctx.fillText(`x: ${measureName(view.xk)}   y: ${measureName(view.yk)}`, g.px(5), g.height - 5);
    ctx.restore();
  }

  function scatter(key, paint) {
    const plot = plots[key];
    if (!plot.ctx.canvas.getBoundingClientRect().width) return;
    if (!data.view.penguins) plot.setLabels(tr('Feature 1', 'Feature 1'), tr('Feature 2', 'Feature 2'));
    else plot.setLabels('', '');
    const g = plot.begin();
    axes(plot, g, data.view);
    const showTruth = controls.get('truth');
    plot.clip(() => {
      if (showTruth) data.points.forEach((p, i) => { if (data.truth[i] >= -1) plot.ring(p[0], p[1], clusterColor(data.truth[i]), 6.4, 1.5); });
      paint(plot, g);
    });
  }

  function drawDendrogram() {
    const canvas = dendroCanvas, ctx = canvas.getContext('2d'), t = theme();
    const { width, height } = canvas.getBoundingClientRect();
    if (!width) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const res = result.hier, merges = res.merges, n = data.points.length;
    const m = { l: 40, r: 8, t: 10, b: 8 };
    ctx.fillStyle = t.plot; ctx.fillRect(m.l, m.t, width - m.l - m.r, height - m.t - m.b);
    if (!merges.length) return;
    const layout = dendrogramLayout(merges, n);
    const leafOf = Array.from({ length: 2 * n - 1 }, (_, i) => i);
    merges.forEach(mg => { leafOf[mg.id] = leafOf[mg.a]; });
    const top = merges[merges.length - 1].height || 1;
    const X = x => m.l + 4 + (n > 1 ? x / (n - 1) : 0.5) * (width - m.l - m.r - 8);
    const Y = h => height - m.b - (h / top) * (height - m.t - m.b);
    const cut = cutHeight(merges, n, res.cutK);
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.3;
    for (const link of layout.links) {
      const inside = link.id - n < n - res.cutK;
      ctx.strokeStyle = inside ? clusterColor(res.labels[leafOf[link.id]]) : t.muted;
      ctx.beginPath();
      ctx.moveTo(X(link.xLeft), Y(link.yLeft)); ctx.lineTo(X(link.xLeft), Y(link.height));
      ctx.lineTo(X(link.xRight), Y(link.height)); ctx.lineTo(X(link.xRight), Y(link.yRight));
      ctx.stroke();
    }
    ctx.save(); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6; ctx.strokeStyle = t.ink;
    ctx.beginPath(); ctx.moveTo(m.l, Y(cut)); ctx.lineTo(width - m.r, Y(cut)); ctx.stroke(); ctx.restore();
    ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = t.muted;
    ctx.textAlign = 'right';
    ctx.fillText(formatTick(Number(top.toPrecision(3))), m.l - 5, m.t + 8); ctx.fillText('0', m.l - 5, height - m.b);
    ctx.save(); ctx.translate(11, (m.t + height - m.b) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center';
    ctx.fillText(tr('Merge distance', 'Jarak penggabungan'), 0, 0); ctx.restore();
    ctx.fillStyle = t.ink; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(tr(`cut: k = ${fmt(res.cutK)}`, `potong: k = ${fmt(res.cutK)}`), width - m.r - 4, Math.max(m.t + 10, Y(cut) - 4));
  }

  function statRows(panel, res) {
    const rows = [
      [tr('Clusters', 'Cluster'), fmt(res.clusters)],
      [tr('Noise points', 'Titik noise'), fmt(res.noise)],
      [tr('Silhouette score', 'Skor silhouette'), num(res.silhouette)],
      [tr('Match with the true groups (adjusted Rand)', 'Kecocokan dengan kelompok sebenarnya (adjusted Rand)'), num(res.ari)],
    ];
    const els = [];
    for (const [label, value] of rows) {
      const dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = label; dd.textContent = value;
      els.push(dt, dd);
    }
    panel.stats.replaceChildren(...els);
    // A score of "–" needs its reason on the page itself, not in a tooltip that touch and keyboard users never see.
    panel.note.hidden = Number.isFinite(res.silhouette);
    panel.note.textContent = panel.note.hidden ? '' : tr('Silhouette needs at least two clusters, so there is no score here.', 'Silhouette membutuhkan paling sedikit dua cluster, jadi di sini tidak ada skornya.');
  }

  function describeMethod(res, canvas, head) {
    const sizes = sizesOf(res.labels).map(s => fmt(s)).join(', ');
    lab.describe(canvas, tr(`${head}: ${fmt(res.clusters)} clusters${sizes ? ` of ${sizes} points` : ''}, ${fmt(res.noise)} noise points, silhouette ${num(res.silhouette)}, adjusted Rand ${num(res.ari)}.`,
      `${head}: ${fmt(res.clusters)} cluster${sizes ? ` berisi ${sizes} titik` : ''}, ${fmt(res.noise)} titik noise, silhouette ${num(res.silhouette)}, adjusted Rand ${num(res.ari)}.`));
  }

  function summaryText() {
    const best = bestMatch(result);
    if (!best.keys.length) return tr('This data has no true groups to compare with.', 'Data ini tidak punya kelompok sebenarnya untuk dibandingkan.');
    const ari = num(best.ari);
    if (best.none && best.keys.length === METHODS.length) return tr(`No method matched the true groups well: all three score about the same (adjusted Rand ${ari}).`, `Tidak ada metode yang cocok dengan kelompok sebenarnya: ketiganya berskor hampir sama (adjusted Rand ${ari}).`);
    if (best.none) return tr(`No method matched the true groups well: the closest is ${joinNames(best.keys)} (adjusted Rand ${ari}).`, `Tidak ada metode yang cocok dengan kelompok sebenarnya: yang terdekat adalah ${joinNames(best.keys)} (adjusted Rand ${ari}).`);
    if (best.keys.length === METHODS.length) return tr(`All three methods match the true groups equally well (adjusted Rand ${ari}).`, `Ketiga metode sama baiknya mencocokkan kelompok sebenarnya (adjusted Rand ${ari}).`);
    if (best.tie) return tr(`${joinNames(best.keys)} match the true groups best, tied (adjusted Rand ${ari}).`, `${joinNames(best.keys)} paling cocok dengan kelompok sebenarnya, seri (adjusted Rand ${ari}).`);
    return tr(`${joinNames(best.keys)} matches the true groups best (adjusted Rand ${ari}).`, `${joinNames(best.keys)} paling cocok dengan kelompok sebenarnya (adjusted Rand ${ari}).`);
  }
  function silhouetteReminder() {
    const v = silhouetteVerdict(result), best = bestMatch(result);
    if (v.misleads && v.topKey && !best.none) {   // when no method matched well, "yet X matched better" would contradict the summary
      return tr(`Silhouette alone misleads here: it scores ${methodName(v.topKey)} highest (${num(v.topValue)}), yet ${joinNames(best.keys)} matched the true groups better. Silhouette rewards compact, round clusters, so a correct split of rings or moons can score badly.`,
        `Silhouette saja menyesatkan di sini: skor tertingginya milik ${methodName(v.topKey)} (${num(v.topValue)}), padahal ${joinNames(best.keys)} lebih cocok dengan kelompok sebenarnya. Silhouette menyukai cluster yang padat dan bulat, sehingga pemisahan cincin atau bulan sabit yang benar pun bisa mendapat skor buruk.`);
    }
    return tr('Silhouette alone can mislead: it rewards compact, round clusters, so a correct split of rings or moons can score badly. Look at the picture and at the match with the true groups too.',
      'Silhouette saja bisa menyesatkan: ia menyukai cluster yang padat dan bulat, sehingga pemisahan cincin atau bulan sabit yang benar pun bisa mendapat skor buruk. Lihat juga gambarnya dan kecocokan dengan kelompok sebenarnya.');
  }

  function drawStatusOnly() {
    lab.setStatus(tr('Loading the penguin data…', 'Memuat data penguin…'));
  }

  function draw() {
    if (!result) return;
    const p = controls.values(), n = data.points.length;
    scatter('kmeans', (plot) => {
      data.points.forEach((pt, i) => plot.dot(pt[0], pt[1], clusterColor(result.kmeans.labels[i]), 3.6));
      result.kmeans.centroids.forEach((c, ci) => plot.diamond(c[0], c[1], clusterColor(result.kmeans.centroidIds[ci]), 7));
    });
    scatter('dbscan', (plot) => {
      data.points.forEach((pt, i) => {
        const l = result.dbscan.labels[i];
        if (l < 0) plot.cross(pt[0], pt[1], clusterColor(-1), 3);
        else plot.dot(pt[0], pt[1], clusterColor(l), result.dbscan.core[i] ? 3.8 : 2.4);
      });
    });
    scatter('hier', (plot) => {
      data.points.forEach((pt, i) => plot.dot(pt[0], pt[1], clusterColor(result.hier.labels[i]), 3.6));
    });
    drawDendrogram();

    panels.kmeans.sub.textContent = `k = ${fmt(p.k)}`;
    panels.dbscan.sub.textContent = `eps = ${fmt(p.eps, { digits: 2 })}, minPts = ${fmt(p.minPts)}`;
    panels.hier.sub.textContent = tr(`${linkageName(p.linkage)} linkage, k = ${fmt(p.hk)}`, `Linkage ${linkageName(p.linkage)}, k = ${fmt(p.hk)}`);
    for (const key of METHODS) statRows(panels[key], result[key]);
    describeMethod(result.kmeans, kmCanvas, tr(`k-means with k = ${fmt(p.k)}`, `k-means dengan k = ${fmt(p.k)}`));
    describeMethod(result.dbscan, dbCanvas, tr(`DBSCAN with eps ${fmt(p.eps, { digits: 2 })} and minPts ${fmt(p.minPts)}`, `DBSCAN dengan eps ${fmt(p.eps, { digits: 2 })} dan minPts ${fmt(p.minPts)}`));
    describeMethod(result.hier, hierCanvas, tr(`Hierarchical clustering, ${linkageName(p.linkage)} linkage, k = ${fmt(p.hk)}`, `Hierarchical clustering, linkage ${linkageName(p.linkage)}, k = ${fmt(p.hk)}`));
    lab.describe(dendroCanvas, tr(`Dendrogram of ${fmt(n)} points, cut into ${fmt(result.hier.cutK)} clusters at the dashed line.`, `Dendrogram dari ${fmt(n)} titik, dipotong menjadi ${fmt(result.hier.cutK)} cluster pada garis putus-putus.`));

    if (loading) drawStatusOnly();
    else { lab.setStatus(summaryText()); lab.setDetail(silhouetteReminder()); }
    lab.setMetrics(tr(`${fmt(n)} points`, `${fmt(n)} titik`));
    lab.setLegend([
      { kind: 'dot', color: clusterColor(0), label: tr('Point, coloured by its cluster (DBSCAN: small dot = border point)', 'Titik, diwarnai menurut clusternya (DBSCAN: titik kecil = border point)') },
      { kind: 'diamond', color: clusterColor(1), label: tr('k-means centroid (mean of its cluster)', 'Centroid k-means (rata-rata clusternya)') },
      { kind: 'cross', color: clusterColor(-1), label: tr('DBSCAN noise', 'Noise DBSCAN') },
      { kind: 'dash', color: theme().ink, label: tr('Dendrogram cut line (cuts the tree into k clusters)', 'Garis potong dendrogram (memotong pohon menjadi k cluster)') },
      ...(controls.get('truth') ? [{ kind: 'ring', color: clusterColor(0), label: tr('Outline: true group', 'Garis tepi: kelompok sebenarnya') }] : []),
    ]);
    if (mode === 'penguins' && table) {
      const c = data.cloud;
      dataNote.textContent = tr(
        `${fmt(c.x.length)} of ${fmt(c.total)} penguins have both measurements; ${fmt(c.dropped)} rows with missing values (NA) are left out. Showing ${fmt(n)} of the ${fmt(c.x.length)}. Each measurement is rescaled to 0–10 so neither one dominates the distances. The three species are the true groups; none of the methods sees them.`,
        `${fmt(c.x.length)} dari ${fmt(c.total)} penguin punya kedua pengukuran; ${fmt(c.dropped)} baris dengan missing value (NA) dibuang. Menampilkan ${fmt(n)} dari ${fmt(c.x.length)}. Tiap pengukuran diskalakan ke 0–10 agar tidak ada yang mendominasi jarak. Ketiga spesies adalah kelompok sebenarnya; tidak ada metode yang melihatnya.`);
    } else if (loading) dataNote.textContent = '';
    else if (loadFailed) dataNote.textContent = tr('Could not load the penguin data, so the generated data is shown.', 'Data penguin tidak bisa dimuat, jadi data buatan yang ditampilkan.');
    else dataNote.textContent = describeDataset(controls.get('dataset')).description;
  }
  // After any change that is complete: recompute, redraw, then check the predictions.
  function settle() {
    if (loading) return;
    compute();
    draw();
    revealPredictions();
  }

  lab.onReset(() => {
    loadToken += 1;
    mode = 'generated'; seed = DEFAULT_SEED; loading = false; loadFailed = false;
    controls.set('data', 'generated'); controls.set('dataset', START_DATASET); controls.set('n', DEFAULT_N);
    controls.set('xm', 'bill_length_mm'); controls.set('ym', 'flipper_length_mm'); lastX = 'bill_length_mm'; lastY = 'flipper_length_mm';
    controls.set('linkage', start.linkage); controls.set('truth', false);
    applyDefaults(); sync(); resetBoxes();
    settle();
  });
  lab.onTheme(draw);
  lab.onResize(draw);
  lab.cleanup(() => { destroyed = true; loadToken += 1; });
  settle();
  return lab.destroy;
}
