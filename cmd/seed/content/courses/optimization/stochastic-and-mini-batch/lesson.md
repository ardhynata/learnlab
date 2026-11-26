---
slug: stochastic-and-mini-batch
title: Stochastic and mini-batch updates
kind: simulator
simulator: minibatch-lab
minutes: 25
---
::: intro
- Say how many points one step uses in full batch, mini-batch and stochastic gradient descent, and count the steps each takes in one epoch.
- Explain why a step on a few points is a noisy but fair guess of the full gradient, and how the noise shrinks as the batch grows.
- Predict which method is noisiest and which gets low in the fewest epochs, and explain why noise can help escape a dip but needs a smaller or decaying learning rate.

Before you start: read "Gradients and the loss surface", "Gradient descent" and "Learning rate and trouble".
:::

## Full batch: every point, every step
*What does one step cost when it uses the whole table?*

The last section of "Gradient descent" ended with a promise: one example, or a small group, per step. First, the baseline. For the line y = slope × x + intercept and the mean squared error (MSE), one point with residual r (actual minus predicted) has the gradient (-2 × x × r, -2 × r). **Full batch** gradient descent takes the mean of those gradients over all n points, so each step is exact and the walk is smooth. One pass over all the points is an **epoch**, and a full-batch epoch is one step.

The price is that every step reads every point. The lab's generated data has 80 points, so each step costs 80 point-gradients; a million rows would cost a million.

::: deeper Why one full-batch epoch gives 6.10
The lab's loss is the plain mean squared error on standardized data. Its curvature (how sharply the bowl bends, from "Learning rate and trouble") is 2, so a full step at learning rate 0.05 multiplies the distance to the best line by 1 - 0.05 × 2 = 0.9, and the excess loss (the loss above the lowest possible) by 0.81. The starting loss is 7.42 and the lowest possible is 0.50, so after one epoch the loss is 0.50 + 6.92 × 0.81 = 6.10. The penguin fit in "Learning rate and trouble" used half the MSE, which is why its limit was 2 and this one is 1.
:::

## One point at a time
*What if each step looked at a single point?*

**Stochastic gradient descent** (SGD) takes each step from the gradient of one point. "Stochastic" means it involves chance: the points are shuffled afresh every epoch, and each is used once. Take the three points of "Gradients and the loss surface", (1, 2), (2, 3) and (3, 5), and its line A, slope 1 and intercept 1, with learning rate 0.15. The residuals are 0, 0 and +1.

> Worked example: the gradient of one point is (-2 × x × r, -2 × r). Point 1 gives (0, 0), point 2 gives (0, 0) and point 3 gives (-6, -2). Their mean is (-2, -0.67): the full gradient from that lesson. SGD moves by -0.15 × the gradient of one point. Picking point 1 or 2 changes nothing. Picking point 3 moves the line to slope 1.9 and intercept 1.3, and the MSE rises from 0.33 to 3.28. The full step goes to 1.3 and 1.1, and the MSE falls to 0.22.

One point is a poor guide: here it overshoots. But average the three moves, (0, 0), (0, 0) and (+0.9, +0.3), and you get (+0.3, +0.1), exactly the full step. Over an epoch, the single-point steps add up to roughly the full one.

> Key idea: a single-point gradient is a noisy guess of the full gradient, but its average over the data is the full gradient itself.

## Mini-batch: a group per step
*What sits between one point and all of them?*

A **mini-batch** step uses the mean gradient of a group of b points, where b is the **batch size**. Each epoch the points are shuffled and cut into groups of b, and every group is one step. That gives n / b rounded up, written ceil(n / b), steps per epoch, and the last group is shorter when b does not divide n: with 80 points and b = 30, the groups hold 30, 30 and 20.

| Method | Points per step | Steps per epoch | Point-gradients per epoch |
|---|---|---|---|
| Full batch | 80 | 1 | 80 |
| Mini-batch of 16 | 16 | 5 | 80 |
| SGD | 1 | 80 | 80 |

[[figure:stochastic-and-mini-batch/work-per-epoch|One epoch over 80 points, cut three ways. Each block is one step. The work per epoch is the same; what differs is how often the walk gets to move.]]

Every row does the same 80 point-gradients per epoch. A bigger batch makes each step dearer and exact; a smaller one makes each step cheap and rough, and gives more of them. Batch size is the dial between the two ends: b = n is full batch and b = 1 is SGD. The lab counts steps and epochs, not seconds.

## Noise in the path
*Why does the path wobble, and what makes it wobble less?*

Each group gives a slightly different gradient, so each step is pushed a little off the true downhill direction. That random miss is **noise**. At the lab's start line (slope -1, intercept 2) the full gradient is (-3.42, 4.00), of size 5.26. Over many random groups, the root-mean-square miss is about 7.5 for a single point, 3.7 for a batch of 4 and 1.7 for a batch of 16. Each time the batch is four times larger, the miss about halves.

The lab measures the result as **wobble**: the share of a walk's length that made no progress. 0 is a straight line and a value close to 1 is mostly zigzag. In the default run full batch has wobble 0.00, mini-batch (16) 0.14 and SGD 0.96.

[[figure:stochastic-and-mini-batch/three-paths|The same start, learning rate 0.05 and 10 epochs. Full batch walks straight in 10 steps, mini-batch zigzags a little in 50, and SGD scribbles through 800.]]

::: deeper Why the miss shrinks like 1 over the square root of b
Average b independent misses and their random parts partly cancel: the root-mean-square size of the average is the single-point size divided by the square root of b. Four times the batch halves it, which matches 7.5, 3.7 and 1.7. The groups in an epoch are drawn without replacement, so near b = n the miss falls even faster, and at b = n it is zero.
:::

## Fast start, jittery finish
*Which method gets low first, and what happens at the bottom?*

Here is the default run, with the loss after each epoch:

| Epoch | Full batch | Mini-batch (16) | SGD |
|---|---|---|---|
| 0 (start) | 7.42 | 7.42 | 7.42 |
| 1 | 6.10 | 2.90 | 0.52 |
| 2 | 5.04 | 1.33 | 0.51 |
| 3 | 4.18 | 0.78 | 0.50 |
| 10 | 1.34 | 0.50 | 0.51 |

The lab calls a loss low when it is within 5% of the way from the starting loss down to the lowest possible. Here that is a loss of about 0.84. SGD gets there after 0.14 epochs (11 steps), mini-batch after 3 epochs, and full batch not within 10. So SGD needs the fewest epochs but takes the most steps, 800 against 10. Per step full batch is the best; per epoch of work SGD is.

At the bottom the picture flips. At the best line the full gradient is 0, but one point's gradient still has a root-mean-square size of about 1.8, and a batch of 16 about 0.4. So SGD keeps getting shoved: its epoch-end losses wander between 0.50 and 0.57 while mini-batch settles at 0.50.

## Why noise can help
*Could a push in the wrong direction ever be useful?*

On the lab's surface, a single bowl, noise only costs. But "Learning rate and trouble" showed a curve with two dips, where plain descent from x = 1 settles in the shallow one near x = 2.15 and never climbs the hump at 4.72. The wall of the shallow dip is 1.06 high (loss 3.65 at the hump against 2.59 in the dip); the wall of the deep dip, at x = 8.13, is 2.26 high. A random push can lift the point over the lower wall.

[[figure:stochastic-and-mini-batch/escape|Two dips, learning rate 0.1, from x = 1. Without noise the walk stays in the shallow dip. With random noise added to each gradient (size 4, imitating a small batch) this walk crossed the hump at step 32 and ended near the deep dip.]]

The lab cannot show this, because its line fit has one valley. The noise in the figure is added by hand and only imitates SGD. In a check of 200 seeded walks of 60 steps, 42 ended on the deep side of the hump with noise of that size, while the noiseless walk, which is the same every time, never crosses. Noise does not guarantee a better dip. It makes a leap possible.

## A smaller rate calms the noise
*How does the learning rate decide how hard each jolt is?*

Each jolt is the learning rate times a noisy gradient, so a smaller rate means smaller jolts. In the lab with batch 16, SGD's final loss is 0.51 at rate 0.05 and 0.82 at 0.2, while full batch and mini-batch both reach 0.50. At 0.3 the lab says SGD blew up, meaning its loss passed ten times its starting value, with the other two fine. One point can sit far from the middle, so a step on it alone can fling the line.

::: deeper Why SGD's limit is lower
For one point with input x, the loss surface bends with curvature 2 × (x² + 1), so a step on it is safe only below the rate 1 / (x² + 1). The largest |x| here is 2.54, which gives a limit of about 0.13, against 1 for full batch. A single overshoot is usually pulled back by the next points, so SGD survives somewhat above 0.13; with seed 1 it blew up between 0.28 and 0.30.
:::

## Decaying the learning rate
*How do we keep the help of noise early and lose its cost at the end?*

The usual cure is a **decaying learning rate**: start big, then shrink, for example rate / (1 + decay × epoch). With rate 0.2 and decay 0.5 the rate is 0.2 in the first epoch, 0.13 in the second, 0.08 in the fourth and 0.019 in the twentieth (the formula counts the first epoch as epoch 0). Decay too fast and the early noise, with its chance to leap, is gone too soon. The lab keeps the rate constant, so the next figure is computed with the lab's own math.

[[figure:stochastic-and-mini-batch/decay|SGD for 20 epochs at rate 0.2. A constant rate keeps jolting the loss; a rate that decays with decay 0.5 (rate / (1 + 0.5 × epoch)) settles near the lowest possible loss.]]

::: remember
- Full batch takes one exact step per epoch, SGD takes one step per point, and mini-batch takes ceil(n / b). Every epoch does the same work; the methods differ in how often they move.
- A small batch gives a noisy but fair gradient. The noise shrinks roughly like 1 over the square root of b, and it never vanishes for SGD at a constant rate.
- Noise lets a walk jump out of a shallow dip, but it needs a smaller or decaying learning rate to settle, and SGD blows up at rates that full batch tolerates.
:::

@@lab

## Lab: Full batch, mini-batch and SGD
Three walks start from the same ring with the same learning rate and go downhill on the loss contours of a line fit (slope against intercept). Full batch uses every point per step, mini-batch a group, SGD one point. The numbers below are for the defaults on generated data: **Learning rate** 0.05, **Batch size (mini-batch)** 16, **Epochs** 10 and **Seed** 1. Press **Reset** to get them back.

### Controls
- **Data:** **Generated data** (80 points with an upward trend) or **Penguins (real)** (flipper length against body mass, both standardised; 342 of the 344 penguins, as 2 rows have missing values). The note under it says which is loaded.
- **Learning rate:** a log-scale slider from 0.005 to 0.59. The badge shows the rate in use, and the arrow keys move it one notch at a time.
- **Batch size (mini-batch):** from 2 up to the number of points (80, or 342 on the penguins). At the top, the mini-batch path is the full-batch path.
- **Epochs:** 1 to 30.
- **Seed:** 1 to 999. It sets the order in which SGD and mini-batch pick points. With generated data it also sets the sample; with the penguins it changes only the order.
- **Run** replays the walks one epoch at a time; it becomes **Pause** and then **Run again**. **Previous step** and **Next step** move one epoch, and **Speed** sets the pace. Changing a setting recomputes everything and shows the finished walks. **Fullscreen** enlarges the lab.
- **Quick Quiz** is the button under the settings card (a round button at the bottom right on a phone). It asks which path is noisiest and which gets low in the fewest epochs. Pick an answer, then press **Check answer**.

### Reading the screen
- The status line reads, for example, "Epoch 10 of 10 · final loss: full batch 1.34, mini-batch 0.50, SGD 0.51" ("current loss" while a replay runs). The line under it gives the **Learning rate**, batch size and number of points.
- The plot **Full batch, mini-batch and SGD** shows loss contours over **Slope (standardised)** and **Intercept (standardised)**, the **Start** ring and the **Best line** diamond. During a replay a ring, a diamond and a cross mark where full batch, mini-batch and SGD are now.
- The chart **Loss after each epoch** plots **Epoch** against **Loss**. The dashed line is **Lowest possible loss**. If a loss is higher than the chart goes, a triangle sits on its top edge.
- The table **Steps, loss and wobble of the three optimisers** has the columns **Optimiser**, **Steps taken**, **Final loss** (**Loss so far** while a replay runs), **Wobble** and **Epochs to a low loss**. A run that passes ten times its starting loss shows **blew up**, and a run that never gets low shows **not reached**.

### Experiments
1. **Who is noisiest, and who is quickest?** Predict: open the **Quick Quiz** and pick which path is noisiest and which reaches a low loss in the fewest epochs. Then press **Check answer**. In the table, **Wobble** is 0.00, 0.14 and 0.96, and **Epochs to a low loss** is **not reached**, 3.00 and 0.14, while **Steps taken** is 10, 50 and 800. Explain why SGD wins on epochs but loses on steps.
2. **Epoch by epoch.** Predict: after one epoch, how much of the way down is each walk? Press **Next step** once, then twice. The status line reads "current loss: full batch 6.10, mini-batch 2.90, SGD 0.52", then 5.04, 1.33 and 0.51. Check full batch by pencil: the excess loss over 0.50 shrinks by 0.81 per step, so 6.92 × 0.81 + 0.50 = 6.10.
3. **Batch size.** Predict: what happens to wobble and to the epochs needed as **Batch size (mini-batch)** goes from 2 to 40? Try 2, 4, 8 and 40. **Steps taken** is 400, 200, 100 and 20, **Wobble** is 0.89, 0.73, 0.43 and 0.01, and **Epochs to a low loss** is 0.30, 0.75, 1.50 and 7.50. Then set 80: the detail line says the batch size equals the number of points, and the mini-batch row equals full batch.
4. **A bigger learning rate.** Predict: which walk fails first as **Learning rate** rises? Set 0.2: the status line reads full batch 0.50, mini-batch 0.50 and SGD 0.82. Set 0.3: SGD shows **blew up**, and the detail line tells you to lower the rate. Full batch is still fine, and at 0.5 it reaches a low loss after 1.00 epoch, while SGD still blows up. Now set **Seed** to 2 at 0.3: it is a new sample, so the other losses change, but SGD blows up again. Explain why a rate that is gentle for full batch can be too big for steps on single points.
5. **A smaller learning rate, more epochs.** Predict: does a smaller rate calm SGD, and what does it cost full batch? Set **Epochs** to 20 and try **Learning rate** 0.2, 0.05 and 0.01. SGD's final loss is 0.83, 0.55 and 0.50, while full batch ends at 0.50, 0.60 and 3.58. Explain the trade: the small rate silences SGD's jitter but leaves full batch crawling.
6. **Real penguins and a fresh seed.** Predict: will the same ordering hold on real data? Press **Reset**, set **Data** to **Penguins (real)** and read the table: **Steps taken** is 10, 220 and 3,420, and SGD is again the noisiest and quickest in epochs. The lowest possible loss is now 0.24, and the final losses are 1.15, 0.24 and 0.24, with **Epochs to a low loss** of **not reached**, 0.64 and 0.04. Now set **Seed** to 2 and then 3: only the order changes. SGD's final loss moves to 0.27 and 0.28 and its wobble stays at 0.99, so SGD is still the noisiest and quickest in epochs, while mini-batch stays at 0.24. Set **Data** back to **Generated data** and try **Seed** 2 to 6: the same ordering holds each time. A claim that survives a new order, a new sample and real data is worth believing.
