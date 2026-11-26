// Learning-rate lab: roll a point down a 1-D loss curve with gradient descent. Change the learning
// rate and momentum, pick a start, and read the diagnosis of the run. The math lives in
// ml/gd.js (the update rule) and ml/lrdiagnose.js (traces, diagnosis, presets, the slider scale).
import { createLab, createPlot, drawLineChart, clusterColor, tr, fmt, locale } from '../kit/index.js';
import { functions1d } from '../ml/gd.js';
import { runTrace, diagnose, globalMinimum, lossAxis, cutAtLossFloor, LOSS_FLOOR, LOG_AUTO_LOSS, lrFromPos, posFromLr, LR_POSITIONS, presets } from '../ml/lrdiagnose.js';

// Learner-facing words are built when they are drawn (a function, not a constant), so a language change shows.
const verdictName = verdict => ({
  start: tr('Ready', 'Siap'),
  converging: tr('Converging', 'Konvergen'),
  slow: tr('Too slow', 'Terlalu lambat'),
  oscillating: tr('Oscillating', 'Berosilasi'),
  diverging: tr('Diverging', 'Divergen'),
  stuck: tr('Stuck in a local dip', 'Terjebak di local minimum'),
})[verdict];
const presetLabels = () => [['tooSmall', tr('Too small', 'Terlalu kecil')], ['justRight', tr('Just right', 'Pas')], ['tooBig', tr('Too big', 'Terlalu besar')], ['overshooting', tr('Overshooting', 'Kebablasan')]];
// The curve names come from ml/gd.js (English only); the key picks the Indonesian name.
const curveName = (key, english) => tr(english, { parabola: 'Parabola', steep: 'Parabola curam', wiggly: 'Dua lembah' }[key]);
const DEFAULTS = { fn: 'parabola', lr: 0.5, momentum: 0, start: 1, steps: 30 };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const px1 = v => clamp(v, -1e5, 1e5); // keep canvas coordinates sane when a run explodes

// A readout number: three significant digits, no thousands separators, and the decimal comma in Indonesian.
const show = (v, d = 3) => {
  const text = v !== 0 && (Math.abs(v) >= 1e5 || Math.abs(v) < 1e-3) ? v.toExponential(1) : String(Number(v.toPrecision(d)));
  return locale() === 'id' ? text.replace('.', ',') : text;
};

// ml/lrdiagnose.js writes each diagnosis reason in English, numbers included (with a dot). In Indonesian the
// lab rewrites the known sentences here; a sentence it does not recognise stays in English rather than breaking.
const dec = text => text.replace('.', ',');
const NUM = '(-?[\\d.]+(?:e[+-]?\\d+)?)';
const reasonRule = (pattern, build) => [new RegExp(`^${pattern}$`), build];
const REASONS_ID = [
  reasonRule('Take a few more steps: at least three are needed to read the pattern of the loss\\.',
    () => 'Jalankan beberapa langkah lagi dulu; butuh minimal tiga langkah supaya pola loss terlihat.'),
  reasonRule(`The loss has (?:(exploded)|grown from ${NUM} to ${NUM}) instead of falling: each step overshoots the minimum by more than the last, so the learning rate is too big\\.`,
    (exploded, from, to) => `Loss ${exploded ? 'meledak' : `naik dari ${dec(from)} ke ${dec(to)}`} bukannya turun: tiap langkah melewati minimum lebih jauh dari langkah sebelumnya, jadi learning rate-nya terlalu besar.`),
  reasonRule('It jumps from one side of the minimum to the other on almost every step\\. Each swing is about (\\d+)% smaller than the last, so it will settle, but slowly and wastefully\\.',
    percent => `Titik bolak-balik melompati minimum di hampir setiap langkah. Tiap ayunan sekitar ${fmt(Number(percent))}% lebih kecil dari sebelumnya, jadi akhirnya titik akan menetap, tetapi lambat dan boros.`),
  reasonRule('It jumps from one side of the minimum to the other and the swings are not getting smaller, so it bounces back and forth without settling\\.',
    () => 'Titik bolak-balik melompati minimum dan ayunannya tidak mengecil, jadi ia terus memantul tanpa pernah menetap.'),
  reasonRule('The loss rises on (\\d+) of the last (\\d+) steps instead of falling steadily: the point keeps overshooting the bottom and swinging back\\. A smaller learning rate or less momentum calms this\\.',
    (rises, of) => `Loss naik di ${fmt(Number(rises))} dari ${fmt(Number(of))} langkah terakhir, bukannya turun mulus: titik terus kebablasan melewati dasar lalu terpental balik. Learning rate atau momentum yang lebih kecil akan meredamnya.`),
  reasonRule(`It is at the bottom of the curve \\(x = ${NUM}, loss ${NUM}\\) and (?:(only wobbling a little around it)|is settling there)\\.`,
    (x, loss, wobbling) => `Titik sudah ada di dasar kurva (x = ${dec(x)}, loss ${dec(loss)}) dan ${wobbling ? 'hanya bergoyang sedikit di sekitarnya' : 'sedang menetap di sana'}.`),
  reasonRule(`It has settled at x = ${NUM}, the lowest point of the curve \\(loss ${NUM}\\)\\.`,
    (x, loss) => `Titik sudah menetap di x = ${dec(x)}, titik terendah kurva (loss ${dec(loss)}).`),
  reasonRule(`It has stopped at x = ${NUM}, where the loss is ${NUM}, but the lowest point of this curve is at x = ${NUM} with loss ${NUM}\\. With a modest rate descent only goes downhill, so it cannot climb out of this dip\\.`,
    (x, loss, bestX, bestLoss) => `Titik berhenti di x = ${dec(x)} dengan loss ${dec(loss)}, padahal titik terendah kurva ini ada di x = ${dec(bestX)} dengan loss ${dec(bestLoss)}. Dengan learning rate sedang, gradient descent hanya bisa menuruni lereng, jadi titik tidak bisa memanjat keluar dari lembah ini.`),
  reasonRule(`The loss is falling, but only from ${NUM} to ${NUM} so far: the steps are tiny and not getting smaller\\. The learning rate may be too small for the number of steps you gave it\\.`,
    (from, to) => `Loss memang turun, tetapi baru dari ${dec(from)} ke ${dec(to)}: langkahnya kecil sekali dan tidak ikut mengecil. Mungkin learning rate-nya terlalu kecil untuk jumlah langkah yang kamu gunakan.`),
  reasonRule(`After (\\d+) steps the loss is no lower than where it started \\(${NUM}\\)\\. It is wandering rather than descending\\.`,
    (n, first) => `Setelah ${fmt(Number(n))} langkah, loss belum lebih rendah dari titik awal (${dec(first)}). Titik hanya berkeliaran, tidak menurun.`),
  reasonRule(`The loss has fallen from ${NUM} to ${NUM} \\((\\d+)% lower\\) and the steps are shrinking as it nears the bottom\\.`,
    (from, to, percent) => `Loss turun dari ${dec(from)} ke ${dec(to)} (${fmt(Number(percent))}% lebih rendah) dan langkahnya makin kecil seiring mendekati dasar.`),
];
export function localizeReason(reason) {
  if (locale() !== 'id') return reason;
  for (const [pattern, build] of REASONS_ID) {
    const m = pattern.exec(reason);
    if (m) return build(...m.slice(1));
  }
  return reason;
}

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Rolling down a loss curve', 'Menggelinding turun di kurva loss'),
    hint: tr('The curve is the loss f(x) at every position x; its real values are on the left axis. Each arrow is one step of gradient descent. Click or drag in the plot to move the start.',
      'Kurva ini adalah loss f(x) untuk tiap posisi x (nilai aslinya ada di sumbu kiri). Tiap panah = satu langkah gradient descent. Klik atau seret di plot untuk memindahkan titik awal.'),
    playback: true, status: true, legend: true,
    canvasLabel: tr('Loss curve with the path of gradient descent. Arrow keys move the start position.',
      'Kurva loss beserta jalur gradient descent. Tombol panah menggeser posisi awal.'),
  });
  const plot = createPlot(lab.canvas, { xLabel: tr('x (position)', 'x (posisi)'), yLabel: '' });
  const chartCanvas = lab.chartCard(tr('Loss against step', 'Loss per langkah'),
    tr('The same run, step by step. The dashed line is the whole planned run; the solid line is what has happened so far.',
      'Proses yang sama, langkah demi langkah. Garis putus-putus adalah rencana lengkapnya; garis penuh adalah yang sudah berjalan sejauh ini.'), 240);

  let planned = [];
  let longRun = null; // the same settings run for 400 steps: tells whether a slow-looking run ends in a trap
  let stepper = null;
  const redraw = () => stepper?.paint();

  // "Too big" (not "Overshooting", which only oscillates) is the preset whose loss really passes LOG_AUTO_LOSS.
  const divergingName = presetLabels().find(([key]) => key === 'tooBig')[1];
  const controls = lab.panel([
    { name: 'fn', type: 'select', label: tr('Loss curve', 'Kurva loss'), options: Object.entries(functions1d).map(([k, f]) => [k, curveName(k, f.name)]), value: DEFAULTS.fn },
    { name: 'lr', type: 'range', label: tr('Learning rate (log scale)', 'Learning rate (skala log)'), min: 0, max: LR_POSITIONS, step: 1, value: posFromLr(DEFAULTS.lr), format: p => fmt(lrFromPos(p), { max: 4 }) },
    { name: 'momentum', type: 'range', label: tr('Momentum', 'Momentum'), min: 0, max: 0.95, step: 0.05, value: DEFAULTS.momentum, format: v => fmt(v, { digits: 2 }) },
    { name: 'start', type: 'range', label: tr('Start position', 'Posisi awal'), min: 0, max: 10, step: 0.1, value: DEFAULTS.start, format: v => fmt(v, { digits: 1 }) },
    { name: 'steps', type: 'number', label: tr('Steps', 'Langkah'), min: 10, max: 200, step: 1, value: DEFAULTS.steps },
    // `group` on the first button gives the row a visible caption and a labelled role="group".
    ...presetLabels().map(([key, label], i) => ({ name: `preset-${key}`, type: 'button', label, ...(i === 0 ? { group: tr('Presets', 'Contoh pengaturan') } : {}), onClick: () => applyPreset(key) })),
    { name: 'preview', type: 'toggle', label: tr('Show the planned run', 'Tampilkan jalur rencana'), value: true },
    { name: 'log', type: 'toggle', label: tr('Log scale on the loss chart', 'Grafik loss menggunakan skala log'), value: false },
    { type: 'note', text: tr(`It switches on by itself once the loss grows past ${fmt(LOG_AUTO_LOSS)}: try the "${divergingName}" preset. Tick it to read a loss that shrinks toward zero on a log axis too.`,
      `Skala log aktif sendiri begitu loss melewati ${fmt(LOG_AUTO_LOSS)}: coba contoh "${divergingName}". Centang untuk membaca loss yang mengecil menuju nol dengan sumbu log juga.`) },
    { type: 'note', text: tr(`The learning rate runs from ${fmt(0.001)} to ${fmt(2.5)}, each slider step multiplying it by the same factor. Changing the curve picks its "Just right" rate.`,
      `Learning rate berkisar dari ${fmt(0.001)} sampai ${fmt(2.5)}; tiap geseran slider mengalikannya dengan faktor yang sama. Jika kamu mengganti kurva, learning rate otomatis berpindah ke nilai "Pas" untuk kurva itu.`) },
  ], name => {
    if (name === 'preview' || name === 'log') { redraw(); return; }
    if (name === 'fn') {
      const key = controls.get('fn');
      controls.set('start', functions1d[key].start);
      setRates(presets[key].justRight);
    }
    stepper.reset();
  });

  // The hint under the log checkbox is the checkbox's description for assistive tech too.
  const logToggle = controls.el.querySelectorAll('label.toggle')[1]; // the second toggle is the log one
  const logHint = logToggle?.nextElementSibling;
  if (logHint?.classList.contains('hint')) {
    logHint.id = `lr-log-hint-${Math.random().toString(36).slice(2, 8)}`;
    logToggle.querySelector('input').setAttribute('aria-describedby', logHint.id);
  }

  const current = () => {
    const v = controls.values();
    return { key: v.fn, fn: functions1d[v.fn], lr: lrFromPos(v.lr), momentum: v.momentum, start: v.start, steps: v.steps, preview: v.preview, log: v.log };
  };
  function setRates({ lr, momentum }) { controls.set('lr', posFromLr(lr)); controls.set('momentum', momentum); }
  function applyPreset(key) { setRates(presets[current().key][key]); stepper.reset(); }

  // The whole run is computed up front, so the preview, the chart axes and Previous step all agree.
  const plan = () => {
    const c = current();
    planned = runTrace(c.fn, { lr: c.lr, momentum: c.momentum }, c.steps, c.start);
    longRun = diagnose(runTrace(c.fn, { lr: c.lr, momentum: c.momentum }, 400, c.start), c.fn);
    return { trace: [planned[0]] };
  };
  stepper = lab.stepper({
    init: plan,
    step: s => ({ trace: planned.slice(0, s.trace.length + 1) }),
    isDone: s => s.trace.length >= planned.length,
    render: s => render(s.trace),
    delay: () => 450,
  });

  function arrow(ctx, [x1, y1], [x2, y2], color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(px1(x1), px1(y1)); ctx.lineTo(px1(x2), px1(y2)); ctx.stroke();
    if (Math.hypot(x2 - x1, y2 - y1) > 12) {
      const a = Math.atan2(y2 - y1, x2 - x1), h = 7;
      ctx.beginPath(); ctx.moveTo(px1(x2), px1(y2));
      ctx.lineTo(px1(x2 - h * Math.cos(a - 0.45)), px1(y2 - h * Math.sin(a - 0.45)));
      ctx.lineTo(px1(x2 - h * Math.cos(a + 0.45)), px1(y2 - h * Math.sin(a + 0.45)));
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function render(trace) {
    const c = current(), fn = c.fn;
    const axis = lossAxis(fn), S = 10 / axis.top;
    const cur = trace.at(-1), n = trace.length - 1;
    const g = plot.begin();
    const ctx = plot.ctx;

    // Replace the generic 0..10 vertical ticks with the real loss values, aligned with the grid.
    ctx.clearRect(0, g.py(10) - 8, g.px(0) - 1, g.size + 16);
    ctx.fillStyle = g.t.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) ctx.fillText(fmt(i * axis.step), g.px(0) - 7, g.py(i * 2) + 4);
    ctx.save(); ctx.translate(g.px(0) - 27, g.py(5)); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText(tr('loss f(x)', 'loss f(x)'), 0, 0); ctx.restore();

    const P = s => [g.px(s.x), g.py(fn.f(s.x) * S)];
    const best = globalMinimum(fn);
    plot.clip(() => {
      const curve = Array.from({ length: 201 }, (_, i) => ({ x: i / 20, y: fn.f(i / 20) * S }));
      plot.polyline(curve, { color: g.t.ink, width: 2.6 });

      if (c.preview) {
        planned.slice(n).forEach((s, i, rest) => { if (i) arrow(ctx, P(rest[i - 1]), P(s), g.t.muted, 0.35); });
        planned.slice(n + 1).forEach(s => plot.ring(s.x, fn.f(s.x) * S, g.t.muted, 3.2, 1.2));
      }
      for (let i = 1; i <= n; i++) arrow(ctx, P(trace[i - 1]), P(trace[i]), g.t.accent, n - i < 12 ? 1 : 0.45);
      trace.forEach((s, i) => plot.dot(s.x, fn.f(s.x) * S, i === 0 ? clusterColor(2) : g.t.accent, i === 0 ? 5.5 : 3.8));
    });

    plot.ring(best.x, best.loss * S, clusterColor(2), 9, 2);
    // Near the x axis the label would crowd the tick numbers, so it goes above the ring instead of below.
    plot.label(best.x, best.loss * S, tr('lowest', 'terendah'), { dx: 0, dy: best.loss * S < 1 ? -16 : 22, align: 'center', color: clusterColor(2), size: 11 });
    // The label goes to the right of the point near the left axis, so it never runs into the tick numbers.
    const labelRight = trace[0].x > 5 || trace[0].x < 2;
    plot.label(trace[0].x, fn.f(trace[0].x) * S, tr('start', 'awal'), { dx: labelRight ? 10 : -10, dy: -10, align: labelRight ? 'left' : 'right', size: 11 });

    const y = fn.f(cur.x) * S, off = cur.x < 0 || cur.x > 10 || y > 10;
    if (off) {
      // Drawn a little inside the axes so the ring does not cover the tick numbers.
      const ox = clamp(cur.x, 0.4, 9.6), oy = clamp(y, 0.4, 9.6);
      plot.ring(ox, oy, clusterColor(1), 8, 2.5);
      plot.label(ox, oy, tr('off the plot', 'di luar plot'), { dx: cur.x > 5 ? -12 : 12, dy: 18, align: cur.x > 5 ? 'right' : 'left', color: clusterColor(1) });
    } else {
      plot.diamond(cur.x, y, clusterColor(1), 8);
    }

    // The diagnosis: of the steps taken so far, or (before three steps) a prediction from the planned run.
    // A run that is still moving can already be heading into a trap; say so.
    const lower = text => text.replace(/^./, ch => ch.toLowerCase());
    const read = (t, predicting) => {
      const d = diagnose(t, fn);
      if ((d.verdict !== 'converging' && d.verdict !== 'slow') || longRun.verdict !== 'stuck') return { verdict: d.verdict, reason: localizeReason(d.reason) };
      const tiny = t.length > 1 && Math.abs(t.at(-1).x - t.at(-2).x) < 0.01;
      const heading = predicting
        ? tr(`it is ${tiny ? 'almost stopped' : 'still moving'}, heading into a dip that is not the lowest point.`,
          `titik ${tiny ? 'hampir berhenti' : 'masih bergerak'}, tetapi arahnya ke lembah yang bukan titik terendah.`)
        : tr(`${tiny ? 'Almost stopped' : 'Still moving'}, and it is heading into a dip that is not the lowest point.`,
          `${tiny ? 'Hampir berhenti' : 'Masih bergerak'}, tetapi arahnya ke lembah yang bukan titik terendah.`);
      return { verdict: 'stuck', reason: `${heading} ${tr('Given enough steps:', 'Jika langkahnya cukup banyak:')} ${lower(localizeReason(longRun.reason))}` };
    };
    // Before three steps the diagnosis describes where the planned run ends, not where the point is now.
    const predicted = text => tr(
      `At the end of the planned run (step ${fmt(planned.length - 1)}): ${lower(text.replace(/^After \d+ steps,? /, ''))}`,
      `Di akhir jalur rencana (langkah ${fmt(planned.length - 1)}): ${lower(text.replace(/^Setelah \d+ langkah,? /, ''))}`);
    const plannedDiag = read(planned, true);
    const live = n >= 3 ? read(trace, false) : null;
    if (live) { lab.setStatus(`${tr('Diagnosis', 'Diagnosis')}: ${verdictName(live.verdict)}`); lab.setDetail(live.reason); }
    else if (plannedDiag.verdict !== 'start') {
      const verdict = verdictName(plannedDiag.verdict).toLowerCase();
      lab.setStatus(n === 0
        ? tr(`Ready. If you run this setting: ${verdict}`, `Siap. Jika dijalankan dengan pengaturan ini: ${verdict}`)
        : tr(`Under way. The diagnosis starts at step 3. If you keep going: ${verdict}`, `Sedang berjalan. Diagnosis baru muncul di langkah 3. Jika diteruskan: ${verdict}`));
      lab.setDetail(predicted(plannedDiag.reason));
    }
    else {
      lab.setStatus(n === 0
        ? tr('Ready. Press Run or Next step.', 'Siap. Tekan Jalankan atau Langkah.')
        : tr('Under way. The diagnosis starts at step 3.', 'Sedang berjalan. Diagnosis baru muncul di langkah 3.'));
      lab.setDetail(plannedDiag.reason);
    }
    lab.setMetrics(tr(
      `Step ${fmt(n)} of ${fmt(planned.length - 1)}  |  x = ${show(cur.x)}  |  loss = ${show(cur.loss)}  |  learning rate ${fmt(c.lr, { max: 4 })}, momentum ${fmt(c.momentum, { digits: 2 })}`,
      `Langkah ${fmt(n)} dari ${fmt(planned.length - 1)}  |  x = ${show(cur.x)}  |  loss = ${show(cur.loss)}  |  learning rate ${fmt(c.lr, { max: 4 })}, momentum ${fmt(c.momentum, { digits: 2 })}`));
    lab.setLegend([
      { kind: 'dot', color: clusterColor(2), label: tr('start, lowest', 'awal, terendah') },
      { kind: 'dot', color: g.t.accent, label: tr('steps (solid line)', 'langkah (garis penuh)') },
      { kind: 'dot', color: clusterColor(1), label: tr('current point', 'titik sekarang') },
      ...(c.preview ? [{ kind: 'dot', color: g.t.muted, label: tr('planned (dashed)', 'rencana (putus-putus)') }] : []),
    ]);

    // Loss against step.
    // A log axis cannot show zero. Below LOSS_FLOOR a run is drawn only down to its first such step, and the chart
    // says so, instead of dragging a flat line along the bottom that reads as "the loss stopped improving".
    const lg = v => Math.log10(Math.max(v, LOSS_FLOOR));
    // Losses beyond 10,000 would crowd the axis labels, so those runs switch to the log scale on their own.
    const useLog = c.log || planned.some(s => s.loss > LOG_AUTO_LOSS);
    const cutAtFloor = list => (useLog ? cutAtLossFloor(list) : list);
    const hitsFloor = list => useLog && list.some(s => s.loss <= LOSS_FLOOR);
    const shownPlanned = cutAtFloor(planned), shownTrace = cutAtFloor(trace);
    const ys = list => list.map(s => (useLog ? lg(s.loss) : s.loss));
    const plannedYs = ys(shownPlanned);
    const series = [];
    if (c.preview) series.push({ xs: shownPlanned.map(s => s.t), ys: plannedYs, color: g.t.muted, dash: true, points: false });
    series.push({ xs: shownTrace.map(s => s.t), ys: ys(shownTrace), color: g.t.accent });
    const chart = drawLineChart(chartCanvas, {
      series, xLabel: tr('step', 'langkah'), yLabel: useLog ? tr('log10 of the loss', 'log10 loss') : tr('loss', 'loss'),
      xMin: 0, xMax: Math.max(1, planned.length - 1),
      yMin: useLog ? Math.min(...plannedYs) : 0, yMax: Math.max(...plannedYs, 1e-9),
      integerX: planned.length <= 13,
    });
    // Name the floor where the line stops: the first step at or below it, on the planned run (or the run so far).
    const floorEnd = [c.preview && hitsFloor(planned) ? shownPlanned : null, hitsFloor(trace) ? shownTrace : null].find(Boolean);
    if (floorEnd) {
      const end = floorEnd.at(-1), cctx = chartCanvas.getContext('2d');
      const width = chartCanvas.getBoundingClientRect().width;
      const ex = chart.X(end.t), ey = chart.Y(lg(end.loss)), x0 = chart.X(0);
      const n = fmt(end.t);
      const texts = [tr(`from step ${n} the loss is below 1e-12 (line stops)`, `mulai langkah ${n} loss di bawah 1e-12 (garis berhenti)`),
        tr(`below 1e-12 from step ${n}`, `di bawah 1e-12 sejak langkah ${n}`)];
      // Every pixel the drawn lines and the end marker cover; the note goes where none of them are.
      const ink = [[ex - 5, ey - 5], [ex, ey], [ex + 5, ey - 5]];
      for (const list of [c.preview ? shownPlanned : [], shownTrace]) {
        for (let i = 1; i < list.length; i++) {
          const ax = chart.X(list[i - 1].t), ay = chart.Y(lg(list[i - 1].loss)), bx = chart.X(list[i].t), by = chart.Y(lg(list[i].loss));
          const k = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 3));
          for (let j = 0; j <= k; j++) ink.push([ax + (bx - ax) * j / k, ay + (by - ay) * j / k]);
        }
      }
      cctx.save();
      cctx.font = '11px system-ui, sans-serif'; cctx.fillStyle = g.t.ink;
      const spots = w => [['left', ex + 10, ey - 8], ['right', ex - 10, ey - 8], ['left', x0 + 8, ey - 8], ['right', width - 10, 26]]
        .map(([align, x, y]) => ({ align, x, y, l: align === 'left' ? x : x - w, r: align === 'left' ? x + w : x }))
        .filter(q => q.l >= x0 && q.r <= width - 6 && !ink.some(([px, py]) => px >= q.l - 4 && px <= q.r + 4 && py >= q.y - 13 && py <= q.y + 4));
      let placed = null, label = texts[1];
      for (const t of texts) { const q = spots(cctx.measureText(t).width)[0]; if (q) { placed = q; label = t; break; } }
      placed ??= { align: 'right', x: width - 10, y: 26 };
      cctx.textAlign = placed.align; cctx.fillText(label, placed.x, placed.y);
      cctx.strokeStyle = g.t.ink; cctx.lineWidth = 2;
      cctx.beginPath(); cctx.moveTo(ex - 5, ey - 5); cctx.lineTo(ex, ey); cctx.lineTo(ex + 5, ey - 5); cctx.stroke();
      cctx.restore();
    }
  }

  // Pick the start by clicking or dragging in the plot, or with the arrow keys.
  let drag = null;
  const setStart = x => { controls.set('start', Math.round(clamp(x, 0, 10) * 10) / 10); stepper.reset(); };
  // A press beside the plot square would clamp to 0 or 10, so only a press inside the square starts a drag.
  const insidePlot = e => {
    const g = plot.g;
    if (!g) return false;
    const r = lab.canvas.getBoundingClientRect(), fx = e.clientX - r.left - g.px(0), fy = e.clientY - r.top - 12;
    return fx >= 0 && fx <= g.size && fy >= 0 && fy <= g.size;
  };
  lab.on(lab.canvas, 'pointerdown', e => {
    if (!insidePlot(e)) return;
    drag = e.pointerId; lab.canvas.setPointerCapture(e.pointerId); setStart(plot.toData(e).x);
  });
  lab.on(lab.canvas, 'pointermove', e => { if (drag === e.pointerId) setStart(plot.toData(e).x); });
  lab.on(lab.canvas, 'pointerup', () => { drag = null; });
  lab.on(lab.canvas, 'keydown', e => {
    const d = { ArrowLeft: -0.1, ArrowRight: 0.1, ArrowDown: -0.1, ArrowUp: 0.1 }[e.key];
    if (d == null) return;
    e.preventDefault();
    setStart(controls.get('start') + d * (e.shiftKey ? 10 : 1));
  });

  lab.onReset(() => {
    controls.set('fn', DEFAULTS.fn); controls.set('start', DEFAULTS.start); controls.set('steps', DEFAULTS.steps);
    controls.set('preview', true); controls.set('log', false);
    setRates(DEFAULTS);
    stepper.reset();
  });
  lab.onTheme(redraw);
  lab.onResize(redraw);
  return lab.destroy;
}
