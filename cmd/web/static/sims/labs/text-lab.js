// Text lab, built on the kit: a Naive Bayes classifier for short customer messages (billing, delivery,
// technical problem). The messages come from sims/ml/textdata.js in the language of the page (the lab is
// rebuilt when the language changes). The split, the model, the word-by-word explanation and the
// zero-probability check are pure functions in sims/ml/textlab.js (on top of sims/ml/naivebayes.js); this file
// draws and wires. The corpus is synthetic and the lab says so.
//
// Panels: the top words of each class (bar chart of log-odds) on the main canvas; accuracy and the confusion
// matrix; a message tester (class probabilities and one chip per word showing which class it pushes toward);
// the misclassified test messages (click one to load it into the tester); a Real data note (a closed box under the chart).
import { createLab, clusterColor, theme, predictBox, tr, fmt, pct, locale } from '../kit/index.js';
import { makeCorpus } from '../ml/textdata.js';
import { predictProba } from '../ml/naivebayes.js';
import { splitCorpus, trainModel, rankedTopWords, pairContributions, ruledOut, findRuledOut } from '../ml/textlab.js';

export const DEFAULTS = { alpha: 1, features: 'counts', stop: false, size: 60, seed: 1 };
export const DOCS_PER_CLASS = 80;
export const CORPUS_SEED = 7;
const TOP_K = 6;
const MAX_MISTAKES = 12;
const MAX_SEED = 999;
const SIZE_STEP = 6;

const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid);
  return e;
};
const clip = (text, n) => (text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text);
const q = s => `"${s}"`;
const value = v => (v === Infinity ? '∞' : fmt(v, { digits: 1 }));
// A bar's label. At smoothing 0 every word that no other class has shows ∞, so the count of times it was seen (the order of the bars) is added.
const barLabel = (w, counts) => (w.logOdds === Infinity && counts ? `∞ · ${fmt(w.weight)}×` : value(w.logOdds));
const signed = v => (Number.isFinite(v) ? `${v > 0.005 ? '+' : ''}${fmt(v, { digits: 2 })}` : '–');

const CSS = `
/* Fullscreen, wide: the three cards share one screen-tall column, so each scrolls inside its own box instead of painting over its neighbour. */
@media (min-width:1100px){
  .sim-host .lab-stage:is(:fullscreen,.expanded):has(.tl-card){grid-template-rows:auto minmax(0,1.4fr) minmax(0,1fr) !important}
  .lab-stage:is(:fullscreen,.expanded) .tl-card{min-height:0;overflow:auto;overscroll-behavior:contain}
  .lab-stage:is(:fullscreen,.expanded) .tl-card > .hint:first-of-type,.lab-stage:is(:fullscreen,.expanded) .tl-matrix caption{display:none}
  .lab-stage:is(:fullscreen,.expanded) .tl-card .table-scroll{flex:none !important;overflow:visible !important}
  .lab-stage:is(:fullscreen,.expanded) .tl-acc{margin:6px 0 8px}
  .lab-stage:is(:fullscreen,.expanded) .tl-acc .big{display:none}
  .lab-stage:is(:fullscreen,.expanded) .tl-matrix :is(th,td){padding:4px 8px}
}
.tl-real{margin:8px 0 0;font-size:13.5px}
.tl-real summary{cursor:pointer;font-weight:650;padding:4px 0}
.tl-real p{margin:6px 0 0;color:var(--muted)}
.tl-card label{display:block;margin-top:12px;font-size:13px;font-weight:650}
.tl-card select,.tl-card textarea{display:block;width:100%;max-width:100%;box-sizing:border-box;margin-top:6px;padding:8px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;font-size:14px;font-weight:400}
.tl-card textarea{resize:vertical;min-height:4.5em}
.tl-acc{display:grid;gap:4px;margin:10px 0 12px}
.tl-acc p{margin:0}
.tl-acc .big{font-size:18px;font-weight:700}
.tl-matrix{border-collapse:collapse;font-size:13px;width:100%}
.tl-matrix caption{caption-side:top;text-align:left;color:var(--muted);font-size:12.5px;padding-bottom:6px}
.tl-matrix th,.tl-matrix td{border:1px solid var(--line);padding:6px 8px;text-align:center;white-space:normal;overflow-wrap:normal;word-break:normal}
.tl-matrix th[scope=row]{text-align:left;font-weight:650}
.tl-matrix thead th{background:var(--surface-2)}
.tl-sum{margin:14px 0 6px;font-weight:600}
.tl-proba{display:grid;gap:6px;margin:8px 0 4px}
.tl-bar{display:grid;grid-template-columns:minmax(6.5rem,30%) 1fr 4.2rem;gap:8px;align-items:center;font-size:13px}
.tl-bar .track{height:12px;border-radius:6px;background:var(--grid);overflow:hidden}
.tl-bar .track i{display:block;height:100%;border-radius:6px;background:var(--c)}
.tl-bar.top .n{font-weight:700}
.tl-bar .v{text-align:right;font-variant-numeric:tabular-nums}
.tl-why{margin:16px 0 0;font-size:15px}
.tl-group h4{margin:12px 0 6px;font-size:13px}
.tl-chips{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.tl-chip{border:1.5px solid var(--c,var(--line-strong));border-radius:8px;padding:3px 8px;font-size:13px;overflow-wrap:anywhere;background:color-mix(in srgb,var(--c,var(--muted)) calc(var(--s,0) * 38%),transparent)}
.tl-chip b{font-variant-numeric:tabular-nums;margin-left:4px;font-weight:700}
.tl-chip.dim{border-style:dashed;border-color:var(--line-strong);color:var(--muted);background:none}
.tl-list{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:8px}
.tl-mistake{display:block;width:100%;text-align:left;padding:10px 12px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface);color:var(--ink);font:inherit;font-size:14px;cursor:pointer;white-space:normal;overflow-wrap:anywhere}
.tl-mistake:hover{background:var(--accent-soft)}
.tl-mistake[aria-current=true]{outline:2px solid var(--accent);outline-offset:1px}
.tl-mistake .meta{display:block;margin-top:4px;font-size:12.5px;color:var(--muted)}
@media (max-width:640px){.tl-matrix{font-size:11.5px}.tl-matrix th,.tl-matrix td{padding:5px 3px}.tl-matrix th[scope=row]{width:26%}.tl-bar{grid-template-columns:minmax(5.5rem,34%) 1fr 3.8rem}}
`;

export function mount(root) {
  const language = locale();
  const corpus = makeCorpus({ language, docsPerClass: DOCS_PER_CLASS, seed: CORPUS_SEED });
  const classes = corpus.classes;
  const color = name => clusterColor(classes.indexOf(name));
  const maxTrain = splitCorpus(corpus.labels, { classes, seed: 1 }).maxTrain;
  const languageName = tr(language === 'id' ? 'Indonesian' : 'English', language === 'id' ? 'bahasa Indonesia' : 'bahasa Inggris');

  const lab = createLab(root, {
    title: tr('Naive Bayes on customer messages', 'Naive Bayes untuk pesan pelanggan'),
    hint: tr(
      'Train on some messages, then test on messages the model has not seen. The bars show which words point most strongly to each class.',
      'Latih model dengan sebagian pesan, lalu uji dengan pesan yang belum pernah dilihatnya. Bar menunjukkan kata mana yang paling kuat menunjuk ke tiap kelas.'),
    status: true, legend: true,
    canvasLabel: tr('Bar chart of the words with the highest log-odds for each of the three classes', 'Bar chart kata dengan log-odds tertinggi untuk masing-masing dari tiga kelas'),
    settingsTitle: tr('Controls', 'Pengaturan'),
  });
  // The chart is a picture, not something to operate: announced as an image, no tab stop.
  lab.canvas.setAttribute('role', 'img');
  lab.canvas.removeAttribute('tabindex');
  const style = h('style');
  style.textContent = CSS;
  lab.root.prepend(style);

  let state = null;
  let destroyed = false;
  let liveTimer = 0;
  lab.cleanup(() => { destroyed = true; clearTimeout(liveTimer); });

  // ---- controls ---------------------------------------------------------------------------------

  const controls = lab.panel([
    { name: 'alpha', type: 'range', label: tr('Smoothing alpha', 'Smoothing alpha'), min: 0, max: 2, step: 0.05, value: DEFAULTS.alpha, format: v => fmt(v, { digits: 2 }) },
    { name: 'features', type: 'select', label: tr('Word weights', 'Bobot kata'), value: DEFAULTS.features, options: [['counts', tr('Word counts', 'Jumlah kata')], ['tfidf', 'TF-IDF']] },
    { name: 'stop', type: 'toggle', label: tr('Remove stop words', 'Hapus stop words'), value: DEFAULTS.stop },
    { name: 'size', type: 'range', label: tr('Training size', 'Ukuran training set'), min: SIZE_STEP, max: maxTrain, step: SIZE_STEP, value: DEFAULTS.size, format: v => tr(`${fmt(v)} messages`, `${fmt(v)} pesan`) },
    { name: 'seed', type: 'number', label: tr('Seed (random split)', 'Seed (pembagian acak)'), min: 1, max: MAX_SEED, step: 1, value: DEFAULTS.seed },
    { name: 'newSplit', type: 'button', label: tr('New split', 'Pembagian baru'), onClick: () => { controls.set('seed', controls.get('seed') % MAX_SEED + 1); settle(); } },
    {
      type: 'note',
      text: tr(
        'Smoothing alpha is added to every word count, so a word never seen in a class does not get probability 0. Stop words are very common words, such as "the" and "and".',
        'Smoothing alpha ditambahkan ke setiap jumlah kata, sehingga kata yang tidak pernah muncul di suatu kelas tidak mendapat probabilitas 0. Stop words adalah kata yang sangat umum, seperti "yang" dan "dan".'),
    },
  ], () => settle());

  // ---- Quick Quiz -------------------------------------------------------------------------------

  const box = predictBox(lab.ref('below'), {
    name: 'predict-smoothing',
    hint: tr('Set smoothing alpha to 0, then check again.', 'Atur smoothing alpha ke 0, lalu periksa lagi.'),
    question: tr(
      'If you set smoothing to 0, what happens to a message containing a word never seen for a class?',
      'Jika kamu mengatur smoothing ke 0, apa yang terjadi pada pesan yang memuat kata yang tidak pernah muncul di suatu kelas?'),
    choices: [
      ['zero', tr('That class gets probability 0, whatever the other words say', 'Kelas itu mendapat probabilitas 0, apa pun kata-kata lainnya')],
      ['small', tr('That class only gets a slightly lower score', 'Kelas itu hanya mendapat skor sedikit lebih rendah')],
      ['ignored', tr('The word is ignored, as if it were not in the message', 'Kata itu diabaikan, seolah tidak ada dalam pesan')],
    ],
  });
  lab.cleanup(() => box.destroy());
  box.onPick(() => revealPrediction());
  box.onCheck(() => revealPrediction());

  // ---- the cards under the chart -----------------------------------------------------------------

  const below = lab.ref('below');
  const card = (title, ...kids) => {
    const heading = h('h2', { class: 'lab-h', tabindex: '-1' }, title);
    const section = h('section', { class: 'card table-card tl-card' }, heading, ...kids);
    below.append(section);
    return { section, heading };
  };

  const corpusNote = h('p', { class: 'hint' });
  const infNote = h('p', { class: 'hint' });
  infNote.hidden = true;
  lab.ref('legend').after(corpusNote, infNote);

  // accuracy and the confusion matrix
  const accEl = h('div', { class: 'tl-acc' });
  const matrixHost = h('div', { class: 'table-scroll' });
  card(tr('Accuracy and confusion matrix', 'Accuracy dan confusion matrix'),
    h('p', { class: 'hint' }, tr(
      'Accuracy is the share of messages the model gets right. The matrix shows which classes get mixed up.',
      'Accuracy adalah porsi pesan yang dijawab benar oleh model. Matrix menunjukkan kelas mana yang tertukar.')),
    accEl, matrixHost);

  // the message tester
  const picker = h('select');
  const textarea = h('textarea', { rows: '3', maxlength: '300', spellcheck: 'false' });
  const sumEl = h('p', { class: 'tl-sum' });
  const live = h('p', { class: 'sr-only', role: 'status' });
  const probaEl = h('div', { class: 'tl-proba' });
  const whyEl = h('div');
  const tester = card(tr('Message tester', 'Penguji pesan'),
    h('p', { class: 'hint' }, tr(
      'Type a message or pick one from the test set. The model shows its class probabilities and which words pushed it.',
      'Ketik sebuah pesan atau pilih satu dari test set. Model menampilkan probabilitas tiap kelas dan kata mana yang mendorongnya.')),
    h('label', {}, tr('Pick a test message', 'Pilih pesan dari test set'), picker),
    h('label', {}, tr('Message', 'Pesan'), textarea),
    sumEl, live, probaEl, whyEl);

  // the mistakes
  const mistakesNote = h('p', { class: 'hint' });
  const mistakesEl = h('ul', { class: 'tl-list' });
  card(tr('Misclassified test messages', 'Pesan test yang salah diklasifikasi'), mistakesNote, mistakesEl);

  // the real-data note: a closed box inside the plot card, so the column beside the plot keeps its three cards on one screen
  const realNote = h('details', { class: 'tl-real' },
    h('summary', {}, tr('Real data note', 'Catatan data nyata')),
    h('p', {}, tr(
      'This corpus is synthetic. Every message is generated from word lists and templates written for this course, so it contains no real customers, orders or companies, and every message has a label (nothing is missing). Real messages are messier: longer, with slang, mixed languages, many more topics, one class far more common than another, and labels that people do not always agree on. Real accuracy would be lower and the vocabulary far larger. Use this lab to see how the method works, not to judge how it would do on your own messages.',
      'Korpus ini sintetis. Setiap pesan dibuat dari daftar kata dan template yang ditulis untuk kursus ini, sehingga tidak ada pelanggan, pesanan, atau perusahaan yang nyata, dan setiap pesan punya label (tidak ada yang hilang). Pesan nyata jauh lebih berantakan: lebih panjang, penuh bahasa gaul, campuran bahasa, topiknya jauh lebih banyak, satu kelas jauh lebih sering muncul daripada yang lain, dan label yang tidak selalu disepakati orang. Accuracy di dunia nyata akan lebih rendah dan vocabulary-nya jauh lebih besar. Pakai lab ini untuk melihat cara kerja metodenya, bukan untuk menilai hasilnya pada pesanmu sendiri.')));
  infNote.after(realNote);

  // ---- model ------------------------------------------------------------------------------------

  function fit() {
    const v = controls.values();
    const split = splitCorpus(corpus.labels, { classes, seed: v.seed, trainSize: v.size });
    const r = trainModel(corpus.docs, corpus.labels, split, { alpha: v.alpha, features: v.features, stopWords: v.stop ? language : false }, classes);
    state = {
      v, split, ...r,
      testDocs: split.test.map(i => corpus.docs[i]),
      testLabels: split.test.map(i => corpus.labels[i]),
    };
    // The wrong test messages, the ones the model was most sure about first.
    state.mistakeRows = r.test.mistakes.map(i => {
      const p = predictProba(r.model, state.testDocs[i]);
      const k = argmax(p);
      return { i, truth: state.testLabels[i], guess: r.model.classes[k], p: p[k], tie: p.every(x => Math.abs(x - p[k]) < 1e-9) };
    }).sort((x, y) => (y.p - x.p) || (x.i - y.i));
  }

  const argmax = p => p.reduce((best, x, i) => (x > p[best] ? i : best), 0);

  // ---- chart: the top words of each class ---------------------------------------------------------

  const HEAD = 30, ROW = 20, TOP = 10, FOOT = 30;
  function drawChart() {
    if (!state) return;
    const canvas = lab.canvas, ctx = canvas.getContext('2d'), t = theme();
    const rows = classes.map(c => ({ cls: c, words: rankedTopWords(state.model, c, TOP_K) }));
    const needed = `${TOP + rows.length * (HEAD + TOP_K * ROW) + FOOT}px`;
    if (canvas.style.getPropertyValue('--plot-h') !== needed) canvas.style.setProperty('--plot-h', needed);
    const { width, height } = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = t.plot; ctx.fillRect(0, 0, width, height);
    ctx.font = '12px system-ui, sans-serif';
    const widest = Math.max(0, ...rows.flatMap(r => r.words.map(w => ctx.measureText(w.word).width)));
    const left = Math.min(width * 0.4, Math.max(64, widest + 14));
    const counted = state.v.features === 'counts';
    const right = rows.some(r => r.words.some(w => w.logOdds === Infinity)) && counted ? 72 : 40;
    const area = Math.max(40, width - left - right - 8);
    const finite = rows.flatMap(r => r.words.map(w => w.logOdds)).filter(Number.isFinite);
    const hasInf = rows.some(r => r.words.some(w => w.logOdds === Infinity));
    const top = Math.max(1, ...finite) / (hasInf ? 0.8 : 0.95);
    let y = TOP;
    const summary = [];
    for (const r of rows) {
      const c = color(r.cls);
      const n = state.model.classDocs[state.model.classes.indexOf(r.cls)];
      ctx.fillStyle = c; ctx.fillRect(8, y + 8, 10, 10);
      ctx.font = '700 13px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = t.ink;
      ctx.fillText(r.cls, 24, y + 18);
      const nameW = ctx.measureText(r.cls).width;
      ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = t.muted;
      let detail = ` · ${tr(`${fmt(n)} training messages`, `${fmt(n)} pesan training`)}`;
      if (24 + nameW + ctx.measureText(detail).width > width - 6) detail = ` · ${fmt(n)}`;
      ctx.fillText(detail, 24 + nameW, y + 18);
      y += HEAD;
      ctx.strokeStyle = t.grid; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left, y + r.words.length * ROW); ctx.stroke();
      r.words.forEach(w => {
        ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = t.ink;
        let label = w.word;
        while (label.length > 1 && ctx.measureText(label).width > left - 12) label = label.slice(0, -1);
        ctx.fillText(label === w.word ? label : `${label}…`, left - 8, y + 14);
        const len = w.logOdds === Infinity ? area : Math.max(2, Math.min(area, (Math.max(0, w.logOdds) / top) * area));
        ctx.fillStyle = c; ctx.globalAlpha = 0.9; ctx.fillRect(left, y + 4, len, 12); ctx.globalAlpha = 1;
        ctx.textAlign = 'left'; ctx.fillStyle = t.ink; ctx.font = '600 12px system-ui, sans-serif';
        ctx.fillText(barLabel(w, counted), left + len + 5, y + 14);
        y += ROW;
      });
      summary.push(`${r.cls}: ${r.words.map(w => `${w.word} ${barLabel(w, counted)}`).join(', ')}`);
    }
    ctx.textAlign = 'left'; ctx.fillStyle = t.muted; ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(tr('Log-odds (longer bar = stronger clue)', 'Log-odds (bar lebih panjang = petunjuk lebih kuat)'), 8, height - 10);
    lab.describe(canvas, `${tr('Words with the highest log-odds, with the value of each.', 'Kata dengan log-odds tertinggi, beserta nilainya.')} ${summary.join('. ')}.`);
    infNote.hidden = !hasInf;
    infNote.textContent = hasInf ? tr(
      '∞ means the word appears in this class and in no other class. With smoothing 0 its log-odds are infinite, so the bars are ranked by how often the word was seen (shown as ×).',
      '∞ berarti kata itu muncul di kelas ini dan tidak di kelas lain. Dengan smoothing 0, log-odds-nya tak hingga, sehingga bar diurutkan menurut seberapa sering kata itu terlihat (ditulis ×).') : '';
  }

  // ---- status, accuracy, confusion matrix ---------------------------------------------------------

  function renderStatus() {
    const { test, model, v, split } = state;
    lab.setStatus(tr(
      `Test accuracy: ${pct(test.accuracy)} (${fmt(test.correct)} of ${fmt(test.n)} test messages correct).`,
      `Accuracy test: ${pct(test.accuracy)} (${fmt(test.correct)} dari ${fmt(test.n)} pesan test benar).`));
    lab.setDetail(tr(
      `Trained on ${fmt(split.train.length)} messages. The vocabulary has ${fmt(model.vocab.words.length)} different words${v.stop ? ', stop words removed' : ''}.`,
      `Dilatih dengan ${fmt(split.train.length)} pesan. Vocabulary berisi ${fmt(model.vocab.words.length)} kata berbeda${v.stop ? ', stop words dihapus' : ''}.`));
    lab.setMetrics(tr(`${fmt(split.train.length)} train · ${fmt(split.nTest)} test`, `${fmt(split.train.length)} train · ${fmt(split.nTest)} test`));
    lab.setLegend(classes.map(c => ({ kind: 'dot', color: color(c), label: c })));
    corpusNote.textContent = tr(
      `${fmt(corpus.docs.length)} synthetic messages in ${languageName} (the language of the page), ${fmt(DOCS_PER_CLASS)} per class. ${fmt(split.nTest)} of them are held back for testing and never used for training. Switch the page language to get messages in the other language.`,
      `${fmt(corpus.docs.length)} pesan sintetis dalam ${languageName} (bahasa halaman), ${fmt(DOCS_PER_CLASS)} per kelas. ${fmt(split.nTest)} di antaranya disisihkan untuk pengujian dan tidak pernah dipakai untuk training. Ganti bahasa halaman untuk mendapatkan pesan dalam bahasa lainnya.`);
  }

  function renderMatrix() {
    const { test, train } = state;
    const share = Math.max(...classes.map(c => test.confusion[classes.indexOf(c)].reduce((s, x) => s + x, 0))) / test.n;
    accEl.replaceChildren(
      h('p', { class: 'big' }, tr(`Accuracy on the test messages: ${pct(test.accuracy)} (${fmt(test.correct)} of ${fmt(test.n)})`, `Accuracy pada pesan test: ${pct(test.accuracy)} (${fmt(test.correct)} dari ${fmt(test.n)})`)),
      h('p', {}, tr(`Accuracy on the training messages: ${pct(train.accuracy)}`, `Accuracy pada pesan training: ${pct(train.accuracy)}`)),
      h('p', { class: 'hint' }, tr(`Always guessing the most common class would score ${pct(share)}.`, `Selalu menebak kelas yang paling sering muncul akan menghasilkan ${pct(share)}.`)));
    const head1 = h('tr', {}, h('th', { scope: 'col' }), h('th', { scope: 'colgroup', colspan: String(classes.length) }, tr('Predicted class', 'Kelas prediksi')));
    const head2 = h('tr', {}, h('th', { scope: 'col' }, tr('True class', 'Kelas sebenarnya')), classes.map(c => h('th', { scope: 'col' }, c)));
    const body = classes.map((rowName, i) => {
      const total = test.confusion[i].reduce((s, x) => s + x, 0) || 1;
      return h('tr', {}, h('th', { scope: 'row' }, rowName), test.confusion[i].map((n, j) => {
        const td = h('td', {}, fmt(n));
        const f = n / total;
        if (i === j) { td.style.fontWeight = '700'; td.style.background = `color-mix(in srgb, var(--accent) ${Math.round(8 + f * 40)}%, transparent)`; }
        else if (n > 0) td.style.background = `color-mix(in srgb, var(--warn) ${Math.round(12 + f * 60)}%, transparent)`;
        return td;
      }));
    });
    matrixHost.replaceChildren(h('table', { class: 'tl-matrix' },
      h('caption', {}, tr(
        'Rows: the true class. Columns: the class the model predicted. The diagonal counts the correct predictions.',
        'Baris: kelas sebenarnya. Kolom: kelas yang diprediksi model. Diagonal menghitung prediksi yang benar.')),
      h('thead', {}, head1, head2), h('tbody', {}, body)));
  }

  // ---- the tester ---------------------------------------------------------------------------------

  // Puts a message into the tester. `announce` also tells a screen reader what the model says about it.
  function loadMessage(text, { scroll = false, announce = true } = {}) {
    textarea.value = text;
    renderTester({ announce });
    if (scroll) {
      const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      tester.section.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
      tester.heading.focus({ preventScroll: true });
    }
  }

  const chipGroup = (title, items, className) => {
    const ul = h('ul', { class: 'tl-chips' }, items);
    return h('div', { class: `tl-group${className ? ` ${className}` : ''}` }, h('h4', {}, title), ul);
  };

  function strengthChip(it, toward, other) {
    const strong = Math.abs(it.contribution);
    const infinite = !Number.isFinite(strong);
    const s = infinite ? 1 : Math.min(1, strong / 3);
    const li = h('li', { class: 'tl-chip' }, it.word);
    li.style.setProperty('--c', color(toward));
    li.style.setProperty('--s', String(s));
    const b = h('b', {}, infinite
      ? tr(`rules out ${q(other)}`, `menyingkirkan ${q(other)}`)
      : `${it.count > 1 && state.v.features === 'counts' ? `×${fmt(it.count)} ` : ''}+${fmt(strong, { digits: 1 })}`);
    li.append(' ', b);
    li.title = infinite
      ? tr(`${it.word}: ${other} never had this word in training, so ${other} gets probability 0`, `${it.word}: ${other} tidak pernah memuat kata ini saat training, sehingga ${other} mendapat probabilitas 0`)
      : tr(`${it.word}: ${fmt(strong, { digits: 2 })} log-odds toward ${toward}`, `${it.word}: ${fmt(strong, { digits: 2 })} log-odds ke arah ${toward}`);
    return li;
  }

  function renderTester({ announce = true } = {}) {
    const text = textarea.value;
    const { model } = state;
    // The pick list follows the text: it shows the test message that is in the box, or the prompt.
    const at = state.testDocs.indexOf(text);
    picker.value = at >= 0 ? String(at) : '';
    const truth = at >= 0 ? state.testLabels[at] : null;
    mistakesEl.querySelectorAll('.tl-mistake').forEach(b => b.setAttribute('aria-current', String(Number(b.dataset.at) === at)));

    if (!text.trim()) {
      sumEl.textContent = tr('Type a message or pick one above to see what the model thinks.', 'Ketik pesan atau pilih satu di atas untuk melihat prediksi model.');
      probaEl.replaceChildren(); whyEl.replaceChildren();
      setLive(sumEl.textContent, announce);
      return;
    }
    const proba = predictProba(model, text);
    const ranked = classes.map((c, i) => [c, proba[model.classes.indexOf(c)], i]).sort((x, y) => (y[1] - x[1]) || (x[2] - y[2]));
    const predicted = ranked[0][0];
    const wrong = truth != null && truth !== predicted;
    const other = wrong ? truth : ranked[1][0];
    const why = pairContributions(model, text, predicted, other);
    const lost = ruledOut(model, text);
    // Every class ruled out (smoothing 0): all probabilities are equal and the first class is shown only because ties go to it.
    const tie = ranked.every(r => Math.abs(r[1] - ranked[0][1]) < 1e-9);

    let summary;
    if (why.empty) {
      summary = tr(
        `None of the words are in the training vocabulary, so the model only has the class priors. It shows ${q(predicted)}.`,
        `Tidak ada kata yang ada di vocabulary training, jadi model hanya punya prior kelas. Model menampilkan ${q(predicted)}.`);
    } else if (tie) {
      summary = tr(
        `No class is favoured (all ${pct(ranked[0][1])}); a tie goes to ${q(predicted)}.`,
        `Tidak ada kelas yang unggul (semuanya ${pct(ranked[0][1])}); jika seri, hasilnya jatuh ke ${q(predicted)}.`);
    } else {
      summary = tr(`The model says ${q(predicted)} (${pct(ranked[0][1])}).`, `Model memprediksi ${q(predicted)} (${pct(ranked[0][1])}).`);
    }
    if (truth != null) {
      summary += ` ${wrong
        ? tr(`The true class is ${q(truth)}: a mistake.`, `Kelas sebenarnya adalah ${q(truth)}: salah.`)
        : tr(`The true class is ${q(truth)}: correct.`, `Kelas sebenarnya adalah ${q(truth)}: benar.`)}`;
    }
    sumEl.textContent = summary;
    setLive(summary, announce);

    probaEl.replaceChildren(...classes.map(c => {
      const p = proba[model.classes.indexOf(c)];
      const row = h('div', { class: `tl-bar${c === predicted ? ' top' : ''}` },
        h('span', { class: 'n' }, c),
        h('span', { class: 'track', 'aria-hidden': 'true' }, h('i', { style: `width:${(p * 100).toFixed(1)}%` })),
        h('span', { class: 'v' }, pct(p)));
      row.style.setProperty('--c', color(c));
      return row;
    }));

    const role = wrong ? tr('the true class', 'kelas sebenarnya') : tr('the runner-up', 'peringkat kedua');
    const notes = [h('p', { class: 'hint' }, Math.abs(why.prior) < 0.005
      ? tr('Before reading any word, the class priors are equal, so they push neither way.', 'Sebelum membaca kata apa pun, prior kelasnya sama, sehingga tidak mendorong ke arah mana pun.')
      : tr(`Before reading any word, the class priors push ${q(why.prior > 0 ? predicted : other)} by ${fmt(Math.abs(why.prior), { digits: 2 })}.`, `Sebelum membaca kata apa pun, prior kelas mendorong ${q(why.prior > 0 ? predicted : other)} sebesar ${fmt(Math.abs(why.prior), { digits: 2 })}.`))];
    const toA = why.items.filter(i => i.side === 'a'), toB = why.items.filter(i => i.side === 'b'), flat = why.items.filter(i => i.side === 'neutral');
    const none = h('li', { class: 'tl-chip dim' }, tr('no words', 'tidak ada kata'));
    notes.push(
      chipGroup(tr(`Pushed toward ${q(predicted)} (the model's choice)`, `Mendorong ke ${q(predicted)} (pilihan model)`),
        toA.length ? toA.map(i => strengthChip(i, predicted, other)) : [none.cloneNode(true)]),
      chipGroup(tr(`Pushed toward ${q(other)} (${role})`, `Mendorong ke ${q(other)} (${role})`),
        toB.length ? toB.map(i => strengthChip(i, other, predicted)) : [none.cloneNode(true)]));
    const dim = words => words.map(w => h('li', { class: 'tl-chip dim' }, w));
    if (flat.length) {
      notes.push(chipGroup(tr('Neutral words (almost no push)', 'Kata netral (hampir tidak mendorong)'),
        flat.map(i => h('li', { class: 'tl-chip dim' }, i.word, ' ', h('b', {}, fmt(Math.abs(i.contribution), { digits: 1 }))))));
    }
    if (why.ignored.length) notes.push(chipGroup(tr('Not in the training vocabulary, so ignored', 'Tidak ada di vocabulary training, jadi diabaikan'), dim(why.ignored)));
    if (why.removed.length) notes.push(chipGroup(tr('Stop words, removed', 'Stop words, dihapus'), dim(why.removed)));

    const sumLine = Number.isFinite(why.total)
      ? tr(`Sum of the priors and all the pushes: ${signed(why.total)} for ${q(predicted)} over ${q(other)} (a positive sum favours ${q(predicted)}).`,
        `Jumlah prior dan semua dorongan: ${signed(why.total)} untuk ${q(predicted)} dibanding ${q(other)} (jumlah positif berarti ${q(predicted)} menang).`)
      : tr('The sum is not a finite number: a word that one class never saw rules that class out (smoothing 0).',
        'Jumlahnya bukan angka berhingga: kata yang tidak pernah dilihat suatu kelas menyingkirkan kelas itu (smoothing 0).');
    notes.push(h('p', { class: 'hint' }, sumLine));
    if (lost.length === classes.length) {
      notes.push(h('p', { class: 'hint' }, tr(
        'Every class has a word it never saw, so with smoothing 0 the model has no evidence and shows equal probabilities. Raise smoothing above 0.',
        'Setiap kelas punya kata yang tidak pernah dilihatnya, sehingga dengan smoothing 0 model tidak punya bukti dan menampilkan probabilitas yang sama. Naikkan smoothing di atas 0.')));
    }
    whyEl.replaceChildren(
      h('h3', { class: 'lab-h tl-why' }, tr(`Why ${q(predicted)} and not ${q(other)}?`, `Mengapa ${q(predicted)} dan bukan ${q(other)}?`)),
      ...notes);
  }

  function setLive(text, immediate) {
    clearTimeout(liveTimer);
    if (immediate) { live.textContent = text; return; }
    liveTimer = setTimeout(() => { if (!destroyed) live.textContent = text; }, 600);
  }

  function renderPicker() {
    picker.replaceChildren(h('option', { value: '' }, tr('Choose a test message…', 'Pilih pesan dari test set…')),
      ...state.testDocs.map((d, i) => h('option', { value: String(i) }, `${fmt(i + 1)}. ${clip(d, 70)}`)));
  }

  lab.on(textarea, 'input', () => renderTester({ announce: false }));
  lab.on(picker, 'change', () => { if (picker.value !== '') loadMessage(state.testDocs[Number(picker.value)]); });

  // ---- the mistakes ------------------------------------------------------------------------------

  function renderMistakes() {
    const { test, testDocs, mistakeRows: rows } = state;
    if (!rows.length) {
      mistakesNote.textContent = tr(
        `No mistakes: all ${fmt(test.n)} test messages are right. Try a smaller training size, or smoothing 0, and look again.`,
        `Tidak ada yang salah: semua ${fmt(test.n)} pesan test benar. Coba kurangi training size, atau atur smoothing ke 0, lalu lihat lagi.`);
      mistakesEl.replaceChildren();
      return;
    }
    const shown = rows.slice(0, MAX_MISTAKES);
    mistakesNote.textContent = tr(
      `${fmt(rows.length)} of ${fmt(test.n)} test messages are wrong${rows.length > shown.length ? `; the ${fmt(shown.length)} the model was most sure about are listed` : ''}. Click one to load it into the message tester and see which words pushed the model the wrong way.`,
      `${fmt(rows.length)} dari ${fmt(test.n)} pesan test salah${rows.length > shown.length ? `; ${fmt(shown.length)} yang paling diyakini model ditampilkan` : ''}. Klik salah satu untuk memuatnya ke penguji pesan dan melihat kata mana yang mendorong model ke arah yang salah.`);
    mistakesEl.replaceChildren(...shown.map(r => {
      const b = h('button', { type: 'button', class: 'tl-mistake', 'data-at': String(r.i), 'aria-current': String(testDocs[r.i] === textarea.value) },
        h('span', {}, testDocs[r.i]),
        h('span', { class: 'meta' }, r.tie
          ? tr(`True class: ${r.truth} · Tie, all classes ${pct(r.p)}: the first class, ${r.guess}, is shown`, `Kelas sebenarnya: ${r.truth} · Seri, semua kelas ${pct(r.p)}: kelas pertama, ${r.guess}, yang ditampilkan`)
          : tr(`True class: ${r.truth} · Model said: ${r.guess} (${pct(r.p)})`, `Kelas sebenarnya: ${r.truth} · Prediksi model: ${r.guess} (${pct(r.p)})`)));
      b.addEventListener('click', () => loadMessage(testDocs[r.i], { scroll: true }));
      return h('li', {}, b);
    }));
  }

  // ---- the prediction ----------------------------------------------------------------------------

  // The answer is only visible at smoothing 0: find a message with a word that one class never saw, show it in the tester.
  function revealPrediction() {
    if (box.chosen() == null || !state || state.v.alpha !== 0) return;
    const hit = findRuledOut(state.model, [textarea.value, ...state.testDocs]);
    if (!hit) return;
    const message = hit.index === 0 ? textarea.value : state.testDocs[hit.index - 1];
    if (hit.index > 0) loadMessage(message);
    const first = hit.rule[0];
    const every = hit.rule.length === classes.length;
    box.reveal('zero', tr(
      `In the message ${q(clip(message, 90))} the word ${q(first.words[0])} never appeared in a ${q(first.cls)} training message. With smoothing 0 that makes the likelihood of ${q(first.cls)} exactly 0, so ${q(first.cls)} gets probability 0 (see the tester).${every ? ' Here every class has such a word, so the model has no evidence and shows equal probabilities.' : ''} Raise smoothing above 0 and the class comes back.`,
      `Pada pesan ${q(clip(message, 90))}, kata ${q(first.words[0])} tidak pernah muncul di pesan training kelas ${q(first.cls)}. Dengan smoothing 0, likelihood ${q(first.cls)} menjadi tepat 0, sehingga ${q(first.cls)} mendapat probabilitas 0 (lihat di penguji).${every ? ' Di sini setiap kelas punya kata seperti itu, sehingga model tidak punya bukti dan menampilkan probabilitas yang sama.' : ''} Naikkan smoothing di atas 0 dan kelas itu kembali.`));
  }

  // ---- wiring ------------------------------------------------------------------------------------

  const firstMessage = () => (state.mistakeRows.length ? state.testDocs[state.mistakeRows[0].i] : state.testDocs[0]);

  // After any change that is complete: refit, redraw everything, then check the prediction.
  function settle() {
    if (destroyed) return;
    const keep = textarea.value;
    fit();
    renderPicker();
    drawChart(); renderStatus(); renderMatrix(); renderMistakes();
    // The tester keeps its text through a setting change, so the learner can watch the same message change.
    textarea.value = keep || firstMessage();
    renderTester({ announce: false });
    revealPrediction();
  }

  lab.onReset(() => {
    for (const [name, v] of Object.entries(DEFAULTS)) controls.set(name, v);
    box.reset();
    textarea.value = '';
    settle();
  });
  lab.onTheme(drawChart);
  lab.onResize(drawChart);
  settle();
  return lab.destroy;
}
