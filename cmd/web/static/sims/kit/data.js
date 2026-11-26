// Generated data / Real data switch for labs that pair a simulation with a bundled dataset.
//
//   const controls = lab.panel([dataModeSpec({ real: [['penguins', tr('Penguins (real)', 'Penguin (data nyata)')]] }), ...], onChange);
//   if (controls.values().data !== 'generated') table = await loadDataset(controls.values().data);
//
// Bundled files live in cmd/web/static/data/<name>.csv with a <name>.md note beside each one
// (source, licence, what each column is). loadDataset parses with sims/ml/tabular.js and caches.
import { parseCsv } from '../ml/tabular.js';
import { tr } from '../../i18n.js';

export function dataModeSpec({ real = [], value = 'generated', label } = {}) {
  return {
    name: 'data', type: 'select', value,
    label: label ?? tr('Data', 'Data'),
    options: [['generated', tr('Generated data', 'Data buatan')], ...real],
  };
}

const cache = new Map();
// A failed fetch is not remembered: the entry is evicted when the promise rejects, so the next call
// (the learner picking the real data again once the file is reachable) fetches it afresh. The
// identity check keeps a late failure from evicting a newer request for the same file.
export function loadDataset(name) {
  if (!cache.has(name)) {
    const p = fetch(new URL(`../../data/${name}.csv`, import.meta.url)).then(r => {
      if (!r.ok) throw new Error(`dataset ${name}: HTTP ${r.status}`);
      return r.text();
    }).then(parseCsv);
    p.catch(() => { if (cache.get(name) === p) cache.delete(name); });
    cache.set(name, p);
  }
  return cache.get(name);
}
