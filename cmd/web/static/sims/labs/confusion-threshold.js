// Lab: slide a decision threshold over seeded classifier scores and watch the
// confusion matrix, the scores and the ROC curve respond.
// Math lives in sims/ml/classifierscores.js and sims/ml/metrics.js; this file draws and wires.
import { createLab, drawLineChart, clusterColor, theme, tr, fmt, count } from '../kit/index.js';
import { atThreshold, auc } from '../ml/metrics.js';
import { makeScores, fastRoc, histogram, accuracyTrap, alwaysNoAccuracy } from '../ml/classifierscores.js';

const DEFAULTS = { threshold: 2.5, share: 5, separation: 2, n: 2000 };
const T_MIN = -3, T_MAX = 6, T_STEP = 0.1;
const LO = -4, HI = 7, BIN_WIDTH = 0.25;
const BINS = Math.round((HI - LO) / BIN_WIDTH);
const NEG = () => clusterColor(0), POS = () => clusterColor(1);
// One color per confusion-matrix cell (CSS variables, so the matrix follows the theme).
// The names are built when the matrix is drawn, so they follow the language.
const CELL_VARS = { tp: '--k2', fn: '--k5', fp: '--k3', tn: '--k4' };
const cellText = key => ({
  tp: { name: tr('True positive', 'True positive'), note: tr('a real case, caught', 'positif asli, terdeteksi') },
  fn: { name: tr('False negative', 'False negative'), note: tr('a real case, missed', 'positif asli, terlewat') },
  fp: { name: tr('False positive', 'False positive'), note: tr('a false alarm', 'alarm palsu') },
  tn: { name: tr('True negative', 'True negative'), note: tr('correctly left alone', 'benar diabaikan') },
}[key]);
// Fixed decimals the way toFixed rounds them (so English reads exactly as before), then printed in the
// learner's number format. fmt() alone rounds half-even in ICU and would show 96.6 where toFixed shows 96.5.
const fx = (v, digits) => fmt(Number(v.toFixed(digits)), { digits });
const pct = v => `${fx(v * 100, 1)}%`;
const cellColor = key => clusterColor({ tp: 2, fp: 3, tn: 4, fn: 5 }[key]);

// One plain sentence about the current result; calls out the accuracy trap. (English wording as in
// sims/ml/classifierscores.js statusSentence, which stays language-free math.)
function status(r) {
  const positives = r.tp + r.fn, flagged = r.tp + r.fp;
  const cases = count(positives, 'positive case', 'kasus positif');
  const trap = tr('Accuracy trap:', 'Jebakan accuracy:');
  if (accuracyTrap(r)) {
    if (flagged === 0) return tr(`${trap} it never says yes, yet it is ${pct(r.accuracy)} accurate. It finds none of the ${cases}.`,
      `${trap} modelnya tidak pernah menjawab ya, tetapi accuracy-nya tetap ${pct(r.accuracy)}. Dari ${cases}, tidak satu pun yang ditemukan.`);
    if (r.tp === 0) return tr(`${trap} ${pct(r.accuracy)} accurate, but it finds none of the ${cases} (recall ${pct(r.recall)}).`,
      `${trap} accuracy-nya ${pct(r.accuracy)}, tetapi tidak satu pun dari ${cases} yang ditemukan (recall ${pct(r.recall)}).`);
    return tr(`${trap} ${pct(r.accuracy)} accurate, but it finds only ${fmt(r.tp)} of the ${cases} (recall ${pct(r.recall)}).`,
      `${trap} accuracy-nya ${pct(r.accuracy)}, tetapi hanya ${fmt(r.tp)} dari ${cases} yang ditemukan (recall ${pct(r.recall)}).`);
  }
  if (flagged === 0) return tr(`It never says yes, so it finds none of the ${cases}.`,
    `Modelnya tidak pernah menjawab ya, jadi tidak satu pun dari ${cases} yang ditemukan.`);
  if (r.recall >= 0.8 && r.precision < 0.5) return tr(`It finds ${fmt(r.tp)} of the ${cases}, but only ${pct(r.precision)} of its yes answers are right.`,
    `${fmt(r.tp)} dari ${cases} ditemukan, tetapi hanya ${pct(r.precision)} jawaban ya-nya yang benar.`);
  if (r.precision >= 0.8 && r.recall < 0.6) return tr(`Its yes answers are ${pct(r.precision)} right, but it misses ${fmt(r.fn)} of the ${cases}.`,
    `Jawaban ya-nya ${pct(r.precision)} benar, tetapi ${fmt(r.fn)} dari ${cases} terlewat.`);
  return tr(`It says yes to ${count(flagged, 'case', 'kasus')} and finds ${fmt(r.tp)} of the ${cases}.`,
    `Model menjawab ya untuk ${fmt(flagged)} kasus, dan ${fmt(r.tp)} dari ${cases} berhasil ditemukan.`);
}

function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v);
  e.append(...kids);
  return e;
}

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Scores and a threshold', 'Skor dan threshold'),
    hint: tr('Every case gets a score. The dashed line is the threshold: scores at or above it are answered yes. Drag the line, or focus the plot and use the arrow keys.',
      'Setiap kasus punya skor. Garis putus-putus itu threshold-nya: skor di atas atau sama dengan garis ini dijawab ya. Seret garisnya, atau fokus ke plot lalu gunakan tombol panah.'),
    status: true, legend: true,
    canvasLabel: tr('Threshold line on the histogram of classifier scores for positive and negative cases. Drag it or use the arrow keys.',
      'Garis threshold pada histogram skor classifier untuk kasus positif dan negatif. Seret garisnya atau gunakan tombol panah.'),
  });

  let seed = 1, data = null, roc = null, aucValue = 0;
  // Where the plot area sits on the canvas (set by drawHistogram), so a pointer position maps to a score.
  let geom = null;

  const controls = lab.panel([
    { name: 'threshold', type: 'range', label: tr('Threshold', 'Threshold'), min: T_MIN, max: T_MAX, step: T_STEP, value: DEFAULTS.threshold, format: v => fx(v, 1) },
    { name: 'share', type: 'range', label: tr('Share of positive cases', 'Persentase kasus positif'), min: 1, max: 50, step: 1, value: DEFAULTS.share, format: v => `${fmt(v)}%` },
    { name: 'separation', type: 'range', label: tr('Separation', 'Jarak antarkelas'), min: 0, max: 4, step: 0.1, value: DEFAULTS.separation, format: v => fx(v, 1) },
    { name: 'n', type: 'range', label: tr('Number of cases', 'Jumlah kasus'), min: 100, max: 5000, step: 100, value: DEFAULTS.n, format: v => fmt(v) },
    { name: 'share-class', type: 'toggle', label: tr('Show each class as a share of its own cases', 'Tampilkan sebagai % dari tiap kelas'), value: false },
    { name: 'sample', type: 'button', label: tr('New sample', 'Sampel baru'), onClick: () => { seed++; regenerate(); draw(); } },
    { type: 'note', text: tr('Separation is how far apart the two class averages are, in units of the spread. 0 means the scores say nothing.',
      'Jarak antarkelas = selisih rata-rata skor kedua kelas, dalam satuan sebarannya. Jika 0, skornya tidak membantu sama sekali.') },
  ], name => { if (name === 'share' || name === 'separation' || name === 'n') regenerate(); draw(); });

  controls.el.querySelector('.panel-button').style.margin = '14px 0 0';
  // Six legend entries wrap on a phone; show them all instead of behind an inner scroll area.
  const legendEl = lab.ref('legend');
  if (legendEl) { legendEl.style.maxHeight = 'none'; legendEl.style.overflow = 'visible'; legendEl.style.gap = '6px 14px'; }

  // The matrix and the score tiles, in a card that sits beside the ROC card.
  const pair = h('div', { 'data-ref': 'pair', style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,400px),1fr));gap:18px;align-items:start' });
  const cells = {}, tiles = {};
  const cell = key => {
    const c = { v: CELL_VARS[key], ...cellText(key) };
    const count = h('div', { style: 'font-size:clamp(24px,5vw,34px);font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums' });
    cells[key] = count;
    return h('div', { 'data-cell': key, style: `background:color-mix(in srgb, var(${c.v}) 20%, var(--surface));border:2px solid var(${c.v});border-radius:12px;padding:12px 10px;text-align:center;min-width:0` },
      count, h('div', { style: 'font-weight:700;font-size:13px;margin-top:4px' }, `${c.name} (${key.toUpperCase()})`), h('div', { style: 'font-size:12px' }, c.note));
  };
  const head = text => h('div', { style: 'font-size:12px;font-weight:700;color:var(--muted);text-align:center;align-self:end;padding-bottom:2px' }, text);
  const side = text => h('div', { style: `font-size:12px;font-weight:700;color:var(--muted);align-self:center;max-width:${tr('64px', '80px')}` }, text);
  const matrixCard = h('section', { class: 'card table-card', style: 'margin-top:0' },
    h('h3', {}, tr('Confusion matrix', 'Confusion matrix')),
    h('p', { class: 'hint' }, tr('Counts of cases. Rows are the truth, columns are what the classifier said.',
      'Jumlah kasus. Baris = kenyataan, kolom = prediksi classifier.')),
    h('div', { 'data-ref': 'matrix', style: 'display:grid;grid-template-columns:auto minmax(0,1fr) minmax(0,1fr);gap:8px;margin-top:14px' },
      h('div'), head(tr('Says yes', 'Prediksi ya')), head(tr('Says no', 'Prediksi tidak')),
      side(tr('Actually yes', 'Aslinya ya')), cell('tp'), cell('fn'),
      side(tr('Actually no', 'Aslinya tidak')), cell('fp'), cell('tn')));
  const tileGrid = h('div', { 'data-ref': 'tiles', style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-top:16px' });
  const tile = (key, label, how) => {
    const value = h('div', { style: 'font-size:22px;font-weight:800;font-variant-numeric:tabular-nums' });
    tiles[key] = value;
    tileGrid.append(h('div', { 'data-tile': key, style: 'border:1px solid var(--line);border-radius:10px;padding:9px 11px;min-width:0' },
      h('div', { style: 'font-size:12px;font-weight:700;color:var(--muted)' }, label), value, h('div', { style: 'font-size:12px;color:var(--muted)' }, how)));
  };
  // A formula only wraps after its slash, never in the middle of "2 TP" or "(TP + FP)".
  const formula = text => text.split(' / ').map(part => part.replaceAll(' ', '\u00a0')).join('\u00a0/ ');
  tile('accuracy', tr('Accuracy', 'Accuracy'), formula(tr('(TP + TN) / all cases', '(TP + TN) / semua kasus')));
  tile('precision', tr('Precision', 'Precision'), formula('TP / (TP + FP)'));
  tile('recall', 'Recall', formula('TP / (TP + FN)'));
  tile('f1', 'F1', formula('2 TP / (2 TP + FP + FN)'));
  tile('fpr', 'False-positive rate', formula('FP / (FP + TN)'));
  tile('auc', 'AUC', tr('area under the ROC curve', 'luas area di bawah kurva ROC'));
  matrixCard.append(tileGrid);
  pair.append(matrixCard);
  lab.ref('below').append(pair);

  const rocCanvas = lab.chartCard(tr('ROC curve', 'Kurva ROC'), tr('The whole classifier at every threshold.', 'Performa classifier di semua threshold.'), 340);
  const rocCard = rocCanvas.closest('section');
  rocCard.style.marginTop = '0';
  pair.append(rocCard);
  const rocHint = rocCard.querySelector('.hint');

  function regenerate() {
    const v = controls.values();
    data = makeScores({ n: v.n, prevalence: v.share / 100, separation: v.separation, seed });
    roc = fastRoc(data.scores, data.actual);
    aucValue = auc(roc);
  }

  function drawHistogram(v, r) {
    const ctx = lab.canvas.getContext('2d'), t = theme();
    const { width, height } = lab.canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    lab.canvas.width = Math.round(width * ratio); lab.canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const m = { l: 52, r: 14, t: 56, b: 44 };
    const W = width - m.l - m.r;
    // The four outcomes are written above the plot, each block beside its own side of the threshold line.
    // When the two blocks would run into each other (many cases on a narrow screen), print short counts
    // (2.5k), and as a last resort stack each block's two counts on two lines. Type never goes below 12px.
    const short = n => (n >= 1000 ? `${fx(n / 1000, 1)}k` : String(n));
    const parts = (a, b, format) => [[a, `${a.toUpperCase()} ${format(r[a])}`], [b, `${b.toUpperCase()} ${format(r[b])}`]];
    const measure = (ps, size) => { ctx.font = `700 ${size}px system-ui, sans-serif`; return ps.map(p => ctx.measureText(p[1]).width); };
    const titles = { no: tr('Says no', 'Prediksi tidak'), yes: tr('Says yes', 'Prediksi ya') };
    const sideWidth = (title, ps, size, stack) => {
      const counts = measure(ps, size);
      ctx.font = '600 12px system-ui, sans-serif';
      return Math.max(ctx.measureText(title).width, stack ? Math.max(...counts) : counts[0] + 12 + counts[1]);
    };
    const layouts = [[13, fmt, false], [12, fmt, false], [12, short, false], [12, fmt, true]];
    const sidesOf = ([size, format, stack]) => [sideWidth(titles.no, parts('fn', 'tn', format), size, stack), sideWidth(titles.yes, parts('tp', 'fp', format), size, stack)];
    const layout = layouts.find(l => sidesOf(l).reduce((x, y) => x + y, 0) + 28 <= W) ?? layouts[3];
    const [size, format, stacked] = layout, [noW, yesW] = sidesOf(layout);
    if (stacked) m.t = 74;
    const H = height - m.t - m.b;
    const hist = histogram(data.scores, data.actual, LO, HI, BINS);
    const nPos = r.tp + r.fn, nNeg = r.tn + r.fp;
    const share = v['share-class'];
    const scale = share ? hist.pos.map(c => c / nPos * 100).concat(hist.neg.map(c => c / nNeg * 100)) : hist.pos.concat(hist.neg);
    const rawMax = Math.max(...scale, 1);
    const stepSize = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000].find(s => rawMax / s <= 5) ?? 5000;
    const yMax = Math.ceil(rawMax / stepSize) * stepSize;
    const X = x => m.l + (x - LO) / (HI - LO) * W, Y = y => m.t + H - y / yMax * H;
    const val = (count, total) => (share ? count / total * 100 : count);

    ctx.fillStyle = t.plot; ctx.fillRect(m.l, m.t, W, H);
    // The yes region, lightly tinted.
    ctx.fillStyle = t.accent; ctx.globalAlpha = 0.09; ctx.fillRect(X(v.threshold), m.t, m.l + W - X(v.threshold), H); ctx.globalAlpha = 1;
    ctx.font = '12px system-ui, sans-serif'; ctx.strokeStyle = t.grid; ctx.fillStyle = t.muted; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 0; y <= yMax; y += stepSize) { ctx.moveTo(m.l, Y(y)); ctx.lineTo(m.l + W, Y(y)); ctx.textAlign = 'right'; ctx.fillText(fmt(y), m.l - 6, Y(y) + 4); }
    for (let x = Math.ceil(LO); x <= HI; x++) { ctx.moveTo(X(x), m.t); ctx.lineTo(X(x), m.t + H); ctx.textAlign = 'center'; ctx.fillText(fmt(x), X(x), m.t + H + 16); }
    ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillText(tr(`Classifier score (threshold ${fx(v.threshold, 1)})`, `Skor classifier (threshold ${fx(v.threshold, 1)})`), m.l + W / 2, height - 6);
    ctx.save(); ctx.translate(13, m.t + H / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(share ? tr('% of the class', '% dari kelas') : tr('Number of cases', 'Jumlah kasus'), 0, 0); ctx.restore();

    // Bars: negatives first, positives on top, both see-through so the overlap shows.
    const bw = W / BINS;
    for (const [counts, total, color] of [[hist.neg, nNeg, NEG()], [hist.pos, nPos, POS()]]) {
      ctx.fillStyle = color; ctx.globalAlpha = 0.7;
      counts.forEach((c, i) => { if (c) ctx.fillRect(m.l + i * bw + 0.5, Y(val(c, total)), Math.max(1, bw - 1), m.t + H - Y(val(c, total))); });
      ctx.globalAlpha = 1;
    }
    // Threshold line with a small handle on top.
    const tx = X(v.threshold);
    ctx.save(); ctx.setLineDash([6, 4]); ctx.lineWidth = 2; ctx.strokeStyle = t.ink; ctx.beginPath(); ctx.moveTo(tx, m.t - 6); ctx.lineTo(tx, m.t + H); ctx.stroke(); ctx.restore();
    ctx.fillStyle = t.ink; ctx.beginPath(); ctx.moveTo(tx - 6, m.t - 12); ctx.lineTo(tx + 6, m.t - 12); ctx.lineTo(tx, m.t - 4); ctx.closePath(); ctx.fill();

    // Titles and counts for each side of the line (layout chosen above). The "no" block ends just left
    // of the line and the "yes" block starts just right of it; near an edge they slide inward so
    // neither leaves the plot or covers the other.
    let noRight = tx - 10, yesLeft = tx + 10;
    if (noRight - noW < m.l) { noRight = m.l + noW; yesLeft = Math.max(yesLeft, noRight + 16); }
    if (yesLeft + yesW > m.l + W) { yesLeft = m.l + W - yesW; noRight = Math.min(noRight, yesLeft - 16); }
    const block = (title, ps, x, align) => {
      const widths = measure(ps, size), right = align === 'right';
      ctx.textAlign = align; ctx.font = '600 12px system-ui, sans-serif'; ctx.fillStyle = t.muted; ctx.fillText(title, x, m.t - (stacked ? 50 : 30));
      ctx.font = `700 ${size}px system-ui, sans-serif`;
      if (stacked) {
        ps.forEach(([key, label], i) => { ctx.fillStyle = cellColor(key); ctx.fillText(label, x, m.t - 34 + i * 15); });
        return;
      }
      let px = right ? x - widths[0] - 12 - widths[1] : x;
      ctx.textAlign = 'left';
      ps.forEach(([key, label], i) => { ctx.fillStyle = cellColor(key); ctx.fillText(label, px, m.t - 14); px += widths[i] + 12; });
    };
    block(titles.no, parts('fn', 'tn', format), noRight, 'right');
    block(titles.yes, parts('tp', 'fp', format), yesLeft, 'left');
    geom = { l: m.l, W };
  }

  function drawRoc(r) {
    const t = theme();
    const { X, Y } = drawLineChart(rocCanvas, {
      series: [
        { xs: [0, 1], ys: [0, 1], color: t.muted, dash: true, points: false },
        { xs: roc.map(p => p.fpr), ys: roc.map(p => p.tpr), color: clusterColor(0), points: false },
      ],
      xLabel: tr('False-positive rate  (FP / all real negatives)', 'False-positive rate  (FP / semua negatif asli)'), yLabel: 'True-positive rate (recall)', xMin: 0, xMax: 1, yMin: 0, yMax: 1,
    });
    const ctx = rocCanvas.getContext('2d');
    const x = X(r.fpr), y = Y(r.recall);
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, 7, 0, 2 * Math.PI); ctx.fillStyle = clusterColor(1); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = t.ink; ctx.stroke();
    const { width } = rocCanvas.getBoundingClientRect();
    const labelText = tr(`threshold ${fx(controls.values().threshold, 1)}`, `threshold ${fx(controls.values().threshold, 1)}`);
    ctx.font = '600 12px system-ui, sans-serif'; ctx.fillStyle = t.ink;
    const left = x + 14 + ctx.measureText(labelText).width > width - 10;
    ctx.textAlign = left ? 'right' : 'left';
    const lx = left ? x - 14 : x + 14, ly = y + 22 > Y(0) - 6 ? y - 10 : y + 18;
    ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = t.plot; ctx.strokeText(labelText, lx, ly);
    ctx.fillText(labelText, lx, ly);
    ctx.fillStyle = t.muted; ctx.textAlign = 'left';
    ctx.fillText(tr('coin flip', 'tebak acak'), X(0.62), Y(0.62) + 24);
    ctx.restore();
  }

  function draw() {
    if (!data) regenerate();
    const v = controls.values();
    const r = atThreshold(data.scores, data.actual, v.threshold);
    drawHistogram(v, r);
    drawRoc(r);

    for (const key of Object.keys(cells)) cells[key].textContent = fmt(r[key]);
    for (const key of ['accuracy', 'recall', 'f1', 'fpr']) tiles[key].textContent = pct(r[key]);
    tiles.precision.textContent = r.tp + r.fp === 0 ? tr('none yet', 'belum ada') : pct(r.precision);
    tiles.auc.textContent = fx(aucValue, 3);
    rocHint.textContent = tr(`AUC = ${fx(aucValue, 3)}. The dashed diagonal is a coin flip (${fmt(0.5)}). The dot is the current threshold.`,
      `AUC = ${fx(aucValue, 3)}. Diagonal putus-putus = tebak acak, seperti melempar koin (${fmt(0.5)}). Titik = threshold saat ini.`);

    const total = r.tp + r.fp + r.tn + r.fn;
    lab.canvas.setAttribute('aria-valuenow', String(v.threshold));
    lab.canvas.setAttribute('aria-valuetext', `threshold ${fx(v.threshold, 1)}`);
    lab.setStatus(status(r));
    lab.setDetail(tr(`Always answering no would be ${pct(alwaysNoAccuracy(r))} accurate on these ${fmt(total)} cases.`,
      `Jika model selalu menjawab tidak, accuracy-nya tetap ${pct(alwaysNoAccuracy(r))} untuk ${fmt(total)} kasus ini.`));
    lab.setMetrics(tr(`${fmt(total)} cases, ${fmt(r.tp + r.fn)} positive`, `${fmt(total)} kasus, ${fmt(r.tp + r.fn)} positif`));
    lab.setLegend([
      { kind: 'dot', color: NEG(), label: tr('Actually no', 'Aslinya tidak') },
      { kind: 'dot', color: POS(), label: tr('Actually yes', 'Aslinya ya') },
      { kind: 'dot', color: cellColor('tp'), label: tr('TP caught', 'TP terdeteksi') }, { kind: 'dot', color: cellColor('fp'), label: tr('FP false alarm', 'FP alarm palsu') },
      { kind: 'dot', color: cellColor('tn'), label: tr('TN left alone', 'TN diabaikan') }, { kind: 'dot', color: cellColor('fn'), label: tr('FN missed', 'FN terlewat') },
    ]);
  }

  // The dashed line is a control: drag it (or click the plot with a mouse), or focus the plot and use the
  // keys. Every route goes through the same slider, so the number beside it always agrees.
  const canvas = lab.canvas;
  const clampT = v => Math.min(T_MAX, Math.max(T_MIN, Math.round(v / T_STEP) * T_STEP));
  const setThreshold = value => {
    const next = Number(clampT(value).toFixed(1));
    if (next === controls.get('threshold')) return;
    controls.set('threshold', next);
    draw();
  };
  const scoreAt = clientX => {
    const box = canvas.getBoundingClientRect();
    return LO + (clientX - box.left - geom.l) / geom.W * (HI - LO);
  };
  let dragging = null;
  canvas.setAttribute('role', 'slider');
  canvas.setAttribute('aria-orientation', 'horizontal');
  canvas.setAttribute('aria-valuemin', String(T_MIN));
  canvas.setAttribute('aria-valuemax', String(T_MAX));
  // Sideways drags move the line; vertical swipes still scroll the page on a phone.
  canvas.style.touchAction = 'pan-y';
  canvas.style.cursor = 'ew-resize';
  lab.on(canvas, 'pointerdown', e => {
    if (!geom || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const box = canvas.getBoundingClientRect();
    const lineX = box.left + geom.l + (controls.get('threshold') - LO) / (HI - LO) * geom.W;
    // A mouse can set the line anywhere in the plot. Touch and pen must start on the line, so a swipe
    // that starts elsewhere keeps scrolling the page.
    if (e.pointerType !== 'mouse' && Math.abs(e.clientX - lineX) > 28) return;
    dragging = e.pointerId;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* the drag still works while the pointer stays over the plot */ }
    canvas.focus({ preventScroll: true });
    if (e.pointerType === 'mouse') { canvas.style.cursor = 'grabbing'; setThreshold(scoreAt(e.clientX)); }
    e.preventDefault();
  });
  lab.on(canvas, 'pointermove', e => { if (dragging === e.pointerId && geom) setThreshold(scoreAt(e.clientX)); });
  const endDrag = e => {
    if (dragging !== e.pointerId) return;
    dragging = null;
    canvas.style.cursor = 'ew-resize';
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
  };
  lab.on(canvas, 'pointerup', endDrag);
  lab.on(canvas, 'pointercancel', endDrag);
  lab.on(canvas, 'keydown', e => {
    const now = controls.get('threshold');
    const jump = e.shiftKey ? 10 : 1;
    const next = { ArrowLeft: now - T_STEP * jump, ArrowDown: now - T_STEP * jump, ArrowRight: now + T_STEP * jump, ArrowUp: now + T_STEP * jump,
      PageDown: now - 1, PageUp: now + 1, Home: T_MIN, End: T_MAX }[e.key];
    if (next === undefined || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    setThreshold(next);
  });

  lab.onReset(() => {
    seed = 1;
    for (const [name, value] of Object.entries({ threshold: DEFAULTS.threshold, share: DEFAULTS.share, separation: DEFAULTS.separation, n: DEFAULTS.n, 'share-class': false })) controls.set(name, value);
    regenerate(); draw();
  });
  lab.onTheme(draw);
  lab.onResize(draw);
  regenerate();
  draw();
  return lab.destroy;
}
