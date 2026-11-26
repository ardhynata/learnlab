// Audit lab: take a fitted model and ask three questions of it, on one held-out set.
//   1. Errors by group: accuracy, precision, recall, false-positive rate and positive rate for each group, the gaps
//      between groups, and what a single threshold versus one threshold per group does to them (the fairness trade-off).
//   2. Permutation importance with error bars, and a correlation slider that makes the second feature an ever closer
//      copy of the first: the importance gets shared between them while the pair together keeps its worth.
//   3. A Shapley explanation of one chosen case: waterfall bars that add up from the average prediction to this one.
// Generated rows work offline; "Penguins (real)" audits "heavier than the median penguin" by sex or species (rows with
// a missing value, NA, are left out and the lab says so). The maths is in ml/auditlab.js on top of ml/audit.js.
import { createLab, dataModeSpec, loadDataset, panel, predictBox, clusterColor, theme, tr, fmt, pct } from '../kit/index.js';
import {
  GROUP_ORDER, REGULARIZATION, makeLabData, prepareRealData, buildAudit, splitVerdict, matchGroups, auditSummary, scoreHistogram, waterfallSteps,
} from '../ml/auditlab.js';
import { GAP_METRICS } from '../ml/audit.js';

export const DEFAULT_SEED = 2;
export const DEFAULT_CORRELATION = 0.2;
export const MIN_SPLIT_CORRELATION = 0.7;
export const BASE_THRESHOLD = 0.5;
export const BIG_GAP = 0.05;      // a gap of 5 points or more is shaded in the table
export const HUGE_GAP = 0.1;      // 10 points or more also gets a triangle, so it does not rely on colour

// ---- pure helpers (tested in audit-lab.test.js) -----------------------------------------------------------------

// Tick values for an axis from min to max: a "nice" step (1, 2 or 5 times a power of ten) giving about five ticks.
export function niceTicks(min, max, target = 5) {
  if (!(max > min)) return [min];
  const raw = (max - min) / target, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p;
  const step = (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
  const out = [];
  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : Number(v.toPrecision(12)));
  return out;
}

// Largest gap across the five compared metrics: { metric, gap, max: {group, value}, min: {group, value} } or null.
export function largestGap(gapsByMetric) {
  let best = null;
  for (const m of GAP_METRICS) {
    const g = gapsByMetric[m];
    if (g && g.gap !== null && (best === null || g.gap > best.gap)) best = { metric: m, ...g };
  }
  return best;
}

// The trade-off table: how accuracy and three gaps move from `base` (one threshold of 0.5) to `now`. Each is a
// number or null (a gap that does not exist when a group has no value); `change` is now minus base where both exist.
export function tradeoff(base, now) {
  const pick = s => ({ accuracy: s.accuracy, positiveRate: s.gaps.positiveRate.gap, recall: s.gaps.recall.gap, fpr: s.gaps.fpr.gap });
  const a = pick(base), b = pick(now), change = {};
  for (const k of Object.keys(a)) change[k] = a[k] === null || b[k] === null ? null : b[k] - a[k];
  return { base: a, now: b, change };
}

// Rounds a computed threshold to what the slider can show (0.01 steps, 0.01 to 0.99).
export const toSlider = t => Math.min(0.99, Math.max(0.01, Math.round(t * 100) / 100));

// ---- labels ----------------------------------------------------------------------------------------------

const featureLabel = id => ({
  signal: tr('signal', 'sinyal'), signalCopy: tr('signal copy', 'salinan sinyal'), independent: tr('other signal', 'sinyal lain'), noise: tr('noise', 'noise'),
  flipper: tr('flipper length', 'panjang sirip'), flipperCopy: tr('flipper copy', 'salinan sirip'), billLength: tr('bill length', 'panjang paruh'), billDepth: tr('bill depth', 'kedalaman paruh'),
}[id] ?? id);
const groupLabel = g => ({
  A: tr('Group A', 'Kelompok A'), B: tr('Group B', 'Kelompok B'), female: tr('Female', 'Betina'), male: tr('Male', 'Jantan'),
}[g] ?? g);
const metricLabel = m => ({
  accuracy: tr('Accuracy', 'Accuracy'), precision: tr('Precision', 'Precision'), recall: tr('Recall', 'Recall'),
  fpr: tr('False-positive rate', 'False-positive rate'), positiveRate: tr('Positive rate', 'Positive rate'), baseRate: tr('Base rate', 'Base rate'),
}[m]);

const pts = (v, signed = false) => {
  if (v === null || v === undefined || !Number.isFinite(v)) return tr('n/a', 'n/a');
  const x = v * 100;
  return `${signed && x > 0.049 ? '+' : ''}${fmt(Math.abs(x) < 0.05 ? 0 : x, { digits: 1 })} ${tr('pts', 'poin')}`;
};
// A tiny negative value (a feature that does nothing, shuffled) would print as -0.0%: show 0.0% instead.
const pc = (v, digits = 1) => pct(Math.abs(v) < 0.5 * 10 ** -(digits + 2) ? 0 : v, digits);
const cell = v => (v === null || v === undefined ? tr('n/a', 'n/a') : pc(v, 1));
const th2 = t => fmt(t, { digits: 2 });

// ---- drawing ------------------------------------------------------------------------------------------------

function prep(canvas) {
  const ctx = canvas.getContext('2d'), { width, height } = canvas.getBoundingClientRect(), ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.font = '11px system-ui, sans-serif';
  return { ctx, width, height, t: theme() };
}

function fit(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxW) s = s.slice(0, -1);
  return `${s}…`;
}

// Horizontal bars with labels on the left and the numbers in a column on the right. rows: [{ label, from, to, color, err, valueText, bold }];
// a row's bar runs from `from` to `to` (a waterfall bar floats, an importance bar starts at 0); `err` draws an error bar about `to`.
function drawBars(canvas, { rows, xMin, xMax, xTitle, tickText, markers = [], connect = false }) {
  const { ctx, width, height, t } = prep(canvas);
  const maxLabel = Math.max(...rows.map(r => { ctx.font = `${r.bold ? '600 ' : ''}11px system-ui, sans-serif`; return ctx.measureText(r.label).width; }));
  ctx.font = '11px system-ui, sans-serif';
  const labelW = Math.min(maxLabel + 6, Math.max(70, width * 0.4));
  ctx.font = '600 11px system-ui, sans-serif';
  const valueW = Math.max(...rows.map(r => ctx.measureText(r.valueText).width)) + 4;
  ctx.font = '11px system-ui, sans-serif';
  const m = { l: labelW + 8, r: valueW + 10, t: markers.length ? 22 : 12, b: 44 };
  const plotW = Math.max(40, width - m.l - m.r), plotH = height - m.t - m.b;
  const X = v => m.l + (v - xMin) / (xMax - xMin) * plotW;
  ctx.fillStyle = t.plot; ctx.fillRect(m.l, m.t, plotW, plotH);
  ctx.strokeStyle = t.grid; ctx.lineWidth = 1; ctx.fillStyle = t.muted; ctx.textAlign = 'center';
  ctx.beginPath();
  for (const v of niceTicks(xMin, xMax, Math.max(2, Math.floor(plotW / 62)))) { ctx.moveTo(X(v), m.t); ctx.lineTo(X(v), m.t + plotH); ctx.fillText(tickText(v), X(v), m.t + plotH + 15); }
  ctx.stroke();
  if (xMin < 0 && xMax > 0) { ctx.strokeStyle = t.muted; ctx.beginPath(); ctx.moveTo(X(0), m.t); ctx.lineTo(X(0), m.t + plotH); ctx.stroke(); }
  ctx.fillStyle = t.muted; ctx.fillText(xTitle, m.l + plotW / 2, height - 6);
  const rowH = plotH / rows.length, barH = Math.min(26, rowH * 0.62);
  ctx.save(); ctx.beginPath(); ctx.rect(m.l, m.t, plotW, plotH); ctx.clip();
  rows.forEach((r, i) => {
    const cy = m.t + rowH * (i + 0.5), x0 = X(Math.min(r.from, r.to)), x1 = X(Math.max(r.from, r.to));
    ctx.fillStyle = r.color; ctx.fillRect(x0, cy - barH / 2, Math.max(2, x1 - x0), barH);
    if (connect && i < rows.length - 1) {
      ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = t.muted; ctx.beginPath();
      ctx.moveTo(X(r.to), cy + barH / 2); ctx.lineTo(X(r.to), m.t + rowH * (i + 1.5) - barH / 2); ctx.stroke(); ctx.restore();
    }
    if (r.err > 0) {
      const lo = X(r.to - r.err), hi = X(r.to + r.err);
      ctx.strokeStyle = t.ink; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(lo, cy); ctx.lineTo(hi, cy); ctx.moveTo(lo, cy - 5); ctx.lineTo(lo, cy + 5); ctx.moveTo(hi, cy - 5); ctx.lineTo(hi, cy + 5); ctx.stroke(); ctx.lineWidth = 1;
    }
  });
  for (const mk of markers) {
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = t.ink; ctx.beginPath(); ctx.moveTo(X(mk.x), m.t); ctx.lineTo(X(mk.x), m.t + plotH); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
  rows.forEach((r, i) => {
    const cy = m.t + rowH * (i + 0.5);
    ctx.fillStyle = t.ink; ctx.font = `${r.bold ? '600 ' : ''}11px system-ui, sans-serif`;
    ctx.textAlign = 'right'; ctx.fillText(fit(ctx, r.label, labelW), m.l - 8, cy + 4);
    ctx.font = '600 11px system-ui, sans-serif'; ctx.fillText(r.valueText, width - 6, cy + 4);
  });
  ctx.font = '11px system-ui, sans-serif';
  for (const mk of markers) { ctx.fillStyle = t.ink; ctx.textAlign = 'center'; ctx.fillText(mk.label, Math.min(width - 40, Math.max(40, X(mk.x))), m.t - 7); }
}

// ---- the lab -------------------------------------------------------------------------------------------------

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Audit a fitted model', 'Audit model yang sudah di-fit'),
    hint: tr(
      'The curves show how the model scores each group. Rows to the right of a threshold line are predicted positive. The tables, the importance chart and the explanation below all use the same held-out rows.',
      'Kurva menunjukkan skor yang diberikan model ke tiap kelompok. Baris di kanan garis threshold diprediksi positif. Tabel, grafik importance, dan penjelasan di bawah memakai baris held-out yang sama.'),
    status: true, legend: true,
    canvasLabel: tr('Chart of the model scores of each group with the decision thresholds', 'Grafik skor model untuk tiap kelompok beserta threshold keputusan'),
  });
  // Nobody drags this chart: it is a picture, not an application.
  lab.canvas.setAttribute('role', 'img');
  lab.canvas.removeAttribute('tabindex');
  const legendHost = lab.ref('legend');
  if (legendHost) legendHost.style.maxHeight = 'none';

  const style = document.createElement('style');
  style.textContent = [
    '.audit-controls{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:12px 20px;align-items:end;margin-top:12px}',
    '.audit-controls .panel{display:contents}.audit-controls label{display:block;font-size:13px;font-weight:650}',
    '.audit-controls div.slider-label{font-size:13px;font-weight:650}.audit-controls div.slider-label label{display:inline;margin:0}.audit-controls .panel .button-group{margin-top:0}',
    '.audit-table{margin-top:10px}.audit-table th,.audit-table td{white-space:normal}.audit-table td:first-child,.audit-table th:first-child{text-align:left}',
    '.audit-table .gap{font-variant-numeric:tabular-nums}.audit-table .gap.big{background:var(--accent-soft);font-weight:700}',
    '.audit-sub{margin:18px 0 0;font-size:14px}',
    '@media (max-width:640px){.table-card .audit-table{min-width:0;width:100%;font-size:12px}.audit-table th,.audit-table td{padding:6px 4px;overflow-wrap:normal;word-break:normal}.audit-table td{white-space:nowrap}}',
  ].join('');
  lab.root.prepend(style);

  // ---- the three cards under the plot ----
  const below = lab.ref('below');
  const tableCard = document.createElement('section');
  tableCard.className = 'card table-card';
  tableCard.innerHTML = `<h2 class="lab-h"></h2><p class="hint"></p><div class="table-scroll"><table class="audit-table"></table></div><h3 class="lab-h audit-sub"></h3><p class="hint"></p><div class="table-scroll"><table class="audit-table"></table></div>`;
  below.append(tableCard);
  const [groupTitle, groupHint, tradeHint] = [tableCard.querySelector('h2'), tableCard.querySelectorAll('p.hint')[0], tableCard.querySelectorAll('p.hint')[1]];
  const [groupTable, tradeTable] = tableCard.querySelectorAll('table');
  const tradeTitle = tableCard.querySelector('h3');
  groupTitle.textContent = tr('Errors by group', 'Galat menurut kelompok');
  groupHint.textContent = tr(
    'Shaded gaps are 5 points or more, and a triangle marks 10 points or more. A gap is the largest value minus the smallest across the groups. n/a means there was nothing to divide (for example no predicted positives).',
    'Selisih yang diarsir sebesar 5 poin atau lebih, dan segitiga menandai 10 poin atau lebih. Selisih adalah nilai terbesar dikurangi nilai terkecil di antara kelompok. n/a berarti tidak ada yang bisa dibagi (misalnya tidak ada prediksi positif).');
  tradeTitle.textContent = tr('The trade-off: one threshold or your thresholds', 'Trade-off: satu threshold atau threshold-mu');
  tradeHint.textContent = tr(
    'Closing one gap usually opens another or costs accuracy. The last column is your setting minus one threshold of 0.50.',
    'Menutup satu selisih biasanya membuka selisih lain atau mengurangi accuracy. Kolom terakhir adalah pengaturanmu dikurangi satu threshold 0,50.');

  const impCanvas = lab.chartCard(
    tr('Permutation importance', 'Permutation importance'),
    tr('How much accuracy the model loses when one feature is shuffled, with an error bar of one standard deviation over 20 shuffles. The last bar shuffles the first two features together.',
      'Seberapa besar accuracy model turun saat satu feature diacak, dengan error bar satu simpangan baku dari 20 kali pengacakan. Bar terakhir mengacak dua feature pertama sekaligus.'), 260);
  lab.canvas.closest('.lab-stage')?.setAttribute('data-side-flow', '');   // three tall boxes (tables, two charts with controls) do not fit one screen: let them flow
  const impCard = impCanvas.closest('.card');
  const impNote = document.createElement('p');
  impNote.className = 'hint';
  const impStatus = document.createElement('p');
  impStatus.setAttribute('role', 'status');
  const impHost = document.createElement('div');
  impHost.className = 'audit-controls';
  impCard.querySelector('.chart').before(impHost, impNote);
  impCard.append(impStatus);

  const shapCanvas = lab.chartCard(
    tr('Why this prediction? (Shapley values)', 'Mengapa prediksi ini? (nilai Shapley)'),
    tr('Start from the average prediction and add what each feature contributes for this one case. The bars add up to the model\'s prediction. Bars are in percentage points of predicted probability.',
      'Mulai dari prediksi rata-rata lalu tambahkan sumbangan tiap feature untuk satu kasus ini. Bar-bar ini berjumlah prediksi model. Bar dalam poin persentase probabilitas prediksi.'), 300);
  const shapCard = shapCanvas.closest('.card');
  const shapHost = document.createElement('div');
  shapHost.className = 'audit-controls';
  const shapStatus = document.createElement('p');
  shapStatus.setAttribute('role', 'status');
  shapCard.querySelector('.chart').before(shapHost);
  shapCard.append(shapStatus);

  // ---- state ----
  let mode = 'generated', groupBy = 'sex', seed = DEFAULT_SEED, table = null, loading = false, loadFailed = false, loadToken = 0, destroyed = false;
  let exp = null, caseIndex = 0;
  const cache = new Map();

  const experiment = rho => {
    const key = `${mode}|${groupBy}|${seed}|${rho.toFixed(2)}`;
    if (!cache.has(key)) {
      const data = mode === 'penguins' ? prepareRealData(table, { group: groupBy, correlation: rho, seed }) : makeLabData({ seed, correlation: rho });
      cache.set(key, { data, ...buildAudit(data, seed) });
      if (cache.size > 16) cache.delete(cache.keys().next().value);
    }
    return cache.get(key);
  };
  const order = () => (mode === 'penguins' ? GROUP_ORDER[groupBy] : GROUP_ORDER.generated).filter(g => exp.test.group.includes(g));

  // ---- controls ----
  const controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real)', 'Penguin (data nyata)')]] }),
    { name: 'groupBy', type: 'select', label: tr('Compare groups by', 'Bandingkan kelompok menurut'), value: 'sex', options: [['sex', tr('Sex', 'Jenis kelamin')], ['species', tr('Species', 'Spesies')]] },
    { name: 'perGroup', type: 'toggle', label: tr('A different threshold for each group', 'Threshold berbeda untuk tiap kelompok'), value: false },
    { name: 'th', type: 'range', label: tr('Threshold', 'Threshold'), min: 0.01, max: 0.99, step: 0.01, value: BASE_THRESHOLD, format: th2 },
    { name: 'th0', type: 'range', label: tr('Threshold 1', 'Threshold 1'), min: 0.01, max: 0.99, step: 0.01, value: BASE_THRESHOLD, format: th2 },
    { name: 'th1', type: 'range', label: tr('Threshold 2', 'Threshold 2'), min: 0.01, max: 0.99, step: 0.01, value: BASE_THRESHOLD, format: th2 },
    { name: 'th2', type: 'range', label: tr('Threshold 3', 'Threshold 3'), min: 0.01, max: 0.99, step: 0.01, value: BASE_THRESHOLD, format: th2 },
    { name: 'matchRate', type: 'button', group: tr('Match the other groups to the first', 'Samakan kelompok lain dengan yang pertama'), label: tr('Match positive rates', 'Samakan positive rate'), onClick: () => matchTo('rate') },
    { name: 'matchRecall', type: 'button', label: tr('Match recall', 'Samakan recall'), onClick: () => matchTo('recall') },
    { type: 'note', text: tr('The first group is the first column of the table. Each other threshold moves until its group is predicted positive as often as (or catches as many positives as) the first group.', 'Kelompok pertama adalah kolom pertama tabel. Threshold kelompok lain digeser sampai kelompoknya diprediksi positif sesering (atau menangkap positif sebanyak) kelompok pertama.') },
    { name: 'newSample', type: 'button', label: tr('New sample', 'Sampel baru'), onClick: () => { seed += 1; cache.clear(); rebuild(true); } },
  ], name => {
    if (name === 'data') { setMode(controls.get('data')); return; }
    if (name === 'groupBy') { groupBy = controls.get('groupBy'); rebuild(true); return; }
    if (name === 'perGroup' && controls.get('perGroup')) for (const k of ['th0', 'th1', 'th2']) controls.set(k, controls.get('th'));
    syncThresholdControls();
    renderMain(); drawCase();
  });
  const sliderBoxes = [...controls.el.querySelectorAll('.slider-label')];   // th, th0, th1, th2 in panel order
  const dataNote = document.createElement('p');
  dataNote.className = 'hint';
  dataNote.setAttribute('role', 'status');
  controls.el.querySelector('select').closest('label').after(dataNote);

  const corr = panel(impHost, [
    { name: 'rho', type: 'range', label: tr('Correlation between the two features', 'Korelasi antara kedua feature'), min: 0, max: 0.99, step: 0.01, value: DEFAULT_CORRELATION, format: v => fmt(v, { digits: 2 }) },
  ], () => { rebuild(false); revealSplit(); });
  const caseCtl = panel(shapHost, [
    { name: 'case', type: 'range', label: tr('Case number', 'Nomor kasus'), min: 1, max: 600, step: 1, value: 1 },
    { name: 'random', type: 'button', label: tr('Random case', 'Kasus acak'), onClick: () => { caseIndex = Math.floor(Math.random() * exp.test.y.length); caseCtl.set('case', caseIndex + 1); drawCase(); } },
    { name: 'wrong', type: 'button', label: tr('Next wrong prediction', 'Prediksi salah berikutnya'), onClick: () => { goWrong(); } },
  ], () => { caseIndex = caseCtl.get('case') - 1; drawCase(); });
  const caseSlider = shapHost.querySelector('input[type=range]');
  const rho = () => corr.get('rho');

  const boxSplit = predictBox(lab.ref('below'), {
    hint: tr(`Raise the correlation slider to ${fmt(MIN_SPLIT_CORRELATION, { digits: 2 })} or more, then press Check answer.`, `Naikkan slider korelasi ke ${fmt(MIN_SPLIT_CORRELATION, { digits: 2 })} atau lebih, lalu tekan Periksa jawaban.`),
    name: 'predict-split',
    question: tr('If you raise the correlation between the two features, what happens to each importance bar?', 'Jika korelasi antara kedua feature dinaikkan, apa yang terjadi pada tiap bar importance?'),
    choices: [
      ['same', tr('Both bars stay about the same', 'Kedua bar tetap hampir sama')],
      ['up', tr('Both bars grow', 'Kedua bar membesar')],
      ['split', tr('The first bar shrinks and the copy\'s bar grows: the importance is shared', 'Bar pertama mengecil dan bar salinannya membesar: importance-nya terbagi')],
      ['down', tr('Both bars shrink', 'Kedua bar mengecil')],
    ],
  });
  lab.cleanup(() => boxSplit.destroy());
  boxSplit.onPick(() => revealSplit());
  boxSplit.onCheck(() => revealSplit());

  // ---- thresholds ----
  const thresholds = () => {
    if (!controls.get('perGroup')) return controls.get('th');
    const out = {};
    order().forEach((g, i) => { out[g] = controls.get(`th${i}`); });
    return out;
  };
  function syncThresholdControls() {
    const per = controls.get('perGroup'), groups = exp ? order() : [];
    controls.show('th', !per);
    ['th0', 'th1', 'th2'].forEach((k, i) => {
      controls.show(k, per && i < groups.length);
      const label = sliderBoxes[i + 1]?.querySelector('label');
      if (label && groups[i]) label.textContent = tr(`Threshold for ${groupLabel(groups[i])}`, `Threshold untuk ${groupLabel(groups[i])}`);
    });
    controls.show('groupBy', mode === 'penguins');
    controls.disable('matchRate', !exp || groups.length < 2); controls.disable('matchRecall', !exp || groups.length < 2);
  }
  function matchTo(kind) {
    if (!exp) return;
    const groups = order();
    const t0 = controls.get('perGroup') ? controls.get('th0') : controls.get('th');
    const out = matchGroups(kind, exp.scores, exp.test.y, exp.test.group, groups, t0);
    controls.set('perGroup', true);
    groups.forEach((g, i) => controls.set(`th${i}`, toSlider(out[g])));
    syncThresholdControls();
    renderMain(); drawCase();
    // The match is approximate (thresholds snap to 0.01 and tied scores move together), so show what was actually reached.
    const field = kind === 'rate' ? 'positiveRate' : 'recall';
    const reached = lastSummary.rows.map(r => `${groupLabel(r.group)} ${cell(r[field])}`).join(', ');
    lab.setDetail(kind === 'rate'
      ? tr(`Thresholds moved so every group is predicted positive about as often as ${groupLabel(groups[0])} is. Positive rate now: ${reached}.`, `Threshold digeser supaya tiap kelompok diprediksi positif sesering ${groupLabel(groups[0])}. Positive rate sekarang: ${reached}.`)
      : tr(`Thresholds moved so every group has about the same recall as ${groupLabel(groups[0])}. Recall now: ${reached}.`, `Threshold digeser supaya tiap kelompok punya recall yang hampir sama dengan ${groupLabel(groups[0])}. Recall sekarang: ${reached}.`));
  }

  // ---- data ----
  async function setMode(next) {
    const token = ++loadToken;
    loadFailed = false;
    if (next === 'generated') { mode = 'generated'; loading = false; rebuild(true); return; }
    loading = true; mode = next; exp = null; renderLoading();
    try {
      const t = await loadDataset(next);
      if (destroyed || token !== loadToken) return;
      table = t; loading = false;
    } catch {
      if (destroyed || token !== loadToken) return;
      loading = false; loadFailed = true; mode = 'generated';
      controls.set('data', 'generated');
    }
    rebuild(true);
  }

  // Refits the model for the current data and redraws everything. `fresh` is a new sample or new data: pick a new case too.
  function rebuild(fresh) {
    if (loading) return;
    exp = experiment(rho());
    const n = exp.test.y.length;
    caseSlider.max = String(n);
    if (fresh) {
      for (const k of ['th', 'th0', 'th1', 'th2']) controls.set(k, BASE_THRESHOLD);
      controls.set('perGroup', false);
      caseIndex = 0; goWrong(true);
    }
    caseIndex = Math.min(caseIndex, n - 1);
    caseCtl.set('case', caseIndex + 1);
    syncThresholdControls();
    renderAll();
  }

  function goWrong(quiet) {
    const pred = auditSummary(exp.test.y, exp.scores, exp.test.group, order(), thresholds()).pred, n = pred.length;
    for (let k = 1; k <= n; k++) {
      const i = (caseIndex + k) % n;
      if (pred[i] !== exp.test.y[i]) { caseIndex = i; break; }
    }
    caseCtl.set('case', caseIndex + 1);
    if (!quiet) drawCase();
  }

  // ---- rendering ----
  function renderLoading() {
    lab.setStatus(tr('Loading the penguin data…', 'Memuat data penguin…'));
    lab.setDetail(''); lab.setMetrics('');
    syncThresholdControls();
    dataNote.textContent = '';
  }

  function renderAll() { if (!exp) return; renderMain(); drawImportance(); drawCase(); renderNote(); }

  function renderNote() {
    const d = exp.data;
    if (mode === 'penguins') {
      dataNote.textContent = tr(
        `${fmt(d.y.length)} of ${fmt(d.total)} penguins kept; ${fmt(d.dropped)} rows with a missing value (NA) in a measurement or in sex are left out. Task: is the penguin heavier than the median body mass (${fmt(d.threshold)} g)? Body mass is not a feature.`,
        `${fmt(d.y.length)} dari ${fmt(d.total)} penguin dipakai; ${fmt(d.dropped)} baris dengan missing value (NA) pada pengukuran atau jenis kelamin dibuang. Tugas: apakah penguin lebih berat dari median massa tubuh (${fmt(d.threshold)} g)? Massa tubuh bukan feature.`);
      impNote.textContent = tr(
        'The flipper copy is made up: the real flipper length plus noise, with the correlation you choose, like a second sensor. It carries no new information.',
        'Salinan sirip ini buatan: panjang sirip asli ditambah noise, dengan korelasi pilihanmu, seperti sensor kedua. Salinan ini tidak membawa informasi baru.');
    } else {
      dataNote.textContent = loadFailed
        ? tr('Could not load the penguin data, so the generated data is shown.', 'Data penguin tidak bisa dimuat, jadi data buatan yang ditampilkan.')
        : tr('Generated rows (seeded, so everyone sees the same ones). Group A is 70% of the rows and group B 30%, with different base rates of the positive outcome. The model never sees the group.',
          'Baris buatan (memakai seed, jadi semua orang melihat yang sama). Kelompok A 70% dari baris dan kelompok B 30%, dengan base rate hasil positif yang berbeda. Model tidak pernah melihat kelompoknya.');
      impNote.textContent = tr(
        `The second feature is a noisy copy of the signal, with the correlation you choose. The outcome depends on the signal and on the other signal, never on the copy. The model is logistic regression with a little regularization (${fmt(REGULARIZATION)}), refitted whenever you move the slider, so the explanation below follows too.`,
        `Feature kedua adalah salinan sinyal yang ber-noise, dengan korelasi pilihanmu. Hasilnya bergantung pada sinyal dan sinyal lain, tidak pernah pada salinan. Modelnya regresi logistik dengan sedikit regularization (${fmt(REGULARIZATION)}), di-fit ulang tiap kali slider digeser, jadi penjelasan di bawah ikut berubah.`);
    }
  }

  let lastSummary = null;
  function renderMain() {
    if (!exp) return;
    const groups = order(), t = thresholds(), per = typeof t !== 'number';
    const now = auditSummary(exp.test.y, exp.scores, exp.test.group, groups, t);
    const base = auditSummary(exp.test.y, exp.scores, exp.test.group, groups, BASE_THRESHOLD);
    lastSummary = now;

    // --- the group table: metrics down, groups across, the gap last ---
    const rows = now.rows;
    const baseRates = rows.map(r => r.baseRate);
    const baseGap = baseRates.length > 1 ? Math.max(...baseRates) - Math.min(...baseRates) : null;
    const lines = [
      { name: tr('Rows', 'Baris'), values: rows.map(r => fmt(r.n)), gap: null, isRows: true },
      { name: `${metricLabel('baseRate')} (${tr('actually positive', 'sebenarnya positif')})`, values: rows.map(r => cell(r.baseRate)), gap: baseGap },
      ...GAP_METRICS.map(m => ({
        name: m === 'positiveRate' ? `${metricLabel(m)} (${tr('predicted positive', 'diprediksi positif')})` : metricLabel(m),
        values: rows.map(r => cell(r[m])), gap: now.gaps[m].gap,
      })),
    ];
    const head = `<thead><tr><th scope="col">${tr('Metric', 'Metrik')}</th>${rows.map(r => `<th scope="col"></th>`).join('')}<th scope="col">${tr('Gap', 'Selisih')}</th></tr></thead>`;
    groupTable.innerHTML = head + '<tbody></tbody>';
    const hs = groupTable.querySelectorAll('thead th');
    rows.forEach((r, i) => { hs[i + 1].textContent = groupLabel(r.group); });
    const body = groupTable.querySelector('tbody');
    for (const l of lines) {
      const tr_ = body.insertRow();
      const th = document.createElement('th'); th.scope = 'row'; th.textContent = l.name; th.style.fontWeight = '600'; tr_.append(th);
      l.values.forEach(v => { tr_.insertCell().textContent = v; });
      const c = tr_.insertCell();
      c.className = 'gap';
      if (l.gap === null || l.gap === undefined) c.textContent = l.isRows ? '–' : tr('n/a', 'n/a');
      else {
        c.textContent = `${l.gap >= HUGE_GAP ? '▲ ' : ''}${pts(l.gap)}`;
        if (l.gap >= BIG_GAP) c.classList.add('big');
      }
    }
    groupTable.setAttribute('aria-label', tr('Metrics for each group, with the gap between groups', 'Metrik untuk tiap kelompok, beserta selisih antarkelompok'));

    // --- the trade-off table ---
    const to = tradeoff(base, now);
    const cols = [tr('One threshold, 0.50', 'Satu threshold, 0,50'), per ? tr('Your thresholds', 'Threshold-mu') : tr('Your threshold', 'Threshold-mu'), tr('Change', 'Perubahan')];
    tradeTable.innerHTML = '<thead><tr></tr></thead><tbody></tbody>';
    const hr = tradeTable.querySelector('tr');
    for (const h of [tr('Measure', 'Ukuran'), ...cols]) { const c = document.createElement('th'); c.scope = 'col'; c.textContent = h; hr.append(c); }
    const tb = tradeTable.querySelector('tbody');
    const measures = [['accuracy', metricLabel('accuracy')], ['positiveRate', tr('Positive rate gap', 'Selisih positive rate')], ['recall', tr('Recall gap', 'Selisih recall')], ['fpr', tr('False-positive rate gap', 'Selisih false-positive rate')]];
    for (const [k, name] of measures) {
      const r = tb.insertRow();
      const th = document.createElement('th'); th.scope = 'row'; th.textContent = name; th.style.fontWeight = '600'; r.append(th);
      r.insertCell().textContent = k === 'accuracy' ? cell(to.base[k]) : pts(to.base[k]);
      r.insertCell().textContent = k === 'accuracy' ? cell(to.now[k]) : pts(to.now[k]);
      const c = r.insertCell();
      c.textContent = pts(to.change[k], true);
      if (to.change[k] !== null && Math.abs(to.change[k]) >= 0.005) c.style.fontWeight = '700';
    }
    tradeTable.setAttribute('aria-label', tr('Accuracy and the three gaps for one threshold of 0.50, for your thresholds, and the change', 'Accuracy dan tiga selisih untuk satu threshold 0,50, untuk threshold-mu, dan perubahannya'));

    // --- status, legend, chart ---
    const big = largestGap(now.gaps);
    const gl = big ? tr(
      `Largest gap: ${metricLabel(big.metric).toLowerCase()}, ${pts(big.gap)} (${groupLabel(big.max.group)} ${cell(big.max.value)}, ${groupLabel(big.min.group)} ${cell(big.min.value)}).`,
      `Selisih terbesar: ${metricLabel(big.metric).toLowerCase()}, ${pts(big.gap)} (${groupLabel(big.max.group)} ${cell(big.max.value)}, ${groupLabel(big.min.group)} ${cell(big.min.value)}).`) : '';
    lab.setStatus(`${tr(`Overall accuracy ${pc(now.accuracy, 1)}.`, `Accuracy keseluruhan ${pc(now.accuracy, 1)}.`)} ${gl}`.trim());
    lab.setDetail(tr(
      `The audit uses ${fmt(exp.test.y.length)} held-out rows the model never saw: ${rows.map(r => `${groupLabel(r.group)} ${fmt(r.n)}`).join(', ')}.`,
      `Audit memakai ${fmt(exp.test.y.length)} baris held-out yang tidak pernah dilihat model: ${rows.map(r => `${groupLabel(r.group)} ${fmt(r.n)}`).join(', ')}.`));
    lab.setMetrics(tr(`${fmt(exp.train.y.length)} training rows, ${fmt(exp.test.y.length)} audited`, `${fmt(exp.train.y.length)} baris latih, ${fmt(exp.test.y.length)} diaudit`));
    const items = groups.map((g, i) => ({ kind: 'line', color: clusterColor(i), label: groupLabel(g) }));
    items.push({ kind: 'dash', color: theme().ink, label: per ? tr('Threshold of each group', 'Threshold tiap kelompok') : tr('Threshold', 'Threshold') });
    lab.setLegend(items);
    drawScores(groups, t, now);
  }

  function drawScores(groups, t, now) {
    const { ctx, width, height, t: th } = prep(lab.canvas);
    const m = { l: 52, r: 16, t: 36, b: 46 };
    const hist = scoreHistogram(exp.scores, exp.test.group, groups, 20);
    const peak = Math.max(0.05, ...groups.flatMap(g => hist.shares[g]));
    const yMax = Math.ceil(peak * 20) / 20 + 0.0001;
    const pw = width - m.l - m.r, ph = height - m.t - m.b;
    const X = v => m.l + v * pw, Y = v => m.t + ph - v / yMax * ph;
    ctx.fillStyle = th.plot; ctx.fillRect(m.l, m.t, pw, ph);
    ctx.strokeStyle = th.grid; ctx.fillStyle = th.muted; ctx.lineWidth = 1;
    ctx.beginPath();
    for (const v of niceTicks(0, yMax, 4)) { ctx.moveTo(m.l, Y(v)); ctx.lineTo(m.l + pw, Y(v)); ctx.textAlign = 'right'; ctx.fillText(pc(v, 0), m.l - 6, Y(v) + 4); }
    for (const v of (pw < 260 ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1])) { ctx.moveTo(X(v), m.t); ctx.lineTo(X(v), m.t + ph); ctx.textAlign = 'center'; ctx.fillText(fmt(v, { digits: 2 }), X(v), m.t + ph + 15); }
    ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillText(tr('Predicted probability of positive', 'Probabilitas positif yang diprediksi'), m.l + pw / 2, height - 6);
    ctx.save(); ctx.translate(13, m.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(tr('Share of the group', 'Porsi kelompok'), 0, 0); ctx.restore();
    groups.forEach((g, gi) => {
      const col = clusterColor(gi), bw = pw / hist.bins;
      ctx.fillStyle = col; ctx.globalAlpha = 0.22;
      hist.shares[g].forEach((s, b) => { ctx.fillRect(X(0) + b * bw, Y(s), bw, m.t + ph - Y(s)); });
      ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
      hist.shares[g].forEach((s, b) => { const x0 = X(0) + b * bw; if (b === 0) ctx.moveTo(x0, Y(s)); else ctx.lineTo(x0, Y(s)); ctx.lineTo(x0 + bw, Y(s)); });
      ctx.stroke(); ctx.lineWidth = 1;
    });
    // threshold lines: one for everybody, or one per group in its colour, labelled above the plot
    const lines = typeof t === 'number' ? [{ x: t, color: th.ink, label: th2(t) }] : groups.map((g, gi) => ({ x: t[g], color: clusterColor(gi), label: th2(t[g]), tag: groupLabel(g).split(' ').pop()[0] }));
    lines.forEach((ln, i) => {
      ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = ln.color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(X(ln.x), m.t); ctx.lineTo(X(ln.x), m.t + ph); ctx.stroke(); ctx.restore();
      ctx.fillStyle = ln.color; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(ln.tag ? `${ln.tag} ${ln.label}` : ln.label, Math.min(width - 30, Math.max(m.l + 12, X(ln.x))), m.t - 8 - (i % 2) * 13);
    });
    ctx.font = '11px system-ui, sans-serif';
    const desc = tr(
      `Score distributions for ${groups.map(groupLabel).join(' and ')}. ${typeof t === 'number' ? `One threshold at ${th2(t)}.` : `Thresholds: ${groups.map(g => `${groupLabel(g)} ${th2(t[g])}`).join(', ')}.`} Positive rate: ${groups.map((g, i) => `${groupLabel(g)} ${cell(now.rows[i].positiveRate)}`).join(', ')}.`,
      `Sebaran skor untuk ${groups.map(groupLabel).join(' dan ')}. ${typeof t === 'number' ? `Satu threshold di ${th2(t)}.` : `Threshold: ${groups.map(g => `${groupLabel(g)} ${th2(t[g])}`).join(', ')}.`} Positive rate: ${groups.map((g, i) => `${groupLabel(g)} ${cell(now.rows[i].positiveRate)}`).join(', ')}.`);
    lab.describe(lab.canvas, desc);
  }

  function drawImportance() {
    if (!exp) return;
    const r = exp.importance.results, names = exp.data.features.map(featureLabel);
    const colors = [clusterColor(0), clusterColor(4), clusterColor(-1), clusterColor(-1), clusterColor(5)];
    const labels = [...names, tr('Both together', 'Keduanya bersama')];
    const rows = r.map((x, i) => ({ label: labels[i], from: 0, to: x.mean, err: x.sd, color: colors[i], valueText: pc(x.mean, 1), bold: i === r.length - 1 }));
    const lo = Math.min(0, ...r.map(x => x.mean - x.sd)), hi = Math.max(0.05, ...r.map(x => x.mean + x.sd));
    drawBars(impCanvas, { rows, xMin: lo < 0 ? lo * 1.1 : 0, xMax: hi * 1.08, xTitle: tr('Accuracy lost when shuffled', 'Accuracy yang hilang saat diacak'), tickText: v => pc(v, 0) });
    const pair = r[r.length - 1], sum = r[0].mean + r[1].mean;
    impStatus.textContent = tr(
      `Correlation ${fmt(rho(), { digits: 2 })}: ${names[0]} ${pc(r[0].mean, 1)} and ${names[1]} ${pc(r[1].mean, 1)}, which add up to ${pc(sum, 1)}. Shuffled together they cost ${pc(pair.mean, 1)}. Model accuracy: ${pc(exp.importance.baseline, 1)}.`,
      `Korelasi ${fmt(rho(), { digits: 2 })}: ${names[0]} ${pc(r[0].mean, 1)} dan ${names[1]} ${pc(r[1].mean, 1)}, jumlahnya ${pc(sum, 1)}. Diacak bersamaan, Accuracy turun ${pc(pair.mean, 1)}. Accuracy model: ${pc(exp.importance.baseline, 1)}.`);
    lab.describe(impCanvas, tr(
      `Accuracy lost when each feature is shuffled: ${r.map((x, i) => `${labels[i]} ${pc(x.mean, 1)} plus or minus ${pc(x.sd, 1)}`).join('; ')}.`,
      `Accuracy yang hilang saat tiap feature diacak: ${r.map((x, i) => `${labels[i]} ${pc(x.mean, 1)} plus minus ${pc(x.sd, 1)}`).join('; ')}.`));
  }

  function drawCase() {
    if (!exp) return;
    const i = caseIndex, x = exp.test.X[i], group = exp.test.group[i], actual = exp.test.y[i];
    const sh = exp.shap(i), steps = waterfallSteps(sh);
    const t = thresholds(), tc = typeof t === 'number' ? t : t[group];
    const names = exp.data.features.map(featureLabel);
    const val = j => (mode === 'penguins' ? fmt(x[j], { max: 1 }) : fmt(x[j], { digits: 2 }));
    const stepText = v => (Math.abs(v) < 0.0005 ? fmt(0, { digits: 1 }) : `${v > 0 ? '+' : ''}${fmt(v * 100, { digits: 1 })}`);
    const rows = [
      { label: tr('Average case', 'Kasus rata-rata'), from: 0, to: sh.baselineValue, color: clusterColor(0), valueText: pc(sh.baselineValue, 1), bold: true },
      ...steps.map(s => ({ label: `${names[s.feature]} = ${val(s.feature)}`, from: s.start, to: s.end, color: s.value >= 0 ? clusterColor(2) : clusterColor(1), valueText: stepText(s.value), bold: false })),
      { label: tr('This case', 'Kasus ini'), from: 0, to: sh.fx, color: clusterColor(0), valueText: pc(sh.fx, 1), bold: true },
    ];
    const all = [0, 1, ...rows.flatMap(r => [r.from, r.to])];
    drawBars(shapCanvas, {
      rows, xMin: Math.min(...all), xMax: Math.max(...all), xTitle: tr('Predicted probability of positive', 'Probabilitas positif yang diprediksi'), tickText: v => pc(v, 0),
      markers: [{ x: tc, label: tr(`threshold ${th2(tc)}`, `threshold ${th2(tc)}`) }], connect: true,
    });
    const predicted = sh.fx >= tc ? 1 : 0;
    const word = v => (v ? tr('positive', 'positif') : tr('negative', 'negatif'));
    shapStatus.textContent = tr(
      `Case ${fmt(i + 1)} (${groupLabel(group)}): the actual outcome is ${word(actual)}. The model gives it ${pc(sh.fx, 1)}, against ${pc(sh.baselineValue, 1)} for the average case, so at a threshold of ${th2(tc)} it predicts ${word(predicted)}${predicted === actual ? ', which is right' : ', which is wrong'}. The biggest push: ${names[steps[0].feature]} (${stepText(steps[0].value)} ${tr('pts', 'poin')}).`,
      `Kasus ${fmt(i + 1)} (${groupLabel(group)}): hasil sebenarnya ${word(actual)}. Model memberinya ${pc(sh.fx, 1)}, dibanding ${pc(sh.baselineValue, 1)} untuk kasus rata-rata, jadi pada threshold ${th2(tc)} model memprediksi ${word(predicted)}${predicted === actual ? ', dan itu benar' : ', dan itu salah'}. Dorongan terbesar: ${names[steps[0].feature]} (${stepText(steps[0].value)} poin).`);
    lab.describe(shapCanvas, tr(
      `Waterfall for case ${fmt(i + 1)}: from the average ${pc(sh.baselineValue, 1)}, ${steps.map(s => `${names[s.feature]} ${stepText(s.value)} points`).join(', ')}, to ${pc(sh.fx, 1)}.`,
      `Waterfall untuk kasus ${fmt(i + 1)}: dari rata-rata ${pc(sh.baselineValue, 1)}, ${steps.map(s => `${names[s.feature]} ${stepText(s.value)} poin`).join(', ')}, menjadi ${pc(sh.fx, 1)}.`));
  }

  // ---- the prediction ----
  function revealSplit() {
    if (boxSplit.chosen() == null || !exp || rho() < MIN_SPLIT_CORRELATION) return;
    const ref = experiment(DEFAULT_CORRELATION), now = experiment(rho());
    const v = splitVerdict(ref.importance, now.importance);
    const a = ref.importance.results, b = now.importance.results, names = now.data.features.map(featureLabel);
    boxSplit.reveal(v.key, tr(
      `From correlation ${fmt(DEFAULT_CORRELATION, { digits: 2 })} to ${fmt(rho(), { digits: 2 })}, ${names[0]} went from ${pc(a[0].mean, 1)} to ${pc(b[0].mean, 1)} and ${names[1]} from ${pc(a[1].mean, 1)} to ${pc(b[1].mean, 1)}. Shuffled together they went from ${pc(a[4].mean, 1)} to ${pc(b[4].mean, 1)}: the pair is worth about the same, but each of the two looks less important because the other covers for it.`,
      `Dari korelasi ${fmt(DEFAULT_CORRELATION, { digits: 2 })} ke ${fmt(rho(), { digits: 2 })}, ${names[0]} berubah dari ${pc(a[0].mean, 1)} menjadi ${pc(b[0].mean, 1)} dan ${names[1]} dari ${pc(a[1].mean, 1)} menjadi ${pc(b[1].mean, 1)}. Diacak bersamaan, nilainya dari ${pc(a[4].mean, 1)} menjadi ${pc(b[4].mean, 1)}: pasangan ini nilainya hampir sama, tetapi masing-masing tampak kurang penting karena yang lain menutupinya.`));
  }

  lab.onReset(() => {
    loadToken += 1; mode = 'generated'; seed = DEFAULT_SEED; groupBy = 'sex'; loading = false; loadFailed = false;
    controls.set('data', 'generated'); controls.set('groupBy', 'sex'); corr.set('rho', DEFAULT_CORRELATION);
    boxSplit.reset();
    rebuild(true);
  });
  lab.onTheme(() => { renderAll(); });
  lab.onResize(() => { renderAll(); });
  lab.cleanup(() => { destroyed = true; loadToken += 1; });
  rebuild(true);
  return lab.destroy;
}
