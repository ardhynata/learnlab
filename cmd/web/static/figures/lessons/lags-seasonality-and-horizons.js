// Figures for the lesson "Lags, seasonality and horizons": [[figure:lags-seasonality-and-horizons/name|Caption]].
// Every number is the one in the lesson text: the shop's twelve invented quarterly sales, built as
// 100 + 3 per quarter + a seasonal amount (-18, +22, -9, +5 for Q1 to Q4) + a few units of noise.
// Quarters 1 to 8 are training, 9 to 12 the test year. The lag 4 model is "lag 4 + offset", the offset
// being the mean of (target - lag 4) over the training rows. Forecasts and errors are computed here,
// from the series, so the figure and the lesson cannot drift apart.
import { svg, dot, ring, diamond, text, line, box, k, soft, tr, fmt } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const SALES = [86, 126, 102, 117, 98, 139, 113, 129, 109, 150, 125, 143];
const SEASON = [-18, 22, -9, 5];
const NOISE = [1, -2, 2, 0, 1, -1, 1, 0, 0, -2, 1, 2];
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;

// The three forecasts of quarters 9 to 12 and their MAE (all from the series).
function forecasts() {
  const truth = SALES.slice(8);
  const naive = truth.map(() => SALES[7]);
  const seasonal = truth.map((_, i) => SALES[4 + i]);
  const offset = mean([4, 5, 6, 7].map(t => SALES[t] - SALES[t - 4]));
  const lag4 = truth.map((_, i) => SALES[4 + i] + offset);
  const mae = f => mean(truth.map((v, i) => Math.abs(v - f[i])));
  return { truth, naive, seasonal, lag4, maes: [mae(naive), mae(seasonal), mae(lag4)] };
}

// 1. The series and its three parts, all on the same scale (1.3 px per unit) so that the size of each part is honest.
function parts() {
  const W = 640, left = 128, right = 24, S = 1.3;
  const X = t => left + (t - 1) * (W - left - right) / 11;
  const panels = [
    { name: tr('Observed', 'Teramati'), top: 34, mid: 117, half: 38, color: 'var(--ink)', values: SALES, ticks: [90, 120, 150] },
    { name: tr('Trend', 'Tren'), top: 160, mid: 120, half: 22, color: k(0), values: SALES.map((_, i) => 100 + 3 * (i + 1)), ticks: [105, 120, 135] },
    { name: tr('Seasonality', 'Seasonality'), top: 244, mid: 2, half: 26, color: k(1), values: SALES.map((_, i) => SEASON[i % 4]), ticks: [-18, 0, 22] },
    { name: tr('Noise', 'Noise'), top: 338, mid: 0, half: 14, color: k(2), values: NOISE, ticks: [0] },
  ];
  const Y = (p, v) => p.top + p.half * S + (p.mid - v) * S;
  let body = '';
  panels.forEach((p, pi) => {
    const h = 2 * p.half * S;
    body += `<rect x="${left - 10}" y="${p.top}" width="${W - left - right + 20}" height="${h}" rx="6" fill="none" stroke="var(--line)" stroke-width="1.2"/>`;
    body += text(6, p.top + h / 2 + 4, p.name, { anchor: 'start', size: 13, weight: 700, fill: p.color });
    p.ticks.forEach(v => { body += text(left - 14, Y(p, v) + 4, fmt(v), { anchor: 'end', size: 10.5 }); });
    if (pi >= 2) body += line(left - 10, Y(p, 0), W - right + 10, Y(p, 0), { w: 1, dash: '3 4' });
    const pts = p.values.map((v, i) => `${i ? 'L' : 'M'}${X(i + 1).toFixed(1)} ${Y(p, v).toFixed(1)}`).join('');
    if (pi < 2) body += `<path d="${pts}" fill="none" stroke="${p.color}" stroke-width="2"/>`;
    p.values.forEach((v, i) => { body += pi === 2 ? `<path d="M${X(i + 1)} ${Y(p, 0)}V${Y(p, v)}" stroke="${p.color}" stroke-width="3" stroke-linecap="round"/>` : dot(X(i + 1), Y(p, v), p.color, pi === 3 ? 3.5 : 4.5); });
  });
  // Year dividers and quarter numbers.
  const bottom = panels[3].top + 2 * panels[3].half * S;
  [4.5, 8.5].forEach(t => { body += line(X(t), 24, X(t), bottom + 4, { w: 1, dash: '4 4' }); });
  for (let t = 1; t <= 12; t++) body += text(X(t), bottom + 20, fmt(t), { size: 11 });
  [0, 1, 2].forEach(y => { body += text(X(y * 4 + 2.5), bottom + 38, `${tr('year', 'tahun')} ${fmt(y + 1)}`, { size: 12, ...INK }); });
  body += text(X(6.5), bottom + 60, tr('quarter number', 'nomor kuartal'), { size: 12 });
  body += text(left - 10, panels[1].top - 8, tr(`+${fmt(3)} per quarter`, `+${fmt(3)} per kuartal`), { anchor: 'start', size: 12, fill: k(0), weight: 600 });
  body += text(left - 10, panels[2].top - 8, tr('the same shape every year', 'bentuk sama tiap tahun'), { anchor: 'start', size: 12, fill: k(1), weight: 600 });
  body += text(left - 10, panels[3].top - 8, tr('a few units either way', 'beberapa unit ke dua arah'), { anchor: 'start', size: 12, fill: k(2), weight: 600 });
  return svg(W, bottom + 72, body);
}

// 2. One training row: the target of quarter 6 with its lag 1, its lag 4 and the window of the previous four quarters.
function lags() {
  const bw = 58, gap = 12, x0 = 40, by = 150, bh = 40;
  const bx = i => x0 + i * (bw + gap);
  const cx = i => bx(i) + bw / 2;
  const role = i => (i === 5 ? 'target' : i === 4 ? 'lag1' : i === 1 ? 'lag4' : i < 5 && i > 1 ? 'window' : i < 5 ? 'old' : 'later');
  const cells = SALES.slice(0, 8).map((v, i) => {
    const r = role(i);
    const fill = r === 'target' ? k(0) : r === 'later' ? 'var(--surface)' : r === 'old' ? 'var(--surface)' : soft(r === 'lag1' ? 1 : r === 'lag4' ? 2 : 3);
    const stroke = r === 'target' ? k(0) : r === 'lag1' ? k(1) : r === 'lag4' ? k(2) : r === 'window' ? k(3) : 'var(--line)';
    return `<rect x="${bx(i)}" y="${by}" width="${bw}" height="${bh}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="2"${r === 'later' ? ' stroke-dasharray="4 4"' : ''}/>${text(cx(i), by + 25, fmt(v), { size: 15, weight: 700, fill: r === 'target' ? '#fff' : r === 'later' ? 'var(--muted)' : 'var(--ink)' })}${text(cx(i), by + bh + 17, `${fmt(i + 1)}`, { size: 12 })}`;
  }).join('');
  const arc = (from, to, height, col, label) => `<path d="M${cx(from)} ${by - 2}C${cx(from)} ${by - height} ${cx(to)} ${by - height} ${cx(to)} ${by - 2}" fill="none" stroke="${col}" stroke-width="2.4" marker-end="url(#arr)"/>${text((cx(from) + cx(to)) / 2, by - height * 0.75 - 6, label, { size: 13, weight: 700, fill: col })}`;
  const winL = bx(1), winR = bx(4) + bw;
  return svg(640, 300, `
${text(x0, 22, tr(`Row for quarter ${fmt(6)}: target ${fmt(139)}`, `Baris untuk kuartal ${fmt(6)}: target ${fmt(139)}`), { anchor: 'start', size: 15, ...INK })}
${arc(1, 5, 112, k(2), `${tr('lag 4', 'lag 4')} = ${fmt(126)}`)}${arc(4, 5, 34, k(1), '')}
${text(cx(4) - 6, by - 14, `${tr('lag 1', 'lag 1')} = ${fmt(98)}`, { anchor: 'end', size: 13, weight: 700, fill: k(1) })}
${cells}
<path d="M${winL} ${by + bh + 30}V${by + bh + 38}H${winR}V${by + bh + 30}" fill="none" stroke="${k(3)}" stroke-width="2.4"/>
${text((winL + winR) / 2, by + bh + 58, `${tr('window: mean of the previous 4 =', 'window: rata-rata 4 kuartal sebelumnya =')} ${fmt(110.75)}`, { size: 13, weight: 700, fill: k(3) })}
${text(cx(6.5) + 10, by - 12, tr('later quarters: not used', 'kuartal berikutnya: tidak dipakai'), { size: 12 })}
${text(x0, 288, tr(`Quarter ${fmt(1)} has no lag ${fmt(4)}, so rows start at quarter ${fmt(5)}.`, `Kuartal ${fmt(1)} belum punya lag ${fmt(4)}, sehingga baris dimulai dari kuartal ${fmt(5)}.`), { anchor: 'start', size: 12 })}`);
}

// 3. Recursive against direct, from the origin (129, the last training value) with the toy rule "next = this + 3".
function horizon() {
  const W = 640, bw = 80, bh = 38;
  const xs = [28, 168, 288, 408, 528];
  const row1 = 62, row2 = 228;
  const origin = y => `${box(xs[0], y, bw, bh, 'var(--surface)', 'var(--ink)')}${text(xs[0] + bw / 2, y + 17, tr('origin', 'origin'), { size: 11 })}${text(xs[0] + bw / 2, y + 32, fmt(129), { size: 14, ...INK })}`;
  const target = (y, i, col) => `${box(xs[i], y, bw, bh, soft(col), k(col))}${text(xs[i] + bw / 2, y + 17, `h = ${fmt(i)}`, { size: 11 })}${text(xs[i] + bw / 2, y + 32, fmt(129 + 3 * i), { size: 14, ...INK })}`;
  let body = text(10, 24, tr('Recursive: one one-step model, reused on its own output', 'Recursive: satu model satu langkah, dipakai ulang pada keluarannya sendiri'), { anchor: 'start', size: 14, fill: k(1), weight: 700 });
  body += origin(row1);
  for (let i = 1; i <= 4; i++) {
    body += target(row1, i, 1);
    body += line(xs[i - 1] + bw + 2, row1 + bh / 2, xs[i] - 3, row1 + bh / 2, { c: 'var(--muted)', w: 2, arrow: true });
    body += text((xs[i - 1] + bw + xs[i]) / 2, row1 + bh / 2 - 6, `+${fmt(3)}`, { size: 12, weight: 700 });
  }
  body += text(W / 2, row1 + bh + 22, tr('each forecast becomes the next input, so an early miss is carried forward', 'tiap prediksi menjadi input berikutnya, sehingga galat awal ikut terbawa'), { size: 12 });
  body += text(10, 156, tr('Direct: one model for each horizon, all from the known origin', 'Direct: satu model untuk tiap horizon, semuanya dari origin yang diketahui'), { anchor: 'start', size: 14, fill: k(2), weight: 700 });
  body += origin(row2);
  for (let i = 1; i <= 4; i++) {
    body += target(row2, i, 2);
    const a = xs[0] + bw / 2, b = xs[i] + bw / 2, h = 12 + i * 12;
    body += `<path d="M${a + 18} ${row2 - 1}C${a + 18} ${row2 - h - 6} ${b - 18} ${row2 - h - 6} ${b - 18} ${row2 - 3}" fill="none" stroke="var(--muted)" stroke-width="1.8" marker-end="url(#arr)"/>`;
  }
  body += text(W / 2, row2 + bh + 22, tr(`model h reads only values known at the origin; here, origin + ${fmt(3)}h`, `model h hanya membaca nilai yang diketahui di origin; di sini origin + ${fmt(3)}h`), { size: 12 });
  return svg(W, 300, body);
}

// 4. The test year: actual sales and the three forecasts of quarters 9 to 12.
function forecastsFigure() {
  const f = forecasts();
  const W = 640, left = 56, right = 24, top = 40, bottom = 230, lo = 90, hi = 160;
  const X = t => left + (t - 5) * (W - left - right) / 7;
  const Y = v => bottom - (v - lo) / (hi - lo) * (bottom - top);
  const polyline = (pts, col, dash) => `<path d="${pts.map(([t, v], i) => `${i ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(v).toFixed(1)}`).join('')}" fill="none" stroke="${col}" stroke-width="2" ${dash ? `stroke-dasharray="${dash}"` : ''} stroke-linejoin="round"/>`;
  const grid = [90, 110, 130, 150].map(v => `${line(left, Y(v), W - right, Y(v), { w: 1 })}${text(left - 8, Y(v) + 4, fmt(v), { anchor: 'end', size: 11 })}`).join('');
  const actual = [5, 6, 7, 8, 9, 10, 11, 12].map(t => [t, SALES[t - 1]]);
  const series = [
    { name: tr('Naive', 'Naive'), data: f.naive, col: 'var(--muted)', dash: '6 5', mark: (x, y) => ring(x, y, 'var(--muted)', 5) },
    { name: tr('Seasonal naive', 'Seasonal naive'), data: f.seasonal, col: k(0), dash: '', mark: (x, y) => ring(x, y, k(0), 5) },
    { name: tr('Lag 4 + offset', 'Lag 4 + offset'), data: f.lag4, col: k(2), dash: '', mark: (x, y) => diamond(x, y, k(2), 6) },
  ];
  let body = `<rect x="${X(8.5)}" y="${top - 8}" width="${X(12) - X(8.5) + 24}" height="${bottom - top + 8}" fill="var(--accent-soft)" opacity="0.6"/>`;
  body += text(left, 18, tr('Sales per quarter: the last training year and the test year', 'Penjualan per kuartal: tahun latih terakhir dan tahun uji'), { anchor: 'start', size: 14, ...INK });
  body += grid + line(left, bottom, W - right, bottom, { c: 'var(--muted)', w: 1.6 });
  body += line(X(8.5), top - 8, X(8.5), bottom, { w: 1.6, c: 'var(--muted)', dash: '5 4' });
  body += text(X(8.5) + 6, top + 4, tr('forecast origin', 'forecast origin'), { anchor: 'start', size: 12 });
  body += polyline(actual, 'var(--ink)');
  series.forEach(s => {
    body += polyline([[8, SALES[7]], ...s.data.map((v, i) => [9 + i, v])], s.col, s.dash || '3 4');
    s.data.forEach((v, i) => { body += s.mark(X(9 + i), Y(v)); });
  });
  actual.forEach(([t, v]) => { body += dot(X(t), Y(v), 'var(--ink)', t >= 9 ? 5.5 : 4); });
  for (let t = 5; t <= 12; t++) body += text(X(t), bottom + 17, fmt(t), { size: 11 });
  body += text((left + W - right) / 2, bottom + 34, tr('quarter number', 'nomor kuartal'), { size: 12 });
  // Legend with each forecast's MAE.
    body += `${dot(left, 292, 'var(--ink)', 5)}${text(left + 12, 296, tr('Actual', 'Aktual'), { anchor: 'start', size: 12 })}`;
  series.forEach((s, i) => {
    const x = [left + 80, left + 250, left + 430][i];
    body += `${s.mark(x, 292)}${text(x + 12, 296, `${s.name} (MAE ${fmt(f.maes[i])})`, { anchor: 'start', size: 12 })}`;
  });
  return svg(W, 312, body);
}

export const figures = { parts, lags, horizon, forecasts: forecastsFigure };
