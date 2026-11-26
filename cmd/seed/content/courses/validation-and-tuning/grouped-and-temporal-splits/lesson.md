---
slug: grouped-and-temporal-splits
title: Grouped and temporal splits
kind: reading
simulator: ""
minutes: 20
---
::: intro
- Spot data whose rows are not independent: several records for one person, device or hospital, or rows in time order.
- Choose a grouped split or a temporal split (with a rolling origin) so that the test rows are as new to the model as its future rows will be.
- Name the two leaks, through identity and through the future, and say which split fits a given use of the model.

Before you start: read "Cross-validation and stratification", "Train, validation and test" and "Pipelines and leakage". The first gave you folds, the second the three sets, and the third the idea that test rows must stay unseen. This lesson asks what "unseen" means when rows are linked.
:::

## Rows that belong together
*Why can a random split make a model look better than it is?*

In Level 1 you shuffled the rows and cut. That works when every row is a separate draw, as in the penguin table, where each row is a different bird. It fails when rows are linked.

One link is an **entity**: a person, device or hospital that owns several rows. A patient with five clinic visits has five rows. The other link is time: one row per day or month, where today looks a lot like yesterday.

A random split cuts through those links. One patient's visits land in both the training and the test set, so every test row has a close relative in training. The model can score well by recognizing the entity instead of learning the pattern. This is leakage like the duplicate rows in "Pipelines and leakage", only softer, and ordinary cross-validation folds have the same weakness.

> Key idea: a split is honest when the test rows are as new to the model as the rows it will meet in real use.

## Twelve visits, six patients
*What does a model do when it can recognize the person?*

Take six patients with two visits each, so 12 rows. Each row has a resting heart rate in beats per minute and a label: does the patient have the condition? These numbers are invented, and the heart rate is built to say nothing about the condition.

| Patient | Condition | Visit 1 | Visit 2 |
| --- | --- | --- | --- |
| A | yes | 62 | 63 |
| B | no | 67 | 68 |
| C | no | 70 | 71 |
| D | yes | 75 | 76 |
| E | yes | 80 | 81 |
| F | no | 83 | 84 |

The model is 1-nearest-neighbor: copy the label of the training row with the closest heart rate. Always answering yes, or always no, gets 6 of 12 right.

## Random against grouped
*How far apart do the two scores end up?*

**Random split.** Hold out one visit and train on the other 11. The closest row is always the same patient's other visit, 1 beat away, with the right label. The score is 12 of 12, or 100%.

**Grouped split.** Hold out both visits of one patient and train on the other ten rows. Now the closest row belongs to someone else. Patient A (62 and 63) is closest to B at 67, and B has no condition, so both of A's rows are wrong. Over all 12 rows the score is 5 of 12, or 41.7%, below the 6 of 12 that blind guessing gets.

The heart rate was a signature of the person, not a sign of the condition. The random split rewarded remembering people, which is useless for a new patient. Only the grouped split told the truth.

[[figure:grouped-and-temporal-splits/random-vs-grouped|The same six patients cut two ways. In the random split, test visits (solid) have the same patient's other visit in training. In the grouped split, no patient is on both sides. Solid cells show one example cut; each score is taken over every round.]]

## Cut by group, not by row
*How do you keep a patient's rows together?*

A **grouped split** cuts the list of groups, not the list of rows. Pick which patients go to training and which to test, and every row follows its patient. In cross-validation the version is **grouped k-fold**: deal the groups into k folds and hold out one fold of groups in each round.

Three things change compared with a random cut.

- **Fold sizes are uneven.** Groups differ in size, so a fold of groups is not an exact fifth of the rows.
- **Few groups mean a noisy score.** With six patients there are only six different test patients, so a single patient can move the score a lot. Report the spread across folds, not only the mean.
- **Stratification is only approximate.** A group moves as one block, so you cannot fine-tune class shares. Check them after the cut.

> Watch out: dropping the patient id column does not fix a random split. The heart rate itself was the person's signature. Group the rows by the id, even if you then leave the id out of the features.

::: deeper Reporting a grouped score
Suppose a model is tested by holding out one hospital at a time. Two hospitals have 300 and 100 rows, and the held-out accuracies are 80% and 60%. The correct rows are 240 and 60, so the pooled accuracy is 300 / 400 = 75%. The plain average of the two scores is 70%. Neither number is wrong, but a new hospital is one more hospital, not a pool of rows. A new hospital could look like either one, so report each held-out score as well as a summary.
:::

## When time matters
*Why is shuffling a mistake for rows that arrive in order?*

Rows in time order have a second kind of link: neighbors in time look alike. A random split puts test months between training months. The model can lean on a month before and a month after, and the month after is the future.

On the day you use a model, the future is exactly what you do not have. So the honest test is a **temporal split**: train on the earlier rows, test on the later ones.

> Worked example: monthly sales for 12 months were 100, 108, 115, 121, 130, 138, 147, 153, 162, 170, 179 and 188 units. The model predicts a month as the average of the two closest training months. Month 2, for example, gets (100 + 115) / 2 = 107.5.

| Split | Test months | Predictions | Errors | Mean error |
| --- | --- | --- | --- | --- |
| Random | 2, 5, 8, 11 | 107.5, 129.5, 154.5, 179 | 0.5, 0.5, 1.5, 0 | 0.625 |
| Temporal (train on months 1 to 9) | 10, 11, 12 | 157.5 for all three | 12.5, 21.5, 30.5 | 21.5 |

In the temporal split the two closest training months are 9 and 8 for every test month, and (162 + 153) / 2 = 157.5.

[[figure:grouped-and-temporal-splits/future-leak|The same model on the same sales. Left: random test months sit between training months, so the model fills gaps. Right: months after the last training month are forecasts, and the errors grow with distance.]]

The random split measured how well the model fills a gap. The temporal split measured how well it forecasts, which is the job.

## A rolling origin
*How do you test a forecast several times without peeking?*

One temporal split gives one score from one stretch of time, and that stretch may be unusual. A **rolling origin** repeats the test. The **origin** is the moment where the training data ends. Train on everything up to the origin, test on what follows, then move the origin forward and do it again.

Use the same sales. The model now forecasts the next month as the average of the last two. The origin moves from month 6 to month 11.

| Training months | Forecast | Actual | Error |
| --- | --- | --- | --- |
| 1 to 6 | 134 | 147 | 13 |
| 1 to 7 | 142.5 | 153 | 10.5 |
| 1 to 8 | 150 | 162 | 12 |
| 1 to 9 | 157.5 | 170 | 12.5 |
| 1 to 10 | 166 | 179 | 13 |
| 1 to 11 | 174.5 | 188 | 13.5 |

The mean error is 74.5 / 6 = 12.42 units, about 20 times the random split's 0.625. The six errors agree, so the score is stable. They are all positive too, because the model lags a rising trend, and a random split, which fills gaps from both sides, hides that lag.

[[figure:grouped-and-temporal-splits/rolling-origin|A rolling origin: six rounds. Each trains on all earlier months (light), tests on the next month (solid), and never sees later months (empty).]]

::: deeper Gaps, windows and horizons
The table keeps all the past (an expanding window). A sliding window keeps only the most recent months, which suits data that drifts: its pattern changes over time, so old months stop being typical. The **horizon** is how far ahead you must predict: here one month, and in the temporal split above up to three, which is why those errors were larger. Test at the horizon you need.

If a row's label is only known later, such as "cancels within 30 days", the last 30 days of training rows have labels that depend on the test period. Leave a **gap** of that length between the end of training and the start of testing.
:::

## Match the split to the use
*Which split fits how the model will be used?*

Start from one question: what will be new when the model is used? The test set should be new in that same way, and in no other way.

- New patients from the same hospitals: group by patient.
- Hospitals the model has never seen: group by hospital. A group-by-patient split would leave each hospital's quirks in training and flatter the score.
- Next month's rows: split by time and train on the past.
- New patients next year: both, with later dates in the test set and no patient on both sides.
- Rows that really are independent cases, like the penguins: a random split is fine.

[[figure:grouped-and-temporal-splits/match-the-use|Four ways a model is used, and the split that makes the test as new as the real future.]]

> Watch out: a stricter split lowers the score. That does not mean you made the model worse. You made the measurement honest. Everything you learned about the pipeline still applies: fit preprocessing, feature selection and tuning on the training part of each round only.

## Before the lab
*What will you try next?*

The next lesson covers grid and random search, which choose settings by validation score. Use the split you chose here for that search as well, because a tuning loop on a leaky split picks settings that are good at recognizing patients, not good at predicting.

After that comes the Validation lab, the last lesson of this course. There you compare a random split with a grouped split on a dataset that has several records per person. Before you open it, write down your guess: which split will give the higher score, and by how much? You have seen the answer on 12 rows, 100% against 41.7%. The lab shows whether it holds on more data and how much it moves between draws.

::: remember
- Rows are not independent when one entity owns several of them or when they arrive in time order. A random split then leaks through identity or through the future.
- Split by group when the model must handle new groups, and by time, with a rolling origin and a gap if labels arrive late, when it must predict later rows.
- Ask what will be new in real use, and cut so that the test rows are new in exactly that way.
:::
