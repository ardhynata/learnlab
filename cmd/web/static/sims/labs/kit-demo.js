// Preview lab for the kit's data-mode switch and "predict first" box. Not linked from any lesson.
import { createLab, createPlot, dataModeSpec, predictBox, tr, fmt } from '../kit/index.js';
import { makeDataset, SHARED_SEED } from '../datasets.js';

export function mount(root) {
  const lab = createLab(root, {
    title: tr('Kit demo', 'Demo kit'), hint: tr('The course dataset, a data switch and a Quick Quiz.', 'Dataset kursus, pengalih data, dan Kuis Cepat.'),
    canvasLabel: tr('Demo plot', 'Plot demo'),
  });
  const plot = createPlot(lab.canvas);
  let points = makeDataset('clusters', SHARED_SEED, 48);
  const controls = lab.panel([
    dataModeSpec({ real: [] }),
    { name: 'n', type: 'range', label: tr('Points', 'Jumlah titik'), min: 8, max: 120, step: 1, value: 48 },
  ], (name, v) => { points = makeDataset('clusters', SHARED_SEED, v.n); draw(); box.reset(); });
  const box = predictBox(lab.ref('below'), {
    question: tr('If you add more points, will the share of class A change a lot?', 'Jika titik ditambah, apakah porsi kelas A banyak berubah?'),
    choices: [['no', tr('No, about the same', 'Tidak, kurang lebih sama')], ['yes', tr('Yes, a lot', 'Ya, banyak')]],
  });
  lab.onReset(() => { points = makeDataset('clusters', SHARED_SEED, 48); controls.set('n', 48); draw(); box.reset(); });
  lab.on(lab.canvas, 'click', () => box.reveal('no', tr(`Share of A: ${fmt(points.filter(p => p.label === 'A').length / points.length * 100, { digits: 0 })}%.`, `Porsi A: ${fmt(points.filter(p => p.label === 'A').length / points.length * 100, { digits: 0 })}%.`)));
  function draw() {
    const g = plot.begin();
    for (const p of points) plot.dot(p.x, p.y, p.label === 'A' ? g.t.accent : g.t.muted);
  }
  lab.onTheme(draw); lab.onResize(draw);
  draw();
  return lab.destroy;
}
