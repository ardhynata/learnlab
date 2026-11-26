// The lab kit: everything a new lab needs.
//   import { createLab, createPlot, drawLineChart, panel } from '../kit/index.js';
export { createLab } from './shell.js';
export { createStepper } from './stepper.js';
export { panel } from './panel.js';
export { createPlot, drawLineChart } from './plot2d.js';
export * from './datasets.js';
export { clusterColor, theme, DEFAULT_RANGE, formatTick, icons } from '../common.js';
export * as distance from '../ml/distance.js';
export { tr, fmt, pct, count, locale } from '../../i18n.js';
export { predictBox, judge } from './predict.js';
export { dataModeSpec, loadDataset } from './data.js';
