import { fmt as fmtNum } from '../../i18n.js';
// Declarative parameter panel. Describe the controls, get the DOM and a values
// object back; the panel uses the same styles as the other labs (.settings).
//
//   const p = panel(container, [
//     { name: 'metric', type: 'select', label: 'Distance', options: [['euclidean', 'Euclidean'], ['manhattan', 'Manhattan']] },
//     { name: 'r', type: 'range', label: 'Radius', min: 0, max: 10, step: 0.1, value: 3 },
//     { name: 'n', type: 'number', label: 'Points', min: 1, max: 500, step: 1, value: 50 },
//     { name: 'ball', type: 'toggle', label: 'Show the unit ball', value: true },
//     { name: 'reset', type: 'button', label: 'Reset', onClick: () => {} },   // buttons in a row form one group
//     { name: 'big', type: 'button', label: 'Big', group: 'Presets', onClick: () => {} },   // group: a caption for the group
//     { type: 'note', text: 'Drag a point.' },
//   ], (name, values) => redraw());
//
// p.values() -> {metric, r, n, ball}; p.set(name, value); p.disable(name, bool); p.show(name, bool) hides a control that does not apply.

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else e.setAttribute(k, v === true ? '' : v);
  }
  e.append(...kids.flat().filter(k => k != null && k !== false));
  return e;
}

let controlCount = 0;

export function panel(container, specs, onChange = () => {}) {
  const fields = new Map();
  const root = el('div', { class: 'panel' });
  const emit = name => onChange(name, values());
  let group = null; // the open run of buttons: they sit together, in equal columns

  for (const spec of specs) {
    if (spec.type !== 'button') group = null;
    if (spec.type === 'note') { root.append(el('p', { class: 'hint' }, spec.text)); continue; }
    if (spec.type === 'button') {
      const b = el('button', { type: 'button', class: 'panel-button' }, spec.label);
      b.addEventListener('click', () => spec.onClick?.());
      fields.set(spec.name, { input: b, spec });
      if (!group) {
        const label = spec.group ? el('p', { class: 'group-label', id: `pg-${++controlCount}` }, spec.group) : null;
        group = el('div', { class: 'button-group', role: label ? 'group' : null, 'aria-labelledby': label?.id }, );
        root.append(...(label ? [label] : []), group);
      }
      group.append(b);
      continue;
    }
    let input, read, write, wrap;
    if (spec.type === 'select') {
      input = el('select', {}, spec.options.map(([v, l]) => el('option', { value: v }, l)));
      input.value = String(spec.value ?? spec.options[0][0]);
      read = () => input.value;
      write = v => { input.value = String(v); };
      input.addEventListener('change', () => emit(spec.name));
      wrap = el('label', {}, spec.label, input);
    } else if (spec.type === 'range') {
      input = el('input', { type: 'range', min: spec.min, max: spec.max, step: spec.step ?? 1 });
      input.value = String(spec.value ?? spec.min);
      // The label names the slider (for= its id) and the formatted value is what it announces
      // (aria-valuetext); the visible readout is hidden from assistive tech, so dragging does not announce twice.
      const id = `ctl-${++controlCount}`;
      input.id = id;
      const out = el('output', { for: id, 'aria-hidden': 'true' });
      const fmt = spec.format ?? (v => fmtNum(v));
      const show = () => { const text = fmt(Number(input.value)); out.textContent = text; input.setAttribute('aria-valuetext', text); };
      show();
      read = () => Number(input.value);
      write = v => { input.value = String(v); show(); };
      input.addEventListener('input', () => { show(); emit(spec.name); });
      wrap = el('div', { class: 'slider-label' }, el('label', { for: id }, spec.label), out, input);
    } else if (spec.type === 'number') {
      input = el('input', { type: 'number', min: spec.min, max: spec.max, step: spec.step ?? 1 });
      input.value = String(spec.value ?? spec.min ?? 0);
      let last = Number(input.value);
      const clamp = v => Math.min(spec.max ?? Infinity, Math.max(spec.min ?? -Infinity, spec.step >= 1 || spec.step == null ? Math.round(v) : v));
      read = () => Number(input.value);
      write = v => { last = v; input.value = String(v); };
      // An invalid entry snaps back to the last valid value instead of silently changing the lab.
      input.addEventListener('change', () => {
        const next = Number.isFinite(input.valueAsNumber) ? clamp(input.valueAsNumber) : last;
        input.value = String(next);
        if (next === last) return;
        last = next;
        emit(spec.name);
      });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
      wrap = el('label', {}, spec.label, input);
    } else if (spec.type === 'toggle') {
      input = el('input', { type: 'checkbox' });
      input.checked = Boolean(spec.value);
      read = () => input.checked;
      write = v => { input.checked = Boolean(v); };
      input.addEventListener('change', () => emit(spec.name));
      wrap = el('label', { class: 'toggle' }, input, ' ', spec.label);
    } else {
      throw new Error(`panel: unknown control type ${spec.type}`);
    }
    fields.set(spec.name, { input, read, write, spec, wrap });
    root.append(wrap);
  }

  function values() {
    const out = {};
    for (const [name, f] of fields) if (f.read) out[name] = f.read();
    return out;
  }
  container.append(root);
  return {
    el: root,
    values,
    get: name => fields.get(name)?.read?.(),
    set(name, value) { fields.get(name)?.write?.(value); },
    // Shows or hides a whole control (its label, readout and input). A hidden control keeps its value.
    show(name, on) { const f = fields.get(name); if (f?.wrap) { f.wrap.style.display = on ? '' : 'none'; f.input.disabled = !on; } },
    disable(name, off) { const f = fields.get(name); if (f) f.input.disabled = Boolean(off); },
  };
}
