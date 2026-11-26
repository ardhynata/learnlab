---
slug: gradients-and-the-loss-surface
title: Gradients and the loss surface
kind: reading
simulator: ""
minutes: 20
---
::: intro
- Read a derivative as the slope of the loss, found by nudging one dial (the slope or the intercept of the line), and a partial derivative as that slope with the other dial held still.
- Compute by hand the gradient of the mean squared error for a line fitted to three points.
- Explain why the gradient points uphill, and take one update step against it.

Before you start: read "Loss functions" and "Fit a line".
:::

## A score is not yet a direction
*Why is knowing the loss not enough to improve a line?*

In "Fit a line", fitting meant walking to the lowest spot of a map. Every pair of slope and intercept is a spot, and the loss from "Loss functions" is the height there. You played the computer by dragging the line yourself.

A program cannot look at the map. It can only score the lines it tries, and there are far too many to try. It needs a direction: should the slope go up or down, and the intercept too, and by how much? The tool that answers this is the **gradient**, and this lesson builds it from the ground up.

> Key idea: a loss tells you how good a line is. A gradient tells you which way to change the line to make it better.

## Three points and one line
*What do we start from?*

The numbers stay small. The data are the first three points of "Loss functions": (1, 2), (2, 3) and (3, 5). The fourth point is left out to keep the arithmetic short, so the losses here differ from the four-point ones in that lesson. The line to improve is its line A, y = 1x + 1, with slope 1 and intercept 1. Its residuals (actual minus predicted) are 0, 0 and +1, so its mean squared error (MSE) is (0 + 0 + 1) / 3 = 0.33.

## A derivative is a slope you can measure
*What happens to the loss when you nudge one dial?*

Hold the intercept at 1 and nudge the slope up by a small amount. Then divide the change in loss by the size of the nudge.

| Nudge | New slope | New MSE | Change in MSE / nudge |
|---|---|---|---|
| +0.5 | 1.5 | 0.5 | +0.333 |
| +0.1 | 1.1 | 0.18 | -1.533 |
| +0.01 | 1.01 | 0.3138 | -1.953 |
| +0.001 | 1.001 | 0.3313 | -1.995 |

The first row is a warning. A nudge of 0.5 jumps over the bottom of the bowl, so the loss rises and the ratio says nothing about the ground at slope 1. Once the nudge is tiny, the ratio settles near -2.

That number is the **derivative** of the MSE with respect to the slope at this line: the slope of the loss curve at one spot, in loss per unit of slope. The sign says raising the slope lowers the loss here. The size says how steeply.

[[figure:gradients-and-the-loss-surface/one-dial|The MSE against the slope, with the intercept held at 1. At slope 1 the curve falls with a slope of -2: along the dashed tangent the loss drops 2 for each 1 of slope. The curve itself bends up again, and its lowest point is at slope 1.21.]]

## Partial derivatives: one dial at a time
*Is there a formula, so we do not have to nudge?*

Yes. Take one point with residual r = y - (slope × x + intercept). Raising the slope by a tiny δ lowers r by x × δ, so the squared miss r² changes by -2xr per unit of nudge (the δ² part is negligible). Raising the intercept changes r² by -2r per unit.

The MSE averages the n squared misses, so add the points up and divide by n:

`slope: -(2/n) × (sum of x × r)`

`intercept: -(2/n) × (sum of r)`

Each is a **partial derivative**: the derivative with respect to one dial, with every other dial held still. Mathematicians write them ∂MSE/∂slope and ∂MSE/∂intercept.

Check the first one on line A. Its residuals are 0, 0 and +1 at x = 1, 2 and 3, so the sum of x × r is 3. That gives -(2/3) × 3 = -2, the number the nudges were closing in on.

::: deeper Where -2 comes from, exactly
With the intercept held at 1, the MSE of the three points is a plain curve in the slope: MSE(slope) = (14/3) × slope² - (34/3) × slope + 7. Its derivative is (28/3) × slope - 34/3. At slope 1 that is -6/3 = -2.

It is zero at slope 34/28 = 1.21, where the MSE is 0.12. That is the bottom the nudge of +0.5 jumped over: 1 + 0.5 = 1.5 lies past 1.21.
:::

## The loss surface over slope and intercept
*What does the loss look like when both dials move?*

Put the slope on one axis and the intercept on the other. Every spot is a line, and the height above it is that line's MSE. This is the **loss surface** from "Fit a line". Seen from above it is drawn with **contour lines**: each joins lines with the same MSE, and where the lines are packed close the surface is steep.

[[figure:gradients-and-the-loss-surface/loss-surface|The MSE of the three points over every slope and intercept. The ring is line A (MSE 0.33) and the diamond is the lowest point, slope 1.5 and intercept 0.33 (MSE 0.06).]]

The surface is a long, narrow valley that runs from upper left to lower right. Slope and intercept pull against each other: all three x values are positive, so a steeper slope lifts the line on the right and the intercept must drop to compensate. That is the point in "Fit a line" that the best value of one dial depends on the other.

At the very bottom the ground is flat, so both partial derivatives are 0. Check it at slope 1.5 and intercept 1/3 (0.33): the residuals are +0.17, -0.33 and +0.17, which add up to 0, and so does the sum of x × r. With the rounded 0.33 they add up to 0.01 instead. Those two conditions are where the least squares formulas come from.

## Computing a gradient by hand
*How do we get both partial derivatives for line A?*

Line A is y = 1x + 1. List each point, its prediction, its residual and x × r:

| x | y | Prediction | Residual r | x × r |
|---|---|---|---|---|
| 1 | 2 | 2 | 0 | 0 |
| 2 | 3 | 3 | 0 | 0 |
| 3 | 5 | 4 | +1 | 3 |
| Sum | | | 1 | 3 |

Put the sums into the two formulas, with n = 3:

> Worked example: the slope's partial derivative is -(2/3) × 3 = -2. The intercept's is -(2/3) × 1 = -2/3, about -0.67.

The **gradient** is these partial derivatives collected into one list, one entry per dial: (-2, -0.67). A nudge of the intercept by +0.001 confirms the second entry: the MSE falls from 0.3333 to 0.3327, a ratio of about -0.67.

Read the signs. Both entries are negative, so raising either dial lowers the loss. That fits the picture: the only point that misses is (3, 5), above the line, and raising the line there helps. The slope's entry is larger because that point sits at x = 3, where a change of slope moves the line the most.

## The gradient points uphill
*How do we know which way is uphill, and which way is down?*

The gradient points in the direction where the loss rises fastest, and its length, here the square root of 4 + 0.44, about 2.11, says how fast. With both entries negative, uphill means lowering both dials. Downhill is the opposite way: raising both.

Test it with real moves. Take a step of 0.15 times the gradient from line A, both ways:

| Move | Slope | Intercept | MSE |
|---|---|---|---|
| Start (line A) | 1 | 1 | 0.33 |
| With the gradient | 0.7 | 0.9 | 1.55 |
| Against the gradient | 1.3 | 1.1 | 0.22 |

The line y = 0.7x + 0.9 predicts 1.6, 2.3 and 3, so its residuals are +0.4, +0.7 and +2, and its MSE is (0.16 + 0.49 + 4) / 3 = 1.55. Stepping with the gradient made the loss worse, and stepping against it made it better.

[[figure:gradients-and-the-loss-surface/gradient-uphill|Zoomed in on line A. The pink arrow is 0.15 times the gradient, pointing uphill to MSE 1.55. The teal arrow is the same length the other way, to MSE 0.22.]]

> Watch out: the gradient is not a signpost to the lowest point. The lowest point here is at slope 1.5 and intercept 0.33. The downhill step raises the intercept from 1 to 1.1 anyway, because it follows the steepest ground right here.

## One update step
*How do we turn the gradient into a better line?*

Subtract the gradient, scaled by a small number you choose:

`new value = old value - rate × gradient entry`

The scale is called the **learning rate**. The lab in the next lesson lets you change it, and "Learning rate and trouble" studies what it does. Here it is 0.15.

> Worked example: new slope = 1 - 0.15 × (-2) = 1.3. New intercept = 1 - 0.15 × (-2/3) = 1.1. The new line is y = 1.3x + 1.1. It predicts 2.4, 3.7 and 5.0, so its residuals are -0.4, -0.7 and 0, and its MSE is (0.16 + 0.49 + 0) / 3 = 0.22.

The loss fell from 0.33 to 0.22 in one step.

[[figure:gradients-and-the-loss-surface/update-step|The three points under line A and under the line after one step. The big miss at (3, 5) has gone, and two smaller misses below the line have appeared.]]

The ground tilts differently at the new line. Its residuals give a gradient of (1.2, 0.73), shorter than before, so you must measure again. A bigger step goes wrong: a rate of 0.3 lands at slope 1.6 and intercept 1.2, where the MSE is 1.2, worse than the start. The gradient describes only the ground right here.

## From one step to a walk
*What do you do with a gradient after this?*

You have done the whole machinery once: score the line, compute the gradient, step against it. Do it again from the new line, and again, and the line settles near the bottom of the valley. A loop of such steps is **gradient descent**, and it is the subject of the next lesson.

That lesson, "Gradient descent", comes with a lab where you do the repeating yourself, step after step, on three surfaces: a round bowl, a narrow ravine and two valleys. The ideas you met here carry over unchanged: the gradient points uphill, and the step goes the other way.

Before you open it, predict two things. As the steps approach the bottom of the valley, will the gradient get longer or shorter? And will the first steps head straight for the lowest point? The step in this lesson did not.

::: remember
- A derivative is the slope of the loss at one spot, found by nudging a dial; a partial derivative holds the other dials still.
- For MSE, the gradient is -(2/n) × (sum of x × r) for the slope and -(2/n) × (sum of r) for the intercept. It points uphill, so the update steps against it.
- One step with rate 0.15 took line A from MSE 0.33 to 0.22; the gradient is local, so you measure again after each step.
:::
