// Bootstrap lab, built on the kit. A fixed population of cases holds one flag per case: the model was right
// or wrong, so its true accuracy is known exactly. Draw samples of n cases and watch the sample accuracies
// pile up around the truth, then bootstrap ONE sample (resample it with replacement B times) to build an
// interval from that sample alone, and run 200 experiments to see how often such an interval contains the
// truth. "Generated data" is 5,000 cases at 85% accuracy; "Penguins (real)" is a fixed 5-nearest-neighbors
// classifier of species scored leave-one-out on every penguin that has both measurements (NA rows are left out
// and the lab says so). The math is in sims/ml/uncertainty.js and sims/ml/bootstraplab.js; this file draws and wires.
import { createLab, dataModeSpec, loadDataset, predictBox, clusterColor, theme, tr, fmt, pct } from '../kit/index.js';
import { bootstrapMeans, percentileCI, coverageRuns, binomialSE, mean } from '../ml/uncertainty.js';
import {
  generatedPopulation, penguinPopulation, scrambleSeed, drawBatch, sampleSd, binSpec, histogram,
  bandHalfWidth, quadruplePair, POP_SIZE,
} from '../ml/bootstraplab.js';

export const DEFAULTS = { n: 100, times: 200, B: 500, seed: 41 };
export const EXPERIMENTS = 200;      // experiments in the coverage check
const ALPHA = 0.05;                  // 95% intervals
const CHUNK = 10;                    // experiments per slice of the coverage run, so the page stays responsive
const MAX_PILE = 5000;
const RANGES = { generated: [0.5, 1], penguins: [0.4, 1] };
const MIN_FOR_BAND = 20;             // the middle-95% band needs at least this many samples to mean anything
const COV_SEED = 7001, BOOT_SEED = 3001;

const pc = v => (Number.isFinite(v) ? pct(v, 1) : '–');
const points = v => (Number.isFinite(v) ? `${fmt(v * 100, { digits: 1 })}` : '–');

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Sampling variability and the bootstrap', 'Variabilitas sampling dan bootstrap'),
    hint: tr(
      'A model has one true accuracy on a fixed population, but every sample of cases gives a slightly different score. Draw samples, then use the bootstrap on one sample to build an interval.',
      'Sebuah model punya satu true accuracy pada populasi yang tetap, tetapi setiap sampel kasus memberi skor yang sedikit berbeda. Ambil sampel, lalu pakai bootstrap pada satu sampel untuk membuat interval.'),
    status: true, legend: true,
    canvasLabel: tr('Histogram of the accuracies of many samples, with the true accuracy, the middle 95% of the samples and the bootstrap interval of the last sample marked', 'Histogram accuracy dari banyak sampel, dengan true accuracy, 95% tengah dari sampel, dan interval bootstrap dari sampel terakhir ditandai'),
    extra: {
      title: tr('The numbers behind the picture', 'Angka di balik gambar'),
      hint: tr('Accuracy is the share of cases the model got right. Points are percentage points.', 'Accuracy adalah porsi kasus yang dijawab benar oleh model. Poin berarti poin persentase.'),
    },
  });
  // The histogram is a picture, not something to drag: no tab stop, announced as an image.
  lab.canvas.setAttribute('role', 'img');
  lab.canvas.removeAttribute('tabindex');
  lab.canvas.style.setProperty('--plot-h', 'clamp(300px, 46vh, 420px)');

  let mode = 'generated', real = null, loading = false, loadFailed = false, loadToken = 0, destroyed = false;
  let genPop = null, counter = 0, timer = 0, covToken = 0;
  let pile = [], last = null, boot = null, cov = null;
  const seen = new Map();   // sample sizes the learner has looked at, for the "quadruple n" quiz

  const controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real)', 'Penguin (data nyata)')]] }),
    { name: 'n', type: 'range', label: tr('Sample size n', 'Ukuran sampel n'), min: 20, max: 1000, step: 10, value: DEFAULTS.n },
    { name: 'times', type: 'range', label: tr('Number of repeated samples', 'Jumlah sampel berulang'), min: 10, max: 1000, step: 10, value: DEFAULTS.times },
    { name: 'one', type: 'button', group: tr('Draw samples', 'Ambil sampel'), label: tr('Draw one sample', 'Ambil satu sampel'), onClick: () => drawMore(1) },
    { name: 'many', type: 'button', label: tr(`Draw ${fmt(DEFAULTS.times)} samples`, `Ambil ${fmt(DEFAULTS.times)} sampel`), onClick: () => drawMore(controls.get('times'), true) },
    { name: 'clear', type: 'button', label: tr('Clear samples', 'Hapus sampel'), onClick: () => { clearSamples(); settle(); } },
    { name: 'B', type: 'range', label: tr('Bootstrap resamples B', 'Resample bootstrap B'), min: 100, max: 1000, step: 100, value: DEFAULTS.B },
    { name: 'showBoot', type: 'toggle', label: tr('Show the bootstrap resamples', 'Tampilkan resample bootstrap'), value: true },
  ], name => {
    if (name === 'data') { setMode(controls.get('data')); return; }
    if (name === 'times') { syncLabels(); return; }
    if (name === 'n') { clearSamples(); drawMore(controls.get('times'), true); return; }
    if (name === 'B') { cancelCoverage(); cov = null; makeBoot(); settle(); return; }
    settle();   // the toggle
  });
  const [, btnMany] = [...controls.el.querySelectorAll('button')];
  // On a wide screen the three draw buttons share one row, which keeps the Parameters card short (the docked Quick Quiz button sits under it).
  const panelStyle = document.createElement('style');
  panelStyle.textContent = '@media (min-width: 861px) { .panel .button-group { grid-template-columns: repeat(3, 1fr); gap: 6px; } .panel .button-group .panel-button { padding: 6px 4px; font-size: 12px; } .settings .panel div.slider-label, .settings .panel label.toggle { margin-top: 10px; } .panel .button-group { margin-top: 12px; } .panel .group-label { margin-top: 12px; } }';
  controls.el.prepend(panelStyle);
  // Notes live with the picture, not in the Parameters card, so that card stays short and the Quick Quiz button
  // docked under it stays on screen. The load-failure line sits above the plot where it cannot be missed.
  const failNote = document.createElement('p');
  failNote.className = 'hint error';
  failNote.setAttribute('role', 'status');
  failNote.hidden = true;
  failNote.style.cssText = 'color:var(--warn);font-weight:600';
  lab.canvas.closest('.chart').before(failNote);
  const pileNote = document.createElement('p');
  pileNote.className = 'hint';
  pileNote.textContent = tr(
    'Draw one sample adds it to the pile. Drawing many samples, changing n or switching the data starts a new pile.',
    'Ambil satu sampel menambahkannya ke tumpukan. Mengambil banyak sampel, mengubah n, atau mengganti data memulai tumpukan baru.');
  const dataNote = document.createElement('p');
  dataNote.className = 'hint';
  dataNote.setAttribute('role', 'status');
  lab.ref('legend').after(pileNote, dataNote);
  function syncLabels() {
    const k = controls.get('times');
    btnMany.textContent = tr(`Draw ${fmt(k)} samples`, `Ambil ${fmt(k)} sampel`);
  }

  // ---- the coverage card: a meter, its readout, and the first intervals as a picture ----------------------

  const covCanvas = lab.chartCard(
    tr('Do the intervals keep their promise?', 'Apakah interval itu menepati janjinya?'),
    tr(`Each line is the bootstrap 95% interval of one experiment (the first ${fmt(60)} are shown). A line that misses the dashed true-accuracy line is drawn thick and marked with a cross.`, `Setiap garis adalah interval bootstrap 95% dari satu eksperimen (${fmt(60)} yang pertama ditampilkan). Garis yang tidak menyentuh garis putus-putus true accuracy digambar tebal dan diberi tanda silang.`),
    320);
  const covCard = covCanvas.closest('.card');
  const meterBox = document.createElement('div');
  meterBox.className = 'cov-meter';
  meterBox.innerHTML = '<style>.cov-meter{margin:12px 0 4px}.cov-meter .bar{position:relative;height:20px;border-radius:10px;background:var(--grid);overflow:visible}.cov-meter .fill{position:absolute;left:0;top:0;bottom:0;border-radius:10px;width:0;transition:width .2s}.cov-meter .mark{position:absolute;top:-4px;bottom:-4px;width:0;border-left:2px dashed var(--ink)}.cov-meter .ticks{position:relative;height:16px;margin-top:6px;font-size:11px;color:var(--muted)}.cov-meter .ticks span{position:absolute;transform:translateX(-50%);white-space:nowrap}.cov-meter .ticks span:first-child{transform:none}.cov-meter .read{margin:8px 0 0;font-size:14px}.cov-meter .prog{margin:4px 0 0}</style><div class="bar" role="meter" aria-valuemin="0" aria-valuemax="100"><div class="fill"></div><div class="mark" style="left:95%"></div></div><div class="ticks" aria-hidden="true"><span style="left:0">0%</span><span style="left:95%">95%</span></div><p class="read" role="status"></p><p class="hint prog" aria-hidden="true"></p>';
  // The run button lives in this card, next to the meter it fills. It stays focusable while running
  // (aria-disabled instead of disabled), so a keyboard user keeps their place.
  const runRow = document.createElement('div');
  runRow.className = 'cov-run-row';
  const btnCover = document.createElement('button');
  btnCover.type = 'button'; btnCover.className = 'btn cov-run'; btnCover.setAttribute('aria-disabled', 'false');
  btnCover.textContent = tr(`Run ${fmt(EXPERIMENTS)} experiments`, `Jalankan ${fmt(EXPERIMENTS)} eksperimen`);
  btnCover.addEventListener('click', () => runCoverage());
  const runNote = document.createElement('p');
  runNote.className = 'hint';
  runNote.textContent = tr(
    'Each experiment draws a fresh sample, bootstraps it with B resamples and checks whether its 95% interval contains the true accuracy.',
    'Setiap eksperimen mengambil sampel baru, mem-bootstrap-nya dengan B resample, lalu memeriksa apakah interval 95%-nya mencakup true accuracy.');
  const runStyle = document.createElement('style');
  runStyle.textContent = '.cov-run-row{margin:10px 0 0}.cov-run[aria-disabled="true"]{opacity:.7;cursor:default}.cov-run[aria-disabled="true"]:hover{border-color:var(--line-strong);background:var(--surface)}';
  runRow.append(runStyle, btnCover);
  covCard.querySelector('.chart').before(runRow, runNote, meterBox);
  const setCoverBusy = busy => btnCover.setAttribute('aria-disabled', String(Boolean(busy)));
  const meter = meterBox.querySelector('[role=meter]'), meterFill = meterBox.querySelector('.fill');
  const meterRead = meterBox.querySelector('.read'), meterProg = meterBox.querySelector('.prog');

  // ---- Quick Quiz ------------------------------------------------------------------------------------------

  const box = predictBox(lab.ref('below'), {
    hint: tr('Draw samples at one sample size, then at about four times that size (for example 100, then 400), and check again.', 'Ambil sampel pada satu ukuran sampel, lalu pada ukuran sekitar empat kali lipatnya (misalnya 100, lalu 400), dan periksa lagi.'),
    name: 'predict-width',
    question: tr('If you quadruple the sample size, what happens to the width of the interval?', 'Kalau ukuran sampel dikalikan empat, apa yang terjadi pada lebar intervalnya?'),
    choices: [
      ['same', tr('It stays about the same', 'Hampir tidak berubah')],
      ['half', tr('It becomes about half as wide', 'Menjadi sekitar setengahnya')],
      ['quarter', tr('It becomes about a quarter as wide', 'Menjadi sekitar seperempatnya')],
    ],
  });
  lab.cleanup(() => box.destroy());
  box.onPick(revealPrediction);
  box.onCheck(revealPrediction);

  // ---- data -----------------------------------------------------------------------------------------------

  const population = () => (mode === 'penguins' && real ? real.flags : (genPop ??= generatedPopulation()));
  const truth = () => mean(population());
  const range = () => RANGES[mode === 'penguins' && real ? 'penguins' : 'generated'];
  const sizeN = () => controls.get('n');
  const sizeB = () => controls.get('B');

  async function setMode(next) {
    const token = ++loadToken;
    cancelCoverage(); cov = null; loadFailed = false;
    if (next === 'generated') { mode = 'generated'; loading = false; clearSamples(); drawMore(controls.get('times'), true); return; }
    loading = true; mode = next; clearSamples(); draw();
    try {
      const table = await loadDataset(next);
      if (destroyed || token !== loadToken) return;
      real = penguinPopulation(table);
      loading = false;
    } catch {
      if (destroyed || token !== loadToken) return;
      loading = false; loadFailed = true; mode = 'generated';
      controls.set('data', 'generated');
    }
    clearSamples();
    drawMore(controls.get('times'), true);
  }

  function clearSamples() {
    pile = []; last = null; boot = null; cov = null;
    cancelCoverage();
  }

  // Draws `times` samples. `replace`: a fresh pile instead of adding to the one on screen. The last sample drawn
  // is the one the bootstrap panel resamples.
  function drawMore(times, replace = false) {
    if (loading) return;
    const res = drawBatch(population(), sizeN(), times, scrambleSeed(DEFAULTS.seed, ++counter));
    pile = replace ? res.means : pile.concat(res.means).slice(-MAX_PILE);
    last = { flags: res.last, mean: mean(res.last) };
    makeBoot();
    recordSeen();
    settle();
  }

  function makeBoot() {
    if (!last) { boot = null; return; }
    const B = sizeB();
    const means = bootstrapMeans(last.flags, B, scrambleSeed(BOOT_SEED, counter * 1000 + B));
    const [lo, hi] = percentileCI(means, ALPHA);
    boot = { means, lo, hi, B, contains: lo <= truth() && truth() <= hi };
  }

  const band = () => (pile.length >= MIN_FOR_BAND ? percentileCI(pile, ALPHA) : null);

  function recordSeen() {
    const b = band();
    seen.set(sizeN(), b ? b[1] - b[0] : null);
  }

  // ---- coverage -------------------------------------------------------------------------------------------

  function cancelCoverage() {
    covToken += 1; clearTimeout(timer);
    setCoverBusy(false);
  }

  function runCoverage() {
    if (loading || cov?.running) return;
    const token = ++covToken, pop = population(), n = sizeN(), B = sizeB();
    cov = { runs: [], running: true, n, B };
    setCoverBusy(true);
    drawCoverage();
    const step = () => {
      if (destroyed || token !== covToken) return;
      cov.runs.push(...coverageRuns({ pop, n, B, experiments: CHUNK, alpha: ALPHA, seed: scrambleSeed(COV_SEED, ++counter) }));
      if (cov.runs.length < EXPERIMENTS) { drawCoverage(); timer = setTimeout(step, 0); return; }
      cov.running = false;
      setCoverBusy(false);
      drawCoverage();
    };
    timer = setTimeout(step, 0);
  }
  lab.cleanup(() => { destroyed = true; loadToken += 1; covToken += 1; clearTimeout(timer); });

  function coverageShare() { return cov && cov.runs.length ? cov.runs.filter(r => r.covered).length / cov.runs.length : null; }

  function coverageText() {
    if (!cov) return tr(`Press “Run ${fmt(EXPERIMENTS)} experiments” to find out.`, `Tekan “Jalankan ${fmt(EXPERIMENTS)} eksperimen” untuk mengetahuinya.`);
    const share = coverageShare();
    if (cov.running) return tr(`Running… ${fmt(cov.runs.length)} of ${fmt(EXPERIMENTS)} experiments done.`, `Berjalan… ${fmt(cov.runs.length)} dari ${fmt(EXPERIMENTS)} eksperimen selesai.`);
    const slack = 1.96 * Math.sqrt(0.95 * 0.05 / EXPERIMENTS);
    const base = tr(
      `${pc(share)} of the ${fmt(EXPERIMENTS)} intervals contain the true accuracy. A 95% interval promises about 95%, and with ${fmt(EXPERIMENTS)} experiments the figure itself can be off by about ${fmt(slack * 100, { digits: 1 })} points.`,
      `${pc(share)} dari ${fmt(EXPERIMENTS)} interval mencakup true accuracy. Interval 95% menjanjikan sekitar 95%, dan dengan ${fmt(EXPERIMENTS)} eksperimen angkanya sendiri bisa meleset sekitar ${fmt(slack * 100, { digits: 1 })} poin.`);
    let more;
    if (share < 0.95 - slack) more = tr(' It falls short of the promise: with few cases the bootstrap interval is a little too narrow. Raise n and run again.', ' Hasilnya di bawah janji: dengan kasus yang sedikit, interval bootstrap sedikit terlalu sempit. Naikkan n lalu jalankan lagi.');
    else if (share > 0.95 + slack) more = tr(' It is above the promise: this run happened to produce wide intervals.', ' Hasilnya di atas janji: eksperimen kali ini kebetulan menghasilkan interval yang lebar.');
    else more = tr(' That is close to the promise.', ' Itu mendekati janjinya.');
    return base + more;
  }

  // ---- quick quiz verdict ----------------------------------------------------------------------------------

  function revealPrediction() {
    if (box.chosen() == null) return;
    const pair = quadruplePair([...seen.keys()]);
    if (!pair) return;   // not tried yet: the box tells the learner what to do first
    const [a, b] = pair, p = truth();
    const wa = 2 * bandHalfWidth(p, a), wb = 2 * bandHalfWidth(p, b);
    const own = seen.get(a) != null && seen.get(b) != null
      ? tr(` Your own piles gave ${points(seen.get(a))} and ${points(seen.get(b))}.`, ` Tumpukan sampelmu memberi ${points(seen.get(a))} dan ${points(seen.get(b))}.`)
      : '';
    box.reveal('half', tr(
      `On average, the middle 95% of sample accuracies spans ${points(wa)} points at n = ${fmt(a)} and ${points(wb)} points at n = ${fmt(b)}.${own} Four times the cases halves the width, because n sits under a square root. The bootstrap interval of one sample follows the same rule.`,
      `Rata-rata, 95% tengah dari accuracy sampel selebar ${points(wa)} poin pada n = ${fmt(a)} dan ${points(wb)} poin pada n = ${fmt(b)}.${own} Kasus empat kali lebih banyak membuat lebarnya separuh, karena n berada di bawah akar kuadrat. Interval bootstrap dari satu sampel mengikuti aturan yang sama.`));
  }

  // ---- drawing --------------------------------------------------------------------------------------------

  function setup(canvas, margin, span) {
    const ctx = canvas.getContext('2d'), t = theme();
    const { width, height } = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const [lo, hi] = span ?? range();
    const W = Math.max(1, width - margin.l - margin.r), H = Math.max(1, height - margin.t - margin.b);
    return { ctx, t, width, height, m: margin, W, H, lo, hi, X: v => margin.l + (v - lo) / (hi - lo) * W };
  }

  // Draws text that is shrunk, if needed, to fit in `maxW` pixels.
  function fitText(ctx, text, x, y, maxW, size = 12, floor = 9) {
    let s = size;
    ctx.font = `600 ${s}px system-ui, sans-serif`;
    while (s > floor && ctx.measureText(text).width > maxW) { s -= 0.5; ctx.font = `600 ${s}px system-ui, sans-serif`; }
    ctx.fillText(text, x, y);
  }

  // Draws the first of `texts` (longest first) that fits in `maxW` at 11px or more; the last one is drawn anyway.
  function fitFirst(ctx, texts, x, y, maxW) {
    ctx.font = '600 11px system-ui, sans-serif';
    const text = texts.find(tx => ctx.measureText(tx).width <= maxW) ?? texts[texts.length - 1];
    fitText(ctx, text, x, y, maxW, 12, 11);
  }

  const niceStep = max => [1, 2, 5, 10, 20, 25, 50].find(s => max / s <= 5) ?? 50;

  function frame(c, yMax, xTitle, yTitle, yTicks) {
    const { ctx, t, m, W, H, lo, hi, X } = c;
    ctx.fillStyle = t.plot; ctx.fillRect(m.l, m.t, W, H);
    ctx.strokeStyle = t.grid; ctx.fillStyle = t.muted; ctx.lineWidth = 1; ctx.font = '11px system-ui, sans-serif';
    ctx.beginPath();
    const tick = hi - lo <= 0.3 ? 0.05 : 0.1;
    for (let v = Math.ceil(lo / tick - 1e-9) * tick; v <= hi + 1e-9; v += tick) {
      ctx.moveTo(X(v), m.t); ctx.lineTo(X(v), m.t + H);
      ctx.textAlign = 'center'; ctx.fillText(pct(v, 0), X(v), m.t + H + 16);
    }
    if (yTicks) {
      const step = niceStep(yMax * 100);
      for (let v = 0; v <= yMax * 100 + 1e-9; v += step) {
        const y = m.t + H - v / 100 / yMax * H;
        ctx.moveTo(m.l, y); ctx.lineTo(m.l + W, y);
        ctx.textAlign = 'right'; ctx.fillText(fmt(v), m.l - 6, y + 4);
      }
    }
    ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillText(xTitle, m.l + W / 2, c.height - 6);
    if (yTitle) { ctx.save(); ctx.translate(13, m.t + H / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(yTitle, 0, 0); ctx.restore(); }
  }

  function drawHistogram() {
    const c = setup(lab.canvas, { l: 48, r: 24, t: 46, b: 40 });
    const { ctx, t, m, W, H, X } = c;
    const spec = binSpec(sizeN(), c.lo, c.hi);
    const shares = histogram(pile, spec);
    const bshares = boot && controls.get('showBoot') ? histogram(boot.means, spec) : null;
    // The tallest bar fills about two thirds of the height, leaving room for the interval drawn along the top.
    const yMax = Math.max(0.02, ...shares, ...(bshares ?? [])) * 1.5;
    frame(c, yMax, tr('Accuracy of a sample (share right)', 'Accuracy sebuah sampel (porsi benar)'), tr('Share per bar (%)', 'Porsi per batang (%)'), true);
    const Y = s => m.t + H - s / yMax * H;
    const b = band(), p = truth();

    ctx.save(); ctx.beginPath(); ctx.rect(m.l, m.t, W, H); ctx.clip();
    if (b) {
      ctx.globalAlpha = 0.17; ctx.fillStyle = clusterColor(2); ctx.fillRect(X(b[0]), m.t, X(b[1]) - X(b[0]), H);
      ctx.globalAlpha = 1; ctx.strokeStyle = clusterColor(2); ctx.lineWidth = 2; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(X(b[0]), m.t); ctx.lineTo(X(b[0]), m.t + H); ctx.moveTo(X(b[1]), m.t); ctx.lineTo(X(b[1]), m.t + H); ctx.stroke(); ctx.setLineDash([]);
    }
    shares.forEach((s, j) => {
      if (!s) return;
      const x0 = X(spec.left(j)), x1 = X(spec.right(j));
      ctx.fillStyle = clusterColor(0); ctx.globalAlpha = 0.85;
      ctx.fillRect(x0, Y(s), Math.max(1, x1 - x0 - (x1 - x0 > 4 ? 1 : 0)), m.t + H - Y(s));
    });
    ctx.globalAlpha = 1;
    if (bshares) {
      ctx.strokeStyle = clusterColor(1); ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
      bshares.forEach((s, j) => { const x0 = X(spec.left(j)), x1 = X(spec.right(j)), y = Y(s); if (j) ctx.lineTo(x0, y); else ctx.moveTo(x0, y); ctx.lineTo(x1, y); });
      ctx.stroke();
    }
    ctx.strokeStyle = t.ink; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(X(p), m.t); ctx.lineTo(X(p), m.t + H); ctx.stroke(); ctx.setLineDash([]);
    // the bootstrap interval of the last sample: a bar along the top with the sample accuracy as a diamond
    if (boot && last) {
      const y = m.t + 15;
      ctx.strokeStyle = clusterColor(1); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(X(boot.lo), y); ctx.lineTo(X(boot.hi), y); ctx.stroke();
      ctx.lineWidth = 2.5; ctx.beginPath();
      ctx.moveTo(X(boot.lo), y - 7); ctx.lineTo(X(boot.lo), y + 7); ctx.moveTo(X(boot.hi), y - 7); ctx.lineTo(X(boot.hi), y + 7); ctx.stroke();
      const dx = X(last.mean), r = 8;
      ctx.beginPath(); ctx.moveTo(dx, y - r); ctx.lineTo(dx + r, y); ctx.lineTo(dx, y + r); ctx.lineTo(dx - r, y); ctx.closePath();
      ctx.fillStyle = clusterColor(1); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = t.ink; ctx.stroke();
    }
    ctx.restore();
    // a small triangle on the axis under the true accuracy
    ctx.fillStyle = t.ink; ctx.beginPath(); ctx.moveTo(X(p), m.t + H + 1); ctx.lineTo(X(p) - 5, m.t + H + 8); ctx.lineTo(X(p) + 5, m.t + H + 8); ctx.closePath(); ctx.fill();

    // headline numbers above the plot
    ctx.textAlign = 'left'; ctx.fillStyle = t.ink;
    const swatch = (y, color) => { ctx.fillStyle = color; ctx.fillRect(m.l, y - 9, 10, 10); ctx.fillStyle = t.ink; };
    if (b) { swatch(16, clusterColor(2)); fitFirst(ctx, [tr(`Middle 95%: ${pc(b[0])} to ${pc(b[1])}`, `95% tengah: ${pc(b[0])} sampai ${pc(b[1])}`), `${tr('Middle 95%', '95% tengah')}: ${pc(b[0])} – ${pc(b[1])}`], m.l + 16, 16, c.width - m.l - 16 - 8); }
    if (boot) { swatch(34, clusterColor(1)); fitFirst(ctx, [tr(`Bootstrap 95% interval: ${pc(boot.lo)} to ${pc(boot.hi)}`, `Interval bootstrap 95%: ${pc(boot.lo)} sampai ${pc(boot.hi)}`), `Bootstrap 95%: ${pc(boot.lo)} – ${pc(boot.hi)}`], m.l + 16, 34, c.width - m.l - 16 - 8); }
    if (loading) { ctx.textAlign = 'center'; ctx.font = '600 13px system-ui, sans-serif'; ctx.fillText(tr('Loading the penguin data…', 'Memuat data penguin…'), m.l + W / 2, m.t + H / 2); }
    else if (!pile.length) { ctx.textAlign = 'center'; ctx.font = '600 13px system-ui, sans-serif'; ctx.fillText(tr('No samples yet. Press “Draw one sample”.', 'Belum ada sampel. Tekan “Ambil satu sampel”.'), m.l + W / 2, m.t + H / 2); }
  }

  function drawCoverage() {
    // The axis zooms to the intervals on show (to the nearest 5 points), so they are easy to tell apart.
    const first = cov ? cov.runs.slice(0, 60) : [];
    const [rl, rh] = range(), pt = truth();
    const span = first.length
      ? [Math.max(rl, Math.floor((Math.min(pt, ...first.map(r => r.lo)) - 0.005) * 20) / 20), Math.min(rh, Math.ceil((Math.max(pt, ...first.map(r => r.hi)) + 0.005) * 20) / 20)]
      : null;
    const c = setup(covCanvas, { l: 48, r: 24, t: 30, b: 40 }, span);
    const { ctx, t, m, W, H, X } = c;
    frame(c, 1, tr('Accuracy (share right)', 'Accuracy (porsi benar)'), tr('Experiment', 'Eksperimen'), false);
    const shown = cov ? cov.runs.slice(0, 60) : [];
    const rows = 60, rowH = H / rows, p = truth();
    ctx.save(); ctx.beginPath(); ctx.rect(m.l, m.t, W, H); ctx.clip();
    shown.forEach((r, i) => {
      const y = m.t + (i + 0.5) * rowH;
      ctx.strokeStyle = r.covered ? clusterColor(0) : clusterColor(1);
      ctx.lineWidth = r.covered ? 1.6 : 3.2;
      ctx.beginPath(); ctx.moveTo(X(r.lo), y); ctx.lineTo(X(r.hi), y); ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath(); ctx.arc(X(r.mean), y, r.covered ? 1.8 : 2.6, 0, 2 * Math.PI); ctx.fill();
      if (!r.covered) {
        const mx = X(r.mean < p ? r.hi : r.lo), s = 3.5;
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx - s, y - s); ctx.lineTo(mx + s, y + s); ctx.moveTo(mx - s, y + s); ctx.lineTo(mx + s, y - s); ctx.stroke();
      }
    });
    ctx.strokeStyle = t.ink; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(X(p), m.t); ctx.lineTo(X(p), m.t + H); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    ctx.textAlign = 'left'; ctx.fillStyle = t.ink;
    if (!shown.length) { ctx.textAlign = 'center'; ctx.font = '600 13px system-ui, sans-serif'; ctx.fillText(tr(`Press “Run ${fmt(EXPERIMENTS)} experiments”.`, `Tekan “Jalankan ${fmt(EXPERIMENTS)} eksperimen”.`), m.l + W / 2, m.t + H / 2); }
    // legend along the top: thin line = contains, thick line with a cross = misses
    ctx.textAlign = 'left';
    ctx.strokeStyle = clusterColor(0); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(m.l, 15); ctx.lineTo(m.l + 18, 15); ctx.stroke();
    ctx.fillStyle = t.ink; fitText(ctx, tr('contains the truth', 'mencakup'), m.l + 24, 19, W / 2 - 30, 11);
    const x2 = m.l + W / 2 + 4;
    ctx.strokeStyle = clusterColor(1); ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(x2, 15); ctx.lineTo(x2 + 18, 15); ctx.stroke();
    ctx.fillStyle = t.ink; fitText(ctx, tr('misses it (×)', 'meleset (×)'), x2 + 24, 19, W / 2 - 30, 11);

    // meter and readout
    const share = coverageShare();
    const v = share == null ? 0 : share * 100;
    meter.setAttribute('aria-valuenow', String(Math.round(v * 10) / 10));
    meter.setAttribute('aria-label', tr('Share of bootstrap intervals that contain the true accuracy', 'Porsi interval bootstrap yang mencakup true accuracy'));
    meter.setAttribute('aria-valuetext', share == null ? tr('not measured yet', 'belum diukur') : pc(share));
    meterFill.style.width = `${v}%`;
    meterFill.style.background = clusterColor(0);
    meterRead.textContent = cov?.running ? '' : coverageText();
    meterProg.textContent = cov?.running ? coverageText() : '';
    const misses = shown.filter(r => !r.covered).length;
    lab.describe(covCanvas, share == null
      ? tr('No experiments run yet.', 'Belum ada eksperimen yang dijalankan.')
      : tr(`${fmt(cov.runs.length)} experiments run. ${pc(share)} of the intervals contain the true accuracy ${pc(truth())}. Of the first ${fmt(shown.length)} shown, ${fmt(misses)} miss it.`, `${fmt(cov.runs.length)} eksperimen dijalankan. ${pc(share)} interval mencakup true accuracy ${pc(truth())}. Dari ${fmt(shown.length)} yang pertama ditampilkan, ${fmt(misses)} tidak mencakupnya.`));
  }

  // ---- the table, notes and readouts -----------------------------------------------------------------------

  function table() {
    const b = band(), p = truth(), n = sizeN();
    const dash = '–';
    const yes = tr('Yes', 'Ya'), no = tr('No', 'Tidak');
    const to = (lo, hi) => tr(`${pc(lo)} to ${pc(hi)}`, `${pc(lo)} sampai ${pc(hi)}`);
    const rows = [
      [tr('Population size', 'Ukuran populasi'), fmt(population().length)],
      [tr('True accuracy', 'True accuracy'), pc(p)],
      [tr('Sample size n', 'Ukuran sampel n'), fmt(n)],
      [tr('Samples drawn', 'Sampel yang diambil'), fmt(pile.length)],
      [tr('Middle 95% of the sample accuracies', '95% tengah dari accuracy sampel'), b ? to(b[0], b[1]) : dash],
      [tr('Spread of the sample accuracies (standard deviation, in points)', 'Sebaran accuracy sampel (simpangan baku, dalam poin)'), pile.length > 1 ? points(sampleSd(pile)) : dash],
      [tr('Textbook standard error √(p(1 − p)/n), in points', 'Standard error rumus buku √(p(1 − p)/n), dalam poin'), points(binomialSE(p, n))],
      [tr('Accuracy of the last sample', 'Accuracy sampel terakhir'), last ? pc(last.mean) : dash],
      [tr('Bootstrap 95% interval of the last sample', 'Interval bootstrap 95% dari sampel terakhir'), boot ? to(boot.lo, boot.hi) : dash],
      [tr('Width of that interval, in points', 'Lebar interval itu, dalam poin'), boot ? points(boot.hi - boot.lo) : dash],
      [tr('Does that interval contain the true accuracy?', 'Apakah interval itu mencakup true accuracy?'), boot ? (boot.contains ? yes : no) : dash],
    ];
    const t = document.createElement('table');
    t.className = 'stats-table';
    t.innerHTML = '<thead><tr></tr></thead>';
    for (const h of [tr('Quantity', 'Besaran'), tr('Value', 'Nilai')]) { const th = document.createElement('th'); th.textContent = h; t.querySelector('tr').append(th); }
    const body = document.createElement('tbody');
    for (const [name, value] of rows) { const r = body.insertRow(); r.insertCell().textContent = name; r.insertCell().textContent = value; }
    t.append(body);
    const style = document.createElement('style');
    style.textContent = '.table-scroll .stats-table{width:100%;min-width:100%}.stats-table td:last-child,.stats-table th:last-child{text-align:right}@media (max-width: 640px) { .stats-table { font-size: 12px; } .stats-table th, .stats-table td { white-space: normal; padding: 6px 5px; } .stats-table td:last-child { white-space: nowrap; } }';
    lab.extraEl.replaceChildren(style, t);
  }

  function noteText() {
    const n = sizeN(), pop = population();
    const more = n > pop.length ? tr(` A sample of ${fmt(n)} is larger than this population of ${fmt(pop.length)}: that is fine, because every draw puts the case back.`, ` Sampel ${fmt(n)} lebih besar dari populasi ${fmt(pop.length)} ini: itu tidak masalah, karena setiap pengambilan mengembalikan kasusnya.`) : '';
    if (mode === 'penguins' && real) {
      return tr(
        `Population: ${fmt(real.kept)} of ${fmt(real.total)} penguins; ${fmt(real.dropped)} rows with a missing value (NA) in flipper length or body mass are left out. A fixed ${fmt(real.k)}-nearest-neighbors classifier of species, using those two measurements, classifies each penguin from all the others. A case is right when its species is predicted correctly. True accuracy: ${pc(real.accuracy)}. Samples are drawn with replacement.${more}`,
        `Populasi: ${fmt(real.kept)} dari ${fmt(real.total)} penguin; ${fmt(real.dropped)} baris dengan missing value (NA) pada panjang sirip atau massa tubuh dibuang. Classifier ${fmt(real.k)}-nearest-neighbors yang tetap, untuk spesies dengan dua pengukuran itu, mengklasifikasikan tiap penguin dari semua penguin lainnya. Sebuah kasus benar jika spesiesnya diprediksi dengan tepat. True accuracy: ${pc(real.accuracy)}. Sampel diambil dengan pengembalian.${more}`);
    }
    return tr(
      `Population: ${fmt(POP_SIZE)} generated cases of a classifier whose true accuracy is exactly ${pc(truth())} (${fmt(Math.round(POP_SIZE * truth()))} right, the rest wrong). Samples are drawn with replacement.${more}`,
      `Populasi: ${fmt(POP_SIZE)} kasus buatan dari sebuah classifier yang true accuracy-nya tepat ${pc(truth())} (${fmt(Math.round(POP_SIZE * truth()))} benar, sisanya salah). Sampel diambil dengan pengembalian.${more}`);
  }

  function draw() {
    syncLabels();
    drawHistogram();
    drawCoverage();
    table();
    failNote.hidden = !loadFailed;
    failNote.textContent = loadFailed ? tr('Could not load the penguin data, so the generated data is shown. Choose “Penguins (real)” again to retry.', 'Data penguin tidak bisa dimuat, jadi data buatan yang ditampilkan. Pilih “Penguin (data nyata)” lagi untuk mencoba lagi.') : '';
    dataNote.textContent = loading ? tr('Loading the penguin data…', 'Memuat data penguin…') : noteText();
    const n = sizeN(), p = truth(), b = band(), c = pile.length;
    if (loading) lab.setStatus(tr('Loading the penguin data…', 'Memuat data penguin…'));
    else if (!c) lab.setStatus(tr(`No samples yet. The true accuracy is ${pc(p)}. Press “Draw one sample” or “Draw ${fmt(controls.get('times'))} samples”.`, `Belum ada sampel. True accuracy-nya ${pc(p)}. Tekan “Ambil satu sampel” atau “Ambil ${fmt(controls.get('times'))} sampel”.`));
    else if (b) lab.setStatus(tr(`${fmt(c)} samples of ${fmt(n)} cases. The middle 95% of their accuracies is ${pc(b[0])} to ${pc(b[1])}; the true accuracy is ${pc(p)}.`, `${fmt(c)} sampel berisi ${fmt(n)} kasus. 95% tengah dari accuracy-nya adalah ${pc(b[0])} sampai ${pc(b[1])}; true accuracy-nya ${pc(p)}.`));
    else lab.setStatus(tr(`${fmt(c)} ${c === 1 ? 'sample' : 'samples'} of ${fmt(n)} cases so far. The true accuracy is ${pc(p)}. Draw more samples to see the spread.`, `${fmt(c)} sampel berisi ${fmt(n)} kasus sejauh ini. True accuracy-nya ${pc(p)}. Ambil lebih banyak sampel untuk melihat sebarannya.`));
    lab.setDetail(last && boot
      ? tr(`Last sample: ${pc(last.mean)} right (${fmt(Math.round(last.mean * n))} of ${fmt(n)}). Bootstrap 95% interval from ${fmt(boot.B)} resamples: ${pc(boot.lo)} to ${pc(boot.hi)}, which ${boot.contains ? 'contains' : 'misses'} the true accuracy.`,
        `Sampel terakhir: ${pc(last.mean)} benar (${fmt(Math.round(last.mean * n))} dari ${fmt(n)}). Interval bootstrap 95% dari ${fmt(boot.B)} resample: ${pc(boot.lo)} sampai ${pc(boot.hi)}, ${boot.contains ? 'mencakup' : 'tidak mencakup'} true accuracy.`)
      : tr('Draw a sample to see its bootstrap interval.', 'Ambil sampel untuk melihat interval bootstrap-nya.'));
    lab.setMetrics(tr(`${fmt(c)} samples · n = ${fmt(n)} · population ${fmt(population().length)}`, `${fmt(c)} sampel · n = ${fmt(n)} · populasi ${fmt(population().length)}`));
    lab.setLegend([
      { kind: 'dot', color: clusterColor(0), label: tr('Sample accuracies (bars)', 'Accuracy sampel (batang)') },
      { kind: 'dash', color: theme().ink, label: tr('True accuracy', 'True accuracy') },
      { kind: 'line', color: clusterColor(2), label: tr('Middle 95% of the samples (shaded)', '95% tengah dari sampel (arsiran)') },
      { kind: 'diamond', color: clusterColor(1), label: tr('Last sample', 'Sampel terakhir') },
      { kind: 'line', color: clusterColor(1), label: controls.get('showBoot') ? tr('Bootstrap interval (bar) and resamples (outline)', 'Interval bootstrap (batang) dan resample (garis tepi)') : tr('Bootstrap interval (bar)', 'Interval bootstrap (batang)') },
    ]);
    lab.describe(lab.canvas, c
      ? tr(`${fmt(c)} samples of ${fmt(n)} cases each, accuracies from ${pc(Math.min(...pile))} to ${pc(Math.max(...pile))}, true accuracy ${pc(p)}.${b ? ` Middle 95%: ${pc(b[0])} to ${pc(b[1])}.` : ''}${boot ? ` Bootstrap interval of the last sample: ${pc(boot.lo)} to ${pc(boot.hi)}.` : ''}`,
        `${fmt(c)} sampel berisi ${fmt(n)} kasus, accuracy dari ${pc(Math.min(...pile))} sampai ${pc(Math.max(...pile))}, true accuracy ${pc(p)}.${b ? ` 95% tengah: ${pc(b[0])} sampai ${pc(b[1])}.` : ''}${boot ? ` Interval bootstrap sampel terakhir: ${pc(boot.lo)} sampai ${pc(boot.hi)}.` : ''}`)
      : tr(`No samples drawn yet. True accuracy ${pc(p)}.`, `Belum ada sampel. True accuracy ${pc(p)}.`));
    for (const name of ['one', 'many', 'clear']) controls.disable(name, loading);
    controls.disable('clear', loading || !pile.length);
    setCoverBusy(loading || Boolean(cov?.running));
  }

  function settle() { draw(); revealPrediction(); }

  lab.onReset(() => {
    loadToken += 1; cancelCoverage();
    mode = 'generated'; loading = false; loadFailed = false; counter = 0; seen.clear();
    controls.set('data', 'generated'); controls.set('n', DEFAULTS.n); controls.set('times', DEFAULTS.times); controls.set('B', DEFAULTS.B); controls.set('showBoot', true);
    box.reset();
    clearSamples();
    drawMore(DEFAULTS.times, true);
  });
  lab.onTheme(draw);
  lab.onResize(draw);
  drawMore(DEFAULTS.times, true);
  return lab.destroy;
}
