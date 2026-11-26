// Ensemble lab: bagging (or a random forest) against gradient boosting, on the same noisy two-class data.
// Both ensembles are fitted once for 100 trees; the "Number of trees" slider and the "Add a tree" button
// choose how many of them vote, so the decision regions grow tree by tree. A chart follows the training and
// validation error (or log loss) of both methods against the number of trees, with boosting's
// early-stopping point marked. Real data: the Adelie and Chinstrap penguins on two chosen measurements
// (rows with a missing value, NA, are left out and the lab says so). The math is in sims/ml/ensemblelab.js
// (and sims/ml/ensemble.js); this file draws and wires.
import { createLab, createPlot, drawLineChart, clusterColor, theme, tr, fmt, pct, predictBox, dataModeSpec, loadDataset } from '../kit/index.js';
import { parseCsv } from '../ml/tabular.js';
import { chartRuns } from '../ml/overfitdemo.js';
import {
  MAX_TREES, TOTAL_POINTS, BAG_DEPTH, BAG_MIN_LEAF, DEFAULTS, PAIR, MEASUREMENTS,
  generatedData, penguinPair, splitData, fitBagging, fitBoosting, curvesOf, metricCurves,
  bestTrees, risesAgain, overfitAnswer, regionGrid, featuresPerSplit,
} from '../ml/ensemblelab.js';

const GRID = 80;                                    // decision regions are drawn on an 80 x 80 grid
const BAG_COLOR = () => clusterColor(2);
const BOOST_COLOR = () => clusterColor(3);
const CAPS = { logloss: 2, error: 0.6 };            // the top of the chart; a larger value is cut off and marked

// loadDataset (sims/kit/data.js) evicts a failed fetch, but a retry here fetches directly so a transient
// failure cannot poison the page (the same fallback as the overfit lab).
const fetchPenguins = () => fetch(new URL('../../data/penguins.csv', import.meta.url)).then(r => {
  if (!r.ok) throw new Error(`dataset penguins: HTTP ${r.status}`);
  return r.text();
}).then(parseCsv);

const MEASURE_LABELS = {
  bill_length_mm: () => tr('Bill length (mm)', 'Panjang paruh (mm)'),
  bill_depth_mm: () => tr('Bill depth (mm)', 'Kedalaman paruh (mm)'),
  flipper_length_mm: () => tr('Flipper length (mm)', 'Panjang flipper (mm)'),
  body_mass_g: () => tr('Body mass (g)', 'Massa tubuh (g)'),
};
const AXIS_LABELS = {
  bill_length_mm: () => tr('Bill length (scaled 0–10)', 'Panjang paruh (skala 0–10)'),
  bill_depth_mm: () => tr('Bill depth (scaled 0–10)', 'Kedalaman paruh (skala 0–10)'),
  flipper_length_mm: () => tr('Flipper length (scaled 0–10)', 'Panjang flipper (skala 0–10)'),
  body_mass_g: () => tr('Body mass (scaled 0–10)', 'Massa tubuh (skala 0–10)'),
};

const rgbOf = hex => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [128, 128, 128];
  const n = parseInt(m[1], 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
};
const treesWord = n => tr(n === 1 ? 'tree' : 'trees', 'pohon');

export function mount(root) {
  let alive = true;
  const lab = createLab(root, {
    title: tr('Bagging and boosting, tree by tree', 'Bagging dan boosting, pohon demi pohon'),
    hint: tr(
      'Bagging grows many deep trees on resampled data and averages them. Boosting adds small trees one at a time, each one correcting the trees before it. The background shows what each ensemble predicts: the color is the predicted class and a stronger tint means a more confident prediction.',
      'Bagging menumbuhkan banyak pohon dalam pada data hasil resampling lalu merata-ratakannya. Boosting menambah pohon kecil satu per satu, dan tiap pohon memperbaiki pohon sebelumnya. Latar menunjukkan prediksi tiap ensemble: warnanya adalah kelas prediksi, dan warna yang lebih pekat berarti prediksi lebih yakin.'),
    status: true, legend: true,
    canvasLabel: tr('Plot of the bagging ensemble', 'Plot ensemble bagging'),
    settingsTitle: tr('Controls', 'Pengaturan'),
    extra: {
      title: tr('Bagging and boosting side by side', 'Bagging dan boosting berdampingan'),
      hint: tr(
        'The numbers behind the picture, at the number of trees you chose. Lower is better. Until you check your prediction, the best number of trees only looks at the trees you have added so far.',
        'Angka di balik gambar, pada jumlah pohon yang kamu pilih. Semakin kecil semakin baik. Sebelum prediksimu dicek, jumlah pohon terbaik hanya melihat pohon yang sudah kamu tambahkan.'),
    },
  });
  lab.cleanup(() => { alive = false; });

  // Two square plots side by side (stacked on a narrow screen): bagging on the left, boosting on the right.
  // The lab's own canvas becomes the first one; both are pictures, so no tab stop.
  const holder = lab.canvas.parentElement;
  const style = document.createElement('style');
  style.textContent = '.el-panels{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px}'
    + '.el-panels canvas{height:auto;aspect-ratio:1 / 1}.el-cap{margin:0 0 4px;font-size:14px}'
    + '.table-card table.el-table{width:100%;min-width:0;font-size:13px}.el-table th,.el-table td{padding:6px 8px}.el-table td:first-child,.el-table th:first-child{text-align:left;white-space:normal}';
  const caps = [document.createElement('h3'), document.createElement('h3')];
  const second = document.createElement('canvas');
  const left = document.createElement('div'), right = document.createElement('div');
  caps.forEach(c => { c.className = 'lab-h el-cap'; });
  holder.classList.add('el-panels');
  const first = lab.canvas;
  first.setAttribute('role', 'img');
  first.removeAttribute('tabindex');
  second.setAttribute('role', 'img');
  left.append(caps[0], first);
  right.append(caps[1], second);
  holder.replaceChildren(style, left, right);
  const plots = [createPlot(first), createPlot(second)];

  const box = predictBox(lab.ref('below'), {
    question: tr(
      'As you keep adding trees, which method will start to overfit, and which will keep improving?',
      'Saat kamu terus menambah pohon, metode mana yang mulai overfitting, dan mana yang terus membaik?'),
    choices: [
      ['boost', tr('Boosting starts to overfit; bagging keeps improving or levels off', 'Boosting mulai overfitting; bagging terus membaik atau mendatar')],
      ['bag', tr('Bagging starts to overfit; boosting keeps improving', 'Bagging mulai overfitting; boosting terus membaik')],
      ['both', tr('Both start to overfit', 'Keduanya mulai overfitting')],
      ['neither', tr('Neither: both keep improving', 'Tidak ada: keduanya terus membaik')],
    ],
    name: 'ensemble-predict',
  });

  const chart = lab.chartCard(
    tr('Training and validation error against the number of trees', 'Training dan validation error terhadap jumlah pohon'),
    tr(
      'Solid lines are validation (the held-back points), dashed lines are training. A value above the top of the chart is cut off and shown as a triangle with its value. The ring marks where boosting should stop: the number of trees with its lowest validation value (early stopping). Until you check your prediction, the lines only run up to the trees you have added.',
      'Garis penuh adalah validation (titik yang disisihkan), garis putus-putus adalah training. Nilai di atas batas grafik dipotong dan ditampilkan sebagai segitiga beserta nilainya. Lingkaran menandai tempat boosting sebaiknya berhenti: jumlah pohon dengan nilai validation terendah (early stopping). Sebelum prediksimu dicek, garis hanya sampai pohon yang sudah kamu tambahkan.'),
    300,
  );
  const chartCardEl = chart.closest('.card');
  const chartTitle = chartCardEl.querySelector('.lab-h');
  const chartLegend = document.createElement('div');
  chartLegend.className = 'legend';
  chartLegend.style.maxHeight = 'none';
  chart.closest('.chart').before(chartLegend);

  // Per-sample state. data/split/bag/boost are rebuilt when their inputs change (see compute).
  const state = { seed: DEFAULTS.seed, dk: '', data: null, split: null, bag: null, boost: null, table: null, loading: false, failed: false, poisoned: false, revealed: false };

  const controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real data)', 'Penguin (data nyata)')]] }),
    { name: 'kind', type: 'select', label: tr('Generated shape', 'Bentuk data buatan'), options: [['moons', tr('Two moons', 'Dua bulan sabit')], ['checker', tr('Checkerboard', 'Papan catur')]], value: DEFAULTS.kind },
    { name: 'noise', type: 'range', label: tr('Noise', 'Noise'), min: 0, max: 1, step: 0.05, value: DEFAULTS.noise, format: v => fmt(v, { digits: 2 }) },
    { name: 'xcol', type: 'select', label: tr('Penguin measurement (x)', 'Pengukuran penguin (x)'), options: MEASUREMENTS.map(c => [c, MEASURE_LABELS[c]()]), value: DEFAULTS.xcol },
    { name: 'ycol', type: 'select', label: tr('Penguin measurement (y)', 'Pengukuran penguin (y)'), options: MEASUREMENTS.map(c => [c, MEASURE_LABELS[c]()]), value: DEFAULTS.ycol },
    { name: 'trees', type: 'range', label: tr('Number of trees', 'Jumlah pohon'), min: 1, max: MAX_TREES, step: 1, value: DEFAULTS.trees },
    { name: 'add', type: 'button', group: tr('Trees and data', 'Pohon dan data'), label: tr('Add a tree', 'Tambah satu pohon'), onClick: () => addTree() },
    { name: 'fresh', type: 'button', label: tr('New sample', 'Sampel baru'), onClick: () => { state.seed += 1; newRound(); draw(); } },
    { name: 'forest', type: 'toggle', label: tr('Random forest: each split sees only some of the features', 'Random forest: tiap split hanya melihat sebagian fitur'), value: DEFAULTS.forest },
    { name: 'fraction', type: 'range', label: tr('Feature fraction (random forest)', 'Porsi fitur (random forest)'), min: 0.1, max: 1, step: 0.1, value: DEFAULTS.fraction, format: v => tr(`${pct(v, 0)} (${featuresPerSplit(v)} of 2 features)`, `${pct(v, 0)} (${featuresPerSplit(v)} dari 2 fitur)`) },
    { name: 'rate', type: 'range', label: tr('Boosting learning rate', 'Learning rate boosting'), min: 0.05, max: 1, step: 0.05, value: DEFAULTS.rate, format: v => fmt(v, { digits: 2 }) },
    { name: 'depth', type: 'range', label: tr('Boosting tree depth', 'Kedalaman pohon boosting'), min: 1, max: 5, step: 1, value: DEFAULTS.depth },
    { name: 'metric', type: 'select', label: tr('Chart shows', 'Grafik menampilkan'), options: [['logloss', tr('Log loss', 'Log loss')], ['error', tr('Error rate', 'Error rate')]], value: DEFAULTS.metric },
    { name: 'showValidation', type: 'toggle', label: tr('Show validation points', 'Tampilkan titik validasi'), value: true },
    { type: 'note', text: tr(
      `Bagging grows each tree up to depth ${BAG_DEPTH}, with at least ${BAG_MIN_LEAF} points in a leaf. Boosting uses the learning rate and depth above. Both ensembles are built from up to ${MAX_TREES} trees; the slider decides how many of them vote.`,
      `Bagging menumbuhkan tiap pohon sampai kedalaman ${BAG_DEPTH}, dengan minimal ${BAG_MIN_LEAF} titik di setiap leaf. Boosting memakai learning rate dan kedalaman di atas. Kedua ensemble dibangun dari paling banyak ${MAX_TREES} pohon; slider menentukan berapa banyak yang ikut memilih.`) },
  ], onControl);
  const dataNote = document.createElement('p');
  dataNote.className = 'hint';
  controls.el.append(dataNote);

  const mode = v => (v.data === 'penguins' && state.table ? 'real' : 'generated');

  function newRound() {
    state.revealed = false;
    box.reset();
  }

  function addTree() {
    const t = controls.values().trees;
    if (t >= MAX_TREES) return;
    controls.set('trees', t + 1);
    draw();
  }

  function onControl(name) {
    const v = controls.values();
    if (name === 'trees' || name === 'metric' || name === 'showValidation') { draw(); return; }
    // The method's own settings refit an ensemble, so the revealed verdict no longer matches the picture:
    // treat them like a data change and start the prediction again.
    if (name === 'forest' || name === 'fraction' || name === 'rate' || name === 'depth') { newRound(); draw(); return; }
    // A measurement must differ from the other one: if the learner picks the same, the other one moves on.
    if (name === 'xcol' && v.xcol === v.ycol) controls.set('ycol', MEASUREMENTS.find(c => c !== v.xcol));
    if (name === 'ycol' && v.xcol === v.ycol) controls.set('xcol', MEASUREMENTS.find(c => c !== v.ycol));
    if (name === 'data' && v.data === 'penguins' && !state.table && !state.loading) {
      state.loading = true; state.failed = false;
      (state.poisoned ? fetchPenguins() : loadDataset('penguins')).then(table => { state.table = table; }).catch(() => {
        state.failed = true; state.poisoned = true;
        controls.set('data', 'generated');
      }).finally(() => {
        state.loading = false;
        if (!alive) return;
        // Switched back to Generated while the file loaded: the plot did not change, keep the prediction.
        if (controls.values().data === 'penguins') newRound();
        draw();
      });
    }
    newRound();
    draw();
  }

  // The data, the split and both fitted ensembles. A new key (data, seed, or the method's own settings)
  // refits; moving the tree slider never does.
  function compute(v) {
    const real = mode(v) === 'real';
    const dk = real ? `real|${v.xcol}|${v.ycol}|${state.seed}` : `${v.kind}|${v.noise}|${state.seed}`;
    if (state.dk !== dk) {
      state.data = real ? penguinPair(state.table, v.xcol, v.ycol) : generatedData(v.kind, state.seed, v.noise);
      state.split = splitData(state.data, state.seed);
      state.dk = dk;
      state.bag = null; state.boost = null;
    }
    const { train, validation } = state.split;
    const bk = `${v.forest}|${v.fraction}`;
    if (!state.bag || state.bag.key !== bk) {
      const model = fitBagging(train, { forest: v.forest, fraction: v.fraction, seed: state.seed });
      state.bag = { key: bk, model, curves: curvesOf(model, train, validation), grid: null };
    }
    const gk = `${v.rate}|${v.depth}`;
    if (!state.boost || state.boost.key !== gk) {
      const model = fitBoosting(train, { rate: v.rate, depth: v.depth, seed: state.seed });
      state.boost = { key: gk, model, curves: curvesOf(model, train, validation), grid: null };
    }
    return { real, train, validation };
  }

  const regionsOf = (m, t) => {
    if (!m.grid || m.grid.t !== t) m.grid = { t, probs: regionGrid(m.model, t, GRID) };
    return m.grid.probs;
  };

  const off = document.createElement('canvas');
  off.width = GRID; off.height = GRID;

  function drawPanel(plot, canvas, m, t, xLabel, yLabel, classes, v, validation, train, name) {
    plot.setLabels(xLabel, yLabel);
    const g = plot.begin();
    const probs = regionsOf(m, t);
    const rgb = [rgbOf(clusterColor(0)), rgbOf(clusterColor(1))];
    const octx = off.getContext('2d');
    const img = octx.createImageData(GRID, GRID);
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const p = probs[r * GRID + c], cls = p > 0.5 ? 1 : 0;
        const at = ((GRID - 1 - r) * GRID + c) * 4;
        img.data[at] = rgb[cls][0]; img.data[at + 1] = rgb[cls][1]; img.data[at + 2] = rgb[cls][2];
        img.data[at + 3] = Math.round(255 * (0.1 + 0.36 * Math.abs(2 * p - 1)));
      }
    }
    octx.putImageData(img, 0, 0);
    const { ctx } = plot;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, g.px(0), g.py(10), g.size, g.size);
    ctx.restore();
    const dot = (p, color) => {
      ctx.beginPath(); ctx.arc(g.px(p[0]), g.py(p[1]), 4.2, 0, 2 * Math.PI);
      ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = g.t.surface; ctx.stroke(); ctx.lineWidth = 1;
    };
    plot.clip(() => {
      train.X.forEach((p, i) => dot(p, clusterColor(train.y[i])));
      if (v.showValidation) validation.X.forEach((p, i) => plot.cross(p[0], p[1], clusterColor(validation.y[i]), 3.6));
    });
    canvas.setAttribute('aria-label', tr(`Plot of the ${name} ensemble with ${t} ${treesWord(t)}: training points as dots, validation points as crosses, decision regions as background colors`, `Plot ensemble ${name} dengan ${t} pohon: titik training berupa bulat, titik validasi berupa silang, daerah keputusan sebagai warna latar`));
  }

  const clipLabel = e => (!Number.isFinite(e) ? '>' : fmt(e, { digits: e >= 10 ? 0 : 1 }));
  const showValue = (x, metric) => (metric === 'error' ? pct(x, 1) : fmt(x, { digits: 2 }));

  function drawChart(v, t, shown) {
    const metric = v.metric, cap = CAPS[metric];
    const bag = metricCurves(state.bag.curves, metric), boost = metricCurves(state.boost.curves, metric);
    const xs = Array.from({ length: shown }, (_, i) => i + 1);
    const bagColor = BAG_COLOR(), boostColor = BOOST_COLOR();
    const lines = [
      { vals: bag.train.slice(0, shown), color: bagColor, dash: true },
      { vals: bag.validation.slice(0, shown), color: bagColor, dash: false },
      { vals: boost.train.slice(0, shown), color: boostColor, dash: true },
      { vals: boost.validation.slice(0, shown), color: boostColor, dash: false },
    ].map(l => ({ ...l, ...chartRuns(xs, l.vals, cap) }));
    // Segments that touch a cut-off value are drawn faded after the chart, so they do not read as a plateau.
    const series = lines.flatMap(l => l.runs.filter(r => !r.clipped).map(r => ({ xs: r.xs, ys: r.ys, color: l.color, points: false, dash: l.dash })));
    const yName = metric === 'error' ? tr('Error rate', 'Error rate') : tr('Log loss', 'Log loss');
    const { X, Y } = drawLineChart(chart, {
      series: series.length ? series : [{ xs: [1], ys: [0], color: bagColor, points: false }],
      xLabel: tr('Number of trees', 'Jumlah pohon'), yLabel: yName, xMin: 1, xMax: MAX_TREES, yMin: 0, yMax: cap * 1.05,
      markerX: t, markerLabel: t >= 10 ? tr(`trees: ${t}`, `pohon: ${t}`) : undefined,
    });
    const ctx = chart.getContext('2d'), th = theme();
    ctx.save();
    ctx.lineWidth = 2.5; ctx.globalAlpha = 0.4; ctx.lineJoin = 'round';
    for (const l of lines) {
      ctx.strokeStyle = l.color; ctx.setLineDash(l.dash ? [6, 4] : []);
      for (const r of l.runs) {
        if (!r.clipped) continue;
        ctx.beginPath(); r.xs.forEach((x, k) => (k ? ctx.lineTo(X(x), Y(r.ys[k])) : ctx.moveTo(X(x), Y(r.ys[k])))); ctx.stroke();
      }
    }
    ctx.restore();
    // The end of each line: a dot, or a triangle with its value when it is above the top.
    ctx.save();
    ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center';
    for (const l of lines) {
      const k = l.points.length - 1, p = l.points[k];
      if (!p) continue;
      const px = X(p.x), py = Y(p.y);
      ctx.fillStyle = l.color;
      ctx.beginPath();
      if (p.clipped) { ctx.moveTo(px, py - 6); ctx.lineTo(px - 5.5, py + 3.5); ctx.lineTo(px + 5.5, py + 3.5); ctx.closePath(); } else ctx.arc(px, py, 3.6, 0, 2 * Math.PI);
      ctx.fill();
      if (p.clipped) { ctx.fillStyle = th.ink; ctx.textAlign = px > chart.getBoundingClientRect().width - 40 ? 'right' : 'center'; ctx.fillText(clipLabel(l.vals[k]), px, py + 18); }
    }
    // Early stopping for boosting: the first lowest validation value among the trees shown.
    if (shown >= 2) {
      const stop = bestTrees(boost.validation, shown);
      const bx = X(stop.best), by = Y(Math.min(stop.value, cap));
      ctx.beginPath(); ctx.arc(bx, by, 8, 0, 2 * Math.PI); ctx.lineWidth = 2.5; ctx.strokeStyle = th.ink; ctx.stroke();
      ctx.fillStyle = th.ink; ctx.font = '600 12px system-ui, sans-serif';
      const text = tr(`early stop: ${stop.best} ${treesWord(stop.best)}`, `early stopping: ${stop.best} pohon`);
      const w = ctx.measureText(text).width, cw = chart.getBoundingClientRect().width;
      const flip = bx + 12 + w > cw - 10;
      ctx.textAlign = flip ? 'right' : 'left';
      // A surface-colored halo keeps the text readable where a line passes behind it.
      const ty = Math.max(34, by - 14);
      ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = th.surface;
      ctx.strokeText(text, flip ? bx - 12 : bx + 12, ty);
      ctx.fillText(text, flip ? bx - 12 : bx + 12, ty);
    }
    ctx.restore();
    chartTitle.textContent = metric === 'error'
      ? tr('Training and validation error against the number of trees', 'Training dan validation error terhadap jumlah pohon')
      : tr('Training and validation log loss against the number of trees', 'Training dan validation log loss terhadap jumlah pohon');
    chart.setAttribute('aria-label', chartTitle.textContent);
  }

  function table(v, t, shown, bagName) {
    const metric = v.metric;
    const mName = metric === 'error' ? tr('error rate', 'error rate') : tr('log loss', 'log loss');
    const bag = metricCurves(state.bag.curves, metric), boost = metricCurves(state.boost.curves, metric);
    const bagStop = bestTrees(bag.validation, shown), boostStop = bestTrees(boost.validation, shown);
    const rows = [
      [tr(`Training ${mName}`, `Training ${mName}`), showValue(bag.train[t - 1], metric), showValue(boost.train[t - 1], metric)],
      [tr(`Validation ${mName}`, `Validation ${mName}`), showValue(bag.validation[t - 1], metric), showValue(boost.validation[t - 1], metric)],
      [tr('Best number of trees', 'Jumlah pohon terbaik'), fmt(bagStop.best), fmt(boostStop.best)],
      [tr(`Validation ${mName} at the best number`, `Validation ${mName} pada jumlah terbaik`), showValue(bagStop.value, metric), showValue(boostStop.value, metric)],
    ];
    const tbl = document.createElement('table');
    tbl.className = 'el-table';
    const head = tbl.createTHead().insertRow();
    for (const h of [tr(`With ${t} ${treesWord(t)}`, `Dengan ${t} pohon`), bagName, tr('Boosting', 'Boosting')]) head.insertCell().textContent = h;
    const body = tbl.createTBody();
    for (const r of rows) { const row = body.insertRow(); r.forEach(c => { row.insertCell().textContent = c; }); }
    // Row 0 of the head holds th-like text; mark them as headers for screen readers.
    for (const c of head.cells) c.setAttribute('scope', 'col');
    lab.extraEl.replaceChildren(tbl);
    return { bagStop, boostStop, mName };
  }

  function revealAnswer(v) {
    const bag = risesAgain(state.bag.curves.validationLoss), boost = risesAgain(state.boost.curves.validationLoss);
    const actual = overfitAnswer(state.bag.curves.validationLoss, state.boost.curves.validationLoss);
    const d = x => fmt(x, { digits: 2 });
    const bagName = v.forest ? tr('random forest', 'random forest') : tr('bagging', 'bagging');
    const numbers = tr(
      `Validation log loss after ${MAX_TREES} trees, against its lowest value: ${bagName} ${d(bag.last)} (lowest ${d(bag.value)} at ${bag.best} ${treesWord(bag.best)}), boosting ${d(boost.last)} (lowest ${d(boost.value)} at ${boost.best} ${treesWord(boost.best)}), with learning rate ${fmt(v.rate, { digits: 2 })} and depth ${v.depth}.`,
      `Validation log loss setelah ${MAX_TREES} pohon, dibandingkan dengan nilai terendahnya: ${bagName} ${d(bag.last)} (terendah ${d(bag.value)} pada ${bag.best} pohon), boosting ${d(boost.last)} (terendah ${d(boost.value)} pada ${boost.best} pohon), dengan learning rate ${fmt(v.rate, { digits: 2 })} dan kedalaman ${v.depth}.`);
    const why = {
      boost: tr('Boosting overfits: after its best point every new tree fits the training points a little better and the held-back points a little worse. Averaging more bagged trees does not do that, so its curve levels off. Stopping boosting at the ring is early stopping.',
        'Boosting overfitting: setelah titik terbaiknya, tiap pohon baru mencocokkan titik training sedikit lebih baik tetapi titik yang disisihkan sedikit lebih buruk. Merata-ratakan lebih banyak pohon bagging tidak berefek begitu, sehingga kurvanya mendatar. Menghentikan boosting di lingkaran disebut early stopping.'),
      bag: tr('Here the bagging curve climbs back up while boosting does not.', 'Di sini kurva bagging naik lagi, sedangkan boosting tidak.'),
      both: tr('Both curves climb back up from their lowest point here.', 'Di sini kedua kurva naik lagi dari titik terendahnya.'),
      neither: tr(`Neither curve climbs back up within ${MAX_TREES} trees with these settings. A small learning rate makes boosting slow, so it needs more trees before it starts to overfit.`,
        `Tidak ada kurva yang naik lagi dalam ${MAX_TREES} pohon dengan pengaturan ini. Learning rate kecil membuat boosting lambat, sehingga butuh lebih banyak pohon sebelum mulai overfitting.`),
    }[actual];
    box.reveal(actual, `${numbers} ${why}`);
  }
  box.onCheck(() => { state.revealed = true; draw(); revealAnswer(controls.values()); });

  function draw() {
    const v = controls.values();
    const { real, train, validation } = compute(v);
    const t = Math.min(v.trees, MAX_TREES);
    const shown = state.revealed ? MAX_TREES : t;
    controls.disable('kind', real);
    controls.disable('noise', real);
    controls.disable('xcol', !real);
    controls.disable('ycol', !real);
    controls.disable('fraction', !v.forest);
    controls.disable('add', t >= MAX_TREES);
    const bagName = v.forest ? tr('Random forest', 'Random forest') : tr('Bagging', 'Bagging');
    const lowName = v.forest ? tr('random forest', 'random forest') : tr('bagging', 'bagging');
    caps[0].textContent = tr(`${bagName}: ${t} ${treesWord(t)}`, `${bagName}: ${t} pohon`);
    caps[1].textContent = tr(`Boosting: ${t} ${treesWord(t)}`, `Boosting: ${t} pohon`);

    const xl = real ? AXIS_LABELS[v.xcol]() : tr('Feature 1', 'Feature 1');
    const yl = real ? AXIS_LABELS[v.ycol]() : tr('Feature 2', 'Feature 2');
    const classes = real ? PAIR : [tr('Class A', 'Kelas A'), tr('Class B', 'Kelas B')];
    drawPanel(plots[0], first, state.bag, t, xl, yl, classes, v, validation, train, lowName);
    drawPanel(plots[1], second, state.boost, t, xl, yl, classes, v, validation, train, tr('boosting', 'boosting'));
    drawChart(v, t, shown);
    const { bagStop, boostStop, mName } = table(v, t, shown, bagName);

    const metric = v.metric;
    const bagNow = metricCurves(state.bag.curves, metric).validation[t - 1], boostNow = metricCurves(state.boost.curves, metric).validation[t - 1];
    lab.setStatus(tr(
      `With ${t} ${treesWord(t)}, validation ${mName} is ${showValue(bagNow, metric)} for ${lowName} and ${showValue(boostNow, metric)} for boosting.`,
      `Dengan ${t} pohon, validation ${mName} adalah ${showValue(bagNow, metric)} untuk ${lowName} dan ${showValue(boostNow, metric)} untuk boosting.`));
    lab.setDetail(tr(
      `Lowest validation ${mName} so far: ${lowName} ${showValue(bagStop.value, metric)} at ${bagStop.best} ${treesWord(bagStop.best)}, boosting ${showValue(boostStop.value, metric)} at ${boostStop.best} ${treesWord(boostStop.best)}. A curve that has gone flat has a best point that moves with tiny differences.`,
      `Validation ${mName} terendah sejauh ini: ${lowName} ${showValue(bagStop.value, metric)} pada ${bagStop.best} pohon, boosting ${showValue(boostStop.value, metric)} pada ${boostStop.best} pohon. Pada kurva yang sudah mendatar, titik terbaik bergeser karena selisih yang sangat kecil.`));
    lab.setLegend([
      { kind: 'dot', color: clusterColor(0), label: tr(`${classes[0]} (training)`, `${classes[0]} (training)`) },
      { kind: 'dot', color: clusterColor(1), label: tr(`${classes[1]} (training)`, `${classes[1]} (training)`) },
      ...(v.showValidation ? [{ kind: 'cross', color: theme().muted, label: tr('Validation points (crosses, same colors)', 'Titik validasi (silang, warna sama)') }] : []),
    ]);
    chartLegend.replaceChildren(...[
      [tr(`${bagName}, validation`, `${bagName}, validation`), BAG_COLOR(), false],
      [tr(`${bagName}, training`, `${bagName}, training`), BAG_COLOR(), true],
      [tr('Boosting, validation', 'Boosting, validation'), BOOST_COLOR(), false],
      [tr('Boosting, training', 'Boosting, training'), BOOST_COLOR(), true],
    ].map(([label, color, dashed]) => {
      const span = document.createElement('span'), i = document.createElement('i');
      i.className = `glyph-line${dashed ? ' dashed' : ''}`; i.setAttribute('aria-hidden', 'true'); i.style.setProperty('--glyph', color);
      span.append(i, ` ${label}`);
      return span;
    }));

    const n = train.y.length, nv = validation.y.length;
    if (real) {
      const d = state.data;
      dataNote.textContent = tr(
        `Real data: Palmer penguins, ${PAIR[0]} against ${PAIR[1]}. The file has ${d.total} penguins and ${d.inPair} of them are ${PAIR[0]} or ${PAIR[1]}. Penguins with a missing measurement (NA) are left out: ${d.dropped}, leaving ${d.counts[0] + d.counts[1]} (${d.counts[0]} ${PAIR[0]}, ${d.counts[1]} ${PAIR[1]}). Half train the trees (${n}), half are held back (${nv}). The trees see only the two chosen measurements, rescaled to 0–10. Noise only applies to generated data.`,
        `Data nyata: penguin Palmer, ${PAIR[0]} lawan ${PAIR[1]}. Berkasnya berisi ${d.total} penguin dan ${d.inPair} di antaranya ${PAIR[0]} atau ${PAIR[1]}. Penguin dengan pengukuran yang hilang (NA) dibuang: ${d.dropped}, sehingga tersisa ${d.counts[0] + d.counts[1]} (${d.counts[0]} ${PAIR[0]}, ${d.counts[1]} ${PAIR[1]}). Setengahnya melatih pohon (${n}), setengahnya disisihkan (${nv}). Pohon hanya melihat dua pengukuran yang dipilih, diskalakan ke 0–10. Noise hanya berlaku untuk data buatan.`);
    } else if (v.data === 'penguins') {
      dataNote.textContent = tr('Loading the penguin data…', 'Memuat data penguin…');
    } else {
      const only = tr('The penguin measurements only apply to real data.', 'Pengukuran penguin hanya berlaku untuk data nyata.');
      const shape = v.kind === 'checker'
        ? tr('Noise flips the label of some points, so some points sit on the wrong color whatever the model does.', 'Noise membalik label sebagian titik, sehingga sebagian titik berada di warna yang salah apa pun modelnya.')
        : tr('Noise smears the two moons into each other.', 'Noise membuat dua bulan sabit saling bercampur.');
      dataNote.textContent = (state.failed
        ? tr('The penguin data could not be loaded, so the generated data is shown. Choose Penguins (real data) again to retry. ', 'Data penguin tidak dapat dimuat, jadi data buatan yang ditampilkan. Pilih Penguin (data nyata) lagi untuk mencoba ulang. ')
        : '') + tr(`Generated data: ${TOTAL_POINTS} points in two classes; half train the trees (${n}), half are held back (${nv}). ${shape} ${only}`, `Data buatan: ${TOTAL_POINTS} titik dalam dua kelas; setengahnya melatih pohon (${n}), setengahnya disisihkan (${nv}). ${shape} ${only}`);
    }
    lab.describe(first, tr(
      `${bagName} with ${t} ${treesWord(t)}: training ${mName} ${showValue(metricCurves(state.bag.curves, metric).train[t - 1], metric)}, validation ${mName} ${showValue(bagNow, metric)}.`,
      `${bagName} dengan ${t} pohon: training ${mName} ${showValue(metricCurves(state.bag.curves, metric).train[t - 1], metric)}, validation ${mName} ${showValue(bagNow, metric)}.`));
    lab.describe(second, tr(
      `Boosting with ${t} ${treesWord(t)}: training ${mName} ${showValue(metricCurves(state.boost.curves, metric).train[t - 1], metric)}, validation ${mName} ${showValue(boostNow, metric)}.`,
      `Boosting dengan ${t} pohon: training ${mName} ${showValue(metricCurves(state.boost.curves, metric).train[t - 1], metric)}, validation ${mName} ${showValue(boostNow, metric)}.`));
    lab.describe(chart, tr(
      `Early stopping for boosting: ${boostStop.best} ${treesWord(boostStop.best)}, validation ${mName} ${showValue(boostStop.value, metric)}.`,
      `Early stopping untuk boosting: ${boostStop.best} pohon, validation ${mName} ${showValue(boostStop.value, metric)}.`));
  }

  lab.onReset(() => {
    state.seed = DEFAULTS.seed;
    state.failed = false;
    controls.set('data', 'generated');
    for (const name of ['kind', 'noise', 'xcol', 'ycol', 'trees', 'forest', 'fraction', 'rate', 'depth', 'metric']) controls.set(name, DEFAULTS[name]);
    controls.set('showValidation', true);
    newRound();
    draw();
  });
  lab.onTheme(draw);
  lab.onResize(draw);
  draw();
  return lab.destroy;
}
