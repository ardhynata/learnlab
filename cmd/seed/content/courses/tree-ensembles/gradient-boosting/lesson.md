---
slug: gradient-boosting
title: Gradient boosting
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Build a boosted model by hand: two small trees on six real penguins, each fitted to the errors the model still makes.
- Explain the learning rate, and why fitting residuals is gradient descent applied to predictions.
- Choose the number of trees by watching validation error, and tell when bagging and when boosting is the better fix.

Before you start: read "Bagging and random forests" in this course, and "Depth and leaf size" and "Gradient descent". "Bias, variance and shrinkage" helps with the last section.
:::

## Fit the leftovers
*What does a boosted model do that one tree does not?*

"Bagging and random forests" grew many deep trees side by side, each on its own bootstrap sample, and averaged them. **Gradient boosting** goes the other way. It grows small trees one after another, and each new tree is fitted to the errors the earlier trees still make.

This lesson uses the simplest case, predicting a number with squared error. A **residual** is the actual value minus the current prediction, as in "Loss functions". The loop is:

1. Start every row at one prediction: the mean of the targets.
2. Compute each training row's residual.
3. Fit a small tree to those residuals, not to the targets.
4. Add the tree's output to each prediction after multiplying it by a small number, the **learning rate**.
5. Go back to step 2 until you have as many trees as you chose.

A new row gets the start value plus the learning rate times the output of every tree. One small tree is a weak model, but the sum of many is not.

> Key idea: every tree after the first is fitted to what the model so far gets wrong, not to the original target.

## A tree that predicts a number
*How can a tree answer with a number instead of a class?*

The trees in "Splits and impurity" ended in class labels and chose splits by impurity. A **regression tree** has the same shape, but a leaf holds a number: the **mean** of the target values that reach it. It picks the split with the lowest **squared error**, the sum of the squared gaps between each value and the mean of its side. Boosting keeps its trees small. A **stump** has one split and two leaves.

Here are six real penguins from the bundled table, with body mass in kilograms. (The real-data runs later in the lesson use grams, as the file does.) Every possible split of the flipper length sits between two neighbors, halfway.

| Flipper (mm) | 181 | 191 | 195 | 209 | 219 | 228 |
| --- | --- | --- | --- | --- | --- | --- |
| Mass (kg) | 3.75 | 3.35 | 4.30 | 4.80 | 5.20 | 5.60 |
| Species | Adelie | Adelie | Adelie | Gentoo | Gentoo | Gentoo |

| Split | Left mean | Right mean | Squared error |
| --- | --- | --- | --- |
| flipper ≤ 186 | 3.75 | 4.65 | 3.040 |
| flipper ≤ 193 | 3.55 | 4.975 | 1.008 |
| flipper ≤ 202 | 3.80 | 5.20 | 0.775 |
| flipper ≤ 214 | 4.05 | 5.40 | 1.285 |
| flipper ≤ 223.5 | 4.28 | 5.60 | 2.263 |

> Worked example: for the split at 202 mm the left leaf holds 3.75, 3.35 and 4.30, with mean 11.40 / 3 = 3.80. Their squared gaps are 0.0025 + 0.2025 + 0.25 = 0.455. The right leaf holds 4.80, 5.20 and 5.60, with mean 5.20 and squared gaps 0.16 + 0 + 0.16 = 0.32. The total is 0.775, the lowest in the table, so the stump splits at 202 mm.

## Two stages by hand
*Can you boost with a pencil and a learning rate of 0.5?*

**Start.** The mean mass is 27.00 / 6 = 4.50 kg. Every penguin gets 4.50, and the residuals (mass minus 4.50) are in the Residual column of the first table below. The mean squared error (MSE) is 3.715 / 6 = 0.62.

**Tree 1.** Subtracting 4.50 from every mass does not change which split is best, so the stump splits at 202 mm again. Each leaf outputs the mean residual: (-0.75 - 1.15 - 0.20) / 3 = -0.70 on the left and (0.30 + 0.70 + 1.10) / 3 = +0.70 on the right. With a learning rate of 0.5, each prediction moves by half of that, so 4.50 becomes 4.15 or 4.85. The MSE falls to 1.51 / 6 = 0.25.

| Flipper (mm) | Mass | Start | Residual | Tree 1 output | After tree 1 |
| --- | --- | --- | --- | --- | --- |
| 181 | 3.75 | 4.50 | -0.75 | -0.70 | 4.15 |
| 191 | 3.35 | 4.50 | -1.15 | -0.70 | 4.15 |
| 195 | 4.30 | 4.50 | -0.20 | -0.70 | 4.15 |
| 209 | 4.80 | 4.50 | 0.30 | 0.70 | 4.85 |
| 219 | 5.20 | 4.50 | 0.70 | 0.70 | 4.85 |
| 228 | 5.60 | 4.50 | 1.10 | 0.70 | 4.85 |

**Tree 2** is fitted to the new residuals, mass minus the "After tree 1" column.

| Flipper (mm) | Mass | After tree 1 | Residual | Tree 2 output | After tree 2 |
| --- | --- | --- | --- | --- | --- |
| 181 | 3.75 | 4.15 | -0.40 | -0.60 | 3.85 |
| 191 | 3.35 | 4.15 | -0.80 | -0.60 | 3.85 |
| 195 | 4.30 | 4.15 | 0.15 | 0.30 | 4.30 |
| 209 | 4.80 | 4.85 | -0.05 | 0.30 | 5.00 |
| 219 | 5.20 | 4.85 | 0.35 | 0.30 | 5.00 |
| 228 | 5.60 | 4.85 | 0.75 | 0.30 | 5.00 |

[[figure:gradient-boosting/two-stages|The six penguins and the model's prediction (line) at the start, after tree 1 and after tree 2. The dashed bars are the residuals the next tree is fitted to.]]

## What the second tree learned
*Why does tree 2 split somewhere else than tree 1?*

Tree 1 saw the big gap between Adelie and Gentoo and split there. It treated the three Adelie as one group, but their new residuals disagree: -0.40, -0.80 and +0.15. The best split of these residuals is at 193 mm, with a squared error of 0.43 against 0.775 at 202 mm. The leaves output -0.60 (181 and 191 mm) and (0.15 - 0.05 + 0.35 + 0.75) / 4 = +0.30 (the other four). After tree 2 the residuals are -0.10, -0.50, 0, -0.20, 0.20 and 0.60, and the MSE is 0.70 / 6 = 0.12.

> Worked example: a new penguin has a flipper of 200 mm. Tree 1 sends it left (200 ≤ 202), output -0.70. Tree 2 sends it right (200 > 193), output +0.30. The prediction is 4.50 + 0.5 × (-0.70) + 0.5 × 0.30 = 4.50 - 0.35 + 0.15 = 4.30 kg.

Each tree is fitted to the residuals, not to the masses, so it can correct a mistake an earlier tree made. The model is the start value plus a learning rate times the sum of the trees' outputs.

> Watch out: six penguins are far too few to trust a split such as 193 mm. They are here for the arithmetic. The real-data runs below use 200 training penguins.

## The learning rate
*Why add only a fraction of each tree?*

On the six penguins, training MSE after one and two trees depends on the learning rate like this:

| Learning rate | MSE after tree 1 | MSE after tree 2 |
| --- | --- | --- |
| 0.1 | 0.53 | 0.45 |
| 0.5 | 0.25 | 0.12 |
| 1 | 0.13 | 0.10 |

A large learning rate fits the training rows fastest, and that is its trap: it trusts every tree fully, including the luck in its leaves. Six rows cannot show the harm, so use real data. The task is to predict body mass in grams from bill length, bill depth and flipper length, for the 333 penguins with no missing value. The cut is the one from "Depth and leaf size": 200 training, 67 validation and 66 test penguins. Trees have depth 2. Predicting the training mean for everyone gives a validation RMSE of 797 g. RMSE is the square root of MSE, in grams again ("Loss functions").

| Learning rate | Best number of trees | Validation RMSE there | Validation RMSE at 300 trees | Training RMSE at 300 trees |
| --- | --- | --- | --- | --- |
| 0.1 | 45 | 345 | 385 | 182 |
| 0.3 | 23 | 345 | 443 | 97 |
| 1 | 13 | 380 | 506 | 21 |

[[figure:gradient-boosting/learning-rates|Validation RMSE as trees are added, for three learning rates. Each dot is the lowest point of its curve.]]

A smaller learning rate needs more trees. Here the two smaller rates reach the same best score, 345 g, better than the 380 g of rate 1. With a rate of 1 the model fits the training penguins almost exactly (21 g) and does worst on the validation ones.

## Gradient descent on predictions
*Why is it called gradient boosting?*

In "Gradient descent" you moved a parameter against the gradient: new value = old value - learning rate × gradient. Boosting makes the same move, but what it moves is the model's prediction for each training row. For one row with squared error (y - F)², where F is the current prediction, the gradient with respect to F is 2 × (F - y), which is -2 × residual. So the downhill direction is the residual, times a constant 2 that the learning rate absorbs.

> Worked example: the first penguin has y = 3.75 and F = 4.50. The loss is (3.75 - 4.50)² = 0.5625 and the gradient is 2 × (4.50 - 3.75) = 1.5, so downhill points toward smaller predictions, the way the residual -0.75 does. A step of 0.5 × the residual gives F = 4.50 - 0.375 = 4.125, and the loss drops to (3.75 - 4.125)² = 0.1406.

Stepping every row on its own would only memorize the training rows. A tree fitted to the residuals gives every row the average step of its leaf, and a new row lands in a leaf too. For this penguin tree 1 moved the prediction by 0.5 × (-0.70) = -0.35, close to the -0.375 above.

> Key idea: boosting is gradient descent in the space of predictions. Each tree is one step, the learning rate is the step length, and the number of trees is the number of steps.

::: deeper Boosting a classifier
For a yes-or-no label the loss is log loss, as in "Log loss and fitting". The loop is the same, with two changes. The model keeps a running score on the log-odds scale, and the residual of a row is its label (0 or 1) minus the probability the model currently gives it. The Ensemble lab boosts a yes-or-no label this way.
:::

## How many trees
*When should you stop adding trees?*

Every tree lowers the training error, so the training curve cannot say when to stop. Watch the validation set instead. After each tree, score the validation penguins and keep the number of trees with the lowest error. This is **early stopping**.

Take a learning rate of 0.1. The training RMSE falls steadily: 805 g with no trees, 429 with 10, 286 with 45, 252 with 100 and 182 with 300. The validation RMSE falls to 345 g at 45 trees, then rises: 350 at 100 and 385 at 300. Past 45 trees the new trees fit noise in the 200 training penguins.

[[figure:gradient-boosting/stopping-curve|Training and validation RMSE as trees are added (learning rate 0.1, depth 2). The validation curve bottoms out at 45 trees.]]

The dip is shallow and noisy, so a rule that quits at the first rise is fooled: on this curve it would stop at 36 trees. A rule with a **patience** of 10 rounds without a new best keeps 45.

## Over 30 cuts
*Is 45 trees a property of the data or of one cut?*

Repeat the whole experiment on 30 different cuts (seeds 1 to 30). The best number of trees was between 20 and 171 in 29 of them, with a median of 54 over all 30. In the last it was still falling at the 300 trees tried. On the test penguins, models that keep the number of trees with the lowest validation error had an average RMSE of 351 g, and the 300-tree models 370 g.

> Watch out: the validation set chose the number of trees, so its error at that number is a little flattered. Report the final score on the test set, as in "Tuning with search".

## Bagging versus boosting
*When does each one help?*

Both combine many trees, but they fix different problems. Here are four models on the same cut, in grams of RMSE. In this lesson's runs, bagging is 100 depth-8 trees on bootstrap samples, averaged.

| Model | Training | Validation | Test |
| --- | --- | --- | --- |
| One depth-8 tree | 168 | 430 | 450 |
| 100 bagged depth-8 trees | 154 | 335 | 379 |
| One depth-2 tree | 391 | 391 | 440 |
| 45 boosted depth-2 trees (rate 0.1) | 286 | 345 | 365 |

A single deep tree fits the training penguins closely and misses the validation ones: high variance. Averaging 100 of them cuts the validation RMSE from 430 to 335. A single depth-2 tree scores the same 391 on both sets, so it is too rigid: high **bias**, meaning it is too simple to follow the pattern and misses even on the training rows. Boosting 45 of them cuts it to 345. The difference between 379 and 365 on 66 test penguins from one cut is too small to call a winner.

[[figure:gradient-boosting/bagging-vs-boosting|Bagging builds deep trees independently and averages them. Boosting builds small trees in a chain, each fitted to what is left.]]

More bagged trees only steady the average. More boosted trees can overfit, so their number is a setting you choose by validation.

## Before the lab
*What will you do with this in the Ensemble lab?*

The course ends with the Ensemble lab, where you add trees in stages and compare how bagging and boosting change validation performance. It works on a yes-or-no label, so the residual there is the label minus a predicted probability, as in the "Boosting a classifier" box above.

Predict before you add a tree. When you keep adding trees, will bagging's validation error keep falling or turn up? And boosting's? Which of the two shows the wider gap between training and validation error? Then check each guess and name what you see with this lesson's words: bias, variance, learning rate, early stopping.

::: remember
- Boosting grows small trees in sequence. Each is fitted to the residuals of the model so far, and its output is added after being multiplied by the learning rate.
- Fitting residuals is gradient descent on the predictions: a tree is a step, the learning rate is its length, and a smaller rate needs more trees.
- Choose the number of trees by validation error, with early stopping. Bagging averages deep trees to cut variance; boosting adds small trees to cut bias.
:::
