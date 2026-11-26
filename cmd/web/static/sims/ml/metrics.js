// Classification metrics for binary labels (true = positive class).

export function confusion(actual, predicted) {
  const c = { tp: 0, fp: 0, tn: 0, fn: 0 };
  actual.forEach((a, i) => {
    const p = predicted[i];
    if (a && p) c.tp++; else if (!a && p) c.fp++; else if (!a && !p) c.tn++; else c.fn++;
  });
  return c;
}

const safe = (a, b) => (b ? a / b : 0);

export function scores({ tp, fp, tn, fn }) {
  const precision = safe(tp, tp + fp), recall = safe(tp, tp + fn);
  return {
    accuracy: safe(tp + tn, tp + fp + tn + fn), precision, recall,
    f1: safe(2 * precision * recall, precision + recall),
    fpr: safe(fp, fp + tn),
  };
}

// Predict positive when score >= threshold.
export function atThreshold(scoresList, actual, threshold) {
  const c = confusion(actual, scoresList.map(s => s >= threshold));
  return { ...c, ...scores(c) };
}

// ROC points (false-positive rate, true-positive rate) sweeping the threshold from high to low.
export function rocCurve(scoresList, actual) {
  const thresholds = [Infinity, ...[...new Set(scoresList)].sort((a, b) => b - a), -Infinity];
  return thresholds.map(t => { const r = atThreshold(scoresList, actual, t); return { threshold: t, fpr: r.fpr, tpr: r.recall }; });
}

// Area under the ROC curve by the trapezoid rule.
export function auc(curve) {
  let area = 0;
  for (let i = 1; i < curve.length; i++) area += (curve[i].fpr - curve[i - 1].fpr) * (curve[i].tpr + curve[i - 1].tpr) / 2;
  return area;
}
