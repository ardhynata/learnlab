// Level 2 capstone workbench: one guided, cost-sensitive fraud project on SYNTHETIC transactions (customers over
// days), in six steps that open in order: frame the problem and its costs, choose and defend a split, compare a
// baseline, logistic regression and a forest (one tuned setting each), measure the uncertainty of the held-out
// scores with bootstrap intervals, choose the threshold from the costs, and report with a self-assessment.
// Built on the lab kit; the steps live in a vertical stepper instead of a plot, like the Level 1 workbench
// (labs/capstone.js). Everything the learner chooses or types is saved in localStorage (every access guarded);
// scores are recomputed from the saved choices, and nothing translated is stored, so a language switch rebuilds
// the lab without losing work. Heavy computing (the split comparison, the searches, the held-out fits) runs after a
// button press, off the click, and its results are cached per dataset, split and setting. The pure logic is in
// ml/capstone2report.js (state, progress, sentences, summary) and ml/capstone2lab.js (computing) on top of
// ml/capstone2.js (data, splits, models, metrics, bootstrap).
import { createLab, panel, predictBox, clusterColor, theme, tr, fmt, pct } from '../kit/index.js';
import { makeTransactions, split as splitRows, costThreshold, metricFns } from '../ml/capstone2.js';
import {
  DATA_SEEDS, SPLIT_KEYS, MODEL_KEYS, TUNABLE, GRIDS, SPLIT_SEED, TEST_FRACTION, COMPARE_SEEDS, INNER_FOLDS,
  datasetFacts, compareSplits, tuneModel, fitHeldOut, scoreModels, differenceInterval, atThreshold, costCurve, thresholdMax,
} from '../ml/capstone2lab.js';
import {
  STORAGE_KEY, STEP_COUNT, REASONS, READINGS, CRITERIA, TEXT_FIELDS, COST_RANGE, B_RANGE, MAX_DEFENCE, MAX_TEXT,
  emptyState, sanitizeState, resetFrom, stepDone, usedValue, splitName, splitDescription, modelName, settingName, settingShort,
  valueText, precisionText, reasonLabel, reasonFeedback, readingLabel, readingTruth, readingFeedback, randomVsGrouped, neverFlagSentence, flagAllSentence,
  thresholdRule, optimismSentences, sharedSentence, searchSentence, intervalText, intervalSentences, thresholdSentences,
  criterionTitle, levelLabel, levelText, buildSummary,
} from '../ml/capstone2report.js';

const STYLE = `
.cap{margin-top:14px}
.cap-check{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}
.sim .cap button.cap-chip{display:flex;align-items:center;gap:6px;width:100%;min-height:40px;padding:6px 8px;border-radius:8px;border:1px solid var(--line-strong);background:var(--surface);color:var(--ink);font-size:12px;font-weight:650;white-space:normal;text-align:left;line-height:1.2}
.sim .cap button.cap-chip:hover:not(:disabled){background:var(--accent-soft)}
.sim .cap button.cap-chip[aria-current=step]{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent)}
.sim .cap button.cap-chip.done{background:var(--good-soft)}
.sim .cap button.cap-chip:disabled{opacity:.6}
.cap-num{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:800;background:var(--surface-2);color:var(--ink);box-shadow:inset 0 0 0 1px var(--line-strong)}
.done>.cap-num,.cap-head.done .cap-num{background:var(--good);color:var(--surface);box-shadow:none}
.cap-bar{height:6px;border-radius:6px;background:var(--surface-2);margin:10px 0 2px;overflow:hidden}
.cap-bar>i{display:block;height:100%;background:var(--good);transition:width .25s}
.cap-steps{list-style:none;margin:12px 0 0;padding:0}
.cap-step{border:1px solid var(--line);border-radius:12px;margin-top:10px;background:var(--surface)}
.cap-step h3{margin:0;font-size:inherit}
.sim .cap button.cap-head{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border:0;background:none;border-radius:12px;color:var(--ink);font-size:15px;font-weight:750;text-align:left;white-space:normal;cursor:pointer}
.sim .cap button.cap-head:hover:not(:disabled){background:var(--accent-soft)}
.sim .cap button.cap-head:disabled{cursor:default;opacity:.6}
.cap-head .cap-title{flex:1;min-width:0}
.cap-head .cap-sum{display:block;margin-top:2px;font-size:12.5px;font-weight:500;color:var(--muted)}
.cap-head .cap-state{flex:none;font-size:12px;font-weight:700;color:var(--muted)}
.cap-head.done .cap-state{color:var(--good)}
.cap-body{padding:2px 16px 16px}
.cap-body[hidden]{display:none}
.cap-body p{margin:8px 0}
.cap-set{border:0;margin:14px 0 0;padding:0;min-width:0}
.cap-set legend{padding:0;font-size:13px;font-weight:750;color:var(--accent)}
.cap-set:disabled{opacity:.55}
.cap-choice{display:flex;gap:10px;align-items:flex-start;margin-top:8px;padding:10px 12px;border:1px solid var(--line-strong);border-radius:10px;cursor:pointer;background:var(--surface)}
.cap-choice:has(input:checked){border-color:var(--accent);background:var(--accent-soft)}
.cap-choice input{margin-top:3px;width:18px;height:18px;flex:none;accent-color:var(--accent)}
.cap-choice b{display:block;font-size:14px}
.cap-choice span{display:block;font-size:13px;color:var(--muted);margin-top:2px}
.cap-choice span.cap-fb{color:var(--ink);font-weight:600}
.cap-out{margin-top:12px}
.cap-out h4,.cap-body h4{margin:14px 0 4px;font-size:13px;color:var(--accent)}
.cap-out ul{margin:6px 0;padding-left:20px}
.cap-out li{margin:4px 0}
.cap-note{padding:8px 12px;border-radius:8px;background:var(--surface-2);font-size:13px}
.cap-warn{padding:8px 12px;border-radius:8px;background:var(--bad-soft);font-size:13px}
.cap-balance{display:flex;height:26px;border-radius:8px;overflow:hidden;box-shadow:inset 0 0 0 1px var(--line-strong);margin-top:8px}
.cap-balance span{display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--surface);min-width:0;overflow:hidden;white-space:nowrap}
.cap-actions{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin-top:12px}
.cap-actions .btn{min-height:40px}
.cap-readout{font-size:13px;color:var(--muted)}
.cap-table{width:100%;margin-top:8px;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums}
.cap-table caption{caption-side:top;text-align:left;font-size:13px;font-weight:750;color:var(--ink);padding:6px 0 0}
.cap-table th,.cap-table td{white-space:normal;padding:7px 10px;text-align:right;border-bottom:1px solid var(--line);vertical-align:top}
.cap-table th:first-child,.cap-table td:first-child{text-align:left}
.cap-table tbody th{background:none;color:var(--ink);font-weight:600}
.cap-table td.cap-chosen,.cap-table th.cap-chosen,.cap-table tr.cap-chosen :is(td,th){background:var(--accent-soft);font-weight:750;color:var(--ink)}
.cap-cm{width:auto;min-width:min(100%,22rem)}
.cap-cm td{text-align:center!important}
.cap-cm td b{display:block;font-size:20px}
.cap-cm td small{display:block;color:var(--muted);font-size:11.5px}
.cap-cm td.ok{background:var(--good-soft)}
.cap-cm td.bad{background:var(--bad-soft)}
.cap-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:4px 24px;align-items:start}
.cap-model{margin-top:10px}
.cap-model label{display:block;margin-top:12px;font-size:13px;font-weight:650}
.cap-model select{display:block;width:100%;margin-top:6px;padding:8px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink);font-size:13px}
.cap-model div.slider-label{margin-top:12px;font-size:13px;font-weight:650}
.cap-model div.slider-label label{display:inline;margin:0}
.cap-model .hint{margin:8px 0 0}
.cap-block{margin-top:14px;padding:12px 14px;border:1px solid var(--line);border-radius:10px}
.cap-block h4{margin:0 0 4px}
.cap-chart{margin-top:6px}
.cap-chart canvas{display:block;width:100%;height:230px}
.cap-key{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12.5px;color:var(--muted);margin-top:4px}
.cap-key i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-2px;border:2px solid var(--muted)}
.cap-verdict{padding:10px 12px;border-left:4px solid var(--accent);background:var(--surface-2);border-radius:6px;margin-top:10px;font-size:14px}
.cap-text label,.cap-summary label,.cap-defence label{display:block;margin-top:14px;font-size:13px;font-weight:750}
.cap-text textarea,.cap-summary textarea,.cap-defence textarea{display:block;width:100%;margin-top:4px;padding:8px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;font-size:13px}
.cap-text textarea{min-height:76px;resize:vertical}
.cap-defence textarea{min-height:56px;resize:vertical}
.cap-summary textarea{min-height:300px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;line-height:1.45}
.cap-rubric{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px}
.cap-rubric .cap-set{margin:0;padding:10px 12px;border:1px solid var(--line);border-radius:10px;min-width:0}
.cap-level{display:flex;gap:8px;align-items:flex-start;margin-top:8px;font-size:13px;cursor:pointer}
.cap-level input{margin-top:3px;flex:none;width:16px;height:16px;accent-color:var(--accent)}
.cap-level b{font-weight:750}
.cap-slider{display:block;margin-top:12px;font-size:13px;font-weight:650}
.cap-slider input{display:block;width:100%;margin-top:6px}
.cap-slider output{margin-left:8px;font-weight:800;color:var(--accent)}
.cap-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:10px 0 0}
.cap-stats div{padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)}
.cap-stats dt{font-size:11.5px;font-weight:700;color:var(--muted)}
.cap-stats dd{margin:2px 0 0;font-size:16px;font-weight:800;font-variant-numeric:tabular-nums}
.cap-aside dl{margin:0 0 12px;font-size:13px}
.cap-aside dt{margin-top:8px;color:var(--muted);font-size:12px;font-weight:700}
.cap-aside dd{margin:2px 0 0;font-weight:600}
@media (max-width:640px){
  .cap-check{grid-template-columns:repeat(6,1fr)}
  .sim .cap button.cap-chip{justify-content:center;padding:6px 2px}
  .cap-chip-name{display:none}
  .cap-body{padding:2px 12px 14px}
  .cap-stack thead{display:none}
  .cap-stack tr{display:block;border:1px solid var(--line);border-radius:10px;margin-top:8px;padding:4px 8px}
  .cap-stack td,.cap-stack th{display:flex;justify-content:space-between;gap:12px;border:0;padding:4px 2px;text-align:right!important}
  .cap-stack td::before{content:attr(data-label);color:var(--muted);font-weight:600;text-align:left}
  .cap-head .cap-state{display:none}
}
`;

let uid = 0;

function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v);
  }
  e.append(...kids.flat().filter(k => k != null && k !== false));
  return e;
}
const nextId = p => `${p}-${++uid}`;
const d2 = x => (Number.isFinite(x) ? fmt(x, { digits: 2 }) : '–');
const signed = x => `${x >= 0 ? '+' : '−'}${fmt(Math.abs(x), { digits: 2 })}`;
const modelShort = m => (m === 'baseline' ? tr('Baseline', 'Baseline') : m === 'logistic' ? tr('Logistic', 'Logistik') : tr('Forest', 'Forest'));
const modelColor = m => clusterColor(m === 'baseline' ? -1 : m === 'logistic' ? 0 : 1);

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Level 2 capstone workbench', 'Workbench capstone Level 2'),
    hint: tr('One cost-sensitive fraud project in six steps: frame it, split it, compare models, measure the uncertainty, choose a threshold and report. The transactions are synthetic, made by a program. Each step opens when the one before it is done, and your work is saved in this browser.',
      'Satu proyek fraud yang peka biaya dalam enam langkah: rumuskan, bagi datanya, bandingkan model, ukur ketidakpastiannya, pilih threshold, lalu laporkan. Transaksinya sintetis, dibuat oleh program. Tiap langkah terbuka setelah langkah sebelumnya selesai, dan pekerjaanmu tersimpan di browser ini.'),
    status: true, legend: false,
    settingsTitle: tr('Your project', 'Proyekmu'),
  });

  let S = loadState();
  let C = {};                 // what compute() returned for the current state
  let done = Array(STEP_COUNT).fill(false);
  let destroyed = false, armTimer = 0, liveTimer = 0, armed = false, expect = '';
  const cache = new Map(), pending = new Set(), rowCache = new Map();
  const openSet = new Set([S.open]);
  let steps = [], chips = [], ui = {};
  const charts = { auc: null, cost: null };

  // The plot card holds the stepper instead of a canvas.
  const style = h('style', { text: STYLE });
  const cap = h('div', { class: 'cap' });
  lab.canvas.closest('.chart').replaceWith(style, cap);
  const live = h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  cap.append(live);

  // ---- saved state ---------------------------------------------------------------------------------------------

  function loadState() {
    try {
      const text = localStorage.getItem(STORAGE_KEY);
      return text ? sanitizeState(JSON.parse(text)) : emptyState();
    } catch { return emptyState(); }
  }
  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch { /* storage may be blocked: the lab works without it */ } }
  function announce(text) {
    clearTimeout(liveTimer);
    live.textContent = '';
    liveTimer = setTimeout(() => { live.textContent = text; }, 40);
  }

  // ---- computing -----------------------------------------------------------------------------------------------
  // lazy() returns a cached result, or null while it is being computed. The work starts a moment after the click
  // that asked for it (so the "Working" text is on screen first), and update() runs again when it is ready.

  function lazy(key, make) {
    if (cache.has(key)) return cache.get(key);
    if (!pending.has(key)) {
      pending.add(key);
      setTimeout(() => {
        pending.delete(key);
        if (destroyed) return;
        if (cache.size > 40) cache.clear();
        cache.set(key, make());
        update();
        if (!pending.size && expect) { announce(expect); expect = ''; }
      }, 40);
    }
    return null;
  }
  const working = () => pending.size > 0;
  const workingNote = () => h('p', { class: 'cap-note', role: 'status' }, tr('Working… this takes a few seconds.', 'Sedang menghitung… ini butuh beberapa detik.'));

  function rowsFor() {
    if (!rowCache.has(S.seed)) rowCache.set(S.seed, makeTransactions({ seed: DATA_SEEDS[S.seed - 1] }));
    return rowCache.get(S.seed);
  }
  const otherModel = m => (m === 'forest' ? 'logistic' : 'forest');

  function compute() {
    const rows = rowsFor(), c = {
      rows, facts: datasetFacts(rows), thr: costThreshold(S.fp, S.fn),
      cmp: null, tuned: { logistic: null, forest: null }, used: { logistic: null, forest: null },
      held: null, scores: null, diff: null, run: null, atCost: null, xMax: 1, thrNow: null,
    };
    if (S.splitCompared) c.cmp = lazy(`cmp|${S.seed}`, () => compareSplits(rows));
    if (S.split) {
      const { train } = splitRows(S.split, rows, { testFraction: TEST_FRACTION, seed: SPLIT_SEED });
      for (const m of TUNABLE) {
        if (S.searched[m]) c.tuned[m] = lazy(`tune|${S.seed}|${S.split}|${m}`, () => tuneModel(rows, { how: S.split, model: m, train }));
        c.used[m] = usedValue(S, m, c.tuned[m]);
      }
      if (S.scored && TUNABLE.every(m => c.used[m] != null)) {
        const hk = `${S.seed}|${S.split}|${c.used.logistic}|${c.used.forest}`;
        c.held = lazy(`held|${hk}`, () => fitHeldOut(rows, { how: S.split, picks: c.used }));
        if (c.held) {
          c.scores = lazy(`scores|${hk}|${S.fp}|${S.fn}|${S.B}`, () => scoreModels(c.held.labels, c.held.probas, { fpCost: S.fp, fnCost: S.fn, B: S.B }));
          if (S.model) c.diff = lazy(`diff|${hk}|${S.model}|${S.B}`, () => differenceInterval(metricFns.auc, c.held.labels, c.held.probas[S.model], c.held.probas[otherModel(S.model)], { B: S.B }));
          if (S.model) {
            const p = c.held.probas[S.model], opts = { fpCost: S.fp, fnCost: S.fn };
            c.xMax = thresholdMax(p, c.thr);
            c.thrNow = Math.min(c.xMax, S.threshold ?? c.thr);
            c.run = atThreshold(p, c.held.labels, c.thrNow, opts);
            c.atCost = atThreshold(p, c.held.labels, c.thr, opts);
          }
        }
      }
    }
    return c;
  }

  // ---- shared pieces ---------------------------------------------------------------------------------------------

  function confusionTable(run) {
    const c = run.confusion;
    const cell = (value, label, cls) => h('td', { class: cls }, h('b', { text: fmt(value) }), h('small', { text: label }));
    return h('div', { class: 'table-scroll' }, h('table', { class: 'cap-table cap-cm' },
      h('caption', { text: tr(`Confusion matrix on the ${fmt(run.n)} held-out rows at a threshold of ${pct(run.threshold)}`, `Confusion matrix pada ${fmt(run.n)} held-out rows dengan threshold ${pct(run.threshold)}`) }),
      h('thead', {}, h('tr', {}, h('td'), h('th', { scope: 'col', text: tr('Flagged as fraud', 'Ditandai fraud') }), h('th', { scope: 'col', text: tr('Not flagged', 'Tidak ditandai') }))),
      h('tbody', {},
        h('tr', {}, h('th', { scope: 'row', text: tr('Really fraud', 'Sebenarnya fraud') }), cell(c.tp, tr('true positive (caught)', 'true positive (tertangkap)'), 'ok'), cell(c.fn, tr('false negative (missed fraud)', 'false negative (fraud terlewat)'), 'bad')),
        h('tr', {}, h('th', { scope: 'row', text: tr('Really legitimate', 'Sebenarnya sah') }), cell(c.fp, tr('false positive (false alarm)', 'false positive (alarm palsu)'), 'bad'), cell(c.tn, tr('true negative', 'true negative'), 'ok')))));
  }

  const radioChoice = (name, value, title, text, onChange) => {
    const input = h('input', { type: 'radio', name, value });
    input.addEventListener('change', onChange);
    return { input, label: h('label', { class: 'cap-choice' }, input, h('div', {}, h('b', { text: title }), text ? h('span', { text }) : null)) };
  };

  // ---- step 1: frame ---------------------------------------------------------------------------------------------

  function step1() {
    const body = h('div');
    const factsP = h('p', { class: 'cap-note' });
    const seedOut = h('span', { class: 'cap-readout' });
    const newData = h('button', { type: 'button', class: 'btn', text: tr('New transactions', 'Transaksi baru') });
    newData.addEventListener('click', () => {
      S.seed = S.seed % DATA_SEEDS.length + 1;
      S = resetFrom(S, 2);
      update();
      announce(tr(`Dataset ${fmt(S.seed)}: ${fmt(C.facts.rows)} new transactions, ${fmt(C.facts.frauds)} of them fraud. Steps 2 to 5 were reset.`, `Dataset ${fmt(S.seed)}: ${fmt(C.facts.rows)} transaksi baru, ${fmt(C.facts.frauds)} di antaranya fraud. Langkah 2 sampai 5 direset.`));
    });
    const balance = h('div');
    const costHost = h('div', { class: 'cap-model' });
    const costPanel = panel(costHost, [
      { name: 'fp', type: 'range', label: tr('Cost of a false alarm (a good transaction is flagged)', 'Biaya alarm palsu (transaksi yang baik ditandai)'), min: COST_RANGE.fp.min, max: COST_RANGE.fp.max, step: 1, value: S.fp },
      { name: 'fn', type: 'range', label: tr('Cost of a missed fraud (a fraud is not flagged)', 'Biaya fraud yang terlewat (fraud tidak ditandai)'), min: COST_RANGE.fn.min, max: COST_RANGE.fn.max, step: 1, value: S.fn },
    ], (name, v) => { S.fp = v.fp; S.fn = v.fn; update(); });
    const rule = h('p', { class: 'cap-verdict' });
    const setCosts = h('button', { type: 'button', class: 'btn primary', text: tr('Set these costs', 'Tetapkan biaya ini') });
    const costState = h('span', { class: 'cap-readout' });
    setCosts.addEventListener('click', () => { S.costsSet = true; update(); announce(tr(`Costs set: a false alarm costs ${fmt(S.fp)}, a missed fraud ${fmt(S.fn)}.`, `Biaya ditetapkan: alarm palsu berbiaya ${fmt(S.fp)}, fraud yang terlewat ${fmt(S.fn)}.`)); });
    const never = h('p'), all = h('p');
    const reasonSet = h('fieldset', { class: 'cap-set' }, h('legend', { text: tr('Why would a plain accuracy mislead here? Tick every reason that is true.', 'Mengapa accuracy biasa menyesatkan di sini? Centang setiap alasan yang benar.') }));
    const reasonEls = REASONS.map(r => {
      const input = h('input', { type: 'checkbox', value: r });
      const fb = h('span', { class: 'cap-fb' });
      input.addEventListener('change', () => {
        S.reasons = REASONS.filter(k => reasonEls.find(e => e.key === k).input.checked);
        update();
        announce(reasonFeedback(r, input.checked) || tr('Unticked.', 'Centang dihapus.'));
      });
      reasonSet.append(h('label', { class: 'cap-choice' }, input, h('div', {}, h('b', { text: reasonLabel(r) }), fb)));
      return { key: r, input, fb };
    });
    body.append(
      h('p', { text: tr('A bank wants to flag fraudulent card transactions. The transactions here are synthetic: a program generated them for this lab, and no real customer is behind them. Each customer has many transactions, spread over days, and fraud is rare. There are no penguins and no missing values in this data.', 'Sebuah bank ingin menandai transaksi kartu yang curang. Transaksi di sini sintetis: sebuah program membuatnya untuk lab ini, dan tidak ada pelanggan sungguhan di baliknya. Setiap pelanggan punya banyak transaksi yang tersebar selama beberapa hari, dan fraud jarang terjadi. Tidak ada penguin dan tidak ada missing value di data ini.') }),
      factsP, h('div', { class: 'cap-actions' }, newData, seedOut),
      h('h4', { text: tr('Class balance', 'Keseimbangan kelas') }), balance,
      h('h4', { text: tr('1. Set what a mistake costs', '1. Tetapkan biaya sebuah kesalahan') }),
      h('p', { text: tr('Both costs use the same unit, for example money lost or minutes of a reviewer. The cost ratio sets the threshold you will use in step 5.', 'Kedua biaya memakai satuan yang sama, misalnya uang yang hilang atau menit kerja seorang peninjau. Rasio biaya menentukan threshold yang kamu pakai di langkah 5.') }),
      costHost, rule, h('div', { class: 'cap-actions' }, setCosts, costState),
      h('h4', { text: tr('2. What a plain accuracy hides', '2. Apa yang disembunyikan accuracy biasa') }),
      never, all, reasonSet);
    return {
      body,
      render() {
        const f = C.facts;
        costPanel.set('fp', S.fp); costPanel.set('fn', S.fn);
        seedOut.textContent = tr(`Dataset ${fmt(S.seed)} of ${fmt(DATA_SEEDS.length)}`, `Dataset ${fmt(S.seed)} dari ${fmt(DATA_SEEDS.length)}`);
        factsP.textContent = tr(
          `${fmt(f.rows)} synthetic transactions from ${fmt(f.customers)} customers over ${fmt(f.days)} days. ${fmt(f.frauds)} are fraud (${pct(f.rate)}) and ${fmt(f.legit)} are legitimate.`,
          `${fmt(f.rows)} transaksi sintetis dari ${fmt(f.customers)} pelanggan selama ${fmt(f.days)} hari. ${fmt(f.frauds)} adalah fraud (${pct(f.rate)}) dan ${fmt(f.legit)} sah.`);
        balance.replaceChildren(
          h('div', { class: 'cap-balance', role: 'img', 'aria-label': tr(`Fraud: ${fmt(f.frauds)} of ${fmt(f.rows)} (${pct(f.rate)}). Legitimate: ${fmt(f.legit)} (${pct(1 - f.rate)}).`, `Fraud: ${fmt(f.frauds)} dari ${fmt(f.rows)} (${pct(f.rate)}). Sah: ${fmt(f.legit)} (${pct(1 - f.rate)}).`) },
            h('span', { style: `width:${(f.rate * 100).toFixed(2)}%;background:var(--k1-ink)`, text: f.rate > 0.12 ? pct(f.rate, 0) : '' }),
            h('span', { style: `width:${((1 - f.rate) * 100).toFixed(2)}%;background:var(--k0-ink)`, text: pct(1 - f.rate, 0) })),
          h('p', { class: 'hint', text: tr(`Fraud ${fmt(f.frauds)} (${pct(f.rate)}) · Legitimate ${fmt(f.legit)} (${pct(1 - f.rate)})`, `Fraud ${fmt(f.frauds)} (${pct(f.rate)}) · Sah ${fmt(f.legit)} (${pct(1 - f.rate)})`) }));
        rule.textContent = thresholdRule(S.fp, S.fn, C.thr);
        costState.textContent = S.costsSet ? tr('Costs are set. You can still change them later.', 'Biaya sudah ditetapkan. Kamu masih bisa mengubahnya nanti.') : tr('Press the button to confirm the costs.', 'Tekan tombol untuk mengonfirmasi biaya.');
        never.textContent = neverFlagSentence(f, S.fn);
        all.textContent = flagAllSentence(f, S.fp);
        for (const e of reasonEls) {
          e.input.checked = S.reasons.includes(e.key);
          e.fb.textContent = S.reasons.length ? reasonFeedback(e.key, e.input.checked) : '';
        }
      },
      summary: () => (S.costsSet ? tr(`False alarm ${fmt(S.fp)}, missed fraud ${fmt(S.fn)} · threshold ${pct(C.thr)}`, `Alarm palsu ${fmt(S.fp)}, fraud terlewat ${fmt(S.fn)} · threshold ${pct(C.thr)}`) : ''),
    };
  }

  // ---- step 2: split ---------------------------------------------------------------------------------------------

  function step2() {
    const body = h('div');
    const splitName_ = nextId('cap-split');
    const set = h('fieldset', { class: 'cap-set' }, h('legend', { text: tr('1. Choose the split that matches how the model will be used', '1. Pilih split yang sesuai dengan cara model akan dipakai') }));
    const inputs = SPLIT_KEYS.map(k => {
      const c = radioChoice(splitName_, k, splitName(k), splitDescription(k), () => {
        S.split = k; S = resetFrom(S, 3); update();
        announce(tr(`Split chosen: ${splitName(k)}. Steps 3 to 5 were reset.`, `Split dipilih: ${splitName(k)}. Langkah 3 sampai 5 direset.`));
      });
      set.append(c.label);
      return c.input;
    });
    const compare = h('button', { type: 'button', class: 'btn primary', text: tr('Compare the three splits', 'Bandingkan ketiga split') });
    const readout = h('span', { class: 'cap-readout' });
    compare.addEventListener('click', () => {
      S.splitCompared = true; expect = tr('The three splits are compared.', 'Ketiga split sudah dibandingkan.');
      update(); announce(tr('Comparing the three splits. This takes a few seconds.', 'Membandingkan ketiga split. Ini butuh beberapa detik.'));
    });
    const out = h('div', { class: 'cap-out' });
    const defId = nextId('cap-def');
    const defence = h('textarea', { id: defId, maxlength: String(MAX_DEFENCE), rows: '2', placeholder: tr('Who will the model meet when it is used, and why does your split imitate that?', 'Siapa yang akan dihadapi model saat dipakai, dan mengapa splitmu meniru hal itu?') });
    defence.addEventListener('input', () => { S.defence = defence.value; touch(); });
    body.append(
      h('p', { text: tr('A split decides what the test rows are allowed to know. Choose the one that imitates the day the model goes live, then check how optimistic it is next to the other two.', 'Split menentukan apa yang boleh diketahui test rows. Pilih yang meniru hari saat model dipakai, lalu periksa seberapa optimistis split itu dibandingkan dua yang lain.') }),
      set,
      h('div', { class: 'cap-actions' }, compare, readout), out,
      h('div', { class: 'cap-defence' }, h('label', { for: defId, text: tr('2. Your one-line defence of the split', '2. Pembelaanmu atas split ini dalam satu baris') }), defence));
    return {
      body,
      render() {
        inputs.forEach(i => { i.checked = i.value === S.split; });
        compare.disabled = !S.split;
        readout.textContent = S.split ? '' : tr('Choose a split first.', 'Pilih split dulu.');
        if (defence.value !== S.defence) defence.value = S.defence;
        out.replaceChildren();
        if (!S.splitCompared) return;
        if (!C.cmp) { out.append(workingNote()); return; }
        const cmp = C.cmp;
        const head = h('tr', {}, ...[tr('Split', 'Split'), tr('AUC of the reference forest', 'AUC forest acuan'), tr(`Lowest to highest of ${fmt(COMPARE_SEEDS.length)} splits`, `Terendah sampai tertinggi dari ${fmt(COMPARE_SEEDS.length)} split`), tr('Test rows whose customer was in training', 'Test rows yang pelanggannya ada di training'), tr('Your split minus this split', 'Splitmu dikurangi split ini')].map(t => h('th', { scope: 'col', text: t })));
        const body_ = h('tbody');
        for (const k of SPLIT_KEYS) {
          const r = cmp[k], mine = k === S.split;
          const cells = [
            [tr('AUC of the reference forest', 'AUC forest acuan'), d2(r.auc)],
            [tr(`Lowest to highest of ${fmt(COMPARE_SEEDS.length)} splits`, `Terendah sampai tertinggi dari ${fmt(COMPARE_SEEDS.length)} split`), k === 'temporal' ? tr('one possible split', 'hanya satu split mungkin') : `${d2(r.lo)} – ${d2(r.hi)}`],
            [tr('Test rows whose customer was in training', 'Test rows yang pelanggannya ada di training'), pct(r.sharedShare, 0)],
            [tr('Your split minus this split', 'Splitmu dikurangi split ini'), mine ? tr('your split', 'splitmu') : S.split ? signed(cmp[S.split].auc - r.auc) : '–'],
          ];
          body_.append(h('tr', { class: mine ? 'cap-chosen' : null }, h('th', { scope: 'row', text: splitName(k) + (mine ? tr(' (yours)', ' (pilihanmu)') : '') }), cells.map(([label, text]) => h('td', { 'data-label': label, text }))));
        }
        out.append(
          h('div', { class: 'table-scroll' }, h('table', { class: 'cap-table cap-stack' }, h('caption', { text: tr('How optimistic each split is: one reference forest, scored on the test rows of each split', 'Seberapa optimistis tiap split: satu forest acuan, dinilai pada test rows tiap split') }), h('thead', {}, head), body_)),
          h('p', { class: 'hint', text: tr(`The reference forest is a flexible model with fixed settings, the same on every split. A plain baseline cannot show the difference: it scores an AUC of ${fmt(0.5)} on any split. Random and grouped splits are repeated ${fmt(COMPARE_SEEDS.length)} times and averaged; a temporal split has only one possible cut. It can score high here because it still keeps every customer: it removes the future, not the customers. "Baseline model" in the task means this reference forest.`, `Forest acuan adalah model fleksibel dengan pengaturan tetap, sama pada setiap split. Baseline biasa tidak bisa menunjukkan perbedaannya: ia mendapat AUC ${fmt(0.5)} pada split mana pun. Split acak dan per pelanggan diulang ${fmt(COMPARE_SEEDS.length)} kali lalu dirata-rata; split temporal hanya punya satu titik potong. Skornya bisa tinggi di sini karena semua pelanggan tetap ada: split ini menghilangkan masa depan, bukan pelanggan. "Model baseline" dalam tugas berarti forest acuan ini.`) }));
        if (S.split) out.append(h('ul', {}, optimismSentences(cmp, S.split).map(t => h('li', { text: t }))));
        out.append(h('p', { class: 'cap-note', text: sharedSentence(cmp) }));
      },
      summary: () => (S.split ? `${splitName(S.split)}${C.cmp ? ` · AUC ${d2(C.cmp[S.split].auc)}` : ''}` : ''),
    };
  }

  // ---- step 3: models --------------------------------------------------------------------------------------------

  function tuneSection(m) {
    const wrap = h('div', { class: 'cap-block' });
    const out = h('div', { class: 'cap-out' });
    const searchLabel = () => (m === 'logistic' ? tr('Search the penalty strength', 'Cari kekuatan penalti') : tr('Search the maximum depth', 'Cari kedalaman maksimum'));
    const btn = h('button', { type: 'button', class: 'btn primary', text: searchLabel() });
    btn.addEventListener('click', () => {
      S.searched[m] = true; expect = tr(`${modelName(m)} search finished.`, `Pencarian ${modelName(m)} selesai.`);
      update(); announce(tr(`Searching ${settingShort(m)} for ${modelName(m)}.`, `Mencari ${settingShort(m)} untuk ${modelName(m)}.`));
    });
    const selId = nextId('cap-use');
    const select = h('select', { id: selId });
    select.addEventListener('change', () => {
      S.picks[m] = select.value === 'best' ? null : Number(select.value);
      S = resetFrom(S, 4); update();
      announce(tr(`${modelName(m)} will use ${settingShort(m)} ${valueText(usedValue(S, m, C.tuned[m]))}. Steps 4 and 5 were reset.`, `${modelName(m)} akan memakai ${settingShort(m)} ${valueText(usedValue(S, m, C.tuned[m]))}. Langkah 4 dan 5 direset.`));
    });
    const desc = m === 'logistic'
      ? tr('A weighted sum of the amount, the hour, the merchant risk and the device fingerprint, turned into a probability. The setting is the strength of an L2 penalty, which shrinks the weights.', 'Jumlah berbobot dari amount, jam, risiko merchant, dan sidik jari perangkat, yang diubah menjadi probabilitas. Pengaturannya adalah kekuatan penalti L2, yang menyusutkan bobot.')
      : tr('Many decision trees that vote. It is flexible: it can follow curved patterns, such as the hour of day, and remember fine detail. The setting is how deep each tree may grow.', 'Banyak decision tree yang saling memberi suara. Model ini fleksibel: ia dapat mengikuti pola melengkung, seperti jam dalam sehari, dan mengingat detail yang halus. Pengaturannya adalah seberapa dalam tiap tree boleh tumbuh.');
    wrap.append(h('h4', { text: modelName(m) }), h('p', { text: desc }), h('div', { class: 'cap-actions' }, btn), out);
    return {
      el: wrap,
      render() {
        out.replaceChildren();
        btn.disabled = !S.split;
        if (!S.searched[m]) { out.append(h('p', { class: 'hint', text: S.split ? tr('Press the button to score five values of this setting on the training part.', 'Tekan tombol untuk menilai lima nilai pengaturan ini pada bagian training.') : tr('Choose a split in step 2 first.', 'Pilih split di langkah 2 dulu.') })); return; }
        const t = C.tuned[m];
        if (!t) { out.append(workingNote()); return; }
        const used = C.used[m];
        const body_ = h('tbody');
        for (const r of t.results) {
          const isUsed = r.value === used;
          body_.append(h('tr', { class: isUsed ? 'cap-chosen' : null },
            h('th', { scope: 'row', text: valueText(r.value) + (isUsed ? tr(' (in use)', ' (dipakai)') : r.value === t.best ? tr(' (best)', ' (terbaik)') : '') }),
            h('td', { 'data-label': tr('Validation AUC', 'AUC validasi'), text: d2(r.mean) }),
            h('td', { 'data-label': tr('Spread over the folds', 'Sebaran antar fold'), text: `± ${d2(r.sd)}` })));
        }
        select.replaceChildren(h('option', { value: 'best', text: tr(`Best of the search (${valueText(t.best)})`, `Terbaik dari pencarian (${valueText(t.best)})`) }), ...t.values.map(v => h('option', { value: String(v), text: valueText(v) })));
        select.value = S.picks[m] == null ? 'best' : String(S.picks[m]);
        out.append(
          h('div', { class: 'table-scroll' }, h('table', { class: 'cap-table cap-stack' },
            h('caption', { text: tr(`${settingName(m)}: validation AUC on the training part (${fmt(INNER_FOLDS)} folds)`, `${settingName(m)}: AUC validasi pada bagian training (${fmt(INNER_FOLDS)} fold)`) }),
            h('thead', {}, h('tr', {}, h('th', { scope: 'col', text: settingShort(m) }), h('th', { scope: 'col', text: tr('Validation AUC', 'AUC validasi') }), h('th', { scope: 'col', text: tr('Spread over the folds', 'Sebaran antar fold') }))), body_)),
          h('p', { text: searchSentence(m, t, used) }),
          h('div', { class: 'cap-model' }, h('label', { for: selId, text: tr(`Value of ${settingShort(m)} to use`, `Nilai ${settingShort(m)} yang dipakai`) }), select));
      },
    };
  }

  function step3() {
    const body = h('div');
    const sections = { logistic: tuneSection('logistic'), forest: tuneSection('forest') };
    const base = h('div', { class: 'cap-block' }, h('h4', { text: modelName('baseline') }),
      h('p', { text: tr('Always answers with the fraud rate of the training part, so it ranks no transaction above another. Nothing to tune. It is the score any model has to beat.', 'Selalu menjawab dengan tingkat fraud pada bagian training, sehingga tidak menempatkan transaksi mana pun di atas yang lain. Tidak ada yang di-tune. Ini skor yang harus dikalahkan model mana pun.') }));
    const how = h('p', { class: 'cap-note' });
    const compare = h('div', { class: 'cap-out' });
    const modelRadio = nextId('cap-model');
    const pickSet = h('fieldset', { class: 'cap-set' }, h('legend', { text: tr('3. The model I take forward to the held-out rows', '3. Model yang kubawa ke held-out rows') }));
    const pickInputs = TUNABLE.map(m => {
      const c = radioChoice(modelRadio, m, modelName(m), '', () => {
        S.model = m; S = { ...resetFrom(S, 5), reading: null }; update();
        announce(tr(`Model chosen: ${modelName(m)}.`, `Model dipilih: ${modelName(m)}.`));
      });
      pickSet.append(c.label);
      return c.input;
    });
    body.append(
      h('p', { text: tr('Compare the three models fairly: the same split, the same small search of five values, and only the training part. The held-out test rows stay shut until step 4.', 'Bandingkan ketiga model dengan adil: split yang sama, pencarian kecil yang sama dengan lima nilai, dan hanya bagian training. Held-out test rows tetap tertutup sampai langkah 4.') }),
      how, base, sections.logistic.el, sections.forest.el, compare, pickSet);
    return {
      body,
      render() {
        how.textContent = S.split
          ? tr(`The search scores each value by AUC with ${fmt(INNER_FOLDS)} validation folds inside the training part. The folds follow your split: ${S.split === 'grouped' ? 'a customer is never on both sides of a fold' : S.split === 'temporal' ? 'each fold tests on a later block of time' : 'rows are dealt out at random'}. A search whose folds ignore the split would fall for the same trap as the split itself.`,
            `Pencarian menilai tiap nilai dengan AUC dan ${fmt(INNER_FOLDS)} fold validasi di dalam bagian training. Fold mengikuti splitmu: ${S.split === 'grouped' ? 'seorang pelanggan tidak pernah ada di kedua sisi sebuah fold' : S.split === 'temporal' ? 'tiap fold menguji pada blok waktu yang lebih akhir' : 'baris dibagi secara acak'}. Pencarian yang foldnya mengabaikan split akan jatuh ke jebakan yang sama dengan splitnya.`)
          : tr('Choose a split in step 2 first: the search uses folds of the same kind.', 'Pilih split di langkah 2 dulu: pencarian memakai fold yang sejenis.');
        for (const m of TUNABLE) sections[m].render();
        pickInputs.forEach(i => { i.checked = i.value === S.model; });
        pickSet.disabled = !(TUNABLE.every(m => S.searched[m] && C.tuned[m]));
        compare.replaceChildren();
        if (!TUNABLE.every(m => C.tuned[m])) return;
        const rowFor = m => {
          const t = C.tuned[m], r = t.results.find(x => x.value === C.used[m]);
          return h('tr', { class: m === S.model ? 'cap-chosen' : null }, h('th', { scope: 'row', text: modelName(m) }),
            h('td', { 'data-label': tr('Setting used', 'Pengaturan dipakai'), text: `${settingShort(m)} ${valueText(C.used[m])}` }),
            h('td', { 'data-label': tr('Validation AUC', 'AUC validasi'), text: d2(r.mean) }),
            h('td', { 'data-label': tr('Spread over the folds', 'Sebaran antar fold'), text: `± ${d2(r.sd)}` }));
        };
        compare.append(h('h4', { text: tr('The three models side by side', 'Ketiga model berdampingan') }),
          h('div', { class: 'table-scroll' }, h('table', { class: 'cap-table cap-stack' },
            h('caption', { text: tr('Validation AUC on the training part (the held-out rows are untouched)', 'AUC validasi pada bagian training (held-out rows belum disentuh)') }),
            h('thead', {}, h('tr', {}, ...[tr('Model', 'Model'), tr('Setting used', 'Pengaturan dipakai'), tr('Validation AUC', 'AUC validasi'), tr('Spread over the folds', 'Sebaran antar fold')].map(t => h('th', { scope: 'col', text: t })))),
            h('tbody', {},
              h('tr', {}, h('th', { scope: 'row', text: modelName('baseline') }), h('td', { 'data-label': tr('Setting used', 'Pengaturan dipakai'), text: tr('none', 'tidak ada') }), h('td', { 'data-label': tr('Validation AUC', 'AUC validasi'), text: d2(0.5) }), h('td', { 'data-label': tr('Spread over the folds', 'Sebaran antar fold'), text: '–' })),
              rowFor('logistic'), rowFor('forest')))));
        const a = C.tuned.logistic.results.find(r => r.value === C.used.logistic), b = C.tuned.forest.results.find(r => r.value === C.used.forest);
        const gap = Math.abs(a.mean - b.mean), noise = Math.max(a.sd, b.sd);
        compare.append(h('p', { class: 'cap-verdict', text: tr(
          `${modelName(a.mean >= b.mean ? 'logistic' : 'forest')} is ahead by ${d2(gap)} AUC, while the folds themselves vary by about ${d2(noise)}. ${gap > noise ? 'The gap is larger than the fold-to-fold noise.' : 'The gap is within the fold-to-fold noise: do not read much into it.'}`,
          `${modelName(a.mean >= b.mean ? 'logistic' : 'forest')} unggul ${d2(gap)} AUC, sementara fold-nya sendiri bervariasi sekitar ${d2(noise)}. ${gap > noise ? 'Selisihnya lebih besar daripada noise antar fold.' : 'Selisihnya masih dalam noise antar fold: jangan terlalu banyak membacanya.'}`) }));
      },
      summary: () => (S.model ? `${modelName(S.model)}${C.tuned[S.model] ? ` · ${tr('validation AUC', 'AUC validasi')} ${d2(C.tuned[S.model].results.find(r => r.value === C.used[S.model]).mean)}` : ''}` : ''),
    };
  }

  // ---- step 4: uncertainty -----------------------------------------------------------------------------------------

  function step4() {
    const body = h('div');
    const bHost = h('div', { class: 'cap-model' });
    const bPanel = panel(bHost, [{ name: 'B', type: 'range', label: tr('Bootstrap resamples (B)', 'Resample bootstrap (B)'), min: B_RANGE.min, max: B_RANGE.max, step: B_RANGE.step, value: S.B }], (name, v) => { S.B = v.B; update(); });
    const score = h('button', { type: 'button', class: 'btn primary', text: tr('Score the held-out rows', 'Nilai held-out rows') });
    score.addEventListener('click', () => {
      S.scored = true; expect = tr('Held-out rows scored.', 'Held-out rows sudah dinilai.');
      update(); announce(tr('Scoring the held-out rows.', 'Menilai held-out rows.'));
    });
    const out = h('div', { class: 'cap-out' });
    const readName = nextId('cap-read');
    const readSet = h('fieldset', { class: 'cap-set' }, h('legend', { text: tr('How would you read these intervals?', 'Bagaimana kamu membaca interval ini?') }));
    const readInputs = READINGS.map(k => {
      const c = radioChoice(readName, k, readingLabel(k), '', () => { S.reading = k; update(); if (C.scores) announce(readingFeedback(k, truth())); });
      readSet.append(c.label);
      return c.input;
    });
    const readFb = h('p', { class: 'cap-verdict', hidden: true });
    const truth = () => readingTruth(C.scores[S.model].auc, C.diff);
    body.append(
      h('p', { text: tr('Now the held-out rows are scored, once. A score from a few hundred transactions and a handful of frauds is one draw from many possible draws, so each score comes with a 95% bootstrap interval: resample the held-out rows with replacement, score again, and keep the middle 95%.', 'Sekarang held-out rows dinilai, satu kali. Skor dari beberapa ratus transaksi dan segelintir fraud hanyalah satu hasil dari banyak kemungkinan, jadi tiap skor disertai interval bootstrap 95%: ambil ulang held-out rows dengan pengembalian, nilai lagi, dan ambil 95% bagian tengahnya.') }),
      bHost, h('div', { class: 'cap-actions' }, score), out, readSet, readFb);
    return {
      body,
      render() {
        bPanel.set('B', S.B);
        score.disabled = !(S.split && S.model);
        out.replaceChildren(); readFb.hidden = true;
        readSet.disabled = !C.scores;
        readInputs.forEach(i => { i.checked = i.value === S.reading; });
        charts.auc = null;
        if (!S.model) { out.append(h('p', { class: 'hint', text: tr('Choose the model to take forward in step 3 first.', 'Pilih model yang dibawa di langkah 3 dulu.') })); return; }
        if (!S.scored) { out.append(h('p', { class: 'hint', text: tr('Press "Score the held-out rows". The model is fitted on the training part and scored once on rows it has never seen.', 'Tekan "Nilai held-out rows". Model dilatih pada bagian training dan dinilai satu kali pada baris yang belum pernah dilihatnya.') })); return; }
        if (!C.scores) { out.append(workingNote()); return; }
        const s = C.scores, n = C.held.labels.length, frauds = C.held.labels.filter(l => l === 1).length;
        const head = h('tr', {}, ...[tr('Model', 'Model'), 'AUC', tr('Average precision', 'Average precision'), tr('Expected cost per transaction', 'Expected cost per transaksi')].map(t => h('th', { scope: 'col', text: t })));
        const body_ = h('tbody');
        for (const m of MODEL_KEYS) {
          body_.append(h('tr', { class: m === S.model ? 'cap-chosen' : null }, h('th', { scope: 'row', text: modelName(m) + (m === S.model ? tr(' (yours)', ' (pilihanmu)') : '') }),
            h('td', { 'data-label': 'AUC', text: intervalText(s[m].auc) }),
            h('td', { 'data-label': tr('Average precision', 'Average precision'), text: intervalText(s[m].ap) }),
            h('td', { 'data-label': tr('Expected cost per transaction', 'Expected cost per transaksi'), text: intervalText(s[m].cost) })));
        }
        const canvas = h('canvas', { role: 'img' });
        const keyId = nextId('cap-key');
        canvas.setAttribute('aria-describedby', keyId);
        out.append(
          h('p', { class: 'cap-note', text: tr(`Held-out rows: ${fmt(n)} transactions, ${fmt(frauds)} of them fraud, from the ${splitName(S.split)} split. Each cell reads: estimate (lower end – upper end of the 95% interval, ${fmt(S.B)} resamples).`, `Held-out rows: ${fmt(n)} transaksi, ${fmt(frauds)} di antaranya fraud, dari split ${splitName(S.split)}. Tiap sel berbunyi: perkiraan (ujung bawah – ujung atas interval 95%, ${fmt(S.B)} resample).`) }),
          h('div', { class: 'table-scroll' }, h('table', { class: 'cap-table cap-stack' }, h('caption', { text: tr('Held-out scores with 95% bootstrap intervals', 'Skor held-out dengan interval bootstrap 95%') }), h('thead', {}, head), body_)),
          h('h4', { text: tr('AUC with its 95% interval', 'AUC beserta interval 95%') }),
          h('div', { class: 'cap-chart' }, canvas),
          h('div', { class: 'cap-key', id: keyId }, ...MODEL_KEYS.map(m => h('span', {}, h('i', { style: `background:${modelColor(m)};border-color:${modelColor(m)}` }), modelName(m))), h('span', {}, tr(`Dashed line: AUC ${fmt(0.5)}, a coin flip`, `Garis putus-putus: AUC ${fmt(0.5)}, lempar koin`))),
          h('ul', {}, intervalSentences(s, { n, frauds }, S.model, otherModel(S.model), C.diff).map(t => h('li', { text: t }))));
        charts.auc = { canvas, s };
        if (C.diff && S.reading) { readFb.hidden = false; readFb.textContent = readingFeedback(S.reading, truth()); }
      },
      summary: () => (C.scores && S.model ? `AUC ${intervalText(C.scores[S.model].auc)}` : ''),
    };
  }

  // ---- step 5: threshold ---------------------------------------------------------------------------------------------

  function step5() {
    const body = h('div');
    const rule = h('p', { class: 'cap-verdict' });
    const sliderId = nextId('cap-thr');
    const slider = h('input', { id: sliderId, type: 'range', min: '0.005', max: '1', step: '0.005', value: '0.05' });
    const sliderOut = h('output', { for: sliderId, 'aria-hidden': 'true' });
    slider.addEventListener('input', () => { S.threshold = Number(slider.value); S.thresholdSet = false; update(); });
    const useCost = h('button', { type: 'button', class: 'btn', text: tr('Use the cost threshold', 'Pakai threshold biaya') });
    useCost.addEventListener('click', () => { S.threshold = null; S.thresholdSet = false; update(); announce(tr(`Threshold back at the cost threshold, ${pct(C.thr)}.`, `Threshold kembali ke threshold biaya, ${pct(C.thr)}.`)); });
    const use = h('button', { type: 'button', class: 'btn primary', text: tr('Use this threshold', 'Pakai threshold ini') });
    use.addEventListener('click', () => { S.thresholdSet = true; update(); announce(tr(`Threshold ${pct(C.thrNow ?? C.thr)} chosen.`, `Threshold ${pct(C.thrNow ?? C.thr)} dipilih.`)); });
    const state = h('span', { class: 'cap-readout' });
    const out = h('div', { class: 'cap-out' });
    body.append(
      h('p', { text: tr('The model gives each transaction a probability of fraud. The threshold turns it into a decision: flag it or not. The costs from step 1 decide where the threshold should be, not the held-out rows.', 'Model memberi tiap transaksi probabilitas fraud. Threshold mengubahnya menjadi keputusan: ditandai atau tidak. Biaya dari langkah 1 yang menentukan letak threshold, bukan held-out rows.') }),
      rule,
      h('label', { class: 'cap-slider', for: sliderId }, tr('Threshold (flag a transaction when its probability reaches this)', 'Threshold (tandai transaksi bila probabilitasnya mencapai nilai ini)'), sliderOut, slider),
      h('div', { class: 'cap-actions' }, useCost, use, state), out);
    return {
      body,
      render() {
        rule.textContent = thresholdRule(S.fp, S.fn, C.thr);
        out.replaceChildren(); charts.cost = null;
        const ready = Boolean(C.run);
        slider.disabled = useCost.disabled = use.disabled = !ready;
        state.textContent = S.thresholdSet ? tr('Threshold chosen.', 'Threshold dipilih.') : '';
        if (!ready) {
          sliderOut.textContent = '';
          out.append(h('p', { class: 'hint', text: S.scored ? (C.scores ? '' : tr('Working…', 'Sedang menghitung…')) : tr('Score the held-out rows in step 4 first.', 'Nilai held-out rows di langkah 4 dulu.') }));
          return;
        }
        slider.max = String(C.xMax);
        slider.value = (Math.round(C.thrNow / 0.005) * 0.005).toFixed(3);
        sliderOut.textContent = pct(C.thrNow);
        slider.setAttribute('aria-valuetext', pct(C.thrNow));
        const r = C.run, f = C.facts, n = r.n;
        const none = C.held.labels.filter(l => l === 1).length * S.fn / n, allCost = C.held.labels.filter(l => l === 0).length * S.fp / n;
        const stat = (k, v) => h('div', {}, h('dt', { text: k }), h('dd', { text: v }));
        const canvas = h('canvas', { role: 'img' });
        const keyId = nextId('cap-key');
        canvas.setAttribute('aria-describedby', keyId);
        out.append(
          h('dl', { class: 'cap-stats' },
            stat(tr('Cost threshold', 'Threshold biaya'), pct(C.thr)),
            stat(tr('Your threshold', 'Thresholdmu'), pct(r.threshold)),
            stat(tr('Flagged', 'Ditandai'), `${fmt(r.flagged)} / ${fmt(n)}`),
            stat(tr('Precision', 'Precision'), precisionText(r)),
            stat(tr('Recall', 'Recall'), pct(r.recall, 0)),
            stat(tr('Expected cost per transaction', 'Expected cost per transaksi'), d2(r.expectedCost)),
            stat(tr('Total cost on the held-out rows', 'Total biaya pada held-out rows'), fmt(r.totalCost))),
          h('p', { text: tr(`For comparison, flagging nothing costs ${d2(none)} per transaction and flagging everything costs ${d2(allCost)}.`, `Sebagai pembanding, tidak menandai apa pun berbiaya ${d2(none)} per transaksi dan menandai semuanya berbiaya ${d2(allCost)}.`) }),
          confusionTable(r),
          h('h4', { text: tr('Expected cost on the held-out rows at each threshold', 'Expected cost pada held-out rows di tiap threshold') }),
          h('div', { class: 'cap-chart' }, canvas),
          h('div', { class: 'cap-key', id: keyId },
            h('span', {}, h('i', { style: 'background:var(--accent);border-color:var(--accent)' }), tr('Cost threshold', 'Threshold biaya')),
            h('span', {}, h('i', { style: 'background:var(--ink);border-color:var(--ink)' }), tr('Your threshold', 'Thresholdmu')),
            h('span', {}, h('i', { style: 'background:transparent' }), tr('Dashed lines: flag nothing, flag everything', 'Garis putus-putus: tidak menandai apa pun, menandai semuanya'))),
          h('ul', {}, thresholdSentences(r, C.thr, C.atCost, f).map(t => h('li', { text: t }))),
          h('p', { class: 'hint', text: tr('A model\'s probabilities are not always true probabilities. A strong penalty or a flexible forest can push them away from the real fraud rate, and then a threshold computed from the costs is only approximately right.', 'Probabilitas sebuah model tidak selalu probabilitas yang sebenarnya. Penalti yang kuat atau forest yang fleksibel dapat menggesernya dari tingkat fraud yang sebenarnya, dan threshold yang dihitung dari biaya hanya kira-kira tepat.') }));
        charts.cost = { canvas, none, allCost };
      },
      summary: () => (C.run && S.thresholdSet ? tr(`${pct(C.run.threshold)} · cost ${d2(C.run.expectedCost)} per transaction`, `${pct(C.run.threshold)} · biaya ${d2(C.run.expectedCost)} per transaksi`) : ''),
    };
  }

  // ---- step 6: report ----------------------------------------------------------------------------------------------

  function step6() {
    const body = h('div');
    const textBox = h('div', { class: 'cap-text' });
    const fields = {
      splitWhy: [tr('The split and why', 'Split dan alasannya'), tr('Which split did you use, who will the model meet in use, and what did the comparison with the other splits show?', 'Split mana yang kamu pakai, siapa yang akan dihadapi model saat dipakai, dan apa yang ditunjukkan perbandingan dengan split lain?')],
      modelWhy: [tr('The model I chose and why', 'Model yang kupilih dan alasannya'), tr('Which model, with which setting, and what in the validation scores and the intervals supports it?', 'Model mana, dengan pengaturan apa, dan apa dari skor validasi serta interval yang mendukungnya?')],
      risks: [tr('What could go wrong', 'Apa yang bisa salah'), tr('Name two or three risks: the data, the split, the costs, the probabilities, the few frauds.', 'Sebutkan dua atau tiga risiko: datanya, splitnya, biayanya, probabilitasnya, sedikitnya fraud.')],
    };
    const areas = {};
    for (const f of TEXT_FIELDS) {
      const id = nextId('cap-text');
      const ta = h('textarea', { id, maxlength: String(MAX_TEXT), rows: '3', placeholder: fields[f][1] });
      ta.addEventListener('input', () => { S.text[f] = ta.value; touch(); });
      areas[f] = ta;
      textBox.append(h('label', { for: id, text: fields[f][0] }), ta);
    }
    const rubric = h('div', { class: 'cap-rubric' });
    const radios = [];
    for (const c of CRITERIA) {
      const name = nextId('cap-rate');
      const set = h('fieldset', { class: 'cap-set' }, h('legend', { text: criterionTitle(c) }));
      for (const level of [1, 2, 3]) {
        const input = h('input', { type: 'radio', name, value: String(level) });
        input.addEventListener('change', () => { S.rubric[c] = level; touch(); });
        radios.push([c, level, input]);
        set.append(h('label', { class: 'cap-level' }, input, h('span', {}, h('b', { text: `${levelLabel(level)}: ` }), levelText(c, level))));
      }
      rubric.append(set);
    }
    const summaryId = nextId('cap-summary');
    const summaryTa = h('textarea', { id: summaryId, readonly: true, rows: '16' });
    const copy = h('button', { type: 'button', class: 'btn primary', text: tr('Copy summary', 'Salin ringkasan') });
    copy.addEventListener('click', async () => {
      const text = summaryTa.value;
      try { await navigator.clipboard.writeText(text); announce(tr('Summary copied.', 'Ringkasan disalin.')); } catch {
        summaryTa.focus(); summaryTa.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch { ok = false; }
        announce(ok ? tr('Summary copied.', 'Ringkasan disalin.') : tr('Could not copy automatically. The text is selected: press Ctrl+C.', 'Tidak bisa menyalin otomatis. Teksnya sudah terpilih: tekan Ctrl+C.'));
      }
    });
    body.append(
      h('p', { text: tr('Write a few lines about your project in your own words, then rate your own work against the four criteria. Pick the level that is honestly true today. Remember that the data are synthetic: say so in your report.', 'Tulis beberapa baris tentang proyekmu dengan kata-katamu sendiri, lalu nilai pekerjaanmu terhadap empat kriteria. Pilih tingkat yang jujur benar hari ini. Ingat bahwa datanya sintetis: sebutkan itu dalam laporanmu.') }),
      textBox,
      h('h4', { class: 'cap-out', text: tr('Rate your own work', 'Nilai pekerjaanmu sendiri'), style: 'margin-bottom:0' }),
      rubric,
      h('div', { class: 'cap-summary' }, h('label', { for: summaryId, text: tr('Capstone summary', 'Ringkasan capstone') }), summaryTa),
      h('div', { class: 'cap-actions' }, copy));
    return {
      body,
      render() {
        for (const f of TEXT_FIELDS) if (areas[f].value !== S.text[f]) areas[f].value = S.text[f];
        for (const [c, level, input] of radios) input.checked = S.rubric[c] === level;
        this.renderSummary();
      },
      renderSummary() { summaryTa.value = buildSummary(summaryInput()); },
      summary: () => tr(`${fmt(TEXT_FIELDS.filter(f => S.text[f].trim()).length)} of 3 texts, ${fmt(CRITERIA.filter(c => S.rubric[c] > 0).length)} of 4 rated`, `${fmt(TEXT_FIELDS.filter(f => S.text[f].trim()).length)} dari 3 teks, ${fmt(CRITERIA.filter(c => S.rubric[c] > 0).length)} dari 4 dinilai`),
    };
  }

  function summaryInput() {
    const heldInfo = C.held ? { n: C.held.labels.length, frauds: C.held.labels.filter(l => l === 1).length } : null;
    return {
      facts: C.facts, fp: S.fp, fn: S.fn, thr: C.thr, reasons: S.reasons,
      split: S.split, cmp: S.splitCompared ? C.cmp : null, defence: S.defence,
      tuned: C.tuned, picks: C.used, model: S.model,
      held: heldInfo, scores: C.scores, diff: C.diff, reading: S.reading,
      threshold: S.thresholdSet && C.run ? { value: C.run.threshold, expectedCost: C.run.expectedCost, confusion: C.run.confusion } : null,
      text: S.text, rubric: CRITERIA.map(criterion => ({ criterion, level: S.rubric[criterion] })),
    };
  }

  // ---- charts ----------------------------------------------------------------------------------------------------------

  function setup(canvas) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return null;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { ctx, rect, t: theme() };
  }

  function drawAuc() {
    const c = charts.auc;
    if (!c?.canvas.isConnected || !S.model) return;
    const g = setup(c.canvas);
    if (!g) return;
    const { ctx, rect, t } = g, narrow = rect.width < 420;
    const lo = Math.min(...MODEL_KEYS.map(m => c.s[m].auc.lo).filter(Number.isFinite), 0.5);
    const x0 = Math.max(0, Math.floor((lo - 0.02) * 10) / 10), x1 = 1;
    const m = { l: narrow ? 64 : 84, r: 14, t: 8, b: 30 }, W = rect.width - m.l - m.r, H = rect.height - m.t - m.b;
    const X = v => m.l + (v - x0) / (x1 - x0) * W;
    ctx.fillStyle = t.plot; ctx.fillRect(m.l, m.t, W, H);
    ctx.font = '11px system-ui, sans-serif'; ctx.strokeStyle = t.grid; ctx.fillStyle = t.muted; ctx.lineWidth = 1; ctx.textAlign = 'center';
    ctx.beginPath();
    for (let v = Math.ceil(x0 * 10) / 10; v <= x1 + 1e-9; v += 0.1) { ctx.moveTo(X(v), m.t); ctx.lineTo(X(v), m.t + H); ctx.fillText(fmt(v, { digits: 1 }), X(v), m.t + H + 15); }
    ctx.stroke();
    ctx.setLineDash([5, 4]); ctx.strokeStyle = t.muted; ctx.beginPath(); ctx.moveTo(X(0.5), m.t); ctx.lineTo(X(0.5), m.t + H); ctx.stroke(); ctx.setLineDash([]);
    const rowH = H / MODEL_KEYS.length, parts = [];
    MODEL_KEYS.forEach((k, i) => {
      const iv = c.s[k].auc, y = m.t + rowH * (i + 0.5), color = modelColor(k), mine = k === S.model;
      ctx.fillStyle = t.ink; ctx.font = `${mine ? 700 : 600} 12px system-ui, sans-serif`; ctx.textAlign = 'right';
      ctx.fillText(modelShort(k), m.l - 8, y + 4);
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = mine ? 4 : 2.5;
      if (Number.isFinite(iv.lo)) {
        ctx.beginPath(); ctx.moveTo(X(iv.lo), y); ctx.lineTo(X(iv.hi), y); ctx.moveTo(X(iv.lo), y - 6); ctx.lineTo(X(iv.lo), y + 6); ctx.moveTo(X(iv.hi), y - 6); ctx.lineTo(X(iv.hi), y + 6); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(X(iv.estimate), y, mine ? 6 : 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = t.ink; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(d2(iv.estimate), X(iv.estimate), y - 11);
      parts.push(tr(`${modelName(k)}: ${intervalText(iv)}`, `${modelName(k)}: ${intervalText(iv)}`));
    });
    c.canvas.setAttribute('aria-label', `${tr('Interval chart of the held-out AUC, estimate with the lower and upper end of the 95% interval', 'Diagram interval AUC held-out, perkiraan dengan ujung bawah dan atas interval 95%')}. ${parts.join('; ')}.`);
  }

  function drawCost() {
    const c = charts.cost;
    if (!c?.canvas.isConnected || !C.run) return;
    const g = setup(c.canvas);
    if (!g) return;
    const { ctx, rect, t } = g;
    const curve = costCurve(C.held.probas[S.model], C.held.labels, { fpCost: S.fp, fnCost: S.fn, xMax: C.xMax });
    const top = Math.max(...curve.map(p => p.cost), c.none, c.allCost) * 1.12 || 1;
    const m = { l: 44, r: 12, t: 10, b: 30 }, W = rect.width - m.l - m.r, H = rect.height - m.t - m.b;
    const X = v => m.l + v / C.xMax * W, Y = v => m.t + H - v / top * H;
    ctx.fillStyle = t.plot; ctx.fillRect(m.l, m.t, W, H);
    ctx.font = '11px system-ui, sans-serif'; ctx.strokeStyle = t.grid; ctx.fillStyle = t.muted; ctx.lineWidth = 1; ctx.textAlign = 'right';
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) { const v = top * i / 4; ctx.moveTo(m.l, Y(v)); ctx.lineTo(m.l + W, Y(v)); ctx.fillText(fmt(v, { digits: 1 }), m.l - 6, Y(v) + 4); }
    ctx.stroke();
    ctx.textAlign = 'center';
    const tick = C.xMax <= 0.2 ? 0.05 : C.xMax <= 0.5 ? 0.1 : 0.2;
    for (let v = 0; v <= C.xMax + 1e-9; v += tick) ctx.fillText(pct(v, 0), X(v), m.t + H + 15);
    ctx.setLineDash([5, 4]); ctx.strokeStyle = t.muted; ctx.beginPath();
    for (const v of [c.none, c.allCost]) { ctx.moveTo(m.l, Y(v)); ctx.lineTo(m.l + W, Y(v)); }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = modelColor(S.model); ctx.lineWidth = 2.5; ctx.beginPath();
    curve.forEach((p, i) => { if (i) ctx.lineTo(X(p.t), Y(p.cost)); else ctx.moveTo(X(p.t), Y(p.cost)); });
    ctx.stroke();
    const mark = (v, cost, color, dash) => {
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2; ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(X(v), m.t); ctx.lineTo(X(v), m.t + H); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(X(v), Y(cost), 5, 0, Math.PI * 2); ctx.fill();
    };
    mark(C.thr, C.atCost.expectedCost, t.accent, [4, 3]);
    mark(C.thrNow, C.run.expectedCost, t.ink, []);
    ctx.fillStyle = t.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(tr('flag nothing / flag everything', 'tidak menandai / menandai semuanya'), m.l + W - 6, Math.max(m.t + 12, Y(Math.max(c.none, c.allCost)) - 5));
    c.canvas.setAttribute('aria-label', tr(
      `Line chart of the expected cost per transaction against the threshold, from ${pct(curve[0].t, 1)} to ${pct(C.xMax, 0)}. At the cost threshold of ${pct(C.thr)} the cost is ${d2(C.atCost.expectedCost)}; at your threshold of ${pct(C.thrNow)} it is ${d2(C.run.expectedCost)}. Flagging nothing costs ${d2(c.none)} and flagging everything ${d2(c.allCost)}.`,
      `Diagram garis expected cost per transaksi terhadap threshold, dari ${pct(curve[0].t, 1)} sampai ${pct(C.xMax, 0)}. Pada threshold biaya ${pct(C.thr)} biayanya ${d2(C.atCost.expectedCost)}; pada thresholdmu ${pct(C.thrNow)} biayanya ${d2(C.run.expectedCost)}. Tidak menandai apa pun berbiaya ${d2(c.none)} dan menandai semuanya ${d2(c.allCost)}.`));
  }
  const drawAll = () => { drawAuc(); drawCost(); };

  // ---- the quick quiz (predict first) ------------------------------------------------------------------------------

  const quiz = predictBox(lab.ref('below'), {
    hint: tr('Compare the three splits in step 2 first, then check your answer.', 'Bandingkan ketiga split di langkah 2 dulu, lalu periksa jawabanmu.'),
    name: 'predict-split',
    question: tr('Compared with a grouped split, what AUC will a random split give the reference forest?', 'Dibandingkan dengan split per pelanggan, AUC berapa yang akan diberikan split acak pada forest acuan?'),
    choices: [
      ['higher', tr('Higher: the same customers are in the training rows and in the test rows', 'Lebih tinggi: pelanggan yang sama ada di training rows dan di test rows')],
      ['same', tr('About the same (within three points of AUC)', 'Hampir sama (selisih dalam tiga poin AUC)')],
      ['lower', tr('Lower: a random split is the stricter test', 'Lebih rendah: split acak adalah ujian yang lebih ketat')],
    ],
  });
  let lastReveal = '';
  function revealQuiz() {
    if (!C?.cmp || quiz.chosen() == null) return;
    const verdict = randomVsGrouped(C.cmp);
    const text = tr(`Random split: AUC ${d2(C.cmp.random.auc)}. Grouped split: AUC ${d2(C.cmp.grouped.auc)}. With a random split the same customer is on both sides, so the forest can recognise a customer from his other transactions.`, `Split acak: AUC ${d2(C.cmp.random.auc)}. Split per pelanggan: AUC ${d2(C.cmp.grouped.auc)}. Pada split acak, pelanggan yang sama ada di kedua sisi, sehingga forest dapat mengenali pelanggan dari transaksinya yang lain.`);
    lastReveal = `${quiz.chosen()}|${verdict}|${text}`;
    quiz.reveal(verdict, text);
  }
  quiz.onPick(revealQuiz);
  quiz.onCheck(revealQuiz);
  lab.cleanup(() => quiz.destroy());

  // ---- the stepper ------------------------------------------------------------------------------------------------

  const titles = () => [
    tr('Frame the problem', 'Rumuskan masalah'), tr('Choose and defend a split', 'Pilih dan bela sebuah split'), tr('Compare models', 'Bandingkan model'),
    tr('Measure the uncertainty', 'Ukur ketidakpastian'), tr('Choose the threshold', 'Pilih threshold'), tr('Report and rate', 'Laporkan dan nilai'),
  ];
  const shorts = () => [tr('Frame', 'Rumuskan'), tr('Split', 'Split'), tr('Models', 'Model'), tr('Uncertainty', 'Interval'), tr('Threshold', 'Threshold'), tr('Report', 'Laporan')];
  const unlocked = i => done.slice(0, i).every(Boolean);
  const firstOpen = () => { const i = done.findIndex(d => !d); return i < 0 ? STEP_COUNT - 1 : i; };

  function pulseQuiz() {
    const badge = root.querySelector('.qq-badge');
    if (!badge || badge.hidden) return;
    badge.classList.remove('pulse'); void badge.offsetWidth; badge.classList.add('pulse');
  }

  function goTo(i, { focus = true, scroll = true } = {}) {
    if (!unlocked(i)) return;
    openSet.add(i); S.open = i; save();
    renderChrome();
    if (i === 1 && quiz.chosen() == null) pulseQuiz();
    requestAnimationFrame(drawAll);
    if (focus || scroll) {
      const head = steps[i].head;
      if (scroll) head.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      if (focus) head.focus({ preventScroll: true });
    }
  }

  function build() {
    for (const el of [...cap.querySelectorAll(':scope > .cap-built')]) el.remove();
    const built = [step1(), step2(), step3(), step4(), step5(), step6()];
    const nextTitle = i => titles()[i + 1];
    const checkList = h('ol', { class: 'cap-check', 'aria-label': tr('Project steps', 'Langkah proyek') });
    const bar = h('div', { class: 'cap-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(STEP_COUNT), 'aria-label': tr('Steps done', 'Langkah selesai') }, h('i'));
    const list = h('ol', { class: 'cap-steps' });
    steps = []; chips = [];
    built.forEach((st, i) => {
      const bodyId = nextId('cap-body');
      const chip = h('button', { type: 'button', class: 'cap-chip' }, h('span', { class: 'cap-num', 'aria-hidden': 'true' }), h('span', { class: 'cap-chip-name' }));
      chip.addEventListener('click', () => goTo(i));
      chips.push(chip);
      checkList.append(h('li', {}, chip));
      const num = h('span', { class: 'cap-num', 'aria-hidden': 'true' });
      const title = h('span', { class: 'cap-title' }, h('span', { class: 'cap-name' }), h('span', { class: 'cap-sum' }));
      const state = h('span', { class: 'cap-state' });
      const head = h('button', { type: 'button', class: 'cap-head', 'aria-controls': bodyId, 'aria-expanded': 'false' }, num, title, state);
      head.addEventListener('click', () => {
        if (openSet.has(i)) { openSet.delete(i); renderChrome(); } else goTo(i, { scroll: false, focus: false });
        requestAnimationFrame(drawAll);
      });
      const more = i < STEP_COUNT - 1
        ? h('div', { class: 'cap-actions' }, (() => {
          const b = h('button', { type: 'button', class: 'btn', text: tr(`Continue to step ${fmt(i + 2)}: ${nextTitle(i)}`, `Lanjut ke langkah ${fmt(i + 2)}: ${nextTitle(i)}`) });
          b.addEventListener('click', () => { openSet.delete(i); goTo(i + 1); });
          return b;
        })())
        : null;
      const body = h('div', { class: 'cap-body', id: bodyId, role: 'region', hidden: true }, st.body, more);
      const li = h('li', { class: 'cap-step' }, h('h3', {}, head), body);
      list.append(li);
      steps[i] = { st, num, name: title.firstChild, sum: title.lastChild, state, head, body, li, nextBtn: more?.querySelector('button'), chip };
      head.id = nextId('cap-h');
      body.setAttribute('aria-labelledby', head.id);
    });
    cap.append(h('div', { class: 'cap-built' }, checkList, bar, list), startRow);
    ui = { bar };
    update();
    if (!openSet.size || !unlocked([...openSet][0])) { openSet.clear(); openSet.add(firstOpen()); renderChrome(); }
  }

  function renderChrome() {
    if (!steps.length) return;
    const t = titles(), s = shorts(), count = done.filter(Boolean).length, current = firstOpen();
    steps.forEach((step, i) => {
      const open = openSet.has(i) && unlocked(i), locked = !unlocked(i);
      step.li.dataset.step = String(i + 1);
      step.head.classList.toggle('done', done[i]);
      step.head.disabled = locked;
      step.head.setAttribute('aria-expanded', String(open));
      step.body.hidden = !open;
      step.name.textContent = tr(`Step ${fmt(i + 1)}: ${t[i]}`, `Langkah ${fmt(i + 1)}: ${t[i]}`);
      step.num.textContent = done[i] ? '✓' : fmt(i + 1);
      const sum = !locked && !open ? step.st.summary?.() ?? '' : '';
      step.sum.textContent = locked ? tr(`Finish step ${fmt(i)} first`, `Selesaikan langkah ${fmt(i)} dulu`) : sum;
      step.state.textContent = done[i] ? tr('Done', 'Selesai') : locked ? tr('Locked', 'Terkunci') : tr('To do', 'Belum');
      if (step.nextBtn) step.nextBtn.disabled = !done[i];
      const chip = chips[i];
      chip.classList.toggle('done', done[i]);
      chip.disabled = locked;
      chip.querySelector('.cap-num').textContent = done[i] ? '✓' : fmt(i + 1);
      chip.querySelector('.cap-chip-name').textContent = s[i];
      chip.setAttribute('aria-label', tr(`Step ${fmt(i + 1)}: ${t[i]}, ${done[i] ? 'done' : locked ? 'locked' : 'not done yet'}`, `Langkah ${fmt(i + 1)}: ${t[i]}, ${done[i] ? 'selesai' : locked ? 'terkunci' : 'belum selesai'}`));
      if (i === current && count < STEP_COUNT) chip.setAttribute('aria-current', 'step'); else chip.removeAttribute('aria-current');
    });
    ui.bar.setAttribute('aria-valuenow', String(count));
    ui.bar.setAttribute('aria-valuetext', tr(`${fmt(count)} of ${fmt(STEP_COUNT)} steps done`, `${fmt(count)} dari ${fmt(STEP_COUNT)} langkah selesai`));
    ui.bar.firstChild.style.width = `${count / STEP_COUNT * 100}%`;
    lab.setStatus(tr(`${fmt(count)} of ${fmt(STEP_COUNT)} steps done`, `${fmt(count)} dari ${fmt(STEP_COUNT)} langkah selesai`));
    lab.setMetrics(`${fmt(count)}/${fmt(STEP_COUNT)}`);
    lab.setDetail(count === STEP_COUNT ? tr('All six steps are done. Copy your summary at the end of step 6.', 'Keenam langkah selesai. Salin ringkasanmu di akhir langkah 6.') : tr(`Next: step ${fmt(current + 1)}, ${t[current]}.`, `Berikutnya: langkah ${fmt(current + 1)}, ${t[current]}.`));
    renderRecap();
  }

  // Redraws everything that depends on the saved choices. Typing in a text field calls touch() instead, which
  // leaves the step bodies alone so a field never loses the focus.
  function update() {
    C = compute();
    done = stepDone(S);
    steps.forEach(step => step.st.render());
    renderChrome();
    revealIfAnswered();
    save();
    requestAnimationFrame(drawAll);
  }
  function revealIfAnswered() {
    if (quiz.chosen() == null || !C?.cmp) return;
    const verdict = randomVsGrouped(C.cmp);
    if (!lastReveal.startsWith(`${quiz.chosen()}|${verdict}|`)) revealQuiz();
  }
  function touch() {
    done = stepDone(S);
    renderChrome();
    steps[5]?.st.renderSummary?.();
    save();
  }

  // ---- the "Your project" card -------------------------------------------------------------------------------------

  const recap = h('div', { class: 'cap-aside' });
  const controls = lab.panel([
    { type: 'note', text: tr('The transactions are synthetic: a program made them, and no real customer is behind them. Your work is saved in this browser only.', 'Transaksinya sintetis: sebuah program membuatnya, dan tidak ada pelanggan sungguhan di baliknya. Pekerjaanmu hanya tersimpan di browser ini.') },
    { name: 'startOver', type: 'button', label: tr('Start over', 'Mulai dari awal'), onClick: () => startOver() },
  ], () => {});
  lab.ref('panel').prepend(recap);
  // A second Start over button sits under the steps, so a phone (where the card above is a sheet) has one in plain sight.
  const startBtns = [controls.el.querySelector('.panel-button'), h('button', { type: 'button', class: 'btn', text: tr('Start over', 'Mulai dari awal') })];
  startBtns[1].addEventListener('click', () => startOver());
  const startRow = h('div', { class: 'cap-actions' }, startBtns[1]);
  function renderRecap() {
    const n = (label, value) => [h('dt', { text: label }), h('dd', { text: value || '–' })];
    recap.replaceChildren(h('dl', {},
      n(tr('Dataset', 'Dataset'), tr(`${fmt(S.seed)} of ${fmt(DATA_SEEDS.length)} (synthetic)`, `${fmt(S.seed)} dari ${fmt(DATA_SEEDS.length)} (sintetis)`)),
      n(tr('Costs', 'Biaya'), S.costsSet ? tr(`false alarm ${fmt(S.fp)}, missed fraud ${fmt(S.fn)}`, `alarm palsu ${fmt(S.fp)}, fraud terlewat ${fmt(S.fn)}`) : ''),
      n(tr('Split', 'Split'), S.split ? splitName(S.split) : ''),
      n(tr('Model', 'Model'), S.model ? modelName(S.model) : ''),
      n(tr('Threshold', 'Threshold'), S.thresholdSet && C.run ? pct(C.run.threshold) : '')));
  }
  function disarm() {
    armed = false; clearTimeout(armTimer);
    startBtns.forEach(b => { b.textContent = tr('Start over', 'Mulai dari awal'); });
  }
  function startOver() {
    if (!armed) {
      armed = true;
      startBtns.forEach(b => { b.textContent = tr('Press again to erase everything', 'Tekan lagi untuk menghapus semuanya'); });
      announce(tr('This erases your choices, notes and texts. Press Start over again within five seconds to confirm.', 'Ini menghapus pilihan, catatan, dan teksmu. Tekan Mulai dari awal sekali lagi dalam lima detik untuk mengonfirmasi.'));
      armTimer = setTimeout(disarm, 5000);
      return;
    }
    disarm();
    S = emptyState();
    cache.clear();
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    quiz.reset(); lastReveal = '';
    openSet.clear(); openSet.add(0);
    build();
    announce(tr('Everything was erased. You are back at step 1.', 'Semuanya sudah dihapus. Kamu kembali ke langkah 1.'));
  }
  lab.onReset(() => startOver());
  lab.cleanup(() => { clearTimeout(armTimer); clearTimeout(liveTimer); });

  lab.onTheme(drawAll);
  const ro = new ResizeObserver(() => drawAll());
  ro.observe(cap);
  lab.cleanup(() => { destroyed = true; ro.disconnect(); });
  build();
  return lab.destroy;
}
