// Figures for the lesson "Forecast lab": [[figure:forecast-lab/name|Caption]].
// The numbers are not typed in: each figure runs the lab's own math (sims/ml/forecastlab.js, the default series with
// seed 1, 240 steps, season length 12, 8 backtest windows) at draw time, so the pictures and the lab cannot drift apart.
// lab-map is a diagram of the lab screen. horizon, windows and band are computed: horizon on a calm series with a
// forecast horizon of 24, windows on the lab's default settings (a regime shift of +6 at step 190), band on the
// default settings and again without the shift.
import { svg, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';
import {
  MODELS, normalize, buildSeries, planBacktest, runModel, calibrationWindows, intervalsFor, summarize, horizonErrors, winners,
} from '../../sims/ml/forecastlab.js';

const INK = { fill: 'var(--ink)' };
const BOLD = { fill: 'var(--ink)', weight: 700 };
const COLOR = { naive: 3, seasonal: 2, learned: 0 };
const name = m => ({
  naive: tr('Naive (last value)', 'Naive (nilai terakhir)'),
  seasonal: tr('Seasonal naive', 'Seasonal naive'),
  learned: tr('Learned lag model', 'Model lag terlatih'),
}[m]);
const shortName = m => ({ naive: 'Naive', seasonal: 'Seasonal', learned: tr('Learned', 'Terlatih') }[m]);
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;

function run(over) {
  const p = normalize(over), series = buildSeries(p), plan = planBacktest(p);
  const wins = Object.fromEntries(MODELS.map(m => [m, runModel(series.y, m, p, plan)]));
  return { p, series, plan, wins };
}

// ---- Figure 1: where things are on the lab screen. ----
function labMap() {
  const card = (x, y, w, h, title, sub) => `${box(x, y, w, h)}${text(x + 10, y + 22, title, { anchor: 'start', ...BOLD, size: 12 })}${sub ? text(x + 10, y + 38, sub, { anchor: 'start', size: 10.5 }) : ''}`;
  const plot = `${card(10, 14, 210, 262, tr('Forecasting and backtesting', 'Forecasting dan backtesting'), tr('the plot card', 'kartu plot'))}
    <path d="M24 150l20-26 16 14 22-40 20 22 24-34 22 18 26-30 22 20" stroke="var(--ink)" stroke-width="1.8" fill="none"/>
    <rect x="156" y="84" width="52" height="106" fill="${k(0)}" opacity="0.16"/>
    ${text(24, 206, tr('window shown, forecasts, band', 'window ditampilkan, forecast, band'), { anchor: 'start', size: 10.5 })}
    ${[0, 1, 2, 3, 4].map(i => `<rect x="${24 + i * 22}" y="${218 + i * 9}" width="${60 + i * 8}" height="5" rx="2" fill="var(--line)"/><rect x="${90 + i * 22}" y="${216 + i * 9}" width="28" height="8" rx="2" fill="${k(4)}" opacity="0.7"/>`).join('')}
    ${text(24, 268, tr('one row per window', 'satu baris per window'), { anchor: 'start', size: 10.5 })}`;
  const sides = [
    tr('Error in each window', 'Galat di setiap window'), tr('Error by horizon', 'Galat menurut horizon'),
    tr('Interval coverage by horizon', 'Coverage interval menurut horizon'), tr('Mean and worst-window error', 'Galat rata-rata dan window terburuk'),
  ];
  const mid = sides.map((t, i) => `${box(232, 14 + i * 67, 244, 58)}${text(243, 38 + i * 67, t, { anchor: 'start', ...BOLD, size: 11 })}${text(243, 55 + i * 67, i === 3 ? tr('a table', 'sebuah tabel') : tr('a chart', 'sebuah grafik'), { anchor: 'start', size: 10.5 })}`).join('');
  const groups = [tr('Series', 'Seri'), tr('Regime shift', 'Regime shift'), tr('Models', 'Model'), tr('Backtest', 'Backtest'), tr('Errors and intervals', 'Galat dan interval')];
  const right = `${box(488, 14, 144, 214)}${text(499, 36, tr('Parameters', 'Parameter'), { anchor: 'start', ...BOLD, size: 12 })}
    ${groups.map((g, i) => `${line(499, 46 + i * 34, 622, 46 + i * 34, { c: 'var(--line)', w: 1 })}${text(499, 66 + i * 34, `\u25B8 ${g}`, { anchor: 'start', ...INK, size: 11 })}`).join('')}
    <rect x="488" y="240" width="144" height="36" rx="18" fill="${k(0)}"/>${text(560, 263, 'Quick Quiz', { fill: '#fff', weight: 700, size: 13 })}`;
  const heads = `${text(115, 296, tr('1. the plot', '1. plot'), { size: 12 })}${text(354, 296, tr('2. charts and the table', '2. grafik dan tabel'), { size: 12 })}${text(560, 296, tr('3. the controls', '3. kontrol'), { size: 12 })}`;
  return svg(640, 304, `${plot}${mid}${right}${heads}`);
}

// ---- Figure 2: error by horizon on a calm series with horizon 24. ----
function horizon() {
  const { wins } = run({ shiftSize: 0, horizon: 24 });
  const H = 24, data = Object.fromEntries(MODELS.map(m => [m, horizonErrors(wins[m], 'mase')]));
  const left = 58, right = 620, top = 40, base = 214, maxV = 3.6;
  const X = h => left + (h - 1) / (H - 1) * (right - left), Y = v => base - Math.min(v, maxV) / maxV * (base - top);
  const grid = [0, 1, 2, 3].map(v => `${line(left, Y(v), right, Y(v), { c: 'var(--line)', w: 1 })}${text(left - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('');
  const xt = [1, 6, 12, 18, 24].map(h => text(X(h), base + 16, fmt(h), { size: 12 })).join('');
  const lines = MODELS.map(m => {
    const d = data[m].map((v, i) => `${i ? 'L' : 'M'}${X(i + 1).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
    return `<path d="${d}" stroke="${k(COLOR[m])}" stroke-width="2.6" fill="none" ${m === 'learned' ? '' : `stroke-dasharray="${m === 'naive' ? '2 4' : '8 5'}"`} stroke-linecap="round"/>`;
  }).join('');
  const season = `${line(X(12.5), top - 6, X(12.5), base, { c: 'var(--ink)', w: 1.4, dash: '3 4' })}${text(X(12.5) + 6, top + 4, tr('one season (12 steps) ends', 'satu musim (12 langkah) berakhir'), { anchor: 'start', ...INK, size: 12 })}`;
  const first = mean(data.seasonal.slice(0, 12)), second = mean(data.seasonal.slice(12));
  const notes = `${text(left + 6, top + 22, tr(`steps 1 to 12: mean ${fmt(first, { digits: 2 })}`, `langkah 1 sampai 12: rata-rata ${fmt(first, { digits: 2 })}`), { anchor: 'start', fill: k(2), weight: 700, size: 12 })}${text(X(12.5) + 6, top + 22, tr(`steps 13 to 24: mean ${fmt(second, { digits: 2 })}`, `langkah 13 sampai 24: rata-rata ${fmt(second, { digits: 2 })}`), { anchor: 'start', fill: k(2), weight: 700, size: 12 })}`;
  const key = MODELS.map((m, i) => `<rect x="${left + i * 188}" y="8" width="14" height="10" rx="2" fill="${k(COLOR[m])}"/>${text(left + i * 188 + 20, 18, name(m), { anchor: 'start', ...INK, size: 12 })}`).join('');
  const axis = `${line(left, base, right, base, { c: 'var(--muted)', w: 1.6 })}${text((left + right) / 2, base + 34, tr('Forecast horizon (steps ahead)', 'Forecast horizon (langkah ke depan)'), { ...INK, size: 12 })}${text(14, (top + base) / 2, 'MASE', { ...INK, size: 12 }).replace('<text', `<text transform="rotate(-90 14 ${(top + base) / 2})"`)}`;
  return svg(640, 252, `${key}${grid}${xt}${axis}${season}${lines}${notes}`);
}

// ---- Figure 3: MASE in each window on the lab's default series, with the regime shift. ----
function windowsFigure() {
  const { p, wins } = run({});
  const values = Object.fromEntries(MODELS.map(m => [m, summarize(wins[m], 'mase').values]));
  const win = winners(values), W = p.windows;
  const left = 58, right = 624, top = 44, base = 206, maxV = 4;
  const Y = v => base - v / maxV * (base - top), gw = (right - left) / W, bw = gw * 0.26;
  const grid = [0, 1, 2, 3, 4].map(v => `${line(left, Y(v), right, Y(v), { c: 'var(--line)', w: 1 })}${text(left - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('');
  const bars = MODELS.map((m, j) => values[m].map((v, i) => {
    const x = left + i * gw + gw * 0.11 + j * bw, mark = win.perWindow[i] === m ? `<path d="M${x + bw / 2 - 4} ${Y(v) - 11}h8l-4 7z" fill="var(--ink)"/>` : '';
    return `<rect x="${x.toFixed(1)}" y="${Y(v).toFixed(1)}" width="${(bw - 1).toFixed(1)}" height="${(base - Y(v)).toFixed(1)}" fill="${k(COLOR[m])}"/>${mark}`;
  }).join('')).join('');
  const firstAfter = wins.naive.findIndex(w => w.testEnd >= p.shiftAt);
  const sx = left + firstAfter * gw;
  const shift = `${line(sx, top - 8, sx, base, { c: k(1), w: 2, dash: '6 4' })}${text(sx + 5, top - 12, tr('Shift reached', 'Shift tercapai'), { anchor: 'start', fill: k(1), weight: 700, size: 12 })}`;
  const labels = values.naive.map((_, i) => text(left + (i + 0.5) * gw, base + 16, fmt(i + 1), { size: 12 })).join('');
  const key = MODELS.map((m, i) => `<rect x="${left + i * 170}" y="6" width="14" height="10" rx="2" fill="${k(COLOR[m])}"/>${text(left + i * 170 + 20, 16, name(m), { anchor: 'start', ...INK, size: 12 })}`).join('');
  const axis = `${line(left, base, right, base, { c: 'var(--muted)', w: 1.6 })}${text((left + right) / 2, base + 34, tr('Backtest window (1 = earliest); ▾ = lowest in the window', 'Window backtest (1 = paling awal); ▾ = terendah di window'), { ...INK, size: 12 })}`;
  const sum = `${text(right, 34, tr('wins: ', 'menang: ') + MODELS.map(m => `${shortName(m)} ${fmt(win.counts[m])}`).join(' / '), { anchor: 'end', size: 11 })}`;
  return svg(640, 246, `${key}${grid}${bars}${shift}${labels}${axis}${sum}`);
}

// ---- Figure 4: actual values inside the 80% band, per window, with and without the shift. ----
function band() {
  const fit = over => {
    const { p, series, plan, wins } = run(over);
    const cal = calibrationWindows(series.y, 'learned', p, plan), iv = intervalsFor(wins.learned, cal, p.coverage);
    return { counts: iv.windows.map(w => w.actual.filter((v, i) => v >= w.lo[i] && v <= w.hi[i]).length), total: iv.windows[0].actual.length, coverage: iv.coverage };
  };
  const calm = fit({ shiftSize: 0 }), shifted = fit({});
  const left = 58, right = 624, top = 66, base = 206, W = calm.counts.length, T = calm.total;
  const Y = v => base - v / T * (base - top), gw = (right - left) / W, bw = gw * 0.34;
  const grid = [0, 4, 8, 12].map(v => `${line(left, Y(v), right, Y(v), { c: 'var(--line)', w: 1 })}${text(left - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('');
  const one = (data, j, fill) => data.counts.map((v, i) => {
    const x = left + i * gw + gw * 0.12 + j * (bw + 2);
    return `<rect x="${x.toFixed(1)}" y="${Y(v).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0.5, base - Y(v)).toFixed(1)}" fill="${fill}"/>${text(x + bw / 2, Y(v) - 4, fmt(v), { ...INK, size: 11 })}`;
  }).join('');
  const target = `${line(left, Y(0.8 * T), right, Y(0.8 * T), { c: 'var(--ink)', w: 1.6, dash: '6 5' })}${line(left, 44, left + 14, 44, { c: 'var(--ink)', w: 1.6, dash: '4 3' })}${text(left + 20, 48, tr(`target 80% (${fmt(0.8 * T, { digits: 1 })} of ${fmt(T)})`, `target 80% (${fmt(0.8 * T, { digits: 1 })} dari ${fmt(T)})`), { anchor: 'start', ...INK, size: 12 })}`;
  const labels = calm.counts.map((_, i) => text(left + (i + 0.5) * gw, base + 16, fmt(i + 1), { size: 12 })).join('');
  const key = `<rect x="${left}" y="6" width="14" height="10" rx="2" fill="${soft(0)}" stroke="${k(0)}"/>${text(left + 20, 16, tr(`no regime shift: ${pct(calm.coverage, 0)} inside overall`, `tanpa regime shift: ${pct(calm.coverage, 0)} di dalam secara keseluruhan`), { anchor: 'start', ...INK, size: 12 })}
    <rect x="${left}" y="22" width="14" height="10" rx="2" fill="${k(1)}"/>${text(left + 20, 32, tr(`shift of +6 at step 190: ${pct(shifted.coverage, 0)} inside overall`, `shift +6 pada langkah 190: ${pct(shifted.coverage, 0)} di dalam secara keseluruhan`), { anchor: 'start', ...INK, size: 12 })}`;
  const axis = `${line(left, base, right, base, { c: 'var(--muted)', w: 1.6 })}${text((left + right) / 2, base + 34, tr('Backtest window (1 = earliest)', 'Window backtest (1 = paling awal)'), { ...INK, size: 12 })}${text(14, (top + base) / 2, tr(`inside, of ${fmt(T)}`, `di dalam, dari ${fmt(T)}`), { ...INK, size: 11 }).replace('<text', `<text transform="rotate(-90 14 ${(top + base) / 2})"`)}`;
  return svg(640, 246, `${key}${grid}${target}${one(calm, 0, soft(0)).replaceAll('fill="' + soft(0) + '"', `fill="${soft(0)}" stroke="${k(0)}"`)}${one(shifted, 1, k(1))}${labels}${axis}`);
}

export const figures = {
  'lab-map': labMap,
  'horizon': horizon,
  'windows': windowsFigure,
  'band': band,
};
