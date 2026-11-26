// Level 3 capstone workbench: one guided project on a SYNTHETIC batch-scoring system (entities, cases, outcomes that
// arrive late), in seven steps that open in order: frame the decision and its costs, choose and defend a split, compare
// a baseline, logistic regression and a forest, record a reproducible run, plan the monitoring and replay the stream,
// investigate the failure that happens after launch, and report with a self-assessment. Built on the lab kit; the steps
// live in a vertical stepper instead of a plot, like the Level 1 and Level 2 workbenches (labs/capstone.js,
// labs/capstone-l2.js). Everything the learner chooses or types is saved in localStorage (every access guarded);
// results are recomputed from the saved choices, and nothing translated is stored, so a language switch rebuilds the
// lab without losing work. Heavy computing (the split comparison, the searches, the scoring, the replay) runs after a
// button press, off the click, and its results are cached per scenario and setting. The pure logic is in
// ml/capstone3report.js (state, progress, sentences, summary) and ml/capstone3lab.js (computing) on top of
// ml/capstone3.js (the system, splits, models, reproducibility check, monitoring plan and investigation).
import { createLab, panel, predictBox, clusterColor, theme, tr, fmt, pct } from '../kit/index.js';
import { runExperiment, repro, checkReproducible, evaluatePlan, chooseSplit, DELAYED_ONLY_PLAN, FEATURES } from '../ml/capstone3.js';
import {
  SCENARIO_SEEDS, SPLIT_KEYS, MODEL_KEYS, TUNABLE, INNER_FOLDS, COST_RANGE, PLAN_LIMITS, HYPOTHESES, REMEDY_KINDS, CHANGE_KEYS,
  buildSystem, frameFacts, compareSplits, tuneCandidate, usedValue, evaluateCandidates, experimentSettings, changeOption,
  planConfig, referenceAuc, evidenceDay, investigateWith,
} from '../ml/capstone3lab.js';
import {
  STORAGE_KEY, STEP_COUNT, DECISIONS, MODES, METRICS, REASONS, TEXT_FIELDS, CRITERIA, MAX_DEFENCE, MAX_TEXT,
  emptyState, sanitizeState, resetFrom, stepDone, chainDone, tryKey, signed, d2m, gapSummary, planValid,
  decisionLabel, decisionFeedback, modeLabel, modeFeedback, metricLabel, metricFeedback, reasonLabel, reasonFeedback, thresholdRule, neverFlagSentence,
  splitName, splitDescription, closestSplit, optimismSentences, sharedSentence,
  modelName, modelShort, settingName, settingShort, valueText, searchSentence, intervalText, candidateSentences,
  fieldLabel, changeLabel, changeField, valueShown, settingLines,
  featureLabel, planSummary, ruleLabel, planSentences,
  hypothesisLabel, hypothesisShort, remedyLabel, remedyShort, reasonLines, whatHappened, remedySentences,
  criterionTitle, levelLabel, levelText, buildSummary,
} from '../ml/capstone3report.js';

const STYLE = `
.cap{margin-top:14px}
.cap-check{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
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
.cap-actions{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin-top:12px}
.cap-actions .btn{min-height:40px}
.cap-readout{font-size:13px;color:var(--muted)}
.cap-table{width:100%;margin-top:8px;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums}
.cap-table caption{caption-side:top;text-align:left;font-size:13px;font-weight:750;color:var(--ink);padding:6px 0 0}
.cap-table th,.cap-table td{white-space:normal;padding:7px 10px;text-align:right;border-bottom:1px solid var(--line);vertical-align:top}
.cap-table th:first-child,.cap-table td:first-child{text-align:left}
.cap-table tbody th{background:none;color:var(--ink);font-weight:600}
.cap-table td.cap-chosen,.cap-table th.cap-chosen,.cap-table tr.cap-chosen :is(td,th){background:var(--accent-soft);font-weight:750;color:var(--ink)}
.cap-table td.cap-hot,.cap-table tr.cap-hot :is(td,th){background:var(--bad-soft)}
.cap-bar2{display:block;height:8px;border-radius:4px;background:var(--accent);min-width:2px}
.cap-bar2.ref{background:var(--muted)}
.cap-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:4px 24px;align-items:start}
.cap-model{margin-top:10px}
.cap-model label{display:block;margin-top:12px;font-size:13px;font-weight:650}
.cap-model select{display:block;width:100%;margin-top:6px;padding:8px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink);font-size:13px}
.cap-model div.slider-label{margin-top:12px;font-size:13px;font-weight:650}
.cap-model div.slider-label label{display:inline;margin:0}
.cap-model .hint{margin:8px 0 0}
.cap-model label.toggle{display:flex;gap:8px;align-items:center;font-weight:650}
.cap-block{margin-top:14px;padding:12px 14px;border:1px solid var(--line);border-radius:10px}
.cap-block h4{margin:0 0 4px}
.cap-chart{margin-top:6px}
.cap-chart canvas{display:block;width:100%;height:210px}
.cap-key{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12.5px;color:var(--muted);margin-top:4px}
.cap-key i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-2px;border:2px solid var(--muted)}
.cap-verdict{padding:10px 12px;border-left:4px solid var(--accent);background:var(--surface-2);border-radius:6px;margin-top:10px;font-size:14px}
.cap-verdict.ok{border-left-color:var(--good)}
.cap-verdict.bad{border-left-color:var(--bad)}
.cap-text label,.cap-summary label,.cap-defence label{display:block;margin-top:14px;font-size:13px;font-weight:750}
.cap-text textarea,.cap-summary textarea,.cap-defence textarea{display:block;width:100%;margin-top:4px;padding:8px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;font-size:13px}
.cap-text textarea{min-height:70px;resize:vertical}
.cap-defence textarea{min-height:56px;resize:vertical}
.cap-summary textarea{min-height:320px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;line-height:1.45}
.cap-rubric{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px}
.cap-rubric .cap-set{margin:0;padding:10px 12px;border:1px solid var(--line);border-radius:10px;min-width:0}
.cap-level{display:flex;gap:8px;align-items:flex-start;margin-top:8px;font-size:13px;cursor:pointer}
.cap-level input{margin-top:3px;flex:none;width:16px;height:16px;accent-color:var(--accent)}
.cap-level b{font-weight:750}
.cap-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:10px 0 0}
.cap-stats div{padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)}
.cap-stats dt{font-size:11.5px;font-weight:700;color:var(--muted)}
.cap-stats dd{margin:2px 0 0;font-size:16px;font-weight:800;font-variant-numeric:tabular-nums}
.cap-alert{padding:10px 12px;border-radius:8px;background:var(--bad-soft);font-size:14px;font-weight:650}
.cap-aside dl{margin:0 0 12px;font-size:13px}
.cap-aside dt{margin-top:8px;color:var(--muted);font-size:12px;font-weight:700}
.cap-aside dd{margin:2px 0 0;font-weight:600}
@media (max-width:640px){
  .cap-check{grid-template-columns:repeat(7,1fr)}
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
const d0 = x => fmt(x, { digits: 0 });
// Whole-number fields of a recorded run print without decimals; the metrics keep four.
const fieldDigits = field => (['totalCost', 'flagged'].includes(field) ? 0 : 4);
const modelColor = m => clusterColor(m === 'baseline' ? -1 : m === 'logistic' ? 0 : 1);
const verdictWord = v => (v === 'stable' ? tr('stable', 'stabil') : v === 'moderate' ? tr('moderate', 'sedang') : tr('large', 'besar'));
const stack = (label, text) => h('td', { 'data-label': label, text });
const head = cols => h('thead', {}, h('tr', {}, ...cols.map(t => h('th', { scope: 'col', text: t }))));
const tableWrap = (caption, cols, rows, cls = 'cap-table cap-stack') => h('div', { class: 'table-scroll' }, h('table', { class: cls }, h('caption', { text: caption }), head(cols), h('tbody', {}, rows)));

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Level 3 capstone workbench', 'Workbench capstone Level 3'),
    hint: tr('One project in seven steps: frame the decision, split the data, compare models, record a reproducible run, plan the monitoring, investigate the failure after launch and report. The cases are synthetic, made by a program. Each step opens when the one before it is done, and your work is saved in this browser.',
      'Satu proyek dalam tujuh langkah: rumuskan keputusannya, bagi datanya, bandingkan model, catat run yang dapat direproduksi, rencanakan monitoring, selidiki kegagalan setelah peluncuran, lalu laporkan. Kasusnya sintetis, dibuat oleh program. Tiap langkah terbuka setelah langkah sebelumnya selesai, dan pekerjaanmu tersimpan di browser ini.'),
    status: true, legend: false,
    settingsTitle: tr('Your project', 'Proyekmu'),
  });

  let S = loadState();
  let C = {};                 // what compute() returned for the current state
  let done = Array(STEP_COUNT).fill(false);
  let destroyed = false, armTimer = 0, liveTimer = 0, armed = false, expect = '';
  let noEffect = null;        // the change key whose rerun differed in nothing (shown until another is chosen)
  const cache = new Map(), pending = new Set(), memoCache = new Map(), systems = new Map();
  const openSet = new Set([S.open]);
  let steps = [], chips = [], ui = {};
  const charts = { cost: null, drift: null, delayed: null };

  const style = h('style', { text: STYLE });
  const cap = h('div', { class: 'cap' });
  lab.canvas.closest('.chart').replaceWith(style, cap);
  const live = h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  cap.append(live);

  // ---- saved state -----------------------------------------------------------------------------------------------

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
  const memo = (key, make) => {
    if (!memoCache.has(key)) { if (memoCache.size > 60) memoCache.clear(); memoCache.set(key, make()); }
    return memoCache.get(key);
  };
  const workingNote = () => h('p', { class: 'cap-note', role: 'status' }, tr('Working… this takes a few seconds.', 'Sedang menghitung… ini butuh beberapa detik.'));

  const costs = () => ({ miss: S.miss, falseAlarm: S.falseAlarm, review: S.review });
  const sysKey = () => [S.seed, S.miss, S.falseAlarm, S.review, S.capacity].join('|');
  function systemFor() {
    const key = sysKey();
    if (!systems.has(key)) {
      if (systems.size > 8) systems.clear();
      systems.set(key, buildSystem(SCENARIO_SEEDS[S.seed - 1], { costs: costs(), capacity: S.capacity }));
    }
    return systems.get(key);
  }
  const scenarioSeed = () => SCENARIO_SEEDS[S.seed - 1];

  function compute() {
    const system = systemFor();
    const c = {
      system, facts: frameFacts(system), cmp: null, split: null, tuned: { logistic: null, forest: null }, used: { logistic: null, forest: null },
      ev: null, settings: null, rec: null, rerunRes: null, option: null, changeRes: null,
      planEval: null, planRef: null, refAuc: null, day: null, evidence: null, test: null, rem: null,
    };
    const key = sysKey();
    if (S.splitCompared) c.cmp = lazy(`cmp|${S.seed}`, () => compareSplits(system));
    if (S.split) {
      c.split = memo(`split|${key}|${S.split}`, () => chooseSplit(system, S.split, { seed: system.seed, model: 'baseline' }));
      for (const m of TUNABLE) {
        if (S.searched[m]) c.tuned[m] = lazy(`tune|${S.seed}|${S.split}|${m}`, () => tuneCandidate(system, c.split, m));
        c.used[m] = usedValue(S.picks, m, c.tuned[m]);
      }
      if (S.scored && TUNABLE.every(m => c.used[m] != null)) {
        c.ev = lazy(`ev|${key}|${S.split}|${c.used.logistic}|${c.used.forest}`, () => evaluateCandidates(system, c.split, c.used, { costs: costs(), capacity: S.capacity }));
      }
      if (S.model && c.used[S.model] != null && S.recorded) {
        c.settings = experimentSettings({ split: S.split, model: S.model, picks: c.used, costs: costs(), capacity: S.capacity });
        const rk = `${key}|${JSON.stringify(c.settings)}`;
        c.rec = lazy(`rec|${rk}`, () => {
          const run = runExperiment(scenarioSeed(), c.settings);
          return { run, record: repro(scenarioSeed(), c.settings, run.split, run.metrics) };
        });
        if (c.rec && S.rerun) c.rerunRes = lazy(`rerun|${rk}`, () => checkReproducible(c.rec.record));
        if (c.rec && S.changed) {
          c.option = changeOption(c.settings, S.change);
          c.changeRes = lazy(`chg|${rk}|${S.change}`, () => checkReproducible(c.rec.record, c.option.overrides));
        }
      }
    }
    if (S.planReplayed && planValid(S.plan)) {
      const pk = `${key}|${JSON.stringify(planConfig(S.plan))}`;
      c.planEval = lazy(`plan|${pk}`, () => evaluatePlan({ system, plan: planConfig(S.plan), model: 'logistic' }));
      c.planRef = lazy(`ref|${key}`, () => evaluatePlan({ system, plan: DELAYED_ONLY_PLAN, model: 'logistic' }));
      if (c.planEval) c.refAuc = memo(`refauc|${key}`, () => referenceAuc(system));
    }
    if (S.planCaught && c.planEval && c.planEval.firstAlert !== null) {
      c.day = evidenceDay(system, c.planEval.firstAlert);
      const focus = S.hypFeature;
      c.evidence = memo(`evid|${key}|${c.day}|${focus}`, () => investigateWith(system, { kind: 'skew', feature: focus }, { day: c.day }).evidence);
      if (S.tested && S.hyp) {
        const hyp = ['skew', 'covariate'].includes(S.hyp) ? { kind: S.hyp, feature: S.hypFeature } : { kind: S.hyp };
        c.test = memo(`test|${key}|${c.day}|${JSON.stringify(hyp)}`, () => investigateWith(system, hyp, { day: c.day }));
      }
      if (S.confirmed) {
        const hyp = ['skew', 'covariate'].includes(S.confirmed) ? { kind: S.confirmed, feature: S.confirmedFeature } : { kind: S.confirmed };
        c.rem = memo(`rem|${key}|${c.day}|${JSON.stringify(hyp)}`, () => investigateWith(system, hyp, { day: c.day, remedy: true }).remedy);
      }
    }
    return c;
  }

  // ---- shared pieces ---------------------------------------------------------------------------------------------

  // A group of radio buttons that shows the feedback of the picked one.
  function choiceSet(legend, keys, labelFn, onPick, feedbackFn, getValue) {
    const name = nextId('cap-rad');
    const set = h('fieldset', { class: 'cap-set' }, h('legend', { text: legend }));
    const items = keys.map(k => {
      const input = h('input', { type: 'radio', name, value: k });
      const fb = h('span', { class: 'cap-fb' });
      input.addEventListener('change', () => onPick(k));
      set.append(h('label', { class: 'cap-choice' }, input, h('div', {}, h('b', { text: labelFn(k) }), fb)));
      return { k, input, fb };
    });
    return { el: set, render() { const v = getValue(); for (const it of items) { it.input.checked = v === it.k; it.fb.textContent = v === it.k && feedbackFn ? feedbackFn(it.k) : ''; } } };
  }

  const bigNumber = (label, value) => h('div', {}, h('dt', { text: label }), h('dd', { text: value }));

  // ---- step 1: frame ---------------------------------------------------------------------------------------------

  function step1() {
    const body = h('div');
    const factsP = h('p', { class: 'cap-note' });
    const seedOut = h('span', { class: 'cap-readout' });
    const newData = h('button', { type: 'button', class: 'btn', text: tr('New scenario', 'Skenario baru') });
    newData.addEventListener('click', () => {
      S.seed = S.seed % SCENARIO_SEEDS.length + 1;
      S = resetFrom(S, 2);
      update();
      announce(tr(`Scenario ${fmt(S.seed)} of ${fmt(SCENARIO_SEEDS.length)}: new cases and a new hidden failure. Steps 2 to 6 were reset.`, `Skenario ${fmt(S.seed)} dari ${fmt(SCENARIO_SEEDS.length)}: kasus baru dan kegagalan tersembunyi yang baru. Langkah 2 sampai 6 direset.`));
    });
    const decision = choiceSet(tr('1. What decision does the model support?', '1. Keputusan apa yang didukung model?'), DECISIONS, decisionLabel,
      k => { S.decision = k; update(); announce(decisionFeedback(k)); }, decisionFeedback, () => S.decision);
    const mode = choiceSet(tr('2. Batch or online?', '2. Batch atau online?'), MODES, modeLabel,
      k => { S.mode = k; update(); announce(modeFeedback(k, C.facts)); }, k => modeFeedback(k, C.facts), () => S.mode);
    const costHost = h('div', { class: 'cap-model' });
    const costPanel = panel(costHost, [
      { name: 'miss', type: 'range', label: tr('Cost of a missed positive', 'Biaya positif yang terlewat'), min: COST_RANGE.miss.min, max: COST_RANGE.miss.max, step: 5, value: S.miss },
      { name: 'falseAlarm', type: 'range', label: tr('Extra cost of a false alarm (a reviewed case that was fine)', 'Biaya tambahan alarm palsu (kasus yang ditinjau tetapi ternyata baik)'), min: COST_RANGE.falseAlarm.min, max: COST_RANGE.falseAlarm.max, step: 1, value: S.falseAlarm },
      { name: 'review', type: 'range', label: tr('Cost of one review', 'Biaya satu peninjauan'), min: COST_RANGE.review.min, max: COST_RANGE.review.max, step: 1, value: S.review },
      { name: 'capacity', type: 'range', label: tr('Review capacity (cases a day)', 'Kapasitas peninjauan (kasus per hari)'), min: COST_RANGE.capacity.min, max: COST_RANGE.capacity.max, step: 1, value: S.capacity },
    ], (name, v) => {
      for (const k of ['miss', 'falseAlarm', 'review', 'capacity']) S[k] = v[k];
      S.costsSet = false; S = resetFrom(S, 3); update();
    });
    const rule = h('p', { class: 'cap-verdict' });
    const setCosts = h('button', { type: 'button', class: 'btn primary', text: tr('Set these costs', 'Tetapkan biaya ini') });
    const costState = h('span', { class: 'cap-readout' });
    setCosts.addEventListener('click', () => {
      S.costsSet = true; update();
      announce(tr(`Costs set: a miss costs ${fmt(S.miss)}, a review ${fmt(S.review)}, a false alarm ${fmt(S.falseAlarm)} more, and ${fmt(S.capacity)} cases a day can be reviewed.`, `Biaya ditetapkan: terlewat ${fmt(S.miss)}, satu peninjauan ${fmt(S.review)}, alarm palsu ${fmt(S.falseAlarm)} tambahan, dan ${fmt(S.capacity)} kasus per hari dapat ditinjau.`));
    });
    const metric = choiceSet(tr('3. Which operational metric will you judge the models by?', '3. Metrik operasional mana yang kamu pakai untuk menilai model?'), METRICS, metricLabel,
      k => { S.metric = k; update(); announce(metricFeedback(k, C.facts)); }, k => metricFeedback(k, C.facts), () => S.metric);
    const never = h('p', { class: 'cap-note' });
    const reasonSet = h('fieldset', { class: 'cap-set' }, h('legend', { text: tr('4. Why would a plain accuracy mislead here? Tick every reason that is true.', '4. Mengapa accuracy biasa menyesatkan di sini? Centang setiap alasan yang benar.') }));
    const reasonEls = REASONS.map(r => {
      const input = h('input', { type: 'checkbox', value: r });
      const fb = h('span', { class: 'cap-fb' });
      input.addEventListener('change', () => {
        S.reasons = REASONS.filter(k => reasonEls.find(e => e.key === k).input.checked);
        update();
        announce(reasonFeedback(r, input.checked));
      });
      reasonSet.append(h('label', { class: 'cap-choice' }, input, h('div', {}, h('b', { text: reasonLabel(r) }), fb)));
      return { key: r, input, fb };
    });
    body.append(
      h('p', { text: tr('A team scores the cases of many entities (customers, accounts) once a day and reviews the riskiest ones. Everything here is synthetic: a program generated the cases, the entities, the outcomes and the failure that will happen after launch. There are no penguins and no missing values in this data. The labelled history comes first; after launch the model scores a new batch every day and the outcomes arrive late.',
        'Sebuah tim menilai kasus dari banyak entitas (pelanggan, akun) sekali sehari dan meninjau yang paling berisiko. Semuanya sintetis: sebuah program membuat kasus, entitas, hasil, dan kegagalan yang akan terjadi setelah peluncuran. Tidak ada penguin dan tidak ada missing value di data ini. Riwayat berlabel datang lebih dulu; setelah peluncuran model menilai satu batch baru setiap hari dan hasilnya datang terlambat.') }),
      factsP, h('div', { class: 'cap-actions' }, newData, seedOut),
      decision.el, mode.el,
      h('h4', { text: tr('Unit costs and review capacity', 'Biaya satuan dan kapasitas peninjauan') }),
      h('p', { text: tr('All costs use one unit, for example money lost or minutes of a reviewer. They set the flagging threshold and the daily capacity limits how many cases you can act on.', 'Semua biaya memakai satu satuan, misalnya uang yang hilang atau menit kerja peninjau. Biaya menentukan threshold penandaan dan kapasitas harian membatasi berapa kasus yang dapat kamu tangani.') }),
      costHost, rule, h('div', { class: 'cap-actions' }, setCosts, costState),
      metric.el, never, reasonSet);
    return {
      body,
      render() {
        const f = C.facts;
        for (const k of ['miss', 'falseAlarm', 'review', 'capacity']) costPanel.set(k, S[k]);
        seedOut.textContent = tr(`Scenario ${fmt(S.seed)} of ${fmt(SCENARIO_SEEDS.length)} (synthetic)`, `Skenario ${fmt(S.seed)} dari ${fmt(SCENARIO_SEEDS.length)} (sintetis)`);
        factsP.textContent = tr(
          `Labelled history: ${fmt(f.n)} cases from ${fmt(f.entities)} entities over ${fmt(f.launchDay)} days; ${fmt(f.positives)} are positive (${pct(f.rate)}). After launch, ${fmt(f.streamDays)} days are scored, ${fmt(f.perDay)} cases a day, and ${pct(f.newShare, 0)} of the entities are new. An outcome is known ${fmt(f.labelDelay)} days after its case.`,
          `Riwayat berlabel: ${fmt(f.n)} kasus dari ${fmt(f.entities)} entitas selama ${fmt(f.launchDay)} hari; ${fmt(f.positives)} positif (${pct(f.rate)}). Setelah peluncuran, ${fmt(f.streamDays)} hari dinilai, ${fmt(f.perDay)} kasus per hari, dan ${pct(f.newShare, 0)} entitas adalah entitas baru. Hasil sebuah kasus baru diketahui ${fmt(f.labelDelay)} hari kemudian.`);
        decision.render(); mode.render(); metric.render();
        rule.textContent = thresholdRule(costs(), S.capacity, f.perDay, f.threshold);
        costState.textContent = S.costsSet ? tr('Costs are set. If you change one, step 1 opens again and the results that depend on it are reset.', 'Biaya sudah ditetapkan. Bila kamu mengubah salah satunya, langkah 1 terbuka lagi dan hasil yang bergantung padanya direset.') : tr('Press the button to confirm the costs.', 'Tekan tombol untuk mengonfirmasi biaya.');
        never.textContent = neverFlagSentence(f);
        for (const e of reasonEls) {
          e.input.checked = S.reasons.includes(e.key);
          e.fb.textContent = S.reasons.length ? reasonFeedback(e.key, e.input.checked) : '';
        }
      },
      summary: () => (S.costsSet ? tr(`Miss ${fmt(S.miss)}, review ${fmt(S.review)}, false alarm +${fmt(S.falseAlarm)} · ${fmt(S.capacity)} reviews a day · flag at ${pct(C.facts.threshold)}`, `Terlewat ${fmt(S.miss)}, peninjauan ${fmt(S.review)}, alarm palsu +${fmt(S.falseAlarm)} · ${fmt(S.capacity)} peninjauan per hari · tandai pada ${pct(C.facts.threshold)}`) : ''),
    };
  }

  // ---- step 2: split ---------------------------------------------------------------------------------------------

  function step2() {
    const body = h('div');
    const groupName = nextId('cap-split');
    const set = h('fieldset', { class: 'cap-set' }, h('legend', { text: tr('1. Choose the split that matches how the model will be used', '1. Pilih split yang sesuai dengan cara model akan dipakai') }));
    const inputs = SPLIT_KEYS.map(k => {
      const input = h('input', { type: 'radio', name: groupName, value: k });
      input.addEventListener('change', () => {
        S.split = k; S = resetFrom(S, 3); update();
        announce(tr(`Split chosen: ${splitName(k)}. Steps 3 to 6 were reset.`, `Split dipilih: ${splitName(k)}. Langkah 3 sampai 6 direset.`));
      });
      set.append(h('label', { class: 'cap-choice' }, input, h('div', {}, h('b', { text: splitName(k) }), h('span', { text: splitDescription(k) }))));
      return input;
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
      h('p', { text: tr('A split decides what the test cases are allowed to know. Choose the one that imitates the day the model goes live, then measure how optimistic it is next to the other two: the same forest is scored on the test side of each split and on the cases of new entities after launch, before the failure.', 'Split menentukan apa yang boleh diketahui kasus test. Pilih yang meniru hari saat model dipakai, lalu ukur seberapa optimistis split itu dibandingkan dua yang lain: forest yang sama dinilai pada sisi test tiap split dan pada kasus entitas baru setelah peluncuran, sebelum kegagalan.') }),
      set, h('div', { class: 'cap-actions' }, compare, readout), out,
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
        const rows = SPLIT_KEYS.map(k => {
          const r = cmp[k], mine = k === S.split;
          return h('tr', { class: mine ? 'cap-chosen' : null }, h('th', { scope: 'row', text: splitName(k) + (mine ? tr(' (yours)', ' (pilihanmu)') : '') }),
            stack(tr('AUC on the split\'s test side', 'AUC pada sisi test split'), d2(r.estimate)),
            stack(tr('AUC on new entities after launch', 'AUC pada entitas baru setelah peluncuran'), d2(r.realised)),
            stack(tr('How much the split flatters (the gap)', 'Seberapa besar split memuji (selisih)'), signed(r.optimism)),
            stack(tr('Entities on both sides', 'Entitas di kedua sisi'), fmt(r.sharedEntities, { digits: 0 })),
            stack(tr('Gap, lowest to highest run', 'Selisih, run terendah sampai tertinggi'), r.runs > 1 ? `${signed(r.lo)} – ${signed(r.hi)}` : tr('one possible cut', 'satu titik potong')));
        });
        out.append(
          tableWrap(tr('How optimistic each split is: one reference forest, scored on the test side of each split and on new entities after launch', 'Seberapa optimistis tiap split: satu forest acuan, dinilai pada sisi test tiap split dan pada entitas baru setelah peluncuran'),
            [tr('Split', 'Split'), tr('AUC on the split\'s test side', 'AUC pada sisi test split'), tr('AUC on new entities after launch', 'AUC pada entitas baru setelah peluncuran'), tr('How much the split flatters (the gap)', 'Seberapa besar split memuji (selisih)'), tr('Entities on both sides', 'Entitas di kedua sisi'), tr('Gap, lowest to highest run', 'Selisih, run terendah sampai tertinggi')], rows),
          h('ul', {}, optimismSentences(cmp, S.split).map(t => h('li', { text: t }))),
          h('p', { class: 'cap-note', text: sharedSentence(cmp) }));
      },
      summary: () => (S.split ? `${splitName(S.split)}${C.cmp ? ` · ${gapSummary(C.cmp[S.split].optimism)}` : ''}` : ''),
    };
  }

  // ---- step 3: models --------------------------------------------------------------------------------------------

  function tuneSection(m) {
    const wrap = h('div', { class: 'cap-block' });
    const out = h('div', { class: 'cap-out' });
    const btn = h('button', { type: 'button', class: 'btn primary', text: m === 'logistic' ? tr('Search the penalty strength', 'Cari kekuatan penalti') : tr('Search the maximum depth', 'Cari kedalaman maksimum') });
    btn.addEventListener('click', () => {
      S.searched[m] = true; S = resetFrom({ ...S, searched: { ...S.searched } }, 4); S.searched[m] = true; expect = tr(`${modelName(m)} search finished.`, `Pencarian ${modelName(m)} selesai.`);
      update(); announce(tr(`Searching ${settingShort(m)} for ${modelName(m)}.`, `Mencari ${settingShort(m)} untuk ${modelName(m)}.`));
    });
    const selId = nextId('cap-use');
    const select = h('select', { id: selId });
    select.addEventListener('change', () => {
      S.picks[m] = select.value === 'best' ? null : Number(select.value);
      S = resetFrom(S, 4); update();
      announce(tr(`${modelName(m)} will use ${settingShort(m)} ${valueText(usedValue(S.picks, m, C.tuned[m]))}. Steps 4 to 6 were reset.`, `${modelName(m)} akan memakai ${settingShort(m)} ${valueText(usedValue(S.picks, m, C.tuned[m]))}. Langkah 4 sampai 6 direset.`));
    });
    const desc = m === 'logistic'
      ? tr('A weighted sum of the five numbers of a case, turned into a probability. The setting is the strength of an L2 penalty, which shrinks the weights.', 'Jumlah berbobot dari lima angka sebuah kasus, yang diubah menjadi probabilitas. Pengaturannya adalah kekuatan penalti L2, yang menyusutkan bobot.')
      : tr('Many decision trees that vote. It is flexible: it can recognise an entity from its device fingerprint and remember fine detail. The setting is how deep each tree may grow.', 'Banyak decision tree yang saling memberi suara. Model ini fleksibel: ia dapat mengenali sebuah entitas dari sidik jari perangkatnya dan mengingat detail yang halus. Pengaturannya adalah seberapa dalam tiap tree boleh tumbuh.');
    wrap.append(h('h4', { text: modelName(m) }), h('p', { text: desc }), h('div', { class: 'cap-actions' }, btn), out);
    return {
      el: wrap,
      render() {
        out.replaceChildren();
        btn.disabled = !S.split;
        if (!S.searched[m]) { out.append(h('p', { class: 'hint', text: S.split ? tr(`Press the button to score four values of this setting on the training part, with ${fmt(INNER_FOLDS)} validation folds of the same kind as your split.`, `Tekan tombol untuk menilai empat nilai pengaturan ini pada bagian training, dengan ${fmt(INNER_FOLDS)} fold validasi yang sejenis dengan splitmu.`) : tr('Choose a split in step 2 first.', 'Pilih split di langkah 2 dulu.') })); return; }
        const t = C.tuned[m];
        if (!t) { out.append(workingNote()); return; }
        const used = C.used[m];
        const rows = t.results.map(r => {
          const isUsed = r.value === used;
          return h('tr', { class: isUsed ? 'cap-chosen' : null },
            h('th', { scope: 'row', text: valueText(r.value) + (isUsed ? tr(' (in use)', ' (dipakai)') : r.value === t.best ? tr(' (best)', ' (terbaik)') : '') }),
            stack(tr('Validation AUC', 'AUC validasi'), d2(r.mean)), stack(tr('Spread over the folds', 'Sebaran antar fold'), `± ${d2(r.sd)}`));
        });
        select.replaceChildren(h('option', { value: 'best', text: tr(`Best of the search (${valueText(t.best)})`, `Terbaik dari pencarian (${valueText(t.best)})`) }), ...t.values.map(v => h('option', { value: String(v), text: valueText(v) })));
        select.value = S.picks[m] == null ? 'best' : String(S.picks[m]);
        out.append(
          tableWrap(tr(`${settingName(m)}: validation AUC on the training part`, `${settingName(m)}: AUC validasi pada bagian training`), [settingShort(m), tr('Validation AUC', 'AUC validasi'), tr('Spread over the folds', 'Sebaran antar fold')], rows),
          h('p', { text: searchSentence(m, t, used) }),
          h('div', { class: 'cap-model' }, h('label', { for: selId, text: tr(`Value of ${settingShort(m)} to use`, `Nilai ${settingShort(m)} yang dipakai`) }), select));
      },
    };
  }

  function step3() {
    const body = h('div');
    const sections = { logistic: tuneSection('logistic'), forest: tuneSection('forest') };
    const base = h('div', { class: 'cap-block' }, h('h4', { text: modelName('baseline') }),
      h('p', { text: tr('Always answers with the positive rate of the training part, so it scores every case the same and flags nothing. Nothing to tune. It is what "do nothing" costs.', 'Selalu menjawab dengan tingkat positif pada bagian training, sehingga memberi skor yang sama untuk setiap kasus dan tidak menandai apa pun. Tidak ada yang di-tune. Inilah biaya "tidak berbuat apa-apa".') }));
    const how = h('p', { class: 'cap-note' });
    const score = h('button', { type: 'button', class: 'btn primary', text: tr('Score the three models on the test side', 'Nilai ketiga model pada sisi test') });
    score.addEventListener('click', () => {
      S.scored = true; S = resetFrom({ ...S }, 4); S.scored = true; expect = tr('The three models are scored.', 'Ketiga model sudah dinilai.');
      update(); announce(tr('Scoring the three models.', 'Menilai ketiga model.'));
    });
    const out = h('div', { class: 'cap-out' });
    const radio = nextId('cap-model');
    const pickSet = h('fieldset', { class: 'cap-set' }, h('legend', { text: tr('The model I take forward', 'Model yang kubawa ke langkah berikutnya') }));
    const pickInputs = TUNABLE.map(m => {
      const input = h('input', { type: 'radio', name: radio, value: m });
      input.addEventListener('change', () => { S.model = m; S = resetFrom(S, 4); S.model = m; update(); announce(tr(`Model chosen: ${modelName(m)}.`, `Model dipilih: ${modelName(m)}.`)); });
      pickSet.append(h('label', { class: 'cap-choice' }, input, h('div', {}, h('b', { text: modelName(m) }))));
      return input;
    });
    body.append(
      h('p', { text: tr('Compare the three candidates fairly: the same split, the same small search of four values, and only the training part. Then score them once on the test side with the operational metric, within the review capacity, and with 95% bootstrap intervals.', 'Bandingkan ketiga kandidat dengan adil: split yang sama, pencarian kecil yang sama dengan empat nilai, dan hanya bagian training. Lalu nilai sekali pada sisi test dengan metrik operasional, dalam batas kapasitas peninjauan, dan dengan interval bootstrap 95%.') }),
      how, base, sections.logistic.el, sections.forest.el,
      h('div', { class: 'cap-actions' }, score), out, pickSet);
    return {
      body,
      render() {
        how.textContent = S.split
          ? tr(`The search scores each value by AUC with ${fmt(INNER_FOLDS)} validation folds inside the training part. The folds follow your split: ${S.split === 'grouped' ? 'an entity is never on both sides of a fold' : S.split === 'temporal' ? 'each fold tests on a later block of time' : 'cases are dealt out at random'}. A search whose folds ignore the split falls for the same trap as the split itself.`,
            `Pencarian menilai tiap nilai dengan AUC dan ${fmt(INNER_FOLDS)} fold validasi di dalam bagian training. Fold mengikuti splitmu: ${S.split === 'grouped' ? 'sebuah entitas tidak pernah ada di kedua sisi sebuah fold' : S.split === 'temporal' ? 'tiap fold menguji pada blok waktu yang lebih akhir' : 'kasus dibagi secara acak'}. Pencarian yang foldnya mengabaikan split akan jatuh ke jebakan yang sama dengan splitnya.`)
          : tr('Choose a split in step 2 first: the search uses folds of the same kind.', 'Pilih split di langkah 2 dulu: pencarian memakai fold yang sejenis.');
        for (const m of TUNABLE) sections[m].render();
        const ready = TUNABLE.every(m => S.searched[m] && C.tuned[m]);
        score.disabled = !ready;
        pickSet.disabled = !C.ev;
        pickInputs.forEach(i => { i.checked = i.value === S.model; });
        out.replaceChildren(); charts.cost = null;
        if (!S.scored) { out.append(h('p', { class: 'hint', text: ready ? tr('Both searches are done. Press the button to score the three models once on the test side.', 'Kedua pencarian selesai. Tekan tombol untuk menilai ketiga model satu kali pada sisi test.') : tr('Run both searches first.', 'Jalankan kedua pencarian dulu.') })); return; }
        if (!C.ev) { out.append(workingNote()); return; }
        const ev = C.ev;
        const rows = MODEL_KEYS.map(m => {
          const s = ev.scores[m];
          const setting = m === 'baseline' ? tr('none', 'tidak ada') : `${settingShort(m)} ${valueText(C.used[m])}`;
          return h('tr', { class: m === S.model ? 'cap-chosen' : null }, h('th', { scope: 'row', text: modelName(m) + (m === S.model ? tr(' (yours)', ' (pilihanmu)') : '') }),
            stack(tr('Setting used', 'Pengaturan dipakai'), setting), stack('AUC', intervalText(s.auc)), stack(tr('Average precision', 'Average precision'), intervalText(s.ap)),
            stack(tr('Expected cost per case', 'Expected cost per kasus'), intervalText(s.cost)), stack(tr('Cases flagged', 'Kasus ditandai'), `${fmt(s.op.flagged)} / ${fmt(ev.capacityTest)}`));
        });
        const canvas = h('canvas', { role: 'img' });
        const keyId = nextId('cap-key');
        canvas.setAttribute('aria-describedby', keyId);
        out.append(
          tableWrap(tr('Test-side scores with 95% bootstrap intervals', 'Skor sisi test dengan interval bootstrap 95%'), [tr('Model', 'Model'), tr('Setting used', 'Pengaturan dipakai'), 'AUC', tr('Average precision', 'Average precision'), tr('Expected cost per case', 'Expected cost per kasus'), tr('Cases flagged', 'Kasus ditandai')], rows),
          h('h4', { text: tr('Expected cost per case with its 95% interval (lower is better)', 'Expected cost per kasus beserta interval 95% (makin rendah makin baik)') }),
          h('div', { class: 'cap-chart' }, canvas),
          h('div', { class: 'cap-key', id: keyId }, ...MODEL_KEYS.map(m => h('span', {}, h('i', { style: `background:${modelColor(m)};border-color:${modelColor(m)}` }), modelName(m))), h('span', {}, tr('Dashed line: the baseline, which flags nothing', 'Garis putus-putus: baseline, yang tidak menandai apa pun'))),
          h('ul', {}, candidateSentences(ev).map(t => h('li', { text: t }))),
          h('p', { class: 'hint', text: tr('Choosing a model by its test-side score uses the test side once. Do not go back and tune on it again: the real test is the stream after launch.', 'Memilih model dari skor sisi test berarti memakai sisi test satu kali. Jangan kembali men-tune dengannya: ujian sesungguhnya adalah stream setelah peluncuran.') }));
        charts.cost = { canvas, ev };
      },
      summary: () => (S.model && C.ev ? `${modelName(S.model)} · ${tr('cost per case', 'biaya per kasus')} ${d2(C.ev.scores[S.model].cost.estimate)}` : ''),
    };
  }

  // ---- step 4: reproducibility -----------------------------------------------------------------------------------

  function step4() {
    const body = h('div');
    const what = h('div');
    const record = h('button', { type: 'button', class: 'btn primary', text: tr('Record this run', 'Catat run ini') });
    record.addEventListener('click', () => { S.recorded = true; expect = tr('The run is recorded.', 'Run sudah dicatat.'); update(); announce(tr('Recording the run.', 'Mencatat run.')); });
    const recOut = h('div', { class: 'cap-out' });
    const rerun = h('button', { type: 'button', class: 'btn primary', text: tr('Rerun', 'Rerun') });
    rerun.addEventListener('click', () => { S.rerun = true; expect = tr('The rerun is finished.', 'Rerun selesai.'); update(); announce(tr('Rerunning with the same seed and settings.', 'Menjalankan ulang dengan seed dan pengaturan yang sama.')); });
    const rerunOut = h('div', { class: 'cap-out' });
    const selId = nextId('cap-change');
    const select = h('select', { id: selId });
    for (const k of CHANGE_KEYS) select.append(h('option', { value: k, text: changeLabel(k) }));
    select.addEventListener('change', () => { S.change = select.value; S.changed = false; noEffect = null; update(); });
    const rerunChange = h('button', { type: 'button', class: 'btn', text: tr('Rerun with the change', 'Rerun dengan perubahan') });
    rerunChange.addEventListener('click', () => { S.changed = true; noEffect = null; expect = tr('The changed rerun is finished.', 'Rerun yang diubah selesai.'); update(); announce(tr('Rerunning with one setting changed.', 'Menjalankan ulang dengan satu pengaturan diubah.')); });
    const changeOut = h('div', { class: 'cap-out' });
    const changeBox = h('div', { class: 'cap-model' }, h('label', { for: selId, text: tr('Which one setting to change', 'Satu pengaturan mana yang diubah') }), select, h('div', { class: 'cap-actions' }, rerunChange), changeOut);
    body.append(
      h('p', { text: tr('A result nobody can repeat is a rumour. Record the seed and every setting that made the run, then rerun from the record: the split and every number must come out identical. Then change one setting and watch the check fail, so you know the check can fail.', 'Hasil yang tidak dapat diulang hanyalah kabar angin. Catat seed dan setiap pengaturan yang membuat run, lalu jalankan ulang dari catatan itu: split dan setiap angka harus identik. Lalu ubah satu pengaturan dan lihat pemeriksaan gagal, sehingga kamu tahu pemeriksaan itu memang dapat gagal.') }),
      what, h('div', { class: 'cap-actions' }, record), recOut,
      h('h4', { text: tr('Rerun from the record', 'Rerun dari catatan') }), h('div', { class: 'cap-actions' }, rerun), rerunOut,
      h('h4', { text: tr('Change one setting', 'Ubah satu pengaturan') }), changeBox);
    return {
      body,
      render() {
        what.replaceChildren();
        const ready = Boolean(S.model && S.split);
        record.disabled = !ready;
        rerun.disabled = !(S.recorded && C.rec);
        rerunChange.disabled = !(S.rerun && C.rec);
        select.disabled = !S.rerun;
        select.value = S.change;
        recOut.replaceChildren(); rerunOut.replaceChildren(); changeOut.replaceChildren();
        if (!ready) { what.append(h('p', { class: 'hint', text: tr('Choose the model to take forward in step 3 first.', 'Pilih model yang dibawa di langkah 3 dulu.') })); return; }
        const settings = experimentSettings({ split: S.split, model: S.model, picks: C.used, costs: costs(), capacity: S.capacity });
        what.append(tableWrap(tr('What a run is made of', 'Dari apa sebuah run dibuat'), [tr('Item', 'Item'), tr('Value', 'Nilai')], settingLines(settings, scenarioSeed()).map(([k, v]) => h('tr', {}, h('th', { scope: 'row', text: k }), stack(tr('Value', 'Nilai'), v)))));
        if (!S.recorded) return;
        if (!C.rec) { recOut.append(workingNote()); return; }
        const rec = C.rec.record, m = rec.metrics;
        recOut.append(
          h('dl', { class: 'cap-stats' },
            bigNumber(tr('Seed', 'Seed'), fmt(rec.seed)), bigNumber(tr('Split fingerprint', 'Sidik jari split'), rec.split.hash),
            bigNumber(tr('Cases in train / test', 'Kasus di train / test'), `${fmt(rec.split.nTrain)} / ${fmt(rec.split.nTest)}`), bigNumber('AUC', d2(m.auc)),
            bigNumber(tr('Expected cost per case', 'Expected cost per kasus'), d2(m.expectedCost)), bigNumber(tr('Cases flagged', 'Kasus ditandai'), fmt(m.flagged))),
          h('p', { class: 'hint', text: tr('This record (seed, settings, split fingerprint, metrics) is what you would file next to the result.', 'Catatan ini (seed, pengaturan, sidik jari split, metrik) adalah yang akan kamu simpan di samping hasilnya.') }));
        if (S.rerun) {
          if (!C.rerunRes) rerunOut.append(workingNote());
          else rerunOut.append(h('p', { class: C.rerunRes.reproducible ? 'cap-verdict ok' : 'cap-verdict bad', role: 'status', text: C.rerunRes.reproducible
            ? tr('Check passed: the same seed and settings give the same split fingerprint and identical metrics (to 9 decimals). This run is reproducible.', 'Pemeriksaan lulus: seed dan pengaturan yang sama memberi sidik jari split yang sama dan metrik identik (sampai 9 desimal). Run ini dapat direproduksi.')
            : tr('Check failed: the rerun differs from the record. Something that is not in the record changed.', 'Pemeriksaan gagal: rerun berbeda dari catatan. Ada sesuatu yang tidak ada di catatan yang berubah.') }));
        } else rerunOut.append(h('p', { class: 'hint', text: tr('Press "Rerun" to run again from the record.', 'Tekan "Rerun" untuk menjalankan ulang dari catatan.') }));
        if (!S.rerun) { changeOut.append(h('p', { class: 'hint', text: tr('Rerun the record unchanged first.', 'Jalankan ulang catatan tanpa perubahan dulu.') })); return; }
        const opt = changeOption(settings, S.change);
        changeOut.append(h('p', { class: 'cap-note', text: tr(`This will change ${changeField(opt.field)} from ${valueShown(opt.field, opt.from)} to ${valueShown(opt.field, opt.to)} and nothing else.`, `Ini akan mengubah ${changeField(opt.field)} dari ${valueShown(opt.field, opt.from)} menjadi ${valueShown(opt.field, opt.to)} dan tidak ada yang lain.`) }));
        if (noEffect === S.change) changeOut.append(h('p', { class: 'cap-warn', role: 'status', text: tr('This change did not alter any number in this run (for example, the review capacity was not binding). Choose another setting.', 'Perubahan ini tidak mengubah angka apa pun pada run ini (misalnya kapasitas peninjauan tidak membatasi). Pilih pengaturan lain.') }));
        if (S.changed) {
          if (!C.changeRes) changeOut.append(workingNote());
          else {
            const rows = C.changeRes.mismatches.map(x => h('tr', {}, h('th', { scope: 'row', text: fieldLabel(x.field) }), stack(tr('Recorded', 'Tercatat'), typeof x.recorded === 'number' ? fmt(x.recorded, { digits: fieldDigits(x.field) }) : String(x.recorded)), stack(tr('Rerun', 'Rerun'), typeof x.rerun === 'number' ? fmt(x.rerun, { digits: fieldDigits(x.field) }) : String(x.rerun))));
            changeOut.append(
              h('p', { class: 'cap-verdict bad', role: 'status', text: tr(`Check failed, as it should: with ${changeField(opt.field)} changed, ${fmt(C.changeRes.mismatches.length)} of the recorded values no longer match${C.changeRes.splitSame ? '; the split itself is the same' : '; even the split is different'}.`, `Pemeriksaan gagal, seperti seharusnya: dengan ${changeField(opt.field)} diubah, ${fmt(C.changeRes.mismatches.length)} nilai tercatat tidak lagi cocok${C.changeRes.splitSame ? '; splitnya sendiri sama' : '; bahkan splitnya berbeda'}.`) }),
              tableWrap(tr('What differs from the record', 'Apa yang berbeda dari catatan'), [tr('Field', 'Kolom'), tr('Recorded', 'Tercatat'), tr('Rerun', 'Rerun')], rows));
          }
        }
      },
      summary: () => (S.changed ? tr('Reproducible; one changed setting breaks the check', 'Dapat direproduksi; satu pengaturan yang diubah merusak pemeriksaan') : S.rerun ? tr('Rerun passed', 'Rerun lulus') : ''),
    };
  }

  // ---- step 5: monitoring plan -----------------------------------------------------------------------------------

  function step5() {
    const body = h('div');
    const L = PLAN_LIMITS;
    const blocks = [];
    const panels = {};
    const addBlock = (key, title, desc, specs, onChange) => {
      const host = h('div', { class: 'cap-model' });
      const p = panel(host, specs, onChange);
      panels[key] = p;
      const block = h('div', { class: 'cap-block' }, h('h4', { text: title }), h('p', { text: desc }), host);
      blocks.push(block);
      return p;
    };
    const planChanged = () => { S.planReplayed = false; S.planCaught = false; S = resetFrom({ ...S, plan: S.plan }, 6); update(); };
    addBlock('psi', tr('Input drift per feature (PSI)', 'Input drift per feature (PSI)'), tr('Compares the values the model is served over the last window of days with the history, one feature at a time (the Population Stability Index). It sees the inputs, with no need for labels, so it is fast. It cannot see a change in the rule.', 'Membandingkan nilai yang disajikan ke model selama window hari terakhir dengan riwayat, satu feature per kali (Population Stability Index). Ia melihat input tanpa butuh label, sehingga cepat. Ia tidak dapat melihat perubahan pada aturannya.'), [
      { name: 'on', type: 'toggle', label: tr('Watch the inputs', 'Pantau input'), value: S.plan.psi.on },
      ...FEATURES.map(f => ({ name: `f_${f}`, type: 'toggle', label: featureLabel(f), value: S.plan.psi.features.includes(f) })),
      { name: 'threshold', type: 'range', label: tr('Alert when the largest PSI is above', 'Alert bila PSI terbesar di atas'), min: L.psi.threshold.min, max: L.psi.threshold.max, step: L.psi.threshold.step, value: S.plan.psi.threshold, format: v => fmt(v, { digits: 2 }) },
      { name: 'window', type: 'range', label: tr('Window (days)', 'Window (hari)'), min: L.psi.window.min, max: L.psi.window.max, step: 1, value: S.plan.psi.window },
    ], (name, v) => { S.plan.psi.on = v.on; S.plan.psi.threshold = v.threshold; S.plan.psi.window = v.window; S.plan.psi.features = FEATURES.filter(f => v[`f_${f}`]); planChanged(); });
    addBlock('score', tr('Score drift (PSI of the model\'s scores)', 'Score drift (PSI skor model)'), tr('The same comparison on the scores the model gives. It reacts when the inputs or the model\'s response change, and it also needs no labels.', 'Perbandingan yang sama pada skor yang diberikan model. Ia bereaksi ketika input atau respons model berubah, dan juga tidak butuh label.'), [
      { name: 'on', type: 'toggle', label: tr('Watch the scores', 'Pantau skor'), value: S.plan.score.on },
      { name: 'threshold', type: 'range', label: tr('Alert when PSI is above', 'Alert bila PSI di atas'), min: L.score.threshold.min, max: L.score.threshold.max, step: L.score.threshold.step, value: S.plan.score.threshold, format: v => fmt(v, { digits: 2 }) },
      { name: 'window', type: 'range', label: tr('Window (days)', 'Window (hari)'), min: L.score.window.min, max: L.score.window.max, step: 1, value: S.plan.score.window },
    ], (name, v) => { S.plan.score.on = v.on; S.plan.score.threshold = v.threshold; S.plan.score.window = v.window; planChanged(); });
    addBlock('delayed', tr('Delayed accuracy (AUC of the labels that have arrived)', 'Delayed accuracy (AUC dari label yang sudah datang)'), tr('Scores the model on the outcomes that have arrived in the window, with the predictions made at the time. It is the honest measure and it is slow: a label arrives days after its case.', 'Menilai model pada hasil yang sudah datang di dalam window, dengan prediksi yang dibuat saat itu. Ini ukuran yang jujur dan lambat: label datang beberapa hari setelah kasusnya.'), [
      { name: 'on', type: 'toggle', label: tr('Watch the delayed accuracy', 'Pantau delayed accuracy'), value: S.plan.delayed.on },
      { name: 'drop', type: 'range', label: tr('Alert when the AUC falls below the history by more than', 'Alert bila AUC turun di bawah riwayat lebih dari'), min: L.delayed.drop.min, max: L.delayed.drop.max, step: L.delayed.drop.step, value: S.plan.delayed.drop, format: v => fmt(v, { digits: 2 }) },
      { name: 'window', type: 'range', label: tr('Window (days of arriving labels)', 'Window (hari label yang datang)'), min: L.delayed.window.min, max: L.delayed.window.max, step: 1, value: S.plan.delayed.window },
    ], (name, v) => { S.plan.delayed.on = v.on; S.plan.delayed.drop = v.drop; S.plan.delayed.window = v.window; planChanged(); });
    addBlock('prevalence', tr('Share of positives among the arrived labels', 'Porsi positif di antara label yang sudah datang'), tr('Compares the share of positive outcomes that arrived in the window with the history. It catches a change in how common the outcome is, and it also waits for labels.', 'Membandingkan porsi hasil positif yang datang di dalam window dengan riwayat. Ia menangkap perubahan seberapa sering hasil itu terjadi, dan ia juga menunggu label.'), [
      { name: 'on', type: 'toggle', label: tr('Watch the share of positives', 'Pantau porsi positif'), value: S.plan.prevalence.on },
      { name: 'ratio', type: 'range', label: tr('Alert when the share is more than this many times the history', 'Alert bila porsinya lebih dari sekian kali riwayat'), min: L.prevalence.ratio.min, max: L.prevalence.ratio.max, step: L.prevalence.ratio.step, value: S.plan.prevalence.ratio, format: v => fmt(v, { digits: 1 }) },
      { name: 'window', type: 'range', label: tr('Window (days of arriving labels)', 'Window (hari label yang datang)'), min: L.prevalence.window.min, max: L.prevalence.window.max, step: 1, value: S.plan.prevalence.window },
    ], (name, v) => { S.plan.prevalence.on = v.on; S.plan.prevalence.ratio = v.ratio; S.plan.prevalence.window = v.window; planChanged(); });
    const consHost = h('div', { class: 'cap-model' });
    panels.cons = panel(consHost, [{ name: 'consecutive', type: 'range', label: tr('Days in a row a monitor must breach before it alerts', 'Hari berturut-turut sebuah monitor harus melanggar sebelum alert'), min: L.consecutive.min, max: L.consecutive.max, step: 1, value: S.plan.consecutive }], (name, v) => { S.plan.consecutive = v.consecutive; planChanged(); });
    const replay = h('button', { type: 'button', class: 'btn primary', text: tr('Replay the stream', 'Putar ulang stream') });
    replay.addEventListener('click', () => {
      S.planReplayed = true; S.planCaught = false; S = resetFrom({ ...S }, 6); S.planReplayed = true;
      expect = tr('The stream is replayed.', 'Stream sudah diputar ulang.'); update(); announce(tr('Replaying the stream with your plan.', 'Memutar ulang stream dengan rencanamu.'));
    });
    const readout = h('span', { class: 'cap-readout' });
    const out = h('div', { class: 'cap-out' });
    body.append(
      h('p', { text: tr('After launch the model scores a new batch every day, and you will not be told when something breaks. A monitoring plan decides what to watch, with which threshold and window. The model watched here is a logistic regression fitted on all the history before launch, the same in every scenario so that the failure has one clear answer. Choose your monitors, then replay the stream day by day: you will see the first alert, the false alarms and what the failure cost before it was caught.', 'Setelah peluncuran model menilai satu batch baru tiap hari, dan tidak ada yang memberitahumu bila sesuatu rusak. Rencana monitoring menentukan apa yang dipantau, dengan threshold dan window berapa. Model yang dipantau di sini adalah regresi logistik yang dilatih pada seluruh riwayat sebelum peluncuran, sama di setiap skenario agar kegagalannya punya satu jawaban yang jelas. Pilih monitormu, lalu putar ulang stream hari demi hari: kamu akan melihat alert pertama, alarm palsu, dan biaya kegagalan sebelum tertangkap.') }),
      ...blocks, h('div', { class: 'cap-block' }, h('h4', { text: tr('Alert policy', 'Kebijakan alert') }), consHost),
      h('div', { class: 'cap-actions' }, replay, readout), out);
    return {
      body,
      render() {
        const P = S.plan;
        panels.psi.set('on', P.psi.on); for (const f of FEATURES) panels.psi.set(`f_${f}`, P.psi.features.includes(f)); panels.psi.set('threshold', P.psi.threshold); panels.psi.set('window', P.psi.window);
        panels.score.set('on', P.score.on); panels.score.set('threshold', P.score.threshold); panels.score.set('window', P.score.window);
        panels.delayed.set('on', P.delayed.on); panels.delayed.set('drop', P.delayed.drop); panels.delayed.set('window', P.delayed.window);
        panels.prevalence.set('on', P.prevalence.on); panels.prevalence.set('ratio', P.prevalence.ratio); panels.prevalence.set('window', P.prevalence.window);
        panels.cons.set('consecutive', P.consecutive);
        const valid = planValid(P);
        replay.disabled = !valid;
        readout.textContent = valid ? planSummary(P) : (!(P.psi.on || P.score.on || P.delayed.on || P.prevalence.on) ? tr('Switch on at least one monitor.', 'Nyalakan setidaknya satu monitor.') : tr('Input drift needs at least one feature.', 'Input drift butuh setidaknya satu feature.'));
        out.replaceChildren(); charts.drift = null; charts.delayed = null;
        if (!S.planReplayed) return;
        if (!C.planEval || !C.planRef) { out.append(workingNote()); return; }
        const ev = C.planEval, sys = C.system;
        const caught = ev.firstAlert !== null;
        const stats = [
          bigNumber(tr('Failure began on day', 'Kegagalan dimulai pada hari'), fmt(sys.truth.day)),
          bigNumber(tr('First alert on day', 'Alert pertama pada hari'), caught ? fmt(ev.firstAlert) : tr('never', 'tidak pernah')),
          bigNumber(tr('Days until detection', 'Hari sampai terdeteksi'), caught ? fmt(ev.detectionDelay) : '–'),
          bigNumber(tr('False alarm days', 'Hari alarm palsu'), fmt(ev.falseAlarmDays)),
          bigNumber(tr('Cost until detection', 'Biaya sampai terdeteksi'), d0(ev.costUntilDetection)),
          bigNumber(tr('Total cost with false alarms', 'Total biaya dengan alarm palsu'), d0(ev.totalCost))];
        const cDrift = h('canvas', { role: 'img' }), cDelayed = h('canvas', { role: 'img' });
        const keyId = nextId('cap-key');
        cDrift.setAttribute('aria-describedby', keyId);
        const anyDrift = P.psi.on || P.score.on;
        out.append(
          h('dl', { class: 'cap-stats' }, ...stats),
          h('ul', {}, planSentences(ev, C.planRef, sys.truth.day).map(t => h('li', { text: t }))),
          h('h4', { text: tr('Drift monitors by day (PSI)', 'Monitor drift per hari (PSI)') }),
          anyDrift ? h('div', { class: 'cap-chart' }, cDrift) : h('p', { class: 'hint', text: tr('Input drift and score drift are off in this plan.', 'Input drift dan score drift mati pada rencana ini.') }),
          h('h4', { text: tr('Delayed accuracy by day (AUC of the arrived labels)', 'Delayed accuracy per hari (AUC label yang sudah datang)') }),
          P.delayed.on ? h('div', { class: 'cap-chart' }, cDelayed) : h('p', { class: 'hint', text: tr('Delayed accuracy is off in this plan.', 'Delayed accuracy mati pada rencana ini.') }),
          h('div', { class: 'cap-key', id: keyId },
            h('span', {}, h('i', { style: `background:${clusterColor(0)};border-color:${clusterColor(0)}` }), tr('Largest feature PSI', 'PSI feature terbesar')),
            h('span', {}, h('i', { style: `background:${clusterColor(1)};border-color:${clusterColor(1)}` }), tr('Score PSI', 'PSI skor')),
            h('span', {}, h('i', { style: 'background:transparent' }), tr('Dashed: your threshold', 'Putus-putus: thresholdmu')),
            h('span', {}, h('i', { style: 'background:var(--ink);border-color:var(--ink)' }), tr('Solid vertical line: the failure began · triangles: days the monitor in that chart alerted (other monitors are not drawn)', 'Garis vertikal tegas: kegagalan dimulai · segitiga: hari monitor pada diagram itu berbunyi (monitor lain tidak digambar)'))),
          ...(caught ? [] : [h('p', { class: 'cap-warn', text: tr('Step 5 is done only when your plan catches the failure. Change the plan and replay.', 'Langkah 5 selesai hanya bila rencanamu menangkap kegagalan. Ubah rencananya dan putar ulang.') })]));
        charts.drift = anyDrift ? { canvas: cDrift, ev, plan: P } : null;
        charts.delayed = P.delayed.on ? { canvas: cDelayed, ev, plan: P, ref: C.refAuc } : null;
      },
      summary: () => (S.planCaught && C.planEval ? tr(`First alert on day ${fmt(C.planEval.firstAlert)}, ${fmt(C.planEval.falseAlarmDays)} false alarm days`, `Alert pertama hari ke-${fmt(C.planEval.firstAlert)}, ${fmt(C.planEval.falseAlarmDays)} hari alarm palsu`) : ''),
    };
  }

  // ---- step 6: investigate -----------------------------------------------------------------------------------------

  function step6() {
    const body = h('div');
    const alertBox = h('p', { class: 'cap-alert', role: 'status' });
    const evidence = h('div'), evidence2 = h('div');
    const featId = nextId('cap-focus');
    const featSel = h('select', { id: featId });
    for (const f of FEATURES) featSel.append(h('option', { value: f, text: f }));
    featSel.addEventListener('change', () => { S.hypFeature = featSel.value; S.tested = false; update(); });
    const featureBox = h('div', { class: 'cap-model' }, h('label', { for: featId, text: tr('Feature to inspect (the slice table below, and a skew or covariate hypothesis, are about this feature)', 'Feature yang diperiksa (tabel slice di bawah, serta hipotesis skew atau covariate, membahas feature ini)') }), featSel);
    const hypName = nextId('cap-hyp');
    const hypSet = h('fieldset', { class: 'cap-set' }, h('legend', { text: tr('Which hypothesis explains the alert?', 'Hipotesis mana yang menjelaskan alert ini?') }));
    const hypInputs = HYPOTHESES.map(k => {
      const input = h('input', { type: 'radio', name: hypName, value: k });
      input.addEventListener('change', () => { S.hyp = k; S.tested = false; update(); });
      hypSet.append(h('label', { class: 'cap-choice' }, input, h('div', {}, h('b', { text: hypothesisLabel(k) }))));
      return input;
    });
    const test = h('button', { type: 'button', class: 'btn primary', text: tr('Test this hypothesis', 'Uji hipotesis ini') });
    test.addEventListener('click', () => {
      const hyp = ['skew', 'covariate'].includes(S.hyp) ? { kind: S.hyp, feature: S.hypFeature } : { kind: S.hyp };
      const inv = investigateWith(C.system, hyp, { day: C.day });
      S.tested = true;
      if (S.confirmed === null) {
        if (inv.confirmed) { S.confirmed = S.hyp; S.confirmedFeature = hyp.feature ?? inv.hypothesis.feature ?? null; S.remedy = null; S.remedyApplied = false; } else { const key = tryKey(S.hyp, S.hypFeature); if (!S.wrongTried.includes(key)) { S.wrongTried.push(key); S.wrong = S.wrongTried.length; } }
      }
      update();
      announce(inv.confirmed ? tr(`${hypothesisShort(S.hyp)} is confirmed by the evidence.`, `${hypothesisShort(S.hyp)} terkonfirmasi oleh bukti.`) : tr(`${hypothesisShort(S.hyp)} is not confirmed.`, `${hypothesisShort(S.hyp)} tidak terkonfirmasi.`));
    });
    const testOut = h('div', { class: 'cap-out' });
    const remName = nextId('cap-rem');
    const remSet = h('fieldset', { class: 'cap-set' }, h('legend', { text: tr('Which remedy do you apply?', 'Perbaikan mana yang kamu terapkan?') }));
    const remInputs = REMEDY_KINDS.map(k => {
      const input = h('input', { type: 'radio', name: remName, value: k });
      input.addEventListener('change', () => { S.remedy = k; S.remedyApplied = false; update(); });
      remSet.append(h('label', { class: 'cap-choice' }, input, h('div', {}, h('b', { text: remedyLabel(k) }))));
      return input;
    });
    const apply = h('button', { type: 'button', class: 'btn primary', text: tr('Apply this remedy', 'Terapkan perbaikan ini') });
    apply.addEventListener('click', () => { S.remedyApplied = true; update(); announce(tr('Remedy applied: the cost of every option is shown.', 'Perbaikan diterapkan: biaya setiap opsi ditampilkan.')); });
    const remOut = h('div', { class: 'cap-out' });
    const remBox = h('div');
    remBox.append(remSet, h('div', { class: 'cap-actions' }, apply), remOut);
    body.append(
      h('p', { text: tr('An alert is a question, not an answer. Read the evidence a team would pull, name a hypothesis, and test it: the lab says whether the evidence confirms it. Only then choose a remedy and see what it costs from the investigation day to the end of the stream. A wrong guess is cheap here; in production it is not.', 'Alert adalah pertanyaan, bukan jawaban. Baca bukti yang akan ditarik sebuah tim, sebut sebuah hipotesis, dan ujilah: lab menyatakan apakah bukti mengonfirmasinya. Baru setelah itu pilih perbaikan dan lihat biayanya dari hari penyelidikan sampai akhir stream. Menebak salah murah di sini; di produksi tidak.') }),
      alertBox, evidence, featureBox, evidence2,
      h('h4', { text: tr('Your hypothesis', 'Hipotesismu') }), hypSet, h('div', { class: 'cap-actions' }, test), testOut,
      h('h4', { text: tr('The remedy', 'Perbaikannya') }), remBox);
    return {
      body,
      render() {
        evidence.replaceChildren(); evidence2.replaceChildren(); testOut.replaceChildren(); remOut.replaceChildren();
        const ready = Boolean(S.planCaught && C.planEval && C.evidence);
        hypSet.disabled = !ready;
        hypInputs.forEach(i => { i.checked = i.value === S.hyp; });
        featSel.value = S.hypFeature;
        featSel.disabled = !ready;
        test.disabled = !(ready && S.hyp);
        remSet.disabled = S.confirmed === null;
        remInputs.forEach(i => { i.checked = i.value === S.remedy; });
        apply.disabled = S.confirmed === null || S.remedy === null;
        if (!ready) { alertBox.textContent = S.planReplayed && !S.planCaught ? tr('Your plan has not caught the failure yet (step 5).', 'Rencanamu belum menangkap kegagalan (langkah 5).') : tr('Finish step 5 first: the alert that opens this investigation comes from your monitoring plan.', 'Selesaikan langkah 5 dulu: alert yang membuka investigasi ini datang dari rencana monitoringmu.'); return; }
        const ev = C.evidence, first = C.planEval.alerts.find(a => a.day >= C.system.truth.day);
        alertBox.textContent = tr(`Alert on day ${fmt(C.planEval.firstAlert)}${first ? ` (${ruleLabel(first.rule)}${first.feature ? `, ${first.feature}` : ''})` : ''}. You read the evidence on day ${fmt(C.day)}, once ${fmt(C.system.labelDelay)} days of labels from the new regime have arrived. The evidence covers the last ${fmt(ev.window)} days.`,
          `Alert pada hari ke-${fmt(C.planEval.firstAlert)}${first ? ` (${ruleLabel(first.rule)}${first.feature ? `, ${first.feature}` : ''})` : ''}. Kamu membaca bukti pada hari ke-${fmt(C.day)}, setelah label ${fmt(C.system.labelDelay)} hari dari rezim baru datang. Bukti mencakup ${fmt(ev.window)} hari terakhir.`);
        // evidence panels
        const featRows = ev.featureTable.map(r => h('tr', { class: !r.identifier && r.psi >= 0.25 ? 'cap-hot' : null },
          h('th', { scope: 'row', text: r.feature + (r.identifier ? tr(' (identifier)', ' (pengenal)') : '') }),
          stack('PSI', d2(r.psi)), stack(tr('Reading', 'Pembacaan'), verdictWord(r.verdict)), stack(tr('Served value differs from the offline one', 'Nilai yang disajikan berbeda dari yang offline'), pct(r.mismatch, 0))));
        const dl = ev.delayed;
        const stats = h('dl', { class: 'cap-stats' },
          bigNumber(tr('Score drift (PSI)', 'Score drift (PSI)'), d2(ev.scoreDrift)),
          bigNumber(tr('Labels arrived in the window', 'Label yang datang di window'), fmt(dl.n)),
          bigNumber(tr('Positives among them', 'Positif di antaranya'), fmt(dl.positives)),
          bigNumber(tr('Delayed AUC', 'AUC tertunda'), d2(dl.auc)),
          bigNumber(tr('AUC before launch', 'AUC sebelum peluncuran'), d2(dl.baselineAuc)),
          bigNumber(tr('Observed positive share', 'Porsi positif teramati'), dl.prevalence === null ? '–' : pct(dl.prevalence, 1)),
          bigNumber(tr('Mean predicted score', 'Rata-rata skor prediksi'), pct(dl.meanScore, 1)),
          bigNumber(tr('Accuracy at the threshold', 'Accuracy pada threshold'), dl.accuracy === null ? '–' : pct(dl.accuracy, 0)),
          bigNumber(tr('Recall at the threshold', 'Recall pada threshold'), dl.recall === null ? '–' : pct(dl.recall, 0)));
        const cohortRows = ev.slices.cohort.map(c => h('tr', {}, h('th', { scope: 'row', text: c.name === 'new' ? tr('New entities', 'Entitas baru') : tr('Established entities', 'Entitas lama') }),
          stack(tr('Share of recent cases', 'Porsi kasus terbaru'), pct(c.share, 0)), stack(tr('Mean score', 'Rata-rata skor'), pct(c.meanScore, 1)), stack(tr('Positive share (arrived labels)', 'Porsi positif (label yang datang)'), c.prevalence === null ? '–' : pct(c.prevalence, 1))));
        const maxShare = Math.max(...ev.slices.feature.bins.flatMap(b => [b.share, b.referenceShare]), 0.01);
        const binName = (b, i) => (i === 0 ? tr(`up to ${d2m(b.hi)}`, `sampai ${d2m(b.hi)}`) : i === 2 ? tr(`above ${d2m(b.lo)}`, `di atas ${d2m(b.lo)}`) : `${d2m(b.lo)} – ${d2m(b.hi)}`);
        const binRows = ev.slices.feature.bins.map((b, i) => h('tr', {}, h('th', { scope: 'row', text: binName(b, i) }),
          stack(tr('Recent share', 'Porsi terbaru'), pct(b.share, 0)), stack(tr('History share', 'Porsi riwayat'), pct(b.referenceShare, 0)),
          h('td', { 'data-label': tr('Recent (blue) against history (grey)', 'Terbaru (biru) dibanding riwayat (abu-abu)'), 'aria-hidden': 'true' }, h('span', { class: 'cap-bar2', style: `width:${(b.share / maxShare * 100).toFixed(1)}%` }), h('span', { class: 'cap-bar2 ref', style: `width:${(b.referenceShare / maxShare * 100).toFixed(1)}%;margin-top:3px` }))));
        evidence.append(
          h('h4', { text: tr('Evidence 1: feature PSI against the history', 'Bukti 1: PSI feature terhadap riwayat') }),
          tableWrap(tr('Feature PSI and the offline check (the last days)', 'PSI feature dan pemeriksaan offline (hari-hari terakhir)'), [tr('Feature', 'Feature'), 'PSI', tr('Reading', 'Pembacaan'), tr('Served value differs from the offline one', 'Nilai yang disajikan berbeda dari yang offline')], featRows),
          h('p', { class: 'hint', text: tr('PSI below 0.10 is stable, 0.10 to 0.25 moderate, above 0.25 large. "Served value differs from the offline one" recomputes the feature from the raw inputs and compares: a bug in the serving pipeline shows up here, a real change in the world does not. An identifier such as deviceId moves whenever new entities arrive.', 'PSI di bawah 0,10 stabil, 0,10 sampai 0,25 sedang, di atas 0,25 besar. "Nilai yang disajikan berbeda dari yang offline" menghitung ulang feature dari input mentah lalu membandingkan: bug di pipeline serving muncul di sini, perubahan nyata di dunia tidak. Pengenal seperti deviceId bergeser setiap kali entitas baru datang.') }),
          h('h4', { text: tr('Evidence 2: score drift and delayed accuracy', 'Bukti 2: score drift dan delayed accuracy') }), stats,
          h('p', { class: 'hint', text: tr('The delayed numbers use only the labels that have arrived in the window. Accuracy is shown to remind you how little it says: with a rare outcome, it stays high while the AUC and the recall fall.', 'Angka tertunda hanya memakai label yang sudah datang di window. Accuracy ditampilkan untuk mengingatkan betapa sedikit yang dikatakannya: dengan hasil yang jarang, ia tetap tinggi sementara AUC dan recall turun.') }),
          h('h4', { text: tr('Evidence 3: slices', 'Bukti 3: slice') }));
        evidence2.append(
          tableWrap(tr('Established against new entities', 'Entitas lama dibandingkan entitas baru'), [tr('Cohort', 'Kelompok'), tr('Share of recent cases', 'Porsi kasus terbaru'), tr('Mean score', 'Rata-rata skor'), tr('Positive share (arrived labels)', 'Porsi positif (label yang datang)')], cohortRows),
          tableWrap(tr(`Where the values of ${ev.slices.feature.feature} sit now against the history (three equal-sized bins of the history)`, `Posisi nilai ${ev.slices.feature.feature} sekarang dibanding riwayat (tiga bin berukuran sama dari riwayat)`), [tr('Bin', 'Bin'), tr('Recent share', 'Porsi terbaru'), tr('History share', 'Porsi riwayat'), tr('Recent (blue) against history (grey)', 'Terbaru (biru) dibanding riwayat (abu-abu)')], binRows),
          h('p', { class: 'hint', text: tr('The bins follow the feature chosen under "Feature to inspect".', 'Bin mengikuti feature yang dipilih di "Feature yang diperiksa".') }));
        // test result
        if (S.tested && C.test) {
          const inv = C.test;
          testOut.append(
            h('p', { class: inv.confirmed ? 'cap-verdict ok' : 'cap-verdict bad', role: 'status', text: inv.confirmed
              ? tr(`Confirmed: the evidence supports ${hypothesisShort(S.hyp)}.`, `Terkonfirmasi: bukti mendukung ${hypothesisShort(S.hyp)}.`)
              : tr(`Not confirmed: the evidence does not support ${hypothesisShort(S.hyp)}.`, `Tidak terkonfirmasi: bukti tidak mendukung ${hypothesisShort(S.hyp)}.`) }),
            h('ul', {}, reasonLines(S.hyp, inv.evidence, ['skew', 'covariate'].includes(S.hyp) ? S.hypFeature : inv.evidence.suspect).map(t => h('li', { text: t }))));
        }
        if (S.wrong) testOut.append(h('p', { class: 'hint', text: tr(`Hypotheses rejected so far: ${fmt(S.wrong)}.`, `Hipotesis yang ditolak sejauh ini: ${fmt(S.wrong)}.`) }));
        // remedy
        if (S.confirmed === null) { remOut.append(h('p', { class: 'hint', text: tr('Confirm a hypothesis first.', 'Konfirmasi sebuah hipotesis dulu.') })); return; }
        const truth = C.system.truth;
        remOut.append(h('p', { class: 'cap-note', text: tr(`Confirmed: ${hypothesisShort(S.confirmed)}${S.confirmedFeature && ['skew', 'covariate'].includes(S.confirmed) ? ` (${S.confirmedFeature})` : ''}. ${whatHappened(truth)}`, `Terkonfirmasi: ${hypothesisShort(S.confirmed)}${S.confirmedFeature && ['skew', 'covariate'].includes(S.confirmed) ? ` (${S.confirmedFeature})` : ''}. ${whatHappened(truth)}`) }));
        if (!S.remedyApplied || !C.rem) return;
        const rem = C.rem, top = Math.max(...rem.options.map(o => o.total));
        const rows = rem.options.map(o => h('tr', { class: o.kind === S.remedy ? 'cap-chosen' : null }, h('th', { scope: 'row', text: remedyShort(o.kind) + (o.kind === S.remedy ? tr(' (yours)', ' (pilihanmu)') : '') + (o.kind === rem.best ? tr(' (cheapest)', ' (termurah)') : '') }),
          stack(tr('Cost to carry out', 'Biaya melaksanakan'), d0(o.fixed)), stack(tr('Days until live', 'Hari sampai aktif'), fmt(o.latencyDays)), stack(tr('Cost of the decisions', 'Biaya keputusan'), d0(o.operational)), stack(tr('Total', 'Total'), d0(o.total)),
          h('td', { 'data-label': tr('Total (bar)', 'Total (batang)'), 'aria-hidden': 'true' }, h('span', { class: 'cap-bar2', style: `width:${(o.total / top * 100).toFixed(1)}%` }))));
        remOut.append(
          tableWrap(tr(`What each remedy costs from day ${fmt(C.day)} to the end of the stream`, `Biaya tiap perbaikan dari hari ke-${fmt(C.day)} sampai akhir stream`), [tr('Remedy', 'Perbaikan'), tr('Cost to carry out', 'Biaya melaksanakan'), tr('Days until live', 'Hari sampai aktif'), tr('Cost of the decisions', 'Biaya keputusan'), tr('Total', 'Total'), tr('Total (bar)', 'Total (batang)')], rows),
          h('ul', {}, remedySentences(rem, S.remedy, S.wrong).map(t => h('li', { text: t }))));
      },
      summary: () => (S.confirmed ? `${hypothesisShort(S.confirmed)}${S.remedyApplied && S.remedy ? ` · ${remedyShort(S.remedy)}` : ''}` : ''),
    };
  }

  // ---- step 7: report ----------------------------------------------------------------------------------------------

  function step7() {
    const body = h('div');
    const textBox = h('div', { class: 'cap-text' });
    const fields = {
      splitWhy: [tr('The split and why', 'Split dan alasannya'), tr('Which split did you use, who will the model meet in use, and what did the comparison with the other splits show?', 'Split mana yang kamu pakai, siapa yang akan dihadapi model saat dipakai, dan apa yang ditunjukkan perbandingan dengan split lain?')],
      modelWhy: [tr('The model I chose and why', 'Model yang kupilih dan alasannya'), tr('Which model, with which setting, and what in the operational metric and its intervals supports it? Does it clearly beat doing nothing?', 'Model mana, dengan pengaturan apa, dan apa dari metrik operasional beserta intervalnya yang mendukungnya? Apakah ia jelas mengalahkan tidak berbuat apa-apa?')],
      monitoring: [tr('The monitoring plan', 'Rencana monitoring'), tr('Which monitors, thresholds and window, and how did you weigh false alarms against the delay?', 'Monitor, threshold, dan window apa, dan bagaimana kamu menimbang alarm palsu terhadap keterlambatan?')],
      happened: [tr('Failure investigation: what happened', 'Investigasi kegagalan: apa yang terjadi'), tr('What failed, from which day, and what did it cost before it was caught?', 'Apa yang gagal, sejak hari berapa, dan berapa biayanya sebelum tertangkap?')],
      found: [tr('Failure investigation: how I found it', 'Investigasi kegagalan: bagaimana aku menemukannya'), tr('Which evidence pointed to the cause and which ruled the other hypotheses out?', 'Bukti mana yang menunjuk penyebabnya dan mana yang menyingkirkan hipotesis lain?')],
      changed: [tr('Failure investigation: what I changed', 'Investigasi kegagalan: apa yang kuubah'), tr('Which remedy did you apply, what did it cost, and what will you monitor so it is caught sooner next time?', 'Perbaikan apa yang kamu terapkan, berapa biayanya, dan apa yang akan kamu pantau agar lebih cepat tertangkap lain kali?')],
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
    const summaryTa = h('textarea', { id: summaryId, readonly: true, rows: '18' });
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
      h('p', { text: tr('Write a few lines about your project in your own words, then rate your own work against the five criteria. Pick the level that is honestly true today. Remember that the data are synthetic: say so in your report.', 'Tulis beberapa baris tentang proyekmu dengan kata-katamu sendiri, lalu nilai pekerjaanmu terhadap lima kriteria. Pilih tingkat yang jujur benar hari ini. Ingat bahwa datanya sintetis: sebutkan itu dalam laporanmu.') }),
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
      summary: () => tr(`${fmt(TEXT_FIELDS.filter(f => S.text[f].trim()).length)} of ${fmt(TEXT_FIELDS.length)} texts, ${fmt(CRITERIA.filter(c => S.rubric[c] > 0).length)} of ${fmt(CRITERIA.length)} rated`, `${fmt(TEXT_FIELDS.filter(f => S.text[f].trim()).length)} dari ${fmt(TEXT_FIELDS.length)} teks, ${fmt(CRITERIA.filter(c => S.rubric[c] > 0).length)} dari ${fmt(CRITERIA.length)} dinilai`),
    };
  }

  function summaryInput() {
    const f = C.facts;
    const inv = S.confirmed ? { confirmed: S.confirmed, feature: S.confirmedFeature, wrong: S.wrong, remedy: S.remedyApplied ? S.remedy : null, rem: S.remedyApplied ? C.rem : null, truth: C.system.truth } : null;
    return {
      seed: scenarioSeed(), facts: f, costs: costs(), capacity: S.capacity, decision: S.decision, mode: S.mode, metric: S.metric, reasons: S.reasons,
      split: S.split, cmp: S.splitCompared ? C.cmp : null, defence: S.defence, tuned: C.tuned, picks: C.used, model: S.model,
      ev: S.scored ? C.ev : null, settings: C.settings, record: C.rec?.record ?? null, rerun: S.rerun && Boolean(C.rerunRes?.reproducible),
      changeResult: S.changed && C.changeRes && C.option ? { option: C.option, mismatches: C.changeRes.mismatches } : null,
      plan: S.plan, planEval: S.planReplayed ? C.planEval : null, planRef: S.planReplayed ? C.planRef : null, failDay: C.system.truth.day, evidenceDay: C.day,
      investigation: inv, text: S.text, rubric: CRITERIA.map(criterion => ({ criterion, level: S.rubric[criterion] })),
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

  function drawCost() {
    const c = charts.cost;
    if (!c?.canvas.isConnected) return;
    const g = setup(c.canvas);
    if (!g) return;
    const { ctx, rect, t } = g, narrow = rect.width < 420, s = c.ev.scores;
    const hi = Math.max(...MODEL_KEYS.map(m => (Number.isFinite(s[m].cost.hi) ? s[m].cost.hi : s[m].cost.estimate)));
    const x1 = Math.ceil(hi * 1.1 * 2) / 2 || 1;
    const m = { l: narrow ? 72 : 96, r: 16, t: 10, b: 30 }, W = rect.width - m.l - m.r, H = rect.height - m.t - m.b;
    const X = v => m.l + v / x1 * W;
    ctx.fillStyle = t.plot; ctx.fillRect(m.l, m.t, W, H);
    ctx.font = '11px system-ui, sans-serif'; ctx.strokeStyle = t.grid; ctx.fillStyle = t.muted; ctx.lineWidth = 1; ctx.textAlign = 'center';
    ctx.beginPath();
    const tick = x1 <= 6 ? 1 : x1 <= 12 ? 2 : 5;
    for (let v = 0; v <= x1 + 1e-9; v += tick) { ctx.moveTo(X(v), m.t); ctx.lineTo(X(v), m.t + H); ctx.fillText(fmt(v, { digits: 0 }), X(v), m.t + H + 15); }
    ctx.stroke();
    ctx.setLineDash([5, 4]); ctx.strokeStyle = t.muted; ctx.beginPath(); ctx.moveTo(X(s.baseline.cost.estimate), m.t); ctx.lineTo(X(s.baseline.cost.estimate), m.t + H); ctx.stroke(); ctx.setLineDash([]);
    const rowH = H / MODEL_KEYS.length, parts = [];
    MODEL_KEYS.forEach((k, i) => {
      const iv = s[k].cost, y = m.t + rowH * (i + 0.5), color = modelColor(k), mine = k === S.model;
      ctx.fillStyle = t.ink; ctx.font = `${mine ? 700 : 600} 12px system-ui, sans-serif`; ctx.textAlign = 'right';
      ctx.fillText(modelShort(k), m.l - 8, y + 4);
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = mine ? 4 : 2.5;
      if (Number.isFinite(iv.lo)) {
        ctx.beginPath(); ctx.moveTo(X(iv.lo), y); ctx.lineTo(X(iv.hi), y); ctx.moveTo(X(iv.lo), y - 6); ctx.lineTo(X(iv.lo), y + 6); ctx.moveTo(X(iv.hi), y - 6); ctx.lineTo(X(iv.hi), y + 6); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(X(iv.estimate), y, mine ? 6 : 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = t.ink; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(d2(iv.estimate), X(iv.estimate), y - 11);
      parts.push(`${modelName(k)}: ${intervalText(iv)}`);
    });
    c.canvas.setAttribute('aria-label', `${tr('Interval chart of the expected cost per case on the test side, estimate with the lower and upper end of the 95% interval', 'Diagram interval expected cost per kasus pada sisi test, perkiraan dengan ujung bawah dan atas interval 95%')}. ${parts.join('; ')}.`);
  }

  // A line chart of one or two daily series against dashed thresholds, with the failure day and the alert days marked.
  function lineChart(c, { series, lines, yMax, yLabel, label, rules }) {
    const g = setup(c.canvas);
    if (!g) return;
    const { ctx, rect, t } = g;
    const days = c.ev.daily.map(d => d.day), d0_ = days[0], d1 = days[days.length - 1];
    const m = { l: 44, r: 12, t: 10, b: 32 }, W = rect.width - m.l - m.r, H = rect.height - m.t - m.b;
    const X = d => m.l + (d - d0_) / (d1 - d0_) * W, Y = v => m.t + H - Math.min(1, Math.max(0, v / yMax)) * H;
    ctx.fillStyle = t.plot; ctx.fillRect(m.l, m.t, W, H);
    ctx.font = '11px system-ui, sans-serif'; ctx.strokeStyle = t.grid; ctx.fillStyle = t.muted; ctx.lineWidth = 1; ctx.textAlign = 'right';
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) { const v = yMax * i / 4; ctx.moveTo(m.l, Y(v)); ctx.lineTo(m.l + W, Y(v)); ctx.fillText(fmt(v, { digits: 2 }), m.l - 6, Y(v) + 4); }
    ctx.stroke();
    ctx.textAlign = 'center';
    const step = Math.max(5, Math.round((d1 - d0_) / 6 / 5) * 5);
    for (let d = Math.ceil(d0_ / step) * step; d <= d1; d += step) ctx.fillText(fmt(d), X(d), m.t + H + 15);
    ctx.fillText(yLabel, m.l + W / 2, m.t + H + 28);
    ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
    for (const l of lines) { ctx.strokeStyle = l.color; ctx.beginPath(); ctx.moveTo(m.l, Y(l.value)); ctx.lineTo(m.l + W, Y(l.value)); ctx.stroke(); }
    ctx.setLineDash([]);
    const fail = c.ev.daily.length ? C.system.truth.day : null;
    ctx.strokeStyle = t.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(fail), m.t); ctx.lineTo(X(fail), m.t + H); ctx.stroke();
    ctx.lineWidth = 2.5;
    for (const s of series) {
      ctx.strokeStyle = s.color; ctx.beginPath();
      let pen = false;
      for (const d of c.ev.daily) { const v = s.get(d); if (v == null || !Number.isFinite(v)) { pen = false; continue; } if (pen) ctx.lineTo(X(d.day), Y(v)); else { ctx.moveTo(X(d.day), Y(v)); pen = true; } }
      ctx.stroke();
    }
    ctx.fillStyle = t.ink;
    for (const day of [...new Set(c.ev.alerts.filter(a => rules.includes(a.rule)).map(a => a.day))]) { ctx.beginPath(); ctx.moveTo(X(day), m.t + H - 1); ctx.lineTo(X(day) - 4, m.t + H - 10); ctx.lineTo(X(day) + 4, m.t + H - 10); ctx.closePath(); ctx.fill(); }
    c.canvas.setAttribute('aria-label', label);
  }

  function drawDrift() {
    const c = charts.drift;
    if (!c?.canvas.isConnected) return;
    const P = c.plan, series = [], lines = [];
    if (P.psi.on) { series.push({ color: clusterColor(0), get: d => d.psiMax }); lines.push({ color: clusterColor(0), value: P.psi.threshold }); }
    if (P.score.on) { series.push({ color: clusterColor(1), get: d => d.scoreDrift }); lines.push({ color: clusterColor(1), value: P.score.threshold }); }
    const top = Math.max(0.3, ...c.ev.daily.map(d => Math.max(P.psi.on ? d.psiMax : 0, P.score.on ? d.scoreDrift : 0)), ...lines.map(l => l.value)) * 1.1;
    const yMax = top > 3 ? Math.ceil(top) : Math.ceil(top * 10) / 10;
    const first = c.ev.firstAlert;
    lineChart(c, { series, lines, yMax, rules: ['psi', 'score'], yLabel: tr('day', 'hari'), label: tr(`Line chart of the drift monitors by day, from day ${fmt(c.ev.daily[0].day)} to day ${fmt(c.ev.daily[c.ev.daily.length - 1].day)}. The failure began on day ${fmt(C.system.truth.day)}. ${first === null ? 'No true alert fired.' : `The first true alert fired on day ${fmt(first)}.`}`, `Diagram garis monitor drift per hari, dari hari ke-${fmt(c.ev.daily[0].day)} sampai hari ke-${fmt(c.ev.daily[c.ev.daily.length - 1].day)}. Kegagalan dimulai pada hari ke-${fmt(C.system.truth.day)}. ${first === null ? 'Tidak ada alert benar yang berbunyi.' : `Alert benar pertama berbunyi pada hari ke-${fmt(first)}.`}`) });
  }

  function drawDelayed() {
    const c = charts.delayed;
    if (!c?.canvas.isConnected || !Number.isFinite(c.ref)) return;
    const thr = c.ref - c.plan.delayed.drop;
    const lines = [{ color: clusterColor(2), value: thr }];
    lineChart(c, {
      series: [{ color: clusterColor(2), get: d => d.accuracyDelayed }], lines, yMax: 1, rules: ['delayed'], yLabel: tr('day', 'hari'),
      label: tr(`Line chart of the delayed AUC by day. The AUC before launch is ${d2(c.ref)}; the dashed line is the alert level, ${d2(thr)}. The failure began on day ${fmt(C.system.truth.day)}. A gap in the line means too few positive labels had arrived.`, `Diagram garis AUC tertunda per hari. AUC sebelum peluncuran ${d2(c.ref)}; garis putus-putus adalah level alert, ${d2(thr)}. Kegagalan dimulai pada hari ke-${fmt(C.system.truth.day)}. Garis yang terputus berarti label positif yang datang masih terlalu sedikit.`),
    });
  }
  const drawAll = () => { drawCost(); drawDrift(); drawDelayed(); };

  // ---- the quick quiz (predict first) ------------------------------------------------------------------------------

  const quiz = predictBox(lab.ref('below'), {
    hint: tr('Compare the three splits in step 2 first, then check your answer.', 'Bandingkan ketiga split di langkah 2 dulu, lalu periksa jawabanmu.'),
    name: 'predict-split',
    question: tr('After launch the model meets entities it has never seen. Which split gives an AUC closest to what the forest scores on those new entities?', 'Setelah peluncuran model bertemu entitas yang belum pernah dilihatnya. Split mana yang memberi AUC paling dekat dengan skor forest pada entitas baru itu?'),
    choices: [
      ['random', tr('Random: it uses the most data for training', 'Acak: ia memakai paling banyak data untuk training')],
      ['grouped', tr('Grouped by entity: the test side holds entities the model has not met', 'Per entitas: sisi test berisi entitas yang belum dikenal model')],
      ['temporal', tr('Temporal: the test side is the latest block of time', 'Temporal: sisi test adalah blok waktu paling akhir')],
    ],
  });
  let lastReveal = '';
  function revealQuiz() {
    if (!C?.cmp || quiz.chosen() == null) return;
    const verdict = closestSplit(C.cmp), cmp = C.cmp;
    const text = tr(`AUC on the split's test side against new entities after launch: random ${d2(cmp.random.estimate)} against ${d2(cmp.random.realised)}, grouped ${d2(cmp.grouped.estimate)} against ${d2(cmp.grouped.realised)}, temporal ${d2(cmp.temporal.estimate)} against ${d2(cmp.temporal.realised)}. A split that keeps entities apart is the only one that imitates meeting new entities; the other two let the forest recognise an entity by its device fingerprint.`,
      `AUC pada sisi test split dibanding entitas baru setelah peluncuran: acak ${d2(cmp.random.estimate)} lawan ${d2(cmp.random.realised)}, per entitas ${d2(cmp.grouped.estimate)} lawan ${d2(cmp.grouped.realised)}, temporal ${d2(cmp.temporal.estimate)} lawan ${d2(cmp.temporal.realised)}. Hanya split yang memisahkan entitas yang meniru bertemu entitas baru; dua lainnya membiarkan forest mengenali entitas dari sidik jari perangkatnya.`);
    lastReveal = `${quiz.chosen()}|${verdict}|${text}`;
    quiz.reveal(verdict, text);
  }
  quiz.onPick(revealQuiz);
  quiz.onCheck(revealQuiz);
  lab.cleanup(() => quiz.destroy());

  // ---- the stepper ------------------------------------------------------------------------------------------------

  const titles = () => [
    tr('Frame the problem', 'Rumuskan masalah'), tr('Choose and defend a split', 'Pilih dan bela sebuah split'), tr('Compare models', 'Bandingkan model'),
    tr('Record a reproducible run', 'Catat run yang dapat direproduksi'), tr('Plan the monitoring', 'Rencanakan monitoring'), tr('Investigate the failure', 'Selidiki kegagalan'), tr('Report and rate', 'Laporkan dan nilai'),
  ];
  const shorts = () => [tr('Frame', 'Rumuskan'), tr('Split', 'Split'), tr('Models', 'Model'), tr('Repro', 'Repro'), tr('Monitor', 'Monitor'), tr('Probe', 'Selidiki'), tr('Report', 'Laporan')];
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
      const headEl = steps[i].head;
      if (scroll) headEl.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      if (focus) headEl.focus({ preventScroll: true });
    }
  }

  function build() {
    for (const el of [...cap.querySelectorAll(':scope > .cap-built')]) el.remove();
    const built = [step1(), step2(), step3(), step4(), step5(), step6(), step7()];
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
      const headEl = h('button', { type: 'button', class: 'cap-head', 'aria-controls': bodyId, 'aria-expanded': 'false' }, num, title, state);
      headEl.addEventListener('click', () => {
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
      const bodyEl = h('div', { class: 'cap-body', id: bodyId, role: 'region', hidden: true }, st.body, more);
      const li = h('li', { class: 'cap-step' }, h('h3', {}, headEl), bodyEl);
      list.append(li);
      steps[i] = { st, num, name: title.firstChild, sum: title.lastChild, state, head: headEl, body: bodyEl, li, nextBtn: more?.querySelector('button'), chip };
      headEl.id = nextId('cap-h');
      bodyEl.setAttribute('aria-labelledby', headEl.id);
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
    lab.setDetail(count === STEP_COUNT ? tr('All seven steps are done. Copy your summary at the end of step 7.', 'Ketujuh langkah selesai. Salin ringkasanmu di akhir langkah 7.') : tr(`Next: step ${fmt(current + 1)}, ${t[current]}.`, `Berikutnya: langkah ${fmt(current + 1)}, ${t[current]}.`));
    renderRecap();
  }

  // Redraws everything that depends on the saved choices. Typing in a text field calls touch() instead, which
  // leaves the step bodies alone so a field never loses the focus.
  function update() {
    C = compute();
    // Results that arrive later decide two flags: the replay caught the failure, and a changed rerun really differed.
    if (S.planReplayed && C.planEval && S.planCaught !== (C.planEval.firstAlert !== null)) { S.planCaught = C.planEval.firstAlert !== null; if (!S.planCaught) S = resetFrom({ ...S }, 6); C = compute(); }
    if (S.changed && C.changeRes && !C.changeRes.mismatches.length) { S.changed = false; noEffect = S.change; }
    done = chainDone(stepDone(S));
    steps.forEach(step => step.st.render());
    renderChrome();
    revealIfAnswered();
    save();
    requestAnimationFrame(drawAll);
  }
  function revealIfAnswered() {
    if (quiz.chosen() == null || !C?.cmp) return;
    const verdict = closestSplit(C.cmp);
    if (!lastReveal.startsWith(`${quiz.chosen()}|${verdict}|`)) revealQuiz();
  }
  function touch() {
    done = chainDone(stepDone(S));
    renderChrome();
    steps[STEP_COUNT - 1]?.st.renderSummary?.();
    save();
  }

  // ---- the "Your project" card -------------------------------------------------------------------------------------

  const recap = h('div', { class: 'cap-aside' });
  const controls = lab.panel([
    { type: 'note', text: tr('The cases are synthetic: a program made them, and no real customer is behind them. Your work is saved in this browser only.', 'Kasusnya sintetis: sebuah program membuatnya, dan tidak ada pelanggan sungguhan di baliknya. Pekerjaanmu hanya tersimpan di browser ini.') },
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
      n(tr('Scenario', 'Skenario'), tr(`${fmt(S.seed)} of ${fmt(SCENARIO_SEEDS.length)} (synthetic)`, `${fmt(S.seed)} dari ${fmt(SCENARIO_SEEDS.length)} (sintetis)`)),
      n(tr('Decision', 'Keputusan'), S.decision === 'queue' && S.mode === 'batch' ? tr('daily review queue (batch)', 'antrean peninjauan harian (batch)') : ''),
      n(tr('Costs', 'Biaya'), S.costsSet ? tr(`miss ${fmt(S.miss)}, review ${fmt(S.review)}, false alarm +${fmt(S.falseAlarm)}; ${fmt(S.capacity)} reviews a day`, `terlewat ${fmt(S.miss)}, peninjauan ${fmt(S.review)}, alarm palsu +${fmt(S.falseAlarm)}; ${fmt(S.capacity)} peninjauan per hari`) : ''),
      n(tr('Split', 'Split'), S.split ? splitName(S.split) : ''),
      n(tr('Model', 'Model'), S.model ? modelName(S.model) : ''),
      n(tr('Monitoring', 'Monitoring'), S.planCaught && C.planEval ? tr(`first alert day ${fmt(C.planEval.firstAlert)}`, `alert pertama hari ke-${fmt(C.planEval.firstAlert)}`) : ''),
      n(tr('Diagnosis', 'Diagnosis'), S.confirmed ? hypothesisShort(S.confirmed) : '')));
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
    cache.clear(); memoCache.clear(); systems.clear(); noEffect = null;
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
