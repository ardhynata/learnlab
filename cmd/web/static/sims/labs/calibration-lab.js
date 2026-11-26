// Calibration lab: three predictors score the SAME cases in the SAME order, so their ROC curves lie on top
// of each other and their AUC is identical, yet their probabilities mean different things (well calibrated,
// overconfident, underconfident). The learner reads a reliability diagram per predictor, the Brier score,
// and then makes a decision: costs for the two kinds of mistake, a threshold (typed in, or the cost-based
// one), and the expected cost per case at that threshold and at each predictor's own best threshold. A
// Platt-scaling toggle fixes the numbers without touching the ranking; a prevalence slider shows how the
// share of positives moves every number.
// The data is always generated: the bundled penguins data holds no scored predictions to calibrate, and the
// lab says so. Math lives in sims/ml/calibration.js (curves, scores, costs) and sims/ml/calibrationlab.js
// (the sample, the recalibration and the decision numbers); this file draws and wires.
import { createLab, drawLineChart, clusterColor, theme, tr, fmt, pct, predictBox } from '../kit/index.js';
import { rocCurve, reliability, costCurve } from '../ml/calibration.js';
import {
  PREVALENCE_MIN, PREVALENCE_MAX, buildPredictors, costThreshold, summarize, halfDecisions,
} from '../ml/calibrationlab.js';

const DEFAULTS = { prevalence: 20, fp: 1, fn: 5, threshold: 0.5, costBased: false, recal: false };
const CASES = 1000;       // cases scored in the sample
const BINS = 10;          // reliability bins
const SMALL_BIN = 10;     // a bin with fewer cases than this is drawn hollow: its observed share is noisy

// Per predictor: name, colour, marker radius. The radii nest (largest drawn first) so three markers that sit
// on the same ROC point all stay visible.
const STYLE = {
  good: { color: () => clusterColor(2), radius: 5.5, width: 5, shape: 'circle' },
  overconfident: { color: () => clusterColor(1), radius: 8, width: 9, shape: 'diamond' },
  underconfident: { color: () => clusterColor(3), radius: 3.2, width: 2, shape: 'square' },
};
const nameOf = key => ({
  good: tr('Well calibrated', 'Terkalibrasi baik'),
  overconfident: tr('Overconfident', 'Overconfident'),
  underconfident: tr('Underconfident', 'Underconfident'),
}[key]);

const f2 = v => fmt(v, { digits: 2 });
const f3 = v => fmt(v, { digits: 3 });
// A threshold the learner can read: Infinity means "flag nothing".
const cutText = t => (Number.isFinite(t) ? f2(t) : tr('none (flags nothing)', 'tidak ada (tidak menandai apa pun)'));
const sameValue = (a, b) => Math.abs(a - b) < 1e-9;

function drawMark(ctx, shape, x, y, r, { fill, stroke, lineWidth = 2 }) {
  ctx.beginPath();
  if (shape === 'circle') ctx.arc(x, y, r, 0, 2 * Math.PI);
  else if (shape === 'diamond') { ctx.moveTo(x, y - r * 1.25); ctx.lineTo(x + r * 1.25, y); ctx.lineTo(x, y + r * 1.25); ctx.lineTo(x - r * 1.25, y); ctx.closePath(); }
  else ctx.rect(x - r, y - r, 2 * r, 2 * r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lineWidth; ctx.strokeStyle = stroke; ctx.stroke(); }
}

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Same ranking, different probabilities', 'Ranking sama, probabilitas berbeda'),
    hint: tr(
      'Three predictors score the same cases in the same order, so their ROC curves lie on top of each other. The markers show where each one ends up at your threshold: a filled marker for your threshold, a ring for the best threshold of that predictor.',
      'Tiga predictor (terkalibrasi baik, overconfident atau terlalu yakin, underconfident atau kurang yakin) menilai kasus yang sama dengan urutan yang sama, sehingga kurva ROC-nya saling menumpuk. Penanda menunjukkan posisi tiap predictor pada threshold-mu: penanda penuh untuk threshold-mu, cincin untuk threshold terbaik predictor itu.'),
    status: true, legend: true,
    canvasLabel: tr('ROC curves of three predictors, lying on top of each other, with a marker for each predictor at the chosen threshold',
      'Kurva ROC tiga predictor yang saling menumpuk, dengan satu penanda untuk tiap predictor pada threshold yang dipilih'),
    settingsTitle: tr('Controls', 'Pengaturan'),
    extra: {
      title: tr('Decision panel: what each predictor costs', 'Panel keputusan: biaya tiap predictor'),
      hint: tr(
        'Cost per case = (false positives × cost of a false positive + false negatives × cost of a false negative) ÷ number of cases. The shaded cell is the cheapest at your threshold. Every predictor reaches the same lowest cost at its own best threshold, because the ranking is the same; only the threshold that gets there moves.',
        'Biaya per kasus = (false positive × biaya false positive + false negative × biaya false negative) ÷ jumlah kasus. Sel yang diberi warna adalah yang termurah pada threshold-mu. Semua predictor mencapai biaya terendah yang sama pada threshold terbaiknya masing-masing, karena urutannya sama; yang bergeser hanya threshold untuk mencapainya.'),
    },
  });
  // The ROC plot is a picture, not a control: no drag, so no application role.
  lab.canvas.setAttribute('role', 'img');
  lab.canvas.removeAttribute('tabindex');

  const box = predictBox(lab.ref('below'), {
    question: tr('Two models have exactly the same AUC. Will they make the same decisions at a 0.5 threshold?',
      'Dua model memiliki AUC yang persis sama. Apakah keduanya akan mengambil keputusan yang sama pada threshold 0,5?'),
    choices: [
      ['same', tr('Yes, the same decisions', 'Ya, keputusannya sama')],
      ['differ', tr('No, they will flag different cases', 'Tidak, keduanya menandai kasus yang berbeda')],
    ],
    name: 'calibration-predict',
  });

  const reliabilityCanvas = lab.chartCard(
    tr('Reliability diagram of each predictor', 'Reliability diagram tiap predictor'),
    tr('Cases are put into 10 bins by predicted probability. Each dot compares the average prediction in a bin (across) with the share of positives that really happened (up). A calibrated predictor sits on the dashed diagonal. A dot above it means more positives than predicted; below it, fewer. The numbers under each diagram are the cases in each bin. A hollow dot has fewer than 10 cases, so its observed share is noisy. Overconfident means the probabilities are more extreme than what happens; underconfident means they are more cautious.',
      'Kasus dikelompokkan ke 10 bin menurut probabilitas prediksinya. Tiap titik membandingkan rata-rata prediksi dalam satu bin (mendatar) dengan proporsi kasus positif yang benar-benar terjadi (tegak). Predictor yang terkalibrasi berada di diagonal putus-putus. Titik di atas diagonal berarti positif lebih banyak daripada yang diprediksi; di bawahnya, lebih sedikit. Angka di bawah tiap diagram adalah jumlah kasus di tiap bin. Titik berongga berisi kurang dari 10 kasus, sehingga proporsi teramatinya kurang stabil. Overconfident (terlalu yakin) berarti probabilitasnya lebih ekstrem daripada kenyataan; underconfident (kurang yakin) berarti lebih hati-hati.'),
    260);
  const costCanvas = lab.chartCard(
    tr('Expected cost per case against threshold', 'Biaya per kasus terhadap threshold'),
    tr('Each curve is one predictor. Its lowest point (marked) is its best threshold. The solid vertical line is your threshold; the dotted one is the cost-based threshold, false-positive cost ÷ (false-positive cost + false-negative cost). The three curves reach the same lowest cost, but at different thresholds.',
      'Tiap kurva adalah satu predictor. Titik terendahnya (diberi tanda) adalah threshold terbaiknya. Garis tegak penuh adalah threshold-mu; garis titik-titik adalah threshold berbasis biaya, yaitu biaya false positive ÷ (biaya false positive + biaya false negative). Ketiga kurva mencapai biaya terendah yang sama, tetapi pada threshold yang berbeda.'),
    280);

  // Names for the three cost curves, as a legend above the chart (the chart's own legend would sit on the curves).
  const costLegend = document.createElement('div');
  costLegend.className = 'legend';
  costCanvas.closest('.chart').before(costLegend);

  const state = { seed: 1, key: '', model: null };

  const controls = lab.panel([
    { type: 'note', text: tr(
      'Data: generated. The penguins data has no model probabilities to calibrate, and no NA values are read here.',
      'Data: buatan. Data penguin tidak punya probabilitas model untuk dikalibrasi, dan tidak ada nilai NA yang dibaca di sini.') },
    { name: 'prevalence', type: 'range', label: tr('Share of positive cases (prevalence)', 'Persentase kasus positif (prevalensi)'), min: Math.round(PREVALENCE_MIN * 100), max: Math.round(PREVALENCE_MAX * 100), step: 1, value: DEFAULTS.prevalence, format: v => `${fmt(v)}%` },
    { name: 'fp', type: 'number', label: tr('Cost of a false positive', 'Biaya false positive'), min: 0, max: 100, step: 1, value: DEFAULTS.fp },
    { name: 'fn', type: 'number', label: tr('Cost of a false negative', 'Biaya false negative'), min: 0, max: 100, step: 1, value: DEFAULTS.fn },
    { name: 'costBased', type: 'toggle', label: tr('Use the cost-based threshold', 'Pakai threshold berbasis biaya'), value: DEFAULTS.costBased },
    { name: 'threshold', type: 'range', label: tr('Decision threshold', 'Threshold keputusan'), min: 0.01, max: 0.99, step: 0.01, value: DEFAULTS.threshold, format: f2 },
    { name: 'recal', type: 'toggle', label: tr('Recalibrate (Platt scaling)', 'Rekalibrasi (Platt scaling)'), value: DEFAULTS.recal },
    { name: 'fresh', type: 'button', label: tr('New sample', 'Sampel baru'), onClick: () => { state.seed += 1; newRound(); draw(); } },
    { type: 'note', text: tr(
      'Flagged positive: score at or above the threshold. Recalibrating fits a map on a separate 3,000-case sample; it keeps the order, so the AUC stays.',
      'Ditandai positif: skor sama dengan atau di atas threshold. Rekalibrasi mencocokkan peta pada sampel terpisah 3.000 kasus; urutan terjaga, jadi AUC tetap.') },
  ], onControl);
  const toggleLabels = controls.el.querySelectorAll('label.toggle');
  const costBasedLabel = toggleLabels[0].lastChild;

  function newRound() { box.reset(); }

  function onControl(name) {
    if (name === 'threshold' || name === 'costBased') { draw(); return; }
    newRound();
    draw();
  }

  // The sample and the three predictors only change with the seed, the prevalence and the recalibration toggle.
  function compute(v) {
    const key = `${state.seed}|${v.prevalence}|${v.recal}`;
    if (state.key !== key) {
      const { labels, predictors } = buildPredictors({ n: CASES, prevalence: v.prevalence / 100, seed: state.seed, recalibrated: v.recal });
      const positives = labels.reduce((a, y) => a + y, 0);
      state.model = {
        labels, positives, negatives: labels.length - positives,
        predictors: predictors.map(p => ({ ...p, roc: rocCurve(p.scores, labels), rel: reliability(p.scores, labels, BINS) })),
      };
      state.key = key;
    }
    return state.model;
  }

  // What the three predictors do at the cut in force now.
  function decide(model, v) {
    const ct = costThreshold(v.fp, v.fn);
    const t = v.costBased && ct != null ? ct : v.threshold;
    const rows = model.predictors.map(p => ({ p, s: summarize(p.scores, model.labels, { threshold: t, fpCost: v.fp, fnCost: v.fn }) }));
    return { ct, t, rows };
  }

  box.onCheck(() => {
    const v = controls.values(), model = compute(v);
    const h = halfDecisions(model.predictors), total = model.labels.length;
    const ct = costThreshold(v.fp, v.fn);
    const atCost = ct == null ? null : model.predictors.map(p => p.scores.filter(s => s >= ct).length);
    const split = atCost && new Set(atCost).size > 1
      ? tr(` With the cost-based threshold ${f2(ct)} they flag ${atCost.map(fmt).join(', ')} cases (in the order of the table): they differ.`,
        ` Dengan threshold berbasis biaya ${f2(ct)}, mereka menandai ${atCost.map(fmt).join(', ')} kasus (sesuai urutan tabel): ketiganya berbeda.`)
      : '';
    if (h.same && v.recal) {
      box.reveal('same', tr(
        `At 0.5 all three flag the same ${fmt(h.flagged[0])} of ${fmt(total)} cases. After Platt scaling the three probability maps nearly coincide, so their decisions nearly coincide too, at any threshold. Before recalibration they only agreed at 0.5.${split}`,
        `Pada 0,5 ketiganya menandai kasus yang sama: ${fmt(h.flagged[0])} dari ${fmt(total)} kasus. Setelah Platt scaling, ketiga peta probabilitas hampir berimpit, jadi keputusannya juga hampir sama pada threshold mana pun. Sebelum rekalibrasi, ketiganya hanya sepakat pada 0,5.${split}`));
    } else if (h.same) {
      box.reveal('same', tr(
        `At 0.5 all three flag the same ${fmt(h.flagged[0])} of ${fmt(total)} cases. Making probabilities more extreme or more cautious keeps 0.5 where it is and keeps the order, so this one cut picks the same cases. The AUC is blind to calibration, but a different threshold is not.${split}`,
        `Pada 0,5 ketiganya menandai kasus yang sama: ${fmt(h.flagged[0])} dari ${fmt(total)} kasus. Probabilitas yang dibuat lebih ekstrem atau lebih hati-hati tetap meninggalkan 0,5 di tempatnya dan menjaga urutan, jadi satu threshold ini memilih kasus yang sama. AUC tidak peka terhadap kalibrasi, tetapi threshold yang lain tidak demikian.${split}`));
    } else {
      box.reveal('differ', tr(
        `At 0.5 they flag ${h.flagged.map(fmt).join(', ')} cases (in the order of the table), and ${fmt(h.differing)} of ${fmt(total)} cases get a different decision from at least one of them. The same AUC says nothing about where each predictor's probabilities sit.${split}`,
        `Pada 0,5 mereka menandai ${h.flagged.map(fmt).join(', ')} kasus (sesuai urutan tabel), dan ${fmt(h.differing)} dari ${fmt(total)} kasus mendapat keputusan yang berbeda dari setidaknya satu predictor. AUC yang sama tidak menjelaskan di mana probabilitas tiap predictor berada.${split}`));
    }
  });

  // ---- drawing ---------------------------------------------------------------------------------------

  function drawRoc(model, d) {
    const canvas = lab.canvas;
    const { X, Y } = drawLineChart(canvas, {
      series: [], xLabel: tr('False positive rate', 'False positive rate'), yLabel: tr('True positive rate', 'True positive rate'),
      xMin: 0, xMax: 1, yMin: 0, yMax: 1,
    });
    const ctx = canvas.getContext('2d'), t = theme();
    ctx.save();
    ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.strokeStyle = t.muted;
    ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(1), Y(1)); ctx.stroke();
    ctx.setLineDash([]);
    // Thickest first, so the thin curves show through the thick ones: they are the same curve.
    const byWidth = [...model.predictors].sort((a, b) => STYLE[b.key].width - STYLE[a.key].width);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const p of byWidth) {
      ctx.lineWidth = STYLE[p.key].width; ctx.strokeStyle = STYLE[p.key].color(); ctx.globalAlpha = 0.9;
      ctx.beginPath();
      p.roc.forEach((pt, i) => (i ? ctx.lineTo(X(pt.fpr), Y(pt.tpr)) : ctx.moveTo(X(pt.fpr), Y(pt.tpr))));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const at = (s) => [X(s.fp / model.negatives), Y(s.tp / model.positives)];
    // Rings: each predictor's own best cut. Filled markers: the cut in force. Biggest first so none is hidden.
    for (const { p, s } of d.rows.slice().sort((a, b) => STYLE[b.p.key].radius - STYLE[a.p.key].radius)) {
      const st = STYLE[p.key];
      const [bx, by] = at(s.best);
      drawMark(ctx, st.shape, bx, by, st.radius + 4, { stroke: st.color(), lineWidth: 2 });
    }
    for (const { p, s } of d.rows.slice().sort((a, b) => STYLE[b.p.key].radius - STYLE[a.p.key].radius)) {
      const st = STYLE[p.key];
      const [mx, my] = at(s);
      drawMark(ctx, st.shape, mx, my, st.radius, { fill: st.color(), stroke: t.ink, lineWidth: 1.5 });
    }
    ctx.restore();
  }

  function drawReliability(model) {
    const canvas = reliabilityCanvas, t = theme();
    const width = canvas.parentElement.getBoundingClientRect().width || 300;
    const wide = width >= 780;
    const panelH = wide ? 280 : 250;
    canvas.style.height = `${wide ? panelH : panelH * 3}px`;
    const { width: W, height: H } = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * ratio); canvas.height = Math.round(H * ratio);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const pw = wide ? W / 3 : W;
    model.predictors.forEach((p, i) => {
      const ox = wide ? i * pw : 0, oy = wide ? 0 : i * panelH;
      const st = STYLE[p.key], color = st.color();
      const L = ox + 42, R = ox + pw - 14, T = oy + 28, B = oy + panelH - 90;
      const X = v => L + v * (R - L), Y = v => B - v * (B - T);
      ctx.save();
      ctx.font = '600 13px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = color;
      ctx.fillText(nameOf(p.key), L, oy + 16);
      ctx.fillStyle = t.plot; ctx.fillRect(L, T, R - L, B - T);
      ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = t.muted; ctx.strokeStyle = t.grid; ctx.lineWidth = 1;
      ctx.beginPath();
      for (const v of [0, 0.5, 1]) {
        ctx.moveTo(L, Y(v)); ctx.lineTo(R, Y(v)); ctx.moveTo(X(v), T); ctx.lineTo(X(v), B);
        ctx.textAlign = 'right'; ctx.fillText(fmt(v), L - 5, Y(v) + 4);
        ctx.textAlign = 'center'; ctx.fillText(fmt(v), X(v), B + 14);
      }
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(tr('Predicted probability', 'Probabilitas prediksi'), (L + R) / 2, B + 32);
      ctx.save(); ctx.translate(ox + 11, (T + B) / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText(tr('Share positive', 'Proporsi positif'), 0, 0); ctx.restore();
      // The calibrated diagonal.
      ctx.setLineDash([5, 4]); ctx.strokeStyle = t.muted; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(1), Y(1)); ctx.stroke(); ctx.setLineDash([]);
      // The observed shares, in bin order.
      const filled = p.rel.filter(b => b.count > 0);
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
      filled.forEach((b, k) => (k ? ctx.lineTo(X(b.meanScore), Y(b.observedRate)) : ctx.moveTo(X(b.meanScore), Y(b.observedRate))));
      ctx.stroke();
      for (const b of filled) {
        ctx.beginPath(); ctx.arc(X(b.meanScore), Y(b.observedRate), 4.2, 0, 2 * Math.PI);
        if (b.count < SMALL_BIN) { ctx.fillStyle = t.plot; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.stroke(); } else { ctx.fillStyle = color; ctx.fill(); }
      }
      // Cases in each bin, under the x axis.
      ctx.fillStyle = t.ink; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'center';
      p.rel.forEach(b => ctx.fillText(b.count >= 1000 ? `${fmt(b.count / 1000, { digits: 1 })}k` : fmt(b.count), X((b.lo + b.hi) / 2), B + 51));
      ctx.fillStyle = t.muted; ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(tr('cases in each bin', 'kasus di tiap bin'), (L + R) / 2, B + 65);
      ctx.restore();
    });
  }

  function drawCost(model, d, v) {
    const n = model.labels.length;
    const costs = { fpCost: v.fp, fnCost: v.fn };
    const curves = model.predictors.map(p => costCurve(p.scores, model.labels, costs, 101));
    const series = model.predictors.map((p, i) => ({
      xs: curves[i].map(pt => pt.threshold), ys: curves[i].map(pt => pt.cost / n), color: STYLE[p.key].color(), points: false,
    }));
    const { X, Y } = drawLineChart(costCanvas, {
      series, xLabel: tr('Decision threshold', 'Threshold keputusan'), yLabel: tr('Expected cost per case', 'Biaya per kasus'),
      xMin: 0, xMax: 1, yMin: 0, markerX: d.t,
    });
    const ctx = costCanvas.getContext('2d'), t = theme();
    ctx.save();
    ctx.fillStyle = t.ink; ctx.font = '600 12px system-ui, sans-serif';
    // A label goes to the right of its line, or to the left when it would run off the chart.
    const place = (text, x, y) => {
      const w = ctx.measureText(text).width;
      const left = x + 6 + w > costCanvas.getBoundingClientRect().width - 6;
      ctx.textAlign = left ? 'right' : 'left';
      ctx.fillText(text, x + (left ? -6 : 6), y);
    };
    place(tr(`threshold ${f2(d.t)}`, `threshold ${f2(d.t)}`), X(d.t), 28);
    if (d.ct != null && !sameValue(d.ct, d.t)) {
      ctx.setLineDash([2, 4]); ctx.lineWidth = 2; ctx.strokeStyle = t.ink;
      ctx.beginPath(); ctx.moveTo(X(d.ct), 14); ctx.lineTo(X(d.ct), Y(0)); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '12px system-ui, sans-serif';
      place(tr(`cost-based ${f2(d.ct)}`, `berbasis biaya ${f2(d.ct)}`), X(d.ct), 44);
    }
    // Each predictor's own best cut.
    for (const { p, s } of d.rows) {
      if (!Number.isFinite(s.best.threshold)) continue;
      const st = STYLE[p.key];
      drawMark(ctx, st.shape, X(s.best.threshold), Y(s.best.costPerCase), st.radius + 2, { fill: st.color(), stroke: t.ink, lineWidth: 1.5 });
    }
    ctx.restore();
  }

  function drawTable(model, d, v) {
    const rows = d.rows;
    const cheapest = Math.min(...rows.map(r => r.s.costPerCase));
    const lines = [
      [tr('AUC', 'AUC'), r => f3(r.s.auc)],
      [tr('Brier score', 'Brier score'), r => f3(r.s.brier)],
      [tr('Cases flagged positive at the threshold', 'Kasus yang ditandai positif pada threshold'), r => fmt(r.s.flagged)],
      [tr('False positives at the threshold', 'False positive pada threshold'), r => fmt(r.s.fp)],
      [tr('False negatives at the threshold', 'False negative pada threshold'), r => fmt(r.s.fn)],
      [tr('Cost per case at the threshold', 'Biaya per kasus pada threshold'), r => f3(r.s.costPerCase), r => sameValue(r.s.costPerCase, cheapest) && rows.some(o => !sameValue(o.s.costPerCase, cheapest))],
      [tr('Its own best threshold', 'Threshold terbaiknya sendiri'), r => cutText(r.s.best.threshold)],
      [tr('Cost per case at its own best threshold', 'Biaya per kasus pada threshold terbaiknya sendiri'), r => f3(r.s.best.costPerCase)],
    ];
    const table = document.createElement('table');
    table.className = 'cl-table';
    table.innerHTML = '<colgroup><col><col><col><col></colgroup>';
    const head = table.createTHead().insertRow();
    const corner = document.createElement('th'); corner.scope = 'col'; corner.textContent = tr('At threshold', 'Pada threshold') + ` ${f2(d.t)}`;
    head.append(corner);
    for (const { p } of rows) {
      const th = document.createElement('th'); th.scope = 'col';
      const dot = document.createElement('i'); dot.className = 'dot'; dot.style.background = STYLE[p.key].color(); dot.setAttribute('aria-hidden', 'true');
      th.append(dot, ` ${nameOf(p.key)}`);
      head.append(th);
    }
    const body = table.createTBody();
    for (const [label, cell, mark] of lines) {
      const row = body.insertRow();
      const th = document.createElement('th'); th.scope = 'row'; th.textContent = label; row.append(th);
      for (const r of rows) {
        const td = row.insertCell(); td.textContent = cell(r);
        if (mark?.(r)) { td.style.background = 'var(--accent-soft)'; td.style.fontWeight = '700'; }
      }
    }
    const style = document.createElement('style');
    style.textContent = '.table-card .cl-table { width: 100%; min-width: 440px; table-layout: fixed; font-size: 13px; border-collapse: collapse; } .cl-table th, .cl-table td { overflow-wrap: break-word; white-space: normal; } .cl-table thead th { font-size: 12px; } .cl-table tbody th { position: sticky; left: 0; background: var(--surface); } .cl-table col:first-child { width: 30%; } .cl-table th, .cl-table td { padding: 6px 6px; border-bottom: 1px solid var(--line); vertical-align: top; } .cl-table thead th { text-align: right; } .cl-table thead th:first-child, .cl-table tbody th { text-align: left; font-weight: 500; } .cl-table td { text-align: right; font-variant-numeric: tabular-nums; } .cl-table .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; } @media (max-width: 560px) { .table-card .cl-table { min-width: 0; font-size: 11px; } .cl-table thead th { font-size: 10.5px; hyphens: auto; } .cl-table th, .cl-table td { padding: 5px 3px; } .cl-table col:first-child { width: 31%; } .cl-table .dot { display: block; margin: 0 0 2px auto; } }';
    const parts = [style, table];
    // A ring can lie where the slider cannot go: below 0.01, above 0.99, or "flag nothing".
    if (rows.some(r => !Number.isFinite(r.s.best.threshold) || r.s.best.threshold > 0.99 || r.s.best.threshold < 0.01)) {
      const note = document.createElement('p'); note.className = 'muted';
      note.textContent = tr('At least one best threshold lies outside the 0.01 to 0.99 range of the slider (or means flagging nothing), so the slider cannot reach it. The table and the rings still show it.',
        'Setidaknya satu threshold terbaik berada di luar rentang 0,01 sampai 0,99 pada slider (atau berarti tidak menandai apa pun), sehingga slider tidak dapat mencapainya. Tabel dan cincin tetap menampilkannya.');
      parts.push(note);
    }
    lab.extraEl.replaceChildren(...parts);
  }

  function draw() {
    const v = controls.values();
    const model = compute(v);
    const d = decide(model, v);

    // The cost-based cut is only defined when at least one mistake costs something.
    controls.disable('costBased', d.ct == null);
    controls.disable('threshold', v.costBased && d.ct != null);
    if (v.costBased && d.ct != null) controls.set('threshold', Math.min(0.99, Math.max(0.01, d.ct)));
    costBasedLabel.textContent = d.ct == null
      ? tr('Use the cost-based threshold (needs a cost above 0)', 'Pakai threshold berbasis biaya (butuh biaya di atas 0)')
      : tr(`Use the cost-based threshold ${f2(d.ct)}`, `Pakai threshold berbasis biaya ${f2(d.ct)}`);

    costLegend.replaceChildren(...model.predictors.map(p => {
      const span = document.createElement('span'), dot = document.createElement('i');
      dot.className = 'dot'; dot.style.background = STYLE[p.key].color(); dot.setAttribute('aria-hidden', 'true');
      span.append(dot, ` ${nameOf(p.key)}`);
      return span;
    }));
    drawRoc(model, d);
    drawReliability(model);
    drawCost(model, d, v);
    drawTable(model, d, v);

    const aucValue = d.rows[0].s.auc;
    lab.setMetrics(tr(`AUC ${f3(aucValue)} for all three`, `AUC ${f3(aucValue)} untuk ketiganya`));
    const costs = d.rows.map(r => `${nameOf(r.p.key)} ${f3(r.s.costPerCase)}`).join(', ');
    lab.setStatus(tr(
      `Threshold ${f2(d.t)}${v.costBased && d.ct != null ? ' (cost-based)' : ''}. Cost per case: ${costs}.`,
      `Threshold ${f2(d.t)}${v.costBased && d.ct != null ? ' (berbasis biaya)' : ''}. Biaya per kasus: ${costs}.`));
    const brier = d.rows.map(r => `${nameOf(r.p.key)} ${f3(r.s.brier)}`).join(', ');
    const bests = d.rows.map(r => cutText(r.s.best.threshold)).join(', ');
    const lowest = f3(d.rows[0].s.best.costPerCase);
    const bestsSame = d.rows.every(r => sameValue(r.s.best.costPerCase, d.rows[0].s.best.costPerCase));
    const source = v.recal
      ? tr('Platt scaling applied: the probabilities are recalibrated, the order is untouched.', 'Platt scaling diterapkan: probabilitasnya direkalibrasi, urutannya tidak berubah.')
      : tr('Probabilities as the predictors report them.', 'Probabilitas sebagaimana dilaporkan tiap predictor.');
    lab.setDetail(tr(
      `${fmt(model.positives)} positive and ${fmt(model.negatives)} negative cases (${pct(model.positives / model.labels.length)} positive). Same AUC, so the ROC curves overlap. Brier score: ${brier}. Own best thresholds: ${bests}${bestsSame ? `, each with the same lowest cost per case ${lowest}` : ''}. ${source}`,
      `${fmt(model.positives)} kasus positif dan ${fmt(model.negatives)} kasus negatif (${pct(model.positives / model.labels.length)} positif). AUC sama, jadi kurva ROC saling menumpuk. Brier score: ${brier}. Threshold terbaik masing-masing: ${bests}${bestsSame ? `, masing-masing dengan biaya per kasus terendah yang sama ${lowest}` : ''}. ${source}`));
    lab.setLegend([
      ...model.predictors.map(p => ({ kind: 'line', color: STYLE[p.key].color(), label: nameOf(p.key) })),
      { kind: 'dot', color: theme().ink, label: tr('Filled marker: your threshold', 'Penanda penuh: threshold-mu') },
      { kind: 'ring', color: theme().ink, label: tr('Ring: its own best threshold', 'Cincin: threshold terbaiknya sendiri') },
    ]);
    lab.describe(lab.canvas, tr(
      `The three ROC curves are identical, with AUC ${f3(aucValue)}. At threshold ${f2(d.t)} the predictors sit at: ${d.rows.map(r => `${nameOf(r.p.key)}, false positive rate ${f2(r.s.fp / model.negatives)} and true positive rate ${f2(r.s.tp / model.positives)}`).join('; ')}.`,
      `Ketiga kurva ROC identik, dengan AUC ${f3(aucValue)}. Pada threshold ${f2(d.t)}, posisi para predictor: ${d.rows.map(r => `${nameOf(r.p.key)}, false positive rate ${f2(r.s.fp / model.negatives)} dan true positive rate ${f2(r.s.tp / model.positives)}`).join('; ')}.`));
    lab.describe(reliabilityCanvas, tr(
      `Reliability diagrams. Brier score: ${brier}. Expected calibration error: ${model.predictors.map((p, i) => `${nameOf(p.key)} ${f3(d.rows[i].s.ece)}`).join(', ')}.`,
      `Reliability diagram. Brier score: ${brier}. Calibration error yang diharapkan: ${model.predictors.map((p, i) => `${nameOf(p.key)} ${f3(d.rows[i].s.ece)}`).join(', ')}.`));
    lab.describe(costCanvas, tr(
      `Expected cost per case at threshold ${f2(d.t)}: ${costs}. Each predictor's lowest cost per case is ${lowest}, reached at the thresholds ${bests}.`,
      `Biaya per kasus pada threshold ${f2(d.t)}: ${costs}. Biaya per kasus terendah tiap predictor adalah ${lowest}, tercapai pada threshold ${bests}.`));
  }

  lab.onReset(() => {
    state.seed = 1;
    controls.set('prevalence', DEFAULTS.prevalence);
    controls.set('fp', DEFAULTS.fp);
    controls.set('fn', DEFAULTS.fn);
    controls.set('costBased', DEFAULTS.costBased);
    controls.set('threshold', DEFAULTS.threshold);
    controls.set('recal', DEFAULTS.recal);
    newRound();
    draw();
  });
  lab.onTheme(draw);
  lab.onResize(draw);
  draw();
  return lab.destroy;
}
