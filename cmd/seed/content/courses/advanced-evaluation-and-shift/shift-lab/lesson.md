---
slug: shift-lab
title: Shift lab
kind: simulator
simulator: shift-lab
minutes: 30
---
::: intro
- Introduce one kind of shift at a time in the Shift lab and measure which validation setups anticipated the drop in accuracy.
- Explain, with the lab's numbers, why random k-fold misses covariate and concept shift, why accuracy can hide label shift, and what drift in the training data changes.
- Repeat the test on real penguins with a held-out island, and tell a setup that warns from one that is only lucky.

Before you start: read "Nested cross-validation" and "Covariate and concept shift" in this course, and "Grouped and temporal splits" in Validation and hyperparameter tuning. They gave you the five setups and a table of which one should see which shift. This lab tests that table.
:::

## What the lab asks
*Which of your validation scores would have warned you before the data moved?*

"Covariate and concept shift" ended with a promise: a random split anticipates no shift, and grouped, temporal and out-of-distribution tests anticipate some. Here you check it with numbers.

The Shift lab draws two classes in two features. **Filled dots are the train set and rings are the test set.** A model, k-NN with k = 5 at the start, is fitted on the train rows only. You then choose ONE kind of shift, and the test rings move away from the train dots.

The lab then shows two things side by side. The first is what each of five validation setups *estimated* from the training rows alone. The second is the accuracy *actually* measured on the shifted rings. The difference is the **gap**: estimate minus actual. A positive gap means the setup was too optimistic. A setup *anticipated* the drop when its estimate lands within 5 points of the actual accuracy.

> Key idea: a validation score is a prediction about future data. The lab lets you see the future, so you can grade the prediction.

## Five estimates
*What does each setup read, and what can it see?*

[[figure:shift-lab/five-setups|One round of each setup on ten training rows. The shifted holdout is the only one that looks at the test inputs, and none of them ever sees a test label.]]

**Random k-fold** holds out rows drawn from anywhere in the pool. **Grouped k-fold** never splits a group, and in the lab every row belongs to a group, such as a site. **Temporal split** fits on earlier rows and scores the next block, so the first block is only ever training data.

**Shifted holdout** is the lab's out-of-distribution test. It holds out the 30% of training rows that sit closest to the test inputs and fits on the rest. It reads the test *inputs*, which you have before any label arrives, and never the test labels. **Nested CV** lets an inner search choose k, and its outer folds score that recipe. Because the recipe picks its own k, the lab grades it against the tuned model's accuracy, marked as **tuned model** on the chart.

Each bar has a whisker for its spread. For the four fold-based setups (random, grouped, temporal and nested, whose outer folds count) it is the spread of the fold scores. For the shifted holdout it is the standard error of one accuracy on about 60 rows, roughly 4 points.

## The control: no shift
*What does a setup look like when there is nothing to anticipate?*

Set **Shift type** to **None**. The first sample gives an actual accuracy of 85%. Random k-fold estimates 86%, grouped 85%, temporal 86% and nested 87%. All four are green. The shifted holdout says 90%, about 6 points too high, even though nothing moved. (The exact figures are 90.0% against 84.5%, shown rounded, so the gap is 5.5 and the lab marks it ✗.)

That miss is noise. The shifted holdout is a single split of about 60 rows, so a 4-point whisker means a miss of 5 or 6 points happens now and then. Over the first ten samples, random k-fold came within 5 points ten times, grouped ten, temporal eight, the shifted holdout seven and nested seven.

The detectors agree with the green bars. The PSI of both features is 0.04 and 0.03, and the domain classifier AUC is 0.49, which is guessing.

> Watch out: a miss alone proves nothing. Compare a setup with the no-shift run before you blame it, and use **New sample** to see whether the miss repeats.

## Covariate shift
*Why does random k-fold keep saying the same number while the real score falls?*

Set **Shift type** to **Covariate shift**. The test rings slide right by 3 units times **Severity**, to a region the training dots barely cover. The labelling rule is untouched.

The random k-fold estimate does not move when you raise **Severity**, because it reads only training rows, and those do not depend on the shift at all. Averaged over the first ten samples, the actual accuracy falls as the test set moves.

| Severity | Actual accuracy | Random k-fold | Gap |
| --- | --- | --- | --- |
| 0.2 | 86% | 88% | 2 |
| 0.4 | 83% | 88% | 5 |
| 0.6 | 76% | 88% | 12 |
| 0.8 | 67% | 88% | 21 |
| 1.0 | 58% | 88% | 30 |

> Worked example: on the first sample at Severity 0.8, the actual accuracy is 80% and random k-fold says 86%. The gap is 86 - 80 = 6 points, so it is ✗. That sample is mild. On samples 2 to 5 the actual accuracy is 64%, 61%, 69% and 61%, and no setup comes within 5 points.

## What the inputs and the model show
*Can you see covariate shift coming, and does the model change the damage?*

The inputs give the shift away. The PSI of Feature 1 is 4.87 and the domain classifier AUC is 0.95, while Feature 2 stays at 0.03. The model matters too: switch **Model** to **Logistic regression** and the first sample drops to 57%, because a straight boundary is extended into a region it never saw.

## Label shift
*Can the class balance change without the accuracy falling?*

Set **Shift type** to **Label shift**. The test set now holds fewer class 1 rows: at Severity 0.8 the share goes from 48% to 22% on the first sample. Each class still looks as it did.

The accuracy barely moves. On the first sample it reads 92%, while random k-fold had estimated 86%, so that estimate is 6 points too *pessimistic*. Do not read much into it: that test set has only 44 class 1 rows, and both classes score about 92% on it, so neither class explains the 92%. It is a lucky draw. The ten-sample mean is the better guide. The actual accuracy is 88.5% and random k-fold says 87.9%, close to the 88.1% the lab gives with no shift at all. The share of class 1 fell by more than half and the accuracy stayed level. Random, grouped and temporal came within 5 points in seven, eight and seven of ten samples.

[[figure:shift-lab/one-estimate|The random k-fold estimate and the actual accuracy at Severity 0.8, as a mean of ten samples. The same 88% estimate meets four different outcomes.]]

So accuracy alone shows nothing here, just as the screening test did in "Covariate and concept shift", where precision collapsed while accuracy stayed near 94%. The only detector that sees it is the class-share row, **Share of class 1, train to test**, and it needs test labels. The shifted holdout was the odd one out. It averaged 7 points too pessimistic and was within 5 points in only four of ten samples.

## Concept shift
*Why did no setup warn you?*

Set **Shift type** to **Concept shift**. The test inputs keep their distribution, but the true boundary turns by 90 degrees times **Severity**: the dashed line in the plot. At 0.8 the actual accuracy is 55%, random k-fold says 86%, and no setup comes within 5 points. The detectors see nothing: PSI 0.04 and 0.03, AUC 0.49, class balance 48% to 52%. A stable input and a falling score is the signature of this shift.

Every setup studies training rows that follow the old rule, so none can know it changed.

## Drift in the training data
*What makes one setup start to warn?*

Now raise **Drift already in the training data**. The later training rows then already follow part of the new rule, which is what a temporal split reads.

[[figure:shift-lab/drift-curves|Concept shift at Severity 0.8 as drift grows, mean of ten samples. Drift makes the training data disagree with itself, so the estimates fall and the actual accuracy rises.]]

At Drift 1.0 the first sample puts all five setups within 5 points, but only because the training data has already moved. On the fifth sample only the temporal split is within 5 points, at 77% against an actual 75%. Over ten samples it came within 5 points in 8 and random k-fold in 5.

> Key idea: a validation setup can only warn about a change that already exists somewhere in the data it studies.

## One estimate, four outcomes
*What do the earlier guesses look like once you have the numbers?*

At no shift the random k-fold estimate is right. The same 88% meets an actual 67% under covariate shift, 89% under label shift and 59% under concept shift. The estimate never changed, because it never looked at the test set.

The two guesses from "Covariate and concept shift" can now be answered. For covariate shift, the random, grouped and temporal splits all missed, by about 20 points on average, and the shifted holdout came closest at 14. For concept shift, none of them warned without drift. A nested score would not have warned either: it removes the flattery of tuning, and it cannot see the test set.

::: deeper How the lab builds each shift
Covariate shift moves the first feature right by 3 times Severity. Label shift lowers the share of class 1 from 0.5 to 0.5 minus 0.4 times Severity, so 0.18 at Severity 0.8. Concept shift rotates the wavy boundary around the origin by 90 degrees times Severity, which is 72 degrees at 0.8. Drift lets the training rows move smoothly with their time order, so the last ones have moved Drift times Severity of the way.
:::

## A real island
*Does the lesson hold when the shift is a place on a map?*

Set **Data** to **Penguins (real)**. The model predicts sex from bill length and body mass, and **Held-out island** is the test set. Biscoe holds 44 Adelie and 119 Gentoo penguins, while the training islands have no Gentoo, so the inputs differ before any label is used. Female Gentoo average 4,680 g, heavier than male Adelie at 4,043 g.

With Biscoe held out and k-NN, the actual accuracy is 60%. The five estimates are 84%, 80%, 82%, 86% and 84%, and none is within 5 points. The detectors agree: PSI 0.53 and 1.60, AUC 0.87, while the share of male penguins barely moves, 50% to 51%.

## Is a short gap a warning?
*When a setup lands close to the actual accuracy, did it see the shift?*

[[figure:shift-lab/islands|Random k-fold estimate against the actual accuracy on each held-out island, for both models. A short gap is not always a warning.]]

With Dream held out and **Logistic regression**, grouped k-fold, the temporal split and the shifted holdout land within 5 points of the actual 54%. Do not credit them with foresight: random k-fold is itself only 61%, because the model is weak everywhere, so there was little to lose.

::: remember
- Random k-fold never reads the test set, so its estimate stays put while covariate or concept shift pulls the real accuracy down.
- Accuracy can fall (covariate, concept), stay level (label), so watch the class balance, the input detectors and the outcomes together.
- A setup anticipates a shift only if the shift is already in its data: drift helps the temporal split, test inputs help the shifted holdout, and a weak model can look right by luck.
:::

@@lab

## Lab: dataset shift
You start on generated points with Covariate shift at Severity 0.80, and k-NN as the model. You choose a shift, a severity and a model, and compare what five setups estimated with the accuracy actually measured on the shifted test set.

### Controls
- **Data** switches between **Generated data** and **Penguins (real)**. The real data predicts sex from bill length and body mass.
- **Held-out island** (**Biscoe**, **Dream**, **Torgersen**) appears only with the real data. The penguins of that island are the test set. **Shift type**, **Severity**, **Drift already in the training data** and **Show the true boundary** are hidden there, and **New sample** is disabled.
- **Shift type** chooses **None**, **Covariate shift**, **Label shift** or **Concept shift**. Only one shift is active at a time.
- **Severity** (0 to 1, starts at 0.80) says how far the test set moves. It is disabled when **Shift type** is **None**.
- **Drift already in the training data** (0 to 1, starts at 0.0) lets the later training rows already hold part of the shift. It is disabled at **None** too.
- **Model** chooses **k-NN (k = 5)** or **Logistic regression**.
- **Show the model's regions** tints the plot by the class the model predicts. **Show the true boundary** draws the wavy line that labels the data. Both start on.
- **New sample** draws a new generated sample, and it also changes the fold shuffles. **Reset** returns to the first sample and every starting value. **Fullscreen** enlarges the lab.
- **Quick Quiz** is the button under the settings card (a round button at the bottom right on a phone). It asks: "Which validation setup will warn you about a concept shift?" Pick an answer before you set **Shift type** to **Concept shift**.

### Reading the screen
- The plot shows the train set as filled dots and the test set as rings, one color per class. With a concept shift, the legend lists **True boundary, train** (grey) and **True boundary, test** (dashed).
- The status line reads "Actual accuracy on the shifted test set: 80%. Random k-fold estimated 86%." and then names the setups within 5 points, or says "No setup came within 5 points." The line under it says what the shift does, and the box at the right counts the rows, such as "200 train rows, 200 test rows".
- The chart **Estimated and actual accuracy** has one bar per setup: **Random k-fold**, **Grouped k-fold**, **Temporal split**, **Shifted holdout** and **Nested CV**. Each shows its estimate, a spread whisker and a verdict, such as "✓ within 5 points" or "✗ 6 points too optimistic". The label **Actual: 85%** (the number changes) sits above the chart, and a black tick marks the actual accuracy. For **Nested CV** the tick belongs to the tuned model, marked **tuned model**. A green bar is within 5 points.
- The card **Shift detectors** has the columns **Detector**, **Value** and **Reading**. Its rows are **PSI, Feature 1**, **PSI, Feature 2** (**PSI, Bill length** and **PSI, Body mass** with penguins), **Domain classifier AUC**, and **Share of class 1, train to test** (**Share of male penguins, train to test** with penguins).

### Experiments
The numbers are for the first sample. Press **Reset** before each experiment, because **New sample** changes every number.

1. **The control.** Predict: with **Shift type** set to **None**, will any setup be far off? Check: the actual accuracy is 85%, and random k-fold, grouped k-fold, temporal split and nested CV are all green at 86%, 85%, 86% and 87%. The shifted holdout says 90%, about 6 points too high. Press **New sample** several times and count how often a setup misses. What does that tell you about one miss?
2. **Covariate shift.** Predict: which setup will come within 5 points? Set **Shift type** to **Covariate shift**, with **Severity** at 0.80. The first sample gives 80% against random k-fold's 86%, and only grouped k-fold is green. Press **New sample** four times: the actual accuracy is 64%, 61%, 69% and 61%, and no setup is green. Read **PSI, Feature 1** each time (4.12 to 5.08). Finally switch **Model** to **Logistic regression** on the first sample: the actual accuracy falls to 57%. Why does a straight boundary suffer more?
3. **Label shift.** Predict: will the accuracy fall? Set **Shift type** to **Label shift**. It reads 92% against random k-fold's 86%, and only nested CV is green. **Share of class 1, train to test** reads 48% to 22%, both PSI values stay below 0.1 (0.04 and 0.09) and the AUC is near 0.5 (0.56). Press **New sample** twice: 91% against 90%, then 89% against 87%, with four setups green. Why can this shift go unnoticed by accuracy?
4. **Concept shift.** Predict: in the Quick Quiz, pick which setup will warn you. Then set **Shift type** to **Concept shift**. The actual accuracy is 55% against 86%, and no setup is green. The detectors read PSI 0.04 and 0.03, AUC 0.49 and 48% to 52%. Turn **Show the true boundary** off and on to see the solid and the dashed boundary. Which detector would have caught this, and what would it need?
5. **Drift.** Predict: if the later training rows already contain part of the shift, who notices first? Keep **Concept shift** and raise **Drift already in the training data** to 1.0. On the first sample the actual accuracy is 76% and all five setups are green. Press **New sample** four times: on the fifth sample the actual accuracy is 75%, only the temporal split is green (77%), and random k-fold says 84%. Set Drift back to 0.0 and it returns to 55% against 87%. Why does drift help the temporal split?
6. **Penguins and a fresh split.** Predict: if a whole island is held out, will any setup warn you? Set **Data** to **Penguins (real)**, **Held-out island** on **Biscoe**. The actual accuracy is 60%, the estimates are 84%, 80%, 82%, 86% and 84%, and none is green. **New sample** is disabled here, so test a fresh split by changing **Held-out island**: Dream gives 54% against 81% for random k-fold, and Torgersen gives 68% against 85%. Then set **Model** to **Logistic regression** on Dream: grouped k-fold, temporal split and shifted holdout are green at 57%, 57% and 52%, while random k-fold says 61%. Is that a warning, or a weak model?
