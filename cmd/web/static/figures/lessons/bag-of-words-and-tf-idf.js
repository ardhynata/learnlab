// Figures for "Bag of words and TF-IDF". Every number is computed here from the three documents of
// the lesson, so the pictures agree with the tables in the text. The documents are example data and
// stay in English in both languages; only the labels around them go through tr() and fmt().
import { svg, text, line, box, k, soft, tr, fmt } from '../kit.js';

const DOCS = ['the cat sat on the mat', 'the dog sat on the log', 'the cat chased the dog'];
const tokens = d => d.split(' ');
const VOCAB = [...new Set(DOCS.flatMap(tokens))];           // order of first appearance
const COUNTS = DOCS.map(d => VOCAB.map(w => tokens(d).filter(t => t === w).length));
const N = DOCS.length;
const DF = VOCAB.map((w, j) => COUNTS.filter(row => row[j] > 0).length);
const IDF = DF.map(df => Math.log(N / df));
const TFIDF = COUNTS.map(row => row.map((c, j) => c * IDF[j]));
const ink = { fill: 'var(--ink)' };
const num = v => fmt(v, { digits: 2 });

// A cell tinted by value / max (0 stays plain so the zeros look empty).
const tint = (v, max) => (v === 0 ? 'var(--surface)' : `color-mix(in srgb, var(--k0) ${Math.round(18 + 62 * v / max)}%, var(--surface))`);
const cell = (x, y, w, h, v, max, label, strong = false) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${tint(v, max)}" stroke="${strong ? 'var(--ink)' : 'var(--line)'}" stroke-width="${strong ? 2.4 : 1.2}"/>${text(x + w / 2, y + h / 2 + 5, label, { size: 14, weight: v === 0 ? 500 : 700, fill: v === 0 ? 'var(--muted)' : 'var(--ink)' })}`;

// 1. From a sentence to a count vector: text, tokens, counts.
function pipeline() {
  const W = 680, left = 24, cw = 78, ch = 38;
  const toks = tokens(DOCS[0]);
  const chipW = 74, chipX = i => left + 6 + i * (chipW + 8);
  const y1 = 30, y2 = 128, y3 = 232;
  const head = (y, t) => text(left, y - 12, t, { anchor: 'start', size: 13, weight: 700, ...ink });
  const chips = toks.map((t, i) => `<rect x="${chipX(i)}" y="${y2}" width="${chipW}" height="${ch}" rx="19" fill="${soft(0)}" stroke="${k(0)}" stroke-width="1.6"/>${text(chipX(i) + chipW / 2, y2 + 24, t, { size: 14, ...ink })}`).join('');
  const row = VOCAB.map((w, j) => {
    const x = left + j * cw;
    return `${text(x + (cw - 6) / 2, y3 + 14, w, { size: 13, ...ink })}${cell(x, y3 + 24, cw - 6, ch, COUNTS[0][j], 2, fmt(COUNTS[0][j]))}`;
  }).join('');
  return svg(W, 322, `
${head(y1, tr('1. One document', '1. Satu dokumen'))}${box(left, y1, 330, 42)}${text(left + 165, y1 + 27, `"${DOCS[0]}"`, { size: 16, ...ink })}
${line(left + 165, y1 + 44, left + 165, y2 - 22, { w: 2, c: 'var(--muted)', arrow: true })}${text(left + 180, y1 + 70, tr('lowercase, split on spaces', 'huruf kecil, pisah per spasi'), { anchor: 'start', size: 12 })}
${head(y2, tr('2. Tokens', '2. Token'))}${chips}
${line(left + 165, y2 + ch + 4, left + 165, y3 - 20, { w: 2, c: 'var(--muted)', arrow: true })}${text(left + 180, y2 + ch + 24, tr('count each vocabulary word', 'hitung tiap kata dalam vocabulary'), { anchor: 'start', size: 12 })}
${head(y3 + 6, tr('3. Count vector (8 vocabulary words)', '3. Vektor hitungan (8 kata dalam vocabulary)'))}${row}`);
}

// 2. The three documents as a count table.
function countMatrix() {
  const W = 680, left = 150, cw = 64, rh = 44, top = 62;
  const heads = VOCAB.map((w, j) => text(left + j * cw + (cw - 6) / 2, top - 12, w, { size: 13, ...ink })).join('');
  const rows = COUNTS.map((row, i) => {
    const y = top + i * (rh + 6);
    return `${text(left - 14, y + rh / 2 - 2, `D${fmt(i + 1)}`, { anchor: 'end', size: 15, weight: 700, ...ink })}${text(left - 14, y + rh / 2 + 15, '', { anchor: 'end', size: 11 })}${row.map((c, j) => cell(left + j * cw, y, cw - 6, rh, c, 2, fmt(c))).join('')}`;
  }).join('');
  const zeros = COUNTS.flat().filter(c => c === 0).length;
  return svg(W, 266, `${text(left, 20, tr('Word counts: one row per document, one column per vocabulary word', 'Hitungan kata: satu baris per dokumen, satu kolom per kata dalam vocabulary'), { anchor: 'start', size: 14, ...ink })}
${heads}${rows}
${text(left, 234, tr(`${fmt(zeros)} of ${fmt(COUNTS.flat().length)} cells are zero`, `${fmt(zeros)} dari ${fmt(COUNTS.flat().length)} sel bernilai nol`), { anchor: 'start', size: 13, ...ink })}
${text(left, 254, tr('darker = larger count', 'lebih gelap = hitungan lebih besar'), { anchor: 'start', size: 12 })}`);
}

// 3. df, idf bars and the TF-IDF table.
function tfidfMatrix() {
  const W = 680, left = 120, cw = 64, bw = 34, barBase = 176, barMax = 64, maxIdf = Math.log(N);
  const colX = j => left + j * cw;
  const heads = VOCAB.map((w, j) => text(colX(j) + (cw - 6) / 2, 44, w, { size: 13, ...ink })).join('');
  const dfRow = DF.map((d, j) => text(colX(j) + (cw - 6) / 2, 66, fmt(d), { size: 14, weight: 700, ...ink })).join('');
  const bars = IDF.map((v, j) => {
    const h = barMax * v / maxIdf, x = colX(j) + (cw - 6 - bw) / 2;
    return `${h > 0 ? `<rect x="${x}" y="${barBase - h}" width="${bw}" height="${h}" rx="4" fill="${k(1)}"/>` : ''}${text(colX(j) + (cw - 6) / 2, barBase - h - 6, num(v), { size: 13, weight: 700, ...ink })}`;
  }).join('');
  const gridTop = 204, rh = 40;
  const rows = TFIDF.map((row, i) => {
    const y = gridTop + i * (rh + 6), top = Math.max(...row);
    return `${text(left - 14, y + rh / 2 + 5, `D${fmt(i + 1)}`, { anchor: 'end', size: 15, weight: 700, ...ink })}${row.map((v, j) => cell(colX(j), y, cw - 6, rh, v, maxIdf * 1, v === 0 ? fmt(0) : num(v), v === top)).join('')}`;
  }).join('');
  return svg(W, 370, `${heads}
${text(left - 14, 70, 'df', { anchor: 'end', size: 14, weight: 700, ...ink })}${dfRow}
${text(left - 14, barBase - 24, 'idf', { anchor: 'end', size: 14, weight: 700, ...ink })}${line(left, barBase, colX(VOCAB.length - 1) + cw - 6, barBase, { c: 'var(--muted)', w: 1.6 })}${bars}
${text(left, 174, '', {})}${rows}
${text(left, 356, tr('TF-IDF = count x idf, where idf = ln(3 / df). Outlined cell: the highest score in the row.', 'TF-IDF = hitungan x idf, dengan idf = ln(3 / df). Sel berbingkai tebal: skor tertinggi di baris itu.'), { anchor: 'start', size: 12 })}`);
}

// 4. Two sentences, one bag.
function wordOrder() {
  const W = 680, bw = 270, y0 = 20;
  const a = 'the cat chased the dog', b = 'the dog chased the cat';
  const same = tokens(a).sort().join() === tokens(b).sort().join();
  const side = (x, sentence, from, to) => {
    const cx = x + bw / 2;
    return `${box(x, y0, bw, 44)}${text(cx, y0 + 28, `"${sentence}"`, { size: 16, ...ink })}
<rect x="${cx - 92}" y="${y0 + 82}" width="64" height="32" rx="16" fill="${soft(from)}" stroke="${k(from)}" stroke-width="1.6"/>${text(cx - 60, y0 + 103, from === 0 ? 'cat' : 'dog', { size: 14, ...ink })}
${line(cx - 24, y0 + 98, cx + 24, y0 + 98, { w: 2.4, c: 'var(--ink)', arrow: true })}${text(cx, y0 + 128, tr('chases', 'mengejar'), { size: 12 })}
<rect x="${cx + 28}" y="${y0 + 82}" width="64" height="32" rx="16" fill="${soft(to)}" stroke="${k(to)}" stroke-width="1.6"/>${text(cx + 60, y0 + 103, to === 0 ? 'cat' : 'dog', { size: 14, ...ink })}
${line(cx, y0 + 46, cx, y0 + 76, { w: 1.6, c: 'var(--muted)', arrow: true })}`;
  };
  const cw = 66, vx = (W - VOCAB.length * cw) / 2, vy = 238;
  const vec = VOCAB.map((w, j) => `${text(vx + j * cw + (cw - 6) / 2, vy - 8, w, { size: 13, ...ink })}${cell(vx + j * cw, vy, cw - 6, 36, COUNTS[2][j], 2, fmt(COUNTS[2][j]))}`).join('');
  return svg(W, 340, `${side(30, a, 0, 1)}${side(380, b, 1, 0)}
${line(165, y0 + 130, 300, vy - 34, { w: 1.6, c: 'var(--muted)', arrow: true })}${line(515, y0 + 130, 380, vy - 34, { w: 1.6, c: 'var(--muted)', arrow: true })}
${vec}
${text(340, vy + 62, tr('one count vector for both sentences', 'satu vektor hitungan untuk kedua kalimat'), { size: 13, ...ink })}
${text(340, vy + 82, same ? tr('opposite meanings, same words, same counts', 'arti berlawanan, kata sama, hitungan sama') : '', { size: 14, weight: 700, ...ink })}`);
}

export const figures = { 'pipeline': pipeline, 'count-matrix': countMatrix, 'tfidf-matrix': tfidfMatrix, 'word-order': wordOrder };
