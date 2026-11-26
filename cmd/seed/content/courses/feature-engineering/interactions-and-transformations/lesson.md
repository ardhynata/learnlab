---
slug: interactions-and-transformations
title: Interactions and transformations
kind: reading
simulator: ''
minutes: 20
---
::: intro
- Build an interaction feature, and show by hand that it lets a linear model fit a pattern it could not see.
- Choose a transformation for a column from the problem the column has: a log for skew, a square, bins, or a ratio.
- Say why new columns are standardized after they are built, with the scaler fitted on training rows only, and why more columns call for a penalty.

Before you start: read "Scaling and encoding" and "Pipelines and leakage" from Preparing tabular data, and "Bias, variance and shrinkage" from Regularization.
:::

## Columns you build yourself
*Why change the columns instead of letting the model learn from the ones it has?*

A linear model scores a row by adding one push per column: `prediction = b0 + b1 × x1 + b2 × x2 + ...`. Each column pushes by its own amount, whatever the other columns say, along a straight line. A model can only learn a pattern that its columns and its shape allow. If the pattern you need is in neither, more data and longer training will not find it.

**Feature engineering** means building new columns from the old ones so the pattern shows up. You have done a small case already: one-hot encoding turned a text column into numbers. This lesson adds two families. An **interaction** combines two features into one column. A **transformation** reshapes a column: a log, a square, bins, or a ratio of two columns.

Some models need less help. A decision tree can split on one feature and then on another, so it can find some interactions alone. Linear and logistic regression cannot, and distance models such as k-NN only see the columns they are given.

> Key idea: a model can learn only the patterns its columns make visible. A new column is a way of making a pattern visible.

## Interaction features
*What does a product of two features add that the two features alone cannot?*

An **interaction feature** is a new column built from two features, most often their product, x1 × x2. In a plain linear model the effect of x1 is one fixed number, b1, whatever x2 is. Plot the fitted line for several values of x2 and the lines are parallel.

Add the product and the model becomes `b0 + b1 × x1 + b2 × x2 + b3 × (x1 × x2)`. The effect of x1 is now `b1 + b3 × x2`, so it changes with x2. If b3 is positive, x1 matters more when x2 is large.

Reach for an interaction when you have a reason to think two features work together. A dose and the time it is taken for, a discount and a busy month, a 0/1 group flag times a number (which gives the two groups different slopes).

Do not try every pair. With 10 features there are 45 pairs, and every pair you test is another chance to fit noise. Start from what you know about the problem.

## One interaction, by hand
*Can a product column fix a linear model that is badly wrong?*

Here is a made-up garden trial: eight plots, two per combination of fertilizer and water. The column f is 1 when fertilizer was added, w is 1 for high water, and the last column is the yield in kg.

| Plot | f | w | f × w | Yield (kg) |
|---|---|---|---|---|
| 1, 2 | 0 | 0 | 0 | 9, 11 |
| 3, 4 | 1 | 0 | 0 | 9, 11 |
| 5, 6 | 0 | 1 | 0 | 8, 12 |
| 7, 8 | 1 | 1 | 1 | 29, 31 |

The group averages are 10, 10, 10 and 30 kg, and the overall average is 15. The fitted slope for f is the difference of two averages, (10 + 30) / 2 - (10 + 10) / 2 = 10. The slope for w is also 10, and the intercept is 15 - 10 × 0.5 - 10 × 0.5 = 5. The line predicts 5, 15, 15 and 25 kg. It claims that fertilizer alone adds 10 kg, which is false.

Its squared misses add up to 214, so the MSE is 214 / 8 = 26.75, a typical miss of 5.17 kg (the square root of the MSE).

Now add f × w. The fit is 10 + 0 × f + 0 × w + 20 × (f × w): each factor alone does nothing, together they add 20 kg. The predictions are the group averages. The squared misses add up to 14, so the MSE is 1.75, a typical miss of 1.32 kg.

[[figure:interactions-and-transformations/parallel-or-fan|The garden trial. Without the product the two fitted lines must be parallel (left); with it they can fan out (right).]]

## Log for a skewed column
*What does a log do to a long tail?*

A column is **skewed** when most values bunch up and a few are very large, as with incomes, prices or counts. Those few values pull the mean, stretch a standardized scale and dominate a model that squares its errors.

A **log** compresses the tail. The log with base 10 asks "what power of 10 gives this number?": log10(100) = 2 and log10(1,000) = 3. Its useful property is that multiplying becomes adding. Every doubling adds the same amount, log10(2) = 0.30, so 25, 50 and 100 sit at equal steps.

Take seven incomes, in $1000s: 25, 30, 38, 45, 60, 90 and 250. The mean is 76.9 but the median is 45. After the log, the values are 1.40, 1.48, 1.58, 1.65, 1.78, 1.95 and 2.40. Standardized, the largest income falls from z = 2.35 to z = 2.06, and the six others, which were squeezed into z of -0.71 to 0.18, now spread over -1.11 to 0.65. Here z is the number of standard deviations from the mean, using the population standard deviation (divide by n).

[[figure:interactions-and-transformations/log-skew|The same seven incomes before and after log10. The far point is pulled toward the rest.]]

> Watch out: a log needs values above 0. For counts that can be zero, a common choice is the log of (1 + x).

## Squares, bins and ratios
*Which problem does each of the other transformations solve?*

**Square.** A straight line cannot bend. Take x = -2, -1, 0, 1, 2 and y = 4, 1, 0, 1, 4. The best straight line is flat at the mean, 2, and its squared misses add up to 14. Add the column x² and the fit is exact. This is the polynomial idea from "Underfitting and overfitting": degree 2 means the columns x and x².

**Bins.** Cut a number into ranges and one-hot encode the ranges, for example ages under 30, 30 to 59, and 60 or older. Each band gets its own coefficient, so the effect can jump between bands. The price is detail lost inside a band, and edges chosen from the data must come from the training rows only.

**Ratios.** A ratio of two columns captures "relative to". Divide a penguin's bill length by its bill depth. The mean ratio is 2.12 for Adelie, 2.65 for Chinstrap and 3.18 for Gentoo. Chinstrap and Gentoo have almost the same bill length, but their ratios separate them.

[[figure:interactions-and-transformations/bill-ratio|Real penguins: bill length overlaps for Chinstrap and Gentoo, but length divided by depth keeps their middle halves apart.]]

## Standardize after you transform
*Why does the scaler come after the new columns exist?*

New columns often have a very different size from the old ones. Take penguins with flipper lengths 181, 186 and 195 mm and body masses 3,750, 3,800 and 3,250 g. The product of the two is 678,750, 706,800 and 633,750. A distance would be dominated by that column, and a penalty would punish the columns unequally, because a coefficient on a column of that size lives on a very different scale from the rest. This is the problem you met in "Scaling and encoding".

So the order is: build the new columns, then standardize every column, new ones included. A product, a square or a ratio computed from one row needs only that row, so it is safe before the split. The mean and standard deviation are learned from data, so they are fitted on the training rows only and reused unchanged on the test rows, as in "Pipelines and leakage". The same holds for bin edges taken from quantiles.

[[figure:interactions-and-transformations/build-then-scale|The order of work: build new columns, fit the scaler on training rows, apply it to both sets, then fit the model.]]

::: deeper Centering before multiplying
This is an optional alternative to the order above, not a replacement for it. Centering a feature before you multiply it changes what the other coefficients mean. In the garden trial, center f and w to f - 0.5 and w - 0.5, then fit again. The model is 15 + 10 × (f - 0.5) + 10 × (w - 0.5) + 20 × (f - 0.5)(w - 0.5). The intercept 15 is the overall average, and each main coefficient, 10, is the average effect of that factor. With the raw 0/1 columns the same data gave 10, 0, 0 and 20, where the coefficient on f is the effect of fertilizer at low water only. The predictions are identical; only the reading differs.
:::

::: deeper A ratio is a log in disguise
Because log(a / b) = log(a) - log(b), a linear model that is given log(a) and log(b) as two columns can learn ratio-like patterns without a ratio column. A ratio column is the shortcut when you already know that the ratio is what matters.
:::

## More columns, more penalty
*What does each new column cost, and how do you know it earned its place?*

Every new column is a new coefficient to estimate. In the garden trial the product cut the training MSE from 26.75 to 1.75, but training error never rises when you add a column, so it cannot tell you the column is real. Here the pattern was built in by design; in real data the same drop can be noise being fitted.

Two habits keep you honest. First, judge a new column on data it was not fitted to: a validation score or, better, cross-validation, as in "Cross-validation and stratification". Second, expect to need a penalty. Ten features with all 45 products and 10 squares make 65 columns, and a penalty from "L1 and L2: ridge and lasso" pulls the useless coefficients toward zero.

The next lesson turns to categorical columns with many values. The course ends with the Feature ablation lab, where you add features one at a time and check which improvements survive cross-validation.

::: remember
- An interaction (a product) lets the effect of one feature depend on another; a linear model without it draws parallel lines.
- Transform a column to fix its problem: a log for skew, a square to bend, bins for jumps, a ratio for "relative to". Then standardize, with the scaler fitted on training rows only.
- Every new column adds a coefficient. Judge it on held-out data, and expect to need a penalty.
:::
