// Figures for the "Lines and predictions" lesson. The penguin points are the 342 rows of
// data/penguins.csv that have both a flipper length (mm) and a body mass (g); the figures
// compute every count and residual from them, so the text and the pictures agree.
import { svg, dot, ring, text, line, k, tr, fmt } from '../kit.js';

const PENGUINS = '181,3750;186,3800;195,3250;193,3450;190,3650;181,3625;195,4675;193,3475;190,4250;186,3300;180,3700;182,3200;191,3800;198,4400;185,3700;195,3450;197,4500;184,3325;194,4200;174,3400;180,3600;189,3800;185,3950;180,3800;187,3800;183,3550;187,3200;172,3150;180,3950;178,3250;178,3900;188,3300;184,3900;195,3325;196,4150;190,3950;180,3550;181,3300;184,4650;182,3150;195,3900;186,3100;196,4400;185,3000;190,4600;182,3425;179,2975;190,3450;191,4150;186,3500;188,4300;190,3450;200,4050;187,2900;191,3700;186,3550;193,3800;181,2850;194,3750;185,3150;195,4400;185,3600;192,4050;184,2850;192,3950;195,3350;188,4100;190,3050;198,4450;190,3600;190,3900;196,3550;197,4150;190,3700;195,4250;191,3700;184,3900;187,3550;195,4000;189,3200;196,4700;187,3800;193,4200;191,3350;194,3550;190,3800;189,3500;189,3950;190,3600;202,3550;205,4300;185,3400;186,4450;187,3300;208,4300;190,3700;196,4350;178,2900;192,4100;192,3725;203,4725;183,3075;190,4250;193,2925;184,3550;199,3750;190,3900;181,3175;197,4775;198,3825;191,4600;193,3200;197,4275;191,3900;196,4075;188,2900;199,3775;189,3350;189,3325;187,3150;198,3500;176,3450;202,3875;186,3050;199,4000;191,3275;195,4300;191,3050;210,4000;190,3325;197,3500;193,3500;199,4475;187,3425;190,3900;191,3175;200,3975;185,3400;193,4250;193,3400;187,3475;188,3050;190,3725;192,3000;185,3650;190,4250;184,3475;195,3450;193,3750;187,3700;201,4000;211,4500;230,5700;210,4450;218,5700;215,5400;210,4550;211,4800;219,5200;209,4400;215,5150;214,4650;216,5550;214,4650;213,5850;210,4200;217,5850;210,4150;221,6300;209,4800;222,5350;218,5700;215,5000;213,4400;215,5050;215,5000;215,5100;216,4100;215,5650;210,4600;220,5550;222,5250;209,4700;207,5050;230,6050;220,5150;220,5400;213,4950;219,5250;208,4350;208,5350;208,3950;225,5700;210,4300;216,4750;222,5550;217,4900;210,4200;225,5400;213,5100;215,5300;210,4850;220,5300;210,4400;225,5000;217,4900;220,5050;208,4300;220,5000;208,4450;224,5550;208,4200;221,5300;214,4400;231,5650;219,4700;230,5700;214,4650;229,5800;220,4700;223,5550;216,4750;221,5000;221,5100;217,5200;216,4700;230,5800;209,4600;220,6000;215,4750;223,5950;212,4625;221,5450;212,4725;224,5350;212,4750;228,5600;218,4600;218,5300;212,4875;230,5550;218,4950;228,5400;212,4750;224,5650;214,4850;226,5200;216,4925;222,4875;203,4625;225,5250;219,4850;228,5600;215,4975;228,5500;216,4725;215,5500;210,4700;219,5500;208,4575;209,5500;216,5000;229,5950;213,4650;230,5500;217,4375;230,5850;217,4875;222,6000;214,4925;215,4850;222,5750;212,5200;213,5400;192,3500;196,3900;193,3650;188,3525;197,3725;198,3950;178,3250;197,3750;195,4150;198,3700;193,3800;194,3775;185,3700;201,4050;190,3575;201,4050;197,3300;181,3700;190,3450;195,4400;181,3600;191,3400;187,2900;193,3800;195,3300;197,4150;200,3400;200,3800;191,3700;205,4550;187,3200;201,4300;187,3350;203,4100;195,3600;199,3900;195,3850;210,4800;192,2700;205,4500;210,3950;187,3650;196,3550;196,3500;196,3675;201,4450;190,3400;212,4300;187,3250;198,3675;199,3325;201,3950;193,3600;203,4050;187,3350;197,3450;191,3250;203,4050;202,3800;194,3525;206,3950;189,3650;195,3650;207,4000;202,3400;193,3775;210,4100;198,3775'
  .split(';').map(p => p.split(',').map(Number));

const signed = v => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v));
const axes = (x0, x1, y0, y1) => `${line(x0, y0, x1, y0, { c: 'var(--muted)', w: 1.6 })}${line(x0, y0, x0, y1, { c: 'var(--muted)', w: 1.6 })}`;

// The taxi rule as a line: intercept, slope triangle and one prediction.
function lineAnatomy() {
  const X = v => 70 + v * 70, Y = v => 230 - v * 11.5;
  const fare = x => 2 * x + 3;
  const xticks = [0, 1, 2, 3, 4, 5, 6, 7].map(v => text(X(v), 248, fmt(v), { size: 12 })).join('');
  const yticks = [0, 5, 10, 15].map(v => text(62, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })).join('');
  return svg(640, 282, `${axes(70, 600, 230, 24)}${xticks}${yticks}
${text(335, 272, tr('distance (km)', 'jarak (km)'))}${text(8, 18, tr('fare', 'tarif'), { anchor: 'start' })}
${line(X(0), Y(fare(0)), X(7), Y(fare(7)), { c: k(0), w: 3.4 })}
${text(X(0) + 12, Y(16.2), 'y = 2x + 3', { anchor: 'start', size: 15, weight: 700, fill: 'var(--ink)' })}
${text(X(0) + 12, Y(14.4), tr('slope 2: each extra km adds 2', 'slope 2: tiap km tambahan menambah 2'), { anchor: 'start', fill: k(1), weight: 700 })}
${line(X(2), Y(7), X(3), Y(7), { c: k(1), w: 2.8 })}${line(X(3), Y(7), X(3), Y(9), { c: k(1), w: 2.8 })}
${text(X(2.5), Y(7) + 17, tr('run 1', 'geser 1'), { size: 12, fill: k(1) })}${text(X(3) + 8, Y(8) + 4, tr('rise 2', 'naik 2'), { anchor: 'start', size: 12, fill: k(1) })}
${ring(X(0), Y(fare(0)), k(2), 7)}${text(X(0) + 14, Y(fare(0)) + 24, tr('intercept 3: the fare at 0 km', 'intercept 3: tarif di 0 km'), { anchor: 'start', fill: k(2), weight: 700 })}
${line(X(5), Y(0), X(5), Y(fare(5)), { c: 'var(--muted)', w: 1.6, dash: '5 4' })}${line(X(5), Y(fare(5)), X(0), Y(fare(5)), { c: 'var(--muted)', w: 1.6, dash: '5 4' })}
${dot(X(5), Y(fare(5)), 'var(--ink)', 6)}${text(X(5) + 10, Y(fare(5)) + 24, tr('5 km: predicted fare 13', '5 km: tarif prediksi 13'), { anchor: 'start', fill: 'var(--ink)', weight: 700 })}`);
}

// All 342 penguins with the line mass = 50 x flipper - 5800 and the prediction for 200 mm.
function penguinLine() {
  const X = v => 70 + (v - 165) / 75 * 540, Y = m => 250 - (m - 2500) / 4000 * 230;
  const f = x => 50 * x - 5800;
  const xticks = [170, 180, 190, 200, 210, 220, 230, 240].map(v => text(X(v), 268, fmt(v), { size: 12 })).join('');
  const yticks = [3000, 4000, 5000, 6000].map(v => text(62, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })).join('');
  const label = tr(`dashed: 200 mm gives ${fmt(f(200))} g`, `putus-putus: 200 mm memberi ${fmt(f(200))} g`);
  return svg(640, 300, `${axes(70, 614, 250, 18)}${xticks}${yticks}
${text(342, 290, tr('flipper length (mm)', 'panjang flipper (mm)'))}${text(8, 14, tr('body mass (g)', 'massa tubuh (g)'), { anchor: 'start' })}
${PENGUINS.map(([x, m]) => `<circle cx="${X(x).toFixed(1)}" cy="${Y(m).toFixed(1)}" r="3.3" fill="${k(0)}" fill-opacity="0.45"/>`).join('')}
${line(X(170), Y(f(170)), X(235), Y(f(235)), { c: k(1), w: 3.4 })}
${text(96, 44, tr('mass = 50 × flipper − 5800', 'mass = 50 × flipper − 5800'), { anchor: 'start', size: 15, weight: 700, fill: 'var(--ink)' })}
${line(X(200), Y(2500), X(200), Y(f(200)), { c: 'var(--ink)', w: 1.6, dash: '5 4' })}${line(X(200), Y(f(200)), X(165), Y(f(200)), { c: 'var(--ink)', w: 1.6, dash: '5 4' })}
${dot(X(200), Y(f(200)), 'var(--ink)', 6)}${text(96, 70, label, { anchor: 'start', size: 12, fill: 'var(--ink)', weight: 700 })}`);
}

// The four penguins of the worked example, zoomed in: actual (dot) against predicted (ring).
function penguinResiduals() {
  const X = v => 70 + (v - 176) / 24 * 520, Y = m => 240 - (m - 2900) / 1400 * 210;
  const f = x => 50 * x - 5800;
  const pts = [[181, 3750, 'left'], [186, 3800, 'left'], [193, 3450, 'left'], [195, 3250, 'right']];
  const body = pts.map(([x, m, side]) => {
    const r = m - f(x);
    const mid = r < 0 && side === 'left' ? Y(m) + 5 : (Y(m) + Y(f(x))) / 2 + 4;
    return `${line(X(x), Y(m), X(x), Y(f(x)), { c: k(1), w: 3 })}${ring(X(x), Y(f(x)), k(0), 6)}${dot(X(x), Y(m), 'var(--ink)', 6)}${text(X(x) + (side === 'left' ? -10 : 10), mid, `${signed(r)} g`, { anchor: side === 'left' ? 'end' : 'start', fill: k(1), weight: 700, size: 14 })}`;
  }).join('');
  const xticks = pts.map(p => text(X(p[0]), 258, fmt(p[0]), { size: 12 })).join('');
  const yticks = [3000, 3500, 4000].map(v => text(62, Y(v) + 4, fmt(v), { anchor: 'end', size: 12 })).join('');
  return svg(640, 296, `${axes(70, 610, 240, 20)}${xticks}${yticks}
${text(340, 284, tr('flipper length (mm)', 'panjang flipper (mm)'))}${text(8, 14, tr('body mass (g)', 'massa tubuh (g)'), { anchor: 'start' })}
${line(X(176), Y(f(176)), X(200), Y(f(200)), { c: k(0), w: 3 })}${body}
${dot(300, 30, 'var(--ink)', 6)}${text(312, 34, tr('actual mass', 'massa sebenarnya'), { anchor: 'start', size: 12 })}${ring(470, 30, k(0), 6)}${text(482, 34, tr('predicted', 'prediksi'), { anchor: 'start', size: 12 })}`);
}

// Residuals against flipper length for two lines on all 342 penguins.
function residualPatterns() {
  const panel = (ox, name, intercept) => {
    const X = v => ox + 40 + (v - 170) / 65 * 250, Y = r => 145 - r * 0.058;
    const res = PENGUINS.map(([x, m]) => ({ x, r: m - (50 * x + intercept) }));
    const above = res.filter(p => p.r > 0).length, below = res.filter(p => p.r < 0).length, on = res.length - above - below;
    const eq = `${tr('Line', 'Garis')} ${name}: y = 50x ${intercept < 0 ? '−' : '+'} ${Math.abs(intercept)}`;
    const counts = tr(`above the line: ${above} · below: ${below} · on it: ${on}`, `di atas garis: ${above} · di bawah: ${below} · di garis: ${on}`);
    return `${text(ox + 155, 18, eq, { weight: 700, fill: 'var(--ink)', size: 14 })}
${line(X(170), 250, X(235), 250, { c: 'var(--muted)', w: 1.6 })}${[180, 200, 220].map(v => text(X(v), 266, fmt(v), { size: 12 })).join('')}${text(ox + 165, 282, tr('flipper length (mm)', 'panjang flipper (mm)'), { size: 12 })}
${[-1000, 0, 1000].map(v => text(ox + 32, Y(v) + 4, signed(v), { anchor: 'end', size: 11 })).join('')}
${line(X(170), Y(0), X(235), Y(0), { c: 'var(--ink)', w: 1.8, dash: '6 4' })}
${res.map(p => `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.r).toFixed(1)}" r="2.8" fill="${p.r > 0 ? k(2) : p.r < 0 ? k(1) : 'var(--ink)'}" fill-opacity="0.55"/>`).join('')}
${text(ox + 155, 38, counts, { size: 12 })}`;
  };
  return svg(640, 292, `${text(8, 66, tr('residual (g)', 'residual (g)'), { anchor: 'start', size: 12 })}${panel(10, 'A', -5800)}${panel(340, 'B', -5400)}`);
}

export const figures = {
  'line-anatomy': lineAnatomy,
  'penguin-line': penguinLine,
  'penguin-residuals': penguinResiduals,
  'residual-patterns': residualPatterns,
};
