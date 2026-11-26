---
slug: soft-margins-and-kernels
title: Soft margins and kernels
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Explain how a soft margin lets some points break the rules, and predict what a large or a small C does to the street.
- Read the RBF kernel as a similarity score and say what gamma does to the boundary.
- Tune C and gamma with cross-validation on scaled features, and tell overfitting from underfitting in the scores.

Before you start: read "Margins and support vectors" in this course, "Scaling and encoding", and "Cross-validation and stratification" and "Tuning with search" from the validation course.
:::

## When a strict street breaks
*What goes wrong when the widest street meets real data?*

"Margins and support vectors" picked the line with the widest empty street, with every point outside the street and on its own side. That is a **hard margin**: no point may enter the street. It works on clean data and fails on real data in two ways.

First, the classes may overlap. Then no line leaves an empty street, and there is nothing to maximize. Second, a single point can squeeze the street.

Take seven points on a number line: class -1 at 1, 2, 3 and 4.4, and class +1 at 4.6, 6 and 7. Without 4.4 and 4.6 the nearest points are 3 and 6, so the street is 3 wide. With them, a separating cut must fall between 4.4 and 4.6, and the street is 0.2 wide. Two points that are 0.2 apart cut the street from 3 to 0.2.

If one of those two is a typing mistake or a mislabeled row, the whole boundary bends around it. A **soft margin** lets some points enter the street, or even cross the line, but at a price.

## Slack and the price C
*How does a soft margin put a price on breaking the rules?*

The **score** of a point is `w·x + b`, as before: 0 on the boundary, +1 on one edge of the street and -1 on the other. A point of class y (either +1 or -1) obeys the rules when `y × score` is at least 1. Its **slack** says how far it breaks them: slack = max(0, 1 − y × score).

| Class | Score | y × score | Slack | Where the point is |
| --- | --- | --- | --- | --- |
| +1 | 1.5 | 1.5 | 0 | outside the street, on its side |
| +1 | 0.4 | 0.4 | 0.6 | inside the street, on its side |
| +1 | -0.5 | -0.5 | 1.5 | on the wrong side of the line |

A slack above 1 means the point is misclassified.

Training now minimizes one number: **½|w|² + C × (the sum of all slacks)**. The first part is small when the street is wide, because the width is 2 / |w|. The second part is small when few points break the rules. **C** is the price of one unit of slack.

> Key idea: a large C makes violations expensive, so the street is strict and narrow. A small C makes them cheap, so the street is wide and forgiving. Like ridge in "L1 and L2: ridge and lasso", it trades a penalty on the weights against the fit to the data. Note that C works the other way round from ridge's strength: a large C weakens the pull toward a wide street.

## A price list for two lines
*Which line wins at each price?*

Use the seven points of the first section (class -1 at 1, 2, 3 and 4.4, class +1 at 4.6, 6 and 7) and compare two lines, both with the cut at 4.5, so the score is w × (x − 4.5).

- **Narrow line, w = 10.** The street is 2 / 10 = 0.2 wide. The point at 4.4 scores -1 and the point at 4.6 scores +1, so every point is on its edge or beyond it. The total slack is 0 and the cost is ½ × 10² = 50.
- **Wide line, w = 1.** The street is 2 / 1 = 2 wide. The points at 4.4 and 4.6 score -0.1 and +0.1, so each has slack 1 − 0.1 = 0.9, and every other point scores beyond ±1. The total slack is 1.8 and the cost is ½ × 1² + 1.8 × C = 0.5 + 1.8C.

| C | Wide line | Narrow line | Lower cost |
| --- | --- | --- | --- |
| 0.1 | 0.68 | 50 | wide |
| 1 | 2.30 | 50 | wide |
| 10 | 18.50 | 50 | wide |
| 100 | 180.50 | 50 | narrow |

> Worked example: the two costs are equal when 0.5 + 1.8C = 50, so C = 49.5 / 1.8 = 27.5. Below that price the wide street wins, above it the narrow one. Real training searches every line, not just these two, but it makes the same trade.

## C on a messy sample
*What does C do to a real boundary?*

Here is a made-up sample: 20 points in each class, plus one stray point of class -1 that landed inside the +1 group. The same linear SVM was trained twice, with C = 0.1 and with C = 100.

[[figure:soft-margins-and-kernels/c-dial|The same 41 points with a small and a large C. Solid line: boundary. Dashed lines: the street edges. Ringed points: support vectors.]]

With C = 0.1 the street is 3.33 wide and has 8 support vectors. The stray point sits on the wrong side, so 40 of 41 points are right. With C = 100 the line tilts to put the stray point on its own side. All 41 are right, but the street is only 0.74 wide, less than a quarter as wide, and 3 points hold it in place, one of them the stray.

Support vectors are the points on the street edge, inside the street, or on the wrong side of the line. A wide street holds more points, so a small C gives more of them.

> Watch out: a large C does not mean a better model. It means trusting every training point, including a mistake. Try C on a scale of powers of 10, such as 0.1, 1, 10 and 100, because C works by ratios: going from 100 to 101 hardly matters, while going from 10 to 100 changes the street.

## Similarity instead of coordinates
*How can a method built on straight lines draw a curve?*

On a number line, a straight line is a single cut. Take class -1 at 0, 1, 7 and 8, and class +1 at 3, 4 and 5. No cut separates them: the best one gets 5 of 7 right.

A **kernel** is a rule that takes two points and returns one number, their **similarity**: high for points that are alike and low for points far apart. An SVM never needs the coordinates of a point on their own. It needs only these similarities. A prediction is a weighted vote of the support vectors:

score = b + the sum, over support vectors, of (weight × class × similarity to the new point)

Each weight, called alpha, is found by training, and it is 0 for every point that is not a support vector. It resembles the neighbor vote of "How k-NN decides", except that only support vectors vote and each vote has a learned weight.

With the **linear kernel**, similarity is the dot product and the vote collapses to a straight line. A different similarity gives a line in a space of hidden coordinates, which looks curved in your own. The **kernel trick** is that the SVM never builds those coordinates: it only computes the similarity of pairs.

## The RBF kernel and gamma
*How local is a point's vote?*

The **RBF kernel** (radial basis function) defines similarity as **K = e^(−γ × d²)**, where d is the distance between the two points. At d = 0 it is 1, and it falls toward 0 as d grows. **Gamma** (γ) sets how fast. For d = 1, γ = 0.25 gives 0.78, γ = 1 gives 0.37 and γ = 4 gives 0.02. The similarity drops to 0.37 at d = 1 / √γ, which is 2, 1 and 0.5. Call 1 / √γ the **reach** of a point: gamma sets how local its vote is.

[[figure:soft-margins-and-kernels/rbf-similarity|Left: similarity against distance for three gammas. Right: the score of an RBF SVM trained on the seven points of the kernel section, with ringed support vectors.]]

Worked example: the seven points of the kernel section (class -1 at 0, 1, 7 and 8; class +1 at 3, 4 and 5), trained with γ = 0.25 and C = 10, leave four support vectors, at 1 and 7 (class -1) and at 3 and 5 (class +1). Their weights are about 1.25, and b = -0.23. For a new point at x = 4:

| Support vector | Class | Weight | Similarity | Weight × class × similarity |
| --- | --- | --- | --- | --- |
| 1 | -1 | 1.253 | 0.1054 | -0.132 |
| 3 | +1 | 1.253 | 0.7788 | +0.976 |
| 5 | +1 | 1.254 | 0.7788 | +0.976 |
| 7 | -1 | 1.254 | 0.1054 | -0.132 |

> Worked example: the sum is 1.688, and adding b gives a score of 1.458, so x = 4 is class +1. The score at x = 2 is -0.10, so it is class -1. The score is above 0 only between 2.09 and 5.91, which a straight cut could never do.

## The two dials
*How do C and gamma together decide over- and underfitting?*

Gamma controls how bent the boundary can be, and C controls how much each training mistake costs. The figure shows gamma on two noisy rings, 30 points each, with C = 1. The held-out score uses 400 fresh points from the same rings.

[[figure:soft-margins-and-kernels/gamma-panels|Three RBF SVMs on the same two noisy rings. Shaded areas show which class wins where; the colour along the far edges of the plot is only the model's guess far from the data.]]

At γ = 0.01 the reach is 1 / √0.01 = 10, wider than both rings. Even two points 6 apart have a similarity of e^(−0.01 × 36) = 0.70, so every point looks alike and the model puts every ring point in the same class (class -1), which scores 50% on training and 50% on held-out. That is **underfitting**. At γ = 30 the reach is 1 / √30, about 0.18, so each point only claims its own tiny patch. All 60 points become support vectors, training reads 100% and held-out only 76%. That is **overfitting**.

| Dial | Small value | Large value |
| --- | --- | --- |
| C | wide, forgiving street, can underfit | narrow, strict street, can overfit |
| gamma | smooth, nearly straight boundary, can underfit | tiny bumps that memorize, can overfit |

## Scale the features first
*Why must the features be scaled before an SVM?*

The street and the RBF kernel both measure plain distance, just as k-NN and k-means do in "Distance and similarity". A feature with big numbers drowns the others.

Take two Adelie penguins from the bundled table. The first measures 39.1 mm bill length, 18.7 mm bill depth, 181 mm flipper and 3750 g body mass. The second measures 39.5, 17.4, 186 and 3800. The differences are 0.4, -1.3, 5 and 50, and the squared distance is 0.16 + 1.69 + 25 + 2500 = 2526.85. Body mass is 98.9% of it. With γ = 1 the similarity is e^(−2526.85), which is 0 for all practical purposes: no two penguins look alike.

Standardize first, using the mean and spread of the 267 tuning penguins. The differences become 0.07, -0.65, 0.36 and 0.06, the squared distance is 0.56, and the similarity at γ = 1 is e^(−0.56) = 0.57. Body mass is now 0.7% of the distance.

> Watch out: fit the scaler on the training rows only, and inside cross-validation on each fold's own training part. Scaling on all rows first leaks the test rows, as in "Pipelines and leakage".

## Tune C and gamma
*How do you choose the two dials?*

C and gamma are hyperparameters, so "Tuning with search" applies. This grid uses the penguin task of that lesson: male or female, on the 267 tuning penguins, with stratified five-fold cross-validation. Both dials go up by factors of 10. That is 4 × 4 = 16 configurations and 80 fits.

[[figure:soft-margins-and-kernels/tuning-grid|Penguins classified right out of 267 in cross-validation, for each C and gamma, with scaled features and with raw features.]]

With scaled features the best cell is C = 1, γ = 1, with 242 of 267 right, 90.6%. Ten of the 16 cells score 236 or more, so there is a broad plateau and the exact winner matters little. The corner C = 0.1, γ = 0.01 gets 145 (54.3%), which is underfitting. At γ = 10 the scores fall to 223-225 once C is 1 or more, which is overfitting; with C = 0.1 the votes are too weak and the score is 135, which is guessing. With raw features the best is 190 (71.2%).

Refit at C = 1 and γ = 1 on all 267, the model gets 56 of 66 right on the locked test set, 84.8%. That is lower than 90.6% because the best of 16 scores is flattered, and 66 penguins is a small test. One penguin is 1.5 points.

## Go to the lab
*What do you do next?*

In the SVM lab you move a support vector yourself, watch the street change, and compare linear and RBF boundaries on generated and real data.

::: deeper The slack is the hinge loss
The term max(0, 1 − y × score) is called the **hinge loss**. A point beyond its street edge costs exactly 0. The log loss of "Log loss and fitting" is different: it is positive for every point, even a well-placed one. That is why only the support vectors, the points on the street, inside it or on the wrong side of the line, shape an SVM.
:::

::: remember
- A soft margin lets points break the rules at a price. Slack is how far a point breaks them, and C is the price: a large C gives a narrow, strict street, a small C a wide, forgiving one.
- A kernel measures similarity between two points. The RBF kernel is e^(−γ × d²), so a large gamma makes each point's vote local and can overfit, and a small gamma makes the boundary smooth and can underfit.
- Scale the features, then tune C and gamma on powers of 10 with cross-validation, keeping the test set locked until the end.
:::
