// Figures for the lesson "Bootstrap lab". Every number is computed here with the lab's own math and seeds
// (sims/ml/uncertainty.js and sims/ml/bootstraplab.js), for the screen the lab shows on a fresh load or after
// Reset: the generated population of 5,000 cases at 85.0%, n = 100, 200 samples, B = 500. That is why the
// figures agree with the lesson text and with the lab.
import { svg, dot, diamond, cross, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';
import { bootstrapMeans, percentileCI, coverageRuns, binomialSE, mean } from '../../sims/ml/uncertainty.js';
import { generatedPopulation, scrambleSeed, drawBatch, histogram, binSpec } from '../../sims/ml/bootstraplab.js';

const ink = { weight: 700, fill: 'var(--ink)' };
const N = 100, TIMES = 200, B = 500, SEED = 41, BOOT_SEED = 3001, COV_SEED = 7001, EXPERIMENTS = 200, CHUNK = 10, SHOWN = 60;
const pc = v => pct(v, 1);

// The first screen of the lab, computed once (counter 1 is the draw the lab makes when it opens).
let memo = null;
function screen() {
  if (memo) return memo;
  const pop = generatedPopulation();
  const truth = mean(pop);
  const res = drawBatch(pop, N, TIMES, scrambleSeed(SEED, 1));
  const band = percentileCI(res.means, 0.05);
  const resamples = bootstrapMeans(res.last, B, scrambleSeed(BOOT_SEED, 1 * 1000 + B));
  const ci = percentileCI(resamples, 0.05);
  // "Run 200 experiments" right after opening uses the draw counters 2, 3, ... one per chunk of 10 experiments.
  const runs = [];
  for (let c = 2; runs.length < EXPERIMENTS; c++) runs.push(...coverageRuns({ pop, n: N, B, experiments: CHUNK, alpha: 0.05, seed: scrambleSeed(COV_SEED, c) }));
  memo = { truth, pile: res.means, last: mean(res.last), band, ci, runs };
  return memo;
}

// ---- Figure 1: the first screen of the lab, redrawn: the pile, its middle 95% and one bootstrap interval. ----
function defaultScreen() {
  const { truth, pile, last, band, ci } = screen();
  const W = 640, left = 48, right = 20, plotW = W - left - right, lo = 0.6, hi = 1;
  const X = v => left + (v - lo) / (hi - lo) * plotW;
  const top = 78, base = 262, h = base - top;
  const spec = binSpec(N, lo, hi);
  const shares = histogram(pile, spec);
  const yMax = Math.max(...shares) * 1.25;
  const Y = s => base - s / yMax * h;
  const bars = shares.map((s, j) => s ? `<rect x="${X(spec.left(j)).toFixed(1)}" y="${Y(s).toFixed(1)}" width="${Math.max(1, X(spec.right(j)) - X(spec.left(j)) - 1).toFixed(1)}" height="${(base - Y(s)).toFixed(1)}" fill="${k(0)}" opacity="0.85"/>` : '').join('');
  const shade = `<rect x="${X(band[0]).toFixed(1)}" y="${top}" width="${(X(band[1]) - X(band[0])).toFixed(1)}" height="${h}" fill="${k(2)}" opacity="0.17"/>${line(X(band[0]), top, X(band[0]), base, { c: k(2), w: 2, dash: '2 3' })}${line(X(band[1]), top, X(band[1]), base, { c: k(2), w: 2, dash: '2 3' })}`;
  const ticks = [60, 70, 80, 90, 100].map(v => `${line(X(v / 100), base, X(v / 100), base + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(v / 100), base + 20, `${fmt(v)}%`, { size: 12 })}`).join('');
  const by = 52;   // the bootstrap interval of the last sample, drawn along the top like the lab does
  const boot = `${line(X(ci[0]), by, X(ci[1]), by, { c: k(1), w: 4 })}${line(X(ci[0]), by - 7, X(ci[0]), by + 7, { c: k(1), w: 2.5 })}${line(X(ci[1]), by - 7, X(ci[1]), by + 7, { c: k(1), w: 2.5 })}${diamond(X(last), by, k(1), 8)}`;
  return svg(W, 340, `${text(left, 18, tr(`${fmt(TIMES)} samples of ${fmt(N)} cases each: how many landed on each accuracy`, `${fmt(TIMES)} sampel berisi ${fmt(N)} kasus: berapa yang jatuh di tiap accuracy`), { anchor: 'start', ...ink, size: 13 })}
${text(left, 38, tr(`Bootstrap 95% interval of the last sample (${pc(last)}): ${pc(ci[0])} to ${pc(ci[1])}`, `Interval bootstrap 95% dari sampel terakhir (${pc(last)}): ${pc(ci[0])} sampai ${pc(ci[1])}`), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${shade}${bars}
${line(X(truth), top, X(truth), base, { c: 'var(--ink)', w: 2, dash: '6 4' })}${boot}
${line(left, base, W - right, base, { c: 'var(--muted)', w: 1.6 })}${ticks}
${text(left + plotW / 2, base + 40, tr('Accuracy of a sample (share right)', 'Accuracy sebuah sampel (porsi benar)'), { size: 12 })}
${text(X(truth), top - 6, tr(`true accuracy ${pc(truth)}`, `true accuracy ${pc(truth)}`), { anchor: 'middle', size: 12, fill: 'var(--ink)' })}
${text(X(band[1]) + 8, top + 36, tr('middle 95%', '95% tengah'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${text(X(band[1]) + 8, top + 52, `${pc(band[0])} – ${pc(band[1])}`, { anchor: 'start', size: 12, fill: 'var(--ink)' })}`);
}

// ---- Figure 2: two routes to the same width: the lab's pile (needs the population) and one sample's bootstrap. ----
function twoRoutes() {
  const { truth, last, band, ci } = screen();
  const W = 640, bw = 188, gap = 28, left = 5, bh = 84;
  const bx = i => left + i * (bw + gap);
  const lane = (y, c, title, cells) => {
    const boxes = cells.map((lines, i) => `${box(bx(i), y, bw, bh, soft(c), k(c))}${lines.map((t, j) => text(bx(i) + bw / 2, y + 26 + j * 21, t, { size: 13, fill: 'var(--ink)', weight: j === 0 ? 700 : 500 })).join('')}`).join('');
    const arrows = [0, 1].map(i => line(bx(i) + bw + 3, y + bh / 2, bx(i + 1) - 3, y + bh / 2, { c: 'var(--muted)', w: 2, arrow: true })).join('');
    return `${text(left, y - 10, title, { anchor: 'start', ...ink, size: 13 })}${boxes}${arrows}`;
  };
  const wA = (band[1] - band[0]) * 100, wB = (ci[1] - ci[0]) * 100;
  const xm = bx(2) + bw / 2, y1 = 34, y2 = 218;
  return svg(W, 340, `${lane(y1, 0, tr('In the lab: you can draw from the whole population', 'Di lab: kamu bisa mengambil dari seluruh populasi'), [
    [tr('Population', 'Populasi'), tr(`${fmt(5000)} cases`, `${fmt(5000)} kasus`), tr(`${pc(truth)} right`, `${pc(truth)} benar`)],
    [tr(`Draw ${fmt(TIMES)} samples`, `Ambil ${fmt(TIMES)} sampel`), tr(`of ${fmt(N)} cases each`, `masing-masing ${fmt(N)} kasus`), tr('(with replacement)', '(dengan pengembalian)')],
    [tr(`${fmt(TIMES)} accuracies`, `${fmt(TIMES)} accuracy`), tr('middle 95%:', '95% tengah:'), tr(`${pc(band[0])} to ${pc(band[1])}`, `${pc(band[0])} sampai ${pc(band[1])}`)],
  ])}
${lane(y2, 1, tr('In real work: you have one sample', 'Di dunia nyata: kamu hanya punya satu sampel'), [
    [tr('One sample', 'Satu sampel'), tr(`${fmt(N)} cases`, `${fmt(N)} kasus`), tr(`${pc(last)} right`, `${pc(last)} benar`)],
    [tr(`Resample it ${fmt(B)} times`, `Resample ${fmt(B)} kali`), tr(`${fmt(N)} cases each`, `masing-masing ${fmt(N)} kasus`), tr('(with replacement)', '(dengan pengembalian)')],
    [tr(`${fmt(B)} accuracies`, `${fmt(B)} accuracy`), tr('95% interval:', 'interval 95%:'), tr(`${pc(ci[0])} to ${pc(ci[1])}`, `${pc(ci[0])} sampai ${pc(ci[1])}`)],
  ])}
${line(xm, y1 + bh + 6, xm, y2 - 6, { c: 'var(--ink)', w: 2, dash: '5 4', arrow: true })}
${text(xm - 12, (y1 + bh + y2) / 2 + 5, tr(`similar width: ${fmt(wA, { digits: 1 })} and ${fmt(wB, { digits: 1 })} points`, `lebar mirip: ${fmt(wA, { digits: 1 })} dan ${fmt(wB, { digits: 1 })} poin`), { anchor: 'end', size: 13, fill: 'var(--ink)', weight: 700 })}`);
}

// ---- Figure 3: four times the cases, half the width (1.96 standard errors either side of the truth). ----
function quadruple() {
  const W = 640, left = 70, right = 100, plotW = W - left - right, lo = 0.7, hi = 1;
  const X = v => left + (v - lo) / (hi - lo) * plotW;
  const p = 0.85, sizes = [50, 100, 200, 400, 800], rowH = 38, top = 52;
  const rows = sizes.map((n, i) => {
    const half = 1.96 * binomialSE(p, n), y = top + i * rowH + 14, mark = n === 100 || n === 400;
    return `${mark ? `<rect x="2" y="${y - 17}" width="${W - 4}" height="${rowH - 3}" rx="8" fill="${soft(1)}"/>` : ''}
${text(left - 10, y + 4, tr(`n = ${fmt(n)}`, `n = ${fmt(n)}`), { anchor: 'end', ...ink, size: 13 })}
${line(X(p - half), y, X(p + half), y, { c: k(0), w: 7 })}${line(X(p - half), y - 8, X(p - half), y + 8, { c: k(0), w: 2.5 })}${line(X(p + half), y - 8, X(p + half), y + 8, { c: k(0), w: 2.5 })}
${text(X(hi) + 12, y + 4, tr(`${fmt(2 * half * 100, { digits: 1 })} points`, `${fmt(2 * half * 100, { digits: 1 })} poin`), { anchor: 'start', size: 13, fill: 'var(--ink)', weight: mark ? 700 : 500 })}`;
  }).join('');
  const base = top + sizes.length * rowH + 4;
  const ticks = [70, 75, 80, 85, 90, 95, 100].map(v => `${line(X(v / 100), base, X(v / 100), base + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(v / 100), base + 20, `${fmt(v)}%`, { size: 12 })}`).join('');
  return svg(W, base + 56, `${text(left, 16, tr('Middle 95% of the sample accuracies, on average:', 'Rata-rata 95% tengah dari accuracy sampel:'), { anchor: 'start', size: 12, fill: 'var(--ink)', weight: 700 })}
${text(left, 32, tr('85% plus and minus 1.96 standard errors', '85% ditambah dan dikurangi 1,96 standard error'), { anchor: 'start', size: 12, fill: 'var(--ink)', weight: 700 })}
${line(X(p), top - 4, X(p), base, { c: 'var(--ink)', w: 2, dash: '6 4' })}${rows}
${line(left, base, X(hi), base, { c: 'var(--muted)', w: 1.6 })}${ticks}
${text(left + plotW / 2, base + 42, tr('Highlighted: four times the cases, half the width', 'Disorot: kasus empat kali lebih banyak, lebar separuhnya'), { size: 12, fill: 'var(--ink)' })}`);
}

// ---- Figure 4: the first 60 of the 200 experiments, like the lab's coverage card. ----
function coverageLines() {
  const { truth, runs } = screen();
  const shown = runs.slice(0, SHOWN);
  const W = 640, left = 48, right = 20, plotW = W - left - right, top = 46, rowH = 4.6, H = SHOWN * rowH, base = top + H;
  const lo = Math.floor((Math.min(truth, ...shown.map(r => r.lo)) - 0.005) * 20) / 20;
  const hi = Math.ceil((Math.max(truth, ...shown.map(r => r.hi)) + 0.005) * 20) / 20;
  const X = v => left + (v - lo) / (hi - lo) * plotW;
  const missed = shown.filter(r => !r.covered).length;
  const all = runs.filter(r => r.covered).length;
  const rowsSvg = shown.map((r, i) => {
    const y = top + (i + 0.5) * rowH, c = r.covered ? k(0) : k(1);
    const mx = X(r.mean < truth ? r.hi : r.lo);
    return `${line(X(r.lo), y, X(r.hi), y, { c, w: r.covered ? 1.6 : 3.2 })}${dot(X(r.mean), y, c, r.covered ? 1.8 : 2.6)}${r.covered ? '' : cross(mx, y, k(1))}`;
  }).join('');
  const ticks = [];
  for (let v = Math.round(lo * 20); v <= Math.round(hi * 20); v++) ticks.push(`${line(X(v / 20), base, X(v / 20), base + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(v / 20), base + 20, `${fmt(v * 5)}%`, { size: 12 })}`);
  return svg(W, base + 82, `${box(left, top, plotW, H, 'var(--surface)', 'var(--line)')}
${line(left, 18, left + 22, 18, { c: k(0), w: 1.8 })}${text(left + 30, 22, tr('contains the true accuracy', 'mencakup true accuracy'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${line(left + 250, 18, left + 272, 18, { c: k(1), w: 3.2 })}${text(left + 280, 22, tr('misses it (×)', 'meleset (×)'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${rowsSvg}${line(X(truth), top, X(truth), base, { c: 'var(--ink)', w: 2, dash: '6 4' })}
${line(left, base, W - right, base, { c: 'var(--muted)', w: 1.6 })}${ticks.join('')}
${text(left + plotW / 2, base + 40, tr(`Each line: the bootstrap 95% interval of one experiment (first ${fmt(SHOWN)}; true accuracy ${pc(truth)} dashed)`, `Tiap garis: interval bootstrap 95% dari satu eksperimen (${fmt(SHOWN)} pertama; true accuracy ${pc(truth)} putus-putus)`), { size: 12 })}
${text(left + plotW / 2, base + 62, tr(`${fmt(missed)} of these ${fmt(SHOWN)} miss; in all ${fmt(EXPERIMENTS)} experiments ${fmt(all)} contain it (${pc(all / EXPERIMENTS)})`, `${fmt(missed)} dari ${fmt(SHOWN)} ini meleset; dari seluruh ${fmt(EXPERIMENTS)} eksperimen, ${fmt(all)} mencakupnya (${pc(all / EXPERIMENTS)})`), { size: 13, fill: 'var(--ink)', weight: 700 })}`);
}

export const figures = { 'default-screen': defaultScreen, 'two-routes': twoRoutes, 'quadruple': quadruple, 'coverage-lines': coverageLines };
