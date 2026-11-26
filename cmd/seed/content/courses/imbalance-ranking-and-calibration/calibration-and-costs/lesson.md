---
slug: calibration-and-costs
title: Calibration and costs
kind: reading
simulator: ""
minutes: 18
---
::: intro
- Check whether a predicted probability comes true as often as it says, with a reliability diagram and the Brier score.
- Show that two models can rank cases in the same order, with the same AUC, and still differ in calibration.
- Choose a threshold from the cost of a false positive and the cost of a false negative, and compute one by hand.

Before you start: read "ROC and precision-recall" and "Confusion matrix and rates".
:::

## A probability is a claim about frequency
*What does it mean for a predicted 0.8 to be right?*

The last lesson was about ranking: does the model put positive cases above negative ones? A ranking says which case looks more likely than another. It does not say how likely.

Many models also print a number between 0 and 1 for each case, and people read it as a probability. A model is **calibrated** when those numbers mean what they say. Collect every case where it predicted about 0.8. If it is calibrated, about 80 percent of them are positive. Among the cases at 0.3, about 30 percent are.

Calibration belongs to a group of cases, never to one case. A single payment is fraud or it is not, so one outcome cannot show that 0.8 was right or wrong. You need many cases with the same prediction.

Ranking and calibration are separate questions. AUC only asks whether positives tend to sit above negatives. It would not change if every number were squeezed or stretched, as long as the order stayed. Yet the numbers matter the moment a decision uses them, for example when you multiply a probability by a cost.

> Key idea: ranking asks "which case first?". Calibration asks "how likely is it, really?". A model can be good at one and poor at the other.

## Reliability diagrams
*How do you check calibration on a test set?*

Put the test cases into groups by predicted probability. For each group, compare two numbers: the probability the model predicted and the share of cases that really were positive. A **reliability diagram** plots them, with the prediction across and the observed share up. A perfectly calibrated model lies on the diagonal.

This lesson uses a made-up test set of 1000 payments with 254 frauds. To keep the arithmetic short, every payment in a row got the same prediction. In a real test the predictions differ inside a bin, and you use the bin's average prediction.

| Predicted | Cases | Positives | Share positive |
| --- | --- | --- | --- |
| 0.05 | 400 | 20 | 0.05 |
| 0.15 | 250 | 40 | 0.16 |
| 0.35 | 150 | 51 | 0.34 |
| 0.60 | 120 | 75 | 0.625 |
| 0.85 | 80 | 68 | 0.85 |

[[figure:calibration-and-costs/reliability|The reliability diagram of Model A. The dots sit close to the diagonal, so its numbers mean about what they say.]]

Read the diagram by position. A dot above the diagonal means more positives than the model predicted. A dot below means fewer. Model A stays near the line everywhere: its predicted 0.35 came true 34 percent of the time.

## The Brier score
*How do you turn calibration into one number?*

The **Brier score** is the mean squared gap between the predicted probability and what happened, where a positive counts as 1 and a negative as 0. Lower is better, and 0 is perfect. It is a cousin of the log loss from "Log loss and fitting": both reward honest probabilities, but the Brier score is gentler on confident mistakes. For example, a predicted 0.99 for a case that turns out negative costs 0.98 in the Brier score but about 4.6 in log loss (natural log).

> Worked example: four cases. A predicted 0.9 for a positive gives (1 − 0.9)² = 0.01. A predicted 0.8 for a negative gives (0 − 0.8)² = 0.64. A predicted 0.3 for a negative gives 0.09, and a predicted 0.6 for a positive gives 0.16. The sum is 0.90 and the mean is 0.90 / 4 = 0.225.

Two reference points help. A model that always says 0.5 scores 0.25. A model that always says the base rate, here 254 / 1000 = 0.254, scores 0.254 × 0.746 = 0.1895.

On the test set, take the row at 0.35. Its 51 positives each add (1 − 0.35)² = 0.4225, giving 21.5475. Its 99 negatives each add 0.35² = 0.1225, giving 12.1275. The row adds 33.675. Summing the five rows gives 124.7, and 124.7 / 1000 = 0.1247 for Model A.

> Watch out: the Brier score mixes calibration with ranking quality. A lower score can mean better numbers, better ordering, or both. The reliability diagram shows the calibration part by itself.

## Same ranking, different calibration
*Can two models with the same AUC give different probabilities?*

Build Model B from Model A by pushing every number away from 0.5: 0.05 becomes 0.01, 0.15 becomes 0.05, 0.35 becomes 0.20, 0.60 becomes 0.80 and 0.85 becomes 0.97. The five rows keep their order, so every positive-and-negative pair is ranked exactly as before. The AUC is 0.84 for both models.

Now look at the reliability diagram. Model B says 0.97 for a row where only 85 percent are positive, and 0.01 for a row where 5 percent are. Its dots lie above the diagonal at the left and below it at the right. That shape is the signature of an **overconfident** model.

| Model | AUC | Brier score |
| --- | --- | --- |
| A | 0.84 | 0.1247 |
| B | 0.84 | 0.1360 |

[[figure:calibration-and-costs/same-ranking|Two models, one order. The lines join each group's number under A to its number under B and never cross, so the AUC is the same, but only A's numbers are honest.]]

> Key idea: AUC is blind to calibration. Any change that keeps the order of the scores leaves it untouched, however wrong the numbers become.

## Recalibration
*How do you fix numbers that rank well but read wrong?*

If the order is good and only the numbers are off, you do not need a new model. You learn a small map from the model's score to the observed frequency. This is **recalibration**. Two methods are the standard names.

**Platt scaling** fits a one-input logistic regression to the score: the calibrated probability is a sigmoid of a·score + b, with two numbers a and b learned from data. It has few parameters, so it suits small samples and smooth, S-shaped distortions. With a above 0 it keeps the order exactly.

**Isotonic regression** fits a staircase that never goes down. It is more flexible and needs more data. It can merge neighbouring scores into one step, which creates ties.

For Model B the observed shares already rise with the score, so an isotonic fit simply maps 0.01, 0.05, 0.20, 0.80 and 0.97 to 0.05, 0.16, 0.34, 0.625 and 0.85. The Brier score falls from 0.1360 to 0.1246. The AUC stays at 0.84.

> Watch out: that 0.1246 is measured on the same set that fit the map, which flatters it. Fit the recalibration on data the model did not train on, and report it on a fresh test set.

## A threshold from costs
*How do costs decide where to cut?*

The usual 0.5 is a habit, not a law. The right threshold depends on what the two mistakes cost. Say a **false positive** (a good payment sent to manual review) costs 10 units of money and effort, and a **false negative** (a fraud that goes through) costs 30. Correct decisions cost nothing here.

For one case with predicted probability p, compare the expected cost of each choice. Flagging costs (1 − p) × 10, because the case is fine with probability 1 − p. Not flagging costs p × 30. Flag when the first is smaller:

(1 − p) × 10 < p × 30, which gives p > 10 / (10 + 30) = 0.25.

> Worked example: p = 0.35. Flagging costs 0.65 × 10 = 6.5 and not flagging costs 0.35 × 30 = 10.5, so flag. p = 0.15: flagging costs 0.85 × 10 = 8.5 and not flagging costs 0.15 × 30 = 4.5, so leave it.

## The general rule
*How does the threshold move when the costs change?*

In general the threshold is the cost of a false positive divided by the sum of both costs. A cost ratio of 1 to 1 gives 0.5, a false negative costing 3 times a false positive gives 0.25, 9 times gives 0.1, and 19 times gives 0.05. The costlier a false negative, the lower the threshold.

::: deeper When correct decisions cost something too
If a true positive costs C_TP and a true negative costs C_TN, the same steps give the threshold (C_FP − C_TN) / ((C_FP − C_TN) + (C_FN − C_TP)). With C_TP = 2, the threshold becomes 10 / (10 + 28) = 0.263.
:::

## The threshold on the whole test set
*Does the cost rule beat 0.5, and when does it fail?*

Count the real mistakes of Model A at three thresholds, with a cost of 10 per false positive and 30 per false negative.

| Threshold | Rows flagged | False positives | False negatives | Total cost |
| --- | --- | --- | --- | --- |
| 0.50 | 0.60 and 0.85 | 57 | 111 | 570 + 3330 = 3900 |
| 0.25 | 0.35, 0.60, 0.85 | 156 | 60 | 1560 + 1800 = 3360 |
| 0.10 | 0.15 and above | 366 | 20 | 3660 + 600 = 4260 |

Flagging nothing costs 254 × 30 = 7620, and flagging everything costs 746 × 10 = 7460. The cost-based 0.25 gives the lowest total, 3360, about 14 percent below the habit of 0.5.

> Watch out: choose a threshold on validation data, never on the test set you report.

## When the numbers are not probabilities
*Why does the same threshold fail for Model B?*

[[figure:calibration-and-costs/cost-curve|Total cost against the threshold. Model A has its lowest cost at 0.25. Model B, with the same ranking, pays 3900 there, because its numbers are not probabilities.]]

Model B at 0.25 flags only its top two rows, because its 0.20 row falls below the line, although 34 percent of that row is positive. Cost: 3900. The formula assumes calibrated probabilities. For B you would have to search for a better threshold: 0.10 happens to reach 3360, because it flags the same rows as A's 0.25, but only a search finds it. Or recalibrate first: then B's numbers equal A's shares, and 0.25 gives 3360 again.

::: deeper Why bins are noisy
A bin with 20 cases and a true positive share of 0.5 gives an observed share that varies by about 0.11 from sample to sample, which is the square root of 0.5 × 0.5 / 20. A few cases per bin can make a calibrated model look crooked, so check that bins hold enough cases.
:::

## Carrying this into the lab
*What will you check in the calibration lab?*

The next lesson, the calibration lab, lets you run this whole chain on data you can change: rank the cases, check the calibration, and decide with costs. You only need three habits.

First, look at ranking and calibration separately. AUC tells you about the order, and the reliability diagram and Brier score tell you about the numbers. Second, before you trust a probability in a cost calculation, ask whether the dots sit near the diagonal. Third, state the costs of both mistakes, compute the threshold from them, and compare its total cost with 0.5 on held-out data.

Predict before you move any setting: if two models share an AUC, will they share a reliability diagram? You already know the answer from Model A and Model B.

::: remember
- A calibrated probability comes true about as often as it says. A reliability diagram and the Brier score check it, and AUC cannot.
- Two models can share a ranking and an AUC and still differ in calibration. Recalibration (Platt scaling, isotonic regression) fixes the numbers without changing the order.
- With calibrated probabilities, flag a case when p exceeds the cost of a false positive divided by the sum of both costs.
:::
