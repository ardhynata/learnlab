// Neural network lab, built on the kit. A small multilayer perceptron (sims/ml/mlp.js) learns to separate
// two classes of 2-D points that no straight line can split (two moons, circles, XOR, spiral) or two real
// penguin species. The learner picks the number of hidden layers and units, the activation, the
// initialization, the optimizer, the learning rate and an L2 penalty, then runs the training and watches:
//   - the decision regions of the network, updating as it trains (dots = training, crosses = validation),
//   - the loss on the training and the validation points,
//   - the size of the gradient in each layer (vanishing gradients show up as lines far below the rest),
//   - a diagram of the network (line width = size of the weight) and a histogram of what every hidden layer
//     outputs, with the share of dead units.
// Training and drawing share a ~14 ms budget per animation frame (the decision regions are redrawn every second
// frame while it runs), so the page stays responsive.
// The math (datasets, split, training session, snapshots, histogram and diagram numbers) lives in
// ml/networklab.js on top of ml/mlp.js; this file only draws and wires.
import { createLab, createPlot, drawLineChart, dataModeSpec, loadDataset, predictBox, clusterColor, theme, formatTick, tr, fmt, pct } from '../kit/index.js';
import { setupSpeed, setRunButton, geometry } from '../common.js';
import { predictGrid } from '../ml/mlp.js';
import { contourSegments } from '../ml/svmlab.js';
import {
  HALF, LIMITS, PER_CLASS, buildDataset, fromLog, createSession, stepSession, stepSessionTimed, snapshotSession, restoreSession,
  parameterCount, gradientSeries, gradientVerdict, layerActivity, activationRange, histogram, networkEdges, diagramLayout,
} from '../ml/networklab.js';

const DEFAULTS = { shape: 'moons', hidden: 2, units: 8, activation: 'relu', init: 'he', optimizer: 'adam', logLr: -2, l2: 0, epochs: 400 };
const DATA_SEED = 11;
const NET_SEED = 1;
const GRID_STEPS = 48;
const EPOCHS_PER_SECOND = 120;  // at 1x speed
const FRAME_BUDGET_MS = 14;     // the most work (training plus drawing) one animation frame aims at
const MAX_FRAME_DT = 50;        // a long frame (a busy machine) adds at most this many ms of training
const MIN_TRAIN_MS = 3;
const SAY_MS = 1000;            // while running, the screen-reader text of the status is refreshed at most this often
const MAX_SNAPSHOTS = 120;
const LOSS_TOP = 4;             // a loss above this is drawn at the top of the chart

// A learning rate or L2 strength shown with the digits that matter at its size.
const valueText = v => fmt(v, { max: v >= 10 ? 1 : v >= 1 ? 2 : v >= 0.1 ? 3 : 4 });
// A gradient size: plain when it is not tiny, scientific (1.3e-4) when it is.
function sci(v) {
  if (!(v > 0)) return '0';
  if (v >= 0.01) return fmt(v, { max: 3 });
  const e = Math.floor(Math.log10(v));
  return `${fmt(v / 10 ** e, { digits: 1 })}e${e}`;
}
const loss3 = v => (v == null ? '-' : Number.isFinite(v) ? fmt(v, { digits: 3 }) : tr('not a number', 'bukan angka'));

function hexRgb(color) {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  const n = m ? parseInt(m[1], 16) : 0x808080;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Sizes a canvas to its CSS box at the device pixel ratio and returns a 2-D context in CSS pixels.
function prepare(canvas) {
  const { width, height } = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width, height };
}

export function mount(root) {
  let destroyed = false;
  const lab = createLab(root, {
    title: tr('Neural network lab', 'Lab neural network'),
    hint: tr(
      'Train a small network to separate two classes. Shading shows its prediction, the line its decision boundary. The charts show why some settings fail.',
      'Latih network kecil untuk memisahkan dua kelas. Arsiran adalah prediksinya, garis adalah decision boundary-nya. Grafik menunjukkan mengapa sebagian pengaturan gagal.'),
    playback: true, status: true, legend: true,
    canvasLabel: tr(
      'Plot of the training points (dots) and validation points (crosses) of two classes, with the network\'s decision regions and boundary. It updates while the network trains.',
      'Plot titik training (bulat) dan titik validasi (silang) dari dua kelas, beserta daerah keputusan dan boundary milik network. Plot ini berubah selama network dilatih.'),
  });
  lab.cleanup(() => { destroyed = true; });
  const plot = createPlot(lab.canvas, { xLabel: '', yLabel: '', range: { minX: -HALF, minY: -HALF, span: 2 * HALF } });
  // Nothing on the plot can be dragged, so it is a picture (described in words below), not an application.
  lab.canvas.setAttribute('role', 'img');
  lab.canvas.removeAttribute('tabindex');
  const legendHost = lab.ref('legend');
  if (legendHost) legendHost.style.maxHeight = 'none';
  const statusEl = lab.ref('status');
  // The status line has two parts: a short one-line text for the eye (it never wraps in the wide fullscreen layout, so the
  // plot card keeps one height) and the full sentence for a screen reader, which is announced when a run stops.
  const statusShow = document.createElement('span'), statusSay = document.createElement('span');
  statusShow.setAttribute('aria-hidden', 'true');
  statusSay.className = 'sr-only';
  statusEl.style.fontVariantNumeric = 'tabular-nums';
  statusEl.replaceChildren(statusShow, statusSay);
  const stage = lab.ref('stage'), plotCard = lab.root.querySelector('.plot-card');
  const inFullscreen = () => stage.classList.contains('expanded') || document.fullscreenElement === stage;

  // ---- state -----------------------------------------------------------------------------------

  let mode = 'generated', table = null, loading = false, loadFailed = false, loadToken = 0;
  let dataSeed = DATA_SEED, netSeed = NET_SEED;
  let data = null, session = null, snaps = [];
  let running = false, raf = 0, carry = 0, announceTimer = 0, legendKey = '';
  let lastFrame = 0, lastSay = 0, drawMs = 0, regionTick = 0, regionCache = null, actCache = null;

  // ---- controls --------------------------------------------------------------------------------

  const controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real data)', 'Penguin (data nyata)')]] }),
    {
      name: 'shape', type: 'select', label: tr('Generated shape', 'Bentuk data buatan'), value: DEFAULTS.shape,
      options: [
        ['moons', tr('Two moons', 'Dua bulan sabit')], ['circles', tr('Circles', 'Lingkaran')],
        ['xor', tr('XOR (checkerboard)', 'XOR (papan catur)')], ['spiral', tr('Spiral', 'Spiral')],
      ],
    },
    { name: 'hidden', type: 'range', label: tr('Hidden layers', 'Hidden layer'), min: LIMITS.hidden[0], max: LIMITS.hidden[1], step: 1, value: DEFAULTS.hidden },
    { name: 'units', type: 'range', label: tr('Units per hidden layer', 'Unit per hidden layer'), min: LIMITS.units[0], max: LIMITS.units[1], step: 1, value: DEFAULTS.units },
    {
      name: 'activation', type: 'select', label: tr('Activation', 'Aktivasi'), value: DEFAULTS.activation,
      options: [['relu', 'ReLU'], ['tanh', 'tanh'], ['sigmoid', 'sigmoid']],
    },
    {
      name: 'init', type: 'select', label: tr('Initialization', 'Inisialisasi'), value: DEFAULTS.init,
      options: [
        ['zeros', tr('Zeros (every weight 0)', 'Nol (semua weight 0)')], ['small', tr('Small random (std 0.01)', 'Acak kecil (std 0,01)')],
        ['xavier', 'Xavier'], ['he', 'He'],
      ],
    },
    {
      name: 'optimizer', type: 'select', label: tr('Optimizer', 'Optimizer'), value: DEFAULTS.optimizer,
      options: [['sgd', 'SGD'], ['momentum', tr('SGD with momentum', 'SGD dengan momentum')], ['adam', 'Adam']],
    },
    { name: 'logLr', type: 'range', label: tr('Learning rate', 'Learning rate'), min: -3, max: 0, step: 0.1, value: DEFAULTS.logLr, format: v => valueText(fromLog(v)) },
    { name: 'l2', type: 'range', label: tr('L2 strength', 'Kekuatan L2'), min: 0, max: 0.1, step: 0.001, value: DEFAULTS.l2, format: v => (v ? valueText(v) : tr('0 (off)', '0 (mati)')) },
    { name: 'epochs', type: 'range', label: tr('Epochs to run', 'Jumlah epoch'), min: 50, max: 2000, step: 50, value: DEFAULTS.epochs },
    { name: 'newSample', type: 'button', label: tr('New sample', 'Sampel baru'), onClick: () => { dataSeed += 1; newData(); } },
    { name: 'newWeights', type: 'button', label: tr('New weights', 'Weight baru'), onClick: () => { netSeed += 1; newNet(); } },
    { name: 'restart', type: 'button', label: tr('Restart', 'Ulangi'), onClick: () => { newNet(); } },
    {
      type: 'note',
      text: tr(
        'Optimizer, learning rate, L2 and epochs keep the weights, so change them mid-run. Any other setting builds a new network at epoch 0.',
        'Optimizer, learning rate, L2, dan epoch tidak mengubah weight, jadi boleh diubah di tengah pelatihan. Pengaturan lain membuat network baru di epoch 0.'),
    },
  ], onControl);
  const dataNote = document.createElement('p');
  dataNote.className = 'hint';
  controls.el.querySelector('select').closest('label').after(dataNote);

  const settings = () => {
    const v = controls.values();
    return { hidden: v.hidden, units: v.units, activation: v.activation, init: v.init };
  };
  const trainOpts = () => {
    const v = controls.values();
    return { optimizer: v.optimizer, lr: fromLog(v.logLr), l2: v.l2 };
  };
  const maxEpochs = () => controls.get('epochs');
  const done = () => session.diverged || session.epoch >= maxEpochs();

  // ---- the Quick Quiz: vanishing gradients -----------------------------------------------------------

  const box = predictBox(lab.ref('below'), {
    name: 'predict-vanishing',
    hint: tr(
      'Set Activation to sigmoid and Hidden layers to 4, press Run for at least 10 epochs, then check again.',
      'Atur Aktivasi ke sigmoid dan Hidden layer ke 4, tekan Jalankan sedikitnya 10 epoch, lalu periksa lagi.'),
    question: tr(
      'With sigmoid activations and 4 hidden layers, what happens to the gradients in the first layer?',
      'Dengan aktivasi sigmoid dan 4 hidden layer, apa yang terjadi pada gradient di layer pertama?'),
    choices: [
      ['larger', tr('They are larger than in the last layer', 'Gradient-nya lebih besar daripada di layer terakhir')],
      ['same', tr('They are about the same size as in the last layer', 'Gradient-nya kurang lebih sama besar dengan di layer terakhir')],
      ['smaller', tr('They are much smaller than in the last layer (they vanish)', 'Gradient-nya jauh lebih kecil daripada di layer terakhir (menghilang)')],
      ['zero', tr('They are exactly zero', 'Gradient-nya tepat nol')],
    ],
  });
  lab.cleanup(() => box.destroy());
  box.onCheck(() => {
    if (session.cfg.activation !== 'sigmoid' || session.cfg.hidden !== 4 || session.epoch < 10) return;
    const v = gradientVerdict(session.hist);
    const numbers = tr(
      `Mean absolute gradient, averaged over the untrained network and the first 10 epochs: first layer ${sci(v.first)}; output layer ${sci(v.last)}.`,
      `Rata-rata gradient absolut, dirata-ratakan pada network sebelum dilatih dan 10 epoch pertama: layer pertama ${sci(v.first)}; layer output ${sci(v.last)}.`);
    const why = v.key === 'smaller'
      ? tr(
        ` That is about ${fmt(1 / v.ratio, { digits: 0 })} times smaller. A sigmoid has a slope of at most 0.25, so the gradient shrinks at every layer it is passed back through, and the first layer learns slowly.`,
        ` Itu sekitar ${fmt(1 / v.ratio, { digits: 0 })} kali lebih kecil. Slope sigmoid paling besar 0,25, sehingga gradient menyusut di setiap layer yang dilaluinya saat dikirim mundur, dan layer pertama belajar lambat.`)
      : '';
    box.reveal(v.key, numbers + why);
  });

  // ---- charts ----------------------------------------------------------------------------------

  const lossChart = lab.chartCard(
    tr('Loss during training', 'Loss selama training'),
    tr(
      'Log loss, lower is better. The validation line uses points the network never trains on. A very large loss is drawn at the top.',
      'Log loss, semakin kecil semakin baik. Garis validasi memakai titik yang tidak dipakai untuk melatih network. Loss yang sangat besar digambar di bagian atas.'),
    230);
  const lossLegend = document.createElement('div');
  lossLegend.className = 'legend';
  lossChart.closest('.chart').before(lossLegend);

  const gradChart = lab.chartCard(
    tr('Gradient size by layer', 'Ukuran gradient per layer'),
    tr(
      'Mean |gradient| of each layer on a log scale (-2 means 0.01). Layer 1 is the first hidden layer. A line far below the rest is a layer that barely learns: a vanishing gradient.',
      'Rata-rata |gradient| tiap layer, skala log (-2 berarti 0,01). Layer 1 adalah hidden layer pertama. Garis yang jauh di bawah lainnya adalah layer yang hampir tidak belajar: gradient menghilang.'),
    230);
  const gradLegend = document.createElement('div');
  gradLegend.className = 'legend';
  gradChart.closest('.chart').before(gradLegend);

  const layersChart = lab.chartCard(
    tr('Inside the network', 'Di dalam network'),
    tr(
      'Left: line width shows weight size (blue positive, pink negative; full width at 2 or more). A dashed empty circle is a dead unit. Right: what each hidden layer outputs, for all training points.',
      'Kiri: lebar garis menunjukkan besar weight (biru positif, merah muda negatif; penuh pada 2 atau lebih). Lingkaran putus-putus kosong adalah unit mati. Kanan: output tiap hidden layer untuk semua titik training.'),
    290);
  const layersWrap = layersChart.closest('.chart');

  // ---- data and session ------------------------------------------------------------------------

  const effectiveMode = () => (mode === 'penguins' && table ? 'penguins' : 'generated');

  function newData() {
    data = buildDataset({ mode: effectiveMode(), shape: controls.get('shape'), seed: dataSeed, table, perClass: PER_CLASS });
    newNet();
  }
  function newNet() {
    session = createSession(data.points, { ...settings(), seed: netSeed });
    snaps = [];
    carry = 0;
    afterChange();
  }

  function onControl(name) {
    if (name === 'data') { setMode(controls.get('data')); return; }
    if (name === 'shape') { newData(); return; }
    if (['hidden', 'units', 'activation', 'init'].includes(name)) { newNet(); return; }
    // optimizer, learning rate, L2 strength, epoch limit: the weights stay
    paint();
    drawAll();
    updateText();
  }

  async function setMode(next) {
    const token = ++loadToken;
    loadFailed = false;
    if (next === 'generated') { mode = 'generated'; loading = false; syncControls(); newData(); return; }
    loading = true; mode = next; syncControls(); updateNote();
    try {
      table = await loadDataset(next);
      if (destroyed || token !== loadToken) return;
      loading = false;
    } catch {
      if (destroyed || token !== loadToken) return;
      loading = false; loadFailed = true; mode = 'generated';
      controls.set('data', 'generated');
    }
    syncControls();
    newData();
  }
  const syncControls = () => controls.show('shape', mode === 'generated');

  // ---- playback --------------------------------------------------------------------------------

  const btn = name => lab.root.querySelector(`[data-act="${name}"]`);
  const speed = setupSpeed(lab.ref('speed'), lab.ref('speedValue'), () => {});

  function paint() {
    setRunButton(btn('run'), running ? 'pause' : done() ? 'again' : 'run');
    btn('prev').disabled = running || !snaps.length;
    btn('step').disabled = running || done();
  }
  function pushSnapshot() {
    snaps.push(snapshotSession(session));
    if (snaps.length > MAX_SNAPSHOTS) snaps.shift();
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf); raf = 0;
  }
  function afterChange() {
    paint(); drawAll(); updateText();
  }

  // One animation frame: train for the time the frame has left after drawing (drawMs is a running average of what the
  // last frames spent drawing), then draw. The epochs asked for follow the clock, so a slow frame does not slow the run.
  function frame() {
    raf = 0;
    if (!running || destroyed) return;
    const t0 = performance.now();
    const dt = Math.min(MAX_FRAME_DT, Math.max(0, t0 - lastFrame));
    lastFrame = t0;
    const max = maxEpochs();
    let k;
    if (speed.instant) k = max - session.epoch;
    else { carry += speed.multiplier * EPOCHS_PER_SECOND * dt / 1000; k = Math.floor(carry); carry -= k; }
    k = Math.min(k, max - session.epoch);
    if (k > 0) { pushSnapshot(); stepSessionTimed(session, k, trainOpts(), Math.max(MIN_TRAIN_MS, FRAME_BUDGET_MS - drawMs)); }
    if (done()) { stop(); afterChange(); return; }
    const t1 = performance.now();
    paint(); drawAll({ regions: regionTick++ % 2 === 0 }); updateText();
    drawMs = 0.7 * drawMs + 0.3 * (performance.now() - t1);
    raf = requestAnimationFrame(frame);
  }

  lab.on(btn('run'), 'click', () => {
    if (running) { stop(); afterChange(); return; }
    if (done()) newNet();
    running = true; paint();
    lastFrame = performance.now(); regionTick = 0;
    raf = requestAnimationFrame(frame);
  });
  lab.on(btn('step'), 'click', () => {
    if (running || done()) return;
    pushSnapshot();
    stepSession(session, 1, trainOpts());
    afterChange();
  });
  lab.on(btn('prev'), 'click', () => {
    if (running || !snaps.length) return;
    restoreSession(session, snaps.pop());
    afterChange();
  });
  lab.cleanup(() => { stop(); clearTimeout(announceTimer); });

  lab.onReset(() => {
    stop();
    dataSeed = DATA_SEED; netSeed = NET_SEED; loadToken++; loading = false; loadFailed = false; mode = 'generated';
    controls.set('data', 'generated');
    for (const name of ['shape', 'hidden', 'units', 'activation', 'init', 'optimizer', 'logLr', 'l2', 'epochs']) controls.set(name, DEFAULTS[name]);
    syncControls();
    box.reset();
    newData();
  });

  // ---- text ------------------------------------------------------------------------------------

  const classNames = () => (data?.info.penguins ? ['Adelie', 'Chinstrap'] : [tr('Class A', 'Kelas A'), tr('Class B', 'Kelas B')]);
  const nameOfActivity = () => (session.cfg.activation === 'relu' ? tr('dead', 'mati') : tr('saturated', 'jenuh'));

  function shapeNote(shape) {
    return {
      moons: tr('Two interlocking half circles. No straight line separates them.', 'Dua bulan sabit yang saling menyelip. Tidak ada garis lurus yang memisahkannya.'),
      circles: tr('One class forms a ring around the other. No straight line works.', 'Satu kelas membentuk cincin yang mengelilingi kelas lainnya. Tidak ada garis lurus yang cocok.'),
      xor: tr('The classes sit on opposite corners, like a checkerboard of four squares. One line cannot separate them.', 'Kedua kelas berada di sudut yang berseberangan, seperti papan catur empat kotak. Satu garis lurus tidak cukup.'),
      spiral: tr('Two arms wind around the centre. The hardest shape: it needs enough units and layers.', 'Dua lengan melilit ke arah pusat. Bentuk tersulit: butuh unit dan layer yang cukup.'),
    }[shape];
  }
  function updateNote() {
    const info = data?.info;
    if (mode === 'penguins' && !table) {
      dataNote.textContent = tr('Loading the penguin data…', 'Memuat data penguin…');
    } else if (effectiveMode() === 'penguins') {
      dataNote.textContent = tr(
        `Real data: Palmer penguins, Adelie against Chinstrap, by bill length (horizontal) and bill depth (vertical), each standardized with the training points (mean 0, spread 1). Rows with a missing measurement (NA) are left out: ${info.dropped} of the ${info.total} Adelie and Chinstrap rows, which leaves ${info.usable} penguins. The lab draws up to ${PER_CLASS} of each species at random; New sample draws another set.`,
        `Data nyata: penguin Palmer, Adelie lawan Chinstrap, berdasarkan panjang paruh (horizontal) dan kedalaman paruh (vertikal), masing-masing distandarkan dengan titik training (rata-rata 0, simpangan 1). Baris dengan pengukuran yang hilang (NA) dibuang: ${info.dropped} dari ${info.total} baris Adelie dan Chinstrap, sehingga tersisa ${info.usable} penguin. Lab mengambil sampai ${PER_CLASS} penguin tiap spesies secara acak; Sampel baru mengambil set lain.`);
    } else {
      const failed = loadFailed
        ? tr('The penguin data could not be loaded, so generated data is shown. Pick Penguins again to retry. ', 'Data penguin tidak dapat dimuat, jadi data buatan yang ditampilkan. Pilih Penguin lagi untuk mencoba ulang. ')
        : '';
      dataNote.textContent = `${failed}${shapeNote(controls.get('shape'))}`;
    }
  }

  function summaryText() {
    const h = session.hist, e = session.epoch;
    const acc = tr(
      `Accuracy ${pct(h.trainAcc[e])} on training points${h.valAcc[e] == null ? '' : `, ${pct(h.valAcc[e])} on validation points`}.`,
      `Akurasi ${pct(h.trainAcc[e])} pada titik training${h.valAcc[e] == null ? '' : `, ${pct(h.valAcc[e])} pada titik validasi`}.`);
    return tr(
      `Epoch ${e} of ${maxEpochs()}. Loss ${loss3(h.trainLoss[e])} on training points, ${loss3(h.valLoss[e])} on validation points. ${acc}`,
      `Epoch ${e} dari ${maxEpochs()}. Loss ${loss3(h.trainLoss[e])} pada titik training, ${loss3(h.valLoss[e])} pada titik validasi. ${acc}`);
  }
  function statusText() {
    if (session.diverged) {
      return tr(
        'The loss is no longer a number: the weights blew up, so the learning rate is too high for this network. Lower it and press Restart.',
        'Loss sudah bukan angka: weight meledak, jadi learning rate terlalu tinggi untuk network ini. Turunkan learning rate lalu tekan Ulangi.');
    }
    if (session.epoch === 0) {
      return tr(`Epoch 0 of ${maxEpochs()}. This is the network before training: press Run.`, `Epoch 0 dari ${maxEpochs()}. Ini network sebelum dilatih: tekan Jalankan.`);
    }
    const finished = session.epoch >= maxEpochs() ? tr(' Done.', ' Selesai.') : '';
    return summaryText() + finished;
  }
  // The same status in one short line, for the eye: the losses here, the accuracies in the detail line below it.
  function statusShort() {
    const h = session.hist, e = session.epoch;
    if (session.diverged) return tr('The loss is no longer a number: the learning rate is too high.', 'Loss sudah bukan angka: learning rate terlalu tinggi.');
    if (e === 0) return tr(`Epoch 0 of ${maxEpochs()}. This is the network before training: press Run.`, `Epoch 0 dari ${maxEpochs()}. Ini network sebelum dilatih: tekan Jalankan.`);
    const finished = e >= maxEpochs() ? tr(' Done.', ' Selesai.') : '';
    const val = h.valLoss[e] == null ? '' : tr(`, ${loss3(h.valLoss[e])} on validation`, `, ${loss3(h.valLoss[e])} pada validasi`);
    return tr(
      `Epoch ${e} of ${maxEpochs()}. Loss ${loss3(h.trainLoss[e])} on training${val}.${finished}`,
      `Epoch ${e} dari ${maxEpochs()}. Loss ${loss3(h.trainLoss[e])} pada training${val}.${finished}`);
  }
  function detailText() {
    const h = session.hist, e = session.epoch;
    if (session.diverged) return tr('The weights blew up. Lower the learning rate, then press Restart.', 'Weight meledak. Turunkan learning rate, lalu tekan Ulangi.');
    const val = h.valAcc[e] == null ? '' : tr(`, ${pct(h.valAcc[e])} on validation points`, `, ${pct(h.valAcc[e])} pada titik validasi`);
    return tr(
      `Accuracy ${pct(h.trainAcc[e])} on training points${val}. ${fmt(parameterCount(session))} parameters.`,
      `Akurasi ${pct(h.trainAcc[e])} pada titik training${val}. ${fmt(parameterCount(session))} parameter.`);
  }
  function describeAll() {
    const h = session.hist, e = session.epoch, cfg = session.cfg;
    lab.describe(lab.canvas, tr(
      `A network with ${cfg.hidden} hidden layers of ${cfg.units} units. ${summaryText()}`,
      `Network dengan ${cfg.hidden} hidden layer berisi ${cfg.units} unit. ${summaryText()}`));
    lab.describe(lossChart, tr(
      `At epoch ${e}: training loss ${loss3(h.trainLoss[e])}, validation loss ${loss3(h.valLoss[e])}.`,
      `Pada epoch ${e}: loss training ${loss3(h.trainLoss[e])}, loss validasi ${loss3(h.valLoss[e])}.`));
    lab.describe(gradChart, tr(
      `At epoch ${e}, mean absolute gradient: ${h.grad[e].map((g, l) => `${layerName(l)} ${sci(g)}`).join(', ')}.`,
      `Pada epoch ${e}, rata-rata gradient absolut: ${h.grad[e].map((g, l) => `${layerName(l)} ${sci(g)}`).join(', ')}.`));
    if (!session.diverged) {
      const act = activity();
      lab.describe(layersChart, tr(
        `${act.map((l, i) => `Hidden layer ${i + 1}: mean activation ${fmt(l.mean, { digits: 2 })}, ${pct(l.deadFrac, 0)} ${nameOfActivity()}.`).join(' ')}`,
        `${act.map((l, i) => `Hidden layer ${i + 1}: rata-rata aktivasi ${fmt(l.mean, { digits: 2 })}, ${pct(l.deadFrac, 0)} ${nameOfActivity()}.`).join(' ')}`));
    }
  }
  // The visible status is rewritten on every frame. The part a screen reader announces is not: while the network runs the
  // live region is off, and when the run stops the full sentence is said once.
  function updateText() {
    statusShow.textContent = statusShort();
    lab.setDetail(detailText());
    updateNote();
    if (running) {
      statusEl.setAttribute('aria-live', 'off');
      const now = performance.now();
      if (now - lastSay >= SAY_MS) { lastSay = now; statusSay.textContent = statusText(); }   // for a reader browsing the page, not announced
      return;
    }
    statusEl.setAttribute('aria-live', 'polite');
    statusSay.textContent = '';
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => { if (destroyed) return; statusSay.textContent = statusText(); describeAll(); }, 40);
  }

  const layerName = l => (l === session.model.weights.length - 1 ? tr('Output', 'Output') : tr(`Layer ${l + 1}`, `Layer ${l + 1}`));

  // ---- drawing ---------------------------------------------------------------------------------

  const regionCanvas = document.createElement('canvas');

  // The decision regions and the boundary cost a 48x48 forward pass, so they are computed again only when the network has
  // changed since they were drawn (or its colors), and, while it runs, on every second frame; the frames in between redraw
  // the last picture.
  function updateRegions(fresh) {
    const colors = `${clusterColor(0)}|${clusterColor(1)}`;
    const stale = !regionCache || regionCache.session !== session || regionCache.epoch !== session.epoch || regionCache.colors !== colors;
    if (!stale || (!fresh && regionCache && regionCache.colors === colors)) return;
    const grid = predictGrid(session.model, { xMin: -HALF, xMax: HALF, yMin: -HALF, yMax: HALF }, GRID_STEPS);
    const { nx, ny, values } = grid;
    regionCanvas.width = nx; regionCanvas.height = ny;
    const rctx = regionCanvas.getContext('2d');
    const img = rctx.createImageData(nx, ny);
    const c0 = hexRgb(clusterColor(0)), c1 = hexRgb(clusterColor(1));
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const p = values[j][i];
        if (!Number.isFinite(p)) continue;
        const c = p >= 0.5 ? c1 : c0, at = ((ny - 1 - j) * nx + i) * 4;
        img.data[at] = c[0]; img.data[at + 1] = c[1]; img.data[at + 2] = c[2];
        img.data[at + 3] = Math.round(255 * (0.1 + 0.42 * Math.abs(2 * p - 1)));
      }
    }
    rctx.putImageData(img, 0, 0);
    regionCache = { session, epoch: session.epoch, colors, nx, ny, segments: session.diverged ? [] : contourSegments(grid, 0.5) };
  }

  function drawRegions(g, fresh) {
    updateRegions(fresh);
    const { nx, ny, segments } = regionCache;
    const { ctx } = plot;
    const cell = 2 * HALF / (nx - 1);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(regionCanvas, g.px(-HALF - cell / 2), g.py(HALF + cell / 2), g.size * nx / (nx - 1), g.size * ny / (ny - 1));
    ctx.restore();
    for (const [x1, y1, x2, y2] of segments) plot.segment(x1, y1, x2, y2, { color: g.t.ink, width: 2.5 });
  }

  // The y title is drawn beside the tick labels, so it has to stay between the two ticks next to the middle of the axis
  // (a tenth of the plot size above and below it). The longest set of titles that fits is used: a small plot gets short ones.
  function axisTitles(penguins) {
    const sets = penguins
      ? [
        [tr('Bill length (std.)', 'Panjang paruh (std.)'), tr('Bill depth (std.)', 'Kedalaman paruh (std.)')],
        [tr('Length (std.)', 'Panjang (std.)'), tr('Depth (std.)', 'Kedalaman (std.)')],
        [tr('Length', 'Panjang'), tr('Depth', 'Kedalaman')],
        [tr('Length', 'Panjang'), tr('Depth', 'Dalam')],
        ['x', 'y'],
      ]
      : [[tr('Feature 1', 'Feature 1'), tr('Feature 2', 'Feature 2')], [tr('Feat. 1', 'Feat. 1'), tr('Feat. 2', 'Feat. 2')], ['x1', 'x2']];
    const { size } = geometry(lab.canvas, plot.range);
    const { ctx } = plot;
    ctx.save();
    ctx.font = '11px system-ui, sans-serif';
    const fits = ([x, y]) => ctx.measureText(y).width / 2 <= 0.1 * size - 6 && ctx.measureText(x).width <= size;
    const best = sets.find(fits) ?? sets[sets.length - 1];
    ctx.restore();
    return best;
  }

  function drawPlot(fresh) {
    const info = data.info;
    plot.setLabels(...axisTitles(info.penguins));
    const g = plot.begin();
    plot.clip(() => drawRegions(g, fresh));
    for (const p of data.points) {
      if (!p.held) plot.dot(p.x, p.y, clusterColor(p.label), 4.6);
    }
    for (const p of data.points) {
      if (p.held) plot.cross(p.x, p.y, clusterColor(p.label), 4.5);
    }
    const [a, b] = classNames();
    const nTrain = data.points.filter(p => !p.held).length, nVal = data.points.length - nTrain;
    const key = `${a}|${b}|${nTrain}|${nVal}|${g.t.ink}|${clusterColor(0)}`;
    if (key !== legendKey) {
      legendKey = key;
      lab.setLegend([
        { kind: 'dot', color: clusterColor(0), label: a },
        { kind: 'dot', color: clusterColor(1), label: b },
        { kind: 'dot', color: g.t.muted, label: tr(`Training points (dots): ${nTrain}`, `Titik training (bulat): ${nTrain}`) },
        { kind: 'cross', color: g.t.muted, label: tr(`Validation points (crosses): ${nVal}`, `Titik validasi (silang): ${nVal}`) },
        { kind: 'line', color: g.t.ink, label: tr('Decision boundary', 'Decision boundary') },
      ]);
    }
  }

  // A legend line above a chart: a colored dot and a text. Rewritten only when its text changes.
  function setLegendItems(host, items) {
    const key = items.map(([c, label]) => `${c}${label}`).join('|');
    if (host.dataset.key === key) return;
    host.dataset.key = key;
    host.replaceChildren(...items.map(([color, label]) => {
      const span = document.createElement('span'), dot = document.createElement('i');
      dot.className = 'dot'; dot.style.background = color;
      span.append(dot, ` ${label}`);
      return span;
    }));
  }

  function drawLoss() {
    const h = session.hist, xs = h.trainLoss.map((_, e) => e);
    const clampLoss = v => (Number.isFinite(v) ? Math.min(v, LOSS_TOP) : LOSS_TOP);
    const train = h.trainLoss.map(clampLoss), val = h.valLoss.map(clampLoss);
    const top = Math.max(0.8, Math.min(LOSS_TOP, 1.1 * Math.max(...train, ...val)));
    const few = xs.length < 3;
    const series = [{ xs, ys: train, color: clusterColor(0), points: few }];
    if (h.valLoss[0] != null) series.push({ xs, ys: val, color: clusterColor(1), points: few });
    drawLineChart(lossChart, {
      series, xLabel: tr('Epoch', 'Epoch'), yLabel: tr('Log loss', 'Log loss'),
      xMin: 0, xMax: Math.max(maxEpochs(), session.epoch), yMin: 0, yMax: top, markerX: session.epoch,
    });
    setLegendItems(lossLegend, [[clusterColor(0), tr('Training loss', 'Loss training')], [clusterColor(1), tr('Validation loss', 'Loss validasi')]]);
  }

  function drawGradients() {
    const lines = gradientSeries(session.hist);
    const all = lines.flatMap(l => l.ys);
    const lo = Math.min(...all), hi = Math.max(...all);
    const yMin = Math.floor(lo - 0.3), yMax = Math.max(Math.ceil(hi + 0.3), yMin + 2);
    drawLineChart(gradChart, {
      series: lines.map((l, i) => ({ xs: l.xs, ys: l.ys, color: clusterColor(i), points: l.xs.length < 3 })),
      xLabel: tr('Epoch', 'Epoch'), yLabel: tr('log10 of mean |gradient|', 'log10 dari rata-rata |gradient|'),
      xMin: 0, xMax: Math.max(maxEpochs(), session.epoch), yMin, yMax, markerX: session.epoch,
    });
    const now = session.hist.grad[session.epoch];
    setLegendItems(gradLegend, lines.map((_, i) => [clusterColor(i), `${layerName(i)}: ${sci(now[i])}`]));
  }

  function drawLayers() {
    // Narrow cards stack the diagram over the histograms and need a taller canvas; wide ones put them side by side.
    // In fullscreen the layout rule owns the card's height, so no inline height is set there.
    const narrow = layersWrap.clientWidth < 520;
    if (inFullscreen()) { if (layersChart.style.height) layersChart.style.removeProperty('height'); } else {
      const wantHeight = narrow ? '520px' : '290px';
      if (layersChart.style.height !== wantHeight) layersChart.style.height = wantHeight;
    }
    const { ctx, width, height } = prepare(layersChart);
    const t = theme();
    const gap = 8;
    const A = narrow ? { x: 0, y: 0, w: width, h: Math.round(height * 0.46) } : { x: 0, y: 0, w: Math.round(width * 0.46), h: height };
    const B = narrow ? { x: 0, y: A.h + gap, w: width, h: height - A.h - gap } : { x: A.w + gap, y: 0, w: width - A.w - gap, h: height };
    ctx.fillStyle = t.plot;
    ctx.fillRect(A.x, A.y, A.w, A.h); ctx.fillRect(B.x, B.y, B.w, B.h);
    if (session.diverged) return;
    const model = session.model, act = activity();

    // Diagram.
    const sizes = model.layers;
    const nodes = diagramLayout(sizes, A.w, A.h, { pad: 24, top: 28, maxGap: 24 });
    const at = (l, k) => ({ x: A.x + nodes[l][k].x, y: A.y + nodes[l][k].y });
    ctx.save();
    ctx.beginPath(); ctx.rect(A.x, A.y, A.w, A.h); ctx.clip();
    ctx.lineCap = 'round';
    for (const e of networkEdges(model)) {
      if (!Number.isFinite(e.w)) continue;
      const p = at(e.layer, e.from), q = at(e.layer + 1, e.to);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
      ctx.lineWidth = e.width;
      ctx.strokeStyle = e.zero ? t.muted : e.w > 0 ? clusterColor(4) : clusterColor(1);
      ctx.globalAlpha = e.zero ? 0.3 : 0.55;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const gapY = nodes.map(col => (col.length > 1 ? col[1].y - col[0].y : 24));
    const radius = Math.max(3, Math.min(8, Math.min(...gapY) * 0.36));
    ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center';
    sizes.forEach((n, l) => {
      for (let k = 0; k < n; k++) {
        const c = at(l, k);
        const dead = l > 0 && l < sizes.length - 1 && !act[l - 1].units[k].alive;
        ctx.beginPath(); ctx.arc(c.x, c.y, radius, 0, 2 * Math.PI);
        ctx.lineWidth = dead ? 1.5 : 1.3;
        if (dead) { ctx.setLineDash([2, 2]); ctx.strokeStyle = t.muted; ctx.stroke(); ctx.setLineDash([]); } else { ctx.fillStyle = t.surface; ctx.fill(); ctx.strokeStyle = t.ink; ctx.stroke(); }
      }
      ctx.fillStyle = t.muted;
      const roomX = sizes.length > 1 ? nodes[1][0].x - nodes[0][0].x : 99;
      const name = l === 0 ? tr('Input', 'Input') : l === sizes.length - 1 ? tr('Output', 'Output') : roomX >= 60 ? `Hidden ${l}` : `H${l}`;
      ctx.fillText(name, A.x + nodes[l][0].x, A.y + 14);
    });
    ctx.restore();

    // Histograms of the hidden activations, one row per hidden layer.
    const [lo, hi] = activationRange(model.activation, act);
    const rows = act.length, axisH = 18, rowH = (B.h - axisH) / rows;
    ctx.save();
    ctx.beginPath(); ctx.rect(B.x, B.y, B.w, B.h); ctx.clip();
    act.forEach((layer, l) => {
      const top = B.y + l * rowH, bars = histogram(layer.values, lo, hi, 12), peak = Math.max(...bars) || 1;
      const x0 = B.x + 8, x1 = B.x + B.w - 8, base = top + rowH - 5, room = rowH - 24;
      ctx.fillStyle = t.ink; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(tr(
        `Layer ${l + 1} · mean ${fmt(layer.mean, { digits: 2 })} · ${nameOfActivity()} ${pct(layer.deadFrac, 0)}`,
        `Layer ${l + 1} · rata-rata ${fmt(layer.mean, { digits: 2 })} · ${nameOfActivity()} ${pct(layer.deadFrac, 0)}`), x0, top + 13);
      const w = (x1 - x0) / bars.length;
      ctx.fillStyle = clusterColor(l);
      bars.forEach((b, i) => { const hgt = room * b / peak; ctx.fillRect(x0 + i * w + 1, base - hgt, Math.max(1, w - 2), hgt); });
      ctx.strokeStyle = t.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, base + 0.5); ctx.lineTo(x1, base + 0.5); ctx.stroke();
    });
    ctx.fillStyle = t.muted; ctx.font = '11px system-ui, sans-serif';
    const axisY = B.y + B.h - 4;
    ctx.textAlign = 'left'; ctx.fillText(formatTick(lo), B.x + 8, axisY);
    ctx.textAlign = 'right'; ctx.fillText(formatTick(hi), B.x + B.w - 8, axisY);
    ctx.textAlign = 'center'; ctx.fillText(tr('activation value', 'nilai aktivasi'), B.x + B.w / 2, axisY);
    ctx.restore();
  }

  // `regions: false` redraws the last decision regions instead of computing them again (see updateRegions).
  function drawAll({ regions = true } = {}) {
    if (!session) return;
    drawPlot(regions); drawLoss(); drawGradients(); drawLayers();
  }

  // The layer outputs are worked out once per epoch and shared by the histograms and the screen-reader text.
  function activity() {
    if (!actCache || actCache.session !== session || actCache.epoch !== session.epoch) {
      actCache = { session, epoch: session.epoch, act: layerActivity(session.model, session.X) };
    }
    return actCache.act;
  }

  // Wide fullscreen: the plot canvas takes the height the plot card has left after its title, toolbar, status and legend.
  // The shared fit in setupFullscreen measures that overhead at the card's natural height, but the card is capped at
  // the screen height, so a card with a toolbar and a status block (this one) is measured too small and its canvas runs
  // past the card. Here the overhead is measured with the canvas collapsed, so it is exact, and it is measured again
  // whenever the parts around the canvas change size.
  function fitPlot() {
    if (destroyed) return;
    const canvas = lab.canvas;
    if (!inFullscreen() || innerWidth < 1100) { if (canvas.style.height) canvas.style.removeProperty('height'); return; }
    const cs = getComputedStyle(stage);
    const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const keep = [plotCard.style.alignSelf, plotCard.style.minHeight, plotCard.style.height, canvas.style.height];
    plotCard.style.alignSelf = 'start'; plotCard.style.minHeight = '0'; plotCard.style.height = 'auto'; canvas.style.height = '0px';
    const overhead = plotCard.offsetHeight;
    [plotCard.style.alignSelf, plotCard.style.minHeight, plotCard.style.height, canvas.style.height] = keep;
    const want = `${Math.max(240, Math.floor(stage.clientHeight - pad - overhead - 1))}px`;
    if (canvas.style.height !== want) canvas.style.height = want;
  }
  if (typeof ResizeObserver === 'function') {
    const fitWatch = new ResizeObserver(() => fitPlot());
    for (const part of plotCard.querySelectorAll('.card-head, .playback, .plot-progress, .legend')) fitWatch.observe(part);
    lab.cleanup(() => fitWatch.disconnect());
  }
  const classWatch = new MutationObserver(fitPlot);
  classWatch.observe(stage, { attributes: true, attributeFilter: ['class'] });
  lab.cleanup(() => classWatch.disconnect());
  lab.on(document, 'fullscreenchange', fitPlot);
  lab.on(window, 'resize', fitPlot);

  lab.onTheme(() => { legendKey = ''; regionCache = null; drawAll(); });
  lab.onResize(() => { drawAll(); });

  newData();
  return lab.destroy;
}
