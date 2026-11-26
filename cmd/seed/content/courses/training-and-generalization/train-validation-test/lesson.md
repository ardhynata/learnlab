---
slug: train-validation-test
title: Train, validation and test
kind: simulator
simulator: overfit-lab
minutes: 25
---
::: intro
- Predict the degree at which validation error stops falling and starts to rise.
- Read training and validation error side by side to tell underfitting from overfitting.
- Check an idea on real penguin data with a fresh sample, instead of trusting one split.

Before you start: read "Baselines and splits" and "Underfitting and overfitting".
:::

## What the lab measures
*Why can't we judge a curve by the points it was fitted to?*

A model is useful only on data it has never seen, so the lab tests every curve on points it did not use. It draws 30 points around a hidden curve, with some random scatter called **noise**. Some points become **training points**, drawn as dots. The rest become **validation points**, drawn as crosses. A polynomial is fitted to the dots only.

The **degree** of the polynomial sets how flexible it is. Degree 1 is a straight line, degree 2 has one bend, and each extra degree allows one more bend.

The lab reports two numbers for every degree. **Error** here means mean squared error: the average of the squared gaps between the curve and the points. **Training error** is measured on the dots. **Validation error** is measured on the crosses.

> Key idea: training error says how well the curve copies the points it was fitted to. Only validation error says how it treats points it has not seen.

## Three sets, three jobs
*Where does the lab fit into a real project?*

A real project cuts its labeled data into three sets.

- **Training set.** The model fits its **parameters** here. For a polynomial these are the coefficients.
- **Validation set.** You use it to choose **settings** (often called **hyperparameters**), such as the polynomial degree. A setting is something you pick before fitting, not something the model learns.
- **Test set.** You use it once, at the very end, to report how well the final model does.

The lab has only the first two sets. The dots are the training set and the crosses are the validation set, and the choice you make is the degree. Picking the degree with the validation points is the same move you would make in a project.

The test set is your last honest estimate. Every time you look at it and then change something, it quietly stops being unseen. That is why you use it once.

> Watch out: a validation score is slightly optimistic, because you picked the setting that scored best on it. Report the test score.

## Reading the U-shaped curve
*What happens to the two errors as the degree goes up?*

**Training error keeps falling.** A more flexible polynomial can always copy a less flexible one and then do a little better, so training error never rises with the degree.

**Validation error falls, then rises.** At first more flexibility helps the curve follow the real pattern. Past some point it chases the noise and validation error climbs. The curve is U-shaped, and the bottom of the U is the best degree.

[[figure:train-validation-test/u-curve|Training error keeps falling with the degree, while validation error is U-shaped. On the lab's first sample the bottom of the U is at degree 3.]]

On the lab's first sample the validation error is 1.20 at degree 1 and 0.19 at degree 3. Then it climbs: 0.28 at degree 6, 0.80 at degree 7 and 3.59 at degree 9, where training error is only 0.04. The left side of the U is underfitting and the right side is overfitting.

> Key idea: training error always favors the more flexible model. Only validation error can tell you when to stop.

## A worked example
*Can we pick a degree by hand from ten points?*

Here are 10 invented points (x, y). We hold out 3 as validation and fit on the other 7.

- Training: (1, 2.1), (2, 3.6), (4, 5.4), (5, 5.5), (7, 6.6), (8, 7.5), (10, 7.4)
- Validation: (3, 4.2), (6, 6.6), (9, 7.4)

We fit degrees 1, 2, 3 and 6 to the training points only, with the same least-squares fit the lab uses, then compute the error on each set.

| Degree | Training error | Validation error |
|---|---|---|
| 1 | 0.306 | 0.201 |
| 2 | 0.063 | 0.017 |
| 3 | 0.061 | 0.026 |
| 6 | 0.000 | 0.448 |

[[figure:train-validation-test/worked-example|The worked example. Degree 6 passes through all seven training points but misses the three validation crosses by more than degree 2 does.]]

Validation error is lowest at degree 2, so degree 2 is the pick. Degree 3 buys almost nothing on the training set (0.063 to 0.061) and does slightly worse on validation. Degree 6 has 7 coefficients for 7 training points, so it passes through every one: training error 0. But it learned each point's noise too, and its validation error is about 26 times that of degree 2.

> Watch out: three validation points are very few, so the gap between degree 2 and degree 3 is too small to trust.

::: deeper Check degree 1 with a pencil
Training means: x is 37/7, about 5.286, and y is 38.1/7, about 5.443. The sum of x squared is 259, so the spread of x is 259 minus 37 squared over 7, about 63.43. The sum of x times y is 238.6, so the cross term is 238.6 minus 37 times 38.1 over 7, about 37.21.

Slope = 37.21 / 63.43, about 0.587. Intercept = 5.443 minus 0.587 times 5.286, about 2.342. The line is y = 2.342 + 0.587x.

On the validation points it predicts 4.10, 5.86 and 7.62. The gaps to the true values 4.2, 6.6 and 7.4 are 0.10, 0.74 and -0.22. Squared and averaged: (0.01 + 0.55 + 0.05) / 3, about 0.20, which matches the table's 0.201.
:::

## Predicting where the U turns
*What moves the bottom of the U, and how sure can you be of it?*

Before you move the slider, make a guess and give a reason. Three things shape the answer.

- **Noise.** With noise 0 the points sit on the curve and there is nothing to chase, so flexible fits are not punished. With noise 1.5 the errors are all larger, but on the lab's first sample the bottom is still at degree 3.
- **Training size.** More training points tame overfitting. At degree 9 the validation error is 2.77 with 8 training points and 0.51 with 26.
- **The validation set.** It is small, so its answer is noisy.

[[figure:train-validation-test/best-degree-spread|The degree with the lowest validation error in 20 samples, for 14 and for 26 training points. With 26 there are only 4 validation points, and the answer jumps around.]]

Over those 20 samples the best degree ranges from 3 to 7 with 14 training points, but from 3 to 12 with 26. The bottom of the U is a guess from the crosses you happen to have. When several degrees are close, prefer the simpler one.

## Trusting a result
*How do you know the answer is not luck or a leak?*

Repeat the experiment on a fresh sample. If the best degree keeps landing in the same low range, trust the idea. If it jumps around, it is luck.

With little data, **cross-validation** gives a steadier answer. In k-fold cross-validation you cut the training data into k folds, for example five. Each fold takes one turn as the validation set while the model trains on the other four, and you average the five scores.

**Data leakage** means information from the validation or test data influences training or tuning, which makes scores look better than reality. The common case is scaling before splitting, so the mean and spread include the test rows. Split first, compute the scaling numbers from the training rows only, and apply them to the other sets.

> Watch out: a result that looks too good is more often a leak than a breakthrough. Look for the leak first.

::: deeper Why not keep checking the test set?
Suppose you try 200 settings and keep the one with the best test score. Among 200 tries, one will look good partly by luck, so the score you report is too optimistic and no data is left to expose that. The same thing happens with a validation set, only more gently. That is why the final report belongs to a set that was never used to choose anything.
:::

::: remember
- Judge a curve on points it was not fitted to: training error alone rewards memorizing.
- Training error keeps falling as the degree rises, while validation error is U-shaped. Pick the bottom of the U.
- Validation chooses settings and test reports once. A small validation set gives a noisy answer, so repeat on a fresh sample.
:::

@@lab

## Lab: Fit a curve, then test it
The lab starts with 30 generated points: 14 training dots and 16 validation crosses. You first predict the degree where validation error will start to rise, then move the degree slider and find out. The faint dashed line is the true curve the generated points were drawn around.

### Controls
- **Data** switches between Generated data and Penguins (real data).
- **Penguin feature (x)** picks Flipper length (mm) or Bill length (mm) for the x axis. It works only with the real data, and the y axis is always body mass.
- **Polynomial degree** (1 to 12, starts at 1) sets how flexible the fitted curve is.
- **Noise** (0 to 1.5, starts at 0.50) sets how far the generated points scatter around the true curve. It is disabled with the real data.
- **Training points (out of 30)** (6 to 26, starts at 14) sets how many points are used for fitting. The rest become validation points.
- **Show validation points** hides or shows the crosses. It does not change the fit or the errors, and it does not start a new round.
- **New sample** draws a fresh set of 30 points and a fresh split, and resets your prediction.
- **Check my prediction** reveals the whole validation curve, the ring, the verdict and the answer.
- **Reset** returns every control, including Data and Penguin feature, to its start value and clears the prediction.
- **Quick Quiz** is the button under the settings card (a round button at the bottom right on a phone) (its badge counts the quizzes you have not answered; it opens a small panel). Pick one of Degree 1–2, Degree 3–4, Degree 5–6, Degree 7–9 or Degree 10–12 before you slide.

Changing Data, Penguin feature, Noise or Training points also starts a new round, so the old prediction no longer applies.

### Reading the screen
- The status line reads "Degree D. Training error X, validation error Y." Once you have checked your prediction it adds a verdict: "about right" means within 50% of the lowest validation error, otherwise "underfitting" below the best degree and "overfitting" above it.
- The detail line hides "Lowest validation error" until you check. With the real data it adds how far a validation penguin is typically off, in grams: the square root of the validation error, times 360 g per plot unit.
- The chart **Training and validation error against degree** draws training error for every degree. Until you check, its validation line shows only the degrees you have tried. The dashed line, "your degree: D", is your degree, and after checking a ring marks "best: degree B".
- The table **Error at every degree** gives exact numbers. Validation degrees you have not tried show "?", and after checking, the best degree reads "B (best)". Errors beyond 1000 are shown as "over 1000".
- With the real data both columns are rescaled to the 0 to 10 plot, so errors are in plot units, not grams.

### Experiments
1. **Find the bottom of the U.** Predict: pick the band where you think validation error stops falling. Then move the degree slider from 1 to 12 one step at a time and watch the chart. Press Check my prediction. Validation error is 1.20 at degree 1, 0.19 at degree 3 and 3.59 at degree 9, so the answer is Degree 3–4. What does training error do over the same sweep?
2. **Hide the crosses.** Set the degree slider to 9. Predict: if you turn off Show validation points, will the curve or either error change? Try it. Nothing changes, because the fit never used those points. Turn them back on and see how far they sit from the wiggles.
3. **Change the noise.** Predict: where will the bottom of the U go with Noise 0, and with Noise 1.5? Set each, slide through the degrees and check. With no noise, validation error is 0.00 from degree 5 on and the ring lands at degree 9. At 1.5 the errors are larger but the best degree is still 3. Overfitting needs noise to chase.
4. **Change the training size.** Predict: at degree 9, which has the lower validation error, 8 training points or 26? Set the degree slider to 9, set each training size and read the status line. With 8, training error is 0.00 and validation error is 2.77. With 26 they are 0.09 and 0.51. More training data tames overfitting.
5. **Shrink the validation set.** Predict: if you set Training points to 26, which leaves 4 validation points, will the best degree stay put across fresh samples? Then set it, press New sample again and again, check each time, and note the best degree. Over 20 samples it ranged from 3 to 12 with 26 training points, but only from 3 to 7 with 14.
6. **Move to the real data.** Predict: with Data set to Penguins (real data), will the best degree be high or low? Flipper length and body mass rise together roughly along a straight line. Then set it, slide through the degrees and check. Then press New sample five more times and note the best degree each time: on the first six samples it was 3, 3, 2, 2, 2 and 1, never above 3. Switch Penguin feature (x) to Bill length (mm) and repeat. Does the idea survive a fresh sample?
