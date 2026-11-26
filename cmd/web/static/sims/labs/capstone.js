// Capstone workbench: one guided classification project on the real penguins data, in six steps that open in
// order (frame the problem, baseline, model A, model B and comparison, inspect errors, explain and rate).
// Built on the lab kit; the steps live in a vertical stepper instead of a plot. All choices and typed text are
// saved in localStorage (every access guarded), scores are recomputed from the saved choices, and nothing
// translated is stored, so a language switch rebuilds the lab without losing work. The pure logic is in
// ml/capstonereport.js (saved state, "is this step really done", comparison sentences, the summary) and
// ml/capstone.js (tasks, split, models, scores).
import { createLab, panel, predictBox, loadDataset, clusterColor, theme, tr, fmt, pct } from '../kit/index.js';
import { FEATURES, TASKS, taskKeys, featureLabel, modelLabel, prepareTask, stratifiedSplit, fitModel, evaluate } from '../ml/capstone.js';
import {
  STORAGE_KEY, METRICS, KINDS, REASONS, CRITERIA, TEXT_FIELDS, STEP_COUNT, MARKS_NEEDED, MAX_NOTE, MAX_TEXT,
  emptyState, sanitizeState, modelParams, sameModel, selectColumns, describeModel, featureList, metricName, metricValue, metricUndefined,
  pickBetter, compareToBaseline, baselineSentence, gapSentence, betterSentence, mistakeMeaning, metricReason, metricWarning,
  reasonLabel, criterionTitle, levelLabel, levelText, inspectList, pruneMarks, stepDone, buildSummary,
} from '../ml/capstonereport.js';

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
.cap-out{margin-top:12px}
.cap-out h4{margin:14px 0 4px;font-size:13px;color:var(--accent)}
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
.cap-model select,.cap-model input[type=number]{display:block;width:100%;margin-top:6px;padding:8px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink);font-size:13px}
.cap-model div.slider-label{margin-top:12px;font-size:13px;font-weight:650}
.cap-model div.slider-label label{display:inline;margin:0}
.cap-model .toggle{display:flex;gap:8px;align-items:center;cursor:pointer;font-weight:600}
.cap-model .toggle input{accent-color:var(--accent);width:16px;height:16px;flex:none}
.cap-model .hint{margin:8px 0 0}
.cap-chart{margin-top:6px}
.cap-chart canvas{display:block;width:100%;height:230px}
.cap-key{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12.5px;color:var(--muted);margin-top:4px}
.cap-key i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-2px;border:2px solid var(--muted)}
.cap-verdict{padding:10px 12px;border-left:4px solid var(--accent);background:var(--surface-2);border-radius:6px;margin-top:10px;font-size:14px}
.cap-pick{width:24px;height:24px;accent-color:var(--accent)}
.cap-detail td{background:var(--surface-2)}
.cap-detail .cap-fields{display:grid;grid-template-columns:minmax(0,220px) minmax(0,1fr);gap:8px 14px;text-align:left}
.cap-fields label{display:block;font-size:12.5px;font-weight:650;text-align:left}
.cap-fields select,.cap-fields input,.cap-text textarea,.cap-summary textarea{display:block;width:100%;margin-top:4px;padding:8px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;font-size:13px}
.cap-text label,.cap-summary label{display:block;margin-top:14px;font-size:13px;font-weight:750}
.cap-text textarea{min-height:76px;resize:vertical}
.cap-summary textarea{min-height:300px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;line-height:1.45}
.cap-rubric{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px}
.cap-rubric .cap-set{margin:0;padding:10px 12px;border:1px solid var(--line);border-radius:10px;min-width:0}
.cap-level{display:flex;gap:8px;align-items:flex-start;margin-top:8px;font-size:13px;cursor:pointer}
.cap-level input{margin-top:3px;flex:none;width:16px;height:16px;accent-color:var(--accent)}
.cap-level b{font-weight:750}
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
  .cap-stack .cap-detail{border:0;padding:0;margin-top:0}
  .cap-stack .cap-detail td{display:block}
  .cap-detail .cap-fields{grid-template-columns:minmax(0,1fr);width:100%}
  .cap-pick{width:32px;height:32px}
  .cap-head .cap-state{display:none}
}
`;

const SPLIT_FRACTION = 0.25;
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
const score = (ev, metric) => (metricUndefined(ev, metric) ? '–' : pct(metricValue(ev, metric)));

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Capstone workbench', 'Workbench capstone'),
    hint: tr('One classification project on the real penguins data, in six steps. Each step opens when the one before it is done, and your work is saved in this browser.', 'Satu proyek klasifikasi pada data penguin yang nyata, dalam enam langkah. Tiap langkah terbuka setelah langkah sebelumnya selesai, dan pekerjaanmu tersimpan di browser ini.'),
    status: true, legend: false,
    settingsTitle: tr('Your project', 'Proyekmu'),
  });

  let S = loadState();
  let C = null;            // what compute() returned for the current state
  let done = Array(STEP_COUNT).fill(false);
  let rows = null, loadToken = 0, destroyed = false, armTimer = 0, liveTimer = 0, armed = false;
  const cache = new Map();
  const openSet = new Set([S.open]);
  let steps = [];
  let chips = [];
  let ui = {};
  let chart = { canvas: null };

  // The plot card holds the stepper instead of a canvas.
  const style = h('style', { text: STYLE });
  const cap = h('div', { class: 'cap' });
  lab.canvas.closest('.chart').replaceWith(style, cap);
  const gate = h('div', { role: 'status' });
  const live = h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  cap.append(gate, live);

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

  function cached(key, make) {
    if (!cache.has(key)) { if (cache.size > 80) cache.clear(); cache.set(key, make()); }
    return cache.get(key);
  }
  const prepFor = task => cached(`prep|${task}`, () => prepareTask(rows, task));
  function splitFor(task, seed) {
    return cached(`split|${task}|${seed}`, () => {
      const p = prepFor(task), s = stratifiedSplit(p.y, { testFraction: SPLIT_FRACTION, seed });
      const at = (idx, a) => idx.map(i => a[i]);
      return { ...s, Xtr: at(s.train, p.X), ytr: at(s.train, p.y), Xte: at(s.test, p.X), yte: at(s.test, p.y), idsTe: at(s.test, p.ids) };
    });
  }
  function fitFor(task, seed, cfg) {
    return cached(`fit|${task}|${seed}|${JSON.stringify([cfg.kind, modelParams(cfg), cfg.features])}`, () => {
      const sp = splitFor(task, seed);
      const Xtr = selectColumns(sp.Xtr, cfg.features), Xte = selectColumns(sp.Xte, cfg.features);
      const model = fitModel(cfg.kind, modelParams(cfg), Xtr, sp.ytr);
      return { model, Xtr, Xte, train: evaluate(model, Xtr, sp.ytr), test: evaluate(model, Xte, sp.yte) };
    });
  }
  function compute() {
    const c = { prep: null, sp: null, base: null, a: null, b: null, better: null, list: [], ids: [] };
    if (!S.task || !rows) return c;
    c.prep = prepFor(S.task);
    c.sp = splitFor(S.task, S.seed);
    if (!S.metric) return c;
    c.base = fitFor(S.task, S.seed, { kind: 'baseline', features: FEATURES });
    if (S.a.run) c.a = fitFor(S.task, S.seed, S.a);
    if (S.b.run) c.b = fitFor(S.task, S.seed, S.b);
    if (c.a && c.b && S.metric && !sameModel(S.a, S.b)) {
      c.better = pickBetter(c.a.test, c.b.test, S.metric);
      const w = c[c.better];
      c.list = inspectList(w.model, w.Xtr, c.sp.ytr, w.Xte, c.sp.yte, c.sp.idsTe, rows);
      c.ids = c.list.map(e => e.id);
    }
    return c;
  }
  const names = () => ({ pos: S.task ? TASKS[S.task].positiveName() : '', neg: S.task ? TASKS[S.task].negativeName() : '' });
  const nameA = () => tr('Model A', 'Model A');
  const nameB = () => tr('Model B', 'Model B');
  const balance = () => {
    const n = names(), pos = C.prep.y.filter(v => v === 1).length;
    return { pos, neg: C.prep.y.length - pos, posName: n.pos, negName: n.neg };
  };

  // ---- shared pieces ---------------------------------------------------------------------------------------------

  function scoreTable(caption, trainEv, testEv) {
    const t = h('table', { class: 'cap-table' }, h('caption', { text: caption }),
      h('thead', {}, h('tr', {}, h('th', { scope: 'col', text: tr('Score', 'Skor') }), h('th', { scope: 'col', text: tr('Training rows', 'Training rows') }), h('th', { scope: 'col', text: tr('Test rows', 'Test rows') }))));
    const body = h('tbody');
    for (const m of METRICS) {
      const chosen = m === S.metric;
      body.append(h('tr', { class: chosen ? 'cap-chosen' : null },
        h('th', { scope: 'row', text: metricName(m) + (chosen ? tr(' (your metric)', ' (metrik pilihanmu)') : '') }),
        h('td', { text: score(trainEv, m) }), h('td', { text: score(testEv, m) })));
    }
    t.append(body);
    return h('div', { class: 'table-scroll' }, t);
  }

  function confusionTable(ev) {
    const n = names(), c = ev.confusion;
    const cell = (value, label, cls) => h('td', { class: cls }, h('b', { text: fmt(value) }), h('small', { text: label }));
    return h('div', { class: 'table-scroll' }, h('table', { class: 'cap-table cap-cm' },
      h('caption', { text: tr(`Confusion matrix on the ${fmt(ev.n)} test rows`, `Confusion matrix pada ${fmt(ev.n)} test rows`) }),
      h('thead', {}, h('tr', {}, h('td'), h('th', { scope: 'col', text: tr(`Predicted: ${n.pos}`, `Prediksi: ${n.pos}`) }), h('th', { scope: 'col', text: tr(`Predicted: ${n.neg}`, `Prediksi: ${n.neg}`) }))),
      h('tbody', {},
        h('tr', {}, h('th', { scope: 'row', text: tr(`Actual: ${n.pos}`, `Sebenarnya: ${n.pos}`) }), cell(c.tp, tr('true positive', 'true positive'), 'ok'), cell(c.fn, tr('false negative (missed)', 'false negative (terlewat)'), 'bad')),
        h('tr', {}, h('th', { scope: 'row', text: tr(`Actual: ${n.neg}`, `Sebenarnya: ${n.neg}`) }), cell(c.fp, tr('false positive (false alarm)', 'false positive (alarm palsu)'), 'bad'), cell(c.tn, tr('true negative', 'true negative'), 'ok')))));
  }

  const radioRow = (name, value, checked, ...kids) => {
    const input = h('input', { type: 'radio', name, value });
    input.checked = checked;
    return { input, label: h('label', {}, input, ...kids) };
  };

  // ---- step 1: frame -------------------------------------------------------------------------------------------

  function step1() {
    const body = h('div');
    const taskName = nextId('cap-task'), metricNameId = nextId('cap-metric');
    const taskSet = h('fieldset', { class: 'cap-set' }, h('legend', { text: tr('1. Choose a task', '1. Pilih tugas') }));
    const taskInputs = taskKeys().map(k => {
      const input = h('input', { type: 'radio', name: taskName, value: k });
      input.addEventListener('change', () => { S.task = k; update(); announce(tr(`Task chosen: ${TASKS[k].label()}.`, `Tugas dipilih: ${TASKS[k].label()}.`)); });
      taskSet.append(h('label', { class: 'cap-choice' }, input, h('div', {}, h('b', { text: TASKS[k].label() }), h('span', { text: TASKS[k].question() }))));
      return input;
    });
    const frameOut = h('div', { class: 'cap-out' });
    const metricSet = h('fieldset', { class: 'cap-set' }, h('legend', { text: tr('2. Choose the metric you will judge by', '2. Pilih metrik untuk menilai') }));
    const metricInputs = METRICS.map(m => {
      const input = h('input', { type: 'radio', name: metricNameId, value: m });
      input.addEventListener('change', () => { S.metric = m; update(); announce(tr(`Metric chosen: ${metricName(m)}.`, `Metrik dipilih: ${metricName(m)}.`)); });
      metricSet.append(h('label', { class: 'cap-choice' }, input, h('div', {}, h('b', { text: metricName(m) }), h('span', { text: metricReason(m) }))));
      return input;
    });
    const warn = h('p', { class: 'cap-note', hidden: true });
    body.append(
      h('p', { text: tr('Pick the question you want to answer from the penguin measurements. Penguins with a missing value (NA) are left out, never filled in, and this step tells you how many.', 'Pilih pertanyaan yang ingin dijawab dari pengukuran penguin. Penguin dengan missing value (NA) dibuang, bukan diisi, dan langkah ini menyebutkan berapa banyak.') }),
      taskSet, frameOut, metricSet, warn);
    return {
      body,
      render() {
        taskInputs.forEach(i => { i.checked = i.value === S.task; });
        metricInputs.forEach(i => { i.checked = i.value === S.metric; });
        metricSet.disabled = !S.task;
        frameOut.replaceChildren();
        warn.hidden = true;
        if (!S.task || !C.prep) return;
        const task = TASKS[S.task], p = C.prep, b = balance(), total = b.pos + b.neg, mean = mistakeMeaning(S.task);
        frameOut.append(
          h('p', { text: tr(`The positive class is "${b.posName}": the question asks about it, and recall and F1 count it.`, `Kelas positifnya adalah "${b.posName}": pertanyaan itu menanyakannya, dan recall serta F1 menghitungnya.`) }),
          h('p', { class: 'cap-note', text: tr(
            `${fmt(p.rowsKept)} of ${fmt(rows.length)} penguins are used. ${fmt(p.rowsDropped)} ${p.rowsDropped === 1 ? 'is' : 'are'} left out because a measurement or the label is missing (NA)${p.rowsExcluded ? `, and ${fmt(p.rowsExcluded)} ${p.rowsExcluded === 1 ? 'is' : 'are'} not part of this task (${task.exclude.join(', ')})` : ''}.`,
            `${fmt(p.rowsKept)} dari ${fmt(rows.length)} penguin dipakai. ${fmt(p.rowsDropped)} dibuang karena ada pengukuran atau label yang hilang (NA)${p.rowsExcluded ? `, dan ${fmt(p.rowsExcluded)} bukan bagian dari tugas ini (${task.exclude.join(', ')})` : ''}.`) }),
          h('h4', { text: tr('Class balance', 'Keseimbangan kelas') }),
          h('div', { class: 'cap-balance', role: 'img', 'aria-label': tr(`${b.posName}: ${fmt(b.pos)} of ${fmt(total)} (${pct(b.pos / total, 0)}). ${b.negName}: ${fmt(b.neg)} (${pct(b.neg / total, 0)}).`, `${b.posName}: ${fmt(b.pos)} dari ${fmt(total)} (${pct(b.pos / total, 0)}). ${b.negName}: ${fmt(b.neg)} (${pct(b.neg / total, 0)}).`) },
            h('span', { style: `width:${(b.pos / total * 100).toFixed(2)}%;background:var(--k1-ink)`, text: b.pos / total > 0.18 ? pct(b.pos / total, 0) : '' }),
            h('span', { style: `width:${(b.neg / total * 100).toFixed(2)}%;background:var(--k0-ink)`, text: pct(b.neg / total, 0) })),
          h('p', { class: 'hint', text: `${b.posName}: ${fmt(b.pos)} (${pct(b.pos / total, 0)}) · ${b.negName}: ${fmt(b.neg)} (${pct(b.neg / total, 0)})` }),
          h('h4', { text: tr('What a mistake means', 'Arti sebuah kesalahan') }),
          h('ul', {}, h('li', { text: mean.fp }), h('li', { text: mean.fn }), h('li', { text: mean.cost })));
        const w = S.metric ? metricWarning(S.metric, b) : null;
        warn.hidden = !w;
        warn.textContent = w ?? '';
      },
      summary: () => (S.task ? `${TASKS[S.task].label()}${S.metric ? ` · ${metricName(S.metric, true)}` : ''}` : ''),
    };
  }

  // ---- step 2: baseline ------------------------------------------------------------------------------------------

  function step2() {
    const body = h('div');
    const out = h('div', { class: 'cap-out' });
    const readout = h('span', { class: 'cap-readout' });
    const run = h('button', { type: 'button', class: 'btn primary', text: tr('Run baseline', 'Jalankan baseline') });
    const split = h('button', { type: 'button', class: 'btn', text: tr('New split', 'Split baru') });
    run.addEventListener('click', () => {
      S.baselineRun = true; update();
      announce(tr(`Baseline: ${metricName(S.metric, true)} ${score(C.base.test, S.metric)} on the test rows.`, `Baseline: ${metricName(S.metric, true)} ${score(C.base.test, S.metric)} pada test rows.`));
    });
    split.addEventListener('click', () => {
      S.seed = S.seed % 999 + 1; update();
      announce(tr(`New split ${fmt(S.seed)}: ${fmt(C.sp.train.length)} training rows and ${fmt(C.sp.test.length)} test rows.`, `Split baru ${fmt(S.seed)}: ${fmt(C.sp.train.length)} training rows dan ${fmt(C.sp.test.length)} test rows.`));
    });
    body.append(
      h('p', { text: tr('The baseline always answers with the most common class of the training rows and uses no measurements at all. Any real model has to beat it, or it is not worth using.', 'Baseline selalu menjawab dengan kelas yang paling banyak pada training rows dan sama sekali tidak memakai pengukuran. Model yang sungguhan harus mengalahkannya, kalau tidak, model itu tidak layak dipakai.') }),
      h('p', { text: tr('The rows are split once, into about 75% to learn from (training rows) and 25% to test on (test rows). Each class keeps about the same share on both sides, so the test rows look like the training rows.', 'Baris dibagi satu kali, sekitar 75% untuk belajar (training rows) dan 25% untuk menguji (test rows). Tiap kelas tetap punya porsi yang kurang lebih sama di kedua sisi, sehingga test rows mirip dengan training rows.') }),
      h('div', { class: 'cap-actions' }, run, split, readout), out);
    return {
      body,
      render() {
        out.replaceChildren();
        readout.textContent = tr(`Split ${fmt(S.seed)}`, `Split ${fmt(S.seed)}`);
        if (!C.base) return;
        const n = names(), sp = C.sp, pos = ys => ys.filter(v => v === 1).length;
        out.append(h('p', { class: 'cap-note', text: tr(
          `Split ${fmt(S.seed)}: ${fmt(sp.train.length)} training rows (${fmt(pos(sp.ytr))} ${n.pos}) and ${fmt(sp.test.length)} test rows (${fmt(pos(sp.yte))} ${n.pos}).`,
          `Split ${fmt(S.seed)}: ${fmt(sp.train.length)} training rows (${fmt(pos(sp.ytr))} ${n.pos}) dan ${fmt(sp.test.length)} test rows (${fmt(pos(sp.yte))} ${n.pos}).`) }));
        if (!S.baselineRun) { out.append(h('p', { class: 'hint', text: tr('Press "Run baseline" to score it.', 'Tekan "Jalankan baseline" untuk menilainya.') })); return; }
        const answer = C.base.model.predict(C.base.Xtr[0]) === 1 ? n.pos : n.neg;
        out.append(
          h('p', { text: tr(`The baseline always answers "${answer}", the most common class in the training rows.`, `Baseline selalu menjawab "${answer}", kelas yang paling banyak pada training rows.`) }),
          scoreTable(tr('Baseline scores', 'Skor baseline'), C.base.train, C.base.test),
          confusionTable(C.base.test),
          h('p', { class: 'cap-verdict', text: tr(`On your metric (${metricName(S.metric, true)}) the baseline scores ${score(C.base.test, S.metric)} on the test rows. That is the score to beat.`, `Pada metrikmu (${metricName(S.metric, true)}) baseline mendapat ${score(C.base.test, S.metric)} pada test rows. Itulah skor yang harus dikalahkan.`) }));
      },
      summary: () => (S.baselineRun && C.base ? tr(`${metricName(S.metric, true)} ${score(C.base.test, S.metric)} on the test rows`, `${metricName(S.metric, true)} ${score(C.base.test, S.metric)} pada test rows`) : ''),
    };
  }

  // ---- steps 3 and 4: a model --------------------------------------------------------------------------------

  // One model section (settings, Evaluate button, results). `which` is 'a' or 'b'; both read and write S[which].
  function modelSection(which) {
    const cfg = () => S[which];
    const label = () => (which === 'a' ? nameA() : nameB());
    const wrap = h('div', { class: 'cap-model' });
    const kindPanel = panel(wrap, [
      { name: 'kind', type: 'select', label: tr('Model', 'Model'), options: KINDS.map(k => [k, modelLabel(k)]), value: cfg().kind },
      { name: 'k', type: 'range', label: tr('Neighbors (k)', 'Tetangga (k)'), min: 1, max: 25, step: 1, value: cfg().k },
      { name: 'scale', type: 'toggle', label: tr('Scale the features (recommended)', 'Scale fitur (disarankan)'), value: cfg().scale },
      { name: 'maxDepth', type: 'range', label: tr('Maximum depth', 'Kedalaman maksimum'), min: 1, max: 8, step: 1, value: cfg().maxDepth },
      { name: 'minLeaf', type: 'range', label: tr('Minimum rows in a leaf', 'Minimum baris per daun'), min: 1, max: 20, step: 1, value: cfg().minLeaf },
    ], (name, v) => {
      const c = cfg();
      if (name === 'kind') c.kind = v.kind;
      if (name === 'k') c.k = v.k;
      if (name === 'scale') c.scale = v.scale;
      if (name === 'maxDepth') c.maxDepth = v.maxDepth;
      if (name === 'minLeaf') c.minLeaf = v.minLeaf;
      update();
    });
    const logisticNote = h('p', { class: 'hint', text: tr('Logistic regression standardizes the features itself and has no setting here.', 'Regresi logistik men-standardisasi fitur sendiri dan tidak punya pengaturan di sini.') });
    const featSet = h('fieldset', { class: 'cap-set' }, h('legend', { text: tr('Features the model may use', 'Fitur yang boleh dipakai model') }));
    const featPanel = panel(featSet, FEATURES.map(f => ({ name: f, type: 'toggle', label: featureLabel(f), value: cfg().features.includes(f) })), (name, v) => {
      const chosen = FEATURES.filter(f => v[f]);
      if (!chosen.length) { featPanel.set(name, true); announce(tr('A model needs at least one feature.', 'Model perlu setidaknya satu fitur.')); return; }
      cfg().features = chosen;
      update();
    });
    const evalBtn = h('button', { type: 'button', class: 'btn primary', text: which === 'a' ? tr('Evaluate model A', 'Evaluasi model A') : tr('Evaluate model B', 'Evaluasi model B') });
    const hint = h('span', { class: 'cap-readout', text: tr('After the first evaluation the scores follow every change you make.', 'Setelah evaluasi pertama, skor mengikuti setiap perubahan yang kamu buat.') });
    const out = h('div', { class: 'cap-out' });
    const bits = {
      settings: h('div', { class: 'cap-grid' }, h('div', {}, kindPanel.el, logisticNote), featSet),
      actions: h('div', { class: 'cap-actions' }, evalBtn, hint),
      out,
    };
    wrap.append(bits.settings, bits.actions, out);
    evalBtn.addEventListener('click', () => {
      cfg().run = true; update();
      const r = C[which];
      if (r) announce(tr(`${label()} evaluated: ${metricName(S.metric, true)} ${score(r.train, S.metric)} on the training rows, ${score(r.test, S.metric)} on the test rows.`, `${label()} dievaluasi: ${metricName(S.metric, true)} ${score(r.train, S.metric)} pada training rows, ${score(r.test, S.metric)} pada test rows.`));
    });
    return {
      el: wrap,
      sync() {   // shows only the settings of the chosen model, and the results
        const k = cfg().kind;
        kindPanel.show('k', k === 'knn'); kindPanel.show('scale', k === 'knn');
        kindPanel.show('maxDepth', k === 'tree'); kindPanel.show('minLeaf', k === 'tree');
        logisticNote.hidden = k !== 'logistic';
      },
      renderOut(extraNote, { sentences = true } = {}) {
        out.replaceChildren();
        const r = C[which];
        if (!r) { out.append(h('p', { class: 'hint', text: tr('Press the Evaluate button to fit the model on the training rows and score it on the training rows and the test rows.', 'Tekan tombol Evaluasi untuk melatih model pada training rows lalu menilainya pada training rows dan test rows.') })); return; }
        out.append(
          h('p', { class: 'cap-note', text: `${label()}: ${describeModel(cfg())}. ${tr('Features', 'Fitur')}: ${featureList(cfg().features)}.` }),
          h('div', { class: 'cap-grid' }, scoreTable(tr(`${label()} scores`, `Skor ${label()}`), r.train, r.test), confusionTable(r.test)));
        if (sentences) out.append(
          h('p', { text: baselineSentence(label(), S.metric, metricValue(r.test, S.metric), metricValue(C.base.test, S.metric)) }),
          h('p', { text: gapSentence(label(), S.metric, metricValue(r.train, S.metric), metricValue(r.test, S.metric)) }));
        if (extraNote) out.append(extraNote);
      },
    };
  }

  function step3() {
    const body = h('div');
    const model = modelSection('a');
    body.append(
      h('p', { text: tr('Pick a model and the features it may use, then evaluate it. The training score is on the rows the model learned from; the test score is on rows it has never seen, and that is the one to trust.', 'Pilih model dan fitur yang boleh dipakainya, lalu evaluasi. Skor training dihitung pada baris yang dipelajari model; skor test pada baris yang belum pernah dilihatnya, dan skor itulah yang bisa dipercaya.') }),
      model.el);
    return {
      body,
      render() { model.sync(); model.renderOut(); },
      summary: () => (C.a ? `${modelLabel(S.a.kind)} · ${metricName(S.metric, true)} ${score(C.a.test, S.metric)}` : ''),
    };
  }

  function step4() {
    const body = h('div');
    const model = modelSection('b');
    const openQuiz = h('button', { type: 'button', class: 'btn', text: tr('Open the Quick Quiz', 'Buka Kuis Cepat') });
    openQuiz.addEventListener('click', () => root.querySelector('.qq-fab')?.click());
    const compare = h('div', { class: 'cap-out' });
    chart = { canvas: null };
    body.append(
      h('p', { text: tr('Now a second model, so the comparison means something: change the model, a setting or the features so that it differs from model A. Then compare both with the baseline.', 'Sekarang model kedua, supaya perbandingannya bermakna: ubah model, pengaturan, atau fiturnya sehingga berbeda dari model A. Lalu bandingkan keduanya dengan baseline.') }),
      h('p', { class: 'cap-note', text: tr('Predict first: open the Quick Quiz (the round button) and answer "Will model B beat the baseline on the test rows?" before you press Evaluate.', 'Prediksi dulu: buka Kuis Cepat (tombol bulat) dan jawab "Akankah model B mengalahkan baseline pada test rows?" sebelum menekan Evaluasi.') }),
      h('div', { class: 'cap-actions' }, openQuiz),
      model.el, compare);
    return {
      body,
      render() {
        model.sync();
        const a = C.a, b = C.b;
        // With both models scored (and different) the comparison list below carries the baseline and gap sentences, so the B block leaves them out.
        const listed = Boolean(a && b && !sameModel(S.a, S.b));
        model.renderOut(null, { sentences: !listed });
        compare.replaceChildren(); chart = { canvas: null };
        if (!b) return;
        if (!a) { compare.append(h('p', { class: 'cap-warn', text: tr('Evaluate model A in step 3 to compare.', 'Evaluasi model A di langkah 3 untuk membandingkan.') })); return; }
        const same = sameModel(S.a, S.b);
        if (same) compare.append(h('p', { class: 'cap-warn', text: tr('Model B is the same as model A. Change the model, a setting or the features so that the comparison means something.', 'Model B sama dengan model A. Ubah model, pengaturan, atau fiturnya agar perbandingannya bermakna.') }));
        compare.append(h('h4', { text: tr('Comparison on the same split', 'Perbandingan pada split yang sama') }), comparisonTable());
        const canvas = h('canvas', { role: 'img' });
        const chartTitle = h('h4', { text: tr(`${metricName(S.metric)}: training and test scores`, `${metricName(S.metric)}: skor training dan test`) });
        const keyId = nextId('cap-key');
        canvas.setAttribute('aria-describedby', keyId);
        compare.append(chartTitle, h('div', { class: 'cap-chart' }, canvas),
          h('div', { class: 'cap-key', id: keyId }, h('span', {}, h('i', { style: 'background:transparent' }), tr('Outlined bar: training rows', 'Batang berkerangka: training rows')), h('span', {}, h('i', { style: 'background:var(--muted)' }), tr('Solid bar: test rows', 'Batang penuh: test rows'))));
        chart = { canvas };
        if (!same) {
          compare.append(h('ul', {}, comparisonSentences().map(s => h('li', { class: s.kind === 'better' ? 'cap-verdict' : null, text: s.text }))));
        }
        drawChart();
      },
      summary: () => (C.b ? `${modelLabel(S.b.kind)} · ${C.better ? tr(`better: ${C.better === 'a' ? nameA() : nameB()}`, `lebih baik: ${C.better === 'a' ? nameA() : nameB()}`) : tr('same as model A', 'sama dengan model A')}` : ''),
    };
  }

  function comparisonTable() {
    const metricCols = METRICS.flatMap(m => [[m, 'train'], [m, 'test']]);
    const head = h('tr', {}, h('th', { scope: 'col', text: tr('Model', 'Model') }));
    for (const [m, part] of metricCols) head.append(h('th', { scope: 'col', class: m === S.metric ? 'cap-chosen' : null, text: tr(`${part === 'train' ? 'Training' : 'Test'} ${metricName(m, true)}`, `${metricName(m, true)} ${part === 'train' ? 'training' : 'test'}`) }));
    const body = h('tbody');
    const lines = [[tr('Baseline', 'Baseline'), C.base], [`${nameA()} (${modelLabel(S.a.kind)})`, C.a], [`${nameB()} (${modelLabel(S.b.kind)})`, C.b]];
    for (const [name, r] of lines) {
      if (!r) continue;
      const tr_ = h('tr', {}, h('th', { scope: 'row', text: name }));
      for (const [m, part] of metricCols) {
        tr_.append(h('td', { class: m === S.metric ? 'cap-chosen' : null, 'data-label': tr(`${part === 'train' ? 'Training' : 'Test'} ${metricName(m, true)}`, `${metricName(m, true)} ${part === 'train' ? 'training' : 'test'}`), text: score(r[part], m) }));
      }
      body.append(tr_);
    }
    return h('div', { class: 'table-scroll' }, h('table', { class: 'cap-table cap-stack' },
      h('caption', { text: tr(`Scores on the same split (your metric, ${metricName(S.metric, true)}, is highlighted)`, `Skor pada split yang sama (metrikmu, ${metricName(S.metric, true)}, disorot)`) }),
      h('thead', {}, head), body));
  }

  function comparisonSentences() {
    const m = S.metric, base = metricValue(C.base.test, m), out = [];
    const a = C.a, b = C.b;
    out.push({ kind: 'a', text: baselineSentence(nameA(), m, metricValue(a.test, m), base) });
    out.push({ kind: 'b', text: baselineSentence(nameB(), m, metricValue(b.test, m), base) });
    out.push({ kind: 'a', text: gapSentence(nameA(), m, metricValue(a.train, m), metricValue(a.test, m)) });
    out.push({ kind: 'b', text: gapSentence(nameB(), m, metricValue(b.train, m), metricValue(b.test, m)) });
    if (C.better) out.push({ kind: 'better', text: betterSentence(nameA(), nameB(), m, metricValue(a.test, m), metricValue(b.test, m), C.better, a.test.n) });
    return out;
  }

  function drawChart() {
    const canvas = chart.canvas;
    if (!canvas || !C?.base) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const ctx = canvas.getContext('2d'), t = theme();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const items = [[tr('Baseline', 'Baseline'), C.base, clusterColor(-1)], [nameA(), C.a, clusterColor(0)], [nameB(), C.b, clusterColor(1)]].filter(i => i[1]);
    const small = ((rect.width - 50) / items.length) * 0.34 < 36;   // narrow bars: the training label sits above the test label so the two never touch
    const m = { l: 42, r: 8, t: small ? 32 : 18, b: 28 }, W = rect.width - m.l - m.r, H = rect.height - m.t - m.b;
    const Y = v => m.t + H - v * H;
    ctx.fillStyle = t.plot; ctx.fillRect(m.l, m.t, W, H);
    ctx.font = '11px system-ui, sans-serif'; ctx.strokeStyle = t.grid; ctx.fillStyle = t.muted; ctx.lineWidth = 1; ctx.textAlign = 'right';
    ctx.beginPath();
    for (const v of [0, 0.25, 0.5, 0.75, 1]) { ctx.moveTo(m.l, Y(v)); ctx.lineTo(m.l + W, Y(v)); ctx.fillText(pct(v, 0), m.l - 6, Y(v) + 4); }
    ctx.stroke();
    const group = W / items.length, bw = Math.min(46, group * 0.34);
    const parts = [];
    items.forEach(([name, r, color], i) => {
      const cx = m.l + group * (i + 0.5);
      [['train', cx - bw - 2], ['test', cx + 2]].forEach(([part, x]) => {
        const v = metricUndefined(r[part], S.metric) ? 0 : metricValue(r[part], S.metric);
        const top = Y(v), height = Math.max(2, Y(0) - top);
        if (part === 'train') { ctx.globalAlpha = 0.25; ctx.fillStyle = color; ctx.fillRect(x, Y(0) - height, bw, height); ctx.globalAlpha = 1; ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.strokeRect(x + 1, Y(0) - height + 1, bw - 2, height - 2); } else { ctx.fillStyle = color; ctx.fillRect(x, Y(0) - height, bw, height); }
        ctx.fillStyle = t.ink; ctx.font = `600 ${small ? 10 : 11}px system-ui, sans-serif`; ctx.textAlign = 'center';
        ctx.fillText(metricUndefined(r[part], S.metric) ? '–' : pct(v), x + bw / 2, Y(0) - height - 5 - (small && part === 'train' ? 13 : 0));
      });
      ctx.fillStyle = t.ink; ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(name, cx, rect.height - 8);
      parts.push(tr(`${name}: ${score(r.train, S.metric)} training, ${score(r.test, S.metric)} test`, `${name}: ${score(r.train, S.metric)} training, ${score(r.test, S.metric)} test`));
    });
    canvas.setAttribute('aria-label', `${tr(`Bar chart of ${metricName(S.metric, true)}`, `Diagram batang ${metricName(S.metric, true)}`)}. ${parts.join('; ')}.`);
  }

  // ---- step 5: inspect errors ------------------------------------------------------------------------------------

  function step5() {
    const body = h('div');
    const intro = h('div');
    const counter = h('p', { class: 'cap-verdict' });
    const tableHost = h('div', { class: 'table-scroll' });
    let shown = '';          // signature of the list the table was built for
    let rowEls = new Map();  // id -> { pick, detail, reason, note }
    body.append(
      h('p', { text: tr('Look at where the better model went wrong on the test rows, the most confident mistakes first. Mark three, and for each pick the likeliest reason and write one line about what the measurements tell you.', 'Lihat di mana model yang lebih baik salah pada test rows, dimulai dari kesalahan yang paling yakin. Tandai tiga, dan untuk masing-masing pilih alasan yang paling mungkin lalu tulis satu baris tentang apa yang ditunjukkan pengukurannya.') }),
      intro, counter, tableHost);

    function build() {
      const better = C.better === 'a' ? S.a : S.b, n = names();
      rowEls = new Map();
      const used = better.features;
      const head = h('tr', {}, h('th', { scope: 'col', text: tr('Mark', 'Tandai') }), h('th', { scope: 'col', text: tr('Row', 'Baris') }),
        FEATURES.map(f => h('th', { scope: 'col', text: featureLabel(f) + (used.includes(f) ? ' •' : '') })),
        h('th', { scope: 'col', text: tr('True', 'Sebenarnya') }), h('th', { scope: 'col', text: tr('Predicted', 'Prediksi') }), h('th', { scope: 'col', text: tr('Confidence', 'Confidence') }));
      const table = h('table', { class: 'cap-table cap-stack' }, h('caption', { text: tr('Test rows to inspect (• marks the features the model used)', 'Test rows untuk diperiksa (• menandai fitur yang dipakai model)') }), h('thead', {}, head));
      for (const e of C.list) {
        const pick = h('input', { type: 'checkbox', class: 'cap-pick', 'aria-label': tr(`Mark row ${fmt(e.id + 1)}`, `Tandai baris ${fmt(e.id + 1)}`) });
        const truth = e.actual === 1 ? n.pos : n.neg, guess = e.predicted === 1 ? n.pos : n.neg;
        const tr1 = h('tr', {},
          h('td', { 'data-label': tr('Mark', 'Tandai') }, pick),
          h('td', { 'data-label': tr('Row', 'Baris'), text: `#${fmt(e.id + 1)}${e.kind === 'close' ? tr(' (close call)', ' (nyaris salah)') : ''}` }),
          FEATURES.map((f, i) => h('td', { 'data-label': featureLabel(f), style: used.includes(f) ? 'font-weight:700' : null, text: fmt(e.row[f], { max: 1 }) })),
          h('td', { 'data-label': tr('True', 'Sebenarnya'), text: truth }),
          h('td', { 'data-label': tr('Predicted', 'Prediksi'), text: e.kind === 'close' ? tr(`${guess} (correct)`, `${guess} (benar)`) : guess }),
          h('td', { 'data-label': tr('Confidence', 'Confidence'), text: pct(e.confidence, 0) }));
        const reasonId = nextId('cap-reason'), noteId = nextId('cap-note');
        const reason = h('select', { id: reasonId }, h('option', { value: '', text: tr('Choose a reason', 'Pilih alasan') }), REASONS.map(r => h('option', { value: r, text: reasonLabel(r) })));
        const note = h('input', { id: noteId, type: 'text', maxlength: String(MAX_NOTE), placeholder: tr('What do the numbers say?', 'Apa kata angkanya?') });
        const detail = h('tr', { class: 'cap-detail', hidden: true }, h('td', { colspan: String(FEATURES.length + 5) },
          h('div', { class: 'cap-fields' },
            h('label', { for: reasonId }, tr(`Reason for row ${fmt(e.id + 1)}`, `Alasan untuk baris ${fmt(e.id + 1)}`), reason),
            h('label', { for: noteId }, tr(`Note for row ${fmt(e.id + 1)}`, `Catatan untuk baris ${fmt(e.id + 1)}`), note))));
        pick.addEventListener('change', () => {
          if (pick.checked) { if (S.order.length >= MARKS_NEEDED) { pick.checked = false; return; } S.order.push(e.id); S.marks[e.id] = { reason: '', note: '' }; }
          else { S.order = S.order.filter(id => id !== e.id); delete S.marks[e.id]; }
          syncMarks(); touch();
          if (pick.checked) reason.focus();
        });
        reason.addEventListener('change', () => { if (S.marks[e.id]) { S.marks[e.id].reason = reason.value; touch(); } });
        note.addEventListener('input', () => { if (S.marks[e.id]) { S.marks[e.id].note = note.value; touch(); } });
        table.append(h('tbody', {}, tr1, detail));
        rowEls.set(e.id, { pick, detail, reason, note });
      }
      tableHost.replaceChildren(table);
    }

    function syncMarks() {
      const full = S.order.length >= MARKS_NEEDED;
      for (const [id, el] of rowEls) {
        const m = S.marks[id];
        el.pick.checked = Boolean(m);
        el.pick.disabled = full && !m;
        el.detail.hidden = !m;
        if (m) { if (el.reason.value !== m.reason) el.reason.value = m.reason; if (el.note.value !== m.note) el.note.value = m.note; }
      }
      const valid = C.ids.length ? S.order.filter(id => S.marks[id]?.reason && S.marks[id]?.note.trim()).length : 0;
      counter.textContent = tr(`Marked ${fmt(S.order.length)} of ${fmt(Math.min(MARKS_NEEDED, C.list.length))}; ${fmt(valid)} with a reason and a note.`, `Ditandai ${fmt(S.order.length)} dari ${fmt(Math.min(MARKS_NEEDED, C.list.length))}; ${fmt(valid)} dengan alasan dan catatan.`);
    }

    return {
      body,
      counter: () => { if (C.better) syncMarks(); },
      render() {
        if (!C.better) { intro.replaceChildren(h('p', { class: 'cap-warn', text: tr('Finish step 4 first: this list belongs to the better of your two models.', 'Selesaikan langkah 4 dulu: daftar ini milik model yang lebih baik dari kedua modelmu.') })); tableHost.replaceChildren(); counter.textContent = ''; shown = ''; return; }
        const w = C[C.better], cfg = C.better === 'a' ? S.a : S.b, errors = C.list.filter(e => e.kind === 'error').length;
        intro.replaceChildren(h('p', { class: 'cap-note', text: tr(
          `Better model: ${C.better === 'a' ? nameA() : nameB()}: ${describeModel(cfg, true)}. It made ${fmt(errors)} ${errors === 1 ? 'mistake' : 'mistakes'} on the ${fmt(w.test.n)} test rows.${errors < MARKS_NEEDED ? ' That is fewer than three, so the list also shows the correct rows that sit closest to the other class ("close calls"), to give you three to study. To see real mistakes, press New split in step 2 or pick a simpler model.' : ''}`,
          `Model yang lebih baik: ${C.better === 'a' ? nameA() : nameB()}: ${describeModel(cfg, true)}. Model ini membuat ${fmt(errors)} kesalahan pada ${fmt(w.test.n)} test rows.${errors < MARKS_NEEDED ? ' Itu kurang dari tiga, jadi daftar ini juga memuat baris benar yang paling dekat ke kelas lain ("nyaris salah"), supaya ada tiga yang bisa dipelajari. Untuk melihat kesalahan yang sebenarnya, tekan Split baru di langkah 2 atau pilih model yang lebih sederhana.' : ''}`) }));
        const sig = `${C.better}|${S.task}|${S.seed}|${JSON.stringify([cfg.kind, modelParams(cfg), cfg.features])}|${C.ids.join(',')}`;
        if (sig !== shown) { shown = sig; build(); }
        syncMarks();
      },
      summary: () => (C.better ? tr(`${fmt(S.order.filter(id => S.marks[id]?.reason && S.marks[id]?.note.trim()).length)} of ${fmt(Math.min(MARKS_NEEDED, C.list.length))} marked`, `${fmt(S.order.filter(id => S.marks[id]?.reason && S.marks[id]?.note.trim()).length)} dari ${fmt(Math.min(MARKS_NEEDED, C.list.length))} ditandai`) : ''),
    };
  }

  // ---- step 6: explain and rate ------------------------------------------------------------------------------------

  function step6() {
    const body = h('div');
    const textBox = h('div', { class: 'cap-text' });
    const fields = {
      problem: [tr('The problem', 'Masalahnya'), tr('What are you predicting from what, and why does it matter?', 'Apa yang kamu prediksi dari apa, dan mengapa itu penting?')],
      why: [tr('Why I picked this model', 'Mengapa memilih model ini'), tr('Which model did you pick, and what in the scores or the errors made you pick it?', 'Model mana yang kamu pilih, dan apa dari skor atau kesalahannya yang membuatmu memilihnya?')],
      next: [tr('What I would try next', 'Yang akan kucoba berikutnya'), tr('One or two ideas, and what result would tell you they worked.', 'Satu atau dua ide, dan hasil apa yang menunjukkan ide itu berhasil.')],
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
      h('p', { text: tr('Write a few lines about your project in your own words, then rate your own work against the four criteria. Pick the level that is honestly true today.', 'Tulis beberapa baris tentang proyekmu dengan kata-katamu sendiri, lalu nilai pekerjaanmu terhadap empat kriteria. Pilih tingkat yang jujur benar hari ini.') }),
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
    const n = names(), task = S.task ? TASKS[S.task] : null;
    const result = (name, desc, r) => ({ name, desc, train: r.train, test: r.test });
    const results = [];
    if (C.base) results.push(result(modelLabel('baseline'), '', C.base));
    if (C.a) results.push(result(nameA(), describeModel(S.a), C.a));
    if (C.b) results.push(result(nameB(), describeModel(S.b), C.b));
    const sentences = [];
    if (C.base && C.a && S.metric) {
      const m = S.metric, base = metricValue(C.base.test, m);
      sentences.push(baselineSentence(nameA(), m, metricValue(C.a.test, m), base), gapSentence(nameA(), m, metricValue(C.a.train, m), metricValue(C.a.test, m)));
      if (C.b) sentences.push(baselineSentence(nameB(), m, metricValue(C.b.test, m), base), gapSentence(nameB(), m, metricValue(C.b.train, m), metricValue(C.b.test, m)));
      if (C.better) sentences.push(betterSentence(nameA(), nameB(), m, metricValue(C.a.test, m), metricValue(C.b.test, m), C.better, C.a.test.n));
    }
    const mistakes = S.order.map(id => {
      const e = C.list.find(x => x.id === id), m = S.marks[id];
      return e && m ? { id, truth: e.actual === 1 ? n.pos : n.neg, guess: e.predicted === 1 ? n.pos : n.neg, confidence: e.confidence, kind: e.kind, reason: m.reason, note: m.note } : null;
    }).filter(Boolean);
    return {
      taskLabel: task?.label() ?? '', question: task?.question() ?? '',
      rows: C.prep ? { total: rows.length, kept: C.prep.rowsKept, dropped: C.prep.rowsDropped, excluded: C.prep.rowsExcluded } : null,
      balance: C.prep ? balance() : null,
      metric: S.metric, metricWhy: S.metric ? metricReason(S.metric) : '',
      split: C.sp ? { seed: S.seed, train: C.sp.train.length, test: C.sp.test.length } : null,
      results, better: C.better, sentences, mistakes, text: S.text,
      rubric: CRITERIA.map(c => ({ criterion: c, level: S.rubric[c] })),
    };
  }

  // ---- the quick quiz (predict first) ------------------------------------------------------------------------------

  const quiz = predictBox(lab.ref('below'), {
    hint: tr('Evaluate model B in step 4 first, then check your answer.', 'Evaluasi model B di langkah 4 dulu, lalu periksa jawabanmu.'),
    name: 'predict-b',
    question: tr('Will model B beat the baseline on the test rows?', 'Akankah model B mengalahkan baseline pada test rows?'),
    choices: [
      ['beats', tr('Yes, it will beat the baseline', 'Ya, model B akan mengalahkan baseline')],
      ['ties', tr('No, it will score about the same (within one point)', 'Tidak, skornya akan hampir sama (selisih satu poin)')],
      ['worse', tr('No, it will score lower than the baseline', 'Tidak, skornya akan lebih rendah daripada baseline')],
    ],
  });
  let lastReveal = '';
  function revealQuiz() {
    if (!C?.b || !S.metric || !S.b.run) return;
    const m = S.metric, b = metricValue(C.b.test, m), base = metricValue(C.base.test, m);
    const verdict = compareToBaseline(b, base);
    const text = tr(`On ${metricName(m, true)}, model B scores ${pct(b)} against ${pct(base)} for the baseline.`, `Pada ${metricName(m, true)}, model B mendapat ${pct(b)} dibanding ${pct(base)} untuk baseline.`);
    lastReveal = `${quiz.chosen()}|${verdict}|${text}`;
    quiz.reveal(verdict, text);
  }
  quiz.onPick(revealQuiz);
  quiz.onCheck(revealQuiz);
  lab.cleanup(() => quiz.destroy());

  // ---- the stepper ------------------------------------------------------------------------------------------------

  const titles = () => [
    tr('Frame the problem', 'Rumuskan masalah'), tr('Baseline', 'Baseline'), tr('Model A', 'Model A'),
    tr('Model B and comparison', 'Model B dan perbandingan'), tr('Inspect errors', 'Periksa kesalahan'), tr('Explain and rate', 'Jelaskan dan nilai'),
  ];
  const shorts = () => [tr('Frame', 'Rumuskan'), tr('Baseline', 'Baseline'), tr('Model A', 'Model A'), tr('Model B', 'Model B'), tr('Errors', 'Kesalahan'), tr('Explain', 'Jelaskan')];
  const unlocked = i => done.slice(0, i).every(Boolean);
  const firstOpen = () => { const i = done.findIndex(d => !d); return i < 0 ? STEP_COUNT - 1 : i; };

  // Draws the eye to the Quick Quiz badge when step 4 opens and the predict-first question is still unanswered (the kit's own pulse; reduced motion turns it off in CSS).
  function pulseQuiz() {
    const badge = root.querySelector('.qq-badge');
    if (!badge || badge.hidden) return;
    badge.classList.remove('pulse'); void badge.offsetWidth; badge.classList.add('pulse');
  }

  function goTo(i, { focus = true, scroll = true } = {}) {
    if (!unlocked(i)) return;
    openSet.add(i); S.open = i; save();
    renderChrome();
    if (i === 3) pulseQuiz();
    if (chart.canvas) requestAnimationFrame(drawChart);
    if (focus || scroll) {
      const head = steps[i].head;
      if (scroll) head.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      if (focus) head.focus({ preventScroll: true });
    }
  }

  function build() {
    gate.replaceChildren();
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
        if (chart.canvas) requestAnimationFrame(drawChart);
      });
      const more = i < STEP_COUNT - 1
        ? h('div', { class: 'cap-actions' }, (() => {
          const b = h('button', { type: 'button', class: 'btn', text: tr(`Continue to step ${fmt(i + 2)}: ${nextTitle(i)}`, `Lanjut ke langkah ${fmt(i + 2)}: ${nextTitle(i)}`) });
          b.addEventListener('click', () => { openSet.delete(i); goTo(i + 1); });
          return b;
        })())
        : null;
      const body = h('div', { class: 'cap-body', id: bodyId, role: 'region', 'aria-labelledby': undefined, hidden: true }, st.body, more);
      const li = h('li', { class: 'cap-step' }, h('h3', {}, head), body);
      list.append(li);
      steps[i] = { ...steps[i], st, num, name: title.firstChild, sum: title.lastChild, state, head, body, li, nextBtn: more?.querySelector('button'), chip };
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
    if (!rows) return;
    C = compute();
    if (C.better) {
      const r = pruneMarks(S, C.ids);
      if (r.removed) {
        S = r.state;
        announce(tr(`${fmt(r.removed)} marked ${r.removed === 1 ? 'row was' : 'rows were'} removed because ${r.removed === 1 ? 'it is' : 'they are'} no longer in the list of the better model.`, `${fmt(r.removed)} baris yang ditandai dihapus karena tidak lagi ada di daftar model yang lebih baik.`));
      }
    }
    done = stepDone(S, { candidateIds: C.ids });
    steps.forEach(step => step.st.render());
    renderChrome();
    revealIfAnswered();
    save();
  }
  // Model B's numbers change as the learner tunes it: the answer box follows, but only when its text really changes.
  function revealIfAnswered() {
    if (quiz.chosen() == null || !C?.b || !S.metric || !S.b.run) return;
    const m = S.metric, b = metricValue(C.b.test, m), base = metricValue(C.base.test, m);
    const text = tr(`On ${metricName(m, true)}, model B scores ${pct(b)} against ${pct(base)} for the baseline.`, `Pada ${metricName(m, true)}, model B mendapat ${pct(b)} dibanding ${pct(base)} untuk baseline.`);
    if (lastReveal !== `${quiz.chosen()}|${compareToBaseline(b, base)}|${text}`) revealQuiz();
  }
  function touch() {
    done = stepDone(S, { candidateIds: C.ids });
    renderChrome();
    steps[4]?.st.counter?.();
    steps[5]?.st.renderSummary?.();
    save();
  }

  // ---- the "Your project" card -------------------------------------------------------------------------------------

  const recap = h('div', { class: 'cap-aside' });
  const controls = lab.panel([
    { type: 'note', text: tr('Penguins with a missing value (NA) are left out, never filled in. Your work is saved in this browser only.', 'Penguin dengan missing value (NA) dibuang, bukan diisi. Pekerjaanmu hanya tersimpan di browser ini.') },
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
      n(tr('Task', 'Tugas'), S.task ? TASKS[S.task].label() : ''),
      n(tr('Metric', 'Metrik'), S.metric ? metricName(S.metric) : ''),
      n(tr('Split', 'Split'), S.task ? tr(`Split ${fmt(S.seed)}`, `Split ${fmt(S.seed)}`) : ''),
      n(nameA(), S.a.run ? describeModel(S.a) : ''),
      n(nameB(), S.b.run ? describeModel(S.b) : ''),
      n(tr('Better model', 'Model yang lebih baik'), C?.better ? (C.better === 'a' ? nameA() : nameB()) : '')));
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
    if (rows) build();
    announce(tr('Everything was erased. You are back at step 1.', 'Semuanya sudah dihapus. Kamu kembali ke langkah 1.'));
  }
  lab.onReset(() => startOver());
  lab.cleanup(() => { clearTimeout(armTimer); clearTimeout(liveTimer); });

  // ---- loading the data ----------------------------------------------------------------------------------------------

  async function load() {
    const token = ++loadToken;
    gate.replaceChildren(h('p', { class: 'hint', text: tr('Loading the penguin data…', 'Memuat data penguin…') }));
    lab.setStatus(tr('Loading the penguin data…', 'Memuat data penguin…'));
    try {
      const table = await loadDataset('penguins');
      if (destroyed || token !== loadToken) return;
      rows = table.rows;
      build();
    } catch {
      if (destroyed || token !== loadToken) return;
      const retry = h('button', { type: 'button', class: 'btn primary', text: tr('Try again', 'Coba lagi') });
      retry.addEventListener('click', load);
      gate.replaceChildren(h('p', { class: 'cap-warn', text: tr('Could not load the penguin data. Check your connection and try again.', 'Data penguin tidak bisa dimuat. Periksa koneksimu lalu coba lagi.') }), retry);
      lab.setStatus(tr('The penguin data could not be loaded.', 'Data penguin tidak bisa dimuat.'));
    }
  }

  lab.onTheme(drawChart);
  const ro = new ResizeObserver(() => drawChart());
  ro.observe(cap);
  lab.cleanup(() => { destroyed = true; loadToken += 1; ro.disconnect(); });
  load();
  return lab.destroy;
}
