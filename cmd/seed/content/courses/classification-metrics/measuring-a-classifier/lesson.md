---
slug: measuring-a-classifier
title: Measuring a classifier
kind: simulator
simulator: confusion-threshold
minutes: 25
---
::: intro
- Explain how a score and a threshold turn into the four counts of a confusion matrix.
- Spot the accuracy trap by comparing accuracy with the "always say no" baseline.
- Predict how moving the threshold changes recall, precision and the point on the ROC curve.

Before you start: read "Confusion matrix and rates".
:::

## A score and a threshold
*How does a classifier turn a number into a yes or a no?*

Many classifiers do not answer yes or no directly. They give every case a **score**, where a higher score means "more likely to be a yes". To get an answer you pick a **threshold**: a score at or above it becomes yes, a score below it becomes no.

The thing you are hunting for is the **positive** class, such as a disease or a fraudulent payment. Positive does not mean good.

The lab **Scores and a threshold** makes up its scores. Negative cases score around 0, positive cases around the **Separation** value, and both spread out by about 1. The scores are made-up numbers on an arbitrary scale, so a negative score is fine.

The same scores give different answers at different thresholds. So there are two things to judge: how well the scores separate the classes, and how good one chosen cut is. A **cut** is just a chosen threshold.

> Key idea: a classifier's quality has two parts, the scores and the cut. A confusion matrix describes one cut. The ROC curve (receiver operating characteristic) describes all cuts at once.

## One threshold, four counts
*What does the confusion matrix look like for the lab's first screen?*

"Confusion matrix and rates" gave you the four counts and the rates built from them. Here they are for the lab's starting screen: 2,000 cases, 100 of them positive (5 percent), threshold 2.5.

| | Says yes | Says no |
|---|---|---|
| **Actually yes** | TP = 36 | FN = 64 |
| **Actually no** | FP = 5 | TN = 1,895 |

> Worked example: accuracy = (36 + 1,895) / 2,000 = 0.9655. Precision = 36 / (36 + 5) = 0.878. Recall = 36 / (36 + 64) = 0.36. F1 = 2 x 36 / (2 x 36 + 5 + 64) = 72 / 141 = 0.511. False-positive rate = 5 / (5 + 1,895) = 0.003.

The lab shows accuracy as 96.5%, because 96.55 sits right on the rounding boundary. Read the numbers as a set. Precision is high: when it says yes, it is nearly always right. Recall is low: it misses 64 of the 100 positives.

## The accuracy trap
*Can a classifier be 96 percent accurate and still miss most of what you want?*

Compare it with a classifier that never thinks at all and answers "no" to every case. It gets all 1,900 negatives right and all 100 positives wrong.

- Accuracy = 1,900 / 2,000 = 0.95.
- Recall = 0 / 100 = 0. It finds nothing.

So the real classifier, at 0.9655, beats doing nothing by 0.0155, about one and a half points, while it still misses 64 of the 100 positives. The reason is **class imbalance**: when positives are rare, the negatives dominate the count, so accuracy mostly measures how many negatives there are.

> Watch out: on imbalanced data, always compare accuracy with the "always say no" baseline, which is just the share of negatives. Then look at recall and precision.

The lab does this for you. Its status line shows "Accuracy trap" when accuracy is high and recall is low, and a second line says what always answering no would score. The next lesson, "Class imbalance", goes deeper into why this happens and what to do about it.

## Moving the threshold
*What happens to the errors when the cut moves?*

Picture the scores of the two classes as two overlapping hills, negatives mostly low and positives mostly high. The threshold is a vertical line, and everything to its right becomes a yes.

[[figure:measuring-a-classifier/score-regions|Two classes whose scores overlap, each drawn as a share of its own class so both hills have the same height. The threshold splits each hill into a correct part and an error part, giving the four counts.]]

Slide the line left and more cases are flagged: you catch more positives, but you flag more negatives too. These are the lab's numbers for the default cases:

| Threshold | TP | FP | FN | Precision | Recall | Accuracy |
|---|---|---|---|---|---|---|
| 2.5 | 36 | 5 | 64 | 87.8% | 36.0% | 96.5% |
| 2.0 | 54 | 46 | 46 | 54.0% | 54.0% | 95.4% |
| 1.0 | 87 | 300 | 13 | 22.5% | 87.0% | 84.4% |
| 0.5 | 94 | 581 | 6 | 13.9% | 94.0% | 70.7% |

[[figure:measuring-a-classifier/threshold-sweep|The same sample at every threshold. Recall falls as the cut moves right and precision rises. Accuracy never beats the dashed always-say-no line by more than two points, so it hides both trends.]]

Both errors cannot fall together, because the hills overlap. Only better scores can do that.

## Choosing a cut from the costs
*Which threshold is best when the two errors cost different amounts?*

A miss and a false alarm rarely cost the same, so the best cut depends on the costs.

::: deeper Picking the threshold from the costs
Say a miss costs 10 and a false alarm costs 1. Total cost = 10 x FN + FP. At threshold 2.5 it is 10 x 64 + 5 = 645. At 2.0 it is 10 x 46 + 46 = 506, at 1.5 it is 10 x 23 + 129 = 359 and at 1.0 it is 10 x 13 + 300 = 430. The cheapest cut in the lab is 1.6, at 10 x 24 + 108 = 348. Change the costs and the best threshold moves; the scores stay the same.
:::

## The ROC curve and AUC
*How can we judge the scores without choosing a threshold?*

The **ROC curve** shows every threshold at once. The name is historical and only the shape matters. Each threshold is one point: the false-positive rate on the horizontal axis, the true-positive rate (recall) on the vertical axis.

[[figure:measuring-a-classifier/roc-curve|The ROC curve of the lab's default sample, with four thresholds marked. The dashed diagonal is a classifier with no skill.]]

- A threshold above every score flags nothing: the point (0, 0).
- A threshold below every score flags everything: the point (1, 1).
- Scores that carry no information give the **diagonal**. At every threshold, such a classifier flags the same share of positives and negatives.
- Good scores bow toward the top-left corner: high recall at a low false-positive rate.

The rows of the table are four points on this curve: (0.003, 0.360), (0.024, 0.540), (0.158, 0.870) and (0.306, 0.940). The **AUC**, the area under the curve, squeezes the whole curve into one number: 0.5 for chance, 1.0 for perfect. Here it is 0.931.

::: deeper What AUC means, and what it hides
Pick one random positive and one random negative. AUC is the chance that the positive got the higher score, counting an exact tie as half. So 0.5 means the scores rank no better than a coin flip.

AUC does not say how many of your yes answers are right. At threshold 1.0 the AUC is 0.931, yet only 22.5 percent of the yes answers are real positives.
:::

## Scores versus threshold
*Which settings change the scores, and which only move the cut?*

Moving the threshold slides the dot along one fixed ROC curve. It never changes the curve or the AUC. Only changes to the scores themselves, such as more **Separation**, bend the curve.

Keep the threshold at 1.0 and change the separation:

| Separation | False-positive rate | Recall | AUC |
|---|---|---|---|
| 0 | 15.8% | 19.0% | 0.539 |
| 2 | 15.8% | 87.0% | 0.931 |
| 4 | 15.8% | 100% | 0.998 |

The false-positive rate stays at 15.8 percent because it only looks at the negatives, and the negative scores did not move. Recall climbs because the positives move away from them. At separation 0, recall (19.0 percent) is close to the false-positive rate (15.8 percent): the classifier flags both classes at nearly the same rate, which is a coin flip.

Precision also depends on how rare the positives are. At the same cut, 5 percent positives give precision 22.5 percent, and 50 percent positives give 84.2 percent. The scores did not improve; the next lesson shows why.

## Three mistakes to avoid
*What goes wrong when people measure classifiers?*

1. **Picking the metric after seeing the results.** If you try several metrics and announce the one where your model shines, you have fooled yourself. Decide what matters first. The threshold is a setting you tune, so choose it on validation data, as in "Train, validation and test", and report the final number on test data.
2. **Ignoring the costs of the errors.** Accuracy counts every error alike, yet a missed illness and a false alarm are different problems. Write down what each costs, then pick the metric and the threshold to match.
3. **Comparing models at different thresholds.** Two models at two different cuts differ in two ways at once, so you cannot tell whose scores are better. Compare at the same threshold, or compare whole ROC curves.

::: remember
- A classifier gives scores and a threshold turns them into yes and no. The confusion matrix counts TP, FP, TN and FN for one threshold.
- Compare accuracy with the "always say no" baseline. A lower threshold raises recall and false alarms together, and lowers precision.
- The ROC curve shows every threshold. Moving the threshold slides along it, and only better scores bend it. AUC 0.5 is chance and 1.0 is perfect.
:::

@@lab

## Lab: Scores and a threshold
Cases get seeded synthetic scores: negatives center on 0, positives on the **Separation** value, and both spread by 1. Slide the threshold and watch every number respond. The numbers below are for the default start (2,000 cases, 5 percent positive, Separation 2) before any **New sample**; press **Reset** if yours differ.

### Controls
- **Threshold** (-3 to 6, starts at 2.5): scores at or above it are answered yes. The dashed line on the histogram shows it. You can also drag the line, or click the plot, and with the keyboard focus the plot and use the arrow keys (Shift for bigger steps).
- **Share of positive cases** (1 to 50 percent, starts at 5): how rare the positives are.
- **Separation** (0 to 4, starts at 2): how far apart the two class averages are, in units of the spread. At 0 the scores say nothing.
- **Number of cases** (100 to 5,000, starts at 2,000): how many cases are drawn.
- **Show each class as a share of its own cases**: redraws the histogram so rare positives stand as tall as the negatives.
- **New sample** draws fresh cases with the same settings. **Reset** restores everything.

### Reading the screen
- The status sentence under the title, such as "Accuracy trap: 96.5% accurate, but it finds only 36 of the 100 positive cases (recall 36.0%)." Below it: "Always answering no would be 95.0% accurate on these 2,000 cases." At the right, a count such as "2,000 cases, 100 positive".
- The histogram of **Classifier score**: indigo for **Actually no**, pink for **Actually yes**. Above it, the counts of the four outcomes on each side of the line: FN and TN on the **Says no** side, TP and FP on the **Says yes** side. The legend names them: **TP caught**, **FP false alarm**, **TN left alone**, **FN missed**.
- The **Confusion matrix**: rows **Actually yes** and **Actually no**, columns **Says yes** and **Says no**, with the four large counts **True positive (TP)**, **False negative (FN)**, **False positive (FP)** and **True negative (TN)**.
- Six tiles under the matrix: **Accuracy**, **Precision**, **Recall**, **F1**, **False-positive rate** and **AUC**. Precision reads "none yet" when nothing is flagged.
- The **ROC curve** with the **True-positive rate (recall)** on the vertical axis and the **False-positive rate** on the horizontal axis. The dot is the current threshold, and the dashed diagonal is the **coin flip**.

### Experiments
1. **The trap on the first screen.** Predict: is a classifier that is 96.5 percent accurate doing a good job? Read the status sentence and the second line. Accuracy is 96.5%, the always-no baseline is 95.0%, and recall is only 36.0%: 64 of the 100 positives are missed. Now switch on **Show each class as a share of its own cases**. The 100 positives, nearly invisible before, now stand as tall as the 1,900 negatives. Explain why accuracy hid this.
2. **Lower the threshold.** Predict: when **Threshold** goes from 2.5 down to 1.0, what happens to recall, precision, accuracy and the dot on the **ROC curve**? Then slide it. Recall climbs from 36.0% to 87.0%, but FP jumps from 5 to 300, precision falls to 22.5% and accuracy falls to 84.4%, below the 95.0% baseline. The dot slides up and to the right along one curve, and **AUC** stays at 0.931. Then slide the threshold to 6: nothing is flagged, accuracy equals the baseline, and precision reads "none yet".
3. **Hunt for the best cut.** Predict: will the threshold with the best **F1** also have the best **Accuracy**? Try thresholds between 1.5 and 3. F1 peaks at 2.1 (55.2%), where precision is 61.7% and recall 50.0%. Accuracy is highest at 2.4 and 2.5 (about 96.5%), where recall is only 39% and 36%. At 2.0, precision and recall both read 54.0%. Which cut would you choose for a screening test, and why does it differ from the accuracy winner?
4. **Better scores or a different cut?** Predict: if you move **Separation** from 2 to 0 and then to 4, with **Threshold** at 1.0, which numbers change? Look at **False-positive rate**, **Recall** and **AUC**. The false-positive rate stays at 15.8%. Recall goes 19.0%, 87.0%, 100%, and AUC goes 0.539, 0.931, 0.998. At 0 the **ROC curve** hugs the **coin flip** diagonal. Explain why moving the threshold cannot do what more separation does.
5. **Rarer or commoner positives.** Predict: with **Separation** 2 and **Threshold** 1.0, what happens to precision if **Share of positive cases** goes from 5 to 50 percent? Try it. Precision jumps from 22.5% to 84.2% while AUC stays near 0.92. The classifier did not get better; the rarity of the positives changed what a yes answer means.
6. **A fresh sample.** Predict: does the idea from experiment 2, that a lower threshold raises recall and false alarms, hold on every sample? Press **Reset**, which is sample 1, and read **Recall** and FP at thresholds 2.5 and 1.0. Then press **New sample** three times and repeat for samples 2, 3 and 4. Recall goes from 36 to 87, 39 to 90, 34 to 85 and 41 to 83 percent, and FP rises every time. Now press **Reset**, set **Threshold** to 1.5 and **Number of cases** to 100, and press **New sample** four times. With only about 5 positives, precision wanders: 30.8%, 23.1%, 50.0%, 27.3% and 66.7% on samples 1 to 5. Set **Number of cases** to 5,000 and it stays between 34 and 37 percent. What does that say about trusting one small test set?
