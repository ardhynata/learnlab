// Shift lab, built on the kit. Two-class data in two dimensions, a train set (filled dots) and a test set
// (rings). ONE kind of shift at a time moves the test set away from the train set: the inputs move
// (covariate), the class balance changes (label) or the rule linking inputs to labels changes (concept).
// A model (k-NN or logistic regression) is fitted on the train rows only. The bar chart then puts what each
// validation setup ESTIMATED from the training data (random k-fold, grouped k-fold, temporal split, a holdout
// shifted towards the test inputs, nested cross-validation) next to the accuracy ACTUALLY measured on the
// shifted test set, so the learner sees which setup anticipated the drop. The detectors (PSI per feature,
// domain-classifier AUC) read only the inputs.
//   Generated data: sims/ml/shift.js (makeShiftData); "Penguins (real)": predict sex from bill length and
//   body mass with one island held out as the test set (rows with a missing value, NA, are left out and the
//   lab says how many). The math is in ml/shift.js and ml/shiftlab.js; this file draws and wires.
import { createLab, createPlot, dataModeSpec, loadDataset, predictBox, clusterColor, theme, tr, fmt, pct } from '../kit/index.js';
import {
  makeShiftData, compareSetups, modelFitPredict, shiftXY, domainClassifierAuc, psiVerdict, SHIFT_KINDS,
} from '../ml/shift.js';
import {
  penguinShiftData, judgeSetups, warningSetups, aucVerdict, detectorReading, plotRange, boundaryCurve, regionGrid,
  featurePsi, PENGUIN_ISLANDS, TOLERANCE,
} from '../ml/shiftlab.js';

export const DEFAULTS = { shift: 'covariate', severity: 0.8, drift: 0, model: 'knn', island: 'Biscoe', seed: 1, n: 200 };
const GENERATED_RANGE = { minX: -4, minY: -5, span: 10 };
const MAX_ANGLE = Math.PI / 2;           // the concept shift rotates the boundary by 90 degrees x severity (shift.js)
const SETTLE_MS = 150;                   // wait for the learner to stop moving a slider before the heavy part runs
const CACHE_LIMIT = 40;
const POINTS = Math.round(TOLERANCE * 100);

// ---- pure computation (no DOM; tested in shift-lab.test.js) ------------------------------------------------------

// Everything the estimates card, the plot regions and the detector table need for one dataset and one model.
export function computeResult(data, { model = DEFAULTS.model, seed = DEFAULTS.seed } = {}) {
  const compare = compareSetups({ data, model, seed });
  const rows = judgeSetups(compare.rows);
  const { X, y } = shiftXY(data.train);
  const testX = data.test.map(r => r.features);
  const range = data.shift === 'real' ? plotRange([...data.train, ...data.test]) : GENERATED_RANGE;
  return {
    compare, rows, range,
    actual: compare.actual, tuned: compare.actualTuned,
    regions: regionGrid(modelFitPredict(model), X, y, range),
    psis: featurePsi(data),
    auc: domainClassifierAuc(X, testX, seed),
  };
}

// ---- names, built when drawn so they follow the language ----------------------------------------------------------

const setupName = key => ({
  random: tr('Random k-fold', 'k-fold acak'),
  grouped: tr('Grouped k-fold', 'k-fold berkelompok'),
  temporal: tr('Temporal split', 'Temporal split'),
  'shifted-holdout': tr('Shifted holdout', 'Holdout bergeser'),
  nested: tr('Nested CV', 'Nested CV'),
})[key] ?? key;
const shiftName = key => ({
  none: tr('None', 'Tidak ada'),
  covariate: tr('Covariate shift', 'Covariate shift'),
  label: tr('Label shift', 'Label shift'),
  concept: tr('Concept shift', 'Concept shift'),
})[key] ?? key;
const islandName = name => name;
const pts = v => fmt(Math.abs(v) * 100, { digits: 0 });

const SETUP_ORDER = ['random', 'grouped', 'temporal', 'shifted-holdout', 'nested'];

// What the generated or the real data call the two classes and the two features.
const labels = real => (real
  ? { c0: tr('female', 'betina'), c1: tr('male', 'jantan'), f0: tr('Bill length', 'Panjang paruh'), f1: tr('Body mass', 'Massa tubuh'), share: tr('Share of male penguins', 'Porsi penguin jantan'),
    x: tr('Bill length (standardised)', 'Panjang paruh (terstandar)'), y: tr('Body mass (standardised)', 'Massa tubuh (terstandar)') }
  : { c0: tr('class 0', 'kelas 0'), c1: tr('class 1', 'kelas 1'), f0: tr('Feature 1', 'Fitur 1'), f1: tr('Feature 2', 'Fitur 2'), share: tr('Share of class 1', 'Porsi kelas 1'),
    x: tr('Feature 1', 'Fitur 1'), y: tr('Feature 2', 'Fitur 2') });

// One verdict per bar, from the long form to the shortest, so a narrow screen can pick the one that fits.
function verdictText(row) {
  const p = pts(row.gap);
  if (row.status === 'anticipated') return [tr(`✓ within ${POINTS} points`, `✓ dalam ${POINTS} poin`), tr(`✓ within ${POINTS}`, `✓ dalam ${POINTS}`), '✓'];
  if (row.status === 'optimistic') return [tr(`✗ ${p} points too optimistic`, `✗ terlalu optimis ${p} poin`), tr(`✗ ${p} pts too high`, `✗ ${p} poin terlalu tinggi`), tr(`✗ +${p} pts`, `✗ +${p} poin`), `✗ +${p}`];
  return [tr(`✗ ${p} points too pessimistic`, `✗ terlalu pesimis ${p} poin`), tr(`✗ ${p} pts too low`, `✗ ${p} poin terlalu rendah`), tr(`✗ −${p} pts`, `✗ −${p} poin`), `✗ −${p}`];
}

// ---- the estimates chart -------------------------------------------------------------------------------------------

function prepare(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, w: width, h: height, t: theme() };
}

// result: computeResult(...) or null. stale: the numbers belong to an earlier setting (drawn faint).
function drawBars(canvas, result, stale) {
  const { ctx, w, h, t } = prepare(canvas);
  const padL = 12, padR = 12, top = 22, axisH = 34;
  const plotL = padL, plotR = w - padR, plotW = Math.max(60, plotR - plotL);
  const X = v => plotL + Math.max(0, Math.min(1, v)) * plotW;
  ctx.fillStyle = t.plot; ctx.fillRect(0, 0, w, h);
  const bottom = h - axisH;
  ctx.font = '11px system-ui, sans-serif'; ctx.textBaseline = 'alphabetic';
  // grid and axis
  ctx.strokeStyle = t.grid; ctx.fillStyle = t.muted; ctx.lineWidth = 1; ctx.textAlign = 'center';
  ctx.beginPath();
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    ctx.moveTo(X(v), top - 4); ctx.lineTo(X(v), bottom);
    ctx.textAlign = v === 0 ? 'left' : v === 1 ? 'right' : 'center';
    ctx.fillText(`${fmt(v * 100, { digits: 0 })}%`, X(v), bottom + 14);
  }
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillText(tr('Accuracy', 'Akurasi'), (plotL + plotR) / 2, h - 5);
  if (!result) {
    ctx.fillStyle = t.muted; ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(tr('Working out the estimates…', 'Menghitung perkiraan…'), w / 2, h / 2);
    return;
  }
  ctx.save();
  ctx.globalAlpha = stale ? 0.35 : 1;
  const byKey = new Map(result.rows.map(r => [r.setup, r]));
  const rowH = (bottom - top) / SETUP_ORDER.length;
  const barH = Math.min(18, rowH * 0.34);

  // the actual accuracy on the shifted test set: its label above, and a dashed line through each bar below
  const actualText = tr(`Actual: ${pct(result.actual, 0)}`, `Sebenarnya: ${pct(result.actual, 0)}`);
  ctx.font = '600 12px system-ui, sans-serif'; ctx.fillStyle = t.ink;
  const half = ctx.measureText(actualText).width / 2;
  ctx.textAlign = 'center';
  ctx.fillText(actualText, Math.min(plotR - half, Math.max(plotL + half, X(result.actual))), 13);

  SETUP_ORDER.forEach((key, i) => {
    const row = byKey.get(key);
    if (!row) return;
    const y0 = top + i * rowH;
    const target = key === 'nested' && result.tuned != null ? result.tuned : result.actual;
    const color = row.status === 'anticipated' ? clusterColor(2) : clusterColor(0);
    // header: name and value on the left, the verdict on the right (the short form when the long one does not fit)
    ctx.textBaseline = 'alphabetic';
    ctx.font = '600 13px system-ui, sans-serif'; ctx.fillStyle = t.ink; ctx.textAlign = 'left';
    const name = setupName(key);
    ctx.fillText(name, plotL, y0 + 15);
    const nameW = ctx.measureText(name).width;
    ctx.font = '12px system-ui, sans-serif';
    const value = `${pct(row.estimate, 0)} ± ${fmt(row.sd * 100, { digits: 0 })}`;
    ctx.fillText(value, plotL + nameW + 8, y0 + 15);
    const used = nameW + 8 + ctx.measureText(value).width;
    const forms = verdictText(row);
    const room = plotW - used - 14;
    const verdict = forms.find(c => ctx.measureText(c).width <= room) ?? forms[forms.length - 1];
    ctx.textAlign = 'right'; ctx.fillStyle = row.status === 'anticipated' ? t.ink : t.muted;
    ctx.fillText(verdict, plotR, y0 + 15);
    // bar from 0 to the estimate, on a faint track; whiskers show the spread
    const by = y0 + 22;
    ctx.fillStyle = t.grid; ctx.fillRect(plotL, by, plotW, barH);
    ctx.fillStyle = color; ctx.fillRect(plotL, by, X(row.estimate) - plotL, barH);
    ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = t.muted; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(X(result.actual), by - 4); ctx.lineTo(X(result.actual), by + barH + 4); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = t.ink; ctx.lineWidth = 1.5;
    const lo = X(row.estimate - row.sd), hi = X(row.estimate + row.sd), mid = by + barH / 2;
    ctx.beginPath();
    ctx.moveTo(lo, mid); ctx.lineTo(hi, mid);
    ctx.moveTo(lo, mid - 4); ctx.lineTo(lo, mid + 4); ctx.moveTo(hi, mid - 4); ctx.lineTo(hi, mid + 4);
    ctx.stroke();
    // the score the estimate is compared with: a heavy tick through the bar
    ctx.strokeStyle = t.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(X(target), by - 4); ctx.lineTo(X(target), by + barH + 4); ctx.stroke();
    ctx.lineWidth = 1;
    // nested CV is judged against the tuned model, whose tick sits elsewhere: say so on the chart
    if (target !== result.actual) {
      ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = t.muted; ctx.textAlign = 'center';
      const label = tr('tuned model', 'model hasil tuning');
      const lw = ctx.measureText(label).width / 2;
      ctx.fillText(label, Math.min(plotR - lw, Math.max(plotL + lw, X(target))), by + barH + 15);
    }
  });
  ctx.restore();
}

// ---- the lab --------------------------------------------------------------------------------------------------------

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Dataset shift', 'Dataset shift'),
    hint: tr(
      'Filled dots are the train set, rings are the test set. Pick ONE kind of shift and see which validation setup saw the drop coming.',
      'Titik penuh adalah train set, lingkaran adalah test set. Pilih SATU jenis shift dan lihat setup validasi mana yang sudah memperkirakan penurunannya.'),
    status: true, legend: true, canvasLabel: tr('Scatterplot of the train and test sets', 'Scatterplot train set dan test set'),
    extra: {
      title: tr('Shift detectors', 'Detektor shift'),
      hint: tr(
        'Detectors compare the inputs of the train and test sets. They never look at the test labels, except the class-balance row, which needs labels you would not have yet.',
        'Detektor membandingkan input train set dan test set. Detektor tidak melihat label test set, kecuali baris keseimbangan kelas, yang butuh label yang belum kamu punya.'),
    },
  });
  // The plot is a picture, not an application: nothing on it is dragged.
  lab.canvas.setAttribute('role', 'img');
  lab.canvas.removeAttribute('tabindex');
  const plot = createPlot(lab.canvas, { xLabel: '', yLabel: '', range: GENERATED_RANGE });
  const legendHost = lab.ref('legend');
  if (legendHost) legendHost.style.maxHeight = 'none';
  const barCanvas = lab.chartCard(
    tr('Estimated and actual accuracy', 'Akurasi perkiraan dan akurasi sebenarnya'),
    tr(
      `Bars: what each setup estimated from the training data alone, with its spread as a whisker. Black tick: the accuracy actually measured on the shifted test set (for nested CV, the tuned model's). Green bar: within ${POINTS} points of it. A ✗ with +N means the estimate was N points too high.`,
      `Batang: perkiraan tiap setup dari data training saja, dengan sebarannya sebagai garis kumis. Garis hitam tebal: akurasi yang benar-benar terukur pada test set yang bergeser (untuk nested CV, milik model yang sudah di-tuning). Batang hijau: dalam ${POINTS} poin darinya. Tanda ✗ dengan +N berarti perkiraannya N poin terlalu tinggi.`),
    330);

  let mode = 'generated', seed = DEFAULTS.seed, real = null, loading = false, loadFailed = false, loadToken = 0, destroyed = false;
  let state = { snap: null, data: null, result: null };
  let lastResult = null, timer = 0;
  const cache = new Map();

  const controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real)', 'Penguin (data nyata)')]] }),
    { name: 'island', type: 'select', label: tr('Held-out island', 'Pulau yang ditahan'), value: DEFAULTS.island, options: PENGUIN_ISLANDS.map(i => [i, islandName(i)]) },
    { name: 'shift', type: 'select', label: tr('Shift type', 'Jenis shift'), value: DEFAULTS.shift, options: SHIFT_KINDS.map(k => [k, shiftName(k)]) },
    { name: 'severity', type: 'range', label: tr('Severity', 'Tingkat pergeseran'), min: 0, max: 1, step: 0.05, value: DEFAULTS.severity, format: v => fmt(v, { digits: 2 }) },
    { name: 'drift', type: 'range', label: tr('Drift already in the training data', 'Drift yang sudah ada di data training'), min: 0, max: 1, step: 0.1, value: DEFAULTS.drift, format: v => fmt(v, { digits: 1 }) },
    { name: 'model', type: 'select', label: tr('Model', 'Model'), value: DEFAULTS.model, options: [['knn', tr('k-NN (k = 5)', 'k-NN (k = 5)')], ['logistic', tr('Logistic regression', 'Regresi logistik')]] },
    { name: 'regions', type: 'toggle', label: tr("Show the model's regions", 'Tampilkan wilayah prediksi model'), value: true },
    { name: 'boundary', type: 'toggle', label: tr('Show the true boundary', 'Tampilkan batas sebenarnya'), value: true },
    { name: 'newSample', type: 'button', label: tr('New sample', 'Sampel baru'), onClick: () => { seed += 1; update(); } },
    { type: 'note', text: tr('Severity says how far the test set moves. Drift lets the later training rows already contain part of that shift, which is what a temporal split needs to see it coming.', 'Tingkat pergeseran menyatakan seberapa jauh test set bergeser. Drift membuat baris training yang lebih baru sudah memuat sebagian shift itu, dan itulah yang dibutuhkan temporal split untuk melihatnya datang.') },
  ], name => {
    if (name === 'data') { setMode(controls.get('data')); return; }
    if (name === 'regions' || name === 'boundary') { draw(); return; }
    update();
  });
  const sliderNote = controls.el.querySelector(':scope > p.hint:last-child');
  const dataNote = document.createElement('p');
  dataNote.className = 'hint';
  dataNote.setAttribute('role', 'status');
  controls.el.querySelector('select').closest('label').after(dataNote);

  const boxConcept = predictBox(lab.ref('below'), {
    name: 'predict-concept',
    hint: tr('Choose Generated data and set Shift type to Concept shift, then check again.', 'Pilih Data buatan dan atur Jenis shift ke Concept shift, lalu periksa lagi.'),
    question: tr('Which validation setup will warn you about a concept shift?', 'Setup validasi mana yang akan memperingatkanmu tentang concept shift?'),
    choices: [
      ['random', tr('Random k-fold', 'k-fold acak')],
      ['grouped', tr('Grouped k-fold', 'k-fold berkelompok')],
      ['temporal', tr('Temporal split', 'Temporal split')],
      ['shifted-holdout', tr('Shifted holdout', 'Holdout bergeser')],
      ['nested', tr('Nested cross-validation', 'Nested cross-validation')],
      ['none', tr('None of them', 'Tidak satu pun')],
    ],
  });
  lab.cleanup(() => { boxConcept.destroy(); clearTimeout(timer); });
  boxConcept.onCheck(() => { flush(); revealConcept(); });

  // ---- data and results ------------------------------------------------------------------------------------------

  function snapshot() {
    const v = controls.values();
    const real_ = mode === 'penguins' && real;
    const snap = real_
      ? { kind: 'penguins', island: v.island, model: v.model, seed }
      : { kind: 'generated', shift: v.shift, severity: v.severity, drift: v.drift, model: v.model, seed };
    snap.key = JSON.stringify(snap);
    return snap;
  }
  function dataFor(snap) {
    if (snap.kind === 'penguins') return penguinShiftData(real, snap.island);
    return makeShiftData({ n: DEFAULTS.n, seed: snap.seed, shift: snap.shift, severity: snap.severity, drift: snap.drift });
  }
  function update() {
    if (loading) return;
    const snap = snapshot();
    const data = dataFor(snap);
    clearTimeout(timer);
    const hit = cache.get(snap.key);
    state = { snap, data, result: hit ?? null };
    if (hit) lastResult = hit;
    else timer = setTimeout(flush, SETTLE_MS);
    draw();
    if (hit) afterResult();
  }
  // Runs the heavy part now if it is still pending.
  function flush() {
    clearTimeout(timer);
    if (loading || !state.data || state.result) return;
    const result = computeResult(state.data, { model: state.snap.model, seed: state.snap.seed });
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
    cache.set(state.snap.key, result);
    state.result = lastResult = result;
    draw();
    afterResult();
  }
  function afterResult() {
    if (boxConcept.answered) { if (conceptOnScreen()) revealConcept(); else boxConcept.reset(); }
  }

  async function setMode(next) {
    const token = ++loadToken;
    loadFailed = false;
    if (next === 'generated') { mode = 'generated'; loading = false; showModeControls(); update(); return; }
    loading = true; mode = next; showModeControls(); draw();
    try {
      const table = await loadDataset(next);
      if (destroyed || token !== loadToken) return;
      real = table;
      loading = false;
    } catch {
      if (destroyed || token !== loadToken) return;
      loading = false; loadFailed = true; mode = 'generated';
      controls.set('data', 'generated');
      showModeControls();
    }
    update();
  }
  function showModeControls() {
    const isReal = mode === 'penguins';
    controls.show('island', isReal);
    controls.show('shift', !isReal);
    controls.show('severity', !isReal);
    controls.show('drift', !isReal);
    controls.show('boundary', !isReal);
    controls.disable('newSample', isReal);
    sliderNote.style.display = isReal ? 'none' : '';
  }

  // ---- the concept-shift question ------------------------------------------------------------------------------------

  const conceptOnScreen = () => mode === 'generated' && state.snap?.kind === 'generated' && state.snap.shift === 'concept' && state.snap.severity > 0 && state.result;

  function revealConcept() {
    if (boxConcept.chosen() == null || !conceptOnScreen()) return;
    const r = state.result, rows = r.rows;
    const warners = warningSetups(rows);
    const chosen = boxConcept.chosen();
    const key = warners.includes(chosen) ? chosen : (warners[0] ?? 'none');
    const random = rows.find(x => x.setup === 'random');
    const lead = tr(
      `At severity ${fmt(state.snap.severity, { digits: 2 })} the model scored ${pct(r.actual, 0)} on the shifted test set, and random k-fold had estimated ${pct(random.estimate, 0)}.`,
      `Pada tingkat pergeseran ${fmt(state.snap.severity, { digits: 2 })} model mendapat ${pct(r.actual, 0)} pada test set yang bergeser, padahal random k-fold memperkirakan ${pct(random.estimate, 0)}.`);
    const closest = rows.slice().sort((a, b) => Math.abs(a.gap) - Math.abs(b.gap))[0];
    const drifting = state.snap.drift > 0;
    const who = warners.length
      ? tr(`Within ${POINTS} points of the actual score: ${warners.map(setupName).join(', ')}.`, `Dalam ${POINTS} poin dari skor sebenarnya: ${warners.map(setupName).join(', ')}.`)
      : drifting
        ? tr(`Even with part of the shift already in the training data, no setup came within ${POINTS} points. The closest was ${setupName(closest.setup)}, ${pts(closest.gap)} points off.`, `Meski sebagian shift sudah ada di data training, tidak ada setup yang dalam ${POINTS} poin. Yang terdekat adalah ${setupName(closest.setup)}, selisih ${pts(closest.gap)} poin.`)
        : tr(`No setup came within ${POINTS} points: they all study training data that follows the old rule, and nothing in it hints that the rule changed.`, `Tidak ada setup yang dalam ${POINTS} poin: semuanya mempelajari data training yang mengikuti aturan lama, dan tidak ada petunjuk di dalamnya bahwa aturannya berubah.`);
    const tip = !warners.length && !drifting
      ? tr(' Raise "Drift already in the training data" and watch the temporal split start to notice.', ' Naikkan "Drift yang sudah ada di data training" dan lihat temporal split mulai menyadarinya.')
      : '';
    boxConcept.reveal(key, `${lead} ${who}${tip}`);
  }

  // ---- drawing -------------------------------------------------------------------------------------------------------------

  function scatter() {
    const { data, result, snap } = state;
    const real_ = snap?.kind === 'penguins';
    const text = labels(real_);
    const range = result?.range ?? lastRangeFor(data, real_);
    plot.setRange(range);
    plot.setLabels(text.x, text.y);
    const g = plot.begin();
    const ctx = plot.ctx;
    const cell = g.size / (result?.regions?.cells ?? 1);
    if (result && controls.get('regions')) {
      const { cells, labels: lab01 } = result.regions;
      ctx.save(); ctx.globalAlpha = 0.14;
      for (let i = 0; i < lab01.length; i++) {
        const r = Math.floor(i / cells), c = i % cells;
        ctx.fillStyle = clusterColor(lab01[i] === 1 ? 1 : 0);
        ctx.fillRect(g.px(range.minX) + c * cell, g.py(range.minY + range.span) + r * cell, cell + 0.5, cell + 0.5);
      }
      ctx.restore();
    }
    plot.clip(() => {
      if (!real_ && controls.get('boundary')) {
        for (const run of boundaryCurve(0, range)) plot.polyline(run, { color: g.t.muted, width: 2 });
        if (snap.shift === 'concept' && snap.severity > 0) {
          for (const run of boundaryCurve(MAX_ANGLE * snap.severity, range)) plot.polyline(run, { color: g.t.ink, width: 2, dash: [6, 5] });
        }
      }
      ctx.save(); ctx.globalAlpha = 0.85;
      for (const r of data.train) plot.dot(r.features[0], r.features[1], clusterColor(r.label), 3.6);
      ctx.restore();
      for (const r of data.test) plot.ring(r.features[0], r.features[1], clusterColor(r.label), 4.4, 1.8);
    });
    return { text, real_ };
  }
  const lastRangeFor = (data, real_) => (real_ ? plotRange([...data.train, ...data.test]) : GENERATED_RANGE);

  function detectorTable(result, text) {
    const { data } = state;
    const verdictWord = { stable: tr('Stable (below 0.1)', 'Stabil (di bawah 0,1)'), moderate: tr('Moderate (0.1 to 0.25)', 'Sedang (0,1 sampai 0,25)'), large: tr('Large (above 0.25)', 'Besar (di atas 0,25)') };
    const aucWord = {
      alike: tr('About 0.5: the inputs cannot be told apart', 'Sekitar 0,5: input tidak bisa dibedakan'),
      some: tr('Some difference: partly told apart', 'Ada beda: sebagian bisa dibedakan'),
      clear: tr('Easy to tell apart: the inputs differ', 'Mudah dibedakan: inputnya berbeda'),
    };
    const shareTrain = data.positiveRate.train, shareTest = data.positiveRate.test;
    const rows = [
      [tr(`PSI, ${text.f0}`, `PSI, ${text.f0}`), fmt(result.psis[0], { digits: 2 }), verdictWord[psiVerdict(result.psis[0])]],
      [tr(`PSI, ${text.f1}`, `PSI, ${text.f1}`), fmt(result.psis[1], { digits: 2 }), verdictWord[psiVerdict(result.psis[1])]],
      [tr('Domain classifier AUC', 'AUC domain classifier'), fmt(result.auc, { digits: 2 }), aucWord[aucVerdict(result.auc)]],
      [tr(`${text.share}, train to test`, `${text.share}, train ke test`), `${pct(shareTrain, 0)} → ${pct(shareTest, 0)}`,
        Math.abs(shareTest - shareTrain) >= 0.1 ? tr('The balance changed (needs test labels)', 'Keseimbangannya berubah (butuh label test)') : tr('Similar balance', 'Keseimbangan serupa')],
    ];
    const t = document.createElement('table');
    t.className = 'stats-table';
    t.style.width = '100%';
    const head = t.createTHead().insertRow();
    for (const h of [tr('Detector', 'Detektor'), tr('Value', 'Nilai'), tr('Reading', 'Pembacaan')]) {
      const th = document.createElement('th'); th.scope = 'col'; th.textContent = h; th.style.textAlign = 'left'; head.append(th);
    }
    const body = t.createTBody();
    for (const cells of rows) {
      const row = body.insertRow();
      cells.forEach(c => { const cell = row.insertCell(); cell.textContent = c; cell.style.textAlign = 'left'; });
    }
    const drop = result.rows.find(r => r.setup === 'random').estimate - result.actual;
    const kind = detectorReading({ psis: result.psis, auc: result.auc, drop });
    const reading = {
      'inputs-moved': tr('The detectors see it: the test inputs differ from the training inputs. They can raise the alarm before a single test label arrives. This is the signature of covariate shift, or of a label shift that drags the inputs along.', 'Detektor melihatnya: input test berbeda dari input training. Detektor bisa membunyikan alarm sebelum satu pun label test tiba. Ini ciri covariate shift, atau label shift yang ikut menggeser input.'),
      'quiet-dropped': tr('The detectors see nothing unusual in the inputs, yet the accuracy fell. When the inputs look the same and the score drops, suspect that the rule linking inputs to labels changed (concept shift). Only labelled data from the new setting can show it.', 'Detektor tidak melihat keanehan pada input, tetapi akurasinya turun. Jika input tampak sama dan skor turun, curigai bahwa aturan yang menghubungkan input dengan label berubah (concept shift). Hanya data berlabel dari situasi baru yang bisa menunjukkannya.'),
      quiet: tr('The detectors see nothing unusual in the inputs, and the accuracy did not fall much. No sign of trouble here. With few rows, PSI values of 0.1 to 0.2 can also appear by chance.', 'Detektor tidak melihat keanehan pada input, dan akurasinya tidak turun banyak. Tidak ada tanda masalah di sini. Dengan baris yang sedikit, nilai PSI 0,1 sampai 0,2 juga bisa muncul karena kebetulan.'),
    }[kind];
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = reading;
    const style = document.createElement('style');
    style.textContent = '@media (max-width: 640px) { .stats-table { font-size: 12px; } .stats-table th, .stats-table td { padding: 6px 5px; } } .stats-table th, .stats-table td { white-space: normal; }';
    lab.extraEl.replaceChildren(style, t, p);
  }

  function mechanism(snap) {
    if (snap.kind === 'penguins') {
      return tr('A held-out island is a shift in disguise: its penguins come from a different mix of species, so the inputs move, and the way sex shows in bill and body size differs between species.', 'Pulau yang ditahan adalah shift yang menyamar: penguinnya berasal dari campuran spesies yang berbeda, sehingga input bergeser, dan cara jenis kelamin tampak pada ukuran paruh dan tubuh berbeda antarspesies.');
    }
    return {
      none: tr('No shift: the test set comes from the same world as the train set, so every setup should land near the actual accuracy.', 'Tanpa shift: test set berasal dari dunia yang sama dengan train set, jadi setiap setup seharusnya mendarat dekat akurasi sebenarnya.'),
      covariate: tr('Covariate shift: the inputs move to a region the training data barely covers; the rule that labels them is unchanged.', 'Covariate shift: input bergeser ke wilayah yang nyaris tidak dicakup data training; aturan pemberi labelnya tidak berubah.'),
      label: tr('Label shift: the class balance changes while each class looks as before. Accuracy can stay level and hide it; the share of class 1 is the row that shows it.', 'Label shift: keseimbangan kelas berubah, sedangkan tiap kelas tampak seperti semula. Akurasi bisa tetap datar dan menyembunyikannya; porsi kelas 1 adalah baris yang menunjukkannya.'),
      concept: tr('Concept shift: the inputs look the same, but the true boundary (dashed) turns, so the rule the model learned no longer holds.', 'Concept shift: input tampak sama, tetapi batas sebenarnya (putus-putus) berputar, sehingga aturan yang dipelajari model tidak lagi berlaku.'),
    }[snap.shift];
  }

  function describeAll(result, text) {
    const { data, snap } = state;
    const where = snap.kind === 'penguins'
      ? tr(`penguins with ${snap.island} held out`, `penguin dengan pulau ${snap.island} ditahan`)
      : tr(`${shiftName(snap.shift)} at severity ${fmt(snap.severity, { digits: 2 })}`, `${shiftName(snap.shift)} dengan tingkat pergeseran ${fmt(snap.severity, { digits: 2 })}`);
    lab.describe(lab.canvas, tr(
      `Scatterplot of ${fmt(data.train.length)} train rows (filled dots) and ${fmt(data.test.length)} test rows (rings) in two classes; ${where}.`,
      `Scatterplot ${fmt(data.train.length)} baris train (titik penuh) dan ${fmt(data.test.length)} baris test (lingkaran) dalam dua kelas; ${where}.`));
    if (!result) { lab.describe(barCanvas, tr('The estimates are being worked out.', 'Perkiraan sedang dihitung.')); return; }
    const parts = result.rows.map(r => tr(
      `${setupName(r.setup)} estimated ${pct(r.estimate, 0)}, ${r.status === 'anticipated' ? 'within the tolerance' : r.status === 'optimistic' ? 'too optimistic' : 'too pessimistic'}`,
      `${setupName(r.setup)} memperkirakan ${pct(r.estimate, 0)}, ${r.status === 'anticipated' ? 'dalam toleransi' : r.status === 'optimistic' ? 'terlalu optimis' : 'terlalu pesimis'}`));
    lab.describe(barCanvas, tr(
      `Actual accuracy on the shifted test set: ${pct(result.actual, 0)}. ${parts.join('; ')}.`,
      `Akurasi sebenarnya pada test set yang bergeser: ${pct(result.actual, 0)}. ${parts.join('; ')}.`));
  }

  function draw() {
    const { data, result, snap } = state;
    if (loading || !data) { lab.setStatus(tr('Loading the penguin data…', 'Memuat data penguin…')); drawBars(barCanvas, null, false); return; }
    const { text, real_ } = scatter();
    const shown = result ?? lastResult;
    drawBars(barCanvas, shown, !result);

    // readouts
    if (!result) lab.setStatus(tr('Updating the estimates…', 'Memperbarui perkiraan…'));
    else {
      const warners = warningSetups(result.rows);
      const random = result.rows.find(r => r.setup === 'random');
      const head = tr(
        `Actual accuracy on the shifted test set: ${pct(result.actual, 0)}. Random k-fold estimated ${pct(random.estimate, 0)}.`,
        `Akurasi sebenarnya pada test set yang bergeser: ${pct(result.actual, 0)}. Random k-fold memperkirakan ${pct(random.estimate, 0)}.`);
      const tail = warners.length
        ? tr(` Within ${POINTS} points: ${warners.map(setupName).join(', ')}.`, ` Dalam ${POINTS} poin: ${warners.map(setupName).join(', ')}.`)
        : tr(` No setup came within ${POINTS} points.`, ` Tidak ada setup yang dalam ${POINTS} poin.`);
      lab.setStatus(head + tail);
    }
    lab.setDetail(mechanism(snap));
    lab.setMetrics(tr(`${fmt(data.train.length)} train rows, ${fmt(data.test.length)} test rows`, `${fmt(data.train.length)} baris train, ${fmt(data.test.length)} baris test`));

    const items = [
      { kind: 'dot', color: clusterColor(0), label: tr(`Train, ${text.c0}`, `Train, ${text.c0}`) },
      { kind: 'dot', color: clusterColor(1), label: tr(`Train, ${text.c1}`, `Train, ${text.c1}`) },
      { kind: 'ring', color: clusterColor(0), label: tr(`Test, ${text.c0}`, `Test, ${text.c0}`) },
      { kind: 'ring', color: clusterColor(1), label: tr(`Test, ${text.c1}`, `Test, ${text.c1}`) },
    ];
    if (!real_ && controls.get('boundary')) {
      const g = plot.g;
      items.push({ kind: 'line', color: g.t.muted, label: snap.shift === 'concept' && snap.severity > 0 ? tr('True boundary, train', 'Batas sebenarnya, train') : tr('True boundary', 'Batas sebenarnya') });
      if (snap.shift === 'concept' && snap.severity > 0) items.push({ kind: 'dash', color: g.t.ink, label: tr('True boundary, test', 'Batas sebenarnya, test') });
    }
    lab.setLegend(items);

    controls.disable('severity', mode !== 'generated' || snap.shift === 'none');
    controls.disable('drift', mode !== 'generated' || snap.shift === 'none');

    if (snap.kind === 'penguins') {
      dataNote.textContent = tr(
        `${fmt(data.kept)} of ${fmt(data.total)} penguins have bill length, body mass and sex; ${fmt(data.dropped)} rows with missing values (NA) are left out. ${snap.island} is held out: its ${fmt(data.test.length)} penguins are the shifted test set, the other ${fmt(data.train.length)} are the training set. The model predicts sex (male = class 1) from the two measurements, standardised on the training rows. Groups are island and year; the year gives the time order.`,
        `${fmt(data.kept)} dari ${fmt(data.total)} penguin punya panjang paruh, massa tubuh, dan jenis kelamin; ${fmt(data.dropped)} baris dengan missing value (NA) dibuang. Pulau ${snap.island} ditahan: ${fmt(data.test.length)} penguinnya menjadi test set yang bergeser, sisa ${fmt(data.train.length)} menjadi training set. Model memprediksi jenis kelamin (jantan = kelas 1) dari dua pengukuran itu, yang distandarkan pada baris training. Kelompoknya adalah pulau dan tahun; tahun memberi urutan waktu.`);
    } else if (loadFailed) dataNote.textContent = tr('Could not load the penguin data, so the generated data is shown.', 'Data penguin tidak bisa dimuat, jadi data buatan yang ditampilkan.');
    else dataNote.textContent = tr('Generated points (seeded, so everyone sees the same ones): two classes split by a wavy boundary. The test rows come from new groups.', 'Titik buatan (memakai seed, jadi semua orang melihat titik yang sama): dua kelas yang dipisahkan batas bergelombang. Baris test berasal dari kelompok baru.');

    if (result) detectorTable(result, text);
    describeAll(result, text);
  }

  lab.onReset(() => {
    loadToken += 1;
    mode = 'generated'; seed = DEFAULTS.seed; loading = false; loadFailed = false;
    controls.set('data', 'generated');
    for (const name of ['shift', 'severity', 'drift', 'model', 'island']) controls.set(name, DEFAULTS[name]);
    controls.set('regions', true); controls.set('boundary', true);
    showModeControls();
    boxConcept.reset();
    update();
  });
  lab.onTheme(draw);
  lab.onResize(draw);
  lab.cleanup(() => { destroyed = true; loadToken += 1; });
  showModeControls();
  update();
  return lab.destroy;
}
