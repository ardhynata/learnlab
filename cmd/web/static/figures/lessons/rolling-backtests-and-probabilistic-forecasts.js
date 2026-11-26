// Figures for the lesson "Rolling backtests and probabilistic forecasts":
// [[figure:rolling-backtests-and-probabilistic-forecasts/name|Caption]].
// Every number is the lesson's own worked example. SALES is the shop's invented quarterly sales table: years 1 to 3
// are the table of "Lags, seasonality and horizons", years 4 to 6 continue it (growth slows from year 5). Two
// models are scored on rolling windows of four quarters: "seasonal naive" (the same quarter one year earlier) and
// "lag 4 + offset" (the same plus the average year-over-year change in the training years, per quarter, which is
// (last training year total - first training year total) / (years - 1) / 4). MAEs, errors, ranks and the
// coverage numbers are all computed here from SALES; nothing is typed in twice.
import { svg, dot, ring, diamond, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';
import { normalCdf } from '../../sims/ml/classifierscores.js';

const SALES = [86, 126, 102, 117, 98, 139, 113, 129, 109, 150, 125, 143, 120, 163, 136, 156, 124, 167, 139, 161, 128, 172, 142, 165];
const H = 4;                                    // forecast horizon in quarters
const ORIGINS = [8, 12, 16];                    // the three windows of the main example
const INK = { fill: 'var(--ink)' };
const BOLD = { fill: 'var(--ink)', weight: 700 };
const sum = a => a.reduce((s, v) => s + v, 0);

// Offset per quarter from the training years (the last `years` full years before the origin).
function offset(origin, years = origin / 4) {
  const totals = [];
  for (let y = 0; y < years; y++) totals.push(sum(SALES.slice(origin - 4 * (years - y), origin - 4 * (years - y) + 4)));
  return (totals[years - 1] - totals[0]) / (years - 1) / 4;
}
// Errors (actual - forecast) of one window for one model.
function windowErrors(origin, withOffset) {
  const d = withOffset ? offset(origin) : 0;
  const actual = SALES.slice(origin, origin + H);
  const errors = actual.map((a, i) => a - (SALES[origin - 4 + i] + d));
  return { actual, errors, mae: sum(errors.map(Math.abs)) / H };
}
const NAIVE = ORIGINS.map(o => windowErrors(o, false));
const OFFSET = ORIGINS.map(o => windowErrors(o, true));
const mean = a => sum(a) / a.length;

// ---- Figure 1: expanding against sliding windows on 20 quarters. ----
function windows() {
  const cell = 24, x0 = 90, ch = 20, rowGap = 26, quarters = 20, slide = 8;
  const panel = (p, title, trainStart) => {
    const top = 24 + p * 112;
    const rows = ORIGINS.map((o, i) => {
      const y = top + 10 + i * rowGap;
      const cells = Array.from({ length: quarters }, (_, q) => {
        const n = q + 1, x = x0 + q * cell;
        const isTrain = n > trainStart(o) && n <= o, isTest = n > o && n <= o + H;
        const fill = isTest ? k(1) : isTrain ? soft(0) : 'var(--surface)';
        const stroke = isTest ? k(1) : isTrain ? k(0) : 'var(--line)';
        return `<rect x="${x + 1}" y="${y}" width="${cell - 2}" height="${ch}" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>`;
      }).join('');
      return `${cells}${text(x0 - 8, y + 14, tr(`Origin ${fmt(o)}`, `Origin ${fmt(o)}`), { anchor: 'end', ...BOLD, size: 12 })}`;
    }).join('');
    return `${text(x0, top, title, { anchor: 'start', ...BOLD, size: 13 })}${rows}`;
  };
  const expanding = panel(0, tr('Expanding window: train on everything up to the origin', 'Expanding window: latih pada semua data sampai origin'), () => 0);
  const sliding = panel(1, tr(`Sliding window: train on the latest ${fmt(slide)} quarters only`, `Sliding window: latih hanya pada ${fmt(slide)} kuartal terbaru`), o => o - slide);
  const axisY = 24 + 112 + 82 + 16;
  const ticks = Array.from({ length: quarters }, (_, q) => text(x0 + q * cell + cell / 2, axisY, fmt(q + 1), { size: 10 })).join('');
  const axisTitle = text(x0 + quarters * cell / 2, axisY + 18, tr('Quarter', 'Kuartal'), { ...INK, size: 12 });
  const ly = axisY + 40;
  const key = (x, fill, stroke, label) => `<rect x="${x}" y="${ly - 12}" width="18" height="14" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>${text(x + 24, ly, label, { anchor: 'start', ...INK, size: 12 })}`;
  const legend = `${key(x0, soft(0), k(0), tr('train', 'latih'))}${key(x0 + 110, k(1), k(1), tr(`test: next ${fmt(H)} quarters`, `uji: ${fmt(H)} kuartal berikutnya`))}${key(x0 + 330, 'var(--surface)', 'var(--line)', tr('not used', 'tidak dipakai'))}`;
  return svg(640, ly + 12, `${expanding}${sliding}${ticks}${axisTitle}${legend}`);
}

// ---- Figure 2: MAE of the two models in each window, and the mean. ----
function threeWindows() {
  const groups = [...ORIGINS.map((o, i) => ({
    a: NAIVE[i].mae, b: OFFSET[i].mae,
    l1: tr(`Window ${fmt(i + 1)}`, `Window ${fmt(i + 1)}`),
    l2: tr(`quarters ${fmt(o + 1)} to ${fmt(o + H)}`, `kuartal ${fmt(o + 1)} sampai ${fmt(o + H)}`),
  })), { a: mean(NAIVE.map(w => w.mae)), b: mean(OFFSET.map(w => w.mae)), l1: tr('Mean of the three', 'Rata-rata ketiganya'), l2: '' }];
  const left = 64, right = 624, base = 218, top = 54, maxV = 14;
  const Y = v => base - v / maxV * (base - top);
  const slot = (right - left) / groups.length, bw = 46;
  const grid = [0, 4, 8, 12].map(v => `${line(left, Y(v), right, Y(v), { c: 'var(--line)', w: 1 })}${text(left - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('');
  const bars = groups.map((g, i) => {
    const cx = left + slot * (i + 0.5);
    const one = (x, v, c) => `<rect x="${x}" y="${Y(v).toFixed(1)}" width="${bw}" height="${(base - Y(v)).toFixed(1)}" rx="3" fill="${c}"/>${text(x + bw / 2, Y(v) - 6, fmt(v, { max: 2 }), { ...BOLD, size: 12 })}`;
    return `${one(cx - bw - 3, g.a, k(0))}${one(cx + 3, g.b, k(1))}${text(cx, base + 18, g.l1, { ...BOLD, size: 12 })}${text(cx, base + 34, g.l2, { size: 11 })}`;
  }).join('');
  const sep = line(left + slot * 3, top - 6, left + slot * 3, base, { c: 'var(--line)', w: 1.4, dash: '4 4' });
  const key = (x, c, label) => `<rect x="${x}" y="14" width="16" height="12" rx="3" fill="${c}"/>${text(x + 22, 25, label, { anchor: 'start', ...INK, size: 12 })}`;
  const head = `${key(left, k(0), tr('Seasonal naive', 'Seasonal naive'))}${key(left + 170, k(1), tr('Lag 4 + offset', 'Lag 4 + offset'))}`;
  const axisTitle = text(left - 52, 46, tr('Mean absolute error in the window (units)', 'Mean absolute error di window tersebut (unit)'), { anchor: 'start', ...INK, size: 12 });
  return svg(640, 268, `${head}${axisTitle}${grid}${bars}${sep}${line(left, base, right, base, { c: 'var(--muted)', w: 1.6 })}`);
}

// ---- Figure 3: the twelve backtest errors of lag 4 + offset, and the range they give for year 6. ----
function intervals() {
  const errors = OFFSET.flatMap((w, i) => w.errors.map(e => ({ e, w: i })));
  const lo = Math.min(...errors.map(d => d.e)), hi = Math.max(...errors.map(d => d.e));
  const left = 70, right = 590, top = 8, vMin = -10, vMax = 3;
  const X = v => left + (v - vMin) / (vMax - vMin) * (right - left);
  // Top panel: dots stacked on a number line.
  const ay = 150;
  const band = `<rect x="${X(lo) - 12}" y="${top + 42}" width="${X(hi) - X(lo) + 24}" height="${ay - top - 42}" rx="8" fill="${soft(1)}" stroke="${k(1)}" stroke-width="1.4" stroke-dasharray="5 4"/>`;
  const counts = new Map();
  const dots = errors.map(d => {
    const n = counts.get(d.e) ?? 0; counts.set(d.e, n + 1);
    return dot(X(d.e), ay - 14 - n * 17, k(d.w), 7);
  }).join('');
  const ticks = Array.from({ length: vMax - vMin + 1 }, (_, i) => vMin + i).map(v => `${line(X(v), ay, X(v), ay + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(v), ay + 20, fmt(v), { size: 12 })}`).join('');
  const zero = line(X(0), top + 42, X(0), ay, { c: 'var(--muted)', w: 1.2, dash: '3 4' });
  const head = text(left - 62, top + 12, tr(`The ${fmt(errors.length)} backtest errors of lag 4 + offset (actual minus forecast), colored by window`, `${fmt(errors.length)} galat backtest lag 4 + offset (actual dikurangi forecast), diwarnai per window`), { anchor: 'start', ...BOLD, size: 13 });
  const note = text(X((lo + hi) / 2), ay + 40, tr(`range ${fmt(lo)} to ${fmt(hi)} = the 80% interval offsets`, `rentang ${fmt(lo)} sampai ${fmt(hi)} = offset interval 80%`), { ...BOLD, size: 12 });
  const wkey = [0, 1, 2].map(i => `${dot(left + 300 + i * 90, top + 26, k(i), 6)}${text(left + 310 + i * 90, top + 30, tr(`window ${fmt(i + 1)}`, `window ${fmt(i + 1)}`), { anchor: 'start', ...INK, size: 12 })}`).join('');

  // Bottom panel: year 6 forecasts (refit at origin 20), intervals, and what happened.
  const d20 = offset(20);
  const lo2 = 120, hi2 = 185, X2 = v => left + (v - lo2) / (hi2 - lo2) * (right - left);
  const by = 330;
  const title2 = text(left - 62, 218, tr('Year 6: forecast (diamond), 80% interval (bar) and actual (dot)', 'Tahun 6: forecast (belah ketupat), interval 80% (batang), dan actual (titik)'), { anchor: 'start', ...BOLD, size: 13 });
  const rows = [0, 1, 2, 3].map(i => {
    const y = 244 + i * 24, f = SALES[16 + i] + d20, a = SALES[20 + i];
    return `${text(left - 10, y + 4, tr(`Quarter ${fmt(21 + i)}`, `Kuartal ${fmt(21 + i)}`), { anchor: 'end', ...INK, size: 12 })}
${line(X2(f + lo), y, X2(f + hi), y, { c: k(1), w: 8 })}${line(X2(f + lo), y - 7, X2(f + lo), y + 7, { c: k(1), w: 3 })}${line(X2(f + hi), y - 7, X2(f + hi), y + 7, { c: k(1), w: 3 })}
${diamond(X2(f), y, 'var(--surface)', 7)}${dot(X2(a), y, 'var(--ink)', 5)}
${text(X2(f + hi) + 12, y + 4, `${fmt(f + lo)} - ${fmt(f + hi)}`, { anchor: 'start', size: 11 })}`;
  }).join('');
  const ticks2 = [120, 130, 140, 150, 160, 170, 180].map(v => `${line(X2(v), by + 8, X2(v), by + 13, { c: 'var(--muted)', w: 1.4 })}${text(X2(v), by + 27, fmt(v), { size: 12 })}`).join('');
  return svg(640, 372, `${head}${band}${zero}${dots}${line(left, ay, right, ay, { c: 'var(--muted)', w: 1.6 })}${ticks}${note}${wkey}${title2}${rows}${line(left, by + 8, right, by + 8, { c: 'var(--muted)', w: 1.6 })}${ticks2}`);
}

// ---- Figure 4: coverage of an 80% interval when its width comes from one-step errors only. ----
// Random walk with Gaussian steps and the last value as the forecast: the error at horizon h is a sum of h
// independent steps, so its spread is sqrt(h) times the one-step spread. An interval of +-1.2816 one-step
// standard deviations covers 2 * Phi(1.2816 / sqrt(h)) - 1 at horizon h.
function coverageByHorizon() {
  const Z80 = 1.2815516;
  const hs = [1, 2, 3, 4];
  const left = 64, right = 624, base = 206, top = 48;
  const Y = v => base - v * (base - top);
  const slot = (right - left) / hs.length, bw = 80;
  const grid = [0, 0.5, 1].map(v => `${line(left, Y(v), right, Y(v), { c: 'var(--line)', w: 1 })}${text(left - 8, Y(v) + 4, pct(v, 0), { anchor: 'end', size: 12 })}`).join('');
  const bars = hs.map((h, i) => {
    const cov = 2 * normalCdf(Z80 / Math.sqrt(h)) - 1, cx = left + slot * (i + 0.5);
    return `<rect x="${cx - bw / 2}" y="${Y(cov).toFixed(1)}" width="${bw}" height="${(base - Y(cov)).toFixed(1)}" rx="3" fill="${h === 1 ? k(0) : k(1)}"/>
${text(cx, Y(cov) + 24, pct(cov, 0), { fill: 'var(--surface)', weight: 700, size: 16 })}
${text(cx, base + 18, tr(`${fmt(h)} quarter${h === 1 ? '' : 's'} ahead`, `${fmt(h)} kuartal ke depan`), { ...BOLD, size: 12 })}
${text(cx, base + 35, tr(`width × ${fmt(Math.sqrt(h), { max: 2 })}`, `lebar × ${fmt(Math.sqrt(h), { max: 2 })}`), { size: 11 })}`;
  }).join('');
  const target = `${line(left, Y(0.8), right, Y(0.8), { c: 'var(--ink)', w: 1.8, dash: '6 5' })}${text(right, Y(0.8) - 6, tr('target 80%', 'target 80%'), { anchor: 'end', ...INK, size: 12 })}`;
  const head = text(left - 56, 20, tr('Coverage of an 80% interval whose width comes from one-step errors, at each horizon', 'Coverage interval 80% dari galat satu langkah, pada tiap horizon'), { anchor: 'start', ...BOLD, size: 13 });
  return svg(640, 260, `${head}${grid}${bars}${target}${line(left, base, right, base, { c: 'var(--muted)', w: 1.6 })}`);
}

export const figures = {
  'windows': windows,
  'three-windows': threeWindows,
  'intervals': intervals,
  'coverage-by-horizon': coverageByHorizon,
};
