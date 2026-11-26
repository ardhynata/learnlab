// Pure logic behind the Level 3 capstone workbench (sims/labs/capstone-l3.js): what the lab saves, which of its seven
// steps are really done, what a change upstream resets downstream, the plain sentences the lab shows, the rubric,
// and the text of the plain-text summary. No DOM, no network, no storage. Text comes from tr() at call time, so a
// function here follows the language of the moment. Tested in capstone3report.test.js.
//
// The saved state keeps keys and numbers only, never a translated string or a score: the lab recomputes scores from
// the saved choices, so a language switch can rebuild the lab without losing work.
//
//   emptyState() / sanitizeState(raw)   the saved shape; sanitizeState accepts anything and returns a valid state.
//   emptyPlan()                         the monitoring plan the learner edits in step 5 (input drift on, the rest off).
//   resetFrom(state, step)              a NEW state in which the results that depend on step 2..6 are forgotten
//                                       (flags, tuned picks, the chosen model, the replay, the diagnosis); typed text stays.
//   stepDone(state)                     seven booleans, one per step.
//   names and sentences                 decisionLabel, splitName, optimismSentences, planSentences, reasonLines, ...
//   buildSummary(s)                     the plain-text capstone summary.
import { tr, fmt, pct, unit as unitWord } from '../../i18n.js';
import {
  SCENARIO_SEEDS, SPLIT_KEYS, TUNABLE, GRIDS, COST_RANGE, PLAN_LIMITS, HYPOTHESES, REMEDY_KINDS, CHANGE_KEYS, COMPARE_RUNS, FEATURES, SIGNAL_FEATURES,
} from './capstone3lab.js';

export const STORAGE_KEY = 'learnlab.lab.capstone-l3.v1';
export const STEP_COUNT = 7;
export const DECISIONS = ['queue', 'auto', 'report'];
export const MODES = ['batch', 'online'];
export const METRICS = ['accuracy', 'auc', 'cost'];
export const REASONS = ['rare', 'equal', 'cannot'];
export const TRUE_REASONS = ['rare', 'equal'];
export const TEXT_FIELDS = ['splitWhy', 'modelWhy', 'monitoring', 'happened', 'found', 'changed'];
export const CRITERIA = ['split', 'metric', 'repro', 'monitoring', 'failure'];
export const MAX_DEFENCE = 200;
export const MAX_TEXT = 500;

const d2 = x => (Number.isFinite(x) ? fmt(x, { digits: 2 }) : '–');
export const signed = x => `${x >= 0 ? '+' : '−'}${fmt(Math.abs(x), { digits: 2 })}`;
/** Two decimals with a true minus sign (the lab writes every negative number this way). */
export const d2m = x => (Number.isFinite(x) ? `${x < 0 ? '−' : ''}${fmt(Math.abs(x), { digits: 2 })}` : '–');

// ---- saved state -----------------------------------------------------------------------------------------------

export function emptyPlan() {
  return {
    psi: { on: true, threshold: 0.25, window: 7, features: SIGNAL_FEATURES.slice() },
    score: { on: false, threshold: 0.25, window: 7 },
    delayed: { on: false, drop: 0.1, window: 14 },
    prevalence: { on: false, ratio: 1.5, window: 14 },
    consecutive: 2,
  };
}

export function emptyState() {
  return {
    v: 1, seed: 1,
    decision: null, mode: null, miss: 100, falseAlarm: 5, review: 5, capacity: 24, costsSet: false, metric: null, reasons: [],
    split: null, splitCompared: false, defence: '',
    searched: { logistic: false, forest: false }, picks: { logistic: null, forest: null }, scored: false, model: null,
    recorded: false, rerun: false, change: 'model', changed: false,
    plan: emptyPlan(), planReplayed: false, planCaught: false,
    hyp: null, hypFeature: FEATURES[0], tested: false, confirmed: null, confirmedFeature: null, wrong: 0, wrongTried: [], remedy: null, remedyApplied: false,
    text: Object.fromEntries(TEXT_FIELDS.map(f => [f, ''])),
    rubric: Object.fromEntries(CRITERIA.map(c => [c, 0])),
    open: 0,
  };
}

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const int = (v, lo, hi, fallback) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fallback);
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const snap = (v, { min, max, step }, fallback) => {
  if (!Number.isFinite(v)) return fallback;
  const k = Math.round((Math.min(max, Math.max(min, v)) - min) / step);
  return Math.round((min + k * step) * 1e6) / 1e6;
};

/** The key of one tested guess: the hypothesis, plus the feature when the hypothesis is about one feature. */
export const tryKey = (hyp, feature) => (['skew', 'covariate'].includes(hyp) ? `${hyp}:${feature}` : hyp);
const validTryKey = k => {
  if (typeof k !== 'string') return false;
  const [hyp, feature, extra] = k.split(':');
  return extra === undefined && HYPOTHESES.includes(hyp) && (feature === undefined ? !['skew', 'covariate'].includes(hyp) : ['skew', 'covariate'].includes(hyp) && FEATURES.includes(feature));
};

export function sanitizePlan(raw) {
  const p = emptyPlan();
  if (!isObj(raw)) return p;
  const L = PLAN_LIMITS;
  for (const k of ['psi', 'score', 'delayed', 'prevalence']) if (isObj(raw[k])) p[k].on = raw[k].on === true;
  if (isObj(raw.psi)) {
    p.psi.threshold = snap(raw.psi.threshold, L.psi.threshold, 0.25); p.psi.window = snap(raw.psi.window, L.psi.window, 7);
    if (Array.isArray(raw.psi.features)) p.psi.features = FEATURES.filter(x => raw.psi.features.includes(x));
  }
  if (isObj(raw.score)) { p.score.threshold = snap(raw.score.threshold, L.score.threshold, 0.25); p.score.window = snap(raw.score.window, L.score.window, 7); }
  if (isObj(raw.delayed)) { p.delayed.drop = snap(raw.delayed.drop, L.delayed.drop, 0.1); p.delayed.window = snap(raw.delayed.window, L.delayed.window, 14); }
  if (isObj(raw.prevalence)) { p.prevalence.ratio = snap(raw.prevalence.ratio, L.prevalence.ratio, 1.5); p.prevalence.window = snap(raw.prevalence.window, L.prevalence.window, 14); }
  p.consecutive = snap(raw.consecutive, L.consecutive, 2);
  return p;
}

export function sanitizeState(raw) {
  const s = emptyState();
  if (!isObj(raw)) return s;
  s.seed = int(raw.seed, 1, SCENARIO_SEEDS.length, 1);
  if (DECISIONS.includes(raw.decision)) s.decision = raw.decision;
  if (MODES.includes(raw.mode)) s.mode = raw.mode;
  for (const k of ['miss', 'falseAlarm', 'review', 'capacity']) s[k] = int(raw[k], COST_RANGE[k].min, COST_RANGE[k].max, s[k]);
  s.costsSet = raw.costsSet === true;
  if (METRICS.includes(raw.metric)) s.metric = raw.metric;
  if (Array.isArray(raw.reasons)) s.reasons = REASONS.filter(r => raw.reasons.includes(r));
  if (SPLIT_KEYS.includes(raw.split)) s.split = raw.split;
  s.splitCompared = raw.splitCompared === true && s.split !== null;
  s.defence = str(raw.defence, MAX_DEFENCE);
  if (isObj(raw.searched)) for (const m of TUNABLE) s.searched[m] = raw.searched[m] === true;
  if (isObj(raw.picks)) for (const m of TUNABLE) if (GRIDS[m].values.includes(raw.picks[m])) s.picks[m] = raw.picks[m];
  s.scored = raw.scored === true && TUNABLE.every(m => s.searched[m]);
  if (TUNABLE.includes(raw.model) && s.scored) s.model = raw.model;
  s.recorded = raw.recorded === true && s.model !== null;
  s.rerun = raw.rerun === true && s.recorded;
  if (CHANGE_KEYS.includes(raw.change)) s.change = raw.change;
  s.changed = raw.changed === true && s.rerun;
  s.plan = sanitizePlan(raw.plan);
  s.planReplayed = raw.planReplayed === true;
  s.planCaught = raw.planCaught === true && s.planReplayed;
  if (HYPOTHESES.includes(raw.hyp)) s.hyp = raw.hyp;
  if (FEATURES.includes(raw.hypFeature)) s.hypFeature = raw.hypFeature;
  s.tested = raw.tested === true && s.hyp !== null;
  if (HYPOTHESES.includes(raw.confirmed) && s.planCaught) s.confirmed = raw.confirmed;
  if (s.confirmed !== null && FEATURES.includes(raw.confirmedFeature)) s.confirmedFeature = raw.confirmedFeature;
  if (Array.isArray(raw.wrongTried)) {
    s.wrongTried = [...new Set(raw.wrongTried.filter(validTryKey))].slice(0, 99);
    s.wrong = s.wrongTried.length;
  } else s.wrong = int(raw.wrong, 0, 99, 0);
  if (REMEDY_KINDS.includes(raw.remedy)) s.remedy = raw.remedy;
  s.remedyApplied = raw.remedyApplied === true && s.confirmed !== null && s.remedy !== null;
  if (isObj(raw.text)) for (const f of TEXT_FIELDS) s.text[f] = str(raw.text[f], MAX_TEXT);
  if (isObj(raw.rubric)) for (const c of CRITERIA) s.rubric[c] = int(raw.rubric[c], 0, 3, 0);
  s.open = int(raw.open, 0, STEP_COUNT - 1, 0);
  return s;
}

/**
 * Forgets what depends on step `step` (2 to 6) and everything after it: a different scenario (2) makes every later
 * result stale, a different split (3) the models, a different model (4) the recorded run, a different plan (6) the
 * investigation. Typed text and the rubric stay.
 */
export function resetFrom(state, step) {
  const s = { ...state, wrongTried: [...(state.wrongTried ?? [])], searched: { ...state.searched }, picks: { ...state.picks }, text: { ...state.text }, rubric: { ...state.rubric }, plan: JSON.parse(JSON.stringify(state.plan)) };
  if (step <= 2) s.splitCompared = false;
  if (step <= 3) { s.searched = { logistic: false, forest: false }; s.picks = { logistic: null, forest: null }; s.scored = false; s.model = null; }
  if (step <= 4) { s.recorded = false; s.rerun = false; s.changed = false; }
  if (step <= 5) { s.planReplayed = false; s.planCaught = false; }
  if (step <= 6) { s.hyp = null; s.tested = false; s.confirmed = null; s.confirmedFeature = null; s.wrong = 0; s.wrongTried = []; s.remedy = null; s.remedyApplied = false; }
  return s;
}

export const reasonsRight = reasons => TRUE_REASONS.every(r => reasons.includes(r)) && reasons.every(r => TRUE_REASONS.includes(r));

/** Seven booleans: is each step really done. */
export function stepDone(s) {
  const texts = TEXT_FIELDS.every(f => s.text[f].trim().length > 0);
  const rated = CRITERIA.every(c => s.rubric[c] >= 1);
  return [
    s.decision === 'queue' && s.mode === 'batch' && s.costsSet && s.metric === 'cost' && reasonsRight(s.reasons),
    s.split !== null && s.splitCompared && s.defence.trim().length > 0,
    TUNABLE.every(m => s.searched[m]) && s.scored && s.model !== null,
    s.recorded && s.rerun && s.changed,
    s.planReplayed && s.planCaught,
    s.confirmed !== null && s.remedyApplied,
    texts && rated,
  ];
}

/**
 * The steps the learner has really reached: a step counts only when every step before it is done too, so a step whose
 * results were reset upstream (a new scenario) never shows a tick while it is locked.
 */
export const chainDone = raw => raw.map((d, i) => d && raw.slice(0, i).every(Boolean));

/** The monitoring plan has at least one monitor, and input drift watches at least one feature. */
export const planValid = plan => (plan.psi.on || plan.score.on || plan.delayed.on || plan.prevalence.on) && (!plan.psi.on || plan.psi.features.length > 0);

// ---- step 1: frame -----------------------------------------------------------------------------------------------

export function decisionLabel(key) {
  switch (key) {
    case 'queue': return tr('Choose which of the day\'s cases a person reviews, within the review capacity', 'Memilih kasus hari itu yang ditinjau seseorang, sebatas kapasitas peninjauan');
    case 'auto': return tr('Block a case automatically, with nobody looking at it', 'Memblokir sebuah kasus secara otomatis, tanpa ada yang melihatnya');
    case 'report': return tr('Report the overall rate of positives to management', 'Melaporkan tingkat positif secara keseluruhan kepada manajemen');
    default: return '';
  }
}

export function decisionFeedback(key) {
  switch (key) {
    case 'queue': return tr('Yes. A flagged case costs a review, and a team can only review so many cases a day: the model ranks the cases and the capacity cuts the list.', 'Benar. Kasus yang ditandai berbiaya satu peninjauan, dan sebuah tim hanya dapat meninjau sejumlah kasus per hari: model mengurutkan kasus dan kapasitas memotong daftarnya.');
    case 'auto': return tr('Not here. The cost table has a review cost and the system has a review capacity: a person looks at the cases the model flags. A blocking system would also need a cost for blocking a good customer.', 'Bukan di sini. Tabel biaya punya biaya peninjauan dan sistemnya punya kapasitas peninjauan: seseorang melihat kasus yang ditandai model. Sistem pemblokiran juga membutuhkan biaya untuk memblokir pelanggan yang baik.');
    case 'report': return tr('No. A rate needs no score per case. The model exists to decide which single cases deserve a look.', 'Bukan. Sebuah tingkat tidak membutuhkan skor per kasus. Model ada untuk menentukan kasus tunggal mana yang layak dilihat.');
    default: return '';
  }
}

export function modeLabel(key) {
  return key === 'batch'
    ? tr('Batch: score all of a day\'s cases together, once a day', 'Batch: menilai semua kasus satu hari sekaligus, sekali sehari')
    : key === 'online' ? tr('Online: score each case the moment it arrives', 'Online: menilai setiap kasus saat itu juga ketika datang') : '';
}

export function modeFeedback(key, facts) {
  if (key === 'batch') {
    return tr(`Yes. The day's cases arrive together, the model scores them and the top ones go to the review queue. The outcomes come back ${fmt(facts.labelDelay)} days later, so accuracy is known late: step 5 has to watch more than accuracy.`,
      `Benar. Kasus satu hari datang bersama, model menilainya dan yang teratas masuk antrean peninjauan. Hasil sebenarnya baru kembali ${fmt(facts.labelDelay)} hari kemudian, sehingga accuracy baru diketahui terlambat: langkah 5 harus memantau lebih dari sekadar accuracy.`);
  }
  return key === 'online'
    ? tr('Not here. An online model answers one case in milliseconds and cannot rank a whole day against the review capacity. This system scores a batch each day. (An online system adds its own risk: the features must be computed live exactly as in training.)',
      'Bukan di sini. Model online menjawab satu kasus dalam milidetik dan tidak dapat mengurutkan satu hari penuh terhadap kapasitas peninjauan. Sistem ini menilai satu batch tiap hari. (Sistem online punya risiko sendiri: feature harus dihitung secara langsung dengan cara yang persis sama seperti saat training.)')
    : '';
}

export function metricLabel(key) {
  switch (key) {
    case 'accuracy': return tr('Accuracy: the share of cases classified correctly', 'Accuracy: persentase kasus yang diklasifikasikan dengan benar');
    case 'auc': return tr('AUC: how well the scores rank positives above negatives', 'AUC: seberapa baik skor mengurutkan positif di atas negatif');
    case 'cost': return tr('Expected cost per case of the cases you flag, within the review capacity', 'Expected cost per kasus dari kasus yang kamu tandai, dalam batas kapasitas peninjauan');
    default: return '';
  }
}

export function metricFeedback(key, facts) {
  switch (key) {
    case 'accuracy': return tr(`No. Flagging nothing is ${pct(facts.accuracyNever, 1)} accurate here and misses every positive.`, `Bukan. Tidak menandai apa pun akurat ${pct(facts.accuracyNever, 1)} di sini dan melewatkan setiap positif.`);
    case 'auc': return tr('AUC is a good way to rank models while you build them, but it ignores the costs and the capacity. Two models with the same AUC can cost very different amounts. Keep it as a second view.', 'AUC cocok untuk mengurutkan model selama membangunnya, tetapi mengabaikan biaya dan kapasitas. Dua model dengan AUC yang sama dapat berbiaya sangat berbeda. Simpan sebagai tampilan kedua.');
    case 'cost': return tr('Yes. It prices what the decision really does: a review for each flagged case, a false-alarm cost for the wrong ones, a miss cost for the positives left. Steps 3 to 6 use it, with AUC as a second view.', 'Benar. Metrik ini memberi harga pada apa yang sebenarnya dilakukan keputusan: satu peninjauan untuk tiap kasus yang ditandai, biaya alarm palsu untuk yang salah, biaya terlewat untuk positif yang tertinggal. Langkah 3 sampai 6 memakainya, dengan AUC sebagai tampilan kedua.');
    default: return '';
  }
}

export function reasonLabel(key) {
  switch (key) {
    case 'rare': return tr('Positives are rare, so a model that flags nothing is almost always right', 'Kasus positif jarang, sehingga model yang tidak menandai apa pun hampir selalu benar');
    case 'equal': return tr('Accuracy counts a missed positive and a false alarm as equally bad, but a miss costs far more', 'Accuracy menganggap positif yang terlewat dan alarm palsu sama buruknya, padahal biaya terlewat jauh lebih besar');
    case 'cannot': return tr('Accuracy cannot be computed for a model that scores a batch of cases', 'Accuracy tidak dapat dihitung untuk model yang menilai satu batch kasus');
    default: return '';
  }
}

export function reasonFeedback(key, ticked) {
  const right = key !== 'cannot';
  if (right) return ticked ? tr('Correct, this is a reason.', 'Benar, ini salah satu alasannya.') : tr('This one is true: tick it.', 'Ini benar: centang.');
  return ticked ? tr('Not a reason: accuracy is easy to compute for any scores that are turned into decisions.', 'Bukan alasan: accuracy mudah dihitung untuk skor apa pun yang diubah menjadi keputusan.') : tr('Correct to leave it unticked.', 'Tepat tidak dicentang.');
}

export function thresholdRule(costs, capacity, perDay, threshold) {
  return tr(
    `A case with probability p of being positive costs ${fmt(costs.review)} + (1 − p) × ${fmt(costs.falseAlarm)} when you flag it, and p × ${fmt(costs.miss)} when you leave it. Flag it when p reaches (${fmt(costs.review)} + ${fmt(costs.falseAlarm)}) / (${fmt(costs.miss)} + ${fmt(costs.falseAlarm)}) = ${pct(threshold)}. At most ${fmt(capacity)} of the ${fmt(perDay)} cases each day can be reviewed: the highest-scored cases first.`,
    `Kasus dengan probabilitas positif p berbiaya ${fmt(costs.review)} + (1 − p) × ${fmt(costs.falseAlarm)} jika ditandai, dan p × ${fmt(costs.miss)} jika dibiarkan. Tandai kasus itu bila p mencapai (${fmt(costs.review)} + ${fmt(costs.falseAlarm)}) / (${fmt(costs.miss)} + ${fmt(costs.falseAlarm)}) = ${pct(threshold)}. Paling banyak ${fmt(capacity)} dari ${fmt(perDay)} kasus per hari dapat ditinjau: kasus dengan skor tertinggi lebih dulu.`);
}

export function neverFlagSentence(facts) {
  return tr(
    `A model that never flags anything is ${pct(facts.accuracyNever, 1)} accurate on this history (${pct(facts.rate, 1)} of the ${fmt(facts.n)} cases are positive) and misses all ${fmt(facts.positives)} positives: it costs ${d2(facts.costNoneEach)} per case. Flagging everything costs ${d2(facts.costAllEach)} per case. A model has to beat both at this price.`,
    `Model yang tidak pernah menandai apa pun akurat ${pct(facts.accuracyNever, 1)} pada riwayat ini (${pct(facts.rate, 1)} dari ${fmt(facts.n)} kasus adalah positif) dan melewatkan seluruh ${fmt(facts.positives)} positif: biayanya ${d2(facts.costNoneEach)} per kasus. Menandai semuanya berbiaya ${d2(facts.costAllEach)} per kasus. Model harus mengalahkan keduanya pada harga ini.`);
}

// ---- step 2: split -----------------------------------------------------------------------------------------------

export function splitName(key, short = false) {
  switch (key) {
    case 'random': return short ? tr('random', 'acak') : tr('Random', 'Acak');
    case 'grouped': return short ? tr('grouped', 'per entitas') : tr('Grouped by entity', 'Per entitas');
    case 'temporal': return short ? tr('temporal', 'temporal') : tr('Temporal', 'Temporal');
    default: return '';
  }
}

export function splitDescription(key) {
  switch (key) {
    case 'random': return tr('Cases are dealt out at random: the same entity (a customer, an account) is on both sides.', 'Kasus dibagi secara acak: entitas yang sama (pelanggan, akun) ada di kedua sisi.');
    case 'grouped': return tr('An entity is only ever on one side: the test side holds entities the model has never met.', 'Sebuah entitas hanya ada di satu sisi: sisi test berisi entitas yang belum pernah dikenal model.');
    case 'temporal': return tr('Train on the earlier days, test on the later days: no future in training, but the same entities.', 'Training pada hari-hari awal, test pada hari-hari akhir: tidak ada masa depan di training, tetapi entitasnya sama.');
    default: return '';
  }
}

export function closestSplit(cmp) {
  return SPLIT_KEYS.reduce((a, b) => (Math.abs(cmp[b].optimism) < Math.abs(cmp[a].optimism) ? b : a));
}

/** How far a split's AUC sits from the new-entity AUC, in words: "overstates by 0.05" or "reads 0.02 below it". */
export function gapWords(optimism, withIt = true) {
  const a = d2(Math.abs(optimism));
  return optimism >= 0
    ? tr(`overstates${withIt ? ' it' : ''} by ${a}`, `melebih-lebihkan${withIt ? 'nya' : ''} sebesar ${a}`)
    : tr(`reads${withIt ? ' it' : ''} ${a} too low`, `membaca${withIt ? 'nya' : ''} ${a} terlalu rendah`);
}

/** The short step-2 summary of a split's gap. */
export function gapSummary(optimism) {
  const a = d2(Math.abs(optimism));
  return optimism >= 0 ? tr(`flatters by ${a} AUC`, `memuji ${a} AUC`) : tr(`reads ${a} AUC below the new-entity result`, `membaca ${a} AUC di bawah hasil entitas baru`);
}

export function optimismSentences(cmp, chosen) {
  const mine = cmp[chosen], best = closestSplit(cmp), out = [];
  out.push(tr(
    `Your split (${splitName(chosen, true)}) reads an AUC of ${d2(mine.estimate)} on its test side. The same model scores ${d2(mine.realised)} on the cases of new entities after launch, before anything failed. Your split ${gapWords(mine.optimism)}.`,
    `Splitmu (${splitName(chosen, true)}) membaca AUC ${d2(mine.estimate)} pada sisi test-nya. Model yang sama mendapat ${d2(mine.realised)} pada kasus entitas baru setelah peluncuran, sebelum ada yang gagal. Splitmu ${gapWords(mine.optimism)}.`));
  if (chosen === best) {
    out.push(tr(`Of the three splits, yours is the closest to what happens after launch (${d2(Math.abs(mine.optimism))} apart).`, `Dari ketiga split, splitmu yang paling dekat dengan yang terjadi setelah peluncuran (selisih ${d2(Math.abs(mine.optimism))}).`));
  } else {
    out.push(tr(`The ${splitName(best, true)} split is closer to reality: it ${gapWords(cmp[best].optimism, false)}, yours ${gapWords(mine.optimism, false)}. Forty percent of the entities first appear after launch, so only a split that keeps entities apart imitates that day.`,
      `Split ${splitName(best, true)} lebih dekat ke kenyataan: ${gapWords(cmp[best].optimism, false)}, splitmu ${gapWords(mine.optimism, false)}. Empat puluh persen entitas baru muncul setelah peluncuran, sehingga hanya split yang memisahkan entitas yang meniru hari itu.`));
  }
  return out;
}

export function sharedSentence(cmp) {
  return tr(
    `Entities on both sides: random ${fmt(cmp.random.sharedEntities, { digits: 0 })}, grouped ${fmt(cmp.grouped.sharedEntities, { digits: 0 })}, temporal ${fmt(cmp.temporal.sharedEntities, { digits: 0 })}. A temporal split removes the future from training but not the entities. Random and grouped are repeated ${fmt(COMPARE_RUNS)} times and averaged because the positives are few and one run is noisy.`,
    `Entitas di kedua sisi: acak ${fmt(cmp.random.sharedEntities, { digits: 0 })}, per entitas ${fmt(cmp.grouped.sharedEntities, { digits: 0 })}, temporal ${fmt(cmp.temporal.sharedEntities, { digits: 0 })}. Split temporal menghilangkan masa depan dari training tetapi tidak menghilangkan entitasnya. Split acak dan per entitas diulang ${fmt(COMPARE_RUNS)} kali lalu dirata-rata karena positifnya sedikit dan satu kali jalan terlalu berisik.`);
}

// ---- step 3: models ----------------------------------------------------------------------------------------------

export function modelName(key) {
  switch (key) {
    case 'baseline': return tr('Baseline', 'Baseline');
    case 'logistic': return tr('Logistic regression', 'Regresi logistik');
    case 'forest': return tr('Random forest', 'Random forest');
    default: return '';
  }
}

export const modelShort = m => (m === 'baseline' ? tr('Baseline', 'Baseline') : m === 'logistic' ? tr('Logistic', 'Logistik') : tr('Forest', 'Forest'));
export const settingName = model => (model === 'logistic' ? tr('Penalty strength (L2)', 'Kekuatan penalti (L2)') : model === 'forest' ? tr('Maximum depth of each tree', 'Kedalaman maksimum tiap tree') : '');
export const settingShort = model => (model === 'logistic' ? tr('L2 penalty', 'Penalti L2') : model === 'forest' ? tr('max depth', 'kedalaman maks') : '');
export const valueText = value => (value == null ? '–' : fmt(value));

export function searchSentence(model, tuned, used) {
  const best = tuned.results.find(r => r.value === tuned.best);
  if (tuned.spread < 0.02) {
    return tr(`The setting hardly matters here: the best and the worst value are only ${d2(tuned.spread)} AUC apart, so the first of the tied values wins (${settingShort(model)} ${valueText(tuned.best)}).`,
      `Pengaturan ini hampir tidak berpengaruh di sini: nilai terbaik dan terburuk hanya berbeda ${d2(tuned.spread)} AUC, sehingga nilai pertama dari yang seri yang menang (${settingShort(model)} ${valueText(tuned.best)}).`);
  }
  return tr(`${settingShort(model)} ${valueText(tuned.best)} scores best on the validation folds (AUC ${d2(best.mean)}); the best and the worst value are ${d2(tuned.spread)} apart. ${used === tuned.best ? 'You use the best one.' : `You use ${valueText(used)} instead.`}`,
    `${settingShort(model)} ${valueText(tuned.best)} paling baik pada fold validasi (AUC ${d2(best.mean)}); nilai terbaik dan terburuk berbeda ${d2(tuned.spread)}. ${used === tuned.best ? 'Kamu memakai yang terbaik.' : `Kamu memakai ${valueText(used)}.`}`);
}

export function intervalText(iv) {
  if (!iv || !Number.isFinite(iv.estimate)) return '–';
  return Number.isFinite(iv.lo) ? `${d2(iv.estimate)} (${d2(iv.lo)} – ${d2(iv.hi)})` : d2(iv.estimate);
}

export function diffSentence(label, diff) {
  if (!diff || !Number.isFinite(diff.lo)) return '';
  const range = `${signed(diff.lo)} – ${signed(diff.hi)}`;
  if (diff.hi < 0) return tr(`${label}: the cost difference is ${signed(diff.estimate)} per case (95% interval ${range}): cheaper, and the interval stays below 0.`, `${label}: selisih biayanya ${signed(diff.estimate)} per kasus (interval 95% ${range}): lebih murah, dan intervalnya tetap di bawah 0.`);
  if (diff.lo > 0) return tr(`${label}: the cost difference is ${signed(diff.estimate)} per case (95% interval ${range}): dearer, and the interval stays above 0.`, `${label}: selisih biayanya ${signed(diff.estimate)} per kasus (interval 95% ${range}): lebih mahal, dan intervalnya tetap di atas 0.`);
  return tr(`${label}: the cost difference is ${signed(diff.estimate)} per case (95% interval ${range}), and the interval includes 0: these test cases cannot say which is cheaper.`, `${label}: selisih biayanya ${signed(diff.estimate)} per kasus (interval 95% ${range}), dan intervalnya mencakup 0: kasus test ini belum dapat menyatakan mana yang lebih murah.`);
}

export function candidateSentences(ev) {
  const pos = ev.labels.reduce((a, b) => a + b, 0);
  return [
    tr(`Test side: ${fmt(ev.nTest)} cases, ${fmt(pos)} positive, and a review capacity of ${fmt(ev.capacityTest)} flagged cases (your daily capacity scaled to the size of the test side). Each cell reads: estimate (lower – upper end of the 95% bootstrap interval).`,
      `Sisi test: ${fmt(ev.nTest)} kasus, ${fmt(pos)} positif, dan kapasitas peninjauan ${fmt(ev.capacityTest)} kasus yang ditandai (kapasitas harianmu disesuaikan dengan ukuran sisi test). Tiap sel berbunyi: perkiraan (ujung bawah – ujung atas interval bootstrap 95%).`),
    diffSentence(tr('Logistic regression against the baseline', 'Regresi logistik dibandingkan baseline'), ev.diffs.logistic),
    diffSentence(tr('Random forest against the baseline', 'Random forest dibandingkan baseline'), ev.diffs.forest),
    diffSentence(tr('Random forest against logistic regression', 'Random forest dibandingkan regresi logistik'), ev.diffs.forestVsLogistic),
  ].filter(Boolean);
}

// ---- step 4: reproducibility -------------------------------------------------------------------------------------

export function fieldLabel(field) {
  switch (field) {
    case 'split': return tr('split fingerprint', 'sidik jari split');
    case 'auc': return 'AUC';
    case 'averagePrecision': return tr('average precision', 'average precision');
    case 'expectedCost': return tr('expected cost', 'expected cost');
    case 'totalCost': return tr('total cost', 'total biaya');
    case 'flagged': return tr('cases flagged', 'kasus ditandai');
    case 'precision': return tr('precision', 'precision');
    case 'recall': return tr('recall', 'recall');
    case 'threshold': return tr('threshold', 'threshold');
    default: return field;
  }
}

export function changeLabel(key) {
  switch (key) {
    case 'model': return tr('The model (the other one)', 'Modelnya (yang satunya)');
    case 'split': return tr('The split (the next kind)', 'Splitnya (jenis berikutnya)');
    case 'fraction': return tr('The test fraction (25% to 20%)', 'Fraksi test (25% menjadi 20%)');
    case 'miss': return tr('The cost of a miss (+10)', 'Biaya terlewat (+10)');
    case 'capacity': return tr('The daily review capacity (+4)', 'Kapasitas peninjauan harian (+4)');
    case 'setting': return tr('The tuned setting of the model', 'Pengaturan hasil tuning model');
    default: return '';
  }
}

export function changeField(field) {
  switch (field) {
    case 'model': return tr('the model', 'model');
    case 'split': return tr('the split', 'split');
    case 'testFraction': return tr('the test fraction', 'fraksi test');
    case 'miss': return tr('the cost of a miss', 'biaya terlewat');
    case 'capacity': return tr('the review capacity', 'kapasitas peninjauan');
    case 'maxDepth': return tr('the maximum depth', 'kedalaman maksimum');
    case 'l2': return tr('the L2 penalty', 'penalti L2');
    default: return field;
  }
}

export function valueShown(field, v) {
  if (field === 'model') return modelName(v);
  if (field === 'split') return splitName(v, true);
  if (field === 'testFraction') return pct(v, 0);
  return fmt(v);
}

export function settingLines(settings, seed) {
  const fit = settings.model === 'forest' ? `${settingShort('forest')} ${fmt(settings.fitOpts.maxDepth)}` : `${settingShort('logistic')} ${fmt(settings.fitOpts.l2)}`;
  return [
    [tr('Scenario seed', 'Seed skenario'), fmt(seed)],
    [tr('Split', 'Split'), `${splitName(settings.splitKind)}, ${tr('test fraction', 'fraksi test')} ${pct(settings.testFraction, 0)}`],
    [tr('Model', 'Model'), `${modelName(settings.model)}, ${fit}`],
    [tr('Costs', 'Biaya'), tr(`miss ${fmt(settings.costs.miss)}, false alarm ${fmt(settings.costs.falseAlarm)}, review ${fmt(settings.costs.review)}`, `terlewat ${fmt(settings.costs.miss)}, alarm palsu ${fmt(settings.costs.falseAlarm)}, peninjauan ${fmt(settings.costs.review)}`)],
    [tr('Review capacity', 'Kapasitas peninjauan'), tr(`${fmt(settings.system.capacity)} cases a day`, `${fmt(settings.system.capacity)} kasus per hari`)],
  ];
}

// ---- step 5: monitoring plan -------------------------------------------------------------------------------------

export function featureLabel(f) {
  switch (f) {
    case 'amount': return tr('amount', 'amount');
    case 'velocity': return tr('velocity', 'velocity');
    case 'merchantRisk': return tr('merchantRisk', 'merchantRisk');
    case 'accountAge': return tr('accountAge', 'accountAge');
    case 'deviceId': return tr('deviceId (an identifier)', 'deviceId (sebuah pengenal)');
    default: return f;
  }
}

export function planSummary(plan) {
  const parts = [];
  if (plan.psi.on) parts.push(tr(`input drift on ${fmt(plan.psi.features.length)} features (PSI above ${d2(plan.psi.threshold)}, ${fmt(plan.psi.window)} days)`, `input drift pada ${fmt(plan.psi.features.length)} feature (PSI di atas ${d2(plan.psi.threshold)}, ${fmt(plan.psi.window)} hari)`));
  if (plan.score.on) parts.push(tr(`score drift (PSI above ${d2(plan.score.threshold)}, ${fmt(plan.score.window)} days)`, `score drift (PSI di atas ${d2(plan.score.threshold)}, ${fmt(plan.score.window)} hari)`));
  if (plan.delayed.on) parts.push(tr(`delayed accuracy (AUC drop above ${d2(plan.delayed.drop)}, ${fmt(plan.delayed.window)} days)`, `delayed accuracy (penurunan AUC di atas ${d2(plan.delayed.drop)}, ${fmt(plan.delayed.window)} hari)`));
  if (plan.prevalence.on) parts.push(tr(`positive share (more than ${fmt(plan.prevalence.ratio, { digits: 1 })} times the history, ${fmt(plan.prevalence.window)} days)`, `porsi positif (lebih dari ${fmt(plan.prevalence.ratio, { digits: 1 })} kali riwayat, ${fmt(plan.prevalence.window)} hari)`));
  if (!parts.length) return tr('no monitor', 'tidak ada monitor');
  return tr(`${parts.join('; ')}; alert after ${fmt(plan.consecutive)} days in a row`, `${parts.join('; ')}; alert setelah ${fmt(plan.consecutive)} hari berturut-turut`);
}

export function ruleLabel(rule) {
  switch (rule) {
    case 'psi': return tr('input drift', 'input drift');
    case 'score': return tr('score drift', 'score drift');
    case 'delayed': return tr('delayed accuracy', 'delayed accuracy');
    case 'prevalence': return tr('positive share', 'porsi positif');
    default: return rule;
  }
}

/**
 * Each monitor's first TRUE alert: the first day from the failure day on. A monitor that false-alarmed before the
 * failure is not credited with that day. Reads ev.alerts when the evaluation has them, else ev.byRule.
 */
export function trueByRule(ev, failDay) {
  const out = {};
  if (Array.isArray(ev.alerts)) {
    for (const a of ev.alerts) if (a.day >= failDay && (out[a.rule] == null || a.day < out[a.rule])) out[a.rule] = a.day;
  } else for (const [r, d] of Object.entries(ev.byRule ?? {})) if (d !== null && d >= failDay) out[r] = d;
  return out;
}

/** The monitors that raised an alert before the failure (the false alarms), with each one's first such day. */
export function falseAlarmRules(ev, failDay) {
  const out = {};
  if (Array.isArray(ev.alerts)) for (const a of ev.alerts) if (a.day < failDay && (out[a.rule] == null || a.day < out[a.rule])) out[a.rule] = a.day;
  return out;
}

export function firstRuleText(byRule) {
  const hits = Object.entries(byRule).filter(([, d]) => d != null).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
  if (!hits.length) return '';
  return hits.map(([r, d]) => `${ruleLabel(r)}: ${tr('day', 'hari')} ${fmt(d)}`).join(', ');
}

export function planSentences(ev, ref, failDay, unit = 50) {
  const out = [];
  out.push(tr(`The failure began on day ${fmt(failDay)}.`, `Kegagalan dimulai pada hari ke-${fmt(failDay)}.`));
  if (ev.firstAlert === null) {
    out.push(tr(`Your plan never raised a true alert before the stream ended: the failure ran for ${fmt(ev.daily.length - (failDay - ev.daily[0].day))} days unseen. A monitor you do not have cannot ring. Add a monitor or loosen a threshold, then replay again.`,
      `Plan-mu tidak pernah memunculkan alert yang benar sampai stream berakhir: kegagalan berjalan ${fmt(ev.daily.length - (failDay - ev.daily[0].day))} hari tanpa terlihat. Monitor yang tidak kamu pasang tidak dapat berbunyi. Tambahkan monitor atau longgarkan threshold, lalu putar ulang.`));
  } else {
    out.push(tr(`The first true alert fired on day ${fmt(ev.firstAlert)}, ${fmt(ev.detectionDelay)} days after the failure began. By monitor: ${firstRuleText(trueByRule(ev, failDay))}.`,
      `Alert benar pertama berbunyi pada hari ke-${fmt(ev.firstAlert)}, ${fmt(ev.detectionDelay)} hari setelah kegagalan dimulai. Menurut monitor: ${firstRuleText(trueByRule(ev, failDay))}.`));
  }
  const fa = firstRuleText(falseAlarmRules(ev, failDay));
  out.push(tr(`False alarms: ${fmt(ev.falseAlarmDays)} ${unitWord(ev.falseAlarmDays, 'day', 'hari')} with an alert before the failure${fa ? ` (first by monitor: ${fa})` : ''}, ${fmt(ev.alarmCost)} in investigation cost (${fmt(unit)} each).`, `Alarm palsu: ${fmt(ev.falseAlarmDays)} hari dengan alert sebelum kegagalan${fa ? ` (pertama menurut monitor: ${fa})` : ''}, biaya penyelidikan ${fmt(ev.alarmCost)} (${fmt(unit)} per hari).`));
  out.push(tr(`Cost until detection: ${fmt(ev.costUntilDetection, { digits: 0 })} (the extra cost of the bad decisions, day by day, until the alert). Total with the false alarms: ${fmt(ev.totalCost, { digits: 0 })}.`,
    `Biaya sampai terdeteksi: ${fmt(ev.costUntilDetection, { digits: 0 })} (biaya tambahan akibat keputusan yang buruk, hari demi hari, sampai alert). Total dengan alarm palsu: ${fmt(ev.totalCost, { digits: 0 })}.`));
  if (ref) {
    out.push(ref.firstAlert === null
      ? tr('For comparison, delayed accuracy alone never catches this failure in the stream.', 'Sebagai pembanding, delayed accuracy saja tidak pernah menangkap kegagalan ini dalam stream.')
      : tr(`For comparison, delayed accuracy alone (the labels arrive late) alerts on day ${fmt(ref.firstAlert)}, ${fmt(ref.detectionDelay)} days after the failure began.`, `Sebagai pembanding, delayed accuracy saja (label datang terlambat) berbunyi pada hari ke-${fmt(ref.firstAlert)}, ${fmt(ref.detectionDelay)} hari setelah kegagalan dimulai.`));
  }
  return out;
}

// ---- step 6: investigation ---------------------------------------------------------------------------------------

export function hypothesisLabel(kind) {
  switch (kind) {
    case 'skew': return tr('Training-serving skew: a bug in how a feature is computed at serving time', 'Training-serving skew: bug pada cara sebuah feature dihitung saat serving');
    case 'covariate': return tr('Covariate drift: the inputs really changed, the rule did not', 'Covariate drift: inputnya benar-benar berubah, aturannya tidak');
    case 'label': return tr('Label shift: the share of positives changed, the inputs barely moved', 'Label shift: porsi positif berubah, inputnya nyaris tidak bergerak');
    case 'concept': return tr('Concept shift: the rule from inputs to outcome changed, the inputs did not', 'Concept shift: aturan dari input ke hasil berubah, inputnya tidak');
    default: return '';
  }
}

export function hypothesisShort(kind) {
  return { skew: tr('Training-serving skew', 'Training-serving skew'), covariate: tr('Covariate drift', 'Covariate drift'), label: tr('Label shift', 'Label shift'), concept: tr('Concept shift', 'Concept shift') }[kind] ?? '';
}

export function remedyLabel(kind) {
  switch (kind) {
    case 'none': return tr('Keep the model as it is', 'Pertahankan model apa adanya');
    case 'rollback': return tr('Roll back: undo the change that broke the inputs', 'Rollback: batalkan perubahan yang merusak input');
    case 'recalibrate': return tr('Recalibrate: refit the probabilities on the new labels, same ranking', 'Recalibrate: sesuaikan ulang probabilitas pada label baru, urutan tetap sama');
    case 'retrain': return tr('Retrain: fit the model again on the recent labels', 'Retrain: latih ulang model pada label terbaru');
    default: return '';
  }
}

export function remedyShort(kind) {
  return { none: tr('Keep', 'Pertahankan'), rollback: tr('Roll back', 'Rollback'), recalibrate: tr('Recalibrate', 'Recalibrate'), retrain: tr('Retrain', 'Retrain') }[kind] ?? '';
}

const pc = v => pct(v, 0);

/** The lines that say why a hypothesis was or was not confirmed, from the evidence (the rules of capstone3.investigate). */
export function reasonLines(kind, evidence, feature) {
  const out = [];
  const row = evidence.featureTable.find(r => r.feature === feature) ?? evidence.featureTable[0];
  const signalMoved = evidence.featureTable.some(r => !r.identifier && r.psi >= 0.25);
  const anySkew = evidence.featureTable.some(r => !r.identifier && r.mismatch > 0.5);
  const dl = evidence.delayed;
  if (kind === 'skew') {
    out.push(tr(`${row.feature}: the served value differs from the offline recomputation on ${pc(row.mismatch)} of the recent rows (skew needs more than 50%).`, `${row.feature}: nilai yang disajikan berbeda dari hitungan ulang offline pada ${pc(row.mismatch)} baris terbaru (skew butuh lebih dari 50%).`));
  } else if (kind === 'covariate') {
    out.push(tr(`${row.feature}: PSI ${d2(row.psi)} (needs more than 0.25)${row.identifier ? ', but it is an identifier: new entities always move it' : ''}.`, `${row.feature}: PSI ${d2(row.psi)} (perlu lebih dari 0,25)${row.identifier ? ', tetapi ini pengenal: entitas baru selalu menggesernya' : ''}.`));
    out.push(tr(`${row.feature}: the served value differs from the offline one on ${pc(row.mismatch)} of the rows (a real shift needs under 5%).`, `${row.feature}: nilai yang disajikan berbeda dari yang offline pada ${pc(row.mismatch)} baris (pergeseran nyata butuh di bawah 5%).`));
  } else {
    out.push(signalMoved
      ? tr('A signal feature moved (PSI of 0.25 or more): this hypothesis leaves the inputs alone.', 'Ada feature sinyal yang bergerak (PSI 0,25 atau lebih): hipotesis ini tidak mengubah input.')
      : tr('No signal feature moved (every PSI is below 0.25).', 'Tidak ada feature sinyal yang bergerak (semua PSI di bawah 0,25).'));
    if (anySkew) out.push(tr('A feature is served differently from its offline value: that is skew.', 'Ada feature yang disajikan berbeda dari nilai offline-nya: itu skew.'));
    out.push(dl.drop === null
      ? tr('Not enough labels yet to measure the delayed AUC.', 'Label belum cukup untuk mengukur AUC tertunda.')
      : tr(`Delayed AUC ${d2(dl.auc)} against ${d2(dl.baselineAuc)} before launch: a drop of ${d2(dl.drop)} (${kind === 'label' ? 'ranking holds when the drop is 0.10 or less' : 'concept shift needs a drop above 0.15'}).`,
        `AUC tertunda ${d2(dl.auc)} dibandingkan ${d2(dl.baselineAuc)} sebelum peluncuran: turun ${d2(dl.drop)} (${kind === 'label' ? 'urutan bertahan bila penurunan 0,10 atau kurang' : 'concept shift butuh penurunan di atas 0,15'}).`));
    if (kind === 'label' && dl.prevalenceRatio !== null) out.push(tr(`The observed share of positives is ${fmt(dl.prevalenceRatio, { digits: 1 })} times the mean predicted score (label shift needs more than 1.4).`, `Porsi positif yang teramati ${fmt(dl.prevalenceRatio, { digits: 1 })} kali rata-rata skor prediksi (label shift butuh lebih dari 1,4).`));
  }
  return out;
}

export function whatHappened(truth) {
  switch (truth.kind) {
    case 'skew': return truth.mode === 'scale'
      ? tr(`From day ${fmt(truth.day)} the pipeline served ${truth.feature} multiplied by 100 (a unit change). The world did not change; only what the model saw.`, `Mulai hari ke-${fmt(truth.day)} pipeline menyajikan ${truth.feature} dikali 100 (perubahan satuan). Dunianya tidak berubah; hanya yang dilihat model.`)
      : tr(`From day ${fmt(truth.day)} the pipeline served ${truth.feature} as a constant default (a missing value filled in). The world did not change; only what the model saw.`, `Mulai hari ke-${fmt(truth.day)} pipeline menyajikan ${truth.feature} sebagai nilai default konstan (missing value yang diisi). Dunianya tidak berubah; hanya yang dilihat model.`);
    case 'covariate': return tr(`From day ${fmt(truth.day)} the mean of ${truth.feature} moved up by 1.5 standard deviations. The rule from inputs to outcome did not change.`, `Mulai hari ke-${fmt(truth.day)} rata-rata ${truth.feature} naik 1,5 simpangan baku. Aturan dari input ke hasil tidak berubah.`);
    case 'label': return tr(`From day ${fmt(truth.day)} the share of positives tripled (to ${pct(truth.prevalence, 0)}). Each class kept its own inputs, so the inputs barely moved.`, `Mulai hari ke-${fmt(truth.day)} porsi positif menjadi tiga kali lipat (menjadi ${pct(truth.prevalence, 0)}). Tiap kelas tetap punya inputnya sendiri, sehingga input nyaris tidak bergerak.`);
    case 'concept': return tr(`From day ${fmt(truth.day)} the rule changed: the weights rotated a quarter turn, so the old rule is no better than a coin flip. The inputs kept their distribution.`, `Mulai hari ke-${fmt(truth.day)} aturannya berubah: bobot berputar seperempat putaran, sehingga aturan lama tidak lebih baik dari lempar koin. Input tetap berdistribusi sama.`);
    default: return '';
  }
}

export function remedySentences(rem, chosen, wrong = 0) {
  const mine = rem.options.find(o => o.kind === chosen), best = rem.options[0];
  const out = [];
  out.push(tr(`You chose "${remedyShort(chosen)}": ${fmt(mine.total, { digits: 0 })} in total from the investigation day to the end of the stream (${fmt(mine.fixed, { digits: 0 })} to carry it out${mine.latencyDays ? `, live after ${fmt(mine.latencyDays)} days` : ''}, plus ${fmt(mine.operational, { digits: 0 })} of decisions).`,
    `Kamu memilih "${remedyShort(chosen)}": total ${fmt(mine.total, { digits: 0 })} dari hari penyelidikan sampai akhir stream (${fmt(mine.fixed, { digits: 0 })} untuk melaksanakannya${mine.latencyDays ? `, aktif setelah ${fmt(mine.latencyDays)} hari` : ''}, ditambah ${fmt(mine.operational, { digits: 0 })} dari keputusan).`));
  out.push(best.kind === chosen
    ? tr('That is the cheapest of the four options.', 'Itu yang termurah dari keempat opsi.')
    : tr(`The cheapest option was "${remedyShort(best.kind)}" at ${fmt(best.total, { digits: 0 })}: yours costs ${fmt(mine.total - best.total, { digits: 0 })} more (${pct((mine.total - best.total) / best.total, 1)}).`,
      `Opsi termurah adalah "${remedyShort(best.kind)}" sebesar ${fmt(best.total, { digits: 0 })}: pilihanmu ${fmt(mine.total - best.total, { digits: 0 })} lebih mahal (${pct((mine.total - best.total) / best.total, 1)}).`));
  out.push(tr('These costs are for the confirmed diagnosis. A right diagnosis does not always point to the cheapest option: the numbers decide, and Keep is sometimes the honest answer.', 'Biaya ini untuk diagnosis yang sudah terkonfirmasi. Diagnosis yang benar tidak selalu menunjuk opsi termurah: angkanya yang menentukan, dan Pertahankan kadang jawaban yang jujur.'));
  if (wrong > 0) {
    out.push(tr(`You rejected ${fmt(wrong)} guess${wrong === 1 ? '' : 'es'} first. Here a wrong guess costs nothing; in production each one is a day of work and a fix aimed at the wrong cause.`, `Kamu menolak ${fmt(wrong)} tebakan lebih dulu. Di sini tebakan yang salah tidak berbiaya; di produksi tiap tebakan berarti satu hari kerja dan perbaikan yang menyasar penyebab yang salah.`));
  }
  return out;
}

// ---- step 7: rubric ----------------------------------------------------------------------------------------------

export function criterionTitle(key) {
  switch (key) {
    case 'split': return tr('Split defence', 'Pembelaan split');
    case 'metric': return tr('Operational metric', 'Metrik operasional');
    case 'repro': return tr('Reproducibility', 'Reproducibility');
    case 'monitoring': return tr('Monitoring plan', 'Rencana monitoring');
    case 'failure': return tr('Failure investigation', 'Investigasi kegagalan');
    default: return '';
  }
}

export function levelLabel(level) {
  return [tr('Not yet', 'Belum'), tr('Partly', 'Sebagian'), tr('Yes', 'Sudah')][level - 1] ?? '';
}

export function levelText(criterion, level) {
  const t = {
    split: [
      tr('I chose a split without saying who the model will meet in use: new entities, or the future.', 'Aku memilih split tanpa menyebut siapa yang akan dihadapi model saat dipakai: entitas baru, atau masa depan.'),
      tr('I said who the model will meet, but I did not show with numbers how optimistic my split is.', 'Aku menyebut siapa yang akan dihadapi model, tetapi tidak menunjukkan dengan angka seberapa optimistis splitku.'),
      tr('I matched the split to how the model is used, measured its optimism against the other splits, and wrote a one-line defence.', 'Aku menyesuaikan split dengan cara model dipakai, mengukur optimismenya terhadap split yang lain, dan menulis pembelaan satu baris.'),
    ],
    metric: [
      tr('I judged the models by accuracy or AUC alone.', 'Aku menilai model hanya dengan accuracy atau AUC.'),
      tr('I used the cost, but I ignored the review capacity or the intervals.', 'Aku memakai biaya, tetapi mengabaikan kapasitas peninjauan atau interval-nya.'),
      tr('I judged the models by expected cost within the review capacity, with intervals, and said when a model does not clearly beat doing nothing.', 'Aku menilai model dengan expected cost dalam kapasitas peninjauan, lengkap dengan interval, dan menyatakan kapan sebuah model belum jelas mengalahkan tidak berbuat apa-apa.'),
    ],
    repro: [
      tr('Someone else could not rerun my result: I did not record the seed and the settings.', 'Orang lain tidak dapat mengulang hasilku: aku tidak mencatat seed dan pengaturannya.'),
      tr('I recorded the seed and settings, but I did not check that a rerun gives the same numbers.', 'Aku mencatat seed dan pengaturannya, tetapi tidak memeriksa bahwa pengulangan memberi angka yang sama.'),
      tr('I recorded the seed and settings, reran to the same numbers, and saw that changing one setting changes them.', 'Aku mencatat seed dan pengaturannya, mengulang sampai angkanya sama, dan melihat bahwa mengubah satu pengaturan mengubah angkanya.'),
    ],
    monitoring: [
      tr('I watched one thing, or chose thresholds without looking at false alarms.', 'Aku memantau satu hal saja, atau memilih threshold tanpa melihat alarm palsu.'),
      tr('I chose several monitors, but I did not weigh the false alarms against the delay.', 'Aku memilih beberapa monitor, tetapi tidak menimbang alarm palsu terhadap keterlambatan.'),
      tr('I combined fast monitors (inputs, scores) with the slow, honest one (delayed accuracy), replayed the stream, and weighed false alarms against the cost until detection.', 'Aku menggabungkan monitor yang cepat (input, skor) dengan yang lambat tetapi jujur (delayed accuracy), memutar ulang stream, dan menimbang alarm palsu terhadap biaya sampai terdeteksi.'),
    ],
    failure: [
      tr('I picked a cause without testing it against the evidence.', 'Aku memilih penyebab tanpa mengujinya terhadap bukti.'),
      tr('I tested a hypothesis, but I did not say what evidence ruled the others out, or I chose the fix without comparing its cost.', 'Aku menguji sebuah hipotesis, tetapi tidak menyebut bukti yang menyingkirkan yang lain, atau memilih perbaikan tanpa membandingkan biayanya.'),
      tr('I read the evidence (feature PSI, score drift, delayed accuracy, slices), confirmed one cause, compared the remedies by cost and said what I changed.', 'Aku membaca bukti (PSI feature, score drift, delayed accuracy, slice), memastikan satu penyebab, membandingkan perbaikan menurut biayanya dan menyebut apa yang kuubah.'),
    ],
  }[criterion];
  return t?.[level - 1] ?? '';
}

// ---- the summary -------------------------------------------------------------------------------------------------

const row = (label, value) => `${label}: ${value}`;

/**
 * Plain text for the capstone summary. s = {
 *   seed, facts, costs: { miss, falseAlarm, review }, capacity, decision, mode, metric, reasons, threshold,
 *   split, cmp | null, defence, tuned: { logistic, forest } | null, picks: { logistic, forest }, model,
 *   ev: evaluateCandidates() | null, settings (experimentSettings) | null, record: repro() | null, rerun: bool, changeResult: { option, mismatches } | null,
 *   plan, planEval | null, planRef | null, failDay, evidenceDay,
 *   investigation: { confirmed (kind) | null, feature, wrong, remedy (key) | null, rem: remedy block | null, truth } ,
 *   text, rubric: [{ criterion, level }]
 * }
 */
export function buildSummary(s) {
  const L = [];
  const val = x => (x && x.trim() ? x.trim() : tr('(not written yet)', '(belum ditulis)'));
  const none = tr('(not done yet)', '(belum dikerjakan)');
  L.push(tr('LEVEL 3 CAPSTONE SUMMARY: a batch scoring system, from the frame to the first failure', 'RINGKASAN CAPSTONE LEVEL 3: sistem scoring batch, dari rumusan sampai kegagalan pertama'));
  L.push(tr('The data are synthetic: a program generated the cases, the entities, the outcomes and the failure. No real customers, no real money.', 'Datanya sintetis: sebuah program membuat kasus, entitas, hasil, dan kegagalannya. Tidak ada pelanggan sungguhan, tidak ada uang sungguhan.'));
  L.push('');
  const f = s.facts;
  L.push(tr('1. FRAME', '1. RUMUSAN'));
  L.push(row(tr('Decision supported', 'Keputusan yang didukung'), s.decision ? decisionLabel(s.decision) : none));
  L.push(row(tr('Batch or online', 'Batch atau online'), s.mode ? modeLabel(s.mode) : none));
  L.push(row(tr('Unit costs and capacity', 'Biaya satuan dan kapasitas'), tr(`miss ${fmt(s.costs.miss)}, false alarm ${fmt(s.costs.falseAlarm)}, review ${fmt(s.costs.review)}; ${fmt(s.capacity)} of ${fmt(f.perDay)} cases a day can be reviewed; flag at ${pct(f.threshold)} or more.`,
    `terlewat ${fmt(s.costs.miss)}, alarm palsu ${fmt(s.costs.falseAlarm)}, peninjauan ${fmt(s.costs.review)}; ${fmt(s.capacity)} dari ${fmt(f.perDay)} kasus per hari dapat ditinjau; tandai pada ${pct(f.threshold)} atau lebih.`)));
  L.push(row(tr('Operational metric', 'Metrik operasional'), s.metric ? metricLabel(s.metric) : none));
  L.push(neverFlagSentence(f));
  L.push('');
  L.push(tr('2. SPLIT', '2. SPLIT'));
  L.push(row(tr('Split', 'Split'), s.split ? splitName(s.split) : none));
  if (s.cmp && s.split) {
    L.push(tr(`Optimism check (a reference forest; AUC on the split's test side minus AUC on new entities after launch): ${SPLIT_KEYS.map(k => `${splitName(k, true)} ${signed(s.cmp[k].optimism)}`).join(', ')}.`,
      `Cek optimisme (sebuah forest acuan; AUC pada sisi test split dikurangi AUC pada entitas baru setelah peluncuran): ${SPLIT_KEYS.map(k => `${splitName(k, true)} ${signed(s.cmp[k].optimism)}`).join(', ')}.`));
  }
  L.push(row(tr('My one-line defence', 'Pembelaanku dalam satu baris'), val(s.defence)));
  L.push('');
  L.push(tr('3. MODELS (validation AUC inside the training part; cost on the test side)', '3. MODEL (AUC validasi di dalam bagian training; biaya pada sisi test)'));
  for (const m of TUNABLE) {
    const t = s.tuned?.[m];
    if (!t) { L.push(`- ${modelName(m)}: ${tr('(search not run yet)', '(pencarian belum dijalankan)')}`); continue; }
    const used = s.picks[m], r = t.results.find(x => x.value === used) ?? t.results[0];
    L.push(`- ${modelName(m)}, ${settingShort(m)} ${valueText(used)}: ${d2(r.mean)} ± ${d2(r.sd)}`);
  }
  if (s.ev) {
    L.push(tr(`Test side: ${fmt(s.ev.nTest)} cases, review capacity ${fmt(s.ev.capacityTest)}. Estimates with 95% bootstrap intervals:`, `Sisi test: ${fmt(s.ev.nTest)} kasus, kapasitas peninjauan ${fmt(s.ev.capacityTest)}. Perkiraan dengan interval bootstrap 95%:`));
    for (const m of ['baseline', 'logistic', 'forest']) L.push(`- ${modelName(m)}: AUC ${intervalText(s.ev.scores[m].auc)}; ${tr('expected cost per case', 'expected cost per kasus')} ${intervalText(s.ev.scores[m].cost)}`);
    L.push(...candidateSentences(s.ev).slice(1));
  } else L.push(tr('Test side: (not scored yet)', 'Sisi test: (belum dinilai)'));
  L.push(row(tr('Model I take forward', 'Model yang kubawa'), s.model ? modelName(s.model) : none));
  L.push('');
  L.push(tr('4. REPRODUCIBILITY', '4. REPRODUCIBILITY'));
  if (s.settings && s.record) {
    for (const [k, v] of settingLines(s.settings, s.seed)) L.push(row(k, v));
    L.push(tr(`Split fingerprint ${s.record.split.hash}; AUC ${d2(s.record.metrics.auc)}, expected cost ${d2(s.record.metrics.expectedCost)}.`, `Sidik jari split ${s.record.split.hash}; AUC ${d2(s.record.metrics.auc)}, expected cost ${d2(s.record.metrics.expectedCost)}.`));
    L.push(s.rerun ? tr('Rerun with the same seed and settings: identical split and metrics.', 'Pengulangan dengan seed dan pengaturan yang sama: split dan metrik identik.') : tr('Rerun with the same seed and settings: (not done yet)', 'Pengulangan dengan seed dan pengaturan yang sama: (belum dikerjakan)'));
    if (s.changeResult) L.push(tr(`Changed ${changeField(s.changeResult.option.field)} from ${valueShown(s.changeResult.option.field, s.changeResult.option.from)} to ${valueShown(s.changeResult.option.field, s.changeResult.option.to)}: ${s.changeResult.mismatches.length ? `${fmt(s.changeResult.mismatches.length)} fields differ (${s.changeResult.mismatches.map(m => fieldLabel(m.field)).join(', ')}).` : 'nothing differs.'}`,
      `Mengubah ${changeField(s.changeResult.option.field)} dari ${valueShown(s.changeResult.option.field, s.changeResult.option.from)} menjadi ${valueShown(s.changeResult.option.field, s.changeResult.option.to)}: ${s.changeResult.mismatches.length ? `${fmt(s.changeResult.mismatches.length)} kolom berbeda (${s.changeResult.mismatches.map(m => fieldLabel(m.field)).join(', ')}).` : 'tidak ada yang berbeda.'}`));
  } else L.push(none);
  L.push('');
  L.push(tr('5. MONITORING PLAN', '5. RENCANA MONITORING'));
  L.push(row(tr('Plan', 'Rencana'), planSummary(s.plan)));
  if (s.planEval) L.push(...planSentences(s.planEval, s.planRef, s.failDay));
  else L.push(tr('Replay: (not done yet)', 'Replay: (belum dikerjakan)'));
  L.push('');
  L.push(tr('6. FAILURE INVESTIGATION', '6. INVESTIGASI KEGAGALAN'));
  const inv = s.investigation;
  if (inv && inv.confirmed) {
    L.push(tr(`Evidence read on day ${fmt(s.evidenceDay)}. Confirmed: ${hypothesisShort(inv.confirmed)}${inv.feature && ['skew', 'covariate'].includes(inv.confirmed) ? ` (${inv.feature})` : ''}; hypotheses tested and rejected first: ${fmt(inv.wrong)}.`,
      `Bukti dibaca pada hari ke-${fmt(s.evidenceDay)}. Terkonfirmasi: ${hypothesisShort(inv.confirmed)}${inv.feature && ['skew', 'covariate'].includes(inv.confirmed) ? ` (${inv.feature})` : ''}; hipotesis yang diuji dan ditolak lebih dulu: ${fmt(inv.wrong)}.`));
    L.push(whatHappened(inv.truth));
    if (inv.remedy && inv.rem) L.push(...remedySentences(inv.rem, inv.remedy, inv.wrong));
    else L.push(tr('Remedy: (not chosen yet)', 'Perbaikan: (belum dipilih)'));
  } else L.push(none);
  L.push('');
  L.push(tr('REPORT', 'LAPORAN'));
  L.push(row(tr('The split and why', 'Split dan alasannya'), val(s.text.splitWhy)));
  L.push(row(tr('The model I chose and why', 'Model yang kupilih dan alasannya'), val(s.text.modelWhy)));
  L.push(row(tr('The monitoring plan', 'Rencana monitoring'), val(s.text.monitoring)));
  L.push(row(tr('Failure investigation: what happened', 'Investigasi kegagalan: apa yang terjadi'), val(s.text.happened)));
  L.push(row(tr('Failure investigation: how I found it', 'Investigasi kegagalan: bagaimana aku menemukannya'), val(s.text.found)));
  L.push(row(tr('Failure investigation: what I changed', 'Investigasi kegagalan: apa yang kuubah'), val(s.text.changed)));
  L.push('');
  L.push(tr('Self-assessment', 'Penilaian diri'));
  for (const r of s.rubric) {
    L.push(r.level >= 1
      ? `- ${criterionTitle(r.criterion)}: ${levelLabel(r.level)} (${fmt(r.level)}/3). ${levelText(r.criterion, r.level)}`
      : `- ${criterionTitle(r.criterion)}: ${tr('(not rated yet)', '(belum dinilai)')}`);
  }
  return L.join('\n');
}
