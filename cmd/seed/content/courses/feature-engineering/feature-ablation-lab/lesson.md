---
slug: feature-ablation-lab
title: Feature ablation lab
kind: simulator
simulator: ablation-lab
minutes: 25
---
::: intro
- Add candidate features one at a time and judge each gain against the spread of the cross-validation fold scores.
- Explain why a gain on one split can vanish across folds, using a noise column that gains 4.2 points on one split.
- Use ablation to see what each feature earns once the others are in, and spot a target encoding that leaks the label.

Before you start: read "Interactions and transformations", "High-cardinality categories and target encoding" and "Cross-validation and stratification". The first two built the features you test here. The third taught the folds and their spread, which this lesson uses without teaching them again.
:::

## When a feature seems to help
*How do you know that a new feature really helped?*

You have now built several kinds of column: products, logs, ratios and target encodings. Each one raises the same question. The score is higher after you add it, by 1 point or by 4. Did the feature help, or did the number just wobble?

"Cross-validation and stratification" gave you the idea you need. A validation score moves with the rows you hold out, so a score has a spread. A gain is the difference of two scores, so a gain has a spread too.

This lesson runs the experiment in two directions. **Adding** starts from a baseline, the score of always guessing the majority class. It then adds features one at a time and scores the model after each. **Ablation** starts with all the features in and removes one at a time. The score a feature's removal costs is what that feature earns.

The lab does both on a logistic regression model, scored by accuracy. The generated table has 400 rows, nine candidate features and a 0/1 goal.

> Key idea: a feature has earned its place only if the score changes by more than the score's own wobble.

## One split is one draw
*Why can a feature gain on one split and gain nothing on another?*

Take two features of the generated table: x1, which carries real information, and z1, a column of random numbers drawn without looking at the goal. Hold out 120 of the 400 rows as a single test split and fit on the other 280. With x1 alone the model gets 84 of 120 right, 70.0%. Add z1 and it gets 89 right, 74.2%. A column of noise "gained" 5 rows, which is 4.2 points.

Now draw four other splits of the same 400 rows. The gain of z1 over x1 alone is +1.7, +0.8, -3.3 and -1.7 points, against +4.2 on the first. The rows, the features and the model never changed. Only the choice of the 120 test rows did. One test row is 1 / 120, which is 0.83 points, so every one of these gains is a handful of rows.

Cross-validation tests all 400 rows, each once. There z1's gain is +2.0 points, which is 8 rows out of 400.

[[figure:feature-ablation-lab/five-splits|The gain from adding the noise column z1 on five different single splits (dots), and its gain in 5-fold cross-validation with the spread of the folds (shaded band).]]

> Watch out: a gain measured on one split is one draw from a spread you cannot see. Cross-validation shows you the spread.

## A gain must beat the spread
*How large must a gain be before you believe it?*

Take the five folds of 80 rows each. With x1 alone the folds get 54, 58, 55, 55 and 58 right. The mean is 70.0% and the spread (the standard deviation, dividing by n - 1) is 2.3 points. With z1 added the folds get 57, 61, 55, 56 and 59 right: a mean of 72.0% and a spread of 3.0.

The gain is 2.0 points and the spread is 3.0, so the gain is inside the noise. The lab uses this rule of thumb: a feature **holds across folds** only if the cross-validated gain is bigger than the spread of the folds. Compare the first step. The baseline of guessing the majority scores 53.3% ± 5.5, and x1 lifts it to 70.0% ± 2.3, a gain of 16.8 points (16.8 before rounding), far beyond any spread.

The lab gives each step one of four verdicts: Holds across folds, Single split only (the folds do not confirm it, but the single split gained a point or more), No real change, or Worse.

[[figure:feature-ablation-lab/forward-steps|The nine features added in order on the generated data. Each step shows the cross-validated mean with its spread, the single split (diamond) and the lab's verdict.]]

::: deeper Why not count the folds one by one?
You may notice that z1 did not lose in any fold: it won by 3 and 3 rows, tied in one fold, and won by 1 and 1. Four small wins and no loss look convincing. But the five training parts share three quarters of their rows, so the five differences are not independent draws. The spread rule is the cautious reading. For a close call, repeat the cross-validation with a different shuffle, as the lab's New sample button allows, instead of trusting the five folds alone. On four fresh samples of the generated table, z1's gain was 0.0, 0.0, +0.5 and 0.0 points.
:::

## Features that work only together
*Why can two features look useless alone and still be worth adding?*

Keep adding in the lab's order: x2, u, v, then u × v. The feature x2 is a real signal, weaker than x1. The features u and v are two independent numbers that matter only together: the goal leans one way when u and v have the same sign and the other way when the signs differ. A straight line cannot see that from u or from v alone. It is the interaction idea from "Interactions and transformations".

The cross-validated scores go 70.0% (x1), 72.0% (z1), then 71.0% for x2, 72.0% for u, and 73.0% for v. Each change is at most 1.0 point in size, against a spread of 6.3 to 7.4 points. Then u × v arrives: 79.3% ± 5.2, a gain of 6.3 points. The single split agrees, with +5.8, and the verdict is Holds across folds, although only by a small margin.

The same table holds a warning. The gain of x2 is -1.0 points. But x2 does carry real information, and with 400 rows the lab cannot confirm it. Inside the noise means not shown. It does not mean not there.

> Watch out: adding in a fixed order gives each feature the credit for what the earlier ones left. u and v look like nothing until their product arrives.

## Ablation: take one away
*What does a feature earn once all the others are in?*

Tick the first eight features, everything except the category region. The model scores 78.8% ± 4.8. Now remove one feature at a time and score again.

| Feature removed | Score without it | Drop (points) | Verdict |
| --- | --- | --- | --- |
| x1 | 69.3% | 9.5 | Earns its place |
| u × v | 72.5% | 6.3 | Earns its place |
| x2 | 75.3% | 3.5 | Within the noise |
| z1, z2, z3, u and v | 78.8% to 79.8% | -1.0 to 0.0 | Within the noise |

A drop bigger than the spread earns its place. Only x1 and u × v pass. The noise columns cost nothing, so they can go. So can u and v, because the product already carries what they carry together. Keep only x1, x2 and u × v and the score is 78.3% ± 3.3, about the same with three columns and a smaller spread.

Ablation also has a blind spot. If two features carry the same information, removing either one costs little, because the other covers for it. A feature that is strong when added early can look worthless in ablation. On the penguins, Flipper length gains 18.3 points when it is added, yet removing it from the full model of nine costs only 0.3.

[[figure:feature-ablation-lab/ablation-drops|The score each of the eight features costs when removed from the full model. Only the two drops beyond the shaded spread earn their place.]]

## A gain built from the label
*Why can a gain that holds across every fold still be fake?*

Tick the ninth feature, region: a text column with 175 different values in 400 rows, about two rows per value. It has a weak real effect. From "High-cardinality categories and target encoding" you know how to turn it into one number, and you know the two ways to do it. The lab's **Out-of-fold (honest)** way rebuilds the encoding inside each cross-validation round, from the training folds only. The **Naive (leakage)** way builds it once from all 400 labels, before any fold is cut.

The honest encoding gives 79.8% ± 5.0, a gain of +1.0 over the eight features, inside the noise. The naive one gives 87.3% ± 1.6, a gain of 8.5 points, and the lab's verdict says Holds across folds. Leaving region out scores 78.8% ± 4.8. The naive score is 7.5 points above the honest one, and its spread is small, so it looks more certain too. Those points are each row's own label, copied into its own feature.

Cross-validation protects you only from what happens inside the folds. A step that reads labels outside them hands every held-out row its own answer. A big gain from a weak, many-valued column is a reason to check.

[[figure:feature-ablation-lab/leak|The cross-validated score of the eight features plus region: region left out, encoded out of fold, and encoded naively. Bars show one standard deviation.]]

## A routine for new features
*How do you use all this on a real table?*

Here is a short routine.

1. Score the baseline: the majority guess, or your current model.
2. Add one feature, or one sensible group such as u, v and u × v, and record the cross-validated mean and its spread.
3. Keep it only if the gain beats the spread. If it is close, repeat the cross-validation with a different shuffle.
4. At the end, remove each feature in turn and drop the ones that cost nothing.
5. Keep a final test set untouched. Picking among many features by cross-validation score is itself a selection, so that score is a little optimistic.

Try it on the real penguins: 333 complete penguins, with the goal of telling males from females. In the first shuffle, Bill depth (+14.4), Flipper length (+18.3) and Body mass (+7.2) hold across folds. Year and Bill ratio change nothing (0.0). Over ten fold shuffles, Bill depth and Flipper length hold in all ten, Body mass in nine, Island in three and the category in one. The close calls flip. The strong features do not.

::: remember
- A gain counts only when it is bigger than the spread across folds. A gain on one split can be a few lucky rows.
- Add features one at a time, then ablate: removing a feature shows what it earns now that the others are in. Features that work together may look useless alone.
- Anything built from the label must be rebuilt inside each fold. A naive target encoding can pass cross-validation and still be a leak.
:::

@@lab

## Lab: adding features and ablation
The lab is headed "Adding features: do the gains survive cross-validation?". You start with the 400-row generated table and its first two features, x1 and z1, ticked. You add features one at a time and watch two scores for the same model: the 5-fold cross-validated accuracy and the accuracy on one fixed split. Two tables and one chart under the main chart show what removing a feature costs and what the category feature does under two encodings.

### Controls
- **Data** switches between **Generated data** and **Penguins (real)**. The real data asks whether a penguin is male. Switching data ticks only the first two features and clears the Quick Quizzes.
- **Add the next feature** (group **Features**) ticks the first unticked feature in the list. The line above the list reads "Next feature: x2".
- **Remove all features** unticks everything.
- **New sample** (group **Data and splits**) draws a new generated table. With the real data it keeps the same penguins and reshuffles the five folds.
- **Another single split** picks a different 30% of the rows (120 of 400) as the test rows of the single split. The folds do not change.
- **Candidate features** is the checklist. Tick or untick any feature, in any order; a number such as #1 shows the order added. The generated features are x1, z1, x2, u, v, u × v, z2, z3 and region (category). The penguin features are **Bill depth (mm)**, **Island (share of penguins on it)**, **Flipper length (mm)**, **Year**, **Bill length (mm)**, **Bill ratio (length ÷ depth)**, **Flipper length squared**, **Body mass (g)** and **Bill length as a category**.
- **Target encoding of the category feature** chooses **Out-of-fold (honest)** or **Naive (leakage)**. It changes the scores only while the category feature is ticked.
- **Show what each feature really is** writes a short note under each feature, for example "(pure noise)". It starts off: guess first.
- **Fullscreen** enlarges the lab. **Reset** returns to the generated data with x1 and z1 ticked, the first sample and split, **Out-of-fold (honest)**, and the toggle off.
- **Quick Quiz** is the button under the settings card (a round button at the bottom right on a phone). It holds two quizzes: "Will adding this feature improve the cross-validated score?" with the choices "Yes, by more than the spread across folds", "No, about the same: any change is within the noise" and "No, it gets worse", and the line "This feature: x2" names the next one; and "Naive target encoding counts each row's own label in its own feature. What does that do to the cross-validated score of the category feature?". Pick an answer first. Then press **Add the next feature** for the first, or change **Target encoding of the category feature** for the second, and the box answers with numbers.

### Reading the screen
- The main chart plots **Accuracy** after each step, from "none" to the last feature added. The big dot is the **Cross-validated mean**, with faint dots for each fold and a bar of ± 1 standard deviation. The diamond is the **Single fixed split**. The dashed line is **Guessing the majority class**. With no feature ticked it says "Tick a feature, or press "Add the next feature"."
- The status line reads, at the start, "2 features: cross-validated 72.0% ± 3.0 points over 5 folds, single split 74.2%." The detail line says how many rows the single split fits and tests. At the right: "400 rows, 5 folds".
- The table **Score after each added feature** has the columns **#**, **Feature added**, **Cross-validated**, **Gain**, **Single split**, **Gain** and **Verdict**. The first row is "none (guess the majority)". Gains are in percentage points, computed before the scores are rounded, so they can differ by 0.1 from a subtraction of the printed scores. Verdicts: **Holds across folds**, **Single split only**, **No real change** and **Worse**. With the real data the "none" row is below 50%, and a note under the table explains why.
- The table **Remove one feature at a time** has the columns **Feature removed**, **Score without it**, **Drop (points)** and **Verdict**. Its first row is "All 2 ticked features", and the verdicts are **Earns its place**, **Within the noise** and **Hurts: without it is better**. A drop smaller than the spread across folds is within the noise.
- The chart **The category feature: out-of-fold or naive encoding** has three bars: **Left out**, **Out-of-fold** and **Naive (leaks)**, with the axis **Cross-validated accuracy**. It uses your ticked features plus the category, and a line under it reads, for example, "With region (category): naive 84.0%, out-of-fold 72.2%, left out 72.0%."

### Experiments
Press **Reset** before each experiment so that your numbers match the ones below.

1. **A noise column on one split.** Predict: will x1 and then z1 improve the cross-validated score? Press **Remove all features**. In the first Quick Quiz, answer for the next feature, x1, then press **Add the next feature**. The cross-validated score rises from 53.3% ± 5.5 to 70.0% ± 2.3 (+16.8, Holds across folds). Now predict for z1 and press the button again. The cross-validated score moves to 72.0% ± 3.0 (+2.0) while the single split goes from 70.0% to 74.2% (+4.2), and the verdict reads Single split only. Turn on **Show what each feature really is**. Why does the diamond gain twice what the folds do?
2. **Another single split.** Predict: if you draw a different single split, will the diamond for z1 keep its gain? With x1 and z1 ticked, press **Another single split** four times and read the Gain next to **Single split** in the z1 row each time. It goes +1.7, +0.8, -3.3 and -1.7, while the cross-validated numbers do not move. Then press **Reset** and **New sample** four times: the cross-validated gain of z1 is 0.0, 0.0, +0.5 and 0.0, never above the spread. What does this say about reading one split?
3. **Two features that work together.** Predict: u and v are two independent numbers. Will adding them help? Press **Reset**, then press **Add the next feature** four times, answering the Quick Quiz first each time. The steps are x2 (71.0% ± 6.9, -1.0), u (72.0% ± 7.4, +1.0), v (73.0% ± 6.3, +1.0, with Single split only because the diamond gained 2.5) and u × v (79.3% ± 5.2, +6.3, Holds across folds). Turn on **Show what each feature really is**. Why did the product help when its parts did not?
4. **Ablation.** Predict: which rows will say Earns its place? Press **Reset**, then press **Add the next feature** six times so that z2 and z3 join. The model scores 78.8% ± 4.8. Read **Remove one feature at a time**: only x1 (+9.5) and u × v (+6.3) earn their place, x2 is +3.5 and Within the noise, and the others sit between -1.0 and 0.0. Untick z1, u, v, z2 and z3 by hand. The three remaining features, x1, x2 and u × v, score 78.3% ± 3.3. Why is a real feature, x2, still Within the noise?
5. **A leaking encoding.** Predict: in the second Quick Quiz, pick what naive encoding does to the category's score. Press **Add the next feature** until region (category) is ticked: out-of-fold it scores 79.8% ± 5.0 (+1.0, No real change). Now set **Target encoding of the category feature** to **Naive (leakage)**. The score becomes 87.3% ± 1.6 (+8.5, Holds across folds), and the chart shows **Left out** 78.8%, **Out-of-fold** 79.8% and **Naive (leaks)** 87.3%, with a line saying naive is 7.5 points higher. In **Remove one feature at a time**, region now earns 8.5 points and x1 only 2.0. Which of those drops would you trust?
6. **Penguins, a fresh split and a fresh sample.** Predict: which penguin features will survive cross-validation? Press **Reset**, set **Data** to **Penguins (real)**, press **Remove all features**, then press **Add the next feature** nine times. The first row, "none", scores 46.0% ± 2.5. Bill depth (+14.4), Flipper length (+18.3) and Body mass (+7.2) hold across folds. Year and Bill ratio add 0.0, and Island (+3.0 against a spread of 4.6) is Single split only. In **Remove one feature at a time**, all nine score 89.5% ± 2.6 and only Body mass earns its place (6.9 points). Next press **Another single split** twice: for **Bill length as a category** the single-split gain goes from +5.0 to 0.0 and 0.0 while its cross-validated gain stays +1.8. Then press **New sample** once: Island becomes +2.4 against a spread of 1.5, Bill length as a category becomes +3.0 against 3.0 (Holds across folds by a hair, because the numbers are rounded), and Body mass drops to Single split only (+5.1 against 5.5). Which features would you keep, and which verdicts did you not trust?
