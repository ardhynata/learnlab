---
slug: audit-lab
title: Audit lab
kind: simulator
simulator: audit-lab
minutes: 30
---
::: intro
- Audit a fitted model by group, and predict which gaps a threshold change will close and which it will open.
- Explain why two correlated features share one importance score, and why their pair still keeps its full worth.
- Check each idea on the real penguins with a fresh split before you trust it.

Before you start: read "Subgroup metrics and fairness" and "Permutation importance and SHAP".
:::

## What the lab audits
*What model is on the table, and what do we ask of it?*

The first lesson of this course audited a rule by group. The second explained a model with importance scores and Shapley values. The Audit lab puts both on one model and lets you move the settings yourself.

The lab starts with 1,200 generated rows. Half train a logistic regression and half, 599 rows, are held out for the audit. A row belongs to Group A (439 audited rows) or Group B (160 rows), and the two groups differ in base rate, the share of rows that are truly positive. The model never sees the group.

Each row has four features: **signal**, **signal copy**, **other signal** and **noise**. The outcome depends on the signal and on the other signal, never on the copy or the noise. The copy is a noisy twin of the signal, and you choose how close a twin with **Correlation between the two features** (it starts at 0.20).

The lab asks three questions of one model. Where do the errors fall? How much does it rely on each feature? Why did it give one case its prediction? Overall accuracy is 78.8%.

## Errors by group
*Can two groups have the same accuracy and still be treated differently?*

Open the table **Errors by group**. Accuracy is 78.8% in both groups, so the accuracy gap is 0.1 points. Every other row differs.

[[figure:audit-lab/group-gaps|The lab's table drawn as bars. Accuracy matches, yet the positive rate gap is 26.7 points. A triangle marks a gap of 10 points or more.]]

The lab says **Positive rate** where the first lesson said flag rate, and **Recall** where it said equal opportunity. The table shows the same numbers, now for a model you can change.

> Worked example: behind the percentages are counts. Group B has 160 rows, 50 of them positive. The model finds 38 (true positives), misses 12, flags 22 negative rows by mistake (false positives) and clears 88. Recall is 38 / 50 = 76.0%. Precision is 38 / 60 = 63.3%. The false-positive rate is 22 / 110 = 20.0%. The positive rate is 60 / 160 = 37.5%. Group A has 228, 39, 54 and 118 in the same four boxes.

The model is right equally often in each group, but Group A holds more positives (60.8% against 31.3%), so the model flags A more often and is more often right about the flags.

> Key idea: equal accuracy does not mean equal errors. Read every row, and read the number of rows beside it.

## One threshold or one for each group
*What do the Match buttons do, and what do they cost?*

The model gives each row a probability. A **threshold** turns it into a yes or a no: a row at or above it is predicted positive. At 0.50 you get the table above. The score curves at the top of the lab show how each group's scores spread, with a dashed line at the threshold.

Slide **Threshold** from 0.20 to 0.90. One threshold moves both groups together, so the positive rate gap stays between 5.9 and 28.8 points (the largest is at 0.60). At the two ends of the slider it is 5.9 at 0.90 and 10.8 at 0.20, and there accuracy is only 53.3% and 62.8%.

Press **Match positive rates**. It switches on **A different threshold for each group**, and Group B's threshold falls to 0.36, so B is flagged as often as A. The table **The trade-off: one threshold or your thresholds** shows the price.

[[figure:audit-lab/three-settings|The three gaps and the accuracy for one threshold of 0.50, after Match positive rates and after Match recall.]]

> Worked example: B's positive rate rises from 37.5% to 64.4% (103 of its 160 rows flagged). Only 6 more true positives are found (44 of 50), but 37 more false alarms appear (59). Precision falls from 63.3% to 44 / 103 = 42.7%, the false-positive rate rises from 20.0% to 59 / 110 = 53.6%, and overall accuracy falls from 78.8% to 73.6%.

## Equal recall is a different goal
*Why can the lab not close every gap at once?*

Press **Match recall** instead. B's threshold falls only to 0.42. Recall is now 85.4% in A and 86.0% in B, a gap of 0.6 points, and accuracy is 76.5%. But the positive rate gap is still 11.7 points and the precision gap is 29.7.

The first lesson gave the reason: flag rate equals recall times base rate divided by precision. For A that is 0.854 x 0.608 / 0.809 = 0.642. For B at one threshold, with recall 0.760, base rate 0.313 and precision 0.633, it is 0.376, which matches the table's 37.5% up to rounding. When the base rates differ, holding recall and the positive rate equal would force the precisions apart.

A match is also approximate: the lab rounds a threshold to 0.01 and tied scores (rows with the same probability) move together, so after a match the detail line prints the values reached.

> Watch out: a matching button is a tool, not a verdict. It shows what each goal costs. Which gap to close, and how much accuracy to give up, depends on what each mistake costs in the use case.

## Correlated features share importance
*Why does the signal look less important when its copy appears?*

The chart **Permutation importance** shows how much accuracy the model loses when one feature is shuffled. At correlation 0.20 the signal costs 25.9 points, the copy 0.0 and the other signal 5.8. The last bar, **Both together**, shuffles the signal and its copy at once and costs 25.4.

Now raise the correlation. The copy starts to carry the signal's information, so the model leans on both, and each can cover for the other when shuffled.

[[figure:audit-lab/shared-importance|The importance of the signal and of its copy at four correlations, next to the two shuffled together.]]

At 0.95 the signal falls to 14.5 and the copy rises to 6.9. At 0.99 they are 10.9 and 9.0. Together they cost between 25.4 and 26.3 at every setting of the slider, so the pair keeps its worth while the two single bars add up to less (19.9 at 0.99).

> Watch out: the outcome never depends on the copy, yet at 0.95 its bar says 6.9. The bar describes the model, which uses the copy, and not the world, where the copy does nothing.

## Why this prediction?
*Does the credit for one prediction get shared too?*

The chart **Why this prediction? (Shapley values)** explains one case. It starts from the average prediction and adds each feature's push until it reaches this case's prediction. The lab opens on case 2, a Group A row that is truly positive, and the model gives it 34.5%, against 53.8% for the average case. At 0.50 it predicts negative, which is wrong.

At correlation 0.20 the signal pushes by -7.7 points, the other signal by -11.7, and the copy and noise by 0.0. Then 53.8 - 7.7 - 11.7 is 34.4, which matches 34.5 up to rounding.

[[figure:audit-lab/one-case|The Shapley values of case 2 at correlation 0.20 and 0.95. At 0.95 the push of the signal is split between the signal and its copy.]]

At 0.95 the same case gets 31.2%. The signal pushes -5.3 and the copy -5.6, together -10.9, and the other signal is nearly unchanged at -12.1. The model is the same kind, but the credit is shared again.

## Real penguins
*Does the audit tell the same story on real data?*

Press **Reset**, then set **Data** to **Penguins (real)**. The lab keeps 333 of the 344 penguins (11 have a missing value) and asks whether a penguin is heavier than the median body mass, 4050 g. Body mass is not a feature. With **Compare groups by** set to **Sex**, 168 penguins train and 165 are audited: 82 female and 83 male.

Overall accuracy is 86.1%, but the female accuracy is 97.6% and the male 74.7%. Recall is 100.0% for females and 62.7% for males. The positive rates are 37.8% and 41.0%, a gap of only 3.2, so the positive rates look fine while males are missed far more often.

## A fresh split
*Does the gap survive a new split of the same penguins?*

Press **New sample** to make a new split of the same penguins. On three more splits the male recall is 72.5%, 60.8% and 64.7%, and the female recall 100.0%, 96.6% and 100.0%. The gap is large each time. The positive rate gap is 3.2 on the first split and 14.0, 3.2 and 4.3 on the next three, so one split can look better or worse than the rest.

::: deeper Why the males
The lab shows where the model fails, not why. One clue is body mass: male Adelie penguins average 4043 g and 44% of them are above the 4050 g cut, while female Adelie average 3369 g and none are. A cut that falls in the middle of a group is hard to hit from size measurements alone, and the model cannot see sex. Treat it as a lead to check, as in the first lesson.
:::

::: remember
- One accuracy number can hide different errors: read each group's table, with its row count, and compare accuracy, positive rate, recall and false-positive rate.
- A threshold for each group can close one gap, but it usually opens another or costs accuracy, because the base rates differ.
- Correlated features share permutation importance and Shapley credit: each bar looks smaller while the pair keeps its worth, and the bars describe the model, not the world.
:::

@@lab

## Lab: audit a fitted model
You audit one logistic regression on its held-out rows. You change thresholds, a correlation between two features and the case you explain, and you read how errors, importance and one explanation respond. The generated numbers below are for **Reset**; the penguin numbers are for **Reset**, then **Data** set to **Penguins (real)**.

### Controls
- **Data** switches between **Generated data** and **Penguins (real)**. Switching refits the model and resets the thresholds.
- **Compare groups by** (penguins only) picks **Sex** or **Species** as the groups.
- **A different threshold for each group** turns on one threshold for each group. **Threshold** (0.01 to 0.99, starts at 0.50) is the shared one and is hidden while it is on. Then there is a slider for each group, **Threshold for Group A**, **Threshold for Group B** (**Threshold for Female**, **Threshold for Male** on the penguins).
- **Match positive rates** and **Match recall**, under **Match the other groups to the first**, move every other group's threshold until its positive rate, or its recall, equals the first group's (the first column of the table). They turn on the per-group thresholds and start from the first group's current threshold. A note below them says the same.
- **New sample** draws a new generated sample, or a new split of the penguins. It sets every threshold back to 0.50 and turns the per-group switch off.
- **Correlation between the two features** (0 to 0.99, starts at 0.20) sets how closely the second feature copies the first and refits the model. It stays when you switch data or press **New sample**; **Reset** returns it to 0.20.
- **Case number**, **Random case** and **Next wrong prediction** choose the case that **Why this prediction? (Shapley values)** explains. **Random case** is unseeded, so it has no fixed numbers.
- **Fullscreen** enlarges the lab. **Reset** returns to generated data, the first sample, one threshold of 0.50, correlation 0.20 and case 2.
- **Quick Quiz** is the button under the settings card (a round button at the bottom right on a phone). It holds one question: "If you raise the correlation between the two features, what happens to each importance bar?" Pick an answer, raise the correlation to 0.70 or more and press **Check answer**; the verdict compares with correlation 0.20.

### Reading the screen
- The top chart shows each group's score curve, with **Predicted probability of positive** along the bottom and **Share of the group** up the side. Dashed lines are the thresholds, and rows to the right of a line are predicted positive. The status line reads, for example, "Overall accuracy 78.8%. Largest gap: positive rate, 26.7 pts (Group A 64.2%, Group B 37.5%)." The detail line gives the audited rows per group, and the right of the status box says "601 training rows, 599 audited".
- **Errors by group** has the columns **Metric**, one per group, and **Gap**, and the rows **Rows**, **Base rate (actually positive)**, **Accuracy**, **Precision**, **Recall**, **False-positive rate** and **Positive rate (predicted positive)**. A shaded gap is 5 points or more, a triangle marks 10 or more, and n/a means nothing to divide. With **Species**, Gentoo have a base rate of 100.0%, so their false-positive rate is n/a.
- **The trade-off: one threshold or your thresholds** has the columns **Measure**, **One threshold, 0.50**, **Your threshold** (or **Your thresholds**) and **Change**, and the rows **Accuracy**, **Positive rate gap**, **Recall gap** and **False-positive rate gap**. After a Match button the detail line adds the values reached, for example "Positive rate now: Group A 64.2%, Group B 64.4%."
- **Permutation importance** has one bar for each of **signal**, **signal copy**, **other signal** and **noise** (**flipper length**, **flipper copy**, **bill length**, **bill depth** on the penguins), and **Both together**, with an error bar of one standard deviation over 20 shuffles. The axis is **Accuracy lost when shuffled**. The status line adds the two bars, the pair and the model accuracy.
- **Why this prediction? (Shapley values)** starts at **Average case**, adds one bar for each feature with its value, such as "signal = -0.20", and ends at **This case**. A dashed line marks the threshold. Its status line says whether the model was right and which feature pushed most.

### Experiments
Start each one with **Reset**, so that your numbers match.

1. Predict: both groups have the same accuracy. Will the other rows of **Errors by group** match too? Read the table. Accuracy is 78.8% in both groups, but the **Positive rate (predicted positive)** gap is 26.7 points, precision 17.5, recall 9.4 and the **False-positive rate** 11.4. Compare **Base rate (actually positive)**, 60.8% and 31.3%, and say how the base rates explain the positive rates.
2. Predict: can one shared threshold remove the positive rate gap without hurting accuracy? Slide **Threshold** from 0.20 to 0.90 and watch the **Positive rate (predicted positive)** gap and the status line: the gap stays between 5.9 and 28.8 points (the largest is at 0.60), and at the two ends, 5.9 at 0.90 and 10.8 at 0.20, accuracy is only 53.3% and 62.8%. Then press **Reset** and press **Match positive rates**. Group B's threshold goes to 0.36, the gap to 0.1, and the trade-off table shows accuracy 78.8% to 73.6%, the **False-positive rate gap** 11.4 to 22.2 and the **Recall gap** 9.4 to 2.6. Explain what the extra flagged rows of B are.
3. Predict: after **Match recall**, will the positive rates match as well? Press **Reset**, then **Match recall**. B's threshold is 0.42, recall is 85.4% and 86.0%, and the accuracy 76.5%, but the positive rate gap is still 11.7 points and the precision gap 29.7. Use the identity in the lesson to say why. Then press **Match positive rates** and compare the recall gap.
4. Predict: raise **Correlation between the two features** from 0.20 to 0.95. Which importance bars change? First pick an answer in the **Quick Quiz**. Then read the status line at 0.20 (signal 25.9%, signal copy 0.0%, both together 25.4%) and at 0.95 (14.5%, 6.9%, 25.8%). Try 0.99 as well: 10.9% and 9.0%. Is the signal copy a cause of the outcome? How do you know?
5. Predict: at correlation 0.95, how does the explanation of case 2 change? Press **Reset**, then read **Why this prediction? (Shapley values)**: signal -7.7, copy 0.0, other signal -11.7, This case 34.5%. Raise the correlation to 0.95: signal -5.3, copy -5.6, other signal -12.1, This case 31.2%. Press **Next wrong prediction** and see whether the credit is shared again on another case.
6. Predict: on the real penguins by sex, will equal positive rates mean equal recall? Press **Reset**, set **Data** to **Penguins (real)** and read the table: positive rates 37.8% and 41.0% (a gap of 3.2), recall 100.0% for **Female** and 62.7% for **Male**. Press **Match recall**: the threshold for Male goes to 0.10, recall to 98.0%, the false-positive rate of males to 87.5% and the overall accuracy to 81.2%. Press **Reset**, set **Data** to **Penguins (real)** again, then press **New sample** three times, reading the recall of both sexes each time (males 72.5%, 60.8%, 64.7%; females 100.0%, 96.6%, 100.0%). Does the recall gap hold on every split? Last, press **Reset**, set **Data** to **Penguins (real)** and the correlation to 0.90: flipper length falls from 28.6% to 14.9% and flipper copy rises from 0.3% to 5.1%, while both together go from 29.7% to 31.8%.
