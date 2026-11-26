---
slug: tuning-k
title: Tuning k
kind: reading
simulator: ''
minutes: 14
---
::: intro
- Explain what a small k and a large k each do to a k-NN model.
- Read a validation curve and pick k from its flat part.
- Estimate accuracy with five-fold cross-validation, and keep the test set clean.

Before you start: read "How k-NN decides", where the same query got a different vote at k = 3 and at k = 5, and "Distance and similarity". The k-NN lab at the end of this course lets you watch the same ideas move.
:::

## One number, two ways to go wrong
*What does k trade off?*

In "How k-NN decides" the same query was labeled A at k = 3 and B at k = 5. So k is not a detail: it is the main setting of the model, and you fix it before the model sees any new point. A setting like that, chosen by you and not learned from the data, is a **hyperparameter**.

- **A very small k** lets one or two neighbors decide. If one of them is a mislabeled or unusual point, the answer is wrong. The model follows the noise in the training data (random errors and oddities in it). That is **overfitting**.
- **A very large k** lets points from far away join the vote. They outvote the neighbors that are actually close, so the model stops reacting to local structure. We call that **oversmoothing**, a kind of **underfitting**.

Somewhere between the two is a k that follows the real pattern and ignores the noise.

> Key idea: k controls how flexible the model is. A small k is very flexible, a large k is very stiff, and a good k sits in between. The data has to tell you where.

## What k does to the boundary
*How does the change show up on the plot?*

To see what a model does everywhere at once, ask it the question at every spot on the plot and color each spot by the answer. The border between the colors is the **decision boundary**. The figure uses a small sample made for this lesson: two classes, and each class sits in two blobs on opposite corners of the square. There are 80 training points.

[[figure:tuning-k/boundaries|The same 80 training points at three values of k. The shading shows the answer k-NN gives at each spot, and the numbers show how many of 200 fresh validation points each one gets right.]]

At **k = 1** the boundary is jagged. Every training point claims a patch of its own, so a few odd points leave small islands of the wrong color. At **k = 13** most islands are gone and the four blobs show up as four clean regions. At **k = 41**, just over half of the 80 points vote on every query, so the answer barely depends on where the query is. Large patches turn to the wrong class, for example along the top edge and across the left middle, and the pattern blurs.

In the lab you can switch on **Show decision regions** and sweep k yourself.

## Training accuracy cannot choose k
*Why not just pick the k that scores best on the training points?*

Take k = 1 and score the model on its own training points. Each point's nearest neighbor is itself, so every vote is right. The score is 80 of 80, and it would be 100% for any labeled data without exact duplicates, noisy or not. That number says nothing about new points.

So we **hold out** some data: points that are not used for voting and that we score on instead. Here the model votes with the 80 training points and is scored on 200 fresh **validation** points drawn the same way.

| k | Training: right out of 80 | Validation: right out of 200 | Validation accuracy |
| --- | --- | --- | --- |
| 1 | 80 | 165 | 82.5% |
| 3 | 72 | 176 | 88.0% |
| 13 | 71 | 178 | 89.0% |
| 31 | 72 | 172 | 86.0% |
| 41 | 61 | 150 | 75.0% |

Training says k = 1 is perfect. Validation puts it near the bottom of the odd k up to 41. The arithmetic for k = 1 is 165 ÷ 200 = 0.825, which is 82.5%.

> Watch out: never choose k by training accuracy. At k = 1 it is always 100%, so it always votes for the most overfit model.

## The validation curve
*What does the score look like across many k?*

Score every odd k from 1 to 41 on the same validation points and plot the result. This is the **validation curve**.

[[figure:tuning-k/validation-curve|Training and validation accuracy for k from 1 to 41. The shaded stretch is where validation accuracy is within noise of the best.]]

Read it from left to right. At k = 1 training accuracy is 100% but validation is only 82.5%: a big gap means overfitting. Validation jumps up by k = 3, stays on a flat stretch, and falls at the right end as k grows too big. The best score is 178 of 200, at k = 13 and also at k = 23, but k = 3 gets 176 and k = 27 gets 176. A gap of 2 of 200 (1 percentage point) is smaller than the wobble you would see with another random set of 200 validation points, so those values are effectively tied.

> Key idea: do not chase the very top of the curve. Find the flat part, then pick a k from its middle, away from both cliffs.

::: deeper How big is the wobble?
A validation score is a proportion measured on a finite sample, so it varies. A rough size of that variation is the standard error, the square root of p × (1 − p) ÷ n. With p = 0.89 and n = 200 it is √(0.89 × 0.11 ÷ 200) ≈ 0.022, about 2 percentage points, or 4 of 200.

Keeping every k whose score is within one standard error of the best, 0.89 − 0.022 = 0.868, which is 174 of 200 or more, selects k = 3 up to k = 27. That is the shaded stretch in the figure. It is one common rule, not the only one.
:::

## Cross-validation
*How can you use all your data for both voting and scoring?*

One validation set can be lucky or unlucky. **Cross-validation** repeats the hold-out several times. In **five-fold** cross-validation you cut the training data into five equal **folds**, here 16 points each. In each round, four folds do the voting and the fifth fold is scored. After five rounds every point has been scored exactly once.

[[figure:tuning-k/cv-folds|Five-fold cross-validation of k = 13 on the 80 training points: each fold is held out once.]]

> Worked example: for k = 13 the five rounds got 15, 14, 13, 15 and 14 of 16 right. The total is 15 + 14 + 13 + 15 + 14 = 71 of 80, so the cross-validation accuracy is 71 ÷ 80 = 88.75%.

Run the same five rounds for other values of k and compare: k = 1 gets 65 of 80 (81.25%), k = 3 gets 70 (87.5%), k = 13 gets 71 (88.75%) and k = 31 gets 63 (78.75%). It points to about the same good region as the validation set did (k = 31 scores lower here because each round votes with only 64 points, so a large k bites sooner), without needing a large validation set of its own.

> Watch out: the "k" in k-fold has nothing to do with the k in k-NN. One counts folds, the other counts neighbors.

## Rules of thumb for picking k
*Where do you start looking, and how do you settle a tie?*

- **Start near the square root of n.** For n = 80 training points, √80 ≈ 8.9, so try k near 9. It is a first guess, not a law, and here 9 does sit on the flat part.
- **Use an odd k with two classes.** Then the vote cannot split evenly. With more than two classes ties are still possible. The k-NN lab breaks a tie in favor of the closest neighbor.
- **Pick from the middle of the flat part.** The k values next to the best one are almost as good, and the middle is farthest from the cliffs on both sides.
- **Keep k below what your smallest class can support.** With two classes, a class with only 6 examples can never win a vote once k is 13 or more, since it cannot reach a majority of 13 votes.
- **Expect the answer to change with the data.** This sample has a flat part from 3 to 27. Another dataset, with more noise or more points, will have a different one, so run the search again.

## Keep the test set clean
*How do you avoid fooling yourself while tuning?*

Choosing k is a kind of training: the validation or cross-validation scores are what you tune against. After you have chosen, that score is a little optimistic, because you picked the k that happened to look best on it. So keep a separate **test set** for one final check, and do not use it to choose anything.

> Watch out: leakage. Anything fitted with the whole dataset, such as the mean and spread used to scale a feature, lets information about the validation or test points reach the model. Fit every pre-processing step on the training part only, and inside cross-validation redo it for each round.

The k-NN lab is the place to try this. Use **Neighbors (k)** from 1 to 15 with **Show decision regions** on, and try the **Checkerboard** dataset, whose classes sit in alternating squares, a layout like the one in this lesson.

::: remember
- A small k overfits, a large k oversmooths, and the best k sits on the flat part of the validation curve.
- Training accuracy at k = 1 is always perfect, so choose k on held-out data or with cross-validation.
- Start near the square root of n, use an odd k with two classes, and keep the test set for one final check.
:::
