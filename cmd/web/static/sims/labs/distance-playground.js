// Reference lab, built on the kit: drag two points and compare four distances;
// see the "ball" of points at a fixed distance from A, and which reference point
// is nearest to A under each distance.
import { createLab, createPlot, rng, clusterColor, distance, tr, fmt } from '../kit/index.js';

// Built when drawn, so the names follow the language.
const names = () => ({ euclidean: tr('Euclidean', 'Euclidean'), manhattan: 'Manhattan', chebyshev: 'Chebyshev', cosine: tr('Cosine (from the origin)', 'Cosine (dari titik asal)') });

// Cosine looks at the direction of a point seen from the origin, so a point sitting on the
// origin has no direction and its cosine distance to anything is undefined (the kit helper
// returns 1 there, which would read as a real, maximal-looking answer).
export const cosineDefined = (a, b) => (a.x !== 0 || a.y !== 0) && (b.x !== 0 || b.y !== 0);

// Points of the "unit ball" of radius r around `a` under a metric, as a closed polygon.
// Cosine has no ball in the usual sense, so it is drawn as the cone of directions within r.
export function ballOutline(metric, a, r) {
  const pts = [];
  if (metric === 'euclidean') for (let i = 0; i <= 90; i++) { const t = i / 90 * 2 * Math.PI; pts.push({ x: a.x + r * Math.cos(t), y: a.y + r * Math.sin(t) }); }
  else if (metric === 'manhattan') pts.push({ x: a.x + r, y: a.y }, { x: a.x, y: a.y + r }, { x: a.x - r, y: a.y }, { x: a.x, y: a.y - r }, { x: a.x + r, y: a.y });
  else if (metric === 'chebyshev') pts.push({ x: a.x + r, y: a.y + r }, { x: a.x - r, y: a.y + r }, { x: a.x - r, y: a.y - r }, { x: a.x + r, y: a.y - r }, { x: a.x + r, y: a.y + r });
  return pts;
}

// Keyboard control of the two points. Arrow keys move the selected point by KEY_STEP, or KEY_STEP_BIG with Shift;
// the result is clamped to the plot (range = { minX, minY, span }). Returns null for any other key.
export const KEY_STEP = 0.25, KEY_STEP_BIG = 1;
export function nudge(p, key, big, range) {
  const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[key];
  if (!d) return null;
  const s = big ? KEY_STEP_BIG : KEY_STEP;
  const clamp = (v, lo) => Math.max(lo, Math.min(lo + range.span, v));
  return { x: clamp(p.x + d[0] * s, range.minX), y: clamp(p.y + d[1] * s, range.minY) };
}

// Which point Tab / Shift+Tab selects next while the plot has focus: A then B going forward, B then A going back.
// null means "leave the plot", so the key must keep its normal behaviour and Tab never traps the keyboard.
export const tabTarget = (sel, shift) => (shift ? (sel === 'B' ? 'A' : null) : (sel === 'A' ? 'B' : null));
// Space toggles between the two points.
export const toggleSelection = sel => (sel === 'A' ? 'B' : 'A');

let hintCount = 0;

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Two points, four distances', 'Dua titik, empat jarak'),
    hint: tr('Drag A or B. The edge of the shaded shape is exactly the chosen distance from A; the shading covers every point closer than that.', 'Seret A atau B. Tepi area berarsir tepat sejauh jarak yang dipilih dari A; area di dalamnya berisi semua titik yang lebih dekat.'),
    status: true, legend: true, canvasLabel: tr('Plot with two draggable points A and B and reference points', 'Plot dengan titik A dan B yang bisa digeser, plus titik acuan'),
    extra: { title: tr('Distances from A to B', 'Jarak dari A ke B'), hint: tr('The same two points, measured four ways.', 'Titik yang sama, diukur dengan empat cara.') },
  });
  const plot = createPlot(lab.canvas);
  const random = rng(42);
  const refs = Array.from({ length: 9 }, () => ({ x: 0.8 + random() * 8.4, y: 0.8 + random() * 8.4 }));
  const pts = { A: { x: 3, y: 3 }, B: { x: 7, y: 6 } };
  let drag = null;
  let sel = 'A';          // the point the keyboard moves
  let focused = false;    // the plot has keyboard focus: show which point is selected
  let spoken = '';        // "A at (x, y)", read out by the status live region until something else changes

  // How to use the plot without a mouse, under the plot and tied to it for screen readers.
  const kbdHint = document.createElement('p');
  kbdHint.className = 'hint';
  kbdHint.id = `distance-kbd-hint-${++hintCount}`;
  kbdHint.textContent = tr('Keyboard: focus the plot, press Space or Tab to switch between A and B, and use the arrow keys to move the selected point (Shift for bigger steps).', 'Keyboard: fokus ke plot, tekan Spasi atau Tab untuk berpindah antara A dan B, lalu pakai tombol panah untuk menggeser titik terpilih (Shift untuk langkah lebih besar).');
  lab.canvas.parentElement.after(kbdHint);
  lab.canvas.setAttribute('aria-describedby', kbdHint.id);
  const where = k => { const p = pts[k]; return tr(`${k} at (${fmt(p.x, { digits: 2 })}, ${fmt(p.y, { digits: 2 })})`, `${k} di (${fmt(p.x, { digits: 2 })}; ${fmt(p.y, { digits: 2 })})`); };

  const controls = lab.panel([
    { name: 'metric', type: 'select', label: tr('Highlight', 'Sorot'), options: Object.entries(names()).filter(([k]) => k !== 'cosine'), value: 'euclidean' },
    { name: 'radius', type: 'range', label: tr('Distance from A', 'Jarak dari A'), min: 0.5, max: 8, step: 0.1, value: 3, format: v => fmt(v, { digits: 1 }) },
    { name: 'ball', type: 'toggle', label: tr('Show the shape', 'Tampilkan bentuknya'), value: true },
    { name: 'nearest', type: 'toggle', label: tr('Mark the reference point nearest to A', 'Tandai acuan terdekat ke A'), value: true },
    { type: 'note', text: tr('Switch the distance and watch the nearest reference point change.', 'Ganti jenis jaraknya, lalu lihat titik acuan terdekat berpindah.') },
  ], () => { spoken = ''; draw(); });

  function table() {
    const { A, B } = pts;
    const NAMES = names();
    const rows = Object.keys(NAMES).map(k => [NAMES[k], k === 'cosine' && !cosineDefined(A, B) ? null : distance[k](A, B)]);
    lab.extraEl.innerHTML = '';
    const t = document.createElement('table');
    t.innerHTML = `<thead><tr><th>${tr('Distance', 'Jarak')}</th><th>${tr('A to B', 'A ke B')}</th></tr></thead>`;
    const body = document.createElement('tbody');
    for (const [name, d] of rows) {
      const row = body.insertRow();
      row.insertCell().textContent = name;
      const cell = row.insertCell();
      cell.textContent = d === null ? tr('undefined', 'tidak terdefinisi') : fmt(d, { digits: 3 });
    }
    t.append(body);
    lab.extraEl.append(t);
  }

  function draw() {
    const v = controls.values();
    const metric = distance[v.metric];
    const g = plot.begin();
    const accent = g.t.accent;
    if (v.ball) plot.clip(() => plot.polygon(ballOutline(v.metric, pts.A, v.radius), { fill: accent, stroke: accent, alpha: 0.14 }));
    plot.segment(pts.A.x, pts.A.y, pts.B.x, pts.B.y, { color: g.t.muted, width: 2, dash: [6, 4] });
    const nearest = v.nearest ? distance.nearestIndex(refs, pts.A, metric) : -1;
    refs.forEach((p, i) => {
      plot.dot(p.x, p.y, i === nearest ? clusterColor(2) : g.t.muted, i === nearest ? 7 : 4.2);
      if (i === nearest) { plot.ring(p.x, p.y, g.t.ink, 10); plot.label(p.x, p.y, `#${i + 1}`, { dx: 12, dy: -10, size: 11 }); }
    });
    if (focused) plot.ring(pts[sel].x, pts[sel].y, g.t.ink, 11, 2.5);
    plot.diamond(pts.A.x, pts.A.y, clusterColor(0)); plot.label(pts.A.x, pts.A.y, 'A');
    plot.diamond(pts.B.x, pts.B.y, clusterColor(1)); plot.label(pts.B.x, pts.B.y, 'B');
    const dAB = fmt(metric(pts.A, pts.B), { digits: 2 });
    const mName = names()[v.metric];
    lab.setStatus((spoken ? `${spoken}. ` : '') + tr(`${mName} distance A to B: ${dAB}`, `Jarak ${mName} A ke B: ${dAB}`));
    lab.setDetail(nearest >= 0
      ? tr(`Nearest reference point to A: #${nearest + 1}, at distance ${fmt(metric(pts.A, refs[nearest]), { digits: 2 })}.`, `Titik acuan terdekat ke A: #${nearest + 1} (jarak ${fmt(metric(pts.A, refs[nearest]), { digits: 2 })}).`)
      : tr('Reference point marking is off.', 'Penanda titik acuan dimatikan.'));
    lab.setLegend([{ kind: 'diamond', color: clusterColor(0), label: tr('A and B (draggable)', 'A dan B (bisa digeser)') }, { kind: 'dot', color: g.t.muted, label: tr('Reference points', 'Titik acuan') }, { kind: 'dot', color: clusterColor(2), label: tr('Nearest to A', 'Terdekat ke A') }]);
    table();
  }

  lab.on(lab.canvas, 'pointerdown', e => {
    const key = ['A', 'B'].find(k => plot.nearest(e, [pts[k]], 16) === 0);
    if (!key) return;
    drag = { key, id: e.pointerId };
    sel = key; spoken = '';
    lab.canvas.setPointerCapture(e.pointerId);
  });
  lab.on(lab.canvas, 'pointermove', e => { if (drag?.id === e.pointerId) { pts[drag.key] = plot.toData(e); draw(); } });
  lab.on(lab.canvas, 'pointerup', () => { drag = null; });
  lab.on(lab.canvas, 'focus', () => { focused = true; spoken = where(sel); draw(); });
  lab.on(lab.canvas, 'blur', () => { focused = false; spoken = ''; draw(); });
  lab.on(lab.canvas, 'keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      sel = toggleSelection(sel); spoken = where(sel); draw();
      return;
    }
    if (e.key === 'Tab') {
      const next = tabTarget(sel, e.shiftKey);
      if (!next) return; // past the last point: let focus leave the plot
      e.preventDefault();
      sel = next; spoken = where(sel); draw();
      return;
    }
    const moved = nudge(pts[sel], e.key, e.shiftKey, plot.range);
    if (!moved) return;
    e.preventDefault();
    pts[sel] = moved; spoken = where(sel); draw();
  });
  lab.onReset(() => { spoken = ''; pts.A = { x: 3, y: 3 }; pts.B = { x: 7, y: 6 }; draw(); });
  lab.onTheme(draw);
  lab.onResize(draw);
  draw();
  return lab.destroy;
}
