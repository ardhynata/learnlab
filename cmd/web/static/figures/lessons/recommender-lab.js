// Figures for the lesson "Recommender lab": [[figure:recommender-lab/name|Caption]].
// Numbers come from the lab's own pipeline (sims/ml/recommenderlab.js) with its defaults (150 users, 80 items, seed 1,
// top-10, NDCG@10) and 30% of the 96 scored users made cold: 29 cold-start users, 67 warm ones.
// Recommender colors follow the lab: popularity k0, user k-NN k1, item k-NN k2, matrix factorization k3, content k4, hybrid k5.
import { svg, dot, text, line, k, tr, fmt } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const tint = i => `color-mix(in srgb, var(--k${i}) 22%, var(--surface))`;
const f2 = v => fmt(v, { digits: 2 });

// Figure 1: three rows of the heatmap, 16 of the 80 items. Filled = seen, ring = held out, pale = removed history.
function rowStates() {
  const X0 = 224, C = 24, N = 16, H = 22;
  const rows = [
    { name: tr('Warm user', 'Pengguna warm'), seen: [0, 2, 3, 6, 7, 9, 12, 14], removed: [], held: 5, cold: false },
    { name: tr('Cold start, none kept', 'Cold start, tanpa riwayat'), seen: [], removed: [0, 2, 3, 6, 7, 9, 12, 14], held: 5, cold: true },
    { name: tr(`Cold start, ${fmt(3)} kept`, `Cold start, ${fmt(3)} disimpan`), seen: [2, 7, 12], removed: [0, 3, 6, 9, 14], held: 5, cold: true },
  ];
  const gap = 56;
  let body = text(X0 + (N * C) / 2, 24, tr(`Items (${fmt(16)} of ${fmt(80)})`, `Item (${fmt(16)} dari ${fmt(80)})`), { size: 13, ...INK });
  rows.forEach((r, ri) => {
    const y = 44 + ri * gap;
    body += text(X0 - 30, y + H / 2 + 5, r.name, { size: 13, anchor: 'end', ...INK });
    if (r.cold) body += `<rect x="${X0 - 22}" y="${y}" width="8" height="${H}" fill="${k(6)}"/>`;
    for (let c = 0; c < N; c++) {
      const x = X0 + c * C;
      let fill = 'var(--surface)', stroke = 'var(--line)';
      if (r.seen.includes(c)) { fill = k(2); stroke = k(2); }
      else if (r.removed.includes(c)) { fill = `color-mix(in srgb, ${k(6)} 30%, var(--surface))`; stroke = k(6); }
      body += `<rect x="${x}" y="${y}" width="${C - 3}" height="${H}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>`;
      if (c === r.held) body += `<rect x="${x - 1.5}" y="${y - 1.5}" width="${C}" height="${H + 3}" rx="5" fill="none" stroke="var(--ink)" stroke-width="2.4"/>`;
    }
    body += text(X0 + N * C + 12, y + H / 2 + 5, tr(`${fmt(r.seen.length)} seen`, `${fmt(r.seen.length)} terlihat`), { size: 13, anchor: 'start' });
  });
  const ly = 44 + 3 * gap + 6;
  body += `<rect x="40" y="${ly - 12}" width="16" height="14" rx="3" fill="${k(2)}" stroke="${k(2)}"/>${text(62, ly, tr('Seen (the models can use it)', 'Terlihat (dapat dipakai model)'), { size: 12.5, anchor: 'start' })}`
    + `<rect x="270" y="${ly - 13}" width="16" height="16" rx="4" fill="none" stroke="var(--ink)" stroke-width="2.4"/>${text(292, ly, tr('Held out (to be predicted)', 'Disisihkan (untuk diprediksi)'), { size: 12.5, anchor: 'start' })}`
    + `<rect x="40" y="${ly + 12}" width="16" height="14" rx="3" fill="color-mix(in srgb, ${k(6)} 30%, var(--surface))" stroke="${k(6)}"/>${text(62, ly + 25, tr('Removed history', 'Riwayat dihapus'), { size: 12.5, anchor: 'start' })}`
    + `<rect x="270" y="${ly + 11}" width="8" height="16" fill="${k(6)}"/>${text(292, ly + 25, tr('Cold-start user (mark at the left)', 'Pengguna cold-start (tanda di kiri)'), { size: 12.5, anchor: 'start' })}`;
  return svg(680, ly + 40, body);
}

// Figure 2: the hybrid router, three bands by the number of interactions a user has.
function hybridRouting() {
  const X0 = 40, BW = 190, GAP = 15;
  const bands = [
    { i: 0, name: tr('Popularity', 'Popularity'), range: tr(`${fmt(0)} interactions`, `${fmt(0)} interaksi`) },
    { i: 4, name: tr('Content-based', 'Content-based'), range: tr(`${fmt(1)} to ${fmt(4)} interactions`, `${fmt(1)} sampai ${fmt(4)} interaksi`) },
    { i: 3, name: tr('Matrix factorization', 'Matrix factorization'), range: tr(`${fmt(5)} or more interactions`, `${fmt(5)} interaksi atau lebih`) },
  ];
  let body = text(X0, 24, tr('The hybrid picks its model from the number of interactions a user has', 'Hybrid memilih model dari jumlah interaksi yang dimiliki pengguna'), { size: 13, anchor: 'start', ...INK });
  bands.forEach((b, n) => {
    const x = X0 + n * (BW + GAP);
    body += `<rect x="${x}" y="44" width="${BW}" height="70" rx="10" fill="${tint(b.i)}" stroke="${k(b.i)}" stroke-width="2.4"/>`;
    body += text(x + BW / 2, 72, b.range, { size: 13 });
    body += text(x + BW / 2, 98, b.name, { size: 14.5, ...INK });
  });
  const mx = X0 + (BW + GAP) + BW / 2;
  body += line(mx, 160, mx, 120, { c: 'var(--muted)', w: 2, arrow: true });
  body += text(mx, 178, tr(`A cold user who kept ${fmt(3)} interactions`, `Pengguna cold yang menyimpan ${fmt(3)} interaksi`), { size: 13 });
  return svg(680, 196, body);
}

// Figure 3: NDCG@10 for warm and for cold users, six recommenders (seed 1, 30% cold, none kept).
const WARM_COLD = [
  ['Popularity', 0.254, 0.243, 0], ['User k-NN', 0.394, 0.071, 1], ['Item k-NN', 0.401, 0.071, 2],
  ['Matrix factorization', 0.417, 0.071, 3], ['Content-based', 0.476, 0.243, 4], ['Hybrid', 0.457, 0.243, 5],
];
function warmVsCold() {
  const X0 = 190, W = 400, MAX = 0.5, rowH = 44, Y0 = 52;
  const X = v => X0 + (v / MAX) * W;
  let body = text(X0, 22, tr('NDCG@10: warm users and cold-start users (no history kept)', 'NDCG@10: pengguna warm dan cold-start (tanpa riwayat tersisa)'), { size: 13, anchor: 'start', ...INK });
  for (const v of [0, 0.1, 0.2, 0.3, 0.4, 0.5]) body += line(X(v), Y0 - 8, X(v), Y0 + 6 * rowH - 4, { c: 'var(--line)', w: 1 }) + text(X(v), Y0 + 6 * rowH + 12, fmt(v, { digits: 1 }), { size: 12 });
  WARM_COLD.forEach(([name, warm, cold, i], r) => {
    const y = Y0 + r * rowH;
    body += text(X0 - 12, y + 18, tr(name, name), { size: 13, anchor: 'end', fill: k(i), weight: 700 });
    body += `<rect x="${X0}" y="${y}" width="${X(warm) - X0}" height="14" fill="${k(i)}"/>${text(X(warm) + 6, y + 12, f2(warm), { size: 12, anchor: 'start', fill: 'var(--ink)' })}`;
    body += `<rect x="${X0 + 0.75}" y="${y + 18.75}" width="${X(cold) - X0 - 1.5}" height="12.5" fill="color-mix(in srgb, ${k(i)} 28%, var(--surface))" stroke="${k(i)}" stroke-width="1.5"/>${text(X(cold) + 6, y + 30, f2(cold), { size: 12, anchor: 'start', fill: 'var(--ink)' })}`;
  });
  const ly = Y0 + 6 * rowH + 38;
  body += `<rect x="${X0}" y="${ly - 11}" width="26" height="12" fill="var(--muted)"/>${text(X0 + 34, ly, tr(`Warm users (${fmt(67)})`, `Pengguna warm (${fmt(67)})`), { size: 12.5, anchor: 'start' })}`
    + `<rect x="${X0 + 200}" y="${ly - 10}" width="26" height="11" fill="color-mix(in srgb, var(--muted) 28%, var(--surface))" stroke="var(--muted)" stroke-width="1.5"/>${text(X0 + 234, ly, tr(`Cold-start users (${fmt(29)})`, `Pengguna cold-start (${fmt(29)})`), { size: 12.5, anchor: 'start' })}`;
  return svg(680, ly + 14, body);
}

// Figure 4: NDCG@10 of the cold-start users against interactions kept (0 to 5), four recommenders.
const LADDER = [
  { key: 'Popularity', i: 0, ys: [0.243, 0.238, 0.252, 0.249, 0.261, 0.243] },
  { key: 'User k-NN', i: 1, ys: [0.071, 0.347, 0.363, 0.421, 0.42, 0.442] },
  { key: 'Matrix factorization', i: 3, ys: [0.071, 0.294, 0.389, 0.364, 0.425, 0.434] },
  { key: 'Hybrid', i: 5, ys: [0.243, 0.388, 0.352, 0.368, 0.412, 0.459] },
];
function keepLadder() {
  const L = 70, T = 44, W = 420, H = 190, MAX = 0.5;
  const X = n => L + (n / 5) * W, Y = v => T + H - (v / MAX) * H;
  let body = text(L, 22, tr('NDCG@10 of the cold-start users', 'NDCG@10 pengguna cold-start'), { size: 13, anchor: 'start', ...INK });
  for (const v of [0, 0.1, 0.2, 0.3, 0.4, 0.5]) body += line(L, Y(v), L + W, Y(v), { c: 'var(--line)', w: 1 }) + text(L - 8, Y(v) + 4, fmt(v, { digits: 1 }), { size: 12, anchor: 'end' });
  for (let n = 0; n <= 5; n++) body += text(X(n), T + H + 18, fmt(n), { size: 12.5 });
  body += text(L + W / 2, T + H + 40, tr('Interactions they keep', 'Interaksi yang mereka simpan'), { size: 13 });
  LADDER.forEach(s => {
    const pts = s.ys.map((v, n) => `${n ? 'L' : 'M'}${X(n)} ${Y(v)}`).join('');
    body += `<path d="${pts}" fill="none" stroke="${k(s.i)}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
    s.ys.forEach((v, n) => { body += dot(X(n), Y(v), k(s.i), 4.2); });
  });
  LADDER.forEach((s, r) => {
    const y = T + 8 + r * 24;
    body += `<path d="M${L + W + 22} ${y}h22" stroke="${k(s.i)}" stroke-width="3" stroke-linecap="round"/>${text(L + W + 50, y + 4, tr(s.key, s.key), { size: 12.5, anchor: 'start', fill: 'var(--ink)' })}`;
  });
  body += text(L + W + 22, T + 8 + 4 * 24 + 22, tr(`${fmt(29)} cold-start users:`, `${fmt(29)} pengguna cold-start:`), { size: 12, anchor: 'start' });
  body += text(L + W + 22, T + 8 + 4 * 24 + 38, tr('lines are bumpy', 'garis tidak mulus'), { size: 12, anchor: 'start' });
  return svg(680, T + H + 54, body);
}

export const figures = {
  'row-states': rowStates,
  'hybrid-routing': hybridRouting,
  'warm-vs-cold': warmVsCold,
  'keep-ladder': keepLadder,
};
