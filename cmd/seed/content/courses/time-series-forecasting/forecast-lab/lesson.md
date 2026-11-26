---
slug: forecast-lab
title: Forecast lab
kind: simulator
simulator: forecast-lab
minutes: 30
---
::: intro
- Predict whether a learned lag model or a seasonal baseline wins each forecast window, then read the answer window by window, not from one mean.
- Explain what a longer horizon, fewer lags, a regime shift (a jump in the level of the series) and a different backtest style do to each model and to its 80% interval.
- Repeat a finding on fresh series before you believe it.

Before you start: read "Lags, seasonality and horizons" and "Rolling backtests and probabilistic forecasts". They gave you the three models, MASE, rolling windows and the idea of an interval cut from past errors. This lab lets you break each of them on purpose.
:::

## What the lab asks
*What does the Forecast lab let you compare?*

The lab generates one series of 240 steps: a level, a trend of +0.10 per step, a season of 12 steps with amplitude 3, and noise of 0.5. Its seed fixes it, so everyone starts with the same series. Three models forecast it: **Naive (last value)**, **Seasonal naive**, and the **Learned lag model**. The learned model is a regression on the last 12 values plus a marker for the position in the season, fitted again for every step ahead.

The backtest has 8 windows. Each window picks an origin, trains on the data before it, forecasts 12 steps and scores them. The first origin is step 150, the others follow every 11 steps, and the last window ends on the last step. The default **Backtest style** trains on the last 72 steps (the training slice: the part of the history the model trains on), and the error measure is MASE.

The defaults already hold a regime shift (a jump in the level of the series) of +6 at step 190. The plan below first removes it, to see the models on a calm series, and then lets it back in.

[[figure:forecast-lab/lab-map|The lab screen: the plot with one row per window, four boxes beside it, and the folded groups of controls.]]

## A calm series
*Which model wins when nothing breaks?*

Open the **Regime shift** group and set **Regime shift size (0 = none)** to 0. Now the series is a steady trend plus a repeating season, which is what the learned model is built to capture.

| Model | Mean MASE | Worst window | Windows won |
| --- | --- | --- | --- |
| Naive (last value) | 1.88 | 2.46 (window 8) | 0 of 8 |
| Seasonal naive | 1.07 | 1.20 (window 6) | 0 of 8 |
| Learned lag model | 0.45 | 0.63 (window 1) | 8 of 8 |

> Worked example: MASE divides a window's error by the error seasonal naive made inside that window's own training slice (1.23 in window 1, about the same elsewhere). Seasonal naive's mean MAE of 1.32 gives 1.32 / 1.23 = 1.07. It sits near 1 because the scale is the same kind of error: a copy from one season back.

Seasonal naive misses the trend: one season of growth is 12 x 0.10 = 1.2 units, and it also copies one noisy value. Naive misses the season altogether. The learned model learns both. The same kind of series appears in every window, so the winner does not change.

> Watch out: the margin is wide because the lab's series is exactly a trend plus a season. A real series is messier, so treat 8 wins out of 8 as the clean case, not as a promise.

## How far ahead
*Does the error always grow with the horizon?*

Keep the shift at 0 and set **Forecast horizon (steps)** to 24. The windows move earlier so that 24 steps fit, and **Error by horizon** shows one point per step ahead.

[[figure:forecast-lab/horizon|MASE by step ahead on the calm series, horizon 24. Seasonal naive roughly doubles after one season; the learned model stays low.]]

Seasonal naive has a break at step 13. For steps 1 to 12 it copies a value one season back, which is 12 steps of trend behind. For step 13 and later it can only copy a value two seasons back, 24 steps of trend, so its mean MASE goes from 1.02 to 2.00. The trend gap is 24 x 0.10 = 2.4 against 1.2, exactly twice as large.

The learned model stays between 0.3 and 0.8 at every step. It is fitted separately for each step ahead, so it learns the trend over that distance. Earlier lessons said error usually grows with the horizon. Here it does not, because the pattern never changes. Even with **Noise** at 3.0, the learned model's mean MASE is 1.03 for steps 1 to 12 and 1.02 for steps 13 to 24. A series whose pattern drifts shows the growth.

## What the learned model needs
*Which part of the learned model does the work?*

Set the horizon back to 12, keep the shift at 0 and open **Models**. The learned model has two ways to know where it is in the season: its lags (a full season is 12 values) and the toggle **Learned model knows the position in the season**. The numbers below are mean MASE over the 8 windows.

| Lags used | Position in the season | Mean MASE | Windows won |
| --- | --- | --- | --- |
| 12 | known | 0.45 | 8 of 8 |
| 12 | not known | 0.47 | 8 of 8 |
| 1 | known | 0.75 | 7 of 8 |
| 1 | not known | 1.94 | 0 of 8 |

With 12 lags the season is already inside the inputs, so the toggle adds little. With 1 lag and no season marker, the model sees only the last value and a trend. It has no way to tell a peak from a trough, so it ends worse than seasonal naive (1.07) and about as bad as naive (1.88). That is the case for always keeping the baselines on the screen.

More lags are not free. With a 72-step slice and 12 steps ahead, 12 lags leave 49 training rows for 23 inputs. 24 lags leave 37 rows for 35 inputs.

## A regime shift
*Which model loses more when the series changes level?*

Press **Reset**. The series now has a shift of +6 at step 190. Windows 1 to 3 end before it, window 4 forecasts across it, windows 5 to 8 come after. Before you read the table, answer the **Quick Quiz** under the Parameters box: which model will lose more accuracy?

[[figure:forecast-lab/windows|MASE of each model in each window with the shift. The learned model is best before it, loses windows 5 and 6, and recovers in windows 7 and 8.]]

The learned model loses more, by a wide factor. Its mean MASE rises from 0.46 before the shift to 1.69 after it (3.7 times; "after" means windows 4 to 8, since window 4 already reaches the shift). Seasonal naive rises from 1.04 to 1.61 (1.6 times). The learned model still wins 6 of 8 windows, but after the shift seasonal naive is slightly ahead on average, 1.61 against 1.69. Why does the learned model lose more? In windows 4 and 5 it was fitted on history mostly from before the shift and its lags still hold pre-shift values, so it keeps applying the old pattern. Seasonal naive is wrong for one season only: a single copy from the old regime, then correct again. Window 6 is different: all 12 lags are already post-shift, and the thin training slice explained below is the cause.

::: deeper Why the same forecast gets a lower MASE after a shift
In window 6 seasonal naive's MAE is 1.49 in both backtest styles, yet its MASE is 0.61 with sliding and 0.93 with expanding. The scale, the in-sample seasonal-naive error of that window's training slice, is 2.42 for the sliding slice and 1.60 for the expanding one. The slice holds 16 steps after the shift, and the 12 seasonal differences that cross it are each about 6 larger. For the learned model, 6.90 / 2.42 = 2.85. MASE is comparable between models inside one window, not between settings that change the slice.
:::

## Sliding or expanding
*Does forgetting old data help after a shift?*

Open **Backtest** and switch **Backtest style** to the expanding one. To compare it with sliding, switch **Error measure** to MAE first, because MASE changes its scale between the two styles.

At the default, the learned model's mean MAE is 2.16 with sliding and 1.19 with expanding. Seasonal naive's is 2.13 in both, since its forecast does not depend on the slice. Sliding pays a fewer-rows cost in windows 5 and 6: 3.64 against 2.05, then 6.90 against 1.08. In window 6 the 72-step slice must fit 12 lags and 11 season markers (the inputs that tell the model its place in the season), and 16 of its steps are new. Go back to sliding and set **Lags used by the learned model** to 4, and window 6 falls from 6.90 to 1.76.

The earlier lesson said a sliding window forgets sooner but fits on fewer rows. On this series the cost is clear and the benefit is small: sliding wins window 7 by about 0.2 (0.80 against 1.01) and loses window 8 by about 0.2 (0.98 against 0.80).

::: deeper Can the choice of measure change a verdict?
At the default the mean MAE puts seasonal naive (2.13) just ahead of the learned model (2.16), while the mean MASE (1.40 against 1.23) puts the learned model ahead. Windows won stay 6 of 8 for the learned model in both. Report the per-window numbers.
:::

## Intervals that do not move
*What does an 80% band do when the series changes?*

Open **Errors and intervals**. The band comes from the **Interval for** model, here the learned model, with an **Interval coverage target** of 80%. The lab cuts it once from 34 windows before the first backtest window and never updates it.

[[figure:forecast-lab/band|Actual values inside the 80% band in each window (of 12), without and with the shift. The band holds 80% overall without it and 53% with it.]]

Without a shift the band holds 80% of the actual values. With the shift it holds 53%, and window 5 has 1 of 12 values inside and window 6 has 2 of 12. A band cut from calm history cannot follow a series that moved. The remedy is the one from the earlier lesson: recalibrate on recent errors.

The **Interval coverage by horizon** line moves in steps of 12.5 points, since each step ahead has only 8 windows. Do not read a trend into one dip.

Change **Interval for** to **Seasonal naive** on the calm series. Its band is about twice as wide (3.68 against 1.76 in total width) and still holds only 74%, short of 80%. Width alone does not buy coverage, and a wide band says little: it admits a large miss in advance. A wider band is a less informative forecast, not a better one.

## Fresh series
*Does the result survive another series?*

One seed is one draw. Press **New series**, which moves the seed up by 1, and check the two findings (the calm-series win and the shift loss factor) on seeds 2 to 7. On the calm series the learned model wins 8 of 8 windows on every one of them, with a mean MASE between 0.37 and 0.43 against 0.96 to 1.06 for seasonal naive. With the default shift, the learned model's error after the shift is 3.5 to 4.4 times its error before, and seasonal naive's is 1.4 to 1.6 times. The learned model loses by a wider factor every time.

No real time series is bundled with this course, so the lab has no switch to real data. A fresh seed is the transfer step here, and it tests the idea against a different draw of noise, not a different kind of data. Before you apply the idea to a real series, run the baselines on it, backtest at several origins, and ask what happens when it changes level.

::: remember
- Compare models window by window, with the baselines on screen. On a calm generated series the learned model wins every window, and with a shift it loses a wide factor while seasonal naive loses a smaller one.
- Seasonal naive breaks past one season of horizon. A learned model needs the season in its lags or markers, and a thin training slice with many inputs can make a sliding window worse than an expanding one.
- A band cut once keeps its width but loses coverage when the series changes. Report per-window numbers, compare styles in MAE, and test on fresh series.
:::

@@lab

## Lab: forecasting and backtesting
The lab builds one generated series of 240 steps and scores three models on 8 backtest windows. You change the series, the models, the backtest and the interval, and read the effect in the plot, three charts and a table. The series is always generated: no real time series is bundled with the course, so there is no real-data mode.

### Controls
The Parameters box has five folded groups, **Series**, **Regime shift**, **Models**, **Backtest** and **Errors and intervals**. Only one is open at a time, and **Regime shift** starts open. The **Fullscreen** and **Reset** buttons are at the top of the lab; **Reset** returns every control to its start value.

- **Series**
  - **Season length (steps)** (4 to 24; starts at 12) is how many steps the season takes to repeat.
  - **Trend per step** (-0.10 to +0.30; starts at +0.10), **Seasonal amplitude** (0 to 8; starts at 3.0) and **Noise** (0 to 3; starts at 0.5) set the three parts of the series.
  - **Seed** (1 to 999; starts at 1) picks the random noise. **New series** adds 1 to it.
- **Regime shift**
  - **Regime shift at (time step)** (60 to 230; starts at 190) and **Regime shift size (0 = none)** (-10 to +10; starts at +6.0) set where the level jumps and by how much.
  - **The season also moves at the shift (half a period)** shifts the season pattern by half a period, so peaks become troughs. It starts off.
- **Models**
  - **Naive (last value)**, **Seasonal naive** and **Learned lag model** show or hide each model in the plot, charts and table. They start on.
  - **Lags used by the learned model** (1 to 24; starts at 12) sets how many past values it sees.
  - **Learned model knows the position in the season** gives it a marker for the step of the season. It starts on.
- **Backtest**
  - **Forecast horizon (steps)** (1 to 24; starts at 12).
  - **Backtest style** picks **Expanding: train on everything so far** or **Sliding: train on the last 72 steps**. It starts on sliding.
  - **Number of windows** (3 to 12; starts at 8).
  - **Window shown** (starts at window 4) picks the window drawn in the plot, with a readout such as "4 of 8". **Previous window** and **Next window** step through the windows. You can also click a window in the plot or in **Error in each window**, or press the arrow keys when the plot has focus.
- **Errors and intervals**
  - **Error measure** picks MASE, MAE or RMSE. It starts on MASE.
  - **Interval coverage target** (50% to 95%; starts at 80%) is the share of actual values the band should hold.
  - **Interval for** picks which model's errors cut the band. It starts on the learned model.
- **Quick Quiz** is the button under the Parameters box (a round button at the bottom right on a phone). It asks: "After a regime shift, which model will lose the most accuracy: seasonal naive or the learned lag model?" Pick an answer first, then use the shift.

### Reading the screen
- The plot shows the **Actual series** (black), the shaded forecast windows, the **Regime shift** line, each ticked model's forecast for the window shown (dotted for naive, dashed for seasonal naive, solid for the learned model) and the interval band. The **Forecast origin** is the dotted vertical line. Below it is one row per window: its training slice in grey and its forecast span in colour. The window shown is outlined.
- The status line reads, at the start, "Window 4 of 8, forecasting steps 184 to 195. MASE: Naive (last value) 3.24, Seasonal naive 3.60, Learned lag model 2.74." The line below it reads "80% interval: 6 of 12 actual values in this window are inside, 53% over all windows." At the right: "240 steps, 8 windows, horizon 12".
- **Error in each window** shows one group of bars per window and a marker over the lowest bar of each group. A dashed line labelled "Shift reached" marks the first window that forecasts across the shift. Click a group to show that window.
- **Error by horizon** shows the error at each step ahead, pooled over the windows. **Interval coverage by horizon** shows the share of actual values inside the band at each step ahead, against a dashed line at the target.
- The table **Mean and worst-window error** has the columns **Model**, **Mean MASE** (or MAE or RMSE), **Worst window** and **Windows won**. At the start the learned model has mean 1.23, worst window 2.85 (window 6) and 6 of 8 windows won.
- The **Quick Quiz** answers once you have picked an option and the shift is set so that some windows come before it and some after it. The verdict gives the mean MASE before and after the shift for both models.

### Experiments
Press **Reset** before each experiment so that your numbers match.

1. **A calm series.** Predict: with **Regime shift size (0 = none)** set to 0, how many of the 8 windows does the learned model win? Set it and read the table: mean MASE is 1.88, 1.07 and 0.45 for naive, seasonal naive and the learned model, and the learned model wins 8 of 8. In **Error by horizon**, is any model's error rising with the step ahead? No model grows steadily: naive swings up and down with the season, peaking about half a season out (2.62 at step 7), while seasonal naive and the learned model stay roughly level. Explain why seasonal naive sits near 1.
2. **Past one season.** Predict: set **Regime shift size (0 = none)** to 0 and **Forecast horizon (steps)** to 24. What happens to seasonal naive's error at steps 13 to 24? In **Error by horizon**, seasonal naive jumps from 0.67 at step 12 to 1.92 at step 13, and its mean goes from 1.02 (steps 1 to 12) to 2.00. The learned model stays below 0.8. Explain the jump with the trend over 12 and over 24 steps.
3. **What the learned model needs.** Predict: with **Regime shift size (0 = none)** at 0, does the learned model still beat seasonal naive when you set **Lags used by the learned model** to 1 and switch **Learned model knows the position in the season** off? Try it: its mean MASE is 1.94 against 1.07, and seasonal naive wins all 8 windows. Switch the toggle on and the mean falls to 0.75. Then set the lags back to 12: 0.45. Which input carries the season?
4. **The shift and the style.** Predict: in the **Quick Quiz**, pick which model loses more accuracy after the shift. The verdict appears once you have picked: seasonal naive goes from 1.04 to 1.61 (1.6 times) and the learned lag model from 0.46 to 1.69 (3.7 times). Next, set **Error measure** to MAE and **Backtest style** to the expanding option, and compare window 6: the learned model's MAE is 6.90 with sliding and 1.08 with expanding. Switch **Backtest style** back to sliding and set **Lags used by the learned model** to 4: window 6 falls to 1.76. What does a short slice with many inputs do?
5. **The frozen band.** Predict: what share of actual values will the 80% band hold with the shift at 0, and with the shift at 6? Check the detail line: 80% without it, 53% with it. Use **Next window** to reach window 5: 1 of 12 values is inside. Then set the shift to 0 and **Interval for** to **Seasonal naive**: the band is about twice as wide and holds only 74%, against 80% for the learned model's band. Does a wider band make the forecast better? No: it is a less informative forecast, not a better one.
6. **A fresh series.** Predict: will the learned model's loss from the shift be a wider factor than seasonal naive's on other series too? Press **New series** and read the **Quick Quiz** verdict on seeds 2 to 7: the learned model's factor is 3.5 to 4.4 and seasonal naive's is 1.4 to 1.6 every time. Then set the shift to 0 and check that the learned model wins 8 of 8 on each. What would you still have to test before trusting this on a real series?
