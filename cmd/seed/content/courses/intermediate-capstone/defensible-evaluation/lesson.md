---
slug: defensible-evaluation
title: Defending an evaluation
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Write the split as a sentence about how the model will be used, and cut the data (by group, by time, or at random) so that the test rows are new in that way.
- Choose the metric from the cost of each mistake, then set the threshold from those costs using out-of-fold predictions, never the test set.
- Report one test score with a bootstrap interval that resamples whole patients, and answer the five-question checklist for any evaluation.

Before you start: read "Grouped and temporal splits", "Cross-validation and stratification", "Tuning with search", "Sampling variability and the bootstrap" and "Measuring a classifier". This lesson puts all five into one project.
:::

## A score is a claim
*What must you be able to show for one number?*

A model reports a number, say a cost of 24 per patient. Whoever pays will ask how you know it will do that on real patients. A **defensible evaluation** is one where every step has a reason you can show, so the number can be argued for.

This lesson follows one invented project. A hospital wants to flag patients likely to be readmitted within 30 days, so that a nurse can phone them. The data are 2,000 discharges from 500 patients, four each. The model will score patients it has never seen. A missed readmission costs 500, and a phone call to a patient who was not going to be readmitted costs 100. Every number below is simulated with fixed seeds, not taken from real patients.

Five questions hold the argument together.

[[figure:defensible-evaluation/five-questions|The five questions of a defensible evaluation, in the order you meet them, each with what you show a reader.]]

> Key idea: the five answers form a chain. A weak link, such as a leaky split or a threshold picked on the test set, makes every later number worthless.

## The split states the deployment
*How do you know the test rows are new in the right way?*

Start with one sentence: when the model is used, what will be new? Here it is new patients. So the cut is by patient, and every discharge of a patient goes to the same side. Tuning gets 400 patients (1,600 discharges), and the test set gets 100 patients (400 discharges).

A random cut shows what goes wrong. With 20% of the rows in the test set, a test discharge has three other discharges from the same patient. Each is in training with probability 0.8, so the chance that at least one is there is 1 - 0.2^3 = 0.992. About 99.2% of test discharges have a close relative in training.

[[figure:defensible-evaluation/same-patient-rows|How many of a test discharge's three siblings land in training. A random cut leaves almost every test row with a relative there. A grouped cut leaves none.]]

For another use, the sentence changes and so does the cut.

| The model will score | Cut |
| --- | --- |
| New patients from the same hospitals | Group by patient |
| Hospitals it has never seen | Group by hospital |
| Next month's rows | By time, with a rolling origin (train on earlier blocks, test on the next) |
| New patients next year | Both: group by patient, later dates in test |
| Independent rows, like the penguins | Random |

## The metric is the cost
*Why is accuracy the wrong number here?*

To choose a threshold you need out-of-fold predictions, where each row is predicted by a model that did not train on it. Grouped 5-fold cross-validation on the tuning patients gives them, 80 patients (320 discharges) per fold. Of the 1,600 discharges, 144 are readmissions (9.0%).

Always saying "no" gets 1,456 right, an accuracy of 91.0%. A model that flags every discharge with a score of 0.2 or higher gets (102 + 1,284) / 1,600 = 86.6%. By accuracy the useless rule wins.

> Worked example: the cost of a rule is 500 × (missed readmissions) + 100 × (false alarms). The model at 0.2 misses 42 and raises 172 false alarms: 21,000 + 17,200 = 38,200, which is 23.9 per discharge. Never calling anyone misses 144: 72,000, or 45.0. Calling everyone raises 1,456 false alarms: 145,600, or 91.0.

The model cuts the cost of the better no-model rule by nearly half. Put both baselines beside every cost you report, as in "Framing and baselines".

> Watch out: choose the metric before you see results. One picked afterwards is one more thing tuned on the data.

## Tune without opening the test set
*Where does the search stop and the test begin?*

Give each set of rows one job. The tuning patients are for fitting and choosing. The test patients have one job: scoring the final recipe once. Fit preprocessing and feature selection inside each fold, as in "Pipelines and leakage".

A search over 60 settings with 5 folds costs 60 × 5 = 300 fits, and then you refit the winner on all the tuning data. The winner's cross-validation score is flattered, as "Tuning with search" showed, and comparing candidates on the test set does the same. Take ten equally good candidates, each scored with a standard error (the typical noise in one score) of 5 points. The best looks about 1.54 × 5 = 7.7 points better than any truly is, because 1.54 is the expected largest of ten standard normal draws.

So the test set must not choose anything. Not the model, the features, the metric or the threshold.

> Watch out: if you looked at test numbers and then changed something, say so and treat the score as tuned. A labelled score is still useful.

## The threshold comes from the costs
*How do you pick the cut without peeking?*

The model gives every discharge a score, and a threshold turns it into a call, as in "Measuring a classifier". Choose the threshold that costs least on the out-of-fold predictions. Seven candidates (ties rounded half up):

| Threshold | Calls | Missed | False alarms | Cost per discharge | Accuracy |
| --- | --- | --- | --- | --- | --- |
| 0.5 | 90 | 85 | 31 | 28.5 | 92.8% |
| 0.4 | 122 | 73 | 51 | 26.0 | 92.3% |
| 0.3 | 172 | 64 | 92 | 25.8 | 90.3% |
| 0.2 | 274 | 42 | 172 | 23.9 | 86.6% |
| 0.15 | 343 | 37 | 236 | 26.3 | 82.9% |
| 0.1 | 442 | 26 | 324 | 28.4 | 78.1% |
| 0.06 | 590 | 17 | 463 | 34.3 | 70.0% |

[[figure:defensible-evaluation/cost-by-threshold|Cost per discharge at each threshold, on the out-of-fold predictions. The lowest point is 0.2. Dashed lines are the two rules that need no model.]]

Accuracy would choose 0.5. Cost chooses 0.2, which is 4.6 cheaper per discharge. The bottom is shallow: moving to 0.3 adds only 1.9, so say that the choice is not razor-sharp.

::: deeper A cutoff from the costs alone
Suppose a score is a calibrated probability p of readmission: of the discharges scored p, a share p are readmitted. Calling costs (1 - p) × 100 in expectation, and not calling costs p × 500. Calling is cheaper when 100 < 600p, so p > 100 / 600 = 0.167. In the table the minimum, 0.2, is close to that. The rule holds only when the scores are really calibrated, so use it as a starting point and check it against the table.
:::

## A score with its interval
*How sure are you of the test result?*

Now open the test set once, with the refitted model and the threshold 0.2. Of 400 discharges, 44 were readmissions. The model made 57 calls: TP = 26 true positives, FP = 31 false positives, FN = 18 false negatives, TN = 325 true negatives. Its cost is 18 × 500 + 31 × 100 = 12,100, or 30.25 per discharge. Never calling costs 22,000 (55.0) and calling everyone costs 35,600 (89.0).

A bare 30.25 is one draw. Resample the 100 test patients with replacement, moving each patient's four discharges together, recompute the cost and repeat 2,000 times. The 95% percentile interval, the middle 95% of the 2,000 costs, is 19.0 to 43.3. Resampling the 400 discharges as if they were independent gives 20.8 to 41.5, so the patient interval is about 17% wider, because the test set holds 100 patients, not 400 cases.

[[figure:defensible-evaluation/interval-by-patient|The test cost per discharge with two bootstrap intervals. Resampling patients is the honest one. The tuning estimate, 23.9, lies inside it.]]

The saving against never calling is 55.0 - 30.25 = 24.75 per discharge, with an interval of 8.0 to 44.3. It stays above zero, so the model's value is not a fluke of this draw.

## Before the project
*What do you hand a reader along with the number?*

Write the report as an answer to the five questions. Here: grouped 5-fold cross-validation on 400 patients and a test set of 100 others; cost, with 500 per miss and 100 per false alarm; 60 settings tuned on the tuning data only, and a threshold of 0.2; a test cost of 30.25, interval 19.0 to 43.3, against 55.0 for never calling.

| Question | What you show |
| --- | --- |
| What will be new at deployment? | The split, and why it matches |
| What does a mistake cost? | The metric, the costs and both baselines |
| What did you tune on? | Which rows, and that the test set stayed closed |
| Which cut do you act on? | A threshold chosen from the costs on out-of-fold predictions |
| How sure are you? | An interval that resamples whole entities |

The next lesson, "Reproducible pipelines", asks how to make every line of this report repeatable. The "Intermediate capstone project" then asks you to defend a split, compare models and report a held-out interval for a cost-sensitive classifier with repeated entities or timestamps.

::: remember
- State what is new at deployment, and cut so that the test rows are new in that way: by group, by time, or both.
- Choose the metric from the costs, tune and choose the threshold on out-of-fold predictions, and open the test set once.
- Report the test score with an interval that resamples whole entities, next to the baselines that need no model.
:::
