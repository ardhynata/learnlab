---
slug: sampling-variability-and-bootstrap
title: Sampling variability and the bootstrap
kind: reading
simulator: ""
minutes: 20
---
::: intro
- Explain why a score measured on one test set is a single draw, and why a small test set makes accuracy wobble.
- Compute a standard error and a 95% confidence interval for an accuracy, and say what the interval does and does not claim.
- Run a bootstrap by hand on ten test results, and name the cases where it misleads.

Before you start: read "Train, validation and test" and "Center and spread".
:::

## One test score is one draw
*Why can the same model score 85% on one test set and 75% on another?*

The last lesson asked how a probability should change when you learn something new. This one asks how far a number you measured can be trusted.

"Train, validation and test" told you to use the test set once and report its score. But a test set is only a **sample**: a handful of cases picked from all the cases the model will meet. Its score is a **draw**, and another sample would give another score. This wobble from sample to sample is **sampling variability**. The share of all cases the model gets right is its **true accuracy**, and you never see it directly.

Make one up so that we know the answer: a model with a true accuracy of 85%, tested on 20 fresh cases. The single most likely result is 17 right, but only 24% of test sets give exactly that. About 17% give 75% or lower, and 18% give 95% or higher. The figure shows every possible score.

[[figure:sampling-variability-and-bootstrap/test-set-wobble|How often each score appears across many test sets, for a model whose true accuracy is 85%. The top panel uses 20 cases per test set, the bottom panel 100.]]

## Standard error
*How big is the wobble, and how do you shrink it?*

The **standard error** (SE) is the standard deviation of a metric across repeated samples: how far a measured value typically lands from the truth. You met the standard deviation in "Center and spread".

For an accuracy measured on n independent cases, `SE = sqrt(p × (1 - p) / n)`, where p is the accuracy.

> Worked example: with p = 0.85 and n = 20, p × (1 - p) = 0.85 × 0.15 = 0.1275. Divide by 20 to get 0.006375, and the square root is 0.0798. A typical test set misses the truth by about 8 points.

| Test cases (n) | Standard error |
| --- | --- |
| 20 | 8.0 points |
| 100 | 3.6 points |
| 400 | 1.8 points |
| 1,600 | 0.9 points |

Each row has four times the cases of the one above and half its wobble, because n sits under a square root.

> Key idea: to halve the wobble you need four times as many test cases. With 20 cases a single mistake moves the score by 5 points, which is more than half of the 8-point standard error.

## Confidence intervals
*What range of true accuracy fits the score you measured?*

About 95% of draws land within 1.96 standard errors of the truth. So a **95% confidence interval** for an accuracy is the score plus and minus 1.96 SE. In practice you do not know p, so you put your measured score in the formula.

> Worked example: a model gets 85 of 100 test cases right. SE = sqrt(0.85 × 0.15 / 100) = 0.0357. Then 1.96 × 0.0357 = 0.070, so the interval is 85% ± 7 points: 78% to 92%.

With 400 cases and the same 85%, the interval narrows to about 81.5% to 88.5%.

Read the interval as the range of true accuracies that are consistent with what you saw. Two models scoring 85% and 87% on 100 cases each cannot be told apart: the gap of 2 points is far smaller than the 7-point wobble of each score.

> Watch out: "95%" describes the method, not this one interval. If you repeated the whole experiment many times, about 95 of 100 intervals built this way would contain the true accuracy. The true accuracy is one fixed number, so any single interval either contains it or does not.

## The bootstrap
*How do you get an interval when there is no formula?*

The accuracy formula is a special case. For F1, recall on a rare class, AUC or a median error there is no simple formula. The **bootstrap** gets an interval for any metric you can compute from a list of cases.

The idea: you cannot draw new samples from the world, but your test set is a small copy of it. So draw new samples from the test set. Four moves:

1. **Resample.** Draw n cases from your n test cases **with replacement**: after each draw the case goes back, so it can be drawn twice or not at all.
2. **Recompute** the metric on that resample.
3. **Repeat** many times, B resamples. Use 1,000 or more.
4. **Sort** the B values. For a 95% interval, read the 2.5th and the 97.5th percentile (the values with 2.5% of the results below, and 2.5% above). This is the **percentile interval**.

[[figure:sampling-variability-and-bootstrap/resample|One resample of ten test cases. Cases 4 and 8 are drawn twice, and cases 1 and 10 are left out.]]

::: deeper Why some cases are left out
Each draw misses a given case with probability 1 - 1/n. After n draws the chance that a case never appeared is (1 - 1/n)^n. For n = 10 that is 0.9^10 = 0.349, so a resample contains about 65% of the distinct cases. For large n it settles near 36.8%, which leaves about 63% in. The repeats and the gaps are what make the resamples differ from each other.
:::

## A bootstrap by hand
*Can you run it with ten test results and a pencil?*

A model is tested on 10 cases, numbered 1 to 10. It gets 8 right and misses cases 4 and 9, so its accuracy is 80%.

> Worked example: **One resample.** A seeded random-number generator draws the case numbers 8, 4, 3, 6, 9, 7, 5, 4, 8, 2. Case 4 appears twice and case 9 once, so the resample has 3 misses and 7 right: accuracy 70%.

Repeat 20 times. The results, as the number of right answers out of 10, sorted into a table:

| Right out of 10 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Resamples | 1 | 0 | 2 | 5 | 5 | 6 | 1 |

Cut 5% off each end: with 20 results that is the lowest one and the highest one. What is left runs from 6 to 9 right, a 90% interval of 60% to 90%.

[[figure:sampling-variability-and-bootstrap/bootstrap-results|The 20 resample accuracies as stacked dots. The dropped lowest and highest are crosses, and the bracket is the 90% percentile interval.]]

Twenty resamples is far too few for real work. With 10,000 resamples the 95% percentile interval is 50% to 100%. The accuracy formula gives 55% to 105%, which is impossible. Ten cases cannot pin down an accuracy, and the bootstrap says so.

## When the bootstrap fails
*When does a resampled interval mislead you?*

- **Tiny samples.** The bootstrap reshuffles the cases you have and cannot invent one you have not seen. If a model gets 5 of 5 cases right, every resample is all right: the interval is 100% to 100%, as if there were no doubt. Treat it as rough with a few dozen cases or fewer, and especially when a rare class has only a handful of cases.
- **Dependent records.** The bootstrap assumes each case is an independent draw. Suppose 100 test rows come from 20 people, 5 rows each, and the model is right or wrong on all 5 rows of a person together. Then you have 20 independent cases, not 100. The honest SE is sqrt(0.85 × 0.15 / 20) = 0.080, but resampling rows gives about 0.036, an interval 2.2 times too narrow. Resample whole people instead. Records close in time are dependent in the same way.
- **A test set unlike the future.** The bootstrap measures only sampling wobble. It cannot see leakage, mislabeled cases or a test set that does not look like the cases you will meet later.

> Watch out: a narrow interval means the score is steady, not that it is right. Check that the cases are independent and representative first.

## Reporting a score honestly
*What should stand next to every metric you report?*

A bare "85%" hides how much to trust it. Next to a score, state how many test cases it came from and give an interval. Ask four questions of any reported metric:

- How many cases does it come from, and how many are in the rarest class?
- Is there an interval, and how was it computed?
- Are the cases independent, or are rows grouped by person, place or time?
- Does the test set look like the cases the model will really meet?

The next lesson is the bootstrap lab. Its job is the one in this lesson: sample again and again from the same population and see how much a reported metric varies. You now have the words for it: sampling variability, standard error, confidence interval and percentile interval.

::: remember
- A metric measured on a test set is one draw. Another sample gives another score, and the wobble shrinks only as the square root of the test size: four times the cases halves it.
- A confidence interval, from a formula or from the bootstrap (resample with replacement, recompute, take percentiles), shows which true values fit the score. The 95% belongs to the method.
- The bootstrap fails on tiny samples and on dependent records, and it cannot fix a test set that does not look like the future.
:::
