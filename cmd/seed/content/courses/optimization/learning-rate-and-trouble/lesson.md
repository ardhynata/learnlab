---
slug: learning-rate-and-trouble
title: Learning rate and trouble
kind: simulator
simulator: learning-rate-lab
minutes: 25
---
::: intro
- Predict, from the learning rate, whether gradient descent will crawl, settle, bounce or blow up.
- Compute the largest learning rate a bowl allows, read a plot of loss against step, and search for a good rate on a log scale.
- Explain how the scale of the data moves that limit, why a dip can trap a run, and what momentum or a new start changes.

Before you start: read "Gradient descent" and skim "Scaling and encoding" (standardizing a column).
:::

## The knob that matters most
*Why does one small number decide whether training works?*

You met this rule in Gradient descent: each step moves the point downhill by the slope times a number you choose, the **learning rate** (written lr here):

new x = x - lr × slope

The learning rate sets how bold each step is, and it has three regimes. Take f(x) = (x - 5)² / 2, lowest at x = 5, and start at x = 1:

- **Too small crawls.** At lr 0.01 five steps only reach x = 1.196, and it takes 437 steps to get within 0.05 of the bottom.
- **Just right is quick and steady.** At lr 0.5 the point goes 1, 3, 4, 4.5, 4.75 and is within 0.05 after 7 steps.
- **Too big diverges.** At lr 2.1 the point goes 1, 9.4, 0.16, 10.324, -0.8564: every jump is longer than the last.

> Key idea: the slope says which way to go. The learning rate says how far to go. Only the second is your choice.

## When the step is too big
*Exactly how big is too big?*

For a bowl you can compute the limit. Take f(x) = (h/2)(x - c)², lowest at x = c. The number h is the **curvature**: how sharply the bowl bends (large for a narrow bowl). The slope is h(x - c). Call x - c the signed distance to the minimum. One step changes it like this:

new distance = (1 - lr × h) × old distance

Call (1 - lr × h) the **factor**. What happens depends on it:

- Exactly 0: the point lands on the minimum in one step (lr = 1/h).
- Between 0 and 1: the point creeps in from one side.
- Between -1 and 0: it jumps to the other side each step but lands closer. This is **oscillation**.
- Exactly -1: it bounces between two points forever.
- Below -1: every jump is longer than the last. This is **divergence**.

So a bowl settles only when lr < 2 / h. In the lab, Parabola has h = 1 (limit 2) and Steep parabola has h = 6 (limit about 0.33).

> Key idea: the steeper the bend, the smaller the learning rate it tolerates.

::: deeper Where the factor comes from
With d = x - c the slope is h × d, so d_new = d - lr × h × d = (1 - lr × h) × d. The distance shrinks exactly when |1 - lr × h| < 1, which means 0 < lr × h < 2. Near a minimum any smooth curve looks like a bowl, with h equal to its second derivative there, so the same limit applies locally. With several directions, the sharpest bend sets the limit for all of them.
:::

## A worked example
*Can we follow four learning rates by hand?*

Take f(x) = (x - 5)² / 2 from x = 1. The slope is x - 5 and h = 1, so the factor is 1 - lr. With lr = 1.9 the first step is: slope = 1 - 5 = -4, then x = 1 - 1.9 × (-4) = 8.6. Repeating the rule gives:

| Step | lr 0.5 | lr 1.9 | lr 2.0 | lr 2.1 |
|---|---|---|---|---|
| 0 | 1 | 1 | 1 | 1 |
| 1 | 3 | 8.6 | 9 | 9.4 |
| 2 | 4 | 1.76 | 1 | 0.16 |
| 3 | 4.5 | 7.916 | 9 | 10.324 |
| 4 | 4.75 | 2.3756 | 1 | -0.8564 |

Now look at the distance x - 5, which starts at -4:

- **lr 0.5** (factor 0.5): -4, -2, -1, -0.5, -0.25. It halves each step.
- **lr 1.9** (factor -0.9): -4, 3.6, -3.24, 2.916, -2.6244. It flips sides but shrinks 10% per step.
- **lr 2.0** (factor -1): -4, 4, -4, 4, -4. It never settles.
- **lr 2.1** (factor -1.1): -4, 4.4, -4.84, 5.324, -5.8564. It grows 10% per step. The loss (x - 5)² / 2 goes from 8 to 17.15 in four steps.

## Choosing a rate in practice
*How do you pick a learning rate when nobody tells you the curvature?*

Try values on a **log scale**: 0.1, 0.03, 0.01, 0.003, and so on, each about a third of the last. You do not know the curvature h in advance, and the limit 2 / h can be large or tiny: a curve 10 times sharper needs a rate 10 times smaller. Evenly spaced guesses (0.1, 0.2, 0.3) all sit near the top of the range: if the right rate is near 0.003, none of them gets close. The lab's **Learning rate (log scale)** slider works this way.

[[figure:learning-rate-and-trouble/log-ladder|Learning rates on a log axis for Steep parabola. Past the limit of about 0.33 the distance grows instead of shrinking.]]

A common recipe: start with a rate that diverges, step down the ladder until the loss falls steadily, and keep the largest rate that behaves. Change one knob at a time, or you cannot say which change helped.

## When the data sets the limit
*Does a rate that works on one dataset work on another?*

Not necessarily: the curvature comes from the data. Fitting a line is the same walk, with the slope w and the intercept b as the parameters. Take the 342 penguins with both a flipper length and a body mass, and let the loss be half the mean squared error. For the slope w, h is the mean of the squared inputs.

[[figure:learning-rate-and-trouble/penguin-scale|The same line fit with flipper length in mm (limit about 0.000049) and standardized (limit 2). The dashed box marks the rates the lab slider offers. The numbers come from the penguin data, not the lab.]]

With flipper length in millimetres the mean of the squares is 40,564, so the sharpest bend is about 40,565 and the limit 2 / h is about 0.000049. The lab's smallest rate, 0.001, is already 20 times past it. After standardizing (see "Scaling and encoding"), both columns have mean 0 and standard deviation 1, so h is 1 and the limit is 2, like Parabola.

> Key idea: the scale of the data sets the largest safe rate. Standardize first, then search the ladder.

::: deeper The penguin check in more detail
On the standardized penguins, from w = 0 and b = 0 the loss is 0.5000. At lr 0.5 it reaches 0.1209 in five steps (the lowest possible is 0.1205). At lr 2.0 it stays at 0.5000, and at lr 2.1 it grows to 17.3 by step 20. With flipper length in millimetres and body mass standardized, a rate of 0.00003 is safe, yet the loss still reads 0.498 after 1,000 steps. The other direction is almost flat (curvature about 0.005), so a rate the steep direction survives barely moves it. One rate cannot suit two very different bends; standardizing makes both 1. On four random halves of the penguins the limit stayed at about 0.000049, so it does not depend on one lucky sample.
:::

## Dips and flat places
*Why can descent stop at a point that is not the lowest?*

Gradient descent only reads the slope under its feet. At the bottom of any dip the slope is zero, so the step is zero and the point stops. A dip that is not the lowest is a **local minimum**; the lowest point is the **global minimum**. On the lab's Two dips curve the shallow dip is near x = 2.15 (loss 2.59), the deepest point near x = 8.13 (loss 1.39), and the hump between them near x = 4.72.

[[figure:learning-rate-and-trouble/stuck-ball|The same curve and rate, two starts. Start A ends in the shallow dip; start B reaches the deepest point. The dashed lines mark the floor of each dip.]]

Where you start decides where you end. At lr 0.1, every start left of the hump ends in the shallow dip and every start to its right ends in the deep one, because climbing the hump means going uphill. A bigger rate is no reliable way out: from a start of 1, even lr 0.7 ends in the shallow dip.

The top of the hump is a flat place: the steps there are tiny, and from a start of 4.8 the loss only falls from 3.65 to 3.51 in 30 steps. "Flat is not the same as lowest" in Gradient descent covers this idea. Here the lesson is that one run tells you about one start only, so try several starts before you judge a setting.

## Momentum
*How can a point remember where it was heading?*

**Momentum** gives the point a velocity v that remembers earlier steps:

new v = m × old v - lr × slope, then new x = x + new v

Here m, between 0 and 1, says how much of the old velocity to keep (m = 0 is plain descent), and v starts at 0. Try it on f(x) = (x - 5)² / 2 from x = 1 with lr 0.5 and m = 0.5, where the slope is x - 5:

- Step 1: slope = -4, so v = 0.5 × 0 - 0.5 × (-4) = 2 and x = 1 + 2 = 3.
- Step 2: slope = -2, so v = 0.5 × 2 - 0.5 × (-2) = 2 and x = 5. Plain descent is only at 4.
- Step 3: slope = 0, yet v = 0.5 × 2 = 1, so x = 6. The point sails past the bottom.

## What momentum does
*Does a remembered velocity help or hurt?*

Think of a heavy ball: steady pushes add up. The price is overshoot, so the loss rises and falls in waves. On Parabola with lr 0.1 and 30 steps, m = 0 leaves the loss at 0.0144, m = 0.5 brings it to 0.000000037, and m = 0.9 overshoots in waves. Momentum can also carry a point over a hump: on Two dips from a start of 1, lr 0.7 with m = 0.9 ends in the deep dip after 100 steps, and with m = 0 it stays in the shallow one. (At the lab's default 30 steps the m = 0.9 run is still oscillating, so give it 100.)

::: deeper Momentum changes the limit
On a bowl with curvature h, momentum m (from 0 up to, but not including, 1) settles when lr × h < 2 × (1 + m). With m = 0.5 that is lr × h < 3, so Steep parabola (h = 6) tolerates lr up to 0.5, instead of 1/3. In a quick check, lr 0.45 with m = 0.5 converged and lr 0.55 did not.
:::

## Reading the loss history
*How can you tell what is going wrong without seeing the landscape?*

A real model has too many knobs to draw, but you can always plot the **loss against the step**, the loss history, and its shape names the problem. The lab's Diagnosis box reads these shapes for you: Too slow, Converging, Oscillating, Diverging or Stuck in a local dip.

[[figure:learning-rate-and-trouble/loss-curves|Loss against step on the same bowl with four settings. The first three panels share one vertical scale and the fourth reaches four times higher. The third panel uses momentum.]]

| The loss history | Likely cause | First thing to try |
|---|---|---|
| Falls slowly and steadily, still falling when you stop | Rate too small | Raise it, for example by a factor of 3 |
| Falls fast, then goes flat near the bottom | About right | Keep it |
| Rises and falls in waves | Too much momentum | Lower the momentum or the rate |
| Stays flat and high | Rate right at the limit: the point bounces | Lower the rate |
| Grows every step until the numbers overflow (become too large for the computer to store) | Rate past the limit | Cut it by a factor of 10 |
| Flat, but not low | Stuck in a dip or a flat spot | Change the start; add momentum |

## What the loss can hide
*When can the loss history mislead you?*

> Watch out: the loss alone can hide a too-large rate. At lr 1.9 the loss falls 19% per step (0.9 × 0.9 = 0.81) even though x jumps from side to side, so it looks like a slow decline. Look at the path too, as the lab does.

With momentum the loss need not fall on every step: one small rise among many falling steps is fine, so judge the trend. Rises every few steps are waves, and a loss that grows every step is divergence.

::: remember
- The step is lr × slope. On a bowl with curvature h the rate must stay below 2 / h or the point bounces and then blows up. The scale of the data sets h, so standardize, then search for a rate on a log scale, one knob at a time.
- Read the loss history: slow decline means raise the rate, waves mean lower the momentum or the rate, explosion means cut the rate by ten.
- Descent can get trapped in a local dip, so the start matters. Momentum can roll over a small hump, but it can overshoot.
:::

@@lab

## Lab: Rolling down a loss curve
A point rolls down a one-knob loss curve. You choose how bold each step is and watch whether the run crawls, settles, bounces or blows up. The lab draws curves, not penguins: Parabola and Steep parabola stand in for the curvature numbers in "When the data sets the limit".

### Controls
- **Loss curve:** Parabola (curvature 1, settles below a rate of 2), Steep parabola (curvature 6, settles below about 0.33) or Two dips (a shallow dip near x = 2.15, a deeper one near x = 8.13). Picking a curve also sets its start, its Just right rate and momentum 0.
- **Learning rate (log scale):** 0.001 to 2.5, each slider step multiplying the rate by the same factor. Use the arrow keys on the slider to land on an exact value.
- **Momentum:** 0 to 0.95. At 0 the run is plain gradient descent.
- **Start position:** 0 to 10. You can also click or drag in the plot, or press the arrow keys while the plot is focused.
- **Steps:** how many steps the run lasts, 10 to 200.
- **Presets:** **Too small**, **Just right**, **Too big** and **Overshooting** set the rate (and momentum 0) for the chosen curve. On Two dips, Just right is a good rate that still gets trapped.
- **Show the planned run:** faint arrows on the plot and a dashed line on the chart show the whole run in advance.
- **Log scale on the loss chart:** plots the logarithm of the loss. It switches on by itself when losses pass 10,000.
- **Run**, **Previous step**, **Next step** and **Speed** play the run. Changing the curve, rate, momentum, start or steps restarts the run; the two toggles only redraw. **Reset** restores the curve, rate, momentum, start and steps, and puts the toggles back.

### Reading the screen
- The plot shows the curve with real loss values on the left axis (**loss f(x)**) and **x (position)** along the bottom. The legend names the marks: **start, lowest** (teal), **steps (solid line)**, **current point** (the pink diamond) and **planned (dashed)** (faint grey arrows). A pink ring labelled "off the plot" means the point has left the 0 to 10 range.
- From step 3 the box above the plot reads **Diagnosis:** followed by Converging, Too slow, Oscillating, Diverging or Stuck in a local dip, with a sentence saying why. Before that it reads "Ready. If you run this setting:" and predicts where the planned run ends. Under it a line gives the step, x, the loss, the learning rate and the momentum.
- The chart **Loss against step** shows the same run: solid for what has happened, dashed for the planned run. Its axes are **step** and **loss**, or **log10 of the loss** when the log scale is on.

### Experiments
1. **Predict:** after 30 steps on Parabola from a start of 1, how far does Too small get? Press **Reset**, then **Too small** (0.01) and **Run**. The point only reaches x = 2.04 and the Diagnosis reads Too slow. Press **Just right** (0.5): x goes 1, 3, 4, 4.5, 4.75 and the Diagnosis reads Converging. Tick **Log scale on the loss chart**: both runs become straight lines, because the loss shrinks by the same factor each step. The Just right line stops at step 22, where the loss drops below 1e-12.
2. **Predict:** what do rates of 1.9, 2 and 2.1 do on Parabola? Set **Learning rate (log scale)** and **Run** each one. At 1.9 the Diagnosis reads Oscillating, each swing about 10% smaller, and after 30 steps x is 4.83. At 2 it also reads Oscillating, but x bounces between 1 and 9 and the swings do not shrink. At 2.1 it reads Diverging and the loss reaches 2,436 by step 30. Press **Too big** (2.2): the loss passes 10,000 and the chart switches to a log scale by itself.
3. **Predict:** which of 0.3 and 0.4 settles on Steep parabola? Both were comfortable on Parabola. Choose Steep parabola, press **Overshooting** (0.3) and run: the Diagnosis reads Oscillating, yet the point settles, each swing about 20% smaller. Press **Too big** (0.4): it reads Diverging, because the limit is about 0.33 and the factor 1 - 6 × 0.4 is -1.4. Then press **Just right** (0.15): the factor is 0.1 and x goes 1.5, 4.65, 4.965, 4.9965. Try **Start position** 0.5, 3 and 9: Too big diverges from every start and Just right converges from every start, so the limit belongs to the curve, not to the start.
4. **Predict:** where does a run on Two dips end from a start of 1, and from a start of 6? Choose Two dips and press **Just right** (0.1). The box already says "stuck in a local dip" before you run it; after the run x sits near 2.15 with loss 2.59. Set **Start position** to 6 and run again: the point heads for x = 8.13, loss 1.39, and the Diagnosis reads Converging. The hump is near 4.72: 4.7 ends in the shallow dip, while 4.8 starts on the flat top and reads Too slow. Now try starts 0.5, 2, 4, 6 and 9 with Just right: the first three end in the shallow dip and the last two in the deep one. The trap belongs to the start.
5. **Predict:** does momentum help or hurt? On Parabola set the rate to 0.1 and compare **Momentum** 0, 0.5 and 0.9 at 30 steps. At 0 the Diagnosis reads Converging with loss 0.0144, at 0.5 it reads Converging much faster (loss 3.7e-8), and at 0.9 it reads Oscillating: the loss rises and falls in waves. Then choose Two dips with **Start position** 1, rate 0.7, **Momentum** 0.9 and **Steps** 100: the point rolls over the hump to near 8.13. With momentum 0 it stays near 2.15.
6. **Predict:** what would the standardized penguin fit do at lr 0.5, 2.0 and 2.1? Its curvature is 1, so Parabola is a fair stand-in. Press **Reset**, choose Parabola, then set 0.5, 2 and 2.1 in turn and run each. At 0.5 the Diagnosis reads Converging, and the loss falls from 8 to 0.0078 in five steps. At 2 it reads Oscillating and the loss stays at 8. At 2.1 it reads Diverging and the loss reaches 2,436 by step 30. The penguins in "When the data sets the limit" start at a loss of 0.5000 and behave the same way: 0.1209 at lr 0.5 after five steps, 0.5000 at lr 2.0, 17.3 at lr 2.1 by step 20. Last, compare the raw flipper limit, 0.000049, with the slider minimum, 0.001. Even the smallest rate in the lab is 20 times past that limit, which is why the penguin columns need standardizing before any search on this slider makes sense.
