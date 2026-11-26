// Overfit lab: a noisy curve (or real penguin measurements) is split into training and validation
// points. Fit a polynomial to the training points only, then see how it does on points it has not
// seen. The learner first predicts the degree where validation error starts rising, then sweeps the
// degree slider; the validation curve fills in as degrees are tried, and "Check my prediction"
// shows the whole curve and the answer.
// The math (sample, split, errors per degree, verdict) lives in sims/ml/overfitdemo.js; the real-data
// helpers and the answer bands live in sims/ml/overfitreal.js.
import { createLab, createPlot, drawLineChart, clusterColor, theme, tr, fmt, predictBox, dataModeSpec, loadDataset } from '../kit/index.js';
import {
  DEFAULTS, MAX_DEGREE, TOTAL_POINTS, truth, sampleCurve, splitSample, errorsByDegree,
  curvePoints, verdict, formatError, chartRuns,
} from '../ml/overfitdemo.js';
import { parseCsv } from '../ml/tabular.js';
import { missClause } from '../ml/overfittext.js';
import { REAL_FEATURES, completeRows, realScale, sampleReal, typicalMiss, PREDICT_BANDS, bandKey, bandOf } from '../ml/overfitreal.js';

const FIT_COLOR = () => clusterColor(2);
// The lab starts at degree 1 so the validation error of a flexible fit is not on screen before the learner predicts.
const START_DEGREE = 1;

// loadDataset (sims/kit/data.js) caches a rejected promise, so after one failed fetch it fails until the
// page is reloaded. A retry therefore fetches the file directly instead of asking the cache again.
const fetchPenguins = () => fetch(new URL('../../data/penguins.csv', import.meta.url)).then(r => {
  if (!r.ok) throw new Error(`dataset penguins: HTTP ${r.status}`);
  return r.text();
}).then(parseCsv);

// Language-aware versions of verdict() and formatError() from sims/ml/overfitdemo.js (which stay
// language-free): the lab turns their results into text for the current language here.
const VERDICTS = { 'about right': ['about right', 'sudah sesuai'], underfitting: ['underfitting', 'underfitting'], overfitting: ['overfitting', 'overfitting'] };
const verdictText = (errs, degree) => { const v = VERDICTS[verdict(errs, degree)]; return tr(v[0], v[1]); };
const errorText = e => (formatError(e) === 'over 1000' ? tr('over 1000', 'di atas 1000') : fmt(e, { digits: 2 }));

const canvasLabelFor = real => (real
  ? tr('Plot of penguin training points, validation points and the fitted polynomial, with both measurements rescaled to 0 to 10', 'Plot titik training dan titik validasi data penguin serta kurva polinomial hasil fit, dengan kedua pengukuran diskalakan ke 0 sampai 10')
  : tr('Plot of training points, validation points, the true curve and the fitted polynomial', 'Plot titik training, titik validasi, kurva asli, dan kurva polinomial hasil fit'));

export function mount(root) {
  let alive = true;
  const lab = createLab(root, {
    title: tr('Fit a curve, then test it', 'Fit kurva, lalu uji'),
    hint: tr('Only the dots are used to fit the curve. The crosses are held back and used to check it.', 'Kurva di-fit hanya dari titik bulat. Titik silang disisihkan untuk mengujinya.'),
    status: true, legend: true,
    canvasLabel: canvasLabelFor(false),
    settingsTitle: tr('Controls', 'Pengaturan'),
    extra: {
      title: tr('Error at every degree', 'Error di setiap derajat'),
      hint: tr('Mean squared error: the average of the squared gaps between the curve and the points. Lower is better.', 'Mean squared error: rata-rata selisih kuadrat antara kurva dan titik. Semakin kecil semakin baik.'),
    },
  });
  lab.cleanup(() => { alive = false; });
  const plot = createPlot(lab.canvas, { xLabel: 'x', yLabel: 'y' });

  // Predict first: pick a band of degrees, then sweep the degree slider and check.
  const box = predictBox(lab.ref('below'), {
    question: tr(
      `You will raise the polynomial degree from 1 up to ${MAX_DEGREE}. At which degree will the validation error stop falling and start to rise?`,
      `Kamu akan menaikkan derajat polinomial dari 1 sampai ${MAX_DEGREE}. Pada derajat berapa validation error berhenti turun dan mulai naik?`),
    choices: PREDICT_BANDS.map(b => [bandKey(b), tr(`Degree ${b[0]}–${b[1]}`, `Derajat ${b[0]}–${b[1]}`)]),
    name: 'overfit-predict',
  });

  const chart = lab.chartCard(
    tr('Training and validation error against degree', 'Training error dan validation error per derajat'),
    tr('An error above the top of the chart is shown as a triangle with its value, and the dashed line leading to it is cut off. The vertical dashed line is the degree you chose. Before you check your prediction, the validation line only shows the degrees you have tried; after it, the ring marks the lowest validation error.', 'Error yang melewati batas atas grafik ditampilkan sebagai segitiga beserta nilainya, dan garis putus-putus menuju titik itu dipotong. Garis putus-putus vertikal = derajat pilihanmu. Sebelum prediksimu dicek, garis validation hanya menampilkan derajat yang sudah kamu coba; sesudahnya, lingkaran menandai validation error terendah.'),
    260,
  );
  // Names for the two chart lines, as a legend above the chart (built once, themed through the line colors).
  const chartLegend = document.createElement('div');
  chartLegend.className = 'legend';
  chart.closest('.chart').before(chartLegend);

  // seed/key/run: the current sample. table: the parsed penguins (null until loaded).
  // revealed/seen: this round's prediction state (seen = degrees the learner has tried).
  const state = { seed: DEFAULTS.seed, key: '', run: null, table: null, loading: false, failed: false, poisoned: false, revealed: false, seen: new Set([START_DEGREE]) };

  const controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real data)', 'Penguin (data nyata)')]] }),
    { name: 'xcol', type: 'select', label: tr('Penguin feature (x)', 'Fitur penguin (x)'), options: [['flipper', tr('Flipper length (mm)', 'Panjang flipper (mm)')], ['bill', tr('Bill length (mm)', 'Panjang paruh (mm)')]], value: 'flipper' },
    { name: 'degree', type: 'range', label: tr('Polynomial degree', 'Derajat polinomial'), min: 1, max: MAX_DEGREE, step: 1, value: START_DEGREE },
    { name: 'noise', type: 'range', label: tr('Noise', 'Noise'), min: 0, max: 1.5, step: 0.05, value: DEFAULTS.noise, format: v => fmt(v, { digits: 2 }) },
    { name: 'train', type: 'number', label: tr(`Training points (out of ${TOTAL_POINTS})`, `Titik training (dari ${TOTAL_POINTS})`), min: 6, max: TOTAL_POINTS - 4, step: 1, value: DEFAULTS.train },
    { name: 'showValidation', type: 'toggle', label: tr('Show validation points', 'Tampilkan titik validasi'), value: true },
    { name: 'fresh', type: 'button', label: tr('New sample', 'Sampel baru'), onClick: () => { state.seed += 1; newRound(); draw(); } },
    { name: 'check', type: 'button', label: tr('Check my prediction', 'Cek prediksiku'), onClick: () => { state.revealed = true; draw(); revealAnswer(); } },
    { type: 'note', text: tr('The points not used for training become validation points. Move the degree slider one step at a time and watch the validation error: the lowest point of its curve is the answer to the prediction below the plot.', 'Titik yang tidak dipakai untuk training otomatis menjadi titik validasi. Geser slider derajat selangkah demi selangkah dan perhatikan validation error: titik terendah kurvanya adalah jawaban prediksi di bawah plot.') },
  ], onControl);
  // What the data switch is doing right now (real data: which rows, what scale), under the controls.
  const dataNote = document.createElement('p');
  dataNote.className = 'hint';
  controls.el.append(dataNote);

  const mode = v => (v.data === 'penguins' && state.table ? 'real' : 'generated');
  const prepared = {};
  const realRows = col => {
    if (!prepared[col]) {
      const c = completeRows(state.table, REAL_FEATURES[col]);
      prepared[col] = { ...c, scale: realScale(c.rows) };
    }
    return prepared[col];
  };

  // A new round: the sample or its settings changed, so the old prediction no longer applies.
  function newRound() {
    state.revealed = false;
    state.seen = new Set([controls.values().degree]);
    box.reset();
  }

  function onControl(name) {
    if (name === 'degree') { state.seen.add(controls.values().degree); draw(); return; }
    if (name === 'showValidation') { draw(); return; }
    if (name === 'data' && controls.values().data === 'penguins' && !state.table && !state.loading) {
      state.loading = true; state.failed = false;
      (state.poisoned ? fetchPenguins() : loadDataset('penguins')).then(table => { state.table = table; }).catch(() => {
        state.failed = true; state.poisoned = true;
        controls.set('data', 'generated');
      }).finally(() => {
        state.loading = false;
        if (!alive) return;
        // The learner may have switched back to Generated while the file loaded: then the plot did not
        // change, so keep their prediction and only refresh the note.
        if (controls.values().data === 'penguins') newRound();
        draw();
      });
    }
    newRound();
    draw();
  }

  box.onCheck(() => { state.revealed = true; draw(); revealAnswer(); });
  function revealAnswer() {
    const best = state.run.errs.best;
    box.reveal(bandOf(best), best >= MAX_DEGREE
      ? tr(`Validation error is lowest at degree ${best}: on this sample it never started rising within ${MAX_DEGREE} degrees.`, `Validation error paling kecil di derajat ${best}: pada sampel ini nilainya tidak mulai naik sampai derajat ${MAX_DEGREE}.`)
      : tr(`Validation error is lowest at degree ${best}. Higher degrees fit the training points more closely, but do worse on the validation points.`, `Validation error paling kecil di derajat ${best}. Derajat yang lebih tinggi mencocokkan titik training lebih rapat, tetapi hasilnya lebih buruk pada titik validasi.`));
  }

  // The sample, split and per-degree errors only change with the data, seed, noise and split size.
  function compute(v) {
    const real = mode(v) === 'real';
    const key = `${real ? `real-${v.xcol}` : 'gen'}|${state.seed}|${real ? '' : v.noise}|${v.train}`;
    if (state.key !== key) {
      const points = real
        ? sampleReal(realRows(v.xcol).rows, realRows(v.xcol).scale, state.seed, TOTAL_POINTS)
        : sampleCurve(state.seed, { n: TOTAL_POINTS, noise: v.noise });
      const { train, validation } = splitSample(points, v.train, state.seed);
      state.run = { train, validation, errs: errorsByDegree(train, validation) };
      state.key = key;
    }
    return state.run;
  }

  // The error table. Degrees run across (one column each) while that fits the card. On a phone it would
  // be wider than the card and cut off the current degree, so then it turns around: one row per degree,
  // with the training and validation errors as columns.
  function table(errs, degree) {
    const seen = d => state.revealed || state.seen.has(d);
    const best = d => (state.revealed && d === errs.best ? `${d} ${tr('(best)', '(terbaik)')}` : String(d));
    const mark = (cell, on, bold) => { if (on) { cell.style.background = 'var(--accent-soft)'; if (bold) cell.style.fontWeight = '700'; } };
    const trainLabel = tr('Training error', 'Training error'), valLabel = tr('Validation error', 'Validation error');
    const val = (d, i) => (seen(d) ? errorText(errs.validation[i]) : '?');

    const wide = document.createElement('table');
    const head = wide.createTHead().insertRow();
    head.insertCell().textContent = tr('Degree', 'Derajat');
    errs.degrees.forEach(d => { const th = head.insertCell(); th.textContent = best(d); mark(th, d === degree, false); });
    const body = wide.createTBody();
    for (const [name, cell] of [[trainLabel, (d, i) => errorText(errs.train[i])], [valLabel, val]]) {
      const row = body.insertRow();
      row.insertCell().textContent = name;
      errs.degrees.forEach((d, i) => { const td = row.insertCell(); td.textContent = cell(d, i); mark(td, d === degree, true); });
    }
    lab.extraEl.replaceChildren(wide);
    if (lab.extraEl.scrollWidth <= lab.extraEl.clientWidth + 1) return;

    const narrow = document.createElement('table');
    narrow.className = 'of-table';
    const nHead = narrow.createTHead().insertRow();
    for (const h of [tr('Degree', 'Derajat'), trainLabel, valLabel]) nHead.insertCell().textContent = h;
    const nBody = narrow.createTBody();
    errs.degrees.forEach((d, i) => {
      const row = nBody.insertRow();
      row.insertCell().textContent = best(d);
      row.insertCell().textContent = errorText(errs.train[i]);
      row.insertCell().textContent = val(d, i);
      for (const td of row.cells) mark(td, d === degree, true);
    });
    const style = document.createElement('style');
    style.textContent = '.of-table { width: 100%; font-size: 13px; } .of-table th, .of-table td { white-space: nowrap; padding: 5px 8px; } .of-table td:not(:first-child), .of-table th:not(:first-child) { text-align: right; }';
    lab.extraEl.replaceChildren(style, narrow);
  }

  // Short number for a label above a clipped point.
  const clipLabel = e => (!Number.isFinite(e) || e > 1000 ? '>1000' : fmt(e, { digits: e >= 100 ? 0 : 1 }));

  function drawChart(errs, degree) {
    const cap = 1.2 * Math.max(errs.train[0], errs.validation[0], 0.05);
    // Until the prediction is checked, the validation line only covers the degrees the learner has tried.
    const shown = errs.degrees.filter(d => state.revealed || state.seen.has(d));
    const lines = [
      { xs: errs.degrees, vals: errs.train, color: clusterColor(0) },
      { xs: shown, vals: shown.map(d => errs.validation[d - 1]), color: clusterColor(1) },
    ].map(l => ({ ...l, ...chartRuns(l.xs, l.vals, cap) }));
    // Lines and markers are drawn here (not by drawLineChart): an error above the cap gets a dashed
    // segment and a triangle with its value, so it reads as cut off and not as a real plateau.
    const series = lines.flatMap(l => l.runs.map(r => ({ xs: r.xs, ys: r.ys, color: l.color, points: false, dash: r.clipped })));
    const { X, Y } = drawLineChart(chart, {
      series,
      xLabel: tr('Polynomial degree', 'Derajat polinomial'), yLabel: tr('Mean squared error', 'Mean squared error'), xMin: 1, xMax: MAX_DEGREE, yMin: 0, yMax: cap * 1.3,
      markerX: degree, integerX: true,
    });
    const ctx = chart.getContext('2d'), t = theme();
    ctx.save();
    ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center';
    const spacing = X(2) - X(1);
    for (const l of lines) {
      ctx.fillStyle = l.color;
      l.points.forEach((p, i) => {
        const px = X(p.x), py = Y(p.y);
        ctx.beginPath();
        if (p.clipped) { ctx.moveTo(px, py - 6); ctx.lineTo(px - 5.5, py + 3.5); ctx.lineTo(px + 5.5, py + 3.5); ctx.closePath(); } else ctx.arc(px, py, 3.6, 0, 2 * Math.PI);
        ctx.fill();
        // Two rows of labels, so neighbours on a narrow chart do not run into each other.
        if (p.clipped) ctx.fillText(clipLabel(l.vals[i]), px, py - 10 - (spacing < 36 && p.x % 2 ? 12 : 0));
      });
    }
    ctx.fillStyle = t.ink; ctx.font = '600 12px system-ui, sans-serif';
    if (state.revealed) {
      // Ring the lowest validation error and name it.
      const bx = X(errs.best), by = Y(Math.min(errs.validation[errs.best - 1], cap));
      ctx.beginPath(); ctx.arc(bx, by, 8, 0, 2 * Math.PI); ctx.lineWidth = 2.5; ctx.strokeStyle = t.ink; ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillText(tr(`best: degree ${errs.best}`, `terbaik: derajat ${errs.best}`), bx + 12, by - 14);
    }
    // Label the dashed line; near the right edge the label sits to its left so it is not cut off.
    ctx.textAlign = degree >= MAX_DEGREE - 1 ? 'right' : 'center';
    ctx.fillText(tr(`your degree: ${degree}`, `pilihanmu: ${degree}`), degree >= MAX_DEGREE - 1 ? X(degree) - 6 : X(degree), 26);
    ctx.restore();
  }

  function draw() {
    const v = controls.values();
    const real = mode(v) === 'real';
    controls.disable('xcol', !real);
    controls.disable('noise', real);
    lab.canvas.setAttribute('aria-label', canvasLabelFor(real));
    const { train, validation, errs } = compute(v);
    const fit = errs.fits[v.degree - 1];
    plot.setLabels(
      real ? (v.xcol === 'bill' ? tr('Bill length (scaled 0–10)', 'Panjang paruh (skala 0–10)') : tr('Flipper length (scaled 0–10)', 'Panjang flipper (skala 0–10)')) : 'x',
      real ? tr('Body mass (scaled 0–10)', 'Massa tubuh (skala 0–10)') : 'y');
    const g = plot.begin();
    plot.clip(() => {
      const { ctx } = plot;
      if (!real) {
        ctx.save(); ctx.globalAlpha = 0.55;
        plot.polyline(Array.from({ length: 101 }, (_, i) => ({ x: i / 10, y: truth(i / 10) })), { color: g.t.muted, width: 2, dash: [5, 5] });
        ctx.restore();
      }
      plot.polyline(curvePoints(fit), { color: FIT_COLOR(), width: 3 });
    });
    train.forEach(p => plot.dot(p.x, p.y, clusterColor(0), 5));
    if (v.showValidation) validation.forEach(p => plot.cross(p.x, p.y, clusterColor(1), 4.5));
    const trainErr = errs.train[v.degree - 1], valErr = errs.validation[v.degree - 1];
    const bestErr = errorText(errs.validation[errs.best - 1]);
    const errorsNow = tr(`Training error ${errorText(trainErr)}, validation error ${errorText(valErr)}.`, `Training error ${errorText(trainErr)}, validation error ${errorText(valErr)}.`);
    lab.setStatus(state.revealed
      ? tr(`Degree ${v.degree}: ${verdictText(errs.validation, v.degree)}. ${errorsNow}`, `Derajat ${v.degree}: ${verdictText(errs.validation, v.degree)}. ${errorsNow}`)
      : tr(`Degree ${v.degree}. ${errorsNow}`, `Derajat ${v.degree}. ${errorsNow}`));
    const counts = tr(`${train.length} training and ${validation.length} validation points.`, `Ada ${train.length} titik training dan ${validation.length} titik validasi.`);
    let detail = state.revealed
      ? tr(`Lowest validation error is at degree ${errs.best} (${bestErr}). ${counts}`, `Validation error paling kecil ada di derajat ${errs.best} (${bestErr}). ${counts}`)
      : tr(`Lowest validation error: hidden until you check your prediction. ${counts}`, `Validation error terkecil: disembunyikan sampai prediksimu dicek. ${counts}`);
    if (real) {
      const miss = missClause(typicalMiss(valErr, realRows(v.xcol).scale), n => fmt(n, { digits: 0 }));
      detail += ' ' + tr(`At this degree a validation penguin ${miss.en}.`, `Pada derajat ini, tebakan massa untuk penguin validasi ${miss.id}.`);
    }
    lab.setDetail(detail);
    if (real) {
      const r = realRows(v.xcol);
      dataNote.textContent = tr(
        `Real data: Palmer penguins. ${r.dropped} of ${r.total} rows have a missing value (NA) and were left out, which leaves ${r.rows.length} penguins. The lab draws ${TOTAL_POINTS} of them at random. Both columns are rescaled to the 0–10 plot, so errors are in plot units, not grams. Noise only applies to generated data.`,
        `Data nyata: penguin Palmer. ${r.dropped} dari ${r.total} baris punya missing value (NA) dan dibuang, sehingga tersisa ${r.rows.length} penguin. Lab mengambil ${TOTAL_POINTS} di antaranya secara acak. Kedua kolom diskalakan ke plot 0–10, jadi error dinyatakan dalam satuan plot, bukan gram. Noise hanya berlaku untuk data buatan.`);
    } else if (v.data === 'penguins') {
      dataNote.textContent = tr('Loading the penguin data…', 'Memuat data penguin…');
    } else {
      const only = tr('The penguin feature only applies to real data.', 'Fitur penguin hanya berlaku untuk data nyata.');
      dataNote.textContent = state.failed
        ? tr(`The penguin data could not be loaded, so the generated data is shown. Choose Penguins (real data) again to retry. ${only}`, `Data penguin tidak dapat dimuat, jadi data buatan yang ditampilkan. Pilih Penguin (data nyata) lagi untuk mencoba ulang. ${only}`)
        : only;
    }
    lab.setLegend([
      { kind: 'dot', color: clusterColor(0), label: tr('Training (dots)', 'Training (bulat)') },
      ...(v.showValidation ? [{ kind: 'dot', color: clusterColor(1), label: tr('Validation (crosses)', 'Validasi (silang)') }] : []),
      ...(real ? [] : [{ kind: 'dot', color: g.t.muted, label: tr('True curve', 'Kurva asli') }]),
      { kind: 'dot', color: FIT_COLOR(), label: tr('Fitted curve', 'Kurva hasil fit') },
    ]);
    table(errs, v.degree);
    chartLegend.replaceChildren(...[[tr('Training error', 'Training error'), 0], [tr('Validation error', 'Validation error'), 1]].map(([label, i]) => {
      const span = document.createElement('span'), dot = document.createElement('i');
      dot.className = 'dot'; dot.style.background = clusterColor(i);
      span.append(dot, ` ${label}`);
      return span;
    }));
    drawChart(errs, v.degree);
  }

  lab.onReset(() => {
    state.seed = DEFAULTS.seed;
    state.failed = false;
    controls.set('data', 'generated');
    controls.set('xcol', 'flipper');
    controls.set('degree', START_DEGREE);
    for (const name of ['noise', 'train']) controls.set(name, DEFAULTS[name]);
    controls.set('showValidation', true);
    newRound();
    draw();
  });
  lab.onTheme(draw);
  lab.onResize(draw);
  draw();
  return lab.destroy;
}
