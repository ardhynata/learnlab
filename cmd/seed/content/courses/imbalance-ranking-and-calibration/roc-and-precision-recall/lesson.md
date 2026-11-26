---
slug: roc-and-precision-recall
title: ROC and precision-recall
kind: reading
simulator: ""
minutes: 18
---
::: intro
- Build a ROC curve and its AUC by hand from six scored cases, and read AUC as a count of winning pairs.
- Build the precision-recall curve and the average precision of the same six cases.
- Explain why precision-recall is the more honest view when positives are rare, and what class weighting and resampling do to the scores.

Before you start: read "Measuring a classifier" and "Class imbalance" in the Level 1 course "Classification metrics". The first introduced scores, thresholds and the ROC curve. The second showed what rare positives do to accuracy and precision.
:::

## Judging the scores, not one cut
*What does a ranking tell you that one confusion matrix does not?*

"Measuring a classifier" ended on a split: a model gives every case a **score**, and a **threshold** turns scores into yes and no. A confusion matrix describes one threshold. A **curve** describes all of them at once, so it judges the scores before you have picked a cut.

The question a curve answers is about **ranking**: if you sort the cases from the highest score to the lowest, do the real positives come first? A model that ranks well lets you choose the cut later, from the cost of each mistake. That choice is the topic of the next lesson, "Calibration and costs".

This lesson builds both curves by hand on six cases, so that no step is hidden. Then it asks which curve to trust when positives are rare, and what the usual fixes for imbalance do to the scores.

Throughout, a case is called positive when its score is at or above the threshold.

## Six cases and one walk
*How do you draw a ROC curve from a list of scores?*

Six cases, three positive and three negative, each with a score. Sort them from the highest score down. Start at the point (0, 0) and walk down the list, lowering the threshold to just include one more case each time. A real positive moves the point **up** by 1/3, because it is one of 3 positives. A real negative moves it **right** by 1/3, because it is one of 3 negatives.

| Case | Score | Truth | TP | FP | False-positive rate | True-positive rate |
|---|---|---|---|---|---|---|
| A | 0.9 | positive | 1 | 0 | 0 | 1/3 |
| B | 0.8 | negative | 1 | 1 | 1/3 | 1/3 |
| C | 0.7 | positive | 2 | 1 | 1/3 | 2/3 |
| D | 0.6 | positive | 3 | 1 | 1/3 | 1 |
| E | 0.4 | negative | 3 | 2 | 2/3 | 1 |
| F | 0.2 | negative | 3 | 3 | 1 | 1 |

Each row is the threshold set to that case's score. The result is a staircase from (0, 0) to (1, 1).

[[figure:roc-and-precision-recall/roc-by-hand|The ROC curve of the six cases. Filled dots are real positives, rings are real negatives, and the shaded area is the AUC.]]

> Key idea: the ROC curve depends only on the order of the scores, never on their values. Change 0.9 to 0.99 and the staircase does not move.

## AUC is a count of pairs
*Why does the area under the staircase equal a fraction of winning pairs?*

There are 3 x 3 = 9 pairs made of one positive and one negative. A pair is **won** when the positive has the higher score.

> Worked example: A (0.9) beats B, E and F: 3 wins. C (0.7) beats E and F but loses to B (0.8): 2 wins. D (0.6) beats E and F but loses to B: 2 wins. Total 3 + 2 + 2 = 7 wins out of 9, so AUC = 7/9 = 0.78.

Now the area, column by column. Each step right is one negative, and the curve's height there is the share of positives scored above it. B has 1 of 3 positives above it (A): height 1/3. E and F have all 3: height 1. Area = 1/3 x (1/3 + 1 + 1) = 7/9. The same number, because both count the same thing.

So AUC 0.78 reads: pick a random positive and a random negative, and the positive scores higher about 78 times in 100. An exact tie would count as half a win.

> Watch out: AUC says nothing about how many of your yes answers are real. It is blind to the cut, and as the next sections show, also to how rare the positives are.

## The precision-recall curve
*What does the second curve plot, and how do you read it?*

Walk the same sorted list again, but now record **precision** (TP / (TP + FP)) and **recall** (TP / 3, the same number as the true-positive rate).

| After case | TP | FP | Recall | Precision |
|---|---|---|---|---|
| A | 1 | 0 | 1/3 | 1 |
| B | 1 | 1 | 1/3 | 1/2 |
| C | 2 | 1 | 2/3 | 2/3 |
| D | 3 | 1 | 1 | 3/4 |
| E | 3 | 2 | 1 | 3/5 |
| F | 3 | 3 | 1 | 1/2 |

The curve is not a staircase now. Precision falls every time a negative enters (B, E, F) and recovers when a positive does. A good ranker keeps precision high while recall grows.

**Average precision** (AP) summarizes the curve: take the precision at each real positive, the moments when recall rises, and average them. Here (1 + 2/3 + 3/4) / 3 = 0.81. Some tools compute it a little differently, for example by interpolating, so a library may differ from a hand count in the last digits.

[[figure:roc-and-precision-recall/pr-by-hand|The precision-recall points of the six cases. The shaded steps are the area that AP measures, and the dashed line is a classifier with no skill.]]

The line with no skill is flat at the **positive rate**, here 3/6 = 0.5, because flagging cases at random gives a precision equal to the share of positives. It is not the diagonal of the ROC plot.

## Why precision-recall is more honest when positives are rare
*Why can one ranker look excellent on ROC and poor on precision-recall?*

Take the payments from "Class imbalance": 10,000 payments, 100 of them fraud. A scoring system has a cut that flags 80 of the 100 frauds and 495 of the 9,900 honest payments. Its ROC point is (495 / 9,900, 80 / 100) = (0.05, 0.80), which looks strong. Its precision is 80 / (80 + 495) = 0.14: about 6 flagged payments in 7 are honest.

Keep the same ranker and cut, but suppose the 10,000 payments were 5,000 fraud and 5,000 honest. Now 4,000 frauds and 250 honest payments are flagged. The ROC point is still (0.05, 0.80), and the precision is 4,000 / 4,250 = 0.94.

The ROC axes divide by the size of each class, so the positive rate cancels out. Precision divides by the number of flagged cases, which mixes both classes, so it moves with the positive rate.

[[figure:roc-and-precision-recall/rare-positives|One ranker at two positive rates. The ROC curve is the same, while the precision-recall curve falls far lower at 1 percent positives.]]

In the figure's idealized model (scores from two bell curves with the same spread), AUC is about 0.96 at both rates, but AP is about 0.96 at 50 percent positives and about 0.47 at 1 percent. ROC is not wrong. It answers whether positives outrank negatives, and that does not depend on the rate. Precision-recall answers what you act on: how many of the flagged cases are real, at the rate you will meet.

## Class weighting and resampling
*What do the fixes for imbalance do to the scores?*

"Class imbalance" named two fixes: **class weights**, which make each rare case count more in the loss, and **resampling**, which repeats rare cases or drops common ones. Both change training, so both change the scores the curves are drawn from.

The clearest effect is a shift. For a model whose scores are log-odds, giving each positive a weight of w roughly multiplies the odds the model predicts by w. The order of the cases can also change a little, because the model is fitted differently, but the shift is the main change.

> Worked example: a kind of payment really has a 1 percent chance of fraud, which is odds of 1 to 99. Weight each fraud by 99 and the model predicts odds of about 99 to 99, which is 0.50. The case is ranked the same, but its score no longer matches how often fraud happens.

So after weighting, a threshold of 0.5 flags far more payments, and the scores are not probabilities of fraud any more. The next lesson, "Calibration and costs", is about exactly that gap.

> Watch out: resample after the split, and only the training part. Copies of one fraud case in both training and validation make the model look better than it is, the leakage from "Pipelines and leakage". Evaluate on untouched data with the real positive rate.

## Which curve to report
*What do you write down, and where do you try it?*

Use both curves for what each does well.

- **ROC and AUC** compare how well two models rank, and they hold up when the positive rate differs between datasets.
- **Precision-recall and AP** describe the cases you act on. When positives are rare, report AP, the precision at the recall you need, and the positive rate of the test data.

Count your positives, too. With 3 positives, one case moves AP by several points. "Sampling variability and the bootstrap" shows how to put an interval around any metric, AUC and AP included.

A curve still does not choose a cut, and it does not say what a score of 0.8 means. The next lesson, "Calibration and costs", takes up both. The course ends with the calibration lab, where you compare predictions that rank about equally well and see how calibration changes the decisions you make from their probabilities.

::: remember
- A ROC curve is a walk down the sorted cases: up for a positive, right for a negative. AUC is the share of positive and negative pairs ranked correctly, 7/9 for the six cases.
- A precision-recall curve plots precision against recall, and AP averages the precision at each real positive. Its no-skill line sits at the positive rate.
- ROC ignores how rare positives are, and precision does not. Weights and resampling shift scores, so check them on untouched data with the real rate.
:::
