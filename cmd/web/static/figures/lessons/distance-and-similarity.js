// Figures for the lesson "Distance and similarity".
import { svg, dot, text, line, box, k, diamond, tr, fmt } from '../kit.js';

// The four distances between the same two points, A = (3, 3) and B = (7, 6), one panel each.
function fourDistances() {
  const U = 21;                                    // pixels per grid unit
  const grid = (ox, oy) => {
    const X = x => ox + 22 + x * U, Y = y => oy + 192 - y * U;
    let g = '';
    for (let i = 0; i <= 8; i++) g += line(X(i), Y(0), X(i), Y(7), { c: 'var(--line)', w: 1 });
    for (let j = 0; j <= 7; j++) g += line(X(0), Y(j), X(8), Y(j), { c: 'var(--line)', w: 1 });
    g += line(X(0), Y(0), X(8.4), Y(0), { c: 'var(--muted)', w: 1.6 }) + line(X(0), Y(0), X(0), Y(7.4), { c: 'var(--muted)', w: 1.6 });
    return { X, Y, g };
  };
  const points = (X, Y, aLabel = [-10, -9]) => `${dot(X(3), Y(3), k(0), 7)}${text(X(3) + aLabel[0], Y(3) + aLabel[1], 'A', { weight: 700, fill: 'var(--ink)' })}${dot(X(7), Y(6), k(1), 7)}${text(X(7) + 12, Y(6) - 8, 'B', { weight: 700, fill: 'var(--ink)' })}`;
  // The column right of the grid is only ~95 units wide, so a long headline (translations run longer than
  // English) wraps onto two lines at its space instead of running out of the card; the extra line sits above.
  const wrap = head => { const i = head.length > 11 ? head.indexOf(' ') : -1; return i > 0 ? [head.slice(0, i), head.slice(i + 1)] : [head]; };
  const side = (ox, oy, head, rows) => `${wrap(head).map((h, i, a) => text(ox + 218, oy + 62 - (a.length - 1 - i) * 18, h, { anchor: 'start', weight: 700, fill: 'var(--ink)', size: 13 })).join('')}${rows.map((r, i) => text(ox + 218, oy + 84 + i * 20, r, { anchor: 'start', size: 13, fill: i === rows.length - 1 ? 'var(--ink)' : 'var(--muted)', weight: i === rows.length - 1 ? 700 : 500 })).join('')}`;
  const panel = (ox, oy, title, body, headline, rows, aLabel) => {
    const { X, Y, g } = grid(ox, oy);
    return `${box(ox + 4, oy + 4, 312, 213)}${text(ox + 18, oy + 25, title, { anchor: 'start', weight: 700, fill: 'var(--ink)', size: 15 })}${g}${body(X, Y)}${points(X, Y, aLabel)}${side(ox, oy, headline, rows)}`;
  };
  const legs = (X, Y) => `${text((X(3) + X(7)) / 2, Y(3) + 16, fmt(4), { fill: 'var(--ink)' })}${text(X(7) + 10, (Y(3) + Y(6)) / 2 + 4, fmt(3), { anchor: 'start', fill: 'var(--ink)' })}`;
  // Cosine panel: arrows from the origin to A and to B, the thin angle between them filled in and labeled.
  const cos = (X, Y) => {
    const r = 135, a1 = Math.atan2(3, 3), a2 = Math.atan2(6, 7), mid = (a1 + a2) / 2;
    const p = (a, d) => [X(0) + d * Math.cos(a), Y(0) - d * Math.sin(a)];
    const f = ([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`;
    // Stop each arrow a little short of its point so the head sits on the ray, clear of the dot.
    const tip = (x, y) => { const L = Math.hypot(x - X(0), y - Y(0)); return [X(0) + (x - X(0)) * (L - 11) / L, Y(0) + (y - Y(0)) * (L - 11) / L]; };
    const tA = tip(X(3), Y(3)), tB = tip(X(7), Y(6));
    const label = [p(a1, 150)[0] - 8, p(a1, 150)[1] - 12], from = [label[0] + 2, label[1] + 4], to = p(mid, r - 2);
    return `<path d="M${X(0)} ${Y(0)}L${f(p(a1, r))}A${r} ${r} 0 0 1 ${f(p(a2, r))}Z" fill="${k(3)}" fill-opacity="0.6" stroke="${k(3)}" stroke-width="1.6" stroke-linejoin="round"/>${line(from[0], from[1], to[0], to[1], { c: 'var(--ink)', w: 1.2 })}${text(label[0], label[1], `${fmt(4.4)}°`, { anchor: 'end', fill: 'var(--ink)', weight: 700, size: 13 })}${line(X(0), Y(0), tA[0], tA[1], { c: k(0), w: 2.5, arrow: true })}${line(X(0), Y(0), tB[0], tB[1], { c: k(1), w: 2.5, arrow: true })}${dot(X(0), Y(0), 'var(--ink)', 4)}`;
  };
  return svg(640, 450, [
    panel(0, 0, tr('Euclidean', 'Euclidean'), (X, Y) => `${line(X(3), Y(3), X(7), Y(3), { c: 'var(--muted)', w: 1.6, dash: '4 4' })}${line(X(7), Y(3), X(7), Y(6), { c: 'var(--muted)', w: 1.6, dash: '4 4' })}${line(X(3), Y(3), X(7), Y(6), { c: k(0), w: 3.5 })}${legs(X, Y)}`, tr('straight line', 'garis lurus'), [`√(${fmt(4)}² + ${fmt(3)}²)`, `= √${fmt(25)}`, `= ${fmt(5)}`]),
    panel(320, 0, 'Manhattan', (X, Y) => `${line(X(3), Y(3), X(7), Y(3), { c: k(1), w: 3.5 })}${line(X(7), Y(3), X(7), Y(6), { c: k(1), w: 3.5 })}${legs(X, Y)}`, tr('city blocks', 'blok kota'), [`${fmt(4)} + ${fmt(3)}`, `= ${fmt(7)}`]),
    panel(0, 225, 'Chebyshev', (X, Y) => `${line(X(3), Y(3), X(7), Y(3), { c: k(2), w: 5 })}${line(X(7), Y(3), X(7), Y(6), { c: 'var(--muted)', w: 1.6, dash: '4 4' })}${legs(X, Y)}`, tr('biggest gap', 'selisih terbesar'), [`max(${fmt(4)}, ${fmt(3)})`, `= ${fmt(4)}`]),
    panel(320, 225, tr('Cosine', 'Cosine'), cos, tr('only the angle', 'hanya sudutnya'), [tr(`about ${fmt(4.4)}°`, `sekitar ${fmt(4.4)}°`), `1 − cos(${fmt(4.4)}°)`, `≈ ${fmt(0.003)}`], [-17, -11]),
  ].join(''));
}

// The set of points at distance 3 from A under each distance, with one test point P two steps right and two up.
function shapesAtR() {
  const U = 18, W = 170;
  const panel = (i, name, shape, dLabel, verdict, inside) => {
    const ox = i * W, cx = ox + W / 2, cy = 94;
    const P = [cx + 2 * U, cy - 2 * U];
    return `${box(ox + 3, 4, W - 6, 212)}${text(cx, 24, name, { weight: 700, fill: 'var(--ink)', size: 14 })}${shape(cx, cy)}
${line(cx, cy, P[0], P[1], { c: 'var(--muted)', w: 1.4, dash: '3 3' })}${dot(P[0], P[1], inside ? k(2) : k(1), 5.5)}${text(P[0] + 7, P[1] - 3, 'P', { anchor: 'start', fill: 'var(--ink)', weight: 700, size: 13 })}${diamond(cx, cy, k(0), 7)}${text(cx - 13, cy + 18, 'A', { fill: 'var(--ink)', weight: 700 })}
${text(cx, 168, dLabel, { fill: 'var(--ink)', size: 13 })}${text(cx, 188, verdict, { weight: 700, fill: inside ? k(2) : k(1), size: 13 })}`;
  };
  const circle = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="${3 * U}" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2.4"/>`;
  const diam = (cx, cy) => `<path d="M${cx + 3 * U} ${cy}L${cx} ${cy - 3 * U}L${cx - 3 * U} ${cy}L${cx} ${cy + 3 * U}Z" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2.4" stroke-linejoin="round"/>`;
  const sq = (cx, cy) => `<rect x="${cx - 3 * U}" y="${cy - 3 * U}" width="${6 * U}" height="${6 * U}" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2.4"/>`;
  const cone = (cx, cy) => {
    const ox = cx - 50, oy = 128, r = 95, a1 = 22 * Math.PI / 180, a2 = 62 * Math.PI / 180;
    const p = (a, d) => `${ox + d * Math.cos(a)} ${oy - d * Math.sin(a)}`;
    const mid = 42 * Math.PI / 180;
    return `<path d="M${ox} ${oy}L${p(a1, r)}L${p(a2, r)}Z" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 4"/>${line(ox, oy, ox + 110 * Math.cos(mid), oy - 110 * Math.sin(mid), { c: 'var(--muted)', w: 1.4 })}${dot(ox + 34 * Math.cos(mid), oy - 34 * Math.sin(mid), k(2), 5.5)}${dot(ox + 90 * Math.cos(mid), oy - 90 * Math.sin(mid), k(2), 5.5)}${dot(ox, oy, 'var(--ink)', 4)}${text(ox - 8, oy + 15, tr('origin', 'titik asal'), { size: 11, anchor: 'start' })}`;
  };
  const cosPanel = `${box(3 * W + 3, 4, W - 6, 212)}${text(3 * W + W / 2, 24, tr('Cosine', 'Cosine'), { weight: 700, fill: 'var(--ink)', size: 14 })}${cone(3 * W + W / 2, 92)}${text(3 * W + W / 2, 168, tr('same ray: distance 0', 'satu arah: jarak 0'), { fill: 'var(--ink)', size: 13 })}${text(3 * W + W / 2, 188, tr('a cone of directions', 'kerucut arah'), { weight: 700, fill: k(2), size: 13 })}`;
  return svg(680, 220, [
    panel(0, tr('Euclidean', 'Euclidean'), circle, tr(`P is ${fmt(2.83)} from A`, `Jarak P ke A: ${fmt(2.83)}`), tr('inside the circle', 'di dalam lingkaran'), true),
    panel(1, 'Manhattan', diam, tr(`P is ${fmt(4)} from A`, `Jarak P ke A: ${fmt(4)}`), tr('outside the diamond', 'di luar belah ketupat'), false),
    panel(2, 'Chebyshev', sq, tr(`P is ${fmt(2)} from A`, `Jarak P ke A: ${fmt(2)}`), tr('inside the square', 'di dalam persegi'), true),
    cosPanel,
  ].join(''));
}

// One query Q and the same scatter, measured two ways: the nearest point changes.
function nearestChanges() {
  const U = 40, W = 320, cy = 150;
  const others = [[-2.6, 1.0], [-1.2, -2.8], [0.8, 2.7], [3.0, -1.5]];
  const panel = (i, title, shape, near, lines) => {
    const cx = i * W + W / 2, S = ([x, y]) => [cx + x * U, cy - y * U];
    const p1 = S([2, 0]), p2 = S([1.6, 1.6]);
    return `${box(i * W + 3, 4, W - 6, 300)}${text(cx, 26, title, { weight: 700, fill: 'var(--ink)', size: 15 })}${shape(cx, cy)}
${others.map(o => { const s = S(o); return dot(s[0], s[1], 'var(--muted)', 5); }).join('')}
${dot(p1[0], p1[1], near === 1 ? k(2) : 'var(--muted)', near === 1 ? 7.5 : 5.5)}${text(p1[0] + 9, p1[1] + 5, 'P1', { anchor: 'start', fill: 'var(--ink)', weight: 700 })}
${dot(p2[0], p2[1], near === 2 ? k(2) : 'var(--muted)', near === 2 ? 7.5 : 5.5)}${text(p2[0] + 9, p2[1] - 7, 'P2', { anchor: 'start', fill: 'var(--ink)', weight: 700 })}
${diamond(cx, cy, k(0), 8)}${text(cx - 12, cy + 20, 'Q', { fill: 'var(--ink)', weight: 700 })}
${lines.map(l => text(cx, 282, l, { size: 13, fill: 'var(--ink)', weight: 700 })).join('')}`;
  };
  const growCircle = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="${2 * U}" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2.4"/>`;
  const growSquare = (cx, cy) => `<rect x="${cx - 1.6 * U}" y="${cy - 1.6 * U}" width="${3.2 * U}" height="${3.2 * U}" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2.4"/>`;
  return svg(640, 310, [
    panel(0, tr('Euclidean: P1 is nearest', 'Euclidean: P1 paling dekat'), growCircle, 1, [`P1 = ${fmt(2, { digits: 2 })}, P2 = ${fmt(2.26, { digits: 2 })}`]),
    panel(1, tr('Chebyshev: P2 is nearest', 'Chebyshev: P2 paling dekat'), growSquare, 2, [`P1 = ${fmt(2, { digits: 2 })}, P2 = ${fmt(1.6, { digits: 2 })}`]),
  ].join(''));
}

export const figures = { 'four-distances': fourDistances, 'shapes-at-r': shapesAtR, 'nearest-changes': nearestChanges };
