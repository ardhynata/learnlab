// Representation lab: an autoencoder learns a short code from generated 8x8 glyph pictures WITHOUT their labels
// (pretraining), then the learner spends a handful of labels on three ways to classify: (a) a linear classifier
// on the frozen pretrained code, (b) the same classifier on the raw pixels, (c) a small network trained from
// scratch on the labels alone. A map shows where the code puts each glyph, a grid shows the glyphs beside what
// the autoencoder rebuilds from its code, and a chart compares test accuracy across labelled-set sizes.
//   Generated data: 8x8 glyphs (four shapes, with noise); nothing is bundled, they are drawn by sims/ml/representation.js.
//   Penguins (real): a tiny tabular version. The four body measurements (NA rows dropped, and said so) go through an
//   autoencoder with a 2-number code, beside PCA to 2 components; the same three-way comparison runs on the species.
// All heavy work runs in slices of about 12 ms per animation frame (see createQueue in sims/ml/representationlab.js).
// The math is in sims/ml/representation.js and sims/ml/representationlab.js; this file draws and wires.
import { createLab, createPlot, dataModeSpec, loadDataset, predictBox, clusterColor, theme, tr, fmt, pct } from '../kit/index.js';
import { trainAutoencoder, featuresFrom, reconstructionError, subsetPerClass, GLYPH_SIZE } from '../ml/representation.js';
import {
  LAB_SIZES, sizeGrid, makeGlyphTask, makePenguinTask, scoreSteps, createQueue, projectTo2d, pcaBaseline, winnerOf,
} from '../ml/representationlab.js';
import { parseCsv } from '../ml/tabular.js';

export const DEFAULTS = { seed: 1, bottleneck: 8, epochs: 20, perClass: 5, noise: 0.15 };
const REAL_DEFAULTS = { bottleneck: 2, epochs: 100 };
const REPS = { frozen: 3, raw: 3, scratch: 2 };
const METHODS = ['frozen', 'raw', 'scratch'];
const MARKS = { frozen: '●', raw: '■', scratch: '▲' };
// Method colours come from the palette slots the classes never use (classes take 0-3), so one colour never means two things.
const METHOD_COLOR_SLOT = { frozen: 4, raw: 6, scratch: 5 };
const methodColor = m => clusterColor(METHOD_COLOR_SLOT[m]);
const DRAW_GAP_MS = 100;
const FRAME_BUDGET_MS = 12;
const GRID_COLUMNS = 12;

// loadDataset (sims/kit/data.js) drops a failed fetch from its cache, but a retry that must not reuse any earlier
// promise fetches the file directly, as the overfitting lab does.
const fetchPenguins = () => fetch(new URL('../../data/penguins.csv', import.meta.url)).then(r => {
  if (!r.ok) throw new Error(`dataset penguins: HTTP ${r.status}`);
  return r.text();
}).then(parseCsv);

const glyphName = name => ({
  bar: tr('Vertical bar', 'Batang vertikal'), hbar: tr('Horizontal bar', 'Batang horizontal'), cross: tr('Cross', 'Silang'),
  box: tr('Box', 'Kotak'), diagonal: tr('Diagonal', 'Diagonal'), anti: tr('Anti-diagonal', 'Anti-diagonal'),
}[name] ?? name);

const methodName = m => ({
  frozen: tr('Frozen pretrained features', 'Fitur pretrained yang dibekukan'),
  raw: tr('Raw pixels', 'Piksel mentah'),
  scratch: tr('Network from scratch', 'Network dari nol'),
})[m];
const methodNameReal = m => (m === 'raw' ? tr('Raw measurements', 'Pengukuran mentah') : methodName(m));

export function mount(root) {
  let alive = true;
  const lab = createLab(root, {
    title: tr('Learn from unlabelled pictures first', 'Belajar dulu dari gambar tanpa label'),
    hint: tr(
      'It learns a short code without labels. The map shows that code.',
      'Ia belajar kode pendek tanpa label. Peta menampilkan kode itu.'),
    status: true, legend: true,
    canvasLabel: tr('Map of the learned code, one dot per test glyph, coloured by class', 'Peta kode hasil belajar, satu titik per glyph test, diwarnai menurut kelas'),
    settingsTitle: tr('Controls', 'Pengaturan'),
    extra: {
      title: tr('Test accuracy at every size', 'Akurasi test di setiap ukuran'),
      hint: tr('Mean of 3 random labelled sets (2 from scratch). In the table, – means not pretrained yet and … means still scoring.',
        'Rata-rata 3 set berlabel acak (2 dari nol). Di tabel, – berarti belum dipretrain dan … berarti masih dihitung.'),
    },
  });
  lab.cleanup(() => { alive = false; cancelAnimationFrame(raf); });
  const plot = createPlot(lab.canvas, { xLabel: tr('Code axis 1', 'Sumbu kode 1'), yLabel: tr('Code axis 2', 'Sumbu kode 2') });

  // Predict first: which wins at 5 labelled examples per class?
  const box = predictBox(lab.ref('below'), {
    question: tr('With only 5 labelled examples per class, which wins: frozen pretrained features or raw pixels?',
      'Dengan hanya 5 contoh berlabel per kelas, mana yang menang: fitur pretrained yang dibekukan atau piksel mentah?'),
    choices: [
      ['frozen', tr('Frozen pretrained features', 'Fitur pretrained yang dibekukan')],
      ['raw', tr('Raw pixels', 'Piksel mentah')],
      ['tie', tr('About the same (within 3 points)', 'Hampir sama (selisih di bawah 3 poin)')],
    ],
    name: 'representation-predict',
    hint: tr('Press “Pretrain on unlabelled glyphs” first and wait until the chart has the 5-per-class points, then check again.',
      'Tekan dulu “Pretrain pada glyph tanpa label” dan tunggu sampai grafik punya titik 5 per kelas, lalu periksa lagi.'),
  });

  // Two cards beside the map: the glyph grid (or, for penguins, the PCA map) and the accuracy chart.
  const gridCanvas = lab.chartCard(
    tr('Glyphs and what the autoencoder rebuilds', 'Glyph dan hasil rekonstruksi autoencoder'),
    tr('Top: noisy inputs (the bar is the true class). Bottom: rebuilt from the code.',
      'Atas: input ber-noise (batang = kelas sebenarnya). Bawah: dibangun ulang dari kode.'),
    280);
  const chart = lab.chartCard(
    tr('Test accuracy against labelled examples', 'Akurasi test terhadap jumlah contoh berlabel'),
    tr('Dashed vertical line: your size. Dotted line: chance.',
      'Garis putus-putus vertikal: ukuranmu. Garis titik-titik: peluang acak.'),
    260);
  const gridCard = gridCanvas.closest('.card');
  const chartLegend = document.createElement('div');
  chartLegend.className = 'legend';
  chartLegend.style.maxHeight = 'none';
  chart.closest('.chart').before(chartLegend);

  const st = {
    table: null, loading: false, failed: false, poisoned: false,
    taskKey: '', task: null, pcaBase: null,
    ae: null, aeKey: '', pre: { running: false, done: false, target: 0 }, testCodes: null, beforeErr: null,
    cache: new Map(),        // `${method}|${size}|${rep}` -> accuracy; frozen entries belong to the current autoencoder
    version: 0, queued: new Set(), dirty: false, progressDirty: false, lastDraw: 0,
  };
  const queue = createQueue();
  let raf = 0;

  const controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real data)', 'Penguin (data nyata)')]] }),
    { name: 'bottleneck', type: 'range', label: tr('Bottleneck size (numbers in the code)', 'Ukuran bottleneck (jumlah angka dalam kode)'), min: 2, max: 16, step: 1, value: DEFAULTS.bottleneck },
    { name: 'epochs', type: 'range', label: tr('Pretraining epochs', 'Epoch pretraining'), min: 5, max: 100, step: 5, value: DEFAULTS.epochs },
    { name: 'perClass', type: 'range', label: tr('Labelled examples per class', 'Contoh berlabel per kelas'), min: 2, max: 100, step: 1, value: DEFAULTS.perClass },
    { name: 'noise', type: 'range', label: tr('Noise (chance a pixel flips)', 'Noise (peluang piksel terbalik)'), min: 0, max: 0.35, step: 0.05, value: DEFAULTS.noise, format: v => pct(v, 0) },
    { name: 'seed', type: 'number', label: tr('Seed', 'Seed'), min: 1, max: 999, step: 1, value: DEFAULTS.seed },
    { name: 'pretrain', type: 'button', label: tr('Pretrain on unlabelled glyphs', 'Pretrain pada glyph tanpa label'), onClick: () => startPretrain() },
    { name: 'fresh', type: 'button', label: tr('New glyphs', 'Glyph baru'), onClick: () => { controls.set('seed', (controls.values().seed % 999) + 1); rebuild(); } },
    { type: 'note', text: '' },
  ], onControl);
  const [controlNote] = controls.el.querySelectorAll('p.hint');
  const perClassInput = controls.el.querySelectorAll('input[type=range]')[2];
  const [pretrainBtn, freshBtn] = controls.el.querySelectorAll('.panel-button');
  const dataNote = document.createElement('p');
  dataNote.className = 'hint';
  controls.el.append(dataNote);
  const progress = document.createElement('progress');
  progress.max = 1; progress.value = 0; progress.hidden = true;
  progress.setAttribute('aria-label', tr('Pretraining progress', 'Kemajuan pretraining'));
  lab.ref('metrics').append(progress);

  const real = () => st.task?.kind === 'penguin';
  const wantReal = v => v.data === 'penguins' && st.table;

  // ---- state: task, autoencoder, scoring jobs ------------------------------------------------------------

  function aeOptions(v) {
    return real()
      ? { X: st.task.pool, bottleneck: v.bottleneck, hidden: 8, epochs: 0, lr: 0.03, batchSize: 16, seed: v.seed, denoise: 0 }
      : { X: st.task.pool, bottleneck: v.bottleneck, hidden: 24, epochs: 0, lr: 0.01, batchSize: 32, seed: v.seed, denoise: 0.15 };
  }
  const perClassOf = v => Math.min(v.perClass, st.task.perClassMax);
  const sizes = v => sizeGrid(perClassOf(v)).filter(s => s <= st.task.perClassMax);

  // A fresh, untrained autoencoder (random weights): the map shows what an untrained code looks like.
  function resetAe(v) {
    st.version++; queue.clear(); st.queued.clear();
    for (const key of [...st.cache.keys()]) if (key.startsWith('frozen|')) st.cache.delete(key);
    st.ae = trainAutoencoder(aeOptions(v));
    st.aeKey = `${st.taskKey}|${v.bottleneck}`;
    st.pre = { running: false, done: false, target: 0 };
    st.testCodes = null;
    // The untrained autoencoder's error on the very test rows the status line later reports.
    st.beforeErr = reconstructionError(st.ae, st.task.test.X);
    progress.hidden = true;
  }

  // Rebuilds the task when its data changed (mode, seed, noise); returns true when it did.
  function ensureTask(v) {
    const isReal = Boolean(wantReal(v));
    const key = `${isReal ? 'penguin' : 'glyph'}|${v.seed}|${isReal ? '' : v.noise}`;
    if (key === st.taskKey) return false;
    st.taskKey = key;
    st.task = isReal ? makePenguinTask(st.table, v.seed) : makeGlyphTask({ seed: v.seed, noise: v.noise });
    st.pcaBase = isReal ? pcaBaseline(st.task) : null;
    st.version++; queue.clear(); st.queued.clear(); st.cache.clear();
    st.ae = null;
    return true;
  }

  // Queues every score the chart and the table need that is not known yet: the learner's size first, then the others.
  function ensureJobs(v) {
    if (!st.task) return;
    const cur = perClassOf(v);
    const order = [cur, ...sizes(v).filter(s => s !== cur)];
    const ver = st.version;
    for (const s of order) {
      for (const method of METHODS) {
        if (method === 'frozen' && !st.pre.done) continue;
        for (let rep = 0; rep < REPS[method]; rep++) {
          const key = `${method}|${s}|${rep}`;
          if (st.cache.has(key) || st.queued.has(key)) continue;
          st.queued.add(key);
          queue.push({
            key,
            gen: scoreSteps(method, { task: st.task, ae: st.ae, testCodes: st.testCodes, perClass: s, rep, seed: v.seed }),
            onDone: acc => { if (ver !== st.version) return; st.cache.set(key, acc); st.dirty = true; },
          });
        }
      }
    }
    kick();
  }

  function* pretrainSteps(ae, target) {
    while (ae.epochsTrained < target) { ae.train(1); yield; }
  }

  function startPretrain() {
    const v = controls.values();
    ensureTask(v);
    resetAe(v);
    st.pre = { running: true, done: false, target: v.epochs };
    const ver = st.version, ae = st.ae;
    queue.push({
      key: 'pretrain', gen: pretrainSteps(ae, v.epochs),
      onDone: () => {
        if (ver !== st.version) return;
        st.pre.running = false; st.pre.done = true;
        st.testCodes = featuresFrom(ae, st.task.test.X);
        progress.hidden = true;
        st.dirty = true;
        ensureJobs(controls.values());
      },
    });
    progress.hidden = false;
    ensureJobs(v);
    draw();
  }

  function pump() {
    raf = 0;
    if (!alive) return;
    queue.run(FRAME_BUDGET_MS);
    if (st.pre.running) { st.progressDirty = true; progress.value = st.ae.epochsTrained / (st.pre.target || 1); }
    // At most about ten redraws a second: PCA of the codes, the chart and the table are too heavy to repeat every frame.
    // A full redraw when a score or the pretraining result changed; during pretraining only the map, glyphs and status.
    if ((st.dirty || st.progressDirty) && performance.now() - st.lastDraw >= DRAW_GAP_MS) {
      if (st.dirty) draw(); else drawProgress();
    }
    if (queue.size() || st.dirty || st.progressDirty) kick();
  }
  function kick() { if (!raf && alive) raf = requestAnimationFrame(pump); }

  // ---- data and controls -------------------------------------------------------------------------------------

  // A new sample or a new dataset: the old autoencoder and every score belong to the old data.
  function rebuild() {
    let v = controls.values();
    const changed = ensureTask(v);
    // The slider stops at the most labelled examples the data has per class (34 for the penguins).
    perClassInput.max = String(st.task.perClassMax);
    if (v.perClass > st.task.perClassMax) { controls.set('perClass', st.task.perClassMax); v = controls.values(); }
    if (changed || !st.ae) resetAe(v);
    ensureJobs(v);
    box.reset();
    draw();
  }

  function applyMode(isReal) {
    const d = isReal ? REAL_DEFAULTS : DEFAULTS;
    controls.set('bottleneck', d.bottleneck);
    controls.set('epochs', d.epochs);
    controls.disable('noise', isReal);
  }

  function onControl(name) {
    const v = controls.values();
    if (name === 'data') {
      if (v.data === 'penguins' && !st.table && !st.loading) {
        st.loading = true; st.failed = false;
        (st.poisoned ? fetchPenguins() : loadDataset('penguins')).then(table => { st.table = table; }).catch(() => {
          st.failed = true; st.poisoned = true;
          controls.set('data', 'generated');
        }).finally(() => {
          st.loading = false;
          if (!alive) return;
          if (controls.values().data === 'penguins' && st.table) { applyMode(true); rebuild(); } else draw();
        });
        draw();
        return;
      }
      applyMode(Boolean(wantReal(v)));
      rebuild();
      return;
    }
    if (name === 'noise' || name === 'seed') { rebuild(); return; }
    if (name === 'bottleneck') { if (st.ae) resetAe(v); ensureJobs(v); box.reset(); draw(); return; }
    if (name === 'perClass') { ensureJobs(v); draw(); return; }
    draw(); // epochs: only read when Pretrain is pressed
  }

  box.onCheck(() => {
    const v = controls.values();
    const a = valueAt('frozen', 5), b = valueAt('raw', 5);
    if (a == null || b == null || !st.task || st.task.perClassMax < 5) return;
    const win = winnerOf(a, b);
    const scores = tr(`At 5 labelled examples per class (${st.task.k * 5} in all) the frozen features scored ${pct(a, 0)} and the raw ${real() ? 'measurements' : 'pixels'} ${pct(b, 0)}, averaged over ${REPS.frozen} random labelled sets.`,
      `Pada 5 contoh berlabel per kelas (${st.task.k * 5} semuanya) fitur beku mendapat ${pct(a, 0)} dan ${real() ? 'pengukuran' : 'piksel'} mentah ${pct(b, 0)}, dirata-rata dari ${REPS.frozen} set berlabel acak.`);
    const why = real()
      ? tr('Here only 4 numbers describe a penguin and they are already informative, so squeezing them into 2 numbers loses more than it gains.',
        'Di sini hanya 4 angka yang menggambarkan penguin dan angka itu sudah informatif, jadi memampatkannya menjadi 2 angka lebih banyak merugikan daripada menguntungkan.')
      : tr(`This depends on the bottleneck (now ${v.bottleneck}): a code that is too narrow throws away what tells the shapes apart. With enough labels the raw pixels catch up, because a classifier can learn the shapes itself.`,
        `Ini bergantung pada bottleneck (sekarang ${v.bottleneck}): kode yang terlalu sempit membuang hal yang membedakan bentuk. Dengan label yang cukup, piksel mentah menyusul, karena classifier bisa mempelajari bentuknya sendiri.`);
    box.reveal(win, `${scores} ${why}`);
  });

  // The mean over the finished repeats, or null until every repeat of that point is scored.
  function valueAt(method, size) {
    let sum = 0;
    for (let rep = 0; rep < REPS[method]; rep++) {
      const x = st.cache.get(`${method}|${size}|${rep}`);
      if (x == null) return null;
      sum += x;
    }
    return sum / REPS[method];
  }

  // ---- drawing -----------------------------------------------------------------------------------------------

  const classLabel = c => (real() ? st.task.classNames[c] : glyphName(st.task.classNames[c]));
  const mName = m => (real() ? methodNameReal(m) : methodName(m));

  function mapPoints(v) {
    const { test, labelled } = st.task;
    const sub = subsetPerClass(labelled.y, perClassOf(v), { classes: st.task.k, seed: v.seed });
    const subX = sub.map(i => labelled.X[i]), subY = sub.map(i => labelled.y[i]);
    const codes = featuresFrom(st.ae, [...test.X, ...subX]);
    const { points, explained } = projectTo2d(codes);
    return { points, explained, nTest: test.X.length, subY };
  }

  // Share of the test points whose nearest class centre (in the map) is their own class.
  function centreAccuracy(points, nTest) {
    const { test, k } = { test: st.task.test, k: st.task.k };
    const sum = Array.from({ length: k }, () => [0, 0, 0]);
    for (let i = 0; i < nTest; i++) { const c = test.y[i]; sum[c][0] += points[i][0]; sum[c][1] += points[i][1]; sum[c][2]++; }
    let ok = 0;
    for (let i = 0; i < nTest; i++) {
      let best = 0, bd = Infinity;
      sum.forEach((s, c) => { const d = Math.hypot(points[i][0] - s[0] / s[2], points[i][1] - s[1] / s[2]); if (d < bd) { bd = d; best = c; } });
      if (best === test.y[i]) ok++;
    }
    return ok / nTest;
  }

  function drawMap(v) {
    const proj = mapPoints(v);
    const wide = v.bottleneck > 2;
    plot.setLabels(
      wide ? tr('Principal axis 1 of the code (scaled 0–10)', 'Sumbu utama 1 dari kode (skala 0–10)') : tr('Code number 1 (scaled 0–10)', 'Angka kode 1 (skala 0–10)'),
      wide ? tr('Principal axis 2 of the code (scaled 0–10)', 'Sumbu utama 2 dari kode (skala 0–10)') : tr('Code number 2 (scaled 0–10)', 'Angka kode 2 (skala 0–10)'));
    const g = plot.begin();
    const { ctx } = plot;
    plot.clip(() => {
      for (let i = 0; i < proj.nTest; i++) {
        ctx.globalAlpha = 0.6;
        plot.dot(proj.points[i][0], proj.points[i][1], clusterColor(st.task.test.y[i]), 4);
      }
      ctx.globalAlpha = 1;
      const r = proj.subY.length > 40 ? 3.5 : 7.5;
      proj.subY.forEach((c, i) => {
        const [x, y] = proj.points[proj.nTest + i];
        const X = g.px(x), Y = g.py(y);
        ctx.beginPath(); ctx.moveTo(X, Y - r); ctx.lineTo(X + r, Y); ctx.lineTo(X, Y + r); ctx.lineTo(X - r, Y); ctx.closePath();
        ctx.fillStyle = clusterColor(c); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = g.t.ink; ctx.stroke();
      });
    });
    return { ...proj, centre: centreAccuracy(proj.points, proj.nTest) };
  }

  function sizedCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { ctx, width, height };
  }

  // Three test glyphs of each class (up to 12), shown as input over reconstruction.
  function drawGlyphGrid() {
    const t = theme();
    const task = st.task, perClass = Math.max(1, Math.floor(GRID_COLUMNS / task.k));
    const picks = [];
    for (let c = 0; c < task.k; c++) {
      let n = 0;
      task.test.y.forEach((y, i) => { if (y === c && n < perClass) { picks.push(i); n++; } });
    }
    const labelH = 16, barH = 4, gap = 3;
    // On a narrow card the glyphs would be tiny in one row of 12, so they wrap into bands of 6 and the card grows to fit.
    const cols = gridCanvas.getBoundingClientRect().width < 460 ? 6 : GRID_COLUMNS;
    const bands = Math.ceil(picks.length / cols);
    const cellFor = w => Math.min(52, Math.floor((w - 8) / cols));
    const wanted = bands > 1 ? `${bands * (2 * (labelH + barH + cellFor(gridCanvas.getBoundingClientRect().width) + 8)) + 8}px` : '280px';
    if (gridCanvas.style.height !== wanted) gridCanvas.style.height = wanted;
    const { ctx, width, height } = sizedCanvas(gridCanvas);
    const cell = Math.max(6, Math.min(cellFor(width), Math.floor((height / bands - 8 - 2 * (labelH + barH + 8)) / 2)));
    const bandH = 2 * (labelH + barH + cell + 8);
    const yOff = Math.max(0, Math.floor((height - bands * bandH - 8) / 2));
    ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = t.ink;
    const px = (cell - gap) / GLYPH_SIZE;
    for (let b = 0; b < bands; b++) {
      const part = picks.slice(b * cols, (b + 1) * cols);
      const x0 = Math.max(4, Math.round((width - cell * part.length) / 2));
      const rowTop = [4 + yOff + b * bandH, 4 + yOff + b * bandH + labelH + barH + cell + 8];
      ctx.fillStyle = t.ink;
      ctx.fillText(tr('Input (noisy glyphs)', 'Input (glyph ber-noise)'), x0, rowTop[0] + 11);
      ctx.fillText(tr('Rebuilt from the code', 'Dibangun ulang dari kode'), x0, rowTop[1] + 11);
      part.forEach((idx, j) => {
        const x = task.test.X[idx];
        const rec = st.ae.reconstruct(x);
        [x, rec].forEach((img, row) => {
          const left = x0 + j * cell + gap / 2, top = rowTop[row] + labelH;
          if (row === 0) { ctx.fillStyle = clusterColor(task.test.y[idx]); ctx.fillRect(left, top, cell - gap, barH - 1); }
          const y0 = top + barH;
          ctx.fillStyle = t.plot; ctx.fillRect(left, y0, cell - gap, cell - gap);
          ctx.fillStyle = t.ink;
          for (let i = 0; i < img.length; i++) {
            if (img[i] < 0.04) continue;
            ctx.globalAlpha = Math.min(1, img[i]);
            ctx.fillRect(left + (i % GLYPH_SIZE) * px, y0 + Math.floor(i / GLYPH_SIZE) * px, Math.ceil(px), Math.ceil(px));
          }
          ctx.globalAlpha = 1;
        });
      });
    }
  }

  // Penguins: the same test rows projected on the first two principal components of the pool (PCA never sees species).
  function drawPcaMap() {
    if (gridCanvas.style.height !== '280px') gridCanvas.style.height = '280px';
    const p2 = createPlot(gridCanvas, { xLabel: tr('PCA component 1 (scaled 0–10)', 'Komponen PCA 1 (skala 0–10)'), yLabel: tr('PCA component 2 (scaled 0–10)', 'Komponen PCA 2 (skala 0–10)') });
    p2.begin();
    const { points } = projectTo2d(st.pcaBase.testCodes);
    p2.clip(() => {
      p2.ctx.globalAlpha = 0.6;
      points.forEach(([x, y], i) => p2.dot(x, y, clusterColor(st.task.test.y[i]), 4));
      p2.ctx.globalAlpha = 1;
    });
  }

  function drawChart(v) {
    const { ctx, width, height } = sizedCanvas(chart);
    const t = theme(), task = st.task, grid = sizes(v), cur = perClassOf(v);
    const m = { l: 46, r: 16, t: 24, b: 40 };
    const lo = Math.log(grid[0]), hi = Math.log(grid[grid.length - 1]), padX = 10;
    const X = s => m.l + padX + (Math.log(s) - lo) / ((hi - lo) || 1) * (width - m.l - m.r - 2 * padX);
    const yMin = 0.2, yMax = 1;
    const Y = a => height - m.b - (a - yMin) / (yMax - yMin) * (height - m.t - m.b);
    ctx.fillStyle = t.plot; ctx.fillRect(m.l, m.t, width - m.l - m.r, height - m.t - m.b);
    ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = t.muted; ctx.strokeStyle = t.grid; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.textAlign = 'right';
    for (const a of [0.2, 0.4, 0.6, 0.8, 1]) { ctx.moveTo(m.l, Y(a)); ctx.lineTo(width - m.r, Y(a)); ctx.fillText(pct(a, 0), m.l - 6, Y(a) + 4); }
    ctx.textAlign = 'center';
    for (const s of grid.filter(s => LAB_SIZES.includes(s) || s === cur)) { ctx.moveTo(X(s), m.t); ctx.lineTo(X(s), height - m.b); ctx.fillText(fmt(s), X(s), height - m.b + 15); }
    ctx.stroke();
    ctx.fillText(tr('Labelled examples per class (log scale)', 'Contoh berlabel per kelas (skala log)'), (m.l + width - m.r) / 2, height - 6);
    ctx.save(); ctx.translate(11, (m.t + height - m.b) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(tr('Test accuracy', 'Akurasi test'), 0, 0); ctx.restore();
    // chance
    ctx.save(); ctx.setLineDash([2, 3]); ctx.strokeStyle = t.muted; ctx.beginPath(); ctx.moveTo(m.l, Y(task.k ? 1 / task.k : 0.25)); ctx.lineTo(width - m.r, Y(1 / task.k)); ctx.stroke(); ctx.restore();
    ctx.textAlign = 'right'; ctx.fillStyle = t.muted;
    ctx.fillText(tr(`chance ${pct(1 / task.k, 0)}`, `peluang acak ${pct(1 / task.k, 0)}`), width - m.r - 4, Y(1 / task.k) - 4);
    // the learner's size
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = t.ink; ctx.beginPath(); ctx.moveTo(X(cur), m.t); ctx.lineTo(X(cur), height - m.b); ctx.stroke(); ctx.restore();
    ctx.fillStyle = t.ink; ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = cur > (grid[grid.length - 1] + grid[0]) / 2 ? 'right' : 'left';
    ctx.fillText(tr(`your size: ${cur}`, `ukuranmu: ${cur}`), X(cur) + (ctx.textAlign === 'right' ? 4 : -4), m.t - 7);
    // the three lines
    METHODS.forEach(method => {
      const color = methodColor(method);
      const pts = grid.map(s => [s, valueAt(method, s)]).filter(p => p[1] != null);
      if (!pts.length) return;
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
      if (method === 'scratch') ctx.setLineDash([6, 4]);
      ctx.beginPath(); pts.forEach(([s, a], k) => (k ? ctx.lineTo(X(s), Y(a)) : ctx.moveTo(X(s), Y(a)))); ctx.stroke(); ctx.restore();
      ctx.fillStyle = color;
      for (const [s, a] of pts) {
        const x = X(s), y = Y(a), r = s === cur ? 6 : 4;
        ctx.beginPath();
        if (method === 'frozen') ctx.arc(x, y, r, 0, 2 * Math.PI);
        else if (method === 'raw') ctx.rect(x - r, y - r, 2 * r, 2 * r);
        else { ctx.moveTo(x, y - r - 1); ctx.lineTo(x + r + 1, y + r); ctx.lineTo(x - r - 1, y + r); ctx.closePath(); }
        ctx.fill();
        if (s === cur) { ctx.lineWidth = 2; ctx.strokeStyle = t.ink; ctx.stroke(); }
      }
    });
    chartLegend.replaceChildren(...METHODS.map(method => {
      const span = document.createElement('span');
      const mark = document.createElement('b');
      mark.textContent = MARKS[method]; mark.style.color = methodColor(method); mark.setAttribute('aria-hidden', 'true');
      span.append(mark, ` ${mName(method)}${method === 'scratch' ? tr(' (dashed)', ' (putus-putus)') : ''}`);
      return span;
    }));
  }

  function drawTable(v) {
    const cur = perClassOf(v);
    const table = document.createElement('table');
    const head = table.createTHead().insertRow();
    for (const h of [tr('Per class (in all)', 'Per kelas (total)'), tr('Frozen features', 'Fitur beku'), real() ? tr('Raw measurements', 'Pengukuran mentah') : tr('Raw pixels', 'Piksel mentah'), tr('From scratch', 'Dari nol')]) head.insertCell().textContent = h;
    const body = table.createTBody();
    for (const s of sizes(v)) {
      const row = body.insertRow();
      row.insertCell().textContent = `${fmt(s)} (${fmt(s * st.task.k)})`;
      for (const method of METHODS) {
        const a = valueAt(method, s);
        row.insertCell().textContent = a != null ? pct(a, 1) : method === 'frozen' && !st.pre.done ? '–' : '…';
      }
      if (s === cur) for (const td of row.cells) { td.style.background = 'var(--accent-soft)'; td.style.fontWeight = '700'; }
    }
    // Headers may wrap and the padding is tight, so all four columns fit a phone-width card without sideways scrolling.
    table.style.width = '100%';
    for (const cell of table.querySelectorAll('td, th')) { cell.style.padding = '6px 6px'; cell.style.whiteSpace = 'normal'; cell.style.verticalAlign = 'top'; }
    lab.extraEl.replaceChildren(table);
  }

  function updateText(v, map) {
    const task = st.task, items = real() ? tr('penguins', 'penguin') : tr('glyphs', 'glyph');
    const err = x => fmt(x, { digits: real() ? 4 : 3 });
    const unit = real() ? tr('measurement', 'pengukuran') : tr('pixel', 'piksel');
    const ae = st.ae;
    const pool = task.pool.length;
    const errNow = reconstructionError(ae, task.test.X);
    let status;
    if (st.loading) status = tr('Loading the penguin data…', 'Memuat data penguin…');
    else if (st.pre.running) {
      status = tr(`Pretraining: epoch ${ae.epochsTrained} of ${st.pre.target}. Test error ${err(errNow)} per ${unit}.`,
        `Pretraining: epoch ${ae.epochsTrained} dari ${st.pre.target}. Error test ${err(errNow)} per ${unit}.`);
    } else if (st.pre.done) {
      status = tr(`Pretrained ${ae.epochsTrained} epochs. Test error ${err(errNow)} per ${unit} (${err(st.beforeErr)} before).`,
        `Dipretrain ${ae.epochsTrained} epoch. Error test ${err(errNow)} per ${unit} (${err(st.beforeErr)} sebelumnya).`);
      if (v.epochs !== ae.epochsTrained) status += ' ' + tr(`The slider is at ${v.epochs} epochs: press Pretrain to train again.`, `Slider ada di ${v.epochs} epoch: tekan Pretrain untuk melatih ulang.`);
    } else {
      status = real()
        ? tr('Not pretrained yet: the map shows a random code.', 'Belum dipretrain: peta menampilkan kode acak.')
        : tr('Not pretrained yet: the map shows a random code.', 'Belum dipretrain: peta menampilkan kode acak.');
    }
    lab.setStatus(status);
    const cur = perClassOf(v);
    const show = (method) => {
      const a = valueAt(method, cur);
      if (a != null) return pct(a, 0);
      return method === 'frozen' && !st.pre.done ? tr('not pretrained yet', 'belum dipretrain') : '…';
    };
    const short = m => ({ frozen: tr('frozen', 'beku'), raw: tr('raw', 'mentah'), scratch: tr('from scratch', 'dari nol') })[m];
    let detail = tr(
      `At ${cur} labelled per class (${cur * task.k} in all): ${short('frozen')} ${show('frozen')}, ${short('raw')} ${show('raw')}, ${short('scratch')} ${show('scratch')}.`,
      `Pada ${cur} berlabel per kelas (${cur * task.k} semuanya): ${short('frozen')} ${show('frozen')}, ${short('raw')} ${show('raw')}, ${short('scratch')} ${show('scratch')}.`);
    if (!st.pre.done && !st.pre.running) {
      detail += ' ' + (real() ? tr('Press “Pretrain on unlabelled penguins”.', 'Tekan “Pretrain pada penguin tanpa label”.') : tr('Press “Pretrain on unlabelled glyphs”.', 'Tekan “Pretrain pada glyph tanpa label”.'));
    } else if (real() && st.pcaBase) {
      detail += ' ' + tr(`Test error: autoencoder ${err(errNow)} (${v.bottleneck} numbers), PCA ${err(st.pcaBase.mse)} (2 components).`,
        `Error test: autoencoder ${err(errNow)} (${v.bottleneck} angka), PCA ${err(st.pcaBase.mse)} (2 komponen).`);
    } else {
      detail += ' ' + tr(`In the map, ${pct(map.centre, 0)} of test ${items} lie nearest their own class centre.`,
        `Di peta, ${pct(map.centre, 0)} ${items} test paling dekat ke pusat kelasnya sendiri.`);
    }
    lab.setDetail(detail);
    lab.describe(lab.canvas, `${status} ${detail} ` + tr(`The map shows the first 2 principal axes of the ${v.bottleneck}-number code, which keep ${pct(map.explained, 0)} of its variance. ${pct(map.centre, 0)} of test ${items} lie nearest their own class centre.`, `Peta menampilkan 2 sumbu utama pertama dari kode ${v.bottleneck} angka, yang menyimpan ${pct(map.explained, 0)} variansnya. ${pct(map.centre, 0)} ${items} test paling dekat ke pusat kelasnya sendiri.`));
    const a5 = ['frozen', 'raw', 'scratch'].map(m => valueAt(m, cur));
    lab.describe(chart, tr(`At ${cur} labelled examples per class: frozen ${a5[0] == null ? 'not available' : pct(a5[0], 0)}, raw ${a5[1] == null ? 'not scored yet' : pct(a5[1], 0)}, from scratch ${a5[2] == null ? 'not scored yet' : pct(a5[2], 0)}.`,
      `Pada ${cur} contoh berlabel per kelas: fitur beku ${a5[0] == null ? 'tidak tersedia' : pct(a5[0], 0)}, mentah ${a5[1] == null ? 'belum dihitung' : pct(a5[1], 0)}, dari nol ${a5[2] == null ? 'belum dihitung' : pct(a5[2], 0)}.`));
  }

  function updateLabels(v) {
    const isReal = real();
    pretrainBtn.textContent = isReal ? tr('Pretrain on unlabelled penguins', 'Pretrain pada penguin tanpa label') : tr('Pretrain on unlabelled glyphs', 'Pretrain pada glyph tanpa label');
    freshBtn.textContent = isReal ? tr('New split', 'Pembagian baru') : tr('New glyphs', 'Glyph baru');
    const h2 = gridCard.querySelector('h2'), hint = gridCard.querySelector('p.hint');
    if (isReal) {
      h2.textContent = tr('PCA of the same four measurements', 'PCA dari empat pengukuran yang sama');
      const t = st.task;
      hint.textContent = tr(`The same test penguins on the first two principal components; PCA never sees the species either. ${t.dropped} of ${t.total} rows had a missing value (NA) and were dropped, leaving ${t.total - t.dropped}.`,
        `Penguin test yang sama pada dua komponen utama pertama; PCA juga tidak pernah melihat spesies. ${t.dropped} dari ${t.total} baris punya missing value (NA) dan dibuang, tersisa ${t.total - t.dropped}.`);
      gridCanvas.setAttribute('aria-label', h2.textContent);
      lab.canvas.setAttribute('aria-label', tr('Map of the autoencoder code, one dot per test penguin, coloured by species', 'Peta kode autoencoder, satu titik per penguin test, diwarnai menurut spesies'));
    } else {
      h2.textContent = tr('Glyphs and what the autoencoder rebuilds', 'Glyph dan hasil rekonstruksi autoencoder');
      hint.textContent = tr('Top: noisy inputs (the bar is the true class). Bottom: rebuilt from the code.',
        'Atas: input ber-noise (batang = kelas sebenarnya). Bawah: dibangun ulang dari kode.');
      gridCanvas.setAttribute('aria-label', h2.textContent);
      lab.canvas.setAttribute('aria-label', tr('Map of the learned code, one dot per test glyph, coloured by class', 'Peta kode hasil belajar, satu titik per glyph test, diwarnai menurut kelas'));
    }
    controlNote.textContent = isReal
      ? tr('The autoencoder never sees a label; only the three classifiers on the chart use them. The input has only 4 numbers: try a bottleneck of 2, then 3, then 4.',
        'Autoencoder tidak pernah melihat label; hanya tiga classifier pada grafik yang memakainya. Inputnya hanya 4 angka: coba bottleneck 2, lalu 3, lalu 4.')
      : tr('The autoencoder never sees a label; only the three classifiers on the chart use them. Try a bottleneck of 3, then 8, then 16.',
        'Autoencoder tidak pernah melihat label; hanya tiga classifier pada grafik yang memakainya. Coba bottleneck 3, lalu 8, lalu 16.');
    const note = isReal
      ? (() => {
        const t = st.task;
        return tr(`Palmer penguins: four measurements scaled to 0–1, split in half into a pool and a test set. Labelled examples stop at ${t.perClassMax} per class (Chinstrap).`,
          `Penguin Palmer: empat pengukuran diskalakan ke 0–1, dibagi dua menjadi pool dan set test. Contoh berlabel berhenti di ${t.perClassMax} per kelas (Chinstrap).`);
      })()
      : v.data === 'penguins' && st.loading
        ? tr('Loading the penguin data…', 'Memuat data penguin…')
        : tr('The glyphs are generated (no bundled images). Choose Penguins (real data) for a tiny tabular version.',
          'Glyph dibuat oleh lab (tanpa gambar bawaan). Pilih Penguin (data nyata) untuk versi tabular mini.')
          + (st.failed ? ' ' + tr('The penguin data could not be loaded, so the generated data is shown. Choose Penguins (real data) again to retry.', 'Data penguin tidak dapat dimuat, jadi data buatan yang ditampilkan. Pilih Penguin (data nyata) lagi untuk mencoba ulang.') : '');
    dataNote.textContent = note;
  }

  // Pretraining progress: the map, the rebuilt glyphs and the status line. The chart and the table only change with a score.
  function drawProgress() {
    if (!alive) return;
    st.progressDirty = false; st.lastDraw = performance.now();
    const v = controls.values();
    if (!st.task || !st.ae) { draw(); return; }
    const map = drawMap(v);
    if (!real()) drawGlyphGrid();
    updateText(v, map);
  }

  function draw() {
    if (!alive) return;
    st.dirty = false; st.progressDirty = false; st.lastDraw = performance.now();
    const v = controls.values();
    if (!st.task) { ensureTask(v); }
    if (!st.ae) resetAe(v);
    updateLabels(v);
    const map = drawMap(v);
    if (real()) drawPcaMap(); else drawGlyphGrid();
    drawChart(v);
    drawTable(v);
    updateText(v, map);
    lab.setLegend([
      ...st.task.classNames.map((_, c) => ({ kind: 'dot', color: clusterColor(c), label: classLabel(c) })),
      { kind: 'diamond', color: theme().muted, label: tr('Labelled example (diamond)', 'Contoh berlabel (belah ketupat)') },
    ]);
  }

  lab.onReset(() => {
    st.failed = false;
    controls.set('data', 'generated');
    for (const name of ['bottleneck', 'epochs', 'perClass', 'noise', 'seed']) controls.set(name, DEFAULTS[name]);
    applyMode(false);
    st.ae = null;
    rebuild();
  });
  lab.onTheme(draw);
  lab.onResize(draw);
  rebuild();
  return lab.destroy;
}
