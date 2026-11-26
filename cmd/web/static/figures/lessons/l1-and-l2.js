// Figures for the lesson "L1 and L2". Every curve is computed here from numbers that come from the
// bundled penguins table (data/penguins.csv), so the lesson text, the figures and a learner's own
// check all agree.
//
// Setup of the "paths" figure and of the table in the lesson: the 333 penguins that have bill length,
// bill depth, flipper length, sex and body mass; features are standardised (mean 0, standard
// deviation 1; sex is 1 for male, 0 for female); body mass is in kilograms and centred. The loss is
// mean squared error + lambda × penalty. PATH_C holds the correlations between the four features and
// PATH_CY their correlations with body mass times the standard deviation of body mass (0.804 kg), so
// the fit needs no raw data here.
//
// Setup of the "choose-lambda" figure: 20 random penguins (sims/ml/rng.js, seed 1) train a model on
// 14 columns (the four features, their squares and their products); 200 other penguins validate it.
// CHOOSE holds the resulting mean squared errors in kg squared; they were computed with the same
// ridge and lasso code as above (sims/ml/regularize.js), standardising on the 20 training penguins
// only. The lasso cells were run to convergence (iters 5e6, tol 1e-13): the default iters = 2000
// returns half-finished coordinate descent for lambda <= 0.003 on this data (converged = false).
import { svg, dot, ring, text, line, box, k, soft, tr, fmt } from '../kit.js';

const ink = { fill: 'var(--ink)' };
const bold = { fill: 'var(--ink)', weight: 700 };

// ---------------------------------------------------------------------------------------------
// Figure 1: what each penalty does to one coefficient, when features are uncorrelated.
// ---------------------------------------------------------------------------------------------
const LAMBDA_DEMO = 0.8;
const ridgeRule = b => b / (1 + LAMBDA_DEMO);
const lassoRule = b => Math.sign(b) * Math.max(Math.abs(b) - LAMBDA_DEMO / 2, 0);

function shrinkRules() {
  const ox = 44, oy = 14, S = 264, half = 1, u = S / (2 * half);
  const X = v => ox + (v + half) * u, Y = v => oy + S - (v + half) * u;
  const curve = fn => {
    const pts = [];
    for (let i = 0; i <= 80; i++) { const v = -half + (2 * half * i) / 80; pts.push(`${i ? 'L' : 'M'}${X(v).toFixed(1)} ${Y(fn(v)).toFixed(1)}`); }
    return `<path d="${pts.join('')}" fill="none" stroke-width="3" stroke-linejoin="round"`;
  };
  const ticks = [-1, -0.5, 0, 0.5, 1].map(t => `${text(X(t), oy + S + 17, fmt(t), { size: 12 })}${text(ox - 8, Y(t) + 4, fmt(t), { anchor: 'end', size: 12 })}`).join('');
  const strong = 0.7, weak = 0.3;
  const marks = [strong, weak].map(b => `${line(X(b), Y(0), X(b), Y(ridgeRule(b)), { c: 'var(--line)', w: 1.5, dash: '3 4' })}
${dot(X(b), Y(ridgeRule(b)), k(0), 5)}${dot(X(b), Y(lassoRule(b)), k(1), 5)}`).join('');
  const plot = `${box(ox, oy, S, S)}
${line(X(0), oy, X(0), oy + S, { c: 'var(--line)', w: 1.5 })}${line(ox, Y(0), ox + S, Y(0), { c: 'var(--line)', w: 1.5 })}
${line(X(-half), Y(-half), X(half), Y(half), { c: 'var(--muted)', w: 2, dash: '6 5' })}
${curve(ridgeRule)} stroke="${k(0)}"/>${curve(lassoRule)} stroke="${k(1)}"/>
${marks}${ticks}
${text(ox + S / 2, oy + S + 36, tr('Coefficient without a penalty', 'Koefisien tanpa penalti'), { size: 13, ...ink })}
<text transform="translate(12 ${oy + S / 2}) rotate(-90)" text-anchor="middle" font-size="13" font-weight="500" fill="var(--ink)">${tr('Coefficient with the penalty', 'Koefisien dengan penalti')}</text>`;

  const lx = 344;
  const legend = [
    [line(lx, 34, lx + 26, 34, { c: 'var(--muted)', w: 2, dash: '6 5' }), tr('No penalty', 'Tanpa penalti')],
    [line(lx, 62, lx + 26, 62, { c: k(0), w: 3 }), tr(`Ridge (L2): divide by ${fmt(1 + LAMBDA_DEMO)}`, `Ridge (L2): bagi dengan ${fmt(1 + LAMBDA_DEMO)}`)],
    [line(lx, 90, lx + 26, 90, { c: k(1), w: 3 }), tr(`Lasso (L1): subtract ${fmt(LAMBDA_DEMO / 2)}, stop at 0`, `Lasso (L1): kurangi ${fmt(LAMBDA_DEMO / 2)}, berhenti di 0`)],
  ].map(([mark, label], i) => `${mark}${text(lx + 36, 38 + i * 28, label, { anchor: 'start', size: 13, ...ink })}`).join('');
  const row = (y, b) => `${text(lx, y, tr(`A coefficient of ${fmt(b, { digits: 2 })}:`, `Koefisien ${fmt(b, { digits: 2 })}:`), { anchor: 'start', size: 13, ...bold })}
${dot(lx + 8, y + 20, k(0), 5)}${text(lx + 22, y + 24, tr(`ridge gives ${fmt(ridgeRule(b), { digits: 2 })}`, `ridge menghasilkan ${fmt(ridgeRule(b), { digits: 2 })}`), { anchor: 'start', size: 13, ...ink })}
${dot(lx + 8, y + 42, k(1), 5)}${text(lx + 22, y + 46, lassoRule(b) === 0 ? tr('lasso gives exactly 0', 'lasso menghasilkan tepat 0') : tr(`lasso gives ${fmt(lassoRule(b), { digits: 2 })}`, `lasso menghasilkan ${fmt(lassoRule(b), { digits: 2 })}`), { anchor: 'start', size: 13, ...ink })}`;
  const note = `${text(lx, 278, tr(`Penalty strength lambda = ${fmt(LAMBDA_DEMO)}.`, `Kekuatan penalti lambda = ${fmt(LAMBDA_DEMO)}.`), { anchor: 'start', size: 12 })}
${text(lx, 296, tr('Features uncorrelated and standardised.', 'Fitur tidak berkorelasi dan sudah distandarkan.'), { anchor: 'start', size: 12 })}`;
  return svg(640, 324, `${plot}${legend}${row(128, strong)}${row(196, weak)}${note}`);
}

// ---------------------------------------------------------------------------------------------
// Figure 2: the geometry. Loss contours (ellipses) around the unpenalised fit, and the region the
// penalty allows: a circle for L2, a diamond for L1. The answer is where the loss is smallest inside.
// ---------------------------------------------------------------------------------------------
const GEO = { fit: [1.0, 0.25], a: 0.4, t: 0.6, levels: [0.1, 0.6] };
// loss(b) = d' A d with A = [[1, a], [a, 1]] and d = b - fit
const geoLoss = b => {
  const d1 = b[0] - GEO.fit[0], d2 = b[1] - GEO.fit[1];
  return d1 * d1 + d2 * d2 + 2 * GEO.a * d1 * d2;
};
// The smallest loss on the edge of the region, found by walking around it in small steps.
function bestOnEdge(edgePoint, n = 4000) {
  let best = null;
  for (let i = 0; i < n; i++) {
    const p = edgePoint(i / n);
    const l = geoLoss(p);
    if (!best || l < best.l) best = { p, l };
  }
  return best;
}
const circlePoint = s => [GEO.t * Math.cos(2 * Math.PI * s), GEO.t * Math.sin(2 * Math.PI * s)];
const diamondPoint = s => {
  const q = (s * 4) % 4, side = Math.floor(q), f = q - side, t = GEO.t;
  const corners = [[t, 0], [0, t], [-t, 0], [0, -t]];
  const a = corners[side], b = corners[(side + 1) % 4];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
};
// One ellipse of the loss, as an SVG path: fit + R diag(sqrt(level / eigenvalue)) (cos, sin).
function ellipse(level, X, Y) {
  const e1 = 1 + GEO.a, e2 = 1 - GEO.a, r1 = Math.sqrt(level / e1), r2 = Math.sqrt(level / e2), c = Math.SQRT1_2;
  const pts = [];
  for (let i = 0; i <= 90; i++) {
    const th = (2 * Math.PI * i) / 90, p = r1 * Math.cos(th), q = r2 * Math.sin(th);
    const b1 = GEO.fit[0] + c * p - c * q, b2 = GEO.fit[1] + c * p + c * q;
    pts.push(`${i ? 'L' : 'M'}${X(b1).toFixed(1)} ${Y(b2).toFixed(1)}`);
  }
  return `${pts.join('')}Z`;
}

let geoPanels = 0;
function geoPanel(ox, kind) {
  const oy = 30, S = 280, lim = 1.4, u = S / (2 * lim);
  const X = v => ox + (v + lim) * u, Y = v => oy + S - (v + lim) * u;
  const id = `l1l2-geo-${++geoPanels}`;
  const isL1 = kind === 'l1';
  const best = bestOnEdge(isL1 ? diamondPoint : circlePoint);
  const t = GEO.t;
  const region = isL1
    ? `<path d="M${X(t)} ${Y(0)}L${X(0)} ${Y(t)}L${X(-t)} ${Y(0)}L${X(0)} ${Y(-t)}Z" fill="${soft(2)}" stroke="${k(2)}" stroke-width="2.5" stroke-linejoin="round"/>`
    : `<circle cx="${X(0)}" cy="${Y(0)}" r="${t * u}" fill="${soft(2)}" stroke="${k(2)}" stroke-width="2.5"/>`;
  const contours = GEO.levels.map(l => `<path d="${ellipse(l, X, Y)}" fill="none" stroke="var(--muted)" stroke-width="1.4" stroke-dasharray="5 4"/>`).join('');
  const hit = `<path d="${ellipse(best.l, X, Y)}" fill="none" stroke="${k(1)}" stroke-width="2.5"/>`;
  const sol = best.p;
  const title = isL1
    ? tr('Lasso (L1): a diamond', 'Lasso (L1): belah ketupat')
    : tr('Ridge (L2): a circle', 'Ridge (L2): lingkaran');
  const verdict = isL1
    ? [tr('Touches a corner:', 'Menyentuh sudut:'), tr('coefficient 2 is exactly 0', 'koefisien 2 tepat 0')]
    : [tr('Touches the edge:', 'Menyentuh tepi:'), tr('both coefficients stay above 0', 'kedua koefisien tetap di atas 0')];
  return `<clipPath id="${id}"><rect x="${ox}" y="${oy}" width="${S}" height="${S}" rx="10"/></clipPath>
${text(ox + S / 2, 18, title, { size: 13, ...bold })}
${box(ox, oy, S, S)}
<g clip-path="url(#${id})">${contours}${region}${hit}
${line(X(0), oy, X(0), oy + S, { c: 'var(--line)', w: 1.5 })}${line(ox, Y(0), ox + S, Y(0), { c: 'var(--line)', w: 1.5 })}</g>
${dot(X(GEO.fit[0]), Y(GEO.fit[1]), 'var(--ink)', 5)}${text(X(GEO.fit[0]) + 24, Y(GEO.fit[1]) - 30, tr('no penalty', 'tanpa penalti'), { anchor: 'end', size: 12, ...ink })}
${ring(X(sol[0]), Y(sol[1]), k(1), 7)}
${text(ox + S - 8, oy + S - 8, tr('Coefficient 1', 'Koefisien 1'), { anchor: 'end', size: 12 })}${text(ox + 8, oy + 16, tr('Coefficient 2', 'Koefisien 2'), { anchor: 'start', size: 12 })}
${text(ox + S / 2, oy + S + 20, verdict[0], { size: 13, ...bold })}${text(ox + S / 2, oy + S + 38, verdict[1], { size: 13, ...ink })}`;
}

function geometry() {
  return svg(640, 360, `${geoPanel(10, 'l2')}${geoPanel(350, 'l1')}`);
}

// ---------------------------------------------------------------------------------------------
// Figure 3: coefficient paths as lambda grows, on the penguins (four standardised features).
// ---------------------------------------------------------------------------------------------
const FEATURES = [
  { en: 'Bill length', id: 'Panjang paruh' },
  { en: 'Bill depth', id: 'Kedalaman paruh' },
  { en: 'Flipper length', id: 'Panjang sirip' },
  { en: 'Male (1) or female (0)', id: 'Jantan (1) atau betina (0)' },
];
const PATH_C = [
  [1, -0.228626, 0.653096, 0.344078],
  [-0.228626, 1, -0.577792, 0.372673],
  [0.653096, -0.577792, 1, 0.255169],
  [0.344078, 0.372673, 0.255169, 1],
];
const PATH_CY = [0.473922, -0.379503, 0.70188, 0.341692];

function solveSystem(A, b) {
  const m = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let i = 0; i < m; i++) {
    let p = i;
    for (let r = i + 1; r < m; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
    [M[i], M[p]] = [M[p], M[i]];
    for (let r = 0; r < m; r++) {
      if (r === i) continue;
      const f = M[r][i] / M[i][i];
      for (let c = i; c <= m; c++) M[r][c] -= f * M[i][c];
    }
  }
  return M.map((r, i) => r[m] / r[i]);
}
// Minimise  mean squared error + lambda * sum(b^2).
const ridgeFit = lambda => solveSystem(PATH_C.map((r, i) => r.map((v, j) => v + (i === j ? lambda : 0))), PATH_CY);
// Minimise  mean squared error + lambda * sum(|b|), one coefficient at a time until nothing moves.
function lassoFit(lambda) {
  const b = [0, 0, 0, 0];
  for (let it = 0; it < 600; it++) {
    for (let j = 0; j < 4; j++) {
      const r = PATH_CY[j] - PATH_C[j].reduce((s, v, i) => s + (i === j ? 0 : v * b[i]), 0);
      b[j] = Math.sign(r) * Math.max(Math.abs(r) - lambda / 2, 0);
    }
  }
  return b;
}

function paths() {
  const LMAX = 1.5, steps = 60, ymin = -0.3, ymax = 0.8;
  const S = 250, h = 240, oy = 86;
  const panel = (ox, fit, title) => {
    const X = v => ox + (v / LMAX) * S, Y = v => oy + h - ((v - ymin) / (ymax - ymin)) * h;
    const series = FEATURES.map(() => []);
    for (let i = 0; i <= steps; i++) { const l = (LMAX * i) / steps, b = fit(l); b.forEach((v, j) => series[j].push([l, v])); }
    const curves = series.map((pts, j) => `<path d="${pts.map(([l, v], i) => `${i ? 'L' : 'M'}${X(l).toFixed(1)} ${Y(v).toFixed(1)}`).join('')}" fill="none" stroke="${k(j)}" stroke-width="2.8" stroke-linejoin="round"/>`).join('');
    const xt = [0, 0.5, 1, 1.5].map(t => `${text(X(t), oy + h + 16, fmt(t), { size: 12 })}`).join('');
    const yt = [-0.2, 0, 0.2, 0.4, 0.6, 0.8].map(t => `${line(ox, Y(t), ox + S, Y(t), { c: t === 0 ? 'var(--muted)' : 'var(--line)', w: t === 0 ? 1.6 : 1, dash: t === 0 ? '' : '2 4' })}${text(ox - 7, Y(t) + 4, fmt(t, { digits: 1 }), { anchor: 'end', size: 12 })}`).join('');
    return `${text(ox + S / 2, oy - 12, title, { size: 14, ...bold })}
${box(ox, oy, S, h, 'var(--surface)', 'var(--line)')}${yt}${curves}${xt}
${text(ox + S / 2, oy + h + 34, tr('Penalty strength lambda', 'Kekuatan penalti lambda'), { size: 12, ...ink })}`;
  };
  const lassoPanelX = 370;
  const lassoX = v => lassoPanelX + (v / LMAX) * S, lassoY = v => oy + h - ((v - ymin) / (ymax - ymin)) * h;
  // Where each lasso coefficient first becomes exactly zero (found by bisection on the same fit).
  const zeros = FEATURES.map((_, j) => {
    let lo = 0.0, hi = 2;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (Math.abs(lassoFit(mid)[j]) > 1e-7) lo = mid; else hi = mid; }
    return hi;
  });
  const rings = zeros.map((z, j) => ring(lassoX(z), lassoY(0), k(j), 5)).join('');
  // A two-row key above the panels.
  const keyRows = FEATURES.map((f, j) => {
    const col = j % 2, row = Math.floor(j / 2), x = 70 + col * 270, y = 12 + row * 22;
    return `${line(x, y, x + 24, y, { c: k(j), w: 3 })}${text(x + 32, y + 4, tr(f.en, f.id), { anchor: 'start', size: 13, ...ink })}`;
  }).join('');
  return svg(640, 384, `${keyRows}${panel(46, ridgeFit, tr('Ridge (L2)', 'Ridge (L2)'))}${panel(lassoPanelX, lassoFit, tr('Lasso (L1)', 'Lasso (L1)'))}${rings}
${text(lassoPanelX + S - 6, lassoY(-0.12), tr('rings: reaches exactly 0', 'lingkaran: mencapai tepat 0'), { anchor: 'end', size: 12, ...ink })}`);
}

// ---------------------------------------------------------------------------------------------
// Figure 4: choosing lambda by validation error (ridge), 20 training penguins, 14 columns.
// ---------------------------------------------------------------------------------------------
// [lambda, training MSE, validation MSE (ridge), validation MSE (lasso), lasso columns kept]
const CHOOSE = [
  [0.0001, 0.043, 0.2109, 0.279, 11], [0.0003, 0.0509, 0.1819, 0.2405, 10], [0.001, 0.0605, 0.1723, 0.1687, 8],
  [0.003, 0.0683, 0.1645, 0.1586, 6], [0.01, 0.0757, 0.1544, 0.1515, 4], [0.03, 0.08, 0.1504, 0.1502, 4],
  [0.1, 0.0825, 0.1529, 0.1531, 3], [0.3, 0.0855, 0.1629, 0.1768, 3], [1, 0.0981, 0.1876, 0.4506, 1],
];

function chooseLambda() {
  const ox = 62, oy = 40, W = 540, H = 200, ymax = 0.25;
  const lo = Math.log10(0.0001), hi = Math.log10(1);
  const X = l => ox + ((Math.log10(l) - lo) / (hi - lo)) * W, Y = v => oy + H - (v / ymax) * H;
  const bestRow = CHOOSE.reduce((a, r) => (r[2] < a[2] ? r : a));
  const path = col => CHOOSE.map((r, i) => `${i ? 'L' : 'M'}${X(r[0]).toFixed(1)} ${Y(r[col]).toFixed(1)}`).join('');
  const yt = [0, 0.05, 0.1, 0.15, 0.2, 0.25].map(t => `${line(ox, Y(t), ox + W, Y(t), { c: 'var(--line)', w: 1, dash: '2 4' })}${text(ox - 8, Y(t) + 4, fmt(t, { digits: 2 }), { anchor: 'end', size: 12 })}`).join('');
  const xt = [0.0001, 0.001, 0.01, 0.1, 1].map(t => `${text(X(t), oy + H + 17, fmt(t, { max: 4 }), { size: 12 })}`).join('');
  const dots = col => CHOOSE.map(r => dot(X(r[0]), Y(r[col]), col === 1 ? k(0) : k(1), 4)).join('');
  const bx = X(bestRow[0]);
  return svg(640, 308, `${box(ox, oy, W, H)}${yt}${xt}
${line(bx, oy, bx, oy + H, { c: k(2), w: 2, dash: '5 4' })}
<path d="${path(1)}" fill="none" stroke="${k(0)}" stroke-width="3" stroke-linejoin="round"/>${dots(1)}
<path d="${path(2)}" fill="none" stroke="${k(1)}" stroke-width="3" stroke-linejoin="round"/>${dots(2)}
${ring(bx, Y(bestRow[2]), k(2), 7)}
${text(bx - 14, Y(0.128), tr('Lowest validation error', 'Galat validation terendah'), { anchor: 'end', size: 13, ...bold })}
${text(bx - 14, Y(0.103), tr(`${fmt(bestRow[2], { digits: 3 })} at lambda ${fmt(bestRow[0])}`, `${fmt(bestRow[2], { digits: 3 })} pada lambda ${fmt(bestRow[0])}`), { anchor: 'end', size: 13, ...bold })}
${text(ox + 8, oy + 18, tr('Too little penalty: overfits', 'Penalti terlalu kecil: overfitting'), { anchor: 'start', size: 12, ...ink })}
${text(ox + W - 8, oy + 18, tr('Too much: underfits', 'Terlalu besar: underfitting'), { anchor: 'end', size: 12, ...ink })}
${line(ox + 6, 16, ox + 30, 16, { c: k(1), w: 3 })}${text(ox + 38, 20, tr('Validation error (200 penguins)', 'Galat validation (200 penguin)'), { anchor: 'start', size: 13, ...ink })}
${line(ox + 290, 16, ox + 314, 16, { c: k(0), w: 3 })}${text(ox + 322, 20, tr('Training error (20 penguins)', 'Galat training (20 penguin)'), { anchor: 'start', size: 13, ...ink })}
${text(ox + W / 2, oy + H + 38, tr('Penalty strength lambda (log scale)', 'Kekuatan penalti lambda (skala log)'), { size: 12, ...ink })}
<text transform="translate(14 ${oy + H / 2}) rotate(-90)" text-anchor="middle" font-size="12" font-weight="500" fill="var(--ink)">${tr('Mean squared error (kg squared)', 'Mean squared error (kg kuadrat)')}</text>`);
}

export const figures = {
  'shrink-rules': shrinkRules,
  geometry,
  paths,
  'choose-lambda': chooseLambda,
};
