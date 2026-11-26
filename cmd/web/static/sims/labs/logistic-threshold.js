// Logistic regression and the decision threshold, built on the kit. A logistic model is fitted to two classes;
// the learner moves the threshold and watches which examples become false positives or false negatives, with
// the counts, precision, recall and log loss next to a sigmoid chart. Generated data works offline; "Penguins
// (real)" asks whether a penguin is a Gentoo from its bill length and body mass (rows with a missing value are
// left out and the lab says so). The pure math is in ml/logistic.js and ml/thresholdlab.js.
import { createLab, createPlot, dataModeSpec, loadDataset, predictBox, clusterColor, theme, tr, fmt, pct } from '../kit/index.js';
import { fitLogistic, predictProba, decisionScores, rawCoefficients, sigmoid } from '../ml/logistic.js';
import {
  THRESHOLD_MIN, THRESHOLD_MAX, THRESHOLD_DEFAULT, GENERATED_SEED, logit, blobPoints, gentooPoints,
  summarizeAt, mistakes, shiftBetween, boundarySegment, probabilityAt,
} from '../ml/thresholdlab.js';

const FIT = { lr: 0.3, iters: 1000 };
const CELLS = 40;
const FP_COLOR = () => clusterColor(3), FN_COLOR = () => clusterColor(5);
const NEG = () => clusterColor(0), POS = () => clusterColor(1);

// What the axes of each data mode show; built when drawn so the text follows the language.
const views = {
  generated: () => ({ xLo: 0, xHi: 10, yLo: 0, yHi: 10, xTitle: tr('Feature 1', 'Feature 1'), yTitle: tr('Feature 2', 'Feature 2'), custom: false }),
  penguins: () => ({
    xLo: 30, xHi: 60, yLo: 2, yHi: 7,
    xTitle: tr('Bill length (mm)', 'Panjang paruh (mm)'), yTitle: tr('Body mass (kg)', 'Massa tubuh (kg)'), custom: true,
  }),
};
const names = real => (real
  ? { pos: tr('Gentoo (positive)', 'Gentoo (positif)'), neg: tr('Other species (negative)', 'Spesies lain (negatif)') }
  : { pos: tr('Positive class (1)', 'Kelas positif (1)'), neg: tr('Negative class (0)', 'Kelas negatif (0)') });
const two = v => fmt(v, { digits: 2 });
// A count with its English noun in the right number: '1 false negative', '0 false negatives'.
const count = (n, one, many) => `${fmt(n)} ${n === 1 ? one : many}`;
const ratio = (v, undef) => (undef ? tr('n/a', 'n/a') : pct(v));

function fitData(X, y) {
  const model = fitLogistic(X, y, FIT);
  const proba = predictProba(model, X), scores = decisionScores(model, X);
  return { X, y, model, coef: rawCoefficients(model), proba, scores };
}

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Logistic regression and the threshold', 'Regresi logistik dan threshold'),
    hint: tr(
      'Each dot is one example. The model gives every point a probability of being positive; the solid line is where that probability equals your threshold, the dashed line is where it equals 0.5. Circled dots are mistakes.',
      'Setiap titik adalah satu contoh. Model memberi tiap titik probabilitas menjadi positif; garis tegas adalah tempat probabilitas sama dengan threshold-mu, garis putus-putus tempat probabilitas sama dengan 0,5. Titik yang dilingkari adalah kesalahan.'),
    status: true, legend: true,
    canvasLabel: tr(
      'Scatterplot of two classes with the fitted logistic boundary and probability shading. Left and right arrow keys change the threshold.',
      'Scatterplot dua kelas dengan batas regresi logistik dan arsiran probabilitas. Tombol panah kiri dan kanan mengubah threshold.'),
    extra: {
      title: tr('Counts and scores at this threshold', 'Hitungan dan skor pada threshold ini'),
      hint: tr(
        'Positive is the class we look for. A true positive is a positive called positive, a false positive is a negative called positive. Precision is true positives divided by everything called positive; recall is true positives divided by all real positives. Log loss scores the probabilities themselves, so it does not change with the threshold.',
        'Positif adalah kelas yang kita cari. True positive adalah contoh positif yang diprediksi positif, false positive adalah contoh negatif yang diprediksi positif. Precision adalah true positive dibagi semua yang diprediksi positif; recall adalah true positive dibagi semua positif sebenarnya. Log loss menilai probabilitasnya sendiri, jadi tidak berubah mengikuti threshold.'),
    },
  });
  const plot = createPlot(lab.canvas, { xLabel: '', yLabel: '' });
  const legendHost = lab.ref('legend');
  if (legendHost) legendHost.style.maxHeight = 'none';

  let mode = 'generated', seed = GENERATED_SEED, real = null, info = null, loadFailed = false, loading = false;
  let loadToken = 0, destroyed = false, generated = null;

  const controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real)', 'Penguin (data nyata)')]] }),
    { name: 'threshold', type: 'range', label: tr('Threshold', 'Threshold'), min: THRESHOLD_MIN, max: THRESHOLD_MAX, step: 0.01, value: THRESHOLD_DEFAULT, format: two },
    { name: 'half', type: 'button', label: tr('Set threshold to 0.5', 'Atur threshold ke 0,5'), onClick: () => { controls.set('threshold', THRESHOLD_DEFAULT); settle(); } },
    { name: 'newSample', type: 'button', label: tr('New sample', 'Sampel baru'), onClick: () => { seed += 1; generated = null; settle(); } },
    { name: 'shade', type: 'toggle', label: tr('Show probability shading', 'Tampilkan arsiran probabilitas'), value: true },
    { type: 'note', text: tr('Keyboard: focus the plot, then the left and right arrow keys move the threshold by 0.01 (Shift for 0.05).', 'Keyboard: fokus ke plot, lalu tombol panah kiri dan kanan menggeser threshold sebesar 0,01 (Shift untuk 0,05).') },
  ], name => {
    if (name === 'data') { setMode(controls.get('data')); return; }
    if (name === 'threshold') { draw(); settleSoon(); return; }
    draw();
  });
  const dataNote = document.createElement('p');
  dataNote.className = 'hint';
  dataNote.setAttribute('role', 'status');
  controls.el.querySelector('select').closest('label').after(dataNote);

  const box = predictBox(lab.ref('below'), {
    hint: tr('Move the threshold below 0.5 in the Parameters, then check again.', 'Geser threshold di bawah 0,5 pada Parameter, lalu periksa lagi.'),
    name: 'predict-threshold',
    question: tr('If you lower the threshold, what happens to false positives and false negatives?', 'Jika kamu menurunkan threshold, apa yang terjadi pada false positive dan false negative?'),
    choices: [
      ['fp-up-fn-down', tr('False positives go up, false negatives go down', 'False positive naik, false negative turun')],
      ['fp-down-fn-up', tr('False positives go down, false negatives go up', 'False positive turun, false negative naik')],
      ['both-up', tr('Both go up', 'Keduanya naik')],
      ['both-down', tr('Both go down', 'Keduanya turun')],
    ],
  });
  const chart = lab.chartCard(
    tr('The sigmoid: from score to probability', 'Sigmoid: dari skor ke probabilitas'),
    tr('Each dot is one example, sitting on the curve at its score. The dashed lines mark your threshold: dots to the right of the vertical line are called positive. Circled dots are mistakes.',
      'Setiap titik adalah satu contoh, terletak di kurva pada skornya. Garis putus-putus menandai threshold-mu: titik di kanan garis vertikal diprediksi positif. Titik yang dilingkari adalah kesalahan.'),
    280);
  lab.cleanup(() => box.destroy());
  box.onPick(revealPrediction);

  // ---- data ------------------------------------------------------------------

  async function setMode(next) {
    const token = ++loadToken;
    loadFailed = false;
    if (next === 'generated') { mode = 'generated'; loading = false; settle(); return; }
    loading = true; mode = next; draw();
    try {
      const table = await loadDataset(next);
      if (destroyed || token !== loadToken) return;
      info = gentooPoints(table);
      real = fitData(info.X, info.y);
      loading = false;
    } catch {
      if (destroyed || token !== loadToken) return;
      loading = false; loadFailed = true; mode = 'generated';
      controls.set('data', 'generated');
    }
    settle();
  }
  const isReal = () => mode === 'penguins' && real != null;
  function current() {
    if (isReal()) return real;
    if (!generated || generated.seed !== seed) { const d = blobPoints(seed); generated = { seed, ...fitData(d.X, d.y) }; }
    return generated;
  }
  const view = () => views[isReal() ? 'penguins' : 'generated']();
  const toPlot = (x, y, v) => [(x - v.xLo) / (v.xHi - v.xLo) * 10, (y - v.yLo) / (v.yHi - v.yLo) * 10];
  const thresholdNow = () => controls.get('threshold');

  // ---- prediction ----------------------------------------------------------------

  let timer = 0;
  function settleSoon() { clearTimeout(timer); timer = setTimeout(revealPrediction, 350); }
  lab.cleanup(() => clearTimeout(timer));

  function revealPrediction() {
    const t = thresholdNow();
    if (box.chosen() == null || t >= THRESHOLD_DEFAULT || loading) return;
    const d = current(), s = shiftBetween(d.y, d.proba, THRESHOLD_DEFAULT, t);
    if (!s.changed) return;
    box.reveal('fp-up-fn-down', tr(
      `At threshold ${two(t)} there are ${count(s.fpTo, 'false positive', 'false positives')} (${fmt(s.fpFrom)} at 0.5) and ${count(s.fnTo, 'false negative', 'false negatives')} (${fmt(s.fnFrom)} at 0.5). A lower threshold calls more examples positive, so it never removes a false positive and never adds a false negative. Move it up to 0.95 and see the opposite.`,
      `Pada threshold ${two(t)} ada ${fmt(s.fpTo)} false positive (${fmt(s.fpFrom)} pada 0,5) dan ${fmt(s.fnTo)} false negative (${fmt(s.fnFrom)} pada 0,5). Threshold yang lebih rendah membuat lebih banyak contoh diprediksi positif, sehingga false positive tidak pernah berkurang dan false negative tidak pernah bertambah. Naikkan sampai 0,95 untuk melihat kebalikannya.`));
  }

  // ---- drawing ---------------------------------------------------------------------

  // The kit labels the plot 0..10; penguin units differ, so those labels are erased and drawn again from the data range.
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
    ctx.translate(g.px(0) - 27, g.py(5)); ctx.rotate(-Math.PI / 2); ctx.fillText(v.yTitle, 0, 0);
    ctx.restore();
  }

  function shading(d, v) {
    const ctx = plot.ctx, step = 10 / CELLS;
    ctx.save();
    for (let i = 0; i < CELLS; i++) {
      for (let j = 0; j < CELLS; j++) {
        const cx = (i + 0.5) * step, cy = (j + 0.5) * step;
        const p = probabilityAt(d.coef, v.xLo + cx / 10 * (v.xHi - v.xLo), v.yLo + cy / 10 * (v.yHi - v.yLo));
        ctx.globalAlpha = 0.05 + 0.3 * Math.abs(2 * p - 1);
        ctx.fillStyle = p >= 0.5 ? POS() : NEG();
        // Whole-pixel edges that share a border exactly: no gap and no double-tinted seam between cells.
        const x0 = Math.round(plot.px(i * step)), x1 = Math.round(plot.px((i + 1) * step));
        const y1 = Math.round(plot.py((j + 1) * step)), y0 = Math.round(plot.py(j * step));
        ctx.fillRect(x0, y1, x1 - x0, y0 - y1);
      }
    }
    ctx.restore();
  }

  function boundary(d, v, t, style) {
    const seg = boundarySegment(d.coef, t, v);
    if (!seg) return;
    const a = toPlot(seg[0][0], seg[0][1], v), b = toPlot(seg[1][0], seg[1][1], v);
    plot.segment(a[0], a[1], b[0], b[1], style);
  }

  function ringAt(ctx, x, y, color, dash) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, 9, 0, 2 * Math.PI); ctx.lineWidth = 2.5; ctx.strokeStyle = color; if (dash) ctx.setLineDash(dash); ctx.stroke(); ctx.restore();
  }

  function drawScatter(d, v, t, miss) {
    const g = plot.begin();
    if (v.custom) axes(g, v);
    if (controls.get('shade')) plot.clip(() => shading(d, v));
    plot.clip(() => {
      if (Math.abs(t - 0.5) > 0.004) boundary(d, v, 0.5, { color: g.t.muted, width: 2, dash: [6, 5] });
      else boundary(d, v, 0.5, { color: g.t.ink, width: 2.5 });
      if (Math.abs(t - 0.5) > 0.004) boundary(d, v, t, { color: g.t.ink, width: 2.5 });
    });
    const order = d.y.map((_, i) => i).sort((a, b) => d.y[a] - d.y[b]);
    for (const i of order) { const [x, y] = toPlot(d.X[i][0], d.X[i][1], v); plot.dot(x, y, d.y[i] ? POS() : NEG(), 4.2); }
    const ctx = plot.ctx;
    for (const i of miss.fp) { const [x, y] = toPlot(d.X[i][0], d.X[i][1], v); ringAt(ctx, plot.px(x), plot.py(y), FP_COLOR(), null); }
    for (const i of miss.fn) { const [x, y] = toPlot(d.X[i][0], d.X[i][1], v); ringAt(ctx, plot.px(x), plot.py(y), FN_COLOR(), [4, 3]); }
  }

  function drawSigmoid(d, t, miss) {
    const ctx = chart.getContext('2d'), th = theme();
    const { width, height } = chart.getBoundingClientRect();
    const ratioPx = window.devicePixelRatio || 1;
    chart.width = Math.round(width * ratioPx); chart.height = Math.round(height * ratioPx);
    ctx.setTransform(ratioPx, 0, 0, ratioPx, 0, 0);
    const m = { l: 54, r: 16, t: 16, b: 44 }, W = width - m.l - m.r, H = height - m.t - m.b;
    const maxScore = Math.max(0, ...d.scores.map(Math.abs), Math.abs(logit(THRESHOLD_MAX)));
    const R = Math.min(12, Math.max(4, Math.ceil(maxScore / 2) * 2));
    const X = z => m.l + (Math.max(-R, Math.min(R, z)) + R) / (2 * R) * W, Y = p => m.t + (1 - p) * H;
    const zt = logit(t);
    ctx.fillStyle = th.plot; ctx.fillRect(m.l, m.t, W, H);
    ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = POS(); ctx.fillRect(X(zt), m.t, m.l + W - X(zt), H); ctx.restore();
    ctx.font = '11px system-ui, sans-serif'; ctx.strokeStyle = th.grid; ctx.fillStyle = th.muted; ctx.lineWidth = 1;
    ctx.beginPath();
    for (const p of [0, 0.25, 0.5, 0.75, 1]) { ctx.moveTo(m.l, Y(p)); ctx.lineTo(m.l + W, Y(p)); ctx.textAlign = 'right'; ctx.fillText(two(p), m.l - 6, Y(p) + 4); }
    const stepZ = R <= 6 ? 2 : 4;
    for (let z = -R; z <= R; z += stepZ) { ctx.moveTo(X(z), m.t); ctx.lineTo(X(z), m.t + H); ctx.textAlign = 'center'; ctx.fillText(fmt(z), X(z), m.t + H + 16); }
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillText(tr('Score (log-odds)', 'Skor (log-odds)'), m.l + W / 2, height - 6);
    ctx.save(); ctx.translate(13, m.t + H / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(tr('Probability of positive', 'Probabilitas positif'), 0, 0); ctx.restore();
    // the curve
    ctx.save(); ctx.beginPath();
    for (let k = 0; k <= 160; k++) { const z = -R + k / 160 * 2 * R; k ? ctx.lineTo(X(z), Y(sigmoid(z))) : ctx.moveTo(X(z), Y(sigmoid(z))); }
    ctx.lineWidth = 2.5; ctx.strokeStyle = th.ink; ctx.stroke(); ctx.restore();
    // the threshold
    ctx.save(); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.strokeStyle = th.ink; ctx.beginPath();
    ctx.moveTo(m.l, Y(t)); ctx.lineTo(X(zt), Y(t)); ctx.moveTo(X(zt), m.t); ctx.lineTo(X(zt), m.t + H); ctx.stroke(); ctx.restore();
    // the examples, on the curve
    const dot = (i, r) => { ctx.beginPath(); ctx.arc(X(d.scores[i]), Y(d.proba[i]), r, 0, 2 * Math.PI); };
    ctx.save(); ctx.globalAlpha = 0.75;
    for (const i of d.y.map((_, k) => k).sort((a, b) => d.y[a] - d.y[b])) { dot(i, 3.6); ctx.fillStyle = d.y[i] ? POS() : NEG(); ctx.fill(); }
    ctx.restore();
    for (const [list, color, dash] of [[miss.fp, FP_COLOR(), null], [miss.fn, FN_COLOR(), [4, 3]]]) {
      ctx.save(); ctx.lineWidth = 2; ctx.strokeStyle = color; if (dash) ctx.setLineDash(dash);
      for (const i of list) { dot(i, 7); ctx.stroke(); }
      ctx.restore();
    }
    // The threshold's name, written last so no dot covers it, on whichever side of the line has room.
    // It sits on a small chip in the plot colour, so a ring or dot near the curve's shoulder cannot cut into the letters.
    ctx.save(); ctx.font = '600 12px system-ui, sans-serif';
    const words = [tr(`threshold ${two(t)}`, `threshold ${two(t)}`), tr('called positive', 'diprediksi positif')];
    const textW = Math.max(...words.map(w => ctx.measureText(w).width)), room = textW + 16;
    // Four corners beside the line are tried in turn (kept inside the plot); the first that covers no dot or piece of
    // the curve wins, otherwise the one that covers the fewest.
    const chipH = 38, clampX = x => Math.max(m.l + 2, Math.min(m.l + W - room - 2, x));
    const topY = m.t + 3, botY = m.t + H - chipH - 3;
    const spots = [[X(zt) + 3, topY], [X(zt) - 3 - room, topY], [X(zt) + 3, botY], [X(zt) - 3 - room, botY]].map(([x, y]) => [clampX(x), y]);
    const marks = d.y.map((_, i) => [X(d.scores[i]), Y(d.proba[i])]);
    for (let k = 0; k <= 160; k++) { const z = -R + k / 160 * 2 * R; marks.push([X(z), Y(sigmoid(z))]); }
    const hits = ([x, y]) => marks.reduce((n, [mx, my]) => n + (mx > x - 8 && mx < x + room + 8 && my > y - 8 && my < y + chipH + 8 ? 1 : 0), 0);
    let best = spots[0], bestHits = Infinity;
    for (const spot of spots) { const n = hits(spot); if (n < bestHits) { best = spot; bestHits = n; if (n === 0) break; } }
    const [chipX, chipY] = best;
    ctx.save(); ctx.globalAlpha = 0.94; ctx.fillStyle = th.plot; ctx.fillRect(chipX, chipY, room, chipH);
    ctx.globalAlpha = 1; ctx.lineWidth = 1; ctx.strokeStyle = th.grid; ctx.strokeRect(chipX + 0.5, chipY + 0.5, room - 1, chipH - 1); ctx.restore();
    ctx.fillStyle = th.ink; ctx.textAlign = 'left';
    words.forEach((w, k) => ctx.fillText(w, chipX + 8, chipY + 15 + 16 * k));
    ctx.restore();
  }

  function table(d, s0, s1) {
    const rows = [
      [tr('Called positive', 'Diprediksi positif'), s0.flagged, s1.flagged, fmt],
      [tr('True positives', 'True positive'), s0.tp, s1.tp, fmt],
      [tr('False positives', 'False positive'), s0.fp, s1.fp, fmt],
      [tr('True negatives', 'True negative'), s0.tn, s1.tn, fmt],
      [tr('False negatives', 'False negative'), s0.fn, s1.fn, fmt],
      [tr('Precision', 'Precision'), ratio(s0.precision, s0.undefined.precision), ratio(s1.precision, s1.undefined.precision)],
      [tr('Recall', 'Recall'), ratio(s0.recall, s0.undefined.recall), ratio(s1.recall, s1.undefined.recall)],
      [tr('Log loss', 'Log loss'), fmt(s0.logLoss, { digits: 3 }), fmt(s1.logLoss, { digits: 3 })],
    ];
    const t = document.createElement('table');
    t.className = 'stats-table';
    t.innerHTML = '<thead><tr></tr></thead>';
    const head = t.querySelector('tr');
    for (const h of [tr('Measure', 'Ukuran'), tr('At threshold 0.5', 'Pada threshold 0,5'), tr(`At your threshold (${two(s1.threshold)})`, `Pada threshold-mu (${two(s1.threshold)})`)]) {
      const th = document.createElement('th'); th.textContent = h; head.append(th);
    }
    const body = document.createElement('tbody');
    for (const [name, a, b, f] of rows) {
      const row = body.insertRow();
      row.insertCell().textContent = name;
      row.insertCell().textContent = f ? f(a) : a;
      const c = row.insertCell();
      c.textContent = f ? f(b) : b;
      if (a !== b) c.style.fontWeight = '700';
    }
    t.append(body);
    const style = document.createElement('style');
    style.textContent = '@media (max-width: 640px) { .stats-table { font-size: 12px; } .stats-table th, .stats-table td { white-space: normal; padding: 6px 5px; } .stats-table td:not(:first-child) { white-space: nowrap; text-align: right; } .stats-table th:not(:first-child) { text-align: right; } }';
    lab.extraEl.replaceChildren(style, t);
  }

  function draw() {
    controls.disable('newSample', isReal() || loading);
    controls.disable('threshold', loading);
    if (loading && !real) {
      lab.setStatus(tr('Loading the penguin data…', 'Memuat data penguin…'));
      lab.setDetail(''); lab.setMetrics('');
      dataNote.textContent = '';
      return;
    }
    const d = current(), v = view(), t = thresholdNow();
    const s1 = summarizeAt(d.y, d.proba, t), s0 = summarizeAt(d.y, d.proba, THRESHOLD_DEFAULT), miss = mistakes(d.y, d.proba, t);
    drawScatter(d, v, t, miss);
    drawSigmoid(d, t, miss);

    lab.setStatus(tr(
      `Threshold ${two(t)}: ${fmt(s1.flagged)} of ${fmt(s1.n)} examples ${s1.flagged === 1 ? 'is' : 'are'} called positive. True positives ${fmt(s1.tp)}, false positives ${fmt(s1.fp)}, true negatives ${fmt(s1.tn)}, false negatives ${fmt(s1.fn)}.`,
      `Threshold ${two(t)}: ${fmt(s1.flagged)} dari ${fmt(s1.n)} contoh diprediksi positif. True positive ${fmt(s1.tp)}, false positive ${fmt(s1.fp)}, true negative ${fmt(s1.tn)}, false negative ${fmt(s1.fn)}.`));
    if (box.chosen() == null && Math.abs(t - THRESHOLD_DEFAULT) < 0.005) {
      lab.setDetail(tr('Pick an answer in the Quick Quiz (the button under the settings card), then move the threshold to the left to check it.', 'Pilih jawaban di Kuis Cepat (tombol di bawah kartu pengaturan), lalu geser threshold ke kiri untuk mengeceknya.'));
    } else if (s1.flagged === 0) {
      lab.setDetail(tr('Nothing is called positive at this threshold, so precision is undefined (n/a) and recall is 0%.', 'Tidak ada contoh yang diprediksi positif pada threshold ini, jadi precision tidak terdefinisi (n/a) dan recall 0%.'));
    } else {
      lab.setDetail(tr(
        `Precision ${pct(s1.precision)}: of the examples called positive, this share really are positive. Recall ${pct(s1.recall)}: of the real positives, this share is found.`,
        `Precision ${pct(s1.precision)}: dari contoh yang diprediksi positif, sebesar ini yang benar-benar positif. Recall ${pct(s1.recall)}: dari semua positif sebenarnya, sebesar ini yang ditemukan.`));
    }
    lab.setMetrics(tr(`Precision ${ratio(s1.precision, s1.undefined.precision)} · Recall ${ratio(s1.recall, s1.undefined.recall)}`, `Precision ${ratio(s1.precision, s1.undefined.precision)} · Recall ${ratio(s1.recall, s1.undefined.recall)}`));

    const n = names(isReal());
    lab.setLegend([
      { kind: 'dot', color: NEG(), label: n.neg },
      { kind: 'dot', color: POS(), label: n.pos },
      { kind: 'ring', color: FP_COLOR(), label: tr('False positive (solid circle)', 'False positive (lingkaran penuh)') },
      { kind: 'ring', color: FN_COLOR(), label: tr('False negative (dashed circle)', 'False negative (lingkaran putus-putus)') },
      { kind: 'line', color: theme().ink, label: tr('Boundary at your threshold', 'Batas pada threshold-mu') },
      { kind: 'dash', color: theme().muted, label: tr('Boundary at 0.5', 'Batas pada 0,5') },
    ]);
    lab.describe(lab.canvas, tr(
      `${fmt(s1.n)} examples. At threshold ${two(t)}: ${fmt(s1.tp)} true positives, ${fmt(s1.fp)} false positives, ${fmt(s1.tn)} true negatives, ${fmt(s1.fn)} false negatives.`,
      `${fmt(s1.n)} contoh. Pada threshold ${two(t)}: ${fmt(s1.tp)} true positive, ${fmt(s1.fp)} false positive, ${fmt(s1.tn)} true negative, ${fmt(s1.fn)} false negative.`));
    lab.describe(chart, tr(
      `Sigmoid curve from score to probability with a threshold at probability ${two(t)}; ${count(s1.flagged, 'example lies', 'examples lie')} to the right of it and ${s1.flagged === 1 ? 'is' : 'are'} called positive.`,
      `Kurva sigmoid dari skor ke probabilitas dengan threshold pada probabilitas ${two(t)}; ${fmt(s1.flagged)} contoh berada di kanannya dan diprediksi positif.`));

    if (isReal()) {
      dataNote.textContent = tr(
        `${fmt(info.X.length)} of ${fmt(info.total)} penguins have both measurements; ${fmt(info.dropped)} rows with missing values (NA) are left out. Positive: Gentoo (${fmt(info.positives)}). New sample only changes the generated data.`,
        `${fmt(info.X.length)} dari ${fmt(info.total)} penguin punya kedua pengukuran; ${fmt(info.dropped)} baris dengan missing value (NA) dibuang. Positif: Gentoo (${fmt(info.positives)}). Sampel baru hanya mengubah data buatan.`);
    } else if (loadFailed) dataNote.textContent = tr('Could not load the penguin data, so the generated data is shown.', 'Data penguin tidak bisa dimuat, jadi data buatan yang ditampilkan.');
    else dataNote.textContent = tr('Two overlapping blobs of generated points (seeded, so everyone sees the same ones).', 'Dua kelompok titik buatan yang saling tumpang tindih (memakai seed, jadi semua orang melihat titik yang sama).');
    table(d, s0, s1);
  }

  // After a change that is complete: redraw, then check the prediction.
  function settle() { draw(); revealPrediction(); }
  lab.on(lab.canvas, 'keydown', e => {
    const dir = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key];
    if (!dir || loading) return;
    e.preventDefault();
    const next = Math.min(THRESHOLD_MAX, Math.max(THRESHOLD_MIN, Math.round((thresholdNow() + dir * (e.shiftKey ? 0.05 : 0.01)) * 100) / 100));
    controls.set('threshold', next);
    draw(); settleSoon();
  });

  lab.onReset(() => {
    loadToken += 1;
    mode = 'generated'; seed = GENERATED_SEED; generated = null; loading = false; loadFailed = false;
    controls.set('data', 'generated'); controls.set('threshold', THRESHOLD_DEFAULT); controls.set('shade', true);
    box.reset();
    draw();
  });
  lab.onTheme(draw);
  lab.onResize(draw);
  lab.cleanup(() => { destroyed = true; loadToken += 1; });
  draw();
  return lab.destroy;
}
