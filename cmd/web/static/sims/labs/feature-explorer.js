// Feature explorer, "three questions, one dataset": one table of rows (invented birds, or the real
// Palmer penguins) asked three ways. Pick the columns on the two axes, then pose
//   a regression question     (predict a number: the vertical column from the horizontal one),
//   a classification question (predict a category: how well do the two columns tell the labels apart?),
//   a clustering question     (no target: group the dots into k groups using only the two columns).
// The data and the math live in sims/ml/birds.js and sims/ml/threequestions.js; this file draws and wires.
import { createLab, createPlot, clusterColor, dataModeSpec, loadDataset, predictBox, tr, fmt } from '../kit/index.js';
import {
  birdsDataset, penguinsDataset, usableRows, subsample, regressionFit, rankInputs, groupFits, trendReverses, trendOf,
  separabilityOn, rankPairsOn, majority, scoreBand, clusterRows, rankClusterPairs, agreementBand,
} from '../ml/threequestions.js';

const DEFAULT_SEED = 7;
const DEFAULT_K = 3;
const T = pair => tr(pair[0], pair[1]);                          // a [english, indonesian] pair, built when drawn so it follows the language
const pct = x => `${fmt(Math.round(x * 100))}%`;                 // whole percents: 33% / 33%
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
// The color toggle's text for the label being colored (a lower-case name such as "species" or "sex").
export const colorsToggleText = name => [`Color by ${name}`, `Warnai per ${name}`];
// Pixels kept free above the data range, for the vertical axis title, and the share of the 0..10 plot square that is.
export const TITLE_HEADROOM_PX = 28;
export const headroomUnits = size => (size > 0 ? Math.min(2, TITLE_HEADROOM_PX / size * 10) : 0);
// Where a value sits on the 0..10 plot square: 0 at lo, 10 - headroom at hi (headroom is 0 for the horizontal axis).
export const placeOnAxis = (value, feature, headroom = 0) => (value - feature.lo) / (feature.hi - feature.lo) * (10 - headroom);
const digitsFor = x => (Math.abs(x) >= 100 ? 0 : Math.abs(x) >= 10 ? 1 : Math.abs(x) >= 1 ? 2 : 3);

export function mount(root) {
  let seed = DEFAULT_SEED, sampleNo = 1;
  let generated = birdsDataset(seed), penguinDs = null, ds = generated;
  let dataStatus = 'ok';                 // 'ok' | 'loading' | 'failed'
  let loadToken = 0;
  let selected = null;                   // the clicked row (the same object as in ds.rows)
  let box = null;
  const memo = new Map();
  const cached = (key, make) => { if (!memo.has(key)) memo.set(key, make()); return memo.get(key); };

  // Names, built when drawn.
  const FNAME = i => T(ds.features[i].name);
  const NAME = i => FNAME(i).toLowerCase();                        // "bill length" / "panjang paruh"
  const noun = plural => T(ds.nouns[plural ? 1 : 0]);               // "bird" / "burung"
  const labelOf = key => ds.labels.find(l => l.key === key);
  const labelName = key => T(labelOf(key).name).toLowerCase();      // "species" / "spesies"
  const valueText = (key, value) => { const names = labelOf(key).valueNames?.[value]; return names ? T(names) : value; };
  const formatValue = (value, i) => `${fmt(value, { digits: ds.features[i].decimals })} ${ds.features[i].unit}`;
  const pairName = (a, b) => `${FNAME(a)} ${tr('and', 'dan')} ${NAME(b)}`;
  const lowerPair = (a, b) => (a === b ? `${NAME(a)} ${tr('alone', 'saja')}` : `${NAME(a)} ${tr('and', 'dan')} ${NAME(b)}`);
  let headroom = 0;                                  // plot units kept free above the data for the vertical title; set in draw()
  const pos = (value, i) => placeOnAxis(value, ds.features[i]);            // horizontal: 0 at lo, 10 at hi
  const posY = (value, i) => placeOnAxis(value, ds.features[i], headroom);  // vertical: the top is left free for the title
  const dataKey = () => `${ds.key}:${seed}:${sampleNo}`;

  const featureOptions = () => ds.features.map((_, i) => [i, FNAME(i)]);
  const lab = createLab(root, {
    title: tr('Three questions, one dataset', 'Tiga pertanyaan, satu dataset'),
    hint: tr('One table, three ways to ask. Pick two columns and a question, and see what it looks like on the plot. Click a dot to read its row.',
      'Satu tabel, tiga cara bertanya. Pilih dua kolom dan satu pertanyaan, lalu lihat tampilannya di plot. Klik sebuah titik untuk melihat datanya.'),
    status: true, legend: true, canvasLabel: tr('Scatter plot of birds by two chosen features. Press Left or Right to step through the birds.', 'Scatter plot burung berdasarkan dua fitur pilihan. Tekan panah kiri atau kanan untuk berpindah antar burung.'),
    settingsTitle: tr('Choose the data and the question', 'Pilih data dan pertanyaan'),
    extra: {
      title: tr('All pairs, ranked', 'Semua pasangan fitur'),
      hint: tr('Every pair of features scored the same way, best first. A score of about 33% is what random guessing gives with three equal species. The pair on the plot is highlighted. Click a pair to plot it.',
        'Semua pasangan fitur dinilai dengan cara yang sama, dari yang terbaik. Skor sekitar 33% setara tebakan asal untuk tiga spesies yang jumlahnya sama. Pasangan yang sedang tampil di plot disorot. Klik satu pasangan untuk menampilkannya.'),
    },
  });
  const plot = createPlot(lab.canvas);
  lab.ref('detail').style.minHeight = '2.9em'; // room for a whole row, so the plot does not jump when a row is selected
  plot.setLabels('', ''); // the kit counts 0..10 on the axes; this lab writes its own ticks and titles

  const controls = lab.panel([
    dataModeSpec({ real: [['penguins', tr('Penguins (real)', 'Penguin (data nyata)')]] }),
    { name: 'x', type: 'select', label: tr('Horizontal feature', 'Fitur sumbu x'), options: featureOptions(), value: 0 },
    { name: 'y', type: 'select', label: tr('Vertical feature', 'Fitur sumbu y'), options: featureOptions(), value: 1 },
    { name: 'question', type: 'select', label: tr('Question', 'Pertanyaan'), value: 'classification', options: [
      ['regression', tr('Regression: a number', 'Regression: angka')],
      ['classification', tr('Classification: a category', 'Classification: kategori')],
      ['clustering', tr('Clustering: find groups', 'Clustering: cari kelompok')],
    ] },
    { name: 'label', type: 'select', label: tr('Label to predict', 'Label yang diprediksi'), options: [['species', T(generated.labels[0].name)]], value: 'species' },
    { name: 'k', type: 'range', label: tr('Number of groups (k)', 'Jumlah kelompok (k)'), min: 2, max: 6, step: 1, value: DEFAULT_K },
    { name: 'colors', type: 'toggle', label: tr(...colorsToggleText(tr('species', 'spesies'))), value: true },
    { name: 'gaps', type: 'toggle', label: tr('Show the gaps to the line', 'Tampilkan selisih ke garis'), value: false },
    { name: 'again', type: 'button', label: tr('New sample of birds', 'Sampel burung baru'), onClick: () => { if (ds.key === 'generated') { seed++; generated = birdsDataset(seed); ds = generated; } sampleNo++; selected = null; memo.clear(); buildPredict(); draw(); } },
    { type: 'note', text: tr('Turn the colors off to see the birds without their labels. Click a dot, or focus the plot and press Left or Right, to read a bird’s row.', 'Matikan warna untuk melihat burung tanpa label. Klik sebuah titik, atau fokus ke plot lalu tekan panah kiri/kanan, untuk melihat data satu burung.') },
  ], onChange);

  // Handles into the panel the kit builds: the selects in spec order (data, x, y, question, label), the two toggles, the button.
  const selects = [...controls.el.querySelectorAll('select')];
  const [dataSelect, , , questionSelect, labelSelect] = selects;
  const toggleText = [...controls.el.querySelectorAll('label.toggle')].map(l => l.lastChild);
  const againButton = controls.el.querySelector('.panel-button');
  const tipNote = controls.el.querySelector('p.hint:last-of-type');   // the static note at the end of the panel; its text follows the question
  const dataNote = document.createElement('p');
  const questionNote = document.createElement('p');
  dataNote.className = questionNote.className = 'hint';
  dataSelect.parentElement.after(dataNote);
  questionSelect.parentElement.after(questionNote);
  const holder = document.createElement('div');                      // the Predict-first box lives here
  lab.ref('below').append(holder);

  const pair = () => { const v = controls.values(); return [Number(v.x), Number(v.y)]; };
  const questionNow = () => controls.values().question;
  const labelNow = () => (labelOf(controls.values().label) ? controls.values().label : 'species');
  const colorKeyNow = () => (questionNow() === 'classification' ? labelNow() : 'species');
  const clusterColumns = (fx, fy) => (fx === fy ? [fx] : [fx, fy]);

  // The rows the question works on: rows with a missing value (NA) in a column it uses are left out,
  // and on the real data a later sample is a random two thirds of what is left.
  function workRows(q, labelKey) {
    return cached(`rows:${dataKey()}:${q === 'classification' ? labelKey : ''}`, () => {
      const used = usableRows(ds.rows, q === 'classification' ? labelKey : null);
      return { rows: ds.key === 'penguins' ? subsample(used.rows, sampleNo) : used.rows, dropped: used.dropped, usable: used.rows.length };
    });
  }
  const labelIndex = (key, row) => labelOf(key).values.indexOf(row.l[key]);

  // ---- state that follows the dataset and the question --------------------------------------------
  function fillLabelOptions() {
    labelSelect.replaceChildren(...ds.labels.map(l => { const o = document.createElement('option'); o.value = l.key; o.textContent = T(l.name); return o; }));
    labelSelect.value = 'species';
  }
  // The same checkbox does a different job in each question, so its label says which one.
  const colorsLabel = () => (questionNow() === 'clustering'
    ? tr('Show the true species', 'Tampilkan spesies sebenarnya')
    : questionNow() === 'classification' && labelNow() !== 'species'
      ? tr(...colorsToggleText(labelName(labelNow())))
      : tr(...colorsToggleText(tr('species', 'spesies'))));

  function syncChrome() {
    const q = questionNow();
    // Only the controls that belong to the chosen question are shown; the shared ones stay put.
    controls.show('label', q === 'classification');
    controls.show('k', q === 'clustering');
    controls.show('gaps', q === 'regression');
    toggleText[0].textContent = colorsLabel();
    againButton.textContent = tr(`New sample of ${noun(true)}`, `Sampel ${noun(true)} baru`);
    lab.canvas.setAttribute('aria-label', tr(`Scatter plot of ${noun(true)} by two chosen features. Press Left or Right to step through the ${noun(true)}.`, `Scatter plot ${noun(true)} berdasarkan dua fitur pilihan. Tekan panah kiri atau kanan untuk berpindah antar ${noun(true)}.`));
    questionNote.textContent = {
      regression: tr('Regression: the vertical column is the number to predict and the horizontal column is the input. The line is the best straight-line prediction.',
        'Regression: kolom vertikal adalah angka yang diprediksi dan kolom horizontal adalah inputnya. Garis adalah prediksi garis lurus terbaik.'),
      classification: tr(`Classification: the label to predict is shown as colors. The score is how often the 5 nearest ${noun(true)} vote for the right label, with each ${noun()} left out of its own vote.`,
        `Classification: label yang diprediksi ditampilkan sebagai warna. Skornya adalah seberapa sering 5 ${noun(true)} terdekat memilih label yang benar, dengan tiap ${noun()} dikeluarkan dari pemungutan suaranya sendiri.`),
      clustering: tr('Clustering: there is no target. The lab groups the dots into k groups using only the two columns on the axes, never the labels.',
        'Clustering: tidak ada target. Lab mengelompokkan titik menjadi k kelompok hanya dari dua kolom di sumbu, tanpa memakai label.'),
    }[q];
    const lead = {
      classification: tr(`Turn the colors off to see the ${noun(true)} without their labels.`, `Matikan warna untuk melihat ${noun(true)} tanpa label.`),
      regression: tr('Turn the colors on to see each species with its own line.', 'Nyalakan warna untuk melihat tiap spesies dengan garisnya sendiri.'),
      clustering: tr('Turn the colors on to reveal the species the groups never saw.', 'Nyalakan warna untuk melihat spesies yang tidak pernah dilihat kelompok itu.'),
    }[q];
    tipNote.textContent = `${lead} ${tr(`Click a dot, or focus the plot and press Left or Right, to read a ${noun()}’s row.`, `Klik sebuah titik, atau fokus ke plot lalu tekan panah kiri/kanan, untuk melihat data satu ${noun()}.`)}`;
    let note = '';
    if (dataStatus === 'loading') note = tr('Loading the penguin data…', 'Memuat data penguin…');
    else if (dataStatus === 'failed') note = tr('The penguin data could not be loaded, so the lab is showing generated data.', 'Data penguin tidak dapat dimuat, jadi lab menampilkan data buatan.');
    else if (ds.key === 'penguins') {
      const { dropped } = workRows(q, labelNow());
      const where = q === 'classification' ? tr('in a measurement or in the label to predict', 'di salah satu pengukuran atau di label yang diprediksi') : tr('in a measurement', 'di salah satu pengukuran');
      note = (dropped ? tr(`${fmt(dropped)} of ${fmt(ds.rows.length)} penguins have a missing value (NA) ${where}, so they are left out.`, `${fmt(dropped)} dari ${fmt(ds.rows.length)} penguin punya missing value (NA) ${where}, jadi tidak diikutkan.`)
        : tr(`No penguin has a missing value (NA) ${where}.`, `Tidak ada penguin yang punya missing value (NA) ${where}.`))
        + ' ' + tr('Real data: the Palmer penguins (Gorman, Williams and Fraser, 2014).', 'Data nyata: penguin Palmer (Gorman, Williams, dan Fraser, 2014).');
    }
    dataNote.textContent = note;
    dataNote.hidden = !note;
  }

  function onChange(name) {
    if (name === 'data') { switchData(); return; }
    if (name === 'question') controls.set('colors', questionNow() === 'classification');
    if (['question', 'x', 'y', 'label', 'k'].includes(name)) buildPredict();
    draw();
  }

  // The real table loads on demand: no network at mount, and a late answer is ignored when the learner has moved on.
  async function switchData() {
    const want = controls.values().data;
    const token = ++loadToken;
    selected = null;
    if (want === 'generated') { dataStatus = 'ok'; useDataset(generated); return; }
    dataStatus = 'loading';
    syncChrome();
    try {
      const table = await loadDataset(want);
      if (lab.signal.aborted || token !== loadToken) return;
      penguinDs ??= penguinsDataset(table);
      dataStatus = 'ok';
      useDataset(penguinDs);
    } catch {
      if (lab.signal.aborted || token !== loadToken) return;
      dataStatus = 'failed';
      controls.set('data', 'generated');
      useDataset(generated);
    }
  }
  function useDataset(next) {
    ds = next; sampleNo = 1; selected = null; memo.clear();
    fillLabelOptions();
    buildPredict();
    draw();
  }

  // ---- Predict first -------------------------------------------------------------------------------
  // A new question for the current columns; the learner picks, then presses the button to see the answer.
  function buildPredict() {
    const q = questionNow(), [fx, fy] = pair(), k = controls.values().k;
    const copy = {
      regression: {
        question: tr(`As ${NAME(fx)} gets larger, what happens to ${NAME(fy)} on average?`, `Saat ${NAME(fx)} makin besar, apa yang terjadi pada ${NAME(fy)} secara rata-rata?`),
        choices: [['up', tr('It tends to go up', 'Cenderung naik')], ['down', tr('It tends to go down', 'Cenderung turun')], ['flat', tr('No clear trend', 'Tidak ada tren yang jelas')]],
      },
      classification: {
        question: fx === fy ? tr(`How well does ${NAME(fx)} alone predict the ${labelName(labelNow())}?`, `Seberapa baik ${NAME(fx)} saja memprediksi ${labelName(labelNow())}?`)
          : tr(`How well do ${lowerPair(fx, fy)} predict the ${labelName(labelNow())}?`, `Seberapa baik ${lowerPair(fx, fy)} memprediksi ${labelName(labelNow())}?`),
        choices: [['weak', tr('Hardly better than always guessing the most common one', 'Nyaris tidak lebih baik daripada selalu menebak yang paling umum')],
          ['ok', tr('Clearly better than guessing, but with many mistakes', 'Jelas lebih baik daripada menebak, tetapi masih banyak salah')],
          ['good', tr('Right about 9 times out of 10 or more', 'Benar sekitar 9 dari 10 kali atau lebih')]],
      },
      clustering: {
        question: tr(`Group the ${noun(true)} into ${fmt(k)} groups using ${lowerPair(fx, fy)}, with no labels. Will the groups line up with the species?`, `Kelompokkan ${noun(true)} menjadi ${fmt(k)} kelompok dengan ${lowerPair(fx, fy)}, tanpa label. Apakah kelompoknya akan sesuai dengan spesies?`),
        choices: [['match', tr('Yes, nearly every group is mostly one species', 'Ya, hampir tiap kelompok sebagian besar satu spesies')],
          ['part', tr('Partly: some groups mix species', 'Sebagian: ada kelompok yang mencampur spesies')],
          ['no', tr('No, the groups cut across the species', 'Tidak, kelompoknya memotong lintas spesies')]],
      },
    }[q];
    holder.replaceChildren();
    box = predictBox(holder, copy);
    box.onCheck(reveal);
  }

  // The answer is computed from the rows on the screen now.
  function reveal() {
    const q = questionNow(), [fx, fy] = pair(), labelKey = labelNow();
    const { rows } = workRows(q, labelKey);
    if (q === 'regression') {
      const fit = regressionFit(rows.map(r => r.f[fx]), rows.map(r => r.f[fy]));
      const fits = fx === fy ? [] : groupFits(rows, fx, fy, 'species');
      const turn = trendReverses(fit.slope, fits) ? ` ${tr('Turn on “Color by species”: inside every species the trend points the other way.', 'Nyalakan “Warnai per spesies”: di dalam tiap spesies, trennya justru berlawanan.')}` : '';
      box.reveal(fx === fy ? 'up' : trendOf(fit.r), tr(`The correlation is ${fmt(fit.r, { digits: 2 })}, and the line explains ${pct(fit.r2)} of the ups and downs of ${NAME(fy)} (R²).`, `Korelasinya ${fmt(fit.r, { digits: 2 })}, dan garis menjelaskan ${pct(fit.r2)} naik-turunnya ${NAME(fy)} (R²).`) + turn);
    } else if (q === 'classification') {
      const score = scoreFor(rows, fx, fy, labelKey), base = majority(rows.map(r => r.l[labelKey])).share;
      box.reveal(scoreBand(score, base), tr(`The score is ${pct(score)}; always guessing the most common ${labelName(labelKey)} gives ${pct(base)}.`, `Skornya ${pct(score)}; selalu menebak ${labelName(labelKey)} yang paling umum memberi ${pct(base)}.`));
    } else {
      const c = clusterFor(rows, fx, fy);
      box.reveal(agreementBand(c.purity), tr(`${pct(c.purity)} of the ${noun(true)} sit in a group whose main species is their own (silhouette ${fmt(c.silhouette, { digits: 2 })}). Turn on “Show the true species” to see the species the groups never saw.`,
        `${pct(c.purity)} ${noun(true)} berada di kelompok yang spesies utamanya sama dengan spesiesnya (silhouette ${fmt(c.silhouette, { digits: 2 })}). Nyalakan “Tampilkan spesies sebenarnya” untuk melihat spesies yang tidak pernah dilihat kelompok itu.`));
    }
  }

  // ---- Scores, cached per sample -------------------------------------------------------------------
  const ranked = (rows, labelKey) => cached(`rank:${dataKey()}:${labelKey}`, () => rankPairsOn(rows, ds.features.length, labelKey));
  function scoreFor(rows, a, b, labelKey) {
    if (a === b) return cached(`sep:${dataKey()}:${labelKey}:${a}`, () => separabilityOn(rows, [a], labelKey));
    return ranked(rows, labelKey).find(p => (p.a === a && p.b === b) || (p.a === b && p.b === a)).score;
  }
  const clusterFor = (rows, a, b) => cached(`clu:${dataKey()}:${a}:${b}:${controls.values().k}`, () => clusterRows(rows, clusterColumns(a, b), controls.values().k));
  const clusterRank = rows => cached(`crank:${dataKey()}:${controls.values().k}`, () => rankClusterPairs(rows, ds.features.length, controls.values().k));

  // ---- Drawing -------------------------------------------------------------------------------------
  // Replaces the kit's 0..10 tick labels with the real values of the two features.
  function drawAxes(g, fx, fy, q) {
    const ctx = plot.ctx;
    ctx.clearRect(0, 0, g.px(0) - 1, g.height);
    ctx.clearRect(0, g.py(0) + 1, g.width, g.height - g.py(0) - 1);
    ctx.save();
    ctx.fillStyle = g.t.muted;
    ctx.font = '11px system-ui, sans-serif';
    const ticks = f => { const out = []; for (let v = ds.features[f].lo; v <= ds.features[f].hi + 1e-9; v += ds.features[f].tick) out.push(v); return out; };
    ctx.textAlign = 'center';
    for (const v of ticks(fx)) ctx.fillText(fmt(v), g.px(pos(v, fx)), g.py(0) + 16);
    ctx.textAlign = 'right';
    for (const v of ticks(fy)) ctx.fillText(fmt(v), g.px(0) - 7, g.py(posY(v, fy)) + 4);
    ctx.textAlign = 'center';
    ctx.fillText(`${FNAME(fx)} (${ds.features[fx].unit})`, g.px(5), g.height - 5);
    // The vertical title sits in the free band above the data (see headroomUnits), so it never covers a dot or a tick label.
    const title = `↑ ${FNAME(fy)} (${ds.features[fy].unit})${q === 'regression' && fx !== fy ? tr(', to predict', ', yang diprediksi') : ''}`;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillStyle = g.t.ink;
    ctx.textAlign = 'left';
    ctx.fillText(title, g.px(0) + 10, g.py(10) + 18);
    ctx.restore();
  }

  const spots = (rows, fx, fy) => rows.map(r => ({ x: pos(r.f[fx], fx), y: posY(r.f[fy], fy) }));

  function rowText(row, q, fx, fy, fit, cluster, rows) {
    const parts = ds.features.map((f, j) => `${NAME(j)} ${formatValue(row.f[j], j)}`);
    const head = `${cap(noun())} #${row.id}: ${parts.join(', ')}.`;
    const species = valueText('species', row.l.species);
    if (q === 'classification') {
      const key = labelNow();
      return `${head} ${T(labelOf(key).name)} ${tr('(the label)', '(label-nya)')}: ${valueText(key, row.l[key])}.`;
    }
    if (q === 'regression') {
      const predicted = fit.slope * row.f[fx] + fit.intercept;
      return `${head} ${tr(`Species: ${species} (not used by the line). The line predicts ${NAME(fy)} ${formatValue(predicted, fy)}; the gap is ${formatValue(Math.abs(row.f[fy] - predicted), fy)}.`,
        `Spesies: ${species} (tidak dipakai garis). Garis memprediksi ${NAME(fy)} ${formatValue(predicted, fy)}; selisihnya ${formatValue(Math.abs(row.f[fy] - predicted), fy)}.`)}`;
    }
    return `${head} ${tr(`Species: ${species} (hidden from the clustering). Found group: ${fmt(cluster.assign[rows.indexOf(row)] + 1)}.`, `Spesies: ${species} (disembunyikan dari clustering). Kelompok yang ditemukan: ${fmt(cluster.assign[rows.indexOf(row)] + 1)}.`)}`;
  }

  // ---- The card under the plot: a ranking that follows the question ---------------------------------
  const card = lab.extraEl.closest('.table-card');
  function setCard(title, hint) { card.querySelector('h3').textContent = title; card.querySelector('.hint').textContent = hint; }
  function linkButton(label, aria, shown, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.setAttribute('aria-label', aria);
    btn.style.cssText = 'all:unset;cursor:pointer;color:var(--accent);text-decoration:underline;font:inherit;border-radius:4px';
    btn.addEventListener('focus', () => { btn.style.outline = '2px solid var(--accent)'; });
    btn.addEventListener('blur', () => { btn.style.outline = ''; });
    btn.addEventListener('click', onClick);
    if (shown) btn.setAttribute('aria-current', 'true');
    return btn;
  }
  function renderTable(heads, lines) {
    lab.extraEl.innerHTML = '';
    const t = document.createElement('table');
    t.innerHTML = `<thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
    const body = document.createElement('tbody');
    for (const { cells, shown, note } of lines) {
      const row = body.insertRow();
      cells.forEach(c => { const td = row.insertCell(); if (c instanceof Node) td.append(c); else td.textContent = c; });
      if (shown) { row.style.fontWeight = '700'; row.style.background = 'var(--accent-soft)'; }
      if (note) row.style.color = 'var(--muted)';
    }
    t.append(body);
    // The first column (the pair or input name) wraps and the number columns stay on one line, with tighter padding,
    // so the table fits a phone card instead of hiding its score columns behind a sideways scroll.
    t.querySelectorAll('th').forEach(th => { th.style.whiteSpace = 'normal'; th.style.padding = '9px 6px'; th.style.verticalAlign = 'bottom'; });
    t.querySelectorAll('td').forEach(td => { td.style.padding = '8px 6px'; });
    t.querySelectorAll('tr').forEach(tr2 => { const first = tr2.firstElementChild; if (first) first.style.whiteSpace = 'normal'; });
    lab.extraEl.append(t);
  }
  const showPair = (a, b) => { controls.set('x', a); controls.set('y', b); buildPredict(); draw(); };

  function table(q, rows, fx, fy, labelKey) {
    if (q === 'regression') {
      const order = rankInputs(rows, fy);
      setCard(tr(`Inputs for predicting ${NAME(fy)}, ranked`, `Input untuk memprediksi ${NAME(fy)}, berurutan`),
        tr(`Each other column used alone to predict ${NAME(fy)} with a straight line, scored by R²: the share of the ups and downs of ${NAME(fy)} that the line explains. 0% is no better than always guessing the mean. The input on the plot is highlighted. Click an input to plot it.`,
          `Tiap kolom lain dipakai sendirian untuk memprediksi ${NAME(fy)} dengan garis lurus, dinilai dengan R²: bagian naik-turunnya ${NAME(fy)} yang dijelaskan garis. 0% berarti tidak lebih baik daripada selalu menebak rata-rata. Input yang sedang tampil di plot disorot. Klik satu input untuk menampilkannya.`));
      renderTable([tr('Input column, best first', 'Kolom input'), 'R²'], order.map((p, i) => ({
        shown: p.a === fx,
        cells: [(() => { const s = document.createElement('span'); s.append(`${fmt(i + 1)}. `, linkButton(FNAME(p.a), `${tr('Use', 'Pakai')} ${NAME(p.a)} ${tr('as the input', 'sebagai input')}`, p.a === fx, () => { controls.set('x', p.a); buildPredict(); draw(); })); return s; })(), pct(p.score)],
      })));
      return;
    }
    if (q === 'clustering') {
      const order = clusterRank(rows);
      setCard(tr('All pairs, clustered', 'Semua pasangan fitur, di-cluster'),
        tr(`Every pair of features clustered into ${fmt(controls.values().k)} groups without looking at any label, best first. The silhouette (from -1 to 1) says how clearly the groups stand apart; above about 0.5 is clear. The last column checks the groups against the hidden species afterwards. The pair on the plot is highlighted. Click a pair to plot it.`,
          `Semua pasangan fitur dikelompokkan menjadi ${fmt(controls.values().k)} kelompok tanpa melihat label, dari yang terbaik. Silhouette (dari -1 sampai 1) menunjukkan seberapa jelas kelompok terpisah; di atas sekitar 0,5 sudah jelas. Kolom terakhir mencocokkan kelompok dengan spesies yang disembunyikan, setelah kelompoknya jadi. Pasangan yang sedang tampil di plot disorot. Klik satu pasangan untuk menampilkannya.`));
      renderTable([tr('Feature pair, best first', 'Pasangan fitur'), 'Silhouette', tr('Agreement with species', 'Kecocokan dengan spesies')], order.map((p, i) => {
        const shown = (p.a === fx && p.b === fy) || (p.a === fy && p.b === fx);
        const s = document.createElement('span');
        s.append(`${fmt(i + 1)}. `, linkButton(pairName(p.a, p.b), `${tr('Plot', 'Tampilkan')} ${NAME(p.a)} ${tr('and', 'dan')} ${NAME(p.b)}`, shown, () => showPair(p.a, p.b)));
        return { shown, cells: [s, fmt(p.silhouette, { digits: 2 }), pct(p.purity)] };
      }));
      return;
    }
    const order = ranked(rows, labelKey);
    const base = majority(rows.map(r => r.l[labelKey]));
    const counts = new Map(); rows.forEach(r => counts.set(r.l[labelKey], (counts.get(r.l[labelKey]) ?? 0) + 1));
    const tied = [...counts.values()].filter(c => c === Math.max(...counts.values())).length > 1;
    if (ds.key === 'generated' && labelKey === 'species') setCard(tr('All pairs, ranked', 'Semua pasangan fitur'),
      tr('Every pair of features scored the same way, best first. A score of about 33% is what random guessing gives with three equal species. The pair on the plot is highlighted. Click a pair to plot it.',
        'Semua pasangan fitur dinilai dengan cara yang sama, dari yang terbaik. Skor sekitar 33% setara tebakan asal untuk tiga spesies yang jumlahnya sama. Pasangan yang sedang tampil di plot disorot. Klik satu pasangan untuk menampilkannya.'));
    else setCard(tr('All pairs, ranked', 'Semua pasangan fitur'),
      tr(`Every pair of features scored the same way, best first. A score of about ${pct(base.share)} is what always guessing the most common ${labelName(labelKey)} gives. The pair on the plot is highlighted. Click a pair to plot it.`,
        `Semua pasangan fitur dinilai dengan cara yang sama, dari yang terbaik. Skor sekitar ${pct(base.share)} setara selalu menebak ${labelName(labelKey)} yang paling umum. Pasangan yang sedang tampil di plot disorot. Klik satu pasangan untuk menampilkannya.`));
    const lines = order.map((p, i) => {
      const shown = (p.a === fx && p.b === fy) || (p.a === fy && p.b === fx);
      const s = document.createElement('span');
      s.append(`${fmt(i + 1)}. `, linkButton(pairName(p.a, p.b), `${tr('Plot', 'Tampilkan')} ${NAME(p.a)} ${tr('and', 'dan')} ${NAME(p.b)}`, shown, () => showPair(p.a, p.b)));
      return { shown, cells: [s, pct(p.score)] };
    });
    const who = tied ? '' : ` (${valueText(labelKey, base.value)})`;
    lines.push({ note: true, cells: [tr(`Always guess the most common ${labelName(labelKey)}${who}`, `Selalu menebak ${labelName(labelKey)} yang paling umum${who}`), pct(base.share)] });
    renderTable([tr('Feature pair, best first', 'Pasangan fitur'), tr('Score', 'Skor')], lines);
  }

  function draw() {
    const v = controls.values();
    const q = v.question, [fx, fy] = pair(), labelKey = labelNow(), colorKey = colorKeyNow();
    syncChrome();
    const { rows } = workRows(q, labelKey);
    const g = plot.begin();
    headroom = headroomUnits(g.size);
    drawAxes(g, fx, fy, q);
    const pts = spots(rows, fx, fy);
    const sel = selected ? rows.indexOf(selected) : -1;

    const fit = q === 'regression' ? regressionFit(rows.map(r => r.f[fx]), rows.map(r => r.f[fy])) : null;
    const cluster = q === 'clustering' ? clusterFor(rows, fx, fy) : null;
    const dotColor = (r, i) => (v.colors ? clusterColor(labelIndex(colorKey, r)) : cluster ? clusterColor(cluster.assign[i]) : g.t.muted);

    plot.clip(() => {
      if (fit && v.gaps) rows.forEach((r, i) => plot.segment(pts[i].x, pts[i].y, pts[i].x, posY(fit.slope * r.f[fx] + fit.intercept, fy), { color: g.t.muted, width: 1, alpha: 0.55 }));
      rows.forEach((r, i) => { if (i !== sel) plot.dot(pts[i].x, pts[i].y, dotColor(r, i), 4.6); });
      if (sel >= 0) {
        plot.dot(pts[sel].x, pts[sel].y, dotColor(rows[sel], sel), 6.5);
        plot.ring(pts[sel].x, pts[sel].y, g.t.ink, 11, 2.5);
      }
      if (fit) {
        const line = (slope, intercept, color, width) => plot.segment(pos(ds.features[fx].lo, fx), posY(slope * ds.features[fx].lo + intercept, fy), pos(ds.features[fx].hi, fx), posY(slope * ds.features[fx].hi + intercept, fy), { color, width });
        if (v.colors && fx !== fy) groupFits(rows, fx, fy, 'species').forEach(f => line(f.slope, f.intercept, clusterColor(labelIndex('species', { l: { species: f.value } })), 1.8));
        line(fit.slope, fit.intercept, g.t.ink, 2.6);
      }
      if (cluster) cluster.centers.forEach((c, j) => plot.diamond(pos(c[0], fx), posY(c[fx === fy ? 0 : 1], fy), v.colors ? g.t.plot : clusterColor(j), 9));
    });

    // Status, detail, counts and legend follow the question.
    const what = fx === fy ? `${FNAME(fx)} ${tr('on its own', 'sendirian')}` : pairName(fx, fy);
    let idle = tr(`Click a ${noun()}, or press Left or Right on the plot, to read its whole row.`, `Klik sebuah ${noun()}, atau tekan panah kiri/kanan di plot, untuk melihat datanya.`);
    if (q === 'classification') {
      lab.setStatus(`${what}: ${tr('separability score', 'skor separability')} ${pct(scoreFor(rows, fx, fy, labelKey))}`);
    } else if (q === 'regression') {
      if (fx === fy) {
        lab.setStatus(tr(`Choose two different columns: a column predicts itself perfectly (R² ${pct(1)}).`, `Pilih dua kolom yang berbeda: sebuah kolom memprediksi dirinya sendiri dengan sempurna (R² ${pct(1)}).`));
      } else {
        const yu = ds.features[fy].unit, xu = ds.features[fx].unit;
        lab.setStatus(tr(`Predicting ${NAME(fy)} from ${NAME(fx)}: R² ${pct(fit.r2)}, average error ${fmt(fit.mae, { digits: digitsFor(fit.mae) })} ${yu}`, `Memprediksi ${NAME(fy)} dari ${NAME(fx)}: R² ${pct(fit.r2)}, galat rata-rata ${fmt(fit.mae, { digits: digitsFor(fit.mae) })} ${yu}`));
        idle = tr(`Along the line, 1 ${xu} more ${NAME(fx)} goes with ${fmt(Math.abs(fit.slope), { digits: digitsFor(fit.slope) })} ${yu} ${fit.slope >= 0 ? 'more' : 'less'} ${NAME(fy)}. Always guessing the mean is off by ${fmt(fit.baselineMae, { digits: digitsFor(fit.baselineMae) })} ${yu} on average. ${idle}`,
          `Di sepanjang garis, ${NAME(fx)} naik 1 ${xu} berarti ${NAME(fy)} ${fit.slope >= 0 ? 'naik' : 'turun'} ${fmt(Math.abs(fit.slope), { digits: digitsFor(fit.slope) })} ${yu}. Jika selalu menebak nilai rata-rata, galat rata-ratanya ${fmt(fit.baselineMae, { digits: digitsFor(fit.baselineMae) })} ${yu}. ${idle}`);
      }
    } else {
      lab.setStatus(tr(`${fmt(v.k)} groups from ${lowerPair(fx, fy)}, no labels used: silhouette ${fmt(cluster.silhouette, { digits: 2 })}`, `${fmt(v.k)} kelompok dari ${lowerPair(fx, fy)}, tanpa label: silhouette ${fmt(cluster.silhouette, { digits: 2 })}`));
      idle = tr(`Checked afterwards against the hidden species: ${pct(cluster.purity)} of the ${noun(true)} sit in a group whose main species is their own. Turn on “Show the true species” to compare. ${idle}`,
        `Dicocokkan setelahnya dengan spesies yang disembunyikan: ${pct(cluster.purity)} ${noun(true)} berada di kelompok yang spesies utamanya sama dengan spesiesnya. Nyalakan “Tampilkan spesies sebenarnya” untuk membandingkan. ${idle}`);
    }
    lab.setDetail(sel >= 0 ? rowText(rows[sel], q, fx, fy, fit, cluster, rows) : idle);
    lab.setMetrics(ds.key === 'generated'
      ? tr(`${fmt(rows.length)} birds, sample ${fmt(sampleNo)}`, `${fmt(rows.length)} burung, sampel ${fmt(sampleNo)}`)
      : tr(`${fmt(rows.length)} of ${fmt(ds.rows.length)} penguins, sample ${fmt(sampleNo)}`, `${fmt(rows.length)} dari ${fmt(ds.rows.length)} penguin, sampel ${fmt(sampleNo)}`));

    const speciesLegend = key => labelOf(key).values.map((val, i) => ({ kind: 'dot', color: clusterColor(i), label: `${valueText(key, val)} (${fmt(rows.filter(r => r.l[key] === val).length)})` }));
    const centerItem = { kind: 'diamond', label: tr('Group center', 'Pusat kelompok') };
    if (v.colors) lab.setLegend([...speciesLegend(colorKey), ...(cluster ? [centerItem] : [])]);
    else if (cluster) lab.setLegend([...Array.from({ length: cluster.centers.length }, (_, j) => ({ kind: 'dot', color: clusterColor(j), label: `${tr('Group', 'Kelompok')} ${fmt(j + 1)} (${fmt(cluster.assign.filter(a => a === j).length)})` })), centerItem]);
    else lab.setLegend([{ kind: 'dot', color: g.t.muted, label: tr(`${cap(noun())} (${labelName(colorKey)} hidden)`, `${cap(noun())} (${labelName(colorKey)} disembunyikan)`) }]);
    table(q, rows, fx, fy, labelKey);
  }

  lab.on(lab.canvas, 'pointerdown', e => {
    const [fx, fy] = pair();
    const { rows } = workRows(questionNow(), labelNow());
    const at = plot.nearest(e, spots(rows, fx, fy), 16);
    selected = at < 0 ? null : rows[at];
    draw();
  });
  lab.on(lab.canvas, 'keydown', e => {
    if (e.key === 'Escape') { selected = null; draw(); return; }
    const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    const [fx] = pair();
    const { rows } = workRows(questionNow(), labelNow());
    const order = rows.map((_, i) => i).sort((i, j) => rows[i].f[fx] - rows[j].f[fx] || i - j);
    const at = selected ? order.indexOf(rows.indexOf(selected)) : -1;
    selected = rows[at < 0 ? (dir > 0 ? order[0] : order.at(-1)) : order[Math.max(0, Math.min(order.length - 1, at + dir))]];
    draw();
  });
  lab.onReset(() => {
    loadToken++;
    seed = DEFAULT_SEED; sampleNo = 1; generated = birdsDataset(seed); ds = generated; dataStatus = 'ok'; selected = null; memo.clear();
    controls.set('data', 'generated'); controls.set('question', 'classification');
    fillLabelOptions();
    controls.set('x', 0); controls.set('y', 1); controls.set('k', DEFAULT_K); controls.set('colors', true); controls.set('gaps', false);
    buildPredict();
    draw();
  });
  lab.onTheme(draw);
  lab.onResize(draw);
  fillLabelOptions();
  buildPredict();
  draw();
  return lab.destroy;
}
