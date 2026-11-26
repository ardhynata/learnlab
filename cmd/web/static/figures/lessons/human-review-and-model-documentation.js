// Figures for the lesson "Human review and model documentation". The numbers are the lesson's own worked
// example: the one-line rule "4700 g or more is a Gentoo" on the 333 bundled penguins that have a body mass
// and a sex. BINS counts them by distance from 4700 g; every coverage, accuracy and system figure below is
// computed from those four rows.
import { svg, dot, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';

const BINS = [   // [penguins, rule right] for distance 0-99, 100-199, 200-399 and 400+ g from 4700 g
  [21, 13], [17, 11], [36, 27], [259, 252],
];
const TOTAL = BINS.reduce((s, b) => s + b[0], 0);          // 333
const RIGHT = BINS.reduce((s, b) => s + b[1], 0);          // 303
const ink = { fill: 'var(--ink)' };
const bold = { fill: 'var(--ink)', weight: 700 };

// The band that sends the first `rows` rows to a person: coverage and accuracy on the cases still decided.
function band(rows) {
  const sent = BINS.slice(0, rows).reduce((s, b) => s + b[0], 0);
  const sentRight = BINS.slice(0, rows).reduce((s, b) => s + b[1], 0);
  const decided = TOTAL - sent, right = RIGHT - sentRight;
  return { sent, decided, right, coverage: decided / TOTAL, accuracy: right / decided };
}

// ---- Figure 1: three checks that route a case to a person. ----
function reviewRoutes() {
  const w = 112, gap = 20, top = 30, h = 66;
  const steps = [
    [tr(['New', 'case'], ['Kasus', 'baru']), 0],
    [tr(['Outside', 'the range?'], ['Di luar', 'rentang?']), 1],
    [tr(['High stakes', 'or appeal?'], ['Stakes tinggi', 'atau banding?']), 1],
    [tr(['Score inside', 'the band?'], ['Skor di dalam', 'band?']), 1],
    [tr(['Model', 'decides'], ['Model', 'memutuskan']), 2],
  ];
  const cx = i => i * (w + gap) + w / 2;
  const boxes = steps.map(([lines, c], i) => {
    const x = i * (w + gap);
    return `${box(x, top, w, h, soft(c), k(c))}${text(cx(i), top + 28, lines[0], { ...bold, size: 13 })}${text(cx(i), top + 47, lines[1], { ...bold, size: 13 })}`;
  }).join('');
  const arrows = [0, 1, 2, 3].map(i => {
    const x1 = i * (w + gap) + w + 3, x2 = (i + 1) * (w + gap) - 3;
    const lab = i === 0 ? '' : text((x1 + x2) / 2, top - 7, tr('no', 'tidak'), { size: 12 });
    return `${line(x1, top + h / 2, x2, top + h / 2, { c: 'var(--muted)', w: 2, arrow: true })}${lab}`;
  }).join('');
  const personTop = 160, personH = 48, px = (w + gap), pw = 3 * w + 2 * gap;
  const person = `${box(px, personTop, pw, personH, soft(3), k(3))}${text(px + pw / 2, personTop + 29, tr('A person reviews and decides', 'Seorang manusia meninjau dan memutuskan'), { ...bold, size: 14 })}`;
  const down = [1, 2, 3].map(i => `${line(cx(i), top + h + 3, cx(i), personTop - 3, { c: 'var(--muted)', w: 2, arrow: true })}${text(cx(i) + 10, 132, tr('yes', 'ya'), { anchor: 'start', size: 12 })}`).join('');
  const note = text(320, 238, tr('Only the third check uses the model\'s score.', 'Hanya pemeriksaan ketiga yang memakai skor model.'), { ...ink, size: 13 });
  return svg(640, 252, `${boxes}${arrows}${down}${person}${note}`);
}

// ---- Figure 2: coverage against accuracy, one point per band width. ----
function coverageAccuracy() {
  const left = 66, right = 610, top = 28, bottom = 190;
  const xMin = 0.7, xMax = 1.0, yMin = 0.86, yMax = 1.0;
  const X = v => left + (v - xMin) / (xMax - xMin) * (right - left);
  const Y = v => bottom - (v - yMin) / (yMax - yMin) * (bottom - top);
  const pts = [
    [band(0), tr('No band', 'Tanpa band')],
    [band(1), tr(`${fmt(100)} g band`, `Band ${fmt(100)} g`)],
    [band(2), tr(`${fmt(200)} g band`, `Band ${fmt(200)} g`)],
    [band(3), tr(`${fmt(400)} g band`, `Band ${fmt(400)} g`)],
  ];
  const xt = [0.7, 0.8, 0.9, 1.0].map(v => `${line(X(v), bottom, X(v), bottom + 5, { c: 'var(--muted)', w: 1.5 })}${text(X(v), bottom + 20, pct(v, 0), { size: 12 })}`).join('');
  const yt = [0.9, 0.95, 1.0].map(v => `${line(left, Y(v), right, Y(v), { c: 'var(--line)', w: 1 })}${text(left - 8, Y(v) + 4, pct(v, 0), { anchor: 'end', size: 12 })}`).join('');
  const path = pts.map(([p], i) => `${i ? 'L' : 'M'}${X(p.coverage).toFixed(1)} ${Y(p.accuracy).toFixed(1)}`).join('');
  const curve = `<path d="${path}" stroke="var(--muted)" stroke-width="2" fill="none" stroke-dasharray="5 4"/>`;
  const marks = pts.map(([p, label], i) => {
    const x = X(p.coverage), y = Y(p.accuracy);
    const anchor = i === 0 ? 'end' : 'middle';
    const lx = i === 0 ? x + 8 : x;
    return `${dot(x.toFixed(1), y.toFixed(1), k(i === 0 ? 2 : 1), 7)}${text(lx, y + 24, label, { anchor, ...bold, size: 12 })}${text(lx, y + 40, `${pct(p.coverage, 0)} / ${pct(p.accuracy, 0)}`, { anchor, size: 12 })}`;
  }).join('');
  const axisTitle = text((left + right) / 2, 228, tr('Coverage: share of penguins the model decides', 'Coverage: porsi penguin yang diputuskan model'), { ...bold, size: 13 });
  const yTitle = text(left - 58, 16, tr('Accuracy on decided penguins', 'Accuracy pada penguin yang diputuskan'), { anchor: 'start', ...bold, size: 13 });
  const hint = `${line(right - 150, 46, right - 215, 46, { c: 'var(--muted)', w: 2, arrow: true })}${text(right - 146, 50, tr('wider band', 'band lebih lebar'), { anchor: 'start', size: 12 })}`;
  return svg(640, 240, `${yt}${xt}${curve}${marks}${axisTitle}${yTitle}${hint}`);
}

// ---- Figure 3: system accuracy for the 400 g band under four reviewer behaviors. ----
function reviewOutcomes() {
  const b = band(3);                                       // 74 sent, 259 decided, 252 right
  const reviewed = TOTAL - b.decided;                      // 74
  const modelRight = RIGHT - b.right;                      // 51 of the 74 reviewed that the rule gets right
  const reviewerRight = 70;                                // assumption in the lesson: about 95% of 74
  const system = reviewedRight => (b.right + reviewedRight) / TOTAL;
  const rows = [
    [tr('No review', 'Tanpa review'), RIGHT / TOTAL, 2],
    [tr('Reviewer accepts every suggestion', 'Reviewer menerima semua saran'), system(modelRight), 2],
    [tr('Reviewer accepts 8 of 10 suggestions', 'Reviewer menerima 8 dari 10 saran'), system(0.8 * modelRight + 0.2 * reviewerRight), 4],
    [tr('Reviewer judges each case alone', 'Reviewer menilai tiap kasus sendiri'), system(reviewerRight), 1],
  ];
  const left = 268, right = 614, top = 38, step = 42;
  const xMin = 0.88, xMax = 1.0;
  const X = v => left + (v - xMin) / (xMax - xMin) * (right - left);
  const ticks = [0.9, 0.95, 1.0].map(v => `${line(X(v), top - 14, X(v), top + 3 * step + 18, { c: 'var(--line)', w: 1 })}${text(X(v), top + 3 * step + 36, pct(v, 0), { size: 12 })}`).join('');
  const body = rows.map(([label, v, c], i) => {
    const y = top + i * step;
    return `${text(left - 14, y + 5, label, { anchor: 'end', ...ink, size: 12 })}${line(X(xMin), y, X(v), y, { c: soft(c), w: 3 })}${dot(X(v).toFixed(1), y, k(c), 8)}${text(X(v) + 14, y + 5, pct(v, 1), { anchor: 'start', ...bold, size: 13 })}`;
  }).join('');
  const head = text(14, 16, tr(`System accuracy on ${fmt(TOTAL)} penguins, ${fmt(400)} g band (${fmt(reviewed)} reviewed)`, `System accuracy pada ${fmt(TOTAL)} penguin, band ${fmt(400)} g (${fmt(reviewed)} ditinjau)`), { anchor: 'start', ...bold, size: 13 });
  return svg(640, 232, `${head}${ticks}${body}`);
}

export const figures = {
  'review-routes': reviewRoutes,
  'coverage-accuracy': coverageAccuracy,
  'review-outcomes': reviewOutcomes,
};
