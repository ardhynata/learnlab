// Figures for the lesson "Bagging and random forests": [[figure:bagging-and-random-forests/name|Caption]].
// Every number is real, from the same task as "Depth and leaf size": is this penguin male or female, from bill
// length, bill depth, flipper length and body mass, for the 333 penguins with all four measurements and a
// recorded sex, cut with splitIndices() stratified by sex, seed 4: 200 training and 67 validation penguins.
// Trees come from sims/ml/ensemble.js bagging() with maxDepth 20 (every leaf pure), seed 1, 25 trees; the five
// trees of the vote and of the out-of-bag figure are the first five of those 25. The lesson's root-feature
// counts (353 of 400 bagged, 198 of 400 forest) come from ONE forest of 400 trees with seed 7, maxDepth 20,
// grown on the same 200 training penguins: bagging() with featureFraction 1 gives mass 353, depth 39,
// length 8, flipper 0; featureFraction 0.5 (2 of 4 per split) gives mass 198, depth 96, length 86, flipper 20.
// (400 one-tree runs with seeds 1 to 400 give other counts, 353 and 184: the exact counts depend on the seed.) Figures are drawn
// synchronously and cannot fetch the csv, so the counts are constants here and the percentages are computed.
import { svg, dot, diamond, text, line, box, k, soft, tr, fmt } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const VALID_N = 67;
// Sex colors, as in "Depth and leaf size": female amber, male blue.
const SEX = { f: 3, m: 4 };
const sexName = s => (s === 'f' ? tr('female', 'betina') : tr('male', 'jantan'));

// Figure 1: validation penguins right (of 67) for each of the 25 bootstrap trees, in tree order.
const TREE_SCORES = [61, 55, 57, 55, 56, 58, 58, 56, 54, 56, 55, 53, 59, 57, 60, 59, 54, 58, 59, 55, 52, 58, 53, 57, 56];
const ORIGINAL_TREE = 54; // the full tree grown on the original 200 penguins
const VOTE_OF_25 = 59;

function treeScores() {
  const W = 640, H = 290, left = 36, right = 30, base = 202, lo = 50.5, hi = 62.5;
  const X = v => left + (v - lo) / (hi - lo) * (W - left - right);
  const r = 9, step = 20;
  const counts = new Map();
  for (const v of TREE_SCORES) counts.set(v, (counts.get(v) ?? 0) + 1);
  let dots = '';
  for (const [v, n] of counts) for (let i = 0; i < n; i++) dots += dot(X(v), base - 14 - i * step, k(0), r);
  const ticks = [52, 54, 56, 58, 60, 62].map(v => `${line(X(v), base, X(v), base + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(v), base + 20, fmt(v), { size: 12 })}`).join('');
  const mean = TREE_SCORES.reduce((s, v) => s + v, 0) / TREE_SCORES.length;
  return svg(W, H, `${text(left, 20, tr('One dot per tree: 25 trees, each grown on its own bootstrap sample', 'Satu titik per tree: 25 tree, masing-masing dilatih pada bootstrap sample sendiri'), { anchor: 'start', ...INK, size: 13 })}
${line(X(ORIGINAL_TREE), 58, X(ORIGINAL_TREE), base, { c: 'var(--ink)', w: 1.6, dash: '5 4' })}
${text(X(ORIGINAL_TREE) - 6, 52, tr(`original tree: ${fmt(ORIGINAL_TREE)}`, `tree awal: ${fmt(ORIGINAL_TREE)}`), { anchor: 'end', size: 12, fill: 'var(--ink)' })}
${text(X(mean) + 6, 38, tr(`average tree: ${fmt(mean, { digits: 1 })}`, `rata-rata tree: ${fmt(mean, { digits: 1 })}`), { anchor: 'start', size: 12, fill: 'var(--ink)' })}${line(X(mean), 43, X(mean), base, { c: k(2), w: 1.6, dash: '2 4' })}
${dots}${line(left, base, W - right, base, { c: 'var(--muted)', w: 1.6 })}${ticks}
${text((left + W - right) / 2, base + 40, tr('validation penguins right, out of 67', 'penguin validation yang benar, dari 67'), { size: 12 })}
${diamond(X(VOTE_OF_25), 266, k(1), 10)}${text(X(VOTE_OF_25) + 18, 271, tr(`vote of the 25 trees: ${fmt(VOTE_OF_25)}`, `vote 25 tree: ${fmt(VOTE_OF_25)}`), { anchor: 'start', ...INK, size: 13 })}`);
}

// Figure 2: one validation penguin (male: bill length 50.2 mm, bill depth 18.8 mm, flipper 202 mm, mass 3800 g)
// sent through five trees. Per tree: [first question threshold in g, questions asked, female rows in the leaf,
// male rows in the leaf].
const FIVE = [[3625, 5, 0, 21], [3712.5, 5, 8, 0], [3625, 6, 0, 19], [3712.5, 6, 4, 0], [3675, 6, 0, 9]];

function fiveVotes() {
  const W = 640, colW = 116, gap = 10, x0 = 20;
  const cx = i => x0 + i * (colW + gap) + colW / 2;
  let male = 0;
  const cols = FIVE.map(([thr, asked, f, m], i) => {
    const vote = m > f ? 'm' : 'f';
    if (vote === 'm') male++;
    const x = cx(i);
    return `${text(x, 70, tr(`Tree ${fmt(i + 1)}`, `Tree ${fmt(i + 1)}`), { ...INK, size: 13 })}
${box(x - colW / 2, 80, colW, 50, 'var(--accent-soft)', 'var(--line)')}
${text(x, 99, tr('first question', 'pertanyaan pertama'), { size: 11.5 })}${text(x, 118, tr(`mass ≤ ${thr} g`, `mass ≤ ${String(thr).replace('.', ',')} g`), { size: 12, fill: 'var(--ink)', weight: 700 })}
${line(x, 130, x, 152, { c: 'var(--muted)', w: 1.8, arrow: true })}
${text(x + 8, 146, tr(`${fmt(asked)} questions`, `${fmt(asked)} pertanyaan`), { anchor: 'start', size: 11 })}
${box(x - colW / 2, 156, colW, 62, soft(SEX[vote]), k(SEX[vote]))}
${text(x, 173, tr('leaf reached', 'leaf yang dicapai'), { size: 11.5 })}
${text(x, 192, tr(`${fmt(f)} female`, `${fmt(f)} betina`), { size: 11.5, fill: 'var(--ink)', weight: 700 })}${text(x, 207, tr(`${fmt(m)} male`, `${fmt(m)} jantan`), { size: 11.5, fill: 'var(--ink)', weight: 700 })}
${line(x, 218, x, 232, { c: 'var(--muted)', w: 1.8, arrow: true })}
<rect x="${x - 54}" y="236" width="108" height="28" rx="14" fill="${k(SEX[vote])}"/>${text(x, 255, tr(`votes ${sexName(vote)}`, `memilih ${sexName(vote)}`), { size: 12.5, fill: 'var(--surface)', weight: 700 })}`;
  }).join('');
  const female = FIVE.length - male;
  const head = text(W / 2, 22, tr('Validation penguin: bill length 50.2 mm, bill depth 18.8 mm, flipper 202 mm, mass 3800 g', 'Penguin validation: bill length 50,2 mm, bill depth 18,8 mm, flipper 202 mm, mass 3800 g'), { ...INK, size: 12 })
    + text(W / 2, 42, tr('Actually: male', 'Sebenarnya: jantan'), { size: 12.5, fill: 'var(--ink)' });
  const tally = `${box(60, 280, 520, 40, soft(SEX.m), k(SEX.m))}${text(W / 2, 305, tr(`${fmt(male)} votes male, ${fmt(female)} votes female: the forest says male`, `${fmt(male)} vote jantan, ${fmt(female)} vote betina: forest menjawab jantan`), { ...INK, size: 13.5 })}`;
  return svg(W, 334, `${head}${cols}${tally}`);
}

// Figure 3: six training penguins and the first five trees. IN says which trees' bootstrap sample held the
// penguin (1 = yes). VOTES gives the answer of each tree that did not see it ('f' or 'm'), in tree order.
const OOB = [
  { name: 'A', sex: 'm', inBag: [1, 1, 1, 1, 1], votes: [] },
  { name: 'B', sex: 'm', inBag: [1, 0, 1, 1, 0], votes: ['', 'm', '', '', 'm'] },
  { name: 'C', sex: 'f', inBag: [0, 0, 0, 0, 1], votes: ['f', 'f', 'f', 'f', ''] },
  { name: 'D', sex: 'f', inBag: [0, 0, 0, 0, 1], votes: ['f', 'm', 'f', 'f', ''] },
  { name: 'E', sex: 'f', inBag: [1, 1, 0, 1, 1], votes: ['', '', 'f', '', ''] },
  { name: 'F', sex: 'f', inBag: [0, 1, 0, 1, 0], votes: ['m', '', 'm', '', 'm'] },
];

function outOfBag() {
  const W = 640, rowH = 40, top = 62, tx = 176, tstep = 50, sq = 26;
  const letter = s => (s === 'f' ? tr('F', 'B') : tr('M', 'J'));
  const heads = [0, 1, 2, 3, 4].map(i => text(tx + i * tstep, top - 14, tr(`Tree ${fmt(i + 1)}`, `Tree ${fmt(i + 1)}`), { size: 11.5 })).join('');
  const rows = OOB.map((p, r) => {
    const y = top + r * rowH, cy = y + rowH / 2;
    const cells = p.inBag.map((inb, i) => {
      const x = tx + i * tstep;
      if (inb) return `<rect x="${x - sq / 2}" y="${cy - sq / 2}" width="${sq}" height="${sq}" rx="4" fill="var(--muted)" opacity="0.55"/>`;
      const v = p.votes[i];
      return `<rect x="${x - sq / 2}" y="${cy - sq / 2}" width="${sq}" height="${sq}" rx="4" fill="${soft(SEX[v])}" stroke="${k(SEX[v])}" stroke-width="2.2"/>${text(x, cy + 5, letter(v), { size: 13, fill: 'var(--ink)', weight: 700 })}`;
    }).join('');
    const out = p.votes.filter(Boolean), male = out.filter(v => v === 'm').length, female = out.length - male;
    let result;
    if (!out.length) result = text(tx + 5 * tstep - 8, cy + 5, tr('no OOB vote', 'tanpa vote OOB'), { anchor: 'start', size: 12.5 });
    else {
      const vote = male > female ? 'm' : 'f', ok = vote === p.sex;
      result = `${text(tx + 5 * tstep - 8, cy + 5, tr(`${fmt(Math.max(male, female))} of ${fmt(out.length)} say ${sexName(vote)}`, `${fmt(Math.max(male, female))} dari ${fmt(out.length)} memilih ${sexName(vote)}`), { anchor: 'start', size: 12.5, fill: 'var(--ink)' })}${text(W - 22, cy + 6, ok ? '✓' : '✗', { size: 18, fill: ok ? k(0) : k(1), weight: 700 })}`;
    }
    return `${box(8, y + 3, W - 16, rowH - 6, 'var(--surface)', 'var(--line)')}
${text(24, cy - 3, tr(`Penguin ${p.name}`, `Penguin ${p.name}`), { anchor: 'start', size: 13, ...INK })}${text(24, cy + 13, tr(`actually ${sexName(p.sex)}`, `sebenarnya ${sexName(p.sex)}`), { anchor: 'start', size: 11.5 })}
${cells}${result}`;
  }).join('');
  const hy = top + OOB.length * rowH + 22;
  const legend = `<rect x="24" y="${hy - 12}" width="14" height="14" rx="3" fill="var(--muted)" opacity="0.55"/>${text(44, hy, tr('tree saw the penguin', 'tree melihat penguin ini'), { anchor: 'start', size: 12 })}
<rect x="214" y="${hy - 12}" width="14" height="14" rx="3" fill="var(--surface)" stroke="var(--muted)" stroke-width="2"/>${text(234, hy, tr('out of bag: its answer counts (F female, M male)', 'out of bag: jawabannya dihitung (B betina, J jantan)'), { anchor: 'start', size: 12 })}`;
  return svg(W, hy + 14, `${text(W / 2, 20, tr('Six training penguins picked to show every case', 'Enam penguin training yang dipilih untuk menunjukkan setiap kasus'), { ...INK, size: 13 })}${heads}${rows}${legend}`);
}

// Figure 4: permutation importance for the forest of 100 trees (2 features tried per split), trained on the 200
// training penguins; it got 60 of 67 right on validation. Each feature was shuffled among the validation penguins
// 30 times; the drop is the mean number of penguins no longer right, out of 67.
const IMPORTANCE = [
  { en: 'bill depth', id: 'bill depth', drop: 20.53 },
  { en: 'body mass', id: 'body mass', drop: 12.97 },
  { en: 'bill length', id: 'bill length', drop: 2.8 },
  { en: 'flipper length', id: 'flipper length', drop: 0.27 },
];

function importance() {
  const W = 640, left = 150, right = 70, top = 40, rowH = 48, barH = 26, maxPts = 35;
  const X = v => left + v / maxPts * (W - left - right);
  const base = top + IMPORTANCE.length * rowH;
  const bars = IMPORTANCE.map((f, i) => {
    const pts = f.drop / VALID_N * 100, y = top + i * rowH + (rowH - barH) / 2;
    return `${text(left - 10, y + barH / 2 + 5, tr(f.en, f.id), { anchor: 'end', size: 13, fill: 'var(--ink)', weight: 600 })}
<rect x="${left}" y="${y}" width="${Math.max(2, X(pts) - left).toFixed(1)}" height="${barH}" rx="4" fill="${k(0)}"/>
${text(X(pts) + 8, y + barH / 2 + 5, tr(`${fmt(pts, { digits: 1 })} points`, `${fmt(pts, { digits: 1 })} poin`), { anchor: 'start', size: 12.5, ...INK })}`;
  }).join('');
  const ticks = [0, 10, 20, 30].map(v => `${line(X(v), base, X(v), base + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(v), base + 20, fmt(v), { size: 12 })}`).join('');
  return svg(W, base + 56, `${text(left, 22, tr('Shuffle one feature, score the 67 validation penguins again', 'Acak satu feature, nilai lagi 67 penguin validation'), { anchor: 'start', ...INK, size: 13 })}
${line(left, top, left, base, { c: 'var(--muted)', w: 1.6 })}${line(left, base, W - right + 20, base, { c: 'var(--muted)', w: 1.6 })}${bars}${ticks}
${text((left + W - right) / 2, base + 42, tr('drop in validation accuracy (points)', 'penurunan validation accuracy (poin)'), { size: 12 })}`);
}

export const figures = { 'tree-scores': treeScores, 'five-votes': fiveVotes, 'out-of-bag': outOfBag, 'importance': importance };
