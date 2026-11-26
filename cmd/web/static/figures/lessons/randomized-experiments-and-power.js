// Figures for the lesson "Randomized experiments and power". The numbers are the lesson's own made-up A/B test:
// 2,000 visitors per group, 10% buy on the current page (A) and 12% on the new page (B). The standard error,
// the 95% interval, the p-value and the power curves are computed here from those inputs with the normal
// approximation. The false-positive rates for repeated looks (peeking) come from an offline simulation of
// 400,000 experiments with no true effect, one test per look at equally spaced looks (a seeded Gaussian
// random walk, cutoff 1.96); the rates for independent comparisons are the exact 1 - 0.95^m.
import { svg, dot, ring, text, line, k, tr, fmt, pct } from '../kit.js';
import { normalCdf } from '../../sims/ml/classifierscores.js';

const ink = { fill: 'var(--ink)' };
const bold = { fill: 'var(--ink)', weight: 700 };

const N_PER_GROUP = 2000, P_A = 0.10, P_B = 0.12, Z95 = 1.96;
const seRate = (p, n) => Math.sqrt(p * (1 - p) / n);
const seDiff = (pA, pB, n) => Math.sqrt(seRate(pA, n) ** 2 + seRate(pB, n) ** 2);
const SE = seDiff(P_A, P_B, N_PER_GROUP) * 100;      // standard error of the difference, in points (0.989)
const GAP = (P_B - P_A) * 100;                        // observed difference, in points (2)

// A small seeded generator so that the coin-flip panel is the same every time.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- Figure 1: the same 40 shoppers split by a coin flip and by their own choice. ----
function randomAssignment() {
  const FREQUENT = 12, TOTAL = 40, HALF = 20;
  const rand = seeded(7);
  const all = Array.from({ length: TOTAL }, (_, i) => i < FREQUENT);
  for (let i = TOTAL - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  const coin = [all.slice(0, HALF), all.slice(HALF)];
  const pick = (frequentAt) => Array.from({ length: HALF }, (_, i) => frequentAt.includes(i));
  const chosen = [pick([3, 12]), pick([0, 2, 3, 5, 7, 8, 11, 13, 16, 18])];

  const cols = 5, step = 22, groupW = cols * step;
  const group = (ox, oy, flags, label, c) => {
    const dots = flags.map((f, i) => {
      const x = ox + (i % cols) * step + step / 2, y = oy + Math.floor(i / cols) * step + step / 2;
      return f ? dot(x, y, k(1), 7) : ring(x, y, k(0), 6.5);
    }).join('');
    const n = flags.filter(Boolean).length;
    return `${dots}${text(ox + groupW / 2, oy + 4 * step + 20, label, { ...bold, size: 13 })}
${text(ox + groupW / 2, oy + 4 * step + 38, tr(`${fmt(n)} of ${fmt(HALF)} (${pct(n / HALF, 0)})`, `${fmt(n)} dari ${fmt(HALF)} (${pct(n / HALF, 0)})`), { ...ink, size: 12, weight: 600 })}`;
  };
  const panel = (ox, title, groups, c) => `${text(ox + groupW + 20, 18, title, { ...bold, size: 14 })}
${group(ox, 34, groups[0], tr('Control (A)', 'Kontrol (A)'), c)}${group(ox + groupW + 40, 34, groups[1], tr('New page (B)', 'Halaman baru (B)'), c)}`;
  const legend = `${dot(190, 218, k(1), 7)}${text(204, 222, tr('frequent buyer', 'pembeli yang sering'), { anchor: 'start', ...ink, size: 12 })}
${ring(350, 218, k(0), 6.5)}${text(364, 222, tr('occasional buyer', 'pembeli sesekali'), { anchor: 'start', ...ink, size: 12 })}`;
  return svg(640, 232, `${panel(22, tr('Coin flip decides', 'Koin yang menentukan'), coin, 0)}${panel(342, tr('Shoppers choose', 'Pembeli memilih sendiri'), chosen, 1)}
${line(320, 8, 320, 196, { c: 'var(--line)', w: 1.4, dash: '4 4' })}${legend}`);
}

// ---- Figure 2: the gap if the true effect were zero (null), the observed gap, and the 95% interval. ----
function nullAndInterval() {
  const left = 40, right = 620, lo = -4, hi = 4;
  const X = v => left + (v - lo) / (hi - lo) * (right - left);
  const base = 150, peak = 52;
  const pdf = v => Math.exp(-0.5 * (v / SE) ** 2);       // height relative to the peak
  const Y = v => base - pdf(v) * (base - peak);
  const pt = v => `${X(v).toFixed(1)} ${Y(v).toFixed(1)}`;
  const steps = 160;
  const along = (a, b) => Array.from({ length: steps + 1 }, (_, i) => a + (b - a) * i / steps);
  const curve = `M${along(lo, hi).map(pt).join('L')}`;
  const tail = (a, b) => `<path d="M${X(a).toFixed(1)} ${base}L${along(a, b).map(pt).join('L')}L${X(b).toFixed(1)} ${base}Z" fill="${k(1)}" opacity="0.4"/>`;
  const pValue = 2 * (1 - normalCdf(GAP / SE));
  const ticks = [-4, -3, -2, -1, 0, 1, 2, 3, 4].map(v => `${line(X(v), base, X(v), base + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(v), base + 19, fmt(v), { size: 12 })}`).join('');
  const lowCI = GAP - Z95 * SE, highCI = GAP + Z95 * SE;
  const iy = 236;
  const interval = `${line(X(lowCI), iy, X(highCI), iy, { c: k(0), w: 8 })}${line(X(lowCI), iy - 10, X(lowCI), iy + 10, { c: k(0), w: 3 })}${line(X(highCI), iy - 10, X(highCI), iy + 10, { c: k(0), w: 3 })}${dot(X(GAP), iy, 'var(--ink)', 6)}
${text(X(lowCI), iy + 26, fmt(lowCI, { digits: 2 }), { ...bold, size: 12 })}${text(X(highCI), iy + 26, fmt(highCI, { digits: 2 }), { ...bold, size: 12 })}${text(X(GAP), iy - 16, fmt(GAP), { ...bold, size: 12 })}`;
  const head1 = text(left - 8, 18, tr('Gaps that chance alone produces if the true effect is 0', 'Selisih yang muncul hanya karena kebetulan jika efek sebenarnya 0'), { anchor: 'start', ...bold, size: 13 });
  const head2 = text(left - 8, 196, tr('Our result and its 95% interval (points)', 'Hasil kita dan interval 95%-nya (poin)'), { anchor: 'start', ...bold, size: 13 });
  const note = `${text(X(-2) - 8, 132, tr(`${fmt(pValue / 2, { digits: 3 })} here`, `${fmt(pValue / 2, { digits: 3 })} di sini`), { anchor: 'end', ...ink, size: 12 })}${text(X(2) + 8, 132, tr(`${fmt(pValue / 2, { digits: 3 })} here`, `${fmt(pValue / 2, { digits: 3 })} di sini`), { anchor: 'start', ...ink, size: 12 })}
${text(X(1.5), 76, tr(`p-value = ${fmt(pValue, { digits: 3 })}`, `p-value = ${fmt(pValue, { digits: 3 })}`), { anchor: 'start', ...bold, size: 14 })}`;
  const zero = line(X(0), peak - 8, X(0), iy + 12, { c: 'var(--ink)', w: 1.4, dash: '5 4' });
  const foot = text(X(0), 284, tr('0 = no effect', '0 = tanpa efek'), { size: 12 });
  return svg(640, 294, `${head1}${tail(-4, -GAP)}${tail(GAP, 4)}<path d="${curve}" fill="none" stroke="var(--ink)" stroke-width="2"/>${line(left, base, right, base, { c: 'var(--muted)', w: 1.6 })}${ticks}${note}${zero}${head2}${interval}${foot}`);
}

// ---- Figure 3: power against visitors per group, for three true lifts over a 10% baseline. ----
const power = (delta, n) => normalCdf(delta / seDiff(P_A, P_A + delta, n) - Z95);
function powerCurves() {
  const left = 56, right = 560, base = 196, top = 34, maxN = 16000;
  const X = n => left + n / maxN * (right - left);
  const Y = p => base - p * (base - top);
  const effects = [[0.01, 0], [0.02, 1], [0.03, 2]];
  const curves = effects.map(([d, c]) => {
    const pts = Array.from({ length: 81 }, (_, i) => { const n = Math.max(60, i * maxN / 80); return `${X(n).toFixed(1)} ${Y(power(d, n)).toFixed(1)}`; });
    const endP = power(d, maxN);
    return `<path d="M${pts.join('L')}" fill="none" stroke="${k(c)}" stroke-width="3"/>${text(right + 16, Y(endP) + 4, tr(`${fmt(d * 100)} ${d * 100 === 1 ? 'point' : 'points'}`, `${fmt(d * 100)} poin`), { anchor: 'start', fill: k(c), weight: 700, size: 13 })}`;
  }).join('');
  const grid = [0, 0.25, 0.5, 0.75, 1].map(p => `${line(left, Y(p), right, Y(p), { c: 'var(--line)', w: 1 })}${text(left - 8, Y(p) + 4, pct(p, 0), { anchor: 'end', size: 12 })}`).join('');
  const xt = [0, 4000, 8000, 12000, 16000].map(n => `${line(X(n), base, X(n), base + 5, { c: 'var(--muted)', w: 1.4 })}${text(X(n), base + 20, fmt(n), { size: 12 })}`).join('');
  const target = `${line(left, Y(0.8), right, Y(0.8), { c: 'var(--ink)', w: 1.6, dash: '6 5' })}${text(X(8000), Y(0.8) - 6, tr('80% power', 'power 80%'), { ...ink, size: 12 })}`;
  const mark = (n, anchor, dx, dy) => `${dot(X(n), Y(power(0.02, n)), 'var(--ink)', 5.5)}${text(X(n) + dx, Y(power(0.02, n)) + dy, tr(`${fmt(n)} per group: ${pct(power(0.02, n), 0)}`, `${fmt(n)} per grup: ${pct(power(0.02, n), 0)}`), { anchor, ...bold, size: 12 })}`;
  const head = text(left - 48, 16, tr('Power to detect a true lift over a 10% purchase rate', 'Power untuk mendeteksi kenaikan sebenarnya dari tingkat beli 10%'), { anchor: 'start', ...bold, size: 13 });
  const foot = text((left + right) / 2, 236, tr('visitors in each group', 'pengunjung di tiap grup'), { size: 13, ...ink });
  return svg(640, 246, `${head}${grid}${target}${curves}${mark(2000, 'start', 10, 4)}${mark(3834, 'start', 10, 20)}${line(left, base, right, base, { c: 'var(--muted)', w: 1.6 })}${xt}${foot}`);
}

// ---- Figure 4: the chance of at least one false positive when nothing is real. ----
const LOOKS = [1, 2, 5, 10, 20];
const PEEK_RATES = [0.05, 0.083, 0.142, 0.194, 0.248];     // offline simulation, see the header comment
function falsePositives() {
  const left = 56, right = 624, base = 206, top = 52;
  const maxV = 0.7;
  const Y = v => base - v / maxV * (base - top);
  const slot = (right - left) / LOOKS.length, bw = 40;
  const grid = [0, 0.2, 0.4, 0.6].map(v => `${line(left, Y(v), right, Y(v), { c: 'var(--line)', w: 1 })}${text(left - 8, Y(v) + 4, pct(v, 0), { anchor: 'end', size: 12 })}`).join('');
  const bars = LOOKS.map((m, i) => {
    const cx = left + slot * (i + 0.5);
    const indep = 1 - 0.95 ** m, peek = PEEK_RATES[i];
    const bar = (x, v, c) => `<rect x="${(x - bw / 2).toFixed(1)}" y="${Y(v).toFixed(1)}" width="${bw}" height="${(base - Y(v)).toFixed(1)}" rx="3" fill="${k(c)}"/>${text(x, Y(v) - 6, pct(v, 0), { ...bold, size: 12 })}`;
    return `${bar(cx - bw / 2 - 2, peek, 0)}${bar(cx + bw / 2 + 2, indep, 1)}${text(cx, base + 20, fmt(m), { ...bold, size: 14 })}`;
  }).join('');
  const target = `${line(left, Y(0.05), right, Y(0.05), { c: 'var(--ink)', w: 1.6, dash: '6 5' })}`;
  const legend = `<rect x="${left}" y="10" width="14" height="14" rx="3" fill="${k(0)}"/>${text(left + 20, 22, tr('one test, checked this many times', 'satu uji, dicek sebanyak ini'), { anchor: 'start', ...ink, size: 12 })}
<rect x="${left + 252}" y="10" width="14" height="14" rx="3" fill="${k(1)}"/>${text(left + 272, 22, tr('this many separate tests', 'sebanyak ini uji terpisah'), { anchor: 'start', ...ink, size: 12 })}`;
  const foot = text((left + right) / 2, 246, tr('number of looks, or number of tests (the dashed line is the intended 5%)', 'jumlah pengecekan, atau jumlah uji (garis putus-putus adalah target 5%)'), { size: 12, ...ink });
  return svg(640, 256, `${legend}${grid}${target}${bars}${line(left, base, right, base, { c: 'var(--muted)', w: 1.6 })}${foot}`);
}

export const figures = {
  'random-assignment': randomAssignment,
  'null-and-interval': nullAndInterval,
  'power-curves': powerCurves,
  'false-positives': falsePositives,
};
