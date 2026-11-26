// Figures for the lesson "Covariate and concept shift": [[figure:covariate-and-concept-shift/name|Caption]].
// The numbers are the ones in the lesson text: the streaming service (accuracy by hours watched 60, 80 and 95 percent,
// viewer mix 10/30/60 before and 60/30/10 after) and the screening test (180 and 40 flagged at 20 percent sick,
// rescaled to 18 and 49 at 2 percent sick).
import { svg, dot, ring, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };

// A tiny seeded generator (mulberry32) so the scatter panels look the same every time.
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- Figure 1: the three kinds of shift ---------------------------------------------------------------
// Points live in the unit square. In training the class is "above the diagonal y = x" (rings) or "below" (dots).
const aboveDiag = (x, y) => y > x;
// n points inside [lo, hi] squared, none within 0.07 of the diagonal; wantAbove(i) says which side point i must be on.
function scatter(seed, n, lo, hi, wantAbove) {
  const r = lcg(seed), out = [];
  while (out.length < n) {
    const x = lo + (hi - lo) * r(), y = lo + (hi - lo) * r();
    if (Math.abs(y - x) > 0.07 && aboveDiag(x, y) === wantAbove(out.length)) out.push([x, y]);
  }
  return out;
}
const TRAIN = scatter(11, 24, 0.06, 0.72, i => i % 2 === 0);
// Covariate shift: new points sit in the upper right, where training had none, and both classes are still there.
const COVARIATE = scatter(23, 22, 0.5, 0.94, i => i % 2 === 0);
// Label shift: same look for each class, but nine in ten new points belong to the class "above".
const LABEL_SHIFT = scatter(37, 26, 0.06, 0.72, i => i % 9 !== 0);

function threeShifts() {
  const colW = 205, PW = 90, PY = 70;
  const plot = (x0, title, pts, cls, boundary, hot) => {
    const sx = x => x0 + 4 + x * (PW - 8), sy = y => PY + 4 + (1 - y) * (PW - 8);
    const body = pts.map(([x, y]) => (cls(x, y) ? ring(sx(x), sy(y), k(2), 3.6) : dot(sx(x), sy(y), k(0), 3.6))).join('');
    const [bx1, by1, bx2, by2] = boundary;
    return `<rect x="${x0}" y="${PY}" width="${PW}" height="${PW}" rx="8" fill="${hot ? soft(3) : 'var(--surface)'}" stroke="${hot ? k(3) : 'var(--line)'}" stroke-width="1.6"/>
${line(sx(bx1), sy(by1), sx(bx2), sy(by2), { c: 'var(--ink)', w: 1.6, dash: '4 3' })}${body}
${text(x0 + PW / 2, PY - 8, title, { size: 12, ...INK })}`;
  };
  const diag = [0, 0, 1, 1], anti = [0, 1, 1, 0];
  const above = (x, y) => aboveDiag(x, y), belowAnti = (x, y) => x + y < 1;
  const col = (i, head, sub, a, b, notes) => {
    const x0 = 8 + i * (colW + 6) + 4;
    return `${text(x0 + PW + 6, 24, head, { size: 15, ...INK })}
${text(x0 + PW + 6, 42, sub, { size: 12, weight: 700, fill: k(i === 0 ? 3 : i === 1 ? 1 : 2) })}
${a(x0)}${b(x0 + PW + 14)}
${notes.map((s, j) => text(x0 + PW + 6, PY + PW + 24 + j * 16, s, { size: 12, fill: 'var(--ink)' })).join('')}`;
  };
  const body = [
    col(0, tr('Covariate shift', 'Covariate shift'), tr('inputs P(x) change', 'input P(x) berubah'),
      x => plot(x, tr('Training', 'Training'), TRAIN, above, diag, false),
      x => plot(x, tr('New', 'Baru'), COVARIATE, above, diag, true),
      tr(['New cases sit where', 'training had few'], ['Kasus baru ada di tempat', 'yang jarang di training'])),
    col(1, tr('Label shift', 'Label shift'), tr('class balance P(y) changes', 'proporsi kelas P(y) berubah'),
      x => plot(x, tr('Training', 'Training'), TRAIN, above, diag, false),
      x => plot(x, tr('New', 'Baru'), LABEL_SHIFT, above, diag, true),
      tr(['One class is now much', 'more common'], ['Satu kelas kini jauh', 'lebih sering muncul'])),
    col(2, tr('Concept shift', 'Concept shift'), tr('P(y given x) changes', 'P(y given x) berubah'),
      x => plot(x, tr('Training', 'Training'), TRAIN, above, diag, false),
      x => plot(x, tr('New', 'Baru'), TRAIN, belowAnti, anti, true),
      tr(['Same points, but the', 'split has moved'], ['Titik yang sama, tetapi', 'batas pemisahnya bergeser'])),
  ].join('');
  return svg(640, 218, body);
}

// ---- Figure 2: covariate shift, accuracy by region ------------------------------------------------------
const REGIONS = [
  { share: [0.1, 0.6], acc: 0.6, c: 1 },
  { share: [0.3, 0.3], acc: 0.8, c: 0 },
  { share: [0.6, 0.1], acc: 0.95, c: 2 },
];

function covariateAccuracy() {
  const X0 = 150, W = 470, BH = 36;
  const names = () => [tr('under 2 h', 'di bawah 2 jam'), tr('2 to 6 h', '2 sampai 6 jam'), tr('over 6 h', 'di atas 6 jam')];
  const legend = names().map((n, i) => {
    const x = [8, 222, 436][i];
    return `<rect x="${x}" y="14" width="18" height="14" rx="4" fill="${soft(REGIONS[i].c)}" stroke="${k(REGIONS[i].c)}" stroke-width="1.8"/>${text(x + 26, 26, tr(`${n}: accuracy ${pct(REGIONS[i].acc, 0)}`, `${n}: akurasi ${pct(REGIONS[i].acc, 0)}`), { anchor: 'start', size: 12, fill: 'var(--ink)' })}`;
  }).join('');
  const bar = (y, label, which, mixText) => {
    let x = X0;
    const segs = REGIONS.map((r, i) => {
      const w = r.share[which] * W, s = `<rect x="${x}" y="${y}" width="${w}" height="${BH}" fill="${soft(r.c)}" stroke="${k(r.c)}" stroke-width="1.8"/>${text(x + w / 2, y + 23, pct(r.share[which], 0), { size: 13, ...INK })}`;
      x += w;
      return s;
    }).join('');
    const acc = REGIONS.reduce((a, r) => a + r.share[which] * r.acc, 0);
    return `${text(X0 - 12, y + 16, label[0], { anchor: 'end', size: 13, ...INK })}${text(X0 - 12, y + 32, label[1], { anchor: 'end', size: 12 })}
${segs}
${text(X0, y + BH + 22, mixText, { anchor: 'start', size: 12, fill: 'var(--ink)' })}
${text(X0 + W, y + BH + 22, tr(`Accuracy ${pct(acc, 1)}`, `Akurasi ${pct(acc, 1)}`), { anchor: 'end', size: 14, weight: 700, fill: which === 0 ? k(2) : k(1) })}`;
  };
  const sum = which => REGIONS.map(r => `${fmt(r.share[which], { digits: 2 })} x ${fmt(r.acc, { digits: 2 })}`).join(' + ');
  return svg(640, 206, `
${legend}
${bar(50, tr(['Training mix', 'of viewers'], ['Komposisi', 'penonton training']), 0, sum(0))}
${bar(130, tr(['After the', 'promotion'], ['Setelah', 'promosi']), 1, sum(1))}`);
}

// ---- Figure 3: label shift, rescaling the flagged people ------------------------------------------------
function priorCorrection() {
  const X0 = 24, S = 1.1, BH = 32;
  const row = (y, title, sick, healthy, prec, big) => {
    const ws = sick * S, wh = healthy * S;
    const counts = big
      ? `${text(X0 + ws / 2, y + 21, tr(`${fmt(sick)} sick`, `${fmt(sick)} sakit`), { size: 13, ...INK })}${text(X0 + ws + wh / 2, y + 21, fmt(healthy), { size: 13, ...INK })}`
      : `${text(X0 + ws / 2, y + BH + 16, fmt(sick), { size: 13, ...INK })}${text(X0 + ws + wh / 2, y + BH + 16, fmt(healthy), { size: 13, ...INK })}`;
    return `${text(X0, y - 10, title, { anchor: 'start', size: 14, ...INK })}
<rect x="${X0}" y="${y}" width="${ws}" height="${BH}" fill="${soft(2)}" stroke="${k(2)}" stroke-width="1.8"/>
<rect x="${X0 + ws}" y="${y}" width="${wh}" height="${BH}" fill="${soft(1)}" stroke="${k(1)}" stroke-width="1.8"/>
${counts}
${text(X0 + ws + wh + 16, y + 21, tr(`precision ${fmt(sick)} / ${fmt(sick + healthy)} = ${fmt(prec, { digits: 2 })}`, `precision ${fmt(sick)} / ${fmt(sick + healthy)} = ${fmt(prec, { digits: 2 })}`), { anchor: 'start', size: 14, weight: 700, fill: 'var(--ink)' })}`;
  };
  return svg(640, 244, `
${row(34, tr('Where it was checked: 20% sick (referral clinic)', 'Tempat pengujiannya: 20% sakit (klinik rujukan)'), 180, 40, 180 / 220, true)}
${line(X0 + 60, 78, X0 + 60, 118, { c: 'var(--muted)', w: 2, arrow: true })}
${text(X0 + 76, 94, tr(`flagged and sick: x ${fmt(0.1)}  (${fmt(0.02, { digits: 2 })} / ${fmt(0.2, { digits: 2 })})`, `terflag dan sakit: x ${fmt(0.1)}  (${fmt(0.02, { digits: 2 })} / ${fmt(0.2, { digits: 2 })})`), { anchor: 'start', size: 13, fill: 'var(--ink)' })}
${text(X0 + 76, 112, tr(`flagged and healthy: x ${fmt(1.225)}  (${fmt(0.98, { digits: 2 })} / ${fmt(0.8, { digits: 2 })})`, `terflag dan sehat: x ${fmt(1.225)}  (${fmt(0.98, { digits: 2 })} / ${fmt(0.8, { digits: 2 })})`), { anchor: 'start', size: 13, fill: 'var(--ink)' })}
${row(152, tr('Where it is used: 2% sick (community check-up)', 'Tempat pemakaiannya: 2% sakit (check-up warga)'), 18, 49, 18 / 67, false)}
<rect x="${X0}" y="216" width="18" height="14" rx="4" fill="${soft(2)}" stroke="${k(2)}" stroke-width="1.8"/>${text(X0 + 26, 228, tr('flagged and sick', 'terflag dan sakit'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}
<rect x="${X0 + 190}" y="216" width="18" height="14" rx="4" fill="${soft(1)}" stroke="${k(1)}" stroke-width="1.8"/>${text(X0 + 216, 228, tr('flagged and healthy (false alarm)', 'terflag dan sehat (alarm palsu)'), { anchor: 'start', size: 12, fill: 'var(--ink)' })}`);
}

// ---- Figure 4: which validation setup can show which shift ----------------------------------------------
function whichValidation() {
  const LW = 200, CW = 132, RH = 46, T = 56, X0 = 10, G = 8;
  const cols = [tr('Covariate shift', 'Covariate shift'), tr('Label shift', 'Label shift'), tr('Concept shift', 'Concept shift')];
  const rows = [
    [tr(['Random split'], ['Split acak']), ['no', 'no', 'no']],
    [tr(['Grouped split'], ['Grouped split']), ['partly', 'partly', 'no']],
    [tr(['Temporal split'], ['Temporal split']), ['partly', 'partly', 'partly']],
    [tr(['Out-of-distribution test', 'built for one shift'], ['Uji out-of-distribution', 'dirancang untuk satu shift']), ['yes', 'yes', 'no']],
  ];
  const word = v => ({ no: tr('no', 'tidak'), partly: tr('partly', 'sebagian'), yes: tr('yes', 'ya') }[v]);
  const style = v => ({ no: ['var(--surface)', 'var(--line)', 'var(--muted)'], partly: [soft(3), k(3), 'var(--ink)'], yes: [soft(2), k(2), 'var(--ink)'] }[v]);
  const head = cols.map((c, i) => text(X0 + LW + G + i * (CW + G) + CW / 2, 36, c, { size: 14, ...INK })).join('');
  const body = rows.map(([label, cells], r) => {
    const y = T + r * (RH + G);
    const lab = label.length === 1
      ? text(X0 + LW - 12, y + RH / 2 + 5, label[0], { anchor: 'end', size: 14, ...INK })
      : `${text(X0 + LW - 12, y + RH / 2 - 2, label[0], { anchor: 'end', size: 14, ...INK })}${text(X0 + LW - 12, y + RH / 2 + 14, label[1], { anchor: 'end', size: 12 })}`;
    const boxes = cells.map((v, i) => {
      const [f, s, c] = style(v), x = X0 + LW + G + i * (CW + G);
      return `<rect x="${x}" y="${y}" width="${CW}" height="${RH}" rx="10" fill="${f}" stroke="${s}" stroke-width="1.8" ${v === 'no' ? 'stroke-dasharray="4 3"' : ''}/>${text(x + CW / 2, y + RH / 2 + 5, word(v), { size: 15, weight: 700, fill: c })}`;
    }).join('');
    return `${lab}${boxes}`;
  }).join('');
  const H = T + rows.length * (RH + G) + 30;
  return svg(640, H, `${head}${body}
${text(X0, H - 8, tr('partly: only when that shift already shows up across the groups or the time span you collected', 'sebagian: hanya bila shift itu sudah ada di antara kelompok atau waktu pada datamu'), { anchor: 'start', size: 12 })}`);
}

export const figures = {
  'three-shifts': threeShifts,
  'covariate-accuracy': covariateAccuracy,
  'prior-correction': priorCorrection,
  'which-validation': whichValidation,
};
