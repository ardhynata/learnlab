// Forecast lab, built on the kit. A generated time series (a season, a trend, noise and an optional regime shift)
// is forecast by three models (naive, seasonal naive, a learned lag model) at several forecast origins, one
// backtest window after another. The big plot draws the series with the windows shaded and, for the window you
// pick, each model's forecast and a prediction-interval band; the charts beside it show the error of every model
// in every window (so the winner can be seen changing), the error by horizon, and the coverage of the interval at
// each horizon. The series is ALWAYS generated: no real time series is bundled with the course, so there is no
// real-data mode (and so no missing-value handling either). The math is in sims/ml/forecastlab.js on top of
// sims/ml/forecast.js; this file draws and wires.
import { createLab, drawLineChart, predictBox, clusterColor, theme, tr, fmt, pct } from '../kit/index.js';
import {
  STEPS, TRAIN_MIN, MODELS, LIMITS, DEFAULTS, normalize, shiftActive, buildSeries, planBacktest, runModel,
  calibrationWindows, intervalsFor, summarize, horizonErrors, winners, shiftVerdict, shiftPartition,
} from '../ml/forecastlab.js';

export { DEFAULTS };

const SETTLE_MS = 150;                    // wait for a slider to rest before the models are fitted again
const QUIZ_MS = 350;
const CONTEXT = 40;                       // steps of history drawn before the first backtest window
const SHOW = { naive: 'showNaive', seasonal: 'showSeasonal', learned: 'showLearned' };
// Controls that only change what is drawn: the fitted windows are kept (the intervals are cut again, which is cheap).
const DISPLAY_ONLY = new Set(['showNaive', 'showSeasonal', 'showLearned', 'windowShown', 'measure', 'coverage']);

// Names, colors and line styles; built when drawn so the text follows the language.
const modelInfo = {
  naive: { name: () => tr('Naive (last value)', 'Naive (nilai terakhir)'), color: () => clusterColor(3), dash: [2, 4], glyph: 'dash' },
  seasonal: { name: () => tr('Seasonal naive', 'Seasonal naive'), color: () => clusterColor(2), dash: [8, 5], glyph: 'dash' },
  learned: { name: () => tr('Learned lag model', 'Model lag terlatih'), color: () => clusterColor(0), dash: null, glyph: 'line' },
};
const shortName = { naive: () => tr('Naive', 'Naive'), seasonal: () => tr('Seasonal', 'Seasonal'), learned: () => tr('Learned', 'Terlatih') };
const measureName = m => ({ mase: 'MASE', mae: 'MAE', rmse: 'RMSE' }[m]);
const num2 = v => (Number.isFinite(v) ? fmt(v, { digits: 2 }) : '∞');
const pc = v => (Number.isFinite(v) ? pct(v, 0) : '–');
const signed = (v, digits = 1) => `${v < 0 ? '−' : v > 0 ? '+' : ''}${fmt(Math.abs(v), { digits })}`;

// ---- pure layout helpers (exported for the tests) -------------------------------------------------------------------

// Where things go on the main canvas: the series chart on top, one row per backtest window under it (the lane),
// both sharing the time axis. Index t of the series occupies the slot [t, t + 1) of the axis, which starts at `from`.
// `from` is the first time step on the axis (the plot zooms to the backtest region plus some history before it).
export function mainLayout(width, height, count, from = 0) {
  const m = { l: 50, r: 14, t: 12, b: 38 };
  // On a phone the rows are taller (easier to tap, room for their numbers) and the lane takes a bigger share of the canvas.
  const phone = width < 420;
  const rowH = Math.max(5, Math.min(phone ? 16 : 12, Math.floor(height * (phone ? 0.32 : 0.26) / Math.max(1, count))));
  const laneH = count * rowH + 8;
  const topH = Math.max(80, height - m.t - m.b - laneH - 22);
  const x0 = m.l, x1 = Math.max(m.l + 40, width - m.r), span = STEPS - from;
  return {
    m, rowH, laneH, x0, x1, from,
    top: { y0: m.t, y1: m.t + topH },
    lane: { y0: m.t + topH + 22, y1: m.t + topH + 22 + laneH },
    X: t => x0 + (t - from + 0.5) / span * (x1 - x0),
    edge: t => x0 + (t - from) / span * (x1 - x0),
    time: px => from + Math.floor((px - x0) / (x1 - x0) * span),
  };
}

// The window a click at (px, py) means: the row under the pointer in the lane, else the window whose forecast span holds
// that time (the nearest centre when several do, or when none does). -1 outside the time axis.
export function windowAtPoint(layout, windows, px, py) {
  if (!windows.length || px < layout.x0 - 4 || px > layout.x1 + 4) return -1;
  if (py >= layout.lane.y0 && py <= layout.lane.y1) {
    return Math.max(0, Math.min(windows.length - 1, Math.floor((py - layout.lane.y0 - 4) / layout.rowH)));
  }
  const t = layout.time(px), centre = w => (w.testStart + w.testEnd) / 2;
  const holding = windows.map((w, i) => i).filter(i => windows[i].testStart <= t && t <= windows[i].testEnd);
  const pool = holding.length ? holding : windows.map((w, i) => i);
  return pool.reduce((best, i) => (Math.abs(centre(windows[i]) - t) < Math.abs(centre(windows[best]) - t) ? i : best), pool[0]);
}

// A round upper limit for a chart axis.
export function niceMax(v) {
  if (!(v > 0) || !Number.isFinite(v)) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map(f => f * mag).find(s => s >= v) ?? v;
}

function niceTicks(lo, hi, count = 5) {
  const span = hi - lo || 1, raw = span / count, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(f => f * mag).find(s => s >= raw) ?? raw;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(Number(v.toPrecision(12)));
  return out;
}

function prepare(canvas) {
  const ctx = canvas.getContext('2d'), { width, height } = canvas.getBoundingClientRect(), ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width, height };
}

// ---- the lab ----------------------------------------------------------------------------------------------------------

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Forecasting and backtesting', 'Forecasting dan backtesting'),
    hint: tr(
      'Three models forecast a generated series from the same history, window after window. Pick a window to see its forecasts and interval.',
      'Tiga model meramalkan seri buatan dari riwayat yang sama, window demi window. Pilih sebuah window untuk melihat forecast dan intervalnya.'),
    status: true, legend: true,
    canvasLabel: tr(
      'Line chart of the generated time series with the forecast windows shaded, the forecasts of each model for the window shown and an interval band, above a row per backtest window. Click a window or press the left and right arrow keys to change the window shown. The picture is described below the plot.',
      'Grafik garis time series buatan dengan window forecast yang diarsir, forecast tiap model untuk window yang ditampilkan, dan band interval, di atas satu baris per window backtest. Klik sebuah window atau tekan tombol panah kiri dan kanan untuk mengganti window yang ditampilkan. Gambar dijelaskan di bawah plot.'),
    extra: {
      title: tr('Mean and worst-window error', 'Galat rata-rata dan window terburuk'),
    },
  });
  const legendHost = lab.ref('legend');
  if (legendHost) legendHost.style.maxHeight = 'none';

  let W = DEFAULTS.windows;            // windows now, for the "k of W" readout
  let state = null, failure = '';
  let timer = 0, quizTimer = 0, destroyed = false;
  let layout = null;
  const cache = new Map();

  const controls = lab.panel([
    { type: 'note', text: tr('Series', 'Seri') },
    { name: 'period', type: 'range', label: tr('Season length (steps)', 'Panjang musim (langkah)'), min: LIMITS.period[0], max: LIMITS.period[1], step: 1, value: DEFAULTS.period },
    { name: 'trend', type: 'range', label: tr('Trend per step', 'Tren per langkah'), min: LIMITS.trend[0], max: LIMITS.trend[1], step: 0.01, value: DEFAULTS.trend, format: v => signed(v, 2) },
    { name: 'seasonAmp', type: 'range', label: tr('Seasonal amplitude', 'Amplitudo musiman'), min: LIMITS.seasonAmp[0], max: LIMITS.seasonAmp[1], step: 0.5, value: DEFAULTS.seasonAmp, format: v => fmt(v, { digits: 1 }) },
    { name: 'noise', type: 'range', label: tr('Noise', 'Noise'), min: LIMITS.noise[0], max: LIMITS.noise[1], step: 0.1, value: DEFAULTS.noise, format: v => fmt(v, { digits: 1 }) },
    { name: 'seed', type: 'number', label: tr('Seed', 'Seed'), min: LIMITS.seed[0], max: LIMITS.seed[1], step: 1, value: DEFAULTS.seed },
    { name: 'newSeries', type: 'button', label: tr('New series', 'Seri baru'), onClick: () => { controls.set('seed', Number(controls.get('seed')) % LIMITS.seed[1] + 1); update('seed'); } },
    { type: 'note', text: tr('The series is always generated, so every part of it is known. No real time series is bundled with this course, so there is no real-data mode here.', 'Seri ini selalu dibuat oleh lab, jadi setiap bagiannya diketahui. Kursus ini tidak menyertakan time series nyata, jadi di sini tidak ada mode data nyata.') },
    { type: 'note', text: tr('Regime shift', 'Regime shift') },
    { name: 'shiftAt', type: 'range', label: tr('Regime shift at (time step)', 'Regime shift pada (langkah waktu)'), min: LIMITS.shiftAt[0], max: LIMITS.shiftAt[1], step: 1, value: DEFAULTS.shiftAt },
    { name: 'shiftSize', type: 'range', label: tr('Regime shift size (0 = none)', 'Besar regime shift (0 = tidak ada)'), min: LIMITS.shiftSize[0], max: LIMITS.shiftSize[1], step: 0.5, value: DEFAULTS.shiftSize, format: v => signed(v, 1) },
    { name: 'shiftPhase', type: 'toggle', label: tr('The season also moves at the shift (half a period)', 'Musim ikut bergeser saat shift (setengah periode)'), value: DEFAULTS.shiftPhase },
    { type: 'note', text: tr('Models', 'Model') },
    { name: 'showNaive', type: 'toggle', label: tr('Naive (last value)', 'Naive (nilai terakhir)'), value: DEFAULTS.showNaive },
    { name: 'showSeasonal', type: 'toggle', label: tr('Seasonal naive', 'Seasonal naive'), value: DEFAULTS.showSeasonal },
    { name: 'showLearned', type: 'toggle', label: tr('Learned lag model', 'Model lag terlatih'), value: DEFAULTS.showLearned },
    { name: 'lags', type: 'range', label: tr('Lags used by the learned model', 'Lag yang dipakai model terlatih'), min: LIMITS.lags[0], max: LIMITS.lags[1], step: 1, value: DEFAULTS.lags },
    { name: 'seasonalIndicators', type: 'toggle', label: tr('Learned model knows the position in the season', 'Model terlatih tahu posisi dalam musim'), value: DEFAULTS.seasonalIndicators },
    { type: 'note', text: tr('Backtest', 'Backtest') },
    { name: 'horizon', type: 'range', label: tr('Forecast horizon (steps)', 'Forecast horizon (langkah)'), min: LIMITS.horizon[0], max: LIMITS.horizon[1], step: 1, value: DEFAULTS.horizon },
    { name: 'style', type: 'select', label: tr('Backtest style', 'Gaya backtest'), options: [['expanding', tr('Expanding: train on everything so far', 'Expanding: latih pada semua data sejauh ini')], ['sliding', tr(`Sliding: train on the last ${TRAIN_MIN} steps`, `Sliding: latih pada ${TRAIN_MIN} langkah terakhir`)]], value: DEFAULTS.style },
    { name: 'windows', type: 'range', label: tr('Number of windows', 'Jumlah window'), min: LIMITS.windows[0], max: LIMITS.windows[1], step: 1, value: DEFAULTS.windows },
    { name: 'windowShown', type: 'range', label: tr('Window shown', 'Window yang ditampilkan'), min: 1, max: DEFAULTS.windows, step: 1, value: DEFAULTS.windowShown, format: v => tr(`${fmt(v)} of ${fmt(W)}`, `${fmt(v)} dari ${fmt(W)}`) },
    { name: 'prevWindow', type: 'button', label: tr('Previous window', 'Window sebelumnya'), onClick: () => pick((state?.p.windowShown ?? 1) - 2 < 0 ? -1 : (state?.p.windowShown ?? 1) - 2) },
    { name: 'nextWindow', type: 'button', label: tr('Next window', 'Window berikutnya'), onClick: () => pick(state && state.p.windowShown < state.p.windows ? state.p.windowShown : -1) },
    { type: 'note', text: tr('Errors and intervals', 'Galat dan interval') },
    { name: 'measure', type: 'select', label: tr('Error measure', 'Ukuran galat'), options: [['mase', 'MASE'], ['mae', 'MAE'], ['rmse', 'RMSE']], value: DEFAULTS.measure },
    { name: 'coverage', type: 'range', label: tr('Interval coverage target', 'Target coverage interval'), min: LIMITS.coverage[0], max: LIMITS.coverage[1], step: 5, value: DEFAULTS.coverage, format: v => pct(v / 100, 0) },
    { name: 'intervalModel', type: 'select', label: tr('Interval for', 'Interval untuk'), options: MODELS.map(m => [m, modelInfo[m].name()]), value: DEFAULTS.intervalModel },
  ], name => update(name));
  // The controls sit in four folded groups (one open at a time), so the Parameters box stays short enough for the Quick Quiz
  // button under it to stay on screen.
  const groupNames = [tr('Series', 'Seri'), tr('Regime shift', 'Regime shift'), tr('Models', 'Model'), tr('Backtest', 'Backtest'), tr('Errors and intervals', 'Galat dan interval')];
  const groups = [];
  let open = null;
  for (const node of [...controls.el.children]) {
    if (node.matches('p.hint') && groupNames.includes(node.textContent)) {
      open = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = node.textContent;
      open.append(summary);
      node.replaceWith(open);
      groups.push(open);
    } else if (open) open.append(node);
  }
  groups[1].open = true;      // the regime shift: what the Quick Quiz is about
  for (const g of groups) lab.on(g, 'toggle', () => { if (g.open) for (const o of groups) if (o !== g) o.open = false; });
  const groupStyle = document.createElement('style');
  groupStyle.textContent = '.panel details { border-top: 1px solid var(--line); margin-top: 10px; padding-top: 4px; } .panel summary { cursor: pointer; font-weight: 700; font-size: 13px; padding: 6px 0; } .panel details > div.slider-label, .panel details > label { margin-top: 8px; }';
  controls.el.prepend(groupStyle);
  // Typing a seed outside the range (or clearing the box) is corrected once the box is left, so the box always shows the
  // seed the series really uses.
  const seedInput = controls.el.querySelector('input[type=number]');
  if (seedInput) lab.on(seedInput, 'change', () => { controls.set('seed', normalize(controls.values()).seed); update('seed'); });
  const ranges = [...controls.el.querySelectorAll('input[type=range]')];
  const shownSlider = ranges[ranges.length - 2];     // "Window shown": the second-to-last slider (the last is the coverage target)
  const intervalNote = document.createElement('p');
  intervalNote.className = 'hint';
  controls.el.querySelector('input[type=range][min="50"]').closest('.slider-label').after(intervalNote);
  const measureNote = document.createElement('p');
  measureNote.className = 'hint';
  controls.el.querySelector('select option[value=mase]').closest('label').after(measureNote);

  const box = predictBox(lab.ref('below'), {
    hint: tr('Set a regime shift (a size other than 0) so that some windows come before it and some after it, then check again.', 'Atur regime shift (besar bukan 0) sehingga ada window sebelum dan sesudahnya, lalu periksa lagi.'),
    name: 'predict-shift',
    question: tr('After a regime shift, which model will lose the most accuracy: seasonal naive or the learned lag model?', 'Setelah terjadi regime shift, model mana yang paling banyak kehilangan akurasi: seasonal naive atau model lag terlatih?'),
    choices: [
      ['seasonal', tr('Seasonal naive', 'Seasonal naive')],
      ['learned', tr('The learned lag model', 'Model lag terlatih')],
      ['same', tr('About the same', 'Hampir sama')],
    ],
  });
  lab.cleanup(() => box.destroy());
  box.onPick(revealPrediction); box.onCheck(revealPrediction);

  const windowChart = lab.chartCard(tr('Error in each window', 'Galat di setiap window'), '', 220);
  const horizonChart = lab.chartCard(tr('Error by horizon', 'Galat menurut horizon'), '', 220);
  const coverageChart = lab.chartCard(tr('Interval coverage by horizon', 'Coverage interval menurut horizon'), '', 220);

  // A legend drawn on the canvas itself (a row of swatches), so the charts need no extra box height.
  // `variants` lists the same legend from the longest wording to the shortest; the first that fits in `maxW` is drawn
  // (the shortest when none does), so no label is ever cut off at the canvas edge.
  function legendWidth(ctx, items) {
    ctx.save(); ctx.font = '600 11px system-ui, sans-serif';
    let w = 0;
    for (const it of items) w += (it.kind === 'tri' ? 12 : 14) + (it.label ? ctx.measureText(it.label).width + 14 : 0);
    ctx.restore();
    return w - 14;
  }
  function inlineLegend(ctx, variants, x, y, maxW) {
    const items = (Array.isArray(variants[0]) ? variants.find(v => legendWidth(ctx, v) <= maxW) ?? variants[variants.length - 1] : variants);
    ctx.save(); ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'left';
    for (const it of items) {
      if (it.kind === 'tri') {
        ctx.fillStyle = it.color; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 8, y - 8); ctx.lineTo(x + 4, y - 2); ctx.closePath(); ctx.fill(); x += 12;
      } else {
        ctx.fillStyle = it.color; ctx.fillRect(x, y - 9, 10, 9); x += 14;
      }
      if (it.label) { ctx.fillStyle = theme().muted; ctx.fillText(it.label, x, y); x += ctx.measureText(it.label).width + 14; } else x += 4;
    }
    ctx.restore();
  }

  // ---- computing ---------------------------------------------------------------------------------------------------

  function memo(key, make) {
    if (cache.has(key)) return cache.get(key);
    const value = make();
    cache.set(key, value);
    if (cache.size > 60) cache.delete(cache.keys().next().value);
    return value;
  }

  function syncShownSlider() {
    W = Math.round(Number(controls.get('windows')));
    if (Number(shownSlider.max) !== W) shownSlider.max = String(W);
    controls.set('windowShown', Math.min(Number(controls.get('windowShown')), W));
  }

  function compute() {
    clearTimeout(timer); timer = 0;
    syncShownSlider();
    const p = normalize(controls.values());
    try {
      const sKey = JSON.stringify([p.period, p.trend, p.seasonAmp, p.noise, p.seed, shiftActive(p) ? p.shiftAt : null, p.shiftSize, p.shiftPhase]);
      const series = memo(`s|${sKey}`, () => buildSeries(p));
      const plan = planBacktest(p);
      const runKey = name => `r|${sKey}|${p.horizon}|${p.windows}|${p.style}|${name}${name === 'learned' ? `|${p.lags}|${p.seasonalIndicators}` : ''}`;
      const wins = Object.fromEntries(MODELS.map(m => [m, memo(runKey(m), () => runModel(series.y, m, p, plan))]));
      const cal = memo(`c|${runKey(p.intervalModel)}`, () => calibrationWindows(series.y, p.intervalModel, p, plan));
      const interval = intervalsFor(wins[p.intervalModel], cal, p.coverage);
      state = { p, series, plan, wins, interval, verdict: shiftActive(p) ? shiftVerdict(wins, p.shiftAt) : null };
      failure = '';
    } catch (e) {
      state = null; failure = String(e.message ?? e);
    }
    draw();
    settleQuiz();
  }

  // A slider that refits the models waits until it rests; a display-only control draws at once.
  function update(name) {
    if (DISPLAY_ONLY.has(name)) { compute(); return; }
    clearTimeout(timer);
    timer = setTimeout(compute, SETTLE_MS);
    if (name === 'windows') syncShownSlider();
  }

  // ---- Quick Quiz ----------------------------------------------------------------------------------------------------

  function revealPrediction() {
    if (!state?.verdict || box.chosen() == null) return;
    const v = state.verdict, { before: b, after: a, ratio: r, increase: inc } = v;
    const times = x => fmt(x, { digits: 1 });
    const numbers = tr(
      `Mean MASE before the shift, then after it (${v.nBefore} windows before, ${v.nAfter} after; a window counts as after once its forecast reaches the shift): seasonal naive ${num2(b.seasonal)} to ${num2(a.seasonal)} (${times(r.seasonal)} times, ${signed(inc.seasonal, 2)}); learned lag model ${num2(b.learned)} to ${num2(a.learned)} (${times(r.learned)} times, ${signed(inc.learned, 2)}).`,
      `Rata-rata MASE sebelum shift, lalu sesudahnya (${v.nBefore} window sebelum, ${v.nAfter} sesudah; sebuah window dihitung sesudah bila forecast-nya mencapai shift): seasonal naive ${num2(b.seasonal)} menjadi ${num2(a.seasonal)} (${times(r.seasonal)} kali, ${signed(inc.seasonal, 2)}); model lag terlatih ${num2(b.learned)} menjadi ${num2(a.learned)} (${times(r.learned)} kali, ${signed(inc.learned, 2)}).`);
    const rule = tr('The model that loses the most is the one whose error grows by the larger factor.', 'Model yang paling banyak kehilangan akurasi adalah yang galatnya naik dengan faktor lebih besar.');
    const still = a.learned < a.seasonal
      ? tr(' The learned model still has the lower error after the shift: it had more to lose.', ' Model terlatih masih punya galat lebih rendah setelah shift: ia punya lebih banyak yang bisa hilang.')
      : a.seasonal < a.learned ? tr(' Seasonal naive has the lower error after the shift.', ' Seasonal naive punya galat lebih rendah setelah shift.') : '';
    const why = v.verdict === 'learned'
      ? tr('The learned model was fitted on a history that is mostly from before the shift, so it keeps applying the old level and pattern, and it only recovers as post-shift values enter its lags. A sliding window forgets the old regime sooner.', 'Model terlatih dilatih pada riwayat yang sebagian besar dari sebelum shift, jadi ia terus memakai level dan pola lama, dan baru pulih ketika nilai setelah shift masuk ke lag-nya. Sliding window melupakan regime lama lebih cepat.')
      : v.verdict === 'seasonal'
        ? tr('Seasonal naive copies one value from a season ago, so for a whole season after the shift it copies values from the old regime, and it also copies that single value\'s noise.', 'Seasonal naive menyalin satu nilai dari satu musim lalu, jadi selama satu musim penuh setelah shift ia menyalin nilai dari regime lama, dan ikut menyalin noise dari nilai tunggal itu.')
        : tr('Both models lose accuracy by a similar factor here. Compare the windows after the shift one by one: the winner can still change from window to window.', 'Kedua model kehilangan akurasi dengan faktor yang mirip di sini. Bandingkan window sesudah shift satu per satu: pemenangnya masih bisa berganti dari window ke window.');
    box.reveal(v.verdict, `${numbers} ${rule}${v.verdict === 'same' ? '' : still} ${why}`);
  }
  function settleQuiz() { clearTimeout(quizTimer); quizTimer = setTimeout(revealPrediction, QUIZ_MS); }
  lab.cleanup(() => { clearTimeout(timer); clearTimeout(quizTimer); destroyed = true; });

  // ---- drawing -------------------------------------------------------------------------------------------------------

  const visible = () => MODELS.filter(m => state.p[SHOW[m]]);

  function draw() {
    if (destroyed) return;
    if (!state) {
      lab.setStatus(failure ? tr(`These settings cannot be computed: ${failure}`, `Pengaturan ini tidak dapat dihitung: ${failure}`) : tr('Computing…', 'Menghitung…'));
      lab.setDetail(''); lab.setMetrics(''); lab.setLegend([]);
      return;
    }
    drawMain();
    drawWindowChart();
    drawHorizonChart();
    drawCoverageChart();
    drawTable();
    readouts();
  }

  function drawMain() {
    const { p, series, plan, wins, interval } = state, t = theme(), y = series.y;
    // On a phone the plot is taller than the shared default, so the lane rows can be tall enough to tap. In fullscreen the
    // shared layout owns the height, so it is left alone there.
    const stage = lab.canvas.closest('.lab-stage');
    const full = Boolean(stage && (stage.classList.contains('expanded') || stage.matches(':fullscreen')));
    const phoneH = !full && window.innerWidth < 640 ? '470px' : '';
    if (lab.canvas.style.height !== phoneH) lab.canvas.style.height = phoneH;
    const { ctx, width, height } = prepare(lab.canvas);
    layout = mainLayout(width, height, p.windows, Math.max(0, plan.firstOrigin - CONTEXT));
    const L = layout, sel = p.windowShown - 1, win = wins.naive[sel];
    const seen = y.slice(L.from), lo = Math.min(...seen), hi = Math.max(...seen), pad = (hi - lo || 1) * 0.08, yMin = lo - pad, yMax = hi + pad;
    const Y = v => L.top.y1 - (v - yMin) / (yMax - yMin) * (L.top.y1 - L.top.y0);
    ctx.fillStyle = t.plot; ctx.fillRect(L.x0, L.top.y0, L.x1 - L.x0, L.top.y1 - L.top.y0);
    ctx.fillRect(L.x0, L.lane.y0, L.x1 - L.x0, L.laneH);
    // grid and labels
    ctx.font = '11px system-ui, sans-serif'; ctx.strokeStyle = t.grid; ctx.fillStyle = t.muted; ctx.lineWidth = 1;
    ctx.beginPath();
    for (const v of niceTicks(yMin, yMax)) { ctx.moveTo(L.x0, Y(v)); ctx.lineTo(L.x1, Y(v)); ctx.textAlign = 'right'; ctx.fillText(fmt(v, { max: 1 }), L.x0 - 6, Y(v) + 4); }
    for (const v of niceTicks(L.from, STEPS - 1, 8)) { ctx.moveTo(L.X(v), L.top.y0); ctx.lineTo(L.X(v), L.lane.y1); ctx.textAlign = 'center'; ctx.fillText(fmt(v), L.X(v), L.lane.y1 + 15); }
    ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillText(tr('Time step', 'Langkah waktu'), (L.x0 + L.x1) / 2, L.lane.y1 + 31);
    ctx.save(); ctx.translate(13, (L.top.y0 + L.top.y1) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(tr('Value', 'Nilai'), 0, 0); ctx.restore();

    ctx.save();
    ctx.beginPath(); ctx.rect(L.x0, L.top.y0, L.x1 - L.x0, L.top.y1 - L.top.y0); ctx.clip();
    // shaded windows: every forecast span lightly, the one shown strongly
    wins.naive.forEach((w, i) => {
      if (i === sel) return;
      ctx.globalAlpha = 0.07; ctx.fillStyle = t.muted;
      ctx.fillRect(L.edge(w.testStart), L.top.y0, L.edge(w.testEnd + 1) - L.edge(w.testStart), L.top.y1 - L.top.y0);
    });
    ctx.globalAlpha = 0.16; ctx.fillStyle = t.accent;
    ctx.fillRect(L.edge(win.testStart), L.top.y0, L.edge(win.testEnd + 1) - L.edge(win.testStart), L.top.y1 - L.top.y0);
    ctx.globalAlpha = 1;
    // regime shift
    const active = shiftActive(p);
    if (active) {
      ctx.setLineDash([6, 4]); ctx.strokeStyle = clusterColor(1); ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(L.edge(p.shiftAt), L.top.y0); ctx.lineTo(L.edge(p.shiftAt), L.top.y1); ctx.stroke(); ctx.setLineDash([]);
    }
    // the series
    ctx.lineJoin = 'round'; ctx.strokeStyle = t.ink; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.85;
    ctx.beginPath(); y.forEach((v, i) => (i ? ctx.lineTo(L.X(i), Y(v)) : ctx.moveTo(L.X(i), Y(v)))); ctx.stroke(); ctx.globalAlpha = 1;
    // the interval band of the window shown
    const iv = interval.windows[sel], span = yMax - yMin, clampY = v => Math.max(yMin - span, Math.min(yMax + span, v));
    const xs = iv.forecast.map((_, i) => L.X(win.origin + 1 + i));
    ctx.beginPath();
    xs.forEach((x, i) => (i ? ctx.lineTo(x, Y(clampY(iv.hi[i]))) : ctx.moveTo(x, Y(clampY(iv.hi[i])))));
    for (let i = xs.length - 1; i >= 0; i--) ctx.lineTo(xs[i], Y(clampY(iv.lo[i])));
    ctx.closePath(); ctx.globalAlpha = 0.2; ctx.fillStyle = modelInfo[p.intervalModel].color(); ctx.fill(); ctx.globalAlpha = 1;
    // the actual values of the window, then each model's forecast
    ctx.strokeStyle = t.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(L.X(win.origin), Y(y[win.origin])); win.actual.forEach((v, i) => ctx.lineTo(L.X(win.origin + 1 + i), Y(v))); ctx.stroke();
    for (const m of visible()) {
      const f = wins[m][sel].forecast, color = modelInfo[m].color();
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.setLineDash(modelInfo[m].dash ?? []);
      ctx.beginPath(); ctx.moveTo(L.X(win.origin), Y(y[win.origin])); f.forEach((v, i) => ctx.lineTo(L.X(win.origin + 1 + i), Y(Math.max(yMin - span, Math.min(yMax + span, v))))); ctx.stroke();
      ctx.setLineDash([]);
    }
    // the origin
    ctx.setLineDash([2, 3]); ctx.strokeStyle = t.ink; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(L.X(win.origin), L.top.y0); ctx.lineTo(L.X(win.origin), L.top.y1); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // labels on the chart
    ctx.font = '600 11px system-ui, sans-serif'; ctx.fillStyle = t.ink;
    const originText = tr('Forecast origin', 'Forecast origin');
    const left = L.X(win.origin) > L.x1 - 110;
    ctx.textAlign = left ? 'right' : 'left'; ctx.fillText(originText, L.X(win.origin) + (left ? -5 : 5), L.top.y1 - 7);
    if (active) {
      ctx.fillStyle = clusterColor(1);
      const toRight = L.edge(p.shiftAt) < L.x1 - 100;
      ctx.textAlign = toRight ? 'left' : 'right'; ctx.fillText(tr('Regime shift', 'Regime shift'), L.edge(p.shiftAt) + (toRight ? 5 : -5), L.top.y0 + 13);
    }
    // the lane: one row per window, its training slice (grey) and its forecast span (colour)
    ctx.save(); ctx.beginPath(); ctx.rect(L.x0, L.lane.y0, L.x1 - L.x0, L.laneH); ctx.clip();
    wins.naive.forEach((w, i) => {
      const yy = L.lane.y0 + 4 + i * L.rowH, on = i === sel;
      ctx.globalAlpha = on ? 0.9 : 0.45; ctx.fillStyle = t.muted;
      ctx.fillRect(L.edge(w.trainStart), yy + L.rowH * 0.32, L.edge(w.trainEnd + 1) - L.edge(w.trainStart), Math.max(1.5, L.rowH * 0.24));
      ctx.globalAlpha = on ? 1 : 0.5; ctx.fillStyle = on ? t.accent : clusterColor(4);
      ctx.fillRect(L.edge(w.testStart), yy + 1, Math.max(2, L.edge(w.testEnd + 1) - L.edge(w.testStart)), L.rowH - 2);
      ctx.globalAlpha = 1;
    });
    ctx.restore();
    wins.naive.forEach((w, i) => {
      const on = i === sel;
      if (L.rowH >= 9 || on) {
        ctx.fillStyle = on ? t.ink : t.muted; ctx.font = `${on ? 700 : 500} 10px system-ui, sans-serif`; ctx.textAlign = 'right';
        ctx.fillText(fmt(i + 1), L.x0 - 6, L.lane.y0 + 4 + i * L.rowH + L.rowH - 2);
      }
    });
    ctx.fillStyle = t.muted; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(width < 520 ? tr('Windows: training (grey), forecast (colour)', 'Window: latih (abu-abu), forecast (warna)') : tr('Backtest windows: training slice (grey), forecast span (colour)', 'Window backtest: bagian latih (abu-abu), rentang forecast (berwarna)'), L.x0 + 4, L.lane.y0 - 8);
    ctx.strokeStyle = t.accent; ctx.lineWidth = 1.5; ctx.strokeRect(L.edge(win.testStart), L.lane.y0 + 4 + sel * L.rowH, Math.max(2, L.edge(win.testEnd + 1) - L.edge(win.testStart)), L.rowH);

    // legend
    const items = [
      { kind: 'line', color: t.ink, label: tr('Actual series', 'Seri sebenarnya') },
      { kind: 'dot', color: t.muted, label: tr('Forecast windows (shaded)', 'Window forecast (diarsir)') },
    ];
    if (active) items.push({ kind: 'dash', color: clusterColor(1), label: tr('Regime shift', 'Regime shift') });
    for (const m of visible()) items.push({ kind: modelInfo[m].glyph, color: modelInfo[m].color(), label: modelInfo[m].name() });
    items.push({ kind: 'dot', color: modelInfo[p.intervalModel].color(), label: tr(`${pct(p.coverage / 100, 0)} interval (${modelInfo[p.intervalModel].name()})`, `Interval ${pct(p.coverage / 100, 0)} (${modelInfo[p.intervalModel].name()})`) });
    lab.setLegend(items);
  }

  // Grouped bars: one group per window, one bar per ticked model, a marker over the lowest bar of each group.
  function drawWindowChart() {
    const { p, wins } = state, t = theme(), names = visible(), measure = p.measure;
    const { ctx, width, height } = prepare(windowChart);
    const m = { l: 54, r: 16, t: 26, b: 40 }, plotW = width - m.l - m.r, plotH = height - m.t - m.b;
    ctx.fillStyle = t.plot; ctx.fillRect(m.l, m.t, plotW, plotH);
    if (!names.length) { emptyNote(ctx, width, height, m); return; }
    const values = Object.fromEntries(names.map(n => [n, summarize(wins[n], measure).values]));
    const finite = names.flatMap(n => values[n]).filter(Number.isFinite);
    const top = niceMax((finite.length ? Math.max(...finite) : 1) * 1.08);
    const Y = v => m.t + plotH - Math.min(v, top) / top * plotH;
    ctx.font = '11px system-ui, sans-serif'; ctx.strokeStyle = t.grid; ctx.fillStyle = t.muted; ctx.lineWidth = 1; ctx.beginPath();
    for (const v of niceTicks(0, top, 4)) { ctx.moveTo(m.l, Y(v)); ctx.lineTo(width - m.r, Y(v)); ctx.textAlign = 'right'; ctx.fillText(fmt(v, { max: 2 }), m.l - 6, Y(v) + 4); }
    ctx.stroke();
    const count = p.windows, gw = plotW / count, bw = gw * 0.8 / names.length, sel = p.windowShown - 1;
    ctx.fillStyle = t.accent; ctx.globalAlpha = 0.14; ctx.fillRect(m.l + sel * gw + 1, m.t, gw - 2, plotH); ctx.globalAlpha = 1;
    ctx.strokeStyle = t.accent; ctx.lineWidth = 1.5; ctx.strokeRect(m.l + sel * gw + 1, m.t, gw - 2, plotH);
    const win = winners(values);
    names.forEach((n, k) => {
      ctx.fillStyle = modelInfo[n].color();
      values[n].forEach((v, i) => {
        const x = m.l + i * gw + gw * 0.1 + k * bw, yy = Number.isFinite(v) ? Y(v) : m.t;
        ctx.fillRect(x + 0.5, yy, Math.max(1, bw - 1), m.t + plotH - yy);
        if (win.perWindow[i] === n && names.length > 1) {
          const cx = x + bw / 2, ty = Math.max(m.t + 2, yy - 9);
          ctx.beginPath(); ctx.moveTo(cx - 4, ty); ctx.lineTo(cx + 4, ty); ctx.lineTo(cx, ty + 6); ctx.closePath(); ctx.fill();
        }
      });
    });
    ctx.fillStyle = t.muted; ctx.textAlign = 'center'; ctx.font = '11px system-ui, sans-serif';
    for (let i = 0; i < count; i++) ctx.fillText(fmt(i + 1), m.l + (i + 0.5) * gw, m.t + plotH + 15);
    ctx.fillText(tr('Backtest window (1 = earliest)', 'Window backtest (1 = paling awal)'), m.l + plotW / 2, height - 6);
    ctx.save(); ctx.translate(13, m.t + plotH / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(measureName(measure), 0, 0); ctx.restore();
    // where the regime shift falls
    if (shiftActive(p)) {
      const { before, after } = shiftPartition(wins.naive, p.shiftAt);
      if (before.length && after.length) {
        const x = m.l + after[0] * gw;
        ctx.setLineDash([5, 4]); ctx.strokeStyle = clusterColor(1); ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(x, m.t); ctx.lineTo(x, m.t + plotH); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = clusterColor(1); ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(tr('Shift reached', 'Shift tercapai'), x + 4, m.t + 12);
      }
    }
    const legend = (short, tri) => [
      ...names.map(n => ({ color: modelInfo[n].color(), label: short ? shortName[n]() : modelInfo[n].name() })),
      ...(names.length > 1 ? [{ kind: 'tri', color: t.ink, label: tri }] : []),
    ];
    inlineLegend(ctx, [
      legend(false, tr('lowest in the window', 'terendah di window')),
      legend(true, tr('lowest in the window', 'terendah di window')),
      legend(true, tr('lowest', 'terendah')),
      legend(true, 'min'),
      legend(true, ''),
    ], m.l, 14, width - m.l - 4);
    const lines = names.map(n => `${modelInfo[n].name()}: ${values[n].map(num2).join(', ')}`).join('; ');
    lab.describe(windowChart, tr(`${measureName(measure)} of each ticked model in each of the ${count} windows, earliest first. ${lines}. Window ${p.windowShown} is the one shown.`, `${measureName(measure)} tiap model tercentang di tiap ${count} window, dari yang paling awal. ${lines}. Window ${p.windowShown} adalah yang ditampilkan.`));
  }

  function emptyNote(ctx, width, height, m) {
    ctx.fillStyle = theme().muted; ctx.textAlign = 'center'; ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(tr('Tick at least one model.', 'Centang minimal satu model.'), (m.l + width - m.r) / 2, (m.t + height - m.b) / 2);
  }

  function drawHorizonChart() {
    const { p, wins } = state, names = visible(), measure = p.measure;
    if (!names.length) {
      const { ctx, width, height } = prepare(horizonChart), m = { l: 54, r: 16, t: 14, b: 40 };
      ctx.fillStyle = theme().plot; ctx.fillRect(m.l, m.t, width - m.l - m.r, height - m.t - m.b);
      emptyNote(ctx, width, height, m);
      return;
    }
    const xs = Array.from({ length: p.horizon }, (_, i) => i + 1);
    const data = names.map(n => horizonErrors(wins[n], measure));
    const finite = data.flat().filter(Number.isFinite), top = niceMax((finite.length ? Math.max(...finite) : 1) * 1.08);
    drawLineChart(horizonChart, {
      series: names.map((n, k) => ({ xs, ys: data[k].map(v => (Number.isFinite(v) ? v : top)), color: modelInfo[n].color(), dash: Boolean(modelInfo[n].dash), points: p.horizon <= 12 })),
      xLabel: tr('Forecast horizon (steps ahead)', 'Forecast horizon (langkah ke depan)'), yLabel: measureName(measure),
      xMin: 1, xMax: Math.max(2, p.horizon), yMin: 0, yMax: top, integerX: true,
    });
    inlineLegend(horizonChart.getContext('2d'), [false, true].map(short => names.map(n => ({ color: modelInfo[n].color(), label: short ? shortName[n]() : modelInfo[n].name() }))), 54, 11, horizonChart.getBoundingClientRect().width - 58);
    lab.describe(horizonChart, tr(
      `${measureName(measure)} by forecast horizon, pooled over the windows. At 1 step ahead: ${names.map((n, k) => `${modelInfo[n].name()} ${num2(data[k][0])}`).join(', ')}. At ${p.horizon} steps ahead: ${names.map((n, k) => `${modelInfo[n].name()} ${num2(data[k][p.horizon - 1])}`).join(', ')}.`,
      `${measureName(measure)} menurut forecast horizon, digabung dari semua window. Pada 1 langkah ke depan: ${names.map((n, k) => `${modelInfo[n].name()} ${num2(data[k][0])}`).join(', ')}. Pada ${p.horizon} langkah ke depan: ${names.map((n, k) => `${modelInfo[n].name()} ${num2(data[k][p.horizon - 1])}`).join(', ')}.`));
  }

  function drawCoverageChart() {
    const { p, interval } = state, t = theme(), color = modelInfo[p.intervalModel].color();
    const xs = interval.byHorizon.map(r => r.horizon), target = p.coverage;
    drawLineChart(coverageChart, {
      series: [
        { xs, ys: interval.byHorizon.map(r => r.coverage * 100), color, points: p.horizon <= 12 },
        { xs: [1, Math.max(2, p.horizon)], ys: [target, target], color: t.ink, dash: true, points: false },
      ],
      xLabel: tr('Forecast horizon (steps ahead)', 'Forecast horizon (langkah ke depan)'), yLabel: tr('Inside the interval (%)', 'Di dalam interval (%)'),
      xMin: 1, xMax: Math.max(2, p.horizon), yMin: 0, yMax: 100, integerX: true,
    });
    const targetItem = { color: t.ink, label: tr(`Target ${pct(target / 100, 0)}`, `Target ${pct(target / 100, 0)}`) };
    inlineLegend(coverageChart.getContext('2d'), [
      [{ color, label: `Coverage, ${modelInfo[p.intervalModel].name()}` }, targetItem],
      [{ color, label: shortName[p.intervalModel]() }, targetItem],
    ], 54, 11, coverageChart.getBoundingClientRect().width - 58);
    const first = interval.byHorizon[0], last = interval.byHorizon[interval.byHorizon.length - 1];
    lab.describe(coverageChart, tr(
      `Share of actual values inside the ${pct(target / 100, 0)} interval of ${modelInfo[p.intervalModel].name()}, by horizon: ${pc(first.coverage)} at 1 step ahead and ${pc(last.coverage)} at ${p.horizon}. Overall ${pc(interval.coverage)}.${interval.infinite ? ' The band is unbounded because too few calibration windows exist for this target.' : ''}`,
      `Porsi nilai sebenarnya di dalam interval ${pct(target / 100, 0)} dari ${modelInfo[p.intervalModel].name()}, menurut horizon: ${pc(first.coverage)} pada 1 langkah ke depan dan ${pc(last.coverage)} pada ${p.horizon}. Keseluruhan ${pc(interval.coverage)}.${interval.infinite ? ' Band tidak terbatas karena window kalibrasi terlalu sedikit untuk target ini.' : ''}`));
  }

  function drawTable() {
    const { p, wins } = state, names = visible(), measure = p.measure;
    if (!names.length) { lab.extraEl.replaceChildren(Object.assign(document.createElement('p'), { className: 'hint', textContent: tr('Tick at least one model.', 'Centang minimal satu model.') })); return; }
    const sums = Object.fromEntries(names.map(n => [n, summarize(wins[n], measure)]));
    const won = winners(Object.fromEntries(names.map(n => [n, sums[n].values]))).counts;
    const t = document.createElement('table');
    t.className = 'stats-table';
    t.innerHTML = '<thead><tr></tr></thead>';
    const head = t.querySelector('tr');
    for (const h of [tr('Model', 'Model'), tr(`Mean ${measureName(measure)}`, `${measureName(measure)} rata-rata`), tr('Worst window', 'Window terburuk'), tr('Windows won', 'Window dimenangkan')]) {
      const th = document.createElement('th'); th.textContent = h; head.append(th);
    }
    const body = document.createElement('tbody');
    for (const n of names) {
      const row = body.insertRow(), s = sums[n];
      row.insertCell().textContent = modelInfo[n].name();
      row.insertCell().textContent = num2(s.mean);
      row.insertCell().textContent = tr(`${num2(s.worst)} (window ${fmt(s.worstIndex + 1)})`, `${num2(s.worst)} (window ${fmt(s.worstIndex + 1)})`);
      row.insertCell().textContent = tr(`${fmt(won[n])} of ${fmt(p.windows)}`, `${fmt(won[n])} dari ${fmt(p.windows)}`);
    }
    t.append(body);
    const style = document.createElement('style');
    style.textContent = '[data-ref=extra] .stats-table th, [data-ref=extra] .stats-table td { padding-top: 4px; padding-bottom: 4px; } @media (max-width: 640px) { .stats-table { font-size: 12px; } .stats-table th, .stats-table td { white-space: normal; padding: 6px 5px; } }';
    lab.extraEl.replaceChildren(style, t);
  }

  function readouts() {
    const { p, series, plan, wins, interval } = state, sel = p.windowShown - 1, win = wins.naive[sel], names = visible();
    const per = names.map(n => `${modelInfo[n].name()} ${num2(summarize([wins[n][sel]], p.measure).values[0])}`).join(', ');
    lab.setStatus(tr(
      `Window ${fmt(p.windowShown)} of ${fmt(p.windows)}, forecasting steps ${fmt(win.testStart)} to ${fmt(win.testEnd)}. ${measureName(p.measure)}: ${per || tr('no model ticked', 'tidak ada model dicentang')}.`,
      `Window ${fmt(p.windowShown)} dari ${fmt(p.windows)}, meramalkan langkah ${fmt(win.testStart)} sampai ${fmt(win.testEnd)}. ${measureName(p.measure)}: ${per || 'tidak ada model dicentang'}.`));
    const iv = interval.windows[sel], inside = iv.actual.filter((v, i) => v >= iv.lo[i] && v <= iv.hi[i]).length;
    const name = modelInfo[p.intervalModel].name();
    lab.setDetail(interval.infinite
      ? tr(`The ${pct(p.coverage / 100, 0)} interval is unbounded: too few calibration windows for this target.`, `Interval ${pct(p.coverage / 100, 0)} tidak terbatas: window kalibrasi terlalu sedikit untuk target ini.`)
      : tr(`${pct(p.coverage / 100, 0)} interval: ${fmt(inside)} of ${fmt(iv.actual.length)} actual values in this window are inside, ${pc(interval.coverage)} over all windows.`,
        `Interval ${pct(p.coverage / 100, 0)}: ${fmt(inside)} dari ${fmt(iv.actual.length)} nilai sebenarnya di window ini berada di dalam, ${pc(interval.coverage)} di semua window.`));
    lab.setMetrics(tr(`${fmt(STEPS)} steps, ${fmt(p.windows)} windows, horizon ${fmt(p.horizon)}`, `${fmt(STEPS)} langkah, ${fmt(p.windows)} window, horizon ${fmt(p.horizon)}`));
    intervalNote.textContent = interval.infinite
      ? tr('Too few calibration windows for this target: the band is unbounded.', 'Window kalibrasi terlalu sedikit untuk target ini: band tidak terbatas.')
      : tr(`The band is cut once from ${fmt(interval.nCal)} windows before the first backtest window and never updated, so a regime shift costs coverage.`, `Band dipotong sekali dari ${fmt(interval.nCal)} window sebelum window backtest pertama dan tidak pernah diperbarui, jadi regime shift mengurangi coverage.`);
    measureNote.textContent = p.measure === 'mase'
      ? tr('MASE divides the error by the in-sample error of seasonal naive: below 1 beats that copy.', 'MASE membagi galat dengan galat in-sample seasonal naive: di bawah 1 mengalahkan salinan itu.')
      : tr(`${measureName(p.measure)} is in the units of the series.`, `${measureName(p.measure)} memakai satuan seri.`);
    const shiftText = shiftActive(p)
      ? tr(` A regime shift of ${signed(p.shiftSize, 1)}${p.shiftPhase ? ' with the season moved by half a period' : ''} starts at step ${fmt(p.shiftAt)}.`, ` Regime shift ${signed(p.shiftSize, 1)}${p.shiftPhase ? ' dengan musim bergeser setengah periode' : ''} dimulai pada langkah ${fmt(p.shiftAt)}.`)
      : tr(' There is no regime shift.', ' Tidak ada regime shift.');
    lab.describe(lab.canvas, tr(
      `Time series of ${fmt(STEPS)} steps with ${fmt(p.windows)} backtest windows. Window ${fmt(p.windowShown)} is shown: trained on steps ${fmt(win.trainStart)} to ${fmt(win.origin)}, forecasting ${fmt(p.horizon)} steps from the forecast origin at step ${fmt(win.origin)}. ${measureName(p.measure)} in this window: ${per}.${shiftText} Series seed ${fmt(p.seed)}, trend ${signed(p.trend, 2)} per step.`,
      `Time series ${fmt(STEPS)} langkah dengan ${fmt(p.windows)} window backtest. Window ${fmt(p.windowShown)} ditampilkan: dilatih pada langkah ${fmt(win.trainStart)} sampai ${fmt(win.origin)}, meramalkan ${fmt(p.horizon)} langkah dari forecast origin pada langkah ${fmt(win.origin)}. ${measureName(p.measure)} di window ini: ${per}.${shiftText} Seed seri ${fmt(p.seed)}, tren ${signed(p.trend, 2)} per langkah.`));
    void series;
  }

  // ---- picking a window with the pointer or the keyboard --------------------------------------------------------------

  function pick(index) {
    if (index < 0) return;
    controls.set('windowShown', index + 1);
    update('windowShown');
  }
  lab.canvas.setAttribute('tabindex', '0');
  lab.on(lab.canvas, 'pointerdown', e => {
    if (!state || !layout) return;
    const r = lab.canvas.getBoundingClientRect();
    pick(windowAtPoint(layout, state.wins.naive, e.clientX - r.left, e.clientY - r.top));
  });
  lab.on(lab.canvas, 'keydown', e => {
    if (!state) return;
    const cur = state.p.windowShown - 1, last = state.p.windows - 1;
    const next = { ArrowLeft: cur - 1, ArrowDown: cur - 1, ArrowRight: cur + 1, ArrowUp: cur + 1, Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    pick(Math.max(0, Math.min(last, next)));
  });
  lab.on(windowChart, 'pointerdown', e => {
    if (!state) return;
    const r = windowChart.getBoundingClientRect(), left = 54, right = 16;
    const k = Math.floor((e.clientX - r.left - left) / ((r.width - left - right) / state.p.windows));
    if (k >= 0 && k < state.p.windows) pick(k);
  });

  lab.onReset(() => {
    clearTimeout(timer);
    for (const [k, v] of Object.entries(DEFAULTS)) controls.set(k, v);
    W = DEFAULTS.windows; shownSlider.max = String(W); controls.set('windowShown', DEFAULTS.windowShown);
    box.reset();
    compute();
  });
  lab.onTheme(draw);
  lab.onResize(draw);
  compute();
  return lab.destroy;
}
