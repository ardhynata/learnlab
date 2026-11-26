---
slug: loss-functions
title: Loss functions
kind: reading
simulator: ""
minutes: 15
---
::: intro
- Compute a residual, the mean absolute error (MAE) and the mean squared error (MSE) by hand.
- Explain how each residual adds to the loss, and why squaring gives big misses so much weight.
- Predict how one far-off point changes each loss.

Before you start: read "Lines and predictions".
:::

## A line needs a score
*Why do we need one number for how well a line fits?*

A line is a model: for any x it predicts y as slope times x, plus the intercept.

Which line is better? Your eye can spot a line that is clearly bad, but it cannot rank two lines that both look fine, and a computer has no eye at all. It needs a rule that turns a line and the data into one number, where a lower number means a better line. That number is the **loss**, and the rule that computes it is the **loss function**.

Every loss function in this lesson starts from the same raw material: how far each prediction is from the truth. They differ in how they turn those misses into a single number, and that choice decides what the loss rewards and punishes.

> Key idea: a loss is a score for a line, and lower is better. Two losses can disagree about which line is better, even when one calls it a tie.

## Residuals
*How wrong is one prediction?*

A **residual**, which you met in "Lines and predictions", is the miss on one point: the actual value minus the predicted value.

`residual = actual - predicted`

Take the line y = x + 1 and the point (3, 5). At x = 3 the line predicts 4. The actual value is 5, so the residual is 5 - 4 = +1. The point lies above the line. A point below the line has a negative residual, and a point on the line has residual 0. In a plot, a residual is the vertical segment between the point and the line.

[[figure:loss-functions/residual-segments|Four points and the line y = x + 1. Each vertical segment is a residual, with its sign.]]

You cannot score a line by adding up the residuals. The point (4, 4) has residual 4 - 5 = -1, and with the +1 of (3, 5) it adds up to 0, as if neither point were missed. Misses of opposite signs cancel, so a loss must first make every miss positive.

## Mean absolute error
*What if we drop the sign and average the misses?*

**Mean absolute error (MAE)** takes the absolute value of every residual, which is its size without the sign, and averages them:

`MAE = (|r1| + |r2| + ... + |rn|) / n`

Here r1 to rn are the residuals and n is the number of points. The line y = x + 1 has residuals 0, 0, +1 and -1 on the four points in the figure. Their absolute values are 0, 0, 1 and 1, so MAE = (0 + 0 + 1 + 1) / 4 = 0.5.

MAE has a plain meaning: it is the typical miss, in the units of y. If y is a price in euros, an MAE of 0.5 says the predictions are off by half a euro on average. A perfect line has MAE 0. Each point adds to the total in proportion to its miss: a miss of 4 adds four times as much as a miss of 1.

## Mean squared error
*What if we square each miss instead?*

**Mean squared error (MSE)** squares every residual and averages the results:

`MSE = (r1² + r2² + ... + rn²) / n`

A square is never negative, so squaring also removes the sign. For the same residuals 0, 0, +1 and -1 the squares are 0, 0, 1 and 1, so MSE = 0.5, the same number as the MAE. They match here only because every miss is exactly 1.

Square a miss of 1 and you get 1. Square a miss of 4 and you get 16. The cost grows faster than the miss: a miss four times as large counts sixteen times as much.

[[figure:loss-functions/penalty-curves|What one residual adds to each loss. The absolute miss grows in a straight line; the squared miss curves up much faster.]]

MSE is measured in squared units: if y is in euros, MSE is in euros squared, which is hard to picture. MAE stays in euros.

## Comparing two lines
*Can we score two lines by hand?*

Take the four points (1, 2), (2, 3), (3, 5) and (4, 4), and two candidate lines: **A** is y = x + 1 and **B** is y = 0.5x + 2.

[[figure:loss-functions/two-lines|The same four points under two lines. The numbers under each panel are the losses worked out below.]]

Line A predicts 2, 3, 4 and 5, so its residuals are 0, 0, +1 and -1. Line B predicts 2.5, 3, 3.5 and 4, so its residuals are -0.5, 0, +1.5 and 0.

| Line | MAE | MSE |
|---|---|---|
| A | (0 + 0 + 1 + 1) / 4 = 0.5 | (0 + 0 + 1 + 1) / 4 = 0.5 |
| B | (0.5 + 0 + 1.5 + 0) / 4 = 0.5 | (0.25 + 0 + 2.25 + 0) / 4 = 0.625 |

MAE calls it a tie. MSE prefers A, because B has one bigger miss (1.5), and squaring makes that miss weigh more than the small ones together.

> Watch out: compare the same loss across lines, never one loss against the other. An MAE of 0.5 and an MSE of 0.625 are on different scales and cannot be ranked.

## How each residual contributes
*What does one far-off point do to the total?*

Add a fifth point, (5, 11), far above the pattern. An **outlier** is a point like this, far from the rest, such as a typing error or a one-off event. Line A predicts 6 at x = 5, so the new residual is +5. Here is what each point adds to the totals:

| Point | Residual | Absolute miss (adds to MAE) | Squared miss (adds to MSE) |
|---|---|---|---|
| (1, 2) | 0 | 0 | 0 |
| (2, 3) | 0 | 0 | 0 |
| (3, 5) | +1 | 1 | 1 |
| (4, 4) | -1 | 1 | 1 |
| (5, 11) | +5 | 5 | 25 |
| Total | | 7 | 27 |
| Divide by 5 | | MAE = 1.4 | MSE = 5.4 |

[[figure:loss-functions/outlier-share|How the totals for line A split among the points. The outlier supplies most of both, but far more of the MSE.]]

The outlier supplies 5 of the 7 in the MAE total, about 71 percent, and 25 of the 27 in the MSE total, about 93 percent. From the clean data, MAE rose from 0.5 to 1.4, which is 2.8 times, while MSE rose from 0.5 to 5.4, about 11 times.

::: deeper What each loss picks for one number
Forget the line and predict a single constant for the values 1, 2, 3 and 10. MSE is lowest at the **mean**, 4: it is 12.5 there, against 14.75 at 2.5. MAE is lowest at the **median**, any value from 2 to 3: it is 2.5 at 2.5, against 3 at 4.

So MSE chases the average, and the 10 drags it up to 4. MAE settles at the middle of the data and counts the 10 only by its size. This is the same pull-versus-calm difference as in the table above.
:::

::: deeper Getting MSE back into the units of y
The square root of MSE is the **root mean squared error (RMSE)**, and it is in the units of y again. For line A on the four clean points, RMSE = sqrt(0.5), about 0.71, close to the MAE of 0.5. With the outlier, RMSE = sqrt(5.4), about 2.32, against an MAE of 1.4. The gap between RMSE and MAE is a quick sign that a few big misses dominate.
:::

## Choosing a loss, and the lab
*Which loss should you use, and what comes next?*

A line that chases a low MSE will work hard to shrink its biggest residuals, so it tends to tilt toward an outlier. A line that chases a low MAE is bothered less by one far-off point. Neither reaction is always right.

- If an outlier is a mistake, such as a mistyped value, MAE's calm is a feature.
- If a big miss is truly costly, such as a delivery that is a day late, MSE's alarm is a feature.
- If you want the typical miss in plain units, report MAE.

The loss also does a second job: when a computer searches for the best line, the loss is the only thing it looks at. Change the loss and you change what "best" means.

In the lab, "Fit a line", you drag a line through noisy points and see how each residual adds to the loss. Before you open it, predict what happens to each loss as you drag the line toward one far-off point.

::: remember
- A residual is actual minus predicted; a loss turns all the residuals into one number, and lower is better.
- MAE adds each miss by its size; MSE adds each miss squared, so a miss four times as big counts sixteen times as much.
- One outlier can supply most of the MSE total, so the choice of loss decides how much it steers the line.
:::
