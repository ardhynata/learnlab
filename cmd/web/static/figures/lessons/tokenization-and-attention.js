// Figures for the lesson "Tokenization and attention": [[figure:tokenization-and-attention/name|Caption]].
//
// Where the numbers come from. Every figure is drawn synchronously, so the data it needs is written down here and the
// numbers on the screen are computed from it when the figure is drawn (the lesson text quotes the same numbers).
//   - CORPUS and MERGES: the byte-pair example. Four words with counts low 5, lower 2, newer 6, wider 3, and the three
//     merges e+r, w+er, l+o. The merged corpus has 70, 59, 51 and 44 tokens. The merges are the most frequent pair at
//     each step (11, 8 and 7 occurrences); a fourth merge would be a tie, so the example stops.
//   - Position vectors: the sinusoidal form for d = 2, position p -> (sin p, cos p). The word "dog" has the invented
//     embedding (2, 1).
//   - TOKENS, Q, K, V: the invented three-token attention example "the cat sat" with 2-D vectors (d = 2), taken from the
//     lesson. Scores, the division by the square root of 2, softmax and the outputs are computed here.
import { svg, dot, text, line, box, k, soft, tr, fmt } from '../kit.js';

// ---- Figure 1: byte-pair merges on four words. ----
const CORPUS = [['low', 5], ['lower', 2], ['newer', 6], ['wider', 3]];
const MERGES = [['e', 'r'], ['w', 'er'], ['l', 'o']];

function mergeOnce(tokens, a, b) {
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === a && tokens[i + 1] === b) { out.push(a + b); i++; } else out.push(tokens[i]);
  }
  return out;
}

function bpeMerges() {
  const W = 640, H = 332;
  let words = CORPUS.map(([w, c]) => ({ w, c, t: [...w] }));
  const stages = [{ title: tr('Start', 'Awal'), sub: tr('single letters', 'huruf tunggal'), words }];
  for (const [a, b] of MERGES) {
    words = words.map(o => ({ ...o, t: mergeOnce(o.t, a, b) }));
    stages.push({ title: `${tr('Merge', 'Merge')} ${fmt(stages.length)}`, sub: `${a} + ${b}`, words });
  }
  const merged = { er: 1, wer: 2, lo: 3 };
  const x0 = 78, colW = 140, y0 = 74, rowH = 52, chipH = 26;
  let body = '';
  stages.forEach((st, s) => {
    const cx = x0 + s * colW;
    body += `${text(cx + colW / 2 - 4, 26, st.title, { fill: 'var(--ink)', weight: 700, size: 14 })}${text(cx + colW / 2 - 4, 44, st.sub, { size: 12 })}`;
    if (s > 0) body += line(cx - 6, 56, cx - 6, 290, { c: 'var(--line)', w: 1, dash: '3 4' });
    let total = 0;
    st.words.forEach((o, r) => {
      let x = cx;
      const y = y0 + r * rowH;
      for (const tok of o.t) {
        const w = 10 + 9 * tok.length, id = merged[tok];
        const fill = id ? soft(id) : 'var(--surface)', stroke = id ? k(id) : 'var(--line)';
        body += `<rect x="${x}" y="${y}" width="${w}" height="${chipH}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="${id ? 2 : 1.4}"/>${text(x + w / 2, y + 18, tok, { fill: 'var(--ink)', weight: 600, size: 14 })}`;
        x += w + 3;
      }
      total += o.t.length * o.c;
    });
    body += text(cx + colW / 2 - 4, 312, `${fmt(total)} ${tr('tokens', 'token')}`, { fill: s === 0 ? 'var(--ink)' : k(merged[MERGES[s - 1].join('')] ?? 1), weight: 700, size: 14 });
  });
  CORPUS.forEach(([w, c], r) => {
    body += text(x0 - 12, y0 + r * rowH + 18, `${w} × ${fmt(c)}`, { anchor: 'end', fill: 'var(--ink)', weight: 600, size: 14 });
  });
  return svg(W, H, body);
}

// ---- Figure 2: sinusoidal position vectors, and the same word at two positions. ----
function positionVectors() {
  const W = 640, H = 306;
  const left = () => {
    const ox = 10, w = 300, top = 38, h = 238;
    const X = p => ox + 26 + p * ((w - 52) / 7), zero = top + h / 2 - 8, Y = v => zero - v * 78;
    const path = fn => Array.from({ length: 71 }, (_, i) => { const p = i / 10; return `${i ? 'L' : 'M'}${X(p).toFixed(1)} ${Y(fn(p)).toFixed(1)}`; }).join('');
    const P = Array.from({ length: 8 }, (_, p) => p);
    return `${text(ox + w / 2, 22, tr('Position vector (sin p, cos p)', 'Vektor posisi (sin p, cos p)'), { fill: 'var(--ink)', weight: 700, size: 14 })}
${box(ox, top, w, h)}
${line(X(0), zero, X(7), zero, { c: 'var(--line)', w: 1.2 })}
<path d="${path(Math.sin)}" fill="none" stroke="${k(1)}" stroke-width="2.4"/><path d="${path(Math.cos)}" fill="none" stroke="${k(2)}" stroke-width="2.4"/>
${P.map(p => dot(X(p), Y(Math.sin(p)), k(1), 4.2) + dot(X(p), Y(Math.cos(p)), k(2), 4.2)).join('')}
${P.map(p => text(X(p), top + h - 24, fmt(p), { fill: 'var(--ink)', weight: 600, size: 13 })).join('')}
${text(ox + w / 2, top + h - 6, tr('Position p', 'Posisi p'), { size: 12 })}
${line(ox + 16, top + 16, ox + 40, top + 16, { c: k(1), w: 2.6 })}${text(ox + 46, top + 20, 'sin p', { anchor: 'start', fill: 'var(--ink)', weight: 600, size: 12 })}
${line(ox + 100, top + 16, ox + 124, top + 16, { c: k(2), w: 2.6 })}${text(ox + 130, top + 20, 'cos p', { anchor: 'start', fill: 'var(--ink)', weight: 600, size: 12 })}`;
  };
  const right = () => {
    const ox = 330, w = 300, top = 38, h = 238;
    const X = v => ox + 28 + v * 68, Y = v => top + h - 34 - v * 64;
    const dog = [2, 1];
    const at = p => [dog[0] + Math.sin(p), dog[1] + Math.cos(p)];
    const p0 = at(0), p2 = at(2);
    const coords = v => `(${fmt(v[0], { max: 2 })}, ${fmt(v[1], { max: 2 })})`;
    const arrow = (a, b, c) => line(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), { c, w: 2.4, arrow: true });
    return `${text(ox + w / 2, 22, tr('The same word at two positions', 'Kata yang sama di dua posisi'), { fill: 'var(--ink)', weight: 700, size: 14 })}
${box(ox, top, w, h)}
${line(X(0), Y(0), X(4), Y(0), { c: 'var(--line)', w: 1.2 })}${line(X(0), Y(0), X(0), Y(3.1), { c: 'var(--line)', w: 1.2 })}
${text(X(4) - 4, Y(0) + 16, tr('dim 1', 'dim 1'), { anchor: 'end', size: 12 })}${text(X(0) + 6, Y(3.1) + 4, tr('dim 2', 'dim 2'), { anchor: 'start', size: 12 })}
${line(X(0), Y(0), X(dog[0]), Y(dog[1]), { c: 'var(--muted)', w: 1.4, dash: '4 4' })}
${arrow(dog, p0, k(1))}${arrow(dog, p2, k(2))}
${dot(X(dog[0]), Y(dog[1]), 'var(--ink)', 6)}${dot(X(p0[0]), Y(p0[1]), k(1), 6)}${dot(X(p2[0]), Y(p2[1]), k(2), 6)}
${text(X(dog[0]) - 12, Y(dog[1]) + 5, `dog ${coords(dog)}`, { anchor: 'end', fill: 'var(--ink)', weight: 700, size: 13 })}
${text(X(p0[0]), Y(p0[1]) - 14, `${tr('position', 'posisi')} ${fmt(0)} ${coords(p0)}`, { fill: k(1), weight: 700, size: 13 })}
${text(X(p2[0]) - 10, Y(p2[1]) + 28, `${tr('position', 'posisi')} ${fmt(2)} ${coords(p2)}`, { fill: k(2), weight: 700, size: 13 })}`;
  };
  return svg(W, H, `${left()}${right()}`);
}

// ---- Figure 3: attention for three tokens. ----
const TOKENS = ['the', 'cat', 'sat'];
const Q = [[0, 1], [1, 1], [1, 2]];
const K = [[1, 0], [0, 2], [1, 1]];
const V = [[1, 0], [0, 2], [2, 1]];

function attentionRows() {
  const scale = Math.sqrt(2);
  return Q.map(q => {
    const scores = K.map(kk => q[0] * kk[0] + q[1] * kk[1]);
    const scaled = scores.map(s => s / scale);
    const e = scaled.map(Math.exp), sum = e.reduce((a, b) => a + b, 0);
    const w = e.map(x => x / sum);
    const out = [0, 1].map(j => w.reduce((a, wi, t) => a + wi * V[t][j], 0));
    return { scores, scaled, w, out };
  });
}

function attentionWeights() {
  const W = 640, H = 306;
  const rows = attentionRows();
  const two = v => fmt(v, { digits: 2 });
  const sat = rows[2];
  const left = () => {
    const ox = 10, w = 300, top = 38, h = 252;
    const cols = { label: ox + 18, score: ox + 92, scaled: ox + 158, bar: ox + 196 };
    const rowY = i => top + 74 + i * 40;
    const bars = TOKENS.map((t, i) => `${text(cols.label, rowY(i) + 5, t, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 14 })}
${text(cols.score, rowY(i) + 5, fmt(sat.scores[i]), { fill: 'var(--ink)', weight: 600, size: 14 })}
${text(cols.scaled, rowY(i) + 5, two(sat.scaled[i]), { fill: 'var(--ink)', weight: 600, size: 14 })}
<rect x="${cols.bar}" y="${rowY(i) - 10}" width="${Math.max(sat.w[i] * 80, 1)}" height="20" rx="4" fill="${k(1)}"/>
${text(cols.bar + sat.w[i] * 80 + 6, rowY(i) + 5, two(sat.w[i]), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 14 })}`).join('');
    return `${text(ox + w / 2, 22, tr('Token "sat": scores to weights', 'Token "sat": dari skor ke weight'), { fill: 'var(--ink)', weight: 700, size: 14 })}
${box(ox, top, w, h)}
${text(cols.score, top + 30, tr('Score', 'Skor'), { fill: 'var(--ink)', weight: 700, size: 13 })}${text(cols.score, top + 46, 'q · k', { size: 12 })}
${text(cols.scaled, top + 30, tr('Scaled', 'Skala'), { fill: 'var(--ink)', weight: 700, size: 13 })}${text(cols.scaled, top + 46, `÷ ${fmt(Math.SQRT2, { digits: 2 })}`, { size: 12 })}
${text(cols.bar, top + 30, tr('Weight', 'Weight'), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 })}${text(cols.bar, top + 46, 'softmax', { anchor: 'start', size: 12 })}
${line(ox + 12, top + 56, ox + w - 12, top + 56, { c: 'var(--line)', w: 1.2 })}
${bars}
${text(ox + w / 2, top + 192, `${tr('Weights add up to', 'Weight berjumlah')} ${fmt(sat.w.reduce((a, b) => a + b, 0), { digits: 2 })}`, { fill: 'var(--muted)', weight: 600, size: 13 })}
${text(ox + w / 2, top + 218, `${tr('Output', 'Output')} (${two(sat.out[0])}, ${two(sat.out[1])})`, { fill: k(3), weight: 700, size: 14 })}`;
  };
  const right = () => {
    const ox = 330, w = 300, top = 38, h = 252;
    const gx = 388, gy = 96, cw = 52, ch = 50;
    const cells = rows.map((r, i) => r.w.map((wt, j) => `<rect x="${gx + j * cw}" y="${gy + i * ch}" width="${cw - 3}" height="${ch - 3}" rx="6" fill="color-mix(in srgb, var(--k1) ${Math.round(wt * 70)}%, var(--surface))" stroke="var(--line)" stroke-width="1"/>${text(gx + j * cw + (cw - 3) / 2, gy + i * ch + 28, two(wt), { fill: 'var(--ink)', weight: 700, size: 14 })}`).join('')).join('');
    const rowLabels = TOKENS.map((t, i) => text(gx - 8, gy + i * ch + 28, t, { anchor: 'end', fill: 'var(--ink)', weight: 700, size: 14 })).join('');
    const colLabels = TOKENS.map((t, j) => text(gx + j * cw + (cw - 3) / 2, gy - 8, t, { fill: 'var(--ink)', weight: 700, size: 14 })).join('');
    const outs = rows.map((r, i) => text(gx + 3 * cw + 6, gy + i * ch + 28, `(${two(r.out[0])}, ${two(r.out[1])})`, { anchor: 'start', fill: 'var(--ink)', weight: 600, size: 12 })).join('');
    return `${text(ox + w / 2, 22, tr('All three tokens', 'Ketiga token'), { fill: 'var(--ink)', weight: 700, size: 14 })}
${box(ox, top, w, h)}
${text(gx + 1.5 * cw, top + 24, tr('looks at (key)', 'melihat (key)'), { size: 12 })}
${text(gx - 8, gy - 8, tr('query', 'query'), { anchor: 'end', size: 12 })}
${text(gx + 3 * cw + 6, gy - 8, tr('Output', 'Output'), { anchor: 'start', size: 12 })}
${colLabels}${rowLabels}${cells}${outs}
<rect x="${gx - 3}" y="${gy + 2 * ch - 3}" width="${3 * cw + 3}" height="${ch + 3}" rx="8" fill="none" stroke="${k(3)}" stroke-width="2.4"/>
${text(ox + w / 2, top + 218, tr('Darker cell: more weight', 'Sel lebih gelap: weight lebih besar'), { fill: 'var(--muted)', weight: 600, size: 12 })}
${text(ox + w / 2, top + 236, tr('Each row adds up to 1', 'Setiap baris berjumlah 1'), { fill: 'var(--muted)', weight: 600, size: 12 })}`;
  };
  return svg(W, H, `${left()}${right()}`);
}

// ---- Figure 4: one transformer block. ----
function transformerBlock() {
  const W = 640, H = 372;
  const bx = 76, bw = 236, bh = 38, gap = 24;
  const y = i => 10 + i * (bh + gap);
  const mid = i => y(i) + bh / 2;
  const items = [
    { t: tr('Token + position vectors', 'Vektor token + posisi'), fill: 'var(--surface)', cap: [] },
    { t: tr('Multi-head self-attention', 'Multi-head self-attention'), fill: soft(0), cap: [tr('Tokens exchange information', 'Token saling bertukar informasi')] },
    { t: tr('Add + normalize', 'Tambah + normalisasi'), fill: soft(2), cap: [tr('Input added back (residual),', 'Input ditambahkan kembali (residual),'), tr('then each vector is rescaled', 'lalu tiap vektor diskalakan ulang')] },
    { t: tr('Feed-forward network', 'Feed-forward network'), fill: soft(1), cap: [tr("Each token's vector on its own,", 'Vektor tiap token sendiri-sendiri,'), tr('same weights for every token', 'weight sama untuk setiap token')] },
    { t: tr('Add + normalize', 'Tambah + normalisasi'), fill: soft(2), cap: [tr('Input added back (residual),', 'Input ditambahkan kembali (residual),'), tr('then each vector is rescaled', 'lalu tiap vektor diskalakan ulang')] },
    { t: tr('Output vectors', 'Vektor output'), fill: 'var(--surface)', cap: [tr('One vector per token, with context.', 'Satu vektor per token, dengan konteks.'), tr('Many blocks are stacked.', 'Banyak block ditumpuk.')] },
  ];
  const cx = bx + bw / 2;
  let body = '';
  items.forEach((it, i) => {
    body += `${box(bx, y(i), bw, bh, it.fill, 'var(--line)')}${text(cx, mid(i) + 5, it.t, { fill: 'var(--ink)', weight: 700, size: 14 })}`;
    it.cap.forEach((c, n) => { body += text(bx + bw + 24, mid(i) + (it.cap.length === 1 ? 5 : n * 16 - 3), c, { anchor: 'start', size: 12 }); });
    if (i < items.length - 1) body += line(cx, y(i) + bh, cx, y(i + 1), { c: 'var(--muted)', w: 2, arrow: true });
  });
  // Residual arcs: from the gap above a part, around it, into the Add + normalize box under it.
  const resid = (fromGap, toBox) => {
    const gy = y(fromGap) + bh + gap / 2, ty = mid(toBox), lx = bx - 32;
    return `<path d="M${cx} ${gy}L${lx} ${gy}L${lx} ${ty}L${bx} ${ty}" fill="none" stroke="${k(3)}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arr)"/>
${text(lx - 8, (gy + ty) / 2, tr('residual', 'residual'), { fill: k(3), weight: 700, size: 12 }).replace('<text ', `<text transform="rotate(-90 ${lx - 8} ${(gy + ty) / 2})" `)}`;
  };
  body += resid(0, 2) + resid(2, 4);
  return svg(W, H, body);
}

export const figures = {
  'bpe-merges': bpeMerges,
  'position-vectors': positionVectors,
  'attention-weights': attentionWeights,
  'transformer-block': transformerBlock,
};
