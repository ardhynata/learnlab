// Monitoring lab, built on the kit. A generated inference stream (60 days, 200 predictions a day: always generated,
// never real data) is replayed day by day: play, pause, step, speed and a Day slider. One event per run (Scenario,
// Severity, the day it begins) changes the stream; the monitors read it the way a dashboard would: input drift (PSI of
// each feature against the training data), prediction score drift (PSI of the scores), and accuracy computed ONLY from
// the labels that have arrived. The true same-day accuracy is hidden until the learner reveals it. An alert log, an
// investigation view (feature histograms, slices, score calibration) and a decision panel (roll back, recalibrate,
// retrain, keep watching) close the loop: a choice is applied from the current day and scored against the alternatives.
//   The maths is in ml/monitoring.js (stream, models, replay, alerts, remedies) and ml/monitoringlab.js (scenarios,
//   the world after a remedy, the investigation views); this file draws and wires.
import { createLab, predictBox, clusterColor, theme, tr, fmt, pct } from '../kit/index.js';
import {
  DEFAULTS, DAYS, PER_DAY, LABEL_DELAY, SCENARIO_KEYS, MIN_EVENT_DAY, MAX_EVENT_DAY, ERROR_COST, FEATURES,
  eventStrength, modelsFor, buildRun, alertsOf, alertLog, decide, featureView, sliceView, calibrationView,
} from '../ml/monitoringlab.js';

export { DEFAULTS, DAYS };
const SETTLE_MS = 200;      // wait for the learner to stop moving a slider before the heavy part runs
const CACHE_LIMIT = 6;
const STEP_MS = 450;        // one day at 1x
const BANDS = 5;            // score bands of the strip under the score chart
const INVESTIGATE_DAYS = 7; // "recent" in the investigation views

// ---- names, built when drawn so they follow the language ----------------------------------------------------------

const D = d => fmt(d + 1);   // the lab shows day 1..60; the maths counts from 0
const featName = f => ({ spend: tr('spend', 'pengeluaran'), tenure: tr('tenure', 'masa langganan'), tickets: tr('tickets', 'tiket'), logins: tr('logins', 'login') })[f] ?? f;
const scenarioName = key => ({
  clean: tr('Clean (nothing happens)', 'Bersih (tidak ada kejadian)'),
  covariate: tr('Covariate drift', 'Covariate drift'),
  skew: tr('Training-serving skew bug', 'Bug training-serving skew'),
  label: tr('Label shift', 'Label shift'),
  concept: tr('Concept shift', 'Concept shift'),
  delayed: tr('Delayed labels with drift', 'Label terlambat dengan drift'),
})[key] ?? key;
const remedyName = kind => ({
  none: tr('Keep watching', 'Terus pantau'),
  rollback: tr('Roll back to the previous version', 'Kembalikan ke versi sebelumnya'),
  recalibrate: tr('Recalibrate', 'Kalibrasi ulang'),
  retrain: tr('Retrain on recent labelled data', 'Latih ulang dengan data berlabel terbaru'),
})[kind] ?? kind;
const remedyShort = kind => ({
  none: tr('Keep watching', 'Terus pantau'), rollback: tr('Roll back', 'Rollback'), recalibrate: tr('Recalibrate', 'Kalibrasi ulang'), retrain: tr('Retrain', 'Latih ulang'),
})[kind] ?? kind;
const ruleName = rule => ({
  psi: tr('Input drift (PSI)', 'Drift input (PSI)'),
  score: tr('Score drift (PSI)', 'Drift skor (PSI)'),
  accuracy: tr('Accuracy (delayed labels)', 'Akurasi (label terlambat)'),
})[rule] ?? rule;
const sliceName = k => ({ low: tr('Lower third', 'Sepertiga bawah'), middle: tr('Middle third', 'Sepertiga tengah'), high: tr('Upper third', 'Sepertiga atas') })[k] ?? k;
const num = (v, digits = 2) => fmt(v, { digits });

// One sentence on what the event of this scenario does, with its numbers.
export function describeEvent(scenario, severity, eventDay) {
  const e = eventStrength(scenario, severity), day = D(eventDay);
  if (scenario === 'clean') return tr('Nothing happens. The stream stays like the training data, so any alert is a false alarm.', 'Tidak ada yang terjadi. Stream tetap seperti data training, jadi setiap alert adalah alarm palsu.');
  if (severity <= 0) return tr('Severity is 0, so nothing changes. Raise it to start the event.', 'Tingkat keparahan 0, jadi tidak ada yang berubah. Naikkan untuk memulai kejadian.');
  const deg = fmt(Math.round((e.angle * 180) / Math.PI), { digits: 0 });
  switch (scenario) {
    case 'covariate': return tr(`From day ${day}, the spend input moves up by ${num(e.shift, 1)} standard deviations. The rule that links inputs to labels does not change.`, `Mulai hari ${day}, input pengeluaran naik ${num(e.shift, 1)} simpangan baku. Aturan yang menghubungkan input dengan label tidak berubah.`);
    case 'skew': return tr(`From day ${day}, a release serves spend multiplied by ${fmt(e.factor)} (a unit change). The real values and labels do not change.`, `Mulai hari ${day}, sebuah rilis mengirim pengeluaran dikali ${fmt(e.factor)} (perubahan satuan). Nilai sebenarnya dan label tidak berubah.`);
    case 'label': return tr(`From day ${day}, positives fall from ${pct(0.5, 0)} to ${pct(e.prevalence, 0)} of the rows. Each class keeps the inputs it had.`, `Mulai hari ${day}, porsi positif turun dari ${pct(0.5, 0)} menjadi ${pct(e.prevalence, 0)} dari baris. Tiap kelas tetap memiliki input seperti semula.`);
    case 'concept': return tr(`From day ${day}, the rule that links inputs to labels turns by ${deg} degrees. The inputs look exactly as before.`, `Mulai hari ${day}, aturan yang menghubungkan input dengan label berputar ${deg} derajat. Input tampak persis seperti semula.`);
    case 'delayed': return tr(`From day ${day}, spend moves up by ${num(e.shift, 1)} standard deviations, the labelling rule turns by ${deg} degrees, and labels arrive ${fmt(e.delay)} days late instead of ${fmt(LABEL_DELAY)}.`, `Mulai hari ${day}, pengeluaran naik ${num(e.shift, 1)} simpangan baku, aturan pelabelan berputar ${deg} derajat, dan label tiba ${fmt(e.delay)} hari terlambat, bukan ${fmt(LABEL_DELAY)}.`);
    default: return '';
  }
}

// What a decision did, in plain words: the numbers, whether another choice would have been cheaper, and why.
const NEAR_TIE = 1;   // cost units: closer than this, "cheapest" is a toss-up and the text says so

export function explainDecision(decision, scenario) {
  const { kind, fromDay, comparison, choice, feasible, labelsUsed } = decision;
  const mine = comparison.byKind[kind], best = comparison.byKind[choice.best];
  const after = mine.outcome.metric.accuracy, before = mine.outcome.before.accuracy;
  const parts = [];
  const cost = fmt(mine.cost.total, { digits: 1 });
  if (kind === 'none') parts.push(tr(`You chose "${remedyName(kind)}" on day ${D(fromDay)}. From then on the accuracy is ${pct(after, 1)}. Cost: ${cost} units.`,
    `Kamu memilih "${remedyName(kind)}" pada hari ${D(fromDay)}. Sejak itu akurasi ${pct(after, 1)}. Biaya: ${cost} unit.`));
  else parts.push(tr(`You chose "${remedyName(kind)}" on day ${D(fromDay)}. From then on the accuracy is ${pct(after, 1)}, against ${pct(before, 1)} if you had kept watching. Cost: ${cost} units.`,
    `Kamu memilih "${remedyName(kind)}" pada hari ${D(fromDay)}. Sejak itu akurasi ${pct(after, 1)}, dibanding ${pct(before, 1)} jika terus memantau. Biaya: ${cost} unit.`));
  if (choice.isBest) parts.push(tr('No other option costs less here.', 'Tidak ada pilihan lain yang lebih murah di sini.'));
  else if (choice.regret < NEAR_TIE) parts.push(tr(`"${remedyName(choice.best)}" costs about the same (${fmt(best.cost.total, { digits: 1 })} units), so this was close.`,
    `"${remedyName(choice.best)}" berbiaya hampir sama (${fmt(best.cost.total, { digits: 1 })} unit), jadi selisihnya tipis.`));
  else parts.push(tr(`"${remedyName(choice.best)}" would have cost ${fmt(best.cost.total, { digits: 1 })} units, ${fmt(choice.regret, { digits: 1 })} less.`,
    `"${remedyName(choice.best)}" hanya akan berbiaya ${fmt(best.cost.total, { digits: 1 })} unit, lebih murah ${fmt(choice.regret, { digits: 1 })}.`));
  const gain = mine.outcome.gain;
  const brokenInputs = scenario === 'skew', ruleChanged = scenario === 'concept' || scenario === 'delayed', mixChanged = scenario === 'label';
  let why = '';
  if (kind === 'none') {
    why = scenario === 'clean' || scenario === 'covariate'
      ? tr('The model is still right: the inputs may have moved, but the rule that links them to labels did not. Doing nothing is cheapest, so an alert alone is not a reason to act.', 'Modelnya masih benar: input mungkin bergeser, tetapi aturan yang menghubungkannya dengan label tidak. Tidak berbuat apa-apa paling murah, jadi satu alert saja bukan alasan untuk bertindak.')
      : tr('Watching costs nothing to do, but every wrong prediction adds to the bill while the problem stays.', 'Memantau tidak butuh biaya, tetapi setiap prediksi yang salah menambah tagihan selama masalahnya masih ada.');
  } else if (kind === 'rollback') {
    why = brokenInputs
      ? tr('The release broke the input, and rolling back removes the bug. The previous version is a weaker model, but it gets correct inputs.', 'Rilis itu merusak input, dan rollback menghilangkan bugnya. Versi sebelumnya model yang lebih lemah, tetapi inputnya benar.')
      : tr('A rollback only helps when a release broke the inputs. Here the data or the rule changed, so you traded the model for a weaker one and the world is still different.', 'Rollback hanya membantu bila sebuah rilis merusak input. Di sini data atau aturannya yang berubah, jadi kamu menukar model dengan yang lebih lemah dan dunianya tetap berbeda.');
  } else if (kind === 'recalibrate') {
    if (!feasible) why = tr(`Fewer than 60 labels had arrived (${fmt(labelsUsed)}), so nothing could be fitted and the old model carried on.`, `Label yang sudah tiba kurang dari 60 (${fmt(labelsUsed)}), jadi tidak ada yang dapat dicocokkan dan model lama terus berjalan.`);
    else if (mixChanged) why = tr('Recalibrating rescales the scores to the new share of positives, which is exactly what a label shift needs.', 'Kalibrasi ulang menskalakan skor ke porsi positif yang baru, dan itulah yang dibutuhkan label shift.');
    else if (brokenInputs || ruleChanged) why = tr('Recalibrating rescales scores but cannot change which rows rank higher, so it cannot repair broken inputs or learn a new rule.', 'Kalibrasi ulang menskalakan skor tetapi tidak dapat mengubah baris mana yang berperingkat lebih tinggi, jadi tidak dapat memperbaiki input yang rusak atau mempelajari aturan baru.');
    else why = tr('The scores were already about right, so rescaling them changes little.', 'Skornya sudah cukup tepat, jadi menskalakannya hampir tidak mengubah apa pun.');
  } else if (kind === 'retrain') {
    if (!feasible) why = tr(`Fewer than 60 labels had arrived (${fmt(labelsUsed)}), so there was nothing to retrain on and the old model carried on.`, `Label yang sudah tiba kurang dari 60 (${fmt(labelsUsed)}), jadi tidak ada yang bisa dipakai melatih ulang dan model lama terus berjalan.`);
    else if (ruleChanged && gain > 0.05) why = tr('The labels that had arrived already came from the new period, so the retrained model learned the new rule. It still cost 10 units and 3 days before it went live.', 'Label yang sudah tiba berasal dari periode baru, jadi model yang dilatih ulang mempelajari aturan baru. Biayanya tetap 10 unit dan 3 hari sebelum aktif.');
    else if (ruleChanged) why = tr('The labels that had arrived were still mostly from before the event, because labels come late, so there was little new to learn. Retraining too early repeats the old rule.', 'Label yang sudah tiba sebagian besar masih dari sebelum kejadian, karena label datang terlambat, jadi hampir tidak ada hal baru untuk dipelajari. Melatih ulang terlalu dini mengulang aturan lama.');
    else if (brokenInputs && gain > 0.05) why = tr('The labels that had arrived already include days with the broken input, so the retrained model learned to discount that feature. The bug is still there, and it cost 10 units and 3 days.', 'Label yang sudah tiba sudah mencakup hari-hari dengan input rusak, jadi model yang dilatih ulang belajar mengabaikan fitur itu. Bugnya tetap ada, dan biayanya 10 unit serta 3 hari.');
    else if (brokenInputs) why = tr('Retraining on the broken inputs learns a little from them but does not remove the bug, and it costs 10 units and 3 days.', 'Melatih ulang pada input yang rusak mempelajari sedikit darinya tetapi tidak menghilangkan bugnya, dan biayanya 10 unit serta 3 hari.');
    else why = tr('The model was not wrong in a way new labels could fix, so the 10 units and 3 days bought little.', 'Modelnya tidak salah dengan cara yang dapat diperbaiki label baru, jadi 10 unit dan 3 hari hampir tidak memberi hasil.');
  }
  if (why) parts.push(why);
  return parts.join(' ');
}

// ---- drawing -----------------------------------------------------------------------------------------------------

function prepare(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, w: width, h: height, t: theme() };
}
const t_ink = () => theme().ink;
const warnColor = () => (getComputedStyle(document.documentElement).getPropertyValue('--warn').trim() || '#b3261e');
const FONT = '11px system-ui, sans-serif';

// PSI readings run from 0.01 to 10 or more. Below 1 the axis is linear; above it it is squeezed (a log scale), so a units
// bug does not flatten everything else. The chart says so.
const psiMap = v => { const x = Math.max(0, v); return x <= 1 ? x : 1 + 0.5 * Math.log10(x); };
const PSI_TICKS = [0, 0.5, 1, 3, 10];

// Legend items drawn inside the canvas, wrapped to the width. Returns the height used.
function legendRows(ctx, items, w, x0, measureOnly) {
  ctx.font = FONT;
  let x = x0, y = 0, rows = 1;
  const placed = [];
  for (const it of items) {
    const need = 24 + ctx.measureText(it.label).width + 14;
    if (x + need > w - 8 && x > x0) { x = x0; y += 16; rows++; }
    placed.push({ it, x, y }); x += need;
  }
  if (!measureOnly) return placed;
  return rows * 16;
}

function drawLegend(ctx, placed, top, t) {
  ctx.font = FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for (const { it, x, y } of placed) {
    const cy = top + y + 8;
    ctx.save();
    ctx.strokeStyle = it.color; ctx.fillStyle = it.color; ctx.lineWidth = it.kind === 'band' ? 5 : 2.5;
    if (it.kind === 'dash') ctx.setLineDash([5, 3]); else if (it.kind === 'dot') ctx.setLineDash([1.5, 3]);
    ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + 17, cy); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = t.muted; ctx.fillText(it.label, x + 22, cy);
  }
}

// A time chart over the 60 days. Only days up to o.day are drawn; the rest is veiled. Returns the geometry for scrubbing.
function timeChart(canvas, o) {
  const { ctx, w, h, t } = prepare(canvas);
  ctx.fillStyle = t.plot; ctx.fillRect(0, 0, w, h);
  const padL = 50, padR = 14;
  const placed = legendRows(ctx, o.legend ?? [], w, padL, false);
  const legendH = o.legend?.length ? legendRows(ctx, o.legend, w, padL, true) : 0;
  const stripH = o.strip ? BANDS * 7 : 0;
  const top = 8 + legendH + 6, bottom = h - 30 - (o.strip ? stripH + 8 : 0);
  const plotW = Math.max(40, w - padL - padR), plotH = Math.max(40, bottom - top);
  const step = plotW / DAYS, X = d => padL + (d + 0.5) * step;
  const map = o.map ?? (v => v);
  const lo = map(o.yMin), hi = map(o.yMax);
  const Y = v => top + (1 - (Math.min(hi, Math.max(lo, map(v))) - lo) / (hi - lo)) * plotH;
  const geo = { padL, padR, step, w, top, bottom };
  canvas._geo = geo;
  drawLegend(ctx, placed, 8, t);

  // grid and y ticks
  ctx.font = FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
  ctx.strokeStyle = t.grid; ctx.lineWidth = 1;
  for (const tk of o.ticks) {
    const y = Y(tk.v);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
    ctx.fillStyle = t.muted; ctx.fillText(tk.label, padL - 6, y);
  }
  // x ticks
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const labelY = h - 12;
  for (const d of [0, 9, 19, 29, 39, 49, 59]) {
    ctx.strokeStyle = t.grid; ctx.beginPath(); ctx.moveTo(X(d), top); ctx.lineTo(X(d), bottom); ctx.stroke();
    ctx.fillStyle = t.muted; ctx.fillText(fmt(d + 1), X(d), labelY);
  }
  ctx.textAlign = 'right'; ctx.fillText(tr('Day', 'Hari'), padL - 8, labelY);

  // the days still to come are veiled
  if (o.day < DAYS - 1) { ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = t.grid; ctx.fillRect(X(o.day) + step / 2, top, w - padR - (X(o.day) + step / 2), plotH); ctx.restore(); }

  // alert bands along the bottom of the plot
  if (o.bandDays) {
    ctx.fillStyle = warnColor();
    for (const d of o.bandDays) if (d <= o.day) ctx.fillRect(X(d) - step / 2 + 0.5, bottom - 5, Math.max(1, step - 1), 5);
  }

  // horizontal reference lines (the threshold, the baseline)
  for (const hl of o.hlines ?? []) {
    ctx.save(); ctx.strokeStyle = hl.color; ctx.lineWidth = hl.width ?? 1.6; ctx.setLineDash(hl.dash ?? [6, 4]);
    ctx.beginPath(); ctx.moveTo(padL, Y(hl.v)); ctx.lineTo(w - padR, Y(hl.v)); ctx.stroke(); ctx.restore();
  }
  // vertical marks (the event, the decision)
  for (const vl of o.vlines ?? []) {
    if (vl.day > o.day) continue;
    ctx.save(); ctx.strokeStyle = vl.color; ctx.lineWidth = 1.5; ctx.setLineDash(vl.dash ?? [2, 3]);
    ctx.beginPath(); ctx.moveTo(X(vl.day), top); ctx.lineTo(X(vl.day), bottom); ctx.stroke(); ctx.restore();
  }
  // series
  ctx.save(); ctx.beginPath(); ctx.rect(padL - 2, top - 2, plotW + 4, plotH + 4); ctx.clip();
  for (const s of o.series) {
    ctx.strokeStyle = s.color; ctx.lineWidth = s.width ?? 2.4; ctx.lineJoin = 'round'; ctx.setLineDash(s.dash ?? []);
    ctx.beginPath();
    let pen = false;
    for (let d = 0; d <= Math.min(o.day, DAYS - 1); d++) {
      const v = s.values[d];
      if (v == null) { pen = false; continue; }
      if (pen) ctx.lineTo(X(d), Y(v)); else { ctx.moveTo(X(d), Y(v)); pen = true; }
    }
    ctx.stroke();
    const v = s.values[o.day];
    if (v != null && s.dot !== false) { ctx.setLineDash([]); ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(X(o.day), Y(v), 3.6, 0, 2 * Math.PI); ctx.fill(); }
  }
  ctx.restore();
  // the current day
  ctx.save(); ctx.strokeStyle = t.ink; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.moveTo(X(o.day), top); ctx.lineTo(X(o.day), bottom + (o.strip ? stripH + 8 : 0)); ctx.stroke(); ctx.restore();

  // the strip: for each day the share of predictions in each score band (darker = more)
  if (o.strip) {
    const sTop = bottom + 8, cell = stripH / BANDS;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = t.muted; ctx.font = '10px system-ui, sans-serif';
    for (let b = 0; b < BANDS; b++) {
      const y = sTop + (BANDS - 1 - b) * cell;
      for (let d = 0; d <= Math.min(o.day, DAYS - 1); d++) {
        const share = o.strip[d]?.[b] ?? 0;
        ctx.globalAlpha = Math.min(1, 0.06 + share * 1.1); ctx.fillStyle = clusterColor(4);
        ctx.fillRect(X(d) - step / 2, y, step + 0.5, cell - 0.5);
      }
      if (b === 0 || b === BANDS - 1) {   // labels at full opacity, after the faint cells
        ctx.globalAlpha = 1; ctx.fillStyle = t.muted;
        ctx.fillText(b === 0 ? '0%' : '100%', padL - 6, y + (b === 0 ? cell - 3 : 3));
      }
    }
    ctx.globalAlpha = 1; ctx.font = FONT;
  }
  if (o.note) { ctx.fillStyle = t.muted; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText(o.note, w - padR, top + 2); }
  return geo;
}

// Words wrapped to a width.
function wrapLines(ctx, text, maxW) {
  const out = []; let line = '';
  for (const word of String(text).split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxW) { out.push(line); line = word; } else line = next;
  }
  if (line) out.push(line);
  return out;
}

// One font size for a group of labels, shrunk (down to 9px) until the widest fits `maxW`. Shrinking the type keeps the
// letters undistorted on a phone; the `maxWidth` argument of fillText stays as the last resort, not the first.
function fitFont(ctx, texts, maxW, base = 11, weight = '') {
  let size = base;
  const font = px => `${weight ? `${weight} ` : ''}${px}px system-ui, sans-serif`;
  ctx.font = font(size);
  while (size > 9 && texts.some(t => ctx.measureText(t).width > maxW)) { size -= 0.5; ctx.font = font(size); }
  return ctx.font;
}

// The investigation views share a frame: a wrapped title, a legend, a one-line reading, then a y axis in %.
function frame(canvas, { title, legend = [], summary = '', yMax = 1, yLabel, footer = 56 }) {
  const { ctx, w, h, t } = prepare(canvas);
  ctx.fillStyle = t.plot; ctx.fillRect(0, 0, w, h);
  const padL = 56, padR = 14;
  let y = 8;
  ctx.font = '600 13px system-ui, sans-serif'; ctx.fillStyle = t.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  for (const line of wrapLines(ctx, title, w - 24)) { ctx.fillText(line, 12, y); y += 17; }
  y += 2;
  if (legend.length) { const placed = legendRows(ctx, legend, w, 12, false); drawLegend(ctx, placed, y, t); y += legendRows(ctx, legend, w, 12, true) + 4; }
  if (summary) {
    ctx.font = '600 12px system-ui, sans-serif'; ctx.fillStyle = t.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    for (const line of wrapLines(ctx, summary, w - 24)) { ctx.fillText(line, 12, y); y += 16; }
  }
  const top = y + 12, bottom = Math.max(top + 60, h - footer);
  const Y = v => top + (1 - Math.min(1, v / yMax)) * (bottom - top);
  ctx.font = FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  const stepV = yMax <= 0.3 ? 0.05 : yMax <= 0.6 ? 0.1 : 0.2;
  for (let v = 0; v <= yMax + 1e-9; v += stepV) {
    ctx.strokeStyle = t.grid; ctx.beginPath(); ctx.moveTo(padL, Y(v)); ctx.lineTo(w - padR, Y(v)); ctx.stroke();
    ctx.fillStyle = t.muted; ctx.fillText(`${fmt(v * 100, { digits: 0 })}%`, padL - 6, Y(v));
  }
  if (yLabel) { ctx.save(); ctx.translate(11, (top + bottom) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = t.muted; fitFont(ctx, [yLabel], bottom - top); ctx.fillText(yLabel, 0, 0, bottom - top); ctx.restore(); }
  return { ctx, w, h, t, padL, padR, top, bottom, Y, plotW: w - padL - padR };
}

function drawFeatureHistogram(canvas, v) {
  const yMax = Math.max(0.25, Math.min(1, Math.ceil(Math.max(...v.bins.map(b => b.recent), 0.2) * 10) / 10 + 0.05));
  const { ctx, t, padL, top, bottom, Y, plotW } = frame(canvas, {
    title: tr(`Feature histogram: ${featName(v.feature)}, training data against the last ${fmt(v.window)} days`, `Histogram fitur: ${featName(v.feature)}, data training dibanding ${fmt(v.window)} hari terakhir`),
    legend: [{ color: clusterColor(0), kind: 'band', label: tr('Last days', 'Hari terakhir') }, { color: t_ink(), kind: 'dash', label: tr('Training data (10% each)', 'Data training (10% tiap bagian)') }],
    summary: tr(`PSI ${fmt(v.psi, { digits: 2 })}. Mean ${fmt(v.recentMean, { digits: 1 })} against ${fmt(v.referenceMean, { digits: 1 })} in training.`, `PSI ${fmt(v.psi, { digits: 2 })}. Rata-rata ${fmt(v.recentMean, { digits: 1 })} dibanding ${fmt(v.referenceMean, { digits: 1 })} di training.`),
    yMax, yLabel: tr('Share of rows', 'Porsi baris'), footer: 40,
  });
  const n = v.bins.length, slot = plotW / n, bw = Math.min(34, slot * 0.62);
  v.bins.forEach((b, i) => {
    const cx = padL + (i + 0.5) * slot;
    ctx.fillStyle = clusterColor(0); ctx.globalAlpha = 0.9; ctx.fillRect(cx - bw / 2, Y(b.recent), bw, bottom - Y(b.recent)); ctx.globalAlpha = 1;
    ctx.strokeStyle = t.ink; ctx.lineWidth = 2.2; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(cx - slot / 2 + 3, Y(b.reference)); ctx.lineTo(cx + slot / 2 - 3, Y(b.reference)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = t.muted; ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(fmt(i + 1), cx, bottom + 15);
  });
  ctx.fillStyle = t.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const axisTitle = plotW < 330 ? tr('Training tenths: lowest (1) to highest (10)', 'Persepuluhan training: terendah (1) sampai tertinggi (10)')
    : tr('Tenths of the training values, lowest (1) to highest (10)', 'Persepuluhan nilai training, terendah (1) sampai tertinggi (10)');
  fitFont(ctx, [axisTitle], plotW);
  ctx.fillText(axisTitle, padL + plotW / 2, bottom + 32, plotW);
}

function drawSlices(canvas, v) {
  const { ctx, t, padL, bottom, Y, plotW } = frame(canvas, {
    title: tr(`Slice by ${featName(v.feature)}: accuracy in each third of the training values`, `Irisan menurut ${featName(v.feature)}: akurasi di tiap sepertiga nilai training`),
    legend: [{ color: t_ink(), kind: 'band', label: tr('Reference holdout', 'Holdout referensi') }, { color: clusterColor(0), kind: 'band', label: tr('Recent rows whose label has arrived', 'Baris terbaru yang labelnya sudah tiba') }],
    yMax: 1, yLabel: tr('Accuracy', 'Akurasi'), footer: 66,
  });
  const slot = plotW / 3, bw = Math.min(46, slot * 0.28);
  const narrow = slot < 120;
  const caption = s => narrow
    ? [tr(`${pct(s.referenceShare, 0)} training`, `${pct(s.referenceShare, 0)} training`), tr(`${pct(s.recentShare, 0)} recent`, `${pct(s.recentShare, 0)} terbaru`), tr(`${fmt(s.labelled)} labelled`, `${fmt(s.labelled)} berlabel`)]
    : [tr(`${pct(s.referenceShare, 0)} of training rows`, `${pct(s.referenceShare, 0)} baris training`), tr(`${pct(s.recentShare, 0)} of recent rows`, `${pct(s.recentShare, 0)} baris terbaru`), tr(`${fmt(s.labelled)} labelled`, `${fmt(s.labelled)} berlabel`)];
  const lines = v.slices.map(caption);
  const capFont = fitFont(ctx, lines.flat(), slot - 8);
  const nameFont = fitFont(ctx, v.slices.map(s => sliceName(s.slice)), slot - 8, 12, '600');
  v.slices.forEach((s, i) => {
    const cx = padL + (i + 0.5) * slot;
    for (const [val, color, side] of [[s.referenceAccuracy, t.ink, -1], [s.recentAccuracy, clusterColor(0), 1]]) {
      if (val == null) continue;
      ctx.fillStyle = color; ctx.globalAlpha = side < 0 ? 0.55 : 0.95;
      ctx.fillRect(cx + (side < 0 ? -bw - 3 : 3), Y(val), bw, bottom - Y(val)); ctx.globalAlpha = 1;
      ctx.fillStyle = t.ink; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(pct(val, 0), cx + (side < 0 ? -bw / 2 - 3 : bw / 2 + 3), Y(val) - 4);
    }
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
    if (s.recentAccuracy == null) { ctx.fillStyle = t.muted; ctx.font = FONT; ctx.fillText(tr('no labels yet', 'belum ada label'), cx + bw / 2 + 3, bottom - 8, bw + 20); }
    ctx.fillStyle = t.ink; ctx.font = nameFont;
    ctx.fillText(sliceName(s.slice), cx, bottom + 16, slot - 8);
    ctx.fillStyle = t.muted; ctx.font = capFont;
    lines[i].forEach((text, k) => ctx.fillText(text, cx, bottom + 31 + 14 * k, slot - 8));
  });
}

function drawCalibration(canvas, v) {
  const ms = v.recentMeanScore, pr = v.recentPositiveRate;
  const { ctx, t, padL, bottom, Y, plotW } = frame(canvas, {
    title: tr('Score calibration: how often the model is right about a score', 'Kalibrasi skor: seberapa sering model benar soal sebuah skor'),
    legend: [{ color: t_ink(), kind: 'band', label: tr('Reference holdout', 'Holdout referensi') }, { color: clusterColor(0), kind: 'band', label: tr('Recent rows whose label has arrived', 'Baris terbaru yang labelnya sudah tiba') }, { color: theme().muted, kind: 'dash', label: tr('Perfect calibration', 'Kalibrasi sempurna') }],
    summary: ms == null ? tr('No labels have arrived yet.', 'Belum ada label yang tiba.')
      : tr(`Mean score ${pct(ms, 0)}, positives seen ${pct(pr, 0)} (training: ${pct(v.referenceMeanScore, 0)} and ${pct(v.referencePositiveRate, 0)}).`, `Skor rata-rata ${pct(ms, 0)}, positif terlihat ${pct(pr, 0)} (training: ${pct(v.referenceMeanScore, 0)} dan ${pct(v.referencePositiveRate, 0)}).`),
    yMax: 1, yLabel: tr('Positives actually seen', 'Positif yang benar-benar muncul'), footer: 62,
  });
  const slot = plotW / v.bins.length, X = i => padL + (i + 0.5) * slot;
  ctx.save(); ctx.strokeStyle = t.muted; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath();
  v.bins.forEach((b, i) => { const m = (b.lo + b.hi) / 2; if (i) ctx.lineTo(X(i), Y(m)); else ctx.moveTo(X(i), Y(m)); });
  ctx.stroke(); ctx.restore();
  for (const [key, color, dx] of [['reference', t.ink, -7], ['recent', clusterColor(0), 7]]) {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.2; ctx.beginPath(); let pen = false;
    v.bins.forEach((b, i) => { const val = b[key]; if (val == null) { pen = false; return; } if (pen) ctx.lineTo(X(i) + dx, Y(val)); else { ctx.moveTo(X(i) + dx, Y(val)); pen = true; } });
    ctx.stroke();
    v.bins.forEach((b, i) => { const val = b[key]; if (val != null) { ctx.beginPath(); ctx.arc(X(i) + dx, Y(val), 3.8, 0, 2 * Math.PI); ctx.fill(); } });
  }
  ctx.fillStyle = t.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const bandText = b => `${fmt(b.lo * 100, { digits: 0 })}–${fmt(b.hi * 100, { digits: 0 })}%`, countText = b => `n = ${fmt(b.recentCount)}`;
  ctx.font = fitFont(ctx, v.bins.flatMap(b => [bandText(b), countText(b)]), slot - 4);
  v.bins.forEach((b, i) => {
    ctx.fillText(bandText(b), X(i), bottom + 15, slot - 4);
    ctx.fillText(countText(b), X(i), bottom + 29, slot - 4);
  });
  const axisTitle = plotW < 330 ? tr('Score band (probability given)', 'Rentang skor (probabilitas model)') : tr('Score band (the probability the model gave)', 'Rentang skor (probabilitas yang diberikan model)');
  ctx.font = fitFont(ctx, [axisTitle], plotW);
  ctx.fillText(axisTitle, padL + plotW / 2, bottom + 46, plotW);
}

// ---- the lab -------------------------------------------------------------------------------------------------------

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Inference stream replay', 'Replay stream inferensi'),
    hint: tr('Generated stream (not real data): 200 predictions a day for 60 days.', 'Stream buatan (bukan data nyata): 200 prediksi per hari selama 60 hari.'),
    playback: true, status: true, canvasLabel: tr('Input drift chart: PSI of each feature by day', 'Grafik drift input: PSI tiap fitur per hari'),
  });

  // ---- the extra boxes, in the order the layout rule places them
  const scoreCanvas = lab.chartCard(tr('Prediction scores: distribution drift', 'Skor prediksi: drift distribusi'), '', 240);
  const accCanvas = lab.chartCard(tr('Accuracy: delayed labels against the truth', 'Akurasi: label yang terlambat dibanding kenyataan'), '', 240);
  scoreCanvas.closest('.card').classList.add('mon-card');
  accCanvas.closest('.card').classList.add('mon-card');

  const logCard = document.createElement('section');
  logCard.className = 'card table-card mon-card mon-log';
  logCard.innerHTML = `<h2 class="lab-h"></h2><div class="table-scroll"><table><thead><tr></tr></thead><tbody></tbody></table></div>`;
  lab.ref('below').append(logCard);
  logCard.querySelector('h2').textContent = tr('Alert log', 'Log alert');

  const decCard = document.createElement('section');
  decCard.className = 'card table-card mon-card mon-dec';
  decCard.innerHTML = `<h2 class="lab-h"></h2>
<div class="mon-btns" role="group" data-ref="decButtons"></div>
<div class="table-scroll"><table><thead><tr></tr></thead><tbody></tbody></table></div>`;
  lab.ref('below').append(decCard);
  decCard.querySelector('h2').textContent = tr('Decision', 'Keputusan');
  decCard.querySelector('[data-ref=decButtons]').setAttribute('aria-label', tr('Choose what to do on the current day', 'Pilih tindakan pada hari yang sedang ditampilkan'));

  const style = document.createElement('style');
  style.textContent = `
.mon-card{padding:14px 16px !important}
.mon-card .chart{margin:8px 0 0}
.mon-btns{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:8px}
.mon-btns button{white-space:normal;line-height:1.25;text-align:center;color:var(--ink);background:var(--surface);border:1px solid var(--line-strong)}
.mon-btns button:hover:not(:disabled){background:var(--accent-soft);border-color:var(--accent)}
.mon-btns button[aria-pressed=true],.mon-btns button[aria-pressed=true]:hover:not(:disabled){background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.mon-explain{margin:10px 0 0;font-size:13px;line-height:1.45;padding:0 2px}
.mon-dec table,.mon-log table{width:100%;min-width:0;margin-top:8px}
.mon-dec :is(th,td),.mon-log :is(th,td){white-space:normal;padding:4px 8px}
.mon-dec tr.mine td{font-weight:700}
.mon-day input{width:clamp(90px,16vw,150px);accent-color:var(--accent)}
.mon-day output{min-width:2ch;font-weight:800;color:var(--accent);font-size:13px}
.mon-viewbar{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin-top:12px}
.mon-viewbar button[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.mon-viewbar label{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:650}
.mon-viewbar select{padding:5px 8px;border:1px solid var(--line-strong);border-radius:7px;background:var(--surface);font-size:13px}
.mon-viewbar [hidden]{display:none}
.mon-note{margin:6px 0 0;font-size:13px;color:var(--muted)}
.mon-log td:first-child,.mon-log th:first-child,.mon-dec td:first-child,.mon-dec th:first-child{text-align:left}
`;
  lab.root.querySelector('[data-ref=stage]').prepend(style);

  // the Day slider (scrub) sits with the playback controls
  const dayWrap = document.createElement('div');
  dayWrap.className = 'speed-control mon-day';
  dayWrap.innerHTML = '<label for="mon-day-input"></label><input id="mon-day-input" type="range" min="1" max="' + DAYS + '" step="1" value="1"><output aria-hidden="true"></output>';
  const dayInput = dayWrap.querySelector('input'), dayOut = dayWrap.querySelector('output');
  dayWrap.querySelector('label').textContent = tr('Day', 'Hari');
  lab.root.querySelector('.playback').append(dayWrap);
  lab.on(dayInput, 'input', () => goTo(Number(dayInput.value) - 1));
  const explain = document.createElement('p');
  explain.className = 'mon-explain';
  explain.setAttribute('role', 'status');
  lab.root.querySelector('.plot-progress').after(explain);

  // the view switch and the investigation selects sit in the plot card, under the playback bar
  const bar = document.createElement('div');
  bar.className = 'mon-viewbar';
  bar.innerHTML = `<span role="group" data-ref="views"><button type="button" data-view="monitors" aria-pressed="true"></button> <button type="button" data-view="investigate" aria-pressed="false"></button></span>
<label data-inv hidden><span data-ref="lblView"></span><select data-ref="invView"></select></label>
<label data-inv hidden><span data-ref="lblFeature"></span><select data-ref="invFeature"></select></label>`;
  lab.root.querySelector('.playback').after(bar);
  const q = sel => bar.querySelector(sel);
  q('[data-view=monitors]').textContent = tr('Monitors', 'Monitor');
  q('[data-view=investigate]').textContent = tr('Investigate', 'Selidiki');
  q('[data-ref=views]').setAttribute('aria-label', tr('What the big chart shows', 'Isi grafik besar'));
  q('[data-ref=lblView]').textContent = tr('View', 'Tampilan');
  q('[data-ref=lblFeature]').textContent = tr('Feature', 'Fitur');
  const invView = q('[data-ref=invView]'), invFeature = q('[data-ref=invFeature]');
  for (const [v, en, id] of [['hist', 'Feature histograms', 'Histogram fitur'], ['slice', 'Slice by feature', 'Irisan menurut fitur'], ['calib', 'Score calibration', 'Kalibrasi skor']]) invView.append(new Option(tr(en, id), v));
  FEATURES.forEach(f => invFeature.append(new Option(featName(f), f)));
  const note = document.createElement('p');
  note.className = 'mon-note';
  note.setAttribute('role', 'status');
  bar.after(note);

  // ---- state
  const models = new Map();                 // seed -> the two model versions (they depend on the seed only)
  const cache = new Map();                  // settings key -> the run
  let base = null;                          // the run without a remedy
  let decision = null;                      // { kind, fromDay, ...decide() }
  let view = null;                          // the run the charts show: base, or the world after the decision
  let alerts = null;                        // alertsOf(view)
  let baseAlerts = null;
  let mode = 'monitors', revealed = false, seed = DEFAULTS.seed, running = false, busy = false, destroyed = false;
  let timer = 0, token = 0;
  const bandCache = new WeakMap();

  const settingsOf = () => {
    const v = controls.values();
    return { scenario: v.scenario, severity: v.severity, eventDay: v.eventDay - 1, seed, psiThreshold: v.psiThreshold, inputWindow: v.inputWindow, accWindow: v.accWindow, accDrop: v.accDrop };
  };
  const runKey = s => JSON.stringify([s.scenario, s.severity, s.eventDay, s.seed, s.inputWindow, s.accWindow]);

  const controls = lab.panel([
    { name: 'scenario', type: 'select', label: tr('Scenario', 'Skenario'), value: DEFAULTS.scenario, options: SCENARIO_KEYS.map(k => [k, scenarioName(k)]) },
    { name: 'severity', type: 'range', label: tr('Severity', 'Tingkat keparahan'), min: 0, max: 1, step: 0.05, value: DEFAULTS.severity, format: v => fmt(v, { digits: 2 }) },
    { name: 'eventDay', type: 'range', label: tr('Event starts on day', 'Kejadian mulai pada hari'), min: MIN_EVENT_DAY + 1, max: MAX_EVENT_DAY + 1, step: 1, value: DEFAULTS.eventDay + 1, format: v => fmt(v) },
    { name: 'reveal', type: 'toggle', label: tr('Reveal the true accuracy', 'Tampilkan akurasi sebenarnya'), value: false },
    { name: 'psiThreshold', type: 'range', label: tr('PSI alert threshold', 'Ambang alert PSI'), min: 0.05, max: 1, step: 0.05, value: DEFAULTS.psiThreshold, format: v => fmt(v, { digits: 2 }) },
    { name: 'inputWindow', type: 'range', label: tr('Input window (days)', 'Jendela input (hari)'), min: 1, max: 7, step: 1, value: DEFAULTS.inputWindow, format: v => fmt(v) },
    { name: 'accDrop', type: 'range', label: tr('Accuracy drop that alerts (points)', 'Penurunan akurasi yang memicu alert (poin)'), min: 0.02, max: 0.2, step: 0.01, value: DEFAULTS.accDrop, format: v => fmt(v * 100, { digits: 0 }) },
    { name: 'accWindow', type: 'range', label: tr('Accuracy window (days)', 'Jendela akurasi (hari)'), min: 1, max: 14, step: 1, value: DEFAULTS.accWindow, format: v => fmt(v) },
    { name: 'newStream', type: 'button', label: tr('New stream', 'Stream baru'), onClick: () => { seed += 1; changed('seed'); } },
    { type: 'note', text: tr('An alert needs 2 days in a row past the limit. The accuracy monitor only sees labels that have arrived.', 'Alert butuh 2 hari berturut-turut melewati batas. Monitor akurasi hanya melihat label yang sudah tiba.') },
  ], name => changed(name));
  const eventNote = document.createElement('p');
  eventNote.className = 'hint';
  eventNote.setAttribute('role', 'status');
  controls.el.querySelector('select').closest('label').after(eventNote);

  // ---- the predict-first question
  const box = predictBox(lab.ref('below'), {
    name: 'predict-skew',
    hint: tr('Set Scenario to Training-serving skew bug, press Run until the accuracy monitor fires, then check again.', 'Atur Skenario ke Bug training-serving skew, tekan Jalankan sampai monitor akurasi berbunyi, lalu periksa lagi.'),
    question: tr('A feature changes units after a release. Which signal will fire first: the input drift monitor or the accuracy monitor?', 'Sebuah fitur berubah satuan setelah rilis. Sinyal mana yang berbunyi lebih dulu: monitor drift input atau monitor akurasi?'),
    choices: [
      ['input', tr('The input drift monitor', 'Monitor drift input')],
      ['accuracy', tr('The accuracy monitor', 'Monitor akurasi')],
      ['same', tr('Both on the same day', 'Keduanya pada hari yang sama')],
    ],
  });
  lab.cleanup(() => { box.destroy(); clearTimeout(timer); destroyed = true; });
  box.onCheck(() => revealPredict());

  // ---- the stepper: one day per step
  const stepper = lab.stepper({
    init: () => ({ day: 0 }),
    step: s => ({ day: s.day + 1 }),
    isDone: s => s.day >= DAYS - 1,
    render: (s, { running: r }) => { running = r; dayInput.value = String(s.day + 1); dayOut.textContent = fmt(s.day + 1); dayInput.setAttribute('aria-valuetext', tr(`Day ${fmt(s.day + 1)} of ${DAYS}`, `Hari ${fmt(s.day + 1)} dari ${DAYS}`)); draw(); },
    delay: () => STEP_MS,
  });
  const day = () => stepper.state.day;
  const goTo = d => { stepper.set({ day: Math.max(0, Math.min(DAYS - 1, d)) }); };
  // Reset puts every parameter back to its default (scenario, severity, event day, thresholds, windows, the stream seed,
  // the reveal toggle), rebuilds the base run, clears the decision and the quiz, and rewinds the replay to day 1.
  lab.onReset(() => {
    clearTimeout(timer); token += 1; busy = false;
    seed = DEFAULTS.seed; decision = null; revealed = false;
    controls.set('scenario', DEFAULTS.scenario);
    controls.set('severity', DEFAULTS.severity);
    controls.set('eventDay', DEFAULTS.eventDay + 1);
    controls.set('reveal', false);
    controls.set('psiThreshold', DEFAULTS.psiThreshold);
    controls.set('inputWindow', DEFAULTS.inputWindow);
    controls.set('accDrop', DEFAULTS.accDrop);
    controls.set('accWindow', DEFAULTS.accWindow);
    controls.show('severity', DEFAULTS.scenario !== 'clean'); controls.show('eventDay', DEFAULTS.scenario !== 'clean');
    base = runFor(settingsOf());
    applyView();
    box.reset();
    stepper.set({ day: 0 });
  });

  // ---- building runs
  function modelsOf(s) { if (!models.has(s.seed)) models.set(s.seed, modelsFor(s.seed)); return models.get(s.seed); }
  function runFor(s) {
    const key = runKey(s);
    if (cache.has(key)) return cache.get(key);
    const r = buildRun(s, { models: modelsOf(s) });
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
    cache.set(key, r);
    return r;
  }
  function applyView() {
    view = decision ? decision.after : base;
    const s = settingsOf();
    alerts = view ? alertsOf(view, s) : null;
    baseAlerts = base ? alertsOf(base, s) : null;
  }
  function settle(fn) {
    clearTimeout(timer);
    busy = true; setBusyText();
    const mine = ++token;
    timer = setTimeout(() => { if (destroyed || mine !== token) return; fn(); busy = false; draw(); }, SETTLE_MS);
  }
  const setBusyText = () => lab.setStatus(tr('Working out the stream…', 'Menghitung stream…'));

  // Called by every control. Heavy changes (a new stream or window) wait for the slider to settle; thresholds act at once.
  function changed(name) {
    if (name === 'reveal') { revealed = controls.get('reveal'); draw(); return; }
    const s = settingsOf();
    if (name === 'scenario') {
      controls.show('severity', s.scenario !== 'clean'); controls.show('eventDay', s.scenario !== 'clean');
    }
    if (name === 'psiThreshold' || name === 'accDrop') { applyView(); draw(); return; }
    const keepDecision = name === 'inputWindow' || name === 'accWindow';
    settle(() => {
      const before = decision;
      base = runFor(s);
      decision = null;
      if (keepDecision && before) decision = decide({ run: base, kind: before.kind, fromDay: before.fromDay, settings: s });
      applyView();
      if (name === 'scenario') { goTo(Math.min(DAYS - 1, s.eventDay + 6)); if (box.answered) box.reset(); }
    });
  }

  // ---- decision
  function choose(kind) {
    if (!base || busy) return;
    const fromDay = day();
    const s = settingsOf();
    busy = true; setBusyText();
    const mine = ++token;
    setTimeout(() => {
      if (destroyed || mine !== token) return;
      decision = decide({ run: base, kind, fromDay, settings: s });
      applyView();
      revealed = true; controls.set('reveal', true);
      busy = false;
      draw();
    }, 20);
  }

  // ---- the predict question
  function revealPredict() {
    if (!base || baseAlerts == null) return;
    const s = settingsOf();
    const f = baseAlerts.first, d = day();
    const psiDone = f.psi !== null && f.psi <= d, accDone = f.accuracy !== null && f.accuracy <= d;
    if (s.scenario !== 'skew' || !psiDone || !(accDone || d >= DAYS - 1)) return;
    let key = 'input';
    if (!accDone) key = 'input';
    else if (f.accuracy < f.psi) key = 'accuracy';
    else if (f.accuracy === f.psi) key = 'same';
    box.reveal(key, key === 'input'
      ? tr(`The input drift monitor fired on day ${D(f.psi)}; the accuracy monitor ${accDone ? `on day ${D(f.accuracy)}` : 'never did'}. Inputs are visible the moment they arrive; a label is not known until it comes back.`, `Monitor drift input berbunyi pada hari ${D(f.psi)}; monitor akurasi ${accDone ? `pada hari ${D(f.accuracy)}` : 'tidak pernah berbunyi'}. Input terlihat begitu datang; label baru diketahui setelah kembali.`)
      : tr(`The accuracy monitor fired on day ${D(f.accuracy)}, the input monitor on day ${D(f.psi)}. With these thresholds the inputs were not the first to alert.`, `Monitor akurasi berbunyi pada hari ${D(f.accuracy)}, monitor input pada hari ${D(f.psi)}. Dengan ambang ini, input bukan yang pertama memberi alert.`));
  }

  // ---- drawing
  function bandsOf(run) {
    if (bandCache.has(run)) return bandCache.get(run);
    const out = [];
    for (let d = 0; d < DAYS; d++) {
      const c = new Array(BANDS).fill(0);
      const rows = run.stream.rows.slice(d * PER_DAY, (d + 1) * PER_DAY);
      for (const r of rows) c[Math.min(BANDS - 1, Math.floor(run.model.score(r.x) * BANDS))]++;
      out.push(c.map(v => v / rows.length));
    }
    bandCache.set(run, out);
    return out;
  }
  const daysOf = rule => new Set(alerts?.rules?.[rule]?.days ?? []);

  function drawMain() {
    const t = theme(), d = day();
    const s = settingsOf();
    const warn = warnColor();
    if (mode === 'investigate') { lab.setLegend([]); drawInvestigation(); return; }
    const series = FEATURES.map((f, i) => ({ values: view.result.series.psi[f], color: clusterColor(i), width: 2.4 }));
    const eventDay = s.scenario === 'clean' ? null : s.eventDay;
    const o = {
      day: d, yMin: 0, yMax: 10, map: psiMap, ticks: PSI_TICKS.map(v => ({ v, label: fmt(v) })),
      series, hlines: [{ v: s.psiThreshold, color: t.ink, dash: [6, 4], width: 1.8 }],
      vlines: [...(eventDay !== null && s.severity > 0 ? [{ day: eventDay, color: t.muted }] : []), ...(decision ? [{ day: decision.fromDay, color: clusterColor(2), dash: [6, 3] }] : [])],
      bandDays: daysOf('psi'),
    };
    lab.setLegend([...FEATURES.map((f, i) => ({ kind: 'line', color: clusterColor(i), label: featName(f) })),
      { kind: 'dash', color: t.ink, label: tr(`Alert threshold ${fmt(s.psiThreshold, { digits: 2 })}`, `Ambang alert ${fmt(s.psiThreshold, { digits: 2 })}`) },
      { kind: 'dot', color: warn, label: tr('Alert day (red marks at the bottom)', 'Hari alert (tanda merah di bawah)') },
      ...(eventDay !== null && s.severity > 0 ? [{ kind: 'dash', color: t.muted, label: tr('Event starts', 'Kejadian mulai') }] : []),
      ...(decision ? [{ kind: 'dash', color: clusterColor(2), label: tr('Your decision', 'Keputusanmu') }] : []),
      { kind: 'line', color: t.muted, label: tr('Axis squeezed above 1', 'Sumbu dipadatkan di atas 1') }]);
    timeChart(lab.canvas, o);
    const dd = view.daily[d];
    lab.describe(lab.canvas, tr(
      `Day ${D(d)} of ${DAYS}. Largest input drift: ${featName(dd.psiMaxFeature)}, PSI ${fmt(dd.psiMax, { digits: 2 })}; alert threshold ${fmt(s.psiThreshold, { digits: 2 })}. ${alertSentence(d)}`,
      `Hari ${D(d)} dari ${DAYS}. Drift input terbesar: ${featName(dd.psiMaxFeature)}, PSI ${fmt(dd.psiMax, { digits: 2 })}; ambang alert ${fmt(s.psiThreshold, { digits: 2 })}. ${alertSentence(d)}`));
  }

  function drawInvestigation() {
    const d = day(), v = invView.value, f = invFeature.value;
    if (v === 'hist') drawFeatureHistogram(lab.canvas, featureView(view, d, { feature: f, window: INVESTIGATE_DAYS }));
    else if (v === 'slice') drawSlices(lab.canvas, sliceView(view, d, { feature: f }));
    else drawCalibration(lab.canvas, calibrationView(view, d));
    lab.describe(lab.canvas, tr(`Investigation view on day ${D(d)}: ${invView.selectedOptions[0].textContent}${v === 'calib' ? '' : `, ${featName(f)}`}.`, `Tampilan penyelidikan pada hari ${D(d)}: ${invView.selectedOptions[0].textContent}${v === 'calib' ? '' : `, ${featName(f)}`}.`));
  }

  function drawScore() {
    const t = theme(), d = day(), s = settingsOf();
    timeChart(scoreCanvas, {
      day: d, yMin: 0, yMax: 10, map: psiMap, ticks: PSI_TICKS.map(v => ({ v, label: fmt(v) })),
      series: [{ values: view.result.series.scoreDrift, color: clusterColor(4) }],
      hlines: [{ v: s.psiThreshold, color: t.ink, dash: [6, 4], width: 1.8 }],
      vlines: decision ? [{ day: decision.fromDay, color: clusterColor(2), dash: [6, 3] }] : [],
      bandDays: daysOf('score'), strip: bandsOf(view),
      legend: [{ color: clusterColor(4), label: tr('Score drift (PSI)', 'Drift skor (PSI)') }, { color: t.ink, kind: 'dash', label: tr('Alert threshold', 'Ambang alert') }, { color: warnColor(), kind: 'band', label: tr('Alert day', 'Hari alert') }, { color: clusterColor(4), kind: 'band', label: tr('Strip: share of predictions per score band', 'Strip: porsi prediksi per rentang skor') }, { color: t.muted, label: tr('Axis squeezed above 1', 'Sumbu dipadatkan di atas 1') }],
    });
    lab.describe(scoreCanvas, tr(`Score drift on day ${D(d)}: PSI ${fmt(view.daily[d].scoreDrift, { digits: 2 })}, average score ${pct(view.daily[d].meanScore, 0)}.`, `Drift skor pada hari ${D(d)}: PSI ${fmt(view.daily[d].scoreDrift, { digits: 2 })}, skor rata-rata ${pct(view.daily[d].meanScore, 0)}.`));
  }

  function drawAccuracy() {
    const t = theme(), d = day(), s = settingsOf(), warn = warnColor();
    const baseline = view.baseline.accuracy;
    const series = [{ values: view.result.series.accuracyDelayed, color: clusterColor(0) }];
    const legend = [{ color: clusterColor(0), label: tr('Delayed accuracy (labels that arrived)', 'Akurasi terlambat (label yang sudah tiba)') }];
    if (revealed) {
      if (decision) { series.unshift({ values: base.result.series.accuracyTrue, color: t.muted, dash: [5, 4], width: 1.8, dot: false }); legend.push({ color: t.muted, kind: 'dash', label: tr('True accuracy, no fix', 'Akurasi sebenarnya, tanpa perbaikan') }); }
      series.push({ values: view.result.series.accuracyTrue, color: clusterColor(2), width: 2 });
      legend.push({ color: clusterColor(2), label: decision ? tr('True accuracy after your choice', 'Akurasi sebenarnya setelah pilihanmu') : tr('True accuracy (revealed)', 'Akurasi sebenarnya (ditampilkan)') });
    }
    legend.push({ color: t.ink, kind: 'dash', label: tr('Launch accuracy', 'Akurasi saat rilis') }, { color: warn, kind: 'dot', label: tr('Alert limit', 'Batas alert') }, { color: warn, kind: 'band', label: tr('Alert day', 'Hari alert') });
    timeChart(accCanvas, {
      day: d, yMin: 0.3, yMax: 1, ticks: [0.4, 0.6, 0.8, 1].map(v => ({ v, label: pct(v, 0) })),
      series,
      hlines: [{ v: baseline, color: t.ink, dash: [6, 4], width: 1.5 }, { v: baseline - s.accDrop, color: warn, dash: [2, 3], width: 1.8 }],
      vlines: [...(decision ? [{ day: decision.fromDay, color: clusterColor(2), dash: [6, 3] }] : [])],
      bandDays: daysOf('accuracy'), legend,
    });
    const dd = view.daily[d];
    lab.describe(accCanvas, tr(
      `Day ${D(d)}: delayed accuracy ${dd.accuracyDelayed == null ? 'not available yet, too few labels have arrived' : pct(dd.accuracyDelayed, 1)}, launch accuracy ${pct(baseline, 1)}.${revealed ? ` True accuracy today ${pct(dd.accuracyTrue, 1)}.` : ''}`,
      `Hari ${D(d)}: akurasi terlambat ${dd.accuracyDelayed == null ? 'belum tersedia, label yang tiba masih terlalu sedikit' : pct(dd.accuracyDelayed, 1)}, akurasi saat rilis ${pct(baseline, 1)}.${revealed ? ` Akurasi sebenarnya hari ini ${pct(dd.accuracyTrue, 1)}.` : ''}`));
  }

  function alertSentence(d) {
    const f = alerts.first;
    const fired = ['psi', 'score', 'accuracy'].filter(r => f[r] !== null && f[r] <= d);
    if (!fired.length) return tr('No alert yet.', 'Belum ada alert.');
    return tr(`Alerts so far: ${fired.map(r => `${ruleName(r)} from day ${D(f[r])}`).join(', ')}.`, `Alert sejauh ini: ${fired.map(r => `${ruleName(r)} sejak hari ${D(f[r])}`).join(', ')}.`);
  }

  function drawLog() {
    const d = day(), log = alertLog(alerts, d);
    const head = logCard.querySelector('thead tr');
    head.replaceChildren(...[tr('Monitor', 'Monitor'), tr('First alert', 'Alert pertama'), tr('Reading then', 'Nilai saat itu'), tr('Alert days', 'Hari alert')].map(h => Object.assign(document.createElement('th'), { textContent: h })));
    const body = logCard.querySelector('tbody');
    body.replaceChildren(...['psi', 'score', 'accuracy'].map(rule => {
      const tr_ = document.createElement('tr'), e = log[rule];
      const cells = [ruleName(rule),
        e.first ? tr(`Day ${D(e.first.day)}`, `Hari ${D(e.first.day)}`) : tr('none yet', 'belum ada'),
        e.first ? (rule === 'accuracy' ? tr(`${pct(e.first.value, 1)} (limit ${pct(e.first.threshold, 1)})`, `${pct(e.first.value, 1)} (batas ${pct(e.first.threshold, 1)})`) : tr(`${fmt(e.first.value, { digits: 2 })} (limit ${fmt(e.first.threshold, { digits: 2 })})`, `${fmt(e.first.value, { digits: 2 })} (batas ${fmt(e.first.threshold, { digits: 2 })})`)) : '–',
        fmt(e.days)];
      cells.forEach(c => { const td = document.createElement('td'); td.textContent = c; tr_.append(td); });
      return tr_;
    }));
  }

  function drawDecision() {
    const d = day();
    const when = tr(`Pause on a day, then choose in the Decision box. Your choice is applied from the day shown; its cost is the price of the fix plus ${fmt(ERROR_COST, { digits: 2 })} per wrong prediction from then on.`, `Berhenti di satu hari, lalu pilih di kotak Keputusan. Pilihanmu berlaku mulai hari yang ditampilkan; biayanya adalah harga perbaikan ditambah ${fmt(ERROR_COST, { digits: 2 })} per prediksi salah sesudahnya.`);
    const btns = decCard.querySelector('[data-ref=decButtons]');
    if (!btns.children.length) {
      for (const kind of ['rollback', 'recalibrate', 'retrain', 'none']) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'btn'; b.dataset.kind = kind; b.setAttribute('aria-pressed', 'false');
        lab.on(b, 'click', () => choose(kind));
        btns.append(b);
      }
    }
    for (const b of btns.children) { b.textContent = remedyName(b.dataset.kind); b.setAttribute('aria-pressed', String(decision?.kind === b.dataset.kind)); b.disabled = busy; }
    const head = decCard.querySelector('thead tr');
    head.replaceChildren(...[tr('Option', 'Pilihan'), tr('Accuracy after', 'Akurasi sesudah'), tr('Wrong predictions', 'Prediksi salah'), tr('Cost', 'Biaya')].map(h => Object.assign(document.createElement('th'), { textContent: h })));
    const body = decCard.querySelector('tbody');
    if (!decision) {
      const rowEl = document.createElement('tr'), td = document.createElement('td');
      td.colSpan = 4; td.style.textAlign = 'left'; td.textContent = tr('No decision yet. The table compares all four options from the day you choose.', 'Belum ada keputusan. Tabel membandingkan keempat pilihan dari hari yang kamu pilih.');
      rowEl.append(td); body.replaceChildren(rowEl); explain.textContent = when;
      return;
    }
    const order = ['rollback', 'recalibrate', 'retrain', 'none'];
    body.replaceChildren(...order.map(kind => {
      const o = decision.comparison.byKind[kind], rowEl = document.createElement('tr');
      if (kind === decision.kind) rowEl.className = 'mine';
      const mark = (kind === decision.kind ? tr(' ◄ your choice', ' ◄ pilihanmu') : '') + (kind === decision.choice.best ? tr(' ✓ cheapest', ' ✓ termurah') : '');
      [remedyShort(kind) + mark, pct(o.outcome.metric.accuracy, 1), fmt(o.outcome.metric.errors), `${fmt(o.cost.total, { digits: 1 })}`].forEach(c => { const td = document.createElement('td'); td.textContent = c; rowEl.append(td); });
      return rowEl;
    }));
    explain.textContent = explainDecision(decision, settingsOf().scenario);
  }

  function readouts() {
    const d = day(), dd = view.daily[d];
    lab.setStatus(tr(`Day ${D(d)} of ${DAYS}. ${alertSentence(d)}`, `Hari ${D(d)} dari ${DAYS}. ${alertSentence(d)}`));
    const labelDelay = settingsOf().scenario === 'delayed' && d >= settingsOf().eventDay ? eventStrength('delayed', 0).delay : LABEL_DELAY;
    lab.setDetail(tr(
      `Labels arrive ${fmt(labelDelay)} days late, so accuracy lags by about as much. Largest input drift: ${featName(dd.psiMaxFeature)} ${fmt(dd.psiMax, { digits: 2 })}. Delayed accuracy: ${dd.accuracyDelayed == null ? 'no labels yet' : `${pct(dd.accuracyDelayed, 1)} from ${fmt(dd.nLabels)} labels`}.${revealed ? ` True accuracy: ${pct(dd.accuracyTrue, 1)}.` : ''}`,
      `Label tiba ${fmt(labelDelay)} hari terlambat, jadi akurasi tertinggal selama itu. Drift input terbesar: ${featName(dd.psiMaxFeature)} ${fmt(dd.psiMax, { digits: 2 })}. Akurasi terlambat: ${dd.accuracyDelayed == null ? 'belum ada label' : `${pct(dd.accuracyDelayed, 1)} dari ${fmt(dd.nLabels)} label`}.${revealed ? ` Akurasi sebenarnya: ${pct(dd.accuracyTrue, 1)}.` : ''}`));
    lab.setMetrics('');
  }

  function draw() {
    if (destroyed) return;
    if (!view || !alerts) { lab.setStatus(tr('Working out the stream…', 'Menghitung stream…')); return; }
    const s = settingsOf();
    eventNote.textContent = describeEvent(s.scenario, s.severity, s.eventDay);
    drawMain(); drawScore(); drawAccuracy(); drawLog(); drawDecision();
    if (!busy) readouts();
    note.textContent = mode === 'investigate'
      ? tr(`Recent means the last ${fmt(INVESTIGATE_DAYS)} days; accuracy and calibration use only rows whose label has arrived (from the last 21 days).`, `Terbaru berarti ${fmt(INVESTIGATE_DAYS)} hari terakhir; akurasi dan kalibrasi hanya memakai baris yang labelnya sudah tiba (dari 21 hari terakhir).`) : '';
    note.hidden = !note.textContent;
  }

  // ---- view switch, keyboard and scrubbing
  function setMode(next) {
    mode = next;
    bar.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === mode)));
    bar.querySelectorAll('[data-inv]').forEach(l => { l.hidden = mode !== 'investigate'; });
    invFeature.closest('label').hidden = mode !== 'investigate' || invView.value === 'calib';
    lab.root.querySelector('h2.lab-h').textContent = mode === 'investigate' ? tr('Investigation', 'Penyelidikan') : tr('Inference stream replay', 'Replay stream inferensi');
    lab.canvas.setAttribute('aria-label', mode === 'investigate' ? tr('Investigation chart', 'Grafik penyelidikan') : tr('Input drift chart: PSI of each feature by day', 'Grafik drift input: PSI tiap fitur per hari'));
    draw();
  }
  bar.querySelectorAll('[data-view]').forEach(b => lab.on(b, 'click', () => setMode(b.dataset.view)));
  lab.on(invView, 'change', () => setMode(mode));
  lab.on(invFeature, 'change', () => draw());

  lab.on(lab.canvas, 'keydown', e => {
    const keys = { ArrowRight: 1, ArrowLeft: -1, PageUp: 7, PageDown: -7 };
    if (e.key in keys) { e.preventDefault(); goTo(day() + keys[e.key]); }
    else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    else if (e.key === 'End') { e.preventDefault(); goTo(DAYS - 1); }
  });
  const scrubbable = [lab.canvas, scoreCanvas, accCanvas];
  for (const c of scrubbable) {
    const at = e => { const g = c._geo; if (!g || (c === lab.canvas && mode !== 'monitors')) return; const x = e.clientX - c.getBoundingClientRect().left; goTo(Math.round((x - g.padL) / g.step - 0.5)); };
    lab.on(c, 'pointerdown', e => { if (e.button !== 0 && e.pointerType === 'mouse') return; c.setPointerCapture?.(e.pointerId); c._scrub = true; at(e); });
    lab.on(c, 'pointermove', e => { if (c._scrub) at(e); });
    lab.on(c, 'pointerup', () => { c._scrub = false; });
    lab.on(c, 'pointercancel', () => { c._scrub = false; });
    c.style.cursor = 'ew-resize';
  }
  lab.onTheme(draw);
  lab.onResize(draw);

  // ---- first run
  controls.show('severity', DEFAULTS.scenario !== 'clean'); controls.show('eventDay', DEFAULTS.scenario !== 'clean');
  const first = settingsOf();
  base = runFor(first);
  applyView();
  goTo(first.eventDay + 6);
  return lab.destroy;
}
