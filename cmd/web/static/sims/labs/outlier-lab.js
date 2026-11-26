// Outlier lab, built on the kit: add up to three outliers to a scatterplot, drag them, remove them,
// and watch the mean, median, standard deviation and correlation change next to their values
// without the outliers. Generated data works offline; "Penguins (real)" loads flipper length against
// body mass (rows with a missing value are left out and the lab says so). Pure math is in ml/stats.js.
import { createLab, createPlot, dataModeSpec, loadDataset, predictBox, clusterColor, rng, gauss, shuffle, tr, fmt } from '../kit/index.js';
import { summarize, movedMore } from '../ml/stats.js';
import { linearFit } from '../ml/regression.js';

export const MAX_OUTLIERS = 3;
const DEFAULT_SEED = 4;
const DEFAULT_N = 15;
const GENERATED_MAX = 200;

// A reproducible cloud of 200 points with a clear upward trend (correlation about 0.85), inside the
// 0..10 square. The lab shows the first n of them, so a bigger n keeps the points it already had.
export function generatedCloud(seed, count = 200) {
  const random = rng(seed);
  const clamp = v => Math.max(0.5, Math.min(9.5, v));
  return Array.from({ length: count }, () => {
    const x = clamp(5 + 1.1 * gauss(random));
    return { x, y: clamp(5 + 0.9 * (x - 5) + 0.55 * gauss(random)) };
  });
}

// Flipper length (mm) against body mass (kg) from the parsed penguins table. A row missing either
// number (the dataset writes NA) is dropped; `dropped` says how many, so the UI can tell the learner.
// Mass is converted from grams to kilograms so the axis labels stay short.
export function penguinCloud(table) {
  const points = [];
  for (const row of table.rows) {
    const f = row.flipper_length_mm, m = row.body_mass_g;
    if (typeof f === 'number' && typeof m === 'number' && Number.isFinite(f) && Number.isFinite(m)) points.push({ x: f, y: m / 1000 });
  }
  return { points, total: table.rows.length, dropped: table.rows.length - points.length };
}

// The first n points of a seeded shuffle of 0..len-1: growing n adds points, it never reshuffles.
export function sampleOrder(len, seed) { return shuffle(Array.from({ length: len }, (_, i) => i), rng(seed)); }

// What the axes of each data mode show; built when drawn so the text follows the language.
const views = {
  generated: () => ({ xLo: 0, xHi: 10, yLo: 0, yHi: 10, xTitle: 'x', yTitle: 'y', xName: 'x', yName: 'y' }),
  penguins: () => ({
    xLo: 150, xHi: 250, yLo: 2, yHi: 7,
    xTitle: tr('Flipper length (mm)', 'Panjang sirip (mm)'), yTitle: tr('Body mass (kg)', 'Massa tubuh (kg)'),
    xName: tr('flipper length', 'panjang sirip'), yName: tr('body mass', 'massa tubuh'),
  }),
};

const num = v => (Number.isFinite(v) ? fmt(v, { digits: 2 }) : '–');
const signed = d => {
  if (!Number.isFinite(d)) return '–';
  if (Math.abs(d) < 0.005) return fmt(0, { digits: 2 });
  return (d > 0 ? '+' : '') + fmt(d, { digits: 2 });
};

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Outliers and statistics', 'Outlier dan statistik'),
    hint: tr('Click the plot to add an outlier, drag it, double-click it to remove it. Dashed line: the trend without the outlier.', 'Klik plot untuk menambah outlier, seret untuk memindahkannya, klik dua kali untuk menghapusnya. Garis putus-putus: tren tanpa outlier.'),
    status: true, legend: true, canvasLabel: tr('Scatterplot with outliers you can add and drag. Enter adds an outlier, arrow keys move it, Delete removes it.', 'Scatterplot dengan outlier yang bisa ditambah dan digeser. Enter menambah outlier, tombol panah memindahkannya, Delete menghapusnya.'),
    extra: {
      title: tr('Statistics without and with the outlier', 'Statistik tanpa dan dengan outlier'),
      hint: tr('Standard deviation divides by the number of points. Correlation r is between -1 and 1.', 'Simpangan baku dibagi dengan jumlah titik. Korelasi r bernilai antara -1 dan 1.'),
    },
  });
  const plot = createPlot(lab.canvas, { xLabel: '', yLabel: '' });
  // Six legend entries wrap to three rows on a phone, more than the kit's 72px cap: show them all, never a hidden scroll.
  const legendHost = lab.ref('legend');
  if (legendHost) legendHost.style.maxHeight = 'none';

  let mode = 'generated', seed = DEFAULT_SEED, real = null, order = null, orderSeed = null, loadFailed = false, loading = false;
  let outliers = [], selected = -1, drag = null, loadToken = 0, destroyed = false;
  let cloud = { seed: null, points: [] };

  const controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real)', 'Penguin (data nyata)')]] }),
    { name: 'n', type: 'range', label: tr('Number of points', 'Jumlah titik'), min: 6, max: GENERATED_MAX, step: 1, value: DEFAULT_N },
    { name: 'newSample', type: 'button', label: tr('New sample', 'Sampel baru'), onClick: () => { seed += 1; settle(); } },
    { name: 'add', type: 'button', label: tr('Add outlier', 'Tambah outlier'), onClick: () => { addOutlier(); lab.canvas.focus(); } },
    { name: 'remove', type: 'button', label: tr('Remove outlier', 'Hapus outlier'), onClick: () => { removeSelected(); } },
    { name: 'means', type: 'toggle', label: tr('Show mean and median', 'Tampilkan rata-rata dan median'), value: true },
    { name: 'trend', type: 'toggle', label: tr('Show trend line', 'Tampilkan garis tren'), value: true },
    { type: 'note', text: tr('Keyboard: focus the plot, Enter adds an outlier, arrow keys move it (Shift for bigger steps), Delete removes it.', 'Keyboard: fokus ke plot, Enter menambah outlier, tombol panah memindahkannya (Shift untuk langkah lebih besar), Delete menghapusnya.') },
  ], name => {
    if (name === 'data') { setMode(controls.get('data')); return; }
    settle();
  });
  const dataNote = document.createElement('p');
  dataNote.className = 'hint';
  dataNote.setAttribute('role', 'status');
  controls.el.querySelector('select').closest('label').after(dataNote);

  const boxMean = predictBox(lab.ref('below'), {
    hint: tr('Add an outlier, then check again.', 'Tambahkan outlier, lalu periksa lagi.'),
    name: 'predict-mean',
    question: tr('You add outliers far from the cloud. Which moves more: the mean or the median?', 'Kamu menambahkan outlier jauh dari kumpulan titik. Mana yang bergeser lebih jauh: rata-rata atau median?'),
    choices: [
      ['mean', tr('The mean moves more', 'Rata-rata bergeser lebih jauh')],
      ['median', tr('The median moves more', 'Median bergeser lebih jauh')],
      ['same', tr('They move about the same', 'Keduanya bergeser sama jauh')],
    ],
  });
  const boxCorr = predictBox(lab.ref('below'), {
    hint: tr('Add an outlier, then check again.', 'Tambahkan outlier, lalu periksa lagi.'),
    name: 'predict-corr',
    question: tr('Does adding an outlier always make the correlation r smaller?', 'Apakah menambah outlier selalu membuat korelasi r mengecil?'),
    choices: [
      ['down', tr('Yes, r always goes down', 'Ya, r selalu turun')],
      ['depends', tr('No, it depends on where the outlier sits', 'Tidak, tergantung posisi outlier')],
      ['same', tr('r stays about the same', 'r tetap hampir sama')],
    ],
  });
  lab.cleanup(() => { boxMean.destroy(); boxCorr.destroy(); });
  // Picking an answer after the outlier is already placed shows the verdict at once.
  boxMean.onPick(revealPredictions); boxCorr.onPick(revealPredictions);
  boxMean.onCheck(revealPredictions); boxCorr.onCheck(revealPredictions);

  // ---- data ----------------------------------------------------------------

  function basePoints() {
    const n = controls.get('n');
    if (mode === 'penguins' && real) {
      if (orderSeed !== seed) { order = sampleOrder(real.points.length, seed); orderSeed = seed; }
      return order.slice(0, Math.min(n, order.length)).map(i => real.points[i]);
    }
    if (cloud.seed !== seed) cloud = { seed, points: generatedCloud(seed) };
    return cloud.points.slice(0, n);
  }
  // The slider reaches every point the data mode has: 200 generated points, or all penguins that have
  // both measurements. Changing max makes the browser clamp the value, then the readout is rewritten.
  const slider = controls.el.querySelector('input[type=range]');
  function syncSliderMax() {
    const max = mode === 'penguins' && real ? Math.max(6, real.points.length) : GENERATED_MAX;
    if (Number(slider.max) === max) return;
    slider.max = String(max);
    controls.set('n', Number(slider.value));
  }
  const view = () => views[mode === 'penguins' && real ? 'penguins' : 'generated']();
  const toPlot = (p, v) => ({ x: (p.x - v.xLo) / (v.xHi - v.xLo) * 10, y: (p.y - v.yLo) / (v.yHi - v.yLo) * 10 });
  const fromPlot = (p, v) => ({ x: v.xLo + p.x / 10 * (v.xHi - v.xLo), y: v.yLo + p.y / 10 * (v.yHi - v.yLo) });
  const clampPlot = p => ({ x: Math.max(0, Math.min(10, p.x)), y: Math.max(0, Math.min(10, p.y)) });

  async function setMode(next) {
    const token = ++loadToken;
    outliers = []; selected = -1; loadFailed = false;
    if (next === 'generated') { mode = 'generated'; loading = false; settle(); return; }
    loading = true; mode = next; draw();
    try {
      const table = await loadDataset(next);
      if (destroyed || token !== loadToken) return;
      real = penguinCloud(table);
      orderSeed = null;
      loading = false;
    } catch {
      if (destroyed || token !== loadToken) return;
      loading = false; loadFailed = true; mode = 'generated';
      controls.set('data', 'generated');
    }
    settle();
  }

  // ---- outliers --------------------------------------------------------------

  function addOutlier() {
    if (outliers.length >= MAX_OUTLIERS) return;
    // Starts far above the cloud, a little to one side of the previous one so they do not overlap.
    const spot = [{ x: 5, y: 9.3 }, { x: 8.6, y: 1.2 }, { x: 1.4, y: 8.4 }][outliers.length];
    outliers.push(fromPlot(spot, view()));
    selected = outliers.length - 1;
    settle();
  }
  function removeSelected() {
    if (selected < 0 || selected >= outliers.length) return;
    outliers.splice(selected, 1);
    selected = outliers.length - 1;
    settle();
  }
  const nearestOutlier = e => { const v = view(); return plot.nearest(e, outliers.map(o => toPlot(o, v)), 16); };

  lab.on(lab.canvas, 'pointerdown', e => {
    if (loading) return;
    let i = nearestOutlier(e);
    if (i < 0) {
      if (outliers.length >= MAX_OUTLIERS) return;
      outliers.push(fromPlot(plot.toData(e), view()));
      i = outliers.length - 1;
    }
    selected = i;
    drag = { id: e.pointerId };
    lab.canvas.setPointerCapture(e.pointerId);
    lab.canvas.focus();
    draw();
  });
  lab.on(lab.canvas, 'pointermove', e => {
    if (drag?.id !== e.pointerId || selected < 0) return;
    outliers[selected] = fromPlot(plot.toData(e), view());
    draw();
  });
  const endDrag = e => { if (drag?.id === e.pointerId) { drag = null; settle(); } };
  lab.on(lab.canvas, 'pointerup', endDrag);
  lab.on(lab.canvas, 'pointercancel', endDrag);
  lab.on(lab.canvas, 'dblclick', e => {
    const i = nearestOutlier(e);
    if (i >= 0) { selected = i; removeSelected(); }
  });
  lab.on(lab.canvas, 'keydown', e => {
    if (loading) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (outliers.length < MAX_OUTLIERS) addOutlier();
      else { selected = (selected + 1) % outliers.length; draw(); }
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeSelected(); return; }
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!d) return;
    e.preventDefault();
    if (!outliers.length) return;
    if (selected < 0) selected = outliers.length - 1;
    const v = view(), step = (e.shiftKey ? 1 : 0.2);
    const p = toPlot(outliers[selected], v);
    outliers[selected] = fromPlot(clampPlot({ x: p.x + d[0] * step, y: p.y + d[1] * step }), v);
    draw();
    settleSoon();
  });
  // Arrow keys fire many times; refresh the verdicts once the learner pauses.
  let timer = 0;
  function settleSoon() { clearTimeout(timer); timer = setTimeout(revealPredictions, 350); }
  lab.cleanup(() => clearTimeout(timer));

  // ---- predictions -------------------------------------------------------------

  function revealPredictions() {
    if (!outliers.length) return;
    const v = view(), s0 = summarize(basePoints()), s1 = summarize([...basePoints(), ...outliers]);
    if (boxMean.chosen() != null) {
      const m = movedMore(s0, s1);
      const ax = m.axis, name = ax === 'x' ? v.xName : v.yName;
      const a = ax === 'x' ? [s0.meanX, s1.meanX, s0.medianX, s1.medianX] : [s0.meanY, s1.meanY, s0.medianY, s1.medianY];
      const moved = tr(`For ${name}, the mean went from ${num(a[0])} to ${num(a[1])} and the median from ${num(a[2])} to ${num(a[3])}.`, `Untuk ${name}, rata-rata berubah dari ${num(a[0])} menjadi ${num(a[1])} dan median dari ${num(a[2])} menjadi ${num(a[3])}.`);
      // Both shifts are tiny (under about a sixth of a standard deviation): the verdict is "about the same"
      // and the box says why, instead of crowning the one that moved a hair more.
      const detail = m.negligible
        ? `${moved} ${tr('Both moved by less than a sixth of a standard deviation, so there is no real difference. That happens when the outlier sits inside the cloud or the sample is large. Drag it far away or use fewer points and look again.', 'Keduanya bergeser kurang dari seperenam simpangan baku, jadi tidak ada beda yang berarti. Itu terjadi jika outlier berada di dalam kumpulan titik atau sampelnya besar. Seret jauh-jauh atau kurangi jumlah titik, lalu lihat lagi.')}`
        : moved;
      boxMean.reveal(m.which, detail);
    }
    if (boxCorr.chosen() != null) {
      const before = num(s0.r), after = num(s1.r);
      const detail = s1.r < s0.r
        ? tr(`This time r fell from ${before} to ${after}. Drag the outlier up and to the right, along the trend, and r grows instead.`, `Kali ini r turun dari ${before} menjadi ${after}. Seret outlier ke kanan atas, searah tren, dan r justru naik.`)
        : tr(`This time r went from ${before} to ${after}. Drag the outlier far above or below the cloud, at the middle of x, and r falls.`, `Kali ini r berubah dari ${before} menjadi ${after}. Seret outlier jauh di atas atau di bawah kumpulan titik, di tengah sumbu x, dan r turun.`);
      boxCorr.reveal('depends', detail);
    }
  }

  // ---- drawing -------------------------------------------------------------------

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

  function trendLine(pts, v, style) {
    if (pts.length < 2) return;
    const fit = linearFit(pts.map(p => p.x), pts.map(p => p.y));
    const a = toPlot({ x: v.xLo, y: fit.slope * v.xLo + fit.intercept }, v), b = toPlot({ x: v.xHi, y: fit.slope * v.xHi + fit.intercept }, v);
    plot.segment(a.x, a.y, b.x, b.y, style);
  }

  function markers(s, v, alpha) {
    const ctx = plot.ctx, m = toPlot({ x: s.meanX, y: s.meanY }, v), d = toPlot({ x: s.medianX, y: s.medianY }, v);
    ctx.save(); ctx.globalAlpha = alpha;
    plot.ring(m.x, m.y, clusterColor(2), 9, 3);
    plot.cross(d.x, d.y, clusterColor(3), 7);
    ctx.restore();
  }

  function table(v, s0, s1) {
    const k = outliers.length;
    const rows = [
      [tr('Number of points', 'Jumlah titik'), s0.n, s1?.n],
      [tr(`Mean of ${v.xName}`, `Rata-rata ${v.xName}`), s0.meanX, s1?.meanX],
      [tr(`Mean of ${v.yName}`, `Rata-rata ${v.yName}`), s0.meanY, s1?.meanY],
      [tr(`Median of ${v.xName}`, `Median ${v.xName}`), s0.medianX, s1?.medianX],
      [tr(`Median of ${v.yName}`, `Median ${v.yName}`), s0.medianY, s1?.medianY],
      [tr(`Standard deviation of ${v.xName}`, `Simpangan baku ${v.xName}`), s0.sdX, s1?.sdX],
      [tr(`Standard deviation of ${v.yName}`, `Simpangan baku ${v.yName}`), s0.sdY, s1?.sdY],
      [tr('Correlation r', 'Korelasi r'), s0.r, s1?.r],
    ];
    const t = document.createElement('table');
    t.className = 'stats-table';
    t.innerHTML = '<thead><tr></tr></thead>';
    const head = t.querySelector('tr');
    for (const h of [tr('Statistic', 'Statistik'), k > 1 ? tr('Without outliers', 'Tanpa outlier') : tr('Without outlier', 'Tanpa outlier'), k > 1 ? tr('With outliers', 'Dengan outlier') : tr('With outlier', 'Dengan outlier'), tr('Change', 'Perubahan')]) {
      const th = document.createElement('th'); th.textContent = h; head.append(th);
    }
    const body = document.createElement('tbody');
    rows.forEach(([name, a, b], i) => {
      const row = body.insertRow();
      row.insertCell().textContent = name;
      const show = x => (i === 0 ? fmt(x) : num(x));
      row.insertCell().textContent = show(a);
      row.insertCell().textContent = b == null ? '–' : show(b);
      const c = row.insertCell();
      c.textContent = b == null ? '–' : i === 0 ? `+${fmt(b - a)}` : signed(b - a);
      if (b != null && i > 0 && Math.abs(b - a) >= 0.005) c.style.fontWeight = '700';
    });
    t.append(body);
    // On a phone the default cell padding and nowrap make the table wider than its card, which hides the
    // With and Change columns. Below 640px the cells wrap and shrink so all four columns fit.
    const style = document.createElement('style');
    style.textContent = '@media (max-width: 640px) { .stats-table { font-size: 12px; } .stats-table th, .stats-table td { white-space: normal; padding: 6px 5px; } .stats-table td:not(:first-child) { white-space: nowrap; text-align: right; } .stats-table th:not(:first-child) { text-align: right; } .stats-table th:last-child { white-space: nowrap; } }';
    lab.extraEl.replaceChildren(style, t);
  }

  function draw() {
    syncSliderMax();
    const v = view(), pts = basePoints(), k = outliers.length;
    const all = k ? [...pts, ...outliers] : pts;
    const s0 = summarize(pts), s1 = k ? summarize(all) : null;
    const showMeans = controls.get('means'), showTrend = controls.get('trend');
    const g = plot.begin();
    axes(g, v);

    plot.clip(() => {
      if (showTrend) {
        if (k) { trendLine(pts, v, { color: g.t.muted, width: 2, dash: [6, 5] }); trendLine(all, v, { color: clusterColor(1), width: 2.5 }); }
        else trendLine(pts, v, { color: clusterColor(0), width: 2.5 });
      }
    });
    for (const p of pts) { const u = toPlot(p, v); plot.dot(u.x, u.y, clusterColor(0), 4.4); }
    if (showMeans) {
      markers(s0, v, k ? 0.4 : 1);
      if (k) {
        markers(s1, v, 1);
        const m0 = toPlot({ x: s0.meanX, y: s0.meanY }, v), m1 = toPlot({ x: s1.meanX, y: s1.meanY }, v);
        const d0 = toPlot({ x: s0.medianX, y: s0.medianY }, v), d1 = toPlot({ x: s1.medianX, y: s1.medianY }, v);
        plot.segment(m0.x, m0.y, m1.x, m1.y, { color: clusterColor(2), width: 2 });
        plot.segment(d0.x, d0.y, d1.x, d1.y, { color: clusterColor(3), width: 2 });
      }
    }
    outliers.forEach((o, i) => {
      const u = toPlot(o, v);
      if (k > 1 && i === selected) plot.ring(u.x, u.y, g.t.ink, 14);
      plot.diamond(u.x, u.y, clusterColor(1));
      if (k > 1) plot.label(u.x, u.y, String(i + 1), { dx: 11, dy: -9 });
    });

    // readouts
    if (loading) lab.setStatus(tr('Loading the penguin data…', 'Memuat data penguin…'));
    else if (k) {
      const them = k > 1 ? tr('the outliers', 'outlier') : tr('the outlier', 'outlier');
      lab.setStatus(tr(`Correlation r: ${num(s0.r)} without ${them}, ${num(s1.r)} with ${k > 1 ? 'them' : 'it'}.`, `Korelasi r: ${num(s0.r)} tanpa outlier, ${num(s1.r)} dengan outlier.`));
    } else lab.setStatus(tr(`Correlation r: ${num(s0.r)}. No outlier yet: click the plot to add one.`, `Korelasi r: ${num(s0.r)}. Belum ada outlier: klik plot untuk menambahkan.`));
    lab.setDetail(k
      ? outliers.map((o, i) => tr(`${k > 1 ? `Outlier ${i + 1}` : 'Outlier'}: ${v.xName} ${fmt(o.x, { digits: 2 })}, ${v.yName} ${fmt(o.y, { digits: 2 })}.`, `${k > 1 ? `Outlier ${i + 1}` : 'Outlier'}: ${v.xName} ${fmt(o.x, { digits: 2 })}, ${v.yName} ${fmt(o.y, { digits: 2 })}.`)).join(' ')
      : tr('Pick an answer in the Quick Quiz (the button under the settings card), then add an outlier to check it.', 'Pilih jawaban di Kuis Cepat (tombol di bawah kartu pengaturan), lalu tambahkan outlier untuk mengeceknya.'));
    lab.setMetrics(k ? tr(`${fmt(pts.length)} points + ${fmt(k)} outlier${k > 1 ? 's' : ''}`, `${fmt(pts.length)} titik + ${fmt(k)} outlier`) : tr(`${fmt(pts.length)} points`, `${fmt(pts.length)} titik`));
    // Each entry is drawn like its mark on the plot: pink diamond, mean ring, median cross, and the trend
    // lines solid or dashed with the colors trendLine() uses. Trend entries follow what is on screen.
    const items = [{ kind: 'dot', color: clusterColor(0), label: tr('Data', 'Data') }, { kind: 'diamond', color: clusterColor(1), label: tr('Outlier (drag it)', 'Outlier (bisa digeser)') }];
    if (showMeans) items.push({ kind: 'ring', color: clusterColor(2), label: tr('Mean (ring)', 'Rata-rata (lingkaran)') }, { kind: 'cross', color: clusterColor(3), label: tr('Median (cross)', 'Median (silang)') });
    if (showTrend) {
      if (k) items.push(
        { kind: 'dash', color: g.t.muted, label: k > 1 ? tr('Trend without outliers', 'Tren tanpa outlier') : tr('Trend without outlier', 'Tren tanpa outlier') },
        { kind: 'line', color: clusterColor(1), label: k > 1 ? tr('Trend with outliers', 'Tren dengan outlier') : tr('Trend with outlier', 'Tren dengan outlier') });
      else items.push({ kind: 'line', color: clusterColor(0), label: tr('Trend line', 'Garis tren') });
    }
    lab.setLegend(items);
    if (mode === 'penguins' && real) {
      dataNote.textContent = tr(
        `${fmt(real.points.length)} of ${fmt(real.total)} penguins have both measurements; ${fmt(real.dropped)} rows with missing values (NA) are left out. Showing ${fmt(pts.length)} of the ${fmt(real.points.length)}.`,
        `${fmt(real.points.length)} dari ${fmt(real.total)} penguin punya kedua pengukuran; ${fmt(real.dropped)} baris dengan missing value (NA) dibuang. Menampilkan ${fmt(pts.length)} dari ${fmt(real.points.length)}.`);
    } else if (loadFailed) dataNote.textContent = tr('Could not load the penguin data, so the generated data is shown.', 'Data penguin tidak bisa dimuat, jadi data buatan yang ditampilkan.');
    else dataNote.textContent = tr('Generated points with an upward trend (seeded, so everyone sees the same ones).', 'Titik buatan dengan tren naik (memakai seed, jadi semua orang melihat titik yang sama).');
    controls.disable('add', k >= MAX_OUTLIERS || loading);
    controls.disable('remove', k === 0);
    table(v, s0, s1);
  }

  // After any change that is complete (not a drag in progress): redraw, then check the predictions.
  function settle() {
    if (!outliers.length) { boxMean.reset(); boxCorr.reset(); }
    draw();
    revealPredictions();
  }

  lab.onReset(() => {
    loadToken += 1;
    mode = 'generated'; seed = DEFAULT_SEED; outliers = []; selected = -1; loading = false; loadFailed = false;
    controls.set('data', 'generated'); controls.set('n', DEFAULT_N); controls.set('means', true); controls.set('trend', true);
    boxMean.reset(); boxCorr.reset();
    draw();
  });
  lab.onTheme(draw);
  lab.onResize(draw);
  lab.cleanup(() => { destroyed = true; loadToken += 1; });
  draw();
  return lab.destroy;
}
