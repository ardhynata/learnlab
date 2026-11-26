---
slug: aleatoric-and-epistemic-uncertainty
title: Aleatoric and epistemic uncertainty
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Tell aleatoric uncertainty (noise in the data) from epistemic uncertainty (lack of knowledge), and say which one more data can shrink.
- Read the disagreement of an ensemble as a sign of epistemic uncertainty, and compute a pinball loss by hand.
- Explain how a prediction interval differs from a confidence interval, and why noise that changes with the input needs a band that changes with it.

Before you start: read "Sampling variability and the bootstrap" in Probability and statistical uncertainty, "Bagging and random forests" in Tree ensembles, and "Loss functions" in Linear regression.
:::

## Two ways of not knowing
*Why does "I am not sure" mean two different things?*

Until now a model gave one number. A delivery service wants to promise customers a delivery time. Here is a made-up service, so that we know the truth: a delivery over x km takes on average 10 + 3x minutes, but single deliveries vary around that average with a standard deviation of 4 minutes. You fit a line to past deliveries and it predicts 28 minutes for 6 km. Two separate doubts hide behind that number.

The first doubt: even if you knew the rule exactly, two 6 km deliveries would not take the same time. A red light, a slow lift, a wrong turn. This is **aleatoric uncertainty** (from the Latin word for dice): noise in the data itself. No model and no extra data can remove it.

The second doubt: your line was fitted to a limited number of past deliveries, so the rule you learned is itself a little off. This is **epistemic uncertainty** (from the Greek word for knowledge): a lack of knowledge. It shrinks as you collect more data.

> Key idea: ask of every doubt, "would more data of the same kind remove it?" If yes, it is epistemic. If no, it is aleatoric.

## More data shrinks only one of them
*Which doubt goes away when you collect more deliveries?*

Fit a straight line to n past deliveries, spread evenly between 1 and 12 km, with the noise of 4 minutes from the last section. Predict at 6 km. A different set of n deliveries would give a slightly different line, so the prediction **wobbles**: its standard error, the quantity from "Sampling variability and the bootstrap". For this setup it is about 4.05 / sqrt(n) minutes, the usual formula for a straight-line fit when the noise is the same everywhere.

> Worked example: for n = 80 the wobble is 4.05 / sqrt(80) = 4.05 / 8.94 = 0.45 minutes. Quadruple n to 320 and it halves to 4.05 / 17.89 = 0.23.

| Training deliveries (n) | Epistemic wobble at 6 km | Aleatoric spread of one delivery |
| --- | --- | --- |
| 5 | 1.81 | 4.0 |
| 20 | 0.91 | 4.0 |
| 80 | 0.45 | 4.0 |
| 320 | 0.23 | 4.0 |

The middle column keeps falling, by the same square-root rule as before: four times the data halves it. The last column never moves, because the noise belongs to the deliveries, not to the model.

[[figure:aleatoric-and-epistemic-uncertainty/shrink-vs-floor|The wobble of the fitted line falls as n grows, while the spread of single deliveries stays at 4.0 minutes.]]

> Watch out: the border between the two depends on what the model may look at. If you add the traffic level as a feature, part of what was noise becomes explainable. Aleatoric means "noise, given these inputs".

## An ensemble shows what the data does not settle
*How can a model reveal that it is unsure for lack of data?*

Train several models, each on a different bootstrap sample of the same training set, as in "Bagging and random forests". Where the training data is plentiful, every model sees nearly the same picture, so the models agree. Where the data is thin or absent, each model fills the gap in its own way, and the models disagree. That **disagreement** is a measure of epistemic uncertainty.

Take 14 past deliveries, all between 1 and 8 km, and fit five straight lines, each to its own bootstrap sample. The figure shows them. Ask each line about two trips.

> Worked example: at 4 km the five predictions are 21.2, 22.2, 22.6, 21.6 and 21.6 minutes. The mean is 109.2 / 5 = 21.84. The squared gaps from the mean add up to 1.23, so the variance is 1.23 / 5 = 0.25 and the standard deviation is 0.5. At 12 km, past the end of the data, the predictions are 37.8, 40.7, 52.9, 47.8 and 39.7. The mean is 43.78, the squared gaps add up to 161.2, the variance is 32.2 and the standard deviation is 5.7.

The models disagree more than ten times as much at 12 km as at 4 km, which is the honest answer: the data says little about long trips.

[[figure:aleatoric-and-epistemic-uncertainty/ensemble-disagreement|Five lines fitted to bootstrap samples of 14 deliveries. They agree inside the data and fan out beyond 8 km.]]

> Watch out: disagreement sees only the epistemic part. At 6 km all five models may agree on 28 minutes while single deliveries still scatter by 4 minutes. An ensemble also cannot warn you when all its members share the same blind spot.

::: deeper Adding the two kinds together
If every model also says "a single delivery scatters with a standard deviation of 4 minutes", the total variance (the standard deviation squared) is the average noise variance plus the variance of the predictions. At 4 km that is 16 + 0.25 = 16.25, a standard deviation of 4.0. At 12 km it is 16 + 32.2 = 48.2, a standard deviation of 6.9. Far from the data, the epistemic part is larger than the aleatoric part.
:::

## Predicting a distribution
*What if the model gave a range instead of a single number?*

A single predicted number, the mean, hides the aleatoric spread. A **quantile** is a cut point: the 0.9 quantile is the value that 90% of outcomes fall below, and it is also called the 90th percentile. The Greek letter tau (written τ in this lesson) names the share: τ = 0.9.

For the 6 km deliveries of the made-up service, the 0.9 quantile is about 33 minutes: nine deliveries in ten take less. The 0.1 quantile is about 23. Together they give an **80% interval** of 23 to 33 minutes, with 10% of deliveries below it and 10% above.

**Quantile regression** fits a model whose output is a chosen quantile, one model for each τ you want. "Loss functions" showed that minimizing the squared error gives the mean and minimizing the absolute error gives the median. Quantile regression swaps in a tilted loss, called the pinball loss and defined next, whose best answer is any quantile you ask for.

> Key idea: a model that predicts the 0.1 and 0.9 quantiles predicts a range, not a point, and that range is a statement about the data's noise.

## The pinball loss by hand
*How do you score a prediction that is supposed to be a quantile?*

Let y be the actual value, q the predicted quantile, and τ the share we aim for. The **pinball loss** is τ × (y − q) when the prediction is too low (y at or above q), and (1 − τ) × (q − y) when it is too high. For τ = 0.9, a minute too low costs 0.9 and a minute too high costs only 0.1. Being too low is nine times worse, because a good 0.9 quantile should sit above most outcomes.

> Worked example: five deliveries over one route took 22, 25, 27, 31 and 45 minutes. Score three predictions of the 0.9 quantile.

| Prediction q | Loss on 22 | on 25 | on 27 | on 31 | on 45 | Average |
| --- | --- | --- | --- | --- | --- | --- |
| 27 | 0.5 | 0.2 | 0 | 3.6 | 16.2 | 4.1 |
| 31 | 0.9 | 0.6 | 0.4 | 0 | 12.6 | 2.9 |
| 45 | 2.3 | 2.0 | 1.8 | 1.4 | 0 | 1.5 |

For q = 31 the delivery of 45 is 14 minutes too low: 0.9 × 14 = 12.6. The delivery of 22 is 9 too high: 0.1 × 9 = 0.9. The prediction 45 has the lowest average, 1.5, and 44 or 46 both give 1.6. With only five deliveries the 0.9 quantile lands on the largest one.

[[figure:aleatoric-and-epistemic-uncertainty/pinball-loss|The average pinball loss for τ = 0.9 as the prediction moves. The curve bottoms out at 45, the 90th percentile of the five times.]]

::: deeper Why the lowest point is the quantile
Raise q by one minute. Each delivery below q costs 0.1 more, and each delivery above q costs 0.9 less. If a share F of the deliveries is below q, the average loss changes by 0.1 × F − 0.9 × (1 − F) = F − 0.9. It falls while F is under 0.9 and rises once F is over. So the lowest point is where 90% of the outcomes are below. Between 31 and 45 the share below is 4 of 5, so the loss falls by 0.1 per minute: 2.9 − 14 × 0.1 = 1.5.
:::

## Prediction intervals and confidence intervals
*Which interval answers which question?*

A **confidence interval** says where the true average lies. You met it in "Sampling variability and the bootstrap": resample the training deliveries, refit, and read the percentiles of the fitted value at 6 km. It measures the epistemic wobble, so it shrinks as n grows.

A **prediction interval** says where a new single delivery will land. It must hold the aleatoric spread as well. With normal noise a rough rule is a half-width of z × sqrt(4² + wobble²), where z = 1.28 for an 80% interval.

> Worked example: the fitted line says 28.0 minutes at 6 km. With n = 80 the wobble is 0.45, so the 80% confidence interval is 28.0 ± 1.28 × 0.45 = 28.0 ± 0.6. The prediction interval is 28.0 ± 1.28 × sqrt(16 + 0.2), which is 28.0 ± 5.2.

| Training deliveries (n) | 80% confidence interval, average at 6 km | 80% prediction interval, one delivery |
| --- | --- | --- |
| 80 | 27.4 to 28.6 | 22.8 to 33.2 |
| 320 | 27.7 to 28.3 | 22.9 to 33.1 |

Four times the data cuts the confidence interval in half and hardly moves the prediction interval. The prediction interval cannot shrink below the noise.

> Watch out: a confidence interval is not a range of delivery times. At 6 km most deliveries fall outside 27.4 to 28.6. Promising customers that range would be wrong most of the time.

## Noise that changes with the input
*What changes when the spread is larger for some inputs than for others?*

So far the noise was the same everywhere, which is called **homoscedastic**. Real noise often is not. When the spread changes with the input, it is **heteroscedastic**. Let the standard deviation of a delivery be 1 + 0.5x minutes: 2.0 at 2 km, 4.5 at 7 km and 7.0 at 12 km. Short trips are predictable and long trips are not. The average is still 10 + 3x.

A model that assumes one spread for all trips pools them to about 4.5 minutes, so its 80% band has a half-width of 1.28 × 4.54 = 5.8 minutes everywhere.

| Distance | Noise standard deviation | Band that holds 80% | Share inside the 5.8 band |
| --- | --- | --- | --- |
| 2 km | 2.0 | ± 2.6 | 99.6% |
| 7 km | 4.5 | ± 5.8 | 80% |
| 12 km | 7.0 | ± 9.0 | 59% |

Averaged over all distances the constant band covers about 82%, near the promised 80%. That average hides a band that is too wide for short trips and too narrow for long ones, and the long trips are where customers wait longest.

[[figure:aleatoric-and-epistemic-uncertainty/fan-of-noise|Deliveries whose noise grows with distance. The dashed band has one width; the quantile band widens with distance.]]

Quantile regression avoids the problem because each quantile is fitted as its own function of x, so the 0.1 and 0.9 lines fan out where the data is noisier.

## What comes next
*Can you trust the interval a model reports?*

A quantile band is itself an estimate, and the lesson just showed how an estimate can look right on average and be wrong where it matters. So an interval is a claim to check: how often did outcomes really land inside? That share is the **coverage**, and it should match the level you promised.

The next lesson, "Conformal prediction", keeps a held-out set of deliveries to calibrate an interval so that its coverage holds. After it comes the interval lab, which closes this course: there you build prediction intervals and measure their empirical coverage as the data distribution changes.

::: remember
- Aleatoric uncertainty is noise in the data and stays however much data you collect. Epistemic uncertainty is lack of knowledge and shrinks with more data, and an ensemble shows it as disagreement.
- Quantile regression predicts a quantile by minimizing the pinball loss. Too low costs τ per minute and too high costs 1 − τ, so τ = 0.9 and τ = 0.1 together give an 80% interval.
- A confidence interval covers the average and shrinks with data. A prediction interval covers one new case and stays above the noise, and when the noise is heteroscedastic its width must change with the input.
:::
