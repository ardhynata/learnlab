// Shared helpers for the simulators: element lookup, plot geometry on the
// 0..10 feature square, themed drawing, and the speed control.

// Seven cluster colors per theme (the same values as --k0..--k6 in style.css). The light set is dark
// enough to keep 3:1 against the light plot; the dark set is lighter so points stay distinct against the
// dark plot background. Grey is reserved for "no cluster" (NOISE, --noise), so no cluster looks unassigned.
const PALETTES = {
  light: ['#5143cb', '#d6457a', '#0b8a78', '#b87a0f', '#1a82c0', '#a24fb0', '#5f8a1a'],
  dark: ['#9a8cff', '#ff6f9f', '#3fcfb4', '#e6b04a', '#4db0ff', '#cf7fe0', '#a9d15a'],
};
const NOISE = { light: '#6e7b8f', dark: '#98a3b8' };
const dark = () => (typeof window.learnlabIsDark === 'function' ? window.learnlabIsDark() : false);
export const currentPalette = () => PALETTES[dark() ? 'dark' : 'light'];

// Seven curated colors, then golden-angle hues so any number of clusters stays distinct. A negative index
// (noise, unassigned) is the neutral grey.
export function clusterColor(i) {
  const pal = currentPalette();
  if (i < 0) return NOISE[dark() ? 'dark' : 'light'];
  if (i < pal.length) return pal[i];
  return `hsl(${(i * 137.508) % 360} 65% ${dark() ? 62 + (i % 4) * 4 : 36 + (i % 4) * 6}%)`;
}

export function theme() {
  const cs = getComputedStyle(document.documentElement);
  const v = name => cs.getPropertyValue(name).trim();
  return { plot: v('--plot-bg'), grid: v('--grid'), ink: v('--ink'), muted: v('--muted'), accent: v('--accent'), surface: v('--surface') };
}

export const DEFAULT_RANGE = { minX: 0, minY: 0, span: 10 };

// Builds the canvas geometry for a square feature range (default 0..10):
// the plot square, centered (see gridLeft), with room for axes.
export function geometry(canvas, range = DEFAULT_RANGE) {
  const { width, height, left, top } = canvas.getBoundingClientRect();
  const size = Math.max(1, Math.min(width - 62, height - 52)); // at least 31px each side: room for the rotated y title
  // The square sits a little right of centre when there is room: the y axis labels and title hang off its left
  // edge and nothing off its right, so this centres the whole figure (square plus labels) in the card.
  const gridLeft = (width - size) / 2 + Math.min(14, Math.max(0, (width - size - 62) / 2));
  const { minX, minY, span } = range;
  return {
    width, height, left, top, size, range,
    px: x => gridLeft + (x - minX) * size / span,
    py: y => 12 + (minY + span - y) * size / span,
  };
}

// An axis tick: up to five significant digits (no grouping, no rounding to three decimals like fmt()), written
// with the language's decimal separator, so the axes agree with every other number on the page.
export function formatTick(value) {
  const magnitude = Math.abs(value);
  const text = magnitude && (magnitude >= 10000 || magnitude < .01) ? value.toExponential(2) : String(Number(value.toPrecision(5)));
  return locale() === 'id' ? text.replace('.', ',') : text;
}

// Touch gestures on a canvas. Scrolling the page by swiping across a plot is the default (touch-action:pan-y in
// style.css); a canvas that is dragged needs touch-action:none, or the browser takes the gesture and cancels the
// drag. A canvas that listens for pointermove is dragged, so it gets .drag-surface; one that listens for
// pointerdown, pointermove or click takes input at all, so it gets .interactive (crosshair cursor). Display-only
// charts keep both defaults. A lab that sets its own inline touch-action keeps it.
function markInteractiveCanvases() {
  if (typeof HTMLCanvasElement === 'undefined') return;
  const proto = HTMLCanvasElement.prototype;
  if (Object.hasOwn(proto, 'addEventListener')) return; // already watching (this module loaded twice)
  const add = proto.addEventListener;
  proto.addEventListener = function (type, ...rest) {
    if (type === 'pointermove') this.classList.add('drag-surface');
    if (type === 'pointermove' || type === 'pointerdown' || type === 'click') this.classList.add('interactive');
    return add.call(this, type, ...rest);
  };
}
markInteractiveCanvases();

// Sizes the canvas backing store for the device pixel ratio and draws the
// plot square with ticks and axis titles. Returns the geometry for the caller.
export function beginPlot(canvas, ctx, xLabel = tr('Feature 1', 'Feature 1'), yLabel = tr('Feature 2', 'Feature 2'), range = DEFAULT_RANGE) {
  const g = geometry(canvas, range);
  const t = theme();
  const { minX, minY, span } = range;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(g.width * ratio);
  canvas.height = Math.round(g.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = t.plot;
  ctx.fillRect(g.px(minX), g.py(minY + span), g.size, g.size);
  ctx.strokeStyle = t.grid;
  ctx.fillStyle = t.muted;
  ctx.lineWidth = 1;
  ctx.font = '11px system-ui, sans-serif';
  ctx.beginPath();
  for (let i = 0; i <= 5; i++) {
    const x = minX + i * span / 5, y = minY + i * span / 5;
    ctx.moveTo(g.px(x), g.py(minY));
    ctx.lineTo(g.px(x), g.py(minY + span));
    ctx.moveTo(g.px(minX), g.py(y));
    ctx.lineTo(g.px(minX + span), g.py(y));
    ctx.textAlign = 'center';
    ctx.fillText(formatTick(x), g.px(x), g.py(minY) + 16);
    ctx.textAlign = 'right';
    ctx.fillText(formatTick(y), g.px(minX) - 7, g.py(y) + 4);
  }
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillText(xLabel, g.px(minX + span / 2), g.height - 5);
  ctx.save();
  ctx.translate(g.px(minX) - 23, g.py(minY + span / 2));   // on a phone the square starts 31px in: the title must stay inside the canvas
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
  return { ...g, t };
}

// Clips later drawing to the plot square.
export function clipToPlot(ctx, g) {
  const { minX, minY, span } = g.range;
  ctx.beginPath();
  ctx.rect(g.px(minX), g.py(minY + span), g.size, g.size);
  ctx.clip();
}

// Converts a pointer event into feature-space coordinates, clamped to the range.
export function eventToData(canvas, event, range = DEFAULT_RANGE) {
  const g = geometry(canvas, range);
  const { minX, minY, span } = range;
  const x = minX + (event.clientX - g.left - g.px(minX)) * span / g.size;
  const y = minY + span - (event.clientY - g.top - 12) * span / g.size;
  return { x: Math.max(minX, Math.min(minX + span, x)), y: Math.max(minY, Math.min(minY + span, y)) };
}

// Speed slider + multiplier box. Position 0..11 maps to 0.25x..256x; the last
// slider position means "instant". Returns the live state {multiplier, instant}.
export function setupSpeed(speed, speedInput, onChange) {
  const minSpeed = Number(speedInput.min);
  const maxSpeed = Number(speedInput.max);
  const state = { multiplier: Number(speedInput.value), instant: false };
  function update() {
    speedInput.value = state.instant ? '' : String(state.multiplier);
    speedInput.parentElement.classList.toggle('is-instant', state.instant);
    speed.setAttribute('aria-valuetext', state.instant ? tr('Instant', 'Instan') : `${state.multiplier}×`);
    onChange();
  }
  function position() {
    speed.value = Math.round(Math.log2(state.multiplier / minSpeed));
  }
  speed.addEventListener('input', () => {
    const pos = Number(speed.value);
    state.instant = pos === Number(speed.max);
    if (!state.instant) state.multiplier = minSpeed * 2 ** pos;
    update();
  });
  speedInput.addEventListener('change', () => {
    const requested = speedInput.valueAsNumber;
    if (Number.isFinite(requested)) {
      state.multiplier = Math.min(maxSpeed, Math.max(minSpeed, requested));
      state.instant = false;
      position();
    }
    update();
  });
  speedInput.addEventListener('keydown', e => { if (e.key === 'Enter') speedInput.blur(); });
  position();
  update();
  return state;
}

// Fullscreen toggle. The browser's own fullscreen is used when it is there; where it is not (iOS Safari) or
// it refuses, the workspace covers the viewport (.expanded). Either way the workspace is a modal dialog while it
// is open: focus moves to the Exit button, everything outside it is inert, Tab and Shift+Tab stay inside it
// (the browser's fullscreen would otherwise let Tab walk out to the address bar), Escape closes it, and focus
// returns to the button that opened it.
const FOCUSABLE = 'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex]:not([tabindex="-1"])';

// Where Tab should go instead of leaving the overlay: the first stop when Tab runs off the last (or focus is
// outside the overlay), the last stop when Shift+Tab runs off the first. null = let the browser move focus.
export function wrapTarget(stops, current, shift, inside = true) {
  if (!stops.length) return null;
  const first = stops[0], last = stops[stops.length - 1];
  if (!inside) return shift ? last : first;
  if (shift && current === first) return last;
  if (!shift && current === last) return first;
  return null;
}

const rendered = n => n.getClientRects().length > 0 && getComputedStyle(n).visibility !== 'hidden';
// The elements Tab visits in `root`, in order. A radio group is one stop (its checked radio, else its first).
function tabStops(root) {
  const radios = [...root.querySelectorAll('input[type=radio]')];
  const stopOf = r => {
    const group = radios.filter(o => o.name === r.name && o.form === r.form && rendered(o) && !o.disabled);
    return group.find(o => o.checked) ?? group[0];
  };
  return [...root.querySelectorAll(FOCUSABLE)].filter(n => rendered(n) && !n.closest('[inert]') && (n.type !== 'radio' || !n.name || stopOf(n) === n));
}
// The stop that `el` stands for: a radio that is not its group's stop stands for the one that is.
function stopFor(root, el) {
  if (el?.type !== 'radio' || !el.name) return el;
  const group = [...root.querySelectorAll('input[type=radio]')].filter(o => o.name === el.name && o.form === el.form && rendered(o) && !o.disabled);
  return group.find(o => o.checked) ?? group[0];
}

export function setupFullscreen(workspace, button, signal) {
  let dimmed = [];
  let modalOn = false;
  const expanded = () => workspace.classList.contains('expanded');
  const isOn = () => document.fullscreenElement === workspace || expanded();

  function paint() {
    const on = isOn();
    button.innerHTML = withIcon(on ? 'compress' : 'expand', on ? tr('Exit fullscreen', 'Keluar layar penuh') : tr('Fullscreen', 'Layar penuh'));
    button.setAttribute('aria-pressed', String(on));
  }
  // Everything that is not on the path from the workspace to <body> becomes inert while the overlay is open.
  function modal(on) {
    if (on === modalOn) return;
    modalOn = on;
    if (on) {
      const name = workspace.querySelector('h2,h3')?.textContent?.trim();
      workspace.setAttribute('role', 'dialog');
      workspace.setAttribute('aria-modal', 'true');
      if (name) workspace.setAttribute('aria-label', name);
      for (let node = workspace; node && node !== document.body; node = node.parentElement) {
        for (const sibling of node.parentElement?.children ?? []) {
          if (sibling !== node && !sibling.inert) { sibling.inert = true; dimmed.push(sibling); }
        }
      }
    } else {
      workspace.removeAttribute('role');
      workspace.removeAttribute('aria-modal');
      workspace.removeAttribute('aria-label');
      dimmed.forEach(n => { n.inert = false; });
      dimmed = [];
    }
  }
  // Brings the dialog state in line with whether the workspace is on: in, focus goes to the Exit button;
  // out, back to the button that opened it (it is the same button, so the learner is where they were).
  function sync() {
    const on = isOn();
    const changed = on !== modalOn;
    modal(on);
    paint();
    watchFit();
    if (changed) button.focus({ preventScroll: true });
  }
  const close = () => { workspace.classList.remove('expanded'); sync(); };

  // Wide fullscreen: the main plot card fills the screen height exactly (no scrolling). The overhead around the canvas (title,
  // toolbar, status line, legend) differs per lab, so it is measured: --plot-h = screen height - padding - that overhead.
  let fitObserver = null;
  function fit() {
    const sims = [workspace, ...workspace.querySelectorAll('.sim')];
    const card = workspace.querySelector('.plot-card');
    if (!isOn() || !card || innerWidth < 1100) { sims.forEach(n => n.style.removeProperty('--plot-h')); return; }
    const canvases = [...card.querySelectorAll('canvas')];
    const canvas = canvases.sort((a, b) => b.offsetHeight - a.offsetHeight)[0];
    if (!canvas) return;
    const cs = getComputedStyle(workspace);
    const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    // The card may be stretched over several grid rows, which inflates its parts: measure it at its natural height.
    const keep = [card.style.alignSelf, card.style.minHeight, card.style.height, card.style.maxHeight];
    // The card is also capped at the screen height; lift the cap too, or tall overhead is measured too small.
    card.style.alignSelf = 'start'; card.style.minHeight = '0'; card.style.height = 'auto'; card.style.maxHeight = 'none';
    const overhead = card.offsetHeight - canvas.offsetHeight;
    [card.style.alignSelf, card.style.minHeight, card.style.height, card.style.maxHeight] = keep;
    const want = Math.max(240, Math.floor(workspace.clientHeight - pad - overhead - 1));
    if (Math.abs(want - canvas.offsetHeight) > 2) {
      sims.forEach(n => n.style.setProperty('--plot-h', `${want}px`));
      // A lab whose canvases do not follow --plot-h (several small plots in one card) is left at its own size.
      if (Math.abs(canvas.offsetHeight - want) > 6) sims.forEach(n => n.style.removeProperty('--plot-h'));
    }
  }
  // A few stray pixels (under 24) are not worth a scrollbar; real content below the first screen stays reachable.
  const trim = () => { workspace.style.overflowY = isOn() && innerWidth >= 1100 && workspace.scrollHeight - workspace.clientHeight <= 24 ? 'hidden' : ''; };
  const refit = () => { fit(); trim(); requestAnimationFrame(() => { fit(); trim(); }); };
  function watchFit() {
    const on = isOn();
    if (on && !fitObserver && typeof ResizeObserver === 'function') {
      const card = workspace.querySelector('.plot-card');
      if (card) { fitObserver = new ResizeObserver(() => fit()); fitObserver.observe(card); }
    } else if (!on && fitObserver) { fitObserver.disconnect(); fitObserver = null; }
    refit();
  }
  addEventListener('resize', refit, { signal });

  button.addEventListener('click', async () => {
    if (document.fullscreenElement === workspace) { await document.exitFullscreen(); return; }
    if (expanded()) { close(); return; }
    if (workspace.requestFullscreen) {
      try { await workspace.requestFullscreen(); sync(); return; } catch { /* fall back to the viewport */ }
    }
    workspace.classList.add('expanded');
    sync();
  });
  document.addEventListener('fullscreenchange', sync, { signal });
  document.addEventListener('keydown', e => {
    if (!isOn()) return;
    if (e.key === 'Escape') { if (expanded()) { e.preventDefault(); close(); } return; }
    if (e.key !== 'Tab') return;
    const inside = workspace.contains(document.activeElement);
    const stops = tabStops(workspace);
    const target = wrapTarget(stops, stopFor(workspace, document.activeElement), e.shiftKey, inside);
    if (target) { e.preventDefault(); target.focus(); }
  }, { signal });
  // Leaving the page (or the lab) while the overlay is open must not leave the page inert.
  signal?.addEventListener('abort', () => {
    workspace.classList.remove('expanded');
    modal(false);
    fitObserver?.disconnect(); fitObserver = null;
    if (document.fullscreenElement === workspace) document.exitFullscreen?.().catch(() => {});
  });
}

// Inline SVG icons for the toolbar. They use currentColor, so they follow the
// button's text color in both themes, and are hidden from screen readers
// because every button keeps its visible text label.
const svg = body => `<svg class="icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">${body}</svg>`;
export const icons = {
  play: svg('<path d="M7 4.8v14.4a.8.8 0 0 0 1.2.7l11.4-7.2a.8.8 0 0 0 0-1.4L8.2 4.1A.8.8 0 0 0 7 4.8Z" fill="currentColor"/>'),
  pause: svg('<rect x="6" y="4.5" width="4.2" height="15" rx="1.2" fill="currentColor"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.2" fill="currentColor"/>'),
  nextStep: svg('<path d="M5 5.2v13.6a.8.8 0 0 0 1.2.7l9.6-6.8a.8.8 0 0 0 0-1.4L6.2 4.5A.8.8 0 0 0 5 5.2Z" fill="currentColor"/><rect x="17.2" y="4.5" width="2.8" height="15" rx="1.2" fill="currentColor"/>'),
  prevStep: svg('<g transform="matrix(-1 0 0 1 24 0)"><path d="M5 5.2v13.6a.8.8 0 0 0 1.2.7l9.6-6.8a.8.8 0 0 0 0-1.4L6.2 4.5A.8.8 0 0 0 5 5.2Z" fill="currentColor"/><rect x="17.2" y="4.5" width="2.8" height="15" rx="1.2" fill="currentColor"/></g>'),
  expand: svg('<path d="M4 9.5V4h5.5M20 9.5V4h-5.5M4 14.5V20h5.5M20 14.5V20h-5.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  compress: svg('<path d="M9.5 4v5.5H4M14.5 4v5.5H20M9.5 20v-5.5H4M14.5 20v-5.5H20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  // One circular arrow serves both "Run again" and "Reset".
  restart: svg('<path d="M20 12a8 8 0 1 1-2.6-5.9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M20.2 3.6v4.9h-4.9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
};

import { tr, locale } from '../i18n.js';

const withIcon = (name, label) => `${icons[name]}<span>${label}</span>`;
const runStates = () => ({ run: ['play', tr('Run', 'Jalankan')], pause: ['pause', tr('Pause', 'Jeda')], again: ['restart', tr('Run again', 'Jalankan lagi')] });

// Sets the Run button to its play, pause or run-again state.
export function setRunButton(button, state) {
  const [icon, label] = runStates()[state];
  button.innerHTML = withIcon(icon, label);
}

// The shared toolbar markup: fullscreen/reset, and run/step/speed.
export const actionsHTML = () => `<div class="sim-actions"><button type="button" data-act="fullscreen" aria-pressed="false">${withIcon('expand', tr('Fullscreen', 'Layar penuh'))}</button><button type="button" data-act="reset">${withIcon('restart', tr('Reset', 'Reset'))}</button></div>`;
export const playbackHTML = () => `<div class="playback"><button type="button" class="primary" data-act="run">${withIcon('play', tr('Run', 'Jalankan'))}</button><button type="button" data-act="prev" title="${tr('Previous step', 'Langkah sebelumnya')}">${withIcon('prevStep', tr('Previous step', 'Langkah sebelumnya'))}</button><button type="button" data-act="step" title="${tr('Next step', 'Langkah berikutnya')}">${withIcon('nextStep', tr('Next step', 'Langkah berikutnya'))}</button>
<div class="speed-control"><label>${tr('Speed', 'Kecepatan')}</label><input data-ref="speed" type="range" min="0" max="11" step="1" value="2" aria-label="${tr('Playback speed', 'Kecepatan putar')}"><input data-ref="speedValue" type="number" min="0.25" max="256" step="any" value="1" placeholder="${tr('Instant', 'Instan')}" aria-label="${tr('Playback speed multiplier', 'Kelipatan kecepatan putar')}" inputmode="decimal"><span class="speed-suffix" aria-hidden="true">×</span></div></div>`;

// ---- Parameters on a phone: a bottom sheet -------------------------------------------------------------------
// On a wide screen the parameters card is sticky beside the lab (style.css). On a phone it would sit far below the
// plot, so it becomes a sheet that a floating "Parameters" button opens over the lower part of the screen: the plot and
// the charts stay visible above it while a slider moves. Not modal: the page behind stays usable. Escape or the close
// button closes it and puts focus back on the button.
export function wireSettingsSheet(host) {
  const none = { open() {}, close() {}, destroy() {} };
  if (typeof document === 'undefined' || typeof matchMedia !== 'function') return none;
  const side = host.querySelector('.sim .settings') || host.querySelector('.sim .side > :first-child');
  if (!side) return none;
  const mq = matchMedia('(max-width: 860px)');
  side.classList.add('lab-sheet-target');
  side.id ||= `sheet-${Math.random().toString(36).slice(2, 8)}`;
  side.setAttribute('role', 'region');
  side.setAttribute('aria-label', tr('Parameters', 'Parameter'));
  const ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M4 7h9M17 7h3M4 17h3M11 17h9M13 4v6M7 14v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const bar = document.createElement('div');
  bar.className = 'sheet-bar';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button'; closeBtn.className = 'sheet-close';
  closeBtn.setAttribute('aria-label', tr('Close parameters', 'Tutup parameter'));
  closeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  const barTitle = document.createElement('strong');
  barTitle.textContent = tr('Parameters', 'Parameter');
  bar.append(barTitle, closeBtn);
  side.prepend(bar);
  const fab = document.createElement('button');
  fab.type = 'button'; fab.className = 'fab-settings';
  fab.setAttribute('aria-controls', side.id); fab.setAttribute('aria-expanded', 'false');
  fab.innerHTML = `${ICON}<span>${tr('Parameters', 'Parameter')}</span>`;
  document.body.append(fab);

  const isOpen = () => side.classList.contains('sheet-open');
  function open() {
    if (!mq.matches) return;
    side.classList.add('sheet-open'); document.body.classList.add('lab-sheet-open');
    fab.setAttribute('aria-expanded', 'true');
    side.querySelector('select, input, button:not(.sheet-close)')?.focus({ preventScroll: true });
  }
  function close(returnFocus) {
    side.classList.remove('sheet-open'); document.body.classList.remove('lab-sheet-open');
    fab.setAttribute('aria-expanded', 'false');
    if (returnFocus) fab.focus({ preventScroll: true });
  }
  const onFab = () => (isOpen() ? close(true) : open());
  const onClose = () => close(true);
  const onKey = e => { if (e.key === 'Escape' && isOpen() && !e.defaultPrevented) { e.preventDefault(); close(true); } };
  const onMq = () => { if (!mq.matches) close(false); };
  fab.addEventListener('click', onFab); closeBtn.addEventListener('click', onClose);
  document.addEventListener('keydown', onKey); mq.addEventListener?.('change', onMq);
  const api = {
    open, close,
    destroy() {
      close(false); fab.remove(); bar.remove();
      fab.removeEventListener('click', onFab); closeBtn.removeEventListener('click', onClose);
      document.removeEventListener('keydown', onKey); mq.removeEventListener?.('change', onMq);
      side.classList.remove('lab-sheet-target'); side.removeAttribute('role'); side.removeAttribute('aria-label');
      if (globalThis.__labSheet === api) globalThis.__labSheet = null;
    },
  };
  globalThis.__labSheet = api;
  return api;
}

// The toolbar's "Parameters" button (only shown on a phone) opens the sheet.
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function' && !globalThis.__toSettingsWired) {
  globalThis.__toSettingsWired = true;
  document.addEventListener('click', e => {
    const b = e.target.closest?.('[data-act="to-settings"]');
    if (b) globalThis.__labSheet?.open();
  });
}

// ---- Lab cards in fullscreen ------------------------------------------------------------------------------------
// In fullscreen the main simulator is on the left and the first one or two boxes (a table or a chart, in the order the
// lab shows them) stand in a column to its right; any further box gets a screen of its own below (style.css). This marks
// the cards: data-lab-card is "side" for the first two, "chart" for a later chart, "table" for a later table, and
// --side-rows on the lab says how many boxes the plot card must span. The normal page ignores the marks.
export function layoutLabCards(host) {
  const none = { destroy() {} };
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return none;
  const root = host.querySelector('.sim')?.parentElement;
  if (!root) return none;
  const items = () => {
    const below = root.querySelector(':scope > [data-ref=below]');
    // A wrapper that only pairs two cards side by side (data-ref=pair) is looked through: its cards are the boxes.
    const flat = list => list.flatMap(e => (e.matches?.('[data-ref=pair]') ? [...e.children] : [e]));
    return flat([...(below ? [...below.children] : []), ...[...root.children].filter(e => e !== below && !e.classList.contains('sim'))])
      .filter(e => e.nodeType === 1 && e.matches('.card') && !e.classList.contains('predict'));
  };
  let queued = false;
  function mark() {
    queued = false;
    let sides = 0;
    for (const card of items()) {
      delete card.dataset.labCard;
      mo.observe(card, { attributes: true, attributeFilter: ['style', 'hidden'] });   // a lab that shows or hides a box re-marks the rest
      if (card.hidden || card.style.display === 'none') { delete card.dataset.labFirst; continue; }
      const kind = card.querySelector('canvas') ? 'chart' : card.querySelector('table') || card.matches('.table-card') ? 'table' : null;
      if (!kind) continue;
      delete card.dataset.labFirst;
      // The layout rule (docs/lab-layout.md): every chart or table box goes in the middle column, in order.
      card.dataset.labCard = 'side'; if (sides === 0) card.dataset.labFirst = ''; sides++;
    }
    root.style.setProperty('--side-rows', String(Math.max(1, sides)));
    root.dataset.sides = String(sides);
    // Fullscreen row sizes: a chart takes the spare height, a table keeps the height of its rows (so it never needs its own scrollbar).
    // Three or more charts share a short screen: a lower floor per chart keeps them all inside it (200px each would not fit at 1100x700).
    const charts = items().filter(c => c.dataset.labCard === 'side' && c.querySelector('canvas')).length;
    const floor = charts >= 3 ? 120 : charts === 2 ? 160 : 200;
    root.style.setProperty('--chart-min', `${floor}px`);
    const flow = root.hasAttribute('data-side-flow');   // a lab whose boxes hold more than a screen: they keep their own height and the stage scrolls
    const kinds = items().filter(c => c.dataset.labCard === 'side').map(c => (flow ? 'auto' : c.querySelector('canvas') ? `minmax(${charts >= 2 ? floor + 72 : floor}px,1fr)` : 'auto'));
    root.style.setProperty('--side-tpl', [...kinds, ...Array(Math.max(0, 14 - kinds.length)).fill('auto')].slice(0, Math.max(14, kinds.length)).join(' '));
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(mark); } };
  const mo = new MutationObserver(queue);
  mo.observe(root, { childList: true });
  const below = root.querySelector(':scope > [data-ref=below]');
  if (below) mo.observe(below, { childList: true });
  mark();
  const late = setTimeout(mark, 500);   // tables that are filled in after the first draw
  return { destroy() { mo.disconnect(); clearTimeout(late); root.style.removeProperty('--side-rows'); root.style.removeProperty('--chart-min'); delete root.dataset.sides; } };
}
