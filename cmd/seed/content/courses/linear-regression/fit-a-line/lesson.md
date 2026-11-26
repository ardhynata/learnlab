---
slug: fit-a-line
title: Fit a line
kind: simulator
simulator: loss-fit
minutes: 25
---
::: intro
- Find the best line for squared error with a short formula, and check it on four points.
- Read the loss as you turn one dial (the slope or the intercept): a smooth bowl for squared error, a V for absolute error.
- Predict how one outlier moves the best line for each loss, then test it on generated and real data.

Before you start: read "Loss functions".
:::

## From a score to a search
*What does it mean to fit a line?*

In "Loss functions" you were handed a line and scored it. **Fitting** a line turns that around. Nobody hands you a line. You look for the slope and the intercept whose loss is lowest. Those two numbers are the **parameters** of the model, and the loss is your only guide.

Picture every pair of slope and intercept as a spot on a map, with the loss as the height of that spot. Fitting is walking to the lowest spot. A computer does it as a loop: try a line, score it, change it a little, and score again.

[[figure:fit-a-line/fit-loop|Fitting is a loop. Each pass tries a line, scores it with the loss, and changes the line so the loss falls.]]

In the lab you play the computer's part. You drag the line yourself and the screen shows the loss after each move. That is how you learn what the search feels like before a program does it for you.

## Squares on the residuals
*How can you see the squared-error loss on a plot?*

For mean squared error, draw a square on every residual. Its side is the residual and its area is the squared residual. The MSE is the average area of the squares.

> Worked example: take the four points (1, 2), (2, 3), (3, 5) and (4, 4) from "Loss functions", and the line y = 0.8x + 1.5 (the next section shows where it comes from). The line predicts 2.3, 3.1, 3.9 and 4.7, so the residuals are -0.3, -0.1, +1.1 and -0.7. The areas are 0.09, 0.01, 1.21 and 0.49. They add up to 1.8, and 1.8 / 4 = 0.45. The MSE is 0.45.

[[figure:fit-a-line/squares-on-residuals|The four points, the line y = 0.8x + 1.5, and a square on each residual. The big square holds about two thirds of the total area.]]

The square at (3, 5) is 1.21 of the 1.8, about two thirds. Four squares, and one of them is most of the loss.

> Key idea: shrinking a big square pays more than shrinking a small one by the same step. That is why the best line for squared error gets pulled toward the points that miss the most.

## The best line for squared error
*Is there a formula for the lowest MSE?*

Yes. The line with the lowest MSE is called the **least squares** line, and you can compute it with two formulas:

`slope = sum of (x - mean x)(y - mean y) / sum of (x - mean x)²`

`intercept = mean y - slope × mean x`

> Worked example: for the same four points, mean x = 2.5 and mean y = 3.5.

| x | y | x - 2.5 | y - 3.5 | product | square |
|---|---|---|---|---|---|
| 1 | 2 | -1.5 | -1.5 | 2.25 | 2.25 |
| 2 | 3 | -0.5 | -0.5 | 0.25 | 0.25 |
| 3 | 5 | 0.5 | 1.5 | 0.75 | 0.25 |
| 4 | 4 | 1.5 | 0.5 | 0.75 | 2.25 |
| Total | | | | 4 | 5 |

The slope is 4 / 5 = 0.8. The intercept is 3.5 - 0.8 × 2.5 = 1.5. So the line is y = 0.8x + 1.5, the one in the last picture, with MSE 0.45.

Compare it with the lines of "Loss functions": line A had MSE 0.5 and line B had 0.625. No line has an MSE below 0.45 on these four points. The lab's "Snap to the best line" button uses this formula when the loss is MSE.

> Key idea: the least squares line always passes through the point (mean x, mean y). Here that is (2.5, 3.5): 0.8 × 2.5 + 1.5 = 3.5.

::: deeper Where the formulas come from
Turn one dial and the MSE is a bowl with its lowest point where the curve is flat. With two dials the loss is a bowl-shaped surface, and its lowest point is flat in both directions.

Flat in the intercept direction means the residuals add up to 0, which says mean y = slope × mean x + intercept. That is why the line passes through (mean x, mean y). Flat in the slope direction, together with that fact, gives the slope formula. Calculus does the algebra, and you only need the result.
:::

## One dial at a time
*What does the loss look like when you turn only the slope?*

Hold the intercept at 1 and slide the slope. For each slope, score the same four points.

| Slope | MSE | MAE |
|---|---|---|
| 0 | 7.5 | 2.5 |
| 0.5 | 2.125 | 1.25 |
| 1 | 0.5 | 0.5 |
| 1.5 | 2.625 | 1.25 |

[[figure:fit-a-line/bowl-and-v|The loss against the slope for the same four points, with the intercept held at 1. The green dot marks the lowest loss.]]

The MSE traces a smooth **bowl**. It falls steeply far from the bottom, flattens near it, and has one lowest spot, at slope about 0.97. From any slope, going downhill leads to that one spot, which is why a search for the best line cannot get stuck.

The MAE traces a **V** made of straight pieces. It bends where the line passes through a point, and its lowest spot here is slope 1, where the MAE is 0.5.

> Watch out: the best value of one dial depends on the other. With the intercept at 1 the lowest MSE is at slope 0.97. With the intercept at 1.5 it is at slope 0.8. You cannot tune the dials one after the other and stop.

::: deeper Why the best MAE line goes through two points
For each point there is one slope at which the line passes through it, and between such slopes the MAE curve is a straight piece. A chain of straight pieces is lowest at a bend. With both dials the idea is the same, so there is always a best MAE line through at least two points. The lab uses this: for MAE, the Snap button tries every pair of points and keeps the best line. Ties happen. On the four points, line A (y = x + 1), line B (y = 0.5x + 2) and y = 0.67x + 1.33 all have MAE 0.5.
:::

## Two losses, two best lines
*Do MSE and MAE choose the same line?*

Usually not. On the four points the least squares line has MAE 0.55, but line A has MAE 0.5. By MAE the least squares line is not the best, and by MSE line A is not the best (0.5 against 0.45). Each loss has its own best line.

The gap grows when one point is far from the rest. Take seven points near a line: (1, 2), (2, 3), (3, 3), (4, 5), (5, 5), (6, 7) and (7, 7). Fit both losses: the MSE line is y = 0.89x + 1.00 and the MAE line is y = 0.83x + 1.17. Now add one far-off point at (8, 1).

[[figure:fit-a-line/outlier-pull|Seven points and one outlier at (8, 1). The MSE line tilts toward the outlier. The MAE line stays exactly where it was.]]

The MSE line changes to y = 0.30x + 2.79, a much flatter line pulled down toward the outlier. The MAE line stays at y = 0.83x + 1.17. The far point misses the MAE line by about 6.8: that adds 6.8 to the absolute total but about 47 to the squared total, so squared error cannot ignore it.

> Watch out: neither reaction is always right. If the far point is a typing error, MAE's calm helps. If it is a real and costly miss, MSE's alarm is the better guide.

## What "best" does not promise
*Does the lowest loss mean the line is the truth?*

The best line is best for these points and this loss, nothing more. In the lab the generated points are drawn around y = 0.6x + 1.5 plus **noise**, which is random scatter around that line, yet the best MSE line is slope 0.57 and intercept 1.47. The noise pushed it a little away from the truth, and a different sample of noise would push it somewhere else.

The loss does not reach 0 either. In the lab the best MSE is 0.236, because no straight line can follow noise.

## What a low loss does not show
*Does a low loss mean the line will predict well?*

On the real penguins, the least squares line has a slope of about 49.7 g per mm and an intercept of about -5,781 g. That is close to the "50 per mm, minus 5800" line you drew by eye in "Lines and predictions", found now by a rule instead of by eye.

A low loss does not show that a line will predict well on new data, or that the cloud is straight at all. A later course, "Training and generalization", tests lines on data they have not seen.

Before you open the lab, predict which best line moves more when you add one far-off point: the MSE one or the MAE one.

::: remember
- Fitting a line means choosing the slope and intercept with the lowest loss, and the loss is the only guide.
- For MSE the best line has a formula, and the loss curve is a smooth bowl; for MAE the curve is a V of straight pieces.
- Each loss has its own best line, and one outlier pulls the MSE line much farther than the MAE line.
:::

@@lab

## Lab: Fit a line, read its loss
The plot starts with 20 generated points and a poor line (slope 0.20, intercept 4.00) that sits far above them. You are the search. Move the line, watch the residuals and the loss, then press **Snap to the best line** to see where a computer would end up.

### Controls
- **Data** switches between **Generated data** (20 seeded points around y = 0.6 x + 1.5, the same every time) and **Penguins (real)** (flipper length against body mass, each stretched to fit the plot from 0.5 to 9.5). 342 penguins are kept and 2 rows with a missing measurement (NA) are left out.
- **Slope** (-0.5 to 1.5, starts at 0.20) and **Intercept** (0 to 6, starts at 4.00) are kept in step with the two diamond handles on the plot. Drag a handle and the sliders move; move a slider and the handles move. With the keyboard, focus the plot, press the Left or Right arrow to pick a handle and the Up or Down arrow to move it (Shift for a bigger jump).
- **Loss** picks **Mean squared error** or **Mean absolute error**.
- **Add an outlier** adds one point at (9, 0.8), far below the pattern. Ticking it also reveals the answer to Quick Quiz. Unticking it resets that box.
- **Show residuals** draws the vertical residual segments and, for the squared loss, a square on each residual (side = residual, area = squared residual). On the penguins only the 12 biggest squares are drawn.
- **Snap to the best line** moves the sliders and handles to the best line for the chosen loss: least squares for MSE, an exact search over pairs of points for MAE.
- **Fullscreen** enlarges the lab. **Reset** restores the start line, the squared loss, no outlier, residuals on and Generated data, and clears the prediction.
- **Quick Quiz** is the button under the settings card (a round button at the bottom right on a phone) (its badge counts the quizzes you have not answered; it opens a small panel): "You add the outlier. Which best line moves more: the one for MSE or the one for MAE? Pick one, then tick 'Add an outlier'." Pick **The MSE line moves more**, **The MAE line moves more** or **They move about the same**, then tick Add an outlier.

### Reading the screen
- The status line gives the loss name, your loss and the loss at the best line, such as "Mean squared error: 1.958. At the best line: 0.236."
- The detail line gives your line, the biggest miss, the best line and what share of the total error one point carries: "Your line: y = 0.20 x + 4.00. Biggest miss: 2.13. Best line: slope 0.57, intercept 1.47. One point carries 12% of the total squared error." With the absolute loss it says "absolute".
- The line under it shows both losses for your line and the number of points: "MSE 1.958 · MAE 1.123 · 20 points".
- On the plot the legend names **Data points**, **Outlier**, **Your line**, **Line handles (draggable)**, **Residuals** and **Squared residual (area)**. Hover a point, or tap it, to see "residual 1.39 | squared 1.92 | absolute 1.39" for that point.
- **What each point costs** has one bar per point, left to right: the squared residual for MSE, the absolute residual for MAE. The dashed line is the average, which is the loss. The outlier's bar has its own colour.
- **Loss as you change the slope** shows the loss at every slope, with the intercept held where it is. The orange dot is your slope and the green dot is the lowest loss.
- **Both losses for the same line** is a table with the columns **Yours** and **Best**, one row for each loss.
- With the penguins, both axes are stretched to the same 0 to 10 plot, so the slope and the losses are in plot units, not in grams.

### Experiments
1. **Beat the start line.** Predict: how low can you get the MSE by dragging the handles, and which way must the line move? Drag, then press Snap to the best line. The start line has MSE 1.958 and its biggest miss is 2.13. The best line has slope 0.57, intercept 1.47 and MSE 0.236, about 8 times lower. Notice how the squares shrink as the line settles into the cloud.
2. **One dial at a time.** Predict: with Intercept stuck at 4.00, can sliding only Slope bring the MSE near 0.24? Move the Slope slider and watch the green dot on the curve. The lowest MSE for that intercept is 1.885, at slope about 0.15, so no. Set Intercept to 1.50 and slide again: the green dot moves to slope 0.57 and MSE 0.237. Explain why the best slope depends on the intercept.
3. **Same line, two losses.** Predict: if you Snap with Loss on Mean squared error, will the table say Yours equals Best for the MAE row too? Snap, then read the table: MAE Yours 0.335, Best 0.319. Switch Loss to Mean absolute error and Snap again. Now MAE is 0.319, and the MSE row shows Yours 0.245 against Best 0.236. The curve is a V now. Each loss has its own best line, and here they are close.
4. **Add an outlier.** Press Reset. Pick an answer in Quick Quiz, then tick Add an outlier. The box says the MSE line moved 0.55 on average and the MAE line 0.04, in plot units. With Loss on Mean squared error press Snap: the line becomes slope 0.41, intercept 1.96, and one point carries 71% of the total squared error. Explain, using the bar chart, who that point is.
5. **One miss, two shares.** Keep the outlier on. Predict: will the outlier carry the same share of the error under both losses? Switch Loss to Mean absolute error and Snap: slope 0.60, intercept 1.35, and the outlier carries 48% of the absolute error (its bar is 5.91, the dashed average 0.586). Now switch Loss back to Mean squared error without moving the line: the same point carries 88%. Squaring turns one big miss into most of the loss.
6. **Move to the real data.** Press Reset, then set Data to Penguins (real). Predict: will the outlier move the best lines as far as it did on the 20 generated points? Snap with each loss: MSE gives slope 0.81, intercept 0.26 and MSE 0.966; MAE gives slope 0.83, intercept 0.13 and MAE 0.780. A slope of 0.81 plot units is about 49.7 g per mm, the line from "Lines and predictions". Now tick Add an outlier (a penguin of about 228 mm and 2,820 g): the box says the MSE line moved only 0.05 and the MAE line 0.00. The generated points never change, so the penguins are your fresh data. Do both data sets agree that the MSE line is the one that moves? Do they agree on how far? One far point matters less when it is one of 343 points than one of 21.
