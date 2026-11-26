// Pure logic behind the capstone workbench lab (sims/labs/capstone.js): what the lab saves, which of its six
// steps are really done, which model is better, the plain sentences that compare models, the rows a learner
// may inspect, and the text of the capstone summary. No DOM, no network, no storage. Text comes from tr() at
// call time, so a function here follows the language of the moment. Tested in capstonereport.test.js.
//
// The saved state keeps keys and numbers only, never a translated string or a score (the lab recomputes
// scores from the saved choices), so a language switch can rebuild the lab from it.
//
//   emptyState() / sanitizeState(raw)   the saved shape; sanitizeState accepts anything (a string, a tampered
//       object) and returns a valid state, clamping every value to what the lab can show.
//   modelParams(cfg)                    the params capstone.js fitModel takes for a model config.
//   selectColumns(X, features)          the columns of X (rows of all FEATURES) for a feature subset.
//   metricValue(ev, metric) / metricUndefined(ev, metric)     one score from capstone.js evaluate().
//   pickBetter(evA, evB, metric)        'a' or 'b' on the TEST rows; ties go to accuracy, then to 'a'.
//   compareToBaseline(score, base)      'beats' | 'ties' | 'worse' (a difference under TIE_BAND is a tie).
//   gapClass(train, test)               'large' | 'moderate' | 'small' | 'reversed' for the train/test gap.
//   inspectList(model, Xtrain, ytrain, Xtest, ytest, ids, rows)
//                                       the test mistakes (most confident first), plus, when there are fewer
//                                       than 3, the correctly classified rows closest to the other class.
//   validMarks(state, candidateIds)     the marked rows that count (a reason and a note given), in marking order.
//   pruneMarks(state, candidateIds)     { state, removed }: marks whose row is no longer a candidate dropped.
//   stepDone(state, info)               six booleans, one per step.
//   buildSummary(s)                     the plain-text capstone summary.
import { tr, fmt, pct } from '../../i18n.js';
import { FEATURES, TASKS, featureLabel, modelLabel, errorList } from './capstone.js';
import { columnStats, standardize } from './scale.js';

export const STORAGE_KEY = 'learnlab.lab.capstone.v1';
export const METRICS = ['accuracy', 'recall', 'f1'];
export const KINDS = ['knn', 'logistic', 'tree'];
export const REASONS = ['overlap', 'unusual', 'label', 'simple', 'feature'];
export const CRITERIA = ['framing', 'baseline', 'comparison', 'errors'];
export const TEXT_FIELDS = ['problem', 'why', 'next'];
export const STEP_COUNT = 6;
export const MARKS_NEEDED = 3;
export const MAX_NOTE = 160;
export const MAX_TEXT = 400;
/** Scores within this many points (a fraction: 0.01 is one percentage point) of each other count as a tie. */
export const TIE_BAND = 0.01;
/** Gaps (train minus test) from which the comparison calls the gap moderate / large. */
export const GAP_MODERATE = 0.04;
export const GAP_LARGE = 0.10;
const CLOSE_CALLS = 5;

// ---- saved state ---------------------------------------------------------------------------------------------

export function emptyModel(kind) {
  return { kind, k: 5, scale: true, maxDepth: 3, minLeaf: 1, features: [...FEATURES], run: false };
}

export function emptyState() {
  return {
    v: 1, task: null, metric: null, seed: 1, baselineRun: false,
    a: emptyModel('knn'), b: emptyModel('tree'),
    marks: {}, order: [],
    text: { problem: '', why: '', next: '' },
    rubric: { framing: 0, baseline: 0, comparison: 0, errors: 0 },
    open: 0,
  };
}

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const int = (v, lo, hi, fallback) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fallback);
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

function sanitizeModel(raw, fallback) {
  const out = emptyModel(fallback);
  if (!isObj(raw)) return out;
  if (KINDS.includes(raw.kind)) out.kind = raw.kind;
  out.k = int(raw.k, 1, 25, out.k);
  out.scale = typeof raw.scale === 'boolean' ? raw.scale : out.scale;
  out.maxDepth = int(raw.maxDepth, 1, 8, out.maxDepth);
  out.minLeaf = int(raw.minLeaf, 1, 20, out.minLeaf);
  if (Array.isArray(raw.features)) {
    const chosen = FEATURES.filter(f => raw.features.includes(f));
    if (chosen.length) out.features = chosen;
  }
  out.run = raw.run === true;
  return out;
}

export function sanitizeState(raw) {
  const s = emptyState();
  if (!isObj(raw)) return s;
  if (typeof raw.task === 'string' && Object.hasOwn(TASKS, raw.task)) s.task = raw.task;
  if (METRICS.includes(raw.metric)) s.metric = raw.metric;
  s.seed = int(raw.seed, 1, 999, 1);
  s.baselineRun = raw.baselineRun === true;
  s.a = sanitizeModel(raw.a, 'knn');
  s.b = sanitizeModel(raw.b, 'tree');
  if (isObj(raw.marks)) {
    for (const [key, m] of Object.entries(raw.marks)) {
      const id = Number(key);
      if (!Number.isInteger(id) || id < 0 || !isObj(m)) continue;
      s.marks[id] = { reason: REASONS.includes(m.reason) ? m.reason : '', note: str(m.note, MAX_NOTE) };
    }
  }
  if (Array.isArray(raw.order)) {
    for (const v of raw.order) if (Object.hasOwn(s.marks, v) && !s.order.includes(v) && s.order.length < MARKS_NEEDED) s.order.push(Number(v));
  }
  // A mark that is not in `order` could never be shown or counted: drop it.
  for (const key of Object.keys(s.marks)) if (!s.order.includes(Number(key))) delete s.marks[key];
  if (isObj(raw.text)) for (const f of TEXT_FIELDS) s.text[f] = str(raw.text[f], MAX_TEXT);
  if (isObj(raw.rubric)) for (const c of CRITERIA) s.rubric[c] = int(raw.rubric[c], 0, 3, 0);
  s.open = int(raw.open, 0, STEP_COUNT - 1, 0);
  return s;
}

/** Params for capstone.js fitModel(kind, params, ...). */
export function modelParams(cfg) {
  if (cfg.kind === 'knn') return { k: cfg.k, scale: cfg.scale };
  if (cfg.kind === 'tree') return { maxDepth: cfg.maxDepth, minLeaf: cfg.minLeaf };
  return {};
}

/** True when two model configs would fit the same model: same kind, same relevant params, same features. */
export function sameModel(a, b) {
  return a.kind === b.kind && JSON.stringify(modelParams(a)) === JSON.stringify(modelParams(b))
    && a.features.join('|') === b.features.join('|');
}

/** Columns of X (each row has all of FEATURES, in that order) for the chosen features. */
export function selectColumns(X, features) {
  const cols = features.map(f => FEATURES.indexOf(f));
  return X.map(r => cols.map(c => r[c]));
}

export function describeModel(cfg, inline = false) {
  const name = modelLabel(cfg.kind);
  let detail = '';
  if (cfg.kind === 'knn') detail = tr(`k = ${fmt(cfg.k)}, ${cfg.scale ? 'features scaled' : 'raw units'}`, `k = ${fmt(cfg.k)}, ${cfg.scale ? 'scaling aktif' : 'tanpa scaling'}`);
  if (cfg.kind === 'tree') detail = tr(`max depth ${fmt(cfg.maxDepth)}, min leaf ${fmt(cfg.minLeaf)}`, `kedalaman maksimum ${fmt(cfg.maxDepth)}, daun minimum ${fmt(cfg.minLeaf)}`);
  return detail ? (inline ? `${name}, ${detail}` : `${name} (${detail})`) : name;
}

export const featureList = features => features.map(featureLabel).join(', ');

// ---- metrics and comparison ----------------------------------------------------------------------------------

export function metricName(metric, short = false) {
  switch (metric) {
    case 'accuracy': return short ? tr('accuracy', 'accuracy') : tr('Accuracy', 'Accuracy');
    case 'recall': return short ? tr('recall', 'recall') : tr('Recall of the positive class', 'Recall kelas positif');
    case 'f1': return tr('F1', 'F1');
    default: throw new RangeError(`unknown metric "${metric}"`);
  }
}

export function metricValue(ev, metric) {
  if (!METRICS.includes(metric)) throw new RangeError(`unknown metric "${metric}"`);
  return ev[metric];
}

/** True when the metric has no defined value (0 of 0), so the lab shows a dash instead of 0%. */
export function metricUndefined(ev, metric) {
  return metric === 'accuracy' ? ev.n === 0 : Boolean(ev.undefined?.[metric]);
}

/** 'a' or 'b': the higher TEST score on the metric; a tie goes to test accuracy, then to 'a'. */
export function pickBetter(evA, evB, metric) {
  const eps = 1e-9;
  for (const m of [metric, 'accuracy']) {
    const d = metricValue(evB, m) - metricValue(evA, m);
    if (Math.abs(d) > eps) return d > 0 ? 'b' : 'a';
  }
  return 'a';
}

export function compareToBaseline(score, base) {
  const d = score - base;
  if (d > TIE_BAND + 1e-9) return 'beats';
  if (d < -TIE_BAND - 1e-9) return 'worse';
  return 'ties';
}

export function gapClass(train, test) {
  const gap = train - test;
  if (gap >= GAP_LARGE - 1e-9) return 'large';
  if (gap >= GAP_MODERATE - 1e-9) return 'moderate';
  if (gap <= -GAP_MODERATE + 1e-9) return 'reversed';
  return 'small';
}

const points = d => fmt(Math.abs(d) * 100, { digits: 1 });

/** One plain sentence: does this model beat the baseline on the chosen metric (test rows)? */
export function baselineSentence(name, metric, score, base) {
  const m = metricName(metric, true), s = pct(score), b = pct(base);
  switch (compareToBaseline(score, base)) {
    case 'beats': return tr(`${name} beats the baseline on ${m}: ${s} against ${b} on the test rows.`, `${name} mengalahkan baseline pada ${m}: ${s} dibanding ${b} pada test rows.`);
    case 'worse': return tr(`${name} does worse than the baseline on ${m}: ${s} against ${b} on the test rows.`, `${name} lebih buruk daripada baseline pada ${m}: ${s} dibanding ${b} pada test rows.`);
    default: return tr(`${name} does not beat the baseline on ${m}: ${s} against ${b}, less than one point apart.`, `${name} tidak mengalahkan baseline pada ${m}: ${s} dibanding ${b}, selisihnya kurang dari satu poin.`);
  }
}

/** One plain sentence about the train/test gap of a model on the chosen metric. */
export function gapSentence(name, metric, train, test) {
  const m = metricName(metric, true), t = pct(train), e = pct(test), g = points(train - test);
  switch (gapClass(train, test)) {
    case 'large': return tr(`${name} scores ${t} ${m} on the training rows but ${e} on the test rows, a gap of ${g} points. That is a large gap: it may have memorised the training rows (overfitting).`, `${name} mendapat ${m} ${t} pada training rows tetapi ${e} pada test rows, selisihnya ${g} poin. Selisih sebesar ini mengisyaratkan model menghafal training rows (overfitting).`);
    case 'moderate': return tr(`${name} scores ${t} ${m} on the training rows and ${e} on the test rows, a gap of ${g} points. The gap is noticeable: keep an eye on it.`, `${name} mendapat ${m} ${t} pada training rows dan ${e} pada test rows, selisihnya ${g} poin. Selisih ini cukup terasa, jadi perhatikan terus.`);
    case 'reversed': return tr(`${name} scores ${e} ${m} on the test rows, ${g} points more than on the training rows (${t}). With so few test rows that is luck of the split, not skill: try a new split.`, `${name} mendapat ${m} ${e} pada test rows, ${g} poin lebih tinggi daripada pada training rows (${t}). Dengan test rows sesedikit itu, ini keberuntungan split, bukan kemampuan: coba split baru.`);
    default: if (train < test) return tr(`${name} scores ${t} ${m} on the training rows and ${e} on the test rows, so the test score is ${g} points higher than the training score. That is a small difference and only luck of the split: it does about as well on new rows as on the rows it learned from.`, `${name} mendapat ${m} ${t} pada training rows dan ${e} pada test rows, jadi skor test ${g} poin lebih tinggi daripada skor training. Selisih ini kecil dan hanya keberuntungan split: performanya pada baris baru hampir sama dengan pada baris yang dipelajarinya.`);
      return tr(`${name} scores ${t} ${m} on the training rows and ${e} on the test rows, a small gap (${g} points): it does about as well on new rows as on the rows it learned from.`, `${name} mendapat ${m} ${t} pada training rows dan ${e} pada test rows, selisihnya kecil (${g} poin): performanya pada baris baru hampir sama dengan pada baris yang dipelajarinya.`);
  }
}

/** Which of A and B is better, as a sentence, with the honest caveat when they are almost level. */
export function betterSentence(nameA, nameB, metric, scoreA, scoreB, which, nTest) {
  const winner = which === 'a' ? nameA : nameB, m = metricName(metric, true);
  const diff = Math.abs(scoreA - scoreB);
  if (diff <= TIE_BAND + 1e-9) {
    return tr(`${nameA} and ${nameB} are level on ${m} (${pct(scoreA)} and ${pct(scoreB)}). ${winner} comes first by the tie rule (accuracy, then Model A), but the difference is smaller than one point, and one test row is worth about ${fmt(100 / Math.max(1, nTest), { digits: 1 })} points of accuracy.`, `${nameA} dan ${nameB} setara pada ${m} (${pct(scoreA)} dan ${pct(scoreB)}). ${winner} didahulukan menurut aturan seri (accuracy, lalu Model A), tetapi selisihnya kurang dari satu poin, dan satu test row bernilai sekitar ${fmt(100 / Math.max(1, nTest), { digits: 1 })} poin accuracy.`);
  }
  return tr(`${winner} is better on ${m}: ${pct(Math.max(scoreA, scoreB))} against ${pct(Math.min(scoreA, scoreB))}, ${points(scoreA - scoreB)} points ahead. A different split could change the order when the gap is this small.`, `${winner} lebih baik pada ${m}: ${pct(Math.max(scoreA, scoreB))} dibanding ${pct(Math.min(scoreA, scoreB))}, unggul ${points(scoreA - scoreB)} poin. Split yang berbeda bisa mengubah urutannya bila selisihnya sekecil ini.`);
}

// ---- framing text --------------------------------------------------------------------------------------------

/** { fp, fn, cost }: what each kind of mistake is for the task, in plain words. */
export function mistakeMeaning(taskKey) {
  switch (taskKey) {
    case 'adelie-vs-chinstrap': return {
      fp: tr('False alarm: an Adelie is called a Chinstrap.', 'Alarm palsu: seekor Adelie disebut Chinstrap.'),
      fn: tr('Missed case: a Chinstrap is called an Adelie.', 'Kasus terlewat: seekor Chinstrap disebut Adelie.'),
      cost: tr('Chinstraps are the rarer species, so a colony count that misses them gives a wrong picture: a missed Chinstrap is usually the worse mistake.', 'Chinstrap adalah spesies yang lebih jarang, sehingga hitungan koloni yang melewatkannya memberi gambaran keliru: Chinstrap yang terlewat biasanya kesalahan yang lebih buruk.'),
    };
    case 'sex': return {
      fp: tr('A female is called male.', 'Seekor betina disebut jantan.'),
      fn: tr('A male is called female.', 'Seekor jantan disebut betina.'),
      cost: tr('Neither mistake is clearly worse, and both sexes are about equally common, so a balanced score such as accuracy is a natural choice.', 'Tidak ada kesalahan yang jelas lebih buruk, dan jumlah kedua jenis kelamin hampir sama, sehingga skor yang seimbang seperti accuracy adalah pilihan yang wajar.'),
    };
    case 'gentoo-vs-rest': return {
      fp: tr('An Adelie or a Chinstrap is called a Gentoo.', 'Adelie atau Chinstrap disebut Gentoo.'),
      fn: tr('A Gentoo is called an Adelie or a Chinstrap.', 'Seekor Gentoo disebut Adelie atau Chinstrap.'),
      cost: tr('Gentoos are the larger birds and the smaller group. Mixing them with the lighter species spoils any average you take afterwards, so both mistakes matter, and a missed Gentoo matters a little more.', 'Gentoo adalah burung yang lebih besar dan kelompoknya lebih kecil. Mencampurnya dengan spesies yang lebih ringan merusak rata-rata yang dihitung sesudahnya, jadi kedua kesalahan berarti, dan Gentoo yang terlewat sedikit lebih berarti.'),
    };
    default: throw new RangeError(`unknown task "${taskKey}"`);
  }
}

/** The one-line reason that goes next to a metric choice (the same for every task). */
export function metricReason(metric) {
  switch (metric) {
    case 'accuracy': return tr('Counts every right answer. Fair when both classes are common and both mistakes cost about the same.', 'Menghitung semua jawaban yang benar. Cocok jika kedua kelas sama-sama banyak dan kedua kesalahan sama mahal.');
    case 'recall': return tr('Of the penguins that really are the positive class, how many did the model find. Choose it when missing one is the costly mistake.', 'Dari penguin yang memang kelas positif, berapa yang ditemukan model. Pilih ini bila kesalahan yang mahal adalah melewatkan satu.');
    case 'f1': return tr('Balances recall with precision (how many alarms were right). Choose it when the positive class is the smaller one and both missed cases and false alarms matter.', 'Menyeimbangkan recall dengan precision (berapa alarm yang benar). Pilih ini bila kelas positif adalah yang lebih kecil dan kasus terlewat maupun alarm palsu sama-sama penting.');
    default: throw new RangeError(`unknown metric "${metric}"`);
  }
}

/** A task-aware warning for the chosen metric, or null. `balance` = { pos, neg, posName, negName }. */
export function metricWarning(metric, balance) {
  const total = balance.pos + balance.neg;
  if (!total) return null;
  const major = balance.pos >= balance.neg ? balance.posName : balance.negName;
  const share = Math.max(balance.pos, balance.neg) / total;
  if (metric === 'accuracy' && share >= 0.6) {
    return tr(`Heads-up: a model that always answers "${major}" already scores ${pct(share, 0)} accuracy, so a high accuracy can hide the missed ${balance.posName}.`, `Perhatian: model yang selalu menjawab "${major}" sudah mendapat accuracy ${pct(share, 0)}, sehingga accuracy yang tinggi bisa menyembunyikan ${balance.posName} yang terlewat.`);
  }
  if (metric === 'recall') {
    return tr(`Heads-up: a model that always answers "${balance.posName}" gets a recall of 100%, so read recall next to the baseline and, if you can, next to precision.`, `Perhatian: model yang selalu menjawab "${balance.posName}" mendapat recall 100%, jadi baca recall bersama baseline dan, bila bisa, bersama precision.`);
  }
  return null;
}

export function reasonLabel(key) {
  switch (key) {
    case 'overlap': return tr('Classes overlap', 'Kelas saling tumpang tindih');
    case 'unusual': return tr('Unusual measurement', 'Pengukuran tidak biasa');
    case 'label': return tr('Label may be wrong', 'Label mungkin salah');
    case 'simple': return tr('Model too simple', 'Model terlalu sederhana');
    case 'feature': return tr('Feature missing', 'Fitur kurang');
    default: return '';
  }
}

export function criterionTitle(key) {
  switch (key) {
    case 'framing': return tr('Framing', 'Framing masalah');
    case 'baseline': return tr('Baseline', 'Baseline');
    case 'comparison': return tr('Fair comparison', 'Perbandingan yang adil');
    case 'errors': return tr('Error analysis', 'Analisis kesalahan');
    default: return '';
  }
}

export function levelLabel(level) {
  return [tr('Not yet', 'Belum'), tr('Partly', 'Sebagian'), tr('Yes', 'Sudah')][level - 1] ?? '';
}

/** The descriptor of one rubric level (1 to 3) of a criterion. */
export function levelText(criterion, level) {
  const t = {
    framing: [
      tr('I picked a task but did not say what a mistake costs or why I chose the metric.', 'Saya memilih tugas tetapi belum menjelaskan akibat sebuah kesalahan atau alasan memilih metrik.'),
      tr('I said what a mistake means, but my reason for the metric is vague.', 'Saya sudah menjelaskan arti sebuah kesalahan, tetapi alasan memilih metriknya masih samar.'),
      tr('I named what each kind of mistake costs and chose a metric that fits.', 'Saya menyebutkan akibat tiap jenis kesalahan dan memilih metrik yang sesuai.'),
    ],
    baseline: [
      tr('I ran the baseline but did not use it to judge my models.', 'Saya menjalankan baseline tetapi tidak memakainya untuk menilai model.'),
      tr('I looked at the baseline score but did not check whether each model beats it on my chosen metric.', 'Saya melihat skor baseline tetapi belum memeriksa apakah tiap model mengalahkannya pada metrik pilihan saya.'),
      tr('I checked that each model beats the baseline on my chosen metric, on the test rows.', 'Saya memeriksa bahwa tiap model mengalahkan baseline pada metrik pilihan saya, pada test rows.'),
    ],
    comparison: [
      tr('I compared the models on different rows, or only on training scores.', 'Saya membandingkan model pada baris yang berbeda, atau hanya dari skor training.'),
      tr('I used the same test rows for both models but did not look at the train and test gap.', 'Saya memakai test rows yang sama untuk kedua model tetapi tidak melihat selisih train dan test.'),
      tr('Same split, test scores, and I read the train and test gap before choosing; I know a new split could change the order.', 'Split sama, skor test, dan saya membaca selisih train dan test sebelum memilih; saya tahu split baru bisa mengubah urutannya.'),
    ],
    errors: [
      tr('I looked at the scores only, not at single mistakes.', 'Saya hanya melihat skor, bukan kesalahan satu per satu.'),
      tr('I looked at three mistakes, but my reasons are guesses I did not check against the measurements.', 'Saya melihat tiga kesalahan, tetapi alasannya hanya tebakan yang tidak saya cocokkan dengan pengukuran.'),
      tr('For three mistakes I read the measurements, gave a reason and wrote what it tells me.', 'Untuk tiga kesalahan saya membaca pengukurannya, memberi alasan dan menulis apa yang diberitahukannya.'),
    ],
  }[criterion];
  return t?.[level - 1] ?? '';
}

// ---- rows to inspect -----------------------------------------------------------------------------------------

/**
 * The rows the learner may mark in step 5, for the better model: its mistakes on the test rows (most
 * confident first, via capstone.js errorList), and, when there are fewer than MARKS_NEEDED of them, the
 * CLOSE_CALLS correctly classified test rows that sit closest to the other class (smallest margin: the
 * distance to the nearest opposite-class training row minus the distance to the nearest same-class one, on
 * standardized features), so three can always be marked. Each entry has errorList's fields plus kind: 'error' | 'close'.
 */
export function inspectList(model, Xtrain, ytrain, Xtest, ytest, ids = null, rows = null) {
  const list = errorList(model, Xtest, ytest, ids, rows).map(e => ({ ...e, kind: 'error' }));
  if (list.length >= MARKS_NEEDED) return list;
  const stats = columnStats(Xtrain);
  const train = standardize(Xtrain, stats), test = standardize(Xtest, stats);
  const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
  const close = [];
  Xtest.forEach((x, index) => {
    const actual = Number(ytest[index]);
    if (model.predict(x) !== actual) return;
    let same = Infinity, other = Infinity;
    train.forEach((t, j) => { const d = dist(test[index], t); if (Number(ytrain[j]) === actual) same = Math.min(same, d); else other = Math.min(other, d); });
    close.push({ index, margin: other - same });
  });
  close.sort((a, b) => (Math.abs(a.margin - b.margin) > 1e-9 ? a.margin - b.margin : a.index - b.index));
  for (const { index } of close.slice(0, CLOSE_CALLS)) {
    const id = ids ? ids[index] : index;
    list.push({
      id, index, features: Xtest[index].slice(), actual: Number(ytest[index]), predicted: Number(ytest[index]),
      confidence: model.confidence(Xtest[index]), type: null, row: rows ? rows[id] ?? null : null, kind: 'close',
    });
  }
  return list;
}

/** Marked rows that count: still a candidate, with a reason and a non-blank note, in the order they were marked. */
export function validMarks(state, candidateIds) {
  const ok = new Set(candidateIds);
  return state.order.filter(id => ok.has(id) && state.marks[id]?.reason && state.marks[id]?.note.trim());
}

/** Drops marks of rows that are no longer candidates. Returns a NEW state and how many marks were removed. */
export function pruneMarks(state, candidateIds) {
  const ok = new Set(candidateIds);
  const order = state.order.filter(id => ok.has(id));
  const marks = {};
  for (const id of order) marks[id] = state.marks[id];
  return { state: { ...state, order, marks }, removed: state.order.length - order.length };
}

// ---- progress ------------------------------------------------------------------------------------------------

/**
 * Six booleans: is each step really done. info = { candidateIds: ids the learner may mark (empty until both
 * models are evaluated), noMarkable: true when there is nothing to mark }.
 */
export function stepDone(state, info = { candidateIds: [] }) {
  const texts = TEXT_FIELDS.every(f => state.text[f].trim().length > 0);
  const rated = CRITERIA.every(c => state.rubric[c] >= 1);
  const needed = Math.min(MARKS_NEEDED, info.candidateIds.length);
  return [
    Boolean(state.task && state.metric),
    state.baselineRun,
    state.a.run && state.a.features.length > 0,
    state.b.run && state.b.features.length > 0 && !sameModel(state.a, state.b),
    needed > 0 && validMarks(state, info.candidateIds).length >= needed,
    texts && rated,
  ];
}

// ---- the summary ---------------------------------------------------------------------------------------------

const row = (label, value) => `${label}: ${value}`;
const scoreLine = r => `${metricName('accuracy', true)} ${pct(r.test.accuracy)}, ${metricName('recall', true)} ${pct(r.test.recall)}, F1 ${pct(r.test.f1)}`;

/**
 * Plain text for the capstone summary. s = {
 *   taskLabel, question, rows: { total, kept, dropped, excluded }, balance: { pos, neg, posName, negName },
 *   metric, metricWhy, split: { seed, train, test },
 *   results: [{ name, desc, train: {accuracy, recall, f1}, test: {...} }]   // baseline, model A, model B
 *   better: 'a' | 'b' | null, sentences: [string],
 *   mistakes: [{ id, truth, guess, confidence, kind: 'error' | 'close', reason, note }]   // truth/guess are class names
 *   text: { problem, why, next }, rubric: [{ criterion, level }]
 * }
 */
export function buildSummary(s) {
  const L = [];
  const val = x => (x && x.trim() ? x.trim() : tr('(not written yet)', '(belum ditulis)'));
  L.push(tr('CAPSTONE SUMMARY: classifying penguins', 'RINGKASAN CAPSTONE: mengklasifikasikan penguin'));
  L.push('');
  L.push(row(tr('Task', 'Tugas'), s.taskLabel ? `${s.taskLabel} (${s.question})` : tr('(not chosen yet)', '(belum dipilih)')));
  if (s.rows) {
    L.push(row(tr('Data', 'Data'), tr(
      `${fmt(s.rows.total)} penguins in the file; ${fmt(s.rows.kept)} used, ${fmt(s.rows.dropped)} left out for a missing value (NA)${s.rows.excluded ? `, ${fmt(s.rows.excluded)} not part of this task` : ''}.`,
      `${fmt(s.rows.total)} penguin dalam file; ${fmt(s.rows.kept)} dipakai, ${fmt(s.rows.dropped)} dibuang karena missing value (NA)${s.rows.excluded ? `, ${fmt(s.rows.excluded)} bukan bagian dari tugas ini` : ''}.`)));
  }
  if (s.balance) {
    const t = s.balance.pos + s.balance.neg;
    L.push(row(tr('Class balance', 'Keseimbangan kelas'), `${s.balance.posName} ${fmt(s.balance.pos)} (${pct(s.balance.pos / t, 0)}), ${s.balance.negName} ${fmt(s.balance.neg)} (${pct(s.balance.neg / t, 0)})`));
  }
  L.push(row(tr('Metric I judge by', 'Metrik penilaianku'), s.metric ? `${metricName(s.metric)}. ${s.metricWhy ?? ''}`.trim() : tr('(not chosen yet)', '(belum dipilih)')));
  if (s.split) L.push(row(tr('Split', 'Split'), tr(`stratified, seed ${fmt(s.split.seed)}: ${fmt(s.split.train)} training rows, ${fmt(s.split.test)} test rows.`, `stratified, seed ${fmt(s.split.seed)}: ${fmt(s.split.train)} training rows, ${fmt(s.split.test)} test rows.`)));
  L.push('');
  L.push(tr('Scores on the test rows', 'Skor pada test rows'));
  for (const r of s.results) {
    L.push(`- ${r.name}${r.desc ? ` [${r.desc}]` : ''}: ${scoreLine(r)}`);
  }
  if (s.sentences?.length) { L.push(''); L.push(...s.sentences); }
  L.push('');
  L.push(tr('Three mistakes I looked at', 'Tiga kesalahan yang kuperiksa'));
  if (!s.mistakes.length) L.push(tr('(none marked yet)', '(belum ada yang ditandai)'));
  s.mistakes.forEach((m, i) => {
    const what = m.kind === 'close'
      ? tr(`row #${fmt(m.id + 1)}: classified correctly (${m.truth}), a close call`, `baris #${fmt(m.id + 1)}: diklasifikasikan benar (${m.truth}), nyaris salah`)
      : tr(`row #${fmt(m.id + 1)}: really ${m.truth}, predicted ${m.guess}, confidence ${pct(m.confidence, 0)}`, `baris #${fmt(m.id + 1)}: sebenarnya ${m.truth}, diprediksi ${m.guess}, confidence ${pct(m.confidence, 0)}`);
    L.push(`${i + 1}. ${what}. ${tr('Reason', 'Alasan')}: ${reasonLabel(m.reason) || '–'}. ${tr('Note', 'Catatan')}: ${val(m.note)}`);
  });
  L.push('');
  L.push(row(tr('The problem', 'Masalahnya'), val(s.text.problem)));
  L.push(row(tr('Why I picked this model', 'Mengapa memilih model ini'), val(s.text.why)));
  L.push(row(tr('What I would try next', 'Yang akan kucoba berikutnya'), val(s.text.next)));
  L.push('');
  L.push(tr('Self-assessment', 'Penilaian diri'));
  for (const r of s.rubric) {
    L.push(r.level >= 1
      ? `- ${criterionTitle(r.criterion)}: ${levelLabel(r.level)} (${fmt(r.level)}/3). ${levelText(r.criterion, r.level)}`
      : `- ${criterionTitle(r.criterion)}: ${tr('(not rated yet)', '(belum dinilai)')}`);
  }
  return L.join('\n');
}
