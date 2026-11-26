---
slug: rolling-backtests-and-probabilistic-forecasts
title: Rolling backtests and probabilistic forecasts
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Run a rolling-origin backtest with an expanding or a sliding window, and score two models by hand on three forecast windows.
- Explain why one split can crown the wrong model, and compare models window by window instead of on one number.
- Build a prediction interval from backtest errors, check its coverage at each horizon, and say when a regime change calls for retraining.

Before you start: read "Lags, seasonality and horizons" and "Grouped and temporal splits". The first gave you the shop's sales, the seasonal naive forecast and MAE. The second gave you the origin and a rolling origin on a short table. This lesson repeats the test at many origins and replaces a single number with a range.
:::

## Rolling origins
*How does a backtest repeat the test at many moments?*

A single temporal split tests a forecaster at one moment, but a model will forecast at many. The test year may be easy, hard, or sit on either side of a change. A **backtest** replays the past as if it were the future: pick an origin, train on the data up to it, forecast the next 4 quarters (the horizon), compare with what happened, then move the origin forward. Each origin with the four quarters after it is one **window**.

"Grouped and temporal splits" ran this with one-step forecasts. Here each window forecasts a whole year. Two rules decide the training part. In an **expanding window** it starts at quarter 1 and grows by a year at every origin. In a **sliding window** it keeps a fixed length, here the latest 8 quarters, so its start moves forward too.

Expanding uses all the data and gives steadier estimates. Sliding forgets old data, which helps when the pattern drifts, but each fit sees fewer rows. Neither leaks the future: the test quarters always come after the training quarters.

[[figure:rolling-backtests-and-probabilistic-forecasts/windows|Three origins on 20 quarters with a horizon of 4. The expanding window keeps all the past, the sliding window keeps the latest 8 quarters, and the test quarters are solid.]]

## Three windows by hand
*What do two models score at three origins?*

The data is the shop's series from the last lesson, now six years long. Years 1 to 3 are the same table. Years 4 to 6 are new and invented, and growth slows in year 5.

| Year | Q1 | Q2 | Q3 | Q4 | Total |
| --- | --- | --- | --- | --- | --- |
| 1 | 86 | 126 | 102 | 117 | 431 |
| 2 | 98 | 139 | 113 | 129 | 479 |
| 3 | 109 | 150 | 125 | 143 | 527 |
| 4 | 120 | 163 | 136 | 156 | 575 |
| 5 | 124 | 167 | 139 | 161 | 591 |
| 6 | 128 | 172 | 142 | 165 | 607 |

Two models forecast a quarter. **Seasonal naive** copies the same quarter one year earlier. **Lag 4 + offset** adds to that copy the average year-over-year change in the training years. By hand, the offset is the change in yearly totals, first to last training year, divided by the number of year gaps and by 4.

> Worked example: window 1 trains on years 1 and 2. The offset is (479 - 431) / 1 / 4 = 12, so the forecast for year 3 is year 2 plus 12: 110, 151, 125, 141. The actuals are 109, 150, 125, 143, so the errors (actual minus forecast) are -1, -1, 0, +2 and the MAE is (1 + 1 + 0 + 2) / 4 = 1. Seasonal naive copies 98, 139, 113, 129: errors 11, 11, 12, 14 and MAE 12.

## Why one window misleads
*Can the same two models swap places depending on the cut?*

Windows 2 and 3 follow the same recipe, with year 4 and year 5 as the test.

| Window | Train | Test | Seasonal naive errors | Lag 4 + offset errors | MAE naive | MAE offset |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | years 1 to 2 | year 3 | 11, 11, 12, 14 | -1, -1, 0, +2 | 12 | 1 |
| 2 | years 1 to 3 | year 4 | 11, 13, 11, 13 | -1, +1, -1, +1 | 12 | 1 |
| 3 | years 1 to 4 | year 5 | 4, 4, 3, 5 | -8, -8, -9, -7 | 4 | 8 |

> Worked example: window 3 has totals 431 and 575, so the offset is (575 - 431) / 3 / 4 = 12 again. The forecast for year 5 is year 4 plus 12: 132, 175, 148, 168. The actuals are 124, 167, 139, 161, so the errors are -8, -8, -9, -7 and the MAE is 8.

Cut after year 2 or year 3 and lag 4 + offset looks 12 times better. Cut after year 4 and seasonal naive looks 2 times better. Same models, same series, and the verdict flips with the cut.

[[figure:rolling-backtests-and-probabilistic-forecasts/three-windows|MAE of both models in each window and on average. Lag 4 + offset wins windows 1 and 2 by a wide margin and loses window 3.]]

## Comparing models across windows
*How do you read three windows without being fooled?*

The mean MAE is 9.33 for seasonal naive and 3.33 for lag 4 + offset, so the offset model is about 2.8 times better on average. That number alone hides the flip in the latest window. Report more.

- **Every window.** The per-window MAEs show that window 3 behaves differently.
- **Wins.** Lag 4 + offset won 2 of 3 windows.
- **Paired differences.** Naive minus offset is 11, 11 and -4, with a mean of 6. Comparing models inside the same window removes the difficulty of that window.
- **The latest window.** It is the closest to the future. A model that wins on average and loses the latest window is a warning.

Three windows are thin. Use as many origins as the data allow, and move the origin by 1 quarter, not 4, if you need more windows.

> Watch out: every model must be scored on the same origins and the same horizon, and any setting you tune (the lag, the window length) must be chosen inside each training part only. Tuning on the test windows is the leak that "Nested cross-validation" describes.

## From one number to a range
*How do backtest errors become a prediction interval?*

A forecast of 134 units is one guess. A **prediction interval** is a range meant to contain the actual value with a stated probability, for example 80%. **Coverage** is the share of actuals that really fall inside. The backtest already holds the raw material: errors the model made on quarters it had not seen.

Sort the 12 errors of lag 4 + offset: -9, -8, -8, -7, -1, -1, -1, -1, 0, 1, 1, 2. With only 12 errors the whole range is the only safe 80% choice, so the interval is the forecast plus -9 to plus 2.

## Reading the interval
*What does the interval say about year 6?*

> Worked example: refit at origin 20 on years 1 to 5. The offset is (591 - 431) / 4 / 4 = 10, so year 6 is forecast as year 5 plus 10: 134, 177, 149, 171. The intervals are 125 to 136, 168 to 179, 140 to 151 and 162 to 173. The actuals, 128, 172, 142 and 165, all fall inside.

[[figure:rolling-backtests-and-probabilistic-forecasts/intervals|The 12 backtest errors, colored by window, and the intervals they give for year 6. The actuals (dots) sit in the lower part of each interval.]]

The interval leans down because window 3 over-forecast, and it is wide, 11 units, because window 3 is in the pool. Four hits in four tells you little about 80% coverage. The counting idea is the same as in "Conformal prediction" (the Level 3 uncertainty course), applied here to signed errors with a lower and an upper rank, and "Interval lab" builds such intervals.

::: deeper Why the whole range of 12 errors
A new error is equally likely to land in any of 13 places relative to 12 sorted errors: below the smallest, between two neighbors (11 places), or above the largest. The whole range covers 11 of 13, about 85%. Dropping the smallest and the largest covers 9 of 13, about 69%, below the 80% asked for. This counting assumes errors that could be shuffled, and backtest errors are in time order with a regime change inside, so treat 80% as a target to check and not as a promise.
:::

::: deeper Quantile models and the pinball loss
A **quantile model** predicts a chosen quantile directly. Train one for the 0.1 quantile and one for the 0.9 quantile, and the pair is an 80% interval. The loss is the **pinball loss**: for quantile level 0.9, an actual above the forecast costs 0.9 times the miss, and an actual below costs 0.1 times the miss. With a forecast of 150, an actual of 160 costs 0.9 x 10 = 9, and an actual of 140 costs 0.1 x 10 = 1. Forecasting too low costs 9 times as much, so the best forecast rises until about 90% of actuals fall below it.
:::

## Coverage at each horizon
*Does the same interval keep its promise 1, 2, 3 and 4 quarters ahead?*

Check coverage per horizon, not only overall. Errors usually grow with the horizon, so one pooled number hides intervals that are fine at h = 1 and wrong at h = 4.

Take a simple case: a random walk (every quarter adds an independent shock) forecast by its last value. The error h quarters ahead is the sum of h shocks, so its spread is the square root of h times the one-step spread. An 80% interval cut from one-step errors covers 80% at h = 1, but only 64%, 54% and 48% at h = 2, 3 and 4.

[[figure:rolling-backtests-and-probabilistic-forecasts/coverage-by-horizon|Coverage of an 80% interval whose width comes from one-step errors, for a random walk. The interval needs to be twice as wide at 4 quarters ahead.]]

The fix is to collect the errors for each horizon separately and cut one interval per horizon. Then count hits per horizon over all windows. Hits vary by chance: on 20 windows an 80% interval expects 16 hits, with a standard error of 9 points. The **standard error** is the usual size of the random swing in a hit rate, here the square root of 0.8 x 0.2 / 20, about 0.09. A count of 13 of 20 (65%) is 1.7 standard errors low and worth a look, and 15 of 20 is not. With our 3 windows each horizon has 3 errors, so coverage can only be 0%, 33%, 67% or 100%.

## Regimes and retraining
*When has the pattern changed enough that the model must be refit?*

A **regime** is a stretch of time in which the rule linking the past to the future stays about the same. A **regime change** breaks it: a price rise, a new competitor, a closed store. The shop grew 48 units a year until year 4, then 16 in year 5. "Covariate and concept shift" called this concept shift.

The signs are in the errors. Window 3's errors are all -7 to -9, one sign, a bias and not noise. Interval hits fall below target, or the recent MAE climbs above the worst window of the backtest.

Now the sliding window pays off. After year 5 the expanding offset is (591 - 431) / 4 / 4 = 10, while a sliding window over years 4 and 5 gives (591 - 575) / 1 / 4 = 4. For year 6 the MAE is 6 for expanding, 4 for seasonal naive and 0.5 for sliding. Earlier the two rules agreed, because growth was steady. The cost is that fewer rows give a less stable estimate.

Retrain on a schedule, such as every quarter, or when a monitored error crosses a threshold chosen from the backtest, and recalibrate intervals on recent errors. Do not react to one window.

## Before the lab
*What should you carry into the Forecast lab?*

You can now test a forecaster the way it will be used. The Forecast lab, the last lesson of this course, compares a seasonal baseline and a learned model across multiple forecast windows.

Before you open it, write down three guesses. Will the learned model beat the baseline in every window? At which horizon will its intervals miss the most? What would you look at to decide whether the data changed?

Habits to keep: the same windows for every model, per-window numbers beside the mean, and coverage per horizon.

::: remember
- A rolling-origin backtest repeats the test at many origins, with an expanding or a sliding training window. One window can crown the wrong model, so compare models window by window.
- A prediction interval can be cut from backtest errors, one set per horizon. Check coverage per horizon, and expect it to fall when the horizon grows and the width does not.
- A regime change shows as errors of one sign and falling coverage. A sliding window, a refit and recalibrated intervals respond to it, and a backtest can test that policy too.
:::
