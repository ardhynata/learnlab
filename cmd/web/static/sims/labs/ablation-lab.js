// Feature ablation lab, built on the kit. The learner adds candidate features one at a time (tick them, or
// press "Add the next feature"). After every addition the lab shows two scores for the same model: the
// 5-fold cross-validated accuracy (mean, with every fold as a faint dot and a bar of one standard deviation)
// and the accuracy on ONE fixed train/test split, so a gain that only the single split shows, and that
// disappears across folds, can be seen. An ablation table removes one feature at a time; a toggle switches
// the high-cardinality category between naive target encoding (each row's own label counted, before the
// split: a leak) and out-of-fold encoding, and a chart compares both with leaving the category out.
//   Generated data: informative features, an interaction pair, noise columns and one text category with
//   200 values. Penguins (real): predict whether a penguin is male from measurements and engineered
//   features; rows with a missing value (NA) are dropped and the lab says how many.
// The math is in ml/ablationlab.js (on top of ml/featureeng.js and ml/validation.js); this file draws and wires.
import { createLab, dataModeSpec, loadDataset, predictBox, clusterColor, theme, tr, fmt, pct } from '../kit/index.js';
import { FEATURE_ORDER_GENERATED, PENGUIN_ORDER, makeCandidateData, penguinCandidates, makeEvaluator, forwardSteps, ablationRows, leakCheck, scoreAxis } from '../ml/ablationlab.js';
import { accuracyTicks } from '../ml/leakagelab.js';

export const DEFAULTS = {
  generated: { seed: 5, split: 2, fold: 1 },
  penguins: { split: 9, fold: 1 },
  start: 2,           // features already ticked when the lab opens
  folds: 5,
};
const LEAK_TOLERANCE = 0.02;   // naive and out-of-fold within two points: no visible leak

// ---- text (built when drawn, so it follows the language) ---------------------------------------------------

const points = d => fmt(d * 100, { digits: 1 });
const signedPoints = d => (Math.abs(d) < 0.0005 ? fmt(0, { digits: 1 }) : (d > 0 ? '+' : '−') + fmt(Math.abs(d) * 100, { digits: 1 }));
const score = r => `${pct(r.mean)} ± ${points(r.sd)}`;

const generatedDefs = () => ({
  x1: { label: 'x1', short: 'x1', kind: tr('real signal', 'sinyal nyata') },
  x2: { label: 'x2', short: 'x2', kind: tr('real signal, weaker', 'sinyal nyata, lebih lemah') },
  u: { label: 'u', short: 'u', kind: tr('only matters together with v', 'baru berarti bersama v') },
  v: { label: 'v', short: 'v', kind: tr('only matters together with u', 'baru berarti bersama u') },
  u_v: { label: 'u × v', short: 'u×v', kind: tr('the product of u and v', 'hasil kali u dan v') },
  z1: { label: 'z1', short: 'z1', kind: tr('pure noise', 'murni noise') },
  z2: { label: 'z2', short: 'z2', kind: tr('pure noise', 'murni noise') },
  z3: { label: 'z3', short: 'z3', kind: tr('pure noise', 'murni noise') },
  region: { label: tr('region (category)', 'region (category)'), short: 'region', kind: tr('high-cardinality category, a weak real effect', 'category dengan banyak nilai, efek nyata yang lemah') },
});
const penguinDefs = () => ({
  bill_depth: { label: tr('Bill depth (mm)', 'Kedalaman paruh (mm)'), short: tr('depth', 'dalam'), kind: tr('measured', 'hasil pengukuran') },
  island: { label: tr('Island (share of penguins on it)', 'Pulau (proporsi penguin di sana)'), short: tr('island', 'pulau'), kind: tr('encoded by how common it is, no labels used', 'di-encode dari seberapa umum, tanpa label') },
  flipper_length: { label: tr('Flipper length (mm)', 'Panjang sirip (mm)'), short: tr('flipper', 'sirip'), kind: tr('measured', 'hasil pengukuran') },
  year: { label: tr('Year', 'Tahun'), short: tr('year', 'tahun'), kind: tr('unrelated to sex', 'tidak berkaitan dengan jenis kelamin') },
  bill_length: { label: tr('Bill length (mm)', 'Panjang paruh (mm)'), short: tr('bill len.', 'pjg paruh'), kind: tr('measured', 'hasil pengukuran') },
  bill_ratio: { label: tr('Bill ratio (length ÷ depth)', 'Rasio paruh (panjang ÷ kedalaman)'), short: tr('ratio', 'rasio'), kind: tr('engineered from two measurements', 'rekayasa dari dua pengukuran') },
  flipper_sq: { label: tr('Flipper length squared', 'Panjang sirip kuadrat'), short: tr('flipper²', 'sirip²'), kind: tr('engineered from one measurement', 'rekayasa dari satu pengukuran') },
  body_mass: { label: tr('Body mass (g)', 'Massa tubuh (g)'), short: tr('mass', 'massa'), kind: tr('measured', 'hasil pengukuran') },
  bill_code: { label: tr('Bill length as a category', 'Panjang paruh sebagai category'), short: tr('bill code', 'kode paruh'), kind: tr('every distinct length is its own category', 'setiap panjang berbeda jadi category sendiri') },
});

const verdictText = {
  real: () => tr('Holds across folds', 'Bertahan di semua fold'),
  splitOnly: () => tr('Single split only', 'Hanya single split'),
  flat: () => tr('No real change', 'Tidak ada perubahan berarti'),
  worse: () => tr('Worse', 'Lebih buruk'),
};
const ablationText = {
  earns: () => tr('Earns its place', 'Layak dipertahankan'),
  noise: () => tr('Within the noise', 'Dalam rentang noise'),
  hurts: () => tr('Hurts: without it is better', 'Merugikan: tanpa ini lebih baik'),
};

// ---- canvas helpers ------------------------------------------------------------------------------------------

function prepare(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, w: width, h: height, t: theme() };
}

// points: [{ label, cv: { mean, sd, scores }, split }], baseline: the majority-class guess to beat.
function drawScores(canvas, spec) {
  const { ctx, w, h, t } = prepare(canvas);
  const m = { l: 50, r: 12, t: 14, b: 66 };
  const plotW = Math.max(60, w - m.l - m.r), plotH = Math.max(60, h - m.t - m.b);
  const all = spec.points.flatMap(p => [...p.cv.scores, p.split]).concat(spec.baseline);
  const { lo, hi } = scoreAxis(all);
  const Y = v => m.t + plotH - ((v - lo) / (hi - lo)) * plotH;
  const slot = plotW / spec.points.length;
  const X = i => m.l + slot * (i + 0.5);
  ctx.fillStyle = t.plot; ctx.fillRect(m.l, m.t, plotW, plotH);
  ctx.font = '11px system-ui, sans-serif'; ctx.lineWidth = 1; ctx.fillStyle = t.muted; ctx.strokeStyle = t.grid; ctx.textAlign = 'right';
  ctx.beginPath();
  for (const v of accuracyTicks(lo, hi, plotH, 34)) { ctx.moveTo(m.l, Y(v)); ctx.lineTo(m.l + plotW, Y(v)); ctx.fillText(`${fmt(v * 100, { max: 0 })}%`, m.l - 6, Y(v) + 4); }
  ctx.stroke();
  ctx.save(); ctx.translate(12, m.t + plotH / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center';
  ctx.fillText(tr('Accuracy', 'Akurasi'), 0, 0); ctx.restore();

  // The score every feature has to beat: always guessing the majority class.
  ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = t.muted; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(m.l, Y(spec.baseline)); ctx.lineTo(m.l + plotW, Y(spec.baseline)); ctx.stroke(); ctx.restore();

  const cvColor = clusterColor(0), splitColor = clusterColor(1);
  const dx = Math.min(8, slot * 0.2);
  const line = (key, offset, color, dash) => {
    if (spec.points.length < 2) return;
    ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = color; ctx.lineWidth = 1.5; if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    spec.points.forEach((p, i) => { const v = key === 'cv' ? p.cv.mean : p.split; (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(i) + offset, Y(v)); });
    ctx.stroke(); ctx.restore();
  };
  line('cv', -dx, cvColor); line('split', dx, splitColor, [4, 3]);

  spec.points.forEach((p, i) => {
    const x = X(i) - dx;
    // every fold's own score, faint
    p.cv.scores.forEach((s, j) => {
      ctx.beginPath(); ctx.arc(x + (j - (p.cv.scores.length - 1) / 2) * 2.2, Y(s), 2.2, 0, 2 * Math.PI);
      ctx.globalAlpha = 0.35; ctx.fillStyle = cvColor; ctx.fill(); ctx.globalAlpha = 1;
    });
    // mean with a bar of one standard deviation
    const up = Y(Math.min(hi, p.cv.mean + p.cv.sd)), down = Y(Math.max(lo, p.cv.mean - p.cv.sd));
    ctx.strokeStyle = t.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, up); ctx.lineTo(x, down); ctx.moveTo(x - 4, up); ctx.lineTo(x + 4, up); ctx.moveTo(x - 4, down); ctx.lineTo(x + 4, down); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, Y(p.cv.mean), 5, 0, 2 * Math.PI); ctx.fillStyle = cvColor; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = t.plot; ctx.stroke();
    // the single split
    const sx = X(i) + dx, sy = Y(p.split), r = 6;
    ctx.beginPath(); ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r, sy); ctx.lineTo(sx, sy + r); ctx.lineTo(sx - r, sy); ctx.closePath();
    ctx.fillStyle = splitColor; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = t.ink; ctx.stroke();
    // feature name under the axis, slanted so ten names fit on a phone
    ctx.save(); ctx.translate(X(i) + 3, m.t + plotH + 12); ctx.rotate(-Math.PI / 4); ctx.textAlign = 'right';
    ctx.font = `${i === spec.points.length - 1 ? '700 ' : ''}11px system-ui, sans-serif`; ctx.fillStyle = i === 0 ? t.muted : t.ink;
    ctx.fillText(p.label, 0, 0); ctx.restore();
  });
  if (spec.points.length === 1) {
    // Drawn in whichever of the top and bottom strips is farther from the single point, on a plot-coloured pill, so
    // the bar and the fold dots never strike through it.
    const text = tr('Tick a feature, or press "Add the next feature".', 'Centang sebuah feature, atau tekan "Tambah feature berikutnya".');
    ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'center';
    const top = m.t + 22, bottom = m.t + plotH - 14;
    const cy = Math.abs(top - Y(spec.points[0].cv.mean)) >= Math.abs(bottom - Y(spec.points[0].cv.mean)) ? top : bottom;
    const tw = Math.min(plotW - 8, ctx.measureText(text).width + 16);
    ctx.fillStyle = t.plot; ctx.fillRect(m.l + plotW / 2 - tw / 2, cy - 15, tw, 22);
    ctx.fillStyle = t.muted; ctx.fillText(text, m.l + plotW / 2, cy, plotW - 8);
  }
}

// lanes: [{ label, mean, sd, color }]; horizontal bars from the left edge of a zoomed accuracy axis.
function drawLeak(canvas, lanes) {
  const { ctx, w, h, t } = prepare(canvas);
  const m = { l: 12, r: 14, t: 6, b: 38 };
  const plotW = Math.max(60, w - m.l - m.r), plotH = h - m.t - m.b;
  const { lo, hi } = scoreAxis(lanes.flatMap(l => [l.mean - l.sd, l.mean + l.sd]));
  const X = v => m.l + ((v - lo) / (hi - lo)) * plotW;
  ctx.fillStyle = t.plot; ctx.fillRect(m.l, m.t, plotW, plotH);
  ctx.font = '11px system-ui, sans-serif'; ctx.lineWidth = 1; ctx.fillStyle = t.muted; ctx.strokeStyle = t.grid; ctx.textAlign = 'center';
  ctx.beginPath();
  for (const v of accuracyTicks(lo, hi, plotW, 46)) { ctx.moveTo(X(v), m.t); ctx.lineTo(X(v), m.t + plotH); ctx.fillText(`${fmt(v * 100, { max: 0 })}%`, X(v), m.t + plotH + 14); }
  ctx.stroke();
  ctx.fillText(tr('Cross-validated accuracy', 'Akurasi cross-validation'), m.l + plotW / 2, h - 6);
  const laneH = plotH / lanes.length;
  lanes.forEach((ln, i) => {
    const y0 = m.t + i * laneH, bar = Math.min(22, laneH * 0.34), by = y0 + laneH - bar - 10;
    ctx.font = '600 12px system-ui, sans-serif'; ctx.fillStyle = t.ink; ctx.textAlign = 'left';
    ctx.fillText(ln.label, m.l + 8, y0 + 18);
    ctx.fillStyle = ln.color; ctx.fillRect(m.l, by, Math.max(2, X(ln.mean) - m.l), bar);
    ctx.strokeStyle = t.ink; ctx.lineWidth = 2;
    const cy = by + bar / 2;
    ctx.beginPath(); ctx.moveTo(X(ln.mean - ln.sd), cy); ctx.lineTo(X(ln.mean + ln.sd), cy); ctx.moveTo(X(ln.mean - ln.sd), cy - 5); ctx.lineTo(X(ln.mean - ln.sd), cy + 5); ctx.moveTo(X(ln.mean + ln.sd), cy - 5); ctx.lineTo(X(ln.mean + ln.sd), cy + 5); ctx.stroke(); ctx.lineWidth = 1;
    // the value sits at the right end of the lane's header line, clear of bar and whisker
    ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = t.ink;
    ctx.fillText(score(ln), m.l + plotW - 8, y0 + 18);
  });
}

// ---- mount -------------------------------------------------------------------------------------------------------

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Adding features: do the gains survive cross-validation?', 'Menambah feature: apakah peningkatannya bertahan di cross-validation?'),
    hint: tr(
      'Add features one at a time. Each step shows the 5-fold cross-validated score (dots: the folds, bar: one standard deviation) next to the score on one fixed split (diamond). A gain counts only if it is bigger than the spread across folds.',
      'Tambahkan feature satu per satu. Tiap langkah menampilkan skor cross-validation 5 fold (titik: tiap fold, garis: satu simpangan baku) di samping skor pada satu split tetap (belah ketupat). Peningkatan hanya berarti jika lebih besar daripada sebaran antar fold.'),
    status: true, legend: true,
    canvasLabel: tr('Chart of the cross-validated score and the single-split score after each added feature', 'Grafik skor cross-validation dan skor single split setelah setiap feature ditambahkan'),
  });
  lab.canvas.setAttribute('role', 'img');
  lab.canvas.removeAttribute('tabindex');
  lab.canvas.style.setProperty('--plot-h', 'clamp(300px, 46vw, 400px)');
  const legendHost = lab.ref('legend');
  if (legendHost) legendHost.style.maxHeight = 'none';

  // ---- cards under the plot: steps, ablation, leak ----
  const style = document.createElement('style');
  style.textContent = [
    '.ab-features{border:0;margin:14px 0 0;padding:0;min-width:0}',
    '.ab-features legend{padding:0;font-size:13px;font-weight:650}',
    '.ab-features .toggle{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:start;gap:0 8px;margin-top:6px}',
    '.ab-features .f-pos{font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums;padding-top:2px}',
    '.ab-features .f-kind{grid-column:2 / 4;margin:1px 0 0;font-size:12px;font-weight:400;color:var(--muted)}',
    '.ab-next{margin:12px 0 0;font-size:13px;font-weight:650}',
    '.ab-note{margin:12px 0 0;font-size:13px}',
    '.table-card .ab-table{width:100%}',
    '.ab-table th:not(.num),.ab-table td:not(.num){text-align:left;white-space:normal}',
    '.ab-table .num{text-align:right;font-variant-numeric:tabular-nums}',
    '.ab-table td[data-v]::after{content:attr(data-v);display:none;font-size:11px;font-weight:400;color:var(--muted)}',
    '@media (max-width:640px){.ab-card{padding:14px 10px}.ab-card .hint,.ab-card .lab-h{padding:0 4px}.ab-table .vcol,.ab-table .ncol{display:none}.ab-table th,.ab-table td{padding:6px 3px!important;font-size:11.5px}.ab-table td[data-v]::after{display:block}.ab-table{font-size:12px}.ab-table th,.ab-table td{white-space:normal;padding:6px 5px}.ab-table td.num{white-space:nowrap}.ab-table th.num{white-space:normal}}',
  ].join('');
  lab.root.prepend(style);

  const stepsCard = makeTableCard(tr('Score after each added feature', 'Skor setelah tiap feature ditambahkan'), tr('Gains are in percentage points, computed before the scores are rounded, so they can differ by 0.1 from a subtraction of the printed scores. The verdict compares the cross-validated gain with the spread (standard deviation) across the folds.', 'Selisih dalam poin persentase, dihitung sebelum skor dibulatkan, jadi bisa berbeda 0,1 dari hasil pengurangan skor yang tertulis. Vonisnya membandingkan peningkatan cross-validation dengan sebaran (simpangan baku) antar fold.'));
  const stepsHint = stepsCard.hint.textContent;
  const ablCard = makeTableCard(tr('Remove one feature at a time', 'Buang satu feature pada satu waktu'), tr('Each row scores the model without that feature. A drop smaller than the spread across folds is within the noise.', 'Tiap baris menilai model tanpa feature itu. Penurunan yang lebih kecil daripada sebaran antar fold masih dalam rentang noise.'));
  const leakCanvas = lab.chartCard(
    tr('The category feature: out-of-fold or naive encoding', 'Feature category: encoding out-of-fold atau naive'),
    tr('Cross-validated score of your ticked features with the category left out, encoded out of fold, and encoded naively (every row\'s own label counted, before the split).', 'Skor cross-validation feature yang kamu centang dengan category dibuang, di-encode out-of-fold, dan di-encode secara naive (label setiap baris ikut dihitung, sebelum split).'),
    230);
  const leakOut = document.createElement('p');
  leakOut.className = 'ab-note'; leakOut.setAttribute('role', 'status');
  leakCanvas.closest('.card').append(leakOut);
  const below = lab.ref('below');
  below.prepend(ablCard.card); below.prepend(stepsCard.card);   // table cards first, then the leak chart

  function makeTableCard(title, hint) {
    const card = document.createElement('section');
    card.className = 'card table-card ab-card';
    const h = document.createElement('h2'); h.className = 'lab-h'; h.textContent = title;
    const p = document.createElement('p'); p.className = 'hint'; p.textContent = hint;
    const scroll = document.createElement('div'); scroll.className = 'table-scroll';
    card.append(h, p, scroll);
    return { card, scroll, hint: p };
  }

  // ---- state ----
  let mode = 'generated', sample = 0, splitN = 0, encoding = 'outOfFold', reveal = false;
  let chosen = [], lastAdded = null, real = null, loading = false, loadFailed = false, loadToken = 0, destroyed = false;
  let armedA = false, armedB = false, lastSteps = null, lastLeak = null;
  const tables = new Map(), evaluators = new Map(), leaks = new Map();

  const controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real)', 'Penguin (data nyata)')]] }),
    { name: 'next', type: 'button', label: tr('Add the next feature', 'Tambah feature berikutnya'), group: tr('Features', 'Feature'), onClick: () => { const k = nextKey(); if (k) addFeature(k); } },
    { name: 'clear', type: 'button', label: tr('Remove all features', 'Hapus semua feature'), onClick: () => { chosen = []; lastAdded = null; settle(false); } },
    { name: 'sample', type: 'button', label: tr('New sample', 'Sampel baru'), group: tr('Data and splits', 'Data dan split'), onClick: () => { sample += 1; leaks.clear(); settle(false); } },
    { name: 'split', type: 'button', label: tr('Another single split', 'Single split lain'), onClick: () => { splitN += 1; settle(false); } },
    { name: 'encoding', type: 'select', label: tr('Target encoding of the category feature', 'Target encoding untuk feature category'), value: encoding, options: [['outOfFold', tr('Out-of-fold (honest)', 'Out-of-fold (jujur)')], ['naive', tr('Naive (leakage)', 'Naive (leakage)')]] },
    { type: 'note', text: tr('Changes the scores only while the category feature is ticked.', 'Hanya mengubah skor selama feature category dicentang.') },
    { name: 'reveal', type: 'toggle', label: tr('Show what each feature really is', 'Tampilkan sebenarnya tiap feature itu apa'), value: false },
  ], name => {
    if (name === 'data') { setMode(controls.get('data')); return; }
    if (name === 'encoding') {
      encoding = controls.get('encoding');
      settle(false);
      if (armedB) revealLeak();
      return;
    }
    if (name === 'reveal') { reveal = controls.get('reveal'); paintChecklist(); }
  });
  const dataNote = document.createElement('p');
  dataNote.className = 'hint';
  dataNote.setAttribute('role', 'status');
  controls.el.querySelector('select').closest('label').after(dataNote);

  // The checklist of candidate features sits right under the data note.
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'ab-features';
  const legend = document.createElement('legend');
  fieldset.append(legend);
  const nextLine = document.createElement('p');
  nextLine.className = 'ab-next';
  dataNote.after(nextLine);
  // buttons first, then the checklist, then the settings that matter less
  controls.el.querySelectorAll('select')[1].closest('label').before(fieldset);

  const boxAdd = predictBox(lab.ref('below'), {
    hint: tr('Add the feature, then check again.', 'Tambahkan feature-nya, lalu periksa lagi.'),
    name: 'predict-add',
    question: tr('Will adding this feature improve the cross-validated score?', 'Apakah menambahkan feature ini akan memperbaiki skor cross-validation?'),
    choices: [
      ['better', tr('Yes, by more than the spread across folds', 'Ya, lebih besar daripada sebaran antar fold')],
      ['flat', tr('No, about the same: any change is within the noise', 'Tidak, hampir sama: perubahannya masih dalam noise')],
      ['worse', tr('No, it gets worse', 'Tidak, justru memburuk')],
    ],
  });
  const boxLeak = predictBox(lab.ref('below'), {
    hint: tr('Switch the target encoding, then check again.', 'Ganti target encoding, lalu periksa lagi.'),
    name: 'predict-leak',
    question: tr('Naive target encoding counts each row\'s own label in its own feature. What does that do to the cross-validated score of the category feature?', 'Target encoding naive menghitung label setiap baris di feature milik baris itu sendiri. Apa akibatnya pada skor cross-validation feature category?'),
    choices: [
      ['up', tr('It goes up: the score looks better than it is', 'Naik: skornya tampak lebih baik daripada kenyataannya')],
      ['same', tr('It stays about the same', 'Hampir tidak berubah')],
      ['down', tr('It goes down', 'Turun')],
    ],
  });
  // The question names the feature about to be added; this line follows the checklist.
  const addNext = document.createElement('p');
  addNext.className = 'predict-next'; addNext.style.cssText = 'margin:0 0 8px;font-size:13px;font-weight:650';
  boxAdd.root.querySelector('.predict-q').after(addNext);
  // While the feedback describes the feature just added, a header naming the NEXT one would contradict it.
  const addFeedback = boxAdd.root.querySelector('.predict-feedback');
  const syncAddNext = () => { addNext.hidden = !!addFeedback?.textContent && !addFeedback.classList.contains('none'); };
  const addObserver = new MutationObserver(syncAddNext);
  if (addFeedback) addObserver.observe(addFeedback, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  lab.cleanup(() => { addObserver.disconnect(); boxAdd.destroy(); boxLeak.destroy(); });
  boxAdd.onPick(() => { armedA = true; });
  boxAdd.onCheck(() => revealAdd());
  boxLeak.onPick(() => { armedB = true; });
  boxLeak.onCheck(() => revealLeak());

  // ---- data ----
  const seeds = () => (mode === 'generated'
    ? { data: DEFAULTS.generated.seed + sample, fold: DEFAULTS.generated.fold, split: DEFAULTS.generated.split + splitN }
    : { data: 0, fold: DEFAULTS.penguins.fold + sample, split: DEFAULTS.penguins.split + splitN });

  function context() {
    if (mode === 'penguins' && !real) return null;
    const s = seeds();
    const tkey = `${mode}|${s.data}`;
    if (!tables.has(tkey)) tables.set(tkey, mode === 'generated' ? makeCandidateData({ seed: s.data }) : real);
    const table = tables.get(tkey);
    const ekey = `${tkey}|${s.fold}|${s.split}|${encoding}`;
    if (!evaluators.has(ekey)) evaluators.set(ekey, makeEvaluator(table, { encoding, k: DEFAULTS.folds, foldSeed: s.fold, splitSeed: s.split }));
    return { table, ev: evaluators.get(ekey), s, tkey, defs: mode === 'generated' ? generatedDefs() : penguinDefs() };
  }
  const categoryKey = table => table.order.find(k => table.kinds[k] === 'category');
  const nextKey = () => { const c = context(); return c ? c.table.order.find(k => !chosen.includes(k)) ?? null : null; };

  async function setMode(next) {
    const token = ++loadToken;
    chosen = []; lastAdded = null; sample = 0; splitN = 0; loadFailed = false;
    armedA = false; boxAdd.reset(); boxLeak.reset(); armedB = false;
    if (next === 'generated') { mode = 'generated'; loading = false; chosen = startSet(); buildChecklist(); settle(false); return; }
    loading = true; mode = next; render();
    try {
      const table = await loadDataset(next);
      if (destroyed || token !== loadToken) return;
      real = penguinCandidates(table);
      loading = false;
    } catch {
      if (destroyed || token !== loadToken) return;
      loading = false; loadFailed = true; mode = 'generated';
      controls.set('data', 'generated');
    }
    chosen = startSet(); buildChecklist(); settle(false);
  }
  const startSet = () => (mode === 'penguins' ? PENGUIN_ORDER : FEATURE_ORDER_GENERATED).slice(0, DEFAULTS.start);

  // ---- features ----
  function buildChecklist() {
    const defs = mode === 'generated' || !real ? generatedDefs() : penguinDefs();
    const order = mode === 'generated' || !real ? FEATURE_ORDER_GENERATED : real.order;
    legend.textContent = tr('Candidate features', 'Feature kandidat');
    fieldset.querySelector('.rows')?.remove();
    const rows = document.createElement('div'); rows.className = 'rows'; fieldset.append(rows);
    for (const key of order) {
      const label = document.createElement('label');
      label.className = 'toggle';
      const input = document.createElement('input');
      input.type = 'checkbox'; input.dataset.key = key;
      input.addEventListener('change', () => { if (input.checked) addFeature(key); else removeFeature(key); });
      const name = document.createElement('span'); name.textContent = defs[key].label;
      const pos = document.createElement('span'); pos.className = 'f-pos'; pos.setAttribute('aria-hidden', 'true');
      const kind = document.createElement('span'); kind.className = 'f-kind'; kind.textContent = `(${defs[key].kind})`; kind.hidden = true;
      label.append(input, name, pos, kind);
      rows.append(label);
    }
  }
  function paintChecklist() {
    const c = context();
    const defs = c?.defs ?? generatedDefs();
    fieldset.querySelectorAll('label').forEach(label => {
      const input = label.querySelector('input'), i = chosen.indexOf(input.dataset.key);
      input.checked = i >= 0;
      input.disabled = loading;
      label.querySelector('.f-pos').textContent = i >= 0 ? `#${fmt(i + 1)}` : '';
      const kind = label.querySelector('.f-kind');
      kind.hidden = !reveal;
      if (defs[input.dataset.key]) kind.textContent = `(${defs[input.dataset.key].kind})`;
    });
  }
  function addFeature(key) {
    if (chosen.includes(key)) return;
    if (boxAdd.answered && !armedA) boxAdd.reset();
    chosen.push(key); lastAdded = key;
    settle(true);
  }
  function removeFeature(key) {
    chosen = chosen.filter(k => k !== key);
    if (lastAdded === key) lastAdded = null;
    settle(false);
  }

  // ---- quick quizzes ----
  function revealAdd() {
    const c = context();
    if (!c || !lastSteps || !lastAdded) return;
    const i = lastSteps.steps.findIndex(s => s.feature === lastAdded);
    if (i < 0) return;
    const st = lastSteps.steps[i], prev = i ? lastSteps.steps[i - 1] : lastSteps.baseline;
    const prevCv = prev.cv.mean, prevSplit = prev.split;
    const actual = st.verdict === 'real' ? 'better' : st.verdict === 'worse' ? 'worse' : 'flat';
    const name = c.defs[st.feature].label;
    let text = tr(
      `You added ${name}: the cross-validated score went from ${pct(prevCv)} to ${pct(st.cv.mean)} (${signedPoints(st.cvGain)} points; spread across folds ${points(st.cv.sd)} points). On the single split it went from ${pct(prevSplit)} to ${pct(st.split)} (${signedPoints(st.splitGain)} points).`,
      `Kamu menambahkan ${name}: skor cross-validation berubah dari ${pct(prevCv)} menjadi ${pct(st.cv.mean)} (${signedPoints(st.cvGain)} poin; sebaran antar fold ${points(st.cv.sd)} poin). Pada single split berubah dari ${pct(prevSplit)} menjadi ${pct(st.split)} (${signedPoints(st.splitGain)} poin).`);
    if (st.verdict === 'splitOnly') text += ' ' + tr('The single split looks better, but the folds do not confirm it: a gain that does not survive cross-validation.', 'Single split tampak lebih baik, tetapi fold lain tidak membenarkannya: peningkatan yang tidak bertahan di cross-validation.');
    boxAdd.reveal(actual, text);
    armedA = false;
  }
  function revealLeak() {
    if (!lastLeak) return;
    const l = lastLeak, d = l.naive.mean - l.outOfFold.mean;
    const actual = d > LEAK_TOLERANCE ? 'up' : d < -LEAK_TOLERANCE ? 'down' : 'same';
    const nums = tr(
      `Naive ${pct(l.naive.mean)}, out-of-fold ${pct(l.outOfFold.mean)}, category left out ${pct(l.without.mean)}.`,
      `Naive ${pct(l.naive.mean)}, out-of-fold ${pct(l.outOfFold.mean)}, category dibuang ${pct(l.without.mean)}.`);
    const why = actual === 'up'
      ? tr('The extra points are the rows\' own labels leaking into the feature, not information that carries over to new rows.', 'Poin ekstra itu berasal dari label baris yang bocor ke dalam feature, bukan informasi yang berlaku untuk baris baru.')
      : tr('Here the two are within two points of each other, so the leak does not show with these features. Try another sample, or tick fewer features.', 'Di sini keduanya berbeda kurang dari dua poin, jadi leakage tidak terlihat pada feature ini. Coba sampel lain, atau centang lebih sedikit feature.');
    boxLeak.reveal(actual, `${nums} ${why}`);
    armedB = false;
  }

  // ---- drawing ----
  function render() {
    const c = context();
    paintChecklist();
    controls.disable('next', loading); controls.disable('clear', loading || !chosen.length);
    controls.disable('sample', loading); controls.disable('split', loading);
    if (!c) {
      lab.setStatus(tr('Loading the penguin data…', 'Memuat data penguin…'));
      lab.setDetail(''); lab.setMetrics(''); lab.setLegend([]);
      return;
    }
    const { table, ev, s, defs } = c;
    const order = chosen.filter(k => table.order.includes(k));
    const f = forwardSteps(order, ev);
    lastSteps = f;
    const base = ev.cv([]);
    const pointsData = [{ label: tr('none', 'kosong'), cv: base, split: f.baseline.split }]
      .concat(f.steps.map(st => ({ label: defs[st.feature].short, cv: ev.cv(st.features), split: st.split })));
    drawScores(lab.canvas, { points: pointsData, baseline: base.mean });

    // status, detail, metrics, legend
    const last = f.steps.at(-1);
    const cat = categoryKey(table);
    if (last) {
      const n = f.steps.length;
      let msg = tr(
        `${fmt(n)} ${n === 1 ? 'feature' : 'features'}: cross-validated ${score(last.cv)} points over ${fmt(DEFAULTS.folds)} folds, single split ${pct(last.split)}.`,
        `${fmt(n)} feature: cross-validation ${score(last.cv)} poin dari ${fmt(DEFAULTS.folds)} fold, single split ${pct(last.split)}.`);
      if (order.includes(cat) && encoding === 'naive') msg += ' ' + tr('The category is encoded naively, so these scores are inflated by leaked labels.', 'Category di-encode secara naive, sehingga skor ini terdongkrak oleh label yang bocor.');
      lab.setStatus(msg);
    } else lab.setStatus(tr(
      `No feature yet. Guessing the majority class scores ${pct(base.mean)} (cross-validated).`,
      `Belum ada feature. Menebak kelas mayoritas memberi skor ${pct(base.mean)} (cross-validation).`));
    const nk = table.order.find(k => !chosen.includes(k));
    nextLine.textContent = nk ? tr(`Next feature: ${defs[nk].label}`, `Feature berikutnya: ${defs[nk].label}`) : tr('All features are added.', 'Semua feature sudah ditambahkan.');
    addNext.textContent = nk ? tr(`This feature: ${defs[nk].label}`, `Feature ini: ${defs[nk].label}`) : tr('All features are added.', 'Semua feature sudah ditambahkan.');
    controls.disable('next', !nk);
    lab.setDetail(tr(
      `Single split: ${fmt(ev.splitIndices.train.length)} rows to fit, ${fmt(ev.splitIndices.test.length)} to test, the same rows at every step. Cross-validation: each of the ${fmt(DEFAULTS.folds)} folds is the test set once.`,
      `Single split: ${fmt(ev.splitIndices.train.length)} baris untuk melatih, ${fmt(ev.splitIndices.test.length)} untuk menguji, baris yang sama di setiap langkah. Cross-validation: tiap ${fmt(DEFAULTS.folds)} fold menjadi test set satu kali.`));
    lab.setMetrics(tr(`${fmt(table.n)} rows, ${fmt(DEFAULTS.folds)} folds`, `${fmt(table.n)} baris, ${fmt(DEFAULTS.folds)} fold`));
    lab.setLegend([
      { kind: 'dot', color: clusterColor(0), label: tr('Cross-validated mean (faint dots: the folds; bar: ± 1 standard deviation)', 'Rata-rata cross-validation (titik pudar: tiap fold; garis: ± 1 simpangan baku)') },
      { kind: 'diamond', color: clusterColor(1), label: tr('Single fixed split', 'Single split tetap') },
      { kind: 'dash', color: theme().muted, label: tr('Guessing the majority class', 'Menebak kelas mayoritas') },
    ]);
    lab.describe(lab.canvas, tr('Score after each step. ', 'Skor setiap langkah. ') + [`${tr('none', 'kosong')}: ${pct(base.mean)}, ${pct(f.baseline.split)}`]
      .concat(f.steps.map(st => `${defs[st.feature].label}: ${pct(st.cv.mean)}, ${pct(st.split)}`)).join('; ') + '. ' + tr('Each entry: cross-validated mean, single split.', 'Tiap entri: rata-rata cross-validation, single split.'));

    dataNote.textContent = dataNoteText(table);
    stepsTable(f, defs, base);
    ablationTable(order, ev, defs);
    leakPanel(c, order, cat);
  }

  function dataNoteText(table) {
    if (loadFailed) return tr('Could not load the penguin data, so the generated data is shown.', 'Data penguin tidak bisa dimuat, jadi data buatan yang ditampilkan.');
    const cat = categoryKey(table), distinct = new Set(table.category[cat]).size;
    if (mode === 'penguins') {
      return tr(
        `${fmt(table.n)} of ${fmt(table.total)} penguins are complete; ${fmt(table.dropped)} rows with a missing value (NA) are dropped. Goal: is the penguin male? The category feature has ${fmt(distinct)} distinct values.`,
        `${fmt(table.n)} dari ${fmt(table.total)} penguin lengkap; ${fmt(table.dropped)} baris dengan missing value (NA) dibuang. Tujuan: apakah penguin itu jantan? Feature category punya ${fmt(distinct)} nilai berbeda.`);
    }
    return tr(
      `Generated: ${fmt(table.n)} rows, ${fmt(table.order.length)} candidate features, a 0/1 goal. The category feature region has ${fmt(distinct)} distinct values.`,
      `Data buatan: ${fmt(table.n)} baris, ${fmt(table.order.length)} feature kandidat, tujuan 0/1. Feature category region punya ${fmt(distinct)} nilai berbeda.`);
  }

  function tableOf(scroll, heads) {
    const t = document.createElement('table');
    t.className = 'ab-table';
    const tr0 = t.createTHead().insertRow();
    heads.forEach(([text, numeric, cls]) => { const th = document.createElement('th'); th.textContent = text; th.scope = 'col'; th.className = [numeric ? 'num' : '', cls ?? ''].join(' ').trim(); tr0.append(th); });
    const body = t.createTBody();
    scroll.replaceChildren(t);
    return (cells) => {
      const row = body.insertRow();
      cells.forEach(([text, numeric, bold, cls, note]) => { const td = row.insertCell(); td.textContent = text; td.className = [numeric ? 'num' : '', cls ?? ''].join(' ').trim(); if (note) td.dataset.v = note; if (bold) td.style.fontWeight = '700'; });
    };
  }
  function stepsTable(f, defs, base) {
    // With nearly balanced classes the training-fold majority can be the minority of the test fold, so the guess scores under 50%.
    stepsCard.hint.textContent = base.mean < 0.5
      ? `${stepsHint} ${tr('Why the "none" row is under 50%: with nearly balanced classes, always guessing the majority of the training fold can score below 50% on the held-out fold.', 'Mengapa baris "kosong" di bawah 50%: pada kelas yang hampir seimbang, selalu menebak mayoritas fold latih bisa memberi skor di bawah 50% pada fold uji.')}`
      : stepsHint;
    const add = tableOf(stepsCard.scroll, [
      ['#', true, 'ncol'], [tr('Feature added', 'Feature ditambahkan')], [tr('Cross-validated', 'Cross-validation'), true], [tr('Gain', 'Selisih'), true],
      [tr('Single split', 'Single split'), true], [tr('Gain', 'Selisih'), true], [tr('Verdict', 'Vonis'), false, 'vcol']]);
    add([[fmt(0), true, false, 'ncol'], [tr('none (guess the majority)', 'kosong (tebak mayoritas)')], [score(base), true], ['–', true], [pct(f.baseline.split), true], ['–', true], ['–', false, false, 'vcol']]);
    f.steps.forEach((st, i) => add([
      [fmt(i + 1), true, false, 'ncol'], [defs[st.feature].label, false, false, '', verdictText[st.verdict]()], [score(st.cv), true], [signedPoints(st.cvGain), true, st.verdict === 'real'],
      [pct(st.split), true], [signedPoints(st.splitGain), true], [verdictText[st.verdict](), false, st.verdict === 'splitOnly', 'vcol']]));
  }
  function ablationTable(order, ev, defs) {
    if (!order.length) {
      const p = document.createElement('p'); p.className = 'hint';
      p.textContent = tr('Add at least one feature to see what removing it costs.', 'Tambahkan minimal satu feature untuk melihat akibat membuangnya.');
      ablCard.scroll.replaceChildren(p);
      return;
    }
    const a = ablationRows(order, ev);
    const add = tableOf(ablCard.scroll, [[tr('Feature removed', 'Feature dibuang')], [tr('Score without it', 'Skor tanpa ini'), true], [tr('Drop (points)', 'Turun (poin)'), true], [tr('Verdict', 'Vonis'), false, 'vcol']]);
    add([[tr(`All ${fmt(order.length)} ticked features`, `Semua ${fmt(order.length)} feature yang dicentang`)], [score(a.full), true], ['–', true], ['–', false, false, 'vcol']]);
    a.rows.forEach(r => add([[defs[r.feature].label, false, false, '', ablationText[r.verdict]()], [score(r.without), true], [signedPoints(r.drop), true, r.verdict === 'earns'], [ablationText[r.verdict](), false, r.verdict === 'earns', 'vcol']]));
  }
  function leakPanel(c, order, cat) {
    const key = `${c.tkey}|${c.s.fold}|${[...order].sort().join(',')}`;
    if (!leaks.has(key)) leaks.set(key, leakCheck(c.table, order, cat, { k: DEFAULTS.folds, foldSeed: c.s.fold, splitSeed: c.s.split }));
    const l = leaks.get(key);
    lastLeak = l;
    const defs = c.defs;
    const catName = defs[cat].label;
    drawLeak(leakCanvas, [
      { label: tr('Left out', 'Dibuang'), mean: l.without.mean, sd: l.without.sd, color: clusterColor(2) },
      { label: tr('Out-of-fold', 'Out-of-fold'), mean: l.outOfFold.mean, sd: l.outOfFold.sd, color: clusterColor(0) },
      { label: tr('Naive (leaks)', 'Naive (leakage)'), mean: l.naive.mean, sd: l.naive.sd, color: clusterColor(1) },
    ]);
    const d = l.naive.mean - l.outOfFold.mean;
    leakOut.textContent = tr(
      `With ${catName}: naive ${pct(l.naive.mean)}, out-of-fold ${pct(l.outOfFold.mean)}, left out ${pct(l.without.mean)}. ${d > LEAK_TOLERANCE ? `Naive is ${points(d)} points higher: those points are the rows' own labels, not information that carries over to new rows.` : 'Naive and out-of-fold are within two points here.'}`,
      `Dengan ${catName}: naive ${pct(l.naive.mean)}, out-of-fold ${pct(l.outOfFold.mean)}, dibuang ${pct(l.without.mean)}. ${d > LEAK_TOLERANCE ? `Naive lebih tinggi ${points(d)} poin: poin itu berasal dari label baris itu sendiri, bukan informasi yang berlaku untuk baris baru.` : 'Naive dan out-of-fold berbeda kurang dari dua poin di sini.'}`);
    lab.describe(leakCanvas, leakOut.textContent);
  }

  // After a complete change: redraw; after an addition, check the prediction made before it.
  function settle(added) {
    render();
    if (added && armedA) revealAdd();
  }

  lab.onReset(() => {
    loadToken += 1;
    mode = 'generated'; sample = 0; splitN = 0; encoding = 'outOfFold'; reveal = false; loading = false; loadFailed = false; lastAdded = null;
    controls.set('data', 'generated'); controls.set('encoding', 'outOfFold'); controls.set('reveal', false);
    chosen = startSet();
    armedA = false; armedB = false; boxAdd.reset(); boxLeak.reset();
    buildChecklist(); render();
  });
  lab.onTheme(render);
  lab.onResize(render);
  lab.cleanup(() => { destroyed = true; loadToken += 1; });
  chosen = startSet();
  buildChecklist();
  render();
  return lab.destroy;
}
