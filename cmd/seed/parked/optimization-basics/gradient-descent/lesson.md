---
slug: gradient-descent
title: Gradient descent
kind: simulator
simulator: gd-contours
minutes: 25
---
::: intro
- Explain why gradient descent steps against the gradient, which points uphill.
- Compute one update by hand with the rule new value = old value - learning rate × gradient.
- Read contour lines and a run's verdict, explain why a small gradient does not guarantee the lowest point, and see how fitting a model is this same walk.

Before you start: read "Loss functions".
:::

## Walking downhill
*How can a computer find a low point without ever seeing the whole landscape?*

Imagine standing on a hillside in thick fog. You cannot see the valley, but you can feel which way the ground tilts under your feet. If you keep stepping in the downhill direction, you usually end up on low ground.

Gradient descent does exactly this with the **loss**, the number that says how wrong a model is right now (smaller is better). The loss depends on the model's **parameters**, the numbers it is allowed to adjust. Picture the loss as the height of a landscape and the parameters as your position on it. Training means walking to a low spot.

The computer never sees the whole landscape. It only knows the loss and the tilt at its current position. That is enough, because the tilt tells it which way is down.

> Key idea: gradient descent repeats one small move. Measure the slope here, take a step downhill, then measure again.

## One parameter: the slope decides
*How does the slope tell us which way to move?*

Start with a single parameter, x, so the landscape is a curve. The **slope** at a point says how fast the curve rises as x grows. A positive slope means the curve rises to the right, so downhill is to the left. A negative slope means the curve falls to the right, so downhill is to the right. A steeper slope means the ground tilts more.

[[figure:gradient-descent/slope-step|The loss here is (x - 5)² / 2, used again in the worked example below. At x = 1 the slope is -4, so the curve falls to the right. With learning rate 0.5 the step is 0.5 × 4 = 2 to the right, to x = 3.]]

The sign of the slope gives the direction. The size of the slope says how steep it is here, which is a reasonable guide to how far we can afford to move: a steep slope earns a long step and a gentle slope a short one. A number you choose, the learning rate (0.5 in the figure), scales the step. Both ideas go into the update rule next.

## The update rule
*What exactly do we do with the slope?*

With several parameters the slope becomes the **gradient**: one slope per parameter, taken together as an arrow. With one parameter it is just the slope. The gradient points **uphill**, toward higher loss. To go downhill we step the opposite way, so we subtract it:

```
new x = x - learning rate × gradient
```

The **learning rate** is a number you choose, such as 0.5. It scales every step. Steep ground has a large gradient, so the step is long. Near a flat bottom the gradient is small, so the steps shrink by themselves.

> Watch out: the gradient is not the step. The step is the gradient multiplied by the learning rate and pointed the other way.

## A worked example
*Can we run gradient descent with a pencil?*

Take the loss f(x) = (x - 5)² / 2. Its lowest point is x = 5, where the loss is 0, and its slope is x - 5. Calculus gives a slope formula for each loss; here we hand it to you, and software computes it for real models. Start at x = 1 with learning rate 0.5.

| Step | x | Loss | Gradient (x - 5) | Move (-0.5 × gradient) | New x |
|---|---|---|---|---|---|
| 0 | 1 | 8 | -4 | +2 | 3 |
| 1 | 3 | 2 | -2 | +1 | 4 |
| 2 | 4 | 0.5 | -1 | +0.5 | 4.5 |
| 3 | 4.5 | 0.125 | -0.5 | +0.25 | 4.75 |

Each step halves the distance to 5 (4, then 2, 1, 0.5, 0.25), because new x - 5 = (x - 5) - 0.5 × (x - 5) = 0.5 × (x - 5). The loss drops from 8 to 0.125 in three steps.

::: deeper A worked example with two parameters
Let the loss be f(x, y) = (x - 5)² + (y - 5)², a round bowl. It has no ½, so each slope is twice as large: the gradient is (2(x - 5), 2(y - 5)). Start at (1.5, 8) with learning rate 0.25. The starting loss is (1.5 - 5)² + (8 - 5)² = 12.25 + 9 = 21.25.

1. The gradient is (-7, 6). The move is -0.25 × (-7, 6) = (+1.75, -1.5), so the point goes to (3.25, 6.5). The loss falls from 21.25 to 5.3125.
2. The gradient is (-3.5, 3). The move is (+0.875, -0.75), so the point goes to (4.125, 5.75). The loss is now about 1.33.

The same rule runs on every parameter at once, each using its own slope.
:::

## Two dimensions: contour lines
*How do we draw a landscape with two parameters on flat paper?*

With two parameters the loss is a surface. We draw it like a hiking map, with **contour lines**: each line joins points that have the same loss. Here the lines are drawn at equal steps of loss, so where lines are packed close together the surface is steep, and where they are far apart it is gentle. Rings around one spot mark a low point here (on other maps they could mark a peak).

At any point the gradient is an arrow that points straight uphill. It crosses the contour line through that point at a right angle: along a contour line the loss does not change, so the uphill direction has no part pointing along the line. The step goes the opposite way.

[[figure:gradient-descent/contour-gradient|The gradient (pink) crosses the contour line at a right angle and points uphill. The first step (teal) goes the other way. The pink arrow's length is not to scale; only its direction matters.]]

> Watch out: on an oval surface the downhill arrow does not point at the lowest point. It points down the steepest way from where you stand, and that can be sideways to the goal.

## Bowls, ravines and zigzags
*Does every surface behave like a round bowl?*

On a **round bowl** the steepest way down points at the lowest point, so the path is straight. On a **narrow ravine**, which is steep across and gentle along, the steepest way down points mostly at the opposite wall. With a big enough learning rate, one step crosses the ravine and lands on the other side, the next step points back, and the path zigzags while it creeps along the floor.

[[figure:gradient-descent/bowl-vs-ravine|The same method on two surfaces. The bowl gives a straight path (learning rate 0.25). The ravine gives a zigzag (learning rate 0.14, smaller because 0.25 would be too big there).]]

The gradient describes only the ground right here, so a long step can overshoot and land higher than it started. Small steps trade speed for safety.

> Watch out: do not expect a straight path. A zigzag in a ravine is normal. It does not mean something is broken. A smaller learning rate stops the zigzag, but it makes the walk slower.

::: deeper Why the ravine zigzags, in numbers
The ravine's loss is (x - 5)² / 2 + 6 (y - 5)², so its slopes are x - 5 and 12 (y - 5). Each step multiplies the distance from the floor by a fixed factor: 1 - learning rate for x, and 1 - 12 × learning rate for y. At learning rate 0.14 the factors are 0.86 and -0.68.

The minus sign is the zigzag: the y distance flips sides every step. From 3.5 it goes to -2.38, then 1.62, then -1.10, shrinking each time. The x distance shrinks slowly (0.86 per step), which is why the path creeps along. With a small enough learning rate the y factor stays positive and the zigzag disappears. Experiment 4 in the lab shows this, and the next lesson shows how big a learning rate can get before the swings grow.
:::

## Knowing when to stop
*When has gradient descent arrived, and is arriving the same as winning?*

At a low point the ground is flat, so the gradient is zero and the update changes nothing. It is rarely exactly zero in real problems, so a run has **converged** when the gradient size (the length of the arrow) is very small and the point has stopped moving. We stop then, when the loss stops improving, or at a step limit.

A run **diverges** when the loss keeps growing and ends far above where it started. One that swings without getting lower, such as hopping between two spots with the same loss, is "not settling" in the lab. Otherwise the lab says "still moving": the gradient is not small yet. The loss usually falls, but a too-big step can raise it for a while.

Flat ground also appears at the bottom of a shallow valley. Gradient descent only feels the slope under its feet, so it cannot tell a shallow valley from the deepest one. Ending in a shallow valley is called a **local minimum**; the next lesson looks at how to deal with it.

> Key idea: a small gradient means "flat here". It does not mean "lowest possible".

## Fitting a model
*How does this walk fit a real model?*

A model has parameters. A straight line, prediction = w × input + b, has two: its slope w and its intercept b. For any choice of w and b, the loss function measures how far the line's predictions are from the data. The data stay fixed, so the loss is a function of the parameters alone. That is a landscape over w and b, exactly like the contour maps in this lesson.

Do not mix up two slopes: w is the slope of the line, and the gradient is the slope of the loss. Gradient descent starts from a guess, finds the gradient for each parameter, and updates all of them at once: new w = w - learning rate × (gradient for w), and the same for b. Repeat, and the line improves. Real models can have millions of parameters; the rule is the same, though we cannot draw the map.

::: deeper Batch, mini-batch and stochastic
The loss over a data set is an average of the loss on each example. **Batch** gradient descent computes the gradient from every example before each step: exact, but slow on large data. **Stochastic** gradient descent uses one random example per step: each step is cheap but noisy. **Mini-batch** uses a small random group, such as 32 examples, and is the usual compromise. Noisy steps wiggle, yet on average they still point downhill. The lab shows the exact gradient, as in batch descent.
:::

::: remember
- Each step is new value = old value - learning rate × gradient: the gradient points uphill, so we subtract it, and the learning rate scales the step.
- Contour lines map a surface with two parameters: packed lines mean steep. The path is straight on a round bowl and zigzags in a ravine.
- A run stops when the gradient is almost zero, which may be only a shallow valley. Fitting a model is this same walk over the loss landscape of its parameters.
:::

@@lab

## Lab: walk downhill on a loss surface
The plot is a map of a loss surface. The two axes are two parameters, and each contour line joins points with the same loss. The ring is where you start, and the diamond is the lowest point. The **pink arrow** is the gradient: it always points uphill, and its length only shows direction. The **teal arrow** is the next step, drawn at its true length and pointing downhill.

### Controls
- **Loss surface** chooses Round bowl, Narrow ravine or Two valleys. Picking one resets the start and sets a learning rate that suits it.
- **Learning rate** is a slider on a log scale, from about 0.003 to 2. The note under it says roughly where the run stops converging on the surface (with momentum 0).
- **Momentum (optional extra)** runs from 0 to 0.95. It keeps a share of the last step, like a heavy ball rolling downhill, and the next lesson explains it. At 0 it is plain gradient descent.
- **Click or drag the plot** to move the start. With the plot focused, the arrow keys move it by 0.25, or by 1 with Shift.
- **Run** (it becomes **Pause** while running, and reads **Run again** when the run has ended, which starts over from the start point), **Next step**, **Previous step** and **Speed** play the walk. **Reset** puts everything back to the defaults, including the speed.
- Changing any setting puts the walk back at step 0; press **Run** again.

### Readouts
- The status line shows the step number, the loss, the gradient size, and a verdict: converged, still moving, diverging or not settling. These are the words from "Knowing when to stop".
- On Two valleys, a small ring marks the shallow valley, next to the diamond for the lowest point.
- The chart **Loss at each step** plots the loss against the step number. Pink dots along its top edge mean the loss is off the chart.

### Experiments
1. **One step at a time.** On Round bowl with the defaults (learning rate 0.25), press Next step three times. The loss reads 21.250 at the start, then 5.313, 1.328 and 0.332, the same numbers as the two-parameter example in the Go deeper fold of "A worked example" (start (1.5, 8), loss (x - 5)² + (y - 5)², learning rate 0.25). The gradient size reads 9.220, then 4.610, 2.305 and 1.152, halving each time. Watch the teal arrow shrink while it keeps pointing at the lowest point.
2. **Too small, or just right.** Still on the bowl, set the learning rate near 0.1 and press Run: it converges, but takes 24 steps. Near 0.5, the first step lands on the lowest point. Which setting would you pick for a real problem?
3. **Too big.** At 0.89, the point jumps across to the other side on each step and still converges, in about 26 steps. At 1.0 the verdict is "not settling": the point hops between two spots with the same loss. At 1.2 it diverges and the loss grows. Look for the pink dots on the chart. Just above 1.0 (try 1.1) the loss rises for a few steps while the status still says "still moving", until it has grown far enough to count as diverging.
4. **The zigzag.** Choose Narrow ravine (learning rate 0.14) and press Run. The path crosses the valley floor on every step, and the verdict is "converged" after about 30 steps. Now set the learning rate near 0.05. The path stops crossing but needs about 86 steps. At 0.2 it diverges. Optional: with 0.05, try momentum 0.8 and compare the step counts (about 54 against 86).
5. **Two valleys.** Choose Two valleys and press Run. Look at the status line and where the path ends: it settles in the shallow valley and the verdict says converged, but not at the lowest point. Click to place the start near the middle of the plot (around 5 on the horizontal axis) and move it a little to either side. Where does the start have to be for the run to end in the other valley?
6. **Where the arrows point.** On Round bowl, drag the start to a few places. The teal arrow always points at the lowest point, and it is longer when the start is farther away. Then choose Narrow ravine and do the same: compare the pink and teal arrows with the direction of the lowest point. Which way do they point?
