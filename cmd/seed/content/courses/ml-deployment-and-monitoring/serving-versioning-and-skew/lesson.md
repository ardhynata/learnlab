---
slug: serving-versioning-and-skew
title: Serving, versioning and skew
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Choose between batch and online inference by latency, freshness and cost, and say what each choice costs you.
- Describe a deployed model as a versioned artifact (code, data snapshot, settings, metrics), and release it through shadow and canary stages with a rollback ready.
- Find training-serving skew (different feature code, missing values, units, time travel) by logging served features, comparing distributions and sharing one feature function.

Before you start: read "Reproducible pipelines", "Pipelines and leakage" and "Covariate and concept shift". The first gave you a run that can be repeated, the second the rule that a step learns from training rows only, and the third what happens when the data moves. This lesson takes the fitted pipeline out of the notebook and asks what can go wrong between the notebook and a live request.
:::

## Batch or online
*Is the answer ready before it is asked for, or computed while someone waits?*

Until now a model was something you scored on a held-out table. A deployed model keeps answering for rows it has never seen. There are two ways to run it.

**Batch inference** scores a whole table on a schedule. Each night, say, the model reads every customer row and writes one score per customer into a table. Nobody waits, and the app looks the score up later. **Online inference** scores one request when it arrives. Someone is waiting, so the answer must fit a **latency** budget (how long one answer may take), often tens to a few hundred milliseconds, and the features must be fetched inside that budget too.

Two more words decide the choice. **Freshness** is how old the information behind an answer is. **Cost** is what you pay for compute and for the people who keep it running.

| | Batch | Online |
| --- | --- | --- |
| Who waits | nobody, scores are ready before use | a person or program, for each answer |
| Latency | does not matter per row | must fit a budget, for example 100 ms |
| Freshness | as old as the last run | as new as the features you can fetch in time |
| Cost | cheap per row, but also scores rows nobody asks about | servers always on, but only asked-for rows are scored |
| When it fails | rerun the job, old scores stay in the table | the request fails or a fallback answer is used |
| Fits | nightly churn list, email campaign, credit review | fraud check at checkout, search ranking, spam filter |

> Worked example: an invented subscription service has 500,000 subscribers, and about 10,000 of them open the app on a given day. Batch scoring makes 500,000 predictions a day to use 10,000 of them, which is 500,000 / 10,000 = 50 times more than needed. Online scoring makes 10,000, but each must come back within 100 ms from servers that run all day. A batch score is refreshed every 24 hours, so if subscribers open the app at times spread evenly over the day, the score they see is on average 12 hours old and at worst 24.

[[figure:serving-versioning-and-skew/batch-and-online|Two ways to serve a model. Batch computes every score ahead of time and stores it. Online computes one score when the request arrives, inside a latency budget.]]

## The model as a versioned artifact
*What exactly is "the model" that you deploy?*

A file of weights is not enough. When a score looks wrong in March, you need to know what produced it. So the thing you deploy is a **versioned artifact**: the fitted pipeline plus the record that makes it reproducible, tied together by one version id. That record is the one "Reproducible pipelines" asked you to keep. It has four parts.

- **Code:** the commit that built the features and the pipeline.
- **Data snapshot:** which table, how many rows, and a fingerprint (a hash) of the file. Change one byte and the hash changes.
- **Settings:** seeds, hyperparameters, the split and the library versions.
- **Metrics:** the held-out score on a named evaluation set, next to a baseline.

A **registry** is the list of versions. Each row holds the version id, those four parts and a **stage**: candidate, shadow, canary, live or retired.

| Version | Data snapshot | Settings | Evaluation set | Held-out accuracy | Stage |
| --- | --- | --- | --- | --- | --- |
| v2 | 2026-06-01, 41,000 rows | logistic regression | test-2026-06 | 88.9% | retired, kept |
| v3 | 2026-09-01, 48,000 rows | k-NN, k = 5 | test-2026-06 | 90.7% | live |
| v4 | 2026-10-01, 52,000 rows | k-NN, k = 9 | test-2026-06 | 91.4% | shadow |

The rows are invented, and all three accuracies use the same named set, so they can be compared. Retiring a version does not delete it: you may need it back.

> Watch out: two accuracies are comparable only if they were measured on the same evaluation set. Write the set's name next to every metric, or the table compares different exams.

## Shadow, canary and rollback
*How do you put a new version live without betting everything on it?*

Each stage shows the new version to a little more of the world.

- **Shadow.** The new version receives every request and computes an answer, but the answer is only logged. No user sees it. You compare it with the live answer and watch latency and failures.
- **Canary.** A small share of real traffic, say 5%, gets its answers from the new version. If it is bad, few users are hurt.
- **Full release.** All traffic goes to the new version, and the old one stays registered.

[[figure:serving-versioning-and-skew/release-path|The release path of version v4 while v3 is live. Green is the share of answers users see from v4, and the dashed bar is v4 running unseen in shadow.]]

> Worked example: a service gets 40,000 requests a day. In shadow, v4 agrees with v3 on 93% of them, so 7% of 40,000 = 2,800 requests get different answers; labels will later say which model was right on those. In the canary, 5% of 40,000 = 2,000 requests go to v4. If 8% of v3's requests run over the latency budget and 10.5% of v4's do, that is 210 slow requests where 160 would be expected.

**Rollback readiness** is decided before launch, not during the incident. Check that the old version is still stored and loads. Check that the features it needs are still computed (a dropped column or a switched-off job can make rollback impossible). Make going back one setting, and try it once in rehearsal. And write the trigger down, for example "slow share above 12% for 10 minutes".

::: deeper Is the canary gap just noise?
Take 2,000 canary requests and an expected slow share of 8%. The standard error of a share is sqrt(0.08 x 0.92 / 2000) = 0.0061, or 0.61 points. The observed 10.5% is 2.5 points above, which is 2.5 / 0.61 = 4.1 standard errors: not noise. With only 200 requests the standard error is 1.9 points and the same gap is 1.3 standard errors, so you could not tell it from luck. A canary needs enough requests to see the gap you care about, and a 5% share of a quiet service may take days to collect them.
:::

## Four sources of skew
*Why can a model that tested well fail on its first live request?*

**Training-serving skew** means the features the model sees in service are computed differently from the features it was fitted on. The raw data may be the same. The plumbing is not. There are four usual sources.

| Source | In training | In service |
| --- | --- | --- |
| Different feature code | a notebook step with its own rounding | a hand-written copy with other rounding |
| Missing values | gaps filled with the training median | gaps passed as 0 or left empty |
| Units | length in millimeters | length in centimeters |
| Time travel | features built from a table that includes later events | only what is known at that moment |

The last one is the leakage rule from "Pipelines and leakage", applied to time. Take a feature "purchases this month". A customer bought on days 3, 8 and 12, and the prediction is made on day 10. Live, the feature is 2. A training table built at the end of the month says 3, because it counts day 12, which has not happened when the prediction is made. The model learns from a future it will never see.

[[figure:serving-versioning-and-skew/time-travel|One customer's purchases on days 3, 8 and 12. At the prediction on day 10 the feature is 2. A table built at month end counts 3.]]

::: deeper Building features as of a moment
The cure for time travel is a point-in-time join. For each training row, take only the events whose timestamp is at or before that row's prediction time, and compute the feature from them. For the customer above, the events at or before day 10 are days 3 and 8, so the feature is 2, the same as live. Keep the prediction time as a column of the training table, so that the check can be repeated.
:::

## A skew you can measure
*How much damage can one unit slip do?*

Use a one-line model on the 342 penguins with a recorded flipper length: call a penguin a Gentoo if its flipper length is 207 mm or more. It is right for 334 of 342, or 97.7%. The 8 errors are 7 Adelie or Chinstrap penguins at 207 mm or longer, and 1 Gentoo below.

Now the service receives flipper length in centimeters from another system. A penguin of 201 mm arrives as 20.1. Every value is far below 207, so the rule answers "not Gentoo" every time. It is right only for the 219 penguins that are not Gentoo: 219 / 342 = 64.0%. Accuracy fell by 33.6 points, and nothing crashed, because 20.1 is a perfectly valid number.

[[figure:serving-versioning-and-skew/unit-skew|The same rule before and after a unit slip. Training sees flipper lengths from 172 to 231 mm, and the service sees 17.2 to 23.1, far to the left of the 207 line.]]

Missing values break a model the same quiet way. If body mass has mean 4,201.75 g and standard deviation 801.95 g, a gap that the service fills with 0 becomes (0 - 4,201.75) / 801.95 = -5.24 after scaling: a penguin 5.24 standard deviations lighter than the average, unlike any training row.

> Watch out: a skewed model keeps answering, with numbers in the normal range. No error message tells you something is wrong; only a look at its inputs does.

## Catching skew
*How do you find skew before your users do?*

Three habits find it, and the third prevents it.

1. **Log the served features.** With each prediction, store the version id, the time and the feature row the model actually received, not only the raw input. Labels that arrive later can be joined to it.
2. **Compare distributions.** For each feature, set the served log beside the training data: the mean in training standard deviations, the share missing, the minimum and maximum, or the population stability index from "Covariate and concept shift". In the unit slip the training mean is 200.9 mm with standard deviation 14.06, and the logged mean is 20.09. The gap is (200.9 - 20.09) / 14.06 = 12.9 standard deviations, an alarm on the first day. The share missing is another check: 2 of 344 rows, 0.6%, in training.
3. **Share one feature function.** Write the feature code once and import it in both places. Better, ship the fitted pipeline from "Reproducible pipelines" inside the version, so service uses the same steps with the same frozen numbers. Add a parity test: send the same raw rows down the training path and the serving path, and require equal features up to a tiny tolerance.

> Key idea: skew is a bug, drift is the world. With skew, the same raw row gives different features in training and in service, from the first request. With drift, the code is the same but the rows are different. A replay tells them apart: run old rows through the live path. If the features differ from training, it is skew. If they match, and today's rows still look different, it is drift.

## Feature freshness
*How old can a feature be when the model reads it?*

The **age** of a feature is the time between when its value was computed and when the model reads it. A feature can be skewed in age even when its code and units are right.

| Feature | How it is refreshed | Worst age at serving |
| --- | --- | --- |
| Country on the account | when the customer changes it | days, which is fine |
| Orders in the last 7 days | nightly job at 02:00 | 24 hours |
| Items in the cart | live from the app | seconds |

> Worked example: a customer places an order at 14:00, which takes the count of orders in the last 7 days from 1 to 2. The nightly table was computed at 02:00 and still says 1. A request at 20:00 reads a value that is 18 hours old and one order behind. If training built this feature at the exact moment of prediction, with age 0, the service is skewed in freshness, just as with units.

There are two repairs. Refresh the feature more often, which costs a streaming job and a lookup inside the latency budget. Or train with the same age: build each training feature as the nightly job would have had it. The choice depends on how fast the feature changes and how much the model leans on it. Also decide what happens when a live feature is late or down. It should arrive as a missing value, handled the way training handled it.

## Toward the Monitoring lab
*What do you carry into the rest of this course?*

This lesson was about starting well: choosing how to serve, knowing which version is live, releasing it in steps and checking that the model sees what it learned from. The next lesson, on drift, alerts and rollback, covers what comes after, when the data moves, labels arrive late and an alert fires. Whether to roll back, recalibrate (see "Calibration and costs") or retrain is the decision where this lesson's habits pay off.

In the Monitoring lab you replay a stream of inference requests, investigate a performance alert and make that decision. Bring three questions. Which version served this request? What features did it see? Is that what training saw (skew), or has the world changed (drift)? A rollback that is one switch makes the decision cheap. One that needs a rebuild makes it a gamble.

::: remember
- Batch is ahead of time, cheap per row and as old as its last run. Online answers one request inside a latency budget and is as fresh as its features. Choose by who waits and how old an answer may be.
- A deployed model is a versioned artifact in a registry: code, data snapshot, settings and metrics. Release it through shadow and canary, with the rollback ready before launch.
- Skew comes from feature code, missing values, units, time travel and stale features. Log served features, compare them with training, and share one feature function.
:::
