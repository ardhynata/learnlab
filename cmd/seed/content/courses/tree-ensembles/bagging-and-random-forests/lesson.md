---
slug: bagging-and-random-forests
title: Bagging and random forests
kind: reading
simulator: ""
minutes: 25
---
::: intro
- Explain why one fully grown decision tree is unsteady, and how bagging (many trees, each fitted to a bootstrap sample, then averaged) steadies it.
- Say what a random forest adds to bagging, and compute a vote of five trees by hand.
- Read an out-of-bag error and a permutation feature importance, and say what each one can and cannot tell you.

Before you start: read "Splits and impurity" and "Depth and leaf size" in the Decision trees course, and "Sampling variability and the bootstrap" in Probability and statistical uncertainty.
:::

## One tree is unsteady
*Why does a fully grown tree change when the training rows change a little?*

"Depth and leaf size" ended with a warning. A tree grown until every leaf is pure scores 100% on its training penguins and only 54 of 67 (80.6%) on the validation penguins. This lesson keeps that task and that cut: is a penguin male or female, from bill length, bill depth, flipper length and body mass, with 200 training and 67 validation penguins.

A tree like this has high **variance**: its answers depend a lot on exactly which rows it saw. Test it. Draw 200 penguins from the 200 training penguins with replacement, grow a full tree on that sample, and repeat 25 times. All 25 trees were scored on the same 67 validation penguins. They got between 52 and 61 right, 56.4 on average (84.2%). The original tree's 54 sits inside that range.

The trees do not differ in their big ideas. In one run of 400 such trees (seed 7), 353 ask about body mass first. They differ in the many small questions near the leaves, and those decide the penguins near the edge.

## Bagging: average many trees
*How do many unsteady trees give one steady answer?*

**Bagging** is short for bootstrap aggregating. It has four steps.

1. Draw a bootstrap sample: n rows from the n training rows, with replacement, as in "Sampling variability and the bootstrap".
2. Grow a full tree on that sample. Do not prune it or limit its depth.
3. Repeat for T trees.
4. To predict, ask every tree and take the majority vote. For a number, take the mean.

A bootstrap sample of 200 penguins holds about 63% of the distinct penguins. The first five samples held 133, 123, 117, 123 and 127. Each tree sees a different part of the data, so each makes mistakes in different places. The vote cancels the mistakes that only some trees make.

[[figure:bagging-and-random-forests/tree-scores|Validation score of 25 trees grown on 25 bootstrap samples, one dot per tree. The vote of all 25 trees is the diamond.]]

The vote got 59 of 67. The best single tree got 61, but nobody could know in advance which tree that would be.

## Five trees vote by hand
*What does a vote look like on one real penguin?*

Take five trees from the 25. The penguin is a male from the validation set: bill length 50.2 mm, bill depth 18.8 mm, flipper length 202 mm, body mass 3800 g. Each tree sends it down its own path to a leaf. A leaf lists the training rows of that tree's own sample, and a penguin drawn twice counts twice.

| Tree | First question | Questions asked | Leaf reached | Vote |
| --- | --- | --- | --- | --- |
| 1 | body mass ≤ 3625 g | 5 | 0 female, 21 male | male |
| 2 | body mass ≤ 3712.5 g | 5 | 8 female, 0 male | female |
| 3 | body mass ≤ 3625 g | 6 | 0 female, 19 male | male |
| 4 | body mass ≤ 3712.5 g | 6 | 4 female, 0 male | female |
| 5 | body mass ≤ 3675 g | 6 | 0 female, 9 male | male |

[[figure:bagging-and-random-forests/five-votes|The same penguin sent through five trees. Three trees vote male and two vote female.]]

> Worked example: three votes for male and two for female, so the forest says male, and that is right. Every leaf is pure, so the share of male leaves is (1 + 0 + 1 + 0 + 1) / 5 = 3 / 5 = 0.6. A share of 0.6 is a weak majority, a sign of a penguin near the border.

On all 67 validation penguins this five-tree vote got 59 right. The five trees alone got 61, 55, 57, 55 and 56.

## More trees, steadier scores
*How many trees are enough?*

Bagging draws random samples, so the same recipe with another seed gives another forest. To see the spread, each forest size was built 30 times, with seeds 1 to 30, on the same training penguins, and each forest was scored on the same 67 validation penguins. These are fresh runs, so the one-tree mean below differs a little from the 56.4 above.

| Trees T | Mean right | Lowest to highest | Standard deviation |
| --- | --- | --- | --- |
| 1 | 56.70 | 52 to 61 | 2.10 |
| 5 | 57.47 | 54 to 61 | 1.87 |
| 25 | 58.40 | 56 to 61 | 1.25 |
| 100 | 58.23 | 57 to 60 | 0.57 |

The spread shrinks with every step, which is what "variance falls" means. The mean rises from 56.70 to 58.40 and then levels off. Adding trees does not make the forest memorize more, but each one costs time.

::: deeper Why averaging helps, in numbers
Suppose each of T trees has a prediction error with variance 1, and any two trees have correlation r. The average of the T errors has variance r + (1 - r) / T. With 25 independent trees (r = 0) it is 1 / 25 = 0.04. With r = 0.5 it is 0.5 + 0.5 / 25 = 0.52, and with r = 0.9 it is 0.9 + 0.1 / 25 = 0.904. More trees shrink only the second term, so the trees need to differ from each other, not just to be many.
:::

## Does it hold on other cuts?
*Is this one cut a lucky one?*

On other cuts the picture holds. Over 30 different cuts, a single full tree got 57.9 of 67 right on average (86.4%) and a bag of 25 trees got 59.5 (88.9%). The bag scored higher on 23 cuts, equal on 1 and lower on 6.

> Watch out: on this cut the depth-3 tree of "Depth and leaf size" also got 59, but its depth was chosen by looking at validation scores. The bagged trees needed no depth chosen at all.

## Random forests: a random subset at every split
*What does a random choice of features add?*

Bagged trees stay alike. Of 400 of them, 353 asked about body mass first, because it is the strongest feature on nearly every sample. Alike trees make alike mistakes, and a vote cannot cancel what everyone gets wrong.

A **random forest** adds one more random choice. At every split a tree may look at only a random subset of the features, here 2 of the 4, and picks the best question among those. A common default for classification is the square root of the number of features. In the same kind of run with 400 forest trees (seed 7), body mass came first in 198, bill depth in 96, bill length in 86 and flipper length in 20. Body mass is in 3 of the 6 possible pairs, so it is on offer at only about half of the first splits.

The trees became less alike: two bagged trees gave the same answer for 87.1% of the validation penguins, two forest trees for 84.5%. One forest tree is a little weaker, 55.7 right on average against 56.4. The vote makes up for it. Over 30 cuts, 25 forest trees got 60.1 right and 25 bagged trees 59.5. That 0.6 of a penguin is a tie, but the forest was steadier: on the seed-4 cut its 30 seeds gave 57 to 60 right, bagging 56 to 61.

## Out-of-bag error: a free validation set
*Can a forest grade itself without held-out rows?*

A bootstrap sample leaves a penguin out with probability (1 - 1/200)^200 = 0.367. For that tree the penguin is **out of bag**: never seen. So each training penguin can be scored by the trees that did not see it. The **out-of-bag (OOB) error** is the share of training penguins whose OOB vote is wrong.

[[figure:bagging-and-random-forests/out-of-bag|Six training penguins and the five trees of the vote. Filled squares: the tree saw the penguin. Open squares: it did not, and its answer counts for the out-of-bag vote.]]

> Worked example: penguin C is out of bag for trees 1 to 4. All four say female, and C is female, so its OOB vote is right. Penguin F is out of bag for trees 1, 3 and 5. All three say male, but F is female, so it is wrong. Penguin A was seen by all five trees and gets no OOB vote.

With the 25 trees, every penguin was out of bag for 1 to 14 of them, 9.14 on average (25 x 0.367 = 9.2). 18 of 200 OOB votes were wrong: an error of 9.0%. The forest's training accuracy, 200 of 200, says nothing. The validation error is 8 of 67 = 11.9%. With standard errors of about 2.0 and 4.0 points, the two agree. OOB reads a little high, because each penguin is judged by only about 9 of 25 trees: over 30 cuts it averaged 12.7% against 11.1%.

## Feature importance
*Which features does the forest lean on?*

**Permutation importance** asks how much a feature matters to this model. Shuffle one feature among the validation penguins, which cuts its link to sex, and score again. The drop in the score is the importance.

A forest of 100 trees, 2 features per split, got 60 of 67 right on the validation penguins. Averaged over 30 shuffles per feature, the score dropped as follows.

| Feature shuffled | Drop in penguins right | Drop in points |
| --- | --- | --- |
| Bill depth | 20.53 of 67 | 30.6 |
| Body mass | 12.97 of 67 | 19.4 |
| Bill length | 2.80 of 67 | 4.2 |
| Flipper length | 0.27 of 67 | 0.4 |

[[figure:bagging-and-random-forests/importance|Permutation importance of the four features. The bar is the drop in validation accuracy, in points, when that feature is shuffled.]]

> Watch out: flipper length scores near zero, but it is not useless. Flipper length and body mass move together across the 333 penguins (r = 0.87). Shuffle flipper length and the trees still have body mass to lean on. Importance describes this model on this data. It does not show a cause.

::: deeper The other common measure
**Impurity importance** adds up, for each feature, how much impurity its splits removed over all the trees, and gives each feature a share. On the same forest: body mass 35.4%, bill depth 30.6%, bill length 20.6%, flipper length 13.5%. It ranks body mass first and gives flipper length a clear share, where permutation does not. It is computed on the training rows, so it can reward splits that only fit noise. When the two disagree, give more weight to the one measured on held-out data.
:::

## What a forest does not fix
*When is bagging not enough, and what comes next?*

Averaging cancels the mistakes that differ between trees. It cannot cancel what all of them share: a forest of trees that are all too shallow stays too simple. A forest is also harder to read than one tree, since 100 trees do not fit on a page, and it costs T times the training time.

The next lesson, "Gradient boosting", builds trees one after another instead. Each tree is fitted to correct the mistakes of the trees before it. Then the Ensemble lab lets you add trees in stages and compare how bagging and boosting change the validation performance, on generated points rather than penguins. Read the spread of the scores, not only the mean, and treat a difference of a penguin or two as a tie.

::: remember
- Bagging fits full trees to bootstrap samples and takes a vote. Each tree is unsteady, the vote is steadier, and adding trees shrinks the spread and then levels off.
- A random forest also lets each split see only a random subset of the features, so the trees are less alike. The out-of-bag error scores each training penguin with the trees that never saw it.
- Permutation importance is the drop in the validation score when one feature is shuffled. It describes the model, not the world, and correlated features share it.
:::
