import { startClustering, advanceClustering, clusteringCost, centroidRegions, manhattanRegions, manhattanGridSize } from './kmeans-engine.js';
import { makeDataset, SHARED_SEED } from './datasets.js';
import { tr, fmt } from '../i18n.js';
import { beginPlot, clipToPlot, clusterColor, eventToData, geometry, actionsHTML, playbackHTML, setupFullscreen, setupSpeed, setRunButton, DEFAULT_RANGE } from './common.js';

const MAX_POINTS = 1000;
const MAX_HISTORY = 5000; // steps that Previous step can undo
const CENTROID_SEED = 214; // fixed, so a given k always starts from the same data points
const MAX_SPAN = 100; // widest plot a typed-in centroid may force; wider and the 0..10 data collapses into a dot
let mounts = 0;

const kRangeText = max => tr(`0–${fmt(max)} clusters`, `0–${fmt(max)} cluster`);

export function mount(root) {
  const uid = `kmeans-${++mounts}`;
  const abort = new AbortController();
  const on = (el, type, fn) => el.addEventListener(type, fn, { signal: abort.signal });
  root.innerHTML = `
<div class="sim" data-ref="workspace">
  <section class="card plot-card">
    <div class="card-head"><div><h3>${tr('Feature space', 'Feature space')}</h3><p>${tr('Each point links to its nearest centroid. Diamonds are centroids.', 'Tiap titik tersambung ke centroid terdekatnya. Belah ketupat = centroid.')}</p></div>${actionsHTML()}</div>
    ${playbackHTML()}
    <p class="hint" data-ref="help" id="${uid}-help">${tr('Click empty space to add a centroid. Drag one to move it; right-click to edit or delete it.', 'Klik area kosong untuk menambah centroid. Seret untuk memindahkan; klik kanan untuk edit atau hapus.')}</p>
    <details class="keys-help" data-ref="keysBox" style="margin-top:4px;font-size:13px;color:var(--muted)"><summary style="cursor:pointer;padding:4px 0;font-weight:600">${tr('Keyboard help', 'Bantuan keyboard')}</summary><p class="hint" data-ref="keys" id="${uid}-keys">${tr('With the plot focused: Space selects the next centroid, arrow keys move it (hold Shift for bigger steps), Enter edits its coordinates, + adds one and Delete removes it.', 'Saat plot difokus: Spasi memilih centroid berikutnya, tombol panah menggesernya (tahan Shift untuk langkah lebih besar), Enter mengedit koordinatnya, + menambah satu, dan Delete menghapusnya.')}</p></details>
    <div data-ref="announce" role="status" aria-live="polite" aria-atomic="true" style="position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap"></div>
    <div class="plot-progress"><div><div data-ref="status" class="status"></div><p class="hint" data-ref="next"></p></div><div class="metrics"><span data-ref="iteration"></span><span data-ref="score"></span></div></div>
    <div class="chart"><canvas data-ref="plot" tabindex="0" aria-describedby="${uid}-help ${uid}-keys" aria-label="${tr('Scatter plot of data points and cluster centroids', 'Scatter plot titik data dan centroid')}"></canvas>
      <div class="ctx-menu" data-ref="menu" hidden>
        <form data-ref="coords" aria-label="${tr('Edit centroid coordinates', 'Edit koordinat centroid')}">
          <div class="coord-fields"><label><span style="display:block;font-weight:650">X</span><input data-ref="cx" type="number" step="any" required></label><label><span style="display:block;font-weight:650">Y</span><input data-ref="cy" type="number" step="any" required></label></div>
          <button type="submit" class="menu-primary">${tr('Move centroid', 'Pindahkan centroid')}</button>
          <p class="hint" data-ref="coordError" role="status" hidden></p>
        </form>
        <button type="button" class="menu-danger" data-act="delete">${tr('Delete centroid', 'Hapus centroid')}</button>
      </div></div>
    <div class="legend" data-ref="legend"></div>
  </section>
  <aside class="card settings"><h3>${tr('Parameters', 'Parameter')}</h3>
    <label>${tr('Dataset', 'Dataset')}<select data-ref="dataset"><option value="clusters">${tr('Overlapping clusters', 'Cluster tumpang tindih')}</option><option value="rings">${tr('Concentric rings', 'Cincin konsentris')}</option><option value="checker">${tr('Checkerboard', 'Papan catur')}</option></select></label>
    <label>${tr('Distance', 'Jarak')}<select data-ref="metric"><option value="euclidean">${tr('Euclidean (squared)', 'Euclidean (kuadrat)')}</option><option value="manhattan">Manhattan</option><option value="cosine">${tr('Cosine', 'Cosine')}</option></select></label>
    <p class="hint" data-ref="metricHint" id="${uid}-metric-hint">${tr('Place a centroid first to see the effect', 'Taruh centroid dulu untuk melihat efeknya')}</p>
    <label>${tr('Number of points', 'Jumlah titik')}<span class="row"><input data-ref="count" type="number" min="1" max="${MAX_POINTS}" step="1" value="48"><button type="button" data-act="randomize">${tr('Randomize', 'Acak')}</button></span></label>
    <label>${tr('Number of clusters (k)', 'Jumlah cluster (k)')}<span class="row"><input data-ref="k" type="number" min="0" max="48" step="1" value="0"><button type="button" data-act="reseed">${tr('Randomize centroids', 'Acak centroid')}</button></span></label>
    <label class="toggle"><input data-ref="boundaries" type="checkbox" checked> ${tr('Show cluster boundaries', 'Tampilkan batas cluster')}</label>
    <p class="hint" data-ref="boundaryHint" id="${uid}-boundary-hint">${tr('Place a centroid first to see the effect', 'Taruh centroid dulu untuk melihat efeknya')}</p>
    <label class="toggle"><input data-ref="showCoords" type="checkbox"> ${tr('Show centroid coordinates', 'Tampilkan koordinat centroid')}</label>
    <p class="hint" data-ref="kRange"><span data-ref="kRangeText">${kRangeText(48)}</span>${tr('. Leave it at 0 and click the plot to place centroids yourself.', '. Biarkan 0, lalu klik plot untuk menaruh centroid sendiri.')}</p>
    <p class="hint" data-ref="boundaryNote" hidden>${tr('Manhattan shading uses a grid, so edges can look stepped. Points are still assigned by exact Manhattan distance.', 'Shading Manhattan memakai grid, sehingga tepinya dapat terlihat bergerigi. Titik tetap dikelompokkan berdasarkan jarak Manhattan yang sebenarnya.')}</p>
  </aside>
</div>
<section class="card table-card"><h3>${tr('Cluster summary', 'Ringkasan cluster')}</h3><div class="table-scroll"><table><thead><tr><th>${tr('Cluster', 'Cluster')}</th><th>${tr('Points', 'Titik')}</th><th>${tr('Centroid · Feature 1', 'Centroid · Feature 1')}</th><th>${tr('Centroid · Feature 2', 'Centroid · Feature 2')}</th></tr></thead><tbody data-ref="summary"></tbody></table></div></section>`;

  const ref = name => root.querySelector(`[data-ref="${name}"]`);
  const act = name => root.querySelector(`[data-act="${name}"]`);
  const canvas = ref('plot');
  const ctx = canvas.getContext('2d');

  let dataSeed = SHARED_SEED, history = [], points, model, timer, running = false, startCentroids = [], drag = null, selected = -1, suppressClick = false;

  const playback = setupSpeed(ref('speed'), ref('speedValue'), () => { if (running) schedule(); });
  setupFullscreen(ref('workspace'), act('fullscreen'), abort.signal);

  const metric = () => ref('metric').value;
  // 48 is the default for an empty or unparsable field only; a typed 0 clamps to 1.
  const countValue = () => {
    const n = Math.round(ref('count').valueAsNumber);
    return Math.max(1, Math.min(MAX_POINTS, Number.isFinite(n) ? n : 48));
  };
  const maxK = () => countValue();
  const kValue = () => Math.max(0, Math.min(maxK(), Math.round(Number(ref('k').value)) || 0));
  const COSINE_RADIUS = 8; // cosine centroids are drawn at this fixed distance from the origin

  // The plot is a square over 0..10 that grows to include any centroid typed in
  // outside it, as in the reference.
  const baseRange = () => DEFAULT_RANGE;

  function expandedRange(centroids, base = baseRange()) {
    let { minX, minY } = base;
    let maxX = minX + base.span, maxY = minY + base.span;
    for (const { x, y } of centroids) {
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    return { ...base, minX, minY, span: Math.max(base.span, maxX - minX, maxY - minY) };
  }

  const currentRange = () => expandedRange(model?.centroids ?? []);

  function pause() { clearTimeout(timer); running = false; }

  function start(centroids) {
    pause();
    closeMenu();
    startCentroids = centroids.map(c => ({ ...c }));
    history = [];
    points = makeDataset(ref('dataset').value, dataSeed, countValue());
    model = startClustering(points, startCentroids.length, CENTROID_SEED, startCentroids.map(c => ({ ...c })), metric(), COSINE_RADIUS);
    if (selected >= startCentroids.length) selected = -1;
    ref('k').value = startCentroids.length;
    ref('k').max = maxK();
    ref('kRangeText').textContent = kRangeText(maxK());
    render();
  }

  // Random starting centroids drawn from the data, as the reference does.
  function seedCentroids(n) {
    const pts = makeDataset(ref('dataset').value, dataSeed, countValue());
    return startClustering(pts, Math.min(n, pts.length), CENTROID_SEED, undefined, metric(), 8).centroids;
  }

  const reset = () => { selected = -1; start(startCentroids); };

  const LIMIT = 1000;
  const reachedLimit = () => model.phase !== 'done' && model.iteration >= LIMIT;
  const assigning = () => model.nextAssignments.length > 0;

  // One advance assigns `batch` points (a single point per "Next step"), or
  // moves the centroids. Instant speed finishes a whole phase per advance.
  function advance(batch = 1) {
    if (!model.centroids.length || reachedLimit() || model.phase === 'done') return;
    selected = -1;
    history.push(model);
    if (history.length > MAX_HISTORY) history.shift();
    model = advanceClustering(points, model, playback.instant, batch);
    if (model.phase === 'done' || reachedLimit()) pause();
    render();
    if (running) schedule();
  }

  function schedule() {
    clearTimeout(timer);
    const delay = (assigning() ? 125 : 850) / playback.multiplier;
    const batch = assigning() && !playback.instant ? Math.max(1, Math.ceil(16 / delay)) : 1;
    const steps = Math.min(batch, points.length - model.nextAssignments.length);
    timer = setTimeout(() => advance(steps), playback.instant ? 250 : Math.max(assigning() ? 0 : 16, delay * steps));
  }

  // Built when drawn, so the current language applies.
  const phaseDetails = () => ({
    ready: [tr('Ready', 'Siap'), tr('Next · assign points to the nearest centroid', 'Berikutnya · titik masuk ke centroid terdekat')],
    update: [tr('Points assigned', 'Titik sudah dikelompokkan'), tr('Next · update cluster centers', 'Berikutnya · pindahkan centroid ke pusat cluster')],
    assign: [tr('Centroids updated', 'Centroid sudah bergeser'), tr('Next · reassign points using the new centroids', 'Berikutnya · kelompokkan ulang titik dengan centroid baru')],
    done: [tr('Converged', 'Konvergen'), tr('Point assignments stabilized.', 'Pembagian titik sudah stabil.')],
  });

  const visible = () => (assigning() ? model.nextAssignments : model.assignments);

  function describe() {
    const m = model;
    if (!m.centroids.length) return [tr('No centroids yet', 'Belum ada centroid'), tr('Click the plot to place the first centroid, or enter a cluster count.', 'Klik plot untuk menaruh centroid pertama, atau isi jumlah cluster.')];
    if (reachedLimit()) return [tr(`Stopped after ${fmt(LIMIT)} iterations`, `Berhenti setelah ${fmt(LIMIT)} iterasi`), tr('Reset or change the starting centroids to try another run.', 'Reset atau ganti centroid awal untuk mencoba lagi.')];
    if (assigning()) {
      const v = m.nextAssignments;
      return [tr('Assigning points', 'Mengelompokkan titik'), tr(`Point ${fmt(v.length)} of ${fmt(points.length)} → Cluster ${fmt(v.at(-1) + 1)}`, `Titik ${fmt(v.length)} dari ${fmt(points.length)} → Cluster ${fmt(v.at(-1) + 1)}`)];
    }
    return phaseDetails()[m.assignments.length ? m.phase : 'ready'];
  }

  const f2 = v => fmt(v, { digits: 2 });

  // Screen readers hear the status only when the lab is not running: phase text
  // changes dozens of times a second at high speed, so a run announces its start,
  // then its pause or completion, not every point.
  let announced = '';
  function announce(text) {
    if (text === announced) return;
    announced = text;
    ref('announce').textContent = text;
  }

  function render() {
    const m = model;
    const [status, next] = describe();
    ref('status').textContent = status;
    ref('next').textContent = next;
    if (!running) announce(`${status}. ${next}`);
    ref('iteration').textContent = `${tr('Iteration', 'Iterasi')} ${fmt(m.iteration)}`;
    ref('score').textContent = `${metric() === 'euclidean' ? 'Inertia' : tr('Total distance', 'Total jarak')} · ${m.assignments.length && !assigning() ? f2(clusteringCost(points, m)) : '—'}`;
    setRunButton(act('run'), running ? 'pause' : m.phase === 'done' ? 'again' : 'run');
    act('run').disabled = !m.centroids.length || reachedLimit();
    act('prev').disabled = running || !history.length;
    act('step').disabled = running || !m.centroids.length || reachedLimit() || m.phase === 'done';
    act('reseed').disabled = !m.centroids.length;
    ref('boundaryNote').hidden = metric() !== 'manhattan' || !ref('boundaries').checked;
    // These two controls only change what is drawn or assigned once centroids exist.
    const noCentroids = !m.centroids.length;
    for (const [hint, control] of [['metricHint', 'metric'], ['boundaryHint', 'boundaries']]) {
      ref(hint).hidden = !noCentroids;
      if (noCentroids) ref(control).setAttribute('aria-describedby', ref(hint).id); else ref(control).removeAttribute('aria-describedby');
    }
    const editable = canEdit();
    ref('help').hidden = !editable;
    ref('keysBox').hidden = !editable;
    canvas.style.cursor = editable && m.centroids.length < maxK() ? 'crosshair' : 'default';
    const vis = visible();
    ref('legend').replaceChildren(...[
      legendItem('diamond', null, 'Centroid'),
      ...(vis.length < points.length ? [legendItem('dot', '#6e7b8f', tr('Unassigned', 'Belum dikelompokkan'))] : []),
      ...m.centroids.map((_, i) => legendItem('dot', clusterColor(i), `${tr('Cluster', 'Cluster')} ${i + 1}`)),
    ]);
    const tb = ref('summary');
    tb.replaceChildren();
    m.centroids.forEach((c, i) => {
      const row = document.createElement('tr');
      const td = document.createElement('th');
      td.scope = 'row';
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.background = clusterColor(i);
      td.append(dot, `${tr('Cluster', 'Cluster')} ${i + 1}`);
      row.append(td, ...[fmt(vis.filter(a => a === i).length), f2(c.x), f2(c.y)].map(v => { const c2 = document.createElement('td'); c2.textContent = v; return c2; }));
      tb.append(row);
    });
    if (!m.centroids.length) {
      const row = document.createElement('tr'), td = document.createElement('td');
      td.colSpan = 4; td.textContent = tr('No centroids yet.', 'Belum ada centroid.');
      row.append(td); tb.append(row);
    }
    draw();
  }

  function draw() {
    const range = currentRange();
    const g = beginPlot(canvas, ctx, tr('Feature 1', 'Feature 1'), tr('Feature 2', 'Feature 2'), range);
    const m = model;
    const centroids = m.centroids.map((c, i) => (drag?.position && drag.index === i ? drag.position : c));
    if (ref('boundaries').checked && m.iteration > 0) {
      ctx.save();
      clipToPlot(ctx, g);
      if (metric() === 'manhattan') {
        const regions = manhattanRegions(m.assignmentCentroids, range);
        const cell = g.size / manhattanGridSize;
        regions.forEach((c, i) => {
          ctx.globalAlpha = .12;
          ctx.fillStyle = clusterColor(c);
          ctx.fillRect(g.px(range.minX) + (i % manhattanGridSize) * cell, g.py(range.minY + range.span) + Math.floor(i / manhattanGridSize) * cell, cell + .5, cell + .5);
        });
        // Boundary lines where neighboring grid cells belong to different clusters.
        ctx.globalAlpha = .45;
        ctx.strokeStyle = g.t.muted;
        ctx.beginPath();
        regions.forEach((c, i) => {
          const col = i % manhattanGridSize, row = Math.floor(i / manhattanGridSize);
          const x = g.px(range.minX) + col * cell, y = g.py(range.minY + range.span) + row * cell;
          if (col && regions[i - 1] !== c) { ctx.moveTo(x, y); ctx.lineTo(x, y + cell); }
          if (row && regions[i - manhattanGridSize] !== c) { ctx.moveTo(x, y); ctx.lineTo(x + cell, y); }
        });
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        centroidRegions(m.assignmentCentroids, metric(), range).forEach((poly, i) => {
          if (poly.length < 3) return;
          ctx.beginPath();
          poly.forEach((p, j) => (j ? ctx.lineTo(g.px(p.x), g.py(p.y)) : ctx.moveTo(g.px(p.x), g.py(p.y))));
          ctx.closePath();
          ctx.fillStyle = clusterColor(i);
          ctx.strokeStyle = clusterColor(i);
          ctx.globalAlpha = .1;
          ctx.fill();
          ctx.globalAlpha = .45;
          ctx.stroke();
          ctx.globalAlpha = 1;
        });
      }
      ctx.restore();
    }
    const vis = visible();
    const highlight = assigning() || (m.phase === 'update' && !playback.instant);
    const active = highlight ? vis.length - 1 : -1;
    const activeCluster = vis[active];
    vis.forEach((cluster, i) => {
      ctx.globalAlpha = i === active ? 1 : .28;
      ctx.lineWidth = i === active ? 2.5 : 1;
      ctx.strokeStyle = clusterColor(cluster);
      ctx.beginPath();
      ctx.moveTo(g.px(points[i].x), g.py(points[i].y));
      ctx.lineTo(g.px(centroids[cluster].x), g.py(centroids[cluster].y));
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    points.forEach((p, i) => {
      ctx.beginPath();
      ctx.fillStyle = vis[i] === undefined ? g.t.muted : clusterColor(vis[i]);
      ctx.arc(g.px(p.x), g.py(p.y), i === active ? 7 : 4.6, 0, 2 * Math.PI);
      ctx.fill();
      if (i === active) { ctx.strokeStyle = g.t.ink; ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineWidth = 1; }
    });
    ctx.textAlign = 'center';
    centroids.forEach((c, i) => {
      const x = g.px(c.x), y = g.py(c.y);
      const r = i === selected ? 12 : 9;
      ctx.beginPath();
      ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
      ctx.fillStyle = clusterColor(i);
      ctx.fill();
      ctx.lineWidth = i === selected ? 3 : 2;
      ctx.strokeStyle = i === activeCluster || i === selected ? g.t.ink : g.t.plot;
      ctx.stroke();
      ctx.lineWidth = 1;
    });
    // Labels come last so no diamond covers one. Each has a plot-coloured halo
    // (readable over points and spokes) and stays inside the plot square.
    const showCoords = ref('showCoords').checked;
    const left = g.px(g.range.minX), right = g.px(g.range.minX + g.range.span);
    const top = g.py(g.range.minY + g.range.span), bottom = g.py(g.range.minY);
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    centroids.forEach((c, i) => {
      const label = showCoords ? `${i + 1} (${f2(c.x)}${tr(', ', '; ')}${f2(c.y)})` : String(i + 1);
      const half = ctx.measureText(label).width / 2;
      const x = Math.max(left + half + 2, Math.min(right - half - 2, g.px(c.x)));
      const cy = g.py(c.y);
      const y = Math.max(top + 12, Math.min(bottom - 4, cy - 14 < top + 10 ? cy + 24 : cy - 14));
      ctx.strokeStyle = g.t.plot;
      ctx.strokeText(label, x, y);
      ctx.fillStyle = g.t.ink;
      ctx.fillText(label, x, y);
    });
    ctx.lineJoin = 'miter';
    ctx.lineWidth = 1;
  }

  function centroidAt(event) {
    const g = geometry(canvas, currentRange());
    let best = -1, bestD = 14;
    model.centroids.forEach((c, i) => {
      const d = Math.hypot(event.clientX - g.left - g.px(c.x), event.clientY - g.top - g.py(c.y));
      if (d < bestD) { best = i; bestD = d; }
    });
    return best;
  }

  // Starting centroids can be edited only before the first assignment begins.
  const canEdit = () => !running && model.phase === 'assign' && model.iteration === 0 && !assigning();
  function legendItem(kind, color, label) {
    const span = document.createElement('span');
    const i = document.createElement('i');
    i.className = kind;
    if (color) i.style.background = color;
    span.append(i, ` ${label}`);
    return span;
  }
  const inside = e => { const g = geometry(canvas, currentRange()), r = g.range; const x = e.clientX - g.left, y = e.clientY - g.top; return x >= g.px(r.minX) && x <= g.px(r.minX + r.span) && y >= g.py(r.minY + r.span) && y <= g.py(r.minY); };

  // ----- pointer editing: click adds one centroid, drag moves, click selects -----
  on(canvas, 'pointerdown', e => {
    if (!e.isPrimary || e.button !== 0) return;
    suppressClick = false;
    if (!canEdit()) return;
    const index = centroidAt(e);
    if (index < 0) return;
    drag = { index, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, position: null };
    canvas.setPointerCapture(e.pointerId);
  });
  on(canvas, 'pointermove', e => {
    if (drag?.pointerId !== e.pointerId) return;
    if (!drag.position && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 4) return;
    drag.position = eventToData(canvas, e, currentRange());
    selected = drag.index;
    draw();
  });
  on(canvas, 'pointerup', e => {
    if (drag?.pointerId !== e.pointerId) return;
    const { index, position } = drag;
    drag = null;
    if (!position) return;
    suppressClick = true;
    selected = index;
    start(model.centroids.map((c, i) => (i === index ? position : c)));
  });
  const cancelDrag = e => { if (drag?.pointerId === e.pointerId) { drag = null; draw(); } };
  on(canvas, 'pointercancel', cancelDrag);
  on(canvas, 'lostpointercapture', cancelDrag);
  on(canvas, 'click', e => {
    if (suppressClick || !canEdit()) return;
    const hit = centroidAt(e);
    selected = hit;
    if (hit >= 0 || !inside(e) || model.centroids.length >= maxK()) { draw(); return; }
    const added = eventToData(canvas, e, currentRange());
    selected = model.centroids.length;
    start([...model.centroids, added]);
  });

  // ----- right-click menu: edit coordinates or delete -----
  const menu = ref('menu');
  let shown = null; // what the editor displayed for the centroid being edited, plus its exact coordinates
  function closeMenu() { menu.hidden = true; }
  // Opens the form for `target`, placed at client point (clientX, clientY). It
  // opens below that point, flips above it when there is no room, and stays
  // inside the chart either way.
  function openMenu(target, clientX, clientY) {
    selected = target;
    // Show 2 decimals but keep the stored value exact: a field left as shown keeps the full-precision coordinate.
    const c = model.centroids[target];
    shown = { x: String(Number(c.x.toFixed(2))), y: String(Number(c.y.toFixed(2))), orig: { ...c } };
    ref('cx').value = shown.x;
    ref('cy').value = shown.y;
    ref('coordError').hidden = true;
    menu.hidden = false;
    const hostEl = menu.offsetParent;
    const host = hostEl?.getBoundingClientRect() ?? { left: 0, top: 0 };
    const hostW = hostEl?.clientWidth ?? 600, hostH = hostEl?.clientHeight ?? 400;
    const w = menu.offsetWidth, h = menu.offsetHeight;
    const wantTop = clientY - host.top;
    const top = wantTop + h > hostH ? wantTop - h : wantTop;
    menu.style.left = `${Math.max(0, Math.min(clientX - host.left, hostW - w))}px`;
    menu.style.top = `${Math.max(0, Math.min(top, hostH - h))}px`;
    ref('cx').focus();
    ref('cx').select();
    draw();
  }
  on(canvas, 'contextmenu', e => {
    if (!canEdit()) return;
    const hit = centroidAt(e);
    const target = hit >= 0 ? hit : selected;
    if (target < 0 || !model.centroids[target]) return;
    e.preventDefault();
    openMenu(target, e.clientX, e.clientY);
  });
  on(ref('coords'), 'submit', e => {
    e.preventDefault();
    const untouched = (field, key) => shown && ref(field).value === shown[key];
    const x = untouched('cx', 'x') ? shown.orig.x : ref('cx').valueAsNumber;
    const y = untouched('cy', 'y') ? shown.orig.y : ref('cy').valueAsNumber;
    if (!canEdit() || selected < 0 || !Number.isFinite(x) || !Number.isFinite(y)) return;
    const next = model.centroids.map((c, i) => (i === selected ? { x, y } : c));
    // Not finite is covered too: Infinity > MAX_SPAN.
    if (!(expandedRange(next).span <= MAX_SPAN)) {
      ref('coordError').textContent = tr(`That is too far out to display. Keep the centroids within a span of ${fmt(MAX_SPAN)} so the data stays visible.`, `Terlalu jauh untuk ditampilkan. Jaga centroid dalam rentang ${fmt(MAX_SPAN)} supaya data tetap terlihat.`);
      ref('coordError').hidden = false;
      return;
    }
    start(next);
    canvas.focus();
  });
  function removeSelected() {
    if (!canEdit() || selected < 0) return;
    const i = selected;
    selected = -1;
    start(model.centroids.filter((_, j) => j !== i));
    canvas.focus();
  }
  on(act('delete'), 'click', removeSelected);

  // ----- keyboard: the plot is a roving single stop, so everything the pointer can do has a key -----
  const describeCentroid = i => tr(`Centroid ${fmt(i + 1)} at (${f2(model.centroids[i].x)}, ${f2(model.centroids[i].y)})`, `Centroid ${fmt(i + 1)} di (${f2(model.centroids[i].x)}; ${f2(model.centroids[i].y)})`);
  const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
  on(canvas, 'keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const n = model.centroids.length;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selected >= 0 && canEdit()) { e.preventDefault(); removeSelected(); }
      return;
    }
    if (!canEdit()) return;
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      if (!n) return;
      selected = ((selected < 0 ? (e.shiftKey ? 0 : -1) : selected) + (e.shiftKey ? n - 1 : 1)) % n;
      draw();
      announce(describeCentroid(selected));
    } else if (ARROWS[e.key]) {
      e.preventDefault();
      if (!n) return;
      if (selected < 0) { selected = 0; draw(); announce(describeCentroid(0)); return; }
      const r = currentRange(), step = r.span / (e.shiftKey ? 10 : 50);
      const c = model.centroids[selected];
      const [dx, dy] = ARROWS[e.key];
      const moved = {
        x: Math.max(r.minX, Math.min(r.minX + r.span, c.x + dx * step)),
        y: Math.max(r.minY, Math.min(r.minY + r.span, c.y + dy * step)),
      };
      const index = selected;
      start(model.centroids.map((p, i) => (i === index ? moved : p)));
      selected = index;
      draw();
      announce(describeCentroid(index));
    } else if (e.key === 'Enter') {
      if (selected < 0 || !model.centroids[selected]) return;
      e.preventDefault();
      const g = geometry(canvas, currentRange()), c = model.centroids[selected];
      openMenu(selected, g.left + g.px(c.x), g.top + g.py(c.y));
    } else if (e.key === '+' || e.key === '=') {
      if (n >= maxK()) return;
      e.preventDefault();
      const r = currentRange();
      start([...model.centroids, { x: r.minX + r.span / 2, y: r.minY + r.span / 2 }]);
      selected = n;
      draw();
      announce(describeCentroid(n));
    }
  });
  on(document, 'pointerdown', e => { if (!menu.hidden && !menu.contains(e.target)) closeMenu(); });
  on(document, 'keydown', e => { if (e.key === 'Escape' && !menu.hidden) { closeMenu(); canvas.focus(); } });

  // ----- controls -----
  on(act('run'), 'click', () => {
    if (act('run').disabled) return;
    if (running) { pause(); render(); return; }
    if (reachedLimit()) return;
    if (model.phase === 'done') reset();
    running = true;
    announce(tr('Running', 'Berjalan'));
    advance();
  });
  on(act('step'), 'click', () => { if (!act('step').disabled) advance(); });
  // advanceClustering returns a new model each time and never mutates the old one,
  // so undoing a step is just restoring the previous model.
  on(act('prev'), 'click', () => {
    if (act('prev').disabled) return;
    model = history.pop();
    selected = -1;
    render();
  });
  on(act('reset'), 'click', reset);
  // Randomize points keeps the current centroids where they are; Randomize
  // centroids keeps the points. They are independent, as in the reference.
  on(act('randomize'), 'click', () => {
    const keep = model.centroids;
    dataSeed = Math.floor(Math.random() * 2 ** 32);
    start(keep);
  });
  on(act('reseed'), 'click', () => {
    if (!model.centroids.length) return;
    const r = currentRange();
    selected = -1;
    start(Array.from({ length: model.centroids.length }, () => ({ x: r.minX + Math.random() * r.span, y: r.minY + Math.random() * r.span })));
  });
  // Changing k, the dataset or the point count draws fresh starting centroids
  // from the data; changing the distance keeps them.
  on(ref('k'), 'change', () => {
    const n = kValue();
    ref('k').value = n;
    start(seedCentroids(n));
  });
  on(ref('dataset'), 'change', () => {
    dataSeed = SHARED_SEED;
    start(seedCentroids(model.centroids.length));
  });
  on(ref('metric'), 'change', () => start(startCentroids));
  on(ref('count'), 'change', () => {
    ref('count').value = countValue();
    start(seedCentroids(Math.min(model.centroids.length, countValue())));
  });
  on(ref('boundaries'), 'change', render);
  on(ref('showCoords'), 'change', draw);

  on(window, 'themechange', render);
  const ro = new ResizeObserver(() => draw());
  ro.observe(canvas);

  start([]);
  return () => { pause(); ro.disconnect(); abort.abort(); };
}
