---
slug: drift-alerts-and-rollback
title: Drift, alerts and rollback
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Name the four layers to monitor on a deployed model (inputs, predictions, outcomes and operations) and say how soon each can show a problem.
- Explain why an accuracy alert arrives late when labels are delayed, and use proxy signals to see trouble earlier.
- Design an alert with a threshold, a window and a rule, work out a PSI alert by hand, and choose between roll back, recalibrate and retrain.

Before you start: read "Serving, versioning and skew" and "Covariate and concept shift". The first showed how a model reaches production and how serving can go wrong. The second named the three kinds of shift and introduced the population stability index (PSI). This lesson asks what to do once the data moves and the model is already running.
:::

## What to watch
*What should you measure on a model that is already running?*

A deployed model fails quietly. It keeps returning answers and nothing crashes, while the answers slowly get worse. **Monitoring** is how you notice, and it works on four layers.

| Layer | Example signals | Shows a problem in | Misses |
| --- | --- | --- | --- |
| Operations | error rate, latency, share of empty values | minutes | a model that is fast but wrong |
| Inputs | share of rows per bin, new categories, PSI | days | a changed relationship |
| Predictions | share flagged, spread of scores | days | a change that leaves the scores alone |
| Outcomes | accuracy, precision, calibration | weeks | nothing, but it comes last |

One invented example runs through the lesson. A company's model reads each invoice when it is sent and predicts whether it will be paid late, meaning more than 30 days after sending. The company sends 500 invoices a day, and the model was right on 85% of held-out invoices. Whether an invoice was really paid late is known only 30 days after it goes out.

[[figure:drift-alerts-and-rollback/layers|The four layers of monitoring, from the fastest signal to the slowest.]]

> Key idea: the cheap layers react in minutes or days but only hint at trouble. Outcomes confirm it, and they arrive last. Each layer misses something another one sees, so a monitor needs all four.

## Three ways the world moves
*Which layer shows each kind of drift first?*

**Drift** is the everyday word for the dataset shift of "Covariate and concept shift". It has the same three kinds.

- **Data drift** (covariate shift): the inputs change. A new kind of customer starts to send invoices.
- **Label drift** (label shift): the class balance changes. Many more invoices than before end up late.
- **Concept drift** (concept shift): the same input leads to a different outcome. Customers with the same profile now pay late because the company changed its payment terms.

| Kind of drift | First layer that can show it |
| --- | --- |
| Data drift | Inputs: the share of rows per bin moves |
| Label drift | Predictions: the share called late moves |
| Concept drift | Outcomes only: inputs and predictions look normal |

> Watch out: not every change in the numbers is drift. A column that suddenly arrives empty, or a feature computed differently in serving than in training (the skew of the last lesson), looks like data drift in the input layer. It is a bug, and a bug is repaired, not retrained away. Investigating tells the two apart.

## Why accuracy alerts arrive late
*If accuracy is the real test, why not alert on accuracy?*

Accuracy needs the true answer, and an invoice's answer arrives 30 days after it is sent. So on day t, the newest invoices you can score are the ones sent on day t - 30.

Say a new customer segment starts paying differently on day 10, and from then on the model is right on 70% of invoices instead of 85%. You report accuracy over the 7 newest labelled days and alert below 80%.

> Worked example: the first changed invoice is sent on day 10 and labelled on day 40. On day 40 the window holds invoices sent on days 4 to 10, with one changed day out of seven: 0.85 - 0.15 x 1/7 = 0.83. On day 41 there are two changed days: 0.85 - 0.15 x 2/7 = 0.81. On day 42 there are three: 0.85 - 0.15 x 3/7 = 0.786, below 0.80, so the alert fires.

By day 42 the changed customers have been scored for 33 days, 33 x 500 = 16,500 invoices, and the model was 15 points less accurate on them: 0.15 x 16,500 = 2,475 extra mistakes.

> Key idea: a monitor that waits for labels is no faster than the labels. With a 30-day delay an accuracy alert comes at least 30 days after the first damage.

## Proxy signals you can read today
*What can you watch while the labels are still on their way?*

Three **proxy signals** do not need the outcome.

**Input drift.** Each day, compute the PSI of the important features over the last 7 days against the training data.

**Prediction distribution.** Track the share of invoices the model calls late. In training it was 30%. On the changed invoices the model calls 42% late, so a 7-day window leaves the band of 25% to 35% on day 12, after three changed days: 0.30 + 0.12 x 3/7 = 0.351.

**A small labelled sample.** Each week, pick 50 recent invoices at random and have a person find the real outcome now (look up the case, ask the customer). It costs effort, but it is a true accuracy reading within days. It is also noisy: at a true accuracy of 85% the reading varies by about 5 points from week to week. Alert at 37 or fewer right out of 50. That fires in about 3% of weeks when nothing is wrong and catches the 70% model in about 78% of weeks.

[[figure:drift-alerts-and-rollback/timeline|The day each signal fires for the drift that starts on day 10. The accuracy alert comes on day 42.]]

> Watch out: a proxy is a hint, not proof. Inputs can drift while accuracy holds, and concept drift moves no input at all. Use proxies to start looking sooner, then confirm with labels.

## Designing an alert
*When does a number turn into a message to a person?*

An alert has four parts: a **signal**, a **threshold**, a **window** (how much recent data goes into one reading) and a **rule** for how many breaches count. Take PSI on the invoice amount, cut into four bins, with the rule of thumb from the last lesson on shift: warn at 0.10, page at 0.25. A warning goes to a chat channel and a page calls someone.

> Worked example: on day 13 the last 7 days hold four changed days. Shares are rounded to two decimals.

| Bin | Training | Last 7 days | New - old | ln(new / old) | Term |
| --- | --- | --- | --- | --- | --- |
| small | 0.20 | 0.13 | -0.07 | -0.431 | 0.030 |
| medium | 0.40 | 0.31 | -0.09 | -0.255 | 0.023 |
| large | 0.30 | 0.34 | 0.04 | 0.125 | 0.005 |
| very large | 0.10 | 0.22 | 0.12 | 0.788 | 0.095 |

PSI = 0.030 + 0.023 + 0.005 + 0.095 = 0.153. That is above 0.10 and below 0.25, so it sends a warning and no page. Day 14 gives 0.23 and day 15 gives 0.30, so the page fires on day 15.

[[figure:drift-alerts-and-rollback/psi-alert|The 7-day PSI of the invoice amount against the two thresholds. The warning fires on day 13 and the page on day 15.]]

## Windows and false alarms
*How do you keep an alert from crying wolf?*

The window and the rule control false alarms. A one-day window is noisy: Monday's invoices differ from an average day, so PSI jumps although nothing is wrong. A window that covers a whole weekly cycle averages that out. Requiring two breaches in a row cuts false alarms further, at the price of one day. A threshold set too low gives alerts nobody trusts, and one set too high fires after the damage.

::: deeper Why many features make false alarms likely
Say you watch 20 features and each has a 2% chance of a false breach on a given day. The chance of at least one false alarm is 1 - 0.98^20 = 0.33, about one day in three. Adding the chances (20 x 2% = 40%) is wrong, because two breaches on the same day are counted twice. Ways to cut it down: watch only the features the model leans on most, require two breaches in a row, and send one grouped message per day instead of one per feature.
:::

## Investigate before you act
*An alert fired: what do you check first?*

An alert says something moved, not why. Spend minutes, not days, on four questions, in this order.

1. **Is the pipeline healthy?** Look at the operations layer: errors, latency, empty values, a feature that became constant. A bug is the cheapest cause to confirm and to fix.
2. **Did anything ship?** Line the alert up with the release times of the model, the feature code and the upstream data. This is where versioning pays off: if every prediction is logged with its model version, you can split the metrics by version.
3. **Which inputs moved?** One feature that jumped points at a broken feed. Many features moving a little points at a real change in the world.
4. **Is the damage real?** Get a labelled sample. Check three things: the accuracy, whether the model still ranks cases well (for example with AUC, see "ROC and precision-recall"), and whether its probabilities match what happens (calibration).

Only after this do you choose the repair. Acting first, for example retraining on data that has a bug in it, can bake the bug into the next version.

## Roll back, recalibrate or retrain
*Once you know what happened, which repair fits?*

| Action | Right when | What it costs | Time |
| --- | --- | --- | --- |
| Roll back | A recent release caused it and the previous version worked | Loses what the new version improved. The old model must still fit today's data and feature code | minutes |
| Recalibrate | The ranking is still good but the probabilities or the share flagged (the flag rate) are off | A recent labelled sample of a few hundred rows. It fixes the scores, not the ranking | hours to a day |
| Retrain | The relationship changed, or the data moved where the model never learned | Fresh labels, which take time, a temporal-split check, a new version to deploy and monitor | days to weeks |

> Worked example: three alerts on the invoice model. **A:** the day version 13 shipped, the empty share of the amount feature went from 0.5% to 18%. Roll back to version 12, then fix the feature code. **B:** the inputs are steady, the model calls 42% of invoices late and a labelled sample of 200 shows 30% late, while the AUC is 0.86 against 0.87 at launch. The ranking is intact and the probabilities are too high, so recalibrate ("Calibration and costs" shows how). **C:** PSI of the amount is 0.41 and the sample's AUC fell from 0.87 to 0.68. The relationship changed, so retrain on recent labels.

[[figure:drift-alerts-and-rollback/playbook|The playbook: investigate first, then pick the repair that matches what you found.]]

While a retrain is under way, a stopgap such as sending the riskiest invoices to a person keeps the damage down.

## After the incident
*What do you write down afterwards?*

Within a few days, write a short **post-incident note** about the system, not about blame. Record five things.

1. The timeline: when the drift began, when each signal fired, when someone acted and when it was resolved.
2. The delay: here PSI warned on day 13 and accuracy on day 42, so the labels were 29 days slower.
3. The cause, and how you confirmed it.
4. The action and its cost, in hours of work and in wrong predictions.
5. The change that follows: a new monitor, a different threshold, or a faster way to get labels.

## Toward the Monitoring lab
*What comes next?*

The next lesson is the Monitoring lab, the last of this course. There you replay a stream of predictions, investigate a performance alert and decide whether to roll back, recalibrate or retrain. Before you open it, guess which signal will fire first and which will confirm the damage, then check your guess against what the lab shows.

::: remember
- Monitor four layers: operations, inputs, predictions and outcomes. The cheap ones fire first and only hint, and outcomes confirm but arrive after the label delay.
- Alerts need a threshold, a window and a rule: a window that covers a full cycle and two breaches in a row cut false alarms, and a low threshold with many features invites them.
- Investigate first, then roll back for a bad release, recalibrate when the ranking holds but probabilities are off, and retrain when the relationship changed. Write a post-incident note afterwards.
:::
