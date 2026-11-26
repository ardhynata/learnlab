// Pure logic behind the Level 2 capstone workbench (sims/labs/capstone-l2.js): what the lab saves, which of its six
// steps are really done, what a change upstream resets downstream, the plain sentences the lab shows, the rubric,
// and the text of the plain-text summary. No DOM, no network, no storage. Text comes from tr() at call time, so a
// function here follows the language of the moment. Tested in capstone2report.test.js.
//
// The saved state keeps keys and numbers only, never a translated string or a score: the lab recomputes scores from
// the saved choices, so a language switch can rebuild the lab without losing work.
//
//   emptyState() / sanitizeState(raw)   the saved shape; sanitizeState accepts anything and returns a valid state.
//   resetFrom(state, step)              a NEW state in which the results that depend on step 2..5 are forgotten
//                                       (flags, tuned picks, the chosen model, the threshold); typed text stays.
//   stepDone(state)                     six booleans, one per step.
//   reasonsRight(reasons)               true when exactly the two true reasons why accuracy misleads are ticked.
//   readingTruth(aucInterval, diff)     'weak' | 'clear' | 'overlap' | 'behind': what the held-out intervals say.
//   names and sentences                 splitName, modelName, settingName, valueText, optimismSentences, ...
//   buildSummary(s)                     the plain-text capstone summary.
import { tr, fmt, pct } from '../../i18n.js';
import { GRIDS, SPLIT_KEYS, MODEL_KEYS, TUNABLE, COMPARE_SEEDS, DATA_SEEDS } from './capstone2lab.js';

export const STORAGE_KEY = 'learnlab.lab.capstone-l2.v1';
export const STEP_COUNT = 6;
export const REASONS = ['rare', 'equal', 'cannot'];
export const TRUE_REASONS = ['rare', 'equal'];
export const READINGS = ['clear', 'overlap', 'behind', 'weak'];
export const CRITERIA = ['split', 'comparison', 'uncertainty', 'threshold'];
export const TEXT_FIELDS = ['splitWhy', 'modelWhy', 'risks'];
export const COST_RANGE = { fp: { min: 1, max: 20 }, fn: { min: 5, max: 200 } };
export const B_RANGE = { min: 100, max: 1000, step: 100 };
export const MAX_DEFENCE = 200;
export const MAX_TEXT = 500;

// ---- saved state -----------------------------------------------------------------------------------------------

export function emptyState() {
  return {
    v: 1, seed: 1, fp: 5, fn: 50, costsSet: false, reasons: [],
    split: null, splitCompared: false, defence: '',
    searched: { logistic: false, forest: false }, picks: { logistic: null, forest: null }, model: null,
    B: 200, scored: false, reading: null,
    threshold: null, thresholdSet: false,
    text: { splitWhy: '', modelWhy: '', risks: '' },
    rubric: { split: 0, comparison: 0, uncertainty: 0, threshold: 0 },
    open: 0,
  };
}

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const int = (v, lo, hi, fallback) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fallback);
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

export function sanitizeState(raw) {
  const s = emptyState();
  if (!isObj(raw)) return s;
  s.seed = int(raw.seed, 1, DATA_SEEDS.length, 1);
  s.fp = int(raw.fp, COST_RANGE.fp.min, COST_RANGE.fp.max, s.fp);
  s.fn = int(raw.fn, COST_RANGE.fn.min, COST_RANGE.fn.max, s.fn);
  s.costsSet = raw.costsSet === true;
  if (Array.isArray(raw.reasons)) s.reasons = REASONS.filter(r => raw.reasons.includes(r));
  if (SPLIT_KEYS.includes(raw.split)) s.split = raw.split;
  s.splitCompared = raw.splitCompared === true && s.split !== null;
  s.defence = str(raw.defence, MAX_DEFENCE);
  if (isObj(raw.searched)) for (const m of TUNABLE) s.searched[m] = raw.searched[m] === true;
  if (isObj(raw.picks)) for (const m of TUNABLE) if (GRIDS[m].values.includes(raw.picks[m])) s.picks[m] = raw.picks[m];
  if (TUNABLE.includes(raw.model)) s.model = raw.model;
  s.B = int(Number.isFinite(raw.B) ? Math.round(raw.B / B_RANGE.step) * B_RANGE.step : raw.B, B_RANGE.min, B_RANGE.max, 200);
  s.scored = raw.scored === true;
  if (READINGS.includes(raw.reading)) s.reading = raw.reading;
  if (Number.isFinite(raw.threshold) && raw.threshold > 0 && raw.threshold < 1) s.threshold = Math.round(raw.threshold * 1000) / 1000;
  s.thresholdSet = raw.thresholdSet === true;
  if (isObj(raw.text)) for (const f of TEXT_FIELDS) s.text[f] = str(raw.text[f], MAX_TEXT);
  if (isObj(raw.rubric)) for (const c of CRITERIA) s.rubric[c] = int(raw.rubric[c], 0, 3, 0);
  s.open = int(raw.open, 0, STEP_COUNT - 1, 0);
  return s;
}

/**
 * Forgets what depends on step `step` (2 to 5) and everything after it: a different dataset (2) or split (3) makes
 * every later score stale, a different tuned setting or model (4) makes the held-out scores stale, and so on.
 */
export function resetFrom(state, step) {
  const s = { ...state, searched: { ...state.searched }, picks: { ...state.picks }, text: { ...state.text }, rubric: { ...state.rubric } };
  if (step <= 2) s.splitCompared = false;
  if (step <= 3) { s.searched = { logistic: false, forest: false }; s.picks = { logistic: null, forest: null }; s.model = null; }
  if (step <= 4) { s.scored = false; s.reading = null; }
  if (step <= 5) { s.threshold = null; s.thresholdSet = false; }
  return s;
}

export const reasonsRight = reasons => TRUE_REASONS.every(r => reasons.includes(r)) && reasons.every(r => TRUE_REASONS.includes(r));

/** Six booleans: is each step really done. */
export function stepDone(s) {
  const texts = TEXT_FIELDS.every(f => s.text[f].trim().length > 0);
  const rated = CRITERIA.every(c => s.rubric[c] >= 1);
  return [
    s.costsSet && reasonsRight(s.reasons),
    s.split !== null && s.splitCompared && s.defence.trim().length > 0,
    TUNABLE.every(m => s.searched[m]) && s.model !== null,
    s.scored && s.reading !== null,
    s.thresholdSet,
    texts && rated,
  ];
}

/** The value of a setting the model uses: the learner's pick, or the best of the search. */
export const usedValue = (state, model, tuned) => state.picks[model] ?? tuned?.best ?? null;

// ---- names ------------------------------------------------------------------------------------------------------

export function splitName(key, short = false) {
  switch (key) {
    case 'random': return tr('Random', 'Acak');
    case 'grouped': return short ? tr('Grouped', 'Per pelanggan') : tr('Grouped by customer', 'Dikelompokkan per pelanggan');
    case 'temporal': return short ? tr('Temporal', 'Temporal') : tr('Temporal (by time)', 'Temporal (menurut waktu)');
    default: throw new RangeError(`unknown split "${key}"`);
  }
}

export function splitDescription(key) {
  switch (key) {
    case 'random': return tr('Any transaction can be tested. A customer is usually on both sides, the training rows and the test rows.', 'Transaksi mana pun bisa masuk test rows. Seorang pelanggan biasanya ada di kedua sisi, training rows dan test rows.');
    case 'grouped': return tr('A whole customer goes to one side only. The test rows are customers the model has never seen.', 'Satu pelanggan hanya masuk ke satu sisi. Test rows berisi pelanggan yang belum pernah dilihat model.');
    case 'temporal': return tr('The earliest transactions train the model and the latest ones test it, so the model never sees the future.', 'Transaksi paling awal melatih model dan yang paling akhir mengujinya, sehingga model tidak pernah melihat masa depan.');
    default: return '';
  }
}

export function modelName(key) {
  switch (key) {
    case 'baseline': return tr('Baseline', 'Baseline');
    case 'logistic': return tr('Logistic regression', 'Regresi logistik');
    case 'forest': return tr('Random forest', 'Random forest');
    default: throw new RangeError(`unknown model "${key}"`);
  }
}

export function settingName(model) {
  switch (model) {
    case 'logistic': return tr('Penalty strength (L2)', 'Kekuatan penalti (L2)');
    case 'forest': return tr('Maximum depth of each tree', 'Kedalaman maksimum tiap tree');
    default: return '';
  }
}

export const settingShort = model => (model === 'logistic' ? tr('L2 penalty', 'Penalti L2') : model === 'forest' ? tr('max depth', 'kedalaman maks') : '');

export const valueText = value => (value == null ? '–' : fmt(value));

/** Precision as a percentage, or '–' when nothing was flagged (0 of 0 is undefined, not zero). */
export const precisionText = run => (!run || !run.flagged || !Number.isFinite(run.precision) ? '–' : pct(run.precision, 0));

export function reasonLabel(key) {
  switch (key) {
    case 'rare': return tr('Fraud is rare, so a model that never flags anything already looks very accurate.', 'Fraud jarang terjadi, sehingga model yang tidak pernah menandai apa pun sudah tampak sangat akurat.');
    case 'equal': return tr('Accuracy counts a missed fraud and a false alarm as equally bad, but here a missed fraud costs far more.', 'Accuracy menganggap fraud yang terlewat dan alarm palsu sama buruknya, padahal di sini fraud yang terlewat jauh lebih mahal.');
    case 'cannot': return tr('Accuracy cannot be computed when one class is rare.', 'Accuracy tidak bisa dihitung bila salah satu kelas jarang.');
    default: return '';
  }
}

/** One line of feedback on a ticked or unticked reason; '' when there is nothing to say. */
export function reasonFeedback(key, ticked) {
  const right = TRUE_REASONS.includes(key);
  if (right && ticked) return tr('Yes, that is a real reason.', 'Ya, itu alasan yang benar.');
  if (right) return tr('This one is true too: tick it.', 'Yang ini juga benar: centang.');
  if (ticked) return tr('Not true: accuracy is always computable; the problem is what it hides, not that it fails.', 'Tidak benar: accuracy selalu bisa dihitung; masalahnya pada apa yang disembunyikannya, bukan karena gagal dihitung.');
  return '';
}

export function readingLabel(key) {
  switch (key) {
    case 'clear': return tr('My model is clearly better than the baseline, and the other model is clearly behind it.', 'Modelku jelas lebih baik daripada baseline, dan model yang lain jelas tertinggal.');
    case 'overlap': return tr('My model beats the baseline, but the held-out rows cannot tell it from the other model.', 'Modelku mengalahkan baseline, tetapi held-out rows tidak bisa membedakannya dari model yang lain.');
    case 'behind': return tr('The other model is clearly better than the one I picked.', 'Model yang lain jelas lebih baik daripada model pilihanku.');
    case 'weak': return tr('I cannot even say that my model beats the baseline.', 'Aku bahkan belum bisa bilang bahwa modelku mengalahkan baseline.');
    default: return '';
  }
}

/** What the intervals say: aucInterval of the chosen model, diff = interval of (chosen - other) AUC. */
export function readingTruth(aucInterval, diff) {
  if (!(aucInterval.lo > 0.5)) return 'weak';
  if (diff && Number.isFinite(diff.lo)) {
    if (diff.lo > 0) return 'clear';
    if (diff.hi < 0) return 'behind';
  }
  return 'overlap';
}

export function readingFeedback(picked, truth) {
  const says = {
    clear: tr('The data say: the interval of the difference stays above zero, and the chosen model is above the baseline.', 'Data menunjukkan: interval selisihnya tetap di atas nol, dan model pilihanmu di atas baseline.'),
    overlap: tr('The data say: the chosen model is above the baseline, but the interval of the difference includes zero, so the rows cannot tell the two models apart.', 'Data menunjukkan: model pilihanmu di atas baseline, tetapi interval selisihnya mencakup nol, sehingga baris yang ada tidak bisa membedakan kedua model.'),
    behind: tr('The data say: the other model is ahead and the interval of the difference stays below zero. You chose before looking, so report it as it is; do not switch now just because of these rows.', 'Data menunjukkan: model yang lain unggul dan interval selisihnya tetap di bawah nol. Kamu memilih sebelum melihat hasilnya, jadi laporkan apa adanya; jangan berpindah model hanya karena baris-baris ini.'),
    weak: tr('The data say: the lower end of the chosen model\'s AUC interval is not above 0.5, the AUC of a coin flip.', 'Data menunjukkan: ujung bawah interval AUC model pilihanmu tidak di atas 0,5, AUC dari lempar koin.'),
  }[truth];
  const head = picked === truth ? tr('Your reading matches. ', 'Bacaanmu sesuai. ') : tr('Your reading differs from the intervals. ', 'Bacaanmu berbeda dari intervalnya. ');
  return head + says;
}

// ---- sentences --------------------------------------------------------------------------------------------------

const d2 = x => fmt(x, { digits: 2 });

/** What a model that never flags anything achieves: the class balance and what accuracy hides. */
export function neverFlagSentence(facts, fn) {
  const cost = facts.frauds * fn;
  return tr(
    `A model that never flags anything is right on ${pct(facts.accuracyNever)} of the transactions, and it misses all ${fmt(facts.frauds)} frauds. That costs ${fmt(cost)} in total, ${d2(cost / Math.max(1, facts.rows))} per transaction.`,
    `Model yang tidak pernah menandai apa pun benar pada ${pct(facts.accuracyNever)} transaksi, dan ia melewatkan semua ${fmt(facts.frauds)} fraud. Biayanya ${fmt(cost)} secara total, ${d2(cost / Math.max(1, facts.rows))} per transaksi.`);
}

export function flagAllSentence(facts, fp) {
  const cost = facts.legit * fp;
  return tr(
    `A model that flags everything catches every fraud but raises ${fmt(facts.legit)} false alarms: ${fmt(cost)} in total, ${d2(cost / Math.max(1, facts.rows))} per transaction.`,
    `Model yang menandai semuanya menangkap setiap fraud tetapi menimbulkan ${fmt(facts.legit)} alarm palsu: ${fmt(cost)} secara total, ${d2(cost / Math.max(1, facts.rows))} per transaksi.`);
}

export function thresholdRule(fp, fn, thr) {
  return tr(
    `Flag a transaction when its fraud probability is at least ${fmt(fp)} / (${fmt(fp)} + ${fmt(fn)}) = ${pct(thr)}: below that, a false alarm (cost ${fmt(fp)}) is more likely to be the bill than a miss (cost ${fmt(fn)}).`,
    `Tandai transaksi bila probabilitas fraud-nya setidaknya ${fmt(fp)} / (${fmt(fp)} + ${fmt(fn)}) = ${pct(thr)}: di bawah itu, tagihannya lebih mungkin berupa alarm palsu (biaya ${fmt(fp)}) daripada fraud yang terlewat (biaya ${fmt(fn)}).`);
}

/** The optimism of the chosen split against the others, from compareSplits(). */
export function optimismSentences(cmp, chosen) {
  const out = [];
  for (const other of SPLIT_KEYS) {
    if (other === chosen) continue;
    const gap = cmp[chosen].auc - cmp[other].auc;
    const g = d2(Math.abs(gap));
    if (Math.abs(gap) < 0.02) {
      out.push(tr(`${splitName(chosen)} and ${splitName(other)} give about the same AUC (${d2(cmp[chosen].auc)} and ${d2(cmp[other].auc)}).`, `${splitName(chosen)} dan ${splitName(other)} memberi AUC yang hampir sama (${d2(cmp[chosen].auc)} dan ${d2(cmp[other].auc)}).`));
    } else if (gap > 0) {
      out.push(tr(`${splitName(chosen)} scores ${g} AUC higher than ${splitName(other)} (${d2(cmp[chosen].auc)} against ${d2(cmp[other].auc)}): it is the more optimistic of the two.`, `${splitName(chosen)} mendapat AUC ${g} lebih tinggi daripada ${splitName(other)} (${d2(cmp[chosen].auc)} dibanding ${d2(cmp[other].auc)}): ini yang lebih optimistis dari keduanya.`));
    } else {
      out.push(tr(`${splitName(chosen)} scores ${g} AUC lower than ${splitName(other)} (${d2(cmp[chosen].auc)} against ${d2(cmp[other].auc)}): it is the stricter of the two.`, `${splitName(chosen)} mendapat AUC ${g} lebih rendah daripada ${splitName(other)} (${d2(cmp[chosen].auc)} dibanding ${d2(cmp[other].auc)}): ini yang lebih ketat dari keduanya.`));
    }
  }
  return out;
}

/** What the grouped split shows about the customers, as one plain sentence. */
export function sharedSentence(cmp) {
  const t = cmp.temporal;
  return tr(
    `Customers seen in training: random ${pct(cmp.random.sharedShare, 0)} of the test rows, grouped ${pct(cmp.grouped.sharedShare, 0)}, temporal ${pct(cmp.temporal.sharedShare, 0)}. The temporal split trains up to day ${fmt(t.lastTrainDay)} and tests from day ${fmt(t.firstTestDay)}: it removes the future, but it keeps the customers.`,
    `Pelanggan yang sudah terlihat saat training: acak ${pct(cmp.random.sharedShare, 0)} dari test rows, per pelanggan ${pct(cmp.grouped.sharedShare, 0)}, temporal ${pct(cmp.temporal.sharedShare, 0)}. Split temporal melatih sampai hari ke-${fmt(t.lastTrainDay)} dan menguji mulai hari ke-${fmt(t.firstTestDay)}: split ini menghilangkan masa depan, tetapi pelanggannya tetap ada.`);
}

/** 'higher' | 'same' | 'lower': how the random split compares with the grouped one (for the predict box). */
export function randomVsGrouped(cmp) {
  const gap = cmp.random.auc - cmp.grouped.auc;
  return gap > 0.03 ? 'higher' : gap < -0.03 ? 'lower' : 'same';
}

export function searchSentence(model, tuned, used) {
  const best = tuned.results.find(r => r.value === used) ?? tuned.results[0];
  if (tuned.spread < 0.01) {
    return tr(`The ${settingShort(model)} hardly matters here: the five scores are within ${d2(tuned.spread)} AUC of each other. The first value of the grid that ties for the best is ${valueText(tuned.best)}${model === 'logistic' ? ': the weakest penalty, because a strong one shrinks every probability toward the average and would spoil the threshold in step 5' : ''}.`, `${settingShort(model)} hampir tidak berpengaruh di sini: kelima skornya hanya berbeda ${d2(tuned.spread)} AUC. Nilai pertama pada grid yang seri untuk yang terbaik adalah ${valueText(tuned.best)}${model === 'logistic' ? ': penalti paling lemah, karena penalti yang kuat menyusutkan setiap probabilitas ke arah rata-rata dan akan merusak threshold di langkah 5' : ''}.`);
  }
  return tr(`The best ${settingShort(model)} on the training part is ${valueText(tuned.best)} (validation AUC ${d2(tuned.results.find(r => r.value === tuned.best).mean)}). You use ${valueText(used)}, which scores ${d2(best.mean)}.`, `${settingShort(model)} terbaik pada bagian training adalah ${valueText(tuned.best)} (AUC validasi ${d2(tuned.results.find(r => r.value === tuned.best).mean)}). Kamu memakai ${valueText(used)}, yang mendapat ${d2(best.mean)}.`);
}

export function intervalText(iv) {
  if (!iv || !Number.isFinite(iv.estimate)) return '–';
  if (!Number.isFinite(iv.lo)) return d2(iv.estimate);
  return `${d2(iv.estimate)} (${d2(iv.lo)} – ${d2(iv.hi)})`;
}

/** The bootstrap interval of the AUC difference between two models, in one or two sentences. */
export function diffSentence(model, other, diff) {
  const real = diff.lo > 0 || diff.hi < 0;
  return tr(
    `${modelName(model)} minus ${modelName(other)}: AUC difference ${diff.estimate >= 0 ? '+' : ''}${d2(diff.estimate)}, 95% interval ${d2(diff.lo)} to ${d2(diff.hi)}. ${real ? 'The interval does not include zero: the difference is larger than the noise of these rows.' : 'The interval includes zero: these rows cannot say which model is better.'}`,
    `${modelName(model)} dikurangi ${modelName(other)}: selisih AUC ${diff.estimate >= 0 ? '+' : ''}${d2(diff.estimate)}, interval 95% ${d2(diff.lo)} sampai ${d2(diff.hi)}. ${real ? 'Interval tidak mencakup nol: selisihnya lebih besar daripada noise baris-baris ini.' : 'Interval mencakup nol: baris-baris ini tidak bisa mengatakan model mana yang lebih baik.'}`);
}

/** Sentences about the intervals; `model` is the chosen model, `other` the other tunable one. */
export function intervalSentences(scores, held, model, other, diff) {
  const out = [];
  const m = scores[model];
  out.push(tr(
    `The held-out rows hold only ${fmt(held.frauds)} frauds among ${fmt(held.n)} transactions, so every score rests on a handful of cases. With ${fmt(m.auc.used)} usable resamples, the AUC of ${modelName(model)} is ${d2(m.auc.estimate)}, 95% interval ${d2(m.auc.lo)} to ${d2(m.auc.hi)}.`,
    `Held-out rows hanya berisi ${fmt(held.frauds)} fraud di antara ${fmt(held.n)} transaksi, jadi setiap skor bertumpu pada segelintir kasus. Dengan ${fmt(m.auc.used)} resample yang terpakai, AUC ${modelName(model)} adalah ${d2(m.auc.estimate)}, interval 95% ${d2(m.auc.lo)} sampai ${d2(m.auc.hi)}.`));
  if (diff && Number.isFinite(diff.lo)) out.push(diffSentence(model, other, diff));
  out.push(tr(
    'The bootstrap resamples transactions one by one. Transactions of one customer are not independent, so the real uncertainty is wider than these intervals.',
    'Bootstrap mengambil ulang transaksi satu per satu. Transaksi dari satu pelanggan tidak saling bebas, jadi ketidakpastian yang sebenarnya lebih lebar daripada interval ini.'));
  return out;
}

export function thresholdSentences(run, costThr, atCost, facts) {
  const out = [];
  const moved = Math.abs(run.threshold - costThr) > 0.003;
  out.push(tr(
    `At ${pct(run.threshold)} the model flags ${fmt(run.flagged)} of ${fmt(run.n)} test transactions and catches ${fmt(run.confusion.tp)} of ${fmt(run.confusion.tp + run.confusion.fn)} frauds. The expected cost is ${d2(run.expectedCost)} per transaction.`,
    `Pada ${pct(run.threshold)} model menandai ${fmt(run.flagged)} dari ${fmt(run.n)} transaksi uji dan menangkap ${fmt(run.confusion.tp)} dari ${fmt(run.confusion.tp + run.confusion.fn)} fraud. Perkiraan biayanya ${d2(run.expectedCost)} per transaksi.`));
  if (moved) {
    out.push(tr(
      `You moved away from the cost threshold (${pct(costThr)}), where the cost is ${d2(atCost.expectedCost)}. If you moved because the curve of the held-out rows dipped there, you tuned on the test rows and the reported cost is optimistic: use the costs, not the test curve, to pick the threshold.`,
      `Kamu menjauh dari threshold biaya (${pct(costThr)}), yang biayanya ${d2(atCost.expectedCost)}. Bila kamu bergeser karena kurva held-out rows turun di sana, berarti kamu men-tune pada test rows dan biaya yang dilaporkan terlalu optimistis: pilih threshold dari biayanya, bukan dari kurva test.`));
  }
  return out;
}

// ---- rubric -------------------------------------------------------------------------------------------------------

export function criterionTitle(key) {
  switch (key) {
    case 'split': return tr('Split defence', 'Pembelaan split');
    case 'comparison': return tr('Fair comparison', 'Perbandingan yang adil');
    case 'uncertainty': return tr('Uncertainty', 'Ketidakpastian');
    case 'threshold': return tr('Threshold', 'Threshold');
    default: return '';
  }
}

export function levelLabel(level) {
  return [tr('Not yet', 'Belum'), tr('Partly', 'Sebagian'), tr('Yes', 'Sudah')][level - 1] ?? '';
}

export function levelText(criterion, level) {
  const t = {
    split: [
      tr('I chose a split without saying who the model will meet in use: new customers, or the future.', 'Aku memilih split tanpa menyebut siapa yang akan dihadapi model saat dipakai: pelanggan baru, atau masa depan.'),
      tr('I said who the model will meet, but I did not explain why my split fits that.', 'Aku menyebut siapa yang akan dihadapi model, tetapi tidak menjelaskan mengapa splitku cocok untuk itu.'),
      tr('I matched the split to how the model will be used, compared it with the other splits, and wrote a one-line defence.', 'Aku menyesuaikan split dengan cara model dipakai, membandingkannya dengan split yang lain, dan menulis pembelaan satu baris.'),
    ],
    comparison: [
      tr('I compared the models on different rows, or on rows the models were tuned on.', 'Aku membandingkan model pada baris yang berbeda, atau pada baris yang dipakai untuk men-tune model.'),
      tr('Same rows for every model, but the tuning search did not follow the split, or I chose a model by looking at the held-out rows.', 'Baris yang sama untuk semua model, tetapi pencarian tuning tidak mengikuti split, atau aku memilih model setelah melihat held-out rows.'),
      tr('Same split for every model, each tuned the same way on the training part only, and the held-out rows untouched until the end.', 'Split yang sama untuk semua model, masing-masing di-tune dengan cara yang sama hanya pada bagian training, dan held-out rows tidak disentuh sampai akhir.'),
    ],
    uncertainty: [
      tr('I reported single numbers from the held-out rows.', 'Aku melaporkan angka tunggal dari held-out rows.'),
      tr('I looked at the intervals but did not use them to say what these rows cannot tell.', 'Aku melihat interval-nya tetapi tidak memakainya untuk menyatakan apa yang tidak bisa dijawab baris-baris ini.'),
      tr('I reported AUC, average precision and expected cost with intervals, said which differences are real and which are within the noise, and said how few frauds there are.', 'Aku melaporkan AUC, average precision, dan expected cost beserta intervalnya, menyatakan selisih mana yang nyata dan mana yang masih dalam noise, serta menyebut betapa sedikitnya fraud.'),
    ],
    threshold: [
      tr('I used 50%, or picked the threshold by eye.', 'Aku memakai 50%, atau memilih threshold dengan menebak.'),
      tr('I used the costs, but I tuned the threshold on the held-out rows, or I did not question the probabilities.', 'Aku memakai biayanya, tetapi men-tune threshold pada held-out rows, atau tidak mempertanyakan probabilitasnya.'),
      tr('I set the threshold from the costs, read the expected cost and the confusion matrix, and said what would change it.', 'Aku menetapkan threshold dari biayanya, membaca expected cost dan confusion matrix, dan menyebut apa yang akan mengubahnya.'),
    ],
  }[criterion];
  return t?.[level - 1] ?? '';
}

// ---- the summary ---------------------------------------------------------------------------------------------

const row = (label, value) => `${label}: ${value}`;

/**
 * Plain text for the capstone summary. s = {
 *   facts: datasetFacts(), fp, fn, thr, reasons: [keys],
 *   split: key | null, cmp: compareSplits() | null, defence,
 *   tuned: { logistic: tuneModel() | null, forest: ... }, picks: { logistic, forest } (values used), model: key | null, innerKind: split key,
 *   held: { n, frauds } | null, scores: scoreModels() | null, diff: differenceInterval() | null, reading: key | null,
 *   threshold: { value, expectedCost, confusion, precision, recall } | null, thresholdSet,
 *   text: { splitWhy, modelWhy, risks }, rubric: [{ criterion, level }]
 * }
 */
export function buildSummary(s) {
  const L = [];
  const val = x => (x && x.trim() ? x.trim() : tr('(not written yet)', '(belum ditulis)'));
  L.push(tr('LEVEL 2 CAPSTONE SUMMARY: cost-sensitive fraud detection', 'RINGKASAN CAPSTONE LEVEL 2: deteksi fraud yang peka biaya'));
  L.push(tr('The data are synthetic: the transactions were generated by a program, not collected from real customers.', 'Datanya sintetis: transaksi dibuat oleh program, bukan dikumpulkan dari pelanggan sungguhan.'));
  L.push('');
  const f = s.facts;
  L.push(row(tr('Data', 'Data'), tr(
    `${fmt(f.rows)} transactions of ${fmt(f.customers)} customers over ${fmt(f.days)} days; ${fmt(f.frauds)} are fraud (${pct(f.rate)}).`,
    `${fmt(f.rows)} transaksi dari ${fmt(f.customers)} pelanggan selama ${fmt(f.days)} hari; ${fmt(f.frauds)} adalah fraud (${pct(f.rate)}).`)));
  L.push(row(tr('Costs', 'Biaya'), tr(`a false alarm costs ${fmt(s.fp)}, a missed fraud costs ${fmt(s.fn)}; cost threshold ${pct(s.thr)}.`, `alarm palsu berbiaya ${fmt(s.fp)}, fraud yang terlewat berbiaya ${fmt(s.fn)}; threshold biaya ${pct(s.thr)}.`)));
  L.push(row(tr('Why accuracy misleads', 'Mengapa accuracy menyesatkan'), s.reasons.length ? s.reasons.filter(r => TRUE_REASONS.includes(r)).map(reasonLabel).join(' ') : tr('(not answered yet)', '(belum dijawab)')));
  L.push(neverFlagSentence(f, s.fn));
  L.push('');
  L.push(row(tr('Split', 'Split'), s.split ? splitName(s.split) : tr('(not chosen yet)', '(belum dipilih)')));
  if (s.cmp && s.split) {
    L.push(tr(`Optimism check (a reference forest, AUC averaged over ${fmt(COMPARE_SEEDS.length)} splits): ${SPLIT_KEYS.map(k => `${splitName(k, true)} ${d2(s.cmp[k].auc)}`).join(', ')}.`,
      `Cek optimisme (sebuah forest acuan, AUC dirata-rata dari ${fmt(COMPARE_SEEDS.length)} split): ${SPLIT_KEYS.map(k => `${splitName(k, true)} ${d2(s.cmp[k].auc)}`).join(', ')}.`));
    L.push(...optimismSentences(s.cmp, s.split));
  }
  L.push(row(tr('My one-line defence', 'Pembelaanku dalam satu baris'), val(s.defence)));
  L.push('');
  L.push(tr('Models (validation AUC inside the training part)', 'Model (AUC validasi di dalam bagian training)'));
  L.push(`- ${modelName('baseline')}: ${d2(0.5)}`);
  for (const m of TUNABLE) {
    const t = s.tuned?.[m];
    if (!t) { L.push(`- ${modelName(m)}: ${tr('(search not run yet)', '(pencarian belum dijalankan)')}`); continue; }
    const used = s.picks[m], r = t.results.find(x => x.value === used) ?? t.results[0];
    L.push(`- ${modelName(m)}, ${settingShort(m)} ${valueText(used)}: ${d2(r.mean)} ± ${d2(r.sd)}`);
  }
  L.push(row(tr('Model I take forward', 'Model yang kupilih'), s.model ? modelName(s.model) : tr('(not chosen yet)', '(belum dipilih)')));
  L.push('');
  if (s.held && s.scores) {
    L.push(tr(`Held-out rows: ${fmt(s.held.n)} transactions, ${fmt(s.held.frauds)} frauds. Estimates with 95% bootstrap intervals`, `Held-out rows: ${fmt(s.held.n)} transaksi, ${fmt(s.held.frauds)} fraud. Perkiraan dengan interval bootstrap 95%`));
    for (const m of MODEL_KEYS) {
      const r = s.scores[m];
      L.push(`- ${modelName(m)}: AUC ${intervalText(r.auc)}; ${tr('average precision', 'average precision')} ${intervalText(r.ap)}; ${tr('expected cost', 'expected cost')} ${intervalText(r.cost)}`);
    }
    if (s.model && s.diff) L.push(diffSentence(s.model, s.model === 'forest' ? 'logistic' : 'forest', s.diff));
  } else {
    L.push(tr('Held-out rows: (not scored yet)', 'Held-out rows: (belum dinilai)'));
  }
  L.push('');
  if (s.threshold) {
    const t = s.threshold;
    L.push(row(tr('Threshold', 'Threshold'), tr(
      `${pct(t.value)} (cost threshold ${pct(s.thr)}). Expected cost ${d2(t.expectedCost)} per transaction; caught ${fmt(t.confusion.tp)} frauds, missed ${fmt(t.confusion.fn)}, ${fmt(t.confusion.fp)} false alarms.`,
      `${pct(t.value)} (threshold biaya ${pct(s.thr)}). Expected cost ${d2(t.expectedCost)} per transaksi; fraud yang tertangkap ${fmt(t.confusion.tp)}, terlewat ${fmt(t.confusion.fn)}, alarm palsu ${fmt(t.confusion.fp)}.`)));
  } else {
    L.push(row(tr('Threshold', 'Threshold'), tr('(not chosen yet)', '(belum dipilih)')));
  }
  L.push('');
  L.push(row(tr('The split and why', 'Split dan alasannya'), val(s.text.splitWhy)));
  L.push(row(tr('The model I chose and why', 'Model yang kupilih dan alasannya'), val(s.text.modelWhy)));
  L.push(row(tr('What could go wrong', 'Apa yang bisa salah'), val(s.text.risks)));
  L.push('');
  L.push(tr('Self-assessment', 'Penilaian diri'));
  for (const r of s.rubric) {
    L.push(r.level >= 1
      ? `- ${criterionTitle(r.criterion)}: ${levelLabel(r.level)} (${fmt(r.level)}/3). ${levelText(r.criterion, r.level)}`
      : `- ${criterionTitle(r.criterion)}: ${tr('(not rated yet)', '(belum dinilai)')}`);
  }
  return L.join('\n');
}
