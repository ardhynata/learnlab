---
slug: underfitting-and-overfitting
title: Underfitting and overfitting
kind: reading
simulator: ''
minutes: 15
---
::: intro
- Tell underfitting from overfitting by looking at a model's curve and its two errors.
- Read training error and validation error as a pair, and compare them with a baseline.
- Name what to try next for each problem: more flexibility, more data or a simpler model.

Before you start: read "Baselines and splits".
:::

## Learning the pattern, not the points
*What do we want a model to learn from its training data?*

A model learns from examples, but we do not really care about those examples. We care about the next ones: tomorrow's email, the next patient, the penguin nobody has weighed yet. Doing well on data the model has not seen is called **generalization**.

Real data is a **pattern** plus **noise**, the random scatter that no model can predict. A model generalizes when it captures the pattern and ignores the noise. It can fail in two opposite ways:

- **Underfitting.** The model is too simple to capture the pattern.
- **Overfitting.** The model is so flexible that it captures the noise as well.

In this lesson the model is a **polynomial**. Degree 1 is a straight line with no bends. Degree 3 can bend twice, and degree 9 up to eight times. The figure fits the same 10 training points three times. The crosses are 5 validation points that were held back and never used for fitting, and the dashed line is the true pattern behind the data.

[[figure:underfitting-and-overfitting/fit-panels|The same 10 training points fitted with degree 1, 3 and 9. The crosses are held-back validation points and the dashed line is the true pattern.]]

## Underfitting: too rigid
*What does a model that is too simple look like?*

The line in the left panel cannot bend, so it cannot follow the rise and fall in the data. It misses the training points and the validation points by about the same amount.

To put numbers on this we need a measure of "how far off". Here **error** means **mean squared error**: the average of the squared gaps between the predictions and the true values. Lower is better. The line has a training error of 1.02 and a validation error of 1.06.

Underfitting has a clear signature: **both errors are high, and they are close together.** The model has no hidden problem. It simply cannot bend enough to follow the pattern.

Common causes are a model with too little flexibility, features that do not contain the answer (guessing a house price without knowing its size), and training that stopped too early.

> Key idea: an underfit model is bad on the data it learned from and just as bad on new data.

## Overfitting: too eager
*What does a model look like when it learns the noise?*

The degree 9 curve in the right panel has 10 coefficients (the numbers the fit adjusts) and 10 training points to match, so it can pass through every one of them: its training error is 0.00. But each point sits a little off the true pattern because of noise, and the curve twists to reach all of them. Between and beyond the dots it swings wildly, and on the 5 validation points its error is 17.74.

That is the signature: **training error is low, and validation error is much higher.** The model memorized. A student who memorizes last year's exam answers scores 100% on that exam and still fails a new one.

Overfitting needs two ingredients: a flexible model, and noise or odd details for it to chase. A model with little flexibility cannot chase much. Points with less noise give a flexible model less to chase.

> Watch out: a tiny training error is not a sign of success. It is exactly what an overfit model shows.

## Reading the two errors
*How do the numbers tell you which problem you have?*

Here are four models fitted to the same 10 training points, each measured on the training points and on the 5 validation points. The first row is a **baseline**: a "model" that always predicts the mean of the training answers, 5.01. A baseline tells you what knowing nothing scores.

| Model | Training error | Validation error |
|---|---|---|
| Mean only (baseline) | 2.76 | 2.72 |
| Degree 1 | 1.02 | 1.06 |
| Degree 3 | 0.27 | 0.46 |
| Degree 9 | 0.00 | 17.74 |

[[figure:underfitting-and-overfitting/error-pairs|Training and validation error for the baseline and three polynomials. The degree 9 validation bar is far off the scale.]]

**Degree 1** beats the baseline, but both of its errors stay far above degree 3's: underfitting. **Degree 3** has low errors. Its validation error is 0.46, about 1.7 times its training error of 0.27, and a small gap like that is normal because the curve was fitted to one set and not the other. **Degree 9** has training error 0.00 and validation error 17.74, about 6.5 times worse than the baseline's 2.72: it does worse than knowing nothing.

> Key idea: read the two errors together and against a baseline. High and close means underfitting. Low on training and much higher on validation means overfitting.

::: deeper Check the baseline with a pencil
The training answers add up to 50.1, so their mean is 50.1 / 10 = 5.01. The squared gaps from 5.01 are 1.42, 1.42, 6.71, 2.22, 1.66, 1.23, 2.28, 7.90, 1.72 and 1.02, which add up to about 27.57. Dividing by 10 gives 2.757, which rounds to 2.76.

On the validation answers 5.6, 7.7, 4.4, 3.6 and 3.1 the squared gaps from 5.01 are 0.35, 7.24, 0.37, 1.99 and 3.65. They add up to about 13.59, and 13.59 / 5 is about 2.72.
:::

## What moves the balance
*What makes a model more likely to underfit or to overfit?*

Three things matter most.

- **Flexibility.** A higher degree can follow more bends. Later you will meet other dials with the same effect, such as how many neighbors a k-NN model asks.
- **Noise.** The more scatter there is around the true pattern, the more a flexible model has to chase.
- **Amount of data.** With more points, a curve that is wrong between them is caught sooner, so a flexible model is held closer to the pattern.

The figure repeats one experiment on random samples of 10 to 120 points. The noise leaves an error of about 0.25 that no model can remove. Each dot is the median of 41 random samples. Training error is measured on the sample itself, validation error on 400 fresh points.

[[figure:underfitting-and-overfitting/more-data|Median error against the number of training points. More data closes the gap for degree 6. For degree 1 it does not lower the errors much.]]

::: deeper The learning curves in numbers
With 10 points, degree 6 has a training error of 0.06 and a validation error of 3.76. With 120 points they are 0.24 and 0.27, almost equal and close to the noise floor. Degree 1 goes from 0.95 and 1.40 to 1.16 and 1.21: the gap closes, but both settle far above 0.25.
:::

> Key idea: more data shrinks overfitting. It does not fix underfitting, because the model still cannot bend enough.

::: deeper Why degree 9 reaches exactly zero
A polynomial of degree d has d + 1 coefficients. With 10 points at different x values, a degree 9 polynomial has 10 coefficients, which is just enough to solve for a curve through every point. That is why the training error above is 0.00. A model with as many free numbers as there are points can always match them, whether or not the points mean anything.
:::

## What to try next
*What do you change when you find each problem?*

Once you know which side you are on, the fix points the other way.

[[figure:underfitting-and-overfitting/what-to-try|Compare the two errors and a baseline, then choose: more flexibility for underfitting, more data or a simpler model for overfitting.]]

- **If it underfits,** make the model more flexible (a higher degree), give it features that carry real information, or train it for longer. Extra data of the same kind will help little.
- **If it overfits,** collect more training data, choose a simpler model, or use fewer features. A method called **regularization** adds a penalty for extreme coefficients, which discourages wild curves.
- **If it is about right,** stop tuning and report the result.

Every choice here, such as the degree, is a setting you pick before fitting. Pick it by validation error, never by training error, which always favors the most flexible model.

> Watch out: if you keep trying settings and checking the same validation points, you slowly fit those points too. The next lesson shows how the third set, the test set, guards against that.

::: deeper Bias and variance
Statisticians give the two failures other names. Underfitting is **high bias**: the model is systematically off because its shape cannot match the pattern. Overfitting is **high variance**: the fitted curve would change a lot if you drew a different sample of training points. The two pull against each other, so the goal is the sweet spot between them.
:::

## Before the lab
*What will the course lab let you try?*

The lab in this course sets up the same experiment on a bigger scale. It draws a noisy curve with 30 points, splits them into training points and validation points, and fits a polynomial whose degree you control from 1 to 12. You can also change the noise and the number of training points, and a chart shows both errors at every degree.

Before you move the degree slider, predict. At which degree will training error be lowest? Where will validation error stop falling and start to climb? Then check, and use this lesson's signatures to name what you see: both errors high and close, or training error low with validation error much higher.

Then change the number of training points and the noise, and predict again. The lesson showed that more data closes the gap, and that more noise gives a flexible model more to chase. Check both in the lab.

::: remember
- Underfitting means both errors are high and close together. Overfitting means low training error and much higher validation error.
- Read the two errors as a pair and compare them with a baseline, because training error alone always rewards a more flexible model.
- More data and a simpler model help overfitting. More flexibility and better features help underfitting.
:::
