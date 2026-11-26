---
slug: causal-lab
title: Causal lab
kind: simulator
simulator: causal-lab
minutes: 30
---
::: intro
- Predict how far a naive observational difference lands from a true effect you set, then compare it with adjusted estimates and a simulated randomized experiment.
- Tell bias from noise by running the same study 200 times, and name what an unmeasured confounder, a collider and thin overlap do to each estimator.
- Size a trial with the power curve, see what peeking does to false positives, and check every result on fresh populations.

Before you start: read "Randomized experiments and power" and "Confounding and treatment effects" in this course.
:::

## What the lab asks
*Why does this lab use made-up people?*

In a real study the true effect is never known, so you cannot grade an estimate. The Causal lab fixes that. It generates 400 people, each with a measured confounder z, a treatment (treated or control) and an outcome y. You set the true effect, so every estimator can be scored against it.

Two ideas from this course meet here. "Confounding and treatment effects" showed that a plain comparison fails when a variable drives both who is treated and the outcome. "Randomized experiments and power" showed that a coin flip repairs this, and how many people a trial needs. The lab starts in a confounded world: z pushes people into treatment (**Confounding strength** 1.5) and raises their outcome. The true effect is +2.00.

[[figure:causal-lab/two-worlds|The same people, two ways of choosing who is treated. In the observed study z steers the choice, and the two groups differ on z by 1.26 standard deviations. After a coin flip the gap is 0.16.]]

The Level 1 penguins have no treatment and no known true effect, so the lab has no Real data switch. What you transfer is the habit: change the seed and check again.

## The naive difference
*Why does an effect of 2.00 show up as 4.15?*

At the start the lab has 201 treated and 199 control people. The **naive difference** is the mean outcome of the treated minus the mean outcome of the control. Here the two means are 4.26 and 0.11, so the naive difference is +4.15, more than double the truth.

The cause is z. Treated people have a mean z of +0.62 and control people of −0.45, a gap of 1.07, or 1.26 standard deviations. In this lab a person's outcome without treatment rises by about 2 for each step of z (the dotted lines show it), so people with a higher z do better even with no treatment at all.

> Worked example: the naive difference is the true effect plus the head start of the treated group. The head start is 2 × 1.07 = 2.15. So the naive difference is 2.00 + 2.15 = 4.15, and the table's Error column says +2.15.

The naive interval is 3.75 to 4.54. It is narrow and it leaves out +2.00, so the table marks it **No** under **Covers truth?**. A narrow interval says the estimate is precise. It does not say it is right.

> Key idea: confounding is a bias, not noise. It does not shrink when you collect more data.

## Adjusting for z
*How do the other estimators get close?*

The three adjustments compare like with like on z. At the start the table gives regression adjustment +1.95, stratification +2.08 and inverse propensity weighting (IPW) +2.03, each with an interval that holds +2.00. Their errors are −0.05, +0.08 and +0.03.

[[figure:causal-lab/default-estimates|The lab's table at its start state. Dots are estimates, bars are 95% intervals, the dashed line is the true effect. Only the naive difference misses it.]]

::: deeper When the effect changes with z
The **Heterogeneity** slider lets the effect change with z. The lab then scores against the average true effect of the sample. At 1.0 that is +2.08, not +2.00, and the detail line in the box above the plot says so.
:::

## Flipping the coin
*What does a randomized experiment change?*

The randomized experiment keeps the same 400 people but lets a coin decide who is treated, 187 treated and 213 control in the first flip. The estimate is +1.68, with an interval of 1.23 to 2.13, so its error is −0.32. That is off by more than the adjusted estimates, but it is not wrong in any way that grows with confounding: z now differs between the groups by only 0.16 standard deviations.

One study is one draw. Press **Run randomized experiment** five more times and the estimate wanders over 2.03, 2.19, 2.13, 2.10 and 1.82, around the truth. Judging an estimator on one study mixes two things, and the next section separates them.

The coin matters only when something confounds. At **Confounding strength** 0 the naive difference reads +1.87 and the randomized one +1.68. Nothing is left to confound, so both are unbiased, and the 0.19 gap between them is about the size of their noise (standard error about 0.23). The Quick Quiz calls two errors equal when they differ by less than that standard error.

## Bias against noise
*What does one study hide?*

An estimator can be wrong in two ways. **Bias** is aiming off: its average over many studies is not the truth. **Noise**, or spread, is wobble: single studies scatter around their own average. **Run 200 studies** repeats the whole experiment on 200 new populations and plots every estimate.

At the start the average estimates and spreads are:

| Estimator | Bias | Spread |
| --- | --- | --- |
| Naive | +2.15 | 0.20 |
| Stratified | +0.22 | 0.16 |
| Regression | 0.00 | 0.12 |
| IPW | +0.06 | 0.27 |
| Randomized | −0.04 | 0.21 |

[[figure:causal-lab/bias-vs-noise|Average estimate over 200 studies, with one spread on each side. Quadrupling the sample from 400 to 1,600 halves the spread and leaves the naive bias where it was.]]

The naive difference is tight and wrong: every study lands near +4.15. The randomized experiment is right on average and wobbles by about 0.21 from study to study. Regression adjustment is the most precise here, but only because the lab's outcome really is a straight line in z, which is what regression fits. Stratification keeps a bias of +0.22 because five groups of z are too coarse to remove all the confounding.

With **Sample size** 1600 the naive spread falls to 0.10 while its bias stays +2.14.

## Traps adjustment cannot fix
*What breaks the adjusted estimates?*

Adjusting removes only the confounding you can name and measure. Turn on **Add an unmeasured confounder** and a hidden variable pushes people into treatment and raises the outcome, and no estimator is told about it. In the first study regression adjustment moves to +3.30, an error of +1.30, and the table marks it **No**. Over 200 studies its bias is +1.70 while the randomized experiment's is −0.02. Randomizing breaks the hidden link too, which no adjustment can.

A single randomized run can still read **No**. With the hidden confounder on, the first flip gives +1.36 with an interval of 0.75 to 1.97. A 95% interval misses by chance 1 time in 20, and the second flip gives +2.01.

## Colliders and thin overlap
*Which adjustments make things worse?*

Turn on **Add a collider (caused by treatment and outcome)** and the row **Adjusting for the collider** appears. Adjusting for it takes the estimate to −0.07, an error of −2.07: the real effect vanishes. Over 200 studies its bias is −2.00.

> Watch out: a tight interval after a careful adjustment says nothing about an unmeasured confounder or a collider. Only your knowledge of how treatment was chosen can.

::: deeper Thin overlap
Lower **Overlap of treated and control** to 0.2 and treatment is almost decided by z. Only 14 of the 206 treated people have a z below 0, and only 11 of the 194 controls have a z above 0. IPW then lands at +4.17, while regression stays at +1.88 because its straight line reaches across the gap.
:::

## Designing a trial
*How many people per group does a trial need?*

Open **Design a trial: power**. The lab asks for a two-group trial of an effect of 0.5 with an outcome spread (sd) of 1, at significance level 0.05 and 50 people per group. The card shows power of 70.5% and says 63 per group reach 80%.

> Worked example: the standard error of the difference is 1 × sqrt(2 / 50) = 0.2. The effect sits 0.5 / 0.2 = 2.5 standard errors from zero. Power is the chance the estimate clears 1.96, which is 2.5 − 1.96 = 0.54 standard errors below its center, so about 70.5%. For 80% the rule from "Randomized experiments and power" gives n = 2 × 2.80² × sd² / effect² = 15.68 / 0.25 = 62.7, which rounds up to 63.

Double the spread to 2 and the same trial has 24.0% power and needs 252 per group, four times as many. Halving the effect to 0.25 does the same. Setting alpha to 0.01 cuts the power at 50 per group to 47.0% and raises the need to 94.

[[figure:causal-lab/power-and-peeking|Left: power against people per group for a spread of 1 and 2. Right: false positives with no real effect when you check several times and stop at the first significant result, against a corrected cutoff.]]

## Peeking
*What does looking early do?*

Switch on **Peek at the results while the trial runs**. The card now simulates 1,200 trials with no real effect, checking in equal batches and stopping at the first significant result. With 5 looks, 14.7% of trials declare a win, not the 5% promised. With 10 looks it is 19.8%, because each look is another chance for luck to cross the line. Testing each look at alpha divided by the number of looks keeps it near 3% (the **Corrected** line).

## Where the lab stops
*What can this lab not tell you?*

The lab is a simple world: one measured confounder, straight lines, known truth. Real studies give you none of that. The tools you practiced are the same ones real studies use: ask how treatment was chosen, randomize when you can, adjust only for what came before treatment and drove both, and plan the sample size and the number of looks beforehand.

> Key idea: any estimate that looks good on one population needs a second look on a fresh one. Press **New population** and ask what survived.

::: remember
- Confounding makes the naive difference biased, and more data does not cure bias. Adjustment fixes what you measured and named, and randomization fixes the rest too.
- Bias is aim and noise is wobble: 200 repeated studies show both. An unmeasured confounder, a collider and thin overlap each break some adjusted estimates, while the randomized experiment stays on target.
- Size a trial before you run it: halving the effect or doubling the spread needs four times the people, and peeking turns a 5% error rate into about 15% with 5 looks.
:::

@@lab

## Lab: causal inference and experiments
The lab generates 400 people with a confounder z that pushes them into treatment and raises their outcome. The true effect is +2.00. You compare an observational estimate with a simulated randomized experiment, repeat the study 200 times, and design a trial. There is no Real data switch: the true effect of a real dataset is never known.

### Controls
- At the top of the Parameters box: **Run randomized experiment** re-assigns the same people by coin flip and switches the plot, legend, status line and table to that experiment. The first press shows the first flip, and each later press flips again. **Run 200 studies** repeats the whole study on 200 new populations with the current settings; while it runs it reads **Stop**. **Show the randomized experiment on the plot** switches between the observed study and the randomized one.
- The groups below open one at a time. **The population** is open at the start. **Confounding strength** (0 to 3, starts at 1.5) is how strongly z pushes people into treatment. **Overlap of treated and control** (0.1 to 1, starts at 1): lower means treatment is almost decided by z. **Seed** (starts at 7) and **New population**, which adds 1 to the seed.
- **Effect, size and traps**: **True effect size** (0 to 4, starts at 2), **Heterogeneity (the effect changes with z)** (0 to 2, starts at 0), **Sample size** (100 to 2000, starts at 400), **Add an unmeasured confounder** and **Add a collider (caused by treatment and outcome)** (both off).
- **Design a trial: power** is closed at the start: **Effect to detect** (0.1 to 1.5, starts at 0.5), **Spread of the outcome (sd)** (0.5 to 3, starts at 1), **People per group** (10 to 500, starts at 50), **Significance level (alpha)** (0.01 to 0.2, starts at 0.05) and **Peek at the results while the trial runs** (off). **Number of looks** (2 to 10, starts at 5) appears only while peeking is on, and then **Effect to detect** and **Spread of the outcome (sd)** are greyed out.
- Any change to the population clears the 200-study chart and starts the coin flips over. **Reset** returns every control to its start and clears the quiz. **Fullscreen** enlarges the lab.
- **Quick Quiz** is the button docked under the Parameters box (a round button at the bottom right on a small screen). It asks: "Confounding is strong. Which estimate will be closest to the true effect: the naive difference or the randomized experiment?" Choose **The naive difference**, **The randomized experiment** or **About equally close**. It answers once a randomized experiment has been run.

### Reading the screen
- The plot has the **Confounder z** on the horizontal axis and **Outcome y** on the vertical axis. The legend lists **Control (199)**, **Treated (201)**, **True effect +2.00**, **Naive difference +4.15** and **Adjusted estimate +1.95**. Dotted lines are the true outcome lines, dashed lines are the two group means, and the solid pair is regression adjustment. A bracket for each effect has the legend entry's color, and its height is that effect.
- The status line reads "Observed study: naive difference +4.15, adjusted estimate +1.95, true effect +2.00." With the randomized experiment shown it begins "Randomized experiment" and the legend counts and numbers describe the re-assigned people. The detail line in the box above the plot gives how far treated and control differ on z, for example "1.26 standard deviations here, and 0.16 once treatment is randomized".
- The table **Estimators against the true effect** has the columns **Estimator**, **Estimate**, **95% interval**, **Error** and **Covers truth?**, and the rows **True effect**, **Naive difference**, **Stratified (5 groups of z)**, **Regression adjustment**, **Inverse propensity (IPW)**, **Adjusting for the collider** and **Randomized experiment**. Error is estimate minus truth. A **No** row is highlighted: its interval leaves out the truth, which happens by chance 1 time in 20. The collider row says **Turn on the collider** until you do, and the randomized row says **Not run yet** until you run it.
- **The study repeated: bias against noise** says "Run 200 studies to see where each estimator lands." and "Nothing run yet". Afterwards each row (Naive, Stratified, Regression, IPW, Collider when on, Randomized) shows one dot per study, a diamond for the average and the numbers "bias +2.15 · spread 0.20", with " · biased" when the bias is clearly not noise. The dashed line is the true effect.
- The card **Power against sample size** shows the power curve, a dashed 80% line and a marker at **People per group**, with a hint such as "50 per group: power 70.5%. 63 per group reach 80%." With peeking on it becomes **False positives when you peek** and its hint reads for example "No real effect, 5 looks: 14.7% false positives, not 5.0%. Corrected: 3.3%."

### Experiments
Start each experiment with **Reset**, so that the coin flips and your numbers match.

1. **Confounding and the naive difference.** Predict: with **Confounding strength** at 1.5, will the naive difference land above, below or near the true +2.00, and what happens at 0? Look at the **Naive difference** row: +4.15, error +2.15, **No**. Then set the slider to 0: +1.87, error −0.13, **Yes**. At 0.5 it is +2.84 and at 3 it is +4.91. Read the detail line and explain the head start with the gap in z (2 × 1.07 = 2.15 at the start).
2. **Flip the coin.** Predict: open **Quick Quiz** and choose which estimate will be closest to the truth. Then press **Run randomized experiment**. The plot switches to Control (213) and Treated (187), and the table row reads +1.68, interval 1.23 to 2.13, error −0.32. The quiz says the randomized experiment was closer: errors +2.15 and −0.32. Press the button five more times: +2.03, +2.19, +2.13, +2.10, +1.82. Now set **Confounding strength** to 0: the quiz answers again and says "About equally close", because the errors, −0.13 and −0.32, differ by less than the standard error. Why does randomizing matter only when there is confounding?
3. **Bias against noise.** Predict: which estimator's dots will scatter the most, and which diamond will sit off the dashed line? Press **Run 200 studies** and wait for it to finish. Naive reads bias +2.15 · spread 0.20 · biased, Stratified +0.22 · 0.16 · biased, Regression 0.00 · 0.12, IPW +0.06 · 0.27 and Randomized −0.04 · 0.21. Then open **Effect, size and traps**, set **Sample size** to 1600 and run again, which takes a few seconds. Naive falls to spread 0.10 but stays at bias +2.14. Why does more data fix the noise and not the bias?
4. **Traps.** Predict: will regression adjustment still land near +2 with a hidden confounder? Open **Effect, size and traps** and turn on **Add an unmeasured confounder**. Regression moves to +3.30 (error +1.30, **No**) and IPW to +3.42. Press **Run randomized experiment**: +1.36, **No** by chance; press again: +2.01. Run 200 studies: Regression bias +1.70, Randomized −0.02. Turn the confounder off and turn on **Add a collider (caused by treatment and outcome)**: **Adjusting for the collider** reads −0.07, error −2.07. Turn that off, reopen **The population** and lower **Overlap of treated and control** to 0.2: IPW +4.17 (**No**) against Regression +1.88. Which of the three traps could you have spotted from the data alone?
5. **Power and peeking.** Predict: if the **Spread of the outcome (sd)** doubles, how many more people per group does the trial need? Open **Design a trial: power**. The start reads 70.5% power and 63 per group for 80%. Set the spread to 2: 24.0% and 252 per group. Set **People per group** to 250: 79.8%. Put the spread back to 1 and **People per group** back to 50, then set **Significance level (alpha)** to 0.01: 47.0% and 94 per group. Put alpha back to 0.05 and switch on **Peek at the results while the trial runs**: with 5 looks 14.7% false positives, and with **Number of looks** at 10, 19.8%. How would you fix the plan?
6. **Fresh populations.** The lab has no Real data switch, so the transfer is a new population. Predict: will the naive difference still be too high on new people, and will the randomized estimate still land near +2.00? Press **New population** and read the table. Seed 8: Naive +4.31 (error +2.31), Regression +2.14. Seed 9: Naive +3.81, Regression +2.10. Now turn on **Show the randomized experiment on the plot** and read the **Randomized experiment** row: +1.84 on seed 9. Type 8 in **Seed** and read it again: +2.30. Both intervals hold the truth. What changed from seed to seed, and what stayed the same? Would one seed have been enough to believe it?
