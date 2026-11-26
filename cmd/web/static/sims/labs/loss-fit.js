// Lab: drag a line through points with two handles (or the sliders), see every residual and what
// it costs, and see the loss as a function of the slope. Squared error gives a bowl, absolute error
// gives a V (a chain of straight pieces). Generated points or the real penguins (flipper vs mass).
import { createLab, createPlot, drawLineChart, clusterColor, theme, formatTick, dataModeSpec, loadDataset, predictBox, tr, fmt, pct } from '../kit/index.js';
import { LOSSES, makeData, residuals, lossOf, lineLoss, bestLine, bestSlopeForIntercept, lossCurve, linspace, OUTLIER, residualSquares } from '../ml/lossfit.js';
import { penguinPoints, handlePositions, dragHandle, costs, largestShare, lineShift, shiftWinner, bestAbsoluteLine } from '../ml/lossfitplay.js';

const SLOPE_MIN = -0.5, SLOPE_MAX = 1.5, B_MIN = 0, B_MAX = 6;
const LIMITS = { slopeMin: SLOPE_MIN, slopeMax: SLOPE_MAX, interceptMin: B_MIN, interceptMax: B_MAX };
// On a data set with more than this many points only the largest squares are drawn.
const SQUARES_WHEN_MANY = 12;
// Squared-residual boxes: faint fill so overlaps stay readable, a clear but translucent outline.
const SQUARE_FILL_ALPHA = 0.07, SQUARE_EDGE_ALPHA = 0.55;
const START = { slope: 0.2, intercept: 4 };
// Below this shift (plot units, 0 to 10) a best line has hardly moved, so the lab says so instead of claiming a pull.
const FAINT_SHIFT = 0.1;
// Indonesian names of the losses, keyed like LOSSES in sims/ml/lossfit.js (which stays language-free).
const LOSS_ID = { mse: 'MSE (galat kuadrat rata-rata)', mae: 'MAE (galat absolut rata-rata)' };
// Shorter names for the narrow table, so the Best column stays visible on a phone.
const LOSS_ID_SHORT = { mse: 'MSE (kuadrat)', mae: 'MAE (absolut)' };
const lossName = kind => tr(LOSSES[kind], LOSS_ID[kind]);
const num = v => fmt(v, { digits: Math.abs(v) >= 100 ? 1 : 3 });
const f2 = v => fmt(v, { digits: 2 });
const clampSlope = v => Math.max(SLOPE_MIN, Math.min(SLOPE_MAX, v));
const clampIntercept = v => Math.max(B_MIN, Math.min(B_MAX, v));

// A "nice" top for a bar axis: a multiple of 1, 2, 2.5 or 5 times a power of ten, and its ticks.
function niceAxis(max, count = 4) {
  const raw = (max || 1) / count, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? raw;
  const top = step * Math.ceil((max || 1) / step - 1e-9);
  return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => Number((i * step).toPrecision(12))) };
}

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Fit a line, read its loss', 'Cari garis yang pas, lihat loss-nya'),
    hint: tr('Drag the two handles on the line, or move the sliders. The vertical segments are the residuals; the loss is their average cost.', 'Seret kedua pegangan pada garis, atau geser slider-nya. Garis vertikal itu residual, yaitu selisih tiap titik dari garis. Loss-nya adalah rata-rata "hukuman" dari residual tersebut.'),
    status: true, legend: true,
    canvasLabel: tr('Scatter plot of points with a straight line, two draggable handles and vertical residual segments. Left and right arrow keys pick a handle, up and down arrow keys move it. Page Up, Page Down, Home and End step through the points and show one point\'s cost.', 'Scatter plot titik-titik dengan satu garis lurus, dua pegangan yang bisa digeser, dan garis residual vertikal. Tombol panah kiri dan kanan memilih pegangan, panah atas dan bawah menggesernya. Page Up, Page Down, Home, dan End berpindah antartitik dan menampilkan biaya satu titik.'),
    extra: {
      title: tr('Both losses for the same line', 'Dua loss untuk garis yang sama'),
      hint: tr('"Best" is the loss at the best line for that loss, the one the Snap button finds.', 'Kolom "Terbaik" adalah loss di garis terbaik untuk loss tersebut, yaitu garis yang dicari tombol "Ke garis terbaik".'),
    },
  });
  const plot = createPlot(lab.canvas, { xLabel: tr('x (input)', 'x (input)'), yLabel: tr('y (output)', 'y (output)') });

  // The sets of points: generated now, the penguins once loaded. Each has a plain and an outlier version.
  const sets = { generated: { plain: makeData(11), withOut: makeData(11, { outlier: true }) } };
  let penguinInfo = null;
  let mode = 'generated';
  let line = { ...START };
  let handles = handlePositions(line);
  let drag = null, hover = -1, picked = -1, side = 0, focused = false, loadToken = 0, loadState = 'idle', destroyed = false;
  const bestCache = new Map();

  const controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real)', 'Penguin (data nyata)')]] }),
    { name: 'slope', type: 'range', label: tr('Slope', 'Slope'), min: SLOPE_MIN, max: SLOPE_MAX, step: 0.01, value: START.slope, format: f2 },
    { name: 'intercept', type: 'range', label: tr('Intercept', 'Intercept'), min: B_MIN, max: B_MAX, step: 0.01, value: START.intercept, format: f2 },
    { name: 'loss', type: 'select', label: 'Loss', options: Object.keys(LOSSES).map(kind => [kind, lossName(kind)]), value: 'mse' },
    { name: 'outlier', type: 'toggle', label: tr('Add an outlier', 'Tambah outlier'), value: false },
    { name: 'residuals', type: 'toggle', label: tr('Show residuals', 'Tampilkan residual'), value: true },
    { type: 'note', text: tr('Drag the two diamond handles on the plot. With the keyboard, focus the plot: left and right arrows pick a handle, up and down arrows move it (Shift moves it further). Page Up, Page Down, Home and End step through the points left to right and show what one point costs; Escape clears it.', 'Seret dua pegangan belah ketupat di plot. Dengan keyboard, fokus ke plot: panah kiri dan kanan memilih pegangan, panah atas dan bawah menggesernya (Shift untuk lompatan lebih besar). Page Up, Page Down, Home, dan End berpindah antartitik dari kiri ke kanan dan menampilkan biaya satu titik; Escape menghapusnya.') },
    { type: 'note', text: tr('Try to beat the Snap button by hand, then switch the loss and the outlier.', 'Coba cari garis yang lebih baik daripada tombol di bawah, lalu ganti jenis loss dan nyalakan outlier.') },
    { name: 'snap', type: 'button', label: tr('Snap to the best line', 'Ke garis terbaik'), onClick: () => snap() },
  ], (name, v) => {
    if (name === 'data') { setMode(v.data); return; }
    if (name === 'slope' || name === 'intercept') { line = { slope: v.slope, intercept: v.intercept }; handles = handlePositions(line); }
    if (name === 'outlier') {
      hover = -1; picked = -1;
      if (v.outlier) revealOutlier(); else box.reset();
    }
    draw();
  });

  // A note about where the points come from, right under the data switch.
  const dataNote = document.createElement('p');
  dataNote.className = 'hint';
  controls.el.children[0].after(dataNote);

  const box = predictBox(lab.ref('below'), {
    hint: tr('Tick Add an outlier in the Parameters, then check again.', 'Centang Tambah outlier pada Parameter, lalu periksa lagi.'),
    question: tr('You add the outlier. Which best line moves more: the one for MSE or the one for MAE? Pick one, then tick "Add an outlier".', 'Kamu menambah outlier. Garis terbaik mana yang bergeser lebih jauh: untuk MSE atau untuk MAE? Pilih satu, lalu centang "Tambah outlier".'),
    choices: [
      ['mse', tr('The MSE line moves more', 'Garis MSE bergeser lebih jauh')],
      ['mae', tr('The MAE line moves more', 'Garis MAE bergeser lebih jauh')],
      ['same', tr('They move about the same', 'Keduanya bergeser kurang lebih sama')],
    ],
  });
  const costCanvas = lab.chartCard(
    tr('What each point costs', 'Biaya tiap titik'),
    tr('One bar per point, left to right. Squared loss: the bar is the residual squared, the area of its square on the plot. Absolute loss: the bar is the length of the residual. The dashed line is the average, which is the loss.', 'Satu batang untuk tiap titik, dari kiri ke kanan. Pada loss kuadrat, batangnya adalah residual yang dikuadratkan, yaitu luas persegi di plot. Pada loss absolut, batangnya adalah panjang residual. Garis putus-putus adalah rata-rata, yaitu nilai loss.'),
    220,
  );
  const curveCanvas = lab.chartCard(
    tr('Loss as you change the slope', 'Loss saat slope diubah'),
    tr('The intercept stays at its current value. Blue: the loss at every slope. Orange dot: your slope. Green dot: the lowest loss.', 'Intercept dibiarkan di nilainya sekarang. Biru: loss untuk setiap slope. Titik oranye: slope-mu. Titik hijau: loss terendah.'),
    260,
  );
  lab.cleanup(() => { destroyed = true; box.destroy(); });

  const points = () => {
    const s = sets[mode] ?? sets.generated;
    return controls.get('outlier') ? s.withOut : s.plain;
  };

  // The best line for a loss on the current points; computed once per data set (the pair search is slow on 342 points).
  function best(kind, withOutlier = controls.get('outlier'), m = mode) {
    const key = `${m}|${withOutlier}|${kind}`;
    if (!bestCache.has(key)) {
      const s = sets[m], pts = withOutlier ? s.withOut : s.plain;
      bestCache.set(key, kind === 'mse' ? bestLine(pts, 'mse') : bestAbsoluteLine(pts));
    }
    return bestCache.get(key);
  }

  function setLine(next, nextHandles) {
    line = { slope: next.slope, intercept: next.intercept };
    handles = nextHandles ?? handlePositions(line);
    controls.set('slope', clampSlope(line.slope));
    controls.set('intercept', clampIntercept(line.intercept));
  }

  function snap() {
    setLine(best(controls.get('loss')));
    draw();
  }

  // Moves handle `idx` to `target` (data coordinates) and keeps the sliders in step.
  function moveHandle(idx, target) {
    const r = dragHandle(handles, idx, target, LIMITS);
    if (!r.line) return;
    setLine(r.line, r.handles);
    draw();
  }

  async function setMode(next) {
    const token = ++loadToken;
    box.reset();
    if (next === 'generated') { mode = 'generated'; loadState = 'idle'; hover = -1; picked = -1; draw(); return; }
    if (!sets.penguins) {
      loadState = 'loading'; draw();
      try {
        const info = penguinPoints(await loadDataset('penguins'));
        if (destroyed || token !== loadToken) return;
        penguinInfo = info;
        sets.penguins = { plain: info.points, withOut: [...info.points, { ...OUTLIER }] };
      } catch {
        if (destroyed || token !== loadToken) return;
        mode = 'generated'; loadState = 'failed'; controls.set('data', 'generated'); draw();
        return;
      }
    }
    mode = 'penguins'; loadState = 'idle'; hover = -1; picked = -1; draw();
  }

  // The prediction: after the outlier arrives, which best line moved more?
  box.onCheck(() => { if (controls.get('outlier')) revealOutlier(); });
  function revealOutlier() {
    const mse = lineShift(best('mse', false), best('mse', true)), mae = lineShift(best('mae', false), best('mae', true));
    const winner = shiftWinner(mse, mae);
    const n = (sets[mode] ?? sets.generated).plain.length;
    const faint = Math.max(mse, mae) < FAINT_SHIFT;
    const detail = tr(
      `The MSE line moved ${f2(mse)} on average, the MAE line ${f2(mae)} (in plot units). `,
      `Garis MSE bergeser ${f2(mse)} rata-rata, garis MAE ${f2(mae)} (dalam satuan plot). `,
    ) + (winner === 'mse' && faint
      ? tr(`Both lines barely moved: the outlier is one point among ${fmt(n)}. The direction is still the one squaring predicts, because the far-off point counts much more, but you can hardly see it here. Switch to the generated data to see a clear shift.`,
        `Kedua garis nyaris tidak bergeser: outlier hanya satu titik di antara ${fmt(n)}. Arahnya tetap seperti yang diperkirakan kuadrat, karena titik yang jauh itu berbobot jauh lebih besar, tetapi di sini hampir tidak terlihat. Pindah ke data buatan untuk melihat pergeseran yang jelas.`)
      : winner === 'mse' ? tr('Squaring makes the far-off point count much more, so the least-squares line is pulled toward it.', 'Kuadrat membuat titik yang jauh itu berbobot jauh lebih besar, sehingga garis least squares tertarik ke arahnya.') : '');
    box.reveal(winner, detail);
  }

  function drawPlot(v, pts) {
    plot.setLabels(
      mode === 'penguins' ? tr('flipper length (scaled)', 'panjang sirip (diskalakan)') : tr('x (input)', 'x (input)'),
      mode === 'penguins' ? tr('body mass (scaled)', 'massa tubuh (diskalakan)') : tr('y (output)', 'y (output)'),
    );
    const g = plot.begin();
    const res = residuals(pts, line.slope, line.intercept);
    const accent = g.t.accent, many = pts.length > 60;
    plot.clip(() => {
      if (v.residuals && v.loss === 'mse') {
        // Behind everything else, biggest first so small squares stay visible on top of big ones. The fill is
        // faint (overlaps add up instead of going solid) and the outline is thin and translucent.
        // With hundreds of points the squares would hide the data, so only the biggest ones get drawn.
        const ctx = plot.ctx, color = clusterColor(1);
        ctx.save();
        ctx.lineWidth = 1;
        for (const q of residualSquares(pts, res, { max: many ? SQUARES_WHEN_MANY : Infinity })) {
          const x = g.px(Math.min(q.x0, q.x1)), y = g.py(Math.max(q.y0, q.y1)), w = Math.abs(g.px(q.x1) - g.px(q.x0)), h = Math.abs(g.py(q.y1) - g.py(q.y0));
          ctx.globalAlpha = SQUARE_FILL_ALPHA; ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
          ctx.globalAlpha = SQUARE_EDGE_ALPHA; ctx.strokeStyle = color; ctx.strokeRect(x + 0.5, y + 0.5, w, h);
        }
        ctx.restore();
      }
      if (v.residuals) pts.forEach((p, i) => plot.segment(p.x, p.y, p.x, p.y - res[i], { color: clusterColor(1), width: many ? 1.2 : 2, alpha: 0.85 }));
      plot.segment(0, line.intercept, 10, line.slope * 10 + line.intercept, { color: accent, width: 3 });
    });
    pts.forEach((p, i) => {
      const isOutlier = v.outlier && i === pts.length - 1;
      // Points go on last, each with a halo in the plot's background colour so it reads on top of squares and lines.
      if (isOutlier) { plot.dot(p.x, p.y, g.t.plot, 12.5); plot.cross(p.x, p.y, clusterColor(3), 7); plot.ring(p.x, p.y, clusterColor(3), 11); }
      else { const r = many ? 3 : 4.6; plot.dot(p.x, p.y, g.t.plot, r + 2); plot.dot(p.x, p.y, g.t.ink, r); }
    });
    const tipAt = hover >= 0 ? hover : picked;
    if (tipAt >= 0 && tipAt < pts.length) drawTip(g, pts[tipAt], res[tipAt]);
    handles.forEach(h => plot.diamond(h.x, h.y, accent, 9));
    if (focused) {
      const idx = handles[0].x <= handles[1].x ? side : 1 - side;
      plot.ring(handles[idx].x, handles[idx].y, g.t.ink, 15, 2);
    }
  }

  // A small label next to a hovered, tapped or keyboard-selected point: its residual, the square of it and its absolute value.
  function drawTip(g, p, r) {
    const ctx = plot.ctx;
    plot.ring(p.x, p.y, g.t.ink, 8, 2);
    const text = `${tr('residual', 'residual')} ${f2(r)}  |  ${tr('squared', 'kuadrat')} ${f2(r * r)}  |  ${tr('absolute', 'absolut')} ${f2(Math.abs(r))}`;
    ctx.save();
    ctx.font = '600 12px system-ui, sans-serif';
    const w = ctx.measureText(text).width + 14, h = 22;
    const left = g.px(0), right = g.px(10);
    let x = g.px(p.x) - w / 2, y = g.py(p.y) - 34;
    x = Math.max(left, Math.min(right - w, x));
    if (y < g.py(10)) y = g.py(p.y) + 14;
    ctx.fillStyle = g.t.plot; ctx.strokeStyle = g.t.ink; ctx.lineWidth = 1;
    ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = g.t.ink; ctx.textAlign = 'left'; ctx.fillText(text, x + 7, y + 15);
    ctx.restore();
  }

  // One bar per point, left to right: its cost (r squared or |r|), and the average (the loss) as a dashed line.
  function drawCosts(v, pts) {
    const canvas = costCanvas, ctx = canvas.getContext('2d'), t = theme();
    const { width, height } = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const m = { l: 54, r: 16, t: 14, b: 40 };
    const cs = costs(residuals(pts, line.slope, line.intercept), v.loss);
    const mean = cs.reduce((s, c) => s + c, 0) / cs.length;
    const { top, ticks } = niceAxis(Math.max(...cs, mean) * 1.05);
    const order = xOrder(pts);
    const X0 = m.l, X1 = width - m.r, Y = c => height - m.b - c / top * (height - m.t - m.b);
    ctx.fillStyle = t.plot; ctx.fillRect(X0, m.t, X1 - X0, height - m.t - m.b);
    ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = t.muted; ctx.strokeStyle = t.grid; ctx.lineWidth = 1; ctx.textAlign = 'right';
    ctx.beginPath();
    for (const tick of ticks) { ctx.moveTo(X0, Y(tick)); ctx.lineTo(X1, Y(tick)); ctx.fillText(formatTick(tick), X0 - 6, Y(tick) + 4); }
    ctx.stroke();
    const slot = (X1 - X0) / order.length, bw = Math.max(1, slot * 0.78);
    order.forEach((idx, k) => {
      const isOutlier = v.outlier && idx === pts.length - 1;
      ctx.fillStyle = isOutlier ? clusterColor(3) : clusterColor(1);
      ctx.fillRect(X0 + k * slot + (slot - bw) / 2, Y(cs[idx]), bw, Math.max(0, (height - m.b) - Y(cs[idx])));
    });
    ctx.save(); ctx.setLineDash([6, 4]); ctx.lineWidth = 2; ctx.strokeStyle = t.ink;
    ctx.beginPath(); ctx.moveTo(X0, Y(mean)); ctx.lineTo(X1, Y(mean)); ctx.stroke(); ctx.restore();
    ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'right';
    const avg = `${tr('average', 'rata-rata')} = ${num(mean)}`, ay = Math.max(m.t + 13, Y(mean) - 6), aw = ctx.measureText(avg).width;
    ctx.fillStyle = t.plot; ctx.fillRect(X1 - 6 - aw - 4, ay - 13, aw + 8, 18);
    ctx.fillStyle = t.ink; ctx.fillText(avg, X1 - 6, ay);
    ctx.fillStyle = t.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(tr('points, left to right', 'titik, dari kiri ke kanan'), (X0 + X1) / 2, height - 6);
    ctx.save(); ctx.translate(13, (m.t + height - m.b) / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText(v.loss === 'mse' ? tr('squared residual', 'residual kuadrat') : tr('absolute residual', 'residual absolut'), 0, 0); ctx.restore();
  }

  function drawCurve(v, pts) {
    const slopes = linspace(SLOPE_MIN, SLOPE_MAX, 301);
    const ys = lossCurve(pts, v.loss, line.intercept, slopes);
    const bestS = bestSlopeForIntercept(pts, v.loss, line.intercept);
    const bestY = lineLoss(pts, v.loss, bestS, line.intercept);
    const nowY = lineLoss(pts, v.loss, line.slope, line.intercept);
    const clampS = clampSlope(line.slope);
    drawLineChart(curveCanvas, {
      series: [
        { xs: slopes, ys, color: clusterColor(0), points: false },
        { xs: [bestS], ys: [bestY], color: clusterColor(2) },
        { xs: [clampS], ys: [nowY], color: clusterColor(3) },
      ],
      xMin: SLOPE_MIN, xMax: SLOPE_MAX, yMin: 0, yMax: Math.max(...ys) * 1.05 || 1,
      markerX: clampS, xLabel: tr('slope', 'slope'), yLabel: lossName(v.loss),
    });
  }

  function table(pts) {
    const rows = Object.keys(LOSSES).map(kind => [tr(LOSSES[kind], LOSS_ID_SHORT[kind]), lineLoss(pts, kind, line.slope, line.intercept), best(kind).loss]);
    lab.extraEl.innerHTML = '';
    const t = document.createElement('table');
    t.innerHTML = `<thead><tr><th>Loss</th><th>${tr('Yours', 'Milikmu')}</th><th>${tr('Best', 'Terbaik')}</th></tr></thead>`;
    const body = document.createElement('tbody');
    for (const [name, mine, bestLoss] of rows) {
      const row = body.insertRow();
      row.insertCell().textContent = name;
      row.insertCell().textContent = num(mine);
      row.insertCell().textContent = num(bestLoss);
    }
    t.append(body);
    lab.extraEl.append(t);
  }

  // What the learner is looking at: where the points come from, and what was left out.
  function describeData() {
    if (loadState === 'loading') return tr('Loading the penguin data...', 'Memuat data penguin...');
    if (loadState === 'failed') return tr('The penguin data could not be loaded, so the lab shows generated data.', 'Data penguin tidak dapat dimuat, jadi lab menampilkan data buatan.');
    if (mode === 'penguins' && penguinInfo) {
      const { xRange, yRange, dropped, total } = penguinInfo;
      return tr(
        `Real data: penguin flipper length (${fmt(xRange.min)} to ${fmt(xRange.max)} mm) against body mass (${fmt(yRange.min)} to ${fmt(yRange.max)} g), each stretched to fit the plot (${fmt(0.5)} to ${fmt(9.5)}). ${fmt(dropped)} of ${fmt(total)} rows have a missing measurement (NA) and were left out. Only the ${fmt(SQUARES_WHEN_MANY)} biggest squares are drawn.`,
        `Data nyata: panjang sirip penguin (${fmt(xRange.min)} sampai ${fmt(xRange.max)} mm) terhadap massa tubuh (${fmt(yRange.min)} sampai ${fmt(yRange.max)} g), masing-masing diskalakan agar muat di plot (${fmt(0.5)} sampai ${fmt(9.5)}). ${fmt(dropped)} dari ${fmt(total)} baris tidak punya salah satu pengukuran (NA), jadi dibuang. Hanya ${fmt(SQUARES_WHEN_MANY)} persegi terbesar yang digambar.`,
      );
    }
    return tr(
      `Generated data: ${fmt(sets.generated.plain.length)} points around the line y = ${fmt(0.6)} x + ${fmt(1.5)} plus noise. The same points every time.`,
      `Data buatan: ${fmt(sets.generated.plain.length)} titik di sekitar garis y = ${fmt(0.6)} x + ${fmt(1.5)} ditambah noise. Titiknya sama setiap kali.`,
    );
  }

  // The point chosen with the keyboard (or a tap), described in words so it does not depend on the tip on the plot.
  function pickedText(pts, res) {
    if (picked < 0 || picked >= pts.length) return { en: '', id: '' };
    const r = res[picked], rank = xOrder(pts).indexOf(picked);
    return {
      en: ` Selected point ${fmt(rank + 1)} of ${fmt(pts.length)}: residual ${f2(r)}, squared ${f2(r * r)}, absolute ${f2(Math.abs(r))}.`,
      id: ` Titik terpilih ${fmt(rank + 1)} dari ${fmt(pts.length)}: residual ${f2(r)}, kuadrat ${f2(r * r)}, absolut ${f2(Math.abs(r))}.`,
    };
  }

  function draw() {
    const v = controls.values(), pts = points();
    drawPlot(v, pts);
    const res = residuals(pts, line.slope, line.intercept);
    const now = lossOf(v.loss, res), bestNow = best(v.loss);
    const worst = res.reduce((m, r, i) => (Math.abs(r) > Math.abs(res[m]) ? i : m), 0);
    const top = largestShare(costs(res, v.loss));
    lab.setStatus(`${lossName(v.loss)}: ${num(now)}. ${tr('At the best line', 'Di garis terbaik')}: ${num(bestNow.loss)}.`);
    const yours = `y = ${f2(line.slope)} x ${line.intercept < 0 ? '-' : '+'} ${f2(Math.abs(line.intercept))}`;
    const picked = pickedText(pts, res);
    lab.setDetail(tr(
      `Your line: ${yours}. Biggest miss: ${f2(Math.abs(res[worst]))}. Best line: slope ${f2(bestNow.slope)}, intercept ${f2(bestNow.intercept)}. One point carries ${pct(top.share, 0)} of the total ${v.loss === 'mse' ? 'squared' : 'absolute'} error.${picked.en}`,
      `Garismu: ${yours}. Selisih terbesar: ${f2(Math.abs(res[worst]))}. Garis terbaik: slope ${f2(bestNow.slope)}, intercept ${f2(bestNow.intercept)}. Satu titik menyumbang ${pct(top.share, 0)} dari total galat ${v.loss === 'mse' ? 'kuadrat' : 'absolut'}.${picked.id}`,
    ));
    lab.setMetrics(`MSE ${num(lossOf('mse', res))} · MAE ${num(lossOf('mae', res))} · ${fmt(pts.length)} ${tr('points', 'titik')}`);
    dataNote.textContent = describeData();
    lab.setLegend([
      { kind: 'dot', color: plot.g.t.ink, label: tr('Data points', 'Titik data') },
      ...(v.outlier ? [{ kind: 'dot', color: clusterColor(3), label: tr('Outlier', 'Outlier') }] : []),
      { kind: 'dot', color: plot.g.t.accent, label: tr('Your line', 'Garismu') },
      { kind: 'diamond', color: plot.g.t.accent, label: tr('Line handles (draggable)', 'Pegangan garis (bisa digeser)') },
      ...(v.residuals ? [{ kind: 'dot', color: clusterColor(1), label: tr('Residuals', 'Residual') }] : []),
      ...(v.residuals && v.loss === 'mse' ? [{ kind: 'dot', color: clusterColor(1), label: tr('Squared residual (area)', 'Residual kuadrat (luas)') }] : []),
    ]);
    drawCosts(v, pts);
    drawCurve(v, pts);
    table(pts);
  }

  // The plot alone (hover and keyboard focus change nothing else).
  // Point indices from left to right, the order the cost bars use and the keyboard steps through.
  const xOrder = pts => pts.map((_, i) => i).sort((a, b) => pts[a].x - pts[b].x);

  function redrawPlot() { drawPlot(controls.values(), points()); }

  const near = e => plot.nearest(e, handles, 18);
  lab.on(lab.canvas, 'pointerdown', e => {
    const i = near(e);
    if (i < 0) {
      const p = plot.nearest(e, points(), 14);
      if (p !== hover) { hover = p; redrawPlot(); }
      return;
    }
    drag = { idx: i, id: e.pointerId };
    lab.canvas.setPointerCapture(e.pointerId);
    lab.canvas.style.cursor = 'grabbing';
  });
  lab.on(lab.canvas, 'pointermove', e => {
    if (drag?.id === e.pointerId) { moveHandle(drag.idx, plot.toData(e)); return; }
    if (e.pointerType !== 'mouse') return;
    const onHandle = near(e) >= 0;
    lab.canvas.style.cursor = onHandle ? 'grab' : '';
    const p = onHandle ? -1 : plot.nearest(e, points(), 12);
    if (p !== hover) { hover = p; redrawPlot(); }
  });
  const endDrag = e => { if (drag?.id === e.pointerId) { drag = null; lab.canvas.style.cursor = ''; } };
  lab.on(lab.canvas, 'pointerup', endDrag);
  lab.on(lab.canvas, 'pointercancel', endDrag);
  lab.on(lab.canvas, 'pointerleave', e => { if (e.pointerType === 'mouse' && hover !== -1) { hover = -1; redrawPlot(); } });
  lab.on(lab.canvas, 'focus', () => { focused = true; redrawPlot(); });
  lab.on(lab.canvas, 'blur', () => { focused = false; if (picked >= 0) { picked = -1; draw(); } else redrawPlot(); });
  lab.on(lab.canvas, 'keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      side = e.key === 'ArrowLeft' ? 0 : 1;
      redrawPlot();
    } else if (e.key === 'PageDown' || e.key === 'PageUp' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const order = xOrder(points()), at = order.indexOf(picked);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? order.length - 1
        : e.key === 'PageDown' ? Math.min(order.length - 1, at + 1) : (at < 0 ? order.length - 1 : Math.max(0, at - 1));
      hover = -1; picked = order[next];
      draw();
    } else if (e.key === 'Escape' && picked >= 0) {
      e.preventDefault();
      picked = -1;
      draw();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = handles[0].x <= handles[1].x ? side : 1 - side, h = handles[idx];
      const step = (e.shiftKey ? 1 : 0.2) * (e.key === 'ArrowUp' ? 1 : -1);
      moveHandle(idx, { x: h.x, y: Math.max(0, Math.min(10, h.y + step)) });
    }
  });

  lab.onReset(() => {
    loadToken++;
    mode = 'generated'; loadState = 'idle'; hover = -1; picked = -1;
    controls.set('data', 'generated');
    setLine(START);
    controls.set('loss', 'mse'); controls.set('outlier', false); controls.set('residuals', true);
    box.reset();
    draw();
  });
  lab.onTheme(draw);
  lab.onResize(draw);
  draw();
  return lab.destroy;
}
