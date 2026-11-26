// "Quick Quiz": the syllabus lesson design asks learners to say what will happen before
// they change a setting, then compare with what the lab shows. Every box lives in the lab's floating Quick Quiz widget (one
// button with a counter badge for the quizzes not answered yet, Prev and Next between them).
//
//   const box = predictBox(lab.ref('below'), {
//     question: tr('What happens to the mean when you add the outlier?', '...'),
//     choices: [['up', tr('It goes up', '...')], ['same', tr('It stays the same', '...')], ['down', tr('It goes down', '...')]],
//   });
//   // later, after the learner acts and the lab knows the answer:
//   box.reveal('up', tr('The mean moves toward the outlier; the median barely moves.', '...'));
//   box.reset();   // new round
//
// Returns { reveal(actualKey, explanation), reset(), chosen() }. Text goes through textContent only.
import { tr } from '../../i18n.js';

export function judge(chosen, actual) {
  if (chosen == null) return 'none';
  return chosen === actual ? 'right' : 'wrong';
}

const ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.2c-.8.5-1.2.9-1.2 1.8M12 16.8v.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
let uid = 0;

// One Quick Quiz widget per lab: a floating button (quiz icon with a counter of the quizzes not answered yet) that opens a
// small floating panel with one quiz at a time and Prev / Next between them. It is separate from the Parameters card and
// lives inside the lab's own element, so it also shows in fullscreen. Found from any container inside the lab.
const managers = new WeakMap();
function labRootOf(container) {
  for (let r = container; r; r = r.parentElement) if (r.querySelector?.(':scope > .sim')) return r;
  return null;
}
function managerFor(container) {
  const root = labRootOf(container);
  if (!root) return null;
  if (managers.has(root)) return managers.get(root);
  const id = `qq-${++uid}`;
  root.classList.add('has-qq');   // the lab area keeps room at its bottom for the docked button (style.css)
  const wrap = document.createElement('div');
  wrap.className = 'qq-widget';
  wrap.innerHTML = `<div class="qq-panel" id="${id}" role="dialog" aria-label="${tr('Quick Quiz', 'Kuis Cepat')}" hidden>
  <div class="qq-head"><strong>${tr('Quick Quiz', 'Kuis Cepat')}</strong>
    <span class="qq-nav"><button type="button" class="qq-prev" aria-label="${tr('Previous quiz', 'Kuis sebelumnya')}">‹</button><span class="qq-pos" aria-live="polite"></span><button type="button" class="qq-next" aria-label="${tr('Next quiz', 'Kuis berikutnya')}">›</button></span>
    <button type="button" class="qq-close" aria-label="${tr('Close Quick Quiz', 'Tutup Kuis Cepat')}"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button></div>
  <div class="qq-stage"></div>
  <p class="qq-note">${tr('Practice only, not scored.', 'Hanya latihan, tidak dinilai.')}</p>
</div>
<button type="button" class="qq-fab" aria-expanded="false" aria-controls="${id}" title="${tr('Quick Quiz', 'Kuis Cepat')}">${ICON}<span class="qq-fab-label">${tr('Quick Quiz', 'Kuis Cepat')}</span><span class="qq-badge" aria-hidden="true"></span></button>`;
  root.append(wrap);
  const $ = sel => wrap.querySelector(sel);
  const fab = $('.qq-fab'), panel = $('.qq-panel'), badge = $('.qq-badge'), pos = $('.qq-pos'), prev = $('.qq-prev'), next = $('.qq-next'), stage = $('.qq-stage'), nav = $('.qq-nav');
  const boxes = []; let active = 0, open = false;
  const unanswered = () => boxes.filter(b => !b.answered).length;
  function setOpen(on, returnFocus) {
    open = on; panel.hidden = !on; wrap.classList.toggle('qq-open', on); fab.setAttribute('aria-expanded', String(on));
    if (on) { badge.classList.remove('pulse'); panel.querySelector('.predict:not([hidden]) input, .qq-close')?.focus({ preventScroll: true }); }
    else if (returnFocus) fab.focus({ preventScroll: true });
  }
  // On a wide screen the Quick Quiz button is a rectangle docked right under the Parameters card and follows it (the card is
  // sticky); the panel opens below it. Without that card on screen (a phone) it is a round button floating at the bottom right.
  const card = root.querySelector(':scope > .sim > .settings') || root.querySelector(':scope > .sim > .side > :first-child');
  const mq = matchMedia('(min-width: 861px)');
  let raf = 0;
  function place() {
    raf = 0;
    const docked = Boolean(card && mq.matches && card.getClientRects().length);
    wrap.classList.toggle('qq-docked', docked);
    if (!docked) { wrap.style.cssText = ''; panel.style.maxHeight = ''; return; }
    // Right under the Parameters card, as wide as the card; it goes wherever the card goes (also off screen with it).
    const c = card.getBoundingClientRect();
    wrap.style.cssText = `left:${Math.round(c.left)}px;top:${Math.round(c.bottom + 12)}px;width:${Math.round(c.width)}px;right:auto;bottom:auto`;
    const panelTop = fab.getBoundingClientRect().bottom + 12;
    panel.style.maxHeight = `${Math.max(160, Math.round(innerHeight - panelTop - 16))}px`;   // scrolls inside when short
  }
  const queuePlace = () => { if (!raf) raf = requestAnimationFrame(place); };
  window.addEventListener('scroll', queuePlace, { capture: true, passive: true });
  window.addEventListener('resize', queuePlace);
  mq.addEventListener?.('change', queuePlace);
  // Entering or leaving fullscreen moves the Parameters card sideways without resizing it: place again, now and once the layout settles.
  const onFs = () => { queuePlace(); setTimeout(queuePlace, 200); };
  document.addEventListener('fullscreenchange', onFs);
  const mo = typeof MutationObserver === 'function' ? new MutationObserver(onFs) : null;
  mo?.observe(root, { attributes: true, attributeFilter: ['class'] });
  const ro = typeof ResizeObserver === 'function' && card ? new ResizeObserver(queuePlace) : null;
  if (card) ro?.observe(card);
  const unplace = () => { window.removeEventListener('scroll', queuePlace, { capture: true }); window.removeEventListener('resize', queuePlace); mq.removeEventListener?.('change', queuePlace); document.removeEventListener('fullscreenchange', onFs); mo?.disconnect(); ro?.disconnect(); cancelAnimationFrame(raf); };
  const mgr = {
    add(box) { boxes.push(box); stage.append(box.root); render(); return box; },
    remove(box) {
      const i = boxes.indexOf(box); if (i < 0) return;
      boxes.splice(i, 1); box.root.remove(); active = Math.min(active, Math.max(0, boxes.length - 1));
      if (!boxes.length) { document.removeEventListener('keydown', onKey); unplace(); wrap.remove(); root.classList.remove('has-qq'); managers.delete(root); return; }
      render();
    },
    changed(box, revealed) {
      render();
      if (revealed && (!open || boxes[active] !== box)) { badge.classList.remove('pulse'); void badge.offsetWidth; badge.classList.add('pulse'); }
    },
  };
  function render() {
    const left = unanswered();
    boxes.forEach((b, i) => { b.root.hidden = i !== active; });
    pos.textContent = tr(`${active + 1} of ${boxes.length}`, `${active + 1} dari ${boxes.length}`);
    prev.disabled = active === 0; next.disabled = active >= boxes.length - 1; nav.hidden = boxes.length < 2;
    // The badge only counts the quizzes not answered yet: with none left it is not shown.
    badge.textContent = String(left); badge.hidden = left === 0;
    queuePlace();
    fab.setAttribute('aria-label', left ? tr(`Quick Quiz, ${left} not answered yet`, `Kuis Cepat, ${left} belum dijawab`) : tr('Quick Quiz, all answered', 'Kuis Cepat, semua sudah dijawab'));
  }
  const onKey = e => { if (e.key === 'Escape' && open && !e.defaultPrevented) { e.preventDefault(); setOpen(false, true); } };
  fab.addEventListener('click', () => setOpen(!open, true));
  $('.qq-close').addEventListener('click', () => setOpen(false, true));
  prev.addEventListener('click', () => { if (active > 0) { active--; render(); } });
  next.addEventListener('click', () => { if (active < boxes.length - 1) { active++; render(); } });
  document.addEventListener('keydown', onKey);
  managers.set(root, mgr);
  return mgr;
}

export function predictBox(container, { question, choices, name = 'predict', hint = '' }) {
  const root = document.createElement('section');
  root.className = 'card predict';
  const fs = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = tr('Quick Quiz', 'Kuis Cepat');
  const q = document.createElement('p');
  q.className = 'predict-q';
  q.textContent = question;
  const options = document.createElement('div');
  options.className = 'predict-options';
  const feedback = document.createElement('p');
  feedback.className = 'predict-feedback';
  feedback.setAttribute('role', 'status');
  let chosen = null;
  const pickers = [];
  const checkers = [];

  const inputs = choices.map(([key, label]) => {
    const row = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio'; input.name = `${name}-${Math.random().toString(36).slice(2, 7)}`; input.value = key;
    input.addEventListener('change', () => { chosen = key; feedback.textContent = ''; feedback.className = 'predict-feedback'; pickers.forEach(fn => fn(key)); });
    row.append(input, ' ', label);
    options.append(row);
    return input;
  });
  // radios share one group name
  const group = inputs[0]?.name; inputs.forEach(i => { i.name = group; });

  // "Check answer": asks the lab to evaluate the picked answer against what the lab shows now. A lab registers its own check
  // with box.onCheck(fn); without one, the lab's onPick handler does the evaluating. If nothing was revealed (the lab is not in
  // the state the question needs yet), the box says what to do first.
  const check = document.createElement('button');
  check.type = 'button'; check.className = 'btn predict-check';
  check.textContent = tr('Check answer', 'Periksa jawaban');
  check.addEventListener('click', () => {
    if (chosen == null) { feedback.textContent = tr('Pick an answer first.', 'Pilih jawaban dulu.'); feedback.className = 'predict-feedback none'; return; }
    const before = box.reveals;
    (checkers.length ? checkers : pickers).forEach(fn => fn(chosen));
    if (box.reveals === before) {
      feedback.textContent = hint || tr('Try it in the lab first, then check again.', 'Coba dulu di lab, lalu periksa lagi.');
      feedback.className = 'predict-feedback none';
    }
  });

  fs.append(legend, q, options, check, feedback);
  root.append(fs);
  const box = {
    root, answered: false, reveals: 0,
    chosen: () => chosen,
    onCheck(fn) { checkers.push(fn); },
    // Calls fn(key) whenever the learner picks an answer (the box lives in the Parameters panel, so a lab cannot listen for the change event on its own container).
    onPick(fn) { pickers.push(fn); },
    reveal(actual, explanation = '') {
      const verdict = judge(chosen, actual);
      const label = (choices.find(([k]) => k === actual) ?? [, actual])[1];
      const lead = verdict === 'right' ? tr('You predicted it.', 'Prediksimu tepat.')
        : verdict === 'wrong' ? tr('Not what you expected. What happened:', 'Tidak seperti dugaanmu. Yang terjadi:')
          : tr('You did not pick a prediction. What happened:', 'Kamu belum memilih prediksi. Yang terjadi:');
      feedback.textContent = `${lead} ${label}. ${explanation}`.trim();
      feedback.className = `predict-feedback ${verdict}`;
      box.answered = true; box.reveals++; manager?.changed(box, true);
    },
    reset() { chosen = null; inputs.forEach(i => { i.checked = false; }); feedback.textContent = ''; feedback.className = 'predict-feedback'; box.answered = false; manager?.changed(box, false); },
    destroy() { if (manager) manager.remove(box); else root.remove(); },
  };
  const manager = managerFor(container);
  if (manager) manager.add(box); else container.append(root);
  return box;
}
