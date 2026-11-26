// PCA lab, built on the kit. A correlated point cloud (2-D, or 3-D shown as two linked views) and one candidate
// axis. The learner turns the axis (slider, arrow keys, or by dragging on the plot) and sees every point projected
// onto it, the variance kept along it, and the information lost (the mean squared distance from a point to its
// projection). One button snaps to the first principal component. Below: a scree plot and the information lost
// against the number of components for a wider table (8 features), and the loadings.
//   Generated data: three clouds (strong correlation, noisy, round) with a seed; works offline.
//   Penguins (real): the four body measurements, penguins with an NA dropped (and said so), standardised on request,
//   projected to two components and coloured by species. PCA never sees the species.
// The math is in ml/pca.js and ml/pcalab.js; this file draws and wires.
import { createLab, createPlot, drawLineChart, dataModeSpec, loadDataset, predictBox, clusterColor, tr, fmt, pct } from '../kit/index.js';
import { fitPca, project } from '../ml/pca.js';
import {
  generatedCloud, wideTable, axisFromAngles, anglesFromAxis, axisReport, sweepAxis, projectOnAxis, perpendicularAxis,
  componentCurves, squareRange, penguinMeasurements,
} from '../ml/pcalab.js';

export const DEFAULTS = { seed: 1, n: 120, keep: 2, az: 0, tilt: 0, cloud: 'strong', dims: '2', standardize: true };
const WIDE_D = 8;
const WIDE_N = 150;

const num = v => (Number.isFinite(v) ? fmt(v, { digits: 2 }) : '–');
const deg = v => `${fmt(v, { max: 1 })}°`;
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const wrap180 = a => ((a % 180) + 180) % 180;

const featureNames = d => Array.from({ length: d }, (_, i) => `Feature ${i + 1}`);
const penguinNames = () => [tr('Bill length', 'Panjang paruh'), tr('Bill depth', 'Kedalaman paruh'), tr('Flipper length', 'Panjang sirip'), tr('Body mass', 'Massa tubuh')];

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Rotate an axis, lose information', 'Putar sumbu, kehilangan informasi'),
    hint: tr(
      'Turn the axis (slider, drag on the plot, or focus the plot and use the arrow keys: Left and Right turn one degree, Shift five, Up and Down tilt in 3-D). Each point drops onto the axis; the dashed lines are the information lost. Try the Quick Quiz button first: it asks for a prediction.',
      'Putar sumbunya (slider, seret di plot, atau fokus ke plot lalu pakai tombol panah: Kiri dan Kanan memutar satu derajat, Shift lima, Atas dan Bawah memiringkan di 3-D). Setiap titik jatuh ke sumbu; garis putus-putus adalah informasi yang hilang. Coba tombol Kuis Cepat dulu: ia meminta sebuah prediksi.'),
    status: true, legend: true,
    canvasLabel: tr(
      'Point cloud with a candidate axis. Left and right arrow keys turn the axis by one degree, Shift for five; up and down arrow keys tilt it in 3-D.',
      'Kumpulan titik dengan sebuah sumbu kandidat. Tombol panah kiri dan kanan memutar sumbu satu derajat, Shift untuk lima; panah atas dan bawah memiringkannya di 3-D.'),
    extra: {
      title: tr('What each component is made of', 'Komponen terbuat dari apa'),
      hint: tr(
        'Loadings: how strongly each feature pulls on a component. The last row is the share of the variance each component explains. The scree plot, the information lost chart and this table use a generated table of 8 features (two hidden groups; the Cloud choice sets how noisy they are), or the four penguin measurements in Real data.',
        'Loading: seberapa kuat tiap feature menarik sebuah komponen. Baris terakhir adalah porsi varians yang dijelaskan tiap komponen. Scree plot, grafik informasi yang hilang, dan tabel ini memakai tabel buatan berisi 8 feature (dua kelompok tersembunyi; pilihan kumpulan titik mengatur noise-nya), atau empat pengukuran penguin pada Data nyata.'),
    },
  });
  const plot = createPlot(lab.canvas, {});
  const legendHost = lab.ref('legend');
  if (legendHost) legendHost.style.maxHeight = 'none';

  // ---- state -------------------------------------------------------------------------------------
  let mode = 'generated', seed = DEFAULTS.seed, az = DEFAULTS.az, tilt = DEFAULTS.tilt;
  let real = null, loading = false, loadFailed = false, loadToken = 0, destroyed = false, drag = null, timer = 0;
  const memo = new Map();

  const controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real)', 'Penguin (data nyata)')]] }),
    { name: 'cloud', type: 'select', label: tr('Cloud', 'Kumpulan titik'), value: DEFAULTS.cloud, options: [
      ['strong', tr('Strong correlation', 'Korelasi kuat')], ['noisy', tr('Noisy', 'Noisy')], ['round', tr('Round (no correlation)', 'Bulat (tanpa korelasi)')]] },
    { name: 'dims', type: 'select', label: tr('Dimensions', 'Dimensi'), value: DEFAULTS.dims, options: [
      ['2', tr('2-D (one view)', '2-D (satu tampilan)')], ['3', tr('3-D (two linked views)', '3-D (dua tampilan terhubung)')]] },
    { name: 'n', type: 'range', label: tr('Number of points', 'Jumlah titik'), min: 30, max: 300, step: 10, value: DEFAULTS.n },
    { name: 'newSample', type: 'button', label: tr('New sample', 'Sampel baru'), onClick: () => { seed += 1; boxPredict.reset(); settle(); } },
    { name: 'az', type: 'range', label: tr('Axis angle', 'Sudut sumbu'), min: 0, max: 180, step: 1, value: DEFAULTS.az, format: v => `${fmt(v)}°` },
    { name: 'tilt', type: 'range', label: tr('Axis tilt (3-D)', 'Kemiringan sumbu (3-D)'), min: -90, max: 90, step: 1, value: DEFAULTS.tilt, format: v => `${fmt(v)}°` },
    { name: 'snap', type: 'button', label: tr('Snap to the first principal component', 'Pas ke komponen utama pertama'), onClick: () => { snap(); } },
    { name: 'turn', type: 'button', label: tr('Turn the axis by 90°', 'Putar sumbu 90°'), onClick: () => { turn(); } },
    { name: 'showBest', type: 'toggle', label: tr('Show the best axis', 'Tampilkan sumbu terbaik'), value: false },
    { name: 'showLost', type: 'toggle', label: tr('Show the information lost', 'Tampilkan informasi yang hilang'), value: true },
    { name: 'standardize', type: 'toggle', label: tr('Standardise the measurements', 'Standarkan pengukurannya'), value: DEFAULTS.standardize },
    { name: 'keep', type: 'range', label: tr('Components to keep', 'Komponen yang dipertahankan'), min: 1, max: WIDE_D, step: 1, value: DEFAULTS.keep },
  ], name => {
    if (name === 'data') { setMode(controls.get('data')); return; }
    if (name === 'az') az = controls.get('az');
    if (name === 'tilt') tilt = controls.get('tilt');
    if (name === 'cloud' || name === 'dims') boxPredict.reset();
    settle();
  });
  const sliders = [...controls.el.querySelectorAll('input[type=range]')];   // n, az, tilt, keep
  const [nSlider, , , keepSlider] = sliders;
  const buttons = [...controls.el.querySelectorAll('button.panel-button')];  // newSample, snap, turn
  const newGroup = buttons[0].parentElement, snapGroup = buttons[1].parentElement;
  const note = (after, role) => {
    const p = document.createElement('p'); p.className = 'hint'; if (role) p.setAttribute('role', 'status');
    after.after(p); return p;
  };
  const dataNote = note(controls.el.querySelector('select').closest('label'), true);
  const keepNote = note(keepSlider.closest('.slider-label'), true);

  const sideCanvas = lab.chartCard(
    tr('Side view: Feature 1 against Feature 3', 'Tampak samping: Feature 1 terhadap Feature 3'),
    tr('The same cloud and the same axis as the main plot, seen from the side. Tilt the axis and watch it leave the flat view. The dashed lines are at right angles to the axis in 3-D, not in each flat view, so in either view they can look slanted.',
      'Kumpulan titik dan sumbu yang sama dengan plot utama, dilihat dari samping. Miringkan sumbunya dan lihat ia keluar dari tampilan datar. Garis putus-putus tegak lurus terhadap sumbu di 3-D, bukan di tiap tampilan datar, jadi di kedua tampilan garisnya bisa tampak miring.'), 300);
  const sweepCanvas = lab.chartCard(
    tr('Variance kept and information lost at every angle', 'Varians yang dipertahankan dan informasi yang hilang di tiap sudut'),
    tr('Each curve is the number in the status line, for every angle of the axis. The two always add up to the total variance.',
      'Tiap kurva adalah angka di baris status, untuk setiap sudut sumbu. Keduanya selalu berjumlah varians total.'), 240);
  const screeCanvas = lab.chartCard(
    tr('Scree plot: variance explained by each component', 'Scree plot: varians yang dijelaskan tiap komponen'),
    tr('A steep drop and then a flat tail means a few components carry most of the information. The dashed line marks the components you keep.',
      'Penurunan tajam lalu ekor yang datar berarti beberapa komponen memuat sebagian besar informasi. Garis putus-putus menandai komponen yang kamu pertahankan.'), 240);
  const errCanvas = lab.chartCard(
    tr('Information lost versus components kept', 'Informasi yang hilang menurut jumlah komponen yang dipertahankan'),
    tr('Reconstruction error as a share of the total variance: 100% with no component, 0% with all of them.',
      'Galat rekonstruksi sebagai porsi dari varians total: 100% tanpa komponen, 0% dengan semuanya.'), 240);
  const cardOf = c => c.closest('section');
  // The kit draws series labels inside the plot, where they sit on the curves; these keys sit under each chart instead.
  const chartKey = canvas => { const k = document.createElement('div'); k.className = 'legend'; canvas.closest('.chart').after(k); return k; };
  const fillKey = (host, items) => host.replaceChildren(...items.map(it => {
    const span = document.createElement('span'), i = document.createElement('i');
    i.className = it.kind === 'dash' ? 'glyph-line dashed' : 'glyph-line'; i.setAttribute('aria-hidden', 'true'); i.style.setProperty('--glyph', it.color);
    span.append(i, ` ${it.label}`); return span;
  }));
  const sweepKey = chartKey(sweepCanvas), screeKey = chartKey(screeCanvas), errKey = chartKey(errCanvas);
  // "Components to keep" only drives the two charts below, so it lives with them: this keeps the Parameters card short
  // and the Quick Quiz button docked under it within the first screen.
  const keepLabel = keepSlider.closest('.slider-label');
  screeKey.after(keepLabel, keepNote);
  const sidePlot = createPlot(sideCanvas, {});

  const boxPredict = predictBox(lab.ref('below'), {
    name: 'predict-perp',
    hint: tr('Use Generated data, snap to the first principal component, turn the axis by 90°, then check again.',
      'Pakai Data buatan, pas ke komponen utama pertama, putar sumbu 90°, lalu periksa lagi.'),
    question: tr('If you project onto the axis perpendicular to the best one, what happens to the information lost?',
      'Jika kamu memproyeksikan ke sumbu yang tegak lurus dengan sumbu terbaik, apa yang terjadi pada informasi yang hilang?'),
    choices: [
      ['up', tr('More information is lost than on the best axis', 'Lebih banyak informasi hilang daripada di sumbu terbaik')],
      ['down', tr('Less information is lost than on the best axis', 'Lebih sedikit informasi hilang daripada di sumbu terbaik')],
      ['same', tr('About the same amount is lost', 'Jumlah yang hilang hampir sama')],
    ],
  });
  lab.cleanup(() => boxPredict.destroy());
  boxPredict.onPick(() => revealPrediction());
  boxPredict.onCheck(() => revealPrediction());

  // ---- data --------------------------------------------------------------------------------------
  const dimsNow = () => Number(controls.get('dims'));
  const remember = (key, make) => { if (!memo.has(key)) { if (memo.size > 24) memo.clear(); memo.set(key, make()); } return memo.get(key); };
  function cloudData() {
    const kind = controls.get('cloud'), d = dimsNow(), n = controls.get('n');
    return remember(`c|${kind}|${d}|${seed}|${n}`, () => { const X = generatedCloud(kind, d, seed, n); return { X, model: fitPca(X), d }; });
  }
  function wideData() {
    const kind = controls.get('cloud');
    return remember(`w|${kind}|${seed}`, () => { const X = wideTable(kind, seed, WIDE_N, WIDE_D); return { X, model: fitPca(X), d: WIDE_D, names: featureNames(WIDE_D) }; });
  }
  function penguinData() {
    const std = controls.get('standardize');
    return remember(`p|${std}`, () => ({ X: real.X, model: fitPca(real.X, { standardize: std }), d: 4, names: penguinNames() }));
  }
  const isReal = () => mode === 'penguins' && real != null;
  const tableData = () => (isReal() ? penguinData() : wideData());

  async function setMode(next) {
    const token = ++loadToken;
    loadFailed = false; boxPredict.reset();
    if (next === 'generated') { mode = 'generated'; loading = false; settle(); return; }
    loading = true; mode = next; draw();
    try {
      const table = await loadDataset(next);
      if (destroyed || token !== loadToken) return;
      real = penguinMeasurements(table);
      loading = false;
    } catch {
      if (destroyed || token !== loadToken) return;
      loading = false; loadFailed = true; mode = 'generated';
      controls.set('data', 'generated');
    }
    settle();
  }

  // ---- axis control --------------------------------------------------------------------------------
  const axisNow = () => axisFromAngles(az, tilt, dimsNow());
  function setAxis(nextAz, nextTilt = tilt, soon = false) {
    az = wrap180(nextAz); tilt = Math.max(-90, Math.min(90, nextTilt));
    controls.set('az', Math.round(az) % 181); controls.set('tilt', Math.round(tilt));
    if (soon) { draw(); settleSoon(); } else settle();
  }
  function snap() {
    if (mode !== 'generated') return;
    const a = anglesFromAxis(cloudData().model.components[0]);
    setAxis(a.azimuth, dimsNow() === 2 ? 0 : a.tilt);
    lab.canvas.focus();
  }
  function turn() {
    if (mode !== 'generated') return;
    const { model, d } = cloudData();
    const u = axisNow();
    const prefer = d === 2 ? [-u[1], u[0]] : model.components[1];
    const a = anglesFromAxis(perpendicularAxis(u, prefer));
    setAxis(a.azimuth, d === 2 ? 0 : a.tilt);
    lab.canvas.focus();
  }

  lab.on(lab.canvas, 'pointerdown', e => {
    if (mode !== 'generated') return;
    drag = { id: e.pointerId };
    lab.canvas.setPointerCapture(e.pointerId);
    lab.canvas.focus();
    dragTo(e);
  });
  lab.on(lab.canvas, 'pointermove', e => { if (drag?.id === e.pointerId) dragTo(e); });
  const endDrag = e => { if (drag?.id === e.pointerId) { drag = null; settle(); } };
  lab.on(lab.canvas, 'pointerup', endDrag);
  lab.on(lab.canvas, 'pointercancel', endDrag);
  function dragTo(e) {
    const p = plot.toData(e), mean = cloudData().model.mean;
    const dx = p.x - mean[0], dy = p.y - mean[1];
    if (Math.hypot(dx, dy) < plot.range.span * 0.02) return;   // too close to the centre to point anywhere
    setAxis(Math.atan2(dy, dx) * 180 / Math.PI, tilt, true);
  }
  lab.on(lab.canvas, 'keydown', e => {
    if (mode !== 'generated') return;
    const step = e.shiftKey ? 5 : 1;
    const moves = { ArrowLeft: [-step, 0], ArrowDown: [dimsNow() === 2 ? -step : 0, dimsNow() === 2 ? 0 : -step], ArrowRight: [step, 0], ArrowUp: [dimsNow() === 2 ? step : 0, dimsNow() === 2 ? 0 : step] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    setAxis(az + m[0], tilt + m[1], true);
  });
  function settleSoon() { clearTimeout(timer); timer = setTimeout(() => { revealPrediction(); }, 350); }
  lab.cleanup(() => clearTimeout(timer));

  // ---- the prediction --------------------------------------------------------------------------------
  // Revealed once the learner's axis stands at right angles to the best one (within about 3 degrees in 2-D,
  // 81 degrees or more in 3-D): then the lost information there is compared with the lost information on the best axis.
  function revealPrediction() {
    if (mode !== 'generated' || boxPredict.chosen() == null) return;
    const { X, model, d } = cloudData();
    const best = model.components[0], u = axisNow();
    if (Math.abs(dot(u, best)) > (d === 2 ? 0.0524 : 0.15)) return;
    const here = axisReport(X, u), top = axisReport(X, best);
    const same = Math.abs(here.lost - top.lost) < 0.03 * here.total;
    const key = same ? 'same' : here.lost > top.lost ? 'up' : 'down';
    const numbers = tr(`On the best axis the information lost is ${num(top.lost)} (${pct(top.lostRatio)} of the variance); on this axis it is ${num(here.lost)} (${pct(here.lostRatio)}).`,
      `Di sumbu terbaik informasi yang hilang ${num(top.lost)} (${pct(top.lostRatio)} dari varians); di sumbu ini ${num(here.lost)} (${pct(here.lostRatio)}).`);
    const why = same
      ? tr('This cloud is round: no direction has more spread than another, so every axis loses the same amount.',
        'Kumpulan titik ini bulat: tidak ada arah yang lebih menyebar daripada arah lain, jadi setiap sumbu kehilangan jumlah yang sama.')
      : tr('No axis keeps more variance than the best one, so an axis at right angles to it keeps less and loses more.',
        'Tidak ada sumbu yang menyimpan varians lebih banyak daripada sumbu terbaik, jadi sumbu yang tegak lurus dengannya menyimpan lebih sedikit dan kehilangan lebih banyak.');
    boxPredict.reveal(key, `${numbers} ${why}`);
  }

  // ---- drawing ---------------------------------------------------------------------------------------
  const sync = () => {
    const real_ = isReal(), gen = mode === 'generated', three = gen && dimsNow() === 3;
    for (const n of ['cloud', 'dims', 'n', 'az', 'showBest', 'showLost']) controls.show(n, gen);
    controls.show('tilt', three);
    controls.show('standardize', real_);
    newGroup.style.display = gen ? '' : 'none';
    snapGroup.style.display = gen ? '' : 'none';
    const d = tableData().d;
    if (Number(keepSlider.max) !== d) { keepSlider.max = String(d); controls.set('keep', Math.min(Number(keepSlider.value), d)); }
    controls.disable('data', loading);
    cardOf(sideCanvas).style.display = three ? '' : 'none';
    cardOf(sweepCanvas).style.display = gen ? '' : 'none';
    return { gen, three };
  };

  // One 2-D view of the cloud: columns i and j of X, the candidate axis, its projections and the dashed distances.
  function cloudView(pl, i, j, canvas, range, scene) {
    const { X, model, u, feet, showBest, showLost } = scene;
    pl.setRange(range);
    pl.setLabels(`Feature ${i + 1}`, `Feature ${j + 1}`);
    const g = pl.begin();
    const mean = model.mean, reach = range.span;
    const line = (v, style) => pl.segment(mean[i] - v[i] * reach, mean[j] - v[j] * reach, mean[i] + v[i] * reach, mean[j] + v[j] * reach, style);
    pl.clip(() => {
      if (showBest) line(model.components[0], { color: clusterColor(3), width: 2.5, dash: [8, 5] });
      line(u, { color: clusterColor(1), width: 3.5 });
      if (showLost) X.forEach((row, r) => pl.segment(row[i], row[j], feet[r][i], feet[r][j], { color: g.t.muted, width: 1.2, dash: [3, 3], alpha: 0.9 }));
      X.forEach(row => pl.dot(row[i], row[j], clusterColor(0), 4));
      feet.forEach(f => pl.dot(f[i], f[j], clusterColor(2), 3.2));
    });
  }

  function drawCloud(sc) {
    const { X, d } = sc;
    let range = squareRange(X, 0, 1);
    if (d === 3) { const other = squareRange(X, 0, 2); if (other.span > range.span) range = other; }
    cloudView(plot, 0, 1, lab.canvas, range, sc);
    if (d === 3) cloudView(sidePlot, 0, 2, sideCanvas, range, sc);
  }

  function drawScores() {
    const { X, model } = penguinData();
    const scores = project(model, X, 2);
    const range = squareRange(scores, 0, 1);
    plot.setRange(range);
    plot.setLabels(`PC1 (${pct(model.explainedRatio[0], 0)})`, `PC2 (${pct(model.explainedRatio[1], 0)})`);
    plot.begin();
    const names = [...new Set(real.species)];
    plot.clip(() => {
      plot.segment(range.minX, 0, range.minX + range.span, 0, { width: 1.2, alpha: 0.6 });
      plot.segment(0, range.minY, 0, range.minY + range.span, { width: 1.2, alpha: 0.6 });
      scores.forEach((s, r) => plot.dot(s[0], s[1], clusterColor(names.indexOf(real.species[r])), 4));
    });
  }

  function loadingsTable(td) {
    const { model, names } = td;
    const cols = Math.min(model.d, 4);
    const t = document.createElement('table');
    t.className = 'stats-table';
    const head = t.createTHead().insertRow();
    [tr('Feature', 'Feature'), ...Array.from({ length: cols }, (_, c) => `PC${c + 1}`)].forEach(h => { const th = document.createElement('th'); th.textContent = h; head.append(th); });
    const body = t.createTBody();
    names.forEach((name, j) => {
      const row = body.insertRow();
      row.insertCell().textContent = name;
      for (let c = 0; c < cols; c++) {
        const cell = row.insertCell();
        cell.textContent = fmt(model.components[c][j], { digits: 2 });
        if (Math.abs(model.components[c][j]) >= 0.5) cell.style.fontWeight = '700';
      }
    });
    const last = body.insertRow();
    last.insertCell().textContent = tr('Variance explained', 'Varians yang dijelaskan');
    for (let c = 0; c < cols; c++) last.insertCell().textContent = pct(model.explainedRatio[c]);
    [...last.cells].forEach(c => { c.style.fontWeight = '700'; c.style.borderTop = '2px solid var(--line, currentColor)'; });
    const style = document.createElement('style');
    style.textContent = '@media (max-width: 640px) { .stats-table { font-size: 12px; } .stats-table th, .stats-table td { white-space: normal; padding: 6px 5px; } .stats-table td:not(:first-child), .stats-table th:not(:first-child) { text-align: right; white-space: nowrap; } }';
    lab.extraEl.replaceChildren(style, t);
  }

  function drawCharts(sc, td) {
    const k = Math.min(controls.get('keep'), td.d);
    const curves = componentCurves(td.model);
    const comps = Array.from({ length: td.d }, (_, i) => i + 1);
    const marker = { markerX: k };
    const kLabel = { kind: 'dash', color: plot.g.t.muted, label: tr(`You keep k = ${fmt(k)}`, `Kamu pertahankan k = ${fmt(k)}`) };
    fillKey(screeKey, [
      { kind: 'line', color: clusterColor(0), label: tr('Each component', 'Tiap komponen') },
      { kind: 'line', color: clusterColor(2), label: tr('Running total', 'Kumulatif') }, kLabel]);
    fillKey(errKey, [{ kind: 'line', color: clusterColor(1), label: tr('Information lost', 'Informasi yang hilang') }, kLabel]);
    drawLineChart(screeCanvas, {
      series: [
        { xs: comps, ys: curves.explained, color: clusterColor(0) },
        { xs: comps, ys: curves.cumulative, color: clusterColor(2) },
      ],
      xLabel: tr('Component', 'Komponen'), yLabel: tr('Variance explained (%)', 'Varians yang dijelaskan (%)'),
      xMin: 1, xMax: td.d, yMin: 0, yMax: 100, integerX: true, ...marker,
    });
    drawLineChart(errCanvas, {
      series: [{ xs: [0, ...comps], ys: curves.lostByK, color: clusterColor(1) }],
      xLabel: tr('Components kept', 'Komponen yang dipertahankan'), yLabel: tr('Information lost (%)', 'Informasi yang hilang (%)'),
      xMin: 0, xMax: td.d, yMin: 0, yMax: 100, integerX: true, ...marker,
    });
    if (sc) {
      const sw = sweepAxis(sc.X, sc.d === 3 ? tilt : 0, 2);
      drawLineChart(sweepCanvas, {
        series: [
          { xs: sw.angles, ys: sw.kept, color: clusterColor(0), points: false },
          { xs: sw.angles, ys: sw.lost, color: clusterColor(1), points: false },
        ],
        xLabel: sc.d === 3 ? tr('Axis angle in the flat view (degrees), at the tilt you set', 'Sudut sumbu di tampilan datar (derajat), pada kemiringan yang kamu atur') : tr('Axis angle (degrees)', 'Sudut sumbu (derajat)'),
        yLabel: tr('Variance', 'Varians'), xMin: 0, xMax: 180, yMin: 0, markerX: az,
      });
      fillKey(sweepKey, [
        { kind: 'line', color: clusterColor(0), label: tr('Variance along the axis', 'Varians sepanjang sumbu') },
        { kind: 'line', color: clusterColor(1), label: tr('Information lost', 'Informasi yang hilang') },
        { kind: 'dash', color: plot.g.t.muted, label: tr(`Your axis: ${deg(az)}`, `Sumbumu: ${deg(az)}`) }]);
    }
    return { k, curves };
  }

  function legend(gen, sc) {
    if (gen) {
      const items = [
        { kind: 'dot', color: clusterColor(0), label: tr('Data point', 'Titik data') },
        { kind: 'line', color: clusterColor(1), label: tr('Your axis', 'Sumbumu') },
        { kind: 'dot', color: clusterColor(2), label: tr('Projection onto the axis', 'Proyeksi ke sumbu') },
      ];
      if (sc.showLost) items.push({ kind: 'dash', color: sc.t.muted, label: tr('Information lost (distance to the axis)', 'Informasi yang hilang (jarak ke sumbu)') });
      if (sc.showBest) items.push({ kind: 'dash', color: clusterColor(3), label: tr('Best axis (first principal component)', 'Sumbu terbaik (komponen utama pertama)') });
      lab.setLegend(items);
    } else if (isReal()) {
      lab.setLegend([...new Set(real.species)].map((s, i) => ({ kind: 'dot', color: clusterColor(i), label: s })));
    } else lab.setLegend([]);
  }

  function draw() {
    const { gen, three } = sync();
    let sc = null;
    const td = tableData();
    if (isReal()) {
      drawScores();
      lab.canvas.setAttribute('aria-label', tr('Penguins projected onto the first two principal components, coloured by species.', 'Penguin diproyeksikan ke dua komponen utama pertama, diwarnai menurut spesies.'));
    } else {
      const { X, model, d } = cloudData();
      const u = axisNow();
      const { feet } = projectOnAxis(X, u);
      sc = { X, model, d, u, feet, showBest: controls.get('showBest'), showLost: controls.get('showLost') };
      drawCloud(sc);
      lab.canvas.setAttribute('aria-label', d === 3
        ? tr('Point cloud in 3-D with a candidate axis, shown as a top view. Left and right arrow keys turn the axis, up and down arrow keys tilt it; Shift for bigger steps.', 'Kumpulan titik 3-D dengan sebuah sumbu kandidat, tampak atas. Panah kiri dan kanan memutar sumbu, panah atas dan bawah memiringkannya; Shift untuk langkah lebih besar.')
        : tr('Point cloud with a candidate axis. Left and right arrow keys turn the axis by one degree, Shift for five.', 'Kumpulan titik dengan sebuah sumbu kandidat. Panah kiri dan kanan memutar sumbu satu derajat, Shift untuk lima.'));
    }
    const { k, curves } = drawCharts(sc, td);
    legend(gen, sc && { ...sc, t: plot.g.t });
    loadingsTable(td);
    readouts(sc, td, k, curves, three);
  }

  function readouts(sc, td, k, curves, three) {
    const d = td.d;
    keepNote.textContent = tr(
      `Keeping ${fmt(k)} of ${fmt(d)} components keeps ${pct(1 - curves.lostByK[k] / 100)} of the variance and loses ${pct(curves.lostByK[k] / 100)}.`,
      `Mempertahankan ${fmt(k)} dari ${fmt(d)} komponen menyimpan ${pct(1 - curves.lostByK[k] / 100)} varians dan kehilangan ${pct(curves.lostByK[k] / 100)}.`);
    if (loading) { lab.setStatus(tr('Loading the penguin data…', 'Memuat data penguin…')); return; }
    if (isReal()) {
      const m = td.model, two = m.explainedRatio[0] + m.explainedRatio[1];
      lab.setStatus(tr(
        `Two components keep ${pct(two)} of the variance of the four measurements: PC1 ${pct(m.explainedRatio[0])}, PC2 ${pct(m.explainedRatio[1])}.`,
        `Dua komponen menyimpan ${pct(two)} varians dari empat pengukuran: PC1 ${pct(m.explainedRatio[0])}, PC2 ${pct(m.explainedRatio[1])}.`));
      lab.setDetail(controls.get('standardize')
        ? tr('The species were not given to PCA; the colours only show whether the components found them anyway.', 'Spesiesnya tidak diberikan ke PCA; warna hanya menunjukkan apakah komponen menemukannya juga.')
        : tr('Not standardised: body mass is in grams, so its huge numbers dominate the first component. Turn standardising on to compare.', 'Tidak distandarkan: massa tubuh dalam gram, jadi angkanya yang sangat besar mendominasi komponen pertama. Aktifkan standarisasi untuk membandingkan.'));
      lab.setMetrics(tr(`${fmt(real.X.length)} penguins · 4 measurements`, `${fmt(real.X.length)} penguin · 4 pengukuran`));
      dataNote.textContent = tr(
        `${fmt(real.X.length)} of ${fmt(real.total)} penguins have all four measurements; ${fmt(real.dropped)} rows with missing values (NA) are left out.`,
        `${fmt(real.X.length)} dari ${fmt(real.total)} penguin punya keempat pengukuran; ${fmt(real.dropped)} baris dengan missing value (NA) dibuang.`);
      lab.describe(lab.canvas, tr(`Scatter of ${fmt(real.X.length)} penguins on PC1 and PC2. PC1 explains ${pct(m.explainedRatio[0])} of the variance, PC2 ${pct(m.explainedRatio[1])}.`, `Sebaran ${fmt(real.X.length)} penguin pada PC1 dan PC2. PC1 menjelaskan ${pct(m.explainedRatio[0])} varians, PC2 ${pct(m.explainedRatio[1])}.`));
      return;
    }
    const rep = axisReport(sc.X, sc.u), best = axisReport(sc.X, sc.model.components[0]);
    const bestA = anglesFromAxis(sc.model.components[0]);
    const here = three ? tr(`Axis at ${deg(az)}, tilt ${deg(tilt)}`, `Sumbu di ${deg(az)}, miring ${deg(tilt)}`) : tr(`Axis at ${deg(az)}`, `Sumbu di ${deg(az)}`);
    lab.setStatus(tr(
      `${here}: it keeps ${num(rep.along)} of the ${num(rep.total)} total variance (${pct(rep.keptRatio)}). Information lost: ${num(rep.lost)} (${pct(rep.lostRatio)}).`,
      `${here}: menyimpan ${num(rep.along)} dari ${num(rep.total)} varians total (${pct(rep.keptRatio)}). Informasi yang hilang: ${num(rep.lost)} (${pct(rep.lostRatio)}).`));
    const onBest = Math.abs(dot(sc.u, sc.model.components[0])) > 0.9998;
    const where = three ? tr(`${deg(bestA.azimuth)}, tilt ${deg(bestA.tilt)}`, `${deg(bestA.azimuth)}, miring ${deg(bestA.tilt)}`) : deg(bestA.azimuth);
    const flat = best.keptRatio < 1 / sc.d + 0.02;
    lab.setDetail(flat
      ? tr('This cloud is round: every axis keeps about the same variance, so no axis is better than another.', 'Kumpulan titik ini bulat: setiap sumbu menyimpan varians yang hampir sama, jadi tidak ada sumbu yang lebih baik daripada yang lain.')
      : onBest
      ? tr(`You are on the best axis (${where}): no other axis keeps more variance or loses less.`, `Kamu ada di sumbu terbaik (${where}): tidak ada sumbu lain yang menyimpan lebih banyak varians atau kehilangan lebih sedikit.`)
      : tr(`The best axis is at ${where}: it keeps ${num(best.along)} (${pct(best.keptRatio)}) and loses only ${num(best.lost)}.`, `Sumbu terbaik ada di ${where}: menyimpan ${num(best.along)} (${pct(best.keptRatio)}) dan hanya kehilangan ${num(best.lost)}.`));
    lab.setMetrics(tr(`${fmt(sc.X.length)} points · ${sc.d}-D`, `${fmt(sc.X.length)} titik · ${sc.d}-D`));
    dataNote.textContent = loadFailed
      ? tr('Could not load the penguin data, so the generated data is shown.', 'Data penguin tidak bisa dimuat, jadi data buatan yang ditampilkan.')
      : tr('Generated and seeded, so everyone sees the same points.', 'Dibuat dengan seed, jadi semua orang melihat titik yang sama.');
    lab.describe(lab.canvas, tr(
      `${sc.X.length} points. Axis at ${deg(az)}${three ? `, tilt ${deg(tilt)}` : ''}. It keeps ${pct(rep.keptRatio)} of the variance and loses ${pct(rep.lostRatio)}. The best axis keeps ${pct(best.keptRatio)}.`,
      `${sc.X.length} titik. Sumbu di ${deg(az)}${three ? `, miring ${deg(tilt)}` : ''}. Menyimpan ${pct(rep.keptRatio)} varians dan kehilangan ${pct(rep.lostRatio)}. Sumbu terbaik menyimpan ${pct(best.keptRatio)}.`));
  }

  // After any change that is complete (not a drag in progress): redraw, then check the prediction.
  function settle() { draw(); revealPrediction(); }

  lab.onReset(() => {
    loadToken += 1; clearTimeout(timer);
    mode = 'generated'; seed = DEFAULTS.seed; az = DEFAULTS.az; tilt = DEFAULTS.tilt; loading = false; loadFailed = false;
    controls.set('data', 'generated'); controls.set('cloud', DEFAULTS.cloud); controls.set('dims', DEFAULTS.dims);
    controls.set('n', DEFAULTS.n); controls.set('az', DEFAULTS.az); controls.set('tilt', DEFAULTS.tilt);
    controls.set('showBest', false); controls.set('showLost', true); controls.set('standardize', DEFAULTS.standardize); controls.set('keep', DEFAULTS.keep);
    boxPredict.reset();
    draw();
  });
  lab.onTheme(draw);
  lab.onResize(draw);
  lab.cleanup(() => { destroyed = true; loadToken += 1; });
  draw();
  return lab.destroy;
}
