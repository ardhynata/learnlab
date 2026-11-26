// The standard lab page: a plot card with the shared toolbar, a parameter panel,
// optional status line, legend and extra cards. Labs build on this so they all
// look and behave the same (fullscreen, theme changes, resizing, clean-up).
//
//   export function mount(root) {
//     const lab = createLab(root, { title: 'Feature space', hint: '...', playback: true, status: true });
//     const plot = createPlot(lab.canvas);
//     const p = lab.panel([...], (name, values) => draw());
//     lab.onTheme(draw); lab.onResize(draw);
//     draw();
//     return lab.destroy;
//   }
import { tr } from '../../i18n.js';
import { actionsHTML, playbackHTML, setupFullscreen } from '../common.js';
import { panel } from './panel.js';
import { createStepper } from './stepper.js';

let describeCount = 0;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createLab(root, opts = {}) {
  const { title = tr('Feature space', 'Feature space'), hint = '', playback = false, status = false, settingsTitle = tr('Parameters', 'Parameter'), canvasLabel = tr('Plot', 'Plot'), extra = null, legend = true } = opts;
  const abort = new AbortController();
  const cleanups = [];
  let resetHandler = null;

  // The stage is what goes fullscreen: the plot, its parameters and the companion charts below them.
  root.innerHTML = `
<div class="lab-stage" data-ref="stage">
<div class="sim" data-ref="workspace">
  <section class="card plot-card">
    <div class="card-head"><div><h2 class="lab-h">${esc(title)}</h2>${hint ? `<p>${esc(hint)}</p>` : ''}</div>${actionsHTML()}</div>
    ${playback ? playbackHTML() : ''}
    ${status ? '<div class="plot-progress"><div><div class="status" data-ref="status" role="status"></div><p class="hint" data-ref="detail"></p></div><div class="metrics"><span data-ref="metrics"></span></div></div>' : ''}
    <div class="chart"><canvas data-ref="plot" tabindex="0" role="application" aria-label="${esc(canvasLabel)}"></canvas></div>
    ${legend ? '<div class="legend" data-ref="legend"></div>' : ''}
  </section>
  <aside class="card settings"><h2 class="lab-h">${esc(settingsTitle)}</h2><div data-ref="panel"></div></aside>
</div>
<div data-ref="below"></div>
${extra ? `<section class="card table-card"><h3 class="lab-h">${esc(extra.title)}</h3>${extra.hint ? `<p class="hint">${esc(extra.hint)}</p>` : ''}<div class="table-scroll" data-ref="extra"></div></section>` : ''}
</div>`;

  const ref = name => root.querySelector(`[data-ref="${name}"]`);
  const canvas = ref('plot');
  const on = (target, type, fn, o = {}) => target.addEventListener(type, fn, { signal: abort.signal, ...o });
  setupFullscreen(ref('stage'), root.querySelector('[data-act="fullscreen"]'), abort.signal);
  on(root.querySelector('[data-act="reset"]'), 'click', () => resetHandler?.());

  const ro = new ResizeObserver(() => resizeHandlers.forEach(fn => fn()));
  const resizeHandlers = [];
  ro.observe(canvas);

  const lab = {
    root, canvas, ref, signal: abort.signal, on,
    extraEl: ref('extra'),
    // Registers `fn` to run when the theme flips or the canvas resizes.
    onTheme(fn) { on(window, 'themechange', fn); },
    onResize(fn) { resizeHandlers.push(fn); },
    onReset(fn) { resetHandler = fn; },
    cleanup(fn) { cleanups.push(fn); },
    panel(specs, onChange) { return panel(ref('panel'), specs, onChange); },
    stepper(options) { return createStepper(lab, options); },
    setStatus(text) { const e = ref('status'); if (e) e.textContent = text; },
    setDetail(text) { const e = ref('detail'); if (e) e.textContent = text; },
    setMetrics(text) { const e = ref('metrics'); if (e) e.textContent = text; },
    // items: [{ kind, color, label }]. The glyph is drawn like the mark it stands for:
    // 'dot' (default), 'diamond' (filled, outlined in ink), 'ring', 'cross' and 'line' ('dash' for a dashed one).
    setLegend(items) {
      const host = ref('legend');
      if (!host) return;
      host.replaceChildren(...items.map(it => {
        const span = document.createElement('span');
        const kind = ['diamond', 'ring', 'cross', 'line', 'dash'].includes(it.kind) ? it.kind : 'dot';
        const i = document.createElement('i');
        i.className = kind === 'cross' ? 'glyph-cross' : kind === 'line' || kind === 'dash' ? `glyph-line${kind === 'dash' ? ' dashed' : ''}` : kind;
        i.setAttribute('aria-hidden', 'true');
        if (it.color) i.style.setProperty('--glyph', it.color);
        span.append(i, ` ${it.label}`);
        return span;
      }));
    },
    // Words for a canvas, for people who cannot see it: a short summary the canvas is described by. Call it
    // again whenever the picture's meaning changes (a new fit, a new score).
    describe(canvasEl, text) {
      let note = canvasEl.parentElement.querySelector('.sr-only[data-describes]');
      if (!note) {
        note = document.createElement('p');
        note.className = 'sr-only';
        note.dataset.describes = '';
        note.id = `desc-${++describeCount}`;
        canvasEl.after(note);
        canvasEl.setAttribute('aria-describedby', [canvasEl.getAttribute('aria-describedby'), note.id].filter(Boolean).join(' '));
      }
      note.textContent = text;
    },
    // An extra card under the plot with its own canvas (curves, charts).
    chartCard(cardTitle, cardHint = '', height = 240) {
      const card = document.createElement('section');
      card.className = 'card table-card';
      const hintId = `hint-${++describeCount}`;
      // A chart is a picture: role=img, named by its title and described by its hint (and by lab.describe).
      card.innerHTML = `<h2 class="lab-h">${esc(cardTitle)}</h2>${cardHint ? `<p class="hint" id="${hintId}">${esc(cardHint)}</p>` : ''}<div class="chart"><canvas style="height:${height}px" role="img" aria-label="${esc(cardTitle)}"${cardHint ? ` aria-describedby="${hintId}"` : ''}></canvas></div>`;
      ref('below').append(card);
      const c = card.querySelector('canvas');
      ro.observe(c);
      return c;
    },
    destroy() { cleanups.forEach(fn => fn()); ro.disconnect(); abort.abort(); },
  };
  return lab;
}
