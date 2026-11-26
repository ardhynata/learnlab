// Figures for the lesson "Confounding and treatment effects": [[figure:confounding-and-treatment-effects/name|Caption]].
// Running numbers: a made-up hospital with 1,000 patients. Mild: 90 of 100 treated and 320 of 400 untreated recovered.
// Severe: 260 of 400 treated and 50 of 100 untreated recovered. Overall 0.70 against 0.74; ATE 0.125.
import { svg, text, line, k, tr, fmt } from '../kit.js';

const INK = { weight: 700, fill: 'var(--ink)' };
const tint = i => `color-mix(in srgb, var(--k${i}) 22%, var(--surface))`;
const node = (x, y, w, h, i, label) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${tint(i)}" stroke="${k(i)}" stroke-width="2.4"/>${text(x + w / 2, y + h / 2 + 5, label, { size: 14, ...INK })}`;
const d2 = x => fmt(x, { digits: 2 });
const signed = x => `${x > 0 ? '+' : ''}${d2(x)}`;

// Figure 1: severity is a common cause of the drug and of recovery.
function commonCause() {
  return svg(680, 262, `
${node(250, 14, 180, 50, 3, tr('Severity', 'Keparahan'))}
${node(40, 178, 170, 50, 2, tr('Got the drug', 'Mendapat obat'))}
${node(470, 178, 170, 50, 1, tr('Recovered', 'Pulih'))}
${line(292, 68, 158, 175, { c: 'var(--muted)', arrow: true })}
${line(388, 68, 522, 175, { c: 'var(--muted)', arrow: true })}
${line(214, 203, 466, 203, { c: 'var(--ink)', dash: '7 5', arrow: true })}
${text(340, 193, '?', { size: 24, ...INK })}
${text(340, 224, tr('the drug’s own effect', 'efek obat itu sendiri'), { size: 13 })}
${text(194, 98, tr('Severe patients are', 'Pasien parah lebih'), { anchor: 'end', size: 13, ...INK })}
${text(194, 116, tr('treated more often', 'sering diobati'), { anchor: 'end', size: 13, ...INK })}
${text(194, 136, tr(`${fmt(0.8)} of severe, ${fmt(0.2)} of mild`, `${fmt(0.8)} parah, ${fmt(0.2)} ringan`), { anchor: 'end', size: 13 })}
${text(492, 98, tr('Severe patients recover', 'Pasien parah lebih'), { anchor: 'start', size: 13, ...INK })}
${text(492, 116, tr('less often', 'jarang pulih'), { anchor: 'start', size: 13, ...INK })}
${text(492, 136, tr('whatever they are given', 'apa pun yang diberikan'), { anchor: 'start', size: 13 })}`);
}

// Figure 2: recovery rate overall and inside each severity stratum, treated against untreated.
function twoStrata() {
  const Y0 = 226, H = 170, BW = 62;
  const groups = [
    { name: tr('All patients', 'Semua pasien'), cx: 170, t: 0.7, u: 0.74, note: tr('naive comparison', 'perbandingan naif') },
    { name: tr('Mild', 'Ringan'), cx: 400, t: 0.9, u: 0.8, note: tr(`${fmt(100)} treated, ${fmt(400)} not`, `${fmt(100)} diobati, ${fmt(400)} tidak`) },
    { name: tr('Severe', 'Parah'), cx: 600, t: 0.65, u: 0.5, note: tr(`${fmt(400)} treated, ${fmt(100)} not`, `${fmt(400)} diobati, ${fmt(100)} tidak`) },
  ];
  const grid = [0, 0.5, 1].map(v => `${line(52, Y0 - v * H, 668, Y0 - v * H, { c: 'var(--line)', w: 1.2 })}${text(44, Y0 - v * H + 4, fmt(v), { anchor: 'end', size: 12 })}`).join('');
  const bar = (x, v, i) => {
    const h = v * H;
    return `<rect x="${x}" y="${Y0 - h}" width="${BW}" height="${h}" rx="6" fill="${tint(i)}" stroke="${k(i)}" stroke-width="2.4"/>${text(x + BW / 2, Y0 - h - 7, d2(v), { size: 14, ...INK })}`;
  };
  const body = groups.map(g => {
    const diff = g.t - g.u;
    return `${bar(g.cx - BW - 4, g.t, 2)}${bar(g.cx + 4, g.u, 4)}
${text(g.cx, Y0 + 22, g.name, { size: 14, ...INK })}
${text(g.cx, Y0 + 40, tr(`difference ${signed(diff)}`, `selisih ${signed(diff)}`), { size: 13, ...INK })}
${text(g.cx, Y0 + 57, g.note, { size: 12 })}`;
  }).join('');
  const sep = line(285, 40, 285, Y0 + 62, { c: 'var(--line)', dash: '5 5', w: 1.5 });
  const legend = `<rect x="52" y="12" width="16" height="16" rx="4" fill="${tint(2)}" stroke="${k(2)}" stroke-width="2.2"/>${text(76, 25, tr('Got the drug', 'Mendapat obat'), { anchor: 'start', size: 13 })}
<rect x="196" y="12" width="16" height="16" rx="4" fill="${tint(4)}" stroke="${k(4)}" stroke-width="2.2"/>${text(220, 25, tr('No drug', 'Tanpa obat'), { anchor: 'start', size: 13 })}
${text(668, 25, tr(`Adjusted effect (ATE) = +${fmt(0.125)}`, `Efek terkoreksi (ATE) = +${fmt(0.125)}`), { anchor: 'end', size: 13, ...INK })}`;
  return svg(680, 296, `${legend}${grid}${sep}${body}`);
}

// Figure 3: three roles a third variable can play; only the first is adjusted for.
function whatToAdjust() {
  const panels = [
    { x0: 0, title: tr('Confounder', 'Confounder'), z: tr('Severity', 'Keparahan'), sub: [tr('a common cause of the', 'penyebab bersama dari'), tr('drug and of recovery', 'obat dan pemulihan')], ok: true, zi: 3, kind: 'conf' },
    { x0: 230, title: tr('Post-treatment variable', 'Variabel pasca-perlakuan'), z: tr('Blood pressure', 'Tekanan darah'), sub: [tr('changed by the drug,', 'diubah oleh obat,'), tr('measured after it', 'diukur sesudahnya')], ok: false, zi: 5, kind: 'med' },
    { x0: 460, title: tr('Collider', 'Collider'), z: tr('Follow-up', 'Tindak lanjut'), sub: [tr('caused by the drug', 'disebabkan oleh obat'), tr('and by recovery', 'dan oleh pemulihan')], ok: false, zi: 6, kind: 'coll' },
  ];
  const A = { c: 'var(--muted)', arrow: true };
  return svg(680, 270, panels.map(p => {
    const { x0 } = p;
    const arrows = p.kind === 'conf'
      ? `${line(x0 + 80, 110, x0 + 46, 166, A)}${line(x0 + 140, 110, x0 + 174, 166, A)}`
      : p.kind === 'med'
        ? `${line(x0 + 46, 166, x0 + 80, 110, A)}${line(x0 + 140, 110, x0 + 174, 166, A)}`
        : `${line(x0 + 46, 166, x0 + 80, 110, A)}${line(x0 + 174, 166, x0 + 140, 110, A)}`;
    return `${text(x0 + 110, 22, p.title, { size: 14, ...INK })}
${text(x0 + 110, 40, p.sub[0], { size: 12.5 })}${text(x0 + 110, 56, p.sub[1], { size: 12.5 })}
${node(x0 + 45, 72, 130, 36, p.zi, p.z)}
${node(x0, 168, 84, 36, 2, tr('Drug', 'Obat'))}${node(x0 + 116, 168, 104, 36, 1, tr('Recovery', 'Pemulihan'))}
${arrows}${line(x0 + 88, 186, x0 + 112, 186, { c: 'var(--ink)', dash: '6 4', arrow: true })}
${text(x0 + 110, 238, p.ok ? `✓ ${tr('Adjust for it', 'Koreksi untuknya')}` : `✕ ${tr('Do not adjust', 'Jangan dikoreksi')}`, { size: 14, ...INK })}`;
  }).join(''));
}

export const figures = { 'common-cause': commonCause, 'two-strata': twoStrata, 'what-to-adjust': whatToAdjust };
