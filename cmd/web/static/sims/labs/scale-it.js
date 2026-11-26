// Scale it: the same 60 people, two features in very different units (income in dollars,
// age in years), and a k-NN that sees whatever scaling you pick. The plot shows the data
// as the model sees it, on axes of equal scale, so with no scaling the points are squashed
// against the income axis. All the math lives in sims/ml/scaledemo.js.
import { createLab, createPlot, clusterColor, tr, fmt, pct } from '../kit/index.js';
import { incomeAgeData, makeScaler, compareScalings, oneHot, SCALINGS } from '../ml/scaledemo.js';

// Learner-facing text is built by functions, at draw time, so it follows the language.
const shortName = kind => ({ none: tr('None', 'Tanpa scaling'), standardize: tr('Standardize', 'Standardisasi'), minmax: tr('Min-max', 'Min-max') })[kind];
const groupName = g => (g === 'A' ? tr('Group A', 'Grup A') : tr('Group B', 'Grup B'));
const scalingOptions = () => [['none', tr('None (raw numbers)', 'Tanpa (angka mentah)')], ['standardize', tr('Standardize (z-score)', 'Standardisasi (z-score)')], ['minmax', tr('Min-max (0 to 1)', 'Min-max (0 sampai 1)')]];
const BOUNDS = { income: [20000, 120000], age: [18, 70] };
const DEFAULT_QUERY = { income: 85000, age: 27 };
const labels = kind => ({
  none: [tr('Income ($)', 'Pendapatan ($)'), tr('Age (years, on the income scale)', 'Usia (tahun, pada skala pendapatan)')],
  standardize: [tr('Income (z-score)', 'Pendapatan (z-score)'), tr('Age (z-score)', 'Usia (z-score)')],
  minmax: [tr('Income (0 to 1)', 'Pendapatan (0 sampai 1)'), tr('Age (0 to 1)', 'Usia (0 sampai 1)')],
})[kind];
// A square view per scaling, chosen to hold every point and every possible query position.
const VIEWS = {
  none: { minX: 0, minY: 0, span: 125000 },
  standardize: { minX: -2.5, minY: -2.5, span: 5 },
  minmax: { minX: -0.3, minY: -0.3, span: 1.5 },
};

// With no scaling both axes run to 125,000, so the kit's tick labels ("1.25e+5") are too wide
// for the axis title. Replace them with short ones: dollars across, the same scale up. The
// scaled views get their tick labels and axis titles redrawn too, so decimals follow the language.
function localTicks(plot, g, kind) {
  const ctx = plot.ctx, { minX, minY, span } = g.range;
  ctx.clearRect(0, 0, g.px(minX) - 1, g.height);
  ctx.clearRect(0, g.py(minY) + 1, g.width, g.height);
  ctx.save();
  ctx.fillStyle = g.t.muted; ctx.font = '11px system-ui, sans-serif';
  for (let i = 0; i <= 5; i++) {
    const v = minY + i * span / 5;
    const text = kind === 'none' ? (v ? `${fmt(v / 1000)}k` : '0') : fmt(Number(v.toPrecision(5)) + 0);
    ctx.textAlign = 'center'; ctx.fillText(kind === 'none' && v ? `$${text}` : text, g.px(minX + i * span / 5), g.py(minY) + 16);
    ctx.textAlign = 'right'; ctx.fillText(text, g.px(minX) - 7, g.py(v) + 4);
  }
  ctx.textAlign = 'center';
  ctx.fillText(labels(kind)[0], g.px(minX + span / 2), g.height - 5);
  // The age title sits horizontally above the axis, in the gap over the plot: a rotated title
  // would collide with the wide tick labels ("125k") once the plot is phone-sized.
  ctx.textAlign = 'left';
  ctx.fillText(labels(kind)[1], g.px(minX), 8);
  ctx.restore();
  if (kind !== 'none') return;
  // Say what the thin strip is, since the picture alone looks like missing data.
  ctx.save();
  ctx.textAlign = 'center';
  const cx = g.px(minX + span / 2);
  let cy = g.py(minY + span * 0.5);
  const wrap = (text, font, color, maxWidth) => {
    ctx.font = font; ctx.fillStyle = color;
    let lineText = '';
    for (const word of text.split(' ')) {
      const trial = lineText ? `${lineText} ${word}` : word;
      if (lineText && ctx.measureText(trial).width > maxWidth) { ctx.fillText(lineText, cx, cy); cy += 16; lineText = word; } else lineText = trial;
    }
    ctx.fillText(lineText, cx, cy); cy += 20;
  };
  wrap(tr('All 60 people sit on this thin strip at the bottom.', 'Semua 60 orang menumpuk di jalur tipis di bawah ini.'), '600 13px system-ui, sans-serif', g.t.ink, g.size - 16);
  wrap(tr('The age axis uses the same dollar-sized scale, so ages 18 to 70 are tiny next to income and sit at the very bottom. The model can only tell people apart by income.', 'Usia 18 sampai 70 nyaris tidak terlihat pada skala dolar ini, sehingga menempel di dasar. Model hanya bisa membedakan orang dari pendapatan.'), '12px system-ui, sans-serif', g.t.muted, g.size - 16);
  ctx.restore();
}

const money = v => `$${fmt(Math.round(v))}`;
const pct0 = v => pct(v, 0);
const clampTo = ([lo, hi], v) => Math.max(lo, Math.min(hi, v));

export function mount(root) {
  const lab = createLab(root, {
    title: tr('The same people, three scalings', 'Orang yang sama, tiga cara scaling'),
    hint: tr('The plot shows what the model sees. With no scaling, income is measured in thousands and age in tens, so every point is squashed against the income axis.', 'Plot ini menunjukkan data seperti yang dilihat model. Tanpa scaling, pendapatan berskala ribuan, sedangkan usia hanya puluhan, sehingga semua titik terpepet di sumbu pendapatan.'),
    status: true, legend: true, canvasLabel: tr('Scatter plot of income and age with a draggable query point', 'Scatter plot pendapatan dan usia dengan titik query yang bisa digeser'),
    settingsTitle: tr('Settings', 'Pengaturan'),
    extra: {
      title: tr('Compare the three scalings', 'Bandingkan ketiga cara scaling'),
      hint: tr('Accuracy is leave-one-out: it uses your k and treats each person in turn as the unknown. Neighbors lists the groups of the query\'s k nearest neighbors, closest first. The scalers are fitted on all 60 people on purpose, the shortcut the lesson warns against; it is harmless here because the lab only shows how scaling changes neighbors.',
        'Akurasi dihitung dengan leave-one-out: menggunakan k pilihanmu, lalu setiap orang bergantian dianggap sebagai data yang belum diketahui. Kolom Tetangga berisi kelompok dari k tetangga terdekat titik query, urut dari yang paling dekat. Scaler sengaja di-fit ke semua 60 orang, jalan pintas yang diperingatkan di pelajaran; di sini tidak masalah karena lab ini hanya menunjukkan bagaimana scaling mengubah tetangga.'),
    },
  });
  const plot = createPlot(lab.canvas, { xLabel: labels('none')[0], yLabel: labels('none')[1], range: VIEWS.none });
  const data = incomeAgeData();
  const rows = data.map(p => p.features);
  const scalers = Object.fromEntries(SCALINGS.map(([kind]) => [kind, makeScaler(kind, rows)]));
  const query = { ...DEFAULT_QUERY };
  let drag = null;

  const controls = lab.panel([
    { name: 'scaling', type: 'select', label: tr('Scaling', 'Scaling'), options: scalingOptions(), value: 'none' },
    { name: 'k', type: 'range', label: tr('k (neighbors that vote)', 'k (jumlah tetangga yang vote)'), min: 1, max: 15, step: 1, value: 5 },
    { name: 'income', type: 'range', label: tr('Query income', 'Pendapatan titik query'), min: BOUNDS.income[0], max: BOUNDS.income[1], step: 100, value: query.income, format: money },
    { name: 'age', type: 'range', label: tr('Query age', 'Usia titik query'), min: BOUNDS.age[0], max: BOUNDS.age[1], step: 1, value: query.age, format: v => `${fmt(v)} ${tr('years', 'tahun')}` },
    { name: 'show', type: 'toggle', label: tr('Show the k nearest neighbors', 'Tampilkan k tetangga terdekat'), value: true },
    { type: 'note', text: tr('Drag the diamond, click the plot, or use the arrow keys on it. With no scaling the plot is a flat strip, so dragging only moves income: use the age slider.', 'Geser penanda belah ketupat, klik di plot, atau gunakan tombol panah. Tanpa scaling plotnya hanya berupa jalur datar, sehingga menggeser hanya mengubah pendapatan: gunakan slider usia.') },
  ], (name, v) => {
    if (name === 'income' || name === 'age') { query[name] = v[name]; }
    draw();
  });

  function setQuery(income, age) {
    query.income = clampTo(BOUNDS.income, Math.round(income / 100) * 100);
    query.age = clampTo(BOUNDS.age, Math.round(age));
    controls.set('income', query.income);
    controls.set('age', query.age);
  }

  function draw() {
    const v = controls.values();
    const scaler = scalers[v.scaling];
    plot.setRange(VIEWS[v.scaling]);
    plot.setLabels(...labels(v.scaling));
    const g = plot.begin();
    localTicks(plot, g, v.scaling);
    const cmp = compareScalings(data, [query.income, query.age], v.k);
    const here = cmp[v.scaling];
    const q = scaler.forward([query.income, query.age]);
    const at = p => scaler.forward(p.features);

    plot.clip(() => {
      if (v.show) {
        const radius = here.distances[here.distances.length - 1];
        plot.circle(q[0], q[1], radius, { fill: g.t.accent, stroke: g.t.accent, alpha: 0.1 });
        for (const i of here.neighbors) { const p = at(data[i]); plot.segment(q[0], q[1], p[0], p[1], { color: g.t.muted, width: 1.4, dash: [4, 4] }); }
      }
      data.forEach(p => { const s = at(p); plot.dot(s[0], s[1], clusterColor(p.label === 'A' ? 0 : 1), 4.4); });
      if (v.show) for (const i of here.neighbors) { const p = at(data[i]); plot.ring(p[0], p[1], g.t.ink, 8); }
      plot.diamond(q[0], q[1], clusterColor(3), 9);
    });

    const votes = here.neighbors.reduce((acc, i) => { acc[data[i].label]++; return acc; }, { A: 0, B: 0 });
    lab.setStatus(tr(`${shortName(v.scaling)}: leave-one-out accuracy ${pct0(here.accuracy)} at k = ${v.k}`, `${shortName(v.scaling)}: akurasi leave-one-out ${pct0(here.accuracy)} dengan k = ${v.k}`));
    const tie = here.tied ? tr(' (a tie, so the closest neighbor decides)', ' (seri, sehingga tetangga terdekat yang menentukan)') : '';
    lab.setDetail(tr(
      `Query (${money(query.income)}, age ${query.age}) is predicted ${groupName(here.label)}: ${votes.A} vote${votes.A === 1 ? '' : 's'} for Group A, ${votes.B} for Group B${tie}.`,
      `Titik query (${money(query.income)}, usia ${fmt(query.age)}) diprediksi ${groupName(here.label)}: ${fmt(votes.A)} vote untuk Grup A, ${fmt(votes.B)} untuk Grup B${tie}.`));
    lab.setMetrics(`k = ${v.k}`);
    lab.setLegend([
      { kind: 'dot', color: clusterColor(0), label: tr('Group A (younger)', 'Grup A (lebih muda)') },
      { kind: 'dot', color: clusterColor(1), label: tr('Group B (older)', 'Grup B (lebih tua)') },
      { kind: 'diamond', color: clusterColor(3), label: tr('Query (draggable)', 'Query (bisa digeser)') },
      ...(v.show ? [{ kind: 'dot', color: g.t.ink, label: tr('Ringed: its k nearest neighbors', 'Dilingkari: k tetangga terdekatnya') }] : []),
    ]);
    table(cmp, v.scaling);
  }

  const cell = (row, text, tag = 'td') => { const c = document.createElement(tag); c.textContent = text; row.append(c); return c; };

  function table(cmp, current) {
    const host = lab.extraEl;
    host.replaceChildren();
    const t = document.createElement('table');
    const head = t.createTHead().insertRow();
    [tr('Scaling', 'Scaling'), tr('Accuracy', 'Akurasi'), tr('Predicted', 'Prediksi'), tr('Neighbors', 'Tetangga')].forEach(h => cell(head, h, 'th'));
    const body = t.createTBody();
    for (const [kind] of SCALINGS) {
      const r = cmp[kind];
      const row = body.insertRow();
      cell(row, kind === current ? `${shortName(kind)} ${tr('(shown)', '(tampil)')}` : shortName(kind));
      cell(row, pct0(r.accuracy));
      cell(row, groupName(r.label));
      cell(row, r.neighbors.map(i => data[i].label).join(' '));
      if (kind === current) row.style.fontWeight = '700';
    }
    host.append(t);
    // On a phone, let cells wrap and tighten them so all four columns fit without sideways scrolling.
    if (host.clientWidth < 480) {
      t.style.fontSize = '12px';
      t.querySelectorAll('th, td').forEach(c => { c.style.whiteSpace = 'normal'; c.style.padding = '8px 3px'; });
    }

    const title = document.createElement('p');
    title.className = 'hint';
    title.textContent = tr('One-hot encoding in one picture: a color column becomes three columns, one per color, with a single 1 in each row.', 'One-hot encoding dalam satu gambar: satu kolom warna menjadi tiga kolom, satu untuk setiap warna, dan setiap baris hanya punya satu angka 1.');
    host.append(title);
    const names = { red: tr('red', 'merah'), green: tr('green', 'hijau'), blue: tr('blue', 'biru') };
    const colors = [names.red, names.green, names.blue, names.green];
    const enc = oneHot(colors, [names.red, names.green, names.blue]);
    const t2 = document.createElement('table');
    const h2 = t2.createTHead().insertRow();
    [tr('color', 'warna'), ...enc.categories.map(c => `is_${c}`)].forEach(h => cell(h2, h, 'th'));
    const b2 = t2.createTBody();
    colors.forEach((c, i) => { const row = b2.insertRow(); cell(row, c); enc.rows[i].forEach(x => { const td = cell(row, x); if (x) td.style.fontWeight = '700'; }); });
    host.append(t2);
    const note = document.createElement('p');
    note.className = 'hint';
    note.textContent = tr(`Ordinal codes (red 0, green 1, blue 2) would make red look closer to green than to blue. With one-hot columns every pair of different colors is the same distance apart (${fmt(1.41)}).`,
      `Jika dikodekan secara ordinal (merah 0, hijau 1, biru 2), merah akan terlihat lebih dekat ke hijau daripada ke biru. Dengan kolom one-hot, semua pasangan warna yang berbeda jaraknya sama (${fmt(1.41)}).`);
    host.append(note);
  }

  lab.on(lab.canvas, 'pointerdown', e => {
    drag = e.pointerId;
    lab.canvas.setPointerCapture(e.pointerId);
    moveTo(e);
  });
  lab.on(lab.canvas, 'pointermove', e => { if (drag === e.pointerId) moveTo(e); });
  const stop = e => { if (drag === e.pointerId) drag = null; };
  lab.on(lab.canvas, 'pointerup', stop);
  lab.on(lab.canvas, 'pointercancel', stop);

  // Pointer position in the current view, converted back to real income and age. With no
  // scaling the strip is far too thin to set age by dragging, so only income moves.
  function moveTo(e) {
    const kind = controls.get('scaling');
    const raw = scalers[kind].inverse([plot.toData(e).x, plot.toData(e).y]);
    setQuery(raw[0], kind === 'none' ? query.age : raw[1]);
    draw();
  }

  lab.on(lab.canvas, 'keydown', e => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!d) return;
    // One key press moves income by $1,000 on the raw plot and $2,000 on the scaled ones, so the diamond
    // travels a similar distance in both features (income spreads over far more dollars than age spreads years).
    const unit = controls.get('scaling') === 'none' ? 1000 : 2000;
    e.preventDefault();
    const m = e.shiftKey ? 5 : 1;
    setQuery(query.income + d[0] * unit * m, query.age + d[1] * m);
    draw();
  });

  lab.onReset(() => {
    controls.set('scaling', 'none'); controls.set('k', 5); controls.set('show', true);
    setQuery(DEFAULT_QUERY.income, DEFAULT_QUERY.age);
    draw();
  });
  lab.onTheme(draw);
  lab.onResize(draw);
  draw();
  return lab.destroy;
}
