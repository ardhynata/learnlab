---
slug: log-loss-and-fitting
title: Log loss and fitting
kind: reading
simulator: ""
minutes: 18
---
::: intro
- Compute the log loss of one prediction, and of a small set, by hand.
- Explain why a confident wrong answer is punished far harder than a hesitant one, and how that differs from squared error.
- Describe how gradient descent fits the coefficients, and follow one step on a tiny example.

Before you start: read "Probabilities and the sigmoid" and "Loss functions".
:::

## A probability needs a better score than right or wrong
*Why is counting mistakes not enough for a model that gives probabilities?*

A logistic regression model does not only answer "spam" or "not spam". It gives a probability, such as 0.99 or 0.6. Counting right and wrong answers throws that number away. Say an email really is spam. A model that gives it 0.99 and a model that gives it 0.51 are both right once you call everything above 0.5 "spam", yet the first one is far more sure.

The same blindness hides the worst mistakes. Say an email is not spam. A model that gives it 0.6 and a model that gives it 0.99 are both wrong, but the second would send a real message to the bin with total confidence.

To fit the coefficients, the computer needs a score that notices how sure the model was. That score is **log loss**, also called cross-entropy. It is a loss in the sense of "Loss functions": one number for the whole data set, lower is better, and the fitting procedure looks at nothing else.

> Key idea: log loss scores the probability the model gave, not only the answer it picked.

## The loss for one example
*How much does a single prediction cost?*

Every training example has a true label, 1 or 0, and the model gives a probability **p** that the label is 1. Log loss looks at the probability the model gave to what really happened:

- True label 1: `loss = -ln(p)`
- True label 0: `loss = -ln(1 - p)`

Here `ln` is the natural logarithm, a button on any calculator. You only need its shape: `ln(1)` is 0, and the `ln` of a number near 0 is a large negative number. So a small probability for the truth gives a large positive loss.

| Probability the model gave to what happened | Loss |
|---|---|
| 0.99 | 0.010 |
| 0.9 | 0.105 |
| 0.7 | 0.357 |
| 0.5 | 0.693 |
| 0.3 | 1.204 |
| 0.1 | 2.303 |
| 0.01 | 4.605 |

[[figure:log-loss-and-fitting/loss-curve|The loss of one example against the model's probability of class 1. The curve for true label 1 falls as p rises; the curve for true label 0 is its mirror image.]]

The loss is never negative, and it is 0 only when the model gives the truth probability 1.

## Confident and wrong
*Why does a wrong answer cost so much more when the model was sure?*

Read the table from the bottom. When the model gave the truth only 0.5, the loss is 0.693, the same whichever label is true. At 0.1 it is 2.303, more than three times as much. At 0.01 it is 4.605. There is no ceiling: at 0.001 the loss is 6.908, and it keeps growing as the probability for the truth goes to 0. Each time that probability shrinks by a factor of ten, the loss rises by about 2.3.

Being right and sure costs almost nothing: 0.010 at 0.99. So the model is rewarded for confidence when it is right and charged heavily when it is wrong. The safe move for a model that has no idea is to say about 0.5 and pay 0.693 whichever way the label falls.

> Watch out: `-ln(0)` is infinite. In code, p is often kept a tiny distance away from 0 and 1 so that one extreme prediction cannot make the whole loss infinite.

This is the behavior we want from a model that reports probabilities: a model that says 99 percent should be right about 99 times in 100, and log loss is hardest on the ones that are not.

## Averaging over the data
*How do several examples become one score?*

The loss of a data set is the **mean** of the losses of its examples. Here are four examples and two models.

| Example | True label | Model A: p | Model B: p | Loss A | Loss B |
|---|---|---|---|---|---|
| 1 | 1 | 0.8 | 0.8 | -ln(0.8) = 0.223 | 0.223 |
| 2 | 1 | 0.7 | 0.7 | -ln(0.7) = 0.357 | 0.357 |
| 3 | 0 | 0.3 | 0.3 | -ln(0.7) = 0.357 | 0.357 |
| 4 | 0 | 0.6 | 0.99 | -ln(0.4) = 0.916 | -ln(0.01) = 4.605 |
| Mean | | | | 0.463 | 1.385 |

[[figure:log-loss-and-fitting/two-models|The loss of each example under the two models. They differ only on example 4, where model B is confidently wrong.]]

With a cutoff of 0.5 both models get examples 1 to 3 right and example 4 wrong, so both have an accuracy of 3 out of 4. Log loss tells them apart: 0.463 against 1.385. Example 4 supplies 83 percent of B's total.

There is also a baseline. A model that says 0.5 for every example pays 0.693 on each, so its mean is 0.693. Model A beats that. Model B, with 1.385, is worse than a model that never looks at the data.

## Why not squared error?
*Why not reuse the loss from linear regression?*

You could treat the label as the number 0 or 1 and use the squared miss `(y - p)²`, as in MSE. It points the right way, but it is too gentle. Take a true label of 1:

- The model says p = 0.1: squared error is (1 - 0.1)² = 0.810, log loss is 2.303.
- The model says p = 0.01: squared error is (1 - 0.01)² = 0.980, log loss is 4.605.

Squared error can never exceed 1 for a probability, so a 99-percent-sure mistake costs almost the same as a 90-percent-sure one. Log loss doubles from 2.303 to 4.605. It keeps pushing harder, the surer the model was.

[[figure:log-loss-and-fitting/log-vs-squared|For a true label of 1, log loss climbs without limit as p falls, while squared error levels off below 1.]]

> Key idea: log loss is built from the probability the model gave to the truth, so it has no ceiling. Squared error on a probability does.

::: deeper Why squared error also learns slowly
Gradient descent follows the slope of the loss with respect to the raw score z, the number the sigmoid turns into p. For log loss that slope is `p - y`. For squared error it is `2(p - y) p (1 - p)`.

Take a true label of 0 and a model that says p = 0.99. Log loss has slope 0.99. Squared error has slope 2 × 0.99 × 0.99 × 0.01 = 0.0196, about 50 times smaller. The model is badly wrong, yet squared error barely nudges it.
:::

## Fitting by gradient descent
*How does the computer find coefficients with a low log loss?*

The model is `p = sigmoid(w x + b)`: a weight w for each feature and an intercept b, the **coefficients**. Any choice of them gives a mean log loss you can compute, so fitting means finding coefficients that make it small. There is no formula to jump to the answer, so the computer searches with **gradient descent**:

1. Start with some coefficients; zeros are fine.
2. For each coefficient, find the **gradient**: how fast the loss rises when you nudge it up.
3. Move each coefficient a small step the other way, downhill. The step size is the **learning rate**.
4. Repeat until the loss stops falling.

For log loss the gradient is simple. Average over the examples:

- weight: `(p - y) × x`
- intercept: `p - y`

Read it as error times input. An example pulls hard when its probability is far from its label, and a feature with a large x pulls its own weight harder. A sure and right example (p close to y) hardly pulls at all.

::: deeper Where p - y comes from
Chain three slopes. For a true label of 1, the loss `-ln(p)` has slope `-1/p` with respect to p, and the sigmoid has slope `p(1 - p)` with respect to z. Multiply them: `-(1 - p)`, which is `p - 1`, which is `p - y`. For a true label of 0 the loss slope is `1/(1 - p)`, and the product is `p`, which is `p - 0`. Then z = w x + b has slope x with respect to w and 1 with respect to b. The awkward `p(1 - p)` cancels, which is one more reason log loss suits the sigmoid.
:::

## One step by hand
*What does a single step do to the numbers?*

Take one feature x, already centered at 0 (hours of practice minus the class average), and four examples: x = -3, -1, 1, 3 with labels 0, 0, 1, 1 (fail, fail, pass, pass). Start at w = 0 and b = 0, so every p is 0.5 and the mean loss is 0.693. Use a learning rate of 0.5.

1. **Errors.** `p - y` is 0.5, 0.5, -0.5, -0.5.
2. **Gradient for w.** The mean of `(p - y) × x` is (0.5 × -3 + 0.5 × -1 + -0.5 × 1 + -0.5 × 3) / 4 = -4 / 4 = -1.
3. **Gradient for b.** The mean of `p - y` is (0.5 + 0.5 - 0.5 - 0.5) / 4 = 0.
4. **Update.** w = 0 - 0.5 × (-1) = 0.5, and b stays 0.

The new probabilities are 0.182, 0.378, 0.622 and 0.818, each on the correct side of 0.5. The mean loss fell from 0.693 to 0.338.

[[figure:log-loss-and-fitting/one-step|Left: the model before and after the first step. Right: the mean log loss as w grows, with the first two steps marked.]]

A negative gradient means that raising w lowers the loss, so w goes up. A second step gives w = 0.731 and a loss of 0.249. The second step uses a gradient of -0.462. The gradients shrink (-1, then -0.462), so each step moves less than the one before.

::: deeper When the loss never stops falling
These four examples can be separated perfectly by a cutoff at x = 0. Then a larger w always pushes every probability closer to its label and lowers the loss, so with this data gradient descent could keep raising w forever. Real fits stop after a set number of steps or when the loss stops improving noticeably, so the weight stays finite.
:::

## From probabilities to decisions
*What does a fitted model give you, and what comes next?*

Here is the chain so far. The sigmoid turns a score into a probability. Log loss scores the probabilities, with a heavy price for confident mistakes. Gradient descent adjusts the coefficients until the mean log loss is low.

Notice what the fitting never used: a cutoff. A fitted model gives probabilities, not decisions. Turning a probability into "spam" or "not spam" is a separate step with its own choice, the threshold, and it changes which mistakes you make. That is the subject of the next reading, "Thresholds and decisions". After it comes the lab that closes this course, where you move the threshold yourself and watch which examples become false positives and false negatives.

Keep two things in mind when you get there. A model with a low log loss tends to give probabilities that are worth taking seriously, when checked on data it has not seen. And the best threshold depends on what each kind of mistake costs, not on the loss.

::: remember
- Log loss is `-ln(p)` for the probability p the model gave to what really happened. It is small when the model is right and sure, and grows without limit when it is wrong and sure.
- Squared error on a probability stops at 1, so it hardly separates a hesitant mistake from a confident one. Log loss does.
- Gradient descent fits the coefficients by stepping against the gradient, `(p - y) × x` for a weight and `p - y` for the intercept.
:::
