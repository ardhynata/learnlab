---
slug: interval-lab
title: Interval lab
kind: simulator
simulator: interval-lab
minutes: 25
---
::: intro
- Build prediction intervals with three methods and measure how often each one holds the true value.
- Predict, then check, what happens to coverage when the test inputs move away from the training inputs.
- Explain why the bands miss, and repeat the test on real penguins with a fresh sample.

Before you start: read "Aleatoric and epistemic uncertainty", "Conformal prediction" and "Covariate and concept shift".
:::

## What the lab asks
*What does Interval lab let you measure?*

The last two lessons made a promise and a warning. The promise: a 90% interval should hold the true value about 90 times in 100. The warning: that promise needs new cases that look like the cases the interval was built from. In Interval lab you build three kinds of interval and then break that condition on purpose.

The lab starts with 120 generated training points, 100 calibration points and 400 test points. The true rule is a known curve, y = 1.5 sin(2.5x), plus noise that grows from left to right. The model is a cubic polynomial. The three methods all wrap a band around its curve: **Split conformal**, **Quantile regression** and **Bootstrap ensemble**.

Then you move the test inputs. The training inputs run from -1 to 1. **Shift severity** slides the test inputs to the right, by 2 times the severity, so 40% moves them by 0.80. The rule that makes y does not change, only where the new inputs lie. This is **covariate shift**.

[[figure:interval-lab/shift-setup|The training inputs against the test inputs at three shifts. At 40% about 63% of the test inputs are still inside the training range, and at 100% none are.]]

## Three bands, three promises
*What does each band claim to hold?*

**Split conformal** adds and subtracts q, one of the 100 absolute calibration residuals. At the default alpha of 0.1 the rank is k = ceil(101 × 0.9) = ceil(90.9) = 91, so q is the 91st smallest of the 100 residuals: 0.677. The band is the fitted curve ± 0.677, always 2 × 0.677 = 1.35 tall. At x = 0.8 the curve says 1.52, so the band runs from 0.84 to 2.20.

**Quantile regression** fits a low and a high quantile curve to the training points, so its band can be narrow where the noise is small and wide where it is large. It has no calibration set and no finite-sample promise.

**Bootstrap ensemble** refits the curve on 30 bootstrap samples and takes the middle 90% of their predictions. As in "Aleatoric and epistemic uncertainty", this measures only how unsure the model is about its curve. The noise in each y is not in it.

> Key idea: a band answers the question its method asks. Only split conformal asks, "how far off are new cases?", and checks the answer on held-out points.

## With no shift
*How well does each band hold before anything is broken?*

Set **Shift severity** to 0%. The table **Coverage and width on the test set** reads:

| Method | Coverage | Gap to target (90%) | Mean width |
| --- | --- | --- | --- |
| Split conformal | 93.5% | +3.5 pts | 1.35 |
| Quantile regression | 84.8% | -5.2 pts | 0.87 |
| Bootstrap ensemble | 17.5% | -72.5 pts | 0.15 |

Split conformal is near its target. The bootstrap band is only 0.15 tall, so it misses most points: the lab tags that row "Model uncertainty only, so low is expected". Quantile regression falls a little short. A likely reason is that its band is fitted on the same points it is scored against, the same effect "Conformal prediction" warned about for residuals.

One sample is one draw. Over the ten samples with seeds 41 to 50, split conformal covers between 86.0% and 94.0% and averages 89.9%, close to 90%. Quantile regression averages 85.3% and falls below 90% in 9 of the 10. The promise is an average over many calibration sets and new cases, not a guarantee for each sample.

::: deeper How much to trust one coverage number
Coverage is itself measured on a finite test set. With 400 test points and a true coverage of 0.9, the standard error is sqrt(0.9 × 0.1 / 400) = 0.015, so about 1.5 points either way. With the 60 test penguins of the real data it is sqrt(0.09 / 60) = 0.039, about 3.9 points. Differences smaller than that are noise, not findings.
:::

## Moving the test inputs
*How fast does coverage fall as the shift grows?*

The chart **Coverage as the shift grows** re-measures all three bands at every shift from 0% to 100% with the intervals you see above it. Here are the lab's default numbers.

| Shift | Split conformal | Quantile regression | Bootstrap ensemble | Inside the training range |
| --- | --- | --- | --- | --- |
| 0% | 93.5% | 84.8% | 17.5% | 98.3% |
| 20% | 85.5% | 79.0% | 20.0% | 82.0% |
| 40% | 66.5% | 62.7% | 16.3% | 62.7% |
| 60% | 45.8% | 43.8% | 13.3% | 43.8% |
| 100% | 9.8% | 11.0% | 4.8% | 0.0% |

[[figure:interval-lab/coverage-sweep|Coverage of the three bands as the shift grows. The dashed line is the 90% target and the dotted line marks the lab's default shift of 40%.]]

Split conformal falls from 93.5% to 66.5% at the default shift, 23.5 points below its target. The last column explains much of it: at 100% shift no test input lies inside the training range, and coverage is very low (9.8%). Nothing about the calibration was wrong. The calibration points just no longer look like the test points.

## Why the bands miss
*What goes wrong with the bands outside the training range?*

Conformal's promise needs the new case to be exchangeable with the calibration cases (drawn the same way, so that shuffling them changes nothing). Moving the inputs breaks that. There is a second cause: the cubic curve is trained only on inputs from -1 to 1, and beyond them it runs away from the truth.

[[figure:interval-lab/bands-at-inputs|The three bands at four inputs of the default sample, beside the range a perfect method would give. Inside the training range the bands sit on the truth; at x = 1.8 the curve is far from it.]]

> Worked example: at x = 1.8 the true curve is -1.47 and the fitted curve is -9.09, off by 7.6. The conformal band is -9.77 to -8.41, only 1.35 tall, so it cannot reach the truth. The quantile band, -10.50 to -7.88, and the bootstrap band, -11.09 to -7.70, are wider but sit around the same wrong curve.

So wider is not the same as right. Check the widths at 40% shift: split conformal 1.35, quantile regression 1.37, bootstrap 0.73. At 100% they are 1.35, 3.57 and 6.01. The conformal band never changes, because q was set from residuals measured inside the training range. The other two widen because their curves flare out, which is a hint, but not a calibrated one.

> Watch out: the guarantee is about exchangeable cases. When it fails, nothing in the band itself tells you.

## Alpha and the calibration set
*What do you pay for a higher target, and what do you need to keep the promise?*

Set **Shift severity** to 0% again. **Alpha** is the share allowed to miss. A larger alpha lowers the rank in split conformal, so the band shrinks:

| Alpha (target) | Split conformal coverage | Mean width |
| --- | --- | --- |
| 0.05 (95%) | 99.0% | 1.86 |
| 0.10 (90%) | 93.5% | 1.35 |
| 0.30 (70%) | 72.5% | 0.68 |
| 0.50 (50%) | 50.2% | 0.37 |

The calibration set sets a floor. As in "Conformal prediction", split conformal needs ceil((n + 1)(1 - alpha)) to be at most n. For alpha 0.05 that means at least 19 points. The slider moves in steps of 5, so with 10 or 15 calibration points the band is infinite: it covers everything and says nothing, and the lab prints a note. With 20 points the rank is ceil(21 × 0.95) = 20 and the band is back, 1.35 tall.

A small calibration set also swings. With alpha 0.1 and 10 points, coverage was 80.5%, 88.8%, 99.8% and 72.8% on the first four samples, with widths from 0.66 to 2.01. With 100 points the same four samples gave 93.5%, 88.0%, 90.0% and 89.0%.

## Real penguins: setup and the Gentoo result
*Does the same story hold for real data?*

Choose **Penguins (real)**. The lab now predicts body mass from flipper length with a straight line fitted to two species. The third, picked in **Held-out species (the shifted test set)**, is never seen in training or calibration. **Shift severity** is the share of the 60 test penguins that belong to it. In the first sample the training flippers run from 178 to 210 mm.

[[figure:interval-lab/species-coverage|Split conformal coverage on the real penguins at no shift and at full shift, for each held-out species, with the share of that species' flippers inside the training range.]]

With Gentoo held out, coverage of split conformal goes from 98.3% at no shift to 81.7% at the default 40% and to 56.7% at 100%. Only 21.7% of the Gentoo test flippers fall in the training range: Gentoo flippers in the table run from 203 to 231 mm.

## What the penguins can and cannot show
*How far can you trust a result on real data?*

With Chinstrap held out, every flipper is inside the range and coverage stays near the target: 88.3% at no shift and 91.7% at 100%.

The lab swaps a whole species, so it does not separate longer flippers from a change in how flipper length relates to mass. Both can lower coverage. And 60 penguins is a small test set: with Adelie held out, the second fresh sample gives 73.3% even at no shift, because a calibration set of 40 can be an unlucky draw.

::: remember
- Split conformal keeps its coverage when new inputs look like the calibration inputs, and it loses it when they do not. Moving the test inputs away from the training range took coverage from 93.5% to 66.5% at 40% shift, and to 9.8% at 100%.
- Each band answers a different question. The bootstrap band holds model uncertainty only, so it is narrow and covers 17.5% even with no shift, and quantile regression has no finite-sample promise.
- Higher targets cost wider bands, a small calibration set swings and can leave the band infinite, and any one coverage number from one sample is noisy. Check an idea on a fresh sample and on real data.
:::

@@lab

## Lab: Prediction intervals under shift
The lab starts with generated data: 120 training points, 100 calibration points and 400 test points, a cubic fit, alpha 0.1 (target 90%) and a shift of 40%. You change the data, the shift and alpha, and watch how often each band holds the true value.

### Controls
- **Data** switches between **Generated data** and **Penguins (real)**. With the real data the plot shows **Flipper length (mm)** against **Body mass (kg)**.
- **Held-out species (the shifted test set)** (Adelie, Chinstrap or Gentoo; real data only) is the species the model never sees. It forms the shifted part of the test set.
- **Noise** (**Constant** or **Growing with x**; generated data only) sets how the spread of y changes with x.
- **Alpha (share allowed to miss)** (0.05 to 0.5) is the share of cases you accept to miss. Its readout also shows the target, for example "0.10 (target 90%)".
- **Calibration set size** (10 to 250, or 10 to 80 with the real data, where it starts at 40) sets how many spare points split conformal uses to find q.
- **Shift severity** (0% to 100%) moves the test set away from the training data. With generated data it slides the test inputs right by 2 times the severity. With the real data it is the share of test penguins from the held-out species.
- **New sample** draws a new set of points, or a new random split of the penguins.
- **Show split conformal band**, **Show quantile regression band**, **Show bootstrap ensemble band**, **Show test points** and **Show the true curve** (generated data only) hide or show those layers. All start on.
- **Fullscreen** enlarges the lab. **Reset** returns to generated data, the first sample, **Noise** Growing with x, Gentoo held out, alpha 0.1, 100 calibration points, 40% shift and all layers on, and clears the Quick Quiz. Press it before experiments 1, 4, 5 and 6 so your numbers match the ones below.
- **Quick Quiz** holds one question: "When the test inputs move away from the training data, what happens to the coverage of a 90 percent interval?" Pick an answer first. The lab reveals it once the shift is 20% or more, and Reset leaves the shift at 40%, so set it to 0% before you pick.

### Reading the screen
- The plot shows **Training points**, **Calibration points (split conformal only)** as rings, **Test points (new inputs)**, the **Fitted curve** and, with generated data, the **True curve**. The grey strip marks the training inputs. A band is a filled area with two edges; the three bands have three colors. The axes are **Input x** and **Output y**.
- The status line gives the target and each method's coverage on the test set, for example "Target coverage 90%. On the test set: Split conformal 66.5%, Quantile regression 62.7%, Bootstrap ensemble 16.3%." The line under it says how many test points lie inside the training range, and the lab also shows the counts: "120 training, 100 calibration, 400 test".
- The table **Coverage and width on the test set** has the columns **Method**, **Coverage on test set**, **Gap to target (90%)** and **Mean width**. The gap is in points; the bootstrap row carries the tag "Model uncertainty only, so low is expected". When split conformal has too few calibration points, its width reads ∞ and a note says how many it needs.
- The chart **Coverage as the shift grows** shows coverage at every shift for the three methods and the dashed **Target 90%**. The label **Now** marks your current shift.

### Experiments
Press **Reset** first so your numbers match these.

1. **Before the shift.** Predict: with **Shift severity** at 0%, which method is closest to 90%? Set the slider to 0% and read the table: **Split conformal** 93.5% (gap +3.5), **Quantile regression** 84.8% (-5.2), **Bootstrap ensemble** 17.5% (-72.5). Explain why the bootstrap band is so low. Then switch **Noise** to **Constant**: **Split conformal** gets 90.8% and **Quantile regression** 86.3%, with mean widths 1.08 and 0.94. Look at the bands: which one keeps its height across x, and which one follows the noise?
2. **Move the test inputs.** Press **Reset**, then set **Shift severity** to 0%. Predict: open the **Quick Quiz** and pick an answer. Then raise **Shift severity** to 20% and 40%. At 40% the status line reads 66.5%, 62.7% and 16.3%, and the box says the coverage drops. Slide on to 100%: 9.8%, 11.0%, 4.8%. Watch the **Now** mark in the chart and the share inside the training range. Explain how the two are related.
3. **Which band warns you?** Press **Reset**. Predict: as the shift grows, which of the three mean widths changes? Read **Mean width** at 0%, 40% and 100%: **Split conformal** stays at 1.35, **Quantile regression** goes 0.87, 1.37, 3.57 and **Bootstrap ensemble** 0.15, 0.73, 6.01. Turn off the other two bands, keep **Show the true curve** on, and look at where the bands sit at the far right. Explain why a wide band can still miss.
4. **Alpha and the calibration set.** Predict: what does raising **Alpha** to 0.30 do to the split conformal band and to its coverage? Press **Reset**, set the shift to 0% and try 0.30: coverage 72.5%, width 0.68. Then set **Alpha** to 0.05 and **Calibration set size** to 10: the band is infinite, the plot says so and the table shows ∞. Raise the size to 20: coverage 93.5%, width 1.35. Why 20 and not 15?
5. **A small calibration set.** Predict: with 10 calibration points and alpha 0.10 at 0% shift, will coverage stay near 90% on every sample? Press **Reset**, set the shift to 0% and **Calibration set size** to 10 (coverage 80.5%, width 0.86). Press **New sample** three times: 88.8%, 99.8% and 72.8%, with widths 1.11, 2.01 and 0.66. Now set the size back to 100: the fourth sample gives 89.0%. Press **New sample** three more times: 93.0%, 87.8% and 90.3%. What is the promise an average over?
6. **Penguins and a fresh sample.** Predict: with Gentoo held out, will split conformal stay at 90% as you raise the shift? Press **Reset**, set **Data** to **Penguins (real)** and the shift to 0%, 40% and 100%: 98.3%, 81.7% and 56.7%. Now press **New sample** twice: at 100% shift you get 51.7% and 46.7%, so the drop is not a fluke. Set **Held-out species** to Chinstrap, put the shift at 100% and compare the share inside the training range with Gentoo's: coverage is 91.7%. Finally press **Reset**, choose **Penguins (real)** again, hold out Adelie, set the shift to 0% and press **New sample** twice: 95.0% and 73.3%. Did the idea survive, and what else changed?
