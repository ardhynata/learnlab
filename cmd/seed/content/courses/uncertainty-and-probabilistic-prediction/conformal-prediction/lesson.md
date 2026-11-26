---
slug: conformal-prediction
title: Conformal prediction
kind: reading
simulator: ""
minutes: 20
---
::: intro
- Build a prediction interval with split conformal prediction: hold out a calibration set, take absolute residuals, and add and subtract one of them.
- Compute the quantile rank ceil((n + 1)(1 - α)) by hand on 9 calibration residuals, and say what coverage it promises.
- Explain when the promise breaks, and how interval width trades against coverage.

Before you start: read "Aleatoric and epistemic uncertainty" and "Train, validation and test".
:::

## From one number to an interval
*What does an interval add to a predicted number?*

The last lesson separated uncertainty that more data can shrink from noise that no model removes. This one asks what a model can promise about a single prediction anyway.

A regression model returns one number, such as 4,161 g for a penguin. That number is almost never exactly right, and it does not say how far off it could be. A **prediction interval** is a range, such as 3,743 g to 4,579 g, that is meant to contain the true value.

You choose α (alpha), the share of intervals you accept to be wrong. With α = 0.2 you ask for an 80% interval, and with α = 0.1 a 90% interval. **Coverage** is the share of new cases whose true value lands inside its interval. It is what you check afterward.

**Conformal prediction** is a recipe that wraps any model, whether a line, a forest or a network, and turns its predictions into intervals with a coverage promise. It needs no assumption about the shape of the errors. It needs held-out data and one condition, which a later section names.

## The split conformal recipe
*Which data does each step use?*

**Split conformal prediction** divides the labeled data three ways and works in three steps.

1. **Train.** Fit the model on the training set, as always.
2. **Calibrate.** Predict the **calibration set**, cases the model never saw, and record each **absolute residual** |y - ŷ|. Call the number of calibration cases n. Sort the n residuals from smallest to largest.
3. **Take a quantile.** Pick the k-th smallest residual, where k = ceil((n + 1)(1 - α)), and call it q. The next sections explain this rank.

For a new case, predict ŷ and report the interval from ŷ - q to ŷ + q.

[[figure:conformal-prediction/recipe|The split conformal recipe: fit on the training set, measure residuals on the calibration set, and add and subtract the quantile q.]]

> Watch out: the residuals must come from cases the model did not train on. A model usually fits its own training cases better than new ones, so training residuals are too small and the intervals too narrow.

The price is that calibration cases are not used for training. The gain is that no model is refit and nothing else changes.

## A worked example on penguins
*Can you build an 80% interval with a pencil?*

A straight line fitted to 333 penguins predicts body mass from flipper length. Nine other penguins from the bundled table were held out as the calibration set. Their absolute residuals, in grams, sorted from smallest to largest:

| Rank k | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Residual (g) | 72 | 129 | 209 | 268 | 355 | 365 | 369 | 418 | 498 |

> Worked example: ask for 80%, so α = 0.2, with n = 9. Then (n + 1)(1 - α) = 10 × 0.8 = 8, and ceil(8) = 8. So q is the 8th smallest residual, 418 g. A new penguin with a 200 mm flipper gets ŷ = 4,161 g, and the interval runs from 4,161 - 418 = 3,743 g to 4,161 + 418 = 4,579 g. It is 836 g wide.

[[figure:conformal-prediction/calibration-residuals|The nine sorted calibration residuals with q at rank 8, and the interval it gives a penguin predicted at 4,161 g.]]

Nothing in these steps looked at the model's insides. Any model that returns a number can take the place of the line.

::: deeper How the nine penguins were chosen
Take the 342 penguins in the bundled table that have every measurement. The calibration set is the 4th, 42nd, 80th, 118th, 156th, 194th, 232nd, 270th and 308th of them, and the line is fitted to the other 333. Another choice of nine would give other residuals and another q. That wobble is the topic of the guarantee section below.
:::

## Why the rank is rounded up
*Why ceil((n + 1)(1 - α)) and not simply 80% of the residuals?*

The promise rests on **exchangeability**: the calibration cases and the new case behave as if they were drawn the same way, so that shuffling their order would change nothing. Independent draws from one source satisfy it.

Then the new case's residual is equally likely to take any of the 10 ranks among the 9 calibration residuals plus itself. It lands at or below the k-th calibration residual in k of those 10 positions, so the chance of being covered is k / (n + 1). For k = 8 that is 8/10 = 0.8, exactly the 80% we asked for.

[[figure:conformal-prediction/rank-slots|The new residual falls into one of 10 equally likely slots. Choosing rank k as q covers k slots.]]

To get at least 1 - α, we need k / (n + 1) ≥ 1 - α, and the smallest whole k that works is ceil((n + 1)(1 - α)). As a quantile level that is ceil((n + 1)(1 - α)) / n.

> Key idea: the "+ 1" counts the new case itself. Without it the intervals come out too narrow. With n = 10 and α = 0.1, the 9th residual (90% of 10) covers only 9/11 = 82%, while the corrected 10th covers 10/11 = 91%.

## When the rank does not exist
*What if there are too few calibration cases?*

The rank k cannot be larger than n. When ceil((n + 1)(1 - α)) is larger than n, no calibration residual is big enough, and the only safe interval is the whole number line.

Take the same nine residuals and α = 0.05. Then 10 × 0.95 = 9.5, and ceil(9.5) = 10, which is more than 9. Nine cases cannot support a 95% promise. In general, you need n ≥ 1/α - 1 calibration cases, which is 19 for 95%, and 99 for 99%.

> Worked example: with α = 0.1 the rank is ceil(10 × 0.9) = 9, the largest of the nine residuals, 498 g. The interval for the same penguin is 4,161 - 498 = 3,663 g to 4,161 + 498 = 4,659 g, which is 996 g wide.

::: deeper Ties and the upper bound
If no two residuals are equal, the average coverage is at least 1 - α and also at most 1 - α + 1/(n + 1). With n = 9 and α = 0.2 that is between 0.8 and 0.9, and here exactly 0.8 because k / (n + 1) = 8/10. Equal residuals can only push the coverage up, never below 1 - α.
:::

## What the guarantee says
*What exactly is promised, and what is not?*

**The promise.** If the calibration cases and the new case are exchangeable, the interval covers the true value with probability at least 1 - α. It holds for any model, even a poor one, for any shape of errors, and for any n. This is why it is called **distribution-free** and **finite-sample**.

**What it does not say.**

- **It is an average, not a promise for one group.** The 80% holds across all cases. Heavy penguins or one island may be covered far less often.
- **It is an average over calibration sets.** One set of 9 cases can deliver much more or much less than 80%, typically off by about 12 points (one standard deviation). With 99 calibration cases, the same swing shrinks to about 4 points.
- **A weak model is not hidden.** A poor model does not lose coverage. It gets wide intervals, because its calibration residuals are large.

> Key idea: conformal prediction promises coverage, not sharpness. How narrow the interval is depends on how good the model is.

## When coverage fails
*What happens when the new cases are not like the calibration cases?*

The promise needs exchangeability, and real data breaks it in a few common ways.

- **Shift.** If the inputs change (covariate shift) or the link between inputs and target changes (concept shift), the new residuals can be larger than the calibration ones. The course "Advanced evaluation and shift" covers both.
- **Repeated entities.** If the same patient or penguin appears in both calibration and test, their residuals are alike, not independent.
- **Time.** If calibration data is older than the cases you predict, drift can make the new errors bigger.

[[figure:conformal-prediction/shift|Coverage of a 90% interval when the new errors are larger than the calibration errors, assuming Gaussian errors.]]

If the new errors are 1.5 times as large, a 90% interval covers only about 73%. At 2 times it covers about 59%.

What to do: split calibration the way you will deploy, as in "Grouped and temporal splits"; keep checking coverage on recent labeled cases; and recalibrate when it drops. Weighted conformal prediction goes further and reweights the calibration cases when only the inputs shift, if you can estimate how.

## Width against coverage
*What does each extra point of coverage cost?*

A higher coverage needs a larger rank, and so a larger q. For the nine penguin residuals and the 200 mm flipper:

| Level asked | α | Rank k | q (g) | Interval (g) |
| --- | --- | --- | --- | --- |
| 50% | 0.5 | 5 | 355 | 3,806 to 4,516 |
| 80% | 0.2 | 8 | 418 | 3,743 to 4,579 |
| 90% | 0.1 | 9 | 498 | 3,663 to 4,659 |
| 95% | 0.05 | 10 | none | the whole line |

Going from 80% to 90% makes the interval about 19% wider. Going to 95% is not possible with nine cases at all. More calibration cases give finer steps.

## Adaptive intervals
*Can the width follow how hard each case is?*

A fixed ±q gives every case the same width, though some are easier than others. **Adaptive** intervals fix this. In **normalized** (locally weighted) conformal prediction, a second model estimates the spread σ̂(x) at each input, and the interval is ŷ ± q × σ̂(x). **Conformalized quantile regression** starts from a model that predicts a low and a high quantile, and calibrates that band. Both keep the average coverage promise.

In the next lesson, "Interval lab", you construct prediction intervals and measure their empirical coverage as the data distribution changes.

::: remember
- Split conformal prediction: fit on the training set, take absolute residuals on a calibration set, and report ŷ ± q, where q is the k-th smallest residual with k = ceil((n + 1)(1 - α)).
- If calibration and new cases are exchangeable, coverage is at least 1 - α for any model, on average and not for every group. The "+ 1" counts the new case itself.
- Shift, repeated entities and time order break exchangeability, and coverage drops. Higher coverage costs wider intervals, and adaptive intervals let the width follow the difficulty.
:::
