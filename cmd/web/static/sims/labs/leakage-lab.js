// Leakage lab, built on the kit: two pipelines see the same data and the same split. One fits its
// preprocessing AFTER splitting (correct), the other BEFORE (leak).
//   Generated data: a table of random noise features with random labels. Both pipelines keep the
//   features that correlate best with the labels; the leaky one looks at ALL labels, test rows included.
//   Penguins (real): median imputation of the real NA values plus standardization, fitted on all rows
//   versus the training rows only. The lab says honestly that this leak barely shows in the score.
// The math is in ml/leakage.js and ml/leakagelab.js; this file draws and wires.
import { createLab, dataModeSpec, loadDataset, predictBox, clusterColor, theme, tr, fmt, pct } from '../kit/index.js';
import { makeNoiseTable, runPipelines, repeatSplits, runPreprocessing, repeatPreprocessing } from '../ml/leakage.js';
import {
  penguinTask, meanAbsCorrelation, sharedCount, firstColumns, stackDots, accuracyAxis, accuracyTicks,
  leakageOutcome, preprocessingOutcome, mean,
} from '../ml/leakagelab.js';

export const DEFAULTS = { rows: 60, noise: 500, keep: 10, model: 'logistic', dataSeed: 1, splitSeed: 1 };
const REPEAT_TIMES = 50;
const REPEAT_BASE = 100;   // seeds of the repeated splits: 100.., then 150.. for the next press
const CHUNK = 5;           // splits per timer tick, so the page stays responsive at the biggest settings
const REAL_TRAIN = 0.7;
const KEEP_MAX = 50;       // the most features the slider offers; it is capped by the noise slider as well

// The order of the answers is shuffled once per page visit, so the right one is not always in the same place.
const shuffled = list => {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// Names built when drawn, so they follow the language.
const names = () => ({
  correct: tr('Fit preprocessing after splitting (correct)', 'Fit preprocessing setelah data dibagi (benar)'),
  leaky: tr('Fit preprocessing before splitting (leak)', 'Fit preprocessing sebelum data dibagi (leakage)'),
  correctShort: tr('Correct pipeline', 'Pipeline yang benar'),
  leakyShort: tr('Leaky pipeline', 'Pipeline yang bocor'),
});
const featureNames = () => [
  tr('bill length (mm)', 'panjang paruh (mm)'),
  tr('bill depth (mm)', 'kedalaman paruh (mm)'),
  tr('flipper length (mm)', 'panjang sirip (mm)'),
  tr('body mass (g)', 'massa tubuh (g)'),
];

const signed = (d, digits = 2) => {
  if (!Number.isFinite(d)) return '–';
  if (Math.abs(d) < 0.5 * 10 ** -digits) return fmt(0, { digits });
  return (d > 0 ? '+' : '') + fmt(d, { digits });
};
const points = d => signed(d * 100, 1);   // an accuracy gap written in percentage points

// ---- canvas helpers ----------------------------------------------------------------------------

function prepare(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, w: width, h: height, t: theme() };
}
function wrapLines(ctx, text, maxW) {
  const out = []; let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxW) { out.push(line); line = word; } else line = next;
  }
  if (line) out.push(line);
  return out;
}
const pctTick = v => `${fmt(v * 100, { max: 0 })}%`;

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Fit before or after splitting?', 'Fit sebelum atau sesudah data dibagi?'),
    hint: tr(
      'Two pipelines get the same data and the same split. The leaky one learns from all rows before the split, the correct one from the training rows only. Compare their accuracy on the test rows.',
      'Dua pipeline memakai data dan pembagian yang sama. Pipeline yang bocor belajar dari semua baris sebelum dibagi, pipeline yang benar hanya dari baris latih. Bandingkan akurasinya pada baris uji.'),
    status: true, legend: true,
    canvasLabel: tr('Bar chart of test accuracy for the correct and the leaky pipeline', 'Diagram batang akurasi uji untuk pipeline yang benar dan yang bocor'),
    extra: {
      title: tr('What each pipeline learned', 'Apa yang dipelajari tiap pipeline'),
      hint: tr('The same split for both pipelines.', 'Pembagian yang sama untuk kedua pipeline.'),
    },
  });
  // The main plot is a bar chart that nobody drags: a picture, not an application.
  lab.canvas.setAttribute('role', 'img');
  lab.canvas.removeAttribute('tabindex');
  lab.canvas.style.setProperty('--plot-h', 'clamp(280px, 34vw, 360px)');
  const stripCanvas = lab.chartCard(
    tr('Test accuracy over 50 splits', 'Akurasi uji pada 50 split'),
    tr('Each dot is one split of the same data. Both lanes share one axis; the thick line is the mean.', 'Tiap titik adalah satu split dari data yang sama. Kedua jalur memakai satu sumbu; garis tebal adalah rata-rata.'),
    270);
  const extraCard = lab.extraEl.closest('.table-card');
  const extraTitle = extraCard.querySelector('h3'), extraHint = extraCard.querySelector('.hint');

  let mode = 'generated', real = null, loading = false, loadFailed = false, loadToken = 0, destroyed = false;
  let dataSeed = DEFAULTS.dataSeed, splitSeed = DEFAULTS.splitSeed, repeatRound = 0;
  let tableCache = { key: '', value: null }, singleCache = { key: '', value: null };
  let rep = null, runToken = 0, timer = 0;

  const controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real)', 'Penguin (data nyata)')]] }),
    { name: 'model', type: 'select', label: tr('Model', 'Model'), value: DEFAULTS.model, options: [['logistic', tr('Logistic regression', 'Regresi logistik')], ['knn', tr('k-NN (k = 5)', 'k-NN (k = 5)')]] },
    { name: 'rows', type: 'range', label: tr('Number of rows', 'Jumlah baris'), min: 40, max: 200, step: 10, value: DEFAULTS.rows },
    { name: 'noise', type: 'range', label: tr('Number of noise features', 'Jumlah feature noise'), min: 20, max: 1000, step: 10, value: DEFAULTS.noise },
    { name: 'keep', type: 'range', label: tr('Features kept', 'Feature yang dipertahankan'), min: 1, max: KEEP_MAX, step: 1, value: DEFAULTS.keep },
    { name: 'newSplit', type: 'button', label: tr('New split', 'Split baru'), onClick: () => { splitSeed += 1; settle(); } },
    { name: 'newTable', type: 'button', label: tr('New random table', 'Tabel acak baru'), onClick: () => { dataSeed += 1; invalidate(); settle(); } },
    { name: 'repeat', type: 'button', label: tr('Repeat 50 splits', 'Ulangi 50 split'), onClick: () => startRepeat(true) },
  ], name => {
    if (name === 'data') { setMode(controls.get('data')); return; }
    if (name === 'noise') syncKeepMax();
    invalidate();
    settle();
  });
  // "Features kept" cannot exceed the number of noise features, so its slider stops at the noise value.
  const keepInput = controls.el.querySelectorAll('input[type="range"]')[2];
  function syncKeepMax() {
    const max = Math.min(KEEP_MAX, controls.get('noise'));
    if (keepInput) keepInput.max = String(max);
    if (controls.get('keep') > max) controls.set('keep', max);
  }
  // The note under the model picker says what the current data mode does; its text is set in draw().
  const dataNote = document.createElement('p');
  dataNote.className = 'hint';
  dataNote.setAttribute('role', 'status');
  controls.el.querySelector('select').closest('label').after(dataNote);

  const boxRandom = predictBox(lab.ref('below'), {
    hint: tr('Use the generated data and press "Repeat 50 splits", then check again.', 'Pakai data buatan dan tekan "Ulangi 50 split", lalu periksa lagi.'),
    name: 'predict-leak',
    question: tr('The labels are random. What test accuracy should an honest model get? And the leaky pipeline?', 'Label-nya acak. Berapa test accuracy yang seharusnya didapat model yang jujur? Dan pipeline yang bocor?'),
    choices: shuffled([
      ['leak-only', tr('Honest: about 50%. Leaky: well above 50%', 'Jujur: sekitar 50%. Bocor: jauh di atas 50%')],
      ['neither', tr('Both about 50%', 'Keduanya sekitar 50%')],
      ['both-high', tr('Both well above 50%', 'Keduanya jauh di atas 50%')],
      ['honest-only', tr('Honest: well above 50%. Leaky: about 50%', 'Jujur: jauh di atas 50%. Bocor: sekitar 50%')],
    ]),
  });
  const boxReal = predictBox(lab.ref('below'), {
    hint: tr('Switch to the penguin data and press "Repeat 50 splits", then check again.', 'Pindah ke data penguin dan tekan "Ulangi 50 split", lalu periksa lagi.'),
    name: 'predict-prep',
    question: tr('On the real penguins, the median and the standardization are learned from all rows (leak) or from the training rows only (correct). How different is the test accuracy?', 'Pada penguin asli, median dan standardisasi dipelajari dari semua baris (leakage) atau hanya dari baris latih (benar). Seberapa berbeda akurasi ujinya?'),
    choices: shuffled([
      ['tiny', tr('Almost the same (under about 1 point)', 'Hampir sama (selisih di bawah sekitar 1 poin)')],
      ['leak-ahead', tr('The leaky pipeline scores several points higher', 'Pipeline yang bocor mendapat skor beberapa poin lebih tinggi')],
      ['correct-ahead', tr('The correct pipeline scores several points higher', 'Pipeline yang benar mendapat skor beberapa poin lebih tinggi')],
    ]),
  });
  lab.cleanup(() => { boxRandom.destroy(); boxReal.destroy(); });
  for (const b of [boxRandom, boxReal]) { b.onPick(revealPredictions); b.onCheck(revealPredictions); }

  // ---- data and experiment -------------------------------------------------------------------

  const isReal = () => mode === 'penguins' && real != null;
  const settings = () => ({ rows: controls.get('rows'), noise: controls.get('noise'), keep: Math.min(controls.get('keep'), controls.get('noise')), model: controls.get('model') });

  function table() {
    const s = settings(), key = `${s.rows}|${s.noise}|${dataSeed}`;
    if (tableCache.key !== key) tableCache = { key, value: makeNoiseTable({ n: s.rows, p: s.noise, seed: dataSeed }) };
    return tableCache.value;
  }

  // One split of the current data, both pipelines. Cached: drawing again (theme, resize) does not recompute.
  function single() {
    const s = settings();
    if (isReal()) {
      const key = `r|${s.model}|${splitSeed}`;
      if (singleCache.key !== key) singleCache = { key, value: runPreprocessing({ X: real.X, y: real.y, seed: splitSeed, model: s.model, trainFraction: REAL_TRAIN }) };
      return singleCache.value;
    }
    const key = `g|${s.rows}|${s.noise}|${s.keep}|${s.model}|${dataSeed}|${splitSeed}`;
    if (singleCache.key !== key) {
      const t = table();
      const r = runPipelines({ X: t.X, y: t.y, k: s.keep, seed: splitSeed, model: s.model });
      const Xte = r.split.test.map(i => t.X[i]), yte = r.split.test.map(i => t.y[i]);
      r.leaky.testCorrelation = meanAbsCorrelation(Xte, yte, r.leaky.selected);
      r.correct.testCorrelation = meanAbsCorrelation(Xte, yte, r.correct.selected);
      r.shared = sharedCount(r.leaky.selected, r.correct.selected);
      singleCache = { key, value: r };
    }
    return singleCache.value;
  }

  async function setMode(next) {
    const token = ++loadToken;
    loadFailed = false;
    invalidate();
    if (next === 'generated') { mode = 'generated'; loading = false; settle(); return; }
    loading = true; mode = next; draw();
    try {
      const data = penguinTask(await loadDataset(next));
      if (destroyed || token !== loadToken) return;
      real = data;
      loading = false;
    } catch {
      if (destroyed || token !== loadToken) return;
      loading = false; loadFailed = true; mode = 'generated';
      controls.set('data', 'generated');
    }
    settle();
    startRepeat(false);
  }

  // ---- 50 splits, run in small chunks -------------------------------------------------------------

  function invalidate() {
    runToken += 1; clearTimeout(timer); rep = null;
    if (boxRandom.answered) boxRandom.reset();
    if (boxReal.answered) boxReal.reset();
  }

  function startRepeat(fresh) {
    if (loading || destroyed) return;
    const token = ++runToken;
    clearTimeout(timer);
    if (fresh) repeatRound += 1;
    const base = REPEAT_BASE + repeatRound * REPEAT_TIMES;
    const s = settings(), real_ = isReal(), t = real_ ? null : table();
    const run = { kind: real_ ? 'real' : 'generated', correct: [], leaky: [], differences: [], done: false };
    rep = run;
    if (boxRandom.answered) boxRandom.reset();
    if (boxReal.answered) boxReal.reset();
    let done = 0;
    const tick = () => {
      if (destroyed || token !== runToken) return;
      const n = Math.min(CHUNK, REPEAT_TIMES - done);
      if (real_) {
        const r = repeatPreprocessing({ X: real.X, y: real.y, seed: base + done, times: n, model: s.model, trainFraction: REAL_TRAIN });
        run.correct.push(...r.correct); run.leaky.push(...r.leaky); run.differences.push(...r.differences);
      } else {
        const r = repeatSplits({ X: t.X, y: t.y, k: s.keep, seed: base + done, times: n, model: s.model });
        run.correct.push(...r.correct); run.leaky.push(...r.leaky);
      }
      done += n;
      if (done >= REPEAT_TIMES) {
        run.done = true;
        run.correctMean = mean(run.correct); run.leakyMean = mean(run.leaky);
        if (!real_) run.differences = run.leaky.map((v, i) => v - run.correct[i]);
      }
      draw();
      if (run.done) revealPredictions(); else timer = setTimeout(tick, 0);
    };
    draw();
    timer = setTimeout(tick, 0);
  }
  lab.cleanup(() => { destroyed = true; loadToken += 1; runToken += 1; clearTimeout(timer); });

  // ---- predictions ---------------------------------------------------------------------------------

  function revealPredictions() {
    if (!rep?.done) return;
    const nm = names();
    if (rep.kind === 'generated' && boxRandom.chosen() != null) {
      boxRandom.reveal(leakageOutcome(rep.correctMean, rep.leakyMean), tr(
        `Over ${fmt(REPEAT_TIMES)} splits the ${nm.correctShort.toLowerCase()} averaged ${pct(rep.correctMean)} and the ${nm.leakyShort.toLowerCase()} ${pct(rep.leakyMean)}. The labels are random, so the extra is not skill: the leaky pipeline chose its features with the test labels in view.`,
        `Pada ${fmt(REPEAT_TIMES)} split, ${nm.correctShort.toLowerCase()} rata-rata ${pct(rep.correctMean)} dan ${nm.leakyShort.toLowerCase()} ${pct(rep.leakyMean)}. Label-nya acak, jadi kelebihannya bukan kemampuan: pipeline yang bocor memilih feature dengan melihat label uji.`));
    }
    if (rep.kind === 'real' && boxReal.chosen() != null) {
      const gap = rep.leakyMean - rep.correctMean;
      boxReal.reveal(preprocessingOutcome(rep.leakyMean, rep.correctMean), tr(
        `Over ${fmt(REPEAT_TIMES)} splits the leaky pipeline averaged ${pct(rep.leakyMean)} and the correct one ${pct(rep.correctMean)}, a gap of ${points(gap)} points. The learned means and medians differ a little (see the table), but the score barely notices.`,
        `Pada ${fmt(REPEAT_TIMES)} split, pipeline yang bocor rata-rata ${pct(rep.leakyMean)} dan yang benar ${pct(rep.correctMean)}, selisih ${points(gap)} poin. Rata-rata dan median yang dipelajari sedikit berbeda (lihat tabel), tetapi skornya nyaris tidak terpengaruh.`));
    }
  }

  // ---- drawing: the bar chart of one split ------------------------------------------------------------

  function drawBars(r) {
    const { ctx, w, h, t } = prepare(lab.canvas), nm = names();
    const m = { l: 54, r: 16, t: 26, b: 68 }, pw = w - m.l - m.r, ph = h - m.t - m.b;
    const Y = v => m.t + (1 - v) * ph;
    ctx.fillStyle = t.plot; ctx.fillRect(m.l, m.t, pw, ph);
    ctx.font = '11px system-ui, sans-serif'; ctx.strokeStyle = t.grid; ctx.fillStyle = t.muted; ctx.lineWidth = 1;
    ctx.beginPath();
    for (const v of [0, 0.25, 0.5, 0.75, 1]) { ctx.moveTo(m.l, Y(v)); ctx.lineTo(w - m.r, Y(v)); ctx.textAlign = 'right'; ctx.fillText(pctTick(v), m.l - 6, Y(v) + 4); }
    ctx.stroke();
    ctx.save(); ctx.translate(13, m.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText(tr('Test accuracy', 'Akurasi uji'), 0, 0); ctx.restore();
    if (!r) {
      ctx.fillStyle = t.muted; ctx.font = '600 13px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(tr('Loading the penguin data…', 'Memuat data penguin…'), m.l + pw / 2, m.t + ph / 2);
      return;
    }
    if (!isReal()) {
      ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = t.muted; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(m.l, Y(0.5)); ctx.lineTo(w - m.r, Y(0.5)); ctx.stroke(); ctx.restore();
    }
    const bars = [
      { value: r.correct.accuracy, color: clusterColor(2), name: nm.correct },
      { value: r.leaky.accuracy, color: clusterColor(1), name: nm.leaky },
    ];
    const bw = Math.min(110, pw / 4);
    bars.forEach((b, i) => {
      const cx = m.l + pw * (i ? 0.75 : 0.25), top = Y(b.value);
      ctx.fillStyle = b.color; ctx.fillRect(cx - bw / 2, top, bw, Math.max(0, Y(0) - top));
      // The value sits on a small patch of the plot color, so the dashed 50% line never strikes through it.
      ctx.font = '700 14px system-ui, sans-serif'; ctx.textAlign = 'center';
      const tw = ctx.measureText(pct(b.value)).width;
      ctx.fillStyle = t.plot; ctx.fillRect(cx - tw / 2 - 4, top - 23, tw + 8, 19);
      ctx.fillStyle = t.ink; ctx.fillText(pct(b.value), cx, top - 8);
      ctx.fillStyle = t.ink; ctx.font = '600 12px system-ui, sans-serif';
      wrapLines(ctx, b.name, pw / 2 - 12).forEach((line, k) => ctx.fillText(line, cx, Y(0) + 18 + k * 15));
    });
  }

  // ---- drawing: the strip chart of 50 splits ------------------------------------------------------------

  function drawStrip() {
    const { ctx, w, h, t } = prepare(stripCanvas), nm = names();
    const m = { l: 16, r: 16, t: 4, b: 46 }, head = 20, pw = w - m.l - m.r;
    const blockH = (h - m.t - m.b) / 2, laneH = blockH - head;
    const real_ = rep?.kind === 'real';
    const all = rep ? [...rep.correct, ...rep.leaky] : [];
    const axis = accuracyAxis(all, { zoom: real_ });
    const X = v => m.l + (v - axis.lo) / (axis.hi - axis.lo) * pw;
    const lanes = [
      { vals: rep?.correct ?? [], color: clusterColor(2), name: nm.correctShort },
      { vals: rep?.leaky ?? [], color: clusterColor(1), name: nm.leakyShort },
    ];
    ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center';
    lanes.forEach((lane, i) => {
      const y0 = m.t + i * blockH + head;
      ctx.fillStyle = t.plot; ctx.fillRect(m.l, y0, pw, laneH);
    });
    ctx.strokeStyle = t.grid; ctx.fillStyle = t.muted; ctx.lineWidth = 1; ctx.beginPath();
    const ticks = accuracyTicks(axis.lo, axis.hi, pw);
    for (const v of ticks) {
      lanes.forEach((_, i) => { const y0 = m.t + i * blockH + head; ctx.moveTo(X(v), y0); ctx.lineTo(X(v), y0 + laneH); });
      ctx.fillText(pctTick(v), X(v), h - m.b + 16);
    }
    ctx.stroke();
    ctx.fillStyle = t.muted;
    ctx.fillText(axis.lo > 0 ? tr(`Test accuracy (the axis starts at ${pct(axis.lo, 0)})`, `Akurasi uji (sumbu mulai dari ${pct(axis.lo, 0)})`) : tr('Test accuracy', 'Akurasi uji'), m.l + pw / 2, h - 6);
    if (!real_) {
      ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = t.muted; ctx.lineWidth = 1.5; ctx.beginPath();
      lanes.forEach((_, i) => { const y0 = m.t + i * blockH + head; ctx.moveTo(X(0.5), y0); ctx.lineTo(X(0.5), y0 + laneH); });
      ctx.stroke(); ctx.restore();
    }
    if (!rep || !rep.correct.length) {
      ctx.fillStyle = t.muted; ctx.font = '600 13px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(rep ? tr('Running 50 splits…', 'Menjalankan 50 split…') : tr('The settings changed. Press "Repeat 50 splits".', 'Pengaturan berubah. Tekan "Ulangi 50 split".'), m.l + pw / 2, m.t + blockH * 2 / 2 + 4);
      lanes.forEach((lane, i) => { ctx.fillStyle = lane.color; ctx.font = '700 12px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(lane.name, m.l, m.t + i * blockH + 14); });
      return;
    }
    lanes.forEach((lane, i) => {
      const y0 = m.t + i * blockH + head, base = y0 + laneH - 4;
      // Slot width = a dot's diameter; shrink the dots until the tallest stack fits the lane.
      let r = 4.5, stack;
      for (let tries = 0; tries < 8; tries++) {
        stack = stackDots(lane.vals.map(v => X(v)), 2 * r + 1);
        const levels = Math.max(...stack.map(s => s.level)) + 1;
        if (levels * (2 * r) <= laneH - 8 || r <= 1.8) break;
        r = Math.max(1.8, r * 0.8);
      }
      ctx.fillStyle = lane.color; ctx.globalAlpha = 0.9;
      for (const s of stack) { ctx.beginPath(); ctx.arc(s.x, base - r - s.level * 2 * r, r, 0, 2 * Math.PI); ctx.fill(); }
      ctx.globalAlpha = 1;
      const mu = mean(lane.vals);
      ctx.strokeStyle = lane.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(mu), y0 + 2); ctx.lineTo(X(mu), y0 + laneH); ctx.stroke(); ctx.lineWidth = 1;
      ctx.font = '700 12px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = lane.color;
      ctx.fillText(lane.name, m.l, y0 - 6);
      ctx.textAlign = 'right'; ctx.fillStyle = t.ink;
      ctx.fillText(tr(`mean ${pct(mu)}`, `rata-rata ${pct(mu)}`), m.l + pw, y0 - 6);
    });
  }

  // ---- the table under the plot ------------------------------------------------------------------------------

  function buildTable(headers, rows, { listRows = [] } = {}) {
    const tbl = document.createElement('table');
    tbl.className = 'stats-table leak-table';
    const head = tbl.createTHead().insertRow();
    for (const hd of headers) { const th = document.createElement('th'); th.textContent = hd; head.append(th); }
    const body = tbl.createTBody();
    rows.forEach((cells, ri) => {
      const row = body.insertRow();
      cells.forEach((c, ci) => {
        const td = row.insertCell(); td.textContent = c;
        if (ci > 0 && listRows.includes(ri)) { td.style.whiteSpace = 'normal'; td.style.textAlign = 'left'; td.style.wordBreak = 'break-word'; }
      });
    });
    const style = document.createElement('style');
    style.textContent = '.leak-table{width:100%;table-layout:fixed}.leak-table th,.leak-table td{white-space:normal;vertical-align:top}.leak-table th:first-child{width:34%}.leak-table-note{margin:10px 0 0}@media (max-width: 640px) { .stats-table { font-size: 12px; } .stats-table th, .stats-table td { white-space: normal; padding: 6px 5px; } .stats-table td:not(:first-child), .stats-table th:not(:first-child) { text-align: right; } .stats-table td:not(:first-child) { white-space: nowrap; } }';
    return [style, tbl];
  }
  const columnList = cols => {
    const { shown, more } = firstColumns(cols, 12);
    return shown.map(j => fmt(j + 1)).join(', ') + (more ? tr(`, … and ${fmt(more)} more`, `, … dan ${fmt(more)} lainnya`) : '');
  };

  function generatedTable(r, s) {
    const nm = names();
    const [style, tbl] = buildTable(
      [tr('Measure', 'Ukuran'), nm.correctShort, nm.leakyShort],
      [
        [tr('Test accuracy', 'Akurasi uji'), pct(r.correct.accuracy), pct(r.leaky.accuracy)],
        [tr('Training accuracy', 'Akurasi latih'), pct(r.correct.trainAccuracy), pct(r.leaky.trainAccuracy)],
        [tr('Rows used to choose the features', 'Baris yang dipakai untuk memilih feature'), fmt(r.split.train.length), fmt(s.rows)],
        [tr('Average correlation of the kept features with the test labels', 'Korelasi rata-rata feature terpilih dengan label uji'), fmt(r.correct.testCorrelation, { digits: 2 }), fmt(r.leaky.testCorrelation, { digits: 2 })],
        [tr('Kept features (column numbers)', 'Feature terpilih (nomor kolom)'), columnList(r.correct.selected), columnList(r.leaky.selected)],
      ], { listRows: [4] });
    const note = document.createElement('p');
    note.className = 'hint leak-table-note';
    note.textContent = tr(
      `Features kept by both pipelines: ${fmt(r.shared)} of ${fmt(s.keep)}. Correlation is between 0 and 1; a value near 0 means no relation.`,
      `Feature yang dipilih kedua pipeline: ${fmt(r.shared)} dari ${fmt(s.keep)}. Korelasi bernilai antara 0 dan 1; nilai mendekati 0 berarti tidak ada hubungan.`);
    lab.extraEl.replaceChildren(style, tbl, note);
  }

  function realTable(r) {
    const nm = names(), f = featureNames();
    const rows = [];
    f.forEach((name, j) => {
      rows.push([tr(`Mean of ${name}`, `Rata-rata ${name}`), fmt(r.correct.means[j], { digits: 2 }), fmt(r.leaky.means[j], { digits: 2 }), signed(r.leaky.means[j] - r.correct.means[j])]);
    });
    f.forEach((name, j) => {
      rows.push([tr(`Median of ${name} (fills NA)`, `Median ${name} (mengisi NA)`), fmt(r.correct.medians[j], { digits: 2 }), fmt(r.leaky.medians[j], { digits: 2 }), signed(r.leaky.medians[j] - r.correct.medians[j])]);
    });
    rows.push([tr('Test accuracy', 'Akurasi uji'), pct(r.correct.accuracy), pct(r.leaky.accuracy), points(r.accuracyDifference).concat(tr(' points', ' poin'))]);
    const [style, tbl] = buildTable([tr('Statistic', 'Statistik'), nm.correctShort, nm.leakyShort, tr('Difference (leak - correct)', 'Selisih (leakage - benar)')], rows);
    lab.extraEl.replaceChildren(style, tbl);
  }

  // ---- text -------------------------------------------------------------------------------------------------------

  function generatedStatus(r, s) {
    return tr(
      `One split (${fmt(s.rows)} rows, ${fmt(r.split.test.length)} of them test rows): the correct pipeline scores ${pct(r.correct.accuracy)} on the test rows, the leaky pipeline ${pct(r.leaky.accuracy)}. The labels are random, so an honest score is about 50%.`,
      `Satu split (${fmt(s.rows)} baris, ${fmt(r.split.test.length)} di antaranya baris uji): pipeline yang benar mendapat ${pct(r.correct.accuracy)} pada baris uji, pipeline yang bocor ${pct(r.leaky.accuracy)}. Label-nya acak, jadi skor yang jujur sekitar 50%.`);
  }
  function generatedDetail(r, s) {
    return tr(
      `What leaked: the leaky pipeline chose its ${fmt(s.keep)} features by looking at the labels of all ${fmt(s.rows)} rows, test rows included. Among ${fmt(s.noise)} random features some line up with the test labels by luck (average correlation ${fmt(r.leaky.testCorrelation, { digits: 2 })} for its features, ${fmt(r.correct.testCorrelation, { digits: 2 })} for the correct pipeline's), and it kept exactly those. The correct pipeline chose from the training rows only, so the test rows stayed a fair exam.`,
      `Yang bocor: pipeline yang bocor memilih ${fmt(s.keep)} feature dengan melihat label semua ${fmt(s.rows)} baris, termasuk baris uji. Di antara ${fmt(s.noise)} feature acak, ada yang kebetulan cocok dengan label uji (korelasi rata-rata ${fmt(r.leaky.testCorrelation, { digits: 2 })} untuk feature-nya, ${fmt(r.correct.testCorrelation, { digits: 2 })} untuk pipeline yang benar), dan pipeline ini memilih persis yang itu. Pipeline yang benar memilih hanya dari baris latih, sehingga baris uji tetap menjadi ujian yang adil.`);
  }
  function realStatus(r) {
    return tr(
      `One split (${fmt(r.split.train.length)} training and ${fmt(r.split.test.length)} test penguins): fitting on all rows gives ${pct(r.leaky.accuracy)} test accuracy, fitting on the training rows only gives ${pct(r.correct.accuracy)}. Gap: ${points(r.accuracyDifference)} points.`,
      `Satu split (${fmt(r.split.train.length)} penguin latih dan ${fmt(r.split.test.length)} penguin uji): fit pada semua baris memberi akurasi uji ${pct(r.leaky.accuracy)}, fit hanya pada baris latih ${pct(r.correct.accuracy)}. Selisih: ${points(r.accuracyDifference)} poin.`);
  }
  function realDetail(r) {
    const N = real.X.length;
    let tally = '';
    if (rep?.kind === 'real' && rep.done) {
      const ahead = rep.differences.filter(d => d > 1e-9).length, behind = rep.differences.filter(d => d < -1e-9).length, equal = REPEAT_TIMES - ahead - behind;
      tally = tr(
        ` Over ${fmt(REPEAT_TIMES)} splits they average ${pct(rep.leakyMean)} and ${pct(rep.correctMean)}: the leaky pipeline is ahead in ${fmt(ahead)}, the correct one in ${fmt(behind)}, and they tie in ${fmt(equal)}.`,
        ` Pada ${fmt(REPEAT_TIMES)} split rata-ratanya ${pct(rep.leakyMean)} dan ${pct(rep.correctMean)}: pipeline yang bocor unggul pada ${fmt(ahead)}, yang benar pada ${fmt(behind)}, dan seri pada ${fmt(equal)}.`);
    }
    return tr(
      `What leaked: the leaky pipeline took the medians, means and spreads from all ${fmt(N)} penguins, test penguins included; the correct one used the ${fmt(r.split.train.length)} training penguins only. The numbers in the table do differ, but the score barely does.${tally} That is expected: a mean or a median from ${fmt(N)} rows instead of ${fmt(r.split.train.length)} hardly moves, and the model hardly notices. Do not read this as "leakage is harmless". Choosing features with the labels (the random-labels experiment) is the dangerous kind, because it uses the test answers.`,
      `Yang bocor: pipeline yang bocor mengambil median, rata-rata, dan sebaran dari semua ${fmt(N)} penguin, termasuk penguin uji; pipeline yang benar hanya memakai ${fmt(r.split.train.length)} penguin latih. Angka di tabel memang berbeda, tetapi skornya nyaris tidak.${tally} Itu wajar: rata-rata atau median dari ${fmt(N)} baris, bukan ${fmt(r.split.train.length)}, hampir tidak bergeser, dan model nyaris tidak menyadarinya. Jangan menyimpulkan bahwa "leakage tidak berbahaya". Memilih feature dengan melihat label (eksperimen label acak) adalah jenis yang berbahaya, karena memakai jawaban uji.`);
  }
  function dataNoteText(s) {
    if (isReal()) {
      return tr(
        `${fmt(real.X.length)} penguins; the task is "is it an Adelie?" (${fmt(real.positives)} are). ${fmt(real.naRows)} penguins have missing values (NA), ${fmt(real.naCells)} cells in all. They are kept: each gap is filled with a median, then every column is standardized. The leaky pipeline learns both from all rows, the correct one from the training rows only.`,
        `${fmt(real.X.length)} penguin; tugasnya "apakah ini Adelie?" (${fmt(real.positives)} penguin). ${fmt(real.naRows)} penguin punya missing value (NA), total ${fmt(real.naCells)} sel. Barisnya tetap dipakai: setiap kekosongan diisi dengan median, lalu setiap kolom distandardisasi. Pipeline yang bocor mempelajari keduanya dari semua baris, yang benar hanya dari baris latih.`);
    }
    if (loadFailed) return tr('Could not load the penguin data, so the generated data is shown.', 'Data penguin tidak bisa dimuat, jadi data buatan yang ditampilkan.');
    return tr(
      `A random table: ${fmt(s.rows)} rows, ${fmt(s.noise)} noise features, and coin-flip labels. There is nothing to learn, so an honest score is about 50%. Half the rows train, half test.`,
      `Tabel acak: ${fmt(s.rows)} baris, ${fmt(s.noise)} feature noise, dan label lemparan koin. Tidak ada yang bisa dipelajari, jadi skor yang jujur sekitar 50%. Setengah baris untuk latih, setengah untuk uji.`);
  }

  // ---- draw ----------------------------------------------------------------------------------------------------------

  function draw() {
    const nm = names(), s = settings(), real_ = isReal();
    controls.show('rows', !real_); controls.show('noise', !real_); controls.show('keep', !real_);
    controls.disable('newTable', real_ || loading);
    controls.disable('newSplit', loading);
    controls.disable('repeat', loading || (rep != null && !rep.done));
    controls.disable('model', loading);
    dataNote.textContent = loading ? '' : dataNoteText(s);
    const running = rep != null && !rep.done;
    if (loading) {
      drawBars(null); drawStrip();
      lab.setStatus(tr('Loading the penguin data…', 'Memuat data penguin…')); lab.setDetail(''); lab.setMetrics('');
      lab.setLegend([]);
      return;
    }
    const r = single();
    drawBars(r); drawStrip();
    let status = real_ ? realStatus(r) : generatedStatus(r, s);
    if (running) status += ` ${tr('Running 50 splits…', 'Menjalankan 50 split…')}`;
    else if (rep?.done) {
      status += ` ${tr(`Over ${fmt(REPEAT_TIMES)} splits: correct ${pct(rep.correctMean)} on average, leaky ${pct(rep.leakyMean)}.`, `Pada ${fmt(REPEAT_TIMES)} split: yang benar rata-rata ${pct(rep.correctMean)}, yang bocor ${pct(rep.leakyMean)}.`)}`;
    }
    lab.setStatus(status);
    lab.setDetail(real_ ? realDetail(r) : generatedDetail(r, s));
    lab.setMetrics(real_
      ? tr(`${fmt(real.X.length)} penguins · split seed ${fmt(splitSeed)}`, `${fmt(real.X.length)} penguin · seed split ${fmt(splitSeed)}`)
      : tr(`${fmt(s.rows)} rows × ${fmt(s.noise)} features · split seed ${fmt(splitSeed)}`, `${fmt(s.rows)} baris × ${fmt(s.noise)} feature · seed split ${fmt(splitSeed)}`));
    const items = [
      { kind: 'dot', color: clusterColor(2), label: nm.correct },
      { kind: 'dot', color: clusterColor(1), label: nm.leaky },
    ];
    if (!real_) items.push({ kind: 'dash', color: theme().muted, label: tr('Chance level (50%)', 'Tingkat kebetulan (50%)') });
    lab.setLegend(items);
    extraTitle.textContent = real_ ? tr('What each pipeline learned from the penguins', 'Apa yang dipelajari tiap pipeline dari penguin') : tr('What each pipeline kept, and how it scored', 'Apa yang dipertahankan tiap pipeline, dan skornya');
    extraHint.textContent = real_
      ? tr('The learned statistics, on the same split. Difference = leaky minus correct.', 'Statistik yang dipelajari, pada split yang sama. Selisih = bocor dikurangi benar.')
      : tr('The same split for both pipelines.', 'Pembagian yang sama untuk kedua pipeline.');
    if (real_) realTable(r); else generatedTable(r, s);
    lab.describe(lab.canvas, tr(
      `Test accuracy on one split: ${nm.correct} ${pct(r.correct.accuracy)}, ${nm.leaky} ${pct(r.leaky.accuracy)}.`,
      `Akurasi uji pada satu split: ${nm.correct} ${pct(r.correct.accuracy)}, ${nm.leaky} ${pct(r.leaky.accuracy)}.`));
    const range = v => `${pct(Math.min(...v))} - ${pct(Math.max(...v))}`;
    lab.describe(stripCanvas, rep?.done
      ? tr(`Over ${fmt(REPEAT_TIMES)} splits the correct pipeline averaged ${pct(rep.correctMean)} (range ${range(rep.correct)}) and the leaky pipeline ${pct(rep.leakyMean)} (range ${range(rep.leaky)}).`,
        `Pada ${fmt(REPEAT_TIMES)} split, pipeline yang benar rata-rata ${pct(rep.correctMean)} (rentang ${range(rep.correct)}) dan pipeline yang bocor ${pct(rep.leakyMean)} (rentang ${range(rep.leaky)}).`)
      : tr('No result yet. Press "Repeat 50 splits".', 'Belum ada hasil. Tekan "Ulangi 50 split".'));
  }

  function settle() { draw(); revealPredictions(); }

  lab.onReset(() => {
    loadToken += 1; invalidate();
    mode = 'generated'; loading = false; loadFailed = false;
    dataSeed = DEFAULTS.dataSeed; splitSeed = DEFAULTS.splitSeed; repeatRound = 0;
    controls.set('data', 'generated'); controls.set('model', DEFAULTS.model);
    controls.set('rows', DEFAULTS.rows); controls.set('noise', DEFAULTS.noise); controls.set('keep', DEFAULTS.keep); syncKeepMax();
    boxRandom.reset(); boxReal.reset();
    draw();
    startRepeat(false);
  });
  lab.onTheme(draw);
  lab.onResize(draw);
  draw();
  timer = setTimeout(() => startRepeat(false), 0);
  return lab.destroy;
}
