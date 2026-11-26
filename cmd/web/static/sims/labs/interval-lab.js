// Interval lab, built on the kit: a 1-D regression with prediction intervals from three methods (split
// conformal, quantile regression, a bootstrap ensemble) drawn as bands. The test inputs can be moved away from
// the training inputs (covariate shift), and the lab measures how often each band still holds the true value.
// "Generated data" has a known true curve and noise; "Penguins (real)" predicts body mass from flipper length
// with one species held out of training and used as the shifted part of the test set (rows with a missing
// value, NA, are left out and the lab says so). The math is in sims/ml/intervals.js and sims/ml/intervallab.js;
// this file draws and wires.
import { createLab, createPlot, drawLineChart, dataModeSpec, loadDataset, predictBox, clusterColor, tr, fmt, pct } from '../kit/index.js';
import {
  METHODS, GEN, PEN, SWEEP, SWEEP_STEP, generatedScenario, penguinsScenario, fitScenario, intervalMethods,
  sweepShift, shiftVerdict, sweepIndex,
} from '../ml/intervallab.js';

export const DEFAULTS = { seed: 41, alpha: 0.1, cal: GEN.calDefault, noise: 'growing', shift: 0.4, heldOut: 'Gentoo' };
const MIN_SHIFT_TO_CHECK = 0.2;        // the Quick Quiz answer needs a real shift to compare with no shift
const CURVE_POINTS = 140;

// Method names, colors and line styles; built when drawn so the text follows the language.
const methodInfo = {
  conformal: { name: () => tr('Split conformal', 'Split conformal'), color: () => clusterColor(0), dash: null, glyph: 'line' },
  quantile: { name: () => tr('Quantile regression', 'Quantile regression'), color: () => clusterColor(2), dash: [8, 5], glyph: 'dash' },
  bootstrap: { name: () => tr('Bootstrap ensemble', 'Bootstrap ensemble'), color: () => clusterColor(3), dash: [2, 4], glyph: 'dash' },
};

const pc = v => (Number.isFinite(v) ? pct(v, 1) : '–');
const widthText = w => (Number.isFinite(w) ? fmt(w, { digits: 2 }) : '∞');
const gapText = g => {
  const pts = Math.abs(g) * 100;
  if (pts < 0.05) return `${fmt(0, { digits: 1 })} ${tr('pts', 'poin')}`;
  return `${g > 0 ? '+' : '−'}${fmt(pts, { digits: 1 })} ${tr('pts', 'poin')}`;
};

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Prediction intervals under shift', 'Interval prediksi saat terjadi shift'),
    hint: tr(
      'Three ways to put a band around a prediction. Every method learns from the same training points; split conformal also uses the calibration points. Then the test inputs move away from the training inputs, and the lab counts how often each band still holds the true value.',
      'Tiga cara memasang band di sekitar prediksi. Semua metode belajar dari titik latih yang sama; split conformal juga memakai titik kalibrasi. Lalu input uji digeser menjauh dari input latih, dan lab menghitung seberapa sering tiap band masih memuat nilai yang benar.'),
    status: true, legend: true,
    canvasLabel: tr('Scatter plot of training, calibration and test points with the fitted curve and the prediction bands of the three methods. The picture is described below the plot; use the controls to change it.', 'Scatterplot titik latih, kalibrasi, dan uji dengan kurva hasil fit serta band prediksi dari tiga metode. Gambar dijelaskan di bawah plot; gunakan kontrol untuk mengubahnya.'),
    extra: {
      title: tr('Coverage and width on the test set', 'Coverage dan lebar pada test set'),
      hint: tr('Coverage is the share of test points whose true value falls inside the band. Width is the mean distance from the lower to the upper edge. The gap is coverage minus the target, in percentage points.', 'Coverage adalah porsi titik uji yang nilai sebenarnya jatuh di dalam band. Lebar adalah jarak rata-rata dari tepi bawah ke tepi atas. Gap adalah coverage dikurangi target, dalam poin persentase.'),
    },
  });
  // Nothing on the plot is dragged: it is a picture with a text description, not a tab stop.
  lab.canvas.setAttribute('role', 'img');
  lab.canvas.removeAttribute('tabindex');
  const plot = createPlot(lab.canvas, { xLabel: '', yLabel: '' });
  const legendHost = lab.ref('legend');
  if (legendHost) legendHost.style.maxHeight = 'none';

  let mode = 'generated', seed = DEFAULTS.seed, table = null, loading = false, loadFailed = false, loadToken = 0, destroyed = false;
  let scn = null, fitted = null, methods = null, sweep = null;
  let pending = 0, revealTimer = 0;

  const controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real)', 'Penguin (data nyata)')]] }),
    { name: 'heldOut', type: 'select', label: tr('Held-out species (the shifted test set)', 'Spesies yang ditahan (test set yang bergeser)'), options: PEN.species.map(s => [s, s]), value: DEFAULTS.heldOut },
    { name: 'noise', type: 'select', label: tr('Noise', 'Noise'), options: [['constant', tr('Constant', 'Konstan')], ['growing', tr('Growing with x', 'Membesar seiring x')]], value: DEFAULTS.noise },
    { name: 'alpha', type: 'range', label: tr('Alpha (share allowed to miss)', 'Alpha (porsi yang boleh meleset)'), min: 0.05, max: 0.5, step: 0.05, value: DEFAULTS.alpha, format: v => `${fmt(v, { digits: 2 })} (${tr('target', 'target')} ${pct(1 - v, 0)})` },
    { name: 'cal', type: 'range', label: tr('Calibration set size', 'Ukuran calibration set'), min: GEN.calMin, max: GEN.calMax, step: 5, value: DEFAULTS.cal },
    { name: 'shift', type: 'range', label: tr('Shift severity', 'Tingkat shift'), min: 0, max: 1, step: SWEEP_STEP, value: DEFAULTS.shift, format: v => pct(v, 0) },
    { name: 'newSample', type: 'button', label: tr('New sample', 'Sampel baru'), onClick: () => { seed += 1; rebuild(); } },
    { name: 'showConformal', type: 'toggle', label: tr('Show split conformal band', 'Tampilkan band split conformal'), value: true },
    { name: 'showQuantile', type: 'toggle', label: tr('Show quantile regression band', 'Tampilkan band quantile regression'), value: true },
    { name: 'showBootstrap', type: 'toggle', label: tr('Show bootstrap ensemble band', 'Tampilkan band bootstrap ensemble'), value: true },
    { name: 'showTest', type: 'toggle', label: tr('Show test points', 'Tampilkan titik uji'), value: true },
    { name: 'showTruth', type: 'toggle', label: tr('Show the true curve', 'Tampilkan kurva sebenarnya'), value: true },
  ], name => {
    if (name === 'data') { setMode(controls.get('data')); return; }
    if (name === 'noise' || name === 'heldOut') { rebuild(); return; }
    if (name === 'alpha') { scheduleMethods(); return; }
    if (name === 'cal') { refit(); return; }
    redraw();
  });
  const sliders = controls.el.querySelectorAll('input[type=range]');
  const calSlider = sliders[1];
  const dataNote = document.createElement('p');
  dataNote.className = 'hint';
  controls.el.querySelector('select').closest('label').after(dataNote);
  const shiftNote = document.createElement('p');
  shiftNote.className = 'hint';
  sliders[2].closest('.slider-label').after(shiftNote);

  const box = predictBox(lab.ref('below'), {
    hint: tr('Raise the shift severity to 20% or more, then check again.', 'Naikkan tingkat shift ke 20% atau lebih, lalu periksa lagi.'),
    name: 'predict-shift',
    question: tr('When the test inputs move away from the training data, what happens to the coverage of a 90 percent interval?', 'Ketika input uji bergeser menjauh dari data latih, apa yang terjadi pada coverage interval 90 persen?'),
    choices: [
      ['drops', tr('It falls below what the interval promised', 'Turun di bawah yang dijanjikan interval')],
      ['stays', tr('It stays about the same', 'Tetap hampir sama')],
      ['rises', tr('It rises above what the interval promised', 'Naik di atas yang dijanjikan interval')],
    ],
  });
  lab.cleanup(() => box.destroy());
  box.onPick(revealPrediction); box.onCheck(revealPrediction);

  const chartCanvas = lab.chartCard(
    tr('Coverage as the shift grows', 'Coverage saat shift membesar'),
    tr('Each line measures coverage on a test set shifted by that much, using the intervals you see above. The dashed line is the target. The vertical line marks your current shift.', 'Setiap garis mengukur coverage pada test set yang digeser sebesar itu, dengan interval yang kamu lihat di atas. Garis putus-putus adalah target. Garis tegak menandai shift kamu sekarang.'),
    270);
  const chartLegendEl = document.createElement('div');
  chartLegendEl.className = 'legend';
  chartCanvas.closest('section').append(chartLegendEl);

  // ---- data ------------------------------------------------------------------------------------

  const calCap = () => (scn ? Math.min(scn.calMax, scn.calPool.x.length) : GEN.calMax);
  // The slider reaches every spare row the data mode has; changing max makes the browser clamp the value.
  function syncCalSlider() {
    const max = calCap();
    if (Number(calSlider.max) === max) return;
    calSlider.max = String(max);
    controls.set('cal', Math.min(Number(calSlider.value), max));
  }
  // Setting a default for a mode: the slider range of that mode first (a lower max would clamp the value), then the value.
  function setCalDefault(forMode) {
    const gen = forMode === 'generated';
    calSlider.max = String(gen ? GEN.calMax : PEN.calMax);
    controls.set('cal', gen ? GEN.calDefault : PEN.calDefault);
  }
  function applyModeControls() {
    const gen = mode === 'generated';
    controls.show('noise', gen); controls.show('showTruth', gen); controls.show('heldOut', !gen);
  }

  async function setMode(next) {
    const token = ++loadToken;
    loadFailed = false;
    if (next === 'generated') { mode = 'generated'; loading = false; setCalDefault('generated'); rebuild(); return; }
    loading = true; mode = next; applyModeControls(); draw();
    try {
      table = await loadDataset(next);
      if (destroyed || token !== loadToken) return;
      loading = false;
    } catch {
      if (destroyed || token !== loadToken) return;
      loading = false; loadFailed = true; mode = 'generated';
      controls.set('data', 'generated');
    }
    setCalDefault(mode);
    rebuild();
  }

  // A new scenario (new data, a new held-out species, new noise): everything is fitted again.
  function rebuild() {
    applyModeControls();
    if (mode === 'penguins' && table) {
      scn = penguinsScenario(table, { seed, heldOut: controls.get('heldOut') });
    } else scn = generatedScenario({ seed, noise: controls.get('noise') });
    fitted = fitScenario(scn);
    refit();
  }
  // New alpha or calibration size: the three methods are built again (cheap, the fits are kept).
  function refit() {
    clearTimeout(pending); pending = 0;
    syncCalSlider();
    methods = intervalMethods(fitted, { alpha: controls.get('alpha'), calSize: controls.get('cal') });
    sweep = sweepShift(methods, scn);
    redraw();
  }
  // Dragging alpha: quantile regression is the slow part, so wait until the slider rests for a moment.
  function scheduleMethods() { clearTimeout(pending); pending = setTimeout(refit, 140); }

  // ---- Quick Quiz ------------------------------------------------------------------------------

  function revealPrediction() {
    if (!methods || box.chosen() == null) return;
    const idx = sweepIndex(controls.get('shift'));
    if (SWEEP[idx] < MIN_SHIFT_TO_CHECK - 1e-9) return;
    const actual = shiftVerdict(sweep, idx), a = sweep[0].coverage, b = sweep[idx].coverage;
    const at = tr(`At a shift of ${pct(SWEEP[idx], 0)}: `, `Pada shift ${pct(SWEEP[idx], 0)}: `);
    const parts = METHODS.map(m => tr(`${methodInfo[m].name()} went from ${pc(a[m])} to ${pc(b[m])}`, `${methodInfo[m].name()} berubah dari ${pc(a[m])} menjadi ${pc(b[m])}`));
    const target = pct(1 - methods.alpha, 0);
    const why = actual === 'drops'
      ? tr('The calibration points and the training points came from the old inputs, so the bands were sized for inputs like them. New inputs far from them get no promise.', 'Titik kalibrasi dan titik latih berasal dari input yang lama, jadi band dibuat untuk input seperti itu. Input baru yang jauh dari sana tidak mendapat janji apa pun.')
      : actual === 'stays'
        ? tr('With this shift the new inputs still look like the training inputs, or the model still extrapolates well, so little changed. Push the shift higher, or hold out another species.', 'Dengan shift ini input baru masih mirip input latih, atau model masih bisa mengekstrapolasi dengan baik, jadi hampir tidak ada yang berubah. Naikkan shift, atau tahan spesies yang lain.')
        : tr('Here the shifted test points happen to sit where the bands are wider or the model is easier to predict, so more of them fall inside. That is luck of the setting, not a promise.', 'Di sini titik uji yang bergeser kebetulan berada di tempat band lebih lebar atau model lebih mudah memprediksi, jadi lebih banyak yang jatuh di dalam. Itu keberuntungan pengaturannya, bukan janji.');
    box.reveal(actual, `${at}${parts.join('; ')}. ${tr(`The target was ${target}.`, `Targetnya ${target}.`)} ${why}`);
  }
  function settleSoon() { clearTimeout(revealTimer); revealTimer = setTimeout(revealPrediction, 350); }
  lab.cleanup(() => { clearTimeout(revealTimer); clearTimeout(pending); });

  // ---- drawing ---------------------------------------------------------------------------------

  function view() {
    if (scn?.kind === 'penguins') {
      return { xLo: 165, xHi: 235, yLo: 2, yHi: 7, xTitle: tr('Flipper length (mm)', 'Panjang sirip (mm)'), yTitle: tr('Body mass (kg)', 'Massa tubuh (kg)') };
    }
    const delta = (scn?.shiftBy ?? (s => s * 2))(controls.get('shift'));
    return { xLo: -1.2, xHi: 1.2 + delta, yLo: -5, yHi: 5, xTitle: tr('Input x', 'Input x'), yTitle: tr('Output y', 'Output y') };
  }
  const toPlot = (p, v) => ({ x: (p.x - v.xLo) / (v.xHi - v.xLo) * 10, y: (p.y - v.yLo) / (v.yHi - v.yLo) * 10 });

  // The kit's plot labels its axes 0..10; the data are in other units, so those labels are erased (the margins
  // are transparent) and drawn again from the data range.
  function axes(g, v) {
    const ctx = plot.ctx;
    ctx.clearRect(0, 0, g.px(0) - 2, g.height);
    ctx.clearRect(0, g.py(0) + 2, g.width, g.height);
    ctx.save();
    ctx.fillStyle = g.t.muted; ctx.font = '11px system-ui, sans-serif';
    for (let i = 0; i <= 5; i++) {
      ctx.textAlign = 'center'; ctx.fillText(fmt(v.xLo + i * (v.xHi - v.xLo) / 5, { max: 1 }), g.px(i * 2), g.py(0) + 16);
      ctx.textAlign = 'right'; ctx.fillText(fmt(v.yLo + i * (v.yHi - v.yLo) / 5, { max: 1 }), g.px(0) - 7, g.py(i * 2) + 4);
    }
    ctx.textAlign = 'center'; ctx.fillText(v.xTitle, g.px(5), g.height - 5);
    // On a narrow plot the title would run off the left edge, so it keeps at least 12px from it.
    ctx.translate(Math.max(12, g.px(0) - 27), g.py(5)); ctx.rotate(-Math.PI / 2); ctx.fillText(v.yTitle, 0, 0);
    ctx.restore();
  }

  function drawBand(name, v) {
    const info = methodInfo[name], color = info.color();
    const clampY = y => Math.max(v.yLo - 3 * (v.yHi - v.yLo), Math.min(v.yHi + 3 * (v.yHi - v.yLo), y));
    const xs = Array.from({ length: CURVE_POINTS }, (_, i) => v.xLo + (v.xHi - v.xLo) * i / (CURVE_POINTS - 1));
    const iv = xs.map(x => methods[name].predict(x));
    const upper = xs.map((x, i) => toPlot({ x, y: clampY(iv[i].hi) }, v)), lower = xs.map((x, i) => toPlot({ x, y: clampY(iv[i].lo) }, v));
    plot.polygon([...upper, ...lower.slice().reverse()], { fill: color, alpha: 0.12 });
    plot.polyline(upper, { color, width: 2, dash: info.dash });
    plot.polyline(lower, { color, width: 2, dash: info.dash });
  }

  function dots(points, v, color, r, alpha) {
    const ctx = plot.ctx;
    ctx.save(); ctx.globalAlpha = alpha;
    points.x.forEach((x, i) => { const u = toPlot({ x, y: points.y[i] }, v); plot.dot(u.x, u.y, color, r); });
    ctx.restore();
  }
  function rings(points, v, color, r) {
    points.x.forEach((x, i) => { const u = toPlot({ x, y: points.y[i] }, v); plot.ring(u.x, u.y, color, r, 1.4); });
  }

  function draw() {
    syncCalSlider();
    const v = view(), g = plot.begin();
    axes(g, v);
    if (loading || !scn || !methods) {
      lab.setStatus(tr('Loading the penguin data…', 'Memuat data penguin…'));
      lab.setDetail(''); lab.setMetrics(''); lab.setLegend([]);
      return;
    }
    const sev = controls.get('shift'), idx = sweepIndex(sev), now = sweep[idx], test = scn.testAt(sev);
    const target = 1 - methods.alpha;
    const show = { conformal: controls.get('showConformal'), quantile: controls.get('showQuantile'), bootstrap: controls.get('showBootstrap') };
    const calRows = { x: scn.calPool.x.slice(0, methods.conformal.m), y: scn.calPool.y.slice(0, methods.conformal.m) };
    const muted = g.t.muted;

    plot.clip(() => {
      // The range of the training inputs, so it is clear when a test point has left it.
      const x0 = Math.min(...scn.train.x), x1 = Math.max(...scn.train.x);
      const a = toPlot({ x: x0, y: v.yLo }, v), b = toPlot({ x: x1, y: v.yHi }, v);
      plot.polygon([{ x: a.x, y: 0 }, { x: b.x, y: 0 }, { x: b.x, y: 10 }, { x: a.x, y: 10 }], { fill: muted, alpha: 0.09 });
      for (const name of METHODS) if (show[name]) drawBand(name, v);
      const xs = Array.from({ length: CURVE_POINTS }, (_, i) => v.xLo + (v.xHi - v.xLo) * i / (CURVE_POINTS - 1));
      if (scn.kind === 'generated' && controls.get('showTruth')) plot.polyline(xs.map(x => toPlot({ x, y: scn.trueCurve(x) }, v)), { color: muted, width: 2, dash: [3, 4] });
      plot.polyline(xs.map(x => toPlot({ x, y: methods.curve(x) }, v)), { color: g.t.ink, width: 2.5 });
      if (controls.get('showTest')) dots(test, v, clusterColor(1), 2.6, 0.55);
      rings(calRows, v, muted, 3.2);
      dots(scn.train, v, clusterColor(-1), 3.2, 0.85);
      if (methods.conformal.infinite && show.conformal) {
        plot.label(0, 10, tr('Conformal band infinite: add calibration points', 'Band conformal tak terhingga: tambah titik kalibrasi'), { dx: 8, dy: 16, color: methodInfo.conformal.color(), size: 11 });
      }
      if (b.x - a.x > 2) plot.label(a.x, 10, tr('Training inputs', 'Input latih'), { dx: 6, dy: 32, color: muted, size: 11, weight: 500 });
    });

    // readouts
    const names = METHODS.map(m => `${methodInfo[m].name()} ${pc(now.coverage[m])}`).join(', ');
    lab.setStatus(tr(`Target coverage ${pct(target, 0)}. On the test set: ${names}.`, `Target coverage ${pct(target, 0)}. Pada test set: ${names}.`));
    const nOut = scn.kind === 'penguins' ? scn.shiftBy(sev) : null;
    lab.setDetail(scn.kind === 'penguins'
      ? tr(`Test set: ${fmt(test.x.length)} penguins, ${fmt(nOut)} of them ${scn.heldOut}, a species the model never saw. ${pct(now.inside, 0)} have a flipper length inside the training range.`,
        `Test set: ${fmt(test.x.length)} penguin, ${fmt(nOut)} di antaranya ${scn.heldOut}, spesies yang tidak pernah dilihat model. ${pct(now.inside, 0)} punya panjang sirip di dalam rentang data latih.`)
      : tr(`Test set: ${fmt(test.x.length)} new points. ${pct(now.inside, 0)} have an input inside the training range. Their y values follow the same true rule as the training data.`,
        `Test set: ${fmt(test.x.length)} titik baru. ${pct(now.inside, 0)} punya input di dalam rentang data latih. Nilai y mereka mengikuti aturan sebenarnya yang sama dengan data latih.`));
    lab.setMetrics(tr(`${fmt(scn.train.x.length)} training, ${fmt(methods.conformal.m)} calibration, ${fmt(test.x.length)} test`, `${fmt(scn.train.x.length)} latih, ${fmt(methods.conformal.m)} kalibrasi, ${fmt(test.x.length)} uji`));
    const items = [
      { kind: 'dot', color: clusterColor(-1), label: tr('Training points', 'Titik latih') },
      { kind: 'ring', color: muted, label: tr('Calibration points (split conformal only)', 'Titik kalibrasi (hanya split conformal)') },
    ];
    if (controls.get('showTest')) items.push({ kind: 'dot', color: clusterColor(1), label: tr('Test points (new inputs)', 'Titik uji (input baru)') });
    items.push({ kind: 'line', color: g.t.ink, label: tr('Fitted curve', 'Kurva hasil fit') });
    if (scn.kind === 'generated' && controls.get('showTruth')) items.push({ kind: 'dash', color: muted, label: tr('True curve', 'Kurva sebenarnya') });
    for (const name of METHODS) if (show[name]) items.push({ kind: methodInfo[name].glyph, color: methodInfo[name].color(), label: methodInfo[name].name() });
    lab.setLegend(items);

    shiftNote.textContent = scn.kind === 'penguins'
      ? (nOut === 0
        ? tr(`No ${scn.heldOut} in the test set: every test penguin comes from the species the model learned from.`, `Tidak ada ${scn.heldOut} di test set: semua penguin uji berasal dari spesies yang dipelajari model.`)
        : tr(`${fmt(nOut)} of the ${fmt(test.x.length)} test penguins are ${scn.heldOut}.`, `${fmt(nOut)} dari ${fmt(test.x.length)} penguin uji adalah ${scn.heldOut}.`))
      : tr(`Test inputs move right by ${fmt(scn.shiftBy(sev), { digits: 2 })}. The training inputs run from -1 to 1.`, `Input uji bergeser ke kanan sebesar ${fmt(scn.shiftBy(sev), { digits: 2 })}. Input latih membentang dari -1 sampai 1.`);
    if (scn.kind === 'penguins') {
      dataNote.textContent = tr(
        `${fmt(scn.count)} of ${fmt(scn.total)} penguins have both measurements; ${fmt(scn.dropped)} rows with missing values (NA) are left out. The model learns from the other two species and never sees ${scn.heldOut}. A straight line is fitted.`,
        `${fmt(scn.count)} dari ${fmt(scn.total)} penguin punya kedua pengukuran; ${fmt(scn.dropped)} baris dengan missing value (NA) dibuang. Model belajar dari dua spesies lain dan tidak pernah melihat ${scn.heldOut}. Yang di-fit adalah garis lurus.`);
    } else if (loadFailed) dataNote.textContent = tr('Could not load the penguin data, so the generated data is shown.', 'Data penguin tidak bisa dimuat, jadi data buatan yang ditampilkan.');
    else dataNote.textContent = tr('Generated points around a known curve (seeded, so everyone sees the same ones). A cubic polynomial is fitted.', 'Titik buatan di sekitar kurva yang diketahui (memakai seed, jadi semua orang melihat titik yang sama). Yang di-fit adalah polinomial kubik.');
    controls.disable('newSample', loading);

    drawTable(now, target);
    drawChart(idx, target);

    lab.describe(lab.canvas, tr(
      `Scatter plot of ${fmt(scn.train.x.length)} training points, ${fmt(methods.conformal.m)} calibration points and ${fmt(test.x.length)} test points with the fitted curve. Shift severity ${pct(sev, 0)}, target coverage ${pct(target, 0)}. Coverage on the test set: ${names}. Mean width: ${METHODS.map(m => `${methodInfo[m].name()} ${widthText(now.width[m])}`).join(', ')}.`,
      `Scatterplot ${fmt(scn.train.x.length)} titik latih, ${fmt(methods.conformal.m)} titik kalibrasi, dan ${fmt(test.x.length)} titik uji dengan kurva hasil fit. Tingkat shift ${pct(sev, 0)}, target coverage ${pct(target, 0)}. Coverage pada test set: ${names}. Lebar rata-rata: ${METHODS.map(m => `${methodInfo[m].name()} ${widthText(now.width[m])}`).join(', ')}.`));
  }

  function drawTable(now, target) {
    const t = document.createElement('table');
    t.className = 'stats-table';
    t.innerHTML = '<thead><tr></tr></thead>';
    const head = t.querySelector('tr');
    for (const h of [tr('Method', 'Metode'), tr('Coverage on test set', 'Coverage pada test set'), tr(`Gap to target (${pct(target, 0)})`, `Gap ke target (${pct(target, 0)})`), tr('Mean width', 'Lebar rata-rata')]) {
      const th = document.createElement('th'); th.textContent = h; head.append(th);
    }
    const body = document.createElement('tbody');
    for (const name of METHODS) {
      const row = body.insertRow();
      const nameCell = row.insertCell();
      nameCell.textContent = methodInfo[name].name();
      if (name === 'bootstrap') {
        row.style.background = `color-mix(in srgb, ${methodInfo[name].color()} 12%, transparent)`;
        const tag = document.createElement('small');
        tag.className = 'hint';
        tag.classList.add('method-tag');
        tag.textContent = tr('Model uncertainty only, so low is expected', 'Hanya ketidakpastian model, jadi rendah itu wajar');
        nameCell.append(tag);
      }
      row.insertCell().textContent = pc(now.coverage[name]);
      row.insertCell().textContent = gapText(now.coverage[name] - target);
      row.insertCell().textContent = widthText(now.width[name]);
    }
    t.append(body);
    const style = document.createElement('style');
    style.textContent = '.method-tag { display: block; white-space: normal; width: 10em; } @media (max-width: 640px) { .stats-table { font-size: 12px; } .stats-table th, .stats-table td { white-space: normal; padding: 6px 5px; } .method-tag { width: auto; } .stats-table td:not(:first-child) { white-space: nowrap; text-align: right; } .stats-table th:not(:first-child) { text-align: right; } }';
    const notes = document.createElement('div');
    const add = text => { const p = document.createElement('p'); p.className = 'hint'; p.textContent = text; notes.append(p); };
    add(tr('The bootstrap ensemble band only shows how unsure the model is about its curve. It does not include the noise in each y, so it is narrow and misses most test points even with no shift. That is expected: it answers a different question.', 'Band bootstrap ensemble hanya menunjukkan seberapa ragu model terhadap kurvanya. Noise pada setiap y tidak ikut dihitung, jadi band-nya sempit dan melewatkan sebagian besar titik uji bahkan tanpa shift. Itu wajar: ia menjawab pertanyaan yang lain.'));
    if (methods.conformal.infinite) add(tr(`Split conformal needs at least ${fmt(Math.ceil(1 / methods.alpha - 1))} calibration points for this alpha. With ${fmt(methods.conformal.m)} it can only give an infinite band, which covers everything and tells you nothing.`, `Split conformal butuh minimal ${fmt(Math.ceil(1 / methods.alpha - 1))} calibration point untuk alpha ini. Dengan ${fmt(methods.conformal.m)} ia hanya bisa memberi band tak terhingga, yang mencakup semuanya dan tidak memberi tahu apa-apa.`));
    lab.extraEl.replaceChildren(style, t, notes);
  }

  function drawChart(idx, target) {
    const xs = SWEEP.map(s => s * 100);
    const series = METHODS.map(m => ({ xs, ys: sweep.map(s => s.coverage[m] * 100), color: methodInfo[m].color(), points: false }));
    series.push({ xs: [0, 100], ys: [target * 100, target * 100], color: plot.g.t.ink, dash: true, points: false });
    const xy = drawLineChart(chartCanvas, {
      series, xLabel: tr('Shift severity (%)', 'Tingkat shift (%)'), yLabel: tr('Coverage on the test set (%)', 'Coverage pada test set (%)'),
      xMin: 0, xMax: 100, yMin: 0, yMax: 100, markerX: SWEEP[idx] * 100,
    });
    // The kit puts the marker label at the top, where it sits on the target line once the target reaches 90%.
    // It is drawn here instead, at the bottom of the plot.
    const ctx = chartCanvas.getContext('2d'), w = chartCanvas.getBoundingClientRect().width, cx = xy.X(SWEEP[idx] * 100), cy = xy.Y(0) - 7;
    const word = tr('Now', 'Sekarang'), edge = cx > w - 50;
    ctx.save();
    ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = edge ? 'right' : 'center';
    const tw = ctx.measureText(word).width, left = edge ? cx - tw - 3 : cx - tw / 2 - 3;
    ctx.fillStyle = plot.g.t.plot ?? 'transparent'; ctx.fillRect(left, cy - 12, tw + 6, 16);
    ctx.fillStyle = plot.g.t.ink; ctx.fillText(word, edge ? cx - 3 : cx, cy);
    ctx.restore();
    chartLegendEl.replaceChildren(...[
      ...METHODS.map(m => ({ kind: 'line', color: methodInfo[m].color(), label: methodInfo[m].name() })),
      { kind: 'dash', color: plot.g.t.ink, label: tr(`Target ${pct(target, 0)}`, `Target ${pct(target, 0)}`) },
    ].map(it => {
      const span = document.createElement('span'), i = document.createElement('i');
      i.className = `glyph-line${it.kind === 'dash' ? ' dashed' : ''}`;
      i.setAttribute('aria-hidden', 'true'); i.style.setProperty('--glyph', it.color);
      span.append(i, ` ${it.label}`);
      return span;
    }));
    const first = sweep[0], last = sweep[SWEEP.length - 1];
    lab.describe(chartCanvas, tr(
      `Coverage of each method as the shift grows from 0% to 100%. With no shift: ${METHODS.map(m => `${methodInfo[m].name()} ${pc(first.coverage[m])}`).join(', ')}. At 100%: ${METHODS.map(m => `${methodInfo[m].name()} ${pc(last.coverage[m])}`).join(', ')}. Target ${pct(target, 0)}.`,
      `Coverage tiap metode saat shift tumbuh dari 0% ke 100%. Tanpa shift: ${METHODS.map(m => `${methodInfo[m].name()} ${pc(first.coverage[m])}`).join(', ')}. Pada 100%: ${METHODS.map(m => `${methodInfo[m].name()} ${pc(last.coverage[m])}`).join(', ')}. Target ${pct(target, 0)}.`));
  }

  // Redraw after a change that does not need new fits (a toggle, the shift slider), then recheck the Quick Quiz.
  function redraw() { draw(); settleSoon(); }

  lab.onReset(() => {
    loadToken += 1; clearTimeout(pending);
    mode = 'generated'; seed = DEFAULTS.seed; loading = false; loadFailed = false;
    controls.set('data', 'generated'); controls.set('noise', DEFAULTS.noise); controls.set('heldOut', DEFAULTS.heldOut);
    controls.set('alpha', DEFAULTS.alpha); controls.set('cal', DEFAULTS.cal); controls.set('shift', DEFAULTS.shift);
    for (const n of ['showConformal', 'showQuantile', 'showBootstrap', 'showTest', 'showTruth']) controls.set(n, true);
    box.reset();
    rebuild();
  });
  lab.onTheme(draw);
  lab.onResize(draw);
  lab.cleanup(() => { destroyed = true; loadToken += 1; });
  applyModeControls();
  rebuild();
  return lab.destroy;
}
