// Attention lab, built on the kit. Two parts in one lab.
//   Part 1, trace attention: a bundled sentence or your own text is split into tokens (words, characters or byte-pair
//   merges), each token gets a small vector (and optionally a position code), and four hand-set heads turn that into an
//   attention weight matrix. The heatmap on the main canvas shows the matrix of the chosen head (with an optional causal
//   mask); the token list and the arc chart show, for one clicked token, the weighted mix it takes from the others.
//   Part 2, compare models: the customer messages of the Text lab (sims/ml/textdata.js) are classified by bag-of-words
//   Naive Bayes (the intermediate baseline), by frozen pretrained word vectors plus logistic regression, and by the
//   fine-tuned variant, at a chosen number of labelled messages. A chart shows test accuracy and macro F1 at every size
//   with the current size marked, a table gives the numbers, and a list shows the misclassified messages of one model.
// GENERATED DATA ONLY. The sentences, their vectors and the four heads are written by hand; the messages are generated;
// the "pretrained" vectors are learned in this page from an unlabelled generated corpus, never downloaded. There is no
// real data and nothing is missing, and the lab says so in its data note.
// The math is in sims/ml/attentionlab.js (on top of sims/ml/attention.js); this file draws and wires.
import { createLab, clusterColor, theme, predictBox, tr, fmt, pct, locale } from '../kit/index.js';
import {
  sentences, traceAttention, topMix, HEADS, MAX_TEXT, MAX_TOKENS, SIZES, bpeMergesMax, trainTaskVectors, taskCorpora, scoreSize,
  misclassified, winnerOf,
} from '../ml/attentionlab.js';

export const DEFAULTS = { example: 's0', tokenizer: 'words', merges: 12, positions: true, head: 'meaning', causal: false, size: 8, model: 'naiveBayes' };
const PREDICT_SIZE = 8;
const Y_MIN = 0.1;
const SHOWN_MISTAKES = 3;
const MODELS = ['naiveBayes', 'frozen', 'fineTuned'];
const MODEL_COLOR_SLOT = { naiveBayes: 6, frozen: 4, fineTuned: 5 };
const MODEL_MARK = { naiveBayes: 'circle', frozen: 'square', fineTuned: 'triangle' };
const MARK_GLYPH = { circle: '●', square: '■', triangle: '▲' };
const modelColor = m => clusterColor(MODEL_COLOR_SLOT[m]);

const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid);
  return e;
};
const q = s => `“${s}”`;
const clip = (text, n) => (text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const headName = key => ({
  meaning: tr('Head 1: similar meaning', 'Head 1: makna mirip'),
  nearby: tr('Head 2: nearby words', 'Head 2: kata berdekatan'),
  action: tr('Head 3: finds the action', 'Head 3: mencari kata kerja'),
  untrained: tr('Head 4: untrained (random)', 'Head 4: belum dilatih (acak)'),
})[key];
const headNote = key => ({
  meaning: tr('Compares the meaning of two tokens (a dot product): a token looks hardest at itself and at tokens like it. Set by hand.',
    'Membandingkan makna dua token (dot product): sebuah token paling banyak melihat dirinya sendiri dan token yang mirip. Diatur dengan tangan.'),
  nearby: tr('Uses only the position code: tokens look at their neighbours. Turn the position codes off and it has nothing to go on. Set by hand.',
    'Hanya memakai kode posisi: token melihat tetangganya. Jika kode posisi dimatikan, head ini tidak punya petunjuk. Diatur dengan tangan.'),
  action: tr('Names and things look for the action word of the sentence; the other tokens spread their attention. Set by hand.',
    'Nama dan benda mencari kata kerja dalam kalimat; token lain membagi perhatiannya merata. Diatur dengan tangan.'),
  untrained: tr('Random weights, as before any training: a pattern with no meaning.',
    'Bobot acak, seperti sebelum dilatih: pola tanpa makna.'),
})[key];
const modelName = m => ({
  naiveBayes: tr('Bag of words + Naive Bayes', 'Bag of words + Naive Bayes'),
  frozen: tr('Frozen pretrained vectors + logistic regression', 'Vektor pretrained dibekukan + regresi logistik'),
  fineTuned: tr('Fine-tuned pretrained vectors', 'Vektor pretrained yang di-fine-tune'),
})[m];
const modelShort = m => ({
  naiveBayes: tr('Bag of words', 'Bag of words'),
  frozen: tr('Frozen vectors', 'Vektor dibekukan'),
  fineTuned: tr('Fine-tuned', 'Di-fine-tune'),
})[m];

const CSS = `
.al-part{margin:18px 0 0;padding-top:12px;border-top:1px solid var(--line);font-size:13px;font-weight:700;color:var(--ink)}
.al-part.first{margin-top:0;padding-top:0;border-top:0}
.al-text{display:block;width:100%;max-width:100%;box-sizing:border-box;margin-top:6px;padding:8px;border:1px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;font-size:13px;font-weight:400}
.al-note{margin:6px 0 0;font-size:12.5px;color:var(--muted)}
.al-real{margin:8px 0 0;font-size:13.5px}
.al-real summary{cursor:pointer;font-weight:650;padding:4px 0}
.al-real p{margin:6px 0 0;color:var(--muted)}
.al-chips{display:flex;flex-wrap:wrap;gap:6px;list-style:none;margin:10px 0 0;padding:0}
.al-chip{border:1.5px solid var(--line-strong);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;font-size:13.5px;line-height:1.3;padding:3px 8px;cursor:pointer;overflow-wrap:anywhere}
.al-short{display:none}
.al-chip:hover{background:var(--accent-soft)}
.al-chip[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:var(--accent-ink);font-weight:700}
.al-chip.unknown{border-style:dashed}
.al-chip small{margin-left:5px;opacity:.78;font-size:11.5px}
.al-legend{display:flex;flex-wrap:wrap;gap:4px 14px;margin:6px 0 0;font-size:12.5px}
.al-legend i{font-style:normal;margin-right:4px}
.al-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
.al-table caption{caption-side:top;text-align:left;color:var(--muted);font-size:12.5px;padding-bottom:4px}
.al-table :is(th,td){border:1px solid var(--line);padding:4px 8px;text-align:right;font-variant-numeric:tabular-nums}
.al-table th[scope=row]{text-align:left;font-weight:600;white-space:normal}
.al-table thead th{background:var(--surface-2);text-align:right}
.al-table thead th:first-child{text-align:left}
.al-table tr.inspected :is(th,td){background:var(--accent-soft)}
.al-table .best{font-weight:700}
.al-mistakes{margin:14px 0 0;font-size:14px;font-weight:650}
.al-list{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:6px}
.al-list li{border:1px solid var(--line);border-radius:8px;padding:5px 10px;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media (max-width:860px){
  .al-list li{white-space:normal;overflow-wrap:anywhere}
  .al-chips{gap:8px}
  .al-chip{min-height:40px;padding:6px 12px}
}
@media (max-width:640px){
  .al-table{font-size:12.5px}
  .al-table :is(th,td){padding:4px 6px}
  .al-table th[scope=row] .al-full{display:none}
  .al-table th[scope=row] .al-short{display:inline}
}
@media (min-width:1100px){
  .lab-stage:is(:fullscreen,.expanded) .al-card{min-height:0;overflow:auto;overscroll-behavior:contain;padding:14px 18px}
  .lab-stage:is(:fullscreen,.expanded) .al-card .al-legend{display:none}
  .lab-stage:is(:fullscreen,.expanded) .al-tight > .hint:first-of-type{display:none}
  .lab-stage:is(:fullscreen,.expanded) .al-card .al-mistakes{margin-top:8px}
}
`;

function setupCanvas(canvas) {
  const { width, height } = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width, height };
}

// Canvas text never wraps, so it is measured: the text is cut with an ellipsis only when it is wider than maxW.
function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxW) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}
// The first of several wordings that fits, else the last one cut to fit.
function bestFit(ctx, variants, maxW) {
  return fitText(ctx, variants.find(t => ctx.measureText(t).width <= maxW) ?? variants[variants.length - 1], maxW);
}

const accentInk = () => getComputedStyle(document.documentElement).getPropertyValue('--accent-ink').trim() || '#fff';

export function mount(root) {
  const language = locale();
  const exampleList = sentences(language);
  const mergesMax = bpeMergesMax(language);
  let alive = true;
  let timer = 0;

  const lab = createLab(root, {
    title: tr('Attention: trace it, then compare models', 'Attention: telusuri, lalu bandingkan model'),
    hint: tr(
      'Part 1 shows who looks at whom inside one small attention layer. Part 2 compares three text models on generated customer messages.',
      'Bagian 1 menunjukkan siapa melihat siapa di dalam satu lapisan attention kecil. Bagian 2 membandingkan tiga model teks pada pesan pelanggan buatan.'),
    status: true, legend: true,
    canvasLabel: tr('Heatmap of attention weights: one row for each token that looks, one column for each token looked at',
      'Heatmap bobot attention: satu baris untuk tiap token yang melihat, satu kolom untuk tiap token yang dilihat'),
    settingsTitle: tr('Controls', 'Pengaturan'),
  });
  // The heatmap is a picture: announced as an image (clicking a row traces it; the token list is the keyboard way).
  lab.canvas.setAttribute('role', 'img');
  lab.canvas.removeAttribute('tabindex');
  const style = h('style');
  style.textContent = CSS;
  lab.root.prepend(style);
  lab.cleanup(() => { alive = false; clearTimeout(timer); });

  // ---- state ------------------------------------------------------------------------------------

  let trace = null;
  let sel = 1;
  // The first draw of labelled messages. Over seeds 1 to 12 the pretrained vectors beat bag of words at 8 messages in 9 (English) and 7
  // (Indonesian) of 12 draws; seed 1 is the Indonesian exception, so the Indonesian lab starts on seed 2, a typical draw.
  const firstSeed = language === 'id' ? 2 : 1;
  let seed = firstSeed;
  let vectors = null;
  let corpora = null;
  let scores = new Map();   // labelled size -> { nLabelled, naiveBayes, frozen, fineTuned }
  let generation = 0;
  let heatGeom = null;

  // ---- controls ---------------------------------------------------------------------------------

  const controls = lab.panel([
    { type: 'note', text: tr('Part 1: trace attention', 'Bagian 1: telusuri attention') },
    {
      name: 'example', type: 'select', label: tr('Example sentence', 'Kalimat contoh'), value: DEFAULTS.example,
      options: [...exampleList.map(s => [s.key, s.text]), ['custom', tr('Your own text', 'Teksmu sendiri')]],
    },
    {
      name: 'tokenizer', type: 'select', label: tr('Tokenizer', 'Tokenizer'), value: DEFAULTS.tokenizer,
      options: [['words', tr('Words', 'Kata')], ['chars', tr('Characters', 'Karakter')], ['bpe', tr('Byte-pair merges (BPE)', 'Byte-pair merge (BPE)')]],
    },
    { name: 'merges', type: 'range', label: tr('BPE merges', 'Merge BPE'), min: 0, max: mergesMax, step: 1, value: Math.min(DEFAULTS.merges, mergesMax), format: v => fmt(v) },
    { name: 'positions', type: 'toggle', label: tr('Add position codes', 'Tambahkan kode posisi'), value: DEFAULTS.positions },
    {
      name: 'head', type: 'select', label: tr('Attention head', 'Head attention'), value: DEFAULTS.head,
      options: HEADS.map(x => [x.key, headName(x.key)]),
    },
    { name: 'causal', type: 'toggle', label: tr('Hide the future (causal mask)', 'Sembunyikan masa depan (causal mask)'), value: DEFAULTS.causal },
    { type: 'note', text: tr('Part 2: compare models', 'Bagian 2: bandingkan model') },
    {
      name: 'size', type: 'range', label: tr('Labelled messages', 'Pesan berlabel'), min: 0, max: SIZES.length - 1, step: 1,
      value: SIZES.indexOf(DEFAULTS.size), format: v => tr(`${fmt(SIZES[v])} messages`, `${fmt(SIZES[v])} pesan`),
    },
    {
      name: 'model', type: 'select', label: tr('Show mistakes of', 'Tampilkan kesalahan dari'), value: DEFAULTS.model,
      options: MODELS.map(m => [m, modelName(m)]),
    },
    { name: 'newSample', type: 'button', label: tr('New sample', 'Sampel baru'), onClick: () => newSample() },
    {
      type: 'note',
      text: tr('With few labels the result changes a lot from one draw to the next: press New sample a few times.',
        'Dengan sedikit label, hasilnya sangat berubah dari satu pengambilan ke pengambilan berikutnya: tekan Sampel baru beberapa kali.'),
    },
  ], onControl);

  const el = controls.el;
  const notes = [...el.querySelectorAll('p.hint')];
  notes[0].className = 'al-part first';
  notes[1].className = 'al-part';
  const [exampleSelect, , headSelect] = el.querySelectorAll('select');
  const textInput = h('input', { type: 'text', class: 'al-text', maxlength: String(MAX_TEXT), spellcheck: 'false', autocomplete: 'off', id: 'al-text' });
  textInput.value = exampleList[0].text;
  exampleSelect.closest('label').after(h('label', { for: 'al-text' },
    tr(`Text to trace (up to ${fmt(MAX_TEXT)} characters)`, `Teks yang ditelusuri (maksimal ${fmt(MAX_TEXT)} karakter)`), textInput));
  const headExplain = h('p', { class: 'al-note' });
  headSelect.closest('label').after(headExplain);

  // ---- Quick Quiz -------------------------------------------------------------------------------

  const box = predictBox(lab.ref('below'), {
    name: 'predict-attention',
    hint: tr(`Set Labelled messages to ${PREDICT_SIZE}, wait for the chart to fill, then check again.`,
      `Atur Pesan berlabel ke ${PREDICT_SIZE}, tunggu grafik terisi, lalu periksa lagi.`),
    question: tr('With only 8 labelled messages, which model will do best: bag of words or the pretrained vectors?',
      'Dengan hanya 8 pesan berlabel, model mana yang paling baik: bag of words atau vektor pretrained?'),
    choices: [
      ['bow', tr('Bag of words (Naive Bayes)', 'Bag of words (Naive Bayes)')],
      ['pretrained', tr('The pretrained vectors', 'Vektor pretrained')],
      ['tie', tr('About the same (within 3 points)', 'Hampir sama (selisih di bawah 3 poin)')],
    ],
  });
  lab.cleanup(() => box.destroy());
  // The Quick Quiz asks about this size: its numbers stay off the chart and table until the answer is checked.
  const predicting = () => sizeNow() === PREDICT_SIZE && !box.answered;
  box.onCheck(() => { revealPrediction(); renderCompare(); });

  // ---- data note (a closed box under the legend) ------------------------------------------------

  const dataNote = h('details', { class: 'al-real' },
    h('summary', {}, tr('Data note', 'Catatan data')),
    h('p', {}, tr(
      'Everything here is generated or written for this course. The sentences, their word vectors (about 20 words) and the four heads are set by hand to show four typical patterns; a real model learns its vectors and heads from data. The messages are the synthetic customer messages of the Text lab. The pretrained vectors are learned in this page, from about 900 generated messages with their labels thrown away; nothing is downloaded. Because the labelled and unlabelled messages come from the same generator, transfer is easier here than with real text, where the pretraining text differs from your task. There is no real data in this lab and no missing value, so there is nothing to handle for NA.',
      'Semua yang ada di sini dibuat atau ditulis untuk kursus ini. Kalimat, vektor kata (sekitar 20 kata), dan keempat head diatur dengan tangan untuk menunjukkan empat pola yang umum; model sungguhan mempelajari vektor dan head-nya dari data. Pesannya adalah pesan pelanggan sintetis dari Text lab. Vektor pretrained dipelajari di halaman ini, dari sekitar 900 pesan buatan yang labelnya dibuang; tidak ada yang diunduh. Karena pesan berlabel dan tanpa label berasal dari generator yang sama, transfer di sini lebih mudah daripada dengan teks nyata, yang teks pretraining-nya berbeda dari tugasmu. Lab ini tidak memakai data nyata dan tidak ada nilai yang hilang, jadi tidak ada NA yang perlu ditangani.')));
  lab.ref('legend').after(dataNote);

  // ---- cards beside the heatmap (the layout rule places them) -------------------------------------

  const below = lab.ref('below');
  const tokenCard = h('section', { class: 'card table-card al-card al-tight' },
    h('h2', { class: 'lab-h' }, tr('Tokens', 'Token')),
    h('p', { class: 'hint' }, tr('Click a token, or press Enter on it, to trace it. Clicking a row of the heatmap works too. Each token has an id from the vocabulary.',
      'Klik sebuah token, atau tekan Enter, untuk menelusurinya. Mengeklik sebuah baris heatmap juga bisa. Setiap token punya id dari vocabulary.')));
  const chipList = h('ul', { class: 'al-chips' });
  const tokenNote = h('p', { class: 'al-note' });
  tokenCard.append(chipList, tokenNote);
  below.append(tokenCard);

  const arcCanvas = lab.chartCard(
    tr('Where one token looks', 'Ke mana satu token melihat'),
    tr('Arcs run from the traced token to the tokens it mixes in; a thicker arc is a bigger weight.',
      'Busur menghubungkan token yang ditelusuri dengan token yang dicampurnya; busur lebih tebal berarti bobot lebih besar.'),
    230);
  const chartCanvas = lab.chartCard(
    tr('Test accuracy and macro F1 against labelled messages', 'Accuracy test dan macro F1 menurut jumlah pesan berlabel'),
    tr('One draw of labelled messages per size. Dashed line: your size. Dotted line: guessing at random (33%). The pretrained vectors are learned in this page from generated unlabelled messages; nothing is downloaded.',
      'Satu pengambilan pesan berlabel per ukuran. Garis putus-putus: ukuranmu. Garis titik-titik: menebak acak (33%). Vektor pretrained dipelajari di halaman ini dari pesan buatan tanpa label; tidak ada yang diunduh.'),
    300);
  arcCanvas.closest('.card').classList.add('al-card', 'al-tight');
  chartCanvas.closest('.card').classList.add('al-card', 'al-tight');
  const chartLegend = h('div', { class: 'al-legend' });
  chartCanvas.closest('.chart').before(chartLegend);

  const resultsCaption = h('p', { class: 'hint' });
  const tableHost = h('div', { class: 'table-scroll' });
  const mistakesHead = h('h3', { class: 'al-mistakes' });
  const mistakesNote = h('p', { class: 'hint' });
  const mistakesList = h('ul', { class: 'al-list' });
  const resultsCard = h('section', { class: 'card table-card al-card al-tight' },
    h('h2', { class: 'lab-h' }, tr('Results at this size', 'Hasil pada ukuran ini')),
    resultsCaption, tableHost, mistakesHead, mistakesNote, mistakesList);
  below.append(resultsCard);

  // ---- helpers ----------------------------------------------------------------------------------

  const v = () => ({ ...controls.values(), text: textInput.value });
  const sizeNow = () => SIZES[controls.get('size')];

  // ---- part 1: trace ----------------------------------------------------------------------------

  function retrace() {
    const c = v();
    trace = traceAttention({
      text: c.text, language, tokenizer: c.tokenizer, merges: c.merges, positions: c.positions, causal: c.causal, head: c.head,
    });
    sel = clamp(sel, 0, Math.max(0, trace.n - 1));
    headExplain.textContent = headNote(c.head);
    controls.show('merges', c.tokenizer === 'bpe');
  }

  function renderTokens() {
    chipList.replaceChildren(...trace.tokens.map((t, i) => {
      const b = h('button', {
        type: 'button', class: `al-chip${t.kind === 'unknown' ? ' unknown' : ''}`, 'aria-pressed': String(i === sel),
        'aria-label': tr(`Token ${i + 1}: ${t.text === ' ' ? 'space' : t.text}, id ${t.id}${t.kind === 'unknown' ? ', not in the vocabulary' : ''}`,
          `Token ${i + 1}: ${t.text === ' ' ? 'spasi' : t.text}, id ${t.id}${t.kind === 'unknown' ? ', tidak ada di vocabulary' : ''}`),
        title: tr(`Token ${i + 1}, id ${t.id}`, `Token ${i + 1}, id ${t.id}`),
      }, t.display, h('small', {}, `#${fmt(t.id)}`));
      b.addEventListener('click', () => select(i));
      return h('li', {}, b);
    }));
    const c = v();
    const lines = [];
    if (trace.unknown) lines.push(tr(`Words not in the vocabulary: ${fmt(trace.unknown)} (dashed; they share the id of <unk>).`, `Kata yang tidak ada di vocabulary: ${fmt(trace.unknown)} (garis putus-putus; berbagi id dengan <unk>).`));
    if (c.tokenizer === 'bpe') lines.push(tr('A · marks the end of a word.', 'Tanda · menandai akhir sebuah kata.'));
    if (c.tokenizer === 'chars') lines.push(tr('A ␣ is a space.', 'Tanda ␣ berarti spasi.'));
    if (c.tokenizer !== 'words') lines.push(tr(
      'A token that is not a whole word has no meaning in this lab: it gets a made-up vector, so its attention is arbitrary.',
      'Token yang bukan kata utuh tidak punya makna di lab ini: ia mendapat vektor karangan, sehingga attention-nya acak.'));
    if (trace.cut) lines.push(tr(`Only the first ${fmt(MAX_TOKENS)} tokens (and ${fmt(MAX_TEXT)} characters) are traced.`, `Hanya ${fmt(MAX_TOKENS)} token pertama (dan ${fmt(MAX_TEXT)} karakter) yang ditelusuri.`));
    tokenNote.textContent = lines.join(' ');
    tokenNote.hidden = !lines.length;
  }

  function markSelection() {
    [...chipList.querySelectorAll('button')].forEach((b, i) => b.setAttribute('aria-pressed', String(i === sel)));
  }

  function select(i) {
    sel = clamp(i, 0, Math.max(0, trace.n - 1));
    markSelection();
    drawHeat(); drawArcs(); renderStatus();
  }

  function drawHeat() {
    const canvas = lab.canvas;
    const { ctx, width, height } = setupCanvas(canvas);
    const t = theme();
    ctx.fillStyle = t.plot; ctx.fillRect(0, 0, width, height);
    heatGeom = null;
    if (!trace || !trace.n) {
      ctx.fillStyle = t.muted; ctx.font = '14px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(tr('Type some text to trace.', 'Ketik teks untuk ditelusuri.'), width / 2, height / 2);
      lab.describe(canvas, tr('The heatmap is empty: there is no text to trace.', 'Heatmap kosong: tidak ada teks yang ditelusuri.'));
      return;
    }
    const n = trace.n, ink = accentInk();
    const labelFont = n > 14 ? 10 : 13;
    ctx.font = `${labelFont}px system-ui, sans-serif`;
    const widest = Math.max(...trace.tokens.map(k => ctx.measureText(k.display).width));
    const rowLabelW = Math.min(96, Math.ceil(widest) + 6);
    const titleTop = 22, titleLeft = 18;
    // Column labels sit flat when a cell is wide enough for them, else they are tilted.
    const roughCell = (width - titleLeft - rowLabelW - 16) / n;
    const flat = roughCell >= widest + 6;
    const colLabelH = flat ? labelFont + 8 : Math.min(60, Math.ceil(widest * 0.72) + 10);
    const topPad = titleTop + colLabelH + 4;
    const x0base = titleLeft + rowLabelW + 8;
    const footerH = 22;
    const s = Math.max(8, Math.floor(Math.min((width - x0base - 12) / n, (height - topPad - footerH) / n)));
    const gridW = s * n;
    const x0 = x0base + Math.max(0, Math.floor((width - x0base - 12 - gridW) / 2));
    const y0 = topPad;
    const { weights } = trace;
    const causal = v().causal;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = x0 + j * s, y = y0 + i * s;
        if (causal && j > i) {
          ctx.save(); ctx.beginPath(); ctx.rect(x, y, s, s); ctx.clip();
          ctx.strokeStyle = t.grid; ctx.lineWidth = 1; ctx.beginPath();
          for (let k = -s; k < 2 * s; k += 6) { ctx.moveTo(x + k, y + s); ctx.lineTo(x + k + s, y); }
          ctx.stroke(); ctx.restore();
          continue;
        }
        const w = weights[i][j];
        ctx.globalAlpha = clamp(Math.pow(w, 0.7), 0, 1);
        ctx.fillStyle = t.accent; ctx.fillRect(x, y, s, s);
        ctx.globalAlpha = 1;
        if (s >= 32) {
          ctx.fillStyle = Math.pow(w, 0.7) > 0.55 ? ink : t.ink;
          ctx.font = `${s >= 44 ? 13 : 11}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(pct(w, 0), x + s / 2, y + s / 2);
          ctx.textBaseline = 'alphabetic';
        }
      }
    }
    // grid lines
    ctx.strokeStyle = t.grid; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = 0; k <= n; k++) { ctx.moveTo(x0, y0 + k * s); ctx.lineTo(x0 + gridW, y0 + k * s); ctx.moveTo(x0 + k * s, y0); ctx.lineTo(x0 + k * s, y0 + gridW); }
    ctx.stroke();
    // the traced row
    ctx.strokeStyle = t.ink; ctx.lineWidth = 2.5; ctx.strokeRect(x0 - 1, y0 + sel * s, gridW + 2, s);
    ctx.lineWidth = 1;
    // labels
    ctx.font = `${labelFont}px system-ui, sans-serif`;
    trace.tokens.forEach((k, i) => {
      const bold = i === sel;
      ctx.font = `${bold ? '700 ' : ''}${labelFont}px system-ui, sans-serif`;
      ctx.fillStyle = t.ink; ctx.textAlign = 'right';
      ctx.fillText(clip(k.display, 12), x0 - 6, y0 + i * s + s / 2 + labelFont * 0.35);
      ctx.save();
      if (flat) { ctx.textAlign = 'center'; ctx.fillStyle = t.ink; ctx.fillText(clip(k.display, 12), x0 + i * s + s / 2, y0 - 6); } else {
        ctx.translate(x0 + i * s + s / 2 + labelFont * 0.3, y0 - 6); ctx.rotate(-Math.PI / 4); ctx.textAlign = 'left'; ctx.fillStyle = t.ink; ctx.fillText(clip(k.display, 12), 0, 0);
      }
      ctx.restore();
    });
    // axis titles
    ctx.font = '600 11.5px system-ui, sans-serif'; ctx.fillStyle = t.muted; ctx.textAlign = 'center';
    ctx.fillText(tr('Token looked at (key) →', 'Token yang dilihat (key) →'), x0 + gridW / 2, 14);
    ctx.save(); ctx.translate(12, y0 + gridW / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText(tr('Token that looks (query) →', 'Token yang melihat (query) →'), 0, 0); ctx.restore();
    ctx.textAlign = 'left'; ctx.font = '11.5px system-ui, sans-serif';
    const footer = bestFit(ctx, [
      tr('Each row adds up to 100%. Click a row to trace it.', 'Setiap baris berjumlah 100%. Klik sebuah baris untuk menelusurinya.'),
      tr('Each row adds up to 100%. Click a row.', 'Setiap baris berjumlah 100%. Klik sebuah baris.'),
      tr('Each row adds up to 100%.', 'Setiap baris berjumlah 100%.'),
    ], width - 16);
    ctx.fillText(footer, clamp(x0, 8, width - 8 - ctx.measureText(footer).width), y0 + gridW + 16);
    heatGeom = { x0, y0, s, n };

    const head = v().head;
    const summary = trace.tokens.map((k, i) => {
      const top = topMix(weights, trace.tokens, i, 1)[0];
      return `${k.display}: ${top.token.display} ${pct(top.weight, 0)}`;
    }).join('; ');
    lab.describe(canvas, tr(
      `Attention weights of ${headName(head)}. Each row adds up to 100%. The largest weight in each row: ${summary}.`,
      `Bobot attention ${headName(head)}. Setiap baris berjumlah 100%. Bobot terbesar di tiap baris: ${summary}.`));
  }

  function drawArcs() {
    const { ctx, width, height } = setupCanvas(arcCanvas);
    const t = theme(), ink = accentInk();
    ctx.fillStyle = t.plot; ctx.fillRect(0, 0, width, height);
    if (!trace || !trace.n) {
      ctx.fillStyle = t.muted; ctx.font = '14px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(tr('Type some text to trace.', 'Ketik teks untuk ditelusuri.'), width / 2, height / 2);
      lab.describe(arcCanvas, tr('There is no text to trace.', 'Tidak ada teks yang ditelusuri.'));
      return;
    }
    const n = trace.n, row = trace.weights[sel];
    const margin = 12, slot = (width - 2 * margin) / n;
    const bw = Math.max(8, Math.min(92, slot - 4)), bh = 26;
    const boxY = height - bh - 24;
    const cx = k => margin + slot * (k + 0.5);
    const maxArc = Math.max(40, boxY - 42);
    // title line
    ctx.fillStyle = t.ink; ctx.font = '600 12.5px system-ui, sans-serif'; ctx.textAlign = 'left';
    const tracedTitle = tr(`Traced: ${q(trace.tokens[sel].display)}`, `Ditelusuri: ${q(trace.tokens[sel].display)}`);
    ctx.fillText(bestFit(ctx, [`${tracedTitle} · ${headName(trace.head)}`, tracedTitle], width - 2 * margin), margin, 18);
    // arcs: the small ones first, so the big ones sit on top
    const order = row.map((w, j) => [w, j]).filter(([w]) => w > 0).sort((a, b) => a[0] - b[0]);
    const labels = [];
    for (const [w, j] of order) {
      const lw = Math.max(1, w * 16), alpha = 0.28 + 0.62 * Math.min(1, w * 2.2);
      ctx.globalAlpha = alpha; ctx.strokeStyle = t.accent; ctx.lineWidth = lw; ctx.lineCap = 'round';
      ctx.beginPath();
      let apexY;
      if (j === sel) {
        const r = Math.min(26, 10 + w * 30);
        ctx.arc(cx(sel), boxY - r * 0.7, r, 0.15 * Math.PI, 0.85 * Math.PI, true);
        apexY = boxY - r * 1.7 - 4;
      } else {
        const dx = Math.abs(cx(j) - cx(sel));
        const hh = Math.min(maxArc, 14 + dx * 0.55);
        ctx.moveTo(cx(sel), boxY); ctx.quadraticCurveTo((cx(sel) + cx(j)) / 2, boxY - 2 * hh, cx(j), boxY);
        apexY = boxY - hh - lw / 2 - 3;
      }
      ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1;
      if (w >= 0.07 && slot >= 16) labels.push([j === sel ? cx(sel) : (cx(sel) + cx(j)) / 2, apexY, pct(w, 0)]);
    }
    ctx.fillStyle = t.ink; ctx.font = '600 11.5px system-ui, sans-serif'; ctx.textAlign = 'center';
    for (const [x, y, text] of labels) ctx.fillText(text, x, Math.max(38, y));
    // token boxes
    const fontSize = bw < 26 ? 10 : 12.5;
    trace.tokens.forEach((k, j) => {
      const x = cx(j) - bw / 2, picked = j === sel;
      ctx.fillStyle = picked ? t.accent : t.surface; ctx.strokeStyle = picked ? t.accent : t.grid;
      ctx.setLineDash(k.kind === 'unknown' ? [4, 3] : []);
      ctx.beginPath(); ctx.roundRect(x, boxY, bw, bh, 6); ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
      ctx.fillStyle = picked ? ink : t.ink; ctx.font = `${picked ? '700 ' : ''}${fontSize}px system-ui, sans-serif`; ctx.textAlign = 'center';
      let label = k.display;
      while (label.length > 1 && ctx.measureText(label).width > bw - 4) label = label.slice(0, -1);
      ctx.fillText(label === k.display ? label : `${label}…`, cx(j), boxY + bh / 2 + 4);
      if (slot >= 30 && row[j] > 0) {
        ctx.fillStyle = t.muted; ctx.font = '11px system-ui, sans-serif'; ctx.fillText(pct(row[j], 0), cx(j), boxY + bh + 15);
      }
    });
    const mix = topMix(trace.weights, trace.tokens, sel, 4);
    lab.describe(arcCanvas, mixSentence(mix));
  }

  function mixSentence(mix) {
    const tok = trace.tokens[sel];
    const parts = mix.map(m => `${pct(m.weight, 0)} ${q(m.token.display)} #${m.index + 1}`).join(' + ');
    return tr(`The output for token ${sel + 1}, ${q(tok.display)}, is a mix of the tokens: ${parts}.`,
      `Output untuk token ${sel + 1}, ${q(tok.display)}, adalah campuran token: ${parts}.`);
  }

  // ---- part 2: compare ---------------------------------------------------------------------------

  function ensureScore(n) {
    if (!corpora) return null;
    if (!scores.has(n)) scores.set(n, scoreSize({ train: corpora.train, test: corpora.test, vectors, n, seed }));
    return scores.get(n);
  }

  // A new draw makes the revealed numbers of the Quick Quiz stale: the feedback goes, the learner's chosen answer stays.
  function clearFeedback() {
    if (!box.answered) return;
    const key = box.chosen();
    box.reset();
    const radio = key == null ? null : [...box.root.querySelectorAll('input[type=radio]')].find(i => i.value === key);
    if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change')); }
  }

  function startScoring() {
    generation++;
    const mine = generation;
    clearTimeout(timer);
    scores = new Map();
    corpora = null;
    clearFeedback();
    renderCompare();
    timer = setTimeout(() => {
      if (!alive || mine !== generation) return;
      if (!vectors) vectors = trainTaskVectors(language);
      corpora = taskCorpora(language, seed);
      const order = [sizeNow(), ...SIZES.filter(n => n !== sizeNow())];
      const step = () => {
        if (!alive || mine !== generation) return;
        const n = order.shift();
        if (n == null) return;
        ensureScore(n);
        renderCompare();
        timer = setTimeout(step, 0);
      };
      step();
    }, 30);
  }

  function newSample() {
    seed = seed % 999 + 1;
    startScoring();
  }

  function sizeLabel(n) { return tr(`${fmt(n)} messages`, `${fmt(n)} pesan`); }

  function drawCompare() {
    const { ctx, width, height } = setupCanvas(chartCanvas);
    const t = theme();
    ctx.fillStyle = t.plot; ctx.fillRect(0, 0, width, height);
    const m = { l: 44, r: 14, bottom: 40, gap: 34, top: 22 };
    const panelH = Math.max(40, (height - m.top - m.bottom - m.gap) / 2);
    const lo = Math.log(SIZES[0]), hi = Math.log(SIZES[SIZES.length - 1]);
    const X = n => m.l + ((Math.log(n) - lo) / (hi - lo)) * (width - m.l - m.r);
    const current = sizeNow();
    const panels = [
      { key: 'accuracy', title: tr('Test accuracy', 'Accuracy test'), top: m.top, tick: x => pct(x, 0), chance: 1 / 3 },
      { key: 'macroF1', title: tr('Test macro F1', 'Macro F1 test'), top: m.top + panelH + m.gap, tick: x => fmt(x, { digits: 1 }), chance: null },
    ];
    const marks = (mark, x, y, r, color) => {
      ctx.fillStyle = color; ctx.beginPath();
      if (mark === 'circle') ctx.arc(x, y, r, 0, 2 * Math.PI);
      else if (mark === 'square') ctx.rect(x - r, y - r, 2 * r, 2 * r);
      else { ctx.moveTo(x, y - r - 1); ctx.lineTo(x + r + 1, y + r); ctx.lineTo(x - r - 1, y + r); ctx.closePath(); }
      ctx.fill();
    };
    for (const p of panels) {
      const Y = val => p.top + panelH - ((val - Y_MIN) / (1 - Y_MIN)) * panelH;
      ctx.fillStyle = t.muted; ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(p.title, m.l, p.top - 7);
      ctx.strokeStyle = t.grid; ctx.fillStyle = t.muted; ctx.font = '11px system-ui, sans-serif'; ctx.lineWidth = 1; ctx.textAlign = 'right';
      ctx.beginPath();
      for (const val of [0.5, 1]) { ctx.moveTo(m.l, Y(val)); ctx.lineTo(width - m.r, Y(val)); ctx.fillText(p.tick(val), m.l - 6, Y(val) + 4); }
      ctx.stroke();
      if (p.chance != null) {
        ctx.save(); ctx.setLineDash([2, 4]); ctx.strokeStyle = t.muted; ctx.beginPath(); ctx.moveTo(m.l, Y(p.chance)); ctx.lineTo(width - m.r, Y(p.chance)); ctx.stroke(); ctx.restore();
      }
      // the current size
      ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = t.ink; ctx.beginPath(); ctx.moveTo(X(current), p.top); ctx.lineTo(X(current), p.top + panelH); ctx.stroke(); ctx.restore();
      for (const model of MODELS) {
        const pts = SIZES.filter(n => scores.has(n)).map(n => [n, scores.get(n)[model][p.key]]);
        ctx.strokeStyle = modelColor(model); ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.beginPath();
        pts.forEach(([n, val], k) => (k ? ctx.lineTo(X(n), Y(val)) : ctx.moveTo(X(n), Y(val))));
        ctx.stroke(); ctx.lineWidth = 1;
        pts.forEach(([n, val]) => marks(MODEL_MARK[model], X(n), Y(val), n === current ? 5.6 : 3.2, modelColor(model)));
      }
      if (scores.has(current) && !predicting()) {
        for (const model of MODELS) {
          ctx.strokeStyle = t.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(current), Y(scores.get(current)[model][p.key]), 8, 0, 2 * Math.PI); ctx.stroke(); ctx.lineWidth = 1;
        }
      }
    }
    // The legend row above the chart is hidden in fullscreen (the cards are short there): the model key moves into the canvas,
    // on the line of the first panel title, when it fits.
    if (getComputedStyle(chartLegend).display === 'none') {
      ctx.font = '11px system-ui, sans-serif';
      const items = MODELS.map(k => ({ k, name: modelShort(k), w: ctx.measureText(modelShort(k)).width + 16 }));
      const total = items.reduce((sum, it) => sum + it.w + 14, -14);
      let lx = width - m.r - total;
      if (lx > m.l + 100) {
        ctx.textAlign = 'left';
        for (const it of items) {
          marks(MODEL_MARK[it.k], lx + 5, panels[0].top - 11, 4, modelColor(it.k));
          ctx.fillStyle = t.muted; ctx.fillText(it.name, lx + 14, panels[0].top - 7);
          lx += it.w + 14;
        }
      }
    }
    // x axis: ticks at some sizes, the current one in bold
    const axisY = panels[1].top + panelH;
    ctx.fillStyle = t.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center';
    const tickSizes = SIZES.filter((_, i) => i % 2 === 0 || SIZES[i] === current);
    for (const n of tickSizes) {
      if (n !== current && Math.abs(X(n) - X(current)) < 22) continue;
      ctx.font = `${n === current ? '700 ' : ''}11px system-ui, sans-serif`; ctx.fillStyle = n === current ? t.ink : t.muted;
      ctx.fillText(fmt(n), X(n), axisY + 15);
    }
    ctx.fillStyle = t.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(tr('Labelled messages (log scale)', 'Pesan berlabel (skala log)'), (m.l + width - m.r) / 2, height - 6);
    // describe
    const row = scores.get(current);
    lab.describe(chartCanvas, row
      ? tr(`At ${sizeLabel(current)}: ${MODELS.map(k => `${modelShort(k)} ${pct(row[k].accuracy, 0)} accuracy and ${fmt(row[k].macroF1, { digits: 2 })} macro F1`).join('; ')}.`,
        `Pada ${sizeLabel(current)}: ${MODELS.map(k => `${modelShort(k)} accuracy ${pct(row[k].accuracy, 0)} dan macro F1 ${fmt(row[k].macroF1, { digits: 2 })}`).join('; ')}.`)
      : tr('The models are being scored.', 'Model sedang dihitung skornya.'));
  }

  function renderLegend() {
    chartLegend.replaceChildren(...MODELS.map(k => {
      const mark = h('i', { 'aria-hidden': 'true' }, MARK_GLYPH[MODEL_MARK[k]]);
      mark.style.color = modelColor(k);
      return h('span', {}, mark, modelShort(k));
    }), h('span', {}, h('i', { 'aria-hidden': 'true' }, '┆'), tr('your size', 'ukuranmu')), h('span', {}, h('i', { 'aria-hidden': 'true' }, '···'), tr('random guess', 'tebakan acak')));
  }

  function renderResults() {
    const current = sizeNow();
    const row = scores.get(current);
    const chosen = controls.get('model');
    if (row && predicting()) {
      resultsCaption.textContent = tr(`Answer the Quick Quiz first: the scores for ${sizeLabel(current)} appear when you press Check answer.`, `Jawab Kuis Cepat dulu: skor untuk ${sizeLabel(current)} muncul setelah kamu menekan Periksa jawaban.`);
      tableHost.replaceChildren(); mistakesHead.textContent = ''; mistakesNote.textContent = ''; mistakesList.replaceChildren();
      return;
    }
    if (!row) {
      resultsCaption.textContent = tr('Scoring the models…', 'Menghitung skor model…');
      tableHost.replaceChildren(); mistakesHead.textContent = ''; mistakesNote.textContent = ''; mistakesList.replaceChildren();
      return;
    }
    const nTest = corpora.test.docs.length;
    resultsCaption.textContent = tr(
      `${sizeLabel(current)} for training; tested on ${fmt(nTest)} messages the models never saw. Pick a model in Show mistakes of.`,
      `${sizeLabel(current)} untuk training; diuji pada ${fmt(nTest)} pesan yang belum pernah dilihat model. Pilih model di Tampilkan kesalahan dari.`);
    const best = Math.max(...MODELS.map(k => row[k].accuracy));
    const head = h('thead', {}, h('tr', {},
      h('th', { scope: 'col' }, tr('Model', 'Model')), h('th', { scope: 'col' }, tr('Test accuracy', 'Accuracy test')), h('th', { scope: 'col' }, tr('Test macro F1', 'Macro F1 test'))));
    const body = h('tbody', {}, MODELS.map(k => {
      const mark = h('span', { 'aria-hidden': 'true' }, `${MARK_GLYPH[MODEL_MARK[k]]} `);
      mark.style.color = modelColor(k);
      const isBest = row[k].accuracy >= best - 1e-12;
      return h('tr', { class: k === chosen ? 'inspected' : '' },
        h('th', { scope: 'row' }, mark, h('span', { class: 'al-full' }, modelName(k)), h('span', { class: 'al-short' }, modelShort(k))),
        h('td', { class: isBest ? 'best' : '' }, pct(row[k].accuracy, 1)),
        h('td', {}, fmt(row[k].macroF1, { digits: 2 })));
    }));
    tableHost.replaceChildren(h('table', { class: 'al-table' }, head, body));
    const wrong = misclassified(corpora.test, row[chosen].predicted);
    mistakesHead.textContent = tr(`Misclassified test messages: ${modelName(chosen)}`, `Pesan test yang salah diklasifikasi: ${modelName(chosen)}`);
    if (!wrong.length) {
      mistakesNote.textContent = tr('No mistakes in this draw.', 'Tidak ada kesalahan pada pengambilan ini.');
      mistakesList.replaceChildren();
      return;
    }
    const shown = wrong.slice(0, SHOWN_MISTAKES);
    mistakesNote.textContent = tr(
      `${fmt(wrong.length)} of ${fmt(nTest)} test messages are wrong (${pct(wrong.length / nTest, 0)}). Showing ${fmt(shown.length)}.`,
      `${fmt(wrong.length)} dari ${fmt(nTest)} pesan test salah (${pct(wrong.length / nTest, 0)}). Menampilkan ${fmt(shown.length)}.`);
    mistakesList.replaceChildren(...shown.map(r => h('li', { title: r.doc },
      h('b', {}, tr(`${r.truth} → predicted ${r.guess}: `, `${r.truth} → prediksi ${r.guess}: `)), clip(r.doc, 160))));
  }

  function renderCompare() {
    renderLegend(); drawCompare(); renderResults(); renderStatus();
  }

  function revealPrediction() {
    if (sizeNow() !== PREDICT_SIZE) return;
    const row = scores.get(PREDICT_SIZE);
    if (!row) return;
    const nb = row.naiveBayes.accuracy, fz = row.frozen.accuracy, ft = row.fineTuned.accuracy;
    const w = winnerOf(nb, fz);
    const numbers = tr(
      `On this draw of ${fmt(PREDICT_SIZE)} labelled messages: bag of words ${pct(nb, 0)}, frozen pretrained vectors ${pct(fz, 0)}, fine-tuned ${pct(ft, 0)}.`,
      `Pada pengambilan ${fmt(PREDICT_SIZE)} pesan berlabel ini: bag of words ${pct(nb, 0)}, vektor pretrained dibekukan ${pct(fz, 0)}, di-fine-tune ${pct(ft, 0)}.`);
    const why = {
      b: tr('The pretrained vectors already know from unlabelled text which words belong together, so a few labels are enough to place a message; bag of words only knows the words of its 8 messages.',
        'Vektor pretrained sudah tahu dari teks tanpa label kata mana yang saling berkaitan, jadi beberapa label cukup untuk menempatkan sebuah pesan; bag of words hanya tahu kata dari 8 pesannya.'),
      a: tr('This draw favours bag of words: its 8 messages happen to contain the right words. The head start of pretraining is an average, not a promise.',
        'Pengambilan ini menguntungkan bag of words: 8 pesannya kebetulan memuat kata yang tepat. Keunggulan awal pretraining adalah rata-rata, bukan jaminan.'),
      tie: tr('The two are within 3 points on this draw, so neither wins clearly.',
        'Keduanya berselisih di bawah 3 poin pada pengambilan ini, jadi tidak ada yang menang jelas.'),
    }[w];
    const tail = tr('Press New sample to see how much a draw of 8 can change, and slide to 360 messages to watch the gap close.',
      'Tekan Sampel baru untuk melihat seberapa besar pengambilan 8 pesan bisa berubah, lalu geser ke 360 pesan untuk melihat selisihnya menutup.');
    box.reveal(w === 'a' ? 'bow' : w === 'b' ? 'pretrained' : 'tie', `${numbers} ${why} ${tail}`);
    renderStatus();
  }

  // ---- status ------------------------------------------------------------------------------------

  function renderStatus() {
    if (!trace) return;
    if (!trace.n) {
      lab.setStatus(tr('Type some text to trace.', 'Ketik teks untuk ditelusuri.'));
    } else {
      const mix = topMix(trace.weights, trace.tokens, sel, 3);
      const list = mix.map(m => `${q(m.token.display)} #${m.index + 1} (${pct(m.weight, 0)})`).join(', ');
      lab.setStatus(tr(`Token ${sel + 1}, ${q(trace.tokens[sel].display)}, with ${headName(trace.head)}: it takes most from ${list}.`,
        `Token ${sel + 1}, ${q(trace.tokens[sel].display)}, dengan ${headName(trace.head)}: paling banyak mengambil dari ${list}.`));
    }
    const current = sizeNow(), row = scores.get(current);
    lab.setDetail(predicting()
      ? tr(`Part 2, ${sizeLabel(current)}: say which model wins in the Quick Quiz, then press Check answer.`,
        `Bagian 2, ${sizeLabel(current)}: pilih model yang menang di Kuis Cepat, lalu tekan Periksa jawaban.`)
      : row
      ? tr(`Part 2, ${sizeLabel(current)}: pretrained ${pct(row.frozen.accuracy, 0)}, bag of words ${pct(row.naiveBayes.accuracy, 0)}, fine-tuned ${pct(row.fineTuned.accuracy, 0)} test accuracy.`,
        `Bagian 2, ${sizeLabel(current)}: pretrained ${pct(row.frozen.accuracy, 0)}, bag of words ${pct(row.naiveBayes.accuracy, 0)}, di-fine-tune ${pct(row.fineTuned.accuracy, 0)} accuracy test.`)
      : tr('Part 2: scoring the models…', 'Bagian 2: menghitung skor model…'));
    lab.setMetrics(tr(`${fmt(trace.n)} tokens · ${fmt(HEADS.length)} heads`, `${fmt(trace.n)} token · ${fmt(HEADS.length)} head`));
    lab.setLegend([
      { kind: 'dot', color: theme().accent, label: tr('Higher weight (darker)', 'Bobot lebih besar (lebih gelap)') },
      { kind: 'ring', color: theme().ink, label: tr('Traced token (outlined row)', 'Token yang ditelusuri (baris berbingkai)') },
      { kind: 'dash', color: theme().muted, label: tr('Hidden by the causal mask', 'Disembunyikan causal mask') },
    ]);
  }

  // ---- wiring ------------------------------------------------------------------------------------

  function onControl(name) {
    if (name === 'example') {
      const picked = exampleList.find(s => s.key === controls.get('example'));
      if (picked) textInput.value = picked.text;
    }
    if (name === 'size') {
      ensureScore(sizeNow());
      renderCompare();
      return;
    }
    if (name === 'model') { renderResults(); return; }
    retrace(); renderTokens(); drawHeat(); drawArcs(); renderStatus();
  }

  textInput.addEventListener('input', () => {
    const same = exampleList.find(s => s.text === textInput.value);
    controls.set('example', same ? same.key : 'custom');
    onControl('text');
  }, { signal: lab.signal });

  lab.canvas.addEventListener('click', e => {
    if (!heatGeom) return;
    const r = lab.canvas.getBoundingClientRect();
    const y = e.clientY - r.top, x = e.clientX - r.left;
    const { x0, y0, s, n } = heatGeom;
    if (x > x0 + n * s + 4) return;
    const row = Math.floor((y - y0) / s);
    if (row >= 0 && row < n) select(row);
  }, { signal: lab.signal });
  lab.canvas.addEventListener('pointermove', e => {
    if (!heatGeom) return;
    const r = lab.canvas.getBoundingClientRect();
    const row = Math.floor((e.clientY - r.top - heatGeom.y0) / heatGeom.s);
    lab.canvas.style.cursor = row >= 0 && row < heatGeom.n ? 'pointer' : 'default';
  }, { signal: lab.signal });

  function drawAll() {
    drawHeat(); drawArcs(); drawCompare(); renderStatus();
  }
  lab.onTheme(drawAll);
  lab.onResize(drawAll);

  lab.onReset(() => {
    controls.set('example', DEFAULTS.example); controls.set('tokenizer', DEFAULTS.tokenizer); controls.set('merges', Math.min(DEFAULTS.merges, mergesMax));
    controls.set('positions', DEFAULTS.positions); controls.set('head', DEFAULTS.head); controls.set('causal', DEFAULTS.causal);
    controls.set('size', SIZES.indexOf(DEFAULTS.size)); controls.set('model', DEFAULTS.model);
    textInput.value = exampleList[0].text;
    sel = 1; seed = firstSeed;
    box.reset();
    retrace(); renderTokens(); drawHeat(); drawArcs();
    startScoring();
  });

  // ---- first draw --------------------------------------------------------------------------------

  retrace(); renderTokens(); drawHeat(); drawArcs(); renderStatus();
  renderLegend(); drawCompare(); renderResults();
  startScoring();
  return lab.destroy;
}
