---
slug: lags-seasonality-and-horizons
title: Lags, seasonality and horizons
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Split a series into trend, seasonality and noise, and beat a seasonal-naive baseline before you trust any model.
- Turn a series into lag and window features, and say what a forecast horizon asks of them: one step or many, recursive or direct.
- Score a forecast with MAE, RMSE and MASE by hand, and spot the three places where the future leaks into a forecast.

Before you start: read "Loss functions", "Baselines and splits", "Pipelines and leakage" and "Grouped and temporal splits". They gave you MAE and MSE, the idea of a baseline you must beat, the rule that preprocessing is fitted on training rows only, and the temporal split. This lesson applies all four to data in time order.
:::

## Data in order
*What changes when the rows come in time order?*

A **time series** is a list of values measured at regular steps: sales per quarter, visits per day, power per hour. The order is part of the data. You could shuffle the penguin table and lose nothing. Shuffle a series and you lose the thing you wanted to study, because today's value depends on the values before it.

A **forecast** predicts the values after the last one you have. The moment where your data ends is the **forecast origin**. Everything after it is the future, and a model must never see it while it is built.

This lesson uses one invented series: the quarterly sales of a shop, in units, over three years.

| Year | Q1 | Q2 | Q3 | Q4 |
| --- | --- | --- | --- | --- |
| 1 | 86 | 126 | 102 | 117 |
| 2 | 98 | 139 | 113 | 129 |
| 3 | 109 | 150 | 125 | 143 |

Years 1 and 2 (quarters 1 to 8) are the training data, so the origin is the end of quarter 8. Year 3 (quarters 9 to 12) is the test: the four quarters to forecast.

> Key idea: no shuffling, ever. Training rows come before the origin and test rows after it.

## Trend, seasonality and noise
*What is a series made of?*

Three parts add up to most series. The **trend** is the slow rise or fall. **Seasonality** is a pattern that repeats after a fixed number of steps, the **period**: 4 for quarters, 12 for months, 7 for days of the week. **Noise** is what is left, the part no rule explains.

The shop's series was built from exactly these parts: 100 units, plus 3 more every quarter, plus a seasonal amount of -18, +22, -9 and +5 for Q1 to Q4, plus noise of a few units. Real data comes with no labels on the parts. You see only the sum, and you read the parts off it. Q2 is the high quarter every year (126, 139, 150), and every quarter sits about 12 units above the same quarter a year earlier.

[[figure:lags-seasonality-and-horizons/parts|The shop's 12 quarters (top) and the three parts they add up to: trend, seasonality and noise.]]

A good forecast carries the trend and the seasonal pattern forward. Nothing carries the noise forward, so noise sets a floor under the error: even a perfect model misses by a few units.

## A baseline you must beat
*What is the simplest forecast, and why start with it?*

The **naive** forecast says the next value equals the last one. The **seasonal naive** forecast says the next value equals the value one period ago: Q1 of year 3 is forecast as Q1 of year 2. Both need no training, and both are the bar a model must clear. A model that cannot beat seasonal naive has learned nothing a calendar does not already say.

Take the four test quarters. The error is actual minus forecast.

| Quarter | Actual | Naive | Error | Seasonal naive | Error |
| --- | --- | --- | --- | --- | --- |
| 9 | 109 | 129 | -20 | 98 | +11 |
| 10 | 150 | 129 | +21 | 139 | +11 |
| 11 | 125 | 129 | -4 | 113 | +12 |
| 12 | 143 | 129 | +14 | 129 | +14 |

The **MAE** (mean absolute error, the average miss in units) is (20 + 21 + 4 + 14) / 4 = 14.75 for naive and (11 + 11 + 12 + 14) / 4 = 12 for seasonal naive. Seasonal naive wins, but every one of its errors is positive: it forecasts too low in all four quarters, because it ignores the growth of about 12 units a year.

## Lags and windows
*How do you turn a series into rows a model can learn from?*

A model needs rows of features and a target. Build them from the series itself. A **lag feature** is the value some steps earlier: lag 1 is the last quarter, lag 4 is the same quarter a year ago. A **window feature** summarizes the last few values, such as the mean of the previous 4. The target is the value now.

| Quarter | Target | Lag 1 | Lag 4 | Mean of previous 4 | Target - lag 4 |
| --- | --- | --- | --- | --- | --- |
| 5 | 98 | 117 | 86 | 107.75 | 12 |
| 6 | 139 | 98 | 126 | 110.75 | 13 |
| 7 | 113 | 139 | 102 | 114 | 11 |
| 8 | 129 | 113 | 117 | 116.75 | 12 |

[[figure:lags-seasonality-and-horizons/lags|Row for quarter 6: the target (solid) with its lag 1, its lag 4 and the window of the previous 4 quarters.]]

Quarters 1 to 4 have no lag 4, so eight values give only four training rows. Every lag costs rows at the start. The last column is nearly constant: each quarter is 12, 13, 11 or 12 above the same quarter a year ago, which is the trend. A tiny model can learn that. Forecast = lag 4 + offset, with the offset set to the mean of the last column, (12 + 13 + 11 + 12) / 4 = 12. It uses training rows only.

## One step or many
*How far ahead must the forecast reach, and what can the features use?*

The **horizon** h is how many steps after the origin you forecast. A **one-step** forecast has h = 1. A **multi-step** forecast covers h = 1, 2, 3 and so on: the test year is h = 1 to 4. Error usually grows with h, because you are further from the last value you know.

Every feature must be known at the origin. So for horizon h a lag must be at least h. Lag 1 can serve h = 1 only. Lag 4 serves h = 1 to 4: quarter 9 uses quarter 5, and quarter 12 uses quarter 8, all known.

When a model needs shorter lags there are two ways. **Recursive**: train one one-step model and feed its own forecast back in as the next lag. **Direct**: train one model per horizon, each using only lags at least that long.

[[figure:lags-seasonality-and-horizons/horizon|Recursive and direct forecasting from the origin. The toy rule "next = this + 3" starts at 129 and is repeated on its own output.]]

Recursive is one model but carries errors forward: step 2 starts from step 1's guess. Direct needs several models but never builds on a guess.

## Scoring a forecast
*How do you put one number on the misses?*

**MAE** averages |e|. **RMSE** squares the errors, averages them and takes the square root; it is in units too, but big misses weigh more. **MASE** is MAE divided by a scale: the average absolute error of seasonal naive on the training years, its MAE there. For quarters 5 to 8 that is (12 + 13 + 11 + 12) / 4 = 12. MASE 1 means "as large as seasonal naive's usual miss"; below 1 is better, and it has no units.

The lag-4 model forecasts 110, 151, 125 and 141, so its errors are -1, -1, 0 and +2.

| Forecast | MAE | RMSE | MASE |
| --- | --- | --- | --- |
| Naive | 14.75 | 16.22 | 1.23 |
| Seasonal naive | 12 | 12.06 | 1 |
| Lag 4 + offset | 1 | 1.22 | 0.08 |

For the model, RMSE = sqrt((1 + 1 + 0 + 4) / 4) = sqrt(1.5) = 1.22 and MASE = 1 / 12 = 0.08. Naive has the widest gap between RMSE and MAE because its misses vary most.

[[figure:lags-seasonality-and-horizons/forecasts|The test year: actual sales and the three forecasts. The lag 4 forecast sits almost on the actual line.]]

::: deeper Why the MASE scale comes from training
The test year is unknown when you choose a model, so the scale uses only the training years. It also makes MASE comparable across series. A forecast with MASE 0.5 halves the benchmark's typical miss, whether the series counts units or measures megawatts.
:::

## Why not sMAPE
*Why does a percentage error need a warning?*

Percentage errors are popular because they have no units, so people reach for them first.

> Watch out: **sMAPE** (a percentage error that divides by the actual and the forecast together) looks safe but is not. The same miss scores worse when the forecast is too low, and it jumps toward its ceiling of 200% when the actual is near zero (and reaches it at zero). The note below has numbers. Do not rank models by sMAPE alone.

::: deeper sMAPE in numbers
sMAPE for one value is 2 x |e| / (|actual| + |forecast|). Take an actual of 100. A forecast of 50 is 50 too low: 2 x 50 / (100 + 50) = 0.667, or 66.7%. A forecast of 150 is 50 too high: 2 x 50 / (100 + 150) = 0.4, or 40%. The misses are equal and the scores are not. If the actual is 0, any forecast above 0 gives 2 x f / f = 200%, however small the miss. On the shop's seasonal naive forecast, the first quarter is 2 x 11 / (109 + 98) = 0.106, and the mean over four quarters is 9.65%.
:::

## Leakage through time
*Where can the future sneak into a forecast?*

There are three doors. The first is the **split**. A random split puts test quarters between training quarters, so the model fills gaps and its score says nothing about forecasting. Use a temporal split, as in "Grouped and temporal splits": train on the earlier rows, test on the later ones.

The second is the **features**. A window that looks forward uses the future. At quarter 8 a centered three-quarter average is (113 + 129 + 109) / 3 = 117, and 109 is quarter 9. The trailing average, (139 + 113 + 129) / 3 = 127, uses only the past. A lag shorter than the horizon is the same leak, if you fill it with real test values.

The third is **scaling**. Training quarters run from 86 to 139. Min-max scaling with those numbers puts quarter 10 (150) at (150 - 86) / (139 - 86) = 1.21, outside the range the model saw. Scaling with the whole series' range puts it at exactly 1: the test year has leaked into the scaler and hid the surprise.

> Watch out: leaks make a forecast look better, not worse. A score that is far better than seasonal naive is a reason to search for the leak before you celebrate.

## Before the lab
*What should you carry into the next lesson?*

One test year is one draw: seasonal naive could have been lucky or unlucky. The next lesson, "Rolling backtests and probabilistic forecasts", repeats the test at many origins and replaces a single number with a range.

Then comes the Forecast lab, the last lesson of this course. You will compare a seasonal baseline with a learned model across several forecast windows. Before you open it, write down two guesses: will the learned model beat seasonal naive in every window, and how will its error change as the horizon grows?

Take three habits with you: run seasonal naive first, keep every lag at least as long as the horizon, and judge with MASE next to MAE.

::: remember
- A time series is ordered data: split it by time, never by shuffling, and always compare a model with naive and seasonal naive forecasts.
- Lag and window features come from the past; for horizon h, a lag must be at least h, or the forecast must be recursive or direct.
- MAE, RMSE and MASE score a forecast; sMAPE has caveats. Leakage enters through the split, the features and the scaling.
:::
