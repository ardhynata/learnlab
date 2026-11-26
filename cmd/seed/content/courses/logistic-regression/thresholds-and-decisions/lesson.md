---
slug: thresholds-and-decisions
title: Thresholds and decisions
kind: simulator
simulator: logistic-threshold
minutes: 22
---
::: intro
- Turn a predicted probability into a yes-or-no decision with a threshold, and say what each of the four outcomes means.
- Predict how false positives, false negatives, precision and recall move when you lower or raise the threshold, then check it in the lab.
- Choose a threshold from the cost of each kind of mistake, and test the idea on generated data and on the real penguins.

Before you start: read "Probabilities and the sigmoid" and "Log loss and fitting".
:::

## What the lab asks
*What do you do with a probability once the model has given you one?*

The last two lessons built a model that gives each example a probability of being positive. A probability is not yet a decision. To act on it, you pick a cut-off, the **threshold**, and call every example at or above it "positive". The lab, **Logistic regression and the threshold**, lets you move that cut-off and watch what it costs.

It starts with 100 generated points in two overlapping groups: 60 negatives and 40 positives. A logistic regression is fitted to them, and the threshold starts at 0.5. At that default the lab shows:

| Measure | At threshold 0.5 |
|---|---|
| Called positive | 36 of 100 |
| True positives / false positives | 30 / 6 |
| True negatives / false negatives | 54 / 10 |
| Precision / recall | 83.3% / 75.0% |
| Log loss | 0.352 |

The points overlap, so no threshold gets everything right. Moving the threshold only trades one kind of mistake for the other, and that trade is what this lesson is about.

## From a probability to a decision
*How does a threshold turn a probability into a class?*

The rule is short: **if p is at least the threshold, call the example positive; otherwise call it negative.** At 0.5 this is the decision boundary from "Probabilities and the sigmoid", the place where the score is 0.

A threshold on the probability is also a cut on the score, because the sigmoid only ever rises. The score where p reaches a threshold t is `ln(t / (1 - t))`, the log-odds of t, the same quantity as in "Probabilities and the sigmoid". That gives 0 for 0.5, 1.39 for 0.8 and -1.39 for 0.2.

[[figure:thresholds-and-decisions/threshold-on-the-curve|The lab's 100 points sit on the sigmoid at their scores. Each dashed line is a threshold; points to its right are called positive: 60, 36 and 22 of them.]]

> Worked example: a point has score 0.5, so p = 1 / (1 + e^-0.5) = 0.62. At threshold 0.5 it is called positive, because 0.62 is at least 0.5. At threshold 0.7 it is called negative. The model and the point have not changed, only the rule did.

On the scatterplot a new threshold draws a new boundary line, parallel to the 0.5 line. A higher threshold moves it deeper into the positive group.

## Four outcomes
*What can go right and what can go wrong with each call?*

Each example has a real class and a called class, so there are four cases. Positive is the class we look for.

- **True positive:** a real positive, called positive.
- **False positive:** a real negative, called positive. A false alarm.
- **True negative:** a real negative, called negative.
- **False negative:** a real positive, called negative. A miss.

[[figure:thresholds-and-decisions/four-outcomes|The four outcomes at threshold 0.5 on the lab's default data, with the precision and recall they give.]]

The lab draws the mistakes on the plot: a solid circle for a false positive and a dashed circle for a false negative.

Two summary numbers use these counts. **Precision** is true positives divided by everything called positive: of the alarms raised, how many were real? **Recall** is true positives divided by all real positives: of the cases that exist, how many did we find?

> Worked example: at 0.5 there are 30 true positives, 6 false positives and 10 false negatives. Precision = 30 / (30 + 6) = 83.3%. Recall = 30 / (30 + 10) = 75.0%.

## Moving the threshold
*What happens to the mistakes when the threshold goes down or up?*

Lower the threshold from 0.5 to 0.2 and more points count as positive: 60 instead of 36. Every point already called positive stays positive, so no false positive can disappear, and a missed real positive may now be found, so false negatives can only go down.

Raise it and the reverse holds. Three settings on the default data:

| Threshold | Called positive | False positives | False negatives |
|---|---|---|---|
| 0.2 | 60 | 22 | 2 |
| 0.5 | 36 | 6 | 10 |
| 0.8 | 22 | 1 | 19 |

[[figure:thresholds-and-decisions/counts-vs-threshold|False positives fall and false negatives rise as the threshold goes up. The curves move in small steps, because a count changes only when the threshold passes a point.]]

> Key idea: the threshold does not make the model better. It chooses which mistake you accept: more false alarms or more misses.

::: deeper Why lowering the threshold never adds a false negative
Take a real positive that is called positive at threshold 0.5, so its p is at least 0.5. At any lower threshold t, p is still at least t, so it is still called positive. The set of examples called positive can only grow when t falls. A false negative is a real positive outside that set, so the number of them can only shrink. The same argument, turned around, shows that raising t never adds a false positive.
:::

## Precision and recall pull apart
*Why can you not push both precision and recall to the top?*

Compare the two ends. At threshold 0.2 the model finds 38 of the 40 positives, a recall of 95.0%, but it calls 60 examples positive and 22 of them are wrong, so precision is 38 / 60 = 63.3%. At 0.8 only 22 are called positive and 21 are right: precision 95.5%, and recall 21 / 40 = 52.5%.

[[figure:thresholds-and-decisions/precision-recall|Recall falls as the threshold rises, while precision tends to rise. The three marked thresholds are the ones in the table above.]]

A high threshold calls only the examples the model is very sure about, so most of its calls are right, but it leaves many real positives behind. A low threshold catches almost everything, along with many false alarms.

Notice what stays still. Moving the threshold does not change the probabilities, so the **log loss** stays at 0.352 at every threshold. Log loss judges the probabilities; precision and recall judge the decisions made from them.

> Watch out: precision can look perfect for the wrong reason. At 0.9 the model calls 13 examples positive and all 13 are right, so precision is 100.0%, but recall is only 32.5%: 27 of the 40 positives were missed.

## Choosing a threshold
*How do you pick a threshold, if 0.5 is not special?*

The threshold should follow the cost of each mistake. Take a simple rule: a false alarm costs 1 and a miss costs 5, as if each miss means a sick patient sent home. The total cost is false positives + 5 × false negatives.

| Threshold | False positives | False negatives | Total cost |
|---|---|---|---|
| 0.2 | 22 | 2 | 22 + 10 = 32 |
| 0.5 | 6 | 10 | 6 + 50 = 56 |
| 0.8 | 1 | 19 | 1 + 95 = 96 |

With misses five times as costly, the low threshold wins. If both mistakes cost the same, 0.5 is about right: it makes 16 mistakes, and the best anywhere on the lab's slider is 15, at 0.57 or 0.58.

A model does not give you the threshold. You choose it from what the mistakes cost, and a different job can call for a different threshold on the same model.

> Key idea: ask first "which mistake is worse here?" Then move the threshold toward avoiding that one.

## Real penguins
*Does the same trade show up on real data?*

The lab can also ask whether a penguin is a Gentoo, from its bill length and body mass. Of the 344 penguins in the table, 342 have both measurements and 123 of them are Gentoo. At threshold 0.5 the fitted model calls 121 positive, with 108 true positives, 13 false positives and 15 false negatives. Precision is 89.3% and recall 87.8%.

The same trade appears. At 0.2 there are 28 false positives and 6 false negatives. At 0.8 there are 2 false positives and 31 false negatives.

## A fresh sample
*Does the pattern survive a new sample of data?*

The real data does not change, so the lab can draw a fresh sample only with generated data. On three new generated samples the exact counts differ, but the direction does not: at 0.2 there were more false positives and fewer false negatives than at 0.5 every time. Experiment 6 lists the numbers.

A count changes only when the threshold passes an example's probability, so while the threshold moves between two neighbouring probabilities, the counts stay flat.

::: remember
- A threshold turns a probability into a decision: call the example positive when p is at least the threshold. A threshold on p is a cut on the score.
- Lowering the threshold never removes a false positive and never adds a false negative; raising it does the reverse. Precision and recall tend to pull apart, and log loss does not move.
- Pick the threshold from the cost of each mistake, not from habit, and check the idea on real data and on a fresh sample.
:::

@@lab

## Lab: Logistic regression and the threshold
A logistic regression is fitted to 100 generated points (60 negatives, 40 positives). You move the threshold and watch which examples become false positives or false negatives, with the counts, precision, recall and log loss beside a sigmoid chart.

### Controls
- **Data** switches between **Generated data** and **Penguins (real)**. The real data asks whether a penguin is a Gentoo (positive) or another species (negative), from **Bill length (mm)** and **Body mass (kg)**. A note under the control gives the counts: 342 of 344 penguins, 2 rows with missing values left out, 123 Gentoo.
- **Threshold** (0.05 to 0.95 in steps of 0.01, starts at 0.50) is the cut-off for calling an example positive.
- **Set threshold to 0.5** puts it back at 0.50.
- **New sample** draws a new generated sample, and the model is fitted again. It is disabled for the real data.
- **Show probability shading** turns the probability tint behind the points on or off. It starts on.
- Keyboard: focus the plot, then the left and right arrow keys move the threshold by 0.01 (Shift for 0.05).
- **Quick Quiz** is the button under the settings card (a round button at the bottom right on a phone) (its badge counts the quizzes you have not answered; it opens a small panel): "If you lower the threshold, what happens to false positives and false negatives?" Pick an answer, then move the threshold below 0.5 to see if you were right.
- **Fullscreen** enlarges the lab. **Reset** returns to generated data, the default sample, threshold 0.50, shading on and the prediction cleared.

### Reading the screen
- The scatterplot, with axes **Feature 1** and **Feature 2** (or **Bill length (mm)** and **Body mass (kg)**), shows **Negative class (0)** and **Positive class (1)** dots, or **Other species (negative)** and **Gentoo (positive)**. The solid line is the **Boundary at your threshold**; the dashed line is the **Boundary at 0.5**. They are the same line when the threshold is 0.50.
- A solid circle marks a **False positive** and a dashed circle a **False negative**.
- The chart **The sigmoid: from score to probability** puts each example on the curve at its score (**Score (log-odds)** across, **Probability of positive** up). The dashed lines mark your threshold, and dots to the right of the vertical line are called positive. A label gives the threshold and "called positive".
- The status line reads "Threshold 0.20: 60 of 100 examples are called positive. True positives 38, false positives 22, true negatives 38, false negatives 2." The detail line explains precision and recall, and at the right of the status box you see "Precision 63.3% · Recall 95.0%".
- The table **Counts and scores at this threshold** has the columns **Measure**, **At threshold 0.5** and **At your threshold (0.20)**, and the rows **Called positive**, **True positives**, **False positives**, **True negatives**, **False negatives**, **Precision**, **Recall** and **Log loss**. A value that differs from the 0.5 column is in bold. When nothing is called positive, precision is n/a.

### Experiments
The numbers below are for the first generated sample. If you pressed **New sample**, press **Reset** first so that yours match.

1. **Lower it.** Predict: pick an answer in **Quick Quiz**. Then set **Threshold** to 0.20. The status line shows 60 of 100 called positive, 22 false positives and 2 false negatives, against 6 and 10 at 0.50. After a moment the box explains. Why can a lower threshold never remove a false positive?
2. **Raise it.** Predict: at 0.90, will precision and recall both rise? Set **Threshold** to 0.90. Only 13 examples are called positive, all of them right: 0 false positives, 27 false negatives. Precision is 100.0% but recall is 32.5%. What does a perfect precision hide?
3. **Where the line goes.** Predict: at 0.80, will the solid boundary move toward the negative group or the positive group? Set **Threshold** to 0.80, and look at **Boundary at your threshold** and **Boundary at 0.5**. Then look at the sigmoid chart: the vertical line sits at score 1.39, and 22 dots lie to its right. Try **Show probability shading** off and on to see the probabilities behind the points.
4. **What does not move.** Predict: will **Log loss** change as you drag **Threshold**? Drag it from 0.05 to 0.95 and read the table. **Log loss** stays 0.352 in both columns, while the counts, **Precision** and **Recall** change. Press **Set threshold to 0.5** to return. Why do the probabilities stay the same?
5. **Price the mistakes.** Predict: if a miss costs 5 and a false alarm 1, which of 0.2, 0.5 and 0.8 has the lowest total cost? Read the **False positives** and **False negatives** rows at each one and compute false positives + 5 × false negatives: 32, 56 and 96. Then ask the same with both costs equal, and find the lowest total of false positives plus false negatives (15, at 0.57 or 0.58). Which threshold would you choose for each job?
6. **Penguins and a fresh sample.** Predict: on the real penguins, will a lower threshold again give more false positives and fewer false negatives? Press **Reset**, set **Data** to **Penguins (real)**, and read the table at 0.50 (108 true positives, 13 false positives, 15 false negatives, **Precision** 89.3%, **Recall** 87.8%), then at 0.20 (28 and 6) and 0.80 (2 and 31). Then set **Data** back to **Generated data**, press **Set threshold to 0.5** and press **New sample** once. At 0.50 the false positives and false negatives are 5 and 4, and they are the same at 0.40 and 0.45: a count only changes when the threshold passes a point. Press **New sample** twice more to see 9 and 8, then 4 and 4, and lower the threshold to 0.20 on each sample (9 and 3, 16 and 0, 9 and 1). Does the lower-threshold pattern hold on every sample?
