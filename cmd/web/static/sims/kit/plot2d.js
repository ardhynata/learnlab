// A 2-D scatter-style plot on the shared canvas helpers (common.js): axes, data
// coordinates, drawing primitives, hit testing, and a separate line chart for curves
// (validation error, scree plots, loss). Every color comes from the active theme.
import { tr } from '../../i18n.js';
import { beginPlot, clipToPlot, geometry, DEFAULT_RANGE, theme, clusterColor, formatTick } from '../common.js';

export function createPlot(canvas, { xLabel = tr('Feature 1', 'Feature 1'), yLabel = tr('Feature 2', 'Feature 2'), range = DEFAULT_RANGE } = {}) {
  const ctx = canvas.getContext('2d');
  let g = null;
  const state = { range, xLabel, yLabel };

  const api = {
    ctx,
    get g() { return g; },
    get range() { return state.range; },
    setRange(r) { state.range = r; },
    setLabels(x, y) { state.xLabel = x; state.yLabel = y; },

    // Clears and draws the axes; call first on every redraw. Returns the geometry.
    begin() { g = beginPlot(canvas, ctx, state.xLabel, state.yLabel, state.range); return g; },
    px: x => g.px(x),
    py: y => g.py(y),
    // Pointer event -> data coordinates, clamped to the plot range.
    toData(event) {
      const geo = geometry(canvas, state.range), r = state.range;
      const x = r.minX + (event.clientX - geo.left - geo.px(r.minX)) * r.span / geo.size;
      const y = r.minY + r.span - (event.clientY - geo.top - 12) * r.span / geo.size;
      return { x: Math.max(r.minX, Math.min(r.minX + r.span, x)), y: Math.max(r.minY, Math.min(r.minY + r.span, y)) };
    },
    // Index of the nearest of `points` within `radius` CSS pixels of the event, or -1.
    nearest(event, points, radius = 14) {
      const geo = geometry(canvas, state.range);
      let best = -1, bestD = radius;
      points.forEach((p, i) => {
        const d = Math.hypot(event.clientX - geo.left - geo.px(p.x), event.clientY - geo.top - geo.py(p.y));
        if (d < bestD) { best = i; bestD = d; }
      });
      return best;
    },
    // Runs `draw` clipped to the plot square.
    clip(draw) { ctx.save(); clipToPlot(ctx, g); draw(); ctx.restore(); },

    dot(x, y, color, r = 4.6) { ctx.beginPath(); ctx.arc(g.px(x), g.py(y), r, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill(); },
    ring(x, y, color, r = 6, width = 2) { ctx.beginPath(); ctx.arc(g.px(x), g.py(y), r, 0, 2 * Math.PI); ctx.lineWidth = width; ctx.strokeStyle = color; ctx.stroke(); ctx.lineWidth = 1; },
    cross(x, y, color, r = 4) { const X = g.px(x), Y = g.py(y); ctx.beginPath(); ctx.moveTo(X - r, Y - r); ctx.lineTo(X + r, Y + r); ctx.moveTo(X - r, Y + r); ctx.lineTo(X + r, Y - r); ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.stroke(); ctx.lineWidth = 1; },
    diamond(x, y, color, r = 9) {
      const X = g.px(x), Y = g.py(y);
      ctx.beginPath(); ctx.moveTo(X, Y - r); ctx.lineTo(X + r, Y); ctx.lineTo(X, Y + r); ctx.lineTo(X - r, Y); ctx.closePath();
      ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = g.t.ink; ctx.stroke(); ctx.lineWidth = 1;
    },
    segment(x1, y1, x2, y2, { color = g.t.muted, width = 1.5, dash = null, alpha = 1 } = {}) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.beginPath(); ctx.moveTo(g.px(x1), g.py(y1)); ctx.lineTo(g.px(x2), g.py(y2));
      ctx.lineWidth = width; ctx.strokeStyle = color; if (dash) ctx.setLineDash(dash); ctx.stroke(); ctx.restore();
    },
    polyline(points, { color = g.t.accent, width = 2.5, dash = null } = {}) {
      if (points.length < 2) return;
      ctx.save(); ctx.beginPath(); points.forEach((p, i) => (i ? ctx.lineTo(g.px(p.x), g.py(p.y)) : ctx.moveTo(g.px(p.x), g.py(p.y))));
      ctx.lineWidth = width; ctx.strokeStyle = color; ctx.lineJoin = 'round'; if (dash) ctx.setLineDash(dash); ctx.stroke(); ctx.restore();
    },
    polygon(points, { fill = null, stroke = null, alpha = 0.15 } = {}) {
      if (points.length < 3) return;
      ctx.save(); ctx.beginPath(); points.forEach((p, i) => (i ? ctx.lineTo(g.px(p.x), g.py(p.y)) : ctx.moveTo(g.px(p.x), g.py(p.y)))); ctx.closePath();
      if (fill) { ctx.globalAlpha = alpha; ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.globalAlpha = 1; ctx.strokeStyle = stroke; ctx.stroke(); }
      ctx.restore();
    },
    // A circle whose radius is in DATA units (so it follows the axes).
    circle(x, y, radius, { fill = null, stroke = g.t.accent, dash = [5, 4], alpha = 0.12 } = {}) {
      ctx.save(); ctx.beginPath(); ctx.arc(g.px(x), g.py(y), radius * g.size / state.range.span, 0, 2 * Math.PI);
      if (fill) { ctx.globalAlpha = alpha; ctx.fillStyle = fill; ctx.fill(); ctx.globalAlpha = 1; }
      if (stroke) { ctx.setLineDash(dash ?? []); ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke(); }
      ctx.restore();
    },
    label(x, y, text, { dx = 8, dy = -8, color = g.t.ink, align = 'left', size = 12, weight = 600 } = {}) {
      ctx.save(); ctx.fillStyle = color; ctx.font = `${weight} ${size}px system-ui, sans-serif`; ctx.textAlign = align; ctx.fillText(text, g.px(x) + dx, g.py(y) + dy); ctx.restore();
    },
    color: clusterColor,
    theme,
  };
  return api;
}

// ---- line chart (non-square) -------------------------------------------------

function niceTicks(lo, hi, count = 5) {
  const span = hi - lo || 1, raw = span / count, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? raw;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(Number(v.toPrecision(12)));
  return out;
}

// Draws one or more series on axes that fill the canvas.
//   chart(canvas, { series: [{ xs, ys, color, label, points: true, dash: false }],
//                   xLabel, yLabel, xMin, xMax, yMin, yMax, markerX, markerLabel, integerX })
export function drawLineChart(canvas, spec) {
  const ctx = canvas.getContext('2d'), t = theme();
  const { width, height } = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const m = { l: 54, r: 16, t: 14, b: 40 };
  const all = spec.series.flatMap(s => s.xs.map((x, i) => [x, s.ys[i]]));
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  const xMin = spec.xMin ?? Math.min(...xs), xMax = spec.xMax ?? Math.max(...xs);
  let yMin = spec.yMin ?? Math.min(...ys), yMax = spec.yMax ?? Math.max(...ys);
  if (yMax === yMin) { yMax += 1; yMin -= 1; }
  const X = x => m.l + (x - xMin) / ((xMax - xMin) || 1) * (width - m.l - m.r);
  const Y = y => height - m.b - (y - yMin) / (yMax - yMin) * (height - m.t - m.b);
  ctx.fillStyle = t.plot; ctx.fillRect(m.l, m.t, width - m.l - m.r, height - m.t - m.b);
  ctx.font = '11px system-ui, sans-serif'; ctx.strokeStyle = t.grid; ctx.fillStyle = t.muted; ctx.lineWidth = 1;
  ctx.beginPath();
  for (const v of niceTicks(yMin, yMax)) { ctx.moveTo(m.l, Y(v)); ctx.lineTo(width - m.r, Y(v)); ctx.textAlign = 'right'; ctx.fillText(formatTick(v), m.l - 6, Y(v) + 4); }
  const xt = spec.integerX ? Array.from({ length: Math.floor(xMax - xMin) + 1 }, (_, i) => xMin + i).filter((_, i, a) => a.length <= 12 || i % Math.ceil(a.length / 12) === 0) : niceTicks(xMin, xMax);
  for (const v of xt) { ctx.moveTo(X(v), m.t); ctx.lineTo(X(v), height - m.b); ctx.textAlign = 'center'; ctx.fillText(formatTick(v), X(v), height - m.b + 16); }
  ctx.stroke();
  ctx.textAlign = 'center'; ctx.fillText(spec.xLabel ?? '', (m.l + width - m.r) / 2, height - 6);
  ctx.save(); ctx.translate(13, (m.t + height - m.b) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(spec.yLabel ?? '', 0, 0); ctx.restore();
  if (spec.markerX != null) {
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = t.muted; ctx.beginPath(); ctx.moveTo(X(spec.markerX), m.t); ctx.lineTo(X(spec.markerX), height - m.b); ctx.stroke(); ctx.restore();
    if (spec.markerLabel) { ctx.fillStyle = t.ink; ctx.textAlign = 'center'; ctx.font = '600 12px system-ui, sans-serif'; ctx.fillText(spec.markerLabel, X(spec.markerX), m.t + 12); }
  }
  spec.series.forEach((s, i) => {
    const color = s.color ?? clusterColor(i);
    ctx.save(); ctx.beginPath(); s.xs.forEach((x, k) => (k ? ctx.lineTo(X(x), Y(s.ys[k])) : ctx.moveTo(X(x), Y(s.ys[k]))));
    ctx.lineWidth = 2.5; ctx.strokeStyle = color; ctx.lineJoin = 'round'; if (s.dash) ctx.setLineDash([6, 4]); ctx.stroke(); ctx.restore();
    if (s.points !== false) s.xs.forEach((x, k) => { ctx.beginPath(); ctx.arc(X(x), Y(s.ys[k]), 3.6, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill(); });
  });
  // Legend, top right.
  let ly = m.t + 14;
  ctx.textAlign = 'right'; ctx.font = '600 12px system-ui, sans-serif';
  spec.series.forEach((s, i) => { if (!s.label) return; ctx.fillStyle = s.color ?? clusterColor(i); ctx.fillText(s.label, width - m.r - 8, ly); ly += 16; });
  return { X, Y };
}
