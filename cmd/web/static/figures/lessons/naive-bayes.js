// Figures for "The naive Bayes classifier": the scoring recipe, the effect of Laplace smoothing, the two
// class scores of the worked example, and why long products need logarithms. Every number is computed
// here from the lesson's training set, so the figures agree with the text.
import { svg, text, line, box, k, soft, tr, fmt } from '../kit.js';

const HAM = 0, SPAM = 1;
const ink = { fill: 'var(--ink)' };

// The lesson's made-up training set, as word counts per class.
const VOCAB = ['win', 'free', 'prize', 'now', 'meeting', 'lunch', 'report'];
const COUNTS = {
  [SPAM]: { win: 1, free: 2, prize: 2, now: 1, meeting: 0, lunch: 0, report: 0 },
  [HAM]: { win: 0, free: 0, prize: 0, now: 2, meeting: 2, lunch: 1, report: 1 },
};
const total = c => VOCAB.reduce((s, w) => s + COUNTS[c][w], 0);
const raw = (c, w) => COUNTS[c][w] / total(c);
const smooth = (c, w) => (COUNTS[c][w] + 1) / (total(c) + VOCAB.length);
const PRIOR = { [SPAM]: 2 / 5, [HAM]: 3 / 5 };
const label = c => (c === SPAM ? 'spam' : 'ham');
const MESSAGE = ['free', 'prize', 'now'];
const scoreOf = c => MESSAGE.reduce((s, w) => s * smooth(c, w), PRIOR[c]);

// The recipe: one prior and one factor per word for each class, then the larger score wins.
function flow() {
  const bw = 110, bh = 44, step = 132, x0 = 16;
  const rows = [[SPAM, 66], [HAM, 134]];
  const labels = [c => 'P(' + label(c) + ')', c => 'P(free | ' + label(c) + ')', c => 'P(prize | ' + label(c) + ')', c => 'P(now | ' + label(c) + ')'];
  const ex = x0 + 3 * step + bw;
  const rowSvg = ([c, y]) => {
    const boxes = labels.map((f, i) => `<rect x="${x0 + i * step}" y="${y}" width="${bw}" height="${bh}" rx="10" fill="${soft(c)}" stroke="${k(c)}" stroke-width="1.6"/>
${text(x0 + i * step + bw / 2, y + 27, f(c), { size: 12.5, weight: 700, ...ink })}`).join('');
    const ops = [0, 1, 2].map(i => text(x0 + i * step + bw + (step - bw) / 2, y + 29, '×', { size: 18, weight: 700, ...ink })).join('');
    return `${boxes}${ops}
${text(ex + 14, y + 29, '=', { size: 18, weight: 700, ...ink })}
<rect x="${ex + 28}" y="${y}" width="84" height="${bh}" rx="10" fill="var(--surface)" stroke="${k(c)}" stroke-width="2.4"/>
${text(ex + 70, y + 27, tr('score', 'skor') + ' ' + label(c), { size: 12.5, weight: 700, ...ink })}
${line(ex + 112, y + bh / 2, ex + 142, 122, { w: 1.8, c: 'var(--muted)', arrow: true })}`;
  };
  return svg(800, 222, `
${text(x0, 24, tr('Message: "free prize now" (a bag of words)', 'Pesan: "free prize now" (bag of words)'), { anchor: 'start', size: 13.5, weight: 700, ...ink })}
${text(x0 + bw / 2, 56, tr('prior', 'prior'), { size: 12.5, weight: 700, ...ink })}
${text(x0 + step + (2 * step + bw) / 2, 56, tr('one factor per word of the message', 'satu faktor untuk tiap kata pada pesan'), { size: 12.5, weight: 700, ...ink })}
${rows.map(rowSvg).join('')}
<rect x="${ex + 142}" y="86" width="108" height="72" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.6"/>
${text(ex + 196, 118, tr('larger score', 'skor terbesar'), { size: 13, weight: 700, ...ink })}
${text(ex + 196, 138, tr('wins', 'menang'), { size: 13, weight: 700, ...ink })}
${text(400, 206, tr('Each factor is one smoothed count away; see the next sections.', 'Tiap faktor tinggal satu hitungan (dengan smoothing); lihat bagian berikut.'), { size: 12 })}`);
}

// Word probabilities per class: raw counts (outline) against Laplace-smoothed (bar).
function smoothing() {
  const W = 700, rowH = 34, top = 64, scale = 450;
  const panel = (c, x0) => {
    const lx = x0 + 66, bx = x0 + 76;
    const rows = VOCAB.map((w, i) => {
      const y = top + i * rowH, r = raw(c, w), s = smooth(c, w);
      const label2 = `${fmt(r, { digits: 2 })} → ${fmt(s, { digits: 2 })}`;
      const reach = Math.max(r, s) * scale;
      return `${text(lx, y + 17, w, { anchor: 'end', size: 13, ...ink })}
<rect x="${bx}" y="${y + 2}" width="${r * scale}" height="22" rx="3" fill="none" stroke="var(--ink)" stroke-width="1.4" stroke-dasharray="4 3"/>
<rect x="${bx}" y="${y + 7}" width="${s * scale}" height="12" rx="2" fill="${k(c)}"/>
${text(bx + reach + 8, y + 18, label2, { anchor: 'start', size: 12 })}`;
    }).join('');
    return `${text(bx, 28, tr(`${label(c)}: ${total(c)} words`, `${label(c)}: ${total(c)} kata`), { anchor: 'start', size: 15, weight: 700, ...ink })}
${text(bx, 48, tr('probability of each word', 'probabilitas tiap kata'), { anchor: 'start', size: 12 })}
${line(bx, top - 4, bx, top + VOCAB.length * rowH, { c: 'var(--muted)', w: 1.4 })}${rows}`;
  };
  const ly = top + VOCAB.length * rowH + 22;
  return svg(W, ly + 30, `
${panel(SPAM, 12)}${panel(HAM, 360)}
<rect x="40" y="${ly - 11}" width="26" height="14" rx="3" fill="none" stroke="var(--ink)" stroke-width="1.4" stroke-dasharray="4 3"/>
${text(74, ly + 1, tr('before smoothing: count / total', 'sebelum smoothing: hitungan / total'), { anchor: 'start', size: 12.5 })}
<rect x="372" y="${ly - 9}" width="12" height="10" rx="2" fill="${k(SPAM)}"/><rect x="386" y="${ly - 9}" width="12" height="10" rx="2" fill="${k(HAM)}"/>
${text(406, ly + 1, tr(`after: (count + 1) / (total + ${VOCAB.length})`, `sesudah: (hitungan + 1) / (total + ${VOCAB.length})`), { anchor: 'start', size: 12.5 })}`);
}

// The two scores for "free prize now", factor by factor, and the probabilities they give.
function scores() {
  const x0 = 120, bw = 96, step = 122, bh = 46;
  const heads = [tr('prior', 'prior'), ...MESSAGE];
  const rows = [[SPAM, 64], [HAM, 130]];
  const fr = (c, w) => `${COUNTS[c][w] + 1} / ${total(c) + VOCAB.length}`;
  const rowSvg = ([c, y]) => {
    const vals = [`${[2, 3][c === SPAM ? 0 : 1]} / 5`, ...MESSAGE.map(w => fr(c, w))];
    const boxes = vals.map((v, i) => `<rect x="${x0 + i * step}" y="${y}" width="${bw}" height="${bh}" rx="10" fill="${soft(c)}" stroke="${k(c)}" stroke-width="1.6"/>
${text(x0 + i * step + bw / 2, y + 29, v, { size: 16, weight: 700, ...ink })}`).join('');
    const ops = [0, 1, 2].map(i => text(x0 + i * step + bw + (step - bw) / 2, y + 30, '×', { size: 18, weight: 700, ...ink })).join('');
    const sx = x0 + 3 * step + bw + 30;
    return `<rect x="14" y="${y}" width="82" height="${bh}" rx="10" fill="${k(c)}"/>
${text(55, y + 29, label(c), { size: 16, weight: 700, fill: 'var(--surface)' })}
${boxes}${ops}${text(x0 + 3 * step + bw + 15, y + 30, '=', { size: 18, weight: 700, ...ink })}
<rect x="${sx}" y="${y}" width="100" height="${bh}" rx="10" fill="var(--surface)" stroke="${k(c)}" stroke-width="2.4"/>
${text(sx + 50, y + 29, fmt(scoreOf(c), { digits: 5 }), { size: 15, weight: 700, ...ink })}`;
  };
  const ps = scoreOf(SPAM) / (scoreOf(SPAM) + scoreOf(HAM));
  const bx = 120, bwid = 570, by = 232;
  const sW = bwid * ps;
  return svg(720, 316, `
${heads.map((h, i) => text(x0 + i * step + bw / 2, 48, h, { size: 13, weight: 700, ...ink })).join('')}
${text(x0 + 3 * step + bw + 30 + 50, 48, tr('score', 'skor'), { size: 13, weight: 700, ...ink })}
${rows.map(rowSvg).join('')}
${text(bx, 214, tr('Each score divided by the sum of both scores:', 'Tiap skor dibagi jumlah kedua skor:'), { anchor: 'start', size: 13, ...ink })}
<rect x="${bx}" y="${by}" width="${sW}" height="38" rx="8" fill="${k(SPAM)}"/>
<rect x="${bx + sW}" y="${by}" width="${bwid - sW}" height="38" rx="8" fill="${k(HAM)}"/>
${text(bx + sW / 2, by + 25, `spam ${fmt(ps, { digits: 2 })}`, { size: 15, weight: 700, fill: 'var(--surface)' })}
${text(bx + sW + (bwid - sW) / 2, by + 25, `ham ${fmt(1 - ps, { digits: 2 })}`, { size: 15, weight: 700, fill: 'var(--surface)' })}
${text(bx, 296, tr(`The spam score is ${fmt(scoreOf(SPAM) / scoreOf(HAM))} times the ham score, so spam wins.`, `Skor spam adalah ${fmt(scoreOf(SPAM) / scoreOf(HAM))} kali skor ham, sehingga spam menang.`), { anchor: 'start', size: 13 })}`);
}

// log10 of a product of n factors of 1/13, against the smallest positive 64-bit float.
function underflow() {
  const X0 = 80, X1 = 660, Y0 = 36, Y1 = 250, nMax = 300, lo = -400;
  const X = n => X0 + (n / nMax) * (X1 - X0);
  const Y = v => Y0 + (v / lo) * (Y1 - Y0);
  const per = Math.log10(13);
  const floor = Math.log10(Number.MIN_VALUE);
  const nCross = floor / -per;
  const xt = [0, 100, 200, 300].map(n => `${line(X(n), Y1, X(n), Y1 + 6, { c: 'var(--muted)', w: 1.4 })}${text(X(n), Y1 + 22, fmt(n), { size: 12 })}`).join('');
  const yt = [0, -100, -200, -300, -400].map(v => `${line(X0 - 6, Y(v), X0, Y(v), { c: 'var(--muted)', w: 1.4 })}${text(X0 - 10, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('');
  const sup = (b, e) => `${b}<tspan dy="-5" font-size="10">${e}</tspan>`;
  return svg(700, 330, `
<rect x="${X0}" y="${Y(floor)}" width="${X1 - X0}" height="${Y1 - Y(floor)}" fill="var(--accent-soft)"/>
${line(X0, Y0, X0, Y1, { c: 'var(--muted)', w: 1.6 })}${line(X0, Y1, X1, Y1, { c: 'var(--muted)', w: 1.6 })}${xt}${yt}
${line(X0, Y(floor), X1, Y(floor), { c: 'var(--ink)', w: 1.6, dash: '6 4' })}
<text x="${X0 + 10}" y="${Y(floor) - 8}" text-anchor="start" font-size="12.5" font-weight="700" fill="var(--ink)">${tr('smallest storable positive number: ', 'bilangan positif terkecil yang dapat disimpan: ')}${sup('5 × 10', '−324')}</text>
${line(X(0), Y(0), X(nMax), Y(-nMax * per), { c: k(SPAM), w: 3.4 })}
<circle cx="${X(nCross)}" cy="${Y(floor)}" r="5.5" fill="var(--surface)" stroke="${k(SPAM)}" stroke-width="2.6"/>
${line(X(nCross), 128, X(nCross), Y(floor) - 8, { c: 'var(--muted)', w: 1.2 })}
${text(X1, 120, tr(`${fmt(Math.round(nCross))} words: the product reaches the floor`, `${fmt(Math.round(nCross))} kata: hasil kali mencapai batas bawah`), { anchor: 'end', size: 12.5, weight: 700, ...ink })}
${text((X0 + X1) / 2, (Y(floor) + Y1) / 2 + 8, tr('stored as 0: both classes tie', 'tersimpan sebagai 0: kedua kelas seri'), { size: 13, weight: 700, ...ink })}
<g transform="translate(18 ${(Y0 + Y1) / 2}) rotate(-90)">${text(0, 0, tr('log10 of the product', 'log10 dari hasil kali'), { size: 12.5 })}</g>
${text((X0 + X1) / 2, Y1 + 46, tr('number of words in the message (each word has probability 1 / 13)', 'jumlah kata dalam pesan (tiap kata berprobabilitas 1 / 13)'), { size: 12.5 })}
${text((X0 + X1) / 2, 318, tr(`In logs, 300 words give ln = ${fmt(-300 * Math.log(13), { digits: 1 })}: an ordinary number.`, `Dalam log, 300 kata memberi ln = ${fmt(-300 * Math.log(13), { digits: 1 })}: bilangan biasa.`), { size: 13, weight: 700, ...ink })}`);
}

export const figures = {
  flow,
  smoothing,
  scores,
  underflow,
};
