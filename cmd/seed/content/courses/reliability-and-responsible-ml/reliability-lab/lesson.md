---
slug: reliability-lab
title: Reliability lab
kind: simulator
simulator: reliability-lab
minutes: 30
---
::: intro
- Stress-test a model on damaged test rows and read the result for each group, not only overall.
- Explain why a smaller fairness gap after a stress can mean that every group got worse, and what changes when each group gets its own threshold.
- Set a human review band, check it under stress, and write the privacy notes and the model card from numbers the lab measured.

Before you start: read "Robustness, fairness and privacy" and "Human review and model documentation". The first gave you the stress tests, the gaps and k-anonymity. The second gave you the review band and the model card.
:::

## What the lab asks
*What must a model survive before you let it near real cases?*

The last two lessons gave you a checklist: break the inputs, compare the groups, send doubtful cases to a person, keep less personal data, and write it all down. In the lab **Stress-test a model across groups** you run that checklist on one model, from the first number to the finished model card.

The lab names a few things differently. Its **Human review band** is the abstain band, and **Automated** is the coverage. The **Equal opportunity gap (recall)** is the true-positive-rate gap. **Selection rate** is the share of cases flagged as positive, and the **Demographic parity gap** is the largest difference of that share between groups.

The model is a logistic regression fitted on 600 generated applicants. It scores 900 test applicants in three groups: A (half of the rows), B (30%) and C (20%). A positive case is, for example, a loan that will be repaid. The model never sees the group column, but a postcode score moves with the group, so the group can still leave marks.

> Key idea: a test score is one number about the average case. This lab asks the same question four times: what happens to each group, under a stress, with a different threshold, and with a person in the loop?

## Clean rows first
*Do the groups differ before you stress anything?*

Set **Stress strength** to 0 and the lab shows the clean test rows. These are the numbers to remember.

| Group | Rows | Accuracy | Recall | False-positive rate |
| --- | --- | --- | --- | --- |
| A | 450 | 92.4% | 97.2% | 13.8% |
| B | 270 | 88.1% | 87.3% | 11.3% |
| C | 180 | 73.9% | 58.3% | 20.5% |

Overall accuracy is 87%. The **Fairness gaps before and after the stress** table subtracts the smallest value from the largest. The recall gap is 97.2 - 58.3 = 38.9 points. The selection-rate gap is 30.3 points and the false-positive-rate gap is 20.5 - 11.3 = 9.2 points.

Group C pays twice. The model misses 42% of its positive cases and also flags 20.5% of its negative ones. Its **Calibration by group** curve is the furthest from the dashed line, with a calibration error (the average gap between the predicted probability and the share actually positive) of 17.0%, against 7.2% for A and 6.1% for B.

> Watch out: "the model does not see the group, so it treats groups alike" is the misconception the Quick Quiz box tests first. Dropping a column does not drop its footprints.

## One stress, three groups
*Does damage to the test rows hurt every group the same?*

The **Stress type** menu damages the test rows and leaves the model alone. **Missing values** blank some cells, and the model fills a blank with the training average. **Noise** adds random noise. **Outliers** replace cells with values 8 standard deviations away. **Unit change** multiplies the first column (skill, or bill length on the penguins), as if its unit changed. **Distribution shift** moves every value, as if the population drifted. **Stress strength** runs from 0 to 1: at 1 it means 100% blank cells, 2 standard deviations of noise, 30% of cells as outliers, a factor of 100, or a shift of 2 standard deviations. The same damage is drawn every time, so a run can be repeated.

The lab opens on 40% blank cells. Overall accuracy falls from 87% to 79%, but the groups part ways: A falls from 92.4% to 79.8%, B from 88.1% to 81.1%, and C goes from 73.9% to 75.0%. The status line names the loser: Group A loses most, 12.7 points.

[[figure:reliability-lab/stress-by-group|Accuracy of the three groups on the clean rows (outline) and after 40% blank cells (solid). Group C, the weakest on clean rows, loses nothing.]]

A group that does not lose is not proof the model is fine. It only tells you that this stress did not reach it.

## A gap that shrinks is not a gap that is fixed
*When the gap gets smaller, did the model get fairer?*

Look at the table when the stress is strong. With 40% blank cells the recall gap falls from 38.9 to 32.4 points. With **Distribution shift** at 0.4 (0.8 standard deviations) it falls from 38.9 to 20.8. That looks like good news.

Read the other rows. Under that shift the recall of A goes from 97.2% to 100% and that of C from 58.3% to 79.2%, so the recall gap shrinks because everyone is now flagged more often. A was already near the ceiling of 100%, so C catches up. The false-positive-rate gap grows from 9.2 to 23.6 points, and accuracy falls from 87% to 71%.

Push **Missing values** to 1. Every cell is blank, every score is the same, and the model flags nobody. Recall and the false-positive rate are 0% in all three groups, so every gap is exactly 0.0, with accuracy at 54%. Each group's accuracy is then just its share of negative cases.

[[figure:reliability-lab/gap-trap|Accuracy and the recall gap on the clean rows and under three stresses. In all three the gap is smaller than on clean rows and the model is worse.]]

> Key idea: a gap measures a difference between groups, not how good any of them is. Always read it beside accuracy.

## One threshold or one per group
*Can each group get its own threshold, and does it last?*

Tick **A different threshold for each group** and **Match across groups** appears. With **Recall (equal opportunity)** the lab tunes one threshold per group on a separate validation sample so that their recall matches. Set **Stress strength** to 0 first. The detail line now reads A 0.73, B 0.43, C 0.08, and the recall gap drops from 38.9 to 8.1 points.

It is not 0 because the thresholds are tuned on other rows than the test rows. There are two prices. Overall accuracy falls from 87% to 84%, and the false-positive-rate gap grows from 9.2 to 35.8 points, because C's low threshold of 0.08 flags many of its negatives.

Now set the strength back to 0.4. The thresholds stay as tuned, so the recall gap goes from 8.1 to 28.8 points: a change of +20.7. A fix made on clean data did not survive the stress. This is the idea of "Fairness under shift" from the earlier lesson, seen with thresholds instead of base rates.

[[figure:reliability-lab/per-group-gap|The recall gap on the clean rows (outline) and under 40% blank cells (solid), with one threshold and with a threshold per group.]]

::: deeper Why the thresholds are tuned on other rows
If the lab tuned the thresholds on the test rows it would be grading its own homework: the gap would look better than it is on new cases. On the generated data the lab tunes on a separate validation sample, and on the penguins on the training rows. Per-group thresholds also need the group at decision time, and whether that is allowed is a policy question, as the earlier lesson said.
:::

## Where a person decides
*What does a review band cost, and does it still work under stress?*

The two **Review band** sliders set the **Human review band**: scores between them go to a person, scores below the lower edge are a machine "no", and scores above the upper edge are a machine "yes". The histogram uses the scores under the stress, and the band does not depend on **Threshold**.

Beside it, five readouts. With the default band (0.35 to 0.65) and strength 0, the band catches 11% of the cases (96). **Automated** is 89% and **Accuracy on the automated part** is 91%. At 40% blank cells the band catches 26% (236 cases), the automated part is 74% of the cases and 87% accurate, and **Accuracy with no review (cut at 0.5)** is 79%.

> Worked example: take the earlier lesson's assumption of 3 minutes per review. Clean rows: 96 x 3 = 288 minutes, about 4.8 hours. Under the 40% stress: 236 x 3 = 708 minutes, about 11.8 hours. The same band needs two and a half times the reviewers.

[[figure:reliability-lab/review-band|Scores under 40% blank cells, split by who decides. The band holds the middle of the histogram.]]

At 40% blank cells, **Accuracy with a reviewer** (91%) assumes that the person is always right, so it is a ceiling. The automation bias in the earlier lesson would pull it down.

## Privacy and the model card
*How do you write down what you measured?*

The **Privacy: k-anonymity and a noisy count** card works on a made-up directory of 900 people. With **Age**, **Postcode** and **Sex** as quasi-identifiers, every field exact, the 900 people form 848 groups and the smallest has 1 person: all 900 sit in a group smaller than k = 5. Set **Age bin size (years)** to 10 and **Postcode digits kept** to 3 and there are 14 groups, the smallest with 15 people, so k = 5 is met. Tick **Job title** and the smallest group is 1 person again, with 27 people (3%) below k.

The count flagged in group C is 55. With **Privacy budget ε (epsilon)** at 0.5 the typical error is 1 / 0.5 = 2.0 (4% of 55). With 0.05 it is 1 / 0.05 = 20.0 (36%). A smaller ε means more noise and more privacy.

Last, the **Model card** card. Each field starts with what the lab measured, for example **Where human review is needed** names your band. Edit it in your own words, and **Copy model card** takes it away.

## Penguins and a fresh sample
*Does the idea survive real data and a new split?*

Set **Data** to **Penguins (real)**. The task is whether a penguin is male, from bill length, flipper length and body mass, and the groups are the species. The lab uses 333 of the 344 rows (11 have a missing value) and splits them: 168 to fit, 165 to test. The model is weak: 70% accuracy, with recall of 36% for Adelie, 76% for Chinstrap and 97% for Gentoo, a recall gap of 60.6 points.

Under 40% blank cells accuracy falls from 70% to 60%. Gentoo loses most (30.5 points) and Adelie gains 5.6. Press **New sample** once: a new split gives 70% overall, a recall gap of 41.2 and a smaller loss of 18.6 points for Gentoo under the same stress. The weakest group on clean rows changed (Chinstrap has only 34 test rows), but Gentoo was hit hardest both times.

## A unit change on real data
*What happens when a column changes its unit?*

Set **Stress type** to **Unit change** at 0.4. The bill length is multiplied by 6, the model flags every penguin, every gap is 0.0 and accuracy is 50%.

> Watch out: penguins are not people. The lab uses them to show the mechanics, and the model card says so.

::: remember
- A model that never sees the group can still err differently for each group, and a stress hits the groups unevenly.
- Read a fairness gap beside accuracy: a gap can shrink because every group got worse, and a threshold tuned on clean data can stop working under stress.
- A review band is sized by the cases it sends, and its cost grows under stress. Privacy and the model card put the numbers you measured on the record.
:::

@@lab

## Lab: stress-test a model across groups
You start on 900 generated test applicants in groups A, B and C, with 40% of the cells blanked. The chart compares each group before and after the stress. Beside it: the fairness gaps, calibration, a human review band, a privacy panel and a model card. Press **Reset** before the experiments so that your numbers match.

### Controls
- **Data** switches between **Generated data** and **Penguins (real)**. **About this data** opens a longer note. The real data predicts whether a penguin is male, with the species as groups.
- **Stress type**: **Noise**, **Missing values**, **Outliers**, **Unit change** or **Distribution shift**. A sentence under **Stress strength** says what the current amount means.
- **Stress strength** (0 to 1) sets how much damage is done. The readout beside it, such as "40% blank", changes with the stress type.
- **Threshold** (0.05 to 0.95) is the cut-off for "positive" when every group shares one threshold.
- **A different threshold for each group** tunes one threshold per group. Then **Match across groups** appears: **Recall (equal opportunity)** or **Selection rate (demographic parity)**.
- **Review band: lower threshold** and **Review band: upper threshold** set the **Human review band**. Moving one past the other drags the other along.
- **New sample** generates a new data set, or a new split of the penguins.
- **Open the privacy panel** has the quasi-identifier toggles **Age**, **Postcode**, **Sex** and **Job title**, **Age bin size (years)**, **Postcode digits kept**, **k: the smallest group allowed**, **Privacy budget ε (epsilon)** and **Draw new noise**.
- **Open the model card fields** has the fields **Intended use**, **Data**, **Metrics by group**, **Known limits** and **Where human review is needed**, plus **Copy model card** and **Refill from the lab**. A field you edit is no longer overwritten until you refill. In fullscreen the two panels open as a dialog and **Close** shuts them.
- **Fullscreen** enlarges the lab and **Reset** returns to generated data, the first sample and every default.
- **Quick Quiz** holds one box: "The model never sees the group column. Will the error rates still differ between groups?" Pick an answer, then **Check answer**.

### Reading the screen
- The status line says how accuracy changed and which group lost most, then how the recall gap moved. A second line says which thresholds are in use.
- The chart has three blocks, **Accuracy**, **Recall (true-positive rate)** and **False-positive rate (lower is better)**, with one row per group. The outlined bar is before the stress, the solid bar after it.
- **Fairness gaps before and after the stress** has the columns **Gap**, **Before (points)**, **After (points)** and **Change (points)**, with the rows **Equal opportunity gap (recall)**, **Demographic parity gap (selection rate)** and **False-positive-rate gap**. ▲ marks a gap that grew, ▼ one that shrank.
- **Calibration by group** draws one curve per group under the stress, with its calibration error (for example "Group C: 14.9%"). The dashed line is perfect calibration.
- **Human review band** shows a histogram of scores under the stress, labelled **Machine: no**, **Person decides** and **Machine: yes**. Beside it: **Automated**, **Accuracy on the automated part**, **Reviewer workload**, **Accuracy with a reviewer** and **Accuracy with no review (cut at 0.5)**.
- **Privacy: k-anonymity and a noisy count** has the **k-anonymity report** and a table **Count released with ε = 0.50** (the number follows the slider) with **True**, **Released (rounded)** and **Typical error**. The **Model card** card counts how many fields are filled in.

### Experiments
All numbers are for the generated data and the first sample.

1. **Clean rows.** Predict: in the Quick Quiz box, pick whether the error rates differ between groups on clean data. Then set **Stress strength** to 0 and read the bars and the table. Accuracy runs from 74% (C) to 92% (A), recall from 58% to 97%, and the recall gap is 38.9 points. Check your answer. The model never saw the group, so why do the groups differ?
2. **Three stresses.** Predict: will the same strength of every stress hurt the three groups the same? Set **Stress strength** to 0.4 and try **Missing values** (A loses 12.7 points), **Unit change** (B loses 8.9) and **Distribution shift** (A loses 20.2). Under the shift the recall gap falls from 38.9 to 20.8 points while the false-positive-rate gap grows from 9.2 to 23.6. Then set **Missing values** to strength 1: every gap is 0.0 and accuracy is 54%. Why is a zero gap not good news here?
3. **A threshold per group.** Predict: can a threshold per group close the recall gap, and will it stay closed under stress? Set **Stress strength** to 0, tick **A different threshold for each group** and read the detail line (A 0.73, B 0.43, C 0.08). The recall gap falls to 8.1 points and the false-positive-rate gap grows to 35.8. Then set the strength to 0.4: the recall gap is 28.8 points, a change of +20.7. Switch **Match across groups** to **Selection rate (demographic parity)** and compare: the selection-rate gap is 25.5 points and the recall gap 36.6 (on clean rows they are 9.7 and 19.4), so closing one gap does not close the others.
4. **Where a person decides.** Predict: with the default band, what share of the cases would a person decide under the 40% stress, and what about on clean rows? Read **Reviewer workload**: 26% (236 cases) at 0.4 and 11% (96 cases) at 0. Set **Stress strength** back to 0.4, then widen the band to 0.20 and 0.80 (48%, 433 cases, automated accuracy 93%), then narrow it to 0.45 and 0.55 (7%, automated accuracy 81%). Then open the model card fields and read **Where human review is needed**: it names your band. Who can do that much reviewing?
5. **Privacy.** Predict: how many people are in a group smaller than k = 5 when the age, postcode and sex are exact? Untick **A different threshold for each group** first (the 55 flagged cases assume one threshold of 0.5). Open the privacy panel. All 900 are, and the smallest group is 1. Set **Age bin size (years)** to 10 and **Postcode digits kept** to 3: the smallest group is 15. Tick **Job title**: it is 1 again and 27 people (3%) are below k. Set **Privacy budget ε (epsilon)** to 0.05 and read the **Typical error**: ±20.0, which is 36% of the 55 cases flagged in group C.
6. **Penguins and a fresh sample.** Predict: which species will lose most accuracy under 40% blank cells, and will a new split change it? Press **Reset**, set **Data** to **Penguins (real)** and read the status line and the **Before (points)** column: accuracy 70% and a recall gap of 60.6 points. Gentoo loses most, 30.5 points. Press **New sample** once: accuracy 70%, recall gap 41.2, Gentoo still loses most (18.6). Then set **Stress type** to **Unit change**: accuracy falls to 50% and every gap is 0.0. Does the idea hold on a fresh split? Does the model card still say what you would want a user to know?
