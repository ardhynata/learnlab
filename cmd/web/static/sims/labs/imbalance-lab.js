// Imbalance lab, built on the kit: set the share of positive examples (1% to 50%), train a logistic
// regression, and compare it with a majority-class baseline on a held-out set drawn with the SAME share.
// A table and a bar chart show accuracy, precision, recall and F1 for both. The baseline can look great on
// accuracy while it finds no positive at all; class weights and the decision threshold are the two levers
// that win recall back. Generated data works offline; "Penguins (real)" is Chinstrap against the rest
// (bill length and bill depth; rows with a missing value are left out and the lab says so).
// The math (data, baseline, fitting, scores, geometry) lives in sims/ml/imbalance.js.
import { createLab, createPlot, dataModeSpec, loadDataset, predictBox, clusterColor, theme, tr, fmt, pct } from '../kit/index.js';
import {
  generatedData, evaluate, fitModel, decisionLine, rescaleLine, halfPlanePolygon, lineInSquare, verdictKind, trendKey,
  penguinTable, subsampleToFraction, stratifiedSplit, takeRows,
} from '../ml/imbalance.js';

export const DEFAULTS = { share: 5, threshold: 0.5, seed: 3 };
export const GENERATED_N = 1000;
const TEST_SEED_OFFSET = 7919;

// What the axes of each data mode show; built when drawn so the text follows the language.
const views = {
  generated: () => ({ xLo: 0, xHi: 10, yLo: 0, yHi: 10, xTitle: tr('Feature 1', 'Feature 1'), yTitle: tr('Feature 2', 'Feature 2') }),
  penguins: () => ({ xLo: 30, xHi: 60, yLo: 12, yHi: 22, xTitle: tr('Bill length (mm)', 'Panjang paruh (mm)'), yTitle: tr('Bill depth (mm)', 'Kedalaman paruh (mm)') }),
};

const score = (v, undef) => (undef ? tr('n/a', 'n/a') : pct(v));

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Rare positives: accuracy can fool you', 'Positif yang jarang: accuracy bisa menipu'),
    hint: tr(
      'Each mark is a test example the model has not seen: crosses are positive, dots are negative. The shaded side is where the model says positive.',
      'Setiap tanda adalah contoh uji yang belum pernah dilihat model: silang = positif, titik = negatif. Sisi yang diarsir adalah tempat model menjawab positif.'),
    status: true, legend: true,
    canvasLabel: tr(
      'Scatterplot of the test examples: positives as crosses, negatives as dots, with the model decision boundary and the side it calls positive shaded. Display only.',
      'Scatterplot contoh uji: positif berupa silang, negatif berupa titik, dengan decision boundary model dan sisi yang dijawab positif diarsir. Hanya untuk dilihat.'),
    extra: {
      title: tr('Baseline and model on the test set', 'Baseline dan model pada test set'),
      hint: tr(
        'The baseline always answers with the majority class (negative). Precision shows n/a when nothing was called positive.',
        'Baseline selalu menjawab dengan kelas mayoritas (negatif). Precision tertulis n/a bila tidak ada yang dijawab positif.'),
    },
  });
  const plot = createPlot(lab.canvas, { xLabel: '', yLabel: '' });

  let mode = 'generated', seed = DEFAULTS.seed, real = null, loading = false, loadFailed = false;
  let loadToken = 0, destroyed = false;
  let cache = new Map();

  const controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real)', 'Penguin (data nyata)')]] }),
    { name: 'share', type: 'range', label: tr('Share of positive examples', 'Persentase contoh positif'), min: 1, max: 50, step: 1, value: DEFAULTS.share, format: v => `${fmt(v)}%` },
    { name: 'weighted', type: 'toggle', label: tr('Weigh positives more (class weight)', 'Beri bobot lebih pada positif (class weight)'), value: false },
    { name: 'threshold', type: 'range', label: tr('Decision threshold', 'Threshold keputusan'), min: 0.05, max: 0.95, step: 0.05, value: DEFAULTS.threshold, format: v => fmt(v, { digits: 2 }) },
    { name: 'newSample', type: 'button', label: tr('New sample', 'Sampel baru'), onClick: () => { seed += 1; cache = new Map(); settle(); } },
    { type: 'note', text: tr(
      'Class weight makes the rare positives count more while the model trains, so all of them weigh about as much as all the negatives. The threshold is the probability the model must reach before it says positive.',
      'Dengan class weight, positif yang jarang dihitung lebih berat saat model dilatih, sehingga seluruh positif bobotnya hampir sama dengan seluruh negatif. Threshold adalah probabilitas minimum agar model menjawab positif.') },
  ], name => {
    if (name === 'data') { setMode(controls.get('data')); return; }
    settle();
  });
  const dataNote = document.createElement('p');
  dataNote.className = 'hint';
  dataNote.setAttribute('role', 'status');
  controls.el.querySelector('select').closest('label').after(dataNote);

  const box = predictBox(lab.ref('below'), {
    hint: tr('Slide the share of positives down in the Parameters, then check again.', 'Turunkan persentase contoh positif pada Parameter, lalu periksa lagi.'),
    name: 'predict-imbalance',
    question: tr('As positives become rarer, what happens to the baseline accuracy and to the model recall?', 'Saat positif makin langka, apa yang terjadi pada akurasi baseline dan recall model?'),
    choices: [
      ['up-down', tr('Baseline accuracy goes up, model recall goes down', 'Akurasi baseline naik, recall model turun')],
      ['up-same', tr('Baseline accuracy goes up, model recall stays about the same', 'Akurasi baseline naik, recall model hampir tetap')],
      ['up-up', tr('Both go up', 'Keduanya naik')],
      ['down-down', tr('Both go down', 'Keduanya turun')],
      ['same-same', tr('Neither changes much', 'Tidak ada yang banyak berubah')],
    ],
  });
  const barCanvas = lab.chartCard(
    tr('Scores on the test set', 'Skor pada test set'),
    tr('Accuracy, precision, recall and F1 as percentages. In each pair the grey bar is the baseline and the green bar is the model.', 'Accuracy, precision, recall, dan F1 dalam persen. Pada tiap pasangan, batang abu-abu adalah baseline dan batang hijau adalah model.'),
    260);
  lab.cleanup(() => { destroyed = true; loadToken += 1; box.destroy(); });
  // Picking an answer after the slider has moved shows the verdict at once.
  box.onPick(revealPrediction);

  // ---- data and experiment ------------------------------------------------------------------

  const view = () => views[mode === 'penguins' && real ? 'penguins' : 'generated']();
  const toPlot = (p, v) => ({ x: (p[0] - v.xLo) / (v.xHi - v.xLo) * 10, y: (p[1] - v.yLo) / (v.yHi - v.yLo) * 10 });

  // The training and test rows for one share of positives, with the logistic model fitted on the training
  // rows. Cached, so the slider only recomputes what changed; `weighted` changes the model, the threshold does not.
  function experiment(share, weighted) {
    const key = `${share}|${weighted}`;
    if (cache.has(key)) return cache.get(key);
    let train, test, info;
    if (mode === 'penguins' && real) {
      const sub = subsampleToFraction(real, share / 100, seed);
      const split = stratifiedSplit(sub.y, 0.5, seed);
      train = takeRows(sub, split.train); test = takeRows(sub, split.test);
      info = { positives: sub.positives, negatives: sub.negatives };
    } else {
      train = generatedData({ n: GENERATED_N, fraction: share / 100, seed });
      test = generatedData({ n: GENERATED_N, fraction: share / 100, seed: seed + TEST_SEED_OFFSET });
      info = null;
    }
    const out = { train, test, info, model: fitModel(train, { weighted }) };
    cache.set(key, out);
    return out;
  }
  function run(share, weighted, threshold) {
    const e = experiment(share, weighted);
    return { ...evaluate(e.train, e.test, { weighted, threshold, model: e.model }), experiment: e };
  }

  async function setMode(next) {
    const token = ++loadToken;
    loadFailed = false; cache = new Map();
    if (next === 'generated') { mode = 'generated'; loading = false; settle(); return; }
    loading = true; mode = next; draw();
    try {
      const table = await loadDataset(next);
      if (destroyed || token !== loadToken) return;
      const data = penguinTable(table);
      real = { ...data, positives: data.y.reduce((a, v) => a + v, 0) };
      loading = false;
    } catch {
      if (destroyed || token !== loadToken) return;
      loading = false; loadFailed = true; mode = 'generated';
      controls.set('data', 'generated');
    }
    settle();
  }

  // ---- text ----------------------------------------------------------------------------------

  function verdict(r) {
    const a = pct(r.baseline.accuracy), recall = pct(r.model.recall);
    const kind = verdictKind(r.baseline.accuracy);
    if (kind === 'trap') {
      const ending = r.model.recall === 0
        ? tr(`Recall tells the truth: the baseline finds ${pct(0)} of the positives, and so does the model.`, `Recall yang memberi gambaran sebenarnya: baseline menemukan ${pct(0)} positif, dan model juga sama.`)
        : tr(`Recall tells the truth: the baseline finds ${pct(0)} of the positives, the model finds ${recall}.`, `Recall yang memberi gambaran sebenarnya: baseline menemukan ${pct(0)} positif, model menemukan ${recall}.`);
      return `${tr(`The baseline never finds a positive, yet its accuracy is ${a}. It only looks great because ${a} of the test examples are negative.`, `Baseline tidak pernah menemukan satu pun positif, tetapi akurasinya ${a}. Angka itu tampak bagus hanya karena ${a} contoh uji adalah negatif.`)} ${ending}`;
    }
    if (kind === 'decent') {
      return tr(`The baseline already scores ${a} accuracy without finding a single positive. Compare recall: baseline ${pct(0)}, model ${recall}.`, `Baseline sudah mendapat akurasi ${a} tanpa menemukan satu pun positif. Bandingkan recall: baseline ${pct(0)}, model ${recall}.`);
    }
    return tr(`With this many positives the baseline's accuracy is only ${a}, so accuracy is a fairer score again. The model reaches ${pct(r.model.accuracy)} accuracy and ${recall} recall.`,
      `Dengan positif sebanyak ini, akurasi baseline hanya ${a}, sehingga accuracy kembali menjadi ukuran yang cukup adil. Model mencapai akurasi ${pct(r.model.accuracy)} dan recall ${recall}.`);
  }

  function detailText(r, weighted, threshold) {
    const t = r.test, trainN = r.experiment.train.y.length;
    let text = tr(
      `Test set: ${fmt(t.n)} examples, ${fmt(t.positives)} positive (${pct(t.fraction)}). The model was trained on ${fmt(trainN)} other examples with the same share of positives.`,
      `Test set: ${fmt(t.n)} contoh, ${fmt(t.positives)} positif (${pct(t.fraction)}). Model dilatih dengan ${fmt(trainN)} contoh lain yang persentase positifnya sama.`);
    if (weighted) text += ' ' + tr(`Class weight: each positive counts ${fmt(r.weight)} times in training.`, `Class weight: setiap positif dihitung ${fmt(r.weight)} kali saat training.`);
    if (Math.abs(threshold - 0.5) > 1e-9) text += ' ' + tr(`Threshold ${fmt(threshold, { digits: 2 })}: the model says positive from that probability up.`, `Threshold ${fmt(threshold, { digits: 2 })}: model menjawab positif mulai dari probabilitas itu.`);
    if (t.positives === 1) text += ' ' + tr('Only 1 positive is in the test set, so recall can only be 0% or 100%: treat it as rough, and try New sample.', 'Hanya ada 1 positif di test set, sehingga recall hanya bisa 0% atau 100%: anggap kasar saja, dan coba Sampel baru.');
    else if (t.positives < 10) text += ' ' + tr(`Only ${fmt(t.positives)} positives are in the test set, so recall moves in big steps of ${pct(1 / t.positives)}: treat it as rough, and try New sample.`, `Hanya ada ${fmt(t.positives)} positif di test set, sehingga recall berubah dalam lompatan besar ${pct(1 / t.positives)}: anggap kasar saja, dan coba Sampel baru.`);
    return text;
  }

  function noteText(r) {
    if (mode === 'penguins' && real) {
      const info = r?.experiment.info;
      const own = real.positives / real.y.length;
      return tr(
        `${fmt(real.y.length)} of ${fmt(real.total)} penguins have both bill measurements; ${fmt(real.dropped)} rows with missing values (NA) are left out. Positive = Chinstrap (${fmt(real.positives)} of ${fmt(real.y.length)}, ${pct(own)}). Below ${pct(own, 0)}, the lab keeps all the other penguins and a random part of the Chinstraps; above it, all the Chinstraps and a random part of the others. Half of the rows train the model and half test it.${info ? ` This sample: ${fmt(info.positives)} Chinstrap and ${fmt(info.negatives)} others.` : ''}`,
        `${fmt(real.y.length)} dari ${fmt(real.total)} penguin punya kedua pengukuran paruh; ${fmt(real.dropped)} baris dengan missing value (NA) dibuang. Positif = Chinstrap (${fmt(real.positives)} dari ${fmt(real.y.length)}, ${pct(own)}). Di bawah ${pct(own, 0)}, lab mempertahankan semua penguin lain dan mengambil sebagian acak Chinstrap; di atasnya, semua Chinstrap dan sebagian acak penguin lain. Separuh baris melatih model dan separuhnya menguji.${info ? ` Sampel ini: ${fmt(info.positives)} Chinstrap dan ${fmt(info.negatives)} lainnya.` : ''}`);
    }
    if (loadFailed) return tr('Could not load the penguin data, so the generated data is shown.', 'Data penguin tidak bisa dimuat, jadi data buatan yang ditampilkan.');
    return tr(
      `Generated data: two overlapping groups of points. ${fmt(GENERATED_N)} examples train the model and another ${fmt(GENERATED_N)} test it, both with the share of positives set above. Seeded, so everyone sees the same points.`,
      `Data buatan: dua kelompok titik yang saling tumpang tindih. ${fmt(GENERATED_N)} contoh melatih model dan ${fmt(GENERATED_N)} contoh lain mengujinya, keduanya dengan persentase positif seperti di atas. Memakai seed, jadi semua orang melihat titik yang sama.`);
  }

  // ---- predict first -----------------------------------------------------------------------------

  function revealPrediction() {
    if (box.chosen() == null || loading) return;
    const share = controls.get('share'), weighted = controls.get('weighted'), threshold = controls.get('threshold');
    // At a balanced share there is nothing to compare, so no answer is right or wrong: a neutral message.
    if (share >= 45) {
      const fb = box.root.querySelector('.predict-feedback');
      if (fb) {
        fb.className = 'predict-feedback';
        fb.textContent = tr('Move the share of positives down first: at 50% the classes are balanced, so there is nothing to compare yet.', 'Turunkan dulu persentase positif: pada 50% kelas sudah seimbang, jadi belum ada yang bisa dibandingkan.');
      }
      return;
    }
    const ref = run(50, weighted, threshold), cur = run(share, weighted, threshold);
    const key = trendKey(share / 100, cur.baseline.accuracy - ref.baseline.accuracy, cur.model.recall - ref.model.recall);
    box.reveal(key, tr(`From 50% positives down to ${pct(share / 100, 0)}: the baseline accuracy went from ${pct(ref.baseline.accuracy)} to ${pct(cur.baseline.accuracy)}, and the model recall from ${pct(ref.model.recall)} to ${pct(cur.model.recall)}.`,
        `Dari 50% positif turun ke ${pct(share / 100, 0)}: akurasi baseline berubah dari ${pct(ref.baseline.accuracy)} menjadi ${pct(cur.baseline.accuracy)}, dan recall model dari ${pct(ref.model.recall)} menjadi ${pct(cur.model.recall)}.`));
  }

  // ---- drawing -------------------------------------------------------------------------------------

  // The kit's plot labels its axes 0..10; the data may be in other units, so those labels are erased
  // (the margins are transparent) and drawn again from the data range.
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

  function drawScatter(r, v, threshold) {
    const g = plot.begin();
    axes(g, v);
    const ctx = plot.ctx;
    const e = r?.experiment;
    if (!e) return g;
    const line = rescaleLine(decisionLine(e.model, threshold), v);
    plot.clip(() => {
      const region = halfPlanePolygon(line.w0, line.w1, line.b, 10).map(([x, y]) => ({ x, y }));
      plot.polygon(region, { fill: clusterColor(1), alpha: 0.12 });
      ctx.save(); ctx.globalAlpha = 0.6;
      e.test.X.forEach((p, i) => { if (!e.test.y[i]) { const u = toPlot(p, v); plot.dot(u.x, u.y, clusterColor(0), 3); } });
      ctx.restore();
      e.test.X.forEach((p, i) => { if (e.test.y[i]) { const u = toPlot(p, v); plot.cross(u.x, u.y, clusterColor(1), 4.5); } });
      const seg = lineInSquare(line.w0, line.w1, line.b, 10);
      if (seg) plot.segment(seg[0][0], seg[0][1], seg[1][0], seg[1][1], { color: g.t.ink, width: 2, dash: [6, 5] });
    });
    return g;
  }

  const GROUPS = r => [
    { name: tr('Accuracy', 'Accuracy'), a: r.baseline.accuracy, b: r.model.accuracy },
    { name: tr('Precision', 'Precision'), a: r.baseline.precision, b: r.model.precision, aNone: r.baseline.undefined.precision, bNone: r.model.undefined.precision },
    { name: tr('Recall', 'Recall'), a: r.baseline.recall, b: r.model.recall },
    { name: tr('F1', 'F1'), a: r.baseline.f1, b: r.model.f1 },
  ];

  function drawBars(r) {
    const canvas = barCanvas, ctx = canvas.getContext('2d'), t = theme();
    const { width, height } = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const baseColor = clusterColor(-1), modelColor = clusterColor(2);
    const baseLabel = tr('Baseline (majority class)', 'Baseline (kelas mayoritas)'), modelLabel = tr('Logistic regression', 'Regresi logistik');
    // The legend sits on one row when it fits and on two rows on a phone.
    ctx.font = '600 12px system-ui, sans-serif';
    const wBase = ctx.measureText(baseLabel).width + 22, wModel = ctx.measureText(modelLabel).width + 22;
    const oneRow = wBase + wModel + 16 <= width - 20;
    const m = { l: 40, r: 10, t: oneRow ? 34 : 50, b: 28 };
    const W = width - m.l - m.r, H = height - m.t - m.b;
    const Y = v => m.t + H - v * H;
    ctx.fillStyle = t.plot; ctx.fillRect(m.l, m.t, W, H);
    ctx.font = '11px system-ui, sans-serif'; ctx.strokeStyle = t.grid; ctx.fillStyle = t.muted; ctx.lineWidth = 1; ctx.textAlign = 'right';
    ctx.beginPath();
    for (const v of [0, 0.25, 0.5, 0.75, 1]) { ctx.moveTo(m.l, Y(v)); ctx.lineTo(m.l + W, Y(v)); ctx.fillText(pct(v, 0), m.l - 6, Y(v) + 4); }
    ctx.stroke();
    // legend
    ctx.textAlign = 'left'; ctx.font = '600 12px system-ui, sans-serif';
    const items = [[baseColor, baseLabel, wBase], [modelColor, modelLabel, wModel]];
    let lx = m.l, ly = 12;
    items.forEach(([color, label, w]) => {
      ctx.fillStyle = color; ctx.fillRect(lx, ly - 9, 12, 12);
      ctx.fillStyle = t.ink; ctx.fillText(label, lx + 18, ly + 1);
      if (oneRow) lx += w + 16; else ly += 18;
    });
    // bars
    const groups = GROUPS(r), gw = W / groups.length, bw = Math.min(40, gw * 0.42);
    groups.forEach((gr, i) => {
      const cx = m.l + gw * (i + 0.5);
      [[gr.a, gr.aNone, baseColor, cx - bw - 2], [gr.b, gr.bNone, modelColor, cx + 2]].forEach(([v, none, color, x]) => {
        if (!none) { ctx.fillStyle = color; ctx.fillRect(x, Y(v), bw, v * H); }
        ctx.fillStyle = t.ink; ctx.font = `600 ${bw < 28 ? 10 : 11}px system-ui, sans-serif`; ctx.textAlign = 'center';
        ctx.fillText(none ? tr('n/a', 'n/a') : pct(v, 0), x + bw / 2, Y(none ? 0 : v) - 5);
      });
      ctx.fillStyle = t.muted; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(gr.name, cx, height - 9);
    });
  }

  function table(r) {
    const rows = [
      [tr('Accuracy', 'Accuracy'), score(r.baseline.accuracy), score(r.model.accuracy)],
      [tr('Precision', 'Precision'), score(r.baseline.precision, r.baseline.undefined.precision), score(r.model.precision, r.model.undefined.precision)],
      [tr('Recall', 'Recall'), score(r.baseline.recall), score(r.model.recall)],
      [tr('F1', 'F1'), score(r.baseline.f1), score(r.model.f1)],
      [tr('Positives found (true positives)', 'Positif terdeteksi (true positive)'), tr(`${fmt(r.baseline.tp)} of ${fmt(r.test.positives)}`, `${fmt(r.baseline.tp)} dari ${fmt(r.test.positives)}`), tr(`${fmt(r.model.tp)} of ${fmt(r.test.positives)}`, `${fmt(r.model.tp)} dari ${fmt(r.test.positives)}`)],
      [tr('Positives missed (false negatives)', 'Positif terlewat (false negative)'), fmt(r.baseline.fn), fmt(r.model.fn)],
      [tr('False alarms (false positives)', 'Alarm palsu (false positive)'), fmt(r.baseline.fp), fmt(r.model.fp)],
    ];
    const t = document.createElement('table');
    t.className = 'stats-table';
    t.innerHTML = '<thead><tr></tr></thead>';
    const head = t.querySelector('tr');
    for (const h of [tr('Measure', 'Ukuran'), tr('Baseline (majority class)', 'Baseline (kelas mayoritas)'), tr('Logistic regression', 'Regresi logistik')]) {
      const th = document.createElement('th'); th.textContent = h; head.append(th);
    }
    const body = document.createElement('tbody');
    rows.forEach(([name, a, b]) => {
      const row = body.insertRow();
      row.insertCell().textContent = name;
      row.insertCell().textContent = a;
      row.insertCell().textContent = b;
    });
    t.append(body);
    // On a phone the nowrap cells would make the table wider than its card: let them wrap and shrink.
    const style = document.createElement('style');
    style.textContent = '@media (max-width: 640px) { .stats-table { font-size: 12px; } .stats-table th, .stats-table td { white-space: normal; padding: 6px 5px; } .stats-table td:not(:first-child) { text-align: right; } .stats-table th:not(:first-child) { text-align: right; } }';
    lab.extraEl.replaceChildren(style, t);
  }

  function draw() {
    const share = controls.get('share'), weighted = controls.get('weighted'), threshold = controls.get('threshold');
    const v = view();
    dataNote.textContent = '';
    if (loading) {
      drawScatter(null, v, threshold);
      lab.setStatus(tr('Loading the penguin data…', 'Memuat data penguin…'));
      lab.setDetail(''); lab.setMetrics('');
      lab.setLegend([]);
      controls.disable('newSample', true);
      return;
    }
    controls.disable('newSample', false);
    const r = run(share, weighted, threshold);
    drawScatter(r, v, threshold);
    drawBars(r);
    table(r);
    dataNote.textContent = noteText(r);
    lab.setStatus(verdict(r));
    lab.setDetail(detailText(r, weighted, threshold));
    lab.setMetrics(tr(`${fmt(r.test.positives)} of ${fmt(r.test.n)} test examples are positive`, `${fmt(r.test.positives)} dari ${fmt(r.test.n)} contoh uji positif`));
    lab.setLegend([
      { kind: 'dot', color: clusterColor(0), label: tr('Negative', 'Negatif') },
      { kind: 'cross', color: clusterColor(1), label: tr('Positive', 'Positif') },
      { kind: 'dash', color: theme().ink, label: tr('Decision boundary (shaded: model says positive)', 'Decision boundary (arsiran: model menjawab positif)') },
    ]);
    lab.describe(lab.canvas, tr(
      `${fmt(r.test.n)} test examples, ${fmt(r.test.positives)} positive. The model, at threshold ${fmt(threshold, { digits: 2 })}, finds ${fmt(r.model.tp)} of them and raises ${fmt(r.model.fp)} false alarms.`,
      `${fmt(r.test.n)} contoh uji, ${fmt(r.test.positives)} positif. Model, pada threshold ${fmt(threshold, { digits: 2 })}, menemukan ${fmt(r.model.tp)} di antaranya dan memberi ${fmt(r.model.fp)} alarm palsu.`));
    lab.describe(barCanvas, GROUPS(r).map(gr => tr(
      `${gr.name}: baseline ${score(gr.a, gr.aNone)}, model ${score(gr.b, gr.bNone)}.`,
      `${gr.name}: baseline ${score(gr.a, gr.aNone)}, model ${score(gr.b, gr.bNone)}.`)).join(' '));
  }

  // After any change that is complete: redraw, then check the prediction.
  function settle() { draw(); revealPrediction(); }

  lab.onReset(() => {
    loadToken += 1;
    mode = 'generated'; seed = DEFAULTS.seed; loading = false; loadFailed = false; cache = new Map();
    controls.set('data', 'generated'); controls.set('share', DEFAULTS.share); controls.set('weighted', false); controls.set('threshold', DEFAULTS.threshold);
    box.reset();
    draw();
  });
  lab.onTheme(draw);
  lab.onResize(draw);
  draw();
  return lab.destroy;
}
