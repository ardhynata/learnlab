import { makeDataset, SHARED_SEED } from './datasets.js';
import { beginPlot, clipToPlot, eventToData, actionsHTML, setupFullscreen, clusterColor, formatTick } from './common.js';
import { tr, fmt, pct } from '../i18n.js';
import { classifyScaled, testAccuracy, labelGrid, accuracyVerdict, scaleFor, generatedTest, penguinSplit } from './ml/knnscale.js';
import { dataModeSpec, loadDataset } from './kit/data.js';
import { predictBox } from './kit/predict.js';

// Returns the k nearest labeled points and the vote; ties go to the closest neighbor.
// `scale` ({x, y}, default no stretch) multiplies each feature before distances are computed.
export function classify(points, query, k, metric, scale = { x: 1, y: 1 }) {
  return classifyScaled(points, query, k, metric, scale, ['A', 'B']);
}

const GRID = 64;
const PREDICT_STRETCH = 5;   // the verdict is graded from this stretch up, the factor the Predict-first question names
const GENERATED_CLASSES = ['A', 'B'];
// What each data mode shows on its axes: the plot is always a 0..10 square, the view maps it to data units.
// Built when drawn so the titles follow the language.
const views = {
  generated: () => ({ xLo: 0, xHi: 10, yLo: 0, yHi: 10, xTitle: tr('Feature 1', 'Feature 1'), yTitle: tr('Feature 2', 'Feature 2'), xName: tr('horizontal feature', 'feature horizontal'), yName: tr('vertical feature', 'feature vertikal'), identity: true }),
  penguins: () => ({ xLo: 150, xHi: 250, yLo: 2000, yHi: 7000, xTitle: tr('Flipper length (mm)', 'Panjang sirip (mm)'), yTitle: tr('Body mass (g)', 'Massa tubuh (g)'), xName: tr('flipper length', 'panjang sirip'), yName: tr('body mass', 'massa tubuh'), identity: false }),
};
const upper = s => s[0].toUpperCase() + s.slice(1);

const hexToRGB = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

let mounts = 0;

export function mount(root) {
  const uid = `knn-${++mounts}`;
  const abort = new AbortController();
  const on = (el, type, fn) => el.addEventListener(type, fn, { signal: abort.signal });
  const modeSpec = dataModeSpec({ label: tr('Data source', 'Sumber data'), real: [['penguins', tr('Penguins (real)', 'Penguin (data nyata)')]] });
  root.innerHTML = `
<div class="sim" data-ref="workspace">
  <section class="card plot-card">
    <div class="card-head"><div><h3>${tr('Feature space', 'Ruang fitur')}</h3><p>${tr('Click or drag to place the query point. Its k nearest neighbors vote.', 'Klik atau seret untuk menaruh titik query. k neighbor terdekatnya akan vote.')}</p></div>${actionsHTML()}</div>
    <div class="plot-progress"><div><div class="status" data-ref="status" role="status"></div><p class="hint" data-ref="detail"></p></div></div>
    <div class="plot-progress"><div><div class="status" data-ref="score" role="status" aria-live="polite" aria-atomic="true"></div><p class="hint" data-ref="kept" role="status" aria-live="polite" aria-atomic="true"></p></div></div>
    <div class="vote-track" aria-hidden="true" data-ref="track"></div>
    <div class="vote-labels" data-ref="voteLabels"></div>
    <div class="chart"><canvas data-ref="plot" role="img" tabindex="0" aria-describedby="${uid}-keys"></canvas></div>
    <div class="legend" data-ref="legend" style="max-height:none"></div>
    <p class="hint" id="${uid}-keys">${tr('With the plot focused, the arrow keys move the query point (hold Shift for bigger steps).', 'Saat plot difokus, tombol panah menggeser titik query (tahan Shift untuk langkah lebih besar).')}</p>
  </section>
  <aside class="card settings"><h3>${tr('Parameters', 'Parameter')}</h3>
    <label>${modeSpec.label}<select data-ref="data">${modeSpec.options.map(([v, text]) => `<option value="${v}">${text}</option>`).join('')}</select></label>
    <p class="hint" data-ref="dataNote" role="status"></p>
    <label>${tr('Dataset', 'Dataset')}<select data-ref="dataset"><option value="clusters">${tr('Overlapping clusters', 'Cluster tumpang tindih')}</option><option value="rings">${tr('Concentric rings', 'Cincin konsentris')}</option><option value="checker">${tr('Checkerboard', 'Papan catur')}</option></select></label>
    <label>${tr('Distance', 'Jarak')}<select data-ref="metric" aria-describedby="${uid}-metric-hint"><option value="euclidean">Euclidean</option><option value="manhattan">Manhattan</option></select></label>
    <p class="hint" id="${uid}-metric-hint">${tr('Manhattan changes which points count as nearest; turn on decision regions to see it.', 'Manhattan mengubah titik mana yang dianggap terdekat; aktifkan decision region untuk melihatnya.')}</p>
    <div class="slider-label"><label for="${uid}-k">${tr('Neighbors (k)', 'Neighbor (k)')}</label> <output for="${uid}-k" data-ref="kOut" aria-hidden="true">3</output><input id="${uid}-k" data-ref="k" type="range" min="1" max="15" step="1" value="3"></div>
    <label>${tr('Stretch which feature', 'Feature yang diregangkan')}<select data-ref="axis" aria-describedby="${uid}-stretch-hint"><option value="x"></option><option value="y"></option></select></label>
    <div class="slider-label"><label for="${uid}-stretch" data-ref="stretchLabel"></label> <output for="${uid}-stretch" data-ref="stretchOut" aria-hidden="true">×1</output><input id="${uid}-stretch" data-ref="stretch" type="range" min="1" max="10" step="1" value="1"></div>
    <p class="hint" id="${uid}-stretch-hint">${tr('The stretch multiplies that feature before any distance is computed. The axes stay in true units; only which points count as nearest changes.', 'Peregangan mengalikan feature itu sebelum jarak apa pun dihitung. Sumbu tetap dalam satuan aslinya; yang berubah hanyalah titik mana yang dianggap terdekat.')}</p>
    <label>${tr('Number of points', 'Jumlah titik')}<span class="row"><input data-ref="count" type="number" min="4" max="400" step="1" value="48"><button type="button" data-act="randomize">${tr('Randomize', 'Acak ulang')}</button></span></label>
    <label class="toggle"><input data-ref="regions" type="checkbox" checked> ${tr('Show decision regions', 'Tampilkan decision region')}</label>
    <label class="toggle"><input data-ref="tests" type="checkbox" checked> ${tr('Show test points', 'Tampilkan test point')}</label>
    <button type="button" data-act="keep" style="display:block;width:100%;margin-top:14px;white-space:normal">${tr('Keep this boundary to compare', 'Simpan boundary ini untuk dibandingkan')}</button>
    <button type="button" data-act="clearKept" style="display:block;width:100%;margin-top:8px;white-space:normal" disabled>${tr('Clear kept boundary', 'Hapus boundary yang disimpan')}</button>
  </aside>
</div>
<div data-ref="below"></div>`;

  const ref = n => root.querySelector(`[data-ref="${n}"]`);
  const act = n => root.querySelector(`[data-act="${n}"]`);
  const canvas = ref('plot');
  const ctx = canvas.getContext('2d');
  // The query lives in plot space (the 0..10 square) so keys and drags move it the same in every data mode.
  const QUERY0 = { x: 5, y: 5 };
  let seed = SHARED_SEED, query = { ...QUERY0 }, dragging = false;
  let mode = 'generated', table = null, real = null, loadToken = 0, loadFailed = false, destroyed = false;
  let points = [], testSet = [], classes = GENERATED_CLASSES, accCache = new Map(), regionCache = null;
  let kept = null, keptNotice = '', legendKey = '', lastReveal = null;
  const regionCanvas = document.createElement('canvas');
  setupFullscreen(ref('workspace'), act('fullscreen'), abort.signal);

  const box = predictBox(ref('below'), {
    hint: tr('Stretch a feature to ×5 or more in the Parameters, then check again.', 'Regangkan satu feature sampai ×5 atau lebih pada Parameter, lalu periksa lagi.'),
    name: 'predict-stretch',
    question: tr(`What happens to the test accuracy when you stretch one feature to ×${PREDICT_STRETCH} or more? Pick an answer, then set the stretch slider.`, `Apa yang terjadi pada accuracy di test point saat satu feature diregangkan sampai ×${PREDICT_STRETCH} atau lebih? Pilih jawabanmu, lalu atur slider peregangan.`),
    choices: [
      ['up', tr('It goes up', 'Naik')],
      ['same', tr('It stays about the same', 'Hampir tidak berubah')],
      ['down', tr('It goes down', 'Turun')],
    ],
  });

  const k = () => Number(ref('k').value);
  const metric = () => ref('metric').value;
  const axis = () => ref('axis').value;
  const stretch = () => Number(ref('stretch').value);
  const scale = () => scaleFor(axis(), stretch());
  const view = () => views[mode]();
  const maxCount = () => (mode === 'penguins' && real ? Math.min(400, real.train.length) : 400);
  // The effective point count; the field is written back so it never shows a value the lab is not using.
  const countValue = () => Math.max(Math.min(4, maxCount()), Math.min(maxCount(), Math.round(Number(ref('count').value)) || 48));
  const classColor = label => clusterColor(Math.max(0, classes.indexOf(label)));
  const toPlot = (p, v) => ({ x: (p.x - v.xLo) / (v.xHi - v.xLo) * 10, y: (p.y - v.yLo) / (v.yHi - v.yLo) * 10 });
  const toData = (p, v) => ({ x: v.xLo + p.x / 10 * (v.xHi - v.xLo), y: v.yLo + p.y / 10 * (v.yHi - v.yLo) });
  const setText = (el, text) => { if (el.textContent !== text) el.textContent = text; };

  // Names the stretched feature in the slider label and the select options; rebuilt when the data mode changes.
  function labelStretch() {
    const v = view(), sel = ref('axis'), isReal = mode === 'penguins';
    setText(sel.options[0], isReal ? `${upper(v.xName)} (${tr('horizontal', 'horizontal')})` : tr('Horizontal feature', 'Feature horizontal'));
    setText(sel.options[1], isReal ? `${upper(v.yName)} (${tr('vertical', 'vertikal')})` : tr('Vertical feature', 'Feature vertikal'));
    const name = axis() === 'x' ? v.xName : v.yName;
    setText(ref('stretchLabel'), isReal ? tr(`Stretch ${name}`, `Regangkan ${name}`) : tr(`Stretch the ${name}`, `Regangkan ${name}`));
  }

  // New points (a new dataset, a new count, a new draw, a new data source): the kept boundary no longer fits them.
  function rebuild({ note = true } = {}) {
    const n = countValue();
    ref('count').max = maxCount();
    ref('count').value = n;
    if (mode === 'penguins' && real) {
      points = real.train.slice(0, n);
      testSet = real.test;
      classes = real.classes;
    } else {
      points = makeDataset(ref('dataset').value, seed, n);
      testSet = generatedTest(ref('dataset').value);
      classes = GENERATED_CLASSES;
    }
    accCache = new Map();
    regionCache = null;
    if (kept && note) keptNotice = tr('The kept boundary was cleared because the data changed.', 'Boundary yang disimpan dihapus karena datanya berubah.');
    kept = null;
    ref('dataset').disabled = mode === 'penguins';
    render();
  }

  // The same tests under the same settings are asked many times while the learner drags the query: remember them.
  function accuracy(kk, m, ax, s) {
    const key = `${kk}|${m}|${ax}|${s}`;
    if (!accCache.has(key)) accCache.set(key, testAccuracy(points, testSet, kk, m, scaleFor(ax, s)));
    return accCache.get(key);
  }

  // The decision-region grid depends on the points, k, the distance and the stretch, not on the query, so dragging reuses it.
  function regionLabels() {
    const key = `${k()}|${metric()}|${axis()}|${stretch()}`;
    if (regionCache && regionCache.points === points && regionCache.key === key) return regionCache;
    return (regionCache = { points, key, n: GRID, labels: labelGrid(points, k(), metric(), scale(), view(), GRID) });
  }

  const settingsText = (info, v) => {
    const name = info.axis === 'x' ? v.xName : v.yName;
    const stretchText = info.stretch === 1 ? tr('no stretch', 'tanpa peregangan') : `${name} ×${fmt(info.stretch)}`;
    return `k = ${fmt(info.k)}, ${info.metric === 'manhattan' ? 'Manhattan' : 'Euclidean'}, ${stretchText}`;
  };

  function render() {
    const v = view(), K = k(), S = stretch();
    // The label names the slider and aria-valuetext is what it announces; the visible readout is hidden from assistive tech.
    ref('kOut').textContent = fmt(K);
    ref('k').setAttribute('aria-valuetext', fmt(K));
    ref('stretchOut').textContent = `×${fmt(S)}`;
    ref('stretch').setAttribute('aria-valuetext', `×${fmt(S)}`);
    labelStretch();
    const qData = toData(query, v);
    const r = classifyScaled(points, qData, K, metric(), scale(), classes);
    const total = r.picked.length;
    // The text keeps the theme ink (the class colors are tuned for plot marks, not for text); a swatch carries the class.
    const swatch = document.createElement('span');
    swatch.setAttribute('aria-hidden', 'true');
    swatch.style.cssText = `display:inline-block;width:.7em;height:.7em;border-radius:50%;margin-right:.45em;background:${classColor(r.label)}`;
    ref('status').replaceChildren(swatch, document.createTextNode(`${tr('Prediction: class', 'Prediksi: kelas')} ${r.label}`));
    ref('detail').textContent = r.tied ? tr('Votes tie, so the closest neighbor decides.', 'Vote seri, sehingga neighbor terdekat yang menentukan.') : tr(`${fmt(r.votes[r.label])} of ${fmt(total)} neighbors voted ${r.label}.`, `${fmt(r.votes[r.label])} dari ${fmt(total)} neighbor memilih ${r.label}.`);
    ref('track').replaceChildren(...classes.map(c => { const s = document.createElement('span'); s.style.cssText = `width:${100 * r.votes[c] / total}%;background:${classColor(c)}`; return s; }));
    ref('voteLabels').replaceChildren(...classes.map(c => {
      const s = document.createElement('span'), dot = document.createElement('span');
      dot.setAttribute('aria-hidden', 'true');
      dot.style.cssText = `display:inline-block;width:.7em;height:.7em;border-radius:50%;margin-right:.4em;background:${classColor(c)}`;
      s.append(dot, mode === 'penguins' ? `${c} · ${fmt(r.votes[c])}` : `${tr('Class', 'Kelas')} ${c} · ${fmt(r.votes[c])}`);
      return s;
    }));

    // The fixed test points: the same ones under every setting, so a change in the count is a change in the model.
    const acc = accuracy(K, metric(), axis(), S);
    setText(ref('score'), tr(`Test points classified correctly: ${fmt(acc.correct)} of ${fmt(acc.total)} (${pct(acc.fraction, 0)})`, `Test point yang diklasifikasikan dengan benar: ${fmt(acc.correct)} dari ${fmt(acc.total)} (${pct(acc.fraction, 0)})`));
    if (kept) {
      const diff = acc.correct - kept.correct, signed = diff === 0 ? fmt(0) : `${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff))}`;
      setText(ref('kept'), tr(`Kept boundary (${settingsText(kept, v)}): ${fmt(kept.correct)} of ${fmt(kept.total)} correct. Now: ${fmt(acc.correct)} of ${fmt(acc.total)} (${signed}).`, `Boundary yang disimpan (${settingsText(kept, v)}): ${fmt(kept.correct)} dari ${fmt(kept.total)} benar. Sekarang: ${fmt(acc.correct)} dari ${fmt(acc.total)} (${signed}).`));
    } else {
      setText(ref('kept'), keptNotice || tr('Set k, the distance and the stretch, press “Keep this boundary to compare”, then change a setting: the kept boundary stays as a dashed line.', 'Atur k, jarak, dan peregangan, tekan “Simpan boundary ini untuk dibandingkan”, lalu ubah satu pengaturan: boundary yang disimpan tetap tampil sebagai garis putus-putus.'));
    }
    act('clearKept').disabled = !kept;
    // Labeled parts joined by a semicolon: a bare "5,0, 5,0" is ambiguous where the decimal separator is a comma.
    const qText = mode === 'penguins'
      ? `${v.xName} ${fmt(qData.x, { max: 0 })} mm; ${v.yName} ${fmt(qData.y, { max: 0 })} g`
      : `x = ${fmt(qData.x, { digits: 1 })}; y = ${fmt(qData.y, { digits: 1 })}`;
    canvas.setAttribute('aria-label', tr(`Scatter plot of training points and fixed test points with a movable query point at ${qText}. Predicted class ${r.label}. ${fmt(acc.correct)} of ${fmt(acc.total)} test points are classified correctly.`, `Scatter plot titik latih dan test point tetap, dengan titik query yang bisa digeser di ${qText}. Kelas prediksi ${r.label}. ${fmt(acc.correct)} dari ${fmt(acc.total)} test point diklasifikasikan dengan benar.`));
    drawLegend();
    revealPrediction(acc);
    draw(r, acc);
  }

  // The verdict appears once the learner has both picked an answer and stretched a feature to the factor the question names,
  // and again only when its text changes.
  function revealPrediction(acc) {
    if (box.chosen() == null || stretch() < PREDICT_STRETCH) return;
    const v = view(), before = accuracy(k(), metric(), axis(), 1);
    const name = axis() === 'x' ? v.xName : v.yName;
    const text = tr(
      `With the ${name} stretched ×${fmt(stretch())} and k = ${fmt(k())}, ${fmt(acc.correct)} of ${fmt(acc.total)} test points are right, against ${fmt(before.correct)} of ${fmt(before.total)} with no stretch. A stretched feature counts more in every distance, so the neighbors are chosen mostly by it; whether that helps depends on whether that feature carries the class.`,
      `Dengan ${name} diregangkan ×${fmt(stretch())} dan k = ${fmt(k())}, ${fmt(acc.correct)} dari ${fmt(acc.total)} test point benar, dibanding ${fmt(before.correct)} dari ${fmt(before.total)} tanpa peregangan. Feature yang diregangkan lebih berpengaruh pada setiap jarak, sehingga neighbor terutama dipilih olehnya; apakah itu membantu bergantung pada apakah feature tersebut membawa informasi kelas.`);
    if (text === lastReveal) return;
    lastReveal = text;
    box.reveal(accuracyVerdict(before, acc), text);
  }

  function drawLegend() {
    const key = `${ref('regions').checked}|${!!kept}`;
    if (key === legendKey) return;
    legendKey = key;
    const el = (css, cls = '') => { const g = document.createElement('span'); if (cls) g.className = cls; g.style.cssText = css; g.setAttribute('aria-hidden', 'true'); return g; };
    const item = (glyph, text) => { const s = document.createElement('span'); s.append(glyph, text); return s; };
    const cross = el('display:inline-block;width:9px;height:9px;border:2px solid var(--muted);box-sizing:border-box;font-size:12px;line-height:5px;text-align:center;color:var(--ink)');
    cross.textContent = '×';
    const items = [
      item(el('display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--muted)'), tr('Training point', 'Titik latih')),
      item(el('display:inline-block;width:9px;height:9px;border:2px solid var(--muted);box-sizing:border-box'), tr('Test point (fixed)', 'Test point (tetap)')),
      item(cross, tr('Test point classified wrong', 'Test point yang salah diklasifikasikan')),
    ];
    if (ref('regions').checked) items.push(item(el('--glyph:var(--ink)', 'glyph-line'), tr('Boundary now', 'Boundary sekarang')));
    if (kept) items.push(item(el('--glyph:var(--accent)', 'glyph-line dashed'), tr('Kept boundary', 'Boundary yang disimpan')));
    ref('legend').replaceChildren(...items);
  }

  // The class boundary as a line over the grid cells: the shading alone barely moves when a setting changes, the edge does.
  function traceBoundary(labels, n, g) {
    ctx.beginPath();
    const at = (i, j) => labels[i * n + j];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x0 = g.px(i * 10 / n), x1 = g.px((i + 1) * 10 / n), y0 = g.py(j * 10 / n), y1 = g.py((j + 1) * 10 / n);
      if (i + 1 < n && at(i, j) !== at(i + 1, j)) { ctx.moveTo(x1, y0); ctx.lineTo(x1, y1); }
      if (j + 1 < n && at(i, j) !== at(i, j + 1)) { ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); }
    }
  }

  // The kit's plot labels its axes 0..10; real data uses other units, so the plot is drawn without labels and they are added from the data range.
  function relabelAxes(g, v) {
    // On a phone the margin left of the plot is about 31px: four-digit ticks need a tighter gap and the vertical
    // title moves inside the plot (top left, over a plot-colored backing), where the data never reaches.
    const narrow = g.px(0) < 70;
    ctx.save();
    ctx.fillStyle = g.t.muted;
    ctx.font = '11px system-ui, sans-serif';
    for (let i = 0; i <= 5; i++) {
      ctx.textAlign = 'center'; ctx.fillText(formatTick(v.xLo + i * (v.xHi - v.xLo) / 5), g.px(i * 2), g.py(0) + 16);
      ctx.textAlign = 'right'; ctx.fillText(formatTick(v.yLo + i * (v.yHi - v.yLo) / 5), g.px(0) - (narrow ? 3 : 7), g.py(i * 2) + 4);
    }
    ctx.textAlign = 'center'; ctx.fillText(v.xTitle, g.px(5), g.height - 5);
    if (narrow) {
      const w = ctx.measureText(v.yTitle).width;
      ctx.fillStyle = g.t.plot; ctx.fillRect(g.px(0) + 2, g.py(10) + 2, w + 8, 16);
      ctx.fillStyle = g.t.muted; ctx.textAlign = 'left'; ctx.fillText(v.yTitle, g.px(0) + 6, g.py(10) + 14);
    } else {
      ctx.translate(g.px(0) - 27, g.py(5)); ctx.rotate(-Math.PI / 2); ctx.fillText(v.yTitle, 0, 0);
    }
    ctx.restore();
  }

  function draw(r, acc) {
    const v = view();
    const g = beginPlot(canvas, ctx, v.xTitle, v.yTitle);
    if (!v.identity) {
      // beginPlot wrote the 0..10 tick numbers; erase the margins (they are transparent) and write the real ones.
      ctx.clearRect(0, 0, g.px(0) - 2, g.height);
      ctx.clearRect(0, g.py(0) + 2, g.width, g.height);
      relabelAxes(g, v);
    }
    if (ref('regions').checked) {
      const { n, labels } = regionLabels();
      ctx.save();
      clipToPlot(ctx, g);
      // One pixel per cell, then scaled up without smoothing: flat shading, no overlap strips or seams.
      regionCanvas.width = regionCanvas.height = n;
      const rctx = regionCanvas.getContext('2d');
      const img = rctx.createImageData(n, n);
      const rgb = Object.fromEntries(classes.map(c => [c, hexToRGB(classColor(c))]));
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const o = ((n - 1 - j) * n + i) * 4;
        img.data.set([...rgb[labels[i * n + j]], 0x30], o);
      }
      rctx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(regionCanvas, g.px(0), g.py(10), g.size, g.size);
      traceBoundary(labels, n, g);
      ctx.strokeStyle = g.t.ink;
      ctx.globalAlpha = .55;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
    if (kept) {
      ctx.save();
      clipToPlot(ctx, g);
      traceBoundary(kept.labels, kept.n, g);
      // A thin halo in the card color keeps the dashes readable over any class shading.
      ctx.strokeStyle = g.t.surface;
      ctx.globalAlpha = .85;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = g.t.accent;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }
    const at = p => { const q = toPlot(p, v); return { x: g.px(q.x), y: g.py(q.y) }; };
    const qp = { x: g.px(query.x), y: g.py(query.y) };
    const picked = new Set(r.picked.map(n => n.i));
    r.picked.forEach(n => {
      const p = at(points[n.i]);
      ctx.beginPath();
      ctx.moveTo(qp.x, qp.y);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = classColor(points[n.i].label) + '88';
      ctx.stroke();
    });
    if (ref('tests').checked) {
      const wrong = new Set(acc.wrong), half = 3.6, out = half + 1.5;
      testSet.forEach((t, i) => {
        const p = at(t);
        ctx.beginPath();
        ctx.rect(p.x - half, p.y - half, 2 * half, 2 * half);
        ctx.fillStyle = g.t.surface;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = classColor(t.label);
        ctx.stroke();
        if (wrong.has(i)) {
          ctx.beginPath();
          ctx.moveTo(p.x - out, p.y - out); ctx.lineTo(p.x + out, p.y + out);
          ctx.moveTo(p.x + out, p.y - out); ctx.lineTo(p.x - out, p.y + out);
          ctx.lineWidth = 1.8;
          ctx.strokeStyle = g.t.ink;
          ctx.stroke();
        }
      });
      ctx.lineWidth = 1;
    }
    points.forEach((pt, i) => {
      const p = at(pt);
      ctx.beginPath();
      ctx.arc(p.x, p.y, picked.has(i) ? 6 : 4.4, 0, 2 * Math.PI);
      ctx.fillStyle = classColor(pt.label);
      ctx.fill();
      if (picked.has(i)) { ctx.lineWidth = 2; ctx.strokeStyle = g.t.ink; ctx.stroke(); ctx.lineWidth = 1; }
    });
    ctx.beginPath();
    ctx.moveTo(qp.x, qp.y - 11); ctx.lineTo(qp.x + 11, qp.y); ctx.lineTo(qp.x, qp.y + 11); ctx.lineTo(qp.x - 11, qp.y); ctx.closePath();
    ctx.fillStyle = classColor(r.label);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = g.t.ink;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  // ---- data source ----------------------------------------------------------

  function dataNote() {
    const el = ref('dataNote');
    if (ref('data').value === 'penguins' && mode !== 'penguins') { setText(el, tr('Loading the penguin data…', 'Memuat data penguin…')); return; }
    if (mode === 'penguins' && real) {
      const missing = real.dropped > 0
        ? tr(`${fmt(real.used)} of ${fmt(real.total)} penguins used. ${fmt(real.dropped)} rows have no flipper length or body mass (NA) and are dropped.`, `${fmt(real.used)} dari ${fmt(real.total)} penguin dipakai. ${fmt(real.dropped)} baris tidak punya panjang sirip atau massa tubuh (NA) sehingga dibuang.`)
        : tr(`All ${fmt(real.total)} penguins have both measurements.`, `Semua ${fmt(real.total)} penguin punya kedua pengukuran.`);
      setText(el, `${missing} ${tr(`The class is the species. ${fmt(real.test.length)} penguins are held out as test points; the rest are training rows. The Dataset menu applies to generated data only.`, `Kelasnya adalah spesies. ${fmt(real.test.length)} penguin disisihkan sebagai test point; sisanya baris latih. Menu Dataset hanya berlaku untuk data buatan.`)}`);
      return;
    }
    setText(el, loadFailed ? tr('Could not load the penguin data. Showing generated data.', 'Data penguin tidak dapat dimuat. Menampilkan data buatan.') : '');
  }

  async function setMode(next) {
    const token = ++loadToken;
    loadFailed = false;
    if (next === 'generated') { mode = 'generated'; real = null; dataNote(); rebuild(); return; }
    dataNote();
    try {
      table = await loadDataset(next);
      if (destroyed || token !== loadToken) return;
      real = penguinSplit(table, seed);
      mode = 'penguins';
    } catch {
      if (destroyed || token !== loadToken) return;
      loadFailed = true; mode = 'generated'; real = null;
      ref('data').value = 'generated';
    }
    dataNote();
    rebuild();
  }

  const place = e => { query = eventToData(canvas, e); render(); };
  on(canvas, 'pointerdown', e => { dragging = true; canvas.setPointerCapture(e.pointerId); place(e); });
  on(canvas, 'pointermove', e => { if (dragging) place(e); });
  on(canvas, 'pointerup', () => { dragging = false; });
  on(canvas, 'keydown', e => {
    const step = e.shiftKey ? 1 : .25, d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (!d) return;
    e.preventDefault();
    query = { x: Math.max(0, Math.min(10, query.x + d[0])), y: Math.max(0, Math.min(10, query.y + d[1])) };
    render();
  });
  on(act('reset'), 'click', () => {
    // Back to the opening state: the shared point set (not a Randomize draw) and the default settings.
    // The data source and the two display toggles stay as the learner chose them.
    query = { ...QUERY0 };
    seed = SHARED_SEED;
    if (mode === 'penguins' && table) real = penguinSplit(table, seed);
    ref('k').value = 3;
    ref('metric').value = 'euclidean';
    ref('dataset').value = 'clusters';
    ref('count').value = 48;
    ref('stretch').value = 1;
    ref('axis').value = 'x';
    box.reset(); lastReveal = null;
    keptNotice = '';
    rebuild({ note: false });
  });
  on(act('randomize'), 'click', () => {
    seed = Math.floor(Math.random() * 2 ** 32);
    if (mode === 'penguins' && table) real = penguinSplit(table, seed);
    rebuild();
  });
  on(act('keep'), 'click', () => {
    const { labels, n } = regionLabels(), acc = accuracy(k(), metric(), axis(), stretch());
    kept = { labels, n, k: k(), metric: metric(), axis: axis(), stretch: stretch(), correct: acc.correct, total: acc.total };
    keptNotice = '';
    render();
  });
  on(act('clearKept'), 'click', () => { kept = null; keptNotice = ''; render(); act('keep').focus(); });
  on(ref('data'), 'change', () => setMode(ref('data').value));
  // A different dataset or count means different points: rebuild. A different distance, k or stretch keeps the points.
  for (const n of ['dataset', 'count']) on(ref(n), 'change', () => rebuild());
  for (const n of ['metric', 'axis', 'regions', 'tests']) on(ref(n), 'change', render);
  for (const n of ['k', 'stretch']) on(ref(n), 'input', render);
  // Picking an answer after the feature is already stretched shows the verdict at once.
  box.onPick(() => { lastReveal = null; render(); });
  on(window, 'themechange', render);
  const ro = new ResizeObserver(() => render());
  ro.observe(canvas);
  rebuild();
  return () => { destroyed = true; ro.disconnect(); abort.abort(); box.destroy(); };
}
