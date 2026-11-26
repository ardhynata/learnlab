// Figures for the lesson "Baselines and splits": [[figure:baselines-and-splits/name|Caption]].
// The numbers are real penguins (data/penguins.csv, the 342 rows with measurements): the species
// counts, the six-penguin table of an earlier lesson, and a seed-4 cut made with the same
// splitIndices() the labs use.
import { svg, dot, text, line, box, k, soft, tr, fmt } from '../kit.js';
import { splitIndices } from '../../sims/ml/tabular.js';

const INK = { weight: 700, fill: 'var(--ink)' };
// Species colors match the other penguin figures: Adelie 0, Chinstrap 1, Gentoo 2.
const SPECIES = [['Adelie', 0, 151], ['Gentoo', 2, 123], ['Chinstrap', 1, 68]];
// The 342 measured penguins appear in this order in the csv: 151 Adelie, then 123 Gentoo, then 68 Chinstrap.
const LABELS = SPECIES.flatMap(([name, , n]) => Array(n).fill(name));
const TOTAL = LABELS.length;
const SIX = [[3750, 0], [3250, 0], [3500, 1], [3900, 1], [4500, 2], [5700, 2]];

// Figure 1: the two baselines side by side.
function baselines() {
  const left = [['Adelie', 0, 151], ['Gentoo', 2, 123], ['Chinstrap', 1, 68]];
  const bars = left.map(([name, c, n], i) => {
    const y = 96 + i * 38, w = n * 0.9;
    return `${text(24, y + 15, name, { anchor: 'start', size: 13, weight: i === 0 ? 700 : 500, fill: 'var(--ink)' })}
<rect x="104" y="${y}" width="${w}" height="22" rx="4" fill="${i === 0 ? k(c) : soft(c)}" stroke="${k(c)}" stroke-width="1.6"/>
${text(104 + w + 8, y + 16, fmt(n), { anchor: 'start', size: 13, fill: 'var(--ink)' })}`;
  }).join('');
  const X = v => 372 + (v - 3000) * 0.075;
  const mean = 4100;
  const rows = SIX.map(([m, c], i) => {
    const y = 96 + i * 26;
    return `${line(X(m), y, X(mean), y, { c: 'var(--muted)', w: 1.6, dash: '4 3' })}${dot(X(m), y, k(c), 6)}
${text(652, y + 4, `${fmt(Math.abs(m - mean))} g`, { anchor: 'end', size: 12, fill: 'var(--ink)' })}`;
  }).join('');
  const ticks = [3000, 4000, 5000, 6000].map(t => `${line(X(t), 250, X(t), 255, { c: 'var(--muted)', w: 1.4 })}${text(X(t), 270, fmt(t), { size: 11 })}`).join('');
  const mae = SIX.reduce((s, [m]) => s + Math.abs(m - mean), 0) / SIX.length;
  return svg(680, 332, `
${box(8, 8, 326, 316)}${box(346, 8, 326, 316)}
${text(171, 34, tr('Classification', 'Classification'), { ...INK, size: 15 })}
${text(171, 54, tr('always the most common class', 'selalu kelas yang paling umum'), { size: 12 })}
${text(171, 82, tr('penguins in each species', 'jumlah penguin per spesies'), { size: 12 })}
${bars}
${text(171, 232, tr(`Always "Adelie": ${fmt(151)} of ${fmt(TOTAL)}`, `Selalu "Adelie": ${fmt(151)} dari ${fmt(TOTAL)}`), { ...INK, size: 13 })}
${text(171, 254, tr(`= ${fmt(44.2, { digits: 1 })}% right`, `= ${fmt(44.2, { digits: 1 })}% benar`), { ...INK, size: 15 })}
${text(171, 290, tr('The score to beat for three species.', 'Skor yang harus dilampaui untuk tiga spesies.'), { size: 12 })}
${text(509, 34, tr('Regression', 'Regression'), { ...INK, size: 15 })}
${text(509, 54, tr('always the same number: the mean', 'selalu angka yang sama: rata-rata'), { size: 12 })}
${line(X(mean), 76, X(mean), 244, { c: 'var(--ink)', w: 2.4 })}${text(X(mean), 72, `${tr('mean', 'rata-rata')} ${fmt(mean)} g`, { ...INK, size: 12 })}
${text(652, 72, tr('miss', 'selisih'), { anchor: 'end', size: 12, weight: 700, fill: 'var(--ink)' })}
${rows}
${line(X(3000), 248, X(6000), 248, { c: 'var(--muted)', w: 1.6 })}${ticks}
${text(509, 288, tr(`body mass (g) of the six penguins from the earlier lesson`, `massa tubuh (g) enam penguin tadi`), { size: 11 })}
${text(509, 308, tr(`typical miss (MAE) = ${fmt(4000)} / 6 = ${fmt(mae, { digits: 1 })} g`, `selisih rata-rata (MAE) = ${fmt(4000)} / 6 = ${fmt(mae, { digits: 1 })} g`), { ...INK, size: 12 })}`);
}

// Figure 2: one dataset cut into three sets with their jobs. Sizes come from the stratified seed-4 cut.
function threeSets() {
  const parts = splitIndices(TOTAL, { train: 0.6, validation: 0.2 }, 4, LABELS);
  const sizes = [parts.train.length, parts.validation.length, parts.test.length];
  const gap = 4, x0 = 24, avail = 632 - 2 * gap;
  const w = sizes.map(s => s / TOTAL * avail);
  const xs = [x0, x0 + w[0] + gap, x0 + w[0] + w[1] + 2 * gap];
  const defs = [
    [0, tr('Training', 'Training'), tr('Fits the parameters', 'Fit parameter'), tr('slope, intercept', 'kemiringan, intersep')],
    [1, tr('Validation', 'Validation'), tr('Compare, choose', 'Pilih model'), tr('models and settings', 'dan setelan')],
    [2, tr('Test', 'Test'), tr('Final report', 'Laporan akhir'), tr('touched once', 'dipakai sekali')],
  ];
  const parts3 = defs.map(([i, name, job, sub]) => `<rect x="${xs[i]}" y="52" width="${w[i]}" height="58" rx="8" fill="${soft(i)}" stroke="${k(i)}" stroke-width="2"/>
${text(xs[i] + w[i] / 2, 78, name, { ...INK, size: 14 })}${text(xs[i] + w[i] / 2, 98, `${fmt(sizes[i])} ${tr('rows', 'baris')}`, { size: 12 })}
${text(xs[i] + w[i] / 2, 136, job, { ...INK, size: 13 })}${text(xs[i] + w[i] / 2, 154, sub, { size: 12 })}`).join('');
  return svg(680, 214, `
${text(340, 24, tr(`${fmt(TOTAL)} penguins: shuffled, then cut once`, `${fmt(TOTAL)} penguin: diacak, lalu dibagi sekali saja`), { ...INK, size: 14 })}
${line(x0, 38, 656, 38, { c: 'var(--muted)', w: 1.4 })}
${parts3}
${text(340, 186, tr('The baseline is scored on the validation rows too, so it and the model face the same rows.', 'Baseline juga dinilai pada baris validation, jadi baseline dan model diuji pada baris yang sama.'), { size: 12 })}
${text(340, 204, tr('About 60% / 20% / 20% is a common starting point, not a rule.', 'Sekitar 60% / 20% / 20% hanya patokan awal, bukan aturan baku.'), { size: 12 })}`);
}

// Figure 3: the same 342 penguins cut twice, with and without stratifying.
function stratify() {
  const cuts = [
    [tr('Shuffled only', 'Hanya diacak'), splitIndices(TOTAL, { train: 0.6, validation: 0.2 }, 4, null)],
    [tr('Stratified by species', 'Stratified menurut spesies'), splitIndices(TOTAL, { train: 0.6, validation: 0.2 }, 4, LABELS)],
  ];
  const names = [tr('Train', 'Train'), tr('Validation', 'Validation'), tr('Test', 'Test')];
  const BX = 150, BW = 410, H = 24;
  let body = '';
  cuts.forEach(([title, parts], g) => {
    const top = 18 + g * 150;
    body += text(24, top + 8, title, { anchor: 'start', ...INK, size: 14 });
    ['train', 'validation', 'test'].forEach((part, r) => {
      const idx = parts[part], y = top + 24 + r * 38;
      const count = Object.fromEntries(SPECIES.map(([name]) => [name, 0]));
      idx.forEach(i => { count[LABELS[i]]++; });
      let x = BX;
      body += text(24, y + 16, `${names[r]} ${fmt(idx.length)}`, { anchor: 'start', size: 13, fill: 'var(--ink)' });
      for (const [name, c] of SPECIES) {
        const w = count[name] / idx.length * BW;
        body += `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${H}" fill="${k(c)}" stroke="var(--surface)" stroke-width="1.5"/>${text((x + w / 2).toFixed(1), y + 16, fmt(count[name]), { size: 11, weight: 700, fill: 'var(--surface)' })}`;
        x += w;
      }
      const share = count.Chinstrap / idx.length * 100;
      body += text(BX + BW + 12, y + 16, `${tr('Chinstrap', 'Chinstrap')} ${fmt(share, { digits: 1 })}%`, { anchor: 'start', size: 12, weight: part === 'test' && g === 0 ? 700 : 500, fill: 'var(--ink)' });
    });
  });
  const legend = SPECIES.map(([name, c], i) => `${dot(BX + i * 110, 322, k(c), 6)}${text(BX + i * 110 + 11, 326, name, { anchor: 'start', size: 12, fill: 'var(--ink)' })}`).join('');
  return svg(680, 344, `${body}${legend}`);
}

export const figures = { 'baselines': baselines, 'three-sets': threeSets, 'stratify': stratify };
