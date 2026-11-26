---
slug: operating-and-investigating-a-model
title: Operating and investigating a model
kind: reading
simulator: ""
minutes: 30
---
::: intro
- Write a monitoring plan that says what you watch, how often, at which threshold and who owns it, and give each alert a runbook.
- Investigate a failure in six steps (reproduce, slice, find the first changed thing, confirm the cause, fix, add a test or an alert) and write it up in a blameless report.
- Choose between rollback, recalibration and retraining from the evidence, and close the loop so the same failure cannot return unseen.

Before you start: read "End-to-end design and reproducibility" in this course, "Drift, alerts and rollback" in ML deployment and monitoring, and "Calibration and costs". The first gave you the card-fraud design that this lesson keeps running after launch. The second gave you the four layers of monitoring and the PSI thresholds. The third shows what recalibration changes and what it leaves alone.
:::

## A plan for after launch
*What do you watch, how often, and who answers?*

A launched model is never finished. The score you measured before launch holds only while the world and the data stay as they were. "Drift, alerts and rollback" named four layers to watch: operations, inputs, predictions and outcomes. A **monitoring plan** turns them into a table. Every row says what is measured, how, how often, at which threshold something happens, and who owns it. A row with no owner is a row nobody reads.

This is the plan for the card-fraud model of the last lesson: 10,000 payments a day, about 100 of them fraud, 200 reviews a day, 80 saved for each fraud caught, and a cost of 2 for each review. The baseline rule from the last lesson, which queues the 200 largest amounts, catches 38 frauds a day. At launch the model's queue holds 71 frauds a day. The **hit rate** is 71 / 200 = 35.5%.

| What | How | How often | Threshold | Owner |
| --- | --- | --- | --- | --- |
| Scoring job | rows scored equal rows received | daily, 06:00 | not finished by 07:00: page | platform on-call |
| Missing values | empty share in amount, merchant category, country | daily | launch 0.4%; above 2%: warn | data engineer |
| Input drift | PSI of the amount, last 7 days | daily | 0.10 warn, 0.25 page | data scientist |
| Queue hit rate | frauds confirmed by reviewers / 200, 7-day mean | daily | below 30% warn, below 24% page | data scientist |
| Queue recall | frauds in the queue / all frauds, on days whose chargebacks are in | weekly | launch 71%; below 60%: warn | data scientist |

Two words in the table are worth fixing. A **warn** is a message that someone reads the same day. A **page** wakes the person on call, the one whose turn it is to answer alerts at night. If a page is not answered in time, it goes to the next person.

Reviewers confirm each queued case the same day, so the hit rate is the operational metric measured live, with no wait for chargebacks. It sees only the queue, though. The frauds the model missed show up in the recall row, up to 30 days later.

> Key idea: a monitoring plan is a table with an owner on every row and an action behind every threshold. Its job is to make a named person do something.

## Handling an alert
*What should the person who gets the page do first?*

An alert at 3 a.m. must not depend on remembering how the model works. A **runbook** is a short page, one per alert: what the alert means, what to check first, what is safe to do, and when to call someone. Write it when you write the alert, while you still remember why you chose the threshold. An **incident** is a formal record that opens a team response, with an owner and a timeline.

```
ALERT     queue hit rate, 7-day mean, below 24%
MEANS     fewer than 48 frauds a day in the queue (launch: 71)
OWNER     data scientist on call; fraud-ops lead informed
CHECK     (10 minutes, in this order)
          1. Did the scoring job run and score every payment?
          2. Did a model, feature or app release ship in the last 7 days?
          3. Did the empty share of any feature jump?
SAFE      below 19%, switch the queue to the baseline rule (200 largest amounts)
ESCALATE  no explanation after 2 hours: open an incident
```

The runbook holds two ideas. First, **mitigate before you understand**. Stopping the damage and finding the cause are different jobs, and the first may be crude. Second, a mitigation is a choice with a number behind it.

> Worked example: at 44 frauds in the queue, the net value is 44 × 80 - 200 × 2 = 3,120 a day. The baseline rule catches 38 and gives 38 × 80 - 400 = 2,640. Switching to the rule would lose 480 a day, so the runbook keeps the model running and switches only below 38 frauds, a hit rate of 19%.

> Watch out: an alert with no runbook gets acknowledged (someone clicks to silence it) and ignored. If the person paged cannot say what to check first, the alert is unfinished.

## A method for investigating a failure
*How do you find a cause instead of guessing one?*

An alert says that something moved. A failure analysis finds out why, and the same six steps fit most failures.

1. **Reproduce.** Rerun the bad case from saved inputs: the data snapshot, the code and model versions, the seed. If you cannot get the same bad output, the first finding is that the system is not reproducible.
2. **Slice.** Split the failing metric by every field you logged, such as channel, country, merchant category and weekday. Look for the slice where the drop sits.
3. **Find the first changed thing.** In that slice, find the day the metric moved, from the daily series, since an average smears the start. List everything that changed on or just before that day. A cause cannot come after its effect.
4. **Confirm the cause.** A candidate is not a cause until you test it. Apply it to a healthy day and see whether the failure appears.
5. **Fix.** Make the smallest change that removes the confirmed cause, and say whether it is a mitigation or a fix.
6. **Add a test or an alert**, so the next occurrence is caught sooner.

[[figure:operating-and-investigating-a-model/investigation-steps|The six steps of a failure analysis, with what each one does in the fraud case of this lesson.]]

> Key idea: investigate before you repair. Retraining first, on data that already contains the failure, can teach the model the failure as normal.

## Reproduce
*What does the method find on the fraud model?*

The fraud model launches on day 1. Everything below is invented. To keep the arithmetic visible, each day has exactly 71 frauds in the queue before day 34 and exactly 44 after; real days vary by a few.

The hit rate falls from day 34. On day 36 the 7-day mean is (4 × 71 + 3 × 44) / 7 = 59.4 frauds, a hit rate of 29.7%, below 30%: warn. On day 39 it is (71 + 6 × 44) / 7 = 47.9, or 23.9%, below 24%: page. The data scientist on call follows the runbook. The job ran, and no model or feature release shipped.

**Reproduce.** On day 40 the data scientist reruns the scoring job for day 36 from the saved snapshot, with the logged model version and seed 42. It returns the same 200 payments with 44 confirmed frauds, so the failure now runs on demand.

## Slice
*Where does the drop sit?*

Split the queue by every field that was logged. Weekday, merchant category and amount band all show the same mild drop. The channel does not.

| Slice | In queue | Frauds before | Hit rate before | Frauds after | Hit rate after |
| --- | --- | --- | --- | --- | --- |
| App | 120 | 46 | 38% | 19 | 16% |
| Web | 80 | 25 | 31% | 25 | 31% |
| Whole queue | 200 | 71 | 35.5% | 44 | 22% |

All of the 71 - 44 = 27 lost frauds are in the app: 46 - 19 = 27.

[[figure:operating-and-investigating-a-model/hit-rate-timeline|The 7-day hit rate of the queue against the plan's thresholds. It crosses 30% on day 36 and 24% on day 39.]]

::: deeper How big must a slice be?
A slice with few cases swings by chance. The hit rate of 80 queued web payments at 31% has a standard error of about 0.05 (the square root of 0.31 × 0.69 / 80), so one day of it moves by about 5 points with no cause at all. Seven days of the same slice hold 560 payments, and the standard error falls to about 2 points. Judge a slice on its daily series only when it is large, and otherwise pool several days. This is a rough rule that treats payments as independent.
:::

## The first changed thing, the proof and the fix
*Which change started it, and how do you know?*

**First changed thing.** The app slice moves on day 34 and on no other day. The change log for that day has two entries: app release 5.2, an automatic update, and a marketing campaign that adds about 5% more payments. No model, feature or rule change is listed. Comparing the empty share of every feature in app payments with the week before, only `device_age_days` moved, from 0.4% to 63%. Our feature code fills an empty device age with the median of the training data, so the model sees a typical age and no warning. The plan watched three columns, and this was not one of them, so no alert fired.

[[figure:operating-and-investigating-a-model/slice-the-drop|Left: hit rate of the queue by channel, before and after day 34. Right: share of empty device ages by channel. Only the app moved, in both.]]

**Confirm.** Two candidates changed on day 34, so looking at the timing cannot separate them. Day 8 has final labels and its queue held 71 frauds. Replay it twice with the saved model:

- Blank the device age on 63% of app payments, as release 5.2 did. The queue falls to 45 frauds, close to the 44 seen live.
- Add 5% more payments, as the campaign did. The queue still holds 71.

The release is the cause, and the campaign is not.

**Fix.** The app is not ours to roll back. The feature code now reads the device age from the device registry whenever the app does not send it, and the app team is asked to send the field again. The change is ready on day 41 and scores from day 42. The model, its training data and its calibration are untouched.

> Watch out: two events on the same day look like one cause with two names. Replay each one alone on a healthy day before you name the cause.

## Writing a blameless report
*How do you record what happened so the next team learns from it?*

A **failure report** records what happened, why, and what changes. It is **blameless**: it explains the failure through the conditions of the system, not through a person. "The plan watched three of twelve features" is a finding. "Someone forgot to add the column" is not, because the system would let the next person forget too. People who fear blame hide mistakes, and a fix that says "be more careful" changes nothing.

Here is the report for this incident, kept short.

| Part | Entry |
| --- | --- |
| Summary | After app release 5.2 stopped sending the device age, the queue held 44 frauds a day instead of 71, until a feature fallback went live on day 42. |
| Impact | 27 fewer frauds a day, 27 × 80 = 2,160 a day. Days 34 to 41 are 8 days, so 8 × 2,160 = 17,280 lost. |
| Timeline | Day 34 release. Day 36 warn. Day 39 page. Day 40 reproduced and sliced. Day 41 cause confirmed, fix ready. Day 42 first scored with the fix. |
| Cause | Release 5.2 left out `device_age_days` for 63% of app payments. Our feature code filled the median, and the model lost an important signal for them. |
| Detection | The hit rate alert: warn 2 days after the start, page after 5. No input alert covered the column. |
| What went well | Same-day reviewer confirmations. A run record that replayed any day. The model, still above the rule, kept running. |
| Actions | Empty-share check on all 12 features, data engineer, day 45. Replay test on the feature code, data scientist, day 45. App release notes in our change log, fraud-ops lead, day 45. |

## Rollback, recalibration or retraining
*Which repair fits what you found?*

Choose the repair only after the cause is confirmed, and take the cheapest one the cause allows.

| Evidence | Repair | Time to take effect |
| --- | --- | --- |
| A change shipped when it began, and undoing it restores the replay | Roll back or fix the change | hours to a day |
| The ranking holds on a labelled sample, but scores or rates are off | Recalibrate | about a day, with a recent labelled sample |
| The relationship changed, or the data moved where the model never learned | Retrain | weeks, because labels arrive up to 30 days late |

In this incident the evidence points to the first row. Recalibration could not help even in principle. A monotone calibration map keeps the order of the scores, so the top 200 of a queue stays the same 200 payments and the 44 frauds stay 44. Recalibration matters where the probability itself is used, such as a rule that blocks above 0.9 or an expected-loss figure shown to reviewers ("Calibration and costs").

Retraining would have been the slow and wrong move. Waiting 30 days for labels at 2,160 a day costs 30 × 2,160 = 64,800. A model retrained on days 34 to 41 would also learn the empty device age as normal.

> Key idea: the confirmed cause picks the repair. While the cause is unconfirmed, mitigate with the runbook and keep investigating.

## Closing the loop
*What does the incident leave behind, and where do you go next?*

A failure is closed when the system changed, not when the numbers recovered. This one leaves four things:

- A **test**: replay a healthy day through the feature code before each release, and fail if the empty share of any feature passes 2%.
- An **alert**: the empty-share check on all 12 features, daily.
- A **runbook edit**: check 3 names the features by empty share, and the app's release notes join the change log.
- A **plan review**: every month and after every incident, ask whether each row still has an owner and a threshold.

> Worked example: the new check reads day 34's payments on the morning of day 35. With the same three days from page to fix as before, the fix would be live on day 38, and days 34 to 37 cost 4 × 2,160 = 8,640 instead of 17,280. The plan row would have saved half the loss.

Next comes "Advanced capstone project". There you ship a model with a reproducible evaluation, an operational metric, a monitoring plan and a documented failure investigation. Use this lesson's plan, runbook and report as templates. Break your own pipeline on purpose, investigate it with the six steps, and write the report for someone else to learn from.

::: remember
- A monitoring plan names what, how, how often, the threshold and the owner on every row, and each alert has a runbook that mitigates first and investigates second.
- Investigate in six steps: reproduce, slice, find the first changed thing, confirm the cause by replay, fix, and add a test or an alert. Write the report about the system, not the person.
- The confirmed cause picks the repair: roll back or fix a change, recalibrate when only probabilities are off, retrain when the relationship changed. Close the loop with a test, an alert and a reviewed plan.
:::
