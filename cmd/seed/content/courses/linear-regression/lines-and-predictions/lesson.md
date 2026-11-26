---
slug: lines-and-predictions
title: Lines and predictions
kind: reading
simulator: ""
minutes: 12
---
::: intro
- Read a straight line as a rule, `y = slope × x + intercept`, and say in plain words what the slope and the intercept each do.
- Use a line to predict a number, and tell when a prediction should not be trusted.
- Compute a residual (actual minus predicted), read its sign, and explain why a good line misses on both sides.

Before you start: read "Data, features and labels".
:::

## A line is a prediction rule
*How can a straight line predict a number?*

Many questions ask for a number: what will this trip cost, how heavy is this bird, how long will this job take? Predicting a number is called **regression**. The simplest rule for it is a straight line.

A taxi charges a base fee of 3 and then 2 for every kilometer. The fare for a trip is `fare = 2 × km + 3`. For a 5 km trip that gives 2 × 5 + 3 = 13. Here the distance is the **feature** x, the fare is the **target** y, and the rule turns x into a prediction of y.

Every straight line has the same shape:

`y = slope × x + intercept`

The slope and the intercept are the two numbers that define the line. A model that predicts with a line like this is **linear regression**: regression because it predicts a number, linear because the rule is a line.

[[figure:lines-and-predictions/line-anatomy|The taxi rule as a line. The line starts at 3 on the fare axis and rises by 2 for each extra kilometer, so 5 km is predicted to cost 13.]]

## The two dials
*What do the slope and the intercept each do?*

Think of the two numbers as dials. Each one changes the line in its own way.

The **slope** says how much the prediction changes when x grows by 1. In the taxi rule it is 2: one more kilometer adds 2 to the fare. Read it as rise over run. From 2 km (fare 7) to 3 km (fare 9) the run is 1 and the rise is 2. A positive slope tilts the line up. A negative slope tilts it down. A slope of 0 gives a flat line that predicts the same value for every x.

The **intercept** is the prediction when x is 0, the height where the line crosses the vertical axis. In the taxi rule it is 3, the base fee.

| Dial | What turning it does | Taxi rule |
|---|---|---|
| Slope | Tilts the line; changes how fast the prediction grows | 2 per kilometer |
| Intercept | Slides the whole line up or down; the tilt stays | 3, the fee at 0 km |

The slope has units: y units per x unit, here fare per kilometer. Always say them.

::: deeper Finding the dials from two points
Two different points fix one line. Take (2, 7) and (5, 13). The slope is the rise over the run: (13 - 7) / (5 - 2) = 6 / 3 = 2. To get the intercept, walk back from x = 2 to x = 0: 7 - 2 × 2 = 3. So the line is y = 2x + 3, the taxi rule again.

Real data never sits exactly on one line, so a model cannot just pick two points. The next lessons show how to choose the dials when the points are scattered.
:::

## Predicting with a real line
*How do you use a line on real measurements?*

Now real data. The bundled penguins dataset has 342 penguins with both measurements. The feature is flipper length in millimeters and the target is body mass in grams. Flippers range from 172 to 231 mm.

Here is a line drawn through the cloud: `mass = 50 × flipper - 5800`. The slope is 50 g per mm and the intercept is -5,800 g. To predict, put the flipper length in place of x.

| Flipper (mm) | Calculation | Predicted mass (g) |
|---|---|---|
| 180 | 50 × 180 - 5800 | 3,200 |
| 200 | 50 × 200 - 5800 | 4,200 |
| 220 | 50 × 220 - 5800 | 5,200 |

[[figure:lines-and-predictions/penguin-line|342 penguins, flipper length against body mass, with the line mass = 50 × flipper - 5800. The dashed lines read off the prediction for 200 mm: 4,200 g.]]

The slope reads naturally: each extra millimeter of flipper goes with 50 g more predicted mass. The intercept does not. At a flipper length of 0 the line predicts -5,800 g, which is nonsense, because no penguin has a 0 mm flipper. Here the intercept only anchors the line.

> Watch out: a line is only trusted inside the range of the data it came from. The line predicts 1,700 g for a 150 mm flipper, but no penguin in the data has a flipper shorter than 172 mm, so that number is a guess far outside what was measured.

## Residuals
*How wrong is the line on a single point?*

A line is a prediction, and a prediction can miss. The miss on one point is its **residual**:

`residual = actual - predicted`

Take four real penguins and the same line.

| Flipper (mm) | Actual mass (g) | Predicted (g) | Residual (g) |
|---|---|---|---|
| 181 | 3,750 | 3,250 | +500 |
| 186 | 3,800 | 3,500 | +300 |
| 193 | 3,450 | 3,850 | -400 |
| 195 | 3,250 | 3,950 | -700 |

[[figure:lines-and-predictions/penguin-residuals|The four penguins from the table. Each vertical segment is a residual: the gap between the actual mass (dot) and the line's prediction (ring).]]

A positive residual means the point is above the line, so the line predicted too low. A negative residual means the point is below the line, so the line predicted too high. The size is the miss, in the units of y: grams here.

> Key idea: a residual is a signed miss. The sign says which way the line was wrong and the size says by how much.

Do not judge a line by adding its residuals. These four add up to -300 g, which looks small, yet every one of the four points is at least 300 g from the line. Misses above and below cancel.

::: deeper Why the miss is measured straight up and down
The line turns a known x into a prediction of y, so the question is how far the true y is from the predicted y at the same x. That is a vertical gap. We do not measure the shortest distance to the line, because the penguin's flipper length is not what we are trying to predict.
:::

## A good line and a bad line
*How can you tell that a line fits without a score?*

Put every residual of a line on one plot: the flipper length on the horizontal axis and the residual on the vertical axis. A line that fits well leaves a cloud around the zero line, with misses above and below.

Take our line, `mass = 50 × flipper - 5800`. Of the 342 penguins, 140 lie above it and 191 below, and 11 sit exactly on it. Now push the line up by 400 g, to `mass = 50 × flipper - 5400`. Its slope is unchanged, so it still tilts the right way, but it now lies above most of the cloud: 294 penguins sit below it and only 43 above.

[[figure:lines-and-predictions/residual-patterns|Residuals of two lines on the same 342 penguins. Line A scatters around zero. Line B has been pushed up by 400 g, so nearly all of its residuals are negative.]]

> Key idea: residuals that are mostly one sign mean the whole line sits on the wrong side of the data. Moving the line toward the points would shrink many misses at once.

That is the idea behind **fitting** a line: choosing its slope and intercept so the line matches the data. Nudge the line until the misses are small and balanced. The next lesson makes "small" precise.

## Common mistakes
*What do beginners usually get wrong about lines?*

- **Reading the slope as a total.** A slope of 50 g per mm does not mean "50 g more in all". Ten more millimeters means 10 × 50 = 500 g more predicted mass.
- **Trusting the intercept.** It is the prediction at x = 0, and x = 0 is often far outside the data. A negative mass at 0 mm is not a bug in the line; it is a reminder not to read that spot.
- **Predicting outside the data.** A line keeps going forever. The world does not. Stay inside the measured range, or say clearly that you are guessing.
- **Expecting the line to hit every point.** Real data scatters. Non-zero residuals are normal. What matters is that they are small and balanced.
- **Flipping the sign.** The residual is actual minus predicted. Predicted minus actual gives the same size and the opposite sign.

> Watch out: a line shows that two things go together, not that one causes the other. Longer flippers go with heavier penguins; stretching a flipper would not make a penguin heavier.

## From residuals to a score
*What is still missing before a computer can fit a line?*

You can now draw a line, predict with it, and measure the miss on every point. One piece is missing. To compare two lines, or to choose the best one, we need a single number for the whole line, and adding up the signed residuals does not work.

The next lesson, "Loss functions", builds that number in two ways, the mean squared error and the mean absolute error, and shows how a model finds the dials that make it as small as possible.

After that comes the lab, "Fit a line, read its loss". You will get noisy points and drag a line through them, and see how each point's residual feeds into the loss. Before you open it, decide what you expect: if you tilt the line, which points' residuals should grow and which should shrink?

::: remember
- A line predicts with `y = slope × x + intercept`: the slope is the change in the prediction per unit of x, and the intercept is the prediction at x = 0.
- Use a line only inside the range of the data it came from, and read the slope with its units.
- A residual is actual minus predicted; a good line leaves misses on both sides, and the signed misses cannot just be added to score it.
:::
