// Regularization lab: a flexible polynomial is fitted to a few noisy points (or to real penguin
// measurements) with a penalty on its coefficients. The learner picks L2 (ridge) or L1 (lasso) and
// raises the penalty strength lambda on a log slider, and watches three things move together: the
// fitted curve against the unregularized one, the coefficients (L1 sets some exactly to 0), and the
// training and validation error against lambda. A toggle swaps the error chart for a learning curve.
// The learner first predicts what happens to the validation error as lambda grows; the validation line
// fills in only as lambda is raised, and "Check my prediction" shows all of it and rings the best lambda.
// The math (data, split, features, fits, error grid, learning curve) lives in sims/ml/regularizationlab.js
// on top of sims/ml/regularize.js; this file only draws and wires.
import { createLab, createPlot, drawLineChart, clusterColor, theme, tr, fmt, formatTick, predictBox, dataModeSpec, loadDataset } from '../kit/index.js';
import { parseCsv } from '../ml/tabular.js';
import { chartRuns } from '../ml/overfitdemo.js';
import {
  TOTAL_POINTS, VAL_POINTS, POOL_POINTS, MAX_DEGREE, LOG_MIN, LOG_MAX, DEFAULTS, LEARNING_SIZES, truth, lambdaOf,
  generatedPoints, completePenguins, penguinScale, penguinPoints, typicalMissGrams, splitPoints, designMatrix, columnMeans,
  fitAndScore, curvePoints, errorsByLambda, lambdaGridLogs, bestIndex, shapeOf, learningRepeat, averageRepeats,
} from '../ml/regularizationlab.js';

const FIT_COLOR = () => clusterColor(2);
const REPEATS = 6;
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

// loadDataset (sims/kit/data.js) caches a rejected promise only until it fails once, so a retry fetches the file directly.
const fetchPenguins = () => fetch(new URL('../../data/penguins.csv', import.meta.url)).then(r => {
  if (!r.ok) throw new Error(`dataset penguins: HTTP ${r.status}`);
  return r.text();
}).then(parseCsv);

// ---- text helpers (every learner-facing number goes through fmt) -------------------------------------

const lambdaText = l => fmt(l, { digits: l >= 1 ? 1 : l >= 0.1 ? 2 : l >= 0.01 ? 3 : l >= 0.001 ? 4 : 5 });
const errorText = e => (!Number.isFinite(e) || e > 1000 ? tr('over 1000', 'di atas 1000') : fmt(e, { digits: 2 }));
const sizeText = v => (v >= 1e6 ? tr(`over ${fmt(1e6)}`, `di atas ${fmt(1e6)}`) : v >= 1000 ? fmt(Math.round(v)) : fmt(v, { digits: 2 }));
const gramsText = g => (!Number.isFinite(g) || g > 10000 ? tr(`over ${fmt(10000)} g`, `di atas ${fmt(10000)} g`) : `${fmt(Math.round(g))} g`);
const kindName = kind => (kind === 'l1' ? 'L1 (lasso)' : 'L2 (ridge)');

const canvasLabelFor = real => (real
  ? tr('Plot of penguin training and validation points (body mass against flipper length, both rescaled to 0 to 10) with the fitted curve. Arrow keys: left and right change lambda, up and down change the degree.',
    'Plot titik training dan validasi data penguin (massa tubuh terhadap panjang flipper, keduanya diskalakan ke 0 sampai 10) beserta kurva hasil fit. Tombol panah: kiri dan kanan mengubah lambda, atas dan bawah mengubah derajat.')
  : tr('Plot of training points, validation points, the true curve, the fitted curve and the unregularized fit. Arrow keys: left and right change lambda, up and down change the degree.',
    'Plot titik training, titik validasi, kurva asli, kurva hasil fit, dan fit tanpa regularisasi. Tombol panah: kiri dan kanan mengubah lambda, atas dan bawah mengubah derajat.'));

// One legend row, drawn like the kit's own legend (the kit's setLegend only fills the plot's legend).
function fillLegend(host, items) {
  host.replaceChildren(...items.map(it => {
    const span = document.createElement('span'), i = document.createElement('i');
    i.className = it.kind === 'cross' ? 'glyph-cross' : it.kind === 'line' || it.kind === 'dash' ? `glyph-line${it.kind === 'dash' ? ' dashed' : ''}` : it.kind;
    i.setAttribute('aria-hidden', 'true');
    i.style.setProperty('--glyph', it.color);
    if (it.kind === 'dot') i.style.background = it.color;
    span.append(i, ` ${it.label}`);
    return span;
  }));
}

// Scales a canvas to its CSS size and returns a 2d context drawing in CSS pixels.
function sizeCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width, height };
}

// The smallest 1, 2, 5 times a power of ten that is at least v.
function niceCeil(v) {
  if (!(v > 0)) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 5, 10].map(m => m * mag).find(s => s >= v * (1 - 1e-12));
}

// Shortens text with an ellipsis until it fits `maxW` pixels.
function fitText(ctx, text, maxW) {
  let out = text;
  while (out.length > 2 && ctx.measureText(out).width > maxW) out = `${out.slice(0, -2)}…`;
  return out;
}

export function mount(root) {
  let alive = true;
  const timers = new Set();
  const lab = createLab(root, {
    title: tr('Fit with a penalty', 'Fit dengan penalti'),
    hint: tr('A polynomial is fitted to the dots only. The penalty pulls its coefficients toward zero. The crosses are held back to check the fit.',
      'Polinomial di-fit hanya dari titik bulat. Penalti menarik koefisiennya ke nol. Titik silang disisihkan untuk menguji hasil fit.'),
    status: true, legend: true,
    canvasLabel: canvasLabelFor(false),
    settingsTitle: tr('Controls', 'Pengaturan'),
  });
  lab.cleanup(() => { alive = false; timers.forEach(clearTimeout); });
  const plot = createPlot(lab.canvas, { xLabel: 'x', yLabel: 'y' });

  // Predict first: what does the validation error do as lambda grows?
  const box = predictBox(lab.ref('below'), {
    question: tr('As λ grows from its smallest value, what happens first to the validation error?',
      'Saat λ membesar dari nilai terkecilnya, apa yang pertama terjadi pada validation error?'),
    choices: [
      ['u', tr('It falls first, then rises again', 'Turun dulu, lalu naik lagi')],
      ['rises', tr('It rises straight away', 'Langsung naik')],
      ['falls', tr('It keeps falling', 'Terus turun')],
    ],
    name: 'regularization-predict',
  });

  // Coefficient chart, then the error chart (which the learning-curve toggle swaps for the learning curve).
  const coefChart = lab.chartCard(
    tr('Coefficients at this λ', 'Koefisien pada λ ini'),
    tr('One bar per coefficient, on the standardized scale. A ring on the zero line marks a coefficient that is exactly 0: L1 makes some, L2 only shrinks. The dashed outline is the unregularized value, cut off with a triangle where it is taller than the chart.',
      'Satu batang per koefisien, pada skala terstandar. Lingkaran di garis nol menandai koefisien yang tepat 0: L1 menghasilkannya, L2 hanya menyusutkan. Garis putus-putus adalah nilai tanpa regularisasi; jika lebih tinggi dari grafik, dipotong dengan segitiga.'),
    250);
  const coefLegend = document.createElement('div');
  coefLegend.className = 'legend';
  coefChart.closest('.chart').before(coefLegend);

  const errChart = lab.chartCard(
    tr('Training and validation error against λ', 'Training error dan validation error terhadap λ'),
    tr('Mean squared error: lower is better. The dashed line is your λ. The validation line fills in as you raise λ; Check my prediction shows all of it and rings the best λ. A triangle at the top means the error is higher than the chart shows.',
      'Mean squared error: semakin kecil semakin baik. Garis putus-putus adalah λ-mu. Garis validation terisi saat kamu menaikkan λ; Cek prediksiku menampilkan seluruhnya dan melingkari λ terbaik. Segitiga di bagian atas berarti error-nya lebih tinggi daripada yang tampak di grafik.'),
    260);
  const errLegend = document.createElement('div');
  errLegend.className = 'legend';
  errChart.closest('.chart').before(errLegend);
  const errCard = errChart.closest('.card'), errTitle = errCard.querySelector('h2'), errHint = errCard.querySelector('p.hint');

  // seed: the current sample. table: the parsed penguins (null until loaded). revealed: the prediction was checked.
  // maxSeen: the largest log10(lambda) the learner has tried, which limits the validation line until the check.
  const state = { seed: DEFAULTS.seed, table: null, loading: false, failed: false, poisoned: false, revealed: false, maxSeen: DEFAULTS.logLambda };
  // Everything derived from the data and the settings, kept until the settings change.
  const cache = { pk: '', sk: '', points: null, X: null, y: null, split: null, unreg: null, hold: [], gridKey: '', grid: null, learnKey: '', learn: null };
  const gridMemo = new Map(), learnMemo = new Map();
  let gridJob = 0, learnJob = 0, learnTimer = 0, pendingCheck = false;

  const controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real data)', 'Penguin (data nyata)')]] }),
    { name: 'kind', type: 'select', label: tr('Penalty', 'Penalti'), options: [['l2', 'L2 (ridge)'], ['l1', 'L1 (lasso)']], value: 'l2' },
    { name: 'logLambda', type: 'range', label: tr('Penalty strength λ (log scale)', 'Kekuatan penalti λ (skala log)'), min: LOG_MIN, max: LOG_MAX, step: 0.1, value: DEFAULTS.logLambda, format: v => lambdaText(lambdaOf(v)) },
    { name: 'degree', type: 'range', label: tr('Polynomial degree', 'Derajat polinomial'), min: 1, max: MAX_DEGREE, step: 1, value: DEFAULTS.degree },
    { name: 'noise', type: 'range', label: tr('Noise', 'Noise'), min: 0, max: 1.5, step: 0.05, value: DEFAULTS.noise, format: v => fmt(v, { digits: 2 }) },
    { name: 'train', type: 'number', label: tr(`Training points (out of ${POOL_POINTS})`, `Titik training (dari ${POOL_POINTS})`), min: 6, max: POOL_POINTS, step: 1, value: DEFAULTS.train },
    { name: 'showUnreg', type: 'toggle', label: tr('Show the unregularized fit', 'Tampilkan fit tanpa regularisasi'), value: true },
    { name: 'learning', type: 'toggle', label: tr('Learning-curve view', 'Tampilan learning curve'), value: false },
    { name: 'fresh', type: 'button', label: tr('New sample', 'Sampel baru'), onClick: () => { state.seed += 1; newRound(); draw(); } },
    { name: 'check', type: 'button', label: tr('Check my prediction', 'Cek prediksiku'), onClick: () => check() },
    { name: 'jump', type: 'button', label: tr('Jump to best λ', 'Ke λ terbaik'), onClick: () => jumpToBest() },
    { type: 'note', text: tr(`Every feature is standardized before the fit, so the penalty treats all coefficients alike. The ${VAL_POINTS} validation points never change with the training size. Raise λ and watch the curve, the coefficients and the errors.`,
      `Setiap fitur distandardisasi sebelum fit, sehingga penalti memperlakukan semua koefisien sama. Ke-${VAL_POINTS} titik validasi tidak berubah saat jumlah titik training diubah. Naikkan λ dan perhatikan kurva, koefisien, dan error.`) },
  ], onControl);
  // What the data switch is doing right now (which rows, what scale), under the controls.
  const dataNote = document.createElement('p');
  dataNote.className = 'hint';
  controls.el.append(dataNote);

  const mode = v => (v.data === 'penguins' && state.table ? 'real' : 'generated');
  let prepared = null;
  const realData = () => {
    if (!prepared) {
      const c = completePenguins(state.table);
      prepared = { ...c, scale: penguinScale(c.rows) };
    }
    return prepared;
  };

  // A new round: the sample changed, so the old prediction no longer applies.
  function newRound() {
    state.revealed = false;
    state.maxSeen = controls.values().logLambda;
    box.reset();
  }

  function onControl(name) {
    if (name === 'logLambda') { state.maxSeen = Math.max(state.maxSeen, controls.values().logLambda); draw(); return; }
    if (name === 'data' && controls.values().data === 'penguins' && !state.table && !state.loading) {
      state.loading = true; state.failed = false;
      (state.poisoned ? fetchPenguins() : loadDataset('penguins')).then(table => { state.table = table; }).catch(() => {
        state.failed = true; state.poisoned = true;
        controls.set('data', 'generated');
      }).finally(() => {
        state.loading = false;
        if (!alive) return;
        // Switching back to Generated while the file loaded changed nothing on the plot: keep the prediction.
        if (controls.values().data === 'penguins') newRound();
        draw();
      });
    }
    if (name === 'data') newRound();
    draw();
  }

  // The keyboard alternative to the sliders when the plot has focus: left/right = λ, up/down = degree.
  lab.on(lab.canvas, 'keydown', e => {
    const v = controls.values();
    const step = { ArrowLeft: ['logLambda', -0.2], ArrowRight: ['logLambda', 0.2], ArrowDown: ['degree', -1], ArrowUp: ['degree', 1] }[e.key];
    if (!step) return;
    e.preventDefault();
    const [key, delta] = step, lo = key === 'degree' ? 1 : LOG_MIN, hi = key === 'degree' ? MAX_DEGREE : LOG_MAX;
    const next = Math.round(Math.min(hi, Math.max(lo, v[key] + delta)) * 100) / 100;
    if (next === v[key]) return;
    controls.set(key, next);
    onControl(key);
  });

  box.onCheck(() => check());
  function check() {
    state.revealed = true;
    draw();
    const grid = cache.grid;
    if (!grid) { pendingCheck = true; return; }   // the error curve is still being worked out: answer as soon as it is
    pendingCheck = false;
    const best = grid[bestIndex(grid)], shape = shapeOf(grid), L = lambdaText(lambdaOf(best.logLambda));
    box.reveal(shape, shape === 'u'
      ? tr(`Validation error is lowest at λ = ${L}. Below that the fit still chases the noise; above it the penalty makes the model too stiff.`,
        `Validation error paling kecil di λ = ${L}. Di bawahnya fit masih mengikuti noise; di atasnya penalti membuat model terlalu kaku.`)
      : shape === 'rises'
        ? tr('On this sample no penalty helped: the validation error was lowest at the smallest λ.', 'Pada sampel ini penalti tidak membantu: validation error paling kecil di λ terkecil.')
        : tr(`On this sample the validation error kept falling up to the largest λ (${L}).`, `Pada sampel ini validation error terus turun sampai λ terbesar (${L}).`));
  }

  function jumpToBest() {
    if (!state.revealed || !cache.grid) return;
    const best = cache.grid[bestIndex(cache.grid)].logLambda;
    controls.set('logLambda', Math.round(best * 10) / 10);
    state.maxSeen = Math.max(state.maxSeen, best);
    draw();
  }

  // ---- derived values ---------------------------------------------------------------------------------

  function compute(v) {
    const real = mode(v) === 'real';
    const pk = `${real ? 'real' : 'gen'}|${state.seed}|${real ? '' : v.noise}`;
    if (cache.pk !== pk) {
      cache.points = real ? penguinPoints(realData().rows, realData().scale, state.seed, TOTAL_POINTS) : generatedPoints(state.seed, v.noise);
      cache.pk = pk; cache.sk = '';
    }
    const sk = `${pk}|${v.degree}|${v.train}`;
    if (cache.sk !== sk) {
      const pts = cache.points;
      cache.X = designMatrix(pts, v.degree);
      cache.y = pts.map(p => p.y);
      cache.split = splitPoints(pts, v.train, state.seed);
      cache.unreg = fitAndScore(cache.X, cache.y, cache.split, 0, 'l2');
      // The curve is drawn against flipper length (or x); the bill measurements are held at their training average.
      cache.hold = real ? columnMeans(cache.split.train.map(i => pts[i])).slice(1) : [];
      cache.sk = sk;
    }
    return { real, sk };
  }

  // The error against λ for the current data, split, degree and penalty. It is worked out in small steps so the page
  // stays responsive (lasso is slow at a tiny λ), and kept so a toggle back to an earlier setting is instant.
  function ensureGrid(v, sk) {
    const key = `${sk}|${v.kind}`;
    if (cache.gridKey === key) return;
    cache.gridKey = key; cache.grid = null;
    const job = ++gridJob;   // every key change cancels the run in flight, memo hit or not
    if (gridMemo.has(key)) { cache.grid = gridMemo.get(key); return; }
    const { X, y, split } = cache, kind = v.kind, logs = lambdaGridLogs(), rows = [];
    (async () => {
      for (let i = 0; i < logs.length; i += 3) {
        rows.push(...errorsByLambda(X, y, split, kind, logs.slice(i, i + 3)));
        await tick();
        if (!alive || job !== gridJob || cache.gridKey !== key) return;
      }
      if (gridMemo.size > 30) gridMemo.delete(gridMemo.keys().next().value);
      gridMemo.set(key, rows);
      cache.grid = rows;
      draw();
      if (pendingCheck) check();
    })();
  }

  // The learning curve at the current λ, for the current data and penalty. Debounced while the slider moves.
  function ensureLearning(v, sk) {
    const key = `${sk}|${v.kind}|${Math.round(v.logLambda * 10)}`;
    if (cache.learnKey === key) return;
    cache.learnKey = key; cache.learn = null;
    clearTimeout(learnTimer);
    const job = ++learnJob;   // every key change cancels the run in flight, memo hit or not
    if (learnMemo.has(key)) { cache.learn = learnMemo.get(key); return; }
    const { X, y } = cache, kind = v.kind, log = v.logLambda;
    learnTimer = setTimeout(async () => {
      timers.delete(learnTimer);
      const reps = [];
      for (let r = 0; r < REPEATS; r++) {
        reps.push(learningRepeat(X, y, kind, log, r, { seed: state.seed }));
        await tick();
        if (!alive || job !== learnJob || cache.learnKey !== key) return;
      }
      if (learnMemo.size > 30) learnMemo.delete(learnMemo.keys().next().value);
      const curve = averageRepeats(reps);
      learnMemo.set(key, curve);
      cache.learn = curve;
      drawErrorChart(controls.values());
    }, 160);
    timers.add(learnTimer);
  }

  // ---- drawing ----------------------------------------------------------------------------------------

  // Bars for every coefficient, on one symmetric axis, with the unregularized values as dashed outlines.
  function drawCoefficients(coefs, ghost, groups, degree) {
    const { ctx, width, height } = sizeCanvas(coefChart), t = theme();
    const m = { l: 54, r: 12, t: 12, b: groups.length > 1 ? 62 : 50 };
    const w = width - m.l - m.r, h = height - m.t - m.b;
    const M = niceCeil(Math.max(...coefs.map(Math.abs), 1e-9) * 1.1);
    const Y = v => m.t + (M - v) / (2 * M) * h;
    ctx.fillStyle = t.plot; ctx.fillRect(m.l, m.t, w, h);
    ctx.font = '11px system-ui, sans-serif'; ctx.strokeStyle = t.grid; ctx.fillStyle = t.muted; ctx.lineWidth = 1; ctx.textAlign = 'right';
    ctx.beginPath();
    for (const v of [-M, -M / 2, 0, M / 2, M]) { ctx.moveTo(m.l, Y(v)); ctx.lineTo(m.l + w, Y(v)); ctx.fillText(formatTick(v), m.l - 6, Y(v) + 4); }
    ctx.stroke();
    ctx.strokeStyle = t.muted; ctx.beginPath(); ctx.moveTo(m.l, Y(0)); ctx.lineTo(m.l + w, Y(0)); ctx.stroke();
    const n = coefs.length, slot = w / n, bar = Math.max(2, Math.min(slot * 0.7, 26));
    const cx = k => m.l + (k + 0.5) * slot;
    const edge = (x, v) => { ctx.beginPath(); ctx.moveTo(x, v > 0 ? m.t + 1 : m.t + h - 1); ctx.lineTo(x - 4, v > 0 ? m.t + 8 : m.t + h - 8); ctx.lineTo(x + 4, v > 0 ? m.t + 8 : m.t + h - 8); ctx.closePath(); ctx.fill(); };
    coefs.forEach((c, k) => {
      if (ghost) {
        const g = ghost[k], top = Y(Math.max(-M, Math.min(M, g)));
        ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = t.ink; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.5;
        ctx.strokeRect(cx(k) - bar / 2 - 1.5, Math.min(Y(0), top), bar + 3, Math.abs(top - Y(0)));
        ctx.restore();
        if (Math.abs(g) > M) { ctx.save(); ctx.fillStyle = t.ink; ctx.globalAlpha = 0.55; edge(cx(k), g); ctx.restore(); }
      }
      if (c === 0) { ctx.beginPath(); ctx.arc(cx(k), Y(0), 4.2, 0, 2 * Math.PI); ctx.lineWidth = 2; ctx.strokeStyle = t.ink; ctx.stroke(); ctx.lineWidth = 1; return; }
      ctx.fillStyle = clusterColor(0);
      const y = Y(c);
      ctx.fillRect(cx(k) - bar / 2, Math.min(y, Y(0)), bar, Math.max(1, Math.abs(y - Y(0))));
    });
    // Power labels under the bars (as many as fit), group names, and the axis title.
    ctx.fillStyle = t.muted; ctx.textAlign = 'center'; ctx.font = '11px system-ui, sans-serif';
    // Narrow slots (a phone, three groups): only the first and last power of each group, so neighbouring groups never run together.
    const every = Math.max(1, Math.ceil(18 / slot)), ends = slot < 12;
    coefs.forEach((_, k) => {
      const p = k % degree + 1;
      if (ends ? (p === 1 || p === degree) : ((p - 1) % every === 0 || p === degree)) ctx.fillText(String(p), cx(k), m.t + h + 15);
    });
    if (groups.length > 1) {
      ctx.font = '600 11px system-ui, sans-serif'; ctx.fillStyle = t.ink;
      groups.forEach((name, gi) => {
        const x0 = m.l + gi * degree * slot, x1 = x0 + degree * slot;
        const room = degree * slot - 6, label = [name[0], name[1]].find(n => ctx.measureText(n).width <= room) || name[1];
        ctx.fillText(fitText(ctx, label, room), (x0 + x1) / 2, m.t + h + 30);
        if (gi) { ctx.strokeStyle = t.grid; ctx.beginPath(); ctx.moveTo(x0, m.t); ctx.lineTo(x0, m.t + h + 34); ctx.stroke(); }
      });
    }
    ctx.fillStyle = t.muted; ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(groups.length > 1 ? tr('Power k of each measurement', 'Pangkat k dari tiap pengukuran') : tr('Power k of x', 'Pangkat k dari x'), m.l + w / 2, height - 6);
    ctx.save(); ctx.translate(13, m.t + h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(tr('Coefficient (standardized)', 'Koefisien (terstandar)'), 0, 0); ctx.restore();
  }

  // Two error lines (training always, validation maybe only part of the way) on drawLineChart, with errors above
  // the cap clamped and marked by triangles so a blown-up fit does not read as a real plateau.
  function drawErrorLines(canvas, { xs, train, valXs, valVals, cap, xMin, xMax, xLabel, markerX, markerLabel, here, best, dots = false }) {
    const lines = [
      { xs, vals: train, color: clusterColor(0) },
      { xs: valXs, vals: valVals, color: clusterColor(1) },
    ].map(l => ({ ...l, ...chartRuns(l.xs, l.vals, cap) }));
    const series = lines.flatMap(l => l.runs.map(r => ({ xs: r.xs, ys: r.ys, color: l.color, points: false, dash: r.clipped })));
    const { X, Y } = drawLineChart(canvas, { series, xLabel, yLabel: tr('Mean squared error', 'Mean squared error'), xMin, xMax, yMin: 0, yMax: cap * 1.15, markerX });
    const ctx = canvas.getContext('2d'), t = theme(), { width } = canvas.getBoundingClientRect();
    ctx.save();
    const mark = (px, py, color, clipped, ring) => {
      ctx.fillStyle = color; ctx.beginPath();
      if (clipped) { ctx.moveTo(px, py - 6); ctx.lineTo(px - 5.5, py + 3.5); ctx.lineTo(px + 5.5, py + 3.5); ctx.closePath(); } else ctx.arc(px, py, ring ? 4.4 : 3.2, 0, 2 * Math.PI);
      ctx.fill();
      if (ring && !clipped) { ctx.lineWidth = 2; ctx.strokeStyle = t.ink; ctx.stroke(); }
    };
    for (const l of lines) l.points.forEach(p => { if (p.clipped || dots) mark(X(p.x), Y(p.y), l.color, p.clipped, false); });
    // The learner's own setting: a dot on each line at the marker, with the exact error there.
    if (here) for (const [vals, color] of [[here.train, clusterColor(0)], [here.validation, clusterColor(1)]]) {
      if (vals != null) mark(X(markerX), Y(Math.min(vals, cap)), color, !(vals <= cap), true);
    }
    ctx.fillStyle = t.ink; ctx.font = '600 12px system-ui, sans-serif';
    if (markerLabel) {
      const near = X(markerX) < 90 ? 'left' : X(markerX) > width - 90 ? 'right' : 'center';
      ctx.textAlign = near; ctx.fillText(markerLabel, X(markerX) + (near === 'left' ? 5 : near === 'right' ? -5 : 0), 26);
    }
    if (best) {
      const bx = X(best.x), by = Y(Math.min(best.y, cap));
      ctx.beginPath(); ctx.arc(bx, by, 8, 0, 2 * Math.PI); ctx.lineWidth = 2.5; ctx.strokeStyle = t.ink; ctx.stroke();
      const right = bx > width - 130;
      ctx.textAlign = right ? 'right' : 'left'; ctx.fillText(best.label, bx + (right ? -12 : 12), by - 14);
    }
    ctx.restore();
  }

  function emptyChart(canvas, text, xLabel, xMin, xMax) {
    drawLineChart(canvas, { series: [], xLabel, yLabel: tr('Mean squared error', 'Mean squared error'), xMin, xMax, yMin: 0, yMax: 1 });
    const ctx = canvas.getContext('2d'), t = theme(), { width, height } = canvas.getBoundingClientRect();
    ctx.save(); ctx.fillStyle = t.muted; ctx.font = '600 13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, width / 2, height / 2); ctx.restore();
  }

  function drawErrorChart(v) {
    const learning = v.learning;
    errTitle.textContent = learning
      ? tr('Training and validation error against training size', 'Training error dan validation error terhadap jumlah titik training')
      : tr('Training and validation error against λ', 'Training error dan validation error terhadap λ');
    errHint.textContent = learning
      ? tr(`Average of ${REPEATS} random splits at your λ, always checked on ${VAL_POINTS} held-out points. The dashed line is your number of training points. A triangle at the top means the error is higher than the chart shows.`,
        `Rata-rata dari ${REPEATS} pembagian acak pada λ-mu, selalu diuji pada ${VAL_POINTS} titik yang disisihkan. Garis putus-putus adalah jumlah titik trainingmu. Segitiga di bagian atas berarti error-nya lebih tinggi daripada yang tampak di grafik.`)
      : tr('Mean squared error: lower is better. The dashed line is your λ. The validation line fills in as you raise λ; Check my prediction shows all of it and rings the best λ. A triangle at the top means the error is higher than the chart shows.',
        'Mean squared error: semakin kecil semakin baik. Garis putus-putus adalah λ-mu. Garis validation terisi saat kamu menaikkan λ; Cek prediksiku menampilkan seluruhnya dan melingkari λ terbaik. Segitiga di bagian atas berarti error-nya lebih tinggi daripada yang tampak di grafik.');
    errChart.setAttribute('aria-label', errTitle.textContent);
    fillLegend(errLegend, [{ kind: 'dot', color: clusterColor(0), label: tr('Training error', 'Training error') }, { kind: 'dot', color: clusterColor(1), label: tr('Validation error', 'Validation error') }]);
    const now = cache.now;
    if (learning) {
      const xLabel = tr('Training points', 'Titik training'), curve = cache.learn;
      if (!curve) { emptyChart(errChart, tr('Working it out…', 'Sedang menghitung…'), xLabel, LEARNING_SIZES[0], POOL_POINTS); lab.describe(errChart, tr('The learning curve is being worked out.', 'Learning curve sedang dihitung.')); return; }
      const last = curve[curve.length - 1], cap = 2.5 * Math.max(last.validation, last.train, 0.05);
      drawErrorLines(errChart, {
        xs: curve.map(r => r.size), train: curve.map(r => r.train), valXs: curve.map(r => r.size), valVals: curve.map(r => r.validation), cap,
        xMin: LEARNING_SIZES[0], xMax: POOL_POINTS, xLabel, markerX: Math.max(LEARNING_SIZES[0], v.train), markerLabel: tr('yours', 'milikmu'), here: null, best: null, dots: true,
      });
      lab.describe(errChart, tr(`With ${curve[0].size} training points the validation error is ${errorText(curve[0].validation)}; with ${last.size} it is ${errorText(last.validation)}, and the training error is ${errorText(last.train)}.`,
        `Dengan ${curve[0].size} titik training, validation error-nya ${errorText(curve[0].validation)}; dengan ${last.size} titik menjadi ${errorText(last.validation)}, dan training error-nya ${errorText(last.train)}.`));
      return;
    }
    const xLabel = tr('log10 of λ (penalty strength)', 'log10 λ (kekuatan penalti)'), grid = cache.grid;
    if (!grid) { emptyChart(errChart, tr('Working it out…', 'Sedang menghitung…'), xLabel, LOG_MIN, LOG_MAX); lab.describe(errChart, tr('The error curve is being worked out.', 'Kurva error sedang dihitung.')); return; }
    const shown = state.revealed ? grid : grid.filter(r => r.logLambda <= state.maxSeen + 1e-9);
    const last = grid[grid.length - 1], cap = 1.1 * Math.max(last.train, last.validation, 0.05), bi = bestIndex(grid);
    drawErrorLines(errChart, {
      xs: grid.map(r => r.logLambda), train: grid.map(r => r.train), valXs: shown.map(r => r.logLambda), valVals: shown.map(r => r.validation), cap,
      xMin: LOG_MIN, xMax: LOG_MAX, xLabel, markerX: v.logLambda, markerLabel: tr('your λ', 'λ-mu'), here: now,
      best: state.revealed ? { x: grid[bi].logLambda, y: grid[bi].validation, label: tr(`best λ: ${lambdaText(lambdaOf(grid[bi].logLambda))}`, `λ terbaik: ${lambdaText(lambdaOf(grid[bi].logLambda))}`) } : null,
    });
    const hereText = tr(`At your λ of ${lambdaText(lambdaOf(v.logLambda))} the training error is ${errorText(now.train)} and the validation error is ${errorText(now.validation)}.`,
      `Pada λ-mu sebesar ${lambdaText(lambdaOf(v.logLambda))}, training error-nya ${errorText(now.train)} dan validation error-nya ${errorText(now.validation)}.`);
    lab.describe(errChart, state.revealed
      ? `${hereText} ${tr(`The lowest validation error is at λ = ${lambdaText(lambdaOf(grid[bi].logLambda))}.`, `Validation error paling kecil ada di λ = ${lambdaText(lambdaOf(grid[bi].logLambda))}.`)}`
      : hereText);
  }

  function draw() {
    const v = controls.values(), { real, sk } = compute(v);
    controls.disable('noise', real);
    controls.disable('jump', !state.revealed || !cache.grid);
    lab.canvas.setAttribute('aria-label', canvasLabelFor(real));
    const { points, X, y, split, unreg, hold } = cache;
    const lambda = lambdaOf(v.logLambda);
    const now = fitAndScore(X, y, split, lambda, v.kind);
    cache.now = now;
    ensureGrid(v, sk);
    if (v.learning) ensureLearning(v, sk);

    // The main plot: data, the true curve (generated only), the unregularized fit faintly, and the fitted curve.
    plot.setLabels(
      real ? tr('Flipper length (scaled 0–10)', 'Panjang flipper (skala 0–10)') : 'x',
      real ? tr('Body mass (scaled 0–10)', 'Massa tubuh (skala 0–10)') : 'y');
    const g = plot.begin();
    plot.clip(() => {
      const { ctx } = plot;
      if (!real) {
        ctx.save(); ctx.globalAlpha = 0.55;
        plot.polyline(Array.from({ length: 101 }, (_, i) => ({ x: i / 10, y: truth(i / 10) })), { color: g.t.muted, width: 2, dash: [5, 5] });
        ctx.restore();
      }
      if (v.showUnreg) { ctx.save(); ctx.globalAlpha = 0.4; plot.polyline(curvePoints(unreg.fit.predict, v.degree, hold), { color: g.t.ink, width: 2.5 }); ctx.restore(); }
      plot.polyline(curvePoints(now.fit.predict, v.degree, hold), { color: FIT_COLOR(), width: 3 });
    });
    split.train.forEach(i => plot.dot(points[i].cols[0], points[i].y, clusterColor(0), 5));
    split.validation.forEach(i => plot.cross(points[i].cols[0], points[i].y, clusterColor(1), 4.5));
    lab.setLegend([
      { kind: 'dot', color: clusterColor(0), label: tr('Training', 'Training') },
      { kind: 'cross', color: clusterColor(1), label: tr('Validation', 'Validasi') },
      ...(real ? [] : [{ kind: 'dash', color: g.t.muted, label: tr('True curve', 'Kurva asli') }]),
      { kind: 'line', color: FIT_COLOR(), label: tr('Fitted curve', 'Kurva hasil fit') },
      ...(v.showUnreg ? [{ kind: 'line', color: g.t.ink, label: tr('Unregularized (λ = 0)', 'Tanpa regularisasi (λ = 0)') }] : []),
    ]);

    // Words: status (live region) and detail.
    const zeros = now.fit.zeros, count = now.fit.coef.length, largest = Math.max(...now.fit.coef.map(Math.abs));
    const grid = cache.grid, bi = grid ? bestIndex(grid) : -1;
    let place = '';
    if (state.revealed && grid) {
      const d = v.logLambda - grid[bi].logLambda;
      place = Math.abs(d) <= 0.35 ? tr(' Near the best λ.', ' Dekat λ terbaik.')
        : d < 0 ? tr(' Below the best λ: still too flexible.', ' Di bawah λ terbaik: masih terlalu fleksibel.')
          : tr(' Above the best λ: too stiff.', ' Di atas λ terbaik: terlalu kaku.');
    }
    lab.setStatus(tr(`${kindName(v.kind)}, λ = ${lambdaText(lambda)}: training error ${errorText(now.train)}, validation error ${errorText(now.validation)}.${place}`,
      `${kindName(v.kind)}, λ = ${lambdaText(lambda)}: training error ${errorText(now.train)}, validation error ${errorText(now.validation)}.${place}`));
    const counts = tr(`${split.train.length} training and ${split.validation.length} validation points.`, `Ada ${split.train.length} titik training dan ${split.validation.length} titik validasi.`);
    const coefs = tr(`Largest coefficient ${sizeText(largest)}. Exactly 0: ${zeros} of ${count}.`, `Koefisien terbesar ${sizeText(largest)}. Tepat 0: ${zeros} dari ${count}.`);
    let lowest;
    if (state.revealed) {
      lowest = grid ? tr(`Lowest validation error is at λ = ${lambdaText(lambdaOf(grid[bi].logLambda))} (${errorText(grid[bi].validation)}).`, `Validation error paling kecil ada di λ = ${lambdaText(lambdaOf(grid[bi].logLambda))} (${errorText(grid[bi].validation)}).`)
        : tr('Working out the error curve…', 'Menghitung kurva error…');
    } else lowest = tr('Lowest validation error: hidden until you check your prediction.', 'Validation error terkecil: disembunyikan sampai prediksimu dicek.');
    let detail = `${lowest} ${coefs} ${counts}`;
    if (real) {
      const miss = gramsText(typicalMissGrams(now.validation, realData().scale));
      detail += ' ' + tr(`At this λ a validation penguin is typically about ${miss} off.`, `Pada λ ini, tebakan massa untuk penguin validasi rata-rata meleset sekitar ${miss}.`);
    }
    lab.setDetail(detail);

    if (real) {
      const r = realData();
      dataNote.textContent = tr(
        `Real data: Palmer penguins. ${r.dropped} of ${r.total} rows have a missing value (NA) and were left out, which leaves ${r.rows.length} penguins. The lab draws ${TOTAL_POINTS} of them at random. Body mass is explained by flipper length, bill length and bill depth, each with polynomial features up to the chosen degree (3 × degree features). Every measurement is rescaled to 0–10, so errors are in plot units, not grams. The curve shows body mass against flipper length with both bill measurements held at their training average. Noise only applies to generated data.`,
        `Data nyata: penguin Palmer. ${r.dropped} dari ${r.total} baris punya missing value (NA) dan dibuang, sehingga tersisa ${r.rows.length} penguin. Lab mengambil ${TOTAL_POINTS} di antaranya secara acak. Massa tubuh dijelaskan oleh panjang flipper, panjang paruh, dan kedalaman paruh, masing-masing dengan fitur polinomial sampai derajat yang dipilih (3 × derajat fitur). Setiap pengukuran diskalakan ke 0–10, jadi error dinyatakan dalam satuan plot, bukan gram. Kurva menunjukkan massa tubuh terhadap panjang flipper dengan kedua ukuran paruh ditahan pada rata-rata data training. Noise hanya berlaku untuk data buatan.`);
    } else if (v.data === 'penguins') {
      dataNote.textContent = tr('Loading the penguin data…', 'Memuat data penguin…');
    } else {
      const base = tr(`Generated data: ${TOTAL_POINTS} points around a smooth curve (the dashed line), with the noise you choose.`, `Data buatan: ${TOTAL_POINTS} titik di sekitar kurva mulus (garis putus-putus), dengan noise sesuai pilihanmu.`);
      dataNote.textContent = state.failed
        ? tr('The penguin data could not be loaded, so the generated data is shown. Choose Penguins (real data) again to retry.', 'Data penguin tidak dapat dimuat, jadi data buatan yang ditampilkan. Pilih Penguin (data nyata) lagi untuk mencoba ulang.')
        : base;
    }

    // Coefficient chart.
    const groups = real ? [[tr('Flipper length', 'Panjang flipper'), tr('Flipper', 'Flipper')], [tr('Bill length', 'Panjang paruh'), tr('Bill len.', 'Pjg paruh')], [tr('Bill depth', 'Kedalaman paruh'), tr('Bill dep.', 'Dlm paruh')]] : [];
    fillLegend(coefLegend, [
      { kind: 'dot', color: clusterColor(0), label: tr('Coefficient', 'Koefisien') },
      { kind: 'ring', color: g.t.ink, label: tr('Exactly 0', 'Tepat 0') },
      ...(v.showUnreg ? [{ kind: 'dash', color: g.t.ink, label: tr('Unregularized', 'Tanpa regularisasi') }] : []),
    ]);
    drawCoefficients(now.fit.coef, v.showUnreg ? unreg.fit.coef : null, groups, v.degree);
    lab.describe(coefChart, tr(`${count} coefficients at λ = ${lambdaText(lambda)}; the largest is ${sizeText(largest)} and ${zeros} are exactly 0. Unregularized, the largest is ${sizeText(Math.max(...unreg.fit.coef.map(Math.abs)))}.`,
      `${count} koefisien pada λ = ${lambdaText(lambda)}; yang terbesar ${sizeText(largest)} dan ${zeros} tepat 0. Tanpa regularisasi, yang terbesar ${sizeText(Math.max(...unreg.fit.coef.map(Math.abs)))}.`));
    drawErrorChart(v);
  }

  lab.onReset(() => {
    state.seed = DEFAULTS.seed;
    state.failed = false;
    controls.set('data', 'generated');
    controls.set('kind', 'l2');
    for (const name of ['logLambda', 'degree', 'noise', 'train']) controls.set(name, DEFAULTS[name]);
    controls.set('showUnreg', true);
    controls.set('learning', false);
    newRound();
    draw();
  });
  lab.onTheme(draw);
  lab.onResize(draw);
  draw();
  return lab.destroy;
}
