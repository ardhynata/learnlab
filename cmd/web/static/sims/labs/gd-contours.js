// Gradient descent on contour lines: pick a loss surface, set the learning rate (and an optional
// momentum), click to place the start, then step downhill and watch the path, the gradient arrow
// and the loss. The math lives in sims/ml/gd.js (surfaces, steps) and sims/ml/gdview.js (verdict,
// contour levels); this file only draws and wires.
import { createLab, createPlot, drawLineChart, clusterColor, tr, fmt } from '../kit/index.js';
import { surfaces2d, step2d, start2d } from '../ml/gd.js';
import { verdict, surfaceContours, twoValleysLimits, divergedAtOf, runFinished } from '../ml/gdview.js';

// Names of the surfaces, by key. Built when the lab is mounted (the language is known by then); a surface
// this table does not know falls back to the English name that sims/ml/gd.js carries.
const surfaceName = (key, s) => ({
  bowl: tr('Round bowl', 'Mangkuk bulat'),
  ravine: tr('Narrow ravine', 'Jurang sempit'),
  twoValleys: tr('Two valleys', 'Dua lembah'),
})[key] ?? s.name;
const DEFAULT_LR = { bowl: 0.25, ravine: 0.14, twoValleys: 0.1 };
const LOG_MIN = -2.5, LOG_MAX = 0.3; // learning rates from about 0.003 to 2
const MAX_STEPS = 500;
const ARROW_PX = 46;

// Things this lab knows about Two valleys that sims/ml/gd.js does not carry (that file is shared): its
// learning-rate limits (measured, see twoValleysLimits in sims/ml/gdview.js: 0.77 near a minimum, not the 0.25
// listed there, and lower ones for far-away starts); the deep minimum sits at x = 7.51; and the shallow minimum
// at x = 2.62 gets a mark.
const SURFACE_FACTS = { twoValleys: { ...twoValleysLimits, minimum: { x: 7.51, y: 5 }, shallow: { x: 2.62, y: 5 } } };
// A loss or gradient this large is shown as a word: the number would be a long row of digits.
const HUGE = 1e6;
const fmtBig = (v, digits) => (Number.isFinite(v) && Math.abs(v) < HUGE ? fmt(v, { digits }) : tr('huge', 'besar sekali'));

// The slider is logarithmic; the learning rate is rounded to two digits so the number shown is the number used.
const lrOf = logLr => Number((10 ** logLr).toPrecision(2));
const fmtLr = logLr => fmt(lrOf(logLr), { max: 4 }); // two significant digits, so up to 4 decimals (0.0032)
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// The part of the segment (x0, y0)-(x1, y1) inside the box [bx0, bx1] x [by0, by1] (Liang-Barsky), or null.
// A diverging run ends up thousands of plot widths away; drawing such a segment as it is stalls the canvas,
// and the label search walks along every segment, so both only ever see the part near the plot.
function clipSegment(x0, y0, x1, y1, bx0, by0, bx1, by1) {
  const dx = x1 - x0, dy = y1 - y0;
  let t0 = 0, t1 = 1;
  for (const [p, q] of [[-dx, x0 - bx0], [dx, bx1 - x0], [-dy, y0 - by0], [dy, by1 - y0]]) {
    if (p === 0) { if (q < 0) return null; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  return [x0 + t0 * dx, y0 + t0 * dy, x0 + t1 * dx, y0 + t1 * dy];
}

function describe(info, trace, atLimit) {
  switch (info.status) {
    case 'converged':
      return info.nearMinimum
        ? tr('Converged: the gradient is almost zero, so the steps have shrunk to nothing. The point sits at the lowest point.',
          'Konvergen: gradient-nya hampir nol, jadi langkahnya makin kecil sampai hampir tidak bergerak. Titiknya sudah di titik terendah.')
        : tr('Converged, but not at the lowest point: the gradient is almost zero here too, so descent stops in this shallow valley. It cannot see the deeper one.',
          'Konvergen, tetapi bukan di titik terendah. Gradient-nya hampir nol di sini juga, jadi gradient descent berhenti di lembah dangkal ini dan tidak "melihat" lembah yang lebih dalam.');
    case 'diverging':
      return tr('Diverging: the loss has grown far above where it started. Lower the learning rate.', 'Divergen: loss justru naik jauh di atas nilai awalnya. Turunkan learning rate.');
    case 'bouncing':
      return tr('Not settling: the steps hop from side to side without getting lower. Lower the learning rate a little.', 'Belum stabil: langkahnya bolak-balik dari sisi ke sisi dan loss tidak makin turun. Kecilkan sedikit learning rate-nya.');
    default: {
      const n = trace.length;
      if (atLimit) return tr(`Stopped after ${fmt(MAX_STEPS)} steps and still moving. A larger learning rate would get there sooner.`, `Berhenti setelah ${fmt(MAX_STEPS)} langkah dan masih terus bergerak. Learning rate yang lebih besar akan sampai lebih cepat.`);
      if (n < 2) return tr('Ready: the gradient is not small yet, so the walk has further to go. Press Run or Next step.', 'Siap: gradient-nya masih besar, jadi perjalanannya masih jauh. Tekan Jalankan atau Langkah berikutnya.');
      const now = trace[n - 1].loss, before = trace[n - 2].loss, tiny = 1e-9 * Math.max(1, Math.abs(before));
      if (now > before + tiny) return tr('Still moving: the gradient is not small yet. The loss went up on the last step.', 'Masih bergerak: gradient-nya masih besar. Loss naik di langkah terakhir.');
      if (now < before - tiny) return tr('Still moving: the loss fell on the last step and the gradient is not small yet.', 'Masih bergerak: loss turun di langkah terakhir, tetapi gradient-nya masih besar.');
      return tr('Still moving: the gradient is not small yet. The loss stayed the same on the last step.', 'Masih bergerak: gradient-nya masih besar. Loss tidak berubah di langkah terakhir.');
    }
  }
}

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Walking downhill on contour lines', 'Menuruni garis kontur'),
    hint: tr('Each line joins points with the same loss. Click or drag the plot to move the start (ring), then press Run or Next step.',
      'Tiap garis menghubungkan titik-titik yang loss-nya sama. Klik atau seret plot untuk memindahkan titik awal (cincin), lalu tekan Jalankan atau Langkah berikutnya.'),
    playback: true, status: true, legend: true,
    canvasLabel: tr('Contour plot of the loss with the path of gradient descent. Click or use the arrow keys to move the start point.',
      'Plot kontur loss beserta jalur gradient descent. Klik atau gunakan tombol panah untuk memindahkan titik awal.'),
    settingsTitle: tr('Settings', 'Pengaturan'),
  });
  const plot = createPlot(lab.canvas, { xLabel: tr('Parameter 1', 'Parameter 1'), yLabel: tr('Parameter 2', 'Parameter 2') });
  const chart = lab.chartCard(tr('Loss at each step', 'Loss di tiap langkah'),
    tr('With momentum 0 the loss should fall every step; a rise means the steps are too big. With momentum, waves are normal. Pink dots on the top edge mean the loss is off the chart.',
      'Jika momentum 0, loss seharusnya turun di setiap langkah; jika naik, berarti langkahnya terlalu besar. Dengan momentum, naik-turun seperti gelombang itu wajar. Titik pink di tepi atas berarti loss-nya di luar grafik.'), 220);
  const contourCache = {};
  let start = { ...surfaces2d.bowl.start };
  let drag = null;

  const controls = lab.panel([
    { name: 'surface', type: 'select', label: tr('Loss surface', 'Permukaan loss'), options: Object.entries(surfaces2d).map(([key, s]) => [key, surfaceName(key, s)]), value: 'bowl' },
    { name: 'logLr', type: 'range', label: tr('Learning rate', 'Learning rate'), min: LOG_MIN, max: LOG_MAX, step: 0.01, value: Math.log10(DEFAULT_LR.bowl), format: fmtLr },
    { type: 'note', text: '' },
    { name: 'momentum', type: 'range', label: tr('Momentum (optional extra)', 'Momentum (opsional)'), min: 0, max: 0.95, step: 0.05, value: 0, format: v => fmt(v, { digits: 2 }) },
    { type: 'note', text: tr('Momentum keeps a share of the last step, like a heavy ball rolling downhill. At 0 this is plain gradient descent.', 'Momentum membawa sebagian langkah sebelumnya, seperti bola berat yang menggelinding turun bukit. Di 0, ini gradient descent biasa.') },
    { type: 'note', text: tr('Changing any setting puts the walk back at step 0; press Run again. Arrow keys also move the start when the plot is focused.', 'Mengubah pengaturan apa pun akan mengembalikan ke langkah 0, jadi tekan Jalankan lagi. Saat plot terpilih, tombol panah juga dapat menggeser titik awal.') },
  ], onChange);
  const lrNote = controls.el.querySelectorAll('p.hint')[0];

  const surface = () => surfaces2d[controls.get('surface')];
  const options = () => ({ lr: lrOf(controls.get('logLr')), momentum: controls.get('momentum') });
  const contoursOf = key => (contourCache[key] ??= surfaceContours(surfaces2d[key]));

  function note() {
    const key = controls.get('surface'), facts = SURFACE_FACTS[key];
    lrNote.textContent = facts
      ? tr(`Near the two valleys, learning rates below about ${fmt(facts.nearLr, { digits: 2 })} settle (with momentum 0). From far-away starts the limits are lower: above about ${fmt(facts.hopLr, { digits: 1 })} the walk can hop to the other valley, and above about ${fmt(facts.blowLr, { digits: 1 })} it can blow up.`,
        `Di dekat kedua lembah, learning rate di bawah ${fmt(facts.nearLr, { digits: 2 })} masih stabil (momentum 0). Jika mulai dari titik yang jauh, batasnya lebih kecil: di atas sekitar ${fmt(facts.hopLr, { digits: 1 })} jalurnya dapat melompat ke lembah lainnya, dan di atas sekitar ${fmt(facts.blowLr, { digits: 1 })} jalurnya dapat meledak.`)
      : tr(`Learning rates below about ${fmt(surface().maxStableLr, { digits: 2 })} converge on this surface, with momentum 0. At or above it the steps overshoot more than they correct.`,
        `Learning rate di bawah ${fmt(surface().maxStableLr, { digits: 2 })} akan konvergen di permukaan ini (momentum 0). Di angka itu atau lebih, langkahnya melampaui target lebih jauh daripada koreksinya.`);
  }

  function fresh() {
    const cur = start2d(surface(), start);
    const trace = [cur];
    return { ...cur, trace, info: verdict(surface(), trace), divergedAt: null };
  }

  // Plot labels stay inside the plot square and avoid each other and the markers. A label tries its preferred
  // spot first, then the other side of its point, above, and below; it has an outline in the plot color so a
  // path or contour line crossing it does not hide the text. `placed` is reset on every draw.
  let placed = [];
  // Line pieces (path, gradient arrow, step arrow) a label should keep clear of when it can: [x0, y0, x1, y1] in pixels.
  let lines = [];
  const hitsLine = b => lines.some(([x0, y0, x1, y1]) => {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3));
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
      if (x >= b.x0 - 2 && x <= b.x1 + 2 && y >= b.y0 - 2 && y <= b.y1 + 2) return true;
    }
    return false;
  });
  const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  function mark(x, y, r) { const X = plot.px(x), Y = plot.py(y); placed.push({ x0: X - r, x1: X + r, y0: Y - r, y1: Y + r }); }
  function label(x, y, text, { dx, dy, color, center = false }) {
    const ctx = plot.ctx, g = plot.g;
    ctx.save();
    ctx.font = '600 12px system-ui, sans-serif';
    const w = ctx.measureText(text).width, X = plot.px(x), Y = plot.py(y);
    const box = (ox, oy, align) => {
      const x0 = align === 'center' ? X + ox - w / 2 : align === 'right' ? X + ox - w : X + ox;
      return { x0, x1: x0 + w, y0: Y + oy - 11, y1: Y + oy + 3, ox, oy, align };
    };
    const above = -Math.abs(dy) + 8, below = Math.abs(dy) + 8;
    const cx = clamp(X, plot.px(0) + w / 2 + 3, plot.px(10) - w / 2 - 3) - X;
    const spots = center
      ? [box(cx, dy, 'center'), box(cx, above, 'center'), box(cx, below, 'center')]
      : [box(dx, dy, 'left'), box(-dx, dy, 'right'), box(-dx, above, 'right'), box(dx, above, 'left'), box(-dx, below, 'right'), box(dx, below, 'left'), box(cx, above, 'center'), box(cx, below, 'center')];
    const inside = b => b.x0 >= plot.px(0) + 2 && b.x1 <= plot.px(10) - 2 && b.y0 >= plot.py(10) + 2 && b.y1 <= plot.py(0) - 2;
    const clear = b => inside(b) && !placed.some(p => overlaps(b, p));
    const spot = spots.find(b => clear(b) && !hitsLine(b)) ?? spots.find(clear) ?? spots.find(inside) ?? spots[0];
    placed.push(spot);
    ctx.textAlign = spot.align;
    ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = g.t.plot;
    ctx.strokeText(text, X + spot.ox, Y + spot.oy);
    ctx.fillStyle = color;
    ctx.fillText(text, X + spot.ox, Y + spot.oy);
    ctx.restore();
  }

  function arrow(ctx, x0, y0, x1, y1, color, width) {
    const a = Math.atan2(y1 - y0, x1 - x0), head = 9;
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - head * Math.cos(a - 0.45), y1 - head * Math.sin(a - 0.45));
    ctx.lineTo(x1 - head * Math.cos(a + 0.45), y1 - head * Math.sin(a + 0.45));
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawPlot(state) {
    const key = controls.get('surface'), s = surfaces2d[key], { lr, momentum } = options();
    const g = plot.begin(), ctx = plot.ctx, c0 = clusterColor(0), c1 = clusterColor(1), c2 = clusterColor(2);
    lines = [];
    plot.clip(() => {
      // Contour lines, all in one path.
      ctx.save();
      ctx.strokeStyle = g.t.muted; ctx.globalAlpha = 0.55; ctx.lineWidth = 1;
      ctx.beginPath();
      for (const { segments } of contoursOf(key).sets) for (const [a, b] of segments) { ctx.moveTo(plot.px(a.x), plot.py(a.y)); ctx.lineTo(plot.px(b.x), plot.py(b.y)); }
      ctx.stroke();
      ctx.restore();
      // Path so far.
      const pts = state.trace;
      // Only the part of each step within one plot size of the plot square is drawn (see clipSegment).
      const bx0 = plot.px(0) - g.size, bx1 = plot.px(10) + g.size, by0 = plot.py(10) - g.size, by1 = plot.py(0) + g.size;
      ctx.save();
      ctx.beginPath(); ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = c0;
      for (let i = 1; i < pts.length; i++) {
        const seg = clipSegment(plot.px(pts[i - 1].x), plot.py(pts[i - 1].y), plot.px(pts[i].x), plot.py(pts[i].y), bx0, by0, bx1, by1);
        if (!seg) continue;
        ctx.moveTo(seg[0], seg[1]); ctx.lineTo(seg[2], seg[3]);
        lines.push(seg);
      }
      ctx.stroke();
      ctx.restore();
      pts.forEach((p, i) => { if (i < pts.length - 1 && p.x > -5 && p.x < 15 && p.y > -5 && p.y < 15) plot.dot(p.x, p.y, c0, 3.2); });
      // Gradient (uphill) and the step it produces (downhill, true length).
      const gr = s.grad(state.x, state.y), gl = Math.hypot(gr.x, gr.y);
      if (gl > 0.02 && Number.isFinite(gl)) {
        const X = plot.px(state.x), Y = plot.py(state.y);
        arrow(ctx, X, Y, X + ARROW_PX * gr.x / gl, Y - ARROW_PX * gr.y / gl, c1, 3);
        lines.push([X, Y, X + ARROW_PX * gr.x / gl, Y - ARROW_PX * gr.y / gl]);
        const dx = momentum * state.vx - lr * gr.x, dy = momentum * state.vy - lr * gr.y;
        const px = dx * g.size / 10, py = -dy * g.size / 10;
        if (Math.hypot(px, py) >= 4) {
          arrow(ctx, X, Y, X + clamp(px, -600, 600), Y + clamp(py, -600, 600), c2, 3);
          lines.push([X, Y, X + clamp(px, -600, 600), Y + clamp(py, -600, 600)]);
        }
      }
      if (Math.abs(state.x - 5) < 10 && Math.abs(state.y - 5) < 10) { // off the plot there is nothing to mark
        plot.ring(state.x, state.y, g.t.ink, 8, 2);
        plot.dot(state.x, state.y, c0, 5.5);
      }
    });
    const facts = SURFACE_FACTS[key], low = facts?.minimum ?? s.minimum;
    placed = [];
    mark(start.x, start.y, 13); mark(low.x, low.y, 10); mark(state.x, state.y, 9);
    if (facts?.shallow) {
      mark(facts.shallow.x, facts.shallow.y, 8);
      plot.ring(facts.shallow.x, facts.shallow.y, g.t.muted, 6, 2);
    }
    plot.diamond(low.x, low.y, g.t.ink, 8);
    plot.ring(start.x, start.y, g.t.ink, 11, 2);
    label(start.x, start.y, tr('start', 'awal'), { dx: 14, dy: -10, color: g.t.ink });
    label(low.x, low.y, tr('lowest point', 'titik terendah'), { dx: 12, dy: 18, color: g.t.ink });
    if (facts?.shallow) label(facts.shallow.x, facts.shallow.y, tr('shallow valley', 'lembah dangkal'), { dx: 0, dy: -14, color: g.t.muted, center: true });
    lab.setLegend([
      { kind: 'dot', color: c0, label: tr('Path so far', 'Jalur sejauh ini') },
      { kind: 'dot', color: c1, label: tr('Gradient (points uphill)', 'Gradient (arah naik)') },
      { kind: 'dot', color: c2, label: tr('Next step (downhill)', 'Langkah berikutnya (turun)') },
      { kind: 'diamond', label: tr('Lowest point', 'Titik terendah') },
    ]);
  }

  function drawChart(state) {
    const losses = state.trace.map(p => p.loss), first = losses[0];
    const yMax = Math.max(first, 1e-3) * 1.08 + 0.02, yMin = Math.min(0, ...losses.filter(l => l <= yMax));
    // Losses above the top of the chart are not drawn at their height. Each stretch of visible losses is its
    // own line that runs up to the top edge, and the steps that went off the chart get a pink dot on that edge.
    const runs = [], off = [];
    let cur = null;
    losses.forEach((l, i) => {
      if (l <= yMax) {
        if (!cur) { cur = { xs: [], ys: [] }; runs.push(cur); if (i > 0) { cur.xs.push(i - 1); cur.ys.push(yMax); } }
        cur.xs.push(i); cur.ys.push(l);
      } else {
        if (cur) { cur.xs.push(i); cur.ys.push(yMax); cur = null; }
        off.push(i);
      }
    });
    const series = runs.map(r => ({ ...r, color: clusterColor(0), points: losses.length <= 40 }));
    // One series per dot: a lone point draws no line, and only the first carries the legend label.
    off.forEach((x, i) => series.push({ xs: [x], ys: [yMax], color: clusterColor(1), points: true, label: i === 0 ? tr('off the chart', 'di luar grafik') : undefined }));
    drawLineChart(chart, { series, xLabel: tr('Step', 'Langkah'), yLabel: 'Loss', xMin: 0, xMax: Math.max(10, state.t), yMin, yMax, integerX: true });
  }

  function render(state) {
    drawPlot(state);
    drawChart(state);
    const { lr, momentum } = options(), info = state.info, atLimit = state.t >= MAX_STEPS;
    const label = {
      converged: tr('converged', 'konvergen'), descending: tr('still moving', 'masih bergerak'),
      diverging: tr('diverging', 'divergen'), bouncing: tr('not settling', 'belum stabil'),
    }[info.status];
    const gradSize = fmtBig(info.gradSize, 3);
    lab.setStatus(tr(
      `Step ${fmt(state.t)} · loss ${fmtBig(state.loss, 3)} · gradient size ${gradSize} · ${label}`,
      `Langkah ${fmt(state.t)} · loss ${fmtBig(state.loss, 3)} · ukuran gradient ${gradSize} · ${label}`));
    lab.setDetail(describe(info, state.trace, atLimit));
    lab.setMetrics(`${tr('Learning rate', 'Learning rate')} ${fmt(lr, { max: 4 })}${momentum ? ` · momentum ${fmt(momentum, { digits: 2 })}` : ''}`);
  }

  const stepper = lab.stepper({
    init: fresh,
    step: state => {
      const cur = step2d(surface(), state, options());
      const trace = [...state.trace, cur], info = verdict(surface(), trace);
      return { ...cur, trace, info, divergedAt: divergedAtOf(state.divergedAt, info, cur.t) };
    },
    // A diverging run goes on for a few more steps (see DIVERGE_EXTRA_STEPS) so the blow-up shows.
    isDone: state => runFinished(state, MAX_STEPS),
    render,
    delay: () => 450,
  });

  const restart = () => stepper.set(fresh());

  // Keep the status box one height whichever message it shows, so the plot does not jump down by a line when
  // a longer message appears: measure the longest messages at the current width and reserve that height.
  const detailEl = lab.ref('detail');
  const LONGEST = [
    describe({ status: 'converged', nearMinimum: false }, [], false),
    describe({ status: 'descending' }, [{ loss: 1 }, { loss: 2 }], true),
    describe({ status: 'descending' }, [{ loss: 1 }, { loss: 2 }], false),
  ];
  function reserveDetail() {
    if (!detailEl) return;
    const keep = detailEl.textContent;
    detailEl.style.minHeight = '';
    let tallest = 0;
    for (const text of LONGEST) { detailEl.textContent = text; tallest = Math.max(tallest, detailEl.offsetHeight); }
    detailEl.textContent = keep;
    detailEl.style.minHeight = `${tallest}px`;
  }
  // The speed control belongs to the kit's playback bar; Reset puts it back to the value it had at mount.
  const speedBox = lab.ref('speedValue'), speedDefault = speedBox?.value;

  function setDefaults(key) {
    start = { ...surfaces2d[key].start };
    controls.set('logLr', Math.log10(DEFAULT_LR[key]));
    controls.set('momentum', 0);
  }

  function onChange(name) {
    if (name === 'surface') setDefaults(controls.get('surface'));
    note();
    restart();
  }

  function moveStart(p) {
    start = { x: clamp(p.x, 0, 10), y: clamp(p.y, 0, 10) };
    restart();
  }

  // A press beside the plot square would clamp to the nearest edge and move the start there, so only a press
  // inside the square starts a drag (a drag that began inside may leave it and stays clamped).
  const insidePlot = e => {
    const g = plot.g;
    if (!g) return false;
    const r = lab.canvas.getBoundingClientRect(), fx = e.clientX - r.left - g.px(0), fy = e.clientY - r.top - 12;
    return fx >= 0 && fx <= g.size && fy >= 0 && fy <= g.size;
  };
  lab.on(lab.canvas, 'pointerdown', e => {
    if (!insidePlot(e)) return;
    drag = e.pointerId;
    lab.canvas.setPointerCapture(e.pointerId);
    moveStart(plot.toData(e));
  });
  lab.on(lab.canvas, 'pointermove', e => { if (drag === e.pointerId) moveStart(plot.toData(e)); });
  lab.on(lab.canvas, 'pointerup', () => { drag = null; });
  lab.on(lab.canvas, 'pointercancel', () => { drag = null; });
  lab.on(lab.canvas, 'keydown', e => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!d) return;
    e.preventDefault();
    const amount = e.shiftKey ? 1 : 0.25;
    moveStart({ x: start.x + d[0] * amount, y: start.y + d[1] * amount });
  });

  // The stepper registered its own Reset; this one also restores the controls.
  lab.onReset(() => {
    controls.set('surface', 'bowl'); setDefaults('bowl'); note();
    if (speedBox && speedDefault) { speedBox.value = speedDefault; speedBox.dispatchEvent(new Event('change')); }
    restart();
  });
  lab.onTheme(() => stepper.paint());
  lab.onResize(() => { reserveDetail(); stepper.paint(); });
  note();
  reserveDetail();
  return lab.destroy;
}
