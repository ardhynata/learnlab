---
slug: tuning-search
title: Tuning with search
kind: reading
simulator: ""
minutes: 22
---
::: intro
- Write down a search space, then run a grid search and a random search over it and count the fits each one costs.
- Explain why the best score in a search is flattered, and how a clean test set or nested cross-validation gives an honest one.
- Record the seeds and settings of a run so that someone else can repeat it and get the same winner.

Before you start: read "Cross-validation and stratification" and "Grouped and temporal splits" in this course, and "Depth and leaf size", where two tree settings were chosen by hand on a single split.
:::

## Settings and learned values
*What does a search choose, and what does the model learn?*

In "Tuning k" and "Depth and leaf size" you picked a setting by looking at validation scores. A **hyperparameter** is such a setting: you fix it before training. A **parameter** is a value that training itself finds.

| Model | Hyperparameters (you choose) | Parameters (training finds) |
| --- | --- | --- |
| k-NN | k | nothing: the model keeps the training rows |
| Decision tree | maximum depth, minimum leaf size | each split's feature and threshold, each leaf's label |
| Line fitted by gradient descent | learning rate, number of steps | slope and intercept |

**Tuning** means trying many settings, fitting a model for each, and keeping the one with the best validation score. The **search space** lists the values allowed for each hyperparameter, and one **configuration** is one choice of all of them.

This lesson tunes a tree that answers *is this penguin male or female?* It uses the 333 penguins of "Depth and leaf size", cut the same way (stratified, seed 4). The 66 test penguins stay locked away. The other 267 are the tuning data.

> Key idea: a search is a training loop one level up. Training fits parameters to the training rows, and a search fits hyperparameters to the validation scores.

## Grid search
*How many models does a grid search fit?*

The score of a configuration is its five-fold cross-validation accuracy on the 267 penguins: how many of them it answers correctly when each one is held out in turn. The search space is maximum depth 1 to 8 and minimum leaf size 1 to 20, so there are 8 x 20 = 160 configurations.

A **grid search** tries every combination of the listed values. Five-fold cross-validation fits 5 trees per configuration, so all 160 cost 160 x 5 = 800 fits. A coarse grid is cheaper: depth 2, 4 or 6 with leaf size 1, 10 or 20 is 3 x 3 = 9 configurations and 9 x 5 = 45 fits.

| Maximum depth | Leaf size 1 | Leaf size 10 | Leaf size 20 |
| --- | --- | --- | --- |
| 2 | 218 of 267 | 217 of 267 | 213 of 267 |
| 4 | 232 of 267 | 225 of 267 | 224 of 267 |
| 6 | 233 of 267 | 221 of 267 | 224 of 267 |

The winner is depth 6 with leaf size 1: 233 of 267, which is 87.3%. Depth 4 with leaf size 1 is one penguin behind. One penguin is 1 / 267, about 0.4 points.

> Watch out: a grid grows by multiplication. A third hyperparameter with 5 values turns 9 configurations into 45 and 45 fits into 225.

## What the whole space looks like
*Which setting matters, and how big is the noise?*

The figure shows all 160 configurations, which cost 800 fits.

[[figure:tuning-search/penguin-grid|Penguins right out of 267 for every depth and leaf size. Rings mark the nine grid configurations and the amber outline marks the best of all 160.]]

Depth is the setting that matters. Depth 1 gets 168 right, 62.9%, at every leaf size, because the best single question already puts at least 20 penguins on each side, so no leaf size from 1 to 20 changes it. Depth 2 gets about 218 and depth 3 about 220. From depth 4 up the scores run from 221 to 235: the surface is flat but bumpy, and leaf size moves the score by up to about a dozen penguins with no clear direction.

The best of all 160 is depth 7 and also depth 8 at leaf size 3, with 235 of 267, 88.0%. The nine-configuration grid reached 233, only 2 penguins lower, with 45 fits instead of 800.

How much is 2 penguins? The standard error of an 88% score on 267 penguins is about the square root of 0.88 x 0.12 / 267 = 0.020, which is 2 points or about 5 penguins. A gap of 2 is far inside the noise.

## Random search
*Why can random search beat a grid with the same budget?*

A **random search** draws a fixed number of configurations at random from the space, fits each one, and keeps the best. Nine draws cost the same 45 fits as the nine-point grid.

Suppose only one of two settings matters. A 3 x 3 grid still tries only 3 different values of that setting, each repeated 3 times. Nine random draws try up to 9 different values. The figure uses made-up scores to show it.

[[figure:tuning-search/grid-vs-random|A made-up score surface where only the first setting matters. The grid tries 3 values of it and the random search tries 9.]]

Here the grid's best is 0.83 and the random search's best is 0.91, but that is one draw. Over 10,000 simulated surfaces, with the peak anywhere from 0.1 to 0.9, nine random points beat nine grid points about 6 times in 10 (average best 0.86 against 0.83). Random search is not magic: it simply tries more values of what matters.

On the penguins, depth has only 8 values, so there is less to gain. In 2000 random searches of 9 draws, the median best score was 231 of 267 (86.5%), and one search in 10 reached 235. The grid's 233 was higher than the best of 68% of them. The nine draws covered 5.7 of the 8 depths on average.

::: deeper Ranges that span orders of magnitude
Some hyperparameters, such as a learning rate, are useful anywhere from 0.001 to 1. A grid might use 0.001, 0.01, 0.1 and 1, which are evenly spaced in powers of 10. A random search can do the same by drawing the exponent evenly between -3 and 0 and using 10 to that power. Then each power of 10 gets about a third of the draws. Drawing the learning rate itself evenly between 0.001 and 1 would put about 90% of the draws above 0.1.
:::

## The winner's score is flattered
*Why is the best score in a search too good?*

Every configuration's score is its true quality plus some luck. The search keeps the highest score, so it tends to keep the luckiest one. The more configurations you try, the more luck you can pick from.

An extreme case shows it. Take guessers that flip a coin for every example, so each has a true accuracy of 50%. Score them all on the same 50 examples. A single guesser has a 10.1% chance of getting at least 30 right, which is 60%. With 20 guessers the chance that at least one does is 1 - (1 - 0.101)^20, about 88%.

[[figure:tuning-search/best-of-many|The expected score of the best of many coin-flipping guessers on the same 50 examples. Each guesser's true accuracy is 50%.]]

The expected best score is 63.1% for 20 guessers and 67.6% for 100. Every one of those winners is a coin flip. A real search is milder, because real configurations differ in quality and are alike in many ways, but the direction is the same.

> Watch out: the test set is not exempt. If you choose among configurations by their test score, the test score is flattered too, and you have no clean data left. Look at the test set once, after the choice.

## A clean score from the test set
*How do you report an honest number?*

Lock the test set away first, tune with cross-validation on the rest, refit the winning configuration (train it again on all the tuning data), and score the test set once. Here the winner, depth 7 and leaf size 3, refitted on the 267 penguins gets 58 of 66 test penguins right, 87.9%. One test penguin is 1.5 points, so that is a rough check, not a measurement to two digits.

## Nested cross-validation
*How do you score the search itself?*

This suits small data, or the case where you want to score the whole **recipe**: the full procedure, search included. An outer loop holds out each fold in turn. On the remaining folds, the whole search runs with its own inner cross-validation. The configuration it picks is scored on the held-out outer fold, which the search never saw.

[[figure:tuning-search/nested|Nested cross-validation with the nine-configuration grid. Each outer round runs a full search on the other four folds, then scores its pick on the held-out fold.]]

The rounds pick different winners, and that is fine: the score belongs to the recipe, not to one configuration. The nested score is 228 of 267, 85.4%, against 233 of 267, 87.3%, for the same grid in a single level. The cost is 5 x 9 x 4 = 180 inner fits and 5 refits, against 45. With fold seed 2 the gap went the other way, 226 against 225, so the size of the flattery is small and noisy on 267 penguins. The method is what protects you.

## Record the run
*What do you write down so that someone else gets the same winner?*

Cross-validation shuffles the rows, so its folds depend on a **seed**. Run the same 160-configuration search with six fold seeds:

| Fold seed | Winner (depth, leaf) | Penguins right | Score |
| --- | --- | --- | --- |
| 1 | 7, 3 | 235 of 267 | 88.0% |
| 2 | 5, 13 | 231 of 267 | 86.5% |
| 3 | 5, 1 | 245 of 267 | 91.8% |
| 4 | 4, 17 | 231 of 267 | 86.5% |
| 5 | 5, 1 | 240 of 267 | 89.9% |
| 6 | 6, 2 | 236 of 267 | 88.4% |

The data and the search are the same. Only the shuffle changed, yet the winner moved and the best score ranged from 86.5% to 91.8%, a gap of 14 penguins, about 5 points. Without the seed, nobody can repeat your 88.0%.

Write down what a reader needs to rerun it:

```
data: penguins.csv, 333 rows with all measurements and sex
test cut: stratified by sex, seed 4 (66 rows kept aside)
cross-validation: 5-fold, stratified, fold seed 1
search: grid over depth 1-8, leaf 1-20 (160 configurations)
metric: accuracy; ties go to the first configuration
result: depth 7, leaf 3, 235 of 267
```

When the stakes are high, repeat the search under several seeds and report the spread, as in the table.

## Before the lab
*What does the last lesson of the course test?*

Every score in this lesson came from a split. A search chooses whatever that split rewards. If the split leaks, for example by putting one person's records on both sides, the search picks the configuration best at recognizing people.

The course ends with the Validation lab, where you compare a random split with a grouped split on records from several people. Before you open it, predict which split gives the higher score. Then ask what a tuning search would pick under the leaky one.

::: remember
- A hyperparameter is chosen before training and a parameter is learned. Grid search tries every combination and costs a product. Random search tries more different values of each setting for the same budget.
- The best score in a search is flattered. Keep a test set and look at it once, or use nested cross-validation to score the whole recipe.
- Record the seeds, the split, the search space, the metric and the result. The winner can change with the fold seed.
:::
