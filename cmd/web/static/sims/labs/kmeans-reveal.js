// k-means, then reveal the labels. The shared course dataset (the same points as the k-NN lab) is drawn with
// every label hidden; k-means groups the points by position alone, step by step, and only then does the
// learner reveal the true classes as outlines, with a crosstab, purity and the adjusted Rand index.
// "Real data" is the penguins table (bill length and flipper length; species is the hidden class).
// The math is in ml/kmeansreveal.js and ml/clustermethods.js; this file only draws and wires.
import { createLab, createPlot, drawLineChart, dataModeSpec, loadDataset, predictBox, clusterColor, tr, fmt, pct } from '../kit/index.js';
import { makeDataset, SHARED_SEED } from '../datasets.js';
import { MAX_K, penguinPoints, runKMeans, elbowCurve, compareWithClasses } from '../ml/kmeansreveal.js';

const DEFAULT_SEED = 1;
export const GENERATED_COUNT = 48;
export const DEFAULT_K = { generated: 2, penguins: 3 };

// Axes of the real data: ticks every 6 mm on the bill axis, every 15 mm on the flipper axis.
const PENGUIN_VIEW = () => ({
  xLo: 30, xHi: 60, yLo: 170, yHi: 245,
  xTitle: tr('Bill length (mm)', 'Panjang paruh (mm)'), yTitle: tr('Flipper length (mm)', 'Panjang sirip (mm)'),
});
const GENERATED_VIEW = { xLo: 0, xHi: 10, yLo: 0, yHi: 10 };

const num = v => (Number.isFinite(v) ? fmt(v, { digits: 2 }) : '–');
// Class outlines use amber, green and blue: with up to three clusters (fills indigo, pink, teal) the two sets look different.
export const CLASS_COLORS = [3, 6, 4];
export const classColor = j => clusterColor(CLASS_COLORS[j] ?? 5);

const VERDICT = {
  good: () => tr('These clusters match the classes well.', 'Cluster ini sesuai dengan kelasnya.'),
  partly: () => tr('These clusters match the classes only partly.', 'Cluster ini hanya sebagian sesuai dengan kelasnya.'),
  poor: () => tr('The clusters cut across the classes.', 'Cluster ini memotong lintas kelas.'),
  none: () => '',
};

// With one cluster there is nothing to match, whatever the classes: say that instead of "cuts across".
export const verdictOf = (s, k) => (k === 1
  ? tr('With one cluster every point is in the same group, so there is nothing to match to the classes.', 'Dengan satu cluster semua titik berada di kelompok yang sama, jadi tidak ada yang bisa dicocokkan dengan kelasnya.')
  : VERDICT[s.level]());

// The shared course dataset with only the fields k-means and the reveal need.
export const generatedPoints = name => makeDataset(name, SHARED_SEED, GENERATED_COUNT).map(({ x, y, label }) => ({ x, y, label }));

export function mount(root) {
  const lab = createLab(root, {
    title: tr('k-means, then reveal the labels', 'k-means, lalu ungkap labelnya'),
    hint: tr('The labels are hidden: k-means sees only where the points are. Run it, then reveal the true classes and compare.', 'Labelnya disembunyikan: k-means hanya melihat posisi titik. Jalankan, lalu ungkap kelas sebenarnya dan bandingkan.'),
    playback: true, status: true, legend: true,
    canvasLabel: tr('Scatterplot of points with their labels hidden. After k-means runs, colour shows the cluster and diamonds show the centroids; after the labels are revealed, an outline shows the true class.', 'Scatterplot titik dengan label tersembunyi. Setelah k-means berjalan, warna menunjukkan cluster dan berlian menunjukkan centroid; setelah label diungkap, garis tepi menunjukkan kelas sebenarnya.'),
    extra: {
      title: tr('Clusters by true classes', 'Cluster menurut kelas sebenarnya'),
      hint: tr('Each row is a k-means cluster, each column a true class; a cell counts the points in both. The largest cell of each row is in bold.', 'Setiap baris adalah cluster hasil k-means, setiap kolom adalah kelas sebenarnya; sel menghitung titik yang masuk keduanya. Sel terbesar di tiap baris dicetak tebal.'),
    },
  });
  const plot = createPlot(lab.canvas);
  const legendHost = lab.ref('legend');
  if (legendHost) legendHost.style.maxHeight = 'none';

  let mode = 'generated', real = null, loading = false, loadFailed = false, loadToken = 0, destroyed = false;
  let revealed = false, pts = [], run = null, curve = [], classes = [], boxes = null;

  const controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real)', 'Penguin (data nyata)')]] }),
    { name: 'dataset', type: 'select', label: tr('Dataset', 'Dataset'), value: 'clusters', options: [
      ['clusters', tr('Overlapping clusters', 'Cluster tumpang tindih')], ['rings', tr('Concentric rings', 'Cincin konsentris')], ['checker', tr('Checkerboard', 'Papan catur')]] },
    { name: 'k', type: 'range', label: tr('Number of clusters k', 'Jumlah cluster k'), min: 1, max: MAX_K, step: 1, value: DEFAULT_K.generated },
    { name: 'init', type: 'select', label: tr('Initialization', 'Inisialisasi'), value: 'kmeans++', options: [['random', tr('Random points', 'Titik acak')], ['kmeans++', 'k-means++']] },
    { name: 'seed', type: 'number', label: tr('Seed', 'Seed'), min: 1, max: 999, step: 1, value: DEFAULT_SEED },
    { name: 'standardize', type: 'toggle', label: tr('Standardize both features first', 'Standardisasi kedua feature dulu'), value: true },
    { type: 'note', text: tr('To watch k-means move, use Next step or Run above the plot. The button below goes straight to the end.', 'Untuk melihat k-means bergerak, pakai Langkah berikutnya atau Jalankan di atas plot. Tombol di bawah langsung ke hasil akhir.') },
    { name: 'finish', type: 'button', label: tr('Run k-means', 'Jalankan k-means'), onClick: () => finish() },
    { name: 'reveal', type: 'button', label: tr('Reveal the labels', 'Tampilkan label'), onClick: () => { setRevealed(!revealed); } },
  ], name => {
    if (name === 'data') { setMode(controls.get('data')); return; }
    rebuild();
  });
  const revealBtn = controls.el.querySelectorAll('.panel-button')[1];
  const dataNote = document.createElement('p');
  dataNote.className = 'hint';
  dataNote.setAttribute('role', 'status');
  controls.el.querySelector('select').closest('label').after(dataNote);
  const scaleNote = document.createElement('p');
  scaleNote.className = 'hint';
  controls.el.querySelector('input[type=checkbox]').closest('label').after(scaleNote);

  // ---- Quick Quiz: one question per data mode ---------------------------------------------------------------

  const LEVEL_CHOICES = () => [
    ['good', tr('Yes, the clusters match the classes closely', 'Ya, cluster-nya sesuai dengan kelasnya')],
    ['partly', tr('Partly: some points land in the wrong cluster', 'Sebagian: ada titik yang masuk cluster yang salah')],
    ['poor', tr('No, the clusters cut across the classes', 'Tidak, cluster-nya memotong lintas kelas')],
  ];
  function buildBox() {
    boxes?.destroy();
    const real = mode === 'penguins';
    const box = predictBox(lab.ref('below'), {
      name: 'predict-recover',
      question: real
        ? tr('With k = 3, will k-means recover the three classes?', 'Dengan k = 3, apakah k-means akan menemukan kembali ketiga kelas?')
        : tr('With k = 2, will k-means recover the two classes?', 'Dengan k = 2, apakah k-means akan menemukan kembali kedua kelas?'),
      hint: real
        ? tr('Set k = 3, run k-means to the end and reveal the labels, then check again.', 'Atur k = 3, jalankan k-means sampai akhir dan tampilkan label, lalu periksa lagi.')
        : tr('Set k = 2, run k-means to the end and reveal the labels, then check again.', 'Atur k = 2, jalankan k-means sampai akhir dan tampilkan label, lalu periksa lagi.'),
      choices: LEVEL_CHOICES(),
    });
    box.onPick(revealPredictions); box.onCheck(revealPredictions);
    boxes = box;
  }
  lab.cleanup(() => boxes?.destroy());

  // ---- data and one run ---------------------------------------------------------------------------------------

  function currentPoints() {
    if (mode === 'penguins' && real) return real.points;
    return generatedPoints(controls.get('dataset'));
  }
  const view = () => (mode === 'penguins' && real ? PENGUIN_VIEW() : GENERATED_VIEW);
  const toPlot = (p, v) => ({ x: (p[0] - v.xLo) / (v.xHi - v.xLo) * 10, y: (p[1] - v.yLo) / (v.yHi - v.yLo) * 10 });
  const className = l => (mode === 'penguins' && real ? l : tr(`Class ${l}`, `Kelas ${l}`));
  const standardize = () => mode === 'penguins' && real && controls.get('standardize');

  // New points or new settings: run k-means again (from nothing: the learner presses Run or Next step) and redraw the elbow.
  function rebuild() {
    pts = currentPoints();
    classes = [...new Set(pts.map(p => p.label))].sort();
    const opts = { standardize: standardize(), seed: controls.get('seed') };
    run = runKMeans(pts, { k: controls.get('k'), init: controls.get('init'), ...opts });
    curve = elbowCurve(pts, opts);
    stepper.set({ at: -1 });
    boxes?.reset();
  }
  function showRevealState(on) {
    revealed = on;
    revealBtn.textContent = on ? tr('Hide the labels again', 'Sembunyikan label lagi') : tr('Reveal the labels', 'Tampilkan label');
    revealBtn.setAttribute('aria-pressed', String(on));
  }
  function setRevealed(on) {
    showRevealState(on);
    draw();
    revealPredictions();
  }

  async function setMode(next) {
    const token = ++loadToken;
    loadFailed = false;
    if (next === 'generated') { mode = 'generated'; loading = false; controls.set('k', DEFAULT_K.generated); modeChanged(); return; }
    loading = true; mode = next; draw();
    try {
      const table = await loadDataset(next);
      if (destroyed || token !== loadToken) return;
      real = penguinPoints(table);
      loading = false;
      controls.set('k', DEFAULT_K.penguins);
    } catch {
      if (destroyed || token !== loadToken) return;
      loading = false; loadFailed = true; mode = 'generated';
      controls.set('data', 'generated'); controls.set('k', DEFAULT_K.generated);
    }
    modeChanged();
  }
  function modeChanged() {
    const penguins = mode === 'penguins' && real;
    controls.show('dataset', !penguins);
    controls.show('standardize', Boolean(penguins));
    scaleNote.hidden = !penguins;
    // A new data mode starts with the labels hidden again, so the predict-first flow works on the real data too.
    showRevealState(false);
    buildBox();
    rebuild();
  }

  // ---- stepper: state is the index of the history entry on screen (-1: nothing has run yet) ------------------

  const stepper = lab.stepper({
    init: () => ({ at: -1 }),
    step: s => ({ at: s.at + 1 }),
    isDone: s => !run || s.at >= run.steps.length - 1,
    render: () => { draw(); revealPredictions(); },
    delay: () => 800,
  });

  // "Run k-means": press the playback toolbar's Next step until it is done, so Previous step still walks back.
  function finish() {
    stepper.pause();
    const next = lab.root.querySelector('[data-act="step"]');
    for (let i = 0; i < 1000 && !next.disabled; i++) next.click();
  }

  // ---- predictions --------------------------------------------------------------------------------------------

  const verdict = s => verdictOf(s, run.k);
  function summary() {
    const at = stepper.state.at;
    if (!run || at < 0) return null;
    return compareWithClasses(run.steps[at].labels, pts.map(p => p.label));
  }
  // Called with the picked answer when the learner picks or presses Check answer, and without one after every redraw
  // (then it answers only if a prediction was already picked).
  function revealPredictions(picked) {
    if (!boxes || !run || !revealed || stepper.state.at < run.steps.length - 1) return;
    if (picked == null && boxes.chosen() == null) return;
    const wanted = mode === 'penguins' && real ? 3 : 2;
    if (run.k !== wanted) return;
    const s = summary();
    let detail = tr(`The adjusted Rand index is ${num(s.ari)} (1 is a perfect match, about 0 is what random labels give) and purity is ${pct(s.purity)}.`, `Adjusted Rand index-nya ${num(s.ari)} (1 berarti cocok sempurna, sekitar 0 sama dengan label acak) dan purity-nya ${pct(s.purity)}.`);
    if (mode === 'penguins' && real && !standardize() && s.level !== 'good') {
      detail += ' ' + tr('Flipper length spreads over a larger range than bill length, so it dominates the distances; turn on standardizing and run again.', 'Panjang sirip tersebar pada rentang yang lebih besar daripada panjang paruh, sehingga mendominasi jarak; aktifkan standardisasi dan jalankan lagi.');
    } else if (s.level === 'poor') {
      detail += ' ' + tr('k-means draws straight borders between round groups, so it cannot follow classes that are shaped differently.', 'k-means menarik batas lurus di antara kelompok yang bulat, sehingga tidak bisa mengikuti kelas yang bentuknya lain.');
    }
    boxes.reveal(s.level, detail);
  }

  // ---- drawing ------------------------------------------------------------------------------------------------

  // The kit's plot labels its axes 0..10; the real data is in other units, so those labels are erased and drawn from the data range.
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
    // A rotated title needs about 44px left of the plot; on a phone it would be cut off, so it sits inside the top-left corner instead.
    if (g.px(0) < 46) { ctx.textAlign = 'left'; ctx.fillText(v.yTitle, g.px(0) + 6, g.py(10) + 15); } else { ctx.translate(g.px(0) - 32, g.py(5)); ctx.rotate(-Math.PI / 2); ctx.fillText(v.yTitle, 0, 0); }
    ctx.restore();
  }

  function statusLines(at) {
    if (loading) return [tr('Loading the penguin data…', 'Memuat data penguin…'), ''];
    const last = run.steps.length - 1, s = summary();
    const hint = revealed
      ? ''
      : tr('Next, press Reveal the labels to compare the clusters with the true classes.', 'Berikutnya, tekan Tampilkan label untuk membandingkan cluster dengan kelas sebenarnya.');
    if (at < 0) {
      return [
        revealed
          ? tr('The labels are revealed: the outlines show the true classes. Run k-means to compare the clusters with them.', 'Label sudah ditampilkan: garis tepi menunjukkan kelas sebenarnya. Jalankan k-means untuk membandingkan cluster dengan kelas itu.')
          : tr('The labels are hidden. k-means will group the points by position alone.', 'Label disembunyikan. k-means akan mengelompokkan titik hanya berdasarkan posisinya.'),
        tr('Press Next step to watch it move, or Run k-means to go straight to the result.', 'Tekan Langkah berikutnya untuk melihatnya bergerak, atau Jalankan k-means untuk langsung ke hasil.'),
      ];
    }
    const e = run.steps[at];
    const head = at === 0
      ? tr(`Step 1 of ${fmt(last + 1)}: every point joined its nearest starting centroid. Inertia ${num(e.inertia)}.`, `Langkah 1 dari ${fmt(last + 1)}: setiap titik masuk ke centroid awal terdekat. Inertia ${num(e.inertia)}.`)
      : at < last
        ? tr(`Step ${fmt(at + 1)} of ${fmt(last + 1)}: the centroids moved, then ${fmt(e.moved)} ${e.moved === 1 ? 'point' : 'points'} changed cluster. Inertia ${num(e.inertia)}.`, `Langkah ${fmt(at + 1)} dari ${fmt(last + 1)}: centroid bergeser, lalu ${fmt(e.moved)} titik pindah cluster. Inertia ${num(e.inertia)}.`)
        : run.converged
          ? tr(`Done after ${fmt(run.iterations)} ${run.iterations === 1 ? 'update' : 'updates'}: no point changed cluster. Inertia ${num(e.inertia)}.`, `Selesai setelah ${fmt(run.iterations)} pembaruan: tidak ada titik yang pindah cluster. Inertia ${num(e.inertia)}.`)
          : tr(`Stopped after ${fmt(run.iterations)} updates without settling. Inertia ${num(e.inertia)}.`, `Berhenti setelah ${fmt(run.iterations)} pembaruan tanpa stabil. Inertia ${num(e.inertia)}.`);
    if (!revealed) return [head, hint];
    return [head, `${verdict(s)} ${tr(`Purity ${pct(s.purity)}, adjusted Rand index ${num(s.ari)}.`, `Purity ${pct(s.purity)}, adjusted Rand index ${num(s.ari)}.`)}`];
  }

  function legendItems(at) {
    const items = [];
    if (at < 0) items.push({ kind: 'dot', color: clusterColor(-1), label: tr('Point (label hidden)', 'Titik (label tersembunyi)') });
    else {
      for (let j = 0; j < run.k; j++) items.push({ kind: 'dot', color: clusterColor(j), label: tr(`Cluster ${j + 1}`, `Cluster ${j + 1}`) });
      items.push({ kind: 'diamond', color: clusterColor(0), label: tr('Centroid', 'Centroid') });
    }
    if (revealed) classes.forEach((c, j) => items.push({ kind: 'ring', color: classColor(j), label: tr(`${className(c)} (outline)`, `${className(c)} (garis tepi)`) }));
    return items;
  }

  function crosstabCard(at) {
    const host = lab.extraEl;
    const note = text => { const p = document.createElement('p'); p.className = 'hint'; p.textContent = text; host.replaceChildren(p); };
    if (!revealed) { note(tr('Press Reveal the labels to fill this table.', 'Tekan Tampilkan label untuk mengisi tabel ini.')); return; }
    if (at < 0) { note(tr('Run k-means (or press Next step) to fill this table.', 'Jalankan k-means (atau tekan Langkah berikutnya) untuk mengisi tabel ini.')); return; }
    const s = summary(), t = s.table;
    const table = document.createElement('table');
    table.className = 'crosstab';
    const cap = document.createElement('caption');
    cap.className = 'sr-only';
    cap.textContent = tr('Number of points in each cluster and true class', 'Jumlah titik di tiap cluster dan kelas sebenarnya');
    const swatch = (color, ring) => {
      const i = document.createElement('i');
      i.setAttribute('aria-hidden', 'true');
      i.style.cssText = `display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:-1px;${ring ? `border:2.5px solid ${color};box-sizing:border-box;width:12px;height:12px` : `background:${color}`}`;
      return i;
    };
    const head = table.createTHead().insertRow();
    const th = (text, color, ring) => { const c = document.createElement('th'); if (color) c.append(swatch(color, ring)); c.append(text); c.scope = 'col'; head.append(c); };
    th(tr('Cluster', 'Cluster'));
    t.cols.forEach((c, j) => th(className(c), classColor(classes.indexOf(c)), true));
    th(tr('Total', 'Total'));
    const body = table.createTBody();
    t.rows.forEach((cl, i) => {
      const row = body.insertRow();
      const h = document.createElement('th'); h.scope = 'row'; h.append(swatch(clusterColor(cl), false), tr(`Cluster ${cl + 1}`, `Cluster ${cl + 1}`)); row.append(h);
      const top = Math.max(...t.counts[i]);
      t.counts[i].forEach(v => { const c = row.insertCell(); c.textContent = fmt(v); if (v === top && v > 0) { c.style.fontWeight = '700'; c.style.background = 'var(--accent-soft)'; } });
      row.insertCell().textContent = fmt(t.rowTotals[i]);
    });
    const foot = table.createTFoot().insertRow();
    const fh = document.createElement('th'); fh.scope = 'row'; fh.textContent = tr('Total', 'Total'); foot.append(fh);
    t.colTotals.forEach(v => { foot.insertCell().textContent = fmt(v); });
    foot.insertCell().textContent = fmt(t.n);
    const style = document.createElement('style');
    style.textContent = '@media (max-width: 640px) { .crosstab { font-size: 12px; min-width: 0; } .crosstab th, .crosstab td { padding: 6px 4px; white-space: normal; } .crosstab i { margin-right: 3px !important; } }';
    const verdictP = document.createElement('p');
    verdictP.className = 'hint';
    verdictP.style.fontWeight = '600';
    verdictP.textContent = `${verdict(s)} ${tr(`Purity ${pct(s.purity)} (share of points in the majority class of their cluster). Adjusted Rand index ${num(s.ari)} (1 is a perfect match, about 0 is chance).`, `Purity ${pct(s.purity)} (porsi titik yang berada di kelas mayoritas clusternya). Adjusted Rand index ${num(s.ari)} (1 berarti cocok sempurna, sekitar 0 sama dengan kebetulan).`)}`;
    host.replaceChildren(style, verdictP, table);
  }

  function draw() {
    if (!run) return;
    const at = stepper.state.at, v = view(), n = pts.length;
    const dot = n > 100 ? 3.4 : 4.8, ringR = n > 100 ? 5.4 : 7.6;
    const g = plot.begin();
    if (mode === 'penguins' && real) axes(g, v);
    const labels = at >= 0 ? run.steps[at].labels : null;
    plot.clip(() => {
      if (at >= 0) {
        for (let j = 0; j < run.k; j++) {
          const trail = run.steps.slice(0, at + 1).map(st => { const u = toPlot(st.centroids[j], v); return { x: u.x, y: u.y }; });
          plot.polyline(trail, { color: clusterColor(j), width: 1.8, dash: [4, 4] });
        }
      }
      pts.forEach((p, i) => {
        const u = toPlot([p.x, p.y], v);
        plot.dot(u.x, u.y, labels ? clusterColor(labels[i]) : clusterColor(-1), dot);
        if (revealed) plot.ring(u.x, u.y, classColor(classes.indexOf(p.label)), ringR, 2.4);
      });
      if (at >= 0) run.steps[at].centroids.forEach((c, j) => { const u = toPlot(c, v); plot.diamond(u.x, u.y, clusterColor(j), 8); });
    });

    const [status, detail] = statusLines(at);
    lab.setStatus(status);
    lab.setDetail(detail);
    lab.setMetrics(loading ? '' : tr(`${fmt(n)} points · k = ${fmt(run.k)}`, `${fmt(n)} titik · k = ${fmt(run.k)}`));
    lab.setLegend(legendItems(at));
    lab.describe(lab.canvas, [status, detail].filter(Boolean).join(' '));
    crosstabCard(at);

    if (mode === 'penguins' && real) {
      dataNote.textContent = tr(
        `${fmt(real.points.length)} of ${fmt(real.total)} penguins have both measurements; ${fmt(real.dropped)} ${real.dropped === 1 ? 'row' : 'rows'} with missing values (NA) ${real.dropped === 1 ? 'is' : 'are'} left out. The species is hidden until you reveal it.`,
        `${fmt(real.points.length)} dari ${fmt(real.total)} penguin punya kedua pengukuran; ${fmt(real.dropped)} baris dengan missing value (NA) dibuang. Spesiesnya disembunyikan sampai kamu menampilkannya.`);
      scaleNote.textContent = tr('Bill length and flipper length have different ranges; standardizing gives them equal say in the distances. The plot stays in millimetres.', 'Panjang paruh dan panjang sirip punya rentang yang berbeda; standardisasi membuat keduanya berpengaruh sama pada jarak. Plot tetap dalam milimeter.');
    } else if (loadFailed) dataNote.textContent = tr('Could not load the penguin data, so the generated data is shown.', 'Data penguin tidak bisa dimuat, jadi data buatan yang ditampilkan.');
    else dataNote.textContent = tr('The same 48 points as the k-NN lab, but here their classes A and B are hidden.', 'Ke-48 titik yang sama dengan lab k-NN, tetapi di sini kelas A dan B-nya disembunyikan.');

    controls.disable('finish', loading || at >= run.steps.length - 1);
    controls.disable('reveal', loading);
    elbow(at);
  }

  // ---- elbow chart ----------------------------------------------------------------------------------------------

  const elbowCanvas = lab.chartCard(
    tr('Inertia against k (elbow chart)', 'Inertia terhadap k (grafik elbow)'),
    tr('Inertia is the sum of squared distances from each point to its centroid, so it falls as k grows. Look for the bend (the elbow) where the fall slows down. The dashed line marks the current k.', 'Inertia adalah jumlah kuadrat jarak tiap titik ke centroid-nya, sehingga turun saat k bertambah. Cari tekukan (elbow) tempat penurunannya melambat. Garis putus-putus menandai k saat ini.'));
  function elbow(at) {
    if (!run || !curve.length) return;
    const series = [{ xs: curve.map(c => c.k), ys: curve.map(c => c.inertia), color: clusterColor(0), label: tr('Best of 5 starts', 'Terbaik dari 5 run') }];
    if (at >= 0) series.push({ xs: [run.k], ys: [run.steps[at].inertia], color: clusterColor(1), label: tr('This run, now', 'Run ini'), points: true });
    drawLineChart(elbowCanvas, {
      series, xLabel: tr('Number of clusters k', 'Jumlah cluster k'), yLabel: tr('Inertia', 'Inertia'),
      yMin: 0, xMin: 1, xMax: curve.length, integerX: true, markerX: run.k, markerLabel: `k = ${fmt(run.k)}`,
    });
  }

  // ---- reset and start ---------------------------------------------------------------------------------------------

  lab.onReset(() => {
    loadToken += 1; loading = false; loadFailed = false; mode = 'generated';
    controls.set('data', 'generated'); controls.set('dataset', 'clusters'); controls.set('k', DEFAULT_K.generated);
    controls.set('init', 'kmeans++'); controls.set('seed', DEFAULT_SEED); controls.set('standardize', true);
    modeChanged();
  });
  lab.onTheme(draw);
  lab.onResize(draw);
  lab.cleanup(() => { destroyed = true; loadToken += 1; });
  modeChanged();
  return lab.destroy;
}
