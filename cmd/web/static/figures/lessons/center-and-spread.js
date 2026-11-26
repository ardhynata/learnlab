// Figures for the lesson "Center and spread": [[figure:center-and-spread/name|Caption]].
// The five flipper lengths are the first five Adelie penguins with a measurement in
// data/penguins.csv. The histogram counts below were computed from all 342 measured
// penguins in that file (body mass in 300 g bins from 2700 g, flipper length in 5 mm bins
// from 170 mm); the last body-mass bin also holds the single 6300 g penguin.
import { svg, dot, ring, text, line, box, k, soft, tr, fmt } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const FIVE = [181, 186, 195, 193, 190];
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const median = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const BODY_MASS = { lo: 2700, step: 300, counts: [9, 25, 56, 54, 44, 36, 34, 26, 19, 22, 13, 4], mean: 4201.754385964912, median: 4050, dec: 0 };
const FLIPPER = { lo: 170, step: 5, counts: [2, 6, 24, 45, 62, 51, 19, 19, 35, 36, 24, 11, 8], mean: 200.91520467836258, median: 197, dec: 1 };

// Five flipper lengths, then six: the mean is a balance point, the median is the middle one.
function meanAndMedian() {
  const X = v => 20 + (v - 178) * 15.4;   // wide enough that the 193 and 195 labels keep a gap
  const row = (values, y0, title, extraColor) => {
    const m = mean(values), md = median(values);
    const sorted = [...values].sort((a, b) => a - b);
    return `${text(14, y0- 62, title, { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 })}
${line(X(178), y0, X(218), y0, { c: 'var(--muted)', w: 2 })}
${line(X(md), y0 - 8, X(md), y0 - 32, { c: k(1), w: 2.6, dash: '4 3' })}${text(X(md), y0 - 38, `${tr('median', 'median')} ${fmt(md)}`, { fill: k(1), weight: 700, size: 13 })}
${sorted.map(v => (extraColor && v === 217 ? ring(X(v), y0, k(3), 6.5) : dot(X(v), y0, 'var(--ink)', 5.5))).join('')}
${sorted.map(v => text(X(v), y0 + 22, fmt(v), { size: 12 })).join('')}
<path d="M${X(m)} ${y0 + 30}l-9 15h18z" fill="${k(0)}" stroke="var(--ink)" stroke-width="1.6" stroke-linejoin="round"/>
${text(X(m), y0 + 62, `${tr('mean', 'rata-rata')} ${fmt(m, { max: 1 })}`, { fill: k(0), weight: 700, size: 13 })}`;
  };
  const six = [...FIVE, 217];
  const dMean = mean(six) - mean(FIVE), dMedian = median(six) - median(FIVE);
  return svg(640, 352, `
${row(FIVE, 90, tr('Five Adelie penguins', 'Lima penguin Adelie'))}
${row(six, 252, tr('A Gentoo with a 217 mm flipper joins', 'Seekor Gentoo dengan flipper 217 mm bergabung'), true)}
${text(626, 338, `${tr('mean moved', 'rata-rata bergeser')} ${fmt(dMean, { max: 1 })} mm, ${tr('median moved', 'median bergeser')} ${fmt(dMedian, { max: 1 })} mm`, { anchor: 'end', fill: 'var(--ink)', weight: 700, size: 13 })}
${text(626, 24, tr('flipper length (mm)', 'panjang flipper (mm)'), { anchor: 'end', size: 12 })}`);
}

// The worked example of the variance: gap from the mean, then the gap squared.
function deviations() {
  const m = mean(FIVE), sorted = [...FIVE].sort((a, b) => a - b);
  const MX = 226, S = 12, SQ = 3.2, rowY = i => 70 + i * 34;
  const gaps = sorted.map(v => v - m), squares = gaps.map(g => g * g);
  const total = squares.reduce((a, b) => a + b, 0), variance = total / sorted.length;
  const sgn = g => (g > 0 ? '+' : g < 0 ? '−' : '') + fmt(Math.abs(g));
  const left = `${box(0, 30, 340, 190)}${text(170, 22, `${tr('Gap from the mean', 'Selisih dari rata-rata')} (${fmt(m)})`, INK)}
${line(MX, 42, MX, 212, { c: k(0), w: 2.4, dash: '5 4' })}
${sorted.map((v, i) => `${text(20, rowY(i) + 5, `${fmt(v)} mm`, { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${line(MX, rowY(i), MX + gaps[i] * S, rowY(i), { c: k(1), w: 3.4 })}${dot(MX + gaps[i] * S, rowY(i), 'var(--ink)', 5.5)}
${text(MX + gaps[i] * S + (gaps[i] < 0 ? -11 : 11), rowY(i) + 5, sgn(gaps[i]), { anchor: gaps[i] < 0 ? 'end' : 'start', fill: k(1), weight: 700, size: 13 })}`).join('')}`;
  const right = `${box(360, 30, 280, 190)}${text(500, 22, tr('Gap squared', 'Selisih dikuadratkan'), INK)}
${sorted.map((v, i) => `<rect x="376" y="${rowY(i) - 10}" width="${squares[i] * SQ}" height="20" rx="4" fill="${soft(0)}" stroke="${k(0)}" stroke-width="2"/>
${text(376 + squares[i] * SQ + 8, rowY(i) + 5, fmt(squares[i]), { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 })}`).join('')}`;
  return svg(640, 276, `${left}${right}
${text(320, 244, `${squares.map(s => fmt(s)).join(' + ')} = ${fmt(total)}    →    ${fmt(total)} ÷ ${fmt(sorted.length)} = ${fmt(variance, { digits: 1 })} mm² (${tr('variance', 'varians')})`, INK)}
${text(320, 266, `√${fmt(variance, { digits: 1 })} ≈ ${fmt(Math.sqrt(variance), { digits: 2 })} mm (${tr('standard deviation', 'simpangan baku')})`, INK)}`);
}

// Two real columns as histograms, with the mean and the median marked.
function histogramPanel(ox, data, ticks, title, color, note) {
  const x0 = ox + 26, W = 252, base = 204, top = 84, nb = data.counts.length, span = nb * data.step, bw = W / nb;
  const maxCount = Math.max(...data.counts);
  const X = v => x0 + (v - data.lo) / span * W;
  const bars = data.counts.map((c, i) => `<rect x="${(x0 + i * bw + 1).toFixed(1)}" y="${(base - c / maxCount * (base - top)).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${(c / maxCount * (base - top)).toFixed(1)}" rx="2" fill="${soft(color)}" stroke="${k(color)}" stroke-width="1.6"/>`).join('');
  const md = X(data.median), mn = X(data.mean);
  return `${box(ox, 30, 310, 232)}${text(ox + 155, 22, title, INK)}
${bars}${line(x0, base, x0 + W, base, { c: 'var(--muted)', w: 1.6 })}
${ticks.map(t => `${line(X(t), base, X(t), base + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(t), base + 20, fmt(t), { size: 12 })}`).join('')}
${line(md, 70, md, base, { c: k(1), w: 2.6, dash: '4 3' })}${text(md - 6, 66, `${tr('median', 'median')} ${fmt(data.median)}`, { anchor: 'end', fill: k(1), weight: 700, size: 12 })}
${line(mn, 76, mn, base, { c: k(0), w: 2.6 })}${text(mn + 6, 80, `${tr('mean', 'rata-rata')} ${fmt(data.mean, { max: data.dec })}`, { anchor: 'start', fill: k(0), weight: 700, size: 12 })}
${text(ox + 155, 252, note, { size: 12 })}`;
}

function penguinShapes() {
  return svg(640, 270, `${histogramPanel(0, BODY_MASS, [3000, 4000, 5000, 6000], tr('Body mass (g)', 'Massa tubuh (g)'), 2, tr('one hill, a long tail on the right', 'satu bukit, ekor panjang di kanan'))}
${histogramPanel(330, FLIPPER, [180, 200, 220], tr('Flipper length (mm)', 'Panjang flipper (mm)'), 2, tr('two humps; the mean sits in the valley', 'dua punuk; rata-rata ada di lembah'))}`);
}

export const figures = { 'mean-and-median': meanAndMedian, 'deviations': deviations, 'penguin-shapes': penguinShapes };
