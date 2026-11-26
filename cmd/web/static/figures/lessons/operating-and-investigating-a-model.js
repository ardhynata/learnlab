// Figures for the lesson "Operating and investigating a model": [[figure:operating-and-investigating-a-model/name|Caption]].
// Every number is the one in the lesson text. The card-fraud project is invented: 10,000 payments a day, 200 reviews a day,
// 71 frauds in the queue at launch. From day 34 an app release leaves out the device age and the queue holds 44 frauds a day.
// For visible arithmetic each day is exactly 71 before day 34 and exactly 44 from day 34 on.
import { svg, dot, diamond, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };

// ---- the six steps ---------------------------------------------------------------------------------
function investigationSteps() {
  const rows = [
    [tr('Reproduce', 'Reproduksi'), tr('Can it fail again on demand?', 'Bisakah gagal lagi saat diminta?'),
      tr(['Replay day 36 from the snapshot:', `same 200 payments, ${fmt(44)} frauds`], ['Putar ulang hari 36 dari snapshot:', `200 pembayaran sama, ${fmt(44)} fraud`])],
    [tr('Slice', 'Slice'), tr('Where does the drop sit?', 'Di mana penurunannya terpusat?'),
      tr([`By channel: app ${fmt(46)} → ${fmt(19)} frauds,`, `web ${fmt(25)} → ${fmt(25)}`], [`Per channel: app ${fmt(46)} → ${fmt(19)} fraud,`, `web ${fmt(25)} → ${fmt(25)}`])],
    [tr('First changed thing', 'Hal pertama yang berubah'), tr('What changed first, and when?', 'Apa yang berubah pertama kali?'),
      tr(['Day 34, app slice: release 5.2,', `device age empty on ${pct(0.63, 0)}`], ['Hari 34, slice app: rilis 5.2,', `device age kosong pada ${pct(0.63, 0)}`])],
    [tr('Confirm the cause', 'Konfirmasi penyebab'), tr('Does the candidate reproduce it?', 'Apakah kandidat memunculkannya?'),
      tr(['Day 8, device age blanked:', `${fmt(71)} → ${fmt(45)}; extra payments: ${fmt(71)}`], ['Hari 8, device age dikosongkan:', `${fmt(71)} → ${fmt(45)}; pembayaran tambahan: ${fmt(71)}`])],
    [tr('Fix', 'Perbaikan'), tr('The smallest change that is enough', 'Perbaikan terkecil yang cukup'),
      tr(['Device registry fallback,', `scored live from day ${fmt(42)}`], ['Fallback device registry,', `dipakai scoring sejak hari ${fmt(42)}`])],
    [tr('Test or alert', 'Test atau alert'), tr('Caught sooner next time?', 'Terdeteksi lebih cepat lain kali?'),
      tr([`Empty-share check on all ${fmt(12)} features,`, 'and a replay test before releases'], [`Cek porsi kosong pada ${fmt(12)} feature,`, 'dan replay test sebelum rilis'])],
  ];
  const X1 = 10, W1 = 290, X2 = 350, W2 = 280, H = 46, T = 46, G = 12;
  const body = rows.map(([title, q, a], i) => {
    const y = T + i * (H + G);
    return `${box(X1, y, W1, H, 'var(--surface)', 'var(--line)')}
${dot(X1 + 26, y + H / 2, k(i % 7), 15)}${text(X1 + 26, y + H / 2 + 5, fmt(i + 1), { size: 14, weight: 700, fill: '#fff' })}
${text(X1 + 52, y + 19, title, { anchor: 'start', size: 14, weight: 700, fill: 'var(--ink)' })}
${text(X1 + 52, y + 37, q, { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${line(X1 + W1 + 6, y + H / 2, X2 - 6, y + H / 2, { c: 'var(--muted)', w: 2, arrow: true })}
${box(X2, y, W2, H, soft(i % 7), k(i % 7))}
${text(X2 + W2 / 2, y + 19, a[0], { size: 12, ...INK })}${text(X2 + W2 / 2, y + 36, a[1], { size: 12, ...INK })}`;
  }).join('');
  return svg(640, T + rows.length * (H + G) - G + 10, `
${text(X1 + W1 / 2, 28, tr('Step', 'Langkah'), { size: 14, ...INK })}
${text(X2 + W2 / 2, 28, tr('In the fraud case', 'Pada kasus fraud'), { size: 14, ...INK })}
${body}`);
}

// ---- 7-day hit rate against the thresholds ---------------------------------------------------------
function hitRateTimeline() {
  const D0 = 28, D1 = 42, V0 = 15, V1 = 40;
  const L = 62, R = 622, T = 34, B = 250;
  const X = d => L + (d - D0) / (D1 - D0) * (R - L);
  const Y = v => B - (v - V0) / (V1 - V0) * (B - T);
  const daily = d => (d >= 34 ? 44 : 71);
  const mean = d => { let s = 0; for (let i = d - 6; i <= d; i++) s += daily(i); return s / 7 / 200 * 100; };
  const pts = [];
  for (let d = D0; d <= 41; d++) pts.push([X(d), Y(mean(d)), d, mean(d)]);
  const grid = [15, 20, 25, 30, 35, 40].map(v => `${line(L, Y(v), R, Y(v), { c: 'var(--line)', w: 1 })}${text(L - 8, Y(v) + 4, pct(v / 100, 0), { anchor: 'end', size: 12 })}`).join('');
  const ticks = [28, 30, 32, 34, 36, 38, 40, 42].map(d => `${line(X(d), B, X(d), B + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(d), B + 20, fmt(d), { size: 12, fill: 'var(--ink)' })}`).join('');
  const path = `<path d="M${pts.map(p => `${p[0]} ${p[1]}`).join('L')}" fill="none" stroke="${k(0)}" stroke-width="2.6" stroke-linejoin="round"/>`;
  const dots = pts.map(p => (p[2] === 36 || p[2] === 39 ? '' : dot(p[0], p[1], k(0), 4.5))).join('');
  const warn = pts.find(p => p[2] === 36), page = pts.find(p => p[2] === 39);
  const thr = (v, c, label) => `${line(L, Y(v), R, Y(v), { c, w: 2, dash: '7 5' })}${text(L + 6, Y(v) - 7, label, { anchor: 'start', size: 12, ...INK, fill: c })}`;
  return svg(640, 300, `
${grid}${line(L, B, R, B, { c: 'var(--muted)', w: 1.6 })}${ticks}
${thr(30, k(3), tr(`Warn: ${pct(0.3, 0)}`, `Warn: ${pct(0.3, 0)}`))}
${thr(24, k(1), tr(`Page: ${pct(0.24, 0)}`, `Page: ${pct(0.24, 0)}`))}
${thr(19, 'var(--muted)', tr(`Rule baseline: ${pct(0.19, 0)}`, `Baseline aturan: ${pct(0.19, 0)}`))}
${line(X(34), T, X(34), B, { c: 'var(--muted)', w: 1.6, dash: '3 4' })}
${text(X(34) - 6, T + 10, tr('Day 34: release 5.2', 'Hari 34: rilis 5.2'), { anchor: 'end', size: 12, ...INK })}
${line(X(35), T, X(35), B, { c: k(2), w: 1.6, dash: '3 4' })}
${text(X(35) + 6, T + 10, tr('Day 35: new empty-share check fires', 'Hari 35: cek baru berbunyi'), { anchor: 'start', size: 12, ...INK, fill: k(2) })}
${line(X(42), T, X(42), B, { c: 'var(--muted)', w: 1.6, dash: '3 4' })}
${text(X(42) - 6, B - 8, tr(`Day ${fmt(42)}: fix scored`, `Hari ${fmt(42)}: perbaikan dipakai`), { anchor: 'end', size: 12, ...INK })}
${path}${dots}${diamond(warn[0], warn[1], k(3), 9)}${diamond(page[0], page[1], k(1), 9)}
${text(warn[0] + 12, warn[1] - 13, tr(`Day 36: ${pct(warn[3] / 100, 1)}, warn`, `Hari 36: ${pct(warn[3] / 100, 1)}, warn`), { anchor: 'start', size: 12, ...INK })}
${text(page[0] - 12, page[1] + 24, tr(`Day 39: ${pct(page[3] / 100, 1)}, page`, `Hari 39: ${pct(page[3] / 100, 1)}, page`), { anchor: 'end', size: 12, ...INK })}
${text(L + 6, Y(35.5) - 9, tr(`${fmt(71)} frauds a day: ${pct(0.355, 1)}`, `${fmt(71)} fraud per hari: ${pct(0.355, 1)}`), { anchor: 'start', size: 12, ...INK, fill: k(0) })}
${text(L + 4, 20, tr('Queue hit rate, 7-day mean', 'Hit rate antrean, rata-rata 7 hari'), { anchor: 'start', size: 13, ...INK })}
${text((L + R) / 2, 288, tr('Day after launch', 'Hari sejak peluncuran'), { size: 12 })}`);
}

// ---- slicing by channel ----------------------------------------------------------------------------
function sliceTheDrop() {
  const W = 258, T = 62, B = 204, H = B - T;
  const before = k(0), after = k(1);
  const panel = (x0, title, vmax, groups, lab) => {
    const gw = (W - 10) / groups.length, bw = 40;
    const ticks = [0, 0.5, 1].map(f => `${line(x0, B - f * H, x0 + W, B - f * H, { c: 'var(--line)', w: 1 })}${text(x0 - 6, B - f * H + 4, pct(vmax * f, 0), { anchor: 'end', size: 12 })}`).join('');
    const bars = groups.map(([name, a, b], gi) => {
      const cx = x0 + 5 + gw * (gi + 0.5);
      const one = (v, dx, col) => {
        const h = v / vmax * H;
        return `<rect x="${cx + dx - bw / 2}" y="${B - h}" width="${bw}" height="${Math.max(h, 1)}" rx="4" fill="${col}"/>${text(cx + dx, B - h - 6, lab(v), { size: 12, ...INK })}`;
      };
      return `${one(a, -bw / 2 - 3, before)}${one(b, bw / 2 + 3, after)}${text(cx, B + 18, name, { size: 13, fill: 'var(--ink)' })}`;
    }).join('');
    return `${text(x0 + W / 2, 30, title, { size: 14, ...INK })}${ticks}${line(x0, B, x0 + W, B, { c: 'var(--muted)', w: 1.6 })}${bars}`;
  };
  const hit = v => pct(v, 0);
  const miss = v => (v < 0.1 ? pct(v, 1) : pct(v, 0));
  const legend = `<rect x="198" y="240" width="14" height="14" rx="3" fill="${before}"/>${text(218, 252, tr('Before day 34', 'Sebelum hari 34'), { anchor: 'start', size: 13, fill: 'var(--ink)' })}
<rect x="352" y="240" width="14" height="14" rx="3" fill="${after}"/>${text(372, 252, tr('After day 34', 'Sesudah hari 34'), { anchor: 'start', size: 13, fill: 'var(--ink)' })}`;
  return svg(640, 272, `
${panel(52, tr('Hit rate of the queue', 'Hit rate antrean'), 0.5, [[tr('App', 'App'), 46 / 120, 19 / 120], [tr('Web', 'Web'), 25 / 80, 25 / 80]], hit)}
${panel(366, tr('Empty device age', 'Device age kosong'), 0.8, [[tr('App', 'App'), 0.004, 0.63], [tr('Web', 'Web'), 0.004, 0.004]], miss)}
${legend}`);
}

export const figures = {
  'investigation-steps': investigationSteps,
  'hit-rate-timeline': hitRateTimeline,
  'slice-the-drop': sliceTheDrop,
};
