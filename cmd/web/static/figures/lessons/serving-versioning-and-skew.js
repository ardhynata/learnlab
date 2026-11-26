// Figures for the lesson "Serving, versioning and skew": [[figure:serving-versioning-and-skew/name|Caption]].
// The numbers are the ones in the lesson text. The histogram counts come from data/penguins.csv
// (342 penguins with a flipper length, 5 mm bins from 170 to 235), and the rule "Gentoo if flipper >= 207 mm"
// is right for 334 of them (97.7%); in centimeters it is right for the 219 non-Gentoo penguins (64.0%).
import { svg, dot, ring, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };

// ---- Figure 1: batch and online paths ------------------------------------------------------------------
function batchAndOnline() {
  const bx = [112, 262, 412, 562], bw = 132, bh = 58;
  const lane = (y, title, subtitle, steps) => `${text(8, y + 26, title, { anchor: 'start', ...INK, size: 14 })}${text(8, y + 44, subtitle, { anchor: 'start', size: 11 })}
${steps.map((s, i) => `${box(bx[i], y, bw, bh, i === 2 ? 'var(--accent-soft)' : 'var(--surface)', i === 2 ? 'var(--accent)' : 'var(--line)')}${text(bx[i] + bw / 2, y + 25, s[0], { ...INK, size: 13 })}${text(bx[i] + bw / 2, y + 43, s[1], { size: 12 })}${i < 3 ? line(bx[i] + bw, y + bh / 2, bx[i + 1], y + bh / 2, { w: 2, c: 'var(--muted)', arrow: true }) : ''}`).join('')}`;
  const top = 34, bot = 170;
  return svg(720, 290, `
${lane(top, tr('Batch', 'Batch'), tr('ahead of time', 'sebelumnya'), [
    [tr('All rows', 'Semua baris'), tr('every night', 'tiap malam')],
    [tr('Model', 'Model'), tr('scores them', 'memberi skor')],
    [tr('Score table', 'Tabel skor'), tr('stored', 'disimpan')],
    [tr('App', 'Aplikasi'), tr('reads a score', 'membaca skor')]])}
${text(112, top + 84, tr(`Nobody waits. A score is as old as the last run: up to ${fmt(24)} hours.`, `Tidak ada yang menunggu. Usia skor sama dengan proses terakhir: sampai ${fmt(24)} jam.`), { anchor: 'start', size: 12 })}
${lane(bot, tr('Online', 'Online'), tr('on request', 'saat diminta'), [
    [tr('Request', 'Permintaan'), tr('someone waits', 'ada menunggu')],
    [tr('Fetch features', 'Ambil feature'), tr('from stores', 'dari penyimpanan')],
    [tr('Model', 'Model'), tr('scores one row', 'skor satu baris')],
    [tr('Answer', 'Jawaban'), tr('sent back', 'dikirim balik')]])}
${line(bx[0], bot + 74, bx[3] + bw, bot + 74, { w: 2, c: 'var(--accent)' })}${line(bx[0], bot + 68, bx[0], bot + 80, { w: 2, c: 'var(--accent)' })}${line(bx[3] + bw, bot + 68, bx[3] + bw, bot + 80, { w: 2, c: 'var(--accent)' })}
${text(385, bot + 96, tr(`latency budget: ${fmt(100)} ms for the whole path`, `anggaran latensi: ${fmt(100)} ms untuk seluruh jalur`), { size: 12, ...INK })}
${text(385, bot + 114, tr('Fresh features, but servers run all day.', 'Feature segar, tetapi server menyala sepanjang hari.'), { size: 12 })}`);
}

// ---- Figure 2: the release path ------------------------------------------------------------------------
function releasePath() {
  const x0 = 160, w = 280, bh = 26;
  const rows = [
    { y: 80, name: tr('1  Shadow', '1  Shadow'), v4: 0, note: [tr('v4 runs on every request;', 'v4 berjalan di tiap permintaan;'), tr('its answers are only logged', 'jawabannya hanya dicatat')], shadow: true },
    { y: 150, name: tr('2  Canary', '2  Canary'), v4: 0.05, note: [tr(`v4 answers ${fmt(5)}% of requests;`, `v4 menjawab ${fmt(5)}% permintaan;`), tr('v3 answers the rest', 'v3 menjawab sisanya')] },
    { y: 220, name: tr('3  Full release', '3  Rilis penuh'), v4: 1, note: [tr('v4 answers everything;', 'v4 menjawab semuanya;'), tr('v3 stays stored', 'v3 tetap tersimpan')] },
  ];
  const bar = r => {
    const w4 = w * r.v4;
    return `${r.v4 < 1 ? `<rect x="${x0 + w4}" y="${r.y}" width="${w - w4}" height="${bh}" rx="4" fill="${k(0)}"/>` : ''}${r.v4 > 0 ? `<rect x="${x0}" y="${r.y}" width="${Math.max(w4, 3)}" height="${bh}" rx="4" fill="${k(2)}"/>` : ''}${r.shadow ? `<rect x="${x0}" y="${r.y + bh + 5}" width="${w}" height="9" rx="3" fill="none" stroke="${k(2)}" stroke-width="2" stroke-dasharray="5 4"/>` : ''}`;
  };
  return svg(720, 320, `
${dot(x0 + 6, 30, k(0), 6)}${text(x0 + 18, 34, tr('answers users see from v3', 'jawaban dari v3 yang dilihat pengguna'), { anchor: 'start', size: 12 })}${dot(x0 + 290, 30, k(2), 6)}${text(x0 + 302, 34, tr('answers users see from v4', 'jawaban dari v4 yang dilihat pengguna'), { anchor: 'start', size: 12 })}
${rows.map(r => `${text(10, r.y + 18, r.name, { anchor: 'start', ...INK, size: 14 })}${bar(r)}${text(x0 + w + 20, r.y + 12, r.note[0], { anchor: 'start', size: 12 })}${text(x0 + w + 20, r.y + 28, r.note[1], { anchor: 'start', size: 12 })}`).join('')}
${text(x0 + w / 2, 70, tr('share of requests', 'porsi permintaan'), { size: 11 })}
${line(x0 + w, 285, x0, 285, { w: 2, c: 'var(--muted)', arrow: true })}${text(x0 + w / 2, 306, tr('rollback: set v4 back to 0%, while v3 is still stored', 'rollback: kembalikan v4 ke 0%, selagi v3 masih tersimpan'), { size: 12, ...INK })}`);
}

// ---- Figure 3: time travel -----------------------------------------------------------------------------
function timeTravel() {
  const X = d => 40 + d * 21, ay = 100;
  const purchases = [3, 8, 12];
  const bracket = (x1, x2, y) => `${line(x1, y, x2, y, { w: 2, c: 'var(--muted)' })}${line(x1, y - 6, x1, y + 6, { w: 2, c: 'var(--muted)' })}${line(x2, y - 6, x2, y + 6, { w: 2, c: 'var(--muted)' })}`;
  const ticks = [0, 5, 10, 15, 20, 25, 30].map(d => `${line(X(d), ay - 4, X(d), ay + 4, { w: 1.6, c: 'var(--muted)' })}${d === 10 ? '' : text(X(d), ay + 22, fmt(d), { size: 11 })}`).join('');
  return svg(720, 270, `
${line(X(0), ay, X(30), ay, { w: 2, c: 'var(--muted)' })}${ticks}${text(X(30) + 16, ay + 22, tr('day', 'hari'), { anchor: 'start', size: 11 })}
${line(X(10), 52, X(10), 150, { w: 2, c: 'var(--accent)', dash: '6 5' })}${text(X(10), 44, tr(`prediction made on day ${fmt(10)}`, `prediksi dibuat pada hari ke-${fmt(10)}`), { ...INK, size: 13 })}
${purchases.map(d => (d < 10 ? dot(X(d), ay, k(0), 7) : ring(X(d), ay, k(2), 7))).join('')}
${text(X(3), ay - 16, tr(`day ${fmt(3)}`, `hari ${fmt(3)}`), { size: 12 })}${text(X(8), ay - 16, tr(`day ${fmt(8)}`, `hari ${fmt(8)}`), { size: 12 })}${text(X(12) + 8, ay - 16, tr(`day ${fmt(12)}: later`, `hari ${fmt(12)}: nanti`), { size: 12, fill: k(2), weight: 700 })}
${bracket(X(0), X(10), 152)}${text(X(0), 176, tr(`Live on day ${fmt(10)}: ${fmt(2)} purchases known`, `Saat live di hari ke-${fmt(10)}: ${fmt(2)} pembelian diketahui`), { anchor: 'start', ...INK, size: 13 })}
${bracket(X(0), X(30), 202)}${text(X(0), 226, tr(`Table built at month end: ${fmt(3)} purchases, one from the future`, `Tabel dibuat akhir bulan: ${fmt(3)} pembelian, satu dari masa depan`), { anchor: 'start', ...INK, size: 13 })}
${text(X(0), 250, tr('feature: purchases this month', 'feature: pembelian bulan ini'), { anchor: 'start', size: 12 })}`);
}

// ---- Figure 4: the unit slip ---------------------------------------------------------------------------
// Counts of penguins per 5 mm flipper bin (170, 175, ... 230), 342 in all.
const BINS = [2, 6, 24, 45, 62, 51, 19, 19, 35, 36, 24, 11, 8];
function unitSkew() {
  const X = v => 40 + v * (640 / 240), base1 = 168, base2 = 262, unit = 1.1;
  const bars = BINS.map((c, i) => {
    const v = 170 + i * 5;
    return `<rect x="${X(v) + 1}" y="${base1 - c * unit}" width="${X(v + 5) - X(v) - 2}" height="${c * unit}" fill="${k(0)}"/>`;
  }).join('');
  const lo = X(17.2), hi = X(23.1);
  const axis = [0, 50, 100, 150, 200, 240].map(v => `${line(X(v), base2 + 2, X(v), base2 + 8, { w: 1.6, c: 'var(--muted)' })}${text(X(v), base2 + 22, fmt(v), { size: 11 })}`).join('');
  return svg(720, 320, `
${text(46, 22, tr('Training: flipper length in mm', 'Training: panjang sirip dalam mm'), { anchor: 'start', ...INK, size: 13 })}
${text(46, 40, tr(`rule: Gentoo if ${fmt(207)} or more. Right for ${fmt(334)} of ${fmt(342)} (${pct(334 / 342)})`, `aturan: Gentoo jika ${fmt(207)} atau lebih. Benar untuk ${fmt(334)} dari ${fmt(342)} (${pct(334 / 342)})`), { anchor: 'start', size: 12 })}
${bars}${line(X(0), base1, X(240), base1, { w: 1.6, c: 'var(--muted)' })}
${text(46, 196, tr('Service: the same penguins in cm', 'Service: penguin yang sama dalam cm'), { anchor: 'start', ...INK, size: 13 })}
<rect x="${lo}" y="${base2 - 34}" width="${hi - lo}" height="34" fill="${k(1)}"/>${line(X(0), base2, X(240), base2, { w: 1.6, c: 'var(--muted)' })}
${text(hi + 12, base2 - 20, tr(`all ${fmt(342)} values lie between ${fmt(17.2)} and ${fmt(23.1)}`, `semua ${fmt(342)} nilai berada di antara ${fmt(17.2)} dan ${fmt(23.1)}`), { anchor: 'start', size: 12 })}
${text(hi + 12, base2 - 4, tr(`always "not Gentoo": right for ${fmt(219)} (${pct(219 / 342)})`, `selalu "bukan Gentoo": benar untuk ${fmt(219)} (${pct(219 / 342)})`), { anchor: 'start', size: 12, ...INK })}
${line(X(207), 52, X(207), base2, { w: 2, c: 'var(--accent)', dash: '6 5' })}${text(X(207), 56 - 6, fmt(207), { size: 12, fill: 'var(--accent)', weight: 700 })}
${axis}${text(X(120), base2 + 40, tr('the number the model receives', 'angka yang diterima model'), { size: 12 })}`);
}

export const figures = {
  'batch-and-online': batchAndOnline,
  'release-path': releasePath,
  'time-travel': timeTravel,
  'unit-skew': unitSkew,
};
