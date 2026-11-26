---
slug: monitoring-lab
title: Monitoring lab
kind: simulator
simulator: monitoring-lab
minutes: 30
---
::: intro
- Replay a generated inference stream day by day, and say which monitor fires first and why the accuracy monitor is late.
- Investigate an alert with the feature histograms, the slices and the score calibration before you touch the model.
- Choose between rolling back, recalibrating, retraining and keeping watching, and compare your choice with the cost of the other three.

Before you start: read "Serving, versioning and skew" and "Drift, alerts and rollback". The first showed how one bad feature can reach production. The second showed how monitors, windows and late labels turn into an alert. The Monitoring lab lets you run both stories on one stream, with you on call.
:::

## What the lab replays
*What is in the stream, and what does a monitor get to see?*

The lab replays a generated stream of 60 days with 200 predictions a day, 12,000 in all. None of it is real data. Each row has four inputs (spend, tenure, tickets and logins) and a label of 0 or 1. The model on duty, version v1, is a logistic regression fitted on 1,959 clean pre-launch rows. It scored 84.2% on 841 more that it had not seen. The previous version, v2, is a depth-3 decision tree that scored 77.3% on the same rows.

Labels are late: each one arrives 7 days after its prediction.
One event per run starts on a day you choose. It can be a shift in the inputs, a release that breaks a feature, a change in the class balance, a change in the rule that links inputs to labels, or slower labels. You play the person who gets paged. Every chart shows only what a real team could see on that day, and the true accuracy stays hidden until you ask for it.

## Three monitors and one rule
*How does each monitor turn the stream into an alert?*

The lab runs the three monitors from "Drift, alerts and rollback" with the settings below. PSI measures how far a distribution has moved from its training version. Covariate drift moves the inputs, label shift moves the class balance and concept shift changes the rule that links inputs to labels.

| Monitor | What it reads | Alerts when |
| --- | --- | --- |
| Input drift (PSI) | the PSI of each feature over the last 1 day, against the training data cut into tenths | the largest PSI is above 0.25 |
| Score drift (PSI) | the PSI of the model's scores, against its scores on the holdout | above the same 0.25 |
| Accuracy (delayed labels) | the accuracy of the labels that arrived in the last 7 days | below 84.2% minus 8 points, which is 76.2% |

An alert needs two days in a row past the limit, and the accuracy monitor waits for at least 100 labels. All the settings are controls you can change.

> Worked example: take a release that breaks a feature on day 25. The predictions of day 25 are labelled on day 32, because 25 + 7 = 32. On day 36 the labels that arrived on days 30 to 36 belong to predictions made on days 23 to 29. Of those 7 days, the days 25 to 29 are after the event: 5 of 7. The accuracy monitor sees a mix of old and broken days, so its reading falls slowly even when the model is wrong on every new row. In the same way, on day 30 the team has served 6,000 predictions but knows the outcome only for those made up to day 23.

## The monitors race
*Who speaks first when a release breaks an input?*

Start from the lab's default, **Training-serving skew bug**. From day 25 a release serves spend multiplied by 100, as if the unit had changed. The real values and the labels do not change.

[[figure:monitoring-lab/alert-race|The default run on a day axis. The release is on day 25, the input and score monitors fire on day 26, the first broken labels arrive on day 32 and the accuracy monitor fires on day 36.]]

The input monitor fires on day 26 with a spend PSI of 6.39 against the limit of 0.25, and the score monitor on the same day with 6.38. The accuracy monitor fires on day 36, with a reading of 73.9% against its limit of 76.2%. That is 10 days later.

During those 10 days, from day 26 to day 35, the model served 2,000 predictions and 586 were wrong. With the correct inputs the same model would have been wrong on 337 of them. The silence cost 586 - 337 = 249 extra mistakes.

> Key idea: inputs are visible the moment they arrive, and a label is not known until it comes back. When a bug moves the inputs this much, the input monitor wins the race by about the label delay.

## Investigate before you act
*What do the three investigation views show?*

An alert says that something moved, not what. In the **Investigate** view the plot card shows one of three pictures, each read at the day on the slider.

| View | The question it answers | In the default run |
| --- | --- | --- |
| Feature histograms | Did one input change shape? | On day 31 the spend PSI is 5.50, and 53% of the last 7 days sit in the lowest tenth of the training values and 46% in the highest. The other three PSIs are 0.02 or less. |
| Slice by feature | Where is the accuracy lost? | On day 36 the rows split 52% into the lower third of spend, 0% into the middle third and 48% into the upper third. |
| Score calibration | Do the scores still mean what they say? | On day 36 the mean score is 49% and the positives seen are 51%, so calibration looks fine. |

One lopsided feature points at a broken feed. Many features moving a little would point at a change in the world. And a calibration that looks fine does not clear a model: a bug can leave the average score alone.

> Watch out: a view only has what the team could know. The accuracy and calibration views use only rows whose label has arrived, from a look-back of 21 days (unrelated to the label delay), so on the day of a change they still show the old world.

## Four repairs and their price
*How does the lab price a decision?*

When you press a decision button, the lab applies it from the day shown and compares all four options over the rest of the stream, using the true labels.

| Option | What it does | Fixed cost | Live |
| --- | --- | --- | --- |
| Roll back to the previous version | removes a release bug and brings back v2 | 1 | at once |
| Recalibrate | rescales the scores of v1 on the most recent labels that arrived | 2 | at once |
| Retrain on recent labelled data | refits a logistic regression on those labels | 10 | 3 days later |
| Keep watching | does nothing | 0 | - |

The total cost is the fixed cost plus 0.05 for every wrong prediction from the day you decide to day 60. Recalibrating and retraining fit on the most recent 10 days of labels that have arrived (up to 10 x 200 = 2,000 rows) and need at least 60 labels with both classes.

> Worked example: on day 26 of the default run, rolling back leaves 1,693 wrong predictions, so its cost is 1 + 0.05 x 1,693 = 85.65, shown as 85.7. Recalibrating leaves 2,048, so 2 + 0.05 x 2,048 = 104.4. Keeping watching costs 102.5 and retraining 112.4. Recalibrating scores worse than doing nothing because it changed nothing (70.7% accuracy both ways) and still paid 2 units.

## Labels set the pace
*Why does the cheapest repair depend on the day you decide?*

A recalibration or a retrain learns from labels that have arrived, so the day you press the button decides what it can learn.

[[figure:monitoring-lab/cost-by-day|The same skew bug, decided on day 26 and on day 36. Rolling back is cheapest on day 26, and retraining edges ahead on day 36. Each group counts only the days after its own decision.]]

On day 36 retraining costs 58.2 and rolling back 61.3. By then the labels include broken days, so the retrained model learns to discount spend. The bug is still there. The price tag does not know that.

[[figure:monitoring-lab/label-shift|Label shift from day 25. The model's mean score against the positives actually seen, on days 28, 40 and 60. The two agree at first because the labels that have arrived are from before the shift.]]

Label shift shows the same thing. On day 28 keeping watching costs 56.7 and recalibrating 63.9, because the labels it learns from are from before the shift. On day 40 recalibrating costs 20.1 and keeping watching 36.6.

Concept shift is slower still. Retraining on day 34 learns from 2,000 labels of which 600, 30%, are from after the event, and the accuracy from then on is 63.0%. On day 40, 1,800 of the 2,000, 90%, are from after it, and the accuracy from then on is 77.6%. In **Delayed labels with drift** labels arrive 21 days after their prediction instead of 7, which pushes the accuracy monitor later still.

## Alerts are not damage
*How do thresholds and windows trade an early warning against a false alarm?*

An alert is a hint. Pick **Covariate drift**: spend moves up by 1.5 standard deviations and the rule linking inputs to labels does not change. The input monitor fires on day 26 with a PSI of 2.50, and the accuracy monitor never does. Keeping watching costs 38.4 with 89.0% accuracy, above the 84.2% at launch. Rolling back costs 53.2.

[[figure:monitoring-lab/scenario-map|The five scenarios at their default settings. For each, the day each monitor first fires, and the option with the lowest total cost when you decide on the day of the first alert.]]

The thresholds decide how many alerts you get. On a **Clean** stream nothing happens, and the default threshold of 0.25 raises no alert on any of the first 6 streams. Lower the **PSI alert threshold** to 0.05 with a 1-day input window and the input monitor is in alert on 48 of 60 days. Widen the **Input window (days)** to 7 and it falls to 0.

Windows cost time. On the default skew run, a 7-day input window delays the first alert from day 26 to day 27.

> Key idea: lower thresholds and shorter windows warn earlier and cry wolf more. Choose them on a clean stream first, then check what they cost on a real event.

::: deeper Why retraining wins on day 36 and still may not be the right call
From day 36 the lab's cost model says retraining (58.2) beats rolling back (61.3) by 3.1 units. It learned from labels that already include days with the broken input, so it learned to rely less on spend, which carries the largest weight in the rule that labels this stream. Accuracy afterwards is 80.7% against 75.9% for the rolled-back v2.

Two things the cost does not count. The bug is still in production, so every later release meets it again. And a model that learned to ignore spend now has to be retrained once more after the fix. A team would roll back first for the quick save, then fix the feature code, then retrain on clean labels. The lab measures what it can: wrong predictions and fixed costs. The judgement stays with you.
:::

::: remember
- On a bug that moves the inputs, the input and score monitors fire within a day or two and the accuracy monitor follows after the label delay. Concept shift moves no input at all, so only labels show it.
- Investigate with histograms, slices and calibration before you choose, and remember that those views only know the labels that have arrived.
- A repair learns from arrived labels, so the cheapest choice changes with the day. An alert alone is not damage, and thresholds and windows trade early warnings against false alarms.
:::

@@lab

## Lab: monitoring an inference stream
You replay a generated stream of 60 days with 200 predictions a day. One event happens in it, and you read the monitors, investigate and decide. Everything is generated and seeded, and the stream is the same for everyone until you press **New stream**.

### Controls
- **Run**, **Pause**, **Run again**, **Previous step**, **Next step**, **Speed**: replay the stream one day per step. **Run again** appears at day 60.
- **Day** is a slider next to the playback controls. Drag it to any day. On the plots, click or drag to move the day, and the keyboard arrows work on the main plot.
- **Fullscreen** enlarges the lab. **Reset** restores every parameter, the stream and the Quick Quiz, and rewinds to day 1.
- **Monitors** and **Investigate** switch the plot card between the PSI chart and the investigation views.
- In the Investigate view: **View** picks **Feature histograms**, **Slice by feature** or **Score calibration**, and **Feature** picks **spend**, **tenure**, **tickets** or **logins** (not used by the calibration view).
- **Scenario** picks the event: **Clean (nothing happens)**, **Covariate drift**, **Training-serving skew bug**, **Label shift**, **Concept shift** or **Delayed labels with drift**. Choosing one jumps to six days after the event.
- **Severity** (0 to 1, starts at 0.50) sets how strong the event is. **Event starts on day** (10 to 45, starts at 25) sets when.
- **Reveal the true accuracy** adds the hidden same-day accuracy to the accuracy chart.
- **PSI alert threshold** (0.05 to 1, starts at 0.25) and **Input window (days)** (1 to 7, starts at 1) set the two PSI monitors.
- **Accuracy drop that alerts (points)** (2 to 20, starts at 8) and **Accuracy window (days)** (1 to 14, starts at 7) set the accuracy monitor.
- **New stream** draws another seeded stream. **Reset** goes back to the first one.
- The decision buttons **Roll back to the previous version**, **Recalibrate**, **Retrain on recent labelled data** and **Keep watching** apply a choice from the day shown. Pressing another one replaces it.
- The **Quick Quiz** button holds one question: "A feature changes units after a release. Which signal will fire first: the input drift monitor or the accuracy monitor?" Pick an answer, run the default scenario until both monitors have fired, then press **Check answer**.

### Reading the screen
- The plot card, **Inference stream replay**, draws the PSI of **spend**, **tenure**, **tickets** and **logins** by day, with the dashed alert threshold, red marks at the bottom on alert days and a dashed line where the event starts. The axis is squeezed above 1, so a units bug does not flatten the rest. The status line reads, for example, "Day 31 of 60. Alerts so far: ...".
- **Prediction scores: distribution drift** shows the PSI of the scores, with a strip under it: for each day the share of predictions in each of five score bands.
- **Accuracy: delayed labels against the truth** shows the accuracy from the labels that arrived, the launch accuracy and the alert limit. With **Reveal the true accuracy** on, the true accuracy appears too.
- **Alert log** has the columns **Monitor**, **First alert**, **Reading then** and **Alert days**, with one row each for **Input drift (PSI)**, **Score drift (PSI)** and **Accuracy (delayed labels)**. It only counts days up to the day shown.
- **Decision** compares **Option**, **Accuracy after**, **Wrong predictions** and **Cost**. Your choice is marked "your choice" and the cheapest "cheapest". A sentence under the plot explains the result. Pressing a decision turns on **Reveal the true accuracy** and marks the day on the charts.
- In **Investigation**, the histogram compares training (dashed, 10% in each tenth) with the last 7 days. The slice view shows accuracy in the lower, middle and upper third of the feature, reference against recent. The calibration view shows five score bands.

### Experiments
Press **Reset** before each experiment, so that your numbers match.

1. **Who speaks first?** Predict: with a unit-change bug, which fires first, the input drift monitor or the accuracy monitor? Pick an answer in the Quick Quiz. Press **Run** (raise **Speed** if you like) until the accuracy monitor fires, then read the **Alert log**: **Input drift (PSI)** on day 26 (6.39, limit 0.25), **Score drift (PSI)** on day 26 (6.38) and **Accuracy (delayed labels)** on day 36 (73.9%, limit 76.2%). Press **Check answer**. Why is it 10 days?
2. **Find the broken input.** Predict: which feature will the histogram single out? Set the day to 31, switch to **Investigate** and pick **Feature histograms** with **spend**: PSI 5.50, mean -3.3 against 0.0 in training, bars almost only at the two ends. Try **tenure** (PSI 0.01). Then try **Slice by feature** with **spend** on day 36 (the middle third is empty) and **Score calibration**. Which view gives the culprit, and which clears the model by mistake?
3. **Act early or wait?** Predict: is it cheaper to act on the first input alert or on the accuracy alert? Set the day to 26 and press **Roll back to the previous version**: its cost is 85.7, the cheapest, and **Keep watching** costs 102.5. Then set the day to 36 and press **Retrain on recent labelled data**: it is now the cheapest at 58.2, against 61.3 for rolling back. Read the sentence under the plot. Which would you ship?
4. **Alert without damage.** Predict: will accuracy fall when spend moves up by 1.5 standard deviations? Set **Scenario** to **Covariate drift**, set the day to 40 and look at the log. The input monitor fires on day 26 at 2.50 and the accuracy monitor never fires. Set the day to 26 and press **Keep watching**: 38.4 at 89.0%, while rolling back costs 53.2. Then set **Severity** to 0.20: the input monitor still fires on day 26, now at 0.41. Raise **PSI alert threshold** to 1: the input alert disappears, although the shift is still there.
5. **The slow ones.** Predict: will any input monitor fire under **Concept shift**? Set **Scenario** to **Concept shift**. The log shows no input and no score alert (no input PSI above 0.16 and no score PSI above 0.19 in the whole run) and only the accuracy monitor, on day 34 (72.2%). Set the day to 34 and press **Retrain on recent labelled data** (63.0% from then on, cost 109.9), then do the same on day 40 (77.6%, cost 57.0). Next set **Scenario** to **Delayed labels with drift**: the accuracy monitor moves to day 47. Why?
6. **Thresholds and a fresh stream.** Predict: on a **Clean** stream, how many days will the input monitor be in alert if **PSI alert threshold** is 0.05? Set **Scenario** to **Clean (nothing happens)** and **PSI alert threshold** to 0.05, then set the day to 60 and read **Alert days**: 48 for the input monitor and 32 for the score monitor. Set **Input window (days)** to 7: 0 and 6. Then press **New stream** three times with the window at 1 and read the input alert days again: 44, 44 and 46. Finally press **Reset**, set the day to 60 and press **New stream** three times. On the default skew run the input alert is on day 26 each time and the accuracy alert on day 37, 38 and 37.

Note: the lab has no real-data switch, so its stream is generated. The real counterpart is the penguin unit slip in "Serving, versioning and skew" (97.7% down to 64.0%). The fresh streams of experiment 6 are the transfer check: if the order of the alerts holds on a new stream, it is the mechanism and not a lucky seed.
