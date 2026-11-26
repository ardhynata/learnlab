// Mini-batch lab, built on the kit: three optimisers walk down the same loss surface (the MSE of a line over
// slope and intercept) from the same start with the same learning rate. Full batch uses every point for each
// step, mini-batch uses a group, SGD uses one point. The contour plot shows the three paths, a second chart
// shows the loss after each epoch, a table the steps taken, the final loss and the wobble. Generated data, or
// the penguins (flipper length -> body mass, rows with a missing value dropped, both axes standardised).
// The math is in sims/ml/sgdcompare.js (the runs) and sims/ml/minibatchlab.js (data, view, reading the runs).
import { createLab, createPlot, drawLineChart, dataModeSpec, loadDataset, predictBox, clusterColor, tr, fmt } from '../kit/index.js';
import { contours } from '../ml/gd.js';
import { contourLevels } from '../ml/gdview.js';
import { run, leastSquares } from '../ml/sgdcompare.js';
import { generatedData, penguinData, GENERATED_N, VIEW, START, toPlot, lossOnPlot, readRuns, NAMES } from '../ml/minibatchlab.js';

const DEFAULTS = { logLr: Math.log10(0.05), batch: 16, epochs: 10, seed: 1 };
const LOG_MIN = Math.log10(0.005), LOG_MAX = Math.log10(0.6);
const MAX_EPOCHS = 30;
const HUGE = 1e4; // a loss this large is shown as a word: the number would be a long row of digits

const lrOf = logLr => Number((10 ** logLr).toPrecision(2)); // two digits, so the number shown is the number used
const fmtLr = logLr => fmt(lrOf(logLr), { max: 4 });
const fmtLoss = v => (Number.isFinite(v) && Math.abs(v) < HUGE ? fmt(v, { digits: 2 }) : tr('huge', 'besar sekali'));

// Names and colors of the three optimisers; built at draw time so they follow the language and the theme.
const names = batch => ({
  full: tr('Full batch', 'Full batch'),
  mini: tr(`Mini-batch (${fmt(batch)})`, `Mini-batch (${fmt(batch)})`),
  sgd: tr('SGD', 'SGD'),
});
// The series names of the loss chart: a run that blew up says so, since its line leaves the chart.
const chartName = (nm, n, blew) => (blew ? tr(`${nm[n]} (blew up)`, `${nm[n]} (meledak)`) : nm[n]);
const shortNames = () => ({ full: tr('full batch', 'full batch'), mini: tr('mini-batch', 'mini-batch'), sgd: tr('SGD', 'SGD') });
const colorOf = name => clusterColor(NAMES.indexOf(name));

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Full batch, mini-batch and SGD', 'Full batch, mini-batch, dan SGD'),
    hint: tr('Three optimisers start at the same ring with the same learning rate and walk downhill on the loss contours. Full batch uses every point for each step, mini-batch a group of the chosen size, SGD one point. Run replays the walks one epoch at a time.',
      'Tiga optimizer mulai dari cincin yang sama dengan learning rate yang sama, lalu menuruni garis kontur loss. Full batch memakai semua titik untuk tiap langkah, mini-batch sekelompok titik sebesar ukuran yang dipilih, SGD satu titik. Jalankan memutar ulang perjalanannya satu epoch demi satu epoch.'),
    playback: true, status: true, legend: true,
    canvasLabel: tr('Contour plot of the loss over slope and intercept, with the paths of full batch, mini-batch and SGD. Press Run to replay them epoch by epoch.',
      'Plot kontur loss terhadap slope dan intercept, beserta jalur full batch, mini-batch, dan SGD. Tekan Jalankan untuk memutar ulang epoch demi epoch.'),
    settingsTitle: tr('Settings', 'Pengaturan'),
    extra: {
      title: tr('Steps, loss and wobble of the three optimisers', 'Langkah, loss, dan goyangan ketiga optimizer'),
      hint: tr('Wobble is the share of a walk that made no progress: 0 is a straight line, close to 1 is mostly zigzag. A low loss means within 5% of the way from the starting loss down to the best line. With a small learning rate SGD usually needs the fewest epochs but takes the most steps, so compare Steps taken too.',
        'Goyangan adalah bagian dari sebuah jalur yang tidak membawa kemajuan: 0 berarti garis lurus, mendekati 1 berarti hampir semuanya zigzag. Loss rendah artinya sudah berada dalam 5% dari jarak antara loss awal dan garis terbaik. Dengan learning rate kecil, SGD biasanya butuh epoch paling sedikit tetapi mengambil langkah paling banyak, jadi bandingkan juga Langkah yang diambil.'),
    },
  });
  const plot = createPlot(lab.canvas, { xLabel: '', yLabel: '' });
  const chart = lab.chartCard(tr('Loss after each epoch', 'Loss di akhir tiap epoch'),
    tr('Dashed line: the lowest loss any straight line can reach. Full batch takes one step per epoch, SGD takes one step per point, so with a small learning rate SGD usually gets down within the first epoch.',
      'Garis putus-putus: loss terendah yang dapat dicapai garis lurus mana pun. Full batch mengambil satu langkah per epoch, SGD satu langkah per titik, sehingga dengan learning rate kecil SGD biasanya sudah turun jauh di epoch pertama.'), 240);
  const chartHint = chart.closest('section').querySelector('p.hint');
  const chartHintBase = chartHint ? chartHint.textContent : '';
  // The chart's own legend sits under it, not inside it, so it can never cover a line.
  const chartLegend = document.createElement('div');
  chartLegend.className = 'legend';
  chartLegend.setAttribute('aria-hidden', 'true');
  chart.closest('.chart').after(chartLegend);

  let mode = 'generated', real = null, loading = false, loadFailed = false, loadToken = 0, destroyed = false;
  let data = generatedData(DEFAULTS.seed), dataSeed = DEFAULTS.seed;
  let runs = null, best = null, read = null, finalRead = null, contourCache = null;

  const controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real)', 'Penguin (data nyata)')]] }),
    { name: 'logLr', type: 'range', label: tr('Learning rate', 'Learning rate'), min: LOG_MIN, max: LOG_MAX, step: 0.01, value: DEFAULTS.logLr, format: fmtLr },
    { name: 'batch', type: 'range', label: tr('Batch size (mini-batch)', 'Ukuran batch (mini-batch)'), min: 2, max: GENERATED_N, step: 1, value: DEFAULTS.batch },
    { name: 'epochs', type: 'range', label: tr('Epochs', 'Epoch'), min: 1, max: MAX_EPOCHS, step: 1, value: DEFAULTS.epochs },
    { name: 'seed', type: 'number', label: tr('Seed', 'Seed'), min: 1, max: 999, step: 1, value: DEFAULTS.seed },
    { type: 'note', text: tr('The seed sets the order in which SGD and mini-batch pick points, and the generated sample. Use Next step to move one epoch at a time.',
      'Seed menentukan urutan titik yang dipilih SGD dan mini-batch, serta sampel data buatan. Pakai Langkah berikutnya untuk maju satu epoch.') },
  ], onChange);
  const sliders = controls.el.querySelectorAll('input[type=range]');
  const batchSlider = sliders[1];
  const dataNote = document.createElement('p');
  dataNote.className = 'hint';
  dataNote.setAttribute('role', 'status');
  controls.el.querySelector('select').closest('label').after(dataNote);

  const box = predictBox(lab.ref('below'), {
    hint: tr('Wait for the data to load, then check again.', 'Tunggu sampai data selesai dimuat, lalu periksa lagi.'),
    name: 'predict-paths',
    question: tr('With the same learning rate, which path is noisiest, and which reaches a low loss in the fewest epochs?',
      'Dengan learning rate yang sama, jalur mana yang paling noisy, dan mana yang mencapai loss rendah dalam epoch paling sedikit?'),
    choices: [
      ['sgd-sgd', tr('SGD is the noisiest and reaches a low loss in the fewest epochs', 'SGD paling noisy dan mencapai loss rendah dalam epoch paling sedikit')],
      ['sgd-mini', tr('SGD is the noisiest, but mini-batch reaches a low loss in the fewest epochs', 'SGD paling noisy, tetapi mini-batch mencapai loss rendah dalam epoch paling sedikit')],
      ['sgd-full', tr('SGD is the noisiest, but full batch reaches a low loss in the fewest epochs', 'SGD paling noisy, tetapi full batch mencapai loss rendah dalam epoch paling sedikit')],
      ['full-sgd', tr('Full batch is the noisiest, and SGD reaches a low loss in the fewest epochs', 'Full batch paling noisy, dan SGD mencapai loss rendah dalam epoch paling sedikit')],
      ['same', tr('No path is noisy: all three are smooth', 'Tidak ada jalur yang noisy: ketiganya mulus')],
      ['other', tr('Something else', 'Hal lain')],
    ],
  });
  lab.cleanup(() => box.destroy());
  const CHOICE_KEYS = ['sgd-sgd', 'sgd-mini', 'sgd-full', 'full-sgd', 'same'];

  // ---- the runs ------------------------------------------------------------------

  const options = () => ({ lr: lrOf(controls.get('logLr')), batch: controls.get('batch'), epochs: controls.get('epochs'), seed: controls.get('seed') });

  function recompute() {
    const { lr, batch, epochs, seed } = options();
    if (dataSeed !== seed && mode === 'generated') { data = generatedData(seed); dataSeed = seed; contourCache = null; }
    const common = { data, start: START, lr, epochs, seed };
    runs = {
      full: run({ ...common, batchSize: data.length }),
      mini: run({ ...common, batchSize: Math.min(batch, data.length) }),
      sgd: run({ ...common, batchSize: 1 }),
    };
    best = leastSquares(data);
    finalRead = readRuns(runs, data);
  }

  // Contour segments of the loss over the plot square, cached per data set (the lines do not depend on the paths).
  function contourSet() {
    if (!contourCache) {
      const f = lossOnPlot(data), { levels } = contourLevels(f, 12);
      contourCache = contours(f, levels, 70);
    }
    return contourCache;
  }

  // ---- the stepper: one step is one epoch of every optimiser ---------------------------

  // The first state is the finished run (so the plot is meaningful at once), not yet "played"; Run or Next step
  // from there starts at epoch 1, and Run when finished starts over.
  const fresh = () => ({ epoch: options().epochs, played: false });
  const stepper = lab.stepper({
    init: fresh,
    step: s => ({ epoch: s.played ? s.epoch + 1 : 1, played: true }),
    isDone: s => s.played && s.epoch >= options().epochs,
    render,
    delay: () => 650,
  });

  // ---- drawing -------------------------------------------------------------------

  // The part of a run's path that is drawn: up to `steps`, and never past the point where the loss blew up.
  function visiblePath(r, steps) {
    const l0 = r.lossPerStep[0], pts = [];
    for (let i = 0; i <= steps; i++) {
      if (!(r.lossPerStep[i] <= 10 * l0)) break;
      pts.push(toPlot(r.path[i]));
    }
    return pts;
  }

  function axes(g) {
    const ctx = plot.ctx;
    ctx.clearRect(0, 0, g.px(0) - 2, g.height);
    ctx.clearRect(0, g.py(0) + 2, g.width, g.height);
    ctx.save();
    ctx.fillStyle = g.t.muted; ctx.font = '11px system-ui, sans-serif';
    for (let i = 0; i <= 5; i++) {
      ctx.textAlign = 'center'; ctx.fillText(fmt(VIEW.slope[0] + i * (VIEW.slope[1] - VIEW.slope[0]) / 5, { max: 1 }), g.px(i * 2), g.py(0) + 16);
      ctx.textAlign = 'right'; ctx.fillText(fmt(VIEW.intercept[0] + i * (VIEW.intercept[1] - VIEW.intercept[0]) / 5, { max: 1 }), g.px(0) - 7, g.py(i * 2) + 4);
    }
    ctx.textAlign = 'center'; ctx.fillText(tr('Slope (standardised)', 'Slope (terstandar)'), g.px(5), g.height - 5);
    // On a phone the strip left of the plot is only about 31px: keep the title inside the canvas.
    ctx.translate(Math.max(10, g.px(0) - 27), g.py(5)); ctx.rotate(-Math.PI / 2); ctx.fillText(tr('Intercept (standardised)', 'Intercept (terstandar)'), 0, 0);
    ctx.restore();
  }

  function drawPlot(epoch) {
    const g = plot.begin(), ctx = plot.ctx;
    axes(g);
    plot.clip(() => {
      ctx.save();
      ctx.strokeStyle = g.t.muted; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
      ctx.beginPath();
      for (const { segments } of contourSet()) for (const [a, b] of segments) { ctx.moveTo(plot.px(a.x), plot.py(a.y)); ctx.lineTo(plot.px(b.x), plot.py(b.y)); }
      ctx.stroke();
      ctx.restore();
      // SGD first (thin, behind), then mini-batch, then the smooth full-batch path on top.
      for (const name of ['sgd', 'mini', 'full']) {
        const r = runs[name], upTo = Math.min(r.stepsTaken, Math.round(epoch * r.stepsPerEpoch));
        plot.polyline(visiblePath(r, upTo), { color: colorOf(name), width: name === 'full' ? 3.4 : name === 'mini' ? 2.4 : 1.4 });
      }
    });
    const b = toPlot(best), s = toPlot(START);
    plot.diamond(b.x, b.y, g.t.plot, 8);
    plot.ring(s.x, s.y, g.t.ink, 9, 2.5);
    // Where each walk is now: ring for full batch, diamond for mini-batch, cross for SGD.
    for (const name of NAMES) {
      const r = runs[name], upTo = Math.min(r.stepsTaken, Math.round(epoch * r.stepsPerEpoch));
      const pts = visiblePath(r, upTo);
      if (!pts.length || pts.length < upTo + 1) continue; // a blown-up walk has left the plot: no marker
      const p = pts.at(-1);
      if (name === 'full') plot.ring(p.x, p.y, colorOf(name), 8, 3);
      else if (name === 'mini') plot.diamond(p.x, p.y, colorOf(name), 6);
      else plot.cross(p.x, p.y, colorOf(name), 5);
    }
    const nm = names(options().batch);
    lab.setLegend([
      { kind: 'line', color: colorOf('full'), label: nm.full },
      { kind: 'line', color: colorOf('mini'), label: nm.mini },
      { kind: 'line', color: colorOf('sgd'), label: nm.sgd },
      { kind: 'ring', color: g.t.ink, label: tr('Start', 'Awal') },
      { kind: 'diamond', color: g.t.plot, label: tr('Best line', 'Garis terbaik') },
    ]);
  }

  // Draws the loss chart and returns true when some loss is above the top of it (the axis is cut to the
  // interesting part, so the start of a high-learning-rate run and a blown-up line leave the chart).
  function drawChart(epoch) {
    const nm = names(options().batch), floor = finalRead.floor, start = runs.full.lossPerStep[0];
    const later = NAMES.flatMap(n => runs[n].lossPerEpoch.slice(1).filter(l => Number.isFinite(l) && l <= 10 * start));
    const yMax = Math.max(floor * 1.6, Math.min(start * 1.05, 1.25 * Math.max(...later, floor)));
    const upTo = Math.round(epoch), cut = [];
    const series = NAMES.map(n => {
      const raw = runs[n].lossPerEpoch.slice(0, upTo + 1);
      const ys = raw.map(l => (Number.isFinite(l) ? Math.min(l, yMax) : yMax));
      cut.push(raw.map(l => !(l <= yMax)));
      const blew = read[n].diverged;
      return { xs: ys.map((_, i) => i), ys, color: colorOf(n), dash: blew, points: ys.length <= 31 };
    });
    series.push({ xs: [0, options().epochs], ys: [floor, floor], color: plot.theme().muted, dash: true, points: false });
    const { Y, X } = drawLineChart(chart, { series, xLabel: tr('Epoch', 'Epoch'), yLabel: 'Loss', xMin: 0, xMax: Math.max(1, options().epochs), yMin: 0, yMax, integerX: true });
    // A small triangle on the top edge marks each value that is higher than the chart goes.
    const ctx = chart.getContext('2d'), top = Y(yMax);
    NAMES.forEach((n, k) => {
      ctx.fillStyle = colorOf(n);
      cut[k].forEach((isCut, i) => {
        if (!isCut) return;
        const x = X(i) + (k - 1) * 7;
        ctx.beginPath(); ctx.moveTo(x, top - 1); ctx.lineTo(x - 4, top + 6); ctx.lineTo(x + 4, top + 6); ctx.closePath(); ctx.fill();
      });
    });
    const clipped = cut.some(c => c.some(Boolean));
    if (chartHint) {
      chartHint.textContent = clipped
        ? `${chartHintBase} ${tr('Triangles at the top edge mark losses higher than the chart shows; a dashed line labelled "blew up" ran off the chart.', 'Segitiga di tepi atas menandai loss yang lebih tinggi daripada yang ditampilkan grafik; garis putus-putus berlabel "meledak" keluar dari grafik.')}`
        : chartHintBase;
    }
    chartLegend.replaceChildren(...[...NAMES.map((n, k) => ({ color: colorOf(n), label: chartName(nm, n, read[n].diverged), dash: read[n].diverged })),
      { color: plot.theme().muted, label: tr('Lowest possible loss', 'Loss terendah yang mungkin'), dash: true }].map(it => {
      const span = document.createElement('span'), i = document.createElement('i');
      i.className = `glyph-line${it.dash ? ' dashed' : ''}`;
      i.style.setProperty('--glyph', it.color);
      span.append(i, ` ${it.label}`);
      return span;
    }));
    return clipped;
  }

  function table(r, epoch) {
    const { batch } = options(), nm = names(batch), done = epoch >= options().epochs;
    const t = document.createElement('table');
    t.className = 'stats-table';
    t.innerHTML = '<thead><tr></tr></thead>';
    const head = t.querySelector('tr');
    for (const h of [tr('Optimiser', 'Optimizer'), tr('Steps taken', 'Langkah yang diambil'), done ? tr('Final loss', 'Loss akhir') : tr('Loss so far', 'Loss sejauh ini'), tr('Wobble', 'Goyangan'), tr('Epochs to a low loss', 'Epoch menuju loss rendah')]) {
      const th = document.createElement('th'); th.textContent = h; head.append(th);
    }
    const body = document.createElement('tbody');
    for (const n of NAMES) {
      const row = body.insertRow(), x = r[n];
      const first = row.insertCell(), sw = document.createElement('span');
      sw.setAttribute('aria-hidden', 'true');
      sw.style.cssText = `display:inline-block;width:16px;border-top:3px solid ${colorOf(n)};border-radius:2px;margin-right:7px;vertical-align:middle`;
      first.append(sw, nm[n]);
      row.insertCell().textContent = fmt(x.steps);
      row.insertCell().textContent = x.diverged ? tr('blew up', 'meledak') : fmtLoss(x.loss);
      row.insertCell().textContent = x.steps > 0 ? fmt(x.wobble, { digits: 2 }) : '–';
      // Counted over the epochs shown so far, so it fills in while a run is replayed.
      row.insertCell().textContent = x.diverged ? '–' : x.epochsToLow == null ? (done ? tr('not reached', 'belum tercapai') : '–') : fmt(x.epochsToLow, { digits: 2 });
    }
    t.append(body);
    const style = document.createElement('style');
    style.textContent = '@media (max-width: 640px) { .stats-table { font-size: 11px; width: 100%; min-width: 0; table-layout: fixed; } .stats-table th, .stats-table td { white-space: normal; padding: 6px 3px; overflow-wrap: normal; } .stats-table td:first-child { overflow-wrap: anywhere; } .stats-table th:nth-child(1) { width: 24%; } .stats-table th:nth-child(2) { width: 20%; } .stats-table th:nth-child(3) { width: 16%; } .stats-table th:nth-child(4) { width: 19%; } .stats-table th:nth-child(5) { width: 21%; } .stats-table th:first-child, .stats-table td:first-child { text-align: left; } .stats-table td:not(:first-child), .stats-table th:not(:first-child) { text-align: right; } }';
    lab.extraEl.replaceChildren(style, t);
  }

  function detailText(r) {
    const sn = shortNames();
    const blown = NAMES.filter(n => r[n].diverged);
    if (blown.length) {
      return tr(`At this learning rate ${blown.map(n => sn[n]).join(' and ')} blew up: the steps are too big and the loss grew instead of falling. Lower the learning rate.`,
        `Pada learning rate ini ${blown.map(n => sn[n]).join(' dan ')} meledak: langkahnya terlalu besar sehingga loss malah naik. Turunkan learning rate-nya.`);
    }
    if (options().batch >= data.length) {
      return tr('The batch size equals the number of points, so the mini-batch path is the full-batch path.', 'Ukuran batch sama dengan jumlah titik, jadi jalur mini-batch sama dengan jalur full batch.');
    }
    return tr('Open the Quick Quiz, pick an answer and press Check answer. Press Run to replay the walks, or Next step to move one epoch.',
      'Buka Kuis Cepat, pilih jawaban, lalu tekan Periksa jawaban. Tekan Jalankan untuk memutar ulang jalurnya, atau Langkah berikutnya untuk maju satu epoch.');
  }

  function render(state) {
    if (!runs) return;
    const epoch = state.epoch, E = options().epochs;
    read = readRuns(runs, data, epoch);
    drawPlot(epoch);
    const clipped = drawChart(epoch);
    table(read, epoch);
    const sn = shortNames();
    lab.setStatus(tr(
      `Epoch ${fmt(epoch)} of ${fmt(E)} · ${epoch >= E ? 'final' : 'current'} loss: ${NAMES.map(n => `${sn[n]} ${read[n].diverged ? 'blew up' : fmtLoss(read[n].loss)}`).join(', ')}`,
      `Epoch ${fmt(epoch)} dari ${fmt(E)} · loss ${epoch >= E ? 'akhir' : 'saat ini'}: ${NAMES.map(n => `${sn[n]} ${read[n].diverged ? 'meledak' : fmtLoss(read[n].loss)}`).join(', ')}`));
    if (loading) lab.setStatus(tr('Loading the penguin data…', 'Memuat data penguin…'));
    lab.setDetail(detailText(read));
    lab.setMetrics(tr(`Learning rate ${fmt(options().lr, { max: 4 })} · batch size ${fmt(Math.min(options().batch, data.length))} · ${fmt(data.length)} points`,
      `Learning rate ${fmt(options().lr, { max: 4 })} · ukuran batch ${fmt(Math.min(options().batch, data.length))} · ${fmt(data.length)} titik`));
    const at = n => runs[n].path[Math.min(runs[n].stepsTaken, Math.round(epoch * runs[n].stepsPerEpoch))];
    lab.describe(lab.canvas, tr(
      `After epoch ${fmt(epoch)} of ${fmt(E)}: ${NAMES.map(n => `${sn[n]} is at slope ${fmt(at(n).slope, { digits: 2 })}, intercept ${fmt(at(n).intercept, { digits: 2 })}, ${read[n].steps} steps taken`).join('; ')}. The best line has slope ${fmt(best.slope, { digits: 2 })} and intercept ${fmt(best.intercept, { digits: 2 })}.`,
      `Setelah epoch ${fmt(epoch)} dari ${fmt(E)}: ${NAMES.map(n => `${sn[n]} berada di slope ${fmt(at(n).slope, { digits: 2 })}, intercept ${fmt(at(n).intercept, { digits: 2 })}, ${read[n].steps} langkah diambil`).join('; ')}. Garis terbaik punya slope ${fmt(best.slope, { digits: 2 })} dan intercept ${fmt(best.intercept, { digits: 2 })}.`));
    lab.describe(chart, tr(
      `Loss after each epoch up to epoch ${fmt(epoch)}: ${NAMES.map(n => `${sn[n]} ${read[n].diverged ? 'blew up' : fmtLoss(read[n].loss)}`).join(', ')}; lowest possible loss ${fmtLoss(finalRead.floor)}.${clipped ? ' Losses above the top of the chart are cut off and marked with triangles.' : ''}`,
      `Loss di akhir tiap epoch sampai epoch ${fmt(epoch)}: ${NAMES.map(n => `${sn[n]} ${read[n].diverged ? 'meledak' : fmtLoss(read[n].loss)}`).join(', ')}; loss terendah yang mungkin ${fmtLoss(finalRead.floor)}.${clipped ? ' Loss di atas batas atas grafik dipotong dan ditandai dengan segitiga.' : ''}`));
    dataNoteText();
  }

  function dataNoteText() {
    if (loading) dataNote.textContent = tr('Loading the penguin data…', 'Memuat data penguin…');
    else if (mode === 'penguins' && real) {
      dataNote.textContent = tr(
        `Flipper length against body mass, both standardised. ${fmt(real.data.length)} of ${fmt(real.total)} penguins have both measurements; ${fmt(real.dropped)} rows with missing values (NA) are left out.`,
        `Panjang sirip terhadap massa tubuh, keduanya distandarkan. ${fmt(real.data.length)} dari ${fmt(real.total)} penguin punya kedua pengukuran; ${fmt(real.dropped)} baris dengan missing value (NA) dibuang.`);
    } else if (loadFailed) dataNote.textContent = tr('Could not load the penguin data, so the generated data is shown.', 'Data penguin tidak bisa dimuat, jadi data buatan yang ditampilkan.');
    else dataNote.textContent = tr(`${fmt(GENERATED_N)} generated points with an upward trend, both axes standardised (seeded, so everyone sees the same ones).`,
      `${fmt(GENERATED_N)} titik buatan dengan tren naik, kedua sumbu distandarkan (memakai seed, jadi semua orang melihat titik yang sama).`);
  }

  // ---- the Quick Quiz ------------------------------------------------------------------

  function checkPrediction() {
    if (!finalRead || loading) return;
    const r = finalRead, sn = shortNames(), E = options().epochs;
    const key = CHOICE_KEYS.includes(r.key) ? r.key : 'other';
    const reach = NAMES.map(n => `${sn[n]} ${r[n].diverged ? tr('blew up', 'meledak') : r[n].epochsToLow == null ? tr(`not reached in ${fmt(E)} epochs`, `belum tercapai dalam ${fmt(E)} epoch`) : tr(`${fmt(r[n].epochsToLow, { digits: 2 })} epochs`, `${fmt(r[n].epochsToLow, { digits: 2 })} epoch`)}`).join(', ');
    const wob = NAMES.map(n => `${sn[n]} ${fmt(r[n].wobble, { digits: 2 })}`).join(', ');
    const lead = r.key === 'same'
      ? tr('No path is clearly noisy here.', 'Tidak ada jalur yang jelas noisy di sini.')
      : tr(`The noisiest is ${sn[r.noisiest]}.`, `Yang paling noisy adalah ${sn[r.noisiest]}.`);
    const fast = r.fastest ? tr(`The fewest epochs to a low loss: ${sn[r.fastest]}.`, `Epoch paling sedikit menuju loss rendah: ${sn[r.fastest]}.`) : tr('None reached a low loss.', 'Tidak ada yang mencapai loss rendah.');
    box.reveal(key, tr(`${lead} Wobble: ${wob}. ${fast} Epochs to a low loss: ${reach}.`, `${lead} Goyangan: ${wob}. ${fast} Epoch menuju loss rendah: ${reach}.`));
  }
  box.onCheck(checkPrediction);

  // ---- wiring ----------------------------------------------------------------------------

  function syncBatchMax() {
    const max = Math.max(2, data.length);
    if (Number(batchSlider.max) === max) return;
    batchSlider.max = String(max);
    controls.set('batch', Math.min(Number(batchSlider.value), max));
  }

  // Any change to a setting: compute the three runs again and show the finished walks.
  function settle() {
    syncBatchMax();
    recompute();
    stepper.set(fresh());
    if (box.answered && box.chosen() != null) checkPrediction();
  }

  async function setMode(next) {
    const token = ++loadToken;
    loadFailed = false;
    if (next === 'generated') { mode = 'generated'; loading = false; data = generatedData(options().seed); dataSeed = options().seed; contourCache = null; settle(); return; }
    loading = true; controls.disable('data', false);
    dataNoteText();
    lab.setStatus(tr('Loading the penguin data…', 'Memuat data penguin…'));
    try {
      const table = await loadDataset(next);
      if (destroyed || token !== loadToken) return;
      real = penguinData(table);
      mode = next; data = real.data; contourCache = null;
    } catch {
      if (destroyed || token !== loadToken) return;
      loadFailed = true; mode = 'generated';
      controls.set('data', 'generated');
    }
    loading = false;
    settle();
  }

  function onChange(name) {
    if (name === 'data') { setMode(controls.get('data')); return; }
    settle();
  }

  lab.onReset(() => {
    loadToken += 1; loading = false; loadFailed = false; mode = 'generated';
    data = generatedData(DEFAULTS.seed); dataSeed = DEFAULTS.seed; contourCache = null;
    controls.set('data', 'generated'); controls.set('logLr', DEFAULTS.logLr); controls.set('epochs', DEFAULTS.epochs); controls.set('seed', DEFAULTS.seed);
    batchSlider.max = String(GENERATED_N); controls.set('batch', DEFAULTS.batch);
    box.reset();
    recompute();
    stepper.set(fresh());
  });
  lab.onTheme(() => stepper.paint());
  lab.onResize(() => stepper.paint());
  lab.cleanup(() => { destroyed = true; loadToken += 1; });
  recompute();
  stepper.set(fresh());
  return lab.destroy;
}
