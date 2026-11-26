// Recommender lab: the user-item matrix as a heatmap (users are rows, items are columns) and six recommenders
// compared on it, with a switch that removes the history of a share of the users (cold start).
//   Heatmap: a filled cell is an interaction the models may use, an outlined cell is the held-out interaction each
//   user is scored on, and a faint cell is history that was removed. A mark at the left of a row flags a cold-start user.
//   Charts: ranking quality (precision, recall or NDCG at k) for warm and for cold users, the same metric against
//   history length, catalogue coverage and list diversity, and the matrix-factorization training curve.
//   Click a row (or use the arrow keys, or the "User to inspect" box) to see one user's history, what they liked
//   next and the top-k of every recommender.
// The data is always generated and the lab says so: the bundled penguins data holds no user-item interactions, and
// no penguins values (NA included) are read here. The pipeline lives in sims/ml/recommenderlab.js (tested there) on
// top of sims/ml/recsys.js; this file draws and wires.
import { createLab, drawLineChart, clusterColor, theme, tr, fmt, pct, count, predictBox } from '../kit/index.js';
import {
  RECOMMENDERS, DEFAULTS, LIMITS, CELL, METRICS, NEIGHBOURS, HYBRID_MIN, buildBase, applyCold, trainModels, evaluateModels,
  suffersMost, cellStates, userView, metricOf, sourceKey, GENRE_ID,
} from '../ml/recommenderlab.js';

const PAGE_DEFAULTS = DEFAULTS;
const MAX_CHIPS = 24;

const nameOf = key => ({
  popularity: tr('Popularity', 'Popularity'),
  userknn: tr('User k-NN', 'User k-NN'),
  itemknn: tr('Item k-NN', 'Item k-NN'),
  mf: tr('Matrix factorization', 'Matrix factorization'),
  content: tr('Content-based', 'Content-based'),
  hybrid: tr('Hybrid', 'Hybrid'),
}[key]);
// The genre names come from recsys.js in English; the lab shows them in the learner's language.
const genreName = g => tr(g, GENRE_ID[g] ?? g);
const colorOf = key => clusterColor(RECOMMENDERS.indexOf(key));
const COLD_COLOR = () => clusterColor(6);
const metricName = (m, k) => ({ precision: `Precision@${k}`, recall: `Recall@${k}`, ndcg: `NDCG@${k}` }[m]);
// The share slider's base is the users that have a held-out item (the scored users), not every user.
const coldLabel = () => tr('Share of scored users with history removed', 'Proporsi pengguna dinilai dengan riwayat dihapus');
const keepLabel = () => tr('Interactions they keep', 'Interaksi yang mereka simpan');
const f2 = v => fmt(v, { digits: 2 });

const CSS = `
.rec-user{margin-top:8px;font-size:13px}
@media (min-width:1100px){.lab-stage:is(:fullscreen,.expanded) .rec-user{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain}}
.rec-user .rec-sub{margin:0 0 6px;color:var(--muted)}
.rec-row{display:grid;grid-template-columns:152px minmax(0,1fr);gap:8px;align-items:start;margin:3px 0}
.rec-name{display:flex;gap:6px;align-items:flex-start;font-weight:600;line-height:1.3}
.rec-name small{display:block;font-weight:400;color:var(--muted);font-size:12px;line-height:1.2}
.rec-sw{flex:none;width:10px;height:10px;margin-top:3px;border-radius:2px;background:var(--c,var(--muted))}
.rec-chips{display:flex;flex-wrap:wrap;gap:4px;list-style:none;margin:0;padding:0}
.rec-chips li{min-width:28px;padding:0 6px;border:1px solid var(--line-strong);border-radius:6px;background:var(--surface);text-align:center;font-variant-numeric:tabular-nums;line-height:1.4}
.rec-chips li.hit{background:var(--good-soft);border-color:var(--good);font-weight:700}
.rec-chips li.hit::before{content:"\\2713 "}
.rec-chips.tie li{opacity:.55;border-style:dashed}
.rec-chips .none{border:0;background:none;color:var(--muted);text-align:left;padding:0}
.rec-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 0}
.rec-tab{min-height:30px;padding:2px 10px;border:1.5px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;font-size:13px;cursor:pointer}
.rec-tab:hover{background:var(--accent-soft)}
.rec-tab[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:var(--accent-ink);font-weight:700}
@media (max-width:860px){.rec-tab{min-height:44px}}
.rec-group{margin:12px 0 0;padding-top:8px;border-top:1px solid var(--line)}
.rec-group > summary{cursor:pointer;font-weight:650;font-size:14px;padding:6px 0}
.rec-group[open] > summary{margin-bottom:4px}
/* Below the wide layout the legends may grow, so no entry (the cold-start mark above all) hides behind a scroll area. */
@media (max-width:1099px){.rec-lab .legend{max-height:none;overflow:visible}}
`;

function setup(canvas) {
  const { width, height } = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { ctx, width, height, t: theme() };
}

const niceMax = v => [0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8, 1].find(c => c >= v * 1.12) ?? 1;
const ticksOf = max => (max <= 0.3 ? [0, max / 2, max] : [0, max / 4, max / 2, (3 * max) / 4, max]);

// Horizontal bars, one row per recommender, up to two bars per row: a solid one and a pale outlined one.
//   rows: [{ label, color, bars: [{ value|null, pale }] }]
function drawBars(canvas, { rows, max, axisLabel, empty }) {
  const { ctx, width, height, t } = setup(canvas);
  const labelFont = `600 ${width < 420 ? 11 : 12}px system-ui, sans-serif`;
  ctx.font = labelFont;
  const labelW = Math.min(width * 0.5, Math.max(60, ...rows.map(r => ctx.measureText(r.label).width)) + 8);
  const m = { l: labelW + 6, r: 40, t: 6, b: 38 };
  const pw = Math.max(20, width - m.l - m.r), ph = Math.max(20, height - m.t - m.b);
  const X = v => m.l + (v / max) * pw;
  ctx.fillStyle = t.plot; ctx.fillRect(m.l, m.t, pw, ph);
  ctx.strokeStyle = t.grid; ctx.fillStyle = t.muted; ctx.lineWidth = 1; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.beginPath();
  for (const v of ticksOf(max)) { ctx.moveTo(X(v), m.t); ctx.lineTo(X(v), m.t + ph); ctx.fillText(fmt(v, { max: 2 }), X(v), m.t + ph + 14); }
  ctx.stroke();
  ctx.fillText(axisLabel, m.l + pw / 2, height - 6);
  const rowH = ph / Math.max(1, rows.length);
  const barH = Math.max(5, Math.min(14, (rowH - 6) / 2));
  rows.forEach((r, i) => {
    const cy = m.t + rowH * (i + 0.5);
    ctx.fillStyle = r.color; ctx.font = labelFont; ctx.textAlign = 'right';
    ctx.fillText(r.label, m.l - 8, cy + 4);
    r.bars.forEach((b, j) => {
      if (b.value == null) return;
      const y = cy + (j - (r.bars.length - 1) / 2) * (barH + 2) - barH / 2;
      const w = Math.max(1.5, X(b.value) - m.l);
      if (b.pale) {
        ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = r.color; ctx.fillRect(m.l, y, w, barH); ctx.restore();
        ctx.lineWidth = 1.5; ctx.strokeStyle = r.color; ctx.strokeRect(m.l + 0.75, y + 0.75, Math.max(0.5, w - 1.5), barH - 1.5);
      } else { ctx.fillStyle = r.color; ctx.fillRect(m.l, y, w, barH); }
      ctx.fillStyle = t.ink; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(f2(b.value), m.l + w + 4, y + barH - 1);
    });
  });
  if (empty) {
    ctx.fillStyle = t.ink; ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(empty, m.l + pw / 2, m.t + ph / 2);
  }
}

// Lines over categories (history length buckets). series: [{ color, width, values: [number|null] }]
function drawCategoryLines(canvas, { categories, series, max, xLabel, yLabel, subLabels }) {
  const { ctx, width, height, t } = setup(canvas);
  const m = { l: 44, r: 14, t: 10, b: 50 };
  const pw = width - m.l - m.r, ph = height - m.t - m.b;
  const X = i => m.l + (categories.length === 1 ? pw / 2 : 12 + (i / (categories.length - 1)) * (pw - 24));
  const Y = v => m.t + ph - (v / max) * ph;
  ctx.fillStyle = t.plot; ctx.fillRect(m.l, m.t, pw, ph);
  ctx.strokeStyle = t.grid; ctx.fillStyle = t.muted; ctx.lineWidth = 1; ctx.font = '11px system-ui, sans-serif';
  ctx.beginPath();
  ctx.textAlign = 'right';
  for (const v of ticksOf(max)) { ctx.moveTo(m.l, Y(v)); ctx.lineTo(m.l + pw, Y(v)); ctx.fillText(fmt(v, { max: 2 }), m.l - 6, Y(v) + 4); }
  ctx.stroke();
  ctx.textAlign = 'center';
  categories.forEach((c, i) => { ctx.fillStyle = t.ink; ctx.fillText(c, X(i), m.t + ph + 14); ctx.fillStyle = t.muted; ctx.fillText(subLabels[i], X(i), m.t + ph + 27); });
  ctx.fillText(xLabel, m.l + pw / 2, height - 5);
  ctx.save(); ctx.translate(12, m.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(yLabel, 0, 0); ctx.restore();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const s of series) {
    ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = s.width;
    let open = false;
    ctx.beginPath();
    s.values.forEach((v, i) => { if (v == null) { open = false; return; } if (open) ctx.lineTo(X(i), Y(v)); else ctx.moveTo(X(i), Y(v)); open = true; });
    ctx.stroke();
    s.values.forEach((v, i) => { if (v == null) return; ctx.beginPath(); ctx.arc(X(i), Y(v), Math.max(3, s.width / 2 + 1), 0, 2 * Math.PI); ctx.fill(); });
  }
}

function legendInto(host, items) {
  host.replaceChildren(...items.map(it => {
    const span = document.createElement('span');
    const i = document.createElement('i');
    i.className = it.kind === 'line' ? 'glyph-line' : it.kind === 'ring' ? 'ring' : 'dot';
    i.setAttribute('aria-hidden', 'true');
    i.style.setProperty('--glyph', it.color);
    span.append(i, ` ${it.label}`);
    return span;
  }));
}

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Recommenders and cold start', 'Recommender dan cold start'),
    hint: tr(
      'Each row is a user and each column an item. Remove the history of some users and see which recommenders still work.',
      'Tiap baris adalah satu pengguna dan tiap kolom satu item. Hapus riwayat sebagian pengguna, lalu lihat recommender mana yang masih bekerja.'),
    status: true, legend: true,
    canvasLabel: tr('Heatmap of users (rows) and items (columns). Use the up and down arrow keys to choose a user.',
      'Heatmap pengguna (baris) dan item (kolom). Gunakan tombol panah atas dan bawah untuk memilih pengguna.'),
    settingsTitle: tr('Controls', 'Pengaturan'),
  });
  lab.root.classList.add('rec-lab');
  const style = document.createElement('style');
  style.textContent = CSS;
  lab.root.prepend(style);

  // The selected user's lists are the third view of the last chart box (below).
  const userBox = document.createElement('section');
  userBox.className = 'rec-user';
  userBox.setAttribute('aria-label', tr('The selected user', 'Pengguna yang dipilih'));

  // ---- Quick Quiz ---------------------------------------------------------------------------------------
  const box = predictBox(lab.ref('below'), {
    question: tr('Remove the history of 30 percent of the scored users. Which recommender suffers most?',
      'Hapus riwayat 30 persen pengguna yang dinilai. Recommender mana yang paling terdampak?'),
    choices: [
      ['popularity', tr('Popularity', 'Popularity')],
      ['collab', tr('The collaborative ones: user k-NN, item k-NN and matrix factorization', 'Yang kolaboratif: user k-NN, item k-NN, dan matrix factorization')],
      ['content', tr('Content-based', 'Content-based')],
      ['hybrid', tr('Hybrid', 'Hybrid')],
    ],
    name: 'recommender-predict',
    hint: tr(`Set "${coldLabel()}" to 30% and "${keepLabel()}" to 0, then check again.`,
      `Atur "${coldLabel()}" ke 30% dan "${keepLabel()}" ke 0, lalu periksa lagi.`),
  });

  // ---- chart cards --------------------------------------------------------------------------------------
  const qualityCanvas = lab.chartCard(tr('Ranking quality: warm and cold users', 'Kualitas ranking: pengguna warm dan cold'), '', 230);
  const qualityLegend = document.createElement('div');
  qualityLegend.className = 'legend';
  qualityCanvas.closest('.chart').before(qualityLegend);

  const historyCanvas = lab.chartCard(tr('Quality against history length', 'Kualitas menurut panjang riwayat'), '', 230);
  const historyCard = historyCanvas.closest('.card');
  const historyLegend = document.createElement('div');
  historyLegend.className = 'legend';
  historyCanvas.closest('.chart').before(historyLegend);

  const sideCanvas = lab.chartCard(tr('Coverage and diversity', 'Cakupan dan diversitas'), '', 230);
  const sideCard = sideCanvas.closest('.card');
  const sideTitle = sideCard.querySelector('h2');
  const sideLegend = document.createElement('div');
  sideLegend.className = 'legend';
  const tabs = document.createElement('div');
  tabs.className = 'rec-tabs';
  tabs.setAttribute('role', 'group');
  tabs.setAttribute('aria-label', tr('Chart shown in this box', 'Grafik yang ditampilkan di kotak ini'));
  const tabButtons = {};
  for (const [view, label] of [['breadth', tr('Coverage and diversity', 'Cakupan dan diversitas')], ['mf', tr('MF training curve', 'Kurva pelatihan MF')], ['user', tr('Selected user', 'Pengguna terpilih')]]) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'rec-tab'; b.textContent = label;
    b.addEventListener('click', () => { S.view = view; drawSide(); });
    tabs.append(b); tabButtons[view] = b;
  }
  sideTitle.after(tabs);
  sideCanvas.closest('.chart').before(sideLegend);
  sideCanvas.closest('.chart').after(userBox);

  // ---- state --------------------------------------------------------------------------------------------
  const S = { seed: 1, baseKey: '', base: null, coldKey: '', split: null, cells: null, modelKey: '', models: null, evalKey: '', ev: null, userKey: '', view: 'breadth', selected: -1, geom: null, userData: null };
  let frame = 0;
  let notice = '';

  // ---- controls -----------------------------------------------------------------------------------------
  const pctFmt = v => `${fmt(v)}%`;
  const recToggles = RECOMMENDERS.map(key => ({ name: `show-${key}`, type: 'toggle', label: nameOf(key), value: true }));
  const specs = [
    { type: 'note', text: tr(
      'Data: generated, always. People "click" items; no real ratings are bundled, and no penguins values (NA included) are read here.',
      'Data: buatan, selalu. Orang "mengklik" item; tidak ada rating nyata yang disertakan, dan tidak ada nilai penguin (termasuk NA) yang dibaca di sini.') },
    { name: 'coldShare', type: 'range', label: coldLabel(), min: LIMITS.coldShare[0], max: LIMITS.coldShare[1], step: 5, value: PAGE_DEFAULTS.coldShare, format: pctFmt },
    { name: 'keep', type: 'range', label: keepLabel(), min: LIMITS.keep[0], max: LIMITS.keep[1], step: 1, value: PAGE_DEFAULTS.keep },
    { name: 'mfFactors', type: 'range', label: tr('MF factors', 'Faktor MF'), min: LIMITS.mfFactors[0], max: LIMITS.mfFactors[1], step: 1, value: PAGE_DEFAULTS.mfFactors },
    { name: 'mfLambda', type: 'range', label: tr('MF lambda (regularization)', 'Lambda MF (regularisasi)'), min: LIMITS.mfLambda[0], max: LIMITS.mfLambda[1], step: 0.1, value: PAGE_DEFAULTS.mfLambda },
    ...recToggles,
    { name: 'k', type: 'range', label: tr('Top-k (list length)', 'Top-k (panjang daftar)'), min: LIMITS.k[0], max: LIMITS.k[1], step: 1, value: PAGE_DEFAULTS.k },
    { name: 'metric', type: 'select', label: tr('Metric in the charts', 'Metrik di grafik'), value: PAGE_DEFAULTS.metric, options: METRICS.map(m => [m, metricName(m, PAGE_DEFAULTS.k)]) },
    { name: 'users', type: 'range', label: tr('Users', 'Pengguna'), min: LIMITS.users[0], max: LIMITS.users[1], step: 10, value: PAGE_DEFAULTS.users },
    { name: 'items', type: 'range', label: tr('Items', 'Item'), min: LIMITS.items[0], max: LIMITS.items[1], step: 10, value: PAGE_DEFAULTS.items },
    { name: 'factors', type: 'range', label: tr('Latent factors of the data', 'Faktor laten pada data'), min: LIMITS.factors[0], max: LIMITS.factors[1], step: 1, value: PAGE_DEFAULTS.factors },
    { name: 'sparsity', type: 'range', label: tr('Sparsity (share of empty cells)', 'Sparsity (proporsi sel kosong)'), min: LIMITS.sparsity[0], max: LIMITS.sparsity[1], step: 1, value: PAGE_DEFAULTS.sparsity, format: pctFmt },
    { name: 'skew', type: 'range', label: tr('Popularity skew', 'Kemiringan popularitas'), min: LIMITS.skew[0], max: LIMITS.skew[1], step: 0.1, value: PAGE_DEFAULTS.skew },
    { name: 'seed', type: 'number', label: tr('Seed', 'Seed'), min: 1, max: 9999, step: 1, value: S.seed },
    { name: 'fresh', type: 'button', label: tr('New sample', 'Sampel baru'), onClick: () => { S.seed = Math.min(9999, S.seed + 1); controls.set('seed', S.seed); box.reset(); schedule(); } },
    { name: 'user', type: 'number', label: tr('User to inspect', 'Pengguna yang diperiksa'), min: 0, max: LIMITS.users[1] - 1, step: 1, value: 0 },
    { name: 'nextCold', type: 'button', label: tr('Next cold-start user', 'Pengguna cold-start berikutnya'), onClick: () => {
      const cold = S.split?.cold ?? [];
      if (!cold.length) return;
      selectUser(cold.find(u => u > S.selected) ?? cold[0]);
    } },
    { type: 'note', text: tr(
      `The k-NN models use ${NEIGHBOURS} neighbours and the hybrid trusts matrix factorization from ${HYBRID_MIN} interactions. A user is scored on the one interaction held out (the outlined cell).`,
      `Model k-NN memakai ${NEIGHBOURS} neighbor dan hybrid memercayai matrix factorization mulai ${HYBRID_MIN} interaksi. Pengguna dinilai dari satu interaksi yang disisihkan (sel dengan garis tepi).`) },
  ];
  const controls = lab.panel(specs, onControl);

  // Two groups fold away so the Parameters box stays shorter than the screen: the recommenders compared, and the generated data.
  {
    const kids = [...controls.el.children];
    const nodeOf = name => kids[specs.findIndex(sp => sp.name === name)];
    const group = (title, nodes) => {
      const d = document.createElement('details');
      d.className = 'rec-group';
      const sm = document.createElement('summary');
      sm.textContent = title;
      d.append(sm, ...nodes);
      return d;
    };
    const recNodes = [...RECOMMENDERS.map(key => nodeOf(`show-${key}`)), kids[kids.length - 1]];
    const recGroup = group(tr('Recommenders compared', 'Recommender yang dibandingkan'), recNodes);
    nodeOf('k').before(recGroup);
    const dataGroup = group(tr('Generated data settings', 'Pengaturan data buatan'), ['users', 'items', 'factors', 'sparsity', 'skew', 'seed', 'fresh'].map(nodeOf));
    nodeOf('user').before(dataGroup);
  }

  const enabled = () => RECOMMENDERS.filter(key => controls.get(`show-${key}`));
  const values = () => {
    const v = controls.values();
    return { ...v, users: Math.round(v.users), items: Math.round(v.items) };
  };

  function onControl(name, v) {
    if (name.startsWith('show-')) {
      if (!enabled().length) { controls.set(name, true); notice = tr('At least one recommender stays on.', 'Setidaknya satu recommender harus tetap aktif.'); }
    } else if (name === 'mfFactors' || name === 'mfLambda') S.view = 'mf';
    else if (name === 'user') { S.selected = Math.max(0, Math.min(S.split ? S.split.users - 1 : 0, Math.round(v.user))); S.view = 'user'; }
    if (name === 'seed') { S.seed = Math.max(1, Math.round(v.seed)); box.reset(); }
    schedule();
  }

  // ---- compute (each stage is cached by its own key) -----------------------------------------------------
  function compute(v) {
    const baseKey = [v.users, v.items, v.factors, v.sparsity, v.skew, S.seed].join('|');
    if (S.baseKey !== baseKey) {
      S.base = buildBase({ users: v.users, items: v.items, factors: v.factors, sparsity: v.sparsity, skew: v.skew, seed: S.seed });
      S.baseKey = baseKey; S.coldKey = '';
    }
    const coldKey = `${baseKey}|${v.coldShare}|${v.keep}`;
    if (S.coldKey !== coldKey) {
      S.split = applyCold(S.base.split, v.coldShare / 100, v.keep, S.seed);
      S.cells = cellStates(S.split);
      S.coldKey = coldKey; S.modelKey = '';
    }
    const modelKey = `${coldKey}|${v.mfFactors}|${v.mfLambda}`;
    if (S.modelKey !== modelKey) {
      S.models = trainModels(S.split, { mfFactors: v.mfFactors, mfLambda: v.mfLambda });
      S.modelKey = modelKey; S.evalKey = '';
    }
    const evalKey = `${modelKey}|${v.k}`;
    if (S.evalKey !== evalKey) { S.ev = evaluateModels(S.models, S.split, v.k); S.evalKey = evalKey; S.userKey = ''; }
    if (S.selected < 0) S.selected = S.ev.testUsers[0] ?? 0;
    S.selected = Math.max(0, Math.min(S.split.users - 1, S.selected));
    const userKey = `${evalKey}|${S.selected}`;
    if (S.userKey !== userKey) { S.userData = userView(S.models, S.split, S.selected, v.k); S.userKey = userKey; }
  }

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; refresh(); });
  }
  lab.cleanup(() => cancelAnimationFrame(frame));

  function refresh() {
    const v = values();
    compute(v);
    controls.set('user', S.selected);
    // The metric options carry the current k, so the control reads like the chart titles.
    controls.el.querySelectorAll('select option').forEach(o => { o.textContent = metricName(o.value, v.k); });
    controls.disable('nextCold', !(S.split.cold?.length));
    drawAll();
    writeStatus(v);
    writeUser(v);
  }

  // ---- text ---------------------------------------------------------------------------------------------
  function writeStatus(v) {
    const sp = S.split, ev = S.ev;
    const seen = (sp.train.length + sp.valid.length) / (sp.users * sp.items);
    const cold = sp.cold?.length ?? 0;
    // "keep up to": a cold user who had fewer interactions than the slider keeps them all.
    const coldText = cold
      ? (v.keep === 0
        ? tr(` ${fmt(cold)} cold-start users lost their whole history; ${fmt(sp.removed)} interactions were removed.`,
          ` ${fmt(cold)} pengguna cold-start kehilangan seluruh riwayat; ${fmt(sp.removed)} interaksi dihapus.`)
        : tr(` ${fmt(cold)} cold-start users keep up to ${count(v.keep, 'interaction', 'interaksi')} each; ${fmt(sp.removed)} interactions were removed.`,
          ` ${fmt(cold)} pengguna cold-start menyimpan hingga ${count(v.keep, 'interaksi', 'interaksi')} masing-masing; ${fmt(sp.removed)} interaksi dihapus.`))
      : tr(' No user has lost history yet.', ' Belum ada pengguna yang kehilangan riwayat.');
    lab.setStatus(tr(
      `${fmt(sp.users)} users by ${fmt(sp.items)} items, ${pct(seen)} of the cells seen.${coldText}${notice ? ` ${notice}` : ''}`,
      `${fmt(sp.users)} pengguna kali ${fmt(sp.items)} item, ${pct(seen)} sel terlihat.${coldText}${notice ? ` ${notice}` : ''}`));
    notice = '';
    lab.setDetail(tr(
      `Scored on ${fmt(ev.testUsers.length)} users with a held-out interaction (${fmt(ev.warmUsers.length)} warm, ${fmt(ev.coldUsers.length)} cold). Click a row to inspect that user.`,
      `Dinilai pada ${fmt(ev.testUsers.length)} pengguna yang punya interaksi disisihkan (${fmt(ev.warmUsers.length)} warm, ${fmt(ev.coldUsers.length)} cold). Klik satu baris untuk memeriksa pengguna itu.`));
    lab.describe(lab.canvas, tr(
      `Heatmap of ${fmt(sp.users)} users by ${fmt(sp.items)} items. ${fmt(sp.train.length + sp.valid.length)} cells are seen interactions, ${fmt(sp.test.length)} are held out, ${fmt(sp.hidden?.length ?? 0)} were removed from ${fmt(cold)} cold-start users. User ${S.selected} is selected.`,
      `Heatmap ${fmt(sp.users)} pengguna kali ${fmt(sp.items)} item. ${fmt(sp.train.length + sp.valid.length)} sel adalah interaksi yang terlihat, ${fmt(sp.test.length)} disisihkan, ${fmt(sp.hidden?.length ?? 0)} dihapus dari ${fmt(cold)} pengguna cold-start. Pengguna ${S.selected} dipilih.`));
  }

  const genresOf = item => {
    const a = S.split.itemAttrs?.[item];
    return a ? S.split.genreNames.filter((_, g) => a[g]).map(genreName).join(', ') : '';
  };

  function chips(items, { hits = null, tie = false, limit = MAX_CHIPS, emptyText = '' } = {}) {
    const ul = document.createElement('ul');
    ul.className = `rec-chips${tie ? ' tie' : ''}`;
    if (!items.length) {
      const li = document.createElement('li'); li.className = 'none'; li.textContent = emptyText; ul.append(li); return ul;
    }
    items.slice(0, limit).forEach((item, i) => {
      const li = document.createElement('li');
      li.textContent = fmt(item);
      const g = genresOf(item);
      const hit = hits?.[i];
      li.title = g;
      if (hit) { li.className = 'hit'; li.setAttribute('aria-label', tr(`item ${item}, actually liked`, `item ${item}, benar-benar disukai`)); }
      ul.append(li);
    });
    if (items.length > limit) { const li = document.createElement('li'); li.className = 'none'; li.textContent = `+${fmt(items.length - limit)}`; ul.append(li); }
    return ul;
  }

  function row(nameNode, listNode) {
    const r = document.createElement('div');
    r.className = 'rec-row';
    r.append(nameNode, listNode);
    return r;
  }
  function plainName(text, sub = '', color = null) {
    const d = document.createElement('div');
    d.className = 'rec-name';
    if (color) { const sw = document.createElement('i'); sw.className = 'rec-sw'; sw.style.setProperty('--c', color); sw.setAttribute('aria-hidden', 'true'); d.append(sw); }
    const span = document.createElement('span');
    span.textContent = text;
    if (sub) { const s = document.createElement('small'); s.textContent = sub; span.append(s); }
    d.append(span);
    return d;
  }

  // The model the hybrid routed this user to: the model's own name ('mf-als') mapped to the lab's name for it.
  const hybridName = source => nameOf(sourceKey(source)) ?? source;

  function writeUser(v) {
    const d = S.userData, sp = S.split;
    const scored = S.ev.testUsers.includes(d.user);
    const total = d.history.length + d.hidden.length;
    const head = document.createElement('strong');
    head.textContent = (d.cold
      ? tr(`User ${d.user}: cold start. `, `Pengguna ${d.user}: cold start. `)
      : tr(`User ${d.user}. `, `Pengguna ${d.user}. `));
    const sub = document.createElement('p');
    sub.className = 'rec-sub';
    sub.setAttribute('role', 'status');
    const parts = [d.cold
      ? tr(`${count(d.history.length, 'interaction', 'interaksi')} kept of ${fmt(total)}.`, `${fmt(d.history.length)} dari ${fmt(total)} interaksi disimpan.`)
      : tr(`${count(d.history.length, 'interaction', 'interaksi')} in the history the models see.`, `${fmt(d.history.length)} interaksi dalam riwayat yang dilihat model.`)];
    if (!scored) parts.push(tr('No held-out interaction, so this user is not scored.', 'Tidak ada interaksi yang disisihkan, jadi pengguna ini tidak ikut dinilai.'));
    sub.append(head, parts.join(' '));
    const nodes = [sub];
    nodes.push(row(plainName(tr('History the models see', 'Riwayat yang dilihat model'),
      d.genres.length ? tr(`taste: ${d.genres.slice(0, 2).map(g => genreName(g.name)).join(', ')}`, `selera: ${d.genres.slice(0, 2).map(g => genreName(g.name)).join(', ')}`) : ''),
    chips(d.history, { emptyText: tr('none', 'kosong') })));
    if (d.hidden.length) nodes.push(row(plainName(tr('Removed history', 'Riwayat yang dihapus')), chips(d.hidden)));
    nodes.push(row(plainName(tr('Liked next (held out)', 'Disukai berikutnya (disisihkan)')), chips(d.liked, { emptyText: tr('none', 'kosong') })));
    const cap = document.createElement('p');
    cap.className = 'rec-sub';
    cap.textContent = tr(`Top ${fmt(v.k)} from each recommender (a tick means the user actually liked it):`, `Top ${fmt(v.k)} dari tiap recommender (centang berarti pengguna benar-benar menyukainya):`);
    nodes.push(cap);
    for (const key of enabled()) {
      const list = d.lists[key];
      const tie = d.ties[key];
      const sub2 = key === 'hybrid' ? tr(`uses ${hybridName(d.hybridSource)}`, `memakai ${hybridName(d.hybridSource)}`)
        : tie ? tr('scores tie', 'skor sama') : '';
      nodes.push(row(plainName(nameOf(key), sub2, colorOf(key)), chips(list.map(x => x.item), { hits: list.map(x => x.hit), tie, limit: 20 })));
    }
    userBox.replaceChildren(...nodes);
  }

  // ---- drawing ------------------------------------------------------------------------------------------
  function drawAll() { drawHeat(); drawQuality(); drawSide(); drawHistory(); }

  function drawHeat() {
    if (!S.split) return;
    const { ctx, width, height, t } = setup(lab.canvas);
    const sp = S.split, U = sp.users, I = sp.items;
    const m = { l: 52, r: 10, t: 28, b: 8 };
    const pw = Math.max(20, width - m.l - m.r), ph = Math.max(20, height - m.t - m.b);
    const cw = pw / I, ch = ph / U;
    S.geom = { l: m.l, t: m.t, cw, ch, U, I, pw, ph };
    ctx.fillStyle = t.plot; ctx.fillRect(m.l, m.t, pw, ph);
    const cold = new Set(sp.cold ?? []);
    const cc = COLD_COLOR();
    const seenColor = t.accent;
    const x0 = i => Math.round(m.l + i * cw), y0 = u => Math.round(m.t + u * ch);
    // Removed history first (faint), then the seen cells, then the held-out outlines on top.
    ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = cc;
    for (let u = 0; u < U; u++) for (let i = 0; i < I; i++) if (S.cells[u * I + i] === CELL.REMOVED) ctx.fillRect(x0(i), y0(u), Math.max(1, x0(i + 1) - x0(i)), Math.max(1, y0(u + 1) - y0(u)));
    ctx.restore();
    ctx.fillStyle = seenColor;
    for (let u = 0; u < U; u++) for (let i = 0; i < I; i++) if (S.cells[u * I + i] === CELL.SEEN) ctx.fillRect(x0(i), y0(u), Math.max(1, x0(i + 1) - x0(i)), Math.max(1, y0(u + 1) - y0(u)));
    ctx.save(); ctx.globalAlpha = 0.55;
    for (let u = 0; u < U; u++) for (let i = 0; i < I; i++) if (S.cells[u * I + i] === CELL.VALID) ctx.fillRect(x0(i), y0(u), Math.max(1, x0(i + 1) - x0(i)), Math.max(1, y0(u + 1) - y0(u)));
    ctx.restore();
    ctx.strokeStyle = t.ink; ctx.lineWidth = cw >= 5 && ch >= 5 ? 1.5 : 1;
    for (let u = 0; u < U; u++) for (let i = 0; i < I; i++) if (S.cells[u * I + i] === CELL.HELD) {
      const w = Math.max(2, x0(i + 1) - x0(i)), h = Math.max(2, y0(u + 1) - y0(u));
      ctx.strokeRect(x0(i) + 0.5, y0(u) + 0.5, w - 1, h - 1);
    }
    // Cold-start users: a mark at the left of the row.
    ctx.fillStyle = cc;
    cold.forEach(u => ctx.fillRect(m.l - 8, y0(u), 5, Math.max(2, y0(u + 1) - y0(u))));
    // The selected user: a frame around the row.
    const sy = y0(S.selected);
    ctx.strokeStyle = t.ink; ctx.lineWidth = 2;
    ctx.strokeRect(m.l - 10, sy - 1, pw + 12, Math.max(3, y0(S.selected + 1) - sy) + 2);
    // Axes: item and user numbers.
    ctx.fillStyle = t.muted; ctx.font = '11px system-ui, sans-serif';
    const stepFor = (cell, steps) => steps.find(s => s * cell >= 26) ?? steps.at(-1);
    ctx.textAlign = 'center';
    const si = stepFor(cw, [5, 10, 20, 25, 50, 100]);
    for (let i = 0; i < I; i += si) ctx.fillText(fmt(i), m.l + (i + 0.5) * cw, m.t - 5);
    ctx.fillText(tr('Items', 'Item'), m.l + pw / 2, 11);
    ctx.textAlign = 'right';
    const su = stepFor(ch, [10, 20, 25, 50, 100]);
    for (let u = 0; u < U; u += su) ctx.fillText(fmt(u), m.l - 13, m.t + (u + 0.5) * ch + 4);
    ctx.save(); ctx.translate(9, m.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText(tr('Users', 'Pengguna'), 0, 0); ctx.restore();
    lab.setLegend([
      { kind: 'dot', color: seenColor, label: tr('Seen (the models can use it)', 'Terlihat (dapat dipakai model)') },
      { kind: 'ring', color: t.ink, label: tr('Held out (to be predicted)', 'Disisihkan (untuk diprediksi)') },
      { kind: 'dot', color: cc, label: tr('Removed history', 'Riwayat dihapus') },
      { kind: 'diamond', color: cc, label: tr('Cold-start user (mark at the left)', 'Pengguna cold-start (tanda di kiri)') },
    ]);
  }

  function warmColdRows(metric) {
    return enabled().map(key => ({
      label: nameOf(key), color: colorOf(key),
      bars: [{ value: metricOf(S.ev.rows[key].warm, metric) }, { value: metricOf(S.ev.rows[key].cold, metric), pale: true }],
    }));
  }

  function drawQuality() {
    const v = values(), metric = v.metric, k = v.k;
    const rows = warmColdRows(metric);
    const max = niceMax(Math.max(0.05, ...rows.flatMap(r => r.bars.map(b => b.value ?? 0))));
    qualityCanvas.closest('.card').querySelector('h2').textContent = tr(`${metricName(metric, k)}: warm and cold users`, `${metricName(metric, k)}: pengguna warm dan cold`);
    const noCold = S.ev.coldUsers.length === 0;
    drawBars(qualityCanvas, {
      rows, max, axisLabel: tr(`Mean ${metricName(metric, k)}`, `Rata-rata ${metricName(metric, k)}`),
    });
    const t = theme();
    legendInto(qualityLegend, [
      { kind: 'dot', color: t.muted, label: tr(`Warm users (${fmt(S.ev.warmUsers.length)})`, `Pengguna warm (${fmt(S.ev.warmUsers.length)})`) },
      { kind: 'ring', color: t.muted, label: noCold ? tr('Cold-start users (0): raise the share slider', 'Pengguna cold-start (0): naikkan slider proporsi') : tr(`Cold-start users (${fmt(S.ev.coldUsers.length)})`, `Pengguna cold-start (${fmt(S.ev.coldUsers.length)})`) },
    ]);
    lab.describe(qualityCanvas, tr(
      `${metricName(metric, k)} for warm and cold users. ${enabled().map(key => `${nameOf(key)}: warm ${metricOf(S.ev.rows[key].warm, metric) == null ? 'none' : f2(metricOf(S.ev.rows[key].warm, metric))}, cold ${metricOf(S.ev.rows[key].cold, metric) == null ? 'none' : f2(metricOf(S.ev.rows[key].cold, metric))}`).join('; ')}.`,
      `${metricName(metric, k)} untuk pengguna warm dan cold. ${enabled().map(key => `${nameOf(key)}: warm ${metricOf(S.ev.rows[key].warm, metric) == null ? 'kosong' : f2(metricOf(S.ev.rows[key].warm, metric))}, cold ${metricOf(S.ev.rows[key].cold, metric) == null ? 'kosong' : f2(metricOf(S.ev.rows[key].cold, metric))}`).join('; ')}.`));
  }

  function drawHistory() {
    if (historyCard.style.display === 'none') return;
    const v = values(), metric = v.metric, k = v.k;
    const keys = enabled();
    const buckets = S.ev.rows[keys[0]].all.buckets;
    const widths = { userknn: 7, itemknn: 4.5, mf: 2.5 };
    const series = keys.map(key => ({ color: colorOf(key), width: widths[key] ?? 2.5, values: S.ev.rows[key].all.buckets.map(b => metricOf(b, metric)), key }))
      .sort((a, b) => b.width - a.width);
    const max = niceMax(Math.max(0.05, ...series.flatMap(s => s.values.map(x => x ?? 0))));
    historyCanvas.closest('.card').querySelector('h2').textContent = tr(`${metricName(metric, k)} against history length`, `${metricName(metric, k)} menurut panjang riwayat`);
    drawCategoryLines(historyCanvas, {
      categories: buckets.map(b => b.label), subLabels: buckets.map(b => tr(`${fmt(b.users)} users`, `${fmt(b.users)} peng.`)), series, max,
      xLabel: tr('Interactions the models know about', 'Interaksi yang diketahui model'), yLabel: metricName(metric, k),
    });
    legendInto(historyLegend, keys.map(key => ({ kind: 'line', color: colorOf(key), label: nameOf(key) })));
    lab.describe(historyCanvas, tr(
      `${metricName(metric, k)} by history length (${buckets.map(b => `${b.label}: ${fmt(b.users)} users`).join(', ')}). ${keys.map(key => `${nameOf(key)}: ${S.ev.rows[key].all.buckets.map(b => (metricOf(b, metric) == null ? 'none' : f2(metricOf(b, metric)))).join(', ')}`).join('; ')}.`,
      `${metricName(metric, k)} menurut panjang riwayat (${buckets.map(b => `${b.label}: ${fmt(b.users)} pengguna`).join(', ')}). ${keys.map(key => `${nameOf(key)}: ${S.ev.rows[key].all.buckets.map(b => (metricOf(b, metric) == null ? 'kosong' : f2(metricOf(b, metric)))).join(', ')}`).join('; ')}.`));
  }

  function drawSide() {
    if (!S.ev) return;
    const t = theme();
    for (const [view, b] of Object.entries(tabButtons)) b.setAttribute('aria-pressed', String(S.view === view));
    const showUser = S.view === 'user';
    historyCard.style.display = '';
    userBox.style.display = showUser ? '' : 'none';
    sideCanvas.closest('.chart').style.display = showUser ? 'none' : '';
    sideLegend.style.display = showUser ? 'none' : '';
    if (showUser) { sideTitle.textContent = tr('The selected user', 'Pengguna yang dipilih'); return; }
    if (S.view === 'mf') {
      sideTitle.textContent = tr('Matrix factorization: training curve', 'Matrix factorization: kurva pelatihan');
      const h = S.models.mf.history;
      const xs = h.map(r => r.epoch);
      const series = [{ xs, ys: h.map(r => r.train), color: clusterColor(2), label: tr('Training error', 'Galat training') }];
      if (h.every(r => r.validation != null)) series.push({ xs, ys: h.map(r => r.validation), color: clusterColor(1), label: tr('Validation error', 'Galat validasi'), dash: true });
      const lo = Math.min(...series.flatMap(s => s.ys)), hi = Math.max(...series.flatMap(s => s.ys));
      drawLineChart(sideCanvas, { series, xLabel: tr('ALS sweep (epoch)', 'Putaran ALS (epoch)'), yLabel: tr('RMSE', 'RMSE'), xMin: 0, xMax: xs.at(-1), yMin: Math.max(0, lo - 0.05), yMax: hi + 0.05, integerX: true });
      legendInto(sideLegend, [
        { kind: 'line', color: clusterColor(2), label: tr(`${fmt(S.models.mf.k)} factors, lambda ${fmt(S.models.mf.lambda)}`, `${fmt(S.models.mf.k)} faktor, lambda ${fmt(S.models.mf.lambda)}`) },
      ]);
      const last = h.at(-1);
      lab.describe(sideCanvas, tr(
        `Matrix factorization error against ALS sweep. Training error falls from ${f2(h[0].train)} to ${f2(last.train)}; validation error ${last.validation == null ? 'is not available' : `ends at ${f2(last.validation)}`}.`,
        `Galat matrix factorization menurut putaran ALS. Galat training turun dari ${f2(h[0].train)} ke ${f2(last.train)}; galat validasi ${last.validation == null ? 'tidak tersedia' : `berakhir di ${f2(last.validation)}`}.`));
      return;
    }
    sideTitle.textContent = tr('Coverage and diversity', 'Cakupan dan diversitas');
    const keys = enabled();
    const rows = keys.map(key => ({ label: nameOf(key), color: colorOf(key), bars: [{ value: S.ev.rows[key].all.coverage }, { value: S.ev.rows[key].all.diversity, pale: true }] }));
    drawBars(sideCanvas, { rows, max: 1, axisLabel: tr('Share (0 to 1)', 'Proporsi (0 sampai 1)') });
    legendInto(sideLegend, [
      { kind: 'dot', color: t.muted, label: tr('Coverage: share of items recommended to anyone', 'Cakupan: proporsi item yang direkomendasikan ke siapa pun') },
      { kind: 'ring', color: t.muted, label: tr('Diversity: genre variety inside one list', 'Diversitas: ragam genre dalam satu daftar') },
    ]);
    lab.describe(sideCanvas, tr(
      `Catalogue coverage and list diversity. ${keys.map(key => `${nameOf(key)}: coverage ${f2(S.ev.rows[key].all.coverage)}, diversity ${f2(S.ev.rows[key].all.diversity ?? 0)}`).join('; ')}.`,
      `Cakupan katalog dan diversitas daftar. ${keys.map(key => `${nameOf(key)}: cakupan ${f2(S.ev.rows[key].all.coverage)}, diversitas ${f2(S.ev.rows[key].all.diversity ?? 0)}`).join('; ')}.`));
  }

  // ---- user selection -------------------------------------------------------------------------------------
  function selectUser(u) {
    S.selected = u; S.view = 'user';
    controls.set('user', u);
    schedule();
  }
  lab.on(lab.canvas, 'pointerdown', e => {
    const g = S.geom;
    if (!g) return;
    const r = lab.canvas.getBoundingClientRect();
    const y = e.clientY - r.top - g.t;
    if (y < 0 || y > g.ph) return;
    selectUser(Math.max(0, Math.min(g.U - 1, Math.floor(y / g.ch))));
  });
  lab.on(lab.canvas, 'keydown', e => {
    if (!S.split) return;
    const last = S.split.users - 1;
    const move = { ArrowUp: -1, ArrowDown: 1, PageUp: -10, PageDown: 10 }[e.key];
    if (move != null) selectUser(Math.max(0, Math.min(last, S.selected + move)));
    else if (e.key === 'Home') selectUser(0);
    else if (e.key === 'End') selectUser(last);
    else return;
    e.preventDefault();
  });

  // ---- Quick Quiz check -----------------------------------------------------------------------------------
  box.onCheck(() => {
    const v = values();
    compute(v);
    const verdict = suffersMost(S.ev.rows, 'ndcg');
    if (!verdict) return;
    const k = v.k;
    const drops = verdict.drops.map(d => `${nameOf(d.key)} ${f2(d.drop)}`).join(', ');
    const worst = verdict.drops.find(d => d.key === verdict.worst);
    const share = S.split.cold.length / Math.max(1, S.ev.testUsers.length);
    const kept = v.keep === 0 ? tr('no history kept', 'tanpa riwayat tersisa') : tr(`up to ${count(v.keep, 'interaction', 'interactions')} kept each`, `hingga ${fmt(v.keep)} interaksi tersisa pada masing-masing`);
    const why = v.keep === 0
      ? tr("User k-NN, item k-NN and matrix factorization score an item through the user's own history, so with none their scores tie. Popularity ignores the history, and the hybrid falls back to it.",
        'User k-NN, item k-NN, dan matrix factorization menilai item lewat riwayat pengguna itu sendiri, sehingga tanpa riwayat skornya sama. Popularity tidak memakai riwayat, dan hybrid beralih ke popularity.')
      : tr("User k-NN, item k-NN and matrix factorization score an item through the user's own history, so a handful of interactions gives them little to go on. Popularity ignores the history, and the hybrid uses content and popularity until a user has enough.",
        'User k-NN, item k-NN, dan matrix factorization menilai item lewat riwayat pengguna itu sendiri, sehingga beberapa interaksi saja memberi sedikit bahan. Popularity tidak memakai riwayat, dan hybrid memakai content dan popularity sampai pengguna punya cukup riwayat.');
    box.reveal(verdict.group, tr(
      `With ${pct(share)} of the scored users cold (${kept}), NDCG@${k} fell most for ${nameOf(worst.key)}: ${f2(worst.warm)} for warm users, ${f2(worst.cold)} for cold ones. Drop in NDCG@${k}, warm minus cold: ${drops}. ${why}`,
      `Dengan ${pct(share)} pengguna yang dinilai bersifat cold (${kept}), NDCG@${k} turun paling jauh pada ${nameOf(worst.key)}: ${f2(worst.warm)} untuk pengguna warm, ${f2(worst.cold)} untuk pengguna cold. Penurunan NDCG@${k}, warm dikurangi cold: ${drops}. ${why}`));
  });

  // ---- reset and redraw -----------------------------------------------------------------------------------
  lab.onReset(() => {
    S.seed = 1; S.view = 'breadth'; S.selected = -1;
    for (const [name, value] of Object.entries(PAGE_DEFAULTS)) if (name !== 'seed' && controls.get(name) !== undefined) controls.set(name, value);
    controls.set('seed', 1);
    RECOMMENDERS.forEach(key => controls.set(`show-${key}`, true));
    box.reset();
    schedule();
  });
  lab.onTheme(() => schedule());
  lab.on(document, 'fullscreenchange', () => schedule());
  lab.onResize(() => { if (S.ev) drawAll(); });
  lab.cleanup(() => box.destroy());
  refresh();
  return lab.destroy;
}
