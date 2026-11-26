---
slug: nested-cross-validation
title: Nested cross-validation
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Explain why the best score of a search, measured on the folds that chose it, is too high, and by how much in 200 simulated pools of penguins.
- Run nested cross-validation by hand: the inner loop picks k, and the outer loop scores that pick on penguins that played no part in the choice.
- Compare two models on the same folds, put a bootstrap interval on the difference, and say when a single held-out test set is enough.

Before you start: read "Tuning with search" and "Cross-validation and stratification" in Validation and hyperparameter tuning, and "Sampling variability and the bootstrap" in Probability and statistical uncertainty. They gave you the search, the folds and the bootstrap. This lesson puts the three together.
:::

## The score you tuned on
*How much too high is the best score of a search?*

"Tuning with search" warned that a search keeps the highest score, so it tends to keep the luckiest one. Here is how big that effect is.

Take the 333 penguins with all four measurements and a recorded sex, and draw 100 of them at random as a **pool**. The model is k-NN on the four scaled measurements, and it guesses the sex. A search tries several values of k, scores each by 5-fold cross-validation on the pool, and reports the best. Repeat on 200 pools, and score each winner honestly too: refit it on the pool and test it on the 233 penguins that were not drawn.

[[figure:nested-cross-validation/optimism|Mean score over 200 pools as the search tries more values of k. The best cross-validation score climbs while the true accuracy stays level.]]

With one value of k there is nothing to choose, so the report is honest: 89.1% reported, 89.2% true. With 30 values (k = 1 to 30) the best score averages 91.3%, yet the winner is right on 88.7% of the unseen penguins. About 2.5 points were luck.

> Key idea: the more settings a search tries, the more its best score is flattered, because the same folds choose and grade the winner.

## Two loops
*How does nesting keep the chooser apart from the grader?*

**Nested cross-validation** puts one cross-validation inside another. The **outer loop** cuts the pool into folds and holds one out as the outer test fold. On the remaining rows, the **inner loop** runs the whole search from scratch with its own cross-validation and picks a setting. That setting is refitted on all the outer training rows and scored once on the outer test fold, which the search never saw. Do this for every outer fold, then add up the scores.

[[figure:nested-cross-validation/nested-layout|One outer round of nested cross-validation on 100 penguins. The inner loop works only on the 80 training penguins, and fold 1 is scored once, at the end.]]

The result is the score of a **recipe**: "fit k-NN and let a 4-fold search choose k". It is not the score of one k. Different outer rounds may pick different values, and that is fine, because the recipe is what you report.

> Key idea: the inner loop chooses and the outer loop grades. A penguin graded in an outer round took no part in the choice being graded.

## A fold table by hand
*Can you run both loops with a pencil?*

Use one pool of 100 penguins, 54 male and 46 female, and let the search choose k from 1, 5 and 15. The outer loop has 5 folds of 20 penguins. In each outer round the 80 training penguins are cut again into 4 inner folds of 20. An inner score counts right answers out of 80, since each of the 80 is validated once. Ties go to the smaller k.

| Outer round | Inner k = 1 | Inner k = 5 | Inner k = 15 | Pick | Outer fold right |
| --- | --- | --- | --- | --- | --- |
| 1 | 71 | 67 | 63 | k = 1 | 19 of 20 |
| 2 | 71 | 73 | 69 | k = 5 | 17 of 20 |
| 3 | 74 | 76 | 69 | k = 5 | 17 of 20 |
| 4 | 68 | 72 | 69 | k = 5 | 18 of 20 |
| 5 | 68 | 71 | 60 | k = 5 | 18 of 20 |

> Worked example: in round 1 the inner loop scores k = 1, 5 and 15 at 71, 67 and 63, so k = 1 wins and is refitted on the 80 training penguins. It is then scored on fold 1, which it never saw: 19 of 20. The five outer scores add up to 19 + 17 + 17 + 18 + 18 = 89, so the nested score is 89 of 100, or 89%.

## Nested against plain
*How far apart are the two numbers?*

Now run the plain search on the same five outer folds, where every fold both chooses and grades. Its totals for k = 1, 5 and 15 are 92, 89 and 92 out of 100. The best is 92, and a tie goes to k = 1. The plain search reports 92%, the nested score is 89%, and 3 points separate them.

That is one pool. Over the 200 pools, the plain best score sat above the nested score by 2.0 points on average with three values of k, and by 2.7 with 30. This is not the 2.5 from the first section, which compared the best score with the true accuracy; here the comparison is with the nested score, which runs a touch lower than the truth. The nested score stayed close to the truth: 88.5% against 88.7% with 30 values.

> Watch out: the inner loop chose k = 5 in four of five rounds, while the plain search favored k = 1. The nested score belongs to neither one. It belongs to the whole recipe, search included.

## Comparing two models fairly
*Why compare fold by fold and not two means?*

Add a second recipe: a decision tree whose maximum depth, from 1 to 4, is chosen the same way, inside the same five outer folds. Each outer fold now gives one score per recipe, on the same 20 penguins.

| Outer fold | k-NN right | Tree right | Difference |
| --- | --- | --- | --- |
| 1 | 19 | 18 | +1 |
| 2 | 17 | 15 | +2 |
| 3 | 17 | 15 | +2 |
| 4 | 18 | 16 | +2 |
| 5 | 18 | 17 | +1 |
| Total | 89 | 81 | +8 |

As percentages, k-NN scored 95, 85, 85, 90 and 90: mean 89, spread 4.2 points. The tree scored 90, 75, 75, 80 and 85: mean 81, spread 6.5. The ranges overlap, so two means with their spreads look unclear.

Pair the scores instead. k-NN was ahead in every fold, by 5, 10, 10, 10 and 5 points: mean 8, spread 2.7. A fold of hard penguins is hard for both recipes, so subtracting inside the fold cancels it.

[[figure:nested-cross-validation/paired-folds|The two recipes in each outer fold of 20, and their difference. Diamonds are the tree and circles are k-NN.]]

> Watch out: the five differences are not five independent tests. Any two outer training parts share 60 of their 80 penguins, so do not turn five numbers into an interval with a formula.

## A bootstrap interval for the difference
*How large could the real gap be?*

Nesting predicts each penguin once, with a setting chosen without it, so each of the 100 penguins has one outcome per recipe. A table of four counts sorts them.

| | Tree right | Tree wrong |
| --- | --- | --- |
| k-NN right | 79 | 10 |
| k-NN wrong | 2 | 9 |

The 88 penguins on which the recipes agree, 79 + 9, tell them apart not at all. Score the rest: +1 for the 10 that only k-NN got right, -1 for the 2 that only the tree got right, and 0 for the 88. The mean is (10 - 2) / 100 = 0.08, or 8 points.

Now bootstrap those 100 numbers as in "Sampling variability and the bootstrap": draw 100 with replacement, take the mean, repeat 2,000 times, and read the 2.5th and 97.5th percentiles. The interval is +1 to +15 points.

[[figure:nested-cross-validation/bootstrap-difference|Bootstrap distribution of the mean difference between k-NN and the tree. Zero lies outside the middle 95%.]]

Zero is outside, so this pool favors k-NN, though a gap of +1 fits too. The pool is a kind one. Over 200 pools, k-NN scored higher in 164, the tree in 29, and 7 tied. The interval lay wholly above zero in 56 pools, wholly below in 1, and held zero in 143.

> Watch out: this interval resamples the outcomes of one pool. It does not retrain the recipes on new penguins, so the full uncertainty is wider.

## What nesting costs
*When is one held-out test set enough?*

Count the fits. With 5 outer folds, 4 inner folds and G settings, each outer round fits 4 x G models in its inner loop plus one refit, so nesting costs 5 x (4 x G + 1) fits. For G = 3 that is 65 fits, against 5 x 3 = 15 for the plain search. For G = 30 it is 605 against 150. A k-NN fit takes a blink. If a model takes an hour to fit, 605 fits is about 25 days.

The alternative is a locked test set: tune on the rest, then score the test set once. Its wobble is the standard error of an accuracy, as in "Sampling variability and the bootstrap".

| Test rows | Standard error near 89% |
| --- | --- |
| 100 | 3.1 points |
| 400 | 1.6 points |
| 1,600 | 0.8 points |
| 10,000 | 0.3 points |

> Key idea: nesting is a tool for small data and cheap fits. With thousands of test rows and slow fits, tune on a validation split and use a locked test set once.

## Before the lab
*What does a clean score still not tell you?*

Nested cross-validation removes the flattery of tuning. It does not change where the rows come from. If one person has many rows, or time matters, cut grouped or temporal folds in both loops, as in "Grouped and temporal splits".

Every fold is also cut from the same pool, so the nested score answers "how will this recipe do on more data like these penguins?" It cannot say how the recipe will do on penguins from another island or decade. That is shift. The next lesson, "Covariate and concept shift", names the ways data can move. The course ends with the Shift lab, where you introduce one type of shift at a time and measure which validation setups anticipated the drop.

Before you open it, guess: when the data moves, would a nested score have warned you?

::: deeper Why the nested score is a little low
An inner loop trains on 60 penguins, an outer round on 80, and the model you keep on 100. A model with fewer rows is slightly weaker, so the nested score runs a little low. A mild pessimism is the safer error.
:::

::: deeper Checking the interval by hand
The squares of the differences are 1 for the 12 penguins that disagree and 0 for the rest, so their mean is 12 / 100 = 0.12. The variance is 0.12 - 0.08 x 0.08 = 0.1136, and the standard error is the square root of 0.1136 / 100, which is 3.4 points. Then 8 plus or minus 1.96 x 3.4 gives about 1.4 to 14.6, close to the bootstrap's +1 to +15.
:::

::: deeper The fold seed moves the score
On the same pool, six other outer cuts (fold seeds 1 to 6) gave nested scores of 91, 89, 90, 91, 86 and 87 out of 100, against 89 for the cut above. The plain search's best score was higher than the nested score in five of the six cuts and equal in one. Like the seeds in "Tuning with search", the cut belongs in the record of the run.
:::

::: remember
- The best score of a search is flattered when the same folds choose and grade. The more settings it tries, the larger the flattery.
- Nested cross-validation lets the inner loop choose and the outer loop grade, so its score belongs to the whole recipe.
- Compare recipes on the same folds, bootstrap the per-penguin differences, and keep a locked test set when data is plentiful and fits are slow.
:::
