---
slug: calibration-lab
title: Calibration lab
kind: simulator
simulator: calibration-lab
minutes: 25
---
::: intro
- Compare three predictors that rank the same cases in the same order and see where their probabilities part ways.
- Predict how a threshold, a cost and a recalibration change the number of cases flagged and the cost per case.
- Check on fresh samples which results hold and which depend on the sample.

Before you start: read "ROC and precision-recall" and "Calibration and costs".
:::

## What the lab asks
*Do two predictors with the same ranking make the same decisions?*

The last two lessons gave you a pair of separate questions. Ranking asks whether positives sit above negatives, and AUC measures it. Calibration asks whether a predicted 0.8 comes true about 80 percent of the time. In the calibration lab you hold the first fixed and vary the second.

The lab scores 1,000 generated cases with three predictors: **Well calibrated**, **Overconfident** and **Underconfident**. All three give the cases the same order, so their ROC curves lie on top of each other. Only the numbers differ: the overconfident one pushes them toward 0 and 1, the underconfident one squeezes them toward the middle. With the defaults, 198 of the 1,000 cases are positive.

| Default sample | Well calibrated | Overconfident | Underconfident |
|---|---|---|---|
| AUC | 0.892 | 0.892 | 0.892 |
| Brier score | 0.098 | 0.106 | 0.122 |

The data is always generated, because the penguins data has no model probabilities to calibrate. Every experiment below starts from **Reset**, so your numbers match the ones in this lesson.

## The same cut, the same cases
*Why do three different predictors flag the same cases at 0.5?*

Take the threshold at 0.5: a case is flagged positive when its score is at or above it. Squeezing or stretching the scores around 0.5 moves every score, but a score above 0.5 stays above it and a score below stays below. So the three predictors flag the same 138 cases out of 1,000.

[[figure:calibration-lab/score-maps|How the three predictors turn the same case into three different numbers. All three curves cross 0.5 at the same case, so a 0.5 cut agrees. At 0.17 the cut falls at three different cases.]]

> Worked example: at 0.5 each predictor has 38 false positives and 98 false negatives. With a false positive costing 1 and a false negative costing 5, the cost per case is (38 × 1 + 98 × 5) / 1,000 = 528 / 1,000 = 0.528, the same for all three.

The ranking is the same, so the same cases lead the list. The 0.5 cut only looks equal because it is the one threshold the stretch cannot move. Any other threshold picks a different number of cases from each of these three predictors.

## Reading the reliability diagram
*Where do the three predictors say more than they know?*

The **Reliability diagram of each predictor** puts cases into 10 bins by predicted probability and compares the average prediction with the share that really was positive. The well calibrated predictor stays near the diagonal. The other two do not, and the numbers under each panel show where their cases pile up.

The overconfident predictor puts 741 of 1,000 cases in the lowest bin, with an average prediction of 0.008. In that bin about 7 percent are positive, so a "near zero" was far from zero. Its high bins say the opposite: its 0.97 comes true for about 83 percent. The underconfident predictor never goes above 0.8, and in the bin around 0.15 only 2 of 223 cases are positive (about 1 percent).

The **Brier score** collects this. Lower is better, and it is lower the more honest the numbers are: 0.098 for the well calibrated predictor, then 0.106 and 0.122, with the same ranking. So the Brier score separates what AUC cannot.

> Key idea: the ROC curve and the AUC look at the order. The reliability diagram and the Brier score look at the numbers. Same AUC does not mean same probabilities.

## A threshold from costs
*Which predictor does the cost-based threshold favor?*

The lesson "Calibration and costs" showed that, with honest probabilities, you flag a case when p exceeds the cost of a false positive divided by the sum of both costs. With a false positive costing 1 and a false negative costing 5, that is 1 / (1 + 5) = 0.17. Switch on **Use the cost-based threshold** and the lab applies it to all three predictors.

The three now disagree sharply, because 0.17 means something different to each of them.

| At 0.17 | Cases flagged | False positives | False negatives | Cost per case |
|---|---|---|---|---|
| Well calibrated | 367 | 197 | 28 | 0.337 |
| Overconfident | 229 | 87 | 56 | 0.367 |
| Underconfident | 786 | 588 | 0 | 0.588 |

> Worked example: for the well calibrated predictor, 197 × 1 + 28 × 5 = 337, and 337 / 1,000 = 0.337.

The overconfident predictor pushed many risky cases below 0.17 and misses 56 positives. The underconfident one squeezed so many cases above 0.17 that it flags 786 and misses none. The cost rule assumed honest probabilities, and only one predictor has them.

## Each predictor's own best threshold
*Is any predictor worse, or does it just need a different cut?*

The ring on the ROC plot and the curves in **Expected cost per case against threshold** show each predictor's own best threshold. The **Decision panel: what each predictor costs** lists them: 0.19 for the well calibrated predictor, 0.03 for the overconfident one and 0.36 for the underconfident one.

[[figure:calibration-lab/cost-curves|Cost per case against the threshold for the three predictors, with the cost-based threshold 0.17. The three curves have the same lowest point, 0.333, at different thresholds.]]

The lowest cost per case is 0.333 for all three. A threshold picks a top slice of the ranking, and the three predictors share one ranking, so they can reach exactly the same slices. Calibration does not change what you can achieve. It decides which threshold gets you there.

If you do not know where that threshold is, the cost rule helps only for the well calibrated predictor, whose best threshold (0.19) lies close to 0.17.

> Watch out: the best threshold is measured on this one sample. It is a guide to where the valley lies, not a number to carry to new data.

## Recalibrating with Platt scaling
*Can the numbers be fixed without touching the order?*

Switch on **Recalibrate (Platt scaling)**. The lab fits a small logistic regression that maps each predictor's score to a probability, using a separate sample of 3,000 cases, and applies it to the 1,000 cases you see. A map that always goes up keeps the order, so the AUC stays at 0.892.

The three Brier scores all become 0.098, and the three best thresholds become 0.20. The maps nearly coincide, so at the cost-based threshold 0.17 the decisions do too.

[[figure:calibration-lab/platt-effect|Cases flagged at the cost-based threshold 0.17 before and after Platt scaling. The three bars of 367, 229 and 786 become 375, 373 and 375.]]

::: deeper Why Platt scaling works so well here
The lab makes the three predictors by multiplying the same log-odds (the score before the sigmoid squeezes it into 0 to 1) by 1, 2.5 and 0.4. Platt scaling learns a multiplier and an offset on the log-odds of the score. For the overconfident predictor it finds a multiplier of about 0.4, which undoes the 2.5, and for the underconfident one about 2.5, which undoes the 0.4. A real model is rarely distorted so neatly, so the fit is rarely this clean.
:::

> Watch out: Platt scaling is fitted on a separate sample. Fitting it on the cases you then score would flatter the result.

## Rare positives and fresh samples
*Which results survive a different sample?*

Lower **Share of positive cases (prevalence)** to 5. There are now only 52 positive cases. At 0.5 the three predictors flag the same 8 cases and miss 49 positives: the cost per case is (5 × 1 + 49 × 5) / 1,000 = 0.250. Flagging nothing would cost 52 × 5 / 1,000 = 0.260, so the habit of 0.5 barely beats doing nothing. The best cut reaches 0.151.

A **New sample** draws different cases. On the second sample the best thresholds are 0.16, 0.02 and 0.34, and on the third 0.30, 0.10 and 0.41. The overconfident predictor's ring always lies furthest left and the underconfident one's furthest right. What moves is the well calibrated predictor's own best threshold: 0.19, 0.16 and 0.30 on three samples, while the cost rule says 0.17. Pick thresholds on validation data, and expect them to wobble.

## Where real data comes in
*How would you run this on a real dataset?*

This lab cannot use the penguins. The penguins table holds measurements, not model probabilities, so there is nothing to calibrate. On real data you would first train a classifier, such as the logistic regression from Level 1, and then score cases it did not train on.

Then you would repeat what you did here, in the same order. Look at the ranking with the ROC curve and the AUC. Look at the numbers with a reliability diagram and the Brier score. State the cost of each mistake, compute the cost-based threshold, and compare its cost per case with 0.5 on held-out data. If the probabilities are off, recalibrate on a separate sample and check again.

::: remember
- A ranking and an AUC say nothing about whether the probabilities are honest. Check the reliability diagram and the Brier score too.
- These three predictors flag the same cases at 0.5 only because their stretch leaves 0.5 where it is. At other thresholds they flag different cases, yet each reaches the same lowest cost at its own best threshold.
- Platt scaling fits a map on a separate sample, fixes the numbers and keeps the order, so the AUC stays and the decisions line up. Best thresholds still wobble from sample to sample.
:::

@@lab

## Lab: calibration
Three generated predictors score the same 1,000 cases in the same order. You choose the costs, the threshold and whether to recalibrate, and the lab shows the reliability, the decisions and the cost per case of each predictor. The ROC curves overlap by design, so everything that differs is about the probabilities.

### Controls
- **Share of positive cases (prevalence)** (1 to 50 percent; starts at 20) sets how many of the cases are positive. It redraws the sample.
- **Cost of a false positive** (0 to 100; starts at 1) and **Cost of a false negative** (0 to 100; starts at 5) set what each mistake costs. Correct decisions cost nothing.
- **Use the cost-based threshold** switches the threshold to the cost of a false positive divided by the sum of both costs, here 0.17. Its label shows that number. It is disabled when both costs are 0, and it disables the slider while it is on.
- **Decision threshold** (0.01 to 0.99; starts at 0.5) is the cut. A case is flagged positive when its score is at or above it.
- **Recalibrate (Platt scaling)** (off at start) fits a map on a separate sample of 3,000 cases and applies it to all three predictors.
- **New sample** draws a different sample of cases. **Reset** returns every control to its starting value, the first sample and an unanswered **Quick Quiz**.
- **Quick Quiz** is the button under the Controls card (a round button at the bottom right on a phone). It asks "Two models have exactly the same AUC. Will they make the same decisions at a 0.5 threshold?" with the options **Yes, the same decisions** and **No, they will flag different cases**. Pick one, then press **Check answer**.

### Reading the screen
- The ROC chart (axes **False positive rate** and **True positive rate**) shows one curve for each predictor, drawn on top of each other. The legend lists **Well calibrated**, **Overconfident** and **Underconfident**, **Filled marker: your threshold** and **Ring: its own best threshold**. The status box reads, for example, "AUC 0.892 for all three".
- **Reliability diagram of each predictor** has one panel per predictor: **Predicted probability** across, **Share positive** up, the dashed diagonal for perfect calibration, and the number of cases in each bin under the axis, titled **cases in each bin**. A hollow dot is a bin with fewer than 10 cases.
- **Expected cost per case against threshold** has one curve for each predictor, a solid line at your threshold and a dotted line at the cost-based threshold. The marker on each curve is that predictor's own best threshold.
- **Decision panel: what each predictor costs** has the rows **AUC**, **Brier score**, **Cases flagged positive at the threshold**, **False positives at the threshold**, **False negatives at the threshold**, **Cost per case at the threshold**, **Its own best threshold** and **Cost per case at its own best threshold**, under the header **At threshold** followed by your threshold. The cheapest cost per case is shaded when the three differ. When a best threshold lies outside 0.01 to 0.99, or means flagging nothing, a note says that the slider cannot reach it.
- The status line gives the threshold and the cost per case of each predictor. The detail line gives the counts of positive and negative cases, the Brier scores and the best thresholds.

### Experiments
Press **Reset** before experiments 1 to 4 and 6, so that your numbers match.

1. **Same AUC, same decisions?** Predict: pick an answer in the **Quick Quiz** box, then press **Check answer**. It says all three flag the same 138 of 1,000 cases. In **Decision panel: what each predictor costs** read **False positives at the threshold** (38) and **False negatives at the threshold** (98) and check that the cost per case is 0.528. Then move **Decision threshold** to 0.20: they now flag 324, 213 and 703 cases, at costs 0.342, 0.381 and 0.517. Why did 0.5 hide the difference?
2. **The cost-based threshold.** Predict: which predictor will flag the most cases at 0.17, and which will be cheapest? Switch on **Use the cost-based threshold**. Read the table: 367, 229 and 786 cases flagged, at 0.337, 0.367 and 0.588 per case. Look at the markers on the ROC chart: where did the three filled markers go? Then set **Cost of a false negative** to 19: the threshold becomes 0.05, and the costs are 0.524, 0.957 and 0.797. A note appears under the table. Why? (The overconfident predictor's own best threshold is below 0.01.)
3. **Each predictor's own best threshold.** Press **Reset**. Predict: will the three cost curves have the same lowest point? Look at **Its own best threshold** (0.19, 0.03 and 0.36) and **Cost per case at its own best threshold** (0.333 for all three). On the ROC chart, find the rings. Where would you set the threshold if you could not look at the curves? Why can an overconfident predictor match the others at 0.03?
4. **Recalibrate.** Predict: if you switch on **Recalibrate (Platt scaling)**, will the AUC move? Switch it on and then on **Use the cost-based threshold**. The AUC stays 0.892 and the Brier scores all become 0.098. The cases flagged at 0.17 are now 375, 373 and 375, and the costs 0.339, 0.337 and 0.339. The reliability dots move close to the diagonal. Switch it off again and compare.
5. **Rare positives.** Predict: will 0.5 get better or worse when positives become rare? Then press **Reset** and set **Share of positive cases (prevalence)** to 5. Read the table: all three flag 8 cases and cost 0.250 per case, while flagging nothing would cost 0.260. The best cost is 0.151 at thresholds of 0.18, 0.02 and 0.35. Switch on **Use the cost-based threshold**: the costs are 0.155, 0.197 and 0.373. Why does a rare positive class hurt the 0.5 habit?
6. **A new sample.** Predict: will the same pattern hold on a different sample? The lab has no switch to real data, because the penguins data has no model probabilities, so check the idea on fresh generated samples instead. Press **Reset**, then press **New sample**. On the second sample the AUC is 0.878, all three flag 131 cases at 0.5, and the best thresholds are 0.16, 0.02 and 0.34, all with the lowest cost 0.367. Press **New sample** again: AUC 0.856, best thresholds 0.30, 0.10 and 0.41, lowest cost 0.367. What stays the same on every sample, and what moves? Now switch on **Use the cost-based threshold** and **Recalibrate (Platt scaling)**: on this third sample the three costs at 0.17 become 0.405, 0.403 and 0.405, within 0.002 of each other, where without recalibrating they were 0.403, 0.425 and 0.647.
