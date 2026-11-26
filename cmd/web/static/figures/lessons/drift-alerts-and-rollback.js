// Figures for the lesson "Drift, alerts and rollback": [[figure:drift-alerts-and-rollback/name|Caption]].
// One invented example: a model that predicts whether an invoice is paid late (500 invoices a day, label known after 30 days).
// The drift starts on day 10. The numbers are the ones in the lesson text:
//   - signals fire on day 12 (share called late), day 13 (7-day PSI warning), day 15 (page), day 21 or 28 (50-invoice sample), day 42 (accuracy below 80%);
//   - training bin shares of the invoice amount 0.20, 0.40, 0.30, 0.10 against 0.08, 0.25, 0.37, 0.30 once every invoice in the window has changed.
import { svg, text, line, box, k, soft, tr, fmt, pct } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const DRIFT_DAY = 10;

// ---- Figure 1: the four layers ----------------------------------------------------------------------------
function layers() {
  const W = 148, G = 10, X0 = 8, Y0 = 10, H = 214;
  const cols = [
    { c: 0, name: tr('Operations', 'Operations'), speed: tr('minutes', 'menit'),
      sig: tr(['errors, latency,', 'empty values'], ['galat, latensi,', 'nilai kosong']),
      miss: tr(['A model that is', 'fast but wrong'], ['Model yang cepat', 'tetapi salah']) },
    { c: 1, name: tr('Inputs', 'Inputs'), speed: tr('days', 'hari'),
      sig: tr(['share of rows per', 'bin, PSI'], ['porsi baris per', 'bin, PSI']),
      miss: tr(['A changed', 'relationship'], ['Hubungan yang', 'berubah']) },
    { c: 2, name: tr('Predictions', 'Predictions'), speed: tr('days', 'hari'),
      sig: tr(['share flagged,', 'score spread'], ['porsi yang ditandai,', 'sebaran skor']),
      miss: tr(['Changes that leave', 'the scores alone'], ['Perubahan yang tidak', 'menggeser skor']) },
    { c: 3, name: tr('Outcomes', 'Outcomes'), speed: tr('weeks', 'minggu'),
      sig: tr(['accuracy, precision,', 'calibration'], ['accuracy, precision,', 'calibration']),
      miss: tr(['Nothing, but it', 'comes last'], ['Tidak ada, tetapi', 'datang paling akhir']) },
  ];
  const lab = (x, y, s) => text(x, y, s, { anchor: 'start', size: 12 });
  const body = cols.map((col, i) => {
    const x = X0 + i * (W + G), tx = x + 12;
    return `${box(x, Y0, W, H, soft(col.c), k(col.c))}
${text(x + W / 2, Y0 + 28, col.name, { size: 15, ...INK })}
${lab(tx, Y0 + 54, tr('Shows a problem in', 'Terlihat dalam'))}
${text(tx, Y0 + 76, col.speed, { anchor: 'start', size: 16, weight: 700, fill: 'var(--ink)' })}
${lab(tx, Y0 + 104, tr('Signals', 'Sinyal'))}
${col.sig.map((s, j) => text(tx, Y0 + 122 + j * 16, s, { anchor: 'start', size: 12, fill: 'var(--ink)' })).join('')}
${lab(tx, Y0 + 160, tr('Misses', 'Terlewat'))}
${col.miss.map((s, j) => text(tx, Y0 + 178 + j * 16, s, { anchor: 'start', size: 12, fill: 'var(--ink)' })).join('')}`;
  }).join('');
  return svg(640, 276, `${body}
${line(40, 246, 600, 246, { c: 'var(--muted)', w: 2, arrow: true })}
${text(8, 268, tr('fast, but only a hint', 'cepat, tetapi hanya petunjuk'), { anchor: 'start', size: 12 })}
${text(632, 268, tr('slow, but it confirms the damage', 'lambat, tetapi memastikan kerusakannya'), { anchor: 'end', size: 12 })}`);
}

// ---- Figure 2: the day each signal fires --------------------------------------------------------------------
function timeline() {
  const X0 = 190, X1 = 620, MAXD = 45, TOP = 58, STEP = 58;
  const x = d => X0 + (d / MAXD) * (X1 - X0);
  const lanes = [
    { c: 2, det: 12, label: tr(['Predictions', 'share called late'], ['Predictions', 'porsi diprediksi terlambat']),
      note: tr(`day ${fmt(12)}, ${fmt(2)} days after the drift`, `hari ke-${fmt(12)}, ${fmt(2)} hari setelah drift`) },
    { c: 1, det: 13, label: tr(['Inputs', `7-day PSI, warn ${fmt(0.1, { digits: 2 })}`], ['Inputs', `PSI 7 hari, warn ${fmt(0.1, { digits: 2 })}`]),
      note: tr(`day ${fmt(13)}, ${fmt(3)} days after the drift`, `hari ke-${fmt(13)}, ${fmt(3)} hari setelah drift`) },
    { c: 0, det: 21, label: tr(['Hand-labelled sample', `${fmt(50)} invoices a week`], ['Sampel berlabel manual', `${fmt(50)} invoice per minggu`]),
      note: tr(`day ${fmt(21)} (${pct(0.78, 0)} of weeks), else day ${fmt(28)}`, `hari ke-${fmt(21)} (${pct(0.78, 0)} dari minggu), jika tidak hari ke-${fmt(28)}`) },
    { c: 3, det: 42, label: tr(['Outcomes', 'accuracy below 80%'], ['Outcomes', 'accuracy di bawah 80%']),
      note: tr(`day ${fmt(42)}, ${fmt(32)} days after the drift`, `hari ke-${fmt(42)}, ${fmt(32)} hari setelah drift`) },
  ];
  const rows = lanes.map((ln, i) => {
    const y = TOP + i * STEP;
    return `${text(180, y + 4, ln.label[0], { anchor: 'end', size: 13, ...INK })}${text(180, y + 20, ln.label[1], { anchor: 'end', size: 12 })}
${text(x(DRIFT_DAY) + 4, y - 6, ln.note, { anchor: 'start', size: 12, fill: 'var(--ink)' })}
<rect x="${x(DRIFT_DAY)}" y="${y}" width="${x(ln.det) - x(DRIFT_DAY)}" height="16" rx="4" fill="${soft(ln.c)}" stroke="${k(ln.c)}" stroke-width="1.8"/>
<circle cx="${x(ln.det)}" cy="${y + 8}" r="6" fill="${k(ln.c)}" stroke="var(--ink)" stroke-width="1.6"/>`;
  }).join('');
  const AY = TOP + lanes.length * STEP - 6;
  const ticks = [0, 10, 20, 30, 40].map(d => `${line(x(d), AY, x(d), AY + 6, { c: 'var(--muted)', w: 1.6 })}${text(x(d), AY + 22, fmt(d), { size: 12 })}`).join('');
  return svg(640, AY + 52, `
${line(x(DRIFT_DAY), 34, x(DRIFT_DAY), AY, { c: 'var(--ink)', w: 1.6, dash: '4 3' })}
${text(x(DRIFT_DAY), 24, tr(`the drift starts on day ${fmt(DRIFT_DAY)}`, `drift mulai pada hari ke-${fmt(DRIFT_DAY)}`), { size: 13, ...INK })}
${rows}
${line(X0, AY, X1, AY, { c: 'var(--muted)', w: 1.6 })}${ticks}
${text(X1, AY + 42, tr('day', 'hari'), { anchor: 'end', size: 12 })}`);
}

// ---- Figure 3: the 7-day PSI against two thresholds ---------------------------------------------------------
// Shares of the invoice amount (small, medium, large, very large): training, and after the drift. On day 10 + j the last 7 days
// hold j + 1 changed days (up to 7). Shares are rounded to two decimals, as in the lesson's table.
const TRAIN = [0.20, 0.40, 0.30, 0.10], AFTER = [0.08, 0.25, 0.37, 0.30];
const r2 = v => Math.round(v * 100) / 100;
function weekPsi(changedDays) {
  const f = changedDays / 7;
  const m = TRAIN.map((p, i) => (1 - f) * p + f * AFTER[i]);
  const a = [r2(m[0]), r2(m[1]), r2(m[2])], s = [...a, r2(1 - a[0] - a[1] - a[2])];
  return s.reduce((t, v, i) => t + (v - TRAIN[i]) * Math.log(v / TRAIN[i]), 0);
}
const WARN = 0.1, PAGE = 0.25;

function psiAlert() {
  const D0 = 7, D1 = 18, CX0 = 78, CX1 = 622, CY0 = 224, CY1 = 36, YMAX = 0.45;
  const n = D1 - D0 + 1, slot = (CX1 - CX0) / n, bw = Math.min(30, slot - 10);
  const xc = d => CX0 + (d - D0 + 0.5) * slot, yv = v => CY0 - (v / YMAX) * (CY0 - CY1);
  const psiOn = d => weekPsi(Math.max(0, Math.min(7, d - DRIFT_DAY + 1)));
  const grid = [0, 0.1, 0.2, 0.3, 0.4].map(v => `${line(CX0, yv(v), CX1, yv(v), { c: 'var(--line)', w: 1 })}${text(CX0 - 8, yv(v) + 4, fmt(v, { digits: 1 }), { anchor: 'end', size: 12 })}`).join('');
  const thr = (v, label, c) => `${line(CX0, yv(v), CX1, yv(v), { c, w: 2, dash: '6 4' })}${text(CX0 + 6, yv(v) - 6, label, { anchor: 'start', size: 12, weight: 700, fill: c })}`;
  let fired = { warn: false, page: false };
  const bars = [];
  for (let d = D0; d <= D1; d++) {
    const v = psiOn(d), level = v >= PAGE ? 1 : v >= WARN ? 3 : 2;
    const tag = v >= PAGE && !fired.page ? (fired.page = true, fired.warn = true, tr('page', 'page')) : v >= WARN && !fired.warn ? (fired.warn = true, tr('warning', 'warning')) : '';
    bars.push(`<rect x="${xc(d) - bw / 2}" y="${yv(v)}" width="${bw}" height="${CY0 - yv(v)}" rx="3" fill="${soft(level)}" stroke="${k(level)}" stroke-width="1.8"/>
${d >= DRIFT_DAY ? text(xc(d), yv(v) - 6, fmt(v, { digits: 2 }), { size: 12, ...INK }) : ''}
${text(xc(d), CY0 + 18, fmt(d), { size: 12, fill: d === DRIFT_DAY ? 'var(--ink)' : 'var(--muted)', weight: d === DRIFT_DAY ? 700 : 500 })}
${tag ? text(xc(d), CY0 + 36, tag, { size: 12, weight: 700, fill: level === 1 ? k(1) : k(3) }) : ''}`);
  }
  return svg(640, 290, `${grid}${bars.join('')}${line(CX0, CY0, CX1, CY0, { c: 'var(--muted)', w: 1.6 })}
${thr(PAGE, tr(`page at ${fmt(PAGE, { digits: 2 })}`, `page pada ${fmt(PAGE, { digits: 2 })}`), k(1))}
${thr(WARN, tr(`warning at ${fmt(WARN, { digits: 2 })}`, `warning pada ${fmt(WARN, { digits: 2 })}`), k(3))}
${text(CX0, 18, tr('7-day PSI of the invoice amount', 'PSI 7 hari untuk nilai invoice'), { anchor: 'start', size: 13, ...INK })}
${text(CX1, 284, tr(`day (the drift starts on day ${fmt(DRIFT_DAY)})`, `hari (drift mulai pada hari ke-${fmt(DRIFT_DAY)})`), { anchor: 'end', size: 12 })}`);
}

// ---- Figure 4: the playbook ---------------------------------------------------------------------------------
function playbook() {
  const BW = 200, BY = 168, BH = 150;
  const opts = [
    { c: 1, x: 8, name: tr('Roll back', 'Roll back'),
      found: tr(['A bad release or', 'a broken feature'], ['Rilis yang bermasalah', 'atau feature yang rusak']),
      cost: tr(['Minutes. The new version', 'loses its gains'], ['Hitungan menit. Versi baru', 'kehilangan keunggulannya']) },
    { c: 0, x: 220, name: tr('Recalibrate', 'Recalibrate'),
      found: tr(['The ranking holds, but', 'the scores are off'], ['Urutan masih baik, tetapi', 'skornya meleset']),
      cost: tr(['A few hundred labels.', 'Hours to a day'], ['Beberapa ratus label.', 'Hitungan jam sampai sehari']) },
    { c: 3, x: 432, name: tr('Retrain', 'Retrain'),
      found: tr(['The relationship', 'changed'], ['Hubungannya', 'berubah']),
      cost: tr(['Fresh labels, a check.', 'Days to weeks'], ['Label baru, lalu pengecekan.', 'Hitungan hari sampai minggu']) },
  ];
  const cards = opts.map(o => `${box(o.x, BY, BW, BH, soft(o.c), k(o.c))}
${text(o.x + BW / 2, BY + 26, o.name, { size: 16, ...INK })}
${text(o.x + 12, BY + 50, tr('Right when', 'Tepat jika'), { anchor: 'start', size: 12 })}
${o.found.map((s, j) => text(o.x + 12, BY + 67 + j * 16, s, { anchor: 'start', size: 12, fill: 'var(--ink)' })).join('')}
${text(o.x + 12, BY + 100, tr('Costs', 'Biaya'), { anchor: 'start', size: 12 })}
${o.cost.map((s, j) => text(o.x + 12, BY + 117 + j * 16 - 0, s, { anchor: 'start', size: 12, fill: 'var(--ink)' })).join('')}
${line(320, 112, o.x + BW / 2, BY - 2, { c: 'var(--muted)', w: 2, arrow: true })}`).join('');
  return svg(640, 336, `
${box(210, 8, 220, 34, 'var(--surface)', 'var(--ink)')}${text(320, 30, tr('An alert fires', 'Sebuah alert berbunyi'), { size: 15, ...INK })}
${line(320, 42, 320, 58, { c: 'var(--muted)', w: 2, arrow: true })}
${box(70, 58, 500, 54, soft(2), k(2))}
${text(320, 80, tr('Investigate first', 'Selidiki dulu'), { size: 15, ...INK })}
${text(320, 100, tr('pipeline, releases, which inputs moved, a labelled sample', 'pipeline, rilis, input mana yang bergeser, sampel berlabel'), { size: 12, fill: 'var(--ink)' })}
${cards}`);
}

export const figures = {
  layers,
  timeline,
  'psi-alert': psiAlert,
  playbook,
};
