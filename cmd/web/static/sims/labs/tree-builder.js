// Tree builder: a 2-D scatter of labelled points (generated, or the real Palmer penguins) that the learner
// cuts with axis-aligned lines. The learner makes the FIRST split by choosing a feature and dragging a
// threshold (the plot, the arrow keys on it, or a slider) while the Gini impurity before and after and
// the impurity drop update live. "Grow the rest" then lets the tree split greedily under a maximum depth
// and a minimum leaf size, and a chart compares training and validation accuracy at every depth.
// The math (data, split, report, curve, regions) lives in sims/ml/treebuilder.js; the tree is sims/ml/tree.js.
// This file draws and wires.
import { createLab, createPlot, drawLineChart, clusterColor, tr, fmt, pct, predictBox, dataModeSpec, loadDataset } from '../kit/index.js';
import { parseCsv } from '../ml/tabular.js';
import { predictAll } from '../ml/tree.js';
import {
  SHARED_SEED, MAX_DEPTH, DEFAULT_DEPTH, TOTAL_POINTS, TRAIN_POINTS, PENGUIN_COLUMNS, penguinColumn, IDENTITY_SCALE,
  generatedRows, realRows, axisScale, toPlot, fromPlot, splitRows, toMatrix, classesOf, clampThreshold, startThreshold,
  firstSplitReport, bestFirstSplit, growTree, depthCurve, validationTrend, leafRegions, splitSegments,
} from '../ml/treebuilder.js';

const MAX_LEAF = 20;
const KEY_STEP = 0.1;   // plot units (a hundredth of an axis) per arrow press; Shift makes it five times larger

// loadDataset (sims/kit/data.js) evicts a failed fetch, but a lab-level retry fetches directly so a
// late failure of an older request can never clear a newer one.
const fetchPenguins = () => fetch(new URL('../../data/penguins.csv', import.meta.url)).then(r => {
  if (!r.ok) throw new Error(`dataset penguins: HTTP ${r.status}`);
  return r.text();
}).then(parseCsv);

const T = pair => tr(pair[0], pair[1]);

// "Nice" tick values for an axis covering lo..hi in the original units.
function ticksFor(f) {
  const raw = (f.hi - f.lo) / 5, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? raw;
  const out = [];
  for (let v = Math.ceil(f.lo / step) * step; v <= f.hi + 1e-9; v += step) out.push(Number(v.toPrecision(12)));
  return out;
}

export function mount(root) {
  let alive = true;
  const lab = createLab(root, {
    title: tr('Grow a decision tree', 'Bangun decision tree'),
    hint: tr(
      'Make the first split yourself, then let the tree grow the rest. The dots are what the tree learns from; the crosses are held back to check it.',
      'Buat split pertama sendiri, lalu biarkan pohon menumbuhkan sisanya. Titik bulat dipakai pohon untuk belajar; titik silang disisihkan untuk mengujinya.'),
    status: true, legend: true,
    canvasLabel: tr(
      'Scatter plot of training and validation points cut by split lines. Click or drag to place the first split; press the arrow keys to move it.',
      'Scatter plot titik training dan titik validasi yang dipotong garis split. Klik atau seret untuk menempatkan split pertama; tekan tombol panah untuk menggesernya.'),
    settingsTitle: tr('Controls', 'Pengaturan'),
    extra: {
      title: tr('Accuracy at every depth', 'Accuracy di setiap kedalaman'),
      hint: tr(
        'The same numbers as the chart, for your current first split and minimum leaf size. Validation accuracy is hidden for depths you have not tried yet, until you check your prediction.',
        'Angka yang sama dengan grafik, untuk split pertama dan ukuran leaf minimum yang sedang kamu pakai. Validation accuracy disembunyikan untuk kedalaman yang belum kamu coba, sampai prediksimu dicek.'),
    },
  });
  lab.cleanup(() => { alive = false; });
  const plot = createPlot(lab.canvas, { xLabel: '', yLabel: '' });

  // Predict first: the answer comes from the validation accuracy at every depth 1..MAX_DEPTH.
  const box = predictBox(lab.ref('below'), {
    question: tr('Will the validation accuracy keep rising as the tree gets deeper?', 'Apakah validation accuracy akan terus naik saat pohon makin dalam?'),
    choices: [
      ['rising', tr('Yes, it keeps rising', 'Ya, terus naik')],
      ['levels', tr('It rises, then levels off', 'Naik dulu, lalu mendatar')],
      ['falls', tr('It rises, then falls', 'Naik dulu, lalu turun')],
    ],
    name: 'tree-predict',
  });
  // "Check answer" in the Quick Quiz does what the Check my prediction button in the controls does.
  box.onCheck(() => { state.revealed = true; draw(); });

  // The learner's first split: the numbers behind it, as a table.
  const splitCard = document.createElement('section');
  splitCard.className = 'card table-card';
  const splitTitle = document.createElement('h2'); splitTitle.className = 'lab-h';
  const splitHint = document.createElement('p'); splitHint.className = 'hint';
  const splitScroll = document.createElement('div'); splitScroll.className = 'table-scroll';
  const splitBest = document.createElement('p'); splitBest.className = 'hint';
  splitCard.append(splitTitle, splitHint, splitScroll, splitBest);
  lab.ref('below').append(splitCard);

  const chart = lab.chartCard(
    tr('Training and validation accuracy against depth', 'Training dan validation accuracy per kedalaman'),
    tr(
      'The dashed vertical line is the depth you are looking at (depth 1 is just your first split). A deeper tree fits the training points more tightly; the question is what it does to the points it has not seen. Before you check your prediction, the validation line only shows the depths you have tried.',
      'Garis putus-putus vertikal adalah kedalaman yang sedang kamu lihat (kedalaman 1 hanya split pertamamu). Pohon yang lebih dalam mencocokkan titik training lebih rapat; yang perlu dilihat adalah dampaknya pada titik yang belum pernah dilihatnya. Sebelum prediksimu dicek, garis validation hanya menampilkan kedalaman yang sudah kamu coba.'),
    260);
  const chartLegend = document.createElement('div');
  chartLegend.className = 'legend';
  chart.closest('.chart').before(chartLegend);

  // seed/key/ds: the current sample and what was built from it. first: the learner's split (plot units).
  // grown: the rest of the tree has been grown. revealed/seen: this round's prediction state.
  const state = {
    seed: SHARED_SEED, table: null, loading: false, failed: false, poisoned: false,
    key: '', ds: null, first: { feature: 0, threshold: 5 }, grown: false,
    revealed: false, seen: new Set([1]), curveKey: '', curve: null, drag: false,
  };

  // ---- text helpers (built when drawn, so they follow the language) ------------------------------
  const featName = i => T(state.ds.features[i].name);
  const valueText = (i, realValue) => {
    const f = state.ds.features[i], n = fmt(realValue, { digits: f.digits });
    return f.unit ? `${n} ${f.unit}` : n;
  };
  const thresholdText = (i, plotValue) => {
    if (!state.ds) return fmt(plotValue, { digits: 1 });
    return valueText(i, fromPlot(plotValue, state.ds.features[i]));
  };
  const className = label => (state.ds.real ? String(label) : tr(`Class ${label}`, `Kelas ${label}`));
  const classIndex = label => state.ds.classes.indexOf(label);
  const g3 = x => fmt(x, { digits: 3 });
  const a0 = x => pct(x, 0);
  const rule = (op = '≤') => `${featName(state.first.feature)} ${op} ${thresholdText(state.first.feature, state.first.threshold)}`;
  const countsText = counts => counts.map((c, i) => `${className(state.ds.classes[i])} ${fmt(c)}`).join(', ');

  const controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real data)', 'Penguin (data nyata)')]] }),
    { name: 'pattern', type: 'select', label: tr('Pattern', 'Pola'), options: [['blobs', tr('Overlapping blobs', 'Gumpalan yang tumpang tindih')], ['checker', tr('Checker pattern', 'Pola papan catur')]], value: 'blobs' },
    { name: 'xcol', type: 'select', label: tr('Horizontal measurement', 'Pengukuran horizontal'), options: PENGUIN_COLUMNS.map(c => [c.key, T(c.name)]), value: 'flipper_length_mm' },
    { name: 'ycol', type: 'select', label: tr('Vertical measurement', 'Pengukuran vertikal'), options: PENGUIN_COLUMNS.map(c => [c.key, T(c.name)]), value: 'bill_length_mm' },
    { name: 'fresh', type: 'button', label: tr('New sample', 'Sampel baru'), onClick: () => { state.seed += 1; newRound(); draw(); } },
    { name: 'feature', type: 'select', label: tr('First split on', 'Split pertama pada'), options: [['0', tr('Horizontal feature', 'Fitur horizontal')], ['1', tr('Vertical feature', 'Fitur vertikal')]], value: '0' },
    { name: 'threshold', type: 'range', label: tr('First split threshold', 'Threshold split pertama'), min: 0, max: 10, step: 0.01, value: 5, format: v => thresholdText(state.first.feature, Math.abs(v - state.first.threshold) <= 0.006 ? state.first.threshold : v) },
    { name: 'best', type: 'button', label: tr('Jump to the best first split', 'Lompat ke split pertama terbaik'), onClick: () => useBest() },
    { name: 'grow', type: 'button', label: tr('Grow the rest', 'Tumbuhkan sisanya'), onClick: () => { state.grown = true; draw(); } },
    { name: 'shrink', type: 'button', label: tr('Back to the first split only', 'Kembali ke split pertama saja'), onClick: () => { state.grown = false; draw(); } },
    { name: 'maxDepth', type: 'range', label: tr('Maximum depth', 'Kedalaman maksimum'), min: 1, max: MAX_DEPTH, step: 1, value: DEFAULT_DEPTH },
    { name: 'minLeaf', type: 'range', label: tr('Minimum leaf size', 'Ukuran leaf minimum'), min: 1, max: MAX_LEAF, step: 1, value: 1 },
    { name: 'showValidation', type: 'toggle', label: tr('Show validation points', 'Tampilkan titik validasi'), value: true },
    { name: 'check', type: 'button', label: tr('Check my prediction', 'Cek prediksiku'), onClick: () => { state.revealed = true; draw(); } },
    { type: 'note', text: tr(
      'Choose the feature to split on, then set the threshold: drag on the plot, press the arrow keys while the plot has focus, or use the slider. Then press Grow the rest and try other depths. Maximum depth and minimum leaf size work once the tree has grown.',
      'Pilih fitur untuk split, lalu atur threshold-nya: seret di plot, tekan tombol panah saat plot terfokus, atau pakai slider. Setelah itu tekan Tumbuhkan sisanya dan coba kedalaman lain. Kedalaman maksimum dan ukuran leaf minimum bekerja setelah pohon tumbuh.') },
  ], onControl);
  const dataNote = document.createElement('p');
  dataNote.className = 'hint';
  controls.el.append(dataNote);

  const mode = v => (v.data === 'penguins' && state.table ? 'real' : 'generated');

  // ---- data and rounds -----------------------------------------------------------------------------
  // A new round: the sample or its settings changed, so the old prediction no longer applies.
  function newRound() {
    state.revealed = false;
    state.seen = new Set([state.grown ? controls.values().maxDepth : 1]);
    box.reset();
  }

  function useBest() {
    const { train } = state.ds;
    const best = bestFirstSplit(train.points, train.labels);
    if (!best) return;
    state.first = { feature: best.feature, threshold: best.threshold };
    syncSplitControls();
    draw();
  }

  function syncSplitControls() {
    controls.set('feature', String(state.first.feature));
    controls.set('threshold', state.first.threshold);
  }

  // The plot unit value of a feature column of the training points.
  const trainColumn = f => state.ds.train.points.map(p => p[f]);

  function setThreshold(plotValue) {
    state.first.threshold = clampThreshold(trainColumn(state.first.feature), plotValue);
    controls.set('threshold', state.first.threshold);
    draw();
  }

  // The sample, split and scales only change with the data, the seed and the chosen columns.
  function compute(v) {
    const real = mode(v) === 'real';
    const key = real ? `real|${v.xcol}|${v.ycol}|${state.seed}` : `gen|${v.pattern}|${state.seed}`;
    if (state.key === key) return state.ds;
    let rows, info = null, features, sx, sy;
    if (real) {
      const c = realRows(state.table, v.xcol, v.ycol);
      rows = c.rows; info = c;
      sx = axisScale(rows.map(r => r.x)); sy = axisScale(rows.map(r => r.y));
      features = [[penguinColumn(v.xcol), sx], [penguinColumn(v.ycol), sy]].map(([col, s]) => ({ name: col.name, unit: col.unit, digits: col.digits, lo: s.lo, hi: s.hi }));
    } else {
      rows = generatedRows(v.pattern, state.seed);
      sx = IDENTITY_SCALE; sy = IDENTITY_SCALE;
      features = [['Feature 1', 'Feature 1'], ['Feature 2', 'Feature 2']].map(name => ({ name, unit: '', digits: 1, lo: 0, hi: 10 }));
    }
    const { train, validation } = splitRows(rows, state.seed);
    const trainM = toMatrix(train, sx, sy), valM = toMatrix(validation, sx, sy);
    state.ds = { real, info, features, train: trainM, validation: valM, classes: classesOf(trainM.labels) };
    state.key = key;
    state.curveKey = '';
    state.first = { feature: state.first.feature, threshold: startThreshold(trainM.points.map(p => p[state.first.feature])) };
    syncSplitControls();
    newRound();
    return state.ds;
  }

  function onControl(name) {
    const v = controls.values();
    if (name === 'xcol' && v.xcol === v.ycol) controls.set('ycol', PENGUIN_COLUMNS.find(c => c.key !== v.xcol).key);
    if (name === 'ycol' && v.xcol === v.ycol) controls.set('xcol', PENGUIN_COLUMNS.find(c => c.key !== v.ycol).key);
    if (name === 'feature') {
      state.first.feature = Number(v.feature);
      state.first.threshold = startThreshold(trainColumn(state.first.feature));
      syncSplitControls();
    } else if (name === 'threshold') {
      state.first.threshold = clampThreshold(trainColumn(state.first.feature), v.threshold);
      if (Math.abs(state.first.threshold - v.threshold) > 1e-9) controls.set('threshold', state.first.threshold);
    } else if (name === 'data' && v.data === 'penguins' && !state.table && !state.loading) {
      state.loading = true; state.failed = false;
      (state.poisoned ? fetchPenguins() : loadDataset('penguins')).then(table => { state.table = table; }).catch(() => {
        state.failed = true; state.poisoned = true;
        controls.set('data', 'generated');
      }).finally(() => {
        state.loading = false;
        if (alive) draw();
      });
    }
    draw();
  }

  // ---- drawing ------------------------------------------------------------------------------------
  // Replaces the kit's 0..10 tick labels with the real values of the two features, and writes the titles.
  function drawAxes(g) {
    const ds = state.ds, ctx = plot.ctx;
    ctx.clearRect(0, 0, g.px(0) - 1, g.height);
    ctx.clearRect(0, g.py(0) + 1, g.width, g.height - g.py(0) - 1);
    ctx.save();
    ctx.fillStyle = g.t.muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const v of ticksFor(ds.features[0])) ctx.fillText(fmt(v), g.px(toPlot(v, ds.features[0])), g.py(0) + 16);
    ctx.textAlign = 'right';
    for (const v of ticksFor(ds.features[1])) ctx.fillText(fmt(v), g.px(0) - 5, g.py(toPlot(v, ds.features[1])) + 4);
    const title = i => (ds.features[i].unit ? `${T(ds.features[i].name)} (${ds.features[i].unit})` : T(ds.features[i].name));
    ctx.textAlign = 'center';
    ctx.fillText(title(0), g.px(5), g.height - 5);
    ctx.fillStyle = g.t.ink; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`↑ ${title(1)}`, g.px(0), g.py(10) - 4);
    ctx.restore();
  }

  function haloText(text, x, y, align, color, halo) {
    const ctx = plot.ctx;
    ctx.save();
    ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = align; ctx.lineJoin = 'round';
    ctx.lineWidth = 4; ctx.strokeStyle = halo; ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
    ctx.restore();
  }

  const effectiveDepth = v => (state.grown ? v.maxDepth : 1);

  function curveFor(v) {
    const { train, validation } = state.ds;
    const key = `${state.key}|${state.first.feature}|${state.first.threshold}|${v.minLeaf}`;
    if (state.curveKey !== key) { state.curve = depthCurve(train, validation, state.first, { minLeaf: v.minLeaf }); state.curveKey = key; }
    return state.curve;
  }

  function drawPlot(v, tree, wrong) {
    const ds = state.ds;
    const g = plot.begin();
    drawAxes(g);
    const ctx = plot.ctx;
    plot.clip(() => {
      for (const r of leafRegions(tree)) {
        ctx.save();
        ctx.globalAlpha = 0.16; ctx.fillStyle = clusterColor(classIndex(r.label));
        ctx.fillRect(g.px(r.x0), g.py(r.y1), g.px(r.x1) - g.px(r.x0), g.py(r.y0) - g.py(r.y1));
        ctx.restore();
      }
      for (const s of splitSegments(tree).sort((a, b) => b.depth - a.depth)) {
        plot.segment(s.x0, s.y0, s.x1, s.y1, s.depth === 0 ? { color: g.t.ink, width: 3 } : { color: g.t.ink, width: 1.6, dash: [6, 4], alpha: 0.75 });
      }
    });
    ds.train.points.forEach((p, i) => {
      ctx.beginPath(); ctx.arc(g.px(p[0]), g.py(p[1]), 4.6, 0, 2 * Math.PI);
      ctx.fillStyle = clusterColor(classIndex(ds.train.labels[i])); ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = g.t.plot; ctx.stroke();
    });
    if (v.showValidation) {
      ds.validation.points.forEach((p, i) => {
        if (wrong[i]) plot.ring(p[0], p[1], g.t.ink, 8, 1.8);
        plot.cross(p[0], p[1], clusterColor(classIndex(ds.validation.labels[i])), 4.2);
      });
    }
    // The handle of the learner's first split, and its threshold.
    const f = state.first.feature, t = state.first.threshold, label = `≤ ${thresholdText(f, t)}`;
    if (f === 0) {
      plot.diamond(t, 0.7, g.t.accent, 8);
      const right = t > 6.5;
      haloText(label, g.px(t) + (right ? -13 : 13), g.py(0.7) + 4, right ? 'right' : 'left', g.t.ink, g.t.plot);
    } else {
      plot.diamond(0.7, t, g.t.accent, 8);
      haloText(label, g.px(0.7) + 13, g.py(t) - 8, 'left', g.t.ink, g.t.plot);
    }
  }

  function drawChart(curve, depth) {
    const shown = curve.filter(d => state.revealed || state.seen.has(d.depth));
    const lows = curve.flatMap(d => [d.train, d.validation]).filter(a => Number.isFinite(a));
    const yMin = Math.max(0, Math.floor((Math.min(...lows) * 100 - 6) / 10) * 10);
    const { X, Y } = drawLineChart(chart, {
      series: [
        { xs: curve.map(d => d.depth), ys: curve.map(d => d.train * 100), color: clusterColor(0), points: true },
        { xs: shown.map(d => d.depth), ys: shown.map(d => d.validation * 100), color: clusterColor(1), points: true },
      ],
      xLabel: tr('Maximum depth', 'Kedalaman maksimum'), yLabel: tr('Accuracy (%)', 'Accuracy (%)'),
      xMin: 1, xMax: MAX_DEPTH, yMin, yMax: 100, markerX: depth, integerX: true,
    });
    const ctx = chart.getContext('2d');
    ctx.save();
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
    const halo = getComputedStyle(document.documentElement).getPropertyValue('--plot-bg').trim() || '#fff';
    ctx.fillStyle = ink;
    ctx.font = '600 12px system-ui, sans-serif';
    // Inside the plot, just above the bottom axis, where no line runs (yMin is below every plotted value),
    // with a halo so a gridline or the dashed marker never cuts through it.
    const edge = depth >= MAX_DEPTH - 1 ? 'right' : depth <= 2 ? 'left' : 'center';
    ctx.textAlign = edge; ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = halo;
    const lx = X(depth) + (edge === 'right' ? -6 : edge === 'left' ? 6 : 0), ly = Y(yMin) - 6;
    const label = tr(`depth: ${depth}`, `kedalaman: ${depth}`);
    ctx.strokeText(label, lx, ly); ctx.fillText(label, lx, ly);
    if (state.revealed) {
      const best = curve.reduce((b, d) => (d.validation > b.validation + 1e-12 ? d : b), curve[0]);
      ctx.beginPath(); ctx.arc(X(best.depth), Y(best.validation * 100), 8, 0, 2 * Math.PI); ctx.lineWidth = 2.5;
      ctx.strokeStyle = ctx.fillStyle; ctx.stroke();
    }
    ctx.restore();
  }

  function drawTables(v, curve, depth, ds, report) {
    // The accuracy table (the extra card).
    const table = document.createElement('table');
    const head = table.createTHead().insertRow();
    for (const h of [tr('Depth', 'Kedalaman'), tr('Leaves', 'Leaf'), tr('Training accuracy', 'Training accuracy'), tr('Validation accuracy', 'Validation accuracy')]) head.insertCell().textContent = h;
    const body = table.createTBody();
    for (const d of curve) {
      const row = body.insertRow();
      const seen = state.revealed || state.seen.has(d.depth);
      row.insertCell().textContent = String(d.depth);
      row.insertCell().textContent = fmt(d.leaves);
      row.insertCell().textContent = a0(d.train);
      row.insertCell().textContent = seen ? a0(d.validation) : '?';
      if (d.depth === depth) for (const td of row.cells) { td.style.background = 'var(--accent-soft)'; td.style.fontWeight = '700'; }
    }
    // Let the headers wrap, as in the first-split table, so all four columns fit a phone without sideways scrolling.
    table.style.minWidth = '0';
    for (const cell of table.querySelectorAll('th, td')) { cell.style.whiteSpace = 'normal'; cell.style.padding = '9px 6px'; }
    lab.extraEl.replaceChildren(table);

    // The first-split table.
    splitTitle.textContent = tr('Your first split', 'Split pertamamu');
    splitHint.textContent = tr(
      'Gini impurity is 0 for a group of one class and highest for an even mix. The weighted average counts each side in proportion to its size. The impurity drop is the Gini before the split minus the weighted Gini after it: a bigger drop means a better split.',
      'Gini impurity bernilai 0 untuk kelompok satu kelas dan tertinggi untuk campuran yang merata. Rata-rata berbobot menghitung tiap sisi sebanding dengan ukurannya. Penurunan impurity adalah Gini sebelum split dikurangi Gini berbobot sesudahnya: makin besar penurunannya, makin baik split-nya.');
    const t2 = document.createElement('table');
    const h2 = t2.createTHead().insertRow();
    for (const h of [tr('Group', 'Kelompok'), tr('Points', 'Titik'), tr('Class counts', 'Jumlah per kelas'), tr('Gini', 'Gini')]) h2.insertCell().textContent = h;
    t2.style.width = '100%'; t2.style.minWidth = '0';
    const b2 = t2.createTBody();
    const add = (name, n, counts, value, bold) => {
      const row = b2.insertRow();
      const label = row.insertCell(); label.textContent = name; label.style.whiteSpace = 'normal';
      row.insertCell().textContent = n == null ? '' : fmt(n);
      const cc = row.insertCell(); cc.textContent = counts == null ? '' : countsText(counts); cc.style.whiteSpace = 'normal';
      row.insertCell().textContent = value;
      if (bold) for (const td of row.cells) td.style.fontWeight = '700';
    };
    add(tr('All training points', 'Semua titik training'), report.all.n, report.all.counts, g3(report.before));
    add(tr(`Left: ${rule('≤')}`, `Kiri: ${rule('≤')}`), report.left.n, report.left.counts, g3(report.left.gini));
    add(tr(`Right: ${rule('>')}`, `Kanan: ${rule('>')}`), report.right.n, report.right.counts, g3(report.right.gini));
    add(tr('After the split (weighted)', 'Setelah split (berbobot)'), null, null, g3(report.after));
    add(tr('Impurity drop', 'Penurunan impurity'), null, null, g3(report.drop), true);
    for (const cell of t2.querySelectorAll('th, td')) { cell.style.whiteSpace = 'normal'; cell.style.padding = '9px 6px'; }
    splitScroll.replaceChildren(t2);
    const best = bestFirstSplit(ds.train.points, ds.train.labels);
    if (best) {
      const bestText = `${featName(best.feature)} ≤ ${thresholdText(best.feature, best.threshold)}`;
      splitBest.textContent = tr(
        `Best possible first split on these training points: ${bestText}, impurity drop ${g3(best.gain)}. Yours: ${g3(report.drop)}.`,
        `Split pertama terbaik untuk titik training ini: ${bestText}, penurunan impurity ${g3(best.gain)}. Milikmu: ${g3(report.drop)}.`);
    } else splitBest.textContent = tr('No split of these training points lowers the impurity.', 'Tidak ada split pada titik training ini yang menurunkan impurity.');
  }

  function revealAnswer(curve) {
    const vals = curve.map(d => d.validation);
    const trend = validationTrend(vals);
    const best = curve.reduce((b, d) => (d.validation > b.validation + 1e-12 ? d : b), curve[0]);
    const last = curve[curve.length - 1];
    const common = tr(`With your first split and minimum leaf size, validation accuracy is highest at depth ${best.depth} (${a0(best.validation)}). `, `Dengan split pertama dan ukuran leaf minimum yang kamu pakai, validation accuracy tertinggi ada di kedalaman ${best.depth} (${a0(best.validation)}). `);
    const text = {
      rising: tr(`${common}It was still going up at the deepest tree tried (depth ${MAX_DEPTH}).`, `${common}Nilainya masih naik pada pohon terdalam yang dicoba (kedalaman ${MAX_DEPTH}).`),
      levels: tr(`${common}Deeper trees do not improve on it (${a0(last.validation)} at depth ${MAX_DEPTH}), even though training accuracy climbs to ${a0(last.train)}.`, `${common}Pohon yang lebih dalam tidak memperbaikinya (${a0(last.validation)} di kedalaman ${MAX_DEPTH}), padahal training accuracy naik sampai ${a0(last.train)}.`),
      falls: tr(`${common}At depth ${MAX_DEPTH} it has fallen to ${a0(last.validation)} while training accuracy climbs to ${a0(last.train)}: the deep tree is memorizing the training points.`, `${common}Di kedalaman ${MAX_DEPTH} nilainya turun menjadi ${a0(last.validation)} sementara training accuracy naik sampai ${a0(last.train)}: pohon yang dalam menghafal titik training.`),
    }[trend];
    box.reveal(trend, text);
  }

  function draw() {
    const v = controls.values();
    const ds = compute(v), real = ds.real;
    controls.show('pattern', !real); controls.show('xcol', real); controls.show('ycol', real);
    controls.disable('maxDepth', !state.grown); controls.disable('minLeaf', !state.grown);
    controls.disable('grow', state.grown); controls.disable('shrink', !state.grown);
    controls.set('feature', String(state.first.feature));
    controls.set('threshold', state.first.threshold);

    const depth = effectiveDepth(v);
    state.seen.add(depth);
    const first = state.first;
    const tree = growTree(ds.train, first, depth, v.minLeaf);
    const curve = curveFor(v);
    const report = firstSplitReport(ds.train.points, ds.train.labels, ds.classes, first.feature, first.threshold);
    const trainAcc = curve[depth - 1].train, valAcc = curve[depth - 1].validation;
    const guess = predictAll(tree, ds.validation.points);
    const wrong = guess.map((p, i) => p !== ds.validation.labels[i]);
    const leaves = curve[depth - 1].leaves;

    drawPlot(v, tree, wrong);
    drawChart(curve, depth);
    drawTables(v, curve, depth, ds, report);

    lab.setStatus(tr(
      `First split: ${rule('≤')}. Gini ${g3(report.before)} before, ${g3(report.after)} after: impurity drop ${g3(report.drop)}.`,
      `Split pertama: ${rule('≤')}. Gini ${g3(report.before)} sebelum, ${g3(report.after)} sesudah: penurunan impurity ${g3(report.drop)}.`));
    lab.setDetail(state.grown
      ? tr(`Tree grown to depth ${depth} with at least ${fmt(v.minLeaf)} point${v.minLeaf === 1 ? '' : 's'} per leaf: ${fmt(leaves)} leaves. Training accuracy ${a0(trainAcc)}, validation accuracy ${a0(valAcc)}.`,
        `Pohon tumbuh sampai kedalaman ${depth} dengan minimal ${fmt(v.minLeaf)} titik per leaf: ${fmt(leaves)} leaf. Training accuracy ${a0(trainAcc)}, validation accuracy ${a0(valAcc)}.`)
      : tr(`Only your first split so far: ${fmt(leaves)} leaves. Training accuracy ${a0(trainAcc)}, validation accuracy ${a0(valAcc)}. Press Grow the rest to let the tree keep splitting.`,
        `Baru split pertamamu: ${fmt(leaves)} leaf. Training accuracy ${a0(trainAcc)}, validation accuracy ${a0(valAcc)}. Tekan Tumbuhkan sisanya agar pohon terus membagi.`));
    lab.setMetrics(`${tr('Leaves', 'Leaf')}: ${fmt(leaves)}`);

    lab.describe(lab.canvas, tr(
      `${fmt(ds.train.points.length)} training points and ${fmt(ds.validation.points.length)} validation points in ${fmt(ds.classes.length)} classes. The first split is ${rule('≤')}. The tree has ${fmt(leaves)} leaves, training accuracy ${a0(trainAcc)} and validation accuracy ${a0(valAcc)}.`,
      `${fmt(ds.train.points.length)} titik training dan ${fmt(ds.validation.points.length)} titik validasi dalam ${fmt(ds.classes.length)} kelas. Split pertama: ${rule('≤')}. Pohon punya ${fmt(leaves)} leaf, training accuracy ${a0(trainAcc)} dan validation accuracy ${a0(valAcc)}.`));
    lab.describe(chart, tr(
      `Accuracy at depths 1 to ${MAX_DEPTH}. Training accuracy goes from ${a0(curve[0].train)} to ${a0(curve[MAX_DEPTH - 1].train)}.${state.revealed ? ` Validation accuracy goes from ${a0(curve[0].validation)} to ${a0(curve[MAX_DEPTH - 1].validation)}.` : ' Validation accuracy shows the depths you have tried.'}`,
      `Accuracy pada kedalaman 1 sampai ${MAX_DEPTH}. Training accuracy naik dari ${a0(curve[0].train)} menjadi ${a0(curve[MAX_DEPTH - 1].train)}.${state.revealed ? ` Validation accuracy berubah dari ${a0(curve[0].validation)} menjadi ${a0(curve[MAX_DEPTH - 1].validation)}.` : ' Validation accuracy menampilkan kedalaman yang sudah kamu coba.'}`));

    if (state.revealed) revealAnswer(curve);

    if (real) {
      const c = ds.info;
      dataNote.textContent = tr(
        `Real data: Palmer penguins, colored by species. ${fmt(c.dropped)} of ${fmt(c.total)} rows have a missing value (NA) in the chosen columns and were left out, which leaves ${fmt(c.rows.length)} penguins. The lab draws ${fmt(TOTAL_POINTS)} of them at random: ${fmt(TRAIN_POINTS)} to train the tree and ${fmt(TOTAL_POINTS - TRAIN_POINTS)} to check it.`,
        `Data nyata: penguin Palmer, diwarnai per spesies. ${fmt(c.dropped)} dari ${fmt(c.total)} baris punya missing value (NA) pada kolom yang dipilih dan dibuang, sehingga tersisa ${fmt(c.rows.length)} penguin. Lab mengambil ${fmt(TOTAL_POINTS)} di antaranya secara acak: ${fmt(TRAIN_POINTS)} untuk melatih pohon dan ${fmt(TOTAL_POINTS - TRAIN_POINTS)} untuk mengujinya.`);
    } else if (v.data === 'penguins') {
      dataNote.textContent = tr('Loading the penguin data…', 'Memuat data penguin…');
    } else {
      const only = tr('The penguin measurements only apply to real data.', 'Pengukuran penguin hanya berlaku untuk data nyata.');
      dataNote.textContent = state.failed
        ? tr(`The penguin data could not be loaded, so the generated data is shown. Choose Penguins (real data) again to retry. ${only}`, `Data penguin tidak dapat dimuat, jadi data buatan yang ditampilkan. Pilih Penguin (data nyata) lagi untuk mencoba ulang. ${only}`)
        : tr(`Generated data: ${fmt(TOTAL_POINTS)} points in two classes, ${fmt(TRAIN_POINTS)} to train the tree and ${fmt(TOTAL_POINTS - TRAIN_POINTS)} to check it. ${v.pattern === 'checker' ? 'A few labels are flipped on purpose, so a deep tree has noise to memorize.' : 'The classes overlap, so no tree can be perfect on points it has not seen.'}`,
          `Data buatan: ${fmt(TOTAL_POINTS)} titik dalam dua kelas, ${fmt(TRAIN_POINTS)} untuk melatih pohon dan ${fmt(TOTAL_POINTS - TRAIN_POINTS)} untuk mengujinya. ${v.pattern === 'checker' ? 'Beberapa label sengaja dibalik, sehingga pohon yang dalam punya noise untuk dihafal.' : 'Kelas-kelasnya tumpang tindih, jadi tidak ada pohon yang sempurna pada titik yang belum pernah dilihatnya.'}`);
    }

    lab.setLegend([
      ...ds.classes.map((c, i) => ({ kind: 'dot', color: clusterColor(i), label: className(c) })),
      { kind: 'dot', color: 'var(--muted)', label: tr('Training (dots)', 'Training (bulat)') },
      ...(v.showValidation ? [
        { kind: 'cross', color: 'var(--muted)', label: tr('Validation (crosses)', 'Validasi (silang)') },
        { kind: 'ring', color: 'var(--ink)', label: tr('Validation point the tree gets wrong', 'Titik validasi yang salah ditebak pohon') },
      ] : []),
      { kind: 'line', color: 'var(--ink)', label: tr('Your first split', 'Split pertamamu') },
      ...(state.grown ? [{ kind: 'dash', color: 'var(--ink)', label: tr('Later splits', 'Split berikutnya') }] : []),
    ]);
    chartLegend.replaceChildren(...[[tr('Training accuracy', 'Training accuracy'), 0], [tr('Validation accuracy', 'Validation accuracy'), 1]].map(([label, i]) => {
      const span = document.createElement('span'), dot = document.createElement('i');
      dot.className = 'dot'; dot.style.background = clusterColor(i);
      span.append(dot, ` ${label}`);
      return span;
    }));
  }

  // ---- the learner's pointer and keyboard on the plot ----------------------------------------------
  const valueAt = e => { const p = plot.toData(e); return state.first.feature === 0 ? p.x : p.y; };
  lab.on(lab.canvas, 'pointerdown', e => {
    if (e.button !== 0 || !state.ds) return;
    state.drag = true;
    try { lab.canvas.setPointerCapture(e.pointerId); } catch { /* a pointer that is already gone: the move handler still works */ }
    setThreshold(valueAt(e));
  });
  lab.on(lab.canvas, 'pointermove', e => { if (state.drag) setThreshold(valueAt(e)); });
  const endDrag = () => { state.drag = false; };
  lab.on(lab.canvas, 'pointerup', endDrag);
  lab.on(lab.canvas, 'pointercancel', endDrag);
  lab.on(lab.canvas, 'keydown', e => {
    const dir = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key];
    if (!dir || !state.ds) return;
    e.preventDefault();
    setThreshold(state.first.threshold + dir * KEY_STEP * (e.shiftKey ? 5 : 1));
  });

  lab.onReset(() => {
    state.seed = SHARED_SEED;
    state.failed = false;
    state.grown = false;
    state.first = { feature: 0, threshold: 5 };
    controls.set('data', 'generated');
    controls.set('pattern', 'blobs');
    controls.set('xcol', 'flipper_length_mm');
    controls.set('ycol', 'bill_length_mm');
    controls.set('maxDepth', DEFAULT_DEPTH);
    controls.set('minLeaf', 1);
    controls.set('showValidation', true);
    state.key = '';
    draw();
  });
  lab.onTheme(draw);
  lab.onResize(draw);
  draw();
  return lab.destroy;
}
