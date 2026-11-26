import { startDbscan, advanceDbscan, pointType, nearestInDirection } from './dbscan-engine.js';
import { tr, fmt } from '../i18n.js';
import { beginPlot, clipToPlot, clusterColor, geometry, actionsHTML, playbackHTML, setupFullscreen, setupSpeed, setRunButton } from './common.js';

const outliers = [{ x: .7, y: 1.05 }, { x: 9.25, y: .8 }, { x: .6, y: 8.8 }, { x: 9.35, y: 9.15 }];

function datasetPoints(name, seed, count) {
  let state = seed;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32; };
  const outlierCount = name === 'moons' ? 0 : Math.floor(count / 20);
  const signalCount = count - outlierCount;
  const firstGroup = name === 'clusters' ? Math.ceil(signalCount * .57) : Math.ceil(signalCount / 2);
  const sample = Array.from({ length: signalCount }, (_, index) => {
    const second = index >= firstGroup;
    const groupIndex = second ? index - firstGroup : index;
    const groupSize = second ? signalCount - firstGroup : firstGroup;
    const fraction = (groupIndex + .12 * (random() - .5)) / groupSize;
    if (name === 'rings') {
      const angle = 2 * Math.PI * (fraction + (second ? .4 / groupSize : 0));
      const r = (second ? 3.8 : 1.7) + .18 * (random() - .5);
      return { x: 5 + r * Math.cos(angle), y: 5 + r * Math.sin(angle) };
    }
    if (name === 'moons') {
      const angle = Math.PI * fraction;
      const r = 2.35 + .3 * (random() - .5);
      return { x: (second ? 6.2 : 3.85) + r * Math.cos(angle), y: (second ? 5.6 : 4.4) + (second ? -1 : 1) * r * Math.sin(angle) };
    }
    const r = (second ? 2.2 : .95) * Math.sqrt((groupIndex + 1) / groupSize);
    const angle = groupIndex * 2.39996 + .2 * random();
    return { x: (second ? 6.9 : 2.5) + r * Math.cos(angle), y: (second ? 4.65 : 6.25) + r * Math.sin(angle) };
  });
  for (let i = 0; i < outlierCount; i++) {
    const corner = outliers[i % outliers.length];
    sample.push({ x: corner.x + .55 * (random() - .5), y: corner.y + .55 * (random() - .5) });
  }
  for (let i = sample.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [sample[i], sample[j]] = [sample[j], sample[i]];
  }
  return sample;
}

// Built when drawn, so the text follows the current language.
const phaseText = () => ({
  ready: tr('Ready to explore', 'Siap dicoba'),
  seed: tr('New cluster started', 'Cluster baru dimulai'),
  expand: tr('Cluster expanded', 'Cluster membesar'),
  border: tr('Border point added', 'Border point ditambahkan'),
  noise: tr('Point marked as noise', 'Titik ditandai sebagai noise'),
  done: tr('Clustering complete', 'Clustering selesai')
});
const typeText = () => ({
  core: tr('core', 'core'),
  border: tr('border', 'border'),
  noise: tr('noise', 'noise'),
  unvisited: tr('unvisited', 'belum dicek')
});

let mounts = 0;
export function mount(root) {
  const uid = `dbscan-${++mounts}`;
  const abort = new AbortController();
  const on = (el, type, fn) => el.addEventListener(type, fn, { signal: abort.signal });
  root.innerHTML = `
<div class="sim" data-ref="workspace">
  <section class="card plot-card">
    <div class="card-head"><div><h3>${tr('Feature space', 'Feature space')}</h3><p>${tr('Click a point to inspect its ε-neighborhood.', 'Klik satu titik untuk melihat ε-neighborhood-nya.')}</p></div>${actionsHTML()}</div>
    ${playbackHTML()}
    <details class="keys-help" style="margin-top:4px;font-size:13px;color:var(--muted)"><summary style="cursor:pointer;padding:4px 0;font-weight:600">${tr('Keyboard help', 'Bantuan keyboard')}</summary><p class="hint" id="${uid}-keys">${tr('With the plot focused: arrow keys move to the nearest point in that direction, and Esc goes back to following the run.', 'Saat plot difokus: tombol panah berpindah ke titik terdekat ke arah itu, dan Esc kembali mengikuti animasi.')}</p></details>
    <div class="plot-progress"><div><div class="status" data-ref="status" role="status"></div><p class="hint" data-ref="detail"></p></div><div class="metrics"><span data-ref="visited"></span></div></div>
    <div class="chart"><canvas data-ref="plot" tabindex="0" aria-describedby="${uid}-keys" aria-label="${tr('Scatter plot of points with their DBSCAN classifications', 'Scatter plot titik-titik beserta hasil klasifikasi DBSCAN')}"></canvas></div>
    <div class="legend"><span><i class="db-marker core"></i> ${tr('Core', 'Core')}</span><span><i class="db-marker border"></i> ${tr('Border', 'Border')}</span><span><i class="db-marker noise">×</i> ${tr('Noise', 'Noise')}</span><span><i class="db-marker unvisited"></i> ${tr('Unvisited', 'Belum dicek')}</span><span><i class="db-marker radius"></i> ${tr('ε-neighborhood', 'ε-neighborhood')}</span><span><i class="db-marker" style="width:13px;height:13px;border:1.5px solid var(--accent);background:radial-gradient(circle,var(--muted) 0 2px,var(--accent-soft) 2.5px)"></i> ${tr('Neighbor inside ε', 'Tetangga di dalam ε')}</span></div>
  </section>
  <aside class="side">
    <section class="card settings"><h3>${tr('Parameters', 'Parameter')}</h3>
      <label>${tr('Dataset', 'Dataset')}<select data-ref="dataset"><option value="rings">${tr('Rings and outliers', 'Ring dan outlier')}</option><option value="moons">${tr('Two moons', 'Dua bulan sabit')}</option><option value="clusters">${tr('Uneven density', 'Density tidak merata')}</option></select></label>
      <label>${tr('Number of points', 'Jumlah titik')}<span class="row"><input data-ref="count" type="number" min="1" max="1000" step="1" value="80" required><button type="button" data-act="randomize">${tr('Randomize points', 'Acak ulang')}</button></span></label>
      <label>${tr('Neighborhood radius (ε)', 'Radius neighborhood (ε)')}<input data-ref="epsilon" type="number" min="0" step="any" value="1.35" required></label>
      <label>${tr('Minimum points (MinPts)', 'MinPts (titik minimum)')}<input data-ref="minPoints" type="number" min="1" step="1" value="4" required></label>
      <p class="hint" data-ref="applyHint">${tr('Applies when you press Run.', 'Berlaku saat tombol Jalankan ditekan.')}</p>
      <label class="toggle"><input data-ref="neighborhood" type="checkbox" checked> ${tr('Show ε-neighborhood', 'Tampilkan ε-neighborhood')}</label>
      <p class="hint">${tr('MinPts includes the point being checked. Changing a parameter restarts the run.', 'MinPts sudah termasuk titik yang sedang dicek. Jika parameter diubah, proses dimulai dari awal.')}</p>
    </section>
    <section class="card settings"><h3>${tr('Results', 'Hasil')}</h3>
      <dl class="counts"><div><dt>${tr('Clusters', 'Cluster')}</dt><dd data-ref="clusters">0</dd></div><div><dt>${tr('Core', 'Core')}</dt><dd data-ref="core">0</dd></div><div><dt>${tr('Border', 'Border')}</dt><dd data-ref="border">0</dd></div><div><dt>${tr('Noise', 'Noise')}</dt><dd data-ref="noise">0</dd></div></dl>
    </section>
  </aside>
</div>
<!-- A second .sim wrapper (single column) so the inspector's button gets the same panel-button styling as the toolbar. -->
<div class="sim" style="display:block"><section class="card table-card"><h3>${tr('Point inspector', 'Periksa titik')}</h3><p class="hint">${tr('Select a point on the plot or choose its number here.', 'Klik titik di plot, atau pilih nomornya di sini.')}</p>
  <div class="inspector"><label style="font-weight:650;color:var(--muted)">${tr('Point', 'Titik')} <select data-ref="inspect" style="padding:7px 10px;border-radius:8px;font-size:13px;font-weight:600;min-width:5.5rem;margin-left:4px"></select></label><button type="button" data-act="follow">${tr('Follow playback', 'Ikuti animasi')}</button></div>
  <p class="hint" data-ref="inspection" aria-live="polite"></p></section></div>`;

  const ref = n => root.querySelector(`[data-ref="${n}"]`);
  const act = n => root.querySelector(`[data-act="${n}"]`);
  const canvas = ref('plot');
  canvas.classList.add('pointer');
  const ctx = canvas.getContext('2d');
  let seed = 520, stepsTaken = 0, points, model, selected = -1, timer, running = false;
  const radius = () => Math.max(0, Number(ref('epsilon').value) || 0);
  const minimum = () => Math.max(1, Math.round(Number(ref('minPoints').value)) || 1);
  const count = () => Math.max(1, Math.min(1000, Math.round(Number(ref('count').value)) || 80));
  // Invalid entries snap back to the last valid value instead of silently restarting.
  const last = { epsilon: 1.35, minPoints: 4, count: 80 };
  function parameterChanged(name, normalize) {
    const input = ref(name);
    const next = Number.isFinite(input.valueAsNumber) ? normalize(input.valueAsNumber) : last[name];
    input.value = next;
    if (next === last[name]) return;
    last[name] = next;
    reset();
  }

  const playback = setupSpeed(ref('speed'), ref('speedValue'), () => { if (running) schedule(); });
  setupFullscreen(ref('workspace'), act('fullscreen'), abort.signal);

  function pause() { clearTimeout(timer); running = false; }
  function reset() {
    pause();
    points = datasetPoints(ref('dataset').value, seed, count());
    model = startDbscan(points, radius(), minimum());
    stepsTaken = 0;
    selected = -1;
    // The first option is a placeholder for "no point selected", so the select is never blank.
    ref('inspect').replaceChildren(new Option('–', ''), ...points.map((_, i) => new Option(String(i + 1), i)));
    render();
  }
  function advance(steps = 1) {
    for (let i = 0; i < steps && model.status !== 'done'; i++) { advanceDbscan(model); stepsTaken++; }
    if (model.status === 'done') pause();
    render();
    if (running) schedule();
  }
  function finish() {
    while (model.status !== 'done') { advanceDbscan(model); stepsTaken++; }
    pause();
    render();
  }
  // advanceDbscan mutates the model in place, so going back one point rebuilds the
  // run from the start and replays it up to the previous step. Runs are deterministic.
  function stepBack() {
    if (!stepsTaken) return;
    const target = stepsTaken - 1;
    model = startDbscan(points, radius(), minimum());
    for (let i = 0; i < target; i++) advanceDbscan(model);
    stepsTaken = target;
    selected = -1;
    render();
  }

  function schedule() {
    clearTimeout(timer);
    if (playback.instant) { finish(); return; }
    const delay = 275 / playback.multiplier;
    const steps = Math.max(1, Math.ceil(16 / delay));
    timer = setTimeout(() => advance(steps), delay * steps);
  }

  function describe(i) {
    const { x, y } = points[i];
    const label = model.labels[i];
    // Indonesian writes the decimal comma, so the pair is separated by a semicolon there.
    return `${tr('Point', 'Titik')} ${i + 1} · (${fmt(x, { digits: 2 })}${tr(', ', '; ')}${fmt(y, { digits: 2 })}) · ${fmt(model.neighborhoods[i].length)} ${tr('in ε-neighborhood', 'di dalam ε-neighborhood')} · ${typeText()[pointType(model, i)]}${label > 0 ? ` · ${tr('Cluster', 'Cluster')} ${label}` : ''}`;
  }
  // The readout above the plot: the point name in bold, the rest muted, so it reads at a glance.
  function showReadout(text) {
    const el = ref('detail');
    const cut = text.indexOf(' · ');
    if (cut < 0) { el.textContent = text; return; }
    const lead = document.createElement('strong');
    lead.style.color = 'var(--ink)';
    lead.textContent = text.slice(0, cut);
    el.replaceChildren(lead, text.slice(cut));
  }

  function render() {
    const totals = { core: 0, border: 0, noise: 0, unvisited: 0 };
    points.forEach((_, i) => totals[pointType(model, i)]++);
    ref('visited').textContent = tr(`${fmt(points.length - totals.unvisited)} of ${fmt(points.length)} visited`, `${fmt(points.length - totals.unvisited)} dari ${fmt(points.length)} titik sudah dicek`);
    ref('clusters').textContent = fmt(model.clusterCount);
    for (const t of ['core', 'border', 'noise']) ref(t).textContent = fmt(totals[t]);
    ref('status').textContent = phaseText()[model.status];
    const a = model.active;
    // The line under the toolbar describes whatever the plot is highlighting: the
    // selected point if there is one, otherwise the point being checked.
    showReadout(selected >= 0
      ? describe(selected)
      : a >= 0
        ? `${tr('Point', 'Titik')} ${a + 1} · ${fmt(model.neighborhoods[a].length)} ${tr('in ε-neighborhood', 'di dalam ε-neighborhood')}${model.labels[a] > 0 ? ` · ${tr('Cluster', 'Cluster')} ${model.labels[a]}` : ''}`
        : model.status === 'done' ? tr('Every point has been checked.', 'Semua titik sudah dicek.') : tr('Run the animation or advance one point at a time.', 'Jalankan animasi, atau maju satu titik per langkah.'));
    // ε and MinPts only take effect once a run starts; the hint goes away then.
    ref('applyHint').hidden = running || stepsTaken > 0;
    setRunButton(act('run'), running ? 'pause' : model.status === 'done' ? 'again' : 'run');
    act('prev').disabled = running || !stepsTaken;
    act('step').disabled = running || model.status === 'done';
    const inspected = selected >= 0 ? selected : a;
    ref('inspect').selectedIndex = inspected + 1;
    act('follow').disabled = selected < 0;
    ref('inspection').textContent = inspected < 0 ? tr('No point selected.', 'Belum ada titik yang dipilih.') : describe(inspected);
    draw();
  }

  function draw() {
    const g = beginPlot(canvas, ctx);
    const focus = selected >= 0 ? selected : model.active;
    const showN = ref('neighborhood').checked;
    const near = new Set(showN && focus >= 0 ? model.neighborhoods[focus] : []);
    if (focus >= 0 && showN) {
      ctx.save();
      clipToPlot(ctx, g);
      ctx.beginPath();
      ctx.arc(g.px(points[focus].x), g.py(points[focus].y), Math.min(radius(), 15) * g.size / 10, 0, 2 * Math.PI);
      ctx.fillStyle = g.t.accent + '22';
      ctx.fill();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = g.t.accent;
      ctx.stroke();
      ctx.restore();
    }
    points.forEach(({ x, y }, i) => {
      const cx = g.px(x), cy = g.py(y), type = pointType(model, i);
      if (i === focus) {
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, 2 * Math.PI);
        ctx.strokeStyle = g.t.ink;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (near.has(i)) {
        // A soft filled halo in the accent colour: not the hollow dot that marks a border point.
        ctx.beginPath();
        ctx.arc(cx, cy, 8.5, 0, 2 * Math.PI);
        ctx.fillStyle = g.t.accent + '44';
        ctx.fill();
        ctx.strokeStyle = g.t.accent;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      const color = clusterColor(model.labels[i] > 0 ? model.labels[i] - 1 : -1);
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (type === 'noise') {
        ctx.moveTo(cx - 4, cy - 4); ctx.lineTo(cx + 4, cy + 4);
        ctx.moveTo(cx - 4, cy + 4); ctx.lineTo(cx + 4, cy - 4);
        ctx.stroke();
      } else {
        ctx.arc(cx, cy, type === 'unvisited' ? 3.5 : 4.7, 0, 2 * Math.PI);
        if (type === 'border') { ctx.fillStyle = g.t.plot; ctx.fill(); ctx.stroke(); } else ctx.fill();
      }
      ctx.lineWidth = 1;
    });
  }

  on(act('run'), 'click', () => {
    if (running) { pause(); render(); return; }
    if (model.status === 'done') reset();
    selected = -1;
    running = true;
    if (playback.instant) finish(); else advance();
  });
  on(act('step'), 'click', () => { selected = -1; advance(); });
  on(act('prev'), 'click', () => { if (!act('prev').disabled) stepBack(); });
  on(act('reset'), 'click', reset);
  on(act('randomize'), 'click', () => { seed = Math.floor(Math.random() * 2 ** 32); reset(); });
  on(act('follow'), 'click', () => { selected = -1; render(); });
  on(ref('dataset'), 'change', reset);
  on(ref('epsilon'), 'change', () => parameterChanged('epsilon', v => Math.max(0, v)));
  on(ref('minPoints'), 'change', () => parameterChanged('minPoints', v => Math.max(1, Math.round(v))));
  on(ref('count'), 'change', () => parameterChanged('count', v => Math.max(1, Math.min(1000, Math.round(v)))));
  for (const n of ['epsilon', 'minPoints', 'count']) on(ref(n), 'keydown', e => { if (e.key === 'Enter') ref(n).blur(); });
  on(ref('neighborhood'), 'change', draw);
  on(ref('inspect'), 'change', () => { const v = ref('inspect').value; selected = v === '' ? -1 : Number(v); render(); });
  on(canvas, 'click', e => {
    const g = geometry(canvas);
    // Fingers are less precise than a cursor: widen the hit radius for touch and pen.
    const touch = e.pointerType === 'touch' || e.pointerType === 'pen' || (!e.pointerType && matchMedia('(pointer: coarse)').matches);
    let best = touch ? 24 : 13;
    points.forEach(({ x, y }, i) => {
      const d = Math.hypot(e.clientX - g.left - g.px(x), e.clientY - g.top - g.py(y));
      if (d < best) { best = d; selected = i; }
    });
    render();
  });
  // Keyboard: the plot is one tab stop; arrows hop to the nearest point in that direction.
  const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
  on(canvas, 'keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape') {
      if (selected >= 0) { e.preventDefault(); e.stopPropagation(); selected = -1; render(); }
      return;
    }
    const dir = ARROWS[e.key];
    if (!dir) return;
    e.preventDefault();
    const from = selected >= 0 ? selected : model.active;
    if (from < 0) { selected = 0; render(); return; }
    const next = nearestInDirection(points, from, dir[0], dir[1]);
    if (next >= 0) { selected = next; render(); }
  });
  on(window, 'themechange', render);
  const ro = new ResizeObserver(() => draw());
  ro.observe(canvas);
  reset();
  return () => { pause(); ro.disconnect(); abort.abort(); };
}
