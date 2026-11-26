// Figures for the lesson "Retrieval, ranking and cold start": [[figure:retrieval-ranking-and-cold-start/name|Caption]].
// Running numbers: a made-up catalog of 1,000,000 titles at 1 ms per title; one user with 4 relevant titles and two
// top-5 lists (A: hits at ranks 1, 3, 5; B: hits at ranks 3, 4, 5). Teal = relevant or train, gold = test, purple = leak.
import { svg, dot, ring, text, line, k, soft, tr, fmt } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const tint = i => `color-mix(in srgb, var(--k${i}) 22%, var(--surface))`;
const disc = rank => 1 / Math.log2(rank + 1);

// Figure 1: the two-stage funnel with the cost of each choice.
function pipeline() {
  const bar = (cx, y, w, h, i, label) => `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="${h}" rx="10" fill="${tint(i)}" stroke="${k(i)}" stroke-width="2.4"/>${text(cx, y + h / 2 + 5, label, { size: 15, ...INK })}`;
  const cx = 190;
  const ms = `${fmt(1)} ms`;
  return svg(680, 290, `
${bar(cx, 16, 340, 50, 4, tr(`${fmt(1000000)} titles`, `${fmt(1000000)} judul`))}
${line(cx, 68, cx, 112, { c: 'var(--muted)', arrow: true })}
${text(cx + 16, 86, tr('Retrieval: cheap scores, several sources', 'Retrieval: skor murah, beberapa sumber'), { anchor: 'start', size: 13, ...INK })}
${text(cx + 16, 103, tr('nearest item vectors, similar, popular', 'item vector terdekat, mirip, populer'), { anchor: 'start', size: 12.5 })}
${bar(cx, 116, 170, 50, 2, tr(`${fmt(300)} candidates`, `${fmt(300)} kandidat`))}
${line(cx, 168, cx, 212, { c: 'var(--muted)', arrow: true })}
${text(cx + 16, 186, tr('Ranking: a richer model', 'Ranking: model yang lebih kaya'), { anchor: 'start', size: 13, ...INK })}
${text(cx + 16, 203, tr('history, content, time of day', 'riwayat, konten, waktu'), { anchor: 'start', size: 12.5 })}
${bar(cx, 216, 100, 50, 3, tr(`Top ${fmt(10)}`, `${fmt(10)} teratas`))}
${text(446, 36, tr('Rich model on every title:', 'Model kaya pada setiap judul:'), { anchor: 'start', size: 13 })}
${text(446, 56, `${fmt(1000000)} × ${ms} = ${fmt(1000)} s`, { anchor: 'start', size: 14, ...INK })}
${text(446, 136, tr('Rich model on the candidates:', 'Model kaya pada kandidat:'), { anchor: 'start', size: 13 })}
${text(446, 156, `${fmt(300)} × ${ms} = ${fmt(0.3)} s`, { anchor: 'start', size: 14, ...INK })}
${text(446, 246, tr('What the user sees', 'Yang dilihat pengguna'), { anchor: 'start', size: 13 })}`);
}

// Figure 2: the interaction table with an empty row (new user) and an empty column (new item).
function coldStart() {
  const X0 = 64, Y0 = 62, C = 46;
  const items = ['A', 'B', 'C', 'D', 'E', tr('New', 'Baru')];
  const users = ['U1', 'U2', 'U3', 'U4', 'U5', tr('New', 'Baru')];
  const seen = ['10110', '01101', '11000', '00111', '10011'];
  let cells = '';
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const x = X0 + c * C, y = Y0 + r * C, cold = r === 5 || c === 5;
      cells += `<rect x="${x}" y="${y}" width="${C - 4}" height="${C - 4}" rx="8" fill="${cold ? soft(3) : 'var(--surface)'}" stroke="${cold ? k(3) : 'var(--line)'}" stroke-width="${cold ? 1.8 : 1.4}" ${cold ? 'stroke-dasharray="5 3"' : ''}/>`;
      if (r < 5 && c < 5 && seen[r][c] === '1') cells += dot(x + (C - 4) / 2, y + (C - 4) / 2, k(2), 8);
    }
  }
  const heads = items.map((t, c) => text(X0 + c * C + (C - 4) / 2, Y0 - 10, t, { size: 13, ...INK })).join('')
    + users.map((t, r) => text(X0 - 10, Y0 + r * C + (C - 4) / 2 + 5, t, { size: 13, anchor: 'end', ...INK })).join('');
  const newRowY = Y0 + 5 * C + (C - 4) / 2;
  return svg(680, 368, `
${text(X0 + 3 * C - 2, 22, tr('Items', 'Item'), { size: 14, ...INK })}
${heads}${cells}
${dot(X0 + 4, 350, k(2), 7)}${text(X0 + 18, 355, tr('watched', 'sudah menonton'), { size: 13, anchor: 'start' })}
${text(X0 + 6 * C + 16, Y0 - 10, tr('← New item: an empty column', '← Item baru: kolom kosong'), { size: 13, anchor: 'start', ...INK })}
${text(X0 + 6 * C + 16, Y0 + 8, tr('use content features,', 'pakai fitur konten,'), { size: 13, anchor: 'start' })}
${text(X0 + 6 * C + 16, Y0 + 26, tr('show it to a few users', 'tampilkan ke beberapa pengguna'), { size: 13, anchor: 'start' })}
${text(X0 + 6 * C + 16, newRowY - 14, tr('← New user: an empty row', '← Pengguna baru: baris kosong'), { size: 13, anchor: 'start', ...INK })}
${text(X0 + 6 * C + 16, newRowY + 4, tr('use popularity,', 'pakai popularitas,'), { size: 13, anchor: 'start' })}
${text(X0 + 6 * C + 16, newRowY + 22, tr('ask for preferences', 'tanyakan preferensi'), { size: 13, anchor: 'start' })}`);
}

// Figure 3: lists A and B (same precision and recall) and the ideal list, with each hit's discount.
function rankingMetrics() {
  const X0 = 112, P = 58, S = 50;
  const f = (x, d = 3) => fmt(x, { max: d });
  const stat = (n, hits, rel, ndcg) => [
    `precision@5 = ${f(hits)} / ${f(5)} = ${f(hits / 5)}`,
    `recall@5 = ${f(hits)} / ${f(rel)} = ${f(hits / rel)}`,
    ndcg,
  ];
  const IDCG = [1, 2, 3, 4].reduce((a, r) => a + disc(r), 0);
  const dcgA = disc(1) + disc(3) + disc(5), dcgB = disc(3) + disc(4) + disc(5);
  const rows = [
    { name: tr('List A', 'Daftar A'), hits: [1, 0, 1, 0, 1], y: 54, stats: stat(5, 3, 4, `NDCG@5 = ${f(dcgA)} / ${f(IDCG)} = ${f(dcgA / IDCG)}`) },
    { name: tr('List B', 'Daftar B'), hits: [0, 0, 1, 1, 1], y: 134, stats: stat(5, 3, 4, `NDCG@5 = ${f(dcgB)} / ${f(IDCG)} = ${f(dcgB / IDCG)}`) },
    { name: tr('Ideal', 'Ideal'), hits: [1, 1, 1, 1, 0], y: 214, stats: ['', tr('4 relevant first', '4 relevan di depan'), `IDCG = ${f(IDCG)}`] },
  ];
  const heads = [1, 2, 3, 4, 5].map((r, i) => text(X0 + i * P + S / 2, 40, fmt(r), { size: 14, ...INK })).join('')
    + text(X0 - 12, 40, tr('Rank', 'Rank'), { size: 13, anchor: 'end' });
  const body = rows.map(row => {
    const sq = row.hits.map((h, i) => {
      const x = X0 + i * P;
      if (!h) return `<rect x="${x}" y="${row.y}" width="${S}" height="${S}" rx="9" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="5 3"/>${text(x + S / 2, row.y + S / 2 + 5, '–', { size: 15 })}`;
      return `<rect x="${x}" y="${row.y}" width="${S}" height="${S}" rx="9" fill="${tint(2)}" stroke="${k(2)}" stroke-width="2.4"/>${text(x + S / 2, row.y + S / 2 + 5, fmt(disc(i + 1), { max: 3 }), { size: 13, ...INK })}`;
    }).join('');
    const stats = row.stats.map((s, i) => (s ? text(X0 + 5 * P + 18, row.y + 14 + i * 17, s, { size: 13, anchor: 'start', fill: i === 2 ? 'var(--ink)' : 'var(--muted)', weight: i === 2 ? 700 : 500 }) : '')).join('');
    return `${text(X0 - 12, row.y + S / 2 + 5, row.name, { size: 14, anchor: 'end', ...INK })}${sq}${stats}`;
  }).join('');
  return svg(680, 308, `
${heads}${body}
${text(24, 290, tr('Filled square: a relevant title (hit); the number is its discount 1 / log2(rank + 1).', 'Kotak berisi: judul relevan (hit); angkanya diskon 1 / log2(rank + 1).'), { size: 13, anchor: 'start' })}`);
}

// Figure 4: leave-last-out against a random split, three users on a time axis.
function leaveLastOut() {
  const X = t => 118 + t * 38;
  const users = [
    { name: tr('User 1', 'Pengguna 1'), times: [1, 3, 5, 7], random: 1 },
    { name: tr('User 2', 'Pengguna 2'), times: [2, 4, 6], random: 0 },
    { name: tr('User 3', 'Pengguna 3'), times: [1, 4, 6, 8, 9], random: 2 },
  ];
  const axis = y => `${line(X(0), y, X(10), y, { c: 'var(--muted)', w: 1.6, arrow: true })}${text(X(10) + 10, y + 5, tr('time', 'waktu'), { size: 13, anchor: 'start' })}`;
  const panel = (y0, title, leak) => {
    const rows = users.map((u, r) => {
      const y = y0 + 34 + r * 38, testIdx = leak ? u.random : u.times.length - 1;
      const dots = u.times.map((t, i) => (i === testIdx ? ring(X(t), y, k(3), 8) : dot(X(t), y, k(2), 7))).join('');
      const span = leak ? line(X(u.times[testIdx]), y + 15, X(u.times[u.times.length - 1]), y + 15, { c: k(5), w: 3 })
        + text(X(9) + 28, y + 5, tr('trains on the future', 'belajar dari masa depan'), { size: 13, anchor: 'start', ...INK }) : '';
      return `${text(24, y + 5, u.name, { size: 13, anchor: 'start', ...INK })}${line(X(0), y, X(10), y, { c: 'var(--line)', w: 1.4 })}${dots}${span}`;
    }).join('');
    return `${text(24, y0 + 8, title, { size: 14, anchor: 'start', ...INK })}${rows}`;
  };
  return svg(680, 360, `
${panel(0, tr('Leave-last-out: train on the past, test on the last event', 'Leave-last-out: latih dengan masa lalu, uji pada kejadian terakhir'), false)}
${axis(134)}
${panel(150, tr('Random split: some training events come after the test event', 'Random split: sebagian data latih terjadi setelah data uji'), true)}
${axis(284)}
${dot(30, 336, k(2), 7)}${text(44, 341, tr('train', 'latih'), { size: 13, anchor: 'start' })}
${ring(120, 336, k(3), 8)}${text(136, 341, tr('test', 'uji'), { size: 13, anchor: 'start' })}`);
}

export const figures = {
  'pipeline': pipeline,
  'cold-start': coldStart,
  'ranking-metrics': rankingMetrics,
  'leave-last-out': leaveLastOut,
};
