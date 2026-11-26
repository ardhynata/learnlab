// Causal lab, built on the kit: a generated population in which a confounder z pushes people into treatment AND
// raises the outcome. The plot shows treated and control people with three effects drawn (the true effect, the
// naive difference of the two group means, and the regression-adjusted estimate); the table works out six
// estimators against the true effect; the repeated-experiments chart runs the whole study 200 times so bias
// (aim off) and noise (spread) can be told apart; the power panel gives the power curve of a two-group trial and
// a peeking toggle that shows false positives rising with repeated looks. The data is generated on purpose: a
// real dataset never reveals the true effect, so there is no real-data mode (the penguins have no treatment).
// The math is in sims/ml/causal.js and sims/ml/causallab.js; this file draws and wires.
import { createLab, createPlot, drawLineChart, predictBox, clusterColor, theme, tr, fmt, pct } from '../kit/index.js';
import {
  DEFAULTS, RANGES, REPEATS, computeStudy, fitLines, predictVerdict, runStudy, summarizeRepeats, powerCurve,
  peekingCurve,
} from '../ml/causallab.js';
import { covariateBalance } from '../ml/causal.js';
import { rng } from '../ml/rng.js';

const VIEW = { xLo: -4, xHi: 4, yLo: -8, yHi: 12 };       // fixed, so a slider visibly moves the cloud
const FRAME_MS = 10;                                       // work per animation frame of a repeat run ...
const FRAME_STUDIES = 8;                                   // ... and never more than this many studies
const REPEAT_DRAW_MS = 90;                                 // the repeat chart is redrawn this often while a run fills it
const PEEK_RUNS = 1200;

// Names of the estimators; built when drawn so the text follows the language.
const longName = id => ({
  naive: tr('Naive difference', 'Selisih naif'),
  stratified: tr('Stratified (5 groups of z)', 'Stratifikasi (5 kelompok z)'),
  regression: tr('Regression adjustment', 'Penyesuaian regresi'),
  ipw: tr('Inverse propensity (IPW)', 'Inverse propensity (IPW)'),
  collider: tr('Adjusting for the collider', 'Menyesuaikan collider'),
  randomized: tr('Randomized experiment', 'Eksperimen acak'),
}[id]);
const shortName = id => ({
  naive: tr('Naive', 'Naif'), stratified: tr('Stratified', 'Stratifikasi'), regression: tr('Regression', 'Regresi'),
  ipw: 'IPW', collider: tr('Collider', 'Collider'), randomized: tr('Randomized', 'Acak'),
}[id]);

// One minus sign everywhere: the real minus (U+2212), as in signed(), also for estimates, intervals and axis ticks.
const minus = text => String(text).replace(/-/g, '−');
const num = v => (Number.isFinite(v) ? minus(fmt(v, { digits: 2 })) : '–');
const signed = v => {
  if (!Number.isFinite(v)) return '–';
  if (Math.abs(v) < 0.005) return fmt(0, { digits: 2 });
  return (v > 0 ? '+' : '−') + fmt(Math.abs(v), { digits: 2 });
};
const range = (lo, hi, step) => { const out = []; for (let v = lo; v <= hi + 1e-9; v += step) out.push(v); return out; };

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Causal inference and experiments', 'Inferensi kausal dan eksperimen'),
    hint: tr(
      'Generated people, so the true effect is known. A confounder z raises both the chance of treatment and the outcome. Dotted: the true lines. Dashed: the two group means. Solid: regression adjustment. The gap in each pair is that effect.',
      'Orang buatan, jadi efek sebenarnya diketahui. Confounder z menaikkan peluang treatment sekaligus outcome. Titik-titik: garis sebenarnya. Putus-putus: rata-rata kedua kelompok. Tebal: penyesuaian regresi. Selisih tiap pasangan adalah efeknya.'),
    status: true, legend: true,
    canvasLabel: tr(
      'Scatter plot of a generated population: the confounder z on the horizontal axis, the outcome on the vertical axis, treated and control people in two colors, with the true effect, the naive difference and the adjusted estimate drawn as pairs of lines and brackets. The numbers are given below the plot and in the table. There is no real-data mode: the penguins data has no treatment and no known true effect.',
      'Scatter plot populasi buatan: confounder z di sumbu horizontal, outcome di sumbu vertikal, orang treated dan control dalam dua warna, dengan efek sebenarnya, selisih naif, dan estimasi hasil penyesuaian digambar sebagai pasangan garis dan kurung. Angkanya ada di bawah plot dan di tabel. Tidak ada mode data nyata: data penguin tidak punya treatment dan efek sebenarnya tidak diketahui.'),
  });
  // Nothing on the plot is dragged: it is a picture with a text description, not a tab stop.
  lab.canvas.setAttribute('role', 'img');
  lab.canvas.removeAttribute('tabindex');
  const plot = createPlot(lab.canvas, { xLabel: '', yLabel: '' });
  const legendHost = lab.ref('legend');
  if (legendHost) legendHost.style.maxHeight = 'none';

  // ---- state --------------------------------------------------------------------------------------

  let study = null, studyKey = '', rctSeed = 1, rctRuns = 0;
  let runs = [], running = false, runValues = null, raf = 0;
  let peek = null, peekKey = '', destroyed = false, drawQueued = 0, lastRepeatDraw = 0;

  // ---- controls -----------------------------------------------------------------------------------

  const R = RANGES;
  const slider = (name, label) => ({ name, type: 'range', label, min: R[name].min, max: R[name].max, step: R[name].step, value: DEFAULTS[name] });
  const runLabel = tr(`Run ${fmt(REPEATS)} studies`, `Jalankan ${fmt(REPEATS)} studi`);
  const stopLabel = tr('Stop', 'Berhenti');
  // Short on purpose: the box must stay about half a screen tall so the Quick Quiz button and panel docked under it stay
  // on screen. The two run buttons stay on top; the rest is in three groups, one open at a time.
  const controls = lab.panel([
    { name: 'runRct', type: 'button', label: tr('Run randomized experiment', 'Jalankan eksperimen acak'), onClick: runRandomized },
    { name: 'runRepeat', type: 'button', label: runLabel, onClick: toggleRepeat },
    { name: 'showRct', type: 'toggle', label: tr('Show the randomized experiment on the plot', 'Tampilkan eksperimen acak di plot'), value: false },
    { type: 'note', text: '§' + tr('The population', 'Populasi') },
    slider('confounding', tr('Confounding strength', 'Kekuatan confounding')),
    slider('overlap', tr('Overlap of treated and control', 'Overlap kelompok treated dan control')),
    { name: 'seed', type: 'number', label: tr('Seed', 'Seed'), min: R.seed.min, max: R.seed.max, step: 1, value: DEFAULTS.seed },
    { name: 'newPopulation', type: 'button', label: tr('New population', 'Populasi baru'), onClick: () => { controls.set('seed', Number(controls.get('seed')) % R.seed.max + 1); dataChanged(); } },
    { type: 'note', text: '§' + tr('Effect, size and traps', 'Efek, ukuran, dan jebakan') },
    slider('effect', tr('True effect size', 'Besar efek sebenarnya')),
    slider('heterogeneity', tr('Heterogeneity (the effect changes with z)', 'Heterogenitas (efek berubah menurut z)')),
    slider('n', tr('Sample size', 'Ukuran sampel')),
    { name: 'unmeasured', type: 'toggle', label: tr('Add an unmeasured confounder', 'Tambahkan confounder yang tidak terukur'), value: DEFAULTS.unmeasured },
    { name: 'collider', type: 'toggle', label: tr('Add a collider (caused by treatment and outcome)', 'Tambahkan collider (akibat dari treatment dan outcome)'), value: DEFAULTS.collider },
    { type: 'note', text: '§' + tr('Design a trial: power', 'Merancang uji coba: power') },
    slider('designEffect', tr('Effect to detect', 'Efek yang ingin dideteksi')),
    slider('designSd', tr('Spread of the outcome (sd)', 'Sebaran outcome (simpangan baku)')),
    slider('designN', tr('People per group', 'Orang per kelompok')),
    slider('alpha', tr('Significance level (alpha)', 'Taraf signifikansi (alpha)')),
    { name: 'peeking', type: 'toggle', label: tr('Peek at the results while the trial runs', 'Intip hasil selama uji coba berjalan'), value: DEFAULTS.peeking },
    slider('looks', tr('Number of looks', 'Jumlah pengecekan')),
  ], name => {
    if (name === 'showRct' && controls.get('showRct') && !rctRuns) rctRuns = 1;
    if (DATA_CONTROLS.includes(name)) dataChanged();
    else if (name === 'showRct') queueDraw(PLOT_PARTS);
    else queueDraw(POWER_PARTS);
  });
  const DATA_CONTROLS = ['confounding', 'effect', 'heterogeneity', 'overlap', 'n', 'unmeasured', 'collider', 'seed'];
  // A note that starts with a section sign is the heading of the controls after it: they become a collapsible group
  // (a details element); opening one closes the others, and the population group starts open.
  controls.el.classList.add('causal-panel');
  {
    let body = null, groups = 0;
    for (const node of [...controls.el.children]) {
      if (node.matches('p.hint') && node.textContent.startsWith('§')) {
        const details = document.createElement('details'), summary = document.createElement('summary');
        summary.textContent = node.textContent.slice(1);
        body = document.createElement('div'); body.className = 'cp-body';
        details.setAttribute('name', 'causal-groups');
        details.open = groups++ === 0;
        details.append(summary, body);
        node.replaceWith(details);
      } else if (body) body.append(node);
    }
  }
  const panelStyle = document.createElement('style');
  panelStyle.textContent = `
.causal-panel details{border-top:1px solid var(--line);margin-top:8px}
.causal-panel summary{cursor:pointer;padding:7px 0 2px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.causal-panel summary:hover{color:var(--ink)}
@media (min-width: 861px) {
  .causal-panel div.slider-label,.causal-panel .cp-body > label{margin-top:7px}
  .causal-panel .slider-label input[type=range]{margin-top:3px}
  .causal-panel .button-group{margin-top:8px}
  .causal-panel .cp-body > .button-group{margin-top:8px}
  .causal-panel > .toggle{margin-top:8px}
  .causal-panel > .button-group{grid-template-columns:3fr 2fr}
  .causal-panel .cp-body > label:has(input[type=number]){display:flex;align-items:center;justify-content:space-between;gap:12px}
  .causal-panel .cp-body > label input[type=number]{width:96px;margin:0}
}`;
  controls.el.prepend(panelStyle);
  const repeatButton = [...controls.el.querySelectorAll('button')].find(b => b.textContent === runLabel);
  controls.show('looks', false);

  // ---- the three boxes beside the plot -------------------------------------------------------------

  const below = lab.ref('below');
  const tableCard = document.createElement('section');
  tableCard.className = 'card table-card';
  tableCard.innerHTML = '<h2 class="lab-h"></h2><p class="hint"></p><div class="table-scroll"></div>';
  const tableTitle = tableCard.querySelector('h2'), tableHint = tableCard.querySelector('p'), tableHost = tableCard.querySelector('.table-scroll');
  tableTitle.textContent = tr('Estimators against the true effect', 'Estimator dibandingkan dengan efek sebenarnya');
  tableHint.textContent = tr(
    'Error = estimate − truth. "No": the 95% interval leaves out the truth, by chance 1 time in 20.',
    'Galat = estimasi − efek sebenarnya. "Tidak": interval 95% tidak memuat efek sebenarnya, kebetulan 1 dari 20 kali.');
  below.append(tableCard);

  const repeatIdle = () => tr(`Run ${fmt(REPEATS)} studies to see where each estimator lands.`, `Jalankan ${fmt(REPEATS)} studi untuk melihat di mana tiap estimator mendarat.`);
  const repeatCanvas = lab.chartCard(
    tr('The study repeated: bias against noise', 'Studi diulang: bias dan noise'),
    repeatIdle(), 260);
  repeatCanvas.closest('.chart').style.minHeight = '80px';   // the rule's 200px minimum would push the boxes past the screen
  const repeatCard = repeatCanvas.closest('.card'), repeatHint = repeatCard.querySelector('.hint');
  const repeatLive = document.createElement('p');
  repeatLive.className = 'sr-only';
  repeatLive.setAttribute('role', 'status');
  repeatCard.append(repeatLive);

  const powerCanvas = lab.chartCard(tr('Power against sample size', 'Power menurut ukuran sampel'), '', 260);
  powerCanvas.closest('.chart').style.minHeight = '80px';
  const powerCard = powerCanvas.closest('.card'), powerTitle = powerCard.querySelector('h2'), powerHint = powerCard.querySelector('.hint') ?? (() => {
    const p = document.createElement('p'); p.className = 'hint'; p.id = 'causal-power-hint'; powerTitle.after(p);
    powerCanvas.setAttribute('aria-describedby', p.id); return p;
  })();

  // ---- the Quick Quiz -------------------------------------------------------------------------------

  const box = predictBox(below, {
    hint: tr('Press "Run randomized experiment", then check again.', 'Tekan "Jalankan eksperimen acak", lalu periksa lagi.'),
    name: 'predict-causal',
    question: tr('Confounding is strong. Which estimate will be closest to the true effect: the naive difference or the randomized experiment?', 'Confounding kuat. Estimasi mana yang paling dekat dengan efek sebenarnya: selisih naif atau eksperimen acak?'),
    choices: [
      ['naive', tr('The naive difference', 'Selisih naif')],
      ['rct', tr('The randomized experiment', 'Eksperimen acak')],
      ['same', tr('About equally close', 'Sama dekatnya')],
    ],
  });
  lab.cleanup(() => box.destroy());
  box.onCheck(revealPrediction);

  function revealPrediction() {
    if (!study || !rctRuns) return;
    const naive = study.rows.find(r => r.id === 'naive'), rct = study.rows.find(r => r.id === 'randomized');
    if (!naive.available || !rct.available) return;
    const verdict = predictVerdict({ naiveError: naive.error, naiveSe: naive.se, rctError: rct.error, rctSe: rct.se });
    const numbers = tr(
      `Naive difference ${num(naive.estimate)} (error ${signed(naive.error)}), randomized experiment ${num(rct.estimate)} (error ${signed(rct.error)}); the true effect is ${num(study.ate)}.`,
      `Selisih naif ${num(naive.estimate)} (galat ${signed(naive.error)}), eksperimen acak ${num(rct.estimate)} (galat ${signed(rct.error)}); efek sebenarnya ${num(study.ate)}.`);
    const why = verdict === 'same'
      ? tr('With so little confounding the naive difference is fine. Raise the confounding strength and check again.', 'Dengan confounding sekecil ini selisih naif sudah cukup baik. Naikkan kekuatan confounding lalu periksa lagi.')
      : tr('Randomizing breaks the link between z and treatment, so the two groups are alike apart from the treatment.', 'Pengacakan memutus hubungan antara z dan treatment, sehingga kedua kelompok sama kecuali soal treatment.');
    box.reveal(verdict, `${numbers} ${why}`);
  }

  // ---- data -----------------------------------------------------------------------------------------

  const values = () => controls.values();
  const dataKey = v => [v.confounding, v.effect, v.heterogeneity, v.overlap, v.n, v.unmeasured, v.collider, v.seed].join('|');

  // Any change to the population: the randomization starts over (same coin flips for the same settings) and the
  // repeat run, which no longer describes this population, is cleared.
  function dataChanged() {
    rctSeed = 1; rctRuns = controls.get('showRct') ? 1 : 0;
    clearRepeats(true);
    // The reveal under the Quick Quiz describes the old population: with the randomized experiment on the plot it is
    // worked out again for the new one, otherwise the quiz starts over.
    if (box.answered) {
      if (box.chosen() != null && controls.get('showRct')) { ensureStudy(); revealPrediction(); } else box.reset();
    }
    queueDraw(DATA_PARTS);
  }
  function ensureStudy() {
    const v = values(), key = `${dataKey(v)}#${rctSeed}`;
    if (key !== studyKey) { study = computeStudy(v, rctSeed); studyKey = key; }
    return study;
  }
  function runRandomized() {
    rctSeed += rctRuns ? 1 : 0; rctRuns += 1;
    controls.set('showRct', true);
    draw(PLOT_PARTS);
    revealIfPicked();
  }
  const revealIfPicked = () => { if (box.chosen() != null) revealPrediction(); };

  // ---- repeat runs --------------------------------------------------------------------------------------

  function clearRepeats(announce) {
    cancelAnimationFrame(raf); raf = 0; running = false; runs = []; runValues = null;
    if (repeatButton) repeatButton.textContent = runLabel;
    if (announce) repeatLive.textContent = '';
  }
  function toggleRepeat() {
    if (running) { finishRepeats(true); return; }
    clearRepeats(false);
    runValues = { ...values() };
    running = true; lastRepeatDraw = 0;
    repeatButton.textContent = stopLabel;
    repeatLive.textContent = '';
    raf = requestAnimationFrame(repeatStep);
  }
  function repeatStep() {
    raf = 0;
    if (destroyed || !running) return;
    const t0 = performance.now();
    let did = 0;
    while (runs.length < REPEATS && did < FRAME_STUDIES && (did === 0 || performance.now() - t0 < FRAME_MS)) { runs.push(runStudy(runValues, runs.length)); did += 1; }
    if (performance.now() - lastRepeatDraw >= REPEAT_DRAW_MS || runs.length >= REPEATS) { drawRepeat(); lastRepeatDraw = performance.now(); }
    if (runs.length < REPEATS) raf = requestAnimationFrame(repeatStep); else finishRepeats(false);
  }
  function finishRepeats(stopped) {
    cancelAnimationFrame(raf); raf = 0; running = false;
    repeatButton.textContent = runLabel;
    drawRepeat();
    const s = summarizeRepeats(runs, runValues?.effect ?? values().effect).filter(r => r.count);
    if (!s.length) return;
    const parts = s.map(r => tr(`${shortName(r.id)} bias ${signed(r.bias)}${r.biased ? ' (biased)' : ''}`, `${shortName(r.id)} bias ${signed(r.bias)}${r.biased ? ' (berbias)' : ''}`));
    repeatLive.textContent = tr(
      `${stopped ? 'Stopped after' : 'Finished'} ${fmt(runs.length)} studies. ${parts.join('; ')}.`,
      `${stopped ? 'Dihentikan setelah' : 'Selesai,'} ${fmt(runs.length)} studi. ${parts.join('; ')}.`);
  }

  // ---- drawing: the plot ----------------------------------------------------------------------------------

  const toPlot = (z, y) => ({ x: (z - VIEW.xLo) / (VIEW.xHi - VIEW.xLo) * 10, y: (y - VIEW.yLo) / (VIEW.yHi - VIEW.yLo) * 10 });

  // The kit labels the square 0..10; the data is in other units, so those labels are erased (the margins are
  // transparent) and drawn again from the data range, as the outlier lab does.
  function axes(g) {
    const ctx = plot.ctx;
    ctx.clearRect(0, 0, g.px(0) - 2, g.height);
    ctx.clearRect(0, g.py(0) + 2, g.width, g.height);
    ctx.save();
    ctx.fillStyle = g.t.muted; ctx.font = '11px system-ui, sans-serif';
    range(VIEW.xLo, VIEW.xHi, 2).forEach((v, i) => { ctx.textAlign = 'center'; ctx.fillText(minus(fmt(v)), g.px(i * 2.5), g.py(0) + 16); });
    range(VIEW.yLo, VIEW.yHi, 4).forEach((v, i) => { ctx.textAlign = 'right'; ctx.fillText(minus(fmt(v)), g.px(0) - 7, g.py(i * 2) + 4); });
    ctx.textAlign = 'center'; ctx.fillText(tr('Confounder z', 'Confounder z'), g.px(5), g.height - 5);
    ctx.translate(g.px(0) - 23, g.py(5));   // as the kit does: on a phone the square starts 31px in and the title must stay inside
    ctx.rotate(-Math.PI / 2); ctx.fillText(tr('Outcome y', 'Outcome y'), 0, 0);
    ctx.restore();
  }

  function line(a, b, color, width, dash) {
    const p = toPlot(VIEW.xLo, a + b * VIEW.xLo), q = toPlot(VIEW.xHi, a + b * VIEW.xHi);
    plot.segment(p.x, p.y, q.x, q.y, { color, width, dash });
  }
  // A bracket at confounder value z from the lower line's height, as tall as the effect it stands for.
  function bracket(z, low, effect, color) {
    const a = toPlot(z, low), b = toPlot(z, low + effect), cap = 0.13 * 10 / (VIEW.xHi - VIEW.xLo);
    plot.segment(a.x, a.y, b.x, b.y, { color, width: 3 });
    plot.segment(a.x - cap, a.y, a.x + cap, a.y, { color, width: 3 });
    plot.segment(b.x - cap, b.y, b.x + cap, b.y, { color, width: 3 });
  }

  function drawPlot(s) {
    const showRct = controls.get('showRct') && rctRuns > 0;
    const data = showRct ? s.rct : s.data;
    const rows = data.rows, g = plot.begin();
    axes(g);
    const t = theme(), c0 = clusterColor(0), c1 = clusterColor(1), teal = clusterColor(2), amber = clusterColor(3);
    const fit = fitLines(data);
    const radius = rows.length > 1000 ? 2.3 : rows.length > 500 ? 3 : 3.8;
    let off = 0;
    plot.clip(() => {
      plot.ctx.save(); plot.ctx.globalAlpha = 0.6;
      for (const arm of [0, 1]) {
        for (const r of rows) {
          if (r.t !== arm) continue;
          if (r.y < VIEW.yLo || r.y > VIEW.yHi) { off += 1; continue; }
          const p = toPlot(r.z, r.y);
          plot.dot(p.x, p.y, arm ? c1 : c0, radius);
        }
      }
      plot.ctx.restore();
      line(fit.truth.control.a, fit.truth.control.b, t.ink, 2, [2, 5]);
      line(fit.truth.treated.a, fit.truth.treated.b, t.ink, 2, [2, 5]);
      if (fit.naive) {
        for (const y of [fit.naive.control, fit.naive.treated]) { const p = toPlot(VIEW.xLo, y), q = toPlot(VIEW.xHi, y); plot.segment(p.x, p.y, q.x, q.y, { color: amber, width: 2, dash: [8, 5] }); }
      }
      if (fit.adjusted) { line(fit.adjusted.a, fit.adjusted.b, teal, 2.5); line(fit.adjusted.a + fit.adjusted.effect, fit.adjusted.b, teal, 2.5); }
      bracket(-3.7, fit.truth.control.a + fit.truth.control.b * -3.7, data.ate, t.ink);
      if (fit.adjusted) bracket(-3.3, fit.adjusted.a + fit.adjusted.b * -3.3, fit.adjusted.effect, teal);
      if (fit.naive) bracket(3.5, fit.naive.control, fit.naive.treated - fit.naive.control, amber);
    });

    const nTreated = rows.filter(r => r.t).length, nControl = rows.length - nTreated;
    const naiveEffect = fit.naive ? fit.naive.treated - fit.naive.control : NaN, adjEffect = fit.adjusted ? fit.adjusted.effect : NaN;
    lab.setLegend([
      { kind: 'dot', color: c0, label: tr(`Control (${fmt(nControl)})`, `Control (${fmt(nControl)})`) },
      { kind: 'dot', color: c1, label: tr(`Treated (${fmt(nTreated)})`, `Treated (${fmt(nTreated)})`) },
      { kind: 'dash', color: t.ink, label: tr(`True effect ${signed(data.ate)}`, `Efek sebenarnya ${signed(data.ate)}`) },
      { kind: 'dash', color: amber, label: tr(`Naive difference ${signed(naiveEffect)}`, `Selisih naif ${signed(naiveEffect)}`) },
      { kind: 'line', color: teal, label: tr(`Adjusted estimate ${signed(adjEffect)}`, `Estimasi hasil penyesuaian ${signed(adjEffect)}`) },
    ]);

    const label = showRct ? tr('Randomized experiment', 'Eksperimen acak') : tr('Observed study', 'Studi observasional');
    lab.setStatus(tr(
      `${label}: naive difference ${signed(naiveEffect)}, adjusted estimate ${signed(adjEffect)}, true effect ${signed(data.ate)}.`,
      `${label}: selisih naif ${signed(naiveEffect)}, estimasi hasil penyesuaian ${signed(adjEffect)}, efek sebenarnya ${signed(data.ate)}.`));
    const bal = covariateBalance(data), balOther = covariateBalance(showRct ? s.data : s.rct);
    const sentences = [
      tr(`Treated and control differ on z by ${fmt(Math.abs(bal.smd), { digits: 2 })} standard deviations here${showRct ? '' : `, and by ${fmt(Math.abs(balOther.smd), { digits: 2 })} once treatment is randomized`}.`,
        `Treated dan control berbeda ${fmt(Math.abs(bal.smd), { digits: 2 })} simpangan baku pada z di sini${showRct ? '' : `, dan ${fmt(Math.abs(balOther.smd), { digits: 2 })} setelah treatment diacak`}.`),
    ];
    if (Math.abs(data.ate - data.params.effect) > 0.005) sentences.push(tr(`The effect varies with z, so the true average effect of this sample is ${num(data.ate)}, not ${num(data.params.effect)}.`, `Efek berubah menurut z, jadi efek rata-rata sebenarnya pada sampel ini ${num(data.ate)}, bukan ${num(data.params.effect)}.`));
    if (data.params.unmeasured) sentences.push(tr('An unmeasured confounder is on: no estimator can adjust for it, only randomizing removes it.', 'Confounder tak terukur aktif: tidak ada estimator yang bisa menyesuaikannya, hanya pengacakan yang menghapusnya.'));
    if (off) sentences.push(tr(`${fmt(off)} points are above or below the chart.`, `${fmt(off)} titik berada di atas atau di bawah grafik.`));
    lab.setDetail(sentences.join(' '));
    lab.setMetrics(tr(`${fmt(rows.length)} people`, `${fmt(rows.length)} orang`));
    lab.describe(lab.canvas, tr(
      `${label}. ${fmt(nTreated)} treated and ${fmt(nControl)} control people. True effect ${signed(data.ate)}, naive difference ${signed(naiveEffect)}, adjusted estimate ${signed(adjEffect)}. ${showRct ? 'Treatment was assigned by coin flip.' : 'Treated people tend to have a higher z.'}`,
      `${label}. ${fmt(nTreated)} orang treated dan ${fmt(nControl)} orang control. Efek sebenarnya ${signed(data.ate)}, selisih naif ${signed(naiveEffect)}, estimasi hasil penyesuaian ${signed(adjEffect)}. ${showRct ? 'Treatment ditentukan dengan lempar koin.' : 'Orang treated cenderung punya z lebih tinggi.'}`));
  }

  // ---- drawing: the table ---------------------------------------------------------------------------------

  const intervalText = ci => tr(`[${num(ci[0])}, ${num(ci[1])}]`, `[${num(ci[0])}; ${num(ci[1])}]`);

  function drawTable(s) {
    const t = document.createElement('table');
    t.className = 'causal-table';
    const head = t.createTHead().insertRow();
    for (const h of [tr('Estimator', 'Estimator'), tr('Estimate', 'Estimasi'), tr('95% interval', 'Interval 95%'), tr('Error', 'Galat'), tr('Covers truth?', 'Memuat efek?')]) {
      const th = document.createElement('th'); th.textContent = h; head.append(th);
    }
    const body = t.createTBody();
    const add = (name, cells, cls) => {
      const r = body.insertRow();
      if (cls) r.className = cls;
      r.insertCell().textContent = name;
      for (const c of cells) r.insertCell().textContent = c;
      return r;
    };
    add(tr('True effect', 'Efek sebenarnya'), [num(s.ate), '–', '–', '–'], 'truth');
    for (const row of s.rows) {
      if (row.id === 'randomized' && !rctRuns) { add(longName(row.id), ['–', '–', '–', tr('Not run yet', 'Belum dijalankan')], 'muted'); continue; }
      if (!row.available) {
        const note = row.reason === 'off' ? tr('Turn on the collider', 'Aktifkan collider') : tr('Cannot be computed', 'Tidak bisa dihitung');
        add(longName(row.id), ['–', '–', '–', note], 'muted');
        continue;
      }
      const misses = row.covers === false;
      add(longName(row.id), [num(row.estimate), intervalText(row.ci), signed(row.error), misses ? tr('No', 'Tidak') : tr('Yes', 'Ya')], misses ? 'biased' : '');
    }
    const style = document.createElement('style');
    style.textContent = `.causal-table tr.biased td{background:var(--bad-soft)} .causal-table tr.biased td:last-child{color:var(--warn);font-weight:700} .causal-table tr.truth td{font-weight:700} .causal-table tr.muted td{color:var(--muted)} .causal-table td:last-child,.causal-table th:last-child{text-align:left}
.lab-stage:is(:fullscreen,.expanded) .causal-table :is(th,td){padding-block:5px}
@media (max-width: 640px) { .table-card .causal-table{font-size:11px;width:100%;min-width:0} .causal-table th,.causal-table td{white-space:normal;padding:6px 2px} .causal-table td:nth-child(2),.causal-table td:nth-child(4){white-space:nowrap} }`;
    tableHost.replaceChildren(style, t);
  }

  // ---- drawing: the repeated studies ----------------------------------------------------------------------

  // Round tick positions inside [lo, hi].
  function ticksFor(lo, hi) {
    const raw = (hi - lo) / 5, mag = 10 ** Math.floor(Math.log10(raw || 1));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(m => m >= raw) ?? raw;
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Number(v.toPrecision(10)));
    return out;
  }
  function sizeCanvas(canvas) {
    const ctx = canvas.getContext('2d'), { width, height } = canvas.getBoundingClientRect(), ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { ctx, width, height };
  }

  function drawRepeat() {
    const { ctx, width, height } = sizeCanvas(repeatCanvas), t = theme();
    const truth = (runValues ?? values()).effect;
    const wantCollider = (runValues ?? values()).collider;
    const ids = ['naive', 'stratified', 'regression', 'ipw', ...(wantCollider ? ['collider'] : []), 'randomized'];
    const stats = runs.length ? summarizeRepeats(runs, truth).filter(r => ids.includes(r.id)) : ids.map(id => ({ id, count: 0, xs: [] }));
    const labelOf = r => shortName(r.id) + (r.biased ? tr(' · biased', ' · berbias') : '');
    const statOf = r => (r.count ? tr(`bias ${signed(r.bias)} · spread ${num(r.sd)}`, `bias ${signed(r.bias)} · sebaran ${num(r.sd)}`) : '–');
    // Two lines per row (name, then numbers) when the rows are tall; one line (two columns) when the box is short.
    const m = { r: 14, t: 22, b: 36 };
    ctx.font = '600 12px system-ui, sans-serif'; const nameW = Math.max(...ids.map(id => ctx.measureText(labelOf({ id, biased: true })).width));   // worst case, so the axis does not move while a run fills
    ctx.font = '11px system-ui, sans-serif'; const statW = ctx.measureText(statOf({ count: 1, bias: -9.99, sd: 9.99 })).width;
    // In a very short box (a small screen in fullscreen) only the names fit beside the rows, not the numbers.
    const tiny = (height - m.t - m.b) / ids.length < 15;
    const twoLineW = Math.min(width * 0.5, 6 + Math.max(nameW, statW) + 10), oneLineW = tiny ? 6 + nameW + 10 : 6 + nameW + 12 + statW + 10;
    const oneLine = (height - m.t - m.b) / ids.length < 36 && width - oneLineW - m.r >= width * 0.4;
    m.l = oneLine ? oneLineW : twoLineW;
    const plotW = width - m.l - m.r, plotH = height - m.t - m.b, rowH = plotH / ids.length;
    const all = stats.flatMap(r => r.xs ?? []).concat(truth);
    const lo0 = Math.min(...all), hi0 = Math.max(...all), pad = (hi0 - lo0) * 0.06 || 0.5;
    const lo = lo0 - pad, hi = hi0 + pad;
    const X = v => m.l + (v - lo) / (hi - lo) * plotW;
    ctx.fillStyle = t.plot; ctx.fillRect(m.l, m.t, plotW, plotH);
    ctx.font = '11px system-ui, sans-serif'; ctx.strokeStyle = t.grid; ctx.fillStyle = t.muted; ctx.lineWidth = 1;
    ctx.beginPath();
    for (const v of ticksFor(lo, hi)) { ctx.moveTo(X(v), m.t); ctx.lineTo(X(v), m.t + plotH); ctx.textAlign = 'center'; ctx.fillText(minus(fmt(v)), X(v), m.t + plotH + 14); }
    for (let i = 1; i < ids.length; i++) { ctx.moveTo(m.l, m.t + i * rowH); ctx.lineTo(m.l + plotW, m.t + i * rowH); }
    ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillText(tr('Estimated effect', 'Efek yang diestimasi'), m.l + plotW / 2, height - 5);
    // The true effect.
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = t.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(truth), m.t - 4); ctx.lineTo(X(truth), m.t + plotH); ctx.stroke(); ctx.restore();
    ctx.fillStyle = t.ink; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(tr(`True effect ${num(truth)}`, `Efek sebenarnya ${num(truth)}`), Math.min(width - m.r - 50, Math.max(m.l + 50, X(truth))), m.t - 8);
    stats.forEach((s, i) => {
      const cy = m.t + (i + 0.5) * rowH;
      ctx.textAlign = 'left'; ctx.font = '600 12px system-ui, sans-serif'; ctx.fillStyle = t.ink;
      ctx.fillText(labelOf(s), 6, oneLine ? cy + 4 : cy - 2);
      ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = s.biased ? clusterColor(1) : t.muted;
      if (!(oneLine && tiny)) ctx.fillText(statOf(s), oneLine ? 6 + nameW + 12 : 6, cy + (oneLine ? 4 : 13));
      if (!s.count) return;
      const jitter = rng(101 + i);
      ctx.save(); ctx.beginPath(); ctx.rect(m.l, m.t, plotW, plotH); ctx.clip(); ctx.globalAlpha = 0.4; ctx.fillStyle = clusterColor(0);
      for (const x of s.xs) { ctx.beginPath(); ctx.arc(X(x), cy + (jitter() - 0.5) * rowH * 0.62, 2.3, 0, 2 * Math.PI); ctx.fill(); }
      ctx.restore();
      const mx = X(s.mean), color = s.biased ? clusterColor(1) : clusterColor(2);
      ctx.beginPath(); ctx.moveTo(mx, cy - 8); ctx.lineTo(mx + 6, cy); ctx.lineTo(mx, cy + 8); ctx.lineTo(mx - 6, cy); ctx.closePath();
      ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = t.ink; ctx.stroke();
    });
    if (running) { ctx.fillStyle = t.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(`${fmt(runs.length)} / ${fmt(REPEATS)}`, width - m.r, 11); }
    if (!runs.length && !running) { ctx.fillStyle = t.muted; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(tr('Nothing run yet', 'Belum ada yang dijalankan'), m.l + plotW / 2, m.t + plotH / 2); }
    // The words for the hint and for assistive technology.
    const summary = stats.filter(s => s.count);
    if (!summary.length) {
      repeatHint.textContent = repeatIdle();
      lab.describe(repeatCanvas, tr('No repeated studies yet.', 'Belum ada studi yang diulang.'));
      return;
    }
    repeatHint.textContent = tr(
      'Dot: one study. Diamond: the average. Dashed: the truth. Bias = average − truth.',
      'Titik: satu studi. Berlian: rata-rata. Putus-putus: efek sebenarnya. Bias = rata-rata − efek sebenarnya.');
    lab.describe(repeatCanvas, tr(
      `${fmt(runs.length)} studies, each on a new population with these settings; bias is the average estimate minus the true effect, spread is how much the estimates scatter. `,
      `${fmt(runs.length)} studi, masing-masing pada populasi baru dengan pengaturan ini; bias adalah rata-rata estimasi dikurangi efek sebenarnya, sebaran menunjukkan seberapa tersebar estimasinya. `) + summary.map(s => tr(
      `${shortName(s.id)}: average ${num(s.mean)}, bias ${signed(s.bias)}, spread ${num(s.sd)}${s.biased ? ', biased' : ''}.`,
      `${shortName(s.id)}: rata-rata ${num(s.mean)}, bias ${signed(s.bias)}, sebaran ${num(s.sd)}${s.biased ? ', berbias' : ''}.`)).join(' '));
  }

  // ---- drawing: power and peeking -------------------------------------------------------------------------

  function drawPower() {
    const v = values();
    const peeking = Boolean(v.peeking);
    controls.show('looks', peeking);
    controls.disable('designEffect', peeking); controls.disable('designSd', peeking);
    if (peeking) { drawPeeking(v); return; }
    const c = powerCurve({ effect: v.designEffect, sd: v.designSd, alpha: v.alpha, n: v.designN });
    const title = tr('Power against sample size', 'Power menurut ukuran sampel');
    powerTitle.textContent = title; powerCanvas.setAttribute('aria-label', title);
    drawLineChart(powerCanvas, {
      series: [
        { xs: c.xs, ys: c.ys, color: clusterColor(0), points: false },
        { xs: [c.xs[0], c.xs[c.xs.length - 1]], ys: [0.8, 0.8], color: theme().muted, dash: true, points: false },
        { xs: [v.designN], ys: [c.power], color: clusterColor(1) },
      ],
      xLabel: tr('People per group', 'Orang per kelompok'), yLabel: tr('Power', 'Power'), yMin: 0, yMax: 1, xMin: 0, xMax: c.xMax,
      markerX: v.designN, markerLabel: tr(`${fmt(v.designN)} per group`, `${fmt(v.designN)} per kelompok`),
    });
    const need = Number.isFinite(c.nFor80) ? fmt(c.nFor80) : '–';
    const text = tr(
      `Power is the chance a trial detects a real effect. With ${fmt(v.designN)} people per group the power is ${pct(c.power)}; ${need} per group reach 80% (dashed line). At this size the smallest effect found with 80% power is ${num(c.mde)}.`,
      `Power adalah peluang uji coba mendeteksi efek yang nyata. Dengan ${fmt(v.designN)} orang per kelompok, power-nya ${pct(c.power)}; ${need} per kelompok mencapai 80% (garis putus-putus). Pada ukuran ini efek terkecil yang terdeteksi dengan power 80% adalah ${num(c.mde)}.`);
    powerHint.textContent = tr(
      `${fmt(v.designN)} per group: power ${pct(c.power)}. ${need} per group reach 80%.`,
      `${fmt(v.designN)} per kelompok: power ${pct(c.power)}. ${need} per kelompok mencapai 80%.`);
    lab.describe(powerCanvas, text);
  }

  function drawPeeking(v) {
    const key = `${v.designN}|${v.alpha}`;
    if (key !== peekKey) { peek = peekingCurve({ n: v.designN, alpha: v.alpha, maxLooks: RANGES.looks.max, runs: PEEK_RUNS, seed: 11 }); peekKey = key; }
    const looks = Math.min(v.looks, peek.looks.length);
    const title = tr('False positives when you peek', 'False positive saat kamu mengintip');
    powerTitle.textContent = title; powerCanvas.setAttribute('aria-label', title);
    const top = Math.max(...peek.peek, v.alpha) * 1.55;
    drawLineChart(powerCanvas, {
      series: [
        { xs: peek.looks, ys: peek.peek, color: clusterColor(1), label: tr('Peeking', 'Mengintip') },
        { xs: peek.looks, ys: peek.bonferroni, color: clusterColor(2), label: tr('Corrected', 'Dikoreksi') },
        { xs: [peek.looks[0], peek.looks[peek.looks.length - 1]], ys: [v.alpha, v.alpha], color: theme().muted, dash: true, points: false, label: tr('Target (alpha)', 'Target (alpha)') },
      ],
      xLabel: tr('Number of looks', 'Jumlah pengecekan'), yLabel: tr('False positive rate', 'Laju false positive'), yMin: 0, yMax: top, integerX: true,
      markerX: looks, markerLabel: tr(`${fmt(looks)} looks`, `${fmt(looks)} pengecekan`),
    });
    const text = tr(
      `There is no real effect, yet each look is another chance for a fluke. Checking ${fmt(looks)} times and stopping at the first significant result gives ${pct(peek.peek[looks - 1])} false positives instead of ${pct(v.alpha)}. Testing each look at alpha divided by the number of looks keeps it near ${pct(peek.bonferroni[looks - 1])}. ${fmt(v.designN)} people per group, ${fmt(PEEK_RUNS)} simulated trials.`,
      `Tidak ada efek nyata, tetapi tiap pengecekan adalah satu kesempatan lagi untuk hasil kebetulan. Mengecek ${fmt(looks)} kali dan berhenti pada hasil signifikan pertama memberi ${pct(peek.peek[looks - 1])} false positive, bukan ${pct(v.alpha)}. Menguji tiap pengecekan pada alpha dibagi jumlah pengecekan menjaganya di sekitar ${pct(peek.bonferroni[looks - 1])}. ${fmt(v.designN)} orang per kelompok, ${fmt(PEEK_RUNS)} uji coba simulasi.`);
    powerHint.textContent = tr(
      `No real effect, ${fmt(looks)} looks: ${pct(peek.peek[looks - 1])} false positives, not ${pct(v.alpha)}. Corrected: ${pct(peek.bonferroni[looks - 1])}.`,
      `Tanpa efek nyata, ${fmt(looks)} pengecekan: ${pct(peek.peek[looks - 1])} false positive, bukan ${pct(v.alpha)}. Dikoreksi: ${pct(peek.bonferroni[looks - 1])}.`);
    lab.describe(powerCanvas, text);
  }

  // ---- redraw -----------------------------------------------------------------------------------------------

  // A control redraws only what it can change: the population controls the plot, the table and the (cleared) repeat
  // chart, the power controls the power chart, so a slider drag at a large sample size does not refit every estimator.
  const PLOT_PARTS = ['plot', 'table'], DATA_PARTS = ['plot', 'table', 'repeat'], POWER_PARTS = ['power'];
  const ALL_PARTS = ['plot', 'table', 'repeat', 'power'];
  function draw(parts = ALL_PARTS) {
    if (destroyed) return;
    if (parts.includes('plot') || parts.includes('table')) {
      const s = ensureStudy();
      if (parts.includes('plot')) drawPlot(s);
      if (parts.includes('table')) drawTable(s);
    }
    if (parts.includes('repeat')) drawRepeat();
    if (parts.includes('power')) drawPower();
  }
  // Slider input fires many times a second; one redraw per frame is enough.
  let queuedParts = new Set();
  function queueDraw(parts = ALL_PARTS) {
    parts.forEach(p => queuedParts.add(p));
    if (!drawQueued) drawQueued = requestAnimationFrame(() => { drawQueued = 0; const todo = [...queuedParts]; queuedParts = new Set(); draw(todo); });
  }

  lab.onReset(() => {
    clearRepeats(true);
    for (const name of [...DATA_CONTROLS, 'designEffect', 'designSd', 'designN', 'alpha', 'looks', 'peeking']) controls.set(name, DEFAULTS[name]);
    controls.set('showRct', false);
    rctSeed = 1; rctRuns = 0; studyKey = ''; peekKey = '';
    box.reset();
    draw();
  });
  lab.onTheme(() => draw());
  lab.onResize(() => draw());
  lab.cleanup(() => { destroyed = true; cancelAnimationFrame(raf); cancelAnimationFrame(drawQueued); });
  draw();
  return lab.destroy;
}
