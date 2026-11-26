---
slug: confusion-matrix-and-rates
title: Confusion matrix and rates
kind: reading
simulator: ""
minutes: 15
---
::: intro
- Name the four outcomes of a yes-or-no answer and fill in a confusion matrix.
- Compute accuracy, precision, recall and F1 by hand from four counts.
- Choose the metric that matches the cost of each kind of mistake.

Before you start: read "Baselines and splits" and "Train, validation and test".
:::

## One number is not enough
*Why is "how often was it right?" not the whole story?*

Many classifiers (models that sort each case into a class) answer yes or no: does this patient have the condition, is this message spam, is this payment fraud? To judge one, the first idea is to count how often it is right. That single number hides something important: a yes-or-no answer can be wrong in two different ways.

In this module the case you are hunting for is the **positive** class: the illness, the spam, the fraud. Everything else is the **negative** class. Positive does not mean good, only "the one we want to find".

- The classifier says no to a real positive: a **missed case**.
- The classifier says yes to a real negative: a **false alarm**.

These mistakes rarely cost the same. A missed illness can be serious; a false alarm may cost one more test. A percent-correct score adds both mistakes into one count and cannot tell them apart. So we count each kind separately.

> Key idea: to judge a classifier, first count its right answers and its two kinds of wrong answers separately. Every metric in this lesson is a ratio of those counts.

## The confusion matrix
*How do we count the four ways a yes-or-no answer can turn out?*

Put every case in one of four cells, depending on the truth and on the classifier's answer. The table of the four counts is the **confusion matrix**.

[[figure:confusion-matrix-and-rates/cell-names|The four cells. Rows are the truth, columns are the answer. The name of each cell is read in two steps.]]

Read a cell name from its last word:

- The last word is what the classifier **said**: positive means yes, negative means no.
- The first word says whether that answer was **true** (right) or **false** (wrong).

That gives four cells. A **true positive (TP)** is a real positive that was caught. A **false negative (FN)** is a real positive that was missed. A **false positive (FP)** is a real negative that was flagged, a false alarm. A **true negative (TN)** is a real negative that was left alone.

The two correct cells (TP and TN) sit on one diagonal. The two error cells, FN and FP, sit on the other. Every case lands in exactly one cell, so the four counts add up to the number of cases.

## A worked example by hand
*What does a confusion matrix look like for a real set of numbers?*

A clinic tests 200 people for a condition. By a later, certain check, 20 of them really have it and 180 do not. The quick test says yes to 24 people. Of those 24, 15 really have the condition.

Fill in the cells with a pencil:

1. **TP** = 15, the sick people the test flagged.
2. **FN** = 20 - 15 = 5, the sick people it missed.
3. **FP** = 24 - 15 = 9, the healthy people it flagged.
4. **TN** = 180 - 9 = 171, the healthy people it left alone.

Check: 15 + 5 + 9 + 171 = 200.

[[figure:confusion-matrix-and-rates/worked-matrix|The clinic test. The row totals are the truth: 20 sick, 180 healthy. The column totals are the answers: 24 yes, 176 no.]]

Notice the two kinds of total. Add across a row and you get how many cases there really were of that kind. Add down a column and you get how many answers the classifier gave of that kind. Precision and recall, in the next section, differ in exactly this: one looks down a column, the other across a row.

## Accuracy, precision and recall
*Which three questions can we ask of the four counts?*

Each metric answers a different question, so each divides by a different total.

| Metric | The question | Formula | Clinic test |
|---|---|---|---|
| Accuracy | How often is the answer right? | (TP + TN) / all cases | (15 + 171) / 200 = 0.93 |
| Precision | When it says yes, how often is that right? | TP / (TP + FP) | 15 / 24 = 0.625 |
| Recall | Of the real positives, how many did it find? | TP / (TP + FN) | 15 / 20 = 0.75 |

[[figure:confusion-matrix-and-rates/three-ratios|The same matrix, three questions. The shaded cells are the top of each fraction; the dashed cells are added to the shaded ones to make the bottom.]]

Precision looks down the **yes column**: of 24 yes answers, 15 were real. Recall looks along the **actually-yes row**: of 20 sick people, 15 were found. Doctors call recall **sensitivity**.

> Watch out: 93 percent accuracy sounds excellent, yet 180 of the 200 people are healthy, so a test that always answers no would score 180 / 200 = 0.90 and find nobody. Accuracy must be read against that kind of baseline, as in "Baselines and splits". The class imbalance lesson is about this trap.

## F1: one number for both
*How can precision and recall be judged together?*

Precision and recall pull against each other. A test that says yes only when it is very sure has high precision and misses many cases. A test that says yes to almost everyone has high recall and many false alarms. We often want one number that is high only when both are decent.

**F1** is the **harmonic mean** of precision and recall (a kind of average that stays close to the smaller number): 2 x precision x recall / (precision + recall).

For the clinic test: 2 x 0.625 x 0.75 / (0.625 + 0.75) = 0.9375 / 1.375 = 0.68. The plain average of the two is 0.6875, close by, because the two values are close.

[[figure:confusion-matrix-and-rates/f1-vs-average|Three classifiers. When precision and recall are far apart, the plain average (hollow marker) stays high, but F1 (filled marker) sinks toward the weaker side.]]

Take precision 0.9 and recall 0.1: right when it speaks, but it finds one positive in ten. The plain average is 0.5; F1 is 2 x 0.9 x 0.1 / 1.0 = 0.18, which says what is true.

::: deeper F1 straight from the counts
F1 = 2 x TP / (2 x TP + FP + FN). For the clinic test that is 30 / (30 + 9 + 5) = 30 / 44 = 0.68, the same as before. TN does not appear at all: F1 ignores the true negatives, so a flood of easy negatives cannot lift it.
:::

::: deeper Two rates for the negatives
Precision and recall only look at the cases the classifier called yes and at the real positives. The negatives have a rate too. **Specificity** is TN / (TN + FP): of the healthy people, how many were left alone. Here 171 / 180 = 0.95. The **false-positive rate** is FP / (FP + TN) = 9 / 180 = 0.05, which is 1 minus specificity. Later lessons build curves from it.
:::

## Choosing by the cost of the mistake
*Which metric should you watch for your problem?*

The right metric is the one that watches the mistake you cannot afford. Decide that before you look at any scores.

| Job | The costly mistake | Watch |
|---|---|---|
| Screening for a serious illness, cheap follow-up test | Missing a sick person (FN) | Recall |
| Automatically closing a bank account | Flagging an honest customer (FP) | Precision |
| Finding spam when you also want few good emails lost | Both matter | F1, or both numbers |

> Worked example: make the clinic test more eager, so it says yes to 39 people. Suppose it now catches 18 of the 20 sick people. Then TP = 18, FN = 2, FP = 39 - 18 = 21 and TN = 180 - 21 = 159. Recall rises from 0.75 to 18 / 20 = 0.90, while precision falls from 0.625 to 18 / 39 = 0.46 and accuracy falls from 0.93 to 177 / 200 = 0.885. The same test is better at catching and worse at being right, which is why you must say which one you need.

## Before the lab
*What do you take with you into the rest of this course?*

You now have the whole toolbox for one set of answers: four counts, and three ratios and F1 built from them. Try one more by pencil. A test on 100 cases has TP = 10, FP = 5, FN = 10 and TN = 75. Accuracy is 85 / 100 = 0.85, precision is 10 / 15 = 0.67, recall is 10 / 20 = 0.50 and F1 is 20 / 35 = 0.57. Notice how accuracy looks far better than the other three.

The next lessons build on this. "Measuring a classifier" asks where a score becomes a yes, and how to judge a classifier across every cut. "Class imbalance" explains why rare positives make accuracy and precision behave as they do.

After "Class imbalance", the Imbalance lab lets you change the share of positive cases yourself and compare an "always no" baseline with a trained classifier, and you will read those same four counts and ratios as they move.

::: remember
- The confusion matrix counts TP, FN, FP and TN. Read a name from its last word (what was said), and the first word says whether it was right.
- Accuracy = (TP + TN) / all, precision = TP / (TP + FP), recall = TP / (TP + FN). Precision looks down the yes column, recall along the actually-yes row.
- F1 is high only when precision and recall both are. Pick the metric that watches the mistake that costs you most.
:::
