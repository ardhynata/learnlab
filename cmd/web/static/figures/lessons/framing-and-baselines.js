// Figures for the lesson "Framing and baselines": [[figure:framing-and-baselines/name|Caption]].
// Every number is a real penguin count (data/penguins.csv): 151 Adelie and 68 Chinstrap, 168 males and 165 females.
// The validation scores come from one stratified 60 / 20 / 20 cut with seed 1, made with splitIndices() from
// sims/ml/tabular.js: the majority class and the best one-feature cut found on the training rows.
import { svg, text, line, box, cross, k, soft, tr, fmt } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const BODY = { fill: 'var(--ink)' };

// One framing card: the question, the target, the class bar, and the laziest answer.
function card(x, w, c0, c1, o) {
  const bx = x + 20, bw = w - 40, total = o.n0 + o.n1;
  const w0 = o.n0 / total * bw;
  return `${box(x, 8, w, 304)}
${text(x + w / 2, 36, o.title, { ...INK, size: 14 })}
${text(x + 20, 68, `${tr('predict', 'prediksi')}: ${o.target}`, { anchor: 'start', size: 13, ...BODY })}
${text(x + 20, 90, `${tr('rows', 'baris')}: ${fmt(total)} ${tr('penguins', 'penguin')}`, { anchor: 'start', size: 13, ...BODY })}
<rect x="${bx}" y="112" width="${w0.toFixed(1)}" height="30" fill="${soft(c0)}" stroke="${k(c0)}" stroke-width="2"/>
<rect x="${(bx + w0).toFixed(1)}" y="112" width="${(bw - w0).toFixed(1)}" height="30" fill="${soft(c1)}" stroke="${k(c1)}" stroke-width="2"/>
${text(bx + w0 / 2, 132, `${o.name0} ${fmt(o.n0)}`, { size: 13, ...BODY })}
${text(bx + w0 + (bw - w0) / 2, 132, `${o.name1} ${fmt(o.n1)}`, { size: 13, ...BODY })}
${text(x + 20, 172, tr(`positive class: ${o.pos}`, `kelas positif: ${o.pos}`), { anchor: 'start', size: 12 })}
${line(x + 20, 190, x + w - 20, 190, { w: 1.4 })}
${text(x + w / 2, 216, tr('Laziest answer, on all rows:', 'Jawaban termalas, pada semua baris:'), { size: 12 })}
${text(x + w / 2, 240, tr(`always "${o.name0}"`, `selalu "${o.name0}"`), { ...INK, size: 14 })}
${text(x + w / 2, 276, tr(`${fmt(o.n0)} / ${fmt(total)} = ${fmt(o.n0 / total * 100, { digits: 1 })}% right`, `${fmt(o.n0)} / ${fmt(total)} = ${fmt(o.n0 / total * 100, { digits: 1 })}% benar`), { ...INK, size: 15 })}`;
}

// Figure 1: the same table framed as two different questions.
function twoQuestions() {
  return svg(680, 358, `
${card(8, 326, 0, 1, { title: tr('Question A: Adelie or Chinstrap?', 'Pertanyaan A: Adelie atau Chinstrap?'), target: tr('species', 'spesies'), name0: 'Adelie', name1: 'Chinstrap', pos: 'Chinstrap', n0: 151, n1: 68 })}
${card(346, 326, 3, 4, { title: tr('Question B: male or female?', 'Pertanyaan B: jantan atau betina?'), target: tr('sex', 'jenis kelamin'), name0: tr('male', 'jantan'), name1: tr('female', 'betina'), pos: tr('male', 'jantan'), n0: 168, n1: 165 })}
${text(340, 340, tr('Same features in both: bill length, bill depth, flipper length, body mass.', 'Feature yang sama untuk keduanya: panjang paruh, kedalaman paruh, panjang sirip, massa tubuh.'), { size: 12 })}`);
}

// Figure 2: validation accuracy of the majority class and of the one-feature rule, both questions.
function baselineVsRule() {
  const L = 70, B = 250, H = 190, gw = 270, bw = 84;
  const Y = v => B - v / 100 * H;
  const groups = [
    [tr('A: Adelie or Chinstrap', 'A: Adelie atau Chinstrap'), 30 / 44 * 100, 41 / 44 * 100, tr(`bill length > ${fmt(44.65, { digits: 2 })} mm`, `panjang paruh > ${fmt(44.65, { digits: 2 })} mm`)],
    [tr('B: male or female', 'B: jantan atau betina'), 34 / 67 * 100, 51 / 67 * 100, tr(`body mass > ${fmt(3712.5, { digits: 1 })} g`, `massa tubuh > ${fmt(3712.5, { digits: 1 })} g`)],
  ];
  const grid = [0, 25, 50, 75, 100].map(v => `${line(L, Y(v), L + 2 * gw, Y(v), { w: 1, c: 'var(--line)' })}${text(L - 8, Y(v) + 4, `${fmt(v)}%`, { anchor: 'end', size: 11 })}`).join('');
  const bars = groups.map(([name, base, rule, ruleName], g) => {
    const cx = L + g * gw + gw / 2;
    const xs = [cx - bw - 8, cx + 8];
    const parts = [[xs[0], base, soft(5), k(5)], [xs[1], rule, soft(0), k(0)]];
    return parts.map(([x, v, fill, stroke]) => `<rect x="${x}" y="${Y(v).toFixed(1)}" width="${bw}" height="${(B - Y(v)).toFixed(1)}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
${text(x + bw / 2, Y(v) - 7, `${fmt(v, { digits: 1 })}%`, { ...INK, size: 13 })}`).join('')
      + `${text(cx, B + 22, name, { ...INK, size: 13 })}${text(cx, B + 40, `${tr('rule', 'aturan')}: ${ruleName}`, { size: 11 })}`;
  }).join('');
  const lg = (x, c, label) => `<rect x="${x}" y="14" width="16" height="16" rx="3" fill="${soft(c)}" stroke="${k(c)}" stroke-width="2"/>${text(x + 24, 27, label, { anchor: 'start', size: 12, ...BODY })}`;
  return svg(680, 340, `
${lg(L, 5, tr('Majority class', 'Kelas mayoritas'))}${lg(L + 190, 0, tr('One-feature rule', 'Aturan satu feature'))}
${grid}${line(L, B, L + 2 * gw, B, { c: 'var(--muted)', w: 1.6 })}
${bars}
${text(340, 332, tr('Validation accuracy, one stratified cut (seed 1). The rule was chosen on training rows only.', 'Accuracy validasi, satu pembagian stratified (seed 1). Aturan dipilih dari baris training saja.'), { size: 12 })}`);
}

// Figure 3: what is known when the model has to answer, and the column that leaks.
function knownWhen() {
  const chips = [tr('bill length', 'panjang paruh'), tr('bill depth', 'kedalaman paruh'), tr('flipper length', 'panjang sirip'), tr('body mass', 'massa tubuh')];
  const chipEls = chips.map((c, i) => `${box(30, 52 + i * 34, 150, 28, soft(0), k(0))}${text(105, 71 + i * 34, c, { size: 13, ...BODY })}`).join('');
  return svg(680, 330, `
${text(105, 32, tr('Known when we predict', 'Diketahui saat memprediksi'), { ...INK, size: 14 })}
${chipEls}
${line(188, 120, 262, 120, { c: 'var(--muted)', w: 2.2, arrow: true })}
${box(268, 82, 130, 76, 'var(--surface)', 'var(--ink)')}${text(333, 116, tr('model', 'model'), { ...INK, size: 15 })}${text(333, 138, tr('trained earlier', 'dilatih lebih dulu'), { size: 12 })}
${line(404, 120, 478, 120, { c: 'var(--muted)', w: 2.2, arrow: true })}
${box(484, 82, 170, 76, soft(3), k(3))}${text(569, 114, tr('prediction', 'prediksi'), { ...INK, size: 14 })}${text(569, 136, tr('male or female?', 'jantan atau betina?'), { size: 13, ...BODY })}
${line(24, 214, 656, 214, { w: 1.4, dash: '5 4' })}
${text(105, 242, tr('Known only later', 'Baru diketahui kemudian'), { ...INK, size: 14 })}
${box(30, 256, 150, 30, soft(1), k(1))}${text(105, 276, tr('tag colour', 'warna tag'), { size: 13, ...BODY })}${text(30, 306, tr('added after the sex is known', 'diberi setelah jenis kelamin diketahui'), { anchor: 'start', size: 11 })}
${line(188, 268, 330, 178, { c: k(1), w: 2.2, dash: '6 4' })}
${cross(333, 176, k(1))}
${text(520, 262, tr('This column is the answer in disguise.', 'Kolom ini adalah jawaban yang menyamar.'), { ...INK, size: 13 })}
${text(520, 284, tr('It would not exist for a new penguin.', 'Kolom ini tidak ada untuk penguin baru.'), { size: 12 })}`);
}

export const figures = { 'two-questions': twoQuestions, 'baseline-vs-rule': baselineVsRule, 'known-when': knownWhen };
