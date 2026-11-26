---
slug: bias-variance-and-shrinkage
title: Bias, variance and shrinkage
kind: reading
simulator: ''
minutes: 20
---
::: intro
- Explain bias and variance as the two ways a model can be wrong, and link them to underfitting and overfitting.
- Compute a ridge penalty by hand for one coefficient and see it pull that coefficient toward zero.
- Read a learning curve to tell a model that is too rigid from one that is too eager.

Before you start: read "Underfitting and overfitting" and "Loss functions".
:::

## Two ways to be wrong
*Where does a model's error come from?*

"Underfitting and overfitting" taught you to read two errors as a pair. This lesson gives those two failures their statistical names and adds a tool against one of them.

Picture the same experiment run many times. Each time you draw a fresh training sample from the same source, fit the same kind of model, and get a slightly different curve. A crowd of curves can be wrong in two separate ways.

- **Bias** is how far the *average* of the curves sits from the true pattern. A model too rigid to bend has high bias: every curve misses in the same direction.
- **Variance** is how much the curves differ from one another. A model that chases noise has high variance: each sample sends it somewhere new.

Underfitting is high bias. Overfitting is high variance. A third part of the error, the noise, is the scatter in the data itself. No model can remove it.

> Key idea: bias is a consistent miss, variance is an inconsistent one. A model can have too much of either.

## Bias and variance in numbers
*Can the two kinds of error be measured?*

Yes, in a simulation where we know the true pattern. Use the same pattern as in "Underfitting and overfitting", y = 5 + 2.2 sin(x / 1.6), and the 10 x positions 0.5, 1.5, up to 9.5. Add noise with a standard deviation of 0.5 (a variance of 0.25), draw 400 fresh samples, and fit each one. Compare the 400 curves with the true pattern at 91 points from 0.5 to 9.5.

At each point, **bias squared** is (average prediction minus truth) squared, and **variance** is the average squared spread of the predictions around their own average. Both are averaged over the points. For squared error, bias squared + variance + noise adds up to the expected error on a new point.

| Model | Bias squared | Variance | Noise | Total |
|---|---|---|---|---|
| Degree 1 | 0.74 | 0.04 | 0.25 | 1.03 |
| Degree 3 | 0.01 | 0.08 | 0.25 | 0.34 |
| Degree 9 | 0.00 | 1.74 | 0.25 | 1.99 |

[[figure:bias-variance-and-shrinkage/crowd-of-fits|Fifteen of the 400 fits for degree 1, 3 and 9. The thick line is the average fit and the dashed line is the true pattern.]]

The line misses by a lot but misses the same way every time. Degree 9 is right on average, but each fit is wild. Degree 3 balances the two and has the lowest total.

> Key idea: as a model gets more flexible, bias falls and variance rises. The best model is where the total is lowest.

## What a penalty does
*How do you hold a flexible model back?*

One way is to choose a simpler model. Another keeps the flexible model and punishes extreme coefficients. In the lesson's sample the degree 9 fit has a coefficient near 900, once x is rescaled to run from -1 to 1. Numbers that large are what let a curve swing between the dots.

**Regularization** changes the loss. The model no longer minimizes the fit loss alone; it minimizes the fit loss, the ordinary loss such as the sum of squared residuals, plus a penalty:

`penalized loss = fit loss + λ × (sum of squared coefficients)`

This is **ridge** regression, also called **L2** regularization. The Greek letter λ (lambda) is the **penalty strength**, a setting you choose before fitting, like the degree. At λ = 0 there is no penalty. As λ grows, the model is pushed to **shrink** its coefficients toward zero. Ridge shrinks them but does not set them exactly to zero. The next lesson compares it with L1, which does.

> Watch out: the penalty adds up squared coefficients, so it depends on the units of the features. Scale them first, as in "Scaling and encoding". The intercept is usually left out of the penalty.

## Ridge by hand
*What does a penalty do to one coefficient?*

Take a line through the origin, y = w x, so there is one coefficient w. The data are three points: (1, 2), (2, 5) and (3, 6). The fit loss is the sum of squared residuals:

`SSE(w) = (2 - w)² + (5 - 2w)² + (6 - 3w)² = 65 - 60w + 14w²`

Without a penalty the minimum is at w = 30 / 14 = 2.14, where the loss is 0.71. Now add λ w². The total becomes 65 - 60w + (14 + λ)w², which is smallest at w = 30 / (14 + λ).

| λ | w | Fit loss | Penalty | Total |
|---|---|---|---|---|
| 0 | 2.14 | 0.71 | 0.00 | 0.71 |
| 1 | 2.00 | 1.00 | 4.00 | 5.00 |
| 4 | 1.67 | 3.89 | 11.11 | 15.00 |
| 14 | 1.07 | 16.79 | 16.07 | 32.86 |

Take λ = 4. The old answer w = 2.14 now costs 0.71 + 4 × 2.143² = 19.08, more than the 15.00 at w = 1.67. The penalty made the training fit worse, from 0.71 to 3.89, and bought a smaller coefficient.

[[figure:bias-variance-and-shrinkage/penalty-by-hand|The fit loss, the penalty and their sum for λ = 4. The minimum of the sum moves from w = 2.14 to w = 1.67.]]

::: deeper Where the formula comes from
The total loss 65 - 60w + (14 + λ)w² is a parabola in w. Its slope is -60 + 2(14 + λ)w, and it is zero at w = 60 / (2(14 + λ)) = 30 / (14 + λ). In gradient descent, as in "Gradient descent", the penalty only adds 2λw to the slope, so each step also tugs w toward zero. When λ = 14, the sum of the squared x values, the denominator doubles and w is halved.
:::

## Ridge on the overfit curve
*Does a penalty tame the degree 9 curve?*

Go back to the 10 training points and 5 validation points of "Underfitting and overfitting". Degree 9 with no penalty has a training error of 0.00 and a validation error of 17.74. Here it is fitted with a penalty, with x rescaled to run from -1 to 1 and the intercept unpenalized.

| λ | Training error | Validation error | Largest coefficient (not the intercept) |
|---|---|---|---|
| 0 | 0.00 | 17.74 | 903 |
| 0.01 | 0.14 | 0.45 | 6.0 |
| 0.03 | 0.21 | 0.43 | 5.1 |
| 0.1 | 0.37 | 0.56 | 3.9 |
| 1 | 0.86 | 0.99 | 2.0 |
| 10 | 1.84 | 1.83 | 0.5 |

[[figure:bias-variance-and-shrinkage/ridge-fits|The same degree 9 fit with no penalty, a moderate penalty and a very large one.]]

Training error only rises as λ grows, so training error cannot choose λ. Validation error falls to 0.43 at λ = 0.03 and then climbs again, because a large λ flattens the curve toward the baseline that always predicts the mean, whose validation error is 2.72. Five validation points are a noisy guide, so treat 0.43 and 0.45 as a tie.

> Watch out: λ depends on the tool and on how the loss is scaled (a sum or a mean). Compare values of λ only inside one setup.

## The trade-off, again
*What does a penalty do to bias and variance?*

Rerun the 400-sample simulation of degree 9 with a penalty and the same two measures appear. The penalty trades a little bias for a lot less variance.

| λ | Bias squared | Variance |
|---|---|---|
| 0 | 0.00 | 1.74 |
| 0.01 | 0.01 | 0.12 |
| 0.1 | 0.12 | 0.08 |
| 1 | 0.61 | 0.05 |

Add the noise of 0.25 and the totals are about 1.99, 0.39, 0.45 and 0.91 (from unrounded values). A small penalty cuts the variance sharply and costs almost no bias. Past that, bias grows faster than variance falls, and the total rises again. So λ is a dial between overfitting and underfitting, in the same way the degree is.

> Key idea: regularization lowers variance and raises bias. It helps a model that overfits and hurts one that already underfits.

## Learning curves
*How can error against training size tell you what is wrong?*

A **learning curve** plots error against the number of training points: train on n points, then measure the training error on those n and the validation error on a fixed validation set. Repeat on many random samples of each size and take the median. Its shape is a diagnostic.

- **High bias.** Both curves settle at a high level, close together. Degree 1 goes from 0.95 and 1.40 with 10 points to 1.16 and 1.21 with 120, far above the noise floor, the noise variance of 0.25 that no model can remove. More data will not help; the model needs more flexibility.
- **High variance.** A wide gap that closes slowly. Degree 6 goes from 0.06 and 3.76 with 10 points to 0.24 and 0.27 with 120. More data helps, and so does a penalty.

With a penalty of λ = 0.01, degree 6 starts at 0.12 and 0.65 with 10 points. The gap shrinks from 3.70 to 0.53. With 120 points it ends at the same 0.24 and 0.27, because the fit loss grows with the number of points and the penalty does not: a penalty matters most when data is scarce.

[[figure:bias-variance-and-shrinkage/learning-curves|Median training and validation error against training size for degree 1, for degree 6 and for degree 6 with a penalty. Each dot is the median of 41 samples, validated on 400 fresh points.]]

## Before the lab
*What will you do with this in the course lab?*

The next lesson compares the two common penalties, L2 and L1. After it, the course ends with the regularization lab, where you raise the penalty strength and track the coefficients, the training error and the validation error.

Predict before you move anything. At what penalty strength will training error be lowest? Will validation error fall, and then climb again? What happens to the largest coefficient? Check each guess, then name what you see with this lesson's words: bias, variance, shrinkage.

::: remember
- Bias is a consistent miss and variance an inconsistent one: underfitting is high bias, overfitting is high variance, and flexibility trades one for the other.
- A ridge penalty adds λ times the sum of squared coefficients to the loss, which shrinks the coefficients toward zero, lowers variance and raises bias. Choose λ by validation error, never by training error.
- A learning curve with a high plateau and a small gap shows bias; a wide gap that closes with more data shows variance.
:::
