---
slug: learning-rate-and-trouble
title: Learning rate and trouble
kind: simulator
simulator: learning-rate-lab
minutes: 25
---
::: intro
- Predict, from the learning rate, whether gradient descent will crawl, settle, bounce or blow up.
- Read a plot of the loss against the step to tell which of these is happening, pick a fix, and search for a good rate on a log scale.
- Explain why descent can get trapped in a dip, and what momentum and a changed start do about it.

Before you start: read "Gradient descent".
:::

## The knob that matters most
*Why does one small number decide whether training works?*

You met this rule in Gradient descent: each step moves the point downhill by the slope times a number you choose, the **learning rate** (written lr here):

new x = x - lr × slope

Steep ground gives long steps, and near the bottom the steps shrink by themselves.

The learning rate sets how bold each step is. Too small, and the point heads the right way but crawls: it may need thousands of steps. Too large, and a step jumps past the bottom and can land higher than where it began. In between there is a range where descent is quick and steady. Finding a good value is a common tuning job in machine learning.

> Key idea: the slope says which way to go. The learning rate says how far to go. Only the second is your choice.

## When the step is too big
*Exactly how big is too big?*

For a bowl-shaped curve you can compute the limit. Take f(x) = (h/2)(x - c)², a bowl whose lowest point is at x = c. The number h is the **curvature**: how sharply the bowl bends. A narrow bowl has a large h, a wide one a small h. The slope is h(x - c). Call x - c the distance to the minimum. It is signed: negative when x is left of the minimum. One step changes it like this:

new distance = (1 - lr × h) × old distance

Call (1 - lr × h) the **factor**. What happens depends on it:

- Exactly 0: the point lands on the minimum in one step (lr = 1/h).
- Between 0 and 1: the point creeps in from one side.
- Between -1 and 0: it jumps to the other side each step but lands closer. This is **oscillation**.
- Exactly -1: it bounces between two points forever.
- Below -1: every jump is longer than the last. This is **divergence**.

So a bowl settles only when lr < 2 / h. In the lab, Parabola has h = 1 (limit 2) and Steep parabola has h = 6 (limit 1/3).

> Key idea: the steeper the bend, the smaller the learning rate it tolerates.

::: deeper Where the factor comes from
Let d = x - c be the distance to the minimum. The slope is h × d, so the update gives d_new = d - lr × h × d = (1 - lr × h) × d. The distance shrinks exactly when |1 - lr × h| < 1, which means 0 < lr × h < 2. A curve that is not a bowl still looks like one close to a minimum, with h equal to its second derivative there, so the same limit applies locally. With several directions, the sharpest bend sets the limit for all of them.
:::

## A worked example
*Can we follow four learning rates by hand?*

Take f(x) = (x - 5)² / 2 and start at x = 1. The slope is x - 5 and h = 1, so the factor is 1 - lr. The first step with lr = 1.9 goes like this: slope = 1 - 5 = -4, then x = 1 - 1.9 × (-4) = 8.6. Repeating the rule gives:

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

## Dips and flat places
*Why can descent stop at a point that is not the lowest?*

Gradient descent only reads the slope under its feet. At the bottom of any dip the slope is zero, so the step is zero and the point stops. A dip that is not the lowest is a **local minimum**, as in Gradient descent. The lowest point is the **global minimum**.

[[figure:learning-rate-and-trouble/stuck-ball|The same curve and rate, two starts. Start A ends in the shallow dip; start B reaches the deepest point. The dashed lines mark the floor of each dip.]]

Where you start decides where you end. From A, downhill leads into the shallow dip, and climbing the hump would mean going uphill. A small step never does that.

A **flat region** is a milder trap. The slope there is almost zero, so the steps are tiny and progress crawls, even with a decent rate. The lab has no flat region, but the table below names it for when you meet one.

What to try: start from several places and compare the final loss, or add momentum, described next. A much larger rate can sometimes throw the point across the hump, but it is a gamble that depends on where you start: from the default start it does not help in the lab (the point stays in the shallow dip, then bounces or blows up), while from the far left edge a rate of about 0.8 happens to jump over. Real losses have many more directions and the picture is richer, but flat spots and traps still occur.

## Momentum
*How can a point remember where it was heading?*

**Momentum** gives the point a velocity v that remembers earlier steps:

new v = m × old v - lr × slope, then new x = x + new v

Here m, between 0 and 1, says how much of the old velocity to keep. With m = 0 this is plain descent. The point starts with v = 0.

Try it on the bowl f(x) = (x - 5)² / 2 from x = 1 with lr 0.5 and m = 0.5. The slope is x - 5.

- Step 1: slope = -4, so v = 0.5 × 0 - 0.5 × (-4) = 2 and x = 1 + 2 = 3.
- Step 2: slope = -2, so v = 0.5 × 2 - 0.5 × (-2) = 2 and x = 5. Plain descent is only at 4.
- Step 3: slope = 0, yet v = 0.5 × 2 = 1, so x = 6. The point sails past the bottom.

Think of a heavy ball. On a long, gentle slope the pushes all point the same way, so the ball speeds up. In a zigzag the sideways pushes alternate and partly cancel while the forward push builds. The figure shows a narrow ravine, where plain descent zigzags and momentum 0.5 gets there in fewer steps.

[[figure:learning-rate-and-trouble/momentum-paths|The same narrow ravine and learning rate 0.15, with and without momentum. The ellipses are contour lines, as in Gradient descent. The ring is the start and the large black dot is the minimum. Momentum gets within 0.2 of the minimum in 9 steps, plain descent in 19.]]

The price is overshoot: the ball can sail past the bottom and swing back, so the loss rises and falls in waves. Too much momentum causes this. Momentum can also carry a point over a small hump, which plain descent with a modest rate cannot.

::: deeper Momentum changes the limit
On a bowl with curvature h, descent with momentum m (from 0 up to, but not including, 1) settles when lr × h < 2 × (1 + m). With m = 0.5 that is lr × h < 3, so the steep parabola (h = 6) tolerates lr up to 0.5, instead of 1/3 without momentum. In a quick check, lr 0.45 with m = 0.5 converged, and lr 0.55 did not.
:::

## Reading the loss history
*How can you tell what is going wrong without seeing the landscape?*

A real model has far too many knobs to draw its landscape. You can always plot the **loss against the step**, which this lesson calls the loss history, and its shape names the problem. This table gathers everything above: rates, dips and momentum.

[[figure:learning-rate-and-trouble/loss-curves|Loss against step on the same bowl with four settings. The first three panels share one vertical scale and the fourth reaches four times higher. The third panel uses momentum, from the last section.]]

| The loss history | Likely cause | First thing to try |
|---|---|---|
| Falls slowly and steadily, still falling when you stop, and the point moves one way (check the path) | Rate too small | Raise it, for example by a factor of 3 |
| Falls fast, then goes flat near the bottom | About right | Keep it |
| Rises and falls in waves that keep coming back | Too much momentum | Lower the momentum or the rate |
| Stays flat and high | Rate right at the limit: the point bounces between two places | Lower the rate |
| Grows every step until the numbers are too large for the computer to hold | Rate past the limit | Cut it by a factor of 10 |
| Flat, but not low | Stuck in a dip or a flat spot | Change the start; add momentum |

> Watch out: on a smooth bowl the loss alone can hide a too-large rate. At lr 1.9 the loss falls 19% per step (0.9 × 0.9 = 0.81) even though x jumps from side to side, so it looks like a slow decline, not waves. Plain descent on a bowl makes waves in the loss only with momentum. When you can, look at the path too, as the lab does.

## Choosing a rate in practice
*How do you pick a learning rate when nobody tells you the curvature?*

Try values on a **log scale**: 0.1, 0.03, 0.01, 0.003, and so on. A log scale spaces values by ratios (here each is about a third of the last) instead of by equal differences. You do not know the curvature h in advance, and the limit 2 / h can be large or tiny: a curve 10 times sharper needs a rate 10 times smaller. Evenly spaced guesses (0.1, 0.2, 0.3) all sit near the top of the range: if the right rate is near 0.003, none of them gets close. The figure shows the steep parabola, where one step multiplies the distance by 1 - 6 × lr.

[[figure:learning-rate-and-trouble/log-ladder|Learning rates on a log axis for the steep parabola. Past 1/3 the distance grows instead of shrinking.]]

A common recipe: start with a rate that diverges, then step down the ladder until the loss falls steadily, and keep the largest rate that behaves.

::: deeper Why an exact limit rarely helps, and rate decay
Real losses have no single h. The bend changes from place to place, so the safe rate changes too. That is why people test rates empirically instead of computing 2 / h, and why a rate that works at the start may need to shrink later.

**Learning-rate decay** does that on purpose: bold steps early, careful steps late. On the parabola from x = 1 with lr 1.9, multiplying the rate by 0.8 after each step gives x = 1, 8.6, 3.128, 5.404, 5.011. Without decay, x is 2.3756 after four steps and still swinging. The lab has no decay control, but you can picture it as lowering the rate partway through.
:::

## Three common mistakes
*What do beginners get wrong when tuning?*

- **Judging by one run.** The start position changes the outcome, as the two-dip curve shows. Try a few starts before you decide that a setting is bad or good.
- **Changing many things at once.** If you change the rate, the momentum and the start together and the run improves, you cannot say which change helped. Change one knob, compare, then change the next.
- **Expecting the loss to fall every step.** With momentum, or with noisy data, the loss can rise on a step and still be heading down. Judge the trend over many steps. One small rise among many falling steps is fine. Rises every few steps, roughly one step in four or more (where the lab starts to flag it), are waves and mean too much momentum. A loss that grows on every step and never turns back is different: that is divergence.

::: remember
- The step is lr × slope. On a bowl with curvature h, the rate must stay below 2 / h or the point bounces and then blows up. Search for a rate on a log scale, one knob at a time.
- Read the loss history: slow decline means raise the rate, waves mean lower the momentum or the rate, explosion means cut the rate by ten.
- Descent can get trapped in a local dip, so the start matters. Momentum smooths zigzags and can roll over small humps, but it can overshoot.
:::

@@lab

## Lab: Rolling down a loss curve
A point rolls down a one-knob loss curve. You choose how bold each step is and watch what happens. The plot shows the curve with real loss values on the left axis. The chart below shows the loss against the step (the loss history), and the box above the plot gives a diagnosis with its reason.

### Controls
- **Loss curve:** the shape the point rolls on: Parabola (curvature 1, settles below a rate of 2), Steep parabola (curvature 6, settles below about 0.33), or Two dips (a shallow dip near x = 2.15 and a deeper one near x = 8.13).
- **Learning rate (log scale):** 0.001 to 2.5. Each slider step multiplies the rate by the same factor. The value is shown beside the label. The slider has 300 small steps, so use the arrow keys on it to land on an exact value.
- **Momentum:** 0 to 0.95. At 0 the run is plain gradient descent.
- **Start position:** 0 to 10. You can also click or drag in the plot, or press the arrow keys while the plot is focused.
- **Steps:** how many steps the run lasts, 10 to 200.
- **Too small, Just right, Too big, Overshooting:** set the rate (and momentum 0) to suit the chosen curve. On Two dips, "Just right" is a good rate that still gets trapped.
- **Show the planned run:** faint arrows on the plot and a dashed line on the chart show the whole run in advance.
- **Log scale on the loss chart:** plots the logarithm of the loss. It switches on by itself when losses pass 10,000.
- **Run, Previous step, Next step, Speed** play the run. Changing the curve, rate, momentum, start or steps restarts the run, and picking a curve also sets its start, its Just right rate and momentum 0. The two toggles only redraw. Reset restores the curve, rate, momentum, start and steps, and puts the toggles back (planned run on, log scale off).

On the plot, the teal dot is the start and the teal ring marked "lowest" is the lowest point of the curve. Purple arrows are the steps, and the pink diamond is the current point. A pink ring marked "off the plot" means the point has left the 0 to 10 range.

### Experiments
1. On Parabola press **Just right** and **Run**. The point goes 1, 3, 4, 4.5, 4.75 and the diagnosis says converging. Press **Too small** and run again: after 30 steps x is only 2.04. Turn on the log chart and the loss becomes a straight, gently falling line, because it shrinks by the same factor each step.
2. On Parabola set the rate to 1.9, then 2, then 2.1 with the slider (arrow keys help). At 1.9 the swings shrink. At 2 x bounces between 1 and 9 forever. At 2.1 the diagnosis changes to diverging. Compare with the table in the lesson.
3. Switch to Steep parabola and press **Overshooting** (0.3), then **Too big** (0.4). The limit here is 1/3, so 0.3 is just under it: the point zigzags but still settles. 0.4 is past it, so the point diverges. Both rates were comfortable on Parabola. Then try **Just right** (0.15) and see how quickly it settles.
4. Switch to Two dips and press **Just right**, then **Run**. It stops in the shallow dip and the diagnosis says stuck. Click the plot near x = 6 and run again. Where does it end?
5. On Two dips start at x = 1, set the rate to 0.7, the momentum to 0.9 and Steps to 100. Does the point roll over the hump? Set the momentum back to 0 and compare.
6. On Parabola set the rate to 0.1 and compare momentum 0, 0.5 and 0.9 at 30 steps. Which settles fastest? Which one makes the loss-against-step chart rise and fall in waves?
