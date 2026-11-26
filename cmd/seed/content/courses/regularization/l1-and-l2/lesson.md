---
slug: l1-and-l2
title: "L1 and L2: ridge and lasso"
kind: reading
simulator: ""
minutes: 20
---
::: intro
- Write the ridge (L2) and lasso (L1) penalties, and say what each does to a coefficient.
- Explain with one picture why lasso can set a coefficient exactly to zero and ridge cannot.
- Say why features must be standardised first, how the two penalties treat correlated features, and how a validation set chooses the penalty strength.

Before you start: read "Loss functions", "Scaling and encoding", "Underfitting and overfitting", "Pipelines and leakage" and "Train, validation and test", and the first lesson of this course, on bias, variance and shrinkage.
:::

## A price on big coefficients
*What do ridge and lasso add to the loss you already know?*

The first lesson of this course showed that pulling coefficients toward zero can trade a little bias for less variance. This lesson is about the two usual ways to do the pulling.

Both start from the loss you met in "Loss functions", the mean squared error (MSE), and add a **penalty** for big coefficients:

**Loss = MSE + lambda × penalty**

**Lambda** is the penalty strength. You choose it, so it is a hyperparameter. With lambda = 0 you get the ordinary fit, and the larger it is, the more the model is pushed toward small coefficients. The two penalties measure "big" differently. **Ridge**, also called **L2**, adds the sum of the squared coefficients. **Lasso**, also called **L1**, adds the sum of their absolute values. In this course the loss is the *mean* squared error and every feature is standardised, so the same lambda means something only inside this setup. Ridge and lasso also need different lambdas for the same amount of shrinkage: compare lambdas across the two penalties only as a rough guide, and never copy a value of lambda from another tool.

> Worked example: predict a penguin's body mass in kg from bill length, bill depth, flipper length and sex (1 for male), on the 333 penguins that have all four. Each feature is standardised, so a coefficient reads "kg per standard deviation of the feature". The ordinary fit gives -0.013, -0.169, 0.543 and 0.271. The ridge penalty is 0.013² + 0.169² + 0.543² + 0.271² = 0.397. The lasso penalty is 0.013 + 0.169 + 0.543 + 0.271 = 0.996.

## Ridge: shrink everything smoothly
*What does an L2 penalty do to one coefficient?*

Ridge pulls every coefficient toward zero, and it pulls a big coefficient harder than a small one. As lambda grows the coefficients shrink smoothly, but they get close to zero without landing exactly on it.

The simplest case has one standardised feature, or several uncorrelated ones. Then ridge has a formula: **new coefficient = old coefficient / (1 + lambda)**.

> Worked example: flipper length alone predicts body mass with a standardised coefficient of 0.6976 kg per standard deviation (342 penguins). That is 0.6976 / 14.04 = 0.0497 kg per mm, about 50 g for each extra millimeter. With lambda = 0.2 ridge gives 0.6976 / 1.2 = 0.581. With lambda = 0.8 it gives 0.6976 / 1.8 = 0.388, and with lambda = 1.5 it gives 0.6976 / 2.5 = 0.279.

Every coefficient is divided by the same number, so all shrink by the same share. That is why ridge never reaches zero: dividing a nonzero number by 1.8 leaves a nonzero number.

> Key idea: ridge keeps every feature in the model, each with a smaller weight.

## Lasso: switch features off
*How can an L1 penalty set a coefficient to exactly zero?*

For the same simple case lasso also has a formula: **subtract lambda / 2 from the size of the coefficient, and stop at zero.** The 2 comes from how the squared error is written, so do not worry about it. A coefficient smaller than lambda / 2 becomes exactly 0, and the feature drops out of the model.

> Worked example: for the flipper coefficient 0.6976, lambda = 0.2 gives 0.6976 - 0.1 = 0.598, lambda = 0.8 gives 0.6976 - 0.4 = 0.298, and lambda = 1.5 gives 0.6976 - 0.75, which is below zero, so the answer is 0. The coefficient reaches zero at lambda = 2 × 0.6976 = 1.395.

| Lambda | Ridge | Lasso |
| --- | --- | --- |
| 0 | 0.698 | 0.698 |
| 0.2 | 0.581 | 0.598 |
| 0.8 | 0.388 | 0.298 |
| 1.5 | 0.279 | 0 |

[[figure:l1-and-l2/shrink-rules|What each penalty does to a coefficient at lambda = 0.8: ridge divides it by 1.8, lasso subtracts 0.4 and stops at zero. A coefficient of 0.30 survives ridge as 0.17 and vanishes under lasso.]]

A lasso model with several zeros is short: it names the features it kept. That is why lasso is used for **feature selection**, and a model with a few nonzero coefficients is easy to read.

## The geometry in one picture
*Why does one penalty reach zero and the other not?*

There is a second way to see the penalty. Instead of paying a price, give the model a budget: choose the coefficients with the smallest loss whose penalty stays within the budget. With two coefficients, the allowed ones fill a region around zero. For L2 the region is a circle, because the penalty is a sum of squares. For L1 it is a diamond, because the penalty is a sum of absolute values.

The loss has its own shape. Points with equal loss form ellipses around the unpenalised fit, and the fit sits outside the region. The answer is where the smallest ellipse still touches the region.

[[figure:l1-and-l2/geometry|Lines of equal loss around the unpenalised fit (black dot) and the region each penalty allows. The pink ellipse is the first to touch the region, and the ring marks the answer.]]

A circle is smooth, so the ellipse usually touches it at a point where both coefficients are nonzero. A diamond has corners on the axes, and an ellipse coming from outside often reaches a corner first, where one coefficient is exactly 0. With many features the diamond has many such corners and edges, so several coefficients can be zero together.

> Watch out: a corner is likely, not certain. If the unpenalised fit lay in another place, the ellipse could touch an edge of the diamond instead.

## Spread or concentrate
*Which way of splitting a budget does each penalty prefer?*

The circle and the diamond differ because the two penalties charge differently for the same weights. Compare them on two coefficients that add up to the same total.

> Worked example: spend a total of 1 on two coefficients. Putting it all on one, (1, 0), costs 1 in L1 and 1 in L2. Splitting it, (0.5, 0.5), costs 0.5 + 0.5 = 1 in L1 but only 0.5² + 0.5² = 0.5 in L2. L2 prefers to spread the weight, while L1 does not mind concentrating it.

## Standardise first
*Why must features be on the same scale before you penalise them?*

A penalty adds up coefficients, and the size of a coefficient depends on the units of its feature. Measure flipper length in meters instead of millimeters and its coefficient becomes 1000 times bigger, while the model's predictions stay the same. The penalty is blind to that and charges the meter feature far more.

> Worked example: ridge on flipper length alone, with lambda = 0.05 and no standardising, in three units. The row for meters keeps only 0.4% of its slope.

| Flipper in | Slope without penalty | Slope with lambda = 0.05 | Share kept | Gain for +10 mm |
| --- | --- | --- | --- | --- |
| mm | 0.0497 | 0.0497 | 99.97% | 0.497 kg |
| cm | 0.497 | 0.485 | 97.5% | 0.485 kg |
| m | 49.7 | 0.195 | 0.4% | 0.002 kg |

The same feature, data and lambda gave three different models. The fix is to **standardise**: subtract each feature's mean and divide by its standard deviation, so every feature has mean 0 and standard deviation 1 and the penalty treats them alike. Compute those means and standard deviations on the training rows only and reuse them on the validation rows, as in "Pipelines and leakage".

::: deeper Why the intercept is not penalised
The intercept is the model's prediction when every standardised feature is 0, which is the average body mass. Shrinking it would pull every prediction toward 0 kg, which makes no sense. The usual way is to centre the target, as the figures here do, so the intercept is the mean and only the feature coefficients pay the penalty.
:::

## Correlated features
*How do the two penalties share weight between features that move together?*

Take two identical copies of one feature that deserves a total weight of 0.8. Ridge splits it evenly, 0.4 and 0.4, because splitting costs less in squares. Lasso sees the same total whichever way the 0.8 is split, so it has no preference. It tends to keep one copy, and which one can change with a small change in the data.

Real features are rarely identical, but in the penguin data flipper length and bill length are correlated, with r = 0.65 (the correlation from "Outliers and correlation": 0 is no straight-line link and 1 is a perfect one). Here are the four coefficients from the first section, with the penalty turned up:

| Setting | Bill length | Bill depth | Flipper length | Male |
| --- | --- | --- | --- | --- |
| No penalty | -0.013 | -0.169 | 0.543 | 0.271 |
| Ridge, lambda = 0.2 | 0.070 | -0.176 | 0.413 | 0.231 |
| Ridge, lambda = 1 | 0.113 | -0.129 | 0.259 | 0.142 |
| Lasso, lambda = 0.2 | 0 | 0 | 0.578 | 0.094 |
| Lasso, lambda = 1 | 0 | 0 | 0.202 | 0 |

[[figure:l1-and-l2/paths|The four penguin coefficients as lambda grows. Ridge shrinks them smoothly. Lasso brings them to exactly zero one after another, and the rings mark where.]]

As ridge cuts the flipper coefficient, its correlated neighbour bill length takes over some of the work and goes from -0.013 up to 0.113. Ridge shrinks the whole list, not each number: the sum of squares falls from 0.397 to 0.260 to 0.117. Lasso drops bill length at lambda near 0.01, bill depth near 0.15, sex near 0.44 and flipper length last, near 1.40.

When you want a blend of the two, there is the **elastic net**, which adds both penalties. Here you only need its name.

## Choosing lambda by validation
*How do you pick the penalty strength without fooling yourself?*

Training error cannot choose lambda: it is lowest at lambda = 0, so it would always say no penalty. Choose it on a **validation set**. For each lambda in a list, fit on the training rows, measure the error on the validation rows, and keep the lambda with the lowest validation error. Only then check the final model once on the test set, as in "Train, validation and test".

> Worked example: to give the model room to overfit, train on only 20 random penguins with 14 columns (the four features, their squares and their products), and validate on 200 others. Errors are mean squared errors in kg². Always guessing the training mean has validation error 0.648.

| Lambda | Ridge training | Ridge validation | Lasso validation | Lasso columns kept |
| --- | --- | --- | --- | --- |
| 0.0001 | 0.043 | 0.211 | 0.279 | 11 |
| 0.001 | 0.061 | 0.172 | 0.169 | 8 |
| 0.01 | 0.076 | 0.154 | 0.151 | 4 |
| 0.03 | 0.080 | 0.150 | 0.150 | 4 |
| 0.1 | 0.083 | 0.153 | 0.153 | 3 |
| 1 | 0.098 | 0.188 | 0.451 | 1 |

[[figure:l1-and-l2/choose-lambda|Ridge training error and validation error as lambda grows on a log scale. Training error only rises, while validation error falls and then rises, with its lowest point at lambda = 0.03.]]

## Reading the curve
*What do the table and the figure say about too little and too much penalty?*

Training error rises with every step, while validation error falls and then climbs again: too little penalty overfits, too much underfits. The two models agree from lambda = 0.01 to 0.1, and both do best at lambda = 0.03, where lasso keeps only 4 of the 14 columns. At the two ends they differ: lasso is worse than ridge at lambda = 0.0001 (0.279 against 0.211) and again at lambda = 1 (0.451 against 0.188). A different split would shift these numbers, so treat the lowest point as a good region, not an exact answer.

::: deeper How lasso is solved
With several correlated features there is no formula like the one for ridge. A common way is to update one coefficient at a time, applying "subtract and stop at zero" to it while the others stay fixed, and to repeat until nothing moves. The lasso curves in this lesson are computed that way. With a tiny penalty it can take hundreds of thousands of rounds before nothing moves, so the solver must run until it has really converged.
:::

## Before the lab
*What will you do with this in the Regularization lab?*

In the Regularization lab, the next lesson, you raise the penalty yourself and track the coefficients, the training error and the validation error. Predict before you move anything. At which lambda is training error lowest? Does validation error fall and then rise? Which coefficient reaches zero first as lambda grows under lasso, and what do ridge and lasso do with two features that move together? Check each guess against the lab.

::: remember
- Ridge (L2) adds the sum of squared coefficients and shrinks them all smoothly. Lasso (L1) adds the sum of absolute values and can set some coefficients exactly to zero, which selects features.
- The geometry: a circle has no corners, a diamond has corners on the axes. Standardise features first, or the penalty punishes them by their units.
- Correlated features: ridge shares the weight among them, lasso tends to keep one. Choose lambda by validation error, then test once.
:::
