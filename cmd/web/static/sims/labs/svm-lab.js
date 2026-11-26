// SVM lab, built on the kit: two classes of points, the decision regions an SVM draws between them,
// the boundary, the margin lines (linear kernel) and the circled support vectors. The learner picks the
// kernel (linear or RBF), moves C and gamma on log sliders, and DRAGS any point (or picks it up with the
// keyboard): the model is retrained on every move, so the margin and the support vectors change live.
// Datasets: four generated layouts, or real penguins (Adelie against Chinstrap by bill length and bill
// depth; rows with a missing value are left out and the lab says so). Roughly a third of the points are
// held out: never trained on, only scored, so the learner can see training and held-out accuracy part
// ways. Pure math (datasets, split, fit, contour lines, keyboard navigation) is in ml/svmlab.js on top of
// ml/svm.js; this file only draws and wires.
import { createLab, createPlot, dataModeSpec, loadDataset, predictBox, clusterColor, formatTick, tr, fmt, pct } from '../kit/index.js';
import { decisionGrid } from '../ml/svm.js';
import {
  HALF, PER_CLASS, generatedPoints, penguinPairs, samplePairs, heldOutFlags, standardisePairs, fromLog, fitLab,
  contourSegments, neighbourInDirection, classifyChange,
} from '../ml/svmlab.js';

const DEFAULT_SEED = 7;
const GRID_STEPS = 72;
const KEY_STEP = 0.1;
const KEY_STEP_BIG = 0.5;
const LOG_C = { min: -2, max: 2, value: -1 };
const LOG_GAMMA = { min: -2, max: 1, value: 0 };
const MUCH_LARGER = 0.8;   // a rise of 0.8 on the log10 slider is a bit over six times: "much larger"

// C and gamma are shown with the digits that matter at their size (0.1, 1.26, 12.6, 126).
const valueText = v => fmt(v, { max: v >= 100 ? 0 : v >= 10 ? 1 : v >= 1 ? 2 : v >= 0.1 ? 3 : 4 });

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Support vector machine', 'Support vector machine'),
    hint: tr(
      'Drag any point and the model retrains as you move it. Shading shows what the model predicts, the solid line is its boundary, dashed lines are the margin, circled points are the support vectors.',
      'Seret titik mana pun dan model dilatih ulang saat kamu menggesernya. Arsiran menunjukkan prediksi model, garis tebal adalah boundary-nya, garis putus-putus adalah margin, titik yang dilingkari adalah support vector.'),
    status: true, legend: true,
    canvasLabel: tr(
      'Scatter plot of two classes with the SVM decision regions, boundary, margin lines and circled support vectors. Arrow keys select a point, Enter picks it up or puts it down, arrow keys move a picked-up point (Shift for bigger steps), Escape puts it down.',
      'Scatter plot dua kelas beserta daerah keputusan SVM, boundary, garis margin, dan support vector yang dilingkari. Tombol panah memilih titik, Enter mengangkat atau meletakkannya, tombol panah menggeser titik yang diangkat (Shift untuk langkah lebih besar), Escape meletakkannya.'),
    extra: {
      title: tr('What the model learned', 'Yang dipelajari model'),
      hint: tr(
        'Support vectors are the training points on or inside the margin: only they shape the boundary. Margin width is in plot units (standard deviations for penguins). Held-out points are never used to train the model.',
        'Support vector adalah titik training yang berada di garis margin atau di dalamnya: hanya titik inilah yang membentuk boundary. Lebar margin dalam satuan plot (simpangan baku untuk penguin). Titik held-out tidak pernah dipakai untuk melatih model.'),
    },
  });
  const plot = createPlot(lab.canvas, { xLabel: '', yLabel: '', range: { minX: -HALF, minY: -HALF, span: 2 * HALF } });
  const legendHost = lab.ref('legend');
  if (legendHost) legendHost.style.maxHeight = 'none';

  let mode = 'generated', seed = DEFAULT_SEED, real = null, loading = false, loadFailed = false, loadToken = 0, destroyed = false;
  let pts = [], base = [], info = { penguins: false, scaler: null };
  let fit = null, grid = null, baseline = null, axisTitles = ['', ''];
  let selected = -1, holding = false, drag = null, raf = 0, timer = 0;

  const statusEl = lab.ref('status');
  const live = document.createElement('p');
  live.className = 'sr-only';
  live.setAttribute('role', 'status');
  lab.canvas.after(live);

  const controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real)', 'Penguin (data nyata)')]] }),
    {
      name: 'shape', type: 'select', label: tr('Generated shape', 'Bentuk data buatan'), value: 'blobs',
      options: [
        ['blobs', tr('Two blobs', 'Dua kumpulan titik')], ['overlap', tr('Overlapping blobs', 'Dua kumpulan yang tumpang tindih')],
        ['rings', tr('Two rings', 'Dua cincin')], ['moons', tr('Moons', 'Bulan sabit')],
      ],
    },
    {
      name: 'kernel', type: 'select', label: tr('Kernel', 'Kernel'), value: 'linear',
      options: [['linear', tr('Linear (straight line)', 'Linear (garis lurus)')], ['rbf', tr('RBF (curved)', 'RBF (melengkung)')]],
    },
    { name: 'logC', type: 'range', label: tr('C (penalty for points inside the margin)', 'C (penalti untuk titik di dalam margin)'), ...LOG_C, step: 0.1, format: v => valueText(fromLog(v)) },
    { name: 'logGamma', type: 'range', label: tr('Gamma (how tightly the RBF curve bends)', 'Gamma (seberapa tajam kurva RBF menekuk)'), ...LOG_GAMMA, step: 0.1, format: v => valueText(fromLog(v)) },
    { name: 'newSample', type: 'button', label: tr('New sample', 'Sampel baru'), onClick: () => { seed += 1; rebuild(); lab.canvas.focus(); } },
    { name: 'restore', type: 'button', label: tr('Put points back', 'Kembalikan titik'), onClick: () => { restorePoints(); } },
    { type: 'note', text: tr('Drag a point with the mouse or your finger. Keyboard: focus the plot, arrow keys select the nearest point in that direction, Enter picks it up, arrow keys move it (Shift for bigger steps), Enter or Escape puts it down.', 'Seret titik dengan mouse atau jarimu. Keyboard: fokus ke plot, tombol panah memilih titik terdekat ke arah itu, Enter mengangkatnya, tombol panah menggesernya (Shift untuk langkah lebih besar), Enter atau Escape meletakkannya.') },
  ], name => {
    if (name === 'data') { setMode(controls.get('data')); return; }
    if (name === 'shape') { rebuild(); return; }
    refit();
    if (name === 'logC' || name === 'logGamma') { draw(); announceSoon(); revealPrediction(); } else { snapshot(); draw(); announceSoon(); }
  });
  const dataNote = document.createElement('p');
  dataNote.className = 'hint';
  controls.el.querySelector('select').closest('label').after(dataNote);

  const box = predictBox(lab.ref('below'), {
    hint: tr('Use the linear kernel, pick an answer, then raise C by a lot (ten times or more) and check again.', 'Pakai kernel linear, pilih jawaban, lalu naikkan C jauh lebih besar (sepuluh kali atau lebih) dan periksa lagi.'),
    name: 'predict-c',
    question: tr('If you make C much larger, what happens to the margin and to the number of support vectors?', 'Jika kamu membuat C jauh lebih besar, apa yang terjadi pada margin dan pada jumlah support vector?'),
    choices: [
      ['narrow-fewer', tr('The margin gets narrower and there are fewer support vectors', 'Margin menyempit dan support vector menjadi lebih sedikit')],
      ['narrow-more', tr('The margin gets narrower and there are more support vectors', 'Margin menyempit dan support vector menjadi lebih banyak')],
      ['wide-fewer', tr('The margin gets wider and there are fewer support vectors', 'Margin melebar dan support vector menjadi lebih sedikit')],
      ['wide-more', tr('The margin gets wider and there are more support vectors', 'Margin melebar dan support vector menjadi lebih banyak')],
      ['same', tr('Neither changes much', 'Keduanya hampir tidak berubah')],
    ],
  });
  lab.cleanup(() => box.destroy());
  // The comparison starts from the state the learner saw when they picked an answer.
  box.onPick(() => snapshot());
  box.onCheck(() => revealPrediction());

  // ---- data ------------------------------------------------------------------

  const classNames = () => (info.penguins ? ['Adelie', 'Chinstrap'] : [tr('Class A', 'Kelas A'), tr('Class B', 'Kelas B')]);
  const colorOf = label => clusterColor(label === -1 ? 0 : 1);

  function rebuild() {
    if (mode === 'penguins' && real) {
      const sample = samplePairs(real.pairs, PER_CLASS, seed);
      const held = heldOutFlags(sample.map(p => p.label), seed);
      const { points, scaler } = standardisePairs(sample, held);
      pts = points.map((p, i) => ({ ...p, held: held[i] }));
      info = { penguins: true, scaler };
      axisTitles = [tr('Bill length (standardized)', 'Panjang paruh (terstandar)'), tr('Bill depth (standardized)', 'Kedalaman paruh (terstandar)')];
    } else {
      const raw = generatedPoints(controls.get('shape'), seed);
      const held = heldOutFlags(raw.map(p => p.label), seed);
      pts = raw.map((p, i) => ({ ...p, held: held[i] }));
      info = { penguins: false, scaler: null };
      axisTitles = [tr('Feature 1', 'Feature 1'), tr('Feature 2', 'Feature 2')];
    }
    base = pts.map(p => ({ ...p }));
    selected = -1; holding = false;
    refit(); snapshot(); draw(); announceSoon();
    live.textContent = '';
  }

  function restorePoints() {
    pts = base.map(p => ({ ...p }));
    holding = false;
    refit(); snapshot(); draw(); announceSoon();
  }

  async function setMode(next) {
    const token = ++loadToken;
    loadFailed = false;
    if (next === 'generated') { mode = 'generated'; loading = false; syncControls(); rebuild(); return; }
    loading = true; mode = next; syncControls(); draw();
    try {
      const table = await loadDataset(next);
      if (destroyed || token !== loadToken) return;
      real = penguinPairs(table);
      loading = false;
    } catch {
      if (destroyed || token !== loadToken) return;
      loading = false; loadFailed = true; mode = 'generated';
      controls.set('data', 'generated');
    }
    syncControls();
    rebuild();
    if (loadFailed) say(failText());
  }

  // The shape select only matters for generated data, gamma only for the RBF kernel.
  function syncControls() {
    controls.show('shape', mode === 'generated');
    controls.show('logGamma', controls.get('kernel') === 'rbf');
  }

  // ---- model -----------------------------------------------------------------

  const params = () => ({ kernel: controls.get('kernel'), C: fromLog(controls.get('logC')), gamma: fromLog(controls.get('logGamma')) });

  function refit() {
    syncControls();
    if (!pts.length) { fit = null; grid = null; return; }
    fit = fitLab(pts, params());
    grid = decisionGrid(fit.model, { xMin: -HALF, xMax: HALF, yMin: -HALF, yMax: HALF }, GRID_STEPS);
  }
  // During a drag the model is retrained at most once per animation frame.
  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; refit(); draw(); });
  }
  lab.cleanup(() => { cancelAnimationFrame(raf); clearTimeout(timer); });

  // ---- Quick Quiz: what a much larger C does -----------------------------------

  function snapshot() {
    baseline = fit && fit.margin != null ? { logC: controls.get('logC'), margin: fit.margin, nSupport: fit.nSupport } : null;
  }
  function revealPrediction() {
    if (!fit || box.chosen() == null || !baseline || fit.margin == null) return;
    const logC = controls.get('logC');
    if (logC - baseline.logC < MUCH_LARGER) return;
    const key = classifyChange(baseline, fit);
    const c0 = valueText(fromLog(baseline.logC)), c1 = valueText(fromLog(logC));
    const m0 = fmt(baseline.margin, { digits: 2 }), m1 = fmt(fit.margin, { digits: 2 });
    box.reveal(key, tr(
      `C went from ${c0} to ${c1}: the margin width went from ${m0} to ${m1} and the support vectors from ${fmt(baseline.nSupport)} to ${fmt(fit.nSupport)}. A large C punishes every point inside the margin, so the margin squeezes in to leave fewer of them there.`,
      `C berubah dari ${c0} menjadi ${c1}: lebar margin berubah dari ${m0} menjadi ${m1} dan support vector dari ${fmt(baseline.nSupport)} menjadi ${fmt(fit.nSupport)}. C yang besar menghukum setiap titik di dalam margin, sehingga margin menyempit agar lebih sedikit titik yang tersisa di dalamnya.`));
  }

  // ---- pointer ---------------------------------------------------------------

  const nearest = e => plot.nearest(e, pts, 16);
  lab.on(lab.canvas, 'pointerdown', e => {
    if (loading) return;
    const i = nearest(e);
    if (i < 0) return;
    selected = i; holding = false;
    drag = { id: e.pointerId };
    setBusy();
    lab.canvas.setPointerCapture(e.pointerId);
    lab.canvas.focus();
    lab.setDetail(tr(`Dragging ${pointName(i)}: ${whereText(i)}.`, `Menggeser ${pointName(i)}: ${whereText(i)}.`));
    draw();
  });
  lab.on(lab.canvas, 'pointermove', e => {
    if (drag?.id === e.pointerId && selected >= 0) {
      const p = plot.toData(e);
      pts[selected].x = p.x; pts[selected].y = p.y;
      schedule();
      return;
    }
    if (!drag && !loading) lab.canvas.style.cursor = nearest(e) >= 0 ? 'grab' : '';
  });
  const endDrag = e => {
    if (drag?.id !== e.pointerId) return;
    drag = null;
    cancelAnimationFrame(raf); raf = 0;
    refit(); snapshot();
    lab.setDetail(tr(`Moved ${pointName(selected)} to ${whereText(selected)}.`, `${pointName(selected)} digeser ke ${whereText(selected)}.`));
    draw();
    announce();
  };
  lab.on(lab.canvas, 'pointerup', endDrag);
  lab.on(lab.canvas, 'pointercancel', endDrag);

  // ---- keyboard: arrows select, Enter picks up and puts down, arrows move ---------

  const DIRS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
  lab.on(lab.canvas, 'keydown', e => {
    if (loading || !pts.length) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (selected < 0) { selected = neighbourInDirection(pts, -1, [1, 0]); say(selectionText(selected)); draw(); return; }
      holding = !holding;
      if (holding) say(tr(`Picked up ${pointName(selected)}. Arrow keys move it, Enter puts it down.`, `${pointName(selected)} diangkat. Tombol panah menggesernya, Enter meletakkannya.`));
      else { snapshot(); announce(); }
      draw();
      return;
    }
    if (e.key === 'Escape') {
      if (holding) { e.preventDefault(); holding = false; snapshot(); announce(); draw(); }
      else if (selected >= 0) { e.preventDefault(); selected = -1; say(tr('No point selected.', 'Tidak ada titik yang dipilih.')); draw(); }
      return;
    }
    const d = DIRS[e.key];
    if (!d) return;
    e.preventDefault();
    if (holding) {
      const step = e.shiftKey ? KEY_STEP_BIG : KEY_STEP, p = pts[selected];
      p.x = Math.max(-HALF, Math.min(HALF, p.x + d[0] * step));
      p.y = Math.max(-HALF, Math.min(HALF, p.y + d[1] * step));
      setBusy();
      refit(); draw();
      announceSoon();
      return;
    }
    const next = neighbourInDirection(pts, selected, d);
    if (next < 0) { say(tr('No point further that way.', 'Tidak ada titik lagi ke arah itu.')); return; }
    selected = next;
    say(selectionText(selected));
    draw();
  });
  lab.on(lab.canvas, 'blur', () => { if (holding) { holding = false; snapshot(); announce(); draw(); } });

  // ---- text ------------------------------------------------------------------

  const pointName = i => {
    const p = pts[i];
    return tr(`point ${i + 1} (${classNames()[p.label === -1 ? 0 : 1]}, ${p.held ? 'held-out' : 'training'})`, `titik ${i + 1} (${classNames()[p.label === -1 ? 0 : 1]}, ${p.held ? 'held-out' : 'training'})`);
  };
  const whereText = i => {
    const p = pts[i];
    if (info.scaler) {
      const a = info.scaler[0].mean + p.x * info.scaler[0].sd, b = info.scaler[1].mean + p.y * info.scaler[1].sd;
      return tr(`bill length ${fmt(a, { digits: 1 })} mm, bill depth ${fmt(b, { digits: 1 })} mm`, `panjang paruh ${fmt(a, { digits: 1 })} mm, kedalaman paruh ${fmt(b, { digits: 1 })} mm`);
    }
    return `x ${fmt(p.x, { digits: 2 })}, y ${fmt(p.y, { digits: 2 })}`;
  };
  function selectionText(i) {
    if (i < 0) return '';
    const sv = fit?.supportPoints.includes(i) ? tr(' It is a support vector.', ' Titik ini adalah support vector.') : '';
    return tr(`Selected ${pointName(i)} at ${whereText(i)}.${sv} Press Enter to pick it up.`, `${pointName(i)} dipilih di ${whereText(i)}.${sv} Tekan Enter untuk mengangkatnya.`);
  }
  const failText = () => tr(
    'Could not load the penguin data, so the generated data is shown. Pick Penguins again to retry.',
    'Data penguin tidak bisa dimuat, jadi data buatan yang ditampilkan. Pilih Penguin lagi untuk mencoba lagi.');
  function summaryText() {
    if (!fit) return '';
    const acc = tr(
      `Accuracy: ${pct(fit.trainAcc)} on training points, ${fit.heldAcc == null ? 'no held-out points' : `${pct(fit.heldAcc)} on held-out points`}.`,
      `Accuracy: ${pct(fit.trainAcc)} pada titik training, ${fit.heldAcc == null ? 'tidak ada titik held-out' : `${pct(fit.heldAcc)} pada titik held-out`}.`);
    const svs = tr(`${fmt(fit.nSupport)} of ${fmt(fit.nTrain)} training points are support vectors.`, `${fmt(fit.nSupport)} dari ${fmt(fit.nTrain)} titik training adalah support vector.`);
    const margin = fit.margin != null
      ? tr(` Margin width ${fmt(fit.margin, { digits: 2 })}.`, ` Lebar margin ${fmt(fit.margin, { digits: 2 })}.`)
      : tr(' A curved boundary has no single margin width.', ' Boundary yang melengkung tidak punya satu lebar margin.');
    return `${svs}${margin} ${acc}`;
  }

  // Screen readers: arrow-key moves would announce every step, so the status line is silent while a point
  // is moving and announces once after the learner pauses or lets go.
  function setBusy() {
    clearTimeout(timer);
    statusEl.setAttribute('aria-live', 'off');
  }
  function announce() {
    clearTimeout(timer);
    statusEl.setAttribute('aria-live', 'polite');
    const text = statusEl.textContent;
    statusEl.textContent = '';
    timer = setTimeout(() => { statusEl.textContent = text; lab.describe(lab.canvas, summaryText()); }, 40);
  }
  function announceSoon() {
    clearTimeout(timer);
    timer = setTimeout(announce, 400);
  }
  function say(text) { live.textContent = text; lab.setDetail(text); }

  // ---- drawing ---------------------------------------------------------------

  let regionCanvas = null;
  function drawRegions(g) {
    const { nx, ny, xs, ys, labels } = grid;
    if (!regionCanvas) regionCanvas = document.createElement('canvas');
    regionCanvas.width = nx; regionCanvas.height = ny;
    const o = regionCanvas.getContext('2d');
    o.clearRect(0, 0, nx, ny);
    o.globalAlpha = 0.16;
    for (let j = 0; j < ny; j++) {
      let i = 0;
      while (i < nx) {
        let k = i;
        while (k + 1 < nx && labels[j][k + 1] === labels[j][i]) k++;
        o.fillStyle = colorOf(labels[j][i]);
        o.fillRect(i, ny - 1 - j, k - i + 1, 1);
        i = k + 1;
      }
    }
    const dx = xs[1] - xs[0], dy = ys[1] - ys[0];
    const ctx = plot.ctx;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(regionCanvas, g.px(xs[0] - dx / 2), g.py(ys[ny - 1] + dy / 2), g.px(xs[nx - 1] + dx / 2) - g.px(xs[0] - dx / 2), g.py(ys[0] - dy / 2) - g.py(ys[ny - 1] + dy / 2));
    ctx.restore();
  }

  function lines(level, style) {
    for (const [x1, y1, x2, y2] of contourSegments(grid, level)) plot.segment(x1, y1, x2, y2, style);
  }

  // The kit labels the axes at six evenly spaced values (-3, -1.8, -0.6, ...); whole numbers read better and
  // are shorter, so the plot square and its margins are drawn again with a grid and ticks at -3 ... 3.
  function axes(g) {
    const ctx = plot.ctx, x0 = g.px(-HALF), x1 = g.px(HALF), y0 = g.py(HALF), y1 = g.py(-HALF);
    ctx.clearRect(0, 0, x0 - 1, g.height);
    ctx.clearRect(0, y1 + 1, g.width, g.height);
    ctx.save();
    ctx.fillStyle = g.t.plot; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.strokeStyle = g.t.grid; ctx.lineWidth = 1; ctx.beginPath();
    for (let v = -HALF; v <= HALF; v++) { ctx.moveTo(g.px(v), y0); ctx.lineTo(g.px(v), y1); ctx.moveTo(x0, g.py(v)); ctx.lineTo(x1, g.py(v)); }
    ctx.stroke();
    ctx.fillStyle = g.t.muted; ctx.font = '11px system-ui, sans-serif';
    for (let v = -HALF; v <= HALF; v++) {
      ctx.textAlign = 'center'; ctx.fillText(formatTick(v), g.px(v), y1 + 16);
      ctx.textAlign = 'right'; ctx.fillText(formatTick(v), x0 - 7, g.py(v) + 4);
    }
    ctx.textAlign = 'center'; ctx.fillText(axisTitles[0], (x0 + x1) / 2, g.height - 5);
    ctx.translate(Math.max(7, x0 - 26), (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(axisTitles[1], 0, 0);
    ctx.restore();
  }

  function draw() {
    const g = plot.begin();
    axes(g);
    const linear = controls.get('kernel') === 'linear';
    const names = classNames();
    if (fit && grid && !loading) {
      plot.clip(() => {
        drawRegions(g);
        if (linear) { lines(1, { color: g.t.muted, width: 1.8, dash: [6, 5] }); lines(-1, { color: g.t.muted, width: 1.8, dash: [6, 5] }); }
        lines(0, { color: g.t.ink, width: 2.6 });
      });
      const support = new Set(fit.supportPoints);
      pts.forEach((p, i) => {
        const color = colorOf(p.label);
        if (p.held) plot.cross(p.x, p.y, color, 5);
        else if (p.label === -1) plot.dot(p.x, p.y, color, 5);
        else plot.diamond(p.x, p.y, color, 6);
        if (support.has(i)) plot.ring(p.x, p.y, g.t.ink, 11, 2);
      });
      if (selected >= 0 && pts[selected]) {
        const p = pts[selected];
        plot.ring(p.x, p.y, g.t.accent, holding ? 17 : 15, holding ? 4 : 3);
      }
    }

    if (loading) lab.setStatus(tr('Loading the penguin data…', 'Memuat data penguin…'));
    else if (fit) lab.setStatus(loadFailed ? `${failText()} ${summaryText()}` : summaryText());
    if (fit && !loading) lab.setMetrics(tr(`${fmt(fit.nTrain)} training points, ${fmt(fit.nHeld)} held-out`, `${fmt(fit.nTrain)} titik training, ${fmt(fit.nHeld)} held-out`));
    else lab.setMetrics('');
    if (selected < 0 && !holding) lab.setDetail(tr('Pick a point and drag it across the boundary, then watch the margin and the circled support vectors change.', 'Pilih satu titik dan seret melewati boundary, lalu lihat margin dan support vector yang dilingkari berubah.'));

    const items = [
      { kind: 'dot', color: clusterColor(0), label: tr(`${names[0]} (dot)`, `${names[0]} (titik bulat)`) },
      { kind: 'diamond', color: clusterColor(1), label: tr(`${names[1]} (diamond)`, `${names[1]} (belah ketupat)`) },
      { kind: 'cross', color: g.t.muted, label: tr('Cross: held-out point, not used for training', 'Silang: titik held-out, tidak dipakai untuk training') },
      { kind: 'ring', color: g.t.ink, label: tr('Circled: support vector', 'Dilingkari: support vector') },
      { kind: 'line', color: g.t.ink, label: tr('Decision boundary', 'Decision boundary') },
    ];
    if (linear) items.push({ kind: 'dash', color: g.t.muted, label: tr('Margin lines', 'Garis margin') });
    lab.setLegend(items);

    if (mode === 'penguins' && real && !loading) {
      dataNote.textContent = tr(
        `Adelie against Chinstrap, by bill length and bill depth, each standardized with the training points only. ${fmt(real.pairs.length)} of ${fmt(real.total)} such penguins have both measurements; penguins with a missing value (NA) are left out: ${fmt(real.dropped)}. Showing ${fmt(pts.length)} of them, ${fmt(PER_CLASS)} per species.`,
        `Adelie melawan Chinstrap, berdasarkan panjang dan kedalaman paruh, masing-masing distandarkan hanya dengan titik training. ${fmt(real.pairs.length)} dari ${fmt(real.total)} penguin tersebut punya kedua pengukuran; penguin dengan missing value (NA) dibuang: ${fmt(real.dropped)}. Menampilkan ${fmt(pts.length)} penguin, ${fmt(PER_CLASS)} per spesies.`);
    } else if (loadFailed) dataNote.textContent = failText();
    else dataNote.textContent = tr('Generated points (seeded, so everyone sees the same ones): 40 per class, 30% held out.', 'Titik buatan (memakai seed, jadi semua orang melihat titik yang sama): 40 per kelas, 30% held-out.');

    controls.disable('newSample', loading);
    controls.disable('restore', loading);
    table();
  }

  function table() {
    if (!fit) { lab.extraEl.replaceChildren(); return; }
    const p = params();
    const rows = [
      [tr('Kernel', 'Kernel'), p.kernel === 'linear' ? tr('Linear', 'Linear') : 'RBF'],
      ['C', valueText(p.C)],
      [tr('Gamma (RBF only)', 'Gamma (hanya RBF)'), p.kernel === 'rbf' ? valueText(p.gamma) : '–'],
      [tr('Training points', 'Titik training'), fmt(fit.nTrain)],
      [tr('Held-out points', 'Titik held-out'), fmt(fit.nHeld)],
      [tr('Support vectors', 'Support vector'), tr(`${fmt(fit.nSupport)} of ${fmt(fit.nTrain)}`, `${fmt(fit.nSupport)} dari ${fmt(fit.nTrain)}`)],
      [tr('Margin width (linear only)', 'Lebar margin (hanya linear)'), fit.margin != null ? fmt(fit.margin, { digits: 2 }) : '–'],
      [tr('Training accuracy', 'Training accuracy'), pct(fit.trainAcc)],
      [tr('Held-out accuracy', 'Held-out accuracy'), fit.heldAcc == null ? '–' : pct(fit.heldAcc)],
    ];
    const t = document.createElement('table');
    t.innerHTML = '<thead><tr></tr></thead>';
    for (const h of [tr('Reading', 'Ukuran'), tr('Value', 'Nilai')]) {
      const th = document.createElement('th'); th.textContent = h; t.querySelector('tr').append(th);
    }
    const body = document.createElement('tbody');
    for (const [name, value] of rows) {
      const row = body.insertRow();
      row.insertCell().textContent = name;
      row.insertCell().textContent = value;
    }
    t.append(body);
    lab.extraEl.replaceChildren(t);
  }

  lab.onReset(() => {
    loadToken += 1;
    mode = 'generated'; seed = DEFAULT_SEED; loading = false; loadFailed = false;
    controls.set('data', 'generated'); controls.set('shape', 'blobs'); controls.set('kernel', 'linear');
    controls.set('logC', LOG_C.value); controls.set('logGamma', LOG_GAMMA.value);
    box.reset();
    rebuild();
  });
  lab.onTheme(draw);
  lab.onResize(draw);
  lab.cleanup(() => { destroyed = true; loadToken += 1; });
  rebuild();
  return lab.destroy;
}
