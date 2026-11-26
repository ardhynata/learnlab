// Reliability lab, built on the kit. A model that never sees the group column is scored on a test set, per group:
// accuracy, recall (TPR) and false-positive rate (FPR). A stress panel (noise, missing values, outliers, a unit change,
// a distribution shift, with a strength) damages the test rows and the plot shows each group's rates before and after.
// Beside it: the fairness gaps before and after, a calibration curve per group, a human-review band, a privacy panel
// (k-anonymity on made-up personal fields, and a count released with Laplace noise) and a model card that is prefilled
// with what the lab measured and copied out as plain text.
//   Generated data: sims/ml/reliability.js (makeApplicants, groups A, B, C). "Penguins (real)": is the penguin male, from
//   bill length, flipper length and body mass, with the species as the groups (rows with a missing value, NA, are left out
//   and the lab says how many). The pure logic is in ml/reliabilitylab.js; this file draws and wires.
import { createLab, panel, drawLineChart, dataModeSpec, loadDataset, predictBox, clusterColor, theme, tr, fmt, pct } from '../kit/index.js';
import { reviewBand } from '../ml/reliability.js';
import {
  generatedSets, penguinSets, fitModel, evaluate, gapRows, differs, calibrationByGroup, scoreHistogram,
  makeDirectory, privacyView, noisyCounts, cardText, stressAmount, STRESS_KINDS,
} from '../ml/reliabilitylab.js';

export const DEFAULTS = {
  data: 'generated', kind: 'missing', strength: 0.4, threshold: 0.5, perGroup: false, goal: 'equalOpportunity',
  low: 0.35, high: 0.65, seed: 1,
  fields: ['age', 'postcode', 'sex'], ageBin: 1, digits: 5, k: 5, epsilon: 0.5,
};
const STRESS_SEED = 7;
const TOLERANCE = 0.05; // a gap of 5 points or more counts as "differs"

// ---- names and numbers, built when drawn so they follow the language ------------------------------------------

const kindName = kind => ({
  noise: tr('Noise', 'Noise'),
  missing: tr('Missing values', 'Missing value'),
  outlier: tr('Outliers', 'Outlier'),
  unitChange: tr('Unit change', 'Perubahan satuan'),
  shift: tr('Distribution shift', 'Distribution shift'),
})[kind] ?? kind;

// What a slider strength means, short (the readout beside the slider).
const strengthShort = (kind, s) => {
  const a = stressAmount(kind, s);
  switch (kind) {
    case 'noise': return tr(`${fmt(a, { digits: 1 })} sd`, `${fmt(a, { digits: 1 })} sd`);
    case 'missing': return tr(`${pct(a, 0)} blank`, `${pct(a, 0)} kosong`);
    case 'outlier': return tr(`${pct(a, 0)} of cells`, `${pct(a, 0)} sel`);
    case 'unitChange': return `×${fmt(10 ** a, { digits: 0 })}`;
    default: return tr(`${fmt(a, { digits: 1 })} sd`, `${fmt(a, { digits: 1 })} sd`);
  }
};
// And in a sentence (the note under the stress controls).
const strengthSentence = (kind, s, real) => {
  const a = stressAmount(kind, s);
  const first = real ? tr('bill length', 'panjang paruh') : tr('skill', 'skill');
  if (a === 0) return tr('No stress: the test rows are left as they are.', 'Tanpa stres: baris test dibiarkan apa adanya.');
  switch (kind) {
    case 'noise': return tr(`Every value gets random noise as large as ${fmt(a, { digits: 1 })} standard deviations of its column.`, `Setiap nilai diberi noise acak sebesar ${fmt(a, { digits: 1 })} simpangan baku kolomnya.`);
    case 'missing': return tr(`${pct(a, 0)} of the cells are blanked. The model fills a blank with the training average.`, `${pct(a, 0)} sel dikosongkan. Model mengisi sel kosong dengan rata-rata data training.`);
    case 'outlier': return tr(`${pct(a, 0)} of the cells are replaced by a value 8 standard deviations away.`, `${pct(a, 0)} sel diganti dengan nilai yang berjarak 8 simpangan baku.`);
    case 'unitChange': return tr(`The ${first} column is multiplied by ${fmt(10 ** a, { digits: 0 })}, as if its unit changed.`, `Kolom ${first} dikalikan ${fmt(10 ** a, { digits: 0 })}, seolah satuannya berubah.`);
    default: return tr(`Every value moves by ${fmt(a, { digits: 1 })} standard deviations of its column, as if the population drifted.`, `Setiap nilai bergeser ${fmt(a, { digits: 1 })} simpangan baku kolomnya, seolah populasinya bergeser.`);
  }
};
const groupName = (g, real) => (real ? g : tr(`Group ${g}`, `Kelompok ${g}`));
const p0 = v => (v === null || v === undefined ? 'n/a' : pct(v, 0));
const p1 = v => (v === null || v === undefined ? 'n/a' : pct(v, 1));
const pts = v => (v === null || v === undefined ? 'n/a' : fmt(Math.abs(v) * 100, { digits: 1 }));
const ptsWord = v => tr(`${pts(v)} points`, `${pts(v)} poin`);
const cutText = t => (t === Infinity ? tr('none flagged', 'tidak ada yang ditandai') : fmt(t, { digits: 2 }));
const gapName = key => ({
  equalOpportunity: tr('Equal opportunity gap (recall)', 'Selisih equal opportunity (recall)'),
  demographicParity: tr('Demographic parity gap (selection rate)', 'Selisih demographic parity (selection rate)'),
  fpr: tr('False-positive-rate gap', 'Selisih false-positive rate'),
})[key];
const goalName = goal => (goal === 'demographicParity' ? tr('selection rate', 'selection rate') : tr('recall', 'recall'));
// A directory value as shown: the made-up sex and job values follow the language (the data itself keeps F, M and English jobs).
const VALUE_ID = { F: 'P', M: 'L', clerk: 'staf administrasi', driver: 'sopir', nurse: 'perawat', teacher: 'guru', cook: 'juru masak', engineer: 'insinyur' };
const groupKeyText = key => key.split(' | ').map(v => tr(v, VALUE_ID[v] ?? v)).join(' | ');
const fieldName = f => ({ age: tr('age', 'usia'), postcode: tr('postcode', 'kode pos'), sex: tr('sex', 'jenis kelamin'), job: tr('job title', 'jabatan') })[f] ?? f;

// ---- pure text: what the model card is prefilled with (tested in reliability-lab.test.js) ----------------------------

// The "known limits" sentence about the groups: it states a difference only when the clean rows show one (5 points or more in
// accuracy, recall or false-positive rate), and otherwise says what was measured.
function gapLimit(ev) {
  const d = differs(ev.before, TOLERANCE);
  const g = d.gaps;
  const nums = tr(`accuracy gap ${ptsWord(g.accuracy)}, recall gap ${ptsWord(g.tpr)}, false-positive-rate gap ${ptsWord(g.fpr)}`, `selisih accuracy ${ptsWord(g.accuracy)}, selisih recall ${ptsWord(g.tpr)}, selisih false-positive rate ${ptsWord(g.fpr)}`);
  return d.differs
    ? tr(`The error rates differ between groups even though the model never sees the group (${nums}, before any stress).`, `Tingkat galat berbeda antar kelompok walau model tidak pernah melihat kelompoknya (${nums}, sebelum stres apa pun).`)
    : tr(`On the clean test rows the groups are close (${nums}, all under ${fmt(TOLERANCE * 100)} points); that can change with other data or a stress, and the model never sees the group.`, `Pada baris test yang bersih kelompok-kelompok berdekatan (${nums}, semuanya di bawah ${fmt(TOLERANCE * 100)} poin); ini bisa berubah pada data lain atau di bawah stres, dan model tidak pernah melihat kelompoknya.`);
}

// m: { real, sets, params, ev, names, review, privacy, noisy, directoryN }. Returns { fields: { key: text }, auto: { key: [lines] } }.
export function cardContent(m) {
  const { real, sets, params, ev, names, review, privacy, directoryN } = m;
  const gn = g => groupName(g, real);
  const cut = typeof ev.thresholds === 'number'
    ? tr(`one threshold, ${cutText(ev.thresholds)}`, `satu threshold, ${cutText(ev.thresholds)}`)
    : tr(`a threshold per group (${names.map(g => `${g} ${cutText(ev.thresholds[g])}`).join(', ')}), tuned to match ${goalName(params.goal)}`, `threshold per kelompok (${names.map(g => `${g} ${cutText(ev.thresholds[g])}`).join(', ')}), disetel agar ${goalName(params.goal)} sama`);
  const purpose = real
    ? tr('Estimate whether a penguin is male from three body measurements. A teaching example on real data; it is not meant for any real decision.', 'Memperkirakan apakah seekor penguin jantan dari tiga ukuran tubuh. Contoh belajar pada data nyata; tidak dimaksudkan untuk keputusan nyata apa pun.')
    : tr('Rank applicants as likely to be positive (for example, to repay a loan) so that a person can decide faster. A teaching model fitted to generated data; it is not meant for any real decision.', 'Mengurutkan pelamar berdasarkan kemungkinan positif (misalnya melunasi pinjaman) agar seseorang dapat memutuskan lebih cepat. Model belajar yang dilatih pada data buatan; tidak dimaksudkan untuk keputusan nyata apa pun.');
  const data = real
    ? tr(`Palmer penguins: ${fmt(sets.kept)} of ${fmt(sets.total)} rows used (${fmt(sets.dropped)} rows with a missing value, NA, were left out). ${fmt(sets.train.X.length)} rows to fit the model, ${fmt(sets.test.X.length)} to test it. Groups are the three species (${names.join(', ')}); the model never sees the species.`, `Penguin Palmer: ${fmt(sets.kept)} dari ${fmt(sets.total)} baris dipakai (${fmt(sets.dropped)} baris dengan missing value, NA, dibuang). ${fmt(sets.train.X.length)} baris untuk melatih model, ${fmt(sets.test.X.length)} untuk mengujinya. Kelompoknya adalah tiga spesies (${names.join(', ')}); model tidak pernah melihat spesiesnya.`)
    : tr(`Generated applicants (seeded): skill, experience and a postcode score. ${fmt(sets.train.X.length)} rows to fit the model, ${fmt(sets.test.X.length)} to test it, in groups ${names.join(', ')} that differ in base rate and in how noisy their features are. The model never sees the group.`, `Pelamar buatan (memakai seed): skill, pengalaman, dan skor kode pos. ${fmt(sets.train.X.length)} baris untuk melatih model, ${fmt(sets.test.X.length)} untuk mengujinya, dalam kelompok ${names.join(', ')} yang berbeda dalam base rate dan tingkat noise fiturnya. Model tidak pernah melihat kelompoknya.`);
  const rate = g => tr(`accuracy ${p0(g.accuracy)}, recall ${p0(g.tpr)}, false-positive rate ${p0(g.fpr)}`, `accuracy ${p0(g.accuracy)}, recall ${p0(g.tpr)}, false-positive rate ${p0(g.fpr)}`);
  const metrics = [
    tr(`On the clean test rows, with ${cut}:`, `Pada baris test yang bersih, dengan ${cut}:`),
    ...ev.before.groups.map(g => `${gn(g.group)} (n = ${fmt(g.size)}): ${rate(g)}`),
    `${tr('All', 'Semua')} (n = ${fmt(ev.before.overall.size)}): ${rate(ev.before.overall)}`,
  ].join('\n');
  const worst = ev.worstGroup;
  const stressed = params.strength > 0;
  const limits = [
    stressed
      ? tr(`Under ${kindName(params.kind).toLowerCase()} (${strengthShort(params.kind, params.strength)}) accuracy falls from ${p0(ev.before.overall.accuracy)} to ${p0(ev.after.overall.accuracy)}; ${gn(worst)} loses most (${ptsWord(ev.drop.byGroup[worst])}).`, `Di bawah ${kindName(params.kind).toLowerCase()} (${strengthShort(params.kind, params.strength)}) accuracy turun dari ${p0(ev.before.overall.accuracy)} menjadi ${p0(ev.after.overall.accuracy)}; ${gn(worst)} paling banyak kehilangan (${ptsWord(ev.drop.byGroup[worst])}).`)
      : tr('No stress test was run yet.', 'Uji stres belum dijalankan.'),
    gapLimit(ev),
    tr(`The smallest group has ${fmt(Math.min(...ev.before.groups.map(g => g.size)))} test rows, so its numbers are rough.`, `Kelompok terkecil hanya punya ${fmt(Math.min(...ev.before.groups.map(g => g.size)))} baris test, jadi angkanya kasar.`),
    real ? tr('Real data, but a small and simple task: penguins are not people.', 'Data nyata, tetapi tugasnya kecil dan sederhana: penguin bukan manusia.') : tr('The data is generated, so real applicants may behave differently.', 'Datanya buatan, jadi pelamar sungguhan bisa berperilaku berbeda.'),
  ].join('\n');
  const lowestRecall = ev.before.groups.filter(g => g.tpr !== null).sort((a, b) => a.tpr - b.tpr)[0];
  const humanReview = [
    tr(`Send a case to a person when its score is between ${fmt(review.low, { digits: 2 })} and ${fmt(review.high, { digits: 2 })} (under the stress above: ${p0(review.workload)} of the cases; the automated part is ${p0(review.accuracyAutomated)} accurate).`, `Kirim kasus ke seseorang bila skornya di antara ${fmt(review.low, { digits: 2 })} dan ${fmt(review.high, { digits: 2 })} (di bawah stres di atas: ${p0(review.workload)} kasus; bagian otomatisnya ${p0(review.accuracyAutomated)} akurat).`),
    tr('Also send any case with a missing value.', 'Kirim juga setiap kasus dengan missing value.'),
    lowestRecall ? tr(`Check ${gn(lowestRecall.group)} more closely: it has the lowest recall (${p0(lowestRecall.tpr)}).`, `Periksa ${gn(lowestRecall.group)} lebih saksama: recall-nya paling rendah (${p0(lowestRecall.tpr)}).`) : '',
  ].filter(Boolean).join('\n');
  const rows = gapRows(ev.before, ev.after);
  const auto = {
    robustness: [stressed
      ? tr(`Stress: ${kindName(params.kind)}, ${strengthShort(params.kind, params.strength)}. Accuracy ${p0(ev.before.overall.accuracy)} to ${p0(ev.after.overall.accuracy)}; the largest drop is ${gn(worst)}, ${ptsWord(ev.drop.byGroup[worst])}.`, `Stres: ${kindName(params.kind)}, ${strengthShort(params.kind, params.strength)}. Accuracy ${p0(ev.before.overall.accuracy)} menjadi ${p0(ev.after.overall.accuracy)}; penurunan terbesar pada ${gn(worst)}, ${ptsWord(ev.drop.byGroup[worst])}.`)
      : tr('No stress applied.', 'Tidak ada stres yang diterapkan.')],
    fairness: rows.map(r => tr(`${gapName(r.key)}: ${pts(r.before)} points before, ${pts(r.after)} after the stress.`, `${gapName(r.key)}: ${pts(r.before)} poin sebelum, ${pts(r.after)} sesudah stres.`)),
    privacy: privacy
      ? [
        tr(`Made-up directory of ${fmt(directoryN)} people; quasi-identifiers: ${params.fields.map(fieldName).join(', ')}${params.ageBin > 1 ? `; age in ${fmt(params.ageBin)}-year bins` : ''}${params.digits < 5 ? `; postcode cut to ${fmt(params.digits)} digits` : ''}.`, `Direktori buatan berisi ${fmt(directoryN)} orang; quasi-identifier: ${params.fields.map(fieldName).join(', ')}${params.ageBin > 1 ? `; usia dalam rentang ${fmt(params.ageBin)} tahun` : ''}${params.digits < 5 ? `; kode pos dipotong menjadi ${fmt(params.digits)} digit` : ''}.`),
        tr(`Smallest group: ${fmt(privacy.minGroupSize)} ${privacy.minGroupSize === 1 ? 'person' : 'people'} (the data's own k). ${p0(privacy.shareBelowK)} of the people sit in a group smaller than k = ${fmt(params.k)}.`, `Kelompok terkecil: ${fmt(privacy.minGroupSize)} orang (k milik data itu sendiri). ${p0(privacy.shareBelowK)} orang berada di kelompok yang lebih kecil dari k = ${fmt(params.k)}.`),
        tr(`A count released with epsilon ${fmt(params.epsilon, { digits: 2 })} is off by about ${fmt(1 / params.epsilon, { digits: 1 })} (Laplace noise).`, `Count yang dirilis dengan epsilon ${fmt(params.epsilon, { digits: 2 })} meleset sekitar ${fmt(1 / params.epsilon, { digits: 1 })} (noise Laplace).`),
      ]
      : [tr('No quasi-identifier chosen.', 'Belum ada quasi-identifier yang dipilih.')],
  };
  return { fields: { purpose, data, metrics, limits, review: humanReview }, auto };
}

// ---- canvas helpers ----------------------------------------------------------------------------------------------

function prepare(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, w: width, h: height, t: theme() };
}

// Three blocks (accuracy, recall, false-positive rate), one row per group, two bars per row: the clean test rows
// (outlined) and the same rows after the stress (solid).
function drawMain(canvas, ev, names, labelOf) {
  const { ctx, w, h, t } = prepare(canvas);
  ctx.fillStyle = t.plot; ctx.fillRect(0, 0, w, h);
  if (!ev) {
    ctx.fillStyle = t.muted; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(tr('Loading…', 'Memuat…'), w / 2, h / 2);
    return;
  }
  const blocks = [
    { key: 'accuracy', title: tr('Accuracy', 'Akurasi') },
    { key: 'tpr', title: tr('Recall (true-positive rate)', 'Recall (true-positive rate)') },
    { key: 'fpr', title: tr('False-positive rate (lower is better)', 'False-positive rate (rendah = baik)') },
  ];
  ctx.font = '12px system-ui, sans-serif';
  const padL = Math.min(Math.round(w * 0.4), 32 + Math.max(...names.map(g => ctx.measureText(labelOf(g)).width))), padR = 40, top = 6, axisH = 20;
  const plotL = padL, plotW = Math.max(40, w - padL - padR);
  const blockH = (h - top - axisH) / blocks.length;
  const rowsTop = 22, rowH = (blockH - rowsTop - 4) / names.length;
  const bt = Math.max(3, Math.min(14, (rowH - 6) / 2));
  const X = v => plotL + Math.max(0, Math.min(1, v)) * plotW;
  // grid
  ctx.strokeStyle = t.grid; ctx.lineWidth = 1; ctx.beginPath();
  for (const v of [0, 0.25, 0.5, 0.75, 1]) { ctx.moveTo(X(v), top); ctx.lineTo(X(v), h - axisH); }
  ctx.stroke();
  ctx.fillStyle = t.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center';
  for (const v of [0, 0.5, 1]) { ctx.textAlign = v === 0 ? 'left' : v === 1 ? 'right' : 'center'; ctx.fillText(p0(v), X(v), h - 6); }
  blocks.forEach((b, bi) => {
    const y0 = top + bi * blockH;
    ctx.textAlign = 'left'; ctx.font = '700 12.5px system-ui, sans-serif'; ctx.fillStyle = t.ink;
    ctx.fillText(b.title, 8, y0 + 15);
    names.forEach((g, gi) => {
      const ry = y0 + rowsTop + gi * rowH;
      const color = clusterColor(gi);
      const mid = ry + rowH / 2;
      ctx.fillStyle = color; ctx.fillRect(8, mid - 5, 10, 10);
      ctx.fillStyle = t.ink; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(labelOf(g), 23, mid + 4);
      const vals = [ev.before.byGroup[g][b.key], ev.after.byGroup[g][b.key]];
      vals.forEach((v, k) => {
        const by = mid - bt - 1 + k * (bt + 2);
        if (v === null) { ctx.fillStyle = t.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('n/a', plotL + 4, by + bt - 1); return; }
        const bw = Math.max(1, v * plotW);
        if (k === 0) {
          ctx.globalAlpha = 0.22; ctx.fillStyle = color; ctx.fillRect(plotL, by, bw, bt); ctx.globalAlpha = 1;
          ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.strokeRect(plotL + 0.75, by + 0.75, Math.max(0, bw - 1.5), bt - 1.5);
        } else { ctx.fillStyle = color; ctx.fillRect(plotL, by, bw, bt); }
        ctx.fillStyle = k === 0 ? t.muted : t.ink; ctx.font = `${k === 0 ? 400 : 700} 11px system-ui, sans-serif`; ctx.textAlign = 'left';
        ctx.fillText(p0(v), plotL + bw + 4, by + bt - 1 + (bt < 9 ? 1 : 0));
      });
    });
  });
}

// The score histogram of the review card: bars coloured by who decides, the band edges dashed.
function drawReview(canvas, hist, band) {
  const { ctx, w, h, t } = prepare(canvas);
  ctx.fillStyle = t.plot; ctx.fillRect(0, 0, w, h);
  const m = { l: 44, r: 12, t: 24, b: 38 };
  const pw = Math.max(40, w - m.l - m.r), ph = Math.max(40, h - m.t - m.b);
  const max = Math.max(1, ...hist.map(b => b.count));
  const X = v => m.l + v * pw, Y = c => m.t + ph - (c / max) * ph;
  ctx.strokeStyle = t.grid; ctx.fillStyle = t.muted; ctx.lineWidth = 1; ctx.font = '11px system-ui, sans-serif';
  ctx.beginPath();
  for (const c of [0, max / 2, max]) { ctx.moveTo(m.l, Y(c)); ctx.lineTo(w - m.r, Y(c)); ctx.textAlign = 'right'; ctx.fillText(fmt(Math.round(c)), m.l - 6, Y(c) + 4); }
  ctx.stroke();
  const color = zone => (zone === 'review' ? t.accent : zone === 'no' ? clusterColor(0) : clusterColor(2));
  hist.forEach(b => {
    ctx.fillStyle = color(b.zone); ctx.globalAlpha = b.zone === 'review' ? 0.95 : 0.55;
    ctx.fillRect(X(b.lo) + 1, Y(b.count), Math.max(1, X(b.hi) - X(b.lo) - 2), Y(0) - Y(b.count));
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = t.muted; ctx.textAlign = 'center';
  for (const v of [0, 0.25, 0.5, 0.75, 1]) ctx.fillText(fmt(v, { digits: 2 }), X(v), h - m.b + 15);
  ctx.fillText(tr('Score (predicted probability of positive)', 'Skor (probabilitas prediksi positif)'), m.l + pw / 2, h - 5);
  ctx.save(); ctx.translate(11, m.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(tr('Cases', 'Kasus'), 0, 0); ctx.restore();
  const empty = band.low > band.high;
  // Each zone is named in full when it fits and by one short word when it does not (so a phone still names all three).
  const no = [tr('Machine: no', 'Mesin: tidak'), tr('No', 'Tidak')], person = [tr('Person decides', 'Orang memutuskan'), tr('Review', 'Tinjau')], yes = [tr('Machine: yes', 'Mesin: ya'), tr('Yes', 'Ya')];
  const zones = empty ? [[0, 0.5, ...no], [0.5, 1, ...yes]] : [[0, band.low, ...no], [band.low, band.high, ...person], [band.high, 1, ...yes]];
  ctx.font = '600 11.5px system-ui, sans-serif'; ctx.fillStyle = t.ink;
  for (const [a, b, full, short] of zones) {
    const room = (b - a) * pw - 6;
    const text = ctx.measureText(full).width < room ? full : ctx.measureText(short).width < room ? short : '';
    if (text) { ctx.textAlign = 'center'; ctx.fillText(text, X((a + b) / 2), m.t - 8); }
  }
  if (!empty) {
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = t.ink; ctx.lineWidth = 1.5; ctx.beginPath();
    for (const v of [band.low, band.high]) { ctx.moveTo(X(v), m.t - 2); ctx.lineTo(X(v), m.t + ph); }
    ctx.stroke(); ctx.restore();
  }
}

// ---- DOM helpers -------------------------------------------------------------------------------------------------

function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'text') e.textContent = v; else if (k === 'class') e.className = v; else e.setAttribute(k, v === true ? '' : v);
  }
  e.append(...kids.flat().filter(c => c != null && c !== false));
  return e;
}
// The Close button of an opened panel (shown only when the panel floats over the lab in fullscreen).
const closeButton = () => {
  const b = h('button', { type: 'button', class: 'btn rl-close', text: tr('Close', 'Tutup') });
  b.addEventListener('click', () => b.closest('details').dispatchEvent(new Event('rl-close')));
  return b;
};
let uid = 0;
const nextId = p => `${p}-${++uid}`;

const STYLE = `
.rl-note{margin:8px 0 0}
.rl-table{width:100%;margin-top:8px;border-collapse:collapse;font-size:13px}
.rl-table th,.rl-table td{padding:6px 8px;text-align:right;border-bottom:1px solid var(--line);white-space:normal;font-variant-numeric:tabular-nums}
.rl-table th:first-child,.rl-table td:first-child{text-align:left;font-weight:650}
.rl-table thead th{font-size:12px;color:var(--muted);font-weight:700}
.rl-table .up{color:var(--ink);font-weight:750}
.rl-rows{display:block;margin:10px 0 0}
.rl-rows div{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:3px 0;border:0;border-radius:0;background:none;border-bottom:1px solid var(--line)}
.rl-rows dt{font-size:12px;font-weight:600;color:var(--ink)}
.rl-rows dd{margin:0;font-size:13.5px;text-align:right}
.rl-tight{padding:14px 20px 12px !important}
.rl-tight .hint{margin-top:2px}
.rl-details{margin-top:4px}
.rl-details>summary{cursor:pointer;font-weight:700;font-size:14px;padding:4px 0}
.rl-sum{margin:2px 0 0;font-size:13px;color:var(--muted)}
.rl-controls .panel{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px 16px;align-items:end;margin-top:8px}
.rl-controls .panel>p.hint,.rl-controls .panel>.button-group{grid-column:1/-1;margin:0}
.rl-controls label{display:block;font-size:13px;font-weight:650}
.rl-controls label.toggle{display:flex;align-items:center;gap:6px}
.rl-controls div.slider-label{font-size:13px;font-weight:650}.rl-controls div.slider-label label{display:inline;margin:0}
.rl-fields label{display:block;margin-top:10px;font-size:13px;font-weight:700}
.rl-fields textarea{display:block;width:100%;margin-top:4px;padding:8px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;font-size:13px;min-height:64px;resize:vertical;box-sizing:border-box}
.rl-controls .panel-button{width:100%;min-height:36px;padding:6px 12px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;font-weight:700;font-size:13px;cursor:pointer}
.rl-controls .panel-button:hover{background:var(--surface-2)}
.rl-controls .button-group{display:block}
.rl-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center}
.rl-actions .btn{min-height:36px}
.rl-split{display:flex;flex-wrap:wrap;gap:12px 16px;align-items:stretch}
.rl-split .chart{flex:1 1 280px;min-width:0}
.rl-split .rl-rows{flex:1 1 220px;margin:0;align-self:center}
.rl-pop-title,.rl-close{display:none}
.rl-pop-title{margin:0 0 6px;font-size:16px}
@media (min-width:1100px){
  /* Fullscreen: the review readouts stand beside the chart, and an opened panel is a dialog over the lab, scrolling inside itself. */
  .lab-stage:is(:fullscreen,.expanded) [data-lab-card=side] .rl-split{flex:1 1 auto;min-height:200px;flex-wrap:nowrap}
  .lab-stage:is(:fullscreen,.expanded) .rl-split .rl-rows{flex:0 0 270px}
  .lab-stage:is(:fullscreen,.expanded) .rl-pop[open]::before{content:"";position:fixed;inset:0;z-index:29;background:rgba(10,12,24,.45)}
  .lab-stage:is(:fullscreen,.expanded) .rl-pop[open]>.rl-body{position:fixed;z-index:30;left:50%;top:50%;transform:translate(-50%,-50%);box-sizing:border-box;width:min(780px,calc(100vw - 48px));max-height:calc(100dvh - 48px);overflow:auto;padding:18px 22px;background:var(--surface);color:var(--ink);border:1px solid var(--line-strong);border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.4)}
  .lab-stage:is(:fullscreen,.expanded) .rl-pop[open] .rl-pop-title{display:block}
  .lab-stage:is(:fullscreen,.expanded) .rl-pop[open] .rl-close{display:inline-flex;align-items:center;justify-content:center}
}
@media (max-width:860px){[data-ref=plot]{min-height:400px}}
@media (max-width:640px){.rl-controls label.toggle,.rl-details>summary{min-height:44px;box-sizing:border-box}.rl-details>summary{padding:12px 0}.rl-controls label.toggle{padding:4px 0}}
@media (max-width:640px){.rl-table{font-size:12px}.rl-table th,.rl-table td{padding:5px 4px}}
`;

// ---- the lab -----------------------------------------------------------------------------------------------------

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Stress-test a model across groups', 'Uji stres model pada tiap kelompok'),
    hint: tr(
      'Light bars: the clean test rows. Solid bars: the same rows after the stress. The model never sees which group a row belongs to.',
      'Batang terang: baris test yang bersih. Batang penuh: baris yang sama setelah stres. Model tidak pernah melihat kelompok asal sebuah baris.'),
    status: true, legend: true, canvasLabel: tr('Bar chart of accuracy, recall and false-positive rate for each group, before and after the stress', 'Diagram batang accuracy, recall, dan false-positive rate tiap kelompok, sebelum dan sesudah stres'),
  });
  lab.canvas.setAttribute('role', 'img');
  lab.canvas.removeAttribute('tabindex');
  const legendHost = lab.ref('legend');
  if (legendHost) legendHost.style.maxHeight = 'none';
  const style = document.createElement('style');
  style.textContent = STYLE;
  lab.root.prepend(style);
  const below = lab.ref('below');

  // ---- cards beside the plot, in the order the layout rule places them ----
  // 1. fairness gaps (a table)
  const gapCard = h('section', { class: 'card table-card rl-tight' },
    h('h2', { class: 'lab-h', text: tr('Fairness gaps before and after the stress', 'Selisih fairness sebelum dan sesudah stres') }),
    h('p', { class: 'hint', text: tr('Gap = largest value minus smallest across groups. ▲ grew under the stress, ▼ shrank.', 'Selisih = nilai terbesar dikurangi terkecil antar kelompok. ▲ melebar di bawah stres, ▼ menyempit.') }),
    h('div', { class: 'table-scroll' }, h('table', { class: 'rl-table' })));
  below.append(gapCard);
  const gapTable = gapCard.querySelector('table');

  // 2. calibration by group (a chart)
  const calCanvas = lab.chartCard(
    tr('Calibration by group', 'Kalibrasi menurut kelompok'),
    tr('Near the dashed line = well calibrated. Under the stress; the % is the calibration error (ECE).', 'Dekat garis putus-putus = terkalibrasi baik. Di bawah stres; % adalah calibration error (ECE).'),
    230);

  calCanvas.closest('section').classList.add('rl-tight');
  // 3. human review (a chart; the readouts are in the Parameters box)
  const revCanvas = lab.chartCard(
    tr('Human review band', 'Rentang tinjauan manusia'),
    tr('The machine decides outside the band, a person inside it. Scores are those under the stress.', 'Mesin memutuskan di luar rentang, seseorang di dalamnya. Skor yang dipakai adalah skor di bawah stres.'),
    230);
  revCanvas.closest('section').classList.add('rl-tight');
  // The five review readouts sit beside the chart, in its card (the two review sliders stay in the Parameters box).
  const revStats = h('dl', { class: 'rl-rows', 'aria-label': tr('Review band results', 'Hasil rentang tinjauan') });
  const revChart = revCanvas.closest('.chart');
  const revSplit = h('div', { class: 'rl-split' });
  revChart.before(revSplit);
  revSplit.append(revChart, revStats);

  // 4. privacy (a table card with its own controls)
  const privSummary = h('p', { class: 'rl-sum', role: 'status' });
  const privControls = h('div', { class: 'rl-controls' });
  const kTable = h('table', { class: 'rl-table' });
  const smallList = h('p', { class: 'hint rl-note' });
  const noiseTable = h('table', { class: 'rl-table' });
  const privCard = h('section', { class: 'card table-card rl-tight' },
    h('h2', { class: 'lab-h', text: tr('Privacy: k-anonymity and a noisy count', 'Privasi: k-anonymity dan count ber-noise') }),
    privSummary,
    h('details', { class: 'rl-details rl-pop' },
      h('summary', { text: tr('Open the privacy panel', 'Buka panel privasi') }),
      h('div', { class: 'rl-body' },
      h('h3', { class: 'rl-pop-title', text: tr('Privacy: k-anonymity and a noisy count', 'Privasi: k-anonymity dan count ber-noise') }),
      h('p', { class: 'hint', text: tr('A made-up directory of people (age, postcode, sex, job) with as many rows as the test set. It is not connected to the model\'s inputs. Fields that can single someone out when combined are quasi-identifiers: pick them, then coarsen them until every group has at least k people.', 'Direktori orang buatan (usia, kode pos, jenis kelamin, jabatan) dengan jumlah baris yang sama dengan test set. Direktori ini tidak terhubung dengan input model. Kolom yang bila digabung dapat menunjuk satu orang disebut quasi-identifier: pilih kolomnya, lalu kasarkan sampai tiap kelompok punya minimal k orang.') }),
      privControls,
      h('div', { class: 'table-scroll' }, kTable),
      smallList,
      h('div', { class: 'table-scroll' }, noiseTable),
      closeButton())));
  below.append(privCard);

  // 5. model card (a table card with text fields)
  const cardStatus = h('p', { class: 'rl-sum', role: 'status' });
  const fieldBox = h('div', { class: 'rl-fields' });
  const cardSummary = h('p', { class: 'rl-sum' });
  const copyBtn = h('button', { type: 'button', class: 'btn primary', text: tr('Copy model card', 'Salin model card') });
  const refillBtn = h('button', { type: 'button', class: 'btn', text: tr('Refill from the lab', 'Isi ulang dari lab') });
  const cardCard = h('section', { class: 'card table-card rl-tight' },
    h('h2', { class: 'lab-h', text: tr('Model card', 'Model card') }),
    cardSummary,
    h('details', { class: 'rl-details rl-pop' },
      h('summary', { text: tr('Open the model card fields', 'Buka kolom model card') }),
      h('div', { class: 'rl-body' },
      h('h3', { class: 'rl-pop-title', text: tr('Model card', 'Model card') }),
      h('p', { class: 'hint', text: tr('Each field starts with what the lab measured. Edit it in your own words; a field you edit is no longer overwritten. "Refill from the lab" restores the measured text. The copied card also holds the robustness, fairness and privacy numbers.', 'Setiap kolom diawali dengan apa yang diukur lab. Ubah dengan kata-katamu sendiri; kolom yang sudah kamu ubah tidak lagi ditimpa. "Isi ulang dari lab" mengembalikan teks hasil pengukuran. Kartu yang disalin juga memuat angka robustness, fairness, dan privasi.') }),
      fieldBox,
      h('div', { class: 'rl-actions' }, copyBtn, refillBtn, closeButton()),
      cardStatus)));
  below.append(cardCard);
  // In fullscreen an opened panel is a dialog over the lab (the boxes beside the plot have no spare height); the Close button,
  // a click outside it and Escape shut it. On the normal page the panel opens in place and the Close button is hidden.
  for (const details of root.querySelectorAll('.rl-pop')) {
    const shut = () => { details.open = false; details.querySelector('summary').focus(); };
    const floating = () => getComputedStyle(details.querySelector('.rl-body')).position === 'fixed';
    details.addEventListener('click', e => { if (e.target === details && floating()) shut(); }, { signal: lab.signal });
    details.addEventListener('keydown', e => { if (e.key === 'Escape' && details.open && floating()) { e.preventDefault(); e.stopPropagation(); shut(); } }, { signal: lab.signal });
    details.addEventListener('rl-close', shut, { signal: lab.signal });
    // Only one floating panel at a time.
    details.addEventListener('toggle', () => { if (details.open && floating()) for (const o of root.querySelectorAll('.rl-pop[open]')) if (o !== details) o.open = false; }, { signal: lab.signal });
  }

  // ---- state ----
  let mode = 'generated', seed = DEFAULTS.seed, real = null, loading = false, loadFailed = false, loadToken = 0, destroyed = false;
  let data = null;        // { sets, model, directory, realMode }
  let view = null;        // the latest computed view
  const dirty = new Set();
  const areas = {};

  let controls = null;   // the strength readout reads the stress type, and the panel formats its sliders while it is built
  controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real)', 'Penguin (data nyata)')]] }),
    { name: 'kind', type: 'select', label: tr('Stress type', 'Jenis stres'), value: DEFAULTS.kind, options: STRESS_KINDS.map(k => [k, kindName(k)]) },
    { name: 'strength', type: 'range', label: tr('Stress strength', 'Kekuatan stres'), min: 0, max: 1, step: 0.05, value: DEFAULTS.strength, format: v => strengthShort(controls ? controls.get('kind') : DEFAULTS.kind, v) },
    { name: 'threshold', type: 'range', label: tr('Threshold', 'Threshold'), min: 0.05, max: 0.95, step: 0.01, value: DEFAULTS.threshold, format: v => fmt(v, { digits: 2 }) },
    { name: 'perGroup', type: 'toggle', label: tr('A different threshold for each group', 'Threshold berbeda untuk tiap kelompok'), value: DEFAULTS.perGroup },
    { name: 'goal', type: 'select', label: tr('Match across groups', 'Samakan antar kelompok'), value: DEFAULTS.goal, options: [['equalOpportunity', tr('Recall (equal opportunity)', 'Recall (equal opportunity)')], ['demographicParity', tr('Selection rate (demographic parity)', 'Selection rate (demographic parity)')]] },
    { name: 'low', type: 'range', label: tr('Review band: lower threshold', 'Rentang tinjauan: threshold bawah'), min: 0, max: 1, step: 0.01, value: DEFAULTS.low, format: v => fmt(v, { digits: 2 }) },
    { name: 'high', type: 'range', label: tr('Review band: upper threshold', 'Rentang tinjauan: threshold atas'), min: 0, max: 1, step: 0.01, value: DEFAULTS.high, format: v => fmt(v, { digits: 2 }) },
    { name: 'newSample', type: 'button', label: tr('New sample', 'Sampel baru'), onClick: () => { seed += 1; rebuild(); } },
  ], name => {
    if (name === 'data') { setMode(controls.get('data')); return; }
    if (name === 'kind') controls.set('strength', controls.get('strength'));   // the readout beside the slider changes with the kind
    // The two review thresholds keep their order: moving one past the other drags the other along.
    if (name === 'low' && controls.get('low') > controls.get('high')) controls.set('high', controls.get('low'));
    if (name === 'high' && controls.get('high') < controls.get('low')) controls.set('low', controls.get('high'));
    refresh();
  });
  const dataShort = h('p', { class: 'hint', role: 'status' });
  const dataNote = h('p', { class: 'hint' });
  const dataDetails = h('details', { class: 'rl-details' }, h('summary', { text: tr('About this data', 'Tentang data ini') }), dataNote);
  controls.el.querySelector('select').closest('label').after(dataShort, dataDetails);
  const stressNote = h('p', { class: 'hint' });
  controls.el.querySelector('input[type=range]').closest('.slider-label').after(stressNote);
  const showMode = () => controls.show('goal', controls.get('perGroup'));

  // privacy controls (the kit panel, inside the privacy card)
  const priv = panel(privControls, [
    { type: 'note', text: tr('Quasi-identifiers (the fields an outsider could combine):', 'Quasi-identifier (kolom yang dapat digabungkan orang luar):') },
    { name: 'age', type: 'toggle', label: tr('Age', 'Usia'), value: DEFAULTS.fields.includes('age') },
    { name: 'postcode', type: 'toggle', label: tr('Postcode', 'Kode pos'), value: DEFAULTS.fields.includes('postcode') },
    { name: 'sex', type: 'toggle', label: tr('Sex', 'Jenis kelamin'), value: DEFAULTS.fields.includes('sex') },
    { name: 'job', type: 'toggle', label: tr('Job title', 'Jabatan'), value: DEFAULTS.fields.includes('job') },
    { name: 'ageBin', type: 'range', label: tr('Age bin size (years)', 'Lebar rentang usia (tahun)'), min: 1, max: 20, step: 1, value: DEFAULTS.ageBin, format: v => (v <= 1 ? tr('exact', 'tepat') : tr(`${fmt(v)} years`, `${fmt(v)} tahun`)) },
    { name: 'digits', type: 'range', label: tr('Postcode digits kept', 'Digit kode pos yang dipertahankan'), min: 1, max: 5, step: 1, value: DEFAULTS.digits, format: v => fmt(v) },
    { name: 'k', type: 'range', label: tr('k: the smallest group allowed', 'k: kelompok terkecil yang diizinkan'), min: 2, max: 20, step: 1, value: DEFAULTS.k, format: v => fmt(v) },
    { name: 'epsilon', type: 'range', label: tr('Privacy budget ε (epsilon)', 'Anggaran privasi ε (epsilon)'), min: 0.05, max: 5, step: 0.05, value: DEFAULTS.epsilon, format: v => fmt(v, { digits: 2 }) },
    { name: 'redraw', type: 'button', label: tr('Draw new noise', 'Tarik noise baru'), onClick: () => { noiseDraw += 1; refresh(); } },
  ], () => refresh());
  let noiseDraw = 0;
  const privValues = () => {
    const v = priv.values();
    return { fields: ['age', 'postcode', 'sex', 'job'].filter(f => v[f]), ageBin: v.ageBin, digits: v.digits, k: v.k, epsilon: v.epsilon };
  };

  // model card fields
  const FIELD_DEFS = [
    ['purpose', tr('Intended use', 'Tujuan penggunaan')],
    ['data', tr('Data', 'Data')],
    ['metrics', tr('Metrics by group', 'Metrik per kelompok')],
    ['limits', tr('Known limits', 'Batasan yang diketahui')],
    ['review', tr('Where human review is needed', 'Di mana peninjauan manusia diperlukan')],
  ];
  // A field grows to show all of its text (nothing to scroll inside a box); measured once the details are open.
  const fit = ta => { if (!ta.scrollHeight) return; ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight + 2}px`; };
  cardCard.querySelector('details').addEventListener('toggle', () => Object.values(areas).forEach(fit), { signal: lab.signal });
  for (const [key, label] of FIELD_DEFS) {
    const id = nextId('rl-field');
    const ta = h('textarea', { id, rows: key === 'metrics' ? '5' : '3', maxlength: '1500' });
    ta.addEventListener('input', () => { dirty.add(key); fit(ta); renderCardSummary(); });
    areas[key] = ta;
    fieldBox.append(h('label', { for: id, text: label }), ta);
  }
  refillBtn.addEventListener('click', () => { dirty.clear(); fillFields(); cardStatus.textContent = tr('Fields refilled with what the lab measured.', 'Kolom diisi ulang dengan hasil pengukuran lab.'); });

  const box = predictBox(below, {
    name: 'predict-groups',
    question: tr('The model never sees the group column. Will the error rates still differ between groups?', 'Model tidak pernah melihat kolom kelompok. Apakah tingkat galatnya tetap berbeda antar kelompok?'),
    hint: tr('Wait for the data to load, then check again.', 'Tunggu data selesai dimuat, lalu periksa lagi.'),
    choices: [
      ['differ', tr('Yes, already on the clean data (a gap of 5 points or more)', 'Ya, sudah pada data bersih (selisih 5 poin atau lebih)')],
      ['stress', tr('Only once the data is stressed', 'Hanya setelah data diberi stres')],
      ['same', tr('No, they stay about the same', 'Tidak, tetap hampir sama')],
    ],
  });
  lab.cleanup(() => box.destroy());
  box.onCheck(() => revealPredict());

  // ---- data ----
  function rebuild() {
    if (loading) return;
    const realMode = mode === 'penguins' && real;
    const sets = realMode ? penguinSets(real, seed) : generatedSets(seed);
    data = { sets, model: fitModel(sets), directory: makeDirectory(sets.test.X.length, seed), realMode: Boolean(realMode) };
    refresh();
  }
  async function setMode(next) {
    const token = ++loadToken;
    loadFailed = false;
    if (next === 'generated') { mode = 'generated'; loading = false; rebuild(); return; }
    loading = true; mode = next; draw();
    try {
      const table = await loadDataset(next);
      if (destroyed || token !== loadToken) return;
      real = table; loading = false;
    } catch {
      if (destroyed || token !== loadToken) return;
      loading = false; loadFailed = true; mode = 'generated';
      controls.set('data', 'generated');
    }
    rebuild();
  }

  // ---- compute and draw ----
  function compute() {
    const v = controls.values();
    const params = { kind: v.kind, strength: v.strength, threshold: v.threshold, perGroup: v.perGroup, goal: v.goal, low: v.low, high: v.high, ...privValues() };
    const ev = evaluate(data.sets, data.model, { kind: v.kind, strength: v.strength, threshold: v.threshold, perGroup: v.perGroup, goal: v.goal, seed: STRESS_SEED });
    const names = data.sets.groups;
    const review = reviewBand({ scores: ev.scoresAfter, labels: data.sets.test.y, low: v.low, high: v.high });
    const privacy = privacyView(data.directory, { fields: params.fields, ageBin: params.ageBin, digits: params.digits, k: params.k });
    // The released counts: everyone the model flags positive on the clean rows, and the same in the smallest group.
    const small = ev.before.groups.slice().sort((a, b) => a.size - b.size)[0];
    const counts = [ev.before.overall.tp + ev.before.overall.fp, small.tp + small.fp];
    const noisy = noisyCounts(counts, params.epsilon, seed * 10 + noiseDraw);
    return { params, ev, names, review, privacy, noisy, small, counts, real: data.realMode, sets: data.sets, directoryN: data.directory.length };
  }

  function refresh() {
    if (loading || !data) { draw(); return; }
    showMode();
    view = compute();
    draw();
    if (box.answered) revealPredict();
  }

  function draw() {
    if (loading || !data || !view) {
      lab.setStatus(tr('Loading the penguin data…', 'Memuat data penguin…'));
      drawMain(lab.canvas, null, [], g => g);
      return;
    }
    const { params, ev, names, review, privacy, noisy, small, real: isReal, sets } = view;
    const gn = g => groupName(g, isReal);
    const labels = names.map(gn);
    drawMain(lab.canvas, ev, names, gn);

    // status
    const stress = params.strength > 0;
    const head = stress
      ? tr(`Under ${kindName(params.kind).toLowerCase()} (${strengthShort(params.kind, params.strength)}) accuracy goes from ${p0(ev.before.overall.accuracy)} to ${p0(ev.after.overall.accuracy)}; ${gn(ev.worstGroup)} loses most (${ptsWord(ev.drop.byGroup[ev.worstGroup])}).`, `Di bawah ${kindName(params.kind).toLowerCase()} (${strengthShort(params.kind, params.strength)}) accuracy turun dari ${p0(ev.before.overall.accuracy)} menjadi ${p0(ev.after.overall.accuracy)}; ${gn(ev.worstGroup)} paling banyak kehilangan (${ptsWord(ev.drop.byGroup[ev.worstGroup])}).`)
      : tr(`No stress: accuracy is ${p0(ev.before.overall.accuracy)} overall, from ${p0(Math.min(...ev.before.groups.map(g => g.accuracy)))} to ${p0(Math.max(...ev.before.groups.map(g => g.accuracy)))} across the groups.`, `Tanpa stres: accuracy ${p0(ev.before.overall.accuracy)} secara keseluruhan, dari ${p0(Math.min(...ev.before.groups.map(g => g.accuracy)))} sampai ${p0(Math.max(...ev.before.groups.map(g => g.accuracy)))} di antara kelompok.`);
    const eo = gapRows(ev.before, ev.after)[0];
    const tail = eo.after === null ? '' : tr(` The recall gap goes from ${pts(eo.before)} to ${pts(eo.after)} points.`, ` Selisih recall berubah dari ${pts(eo.before)} menjadi ${pts(eo.after)} poin.`);
    lab.setStatus(head + tail);
    lab.setDetail(typeof ev.thresholds === 'number'
      ? tr(`One threshold, ${cutText(ev.thresholds)}, for every group.`, `Satu threshold, ${cutText(ev.thresholds)}, untuk semua kelompok.`)
      : tr(`A threshold per group, tuned to match ${goalName(params.goal)}: ${names.map(g => `${g} ${cutText(ev.thresholds[g])}`).join(', ')}.`, `Threshold per kelompok, disetel agar ${goalName(params.goal)} sama: ${names.map(g => `${g} ${cutText(ev.thresholds[g])}`).join(', ')}.`));
    lab.setMetrics(tr(`${fmt(sets.train.X.length)} train rows, ${fmt(sets.test.X.length)} test rows`, `${fmt(sets.train.X.length)} baris train, ${fmt(sets.test.X.length)} baris test`));
    lab.setLegend([
      ...names.map((g, i) => ({ kind: 'dot', color: clusterColor(i), label: gn(g) })),
      { kind: 'ring', color: theme().muted, label: tr('Before the stress (outline)', 'Sebelum stres (garis tepi)') },
      { kind: 'dot', color: theme().muted, label: tr('After the stress (solid)', 'Setelah stres (penuh)') },
    ]);
    stressNote.textContent = strengthSentence(params.kind, params.strength, isReal);
    dataShort.textContent = loadFailed
      ? tr('Could not load the penguin data, so the generated data is shown.', 'Data penguin tidak bisa dimuat, jadi data buatan yang ditampilkan.')
      : isReal
        ? tr(`Real penguins: ${fmt(sets.kept)} of ${fmt(sets.total)} rows used; ${fmt(sets.dropped)} with a missing value (NA) are left out. Groups: the species.`, `Penguin nyata: ${fmt(sets.kept)} dari ${fmt(sets.total)} baris dipakai; ${fmt(sets.dropped)} baris dengan missing value (NA) dibuang. Kelompok: spesiesnya.`)
        : tr('Generated applicants (seeded). Groups A, B and C; the model never sees the group.', 'Pelamar buatan (memakai seed). Kelompok A, B, dan C; model tidak pernah melihat kelompoknya.');
    dataNote.textContent = loadFailed
      ? tr('Could not load the penguin data, so the generated data is shown.', 'Data penguin tidak bisa dimuat, jadi data buatan yang ditampilkan.')
      : isReal
        ? tr(`Real penguins: ${fmt(sets.kept)} of ${fmt(sets.total)} rows are used; ${fmt(sets.dropped)} rows with a missing value (NA) are left out. The task: is the penguin male (the positive class), from bill length, flipper length and body mass. The groups are the species, and the model never sees them. Per-group thresholds are tuned on the training rows. Penguins are not people: this only shows the mechanics.`, `Penguin nyata: ${fmt(sets.kept)} dari ${fmt(sets.total)} baris dipakai; ${fmt(sets.dropped)} baris dengan missing value (NA) dibuang. Tugasnya: apakah penguin itu jantan (kelas positif), dari panjang paruh, panjang sirip, dan massa tubuh. Kelompoknya adalah spesies, dan model tidak pernah melihatnya. Threshold per kelompok disetel pada baris training. Penguin bukan manusia: ini hanya memperlihatkan mekanismenya.`)
        : tr('Generated applicants (seeded, so everyone sees the same ones): skill, experience and a postcode score, in groups A (50%), B (30%) and C (20%) with different base rates and noise. The model never sees the group, but the postcode moves with it. Per-group thresholds are tuned on a separate validation sample.', 'Pelamar buatan (memakai seed, jadi semua orang melihat yang sama): skill, pengalaman, dan skor kode pos, dalam kelompok A (50%), B (30%), dan C (20%) dengan base rate dan noise berbeda. Model tidak pernah melihat kelompoknya, tetapi kode pos ikut bergerak bersamanya. Threshold per kelompok disetel pada sampel validasi yang terpisah.');

    drawGaps(ev);
    drawCalibration(view, labels);
    drawReviewCard(view);
    drawPrivacy(view);
    fillFields();
    lab.describe(lab.canvas, describeMain(view, gn));
  }

  function describeMain(v, gn) {
    const { ev, names } = v;
    const rows = names.map(g => tr(
      `${gn(g)}: accuracy ${p0(ev.before.byGroup[g].accuracy)} to ${p0(ev.after.byGroup[g].accuracy)}, recall ${p0(ev.before.byGroup[g].tpr)} to ${p0(ev.after.byGroup[g].tpr)}, false-positive rate ${p0(ev.before.byGroup[g].fpr)} to ${p0(ev.after.byGroup[g].fpr)}`,
      `${gn(g)}: accuracy ${p0(ev.before.byGroup[g].accuracy)} menjadi ${p0(ev.after.byGroup[g].accuracy)}, recall ${p0(ev.before.byGroup[g].tpr)} menjadi ${p0(ev.after.byGroup[g].tpr)}, false-positive rate ${p0(ev.before.byGroup[g].fpr)} menjadi ${p0(ev.after.byGroup[g].fpr)}`));
    return tr(`Before the stress to after it, by group. ${rows.join('; ')}.`, `Dari sebelum sampai sesudah stres, per kelompok. ${rows.join('; ')}.`);
  }

  function drawGaps(ev) {
    const rows = gapRows(ev.before, ev.after);
    gapTable.replaceChildren(
      h('thead', {}, h('tr', {},
        h('th', { scope: 'col', text: tr('Gap', 'Selisih') }), h('th', { scope: 'col', text: tr('Before (points)', 'Sebelum (poin)') }),
        h('th', { scope: 'col', text: tr('After (points)', 'Sesudah (poin)') }), h('th', { scope: 'col', text: tr('Change (points)', 'Perubahan (poin)') }))),
      h('tbody', {}, rows.map(r => {
        // A change that rounds to 0.0 points at one decimal is printed as 0.0, with no sign and no arrow.
        const flat = r.change !== null && pts(r.change) === '0.0';
        const mark = r.change === null || flat ? '' : r.change > 0 ? '▲ ' : '▼ ';
        const sign = r.change === null || flat ? '' : r.change < 0 ? '−' : '+';
        return h('tr', {},
          h('th', { scope: 'row', text: gapName(r.key) }),
          h('td', { text: r.before === null ? 'n/a' : `${pts(r.before)}` }),
          h('td', { text: r.after === null ? 'n/a' : `${pts(r.after)}` }),
          h('td', { class: r.change !== null && !flat && r.change > 0 ? 'up' : '', text: r.change === null ? 'n/a' : `${mark}${sign}${pts(r.change)}` }));
      })));
  }

  function drawCalibration(v, labels) {
    const { ev, names, sets } = v;
    const curves = calibrationByGroup(ev.scoresAfter, sets.test.y, sets.test.group, names);
    const series = curves.map((c, i) => ({ xs: c.points.map(p => p.x), ys: c.points.map(p => p.y), color: clusterColor(i) }));
    series.unshift({ xs: [0, 1], ys: [0, 1], color: theme().muted, dash: true, points: false });
    const { X, Y } = drawLineChart(calCanvas, { series, xLabel: tr('Predicted probability', 'Probabilitas prediksi'), yLabel: tr('Share actually positive', 'Porsi yang benar-benar positif'), xMin: 0, xMax: 1, yMin: 0, yMax: 1 });
    // The key sits in the empty bottom-right corner of the plot (the curves hug the diagonal).
    const ctx = calCanvas.getContext('2d');
    ctx.save(); ctx.font = '600 11.5px system-ui, sans-serif'; ctx.textAlign = 'right';
    const entries = [...curves.map((c, i) => ({ text: `${labels[i]}: ${c.ece === null ? 'n/a' : p1(c.ece)}`, color: clusterColor(i) })), { text: tr('Perfect calibration', 'Kalibrasi sempurna'), color: theme().muted, dash: true }];
    entries.forEach((e, i) => {
      const y = Y(0.02) - (entries.length - 1 - i) * 15 - 4, x = X(1) - 8, wText = ctx.measureText(e.text).width;
      ctx.fillStyle = e.color; ctx.strokeStyle = e.color; ctx.lineWidth = 2.5;
      if (e.dash) { ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x - wText - 22, y - 4); ctx.lineTo(x - wText - 6, y - 4); ctx.stroke(); ctx.setLineDash([]); } else { ctx.beginPath(); ctx.arc(x - wText - 12, y - 4, 4, 0, 2 * Math.PI); ctx.fill(); }
      ctx.fillStyle = theme().ink; ctx.fillText(e.text, x, y);
    });
    ctx.restore();
    lab.describe(calCanvas, tr(
      `Calibration under the stress. ${curves.map((c, i) => `${labels[i]}: calibration error ${p1(c.ece)}`).join('; ')}.`,
      `Kalibrasi di bawah stres. ${curves.map((c, i) => `${labels[i]}: calibration error ${p1(c.ece)}`).join('; ')}.`));
  }

  function drawReviewCard(v) {
    const { review, ev, params } = v;
    drawReview(revCanvas, scoreHistogram(ev.scoresAfter, { bins: 20, low: params.low, high: params.high }), { low: params.low, high: params.high });
    const stat = (k, val) => h('div', {}, h('dt', { text: k }), h('dd', { text: val }));
    revStats.replaceChildren(
      stat(tr('Automated', 'Otomatis'), p0(review.coverage)),
      stat(tr('Accuracy on the automated part', 'Akurasi pada bagian otomatis'), p0(review.accuracyAutomated)),
      stat(tr('Reviewer workload', 'Beban peninjau'), tr(`${p0(review.workload)} (${fmt(review.reviewed)} cases)`, `${p0(review.workload)} (${fmt(review.reviewed)} kasus)`)),
      stat(tr('Accuracy with a reviewer', 'Akurasi dengan peninjau'), p0(review.accuracyWithReviewer)),
      stat(tr('Accuracy with no review (cut at 0.5)', 'Akurasi tanpa tinjauan (batas 0,5)'), p0(review.accuracyNoReview)));
    lab.describe(revCanvas, tr(
      `Histogram of ${fmt(review.n)} scores under the stress. Between ${fmt(params.low, { digits: 2 })} and ${fmt(params.high, { digits: 2 })} a person decides: ${p0(review.workload)} of the cases. The automated part is ${p0(review.accuracyAutomated)} accurate.`,
      `Histogram ${fmt(review.n)} skor di bawah stres. Di antara ${fmt(params.low, { digits: 2 })} dan ${fmt(params.high, { digits: 2 })} seseorang memutuskan: ${p0(review.workload)} kasus. Bagian otomatisnya ${p0(review.accuracyAutomated)} akurat.`));
  }

  function drawPrivacy(v) {
    const { privacy, params, noisy, small, counts } = v;
    const gn = g => groupName(g, v.real);
    if (!privacy) {
      privSummary.textContent = tr('Pick at least one quasi-identifier to see the report.', 'Pilih minimal satu quasi-identifier untuk melihat laporannya.');
      kTable.replaceChildren(); smallList.textContent = '';
    } else {
      const ok = privacy.minGroupSize >= params.k;
      privSummary.textContent = ok
        ? tr(`Every person is in a group of at least ${fmt(privacy.minGroupSize)}: k = ${fmt(params.k)} is met.`, `Setiap orang berada di kelompok minimal ${fmt(privacy.minGroupSize)}: k = ${fmt(params.k)} terpenuhi.`)
        : tr(`Smallest group: ${fmt(privacy.minGroupSize)} ${privacy.minGroupSize === 1 ? 'person' : 'people'}. ${p0(privacy.shareBelowK)} of the people are in a group smaller than k = ${fmt(params.k)}.`, `Kelompok terkecil: ${fmt(privacy.minGroupSize)} orang. ${p0(privacy.shareBelowK)} orang berada di kelompok yang lebih kecil dari k = ${fmt(params.k)}.`);
      const row = (k, val) => h('tr', {}, h('th', { scope: 'row', text: k }), h('td', { text: val }));
      kTable.replaceChildren(
        h('thead', {}, h('tr', {}, h('th', { scope: 'col', text: tr('k-anonymity report', 'Laporan k-anonymity') }), h('th', { scope: 'col', text: tr('Value', 'Nilai') }))),
        h('tbody', {},
          row(tr('People in the directory', 'Orang dalam direktori'), fmt(privacy.n)),
          row(tr('Groups sharing the same values', 'Kelompok dengan nilai yang sama'), fmt(privacy.groupCount)),
          row(tr('Smallest group (the data\'s own k)', 'Kelompok terkecil (k milik data itu)'), fmt(privacy.minGroupSize)),
          row(tr(`People in a group smaller than k = ${fmt(params.k)}`, `Orang di kelompok yang lebih kecil dari k = ${fmt(params.k)}`), tr(`${fmt(privacy.rowsBelowK)} (${p0(privacy.shareBelowK)})`, `${fmt(privacy.rowsBelowK)} (${p0(privacy.shareBelowK)})`))));
      smallList.textContent = tr(
        `Smallest groups: ${privacy.groups.slice(0, 3).map(g => `${groupKeyText(g.key)} (${fmt(g.size)})`).join('; ')}.`,
        `Kelompok terkecil: ${privacy.groups.slice(0, 3).map(g => `${groupKeyText(g.key)} (${fmt(g.size)})`).join('; ')}.`);
    }
    const nrow = (label, i) => h('tr', {},
      h('th', { scope: 'row', text: label }), h('td', { text: fmt(counts[i]) }), h('td', { text: fmt(Math.round(noisy[i].released)) }),   // a released count is a whole number
      h('td', { text: tr(`±${fmt(noisy[i].scale, { digits: 1 })} (${p0(noisy[i].scale / Math.max(1, counts[i]))})`, `±${fmt(noisy[i].scale, { digits: 1 })} (${p0(noisy[i].scale / Math.max(1, counts[i]))})`) }));
    noiseTable.replaceChildren(
      h('thead', {}, h('tr', {},
        h('th', { scope: 'col', text: tr(`Count released with ε = ${fmt(params.epsilon, { digits: 2 })}`, `Count yang dirilis dengan ε = ${fmt(params.epsilon, { digits: 2 })}`) }),
        h('th', { scope: 'col', text: tr('True', 'Sebenarnya') }), h('th', { scope: 'col', text: tr('Released (rounded)', 'Dirilis (dibulatkan)') }),
        h('th', { scope: 'col', text: tr('Typical error', 'Galat tipikal') }))),
      h('tbody', {},
        nrow(tr('Cases flagged positive, all groups', 'Kasus yang ditandai positif, semua kelompok'), 0),
        nrow(tr(`Cases flagged positive, ${gn(small.group)}`, `Kasus yang ditandai positif, ${gn(small.group)}`), 1)));
  }

  // ---- model card ----
  function fillFields() {
    if (!view) return;
    const { fields } = cardContent(view);
    for (const [key] of FIELD_DEFS) if (!dirty.has(key)) { areas[key].value = fields[key]; fit(areas[key]); }
    renderCardSummary();
  }
  function renderCardSummary() {
    const filled = FIELD_DEFS.filter(([k]) => areas[k].value.trim()).length;
    cardSummary.textContent = tr(`${fmt(filled)} of ${fmt(FIELD_DEFS.length)} fields filled in; ${fmt(dirty.size)} edited by you.`, `${fmt(filled)} dari ${fmt(FIELD_DEFS.length)} kolom terisi; ${fmt(dirty.size)} kamu ubah sendiri.`);
  }
  function cardString() {
    const { auto } = cardContent(view);
    const lines = key => areas[key].value.split('\n');
    return cardText({
      title: view.real ? tr('MODEL CARD: Penguin sex model (logistic regression)', 'MODEL CARD: Model jenis kelamin penguin (regresi logistik)') : tr('MODEL CARD: Applicant model (logistic regression)', 'MODEL CARD: Model pelamar (regresi logistik)'),
      notFilled: tr('(not filled in)', '(belum diisi)'), missingLabel: tr('Missing', 'Belum terisi'),
      sections: [
        { title: tr('Intended use', 'Tujuan penggunaan'), lines: lines('purpose') },
        { title: tr('Data', 'Data'), lines: lines('data') },
        { title: tr('Metrics by group', 'Metrik per kelompok'), lines: lines('metrics') },
        { title: tr('Robustness under stress', 'Ketahanan di bawah stres'), lines: auto.robustness },
        { title: tr('Fairness', 'Fairness'), lines: auto.fairness },
        { title: tr('Privacy', 'Privasi'), lines: auto.privacy },
        { title: tr('Known limits', 'Batasan yang diketahui'), lines: lines('limits') },
        { title: tr('Where human review is needed', 'Di mana peninjauan manusia diperlukan'), lines: lines('review') },
      ],
    });
  }
  copyBtn.addEventListener('click', async () => {
    if (!view) return;
    const text = cardString();
    try { await navigator.clipboard.writeText(text); cardStatus.textContent = tr('Model card copied.', 'Model card disalin.'); } catch {
      const ta = h('textarea', { readonly: true, 'aria-hidden': 'true', tabindex: '-1', style: 'position:fixed;left:-9999px;top:0' });
      ta.value = text; document.body.append(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
      cardStatus.textContent = ok ? tr('Model card copied.', 'Model card disalin.') : tr('Could not copy automatically. Select the fields and copy them yourself.', 'Tidak bisa menyalin otomatis. Pilih kolomnya dan salin sendiri.');
    }
  });

  // ---- the predict-first question ----
  function revealPredict() {
    if (!view) return;
    const { ev, real: isReal } = view;
    const dB = differs(ev.before, TOLERANCE), dA = differs(ev.after, TOLERANCE);
    const key = dB.differs ? 'differ' : dA.differs ? 'stress' : 'same';
    const accs = ev.before.groups.filter(g => g.accuracy !== null).slice().sort((a, b) => a.accuracy - b.accuracy);
    const lo = accs[0], hi = accs[accs.length - 1];
    const gn = g => groupName(g, isReal);
    const why = isReal
      ? tr('The species differ in size, so one size rule fits them unequally.', 'Spesies berbeda ukuran, jadi satu aturan ukuran cocok untuk mereka secara tidak setara.')
      : tr('The group is not an input, but the postcode moves with it and the groups differ in base rate and in how noisy their features are.', 'Kelompok bukan input, tetapi kode pos ikut bergerak bersamanya dan kelompok berbeda dalam base rate serta tingkat noise fiturnya.');
    box.reveal(key, tr(
      `On the clean test rows accuracy runs from ${p0(lo.accuracy)} (${gn(lo.group)}) to ${p0(hi.accuracy)} (${gn(hi.group)}); recall differs by ${ptsWord(dB.gaps.tpr)} and the false-positive rate by ${ptsWord(dB.gaps.fpr)}. ${why}`,
      `Pada baris test yang bersih accuracy berkisar dari ${p0(lo.accuracy)} (${gn(lo.group)}) sampai ${p0(hi.accuracy)} (${gn(hi.group)}); recall berbeda ${ptsWord(dB.gaps.tpr)} dan false-positive rate berbeda ${ptsWord(dB.gaps.fpr)}. ${why}`));
  }

  lab.onReset(() => {
    loadToken += 1;
    mode = 'generated'; seed = DEFAULTS.seed; loading = false; loadFailed = false; noiseDraw = 0;
    controls.set('data', 'generated');
    for (const name of ['kind', 'strength', 'threshold', 'perGroup', 'goal', 'low', 'high']) controls.set(name, DEFAULTS[name]);
    for (const f of ['age', 'postcode', 'sex', 'job']) priv.set(f, DEFAULTS.fields.includes(f));
    for (const name of ['ageBin', 'digits', 'k', 'epsilon']) priv.set(name, DEFAULTS[name]);
    dirty.clear();
    cardStatus.textContent = '';
    box.reset();
    rebuild();
  });
  lab.onTheme(draw);
  lab.onResize(() => { draw(); Object.values(areas).forEach(fit); });
  lab.cleanup(() => { destroyed = true; loadToken += 1; });
  rebuild();
  return lab.destroy;
}
