---
slug: cross-validation-and-stratification
title: Cross-validation and stratification
kind: reading
simulator: ""
minutes: 20
---
::: intro
- Explain why the score from one validation split is noisy, using 20 hold-outs of the same model.
- Run 5-fold cross-validation by hand, and report the mean and the spread of the fold scores.
- Use stratified folds for imbalanced classes, repeat the cross-validation, and keep a final test set untouched.

Before you start: read "Train, validation and test", "Tuning k" and "Class imbalance". The first two introduced the validation set and the folds. This lesson asks how far a fold score can be trusted.
:::

## One split is a noisy judge
*Why can't a single validation split settle how good a model is?*

A validation score is a measurement, and a measurement on 50 rows wobbles. Here is the setting for the whole lesson. Take the 333 penguins that have all four size measurements and a recorded sex. Shuffle them and put 83 aside as a **test set**; the last sections come back to it. The other 250 penguins are the **pool**.

The model guesses a penguin's sex from bill length, bill depth, flipper length and body mass, by a vote of its 5 nearest neighbors, the k-NN of Level 1. Each size is scaled with the mean and spread of the training part only.

Hold out 50 penguins of the pool, train on the other 200, and count the right answers. Do it again with a different shuffle, 20 times in all. The model and the penguins stay the same, yet the count runs from 40 to 49 right out of 50, which is 80% to 98%.

[[figure:cross-validation-and-stratification/split-noise|Twenty hold-outs of 50 penguins from the same pool, scored with the same model. Only the shuffle changed.]]

> Key idea: a validation score depends on the model and also on which rows happened to be held out. With 50 rows, one penguin moves the score by 2 points.

## k-fold cross-validation
*How can every penguin take a turn as a validation row?*

Instead of one hold-out, use all of them. Shuffle the pool and cut it into 5 **folds** of 50 penguins. In round 1, fold 1 is the validation set and the model trains on folds 2 to 5. In round 2, fold 2 is the validation set, and so on. "Tuning k" showed this on 80 points; here are the five rounds on the pool.

| Round | Validate on | Train on | Right | Score |
| --- | --- | --- | --- | --- |
| 1 | fold 1 | folds 2 to 5 (200 penguins) | 42 of 50 | 84% |
| 2 | fold 2 | folds 1, 3, 4, 5 (200 penguins) | 43 of 50 | 86% |
| 3 | fold 3 | folds 1, 2, 4, 5 (200 penguins) | 48 of 50 | 96% |
| 4 | fold 4 | folds 1, 2, 3, 5 (200 penguins) | 43 of 50 | 86% |
| 5 | fold 5 | folds 1 to 4 (200 penguins) | 44 of 50 | 88% |

[[figure:cross-validation-and-stratification/fold-grid|The five rounds of 5-fold cross-validation on the 250 pool penguins, with the score of each round.]]

Every penguin is scored exactly once, by a model that never saw it. The five models exist only to measure. The model you keep is fitted once to all the training rows afterwards.

The right answers add up to 42 + 43 + 48 + 43 + 44 = 220 of 250, which is 88.0%. All folds have 50 rows, so the mean of the five scores is the same 88.0%. With unequal folds the two differ a little, and the mean of the fold scores is the usual report.

## The mean and the spread of the fold scores
*What does one cross-validation number hide?*

The five scores are 84, 86, 96, 86 and 88. Their mean is 88.0. Each score sits 4 below, 2 below, 8 above, 2 below and 0 away from it, so the squared gaps are 16, 4, 64, 4 and 0. They add to 88. Divide by 4 (five scores, minus 1) to get 22, and the square root is the **spread**, the standard deviation: 4.7 points. Report it as "88.0, SD 4.7".

That 4.7 says how much one fold of 50 penguins moves. It is not the error of the mean.

Now compare three models on the same folds.

| Neighbors | Fold scores | Mean | SD |
| --- | --- | --- | --- |
| 1 | 82, 80, 92, 84, 88 | 85.2 | 4.8 |
| 5 | 84, 86, 96, 86, 88 | 88.0 | 4.7 |
| 15 | 90, 84, 100, 94, 88 | 91.2 | 6.1 |

Subtract fold by fold. Five neighbors beat one neighbor by +2, +6, +4, +2 and 0, never worse. Fifteen beat five by +6, −2, +4, +8 and 0: three wins, one loss, one tie. The first gain is clear. The second is only a hint.

> Watch out: do not pick a winner from a gap that is smaller than the spread of the folds. Compare the models fold by fold, and see what repeating the run says.

::: deeper How uncertain is the mean?
A rough guide to the uncertainty of the mean of five scores is 4.7 / √5, about 2.1 points. It is probably a little too small, because any two training parts share 150 of their 200 penguins. It measures a different thing from the shuffle-to-shuffle SD of about 1.0 in the repeated cross-validation section below: this one is the noise of having these 250 penguins, that one is the noise of how they are shuffled.
:::

::: deeper Dividing by n or by n - 1
"Center and spread" in Level 1 divided the squared gaps by n. For five fold scores that gives 88 / 5 = 17.6 and an SD of 4.2. This lesson divides by n - 1 because the five scores are a small sample of all the folds you could have drawn, and it is the usual choice for fold scores. Both are fine if you say which one you used.
:::

## Stratified folds for imbalanced classes
*What if one class is rare, so a fold may miss it?*

"Baselines and splits" showed a stratified cut: split each class separately so every part keeps the same mix. The same idea applies to folds. A **stratified** fold deals each class out across the folds one class at a time, so every fold holds about the same share of every class.

The sex task is balanced, 125 and 125, so it hardly needs this. Take the species question instead: 342 penguins, 68 of them Chinstrap, which is 19.9%. In one plain shuffle into 5 folds the Chinstrap counts were 8, 16, 16, 15 and 13. A stratified shuffle gave 14, 14, 13, 13 and 14. Over 20 plain shuffles a fold held between 8 and 19 Chinstrap penguins. Stratified folds held 13 or 14 every time.

[[figure:cross-validation-and-stratification/stratified-folds|Chinstrap penguins in each of 5 held-out folds, from a plain shuffle and from a stratified one.]]

Chinstrap is a mild imbalance. Make it sharper: 200 rows with 10 positives, in 5 folds of 40. Stratified folds hold exactly 2 positives each. Plain folds can hold none: a given fold misses all 10 positives with probability (160 / 200) × (159 / 199) × … × (151 / 191), about 10% (a calculation, not a measurement). A fold without positives has recall 0 / 0, undefined, and its accuracy only measures the majority class.

> Key idea: stratify the folds whenever a class is rare, and then judge by recall or F1, not by accuracy alone, as in "Class imbalance".

::: deeper Stratifying a number
Stratification needs classes. For a regression target, a common trick is to cut the target into a few bins, for example quartiles, and stratify on the bin.
:::

## Repeated cross-validation
*Is the result an accident of one shuffle?*

The five folds above came from one shuffle. A different shuffle puts different penguins together and gives a different mean. For five neighbors, 20 shuffles gave means from 88.0% to 91.2%, an average of 89.76 and an SD of about 1.0. A single hold-out of 50 had an SD of about 4.4 points, so repeating and averaging steadied the estimate a lot.

**Repeated cross-validation** runs the whole k-fold again with new shuffles and averages all the scores. Three repeats of 5 folds is 15 scores; the three means were 88.0, 90.8 and 91.2, so 90.0. It also settles the earlier question: over 20 repeats, 15 neighbors averaged 91.34 against 89.76 for five, and were ahead in 16 repeats, tied in 2 and behind in 2.

[[figure:cross-validation-and-stratification/repeated-cv|Twenty repeats of 5-fold cross-validation for three models, with single hold-outs for comparison. Each dot is one shuffle.]]

The price is time: 20 repeats of 5 folds is 100 fits per model. Repeating also has a limit. It steadies the noise from the shuffle, not the noise from having these 250 penguins and no others.

## Keep a final test set untouched
*Where does the cross-validation score stop being honest?*

Choosing a model by cross-validation is a kind of training, as "Tuning k" said. The winner is the one that looked best, so its score is a little optimistic. Only rows that took no part in any choice can check it. That is why 83 penguins were put aside at the start.

| Step | Rows | What happens |
| --- | --- | --- |
| 1. Cut | 333 | Put 83 aside as the test set, before anything else. |
| 2. Choose | 250 pool | Compare 1, 5 and 15 neighbors with repeated 5-fold; keep 15. |
| 3. Refit | 250 pool | Train the chosen model once on the whole pool. |
| 4. Report | 83 test | Score it once: 74 of 83 right, 89.2%. |

The repeated cross-validation estimate was 91.3%, and the test score is 2.1 points lower. With 83 rows the test score itself has a spread of about √(0.892 × 0.108 / 83) = 3.4 points, so the two agree.

> Watch out: if you score 5 and 15 neighbors on the test set and keep the better one, the test set has become a validation set. Its score is no longer an honest report.

Do the scaling inside each round, with the training part only, as in "Pipelines and leakage". Otherwise the validation fold leaks into the training.

::: deeper How many folds?
5 and 10 are common choices. More folds mean bigger training parts, so the models look more like the final one, but also more fits. The extreme is leave-one-out: n folds with one row each, which is n fits and a very noisy score for every single row.
:::

## What comes next
*What does a random fold assume, and where do you try it?*

Every fold in this lesson was cut by shuffling. A shuffle assumes that each row is a separate draw, as each penguin is. When one person has many records, or rows come in time order, a shuffled fold can put close relatives of a test row into training, and the score looks better than it should. The next lesson, "Grouped and temporal splits", cuts the folds along those links.

Choosing settings by cross-validation is what "Tuning with search" automates, so the test-set habit above matters even more there. Then you will compare random and grouped splits on a dataset with several records per person in the Validation lab, the last lesson of this course. Bring three habits: look at the spread and not only the mean, stratify when a class is rare, and touch the test set once.

::: remember
- One validation split is a noisy judge: 20 hold-outs of the same model gave 80% to 98%. Cross-validation scores every row once, and reports the mean and the spread of the fold scores.
- Stratify folds when a class is rare, repeat the cross-validation to steady the shuffle, and do not choose a winner from a gap smaller than the spread.
- Choose with cross-validation on the pool, and score the final test set once.
:::
