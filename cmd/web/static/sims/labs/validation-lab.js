// Validation lab, built on the kit. The same k-NN model is scored two or three ways on one table:
//   * random k-fold (records of the same person land in training and in the test fold),
//   * grouped k-fold (a whole person is held out together), and
//   * an optional time-ordered split,
// drawn as strip charts of the fold scores with their means and the optimism gap between random and
// grouped. A second chart compares grid search with random search for k and one more setting
// (how much the first feature counts in the distance) under the same budget of evaluations.
//   Generated data: records of many people, each with a persistent personal quirk (sims/ml/validation.js).
//   Penguins (real): islands are the groups (leave-one-island-out), the year column gives the time order;
//   rows with a missing value (NA) are dropped and the lab says how many.
// The math is in ml/validationlab.js (on top of ml/validation.js); this file draws and wires.
import { createLab, panel, dataModeSpec, loadDataset, predictBox, clusterColor, theme, tr, fmt, pct } from '../kit/index.js';
import { drawLineChart } from '../kit/plot2d.js';
import { makeEntityData, entityXY, crossValidate } from '../ml/validation.js';
import {
  knnPredictor, compareSplits, splitVerdict, searchCompare, penguinTable, tablePeek,
} from '../ml/validationlab.js';
import { stackDots, accuracyAxis, accuracyTicks } from '../ml/leakagelab.js';

export const DEFAULTS = {
  people: 40, records: 8, quirk: 2, folds: 5, k: 5, budget: 16, seed: 1, searchSeed: 1, scoredWith: 'grouped', target: 'sex',
};
const K_RANGE = { min: 1, max: 31 };
const WEIGHT_RANGE = { min: 0.25, max: 8 };
const GAP_TOLERANCE = 0.02;   // below two points of accuracy the two splits "score about the same"
const TIE = 0.01;             // best scores of grid and random search within one point: a tie
const FLAT = 0.05;            // every setting within five points: tuning barely matters

const points = d => fmt(d * 100, { digits: 1 });
const signedPoints = d => (Math.abs(d) < 0.0005 ? fmt(0, { digits: 1 }) : (d > 0 ? '' : '−') + fmt(Math.abs(d) * 100, { digits: 1 }));
const weightText = w => fmt(w, { digits: 2 });
const scoreList = cv => cv.scores.map(s => pct(s)).join(', ');
// The gap as the learner can check it on screen: the difference of the two means as they are printed (one decimal).
const round1 = m => Number(new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, useGrouping: false }).format(m * 100));
const shownGap = cmp => (round1(cmp.random.mean) - round1(cmp.grouped.mean)) / 100;

// ---- strip chart -------------------------------------------------------------------------------------

function prepare(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, w: width, h: height, t: theme() };
}

// spec: { lanes: [{ label, scores, mean, sd, color, tags }], baseline, gap: { text } | null }
// Lane i is a header line (name left, mean right) above its dots; the gap bracket sits after the second lane.
function drawStrips(canvas, spec) {
  const { ctx, w, h, t } = prepare(canvas);
  const top = 6, axisH = 38, padL = 14, padR = 14, headH = 26;
  const gapH = spec.gap ? 50 : 0;
  const plotL = padL, plotR = w - padR, plotW = Math.max(40, plotR - plotL);
  const laneH = (h - top - axisH - gapH) / spec.lanes.length;
  const all = spec.lanes.flatMap(l => l.scores).concat(spec.baseline);
  const { lo, hi } = accuracyAxis(all, { zoom: true });
  const X = v => plotL + ((v - lo) / (hi - lo)) * plotW;
  const laneTop = i => top + i * laneH + (spec.gap && i >= 2 ? gapH : 0);
  const bottom = h - axisH;

  ctx.fillStyle = t.plot; ctx.fillRect(plotL, top, plotW, bottom - top);
  ctx.font = '11px system-ui, sans-serif';
  ctx.strokeStyle = t.grid; ctx.fillStyle = t.muted; ctx.lineWidth = 1; ctx.textAlign = 'center';
  ctx.beginPath();
  for (const v of accuracyTicks(lo, hi, plotW)) {
    ctx.moveTo(X(v), top); ctx.lineTo(X(v), bottom);
    ctx.fillText(`${fmt(v * 100, { max: 0 })}%`, X(v), bottom + 14);
  }
  ctx.stroke();
  ctx.fillText(tr('Accuracy on the held-out fold', 'Akurasi pada fold yang ditahan'), (plotL + plotR) / 2, h - 6);

  // Always guessing the majority label: the score to beat.
  ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = t.muted; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(X(spec.baseline), top); ctx.lineTo(X(spec.baseline), bottom); ctx.stroke(); ctx.restore();

  spec.lanes.forEach((ln, i) => {
    const y0 = laneTop(i), y1 = y0 + laneH;
    if (i > 0) { ctx.strokeStyle = t.grid; ctx.beginPath(); ctx.moveTo(plotL, y0); ctx.lineTo(plotR, y0); ctx.stroke(); }
    // header: name on the left, mean and spread on the right (the short form when the long one would not fit)
    ctx.textBaseline = 'alphabetic';
    ctx.font = '600 13px system-ui, sans-serif'; ctx.fillStyle = t.ink; ctx.textAlign = 'left';
    ctx.fillText(ln.label, plotL + 8, y0 + 18);
    const nameW = ctx.measureText(ln.label).width;
    ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = t.ink; ctx.textAlign = 'right';
    const long = tr(`mean ${points(ln.mean)}% ± ${points(ln.sd)}`, `rata-rata ${points(ln.mean)}% ± ${points(ln.sd)}`);
    const short = tr(`mean ${points(ln.mean)}%`, `rata-rata ${points(ln.mean)}%`);
    const room = plotW - nameW - 28;
    const bare = `${points(ln.mean)}%`;
    const text = [long, short, bare].find(c => ctx.measureText(c).width <= room) ?? bare;   // never drawn over the name
    ctx.fillText(text, plotR - 8, y0 + 18);

    // dots, stacked where scores coincide, resting on a line near the bottom of the lane
    const areaTop = y0 + headH, areaBottom = y1 - 9;
    const step = (11 / plotW) * (hi - lo);
    const stack = stackDots(ln.scores, step);
    const levels = Math.max(...stack.map(s => s.level)) + 1;
    const dy = Math.min(11, Math.max(5, (areaBottom - areaTop - 12) / Math.max(1, levels)));
    // mean bar
    ctx.strokeStyle = t.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(X(ln.mean), areaTop - 2); ctx.lineTo(X(ln.mean), y1 - 3); ctx.stroke();
    ctx.lineWidth = 1;
    const dots = ln.scores.map((s, j) => ({ x: X(stack[j].x), y: areaBottom - 4 - stack[j].level * dy, tag: ln.tags?.[j] }));
    dots.forEach(d => {
      ctx.beginPath(); ctx.arc(d.x, d.y, 5.2, 0, 2 * Math.PI);
      ctx.fillStyle = ln.color; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = t.plot; ctx.stroke(); ctx.lineWidth = 1;
    });
    const tagged = dots.filter(d => d.tag != null).sort((a, b) => a.x - b.x);
    if (tagged.length) {
      // Each tag goes above its dot, or beside it, or higher up: the first place that touches no dot, no other tag and not the mean bar.
      ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = t.muted;
      const bar = { x0: X(ln.mean) - 4, x1: X(ln.mean) + 4, y0: areaTop - 2, y1: y1 - 3 };
      const dotBoxes = dots.map(d => ({ x0: d.x - 6.5, x1: d.x + 6.5, y0: d.y - 6.5, y1: d.y + 6.5 }));
      const placed = [];
      const hit = (p, q) => p.x0 < q.x1 && p.x1 > q.x0 && p.y0 < q.y1 && p.y1 > q.y0;
      const minY = y0 + headH - 6;
      tagged.forEach(d => {
        const label = String(d.tag), tw = ctx.measureText(label).width;
        const spot = (align, x, base) => ({ align, x, base, box: { x0: align === 'center' ? x - tw / 2 : align === 'left' ? x : x - tw, x1: align === 'center' ? x + tw / 2 : align === 'left' ? x + tw : x, y0: base - 9, y1: base + 2 } });
        const cx = Math.min(plotR - tw / 2 - 2, Math.max(plotL + tw / 2 + 2, d.x));
        const above = base => [spot('center', cx, base), spot('right', d.x + 6, base), spot('left', d.x - 6, base)];
        const options = [...above(d.y - 11), spot('left', d.x + 9, d.y + 4), spot('right', d.x - 9, d.y + 4), ...above(d.y - 23), ...above(d.y - 35)];
        const free = o => o.box.x0 >= plotL + 1 && o.box.x1 <= plotR - 1 && o.box.y0 >= minY && !hit(o.box, bar) && !dotBoxes.some(q => hit(o.box, q)) && !placed.some(q => hit(o.box, q));
        const o = options.find(free) ?? options[0];
        placed.push(o.box);
        ctx.textAlign = o.align;
        ctx.lineWidth = 3; ctx.strokeStyle = t.plot; ctx.lineJoin = 'round'; ctx.strokeText(label, o.x, o.base); ctx.lineWidth = 1;   // a halo keeps the tag readable
        ctx.fillText(label, o.x, o.base);
      });
    }
  });

  if (spec.gap) {
    const a = spec.lanes[0], b = spec.lanes[1];
    const yTop = laneTop(1) + laneH, y = yTop + 20;
    const xa = X(a.mean), xb = X(b.mean);
    ctx.save();
    ctx.strokeStyle = t.ink; ctx.fillStyle = t.ink; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xa, yTop); ctx.lineTo(xa, y + 5); ctx.moveTo(xb, yTop); ctx.lineTo(xb, y + 5);
    ctx.moveTo(xa, y); ctx.lineTo(xb, y);
    ctx.stroke();
    const dir = Math.sign(xb - xa);
    if (dir) {
      ctx.beginPath(); ctx.moveTo(xb, y); ctx.lineTo(xb - dir * 7, y - 4); ctx.lineTo(xb - dir * 7, y + 4); ctx.closePath(); ctx.fill();
    }
    ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'center';
    const half = ctx.measureText(spec.gap.text).width / 2;
    ctx.fillText(spec.gap.text, Math.min(plotR - half - 4, Math.max(plotL + half + 4, (xa + xb) / 2)), y + 19);
    ctx.restore();
  }
}

// ---- mount ------------------------------------------------------------------------------------------

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Validation: random versus grouped folds', 'Validasi: fold acak versus grouped'),
    hint: tr(
      'The same model is scored two ways on the same table. Each dot is one fold. When the two scores differ, one of them is flattering the model.',
      'Model yang sama dinilai dengan dua cara pada tabel yang sama. Tiap titik adalah satu fold. Jika kedua skor berbeda, salah satunya terlalu memuji model.'),
    status: true, legend: true,
    canvasLabel: tr('Strip chart of the accuracy of each fold for each way of splitting the data', 'Strip chart akurasi tiap fold untuk setiap cara membagi data'),
    extra: {
      title: tr('A peek at the table', 'Sekilas isi tabel'),
      hint: tr('The first rows of the table the model learns from.', 'Baris-baris pertama tabel tempat model belajar.'),
    },
  });
  // Nobody drags this chart: it is a picture, not an application.
  lab.canvas.setAttribute('role', 'img');
  lab.canvas.removeAttribute('tabindex');
  const legendHost = lab.ref('legend');
  if (legendHost) legendHost.style.maxHeight = 'none';

  const searchCanvas = lab.chartCard(
    tr('Best score found against evaluations', 'Skor terbaik yang ditemukan terhadap jumlah evaluasi'),
    '',
    300);
  const searchCard = searchCanvas.closest('.card');
  // The search has its own controls, in its own card: the Parameters card stays short enough for the Quick Quiz panel to open on screen.
  const searchHint = document.createElement('p');
  searchHint.className = 'hint';
  searchHint.id = `search-hint-${Math.random().toString(36).slice(2, 8)}`;
  searchCanvas.setAttribute('aria-describedby', searchHint.id);
  const inlineHost = document.createElement('div');
  inlineHost.className = 'inline-controls';
  const searchStyle = document.createElement('style');
  searchStyle.textContent = '.inline-controls{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:12px 20px;align-items:end;margin-top:12px}.inline-controls[hidden]{display:none}.inline-controls .panel{display:contents}.inline-controls label{display:block;font-size:13px;font-weight:650}.inline-controls select{display:block;width:100%;margin-top:6px;padding:8px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface);font-size:13px}.inline-controls div.slider-label{font-size:13px;font-weight:650}.inline-controls div.slider-label label{display:inline;margin:0}.inline-controls .panel .button-group{margin-top:0}';
  searchCard.querySelector('.chart').before(searchHint, searchStyle, inlineHost);
  const searchOut = document.createElement('div');
  searchOut.setAttribute('role', 'status');
  searchOut.className = 'search-out';
  searchCard.append(searchOut);
  const extraCard = lab.extraEl.closest('.table-card');
  const extraHint = extraCard.querySelector('.hint');

  let mode = 'generated', target = DEFAULTS.target, loadToken = 0, destroyed = false, loading = false, loadFailed = false;
  let seed = DEFAULTS.seed, searchSeed = DEFAULTS.searchSeed;
  const tables = new Map();       // target -> penguinTable
  let table = null;               // the parsed penguins CSV
  let analysis = null;            // the last compareSplits, with what the drawing needs
  let searchResult = null, searchTimer = 0, searchKey = '';
  const evalCache = new Map();

  const controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real)', 'Penguin (data nyata)')]] }),
    { name: 'target', type: 'select', label: tr('Predict', 'Prediksi'), value: DEFAULTS.target, options: [['sex', tr('Sex', 'Jenis kelamin')], ['species', tr('Species', 'Spesies')]] },
    { name: 'quirk', type: 'range', label: tr('Person quirk strength', 'Kekuatan ciri khas tiap orang'), min: 0, max: 4, step: 0.5, value: DEFAULTS.quirk },
    { name: 'folds', type: 'range', label: tr('Number of folds', 'Jumlah fold'), min: 3, max: 10, step: 1, value: DEFAULTS.folds },
    { name: 'k', type: 'range', label: tr('Neighbors (k)', 'Neighbor (k)'), min: K_RANGE.min, max: K_RANGE.max, step: 1, value: DEFAULTS.k },
    { name: 'temporal', type: 'toggle', label: tr('Also show a time-ordered split', 'Tampilkan juga split berurutan waktu'), value: false },
    { name: 'newSample', type: 'button', label: tr('New sample', 'Sampel baru'), onClick: () => { seed += 1; refresh(); } },
  ], name => {
    if (name === 'data') { setMode(controls.get('data')); return; }
    if (name === 'target') { target = controls.get('target'); refresh(); return; }
    refresh();
  });
  // How big the generated table is: with the table it describes, under the charts, not in the Parameters card.
  const dataHost = document.createElement('div');
  dataHost.className = 'inline-controls';
  const tableNote = document.createElement('p');
  tableNote.className = 'hint';
  tableNote.setAttribute('role', 'status');
  lab.extraEl.before(dataHost, tableNote);
  const dataControls = panel(dataHost, [
    { name: 'people', type: 'range', label: tr('Number of people', 'Jumlah orang'), min: 10, max: 50, step: 1, value: DEFAULTS.people },
    { name: 'records', type: 'range', label: tr('Records per person', 'Record per orang'), min: 2, max: 10, step: 1, value: DEFAULTS.records },
  ], () => refresh());
  const values = () => ({ ...controls.values(), ...dataControls.values(), ...searchControls.values() });
  const searchControls = panel(inlineHost, [
    { name: 'budget', type: 'range', label: tr('Search budget (evaluations)', 'Anggaran pencarian (evaluasi)'), min: 4, max: 30, step: 1, value: DEFAULTS.budget },
    { name: 'scoredWith', type: 'select', label: tr('Score the search with', 'Nilai pencarian dengan'), value: DEFAULTS.scoredWith, options: [['grouped', tr('Grouped (person or island)', 'Grouped (orang atau pulau)')], ['random', tr('Random k-fold', 'k-fold acak')]] },
    { name: 'newSearch', type: 'button', label: tr('New random search', 'Random search baru'), onClick: () => { searchSeed += 1; searchKey = ''; scheduleSearch(); } },
  ], () => scheduleSearch());
  const dataNote = document.createElement('p');
  dataNote.className = 'hint';
  dataNote.setAttribute('role', 'status');
  controls.el.querySelector('select').closest('label').after(dataNote);

  const boxSplit = predictBox(lab.ref('below'), {
    hint: tr('Pick an answer, then press Check answer: the scores on the strip chart decide.', 'Pilih jawaban, lalu tekan Periksa jawaban: skor pada strip chart yang menentukan.'),
    name: 'predict-split',
    question: tr('Which split gives the higher score, and which one tells the truth about new people?', 'Split mana yang memberi skor lebih tinggi, dan mana yang jujur tentang orang baru?'),
    choices: [
      ['random-honest', tr('Random k-fold scores higher, and it is the honest one', 'k-fold acak skornya lebih tinggi, dan itulah yang jujur')],
      ['grouped-higher', tr('Grouped k-fold scores higher, and it is the honest one', 'Grouped k-fold skornya lebih tinggi, dan itulah yang jujur')],
      ['random-optimistic', tr('Random k-fold scores higher, but grouped k-fold is the honest one', 'k-fold acak skornya lebih tinggi, tetapi grouped k-fold yang jujur')],
      ['same', tr('They score about the same here', 'Skornya hampir sama di sini')],
    ],
  });
  lab.cleanup(() => { boxSplit.destroy(); });
  boxSplit.onPick(revealPrediction);
  boxSplit.onCheck(revealPrediction);

  // ---- data -------------------------------------------------------------------------------------------

  const isReal = () => mode === 'penguins' && table;
  function currentData() {
    const v = values();
    if (isReal()) {
      if (!tables.has(target)) tables.set(target, penguinTable(table, target));
      const p = tables.get(target);
      return { X: p.X, y: p.y, groups: p.groups, times: p.times, model: { standardize: true }, real: p, rows: null };
    }
    const rows = makeEntityData({ people: v.people, recordsEach: v.records, signal: 1, personEffect: v.quirk, seed });
    const { X, y, groups } = entityXY(rows);
    return { X, y, groups, times: rows.map(r => r.time), model: {}, real: null, rows };
  }

  const sexName = v => (v === 'female' ? tr('female', 'betina') : v === 'male' ? tr('male', 'jantan') : (v ?? 'NA'));

  const laneNames = () => (isReal()
    ? { random: tr('Random k-fold', 'k-fold acak'), grouped: tr('Leave-one-island-out', 'Leave-one-island-out'), temporal: tr('Split by year', 'Split per tahun') }
    : { random: tr('Random k-fold', 'k-fold acak'), grouped: tr('Grouped k-fold (by person)', 'Grouped k-fold (per orang)'), temporal: tr('Time-ordered split', 'Split berurutan waktu') });

  // ---- analysis -----------------------------------------------------------------------------------------

  function analyse() {
    const v = values();
    const data = currentData();
    const cmp = compareSplits({
      X: data.X, y: data.y, groups: data.groups, times: data.times, folds: v.folds, seed,
      model: { ...data.model, k: v.k }, temporal: v.temporal,
    });
    analysis = { data, cmp, k: v.k };
    return analysis;
  }

  // ---- drawing -----------------------------------------------------------------------------------------

  function laneSpec() {
    const { data, cmp } = analysis;
    const names = laneNames();
    const lanes = [
      { label: names.random, ...pick(cmp.random), color: clusterColor(1) },
      { label: names.grouped, ...pick(cmp.grouped), color: clusterColor(0) },
    ];
    if (isReal()) {
      lanes[1].tags = cmp.grouped.folds.map(f => data.groups[f.test[0]]);
    }
    if (cmp.temporal) {
      lanes.push({ label: names.temporal, ...pick(cmp.temporal), color: clusterColor(3) });
      if (isReal()) lanes[2].tags = cmp.temporal.folds.map(f => f.label);
    }
    return lanes;
  }
  const pick = cv => ({ scores: cv.scores, mean: cv.mean, sd: cv.sd });

  function draw() {
    if (!analysis) return;
    const { cmp } = analysis;
    const lanes = laneSpec();
    lab.canvas.style.setProperty('--plot-h', lanes.length === 3 ? 'clamp(380px, 42vw, 440px)' : 'clamp(290px, 32vw, 340px)');
    const gapText = tr(`Optimism gap: ${signedPoints(shownGap(cmp))} points`, `Selisih optimisme: ${signedPoints(shownGap(cmp))} poin`);
    drawStrips(lab.canvas, { lanes, baseline: cmp.baseline, gap: { text: gapText } });
    drawSearch();
  }

  function legend() {
    const { cmp } = analysis;
    const names = laneNames();
    const items = [
      { kind: 'dot', color: clusterColor(1), label: names.random },
      { kind: 'dot', color: clusterColor(0), label: names.grouped },
    ];
    if (cmp.temporal) items.push({ kind: 'dot', color: clusterColor(3), label: names.temporal });
    items.push(
      { kind: 'line', color: theme().ink, label: tr('Mean of the folds', 'Rata-rata semua fold') },
      { kind: 'dash', color: theme().muted, label: tr(`Always guess the majority label (${pct(cmp.baseline)})`, `Selalu menebak label mayoritas (${pct(cmp.baseline)})`) });
    lab.setLegend(items);
  }

  // What leaked, in words. It follows the measured overlap, not the name of the split.
  function leakSentences() {
    const { cmp } = analysis;
    const verdict = splitVerdict(cmp.gap, GAP_TOLERANCE);
    const out = [];
    if (isReal()) {
      out.push(tr(
        `Leave-one-island-out holds back a whole island. It is a harder split, closer to a distribution shift than to a person leak: part of the gap comes from the held-out island looking different from the islands it learns from. Random k-fold sees every island in training (${pct(cmp.overlap.random, 0)} of the test rows), leave-one-island-out sees none (${pct(cmp.overlap.grouped, 0)}).`,
        `Leave-one-island-out menahan satu pulau utuh. Ini split yang lebih sulit, lebih mirip distribution shift daripada kebocoran per orang: sebagian selisihnya muncul karena pulau yang ditahan berbeda dari pulau tempat model belajar. k-fold acak melihat semua pulau saat training (${pct(cmp.overlap.random, 0)} baris uji), leave-one-island-out tidak melihat satu pun (${pct(cmp.overlap.grouped, 0)}).`));
      if (target === 'species') out.push(tr(
        'Gentoo penguins live only on Biscoe and Chinstrap only on Dream, so leaving that island out removes a whole species from training: no model can name it. That is the extreme end of a shift.',
        'Penguin Gentoo hanya ada di Biscoe dan Chinstrap hanya di Dream, jadi menahan pulau itu membuang satu spesies utuh dari training: tidak ada model yang bisa menebaknya. Itu ujung ekstrem dari sebuah shift.'));
    } else if (verdict === 'random-higher' && cmp.overlap.random > 0.5) {
      out.push(tr(
        `What leaked: with random folds, ${pct(cmp.overlap.random, 0)} of the test records belong to a person who also has records in the training data. The model recognised the person by their quirks and repeated that person's usual label. With grouped folds that share is ${pct(cmp.overlap.grouped, 0)}, so the model has to use the real signal.`,
        `Yang bocor: pada fold acak, ${pct(cmp.overlap.random, 0)} record uji milik orang yang juga punya record di data training. Model mengenali orang itu dari ciri khasnya dan mengulang label yang biasanya dimiliki orang itu. Pada fold grouped porsinya ${pct(cmp.overlap.grouped, 0)}, jadi model harus memakai sinyal yang sebenarnya.`));
    } else if (verdict === 'same') {
      out.push(tr(
        'The two scores are about the same here: recognising a person does not help the model, for example because the quirks are weak. Raise "Person quirk strength" and look again.',
        'Kedua skor hampir sama di sini: mengenali seseorang tidak membantu model, misalnya karena ciri khasnya lemah. Naikkan "Kekuatan ciri khas tiap orang" lalu lihat lagi.'));
    } else if (verdict === 'grouped-higher') {
      out.push(tr(
        'Grouped k-fold scored higher this time. With so few folds the scores move by a few points by chance: press "New sample" and it does not repeat.',
        'Kali ini grouped k-fold skornya lebih tinggi. Dengan fold sesedikit ini skor bergeser beberapa poin karena kebetulan: tekan "Sampel baru" dan hasilnya tidak berulang.'));
    } else {
      out.push(tr(
        `Random k-fold scored higher, but only ${pct(cmp.overlap.random, 0)} of its test records belong to a person seen in training, so little leaked.`,
        `k-fold acak skornya lebih tinggi, tetapi hanya ${pct(cmp.overlap.random, 0)} record ujinya milik orang yang terlihat saat training, jadi hanya sedikit yang bocor.`));
    }
    if (cmp.temporal) {
      if (isReal()) out.push(tr(
        'The year split trains on earlier years and tests on the next one, so it has only 2 folds.',
        'Split per tahun melatih pada tahun-tahun sebelumnya dan menguji pada tahun berikutnya, jadi hanya ada 2 fold.'));
      else if (cmp.overlap.temporal > 0.5) out.push(tr(
        `The time-ordered split looks like the random one: ${pct(cmp.overlap.temporal, 0)} of its test records belong to people already in training, because the same people keep coming back later. Time order does not hide a person.`,
        `Split berurutan waktu mirip dengan yang acak: ${pct(cmp.overlap.temporal, 0)} record ujinya milik orang yang sudah ada di training, karena orang yang sama terus muncul lagi. Urutan waktu tidak menyembunyikan seseorang.`));
    }
    if (cmp.grouped.mean < cmp.baseline - 0.005) out.push(tr(
      `On people the model has not seen it scores below always guessing the majority label (${pct(cmp.baseline)}).`,
      `Pada orang yang belum pernah dilihat, skornya di bawah menebak label mayoritas terus-menerus (${pct(cmp.baseline)}).`));
    return out.join(' ');
  }

  function readouts() {
    const { cmp } = analysis;
    const names = laneNames();
    let status = tr(
      `${names.random}: ${pct(cmp.random.mean)} on average. ${names.grouped}: ${pct(cmp.grouped.mean)}. Optimism gap: ${signedPoints(shownGap(cmp))} points.`,
      `${names.random}: rata-rata ${pct(cmp.random.mean)}. ${names.grouped}: ${pct(cmp.grouped.mean)}. Selisih optimisme: ${signedPoints(shownGap(cmp))} poin.`);
    if (cmp.temporal) status += ` ${names.temporal}: ${pct(cmp.temporal.mean)}.`;
    lab.setStatus(status);
    lab.setDetail(leakSentences());
    const rowsN = analysis.data.X.length;
    lab.setMetrics(tr(`${fmt(rowsN)} records`, `${fmt(rowsN)} record`));
    lab.describe(lab.canvas, tr(
      `Fold accuracy. ${names.random}: ${scoreList(cmp.random)}, mean ${pct(cmp.random.mean)}. ${names.grouped}: ${scoreList(cmp.grouped)}, mean ${pct(cmp.grouped.mean)}. Optimism gap ${signedPoints(shownGap(cmp))} points.${cmp.temporal ? ` ${names.temporal}: ${scoreList(cmp.temporal)}, mean ${pct(cmp.temporal.mean)}.` : ''} Always guessing the majority label scores ${pct(cmp.baseline)}.`,
      `Akurasi tiap fold. ${names.random}: ${scoreList(cmp.random)}, rata-rata ${pct(cmp.random.mean)}. ${names.grouped}: ${scoreList(cmp.grouped)}, rata-rata ${pct(cmp.grouped.mean)}. Selisih optimisme ${signedPoints(shownGap(cmp))} poin.${cmp.temporal ? ` ${names.temporal}: ${scoreList(cmp.temporal)}, rata-rata ${pct(cmp.temporal.mean)}.` : ''} Menebak label mayoritas terus-menerus menghasilkan ${pct(cmp.baseline)}.`));
  }

  function dataNotes() {
    dataNote.textContent = loading ? tr('Loading the penguin data…', 'Memuat data penguin…')
      : loadFailed ? tr('Could not load the penguin data, so the generated data is shown.', 'Data penguin tidak bisa dimuat, jadi data buatan yang ditampilkan.') : '';
    dataNote.hidden = !dataNote.textContent;
    if (loading) return;
    if (isReal()) {
      const p = analysis.data.real;
      tableNote.textContent = p.droppedFor > 0
        ? tr(
          `${fmt(p.X.length)} of ${fmt(p.total)} penguins are used. ${fmt(p.dropped)} rows with missing values (NA) are left out: ${fmt(p.droppedFeatures)} have no measurements and ${fmt(p.droppedFor)} have no recorded sex. The groups are the 3 islands.`,
          `${fmt(p.X.length)} dari ${fmt(p.total)} penguin dipakai. ${fmt(p.dropped)} baris dengan missing value (NA) dibuang: ${fmt(p.droppedFeatures)} tanpa pengukuran dan ${fmt(p.droppedFor)} tanpa catatan jenis kelamin. Grupnya adalah 3 pulau.`)
        : tr(
          `${fmt(p.X.length)} of ${fmt(p.total)} penguins are used. ${fmt(p.dropped)} rows with missing values (NA) are left out: they have no measurements. The groups are the 3 islands.`,
          `${fmt(p.X.length)} dari ${fmt(p.total)} penguin dipakai. ${fmt(p.dropped)} baris dengan missing value (NA) dibuang: tidak ada pengukurannya. Grupnya adalah 3 pulau.`);
    } else {
      const v = values();
      tableNote.textContent = tr(
        `${fmt(v.people * v.records)} records: ${fmt(v.people)} people with ${fmt(v.records)} records each. Seeded, so everyone sees the same table.`,
        `${fmt(v.people * v.records)} record: ${fmt(v.people)} orang dengan masing-masing ${fmt(v.records)} record. Memakai seed, jadi semua orang melihat tabel yang sama.`);
    }
  }

  // ---- the table peek ------------------------------------------------------------------------------------

  function peekTable() {
    const { data } = analysis;
    const t = document.createElement('table');
    t.className = 'stats-table';
    const head = t.createTHead().insertRow();
    const body = t.createTBody();
    const textCols = isReal() ? 3 : 0;   // the leading columns that hold words (island, species, sex) are left-aligned
    const addRow = cells => { const r = body.insertRow(); cells.forEach((c, i) => { const td = r.insertCell(); td.textContent = c; if (i < textCols) td.className = 'txt'; }); };
    const headers = isReal()
      ? [tr('Island', 'Pulau'), tr('Species', 'Spesies'), tr('Sex', 'Jenis kelamin'), tr('Flipper (mm)', 'Sirip (mm)'), tr('Bill length (mm)', 'Panjang paruh (mm)'), tr('Bill depth (mm)', 'Kedalaman paruh (mm)'), tr('Body mass (g)', 'Massa tubuh (g)'), tr('Year', 'Tahun')]
      : [tr('Person', 'Orang'), tr('Time', 'Waktu'), 'F1', tr('Q1', 'C1'), tr('Q2', 'C2'), tr('Q3', 'C3'), tr('Label', 'Label')];
    headers.forEach((h, i) => { const th = document.createElement('th'); th.textContent = h; if (i < textCols) th.className = 'txt'; head.append(th); });
    const peek = tablePeek(data.groups, 3, 3);
    if (isReal()) {
      peek.forEach(i => {
        const r = table.rows[data.real.index[i]];
        addRow([r.island, r.species, sexName(r.sex), fmt(r.flipper_length_mm), fmt(r.bill_length_mm, { digits: 1 }), fmt(r.bill_depth_mm, { digits: 1 }), fmt(r.body_mass_g), String(r.year)]);
      });
      extraHint.textContent = tr('The first three complete rows of each island.', 'Tiga baris lengkap pertama dari tiap pulau.');
    } else {
      peek.forEach(i => {
        const r = data.rows[i];
        addRow([String(r.person + 1), fmt(r.time + 1), ...r.features.map(f => fmt(f, { digits: 2 })), String(r.label)]);
      });
      extraHint.textContent = tr(
        'The first three records of the first three people. F1 is feature 1 and Q1 to Q3 are the person quirks. A person\'s quirks stay about the same from record to record: that is what a model can memorise. Only feature 1 carries signal that carries over to new people.',
        'Tiga record pertama dari tiga orang pertama. F1 adalah feature 1 dan C1 sampai C3 adalah ciri khas tiap orang. Ciri khas seseorang hampir sama dari record ke record: itulah yang bisa dihafal model. Hanya feature 1 yang membawa sinyal yang berlaku juga untuk orang baru.');
    }
    const style = document.createElement('style');
    style.textContent = '.stats-table { font-size: 12.5px; } .stats-table th, .stats-table td { padding: 6px 7px; } .stats-table th.txt, .stats-table td.txt { text-align: left; } @media (max-width: 640px) { .stats-table { font-size: 12px; } .stats-table th, .stats-table td { white-space: normal; padding: 6px 4px; } }';
    lab.extraEl.replaceChildren(style, t);
  }

  // ---- search -------------------------------------------------------------------------------------------

  const configKey = c => `${c.k}|${Number(c.weight).toPrecision(6)}`;

  function runSearch() {
    const v = values();
    const { data, cmp } = analysis;
    const key = [mode, target, v.people, v.records, v.quirk, v.folds, v.k, seed, searchSeed, v.budget, v.scoredWith].join('|');
    if (key === searchKey && searchResult) return;
    searchKey = key;
    const dataKey = [mode, target, v.people, v.records, v.quirk, v.folds, seed].join('|');
    if (evalCache.get('dataKey') !== dataKey) { evalCache.clear(); evalCache.set('dataKey', dataKey); }
    const scorer = which => config => {
      const id = `${which}|${configKey(config)}`;
      if (!evalCache.has(id)) {
        evalCache.set(id, crossValidate({
          X: data.X, y: data.y, fitPredict: knnPredictor({ ...data.model, ...config }),
          folds: which === 'random' ? cmp.random.folds : cmp.grouped.folds,
        }).mean);
      }
      return evalCache.get(id);
    };
    const evaluate = scorer(v.scoredWith);
    const res = searchCompare({ evaluate, budget: v.budget, seed: searchSeed, kRange: K_RANGE, weightRange: WEIGHT_RANGE });
    const all = [...res.grid.results, ...res.random.results].map(r => r.score);
    searchResult = {
      ...res, budget: v.budget, scoredWith: v.scoredWith,
      distinct: {
        gridK: new Set(res.grid.results.map(r => r.config.k)).size,
        gridW: new Set(res.grid.results.map(r => configKey({ k: 0, weight: r.config.weight }))).size,
        randK: new Set(res.random.results.map(r => r.config.k)).size,
        randW: new Set(res.random.results.map(r => configKey({ k: 0, weight: r.config.weight }))).size,
      },
      spread: Math.max(...all) - Math.min(...all),
      truth: v.scoredWith === 'random'
        ? { grid: scorer('grouped')(res.grid.best.config), random: scorer('grouped')(res.random.best.config) }
        : null,
    };
  }

  function drawSearch() {
    if (!searchResult) return;
    const { grid, random } = searchResult;
    const n = searchResult.budget;
    const ys = [...grid.curve, ...random.curve].map(v => v * 100);
    const yMin = Math.floor((Math.min(...ys) - 2) / 5) * 5;
    const yMax = Math.min(100, Math.ceil((Math.max(...ys) + 6) / 5) * 5);
    drawLineChart(searchCanvas, {
      series: [
        { xs: grid.curve.map((_, i) => i + 1), ys: grid.curve.map(v => v * 100), color: clusterColor(0), label: tr('Grid search (dashed)', 'Grid search (putus-putus)'), dash: true },
        { xs: random.curve.map((_, i) => i + 1), ys: random.curve.map(v => v * 100), color: clusterColor(1), label: tr('Random search', 'Random search') },
      ],
      xLabel: tr('Evaluations used', 'Evaluasi yang dipakai'), yLabel: tr('Best score so far (%)', 'Skor terbaik sejauh ini (%)'),
      xMin: 1, xMax: Math.max(n, 2), yMin, yMax, integerX: true,
    });
  }

  function updateSearchHint() {
    const what = isReal()
      ? tr('how much flipper length counts in the distance', 'seberapa besar panjang sirip dihitung dalam jarak')
      : tr('how much the first feature counts in the distance', 'seberapa besar feature pertama dihitung dalam jarak');
    searchHint.textContent = tr(
      `Each evaluation scores one setting of k and of the feature weight (${what}) with the split chosen below. The line is the best score so far. Grid search tries evenly spaced values, random search tries random ones, both with the same budget.`,
      `Tiap evaluasi menilai satu pengaturan k dan bobot feature (${what}) dengan split yang dipilih di bawah. Garisnya adalah skor terbaik sejauh ini. Grid search mencoba nilai yang berjarak sama, random search mencoba nilai acak, keduanya dengan anggaran yang sama.`);
  }

  function searchText() {
    const r = searchResult;
    const { grid, random } = r;
    const cfg = c => (isReal()
      ? tr(`k = ${fmt(c.k)}, flipper weight ${weightText(c.weight)}`, `k = ${fmt(c.k)}, bobot panjang sirip ${weightText(c.weight)}`)
      : tr(`k = ${fmt(c.k)}, weight ${weightText(c.weight)}`, `k = ${fmt(c.k)}, bobot ${weightText(c.weight)}`));
    const lines = [];
    lines.push(tr(
      `With the same budget the grid tried ${fmt(r.distinct.gridK)} values of k and ${fmt(r.distinct.gridW)} of the weight; random search tried ${fmt(r.distinct.randK)} and ${fmt(r.distinct.randW)}.`,
      `Dengan anggaran yang sama, grid mencoba ${fmt(r.distinct.gridK)} nilai k dan ${fmt(r.distinct.gridW)} nilai bobot; random search mencoba ${fmt(r.distinct.randK)} dan ${fmt(r.distinct.randW)}.`));
    lines.push(tr(
      `Grid search: best ${pct(grid.best.score)} after ${fmt(grid.evaluations)} evaluations (${cfg(grid.best.config)}). Random search: best ${pct(random.best.score)} after ${fmt(random.evaluations)} evaluations (${cfg(random.best.config)}).`,
      `Grid search: terbaik ${pct(grid.best.score)} setelah ${fmt(grid.evaluations)} evaluasi (${cfg(grid.best.config)}). Random search: terbaik ${pct(random.best.score)} setelah ${fmt(random.evaluations)} evaluasi (${cfg(random.best.config)}).`));
    if (grid.evaluations < r.budget) lines.push(tr(
      `A grid has to be a full table of values, so it can only use ${fmt(grid.evaluations)} of the ${fmt(r.budget)} evaluations.`,
      `Grid harus berupa tabel nilai yang penuh, jadi hanya bisa memakai ${fmt(grid.evaluations)} dari ${fmt(r.budget)} evaluasi.`));
    const diff = random.best.score - grid.best.score;
    if (Math.abs(diff) <= TIE) lines.push(tr(
      'The two best scores are within a point of each other: here neither method wins. Press "New random search" to draw again.',
      'Kedua skor terbaik selisihnya tidak sampai satu poin: di sini tidak ada metode yang menang. Tekan "Random search baru" untuk mengundi lagi.'));
    else if (diff > 0) lines.push(tr(
      `Random search found the better setting this time, by ${points(diff)} points. Press "New random search" to see whether that holds.`,
      `Kali ini random search menemukan pengaturan yang lebih baik, selisih ${points(diff)} poin. Tekan "Random search baru" untuk melihat apakah itu konsisten.`));
    else lines.push(tr(
      `The grid found the better setting this time, by ${points(-diff)} points. Press "New random search" to see how much a random draw varies.`,
      `Kali ini grid menemukan pengaturan yang lebih baik, selisih ${points(-diff)} poin. Tekan "Random search baru" untuk melihat seberapa besar variasi undian acak.`));
    if (r.truth) lines.push(tr(
      `Scored with random k-fold, the search rewards settings that recognise people. Scored on new people (grouped), the two winners reach only ${pct(r.truth.grid)} (grid) and ${pct(r.truth.random)} (random).`,
      `Dinilai dengan k-fold acak, pencarian ini menghargai pengaturan yang mengenali orang. Dinilai pada orang baru (grouped), kedua pemenang hanya mencapai ${pct(r.truth.grid)} (grid) dan ${pct(r.truth.random)} (random).`));
    if (r.spread <= FLAT) lines.push(tr(
      `Every setting scored within ${points(r.spread)} points of the others, so tuning barely matters here.`,
      `Semua pengaturan skornya berselisih ${points(r.spread)} poin atau kurang, jadi tuning hampir tidak berpengaruh di sini.`));
    return lines;
  }

  function showSearch() {
    if (!searchResult) return;
    searchOut.replaceChildren(...searchText().map(t => { const p = document.createElement('p'); p.className = 'hint'; p.textContent = t; return p; }));
    drawSearch();
    lab.describe(searchCanvas, tr(
      `Best score so far against evaluations used. Grid search ends at ${pct(searchResult.grid.best.score)} after ${fmt(searchResult.grid.evaluations)} evaluations; random search ends at ${pct(searchResult.random.best.score)} after ${fmt(searchResult.random.evaluations)}.`,
      `Skor terbaik sejauh ini terhadap evaluasi yang dipakai. Grid search berakhir di ${pct(searchResult.grid.best.score)} setelah ${fmt(searchResult.grid.evaluations)} evaluasi; random search berakhir di ${pct(searchResult.random.best.score)} setelah ${fmt(searchResult.random.evaluations)}.`));
  }

  // The search takes a moment, so it waits until the sliders stop moving.
  function scheduleSearch() {
    clearTimeout(searchTimer);
    if (!analysis) return;
    searchOut.replaceChildren(Object.assign(document.createElement('p'), { className: 'hint', textContent: tr('Running the search…', 'Menjalankan pencarian…') }));
    searchTimer = setTimeout(() => {
      if (destroyed || !analysis) return;
      runSearch();
      showSearch();
    }, 140);
  }
  lab.cleanup(() => clearTimeout(searchTimer));

  // ---- prediction -----------------------------------------------------------------------------------------

  function revealPrediction() {
    if (!analysis || boxSplit.chosen() == null) return;
    const { cmp } = analysis;
    const verdict = splitVerdict(cmp.gap, GAP_TOLERANCE);
    const scores = tr(
      `Random k-fold scored ${pct(cmp.random.mean)} and ${isReal() ? 'leave-one-island-out' : 'grouped k-fold'} ${pct(cmp.grouped.mean)}.`,
      `k-fold acak mendapat ${pct(cmp.random.mean)} dan ${isReal() ? 'leave-one-island-out' : 'grouped k-fold'} ${pct(cmp.grouped.mean)}.`);
    const honest = isReal()
      ? tr('Only leave-one-island-out says how the model does on an island it has never seen.', 'Hanya leave-one-island-out yang menunjukkan kinerja model pada pulau yang belum pernah dilihatnya.')
      : tr('Only the grouped score says how the model does on people it has never seen.', 'Hanya skor grouped yang menunjukkan kinerja model pada orang yang belum pernah dilihatnya.');
    if (verdict === 'random-higher') boxSplit.reveal('random-optimistic', `${scores} ${honest}`);
    else if (verdict === 'grouped-higher') boxSplit.reveal('grouped-higher', `${scores} ${tr('With few folds the scores move by a few points by chance; press "New sample" to check. The grouped split is still the honest one.', 'Dengan fold yang sedikit skor bergeser beberapa poin karena kebetulan; tekan "Sampel baru" untuk memeriksa. Split grouped tetap yang jujur.')}`);
    else boxSplit.reveal('same', `${scores} ${tr('Here the person quirks are too weak to help the model, so the random split is not inflated. Raise "Person quirk strength" and the gap opens; the grouped score is the honest one either way.', 'Di sini ciri khas tiap orang terlalu lemah untuk membantu model, jadi split acak tidak membengkak. Naikkan "Kekuatan ciri khas tiap orang" dan selisihnya terbuka; skor grouped tetap yang jujur.')}`);
  }

  // ---- wiring ---------------------------------------------------------------------------------------------

  function syncControls() {
    const real = isReal();
    for (const n of ['people', 'records']) dataControls.show(n, !real);
    controls.show('quirk', !real);
    dataHost.hidden = real;
    controls.show('target', real);
  }
  function refresh() {
    syncControls();
    updateSearchHint();
    analyse();
    searchKey = '';
    legend(); readouts(); dataNotes(); peekTable();
    draw();
    scheduleSearch();
    revealPrediction();
  }

  async function setMode(next) {
    const token = ++loadToken;
    loadFailed = false;
    if (next === 'generated') { mode = 'generated'; loading = false; refresh(); return; }
    loading = true; dataNotes(); lab.setStatus(tr('Loading the penguin data…', 'Memuat data penguin…'));
    try {
      const t = table ?? await loadDataset(next);
      if (destroyed || token !== loadToken) return;
      table = t; mode = 'penguins'; loading = false;
    } catch {
      if (destroyed || token !== loadToken) return;
      loading = false; loadFailed = true; mode = 'generated';
      controls.set('data', 'generated');
    }
    refresh();
  }

  lab.onReset(() => {
    loadToken += 1;
    mode = 'generated'; target = DEFAULTS.target; seed = DEFAULTS.seed; searchSeed = DEFAULTS.searchSeed; loading = false; loadFailed = false;
    controls.set('data', 'generated'); controls.set('target', DEFAULTS.target);
    for (const n of ['people', 'records']) dataControls.set(n, DEFAULTS[n]);
    for (const n of ['quirk', 'folds', 'k']) controls.set(n, DEFAULTS[n]);
    searchControls.set('budget', DEFAULTS.budget);
    controls.set('temporal', false); searchControls.set('scoredWith', DEFAULTS.scoredWith);
    boxSplit.reset();
    refresh();
  });
  lab.onTheme(() => { if (analysis) { legend(); draw(); } });
  lab.onResize(() => { if (analysis) draw(); });
  lab.cleanup(() => { destroyed = true; loadToken += 1; });
  refresh();
  return lab.destroy;
}
