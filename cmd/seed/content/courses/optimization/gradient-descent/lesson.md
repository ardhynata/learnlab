---
slug: gradient-descent
title: Gradient descent
kind: simulator
simulator: gd-contours
minutes: 25
---
::: intro
- Repeat the update rule by hand on real penguin numbers and explain why the steps shrink as the gradient does.
- Read the gradient descent lab: contour lines, the gradient arrow, the next-step arrow and the verdict of a run.
- Tell a round bowl from a narrow ravine by the path it gives, and explain why a small gradient does not prove you are at the lowest point.

Before you start: read "Gradients and the loss surface" and "Loss functions".
:::

## From one step to a loop
*What changes when you repeat the update step?*

In "Gradients and the loss surface" you took one step: the gradient points uphill, so the update subtracts it, scaled by the **learning rate**. That one step made a line better, but it did not reach the bottom, and you had to measure again. **Gradient descent** is that step repeated: stand at a guess, measure the gradient, step the opposite way, and measure again until the ground is flat. You met it in "Log loss and fitting" too, where it fitted a logistic regression. Here you watch the loop move.

The step is still a single line:

```
new value = old value - learning rate × gradient
```

Steep ground has a large gradient, so the step is long. Near a flat bottom the gradient is small, so the steps shrink by themselves. That is the new thing a loop shows: you never tell it to slow down.

> Key idea: the gradient says which way is uphill, so the update subtracts it. The learning rate says how far to go.

> Watch out: the gradient is not the step. The step is the gradient times the learning rate, pointed the other way.

## A pencil run on three penguins
*Can you run gradient descent on real measurements?*

Take three penguins from the bundled table: flippers of 181, 210 and 230 mm, and masses of 3.75, 4.45 and 5.70 kg. Measure the flipper in units of 100 mm (1.81, 2.10, 2.30). The model has one parameter: predicted mass = w × flipper. The loss is the mean squared error. For this loss the gradient is the mean of 2 × flipper × (w × flipper - mass), the formula from "Gradients and the loss surface", here applied to a one-parameter model.

Start at w = 0 with learning rate 0.1. The three terms are -13.575, -18.69 and -26.22, so the gradient is their mean, -19.495.

| Step | w | Loss | Gradient | New w = w - 0.1 × gradient |
|---|---|---|---|---|
| 0 | 0 | 22.118 | -19.495 | 1.9495 |
| 1 | 1.9495 | 0.552 | -2.630 | 2.2125 |
| 2 | 2.2125 | 0.159 | -0.355 | 2.2480 |
| 3 | 2.2480 | 0.152 | -0.048 | 2.2528 |

[[figure:gradient-descent/penguin-steps|The loss curve for the three penguins. The dots are the first four values of w. Each step is shorter than the one before, because the gradient shrinks as the curve flattens.]]

The loss never reaches 0: three penguins do not lie exactly on a line through the origin. The lowest loss, 0.152, sits at w = 2.2536 (found with algebra, as a check), and the walk is already within 0.001 of it after four updates.

## Two parameters: the map
*How do you draw a loss with two parameters?*

In "Gradients and the loss surface" the loss of a line was a surface over slope and intercept, drawn with contour lines. The gradient descent lab draws surfaces the same way: each **contour line** joins points with the same loss, at equal steps of loss, so packed lines mean steep ground. The diamond marks the lowest point.

At every point the gradient is an arrow pointing straight uphill. It crosses the contour line at a right angle, because along the line the loss does not change. The step arrow points the opposite way, and its length is the gradient times the learning rate.

[[figure:gradient-descent/contour-gradient|What the lab draws at your position. The gradient (pink) crosses the contour line at a right angle and points uphill. The step (teal) goes the other way. Only the direction of the pink arrow matters; its length is not to scale.]]

> Watch out: on an oval surface the downhill arrow does not point at the lowest point. It points down the steepest way from where you stand, and that can be sideways to the goal.

The update is the same rule, applied to both parameters at once, each with its own slope.

## Bowls and ravines
*Does every surface behave like a round bowl?*

On a **round bowl** the steepest way down points straight at the lowest point, so the path is straight. On a **narrow ravine**, steep across and gentle along, the steepest way down points mostly at the opposite wall. One step can cross the ravine and land on the other side. The next step crosses back, and the path zigzags while it creeps along the floor.

[[figure:gradient-descent/bowl-vs-ravine|The same method on two surfaces. The bowl gives a straight path (learning rate 0.25). The ravine gives a zigzag (learning rate 0.14, smaller because 0.25 would be too big there).]]

Ravines are not exotic. Add an intercept b to the penguin model and you have two parameters. If the flipper is in mm (181, 210, 230), the surface is an extreme ravine: for these three penguins the largest learning rate that still converges is about 0.000023. With the flipper in units of 100 mm it is about 0.19. Same data, same model, only the unit changed. That is one reason features are scaled before fitting with gradient descent; you met scaling in "Scaling and encoding".

::: deeper Why the ravine zigzags, in numbers
The lab's ravine has the loss (x - 5)² / 2 + 6 (y - 5)², so its slopes are x - 5 and 12 (y - 5): twelve times steeper across than along. Each step multiplies the distance from the floor by a fixed factor: 1 - learning rate for x, and 1 - 12 × learning rate for y. At learning rate 0.14 the factors are 0.86 and -0.68.

The minus sign is the zigzag: the y distance flips sides every step. From 3.5 it goes to -2.38, then 1.62, then -1.10, shrinking each time. The x distance shrinks slowly (0.86 per step), which is why the path creeps along. With a smaller learning rate the y factor stays positive and the zigzag disappears. The next lesson, "Learning rate and trouble", shows how big the learning rate can get before the swings grow.
:::

## Knowing when to stop
*When has a run arrived?*

At a low point the ground is flat, so the gradient is zero and the update changes nothing. In practice it is never exactly zero, so we stop when the gradient is tiny, when the loss stops improving, or at a step limit. The gradient descent lab calls a run **converged** when the gradient size (the length of the gradient, shown in the status line) falls below 0.05 and the point has almost stopped moving.

A run **diverges** when the loss grows far above where it started. A run that hops between two spots of equal loss without getting lower is "not settling". Anything else is "still moving": the gradient is not small yet. The loss normally falls at each step, but a step that is too big can raise it for a while.

You can read all of this from the status line and the loss chart, with no need to see the landscape.

> Key idea: a run is finished when the gradient is almost zero. That tells you the ground is flat here, which is a weaker claim than "this is the lowest point".

## Flat is not the same as lowest
*Does a small gradient mean we found the best point?*

Gradient descent only feels the slope under its feet. A **local minimum** is the bottom of a valley: a point lower than everything around it. It need not be the deepest valley. Standing there the gradient is zero, so the walk stops, and it cannot tell that a deeper valley exists elsewhere.

The lab's third surface, Two valleys, shows this. The deep valley has loss -0.37 and the shallow one 0.36. Between them there is a ridge, near 4.9 on Parameter 1 (the horizontal axis). Which side of the ridge you start on decides where the walk ends, even when two starts are only 1.4 apart.

[[figure:gradient-descent/two-valleys|Two valleys, learning rate 0.1. Start A (Parameter 1 = 4.2) ends in the shallow valley. Start B (Parameter 1 = 5.6), only 1.4 away, ends in the deep one. Both runs were stopped by a small gradient.]]

The fits you did in Level 1 are safe from this. Linear regression with squared error and logistic regression with log loss have a single valley. Models with many layers do not, and they are one reason a start (or several starts) matters.

> Watch out: "converged" describes the gradient, not the quality of the answer. Check the loss it reached, and compare it with a different start.

## The same walk fits a model
*How does this walk fit a model with many parameters?*

A model's loss, for a fixed data set, is a function of its parameters alone. That is a landscape, like the maps above, with one axis for each parameter; a line, prediction = w × input + b, has two. Gradient descent starts from a guess, computes the gradient for every parameter, and updates all of them at once with the same rule. Repeat, and the model improves.

The penguin run averaged the gradient over all three penguins. That is **batch** gradient descent: exact, but costly on a large table. The last lesson of this course uses one example, or a small group, per step: cheaper, noisier, and still downhill on average.

::: deeper A two-parameter step by hand
Take the bowl f(x, y) = (x - 5)² + (y - 5)², whose gradient is (2(x - 5), 2(y - 5)). Start at (1.5, 8) with learning rate 0.25, the lab's defaults. The starting loss is 12.25 + 9 = 21.25.

1. The gradient is (-7, 6), so the move is -0.25 × (-7, 6) = (+1.75, -1.5) and the point goes to (3.25, 6.5). The loss falls to 5.3125.
2. The gradient is (-3.5, 3), so the point goes to (4.125, 5.75) and the loss is 1.328.

Each step halves the distance to the lowest point, because 1 - 0.25 × 2 = 0.5, and half the distance means a quarter of the loss. Experiment 1 in the lab shows these numbers.
:::

::: remember
- Each step is new value = old value - learning rate × gradient: the gradient points uphill, so we subtract it. The same rule updates every parameter at once.
- Contour lines map a surface with two parameters: packed lines mean steep. A bowl gives a straight path and a ravine a zigzag; a unit change such as mm for 100 mm makes a ravine far narrower, and the safe learning rate far smaller.
- A run stops when the gradient is almost zero, which can be a shallow valley. Where you start can decide where you end.
:::

@@lab

## Lab: walking downhill on contour lines
The plot is a map of a loss surface. Its two axes are two parameters, and each contour line joins points with the same loss. You choose a surface and a learning rate, click to place the start, then watch the walk.

### Controls
- **Loss surface** chooses **Round bowl**, **Narrow ravine** or **Two valleys**. Picking one resets the start and the momentum (to 0), and sets the learning rate to 0.25, 0.14 or 0.1 for the three surfaces in that order.
- **Learning rate** is a slider on a log scale, from about 0.003 to 2. The note under it says roughly where a run stops converging on this surface, with momentum 0.
- **Momentum (optional extra)** runs from 0 to 0.95. It keeps a share of the last step, like a heavy ball rolling downhill. Leave it at 0 (plain gradient descent) unless an experiment says otherwise.
- **Click or drag the plot** to move the start. With the plot focused, the arrow keys move it by 0.25, or by 1 with Shift.
- **Run** plays the walk. It becomes **Pause** while running and **Run again** when the run has ended, which starts over from the start point. **Next step**, **Previous step** and **Speed** step through it. **Reset** puts everything back to the defaults, including the speed.
- Changing any setting puts the walk back at step 0; press **Run** again.

### Reading the screen
- The ring is the **start**, and the diamond is the **Lowest point**. The dots are the **Path so far**. On Two valleys a grey ring marks the **shallow valley**.
- The pink arrow is the **Gradient (points uphill)**: only its direction matters. The teal arrow is the **Next step (downhill)**, drawn at its true length.
- The status line reads, for example, "Step 3 · loss 0.332 · gradient size 1.152 · still moving". The last word is the verdict: **converged**, **still moving**, **diverging** or **not settling**. The sentence under it explains the verdict.
- The chart **Loss at each step** plots the loss against the step number. Pink dots on its top edge, labelled **off the chart**, mean the loss is too big to draw.

### Experiments
1. **One step at a time.** Predict: on **Round bowl** with the defaults (learning rate 0.25), by what factor will the loss and the gradient size shrink at each step? Press **Next step** three times and read the status line. The loss goes 21.250, 5.313, 1.328, 0.332, and the gradient size 9.220, 4.610, 2.305, 1.152. Explain it with the "A two-parameter step by hand" fold: the distance to the lowest point halves, so the gradient size halves and the loss falls to a quarter. Watch the teal arrow shrink while it keeps pointing at the diamond, and press **Previous step** to go back.
2. **Small, just right, too big.** Predict: on **Round bowl**, which of learning rates 0.1, 0.25 and 0.5 reaches the lowest point first? Press **Run** with each (set the slider near it). At 0.1 the verdict reads converged after 24 steps, at 0.25 after 8, and at 0.5 the very first step lands on the lowest point, because 1 - 0.5 × 2 = 0 (the status line reads converged one step later, because the point has only just stopped moving). Then try 1.0: the point hops between two spots with the same loss, and the verdict "not settling" appears only after 40 steps, so let it run. Near 1.2 it diverges, and pink dots appear on the chart.
3. **The ravine zigzag.** Predict: on **Narrow ravine**, will the path head straight for the diamond? Choose it and press **Run** (learning rate 0.14): the path crosses the floor on every step and converges after 30 steps. Press **Reset**, choose **Narrow ravine** again and press **Next step** once: the pink arrow points almost straight across, nowhere near the diamond, so the first steps do not head straight for the lowest point. Now set the learning rate near 0.05: the crossing stops, but it takes 86 steps. Near 0.17 it diverges, as the note under the slider warned. Which step size would you pick?
4. **Two valleys.** Predict: with the defaults, where will the path end? Choose **Two valleys** and press **Run**. It converges at step 31 in the shallow valley, with loss 0.364, and the text under the status line says it did not reach the lowest point. Now click the plot at about 4.5 on **Parameter 1** (the horizontal axis), just left of the ridge (about 4.9): the path ends in the shallow valley again (loss about 0.36). Click at about 5.5, just right of the ridge: the path ends in the deep valley, with loss about -0.37. Explain: why does the side of the ridge decide?
5. **Fresh starts.** Predict: does the verdict on a surface depend on where you start? Check each with four fresh starts, for example the corners (0, 0), (10, 10), (9, 1) and (1, 9). On **Round bowl** at 0.25 every start converges in 9 steps; on **Narrow ravine** at 0.14 in 30 or 31. Raise the ravine to 0.17 and all four diverge; at 0.15 all four converge in 32 or 33 steps. The limit belongs to the surface, not to the start. Then go back to **Two valleys**: is that still true there?
6. **Check it on penguins.** Predict: for a fresh trio of penguins, will the loss fall as it did in the lesson, and will w end near the same value? The lab's surfaces are fixed and it has no real-data switch, so this check is on paper (a calculator will do). Use flippers of 186, 210 and 230 mm (1.86, 2.10, 2.30 in units of 100 mm), masses of 3.80, 4.20 and 5.80 kg, start at w = 0 and learning rate 0.1. The gradient is -19.485, so w goes 0, 1.9485, 2.1876, 2.2169, and the loss 21.907, 0.594, 0.273, 0.268. The result is close to the lesson's trio (2.25) and has the same shape: big steps first, then shrinking ones. Now try learning rate 0.3 on paper: w goes 5.846, -3.694, 11.874 and the loss grows at every step. That is divergence, like the bowl near 1.2. The limit here is about 0.23, so each surface has its own limit.
