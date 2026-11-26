---
slug: bootstrap-lab
title: Bootstrap lab
kind: simulator
simulator: bootstrap-lab
minutes: 25
---
::: intro
- Predict how much a measured accuracy moves from sample to sample, then read that spread in the lab.
- Build a bootstrap interval from one sample and compare its width with the spread of many samples.
- Run 200 experiments to see how often a 95% interval contains the true accuracy, then repeat the idea on the real penguins.

Before you start: read "Sampling variability and the bootstrap".
:::

## What the lab asks
*What can you do here that no real project lets you do?*

The last lesson said that a score on one test set is one draw, and that the bootstrap builds an interval from that single draw. This lab lets you check both claims, because it gives you what a real project never has: the true answer.

The lab holds a population of 5,000 cases from a model that is right on exactly 4,250 of them, so its **true accuracy** is 85.0%. You can draw samples of n cases from it, with replacement, as often as you like. It starts with 200 samples of n = 100, each one a test set of 100 cases.

The first screen shows these numbers:

| What | Value |
|---|---|
| Middle 95% of the 200 sample accuracies | 78.0% to 92.0% |
| Spread of those accuracies (standard deviation) | 3.7 points |
| Textbook standard error | 3.6 points |
| Last sample | 83.0% right (83 of 100) |
| Bootstrap 95% interval of that sample | 74.5% to 90.0% |

[[figure:bootstrap-lab/default-screen|The lab's first screen. Bars: the 200 sample accuracies. Shaded: their middle 95%. Dashed line: the true accuracy. Top bar: the bootstrap interval of the last sample, with a diamond at its accuracy.]]

The next sections explain each line, then test it. Every experiment in the lab guide starts with a prediction.

## The pile of sample accuracies
*How far does one model's score move from sample to sample?*

Each bar in the histogram is the share of the 200 samples that scored that accuracy. The pile is centered on the dashed line, the true accuracy of 85.0%. The lowest sample scored 71.0% and the highest 94.0%. The most common score, exactly 85.0%, came up in 25 of the 200 samples, so the tallest bar is 12.5% tall. Every sample is a fair test set, yet most are off by a few points.

The shaded stripe is the **middle 95%** of the pile: cut the lowest 2.5% and the highest 2.5% of the samples, and what is left runs from 78.0% to 92.0%, which is 14.0 points wide.

The table gives two numbers to compare. The spread of the pile, as a standard deviation, is 3.7 points. The textbook standard error is 3.6.

> Worked example: SE = sqrt(0.85 × 0.15 / 100) = sqrt(0.001275) = 0.0357, or 3.6 points. The middle 95% lies 1.96 standard errors either side of the truth: 1.96 × 3.57 = 7.0, so 85.0 ± 7.0 gives 78.0 to 92.0.

The formula and the pile agree. The difference is that in real work you cannot draw the pile.

## One sample and its bootstrap
*What can a single sample tell you about the wobble?*

A real project has one test set. The lab keeps the **last sample** you drew, here 83 of 100 right, and bootstraps it: it resamples those 100 cases with replacement **B** = 500 times, computes the accuracy of each resample, and cuts the lowest and highest 2.5%. The result is the bar along the top: 74.5% to 90.0%, 15.5 points wide. The outline is the histogram of the 500 resample accuracies.

[[figure:bootstrap-lab/two-routes|Two routes to a width. With the whole population you can draw the pile; with one sample you can only resample it. Both give about 14 to 16 points.]]

Notice what moves. The pile sits on the truth, 85.0%. The bootstrap interval sits on the sample: its diamond is at 83.0%, not 85.0%. Draw another sample and the interval slides with it, while its width stays near the width of the pile. Press **Draw one sample** three times from the start and the last sample scores 88.0%, 87.0% and 84.0%, with intervals of 82.0% to 94.0%, 80.0% to 93.0% and 77.0% to 91.0%: widths of 12.0, 13.0 and 14.0 points. Each press adds the new sample to the pile (the pile grows from 200 to 203 samples) and makes it the last sample, the one the bootstrap works on.

Changing B hardly matters. For the same sample, B = 100 gives 75.0% to 89.0% and B = 1,000 gives 75.0% to 90.0%. More resamples smooth the estimate, but they add no new cases.

## Do the intervals keep their promise?
*If you build an interval from every sample, how often does it contain the truth?*

Last lesson warned that the 95% belongs to the method, not to one interval. Here you can measure it, because the truth is known. **Run 200 experiments** draws 200 fresh samples, bootstraps each one with B resamples, and counts the intervals that contain 85.0%.

From the first screen, the lab reports 97.5%: 195 of the 200 intervals contain the true accuracy and 5 miss. The coverage picture draws the first 60 of them, and the misses are the thick lines with a cross.

[[figure:bootstrap-lab/coverage-lines|The first 60 of the 200 experiments. Two intervals miss the dashed true-accuracy line. All 200 together: 195 contain it, 97.5%.]]

Press the button again and the share changes: 95.5%, then 96.5%. None of these is exactly 95%, and none should be. Each run is only 200 experiments, so its share wobbles by about 3 points; the lab calls 97.5% close to the promise.

::: deeper Why 200 experiments cannot read exactly 95%
The share of covering intervals is a measured proportion, so it has a standard error too: SE = sqrt(0.95 × 0.05 / 200) = 0.0154, and 1.96 × 0.0154 = 0.030, about 3 points. A run between 92% and 98% is in line with a 95% method.
:::

## Four times the cases
*What buys a narrower interval?*

In the lab, change **Sample size n** and watch the pile and the bootstrap interval. The pile follows the rule from the last lesson: the textbook standard error falls from 3.6 points at n = 100 to 1.8 at n = 400 and to 1.1 at n = 1,000, while at n = 20 it is 8.0.

[[figure:bootstrap-lab/quadruple|The middle 95% of the sample accuracies, on average, for five sample sizes. Each step of four times the cases halves the width.]]

> Worked example: the width of the middle 95% is 2 × 1.96 × SE. At n = 100 that is 2 × 1.96 × 3.57 = 14.0 points. At n = 400 it is 2 × 1.96 × 1.79 = 7.0 points. Four times the cases gives half the width, because n sits under a square root.

The bootstrap interval follows the same rule, since it is built from the same cases: from the first screen, going to n = 400 leaves an interval about 7 points wide, half of the 15.5 you saw at n = 100. Every extra case costs the same, but it buys less and less width. That is why the lab's Quick Quiz asks about quadrupling n: guess before you look.

## The real penguins
*Does the same idea hold when the model is a real classifier?*

Set **Data** to **Penguins (real)**. The population is now 342 of the 344 penguins in the table (two rows have missing measurements and are left out). A fixed 5-nearest-neighbors classifier of species, using flipper length and body mass, classifies each penguin from all the others, and a case counts as right when the species is predicted correctly. It is right on 263 of the 342 penguins, so the true accuracy is 76.9%.

With n = 100 the textbook standard error is sqrt(0.769 × 0.231 / 100) = 0.0421, or 4.2 points, larger than the 3.6 of the generated data. The reason is the product p × (1 - p): it is 0.178 here and 0.128 at 85%, and it is largest when accuracy is near 50%.

The lab shows the pile at 68.0% to 85.0%, 17.0 points wide. The last sample scores 79.0% and its bootstrap interval is 71.0% to 87.0%. Running 200 experiments gives 97.0%.

> Watch out: this population is the 342 penguins themselves, so 76.9% is the accuracy on them, not on all penguins in the world. Real penguins are a sample too.

## What the lab leaves out
*Which parts of real life does this lab not show?*

The lab makes things easy on purpose, and the last lesson's warnings still apply to your own projects.

- **Independent cases.** Every draw is independent. Rows from the same person, place or day are not, and then the intervals come out too narrow.
- **One lucky sample.** An interval sits on its sample: the one that scored 88.0% gave 82.0% to 94.0%, shifted above 85.0%. With one sample you never know which side you are on.
- **A fixed population.** The lab's population never changes. A test set unlike the cases the model will meet is not a sampling problem, and no resampling fixes it.

Use the lab to build a feeling for how wide an interval should be at your sample size. Then report the score, the number of cases and the interval together.

::: remember
- Many samples from a known population give the pile: its middle 95% is about 1.96 standard errors either side of the truth, and four times the cases halves its width.
- One sample, resampled B times, gives an interval of about the same width, centered on that sample instead of the truth. More resamples do not shrink it.
- Across 200 experiments about 95% of the intervals contain the true accuracy, give or take 3 points. Check the idea on real data and a fresh draw before you believe it.
:::

@@lab

## Lab: sampling variability and the bootstrap
The lab starts on generated data: a population of 5,000 cases from a model whose true accuracy is exactly 85.0% (4,250 right). It has already drawn 200 samples of 100 cases and bootstrapped the last one. Everything on screen is seeded, so a fresh load and **Reset** show the same numbers.

### Controls
- **Data** switches between **Generated data** and **Penguins (real)**. Switching starts a new pile and clears the coverage result.
- **Sample size n** (20 to 1000, step 10; starts at 100) is the number of cases in each sample. Changing it starts a new pile of **Number of repeated samples** new samples and clears the coverage result.
- **Number of repeated samples** (10 to 1000, step 10; starts at 200) sets how many samples **Draw 200 samples** takes. The button's label follows this slider.
- Under the caption **Draw samples**: **Draw one sample** adds one sample to the pile. **Draw 200 samples** starts a new pile of that many. **Clear samples** empties the pile, the last sample and the coverage result.
- **Bootstrap resamples B** (100 to 1000, step 100; starts at 500) is how many resamples the bootstrap takes from the last sample. Changing it clears the coverage result.
- **Show the bootstrap resamples** (starts on) shows or hides the outline of the resample accuracies.
- **Run 200 experiments** is in the card **Do the intervals keep their promise?**. Each experiment draws a fresh sample, bootstraps it with B resamples and checks whether its 95% interval contains the true accuracy. It runs in the background; the button stays on screen but does nothing until the run ends.
- **Fullscreen** enlarges the lab. **Reset** returns to generated data, n = 100, 200 samples, B = 500, the toggle on, and clears the Quick Quiz.
- **Quick Quiz** is the button under the settings card (a round button at the bottom right on a phone). It asks "If you quadruple the sample size, what happens to the width of the interval?" with the options **It stays about the same**, **It becomes about half as wide** and **It becomes about a quarter as wide**. Pick an answer first. The verdict appears once you have looked at two sample sizes about four times apart, for example 100 and 400.

### Reading the screen
- The histogram's x axis is **Accuracy of a sample (share right)** and its y axis is **Share per bar (%)**. The legend names the **Sample accuracies (bars)**, the dashed **True accuracy**, the **Middle 95% of the samples (shaded)**, the diamond **Last sample**, and the **Bootstrap interval (bar) and resamples (outline)**.
- Two lines above the plot give the numbers: **Middle 95%** with its range, and **Bootstrap 95% interval** with its range. On a narrow screen they shorten to a dash, as in "Middle 95%: 78.0% – 92.0%".
- Below the plot, the status line reads "200 samples of 100 cases. The middle 95% of their accuracies is 78.0% to 92.0%; the true accuracy is 85.0%." The detail line reads "Last sample: 83.0% right (83 of 100). Bootstrap 95% interval from 500 resamples: 74.5% to 90.0%, which contains the true accuracy."
- Two notes sit under the legend: how a pile is started, and the population (on the generated data, "5,000 generated cases ... 85.0% (4,250 right, the rest wrong)"). If the penguin data cannot load, a warning line above the plot says so and the generated data is shown.
- In the card **Do the intervals keep their promise?** each line is the bootstrap 95% interval of one experiment, the first 60 shown. A line that misses the dashed true-accuracy line is thick and marked with a cross; the legend reads **contains the truth** and **misses it (×)**. Above the picture, the meter has a dashed mark at 95%, and the readout says, for example, "97.5% of the 200 intervals contain the true accuracy ..." and whether that is close to the promise.
- The table **The numbers behind the picture** has the rows **Population size**, **True accuracy**, **Sample size n**, **Samples drawn**, **Middle 95% of the sample accuracies**, **Spread of the sample accuracies (standard deviation, in points)**, **Textbook standard error √(p(1 − p)/n), in points**, **Accuracy of the last sample**, **Bootstrap 95% interval of the last sample**, **Width of that interval, in points** and **Does that interval contain the true accuracy?**.

### Experiments
The numbers below are for the start screen. Press **Reset** before each experiment and press the buttons in the order given: the lab draws a fresh set of samples on every press, so a different order shows slightly different digits. A slider redraws at every step you drag through, so after a slider move expect numbers within a point or so of those here.

1. **The pile.** Predict: of the 200 samples of 100 cases, about how many score exactly 85.0%, and how wide is the middle 95%? Press **Reset** and read the histogram: the tallest bar, at 85.0%, is 12.5% tall (25 of 200 samples), and the middle 95% is 78.0% to 92.0%, 14.0 points. Compare the table rows **Spread of the sample accuracies** (3.7) and **Textbook standard error** (3.6). Then press **Draw 200 samples** twice: the spread reads 3.4 and then 4.1. Why does the same formula give different spreads from one pile to the next?
2. **One sample.** Predict: will the bootstrap interval of one sample always contain 85.0%, and where will it sit? Press **Reset**, then **Draw one sample** three times, reading the detail line after each. The last sample scores 88.0%, 87.0% and 84.0%, with intervals 82.0% to 94.0%, 80.0% to 93.0% and 77.0% to 91.0%. All contain 85.0%. Where is the diamond compared with the dashed line, and how do the widths compare with the shaded stripe? Note that **Samples drawn** reaches 203, because this button adds to the pile.
3. **Resamples B.** Predict: will B = 1,000 give a much narrower interval than B = 100? Press **Reset**, set **Bootstrap resamples B** to 100 and read **Width of that interval, in points** (14.0), then 500 (15.5) and 1000 (15.0). Switch **Show the bootstrap resamples** off and on to see the outline come and go. What does B change, and what does it not change?
4. **Coverage.** Predict: of 200 experiments, how many intervals will contain the truth? Press **Reset**, then **Run 200 experiments**. The meter reads 97.5% (195 of 200), and the first 60 lines hold two thick ones with a cross. Press the button twice more: 95.5%, then 96.5%. Is any run exactly 95%, and does it need to be? Then press **Reset**, set **Sample size n** to 20 and run again: the intervals are about twice as wide as at n = 100, 28 points on average (individual ones from about 15 to 40), and the share is still near 95%.
5. **Quadruple n.** Predict: in the Quick Quiz box, pick what happens to the width when n goes from 100 to 400. Press **Reset**, press **Draw 200 samples**, then set **Sample size n** to about 400. The row **Textbook standard error** falls from 3.6 to 1.8, the shaded stripe narrows to about half its width, and the Quick Quiz box gives its verdict. How wide is the bootstrap interval of the last sample now? Expect about 7 points.
6. **Penguins and a fresh draw.** Predict: with the same n = 100, will the pile be narrower, the same or wider than for the generated data? Press **Reset**, set **Data** to **Penguins (real)** and read the note: 342 of 344 penguins, true accuracy 76.9%. The middle 95% is 68.0% to 85.0% (17.0 points) and the standard error row reads 4.2. Press **Run 200 experiments**: 97.0%. Now check the idea on a fresh draw: press **Draw 200 samples**. The middle 95% becomes 69.0% to 84.0% and the spread reads 4.1. Then set **Sample size n** to about 400 and see the pile halve in width. Does the idea hold on a classifier you did not build to have 85%?
