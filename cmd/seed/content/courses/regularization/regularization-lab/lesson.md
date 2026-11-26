---
slug: regularization-lab
title: Regularization lab
kind: simulator
simulator: regularization-lab
minutes: 25
---
::: intro
- Predict how the training error, the validation error and the coefficients change as you raise the penalty strength λ, then check it in the lab.
- Compare the L2 (ridge) and L1 (lasso) penalties on the same sample, and say when a penalty helps and when it does not.
- Test the idea on the real penguins and on a fresh sample before you believe it.

Before you start: read "Bias, variance and shrinkage" and "L1 and L2: ridge and lasso", the two lessons before this one in the course.
:::

## What the lab asks
*What do you raise, and what do you watch?*

The two lessons before this one gave you a recipe: add a price on big coefficients to the loss, **Loss = MSE + λ × penalty**, and choose λ on a validation set. In the lab called **Fit with a penalty**, you turn λ yourself and watch what it does.

The lab starts with 60 generated points around a smooth curve, with noise 0.5, which is a variance of 0.25. It holds 18 of them back as **Validation** crosses. From the other 42 it takes 15 as **Training** dots, and it fits a degree 9 polynomial to those dots only. That is 9 coefficients, one for each power of x from 1 to 9, and features are standardized first, as the last lesson asked.

Three things move together when you change λ:

- the **fitted curve** on the plot,
- the **coefficients**, one bar each,
- the **training error** and the **validation error**.

The λ slider runs from 0.00001 to 10 on a log scale: each tick multiplies λ by the same factor, so small values get as much room as large ones. It starts at the smallest value, so the lab opens on a nearly unpenalized fit.

## Predict, change, explain, transfer
*Why guess before you move the slider?*

A slider is easy to drag without thinking. The plan below turns each drag into a small test.

1. **Predict.** Pick an answer in the **Quick Quiz** box: as λ grows from its smallest value, what happens first to the validation error?
2. **Change.** Move λ, one change at a time. The validation line fills in only as far as the largest λ you have tried.
3. **Explain.** Press **Check my prediction**. The lab shows the whole validation line and rings the best λ. Say why the curve looks as it does, using bias, variance and shrinkage.
4. **Transfer.** Repeat the idea on another penalty, another degree, another amount of data, then on the real penguins.

> Key idea: the best λ is not known in advance. You find it by trying many values and reading the validation error, and the lab hides that answer until you have committed to a guess.

A wrong guess is the useful kind: if you expected the validation error to keep falling, the lab shows where it turns, and the explain step fixes your picture.

## The U-shaped validation curve
*What do the two errors do as λ grows?*

Everything below uses the default sample, **L2 (ridge)**, degree 9 and 15 training points. Errors are mean squared errors, so lower is better.

| λ | Training error | Validation error | Largest coefficient |
|---|---|---|---|
| 0.00001 | 0.11 | 3.84 | 14.81 |
| 0.0001 | 0.14 | 1.45 | 9.59 |
| 0.001 | 0.21 | 0.48 | 3.76 |
| 0.01 | 0.29 | 0.48 | 2.61 |
| 0.1 | 0.55 | 0.93 | 1.38 |
| 1 | 1.06 | 2.21 | 0.38 |
| 10 | 1.41 | 2.85 | 0.07 |

Training error rises at every step: a penalty always makes the fit to the dots worse. Validation error does the opposite at first. It falls from 3.84 to 0.48, stays near 0.48 from λ = 0.001 to 0.01, and then climbs to 2.85 as the curve is squeezed toward a nearly flat line.

[[figure:regularization-lab/u-shape|Training and validation error against λ on the default sample. Training error only rises. Validation error falls to 0.48 at λ = 0.010, the lab's best λ, and then rises.]]

The left side is overfitting: 9 free coefficients and 15 dots let the curve chase the noise. The right side is underfitting: the penalty leaves the curve too stiff to follow the true shape. The noise alone puts a floor near 0.25 on a fresh point, so 0.48 shows how much 15 dots still cost.

## Coefficients: shrink or switch off
*What happens to the nine coefficients as λ grows?*

The coefficient chart has one bar for each power of x. Look at the "Largest coefficient" in the table above: it falls from 14.81 to 2.61 to 0.38. Big opposite-sign coefficients are what let a degree 9 curve swing between dots, and the penalty is what takes them away.

[[figure:regularization-lab/coefficients|The nine coefficients at three values of λ, for ridge (top) and lasso (bottom). Ridge shrinks all of them and never reaches 0. Lasso sets some to exactly 0, until a single one is left at λ = 1.]]

Ridge shrinks every coefficient and sets none to exactly 0: the lab says "Exactly 0: 0 of 9" at every λ. Lasso switches coefficients off. At λ = 0.001 one is 0, at λ = 0.01 four are (the powers 5 to 8), and at λ = 1 only the power 1 is left, so the fitted curve is a straight line.

> Worked example: lasso at λ = 1 keeps one coefficient, -0.372, with a training error of 1.105. Its loss is 1.105 + 1 × 0.372 = 1.477. Setting all nine to 0 gives a training error of 1.615 and a penalty of 0, a loss of 1.615. The lasso loss is lower, so it keeps the one coefficient. At λ = 2.5 the lasso solution is all zeros.

## When a penalty does not help
*Does every model need regularization?*

"Bias, variance and shrinkage" warned that regularization lowers variance and raises bias, so it helps a model that overfits and hurts one that does not. The lab lets you check that by changing the **Polynomial degree**.

At degree 3, which has too little freedom to chase the noise, the smallest λ already gives a training error of 0.34 and a validation error of 0.40. A bigger λ only hurts: 0.35 and 0.50 at λ = 0.01, and 1.45 and 2.84 at λ = 10. **Check my prediction** reports that no penalty helped on this sample.

At degree 12 the model has far too much freedom. Its validation error is 4.90 at the smallest λ, 0.45 at λ = 0.001 and 0.48 at λ = 0.01, the same as degree 9, with the same largest coefficient (2.6). Once λ is large enough, the penalty decides how flexible the curve is, not the degree.

> Watch out: a flexible model plus a penalty is not better than a model of the right size. Degree 3 with almost no penalty reached 0.40 here, while degree 12 with its best penalty reached 0.45.

## Data changes the answer
*Why does a small training set need a bigger penalty?*

Use **Training points (out of 42)** to change how much the model learns from. The 18 validation crosses never change, so the errors stay comparable.

With 8 training points, the smallest λ gives a validation error of 30.43. The best λ is 0.025, and it brings the error down to 0.71, about 43 times lower. With 42 training points the smallest λ already gives 0.33, and the best λ, 0.00016, gives 0.32. With plenty of data, the data itself keeps the curve in line: more data lowers variance, so it does the job the penalty did.

[[figure:regularization-lab/penalty-vs-data|Validation error at the smallest λ and at the best λ for training sets of 8 to 42 points. The lines are far apart with few points and almost touch with many.]]

The **Learning-curve view** shows the same story along another axis. At λ = 0.01, with 6 random splits averaged, the validation error is about 3.0 with 15 training points and about 0.47 with 42, while the training error stays near 0.3. The gap closes as data grows.

> Worked example: 30.43 / 0.71 = 42.9, so with 8 points the best λ cuts the validation error by a factor of about 43. With 42 points, 0.33 / 0.32 is about 1.0, so it barely matters.

## Real penguins
*Does the idea survive real data?*

Set **Data** to **Penguins (real data)**. The lab uses the 342 penguins with all measurements (2 of the 344 rows have a missing value), draws 60 of them at random, and predicts body mass from flipper length, bill length and bill depth. Each measurement gets its own powers 1 to 9, so there are 27 coefficients. Measurements are rescaled to 0 to 10, so the lab also reports a typical miss in grams.

On the first sample with ridge, the smallest λ gives a validation error of 40.42, a typical miss of about 2,289 g. The best λ, 1.6, gives 1.84, about 488 g. The curve is again a U.

With **L1 (lasso)** the best λ is 1.0 and the validation error is 1.49, about 439 g, with 25 of the 27 coefficients exactly 0.

Press **New sample** three times with ridge. The best λ is 0.063, 0.10 and 0.025. The U-shape holds every time, but the best λ moves from 0.025 to 1.6 across the four samples, so there is no number to memorize.

> Key idea: the shape is stable, but the best λ belongs to a dataset and a sample. Choose it on validation data each time.

## Reading the numbers with care
*How far can you trust one best λ?*

The lab picks the best λ on only 18 validation points, as the lowest of 31 values. A lowest value picked from many tries looks a little better than it will on new data. The flat bottom in the table, 0.48 at both λ = 0.001 and 0.01, says several values are about equally good, so treat the best λ as a good region.

A fresh sample moves it too. On the next four generated samples the best ridge λ is 0.0010, 0.0063, 0.10 and 0.0040. Check the chosen model once on a test set that the choice never saw, as in "Train, validation and test".

::: deeper Why the lowest validation error flatters the model
Suppose two values of λ are equally good, but a few unlucky validation points make one look slightly better. You pick it and report its error. That error was selected for being low, partly by chance, so on new data it will usually be higher. More values compared and fewer validation points make the effect bigger. A test set that played no part in choosing λ gives an honest number.
:::

::: remember
- Raising λ always raises the training error. The validation error falls and then rises, and the lowest point of that U is the best λ.
- Ridge shrinks all coefficients and sets none to 0. Lasso sets some to exactly 0. A penalty helps a model that overfits and hurts one that does not, and it matters most when data is scarce.
- The U-shape survives real data, but the best λ changes with the dataset and the sample. Choose it on validation data, then test once.
:::

@@lab

## Lab: Fit with a penalty
A polynomial is fitted to the dots only. The penalty pulls its coefficients toward zero, and the crosses are held back to check the fit. You raise the penalty strength and watch the curve, the coefficients and both errors.

### Controls
- **Data** switches between **Generated data** and **Penguins (real data)**. With the real data the plot shows body mass against flipper length, both scaled 0 to 10, and the other two measurements are held at their training average. The **Noise** control is disabled there.
- **Penalty** chooses **L2 (ridge)** or **L1 (lasso)**.
- **Penalty strength λ (log scale)** runs from 0.00001 to 10 and starts at 0.00001. With the keyboard, focus the plot and press the left and right arrows to change it.
- **Polynomial degree** (1 to 12; starts at 9) sets how many powers of x the model uses. On the plot, the up and down arrows change it.
- **Noise** (0 to 1.5; starts at 0.5) is the scatter of the generated points around the curve.
- **Training points (out of 42)** (6 to 42; starts at 15) sets how many dots the model learns from. The 18 validation crosses stay the same.
- **Show the unregularized fit** (on at the start) draws the λ = 0 fit as a faint black line and as dashed outlines on the coefficient bars.
- **Learning-curve view** (off at the start) swaps the error-against-λ chart for error against training size.
- **New sample** draws new generated points, or a new random set of penguins, and clears your prediction.
- **Check my prediction** shows the whole validation line and rings the best λ. **Jump to best λ** moves the slider there; it stays disabled until you have checked.
- **Reset** returns to generated data, **L2 (ridge)**, λ = 0.00001, degree 9, noise 0.5, 15 training points, the default sample, both toggles as at the start and the prediction cleared.
- **Quick Quiz** is the button under the Controls card (a round button at the bottom right on a phone). Its box asks "As λ grows from its smallest value, what happens first to the validation error?" with the answers "It falls first, then rises again", "It rises straight away" and "It keeps falling". Pick one, then press **Check answer** or **Check my prediction**.

### Reading the screen
- The plot shows the **Training** dots, the **Validation** crosses, the **True curve** (generated data only), the **Fitted curve** and, while the toggle is on, the **Unregularized (λ = 0)** line.
- The status line reads, for example, "L2 (ridge), λ = 0.00001: training error 0.11, validation error 3.84." After you check, it adds "Below the best λ: still too flexible.", "Near the best λ." or "Above the best λ: too stiff."
- The detail line gives the lowest validation error ("hidden until you check your prediction" at first), the **Largest coefficient**, how many are "Exactly 0", and the counts of training and validation points. With the real data it also gives the typical miss in grams.
- **Coefficients at this λ** has one bar per coefficient on the standardized scale. A ring on the zero line marks a coefficient that is **Exactly 0**. The dashed outline is the **Unregularized** value, cut off with a triangle where it is taller than the chart. The vertical axis rescales to the largest bar, so compare the numbers in the detail line, not the bar heights. The bars are labeled **Power k of x**; with the real data they are grouped by **Flipper length**, **Bill length** and **Bill depth**.
- **Training and validation error against λ** shows **Training error** and **Validation error** against **log10 of λ (penalty strength)**, as **Mean squared error**. The dashed line is **your λ**, and a dot on each line gives the error there. Until you check, the validation line stops at the largest λ you have tried. After you check, the best λ is ringed and labeled, for example **best λ: 0.010**. A triangle at the top means an error higher than the chart shows.
- In the **Learning-curve view** the chart is **Training and validation error against training size**, with **Training points** along the bottom. It averages 6 random splits at your λ; the dashed line, labeled **yours**, is your number of training points. It reads **Working it out…** while it computes.
- Under the controls, a note says which data is in use and how it was prepared.

### Experiments
Press **Reset** before each one, so that your numbers match the default sample.

1. **Find the bottom of the U.** Predict: in the Quick Quiz box, pick what happens first to the validation error as λ grows. Then drag **Penalty strength λ (log scale)** to the right and read the status line. At 0.00001 the training error is 0.11 and the validation error 3.84; at 0.001 they are 0.21 and 0.48; at 0.01, 0.29 and 0.48; at 0.1, 0.55 and 0.93; at 10, 1.41 and 2.85. Press **Check my prediction**, then **Jump to best λ**: it lands on 0.010. Why does the training error only rise while the validation error falls and then rises? Which end is overfitting, and which is underfitting?
2. **Watch ridge shrink.** Predict: with **L2 (ridge)**, does any coefficient reach exactly 0 as λ grows, and what happens to the largest one? Set λ to 0.00001, 0.01, 1 and 10 and read the detail line: the largest coefficient is 14.81, 2.61, 0.38 and 0.07, and it says "Exactly 0: 0 of 9" every time. At 0.00001 the dashed outline of the unregularized fit is cut off by a triangle. Explain why the bars look the same size at every λ even though the numbers drop.
3. **Switch to lasso.** Predict: with **L1 (lasso)** at λ = 0.01, how many of the nine coefficients are exactly 0, and what is the curve at λ = 1? Set **Penalty** to **L1 (lasso)**. At 0.01 the detail line says "Exactly 0: 4 of 9" (training 0.23, validation 0.49) and rings mark the powers 5 to 8. At 1 it says 8 of 9 and the fitted curve is a straight line. At λ = 2.5 it says 9 of 9, a flat line. Then press **Check my prediction** and **Jump to best λ**: the best lasso λ is 0.025, with a validation error of 0.44, against 0.48 for ridge at 0.010. Is that enough to say lasso is better?
4. **A model that does not need a penalty.** Predict: if you set **Polynomial degree** to 3, will the validation error still fall and then rise? Set it to 3 and read the errors at λ = 0.00001 (0.34 and 0.40), 0.01 (0.35 and 0.50) and 10 (1.45 and 2.84). Press **Check my prediction**: the Quick Quiz box says no penalty helped. Now set the degree to 12: at 0.00001 the validation error is 4.90; at the best λ, 0.0010, it is 0.45. At λ = 0.01 the degree 12 errors are 0.29 and 0.48, the same as degree 9. What does the penalty do that the degree did before?
5. **Less data, more penalty.** Predict: with only 8 training points, does the penalty help more or less than with 15? Set **Training points (out of 42)** to 8. At λ = 0.00001 the validation error is 30.43 and the training error 0.01. Press **Check my prediction** and **Jump to best λ**: λ = 0.025, validation 0.71. Set it to 42: the smallest λ gives 0.33, and the best λ, 0.00016, gives 0.32. Then press **Reset**, **Check my prediction**, **Jump to best λ** and switch on **Learning-curve view**: at λ = 0.01 the validation line starts far above the training line and the two come together near 0.47 and 0.34 at 42 points. Explain it using variance.
6. **Penguins and a fresh sample.** Predict: on real penguins, will the validation error still fall and then rise, and will the best λ match the generated data? Set **Data** to **Penguins (real data)**. At λ = 0.00001 the validation error is 40.42, a typical miss of about 2,289 g. Press **Check my prediction** and **Jump to best λ**: λ = 1.6, validation 1.84, about 488 g. Switch **Penalty** to **L1 (lasso)** and repeat: λ = 1.0, validation 1.49, 25 of 27 coefficients exactly 0. Now set **Penalty** back to **L2 (ridge)** and press **New sample** three times, checking each time. The best λ is 0.063, 0.10 and 0.025. What stays the same across the four samples, and what changes?
